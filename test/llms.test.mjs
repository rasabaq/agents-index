import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

// llms.txt is the guide AI assistants read to find and cite the data. It must list every data file, so a new
// category or data file shows here until it is added, and it must link only to files that exist.
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const llms = read('llms.txt');
const meta = JSON.parse(read('data/meta.json'));

test('llms.txt links every data file the site serves', () => {
  const files = ['meta', 'adoption', ...meta.categories.map((c) => c.id)];
  for (const id of files) assert.ok(llms.includes(`(https://agentindex.art/data/${id}.json)`), `llms.txt does not link data/${id}.json`);
});

test('every site link in llms.txt points at a file in the repo', () => {
  const paths = [...llms.matchAll(/\(https:\/\/agentindex\.art\/([^)#]*)\)/g)].map((m) => m[1] || 'index.html');
  assert.ok(paths.length > 10);
  for (const p of paths) assert.ok(existsSync(new URL(`../${p}`, import.meta.url)), `llms.txt links a missing file: ${p}`);
});

test('llms.txt opens with a title and a one-paragraph summary', () => {
  assert.match(llms, /^# Agent Index\n\n> \S/);
});
