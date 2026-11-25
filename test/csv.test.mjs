import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cellsCsv, csvField, CSV_COLUMNS } from '../src/csv.js';

const read = (name) => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));

// A small CSV reader for the test: quoted fields may hold commas, quotes and line breaks.
function parse(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; } else if (c === '\r' && text[i + 1] === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; } else field += c;
  }
  return rows;
}

test('a field with a comma, a quote or a line break is quoted; others are left alone', () => {
  assert.equal(csvField('Chile'), 'Chile');
  assert.equal(csvField('Pix, UPI'), '"Pix, UPI"');
  assert.equal(csvField('the "Lu" assistant'), '"the ""Lu"" assistant"');
  assert.equal(csvField('two\nlines'), '"two\nlines"');
  assert.equal(csvField(null), '');
  assert.equal(csvField(3), '3');
});

test('one row per country and check, with its status, sources and the data date', () => {
  const meta = { asOf: '2026-11-06', countries: [{ code: 'CL', name: 'Chile' }, { code: 'US', name: 'United States' }] };
  const categories = [{
    category: 'commerce',
    capabilities: [{
      id: 'commerce.in-chat-checkout', name: 'Buy inside an AI assistant',
      countries: {
        US: { status: 'live', note: 'Works, with "quotes", and commas.', evidence: [{ url: 'https://a.example' }, { url: 'https://b.example' }] },
        CL: { status: 'none', note: 'Not yet.', confidence: 'low', gapReason: 'not-launched' },
      },
    }],
  }];
  const rows = parse(cellsCsv(meta, categories));
  assert.deepEqual(rows[0], CSV_COLUMNS);
  assert.deepEqual(rows[1], ['CL', 'Chile', 'commerce', 'commerce.in-chat-checkout', 'Buy inside an AI assistant', 'none', 'yes', 'not-launched', 'Not yet.', '0', '', '2026-11-06']);
  assert.deepEqual(rows[2], ['US', 'United States', 'commerce', 'commerce.in-chat-checkout', 'Buy inside an AI assistant', 'live', 'no', '', 'Works, with "quotes", and commas.', '2', 'https://a.example https://b.example', '2026-11-06']);
  assert.equal(rows.length, 3);
});

test('the real data makes a row for every cell, each with every column', () => {
  const meta = read('meta');
  const categories = meta.categories.map((c) => read(c.id));
  const cells = categories.reduce((n, cat) => n + cat.capabilities.length, 0) * meta.countries.length;
  const rows = parse(cellsCsv(meta, categories));
  assert.equal(rows.length, cells + 1);
  for (const r of rows) assert.equal(r.length, CSV_COLUMNS.length);
});
