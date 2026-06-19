# Skillcheck Project Status

Last updated: 2026-06-19
Current phase: Public release
Release target: v0.1.0 (npm published; GitHub Release in progress)

## Mission

Build the open-source quality gate for Agent Skills: a fast, deterministic,
cross-client CLI and GitHub Action that validates specification compliance,
finds security and portability risks, measures context cost, and produces a
clear score with actionable fixes.

The primary user promise is:

> Run one command and know whether an Agent Skill is valid, safe, lean, and
> ready to publish.

## Product Decisions

- Product name and CLI command: `skillcheck`
- Repository directory: `skillcheck`
- Published npm package: `@zhouder/skillcheck`
- Runtime: Node.js 20 or newer
- Implementation: TypeScript, ESM
- Initial interfaces: local CLI and GitHub Action
- Initial analysis: deterministic and offline; no API key or model required
- Supported standard: the current Agent Skills specification at
  https://agentskills.io/specification
- Default output: concise terminal report with score, findings, and fixes
- Machine output: JSON and SARIF
- License target: MIT

## Scope For v0.1.0

### Required

- Discover one skill or multiple skills below a directory.
- Parse `SKILL.md` YAML frontmatter and Markdown safely.
- Match the official reference validator's required behavior.
- Check specification, quality, context efficiency, references, portability,
  and high-confidence security risks.
- Assign stable rule IDs, severities, locations, remediation text, and a
  deterministic 0-100 score.
- Support human-readable, JSON, SARIF, and Markdown reports.
- Support configuration, rule suppression, and severity overrides.
- Provide a GitHub Action that annotates pull requests and uploads SARIF.
- Generate Shields-compatible badge JSON.
- Ship tests, fixtures, CI, release metadata, and user documentation.

### Deferred

- Model-backed output evaluation and A/B benchmarks.
- Hosted registry, leaderboard, accounts, or telemetry.
- Automatic remote skill installation.
- Executing untrusted scripts.
- Automatic code modification beyond explicitly requested safe fixes.

## Architecture

Planned package layout:

```text
src/
  cli/          Command parsing and terminal experience
  core/         Discovery, parsing, analysis, scoring, configuration
  rules/        Independent deterministic checks
  reporters/    Pretty, JSON, SARIF, Markdown, and badge output
  action/       GitHub Action entry point
tests/
  fixtures/     Valid and intentionally invalid Agent Skills
docs/           Rule reference and contributor documentation
examples/       Example skill and GitHub workflow
```

Rules return data and do not print or terminate the process. Reporters are
pure presentation layers. The CLI and Action use the same public core API.

## Compatibility Notes

- The published specification describes ASCII names in one place, while the
  official `skills-ref` validator currently accepts Unicode alphanumeric
  names after NFKC normalization. Skillcheck will match the reference
  validator for errors and may issue a separate portability warning.
- `allowed-tools` is experimental and differs between clients. It is parsed
  but treated as a portability/security signal, not universally valid policy.
- Skillcheck never executes files from the skill being checked.

## Definition Of Done For v0.1.0

- [x] Fresh install works on Node.js 20, 22, and 24.
- [x] `skillcheck <path>` analyzes valid and invalid skills correctly.
- [x] Official reference-validator cases have equivalent outcomes.
- [x] All rule behavior is documented and covered by focused tests.
- [x] JSON output conforms to a documented versioned schema.
- [x] SARIF 2.1.0 output is generated and structurally tested.
- [x] GitHub Action runs from its bundled file without package installation.
- [x] No analyzed skill file is executed or modified.
- [x] Lint, typecheck, unit tests, integration tests, and package smoke test pass.
- [x] README includes a 30-second quickstart and representative output.
- [x] A release-candidate review finds no release-blocking defects.

## Progress

- [x] Market and opportunity research
- [x] Product direction selected
- [x] Current Agent Skills specification reviewed
- [x] Official validator behavior reviewed
- [x] npm name checked
- [x] Repository foundation
- [x] Core parser and domain model
- [x] Rule engine and scoring
- [x] Reporters and CLI
- [x] GitHub Action and badge
- [x] Documentation and examples
- [x] Verification loop 1: implementation correctness
- [x] Verification loop 2: security and failure behavior
- [x] Verification loop 3: installation and user experience
- [x] Release candidate review
- [x] Public npm publication and clean-install verification

## Current Risks

1. The Agent Skills specification is evolving. Rules identify their behavior
   through stable IDs, but future spec changes will require compatibility work.
2. Static security checks can create false positives. v0.1.0 favors
   high-confidence findings, precise evidence, and per-rule overrides.
3. A numeric score can imply false precision. Errors, severity counts, and
   evidence remain primary; the score is a compact comparison aid.
4. Early adoption is the main product risk. Distribution, examples, issue
   response, and compatibility updates now matter more than feature breadth.

## Decision Log

### 2026-06-19: Start with deterministic analysis

The first release will work offline without an LLM. This makes CI predictable,
keeps private skills local, and creates a useful foundation for later optional
model-backed evaluations.

### 2026-06-19: Build one package before a monorepo

A single package keeps installation and contribution simple. The core API,
CLI, and Action remain separated by source boundaries so they can be split
later only if real maintenance pressure appears.

### 2026-06-19: Match the official reference implementation

Specification errors should agree with `skills-ref`. Additional Skillcheck
quality, security, and portability findings use distinct rule namespaces so
users can tell standards compliance from recommendations.

## Work Log

### Loop 0 - Research and framing

- Confirmed strong demand around Agent Skills and coding-agent tooling.
- Reviewed the current specification, creation guidance, evaluation guidance,
  and Python reference validator.
- Selected a bounded v0.1.0 that can be tested without external services.

Result: ready to establish the repository foundation.

### Loop 1 - Core implementation

- Added bounded YAML and Markdown parsing, multi-skill discovery, configuration,
  stable finding types, metrics, deterministic scoring, and 27 rules.
- Added pretty, JSON, Markdown, SARIF 2.1.0, and Shields badge reporters.
- Added CLI check/init/rules flows and documented exit codes.

Result: core behavior implemented and strict TypeScript checks passing.

### Loop 2 - Tests and contracts

- Added reference-validator compatibility cases, malicious fixtures, local-link
  checks, scoring/report tests, CLI tests, and JSON Schema validation.
- Verified that analyzed scripts are never executed.
- Final local suite: 47 tests passing.
- Final coverage: 90.01% statements/lines, 84.69% branches, and 95.83%
  functions; configured thresholds are 85/80/85.

Result: published contracts and high-risk behavior have regression coverage.

### Loop 3 - Security and cross-runtime repair

- Cleared all npm audit findings; production dependency tree has seven direct
  packages and zero known vulnerabilities.
- Found a Node 20 Windows junction-classification difference during the runtime
  matrix. Replaced `Dirent` trust with per-path `lstat` in discovery and bundle
  enumeration, then added nested-junction regression coverage.
- Ran the full 47-test suite successfully on Node.js 20, 22, and 24.

Result: the no-symlink-traversal boundary now behaves consistently across the
supported runtime matrix.

### Loop 4 - Packaging and Action

- Built and ran the bundled GitHub Action; verified annotations data, outputs,
  job summary, and SARIF file generation against the clean example.
- Packed and installed `zhouder-skillcheck-0.1.0.tgz` in an isolated system temp
  directory; the installed CLI reported v0.1.0 and scored the example 100/100.
- Final dry-run package is approximately 308 KB compressed and 1.1 MB unpacked.
- Added release CI, Dependabot, security policy, contribution guide, architecture
  guide, rule reference, changelog, example skill, and versioned schemas.
- Initialized a local Git repository on branch `main` and ran whitespace/risk
  marker review with no release-blocking findings.

Result: v0.1.0 passed the local release-candidate gate.

### Loop 5 - GitHub publication

- Added repository metadata for `zhouder/skillcheck` and replaced every owner
  placeholder in documentation and workflow examples.
- Created root commit `0b7e68d` and pushed `main` to the public GitHub repository.
- Made the tag release workflow idempotent so a manually bootstrapped npm
  version is detected and skipped instead of failing as a duplicate publish.

Result: GitHub source publication is complete.

### Loop 6 - npm publication

- Enabled npm write protection with a Security Key and completed browser-backed
  publication authentication.
- npm rejected the unscoped name because it was too similar to `skill-check`;
  migrated package metadata, documentation, and schema IDs to
  `@zhouder/skillcheck`.
- Published `@zhouder/skillcheck@0.1.0` publicly and verified it through a clean
  registry install. The installed CLI reported v0.1.0, scored the example
  100/100, and installed with zero audit findings.

Result: npm publication is complete; GitHub release tagging is the active step.

## Handoff Protocol For Other Coding Agents

1. Read this file and `AGENTS.md` before changing code.
2. Inspect `git status` and preserve unrelated user changes.
3. Keep deterministic analysis offline and never execute analyzed skill files.
4. Add or update tests for every behavioral change.
5. Run the relevant checks before marking work complete.
6. Update the Progress, Decision Log, Current Risks, and Work Log sections when
   scope, behavior, or project state changes.
7. Do not mark an item complete based only on implementation; verification must
   pass.

## Next Step

Tag `v0.1.0`, update the moving `v0` GitHub Action tag, create the GitHub Release,
and begin launch distribution and early-user feedback collection.
