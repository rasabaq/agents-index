// The country overview: a mosaic of every capability and a small fingerprint. Both return HTML strings and touch no DOM.
// capIndex maps a capability id to { ...capability, category } (as app.js builds it); a cell is cap.countries[code].
import { STATUSES } from './src/observatory.js';
import { esc, flag } from './ui.js';

// One shape per gap reason, so colour is never the only signal. 'unknown' is a cell with no reason recorded.
const SHAPES = {
  'not-launched': '<path d="M5 .2L9.8 5 5 9.8.2 5z"/>',
  'pilot-only': '<circle cx="5" cy="5" r="4.4"/>',
  'assist-only': '<path d="M2.6.7h4.8L9.9 5 7.4 9.3H2.6L.1 5z"/>',
  'no-rule': '<path d="M5 .6l4.6 8.4H.4z"/>',
  'rail-closed': '<rect x="1" y="1" width="8" height="8" rx="1"/>',
  unknown: '<circle cx="5" cy="5" r="3.4" fill="none" stroke="currentColor" stroke-width="1.8"/>',
};
const NO_REASON = 'No reason recorded';
const shape = (r) => `<svg class="ov-r" data-r="${r}" viewBox="0 0 10 10" aria-hidden="true">${SHAPES[r]}</svg>`;
const capsOf = (capIndex, catId) => Object.values(capIndex).filter((cap) => cap.category === catId);
const nameOf = (meta, code) => meta.countries.find((c) => c.code === code).name;

export function mosaic({ meta, capIndex, code, gapLabel, errandOf = {}, openErrand = [] }) {
  const caps = Object.values(capIndex);
  const reasonOf = (cell) => (gapLabel(cell.gapReason) && SHAPES[cell.gapReason] ? cell.gapReason : 'unknown');
  const labelOf = (r) => (r === 'unknown' ? NO_REASON : gapLabel(r));
  // With no errands at all, nothing is marked "Not in an errand".
  const errands = Object.keys(errandOf).length > 0;
  const open = new Set(openErrand);
  const gaps = caps.filter((cap) => cap.countries[code].status !== 'live');
  const inErrand = caps.filter((cap) => errandOf[cap.id]).length;
  const count = {};
  for (const r of gaps.map((cap) => reasonOf(cap.countries[code]))) count[r] = (count[r] ?? 0) + 1;

  const square = (cap) => {
    const cell = cap.countries[code];
    const gap = cell.status !== 'live';
    const r = gap && reasonOf(cell);
    const status = `${STATUSES[cell.status].label}${cell.confidence ? ', unsure' : ''}`;
    const where = errandOf[cap.id] ? `In ${errandOf[cap.id]}.` : errands && 'Not in an errand.';
    const aria = [`${cap.name}: ${status}.`, gap && `${labelOf(r)}.`, where, 'Show details.'].filter(Boolean).join(' ');
    const cls = ['ov-sq', `st-${cell.status}`, gap && 'gap', errands && !errandOf[cap.id] && 'ov-noe', open.has(cap.id) && 'ov-open'].filter(Boolean).join(' ');
    return `<button type="button" class="${cls}"${gap ? ` data-r="${r}"` : ''} data-cap="${esc(cap.id)}" data-code="${esc(code)}" title="${esc(`${cap.name}: ${status}`)}" aria-label="${esc(aria)}">
      <i class="dot d-${cell.status}${cell.confidence ? ' q' : ''}" aria-hidden="true"></i>${gap ? shape(r) : ''}</button>`;
  };
  const group = (cat) => {
    const mine = capsOf(capIndex, cat.id);
    const live = mine.filter((cap) => cap.countries[code].status === 'live').length;
    return `<section class="ov-cat" aria-label="${esc(`${cat.name}: ${live} of ${mine.length} live`)}"><h3 class="label"><span>${esc(cat.short)}</span><span>${live}/${mine.length} live</span></h3>
      <div class="ov-sqs">${mine.map(square).join('')}</div></section>`;
  };
  const name = nameOf(meta, code);
  const openName = errandOf[openErrand[0]];
  const key = [
    ...Object.keys(SHAPES).filter((r) => count[r]).map((r) => `<span data-r="${r}">${shape(r)}${esc(labelOf(r))} <b>${count[r]}</b></span>`),
    errands && `<span><i class="ov-sw ov-noe" aria-hidden="true"></i>Not in an errand <b>${caps.length - inErrand}</b></span>`,
    openName && `<span><i class="ov-sw ov-open" aria-hidden="true"></i>In “${esc(openName)}”</span>`,
    caps.some((cap) => cap.countries[code].confidence) && '<span><i class="dot d-live q" aria-hidden="true"></i>Unsure (thin sources)</span>',
  ].filter(Boolean).join('');

  return `<section class="card panel ov" aria-labelledby="ov-title">
    <header class="ov-h"><h2 id="ov-title">All ${caps.length} things we track in ${/^United /.test(name) ? 'the ' : ''}${flag(code)}${esc(name)}</h2>
      <p class="label">${caps.length - gaps.length} live · ${gaps.length} gaps${errands ? ` · ${inErrand} in an errand` : ''}</p></header>
    <p class="ov-sub">One square per thing an agent might do, grouped by area. Calm squares work today; gaps are coloured and shaped by why they are gaps. Press a square for the details.</p>
    <p class="ov-key">${key}</p>
    <div class="ov-grid">${meta.categories.map(group).join('')}</div>
  </section>`;
}

// A rose: one petal per category, one slice per capability. A slice's length is its status points (live full,
// limited half, announced a quarter, not yet empty), so the filled area is the country's score at a glance.
const R0 = 74, R = 200, PAD = 3.5, IPAD = 0.8;
const pt = (a, r) => { const t = (a * Math.PI) / 180; return `${(r * Math.cos(t)).toFixed(1)} ${(r * Math.sin(t)).toFixed(1)}`; };
const sector = (a0, a1, r0, r1) => `M${pt(a0, r1)}A${r1} ${r1} 0 0 1 ${pt(a1, r1)}L${pt(a1, r0)}A${r0} ${r0} 0 0 0 ${pt(a0, r0)}Z`;

export function fingerprint({ meta, capIndex, code, score }) {
  const step = 360 / meta.categories.length;
  const parts = [];
  const slices = meta.categories.flatMap((cat, ci) => {
    const caps = capsOf(capIndex, cat.id);
    const w = (step - 2 * PAD - IPAD * (caps.length - 1)) / caps.length;
    parts.push(`${cat.short} ${caps.filter((cap) => cap.countries[code].status === 'live').length} of ${caps.length}`);
    return caps.map((cap, k) => {
      const a0 = -90 + ci * step + PAD + k * (w + IPAD), a1 = a0 + w;
      const p = STATUSES[cap.countries[code].status].points;
      return `<g><path class="fp-slot" d="${sector(a0, a1, R0, R)}"/>${p ? `<path class="fp-fill" d="${sector(a0, a1, R0, R0 + (R - R0) * p)}"/>` : ''}</g>`;
    });
  });
  const live = Object.values(capIndex).filter((cap) => cap.countries[code].status === 'live').length;
  const label = `Fingerprint of ${nameOf(meta, code)}, score ${score} of 100. Live: ${parts.join(', ')}. Each slice is one thing we track; a longer slice is closer to working.`;
  return `<svg class="fp" viewBox="-204 -204 408 408" role="img" aria-label="${esc(label)}"><title>${esc(`${live} of ${slices.length} live, score ${score}. ${parts.join(', ')} live.`)}</title>
    ${slices.join('')}<text class="fp-n" y="20">${esc(score)}</text></svg>`;
}
