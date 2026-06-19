import { describe, expect, it } from "vitest";
import { analyze } from "../src/core/analyze.js";
import { temporaryDirectory, validSkillMarkdown, writeSkill } from "./helpers.js";

describe("analysis report", () => {
  it("summarizes multiple skills and returns stable schema data", async () => {
    const root = await temporaryDirectory();
    await writeSkill(root, "good", validSkillMarkdown("good"), {
      "references/guide.md": "# Guide\n"
    });
    await writeSkill(root, "bad", "---\nname: BAD\ndescription: Bad\n---\n");

    const report = await analyze({ cwd: root });

    expect(report.schemaVersion).toBe("1");
    expect(report.tool).toEqual({ name: "skillcheck", version: "0.1.1" });
    expect(report.summary.skills).toBe(2);
    expect(report.summary.errors).toBeGreaterThan(0);
    expect(report.summary.lowestScore).toBeLessThan(80);
    expect(report.results.map((result) => result.directory)).toEqual(["bad", "good"]);
  });

  it("reports no skills as a global error", async () => {
    const root = await temporaryDirectory();
    const report = await analyze({ cwd: root });

    expect(report.summary.skills).toBe(0);
    expect(report.globalFindings[0]?.ruleId).toBe("discovery/no-skills");
  });

  it("reports unknown configured rules without aborting analysis", async () => {
    const root = await temporaryDirectory();
    await writeSkill(root, "good", validSkillMarkdown("good"), {
      "references/guide.md": "# Guide\n"
    });
    const report = await analyze({
      cwd: root,
      config: { rules: { "removed/old-rule": "off" } }
    });

    expect(report.globalFindings[0]?.ruleId).toBe("config/unknown-rule");
    expect(report.summary.skills).toBe(1);
  });
});
