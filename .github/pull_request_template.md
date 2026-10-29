## What changed

<!-- One or two sentences. Link the issue it fixes, for example "Fixes #12". -->

## Sources

<!-- Data changes only. List each cell you changed (country and capability id) and the URL that backs it. Put primary sources first: the company, the regulator, or a paper. Delete this section for code-only changes. -->

## Checklist

- [ ] This PR makes one change: one data fix, one new country, one capability, or one feature.
- [ ] `npm test` passes.
- [ ] `npm run validate` prints "Dataset OK".
- [ ] `npm run check-links` reports no dead links.
- [ ] Data: every Live, Limited or Announced cell I changed has a source URL.
- [ ] Data: cells with thin sources have `"confidence": "low"`, and cells that are not live have a `gapReason` where one fits.
- [ ] UI: I added screenshots at 1440px and 400px wide.
