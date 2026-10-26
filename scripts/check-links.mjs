// Usage: node scripts/check-links.mjs — fetches every source and company URL and fails on dead links (404/410).
// 401/403/429 and similar are reported but pass: many publishers block scripts while the page is fine.
import { readFile } from 'node:fs/promises';

const read = async (name) => JSON.parse(await readFile(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
const meta = await read('meta');
const urls = new Set();
for (const { id } of meta.categories) {
  const cat = await read(id);
  for (const cap of cat.capabilities) for (const cell of Object.values(cap.countries)) for (const ev of cell.evidence ?? []) urls.add(ev.url);
  for (const co of cat.companies ?? []) urls.add(co.url);
}

const queue = [...urls];
const results = [];
const headers = { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36' };
await Promise.all(Array.from({ length: 16 }, async () => {
  while (queue.length) {
    const url = queue.shift();
    try {
      results.push({ url, status: (await fetch(url, { headers, signal: AbortSignal.timeout(20000) })).status });
    } catch (err) {
      results.push({ url, status: `error: ${err.cause?.code ?? err.name}` });
    }
  }
}));

const dead = results.filter((r) => r.status === 404 || r.status === 410);
const unsure = results.filter((r) => typeof r.status !== 'number' || (r.status >= 400 && !dead.includes(r)));
for (const r of unsure) console.log(`?    ${r.status} ${r.url}`);
for (const r of dead) console.log(`DEAD ${r.status} ${r.url}`);
console.log(`${urls.size} links: ${dead.length} dead, ${unsure.length} could not be confirmed`);
process.exit(dead.length ? 1 : 0);
