# Architecture

## Design Goals

1. Deterministic offline analysis
2. No execution or mutation of analyzed skills
3. One public core shared by CLI and GitHub Action
4. Stable rule IDs and versioned machine output
5. Small, independently testable rule modules

## Data Flow

```text
paths + JSON config
        |
        v
safe discovery (no symlink traversal)
        |
        v
bounded SKILL.md/YAML/Markdown parsing
        |
        v
spec + security + quality + efficiency + portability rules
        |
        v
deterministic scoring and report model
        |
        +--> terminal
        +--> JSON
        +--> Markdown
        +--> SARIF
        +--> Shields badge JSON
```

## Boundaries

- `src/core` owns discovery, parsing, configuration, analysis, scoring, and the
  public result types.
- `src/rules` owns checks. A rule returns data and has no output or process side
  effects.
- `src/reporters` converts the shared report model without rerunning analysis.
- `src/cli` owns arguments, file output, and exit codes.
- `src/action` maps the core model to GitHub annotations and job summaries.

## Trust Model

Analyzed files are attacker-controlled. Discovery uses `lstat` and does not
follow directory symbolic links. Parsing is size-bounded, YAML duplicate keys
are rejected, alias expansion is capped, text scanning is bounded per file and
per skill, and configuration is JSON-only.

## Compatibility Strategy

Specification rules track the official `skills-ref` reference validator.
Skillcheck-only recommendations use separate category-prefixed IDs. The current
reference validator accepts normalized Unicode alphanumeric names while some
client documentation still says ASCII-only; therefore Unicode is spec-valid
and receives only a portability note.

## Scoring Model

Each finding starts with a severity penalty and a category multiplier. Findings
with the same rule ID, severity, and category are grouped so repeated evidence
uses the harmonic multiplier `H(n) = 1 + 1/2 + ... + 1/n`. This preserves the
importance of repeated evidence without treating six instances of one root
cause like six independent design failures.

The grouped penalty is converted to a score with
`round(100 * exp(-penalty / 90))`. The smooth decay retains the calibrated
impact of a single finding while avoiding the abrupt saturation caused by
linear subtraction. Errors and individual findings remain authoritative; the
score is only a comparison aid.

## Adding A Rule

1. Choose a category and stable ID.
2. Define metadata and a deterministic check in `src/rules`.
3. Register it in `src/rules/index.ts`.
4. Add positive, negative, and false-positive-focused tests.
5. Document it in `docs/RULES.md`.
6. Update `PROJECT_STATUS.md` if scope or risk changes.
