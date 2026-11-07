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
- `country-score` is the line `.cn-score`: "L of 29 things work today · score N of 100 · Rth of N" (N is the number of countries in `data/meta.json`), plus ", tied" and the count of unsure cells when there are any.
- `country-errands` live in `src/errands.js` (`ERRANDS`). In `[data-kpis]`:
  - a key `.ekey`;
  - one card per errand, `.ecard[data-errand="shop"]` (`aria-pressed` on the open one), with a step meter and "N of M by the agent";
  - the open errand `#errand`: its title `#eh-title`, a headline `.eh-line`, and the chain `.chain`. Each step is a `.ch-node[data-cap][data-code]` button; an either/or step is a `.ch-fork` of two or three of them. "You take over here" (`.ch-over`, `.takeover`) marks only the first step left to you, and none when the agent can at least help with every step;
  - "country by country" `.xc`: one button per country (`[data-go-country]`), most steps by the agent first.
  The open errand lives in the link: `#country=CL&errand=car`. No `errand` opens the first one.
- `country-business` is the "For people" / "For businesses" toggle (`[data-view]`, `aria-pressed`) under the verdict. "For businesses" swaps the verdict for a business one ("N of the 8 ways we track", from `BUSINESS_GROUPS` in `src/observatory.js`) and the errands for four business errands (`BUSINESS_ERRANDS` in `src/errands.js`): Sell through AI agents, Sell in chat apps, Get paid by agents, and Run the back office. They use the same cards and chain. A step's cell detail names who to work with: "Sign up with: …" when the cell is live, "Active here: …" when it is limited or announced, nothing when it is Not yet, with links to each company's homepage. The view lives in the link: `#country=MX&view=business`, so a business link can be shared. An old `#country=MX` link opens For people. Switching the view opens its first errand.
- `country-pick-stage` selects a country from the map stage `#v-map` right under the hero, without scrolling: a map dot, the ← / → buttons, the "Country" select, or an area icon on its passport card. The stage fires `pickcountry` on `document` (detail: the code), and `app.js` selects that country. See charts.md for the stage itself.
- `country-pick-console` selects a country from the picker `[data-clist]` without scrolling.
- `country-keys` steps through the ranking with `j` (next) and `k` (previous).
- `country-compare` is the "Compare with XX" button (`[data-compare="US IN"]` with today's data: this country and the country it is tied with, else the next one down, else the one above). It does not change the console country or the hash: it scrolls to the Compare two countries chart `#v-compare` with that pair picked (see charts.md). If that chart did not draw, it switches the console to the neighbour instead.
- `country-sources` opens the list of every source behind the country (see matrix-detail.md).
- `country-profile` is the "Full profile →" link at the end of `.cn-score`. It opens `/countries.html#country=XX` for the same country (see countries.md).

## How to get to it (user POV)

- Open `/`. The page starts on your country, guessed from your time zone or browser language.
- Pick a country in the row of country buttons under the verdict.
- Pick a country in the map stage under the hero: click a dot, step with ← / →, or choose one in its "Country" select.
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
- **Score.** Run `node $H eval "document.querySelector('.cn-score').innerText"`. It shows "of 29 things work today", "score", "of 100" and "of 24".
- **Errands.**
  - Run `node $H eval "[document.querySelectorAll('.ecard').length, document.querySelector('#eh-title').innerText, document.querySelector('.eh-line').innerText]"`. It prints 7, "Do the weekly shop" and a line that starts with "In <country>,".
  - Run `node $H click '.ecard[data-errand="car"]'`. `location.hash` ends with `&errand=car`, the title reads "Sort out car insurance", and focus stays on the card.
  - `node $H eval "document.querySelectorAll('.takeover').length"` is at most 3 (one step, or every way of one either/or step).
  - Run `node $H click '.ch-node[data-cap="insurance.buy-policy"]'`. The cell detail opens; its `.d-facts` names "Sort out car insurance, step 2" and "Live in:". Then `node $H press Escape`.
  - Run `node $H click '.xc [data-go-country="US"]'`. The country switches without scrolling and focus stays on the US button.
- **For businesses.**
  - Run `node $H open '/#country=MX'`, then `node $H click '[data-view="business"]'`.
  - `node $H eval "[document.querySelector('.cn-verdict').innerText, [...document.querySelectorAll('.ecard .ec-name')].map(e => e.innerText)]"` shows a verdict with "of the 8 ways" and four business errands.
  - `node $H eval "document.activeElement.dataset.view"` prints `business`.
  - `node $H click '.ecard[data-errand="chat"]'`, then `node $H click '.ch-node[data-cap="messaging.business-ai-agent"]'`. The cell detail's `.d-facts` reads "In Sell in chat apps, step 1" and a line that starts with "Sign up with" or "Active here". Then `node $H press Escape`.
  - Take `node $H shot business-1440-mx --at '#country'`.
  - `node $H eval 'location.hash'` prints `#country=MX&view=business&errand=chat`. `node $H open '/#country=CL&view=business'` opens Chile on For businesses.
  - Picking another country keeps the business view. `node $H click '[data-view="people"]'` brings back the seven errands.
- **Stage pick.** The stage's own controls are in charts.md. The page side is the `pickcountry` event. This is the one `eval` that acts, because it stands in for the stage: run `node $H open '/#country=CL'`, read `scrollY`, then `node $H eval "document.dispatchEvent(new CustomEvent('pickcountry', { detail: 'KE' })), [document.querySelector('#cn-title').innerText, location.hash, scrollY]"`. It prints Kenya, `#country=KE` and the same `scrollY` as before. An unknown code changes nothing.
- **Ranking.** The picker is the ranking. Run `node $H open / --lang en`, then `node $H eval "(() => { const s = [...document.querySelectorAll('[data-clist] button')].map(b => +b.querySelector('.rk-v').innerText); return [s.length, s.every((v, i) => !i || v <= s[i - 1])]; })()"`. It prints `[24, true]`: one button per country, scores never increasing. Then `node $H open '/#country=CL'` and `node $H click '[data-to-ranking]'` ("Open the ranking" in the hero); after the smooth scroll, `#ranking` sits near the top (`getBoundingClientRect().top` about 72), and `location.hash` is still `#country=CL`. At 400px the buttons wrap four to a row, onto six rows, and `scrollWidth` stays 400.
- **Keys.** Run `node $H press j`. The country moves to the next one down the ranking (for example BR → FR with today's data). `node $H press k` moves it back up.
- **Phone.**
  - For businesses at 400px shows the cards two to a row and the steps down the page: `node $H open '/#country=MX' --width 400`, `node $H click '[data-view="business"]'`, `node $H shot business-400-mx --at '#country' --offset 120`.
  - Run `node $H open '/#country=CL' --width 400`, then `node $H shot country-400-cl --at '#country' --offset 120`.
  - The errand cards sit two to a row, and the steps go down the page.
  - `node $H eval 'document.documentElement.scrollWidth'` prints `400`.
- **Proof.** Finish each page with `node $H errors` (exit 0).

## Gotchas

- The start country depends on the time zone. The harness pins it to UTC unless `--tz` is given. Without that, a run on a machine in Santiago opens Chile.
- The console picker, the "country by country" buttons and the map stage do not scroll the page. Compare is not a picker: it scrolls to `#v-compare`. A hash change, or a `[data-go-country]` link outside the console, scrolls to `#country`.
- `j` and `k` do nothing while the cell detail dialog is open or a field has focus.
- The verdict, the reasons and "Could close the gap" come from the data, so they change when the data changes. Assert their shape (the country name, "can", "Main reason:", "already in"), not exact words.
- "Could close the gap" (in the cell detail) only names companies that already work in two or more countries, in the same region as this one. Every country now has a same-region neighbour (the US has Canada, India has Japan), so any country can show it.
