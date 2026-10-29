// Home page charts: loads the data once, builds a shared context, and draws every registered chart into its slot.
// A chart is a classic script that pushes { id, title, blurb, render(el, ctx) } onto window.CHARTS.
// blurb may be a function of ctx, so it can count what is in the data.
// index.html places the slots (<section data-chart="<id>">), so the page order lives in the HTML.
import { STATUSES, TIERS, scoreCountries, tierOf } from '../src/observatory.js';

const $ = (sel) => document.querySelector(sel);
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const emoji = (code) => String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));

async function load() {
  const get = (name) => fetch(`data/${name}.json`).then((r) => {
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
  const tipEl = $('[data-chart-tip]');

  return {
    meta, categories, ranking, byCode, catIndex, capabilities,
    companies: [...map.values()],
    STATUSES, scoreCountries, esc, emoji, edgeFade,
    TIERS, tierOf,
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

// A strip that scrolls sideways fades whichever edge hides more of it (CSS .fade-x, in charts.css).
function edgeFade(el) {
  el.classList.add('fade-x');
  const more = () => {
    el.classList.toggle('more', el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    el.classList.toggle('more-l', el.scrollLeft > 1);
  };
  el.addEventListener('scroll', more, { passive: true });
  addEventListener('resize', more);
  document.fonts?.ready.then(more);
  more();
}

const slug = (title) => title.toLowerCase().replace(/\W+/g, '-');

function render(ctx) {
  const views = Object.fromEntries((window.CHARTS ?? []).map((v) => [v.id, v]));
  document.querySelectorAll('[data-chart]').forEach((slot) => {
    const v = views[slot.dataset.chart];
    if (!v) return console.error(`chart ${slot.dataset.chart} is not registered`);
    slot.id = `v-${v.id}`;
    slot.classList.add('view', 'wrap');
    slot.setAttribute('aria-labelledby', `v-${v.id}-h`);
    slot.innerHTML = `
      <div class="view-win">
        <div class="view-bar" aria-hidden="true"><span class="view-app"><i></i>Chart</span><span class="view-path">charts/<b>${slug(v.title)}</b></span><span class="view-fill"></span></div>
        <div class="view-head"><h2 id="v-${v.id}-h">${esc(v.title)}</h2><p>${esc(typeof v.blurb === 'function' ? v.blurb(ctx) : v.blurb)}</p></div>
        <div class="view-frame" data-view="${v.id}"></div>
      </div>`;
    const el = slot.querySelector('.view-frame');
    try {
      v.render(el, ctx);
    } catch (err) {
      console.error(`chart ${v.id}`, err);
      el.innerHTML = `<p class="view-error">This chart could not be drawn (${esc(err.message)}).</p>`;
    }
  });
  // The charts drew after the first paint, so a link straight to one (#v-map) lands only now.
  if (location.hash.startsWith('#v-')) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}

addEventListener('scroll', () => ($('[data-chart-tip]').hidden = true), { passive: true });
try {
  render(buildContext(await load()));
} catch (err) {
  // app.js already tells the reader the data did not load; the empty slots stay empty.
  console.error('charts', err);
}
