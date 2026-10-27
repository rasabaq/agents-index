# AI Agent Observatory

Not how much AI a country has, but **what AI agents can actually do there**.

In the US, an AI agent can buy from a merchant inside a chat assistant. In Chile, can it? This observatory tracks concrete agent capabilities country by country. Every status cites a source, and the countries are ranked by what agents can do for ordinary people and businesses.

## Run it

```sh
npm start          # serves the site on http://localhost:8080
npm test           # scoring and validation tests
npm run validate   # checks every data file and prints the ranking
npm run check-links  # fails on dead source links (404/410)
npm run refresh-repos  # measures the open-source repos: stars, installs, last commit
```

The site has no build step and no dependencies. Node 20 or later runs the checks.

## Layout

| Path | What it holds |
| --- | --- |
| `data/meta.json` | Countries, categories and the `asOf` date |
| `data/<category>.json` | Capabilities, the status in each country with sources, and the companies that enable them |
| `src/observatory.js` | Scoring and validation, shared by the site and Node |
| `docs/methodology.md` | How the data is collected and scored |
| `index.html`, `app.js`, `hero.js`, `sections.js` | The site: the hero, then a console (country list, status matrix, ranking, categories, newest sources), tiers, companies and method |
| `styles.css`, `console.css`, `hero.css`, `sections.css` | Shared tokens (also used by the Atlas), then the home page parts |

## Update the data

1. Edit a category file in `data/`. Every Live, Limited or Announced cell needs a source URL. Add `"confidence": "low"` when the sources are thin.
2. Run `npm run validate`.
3. Bump `asOf` in `data/meta.json`.

To add an open-source repo, add it to `repos[]` in the category file it serves, with `repo` ("owner/name"), `name`, `role`, `capabilities`, and its `packages` (`npm` or `pypi`) and Docker Hub `images` if it ships any. Then run `npm run refresh-repos <category>` to fill its `usage` from GitHub, npm, PyPI and Docker Hub.
