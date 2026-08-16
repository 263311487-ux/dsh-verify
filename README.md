# dsh-verify

[![ci](https://github.com/263311487-ux/dsh-verify/actions/workflows/ci.yml/badge.svg)](https://github.com/263311487-ux/dsh-verify/actions/workflows/ci.yml)

> **Agents self-test and pass. Real browsers tell the truth.**

`dsh-verify` is a tiny, dependency-light acceptance tester for **agent-delivered web artifacts**. You write a JSON spec of what a human would check in a browser; it launches a real headless Chromium, clicks, reads computed styles, and produces an HTML report plus a `0/1` exit code.

It exists because we got burned — and we have receipts.

---

## The story (why this exists)

We ran a **4-agent web team** (spec writer → frontend dev → QA → reviewer). The team shipped a demo page with a counter and a dark-mode toggle. Their own review report said:

> ✅ "All requirements met. No issues found."

In a real browser, the toggle button **did nothing** — the page background never changed. The `.dark` class was toggled by JavaScript, but the CSS rule for `.dark` was never written. Every agent self-test passed because there was nothing in the page for the agents to run. **No one opened a real browser.**

That is the gap: *agents verify against what they believe they built, not against what a user actually experiences.* Unit tests and static checks can't catch a missing CSS rule.

This repo contains the bug, fixed, side by side — and the browser-driven evidence that separates them:

| Build | What the agents said | What a real browser says |
|---|---|---|
| `demo/buggy` | "No issues found" | ❌ FAIL — background never changes |
| `demo/fixed` | one CSS rule added | ✅ PASS — theme flips |

Same page. Same JS. One missing CSS rule. Two different verdicts.

## The report

A self-contained HTML report — every step with a pass/fail badge, selector, and detail, plus screenshots:

![dsh-verify report](assets/report-screenshot.png)

---

## What it does

- Reads a **JSON spec** (no framework, no config language)
- Serves your static directory (or points at any URL)
- Drives a **real headless Chromium** (Playwright)
- Checks what humans check: text, classes, **computed styles**, URLs, **pixels**
- Emits a self-contained **HTML report** with screenshots and diff images
- Exits `0` on pass, `1` on fail → drop it into any CI
- **MCP server** for Claude Code / Cursor / Copilot · **AI-drafted checklists** · **GitHub Action** · **DSH plugin**

## Install

```bash
# from npm (CLI)
npm install -g dsh-verify

# as a DeepSeek Harness (DSH) plugin — available in every session of the profile
dsh plugin --profile web add dsh-verify

# or run without installing
npx dsh-verify --help
```

## Use it from any AI agent (MCP)

`dsh-verify` ships a **MCP server**, so Claude Code, Cursor, Copilot, or any MCP-capable agent can verify its own deliverables in a real browser — no spec files required:

```bash
# register once (Claude Code)
claude mcp add dsh-verify -- npx -y -p dsh-verify dsh-verify-mcp

# or (Cursor / generic MCP client)
# add a stdio server with the command:  npx -y -p dsh-verify dsh-verify-mcp
```

Then tell your agent, in plain words:

> Verify http://localhost:3000 — click `#dark-toggle`, then check `body` background-color changed. Screenshot it.

The agent calls `verify_url` with a list of human-style checks (goto / click / fill / expect_text / expect_class / capture_style / expect_style_changed / expect_url_contains / expect_navigation / expect_console_errors / expect_network_errors / screenshot / expect_screenshot), a real headless Chromium executes them deterministically, and the agent gets a `PASS`/`FAIL` verdict plus a self-contained HTML report.

Tools exposed by the MCP server:

| Tool | What it does |
|---|---|
| `verify_spec` | Run an existing spec JSON file (or glob) against real Chromium |
| `verify_url` | Verify a live URL against an inline list of checks — no files needed |
| `generate_and_verify` | AI drafts the checklist from the live page + your requirements, then real Chromium executes it |
| `health` | Confirm the server and Chromium are ready |

No LLM judges the outcome — the browser is the judge. That's the whole point.

## Use it in CI (GitHub Action)

One step in any workflow — installs dsh-verify and Chromium in isolation (your project is untouched), runs the checks, and uploads the report as an artifact:

```yaml
- uses: 263311487-ux/dsh-verify/.github/actions/dsh-verify@main
  with:
    spec: demo/fixed.json       # spec file or glob
    # url: https://staging.example.com   # optional override
    # out: dsh-verify-out               # report output dir (default)
```

The repo dogfoods it: the [dogfood workflow](.github/workflows/dogfood.yml) asserts the fixed build **passes** and the buggy build **fails** on every push.

## Visual regression (pixel-level screenshot baselines)

Change the page and let the pixels tell you — not your eyes, not your memory:

```json
{
  "title": "my app",
  "serve": "dist",
  "steps": [
    { "action": "goto", "path": "/index.html" },
    { "action": "expect_screenshot", "name": "home", "threshold": 0.01 }
  ]
}
```

- First run **creates the baseline** (`out/baselines/home.png`) and passes.
- Later runs compare real Chromium screenshots pixel-by-pixel; differences over `threshold` (default 1%) fail the build.
- A red-highlight **diff image** lands in `out/diffs/` and is embedded in the HTML report.
- Expected change? Refresh baselines instead of failing: `dsh-verify --spec spec.json --update-baselines`.
- Scope a region with `"selector"`, tune noise with `"tolerance"` (per-channel, default 10).

**Actions**: `capture_baseline` (explicitly save a baseline), `expect_screenshot` (compare against baseline).

## AI-drafted checklists (LLM writes them, a real browser enforces them)

Don't want to hand-write the JSON? `dsh-verify gen` learns the page in a real browser, has an LLM draft the checklist against your requirements, then executes it in real Chromium:

```bash
export DEEPSEEK_API_KEY=sk-...   # or pass --api-key / --provider openai

dsh-verify gen --url http://localhost:3000 \
  --prompt "dark-mode toggle must actually change the background color" \
  --run
```

```text
gen: opening http://localhost:3000 in a real browser to learn the page...
gen: page learned (2 buttons, 0 inputs) — drafting checklist...
gen: checklist drafted by deepseek-v4-flash (10 steps) -> dsh-verify.gen.json
gen: executed in real browser -> PASS (10/10)
report: dsh-verify-out/report.html
```

The AI only **drafts** the checklist — it never judges the outcome. The same deterministic Chromium engine runs the steps, and the JSON is written to disk so you can review or edit it before trusting it.

Requires Node >= 18 and one browser install: `npx playwright install chromium`.

## Quick start

```bash
npm install
npx playwright install chromium   # one-time browser download

# Run the two demo specs back to back
npm run demo:buggy                # → FAIL (exit 1) — missing .dark style caught
npm run demo:fixed                # → PASS (exit 0)

# engine self-tests + full CI flow
npm test                          # node:test suite
npm run ci                        # tests + fixed PASS + buggy FAIL (as proof of detection)
```

The repo's own CI runs exactly that: engine self-tests, then asserts the fixed build **passes** and the buggy build **fails** — so the tool verifies itself on every push (`.github/workflows/ci.yml`).

### Machine-readable output

```bash
node bin/verify.mjs --spec demo/fixed.json --out /tmp/out --json
# {"verdict":"PASS","passed":11,"total":11,"failed":[],"report":"/tmp/out/report.html"}
```

## Running many specs

```bash
node bin/verify.mjs --spec 'specs/*.json' --out reports/
# [PASS] specs/home.json (5/5)
# [FAIL] specs/cart.json (4/5)
#   ❌ expect_text #total: got "0" want "99"
```

Each spec gets its own `reports/<name>/` folder; exit is `0` only if **all** pass.

## Spec format

Top-level fields: `title`, `serve` (static dir), `base` (target URL), `browser` (optional: `chromium` | `firefox` | `webkit`, default `chromium`), `steps`.

```json
{
  "title": "my app",
  "serve": "dist",
  "browser": "chromium",
  "steps": []
}
```

Override per run with `--browser firefox`.

```json
{
  "title": "my acceptance check",
  "serve": "demo/fixed",
  "steps": [
    { "action": "goto", "path": "/index.html" },
    { "action": "click", "selector": "#count-btn", "count": 3 },
    { "action": "expect_text", "selector": "#count-btn", "text": "Clicked: 3" },
    { "action": "capture_style", "selector": "#page", "prop": "backgroundColor", "var": "bg_before" },
    { "action": "click", "selector": "#color-btn" },
    { "action": "expect_class", "selector": "#page", "class": "dark", "present": true },
    { "action": "expect_style_changed", "selector": "#page", "prop": "backgroundColor", "var": "bg_before" },
    { "action": "screenshot", "name": "final-state" }
  ]
}
```

### Actions

| Action | Fields | What it verifies |
|---|---|---|
| `goto` | `path` / `url` | Navigate (uses the served dir if `serve` is set) |
| `wait` | `ms` | Wait (lets CSS transitions settle) |
| `click` | `selector`, `count?` | Click an element, N times |
| `fill` | `selector`, `text` | Fill an input |
| `expect_text` | `selector`, `text`, `exact?` | Visible text contains/equals target |
| `expect_class` | `selector`, `class`, `present?` | Class is present (default) or absent |
| `capture_style` | `selector`, `prop`, `var` | Snapshot a **computed style** into a variable |
| `expect_style_changed` | `selector`, `prop`, `var` | Computed style differs from the snapshot — the check that catches "class toggled but CSS never written" |
| `expect_url_contains` | `text` | Current URL contains target |
| `expect_navigation` | `to`, `timeout?` | Wait until the URL contains `to` (e.g. after clicking a link) |
| `expect_console_errors` | `present?` | No console errors during the run (default: expect none) |
| `expect_network_errors` | `present?` | No 4xx/5xx responses or failed requests (default: expect none) |
| `screenshot` | `name`, `full?` | Save a PNG into the report |
| `capture_baseline` | `name`, `selector?` | Save a screenshot as a visual baseline |
| `expect_screenshot` | `name`, `threshold?`, `tolerance?`, `selector?` | Pixel-diff against the baseline; fails over `threshold` (default 1%) |

The `capture_style` → `expect_style_changed` pair is the heart of this project: it verifies **what the user sees**, not what the DOM class list says.

## Live evidence

The two screenshots below are real output from `dsh-verify` against the two builds of the same demo (Chromium, 1280×800, after clicking the toggle):

Buggy build — toggle clicked, background unchanged:
![buggy build final state](evidence/buggy-final.png)

Fixed build — toggle clicked, theme flipped:
![fixed build final state](evidence/fixed-final.png)

Full step-by-step reports: [buggy report](evidence/buggy-report.html) · [fixed report](evidence/fixed-report.html).

## Docker (pinned Chromium)

```bash
docker build -t dsh-verify .
docker run --rm -v "$PWD:/app" dsh-verify --spec demo/fixed.json --out /app/reports
```

Uses `mcr.microsoft.com/playwright:v1.62.1-jammy` so the Chromium build matches the Playwright version — no browser download at image build time. (Built and documented; verified locally, not on a Docker host yet.)

## Why nothing else does this

We researched the agent-tooling community before building. Existing "verification" for agent deliverables is mostly:
- **Plugin/install smoke checks** — does a skill install, does a CLI exist (e.g. plugin-discovery tools).
- **Static lint / unit tests** — validate the code the agent wrote, not the behavior the user experiences.
- **Screenshot-only agents** — look at a picture, don't *assert* behavior.

None of them run a real browser against the artifact and answer: *"When I click this button, does the user see the change?"* That is the niche `dsh-verify` fills — deliberately small, no framework, JSON spec in, browser verdict out.

## Roadmap

- [x] `expect_console_errors` / `expect_network_errors` — no console errors, no 4xx/failed requests
- [x] `--json` verdict output for CI logs; failed steps printed to stdout
- [x] Multi-page flows and `expect_navigation` (wait for URL after click)
- [x] `--spec` glob (run many specs, one aggregated verdict)
- [x] Docker image with pinned Chromium (`mcr.microsoft.com/playwright:v1.62.1-jammy`)
- [x] DSH plugin manifest (`dsh plugin add dsh-verify`)
- [x] MCP server — verify from Claude Code / Cursor / Copilot (`verify_spec` / `verify_url` / `generate_and_verify`)
- [x] AI-drafted checklists — `dsh-verify gen` (LLM drafts, deterministic browser enforces)
- [x] GitHub Action — one-step CI acceptance with report artifact
- [x] Visual regression — pixel-level screenshot baselines (`capture_baseline` / `expect_screenshot`)
- [x] Multi-browser matrix — `--browser` / `spec.browser`: chromium, firefox, webkit (all green in CI)
- [ ] Mobile viewports
- [ ] AI spec generation from a natural-language requirement without a running page

## License

MIT
