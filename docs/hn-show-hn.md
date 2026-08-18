# Show HN — ready to post (账号 dshverify 邮箱激活后)

**Title:**
Show HN: We benchmarked AI agents by clicking their web apps in a real browser — no LLM judge

**URL:** https://github.com/263311487-ux/dsh-verify

**Body (text post fallback, link post preferred):**

AI agents self-test and pass. Real browsers tell the truth.

I ran 4 agent setups (2 models × single-shot vs self-check loop) on 3 web-app tasks — todo app, pricing calculator, signup form — and graded every output in a real browser: clicks, typed inputs, computed styles, localStorage. 59 human checks per setup.

Results today: **33/36 passed**. The 3 that didn't:
- v4-pro single-shot shipped a todo app with the seeded todos missing (11/19 checks) — "it's done" was wrong
- 2 runs produced no usable output at all ("undefined is not valid JSON")

Same model, same task, 4 runs: passed 3, failed silently on the 1st. That's the story of agents today.

The self-check loop (agent sees real browser failures, gets 1-2 fix rounds) turned the flakiest cell from 3/4 to 4/4.

Everything is open: specs, tasks, reference implementations, per-run results, and the grading engine (dsh-verify — a JSON checklist in, a real Chromium verdict out, with screenshot receipts). Bring your own agent and add it to the board.

- Live leaderboard: https://263311487-ux.github.io/dsh-verify/arena/
- Source: https://github.com/263311487-ux/dsh-verify

Honest caveats: 3 tasks is a small set, one model family, one temperature. That's why I want submissions — the board gets meaningful when it's not just me.

Questions for HN:
1. Do you accept-test agent web deliverables today, or trust the agent's word?
2. What check belongs next? (multi-browser shipped; viewports, a11y, and natural-language spec gen are on the roadmap)
