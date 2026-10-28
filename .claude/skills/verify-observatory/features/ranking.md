# Ranking and tiers

The Ranking panel in the console lists the 8 countries by score (0–100) with a tier letter and a bar, and highlights the selected country. Equal scores share a rank and show `=`. A note under it gives the points per status. Further down, the tier list groups the countries into tiers S, A, B, C and D (cut every 10 points) as tiles, and shows "No country yet" for an empty tier.

## Sub-features

- `ranking-order` lists the countries in score order, with rank, flag, code, tier, bar and score.
- `ranking-select` selects a country from a ranking row, without scrolling.
- `ranking-points` shows "Live 1 · Limited 0.5 · Announced 0.25 · Not yet 0" in `[data-points]`.
- `tiers-group` shows each tier's range and tiles, with "No country yet" for an empty tier.
- `tiers-select` selects a country from a tier tile and scrolls to the console.

## How to get to it (user POV)

- Click "Open the ranking" in the hero, use the console tab "1 Ranking", or press `1`.
- Use the "Tiers" link in the site nav, or scroll past the console.

## Driving it with observatory.mjs

Preconditions:

- `node $H doctor` prints `healthy`.

- **Order.** Run `node $H open /`. Then `node $H eval "[...document.querySelectorAll('[data-ranking] button')].map(b => b.innerText.replace(/\\s+/g, ' ').trim())"` lists 8 rows from rank 1 down, with scores that never increase.
- **Hero entry.** Run `node $H click '.hero-btn-1'`. Then `node $H eval "Math.round(document.querySelector('#ranking').getBoundingClientRect().top)"` is small (the panel is in view). Take `node $H shot ranking-1440`.
- **Select from ranking.** Run `node $H click '[data-ranking] [data-go-country="DE"]'`. `#cn-title` reads Germany, the row has `aria-current="true"`, and the hash is `#country=DE`.
- **Points note.** Run `node $H eval "document.querySelector('[data-points]').innerText"`. It prints `Live 1 · Limited 0.5 · Announced 0.25 · Not yet 0`.
- **Tiers.** Run `node $H shot tiers-1440 --at '#tiers'`. Then `node $H click '[data-tiers] [data-go-country="CL"]'`. `#cn-title` reads Chile, and the page has scrolled back to the console.
- **Phone.** Run `node $H open / --width 400`, `node $H shot ranking-400 --at '#ranking' --offset 120` and `node $H shot tiers-400 --at '#tiers'`. Check that `scrollWidth` is 400.
- **Proof.** Finish with `node $H errors` (exit 0).

## Gotchas

- At 1440px the ranking sits beside the matrix. At 400px it comes after the full matrix, so `shot --at '#ranking'` is the way to reach it.
- Scores come from the data. Assert the order and the rank shape, not exact numbers, unless the data is pinned.
- The tier tiles are links (`href="#country=XX"`). A plain click selects in place. A modified click (Cmd, Ctrl) follows the browser's default behaviour.
