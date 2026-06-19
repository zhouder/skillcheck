import type { AnalysisReport, Finding } from "../core/types.js";

export function allFindings(report: AnalysisReport): Finding[] {
  return [...report.globalFindings, ...report.results.flatMap((result) => result.findings)];
}

export function scoreColor(score: number): "brightgreen" | "green" | "yellow" | "orange" | "red" {
  if (score >= 90) return "brightgreen";
  if (score >= 80) return "green";
  if (score >= 70) return "yellow";
  if (score >= 60) return "orange";
  return "red";
}

export function findingLocation(finding: Finding): string {
  const line = finding.location.line === undefined ? "" : `:${finding.location.line}`;
  const column = finding.location.column === undefined ? "" : `:${finding.location.column}`;
  return `${finding.location.path}${line}${column}`;
}
