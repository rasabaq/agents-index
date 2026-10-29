// Home page chart "flows": a hand-drawn two-column Sankey from company HQ country to the market where its agent capability works.
(() => {
  const CSS = `
.v-flows .fl-legend { margin-bottom: 12px; }
.v-flows .fl-legend .sw { opacity: .55; }
.v-flows .fl-legend .fl-home { background: var(--c3); opacity: .7; }
.v-flows .fl-legend .fl-key { color: var(--muted); }
.v-flows .fl-chart { position: relative; }
.v-flows svg { display: block; width: 100%; overflow: visible; }
.v-flows svg text { font-size: 13px; }
.v-flows svg.narrow text { font-size: 12px; }
.v-flows svg text.fl-head { fill: var(--muted); font: 500 10.5px var(--mono); letter-spacing: 0.14em; text-transform: uppercase; }
.v-flows .fl-num { fill: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }
.v-flows .fl-bar { fill: var(--muted); }
/* the hovered country, and both ends of a hovered ribbon, light up in sunrise */
.v-flows .fl-node.on text, .v-flows .fl-node.on .fl-num { fill: var(--sunrise); }
.v-flows .fl-node.on .fl-bar { fill: var(--sunrise); filter: var(--sun-glow); }
.v-flows .fl-rib { fill: var(--accent); fill-opacity: .45; transition: fill-opacity .15s, opacity .15s; }
.v-flows .fl-rib.home { fill: var(--c3); fill-opacity: .7; }
.v-flows svg.dim .fl-rib { opacity: .12; }
.v-flows svg.dim .fl-rib.on { opacity: 1; fill-opacity: .6; }
.v-flows svg.dim .fl-rib.home.on { fill-opacity: .8; }
.v-flows .fl-node { cursor: default; outline: none; }
.v-flows .fl-hit { fill: transparent; }
.v-flows .fl-node:focus-visible .fl-hit { stroke: var(--sunrise); stroke-width: 1.5; }
.v-flows .fl-note { margin: 16px 0 0; color: var(--ink-2); font-size: 14px; }
.v-flows .fl-note b { color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }
`;

  (window.CHARTS ??= []).push({
    id: 'flows',
    title: 'Flows',
    blurb: 'Whose companies and public bodies power the agents in each country? Each ribbon runs from the country where one is headquartered (left) to a market where its agent capability works (right), and its width is how many there are.',
    render(el, ctx) {
      if (!document.getElementById('v-flows-style')) {
        const s = document.createElement('style');
        s.id = 'v-flows-style';
        s.textContent = CSS;
        document.head.append(s);
      }
      const { esc, flag } = ctx;
      const tracked = new Set(ctx.meta.countries.map((c) => c.code));
      const markets = ctx.ranking.map((r) => r.code);
      const regionName = new Intl.DisplayNames(['en'], { type: 'region' });
      const nameOf = (code) => ctx.byCode[code]?.name ?? regionName.of(code);
      const ELSE = 'ELSE';
      let cat = 'all';

      el.classList.add('v-flows');
      const chips = [['all', 'All'], ...ctx.meta.categories.map((c) => [c.id, c.name])];
      el.innerHTML = `
        <div class="chart-controls" role="group" aria-label="Filter by category">${chips.map(([id, n]) =>
          `<button type="button" class="pill" data-cat="${id}" aria-pressed="${id === 'all'}">${esc(n)}</button>`).join('')}</div>
        <div class="chart-legend fl-legend">
          <span><i class="sw" style="background: var(--accent)"></i>From another country</span>
          <span><i class="sw fl-home"></i>Home-grown</span>
          <span class="fl-key">Ribbon width: companies and public bodies</span>
        </div>
        <div class="fl-chart"></div>
        <p class="fl-note"></p>`;
      ctx.edgeFade(el.querySelector('.chart-controls'));
      const chart = el.querySelector('.fl-chart');
      const note = el.querySelector('.fl-note');
      el.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => {
        cat = b.dataset.cat;
        // On phones the pills scroll sideways: bring the chosen one clear of the edge fades.
        const s = b.parentElement, r = b.getBoundingClientRect(), n = s.getBoundingClientRect();
        s.scrollBy({ left: r.left - n.left - (n.width - r.width) / 2, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        el.querySelectorAll('[data-cat]').forEach((x) => x.setAttribute('aria-pressed', x === b));
        draw();
      }));

      // One link per (HQ, market) pair. A category filter uses that category's own market list, so counts stay exact.
      function data() {
        const list = cat === 'all' ? ctx.companies : (ctx.categories.find((c) => c.category === cat)?.companies ?? []);
        const links = new Map();
        const other = new Map(); // HQ outside the tracked countries -> number of companies
        for (const co of list) {
          const ms = [...new Set(co.markets)].filter((m) => tracked.has(m));
          if (!ms.length) continue;
          const src = tracked.has(co.hq) ? co.hq : ELSE;
          if (src === ELSE) other.set(co.hq, (other.get(co.hq) ?? 0) + 1);
          for (const dst of ms) {
            const k = `${src}>${dst}`;
            if (!links.has(k)) links.set(k, { src, dst, names: [] });
            links.get(k).names.push(co.name);
          }
        }
        for (const l of links.values()) l.names.sort((a, b) => a.localeCompare(b));
        return { links: [...links.values()], other };
      }

      const sum = (ls) => d3.sum(ls, (l) => l.names.length);
      const plural = (n, w) => `${n} ${n === 1 ? w : w.replace(/y$/, 'ie') + 's'}`;
      const orgs = (n) => `${n} ${n === 1 ? 'company or public body' : 'companies and public bodies'}`;

      // SVG text: the flag is plain text here; the view CSS gives SVG text the flag font.
      function label(code, narrow) {
        if (code === ELSE) return 'Elsewhere';
        return `${ctx.emoji(code)} ${narrow ? code : nameOf(code)}`;
      }

      function nodeTip(n) {
        const rows = n.links.slice().sort((a, b) => b.names.length - a.names.length)
          .map((l) => { const c = n.side ? l.src : l.dst; return `${c === ELSE ? 'Elsewhere' : `${flag(c)}${esc(nameOf(c))}`} · ${l.names.length}`; });
        if (n.side) return `<strong>${orgs(n.value)}</strong>${n.value === 1 ? 'works' : 'work'} in ${flag(n.code)}${esc(nameOf(n.code))}, by HQ:<br>${rows.join('<br>')}`;
        const cos = new Set(n.links.flatMap((l) => l.names)).size;
        const head = n.code === ELSE
          ? `Elsewhere: ${[...n.other].sort((a, b) => b[1] - a[1] || nameOf(a[0]).localeCompare(nameOf(b[0]))).map(([c, k]) => `${esc(nameOf(c))} (${k})`).join(', ')}`
          : `${flag(n.code)}${esc(nameOf(n.code))}`;
        return `<strong>${plural(n.value, 'market link')}</strong>${orgs(cos)} headquartered in ${head}<br>${rows.join('<br>')}`;
      }

      function ribbonTip(l) {
        const from = l.src === ELSE ? 'Elsewhere' : `${flag(l.src)}${esc(nameOf(l.src))}`;
        const shown = l.names.slice(0, 12).map(esc).join(', ');
        const more = l.names.length > 12 ? `, +${l.names.length - 12} more` : '';
        const home = l.src === l.dst ? ' (home-grown)' : '';
        return `<strong>${orgs(l.names.length)}</strong>${from} → ${flag(l.dst)}${esc(nameOf(l.dst))}${home}<br>${shown}${more}`;
      }

      function draw() {
        ctx.tip.hide();
        const W = chart.clientWidth;
        const narrow = W < 560;
        const { links, other } = data();
        chart.innerHTML = '';
        const total = sum(links);
        if (!total) {
          chart.innerHTML = `<p class="muted">No companies or public bodies in this category work in the ${markets.length} tracked countries.</p>`;
          note.textContent = '';
          return;
        }

        // Nodes: HQs by total (Elsewhere last), markets in ranking order.
        const leftCodes = d3.groupSort(links, (v) => -sum(v), (l) => l.src).filter((c) => c !== ELSE);
        if (links.some((l) => l.src === ELSE)) leftCodes.push(ELSE);
        const mk = (code, side) => {
          const ls = links.filter((l) => (side ? l.dst : l.src) === code);
          return { code, side, links: ls, value: sum(ls), other };
        };
        const left = leftCodes.map((c) => mk(c, 0));
        const right = markets.map((c) => mk(c, 1));

        // Vertical layout: one scale for both columns; each column spreads its leftover height as gaps.
        const top = 30, H = narrow ? 420 : 500, minPad = narrow ? 14 : 20, nodeW = narrow ? 8 : 10, gap = narrow ? 6 : 8;
        const ky = (H - minPad * (Math.max(left.length, right.length) - 1)) / total;
        for (const col of [left, right]) {
          const pad = col.length > 1 ? (H - total * ky) / (col.length - 1) : 0;
          let y = top;
          for (const n of col) { n.y0 = y; n.y1 = y + n.value * ky; y = n.y1 + pad; }
        }
        const idx = (code, col) => col.findIndex((n) => n.code === code);
        for (const n of left) {
          let y = n.y0;
          for (const l of n.links.sort((a, b) => idx(a.dst, right) - idx(b.dst, right))) { l.sy0 = y; y += l.names.length * ky; l.sy1 = y; }
        }
        for (const n of right) {
          let y = n.y0;
          for (const l of n.links.sort((a, b) => idx(a.src, left) - idx(b.src, left))) { l.ty0 = y; y += l.names.length * ky; l.ty1 = y; }
        }

        const svg = d3.select(chart).append('svg')
          .attr('class', narrow ? 'narrow' : null)
          .attr('viewBox', `0 0 ${W} ${top + H + 4}`)
          .attr('height', top + H + 4)
          .attr('role', 'group')
          .attr('aria-label', `Flow diagram of ${total} links between a company or public body and a market, from headquarters on the left to the ${markets.length} markets on the right.`);

        // Labels first, so their measured widths set the node positions.
        const nodes = svg.append('g').selectAll('g').data([...left, ...right]).join('g')
          .attr('class', 'fl-node').attr('tabindex', 0).attr('role', 'img')
          .attr('aria-label', (n) => `${n.code === ELSE ? 'Elsewhere' : nameOf(n.code)}: ${n.side ? orgs(n.value) : plural(n.value, 'market link')}`);
        const hit = nodes.append('rect').attr('class', 'fl-hit').attr('rx', 6);
        nodes.append('rect').attr('class', 'fl-bar').attr('rx', 2);
        const text = nodes.append('text').attr('dy', '0.35em');
        text.append('tspan').text((n) => label(n.code, narrow));
        text.append('tspan').attr('class', 'fl-num').attr('dx', 6).text((n) => n.value);
        const width = (side) => d3.max(text.filter((n) => n.side === side).nodes(), (t) => t.getComputedTextLength()) ?? 0;
        const lw = Math.ceil(width(0)), rw = Math.ceil(width(1));
        const x0 = lw + gap, x1 = W - rw - gap - nodeW;

        nodes.select('.fl-bar')
          .attr('x', (n) => (n.side ? x1 : x0)).attr('width', nodeW)
          .attr('y', (n) => n.y0).attr('height', (n) => Math.max(n.y1 - n.y0, 1));
        text.attr('x', (n) => (n.side ? x1 + nodeW + gap : x0 - gap))
          .attr('y', (n) => (n.y0 + n.y1) / 2)
          .attr('text-anchor', (n) => (n.side ? 'start' : 'end'));
        hit.attr('x', (n) => (n.side ? x1 - 4 : 0)).attr('width', (n) => (n.side ? W - x1 + 4 : x0 + nodeW + 4))
          .attr('y', (n) => Math.min(n.y0, (n.y0 + n.y1) / 2 - 11) - 2)
          .attr('height', (n) => Math.max(n.y1 - n.y0, 22) + 4);

        svg.append('text').attr('class', 'fl-head').attr('x', 0).attr('y', 12).text(narrow ? 'Headquarters' : 'Where it is headquartered');
        svg.append('text').attr('class', 'fl-head').attr('x', W).attr('y', 12).attr('text-anchor', 'end').text(narrow ? 'Market' : 'Where its agents work');

        // Ribbons: filled bands between the two node edges; home-grown drawn last so it sits on top.
        const a = x0 + nodeW, b = x1, m = (a + b) / 2;
        const ribs = svg.insert('g', ':first-child').selectAll('path')
          .data(links.slice().sort((p, q) => (p.src === p.dst) - (q.src === q.dst))).join('path')
          .attr('class', (l) => `fl-rib${l.src === l.dst ? ' home' : ''}`)
          .attr('d', (l) => {
            // A 1px surface gap between stacked ribbons (skipped for hairline ribbons).
            const g = l.sy1 - l.sy0 > 3 ? 0.5 : 0, s0 = l.sy0 + g, s1 = l.sy1 - g, t0 = l.ty0 + g, t1 = l.ty1 - g;
            return `M${a},${s0}C${m},${s0} ${m},${t0} ${b},${t0}L${b},${t1}C${m},${t1} ${m},${s1} ${a},${s1}Z`;
          });

        const focus = (pred, lit) => { svg.classed('dim', true); ribs.classed('on', pred); nodes.classed('on', lit); };
        const clear = () => { svg.classed('dim', false); ribs.classed('on', false); nodes.classed('on', false); ctx.tip.hide(); };
        ribs.on('pointerenter pointermove', (e, l) => { focus((r) => r === l, (n) => n.code === (n.side ? l.dst : l.src)); ctx.tip.show(e, ribbonTip(l)); })
          .on('pointerleave', clear);
        const nodeOn = (e, n) => { focus((r) => n.links.includes(r), (m) => m === n); ctx.tip.show(e, nodeTip(n)); };
        nodes.on('pointerenter pointermove', nodeOn).on('pointerleave', clear)
          .on('focus', function (e, n) {
            const r = this.getBoundingClientRect();
            nodeOn({ clientX: r.left + r.width / 2, clientY: r.top }, n);
          })
          .on('blur', clear);

        // The one computed sentence: the US share of links.
        const us = sum(links.filter((l) => l.src === 'US'));
        const scope = cat === 'all' ? '' : ` in ${ctx.catName(cat)}`;
        note.innerHTML = `<b>${us}</b> of <b>${total}</b> market links${esc(scope)} (<b>${Math.round((us / total) * 100)}%</b>) come from companies and public bodies headquartered in the United States.`;
      }

      let lastW = 0;
      new ResizeObserver(() => requestAnimationFrame(() => {
        const w = chart.clientWidth;
        if (w && w !== lastW) { lastW = w; draw(); }
      })).observe(el);
      draw();
      document.fonts?.ready.then(draw); // label widths are measured; remeasure once the web font loads
    },
  });
})();
