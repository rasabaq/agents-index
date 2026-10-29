// Usage: node scripts/refresh-sites.mjs [category ...] — saves each company's logo as logos/<name>.png and stores that
// path in its `icon`, so the page loads no image from the company's site. It reads the homepage and tries the
// apple-touch-icon, then the largest icon link, then /favicon.ico, and shrinks the first image that loads to a 64px
// PNG with macOS `sips`. A logo already in logos/ is kept: delete the file to fetch it again, or save a better one
// there by hand (from the brand's own site or press kit). When nothing loads it stores null and the page shows a monogram.
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { get } from './http.mjs';

// Many sites refuse requests that do not look like a browser.
const BROWSER = { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36' };

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" };
const decode = (s) => s.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTITIES[e.toLowerCase()] ?? m));

// Every <name ...> tag in the page head, as a map of lower-case attribute names to decoded values.
export function tags(html, name) {
  const head = html.slice(0, html.search(/<\/head>/i) + 1 || undefined);
  return [...head.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(([t]) => Object.fromEntries(
    [...t.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)].map((m) => [m[1].toLowerCase(), decode(m[2] ?? m[3] ?? m[4])]),
  ));
}

// Icon URLs to try, best first. Only https: the site is served over https and would block http images.
export function iconCandidates(html, base) {
  const links = tags(html, 'link').filter((l) => l.href);
  const rels = (l) => (l.rel ?? '').toLowerCase().split(/\s+/);
  const size = (l) => (/any/i.test(l.sizes ?? '') || /\.svg(\?|$)/i.test(l.href) ? 1e4 : Math.max(0, ...(l.sizes ?? '').split(/\s+/).map((s) => parseInt(s, 10) || 0)));
  const touch = links.filter((l) => rels(l).some((r) => r.startsWith('apple-touch-icon')));
  const icons = links.filter((l) => rels(l).includes('icon')).sort((a, b) => size(b) - size(a));
  const urls = [...touch, ...icons].map((l) => l.href).concat('/favicon.ico').map((h) => {
    try {
      return new URL(h, base).href;
    } catch {
      return null;
    }
  });
  return [...new Set(urls)].filter((u) => u?.startsWith('https://'));
}

// Ask the way a browser asks for an <img>, since some sites only answer that.
const AS_IMAGE = { ...BROWSER, accept: 'image/*', 'sec-fetch-dest': 'image', 'sec-fetch-mode': 'no-cors', 'sec-fetch-site': 'cross-site' };

// The file name for a company's logo: "Itaú Unibanco" -> "itau-unibanco".
export const slug = (name) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Download url and write it to `out` as a PNG at most 64px wide and high. Throws when it is not an image.
async function save(url, out) {
  const res = await get(url, AS_IMAGE);
  const type = res.headers.get('content-type') ?? '';
  const body = Buffer.from(await res.arrayBuffer());
  if (!body.length || !(type.startsWith('image/') || (type.includes('octet-stream') && /\.ico(\?|$)/.test(url)))) throw new Error(`not an image: ${url}`);
  // sips reads an SVG only when the file name says so.
  const tmp = join(tmpdir(), `logo-${process.pid}-${Math.random().toString(36).slice(2)}${type.includes('svg') ? '.svg' : ''}`);
  await writeFile(tmp, body);
  try {
    await promisify(execFile)('sips', ['-s', 'format', 'png', '-Z', '64', tmp, '--out', out]);
  } catch (err) {
    // No sips (Linux): keep a small PNG as it is.
    if (err.code !== 'ENOENT' || type !== 'image/png' || body.length > 50000) throw err;
    await writeFile(out, body);
  } finally {
    await rm(tmp, { force: true });
  }
}

// Save the first candidate that is an image; return whether one was saved.
async function saveFirst(urls, out) {
  for (const url of urls) {
    try {
      await save(url, out);
      return true;
    } catch {}
  }
  return false;
}

// When the homepage refuses scripts, /favicon.ico is often still served.
async function icon(homepage, out) {
  try {
    const res = await get(homepage, BROWSER);
    return await saveFirst(iconCandidates(await res.text(), res.url), out);
  } catch (err) {
    if (await saveFirst([new URL('/favicon.ico', homepage).href], out)) return true;
    throw err;
  }
}

// A copy of obj with the extra fields placed right after `key`, so the data files stay easy to read.
const after = (obj, key, extra) => Object.fromEntries(Object.entries(obj).filter(([k]) => !(k in extra)).flatMap((e) => (e[0] === key ? [e, ...Object.entries(extra)] : [e])));

async function main() {
  const file = (id) => new URL(`../data/${id}.json`, import.meta.url);
  const meta = JSON.parse(await readFile(file('meta'), 'utf8'));
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : meta.categories.map((c) => c.id);
  const cache = new Map(); // logo path -> Promise of the icon, so a company listed in several files is read once
  const problems = [];
  const lookup = ({ name, homepage }) => {
    const path = `logos/${slug(name)}.png`, out = fileURLToPath(new URL(`../${path}`, import.meta.url));
    if (!cache.has(path)) {
      cache.set(path, existsSync(out) ? Promise.resolve(path) : icon(homepage, out).then((ok) => (ok ? path : null), (err) => {
        problems.push(`${homepage}: ${err.message}`);
        return null;
      }));
    }
    return cache.get(path);
  };
  for (const id of ids) {
    const data = JSON.parse(await readFile(file(id), 'utf8'));
    const queue = [...(data.companies ?? []).keys()];
    await Promise.all(Array.from({ length: 6 }, async () => {
      for (let i; (i = queue.shift()) !== undefined; ) data.companies[i] = after(data.companies[i], 'homepage', { icon: await lookup(data.companies[i]) });
    }));
    await writeFile(file(id), `${JSON.stringify(data, null, 2)}\n`);
    const n = data.companies?.length ?? 0;
    console.log(`${id}: ${n - (data.companies ?? []).filter((c) => !c.icon).length} of ${n} companies have an icon`);
  }
  // A blocked homepage is not an error: the company keeps a monogram. List them so a person can check.
  if (problems.length) console.log(`Could not read ${problems.length} homepage(s):\n- ${problems.join('\n- ')}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
