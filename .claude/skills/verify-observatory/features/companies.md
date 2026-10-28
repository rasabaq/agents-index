# Companies table

"Who makes it possible" lists the companies that enable agent capabilities. Each row has a logo (or a one-letter monogram), the company name linked out, its category tags, where it is based, what it lets agents do, and the countries it is live in. Market pills filter the table to companies live in one country, and the label counts the rows shown ("Companies · 24 of 94").

## Sub-features

- `companies-all` shows every company under "All markets", and the label reads "Companies · N of N".
- `companies-filter` keeps only the companies live in the chosen market, and updates the label and `aria-pressed`.
- `companies-logos` loads each logo; one that is missing or fails becomes a monogram `.logo.mono`.
- `companies-live-in` marks the live countries in the last column (`.markets i.on`).
- `companies-scroll` keeps the table in a scroll box `.table-scroll` inside the page.

## How to get to it (user POV)

- Use "Companies" in the site nav, the console tab "4 Companies", or press `4`.
- Scroll to "Who makes it possible."

## Driving it with observatory.mjs

Preconditions:

- `node $H doctor` prints `healthy`.

- **All markets.** Run `node $H open /`, then `node $H shot companies-1440-all --at '#companies'`. Then `node $H eval "document.querySelector('[data-companies-label]').innerText"` prints `COMPANIES · N OF N` (the label is upper case on screen).
- **Filter.** Run `node $H click '[data-company-filters] [data-market="MX"]'`. Then `node $H eval "({ label: document.querySelector('[data-companies-label]').innerText, rows: document.querySelectorAll('[data-companies] tbody tr').length, pressed: document.querySelector('[data-market=\"MX\"]').getAttribute('aria-pressed') })"` shows fewer rows than N, a label that matches the row count, and `pressed: "true"`. Take `node $H shot companies-1440-mx`.
- **Logos.** Scroll the box to load the lazy logos: `node $H eval "(async () => { const s = document.querySelector('#companies .table-scroll'); for (let y = 0; y <= s.scrollHeight; y += 300) { s.scrollTop = y; await new Promise(r => setTimeout(r, 120)); } await new Promise(r => setTimeout(r, 1500)); s.scrollTop = 0; return { broken: [...document.querySelectorAll('#companies img')].filter(i => i.complete && !i.naturalWidth).length, monograms: document.querySelectorAll('#companies .logo.mono').length }; })()"`. `broken` is 0. Monograms are the intended fallback.
- **Phone.** Run `node $H open / --width 400` and `node $H shot companies-400 --at '#companies'`. Rows become cards, and `scrollWidth` is 400.
- **Proof.** Finish with `node $H errors`. A `resource` entry for a logo is fine; script errors are not.

## Gotchas

- The table scrolls inside `.table-scroll`, not with the page. Rows below the box edge exist in the DOM but are not visible in a viewport shot.
- Logos load from third-party sites. A slow or blocked logo becomes a monogram on its own. Do not report a monogram as broken.
- The filter goes by a company's markets in any category. A company can match MX through one capability and not another.
- The scroll loop above is a reader's scroll to load lazy images, not a state change. It does not replace driving a feature.
