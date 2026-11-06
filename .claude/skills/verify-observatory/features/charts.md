# Charts

Three charts remain, each in a chart window: the map and compare on the home page, flows on `/companies.html`. Each page places a chart with a slot, `<section data-chart="<id>">`, and `charts/charts.js` draws it there and gives the slot the id `v-<id>`.

In page order:

1. World map (`map`), right under the hero, where it overlaps the planet
2. Compare two countries (`compare`), after the console. It starts on "Only differences"
3. Flows (`flows`), on `/companies.html`, after the Companies table

## Sub-features

- `charts-render` draws the two home charts, and flows on the companies page, with no `.view-error`.
- `charts-compare` changes the pair with its two selects. It shows the 6 biggest gaps first, then `.vc-more button` "Show all N differences" / "Show fewer".
- `charts-hash` scrolls to a chart when the page opens with `#v-<id>`.
- `charts-map-pick` picks a country in the console from the world map, by click or by keyboard, and lights the selected country on the map.
- `charts-map-legend` shows the score scale and the tier cuts (S 80+, A 70+, B 60+, C 50+, D <50) above the map.

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

The world map:

- **Click to pick.** Run `node $H open '/#country=US' --wait '#v-map [data-go-country="US"][aria-current="true"]'`. Then `node $H click '#v-map svg [data-go-country="CL"] rect.px'`: the page scrolls to the console, `node $H shot map-1440-picked` shows Chile under `#cn-title`, and the `shot` line in `steps.log` ends with `#country=CL`. `node $H shot map-1440-lit --at '#v-map'` shows Chile in sunrise. At 400px the labels move to a list under the map; click `#v-map .v-map-list [data-go-country="CL"]` instead.
- **Keyboard.** Each country on the map is a focusable button. Click `#v-map .v-map-legend .scale` to set the focus start, press `Tab` (the first country gets a focus ring and its tooltip), then `Enter` or `' '` (Space) selects it, the same as a click.
- **Stays in sync.** Press `j`, or click a country in `[data-clist]`: the map lights the new country, because app.js sets `aria-current` on every `[data-go-country]`.
- **Legend.** `#v-map .v-map-legend .tiers` lists the five tier letters with their cuts. It is one row with the scale at 1440px, and its own row at 400px.
- **Labels.** At 1440, `node $H eval "[...document.querySelectorAll('#v-map .v-map-label .name')].map(t => t.textContent)"` lists one label per country (24). A few use a short name, the 4th field of their `LABELS` entry in `viz-map.js`: "UK", "NL", "UAE" and "Korea". At 1090 (the narrowest wide layout; at 1089 the labels move to the list) no label runs into another country's dots. At 400 there are no labels and `#v-map .v-map-list li` has one row per country.
- **No jump.** The empty slot reserves the map's drawn height (charts.css, "The map opens the data"). `--map-list` holds the height of the list under the map (one 40px row per country, 2px gaps; two columns from 601px), so it must change when the country count changes. Check it in the page: empty the slot, measure, and put it back in one step: `node $H eval "(() => { const s = document.querySelector('[data-chart=map]'); const drawn = s.getBoundingClientRect().height; const kids = [...s.childNodes]; s.replaceChildren(); const reserved = s.getBoundingClientRect().height; s.replaceChildren(...kids); return { drawn: Math.round(drawn), reserved: Math.round(reserved), list: getComputedStyle(s).getPropertyValue('--map-list').trim() }; })()"`. `drawn` and `reserved` agree within 2px at 1440, 1000, 700 and 400. A gap of about 42px per missing row means `--map-list` is stale. This eval changes the page for a moment and puts it back, so it reads state and does not act.

## Gotchas

- Charts draw from the data after the page above them. A chart that throws shows `.view-error` instead of breaking the page, so always check that count.
- d3 loads from cdnjs. Offline, every d3 chart shows `.view-error`.
- The charts have their own tooltip `[data-chart-tip]`, hidden on scroll. Shots taken right after a hover may include it.
- Each chart scopes its CSS under `.v-<id>`. Class names inside a chart must not reuse an unscoped home page class (`.dot`, `.card`, `.note`), or the home rule leaks in.
