import { STATUSES, REPO_USE, scoreCountries, tierOf, mergeCompanies, rankRepos, summarize, extremes, shortName } from './src/observatory.js';

const $ = (sel) => document.querySelector(sel);
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmtDate = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtMonth = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
const getJson = (name) => fetch(`data/${name}.json`).then((r) => {
  if (!r.ok) throw new Error(`data/${name}.json: ${r.status}`);
  return r.json();
});

const state = { market: 'all', use: 'all', country: null };
const scrollBehavior = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
let meta, categories, ranking, byCode, capIndex, companies, repos, cells;

function init() {
  ranking = scoreCountries(meta, categories);
  byCode = Object.fromEntries(ranking.map((r) => [r.code, r]));
  capIndex = Object.fromEntries(categories.flatMap((cat) => cat.capabilities.map((cap) => [cap.id, { ...cap, category: cat.category }])));
  // Every cell with its capability and country, in category order.
  cells = Object.values(capIndex).flatMap((cap) => meta.countries.map((c) => ({ cap, code: c.code, cell: cap.countries[c.code] })));
  companies = mergeCompanies(categories);
  repos = rankRepos(categories);
  state.country = hashCountry() ?? ranking[0].code;

  document.querySelectorAll('[data-asof]').forEach((el) => (el.textContent = fmtDate(meta.asOf)));
  $('[data-asof-iso]').textContent = meta.asOf;
  renderStats();
  renderSide();
  renderRanking();
  renderLegend();
  renderFeed();
  renderCompanyFilters();
  renderCompanies();
  renderRepoFilters();
  renderRepos();
  renderCounts();
  renderCountry();
  wire();
  wireTooltip();
}

const hashCountry = () => {
  const code = location.hash.match(/^#country=(\w\w)$/)?.[1];
  return byCode[code] ? code : null;
};
const catName = (id) => meta.categories.find((c) => c.id === id).name;
// Any ISO country code maps to its flag emoji, so company HQs outside the tracked list get one too.
const emoji = (code) => String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));
const flag = (code) => `<span class="flag" aria-hidden="true">${emoji(code)}</span>`;
const chip = (status, low) => `<span class="chip s-${status}${low ? ' q' : ''}">${STATUSES[status].label}</span>`;
// A small status capsule for the matrix: the fill carries the order, a dashed ring means low confidence.
const dot = (cell) => `<i class="dot d-${cell.status}${cell.confidence ? ' q' : ''}" aria-hidden="true"></i>`;
const cellLabel = (cap, code, cell) => `${cap.name} in ${byCode[code].name}: ${STATUSES[cell.status].label}${cell.confidence ? ', low confidence' : ''}`;
const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th');
const sourcesOf = (list) => new Set(list.flatMap(({ cell }) => (cell.evidence ?? []).map((e) => e.url))).size;
const tiedWith = (r) => ranking.filter((x) => x.score === r.score && x.code !== r.code);

function renderStats() {
  const items = [
    [meta.countries.length, 'countries'],
    [Object.keys(capIndex).length, 'capabilities'],
    [sourcesOf(cells), 'sources'],
    [companies.length, 'companies tracked'],
  ];
  $('[data-stats]').innerHTML = items.map(([n, l]) => `<div><dt>${l}</dt><dd>${n}</dd></div>`).join('');
}

const pick = (r) => `aria-current="${r.code === state.country}" aria-label="${esc(r.name)}, rank ${r.rank}, score ${r.score}, tier ${tierOf(r.score)}"`;

// Left of the console: every country with its tier letter and score. Selecting one fills the rest.
function renderSide() {
  $('[data-clist]').innerHTML = ranking.map((r) => `
    <li><button type="button" class="tier-${tierOf(r.score).toLowerCase()}" data-go-country="${r.code}" ${pick(r)}>
      ${flag(r.code)}<span>${r.code}</span><span class="rk-t">${tierOf(r.score)}</span><span class="rk-v">${r.score}</span>
    </button></li>`).join('');
}

function renderRanking() {
  $('[data-ranking]').innerHTML = ranking.map((r, i) => `
    <li><button type="button" class="tier-${tierOf(r.score).toLowerCase()}" data-go-country="${r.code}" ${pick(r)}>
      <span class="rk-n">${i && ranking[i - 1].rank === r.rank ? '=' : ''}${r.rank}</span>${flag(r.code)}<span class="rk-c">${r.code}</span>
      <span class="rk-t">${tierOf(r.score)}</span><span class="bars"><b style="width:${r.score}%"></b></span><span class="rk-v">${r.score}</span>
    </button></li>`).join('');
  $('[data-points]').textContent = Object.values(STATUSES).map((s) => `${s.label} ${s.points}`).join(' · ');
}

function renderLegend() {
  $('[data-legend]').innerHTML = Object.entries(STATUSES).map(([k, s]) => `<span>${dot({ status: k })}${s.label}</span>`).join('')
    + `<span>${dot({ status: 'live', confidence: 'low' })}Low confidence</span>`;
}

// The selected country: its head, the four numbers, its matrix column and its categories.
function renderCountry() {
  const r = byCode[state.country];
  const mine = cells.filter((x) => x.code === r.code);
  const ties = tiedWith(r);
  const i = ranking.indexOf(r);
  const other = ties[0] ?? ranking[i + 1] ?? ranking[i - 1];
  const nSources = sourcesOf(mine);
  const low = mine.filter((x) => x.cell.confidence).length;
  const total = mine.length;

  $('[data-country]').innerHTML = `
    <div>
      <p class="label">Country · rank ${r.rank} of ${ranking.length}${ties.length ? `, tied with ${ties.map((t) => `${flag(t.code)}${t.code}`).join(', ')}` : ''}</p>
      <h2 id="cn-title" tabindex="-1">${flag(r.code)}${esc(r.name)}</h2>
      <p class="cn-lede">${esc(summarize(r.name, r.byCategory))}</p>
    </div>
    <div class="cn-r">
      <button type="button" class="btn btn-sm" data-go-country="${other.code}">Compare with ${flag(other.code)}${other.code}</button>
      <button type="button" class="btn btn-sm" data-sources>${nSources} sources</button>
    </div>`;

  const parts = Object.keys(STATUSES).map((k) => [k, r.counts[k]]);
  $('[data-kpis]').innerHTML = `
    <div class="card kpi"><p class="label">Score</p><p class="kpi-v">${r.score}<small>/ 100</small></p>
      <span class="meter"><b style="width:${r.score}%"></b></span><span class="badge badge-s">Tier ${tierOf(r.score)} · ${ordinal(r.rank)}${ties.length ? ' tied' : ''}</span></div>
    <div class="card kpi"><p class="label">Live now</p><p class="kpi-v">${r.counts.live}<small>of ${total}</small></p>
      <span class="stack" role="img" aria-label="${parts.map(([k, n]) => `${n} ${STATUSES[k].label.toLowerCase()}`).join(', ')}">${parts.filter(([, n]) => n).map(([k, n]) => `<i class="k-${k}" style="flex:${n}"></i>`).join('')}</span>
      <span class="stack-k" aria-hidden="true">${parts.map(([k, n], j) => `<b>${n}</b> ${STATUSES[k].label.toLowerCase()}${j === 1 ? '<br>' : j < 3 ? ' · ' : ''}`).join('')}</span></div>
    <div class="card kpi"><p class="label">Low confidence</p><p class="kpi-v">${low}<small>cell${low === 1 ? '' : 's'}</small></p><span class="chip s-limited q">Dashed = thin evidence</span></div>
    <div class="card kpi"><p class="label">Sources</p><p class="kpi-v">${nSources}</p><span class="badge">Every cell cited</span></div>`;

  const { weak } = extremes(r.byCategory);
  $('[data-cats-title]').innerHTML = `${flag(r.code)}${esc(r.name)} by category`;
  $('[data-cats]').innerHTML = meta.categories.map((c) => `
    <li title="${esc(c.blurb)}"><span class="cat-n">${esc(c.name)}</span><span class="bars"><b style="width:${r.byCategory[c.id]}%"></b></span><span class="rk-v">${r.byCategory[c.id]}</span></li>`).join('');
  $('[data-cats-note]').textContent = r.byCategory[weak] < 50
    ? `${shortName(weak)} is the gap: ${r.byCategory[weak]} of 100.`
    : `No gap below 50. The lowest is ${shortName(weak).toLowerCase()}, at ${r.byCategory[weak]}.`;

  $('[data-term-country]').textContent = r.name.toLowerCase();
  $('[data-term-sel]').innerHTML = `${flag(r.code)}<b>${r.code}</b> · ${r.score} · tier ${tierOf(r.score)}`;
  renderMatrix();
  renderMethod();
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
  $('[data-mx-count]').textContent = `${Object.keys(capIndex).length} capabilities`;
}

// The six newest sources across all cells. A source shared by several cells shows once per cell.
function renderFeed() {
  const items = cells.flatMap((x) => (x.cell.evidence ?? []).filter((e) => e.date).map((e) => ({ ...x, e })))
    .sort((a, b) => b.e.date.localeCompare(a.e.date))
    .slice(0, 6);
  $('[data-feed-count]').textContent = `${items.length} entries`;
  $('[data-feed]').innerHTML = items.map(({ cap, code, cell, e }) => `
    <li><button type="button" data-cap="${cap.id}" data-code="${code}" aria-label="${esc(`${e.date}, ${cellLabel(cap, code, cell)}, via ${e.publisher ?? e.type}`)}">
      <time datetime="${e.date}">${e.date.length === 10 ? e.date.slice(5) : e.date}</time>
      <span class="fd-c">${flag(code)}${code}</span>
      <span class="fd-t">${esc(cap.name)}<small>via ${esc(e.publisher ?? e.type)}</small></span>
      ${chip(cell.status)}
    </button></li>`).join('');
}

function correctionUrl(cap, code, cell) {
  const q = new URLSearchParams({
    title: `Correction: ${cap.id} in ${code}`,
    body: `Capability: ${cap.id}\nCountry: ${byCode[code].name} (${code})\nCurrent status: ${STATUSES[cell.status].label}\n\nCorrect status and source:\n`,
  });
  return `https://github.com/rasabaq/ai-agent-observatory/issues/new?${q}`;
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
  showDetail(`
    <p class="kicker">${esc(catName(cap.category))} · ${flag(code)}${esc(byCode[code].name)}</p>
    <h3 id="detail-title">${esc(cap.question)}</h3>
    <p class="detail-status">${chip(cell.status, cell.confidence)}${cell.confidence ? '<span class="low-note">Low confidence. Sources are thin or indirect, so treat this cell as a lead to check.</span>' : ''}</p>
    <p>${esc(cell.note)}</p>
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
  history.replaceState(null, '', `#country=${code}`);
  // Every country picker on the page (hero, console, tier list) marks the same country.
  document.querySelectorAll('[data-go-country]').forEach((el) => el.setAttribute('aria-current', el.dataset.goCountry === code));
  renderCountry();
  if (refocus) $('#cn-title').focus({ preventScroll: true });
  document.dispatchEvent(new CustomEvent('countrychange', { detail: code }));
  if (scroll) $('#country').scrollIntoView({ behavior: scrollBehavior() });
}

function renderCompanyFilters() {
  const el = $('[data-company-filters]');
  const opts = [['all', 'All markets'], ...ranking.map((r) => [r.code, `${flag(r.code)}${esc(r.code)}`])];
  el.innerHTML = opts.map(([id, html]) => `<button type="button" class="pill" data-market="${id}" aria-pressed="${state.market === id}"${id === 'all' ? '' : ` aria-label="${esc(byCode[id].name)}"`}>${html}</button>`).join('');
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
  $('[data-companies-label]').textContent = `Companies · ${rows.length} of ${companies.length}`;
  $('[data-companies]').innerHTML = `
    <thead><tr><th scope="col">Company</th><th scope="col">Based in</th><th scope="col">What it lets agents do</th><th scope="col">Live in</th></tr></thead>
    <tbody>${rows.map((c) => `
      <tr>
        <th scope="row"><a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.name)}</a><span class="co-cats">${c.categories.map((id) => `<span>${esc(shortName(id))}</span>`).join('')}</span></th>
        <td class="nowrap">${flag(c.hq)}${esc(c.hq)}</td>
        <td><p class="co-roles" title="${esc(c.roles.join(' '))}">${esc(c.roles.join(' '))}</p></td>
        <td class="markets"><span class="sr-only">${c.markets.map((m) => byCode[m]?.name ?? m).join(', ')}</span>${ranking.map((r) => `<i class="${c.markets.includes(r.code) ? 'on' : ''}" title="${esc(r.name)}" aria-hidden="true">${r.code}</i>`).join('')}</td>
      </tr>`).join('')}
    </tbody>`;
}

function renderRepoFilters() {
  const el = $('[data-repo-filters]');
  const opts = [['all', 'All'], ...Object.keys(REPO_USE).filter((k) => repos.some((r) => r.use === k)).map((k) => [k, REPO_USE[k].label])];
  el.innerHTML = opts.map(([id, label]) => `<button type="button" class="pill" data-use="${id}" aria-pressed="${state.use === id}"${id === 'all' ? '' : ` title="${esc(REPO_USE[id].hint)}"`}>${esc(label)}</button>`).join('');
  el.onclick = (e) => {
    const b = e.target.closest('[data-use]');
    if (!b) return;
    state.use = b.dataset.use;
    el.querySelectorAll('[data-use]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    renderRepos();
  };
}

// Big numbers read compact (8.1M, 240K); an en dash means nothing to count.
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const count = (n, label) => `<td class="num" data-label="${label}">${n == null ? '–' : compact.format(n)}</td>`;

// Open-source repos, most used first: the tier comes from installs, never from stars.
function renderRepos() {
  const rows = repos.filter((r) => state.use === 'all' || r.use === state.use);
  $('[data-repos-label]').textContent = `Open source · ${rows.length} of ${repos.length}`;
  $('[data-repos]').innerHTML = `
    <thead><tr><th scope="col">Repo</th><th scope="col">What it lets agents do</th><th scope="col">Real use</th><th scope="col" class="num">Installs a month</th><th scope="col" class="num">Docker pulls</th><th scope="col" class="num">Stars</th><th scope="col" class="num">Last commit</th></tr></thead>
    <tbody>${rows.map((r) => `
      <tr>
        <th scope="row"><a href="https://github.com/${esc(r.repo)}" target="_blank" rel="noopener noreferrer">${r.origin ? flag(r.origin) : ''}${esc(r.name)}</a><span class="co-cats"><span>${r.repo.split('/').map((x) => `<span class="nowrap">${esc(x)}</span>`).join('/<wbr>')}</span><span>${esc(shortName(r.category))}</span></span></th>
        <td><p class="co-roles">${esc(r.role)}</p></td>
        <td><span class="chip u-${r.use}" title="${esc(REPO_USE[r.use].hint)}">${REPO_USE[r.use].label}</span></td>
        ${count(r.usage.downloadsMonth, 'Installs')}${count(r.usage.dockerPulls, 'Pulls')}${count(r.usage.stars, 'Stars')}
        <td class="num" data-label="Commit"><time datetime="${r.usage.pushedAt}" title="${r.usage.pushedAt}">${fmtMonth(r.usage.pushedAt)}</time></td>
      </tr>`).join('')}
    </tbody>`;
}

// Method cards: a matrix row, the status pairs and the score formula, drawn from the data.
function renderMethod() {
  const low = cells.filter((x) => x.cell.confidence).length;
  $('[data-method-cells]').textContent = `One matrix, ${cells.length} cells`;
  $('[data-method-low]').textContent = `${low} cells rest on thin sources. They get a dashed ring, so you see the doubt.`;
  // The row with the most different statuses, and the fewest doubts, shows the scale best.
  const fit = (cap) => { const cs = Object.values(cap.countries); return new Set(cs.map((c) => c.status)).size * 10 - cs.filter((c) => c.confidence).length * 5; };
  const cap = Object.values(capIndex).reduce((a, b) => (fit(b) > fit(a) ? b : a));
  $('[data-crop-row]').innerHTML = `<p class="crop-t">${esc(cap.name)}</p><div class="crow">${meta.countries.map((c) => `
    <span${c.code === state.country ? ' class="sel"' : ''}><em>${flag(c.code)}${c.code}</em>${dot(cap.countries[c.code])}</span>`).join('')}</div>`;
  $('[data-crop-pairs]').innerHTML = Object.entries(STATUSES).map(([k, s]) => `${dot({ status: k })}${dot({ status: k, confidence: 'low' })}<span>${s.label} · ${s.points}</span>`).join('');
  const r = byCode[state.country];
  $('[data-crop-term]').innerHTML = `
    <p><span class="ps">$</span> observatory score ${r.code}</p>
    <p>&nbsp;&nbsp;category = mean(points) × 100</p>
    <p>&nbsp;&nbsp;country&nbsp;&nbsp;= mean(categories)</p>
    <p>${flag(r.code)}<b>${r.score}</b> · tier ${tierOf(r.score)} · rank ${r.rank} of ${ranking.length}</p>`;
}

function renderCounts() {
  const text = `${cells.length} cells · ${sourcesOf(cells)} sources`;
  $('[data-term-count]').textContent = text;
  $('[data-foot-count]').textContent = `${text} · ${companies.length} companies · ${repos.length}\u00a0open\u2011source repos`;
}

function wire() {
  // Any country picker selects; pickers outside the console also bring the console into view.
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-go-country]');
    if (!el || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    selectCountry(el.dataset.goCountry, !el.closest('[data-term]'));
  });
  addEventListener('hashchange', () => hashCountry() && selectCountry(hashCountry(), true));

  // Cells in the matrix and the feed open their details; the sources button lists the country's sources.
  $('[data-term]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cap]');
    if (b) openDetail(b.dataset.cap, b.dataset.code);
    if (e.target.closest('[data-sources]')) openSources(state.country);
  });

  // Tabs are real links. Scrolling here instead keeps #country=XX in the address bar.
  const tabs = [...document.querySelectorAll('[data-tabs] a')];
  const go = (a) => {
    tabs.forEach((t) => (t === a ? t.setAttribute('aria-current', 'location') : t.removeAttribute('aria-current')));
    $(a.hash).scrollIntoView({ behavior: scrollBehavior() });
  };
  $('[data-tabs]').onclick = (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    e.preventDefault();
    go(a);
  };

  // Keys 1 to 6 follow the tabs, J and K step through the ranking. Typing in a field or an open dialog wins.
  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || $('[data-detail]').open) return;
    if (e.target.closest?.('input, select, textarea, [contenteditable]')) return;
    const key = e.key.toLowerCase();
    if (tabs[e.key - 1]) go(tabs[e.key - 1]);
    else if (key === 'j' || key === 'k') {
      const i = ranking.findIndex((r) => r.code === state.country) + (key === 'j' ? 1 : -1);
      selectCountry(ranking[(i + ranking.length) % ranking.length].code, false);
    }
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
    tip.innerHTML = `<strong>${flag(b.dataset.code)}${esc(byCode[b.dataset.code].name)} · ${STATUSES[cell.status].label}${cell.confidence ? ' · low confidence' : ''}</strong>${esc(cell.note)}`;
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
  meta = await getJson('meta');
  categories = await Promise.all(meta.categories.map((c) => getJson(c.id)));
  init();
} catch (err) {
  $('main').insertAdjacentHTML('afterbegin', `<p class="wrap error">Could not load the data (${esc(err.message)}). Serve the folder over HTTP, for example with <code>npm start</code>.</p>`);
}
