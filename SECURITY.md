# Security Policy

## Supported Versions

Until v1.0, security fixes are applied to the latest release only.

## Reporting A Vulnerability

Do not open a public issue for an exploitable vulnerability. Use the GitHub
repository's private security advisory feature after the repository is
published. Include affected versions, a minimal reproduction, impact, and any
suggested mitigation.

## Analysis Safety Guarantees

Skillcheck does not intentionally:

- execute files from an analyzed skill;
- follow directory symbolic links during discovery;
- evaluate JavaScript or TypeScript configuration;
- fetch external URLs from skill content;
- upload skill content or telemetry;
- modify analyzed files.

Resource limits are applied to the primary skill file, directory enumeration,
and text scanning. A hostile filesystem can still cause operating-system-level
I/O failures, which are reported without executing content.

## Static Analysis Limitations

Security rules are heuristics. Obfuscated commands, behavior delegated to an
external dependency, social engineering, and semantic prompt attacks may not
be detected. A clean report is not a security certification. Review the skill,
its dependencies, and the permissions granted to the consuming agent.
