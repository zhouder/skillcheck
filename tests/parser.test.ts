import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseSkill } from "../src/core/parser.js";
import { temporaryDirectory, validSkillMarkdown, writeSkill } from "./helpers.js";

describe("skill parser", () => {
  it("parses metadata, Markdown references, and bundled files", async () => {
    const root = await temporaryDirectory();
    const directory = await writeSkill(root, "csv-review", validSkillMarkdown("csv-review"), {
      "references/guide.md": "# Guide\n",
      "scripts/check.sh": "#!/bin/sh\nexit 0\n"
    });

    const skill = await parseSkill(directory, root);

    expect(skill.metadata.name).toBe("csv-review");
    expect(skill.references).toEqual([
      expect.objectContaining({ destination: "references/guide.md", image: false })
    ]);
    expect(skill.files.map((file) => file.relativePath)).toEqual([
      "references/guide.md",
      "scripts/check.sh",
      "SKILL.md"
    ]);
    expect(skill.parseFindings).toEqual([]);
  });

  it("reports missing and unclosed frontmatter without throwing", async () => {
    const root = await temporaryDirectory();
    const missing = await writeSkill(root, "missing", "# No metadata\n");
    const unclosed = await writeSkill(root, "unclosed", "---\nname: unclosed\n");

    expect((await parseSkill(missing, root)).parseFindings[0]?.ruleId).toBe(
      "parse/frontmatter-missing"
    );
    expect((await parseSkill(unclosed, root)).parseFindings[0]?.ruleId).toBe(
      "parse/frontmatter-unclosed"
    );
  });

  it("rejects duplicate YAML keys and alias expansion", async () => {
    const root = await temporaryDirectory();
    const duplicate = await writeSkill(
      root,
      "duplicate",
      "---\nname: duplicate\nname: other\ndescription: Test\n---\nBody\n"
    );
    const parsed = await parseSkill(duplicate, root);

    expect(parsed.parseFindings.some((finding) => finding.ruleId === "parse/yaml")).toBe(true);
    expect(parsed.skillFile).toBe(path.join(duplicate, "SKILL.md"));
  });

  it("ignores dependency and generated directories inside a skill", async () => {
    const root = await temporaryDirectory();
    const directory = await writeSkill(
      root,
      "ignored-bundle",
      validSkillMarkdown("ignored-bundle")
    );
    await mkdir(path.join(directory, "node_modules", "package"), { recursive: true });
    await mkdir(path.join(directory, ".git", "objects"), { recursive: true });
    await mkdir(path.join(directory, "dist"), { recursive: true });
    await writeFile(path.join(directory, "node_modules", "package", "index.js"), "unsafe", "utf8");
    await writeFile(path.join(directory, ".git", "objects", "blob"), "unsafe", "utf8");
    await writeFile(path.join(directory, "dist", "bundle.js"), "unsafe", "utf8");

    const parsed = await parseSkill(directory, root);
    expect(parsed.files.map((file) => file.relativePath)).toEqual(["SKILL.md"]);
  });

  it("stops enumeration when a package exceeds the depth limit", async () => {
    const root = await temporaryDirectory();
    const directory = await writeSkill(root, "deep-package", validSkillMarkdown("deep-package"));
    let current = directory;
    for (let index = 0; index < 34; index += 1) {
      current = path.join(current, `level-${index}`);
      await mkdir(current);
    }

    const parsed = await parseSkill(directory, root);
    expect(
      parsed.parseFindings.some((finding) => finding.ruleId === "parse/enumeration-limit")
    ).toBe(true);
  });
});
