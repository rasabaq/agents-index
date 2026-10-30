import { test } from 'node:test';
import assert from 'node:assert/strict';
import { companiesFor, BUSINESS_GROUPS, marketsFor, validate } from '../src/observatory.js';

const cell = (status) => ({ status, note: 'n' });

test('for businesses: the companies that work in this country for a capability, merged by name, A to Z', () => {
  const companies = [
    { name: 'Shopify', markets: ['US', 'MX'], capabilities: ['commerce.merchant-protocol'] },
    { name: 'Stripe', markets: ['US'], capabilities: ['commerce.merchant-protocol'] },
    { name: 'Shopify', markets: ['MX'], capabilities: ['commerce.merchant-protocol'] },
    { name: 'Other', markets: ['MX'], capabilities: ['commerce.other'] },
  ];
  assert.deepEqual(companiesFor(companies, 'commerce.merchant-protocol', 'MX').map((c) => c.name), ['Shopify']);
  assert.deepEqual(companiesFor(companies, 'commerce.merchant-protocol', 'US').map((c) => c.name), ['Shopify', 'Stripe']);
  assert.deepEqual(companiesFor(undefined, 'commerce.merchant-protocol', 'US'), []);
});

test('marketsByCapability narrows a company to fewer markets for one capability', () => {
  const meta = { countries: [{ code: 'BR' }, { code: 'US' }], categories: [{ id: 'messaging', short: 'Chat', can: 'chat' }] };
  const data = [{ category: 'messaging', capabilities: [
    { id: 'messaging.business-ai-agent', name: 'Chat agent', question: 'q?', countries: { BR: cell('none'), US: cell('none') } },
    { id: 'messaging.pay-in-chat', name: 'Pay in chat', question: 'q?', countries: { BR: cell('none'), US: cell('none') } },
  ], companies: [{ name: 'Meta', role: 'r', url: 'https://meta.com', homepage: 'https://meta.com', icon: null, markets: ['BR', 'US'],
    capabilities: ['messaging.business-ai-agent', 'messaging.pay-in-chat'], marketsByCapability: { 'messaging.pay-in-chat': ['BR'] } }] }];
  const co = data[0].companies[0];
  assert.deepEqual(marketsFor(co, 'messaging.pay-in-chat'), ['BR']);
  assert.deepEqual(marketsFor(co, 'messaging.business-ai-agent'), ['BR', 'US']);
  const names = (code) => data[0].capabilities.map((cap) => [cap.id, companiesFor(data[0].companies, cap.id, code).map((c) => c.name)]);
  assert.deepEqual(names('US'), [['messaging.business-ai-agent', ['Meta']], ['messaging.pay-in-chat', []]]);
  assert.deepEqual(names('BR'), [['messaging.business-ai-agent', ['Meta']], ['messaging.pay-in-chat', ['Meta']]]);
  assert.deepEqual(validate(meta, data), []);
  co.marketsByCapability = { 'messaging.pay-in-chat': ['BR', 'DE'], 'messaging.other': ['BR'] };
  const errors = validate(meta, data).join('\n');
  assert.match(errors, /marketsByCapability names "messaging.other", which is not in its capabilities/);
  assert.match(errors, /marketsByCapability "messaging.pay-in-chat" has "DE", which is not one of its markets/);
});

test('the business set is the eight capabilities from the brief', () => {
  assert.equal(BUSINESS_GROUPS.flatMap((g) => g.items).length, 8);
  assert.ok(BUSINESS_GROUPS.every((g) => g.items.every((x) => x.label)));
});

test('the link holds the country and the view; old #country= links still work', async () => {
  const { readHash, writeHash, startCountry } = await import('../src/observatory.js');
  assert.deepEqual(readHash('#country=MX&view=business'), { country: 'MX', view: 'business', errand: null });
  assert.deepEqual(readHash('#country=MX'), { country: 'MX', view: 'people', errand: null });
  assert.deepEqual(readHash('#view=business'), { country: null, view: 'business', errand: null });
  assert.deepEqual(readHash('#country=mx&view=nope&errand=<b>'), { country: null, view: 'people', errand: null });
  assert.equal(writeHash('MX', 'business'), '#country=MX&view=business');
  assert.equal(writeHash('MX', 'people'), '#country=MX');
  assert.equal(startCountry(['US', 'MX'], '#country=MX&view=business'), 'MX');
});
