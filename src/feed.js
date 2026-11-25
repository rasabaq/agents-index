// What changed (data/changes.json, written by scripts/changes.mjs): one row per move on the page. Moves that share
// a day, a check and the same change of status make one row with all their countries, so one PR that moves a check
// in six countries reads as one line, not six.
export function groupMoves(changes) {
  const rows = new Map();
  for (const c of changes) {
    const key = `${c.date}|${c.capability}|${c.from}|${c.to}`;
    if (!rows.has(key)) rows.set(key, { date: c.date, capability: c.capability, name: c.name ?? c.capability, from: c.from, to: c.to, countries: [] });
    rows.get(key).countries.push(c.country);
  }
  return [...rows.values()];
}

// "United Kingdom", "Chile and Mexico", "the UK, Germany, Brazil and 3 more": up to `max` names, then a count.
export function countryList(names, max = 3) {
  if (names.length <= max) return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
  return `${names.slice(0, max).join(', ')} and ${names.length - max} more`;
}
