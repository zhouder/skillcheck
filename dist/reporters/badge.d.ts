import type { AnalysisReport } from "../core/types.js";
export interface BadgeData {
    schemaVersion: 1;
    label: "skillcheck";
    message: string;
    color: string;
}
export declare function badgeObject(report: AnalysisReport): BadgeData;
export declare function badgeReport(report: AnalysisReport): string;
//# sourceMappingURL=badge.d.ts.map