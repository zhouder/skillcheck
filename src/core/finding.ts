import path from "node:path";
import type { Finding, RuleCategory, Severity } from "./types.js";

export function createFinding(input: {
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
}): Finding {
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

export function normalizePath(value: string): string {
  return value.replaceAll("\\", "/");
}
