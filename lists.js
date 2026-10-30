// The companies page: the companies table and the open-source table, each with filters and Show all.
// The home page links here; #market=CL opens the companies already filtered to one country.
import { REPO_USE, scoreCountries, mergeCompanies, rankRepos, shortName, useCategoryWords } from './src/observatory.js';
import { data } from './data.js';
import { $, esc, flag, logo, wireLogos, wireNav } from './ui.js';

const fmtMonth = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
const state = { market: 'all', use: 'all', allCompanies: false, allRepos: false };
// Long tables show this many rows until Show all is pressed.
const FIRST_ROWS = 10;
const scrollBehavior = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
let ranking, byCode, companies, repos;

function renderCompanyFilters() {
  const el = $('[data-company-filters]');
  const opts = [['all', 'All countries'], ...ranking.map((r) => [r.code, `${flag(r.code)}${esc(r.code)}`])];
  el.innerHTML = opts.map(([id, html]) => `<button type="button" class="pill" data-market="${id}" aria-pressed="${state.market === id}"${id === 'all' ? '' : ` aria-label="${esc(byCode[id].name)}"`}>${html}</button>`).join('');
  el.onclick = (e) => {
    const b = e.target.closest('[data-market]');
    if (!b) return;
    state.market = b.dataset.market;
    el.querySelectorAll('[data-market]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    renderCompanies();
  };
}

// A "Show all N" / "Show fewer" button under a long table. Returns the rows to draw.
function firstRows(rows, all, el, what) {
  el.innerHTML = rows.length > FIRST_ROWS ? `<button type="button" class="pill" aria-expanded="${all}">${all ? 'Show fewer' : `Show all ${rows.length} ${what}`}</button>` : '';
  return all ? rows : rows.slice(0, FIRST_ROWS);
}

function renderCompanies() {
  const matching = companies.filter((c) => state.market === 'all' || c.markets.includes(state.market));
  const rows = firstRows(matching, state.allCompanies, $('[data-companies-more]'), 'companies');
  $('[data-companies-label]').textContent = `Companies · ${matching.length} of ${companies.length}`;
  $('[data-companies]').innerHTML = `
    <thead><tr><th scope="col">Company</th><th scope="col">Based in</th><th scope="col">What it lets agents do</th><th scope="col">Live in</th></tr></thead>
    <tbody>${rows.map((c) => `
      <tr>
        <th scope="row"><a class="co-name" href="${esc(c.homepage ?? c.url)}" target="_blank" rel="noopener noreferrer">${logo(c.icon, c.name)}<span>${esc(c.name)}</span></a>${c.categories.length > 1 ? '' : `<span class="co-cats"><span>${esc(shortName(c.categories[0]))}</span></span>`}</th>
        <td class="nowrap">${flag(c.hq)}${esc(c.hq)}</td>
        <td><p class="co-roles" tabindex="0">${esc(c.roles.join(' '))}</p></td>
        <td class="markets">${c.categories.map((id) => `<span class="mk-row">${c.categories.length > 1 ? `<span class="mk-cat">${esc(shortName(id))}</span>` : ''}<span class="sr-only">${esc(shortName(id))}: ${c.marketsBy[id].map((m) => byCode[m]?.name ?? m).join(', ')}</span>${ranking.map((r) => `<i class="${c.marketsBy[id].includes(r.code) ? 'on' : ''}" title="${esc(r.name)}" aria-hidden="true">${r.code}</i>`).join('')}</span>`).join('')}</td>
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
  const matching = repos.filter((r) => state.use === 'all' || r.use === state.use);
  const rows = firstRows(matching, state.allRepos, $('[data-repos-more]'), 'repos');
  $('[data-repos-label]').textContent = `Open source · ${matching.length} of ${repos.length}`;
  $('[data-repos]').innerHTML = `
    <thead><tr><th scope="col">Repo</th><th scope="col">What it lets agents do</th><th scope="col">Real use</th><th scope="col" class="num">Installs a month</th><th scope="col" class="num">Docker pulls</th><th scope="col" class="num">Stars</th><th scope="col" class="num">Last commit</th></tr></thead>
    <tbody>${rows.map((r) => `
      <tr>
        <th scope="row"><a class="co-name" href="https://github.com/${esc(r.repo)}" target="_blank" rel="noopener noreferrer">${logo(`https://github.com/${r.repo.split('/')[0]}.png?size=64`, r.name)}<span>${r.origin ? flag(r.origin) : ''}${esc(r.name)}</span></a><span class="co-cats"><span>${r.repo.split('/').map((x) => `<span class="nowrap">${esc(x)}</span>`).join('/<wbr>')}</span><span>${esc(shortName(r.category))}</span></span></th>
        <td><p class="co-roles" tabindex="0">${esc(r.role)}</p></td>
        <td><span class="chip u-${r.use}" title="${esc(REPO_USE[r.use].hint)}">${REPO_USE[r.use].label}</span></td>
        ${count(r.usage.downloadsMonth, 'Installs')}${count(r.usage.dockerPulls, 'Pulls')}${count(r.usage.stars, 'Stars')}
        <td class="num" data-label="Commit"><time datetime="${r.usage.pushedAt}" title="${r.usage.pushedAt}">${fmtMonth(r.usage.pushedAt)}</time></td>
      </tr>`).join('')}
    </tbody>`;
}

function wire() {
  // Show all / Show fewer under each table. Fewer scrolls back to the table's top.
  $('[data-companies-more]').addEventListener('click', (e) => {
    if (!e.target.closest('button')) return;
    state.allCompanies = !state.allCompanies;
    renderCompanies();
    // The render replaced the button; keep keyboard focus on it.
    $('[data-companies-more] button')?.focus({ preventScroll: true });
    if (!state.allCompanies) $('#companies').scrollIntoView({ behavior: scrollBehavior() });
  });
  $('[data-repos-more]').addEventListener('click', (e) => {
    if (!e.target.closest('button')) return;
    state.allRepos = !state.allRepos;
    renderRepos();
    $('[data-repos-more] button')?.focus({ preventScroll: true });
    if (!state.allRepos) $('#opensource').scrollIntoView({ behavior: scrollBehavior() });
  });
}

wireNav();
wireLogos();
try {
  const { meta, categories } = await data;
  useCategoryWords(meta.categories);
  ranking = scoreCountries(meta, categories);
  byCode = Object.fromEntries(ranking.map((r) => [r.code, r]));
  companies = mergeCompanies(categories);
  repos = rankRepos(categories);
  const market = new URLSearchParams(location.hash.slice(1)).get('market');
  if (byCode[market]) state.market = market;
  document.querySelectorAll('[data-asof]').forEach((el) => (el.textContent = new Date(`${meta.asOf}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })));
  renderCompanyFilters();
  renderCompanies();
  renderRepoFilters();
  renderRepos();
  wire();
} catch (err) {
  $('main').insertAdjacentHTML('afterbegin', `<p class="wrap error">Could not load the data (${esc(err.message)}). Serve the folder over HTTP, for example with <code>npm start</code>.</p>`);
}
