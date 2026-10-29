import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forBusiness, BUSINESS_GROUPS } from '../src/observatory.js';

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
  assert.deepEqual(forBusiness(categories, 'US')[0].items[0].companies.map((c) => c.name), ['Shopify', 'Stripe']);
});

test('the business set is the eight capabilities from the brief', () => {
  assert.equal(BUSINESS_GROUPS.flatMap((g) => g.ids).length, 8);
});
