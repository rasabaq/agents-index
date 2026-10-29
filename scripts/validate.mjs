// Usage: node scripts/validate.mjs   — exits 1 and lists problems if the dataset is invalid.
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { validate, scoreCountries } from '../src/observatory.js';

const read = async (name) => JSON.parse(await readFile(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));

const meta = await read('meta');
const categories = await Promise.all(meta.categories.map((c) => read(c.id).catch(() => ({ category: c.id, capabilities: [] }))));
const errors = validate(meta, categories);
// Logos are files in this repo, so each one the data names must be there.
for (const cat of categories) {
  for (const x of [...(cat.companies ?? []), ...(cat.repos ?? [])]) if (x.icon && !existsSync(new URL(`../${x.icon}`, import.meta.url))) errors.push(`${cat.category}: "${x.name}": ${x.icon} is missing; run npm run refresh-sites`);
}

if (errors.length) {
  console.error(`${errors.length} problem(s):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
for (const r of scoreCountries(meta, categories)) console.log(`${String(r.rank).padStart(2)}. ${r.name.padEnd(16)} ${r.score}`);
console.log('Dataset OK');
