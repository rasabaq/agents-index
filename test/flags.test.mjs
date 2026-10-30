import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The page loads Noto Color Emoji subset to the flags in the data. A new country or company HQ
// must be added to the subset, or its flag falls back to the system emoji font (or none on Windows).
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const flag = (code) => String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));

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
  for (const page of ['index.html', 'companies.html']) {
    const text = decodeURIComponent(read(page).match(/family=Noto\+Color\+Emoji&text=([^&"]+)/)[1]);
    const missing = [...codes].filter((c) => !text.includes(flag(c)));
    assert.deepEqual(missing, [], `${page} flag subset is missing ${missing.join(', ')}`);
  }
});
