import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../src/observatory.js';
import { iconCandidates } from '../scripts/refresh-sites.mjs';

const company = (over) => ({ name: 'Co', role: 'r', url: 'https://example.com/news', homepage: 'https://co.example/', icon: null, markets: [], capabilities: [], ...over });
const check = (co) => validate({ countries: [], categories: [{ id: 'a' }] }, [{ category: 'a', capabilities: [{ id: 'a.x', name: 'x', question: 'q?', countries: {} }], companies: [co] }]).join('\n');

test('validate checks company homepages and icons', () => {
  assert.equal(check(company()), '');
  assert.equal(check(company({ icon: 'https://co.example/icon.png' })), '');
  assert.match(check(company({ homepage: undefined })), /needs a homepage/);
  assert.match(check(company({ icon: undefined })), /no icon yet; run npm run refresh-sites/);
  assert.match(check(company({ icon: 'http://co.example/icon.png' })), /icon must be an https URL/);
});

test('icon candidates: apple-touch-icon, then the largest icon, then /favicon.ico; https only', () => {
  const html = `<html><head>
    <link rel="icon" href="/small.png" sizes="16x16"><link rel="shortcut icon" href="/big.png" sizes="64x64">
    <link rel='apple-touch-icon' href='https://cdn.example/touch.png?v=1&amp;x=2'><link rel="icon" href="http://co.example/old.ico">
  </head><body><link rel="icon" href="/in-body.png"></body></html>`;
  assert.deepEqual(iconCandidates(html, 'https://co.example/home'), [
    'https://cdn.example/touch.png?v=1&x=2', 'https://co.example/big.png', 'https://co.example/small.png', 'https://co.example/favicon.ico',
  ]);
});
