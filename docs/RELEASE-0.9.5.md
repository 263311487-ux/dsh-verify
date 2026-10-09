# dsh-verify 0.9.5 — prepared release notes

Registry check on 2026-10-08 returned 0.9.4. Version 0.9.5 is prepared locally; publication is a separate step.

- Add local-only init command with a zero-key passing fixture and an intentional failure report example.
- Refuse every existing destination path, including empty directories and symbolic links; validate arguments before writing.
- Include starter templates, demo fixtures and Chinese documentation in the npm package.
- Synchronize package, lockfile and MCP registry versions.
- Add first-success instructions and explain assertion coverage, image attachments, and spec-review boundaries in both languages.
- Label Arena data as an August 17–18 historical snapshot; distinguish FAIL from ERROR and document missing provenance and unequal repair budgets.

Validation: 26 tests passed, covering Chromium, Firefox, WebKit, MCP, visual regression, CLI initialization, overwrite refusal, and invalid arguments. Six dependency advisories were fixed with MCP SDK 1.32.1 and patched compatible transitive releases; current npm audit reports zero advisories. No paid LLM calls were made. Review the separate local verification report for packed-install checks.

Release check: version 0.9.5 is not published yet. npm view still reports 0.9.4. The README first-success command installs the public GitHub main branch until the npm release exists.
