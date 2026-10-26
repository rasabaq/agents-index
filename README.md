# AI Agent Observatory

Not how much AI a country has, but **what AI agents can actually do there**.

In the US, an AI agent can buy from a merchant inside a chat assistant. In Chile, can it? This observatory tracks concrete agent capabilities country by country. Every status cites a source, and the countries are ranked by what agents can do for ordinary people and businesses.

## Run it

```sh
npm start          # serves the site on http://localhost:8080
npm test           # scoring and validation tests
npm run validate   # checks every data file and prints the ranking
```

The site has no build step and no dependencies. Node 20 or later runs the checks.

## Layout

| Path | What it holds |
| --- | --- |
| `data/meta.json` | Countries, categories and the `asOf` date |
| `data/<category>.json` | Capabilities, the status in each country with sources, and the companies that enable them |
| `src/observatory.js` | Scoring and validation, shared by the site and Node |
| `docs/methodology.md` | How the data is collected and scored |

## Update the data

1. Edit a category file in `data/`. Every Live, Limited or Announced cell needs a source URL.
2. Run `npm run validate`.
3. Bump `asOf` in `data/meta.json`.
