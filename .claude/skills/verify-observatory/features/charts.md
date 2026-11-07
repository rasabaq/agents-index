# Charts

Three charts remain, each in a chart window: the map and compare on the home page, flows on `/companies.html`. Each page places a chart with a slot, `<section data-chart="<id>">`, and `charts/charts.js` draws it there and gives the slot the id `v-<id>`.

In page order:

1. World map (`map`), right under the hero, where it overlaps the planet. It is a stage: a pixel map with a flying camera, a passport card and a seal, and a tour that plays by itself
2. Compare two countries (`compare`), after the console. It starts on "Only differences"
3. Flows (`flows`), on `/companies.html`, after the Companies table

## Sub-features

- `charts-render` draws the two home charts, and flows on the companies page, with no `.view-error`.
- `charts-compare` changes the pair with its two selects. It shows the 6 biggest gaps first, then `.vc-more button` "Show all N differences" / "Show fewer".
- `charts-hash` scrolls to a chart when the page opens with `#v-<id>`.
- `charts-map-stage` draws the map canvas, the passport card for the start country, its seal, the legend under the map and the "live in N of M" strip under the stage.
- `charts-map-world` toggles the "World view" button: the camera flies out to the whole world and back.
- `charts-map-areas` makes an area icon on the card the focus area: its tasks list on the card, the first is selected, and the seal, the map highlight and the strip follow the selected task.
- `charts-map-pick` picks a country in the stage (select, ← / →, map click, swipe on the card): the stage flies there and sends `pickcountry`. A country picked anywhere else (`countrychange`) flies the stage there too.
- `charts-map-tour` plays a tour by itself after the intro, on a plain visit to `/` only: a link to one country (`/#country=GB`) lands on it with no tour. The tour never changes the page's country. It holds while the stage is off screen. With reduced motion there is no tour.

## How to get to it (user POV)

- Scroll down the home page.
- Open `/#v-compare` to land on one chart.

## Driving it with observatory.mjs

Preconditions:

- `node $H doctor` prints `healthy`.
- The charts draw after the console. Open with `--wait '#v-compare .vc-group'` (home) or `--wait '#v-flows svg'` (companies page) so they have drawn.

- **Render.** Run `node $H open / --wait '#v-compare .vc-group'`. Then `node $H eval "({ views: document.querySelectorAll('.view').length, errors: document.querySelectorAll('.view-error').length })"` prints `{ views: 2, errors: 0 }`. On `node $H open /companies.html --wait '#v-flows svg'` it prints `{ views: 1, errors: 0 }`. Take `node $H shot charts-1440-map --at '#v-map'`.
- **Compare button.** Run `node $H open '/#country=US' --wait '#v-compare .vc-group'`, then `node $H click '[data-compare]'` (it reads "Compare with IN" with today's data: the country it is tied with, else the next one down). `#v-compare` scrolls into view, its two selects read United States and India, the summary line names both, and focus is on the first select. The console heading `#cn-title` still reads United States and the hash is still `#country=US`. Take `node $H shot charts-1440-compare-button` right after the click, and repeat at 400.
- **Hash.** Run `node $H open '/#v-compare' --wait '#v-compare .vc-group'`, then `node $H eval "Math.round(document.getElementById('v-compare').getBoundingClientRect().top)"` prints a number near the nav height (under 120).
- **Phone.** Run `node $H open / --width 400 --wait '#v-compare .vc-group'`, then `node $H shot charts-400-map --at '#v-map'`. Check that `scrollWidth` is 400.
- **Proof.** Finish with `node $H errors` (exit 0).

The world map (the stage). The tour moves the card every few seconds, so read state right after an action, and remember that
hovering the stage holds the tour for 8 s. `#v-map .fly-card` exists once the stage has drawn:

- **Stage.** Run `node $H open '/#country=US' --wait '#v-map .fly-card'`. `#v-map .fly-c-name` reads United States, `#v-map select` reads `US`, `#v-map .fly-seal-set` has an `aria-label` like "Buy inside an AI assistant in United States: Live" (", unsure" is added for a low confidence cell, which also shows a sunrise `?` by the badge), and `#v-map .fly-legend` lists the score scale, "Live there for this task", "On the card" and the marks Live, Limited, Announced, Not live. Take `node $H shot map-1440-stage --at '#v-map .fly-stage'`. The intro runs when the stage first scrolls into view: the world lights up, then the camera flies in to the country (about 3 s).
- **World view.** `node $H click '#v-map .fly-world'`: its `aria-pressed` is `true` and it reads "Back to United States"; the camera shows the whole world. Click it again: `false`, "World view", the camera flies back.
- **Areas and tasks.** `node $H click "#v-map [data-area='health']"`: that button has `aria-pressed="true"`, `#v-map .fly-task` lists the health tasks (the first pressed), and the seal's `aria-label`, `#v-map .fly-wh` ("<task>: live in N of 24") and the flags `#v-map .fly-flags li` follow it. `node $H click '#v-map .fly-task:nth-child(2)'` selects the second task the same way. The area and task buttons are native buttons, so `Tab` then `Enter` or `' '` work too.
- **Pick.** First listen: `node $H eval "(window.__picks = [], document.addEventListener('pickcountry', e => __picks.push(e.detail)), 1)"`. Then `node $H click "#v-map [data-step='1']"` (next by rank): `__picks` ends with `IN`, and after the flight (about 3 s) the card, the select and the strip show India. `[data-step='-1']` goes back. `node $H click '#v-map .fly-map'` clicks the country under the map's centre (the card's own). The native select cannot be driven by key presses in headless Chrome; set its value and send `change` from `eval` to check it, and say so in the proof. app.js turns `pickcountry` into a selection without scrolling.
- **Stays in sync.** Click a country in `[data-clist]` (or press `j`): app.js fires `countrychange`, the tour stops for good and the stage shows that country.
- **Tour.** Open the page, scroll the stage into view without moving the mouse over it, and poll `#v-map .fly-c-name` for 30 s: the card moves to a new country every 5 to 6 s, the select changes in the same poll as the card (never before it), the seal cycles Live, Limited, Announced and Not yet, and `#cn-title` does not change.
- **Reduced motion.** `open` cannot set `prefers-reduced-motion`; open a second tab over the DevTools port in `state.json` (`cdpPort`) with `Emulation.setEmulatedMedia` `prefers-reduced-motion: reduce`. The stage then rests on the start country with one task sealed and the camera on its region, and the card does not change.
- **Phone.** At 400 the map is full width on top and zoomed to the region, the controls and the card stack under it, and `scrollWidth` is 400. Every button and the select in `#v-map` is at least 44px each way. Take `node $H shot map-400-stage --at '#v-map .fly-mapbox'` and `node $H shot map-400-card --at '#v-map .fly-card'`.
- **No jump.** The empty slot reserves the stage's drawn height (charts.css, "The map opens the data"). Every height in the stage is fixed, so it does not change as the tour moves. Check it in the page: empty the slot, measure, and put it back in one step: `node $H eval "(() => { const s = document.querySelector('[data-chart=map]'); const drawn = s.getBoundingClientRect().height; const kids = [...s.childNodes]; s.replaceChildren(); const reserved = s.getBoundingClientRect().height; s.replaceChildren(...kids); return { drawn: Math.round(drawn), reserved: Math.round(reserved) }; })()"`. `drawn` and `reserved` agree within 2px at 1440, 1000, 700 and 400. A gap means `--map-stage` or `--map-chrome` in charts.css no longer mirrors the CSS in `viz-map.js`. This eval changes the page for a moment and puts it back, so it reads state and does not act.

## Gotchas

- Charts draw from the data after the page above them. A chart that throws shows `.view-error` instead of breaking the page, so always check that count.
- d3 loads from cdnjs. Offline, every d3 chart (compare, flows) shows `.view-error`. The map does not use d3.
- The charts have their own tooltip `[data-chart-tip]`, hidden on scroll. Shots taken right after a hover may include it.
- Each chart scopes its CSS under `.v-<id>` (the map under `#v-map .fly-*`). Class names inside a chart must not reuse an unscoped home page class (`.dot`, `.card`, `.note`), or the home rule leaks in.
