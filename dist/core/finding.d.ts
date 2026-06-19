import type { Finding, RuleCategory, Severity } from "./types.js";
export declare function createFinding(input: {
    ruleId: string;
    title: string;
    message: string;
    severity: Severity;
    category: RuleCategory;
    filePath: string;
    root?: string;
    line?: number;
    column?: number;
    endLine?: number;
    endColumn?: number;
    evidence?: string;
    help?: string;
}): Finding;
export declare function normalizePath(value: string): string;
//# sourceMappingURL=finding.d.ts.map