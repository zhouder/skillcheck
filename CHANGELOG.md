# Changelog

All notable changes are documented here. This project follows Semantic
Versioning.

## [Unreleased]

### Added

- End-to-end CI smoke coverage for successful and failing GitHub Action runs
- Release validation that rejects tags which do not match `package.json`
- Explicit findings when scripts or reference text cannot be fully scanned
- Bounded package enumeration across files, directories, entries, and depth
- Installation testing for the packed npm artifact and a real local Action run through `action.yml`

### Changed

- Read the reported Skillcheck version from package metadata instead of a duplicate constant
- Cache bounded text-file reads across rules analyzing the same skill
- Escape untrusted Markdown and HTML in generated reports
- Make badges prioritize project errors and warnings over an otherwise high skill score
- Limit GitHub annotations to 100 while retaining complete Markdown and SARIF output
- Ignore common dependency, VCS, environment, coverage, and build directories inside a skill package
- Verify the committed GitHub Action bundle in both CI and release workflows

### Fixed

- Correct the scoped npm package URL in SARIF metadata
- Keep the committed GitHub Action bundle synchronized with its TypeScript source

## [0.1.1] - 2026-06-19

### Added

- Reproducible real-world validation across six public Agent Skill repositories

### Changed

- Upgrade GitHub workflow examples to current Node 24-based official actions
- Calibrate scoring with diminishing repeated-rule penalties and smooth decay

### Fixed

- Avoid prompt-override findings for explicitly defensive injection examples
- Avoid credential-access findings for messages that only name credential variables

## [0.1.0] - 2026-06-19

### Added

- Offline Agent Skills discovery and parsing
- Specification, security, quality, efficiency, and portability rules
- Deterministic scoring and grades
- Pretty, JSON, Markdown, SARIF, and badge reports
- JSON-only configuration and stable rule overrides
- GitHub Action annotations, outputs, summary, and SARIF generation
- `init` and `rules` commands
