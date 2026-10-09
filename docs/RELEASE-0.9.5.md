# dsh-verify 0.9.5 — prepared release notes

Registry check on 2026-10-08 returned 0.9.4. Version 0.9.5 is prepared locally; publication is a separate step.

- Add local-only init command with a zero-key passing fixture and an intentional failure report example.
- Refuse every existing destination path, including empty directories and symbolic links; validate arguments before writing.
- Include starter templates, demo fixtures and Chinese documentation in the npm package.
- Synchronize package, lockfile and MCP registry versions.
- Add first-success instructions and explain assertion coverage, image attachments, and spec-review boundaries in both languages.
- Label Arena data as an August 17–18 historical snapshot; distinguish FAIL from ERROR and document missing provenance and unequal repair budgets.
- Require Node.js 20+ because the selected Playwright runtime does not support Node.js 18; CI covers Node.js 20 and 22.

Validation: 31 tests passed, covering Chromium, Firefox, WebKit, MCP, visual regression, CLI initialization, overwrite refusal, and invalid arguments. Six dependency advisories were fixed with MCP SDK 1.32.1 and patched compatible transitive releases; current npm audit reports zero advisories. The packed starter also returned PASS (5/5) and the intentional FAIL (4/5) in real Chromium. No paid LLM calls were made. See the local verification report for evidence.

Release check: version 0.9.5 is not published yet. npm view still reports 0.9.4. The README first-success commands run a source checkout until the npm release exists. Prepublish runs the full tests, fixed demo, exact buggy failure checker, clean-consumer audit and packed browser smoke.
