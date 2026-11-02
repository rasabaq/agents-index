import { STATUSES, scoreCountries, mergeCompanies, shortName, useCategoryWords, startCountry, guessCountry, verdict, couldClose, companiesFor, BUSINESS_GROUPS, readHash, writeHash } from './src/observatory.js';
import { ERRANDS, BUSINESS_ERRANDS, errandIn, findStep } from './src/errands.js';
import { pix } from './src/icons.js';
import { mosaic, fingerprint } from './overview.js';
import { data } from './data.js';
import { $, esc, flag, logo, wireLogos, wireNav } from './ui.js';

const fmtDate = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// errand: the open errand's id; null opens the view's first one.
const state = { view: 'people', country: null, errand: null };
const scrollBehavior = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
let meta, categories, ranking, byCode, capIndex, companies, cells, region;

function init() {
  useCategoryWords(meta.categories);
  ranking = scoreCountries(meta, categories);
  byCode = Object.fromEntries(ranking.map((r) => [r.code, r]));
  capIndex = Object.fromEntries(categories.flatMap((cat) => cat.capabilities.map((cap) => [cap.id, { ...cap, category: cat.category }])));
  // Every cell with its capability and country, in category order.
  cells = Object.values(capIndex).flatMap((cap) => meta.countries.map((c) => ({ cap, code: c.code, cell: cap.countries[c.code] })));
  companies = mergeCompanies(categories);
  region = Object.fromEntries(meta.countries.map((c) => [c.code, c.region]));
  const codes = meta.countries.map((c) => c.code);
  state.view = readHash(location.hash).view;
  state.errand = pickErrand(readHash(location.hash).errand);
  state.country = startCountry(codes, location.hash, navigator.languages ?? [navigator.language], Intl.DateTimeFormat().resolvedOptions().timeZone);
  // The visitor's own country, when time zone or language tells us; the head says "Your country" only for it.
  state.own = guessCountry(codes, navigator.languages ?? [navigator.language], Intl.DateTimeFormat().resolvedOptions().timeZone);

  document.querySelectorAll('[data-asof]').forEach((el) => (el.textContent = fmtDate(meta.asOf)));
  $('[data-asof-iso]').textContent = meta.asOf;
  renderPicker();
  renderLegend();
  renderCounts();
  renderCountry();
  wire();
  wireNav();
  wireTooltip();
  wireLogos();
}

const hashCountry = () => {
  const code = readHash(location.hash).country;
  return byCode[code] ? code : null;
};
const catName = (id) => meta.categories.find((c) => c.id === id).name;
const chip = (status, low) => `<span class="chip s-${status}${low ? ' q' : ''}">${STATUSES[status].label}</span>`;
// A small status mark for the matrix: a dot, half dot, ring or dash; a "?" after it means low confidence.
const dot = (cell) => `<i class="dot d-${cell.status}${cell.confidence ? ' q' : ''}" aria-hidden="true"></i>`;
const cellLabel = (cap, code, cell) => `${cap.name} in ${byCode[code].name}: ${STATUSES[cell.status].label}${cell.confidence ? ', unsure' : ''}`;
const sourcesOf = (list) => new Set(list.flatMap(({ cell }) => (cell.evidence ?? []).map((e) => e.url))).size;
const tiedWith = (r) => ranking.filter((x) => x.score === r.score && x.code !== r.code);
// "the United States", "Chile": a country's name inside a sentence.
const where = (r) => `${/^United /.test(r.name) ? 'the ' : ''}${r.name}`;
const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] ?? 'th'}`;
// Gap reasons: the label for an id, and the most common one among a country's cells in some categories.
// Cells may not have one yet.
const gapLabel = (id) => meta.gapReasons?.find((g) => g.id === id)?.label;
// "For businesses": can a business sell through AI agents here? Counts the ways in BUSINESS_GROUPS.
function businessVerdict(r) {
  const items = BUSINESS_GROUPS.flatMap((g) => g.items).filter(({ id }) => capIndex[id]).map(({ id }) => capIndex[id].countries[r.code]);
  const live = items.filter((cell) => cell.status === 'live');
  if (!live.length) return `In ${where(r)}, a business cannot yet sell through AI agents: none of the ${items.length} ways we track works here today.`;
  return `In ${where(r)}, ${live.length === items.length ? 'every one' : `${live.length}`} of the ${items.length} ways we track for a business to sell through AI agents and get paid ${live.length === 1 ? 'works' : 'work'} today.`;
}

// Live cells per category, for the verdict: a category with one live cell is something agents "can" do.
const liveBy = (mine) => Object.fromEntries(meta.categories.map((c) => [c.id, mine.filter((x) => x.cap.category === c.id && x.cell.status === 'live').length]));
function mainReason(mine, catIds) {
  const n = {};
  for (const { cap, cell } of mine) if (catIds.includes(cap.category) && cell.status !== 'live' && gapLabel(cell.gapReason)) n[cell.gapReason] = (n[cell.gapReason] ?? 0) + 1;
  const top = Object.keys(n).sort((a, b) => n[b] - n[a])[0];
  return top && gapLabel(top);
}
const pick = (r) => `aria-current="${r.code === state.country}" aria-label="${esc(r.name)}, rank ${r.rank}, score ${r.score}"`;

// The country picker: every country with its score, best first. It is the ranking too (the hero's "Open the ranking").
function renderPicker() {
  $('[data-clist]').innerHTML = ranking.map((r) => `
    <button type="button" data-go-country="${r.code}" ${pick(r)}>${flag(r.code)}<span>${r.code}</span><span class="rk-v">${r.score}</span></button>`).join('');
}

function renderLegend() {
  $('[data-legend]').innerHTML = Object.entries(STATUSES).map(([k, s]) => `<span>${dot({ status: k })}${s.label}</span>`).join('')
    + `<span>${dot({ status: 'live', confidence: 'low' })}Unsure (thin sources)</span>`;
}

// The selected country: its head, then its errands, for people or for businesses.
function renderCountry() {
  const r = byCode[state.country];
  const mine = cells.filter((x) => x.code === r.code);
  const ties = tiedWith(r);
  const i = ranking.indexOf(r);
  const other = ties[0] ?? ranking[i + 1] ?? ranking[i - 1];
  const nSources = sourcesOf(mine);
  const low = mine.filter((x) => x.cell.confidence).length;
  const total = mine.length;
  const works = mine.filter((x) => x.cell.status === 'live');

  $('[data-country]').innerHTML = `
    <div>
      <p class="label">${r.code === state.own ? 'Your country' : 'Country'} · ${ranking.length} countries tracked so far</p>
      <h2 id="cn-title" tabindex="-1">${flag(r.code)}${esc(r.name)}</h2>
      <p class="cn-score"><b>${works.length} of ${total}</b> things work today · score ${r.score} of 100 · ${ordinal(r.rank)} of ${ranking.length}${ties.length ? ', tied' : ''}${low ? ` · ${low} unsure, marked ?` : ''}</p>
      <p class="cn-lede cn-verdict">${esc(state.view === 'business' ? businessVerdict(r) : verdict(r.name, r.byCategory, liveBy(mine), (ids) => mainReason(mine, ids)))}</p>
      <div class="cn-view" role="group" aria-label="Show the country for">${[['people', 'For people'], ['business', 'For businesses']].map(([v, l]) => `<button type="button" class="pill" data-view="${v}" aria-pressed="${state.view === v}">${l}</button>`).join('')}</div>
    </div>
    <span data-fingerprint></span>
    <div class="cn-r">
      <button type="button" class="btn btn-sm" data-compare="${r.code} ${other.code}">Compare with ${flag(other.code)}${other.code}</button>
      <button type="button" class="btn btn-sm" data-sources>${nSources} sources</button>
    </div>`;

  $('[data-kpis]').innerHTML = renderErrands(r);
  renderCountryRest();
}

// "A day with an agent": the view's errands as cards, then the open one as a chain of steps, then that errand in
// every country. A step the agent does is Live, one it helps with is Limited; you do the rest (src/errands.js).
const errandList = () => (state.view === 'business' ? BUSINESS_ERRANDS : ERRANDS);
const pickErrand = (id) => (errandList().some((e) => e.id === id) ? id : null);
const openErrand = () => errandList().find((e) => e.id === state.errand) ?? errandList()[0];
const ROLE = { does: 'Agent does it', helps: 'Agent helps, you finish', you: 'You do it' };
const meter = (run) => `<span class="meter" aria-hidden="true">${run.steps.map((s) => `<i class="s-${s.best.cell.status}"></i>`).join('')}</span>`;
const countWords = (run) => `${run.does} of ${run.steps.length} steps by the agent${run.helps ? `, ${run.helps} with its help` : ''}, ${run.you} by you`;
// The agent at the start of every chain wears the site's mark, taken from the nav.
const AGENT = $('.brand svg').outerHTML;
const DOWN = '<svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v10M4 8l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// One soft line on the open errand: what the agent does alone, where it helps, and what is left to you.
function headline(run, r) {
  const { does: a, helps: h, you: y } = run, n = run.steps.length;
  const p = `In ${esc(where(r))}, `;
  const rest = y ? ` You do ${y === 1 ? 'the other one' : `the other ${y}`} yourself.` : '';
  if (a === n) return `${p}an agent can do the <b>whole errand</b>: all ${n} steps.`;
  if (a + h === 0) return `${p}you still do <b>all ${n} steps</b> yourself. No step works with an agent yet.`;
  if (!h) return `${p}an agent does <b>${a} of the ${n} steps</b> on its own.${rest}`;
  if (!a) return `${p}an agent <b>helps with ${h} of the ${n} steps</b>, but you finish ${h === 1 ? 'it' : 'each one'}.${rest}`;
  return `${p}an agent does <b>${a} of the ${n} steps</b> on its own and <b>helps with ${h} more</b>, which you finish.${rest}`;
}

function renderErrands(r) {
  const list = errandList(), open = openErrand();
  const run = errandIn(open, capIndex, r.code), n = run.steps.length;
  const cards = list.map((e) => {
    const t = errandIn(e, capIndex, r.code), m = t.steps.length;
    return `<li><button type="button" class="card ecard" data-errand="${e.id}" aria-pressed="${e === open}" aria-controls="errand" aria-label="${esc(`${e.title}: ${countWords(t)}`)}">
      ${pix(e.icon, 36, t.points / m)}<span class="ec-name">${esc(e.title)}</span>${meter(t)}<span class="ec-count">${t.does === m ? `<b>All ${m}</b>` : `<b>${t.does}</b> of ${m}`} by the agent${t.helps ? ` · ${t.helps} with help` : ''}</span></button></li>`;
  }).join('');
  // Each way is a button to the cell detail. "You take over here" marks only the first step left to you.
  const node = (w, i, fork, take) => {
    const why = w.role === 'does' ? '' : gapLabel(w.cell.gapReason) ?? 'No reason recorded';
    return `<button type="button" class="ch-node r-${w.role}${take ? ' takeover' : ''}" data-cap="${w.id}" data-code="${r.code}" aria-label="${esc(`Step ${i + 1}: ${w.label}. ${STATUSES[w.cell.status].label}${w.cell.confidence ? ', unsure' : ''}. ${ROLE[w.role]}.${why ? ` ${why}.` : ''}${take ? ' You take over here.' : ''}`)}">
      ${fork ? '' : `<span class="label">Step ${i + 1}</span>`}<span class="node-name">${esc(w.label)}</span><span class="node-cap">${esc(w.cap.name)}</span>
      <span class="node-st">${chip(w.cell.status, w.cell.confidence)}<span class="node-role">${ROLE[w.role]}</span></span>${why ? `<span class="node-why">${esc(why)}</span>` : ''}</button>`;
  };
  const chain = run.steps.map((s, i) => {
    const take = i === run.handoff;
    const body = s.ways.length > 1
      ? `<div class="ch-fork" role="group" aria-label="Step ${i + 1}: either way works"><p class="label">Step ${i + 1} · Either way</p>
        ${s.ways.map((w) => node(w, i, true, take)).join('<p class="fork-or" aria-hidden="true">or</p>')}</div>`
      : node(s.ways[0], i, false, take);
    return `<li class="ch-link l-${s.role}${take ? ' cut' : ''}" aria-hidden="true"></li><li class="ch-step"><p class="ch-over">${take ? `${DOWN}You take over here` : ''}</p>${body}</li>`;
  }).join('');
  // Country by country: most steps done by the agent first, then most help; ties keep the ranking order.
  const order = ranking.map((x) => ({ x, t: errandIn(open, capIndex, x.code) })).sort((a, b) => b.t.does - a.t.does || b.t.points - a.t.points);
  const whole = order.filter(({ t }) => t.does === n);
  return `
    <p class="ekey"><span>${chip('live')}${ROLE.does}</span><span>${chip('limited')}${ROLE.helps}</span><span>${chip('announced')}${chip('none')}${ROLE.you}</span>
      <span>${dot({ status: 'live', confidence: 'low' })}Unsure (thin sources)</span><span><i class="brk" aria-hidden="true"></i>You take over here</span></p>
    <ul class="ecards" aria-label="Errands">${cards}</ul>
    <section class="card errand" id="errand" aria-labelledby="eh-title">
      <header class="eh">${pix(open.icon, 48, run.points / n)}<div>
        <p class="label">${state.view === 'business' ? 'Business errand' : 'Errand'} ${list.indexOf(open) + 1} of ${list.length} · ${flag(r.code)}${esc(r.name)}</p>
        <h3 id="eh-title" tabindex="-1">${esc(open.title)}</h3>
        <p class="eh-line">${headline(run, r)}</p></div></header>
      <ol class="chain" aria-label="Steps of ${esc(open.title)}"><li class="ch-start" aria-hidden="true"><span class="ag">${AGENT}</span><span class="label">Agent</span></li>${chain}</ol>
      <div class="xc">
        <div class="xc-h"><p class="label">${esc(open.title)} · country by country</p>
          <p>${whole.length ? `The whole errand works in ${whole.map(({ x }) => `${flag(x.code)}${x.code}`).join(' ')}.` : 'No country can do the whole errand yet.'}</p></div>
        <ul>${order.map(({ x, t }) => `<li><button type="button"${t.does === n ? ' class="whole"' : ''} data-go-country="${x.code}" aria-current="${x.code === r.code}" aria-label="${esc(`${x.name}: ${countWords(t)}`)}">
          <span>${flag(x.code)}${x.code}</span><span class="xc-n">${t.does}/${n}</span>${meter(t)}</button></li>`).join('')}</ul>
      </div>
    </section>
    <div class="ov" data-overview></div>`;
}

// Everything below the country's cards: the same for people and for businesses.
function renderCountryRest() {
  // The fingerprint beside the head, and every capability as a square under the errands.
  const code = state.country;
  const errandOf = Object.fromEntries(errandList().flatMap((e) => e.steps.flat().map((id) => [id, e.title])));
  $('[data-fingerprint]').innerHTML = fingerprint({ meta, capIndex, code, score: byCode[code].score });
  $('[data-overview]').outerHTML = mosaic({ meta, capIndex, code, gapLabel, errandOf, openErrand: openErrand().steps.flat() });
  renderMatrix();
  renderBuilders();
}

// Who builds it: the companies live in the selected country, split by where they are based, and the best known of them.
function renderBuilders() {
  const r = byCode[state.country];
  const here = companies.filter((c) => c.markets.includes(r.code));
  const place = where(r);
  const parts = [
    ['us', 'Based in the US', here.filter((c) => c.hq === 'US' && r.code !== 'US')],
    ['home', `Based in ${place}`, here.filter((c) => c.hq === r.code)],
    ['rest', 'Based elsewhere', here.filter((c) => c.hq !== r.code && c.hq !== 'US')],
  ].filter(([, , list]) => list.length);
  const home = here.filter((c) => c.hq === r.code).length;
  // Companies in the most categories first: they are the ones a visitor is most likely to know.
  const top = [...here].sort((a, b) => b.categories.length - a.categories.length || a.name.localeCompare(b.name)).slice(0, 6);
  $('[data-who-title]').innerHTML = `Who makes it work in ${flag(r.code)}${esc(place)}.`;
  $('[data-who]').innerHTML = here.length ? `
    <div class="who-l">
      <p class="who-lede">${here.length} ${here.length === 1 ? 'company makes' : 'companies make'} agents work here. ${home ? `${home} ${home === 1 ? 'is' : 'are'} based in ${esc(place)}.` : `None is based in ${esc(place)} yet.`}</p>
      <div class="who-bar" role="img" aria-label="${esc(parts.map(([, label, list]) => `${label}: ${list.length}`).join(', '))}">${parts.map(([k, , list]) => `<i class="w-${k}" style="flex:${list.length}">${list.length}</i>`).join('')}</div>
      <p class="who-key" aria-hidden="true">${parts.map(([k, label]) => `<span class="w-${k}">${esc(label)}</span>`).join('')}</p>
    </div>
    <div class="who-r">
      <ul class="who-cos">${top.map((c) => `<li><a class="co-name" href="${esc(c.homepage ?? c.url)}" target="_blank" rel="noopener noreferrer">${logo(c.icon, c.name)}<span>${esc(c.name)}</span></a></li>`).join('')}${here.length > top.length ? `<li><a class="who-more" href="companies.html#market=${r.code}">+${here.length - top.length} more</a></li>` : ''}</ul>
      <p class="who-links"><a href="companies.html">All ${companies.length} companies <span aria-hidden="true">→</span></a><a href="companies.html#opensource">Open-source tools <span aria-hidden="true">→</span></a></p>
    </div>` : `<p class="mc-note">No company we track makes agents work in ${esc(place)} yet. <a href="companies.html">See all ${companies.length} companies</a>.</p>`;
}

// All capabilities in rows, grouped by category; one column per country, the selected one in sunrise.
function renderMatrix() {
  const cols = meta.countries.map((c) => c.code);
  const sel = (code) => (code === state.country ? ' class="sel"' : '');
  const head = `<div class="mx-row mx-head" role="row"><span role="columnheader">Capability</span>${cols.map((c) => `<span role="columnheader"${sel(c)}>${flag(c)}${c}</span>`).join('')}</div>`;
  $('[data-matrix]').innerHTML = head + categories.map((cat) => `
    <div class="mx-row mx-cat" role="row"><span role="rowheader" title="${esc(catName(cat.category))}">${esc(shortName(cat.category))}</span>${cols.map((c) => `<span role="cell"${sel(c)}></span>`).join('')}</div>
    ${cat.capabilities.map((cap) => `
      <div class="mx-row" role="row"><span class="mx-cap" role="rowheader">${esc(cap.name)}</span>${cols.map((c) => `<span role="cell"${sel(c)}><button type="button" data-cap="${cap.id}" data-code="${c}" aria-label="${esc(cellLabel(cap, c, cap.countries[c]))}">${dot(cap.countries[c])}</button></span>`).join('')}</div>`).join('')}`).join('');
  $('[data-mx-count]').textContent = `${cells.length} checks`;
}

function correctionUrl(cap, code, cell) {
  // Fills the data-correction issue form (.github/ISSUE_TEMPLATE/data-correction.yml); the keys are its field ids.
  const q = new URLSearchParams({
    template: 'data-correction.yml',
    title: `Correction: ${cap.id} in ${code}`,
    country: `${byCode[code].name} (${code})`,
    capability: `${cap.name} (${cap.id})`,
    current: STATUSES[cell.status].label,
  });
  return `https://github.com/rasabaq/agents-index/issues/new?${q}`;
}

const sourceList = (ev) => `<ol class="sources">${ev.map((e) => `
  <li><a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(e.title)}</a>
    <span class="src-meta"><span class="tag">${esc(e.type)}</span>${esc(e.publisher ?? '')}${e.date ? ` · ${esc(e.date)}` : ''}${e.caps ? ` · ${esc(e.caps.join(', '))}` : ''}</span></li>`).join('')}</ol>`;

function showDetail(html) {
  $('[data-detail-body]').innerHTML = html;
  $('[data-tip]').hidden = true;
  $('[data-detail]').showModal();
}

function openDetail(capId, code) {
  const cap = capIndex[capId];
  const cell = cap.countries[code];
  const ev = cell.evidence ?? [];
  const catCos = categories.find((c) => c.category === cap.category).companies;
  // Companies already live nearby that could bring a missing capability here.
  const cos = cell.status === 'live' ? [] : couldClose(catCos, cap.id, code, region).slice(0, 3);
  // Who to sign up with. Not on a Not yet cell: a company's markets cover its whole category, so it could name one
  // that does not offer this capability here.
  const here = cell.status === 'none' ? [] : companiesFor(catCos, cap.id, code);
  const at = findStep(errandList(), capId);
  const liveIn = ranking.map((x) => x.code).filter((c) => c !== code && cap.countries[c].status === 'live');
  showDetail(`
    <p class="kicker">${esc(catName(cap.category))} · ${flag(code)}${esc(byCode[code].name)}</p>
    <h3 id="detail-title">${esc(cap.question)}</h3>
    <p class="detail-status">${chip(cell.status, cell.confidence)}${cell.confidence ? '<span class="low-note">Unsure. The sources are thin or indirect, so treat this as a lead to check.</span>' : ''}</p>
    <p>${esc(cell.note)}</p>
    <div class="d-facts">
      ${at ? `<p>In <b>${esc(at.errand.title)}</b>, step ${at.index + 1}: “${esc(at.errand.labels[capId])}”.</p>` : ''}
      <p>${liveIn.length ? `Live in: ${liveIn.map((c) => `${flag(c)}${c}`).join(' ')}` : 'Not live in any other country yet.'}</p>
      ${here.length ? `<p>${cell.status === 'live' ? 'Sign up with' : 'Active here'}: ${here.map((co) => `<a href="${esc(co.homepage ?? co.url)}" target="_blank" rel="noopener noreferrer">${esc(co.name)}</a>`).join(', ')}</p>` : ''}
      ${cos.length ? `<p class="detail-close">Could close the gap: ${cos.map((co) => `${esc(co.name)} (already in ${co.near.map((m) => `${flag(m)}${m}`).join(' ')})`).join(', ')}</p>` : ''}
    </div>
    <h4>${ev.length ? `Sources (${ev.length})` : 'Sources'}</h4>
    ${ev.length ? sourceList(ev) : '<p class="muted">No availability found. Nothing to cite yet.</p>'}
    <p class="suggest"><a href="${esc(correctionUrl(cap, code, cell))}" target="_blank" rel="noopener noreferrer">${cell.status === 'live' ? 'Suggest a correction' : 'Seen it work here? Tell us'}</a></p>`);
}

// Every source behind one country's cells, newest first, with the capabilities each one backs.
function openSources(code) {
  const byUrl = new Map();
  for (const { cap, cell } of cells.filter((x) => x.code === code)) {
    for (const e of cell.evidence ?? []) {
      const prev = byUrl.get(e.url);
      if (prev) prev.caps.push(cap.name);
      else byUrl.set(e.url, { ...e, caps: [cap.name] });
    }
  }
  const ev = [...byUrl.values()].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  showDetail(`
    <p class="kicker">Sources · ${flag(code)}${esc(byCode[code].name)}</p>
    <h3 id="detail-title">${ev.length} sources, newest first</h3>
    ${sourceList(ev)}`);
}

function selectCountry(code, scroll) {
  if (!byCode[code]) return;
  const a = document.activeElement;
  const refocus = $('[data-country]').contains(a);
  // The errand is rebuilt too: focus goes back to the same card, step or country button.
  const keep = $('[data-kpis]').contains(a) && (a.dataset.errand ? `[data-errand="${a.dataset.errand}"]` : a.dataset.cap ? `[data-kpis] [data-cap="${a.dataset.cap}"]` : a.dataset.goCountry ? `.xc [data-go-country="${code}"]` : null);
  state.country = code;
  history.replaceState(null, '', writeHash(code, state.view, state.errand));
  // Every country picker on the page (hero pins, world map, console) marks the same country.
  document.querySelectorAll('[data-go-country]').forEach((el) => el.setAttribute('aria-current', el.dataset.goCountry === code));
  renderCountry();
  if (refocus) $('#cn-title').focus({ preventScroll: true });
  if (keep) $(keep)?.focus({ preventScroll: true });
  document.dispatchEvent(new CustomEvent('countrychange', { detail: code }));
  if (scroll) $('#country').scrollIntoView({ behavior: scrollBehavior() });
}

function renderCounts() {
  $('[data-trust-count]').textContent = `${cells.length} checks · ${sourcesOf(cells)} sources · ${companies.length} companies`;
}

function wire() {
  // Any country picker selects; pickers outside the console and the hero also bring the console into view.
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-go-country]');
    if (!el || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    selectCountry(el.dataset.goCountry, !el.closest('[data-term], [data-hero]'));
  });
  // Compare with: the Head to head chart takes the pair and scrolls into view (viz-compare.js cancels the event).
  // If that chart did not draw, nothing cancels it, so the console switches to the other country instead.
  $('[data-country]').addEventListener('click', (e) => {
    const el = e.target.closest('[data-compare]');
    if (!el) return;
    const pair = el.dataset.compare.split(' ');
    const chart = document.getElementById('v-compare');
    const taken = chart && !chart.dispatchEvent(new CustomEvent('compare', { detail: pair, cancelable: true }));
    if (!taken) selectCountry(pair[1]);
  });
  addEventListener('hashchange', () => {
    if (!hashCountry()) return;
    state.view = readHash(location.hash).view;
    state.errand = pickErrand(readHash(location.hash).errand);
    selectCountry(hashCountry(), true);
  });
  // For people / For businesses switches the cards under the country head.
  $('[data-country]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]');
    if (!b || b.dataset.view === state.view) return;
    state.view = b.dataset.view;
    state.errand = null;
    history.replaceState(null, '', writeHash(state.country, state.view));
    renderCountry();
    $(`[data-view="${state.view}"]`).focus({ preventScroll: true });
  });
  // An errand card opens that errand under the cards, one at a time. On phones the errand is below the fold: go there.
  $('[data-kpis]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-errand]');
    if (!b) return;
    state.errand = b.dataset.errand;
    history.replaceState(null, '', writeHash(state.country, state.view, state.errand));
    renderCountry();
    if (!matchMedia('(max-width: 760px)').matches) return $(`[data-errand="${state.errand}"]`).focus({ preventScroll: true });
    $('#errand').scrollIntoView({ behavior: scrollBehavior() });
    $('#eh-title').focus({ preventScroll: true });
  });

  // Cells in the matrix and the errand steps open their details; the sources button lists the country's sources.
  $('[data-term]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cap]');
    if (b) openDetail(b.dataset.cap, b.dataset.code);
    if (e.target.closest('[data-sources]')) openSources(state.country);
  });

  // J and K step through the ranking. Typing in a field or an open dialog wins.
  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || $('[data-detail]').open) return;
    if (e.target.closest?.('input, select, textarea, [contenteditable]')) return;
    const key = e.key.toLowerCase();
    if (key !== 'j' && key !== 'k') return;
    const i = ranking.findIndex((r) => r.code === state.country) + (key === 'j' ? 1 : -1);
    selectCountry(ranking[(i + ranking.length) % ranking.length].code, false);
  });
}

function wireTooltip() {
  const tip = $('[data-tip]');
  const mx = $('[data-matrix]');
  mx.addEventListener('pointerover', (e) => {
    const b = e.target.closest('[data-cap]');
    if (!b || e.pointerType === 'touch') return;
    const cap = capIndex[b.dataset.cap];
    const cell = cap.countries[b.dataset.code];
    tip.innerHTML = `<strong>${flag(b.dataset.code)}${esc(byCode[b.dataset.code].name)} · ${STATUSES[cell.status].label}${cell.confidence ? ' · unsure' : ''}</strong>${esc(cell.note)}`;
    tip.hidden = false;
    const r = b.getBoundingClientRect();
    const w = tip.offsetWidth;
    tip.style.left = `${Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8)}px`;
    tip.style.top = `${r.top - tip.offsetHeight - 8 < 8 ? r.bottom + 8 : r.top - tip.offsetHeight - 8}px`;
  });
  mx.addEventListener('pointerout', (e) => {
    if (!e.relatedTarget?.closest?.('[data-cap]')) tip.hidden = true;
  });
  addEventListener('scroll', () => (tip.hidden = true), { passive: true });
}

// Start last: the helpers above are consts and must exist before init runs.
try {
  ({ meta, categories } = await data);
  init();
} catch (err) {
  $('main').insertAdjacentHTML('afterbegin', `<p class="wrap error">Could not load the data (${esc(err.message)}). Serve the folder over HTTP, for example with <code>npm start</code>.</p>`);
}
