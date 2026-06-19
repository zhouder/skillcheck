# Real-World Validation

Snapshot date: 2026-06-19

This snapshot tests Skillcheck against public Agent Skills from six independent,
widely used repositories. It is a compatibility and false-positive review, not
an endorsement of the sampled projects.

The results were produced from the current `main` branch after the unreleased
precision fixes and scoring calibration described below. npm v0.1.0 does not
yet include these refinements.

## Method

1. Sparse-clone only the selected skill directory at the recorded commit.
2. Build Skillcheck from source without running any third-party skill script.
3. Scan each directory three times with JSON output and `--fail-on never`.
4. Require all three JSON reports to be byte-for-byte identical.
5. SHA-256 every input file before and after scanning and require no changes.
6. Record the median wall-clock duration on the Windows development host.

The six samples contain 207 files and approximately 48,285 estimated context
tokens. Every scan was deterministic and left every input file unchanged.

## Results

| Case | Score | Findings (E/W/I) | Files | Tokens | Median |
| --- | ---: | ---: | ---: | ---: | ---: |
| [Anthropic PDF](https://github.com/anthropics/skills/tree/57546260929473d4e0d1c1bb75297be2fdfa1949/skills/pdf) | 100 A | 0/0/0 | 12 | 1,887 | 1.62 s |
| [Vercel React best practices](https://github.com/vercel-labs/agent-skills/tree/f8a72b9603728bb92a217a879b7e62e43ad76c81/skills/react-best-practices) | 79 C | 1/0/0 | 76 | 1,702 | 1.73 s |
| [Addy Osmani browser testing](https://github.com/addyosmani/agent-skills/tree/13e43f2310224d5770a7fb0a8c24c02b73da69e9/skills/browser-testing-with-devtools) | 99 A | 0/0/1 | 1 | 3,514 | 1.68 s |
| [Superpowers systematic debugging](https://github.com/obra/superpowers/tree/896224c4b1879920ab573417e68fd51d2ccc9072/skills/systematic-debugging) | 99 A | 0/0/1 | 11 | 2,436 | 1.75 s |
| [GitHub multi-agent orchestration](https://github.com/github/awesome-copilot/tree/251f416b6d3aa12837b10536e6f9bdd67f482ff7/plugins/ai-team-orchestration/skills/ai-team-orchestration) | 99 A | 0/0/1 | 5 | 1,418 | 1.56 s |
| [Last30Days](https://github.com/mvanhorn/last30days-skill/tree/3fa91fce9009731ed68e2e8a14ce9683253720e8/skills/last30days) | 30 F | 7/12/2 | 102 | 37,328 | 1.69 s |

`E/W/I` means errors, warnings, and informational findings. Timings include Node.js
startup and should be treated as an environment-specific snapshot, not a formal
benchmark.

## Finding Review

The Anthropic PDF skill passed without findings. Three other samples only lacked
a frontmatter license declaration, producing one informational finding each.

The Vercel sample declares `name: vercel-react-best-practices` inside a directory
named `react-best-practices`. The Agent Skills specification requires the name to
match its parent directory, so `spec/directory-name` is an expected error. This
behavior agrees with the official reference validator at
[agentskills/agentskills@5d4c1fd](https://github.com/agentskills/agentskills/blob/5d4c1fda3f786fff826c7f56b6cb3341e7f3a911/skills-ref/src/skills_ref/validator.py).

Last30Days intentionally uses several client-specific top-level fields and a
nested metadata object. The open specification only permits `name`,
`description`, `license`, `compatibility`, `metadata`, and experimental
`allowed-tools`; metadata values must be strings. Its seven specification errors
therefore reflect strict open-spec compatibility, even if particular clients
accept those extensions. Other findings include:

- a 1,812-line, approximately 37,328-token `SKILL.md`;
- a 15.1 MiB package with five individual resources above the size threshold;
- four script locations that print access-token or API-key values;
- one discoverability warning and one duplicate heading.

See the pinned
[specification source](https://github.com/agentskills/agentskills/blob/5d4c1fda3f786fff826c7f56b6cb3341e7f3a911/docs/specification.mdx)
for the rules used in this review.

## Score Calibration

The first scoring model subtracted every weighted finding linearly and floored
the result at zero. Last30Days reached zero from its seven specification errors
alone, so its other security, efficiency, quality, and portability findings no
longer affected the visible score.

The revised model keeps the existing severity and category weights but gives
repeated findings from the same rule harmonic diminishing impact. It then maps
the aggregate penalty through a smooth exponential decay. Calibration checks
show:

- one specification error remains 79;
- one security warning remains 93;
- one informational quality finding remains 99;
- six repeated specification errors score 57, while six distinct specification
  rule failures score 25;
- the unchanged Last30Days findings now score 30 instead of saturating at zero.

The other five real-world scores remain 100, 79, 99, 99, and 99 because those
skills have zero findings, one error, or one informational finding. Their high
scores reflect the selected projects' clean results rather than score
saturation.

## Repairs From This Run

The first scan found two false-positive patterns, both repaired with regression
tests:

1. A defensive example warning agents not to follow text such as "Ignore previous
   instructions" was incorrectly classified as a prompt override. Skillcheck now
   requires both an example marker and explicit defensive context before applying
   a narrow exemption. Actual override instructions remain findings.
2. Error messages that only named `OPENROUTER_API_KEY` or a password manager were
   incorrectly treated as credential disclosure. Skillcheck now requires value
   interpolation, environment expansion, or direct sensitive-variable output.
   Four genuine token/key output locations remain findings.

These repairs reduced the Addy sample from one warning to none and reduced the
Last30Days credential warnings from seven to four without suppressing the
high-confidence cases.

## Reproducing

After checking out each pinned repository path above, run:

```bash
npm install
npm run build
node dist/cli.js /path/to/skill --format json --fail-on never --no-color
```

Skillcheck reads skill content as untrusted data. It does not execute scripts
from any tested repository.
