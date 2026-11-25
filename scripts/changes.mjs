// Usage: node scripts/changes.mjs — reads the git history of data/ and writes every status change of a cell to
// data/changes.json (the home page shows the latest) and changes.xml (an RSS feed). Both files are generated: git
// ignores them, and the deploy job writes them fresh from the full history before each upload.
// A change is a cell that exists before and after a commit with a different status. New countries and new checks
// are not changes. Only commits on the main line count (--first-parent), so each merged PR is one step.
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { STATUSES } from '../src/observatory.js';

export const SITE = 'https://agentindex.art';
// The feed keeps this many changes, newest first. The page shows the first few.
export const KEEP = 200;
const UP = Object.keys(STATUSES).reverse(); // none, announced, limited, live: later is better

// One snapshot of the data: every cell's status and note, keyed "capability|country", plus each check's name.
// files maps a data file name to its parsed JSON; files without capabilities (meta, adoption) are skipped.
export function snapshot(files) {
  const cells = {}, names = {};
  for (const json of Object.values(files)) {
    for (const cap of json?.capabilities ?? []) {
      names[cap.id] = cap.name;
      for (const [code, cell] of Object.entries(cap.countries ?? {})) cells[`${cap.id}|${code}`] = { status: cell.status, note: cell.note ?? '' };
    }
  }
  return { cells, names };
}

// The status moves between two snapshots, in the order of the newer one. Better moves come first.
export function moves(before, after, commit) {
  const out = [];
  for (const [key, cell] of Object.entries(after.cells)) {
    const old = before.cells[key];
    if (!old || old.status === cell.status || !STATUSES[old.status] || !STATUSES[cell.status]) continue;
    const [capability, country] = key.split('|');
    out.push({ ...commit, country, capability, from: old.status, to: cell.status, note: cell.note });
  }
  const gain = (m) => UP.indexOf(m.to) - UP.indexOf(m.from);
  return out.sort((a, b) => gain(b) - gain(a));
}

// "Re-check the payroll cell (#212)" → 212. Merge commits name the PR as "Merge pull request #29 from …".
export const prOf = (subject) => Number(subject.match(/\(#(\d+)\)\s*$/)?.[1] ?? subject.match(/^Merge pull request #(\d+)/)?.[1]) || null;

const xml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
const rfc822 = (date) => new Date(`${date}T12:00:00Z`).toUTCString();

// The RSS feed: one item per change. countryName and capName turn codes into words.
export function rss(changes, { countryName, capName, built }) {
  const items = changes.map((c) => {
    const title = `${countryName(c.country)} · ${capName(c.capability)}: ${STATUSES[c.from].label} → ${STATUSES[c.to].label}`;
    return `  <item>
    <title>${xml(title)}</title>
    <link>${SITE}/countries.html#country=${c.country}</link>
    <guid isPermaLink="false">${c.commit}-${c.capability}-${c.country}</guid>
    <pubDate>${rfc822(c.date)}</pubDate>
    <description>${xml(c.note)}</description>
  </item>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Agent Index: what changed</title>
  <link>${SITE}/</link>
  <description>Each time a status changes in the Agent Index: what AI agents can do, country by country.</description>
  <language>en</language>
  <lastBuildDate>${rfc822(built)}</lastBuildDate>
${items}
</channel>
</rss>
`;
}

// Git helpers. A file missing at a commit reads as null.
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });
function filesAt(sha) {
  const files = {};
  const names = git('ls-tree', '--name-only', sha, 'data/').split('\n').filter((f) => f.endsWith('.json'));
  for (const f of names) {
    try { files[f] = JSON.parse(git('show', `${sha}:${f}`)); } catch { files[f] = null; }
  }
  return files;
}

// Every change on the main line, newest first: { date, commit, pr, country, capability, from, to, note }.
export function history() {
  const log = git('log', '--first-parent', '--format=%H%x09%h%x09%cs%x09%P%x09%s', 'HEAD', '--', 'data/').trim();
  if (!log) return [];
  const cache = new Map();
  const snap = (sha) => cache.get(sha) ?? cache.set(sha, snapshot(filesAt(sha))).get(sha);
  const out = [];
  for (const line of log.split('\n')) {
    const [sha, short, date, parents, subject] = line.split('\t');
    const parent = parents.split(' ')[0];
    if (!parent) continue;
    out.push(...moves(snap(parent), snap(sha), { date, commit: short, pr: prOf(subject) }));
    if (out.length >= KEEP) break;
  }
  return out.slice(0, KEEP);
}

async function main() {
  const meta = JSON.parse(git('show', 'HEAD:data/meta.json'));
  const now = snapshot(filesAt('HEAD'));
  const changes = history();
  const built = new Date().toISOString().slice(0, 10);
  const countryName = (code) => meta.countries.find((c) => c.code === code)?.name ?? code;
  const capName = (id) => now.names[id] ?? id;
  // The page names each check by its current name, so a renamed check reads the same everywhere.
  const named = changes.map((c) => ({ ...c, name: capName(c.capability) }));
  await writeFile(new URL('../data/changes.json', import.meta.url), `${JSON.stringify({ built, changes: named }, null, 1)}\n`);
  await writeFile(new URL('../changes.xml', import.meta.url), rss(changes.slice(0, 50), { countryName, capName, built }));
  console.log(`${changes.length} changes written to data/changes.json and changes.xml`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
