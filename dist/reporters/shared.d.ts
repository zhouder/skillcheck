import type { AnalysisReport, Finding } from "../core/types.js";
export declare function allFindings(report: AnalysisReport): Finding[];
export declare function scoreColor(score: number): "brightgreen" | "green" | "yellow" | "orange" | "red";
export declare function findingLocation(finding: Finding): string;
//# sourceMappingURL=shared.d.ts.map