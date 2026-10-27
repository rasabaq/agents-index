// Usage: node scripts/refresh-sites.mjs [category ...] — reads each company's homepage and stores the URL of its
// icon in the data: apple-touch-icon first, then the largest icon link, then /favicon.ico. The URL must load as an
// image. When nothing loads (or the site blocks scripts) it stores null and the page shows a monogram instead.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
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

// Ask the way a browser asks for an <img> from another site, so hotlink rules answer as they would on the page.
const AS_IMAGE = { ...BROWSER, accept: 'image/*', 'sec-fetch-dest': 'image', 'sec-fetch-mode': 'no-cors', 'sec-fetch-site': 'cross-site' };

// The first candidate that answers with an image another site may show.
async function firstImage(urls) {
  for (const url of urls) {
    try {
      const res = await get(url, AS_IMAGE);
      const type = res.headers.get('content-type') ?? '';
      const body = await res.arrayBuffer();
      // Cross-Origin-Resource-Policy same-origin or same-site makes browsers block the image on our page.
      if (/same-(origin|site)/i.test(res.headers.get('cross-origin-resource-policy') ?? '')) continue;
      if (body.byteLength && (type.startsWith('image/') || (type.includes('octet-stream') && /\.ico(\?|$)/.test(url)))) return url;
    } catch {}
  }
  return null;
}

// When the homepage refuses scripts, /favicon.ico is often still served.
async function icon(homepage) {
  try {
    const res = await get(homepage, BROWSER);
    return await firstImage(iconCandidates(await res.text(), res.url));
  } catch (err) {
    const ico = await firstImage([new URL('/favicon.ico', homepage).href]);
    if (ico) return ico;
    throw err;
  }
}

// A copy of obj with the extra fields placed right after `key`, so the data files stay easy to read.
const after = (obj, key, extra) => Object.fromEntries(Object.entries(obj).filter(([k]) => !(k in extra)).flatMap((e) => (e[0] === key ? [e, ...Object.entries(extra)] : [e])));

async function main() {
  const file = (id) => new URL(`../data/${id}.json`, import.meta.url);
  const meta = JSON.parse(await readFile(file('meta'), 'utf8'));
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : meta.categories.map((c) => c.id);
  const cache = new Map(); // homepage -> Promise of an icon URL, so a company listed in several files is read once
  const problems = [];
  const lookup = (homepage) => {
    if (!cache.has(homepage)) {
      cache.set(homepage, icon(homepage).catch((err) => {
        problems.push(`${homepage}: ${err.message}`);
        return null;
      }));
    }
    return cache.get(homepage);
  };
  for (const id of ids) {
    const data = JSON.parse(await readFile(file(id), 'utf8'));
    const queue = [...(data.companies ?? []).keys()];
    await Promise.all(Array.from({ length: 6 }, async () => {
      for (let i; (i = queue.shift()) !== undefined; ) data.companies[i] = after(data.companies[i], 'homepage', { icon: await lookup(data.companies[i].homepage) });
    }));
    await writeFile(file(id), `${JSON.stringify(data, null, 2)}\n`);
    const n = data.companies?.length ?? 0;
    console.log(`${id}: ${n - (data.companies ?? []).filter((c) => !c.icon).length} of ${n} companies have an icon`);
  }
  // A blocked homepage is not an error: the company keeps a monogram. List them so a person can check.
  if (problems.length) console.log(`Could not read ${problems.length} homepage(s):\n- ${problems.join('\n- ')}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
