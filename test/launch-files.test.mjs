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

// The Content-Security-Policy is the last guard if markup ever slips into the data: no inline or third-party scripts run.
test('every page sets a CSP that runs only this site\'s scripts', () => {
  for (const page of ['index.html', '404.html']) {
    const csp = read(page).match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)?.[1];
    assert.ok(csp, `${page} has no CSP`);
    assert.match(csp, /(^|; )script-src 'self'(;|$)/, `${page}: script-src must be only 'self'`);
    assert.match(csp, /object-src 'none'/);
    assert.match(csp, /base-uri 'none'/);
  }
});
