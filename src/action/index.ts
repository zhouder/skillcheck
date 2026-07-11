import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import * as core from "@actions/core";
import { analyze } from "../core/analyze.js";
import type { AnalysisReport, Finding, Severity } from "../core/types.js";
import { markdownReport, sarifReport } from "../reporters/index.js";
import { allFindings } from "../reporters/shared.js";
import { severityAtLeast } from "../rules/helpers.js";

const MAX_ANNOTATIONS = 100;

async function run(): Promise<void> {
  try {
    const targetPath = core.getInput("path") || ".";
    const configPath = core.getInput("config") || undefined;
    const failOn = parseFailOn(core.getInput("fail-on") || "error");
    const sarifFile = core.getInput("sarif-file");

    const report = await analyze({
      paths: [targetPath],
      ...(configPath === undefined ? {} : { configPath })
    });

    annotate(report);
    core.setOutput("score", report.summary.lowestScore ?? 0);
    core.setOutput("skills", report.summary.skills);
    core.setOutput("errors", report.summary.errors);
    core.setOutput("warnings", report.summary.warnings);

    if (sarifFile) {
      await mkdir(path.dirname(path.resolve(sarifFile)), { recursive: true });
      await writeFile(sarifFile, sarifReport(report), "utf8");
    }

    await core.summary.addRaw(markdownReport(report)).write();

    if (failOn !== "never") {
      const threshold: Severity = failOn;
      if (allFindings(report).some((finding) => severityAtLeast(finding.severity, threshold))) {
        core.setFailed(
          `Skillcheck found ${report.summary.errors} errors and ${report.summary.warnings} warnings.`
        );
      }
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

function annotate(report: AnalysisReport): void {
  const findings = allFindings(report);
  for (const finding of findings.slice(0, MAX_ANNOTATIONS)) {
    const properties: core.AnnotationProperties = {
      title: `${finding.title} (${finding.ruleId})`,
      file: finding.location.path,
      ...(finding.location.line === undefined ? {} : { startLine: finding.location.line }),
      ...(finding.location.column === undefined ? {} : { startColumn: finding.location.column })
    };
    const message = finding.help ? `${finding.message} Fix: ${finding.help}` : finding.message;
    annotateFinding(finding, message, properties);
  }
  if (findings.length > MAX_ANNOTATIONS) {
    core.notice(
      `Showing ${MAX_ANNOTATIONS.toLocaleString()} of ${findings.length.toLocaleString()} findings as annotations. Review the Markdown summary or SARIF report for the complete result.`
    );
  }
}

function annotateFinding(
  finding: Finding,
  message: string,
  properties: core.AnnotationProperties
): void {
  if (finding.severity === "error") core.error(message, properties);
  else if (finding.severity === "warning") core.warning(message, properties);
  else core.notice(message, properties);
}

function parseFailOn(value: string): "error" | "warning" | "never" {
  if (value === "error" || value === "warning" || value === "never") return value;
  throw new Error(`Invalid fail-on value: ${value}`);
}

void run();
