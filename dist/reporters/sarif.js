import { findRule } from "../rules/index.js";
import { allFindings } from "./shared.js";
export function sarifObject(report) {
    const findings = allFindings(report);
    const ruleIds = [...new Set(findings.map((finding) => finding.ruleId))].sort();
    return {
        version: "2.1.0",
        $schema: "https://json.schemastore.org/sarif-2.1.0.json",
        runs: [
            {
                tool: {
                    driver: {
                        name: "Skillcheck",
                        version: report.tool.version,
                        informationUri: "https://www.npmjs.com/package/skillcheck",
                        rules: ruleIds.map((id) => sarifRule(id, findings))
                    }
                },
                results: findings.map(sarifResult)
            }
        ]
    };
}
export function sarifReport(report) {
    return `${JSON.stringify(sarifObject(report), null, 2)}\n`;
}
function sarifRule(id, findings) {
    const metadata = findRule(id)?.meta;
    const example = findings.find((finding) => finding.ruleId === id);
    const severity = metadata?.defaultSeverity ?? example?.severity ?? "warning";
    return {
        id,
        name: metadata?.title ?? example?.title ?? id,
        shortDescription: { text: metadata?.title ?? example?.title ?? id },
        fullDescription: { text: metadata?.description ?? example?.message ?? id },
        help: { text: metadata?.recommendation ?? example?.help ?? "Review the finding." },
        defaultConfiguration: { level: sarifLevel(severity) },
        properties: { category: metadata?.category ?? example?.category ?? "internal" }
    };
}
function sarifResult(finding) {
    const region = finding.location.line === undefined
        ? undefined
        : {
            startLine: Math.max(1, finding.location.line),
            ...(finding.location.column === undefined
                ? {}
                : { startColumn: Math.max(1, finding.location.column) }),
            ...(finding.location.endLine === undefined ? {} : { endLine: finding.location.endLine }),
            ...(finding.location.endColumn === undefined
                ? {}
                : { endColumn: finding.location.endColumn })
        };
    return {
        ruleId: finding.ruleId,
        level: sarifLevel(finding.severity),
        message: {
            text: finding.help ? `${finding.message} Fix: ${finding.help}` : finding.message
        },
        locations: [
            {
                physicalLocation: {
                    artifactLocation: { uri: finding.location.path, uriBaseId: "%SRCROOT%" },
                    ...(region === undefined ? {} : { region })
                }
            }
        ],
        properties: { category: finding.category, scoreImpact: finding.severity }
    };
}
function sarifLevel(severity) {
    const levels = { error: "error", warning: "warning", info: "note" };
    return levels[severity];
}
//# sourceMappingURL=sarif.js.map