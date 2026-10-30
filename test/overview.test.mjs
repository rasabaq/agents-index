import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scoreCountries } from '../src/observatory.js';
import { mosaic, fingerprint } from '../overview.js';

// The real data, indexed the way app.js does it.
const read = (name) => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
const meta = read('meta');
const categories = meta.categories.map((c) => read(c.id));
const capIndex = Object.fromEntries(categories.flatMap((cat) => cat.capabilities.map((cap) => [cap.id, { ...cap, category: cat.category }])));
const capIds = Object.keys(capIndex);
const gapLabel = (id) => meta.gapReasons.find((g) => g.id === id)?.label;
const score = Object.fromEntries(scoreCountries(meta, categories).map((r) => [r.code, r.score]));
const count = (html, re) => html.match(re)?.length ?? 0;

test('every country: one data-cap button per capability, one fingerprint slice per capability, nothing throws', () => {
  for (const { code } of meta.countries) {
    const html = mosaic({ meta, capIndex, code, gapLabel, errandOf: { [capIds[0]]: 'An errand' }, openErrand: [capIds[0]] });
    const caps = [...html.matchAll(/<button type="button"[^>]* data-cap="([^"]+)" data-code="([^"]+)"/g)];
    assert.deepEqual(caps.map((m) => m[1]).sort(), [...capIds].sort(), code);
    assert.ok(caps.every((m) => m[2] === code));
    assert.equal(count(html, /<button[^>]* aria-label="[^"]+"/g), capIds.length, `${code}: every square has a label`);
    assert.equal(count(html, /Not in an errand\./g), capIds.length - 1);
    assert.equal(count(html, /ov-open/g), 2, 'the square and the key');

    const svg = fingerprint({ meta, capIndex, code, score: score[code] });
    assert.equal(count(svg, /class="fp-slot"/g), capIds.length, code);
    assert.match(svg, /role="img" aria-label="Fingerprint of /);
  }
});

test('a gap without a reason says "No reason recorded"; no errands means no errand marks', () => {
  const [id] = capIds;
  const one = { [id]: { ...capIndex[id], countries: { CL: { status: 'none', note: 'n', evidence: [] } } } };
  const html = mosaic({ meta, capIndex: one, code: 'CL', gapLabel });
  assert.match(html, /aria-label="[^"]*No reason recorded\./);
  assert.match(html, /No reason recorded <b>1<\/b>/);
  assert.doesNotMatch(html, /errand/);
  assert.match(html, /0 live · 1 gaps<\/p>/);
});
