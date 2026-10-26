// Shared by the browser (scoring) and Node (validation, tests). No dependencies.

export const STATUSES = {
  live: { points: 1, label: 'Live', hint: 'Generally available to ordinary people or businesses.' },
  limited: { points: 0.5, label: 'Limited', hint: 'Beta, pilot, waitlist or a small group of users.' },
  announced: { points: 0.25, label: 'Announced', hint: 'Officially announced, not usable yet.' },
  none: { points: 0, label: 'Not yet', hint: 'We searched and found no availability.' },
};

const EVIDENCE_TYPES = ['company', 'report', 'paper', 'regulation', 'news'];

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

// Score = mean over categories of (mean over capabilities of status points), times 100.
// Every category weighs the same, so a category with more capabilities does not dominate.
export function scoreCountries(meta, categories) {
  const rows = meta.countries.map((country) => {
    const byCategory = {};
    const counts = { live: 0, limited: 0, announced: 0, none: 0 };
    for (const cat of categories) {
      const points = cat.capabilities.map((cap) => {
        const status = cap.countries[country.code]?.status ?? 'none';
        counts[status]++;
        return STATUSES[status].points;
      });
      byCategory[cat.category] = Math.round(mean(points) * 100);
    }
    const score = Math.round(mean(Object.values(byCategory)));
    return { ...country, score, byCategory, counts };
  });
  rows.sort((a, b) => b.score - a.score || b.counts.live - a.counts.live || a.name.localeCompare(b.name));
  // Competition ranking: equal scores share a rank (1, 2, 2, 4).
  rows.forEach((row, i) => {
    row.rank = i > 0 && rows[i - 1].score === row.score ? rows[i - 1].rank : i + 1;
  });
  return rows;
}

// Returns a list of human-readable problems. An empty list means the data is valid.
export function validate(meta, categories) {
  const errors = [];
  const codes = new Set(meta.countries.map((c) => c.code));
  const categoryIds = new Set(meta.categories.map((c) => c.id));
  const capIds = new Set();

  for (const id of categoryIds) {
    if (!categories.some((c) => c.category === id)) errors.push(`category "${id}" has no data file`);
  }

  for (const cat of categories) {
    if (!categoryIds.has(cat.category)) errors.push(`unknown category "${cat.category}"`);
    if (!cat.capabilities?.length) errors.push(`${cat.category}: no capabilities`);

    for (const cap of cat.capabilities ?? []) {
      const where = cap.id ?? `${cat.category}.?`;
      if (!cap.id?.startsWith(`${cat.category}.`)) errors.push(`${where}: id must start with "${cat.category}."`);
      if (capIds.has(cap.id)) errors.push(`${where}: duplicate id`);
      capIds.add(cap.id);
      if (!cap.name || !cap.question) errors.push(`${where}: needs a name and a question`);

      for (const code of codes) {
        const cell = cap.countries?.[code];
        if (!cell) {
          errors.push(`${where}/${code}: missing`);
          continue;
        }
        if (!STATUSES[cell.status]) errors.push(`${where}/${code}: bad status "${cell.status}"`);
        if (!cell.note) errors.push(`${where}/${code}: needs a note`);
        if (cell.confidence !== undefined && cell.confidence !== 'low') errors.push(`${where}/${code}: confidence can only be "low"`);
        if (cell.status !== 'none' && !cell.evidence?.length) errors.push(`${where}/${code}: "${cell.status}" needs evidence`);
        for (const ev of cell.evidence ?? []) checkEvidence(ev, `${where}/${code}`, errors);
      }
      for (const code of Object.keys(cap.countries ?? {})) {
        if (!codes.has(code)) errors.push(`${where}: unknown country "${code}"`);
      }
    }
  }

  for (const cat of categories) {
    for (const co of cat.companies ?? []) {
      const where = `${cat.category}: company "${co.name}"`;
      if (!co.name || !co.role) errors.push(`${where}: needs a name and a role`);
      if (!isUrl(co.url)) errors.push(`${where}: bad url`);
      for (const m of co.markets ?? []) if (!codes.has(m)) errors.push(`${where}: unknown market "${m}"`);
      for (const c of co.capabilities ?? []) if (!capIds.has(c)) errors.push(`${where}: unknown capability "${c}"`);
    }
  }
  return errors;
}

function checkEvidence(ev, where, errors) {
  if (!ev.title) errors.push(`${where}: evidence needs a title`);
  if (!isUrl(ev.url)) errors.push(`${where}: bad evidence url "${ev.url}"`);
  if (!EVIDENCE_TYPES.includes(ev.type)) errors.push(`${where}: bad evidence type "${ev.type}"`);
  if (ev.date && !/^\d{4}(-\d{2}){0,2}$/.test(ev.date)) errors.push(`${where}: bad date "${ev.date}"`);
}

function isUrl(s) {
  try {
    return ['https:', 'http:'].includes(new URL(s).protocol);
  } catch {
    return false;
  }
}

// Letter grades for a score out of 100. The cut-offs are fixed so a grade means the same thing every release.
export const TIERS = [
  { letter: 'S', min: 80 },
  { letter: 'A', min: 70 },
  { letter: 'B', min: 60 },
  { letter: 'C', min: 50 },
  { letter: 'D', min: 0 },
];
export const tierOf = (score) => TIERS.find((t) => score >= t.min).letter;

// The same company often appears in several category files; merge it by name. Most markets first.
export function mergeCompanies(categories) {
  const map = new Map();
  for (const cat of categories) {
    for (const co of cat.companies ?? []) {
      const key = co.name.toLowerCase();
      const prev = map.get(key);
      if (!prev) map.set(key, { ...co, markets: [...new Set(co.markets)], categories: [cat.category], roles: [co.role] });
      else {
        prev.markets = [...new Set([...prev.markets, ...co.markets])];
        if (!prev.categories.includes(cat.category)) prev.categories.push(cat.category);
        if (!prev.roles.includes(co.role)) prev.roles.push(co.role);
      }
    }
  }
  return [...map.values()].sort((a, b) => b.markets.length - a.markets.length || a.name.localeCompare(b.name));
}

// Plain words per category: a short name, and what an agent does there ("an agent can ...").
export const CATEGORY_WORDS = {
  commerce: { short: 'Shopping', can: 'shop for you' },
  payments: { short: 'Payments', can: 'pay' },
  services: { short: 'Travel', can: 'book travel and local services' },
  autonomy: { short: 'General agents', can: 'use websites and apps for you' },
  banking: { short: 'Banking', can: 'move money through your bank' },
  messaging: { short: 'Chat', can: 'buy and get support in chat' },
  government: { short: 'Government', can: 'prove who you are to apps' },
};
const words = (id) => CATEGORY_WORDS[id] ?? { short: id, can: `use ${id}` };
export const shortName = (id) => words(id).short;

// A country's strongest and weakest category. On a tie the first in category order wins.
export function extremes(byCategory) {
  const ids = Object.keys(byCategory);
  return {
    best: ids.reduce((a, b) => (byCategory[b] > byCategory[a] ? b : a)),
    weak: ids.reduce((a, b) => (byCategory[b] < byCategory[a] ? b : a)),
  };
}

// One line about a country, from its category scores. 50 is the line between "can" and "cannot yet".
export function summarize(name, byCategory) {
  const { best, weak } = extremes(byCategory);
  // ponytail: "the" only for names that start with "United"; add an article field to meta.json if more need one
  const where = `In ${/^United /.test(name) ? 'the ' : ''}${name}`;
  if (byCategory[weak] >= 50) return `${where}, an agent can ${words(best).can}. Even its weakest area, ${words(weak).short.toLowerCase()}, scores ${byCategory[weak]}.`;
  if (byCategory[best] < 50) return `${where}, agents are still early. The best category, ${words(best).short.toLowerCase()}, scores ${byCategory[best]}.`;
  return `${where}, an agent can ${words(best).can}. It cannot ${words(weak).can} yet.`;
}
