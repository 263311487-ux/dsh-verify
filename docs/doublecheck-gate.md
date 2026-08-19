# dsh-doublecheck × dsh-verify — the honest-delivery pipeline

Two complementary guarantees for agent-built web apps:

> **dsh-doublecheck keeps the evidence honest; dsh-verify keeps the browser honest.**

- [dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck) — the delivery quality gate for DeepSeek Harness: grills requirements before the first edit, requires failing→passing test evidence, audits the delivery against the spec, and emits one **deliverable / rework required** verdict.
- [dsh-verify](https://github.com/263311487-ux/dsh-verify) — independent browser acceptance testing: a JSON checklist of human checks in, a real Chromium (Firefox/WebKit) verdict out, with screenshot receipts. No LLM judges; the browser is the judge.

## Why they belong together

A gate can be fully green while the page is still broken — if the evidence was self-asserted instead of browser-observed. And a browser verdict alone doesn't tell you *whether the requirements were ever understood*.

The combined pipeline closes both gaps:

1. **dsh-doublecheck /gate** — requirements interrogation → red/green test evidence → diff↔spec consistency → adversary review → gate verdict (evidence layer).
2. **dsh-verify** — human-style browser checks on the delivered artifact: click, fill, text, classes, **computed styles**, console/network errors, pixels (reality layer).

## Install

```bash
# dsh side
dsh plugin --profile web add dsh-doublecheck

# browser side (any machine / CI)
npx -y dsh-verify --help        # or: npm i -g dsh-verify
npx playwright install chromium
```

## Pipeline

```bash
# 1. Evidence gate inside the dsh session
/gate run                       # requirements + tests + consistency + review → verdict

# 2. Browser acceptance on the delivered build
npx dsh-verify --spec specs/delivery.json --out report/
# exit 0 = deliverable, exit 1 = rework (CI-friendly)
```

## Live proof: same page, one missing CSS rule

This repo's demo is the canonical case — a 4-agent team self-reviewed the build as "no issues found" while the dark-mode toggle did literally nothing.

| Build | Evidence gate says | Real browser says (dsh-verify) |
|---|---|---|
| `demo/buggy` (`.dark` CSS never written) | "All requirements met" | ❌ **FAIL (10/11)** — `expect_style_changed #page: before "rgb(18,22,31)" now "rgb(18,22,31)"` |
| `demo/fixed` (one CSS rule added) | — | ✅ **PASS (11/11)** |

```bash
npm run demo:fixed   # PASS (11/11), report: /tmp/joint-fixed/report.html
npm run demo:buggy   # FAIL (10/11) — the missing .dark rule, caught by a real browser
```

The gate proves the team did its discipline. The browser proves the page actually works. Both are needed.

## Joint report template

Paste into the PR description:

```markdown
**Evidence gate (dsh-doublecheck /gate):** ✅ deliverable
- Requirements interrogation: 6/6 confirmed · Spec committed
- Test evidence: red run on record, latest green · no post-green failures

**Browser acceptance (dsh-verify):** ✅ PASS (11/11)
- Screenshots + diff images in the run report
- Exit code 0

**Verdict:** deliverable — evidence is honest, browser is happy.
```

## Status

- dsh-doublecheck v0.7.x (DSH 0.1.0-rc.6) · dsh-verify v0.8.x (MCP + CLI + GitHub Action)
- This is a community integration guide; both tools remain independent and MIT/Apache-2.0 licensed.
