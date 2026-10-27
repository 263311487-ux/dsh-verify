# Security Policy

## Reporting a vulnerability

If you discover a security issue in dsh-verify, please report it privately:

1. Do **not** open a public issue.
2. Email: 263311487@qq.com with a description and reproduction steps.
3. You will receive a response within 72 hours.

## Scope

- The verification engine (assertion execution, report generation)
- The MCP server (tool exposure, input validation)
- The GitHub Action (workflow injection, secret handling)

## Out of scope

- Third-party plugins or browsers installed by users
- Spec JSON authored by users (that is user data, not dsh-verify code)
- The `init` command's fixture files (static, no network)

## Disclosure

Once a fix is released, a GitHub Security Advisory will be published with credit to the reporter (unless they prefer to remain anonymous).
