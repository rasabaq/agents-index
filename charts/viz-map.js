// Home page chart "map": the flight path stage. A flat pixel world map on one canvas (one square dot per grid cell,
// tracked countries brighter with a higher score), a camera that flies, and a passport card for one country with a
// seal for one task there. On first view the countries light up in rank order and the camera flies to the start
// country; then a tour flies from stop to stop by itself.
// The tour never changes the page's country. A pick here (map, select, arrows, swipe) sends 'pickcountry' to app.js;
// a selection anywhere else on the page ('countrychange') stops the tour and flies the stage there.
(() => {
  // Land on a Natural Earth grid (139 x 65 cells, Antarctica cropped), rasterized from world-atlas 2.0.2 (110m).
  // '.' = sea, '#' = other land, a letter = a tracked country (see CODE). New letters: re-letter '#' cells only, so the
  // rest of the map stays as it is.
  const GRID = [
    "........................................KKKKKKKK##############.............................................................................",
    "..................................#KKKKKKKKK################........#####.....#............#####...........................................",
    ".............................KKKKKKKKKKKKK..################.........#............###.......#######......###...............................",
    "...........................KKKKKK.KKKKKKKK......###########......................##......###############...................................",
    ".........#.....UUU........KKKKKKK.KKKKKKKKKK....##########..............###......##...#############################........................",
    ".......##...UUUUUUUUKKKKKKKKKKKKKKKKKKKKKKKK....##########............########.#.##########################################................",
    "......####UUUUUUUUUKKKKKKKKKKKKKKKKKKKK.KKKKK..#######...####........#######################################################...............",
    ".......#U.UUUUUUUUKKKKKKKKKKKKKKKKKKKK.KKKKK....####.....####......##########################################################..............",
    ".........UUUUUUUUUKKKKKKKKKKKKKKKK...KKKKKK.....###...............#####.#####################################################..............",
    "........UUUUUUUUUUKKKKKKKKKKKKKKK.....KKKKKK.....##...............####################################################..##.................",
    ".........UUU......UKKKKKKKKKKKKKKK....KKKKKK...................GG...###.##########################################.....###.................",
    ".......UU.........UKKKKKKKKKKKKKKKKKKKKKKKKKK.................GGG...D#############################################.....####................",
    ".................KKKKKKKKKKKKKKKKKKKKKKKKKKKK................##GGGHDDD###############################################...###................",
    "..................KKKKKKKKKKKKKKKKKKKKKKKKKKK..................GGF#DDD################################################...#.................",
    "..................K#UUUUUUUUUUUKKKKKKKKKKKKKKK.................FFFFFDD################################################.....................",
    "..................UUUUUUUUUUUUUUUUKKKKKUKKK..K..................FFF#TT#################################################....................",
    "..................UUUUUUUUUUUUUUUUKKUUUUKK....................E.FFFFTT######.######.#################################.JJ...................",
    ".................UUUUUUUUUUUUUUUUUUUUU.......................EEEEE..FTT#####.##.####.###############################..JJ...................",
    ".................UUUUUUUUUUUUUUUUUUUU........................#EEEE..T.TT############.##############################...JJ...................",
    ".................UUUUUUUUUUUUUUUUUUU.........................#EEE.....TT.############.############################QQ..JJ...................",
    ".................UUUUUUUUUUUUUUUUUUU..........................EE######...##.####################################..QQ.JJJ...................",
    ".................UUUUUUUUUUUUUUUUUU..........................#########.........###############II#################.Q.JJJ....................",
    "..................MMUUUUUUUUUUUUU............................###########.###.###W##############I##################..J......................",
    "..................MMMMMUUUUUUUUUU............................##################WWW############III#################.........................",
    "...................MMMMMMUU....UU..........................####################WWWWWW########IIIII####II##########.........................",
    "...................M.MMMMM......U#.........................####################WWWWWW#.V#####IIIIIIIIII############........................",
    "....................MMMMMM.....###........................#####################WWWWWWWV##...#IIIIIIII#I############........................",
    "UU....................MMMM..MM#.##........................######################.WWWWWW###...IIIIIIII##########............................",
    ".U....................MMMM.MMM...####.....................######################WWWWWW###.....IIIIIII..########............................",
    ".......................MMMMM#....#.#.#....................#######################.WW####.......IIIII...######.....##.......................",
    ".........................MM####..........................##############################........IIII.....######....#........................",
    "...........................####...........................#########N#N###############...........II.......#####....##.......................",
    ".............................##..OO#####..................########NNNNN###############..........II.......######...###......................",
    "..............................###OO#####...................#######NNNN################..........II#......##.##....####.....................",
    "...............................#OOO######..................#######NNNN################............#.......##.....#.###.....................",
    "................................OOOOO#######.................####..NN#################..................YY##....###........................",
    "................................OOOOO#BB###B.........................##########XXX###....................Y###..##Y.........................",
    "...............................##OOOBBBBBBBB.........................##########XXX##......................YS#.YYYYYYY.Y....................",
    "...............................###OOBBBBBBBBBBB.....................###########XXX#.......................YYY.YYYYYY...YY.Y................",
    "...............................#####BBBBBBBBBBBBB....................###########XX.........................YY..YYYYY.YYYYYYY##.##..........",
    "...............................####BBBBBBBBBBBBBBBB...................############..........................YY....Y.#.....Y#######.........",
    "...............................###BBBBBBBBBBBBBBBBB...................############...........................YYYY.......Y.Y####...##.......",
    "................................###BBBBBBBBBBBBBBBB...................############...............................YY.Y#.....##.##...#.......",
    "................................######BBBBBBBBBBBB....................############.....................................AAA.AA..............",
    ".................................#######BBBBBBBBB.....................############..##...............................AAAAA.AA..............",
    "..................................######BBBBBBBBB.....................############.###..............................AAAAAA.AA........#.....",
    "...................................######BBBBBBBB.....................###########..###.............................AAAAAAAAAA............##",
    "....................................C####BBBBBBBB.....................##########...##............................AAAAAAAAAAAAA......#......",
    "....................................C#####BBBBBBB.....................##########..###..........................AAAAAAAAAAAAAAAA.....#......",
    "....................................CCRR###BBBB........................#####Z###..###..........................AAAAAAAAAAAAAAAA............",
    "....................................CRRRR##BBB.........................###ZZZ##...............................AAAAAAAAAAAAAAAAA............",
    "....................................CRRRRRRBBB.........................##ZZZZZ................................AAAAAAAAAAAAAAAAA............",
    "....................................CRRRRRBBB..........................ZZZZZZZ.................................AAAAAAAAAAAAAAAA............",
    "....................................CRRRRR##B...........................ZZZZZ.................................AAAAAAAAAAAAAAAA.............",
    "....................................CRRRRR##............................ZZZZ..................................AAAA....AAAAAAA..............",
    "....................................CRRRRRR............................................................................AAAAA.........#.....",
    "....................................CRRRRRR............................................................................AAAA.........###....",
    "....................................CRRRR...............................................................................AA........###......",
    "....................................CCRRR...............................................................................AA.......###.......",
    ".....................................CRRR......................................................................................###.........",
    ".....................................CRRR......................................................................................##..........",
    ".....................................CRRR.................................................#................................................",
    ".....................................CCR...#...............................................................................................",
    "......................................CCC..................................................................................................",
    ".......................................CCR.................................................................................................",

  ];
  // A letter for a country not in data/meta.json draws as plain land, so the grid can name a country before it is tracked.
  const CODE = {
    U: 'US', G: 'GB', D: 'DE', I: 'IN', B: 'BR', M: 'MX', C: 'CL', O: 'CO', K: 'CA', F: 'FR', E: 'ES', J: 'JP', A: 'AU', N: 'NG',
    Q: 'KR', S: 'SG', Y: 'ID', R: 'AR', Z: 'ZA', T: 'IT', H: 'NL', V: 'AE', W: 'SA', X: 'KE',
  };

  // The four status levels as marks, the shapes the site uses: Live a filled disc with a check, Limited half filled,
  // Announced a ring, Not yet a dash in a faint disc.
  const MARK = {
    live: '<svg class="fly-mk" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="8" fill="currentColor"/><path d="M5.2 9.3l2.5 2.5 5-5.2" fill="none" stroke="var(--page)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    limited: '<svg class="fly-mk" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.25" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M9 1.75a7.25 7.25 0 0 0 0 14.5z" fill="currentColor"/></svg>',
    announced: '<svg class="fly-mk" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.25" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    none: '<svg class="fly-mk" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="8" fill="var(--line-strong)" opacity=".55"/><rect x="5" y="8.1" width="8" height="1.8" rx=".9" fill="var(--ink-2)"/></svg>',
  };
  const LEVELS = ['live', 'limited', 'announced', 'none'];
  const STOPS = 10; // tour stops; each one seals the next status level in LEVELS, so a loop shows all four
  const HOLD = 3400; // ms the tour rests on a stop
  const PAUSE = 8000; // ms a hover, an area click or the world view holds the tour
  const FLAGS = 16; // flags under the stage before "+N more"
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
  const bez = (a, c, b, t) => [0, 1].map((i) => (1 - t) ** 2 * a[i] + 2 * (1 - t) * t * c[i] + t * t * b[i]);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rgba = (hex, a) => { const n = parseInt(hex.replace('#', ''), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

  // Every height in the stage is fixed (no wrapping text, fixed rows), so the drawn height is known: charts.css
  // reserves it for the empty slot ("The map opens the data"). Change both together.
  const CSS = `
    #v-map .fly { --fly-card: 380px; }
    #v-map .fly :is(button, select, canvas):focus-visible { outline: 1.5px solid var(--sunrise); outline-offset: 2px; }
    #v-map .fly-stage { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
    #v-map .fly-mapcol { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    #v-map .fly-mapbox { position: relative; aspect-ratio: 1.8; overflow: hidden; border: 1px solid var(--line); border-radius: 10px;
      background: radial-gradient(70% 70% at 30% 60%, color-mix(in srgb, var(--magenta) 10%, transparent), transparent 70%), var(--page); }
    #v-map .fly-map { position: absolute; inset: 0; display: block; width: 100%; height: 100%; touch-action: pan-y; }
    #v-map .fly-world { position: absolute; top: 10px; right: 10px; height: 36px; padding: 0 14px; border: 1px solid var(--line-strong); border-radius: 9px;
      background: color-mix(in srgb, var(--surface) 88%, transparent); color: var(--ink); font: 500 13px/1 var(--font); white-space: nowrap; cursor: pointer; }
    #v-map .fly-world:hover { border-color: var(--ink-2); }
    #v-map .fly-world[aria-pressed="true"] { border-color: var(--sunrise); color: var(--sunrise); }
    /* one row; on a narrow map it scrolls sideways (ctx.edgeFade) instead of wrapping, so its height never changes */
    #v-map .fly-legend { display: flex; gap: 16px; height: 20px; margin: 0; overflow-x: auto; scrollbar-width: none; font: 400 11px/20px var(--mono); color: var(--ink-2); white-space: nowrap; }
    #v-map .fly-legend::-webkit-scrollbar { display: none; }
    #v-map .fly-legend > span { display: inline-flex; flex: none; align-items: center; gap: 6px; }
    #v-map .fly-ramp { width: 56px; height: 8px; background: linear-gradient(90deg, var(--page) 1px, transparent 1px) 0 0 / 4px 4px, linear-gradient(var(--page) 1px, transparent 1px) 0 0 / 4px 4px, linear-gradient(90deg in oklab, var(--surface-2), var(--s-live)); }
    #v-map .fly-sw { width: 8px; height: 8px; }
    #v-map .fly-sw-live { background: var(--magenta); }
    #v-map .fly-sw-card { background: var(--sunrise); }
    #v-map .fly-mk { display: block; flex: none; width: 14px; height: 14px; color: var(--ink); }

    #v-map .fly-deck { display: flex; flex-direction: column; gap: 12px; min-width: 0; perspective: 1400px; }
    #v-map .fly-ctrl { display: flex; gap: 8px; align-items: center; height: 44px; }
    #v-map .fly-btn { flex: none; width: 44px; height: 44px; padding: 0; border: 1px solid var(--line-strong); border-radius: 10px; background: var(--surface); color: var(--ink); font: 500 18px/1 var(--font); cursor: pointer; }
    #v-map .fly-btn:hover, #v-map .fly-csel select:hover { border-color: var(--ink-2); }
    #v-map .fly-csel { display: flex; flex: 1; min-width: 0; align-items: center; gap: 10px; }
    #v-map .fly-csel span { font: 500 10px/1 var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }
    #v-map .fly-csel select { flex: 1; min-width: 0; height: 44px; padding: 0 30px 0 12px; border: 1px solid var(--line-strong); border-radius: 10px; appearance: none; -webkit-appearance: none; cursor: pointer;
      background: var(--surface) no-repeat; background-image: linear-gradient(45deg, transparent 50%, var(--ink-2) 50%), linear-gradient(135deg, var(--ink-2) 50%, transparent 50%);
      background-position: calc(100% - 17px) 52%, calc(100% - 12px) 52%; background-size: 5px 5px; color: var(--ink); font-size: 14px; }
    #v-map .fly-csel :is(option, optgroup) { background: var(--surface); color: var(--ink); }

    /* the passport */
    #v-map .fly-flip { position: relative; }
    #v-map .fly-card { --rx: 0deg; --ry: 0deg; --mx: .5; --my: .3; position: relative; overflow: hidden; border: 1px solid color-mix(in srgb, var(--sunrise) 45%, var(--line-strong)); border-radius: 18px;
      background: radial-gradient(var(--line) 1px, transparent 1.2px) 0 0 / 10px 10px, var(--surface); box-shadow: 0 30px 60px -20px rgba(0, 0, 0, .85);
      transform: perspective(1200px) rotateX(var(--rx)) rotateY(var(--ry)); touch-action: pan-y; user-select: none; -webkit-user-select: none; }
    #v-map .fly-card::after { content: ""; position: absolute; inset: 0; z-index: 2; pointer-events: none; mix-blend-mode: screen;
      background: linear-gradient(115deg, transparent 30%, color-mix(in srgb, var(--magenta) 10%, transparent) 46%, color-mix(in srgb, var(--sunrise) 12%, transparent) 51%, transparent 58%) calc(var(--mx) * 100%) calc(var(--my) * 100%) / 260% 260%; }
    #v-map .fly-c-top { display: flex; justify-content: space-between; gap: 8px; height: 30px; padding: 0 16px; background: var(--magenta); color: var(--page); font: 500 10.5px/30px var(--mono); letter-spacing: .14em; text-transform: uppercase; white-space: nowrap; }
    #v-map .fly-c-body { display: grid; gap: 12px; padding: 14px; }
    #v-map .fly-k { margin: 0; font: 500 10px/14px var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #v-map .fly-c-id { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 12px; align-items: center; height: 44px; }
    #v-map .fly-c-id .flag { width: auto; margin: 0; font-size: 36px; line-height: 1; }
    #v-map .fly-c-name { margin: 0; overflow: hidden; font: 600 22px/28px var(--font); letter-spacing: -.02em; text-overflow: ellipsis; white-space: nowrap; }
    #v-map .fly-c-tier { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 10px; background: var(--t); color: var(--page); font: 36px/1 var(--pixel); }
    #v-map .fly-c-stats { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 18px; align-items: center; height: 84px; border-block: 1px dashed var(--line-strong); }
    #v-map .fly-c-score { display: flex; align-items: baseline; gap: 4px; margin: 0; }
    #v-map .fly-c-score b { color: var(--sunrise); font: 400 76px/.78 var(--pixel); }
    #v-map .fly-c-score span { color: var(--muted); font: 13px var(--mono); }
    #v-map .fly-c-stats dl { display: grid; gap: 4px; margin: 0; }
    #v-map .fly-c-stats dl div { display: flex; justify-content: space-between; gap: 8px; padding-bottom: 3px; border-bottom: 1px solid var(--line); }
    #v-map .fly-c-stats dt { font: 500 10px/16px var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
    #v-map .fly-c-stats dd { margin: 0; color: var(--ink); font: 500 13px/16px var(--mono); font-variant-numeric: tabular-nums; white-space: nowrap; }

    /* the twelve areas, lit by score; the pressed one is the focus area */
    #v-map .fly-areas { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
    #v-map .fly-area { display: grid; justify-items: center; gap: 3px; height: 62px; padding: 7px 2px 0; border: 1.5px dashed var(--line-strong); border-radius: 9px; background: none; color: var(--ink-2); cursor: pointer; }
    #v-map .fly-area:hover { border-color: var(--ink-2); }
    #v-map .fly-area[aria-pressed="true"] { border-style: solid; border-color: color-mix(in srgb, var(--sunrise) 70%, var(--line-strong)); box-shadow: 0 0 0 3px color-mix(in srgb, var(--sunrise) 10%, transparent); color: var(--sunrise); }
    #v-map .fly-area span { max-width: 100%; overflow: hidden; font: 10px/12px var(--font); letter-spacing: -.02em; text-overflow: ellipsis; white-space: nowrap; }
    #v-map .fly-area b { color: var(--ink); font: 500 10.5px/12px var(--mono); font-variant-numeric: tabular-nums; }
    #v-map .fly-ic { display: block; width: 24px; height: 24px; }
    #v-map .fly-ic rect { fill: var(--pix-off); }
    #v-map .fly-ic rect.on { fill: var(--ink); }

    /* the task checked, with the seal pressed beside it */
    #v-map .fly-entry { display: grid; grid-template-columns: minmax(0, 1fr) 96px; gap: 12px; align-items: start; }
    #v-map .fly-entry-t { display: grid; gap: 6px; min-width: 0; }
    #v-map .fly-tasks { display: flex; flex-direction: column; gap: 4px; height: 92px; overflow-y: auto; scrollbar-width: none; } /* 3 rows (the most an area has today); a 4th scrolls */
    #v-map .fly-task { display: flex; flex: none; align-items: center; gap: 8px; height: 28px; padding: 0 8px; border: 1px solid var(--line); border-radius: 8px; background: var(--page); color: var(--ink-2); font: 12.5px/1 var(--font); text-align: left; cursor: pointer; }
    #v-map .fly-task span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #v-map .fly-task:hover { border-color: var(--line-strong); color: var(--ink); }
    #v-map .fly-task[aria-pressed="true"] { border-color: var(--sunrise); color: var(--sunrise); }
    #v-map .fly-task .fly-mk { width: 13px; height: 13px; }
    #v-map .fly-sealbox { display: grid; justify-items: center; gap: 6px; padding-top: 6px; }
    #v-map .fly-seal-wrap { position: relative; width: 84px; height: 84px; }
    #v-map .fly-seal-set { position: absolute; inset: 0; }
    #v-map .fly-seal { position: absolute; inset: 0; display: grid; place-items: center; border: 4px double currentColor; border-radius: 50%; color: color-mix(in srgb, var(--sunrise) 80%, var(--ink-2)); transform: rotate(var(--rot));
      background: radial-gradient(circle, color-mix(in srgb, var(--page) 55%, transparent) 0 52%, transparent 53%), color-mix(in srgb, var(--surface-2) 70%, transparent);
      box-shadow: inset 0 0 0 5px color-mix(in srgb, var(--surface) 80%, transparent), inset 0 0 0 6px color-mix(in srgb, currentColor 35%, transparent), 0 6px 18px rgba(0, 0, 0, .4); }
    #v-map .fly-seal .fly-ic { width: 36px; height: 36px; }
    #v-map .fly-seal .fly-ic rect.on { fill: currentColor; }
    #v-map .fly-badge { position: absolute; right: -4px; bottom: -2px; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--surface); box-shadow: 0 0 0 1px var(--line-strong), 0 4px 10px rgba(0, 0, 0, .4); }
    #v-map .fly-badge .fly-mk { width: 18px; height: 18px; }
    #v-map .fly-badge .low { position: absolute; left: calc(100% + 3px); top: 50%; margin: 0; transform: translateY(-50%); }
    #v-map .fly-seal-id { font: 500 9px/1 var(--mono); letter-spacing: .12em; color: var(--muted); white-space: nowrap; }
    #v-map .fly-mrz { margin: 0; overflow: hidden; padding-top: 9px; border-top: 1px solid var(--line); font: 10.5px/15px var(--mono); letter-spacing: .08em; color: var(--muted); white-space: nowrap; }

    /* under the stage: where the selected task is live, one row of flags */
    #v-map .fly-below { display: grid; gap: 8px; margin-top: 16px; }
    #v-map .fly-wh { margin: 0; overflow: hidden; font: 500 11px/16px var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--muted); text-overflow: ellipsis; white-space: nowrap; }
    #v-map .fly-flags { display: flex; gap: 6px; height: 28px; margin: 0; padding: 0; overflow-x: auto; scrollbar-width: none; list-style: none; }
    #v-map .fly-flags::-webkit-scrollbar { display: none; }
    #v-map .fly-flags li { display: inline-flex; flex: none; align-items: center; gap: 2px; height: 28px; padding: 0 10px 0 6px; border: 1px solid var(--line); border-radius: 99px; background: var(--page); color: var(--ink-2); font: 11.5px/1 var(--mono); }
    #v-map .fly-flags li.on { border-color: var(--sunrise); color: var(--sunrise); }
    #v-map .fly-flags li.more, #v-map .fly-flags li.none { padding-left: 10px; color: var(--muted); }

    @media (min-width: 1000px) {
      /* the map beside the card: the card column sets the height, the map fills the rest */
      #v-map .fly-stage { grid-template-columns: minmax(0, 1fr) var(--fly-card); gap: 24px; }
      #v-map .fly-mapbox { flex: 1; aspect-ratio: auto; }
    }
    @media (max-width: 999px) {
      /* a long task name takes a second line here; the box keeps two lines either way, text at the bottom */
      #v-map .fly-wh { display: flex; align-items: flex-end; height: 32px; white-space: normal; }
    }
    @media (max-width: 520px) {
      #v-map .fly-mapbox { aspect-ratio: 1.25; }
      #v-map .fly-world { top: 8px; right: 8px; height: 44px; }
      #v-map .fly-c-body { padding: 12px; }
      #v-map .fly-tasks { height: 140px; }
      #v-map .fly-task { height: 44px; padding-block: 0; font-size: 12.5px; }
      #v-map .fly-task span { white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.25; }
      #v-map .fly-flags li { height: 28px; }
    }
    @media (prefers-reduced-motion: reduce) { #v-map .fly-card { transform: none; } }
  `;

  (window.CHARTS ??= []).push({
    id: 'map',
    title: 'World map',
    blurb: 'Where agents can act today. A brighter dot means a higher overall score out of 100. Watch the tour, or pick a country to fly there.',
    render(el, ctx) {
      if (!document.getElementById('v-map-style')) {
        document.head.insertAdjacentHTML('beforeend', `<style id="v-map-style">${CSS}</style>`);
      }
      const { esc, flag, ranking, byCode, meta, catIndex, STATUSES, tierOf, ICONS, BAYER } = ctx;
      const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const N = ranking.length, NCAP = ctx.capabilities.length;
      const COL = Object.fromEntries(['ink', 'line-strong', 'page', 'magenta', 'sunrise', 'font'].map((n) => [n, ctx.css(`--${n}`)]));
      const caps = Object.fromEntries(ctx.capabilities.map((c) => [c.id, c]));
      const capsOf = (area) => ctx.capabilities.filter((c) => c.category === area);
      const cellOf = (capId, code) => caps[capId].countries[code] ?? { status: 'none' };
      const statusOf = (cell) => `${STATUSES[cell.status].label}${cell.confidence === 'low' ? ', unsure' : ''}`;

      // The grid as points: plain land, and the dots of each tracked country with its centre and size in cells.
      const COLS = GRID[0].length, ROWS = GRID.length;
      const land = [], lit = [], pts = {};
      GRID.forEach((row, r) => [...row].forEach((ch, c) => {
        if (ch === '.') return;
        const code = byCode[CODE[ch]] ? CODE[ch] : null;
        if (code) { lit.push({ x: c + 0.5, y: r + 0.5, code }); (pts[code] ??= []).push([c + 0.5, r + 0.5]); }
        else land.push([c + 0.5, r + 0.5]);
      }));
      const med = (a) => [...a].sort((p, q) => p - q)[a.length >> 1];
      const centre = {}, box = {};
      for (const [code, p] of Object.entries(pts)) {
        const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
        centre[code] = [med(xs), med(ys)];
        box[code] = [Math.max(...xs) - Math.min(...xs) + 1, Math.max(...ys) - Math.min(...ys) + 1];
      }
      // A tracked country the grid has no letter for yet sits mid-map, so it can still be picked and flown to.
      const at = (code) => centre[code] ?? [COLS / 2, ROWS / 2];

      // The tour: the start country, then a stride through the ranking so the hops cross the map. Stop i seals a
      // task with status LEVELS[i % 4] there (the next level when it has none), from a different area each time.
      const codes = ranking.map((r) => r.code), s0 = Math.max(0, codes.indexOf(ctx.start));
      const pickCap = (code, i) => {
        const list = meta.categories.map((_, j) => meta.categories[(j + i * 5) % meta.categories.length].id).flatMap(capsOf);
        for (let k = 0; k < LEVELS.length; k++) {
          const cap = list.find((c) => cellOf(c.id, code).status === LEVELS[(i + k) % LEVELS.length]);
          if (cap) return cap.id;
        }
        return list[0].id;
      };
      const tour = [...new Set(codes.map((_, i) => codes[(s0 + i * 7) % N]))].slice(0, STOPS).map((code, i) => [code, pickCap(code, i)]);

      const st = {
        code: tour[0][0], cap: tour[0][1], dest: tour[0][0], world: false, live: new Set(), hov: null,
        cam: null, anim: null, trail: null, pulse: -1e9, t0: -1e9, fid: 0, raf: 0, view: null,
        visible: false, intro: false, touring: !RM, pauseUntil: 0,
      };
      const area = () => caps[st.cap].category;
      const hold = () => { st.pauseUntil = performance.now() + PAUSE; };

      const regions = [...new Set(ranking.map((r) => r.region))].sort();
      const menu = regions.map((g) => `<optgroup label="${esc(g)}">${ranking.filter((r) => r.region === g).sort((a, b) => a.name.localeCompare(b.name))
        .map((r) => `<option value="${r.code}">${esc(r.name)}</option>`).join('')}</optgroup>`).join('');

      el.innerHTML = `<div class="fly">
        <div class="fly-stage">
          <div class="fly-mapcol">
            <div class="fly-mapbox">
              <canvas class="fly-map" tabindex="0" role="img" aria-label="${esc(`World map of the ${N} tracked countries, brighter where agents can do more. Click a lit country to fly there, or use the left and right arrow keys.`)}"></canvas>
              <button type="button" class="fly-world" aria-pressed="false">World view</button>
            </div>
            <p class="fly-legend">
              <span>Score 0<i class="fly-ramp" aria-hidden="true"></i>100</span>
              <span><i class="fly-sw fly-sw-live" aria-hidden="true"></i>Live there for this task</span>
              <span><i class="fly-sw fly-sw-card" aria-hidden="true"></i>On the card</span>
              ${LEVELS.map((s) => `<span>${MARK[s]}${s === 'none' ? 'Not live' : STATUSES[s].label}</span>`).join('')}
            </p>
          </div>
          <div class="fly-deck">
            <div class="fly-ctrl">
              <button type="button" class="fly-btn" data-step="-1" aria-label="Previous country by rank">←</button>
              <label class="fly-csel"><span>Country</span><select>${menu}</select></label>
              <button type="button" class="fly-btn" data-step="1" aria-label="Next country by rank">→</button>
            </div>
            <div class="fly-flip"></div>
          </div>
        </div>
        <div class="fly-below"><p class="fly-wh" aria-live="polite"></p><ul class="fly-flags"></ul></div>
      </div>`;
      const $ = (s) => el.querySelector(s);
      const stage = $('.fly-stage'), cv = $('.fly-map'), g = cv.getContext('2d'), worldBtn = $('.fly-world'), sel = $('select'), flip = $('.fly-flip');
      ctx.edgeFade($('.fly-legend'));
      ctx.edgeFade($('.fly-flags'));

      /* ---------- the passport ---------- */
      // An area icon as SVG: a cell is lit when its Bayer threshold is under share * 16, as the hero lights its icons.
      const icon = (id, share) => {
        const on = Math.round(share * 16);
        return `<svg class="fly-ic" viewBox="0 0 12 12" aria-hidden="true">${(ICONS[id] ?? []).flatMap((row, y) => [...row].map((ch, x) => (ch === '#'
          ? `<rect x="${x + 0.08}" y="${y + 0.08}" width=".84" height=".84"${BAYER[(y & 3) * 4 + (x & 3)] < on ? ' class="on"' : ''}/>` : ''))).join('')}</svg>`;
      };
      const mrz = (r) => {
        const pad = (s) => (s + '<'.repeat(40)).slice(0, 40);
        return `${esc(pad(`P<${r.code}<AGENT<INDEX<<${r.name.toUpperCase().replace(/[^A-Z]+/g, '<')}`))}<br>${esc(pad(`${String(r.score).padStart(3, '0')}<${r.rank}<${N}<${tierOf(r.score)}<<${meta.asOf.replace(/-/g, '')}`))}`;
      };
      function renderCard() {
        const r = byCode[st.code], t = tierOf(r.score);
        flip.innerHTML = `<article class="fly-card" aria-label="${esc(`${r.name}: score ${r.score} of 100, rank ${r.rank} of ${N}, ${r.counts.live} of ${NCAP} tasks live`)}">
          <div class="fly-c-top"><span>Agent Index · Passport</span><span>${esc(r.region)}</span></div>
          <div class="fly-c-body">
            <div class="fly-c-id">${flag(r.code)}<div><p class="fly-k">Country</p><p class="fly-c-name">${esc(r.name)}</p></div>
              <span class="fly-c-tier" style="--t:var(--tier-${t.toLowerCase()})" title="Tier ${t}" aria-label="Tier ${t}">${t}</span></div>
            <div class="fly-c-stats"><p class="fly-c-score"><b>${r.score}</b><span>/100</span></p>
              <dl><div><dt>Rank</dt><dd>${r.rank} of ${N}</dd></div><div><dt>Tasks live</dt><dd>${r.counts.live} of ${NCAP}</dd></div><div><dt>Agent helps</dt><dd>${r.counts.limited}</dd></div></dl></div>
            <div class="fly-areas" role="group" aria-label="Areas. Pick one to see its tasks">${meta.categories.map((c) => `<button type="button" class="fly-area" data-area="${c.id}" aria-pressed="false" aria-label="${esc(`${c.short}: ${r.byCategory[c.id]} of 100`)}" title="${esc(c.name)}">${icon(c.id, r.byCategory[c.id] / 100)}<span>${esc(c.short)}</span><b>${r.byCategory[c.id]}</b></button>`).join('')}</div>
            <div class="fly-entry">
              <div class="fly-entry-t"><p class="fly-k">Task checked · <span data-area-name></span></p><div class="fly-tasks" role="group" aria-label="Tasks in this area"></div></div>
              <div class="fly-sealbox"><div class="fly-seal-wrap"></div><span class="fly-seal-id">${r.code} · ${esc(meta.asOf)}</span></div>
            </div>
            <p class="fly-mrz" aria-hidden="true">${mrz(r)}</p>
          </div></article>`;
        sel.value = st.code;
        if (st.world) worldBtn.textContent = `Back to ${r.name}`;
        renderTask(false);
      }
      // The focus area's tasks, the selected one pressed; then the seal, the map highlight and the strip below.
      function renderTask(animate) {
        flip.querySelectorAll('.fly-area').forEach((b) => b.setAttribute('aria-pressed', b.dataset.area === area()));
        flip.querySelector('[data-area-name]').textContent = catIndex[area()].short;
        flip.querySelector('.fly-tasks').innerHTML = capsOf(area()).map((c) => {
          const cell = cellOf(c.id, st.code);
          return `<button type="button" class="fly-task" data-task="${c.id}" aria-pressed="${c.id === st.cap}" aria-label="${esc(`${c.name}: ${statusOf(cell)}`)}" title="${esc(c.name)}">${MARK[cell.status]}<span>${esc(c.name)}</span></button>`;
        }).join('');
        seal(animate);
        renderLive();
      }
      // The seal: a double ring, the task's area icon, and one status badge. Pressed in, no shake.
      function seal(animate) {
        const r = byCode[st.code], cap = caps[st.cap], cell = cellOf(st.cap, st.code), wrap = flip.querySelector('.fly-seal-wrap');
        const old = wrap.firstElementChild, set = document.createElement('div');
        set.className = 'fly-seal-set';
        set.setAttribute('role', 'img');
        set.setAttribute('aria-label', `${cap.name} in ${r.name}: ${statusOf(cell)}`);
        const rot = -12 + ((codes.indexOf(st.code) * 3 + cap.id.length * 5) % 9);
        set.innerHTML = `<div class="fly-seal" style="--rot:${rot}deg">${icon(cap.category, 1)}</div><span class="fly-badge">${MARK[cell.status]}${cell.confidence === 'low' ? '<span class="low" aria-hidden="true"></span>' : ''}</span>`;
        wrap.append(set);
        if (!animate || RM) return old?.remove();
        old?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }).finished.then(() => old.remove());
        set.animate([{ transform: 'scale(1.08)', opacity: 0, filter: 'blur(1.5px)' }, { transform: 'scale(1)', opacity: 1, filter: 'blur(0)' }], { duration: 300, easing: 'cubic-bezier(.2,.7,.2,1)' });
      }
      function renderLive() {
        const live = ranking.filter((r) => cellOf(st.cap, r.code).status === 'live');
        st.live = new Set(live.map((r) => r.code));
        $('.fly-wh').textContent = `${caps[st.cap].name}: live in ${live.length} of ${N}`;
        $('.fly-flags').innerHTML = live.length
          ? live.slice(0, FLAGS).map((r) => `<li class="${r.code === st.code ? 'on' : ''}" title="${esc(r.name)}">${flag(r.code)}${r.code}</li>`).join('')
            + (live.length > FLAGS ? `<li class="more">+${live.length - FLAGS} more</li>` : '')
          : `<li class="none">Not live yet in any of the ${N} countries</li>`;
        $('.fly-flags').dispatchEvent(new Event('scroll')); // re-check the edge fade
        kick();
      }

      /* ---------- the map and its camera ---------- */
      let W = 0, H = 0, dpr = 1;
      const k0 = () => Math.min(W / COLS, H / ROWS);
      // Zoom so the country fills about half the map; phones crop closer to the region. Cells never pass 11px.
      const viewOf = (code) => {
        const [bw, bh] = box[code] ?? [COLS, ROWS], k = k0(), zmin = W < 600 ? 2 : 1.2;
        return { f: at(code), z: clamp(Math.min((W * 0.45) / (bw * k), (H * 0.45) / (bh * k)), zmin, Math.max(zmin, 11 / k)) };
      };
      const overview = () => ({ f: [COLS / 2, ROWS / 2], z: 1 });
      function camAt(now) {
        const a = st.anim;
        if (!a) return { cam: st.cam, e: 1, k: 1 };
        const k = clamp((now - a.t0) / a.dur, 0, 1), e = ease(k);
        const f = [0, 1].map((i) => a.from.f[i] + (a.to.f[i] - a.from.f[i]) * e);
        // A long flight pulls back mid-way (dip), then zooms in to land.
        const z = Math.max(0.85, (a.from.z + (a.to.z - a.from.z) * e) * (1 - a.dip * Math.sin(Math.PI * e)));
        return { cam: { f, z }, e, k };
      }
      const planeAt = (now) => (st.anim?.arc ? bez(...st.anim.arc, camAt(now).e) : null);
      // Move the camera; with an arc, a plane draws a dotted path from a to b. Resolves with its id on landing, or
      // at once when a newer move replaces it (the caller sees a stale id and does nothing).
      function fly(to, arc, dur) {
        const now = performance.now(), from = camAt(now).cam ?? to, id = ++st.fid, prev = st.anim;
        st.anim = null;
        st.dest = st.code;
        prev?.done(prev.id);
        if (RM || !W || !st.visible) { st.cam = to; kick(); return Promise.resolve(id); }
        const dist = arc ? Math.hypot(arc[2][0] - arc[0][0], arc[2][1] - arc[0][1]) : 0;
        return new Promise((done) => {
          st.anim = { from, to, arc, t0: now, dur, dip: arc ? clamp(dist / 120, 0.12, 0.5) : 0, id, done };
          kick();
        });
      }
      function draw(now) {
        if (!W || !st.cam) return;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, W, H);
        const { cam, k: prog, e } = camAt(now);
        if (st.anim && prog >= 1) {
          const a = st.anim;
          st.anim = null;
          st.cam = a.to;
          if (a.arc) st.trail = { arc: a.arc, t0: now };
          if (a.arc) st.pulse = now;
          a.done(a.id);
        }
        const s = k0() * cam.z, ox = W / 2 - cam.f[0] * s, oy = H / 2 - cam.f[1] * s;
        st.view = { s, ox, oy };
        const r = Math.max(0.7, s * 0.32), X = (x) => ox + x * s, Y = (y) => oy + y * s;
        const inView = (x, y) => x > -s && x < W + s && y > -s && y < H + s;
        g.fillStyle = COL['line-strong'];
        g.globalAlpha = 0.75;
        for (const [x, y] of land) { const px = X(x), py = Y(y); if (inView(px, py)) g.fillRect(px - r, py - r, r * 2, r * 2); }
        // Tracked countries light up in rank order on first view.
        const intro = RM ? 1 : clamp((now - st.t0) / 2200, 0, 1);
        const appear = (code) => clamp((intro - ((byCode[code].rank - 1) / N) * 0.6) / 0.4, 0, 1);
        g.globalCompositeOperation = 'lighter';
        for (const p of lit) {
          const on = p.code === st.code;
          if (!on && !st.live.has(p.code)) continue;
          const px = X(p.x), py = Y(p.y);
          if (!inView(px, py)) continue;
          const d = s * (on ? 3.4 : 2.6);
          g.globalAlpha = (on ? 0.5 : 0.22) * appear(p.code);
          g.drawImage(glow(on ? COL.sunrise : COL.magenta), px - d / 2, py - d / 2, d, d);
        }
        g.globalCompositeOperation = 'source-over';
        // Three meanings only: sunrise = on the card, magenta = live there for this task, white brightness = score.
        for (const p of lit) {
          const px = X(p.x), py = Y(p.y);
          if (!inView(px, py)) continue;
          const on = p.code === st.code, hov = p.code === st.hov, works = st.live.has(p.code);
          g.globalAlpha = on || hov ? 1 : (0.25 + 0.75 * appear(p.code)) * (works ? 0.9 : 0.2 + (0.7 * byCode[p.code].score) / 100);
          g.fillStyle = on ? COL.sunrise : hov || !works ? COL.ink : COL.magenta;
          g.fillRect(px - r, py - r, r * 2, r * 2);
        }
        g.globalAlpha = 1;
        // The flight: a dotted path behind the plane, left to fade after landing.
        const dots = (arc, upto, alpha) => {
          const n = Math.max(8, Math.round((Math.hypot(arc[2][0] - arc[0][0], arc[2][1] - arc[0][1]) * 1.25) / 1.4)), d = clamp(s * 0.2, 1.2, 3);
          g.fillStyle = COL.sunrise;
          for (let i = 0; i <= n * upto; i++) {
            const [x, y] = bez(...arc, i / n);
            g.globalAlpha = alpha * (0.35 + (0.65 * i) / n);
            g.fillRect(X(x) - d, Y(y) - d, d * 2, d * 2);
          }
          g.globalAlpha = 1;
        };
        if (st.anim?.arc) {
          dots(st.anim.arc, e, 1);
          const [x, y] = bez(...st.anim.arc, e), px = X(x), py = Y(y);
          g.globalCompositeOperation = 'lighter';
          g.drawImage(glow(COL.sunrise), px - 17, py - 17, 34, 34);
          g.globalCompositeOperation = 'source-over';
          const [nx, ny] = bez(...st.anim.arc, Math.min(1, e + 0.02));
          plane(px, py, Math.atan2(ny - y, nx - x));
        } else if (st.trail) {
          const fade = 1 - (now - st.trail.t0) / 1600;
          if (fade > 0) dots(st.trail.arc, 1, fade);
          else st.trail = null;
        }
        // The landing pulse and a ring on the country on the card, with its name.
        if (!st.anim) {
          const [px, py] = [X(at(st.code)[0]), Y(at(st.code)[1])], since = now - st.pulse;
          g.lineWidth = 2;
          if (since >= 0 && since < 1100) {
            g.strokeStyle = rgba(COL.sunrise, 0.9 * (1 - since / 1100));
            g.beginPath(); g.arc(px, py, 6 + (since / 1100) * 70, 0, 7); g.stroke();
          }
          g.lineWidth = 1.5;
          g.strokeStyle = rgba(COL.sunrise, 0.45);
          g.beginPath(); g.arc(px, py, 14, 0, 7); g.stroke();
          label(st.code, px, py, COL.sunrise);
        }
        if (st.hov && st.hov !== st.code) label(st.hov, X(at(st.hov)[0]), Y(at(st.hov)[1]), COL.ink);
      }
      const sprites = {};
      const glow = (c) => (sprites[c] ??= (() => {
        const sp = document.createElement('canvas');
        sp.width = sp.height = 64;
        const sg = sp.getContext('2d'), gr = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, rgba(c, 0.9)); gr.addColorStop(0.35, rgba(c, 0.3)); gr.addColorStop(1, rgba(c, 0));
        sg.fillStyle = gr; sg.fillRect(0, 0, 64, 64);
        return sp;
      })());
      // A small pixel plane, nose along the path.
      function plane(px, py, angle) {
        g.save();
        g.translate(Math.round(px), Math.round(py));
        g.rotate(angle);
        g.fillStyle = COL.ink;
        for (const [x, y, w, h] of [[-5, -1, 11, 2], [-1, -6, 3, 12], [-5, -3, 2, 6]]) g.fillRect(x, y, w, h);
        g.restore();
      }
      function label(code, px, py, color) {
        const r = byCode[code], fs = W < 500 ? 12 : 13, t = `${r.name}  ${r.score}`;
        g.font = `600 ${fs}px ${COL.font}`;
        g.textBaseline = 'middle';
        const w = g.measureText(t).width;
        let x = px + 18;
        if (x + w > W - 14) x = px - 18 - w;
        x = Math.max(8, x);
        const y = clamp(py - 16, fs + 4, H - fs - 4);
        // a dark pill behind the name, so it reads on top of lit dots
        g.globalAlpha = 0.88;
        g.fillStyle = COL.page;
        g.beginPath(); g.roundRect(x - 7, y - fs * 0.8, w + 14, fs * 1.6, 6); g.fill();
        g.globalAlpha = 1;
        g.fillStyle = color;
        g.fillText(t, x, y);
      }
      // The tracked country nearest a pointer, within 2.2 cells or 22px (a 44px target), whichever is bigger.
      const hit = (e) => {
        if (!st.view) return null;
        const rc = cv.getBoundingClientRect(), { s, ox, oy } = st.view;
        const wx = (e.clientX - rc.left - ox) / s, wy = (e.clientY - rc.top - oy) / s;
        let best = null, bd = Math.max(2.2, 22 / s);
        for (const p of lit) { const d = Math.hypot(p.x - wx, p.y - wy); if (d < bd) { bd = d; best = p.code; } }
        return best;
      };

      // Draw on demand: one frame per change, and a loop only while something moves and the stage is on screen.
      const moving = (now) => st.anim || st.trail || now - st.pulse < 1100 || now - st.t0 < 2200;
      function frame(now) {
        st.raf = 0;
        draw(now);
        if (moving(now)) kick();
      }
      function kick() { if (!st.raf && st.visible) st.raf = requestAnimationFrame(frame); }

      /* ---------- one way to change the country ---------- */
      // Fly to a country (and a task). The card, the select, the map highlight and the strip change together when
      // the plane lands, never before.
      function go(code, cap) {
        const same = code === st.code && !st.anim;
        if (st.world) setWorld(false, true);
        const swap = () => { st.code = code; if (cap) st.cap = cap; renderCard(); };
        if (same) {
          if (cap) { st.cap = cap; renderTask(true); }
          return fly(viewOf(code), null, 900);
        }
        const instant = RM || !W || !st.visible;
        const a = planeAt(performance.now()) ?? at(st.code), b = at(code), dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
        // arc upward, more for a longer flight
        const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - clamp(dist * 0.32, 4, 26)];
        const flight = fly(viewOf(code), instant ? null : [a, mid, b], 1100 + Math.min(1, dist / 80) * 1000);
        st.dest = code;
        if (instant) { swap(); return flight; }
        return flight.then((id) => {
          if (id !== st.fid) return;
          return flip.animate([{ transform: 'rotateY(0)' }, { transform: 'rotateY(80deg)', opacity: 0.4 }], { duration: 170, easing: 'ease-in' }).finished.then(() => {
            if (id !== st.fid) return;
            swap();
            return flip.animate([{ transform: 'rotateY(-80deg)', opacity: 0.4 }, { transform: 'rotateY(0)', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' }).finished.then(() => seal(true));
          });
        });
      }
      // An explicit pick in the stage: the tour stops for good and the page selects it too (app.js, without scrolling).
      function pick(code) {
        st.touring = false;
        if (code !== st.dest || st.world) go(code);
        document.dispatchEvent(new CustomEvent('pickcountry', { detail: code }));
      }
      const step = (d) => pick(codes[(codes.indexOf(st.dest) + d + N) % N]);
      function setWorld(on, still) {
        st.world = on;
        worldBtn.setAttribute('aria-pressed', on);
        worldBtn.textContent = on ? `Back to ${byCode[st.code].name}` : 'World view';
        if (!still) fly(on ? overview() : viewOf(st.code), null, 1200);
      }

      worldBtn.addEventListener('click', () => { hold(); setWorld(!st.world); });
      sel.addEventListener('change', () => pick(sel.value));
      $('.fly-ctrl').addEventListener('click', (e) => { const b = e.target.closest('[data-step]'); if (b) step(+b.dataset.step); });
      cv.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        step(e.key === 'ArrowRight' ? 1 : -1);
      });
      cv.addEventListener('pointermove', (e) => {
        const h = hit(e);
        if (h === st.hov) return;
        st.hov = h;
        cv.style.cursor = h ? 'pointer' : '';
        kick();
      });
      cv.addEventListener('pointerleave', () => { st.hov = null; kick(); });
      cv.addEventListener('click', (e) => { const h = hit(e); if (h) pick(h); });
      document.addEventListener('countrychange', (e) => {
        st.touring = false;
        if (byCode[e.detail] && e.detail !== st.dest) go(e.detail);
      });

      // The card: an area button makes it the focus area (its first task selected); a task button selects that task.
      flip.addEventListener('click', (e) => {
        const a = e.target.closest('[data-area]'), t = e.target.closest('[data-task]');
        if (a) { hold(); st.cap = capsOf(a.dataset.area)[0].id; renderTask(true); }
        if (t && t.dataset.task !== st.cap) { st.cap = t.dataset.task; renderTask(true); flip.querySelector(`[data-task="${st.cap}"]`).focus(); }
      });
      // Tilt toward the pointer, with a sheen (not for touch or reduced motion); swipe sideways for the next country.
      flip.addEventListener('pointermove', (e) => {
        const card = flip.querySelector('.fly-card');
        if (!card || RM || e.pointerType === 'touch') return;
        const b = card.getBoundingClientRect(), x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
        card.style.setProperty('--ry', `${(x - 0.5) * 10}deg`);
        card.style.setProperty('--rx', `${(0.5 - y) * 7}deg`);
        card.style.setProperty('--mx', x.toFixed(3));
        card.style.setProperty('--my', y.toFixed(3));
      });
      flip.addEventListener('pointerleave', () => ['--rx', '--ry', '--mx', '--my'].forEach((p) => flip.querySelector('.fly-card')?.style.removeProperty(p)));
      let down = null;
      flip.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
      flip.addEventListener('pointerup', (e) => {
        if (!down) return;
        const dx = e.clientX - down[0], dy = e.clientY - down[1];
        down = null;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
      });
      // Hovering or touching the stage holds the tour.
      el.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') hold(); });
      el.addEventListener('pointerdown', hold);

      new ResizeObserver(() => {
        const w = cv.clientWidth, h = cv.clientHeight;
        if (!w || !h) return;
        dpr = Math.min(2, devicePixelRatio || 1);
        W = w; H = h;
        cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
        if (!st.anim) st.cam = st.world ? overview() : viewOf(st.code);
        draw(performance.now());
      }).observe(cv);
      new IntersectionObserver(([en]) => {
        st.visible = en.isIntersecting;
        if (st.visible && !st.intro) {
          st.intro = true;
          if (!RM) intro();
        }
        if (st.visible) kick();
      }, { threshold: 0.2 }).observe(stage);

      // First view: the whole world lights up country by country, the camera flies in to the start country and the
      // seal is pressed. Then the tour plays.
      async function intro() {
        st.t0 = performance.now();
        st.cam = overview();
        kick();
        await sleep(900);
        if (!st.world && !st.anim && st.dest === st.code) fly(viewOf(st.code), null, 1700);
        await sleep(1800);
        seal(true);
        await sleep(HOLD);
        // The tour holds while the stage is off screen, in world view, hovered, or holds keyboard focus.
        const held = () => !st.visible || st.world || performance.now() < st.pauseUntil || stage.querySelector(':focus-visible');
        for (let n = 1; st.touring; n++) {
          while (st.touring && held()) await sleep(300);
          if (!st.touring) return;
          const [code, cap] = tour[n % tour.length];
          await go(code, cap);
          await sleep(HOLD);
        }
      }

      // Resting state (and all there is with reduced motion): the start country, one task sealed, the camera on it.
      renderCard();
    },
  });
})();
