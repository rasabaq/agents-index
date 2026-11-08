import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { CREW, crewLines, checkCrew } from '../src/crew.js';

const read = (name) => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
const meta = read('meta');
const categories = meta.categories.map((c) => read(c.id));
const logos = new URL('../images/logos/', import.meta.url);
const hasLogo = (logo) => existsSync(new URL(`${logo}.png`, logos));

test('the crew names real cells, products in their notes and logos that exist', () => {
  assert.deepEqual(checkCrew(categories, hasLogo), []);
});

test('each crew line takes its status and live count from the data', () => {
  const caps = new Map(categories.flatMap((c) => c.capabilities.map((cap) => [cap.id, cap])));
  const lines = crewLines(meta, categories);
  assert.equal(lines.length, CREW.length);
  for (const l of lines) {
    assert.ok(['live', 'limited', 'announced', 'none'].includes(l.status), l.errand);
    assert.equal(l.of, meta.countries.length);
    assert.equal(l.live, Object.values(caps.get(l.cap).countries).filter((c) => c.status === 'live').length, l.errand);
  }
});

const cats = [{ capabilities: [{ id: 'a.x', countries: { AA: { status: 'live', note: 'Uses Foo.' }, BB: { status: 'none', note: 'Nothing.' } } }] }];
const line = (over) => ({ agent: 'shop', errand: 'buy', cap: 'a.x', country: 'AA', product: 'Foo', logo: 'foo', ...over });

test('a line whose cell is missing is dropped', () => {
  const lines = crewLines({ countries: [{}, {}] }, cats, [line(), line({ country: 'ZZ' }), line({ cap: 'a.nope' })]);
  assert.deepEqual(lines.map((l) => [l.country, l.status, l.live, l.of]), [['AA', 'live', 1, 2]]);
});

test('the check catches bad agents, cells, products, logos, gaps and idle agents', () => {
  const crew = [
    line({ agent: 'nobody' }),
    line({ country: 'ZZ' }),
    line({ product: 'Bar' }),
    line({ logo: 'gone' }),
    line({ product: null, logo: null }),
    line({ agent: 'pay', country: 'BB', product: null, logo: null }),
    line({ agent: 'book' }),
  ];
  const errors = checkCrew(cats, (logo) => logo === 'foo', crew);
  const all = errors.join('\n');
  assert.match(all, /unknown agent "nobody"/);
  assert.match(all, /no cell a\.x for ZZ/);
  assert.match(all, /the note does not name "Bar"/);
  assert.match(all, /missing images\/logos\/gone\.png/);
  assert.match(all, /a line with no product must be a gap, but the cell is live/);
  assert.match(all, /agent "act" has no line/);
  assert.equal(errors.length, 6);
});

test('every logo file is used by the crew and listed in SOURCES.md', () => {
  const sources = readFileSync(new URL('SOURCES.md', logos), 'utf8');
  for (const file of readdirSync(logos).filter((f) => f.endsWith('.png'))) {
    assert.ok(CREW.some((l) => `${l.logo}.png` === file), `${file} is not used`);
    assert.ok(sources.includes(`| ${file} |`), `${file} is not in SOURCES.md`);
  }
});
