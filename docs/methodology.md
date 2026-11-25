# Methodology

Most AI indexes measure inputs, such as compute, talent, papers or strategy documents. This observatory measures one output instead: **what an AI agent can actually do for an ordinary person or business in a country today.**

## Unit of measure: a capability

A capability is one concrete action, phrased as a yes-or-no question. For example: "Can an AI agent buy from a merchant without leaving the chat?" Every capability belongs to one category. The categories are listed in `data/meta.json`, so their number can grow (see CONTRIBUTING.md, "Add a category"). Today they are:

| Category | What it covers |
| --- | --- |
| Shopping & checkout | Buying inside AI assistants, marketplace agents, and merchant protocols such as ACP and UCP |
| Agent payments | Card-network agent tokens, instant-payment rails (UPI, Pix), and wallets |
| Travel & local services | Restaurant bookings, travel, food, groceries and rides |
| General-purpose agents | Browser agents, agents that phone businesses, and assistants that act across apps |
| Banking & open finance | Regulated account access and payment initiation, and bank AI that moves money |
| Chat & messaging | Business AI agents in chat apps, and paying inside a chat |
| Government & identity | Digital ID that apps can plug into, and government AI assistants |
| Access to the assistants | Whether you can sign up for the big AI assistants, and use their agent features in your own language |
| Rules for agents | A law in force that covers AI agents, and getting your money back when an agent buys the wrong thing |
| Health | Booking a doctor, renewing a prescription, and checking your health cover or a claim |
| Work & jobs | Finding and applying for jobs, and running payroll and HR paperwork for a small business |
| Insurance | Buying a car, home or travel policy, and filing a claim |

## Status levels

Each country × capability cell gets one status:

| Status | Points | Meaning |
| --- | --- | --- |
| Live | 1 | Generally available to ordinary people or businesses |
| Limited | 0.5 | Beta, pilot, waitlist, or a small group of users |
| Announced | 0.25 | Officially announced for that country, but not usable yet |
| Not yet | 0 | We searched and found no availability |

A cell takes the best status across all products. If any product is live in a country, the cell is live, and the note names the products.

## How the data is collected

The data comes through two lenses, and every cell is checked against both.

1. **Research lens.** Reports, papers and regulation, such as central-bank pages, open-finance rules, digital-ID laws, and surveys from the World Bank, the BIS and the OECD.
2. **Company lens.** What the companies that build agent capabilities actually ship, and where. Sources are help-center "supported countries" pages, launch posts and developer docs. Each company is recorded with its HQ and the markets where its agent capability works. When one of its capabilities works in fewer markets than the rest, `"marketsByCapability"` narrows it, for example `{ "messaging.pay-in-chat": ["BR", "IN"] }`. Each key must be one of the company's `capabilities`, and each code one of its `markets`. The For businesses view uses it, so a company is listed only where that capability works. This shows *who* makes each capability possible in each country, including local players such as Mercado Pago, Nubank and NPCI.

Rules:

- Every Live, Limited or Announced cell must cite at least one source with a URL. `npm run validate` enforces this.
- Every source has a `date`, written `"YYYY-MM-DD"` or `"YYYY-MM"`, and no later than the `asOf` date in `data/meta.json`. `npm run validate` enforces this too.
- Primary sources come first: company, regulator and paper. News is used only when nothing primary exists.
- When the sources disagree or are unclear, the cell takes the lower status and the note says why.
- A cell whose sources are thin or indirect carries `"confidence": "low"`. The site marks it with a `?`. Treat it as a lead to check, not a finding. Its score still counts.
- A cell that is not live may carry one `"gapReason"`: the main reason agents cannot do it yet. It is one of five ids, and their labels live in `data/meta.json`: `no-rule` (no rule in force yet), `rail-closed` (the system exists, but agents are not let in), `not-launched` (not fully launched here yet), `pilot-only` (pilot only) and `assist-only` (it helps, but you do the last step). `pilot-only` and `assist-only` describe partial availability, so they go only on a Limited cell; a Not yet cell never uses them. It does not change the score.

## Score and ranking

```
category score = mean(status points of its capabilities) × 100
country score  = mean(category scores)
```

Every category weighs the same, so a category with more capabilities does not dominate. Countries with equal scores share a rank. The code is in `src/observatory.js`, and the tests are in `test/`.

## Open source: what is really used

Companies are one way a capability reaches people. Open-source projects are the other: a bank, a shop or a government team can build an agent on them without asking anyone. Each category file lists the biggest open-source repos behind its capabilities in `repos[]`.

Stars measure attention, not use. A repo can trend for a week and never run anywhere. So each repo gets a **real-use tier** from what we can count:

| Tier | Rule |
| --- | --- |
| Widely used | 1M+ installs a month (busiest npm, PyPI or Packagist package), or 100M+ Docker Hub pulls |
| In real use | 50k+ installs a month, or 1M+ Docker Hub pulls |
| Not measured | Ships no npm, PyPI, Packagist or Docker Hub package we can count |
| Mostly stars | 5k+ stars, but below the install bars |
| Niche | Few stars and few installs |
| Dormant | Archived, or no commit in the 6 months before it was measured |

`npm run refresh-repos` measures every repo and writes its `usage` snapshot: stars, contributors, last push, monthly downloads and Docker pulls. The rules live in `repoUse()` in `src/observatory.js`. Repos do not change the country score.

Limits: downloads include CI machines and mirrors, Docker pulls are lifetime and include automated pulls, and images on other registries (such as ghcr.io) cannot be counted. Treat a tier as an order of magnitude, not a census.

## Use beside the index

The index measures what agents can do, not how many people use AI. To show both, `data/adoption.json` holds two outside numbers for every tracked country. The countries page shows them under "Who uses AI here". They never change a score.

| Measure | What it counts | Source |
| --- | --- | --- |
| People who use AI | The share of people aged 15 to 64 who used a generative AI product in the quarter (April to June 2026). Microsoft builds it from its own anonymous usage data, adjusted for device share, internet use and population. | Microsoft AI Economy Institute, Global AI Diffusion Q2 2026 |
| Claude use per person | A country's share of Claude.ai use divided by its share of the world's people aged 15 to 64 (May 2026). 1 means use in line with its population. | Anthropic Economic Index, release 2026-06-26 |

The page also puts two places side by side: the country's rank for what agents can do, and its rank for people who use AI. A gap of 6 places or more gets said out loud ("Here the agents are ahead of the people"). `npm run validate` checks that every tracked country has every number, and that each source is dated no later than `asOf`.

To refresh it, take the newest Microsoft report and Anthropic release, update the numbers and each measure's `says`, `period` and `source`, then run `npm run validate`.

## The big assistants, feature by feature

The Access category asks whether you can sign up for the big assistants. It is Live in every tracked country, so it no longer tells countries apart. `data/assistants.json` goes one level down: one row per agent feature of a big assistant, and one cell per country. The countries page shows it as one table, "The big assistants here", for the country and its neighbours. It never changes a score.

| Feature | Vendor | What it does |
| --- | --- | --- |
| Alexa+ | Amazon | Books and orders for you by voice |
| Gemini connected apps | Google | Calls and sends messages for you from the Gemini app |
| Tasks in Gemini | Google | Shops and books on websites for you |
| Chrome auto browse | Google | Does tasks for you in the Chrome browser |
| Claude in Chrome | Anthropic | Does tasks for you in the Chrome browser |
| ChatGPT cloud browser | OpenAI | Uses websites for you, including ones you sign in to |

Rules:

- A cell has the same shape and statuses as a cell in a category file, and the same source rules. A feature that needs a paid plan is Live when anyone can buy that plan there. Early Access by invitation is Limited.
- The vendor's own country page comes first. Most vendors publish one page that lists every country, so one source fills a whole row.
- The file has its own `asOf`, the day its cells were checked. No source may be later than that day.
- A country with no cell has not been checked. The table shows a plain "?".

We dropped two features: ChatGPT agent (OpenAI retired it for ChatGPT Work and its cloud browser) and ChatGPT Instant Checkout (OpenAI moved checkout to merchant apps in March 2026). `npm run validate` checks the file.

## Known limits

- Availability changes every week. Each dataset carries an `asOf` date.
- "Live" means available, not widely used. Adoption of products is not measured; only open-source repos get a real-use tier. For context, each country page shows how many people use AI there (see "Use beside the index").
- Language support is noted, but it is not scored separately.
- The list of capabilities is opinionated. Add a capability by adding an entry to a category file in `data/`.
