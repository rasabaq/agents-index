// Agent Atlas shell: loads the data once, builds a shared context, and renders every registered view.
// A view is a classic script that pushes { id, title, blurb, render(el, ctx) } onto window.ATLAS_VIEWS.
import { STATUSES, scoreCountries } from '../src/observatory.js';

const ORDER = ['map', 'periodic', 'radar', 'bump', 'compare', 'flows', 'network', 'timeline'];
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
  const themeListeners = [];
  new MutationObserver(() => themeListeners.forEach((f) => f())).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => themeListeners.forEach((f) => f()));
  const tipEl = $('[data-atlas-tip]');

  return {
    meta, categories, ranking, byCode, catIndex, capabilities,
    companies: [...map.values()],
    STATUSES, esc, emoji,
    catName: (id) => catIndex[id].name,
    // Resolved value of a CSS token, for canvas or anything that cannot use var() directly.
    css: (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
    isDark: () => {
      const t = document.documentElement.dataset.theme;
      return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    },
    onThemeChange: (fn) => themeListeners.push(fn),
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

function render(ctx) {
  const views = (window.ATLAS_VIEWS ?? []).slice().sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  $('[data-atlas-nav]').innerHTML = views.map((v) => `<a href="#v-${v.id}">${esc(v.title)}</a>`).join('');
  const host = $('[data-atlas-views]');
  views.forEach((v, i) => {
    host.insertAdjacentHTML('beforeend', `
      <section class="view wrap" id="v-${v.id}">
        <div class="view-head"><span class="view-num">${String(i + 1).padStart(2, '0')}</span><h2>${esc(v.title)}</h2><p>${esc(v.blurb)}</p></div>
        <div class="view-frame" data-view="${v.id}"></div>
      </section>`);
    const el = host.querySelector(`[data-view="${v.id}"]`);
    try {
      v.render(el, ctx);
    } catch (err) {
      console.error(`view ${v.id}`, err);
      el.innerHTML = `<p class="view-error">This view could not be drawn (${esc(err.message)}).</p>`;
    }
  });
}

function theme() {
  const root = document.documentElement;
  try {
    const saved = localStorage.getItem('theme');
    if (saved) root.dataset.theme = saved;
  } catch {}
  $('.theme').addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch {}
  });
}

theme();
addEventListener('scroll', () => ($('[data-atlas-tip]').hidden = true), { passive: true });
try {
  const ctx = buildContext(await load());
  document.querySelectorAll('[data-asof]').forEach((el) => (el.textContent = new Date(`${ctx.meta.asOf}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })));
  const cells = ctx.capabilities.length * ctx.meta.countries.length;
  $('[data-atlas-lede]').textContent = `${ctx.meta.countries.length} countries, ${ctx.capabilities.length} capabilities, ${cells} sourced answers and ${ctx.companies.length} companies. Each view below answers a different question about the same data.`;
  render(ctx);
} catch (err) {
  $('main').insertAdjacentHTML('afterbegin', `<p class="wrap error">Could not load the data (${esc(err.message)}).</p>`);
}
