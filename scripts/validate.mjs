// Usage: node scripts/validate.mjs   — exits 1 and lists problems if the dataset is invalid.
import { readFile } from 'node:fs/promises';
import { validate, scoreCountries } from '../src/observatory.js';

const read = async (name) => JSON.parse(await readFile(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));

const meta = await read('meta');
// A missing file is reported by validate below ("has no data file"); any other error (bad JSON) stops here with its message.
const categories = await Promise.all(meta.categories.map((c) => read(c.id).catch((err) => {
  if (err.code !== 'ENOENT') {
    console.error(`data/${c.id}.json: ${err.message}`);
    process.exit(1);
  }
  return null;
}))).then((list) => list.filter(Boolean));
const errors = validate(meta, categories);

if (errors.length) {
  console.error(`${errors.length} problem(s):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
for (const r of scoreCountries(meta, categories)) console.log(`${String(r.rank).padStart(2)}. ${r.name.padEnd(16)} ${r.score}`);
console.log('Dataset OK');
