import type { AnalysisReport, Finding, Severity } from "../core/types.js";
import { findRule } from "../rules/index.js";
import { allFindings } from "./shared.js";

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
  shortDescription: { text: string };
  fullDescription: { text: string };
  help: { text: string };
  defaultConfiguration: { level: "error" | "warning" | "note" };
  properties: { category: string };
}

interface SarifResult {
  ruleId: string;
  level: "error" | "warning" | "note";
  message: { text: string };
  locations: Array<{
    physicalLocation: {
      artifactLocation: { uri: string; uriBaseId: "%SRCROOT%" };
      region?: { startLine: number; startColumn?: number; endLine?: number; endColumn?: number };
    };
  }>;
  properties: { category: string; scoreImpact: Severity };
}

export function sarifObject(report: AnalysisReport): SarifLog {
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

export function sarifReport(report: AnalysisReport): string {
  return `${JSON.stringify(sarifObject(report), null, 2)}\n`;
}

function sarifRule(id: string, findings: Finding[]): SarifRule {
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

function sarifResult(finding: Finding): SarifResult {
  const region =
    finding.location.line === undefined
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

function sarifLevel(severity: Severity): "error" | "warning" | "note" {
  const levels = { error: "error", warning: "warning", info: "note" } as const;
  return levels[severity];
}
