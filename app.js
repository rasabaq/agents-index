import { STATUSES, scoreCountries } from './src/observatory.js';

const $ = (sel) => document.querySelector(sel);
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmtDate = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const getJson = (name) => fetch(`data/${name}.json`).then((r) => {
  if (!r.ok) throw new Error(`data/${name}.json: ${r.status}`);
  return r.json();
});

const state = { category: 'all', market: 'all', country: null };
let meta, categories, ranking, byCode, capIndex, companies;

function init() {
  ranking = scoreCountries(meta, categories);
  byCode = Object.fromEntries(meta.countries.map((c) => [c.code, c]));
  capIndex = Object.fromEntries(categories.flatMap((cat) => cat.capabilities.map((cap) => [cap.id, { ...cap, category: cat.category }])));
  companies = mergeCompanies();
  state.country = location.hash.match(/^#country=(\w\w)$/)?.[1] ?? ranking[0].code;

  document.querySelectorAll('[data-asof]').forEach((el) => (el.textContent = fmtDate(meta.asOf)));
  renderStats();
  renderRanking();
  renderLegend();
  renderFilters();
  renderMatrix();
  renderCountrySelect();
  renderProfile();
  renderCompanyFilters();
  renderCompanies();
  renderStatusList();
  wireTooltip();
}

const catName = (id) => meta.categories.find((c) => c.id === id).name;
// Any ISO country code maps to its flag emoji, so company HQs outside the tracked list get one too.
const emoji = (code) => String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));
const flag = (code) => `<span class="flag" aria-hidden="true">${emoji(code)}</span>`;
const chip = (status) => `<span class="chip s-${status}">${STATUSES[status].label}</span>`;

// The same company often appears in several category files; show it once.
function mergeCompanies() {
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

function renderStats() {
  const cells = categories.flatMap((c) => c.capabilities.flatMap((cap) => Object.values(cap.countries)));
  const sources = new Set(cells.flatMap((c) => (c.evidence ?? []).map((e) => e.url))).size;
  const items = [
    [meta.countries.length, 'countries'],
    [Object.keys(capIndex).length, 'capabilities'],
    [sources, 'sources'],
    [companies.length, 'companies tracked'],
  ];
  $('[data-stats]').innerHTML = items.map(([n, l]) => `<div><dt>${l}</dt><dd>${n}</dd></div>`).join('');
}

function renderRanking() {
  $('[data-ranking]').innerHTML = ranking.map((r) => `
    <li>
      <button type="button" class="rank-row" data-go-country="${r.code}" aria-current="${r.code === state.country}" aria-label="${esc(r.name)}, rank ${r.rank}, score ${r.score}">
        <span class="rank-num">${r.rank}</span>
        <span class="rank-name">${flag(r.code)}${esc(r.name)}</span>
        <span class="rank-bar" aria-hidden="true"><span style="width:${r.score}%"></span></span>
        <span class="rank-score">${r.score}</span>
        <span class="rank-counts">${r.counts.live} live · ${r.counts.limited} limited</span>
      </button>
    </li>`).join('');
  document.querySelectorAll('[data-go-country]').forEach((el) => el.addEventListener('click', () => selectCountry(el.dataset.goCountry, true)));
}

function renderLegend() {
  $('[data-legend]').innerHTML = Object.entries(STATUSES).map(([k, s]) => `<span class="legend-item">${chip(k)}<span>${s.hint}</span></span>`).join('')
    + '<span class="legend-item"><span class="low" aria-hidden="true">?</span><span>Low confidence: sources are thin.</span></span>';
}

function renderFilters() {
  const opts = [['all', 'All categories'], ...meta.categories.map((c) => [c.id, c.name])];
  const el = $('[data-filters]');
  el.innerHTML = opts.map(([id, name]) => `<button type="button" class="pill" data-cat="${id}" aria-pressed="${state.category === id}">${esc(name)}</button>`).join('');
  el.onclick = (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    state.category = b.dataset.cat;
    el.querySelectorAll('[data-cat]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    renderMatrix();
  };
}

function renderMatrix() {
  const cols = ranking;
  const head = `<thead><tr><th scope="col" class="cap-col">Capability</th>${cols.map((c) => `<th scope="col"><span class="col-head">${flag(c.code)}<span>${c.code}</span></span></th>`).join('')}</tr></thead>`;
  const body = categories
    .filter((cat) => state.category === 'all' || cat.category === state.category)
    .map((cat) => `
      <tbody>
        <tr class="cat-row"><th colspan="${cols.length + 1}" scope="colgroup">${esc(catName(cat.category))}</th></tr>
        ${cat.capabilities.map((cap) => `
          <tr>
            <th scope="row" class="cap-col"><span class="cap-name">${esc(cap.name)}</span><span class="cap-q">${esc(cap.question)}</span></th>
            ${cols.map((c) => {
              const cell = cap.countries[c.code];
              return `<td><button type="button" class="cell s-${cell.status}" data-cap="${cap.id}" data-code="${c.code}" aria-label="${esc(cap.name)} in ${esc(c.name)}: ${STATUSES[cell.status].label}${cell.confidence ? ', low confidence' : ''}">${STATUSES[cell.status].label}${cell.confidence ? '<span class="low" aria-hidden="true">?</span>' : ''}</button></td>`;
            }).join('')}
          </tr>`).join('')}
      </tbody>`).join('');
  const table = $('[data-matrix]');
  table.innerHTML = head + body;
  table.onclick = (e) => {
    const b = e.target.closest('[data-cap]');
    if (b) openDetail(b.dataset.cap, b.dataset.code);
  };
}

function correctionUrl(cap, code, cell) {
  const q = new URLSearchParams({
    title: `Correction: ${cap.id} in ${code}`,
    body: `Capability: ${cap.id}\nCountry: ${byCode[code].name} (${code})\nCurrent status: ${STATUSES[cell.status].label}\n\nCorrect status and source:\n`,
  });
  return `https://github.com/rasabaq/ai-agent-observatory/issues/new?${q}`;
}

function openDetail(capId, code) {
  const cap = capIndex[capId];
  const cell = cap.countries[code];
  const ev = cell.evidence ?? [];
  $('[data-detail-body]').innerHTML = `
    <p class="kicker">${esc(catName(cap.category))} · ${flag(code)}${esc(byCode[code].name)}</p>
    <h3 id="detail-title">${esc(cap.question)}</h3>
    <p class="detail-status">${chip(cell.status)}${cell.confidence ? '<span class="low-note">Low confidence. Sources are thin or indirect, so treat this cell as a lead to check.</span>' : ''}</p>
    <p>${esc(cell.note)}</p>
    <h4>${ev.length ? `Sources (${ev.length})` : 'Sources'}</h4>
    ${ev.length ? `<ol class="sources">${ev.map((e) => `
      <li><a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(e.title)}</a>
        <span class="src-meta"><span class="tag">${esc(e.type)}</span>${esc(e.publisher ?? '')}${e.date ? ` · ${esc(e.date)}` : ''}</span></li>`).join('')}</ol>`
      : '<p class="muted">No availability found. Nothing to cite yet.</p>'}
    <p class="suggest"><a href="${esc(correctionUrl(cap, code, cell))}" target="_blank" rel="noopener noreferrer">Suggest a correction</a></p>`;
  $('[data-tip]').hidden = true;
  $('[data-detail]').showModal();
}

function renderCountrySelect() {
  const sel = $('[data-country-select]');
  sel.innerHTML = ranking.map((r) => `<option value="${r.code}">${emoji(r.code)} ${esc(r.name)}</option>`).join('');
  sel.value = state.country;
  sel.onchange = () => selectCountry(sel.value, false);
}

function selectCountry(code, scroll) {
  state.country = code;
  $('[data-country-select]').value = code;
  history.replaceState(null, '', `#country=${code}`);
  document.querySelectorAll('[data-go-country]').forEach((el) => el.setAttribute('aria-current', el.dataset.goCountry === code));
  renderProfile();
  if (scroll) $('#country').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

function renderProfile() {
  const r = ranking.find((x) => x.code === state.country);
  const caps = Object.values(capIndex).map((cap) => ({ cap, cell: cap.countries[r.code] }));
  const group = (statuses) => caps.filter((x) => statuses.includes(x.cell.status));
  const list = (items) => items.length
    ? `<ul class="cap-list">${items.map(({ cap, cell }) => `<li><button type="button" data-cap="${cap.id}" data-code="${r.code}"><span>${esc(cap.name)}</span>${chip(cell.status)}</button></li>`).join('')}</ul>`
    : '<p class="muted">None.</p>';
  const local = companies.filter((c) => c.markets.includes(r.code));
  const homegrown = local.filter((c) => c.hq === r.code);

  $('[data-profile]').innerHTML = `
    <div class="profile">
      <div class="profile-score">
        <p class="big-flag" aria-hidden="true">${emoji(r.code)}</p>
        <p class="profile-name">${esc(r.name)}</p>
        <p class="profile-num"><span>${r.score}</span>/100</p>
        <p class="muted">Rank ${r.rank} of ${ranking.length} · ${esc(r.region)}</p>
      </div>
      <div class="profile-cats">
        ${meta.categories.map((c) => `
          <div class="cat-bar" title="${esc(c.blurb)}">
            <span class="cat-bar-name">${esc(c.name)}</span>
            <span class="rank-bar" aria-hidden="true"><span style="width:${r.byCategory[c.id]}%"></span></span>
            <span class="cat-bar-num">${r.byCategory[c.id]}</span>
          </div>`).join('')}
      </div>
    </div>
    <div class="profile-lists">
      <div><h3>Agents can do this today</h3>${list(group(['live']))}</div>
      <div><h3>Partly, or coming</h3>${list(group(['limited', 'announced']))}</div>
      <div><h3>Not yet</h3>${list(group(['none']))}</div>
    </div>
    <div class="profile-cos">
      <h3>${local.length} companies enable agents here${homegrown.length ? `, ${homegrown.length} of them based in ${esc(r.name)}` : ''}</h3>
      <p class="co-cloud">${local.map((c) => `<a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer" class="${c.hq === r.code ? 'home' : ''}">${flag(c.hq)}${esc(c.name)}</a>`).join('')}</p>
    </div>`;
  $('[data-profile]').onclick = (e) => {
    const b = e.target.closest('[data-cap]');
    if (b) openDetail(b.dataset.cap, b.dataset.code);
  };
}

function renderCompanyFilters() {
  const el = $('[data-company-filters]');
  const opts = [['all', 'All markets'], ...ranking.map((r) => [r.code, `${emoji(r.code)} ${r.name}`])];
  el.innerHTML = opts.map(([id, name]) => `<button type="button" class="pill" data-market="${id}" aria-pressed="${state.market === id}">${esc(name)}</button>`).join('');
  el.onclick = (e) => {
    const b = e.target.closest('[data-market]');
    if (!b) return;
    state.market = b.dataset.market;
    el.querySelectorAll('[data-market]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    renderCompanies();
  };
}

function renderCompanies() {
  const rows = companies.filter((c) => state.market === 'all' || c.markets.includes(state.market));
  $('[data-companies]').innerHTML = `
    <thead><tr><th scope="col">Company</th><th scope="col">Based in</th><th scope="col">What it lets agents do</th><th scope="col">Live in</th></tr></thead>
    <tbody>${rows.map((c) => `
      <tr>
        <th scope="row"><a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.name)}</a><span class="co-cats">${c.categories.map((id) => `<span>${esc(catName(id))}</span>`).join('')}</span></th>
        <td class="nowrap">${flag(c.hq)}${esc(c.hq)}</td>
        <td><ul class="co-roles">${c.roles.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></td>
        <td class="markets">${ranking.map((r) => `<span class="mk ${c.markets.includes(r.code) ? 'on' : ''}" title="${esc(r.name)}">${r.code}</span>`).join('')}</td>
      </tr>`).join('')}
    </tbody>`;
}

function renderStatusList() {
  $('[data-status-list]').innerHTML = Object.entries(STATUSES).map(([k, s]) => `<li>${chip(k)}<span><strong>${s.points}</strong> point${s.points === 1 ? '' : 's'}. ${s.hint}</span></li>`).join('');
}

function wireTooltip() {
  const tip = $('[data-tip]');
  const table = $('[data-matrix]');
  table.addEventListener('pointerover', (e) => {
    const b = e.target.closest('[data-cap]');
    if (!b || e.pointerType === 'touch') return;
    const cell = capIndex[b.dataset.cap].countries[b.dataset.code];
    tip.innerHTML = `<strong>${esc(byCode[b.dataset.code].name)} · ${STATUSES[cell.status].label}${cell.confidence ? ' · low confidence' : ''}</strong>${esc(cell.note)}`;
    tip.hidden = false;
    const r = b.getBoundingClientRect();
    const w = tip.offsetWidth;
    tip.style.left = `${Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8)}px`;
    tip.style.top = `${r.top - tip.offsetHeight - 8 < 8 ? r.bottom + 8 : r.top - tip.offsetHeight - 8}px`;
  });
  table.addEventListener('pointerout', (e) => {
    if (!e.relatedTarget?.closest?.('[data-cap]')) tip.hidden = true;
  });
  addEventListener('scroll', () => (tip.hidden = true), { passive: true });
}

// Start last: the helpers above are consts and must exist before init runs.
try {
  meta = await getJson('meta');
  categories = await Promise.all(meta.categories.map((c) => getJson(c.id)));
  init();
} catch (err) {
  $('main').insertAdjacentHTML('afterbegin', `<p class="wrap error">Could not load the data (${esc(err.message)}). Serve the folder over HTTP, for example with <code>npm start</code>.</p>`);
}
