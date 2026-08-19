# Witness — brand sheet

**One-liner:** The quality gate for agent-built web apps.
**Tagline:** Agents say done. The browser proves it.
**Visual headline:** The browser is the judge.

## What it is

AI agents build web apps and claim "done". Witness doesn't take their word for it:
it opens a real browser, executes human-style checks, and returns a `PASS`/`FAIL`
verdict with receipts (screenshots + diff images). No LLM judges the outcome —
**the browser is the judge**.

## Name

- **Witness** — the product name. An agent is the party in the story; the real
  browser is the eyewitness; Witness is the one who records the evidence.
  You don't have to believe the story — you can check the receipt.
- **`dsh-verify`** — the package name (npm / GitHub / MCP). Same thing as
  Witness; the technical name is kept for stability and searchability.
- **中文昵称:** 实锤 — "AI 说完成了？浏览器来实锤。" (community-facing, informal)

## Positioning

| For | Agents that build web apps — and the humans who ship them |
|---|---|
| Who | Developers, QA, CI, and the agents themselves (via MCP) |
| Problem | Agents self-verify against what they *believe* they built, not what users experience |
| Promise | Independent, deterministic, evidence-based acceptance — no LLM judging |
| Differentiation | Real browsers + receipts (screenshots/diffs), JSON spec as the whole contract, MCP/CLI/Action three entry points |

## Voice

Direct, honest, a little dry. State the evidence; let the reader draw the
conclusion. Never oversell: every claim in the README is backed by a runnable
demo (`npm run demo:fixed` / `npm run demo:buggy`).

## Visual direction

- Courtroom/evidence metaphor: verdicts, receipts, witnesses.
- Verdict colors: `PASS` green / `FAIL` red, as literal badges in reports.
- The hero demo shows the same task, same AI, two builds — one missing CSS
  rule caught by a real browser (see `assets/wow-compare.png`).
- Report aesthetic: self-contained HTML, per-step badges, screenshots with
  red-highlighted diffs.

## Where the brand shows up

- README first screen (brand block under the H1)
- npm page description (`dsh-verify` package)
- MCP server tools (`verify_spec` / `verify_url` / `generate_and_verify`)
- GitHub Action usage block
- `docs/ARENA.md`, community posts, and the Agent Arena leaderboard

## Do / don't

- Do say "the browser is the judge" — it's the whole pitch in five words.
- Do show receipts (screenshots, exit codes, PASS/FAIL counts) in every claim.
- Don't call Witness an "LLM evaluator" — it never judges with a model.
- Don't call it a "test framework" — it's an acceptance gate with evidence.
