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
          // A pilot, or help that leaves you the last step, is partial availability: only a Limited cell.
          else if (LIMITED_ONLY.includes(cell.gapReason) && cell.status !== 'limited') errors.push(`${where}/${code}: gapReason "${cell.gapReason}" goes only on a limited cell`);
        }
        if (cell.status !== 'none' && !cell.evidence?.length) errors.push(`${where}/${code}: "${cell.status}" needs evidence`);
        for (const ev of cell.evidence ?? []) checkEvidence(ev, `${where}/${code}`, meta.asOf, errors);
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
      for (const [c, ms] of Object.entries(co.marketsByCapability ?? {})) {
        if (!(co.capabilities ?? []).includes(c)) errors.push(`${where}: marketsByCapability names "${c}", which is not in its capabilities`);
        for (const m of ms) if (!codes.has(m) || !(co.markets ?? []).includes(m)) errors.push(`${where}: marketsByCapability "${c}" has "${m}", which is not one of its markets`);
      }
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
const LIMITED_ONLY = ['pilot-only', 'assist-only'];
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

// Dates are "YYYY-MM-DD" or "YYYY-MM", and not after the dataset's asOf. String order is date order here.
function checkEvidence(ev, where, asOf, errors) {
  if (!ev.title) errors.push(`${where}: evidence needs a title`);
  if (!isUrl(ev.url)) errors.push(`${where}: bad evidence url "${ev.url}"`);
  if (!EVIDENCE_TYPES.includes(ev.type)) errors.push(`${where}: bad evidence type "${ev.type}"`);
  if (!/^\d{4}-\d{2}(-\d{2})?$/.test(ev.date ?? '')) errors.push(`${where}: evidence date must be "YYYY-MM-DD" or "YYYY-MM", not "${ev.date ?? ''}"`);
  else if (asOf && ev.date > asOf) errors.push(`${where}: evidence date "${ev.date}" is after asOf "${asOf}"`);
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

// "the United States", "Chile": a country's name inside a sentence.
// ponytail: "the" only for names that start with "United"; add an article field to meta.json if more need one
export const placeName = (name) => `${/^United /.test(name) ? 'the ' : ''}${name}`;
export const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] ?? 'th'}`;

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
  const where = `In ${placeName(name)}`;
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
  ES: /^(Europe\/Madrid|Africa\/Ceuta|Atlantic\/Canary)$/,
  FR: /^Europe\/Paris$/,
  CA: /^America\/(Toronto|Montreal|Vancouver|Edmonton|Winnipeg|Regina|Swift_Current|Halifax|Glace_Bay|Moncton|Goose_Bay|St_Johns|Whitehorse|Dawson|Dawson_Creek|Creston|Fort_Nelson|Yellowknife|Inuvik|Cambridge_Bay|Rankin_Inlet|Resolute|Iqaluit|Atikokan|Blanc-Sablon|Nipigon|Thunder_Bay|Rainy_River|Pangnirtung)$/,
  JP: /^Asia\/Tokyo$/,
  AU: /^(Australia\/[A-Za-z_]+|Antarctica\/Macquarie)$/,
  NG: /^Africa\/Lagos$/,
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

// The page's link state: #country=MX, optionally &view=business and &errand=shop (the open errand; none means the
// first). Old #country=MX links read as the people view. A typed #country=mx reads as MX.
export function readHash(hash) {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const code = (p.get('country') ?? '').toUpperCase();
  const country = /^[A-Z]{2}$/.test(code) ? code : null;
  const errand = /^[a-z-]+$/.test(p.get('errand') ?? '') ? p.get('errand') : null;
  return { country, view: p.get('view') === 'business' ? 'business' : 'people', errand };
}
export const writeHash = (country, view, errand) => `#country=${country}${view === 'business' ? '&view=business' : ''}${errand ? `&errand=${errand}` : ''}`;

// The country a visitor starts on: the #country= hash, else their own country, else the United States.
export function startCountry(codes, hash, languages = [], timeZone = '') {
  const fromHash = readHash(hash).country;
  if (codes.includes(fromHash)) return fromHash;
  return guessCountry(codes, languages, timeZone) ?? (codes.includes('US') ? 'US' : codes[0]);
}

// "a, b or c"; a comma before the last word only when an earlier part has its own "and" or "or", so it still reads.
export const join = (xs, word) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')}${xs.slice(0, -1).some((x) => / (and|or) /.test(x)) ? ',' : ''} ${word} ${xs.at(-1)}`);

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
  const where = `In ${placeName(name)}`;
  // The labels start with a capital ("Not fully launched here yet"); inside the sentence they read lowercase.
  const why = reason ? ` Main reason: ${reason[0].toLowerCase()}${reason.slice(1)}.` : '';
  if (!cannot.length) return `${where}, AI agents can ${join(can, 'and')} today. Something works in every area, though not all of it yet.`;
  if (!can.length) return `${where}, nothing we track works for AI agents yet: they cannot ${join(cannot, 'or')}.${why}`;
  return `${where}, AI agents can ${join(can, 'and')} today, but cannot yet ${join(cannot, 'or')}.${why}`;
}

// The markets where a company works for one capability: `marketsByCapability` narrows its category-wide `markets`
// when one capability works in fewer countries (WhatsApp payments only in Brazil and India, say).
export const marketsFor = (co, capId) => co.marketsByCapability?.[capId] ?? co.markets;

// Companies that could close a gap: in the same category file, they enable this capability and work in a country
// of the same region, but not in this one. They must already work in two or more countries, so a national agency or
// a one-country bank next door is not offered as a fix. `region` maps a country code to its region.
export function couldClose(companies, capId, code, region) {
  return (companies ?? [])
    .filter((co) => (co.capabilities ?? []).includes(capId) && marketsFor(co, capId).length > 1 && !marketsFor(co, capId).includes(code))
    .map((co) => ({ ...co, near: marketsFor(co, capId).filter((m) => m !== code && region[m] === region[code]) }))
    .filter((co) => co.near.length)
    .sort((a, b) => b.near.length - a.near.length || a.name.localeCompare(b.name));
}

// "For businesses": the capabilities a business needs to sell through AI agents and get paid, in groups, each with a
// label from the seller's side. The business verdict counts these; the business errands (src/errands.js) show them.
export const BUSINESS_GROUPS = [
  { title: 'Sell through AI agents', items: [
    { id: 'commerce.merchant-protocol', label: 'AI agents can buy from your online store' },
    { id: 'commerce.in-chat-checkout', label: 'Customers buy from you inside an AI assistant' },
    { id: 'commerce.marketplace-agent', label: 'Marketplace agents buy your products for shoppers' },
  ] },
  { title: 'Sell in chat apps', items: [
    { id: 'messaging.business-ai-agent', label: 'Run an AI agent that sells and supports in chat' },
    { id: 'messaging.pay-in-chat', label: 'Take payment inside a chat' },
  ] },
  { title: 'Get paid by agents', items: [
    { id: 'payments.card-agent-token', label: 'Get paid by card when an agent buys' },
    { id: 'payments.instant-rail-agent', label: 'Get paid by instant bank transfer (Pix, UPI)' },
    { id: 'payments.wallet-agent', label: 'Get paid from a wallet or fintech app' },
  ] },
];

// The companies in a category file that work in a country for one capability, merged by name (a company can be listed
// twice), A to Z.
export function companiesFor(companies, capId, code) {
  const byName = new Map();
  for (const co of companies ?? []) {
    if ((co.capabilities ?? []).includes(capId) && marketsFor(co, capId).includes(code) && !byName.has(co.name.toLowerCase())) byName.set(co.name.toLowerCase(), co);
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// One country's cells, as { cap: { ...capability, category }, cell } pairs (the way app.js and countries.js list them).
// liveBy: the live cells in each category. gapCounts: how many cells that are not live have each gap reason, most
// first, as [[reason id, n], ...]; catIds limits it to some categories, and cells with no reason are left out.
export function liveBy(mine) {
  const n = {};
  for (const { cap, cell } of mine) n[cap.category] = (n[cap.category] ?? 0) + (cell.status === 'live' ? 1 : 0);
  return n;
}
export function gapCounts(mine, catIds) {
  const n = {};
  for (const { cap, cell } of mine) {
    if (cell.status !== 'live' && cell.gapReason && (!catIds || catIds.includes(cap.category))) n[cell.gapReason] = (n[cell.gapReason] ?? 0) + 1;
  }
  return Object.entries(n).sort((a, b) => b[1] - a[1]);
}

// The label of a gap reason id (meta.gapReasons); nothing for a cell with no reason recorded yet.
export const gapLabel = (meta, id) => meta.gapReasons?.find((g) => g.id === id)?.label;
// The most common gap reason label among some categories' cells, or nothing (the verdict's "Main reason").
export const mainReason = (meta, mine, catIds) => gapLabel(meta, gapCounts(mine, catIds)[0]?.[0]);
// The other countries with the same score, and how many sources back some cells (a source counts once).
export const tiedWith = (ranking, r) => ranking.filter((x) => x.score === r.score && x.code !== r.code);
export const sourcesOf = (cells) => new Set(cells.flatMap(({ cell }) => (cell.evidence ?? []).map((e) => e.url))).size;

// Themes group the twelve categories into four, so a country fits in a small table beside its neighbours.
// A theme scores the mean of its categories' scores. The country score never uses themes.
export const THEMES = [
  { id: 'shop-pay', name: 'Shop and pay', categories: ['commerce', 'payments', 'messaging'] },
  { id: 'get-done', name: 'Get things done', categories: ['services', 'autonomy', 'health', 'work', 'insurance'] },
  { id: 'money-id', name: 'Money and ID', categories: ['banking', 'government'] },
  { id: 'ground-rules', name: 'Ground rules', categories: ['access', 'rules'] },
];
export const themeScores = (byCategory) => THEMES.map((t) => ({ ...t, score: Math.round(mean(t.categories.map((id) => byCategory[id]))) }));

// THEMES lives in code, not in meta.json, so a new category must be added to it by hand. Run by the tests and
// npm run validate: every category sits in exactly one theme, and every theme names known categories.
export function checkThemes(categoryIds) {
  const listed = THEMES.flatMap((t) => t.categories);
  const errors = [];
  for (const id of categoryIds) {
    const n = listed.filter((x) => x === id).length;
    if (n === 0) errors.push(`category "${id}" is in no theme: add it to one theme in THEMES in src/observatory.js`);
    if (n > 1) errors.push(`category "${id}" is in ${n} themes: keep it in one theme in THEMES in src/observatory.js`);
  }
  for (const id of new Set(listed)) if (!categoryIds.includes(id)) errors.push(`THEMES in src/observatory.js names an unknown category "${id}"`);
  return errors;
}

// "Compared with its region": the other tracked countries in its region (best first), and one country to measure
// against: the leader, or the next best when this country has the top score (a tie at the top leads too). ref is
// null when only one country is tracked. `line` says where it sits in one plain sentence. ranking comes from
// scoreCountries, with each country's region.
export function regionCompare(ranking, code) {
  const me = ranking.find((r) => r.code === code);
  const peers = ranking.filter((r) => r.region === me.region && r.code !== code);
  const leads = me.score === ranking[0].score;
  const ref = (leads ? ranking.find((r) => r.code !== code) : ranking[0]) ?? null;
  const refLabel = leads ? 'next best' : 'leader';
  const name = (r) => placeName(r.name);
  const lower = (s) => s[0].toLowerCase() + s.slice(1);
  let line;
  if (!peers.length) {
    line = ref
      ? `${name(me)} is the only country we track in ${me.region}, so it sits beside the ${refLabel}, ${name(ref)}, and the average of all ${ranking.length}.`
      : `${name(me)} is the only country we track so far.`;
  } else {
    const pos = 1 + peers.filter((p) => p.score > me.score).length;
    const tied = peers.filter((p) => p.score === me.score);
    // Per theme: this country's score and the best of its neighbours.
    const themes = themeScores(me.byCategory).map((t, i) => ({ t, best: peers.map((p) => ({ p, s: themeScores(p.byCategory)[i].score })).sort((a, b) => b.s - a.s)[0] }));
    const ahead = themes.filter(({ t, best }) => t.score > best.s).map(({ t }) => lower(t.name));
    const behind = themes.filter(({ t, best }) => t.score < best.s).sort((a, b) => (b.best.s - b.t.score) - (a.best.s - a.t.score))[0];
    line = `${name(me)} is ${ordinal(pos)} of ${peers.length + 1} in ${me.region}${tied.length ? `, tied with ${join(tied.map(name), 'and')}` : ''}.`;
    if (ahead.length) line += ` It leads the region in ${ahead.length === THEMES.length ? 'every theme' : join(ahead, 'and')}.`;
    if (behind) line += ` It is furthest behind in ${lower(behind.t.name)}: ${behind.t.score}, against ${behind.best.s} in ${name(behind.best.p)}.`;
  }
  return { peers, ref, refLabel, line: line[0].toUpperCase() + line.slice(1) };
}
