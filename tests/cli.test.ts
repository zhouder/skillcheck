import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import { runCli } from "../src/cli/main.js";
import { temporaryDirectory, validSkillMarkdown, writeSkill } from "./helpers.js";

describe("CLI", () => {
  it("returns zero and JSON for a clean skill", async () => {
    const root = await temporaryDirectory();
    const directory = await writeSkill(root, "clean-skill", validSkillMarkdown("clean-skill"), {
      "references/guide.md": "# Guide\n"
    });
    const capture = createCapture();

    const exitCode = await runCli([directory, "--format", "json"], capture.io);
    const report = JSON.parse(capture.stdout());

    expect(exitCode).toBe(0);
    expect(report.summary).toEqual(
      expect.objectContaining({ skills: 1, errors: 0, warnings: 0, infos: 0 })
    );
  });

  it("returns one at the configured finding threshold", async () => {
    const root = await temporaryDirectory();
    const directory = await writeSkill(
      root,
      "warning-skill",
      "---\nname: warning-skill\ndescription: Short\nlicense: MIT\n---\nUseful but deliberately brief instructions.\n"
    );
    const capture = createCapture();

    expect(await runCli([directory, "--quiet", "--fail-on", "warning"], capture.io)).toBe(1);
    expect(capture.stdout()).toBe("");
  });

  it("lists rules as JSON and handles help as success", async () => {
    const rulesCapture = createCapture();
    const helpCapture = createCapture();

    expect(await runCli(["rules", "--json"], rulesCapture.io)).toBe(0);
    expect(JSON.parse(rulesCapture.stdout()).length).toBeGreaterThan(20);
    expect(await runCli(["--help"], helpCapture.io)).toBe(0);
    expect(helpCapture.stdout()).toContain("Validate, secure, and score Agent Skills");
  });

  it("rejects invalid option values with usage exit code 2", async () => {
    const capture = createCapture();
    expect(await runCli(["--format", "xml"], capture.io)).toBe(2);
    expect(capture.stderr()).toContain("expected pretty, json, sarif, markdown, or badge");
  });

  it("honors failOn from configuration and writes output files", async () => {
    const root = await temporaryDirectory();
    const directory = await writeSkill(
      root,
      "configured-skill",
      "---\nname: configured-skill\ndescription: Short\nlicense: MIT\n---\nUseful but deliberately brief instructions.\n"
    );
    const config = path.join(root, ".skillcheckrc.json");
    const output = path.join(root, "reports", "badge.json");
    await writeFile(config, JSON.stringify({ failOn: "warning" }), "utf8");
    const capture = createCapture();

    expect(
      await runCli(
        [directory, "--config", config, "--format", "badge", "--output", output],
        capture.io
      )
    ).toBe(1);
    expect(JSON.parse(await readFile(output, "utf8"))).toEqual(
      expect.objectContaining({ schemaVersion: 1, label: "skillcheck" })
    );
  });

  it("initializes a skill but refuses to overwrite it", async () => {
    const root = await temporaryDirectory();
    const directory = path.join(root, "new-skill");
    const first = createCapture();
    const second = createCapture();

    expect(await runCli(["init", directory], first.io)).toBe(0);
    expect(await readFile(path.join(directory, "SKILL.md"), "utf8")).toContain("name: new-skill");
    expect(await runCli(["init", directory], second.io)).toBe(2);
    expect(second.stderr()).toContain("Refusing to overwrite");
  });

  it("quotes init descriptions and rejects invalid directory names", async () => {
    const root = await temporaryDirectory();
    const validDirectory = path.join(root, "quoted-skill");
    const invalidDirectory = path.join(root, "Invalid Skill");
    const validCapture = createCapture();
    const invalidCapture = createCapture();

    expect(
      await runCli(
        ["init", validDirectory, "--description", "Use when: values contain YAML punctuation."],
        validCapture.io
      )
    ).toBe(0);
    const generated = await readFile(path.join(validDirectory, "SKILL.md"), "utf8");
    expect(generated).toContain('description: "Use when: values contain YAML punctuation."');

    expect(await runCli(["init", invalidDirectory], invalidCapture.io)).toBe(2);
    expect(invalidCapture.stderr()).toContain("directory name must be lowercase");
  });
});

function createCapture() {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  let stdoutValue = "";
  let stderrValue = "";
  stdout.on("data", (chunk: Buffer) => {
    stdoutValue += chunk.toString();
  });
  stderr.on("data", (chunk: Buffer) => {
    stderrValue += chunk.toString();
  });
  return {
    io: { stdout, stderr },
    stdout: () => stdoutValue,
    stderr: () => stderrValue
  };
}
