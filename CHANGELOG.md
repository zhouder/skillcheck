# Changelog

All notable changes are documented here. This project follows Semantic
Versioning.

## [Unreleased]

### Added

- Reproducible real-world validation across six public Agent Skill repositories

### Changed

- Upgrade GitHub workflow examples to current Node 24-based official actions

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
