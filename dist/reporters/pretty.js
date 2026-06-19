import pc from "picocolors";
import { findingLocation } from "./shared.js";
export function prettyReport(report, options = {}) {
    const colors = pc.createColors(options.color ?? true);
    const lines = [colors.bold(`Skillcheck ${report.tool.version}`), ""];
    for (const finding of report.globalFindings) {
        lines.push(formatFinding(finding, colors));
    }
    if (report.globalFindings.length)
        lines.push("");
    for (const result of report.results) {
        const name = result.name ?? result.directory;
        const score = colorScore(`${result.score}/100 ${result.grade}`, result.score, colors);
        lines.push(colors.bold(`${name}  ${score}`));
        lines.push(colors.dim(`${result.skillFile} | ${result.metrics.fileCount} files | ~${result.metrics.estimatedTokens} context tokens`));
        if (result.findings.length === 0) {
            lines.push(colors.green("  OK  No findings"));
        }
        else {
            for (const finding of result.findings) {
                lines.push(formatFinding(finding, colors));
            }
        }
        lines.push("");
    }
    lines.push(summaryText(report, colors), colors.dim("Run `skillcheck rules` for rule descriptions and configuration IDs."));
    return `${lines.join("\n").trimEnd()}\n`;
}
function formatFinding(finding, colors) {
    const marker = {
        error: colors.red("error"),
        warning: colors.yellow("warn "),
        info: colors.blue("info ")
    };
    const lines = [
        `  ${marker[finding.severity]}  ${finding.message}`,
        `         ${colors.dim(`${findingLocation(finding)}  ${finding.ruleId}`)}`
    ];
    if (finding.help)
        lines.push(`         ${colors.cyan("fix:")} ${finding.help}`);
    return lines.join("\n");
}
function colorScore(value, score, colors) {
    if (score >= 90)
        return colors.green(value);
    if (score >= 70)
        return colors.yellow(value);
    return colors.red(value);
}
function summaryText(report, colors) {
    const { summary } = report;
    const fragments = [
        `${summary.skills} skill${summary.skills === 1 ? "" : "s"}`,
        colors.red(`${summary.errors} error${summary.errors === 1 ? "" : "s"}`),
        colors.yellow(`${summary.warnings} warning${summary.warnings === 1 ? "" : "s"}`),
        colors.blue(`${summary.infos} info`)
    ];
    return colors.bold(fragments.join(" | "));
}
//# sourceMappingURL=pretty.js.map