# Reddit 短帖 (r/SideProject + r/LocalLLaMA 可复用)

**r/SideProject title:**
I built an open-source "witness" that clicks your AI's web app in a real browser — agents self-test and pass, the browser tells the truth

**Body:**

TL;DR: when an AI agent says "done" on a web app, its self-review is worthless — it checks the code it just wrote, not what a user experiences. I built [Witness](https://263311487-ux.github.io/dsh-verify/) (`dsh-verify`): write a JSON checklist of what a human would check, it drives real Chromium, returns PASS/FAIL with screenshot receipts. CLI, MCP server (Claude Code/Cursor/Copilot), GitHub Action.

Why: our 4-agent web team self-reviewed "no issues found" — the dark-mode toggle did nothing because one CSS rule was never written. No one opened a browser.

Data so far (48 real-browser runs across 4 agent setups): 44/48 passed. The failures: 2 runs returned `"undefined" is not valid JSON`, 2 shipped a todo app missing its seeded todos. The self-check loop lifted the worst task from 6/8 to 8/8.

Open leaderboard — bring your own agent: https://263311487-ux.github.io/dsh-verify/arena/
Repo: https://github.com/263311487-ux/dsh-verify
npm (2.9k downloads/week): https://www.npmjs.com/package/dsh-verify

Happy to hear what check you'd want next.
