import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreCountries, validate } from '../src/observatory.js';

const ev = [{ title: 'Launch post', url: 'https://example.com/a', type: 'company', date: '2026-05' }];
const meta = {
  countries: [
    { code: 'AA', name: 'Alpha' },
    { code: 'BB', name: 'Beta' },
    { code: 'CC', name: 'Gamma' },
  ],
  categories: [{ id: 'shop' }, { id: 'pay' }],
};
const cell = (status) => ({ status, note: 'n', evidence: status === 'none' ? [] : ev });
const cap = (id, statuses) => ({
  id,
  name: id,
  question: 'q?',
  countries: Object.fromEntries(Object.entries(statuses).map(([k, s]) => [k, cell(s)])),
});
const categories = [
  // shop has 2 capabilities, pay has 1: each category still weighs 50%.
  { category: 'shop', capabilities: [cap('shop.a', { AA: 'live', BB: 'limited', CC: 'live' }), cap('shop.b', { AA: 'live', BB: 'none', CC: 'live' })] },
  { category: 'pay', capabilities: [cap('pay.a', { AA: 'none', BB: 'announced', CC: 'none' })] },
];

test('scores weigh categories equally and rank with ties', () => {
  const rows = scoreCountries(meta, categories);
  const by = Object.fromEntries(rows.map((r) => [r.code, r]));
  assert.equal(by.AA.score, 50); // (100 + 0) / 2
  assert.equal(by.BB.byCategory.shop, 25); // (0.5 + 0) / 2
  assert.equal(by.BB.byCategory.pay, 25);
  assert.equal(by.BB.score, 25);
  assert.deepEqual(rows.map((r) => [r.code, r.rank]), [['AA', 1], ['CC', 1], ['BB', 3]]);
  assert.deepEqual(by.AA.counts, { live: 2, limited: 0, announced: 0, none: 1 });
});

test('valid data has no problems', () => {
  assert.deepEqual(validate(meta, categories), []);
});

test('validate catches the mistakes that break trust', () => {
  const bad = structuredClone(categories);
  bad[0].capabilities[0].countries.AA.evidence = []; // live without a source
  bad[0].capabilities[1].countries.BB.status = 'maybe';
  delete bad[1].capabilities[0].countries.CC;
  bad[1].companies = [{ name: 'X', role: 'r', url: 'not a url', markets: ['ZZ'], capabilities: [] }];
  const errors = validate(meta, bad).join('\n');
  assert.match(errors, /shop\.a\/AA: "live" needs evidence/);
  assert.match(errors, /shop\.b\/BB: bad status "maybe"/);
  assert.match(errors, /pay\.a\/CC: missing/);
  assert.match(errors, /bad url/);
  assert.match(errors, /unknown market "ZZ"/);
});
