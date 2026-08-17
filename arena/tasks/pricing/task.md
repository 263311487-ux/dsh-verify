Build a single-file pricing calculator in `index.html` (all CSS and JS inline, no external libraries, no network requests).

Required element IDs (exact):
- `#price` — number input, default value 100 (unit price)
- `#qty` — number input, default value 1 (quantity)
- `#tier-0`, `#tier-10`, `#tier-20` — three buttons for discount tiers 0% / 10% / 20%; all have class `tier`; `#tier-0` is active by default (has class `active`)
- `#total` — element showing the total as "¥" plus two decimals, e.g. "¥106.00"
- `#error` — hidden by default; shows an error message when input is invalid

Behaviors:
- subtotal = qty × price × (1 − tier/100)
- total = subtotal × (1 + 0.06 tax)
- Recompute automatically on any input change and on tier button click
- Clicking a tier button sets it as the active tier (class `active` on it, removed from the others)
- If qty < 1 or price < 0: show "Invalid quantity or price" in #error and leave #total empty
- Otherwise hide #error and show the total

Keep it clean, self-contained, and working. Do not add anything not asked for.
