import { access, mkdir, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyze } from "../src/core/analyze.js";
import { temporaryDirectory, writeSkill } from "./helpers.js";

const frontmatter = (name: string, extras = "") => `---
name: ${name}
description: Performs package verification and produces evidence. Use when validating an Agent Skill release.
license: MIT
${extras}---
`;

describe("rule edge cases", () => {
  it("validates metadata and optional field types", async () => {
    const root = await temporaryDirectory();
    await writeSkill(
      root,
      "bad-types",
      `---
name: bad-types
description: Performs package verification and produces evidence. Use when validating an Agent Skill release.
license:
  kind: MIT
allowed-tools:
  - Bash
metadata:
  version: 1
---
# Workflow

Inspect each input, run the documented checks, and produce a report with evidence.
`
    );

    const ids = (await analyze({ cwd: root })).results[0]?.findings.map(
      (finding) => finding.ruleId
    );
    expect(ids?.filter((id) => id === "spec/optional-field-type")).toHaveLength(2);
    expect(ids).toContain("spec/metadata");
  });

  it("reports context, resource, and package size pressure", async () => {
    const root = await temporaryDirectory();
    const body = Array.from(
      { length: 510 },
      (_, index) => `${index + 1}. Validate item ${index + 1}.`
    ).join("\n");
    const directory = await writeSkill(
      root,
      "large-skill",
      `${frontmatter("large-skill")}# Workflow\n\n${body}\n`
    );
    await mkdir(path.join(directory, "assets"), { recursive: true });
    await writeFile(path.join(directory, "assets", "large.txt"), "x".repeat(11 * 1024 * 1024));

    const ids = (await analyze({ cwd: root })).results[0]?.findings.map(
      (finding) => finding.ruleId
    );
    expect(ids).toEqual(
      expect.arrayContaining([
        "efficiency/context-budget",
        "efficiency/large-resource",
        "efficiency/package-size"
      ])
    );
  });

  it("detects credential output, private keys, and hardcoded home paths", async () => {
    const root = await temporaryDirectory();
    await writeSkill(
      root,
      "secret-reader",
      `${frontmatter("secret-reader")}# Workflow

Read the project and run checks from \`/home/alice/private-project\`. Produce a
detailed report after validating all expected outputs and failure cases.
`,
      {
        "scripts/read.sh": "cat ~/.aws/credentials\necho $API_KEY\n",
        "references/key.txt": "-----BEGIN PRIVATE KEY-----\nnot-a-real-key\n"
      }
    );

    const ids = (await analyze({ cwd: root })).results[0]?.findings.map(
      (finding) => finding.ruleId
    );
    expect(ids).toContain("security/credential-access");
    expect(ids).toContain("security/sensitive-file");
    expect(ids).toContain("portability/hardcoded-home");
  });

  it("allows localhost HTTP while warning on public HTTP", async () => {
    const root = await temporaryDirectory();
    await writeSkill(
      root,
      "http-skill",
      `${frontmatter("http-skill")}# Workflow

Compare [local](http://localhost:3000/status) with
[public](http://example.com/status), then produce a detailed validation report.
`
    );

    const findings = (await analyze({ cwd: root })).results[0]?.findings.filter(
      (finding) => finding.ruleId === "security/insecure-url"
    );
    expect(findings).toHaveLength(1);
    expect(findings?.[0]?.evidence ?? findings?.[0]?.message).toContain("example.com");
  });

  it("reports symbolic links inside and outside the skill", async () => {
    const root = await temporaryDirectory();
    const directory = await writeSkill(
      root,
      "linked-skill",
      `${frontmatter("linked-skill")}# Workflow

Read the bundled reference and produce a detailed report with validation evidence.
`,
      { "references/inside-dir/guide.md": "# Inside\n" }
    );
    await mkdir(path.join(root, "outside-dir"), { recursive: true });
    await symlink(
      path.join(directory, "references", "inside-dir"),
      path.join(directory, "inside-link"),
      "junction"
    );
    await symlink(path.join(root, "outside-dir"), path.join(directory, "outside-link"), "junction");

    const ids = (await analyze({ cwd: root })).results[0]?.findings.map(
      (finding) => finding.ruleId
    );
    expect(ids?.filter((id) => id === "portability/symlink")).toHaveLength(2);
    expect(ids).toContain("security/symlink-outside");
  });

  it("never executes analyzed scripts", async () => {
    const root = await temporaryDirectory();
    const sentinel = path.join(root, "must-not-exist.txt");
    await writeSkill(
      root,
      "no-execution",
      `${frontmatter("no-execution")}# Workflow

Inspect the bundled script as text and produce a detailed report without running it.
`,
      {
        "scripts/untrusted.js": `require("node:fs").writeFileSync(${JSON.stringify(sentinel)}, "executed")`
      }
    );

    await analyze({ cwd: root });
    await expect(access(sentinel)).rejects.toThrow();
  });
});
