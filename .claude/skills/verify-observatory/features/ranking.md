# Ranking

The ranking is the country picker in the console (`#ranking`, `[data-clist]`): one button per country with its flag, code and score (0–100), best first. The selected country is in sunrise. The hero button "Open the ranking" lands on it. The hero pins on the planet show the same scores.

## Sub-features

- `ranking-order` lists the 8 countries in score order, with flag, code and score.
- `ranking-select` selects a country from a button, without scrolling.

## How to get to it (user POV)

- Click "Open the ranking" in the hero.

## Driving it with observatory.mjs

Preconditions:

- `node $H doctor` prints `healthy`.

- **Order.** Run `node $H open /`. Then `node $H eval "[...document.querySelectorAll('[data-clist] button')].map(b => b.innerText.replace(/\\s+/g, ' ').trim())"` lists 8 buttons with scores that never increase.
- **Hero entry.** Run `node $H click '.hero-btn-1'`. Then `node $H eval "Math.round(document.querySelector('#ranking').getBoundingClientRect().top)"` is small (the picker is in view). Take `node $H shot ranking-1440`.
- **Select.** Run `node $H click '[data-clist] [data-go-country="DE"]'`. `#cn-title` reads Germany, the button has `aria-current="true"`, and the hash is `#country=DE`.
- **Phone.** Run `node $H open / --width 400` and `node $H shot ranking-400 --at '#ranking' --offset 120`. The buttons wrap onto two rows. Check that `scrollWidth` is 400.
- **Proof.** Finish with `node $H errors` (exit 0).

## Gotchas

- Scores come from the data. Assert the order, not exact numbers, unless the data is pinned.
