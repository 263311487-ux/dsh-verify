# Contributing to dsh-verify

Thanks for your interest in improving dsh-verify! This is a small project, so the process is lightweight.

## Ways to contribute

- **Report bugs**: open an issue with the spec JSON, the command you ran, and the report HTML or screenshot.
- **Suggest assertions**: if a common browser check is missing, open an issue with the use case and expected behavior.
- **Improve docs**: typos, unclear steps, missing examples — all welcome.
- **Add features**: check existing issues first, then open one describing what you want to build before starting work.

## Development setup

```bash
git clone https://github.com/263311487-ux/dsh-verify.git
cd dsh-verify
npm ci
npx playwright install chromium
npm test
npm run demo:fixed   # should PASS
npm run demo:buggy    # should FAIL (exit 1)
```

## Pull request checklist

- [ ] `npm test` passes locally
- [ ] `npm run demo:fixed` passes and `npm run demo:buggy` fails (the buggy demo is supposed to fail)
- [ ] New assertions have a test or a demo spec exercising them
- [ ] No new dependencies without justification — keep the install small
- [ ] Commit messages are clear; one logical change per PR

## Spec and report design principles

- A spec is a JSON file, not a framework. Keep it reviewable.
- The browser is the judge — assertions are deterministic, not LLM-judged.
- Reports must be inspectable: every step shows its pass/fail badge, selector, and detail.
- `init` never calls an LLM, launches a browser, or downloads anything beyond the package itself.
