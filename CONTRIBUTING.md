# Contributing

## Before Starting

Read `PROJECT_STATUS.md`, `AGENTS.md`, and `docs/ARCHITECTURE.md`. Discuss large
scope changes before implementation so the offline and deterministic product
boundary remains intact.

## Setup

```bash
npm install
npm run check
```

Node.js 20.12 or newer is required. CI also verifies Node.js 22 and 24.

## Pull Requests

- Keep changes focused.
- Add tests for behavioral changes and false-positive-sensitive rules.
- Keep rule IDs stable after release.
- Update documentation and schemas with contract changes.
- Run `npm run check`, `npm run test:coverage`, and `npm run build:all`.
- Do not commit secrets, generated archives, or unrelated formatting changes.

## Rule Quality

A new security rule needs concrete malicious examples and at least one nearby
benign example. Prefer a narrow high-confidence rule over a broad noisy rule.
Every finding needs evidence and a remediation the user can act on.
