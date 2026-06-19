import type { AnalysisReport, Severity } from "../core/types.js";
export interface SarifLog {
    version: "2.1.0";
    $schema: string;
    runs: SarifRun[];
}
interface SarifRun {
    tool: {
        driver: {
            name: string;
            version: string;
            informationUri: string;
            rules: SarifRule[];
        };
    };
    results: SarifResult[];
}
interface SarifRule {
    id: string;
    name: string;
    shortDescription: {
        text: string;
    };
    fullDescription: {
        text: string;
    };
    help: {
        text: string;
    };
    defaultConfiguration: {
        level: "error" | "warning" | "note";
    };
    properties: {
        category: string;
    };
}
interface SarifResult {
    ruleId: string;
    level: "error" | "warning" | "note";
    message: {
        text: string;
    };
    locations: Array<{
        physicalLocation: {
            artifactLocation: {
                uri: string;
                uriBaseId: "%SRCROOT%";
            };
            region?: {
                startLine: number;
                startColumn?: number;
                endLine?: number;
                endColumn?: number;
            };
        };
    }>;
    properties: {
        category: string;
        scoreImpact: Severity;
    };
}
export declare function sarifObject(report: AnalysisReport): SarifLog;
export declare function sarifReport(report: AnalysisReport): string;
export {};
//# sourceMappingURL=sarif.d.ts.map