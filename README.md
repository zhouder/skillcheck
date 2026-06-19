# Skillcheck

**Know whether an Agent Skill is valid, safe, lean, and ready to publish.**

Skillcheck is an offline quality gate for the open
[Agent Skills specification](https://agentskills.io/specification). It validates
`SKILL.md`, scans bundled files for high-confidence risks, measures context cost,
and produces reports that work locally and in GitHub Actions.

```text
Skillcheck 0.1.0

csv-review  100/100 A
examples/csv-review/SKILL.md | 2 files | ~88 context tokens
  OK  No findings

1 skill | 0 errors | 0 warnings | 0 info
```

## Why Skillcheck

- **Spec-compatible:** covers the official metadata and naming constraints.
- **Security-aware:** detects direct remote execution, broad deletion,
  credential access, bundled keys, prompt overrides, unsafe links, and escaping
  symbolic links.
- **Context-conscious:** flags oversized instructions and packages before they
  consume an agent's context window.
- **Cross-client:** highlights experimental and non-portable behavior without
  locking analysis to one agent product.
- **Private by default:** deterministic, offline, no telemetry, no API key, and
  no execution of analyzed scripts.
- **CI-ready:** pretty, JSON, Markdown, SARIF 2.1.0, and Shields endpoint output.

## Quickstart

Node.js 20.12 or newer is required.

```bash
npx skillcheck ./my-skill
```

Analyze every skill below a repository:

```bash
npx skillcheck .
```

Generate machine-readable reports:

```bash
npx skillcheck . --format json --output skillcheck.json
npx skillcheck . --format sarif --output skillcheck.sarif
npx skillcheck . --format markdown --output skillcheck.md
npx skillcheck . --format badge --output skillcheck-badge.json
```

Create a minimal skill:

```bash
npx skillcheck init ./skills/csv-review
```

## Exit Codes

| Code | Meaning |
| ---: | --- |
| `0` | Analysis completed and did not reach the failure threshold |
| `1` | A finding reached the configured failure threshold |
| `2` | Invalid command, configuration error, or internal failure |

The default threshold is `error`. Change it from the command line:

```bash
npx skillcheck . --fail-on warning
npx skillcheck . --fail-on never
```

## Configuration

Skillcheck searches upward for `.skillcheckrc.json` or
`skillcheck.config.json`. Configuration is JSON-only so loading configuration
never executes project code.

```json
{
  "$schema": "https://unpkg.com/skillcheck/schema/config.schema.json",
  "ignore": ["**/vendor/**", "**/generated/**"],
  "maxDepth": 8,
  "failOn": "warning",
  "rules": {
    "quality/license": "error",
    "portability/unicode-name": "off"
  }
}
```

Rule settings are `off`, `info`, `warning`, or `error`. Run
`skillcheck rules` or read [the rule reference](docs/RULES.md) for IDs.

## GitHub Action

```yaml
name: Skillcheck
on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  skillcheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: zhouder/skillcheck@v0
        with:
          path: skills
          fail-on: warning
          sarif-file: skillcheck.sarif
```

The Action adds file annotations, writes a job summary, exposes score/count
outputs, and optionally writes SARIF. Uploading SARIF to GitHub code scanning is
an explicit repository decision and requires `security-events: write`.

## Badge

The `badge` format emits a
[Shields endpoint](https://shields.io/badges/endpoint-badge) document:

```json
{
  "schemaVersion": 1,
  "label": "skillcheck",
  "message": "A 100/100",
  "color": "brightgreen"
}
```

Commit the generated JSON or publish it as a build artifact, then point a
Shields endpoint badge at its raw URL.

## Scoring

Every skill starts at 100. Findings subtract weighted penalties based on
severity and category. Specification and security errors have greater weight
than quality or portability notes. The score is a compact comparison aid, not
a safety guarantee; evidence and individual findings remain authoritative.

| Grade | Score |
| --- | ---: |
| A | 90-100 |
| B | 80-89 |
| C | 70-79 |
| D | 60-69 |
| F | 0-59 |

## Security Model

Skillcheck treats every analyzed skill as untrusted input. It does not execute
scripts, follow symbolic links during discovery, load JavaScript configuration,
or make network requests. Static checks intentionally favor high-confidence
findings, but they cannot prove a skill safe. See [SECURITY.md](SECURITY.md).

## Development

```bash
npm install
npm run check
npm run test:coverage
npm run build:all
npm run package:check
```

See [CONTRIBUTING.md](CONTRIBUTING.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md),
and [PROJECT_STATUS.md](PROJECT_STATUS.md) before making behavioral changes.

## License

MIT
