export function allFindings(report) {
    return [...report.globalFindings, ...report.results.flatMap((result) => result.findings)];
}
export function scoreColor(score) {
    if (score >= 90)
        return "brightgreen";
    if (score >= 80)
        return "green";
    if (score >= 70)
        return "yellow";
    if (score >= 60)
        return "orange";
    return "red";
}
export function findingLocation(finding) {
    const line = finding.location.line === undefined ? "" : `:${finding.location.line}`;
    const column = finding.location.column === undefined ? "" : `:${finding.location.column}`;
    return `${finding.location.path}${line}${column}`;
}
//# sourceMappingURL=shared.js.map