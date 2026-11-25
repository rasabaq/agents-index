import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkAssistants, liveCount } from '../src/assistants.js';
import { scoreCountries } from '../src/observatory.js';

const read = (name) => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
const source = { title: 'Where it works', publisher: 'Vendor', url: 'https://example.org/where', date: '2026-11', type: 'company' };
const feature = (more = {}) => ({ id: 'some-agent', name: 'Some agent', vendor: 'Vendor', does: 'books things', countries: {}, ...more });
const meta = { asOf: '2026-11-06', countries: [{ code: 'US' }, { code: 'CL' }], gapReasons: [{ id: 'not-launched', label: 'Not launched' }] };

test('the assistants file passes its checks, and every cell names a tracked country', () => {
  const m = read('meta');
  const file = read('assistants');
  assert.deepEqual(checkAssistants(m, file), []);
  assert.ok(file.features.length >= 4 && file.features.length <= 7, 'keep the table to about six rows');
});

// The site scores the category files listed in meta.json (data.js), so a file that is not listed there is never scored.
test('the table never changes a score: it is not a category, and the site scores only the categories', () => {
  const m = read('meta');
  assert.ok(!m.categories.some((c) => c.id === 'assistants'));
  const loader = readFileSync(new URL('../data.js', import.meta.url), 'utf8');
  assert.match(loader, /categories: await Promise\.all\(meta\.categories\.map\(\(c\) => getJson\(c\.id\)\)\)/);
  assert.equal(scoreCountries(m, m.categories.map((c) => read(c.id))).length, m.countries.length);
});

test('a cell follows the category rules: a source for anything not Not yet, dated no later than the file', () => {
  const file = {
    asOf: '2026-11-25',
    features: [feature({ countries: {
      US: { status: 'live', note: 'Works.', evidence: [] },
      CL: { status: 'limited', note: 'Beta.', evidence: [{ ...source, date: '2026-12' }], confidence: 'high' },
      XX: { status: 'none', note: 'No.' },
    } })],
  };
  assert.deepEqual(checkAssistants(meta, file), [
    'assistants.json/some-agent/US: "live" needs evidence',
    'assistants.json/some-agent/CL: confidence can only be "low"',
    'assistants.json/some-agent/CL: evidence date "2026-12" is after asOf "2026-11-25"',
    'assistants.json/some-agent: unknown country "XX"',
  ]);
});

test('a source may be newer than the index, as long as it is not newer than the file', () => {
  const file = { asOf: '2026-11-25', features: [feature({ countries: { US: { status: 'live', note: 'Works.', evidence: [{ ...source, date: '2026-11-17' }] } } })] };
  assert.deepEqual(checkAssistants(meta, file), []);
});

test('a feature needs words, a unique id, and the file needs its own date', () => {
  const errors = checkAssistants(meta, { features: [feature({ vendor: '' }), feature(), feature({ id: 'Bad Id' })] });
  assert.deepEqual(errors, [
    'assistants.json: needs "asOf", the day the cells were checked, as "YYYY-MM-DD"',
    'assistants.json/some-agent: feature needs a name, a vendor and "does"',
    'assistants.json/some-agent: feature id is used twice',
    'assistants.json/Bad Id: feature id must be lower-case words joined by "-"',
  ]);
  assert.deepEqual(checkAssistants(meta, { asOf: '2026-11-25', features: [] }), ['assistants.json: needs at least one feature']);
});

test('a country with no cell is not checked yet, and does not count as checked', () => {
  const file = { features: [
    feature({ id: 'a', countries: { US: { status: 'live' }, CL: { status: 'none' } } }),
    feature({ id: 'b', countries: { US: { status: 'limited' } } }),
  ] };
  assert.deepEqual(liveCount(file, 'US'), { live: 1, checked: 2 });
  assert.deepEqual(liveCount(file, 'CL'), { live: 0, checked: 1 });
});
