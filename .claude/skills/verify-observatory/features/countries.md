# Countries page

`/countries.html` is one fact sheet per country. A rail lists every country, best first, with its rank, flag, name, score, tier letter and a thin score bar. Beside it, the chosen country's profile shows, top to bottom: its region, name and verdict; "Why the rest is not live yet" (how many checks have each gap reason); twelve small pixel icons, one per area, lit by the area score; a fact box (tier, score, rank, ties on their own line, a strip of every check by status, counts per status, unsure count, sources, companies, data date); "Compared with its region" (four themes, each with the areas it groups, and the score for the country, its region neighbours, the leader or the next best, and the average); "What works, and what does not yet" (one card per area, with a row per check); and "Who makes it work here" (companies by area, the ones based here outlined). The country lives in the link as `#country=CL`, the same format as the home page.

## Sub-features

- `countries-start` picks the start country the same way as the home page: the `#country=XX` hash, then the time zone, then the browser language, otherwise the US. With no hash it writes `#country=XX` into the URL without a new history entry. A link to a country we do not track (`#country=ZZ`, by hand or by back and forward) keeps the country on show and writes its code back into the URL.
- `countries-rail` is `[data-rail]`: one link per country, `href="#country=XX"`, `data-code="XX"`, with `aria-current="true"` on the shown one. A click changes the hash, so back and forward step through the countries opened. At 900px and narrower the rail becomes one sticky row of pills (code, score, tier) that scrolls sideways inside itself; the shown country's pill is scrolled to the middle.
- `countries-keys` steps through the ranking with `j` (next) and `k` (previous), like the home page. Each step adds a history entry.
- `countries-head` is `#p-title`, `.p-verdict` (the home page's For people verdict, without its "Main reason": the list under it gives every reason), and the reasons list `.why` (one line per gap reason, plus "No reason recorded yet" when some gaps have none).
- `countries-areas` is `.area-row`: twelve buttons `[data-jump="area-<category>"]`, each a pixel icon lit by the area score (glowing at 100) and its score. A click scrolls to the area card `#area-<category>` and moves focus to its heading. The key above it (`.hero-key`, the same black tape as the hero) reads works, partly, not yet. A focused heading's ring hugs its text.
- `countries-facts` is the fact box `.info`: the tier letter `.info-tier`, `.info-score`, `.info-rank` ("Rank N of 14"; the tier is the big letter), `.info-tie` ("Tied with A and B", only when tied), the `.strip` of every check, the `.counts` per status, and a `dl` with Region, Checks, Unsure (the ? mark, then "N checks"), Sources, Companies and Data ("Nov 4, 2026", the date format of the whole page, the window bar included).
- `countries-region` is `.cmp`: one column for the country (`.me`), one per region neighbour, one for the leader (or "next best" when the country has the top score), and the average of all. Each theme names its areas in small text under it. The table fills the pane, and every number column has the same width for every country. A dot marks the highest in each row. The sentence above it (`.blk-lede`) says where the country sits in its region; a country alone in its region (Australia in Oceania, Nigeria in Africa) gets "the only country we track in …", and the heading reads "Compared with the leader". The themes and the sentence come from `THEMES` and `regionCompare()` in `src/observatory.js`.
- `countries-checks` is one `.area` card per area: the big pixel icon, name, blurb, score and "N of M live", then `.checks button[data-cap][data-code]`, one per check, with its status chip (a ? when unsure), the gap reason tag `.why-tag`, a one-line note and its number of sources ("5 sources"). At 760px and narrower the chip and the source count sit on top, and the name, the tag (on its own line) and the note get the whole row. A row opens the shared cell detail (see matrix-detail.md).
- `countries-companies` is "Who makes it work here": companies live here, grouped by area as logo pills with the HQ flag; `a.home` marks the ones based here. "What each one does →" opens `/companies.html#market=XX`.

## How to get to it (user POV)

- "Countries" in the nav of every page.
- "Full profile →" in the home page's country view (`.cn-score a`).
- A link such as `/countries.html#country=JP`.

## Driving it with observatory.mjs

Preconditions:

- `node $H doctor` prints `healthy`.
- `open` waits for `#p-title` on this page by default.

Steps:

- **Open.** Run `node $H open '/countries.html#country=CL'`. Then `node $H eval "[document.querySelector('#p-title').textContent, document.querySelector('[data-rail] [aria-current=true]').dataset.code, location.hash]"` prints Chile, `CL` and `#country=CL`. Take `node $H shot countries-1440-CL`.
- **Rail and history.** Run `node $H click '[data-rail] a[data-code="NG"]'`, then `node $H eval "history.back()"`. The heading reads Chile again and the rail marks `CL`. `history.forward()` brings Nigeria back. With the detail open, back or forward closes it.
- **Bad link.** Run `node $H eval "location.hash = '#country=ZZ'"`. The heading stays, and `location.hash` reads the shown country again.
- **Keys.** Run `node $H press j`. The hash moves to the next country down the ranking.
- **Area jump.** Run `node $H click '.area-row [data-jump="area-health"]'`. `document.activeElement.id` is `h-health`, and the card sits under the nav (and under the pill row at 400px).
- **Detail.** Run `node $H click '#area-health .checks button'`. The dialog `dialog[data-detail]` is open, `#detail-title` is the capability's question, and `.suggest a` links to the prefilled GitHub form. `node $H press Escape` closes it.
- **Region.** `node $H eval "document.querySelector('.blk-lede').textContent"` on `#country=AU` or `#country=NG` says "the only country we track in …".
- **Phone.** Repeat at `--width 400`. `document.documentElement.scrollWidth` is 400, and `document.querySelector('[data-rail]').scrollLeft` is above 0 for a country low in the ranking (its pill is scrolled into view).
- **Proof.** Finish with `node $H errors` (exit 0).

## Gotchas

- `shot --at` puts the element 70px under the top; at 400px the sticky pill row also covers about 60px, so pass `--offset 130`.
- Company logos load lazily; a full-page shot can show empty tiles for logos below the fold.
- The rail sticks under the nav at 1440px and scrolls inside itself when the window is too short for all countries.
