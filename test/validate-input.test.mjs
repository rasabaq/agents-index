import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../src/observatory.js';

// Ids, codes and dates end up in the page's HTML, so validate rejects anything that is not plain data.
const meta = { countries: [{ code: 'AA', name: 'Alpha' }, { code: 'BB', name: 'Beta' }], categories: [{ id: 'shop', short: 'Shop', can: 'shop' }] };
const cell = (url = 'https://example.com/a', date = '2026-05') => ({ status: 'live', note: 'n', evidence: [{ title: 't', url, type: 'company', date }] });
const company = { name: 'Acme', role: 'r', url: 'https://acme.com', homepage: 'https://acme.com', icon: null, hq: 'AA', markets: ['AA'], capabilities: ['shop.a'] };
const data = (over = {}) => [{ category: 'shop', capabilities: [{ id: 'shop.a', name: 'a', question: 'q?', countries: { AA: cell(), BB: cell() } }], companies: [company], ...over }];
const check = (m, d) => validate(m, d).join('\n');

test('valid input has no problems', () => {
  assert.equal(check(meta, data()), '');
});

test('markup in a capability id, category id or country code is rejected', () => {
  const bad = data();
  bad[0].capabilities[0].id = 'shop.a"><img src=x onerror=alert(1)>';
  bad[0].companies = [];
  assert.match(check(meta, bad), /id must be "shop\." then lowercase letters, digits and dashes/);
  assert.match(check({ ...meta, categories: [{ id: 'shop"><b>', short: 'S', can: 'c' }] }, data()), /category "shop"><b>": id must be lowercase letters and dashes/);
  assert.match(check({ ...meta, countries: [...meta.countries, { code: 'A"', name: 'x' }] }, data()), /country "A"": code must be two capital letters/);
});

test('a company needs an hq code and a list of markets', () => {
  const { hq, markets, ...noHq } = company;
  const bad = data({ companies: [noHq] });
  assert.match(check(meta, bad), /company "Acme": hq must be a two-letter country code/);
  assert.match(check(meta, bad), /company "Acme": markets must be a list of country codes/);
  assert.match(check(meta, data({ companies: [{ ...company, hq: '<b>' }] })), /hq must be a two-letter country code/);
});

test('impossible dates are rejected', () => {
  const withDate = (date) => {
    const d = data();
    d[0].capabilities[0].countries.AA = cell(undefined, date);
    return check(meta, d);
  };
  assert.equal(withDate('2028-02-29'), '');
  assert.match(withDate('2026-13'), /evidence date must be/);
  assert.match(withDate('2026-01-45'), /evidence date must be/);
  assert.match(withDate('2026-02-30'), /evidence date must be/);
});

test('the same link in two forms is flagged', () => {
  const withUrls = (a, b) => {
    const d = data();
    d[0].capabilities[0].countries.AA = cell(a);
    d[0].capabilities[0].countries.BB = cell(b);
    return check(meta, d);
  };
  assert.equal(withUrls('https://example.com/a', 'https://example.com/a'), '');
  assert.equal(withUrls('https://example.com/a', 'https://example.com/b'), '');
  for (const b of ['https://www.example.com/a', 'https://example.com/a/', 'http://example.com/a']) {
    assert.match(withUrls('https://example.com/a', b), /is the same link as "https:\/\/example\.com\/a"; use one form/);
  }
});
