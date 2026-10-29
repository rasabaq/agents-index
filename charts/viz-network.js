// Home page chart: company-country network. Companies link to every market they work in.
(window.CHARTS ??= []).push({
  id: 'network',
  title: 'Company network',
  blurb: 'Which companies and public bodies connect which countries? Each small dot is one of them, linked to every country it works in; global players sit in the middle, local ones cluster around their country.',
  render(el, ctx) {
    const { esc, emoji, flag } = ctx;
    if (!document.getElementById('v-network-style')) {
      document.head.insertAdjacentHTML('beforeend', `<style id="v-network-style">
.v-network { font-family: var(--font); }
.v-network .v-network-top { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px 24px; margin-bottom: 16px; }
.v-network .v-network-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.v-network .v-network-chip { display: inline-flex; align-items: center; height: 30px; padding: 0 12px; border: 1px solid var(--line); border-radius: 999px; background: rgba(255, 255, 255, 0.03); color: var(--ink-2); font: 500 11.5px/1 var(--mono); letter-spacing: 0.04em; cursor: pointer; }
.v-network .v-network-chip:hover { border-color: var(--line-strong); color: var(--ink); }
.v-network .v-network-chip[aria-pressed='true'] { background: var(--ink); border-color: var(--ink); color: var(--page); }
.v-network .v-network-chip .n { margin-left: 5px; font-variant-numeric: tabular-nums; opacity: .7; }
.v-network .v-network-legend { display: flex; flex-wrap: wrap; gap: 6px 16px; font: 400 11.5px/1.4 var(--mono); color: var(--ink-2); }
.v-network .v-network-legend span { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.v-network .v-network-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
.v-network .v-network-legend .country { width: 12px; height: 12px; box-sizing: border-box; background: var(--surface); border: 1.5px solid var(--ink-2); }
.v-network .v-network-legend b { display: inline-block; min-width: 3ch; font-weight: 400; font-variant-numeric: tabular-nums; color: var(--muted); }
.v-network svg { display: block; overflow: visible; }
.v-network .lk { stroke: var(--line-strong); stroke-width: 1; fill: none; }
.v-network .co { stroke: var(--surface); stroke-width: 1.5; }
.v-network .co.global { fill: var(--c1); }
.v-network .co.regional { fill: var(--c2); }
.v-network .co.local { fill: var(--c3); }
.v-network .ct .body { fill: var(--surface); stroke: var(--ink-2); stroke-width: 1.5; }
.v-network svg text.code { fill: var(--ink); font: 500 11.5px var(--mono); letter-spacing: .04em; }
.v-network svg text.flag { font-size: 15px; }
.v-network svg text.lbl { fill: var(--ink); font-size: 12.5px; font-weight: 500; stroke: var(--surface); stroke-width: 3px; stroke-linejoin: round; paint-order: stroke; pointer-events: none; }
.v-network .nd { outline: none; cursor: default; }
.v-network .nd:focus-visible .ring { stroke: var(--sunrise); stroke-width: 1.5; fill: none; }
.v-network .lk, .v-network .nd, .v-network .lbl { transition: opacity .15s; }
.v-network svg.hl .lk:not(.on), .v-network svg.hl .nd:not(.on), .v-network svg.hl .lbl:not(.on) { opacity: .12; }
.v-network svg.hl .lk.on { stroke: color-mix(in srgb, var(--sunrise) 65%, transparent); }
/* the node under the pointer or in focus lights up in sunrise */
.v-network .ct.hot .body { stroke: var(--sunrise); filter: var(--sun-glow); }
.v-network .ct.hot text.code { fill: var(--sunrise); }
.v-network .nd.hot:not(.ct) .ring { stroke: var(--sunrise); stroke-width: 1.5; }
@media (max-width: 560px) {
  .v-network .v-network-chips { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; margin: 0 -16px; padding: 2px 16px; }
  .v-network .v-network-chip { white-space: nowrap; flex: none; }
}
.v-network .v-network-note { margin: 12px 0 0; font-size: 12.5px; color: var(--muted); }
.v-network-tip .flags { font-variant-numeric: tabular-nums; }
.v-network-tip .role { display: block; margin-top: 6px; opacity: .85; }
</style>`);
    }

    const codes = ctx.meta.countries.map((c) => c.code);
    const countryName = Object.fromEntries(ctx.meta.countries.map((c) => [c.code, c.name]));
    // Global means three quarters of the tracked markets or more (6 of 8).
    const G = Math.ceil((codes.length * 3) / 4);
    const tracked = (c) => c.markets.filter((m) => codes.includes(m));
    const groupOf = (m) => (m >= G ? 'global' : m >= 2 ? 'regional' : 'local');
    const GROUPS = [['global', 'Global', `${G}–${codes.length} markets`], ['regional', 'Regional', `2–${G - 1} markets`], ['local', 'Local', '1 market']];
    const shown = ctx.companies.filter((c) => tracked(c).length);
    const hidden = ctx.companies.filter((c) => !shown.includes(c));
    let filter = 'all';
    const inFilter = (c) => filter === 'all' || c.categories.includes(filter);
    const count = (g) => shown.filter((c) => inFilter(c) && groupOf(tracked(c).length) === g).length;

    el.classList.add('v-network');
    el.innerHTML = `
      <div class="v-network-top">
        <div class="v-network-chips" role="group" aria-label="Filter companies by category">
          ${[['all', 'All', shown.length], ...ctx.meta.categories.map((c) => [c.id, c.name, shown.filter((s) => s.categories.includes(c.id)).length])]
            .map(([id, name, n]) => `<button type="button" class="v-network-chip" data-cat="${id}" aria-pressed="${id === 'all'}">${esc(name)}<span class="n">${n}</span></button>`).join('')}
        </div>
        <div class="v-network-legend">
          ${GROUPS.map(([g, name, desc]) => `<span><i class="${g}" style="background: var(--c${GROUPS.findIndex((x) => x[0] === g) + 1})"></i>${name} · ${desc} <b data-g="${g}">${count(g)}</b></span>`).join('')}
          <span><i class="country"></i>Country</span>
        </div>
      </div>
      <div class="v-network-plot"></div>
      ${hidden.length ? `<p class="v-network-note">${hidden.map((c) => esc(c.name)).join(', ')} ${hidden.length > 1 ? 'list' : 'lists'} no market in these countries yet, so ${hidden.length > 1 ? 'they are' : 'it is'} not shown.</p>` : ''}`;
    const plot = el.querySelector('.v-network-plot');

    ctx.edgeFade(el.querySelector('.v-network-chips'));
    el.querySelectorAll('.v-network-chip').forEach((b) => b.addEventListener('click', () => {
      filter = b.dataset.cat;
      // On phones the pills scroll sideways: bring the chosen one clear of the edge fades.
      const s = b.parentElement, r = b.getBoundingClientRect(), n = s.getBoundingClientRect();
      s.scrollBy({ left: r.left - n.left - (n.width - r.width) / 2, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      el.querySelectorAll('.v-network-chip').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      applyFilter();
    }));

    let svg, nodes, links, applyFilter = () => {};
    let lastW = 0;
    let active = null; // the one node in the tab order (roving tabindex); arrow keys move it

    function draw() {
      const W = plot.clientWidth;
      if (!W || W === lastW) return;
      lastW = W;
      const phone = W < 560;
      const H = Math.round(phone ? W * 1.45 : Math.min(640, Math.max(460, W * 0.58)));
      const R = phone ? 19 : 24; // country radius
      const pad = phone ? 6 : 10;
      const rScale = d3.scaleSqrt().domain([1, codes.length]).range(phone ? [3, 7.5] : [4, 10.5]);

      // Countries pinned on an ellipse, in meta order (Latin America sits together).
      const mx = phone ? R + 34 : R + 70, my = phone ? R + 34 : R + 48;
      const countries = ctx.meta.countries.map((c, i) => {
        const a = -Math.PI / 2 + (i / codes.length) * 2 * Math.PI;
        const x = W / 2 + (W / 2 - mx) * Math.cos(a), y = H / 2 + (H / 2 - my) * Math.sin(a);
        return { kind: 'country', id: c.code, r: R, x, y, fx: x, fy: y };
      });
      const cIdx = Object.fromEntries(countries.map((c) => [c.id, c]));
      const companies = shown.map((c, i) => {
        const mk = c.markets.filter((m) => codes.includes(m));
        // Seeded start: centroid of its markets plus a golden-angle offset, so every run is identical.
        const a = i * 2.39996, d = 4 * Math.sqrt(i + 1);
        return {
          kind: 'company', id: c.name, co: c, mk, group: groupOf(mk.length), r: rScale(mk.length),
          x: d3.mean(mk, (m) => cIdx[m].x) + d * Math.cos(a), y: d3.mean(mk, (m) => cIdx[m].y) + d * Math.sin(a),
        };
      });
      nodes = [...countries, ...companies];
      links = companies.flatMap((c) => c.mk.map((m) => ({ source: c, target: cIdx[m] })));

      const clamp = () => companies.forEach((n) => {
        n.x = Math.max(n.r + pad, Math.min(W - n.r - pad, n.x));
        n.y = Math.max(n.r + pad, Math.min(H - n.r - pad, n.y));
      });
      const sim = d3.forceSimulation(nodes).randomSource(d3.randomLcg(0.42))
        .force('link', d3.forceLink(links).distance((l) => (l.source.mk.length === 1 ? R + (phone ? 14 : 22) : phone ? 60 : 110)))
        .force('charge', d3.forceManyBody().strength((n) => (n.kind === 'country' ? (phone ? -60 : -120) : n.mk.length > 1 ? (phone ? -16 : -40) : phone ? -8 : -18)).distanceMax(phone ? 120 : 220))
        .force('collide', d3.forceCollide((n) => n.r + (n.kind === 'country' ? 3 : n.mk.length >= G ? (phone ? 15 : 26) : n.mk.length > 1 ? (phone ? 4 : 9) : 1.5)).iterations(3))
        .stop();
      for (let i = 0; i < 360; i++) { sim.tick(); clamp(); }

      plot.innerHTML = '';
      svg = d3.select(plot).append('svg').attr('width', W).attr('height', H).attr('viewBox', `0 0 ${W} ${H}`)
        .attr('role', 'group');
      const linkSel = svg.append('g').selectAll('line').data(links).join('line').attr('class', 'lk')
        .attr('x1', (l) => l.source.x).attr('y1', (l) => l.source.y).attr('x2', (l) => l.target.x).attr('y2', (l) => l.target.y);

      const coSel = svg.append('g').selectAll('g').data(companies).join('g').attr('class', 'nd')
        .attr('tabindex', -1).attr('role', 'img').attr('aria-label', (n) => `${n.id}, works in ${n.mk.map((m) => countryName[m]).join(', ')}`)
        .attr('transform', (n) => `translate(${n.x},${n.y})`);
      coSel.append('circle').attr('class', (n) => `co ${n.group}`).attr('r', (n) => n.r);
      coSel.append('circle').attr('class', 'ring').attr('r', (n) => n.r + 3).style('fill', 'none');

      const ctSel = svg.append('g').selectAll('g').data(countries).join('g').attr('class', 'nd ct')
        .attr('tabindex', -1).attr('role', 'img').attr('aria-label', (n) => countryName[n.id])
        .attr('transform', (n) => `translate(${n.x},${n.y})`);
      ctSel.append('circle').attr('class', 'body').attr('r', R);
      ctSel.append('circle').attr('class', 'ring').attr('r', R + 3).style('fill', 'none');
      ctSel.append('text').attr('class', 'flag').attr('text-anchor', 'middle').attr('y', phone ? -1 : -2).style('font-size', phone ? '13px' : null).text((n) => emoji(n.id));
      ctSel.append('text').attr('class', 'code').attr('text-anchor', 'middle').attr('y', phone ? 12 : 14).style('font-size', phone ? '11px' : null).text((n) => n.id);

      const lblG = svg.append('g');
      const nodeSel = svg.selectAll('.nd');

      // Hover/focus: light up a node, its links and its neighbors.
      const neighbors = (n) => new Set([n, ...links.filter((l) => l.source === n || l.target === n).map((l) => (l.source === n ? l.target : l.source))]);
      function focusOn(n, e) {
        const nb = neighbors(n);
        svg.classed('hl', true);
        nodeSel.classed('on', (d) => nb.has(d));
        linkSel.classed('on', (l) => l.source === n || l.target === n);
        lblG.selectAll('.lbl').classed('on', (d) => nb.has(d));
        nodeSel.classed('hot', (d) => d === n);
        ctx.tip.show(e, tipHtml(n));
        document.querySelector('[data-chart-tip]').classList.add('v-network-tip');
      }
      function clear() {
        svg.classed('hl', false);
        nodeSel.classed('hot', false);
        ctx.tip.hide();
        document.querySelector('[data-chart-tip]').classList.remove('v-network-tip');
      }
      const visible = (n) => n.kind === 'country' || filter === 'all' || n.co.categories.includes(filter);
      let current = null;
      svg.on('pointermove', (e) => {
        const [px, py] = d3.pointer(e);
        let best = null, bestD = Infinity;
        for (const n of nodes) {
          if (!visible(n)) continue;
          const d = Math.hypot(n.x - px, n.y - py) - n.r;
          if (d < bestD) { bestD = d; best = n; }
        }
        if (bestD > 10) best = null;
        if (best !== current) { current = best; best ? focusOn(best, e) : clear(); }
        else if (best) ctx.tip.show(e, tipHtml(best));
      }).on('pointerleave', () => { current = null; clear(); });
      nodeSel.on('focus', function (e, n) {
        const b = this.getBoundingClientRect();
        focusOn(n, { clientX: b.left + b.width / 2, clientY: b.top });
      }).on('blur', clear);

      // One tab stop: only the active node is tabbable. Arrow keys step through the countries, then the visible
      // companies by name; Home and End go to the first and last.
      const order = [...countries, ...companies.slice().sort((a, b) => a.id.localeCompare(b.id))];
      const roam = () => nodeSel.attr('tabindex', (n) => (n === active ? 0 : -1));
      nodeSel.on('keydown', (e, n) => {
        const vis = order.filter(visible), i = vis.indexOf(n);
        const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: vis.length - 1 }[e.key];
        if (to === undefined) return;
        e.preventDefault();
        if (!vis[to]) return;
        active = vis[to];
        roam();
        nodeSel.filter((d) => d === active).node().focus();
      });

      applyFilter = () => {
        clear();
        coSel.style('display', (n) => (visible(n) ? null : 'none'));
        linkSel.style('display', (l) => (visible(l.source) ? null : 'none'));
        placeLabels(companies.filter(visible));
        // A redraw makes new nodes, and a filter can hide the active one: fall back to the first country.
        active = (active && nodes.find((n) => n.id === active.id && visible(n))) || countries[0];
        roam();
        // The legend and the chart's name count what the filter shows.
        el.querySelectorAll('.v-network-legend b[data-g]').forEach((b) => (b.textContent = count(b.dataset.g)));
        const [g, r, l] = GROUPS.map(([id]) => count(id));
        svg.attr('aria-label', `Network of ${g + r + l} companies and public bodies${filter === 'all' ? '' : ` in ${ctx.catName(filter)}`}, linked to the ${codes.length} countries they work in: ${g} global, ${r} regional and ${l} local. Arrow keys move between them.`);
      };

      // Direct labels on every global company and the others with the most markets (about 8), placed without
      // overlaps. A global label that finds no clear spot next to its dot moves a little further out.
      function placeLabels(vis) {
        lblG.selectAll('*').remove();
        const sorted = vis.slice().sort((a, b) => b.mk.length - a.mk.length || b.co.categories.length - a.co.categories.length || a.id.localeCompare(b.id));
        const cut = sorted[7]?.mk.length ?? 0;
        const top = sorted.filter((n, i) => n.group === 'global' || i < 8 || (n.mk.length === cut && n.mk.length > 1 && i < 10));
        const boxes = [];
        const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        const hitsNode = (bx, n) => {
          const cx = Math.max(bx.x, Math.min(n.x, bx.x + bx.w)), cy = Math.max(bx.y, Math.min(n.y, bx.y + bx.h));
          return Math.hypot(n.x - cx, n.y - cy) < n.r + 3;
        };
        const others = [...countries, ...vis];
        for (const n of top) {
          const t = lblG.append('text').datum(n).attr('class', 'lbl').style('font-size', phone ? '12px' : null).text(n.id);
          const w = t.node().getComputedTextLength(), h = 14, must = n.group === 'global';
          const cands = (must ? [0, 6, 12] : [0]).flatMap((k) => {
            const g = n.r + (phone ? 3 : 4) + k;
            return [
              [n.x + g, n.y - h / 2], [n.x - g - w, n.y - h / 2],
              [n.x - w / 2, n.y - g - h], [n.x - w / 2, n.y + g],
              [n.x + g * 0.7, n.y - g * 0.7 - h], [n.x - g * 0.7 - w, n.y - g * 0.7 - h],
              [n.x + g * 0.7, n.y + g * 0.7], [n.x - g * 0.7 - w, n.y + g * 0.7],
            ].map(([x, y]) => ({ x, y, w, h, k }));
          })
            .filter((b) => b.x >= 2 && b.x + b.w <= W - 2 && b.y >= 2 && b.y + b.h <= H - 2 && !boxes.some((o) => overlaps(o, b)))
            .map((b) => ({ b, cost: others.filter((o) => o !== n && hitsNode(b, o)).length }))
            .sort((a, b) => a.cost - b.cost || a.b.k - b.b.k);
          if (!cands.length || (cands[0].cost > 0 && !must)) { t.remove(); continue; }
          const { b } = cands[0];
          boxes.push(b);
          t.attr('x', b.x).attr('y', b.y + h - 3);
        }
      }
      applyFilter();
    }

    function tipHtml(n) {
      const vis = (c) => filter === 'all' || c.categories.includes(filter);
      if (n.kind === 'country') {
        const works = shown.filter((c) => vis(c) && c.markets.includes(n.id)).length;
        const home = shown.filter((c) => vis(c) && c.hq === n.id).length;
        const scope = filter === 'all' ? '' : ` in ${esc(ctx.catName(filter))}`;
        return `<strong>${flag(n.id)}${esc(countryName[n.id])}</strong>
          ${works} ${works === 1 ? 'company or public body works' : 'companies or public bodies work'} here${scope}<br>
          ${home} ${home === 1 ? 'is' : 'are'} home-grown (headquartered here)`;
      }
      const c = n.co;
      return `<strong>${esc(c.name)}</strong>
        HQ ${flag(c.hq)}${esc(c.hq)} · ${n.mk.length} ${n.mk.length === 1 ? 'market' : 'markets'}<br>
        <span class="flags">${n.mk.map((m) => `<span style="white-space: nowrap">${flag(m)}${esc(m)}</span>`).join(' &nbsp;')}</span><br>
        ${c.categories.map((id) => esc(ctx.catName(id))).join(' · ')}
        <span class="role">${esc(c.roles[0])}</span>`;
    }

    draw();
    new ResizeObserver(() => requestAnimationFrame(draw)).observe(el);
  },
});
