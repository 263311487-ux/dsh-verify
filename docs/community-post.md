# Community post draft — "Agents self-test and pass. Real browsers tell the truth."

> Status: draft, ready for review before posting to deepseek-harness discussions / r/LocalLLaMA / HN.
> Author note: this is the story that ships with dsh-verify (github.com/263311487-ux/dsh-verify).

---

**TL;DR** — We ran a 4-agent web team inside DeepSeek Harness. The team self-reviewed as "no issues found". In a real browser, the dark-mode toggle button did nothing: the `.dark` class was toggled by JS, but the CSS rule for `.dark` was never written. We turned that failure into a tiny open-source tool: **dsh-verify** — write a JSON spec of what a human would check, it drives a real headless Chromium, and returns an HTML report + exit code. Buggy build FAILS, fixed build PASSES, same page, one missing CSS rule.

## Why this matters for the agent ecosystem

Agent evaluation today is dominated by macro metrics: task success rate, tool-call accuracy, benchmark scores. Those numbers are computed against what the agent *believes* it built — code the agent wrote, checked by the agent.

What almost nobody checks: **does the delivered artifact work in the environment a real user actually uses?**

Our reproduction of the failure chain:

1. Spec writer defines the page (counter + theme toggle)
2. Frontend dev implements both buttons
3. QA agent runs "self-tests" — there is nothing to run, page is static
4. Reviewer reads the code and the self-tests, approves
5. **No one opened a browser** → the toggle does nothing in the real DOM

The gap is structural, not a skill issue: agent teams verify against a shared belief, not against the user's experience. The only fix is an **independent** check that does not share the team's blind spots.

## What dsh-verify does (now)

- JSON spec, no framework: `goto` → `click` → `expect_text` → `capture_style` → `expect_style_changed`
- Real Chromium via Playwright (headless by default)
- Verifies **computed styles**, not DOM class lists — the check that catches "class toggled but CSS never written"
- **Visual regression**: pixel-level screenshot baselines (`expect_screenshot`) with red-highlight diff images
- **AI-drafted checklists**: `dsh-verify gen --url <url> --run` — LLM drafts, deterministic browser enforces (the AI never judges)
- **MCP server** for Claude Code / Cursor / Copilot: `verify_spec`, `verify_url`, `generate_and_verify`
- **GitHub Action** for one-step CI acceptance with report artifact
- HTML report with screenshots, exit code 0/1, `--json` for CI

The check that would have caught our bug:

```json
{ "action": "capture_style", "selector": "#page", "prop": "backgroundColor", "var": "bg_before" },
{ "action": "click", "selector": "#color-btn" },
{ "action": "expect_style_changed", "selector": "#page", "prop": "backgroundColor", "var": "bg_before" }
```

## Live evidence (real Playwright output, committed in the repo)

| Build | Agent self-review | Real browser verdict |
|---|---|---|
| `demo/buggy` — `.dark` rule missing | "No issues found" | ❌ FAIL 10/11 — background never changes |
| `demo/fixed` — one CSS rule added | fixed | ✅ PASS 11/11 |

Screenshots and full step-by-step reports live in `evidence/` so anyone can re-run and reproduce.

## Why nothing else does this

We researched the agent-tooling community before building. Existing "verification" for agent deliverables is:
- **Install/plugin smoke checks** — does a skill install, does a CLI exist
- **Static lint / unit tests** — validate code the agent wrote, not behavior the user sees
- **Screenshot-only agents** — look at a picture, don't assert behavior

None of them answer: *"When I click this button, does the user see the change?"* That's the niche dsh-verify fills — deliberately small, JSON in, browser verdict out.

## Try it (2 minutes)

```bash
git clone https://github.com/263311487-ux/dsh-verify
cd dsh-verify
npm install
npx playwright install chromium
npm run demo:buggy   # FAIL — the exact bug from this post
npm run demo:fixed   # PASS
```

## Ask

- Do you run acceptance checks on agent-delivered web artifacts today? How?
- What's the next check that should be in the box? (On the roadmap: firefox/webkit matrix, mobile viewports, natural-language spec generation without a running page)
- If you've hit the same "self-test green, browser red" wall, tell the story — we want receipts in the README.
