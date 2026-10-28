import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startCountry, verdict, couldClose } from '../src/observatory.js';

test('the start country comes from the hash, then the browser language, then the US', () => {
  const codes = ['US', 'CL', 'MX'];
  assert.equal(startCountry(codes, '#country=MX', ['es-CL']), 'MX');
  assert.equal(startCountry(codes, '#country=ZZ', ['es-CL']), 'CL');
  assert.equal(startCountry(codes, '', ['en', 'es-cl']), 'CL');
  assert.equal(startCountry(codes, '', ['de-DE', 'es']), 'US');
  assert.equal(startCountry(codes, '', []), 'US');
});

test('the verdict says what agents can do, what they cannot yet, and why', () => {
  const scores = { commerce: 67, payments: 33, banking: 17, services: 83 };
  assert.equal(verdict('Chile', scores, (ids) => (ids.join() === 'banking,payments' ? 'No rule in force yet' : null)),
    'In Chile, AI agents can book travel and local services and shop for you today, but cannot yet move money through your bank or pay, mostly because: no rule in force yet.');
  assert.equal(verdict('Chile', scores), 'In Chile, AI agents can book travel and local services and shop for you today, but cannot yet move money through your bank or pay.');
  assert.equal(verdict('United States', { commerce: 90, payments: 60 }), 'In the United States, AI agents can shop for you and pay today, and every area works at least in part.');
  assert.equal(verdict('Peru', { commerce: 10 }, () => 'Pilot only'), 'In Peru, AI agents are still early: they cannot yet shop for you, mostly because: pilot only.');
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
