import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startCountry, guessCountry, verdict, couldClose } from '../src/observatory.js';

test('the start country comes from the hash, then the time zone, then the browser language, then the US', () => {
  const codes = ['US', 'CL', 'MX'];
  assert.equal(startCountry(codes, '#country=MX', ['es-CL'], 'America/Santiago'), 'MX');
  assert.equal(startCountry(codes, '#country=ZZ', ['es-CL']), 'CL');
  assert.equal(startCountry(codes, '', ['en-US', 'en-CL'], 'America/Santiago'), 'CL');
  assert.equal(startCountry(codes, '', ['en', 'es-cl']), 'CL');
  assert.equal(startCountry(codes, '', ['de-DE', 'es'], 'Europe/Berlin'), 'US');
  assert.equal(guessCountry(codes, ['de-DE'], 'Europe/Berlin'), null);
  assert.equal(guessCountry(codes, [], 'America/Monterrey'), 'MX');
});

test('the verdict agrees with the lists: "can" has a live cell, "cannot yet" has none', () => {
  const scores = { commerce: 17, payments: 67, services: 33, banking: 0 };
  const live = { commerce: 0, payments: 2, services: 1, banking: 0 };
  assert.equal(verdict('Chile', scores, live, (ids) => (ids.join() === 'banking,commerce' ? 'No rule in force yet' : null)),
    'In Chile, AI agents can pay, and book travel and local services today, but cannot yet move money through your bank or shop for you. Main reason: No rule in force yet.');
  assert.equal(verdict('Chile', scores, live), 'In Chile, AI agents can pay, and book travel and local services today, but cannot yet move money through your bank or shop for you.');
  assert.equal(verdict('Mexico', { messaging: 90, government: 60 }, { messaging: 2, government: 1 }),
    'In Mexico, AI agents can buy and get support in chat, and prove who you are to apps today, and something works in every area, though not all of it yet.');
  assert.equal(verdict('Peru', { commerce: 10 }, { commerce: 0 }, () => 'Pilot only'), 'In Peru, nothing we track works for AI agents yet: they cannot shop for you. Main reason: Pilot only.');
});

test('a company could close a gap if it works next door, not here', () => {
  const region = { CO: 'LA', MX: 'LA', CL: 'LA', US: 'NA' };
  const cos = [
    { name: 'Mago', capabilities: ['pay.wallet'], markets: ['MX', 'CL'] },
    { name: 'Here', capabilities: ['pay.wallet'], markets: ['CO', 'MX'] },
    { name: 'Far', capabilities: ['pay.wallet'], markets: ['US'] },
    { name: 'Other', capabilities: ['pay.card'], markets: ['MX'] },
    { name: 'Agency', capabilities: ['pay.wallet'], markets: ['MX'] },
  ];
  assert.deepEqual(couldClose(cos, 'pay.wallet', 'CO', region).map((c) => [c.name, c.near]), [['Mago', ['MX', 'CL']]]);
  assert.deepEqual(couldClose(cos, 'pay.wallet', 'US', region), []);
});
