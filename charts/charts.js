// Home page charts: reads the shared data (src/load.js), builds a shared context, and draws every registered chart into its slot.
// A chart is a classic script that pushes { id, title, blurb, render(el, ctx) } onto window.CHARTS.
// blurb may be a function of ctx, so it can count what is in the data.
// index.html places the slots (<section data-chart="<id>">), so the page order lives in the HTML.
import { STATUSES, TIERS, scoreCountries, tierOf } from '../src/observatory.js';
import { data } from '../src/load.js';

const $ = (sel) => document.querySelector(sel);
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const emoji = (code) => String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));

function buildContext({ meta, categories }) {
  const ranking = scoreCountries(meta, categories);
  const byCode = Object.fromEntries(ranking.map((r) => [r.code, r]));
  const catIndex = Object.fromEntries(meta.categories.map((c, i) => [c.id, { ...c, index: i, color: `var(--c${i + 1})` }]));
  const capabilities = categories.flatMap((cat) => cat.capabilities.map((cap) => ({ ...cap, category: cat.category })));
  // The same company appears in several category files; merge it into one record.
  const map = new Map();
  for (const cat of categories) {
    for (const co of cat.companies ?? []) {
      const prev = map.get(co.name.toLowerCase());
      if (!prev) map.set(co.name.toLowerCase(), { name: co.name, hq: co.hq, url: co.url, roles: [co.role], markets: [...new Set(co.markets)], categories: [cat.category], capabilities: [...(co.capabilities ?? [])] });
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
  const pending = new Map(); // slot -> its draw, for charts not drawn yet
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
    pending.set(slot, () => {
      try {
        v.render(el, ctx);
      } catch (err) {
        console.error(`chart ${v.id}`, err);
        el.innerHTML = `<p class="view-error">This chart could not be drawn (${esc(err.message)}).</p>`;
      }
    });
    // The console sends 'compare' to the Head to head slot (app.js). A chart not drawn yet draws first, then gets it.
    slot.addEventListener('compare', (e) => {
      if (draw(slot) && !slot.dispatchEvent(new CustomEvent('compare', { detail: e.detail, cancelable: true }))) e.preventDefault();
    });
  });

  // Drawing all ten charts at once blocks a phone for most of a second. So each chart draws when it comes
  // within one screen of the viewport, and the rest draw one at a time while the browser is idle.
  function draw(slot) {
    const f = pending.get(slot);
    if (!f) return false;
    pending.delete(slot);
    io.unobserve(slot);
    f();
    return true;
  }
  const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && draw(e.target)), { rootMargin: '100% 0px' });
  const slots = [...pending.keys()];
  slots.forEach((slot) => io.observe(slot));
  // The map opens the page, so it draws now. A link straight to a chart (#v-timeline) draws it and every chart
  // above it now, so it lands in the right place, then scrolls to it (the charts drew after the first paint).
  const target = location.hash.startsWith('#v-') && document.getElementById(location.hash.slice(1));
  slots.slice(0, pending.has(target) ? slots.indexOf(target) + 1 : 1).forEach(draw);
  if (target) target.scrollIntoView();
  const idle = window.requestIdleCallback ?? ((f) => setTimeout(f, 50));
  const next = () => pending.size && idle(() => { draw(pending.keys().next().value); next(); });
  next();
}

addEventListener('scroll', () => ($('[data-chart-tip]').hidden = true), { passive: true });
// If the data fails, load.js tells the reader and hides the empty slots.
const loaded = await data.catch(() => null);
if (loaded) render(buildContext(loaded));
