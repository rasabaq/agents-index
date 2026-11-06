// The countries page: one fact sheet per country, beside a rail of every country, best first.
// The link holds the country in the home page's format (#country=CL), so links match and back and forward step
// through the countries you opened. Every check row opens the shared cell detail (detail.js).
import { STATUSES, mergeCompanies, useCategoryWords, startCountry, readHash, writeHash, verdict, tierOf, THEMES, themeScores, regionCompare, liveBy, gapCounts, gapLabel, tiedWith, sourcesOf, placeName, join } from './src/observatory.js';
import { ERRANDS, BUSINESS_ERRANDS } from './src/errands.js';
import { pix } from './src/icons.js';
import { data } from './data.js';
import { $, esc, flag, chip, logo, wireLogos, wireNav, fmtDate, scrollBehavior } from './ui.js';
import { openDetail, siteOf } from './detail.js';

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const ORDER = Object.keys(STATUSES);
// site: what the shared cell detail needs (detail.js). code: the country on show.
let meta, categories, site, ranking, byCode, companies, code;

// One country's cells in category order, as { cap, cell } pairs.
const cellsOf = (c) => categories.flatMap((cat) => cat.capabilities.map((cap) => ({ cap: site.capIndex[cap.id], cell: cap.countries[c] })));
const tier = (score) => `<span class="tier tier-${tierOf(score).toLowerCase()}" aria-hidden="true">${tierOf(score)}</span>`;
const says = (cat, s) => `${cat.short}: ${s >= 100 ? 'works' : s > 0 ? 'works partly' : 'does not work yet'}, ${s} of 100`;

function renderRail() {
  $('[data-rail]').innerHTML = ranking.map((r) => `
    <li><a href="${writeHash(r.code)}" data-code="${r.code}" aria-current="${r.code === code}" aria-label="${esc(`${r.name}, rank ${r.rank} of ${ranking.length}, score ${r.score}, tier ${tierOf(r.score)}`)}">
      <span class="r-rk">${r.rank}</span>${flag(r.code)}<span class="r-nm">${esc(r.name)}</span><span class="r-cd">${r.code}</span>
      <span class="r-sc">${r.score}</span>${tier(r.score)}<span class="bars"><b style="width:${r.score}%"></b></span></a></li>`).join('');
}

// The head: the verdict, why the rest is not live yet, the twelve areas as pixel icons, and the fact box.
// The verdict leaves out its main reason: the list right under it gives every reason.
function head({ r, mine, here, home }) {
  const ties = tiedWith(ranking, r);
  const gaps = mine.filter((x) => x.cell.status !== 'live');
  const reasons = gapCounts(mine);
  const noReason = gaps.length - reasons.reduce((sum, [, n]) => sum + n, 0);
  const low = mine.filter((x) => x.cell.confidence).length;
  const t = tierOf(r.score);
  const sorted = [...mine].sort((a, b) => ORDER.indexOf(a.cell.status) - ORDER.indexOf(b.cell.status));
  const why = (label, n, cls = '') => `<li><span${cls}>${esc(label)}</span><span class="why-bar" aria-hidden="true">${'<i></i>'.repeat(n)}</span><span class="rk-v">${n}</span></li>`;
  return `
    <div class="p-head">
      <div>
        <p class="label">${esc(r.region)} · Country profile</p>
        <h2 id="p-title" tabindex="-1">${flag(r.code)}${esc(r.name)}</h2>
        <p class="p-verdict">${esc(verdict(r.name, r.byCategory, liveBy(mine)))}</p>
        <div class="p-h"><p class="label">Why the rest is not live yet · <b>${gaps.length} of ${mine.length}</b></p></div>
        ${gaps.length ? `<ul class="why">${reasons.map(([id, n]) => why(gapLabel(meta, id), n)).join('')}${noReason ? why('No reason recorded yet', noReason, ' class="muted"') : ''}</ul>` : '<p class="p-sum">Everything we track works here.</p>'}
        <div class="p-h"><p class="label">By area · out of 100</p><p class="hero-key" aria-hidden="true"><i class="k-on"></i>works <i class="k-part"></i>partly <i class="k-off"></i>not yet</p></div>
        <ul class="area-row">${meta.categories.map((cat) => {
          const s = r.byCategory[cat.id];
          return `<li><button type="button"${s >= 100 ? ' class="is-full"' : ''} data-jump="area-${cat.id}" aria-label="${esc(`${says(cat, s)}. Go to its card`)}">${pix(cat.id, 36, s / 100)}<span aria-hidden="true">${s}</span><b aria-hidden="true">${esc(cat.short)}</b></button></li>`;
        }).join('')}</ul>
      </div>
      <aside class="card info" aria-label="Facts about ${esc(placeName(r.name))}">
        <div class="info-top">
          <span class="info-tier tier-${t.toLowerCase()}" aria-hidden="true">${t}</span>
          <div><p class="info-score">${r.score}<small> / 100</small></p>
          <p class="info-rank"><span class="sr-only">Tier ${t}, </span>Rank ${r.rank} of ${ranking.length}</p>
          ${ties.length ? `<p class="info-tie">Tied with ${esc(join(ties.map((x) => x.name), 'and'))}</p>` : ''}</div>
        </div>
        <div class="strip" role="img" aria-label="${esc(ORDER.map((s) => `${r.counts[s]} ${STATUSES[s].label}`).join(', '))}">${sorted.map((x) => `<i class="s-${x.cell.status}"></i>`).join('')}</div>
        <div class="counts">${ORDER.map((s) => `<span>${chip(s)}${r.counts[s]}</span>`).join('')}</div>
        <dl>
          <dt>Region</dt><dd>${esc(r.region)}</dd>
          <dt>Checks</dt><dd>${mine.length} things, ${r.counts.live} work today</dd>
          <dt>Unsure <span class="low" aria-hidden="true"></span></dt><dd>${low ? plural(low, 'check') : 'none'}</dd>
          <dt>Sources</dt><dd>${sourcesOf(mine)}</dd>
          <dt>Companies</dt><dd>${here.length}, ${home} based here</dd>
          <dt>Data</dt><dd>${fmtDate(meta.asOf)}</dd>
        </dl>
      </aside>
    </div>`;
}

// Compared with its region: the four themes and the score, for the country, its neighbours, the leader (or the next
// best) and the average of all. A country alone in its region is compared with the leader only.
function compare({ r }) {
  const { peers, ref, refLabel, line } = regionCompare(ranking, r.code);
  const cols = [r, ...peers, ...(ref && !peers.includes(ref) ? [ref] : [])];
  const themes = Object.fromEntries(ranking.map((x) => [x.code, themeScores(x.byCategory)]));
  const rows = [
    ...THEMES.map((t, i) => ({ name: t.name, areas: t.categories.map((id) => meta.categories.find((c) => c.id === id).short).join(', '), get: (x) => themes[x.code][i].score })),
    { name: 'Overall score', all: true, get: (x) => x.score },
  ];
  const avg = (get) => Math.round(ranking.reduce((sum, x) => sum + get(x), 0) / ranking.length);
  const sub = (x) => (x === r ? 'this' : x === ref ? refLabel : 'region');
  const body = rows.map((row) => {
    const top = Math.max(...cols.map(row.get));
    return `<tr${row.all ? ' class="all"' : ''}><th scope="row">${esc(row.name)}${row.areas ? `<small>${esc(row.areas)}</small>` : ''}</th>${cols.map((x) => `<td class="${[x === r && 'me', row.get(x) === top && 'top'].filter(Boolean).join(' ')}">${row.get(x)}</td>`).join('')}<td>${avg(row.get)}</td></tr>`;
  }).join('');
  return `<section class="blk" aria-labelledby="h-region">
    <div class="blk-h"><div><p class="label">By theme · out of 100</p><h3 id="h-region">${peers.length || !ref ? 'Compared with its region' : `Compared with the ${refLabel}`}</h3></div></div>
    <p class="blk-lede">${esc(line)}</p>
    <table class="cmp">
      <thead><tr><th scope="col"><span class="sr-only">Theme</span></th>${cols.map((x) => `<th scope="col"${x === r ? ' class="me"' : ''}><span class="sr-only">${esc(x.name)}, </span>${flag(x.code)}<span aria-hidden="true">${x.code}</span><small>${sub(x)}</small></th>`).join('')}<th scope="col">avg<small>all ${ranking.length}</small></th></tr></thead>
      <tbody>${body}</tbody></table>
    <p class="cmp-key"><i></i>Highest in the row. Each theme groups the areas named under it.</p>
  </section>`;
}

// One card per area: its pixel icon lit by the score, then a row per check. A row opens the cell detail.
function areas({ r, mine }) {
  const row = ({ cap, cell }) => {
    const n = cell.evidence?.length ?? 0;
    const why = cell.status !== 'live' && gapLabel(meta, cell.gapReason);
    return `<li><button type="button" data-cap="${esc(cap.id)}" data-code="${r.code}" aria-label="${esc(`${cap.name}: ${STATUSES[cell.status].label}${cell.confidence ? ', unsure' : ''}. ${why ? `${why}. ` : ''}${plural(n, 'source')}. Show details`)}">
      ${chip(cell.status, cell.confidence)}
      <span class="r-t"><span class="r-cap">${esc(cap.name)}</span>${why ? `<span class="why-tag">${esc(why)}</span>` : ''}<span class="r-note">${esc(cell.note)}</span></span>
      <span class="r-src${n ? '' : ' zero'}">${n ? `${n}<span class="w"> ${n === 1 ? 'source' : 'sources'}</span>` : '–'}</span></button></li>`;
  };
  const card = (cat) => {
    const cells = mine.filter((x) => x.cap.category === cat.id);
    const s = r.byCategory[cat.id];
    return `<section class="card area${s >= 100 ? ' is-full' : ''}" id="area-${cat.id}" aria-labelledby="h-${cat.id}">
      ${pix(cat.id, 72, s / 100)}
      <div class="area-h"><h4 id="h-${cat.id}" tabindex="-1">${esc(cat.name)}</h4><p class="area-s">${s}<small> / 100</small></p>
        <p class="area-b">${esc(cat.blurb ?? '')}</p><p class="area-n">${cells.filter((x) => x.cell.status === 'live').length} of ${cells.length} live</p></div>
      <ul class="checks">${cells.map(row).join('')}</ul></section>`;
  };
  return `<section class="blk" aria-labelledby="h-caps">
    <div class="blk-h">
      <div><p class="label">${mine.length} checks in ${meta.categories.length} areas</p><h3 id="h-caps">What works, and what does not yet</h3></div>
      <p class="p-legend">${ORDER.map((s) => chip(s)).join('')}<span><span class="low"></span>unsure</span></p>
    </div>
    ${meta.categories.map(card).join('')}
  </section>`;
}

// Who makes it work here: the companies live here, grouped by area; the ones based here are outlined.
function builders({ r, here, home }) {
  // A company can be listed twice in one area file; keep one of each.
  const inArea = (cat) => [...new Map((cat.companies ?? []).filter((co) => co.markets.includes(r.code)).map((co) => [co.name.toLowerCase(), co])).values()];
  const groups = categories.map((cat) => [meta.categories.find((c) => c.id === cat.category), inArea(cat)]).filter(([, list]) => list.length);
  const item = (co) => `<li><a${co.hq === r.code ? ' class="home"' : ''} href="${esc(co.homepage ?? co.url)}" target="_blank" rel="noopener noreferrer" title="${esc(co.role)}">${logo(co.icon, co.name)}<span>${esc(co.name)}</span>${flag(co.hq)}<span class="sr-only">, based in ${esc(byCode[co.hq]?.name ?? co.hq)}</span></a></li>`;
  return `<section class="blk" aria-labelledby="h-cos">
    <div class="blk-h"><div><p class="label">${plural(here.length, 'company', 'companies')} · ${home} based here</p><h3 id="h-cos">Who makes it work here</h3></div>
      <a href="companies.html#market=${r.code}">What each one does <span aria-hidden="true">→</span></a></div>
    ${groups.length ? `<div class="cos">${groups.map(([cat, list]) => `<div class="co-row"><p class="label">${esc(cat.short)}</p><ul>${list.map(item).join('')}</ul></div>`).join('')}</div>
    <p class="co-key"><i></i>Based in ${esc(placeName(r.name))}. The flag after each name is where the company is based.</p>` : `<p class="blk-lede">No company we track makes agents work in ${esc(placeName(r.name))} yet.</p>`}
  </section>`;
}

// Each section gets the country, its cells and its companies, worked out once per render.
function renderProfile() {
  const r = byCode[code];
  const here = companies.filter((co) => co.markets.includes(r.code));
  const p = { r, mine: cellsOf(code), here, home: here.filter((co) => co.hq === r.code).length };
  document.title = `${r.name} · Countries · Agent Index`;
  $('[data-pane]').innerHTML = `${head(p)}${compare(p)}${areas(p)}${builders(p)}
    <p class="p-foot">Data as of ${fmtDate(meta.asOf)}. Seen something out of date? Open a row and suggest a correction.</p>`;
}

// Phones: the rail is one row of pills that scrolls sideways; keep the picked one in the middle.
function centrePill() {
  const ol = $('[data-rail]'), a = ol.querySelector('[aria-current="true"]');
  if (ol.scrollWidth > ol.clientWidth) ol.scrollLeft += a.getBoundingClientRect().left - ol.getBoundingClientRect().left - (ol.clientWidth - a.offsetWidth) / 2;
}

// Show a country: mark it in the rail, draw its profile, and start the profile at its top.
function show(next) {
  const pane = $('[data-pane]');
  const refocus = pane.contains(document.activeElement);
  code = next;
  document.querySelectorAll('[data-rail] a').forEach((a) => a.setAttribute('aria-current', a.dataset.code === code));
  renderProfile();
  if (refocus) $('#p-title').focus({ preventScroll: true });
  centrePill();
  // A country picked further down the page starts at the top of its profile.
  const top = $('.atlas').getBoundingClientRect().top + scrollY - 72;
  if (scrollY > top) scrollTo({ top, behavior: 'instant' });
}

function wire() {
  // The rail links change the hash, which adds a history entry, so back and forward work. A link to a country we do
  // not track keeps the one on show and puts its code back in the URL. Going to another country closes the detail.
  addEventListener('hashchange', () => {
    const next = readHash(location.hash).country;
    if (!byCode[next]) return history.replaceState(null, '', writeHash(code));
    if (next === code) return;
    $('[data-detail]').close();
    show(next);
  });
  $('[data-pane]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cap]');
    if (b) return openDetail(site, b.dataset.cap, b.dataset.code, [...ERRANDS, ...BUSINESS_ERRANDS]);
    // An area icon goes to its card, and keyboard focus goes with it.
    const j = e.target.closest('[data-jump]');
    if (!j) return;
    document.getElementById(j.dataset.jump).scrollIntoView({ behavior: scrollBehavior() });
    document.querySelector(`#${j.dataset.jump} h4`).focus({ preventScroll: true });
  });
  // J and K step through the ranking, as on the home page. Typing in a field or an open dialog wins.
  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || $('[data-detail]').open || e.target.closest?.('input, select, textarea, [contenteditable]')) return;
    const key = e.key.toLowerCase();
    if (key !== 'j' && key !== 'k') return;
    const i = ranking.findIndex((r) => r.code === code) + (key === 'j' ? 1 : -1);
    location.hash = writeHash(ranking[(i + ranking.length) % ranking.length].code);
  });
}

wireNav();
wireLogos();
try {
  ({ meta, categories } = await data);
  useCategoryWords(meta.categories);
  site = siteOf(meta, categories);
  ({ ranking, byCode } = site);
  companies = mergeCompanies(categories);
  // Same start as the home page: the link, else the visitor's own country, else the United States.
  code = startCountry(meta.countries.map((c) => c.code), location.hash, navigator.languages ?? [navigator.language], Intl.DateTimeFormat().resolvedOptions().timeZone);
  if (readHash(location.hash).country !== code) history.replaceState(null, '', writeHash(code));
  document.querySelectorAll('[data-asof]').forEach((el) => (el.textContent = fmtDate(meta.asOf)));
  renderRail();
  renderProfile();
  centrePill();
  wire();
} catch (err) {
  $('main').insertAdjacentHTML('afterbegin', `<p class="wrap error">Could not load the data (${esc(err.message)}). Serve the folder over HTTP, for example with <code>npm start</code>.</p>`);
}
