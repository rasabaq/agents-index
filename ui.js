// Small helpers shared by every page: the home page (app.js), the countries page (countries.js) and the companies page (lists.js).
import { STATUSES } from './src/observatory.js';

export const $ = (sel) => document.querySelector(sel);
// A data date ("2026-11-04") as the site shows it: "Nov 4, 2026".
export const fmtDate = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
// Smooth scrolling, unless the visitor asked for less motion.
export const scrollBehavior = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
export const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// Any ISO country code maps to its flag emoji, so company HQs outside the tracked list get one too.
export const emoji = (code) => String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));
export const flag = (code) => `<span class="flag" aria-hidden="true">${emoji(code)}</span>`;
// A status chip; `low` (low confidence) adds the "?" mark.
export const chip = (status, low) => `<span class="chip s-${status}${low ? ' q' : ''}">${STATUSES[status].label}</span>`;

// A small logo before a company or repo name. The name sits right next to it, so the image has empty alt text.
// No logo, or one that fails to load, becomes a monogram (see wireLogos).
export const monogram = (name) => `<span class="logo mono" aria-hidden="true">${esc([...name.trim()][0]?.toUpperCase() ?? '?')}</span>`;
export const logo = (src, name) => (src ? `<img class="logo" src="${esc(src)}" width="22" height="22" alt="" loading="lazy" decoding="async" data-name="${esc(name)}">` : monogram(name));

// A logo that fails to load (moved, blocked, or not an image) is swapped for the monogram.
export function wireLogos() {
  document.addEventListener('error', (e) => {
    if (e.target instanceof HTMLImageElement && e.target.classList.contains('logo')) e.target.outerHTML = monogram(e.target.dataset.name);
  }, true);
}

// Phones: the Menu button opens the section links; picking one closes it.
export function wireNav() {
  const nav = $('.nav'), menu = $('[data-nav-menu]');
  const setMenu = (open) => { nav.classList.toggle('open', open); menu.setAttribute('aria-expanded', open); };
  menu.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  nav.querySelector('nav').addEventListener('click', (e) => e.target.closest('a') && setMenu(false));
  addEventListener('keydown', (e) => e.key === 'Escape' && nav.classList.contains('open') && (setMenu(false), menu.focus()));
}
