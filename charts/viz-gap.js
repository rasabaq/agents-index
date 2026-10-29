// Home page chart "gap": how far each country is from its next score. A dumbbell runs from today's score to the
// score if every limited and announced cell went live; the gap list ranks one country's pending cells by score gain.
(() => {
  const CSS = `
.v-gap .vg-head { margin: 0; max-width: 64ch; font-size: 19px; line-height: 1.45; font-weight: 500; color: var(--ink); text-wrap: balance; }
.v-gap .vg-head b { font-weight: 500; color: var(--sunrise); }
.v-gap .vg-legend { margin: 18px 0 10px; padding-top: 16px; border-top: 1px solid var(--line); }
.v-gap .vg-key { display: inline-flex; align-items: center; gap: 8px; }
.v-gap .vg-body { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 28px; align-items: start; }
.v-gap .vg-list { margin: 0; padding: 0; list-style: none; }
.v-gap .vg-row, .v-gap .vg-axis { display: grid; grid-template-columns: 64px minmax(0, 1fr) 40px; align-items: center; column-gap: 14px; }
.v-gap .vg-row { width: 100%; height: 30px; padding: 0 8px; border: 0; border-radius: 7px; background: none; text-align: left; cursor: pointer; }
.v-gap .vg-row:hover { background: rgba(255, 255, 255, 0.04); }
.v-gap .vg-row[aria-pressed='true'] { background: var(--surface-2); }
.v-gap .vg-row:focus-visible { outline-offset: -2px; }
.v-gap .vg-c { font: 500 11.5px/1 var(--mono); color: var(--ink-2); white-space: nowrap; }
.v-gap .vg-row[aria-pressed='true'] .vg-c { color: var(--ink); }
.v-gap .vg-c .flag { margin-right: 6px; }
/* gridlines every 25 points */
.v-gap .vg-track { position: relative; height: 100%; background: linear-gradient(90deg, var(--grid) 1px, transparent 0) 0 0 / 25% 100% repeat-x; box-shadow: inset -1px 0 var(--grid); }
.v-gap .vg-line { position: absolute; top: 50%; height: 2px; margin-top: -1px; background: rgba(255, 182, 114, 0.5); }
.v-gap .vg-now, .v-gap .vg-then { position: absolute; top: 50%; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; }
.v-gap .vg-now { background: var(--ink); box-shadow: 0 0 0 2px var(--surface); }
.v-gap .vg-then { border: 2px solid var(--sunrise); background: var(--surface); }
.v-gap .vg-key .vg-now, .v-gap .vg-key .vg-then { position: static; display: inline-block; margin: 0; box-sizing: border-box; }
.v-gap .vg-v { font: 400 11px/1 var(--mono); color: var(--muted); text-align: right; font-variant-numeric: tabular-nums; }
.v-gap .vg-axis { padding: 6px 8px 0; }
.v-gap .vg-ticks { position: relative; height: 14px; }
.v-gap .vg-ticks i { position: absolute; transform: translateX(-50%); font: 400 10.5px/1 var(--mono); font-style: normal; color: var(--muted); }
.v-gap .vg-side h3 { display: flex; align-items: center; gap: 8px; margin: 2px 0 4px; font-size: 16px; font-weight: 560; letter-spacing: -0.02em; }
.v-gap .vg-side > p { margin: 0 0 10px; font-size: 13.5px; color: var(--ink-2); }
.v-gap .vg-gaps { margin: 0; padding: 0; list-style: none; }
.v-gap .vg-gaps li { display: grid; grid-template-columns: 96px minmax(0, 1fr) auto; align-items: center; gap: 12px; min-height: 38px; padding: 6px 0; border-top: 1px solid var(--line); font-size: 13.5px; color: var(--ink-2); }
.v-gap .vg-gaps .chip { justify-self: start; }
.v-gap .vg-gain { font: 500 12px/1 var(--mono); color: var(--sunrise); white-space: nowrap; }
.v-gap .vg-none { color: var(--muted); }
.v-gap .vg-note { margin: 12px 0 0; font: 400 11px/1.5 var(--mono); color: var(--muted); }
@media (max-width: 900px) { .v-gap .vg-body { grid-template-columns: minmax(0, 1fr); } }
/* with many countries the list is long; the gap list stays in view beside it */
@media (min-width: 901px) { .v-gap .vg-side { position: sticky; top: 124px; } }
@media (max-width: 520px) {
  .v-gap .vg-head { font-size: 17px; }
  .v-gap .vg-row, .v-gap .vg-axis { grid-template-columns: 56px minmax(0, 1fr) 34px; column-gap: 10px; padding-left: 4px; padding-right: 4px; }
  .v-gap .vg-gaps li { grid-template-columns: 88px minmax(0, 1fr) auto; gap: 10px; }
}`;

  const PENDING = ['limited', 'announced'];

  (window.CHARTS ??= []).push({
    id: 'gap',
    title: 'One step away',
    blurb: 'How far is each country from its next jump? Each line runs from today’s score to the score if every limited and announced cell went live. Pick a country to see which of its pending cells would lift the score most.',
    render(el, ctx) {
      if (!document.getElementById('v-gap-style')) {
        const s = document.createElement('style');
        s.id = 'v-gap-style';
        s.textContent = CSS;
        document.head.append(s);
      }
      const { esc, flag, STATUSES: S } = ctx;
      const name = Object.fromEntries(ctx.meta.countries.map((c) => [c.code, c.name]));
      const the = (code) => (/^United /.test(name[code]) ? `the ${name[code]}` : name[code]);

      // The score if every pending cell went live, from the same scoring as the published score.
      const promoted = structuredClone(ctx.categories);
      for (const cat of promoted) for (const cap of cat.capabilities) for (const cell of Object.values(cap.countries)) if (PENDING.includes(cell.status)) cell.status = 'live';
      const potential = Object.fromEntries(ctx.scoreCountries(ctx.meta, promoted).map((r) => [r.code, r.score]));
      const pendingOf = (code) => ctx.capabilities.filter((cap) => PENDING.includes(cap.countries[code].status));
      const rows = ctx.ranking.map((r) => ({ ...r, potential: potential[r.code], pending: pendingOf(r.code).length }));
      const best = rows.reduce((b, r) => (r.potential - r.score > b.potential - b.score ? r : b));
      // One cell going live adds its missing points, shared across its category, then across the categories.
      const perCat = Object.fromEntries(ctx.categories.map((c) => [c.category, c.capabilities.length]));
      const gain = (cap, code) => ((1 - S[cap.countries[code].status].points) / perCat[cap.category] / ctx.categories.length) * 100;
      let focus = rows.some((r) => r.code === 'CL') ? 'CL' : rows[rows.length - 1].code;

      el.classList.add('v-gap');
      el.innerHTML = `
        <p class="vg-head">${esc(the(best.code)).replace(/^./, (c) => c.toUpperCase())} could gain the most: <b>+${best.potential - best.score}</b> points if its ${best.pending} limited and announced cells went live.</p>
        <div class="chart-legend vg-legend">
          <span class="vg-key"><span class="vg-now"></span>Score today</span>
          <span class="vg-key"><span class="vg-then"></span>If every pending cell went live</span>
        </div>
        <div class="vg-body">
          <div>
            <ol class="vg-list" aria-label="Score today and if pending cells went live">
              ${rows.map((r) => `<li><button type="button" class="vg-row" data-code="${r.code}" aria-pressed="false"
                aria-label="${esc(`${r.name}: ${r.score} today, ${r.potential} if ${r.pending} pending cells went live`)}">
                <span class="vg-c">${flag(r.code)}${r.code}</span>
                <span class="vg-track"><span class="vg-line" style="left:${r.score}%;width:${r.potential - r.score}%"></span><span class="vg-then" style="left:${r.potential}%"></span><span class="vg-now" style="left:${r.score}%"></span></span>
                <span class="vg-v">+${r.potential - r.score}</span>
              </button></li>`).join('')}
            </ol>
            <div class="vg-axis" aria-hidden="true"><span></span><span class="vg-ticks">${[0, 25, 50, 75, 100].map((t) => `<i style="left:${t}%">${t}</i>`).join('')}</span><span></span></div>
          </div>
          <div class="vg-side" aria-live="polite"></div>
        </div>
        <p class="vg-note">Gain: points this one cell adds if it goes live. A capability in a category with fewer capabilities moves the score more, because every category weighs the same.</p>`;
      const list = el.querySelector('.vg-list');

      function draw() {
        list.querySelectorAll('.vg-row').forEach((b) => b.setAttribute('aria-pressed', b.dataset.code === focus));
        const r = rows.find((q) => q.code === focus);
        const gaps = pendingOf(focus).map((cap) => ({ cap, g: gain(cap, focus) })).sort((a, b) => b.g - a.g || a.cap.name.localeCompare(b.cap.name));
        const cell = (cap) => cap.countries[focus];
        el.querySelector('.vg-side').innerHTML = `
          <h3>${flag(focus)}${esc(r.name)}</h3>
          <p>${r.score} today, ${r.potential} if all ${r.pending} pending ${r.pending === 1 ? 'cell' : 'cells'} went live. Click a country to switch.</p>
          <ul class="vg-gaps">${gaps.length ? gaps.map(({ cap, g }) => `<li>
            <span class="chip s-${cell(cap).status}">${S[cell(cap).status].label}${cell(cap).confidence === 'low' ? '<span class="low" title="Low confidence">?</span>' : ''}</span>
            <span>${esc(cap.name)}</span><span class="vg-gain">+${g.toFixed(1)}</span></li>`).join('')
            : '<li><span></span><span class="vg-none">No pending cells: everything is live or not yet.</span><span></span></li>'}</ul>`;
      }
      list.addEventListener('click', (e) => {
        const b = e.target.closest('.vg-row');
        if (!b) return;
        focus = b.dataset.code;
        draw();
      });
      list.addEventListener('pointermove', (e) => {
        const b = e.target.closest('.vg-row');
        if (!b) return ctx.tip.hide();
        const r = rows.find((q) => q.code === b.dataset.code);
        ctx.tip.show(e, `<strong>${flag(r.code)}${esc(r.name)}</strong>${r.score} today, ${r.potential} if its ${r.pending} pending ${r.pending === 1 ? 'cell' : 'cells'} went live.`);
      });
      list.addEventListener('pointerleave', () => ctx.tip.hide());
      draw();
    },
  });
})();
