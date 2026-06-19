import { describe, expect, it } from "vitest";
import { scoreFindings, scoreGrade } from "../src/core/scoring.js";
import type { Finding, RuleCategory, Severity } from "../src/core/types.js";

describe("scoring", () => {
  it("preserves the calibrated impact of individual findings", () => {
    expect(scoreFindings([])).toBe(100);
    expect(scoreFindings([finding("spec/name", "error", "spec")])).toBe(79);
    expect(scoreFindings([finding("security/secret", "warning", "security")])).toBe(93);
    expect(scoreFindings([finding("quality/license", "info", "quality")])).toBe(99);
  });

  it("discounts repeated evidence without hiding distinct rule failures", () => {
    const repeated = Array.from({ length: 6 }, () =>
      finding("spec/unknown-field", "error", "spec")
    );
    const distinct = Array.from({ length: 6 }, (_, index) =>
      finding(`spec/distinct-${index}`, "error", "spec")
    );

    expect(scoreFindings(repeated)).toBe(57);
    expect(scoreFindings(distinct)).toBe(25);
    expect(scoreFindings(repeated)).toBeGreaterThan(scoreFindings(distinct));
  });

  it("keeps a heavily affected real-world profile distinguishable from zero", () => {
    const findings = [
      ...Array.from({ length: 6 }, () => finding("spec/unknown-field", "error", "spec")),
      finding("spec/metadata", "error", "spec"),
      finding("efficiency/package-size", "warning", "efficiency"),
      ...Array.from({ length: 5 }, () =>
        finding("efficiency/large-resource", "warning", "efficiency")
      ),
      finding("efficiency/context-budget", "warning", "efficiency"),
      ...Array.from({ length: 4 }, () =>
        finding("security/credential-access", "warning", "security")
      ),
      finding("quality/discoverable-description", "warning", "quality"),
      finding("portability/allowed-tools", "info", "portability"),
      finding("quality/duplicate-heading", "info", "quality")
    ];

    const score = scoreFindings(findings);
    expect(score).toBe(30);
    expect(scoreGrade(score)).toBe("F");
  });
});

function finding(ruleId: string, severity: Severity, category: RuleCategory): Finding {
  return {
    ruleId,
    title: ruleId,
    message: ruleId,
    severity,
    category,
    location: { path: "SKILL.md" }
  };
}
