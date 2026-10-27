// Agent Atlas view "range": each country's score drawn as a range, not a point. A low-confidence cell may be
// one status step off, so the band runs from every such cell one step lower to every such cell one step higher.
(() => {
  const CSS = `
.v-range .vr-head { margin: 0; max-width: 64ch; font-size: 19px; line-height: 1.45; font-weight: 500; color: var(--ink); text-wrap: balance; }
.v-range .vr-head b { font-weight: 500; color: var(--sunrise); }
.v-range .vr-sub { margin: 6px 0 0; font-size: 14px; color: var(--ink-2); }
.v-range .vr-legend { margin: 18px 0 10px; padding-top: 16px; border-top: 1px solid var(--line); }
.v-range .vr-key { display: inline-flex; align-items: center; gap: 8px; }
.v-range .vr-list { margin: 0; padding: 0; list-style: none; }
.v-range .vr-row, .v-range .vr-axis { display: grid; grid-template-columns: 64px minmax(0, 1fr) 76px; align-items: center; column-gap: 14px; }
.v-range .vr-row { width: 100%; height: 30px; padding: 0 8px; border: 0; border-radius: 7px; background: none; text-align: left; cursor: pointer; }
.v-range .vr-row:hover { background: rgba(255, 255, 255, 0.04); }
.v-range .vr-row[aria-pressed='true'] { background: var(--surface-2); }
.v-range .vr-row:focus-visible { outline-offset: -2px; }
.v-range .vr-c { font: 500 11.5px/1 var(--mono); color: var(--ink-2); white-space: nowrap; }
.v-range .vr-row[aria-pressed='true'] .vr-c { color: var(--ink); }
.v-range .vr-c .flag { margin-right: 6px; }
/* the track carries a gridline every 10 points; --step is the width of 10 points */
.v-range .vr-track { position: relative; height: 100%; background: linear-gradient(90deg, var(--grid) 1px, transparent 0) 0 0 / var(--step) 100% repeat-x; box-shadow: inset -1px 0 var(--grid); }
.v-range .vr-band { position: absolute; top: 50%; height: 8px; margin: -4px 0 0 -4px; padding-right: 8px; box-sizing: content-box; border-radius: 4px; background: rgba(176, 179, 194, 0.35); }
.v-range .vr-band.sh, .v-range .vr-key .vr-band.sh { background: linear-gradient(90deg, rgba(255, 182, 114, 0.3), rgba(255, 182, 114, 0.85)); }
.v-range .vr-dot { position: absolute; top: 50%; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; background: var(--ink); box-shadow: 0 0 0 2px var(--surface); }
.v-range .vr-v { font: 400 11px/1 var(--mono); color: var(--muted); text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.v-range .vr-v.sh { color: var(--sunrise); }
.v-range .vr-key .vr-band, .v-range .vr-key .vr-dot { position: static; display: inline-block; margin: 0; }
.v-range .vr-key .vr-band { width: 22px; padding: 0; }
.v-range .vr-axis { padding: 6px 8px 0; }
.v-range .vr-ticks { position: relative; height: 14px; }
.v-range .vr-ticks i { position: absolute; transform: translateX(-50%); font: 400 10.5px/1 var(--mono); font-style: normal; color: var(--muted); }
.v-range .vr-credit { margin: 16px 0 0; font: 400 11px/1.5 var(--mono); color: var(--muted); }
@media (max-width: 520px) {
  .v-range .vr-head { font-size: 17px; }
  .v-range .vr-row, .v-range .vr-axis { grid-template-columns: 56px minmax(0, 1fr) 62px; column-gap: 10px; padding-left: 4px; padding-right: 4px; }
}`;

  const LEVELS = ['none', 'announced', 'limited', 'live'];

  // Scores with every low-confidence cell moved `step` status levels, kept within None..Live.
  function shiftedScores(ctx, step) {
    const categories = structuredClone(ctx.categories);
    for (const cat of categories) {
      for (const cap of cat.capabilities) {
        for (const cell of Object.values(cap.countries)) {
          if (cell.confidence === 'low') cell.status = LEVELS[Math.min(3, Math.max(0, LEVELS.indexOf(cell.status) + step))];
        }
      }
    }
    return Object.fromEntries(ctx.scoreCountries(ctx.meta, categories).map((r) => [r.code, r.score]));
  }

  (window.ATLAS_VIEWS ??= []).push({
    id: 'range',
    title: 'Score ranges',
    blurb: 'How firm is each score? A low-confidence cell may be one status step off, so each score is drawn as a range: from every such cell one step lower to every such cell one step higher. The dot is the published score.',
    render(el, ctx) {
      if (!document.getElementById('v-range-style')) {
        const s = document.createElement('style');
        s.id = 'v-range-style';
        s.textContent = CSS;
        document.head.append(s);
      }
      const { esc, flag, STATUSES: S } = ctx;
      const name = Object.fromEntries(ctx.meta.countries.map((c) => [c.code, c.name]));
      const the = (code) => (/^United /.test(name[code]) ? `the ${name[code]}` : name[code]);
      const lo = shiftedScores(ctx, -1), hi = shiftedScores(ctx, 1);
      const rows = ctx.ranking.map((r) => ({
        ...r, lo: lo[r.code], hi: hi[r.code],
        lows: ctx.capabilities.filter((cap) => cap.countries[r.code].confidence === 'low'),
      }));
      // A rank is not firm when its band overlaps the band of the country just above or below it.
      const shaky = new Set();
      rows.slice(1).forEach((b, i) => {
        if (b.hi >= rows[i].lo) shaky.add(rows[i].code).add(b.code);
      });
      const widest = rows.reduce((w, r) => (r.hi - r.lo > w.hi - w.lo ? r : w));
      let focus = rows.some((r) => r.code === 'CL') ? 'CL' : rows[0].code;

      const min = Math.floor(Math.min(...rows.map((r) => r.lo)) / 10) * 10;
      const x = (v) => ((v - min) / (100 - min)) * 100;
      const ticks = Array.from({ length: (100 - min) / 10 + 1 }, (_, i) => min + i * 10);

      el.classList.add('v-range');
      el.innerHTML = `
        <p class="vr-head">${shaky.size
          ? `<b>${shaky.size} of ${rows.length}</b> countries could swap places with a neighbour if their low-confidence cells are one step off. ${esc(the(widest.code)).replace(/^./, (c) => c.toUpperCase())} has the widest range: <b>${widest.lo}–${widest.hi}</b>.`
          : 'Every rank holds, even if each low-confidence cell is one step off.'}</p>
        <p class="vr-sub" aria-live="polite"></p>
        <div class="atlas-legend vr-legend">
          <span class="vr-key"><span class="vr-dot"></span>Published score</span>
          <span class="vr-key"><span class="vr-band"></span>Range</span>
          <span class="vr-key"><span class="vr-band sh"></span>Overlaps a neighbour, so the rank could swap</span>
        </div>
        <ol class="vr-list" style="--step:${(10 / (100 - min)) * 100}%" aria-label="Score range by country">
          ${rows.map((r) => `<li><button type="button" class="vr-row" data-code="${r.code}" aria-pressed="false"
            aria-label="${esc(`${r.name}: published ${r.score}, range ${r.lo} to ${r.hi}${shaky.has(r.code) ? ', overlaps a neighbour' : ''}`)}">
            <span class="vr-c">${flag(r.code)}${r.code}</span>
            <span class="vr-track">${r.hi > r.lo ? `<span class="vr-band${shaky.has(r.code) ? ' sh' : ''}" style="left:${x(r.lo)}%;width:${x(r.hi) - x(r.lo)}%"></span>` : ''}<span class="vr-dot" style="left:${x(r.score)}%"></span></span>
            <span class="vr-v${shaky.has(r.code) ? ' sh' : ''}">${r.hi > r.lo ? `${r.lo}–${r.hi}` : `${r.score} firm`}</span>
          </button></li>`).join('')}
        </ol>
        <div class="vr-axis" aria-hidden="true"><span></span><span class="vr-ticks">${ticks.map((t) => `<i style="left:${x(t)}%">${t}</i>`).join('')}</span><span></span></div>
        <p class="vr-credit">Idea: <a href="https://x.com/Sci_eMotion/status/2094685100034208012" target="_blank" rel="noopener noreferrer">@Sci_eMotion on X</a>, “communicate the range, not just the centre”.</p>`;
      const list = el.querySelector('.vr-list');

      function draw() {
        list.querySelectorAll('.vr-row').forEach((b) => b.setAttribute('aria-pressed', b.dataset.code === focus));
        const r = rows.find((q) => q.code === focus);
        el.querySelector('.vr-sub').innerHTML = r.lows.length
          ? `${flag(r.code)}${esc(r.name)}: published ${r.score}, range ${r.lo}–${r.hi}, from ${r.lows.length} low-confidence ${r.lows.length === 1 ? 'cell' : 'cells'}. Click a country to see its range.`
          : `${flag(r.code)}${esc(r.name)}: ${r.score}, with no low-confidence cells, so the score is firm. Click a country to see its range.`;
      }
      list.addEventListener('click', (e) => {
        const b = e.target.closest('.vr-row');
        if (!b) return;
        focus = b.dataset.code;
        draw();
      });
      list.addEventListener('pointermove', (e) => {
        const b = e.target.closest('.vr-row');
        if (!b) return ctx.tip.hide();
        const r = rows.find((q) => q.code === b.dataset.code);
        const cells = r.lows.map((cap) => `<br>${S[cap.countries[r.code].status].label}: ${esc(cap.name)}`).join('');
        ctx.tip.show(e, `<strong>${flag(r.code)}${esc(r.name)} · ${r.score}</strong>Range ${r.lo}–${r.hi}${shaky.has(r.code) ? ', overlaps a neighbour' : ''}.${cells ? `<br>Low-confidence cells:${cells}` : ''}`);
      });
      list.addEventListener('pointerleave', () => ctx.tip.hide());
      draw();
    },
  });
})();
