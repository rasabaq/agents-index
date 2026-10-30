import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ERRANDS, BUSINESS_ERRANDS, errandIn, findStep, checkErrands } from '../src/errands.js';
import { readHash, writeHash } from '../src/observatory.js';

const read = (name) => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
const meta = read('meta');
const capIds = meta.categories.flatMap((c) => read(c.id).capabilities.map((cap) => cap.id));

test('the errands name real capabilities, each once per view', () => {
  assert.deepEqual(checkErrands(capIds), []);
  assert.equal(ERRANDS.length, 7);
  assert.equal(BUSINESS_ERRANDS.length, 4);
});

test('the check catches unknown ids, an id used twice in a view, a missing label and a repeated errand id', () => {
  const e = (id, steps) => ({ id, title: id, steps, labels: Object.fromEntries(steps.flat().map((x) => [x, x])) });
  const errors = checkErrands(['a.x', 'a.y'], { people: [e('one', ['a.x', ['a.y', 'a.nope']]), e('one', ['a.x']), { id: 'two', steps: ['a.y'], labels: {} }] }).join('\n');
  assert.match(errors, /unknown capability "a\.nope"/);
  assert.match(errors, /capability "a\.x" is used twice/);
  assert.match(errors, /errand id "one" is used twice/);
  assert.match(errors, /"two" has no label for "a\.y"/);
  // The same capability in both views is fine.
  assert.deepEqual(checkErrands(['a.x'], { people: [e('one', ['a.x'])], business: [e('one', ['a.x'])] }), []);
});

const cell = (status) => ({ status, note: 'n' });
const caps = (statuses) => Object.fromEntries(Object.entries(statuses).map(([id, s]) => [id, { id, name: id, countries: { AA: cell(s) } }]));
const errand = { id: 'e', title: 'E', steps: ['s.a', ['s.b', 's.c'], 's.d', 's.e'], labels: { 's.a': 'A', 's.b': 'B', 's.c': 'C', 's.d': 'D', 's.e': 'E' } };

test('an either/or step takes its best way; the handoff is the first step you do yourself', () => {
  const r = errandIn(errand, caps({ 's.a': 'limited', 's.b': 'none', 's.c': 'live', 's.d': 'announced', 's.e': 'none' }), 'AA');
  assert.deepEqual(r.steps.map((s) => [s.best.id, s.role]), [['s.a', 'helps'], ['s.c', 'does'], ['s.d', 'you'], ['s.e', 'you']]);
  assert.equal(r.steps[1].ways[0].label, 'B');
  assert.deepEqual([r.does, r.helps, r.you, r.points], [1, 1, 2, 1.75]);
  assert.equal(r.handoff, 2);
  assert.equal(r.does + r.helps + r.you, r.steps.length);
});

test('no handoff when the agent can at least help with every step; a tie keeps the first way', () => {
  const r = errandIn(errand, caps({ 's.a': 'live', 's.b': 'limited', 's.c': 'limited', 's.d': 'live', 's.e': 'limited' }), 'AA');
  assert.equal(r.handoff, -1);
  assert.equal(r.steps[1].best.id, 's.b');
  assert.deepEqual([r.does, r.helps, r.you], [2, 2, 0]);
});

test('the handoff never falls on a step the agent helps with, in the real data', () => {
  const cats = meta.categories.map((c) => read(c.id));
  const capIndex = Object.fromEntries(cats.flatMap((c) => c.capabilities.map((cap) => [cap.id, cap])));
  for (const e of [...ERRANDS, ...BUSINESS_ERRANDS]) {
    for (const { code } of meta.countries) {
      const r = errandIn(e, capIndex, code);
      assert.equal(r.does + r.helps + r.you, e.steps.length, `${e.id} in ${code}`);
      if (r.handoff >= 0) assert.equal(r.steps[r.handoff].role, 'you', `${e.id} in ${code}`);
      assert.ok(r.steps.slice(0, Math.max(r.handoff, 0)).every((s) => s.role !== 'you'), `${e.id} in ${code}`);
    }
  }
});

test('a capability points to its errand and step', () => {
  assert.deepEqual(findStep(ERRANDS, 'payments.wallet-agent'), { errand: ERRANDS[0], index: 1 });
  assert.equal(findStep(ERRANDS, 'work.job-apply'), null);
});

test('the link holds the open errand and round-trips', () => {
  for (const [code, view, id] of [['CL', 'people', 'shop'], ['MX', 'business', 'backoffice'], ['US', 'people', null]]) {
    assert.deepEqual(readHash(writeHash(code, view, id)), { country: code, view, errand: id });
  }
  assert.equal(writeHash('CL', 'people', 'shop'), '#country=CL&errand=shop');
  assert.equal(writeHash('MX', 'business', 'paid'), '#country=MX&view=business&errand=paid');
});
