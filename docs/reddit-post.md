# Reddit r/LocalLLaMA post — ready to paste

**Title (choice 1):**
Agents self-test and pass. Real browsers tell the truth.

**Title (choice 2):**
4 agents reviewed my demo as "no issues found" — the dark-mode toggle did literally nothing in a real browser. I turned that into an open-source tool.

---

**Body:**

Story time: I ran a 4-agent web team (spec writer → frontend dev → QA agent → reviewer) inside DeepSeek Harness. The brief was a page with a counter and a dark-mode toggle. Team self-review: **"no issues found."**

In a real browser, the toggle did nothing. The JS toggled a `.dark` class, but the CSS rule for `.dark` was never written. Every agent check passed because there was nothing to run — no one opened a browser.

That gap is structural, not a skill issue: agent teams verify against a *shared belief* about the code, not against the *user's experience*. The only fix is an independent check that doesn't share the team's blind spots.

So I built **dsh-verify** (MIT, ~zero deps, npm + GitHub Action + MCP server):

- Write a JSON checklist of what a human would check: `goto → click → expect_text → capture_style → expect_style_changed`
- It drives real headless Chromium and asserts **computed styles**, not DOM class lists (that's the check that catches "class toggled but CSS never written")
- Returns an HTML report + exit code 0/1, drops into CI in one step
- `dsh-verify gen --url <url> --run`: an LLM drafts the checklist, the deterministic browser enforces it — the AI never judges its own work
- Visual regression: pixel-diff screenshot baselines with red-highlight diff images
- MCP server so Claude Code / Cursor agents can verify deliverables themselves
- The repo ships the buggy and fixed builds side by side as proof: buggy FAIL 10/11, fixed PASS 11/11, same page, one missing CSS rule

Repo: https://github.com/263311487-ux/dsh-verify
Try in 2 minutes: `npx dsh-verify demo:buggy` (fails) then `npx dsh-verify demo:fixed` (passes).

Questions for the community:
1. Do you run acceptance checks on agent-delivered web artifacts today? How?
2. What's the next check that belongs in the box? (Roadmap: firefox/webkit matrix ✓ shipped, mobile viewports, natural-language spec generation)
3. Hit the same "self-test green, browser red" wall? Tell the story — I want receipts in the README.

*(Posted with permission; this is my own project.)*
