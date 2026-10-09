# Changelog

## 0.9.5 — prepared, not yet published

- Add a safe, local-only `dsh-verify init` starter with a runnable zero-key browser check and an intentional failure fixture.
- Refuse existing init destinations, including empty directories, files, and symlinks.
- Add exact CI/release assertions for the buggy demo and a packed-tarball smoke test.
- Update MCP SDK and compatible transitive dependency overrides; `npm audit` reports zero advisories in the lockfile.
- Clarify bilingual quickstart, report evidence boundaries, and the historical Arena sample limitations.
- Require Node.js 20+ (the Playwright 1.62 runtime does not support Node.js 18); CI exercises Node.js 20 and 22.

The npm registry still serves 0.9.4. Publish 0.9.5 only after reviewing the prepared release notes and running the release checks.
