---
name: verify-observatory
description: Drive the Agent Index site (the home page: hero, console and charts) in a real headless Chrome and capture proof (screenshots at 1440px and 400px, page state, page errors). Use it to verify a UI change, review a site PR, or check that a feature still works, before you call a change done.
---

# Verify the Agent Index

The product is a static web site, with no build step and no backend. Its surfaces:

- `/` is the home page: the hero, the console (country view with its picker, lists and themes, then the closed matrix), Companies, Open source and Method.
- The three charts (world map, head to head and flows) draw on the same page, between those sections.
- `npm test` and `npm run validate` check the data and the scoring. They do not check the UI.

The helper `observatory.mjs` (next to this file) does five things:

- It starts the same Python static server that `npm start` uses, on a free port bound to 127.0.0.1.
- It starts a headless Google Chrome on a throwaway profile.
- It drives that Chrome over the DevTools protocol.
- It saves every action to a log.
- It saves screenshots to an evidence folder.

It needs Node 22 or later (for the built-in `fetch` and `WebSocket`), `python3` and Chrome. It adds no npm packages.

- **Chrome:** it uses `/Applications/Google Chrome.app` on macOS, otherwise `google-chrome` or `chromium` on `PATH`. To use another binary, set `CHROME=/path/to/chrome`.
- **Shell variable:** every command below assumes this, run from the repo root:

  ```sh
  H=.claude/skills/verify-observatory/observatory.mjs
  ```

  Run `node $H help` for the command list.

If your agent rules say to use a specific browser tool instead of a scripted Chrome (OpenBot agents: `openbot_browser`), drive the same URLs, selectors and widths with that tool. The feature files stay valid.

## Launch

```sh
node $H up
```

This prints the run id, the site URL (for example `http://127.0.0.1:56875`), the evidence folder, the git revision being served, and the Chrome version. The site is ready when `up` returns, because it waits for the server to answer.

Each run gets its own server port, its own Chrome profile and its own folder under `.verify-runs/<run-id>/`. Several runs can exist side by side:
- Commands act on the newest run by default.
- `VERIFY_RUN=<run-id>` picks another run.
- `VERIFY_OUT=<dir>` moves `.verify-runs` (for example to a shared folder).

`up` also starts a small *holder* process. It keeps one DevTools session attached, so the viewport, color scheme, language and error collector stay in force between commands. Chrome drops these settings when the session that set them detaches.

Teardown is `node $H down` (see Cleanup).

## Doctor

Run it first, and again whenever something looks off. It is read-only.

```sh
node $H doctor
```

It checks:
- The server, Chrome and holder processes of this run are alive.
- `/` is the Agent Index (its `<title>`).
- `data/meta.json` loads and has countries.
- `HEAD` is still the revision that `up` served.
- The Chrome DevTools endpoint answers.

It exits 1 and prints `unhealthy` when any check fails. Then run `down` and `up` again. Never drive a server or a browser that this run did not start: `npm start` on port 8080 may belong to someone else.

## Drive

| Command | What it does |
| --- | --- |
| `node $H open '<path>' [--width 1440\|400] [--lang es-CL] [--tz America/Santiago] [--scheme dark\|light] [--wait '<css>']` | Loads a page and waits for it to render. The time zone is UTC unless `--tz` sets one, because the site guesses the visitor's country from it. |
| `node $H click '<css>'` | A real mouse click at the centre of the first match, after scrolling it into view. |
| `node $H press <key>` | A real key press: `Escape`, `Enter`, `Tab`, `ArrowDown`, `j`, `k`, `1`–`6`. |
| `node $H eval '<js>'` | Reads page state and prints JSON. Use it to read, not to act: act with `click` and `press`. |
| `node $H shot <name> [--at '<css>'] [--full]` | Saves a PNG of the viewport, of the viewport scrolled to an element, or of the whole page. |
| `node $H errors` | Lists page errors since the last `open`. Exits 1 on script or console errors. Failed logos are listed as `resource` and do not fail it, because a monogram replaces them. |

How `open` works:
- It sets the whole view each time. Anything you leave out returns to the default: 1440 × 900, dark scheme, the browser's own language.
- `--width 400` gives a 400 × 860 phone viewport.
- It adds a `?verify=` query, so `#country=XX` always triggers a fresh load.
- By default it waits for `#cn-title`. The charts draw after it, so pass `--wait '#v-flows svg'` when you check them.

Stable handles in this repo (use these, not coordinates):

- **Country pickers:** `[data-go-country="CL"]`. These are in the hero pins, the world map and the console picker `[data-clist]` (`#ranking`). The URL hash is `#country=CL`.
- **Country view:** `[data-country]`, the heading `#cn-title`, the score line `.cn-score`, and the cards `[data-kpis]`.
- **Matrix cells:** open `#matrix summary` first, then `#matrix button[data-cap="<capability id>"][data-code="<country>"]`. Their `aria-label` reads `<capability> in <country>: <status>`.
- **Cell detail:** `dialog[data-detail]`, the title `#detail-title`, the status `.detail-status`, the sources `.sources a`, and the correction link `.suggest a`.
- **Sources of a country:** the button `[data-sources]` in the country view.
- **Companies:** the filters `[data-company-filters] [data-market="MX"]`, the table `[data-companies]`, and the count `[data-companies-label]`.
- **Charts:** each chart is `#v-<id>`, with ids `map compare flows`. A view that failed to draw shows `.view-error`.

Each feature has a recipe in [`features/`](features/README.md). Read [`features/README.md`](features/README.md) before a run.

## Evidence

Everything lands in `.verify-runs/<run-id>/`, which git ignores:

- `evidence/*.png`: the screenshots, named by you. Use `<feature>-<width>-<state>`, for example `matrix-400-dialog-open.png`.
- `steps.log`: one JSON line per command, with the action, the target and the result (URL, width, eval values, file names).
- `state.json`: the run's ports, process ids and revision.

To share proof with other agents, copy the run folder somewhere shared, or start the run with `VERIFY_OUT` pointing there.

Proof standards:

- Drive the real user path: click the cell, press the key, change the hash in the URL. Do not call app functions or set state from `eval`.
- Capture the action and the resulting state. Take a shot before and after, plus an `eval` that reads the result (dialog open, title text, hash, `aria-current`).
- Check both widths, 1440 and 400. The site is dark-only, so also confirm that `--scheme light` still renders dark.
- Check side effects: the URL hash after a country change, and the correction link's query string. Do not follow external links (sources, GitHub issue form). Read their `href` instead.
- End each page with `node $H errors`.
- Sideways scroll check at 400px: `node $H eval 'document.documentElement.scrollWidth'` must print `400`.

## Cleanup

```sh
node $H down
```

This stops only this run's holder, Chrome and server, by the process ids saved in `state.json` (never by process name). It deletes the throwaway Chrome profile and marks the run stopped. It keeps `evidence/`, `steps.log` and `state.json`, and prints where they are.

Run `down` after a failed attempt too, so no ports or processes are left behind. Delete old run folders by hand when you no longer need the proof.

## Helpers

- `observatory.mjs`: the only helper. Run `node $H help` for its usage. The `hold` command is internal (started by `up`).

## Gotchas

- Headless Chrome cannot make a window narrower than 500px. The 400px view comes from device emulation held by the holder. If `open --width 400` reports another width, run `doctor`.
- `--lang` changes `navigator.languages` for the next load only. The home page reads the language once, at load.
- The site animates the hero and some counters. `open` waits 800 ms after the page renders; pass `--settle <ms>` for more.
- The sticky header covers the top of the viewport. `shot --at` scrolls the element to 70px below the top; pass `--offset <px>` at 400px if the header hides it.
- Companies and Open source are scroll boxes inside the page. To see more rows, scroll the box (`.table-scroll`), not the window.
