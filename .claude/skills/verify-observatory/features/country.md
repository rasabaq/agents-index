# Country view ("My country") and picker

A visitor lands on their own country and the console shows it. In order, they see:

- its name, with "Your country" above it when the site guessed it;
- a picker;
- a one-sentence verdict on what AI agents can and cannot do there yet, and the main reason;
- the score next to the best country and the average;
- two plain lists, "Works today" and "Not yet".

Each Not yet item shows its status, its gap reason when it has one, and companies that could close the gap. Every list item opens the cell detail. Below that, the country's column is highlighted in the matrix and its category bars appear. The choice lives in the URL as `#country=XX`, so a link opens the same country.

## Sub-features

- `country-start` picks the start country, in this order:
  1. the `#country=XX` hash;
  2. the time zone (`America/Santiago` → CL);
  3. the browser language region (`es-CL` → CL);
  4. otherwise the US.
- `country-own` labels the head "Your country" only for the guessed country (from the time zone or the language). For any other country it says "Country".
- `country-picker` switches the country from the `<select data-pick-country>` under the name, and updates the hash.
- `country-verdict` is the sentence `.cn-verdict`, built from the data:
  - "can …" names up to two categories with at least one live cell;
  - "cannot yet …" names up to two categories with none;
  - "Main reason: …" is the most common `gapReason` label among the cells of the categories it names. It is left out when none of them has one.
- `country-score` is the card `.mc-score`: "N / 100 · rank R of 8", with bars for this country, the best country (hidden when this country is the best) and the average of 8, plus the data date.
- `country-lists` are `#mc-works` ("Works today · L of 18") and `#mc-not` ("Not yet · M of 18"). Their items are `.mc-list button[data-cap][data-code]`, and each one opens the cell detail (see matrix-detail.md). A Not yet item can show its gap reason label and a `small.mc-co` line, "Could close it: Company (already in XX YY)".
- `country-business` is the "For people" / "For businesses" toggle (`[data-view]`, `aria-pressed`) under the verdict. "For businesses" swaps the verdict for a business one and the cards for three `.biz-group` cards: Sell through AI agents, Sell in chat apps, and Get paid by agents. These cover the eight capabilities in `BUSINESS_GROUPS` (`src/observatory.js`). Each item has a seller-side label, one line on why (the gap reason when the cell has one, else its status in plain words), and a `.biz-cos` line. That line reads "Sign up with: …" when the cell is live, and "Active here: …" otherwise, with links to each company's homepage. The view lives in the link: `#country=MX&view=business`, so a business link can be shared. An old `#country=MX` link opens For people.
- `country-pick-hero` selects a country from the hero chips and scrolls to the console.
- `country-pick-console` selects a country from the console list `[data-clist]` without scrolling.
- `country-pick-ranking` and `country-pick-tiers` select a country from the ranking and from the tier tiles.
- `country-keys` steps through the ranking with `j` (next) and `k` (previous).
- `country-compare` jumps to the neighbouring country with the "Compare with" button.
- `country-sources` opens the list of every source behind the country (see matrix-detail.md).

## How to get to it (user POV)

- Open `/`. The page starts on your country, guessed from your time zone or browser language.
- Pick a country in the select under the country name.
- Click a country chip in the hero (`US 85 … CL 50`).
- Click a country in the console's left list (a strip at 400px), in the Ranking panel, or in the tier list.
- Open a shared link such as `/#country=CL`, or edit the hash in the address bar.
- Press `j` or `k` while no field or dialog has focus.

## Driving it with observatory.mjs

Preconditions:

- `node $H doctor` prints `healthy`.

Steps:

- **Default.** Run `node $H open / --lang en`. The harness pins the time zone to UTC, and `en` names no region, so nothing is guessed: `#cn-title` reads United States, and the label (`node $H eval "document.querySelector('#country .label').innerText"`) starts with "Country". A plain `node $H open /` also opens the United States, but labels it "Your country", because headless Chrome reports `en-US`.
- **Time zone.** Run `node $H open / --tz America/Santiago`. `#cn-title` reads Chile, and the label starts with "Your country".
- **Language.** Run `node $H open / --lang es-CL`. `#cn-title` reads Chile.
- **Hash wins.** Run `node $H open '/#country=MX' --lang es-CL --tz America/Santiago`.
  - `#cn-title` reads Mexico, and the label starts with "Country".
  - `node $H eval "document.querySelector('[data-clist] [aria-current=true]').dataset.goCountry"` prints `MX`.
- **Picker.** `click` cannot choose a `<select>` option, so set the value and fire `change` the way the browser does: `node $H eval "(() => { const s = document.querySelector('[data-pick-country]'); s.value = 'CO'; s.dispatchEvent(new Event('change', { bubbles: true })); return [location.hash, document.querySelector('#cn-title').innerText]; })()"`. It prints `#country=CO` and Colombia.
- **Verdict.** Run `node $H eval "document.querySelector('.cn-verdict').innerText"`.
  - It starts with "In <country>, AI agents can" (or "nothing we track works") and ends with a full stop.
  - Every category it says agents "can" do has an item under Works today.
- **Score.** Run `node $H eval "document.querySelector('.mc-score').innerText"`. It shows "/ 100 · rank", "of 8", "Average of 8" and "Data as of".
- **Lists.**
  - Run `node $H eval "[document.querySelector('#mc-works').innerText, document.querySelector('#mc-not').innerText, document.querySelectorAll('.mc-list button[data-cap]').length]"`. The two counts add up to 18, and so does the number of buttons.
  - Run `node $H click '#mc-not + ul button'`. `node $H eval "document.querySelector('[data-detail]').open"` prints `true`. Then `node $H press Escape`.
- **For businesses.**
  - Run `node $H open '/#country=MX'`, then `node $H click '[data-view="business"]'`.
  - `node $H eval "[document.querySelector('.cn-verdict').innerText, [...document.querySelectorAll('.biz-group h3')].map(h => h.innerText), [...document.querySelectorAll('.biz-cos')].map(p => p.innerText)]"` shows a verdict with "of the 8 ways", three group titles with "of N live", and lines that start with "Sign up with" or "Active here".
  - `node $H eval "document.activeElement.dataset.view"` prints `business`.
  - `node $H click '.biz-group button[data-cap]'` opens the cell detail. Then `node $H press Escape`.
  - Take `node $H shot business-1440-mx --at '#country'`.
  - `node $H eval 'location.hash'` prints `#country=MX&view=business`. `node $H open '/#country=CL&view=business'` opens Chile on For businesses.
  - Picking another country keeps the business view. `node $H click '[data-view="people"]'` brings back `#mc-works`.
- **Hero chip.** Run `node $H open /`, then `node $H click '.hero [data-go-country="MX"]'`.
  - `location.hash` is `#country=MX`, and `#cn-title` reads Mexico.
  - The console has scrolled into view: `node $H eval "Math.round(document.querySelector('#country').getBoundingClientRect().top)"` is under 300.
  - Take `node $H shot country-1440-mx --at '#country'`.
- **Console list.** Run `node $H click '[data-clist] [data-go-country="BR"]'`. `#cn-title` reads Brazil, and the hash is `#country=BR`.
- **Keys.** Run `node $H press j`. The country moves to the next one in the ranking (for example BR → IN). `node $H press k` moves it back.
- **Phone.**
  - For businesses at 400px stacks the three cards in one column: `node $H open '/#country=MX' --width 400`, `node $H click '[data-view="business"]'`, `node $H shot business-400-mx --at '#country' --offset 120`.
  - Run `node $H open '/#country=CL' --width 400`, then `node $H shot country-400-cl --at '#country' --offset 120`.
  - The score card, Works today and Not yet stack in one column.
  - `node $H eval 'document.documentElement.scrollWidth'` prints `400`.
- **Proof.** Finish each page with `node $H errors` (exit 0).

## Gotchas

- The start country depends on the time zone. The harness pins it to UTC unless `--tz` is given. Without that, a run on a machine in Santiago opens Chile.
- Pickers inside the console (the select, the list, the ranking, Compare) do not scroll the page. Pickers outside it (the hero, the tiers, a hash change) scroll to `#country`.
- The hero has two copies of each country chip: the tape, and planet chips with `tabindex="-1"`. `.hero [data-go-country=…]` matches the first (the tape), which is the one a visitor sees first.
- `j` and `k` do nothing while the cell detail dialog is open or a field has focus.
- The verdict, the reasons and "Could close it" come from the data, so they change when the data changes. Assert their shape (the country name, "can", "Main reason:", "already in"), not exact words.
- "Could close it" only names companies that already work in two or more countries, in the same region as this one. The US and India have no same-region neighbour among the 8, so they never show it.
