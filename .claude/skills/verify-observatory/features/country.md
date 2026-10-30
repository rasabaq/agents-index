# Country view ("My country") and picker

A visitor lands on their own country and the console shows it. In order, they see:

- its name, with "Your country" above it when the site guessed it;
- one line with how many things work today, the score, and the rank;
- a one-sentence verdict on what AI agents can and cannot do there yet, and the main reason;
- the country picker: every country with its score, best first;
- "A day with an agent": seven everyday errands as cards, then the open errand as a chain of steps, then that errand country by country.

Each step is one capability. It says whether the agent does it (Live), helps and you finish (Limited), or you do it (anything else), with the gap reason when it is not live. Every step opens the cell detail, which says which errand uses it, where else it is live, and which companies could close the gap. Below that, the closed matrix highlights the country's column. The choice lives in the URL as `#country=XX`, so a link opens the same country.

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
- `country-errands` live in `src/errands.js` (`ERRANDS`). In `[data-kpis]`:
  - a key `.ekey`;
  - one card per errand, `.ecard[data-errand="shop"]` (`aria-pressed` on the open one), with a step meter and "N of M by the agent";
  - the open errand `#errand`: its title `#eh-title`, a headline `.eh-line`, and the chain `.chain`. Each step is a `.ch-node[data-cap][data-code]` button; an either/or step is a `.ch-fork` of two or three of them. "You take over here" (`.ch-over`, `.takeover`) marks only the first step left to you, and none when the agent can at least help with every step;
  - "country by country" `.xc`: one button per country (`[data-go-country]`), most steps by the agent first.
  The open errand lives in the link: `#country=CL&errand=car`. No `errand` opens the first one.
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
- **Score.** Run `node $H eval "document.querySelector('.cn-score').innerText"`. It shows "of 29 things work today", "score", "of 100" and "of 8".
- **Errands.**
  - Run `node $H eval "[document.querySelectorAll('.ecard').length, document.querySelector('#eh-title').innerText, document.querySelector('.eh-line').innerText]"`. It prints 7, "Do the weekly shop" and a line that starts with "In <country>,".
  - Run `node $H click '.ecard[data-errand="car"]'`. `location.hash` ends with `&errand=car`, the title reads "Sort out car insurance", and focus stays on the card.
  - `node $H eval "document.querySelectorAll('.takeover').length"` is at most 3 (one step, or every way of one either/or step).
  - Run `node $H click '.ch-node[data-cap="insurance.buy-policy"]'`. The cell detail opens; its `.d-facts` names "Sort out car insurance, step 2" and "Live in:". Then `node $H press Escape`.
  - Run `node $H click '.xc [data-go-country="US"]'`. The country switches without scrolling and focus stays on the US button.
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
  - The errand cards sit two to a row, and the steps go down the page.
  - `node $H eval 'document.documentElement.scrollWidth'` prints `400`.
- **Proof.** Finish each page with `node $H errors` (exit 0).

## Gotchas

- The start country depends on the time zone. The harness pins it to UTC unless `--tz` is given. Without that, a run on a machine in Santiago opens Chile.
- The picker inside the console and the hero pins do not scroll the page. Compare is not a picker: it scrolls to `#v-compare`. Other pickers (the world map, a hash change) scroll to `#country`.
- The hero pins are links in a list (`[data-hero-pins]`), named like "United States, rank 1, score 84", and reachable with Tab.
- `j` and `k` do nothing while the cell detail dialog is open or a field has focus.
- The verdict, the reasons and "Could close the gap" come from the data, so they change when the data changes. Assert their shape (the country name, "can", "Main reason:", "already in"), not exact words.
- "Could close the gap" (in the cell detail) only names companies that already work in two or more countries, in the same region as this one. The US and India have no same-region neighbour among the 8, so they never show it.
