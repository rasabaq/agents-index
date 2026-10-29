// Home page chart: a timeline of every cited source, one swim lane per category.
(window.CHARTS ??= []).push({
  id: 'timeline',
  title: 'Timeline',
  blurb: 'How fast did agent capabilities arrive? Each dot is one cited source, placed at its date in the lane of the category it supports; the bars on top count sources per quarter.',
  render(el, ctx) {
    const { esc, emoji, flag } = ctx;
    const asOf = new Date(`${ctx.meta.asOf}T00:00:00Z`);
    const START = new Date(Date.UTC(2016, 0, 1));
    const BREAK = new Date(Date.UTC(2025, 0, 1)); // time before this is drawn compressed
    const TYPE = { company: 'Company', regulation: 'Regulation', news: 'News', report: 'Report' };
    const FILLED = new Set(['company', 'regulation']);
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const capName = Object.fromEntries(ctx.capabilities.map((c) => [c.id, c.name]));
    const cName = Object.fromEntries(ctx.meta.countries.map((c) => [c.code, c.name]));

    // Parse "YYYY", "YYYY-MM" or "YYYY-MM-DD". Month-only sits on the 15th; year-only sits mid-way through the known part of that year.
    const parse = (s) => {
      const [y, m, d] = s.split('-').map(Number);
      if (d) return { t: new Date(Date.UTC(y, m - 1, d)), prec: 3, label: `${MON[m - 1]} ${d}, ${y}` };
      if (m) return { t: new Date(Date.UTC(y, m - 1, 15)), prec: 2, label: `${MON[m - 1]} ${y}` };
      const a = Date.UTC(y, 0, 1), b = Math.min(Date.UTC(y, 11, 31), +asOf);
      return { t: new Date((a + b) / 2), prec: 1, label: `${y} (year only)` };
    };

    // One record per URL. When citations of the same URL disagree on the date, keep the most precise, then the earliest.
    const byUrl = new Map();
    let citations = 0;
    for (const cat of ctx.categories) for (const cap of cat.capabilities) for (const [cc, v] of Object.entries(cap.countries)) {
      for (const e of v.evidence ?? []) {
        citations++;
        const p = parse(String(e.date));
        let s = byUrl.get(e.url);
        if (!s) byUrl.set(e.url, (s = { ...e, ...p, cats: new Set(), caps: new Map(), countries: new Set() }));
        else if (p.prec > s.prec || (p.prec === s.prec && p.t < s.t)) Object.assign(s, p, { date: e.date });
        s.cats.add(cat.category);
        s.countries.add(cc);
        if (!s.caps.has(cap.id)) s.caps.set(cap.id, new Set());
        s.caps.get(cap.id).add(cc);
      }
    }
    const sources = [...byUrl.values()].sort((a, b) => a.t - b.t);
    sources.forEach((s) => (s.early = s.t < START));
    const quarterKey = (t) => `${t.getUTCFullYear()}-${Math.floor(t.getUTCMonth() / 3)}`;

    // Key moments, found in the data (labels are the source titles).
    const moments = [
      sources.find((s) => s.url.includes('bgr.com/1921652')),
      sources.find((s) => s.cats.has('commerce') && s.prec > 1),
      sources.find((s) => s.url.includes('santander-and-visa-deliver')),
    ].filter(Boolean);
    moments.forEach((s, i) => (s.moment = i + 1));

    const cats = ctx.meta.categories;
    const yearOnly = sources.filter((s) => s.prec === 1).length;
    const early = sources.filter((s) => s.early).length;
    const multi = sources.filter((s) => s.cats.size > 1).length;
    let country = 'ALL';

    if (!document.getElementById('v-timeline-css')) {
      document.head.insertAdjacentHTML('beforeend', `<style id="v-timeline-css">
.v-timeline .pill { display: inline-flex; align-items: center; gap: 6px; }
/* a picked country is the focus: sunrise pill, sunrise bars and dots */
.v-timeline .pill[aria-pressed='true']:not([data-c='ALL']) { background: var(--sun-tint); border-color: rgba(255, 182, 114, 0.45); color: var(--sunrise); }
.v-timeline .legend { margin-bottom: 12px; font: 400 11.5px/1.4 var(--mono); }
.v-timeline .key-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; box-sizing: border-box; }
.v-timeline .key-dot.filled { background: var(--ink-2); }
.v-timeline .key-dot.hollow { border: 1.5px solid var(--ink-2); }
.v-timeline .scroll { overflow-x: auto; }
.v-timeline svg { display: block; overflow: visible; }
.v-timeline svg text { font-size: 12px; }
.v-timeline .lane-name { fill: var(--ink-2); font-size: 13px; }
.v-timeline .lane-count, .v-timeline .tick, .v-timeline .tm-note { fill: var(--muted); font-variant-numeric: tabular-nums; }
.v-timeline svg text.tick, .v-timeline svg text.lane-count, .v-timeline svg text.tm-note { font: 400 11px var(--mono); }
.v-timeline svg text.tick.year { fill: var(--ink-2); font-weight: 500; }
.v-timeline .grid { stroke: var(--grid); stroke-width: 1; }
.v-timeline .lane-rule { stroke: var(--line); stroke-width: 1; }
.v-timeline .tm-band { fill: var(--surface-2); }
.v-timeline .bar { fill: var(--accent); }
.v-timeline .bar.pick { fill: var(--sunrise); }
.v-timeline .bar-all { fill: var(--line-strong); }
.v-timeline .qhit { fill: transparent; }
.v-timeline .qhit:hover + .bar, .v-timeline .bar.hot { opacity: .75; }
.v-timeline .bar-label { fill: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }
.v-timeline .tm-dot { stroke-width: 1.5; transition: opacity .15s; }
.v-timeline .tm-dot.filled { fill: var(--ink-2); stroke: var(--surface); }
.v-timeline .tm-dot.hollow { fill: var(--surface); stroke: var(--ink-2); }
.v-timeline .tm-dot.dim { opacity: .14; }
.v-timeline .tm-dot.filled.pick { fill: var(--sunrise); }
.v-timeline .tm-dot.hollow.pick { stroke: var(--sunrise); }
.v-timeline .tm-dot.hot { stroke: var(--sunrise); stroke-width: 3; opacity: 1; }
.v-timeline a { outline: none; cursor: pointer; }
.v-timeline a:focus-visible .tm-dot { stroke: var(--sunrise); stroke-width: 3; opacity: 1; }
.v-timeline .ring { fill: none; stroke: var(--ink); stroke-width: 1.5; }
.v-timeline .leader { stroke: var(--line-strong); stroke-width: 1; }
/* key moments are numbered like function keys: magenta caps */
.v-timeline .tm-badge { fill: var(--magenta); }
.v-timeline svg text.badge-n { fill: var(--page); font: 500 11px var(--mono); }
.v-timeline .moments { list-style: none; margin: 16px 0 0; padding: 0; display: grid; gap: 6px; font-size: 13px; color: var(--ink-2); }
.v-timeline .moments li { display: grid; grid-template-columns: 18px 1fr; gap: 8px; align-items: baseline; }
.v-timeline .moments b { display: inline-grid; place-items: center; width: 18px; height: 18px; border-radius: 3px; background: var(--magenta); color: var(--page); font: 500 11px/1 var(--mono); }
.v-timeline .moments .when { color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }
.v-timeline .tl-note { margin: 12px 0 0; font: 400 11.5px/1.6 var(--mono); color: var(--muted); max-width: 100ch; }
</style>`);
    }

    el.classList.add('v-timeline');
    el.innerHTML = `
      <div class="filters" role="group" aria-label="Highlight sources for one country">
        ${[['ALL', 'All countries'], ...ctx.meta.countries.map((c) => [c.code, `${flag(c.code)}${c.code}`])]
          .map(([code, label]) => `<button type="button" class="pill" data-c="${code}" aria-pressed="${code === 'ALL'}" ${code !== 'ALL' ? `aria-label="${esc(cName[code])}"` : ''}>${label}</button>`).join('')}
      </div>
      <div class="legend">
        <span class="legend-item"><span class="key-dot filled"></span>Company or regulation</span>
        <span class="legend-item"><span class="key-dot hollow"></span>News or report</span>
        <span class="legend-item" style="color:var(--muted)">A source dated only by year sits mid-year</span>
      </div>
      <div class="scroll"></div>
      <ol class="moments">${moments.map((s) => `<li><b>${s.moment}</b><span><span class="when">${esc(s.label)}</span> · ${esc(s.title)} <span style="color:var(--muted)">(${esc(s.publisher)})</span></span></li>`).join('')}</ol>
      <p class="tl-note">${sources.length} unique sources from ${citations} citations, one dot per source and lane. Time before 2025 is compressed (shaded) so the recent months have room.
        ${early ? `${early} source${early > 1 ? 's' : ''} older than 2016 ${early > 1 ? 'sit' : 'sits'} in the “before 2016” column.` : ''}
        ${yearOnly} sources give only a year: they sit mid-year and are left out of the quarter bars.
        ${multi ? `${multi} source${multi > 1 ? 's' : ''} support${multi > 1 ? '' : 's'} two categories and ${multi > 1 ? 'appear' : 'appears'} in both lanes.` : ''}
        The last quarter runs only to ${parse(ctx.meta.asOf).label}. Click a dot to open its source.</p>`;
    const wrap = el.querySelector('.scroll');

    el.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => {
      country = b.dataset.c;
      el.querySelectorAll('[data-c]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      draw();
    }));

    const tipHtml = (s) => {
      const caps = [...s.caps].map(([id, cs]) => `<div>${esc(capName[id])}: ${[...cs].map((c) => `<span class="nowrap">${flag(c)}${c}</span>`).join(' ')}</div>`).join('');
      return `<strong>${esc(s.title)}</strong><div style="opacity:.8">${esc(s.publisher)} · ${esc(s.label)} · ${TYPE[s.type] ?? esc(s.type)}</div>
        <div style="margin-top:6px">${caps}</div>
        <div style="margin-top:4px;opacity:.8">${[...s.countries].map((c) => `<span class="nowrap">${flag(c)}${c}</span>`).join(' ')}</div>`;
    };
    const atRect = (node) => { const r = node.getBoundingClientRect(); return { clientX: r.left + r.width / 2, clientY: r.top }; };

    // Beeswarm: each dot takes the y offset closest to the lane center that does not touch an earlier dot.
    function dodge(items, D) {
      const placed = [];
      for (const it of items) {
        const blocks = placed.filter((p) => Math.abs(p.x - it.x) < D).map((p) => {
          const h = Math.sqrt(D * D - (p.x - it.x) ** 2);
          return [p.y - h, p.y + h];
        });
        const cands = [0, ...blocks.flat()].sort((a, b) => Math.abs(a) - Math.abs(b));
        it.y = cands.find((y) => blocks.every(([a, b]) => y <= a + 1e-6 || y >= b - 1e-6));
        placed.push(it);
      }
      return items;
    }

    let lastW = 0;
    function draw() {
      const W = wrap.clientWidth;
      if (!W) return;
      lastW = W;
      const phone = W < 640;
      const R = 4, D = 2 * R + 2;
      const labelW = phone ? 0 : 200;
      const binW = phone ? 44 : 56;
      const x0 = labelW + binW + 12, x1 = W - 6;
      const xb = x0 + (x1 - x0) * 0.25;
      const x = d3.scaleUtc().domain([START, BREAK, asOf]).range([x0, xb, x1]);
      const binX = labelW + binW / 2;
      const px = (s) => (s.early ? binX : x(s.t));
      const match = (s) => country === 'ALL' || s.countries.has(country);

      // Quarter bars (year-only dates excluded).
      const quarters = [];
      for (let y = 2016; y <= asOf.getUTCFullYear(); y++) for (let q = 0; q < 4; q++) {
        const a = new Date(Date.UTC(y, q * 3, 1));
        if (a > asOf) break;
        const b = new Date(Math.min(Date.UTC(y, q * 3 + 3, 1), +asOf));
        quarters.push({ key: `${y}-${q}`, label: `Q${q + 1} ${y}`, xa: x(a), xb: x(b), all: 0, hit: 0 });
      }
      const qIdx = Object.fromEntries(quarters.map((q) => [q.key, q]));
      const bin = { label: 'Before 2016', xa: labelW + 4, xb: labelW + binW - 4, all: 0, hit: 0 };
      for (const s of sources) {
        const q = s.early ? bin : s.prec > 1 ? qIdx[quarterKey(s.t)] : null;
        if (!q) continue;
        q.all++;
        if (match(s)) q.hit++;
      }
      const bars = [bin, ...quarters];
      const maxQ = d3.max(bars, (q) => q.all);
      const stripTop = phone ? 22 : 18, stripH = 52;
      const yq = d3.scaleLinear().domain([0, maxQ]).range([0, stripH]);
      const annTop = stripTop + stripH + 8, annH = 26;

      // Lanes.
      let y = annTop + annH;
      const lanes = cats.map((c) => {
        const items = sources.filter((s) => s.cats.has(c.id)).map((s) => ({ s, x: px(s) }));
        dodge(items.filter((d) => d.s.early), D);
        dodge(items.filter((d) => !d.s.early), D);
        const ext = d3.max(items, (d) => Math.abs(d.y)) ?? 0;
        const head = phone ? 20 : 0;
        const h = head + Math.max(32, 2 * ext + D + 10);
        const lane = { c, items, top: y, head, h, mid: y + head + (h - head) / 2 };
        items.forEach((d) => (d.cy = lane.mid + d.y));
        y += h;
        return lane;
      });
      const lanesBottom = y;
      const H = lanesBottom + (phone ? 40 : 40);
      const dots = lanes.flatMap((l) => l.items);

      const svg = d3.create('svg').attr('width', W).attr('height', H).attr('viewBox', `0 0 ${W} ${H}`)
        .attr('role', 'img')
        .attr('aria-label', `Timeline of ${sources.length} cited sources from before 2016 to ${parse(ctx.meta.asOf).label}, in ${cats.length} category lanes, with a bar strip counting sources per quarter.`);

      // Compressed band and gridlines.
      svg.append('rect').attr('class', 'tm-band').attr('x', x0).attr('y', stripTop).attr('width', xb - x0).attr('height', lanesBottom - stripTop);
      const ticks = phone
        ? [[START, '2016', 'start'], [BREAK, '2025'], [new Date(Date.UTC(2025, 6, 1)), 'Jul'], [new Date(Date.UTC(2026, 0, 1)), '2026'], [new Date(Date.UTC(2026, 6, 1)), 'Jul']]
        : [...[2016, 2020].map((yy) => [new Date(Date.UTC(yy, 0, 1)), String(yy), yy === 2016 ? 'start' : 'middle']),
          ...d3.utcMonths(BREAK, asOf, 3).map((d) => [d, d.getUTCMonth() ? MON[d.getUTCMonth()] : String(d.getUTCFullYear())])];
      const g = svg.append('g');
      for (const [d, t, anchor = 'middle'] of ticks) {
        g.append('line').attr('class', 'grid').attr('x1', x(d)).attr('x2', x(d)).attr('y1', annTop + annH).attr('y2', lanesBottom + 4);
        g.append('text').attr('class', `tick${/^\d/.test(t) ? ' year' : ''}`).attr('x', x(d)).attr('y', lanesBottom + 18)
          .attr('text-anchor', anchor).text(t);
      }
      // "Before 2016" column.
      g.append('line').attr('class', 'lane-rule').attr('x1', labelW + binW + 6).attr('x2', labelW + binW + 6).attr('y1', stripTop).attr('y2', lanesBottom);
      g.append('text').attr('class', 'tick year').attr('x', binX).attr('y', lanesBottom + 18).attr('text-anchor', 'middle').text('Before');
      g.append('text').attr('class', 'tick year').attr('x', binX).attr('y', lanesBottom + 33).attr('text-anchor', 'middle').text('2016');
      if (!phone) g.append('text').attr('class', 'tm-note').attr('x', (x0 + xb) / 2).attr('y', lanesBottom + 33).attr('text-anchor', 'middle').text('2016–2024, compressed');

      // Bar strip.
      const strip = svg.append('g');
      strip.append('text').attr('class', 'lane-name').attr('x', 0).attr('y', phone ? 12 : stripTop + stripH - 4)
        .text(country === 'ALL' ? 'Sources per quarter' : `Sources per quarter, ${emoji(country)} ${country} highlighted`);
      const topRound = (x, w, h, base) => {
        const r = Math.min(4, w / 2, h);
        return `M${x},${base}V${base - h + r}Q${x},${base - h} ${x + r},${base - h}H${x + w - r}Q${x + w},${base - h} ${x + w},${base - h + r}V${base}Z`;
      };
      const base = stripTop + stripH;
      for (const q of bars) {
        const slot = q.xb - q.xa;
        const w = Math.max(1, Math.min(20, slot - (slot > 6 ? 3 : 1)));
        const bx = q.xa + (slot - w) / 2;
        const gq = strip.append('g');
        gq.append('rect').attr('class', 'qhit').attr('x', q.xa).attr('y', stripTop - 14).attr('width', slot).attr('height', stripH + 14)
          .on('pointermove', (e) => ctx.tip.show(e, `<strong>${q.label}</strong>${q.all} source${q.all === 1 ? '' : 's'}${country !== 'ALL' ? `, ${q.hit} for ${esc(cName[country])}` : ''}`))
          .on('pointerleave', () => ctx.tip.hide());
        if (!q.all) continue;
        if (country !== 'ALL') gq.append('path').attr('class', 'bar-all').attr('d', topRound(bx, w, yq(q.all), base)).style('pointer-events', 'none');
        if (q.hit) gq.append('path').attr('class', `bar${country !== 'ALL' ? ' pick' : ''}`).attr('d', topRound(bx, w, yq(q.hit), base)).style('pointer-events', 'none');
      }
      const peak = quarters.reduce((a, b) => (b.all > a.all ? b : a));
      strip.append('text').attr('class', 'bar-label').attr('x', (peak.xa + peak.xb) / 2).attr('y', base - yq(peak.all) - 5)
        .attr('text-anchor', 'middle').text(peak.all);
      strip.append('line').attr('class', 'lane-rule').attr('x1', labelW).attr('x2', W).attr('y1', base + 0.5).attr('y2', base + 0.5);

      // Lane labels and rules.
      for (const l of lanes) {
        const n = l.items.length, hit = l.items.filter((d) => match(d.s)).length;
        const ly = phone ? l.top + 14 : l.mid + 4;
        svg.append('rect').attr('x', 0).attr('y', ly - 9).attr('width', 10).attr('height', 10).attr('rx', 3).style('fill', ctx.catIndex[l.c.id].color);
        const t = svg.append('text').attr('class', 'lane-name').attr('x', 16).attr('y', ly).text(l.c.name);
        t.append('tspan').attr('class', 'lane-count').attr('dx', 8).text(country === 'ALL' ? n : `${hit} of ${n}`);
        svg.append('line').attr('class', 'lane-rule').attr('x1', 0).attr('x2', W).attr('y1', l.top + l.h + 0.5).attr('y2', l.top + l.h + 0.5);
      }

      // Key moment badges with leaders to their dots.
      for (const d of dots.filter((d) => d.s.moment)) {
        const bx = d.x, by = annTop + annH / 2;
        svg.append('line').attr('class', 'leader').attr('x1', bx).attr('x2', bx).attr('y1', by + 8).attr('y2', d.cy - R - 4);
        svg.append('circle').attr('class', 'ring').attr('cx', d.x).attr('cy', d.cy).attr('r', R + 3.5);
        svg.append('rect').attr('class', 'tm-badge').attr('x', bx - 8).attr('y', by - 8).attr('width', 16).attr('height', 16).attr('rx', 3);
        svg.append('text').attr('class', 'badge-n').attr('x', bx).attr('y', by + 4).attr('text-anchor', 'middle').text(d.s.moment);
      }

      // Dots: links for keyboard and screen readers; the pointer uses a nearest-dot search.
      const links = svg.append('g').selectAll('a').data(dots).join('a')
        .attr('href', (d) => d.s.url).attr('target', '_blank').attr('rel', 'noopener noreferrer')
        .attr('aria-label', (d) => `${d.s.title}, ${d.s.publisher}, ${d.s.label}`)
        .on('focus', function (e, d) { ctx.tip.show(atRect(this), tipHtml(d.s)); })
        .on('blur', () => ctx.tip.hide());
      links.append('circle').attr('cx', (d) => d.x).attr('cy', (d) => d.cy).attr('r', R)
        .attr('class', (d) => `tm-dot ${FILLED.has(d.s.type) ? 'filled' : 'hollow'}${match(d.s) ? (country === 'ALL' ? '' : ' pick') : ' dim'}`);

      const delaunay = d3.Delaunay.from(dots, (d) => d.x, (d) => d.cy);
      let hot = null;
      const setHot = (d, e) => {
        if (hot !== d) {
          links.select('circle').classed('hot', (o) => o === d);
          hot = d;
        }
        if (d) ctx.tip.show(e, tipHtml(d.s)); else ctx.tip.hide();
      };
      svg.on('pointermove', (e) => {
        const [mx, my] = d3.pointer(e);
        if (my < annTop + annH) return setHot(null);
        const d = dots[delaunay.find(mx, my)];
        setHot(d && Math.hypot(d.x - mx, d.cy - my) < 14 ? d : null, e);
        svg.style('cursor', hot ? 'pointer' : null);
      }).on('pointerleave', () => setHot(null))
        .on('click', (e) => {
          if (e.detail === 0) return; // keyboard Enter on a focused link opens it natively
          e.preventDefault();
          if (hot) window.open(hot.s.url, '_blank', 'noopener,noreferrer');
        });

      wrap.replaceChildren(svg.node());
    }

    draw();
    new ResizeObserver(() => requestAnimationFrame(() => { if (wrap.clientWidth !== lastW) draw(); })).observe(el);
  },
});
