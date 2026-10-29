# AI Agent Observatory verification map

This folder is the maintained source for verifying what visitors see and do on the observatory site. Read this index before you drive the site, then use the matching feature file as the recipe.

## Baseline preconditions

- Start a run with `node $H up`, where `H=.claude/skills/verify-observatory/observatory.mjs`, from the repo root of the checkout under test.
- `node $H doctor` prints `healthy`, and its revision is the commit you mean to verify.
- The data is the repo's own `data/*.json`. There is no seed step, and nothing in the UI writes data.
- Never drive a server or browser that this run did not start.

## Driving conventions

- Start every recipe with `node $H open …`. It sets the width, scheme and language for that load and gives a fresh page.
- Act with `click` and `press`. Use `eval` only to read state.
- Prefer the data attributes and ids listed in SKILL.md over text or position. Country codes are `US GB DE IN BR MX CL CO`.
- Check each recipe at `--width 1440` and `--width 400`. The site is dark-only, so `--scheme light` must look the same.
- Do not follow external links (sources, GitHub). Assert their `href`.

## Proof and skip reporting

- For each claim, keep a screenshot of the action's result and the `eval` that reads the state. Both are in `steps.log`.
- Name screenshots `<feature>-<width>-<state>`.
- End each page with `node $H errors`. An exit code of 1 is a failure, even when the screen looks right.
- At 400px, `document.documentElement.scrollWidth` must equal 400 (no sideways scroll).
- If an entry point cannot be reached, report the command you tried and what was missing. Do not report it as verified through another entry point.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing what the visitor sees. It then has exactly four H2 sections, in this order:

1. `Sub-features`
2. `How to get to it (user POV)`
3. `Driving it with observatory.mjs`
4. `Gotchas`

## Features

- [Country view and picker](./country.md) covers choosing a country (hero chips, console list, ranking, tier tiles, `#country=` hash, J/K keys) and what the country view shows. **About to change:** PR #53 "My country view" replaces it.
- [Capability matrix and cell detail](./matrix-detail.md) covers the matrix, the cell detail dialog, its sources, the "Suggest a correction" link and the country sources list.
- [Ranking and tiers](./ranking.md) covers the console ranking, the score legend and the tier list.
- [Companies table](./companies.md) covers the market filters, the rows, the logos and the scroll box.
- [Charts](./charts.md) covers the ten home page charts: drawing, the periodic table detail, head to head and `#v-<id>` links.
