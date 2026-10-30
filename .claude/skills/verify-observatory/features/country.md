# Country view ("My country") and picker

A visitor lands on their own country and the console shows it. In order, they see:

- its name, with "Your country" above it when the site guessed it;
- one line with how many things work today, the score, and the rank;
- a one-sentence verdict on what AI agents can and cannot do there yet, and the main reason;
- the country picker: every country with its score, best first;
- two short lists, "Works today" and "Not yet" (5 items each, then "Show all N"), and the four theme bars.

Each Not yet item shows its status, its gap reason when it has one, and a "Seen it work here? Tell us" link. Every list item opens the cell detail, which names companies that could close the gap. Below that, the closed matrix highlights the country's column. The choice lives in the URL as `#country=XX`, so a link opens the same country.

## Sub-features

- `country-start` picks the start country, in this order:
  1. the `#country=XX` hash;
  2. the time zone (`America/Santiago` → CL);
  3. the browser language region (`es-CL` → CL);
  4. otherwise the US.
- `country-own` labels the head "Your country" only for the guessed country (from the time zone or the language). For any other country it says "Country".
- `country-picker` is `[data-clist]` (`#ranking`): one button per country with flag, code and score, best first. A click switches the country without scrolling and updates the hash.
- `country-verdict` is the sentence `.cn-verdict`, built from the data:
  - "can …" names up to two categories with at least one live cell;
  - "cannot yet …" names up to two categories with none;
  - "Main reason: …" is the most common `gapReason` label among the cells of the categories it names. It is left out when none of them has one.
- `country-score` is the line `.cn-score`: "L of 29 things work today · score N of 100 · Rth of 8", plus ", tied" and the count of unsure cells when there are any.
- `country-lists` are `#mc-works` ("Works today · L of 29") and `#mc-not` ("Not yet · M of 29"). Each shows 5 items, then `[data-more]` "Show all N" / "Show fewer". Their items are `.mc-list button[data-cap][data-code]`, and each one opens the cell detail (see matrix-detail.md). A Not yet item can show its gap reason label and an `a.mc-tell` link to the prefilled correction form.
- `country-themes` is the third card, "By theme · out of 100": four bars from `themes` in `data/meta.json`, each the mean of its categories, and a note naming the weakest category.
- `country-business` is the "For people" / "For businesses" toggle (`[data-view]`, `aria-pressed`) under the verdict. "For businesses" swaps the verdict for a business one and the cards for three `.biz-group` cards: Sell through AI agents, Sell in chat apps, and Get paid by agents. These cover the eight capabilities in `BUSINESS_GROUPS` (`src/observatory.js`). Each item has a seller-side label, one line on why (the gap reason when the cell has one, else its status in plain words), and a `.biz-cos` line. That line reads "Sign up with: …" when the cell is live and "Active here: …" otherwise. It is left out on Not yet items, with links to each company's homepage. The view lives in the link: `#country=MX&view=business`, so a business link can be shared. An old `#country=MX` link opens For people.
- `country-pick-hero` selects a country from the pins on the hero's planet, without scrolling. The sun moves behind the selected pin.
- `country-pick-console` selects a country from the picker `[data-clist]` without scrolling.
- `country-keys` steps through the ranking with `j` (next) and `k` (previous).
- `country-compare` is the "Compare with XX" button (`[data-compare="US BR"]`, this country and its neighbour in the ranking). It does not change the console country or the hash: it scrolls to the Compare two countries chart `#v-compare` with that pair picked (see charts.md). If that chart did not draw, it switches the console to the neighbour instead.
- `country-sources` opens the list of every source behind the country (see matrix-detail.md).

## How to get to it (user POV)

- Open `/`. The page starts on your country, guessed from your time zone or browser language.
- Pick a country in the row of country buttons under the verdict.
- Click a country pin on the hero's planet (score, flag, a pole as tall as the score).
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
- **Picker.** Run `node $H click '[data-clist] [data-go-country="CO"]'`. `node $H eval "[location.hash, document.querySelector('#cn-title').innerText]"` prints `#country=CO` and Colombia. The buttons list scores that never increase.
- **Verdict.** Run `node $H eval "document.querySelector('.cn-verdict').innerText"`.
  - It starts with "In <country>, AI agents can" (or "nothing we track works") and ends with a full stop.
  - Every category it says agents "can" do has an item under Works today.
- **Score.** Run `node $H eval "document.querySelector('.cn-score').innerText"`. It shows "of 29 things work today", "score", "of 100" and "of 8".
- **Lists.**
  - Run `node $H eval "[document.querySelector('#mc-works').innerText, document.querySelector('#mc-not').innerText, document.querySelectorAll('.mc-list button[data-cap]').length]"`. The two counts add up to 29. At most 10 buttons show.
  - Run `node $H click '[data-more="not"]'`. The Not yet list shows every item and the button reads "Show fewer".
  - Run `node $H click '#mc-not + ul button'`. `node $H eval "document.querySelector('[data-detail]').open"` prints `true`. Then `node $H press Escape`.
- **For businesses.**
  - Run `node $H open '/#country=MX'`, then `node $H click '[data-view="business"]'`.
  - `node $H eval "[document.querySelector('.cn-verdict').innerText, [...document.querySelectorAll('.biz-group h3')].map(h => h.innerText), [...document.querySelectorAll('.biz-cos')].map(p => p.innerText)]"` shows a verdict with "of the 8 ways", three group titles with "of N live", and lines that start with "Sign up with" or "Active here".
  - `node $H eval "document.activeElement.dataset.view"` prints `business`.
  - `node $H click '.biz-group button[data-cap]'` opens the cell detail. Then `node $H press Escape`.
  - Take `node $H shot business-1440-mx --at '#country'`.
  - `node $H eval 'location.hash'` prints `#country=MX&view=business`. `node $H open '/#country=CL&view=business'` opens Chile on For businesses.
  - Picking another country keeps the business view. `node $H click '[data-view="people"]'` brings back `#mc-works`.
- **Hero pin.** Run `node $H open /`, then `node $H click '.hero [data-go-country="MX"]'`.
  - `location.hash` is `#country=MX`, and `#cn-title` reads Mexico.
  - The page did not scroll: `node $H eval "Math.round(document.querySelector('.hero-pins').getBoundingClientRect().top)"` is still in the viewport.
  - Take `node $H shot hero-1440-mx` (the MX pin is lit and the sun sits behind it), then `node $H shot country-1440-mx --at '#country'`.
- **Keys.** Run `node $H press j`. The country moves to the next one in the ranking (for example BR → IN). `node $H press k` moves it back.
- **Phone.**
  - For businesses at 400px stacks the three cards in one column: `node $H open '/#country=MX' --width 400`, `node $H click '[data-view="business"]'`, `node $H shot business-400-mx --at '#country' --offset 120`.
  - Run `node $H open '/#country=CL' --width 400`, then `node $H shot country-400-cl --at '#country' --offset 120`.
  - Works today, Not yet and the themes stack in one column.
  - `node $H eval 'document.documentElement.scrollWidth'` prints `400`.
- **Proof.** Finish each page with `node $H errors` (exit 0).

## Gotchas

- The start country depends on the time zone. The harness pins it to UTC unless `--tz` is given. Without that, a run on a machine in Santiago opens Chile.
- The picker inside the console and the hero pins do not scroll the page. Compare is not a picker: it scrolls to `#v-compare`. Other pickers (the world map, a hash change) scroll to `#country`.
- The hero pins are links in a list (`[data-hero-pins]`), named like "United States, rank 1, score 84", and reachable with Tab.
- `j` and `k` do nothing while the cell detail dialog is open or a field has focus.
- The verdict, the reasons and "Could close the gap" come from the data, so they change when the data changes. Assert their shape (the country name, "can", "Main reason:", "already in"), not exact words.
- "Could close the gap" (in the cell detail) only names companies that already work in two or more countries, in the same region as this one. The US and India have no same-region neighbour among the 8, so they never show it.
