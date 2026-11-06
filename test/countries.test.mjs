import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { THEMES, themeScores, checkThemes, regionCompare, liveBy, gapCounts, ordinal, placeName } from '../src/observatory.js';

const all = (n) => Object.fromEntries(THEMES.flatMap((t) => t.categories).map((id) => [id, n]));
// A country row as scoreCountries returns it: every category at `n`, with some overrides.
const row = (code, name, region, score, n = score, more = {}) => ({ code, name, region, score, byCategory: { ...all(n), ...more } });

test('every category in meta.json sits in exactly one theme', () => {
  const meta = JSON.parse(readFileSync(new URL('../data/meta.json', import.meta.url), 'utf8'));
  const ids = meta.categories.map((c) => c.id);
  assert.deepEqual(checkThemes(ids), []);
  assert.deepEqual(checkThemes([...ids, 'pets']), ['category "pets" is in no theme: add it to one theme in THEMES in src/observatory.js']);
  assert.deepEqual(checkThemes(ids.filter((id) => id !== 'rules')), ['THEMES in src/observatory.js names an unknown category "rules"']);
});

test('a theme scores the mean of its categories', () => {
  const s = themeScores({ ...all(0), commerce: 100, payments: 50 });
  assert.equal(s.find((t) => t.id === 'shop-pay').score, 50);
  assert.equal(s.find((t) => t.id === 'money-id').score, 0);
});

test('live cells per category and gap reasons, most first', () => {
  const c = (category, status, gapReason) => ({ cap: { category }, cell: { status, gapReason } });
  const mine = [c('pay', 'live'), c('pay', 'none', 'no-rule'), c('shop', 'limited', 'pilot-only'), c('shop', 'none', 'no-rule'), c('shop', 'none')];
  assert.deepEqual(liveBy(mine), { pay: 1, shop: 0 });
  assert.deepEqual(gapCounts(mine), [['no-rule', 2], ['pilot-only', 1]]);
  assert.deepEqual(gapCounts(mine, ['shop']), [['pilot-only', 1], ['no-rule', 1]]);
});

test('names and ranks read well in a sentence', () => {
  assert.equal(placeName('United Kingdom'), 'the United Kingdom');
  assert.equal(placeName('Chile'), 'Chile');
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 101, 111].map(ordinal), ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '101st', '111th']);
});

const ranking = [
  row('US', 'United States', 'North America', 84),
  row('BR', 'Brazil', 'Latin America', 71, 71, { banking: 90, government: 86 }),
  row('GB', 'United Kingdom', 'Europe', 63),
  row('DE', 'Germany', 'Europe', 60, 60, { access: 70, rules: 70 }),
  row('CL', 'Chile', 'Latin America', 47, 47, { access: 90, rules: 60, banking: 40, government: 48 }),
  row('CO', 'Colombia', 'Latin America', 47),
  row('NG', 'Nigeria', 'Africa', 30),
];

test('compared with its region: the neighbours, the leader, and one plain sentence', () => {
  const cl = regionCompare(ranking, 'CL');
  assert.deepEqual(cl.peers.map((r) => r.code), ['BR', 'CO']);
  assert.equal(cl.ref.code, 'US');
  assert.equal(cl.refLabel, 'leader');
  assert.equal(cl.line, 'Chile is 2nd of 3 in Latin America, tied with Colombia. It leads the region in ground rules. It is furthest behind in money and ID: 44, against 88 in Brazil.');
});

test('the leader is measured against the next best; a lone country against the leader', () => {
  const us = regionCompare(ranking, 'US');
  assert.equal(us.ref.code, 'BR');
  assert.equal(us.refLabel, 'next best');
  assert.equal(us.line, 'The United States is the only country we track in North America, so it sits beside the next best, Brazil, and the average of all 7.');
  assert.equal(regionCompare(ranking, 'NG').line, 'Nigeria is the only country we track in Africa, so it sits beside the leader, the United States, and the average of all 7.');
  assert.equal(regionCompare([row('AA', 'Alpha', 'Here', 60), row('BB', 'Beta', 'Here', 40)], 'AA').line, 'Alpha is 1st of 2 in Here. It leads the region in every theme.');
  assert.equal(regionCompare(ranking, 'GB').line, 'The United Kingdom is 1st of 2 in Europe. It leads the region in shop and pay, get things done, and money and ID. It is furthest behind in ground rules: 63, against 70 in Germany.');
});

test('a country tied at the top leads; a lone country has no one to measure against', () => {
  const tie = [row('AA', 'Alpha', 'Here', 80), row('BB', 'Beta', 'There', 80), row('CC', 'Gamma', 'There', 50)];
  const bb = regionCompare(tie, 'BB');
  assert.equal(bb.ref.code, 'AA');
  assert.equal(bb.refLabel, 'next best');
  assert.equal(regionCompare(tie, 'CC').refLabel, 'leader');
  const one = regionCompare([row('AA', 'Alpha', 'Here', 60)], 'AA');
  assert.deepEqual([one.peers, one.ref, one.line], [[], null, 'Alpha is the only country we track so far.']);
});
