# Capability matrix and cell detail

The matrix, "Every task in every country", is a `<details id="matrix">` that starts closed. Open, it shows 29 capabilities in rows, grouped by category, and one column per country in `data/meta.json` (24 today). The column count comes from the data: `renderMatrix()` sets `--n` on `[data-matrix]`. Each cell shows its status as a mark you can read without the legend: a filled dot (Live), a half-filled dot (Limited), a ring (Announced) or a dash (Not yet). A small sunrise "?" after the mark means unsure (low confidence). The legend sits above the matrix (`.mx-legend`). Hovering a cell shows a tooltip. Clicking it opens a dialog with the yes-or-no question, the status, the note, the dated sources and a "Suggest a correction" link to a prefilled GitHub issue form.

## Sub-features

- `matrix-grid` renders 29 capability rows × 24 country columns (696 checks, the count in `[data-mx-count]`), with the selected country's column highlighted.
- `matrix-legend` explains the marks, above the matrix.
- `matrix-scroll` (below about 1000px; 24 columns of 34px need 816px beside a 200px name column, and phones use 26px columns beside 116px): when the countries do not fit beside the names, `[data-matrix]` scrolls sideways inside itself under a sticky name column, and `showSelectedColumn()` scrolls the selected country's column to the middle when the matrix renders and when it opens. The page itself does not scroll sideways.
- `cell-companies` (`.d-facts`) also names "Sign up with: …" (live cell) or "Active here: …" (limited or announced) on the For businesses view.
- `matrix-tooltip` shows the country, status and note on hover (mouse only).
- `cell-detail` opens the dialog for one cell: the kicker (category · country), `#detail-title` (the question), the status chip, the note and the sources.
- `cell-low-confidence` adds the "Unsure…" note in the dialog for cells marked with "?".
- `cell-errand` (`.d-facts`) says which errand and step of the current view uses the capability, and lists the other countries where it is live.
- `cell-correction` links "Suggest a correction" ("Seen it work here? Tell us" on a cell that is not live) to `issues/new?template=data-correction.yml` with the country, capability and current status filled in.
- `cell-close` closes the dialog with Escape or the × button.
- `country-sources` lists every source behind the selected country, from the "N sources" button.
- `cell-could-close` adds "Could close the gap: …" (`.detail-close`) to a cell that is not live when companies already live in the same region could bring it.

## How to get to it (user POV)

- Open "Every task in every country" under the country's cards (`node $H click '#matrix summary'`).
- Click any cell mark.
- Click a step of an errand in the country view.
- Click the "N sources" button in the country view.

## Driving it with observatory.mjs

Preconditions:

- `node $H doctor` prints `healthy`.
- Chile's "Buy inside an AI assistant" cell (`commerce.in-chat-checkout`, `CL`) is Limited and unsure in the data under test. Check with `node $H eval "document.querySelector('#matrix button[data-cap=\"commerce.in-chat-checkout\"][data-code=\"CL\"]').getAttribute('aria-label')"`. If the data changed, pick any cell and adjust the expected status.

- **Grid.** Run `node $H open '/#country=CL'`, then `node $H click '#matrix summary'` (the matrix starts closed, and a click needs a laid-out target). Then `node $H eval "[document.querySelectorAll('#matrix button[data-cap]').length, document.querySelectorAll('#matrix .mx-head .sel').length, document.querySelector('[data-mx-count]').textContent]"` prints `[696, 1, "696 checks"]`.
- **Open a cell.** Run `node $H click '#matrix button[data-cap="commerce.in-chat-checkout"][data-code="CL"]'`. The output names the target `Buy inside an AI assistant in Chile: <status>, unsure`.
- **Dialog state.** Run `node $H eval "(() => { const d = document.querySelector('dialog[data-detail]'); return { open: d.open, title: d.querySelector('#detail-title').innerText, status: d.querySelector('.detail-status').innerText, sources: d.querySelectorAll('.sources a').length, correction: d.querySelector('.suggest a').href }; })()"`. It shows `open: true`, the question "Can an AI assistant buy from a merchant…", "Limited" with the low-confidence note, at least one source, and a correction URL. That URL contains `template=data-correction.yml`, `country=Chile+%28CL%29`, `capability=Buy+inside+an+AI+assistant+%28commerce.in-chat-checkout%29` and `current=Limited`. The link text is "Seen it work here? Tell us", because the cell is not live.
- **Proof shot.** Run `node $H shot matrix-1440-dialog-open`. The dialog is centred, with the page dimmed behind it.
- **Close.** Run `node $H press Escape`. Then `node $H eval "document.querySelector('dialog[data-detail]').open"` prints `false`.
- **Country sources.** Run `node $H click '[data-sources]'`. The dialog title reads "N sources, newest first", where N equals the number on the button. Close it with `node $H press Escape`.
- **Phone matrix.** Run `node $H open '/#country=NG' --width 400` and `node $H click '#matrix summary'`. Then `node $H eval "(() => { const m = document.querySelector('[data-matrix]'), r = m.getBoundingClientRect(), s = m.querySelector('.mx-head .sel').getBoundingClientRect(); return { scrolls: m.scrollWidth > m.clientWidth, scrollLeft: m.scrollLeft, selInView: s.left >= r.left + 116 && s.right <= r.right + 1, doc: document.documentElement.scrollWidth }; })()"` shows `scrolls: true`, a `scrollLeft` above 0, `selInView: true` and `doc: 400`. Take `node $H shot matrix-400-scrolled-ng --at '#matrix'`: the names stay pinned on the left and the NG column is in view.
- **Phone dialog.** Repeat "Open a cell" after `node $H open '/#country=CL' --width 400` and `node $H click '#matrix summary'`, then take `node $H shot matrix-400-dialog-open`. The dialog fits the 400px width, and `document.documentElement.scrollWidth` is 400.
- **Proof.** Finish with `node $H errors` (exit 0).

## Gotchas

- Do not click the source links or the correction link: they leave the site (GitHub, publishers). Assert their `href`.
- The tooltip `[data-tip]` follows the mouse. After a `click`, the mouse stays over the cell, so a tooltip can show in later shots. Close the dialog and move on, or ignore it in the review.
- A cell with no sources says "No availability found. Nothing to cite yet." That is expected for Not yet cells without evidence.
- `j` and `k` are ignored while the dialog is open. (There are no other page keys.)
