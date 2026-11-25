// How many people use AI in each country (data/adoption.json): numbers from outside sources, shown beside the index.
// They are context only and never change a score. Shared by the countries page and Node (validate, tests).
import { checkEvidence, ordinal, placeName } from './observatory.js';

const UNITS = ['percent', 'index'];

// Every measure needs an id, a name, a unit, the words the page shows after the number, and one source. Every
// tracked country needs a number for every measure, and the file names no country we do not track.
export function checkAdoption(meta, adoption) {
  const errors = [];
  const where = 'adoption.json';
  const measures = adoption?.measures ?? [];
  if (!measures.length) errors.push(`${where}: needs at least one measure`);
  const ids = new Set();
  for (const m of measures) {
    const at = `${where}/${m.id ?? '?'}`;
    if (!/^[a-z][a-z-]*$/.test(m.id ?? '')) errors.push(`${at}: measure id must be lower-case words joined by "-"`);
    else if (ids.has(m.id)) errors.push(`${at}: measure id is used twice`);
    ids.add(m.id);
    if (!m.name || !m.says || !m.how) errors.push(`${at}: measure needs a name, says and how`);
    if (!UNITS.includes(m.unit)) errors.push(`${at}: unit must be one of ${UNITS.join(', ')}, not "${m.unit}"`);
    if (!m.source) errors.push(`${at}: measure needs a source`);
    else checkEvidence(m.source, at, meta.asOf, errors);
  }
  const codes = meta.countries.map((c) => c.code);
  const rows = adoption?.countries ?? {};
  for (const code of Object.keys(rows)) if (!codes.includes(code)) errors.push(`${where}: unknown country "${code}"`);
  for (const code of codes) {
    for (const m of measures) {
      const v = rows[code]?.[m.id];
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || (m.unit === 'percent' && v > 100)) {
        errors.push(`${where}/${code}: "${m.id}" needs a number${m.unit === 'percent' ? ' from 0 to 100' : ' of 0 or more'}, not ${JSON.stringify(v)}`);
      }
    }
  }
  return errors;
}

// Each country's place for one measure, highest first. Equal numbers share a place, as in the index ranking.
export function useRanks(adoption, codes, id) {
  const v = (code) => adoption.countries[code][id];
  return Object.fromEntries(codes.map((code) => [code, 1 + codes.filter((c) => v(c) > v(code)).length]));
}

// The number as the page shows it: "24%" or "1.8×".
export const fmtUse = (m, v) => (m.unit === 'percent' ? `${Math.round(v)}%` : `${v >= 10 ? Math.round(v) : v.toFixed(1)}×`);

// One plain sentence that puts the two places side by side: what agents can do here (the index rank) and how many
// people use AI (the rank on the first measure). A gap of GAP places or more is worth saying out loud.
export const GAP = 6;
export function useLine(name, agentRank, useRank, total) {
  const place = placeName(name);
  const Place = place[0].toUpperCase() + place.slice(1);
  const a = ordinal(agentRank), u = ordinal(useRank);
  if (useRank - agentRank >= GAP) return `${Place} is ${a} of ${total} for what agents can do, but ${u} for how many people use AI. Here the agents are ahead of the people.`;
  if (agentRank - useRank >= GAP) return `${Place} is ${u} of ${total} for how many people use AI, but ${a} for what agents can do. Here the people are ahead of the agents.`;
  return `${Place} is ${a} of ${total} for what agents can do and ${u} for how many people use AI. The two are close.`;
}
