# Methodology

Most AI indexes measure inputs, such as compute, talent, papers or strategy documents. This observatory measures one output instead: **what an AI agent can actually do for an ordinary person or business in a country today.**

## Unit of measure: a capability

A capability is one concrete action, phrased as a yes-or-no question. For example: "Can an AI agent buy from a merchant without leaving the chat?" Every capability belongs to one of seven categories:

| Category | What it covers |
| --- | --- |
| Shopping & checkout | Buying inside AI assistants, marketplace agents, and merchant protocols such as ACP and UCP |
| Agent payments | Card-network agent tokens, instant-payment rails (UPI, Pix), and wallets |
| Travel & local services | Restaurant bookings, travel, food, groceries and rides |
| General-purpose agents | Browser agents, agents that phone businesses, and assistants that act across apps |
| Banking & open finance | Regulated account access and payment initiation, and bank AI that moves money |
| Chat & messaging | Business AI agents in chat apps, and paying inside a chat |
| Government & identity | Digital ID that apps can plug into, and government AI assistants |

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
2. **Company lens.** What the companies that build agent capabilities actually ship, and where. Sources are help-center "supported countries" pages, launch posts and developer docs. Each company is recorded with its HQ and the markets where its agent capability works. This shows *who* makes each capability possible in each country, including local players such as Mercado Pago, Nubank and NPCI.

Rules:

- Every Live, Limited or Announced cell must cite at least one source with a URL. `npm run validate` enforces this.
- Primary sources come first: company, regulator and paper. News is used only when nothing primary exists.
- When the sources disagree or are unclear, the cell takes the lower status and the note says why.
- A cell whose sources are thin or indirect carries `"confidence": "low"`. The site marks it with a `?`. Treat it as a lead to check, not a finding. Its score still counts.

## Score and ranking

```
category score = mean(status points of its capabilities) × 100
country score  = mean(category scores)
```

Every category weighs the same, so a category with more capabilities does not dominate. Countries with equal scores share a rank. The code is in `src/observatory.js`, and the tests are in `test/`.

## Known limits

- Availability changes every week. Each dataset carries an `asOf` date.
- "Live" means available, not widely used. Adoption is not measured yet.
- Language support is noted, but it is not scored separately.
- The list of capabilities is opinionated. Add a capability by adding an entry to a category file in `data/`.
