import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../src/observatory.js';

const meta = { countries: [{ code: 'AA', name: 'Alpha' }], categories: [{ id: 'pay' }], gapReasons: [{ id: 'pilot-only', label: 'Pilot only' }] };
const ev = [{ title: 'Launch post', url: 'https://example.com/a', type: 'company' }];
const check = (cell, m = meta) => validate(m, [{ category: 'pay', capabilities: [{ id: 'pay.a', name: 'a', question: 'q?', countries: { AA: { note: 'n', evidence: ev, ...cell } } }] }]).join('\n');

test('gapReason is optional and must be a known id on a cell that is not live', () => {
  assert.equal(check({ status: 'limited' }), '');
  assert.equal(check({ status: 'limited', gapReason: 'pilot-only' }), '');
  assert.equal(check({ status: 'none', evidence: [], gapReason: 'pilot-only' }), '');
  assert.match(check({ status: 'live', gapReason: 'pilot-only' }), /a live cell has no gapReason/);
  assert.match(check({ status: 'announced', gapReason: 'too-hard' }), /unknown gapReason "too-hard"/);
  assert.match(check({ status: 'limited' }, { ...meta, gapReasons: [{ id: 'x' }] }), /needs an id and a label/);
});
