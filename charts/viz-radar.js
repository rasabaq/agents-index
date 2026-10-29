// Home page chart: country fingerprints. One radar per country (one spoke per category, 0–100),
// plus a large compare radar that overlays two countries.
(() => {
  const RINGS = [25, 50, 75, 100];

  // Splits a long category name into two lines for the wide compare chart.
  const lines = (name) => {
    if (name.includes(' & ')) { const [a, b] = name.split(' & '); return [`${a} &`, b]; }
    const i = name.lastIndexOf(' ');
    return name.length > 14 && i > 0 ? [name.slice(0, i), name.slice(i + 1)] : [name];
  };

  const STYLE = `
.v-radar { font-family: var(--font); }
.v-radar h3 { margin: 0; font: 500 11px/1.4 var(--mono); letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-2); }
.v-radar .bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
.v-radar .bar h3 { margin-right: 4px; }
.v-radar .pick { display: inline-flex; align-items: center; gap: 8px; }
.v-radar .vs { color: var(--muted); font: 400 11.5px/1 var(--mono); }
.v-radar .sw, .v-radar-k { display: inline-block; flex: none; width: 10px; height: 10px; border-radius: 3px; }
.v-radar .c1, .v-radar-k.c1 { background: var(--c1); }
.v-radar .c2, .v-radar-k.c2 { background: var(--c2); }
.v-radar .body { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 340px); gap: 16px 32px; align-items: center; margin-top: 8px; }
.v-radar .plot { min-width: 0; }
.v-radar .big { display: block; margin: 0 auto; }
.v-radar .ring, .v-radar .spoke { fill: none; stroke: var(--grid); stroke-width: 1; vector-effect: non-scaling-stroke; }
.v-radar .spoke.on { stroke: var(--line-strong); }
.v-radar .shape { fill: var(--accent); fill-opacity: 0.12; stroke: var(--accent); stroke-width: 2; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
.v-radar .shape.s1 { fill: var(--c1); stroke: var(--c1); }
.v-radar .shape.s2 { fill: var(--c2); stroke: var(--c2); }
.v-radar .rd-dot { display: none; fill: var(--accent); stroke: var(--surface); stroke-width: 2; vector-effect: non-scaling-stroke; }
.v-radar .rd-dot.s1 { fill: var(--c1); }
.v-radar .rd-dot.s2 { fill: var(--c2); }
.v-radar .rd-dot.on, .v-radar .rd-dot.keep { display: inline; }
.v-radar .hit { fill: transparent; }
.v-radar svg text.axis { fill: var(--ink-2); font-size: 13px; }
.v-radar svg text.tick { fill: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; paint-order: stroke; stroke: var(--surface); stroke-width: 3px; stroke-linejoin: round; }
.v-radar svg text.dl { fill: var(--ink); font-size: 13px; font-weight: 600; paint-order: stroke; stroke: var(--surface); stroke-width: 4px; stroke-linejoin: round; pointer-events: none; }
.v-radar .tbl { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.v-radar .tbl th, .v-radar .tbl td { padding: 7px 0; border-bottom: 1px solid var(--line); text-align: left; font-weight: 400; color: var(--ink-2); }
.v-radar .tbl td, .v-radar .tbl thead th + th { width: 64px; text-align: right; color: var(--ink); font-variant-numeric: tabular-nums; }
.v-radar .tbl thead th { padding-top: 0; font: 500 10.5px/1.4 var(--mono); letter-spacing: 0.08em; color: var(--muted); white-space: nowrap; }
.v-radar .tbl thead th:first-child { letter-spacing: 0.16em; text-transform: uppercase; }
.v-radar .tbl thead .sw { margin-right: 6px; vertical-align: -1px; }
.v-radar .tbl td.hi { font-weight: 650; }
.v-radar .tbl tfoot th, .v-radar .tbl tfoot td { border-bottom: 0; font-weight: 600; color: var(--ink); }
.v-radar .tbl tbody tr.on > * { background: var(--surface-2); }
.v-radar .tbl tbody th { padding-left: 4px; }
.v-radar .tbl tbody td:last-child { padding-right: 4px; }
.v-radar .head { margin: 28px 0 14px; padding-top: 24px; border-top: 1px solid var(--line); }
.v-radar .head p { margin: 6px 0 0; font-size: 13px; color: var(--muted); }
.v-radar .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.v-radar .rd-card { position: relative; display: flex; flex-direction: column; gap: 8px; padding: 14px; border: 1px solid var(--line); border-radius: 12px; background: rgba(3, 3, 8, 0.55); color: var(--ink); font: inherit; text-align: left; cursor: pointer; }
.v-radar .rd-card:hover { border-color: var(--line-strong); }
/* mini shapes stay grey; the two countries in the compare chart take its colors */
.v-radar .rd-card .shape { fill: var(--ink-2); fill-opacity: 0.08; stroke: var(--ink-2); stroke-width: 1.5; }
.v-radar .rd-card .rd-dot { fill: var(--ink-2); }
.v-radar .rd-card[data-k='1'] { border-color: color-mix(in srgb, var(--c1) 45%, var(--line)); }
.v-radar .rd-card[data-k='2'] { border-color: color-mix(in srgb, var(--c2) 45%, var(--line)); box-shadow: 0 0 26px -10px rgba(255, 160, 80, 0.45); }
.v-radar .rd-card[data-k='1'] .shape, .v-radar .rd-card[data-k='1'] .rd-dot { fill: var(--c1); stroke: var(--c1); }
.v-radar .rd-card[data-k='2'] .shape, .v-radar .rd-card[data-k='2'] .rd-dot { fill: var(--c2); stroke: var(--c2); }
.v-radar .rd-card[data-k] .shape { fill-opacity: 0.12; }
.v-radar .rd-card[data-k] .rd-dot { stroke: var(--surface); }
.v-radar .rd-card:focus-visible { border-radius: 12px; }
.v-radar .rd-card svg { display: block; width: 100%; height: auto; overflow: visible; }
.v-radar .rank { position: absolute; top: 12px; left: 12px; font: 500 11px/1 var(--mono); color: var(--muted); font-variant-numeric: tabular-nums; }
.v-radar .rd-card .sw { position: absolute; top: 13px; right: 12px; }
.v-radar .cap { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; font-size: 13.5px; line-height: 1.35; }
.v-radar .name { min-width: 0; font-weight: 500; }
.v-radar .score { font-weight: 600; font-variant-numeric: tabular-nums; }
.v-radar-tip-row { display: flex; align-items: center; gap: 6px; }
.v-radar-tip-row b { min-width: 22px; font-variant-numeric: tabular-nums; }
.v-radar-k { width: 12px; height: 2px; border-radius: 1px; }
.v-radar-m { opacity: 0.75; }
@media (max-width: 860px) { .v-radar .body { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 640px) {
  .v-radar .bar h3 { flex: 1 1 100%; }
  .v-radar .pick { flex: 1 1 100%; }
  .v-radar .pick .select, .v-radar .pick select { flex: 1; width: 100%; }
  .v-radar .vs { display: none; }
  .v-radar .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .v-radar .rd-card { padding: 12px 10px 10px; }
}`;

  (window.CHARTS ??= []).push({
    id: 'radar',
    title: 'Country fingerprints',
    blurb: 'What shape is each country’s agent readiness? Each spoke is one category, scored from 0 at the centre to 100 at the edge, so a big, round shape means agents can do a lot across the board.',
    render(el, ctx) {
      if (!document.getElementById('v-radar-style')) document.head.insertAdjacentHTML('beforeend', `<style id="v-radar-style">${STYLE}</style>`);
      const { esc, emoji, flag, ranking, byCode, tip } = ctx;
      const cats = ctx.meta.categories;
      const N = cats.length, STEP = (2 * Math.PI) / N;

      // live[code][categoryId] = number of live capabilities; total[categoryId] = capabilities in it.
      const live = {}, total = {};
      for (const c of ctx.categories) {
        total[c.category] = c.capabilities.length;
        for (const r of ranking) (live[r.code] ??= {})[c.category] = c.capabilities.filter((k) => k.countries[r.code]?.status === 'live').length;
      }
      const vals = (code) => cats.map((c) => byCode[code].byCategory[c.id]);
      const xy = (i, rad) => [Math.sin(i * STEP) * rad, -Math.cos(i * STEP) * rad];
      const f = (n) => n.toFixed(1);
      const poly = (vs, r) => vs.map((v, i) => xy(i, (r * v) / 100).map(f).join(',')).join(' ');
      const base = (r) =>
        RINGS.map((v) => `<polygon class="ring" points="${poly(Array(N).fill(v), r)}"/>`).join('') +
        cats.map((c, i) => { const [x, y] = xy(i, r); return `<line class="spoke" data-i="${i}" x2="${f(x)}" y2="${f(y)}"/>`; }).join('');
      const dots = (vs, r, cls, size = 4.5) => vs.map((v, i) => { const [x, y] = xy(i, (r * v) / 100); return `<circle class="rd-dot ${cls}" data-i="${i}" cx="${f(x)}" cy="${f(y)}" r="${size}"/>`; }).join('');
      const arc = d3.arc();
      const wedges = (r) => cats.map((c, i) => `<path class="hit" data-i="${i}" d="${arc({ innerRadius: 0, outerRadius: r, startAngle: i * STEP - STEP / 2, endAngle: i * STEP + STEP / 2 })}"/>`).join('');
      const liveOf = (code, id) => `${live[code][id]} of ${total[id]} capabilities live`;
      const flagName = (code) => `${flag(code)}${esc(byCode[code].name)}`;

      let pair = [byCode.US ? 'US' : ranking[0].code, byCode.CL ? 'CL' : ranking[1].code];
      if (pair[0] === pair[1]) pair[1] = ranking.find((r) => r.code !== pair[0]).code;

      const options = ranking.map((r) => `<option value="${r.code}">${emoji(r.code)} ${esc(r.name)}</option>`).join('');
      const pick = (k) => `<span class="pick"><span class="sw c${k + 1}" aria-hidden="true"></span><label class="select"><span class="sr-only">${k ? 'Second' : 'First'} country</span><select data-pick="${k}">${options}</select></label></span>`;
      el.innerHTML = `<div class="v-radar">
        <section aria-label="Compare two countries">
          <div class="bar"><h3>Compare</h3>${pick(0)}<span class="vs">vs</span>${pick(1)}</div>
          <div class="body"><div class="plot"><svg class="big" role="img"></svg></div><table class="tbl"></table></div>
        </section>
        <div class="head"><h3>All ${ranking.length} countries, by rank</h3><p>Same spokes as the chart above, clockwise from Shopping at the top. Rings mark 25, 50, 75 and 100. Select a country to compare it.</p></div>
        <div class="grid">${ranking.map((r) => `
          <button type="button" class="rd-card" data-code="${r.code}" aria-label="${esc(`${r.name}, rank ${r.rank}, score ${r.score}. ${cats.map((c) => `${c.name} ${r.byCategory[c.id]}`).join(', ')}. Select to compare.`)}">
            <span class="rank">${r.rank}</span><span class="sw" aria-hidden="true"></span>
            <svg viewBox="-104 -104 208 208" aria-hidden="true">${base(96)}<polygon class="shape" points="${poly(vals(r.code), 96)}"/>${dots(vals(r.code), 96, '', 6)}${wedges(104)}</svg>
            <span class="cap"><span class="name">${flagName(r.code)}</span><span class="score">${r.score}</span></span>
          </button>`).join('')}
        </div>
      </div>`;

      const big = el.querySelector('.big'), plot = el.querySelector('.plot'), tbl = el.querySelector('.tbl'), grid = el.querySelector('.grid');
      const selects = [...el.querySelectorAll('select')];

      // Highlights spoke i (and its hover dots) inside root; -1 clears.
      const mark = (root, i) => {
        el.querySelectorAll('.on').forEach((n) => n.classList.remove('on'));
        if (root && i >= 0) root.querySelectorAll(`[data-i="${i}"]:not(.hit)`).forEach((n) => n.classList.add('on'));
      };

      const drawCompare = () => {
        const W = plot.clientWidth;
        if (!W) return;
        const [a, b] = pair, va = vals(a), vb = vals(b);
        // On phones a two-word short label stacks, so a side spoke ("General agents") does not shrink the chart.
        const labels = cats.map((c) => (W >= 480 ? lines(c.name) : (c.short ?? c.name).split(' ')));
        // Measure label widths, then pick the largest radius that keeps every label inside W.
        big.innerHTML = labels.map((ls) => `<text class="axis">${ls.map((l) => `<tspan x="0">${esc(l)}</tspan>`).join('')}</text>`).join('');
        const widths = [...big.querySelectorAll('text')].map((t) => t.getBBox().width);
        const OFF = 12, LH = 16;
        let r = Math.min(200, W / 2 - 8);
        cats.forEach((c, i) => { const s = Math.abs(Math.sin(i * STEP)); if (s > 0.3) r = Math.min(r, (W / 2 - 2 - widths[i]) / s - OFF); });
        r = Math.max(r, 60);

        // Text block of lines ls placed at (x, y), on the side given by direction (s, c).
        const textAt = (cls, ls, x, y, s, c) => {
          const anchor = s > 0.3 ? 'start' : s < -0.3 ? 'end' : 'middle';
          const y0 = c < -0.3 ? y - (ls.length - 1) * LH - 2 : c > 0.3 ? y + 11 : y + 4.5 - ((ls.length - 1) * LH) / 2;
          return `<text class="${cls}" text-anchor="${anchor}">${ls.map((l, k) => `<tspan x="${f(x)}" y="${f(y0 + k * LH)}">${esc(l)}</tspan>`).join('')}</text>`;
        };
        const axis = labels.map((ls, i) => { const [x, y] = xy(i, r + OFF); return textAt('axis', ls, x, y, Math.sin(i * STEP), -Math.cos(i * STEP)); }).join('');
        const ticks = r < 100 ? '' : RINGS.map((v) => `<text class="tick" x="-8" y="${f((-r * v) / 100 + 14)}" text-anchor="end">${v}</text>`).join('');
        // Direct label: each country's name beside its dot, at the spoke where it leads the other the most.
        // It sits outside the shape when there is room, inside when the value is near the edge.
        // Top and bottom spokes put it on the right, away from the ring numbers.
        const direct = [[va, vb, a, 's1'], [vb, va, b, 's2']].map(([p, q, code, cls]) => {
          const i = d3.maxIndex(p, (v, k) => v - q[k]);
          const s = Math.sin(i * STEP), [x, y] = xy(i, (r * p[i]) / 100);
          const right = Math.abs(s) < 0.3 || (s > 0) === (p[i] <= 70);
          return { i, cls, html: `<text class="dl" x="${f(x + (right ? 9 : -9))}" y="${f(y + 4.5)}" text-anchor="${right ? 'start' : 'end'}">${esc(W >= 480 ? byCode[code].name : code)}</text>` };
        });
        big.innerHTML = `<g>${base(r)}${ticks}
          <polygon class="shape s2" points="${poly(vb, r)}"/><polygon class="shape s1" points="${poly(va, r)}"/>
          ${dots(vb, r, 's2')}${dots(va, r, 's1')}${axis}${direct.map((d) => d.html).join('')}${wedges(r + OFF)}</g>`;
        direct.forEach((d) => big.querySelector(`.rd-dot.${d.cls}[data-i="${d.i}"]`).classList.add('keep'));
        const bb = big.firstElementChild.getBBox();
        big.setAttribute('width', W);
        big.setAttribute('height', Math.ceil(bb.height + 8));
        big.setAttribute('viewBox', `${-W / 2} ${f(bb.y - 4)} ${W} ${Math.ceil(bb.height + 8)}`);
        big.setAttribute('aria-label', `Radar chart comparing ${byCode[a].name} (score ${byCode[a].score}) and ${byCode[b].name} (score ${byCode[b].score}) across ${N} categories. Exact values are in the table.`);

        const head = (code, k) => `<th scope="col"><span class="sw c${k}" aria-hidden="true"></span>${flag(code)}${code}</th>`;
        tbl.innerHTML = `<thead><tr><th scope="col">Category</th>${head(a, 1)}${head(b, 2)}</tr></thead>
          <tbody>${cats.map((c, i) => `<tr data-i="${i}"><th scope="row">${esc(c.name)}</th><td class="${va[i] > vb[i] ? 'hi' : ''}">${va[i]}</td><td class="${vb[i] > va[i] ? 'hi' : ''}">${vb[i]}</td></tr>`).join('')}</tbody>
          <tfoot><tr><th scope="row">Overall score</th><td>${byCode[a].score}</td><td>${byCode[b].score}</td></tr></tfoot>`;
      };

      const update = () => {
        selects.forEach((s, k) => (s.value = pair[k]));
        grid.querySelectorAll('.rd-card').forEach((card) => {
          const k = pair.indexOf(card.dataset.code);
          card.querySelector('.sw').className = k < 0 ? 'sw' : `sw c${k + 1}`;
          if (k < 0) delete card.dataset.k; else card.dataset.k = k + 1;
        });
        drawCompare();
      };
      // Puts code in slot k; if the other slot already has it, the two swap.
      const setPair = (k, code) => {
        if (pair[1 - k] === code) pair[1 - k] = pair[k];
        pair[k] = code;
        update();
      };

      selects.forEach((s, k) => s.addEventListener('change', () => setPair(k, s.value)));

      const cmpTip = (i) => {
        const c = cats[i];
        const row = (code, k) => `<div class="v-radar-tip-row"><span class="v-radar-k c${k + 1}"></span><b>${byCode[code].byCategory[c.id]}</b>${flagName(code)} <span class="v-radar-m">· ${live[code][c.id]} of ${total[c.id]} live</span></div>`;
        return `<strong>${esc(c.name)}</strong>${pair.map(row).join('')}`;
      };
      big.addEventListener('pointermove', (e) => {
        const hit = e.target.closest('.hit');
        if (!hit) { mark(null); tip.hide(); return; }
        const i = +hit.dataset.i;
        mark(big, i);
        tbl.querySelector(`tbody tr[data-i="${i}"]`)?.classList.add('on');
        tip.show(e, cmpTip(i));
      });
      big.addEventListener('pointerleave', () => { mark(null); tip.hide(); });
      tbl.addEventListener('pointermove', (e) => {
        const tr = e.target.closest('tbody tr');
        mark(tr && big, tr ? +tr.dataset.i : -1);
        tr?.classList.add('on');
      });
      tbl.addEventListener('pointerleave', () => mark(null));

      grid.addEventListener('pointermove', (e) => {
        const hit = e.target.closest('.hit'), card = e.target.closest('.rd-card');
        if (!hit || !card) { mark(null); tip.hide(); return; }
        const i = +hit.dataset.i, code = card.dataset.code, c = cats[i];
        mark(card, i);
        tip.show(e, `<strong>${byCode[code].byCategory[c.id]} · ${esc(c.name)}</strong>${flagName(code)}<br><span class="v-radar-m">${liveOf(code, c.id)}</span>`);
      });
      grid.addEventListener('pointerleave', () => { mark(null); tip.hide(); });
      grid.addEventListener('click', (e) => {
        const card = e.target.closest('.rd-card');
        if (!card) return;
        setPair(1, card.dataset.code);
        el.querySelector('section').scrollIntoView({ block: 'nearest' });
      });
      // Keyboard focus shows the same values as hover, all spokes at once.
      grid.addEventListener('focusin', (e) => {
        const card = e.target.closest('.rd-card');
        if (!card?.matches(':focus-visible')) return;
        const code = card.dataset.code, box = card.getBoundingClientRect();
        tip.show({ clientX: box.left + box.width / 2, clientY: box.top },
          `<strong>${flagName(code)} · ${byCode[code].score}</strong>${cats.map((c) => `<div class="v-radar-tip-row"><b>${byCode[code].byCategory[c.id]}</b>${esc(c.name)}</div>`).join('')}`);
      });
      grid.addEventListener('focusout', () => tip.hide());

      let lastW = 0;
      new ResizeObserver(() => requestAnimationFrame(() => {
        if (el.clientWidth === lastW) return;
        lastW = el.clientWidth;
        drawCompare();
      })).observe(el);
      document.fonts?.ready.then(drawCompare);
      update();
    },
  });
})();
