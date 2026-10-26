// Agent Atlas view "map": a dot-matrix world map. Each tracked country's dots are tinted by its overall score.
(() => {
  // Land on a Natural Earth grid (139 x 65 cells, Antarctica cropped), rasterized from world-atlas 2.0.2 (110m).
  // '.' = sea, '#' = other land, a letter = a tracked country (see CODE).
  const GRID = [
    "........................................######################.............................................................................",
    "..................................##########################........#####.....#............#####...........................................",
    ".............................#############..################.........#............###.......#######......###...............................",
    "...........................######.########......###########......................##......###############...................................",
    ".........#.....UUU........#######.##########....##########..............###......##...#############################........................",
    ".......##...UUUUUUUU########################....##########............########.#.##########################################................",
    "......####UUUUUUUUU####################.#####..#######...####........#######################################################...............",
    ".......#U.UUUUUUUU####################.#####....####.....####......##########################################################..............",
    ".........UUUUUUUUU################...######.....###...............#####.#####################################################..............",
    "........UUUUUUUUUU###############.....######.....##...............####################################################..##.................",
    ".........UUU......U###############....######...................GG...###.##########################################.....###.................",
    ".......UU.........U##########################.................GGG...D#############################################.....####................",
    ".................############################................##GGG#DDD###############################################...###................",
    "..................###########################..................GG##DDD################################################...#.................",
    "..................##UUUUUUUUUUU###############.................#####DD################################################.....................",
    "..................UUUUUUUUUUUUUUUU#####U###..#..................#######################################################....................",
    "..................UUUUUUUUUUUUUUUU##UUUU##....................#.############.######.#################################.##...................",
    ".................UUUUUUUUUUUUUUUUUUUUU.......................#####..########.##.####.###############################..##...................",
    ".................UUUUUUUUUUUUUUUUUUUU........................#####..#.##############.##############################...##...................",
    ".................UUUUUUUUUUUUUUUUUUU.........................####.....##.############.##############################..##...................",
    ".................UUUUUUUUUUUUUUUUUUU..........................########...##.####################################..##.###...................",
    ".................UUUUUUUUUUUUUUUUUU..........................#########.........###############II#################.#.###....................",
    "..................MMUUUUUUUUUUUUU............................###########.###.##################I##################..#......................",
    "..................MMMMMUUUUUUUUUU............................#################################III#################.........................",
    "...................MMMMMMUU....UU..........................##################################IIIII####II##########.........................",
    "...................M.MMMMM......U#.........................###########################.######IIIIIIIIII############........................",
    "....................MMMMMM.....###........................###############################...#IIIIIIII#I############........................",
    "UU....................MMMM..MM#.##........................######################.#########...IIIIIIII##########............................",
    ".U....................MMMM.MMM...####.....................###############################.....IIIIIII..########............................",
    ".......................MMMMM#....#.#.#....................#######################.######.......IIIII...######.....##.......................",
    ".........................MM####..........................##############################........IIII.....######....#........................",
    "...........................####...........................###########################...........II.......#####....##.......................",
    ".............................##..OO#####..................############################..........II.......######...###......................",
    "..............................###OO#####...................###########################..........II#......##.##....####.....................",
    "...............................#OOO######..................###########################............#.......##.....#.###.....................",
    "................................OOOOO#######.................####..###################..................####....###........................",
    "................................OOOOO#BB###B.........................################....................####..###.........................",
    "...............................##OOOBBBBBBBB.........................###############......................###.#######.#....................",
    "...............................###OOBBBBBBBBBBB.....................###############.......................###.######...##.#................",
    "...............................#####BBBBBBBBBBBBB....................#############.........................##..#####.#########.##..........",
    "...............................####BBBBBBBBBBBBBBBB...................############..........................##....#.#.....########.........",
    "...............................###BBBBBBBBBBBBBBBBB...................############...........................####.......#.#####...##.......",
    "................................###BBBBBBBBBBBBBBBB...................############...............................##.##.....##.##...#.......",
    "................................######BBBBBBBBBBBB....................############.....................................###.##..............",
    ".................................#######BBBBBBBBB.....................############..##...............................#####.##..............",
    "..................................######BBBBBBBBB.....................############.###..............................######.##........#.....",
    "...................................######BBBBBBBB.....................###########..###.............................##########............##",
    "....................................C####BBBBBBBB.....................##########...##............................#############......#......",
    "....................................C#####BBBBBBB.....................##########..###..........................################.....#......",
    "....................................CC#####BBBB........................#########..###..........................################............",
    "....................................C######BBB.........................########...............................#################............",
    "....................................C######BBB.........................#######................................#################............",
    "....................................C#####BBB..........................#######.................................################............",
    "....................................C#######B...........................#####.................................################.............",
    "....................................C#######............................####..................................####....#######..............",
    "....................................C######............................................................................#####.........#.....",
    "....................................C######............................................................................####.........###....",
    "....................................C####...............................................................................##........###......",
    "....................................CC###...............................................................................##.......###.......",
    ".....................................C###......................................................................................###.........",
    ".....................................C###......................................................................................##..........",
    ".....................................C###.................................................#................................................",
    ".....................................CC#...#...............................................................................................",
    "......................................CCC..................................................................................................",
    ".......................................CC#.................................................................................................",

  ];
  const CODE = { U: 'US', G: 'GB', D: 'DE', I: 'IN', B: 'BR', M: 'MX', C: 'CL', O: 'CO' };
  // Label spots in grid cells [col, row, text-anchor], placed in open sea so they never collide.
  const LABELS = {
    US: [16.5, 18.5, 'end'], MX: [15, 23, 'end'], CO: [27, 33, 'end'], CL: [31, 54, 'end'],
    BR: [51, 44, 'start'], IN: [93, 36.5, 'start'], GB: [59, 19, 'end'], DE: [59, 21.5, 'end'],
  };
  const WIDE = 1040; // below this frame width, labels move to a list under the map
  const PAD = 3; // cells of room left of the map for the US label (wide mode only)
  const tint = (score) => `color-mix(in oklab, var(--s-live) ${score}%, var(--surface-2))`;

  const CSS = `
    .v-map { position: relative; }
    .v-map-legend { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; margin-bottom: 12px; font-size: 13px; color: var(--ink-2); }
    .v-map-legend .scale { display: inline-flex; align-items: center; gap: 8px; font-variant-numeric: tabular-nums; }
    .v-map-legend .ramp { width: clamp(56px, 16vw, 120px); height: 8px; border-radius: 4px; background: linear-gradient(90deg in oklab, var(--surface-2), var(--s-live)); }
    .v-map-legend .dot { display: inline-block; width: 8px; height: 8px; margin-right: 6px; border-radius: 50%; background: var(--line); vertical-align: 0; }
    .v-map svg { display: block; width: 100%; height: auto; overflow: visible; }
    .v-map .land { fill: var(--line); }
    .v-map .country { cursor: pointer; outline: none; transition: opacity .15s; }
    .v-map svg.hovering .country:not(.on) { opacity: .35; }
    .v-map .hit { fill: transparent; }
    .v-map .leader { stroke: var(--line-strong); stroke-width: 1; fill: none; }
    .v-map .label { font-size: 13px; dominant-baseline: central; paint-order: stroke; stroke: var(--surface); stroke-width: 4px; stroke-linejoin: round; }
    .v-map .label .name { fill: var(--ink-2); font-weight: 500; }
    .v-map .label .score { fill: var(--ink); font-weight: 650; font-variant-numeric: tabular-nums; }
    .v-map .ring { fill: none; stroke: var(--accent); stroke-width: 2; opacity: 0; }
    .v-map .country:focus-visible .ring { opacity: 1; }
    .v-map-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 230px), 1fr)); gap: 2px 16px; margin: 16px 0 0; padding: 0; list-style: none; font-size: 14px; }
    .v-map-list[hidden] { display: none; }
    .v-map-list li { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 8px; cursor: pointer; }
    .v-map-list li:hover { background: var(--surface-2); }
    .v-map-list .rank { width: 1.4em; color: var(--muted); font-size: 13px; font-variant-numeric: tabular-nums; }
    .v-map-list .sw { flex: none; width: 10px; height: 10px; border-radius: 50%; }
    .v-map-list .name { flex: 1; color: var(--ink-2); }
    .v-map-list .score { color: var(--ink); font-weight: 650; font-variant-numeric: tabular-nums; }
    .v-map-tip { display: grid; grid-template-columns: 1fr auto; gap: 1px 16px; margin-top: 6px; font-variant-numeric: tabular-nums; }
    .v-map-tip span:nth-child(odd) { opacity: .75; }
    .v-map-tip span:nth-child(even) { text-align: right; font-weight: 600; }
  `;

  (window.ATLAS_VIEWS ??= []).push({
    id: 'map',
    title: 'World map',
    blurb: 'Shows where in the world agents can act today: each dot is a patch of land, and a brighter dot means a higher overall score out of 100.',
    render(el, ctx) {
      if (!document.getElementById('v-map-style')) {
        document.head.insertAdjacentHTML('beforeend', `<style id="v-map-style">${CSS}</style>`);
      }
      const { esc, emoji, ranking, byCode, meta } = ctx;
      const COLS = GRID[0].length, ROWS = GRID.length;
      const cells = GRID.flatMap((row, r) => [...row].flatMap((ch, c) => (ch === '.' ? [] : [{ c, r, code: CODE[ch] }])));
      const tied = (d) => ranking.filter((x) => x.rank === d.rank).length > 1;

      const tipHtml = (d) => `<strong>${emoji(d.code)} ${esc(d.name)}</strong>
        Score <b>${d.score}</b> of 100 · rank ${d.rank} of ${ranking.length}${tied(d) ? ' (tied)' : ''}
        <div class="v-map-tip">${meta.categories.map((cat) => `<span>${esc(cat.name)}</span><span>${d.byCategory[cat.id]}</span>`).join('')}</div>`;
      const show = (e, d) => {
        let pt = e;
        if (e.clientX == null || e.type === 'focus') {
          const b = (e.currentTarget.querySelector('.label') ?? e.currentTarget).getBoundingClientRect();
          pt = { clientX: b.left + b.width / 2, clientY: b.top };
        }
        ctx.tip.show(pt, tipHtml(d));
      };
      const hover = (svg, code) => {
        svg.classList.toggle('hovering', !!code);
        svg.querySelectorAll('.country').forEach((g) => g.classList.toggle('on', g.dataset.code === code));
      };

      el.innerHTML = `<div class="v-map">
        <div class="atlas-legend v-map-legend">
          <span class="scale">Overall score <span>0</span><span class="ramp" aria-hidden="true"></span><span>100</span></span>
          <span><span class="dot" aria-hidden="true"></span>Not tracked</span>
        </div>
        <svg role="img" aria-label="${esc(`Dot map of the world. Tracked countries by overall score: ${ranking.map((d) => `${d.name} ${d.score}`).join(', ')}.`)}"></svg>
        <ol class="v-map-list" aria-label="Countries by score"></ol>
      </div>`;
      const svgEl = el.querySelector('svg'), list = el.querySelector('.v-map-list');
      const svg = d3.select(svgEl);

      list.innerHTML = ranking.map((d) => `<li tabindex="0" data-code="${d.code}">
        <span class="rank">${d.rank}</span><span class="sw" style="background:${tint(d.score)}"></span>
        <span class="name">${emoji(d.code)} ${esc(d.name)}</span><span class="score">${d.score}</span></li>`).join('');
      list.querySelectorAll('li').forEach((li) => {
        const d = byCode[li.dataset.code];
        li.addEventListener('pointermove', (e) => show(e, d));
        li.addEventListener('click', (e) => show(e, d));
        li.addEventListener('focus', (e) => show(e, d));
        li.addEventListener('pointerleave', () => ctx.tip.hide());
        li.addEventListener('blur', () => ctx.tip.hide());
      });

      let lastW = 0;
      function draw() {
        const W = svgEl.parentElement.clientWidth;
        if (!W || W === lastW) return;
        lastW = W;
        const wide = el.clientWidth >= WIDE;
        const pad = wide ? PAD : 0, k = W / (COLS + pad), H = Math.round(k * ROWS), r = k * 0.36;
        list.hidden = wide;
        svg.attr('viewBox', `0 0 ${W} ${H}`).selectAll('*').remove();
        const cx = (c) => (c + pad + 0.5) * k, cy = (row) => (row + 0.5) * k;

        svg.append('g').selectAll('circle').data(cells.filter((d) => !d.code)).join('circle')
          .attr('class', 'land').attr('cx', (d) => cx(d.c)).attr('cy', (d) => cy(d.r)).attr('r', r);

        const g = svg.append('g').selectAll('g').data(ranking).join('g')
          .attr('class', 'country').attr('data-code', (d) => d.code)
          .attr('tabindex', 0).attr('role', 'button')
          .attr('aria-label', (d) => `${d.name}: score ${d.score} of 100, rank ${d.rank} of ${ranking.length}`)
          .on('pointermove click', function (e, d) { hover(svgEl, d.code); show(e, d); })
          .on('focus', function (e, d) { hover(svgEl, d.code); show(e, d); })
          .on('pointerleave blur', () => { hover(svgEl, null); ctx.tip.hide(); });

        g.each(function (d) {
          const gs = d3.select(this), mine = cells.filter((x) => x.code === d.code);
          gs.selectAll('rect').data(mine).join('rect').attr('class', 'hit')
            .attr('x', (x) => (x.c + pad) * k).attr('y', (x) => x.r * k).attr('width', k).attr('height', k);
          gs.selectAll('circle').data(mine).join('circle')
            .attr('cx', (x) => cx(x.c)).attr('cy', (x) => cy(x.r)).attr('r', r).style('fill', tint(d.score));
          if (!wide) return;

          const [lc, lr, anchor] = LABELS[d.code];
          const lx = (lc + pad) * k, ly = lr * k;
          const text = gs.append('text').attr('class', 'label').attr('x', lx).attr('y', ly).attr('text-anchor', anchor);
          text.append('tspan').attr('class', 'name').text(`${emoji(d.code)} ${d.name}`);
          text.append('tspan').attr('class', 'score').attr('dx', 6).text(d.score);
          const b = text.node().getBBox();
          gs.insert('rect', 'text').attr('class', 'ring').attr('rx', 6)
            .attr('x', b.x - 6).attr('y', b.y - 3).attr('width', b.width + 12).attr('height', b.height + 6);
          gs.insert('rect', 'text').attr('class', 'hit')
            .attr('x', b.x - 6).attr('y', b.y - 3).attr('width', b.width + 12).attr('height', b.height + 6);
          // Leader: from the label's inner edge to the nearest dot of the country, stopping short of the dot.
          const sx = anchor === 'end' ? b.x + b.width + 4 : b.x - 4;
          const near = d3.least(mine, (x) => Math.hypot(cx(x.c) - sx, cy(x.r) - ly));
          const dx = cx(near.c) - sx, dy = cy(near.r) - ly, len = Math.hypot(dx, dy), stop = r + 2;
          if (len > stop + 4) {
            gs.insert('line', 'rect').attr('class', 'leader').attr('x1', sx).attr('y1', ly)
              .attr('x2', sx + dx * (1 - stop / len)).attr('y2', ly + dy * (1 - stop / len));
          }
        });
      }
      draw();
      new ResizeObserver(() => requestAnimationFrame(draw)).observe(el);
    },
  });
})();
