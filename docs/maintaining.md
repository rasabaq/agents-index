# Maintaining

How we handle issues and pull requests from outside contributors.

## Who does what

| Work | Who |
| --- | --- |
| Triage: labels, duplicates, routing, the good first issue list | Maintainer |
| Data in `data/<category>.json` | The category owner for that file |
| New leads for the data | Category owners, and anyone who opens an issue |
| Code, the site and CI in `.github/workflows/` | Maintainer |
| Checking UI changes at 1440px and 400px | Reviewer |
| Merging every PR | Maintainer |

Each file in `data/` (one per category, such as `payments.json` or `health.json`) has a category owner. The owner checks the facts in that file. `meta.json` holds the countries, categories and shared lists. The maintainer decides what goes in it.

Only the maintainer merges. The maintainer posts comments and reviews, using the standard replies below as a starting point.

## Labels

| Label | Use it for |
| --- | --- |
| `data` | A status, note or source in a data file is wrong, missing or out of date |
| `new-country` | A request to track a new country |
| `new-capability` | A new capability, or a change to how one is worded or defined |
| `bug` | Something on the site is broken |
| `ui` | Layout, text or looks on the site, not data |
| `needs-source` | We can't act until someone gives a source URL we can check |
| `good first issue` | Small, clear, and done in one PR by someone new |
| `help wanted` | We would welcome an outside PR for it |
| `duplicate` | Another issue or PR covers it; link it and close |
| `wontfix` | Out of scope, or we decided not to do it; say why and close |
| `question` | The person needs an answer, not a change |

Each issue gets one type label (`data`, `new-country`, `new-capability`, `bug` or `ui`) and any others that fit.

## Triage

Go through new issues and PRs every day.

1. Add the type label. The issue forms add it for you, so check that it is right.
2. Search for duplicates. Close exact duplicates with a link to the first one.
3. Route it: data to the category owner of the file, code to the maintainer, UI checks to a reviewer.
4. If a data issue has no URL we can check, add `needs-source` and ask for one.
5. Reply.

We aim to reply to a new issue or PR within 2 working days, and to finish checking a data PR within a week.

## Checking a data PR

A data PR is ready to merge when all of these hold:

- CI passes: `npm test` and `npm run validate`. Run `npm run check-links` on the branch too, because CI runs it only once a week.
- It changes one thing, and only data files.
- Every Live, Limited or Announced cell it touches has a source with a URL.
- Primary sources come first: the company, the regulator, or a paper. News is fine only when nothing primary exists.
- Open each new URL. The page has to say what the note says. A page that blocks scripts (403) is fine if a person can read it.
- Thin, indirect or conflicting sources mean `"confidence": "low"`. When sources disagree, the cell takes the lower status and the note says why.
- Cells that are not live carry a `gapReason` from `data/meta.json` when one fits.
- The note is plain English and names the products.
- `asOf` in `data/meta.json` moves to the date of the change, and `lastmod` in `sitemap.xml` and `date-released` in `CITATION.cff` move with it.

The category owner checks the facts. The maintainer checks the rules above.

## Standard replies

Replace the parts in angle brackets.

### Thanks and next step

> Thanks for this. `<Role, such as the category owner>` will look at it next. We aim to reply within 2 working days.

### Need a primary source

> Thanks. Before we change this cell, we need a page we can check that shows the new status. The best sources are the company's own help or launch page, the regulator, or a paper. News works only when nothing primary exists. Could you add a link?

### Duplicate

> Thanks. #`<number>` already covers this, so I'm closing this one. Please add anything new there.

### Out of scope

> Thanks for the idea. We track what AI agents can actually do for people and businesses in each country, and this falls outside that, so we won't take it on. `<One sentence on why.>`

### Ready to merge

> Thanks. This passes our checks, and the sources back the change. It's ready for a final review and merge.
