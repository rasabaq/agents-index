// The agent features of the big AI assistants, country by country (data/assistants.json). The countries page shows
// them as one table. It is not a category in meta.json, so scoreCountries never reads it and it never changes a score.
// Shared by the countries page and Node (validate, tests).
import { checkCell } from './observatory.js';

// The file carries its own asOf, the day its cells were checked, and no source may be later than that day. Every
// feature needs an id, a name, its vendor and a few words on what it does. A cell has the same shape and rules as a
// cell in a category file. A tracked country with no cell has simply not been checked yet; the page shows a "?".
export function checkAssistants(meta, file) {
  const errors = [];
  const where = 'assistants.json';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(file?.asOf ?? '')) errors.push(`${where}: needs "asOf", the day the cells were checked, as "YYYY-MM-DD"`);
  const features = file?.features ?? [];
  if (!features.length) errors.push(`${where}: needs at least one feature`);
  const codes = new Set(meta.countries.map((c) => c.code));
  const gapReasons = new Set((meta.gapReasons ?? []).map((r) => r.id));
  const ids = new Set();
  for (const f of features) {
    const at = `${where}/${f.id ?? '?'}`;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.id ?? '')) errors.push(`${at}: feature id must be lower-case words joined by "-"`);
    else if (ids.has(f.id)) errors.push(`${at}: feature id is used twice`);
    ids.add(f.id);
    if (!f.name || !f.vendor || !f.does) errors.push(`${at}: feature needs a name, a vendor and "does"`);
    for (const [code, cell] of Object.entries(f.countries ?? {})) {
      if (!codes.has(code)) errors.push(`${at}: unknown country "${code}"`);
      else checkCell(cell, `${at}/${code}`, file.asOf, gapReasons, errors);
    }
  }
  return errors;
}

// How many features work in a country today, and how many we checked there.
export function liveCount(file, code) {
  const cells = file.features.map((f) => f.countries[code]).filter(Boolean);
  return { live: cells.filter((c) => c.status === 'live').length, checked: cells.length };
}
