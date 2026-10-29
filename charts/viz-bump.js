// Home page chart "bump": a bump chart of each country's rank in every category, plus overall.
(() => {
  const GAP = 25; // spacing between tied dots along the category axis: two highlighted dots (2 × RH) still keep 3px apart
  const R = 10; // muted dot radius: holds an 11px "100"
  const RH = 11; // highlighted dot radius
  const MAX_PINS = 3;
  // Pin colors by slot. The first pin (Chile by default) is the focus country, so it gets sunrise.
  const SLOTS = ['var(--sunrise)', 'var(--magenta)', 'var(--c3)'];

  const CSS = `
.v-bump .bump-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 16px; margin-bottom: 18px; }
.v-bump .bump-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.v-bump .bump-chip { display: inline-flex; align-items: center; gap: 7px; height: 30px; padding: 0 11px; border: 1px solid var(--line); border-radius: 999px; background: rgba(255, 255, 255, 0.03); font: 500 11.5px/1 var(--mono); letter-spacing: 0.04em; color: var(--ink-2); cursor: pointer; }
.v-bump .bump-chip .flag { font-size: 14px; }
.v-bump .bump-chip:hover { border-color: var(--line-strong); color: var(--ink); }
.v-bump .bump-chip[aria-pressed='true'] { background: var(--surface-2); border-color: var(--line-strong); color: var(--ink); }
.v-bump .bump-key { display: inline-block; width: 14px; border-top: 2.5px solid var(--line-strong); border-radius: 2px; }
.v-bump .bump-hint { margin: 0; font: 400 11.5px/1.4 var(--mono); color: var(--muted); }
.v-bump svg { display: block; width: 100%; overflow: visible; }
.v-bump .grid { stroke: var(--grid); stroke-width: 1; }
.v-bump .bump-sep { stroke: var(--line-strong); stroke-width: 1; }
.v-bump .tick { fill: var(--muted); font: 500 11px var(--mono); }
.v-bump .head { fill: var(--ink-2); font-size: 12px; font-weight: 600; }
.v-bump .head.all { fill: var(--ink); }
.v-bump .c { cursor: pointer; }
.v-bump .c .ln { fill: none; stroke: var(--line-strong); stroke-width: 1.5; stroke-linejoin: round; stroke-linecap: round; }
.v-bump .c .hit { fill: none; stroke: transparent; stroke-width: 16; }
.v-bump .c .bump-dot { fill: var(--surface); stroke: var(--line-strong); stroke-width: 1.5; }
.v-bump .c .sc { fill: var(--muted); font-size: 11px; font-weight: 600; text-anchor: middle; dominant-baseline: central; pointer-events: none; }
.v-bump .c .sc.s3 { letter-spacing: -0.6px; }
.v-bump .c.on .ln { stroke: var(--hl); stroke-width: 2.5; }
.v-bump .c.on .bump-dot { fill: var(--hl); stroke: var(--surface); stroke-width: 2; }
.v-bump .c.on .sc { fill: var(--surface); }
@media (max-width: 520px) { .v-bump .bump-chip { gap: 5px; padding: 0 8px; } .v-bump .bump-chips { gap: 5px; } }
@media (pointer: coarse) { .v-bump .bump-chip { height: 40px; } }
.v-bump .lab { cursor: pointer; outline: none; }
.v-bump .lab text { fill: var(--ink-2); font-size: 12.5px; font-weight: 500; dominant-baseline: central; }
.v-bump svg.rot .lab text { font-size: 11.5px; }
.v-bump .lab.on text { fill: var(--ink); font-weight: 650; }
.v-bump .lab-sep { fill: var(--muted); font-size: 12.5px; text-anchor: middle; dominant-baseline: central; pointer-events: none; }
.v-bump .lab .ring { fill: transparent; stroke: none; }
.v-bump .lab:focus-visible .ring { stroke: var(--sunrise); stroke-width: 1.5; }
`;

  // Competition ranking per column: equal scores share a rank (1, 2, 2, 4).
  // Ties keep the overall ranking order, which also fixes their dot order.
  function buildColumns(ctx) {
    const rows = ctx.ranking;
    const cols = [...ctx.meta.categories.map((c) => ({ id: c.id, name: c.name })), { id: 'overall', name: 'Overall' }];
    const val = (r, id) => (id === 'overall' ? r.score : r.byCategory[id]);
    for (const col of cols) {
      const sorted = rows.slice().sort((a, b) => val(b, col.id) - val(a, col.id)); // stable sort
      col.at = {};
      sorted.forEach((r, j) => {
        const score = val(r, col.id);
        const prev = j && col.at[sorted[j - 1].code];
        col.at[r.code] = { score, rank: prev && prev.score === score ? prev.rank : j + 1 };
      });
      for (const r of sorted) {
        const p = col.at[r.code];
        const group = sorted.filter((q) => col.at[q.code].rank === p.rank);
        Object.assign(p, { k: group.length, i: group.indexOf(r), tied: group.filter((q) => q !== r) });
      }
      col.k = d3.max(Object.values(col.at), (p) => p.k);
    }
    return cols;
  }

  (window.CHARTS ??= []).push({
    id: 'bump',
    title: 'Who leads where',
    blurb: (ctx) => `Who leads in which category? Each line follows one country’s rank (1 is best) across the ${ctx.meta.categories.length} categories and overall, and each dot holds the score out of 100.`,
    render(el, ctx) {
      if (!document.getElementById('v-bump-style')) {
        const s = document.createElement('style');
        s.id = 'v-bump-style';
        s.textContent = CSS;
        document.head.append(s);
      }
      el.classList.add('v-bump');
      const rows = ctx.ranking;
      const N = rows.length;
      const cols = buildColumns(ctx);
      const first = cols[0], last = cols[cols.length - 1];
      const pins = rows.some((r) => r.code === 'CL') ? [{ code: 'CL', slot: 0 }] : [];
      let hover = null;

      el.innerHTML = `<div class="bump-top"><div class="bump-chips" role="group" aria-label="Pin countries"></div>
        <p class="bump-hint">Pick a line or a country to pin it (up to ${MAX_PINS}).</p></div><div class="bump-chart"></div>`;
      const chart = el.querySelector('.bump-chart');

      const freeSlot = () => [0, 1, 2].find((s) => !pins.some((p) => p.slot === s));
      // Pinned countries keep their slot color; a hovered one previews the color it would get when pinned.
      function color(code) {
        const pin = pins.find((p) => p.code === code);
        if (pin) return SLOTS[pin.slot];
        if (code !== hover) return null;
        const s = freeSlot();
        return s == null ? 'var(--ink)' : SLOTS[s];
      }
      function toggle(code) {
        const i = pins.findIndex((p) => p.code === code);
        if (i >= 0) pins.splice(i, 1);
        else {
          if (pins.length === MAX_PINS) pins.shift();
          pins.push({ code, slot: freeSlot() });
        }
        paint();
      }
      function setHover(code) {
        if (hover === code) return;
        hover = code;
        paint();
      }
      const isPinned = (code) => pins.some((p) => p.code === code);

      // Pin chips: the keyboard control and the color legend in one row.
      const chips = d3.select(el.querySelector('.bump-chips')).selectAll('button').data(rows).join('button')
        .attr('type', 'button').attr('class', 'bump-chip')
        .attr('aria-label', (r) => `Pin ${r.name}`)
        .on('click', (e, r) => toggle(r.code))
        .on('pointerenter focus', (e, r) => setHover(r.code))
        .on('pointerleave blur', () => setHover(null));
      chips.append('span').attr('class', 'bump-key').attr('aria-hidden', 'true');
      chips.append('span').html((r) => `${ctx.flag(r.code)}${r.code}`);

      function tipHtml(code, col) {
        const r = ctx.byCode[code], p = col.at[code];
        const t = p.tied;
        const tied = !t.length ? '' : t.length > 2 ? `, tied with ${t.length} others` : `, tied with ${t.map((q) => ctx.esc(q.name)).join(' and ')}`;
        return `<strong>${ctx.flag(code)}${ctx.esc(r.name)}</strong>${ctx.esc(col.id === 'overall' ? 'Overall' : col.name)}<br>Rank ${p.rank} of ${N}${tied}<br>Score ${p.score} out of 100`;
      }

      let measure;
      function textWidth(s, font = '600 12px') {
        measure ??= document.createElement('canvas').getContext('2d');
        measure.font = `${font} ${ctx.css('--font') || 'system-ui'}`;
        return measure.measureText(s).width;
      }
      // Breaks at spaces and after hyphens ("General-" / "purpose").
      function wrap(text, maxW) {
        const lines = [];
        const join = (a, b) => (a.endsWith('-') ? a + b : `${a} ${b}`);
        for (const w of text.split(/(?<=-)| /)) {
          const cur = lines[lines.length - 1];
          if (cur && textWidth(join(cur, w)) <= maxW) lines[lines.length - 1] = join(cur, w);
          else lines.push(w);
        }
        return lines;
      }

      // End labels: tied countries share their rank row. Desktop puts up to two per line ("🇨🇴 CO · 🇨🇱 CL"),
      // stacking lines around the row; the rotated layout stacks one per line in the rank column.
      const LAB_FONT = '650 12.5px', SEP = 12, LINE = 15, STACK = 20; // STACK: one label per line on the rotated layout
      const labText = (code) => `${ctx.emoji(code)} ${code}`;
      const tieGroups = (col) => d3.groups(rows.map((r) => r.code), (c) => col.at[c].rank)
        .map(([rank, codes]) => ({ rank, codes: codes.sort((a, b) => col.at[a].i - col.at[b].i) }));
      const lineWidth = (codes) => d3.sum(codes, (c) => textWidth(labText(c), LAB_FONT)) + SEP * (codes.length - 1);
      const chunks = (codes) => d3.range(0, codes.length, 2).map((i) => codes.slice(i, i + 2));
      const maxLineWidth = (col) => d3.max(tieGroups(col), (g) => d3.max(chunks(g.codes), lineWidth));

      // Lay out along two abstract axes: u runs through the categories, v runs through the ranks.
      // Wide frames draw u across (classic bump chart); narrow frames rotate so categories run down the page.
      function layout(W) {
        const L = 24 + maxLineWidth(first) + 6, LEAD = 16, RG = 6 + maxLineWidth(last) + 4;
        // Tied dots shrink their spacing by up to 2px before the chart gives up and rotates.
        for (const gap of [GAP, GAP - 1, GAP - 2]) {
          const needs = cols.map((c) => Math.max(80, c.k * gap + 18));
          const hNeed = L + LEAD + d3.sum(needs) + LEAD + RG;
          if (W < hNeed) continue;
          const extra = (W - hNeed) / cols.length;
          let u = L + LEAD;
          cols.forEach((c, j) => { c.w = needs[j] + extra; c.u0 = u; c.u = u + c.w / 2; u += c.w; });
          const lines = cols.map((c) => wrap(c.name, c.w - 12));
          const top = d3.max(lines, (l) => l.length) * 16 + 30;
          const ROW = 44;
          return { mode: 'h', gap, W, H: top + (N - 1) * ROW + 18, uStart: L, uEnd: u + LEAD, uLo: cols[0].u0, uHi: u, top, lines, rh: RH, v: (rank) => top + (rank - 1) * ROW };
        }
        // Rotated: category names get their own gutter on the left, wrapped on phones so the ranks keep room.
        const nameW = Math.min(d3.max(cols, (c) => textWidth(c.name)), Math.max(70, W / 5));
        const G = nameW + 8;
        const step = (W - G - 2) / N;
        // When flag and code do not fit between two ranks, the end labels show the code alone.
        const compact = step < d3.max(rows, (r) => textWidth(labText(r.code), LAB_FONT)) + 6;
        const names = cols.map((c) => wrap(c.name, nameW));
        const uStart = 40 + (first.k - 1) * STACK;
        let cur = uStart + 14;
        cols.forEach((c, j) => {
          const half = Math.max(((c.k - 1) * GAP) / 2 + RH, (names[j].length * 15) / 2);
          c.u0 = cur;
          c.u = cur + 16 + half;
          cur = c.u + half + 16;
        });
        const uEnd = cur + 4;
        // rh: a highlighted dot grows only while it stays inside its rank, so neighbors never cover each other.
        return { mode: 'v', gap: GAP, W, H: uEnd + 12 + (last.k - 1) * STACK + 14, uStart, uEnd, uLo: uStart + 14, uHi: cur, names, compact, step, rh: Math.max(R, Math.min(RH, step / 2 - 1)), v: (rank) => G + (rank - 0.5) * step };
      }

      let lay, groups, labels, lastW = 0;
      function draw() {
        const W = Math.floor(chart.clientWidth);
        if (!W || W === lastW) return;
        lastW = W;
        lay = layout(W);
        const { mode, v, uStart, uEnd } = lay;
        const H = mode === 'h';
        const pt = (u, vv) => (H ? [u, vv] : [vv, u]);
        const curve = H ? d3.curveBumpX : d3.curveBumpY;
        const line = d3.line().curve(curve);

        chart.innerHTML = '';
        const svg = d3.select(chart).append('svg')
          .attr('viewBox', `0 0 ${W} ${lay.H}`).attr('height', lay.H)
          .attr('role', 'group').classed('rot', !H)
          .attr('aria-label', `Bump chart of country ranks in ${cols.length - 1} categories and overall. Rank 1 is best; equal scores share a rank.`);

        // Grid: one hairline per rank, a rule before the Overall column, and the rank ticks.
        const ranks = d3.range(1, N + 1);
        svg.append('g').selectAll('line').data(ranks).join('line').attr('class', 'grid')
          .each(function (r) {
            const [x1, y1] = pt(lay.uLo, v(r)), [x2, y2] = pt(lay.uHi, v(r));
            d3.select(this).attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2);
          });
        {
          const [x1, y1] = pt(last.u0, H ? lay.top - 22 : 0), [x2, y2] = pt(last.u0, H ? lay.H - 4 : W);
          svg.append('line').attr('class', 'bump-sep').attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2);
        }
        svg.append('g').selectAll('text').data(ranks).join('text').attr('class', 'tick')
          .attr('x', (r) => (H ? 0 : v(r))).attr('y', (r) => (H ? v(r) : 12))
          .attr('text-anchor', H ? 'start' : 'middle').attr('dominant-baseline', 'central')
          .text((r) => `#${r}`);

        // Category names: above the columns, or in the left gutter beside each row on the rotated layout.
        const heads = svg.append('g').style('pointer-events', 'none');
        cols.forEach((c, j) => {
          const t = heads.append('text').attr('class', `head${c.id === 'overall' ? ' all' : ''}`);
          if (H) {
            const ls = lay.lines[j];
            t.attr('text-anchor', 'middle');
            ls.forEach((s, i) => t.append('tspan').attr('x', c.u).attr('y', lay.top - 26 - (ls.length - 1 - i) * 16).text(s));
          } else {
            const ls = lay.names[j];
            t.attr('dominant-baseline', 'central');
            ls.forEach((s, i) => t.append('tspan').attr('x', 0).attr('y', c.u + (i - (ls.length - 1) / 2) * 15).text(s));
          }
        });

        // One group per country in two layers: every line (from start label, through every column, to end label)
        // sits under every dot, so a highlighted line never runs through another country's score.
        const ofs = (p) => (p.i - (p.k - 1) / 2) * lay.gap;
        const geo = rows.map((r) => {
          const a = first.at[r.code], b = last.at[r.code];
          const start = pt(uStart, v(a.rank));
          const end = pt(uEnd, v(b.rank));
          const dots = cols.map((c) => ({ c, p: c.at[r.code], xy: pt(c.u + ofs(c.at[r.code]), v(c.at[r.code].rank)) }));
          return { r, dots, d: line([start, ...dots.map((x) => x.xy), end]) };
        });
        groups = [svg.append('g'), svg.append('g')].map((layer) => layer.selectAll('g').data(geo).join('g').attr('class', 'c'));
        groups[0].append('path').attr('class', 'hit').attr('d', (g) => g.d);
        groups[0].append('path').attr('class', 'ln').attr('d', (g) => g.d);
        const dg = groups[1].selectAll('g').data((g) => g.dots).join('g').attr('transform', (x) => `translate(${x.xy})`);
        dg.append('circle').attr('class', 'bump-dot').attr('r', R);
        dg.append('text').attr('class', (x) => `sc${x.p.score >= 100 ? ' s3' : ''}`).text((x) => x.p.score);
        for (const gs of groups) gs
          .on('pointerenter', (e, g) => setHover(g.r.code))
          .on('pointerleave', () => { setHover(null); ctx.tip.hide(); })
          .on('pointermove', (e, g) => {
            const [px, py] = d3.pointer(e, svg.node());
            const u = H ? px : py;
            const near = d3.least(g.dots, (x) => Math.abs((H ? x.xy[0] : x.xy[1]) - u));
            ctx.tip.show(e, tipHtml(g.r.code, near.c));
          })
          .on('click', (e, g) => toggle(g.r.code));

        // End labels (flag and code) in their own layer, so raising a line never moves a focused label.
        const labData = [], seps = [];
        for (const end of [false, true]) {
          const col = end ? last : first, u = end ? uEnd : uStart;
          for (const g of tieGroups(col)) {
            if (!H) {
              g.codes.forEach((code, i) => labData.push({ code, end, anchor: 'middle', x: v(g.rank), y: end ? u + 12 + i * STACK : u - 10 - (g.codes.length - 1 - i) * STACK }));
              continue;
            }
            const ls = chunks(g.codes);
            ls.forEach((codes, li) => {
              const y = v(g.rank) + (li - (ls.length - 1) / 2) * LINE;
              let x = end ? u + 6 : u - 6 - lineWidth(codes);
              codes.forEach((code, i) => {
                if (i) { seps.push({ x: x + SEP / 2, y }); }
                labData.push({ code, end, anchor: 'start', x: x + (i ? SEP : 0), y });
                x += (i ? SEP : 0) + textWidth(labText(code), LAB_FONT);
              });
            });
          }
        }
        labData.sort((a, b) => a.end - b.end || (H ? a.y - b.y || a.x - b.x : a.x - b.x || a.y - b.y));
        svg.append('g').selectAll('text').data(seps).join('text').attr('class', 'lab-sep')
          .attr('x', (d) => d.x).attr('y', (d) => d.y).text('·');
        labels = svg.append('g').selectAll('g').data(labData).join('g').attr('class', 'lab');
        labels.each(function (d) {
          const sel = d3.select(this);
          const ring = sel.append('rect').attr('class', 'ring').attr('rx', 6);
          sel.append('text').attr('x', d.x).attr('y', d.y).attr('text-anchor', d.anchor).text(H ? labText(d.code) : lay.compact ? d.code : `${ctx.emoji(d.code)}\u2009${d.code}`);
          const bb = this.getBBox();
          // The ring is also the hit box: on the rotated layout it stays inside its own rank and line, so neighbors never overlap.
          const w = H ? bb.width + 8 : Math.min(bb.width + 8, lay.step - 2), h = H ? bb.height + 4 : Math.min(bb.height + 4, STACK - 2);
          ring.attr('x', bb.x + (bb.width - w) / 2).attr('y', bb.y + (bb.height - h) / 2).attr('width', w).attr('height', h);
        });
        labels
          .attr('tabindex', (d) => (d.end ? null : 0))
          .attr('role', (d) => (d.end ? null : 'button'))
          .attr('aria-label', (d) => (d.end ? null : `Pin ${ctx.byCode[d.code].name}`))
          .on('pointerenter', (e, d) => { setHover(d.code); ctx.tip.show(e, tipHtml(d.code, last)); })
          .on('pointermove', (e, d) => ctx.tip.show(e, tipHtml(d.code, last)))
          .on('pointerleave', () => { setHover(null); ctx.tip.hide(); })
          .on('click', (e, d) => toggle(d.code))
          .on('keydown', (e, d) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            toggle(d.code);
          })
          .on('focus', function (e, d) {
            setHover(d.code);
            const b = this.getBoundingClientRect();
            ctx.tip.show({ clientX: b.left + b.width / 2, clientY: b.top }, tipHtml(d.code, last));
          })
          .on('blur', () => { setHover(null); ctx.tip.hide(); });
        paint();
      }

      function paint() {
        chips.attr('aria-pressed', (r) => isPinned(r.code))
          .select('.bump-key').style('border-top-color', (r) => (isPinned(r.code) ? color(r.code) : null));
        if (!groups) return;
        // Draw order in each layer: muted, then pinned, then the hovered one on top.
        const z = (code) => (code === hover ? 2 : isPinned(code) ? 1 : 0);
        for (const gs of groups) {
          gs.each(function (g) {
            const c = color(g.r.code);
            d3.select(this).classed('on', !!c).style('--hl', c).selectAll('.bump-dot').attr('r', c ? lay.rh : R);
          });
          gs.sort((a, b) => z(a.r.code) - z(b.r.code));
        }
        labels.classed('on', (d) => !!color(d.code))
          .attr('aria-pressed', (d) => (d.end ? null : isPinned(d.code)));
      }

      new ResizeObserver(() => requestAnimationFrame(draw)).observe(el);
      document.fonts?.ready.then(() => { lastW = 0; draw(); });
      draw();
    },
  });
})();
