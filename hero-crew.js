// Agents at work, beside the hero's headline: an agent log types real errands from the index one by one, and the
// pixel agent for each one does it right then, holding the logo of the product it uses. The lines come from
// src/crew.js; the agents sit on the wordmark's cell grid, which hero.js shares (--wm-cell, 'herolayout').
import { BAYER } from './src/icons.js';
import { AGENTS, crewLines, logoUrl } from './src/crew.js';
import { data } from './data.js';

const hero = document.querySelector('[data-hero]');
const crew = hero.querySelector('[data-crew]');
const list = crew.querySelector('[data-crew-list]');
const ports = crew.querySelector('.crew-ports');
const yard = crew.querySelector('.crew-yard');
const cv = yard.querySelector('.crew-cv');
const g = cv.getContext('2d');
const dpr = Math.min(devicePixelRatio || 1, 2);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const el = (tag, cls, text = '') => { const e = document.createElement(tag); e.className = cls; e.textContent = text; return e; };
const caret = el('i', 'crew-caret');
caret.setAttribute('aria-hidden', 'true');

const K = { eye: '#05060B', wire: '#5E6173', ink: '#F4F1EE', item: '#B0B3C2', itemD: '#5E6173', muted: '#7E8192', hot: '#FFB672', white: '#FFF1E2', rim: '#363948', tail: ['#FF6F7D', '#A3155A'], plate: '#0E0F18' };
// The bodies: row widths, centred; tones run magenta to sunrise like the wordmark.
// eyes: [left x, right x, top y, width, height] in cells from the body's top-left.
const BODY = {
  shop: { rows: [8, 12, 14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 14, 12, 8], tones: ['#FF2E88', '#E0287E'], eyes: [4, 10, 5, 2, 3] },
  pay: { rows: [14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 14], tones: ['#FF6F7D', '#FF2E88'], eyes: [3, 10, 5, 3, 3] },
  book: { rows: [8, 12, 14, 16, 16, 16, 16, 16, 14, 12, 8], tones: ['#FFB672', '#FF6F7D'], eyes: [3, 10, 5, 3, 1] },
  act: { rows: [6, 10, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 10, 6], tones: ['#FFE6C8', '#FFB672'], eyes: [3, 7, 5, 2, 2] },
};

// One clock for both halves. Each errand gets D seconds: the caret waits, the errand is typed, a pulse runs down the
// agent's wire, the agent works with the product's logo up, then the status lands on the row, the port and the badge.
const D = 5.2, KEEP = 6, T_TYPE = 0.5, CH = 0.055, LOOK = 0.35, WIRE = 0.5, WORK = 2.0;
const times = (L) => { const td = T_TYPE + L.errand.length * CH + LOOK, ta = td + WIRE; return { td, ta, tw: ta + WORK }; };
let LOG = [];
const at = (k) => LOG[((k % LOG.length) + LOG.length) % LOG.length];
// an agent's latest errand that has reached `gate` (td dispatched, ta arrived, tw done) by time tau of errand k
const lastOf = (n, k, tau, gate) => { for (let j = k; j > k - LOG.length; j--) { const L = at(j); if (L.n === n && (j < k || tau >= times(L)[gate])) return L; } return null; };

/* ---------- logos: each one downsampled to 12 x 12 cells over a plate ---------- */
const PIX = {};
async function prepLogos() {
  const c = document.createElement('canvas'); c.width = c.height = 12;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.imageSmoothingQuality = 'high';
  await Promise.all([...new Set(LOG.map((L) => L.logo).filter(Boolean))].map(async (key) => {
    const img = new Image(); img.src = logoUrl(key);
    try { await img.decode(); } catch { return; } // a missing logo shows the empty plate
    x.clearRect(0, 0, 12, 12); x.drawImage(img, 0, 0, 12, 12);
    const d = x.getImageData(0, 0, 12, 12);
    // A dark mark on a clear ground (ChatGPT's knot, LoopCV's arrows) gets a light plate, everything else the dark one.
    let clear = 0, lum = 0, n = 0;
    for (let i = 0; i < 144; i++) { const o = i * 4; if (d.data[o + 3] < 128) clear++; else { lum += (0.3 * d.data[o] + 0.59 * d.data[o + 1] + 0.11 * d.data[o + 2]) / 255; n++; } }
    const plate = clear > 30 && n && lum / n < 0.35 ? [244, 241, 238] : [14, 15, 24];
    for (let i = 0; i < 144; i++) { const o = i * 4, a = d.data[o + 3] / 255; for (let q = 0; q < 3; q++) d.data[o + q] = Math.round(plate[q] * (1 - a) + d.data[o + q] * a); d.data[o + 3] = 255; }
    // stretch the levels so a faint mark (Amazon's smile on navy) survives the drop to 12 cells
    let lo = 255, hi = 0;
    for (let i = 0; i < 576; i++) if (i % 4 < 3) { lo = Math.min(lo, d.data[i]); hi = Math.max(hi, d.data[i]); }
    if (hi > lo) for (let i = 0; i < 576; i++) if (i % 4 < 3) d.data[i] = Math.round(((d.data[i] - lo) * 255) / (hi - lo));
    PIX[key] = { img: d, cells: Array.from({ length: 144 }, (_, i) => `rgb(${d.data[i * 4]},${d.data[i * 4 + 1]},${d.data[i * 4 + 2]})`) };
  }));
}

/* ---------- the log: rows typed from the clock, the newest at the bottom next to the agents' ports ---------- */
function dot(L) {
  const i = el('i', `dot d-${L ? L.status : 'none'}${L?.low ? ' q' : ''}`);
  i.setAttribute('aria-hidden', 'true');
  return i;
}
function row(k) {
  const L = at(k), r = el('div', 'crew-row');
  r.style.setProperty('--tone', BODY[L.agent].tones[0]);
  const st = el('span', 'crew-st'); st.dataset.s = L.status;
  st.append(dot(L), el('b', '', L.status));
  if (L.low) st.append(el('span', 'sr-only', ', not sure'));
  const v = el('span', `crew-via${L.product ? '' : ' is-none'}`);
  const pix = PIX[L.logo];
  if (pix) { const lc = el('canvas', 'crew-logo'); lc.width = lc.height = 12; lc.setAttribute('aria-hidden', 'true'); lc.getContext('2d').putImageData(pix.img, 0, 0); v.append(lc); }
  v.append(el('span', ''));
  const p = el('span', 'crew-p', '›'); p.setAttribute('aria-hidden', 'true');
  r.append(p, el('span', 'crew-task', L.errand), el('span', 'crew-cc', L.country), st, v);
  r.L = L; r.key = '';
  return r;
}
function paint(r, tau) {
  const { errand, via } = r.L, { td, ta, tw } = times(r.L);
  const typed = Math.max(0, Math.min(errand.length, Math.floor((tau - T_TYPE) / CH)));
  const vn = tau < ta ? 0 : Math.min(via.length, Math.floor((tau - ta) / 0.016) + 1);
  const key = `${typed} ${tau >= td - 0.2} ${tau >= td} ${vn} ${tau >= tw} ${tau >= td && tau < tw + 0.6}`;
  if (key === r.key) return;
  r.key = key;
  const [, t, c, st, v] = r.children;
  t.textContent = errand.slice(0, typed);
  if (tau < td) t.append(caret);
  r.classList.toggle('is-typing', tau >= T_TYPE && typed < errand.length);
  c.classList.toggle('is-hidden', tau < td - 0.2); // the country follows the errand
  v.classList.toggle('is-hidden', tau < ta); // the product shows when the agent picks it up
  v.lastChild.textContent = via.slice(0, vn);
  st.classList.toggle('is-hidden', tau < tw); // the status lands when the agent is done
  r.classList.toggle('is-on', tau >= td && tau < tw + 0.6);
}
function push(r, slide) {
  list.append(r);
  while (list.children.length > KEEP) list.firstElementChild.remove();
  if (!slide) return;
  // slide the stack up by one row instead of jumping
  list.style.transition = 'none'; list.style.transform = `translateY(${r.offsetHeight}px)`;
  list.offsetHeight;
  list.style.transition = 'transform 0.32s ease-out'; list.style.transform = 'none';
}
let shownK = null;
function logTo(k, tau) {
  if (shownK === null || k < shownK || k - shownK >= KEEP) {
    list.replaceChildren();
    for (let j = k - KEEP + 1; j < k; j++) { const r = row(j); paint(r, Infinity); list.append(r); }
    list.append(row(k)); shownK = k;
  }
  while (shownK < k) { paint(list.lastElementChild, Infinity); push(row(++shownK), !reduce); }
  paint(list.lastElementChild, tau);
}

/* ---------- ports: name, how many countries have its current task live, the status of its last errand ---------- */
function portsTo(k, tau) {
  const cur = at(k), { td, tw } = times(cur);
  [...ports.children].forEach((li, n) => {
    const job = lastOf(n, k, tau, 'td'), done = lastOf(n, k, tau, 'tw'), on = cur.n === n && tau >= td && tau < tw + 0.6;
    const key = `${job?.cap} ${job?.country} ${done?.status} ${done?.low} ${on}`;
    if (key === li.key || !job) return;
    li.key = key;
    li.classList.toggle('is-on', on);
    li.children[1].replaceChildren(`${job.live}/${job.of}`, el('span', 'cnt-live', ' live'));
    li.children[2].replaceWith(dot(done));
    li.title = `${AGENTS[n].label}: ${job.name}, live in ${job.live} of ${job.of} countries`;
  });
}

/* ---------- the yard: the agents on the wordmark's cell grid ---------- */
let cols = 0, rows = 0, cell = 0, gap = 0, oy = 0, wires = [];
// one grid cell, drawn in paint order; the grid hangs from the bottom so the last row ends on the button's bottom edge
const put = (x, y, color, w = 1, h = 1) => {
  if (x < 0 || y < 0 || x + w > cols || y + h > rows) return;
  const cD = cell * dpr;
  g.fillStyle = color;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const cx = x + i, cy = y + j, x0 = Math.round(cx * cD), y0 = Math.round(oy + cy * cD);
    g.fillRect(x0, y0, Math.round((cx + 1) * cD) - x0 - gap, Math.round(oy + (cy + 1) * cD) - y0 - gap);
  }
};
// props get the same 1-cell dark rim as the bodies, so they read on the dithered sky
const sprite = (x, y, art, map) => (put(x - 1, y - 1, K.eye, art[0].length + 2, art.length + 2), art).forEach((r, j) => [...r].forEach((ch, i) => map[ch] && put(x + i, y + j, map[ch])));

function layout() {
  const W = yard.clientWidth, H = yard.clientHeight;
  if (!W || !H) return false;
  // Each agent needs a 31-cell quarter (body, badge) and 32 rows (a 6-row wire, badge, body, shadow).
  cell = Math.min(parseFloat(getComputedStyle(hero).getPropertyValue('--wm-cell')) || Infinity, W / 4 / 31, H / 32);
  gap = cell >= 3 ? Math.max(1, Math.round(dpr)) : dpr >= 2 ? 1 : 0;
  cols = Math.floor(W / cell);
  rows = Math.floor(H / cell);
  oy = (H - rows * cell) * dpr;
  cv.width = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
  // each wire hangs from its port's status mark
  const left = yard.getBoundingClientRect().left;
  wires = [...ports.children].map((li) => { const r = li.lastChild.getBoundingClientRect(); return Math.floor((r.left + r.width / 2 - left) / cell); });
  return true;
}

const MARKS = {
  live: [['.###.', '#####', '#####', '#####', '.###.'], K.ink],
  limited: [['.###.', '##..#', '##..#', '##..#', '.###.'], K.item],
  announced: [['.###.', '#...#', '#...#', '#...#', '.###.'], K.item],
  none: [['.....', '.....', '.###.', '.....', '.....'], K.muted],
};
const ASK = ['###', '..#', '.##', '...', '.#.']; // the low-confidence "?"

function drawAgent(id, n, s) {
  const a = BODY[id], w = Math.max(...a.rows), h = a.rows.length, ground = rows - 1;
  // the badge hangs under its port's wire, inside the agent's quarter, right of the body and over its prop
  const q = Math.floor((n * cols) / 4), x0 = Math.min(Math.max(wires[n] - 8, q + 18), Math.floor(((n + 1) * cols) / 4) - 13), bx = x0 - 1 - w;
  const hop = s.hop ? 1 : 0, by = ground - 1 - h - hop;
  const y0 = ground - 22 - hop - (s.pop ? 1 : 0);

  // the wire: down from the port's mark, across if the mark is off the badge, down into the badge's top
  const px = wires[n], tx = Math.min(x0 + 10, Math.max(x0 + 1, px)), path = [];
  for (let y = 0; y <= 2; y++) path.push([px, y]);
  for (let x = px; x !== tx; ) { x += Math.sign(tx - x); path.push([x, 2]); }
  for (let y = 3; y < y0 - 1; y++) path.push([tx, y]);
  path.forEach(([x, y], i) => i % 2 === 0 && put(x, y, K.wire));
  if (s.pulse >= 0) {
    const i = Math.round(s.pulse * (path.length - 1));
    [K.hot, ...K.tail].forEach((c, t) => path[i - t] && put(...path[i - t], c));
  }

  // a 1-cell dark rim and shadow, then the body with the wordmark's ordered dither from the light tone to the dark one
  a.rows.forEach((rw, j) => put(bx + (w - rw) / 2 - 1, by + j, K.eye, rw + 2));
  put(bx + (w - a.rows[0]) / 2, by - 1, K.eye, a.rows[0]);
  put(bx - 1, by + h, K.eye, w + 2, 1 + hop + 1);
  a.rows.forEach((rw, j) => {
    const xs = bx + (w - rw) / 2;
    for (let i = 0; i < rw; i++) put(xs + i, by + j, (j / (h - 1)) * 0.9 > (BAYER[(j & 3) * 4 + ((xs + i) & 3)] + 0.5) / 16 ? a.tones[1] : a.tones[0]);
  });
  put(bx + 2, by + h, a.tones[1], 3); put(bx + w - 5, by + h, a.tones[1], 3);
  // eyes: look toward the prop while working; idle agents only blink
  const [e1, e2, ey, ew, eh] = a.eyes, look = s.act >= 0 ? 1 : 0;
  if (!(s.blink && eh === 1)) for (const ex of [e1, e2]) put(bx + ex + look, by + ey + (s.blink ? eh - 1 : 0), K.eye, ew, s.blink ? 1 : eh);

  // the prop, held low on the right under the badge; it shares the agent's hop
  const R = bx + w, top = by + h - 8, p = s.act >= 0 ? s.act : s.done >= 0 ? 1 : -1;
  if (id === 'shop') {
    // a parcel drops out of the product into the bag, the bag dips
    const dip = p > 0.6 && p < 0.72 ? 1 : 0;
    if (p >= 0 && p < 0.6) put(R + 4, top - 4 + Math.round((p / 0.6) * 4), K.hot, 2, 2);
    sprite(R + 1, top + dip, ['..hhhh..', '..h..h..', '########', '########', '########', '###ss###', '########'], { h: K.item, '#': K.ink, s: K.hot });
  } else if (id === 'pay') {
    // the card taps the reader, the reader's screen lights up
    const tap = p >= 0.08 && p < 0.62 ? 1 : 0, on = p >= 0.16 && p < 0.8;
    sprite(R + 5, top, ['####', '#ss#', '#ss#', '####', '#..#', '####', '####'], { '#': K.itemD, s: on ? (Math.floor(p * 18) % 2 ? K.white : K.hot) : K.eye });
    sprite(R - 3 + tap, top + 2, ['#######', 'sssssss', '#######', '#cc####', '#######'], { '#': K.ink, s: K.itemD, c: K.hot });
  } else if (id === 'book') {
    // the ticket goes up, its stub is stamped, it comes back down
    const lift = p < 0 ? 0 : p < 0.3 ? Math.ceil(p / 0.1) : p < 0.72 ? 3 : Math.max(0, 3 - Math.ceil((p - 0.72) / 0.07)), stamp = p >= 0.35;
    sprite(R - 2, top + 3 - lift, ['#####.##', '#####s##', '#####.##', '#####s##'], { '#': K.ink, '.': K.itemD, s: K.itemD });
    if (stamp) put(R + 4, top + 3 - lift, K.hot, 2, 4);
  } else {
    // the form fills in line by line, flashes when complete, and is sent up into the product
    const done = p < 0 ? 0 : Math.min(12, Math.floor((p / 0.55) * 13)), flash = p >= 0.55 && p < 0.7, sent = p >= 0.7 ? Math.ceil((p - 0.7) / 0.05) : 0;
    if (sent < 6) {
      const art = Array.from({ length: 8 }, (_, j) => Array.from({ length: 6 }, (_, i) => (j % 2 && i > 0 && i < 5 && ((j - 1) / 2) * 4 + i - 1 < done ? 'l' : j % 2 && i > 0 && i < 5 ? 'm' : '#')).join(''));
      sprite(R + 1, top - sent * 2, art, { '#': flash ? K.white : K.ink, m: flash ? K.white : K.item, l: flash ? K.hot : K.itemD });
    }
  }

  // the badge: the product's logo in 12 x 12 cells, with a 1-cell grey rim that glows sunrise while the agent uses it.
  // No product ("no agent found"): an empty plate with a dash.
  put(x0 - 1, y0 - 1, s.hot ? K.hot : K.rim, 14, 14);
  if (s.logo) s.logo.cells.forEach((c, i) => put(x0 + (i % 12), y0 + ((i / 12) | 0), c));
  else { put(x0, y0, K.plate, 12, 12); put(x0 + 4, y0 + 6, K.muted, 4, 1); }
  // done: the errand's status mark on the badge's corner, the same mark as the row's, and a "?" left of it when unsure
  if (s.mark) { const [art, c] = MARKS[s.mark]; sprite(x0 - 3, y0 - 3, art, { '#': c }); }
  if (s.mark && s.low) sprite(x0 - 8, y0 - 3, ASK, { '#': K.hot });
}

function draw(T) {
  const k = Math.floor(T / D), tau = T - k * D, cur = at(k), { td, ta, tw } = times(cur);
  logTo(k, tau);
  portsTo(k, tau);
  g.clearRect(0, 0, cv.width, cv.height);
  AGENTS.forEach(({ id }, n) => {
    const on = cur.n === n, last = lastOf(n, k, tau, 'ta');
    drawAgent(id, n, {
      pulse: on && tau >= td && tau < ta ? (tau - td) / WIRE : -1,
      act: on && tau >= ta && tau < tw ? (tau - ta) / WORK : -1,
      done: on && tau >= tw ? tau - tw : -1,
      hop: on && tau >= tw && tau < tw + 0.25,
      pop: on && tau >= ta && tau < ta + 0.2,
      hot: on && tau >= ta,
      mark: on && tau >= tw ? cur.status : '',
      low: cur.low,
      blink: !on && ((T + n * 1.7) % 4.3) < 0.13,
      logo: last?.logo ? PIX[last.logo] : null,
    });
  });
}

/* ---------- start: when the data is in; a still frame for reduced motion, else about 30 fps while on screen ---------- */
async function start({ meta, categories }) {
  const names = new Map(categories.flatMap((c) => c.capabilities.map((cap) => [cap.id, cap.name])));
  LOG = crewLines(meta, categories).map((L) => ({ ...L, n: AGENTS.findIndex((a) => a.id === L.agent), via: L.product ?? 'no agent found', name: names.get(L.cap) }));
  if (!LOG.length) return crew.remove();
  crew.querySelector('[data-crew-asof]').textContent = meta.asOf;
  AGENTS.forEach((a) => {
    const li = el('li', 'crew-port'); li.style.setProperty('--tone', BODY[a.id].tones[0]);
    li.append(el('b', '', a.label), el('span', 'cnt'), dot(null));
    li.key = '';
    ports.append(li);
  });
  await prepLogos();

  // Reduced motion: one still frame, mid-errand, where all four agents hold a logo (Shop works its second errand;
  // the others show their last one).
  const still = reduce ? 6 * D + times(at(6)).ta + 0.8 : NaN;
  const t0 = performance.now();
  const frame = (ts) => draw(Number.isFinite(still) ? still : (ts - t0) / 1000);
  const all = () => { if (layout()) frame(performance.now()); };
  all();
  crew.classList.add('is-ready');
  new ResizeObserver(all).observe(yard);
  hero.addEventListener('herolayout', all); // the wordmark's cell changed (fonts loaded, width changed)

  if (reduce) return;
  let on = false, raf = 0, last = 0;
  const tick = (ts) => {
    raf = 0;
    if (!on) return;
    if (ts - last > 32) { last = ts; frame(ts); }
    raf = requestAnimationFrame(tick);
  };
  new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on && !raf) raf = requestAnimationFrame(tick); }).observe(crew);
}
data.then(start, () => crew.remove());
