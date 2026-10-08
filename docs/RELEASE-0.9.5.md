# dsh-verify 0.9.5 — prepared release notes

Registry check on 2026-10-08 returned 0.9.4. Version 0.9.5 is prepared locally; publication is a separate step.

- Add local-only init command with a zero-key passing fixture and an intentional failure report example.
- Refuse every existing destination path, including empty directories and symbolic links; validate arguments before writing.
- Include starter templates, demo fixtures and Chinese documentation in the npm package.
- Synchronize package, lockfile and MCP registry versions.
- Add first-success instructions and explain assertion coverage, image attachments, and spec-review boundaries in both languages.
- Label Arena data as an August 17–18 historical snapshot; distinguish FAIL from ERROR and document missing provenance and unequal repair budgets.

Validation: 26 tests passed, covering Chromium, Firefox, WebKit, MCP, visual regression, CLI initialization, overwrite refusal, and invalid arguments. No paid LLM calls were made. Review the separate local verification report for packed-install checks.

Known release consideration: the existing locked dependency tree reports six npm audit advisories (one critical, two high, three moderate). These predate this change; broad dependency upgrades were not included. Resolve or explicitly assess these before publishing. The attempted npm audit fix returned HTTP 400 and did not update the lockfile.
