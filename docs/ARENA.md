# Agent Arena

**Can AI agents ship *working* web apps?** Same task, same prompt, same human checks — different agents, graded by [Witness](https://github.com/263311487-ux/dsh-verify) (`dsh-verify` on npm) in a real browser. No LLM judges the outcome. **The browser is the judge.**

Live leaderboard: <https://263311487-ux.github.io/dsh-verify/arena/>

## The seed result (2026-08-17)

| Agent setup | Todo app | Pricing calc | Signup form | Pass |
|---|---|---|---|---|
| DeepSeek v4-flash · single shot | ❌ 9/19 | ✅ 22/22 | ✅ 18/18 | 2/3 |
| DeepSeek v4-flash · self-check loop | ✅ 19/19 | ✅ 22/22 | ✅ 18/18 | 3/3 |
| DeepSeek v4-pro · single shot | ✅ 19/19 | ✅ 22/22 | ✅ 18/18 | 3/3 |
| DeepSeek v4-pro · self-check loop | ✅ 19/19 | ✅ 22/22 | ✅ 18/18 | 3/3 |

The one failure is the interesting one: DeepSeek v4-flash single-shot built a todo app that **started with zero seeded todos** — the task said "seed exactly three todos" and the agent skipped it. 9 of 19 real-browser checks failed. The same model with a **self-check loop** (it sees the real-browser failures and fixes, up to two rounds) passed 19/19.

Observations, honestly stated:

- **LLM output is nondeterministic.** We ran flash/single on the todo task twice: once it passed 19/19, once it failed 9/19. A single run can flip. That's why re-running matters, and why a deterministic check is more valuable than a model's self-report.
- **Self-check helped in exactly the case that mattered** (the failed task), and never hurt.
- This is a **seed batch**: one run per cell. The framework is designed to be re-run — with your model, your harness, your budget.

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

## Reproduce / add your agent

```bash
git clone https://github.com/263311487-ux/dsh-verify && cd dsh-verify
npm install && npx playwright install chromium
export DEEPSEEK_API_KEY=sk-...

node arena/run.mjs --agent deepseek-v4-flash/single --task all
node arena/run.mjs --agent deepseek-v4-pro/selfcheck --task all

node arena/leaderboard.mjs   # regenerate the page
```

To add an agent: drop a new adapter into `arena/run.mjs` (the model call is the only agent-specific part — swap the `chat()` provider for your model/harness) and run. The checks are the same for everyone.

Results land in `arena/results/` as JSON (model, strategy, task, per-round history, final verdict, failures). Raw evidence is reproducible: each attempt's `index.html` and the model reply are kept locally in `arena/work/` (not committed).

## Why this exists

Agents say "done". Their self-tests pass. But *nothing ran the page in a real browser*. Witness (`dsh-verify`) closes that gap; the Arena measures it. If you build agent-delivered web apps, this is the kind of check that catches the difference between "looks done" and "works".
