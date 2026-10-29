import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// sitemap.xml and CITATION.cff carry the data date by hand, so they must move with asOf.
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('the sitemap and the citation carry the asOf date', () => {
  const { asOf } = JSON.parse(read('data/meta.json'));
  assert.equal(read('sitemap.xml').match(/<lastmod>(.+?)<\/lastmod>/)?.[1], asOf);
  assert.equal(read('CITATION.cff').match(/^date-released: "(.+?)"$/m)?.[1], asOf);
});
