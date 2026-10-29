// Usage: node scripts/check-links.mjs — fetches every source URL and company link and homepage, and fails on dead links:
// 404/410, a domain that no longer exists, or a certificate that is expired or made for another host.
// 401/403/429 and similar are reported but pass: many publishers block scripts while the page is fine.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:dns/promises';

const read = async (name) => JSON.parse(await readFile(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
const meta = await read('meta');
const urls = new Set();
for (const { id } of meta.categories) {
  const cat = await read(id);
  for (const cap of cat.capabilities) for (const cell of Object.values(cap.countries)) for (const ev of cell.evidence ?? []) urls.add(ev.url);
  for (const co of cat.companies ?? []) urls.add(co.url).add(co.homepage);
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
      let code = err.cause?.code ?? err.name;
      // The system resolver can fail where DNS still answers (some VPNs and local setups), so ask DNS before calling a domain gone.
      if (code === 'ENOTFOUND' && await resolve(new URL(url).hostname).then(() => true, () => false)) code = 'ENOTFOUND (but DNS answers)';
      results.push({ url, status: `error: ${code}` });
    }
  }
}));

// These sites answer 404 to every script request, even for pages that work in a browser, so a 404 there proves nothing.
const FAKE_404 = new Set(['help.uber.com']);
// A browser cannot open these either. A missing intermediate certificate is not here: browsers fetch it, Node does not.
const DEAD_ERRORS = new Set(['error: ENOTFOUND', 'error: CERT_HAS_EXPIRED', 'error: ERR_TLS_CERT_ALTNAME_INVALID']);
const dead = results.filter((r) => ((r.status === 404 || r.status === 410) && !FAKE_404.has(new URL(r.url).host)) || DEAD_ERRORS.has(r.status));
const unsure = results.filter((r) => !dead.includes(r) && (typeof r.status !== 'number' || r.status >= 400));
for (const r of unsure) console.log(`?    ${r.status} ${r.url}`);
for (const r of dead) console.log(`DEAD ${r.status} ${r.url}`);
console.log(`${urls.size} links: ${dead.length} dead, ${unsure.length} could not be confirmed`);
process.exit(dead.length ? 1 : 0);
