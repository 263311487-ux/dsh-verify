# DSH Team Demo

A tiny interactive demo page built by the web-team. The page is a single HTML document (`index.html`) with a linked stylesheet (`style.css`) and script (`app.js`), all working together to demonstrate simple DOM interactions.

## Features

- **Page title:** "DSH Team Demo" — a minimal single-page demo with a heading and two buttons.
- **Counter button (`#count-btn`):** Each click increments a counter and updates the button's label to `Clicked: N` (e.g. `Clicked: 1`, `Clicked: 2`, ...).
- **Color toggle button (`#color-btn`):** Each click toggles the `dark` class on the page body (`#page`), switching between light and dark themes.

## Files

- `index.html` — page structure and the two buttons
- `style.css` — styling, including the light/dark theme via the `dark` class
- `app.js` — click handlers for the counter and color toggle

## How to run

Open `index.html` in any modern web browser. No build step or server required.

## Try it

1. Click **Clicked: 0** repeatedly — the count increments each time.
2. Click **Toggle Color** — the page background flips between light and dark.
