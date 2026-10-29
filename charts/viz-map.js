// Home page chart "map": a pixel world map. Each tracked country's square dots are tinted by its overall score;
// the hovered, focused or selected country lights up in sunrise. Clicking a country (or Enter / Space on it) picks it
// in the console below: its marks carry data-go-country, which app.js handles like every other country picker.
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
  const ON = ':is(.on, [aria-current="true"])'; // hovered or focused (.on), or the selected country

  // Fixed row heights (18px legend rows, 40px list rows) keep the drawn height predictable: charts.css reserves it
  // for the empty slot ("The map opens the data"), so change both together.
  const CSS = `
    .v-map { position: relative; }
    .v-map-legend { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 20px; margin-bottom: 12px; font-size: 13px; color: var(--ink-2); }
    .v-map-legend > span { display: inline-flex; align-items: center; height: 18px; font-variant-numeric: tabular-nums; }
    .v-map-legend .scale { gap: 8px; }
    /* the ramp is cut into 4px cells, like the map */
    .v-map-legend .ramp { width: clamp(56px, 16vw, 120px); height: 8px; background: linear-gradient(90deg, var(--page) 1px, transparent 1px) 0 0 / 4px 4px, linear-gradient(var(--page) 1px, transparent 1px) 0 0 / 4px 4px, linear-gradient(90deg in oklab, var(--surface-2), var(--s-live)); }
    .v-map-legend .tiers { gap: 12px; }
    .v-map-legend .tiers b { margin-right: 4px; font: 400 18px/1 var(--pixel); }
    .v-map-legend .v-map-dot { width: 7px; height: 7px; margin-right: 7px; background: var(--line-strong); opacity: .7; }
    .v-map svg { display: block; width: 100%; height: auto; overflow: visible; }
    .v-map .land { fill: var(--line-strong); opacity: .7; }
    .v-map .country { cursor: pointer; outline: none; transition: opacity .15s; }
    .v-map .country .px { fill: var(--t); }
    .v-map .country${ON} .px { fill: var(--sunrise); }
    .v-map .country${ON} { filter: var(--sun-glow); }
    .v-map svg.hovering .country:not(.on, [aria-current="true"]) { opacity: .35; }
    .v-map .hit { fill: transparent; }
    .v-map .leader { stroke: var(--line-strong); stroke-width: 1; fill: none; }
    /* country names in spaced capitals, the map convention */
    .v-map .v-map-label { font-size: 13px; letter-spacing: .16em; text-transform: uppercase; dominant-baseline: central; paint-order: stroke; stroke: var(--surface); stroke-width: 4px; stroke-linejoin: round; }
    .v-map .v-map-label .name { fill: var(--ink-2); font-weight: 500; }
    .v-map .v-map-label .score { fill: var(--ink); font-weight: 650; font-variant-numeric: tabular-nums; }
    .v-map .country${ON} .v-map-label tspan { fill: var(--sunrise); }
    .v-map .ring { fill: none; stroke: var(--sunrise); stroke-width: 1.5; opacity: 0; }
    .v-map .country:focus-visible .ring { opacity: 1; }
    .v-map-list { display: grid; grid-template-columns: minmax(0, 1fr); gap: 2px 16px; margin: 16px 0 0; padding: 0; list-style: none; font-size: 14px; }
    .v-map-list[hidden] { display: none; }
    .v-map-list button { display: flex; align-items: center; gap: 10px; width: 100%; height: 40px; padding: 0 8px; border: 0; border-radius: 8px; background: none; text-align: left; cursor: pointer; }
    .v-map-list button:is(:hover, :focus-visible, [aria-current="true"]) { background: var(--sun-tint); }
    .v-map-list button:is(:hover, :focus-visible, [aria-current="true"]) :is(.name, .score) { color: var(--sunrise); }
    .v-map-list .pos { width: 1.6em; color: var(--muted); font: 500 11.5px/1 var(--mono); font-variant-numeric: tabular-nums; }
    .v-map-list .sw { flex: none; width: 10px; height: 10px; }
    .v-map-list .name { flex: 1; min-width: 0; overflow: hidden; color: var(--ink-2); text-overflow: ellipsis; white-space: nowrap; }
    .v-map-list .score { color: var(--ink); font-weight: 650; font-variant-numeric: tabular-nums; }
    .v-map-tip { display: grid; grid-template-columns: 1fr auto; gap: 1px 16px; margin-top: 6px; font-variant-numeric: tabular-nums; }
    .v-map-tip span:nth-child(even) { font-family: var(--mono); font-size: 12px; }
    .v-map-tip span:nth-child(odd) { opacity: .75; }
    .v-map-tip span:nth-child(even) { text-align: right; font-weight: 600; }
    /* below the wide layout the tier cuts take their own legend row; on phones every legend part does */
    @media (max-width: 1089px) { .v-map-legend .tiers { flex-basis: 100%; order: 1; } }
    @media (max-width: 520px) { .v-map-legend { flex-direction: column; align-items: flex-start; gap: 6px; } .v-map-legend .tiers { order: 0; } }
    @media (min-width: 601px) { .v-map-list { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  `;

  (window.CHARTS ??= []).push({
    id: 'map',
    title: 'World map',
    blurb: 'Where agents can act today. A brighter dot means a higher overall score out of 100. Pick a country to open it below.',
    render(el, ctx) {
      if (!document.getElementById('v-map-style')) {
        document.head.insertAdjacentHTML('beforeend', `<style id="v-map-style">${CSS}</style>`);
      }
      const { esc, emoji, flag, ranking, byCode, meta, TIERS } = ctx;
      const COLS = GRID[0].length, ROWS = GRID.length;
      const cells = GRID.flatMap((row, r) => [...row].flatMap((ch, c) => (ch === '.' ? [] : [{ c, r, code: CODE[ch] }])));
      const tied = (d) => ranking.filter((x) => x.rank === d.rank).length > 1;
      const label = (d) => `${d.name}: score ${d.score} of 100, rank ${d.rank} of ${ranking.length}`;
      // The country app.js has selected, read from any picker on the page. Pickers that draw after app.js are not
      // marked by it, so they mark themselves from this; later changes reach them through selectCountry.
      // ponytail: if the map draws before app.js has rendered a picker, nothing is lit until the next selection.
      const current = () => document.querySelector('[data-go-country][aria-current="true"]')?.dataset.goCountry;

      const tipHtml = (d) => `<strong>${flag(d.code)}${esc(d.name)}</strong>
        Score <b>${d.score}</b> of 100 · rank ${d.rank} of ${ranking.length}${tied(d) ? ' (tied)' : ''}
        <div class="v-map-tip">${meta.categories.map((cat) => `<span>${esc(cat.name)}</span><span>${d.byCategory[cat.id]}</span>`).join('')}</div>`;
      const show = (e, d) => {
        let pt = e;
        if (e.clientX == null || e.type === 'focus') {
          const b = (e.currentTarget.querySelector('.v-map-label') ?? e.currentTarget).getBoundingClientRect();
          pt = { clientX: b.left + b.width / 2, clientY: b.top };
        }
        ctx.tip.show(pt, tipHtml(d));
      };
      const hover = (svg, code) => {
        svg.classList.toggle('hovering', !!code);
        svg.querySelectorAll('.country').forEach((g) => g.classList.toggle('on', g.dataset.code === code));
      };
      // Tier cuts as the console shows tiers: the pixel letter in its tier color, then where the tier starts.
      const cut = (t, i) => (t.min ? `${t.min}+` : `&lt;${TIERS[i - 1].min}`);
      const tiers = TIERS.map((t, i) => `<span><b style="color:var(--tier-${t.letter.toLowerCase()})">${t.letter}</b>${cut(t, i)}</span>`).join('');

      el.innerHTML = `<div class="v-map">
        <div class="chart-legend v-map-legend">
          <span class="scale">Overall score <span>0</span><span class="ramp" aria-hidden="true"></span><span>100</span></span>
          <span class="tiers">Tiers ${tiers}</span>
          <span><span class="v-map-dot" aria-hidden="true"></span>Not tracked</span>
        </div>
        <svg role="group" aria-label="${esc(`Dot map of the world. Tracked countries by overall score: ${ranking.map((d) => `${d.name} ${d.score}`).join(', ')}.`)}"></svg>
        <ol class="v-map-list" aria-label="Countries by score"></ol>
      </div>`;
      const svgEl = el.querySelector('svg'), list = el.querySelector('.v-map-list');
      const svg = d3.select(svgEl);

      list.innerHTML = ranking.map((d) => `<li><button type="button" data-go-country="${d.code}" aria-current="${d.code === current()}" aria-label="${esc(label(d))}">
        <span class="pos" aria-hidden="true">${d.rank}</span><span class="sw" style="background:${tint(d.score)}"></span>
        <span class="name">${flag(d.code)}${esc(d.name)}</span><span class="score">${d.score}</span></button></li>`).join('');
      list.querySelectorAll('button').forEach((b) => {
        const d = byCode[b.dataset.goCountry];
        b.addEventListener('pointermove', (e) => show(e, d));
        b.addEventListener('focus', (e) => show(e, d));
        b.addEventListener('pointerleave', () => ctx.tip.hide());
        b.addEventListener('blur', () => ctx.tip.hide());
      });

      let lastW = 0;
      function draw() {
        const W = svgEl.parentElement.clientWidth;
        if (!W || W === lastW) return;
        lastW = W;
        const wide = el.clientWidth >= WIDE;
        // Each cell holds one square pixel; r is half its side. H is not rounded, so the height matches charts.css.
        const pad = wide ? PAD : 0, k = W / (COLS + pad), H = k * ROWS, r = k * 0.32;
        const sel = current();
        list.hidden = wide;
        svg.attr('viewBox', `0 0 ${W} ${H}`).selectAll('*').remove();
        const cx = (c) => (c + pad + 0.5) * k, cy = (row) => (row + 0.5) * k;

        const px = (s) => s.attr('x', (d) => cx(d.c) - r).attr('y', (d) => cy(d.r) - r).attr('width', 2 * r).attr('height', 2 * r);
        svg.append('g').selectAll('rect').data(cells.filter((d) => !d.code)).join('rect').attr('class', 'land').call(px);

        // A click (or Enter / Space) bubbles to app.js, which selects the country and brings the console into view.
        const g = svg.append('g').selectAll('g').data(ranking).join('g')
          .attr('class', 'country').attr('data-code', (d) => d.code).style('--t', (d) => tint(d.score))
          .attr('data-go-country', (d) => d.code).attr('aria-current', (d) => d.code === sel)
          .attr('tabindex', 0).attr('role', 'button').attr('aria-label', label)
          .on('pointermove', function (e, d) { hover(svgEl, d.code); show(e, d); })
          .on('focus', function (e, d) { hover(svgEl, d.code); show(e, d); })
          .on('pointerleave blur', () => { hover(svgEl, null); ctx.tip.hide(); })
          .on('keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            this.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          });

        g.each(function (d) {
          const gs = d3.select(this), mine = cells.filter((x) => x.code === d.code);
          gs.selectAll('rect.hit').data(mine).join('rect').attr('class', 'hit')
            .attr('x', (x) => (x.c + pad) * k).attr('y', (x) => x.r * k).attr('width', k).attr('height', k);
          gs.append('g').selectAll('rect').data(mine).join('rect').attr('class', 'px').call(px);
          if (!wide) return;

          const [lc, lr, anchor] = LABELS[d.code];
          const lx = (lc + pad) * k, ly = lr * k;
          const text = gs.append('text').attr('class', 'v-map-label').attr('x', lx).attr('y', ly).attr('text-anchor', anchor);
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
