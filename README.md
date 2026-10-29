# Agent Index

Not how much AI a country has, but **what AI agents can actually do there**.

In the US, an AI agent can buy from a merchant inside a chat assistant. In Chile, can it? Agent Index tracks concrete agent capabilities country by country. Every status cites a source, and the countries are ranked by what agents can do for ordinary people and businesses.

## Run it

```sh
npm start          # serves the site on http://localhost:8080
npm test           # scoring and validation tests
npm run validate   # checks every data file and prints the ranking
npm run check-links  # fails on dead source links (404/410)
npm run refresh-repos  # measures the open-source repos: stars, installs, last commit
npm run refresh-sites  # reads each company homepage for its logo
```

The site has no build step and no dependencies. Node 20 or later runs the checks.

## Layout

| Path | What it holds |
| --- | --- |
| `data/meta.json` | Countries, categories and the `asOf` date |
| `data/<category>.json` | Capabilities, the status in each country with sources, and the companies that enable them |
| `src/observatory.js` | Scoring and validation, shared by the site and Node |
| `docs/methodology.md` | How the data is collected and scored |
| `index.html` | The page, top to bottom: the hero, the world map, the console (country view, status matrix, ranking, categories, newest sources), the numbers band, the Compare countries charts, Companies (with the flows and network charts), Open source, the timeline and Method |
| `app.js`, `hero.js`, `sections.js` | The console, the hero, and the numbers band |
| `charts/charts.js`, `charts/viz-*.js` | The ten charts: `charts.js` loads the data once and draws each chart into its `<section data-chart="<id>">` slot in `index.html` |
| `styles.css`, `console.css`, `hero.css`, `sections.css`, `charts/charts.css` | Shared tokens, then the home page parts and the chart windows |
| `scripts/` | Data checks and refresh scripts run by `npm` |
| `test/` | Node tests for scoring, validation and the data |

## Update the data

1. Edit a category file in `data/`. Every Live, Limited or Announced cell needs a source URL. Add `"confidence": "low"` when the sources are thin.
2. Bump `asOf` in `data/meta.json`. No source date may be later than `asOf`.
3. Run `npm run validate`.

To add an open-source repo, add it to `repos[]` in the category file it serves, with `repo` ("owner/name"), `name`, `role`, `capabilities`, and its `packages` (`npm`, `pypi` or `packagist`) and Docker Hub `images` if it ships any. Then run `npm run refresh-repos <category>` to fill its `usage` from GitHub, npm, PyPI, Packagist and Docker Hub.

Every company has a `url` (the source for what it does) and a `homepage` (its own site). Its `markets` cover all its `capabilities`; when one capability works in fewer markets, add `"marketsByCapability": { "<capability id>": ["BR", "IN"] }`. Run `npm run refresh-sites <category>` to store the logo from its homepage in `icon`: the apple-touch-icon, else the largest icon link, else `/favicon.ico`. Sites that block scripts get `null`, and the page shows a monogram. Repo logos are the GitHub owner's avatar, so they need no data.

## Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md). To report a wrong status, open a [data correction](https://github.com/rasabaq/agents-index/issues/new?template=data-correction.yml), or use "Suggest a correction" on any cell of the site.

## License

- Code: [MIT](LICENSE).
- Data in `data/`: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (see [data/LICENSE](data/LICENSE)). You may reuse it with credit to Agent Index.
