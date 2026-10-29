import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// fonts/flags.woff2 is Noto Color Emoji cut down to the flags listed in styles.css. A new country or company HQ
// must be added to that list (then rebuild with fonts/flags.py), or Windows shows two letters instead of its flag.
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('the flag font subset covers every flag in the data', () => {
  const meta = JSON.parse(read('data/meta.json'));
  const codes = new Set(meta.countries.map((c) => c.code));
  for (const cat of meta.categories) {
    const data = JSON.parse(read(`data/${cat.id}.json`));
    for (const co of data.companies ?? []) {
      codes.add(co.hq);
      co.markets.forEach((m) => codes.add(m));
    }
    for (const r of data.repos ?? []) if (r.origin) codes.add(r.origin);
  }
  const inFont = read('styles.css').match(/Flags in it: ([A-Z ]+)/)[1].trim().split(' ');
  const missing = [...codes].filter((c) => !inFont.includes(c));
  assert.deepEqual(missing, [], `the flag font (styles.css "Flags in it") is missing ${missing.join(', ')}`);
});
