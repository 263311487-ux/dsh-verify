# Show HN — 最终稿 (账号 dshverify 可发后直接粘贴)

**Title:**
Show HN: We benchmarked AI agents by clicking their web apps in a real browser — no LLM judge

**URL:** https://263311487-ux.github.io/dsh-verify/

**Body (text post fallback, link post preferred):**

AI agents self-test and pass. Real browsers tell the truth.

I ran 4 agent setups (2 models × single-shot vs self-check loop) on 3 web-app tasks — todo app, pricing calculator, signup form — 12 runs each, and graded every output in a real browser: clicks, typed inputs, computed styles, localStorage. 48 runs total.

Results: **44/48 passed**. The 4 that didn't:
- 2 runs produced no usable output at all — the model returned `"undefined" is not valid JSON`
- 2 todo-app runs shipped with the seeded todos missing (9/19 and 11/19 checks failed) — "it's done" was wrong

Same model, same task, 4 runs: passed 3, failed silently on the 1st. That's the story of agents today.

The self-check loop (agent sees real browser failures, gets a fix round) turned the flakiest task — the todo app — from **6/8 to 8/8**. The gap isn't intelligence; it's verification.

Everything is open: specs, tasks, reference implementations, per-run results, and the grading engine (**Witness**, package `dsh-verify` — a JSON checklist in, a real Chromium verdict out, with screenshot receipts). Bring your own agent and add it to the board.

- Live leaderboard: https://263311487-ux.github.io/dsh-verify/arena/
- Landing page: https://263311487-ux.github.io/dsh-verify/
- Source: https://github.com/263311487-ux/dsh-verify
- npm (2.9k downloads last week): https://www.npmjs.com/package/dsh-verify
- MCP server: https://glama.ai/mcp/servers/263311487-ux/dsh-verify

Honest caveats: 3 tasks is a small set, one model family, one temperature. That's why I want submissions — the board gets meaningful when it's not just me.

Questions for HN:
1. Do you accept-test agent web deliverables today, or trust the agent's word?
2. What check belongs next? (multi-browser shipped; viewports, a11y, natural-language spec gen on the roadmap)
