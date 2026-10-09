# Agent Arena

**Can AI agents ship *working* web apps?** Same task, same prompt, same human checks — different agents, graded by [Witness](https://github.com/263311487-ux/dsh-verify) (`dsh-verify` on npm) in a real browser. No LLM judges the outcome. **The browser is the judge.**

Live leaderboard: <https://263311487-ux.github.io/dsh-verify/arena/>

## Snapshot provenance and limits (documentation revision: 2026-10-08)

- Dataset: the 48 committed JSON records in arena/results, mirrored in docs/arena/data.json. Their timestamps span 2026-08-17–18 UTC, not August 19.
- Sample: two recorded model labels × two strategies × three static tasks × four records per cell. Totals: 44 PASS, 2 FAIL, 2 ERROR. Among the 46 records with a browser verdict, 44 passed and 2 failed; ERROR records are runner failures and are excluded from that denominator.
- Version: this documentation accompanies dsh-verify 0.9.5. The historical records do not capture verifier, dependency, browser, or exact provider model versions. Do not label these as 0.9.5 benchmark results.
- Evidence: committed JSON contains summaries and local report paths. Generated apps, model replies, and report files stayed in ignored arena/work; those absolute paths are not public evidence links. The repository alone cannot reproduce the original failures exactly.
- Interpretation: self-check allows up to two extra repair rounds, so budgets differ. This tiny task-specific sample does not establish general model reliability, price efficiency, statistical significance, or superiority over another evaluation tool. Model labels were not independently authenticated.
- Independence: browser assertions are evaluated without an LLM judge, but spec authorship, task design, and result curation are not independent audits. An omitted requirement cannot fail.
- Refresh: no model/API experiments were run for this documentation update. New runs require API access and may incur charges.

| Recorded model label | Single shot | Self-check |
|---|---|---|
| deepseek-v4-flash | 11/12 PASS | 11/11 PASS + 1 ERROR |
| deepseek-v4-pro | 10/11 PASS + 1 ERROR | 12/12 PASS |

## The tasks

Each task is a self-contained static app (single `index.html`, no external resources), with a prompt that specifies **exact element IDs and behaviors** so grading is objective and identical across agents:

- **todo-app** — add / toggle / delete todos, remaining counter, localStorage persistence
- **pricing-calc** — quantity × unit price × discount tier + 6% tax, input validation
- **signup-form** — client-side validation (required, email format, password length), success state

The prompts are in `arena/tasks/<task>/task.md`. The human-built reference (100% pass) is in `arena/tasks/<task>/reference/` — the spec was validated against it before any agent ran.

## How it works

```
task.md ──► agent (model + strategy) ──► index.html
                                           │
spec.json (human checks) ──► real headless Chromium ──► PASS/FAIL + evidence
```

Two strategies:

- **single** — the model writes the app once, we grade it.
- **selfcheck** — the model writes the app, we grade it in a real browser, and if it fails we feed the exact failures back and let it fix (up to 2 rounds). This is the Witness MCP loop (package `dsh-verify`), automated.

## Enter the Arena (bring your own agent)

The board is **open entry**: run your model on the same 3 tasks with the same
human checks, then submit the results for maintainer review before inclusion on the board.

```bash
git clone https://github.com/263311487-ux/dsh-verify && cd dsh-verify
npm install && npx playwright install chromium

# Any OpenAI-compatible model: DeepSeek, Claude, GPT, Qwen, local vLLM...
export LLM_API_KEY=sk-...                 # your key
export LLM_BASE_URL=https://api.deepseek.com/v1/chat/completions   # default = DeepSeek
export GITHUB_USER=yourname               # shown as "Submitted by @yourname"

# Run all 3 tasks, single-shot or with the self-check loop:
node arena/run.mjs --agent deepseek-v4-flash/single    --task all --repeat 1 --submitter yourname
node arena/run.mjs --agent "claude-sonnet-4-5/selfcheck" --task all --repeat 1 --submitter yourname
```

Each run writes `arena/results/<model>__<strategy>__<task>__r1.json` (model,
strategy, task, per-round history, final verdict, failures) plus a `--model-label
"My Model"` option for display names.

### Submit your results (2 ways)

1. **PR** (preferred): open a pull request adding your result JSON files from
   `arena/results/`. A maintainer merges them and the leaderboard updates.
   Use the PR template at `.github/PULL_REQUEST_TEMPLATE/arena-entry.md`.
2. **Issue**: open an issue with the JSON files attached and a maintainer will
   add them.

Rules, kept deliberately short:
- Run `--repeat 1` per task, temperature 0.7 (the runner default), no cherry-picking.
- Same 3 tasks, same `spec.json` checks for everyone — that is the whole point.
- The browser is the judge; no LLM reviews your submission.

### Reproduce the existing board

```bash
node arena/run.mjs --agent deepseek-v4-flash/single --task all
node arena/run.mjs --agent deepseek-v4-pro/selfcheck --task all
node arena/leaderboard.mjs   # regenerate the page
```

For new runs, each attempt's `index.html` and the model reply
are kept locally in `arena/work/` (not committed).

## Why this exists

Agents say "done". Their self-tests pass. But *nothing ran the page in a real browser*. Witness (`dsh-verify`) closes that gap; the Arena measures it. If you build agent-delivered web apps, this is the kind of check that catches the difference between "looks done" and "works".
