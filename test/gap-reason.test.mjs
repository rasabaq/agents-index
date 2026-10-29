import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../src/observatory.js';

const meta = { countries: [{ code: 'AA', name: 'Alpha' }], categories: [{ id: 'pay', short: 'Pay', can: 'pay' }], gapReasons: [{ id: 'pilot-only', label: 'Pilot only' }] };
const ev = [{ title: 'Launch post', url: 'https://example.com/a', type: 'company', date: '2026-05' }];
const check = (cell, m = meta) => validate(m, [{ category: 'pay', capabilities: [{ id: 'pay.a', name: 'a', question: 'q?', countries: { AA: { note: 'n', evidence: ev, ...cell } } }] }]).join('\n');

test('gapReason is optional and must be a known id on a cell that is not live', () => {
  assert.equal(check({ status: 'limited' }), '');
  assert.equal(check({ status: 'limited', gapReason: 'pilot-only' }), '');
  assert.match(check({ status: 'none', evidence: [], gapReason: 'pilot-only' }), /gapReason "pilot-only" goes only on a limited cell/);
  assert.match(check({ status: 'live', gapReason: 'pilot-only' }), /a live cell has no gapReason/);
  assert.match(check({ status: 'announced', gapReason: 'too-hard' }), /unknown gapReason "too-hard"/);
  assert.match(check({ status: 'limited' }, { ...meta, gapReasons: [{ id: 'x' }] }), /needs an id and a label/);
});

test('assist-only and pilot-only go only on a limited cell; the other reasons can go on any cell that is not live', () => {
  const m = { ...meta, gapReasons: [...meta.gapReasons, { id: 'assist-only', label: 'You do the last step' }, { id: 'no-rule', label: 'No rule' }] };
  assert.equal(check({ status: 'limited', gapReason: 'assist-only' }, m), '');
  assert.match(check({ status: 'announced', gapReason: 'assist-only' }, m), /gapReason "assist-only" goes only on a limited cell/);
  assert.match(check({ status: 'none', evidence: [], gapReason: 'pilot-only' }, m), /goes only on a limited cell/);
  assert.equal(check({ status: 'none', evidence: [], gapReason: 'no-rule' }, m), '');
  assert.equal(check({ status: 'announced', gapReason: 'no-rule' }, m), '');
});
