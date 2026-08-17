# The "browser-verified" badge

Earned, not claimed: an AI agent built your app, and a real browser proved it works.

## 1. Add a spec

`specs/accept.json` — what a human would check:

```json
{
  "title": "my app",
  "serve": "dist",
  "steps": [
    { "action": "goto", "path": "/" },
    { "action": "expect_text", "selector": "h1", "text": "Hello" },
    { "action": "click", "selector": "#dark-toggle" },
    { "action": "expect_style_changed", "selector": "body", "prop": "backgroundColor", "var": "before" }
  ]
}
```

## 2. Wire the GitHub Action

```yaml
name: verify
on: [push]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: 263311487-ux/dsh-verify/.github/actions/dsh-verify@main
        with:
          spec: specs/accept.json
```

## 3. Add the badge to your README

```markdown
[![agent deliverable: browser-verified](https://img.shields.io/badge/agent_deliverable-browser_verified-brightgreen?logo=playwright&logoColor=white)](https://github.com/263311487-ux/dsh-verify)
```

If the checks ever fail, the badge is a lie — and the red X in CI will say so before anyone clicks it.

## Why

Every day, AI agents say "done" and ship apps that don't work. The badge tells the world you are not one of those repos: a real browser opened your app and clicked through the things that matter.
