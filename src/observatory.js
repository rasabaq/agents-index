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
  const gapReasons = new Set((meta.gapReasons ?? []).map((r) => r.id));
  for (const r of meta.gapReasons ?? []) if (!r.id || !r.label) errors.push(`meta: every gap reason needs an id and a label`);

  for (const c of meta.categories) {
    if (!categories.some((cat) => cat.category === c.id)) errors.push(`category "${c.id}" has no data file`);
    // The site writes sentences from these words ("agents can <can>"), so every category needs them.
    if (typeof c.short !== 'string' || !c.short.trim() || typeof c.can !== 'string' || !c.can.trim()) {
      errors.push(`category "${c.id}" needs "short" and "can" in meta.json, for example "short": "Health", "can": "book care for you"`);
    }
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
        // Why a cell is not live yet: one of the ids in meta.gapReasons, never on a live cell.
        if (cell.gapReason !== undefined) {
          if (!gapReasons.has(cell.gapReason)) errors.push(`${where}/${code}: unknown gapReason "${cell.gapReason}"`);
          if (cell.status === 'live') errors.push(`${where}/${code}: a live cell has no gapReason`);
        }
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
      if (!isUrl(co.homepage)) errors.push(`${where}: needs a homepage (its own site, used for its logo)`);
      if (co.icon === undefined) errors.push(`${where}: no icon yet; run npm run refresh-sites`);
      else if (co.icon !== null && !/^https:\/\//.test(co.icon)) errors.push(`${where}: icon must be an https URL, or null when the site has none`);
      for (const m of co.markets ?? []) if (!codes.has(m)) errors.push(`${where}: unknown market "${m}"`);
      for (const c of co.capabilities ?? []) if (!capIds.has(c)) errors.push(`${where}: unknown capability "${c}"`);
    }
  }

  const repoIds = new Set();
  for (const cat of categories) {
    for (const r of cat.repos ?? []) {
      const where = `${cat.category}: repo "${r.repo}"`;
      if (!/^[\w.-]+\/[\w.-]+$/.test(r.repo ?? '')) errors.push(`${where}: repo must be "owner/name"`);
      if (repoIds.has(r.repo?.toLowerCase())) errors.push(`${where}: listed twice; keep it in one file`);
      repoIds.add(r.repo?.toLowerCase());
      if (!r.name || !r.role) errors.push(`${where}: needs a name and a role`);
      if (!r.capabilities?.length) errors.push(`${where}: needs at least one capability`);
      for (const c of r.capabilities ?? []) if (!capIds.has(c)) errors.push(`${where}: unknown capability "${c}"`);
      for (const p of r.packages ?? []) if (!REGISTRIES.includes(p.registry) || !p.name) errors.push(`${where}: package needs a name and a registry (${REGISTRIES.join(', ')})`);
      for (const i of r.images ?? []) if (!/^[\w.-]+\/[\w.-]+$/.test(i)) errors.push(`${where}: Docker Hub image must be "namespace/name"`);
      if (r.origin !== undefined && !/^[A-Z]{2}$/.test(r.origin)) errors.push(`${where}: origin must be an ISO country code`);
      const u = r.usage;
      if (!u) errors.push(`${where}: no usage yet; run npm run refresh-repos`);
      else if (!isDate(u.asOf) || !isDate(u.pushedAt) || !Number.isInteger(u.stars)) errors.push(`${where}: usage needs asOf, pushedAt and stars`);
    }
  }
  return errors;
}

const REGISTRIES = ['npm', 'pypi', 'packagist'];
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s ?? '');

// How much an open-source repo is really used: counted installs, not stars. Stars measure attention.
// Downloads are per month, from its busiest npm, PyPI or Packagist package. Docker pulls are lifetime, so their bar is higher.
// Key order is the display order.
export const REPO_USE = {
  wide: { label: 'Widely used', hint: '1M+ installs a month, or 100M+ Docker pulls.' },
  real: { label: 'In real use', hint: '50k+ installs a month, or 1M+ Docker pulls.' },
  unmeasured: { label: 'Not measured', hint: 'Ships no npm, PyPI, Packagist or Docker Hub package we can count.' },
  buzz: { label: 'Mostly stars', hint: '5k+ stars, but few installs.' },
  niche: { label: 'Niche', hint: 'Few stars and few installs.' },
  dormant: { label: 'Dormant', hint: 'Archived, or no commit in the 6 months before it was measured.' },
};

export function repoUse(u) {
  if (u.archived || Date.parse(u.asOf) - Date.parse(u.pushedAt) > 182 * 864e5) return 'dormant';
  const dl = u.downloadsMonth ?? 0;
  const pulls = u.dockerPulls ?? 0;
  if (dl >= 1e6 || pulls >= 1e8) return 'wide';
  if (dl >= 5e4 || pulls >= 1e6) return 'real';
  if (u.downloadsMonth == null && u.dockerPulls == null) return 'unmeasured';
  return u.stars >= 5000 ? 'buzz' : 'niche';
}

// Every repo across the category files, most-used first: by tier, then installs, then stars.
export function rankRepos(categories) {
  const order = Object.keys(REPO_USE);
  return categories
    .flatMap((cat) => (cat.repos ?? []).map((r) => ({ ...r, category: cat.category, use: repoUse(r.usage) })))
    .sort((a, b) => order.indexOf(a.use) - order.indexOf(b.use)
      || (b.usage.downloadsMonth ?? 0) - (a.usage.downloadsMonth ?? 0)
      || b.usage.stars - a.usage.stars);
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
// `markets` is the union; `marketsBy` keeps each category's own markets, since a company can be live for one
// capability in a country and not for another.
export function mergeCompanies(categories) {
  const map = new Map();
  for (const cat of categories) {
    for (const co of cat.companies ?? []) {
      const key = co.name.toLowerCase();
      const prev = map.get(key);
      if (!prev) map.set(key, { ...co, markets: [...new Set(co.markets)], categories: [cat.category], roles: [co.role], marketsBy: { [cat.category]: [...new Set(co.markets)] } });
      else {
        prev.markets = [...new Set([...prev.markets, ...co.markets])];
        prev.marketsBy[cat.category] = [...new Set([...(prev.marketsBy[cat.category] ?? []), ...co.markets])];
        if (!prev.categories.includes(cat.category)) prev.categories.push(cat.category);
        if (!prev.roles.includes(co.role)) prev.roles.push(co.role);
      }
    }
  }
  return [...map.values()].sort((a, b) => b.markets.length - a.markets.length || a.name.localeCompare(b.name));
}

// Plain words per category, from data/meta.json: "short" (a one- or two-word label) and "can" (what an agent does
// there: "AI agents can <can>"). Load them with useCategoryWords(meta.categories) before writing sentences.
// Validation requires both on every category, so a new category never shows placeholder text.
export const CATEGORY_WORDS = {};
const words = (id) => CATEGORY_WORDS[id] ?? { short: id, can: `use ${id}` };
export function useCategoryWords(metaCategories) {
  for (const c of metaCategories) if (c.short && c.can) CATEGORY_WORDS[c.id] = { short: c.short, can: c.can };
}
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

// Time zones of the tracked countries, so a visitor in Santiago with an English browser still starts on Chile.
// The US is left out on purpose: it is the default anyway.
const ZONES = {
  CL: /^(America\/(Santiago|Punta_Arenas)|Pacific\/Easter)$/,
  CO: /^America\/Bogota$/,
  MX: /^America\/(Mexico_City|Cancun|Merida|Monterrey|Matamoros|Chihuahua|Ciudad_Juarez|Ojinaga|Mazatlan|Bahia_Banderas|Hermosillo|Tijuana)$/,
  BR: /^America\/(Sao_Paulo|Bahia|Fortaleza|Recife|Maceio|Belem|Araguaina|Santarem|Manaus|Cuiaba|Campo_Grande|Porto_Velho|Boa_Vista|Rio_Branco|Eirunepe|Noronha)$/,
  IN: /^Asia\/(Kolkata|Calcutta)$/,
  GB: /^Europe\/London$/,
  DE: /^Europe\/(Berlin|Busingen)$/,
};

// The visitor's own country, if we can tell: their time zone first, then the region of their browser languages
// (es-CL → CL). null when neither names a tracked country.
export function guessCountry(codes, languages = [], timeZone = '') {
  const byZone = Object.keys(ZONES).find((code) => ZONES[code].test(timeZone));
  if (codes.includes(byZone)) return byZone;
  for (const lang of languages) {
    const region = lang.match(/-([A-Za-z]{2})\b/)?.[1]?.toUpperCase();
    if (codes.includes(region)) return region;
  }
  return null;
}

// The country a visitor starts on: the #country= hash, else their own country, else the United States.
export function startCountry(codes, hash, languages = [], timeZone = '') {
  const fromHash = hash.match(/^#country=(\w\w)$/)?.[1];
  if (codes.includes(fromHash)) return fromHash;
  return guessCountry(codes, languages, timeZone) ?? (codes.includes('US') ? 'US' : codes[0]);
}

// "a, b or c"; a comma before the last word only when an earlier part has its own "and" or "or", so it still reads.
const join = (xs, word) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')}${xs.slice(0, -1).some((x) => / (and|or) /.test(x)) ? ',' : ''} ${word} ${xs.at(-1)}`);

// The verdict at the top of a country. It agrees with the Works today and Not yet lists: "can" names up to two
// categories with at least one live cell (highest score first), "cannot yet" up to two with none (lowest first).
// liveBy maps a category id to its number of live cells. reasonFor(categoryIds) returns the most common gap reason
// label among those categories' cells, or nothing, so the reason always belongs to the gaps the sentence names.
export function verdict(name, byCategory, liveBy, reasonFor = () => null) {
  const ids = Object.keys(byCategory);
  const can = ids.filter((id) => liveBy[id] > 0).sort((a, b) => byCategory[b] - byCategory[a]).slice(0, 2).map((id) => words(id).can);
  const cannotIds = ids.filter((id) => !liveBy[id]).sort((a, b) => byCategory[a] - byCategory[b]).slice(0, 2);
  const cannot = cannotIds.map((id) => words(id).can);
  const reason = cannotIds.length ? reasonFor(cannotIds) : null;
  const where = `In ${/^United /.test(name) ? 'the ' : ''}${name}`;
  const why = reason ? ` Main reason: ${reason}.` : '';
  if (!cannot.length) return `${where}, AI agents can ${join(can, 'and')} today. Something works in every area, though not all of it yet.`;
  if (!can.length) return `${where}, nothing we track works for AI agents yet: they cannot ${join(cannot, 'or')}.${why}`;
  return `${where}, AI agents can ${join(can, 'and')} today, but cannot yet ${join(cannot, 'or')}.${why}`;
}

// Companies that could close a gap: in the same category file, they enable this capability and work in a country
// of the same region, but not in this one. They must already work in two or more countries, so a national agency or
// a one-country bank next door is not offered as a fix. `region` maps a country code to its region.
export function couldClose(companies, capId, code, region) {
  return (companies ?? [])
    .filter((co) => (co.capabilities ?? []).includes(capId) && co.markets.length > 1 && !co.markets.includes(code))
    .map((co) => ({ ...co, near: co.markets.filter((m) => m !== code && region[m] === region[code]) }))
    .filter((co) => co.near.length)
    .sort((a, b) => b.near.length - a.near.length || a.name.localeCompare(b.name));
}
