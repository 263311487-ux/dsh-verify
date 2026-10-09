# The "browser-verified" badge

A static badge is an illustration, not a certificate. Link a workflow-status badge to your own workflow and publish the tested commit, specification, run and report. A PASS covers the written assertions only.

## 1. Add a spec

`specs/accept.json` — what a human would check:

```json
{
  "title": "my app",
  "serve": "dist",
  "steps": [
    { "action": "goto", "path": "/" },
    { "action": "expect_text", "selector": "h1", "text": "Hello" },
    { "action": "capture_style", "selector": "body", "prop": "backgroundColor", "var": "before" },
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

This example image never changes when a test fails. Replace it with your own workflow's status badge if you need a current status indicator; readers should inspect the associated report.

## Why

Recorded browser checks help readers inspect what ran. Neither a badge nor a finite set of assertions establishes complete functionality, accessibility, security or independent review.
