import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forBusiness, BUSINESS_GROUPS, marketsFor, validate } from '../src/observatory.js';

const cell = (status) => ({ status, note: 'n' });
const categories = [
  { category: 'commerce', capabilities: [
    { id: 'commerce.merchant-protocol', name: 'Merchants sell', countries: { MX: cell('limited'), US: cell('live') } },
    { id: 'commerce.other', name: 'Not for business', countries: { MX: cell('live') } },
  ], companies: [
    { name: 'Shopify', markets: ['US', 'MX'], capabilities: ['commerce.merchant-protocol'] },
    { name: 'Stripe', markets: ['US'], capabilities: ['commerce.merchant-protocol'] },
    { name: 'Shopify', markets: ['MX'], capabilities: ['commerce.merchant-protocol'] },
  ] },
  { category: 'messaging', capabilities: [
    { id: 'messaging.business-ai-agent', name: 'Chat agent', countries: { MX: cell('live') } },
  ], companies: [{ name: 'Meta', markets: ['MX'], capabilities: ['messaging.business-ai-agent'] }] },
];

test('for businesses: only the business capabilities, grouped, with the companies that work in this country', () => {
  const groups = forBusiness(categories, 'MX');
  assert.deepEqual(groups.map((g) => [g.title, g.items.map((x) => x.cap.id)]), [
    ['Sell through AI agents', ['commerce.merchant-protocol']],
    ['Sell in chat apps', ['messaging.business-ai-agent']],
  ]);
  assert.deepEqual(groups[0].items[0].companies.map((c) => c.name), ['Shopify']);
  assert.equal(groups[0].items[0].cell.status, 'limited');
  assert.equal(groups[0].items[0].label, 'AI agents can buy from your online store');
  assert.deepEqual(forBusiness(categories, 'US')[0].items[0].companies.map((c) => c.name), ['Shopify', 'Stripe']);
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
  const names = (code) => forBusiness(data, code)[0].items.map((x) => [x.cap.id, x.companies.map((c) => c.name)]);
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
