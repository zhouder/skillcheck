import type { AnalysisReport } from "../core/types.js";
import { scoreColor } from "./shared.js";

export interface BadgeData {
  schemaVersion: 1;
  label: "skillcheck";
  message: string;
  color: string;
}

export function badgeObject(report: AnalysisReport): BadgeData {
  if (report.summary.errors > 0) {
    return {
      schemaVersion: 1,
      label: "skillcheck",
      message: `${report.summary.errors} error${report.summary.errors === 1 ? "" : "s"}`,
      color: "red"
    };
  }
  if (report.summary.warnings > 0) {
    return {
      schemaVersion: 1,
      label: "skillcheck",
      message: `${report.summary.warnings} warning${report.summary.warnings === 1 ? "" : "s"}`,
      color: "yellow"
    };
  }

  const score = report.summary.lowestScore ?? 0;
  const grade = report.results.find((result) => result.score === score)?.grade ?? "F";
  return {
    schemaVersion: 1,
    label: "skillcheck",
    message: report.results.length ? `${grade} ${score}/100` : "no skills",
    color: report.results.length ? scoreColor(score) : "lightgrey"
  };
}

export function badgeReport(report: AnalysisReport): string {
  return `${JSON.stringify(badgeObject(report), null, 2)}\n`;
}
