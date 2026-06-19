import path from "node:path";
export function createFinding(input) {
    const locationPath = input.root
        ? normalizePath(path.relative(input.root, input.filePath) || path.basename(input.filePath))
        : normalizePath(input.filePath);
    return {
        ruleId: input.ruleId,
        title: input.title,
        message: input.message,
        severity: input.severity,
        category: input.category,
        location: {
            path: locationPath,
            ...(input.line === undefined ? {} : { line: input.line }),
            ...(input.column === undefined ? {} : { column: input.column }),
            ...(input.endLine === undefined ? {} : { endLine: input.endLine }),
            ...(input.endColumn === undefined ? {} : { endColumn: input.endColumn })
        },
        ...(input.evidence === undefined ? {} : { evidence: input.evidence }),
        ...(input.help === undefined ? {} : { help: input.help })
    };
}
export function normalizePath(value) {
    return value.replaceAll("\\", "/");
}
//# sourceMappingURL=finding.js.map