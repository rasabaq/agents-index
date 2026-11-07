// The cell detail dialog, shared by the home page (app.js) and the countries page (countries.js). Both pages have the
// same <dialog data-detail>. `site` is the page's data, built once by siteOf.
import { STATUSES, scoreCountries, couldClose, companiesFor, gapLabel } from './src/observatory.js';
import { findStep } from './src/errands.js';
import { $, esc, flag, chip } from './ui.js';

// The page's data: the ranking (scoreCountries), byCode (a country code to its ranking row), capIndex (a capability id
// to { ...capability, category }) and region (a country code to its region).
export function siteOf(meta, categories) {
  const ranking = scoreCountries(meta, categories);
  return {
    meta,
    categories,
    ranking,
    byCode: Object.fromEntries(ranking.map((r) => [r.code, r])),
    capIndex: Object.fromEntries(categories.flatMap((cat) => cat.capabilities.map((cap) => [cap.id, { ...cap, category: cat.category }]))),
    region: Object.fromEntries(ranking.map((r) => [r.code, r.region])),
  };
}

const catName = (site, id) => site.meta.categories.find((c) => c.id === id).name;

function correctionUrl(site, cap, code, cell) {
  // Fills the data-correction issue form (.github/ISSUE_TEMPLATE/data-correction.yml); the keys are its field ids.
  const q = new URLSearchParams({
    template: 'data-correction.yml',
    title: `Correction: ${cap.id} in ${code}`,
    country: `${site.byCode[code].name} (${code})`,
    capability: `${cap.name} (${cap.id})`,
    current: STATUSES[cell.status].label,
  });
  return `https://github.com/rasabaq/agents-index/issues/new?${q}`;
}

export const sourceList = (ev) => `<ol class="sources">${ev.map((e) => `
  <li><a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(e.title)}</a>
    <span class="src-meta"><span class="tag">${esc(e.type)}</span>${esc(e.publisher ?? '')}${e.date ? ` · ${esc(e.date)}` : ''}${e.caps ? ` · ${esc(e.caps.join(', '))}` : ''}</span></li>`).join('')}</ol>`;

export function showDetail(html) {
  $('[data-detail-body]').innerHTML = html;
  const tip = $('[data-tip]');
  if (tip) tip.hidden = true;
  $('[data-detail]').showModal();
}

// One capability in one country. `errands` is the errand list the page shows, to say which step uses it.
export function openDetail(site, capId, code, errands) {
  const { categories, capIndex, byCode, ranking, region } = site;
  const cap = capIndex[capId];
  const cell = cap.countries[code];
  const ev = cell.evidence ?? [];
  const catCos = categories.find((c) => c.category === cap.category).companies;
  // Companies already live nearby that could bring a missing capability here.
  const cos = cell.status === 'live' ? [] : couldClose(catCos, cap.id, code, region).slice(0, 3);
  // Who to sign up with. Not on a Not yet cell: a company's markets cover its whole category, so it could name one
  // that does not offer this capability here.
  const here = cell.status === 'none' ? [] : companiesFor(catCos, cap.id, code);
  const at = findStep(errands, capId);
  // Why a cell is not live yet, when the data says (the same words as the gap reasons on each page).
  const why = cell.status === 'live' ? null : gapLabel(site.meta, cell.gapReason);
  const liveIn = ranking.map((x) => x.code).filter((c) => c !== code && cap.countries[c].status === 'live');
  showDetail(`
    <p class="kicker">${esc(catName(site, cap.category))} · ${flag(code)}${esc(byCode[code].name)}</p>
    <h3 id="detail-title">${esc(cap.question)}</h3>
    <p class="detail-status">${chip(cell.status, cell.confidence)}${why ? `<span class="detail-why">${esc(why)}</span>` : ''}${cell.confidence ? '<span class="low-note">Unsure. The sources are thin or indirect, so treat this as a lead to check.</span>' : ''}</p>
    <p>${esc(cell.note)}</p>
    <div class="d-facts">
      ${at ? `<p>In <b>${esc(at.errand.title)}</b>, step ${at.index + 1}: “${esc(at.errand.labels[capId])}”.</p>` : ''}
      <p>${liveIn.length ? `Live in: ${liveIn.map((c) => `${flag(c)}${c}`).join(' ')}` : 'Not live in any other country yet.'}</p>
      ${here.length ? `<p>${cell.status === 'live' ? 'Sign up with' : 'Active here'}: ${here.map((co) => `<a href="${esc(co.homepage ?? co.url)}" target="_blank" rel="noopener noreferrer">${esc(co.name)}</a>`).join(', ')}</p>` : ''}
      ${cos.length ? `<p class="detail-close">Could close the gap: ${cos.map((co) => `${esc(co.name)} (already in ${co.near.map((m) => `${flag(m)}${m}`).join(' ')})`).join(', ')}</p>` : ''}
    </div>
    <h4>${ev.length ? `Sources (${ev.length})` : 'Sources'}</h4>
    ${ev.length ? sourceList(ev) : '<p class="muted">No availability found. Nothing to cite yet.</p>'}
    <p class="suggest"><a href="${esc(correctionUrl(site, cap, code, cell))}" target="_blank" rel="noopener noreferrer">${cell.status === 'live' ? 'Suggest a correction' : 'Seen it work here? Tell us'}</a></p>`);
}
