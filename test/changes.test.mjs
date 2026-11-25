import { test } from 'node:test';
import assert from 'node:assert/strict';
import { snapshot, moves, prOf, rss } from '../scripts/changes.mjs';
import { groupMoves, countryList } from '../src/feed.js';

// A data file with one check and its cells: { CL: 'none', US: 'live' } → capabilities[0].countries.
const file = (id, cells, name = id) => ({ capabilities: [{ id, name, countries: Object.fromEntries(Object.entries(cells).map(([c, status]) => [c, { status, note: `${c} is ${status}` }])) }] });

test('a snapshot reads every check file and skips files without checks', () => {
  const s = snapshot({ 'data/meta.json': { countries: [] }, 'data/commerce.json': file('commerce.x', { CL: 'none' }, 'Buy') });
  assert.deepEqual(s.cells, { 'commerce.x|CL': { status: 'none', note: 'CL is none' } });
  assert.deepEqual(s.names, { 'commerce.x': 'Buy' });
});

test('a move is a cell whose status changed; new cells and new countries are not moves', () => {
  const before = snapshot({ a: file('pay.x', { CL: 'none', US: 'live', MX: 'limited' }) });
  const after = snapshot({ a: file('pay.x', { CL: 'limited', US: 'live', MX: 'announced', AR: 'live' }), b: file('new.y', { CL: 'live' }) });
  const got = moves(before, after, { date: '2026-11-12', commit: 'abc1234', pr: 212 });
  assert.deepEqual(got, [
    { date: '2026-11-12', commit: 'abc1234', pr: 212, country: 'CL', capability: 'pay.x', from: 'none', to: 'limited', note: 'CL is limited' },
    { date: '2026-11-12', commit: 'abc1234', pr: 212, country: 'MX', capability: 'pay.x', from: 'limited', to: 'announced', note: 'MX is announced' },
  ]);
});

test('the PR number comes from a squash merge or a merge commit', () => {
  assert.equal(prOf('Re-check the payroll agent cell in all 24 countries (#212)'), 212);
  assert.equal(prOf('Merge pull request #29 from rasabaq/preview/main-plus-data'), 29);
  assert.equal(prOf('Fix a typo'), null);
});

test('the RSS feed has one item per move, with words for the codes and escaped text', () => {
  const xml = rss([{ date: '2026-11-12', commit: 'abc1234', country: 'CL', capability: 'pay.x', from: 'none', to: 'limited', note: 'Mercado Pago & "Mago"' }], {
    countryName: () => 'Chile', capName: () => 'Pay by bank', built: '2026-11-25',
  });
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<rss version="2.0">/);
  assert.match(xml, /<title>Chile · Pay by bank: Not yet → Limited<\/title>/);
  assert.match(xml, /<link>https:\/\/agentindex.art\/countries.html#country=CL<\/link>/);
  assert.match(xml, /<guid isPermaLink="false">abc1234-pay.x-CL<\/guid>/);
  assert.match(xml, /<pubDate>Thu, 12 Nov 2026 12:00:00 GMT<\/pubDate>/);
  assert.match(xml, /<description>Mercado Pago &amp; &quot;Mago&quot;<\/description>/);
  assert.equal(xml.match(/<item>/g).length, 1);
});

test('the page shows one row per day, check and change, with all its countries', () => {
  const m = (country, capability, from, to, date = '2026-11-12') => ({ date, country, capability, name: capability, from, to });
  const rows = groupMoves([m('GB', 'work.hr', 'none', 'limited'), m('DE', 'work.hr', 'none', 'limited'), m('NL', 'work.hr', 'limited', 'announced'), m('CL', 'work.hr', 'none', 'limited', '2026-11-04')]);
  assert.deepEqual(rows.map((r) => [r.date, r.from, r.to, r.countries]), [
    ['2026-11-12', 'none', 'limited', ['GB', 'DE']],
    ['2026-11-12', 'limited', 'announced', ['NL']],
    ['2026-11-04', 'none', 'limited', ['CL']],
  ]);
});

test('countries read as a short list', () => {
  assert.equal(countryList(['Chile']), 'Chile');
  assert.equal(countryList(['Chile', 'Mexico']), 'Chile and Mexico');
  assert.equal(countryList(['Chile', 'Mexico', 'Peru']), 'Chile, Mexico and Peru');
  assert.equal(countryList(['United Kingdom', 'Germany', 'Brazil', 'Chile', 'Mexico']), 'United Kingdom, Germany, Brazil and 2 more');
});
