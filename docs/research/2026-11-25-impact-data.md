# Data that would make the Agent Index more useful and more talked about

Research note, 2026-11-25. Data as of 2026-11-06.

A visual version with a preview of each idea, in the site's own style: [Agent Index Impact Data](https://claude.ai/artifact/NjfWuVkuA7QWRrusgR4s1T) (private until shared).

## Summary

- Almost nobody finds the site yet. About 8 real visits a day load the full site, nearly all to the home page, all direct. We saw no visits from search engines or AI assistants.
- The ten newest countries are thin: 21 to 27 of their 29 cells are marked unsure.
- The best new data is **how many people use AI in each country**. Two primary sources cover all 24 countries. It shows a story the index cannot tell alone: Brazil and India rank 2nd and 3rd for what agents can do, but only about 1 in 5 people there use AI. The UAE is 1st for use (73%) and 13th for agents.
- Built on this branch: idea 1 (who uses AI here, on the countries page) and idea 2 (`llms.txt`). The rest are plans below.

## 1. What people use: traffic

Source: Cloudflare GraphQL Analytics for agentindex.art, 2026-10-26 to 2026-11-25.

| Measure | What we saw |
| --- | --- |
| Edge visitors | 56 to 126 unique visitors a day (`httpRequests1dGroups`). Many are scanners asking for `/.env`, `/wp-login.php` and similar paths. |
| Real site loads | Each data file was fetched about 65 times in 8 days (`httpRequestsAdaptiveGroups`, 2026-11-17 to 2026-11-25). That is about 8 full loads a day. |
| Pages | Web Analytics (real browsers): about 340 page views in 30 days, 97% on `/`. At the edge in 8 days: `/countries.html` 13 hits, `/companies.html` 22. |
| Countries | Web Analytics: US and Chile, a few from Taiwan. Edge (all traffic): US, NL, CL, BE, PL, DE. |
| Referrers | Web Analytics: none, or agentindex.art itself. No search engine, social site or AI assistant. The edge `clientRefererHost` field is not on the Free plan. |
| Devices | About 75% desktop, 25% mobile. |
| Missing | `/llms.txt` and `/sitemap.xml` answer 404. The countries page keeps the country in a `#hash`, so search engines see one page for all 24 countries. |

What it means: the home page is the product. Fresh data only matters if it reaches people, so each idea is judged on whether it gives people a reason to share or cite the index.

## 2. Gaps in the data

From `data/*.json` on 2026-11-25 (before the refresh another session is running).

- **Unsure cells by country.** The ten newest countries carry most of the `"confidence": "low"` flags: KR 24, SG 24, ID 24, IT 24, NL 21, AE 22, SA 26, ZA 25, KE 27, AR 22 (out of 29). The first 14 countries have 1 to 12.
- **Unsure cells by check.** Health, work and insurance are the thinnest: 16 to 21 unsure cells per check. `health.prescription-refill` is Not yet in 23 countries.
- **Checks that no longer tell countries apart.** `access.assistant-available`, `access.local-language`, `autonomy.browser-agent` and `messaging.business-ai-agent` are live in all 24.
- **Old sources.** The median source date is before 2026-06 for `payments.card-agent-token`, `banking.bank-agent-actions`, `rules.ai-law` and `rules.agent-purchase-protection` (2024-02).
- **Gap reasons.** 39 cells that are not live have no `gapReason`.
- **Use.** The index measures what is available, never how many people use it (methodology, "Known limits").
- Open issues: none. Open PRs: the November data refresh (#172) and older mobile and security PRs (#115 to #124).

## 3. Outside data

Primary sources first. "Opened" means the page was fetched during this research.

### How many people use AI (used in idea 1)

| Source | What it gives | Date | Link |
| --- | --- | --- | --- |
| Microsoft AI Economy Institute, Global AI Diffusion Q2 2026 | Share of people aged 15 to 64 who used a generative AI product, Q1 and Q2 2026, for 147 economies, all 24 of ours included | 2026-09 | [report PDF](https://www.microsoft.com/en-us/research/wp-content/uploads/2026/09/Microsoft-AI-Diffusion-Report-2026-Q2.pdf), [blog post](https://blogs.microsoft.com/on-the-issues/2026/09/21/the-continued-state-of-global-ai-diffusion-in-2026/) (opened) |
| Anthropic Economic Index | Claude use per person by country (`usage_per_capita_index`), April and May 2026 | 2026-06-26 | [dataset](https://huggingface.co/datasets/Anthropic/EconomicIndex/tree/main/release_2026_06_26) (opened, CSV read) |

What the numbers show, across our 24 countries:

- Agent score and share of people who use AI move together only weakly (Pearson r = 0.2).
- **Agents ahead of the people** (6 or more places apart): US (1st for agents, 10th for use), Brazil (2nd, 20th), India (3rd, 21st), Mexico (9th, 19th), Nigeria (11th, 23rd).
- **People ahead of the agents**: UAE (13th for agents, 1st for use), Singapore (18th, 2nd), Netherlands (17th, 6th), South Korea (16th, 8th), Saudi Arabia (22nd, 12th).

We also checked Claude's "automation" share by country. It only ranges from 44% to 55%, so it does not tell countries apart, and we left it out.

### New launches and rules since 2026-11-06

| Fact | Countries | Cell it touches | Source | Date |
| --- | --- | --- | --- | --- |
| Tasks in Gemini (calls, bookings, shopping and Google Pay checkout with a spending cap) is free in 6 countries. Elsewhere it needs AI Pro or Ultra, and it is not offered in the EEA, NG, CH or GB. | US JP KR CA AU IN | `autonomy.personal-assistant-actions` | [Google blog](https://blog.google/innovation-and-ai/products/gemini-app/tasks-in-gemini-free-new-features/) (opened), [Gemini Help](https://support.google.com/gemini/answer/17094507?hl=en-BG) (opened) | 2026-11-17 |
| Gemini in Chrome auto browse is "only available in India and the US". Google's AI calling to check prices is US only. | IN US | `autonomy.browser-agent`, `autonomy.calls-for-you` | [Google One Help](https://support.google.com/googleone/answer/16286513?hl=en) (opened) | undated |
| Google Pay agentic checkout: "US and Australia, in English". The page's troubleshooting part still says US only. | US AU | `commerce.in-chat-checkout` (AU already live with this) | [Google Pay Help](https://support.google.com/googlepay/answer/16421147?hl=en) (opened) | undated |
| ChatGPT Wallet: OpenAI's agents check out with a saved, tokenized card. Limited rollout to US Pro users. | US | `payments.card-agent-token` | [TechCrunch](https://techcrunch.com/?p=3188368) (news, opened). The OpenAI page was not opened. | 2026-11-13 |
| Alexa+ Early Access in Japan since 2026-10-29. Amazon's page lists every Alexa+ country and start date. | JP and 11 others | already in `access` and `autonomy` notes | [Amazon](https://aboutamazon.com/news/devices/alexa-plus-international-launch) (opened) | 2026-10-28 |
| Visa opened Agentic Ready to merchants and acquirers: 140+ participants, including Moneris (Canada), Adyen, Stripe, PayPal, dLocal. 175+ issuers in 45 markets. No volume given. | global, CA | `payments.card-agent-token` | [Visa](https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.22986.html) (opened) | 2026-11-17 |
| Visa benchmark: 22 AI models failed 42.8% of shopping runs; about 54% of failed runs still ended in a purchase. Only 23% of US consumers trust AI to pay for them. | US | none (context) | [Visa](https://investor.visa.com/news/news-details/2026/Visa-Releases-First-of-Its-Kind-Industry-Benchmark-for-AI-Shopping-Almost-Half-of-Test-Runs-Fail/default.aspx) (opened) | 2026-11-05 |
| The FCA is building "a trusted framework for agentic finance". No agent rules yet. | GB | `rules.ai-law` (stays Not yet) | [FCA speech](https://www.fca.org.uk/news/speeches/building-future-finance-age-ai) (opened) | 2026-10-19 |
| MAS final AI risk guidelines cover agentic AI at financial firms, in force from 2027-10-07. | SG | `rules.ai-law` (stays Not yet) | [MAS](https://www.mas.gov.sg/news/media-releases/2026/mas-sets-out-supervisory-expectations-on-responsible-ai-adoption-by-financial-institutions) (opened) | 2026-10-07 |
| Anthropic opened a Singapore office and signed an MOU with MDDI. | SG | none (context) | [Anthropic](https://www.anthropic.com/news/singapore-office-opening) (opened) | 2026-10-14 |

Not confirmed, so not used: an NPCI "Unified Agent Protocol" for UPI (news only, NPCI declined to comment), and Google UCP checkout in Canada on 2026-11-05 (one weak blog, no Google source). Nothing new was found in the window for Copilot Actions, Claude in Chrome, Korea's AI Basic Act, Japan, Brazil, RBI or US states. ChatGPT Instant Checkout's shutdown is already in the US note.

Agentic payment volumes: no company published one in the window. Visa and PayPal gave counts of partners, not money.

## 4. Ideas, ranked

Ranked by impact for the effort. Impact and effort are high, medium or low.

| # | Idea | Impact | Effort | State | Files |
| --- | --- | --- | --- | --- | --- |
| 1 | Who uses AI here: a second number per country, beside the score | High | Low | **Built** | `data/adoption.json`, `src/adoption.js`, `countries.js`, `countries.css`, `scripts/validate.mjs`, `scripts/check-links.mjs`, `test/adoption.test.mjs`, docs |
| 2 | `llms.txt`, so AI assistants can find and cite the data | Medium | Low | **Built** | `llms.txt`, `test/llms.test.mjs`, `README.md`, `.assetsignore` comment |
| 3 | Fresh leads for the data refresh | High | Medium | Plan (needs data edits) | `data/autonomy.json`, `data/payments.json`, `data/rules.json` |
| 4 | Agents vs people: one chart of all 24 countries | High | Medium | **Built** (countries page, in Who uses AI here) | `countries.js`, `countries.css` |
| 5 | What changed: a feed of status moves from git history | High | Medium | Plan | `scripts/changes.mjs`, generated `data/changes.json` and `changes.xml`, a section on `index.html` |
| 6 | Which assistant does what, where: a matrix that replaces the saturated Access checks | High | High | Plan (new dataset) | `data/assistants.json`, a check in `src/observatory.js`, a table on `countries.html` |
| 7 | Download every cell as CSV | Medium | Low | **Built** (footer of every page) | `src/csv.js`, `ui.js`, the footer of the three pages |

### Idea 1: Who uses AI here (built)

Each country page now shows, right under the head:

- the share of people aged 15 to 64 who used AI (Microsoft, Q2 2026), and Claude use per person against the world average (Anthropic, May 2026);
- the country's place among the 24 on each, with a track of ticks for every country;
- one sentence that puts the two ranks side by side. With a gap of 6 places or more it says "Here the agents are ahead of the people" or "Here the people are ahead of the agents".

The numbers never change a score. `npm run validate` checks that every tracked country has every number and that each source is no later than `asOf`. To refresh it, see "Use beside the index" in `docs/methodology.md`.

### Idea 2: llms.txt (built)

A plain guide at `/llms.txt`: what the index is, how a cell and the score read, the three pages, and a link to every data file. A test fails when a data file is missing from it or it links a file that does not exist.

### Idea 3: Fresh leads for the data refresh (ready-to-apply plan)

Another session owns the data files during this run, so these are written up, not edited in. Copy each evidence `title` from the page itself when you apply a lead; `<page title>` marks the ones we did not record. All new evidence is dated after `asOf` (2026-11-06), so `asOf` in `data/meta.json` must move to at least 2026-11-17 when they are applied.

1. `autonomy.personal-assistant-actions` / KR: stays `live`, delete `"confidence": "low"`. Add to the note: "Tasks in Gemini, free here since November 2026, makes calls, books and shops for you with a spending cap." Evidence: `{ "title": "<page title>", "publisher": "Google", "url": "https://blog.google/innovation-and-ai/products/gemini-app/tasks-in-gemini-free-new-features/", "date": "2026-11-17", "type": "company" }` and `{ "title": "<page title>", "publisher": "Google Gemini Help", "url": "https://support.google.com/gemini/answer/17094507?hl=en-BG", "date": "2026-11", "type": "company" }`.
2. `autonomy.personal-assistant-actions` / JP, CA, AU, IN: stay `live`. Add the same two sources and name Tasks in Gemini in the note.
3. `payments.card-agent-token` / CA: stays `limited`. Add: "In November 2026 Visa opened Agentic Ready to merchants and acquirers, with Moneris for Canadian merchants." Evidence: `{ "title": "Visa Expands Agentic Ready to Help Scale Trusted AI Commerce Globally", "publisher": "Visa", "url": "https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.22986.html", "date": "2026-11-17", "type": "company" }`.
4. `payments.card-agent-token` / US: stays `live`. Add the Visa source above. Keep `"confidence": "low"` until the OpenAI ChatGPT Wallet page is checked by a person (it blocks scripts); then name ChatGPT Wallet and remove the flag.
5. `rules.ai-law` / SG: stays `none`; delete `"confidence": "low"`. Add: "MAS's final Guidelines on AI Risk Management cover agentic AI at financial firms from 7 October 2027; they are guidance, not a law in force." Evidence: `{ "title": "MAS Sets Out Supervisory Expectations on Responsible AI Adoption by Financial Institutions", "publisher": "Monetary Authority of Singapore", "url": "https://www.mas.gov.sg/news/media-releases/2026/mas-sets-out-supervisory-expectations-on-responsible-ai-adoption-by-financial-institutions", "date": "2026-10-07", "type": "regulation" }`.
6. `rules.ai-law` / GB: stays `none`. Add the FCA speech as evidence: `{ "title": "<page title>", "publisher": "Financial Conduct Authority", "url": "https://www.fca.org.uk/news/speeches/building-future-finance-age-ai", "date": "2026-10-19", "type": "regulation" }`.
7. Watch: the EU AI Act grace period for generative AI already on the market ends on 2026-12-02 (law-firm summaries; no Official Journal source found). Re-check the EU `rules.ai-law` cells after that date.

### Idea 4: Agents vs people chart (built)

Inside "Who uses AI here" on each country page: one dot per country, agent score across and the share of people who use AI up, with the country on show lit. It replaced the tick tracks, so the block got simpler, not busier. It reads `data/adoption.json` and needs no new data. We kept it off the home page, which stays light on purpose.

### Idea 5: What changed (plan)

A script walks the git history of `data/` and lists every status move with its date, cell and note. The last 30 data commits hold 30 moves (13 up, 17 down). Show the latest five on the home page and publish an RSS file, so each refresh becomes news.

### Idea 6: Which assistant does what, where (plan)

Access is live everywhere, so it no longer ranks anyone. A new dataset would hold one row per assistant feature (Alexa+, Tasks in Gemini, Gemini in Chrome auto browse, Claude in Chrome, ChatGPT Wallet, Copilot Actions) and one cell per country, with the same status and evidence rules. Today's notes fill part of it; about 120 cells need a source. Amazon's Alexa+ country page and Google's Tasks help page above cover two rows already.

### Idea 7: CSV download (built)

"Download CSV" in the footer of every page builds one row per country and check from the data the page already loaded: country, category, check, status, unsure, gap reason, note, number of sources, source links and the data date.

## Defaults we chose

- Microsoft's share of people who use AI is the headline use number: it is the only primary source that covers all 24 countries with a plain meaning. Anthropic's Claude use per person is the second, because it is open data and per person.
- The use numbers are context only and never change the score, so the index still measures one thing.
- A gap of 6 places (a quarter of the 24) is the bar for "ahead". Smaller gaps say "the two are close".
- The block sits right under the country head, before "Compared with its region", because it answers the first question after the score.
- No sitemap: the countries live behind a `#hash`, so a sitemap would list three URLs. `llms.txt` gives more for less.
- The site is dark only, so the new block was checked in dark, and with a light system setting it still renders dark as designed.
