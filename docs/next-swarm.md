# Next swarm: harden the data, add CI and corrections

Run this file with `/swarm @docs/next-swarm.md`. Each slice below is written so it can be pasted as a stand-alone worker brief. Pass the "Repo facts" section to every worker.

## Repo facts

- **What it is.** A static site at `/Users/ramons/dev/repositories/agents-index` that shows what AI agents can actually do in each country. There is no build step and no dependencies.
- **Commands.**
  - `npm test`: scoring and validation tests.
  - `npm run validate`: must print "Dataset OK".
  - `npm run check-links`: fails on 404 or 410; 403s are fine.
  - `npm start`: serves the site on http://localhost:8080.
- **Data files.** `data/meta.json` lists the countries, the categories and `asOf`. There is one file per category, `data/<category>.json`, with `capabilities[].countries.<ISO>` cells and a `companies[]` list.
- **Cells.** Each cell is `{ status, note, evidence[], confidence? }`. The status is `live`, `limited`, `announced` or `none`.
- **Evidence.** A `live`, `limited` or `announced` cell needs at least one evidence item `{ title, publisher, url, date "YYYY-MM-DD" or "YYYY-MM", type }`. The type is `company`, `report`, `paper`, `regulation` or `news`.
- **Low confidence.** `"confidence": "low"` marks thin sources. Remove it only when a primary source confirms the cell.
- **Status rules.** Take the best status across all products, and name the products in the note. When unsure, use the lower status. Never invent URLs.
- **Scoring.** It lives in `src/observatory.js`, and `docs/methodology.md` explains it. Leave the scoring unchanged.
- **UI.** Check UI changes at 1440px and 400px, in light and dark mode, with no sideways page scroll. Colors come from the tokens at the top of `styles.css`.

## Goal and done predicate

The work is done when all of the following hold:

1. Every cell listed under "Low-confidence cells" has been re-checked. Each one is confirmed with a primary source and its `confidence` flag removed, or its status corrected, or it keeps the flag with a note saying what was searched.
2. In each category file, news citations are replaced with primary sources wherever one exists.
3. CI runs `npm test` and `npm run validate` on every PR, and runs `npm run check-links` weekly.
4. Every cell in the site's detail dialog has a "Suggest a correction" link.
5. `npm test`, `npm run validate` and `npm run check-links` (0 dead) all pass, `asOf` in `data/meta.json` is today, and the site has been checked at 1440px and 400px in light and dark mode.
6. Each slice ships as its own small PR.

## Hard limits from the last run

- **Web search budget.** WebSearch has a shared budget of about 200 calls per session, across all workers. Last time 7 workers burned it in about 9 minutes, and the gap-fill round got 3 searches each. Give every research worker a budget of **25 searches**. Tell each worker to use WebFetch on known primary pages first, and to search only when it has no URL.
- **Blocked sources.** Do not use reader proxies such as `r.jina.ai`. help.openai.com, openai.com, mastercard.com and npci.org.in return 403 to scripts. Cite them only if a search result shows the page.
- **One file per worker.** Each data file is owned by exactly one worker, so no two workers ever edit the same file.

## Branching

Start from the newest branch: the stack is #1 → #2 → #3 → #4. If the PRs are merged, start from `main` instead. Code workers use `isolation: "worktree"` and their own branch. Research workers edit their file in their own worktree too, so every slice becomes its own PR.

## Research slices (6 workers, one data file each)

Every research worker gets these rules:

> You re-check cells in `data/<file>.json` of the AI Agent Observatory (data rules are in "Repo facts" above). Today's date is in the session, and your built-in knowledge is out of date, so verify every claim online. Budget: 25 WebSearch calls. Prefer WebFetch on company help centers, regulator pages and official press rooms. For each listed cell, do one of three things: confirm it with a primary source and delete `"confidence"`; correct its status and update the note; or keep the flag and add to the note what you searched. Then, as budget allows, replace `type: "news"` evidence in your file with primary sources. Keep the JSON shape exactly. Run `npm run validate` before you finish. Report PASS, ISSUES or BLOCKED, every cell you changed (old status → new status), and the searches you used.

### 1. `commerce.json`: local marketplaces

The cells: `commerce.in-chat-checkout` in BR, MX, CL, CO and IN, and `commerce.marketplace-agent` in BR, MX, CL, CO and IN. Last time, nobody checked these local players:

- BR: Magazine Luiza (its "Lu" assistant selling in WhatsApp), Mercado Livre's AI assistant, Amazon Brasil Rufus, Casas Bahia and iFood Mercado.
- MX: Mercado Libre, Walmart de México, Amazon México Rufus and Liverpool.
- CL: Falabella, Cencosud/Jumbo, Ripley and Lider.
- CO: Rappi, Éxito and Falabella.
- IN: primary sources for Flipkart's agentic checkout and for Razorpay or ChatGPT checkout pilots.

### 2. `services.json`: delivery and bookings

The cells:

- `services.delivery-rides` in GB, DE, MX and CL: check Deliveroo, Lieferando, Wolt, DiDi, Rappi and PedidosYa, plus Alexa+ ordering.
- `services.restaurant-booking` in DE and MX: does OpenTable or TheFork inside ChatGPT actually cover local restaurants?
- `services.travel-booking` in BR, CL and CO: Booking.com's ChatGPT app ("global"), and Despegar or LATAM agents.

### 3. `banking.json`: bank assistants that move money

The cells: `banking.bank-agent-actions` in GB, DE, IN, CL and CO.

- GB: Zopa rollout status, the Lloyds assistant launch, Monzo, Starling and NatWest.
- DE: N26, Deutsche Bank and ING.
- IN: HDFC, ICICI, SBI YONO, Axis and Indian Bank AI-TARA.
- CL: BancoEstado, Banco de Chile, BCI and Santander, plus whether Itaú's feature is open to all customers.
- CO: Bancolombia, Nequi, Davivienda and Daviplata.

### 4. `payments.json`: rails

The cells:

- `payments.instant-rail-agent` in GB, MX, CL and CO: does Mercado Pago's Mago transfer over SPEI or TEF? Check Bre-B agents, and UK Faster Payments or VRP agents.
- `payments.card-agent-token` in US and CO: Mastercard's "all US cardholders" completion, and Colombian pilots.
- `payments.wallet-agent` in CO.

### 5. `messaging.json` and `autonomy.json`

The cells:

- `messaging.business-ai-agent` in GB, CL and CO: is there a Meta country exclusion list?
- `autonomy.browser-agent` in DE: a primary OpenAI source for ChatGPT agent in the EEA.
- `autonomy.personal-assistant-actions` in CL and CO.

### 6. `government.json`

The cells:

- `government.digital-id-api` in GB, MX and CO: the UK wallet sandbox, INE's verification service and Llave MX, and Colombia's Cédula Digital API.
- `government.ai-public-services` in US and IN.

Also add reports to the research lens. Only 30 of 368 citations are reports or regulation, and none are papers. Where relevant, add World Bank ID4D, OECD, BIS, IDB or UN E-Government Survey sources.

## Code slices (2 workers, no web search needed)

### 7. CI workflow

Add `.github/workflows/ci.yml`. On every pull request and on pushes to main, run `npm test` and `npm run validate` on Node 22. Run a weekly scheduled job with `npm run check-links`. There are no dependencies to install. Open a small PR.

### 8. "Suggest a correction" link

In `app.js` `openDetail()`, add a link under the sources. It opens `https://github.com/rasabaq/agents-index/issues/new`, with `title` and `body` prefilled with the capability id, the country, the current status and an empty "Correct status and source:" line, all URL-encoded. Style it to match `.sources` in `styles.css`. Check it at 1440px and 400px in light and dark mode, with no console errors. Open a small PR.

## Aggregate and report

1. Read every worker report. Before trusting a status change, open its new evidence URL yourself and confirm it.
2. After the research PRs land on one branch, run `npm run validate`, `npm test` and `npm run check-links`, then bump `asOf`.
3. Report a table with one row per slice, its PR link, the cells changed, the low-confidence count before and after (it was 44 of 144), the news-citation count before and after (it was 142 of 368), and any gaps.

## Not for the swarm: decisions waiting on the owner

Do not do these without the owner:

- Making the repo public, or GitHub Pages or a domain.
- Category weights.
- Which countries to add.
- Adoption data as a second score.
- Running `/create-verification-skill`, which only the owner can start.
