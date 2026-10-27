// Usage: node scripts/refresh-repos.mjs [category ...] — measures every open-source repo in the data files
// and writes its `usage` snapshot: GitHub stars, contributors and last push, monthly npm + PyPI downloads,
// and lifetime Docker Hub pulls. Pass category ids to refresh only those files.
// Needs a GitHub token (GITHUB_TOKEN, or a logged-in `gh`): unauthenticated calls stop after 60 an hour.
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const file = (id) => new URL(`../data/${id}.json`, import.meta.url);
const meta = JSON.parse(await readFile(file('meta'), 'utf8'));
const ids = process.argv.slice(2).length ? process.argv.slice(2) : meta.categories.map((c) => c.id);

let token = process.env.GITHUB_TOKEN;
try {
  token ||= execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
} catch {}
const today = new Date().toISOString().slice(0, 10);

// Retries 429 and 5xx a few times; pypistats in particular rate-limits bursts.
async function get(url, headers = {}) {
  for (let i = 0; ; i++) {
    const res = await fetch(url, { headers: { 'user-agent': 'ai-agent-observatory', ...headers }, signal: AbortSignal.timeout(30000) });
    if ((res.status === 429 || res.status >= 500) && i < 4) {
      await new Promise((r) => setTimeout(r, 2000 * 2 ** i));
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res;
  }
}
const json = async (url, headers) => (await get(url, headers)).json();
const gh = (path) => get(`https://api.github.com/${path}`, token ? { authorization: `Bearer ${token}` } : {});

async function contributors(repo) {
  try {
    const res = await gh(`repos/${repo}/contributors?per_page=1&anon=1`);
    const last = res.headers.get('link')?.match(/[?&]page=(\d+)>; rel="last"/);
    return last ? Number(last[1]) : (await res.json()).length;
  } catch {
    return null; // GitHub refuses to count contributors on its very largest repos.
  }
}

const downloads = async (p) => p.registry === 'npm'
  ? (await json(`https://api.npmjs.org/downloads/point/last-month/${p.name}`)).downloads
  : (await json(`https://pypistats.org/api/packages/${p.name.toLowerCase()}/recent`)).data.last_month;

const sum = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) : null);

async function measure(r) {
  const info = await (await gh(`repos/${r.repo}`)).json();
  if (info.full_name.toLowerCase() !== r.repo.toLowerCase()) throw new Error(`moved to ${info.full_name}; update "repo"`);
  const dls = [];
  for (const p of r.packages ?? []) dls.push(await downloads(p));
  const pulls = [];
  for (const i of r.images ?? []) pulls.push((await json(`https://hub.docker.com/v2/repositories/${i}/`)).pull_count);
  return {
    asOf: today,
    stars: info.stargazers_count,
    contributors: await contributors(r.repo),
    pushedAt: info.pushed_at.slice(0, 10),
    archived: info.archived,
    downloadsMonth: sum(dls),
    dockerPulls: sum(pulls),
  };
}

const problems = [];
for (const id of ids) {
  const data = JSON.parse(await readFile(file(id), 'utf8'));
  const queue = [...(data.repos ?? [])];
  await Promise.all(Array.from({ length: 4 }, async () => {
    for (let r; (r = queue.shift()); ) {
      try {
        r.usage = await measure(r);
      } catch (err) {
        problems.push(`${id}: ${r.repo}: ${err.message}`);
      }
    }
  }));
  await writeFile(file(id), `${JSON.stringify(data, null, 2)}\n`);
  console.log(`${id}: ${data.repos?.length ?? 0} repos`);
}
if (problems.length) {
  console.error(`${problems.length} problem(s):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
