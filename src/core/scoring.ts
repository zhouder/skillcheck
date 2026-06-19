import type { Finding, RuleCategory, Severity } from "./types.js";

const basePenalty: Record<Severity, number> = {
  error: 18,
  warning: 5,
  info: 1
};

const categoryMultiplier: Record<RuleCategory, number> = {
  spec: 1.15,
  security: 1.35,
  quality: 1,
  efficiency: 0.8,
  portability: 0.8,
  internal: 1.5
};

export function scoreFindings(findings: Finding[]): number {
  const penalty = findings.reduce(
    (sum, finding) => sum + basePenalty[finding.severity] * categoryMultiplier[finding.category],
    0
  );
  return Math.max(0, Math.round(100 - penalty));
}

export function scoreGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}
