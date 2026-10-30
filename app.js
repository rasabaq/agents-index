import { STATUSES, scoreCountries, mergeCompanies, extremes, shortName, themeScores, useCategoryWords, startCountry, guessCountry, verdict, couldClose, forBusiness, readHash, writeHash } from './src/observatory.js';
import { data } from './data.js';
import { $, esc, flag, logo, wireLogos, wireNav } from './ui.js';

const fmtDate = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const state = { view: 'people', country: null, allWorks: false, allNot: false };
// The country's two lists show this many items until Show all is pressed.
const FIRST_ITEMS = 5;
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
const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] ?? 'th'}`;
// Gap reasons: the label for an id, and the most common one among a country's cells in some categories.
// Cells may not have one yet.
const gapLabel = (id) => meta.gapReasons?.find((g) => g.id === id)?.label;
// "For businesses": can a business sell through AI agents here, and who does it sign up with?
const bizStatus = {
  live: 'Works here today.',
  limited: 'Only a pilot, beta or a few businesses so far.',
  announced: 'Announced here, not usable yet.',
  none: 'Not available here yet.',
};
function businessVerdict(r) {
  const items = forBusiness(categories, r.code).flatMap((g) => g.items);
  const live = items.filter((x) => x.cell.status === 'live');
  const where = `${/^United /.test(r.name) ? 'the ' : ''}${r.name}`;
  if (!live.length) return `In ${where}, a business cannot yet sell through AI agents: none of the ${items.length} ways we track works here today.`;
  return `In ${where}, ${live.length === items.length ? 'every one' : `${live.length}`} of the ${items.length} ways we track for a business to sell through AI agents and get paid ${live.length === 1 ? 'works' : 'work'} today.`;
}
function renderBusiness(r) {
  const row = ({ cap, label, cell, companies: cos }) => {
    // One line on why: the gap reason when the cell has one, else the status in plain words.
    const reason = cell.status === 'live' ? null : gapLabel(cell.gapReason);
    // Companies are listed by their markets for the whole category, not per capability, so a Not yet item shows no
    // company line: it could name companies that do not offer this capability here.
    const links = cos.map((co) => `<a href="${esc(co.homepage ?? co.url)}" target="_blank" rel="noopener noreferrer">${esc(co.name)}</a>`).join(', ');
    return `<li>
      <button type="button" data-cap="${cap.id}" data-code="${r.code}" aria-label="${esc(cellLabel(cap, r.code, cell))}">${chip(cell.status, cell.confidence)}<span class="mc-t">${esc(label)}<small>${reason ? `${esc(reason)}.` : bizStatus[cell.status]}</small></span></button>
      ${cos.length && cell.status !== 'none' ? `<p class="biz-cos">${cell.status === 'live' ? 'Sign up with' : 'Active here'}: ${links}</p>` : ''}</li>`;
  };
  return forBusiness(categories, r.code).map((g) => `
    <section class="card kpi mc-list biz-group" aria-label="${esc(g.title)}"><h3 class="label">${esc(g.title)} · ${g.items.filter((x) => x.cell.status === 'live').length} of ${g.items.length} live</h3>
      <ul>${g.items.map(row).join('')}</ul></section>`).join('');
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

// The selected country: its head, then what works, what does not yet and the four themes.
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
    <div class="cn-r">
      <button type="button" class="btn btn-sm" data-compare="${r.code} ${other.code}">Compare with ${flag(other.code)}${other.code}</button>
      <button type="button" class="btn btn-sm" data-sources>${nSources} sources</button>
    </div>`;

  if (state.view === 'business') {
    $('[data-kpis]').innerHTML = renderBusiness(r);
    return renderCountryRest();
  }
  const notYet = mine.filter((x) => x.cell.status !== 'live').sort((a, b) => STATUSES[b.cell.status].points - STATUSES[a.cell.status].points);
  const item = ({ cap, cell }) => {
    const reason = cell.status === 'live' ? null : gapLabel(cell.gapReason);
    return `<li><button type="button" data-cap="${cap.id}" data-code="${r.code}" aria-label="${esc(cellLabel(cap, r.code, cell))}">
    ${chip(cell.status, cell.confidence)}<span class="mc-t">${esc(cap.name)}${reason ? `<small>${esc(reason)}</small>` : ''}</span></button>
    ${cell.status === 'live' ? '' : `<a class="mc-tell" href="${esc(correctionUrl(cap, r.code, cell))}" target="_blank" rel="noopener noreferrer">Seen it work here? Tell us</a>`}</li>`;
  };
  // The first few items, then a button for the rest.
  const list = (rows, all, key) => `<ul>${(all ? rows : rows.slice(0, FIRST_ITEMS)).map(item).join('')}</ul>
    ${rows.length > FIRST_ITEMS ? `<button type="button" class="pill mc-more" data-more="${key}" aria-expanded="${all}">${all ? 'Show fewer' : `Show all ${rows.length}`}</button>` : ''}`;
  const { weak } = extremes(r.byCategory);
  $('[data-kpis]').innerHTML = `
    <section class="card kpi mc-list" aria-labelledby="mc-works"><h3 id="mc-works" class="label">Works today · ${works.length} of ${total}</h3>
      ${works.length ? list(works, state.allWorks, 'works') : '<p class="mc-note">Nothing is generally available yet.</p>'}</section>
    <section class="card kpi mc-list" aria-labelledby="mc-not"><h3 id="mc-not" class="label">Not yet · ${notYet.length} of ${total}</h3>
      ${notYet.length ? list(notYet, state.allNot, 'not') : '<p class="mc-note">Everything we track works here.</p>'}</section>
    <section class="card kpi" aria-labelledby="mc-themes"><h3 id="mc-themes" class="label">By theme · out of 100</h3>
      <ul class="cats">${themeScores(meta.themes, r.byCategory).map((t) => `
        <li title="${esc(t.categories.map(catName).join(', '))}"><span class="cat-n">${esc(t.name)}</span><span class="bars"><b style="width:${t.score}%"></b></span><span class="rk-v">${t.score}</span></li>`).join('')}</ul>
      <p class="mc-note">${r.byCategory[weak] < 50 ? `${esc(shortName(weak))} is the gap: ${r.byCategory[weak]} of 100.` : `No gap below 50. The lowest is ${esc(shortName(weak).toLowerCase())}, at ${r.byCategory[weak]}.`}</p></section>`;

  renderCountryRest();
}

// Everything below the country's cards: the same for people and for businesses.
function renderCountryRest() {
  renderMatrix();
  renderBuilders();
}

// Who builds it: the companies live in the selected country, split by where they are based, and the best known of them.
function renderBuilders() {
  const r = byCode[state.country];
  const here = companies.filter((c) => c.markets.includes(r.code));
  const where = `${/^United /.test(r.name) ? 'the ' : ''}${r.name}`;
  const parts = [
    ['us', 'Based in the US', here.filter((c) => c.hq === 'US' && r.code !== 'US')],
    ['home', `Based in ${where}`, here.filter((c) => c.hq === r.code)],
    ['rest', 'Based elsewhere', here.filter((c) => c.hq !== r.code && c.hq !== 'US')],
  ].filter(([, , list]) => list.length);
  const home = here.filter((c) => c.hq === r.code).length;
  // Companies in the most categories first: they are the ones a visitor is most likely to know.
  const top = [...here].sort((a, b) => b.categories.length - a.categories.length || a.name.localeCompare(b.name)).slice(0, 6);
  $('[data-who-title]').innerHTML = `Who makes it work in ${flag(r.code)}${esc(where)}.`;
  $('[data-who]').innerHTML = here.length ? `
    <div class="who-l">
      <p class="who-lede">${here.length} ${here.length === 1 ? 'company makes' : 'companies make'} agents work here. ${home ? `${home} ${home === 1 ? 'is' : 'are'} based in ${esc(where)}.` : `None is based in ${esc(where)} yet.`}</p>
      <div class="who-bar" role="img" aria-label="${esc(parts.map(([, label, list]) => `${label}: ${list.length}`).join(', '))}">${parts.map(([k, , list]) => `<i class="w-${k}" style="flex:${list.length}">${list.length}</i>`).join('')}</div>
      <p class="who-key" aria-hidden="true">${parts.map(([k, label]) => `<span class="w-${k}">${esc(label)}</span>`).join('')}</p>
    </div>
    <div class="who-r">
      <ul class="who-cos">${top.map((c) => `<li><a class="co-name" href="${esc(c.homepage ?? c.url)}" target="_blank" rel="noopener noreferrer">${logo(c.icon, c.name)}<span>${esc(c.name)}</span></a></li>`).join('')}${here.length > top.length ? `<li><a class="who-more" href="companies.html#market=${r.code}">+${here.length - top.length} more</a></li>` : ''}</ul>
      <p class="who-links"><a href="companies.html">All ${companies.length} companies <span aria-hidden="true">→</span></a><a href="companies.html#opensource">Open-source tools <span aria-hidden="true">→</span></a></p>
    </div>` : `<p class="mc-note">No company we track makes agents work in ${esc(where)} yet. <a href="companies.html">See all ${companies.length} companies</a>.</p>`;
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
  // Companies already live nearby that could bring a missing capability here.
  const cos = cell.status === 'live' ? [] : couldClose(categories.find((c) => c.category === cap.category).companies, cap.id, code, region).slice(0, 3);
  showDetail(`
    <p class="kicker">${esc(catName(cap.category))} · ${flag(code)}${esc(byCode[code].name)}</p>
    <h3 id="detail-title">${esc(cap.question)}</h3>
    <p class="detail-status">${chip(cell.status, cell.confidence)}${cell.confidence ? '<span class="low-note">Unsure. The sources are thin or indirect, so treat this as a lead to check.</span>' : ''}</p>
    <p>${esc(cell.note)}</p>
    ${cos.length ? `<p class="detail-close">Could close the gap: ${cos.map((co) => `${esc(co.name)} (already in ${co.near.map((m) => `${flag(m)}${m}`).join(' ')})`).join(', ')}</p>` : ''}
    <h4>${ev.length ? `Sources (${ev.length})` : 'Sources'}</h4>
    ${ev.length ? sourceList(ev) : '<p class="muted">No availability found. Nothing to cite yet.</p>'}
    <p class="suggest"><a href="${esc(correctionUrl(cap, code, cell))}" target="_blank" rel="noopener noreferrer">Suggest a correction</a></p>`);
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
  const refocus = $('[data-country]').contains(document.activeElement);
  state.country = code;
  history.replaceState(null, '', writeHash(code, state.view));
  // Every country picker on the page (hero pins, world map, console) marks the same country.
  document.querySelectorAll('[data-go-country]').forEach((el) => el.setAttribute('aria-current', el.dataset.goCountry === code));
  renderCountry();
  if (refocus) $('#cn-title').focus({ preventScroll: true });
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
    selectCountry(hashCountry(), true);
  });
  // For people / For businesses switches the cards under the country head.
  $('[data-country]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]');
    if (!b || b.dataset.view === state.view) return;
    state.view = b.dataset.view;
    history.replaceState(null, '', writeHash(state.country, state.view));
    renderCountry();
    $(`[data-view="${state.view}"]`).focus({ preventScroll: true });
  });
  // Show all / Show fewer under the country's two lists.
  $('[data-kpis]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-more]');
    if (!b) return;
    const key = b.dataset.more === 'works' ? 'allWorks' : 'allNot';
    state[key] = !state[key];
    renderCountry();
    $(`[data-more="${b.dataset.more}"]`)?.focus({ preventScroll: true });
  });

  // Cells in the matrix and the lists open their details; the sources button lists the country's sources.
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
