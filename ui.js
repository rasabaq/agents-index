// Small helpers shared by the home page (app.js) and the companies page (lists.js).
export const $ = (sel) => document.querySelector(sel);
export const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// Any ISO country code maps to its flag emoji, so company HQs outside the tracked list get one too.
export const emoji = (code) => String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));
export const flag = (code) => `<span class="flag" aria-hidden="true">${emoji(code)}</span>`;

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
