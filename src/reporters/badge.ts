import type { AnalysisReport } from "../core/types.js";
import { scoreColor } from "./shared.js";

export interface BadgeData {
  schemaVersion: 1;
  label: "skillcheck";
  message: string;
  color: string;
}

export function badgeObject(report: AnalysisReport): BadgeData {
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
