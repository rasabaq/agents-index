# Contributing

Thanks for helping. The most useful thing you can do is fix a data cell that is wrong or out of date.

Everyone here follows our [Code of Conduct](CODE_OF_CONDUCT.md).

## Run it

You need Node 20 or later. There is no build step and nothing to install.

```sh
npm start             # serves the site on http://localhost:8080
npm test              # scoring and validation tests
npm run validate      # checks every data file
npm run check-links   # fails on dead source links
```

## Fix a data cell

Each cell is one country and one capability, in a category file in `data/`. To change one:

1. Find the capability in `data/<category>.json` and the country under `countries`.
2. Set `status` to `live`, `limited`, `announced` or `none`. The meanings are in [docs/methodology.md](docs/methodology.md#status-levels).
3. Update `note` in plain words, and add the source to `evidence`.
4. Run `npm run validate`.

The rules:

- Every Live, Limited or Announced cell needs at least one source with a URL.
- Primary sources come first: the company, the regulator, or a paper. Use news only when nothing primary exists.
- When sources are thin, indirect or disagree, add `"confidence": "low"`. When they disagree, use the lower status and say why in the note.
- On a cell that is not live, you can add `"gapReason"` with the main reason: one of the ids in `gapReasons` in `data/meta.json`, such as `"pilot-only"`.
- Never invent a URL.

If you cannot edit the file, open a [data correction issue](https://github.com/rasabaq/ai-agent-observatory/issues/new?template=data-correction.yml) with the source, and we will make the change.

## Pull requests

- One change per pull request: one data fix, or one feature.
- Run `npm test`, `npm run validate` and `npm run check-links` before you open it.
- Say what changed and link your sources.

By contributing, you agree that code is licensed under the [MIT License](LICENSE) and data under [CC BY 4.0](data/LICENSE).
