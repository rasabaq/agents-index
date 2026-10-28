# Country view and picker

A visitor picks a country and the console shows it. They see its name, a one-line summary, its score, tier and rank, its live count, its low-confidence count and its source count. Its column is highlighted in the matrix, and its category bars appear. The choice lives in the URL as `#country=XX`, so a link opens the same country.

> **About to change.** This file describes `main` before PR #53 ("My country view", branch `feat/my-country`) and PR #58 (stacked on it). After they merge:
> - The view starts on the visitor's country from the browser language (`--lang es-CL` → Chile; anything else → US). A `#country=` hash still wins.
> - A `<select data-pick-country>` picker sits under the name.
> - A verdict sentence `.cn-verdict` replaces `.cn-lede`.
> - A score card and two lists replace the four number cards: "Works today" and "Not yet" (`.mc-list button[data-cap][data-code]`, each opening the cell detail).
>
> Update this file in the same PR that merges #53, or run `/maintain-verification-skill` after it.

## Sub-features

- `country-hash` loads the country named in `#country=XX`. With no hash, it loads the top-ranked country (US).
- `country-pick-hero` selects a country from the hero chips and scrolls to the console.
- `country-pick-console` selects a country from the console list `[data-clist]` without scrolling.
- `country-pick-ranking` and `country-pick-tiers` select from the ranking and the tier tiles.
- `country-keys` steps through the ranking with `j` (next) and `k` (previous).
- `country-compare` jumps to the neighbouring country with the "Compare with" button.
- `country-sources` opens the list of every source behind the country (see matrix-detail.md).

## How to get to it (user POV)

- Click a country chip in the hero (`US 85 … CL 50`).
- Click a country in the console's left list (a strip at 400px), in the Ranking panel, or in the tier list.
- Open a shared link such as `/#country=CL`, or edit the hash in the address bar.
- Press `j` or `k` while no field or dialog has focus.

## Driving it with observatory.mjs

Preconditions:

- `node $H doctor` prints `healthy`.

- **Hash entry.** Run `node $H open '/#country=CL'`. Then `node $H eval "document.querySelector('#cn-title').innerText"` prints `🇨🇱\nChile`, and `node $H eval "document.querySelector('[data-clist] [aria-current=true]').dataset.goCountry"` prints `CL`.
- **Default.** Run `node $H open /`. `#cn-title` reads United States.
- **Hero chip.** Run `node $H open /`, then `node $H click '.hero [data-go-country="MX"]'`. `location.hash` is `#country=MX`, `#cn-title` reads Mexico, and the console has scrolled into view (`node $H eval "Math.round(document.querySelector('#country').getBoundingClientRect().top)"` is under 300). Take `node $H shot country-1440-mx --at '#country'`.
- **Console list.** Run `node $H click '[data-clist] [data-go-country="BR"]'`. `#cn-title` reads Brazil and the hash is `#country=BR`.
- **Keys.** Run `node $H press j`. The country moves to the next one in the ranking (for example BR → IN). `node $H press k` moves it back.
- **Summary and numbers.** Run `node $H eval "document.querySelector('[data-country]').innerText"` and `node $H eval "document.querySelector('[data-kpis]').innerText"`. They show the rank "of 8", the score "/ 100", "of 18" live and the sources count.
- **Phone.** Run `node $H open '/#country=CL' --width 400`, then `node $H shot country-400-cl --at '#country' --offset 120`. Run `node $H eval 'document.documentElement.scrollWidth'`; it prints `400`.
- **Proof.** Finish each page with `node $H errors` (exit 0).

## Gotchas

- Pickers inside the console (list, ranking, Compare) do not scroll the page. Pickers outside it (hero, tiers, hash change) scroll to `#country`.
- The hero has two copies of each country chip: the tape, and planet chips with `tabindex="-1"`. `.hero [data-go-country=…]` matches the first (the tape), which is the one a visitor sees first.
- `j` and `k` do nothing while the cell detail dialog is open or a field has focus.
- The summary sentence comes from the data, so it changes when the data changes. Assert its shape (the country name, "can" / "cannot"), not exact words.
