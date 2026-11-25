# Data swarm report, 2026-11-25

Ten Haiku research workers rechecked all 12 category files in `data/`. Each worker owned one file, or two small ones, and worked in its own git worktree. The lead session opened the page behind every status change and every removed low-confidence flag before keeping it. `asOf` moves from 2026-11-06 to 2026-11-25.

## Results by category

"Before" is `main` at the start of the run. "Cells changed" counts every cell that differs from `main`: the still-valid rechecks from PR #172 plus the swarm's own work. A cell that both touched is counted once.

| Category | Cells changed | Low confidence, before → after | News citations, before → after |
| --- | --- | --- | --- |
| Shopping & checkout (`commerce.json`) | 39 (10 from #172, 32 from the swarm) | 30 → 28 | 48 → 42 |
| Agent payments (`payments.json`) | 29 (17 from #172, 19 from the swarm) | 36 → 29 | 50 → 42 |
| Travel & local services (`services.json`) | 34 (11 from #172, 30 from the swarm) | 29 → 28 | 43 → 39 |
| General-purpose agents (`autonomy.json`) | 54 (13 from #172, 47 from the swarm) | 16 → 0 | 6 → 0 |
| Banking & open finance (`banking.json`) | 22 (12 from #172, 13 from the swarm) | 26 → 24 | 44 → 34 |
| Chat & messaging (`messaging.json`) | 22 (8 from #172, 17 from the swarm) | 25 → 25 | 19 → 16 |
| Government & identity (`government.json`) | 24 (8 from #172, 19 from the swarm) | 18 → 15 | 24 → 17 |
| Access to the assistants (`access.json`) | 18 (0 from #172, 18 from the swarm) | 13 → 0 | 5 → 3 |
| Rules for agents (`rules.json`) | 23 (8 from #172, 21 from the swarm) | 22 → 21 | 17 → 13 |
| Health (`health.json`) | 27 (24 from #172, 6 from the swarm) | 53 → 50 | 27 → 25 |
| Work & jobs (`work.json`) | 16 (12 from #172, 8 from the swarm) | 39 → 36 | 16 → 14 |
| Insurance (`insurance.json`) | 19 (16 from #172, 7 from the swarm) | 34 → 34 | 34 → 33 |
| **All** | **327 of 696** | **341 → 290** | **333 → 278** |

`npm test` (55 pass), `npm run validate` ("Dataset OK") and `npm run check-links` (962 links, 0 dead) pass.

## Status changes

Each change below was checked on its source page.

| Cell | Change | Source that backs it |
| --- | --- | --- |
| `commerce.in-chat-checkout` KE, ZA | Not yet → Announced | Paystack Index: "Ghana, Kenya, and South Africa are coming soon" |
| `commerce.marketplace-agent` NG | Limited → Not yet | The row asks about a marketplace's own agent. Paystack Index is a third-party route, and it stays in the in-chat row. |
| `payments.instant-rail-agent` CO, `payments.wallet-agent` CO | Limited → Live | Tpaga's agent page: its WhatsApp agent sends money to any bank over Bre-B |
| `payments.instant-rail-agent` CA | Limited → Not yet | Payments Canada's Real-Time Rail is live, and no agent uses it. Interac e-Transfer is not that rail. |
| `payments.wallet-agent` NL | Not yet → Limited | Stripe's shared payment tokens list the Netherlands, in preview |
| `services.delivery-rides` CA | Announced → Limited | Instacart's Clementine is live in Canada, but it builds a cart and does not place the order |
| `services.delivery-rides` CO | Announced → Limited | Rappi's Colombia CEO: "Está funcionando en una versión beta" |
| `autonomy.personal-assistant-actions` SG, IT, NL, SA, AR (Limited) and AE, ZA, KE (Not yet) | → Live | Google's connected-apps table: Phone, Messages and WhatsApp work in "all countries and territories where the Gemini mobile app is supported" |
| `messaging.business-ai-agent` GB, CA, JP, AU, AE, SA, ZA, KE, AR | Live → Limited | WhatsApp's product page: "Available to eligible businesses in select markets". No source names these countries. |
| `messaging.pay-in-chat` KR | Not yet → Announced | Kakao's CEO announced an in-chat agent with payment for late 2026 (news, low confidence) |
| `government.digital-id-api` IT | Limited → Live | AgID: "Anche gli enti privati possono abilitare l'accesso con SPID" |
| `work.job-apply` AE | Limited → Live | LoopCV's help page now names the UAE |
| `insurance.buy-policy` AE | Live → Limited | Shory's release says its agent "can assist" with the purchase, not that the sale closes in the chat |

## Worker changes the lead dropped or changed

| Cell | Worker's change | What the lead kept, and why |
| --- | --- | --- |
| `health.coverage-check` IN, FR, AR | Limited → Not yet | Kept Limited. There was no new source, and a page that does not mention a feature does not show it was removed. The ICICI Lombard and Alan company rows stay too. |
| `banking.bank-agent-actions` FR | Limited → Not yet | Kept Limited, assist-only. Hello bank's release (seen in search; the page blocks scripts) says HelloïZ will carry out transfers in the chat by the end of 2026. Sumeria's SIA already prepares a transfer for you to confirm. |
| `insurance.file-claim` AU | Announced → Not yet | Kept Announced. IAG announced its Presence claim-call plan with a target date, which is what Announced means. |
| `services.delivery-rides` CA | Announced → Live | Changed to Limited, assist-only, to match Woolworths' Olive in Australia. |
| `messaging.business-ai-agent`, 9 cells | Gap reason "pilot only" | Changed to "not fully launched here yet". "Select markets" is not a pilot. |

## Taken from PR #172

PR #172 never merged, and `main` still held the old version of every cell it changed. This run takes its 139 cell changes and two company fixes (HUBSEGS' role, Woolworths' URL). It leaves out the 8 `work.hr-payroll` cells it also touched, because #212 rechecked them later.

## Leads from Session A, checked and applied

From `docs/research/2026-11-25-impact-data.md`:

- Tasks in Gemini is free in the US, Japan, Korea, Canada, Australia and India from 17 November 2026 (Google blog and Gemini Help). Added to those `autonomy.personal-assistant-actions` cells.
- Visa Agentic Ready with Moneris for Canada (Visa, 18 November 2026). The payments worker had already added it to `payments.card-agent-token` CA.
- MAS AI risk guidelines from 7 October 2027. Added to `rules.ai-law` SG, which stays Not yet, and its low flag is removed.
- The FCA speech on "a trusted framework for agentic finance". Added to `rules.ai-law` GB, which stays Not yet.

## The hero's agent log

Every line in `src/crew.js` still points at a real cell and names a product in its note. One line needs a code change, which this data PR does not make: "book a table · JP · Alexa+" now shows Limited. The cell is Limited because of LINE AI予約, not Alexa+. Amazon still lists Alexa+ table booking in Japan as planned. Swap the line's product to LINE AI予約 (with a logo), or point it at another cell.

## Gaps left

- **Low-confidence cells.** 290 remain, mostly Not yet cells in the newer countries. Health (50), work (36), insurance (34) and payments (29) have the most.
- **Alexa+ shopping.** Several commerce notes (GB, DE, FR, MX, JP, BR, IT) say Alexa+ orders from Amazon. Amazon's country page gives dates but does not say ordering works in each country. Only Spain and Australia have their own page.
- **Meta Business Agent.** Meta publishes no country list. The Live cells for US, DE, ES, FR, BR, MX, CL, CO, IN, NG and ID rest on partner or regional sources.
- **Sites that block scripts.** Some pages could not be read: openai.com (US checkout move, ChatGPT Wallet), doctolib.fr and doctolib.de, Mercado Pago Chile and Mexico, naukri.com, aviva.co.uk, Llave MX, Colombia's Registraduría, Sun Life and TheFork's press page. A person needs to check these.
- **Leads not yet in the data.**
  - Naukri Neo auto-apply for paid users in India (`work.job-apply` IN).
  - SEEK and Jora background applications in Australia.
  - Aviva and Ageas/Esure car quotes inside ChatGPT in the UK (`insurance.buy-policy` GB).
  - Wizehire's Jobs app in ChatGPT (US).
- **Gemini Calendar.** Many personal-assistant notes say Gemini adds calendar events. Google's connected-apps table lists Calendar only for device apps.
- **EU AI Act.** The grace period for generative AI already on the market ends on 2026-12-02. Recheck the EU `rules.ai-law` cells after that date.

## How the run worked

- 10 workers: commerce, payments, services, autonomy, banking, messaging, government, health, work and insurance, access and rules.
- Search budget: 18 WebSearch calls each. They used 141, and the lead used 1. Most checks were WebFetch on company and regulator pages.
- Checking: for every status change and every removed flag, the lead fetched the new evidence URL and looked for the quoted sentence. Pages that block scripts were checked through search results or left out.
