import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tierOf } from '../src/observatory.js';

test('tier cut-offs sit on the round numbers', () => {
  const cases = [[100, 'S'], [80, 'S'], [79, 'A'], [50, 'C'], [49, 'D'], [0, 'D']];
  for (const [score, letter] of cases) assert.equal(tierOf(score), letter, `score ${score}`);
});
