import { describe, expect, it } from "vitest";
import { analyze } from "../src/core/analyze.js";
import { badgeObject } from "../src/reporters/badge.js";
import { jsonReport } from "../src/reporters/json.js";
import { markdownReport } from "../src/reporters/markdown.js";
import { prettyReport } from "../src/reporters/pretty.js";
import { sarifObject } from "../src/reporters/sarif.js";
import { scoreColor } from "../src/reporters/shared.js";
import { temporaryDirectory, validSkillMarkdown, writeSkill } from "./helpers.js";

describe("reporters", () => {
  it("emits valid JSON, SARIF, Markdown, pretty text, and badge data", async () => {
    const root = await temporaryDirectory();
    await writeSkill(root, "report-skill", validSkillMarkdown("report-skill"), {
      "references/guide.md": "# Guide\n"
    });
    const report = await analyze({ cwd: root });

    expect(JSON.parse(jsonReport(report))).toEqual(report);

    const sarif = sarifObject(report);
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs).toHaveLength(1);
    expect(sarif.runs[0]?.results).toEqual([]);

    expect(markdownReport(report)).toContain("report-skill - 100/100 (A)");
    expect(prettyReport(report, { color: false })).toContain("No findings");
    expect(badgeObject(report)).toEqual({
      schemaVersion: 1,
      label: "skillcheck",
      message: "A 100/100",
      color: "brightgreen"
    });
  });

  it("maps findings to SARIF rules, levels, and source locations", async () => {
    const root = await temporaryDirectory();
    await writeSkill(root, "bad-skill", "---\nname: BAD\ndescription: Bad\n---\n");
    const report = await analyze({ cwd: root });
    const sarif = sarifObject(report);
    const results = sarif.runs[0]?.results ?? [];

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((result) => result.level === "error")).toBe(true);
    expect(
      results.every((result) => result.locations[0]?.physicalLocation.artifactLocation.uri)
    ).toBe(true);
    expect(markdownReport(report)).toContain("[ERROR]");
    expect(markdownReport(report)).toContain("Evidence:");
    expect(prettyReport(report, { color: false })).toContain("error");
  });

  it("emits a neutral badge when no skills are found", async () => {
    const root = await temporaryDirectory();
    const report = await analyze({ cwd: root });
    expect(badgeObject(report)).toEqual({
      schemaVersion: 1,
      label: "skillcheck",
      message: "no skills",
      color: "lightgrey"
    });
    const finding = report.globalFindings[0];
    expect(finding).toBeDefined();
    if (finding) {
      finding.location = {
        ...finding.location,
        line: 2,
        column: 3,
        endLine: 2,
        endColumn: 8
      };
    }
    const sarif = sarifObject(report);
    expect(sarif.runs[0]?.results[0]?.locations[0]?.physicalLocation.region).toEqual({
      startLine: 2,
      startColumn: 3,
      endLine: 2,
      endColumn: 8
    });
    expect(markdownReport(report)).toContain("Project findings");
    expect(prettyReport(report, { color: false })).toContain("No SKILL.md files were found");
  });

  it("uses stable badge colors at each score boundary", () => {
    expect([95, 85, 75, 65, 55].map(scoreColor)).toEqual([
      "brightgreen",
      "green",
      "yellow",
      "orange",
      "red"
    ]);
  });
});
