// Agent Atlas shell: loads the data once, builds a shared context, and renders every registered view.
// A view is a classic script that pushes { id, title, blurb, render(el, ctx) } onto window.ATLAS_VIEWS.
import { STATUSES, scoreCountries } from '../src/observatory.js';

const ORDER = ['map', 'periodic', 'radar', 'bump', 'range', 'compare', 'gap', 'flows', 'network', 'timeline'];
const $ = (sel) => document.querySelector(sel);
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const emoji = (code) => String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));

async function load() {
  // The published artifact inlines the data as window.ATLAS_DATA; the repo page fetches it.
  if (window.ATLAS_DATA) return window.ATLAS_DATA;
  const get = (name) => fetch(`../data/${name}.json`).then((r) => {
    if (!r.ok) throw new Error(`data/${name}.json: ${r.status}`);
    return r.json();
  });
  const meta = await get('meta');
  return { meta, categories: await Promise.all(meta.categories.map((c) => get(c.id))) };
}

function buildContext({ meta, categories }) {
  const ranking = scoreCountries(meta, categories);
  const byCode = Object.fromEntries(ranking.map((r) => [r.code, r]));
  const catIndex = Object.fromEntries(meta.categories.map((c, i) => [c.id, { ...c, index: i, color: `var(--c${i + 1})` }]));
  const capabilities = categories.flatMap((cat) => cat.capabilities.map((cap) => ({ ...cap, category: cat.category })));
  // The same company appears in several category files; merge it into one record.
  const map = new Map();
  for (const cat of categories) {
    for (const co of cat.companies ?? []) {
      const prev = map.get(co.name);
      if (!prev) map.set(co.name, { name: co.name, hq: co.hq, url: co.url, roles: [co.role], markets: [...new Set(co.markets)], categories: [cat.category], capabilities: [...(co.capabilities ?? [])] });
      else {
        prev.markets = [...new Set([...prev.markets, ...co.markets])];
        if (!prev.categories.includes(cat.category)) prev.categories.push(cat.category);
        if (!prev.roles.includes(co.role)) prev.roles.push(co.role);
        prev.capabilities = [...new Set([...prev.capabilities, ...(co.capabilities ?? [])])];
      }
    }
  }
  const tipEl = $('[data-atlas-tip]');

  return {
    meta, categories, ranking, byCode, catIndex, capabilities,
    companies: [...map.values()],
    STATUSES, scoreCountries, esc, emoji,
    // A flag for HTML: emoji font, hidden from screen readers (the code or name next to it is the text).
    flag: (code) => `<span class="flag" aria-hidden="true">${emoji(code)}</span>`,
    catName: (id) => catIndex[id].name,
    // Resolved value of a CSS token, for canvas or anything that cannot use var() directly.
    css: (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
    // Shared tooltip: tip.show(event, html) near the pointer, tip.hide().
    tip: {
      show(e, html) {
        tipEl.innerHTML = html;
        tipEl.hidden = false;
        const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
        tipEl.style.left = `${Math.min(Math.max(8, e.clientX - w / 2), innerWidth - w - 8)}px`;
        tipEl.style.top = `${e.clientY - h - 14 < 8 ? e.clientY + 18 : e.clientY - h - 14}px`;
      },
      hide() { tipEl.hidden = true; },
    },
  };
}

const num = (i) => String(i + 1).padStart(2, '0');
const slug = (title) => title.toLowerCase().replace(/\W+/g, '-');

// Hero tape: every country by rank. Chile is the focus country (sunrise), as in the bump chart's default pin.
const flagRow = (ctx) => ctx.ranking.map((r) => `<li${r.code === 'CL' ? ' class="on"' : ''}>${ctx.flag(r.code)}${r.code} <b>${r.score}</b></li>`).join('');

function render(ctx) {
  const views = (window.ATLAS_VIEWS ?? []).slice().sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  const nav = $('[data-atlas-nav]');
  nav.innerHTML = views.map((v, i) => `<a href="#v-${v.id}"><span>${num(i)}</span>${esc(v.title)}</a>`).join('');
  // When more tabs hide past the right edge, fade that edge so the strip reads as scrollable.
  const more = () => nav.classList.toggle('more', nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 1);
  nav.addEventListener('scroll', more, { passive: true });
  addEventListener('resize', more);
  document.fonts?.ready.then(more);
  more();
  const host = $('[data-atlas-views]');
  views.forEach((v, i) => {
    host.insertAdjacentHTML('beforeend', `
      <section class="view wrap" id="v-${v.id}" aria-labelledby="v-${v.id}-h">
        <div class="view-win">
          <div class="view-bar" aria-hidden="true"><span class="view-app"><i></i>${num(i)} / ${String(views.length).padStart(2, '0')}</span><span class="view-path">atlas/<b>${slug(v.title)}</b></span><span class="view-fill"></span></div>
          <div class="view-head"><h2 id="v-${v.id}-h">${esc(v.title)}</h2><p>${esc(v.blurb)}</p></div>
          <div class="view-frame" data-view="${v.id}"></div>
        </div>
      </section>`);
    const el = host.querySelector(`[data-view="${v.id}"]`);
    try {
      v.render(el, ctx);
    } catch (err) {
      console.error(`view ${v.id}`, err);
      el.innerHTML = `<p class="view-error">This view could not be drawn (${esc(err.message)}).</p>`;
    }
  });
  // The tab of the view in the middle of the screen is the current one; keep it in sight in the scrolling tab strip.
  const tabs = [...nav.querySelectorAll('a')];
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    tabs.forEach((a) => (a.hash === `#${e.target.id}` ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
    const a = nav.querySelector('[aria-current]');
    if (a && (a.offsetLeft < nav.scrollLeft || a.offsetLeft + a.offsetWidth > nav.scrollLeft + nav.clientWidth)) nav.scrollTo({ left: a.offsetLeft - 16 });
  }), { rootMargin: '-45% 0px -54% 0px' });
  host.querySelectorAll('.view').forEach((s) => io.observe(s));
}

addEventListener('scroll', () => ($('[data-atlas-tip]').hidden = true), { passive: true });
try {
  const ctx = buildContext(await load());
  document.querySelectorAll('[data-asof]').forEach((el) => (el.textContent = new Date(`${ctx.meta.asOf}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })));
  const cells = ctx.capabilities.length * ctx.meta.countries.length;
  $('[data-atlas-lede]').textContent = `${ctx.meta.countries.length} countries, ${ctx.capabilities.length} capabilities, ${cells} sourced answers and ${ctx.companies.length} companies. Each view below answers a different question about the same data.`;
  $('[data-atlas-flags]').innerHTML = flagRow(ctx);
  render(ctx);
} catch (err) {
  $('main').insertAdjacentHTML('afterbegin', `<p class="wrap error">Could not load the data (${esc(err.message)}).</p>`);
}
