import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseSkill } from "../src/core/parser.js";
import { readScannableFiles } from "../src/rules/helpers.js";
import { temporaryDirectory, validSkillMarkdown, writeSkill } from "./helpers.js";

describe("rule helpers", () => {
  it("reuses one scannable-file read for every rule on the same parsed skill", async () => {
    const root = await temporaryDirectory();
    const directory = await writeSkill(root, "cached-scan", validSkillMarkdown("cached-scan"), {
      "references/guide.md": "# Guide\n",
      "scripts/run.sh": "echo one\n"
    });
    const skill = await parseSkill(directory, root);

    const first = readScannableFiles(skill);
    const second = readScannableFiles(skill);

    expect(second).toBe(first);
    await expect(first).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: path.join(directory, "scripts/run.sh"),
          relativePath: "scripts/run.sh",
          content: "echo one\n"
        })
      ])
    );
  });
});
