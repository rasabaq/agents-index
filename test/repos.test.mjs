import { test } from 'node:test';
import assert from 'node:assert/strict';
import { repoUse, rankRepos, validate } from '../src/observatory.js';

const u = (over) => ({ asOf: '2026-10-27', pushedAt: '2026-10-20', stars: 100, archived: false, downloadsMonth: null, dockerPulls: null, ...over });

test('real use comes from installs, not stars', () => {
  assert.equal(repoUse(u({ downloadsMonth: 2e6 })), 'wide');
  assert.equal(repoUse(u({ dockerPulls: 2e8 })), 'wide');
  assert.equal(repoUse(u({ downloadsMonth: 6e4 })), 'real');
  assert.equal(repoUse(u({ dockerPulls: 2e6, downloadsMonth: 10 })), 'real');
  assert.equal(repoUse(u({ stars: 90000, downloadsMonth: 900 })), 'buzz');
  assert.equal(repoUse(u({ downloadsMonth: 900 })), 'niche');
  assert.equal(repoUse(u({ stars: 90000 })), 'unmeasured');
  assert.equal(repoUse(u({ downloadsMonth: 9e6, pushedAt: '2026-01-01' })), 'dormant');
  assert.equal(repoUse(u({ downloadsMonth: 9e6, archived: true })), 'dormant');
});

test('repos rank by tier, then installs', () => {
  const cats = [{ category: 'a', repos: [
    { repo: 'x/buzz', usage: u({ stars: 9e4, downloadsMonth: 10 }) },
    { repo: 'x/small', usage: u({ downloadsMonth: 6e4 }) },
    { repo: 'x/big', usage: u({ downloadsMonth: 8e4 }) },
  ] }];
  assert.deepEqual(rankRepos(cats).map((r) => r.repo), ['x/big', 'x/small', 'x/buzz']);
});

test('validate catches bad repo entries', () => {
  const meta = { countries: [], categories: [{ id: 'a', short: 'A', can: 'do a' }] };
  const cats = [{ category: 'a', capabilities: [{ id: 'a.x', name: 'x', question: 'q?', countries: {} }], repos: [
    { repo: 'not-a-repo', name: 'n', role: 'r', capabilities: ['a.nope'], packages: [{ registry: 'cargo', name: 'x' }] },
    { repo: 'o/r', name: 'n', role: 'r', capabilities: ['a.x'], usage: u() },
    { repo: 'O/R', name: 'n', role: 'r', capabilities: ['a.x'], usage: u() },
  ] }];
  const errors = validate(meta, cats).join('\n');
  assert.match(errors, /must be "owner\/name"/);
  assert.match(errors, /unknown capability "a.nope"/);
  assert.match(errors, /package needs a name and a registry/);
  assert.match(errors, /no usage yet/);
  assert.match(errors, /"O\/R": listed twice/);
});
