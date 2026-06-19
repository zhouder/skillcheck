import type { Finding, ParsedSkill, Rule, RuleMetadata, Severity } from "../core/types.js";
export declare function defineRule(meta: RuleMetadata, check: Rule["check"]): Rule;
export declare function frontmatterLine(skill: ParsedSkill, field: string): number;
export declare function skillFileLocation(skill: ParsedSkill, line?: number, column?: number): {
    line?: number;
    column?: number;
    path: string;
};
export declare function lineOf(source: string, offset: number): number;
export declare function isRecord(value: unknown): value is Record<string, unknown>;
export declare function isInside(parent: string, candidate: string): boolean;
export declare function readScannableFiles(skill: ParsedSkill): Promise<ScannableFile[]>;
export interface ScannableFile {
    path: string;
    relativePath: string;
    content: string;
}
export declare function regexFindings(options: {
    files: ScannableFile[];
    patterns: RegExp[];
    create: (input: {
        file: ScannableFile;
        match: RegExpExecArray;
        line: number;
        evidence: string;
    }) => Finding;
}): Finding[];
export declare function compactEvidence(value: string, maxLength?: number): string;
export declare function severityAtLeast(value: Severity, threshold: Severity): boolean;
//# sourceMappingURL=helpers.d.ts.map