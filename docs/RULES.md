# Rule Reference

Skillcheck v0.1.1 ships deterministic rules in five categories. Every finding
includes a stable rule ID, severity, source location, evidence when available,
and a remediation.

## Specification

| Rule | Default | Purpose |
| --- | --- | --- |
| `spec/unknown-field` | error | Reject frontmatter fields outside the specification |
| `spec/name` | error | Validate length, case, characters, and hyphen placement |
| `spec/directory-name` | error | Require the directory and normalized skill name to match |
| `spec/description` | error | Require a non-empty description of at most 1024 characters |
| `spec/compatibility` | error | Validate the optional 500-character compatibility string |
| `spec/metadata` | error | Require flat string key-value metadata |
| `spec/optional-field-type` | error | Require string license and allowed-tools values |

Parser failures use `parse/*` IDs and are always reported independently of
rule overrides because later checks cannot safely reinterpret malformed input.

## Security

| Rule | Default | Purpose |
| --- | --- | --- |
| `security/remote-execution` | error | Detect download-to-shell and remote expression execution |
| `security/destructive-command` | error | Detect broad recursive deletion and disk formatting |
| `security/credential-access` | warning | Detect reading or printing credential material |
| `security/prompt-override` | warning | Detect instruction bypass and concealment language |
| `security/sensitive-file` | error | Detect bundled credential files and private-key markers |
| `security/symlink-outside` | error | Detect symbolic links escaping the skill directory |
| `security/insecure-url` | warning | Detect public resources loaded over plain HTTP |

These checks are static heuristics. They do not execute scripts and do not
claim to establish that an unflagged skill is safe.

## Quality

| Rule | Default | Purpose |
| --- | --- | --- |
| `quality/instructions` | warning | Require a useful instruction body |
| `quality/discoverable-description` | warning | Encourage capability and activation keywords |
| `quality/license` | info | Encourage clear reuse terms |
| `quality/duplicate-heading` | info | Find repeated section names |
| `quality/local-reference` | error | Find missing or escaping local Markdown links |
| `quality/deep-reference` | warning | Keep progressive-disclosure resources shallow |

## Efficiency

| Rule | Default | Purpose |
| --- | --- | --- |
| `efficiency/context-budget` | warning | Enforce the recommended 500-line/5000-token budget |
| `efficiency/large-resource` | warning | Find individual resources larger than 1 MiB |
| `efficiency/package-size` | warning | Find packages over 10 MiB or 250 files |

Token counts are estimates: approximately four ASCII characters per token and
1.5 non-ASCII characters per token. They are intended for trend comparison,
not billing.

## Portability

| Rule | Default | Purpose |
| --- | --- | --- |
| `portability/unicode-name` | info | Note clients that still document ASCII-only names |
| `portability/allowed-tools` | info | Note experimental tool pre-approval syntax |
| `portability/symlink` | warning | Find links that archives or operating systems may lose |
| `portability/hardcoded-home` | warning | Find machine-specific user paths |

## Configuration Behavior

An override changes both display severity and failure behavior:

```json
{
  "rules": {
    "quality/license": "error",
    "security/insecure-url": "off"
  }
}
```

Unknown rule IDs produce `config/unknown-rule` so stale configurations cannot
silently disable protection.
