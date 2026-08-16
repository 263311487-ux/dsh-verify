# Publishing dsh-verify to npm

Status: **blocked on one manual step** — npm disabled password/CLI account creation
(`403: Account creation via legacy auth is unavailable`). A human must create the
account on the web and verify the email. Everything else is prepared.

## Prerequisites (human, ~2 minutes)

1. Create account at https://www.npmjs.com/signup (username: `263311487-ux`,
   email: `263311487@qq.com`).
2. Click the verification link in the QQ mailbox.
3. Give the agent a publish token (or run `npm login` in the terminal):
   - `npm token create` → paste the token; or
   - `npm login` (web auth) and confirm in the terminal.

## Publish (agent, one command once authenticated)

```bash
cd work/dsh-verify
npm publish
```

Safety net: `prepublishOnly` runs the full engine self-test suite first
(`npm test`) — a broken build cannot be published.

## Package contents (verified)

- `npm pack --dry-run` → 4 files, 8.8 kB: `package.json`, `bin/verify.mjs`, `README.md`, `LICENSE`
- Name `dsh-verify` confirmed available (registry returns 404)
- Runtime dependency `playwright` is fetched on install; browsers need
  `npx playwright install chromium` (documented in README)

## After publish

- Update README "Quick start" to offer `npm install -g dsh-verify`
- Register the package name claim is automatic (we own the name by publishing)
- Consider `npm owner` settings and enabling 2FA on the account
