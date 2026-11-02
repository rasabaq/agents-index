// Usage: node scripts/validate.mjs   — exits 1 and lists problems if the dataset is invalid.
import { readFile } from 'node:fs/promises';
import { validate, scoreCountries } from '../src/observatory.js';
import { checkErrands } from '../src/errands.js';

const read = async (name) => JSON.parse(await readFile(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));

const meta = await read('meta');
const categories = await Promise.all(meta.categories.map((c) => read(c.id).catch(() => ({ category: c.id, capabilities: [] }))));
// The errands (src/errands.js) name capabilities by id, so a renamed capability shows here too.
const errors = [...validate(meta, categories), ...checkErrands(categories.flatMap((c) => c.capabilities.map((cap) => cap.id)))];

if (errors.length) {
  console.error(`${errors.length} problem(s):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
for (const r of scoreCountries(meta, categories)) console.log(`${String(r.rank).padStart(2)}. ${r.name.padEnd(16)} ${r.score}`);
console.log('Dataset OK');
