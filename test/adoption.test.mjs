import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkAdoption, useRanks, useLine, fmtUse } from '../src/adoption.js';

const read = (name) => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
const source = { title: 'Report', publisher: 'Someone', url: 'https://example.org/r', date: '2026-09', type: 'report' };
const measure = (more = {}) => ({ id: 'ai-users', name: 'People who use AI', unit: 'percent', says: 'of people used AI', how: 'A survey.', source, ...more });
const meta = { asOf: '2026-11-06', countries: [{ code: 'US' }, { code: 'CL' }] };

test('the adoption file covers every tracked country and passes its checks', () => {
  const m = read('meta');
  const adoption = read('adoption');
  assert.deepEqual(checkAdoption(m, adoption), []);
  assert.deepEqual(Object.keys(adoption.countries).sort(), m.countries.map((c) => c.code).sort());
});

test('a missing, out-of-range or unknown country number is an error', () => {
  const errors = checkAdoption(meta, { measures: [measure()], countries: { US: { 'ai-users': 33 }, CL: { 'ai-users': 140 }, XX: { 'ai-users': 1 } } });
  assert.deepEqual(errors, [
    'adoption.json: unknown country "XX"',
    'adoption.json/CL: "ai-users" needs a number from 0 to 100, not 140',
  ]);
  assert.match(checkAdoption(meta, { measures: [measure()], countries: { US: { 'ai-users': 33 } } })[0], /CL: "ai-users" needs a number/);
});

test('a measure needs words, a known unit and a dated source no later than asOf', () => {
  const errors = checkAdoption(meta, { measures: [measure({ unit: 'people', says: '', source: { ...source, date: '2026-12' } })], countries: { US: { 'ai-users': 1 }, CL: { 'ai-users': 2 } } });
  assert.deepEqual(errors, [
    'adoption.json/ai-users: measure needs a name, says and how',
    'adoption.json/ai-users: unit must be one of percent, index, not "people"',
    'adoption.json/ai-users: evidence date "2026-12" is after asOf "2026-11-06"',
  ]);
  assert.deepEqual(checkAdoption(meta, { measures: [], countries: {} }), ['adoption.json: needs at least one measure']);
});

test('places go highest first, and equal numbers share a place', () => {
  const adoption = { countries: { US: { x: 33 }, SA: { x: 31.4 }, IT: { x: 31.4 }, CL: { x: 24 } } };
  assert.deepEqual(useRanks(adoption, ['US', 'SA', 'IT', 'CL'], 'x'), { US: 1, SA: 2, IT: 2, CL: 4 });
});

test('numbers read as a share or a multiple', () => {
  assert.equal(fmtUse({ unit: 'percent' }, 24.04), '24%');
  assert.equal(fmtUse({ unit: 'index' }, 1.84), '1.8×');
  assert.equal(fmtUse({ unit: 'index' }, 0.24), '0.2×');
});

test('one sentence says which runs ahead: the agents or the people', () => {
  assert.equal(useLine('Brazil', 2, 20, 24), 'Brazil is 2nd of 24 for what agents can do, but 20th for how many people use AI. Here the agents are ahead of the people.');
  assert.equal(useLine('United Arab Emirates', 13, 1, 24), 'The United Arab Emirates is 1st of 24 for how many people use AI, but 13th for what agents can do. Here the people are ahead of the agents.');
  assert.equal(useLine('Chile', 13, 16, 24), 'Chile is 13th of 24 for what agents can do and 16th for how many people use AI. The two are close.');
});
