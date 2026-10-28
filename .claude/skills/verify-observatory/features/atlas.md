# Atlas

`/atlas/` ("Agent Atlas") shows the same data as ten views, each in a numbered panel:

1. World map
2. Periodic table
3. Country fingerprints
4. Who leads where
5. Score ranges
6. Head to head
7. One step away
8. Flows
9. Company network
10. Timeline

A sticky tab strip links to the views and highlights the one in the middle of the screen. "← Observatory" goes back to the home page.

## Sub-features

- `atlas-render` draws all ten views, with no `.view-error`.
- `atlas-tabs` scrolls to a view from a tab and highlights the tab (`aria-current="true"`). The strip scrolls sideways when it is too wide, and fades whichever edge hides tabs (`.more` on the right, `.more-l` on the left). Above the first view, no tab is highlighted and the strip scrolls back to its start.
- `atlas-periodic-detail` opens a tile's detail in the panel under the periodic table, and closes it with ×.
- `atlas-compare` changes the head-to-head pair with its two selects.
- `atlas-back` returns to `/` with the "← Observatory" link.

## How to get to it (user POV)

- Click "Atlas" in the home page nav, or open `/atlas/`.
- Click a tab such as "02 Periodic table".

## Driving it with observatory.mjs

Preconditions:

- `node $H doctor` prints `healthy`.

- **Render.** Run `node $H open /atlas/`. Then `node $H eval "({ views: document.querySelectorAll('.view').length, errors: document.querySelectorAll('.view-error').length })"` prints `{ views: 10, errors: 0 }`. Take `node $H shot atlas-1440-top`.
- **Tab.** Run `node $H click '[data-atlas-nav] a[href="#v-periodic"]'`. Wait a moment, then `node $H eval "document.querySelector('[data-atlas-nav] [aria-current]')?.getAttribute('href')"` prints `#v-periodic`. Take `node $H shot atlas-1440-periodic`.
- **Periodic detail.** Run `node $H click '#v-periodic .pt-tile[data-cap="commerce.in-chat-checkout"]'`. Then `node $H eval "document.querySelector('#v-periodic .pt-panel h3')?.innerText"` names the capability, and the tile has `aria-pressed="true"`. Close it with `node $H click '#v-periodic .pt-close'`; the panel shows the hint "Click a tile…" again.
- **Tab strip.** Run `node $H eval "(() => { const n = document.querySelector('[data-atlas-nav]'); return { overflow: n.scrollWidth > n.clientWidth, cls: n.className }; })()"`. When the tabs overflow, `cls` includes `more`, and the right edge fades in the shot. Scroll the strip (`node $H eval "document.querySelector('[data-atlas-nav]').scrollTo({ left: 80 })"`) and `cls` also includes `more-l`.
- **Back to top.** After the Tab step, run `node $H eval "scrollTo(0, 0)"`, wait a moment, then `node $H eval "[document.querySelector('[data-atlas-nav] [aria-current]'), document.querySelector('[data-atlas-nav]').scrollLeft]"`. It prints `[null, 0]`.
- **Phone.** Run `node $H open /atlas/ --width 400`, then `node $H shot atlas-400-top` and `node $H shot atlas-400-network --at '#v-network'`. Check that `scrollWidth` is 400.
- **Proof.** Finish with `node $H errors` (exit 0).

## Gotchas

- The tab highlight comes from a thin band in the middle of the screen, so assert it after the smooth scroll ends. Above the first view, no tab is highlighted.
- Views draw from the data on load. A view that throws shows `.view-error` instead of breaking the page, so always check that count.
- The Atlas has its own tooltip `[data-atlas-tip]`, hidden on scroll. Shots taken right after a hover may include it.
- Smooth scrolling after a tab click takes a moment. `click` waits 400 ms by default; pass `--settle 1000` for long jumps.
