# Companies table

"Who makes it possible", on `/companies.html`, lists the companies that enable agent capabilities. The home page links to it from "Who builds it" (`[data-who]`), which shows only the selected country's companies; its "+N more" link opens `/companies.html#market=XX`, filtered to that country. Each description shows two lines until it is hovered, tapped or focused.

Each row has:
- a logo, or a one-letter monogram;
- the company name, linked to its homepage;
- its category tag, shown only when it has one category;
- where it is based;
- what it lets agents do;
- the countries it is live in. A company in several categories gets one labelled row of country pills per category.

Market pills filter the table to companies live in one country, and the label counts the matches ("Companies · 19 of 94"). The table grows with the page: it shows the first 10 rows and a "Show all N companies" button.

## Sub-features

- `companies-all` shows every company under "All countries", and the label reads "Companies · N of N".
- `companies-filter` keeps only the companies live in the chosen market, in any category. It updates the label and `aria-pressed`.
- `companies-more` shows the first 10 matching rows, then all of them with "Show all N companies" (`[data-companies-more] button`). "Show fewer" goes back to 10 and scrolls to the table.
- `companies-logos` loads each logo. A logo that is missing or fails becomes a monogram `.logo.mono`.
- `companies-live-in` marks the live countries in the last column (`.markets i.on`). It shows one `.mk-row` per category, labelled with `.mk-cat` when there are several.
- `companies-homepage` links the name to the company's own site (`homepage`), not to the source article.

## How to get to it (user POV)

- Use "Companies" in the site nav, the console tab "4 Companies", or press `4`.
- Scroll to "Who makes it possible."

## Driving it with observatory.mjs

Preconditions:

- `node $H doctor` prints `healthy`.

Steps:

- **All countries.**
  - Run `node $H open /companies.html`, then `node $H shot companies-1440-all --at '#companies'`.
  - `node $H eval "[document.querySelector('[data-companies-label]').innerText, document.querySelectorAll('[data-companies] tbody tr').length, document.querySelector('[data-companies-more]').innerText]"` prints `COMPANIES · N OF N` (the label is upper case on screen), `10` and `Show all N companies`.
- **Show all.**
  - Run `node $H click '[data-companies-more] button'`. The row count is N.
  - Run `node $H click '[data-companies-more] button'` again. The row count is 10, and the button reads "Show all N companies".
- **Filter.**
  - Run `node $H click '[data-company-filters] [data-market="MX"]'`.
  - Then run `node $H eval "({ label: document.querySelector('[data-companies-label]').innerText, rows: document.querySelectorAll('[data-companies] tbody tr').length, pressed: document.querySelector('[data-market=\"MX\"]').getAttribute('aria-pressed') })"`. It shows a label with fewer than N matches, at most 10 rows and `pressed: "true"`.
  - Take `node $H shot companies-1440-mx`.
- **From the home page.** Run `node $H open '/#country=CL'`, then `node $H eval "document.querySelector('.who-more').getAttribute('href')"`. It prints `companies.html#market=CL`. Run `node $H open '/companies.html#market=CL'`: the CL filter is pressed and the label counts the same number as the home page sentence "N companies make agents work here".
- **Live in per category.** Run `node $H eval "[...document.querySelectorAll('[data-companies] tbody tr')].find(tr => tr.querySelectorAll('.mk-row').length > 1)?.querySelector('.markets').innerText"`. It lists the category labels, each followed by its own country pills.
- **Homepage link.** Run `node $H eval "[...document.querySelectorAll('[data-companies] .co-name')].find(a => a.innerText.trim() === 'Anthropic')?.href"`. It prints `https://www.anthropic.com/`.
- **Logos.**
  - Run `node $H click '[data-companies-more] button'` to show every row.
  - Then load the lazy logos with a reader's scroll: `node $H eval "(async () => { const t = document.querySelector('#companies'); for (let y = t.offsetTop; y < t.offsetTop + t.offsetHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } await new Promise(r => setTimeout(r, 1500)); return { broken: [...document.querySelectorAll('#companies img')].filter(i => i.complete && !i.naturalWidth).length, monograms: document.querySelectorAll('#companies .logo.mono').length }; })()"`.
  - `broken` is 0. Monograms are the intended fallback.
- **Phone.**
  - Run `node $H open /companies.html --width 400` and `node $H shot companies-400 --at '#companies'`.
  - Rows become cards, there is no inner scroll box, and `scrollWidth` is 400.
- **Proof.** Finish with `node $H errors`. A `resource` entry for a logo is fine; script errors are not.

## Gotchas

- There is no inner scroll box any more: the table scrolls with the page, and its header sticks below the nav. Rows past the first 10 are not in the DOM until "Show all" is pressed.
- Logos load from third-party sites. A slow or blocked logo becomes a monogram on its own. Do not report a monogram as broken.
- The filter goes by a company's markets in any category, so a company can match MX through one category only. Its Live in rows then show MX lit in that category and not in the others.
- The scroll loop above is a reader's scroll to load lazy images, not a state change. It does not replace driving a feature.
- Open source (`#opensource`) works the same way, with `[data-repos-more]` and "Show all N repos".
