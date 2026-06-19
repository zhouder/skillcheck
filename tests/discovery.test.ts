import { mkdir, symlink } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { defaultConfig } from "../src/core/config.js";
import { discoverSkills } from "../src/core/discovery.js";
import { temporaryDirectory, validSkillMarkdown, writeSkill } from "./helpers.js";

describe("skill discovery", () => {
  it("finds nested skills in deterministic order", async () => {
    const cwd = await temporaryDirectory();
    await writeSkill(path.join(cwd, "skills"), "z-skill", validSkillMarkdown("z-skill"));
    await writeSkill(path.join(cwd, "skills"), "a-skill", validSkillMarkdown("a-skill"));

    const result = await discoverSkills({
      inputs: ["."],
      cwd,
      ignore: defaultConfig.ignore,
      maxDepth: 8
    });

    expect(result.issues).toEqual([]);
    expect(result.directories.map((directory) => path.basename(directory))).toEqual([
      "a-skill",
      "z-skill"
    ]);
  });

  it("stops descending once a skill root is found", async () => {
    const cwd = await temporaryDirectory();
    const outer = await writeSkill(cwd, "outer", validSkillMarkdown("outer"));
    await writeSkill(outer, "nested", validSkillMarkdown("nested"));

    const result = await discoverSkills({ inputs: ["outer"], cwd, ignore: [], maxDepth: 8 });
    expect(result.directories).toEqual([outer]);
  });

  it("does not follow a symbolic-link input", async () => {
    const cwd = await temporaryDirectory();
    const target = await writeSkill(cwd, "target", validSkillMarkdown("target"));
    const link = path.join(cwd, "linked-skill");
    await symlink(target, link, "junction");

    const result = await discoverSkills({ inputs: [link], cwd, ignore: [], maxDepth: 8 });
    expect(result.directories).toEqual([]);
    expect(result.issues[0]?.message).toContain("symbolic link");
  });

  it("does not follow a nested directory junction", async () => {
    const cwd = await temporaryDirectory();
    const outside = await temporaryDirectory("skillcheck-outside-");
    const target = await writeSkill(outside, "outside-skill", validSkillMarkdown("outside-skill"));
    await symlink(target, path.join(cwd, "linked-skill"), "junction");

    const result = await discoverSkills({ inputs: ["."], cwd, ignore: [], maxDepth: 8 });
    expect(result.directories).toEqual([]);
  });

  it("honors max depth", async () => {
    const cwd = await temporaryDirectory();
    await mkdir(path.join(cwd, "one", "two"), { recursive: true });
    await writeSkill(path.join(cwd, "one", "two"), "deep", validSkillMarkdown("deep"));

    const result = await discoverSkills({ inputs: ["."], cwd, ignore: [], maxDepth: 1 });
    expect(result.directories).toEqual([]);
  });
});
