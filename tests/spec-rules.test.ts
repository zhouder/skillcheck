import { describe, expect, it } from "vitest";
import { analyze } from "../src/core/analyze.js";
import { temporaryDirectory, validSkillMarkdown, writeSkill } from "./helpers.js";

describe("specification compatibility", () => {
  it("accepts a complete valid skill", async () => {
    const root = await temporaryDirectory();
    await writeSkill(root, "valid-skill", validSkillMarkdown("valid-skill"), {
      "references/guide.md": "# Guide\n"
    });

    const report = await analyze({ cwd: root, paths: ["valid-skill"] });
    const specErrors = report.results[0]?.findings.filter(
      (finding) => finding.category === "spec" && finding.severity === "error"
    );
    expect(specErrors).toEqual([]);
  });

  it.each([
    ["uppercase", "MySkill", "MySkill", "lowercase"],
    ["leading hyphen", "-my-skill", "-my-skill", "start or end"],
    ["double hyphen", "my--skill", "my--skill", "consecutive"],
    ["underscore", "my_skill", "my_skill", "letters, numbers"]
  ])("matches the reference validator for %s", async (_case, directoryName, name, message) => {
    const root = await temporaryDirectory();
    await writeSkill(
      root,
      directoryName,
      `---\nname: ${name}\ndescription: A test skill\n---\nUseful instructions for a repeatable task.\n`
    );

    const report = await analyze({ cwd: root, paths: [directoryName] });
    expect(
      report.results[0]?.findings.some(
        (finding) => finding.ruleId === "spec/name" && finding.message.includes(message)
      )
    ).toBe(true);
  });

  it("accepts normalized international names and emits a portability note", async () => {
    const root = await temporaryDirectory();
    await writeSkill(
      root,
      "技能",
      "---\nname: 技能\ndescription: 处理结构化数据并验证输出。当用户需要分析数据文件时使用。\nlicense: MIT\n---\n# 工作流\n\n读取输入，验证格式，然后输出带有证据的结果。\n"
    );

    const report = await analyze({ cwd: root, paths: ["技能"] });
    expect(report.results[0]?.findings.some((finding) => finding.ruleId === "spec/name")).toBe(
      false
    );
    expect(
      report.results[0]?.findings.some((finding) => finding.ruleId === "portability/unicode-name")
    ).toBe(true);
  });

  it("rejects directory mismatch, unknown fields, and overlong compatibility", async () => {
    const root = await temporaryDirectory();
    await writeSkill(
      root,
      "wrong-name",
      `---
name: correct-name
description: A useful description
compatibility: ${"x".repeat(501)}
custom: value
---
Useful instructions for a repeatable task.
`
    );

    const ids = (await analyze({ cwd: root, paths: ["wrong-name"] })).results[0]?.findings.map(
      (finding) => finding.ruleId
    );
    expect(ids).toEqual(
      expect.arrayContaining(["spec/directory-name", "spec/unknown-field", "spec/compatibility"])
    );
  });

  it("matches reference limits and required fields", async () => {
    const root = await temporaryDirectory();
    await writeSkill(
      root,
      "missing-fields",
      "---\nlicense: MIT\n---\nUseful instructions for a repeatable task.\n"
    );
    const longName = "a".repeat(65);
    await writeSkill(
      root,
      longName,
      `---\nname: ${longName}\ndescription: ${"x".repeat(1025)}\ncompatibility: ${"y".repeat(501)}\n---\nUseful instructions.\n`
    );

    const report = await analyze({ cwd: root });
    const missing = report.results.find((result) => result.directory === "missing-fields");
    const overlong = report.results.find((result) => result.directory === longName);
    expect(missing?.findings.filter((finding) => finding.ruleId === "spec/name")).toHaveLength(1);
    expect(
      missing?.findings.filter((finding) => finding.ruleId === "spec/description")
    ).toHaveLength(1);
    expect(overlong?.findings.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining(["spec/name", "spec/description", "spec/compatibility"])
    );
  });

  it("accepts every specified field and experimental allowed-tools", async () => {
    const root = await temporaryDirectory();
    await writeSkill(
      root,
      "complete-skill",
      `---
name: complete-skill
description: Performs a complete validation workflow. Use when checking all supported frontmatter fields.
license: Apache-2.0
compatibility: Requires git and network access.
metadata:
  author: Example
  version: "1.0"
allowed-tools: Bash(git:*) Read
---
# Workflow

Read the inputs, validate each documented condition, and return concrete evidence.
`
    );

    const result = (await analyze({ cwd: root })).results[0];
    expect(
      result?.findings.filter(
        (finding) => finding.category === "spec" && finding.severity === "error"
      )
    ).toEqual([]);
    expect(result?.findings.some((finding) => finding.ruleId === "portability/allowed-tools")).toBe(
      true
    );
  });

  it("matches reference normalization and international lowercase behavior", async () => {
    const root = await temporaryDirectory();
    const decomposed = "cafe\u0301";
    await writeSkill(
      root,
      "café",
      `---\nname: ${decomposed}\ndescription: Reviews data. Use when validating international skill names.\nlicense: MIT\n---\n# Workflow\n\nValidate the input and return evidence for every result.\n`
    );
    await writeSkill(
      root,
      "мой-навык",
      "---\nname: мой-навык\ndescription: Reviews data. Use when validating international names.\nlicense: MIT\n---\n# Workflow\n\nValidate the input and return evidence for every result.\n"
    );
    await writeSkill(
      root,
      "НАВЫК",
      "---\nname: НАВЫК\ndescription: Reviews data. Use when validating international names.\nlicense: MIT\n---\n# Workflow\n\nValidate the input and return evidence for every result.\n"
    );

    const report = await analyze({ cwd: root });
    const byDirectory = new Map(report.results.map((result) => [result.directory, result]));
    expect(
      byDirectory.get("café")?.findings.some((finding) => finding.ruleId === "spec/name")
    ).toBe(false);
    expect(
      byDirectory.get("мой-навык")?.findings.some((finding) => finding.ruleId === "spec/name")
    ).toBe(false);
    expect(
      byDirectory.get("НАВЫК")?.findings.some((finding) => finding.ruleId === "spec/name")
    ).toBe(true);
  });
});
