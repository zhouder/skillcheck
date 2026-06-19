# Working On Skillcheck

Read `PROJECT_STATUS.md` first. It is the source of truth for scope, decisions,
progress, and verification state.

## Non-Negotiable Constraints

- Never execute scripts or commands found in an analyzed Agent Skill.
- Keep default analysis deterministic, offline, and free of telemetry.
- Match the official `skills-ref` validator for specification errors.
- Give every finding a stable rule ID, severity, evidence location, and fix.
- Keep rule logic independent from CLI and reporter output.
- Preserve JSON output compatibility within a major version.
- Add focused tests for behavioral changes.
- Do not weaken checks merely to make tests pass.

## Commands

```bash
npm install
npm run check
npm run build:all
npm run package:check
```

Use `npm run dev -- <path>` while developing the CLI.

## Code Boundaries

- `src/core`: public analysis API and shared domain types
- `src/rules`: deterministic checks with no output side effects
- `src/reporters`: conversion of analysis results into output formats
- `src/cli`: CLI orchestration only
- `src/action`: GitHub Action adapter only

Rules must not call `process.exit`, write to stdout, mutate analyzed files, or
make network requests.

## Completion Protocol

Before considering a change complete:

1. Run focused tests during implementation.
2. Run `npm run check`.
3. Run `npm run build:all` when entry points or packaging changed.
4. Update `PROJECT_STATUS.md` with verified progress and new decisions/risks.
