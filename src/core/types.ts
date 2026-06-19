import type { Root } from "mdast";

export const severityOrder = {
  error: 0,
  warning: 1,
  info: 2
} as const;

export type Severity = keyof typeof severityOrder;

export type RuleCategory =
  | "spec"
  | "security"
  | "quality"
  | "efficiency"
  | "portability"
  | "internal";

export interface SourceLocation {
  path: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
}

export interface Finding {
  ruleId: string;
  title: string;
  message: string;
  severity: Severity;
  category: RuleCategory;
  location: SourceLocation;
  evidence?: string;
  help?: string;
}

export interface SkillMetadata {
  name?: unknown;
  description?: unknown;
  license?: unknown;
  compatibility?: unknown;
  metadata?: unknown;
  "allowed-tools"?: unknown;
  [key: string]: unknown;
}

export interface SkillFile {
  absolutePath: string;
  relativePath: string;
  size: number;
  kind: "file" | "symlink";
  symlinkTarget?: string;
}

export interface MarkdownReference {
  destination: string;
  line: number;
  column: number;
  image: boolean;
}

export interface ParsedSkill {
  directory: string;
  skillFile: string;
  raw: string;
  frontmatterRaw: string;
  body: string;
  bodyStartLine: number;
  metadata: SkillMetadata;
  markdown: Root | undefined;
  references: MarkdownReference[];
  files: SkillFile[];
  parseFindings: Finding[];
}

export interface SkillMetrics {
  fileCount: number;
  totalBytes: number;
  scriptCount: number;
  referenceCount: number;
  externalLinkCount: number;
  skillLines: number;
  estimatedTokens: number;
}

export interface SkillResult {
  directory: string;
  skillFile: string;
  name: string | undefined;
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  metrics: SkillMetrics;
  findings: Finding[];
}

export interface AnalysisSummary {
  skills: number;
  errors: number;
  warnings: number;
  infos: number;
  lowestScore: number | undefined;
}

export interface AnalysisReport {
  schemaVersion: "1";
  tool: {
    name: "skillcheck";
    version: string;
  };
  root: string;
  configFile: string | undefined;
  settings: {
    failOn: "error" | "warning" | "never";
  };
  results: SkillResult[];
  globalFindings: Finding[];
  summary: AnalysisSummary;
}

export interface RuleMetadata {
  id: string;
  title: string;
  description: string;
  category: RuleCategory;
  defaultSeverity: Severity;
  recommendation: string;
}

export interface RuleContext {
  skill: ParsedSkill;
  severity: Severity;
  createFinding: (input: Omit<Finding, "ruleId" | "title" | "severity" | "category">) => Finding;
}

export interface Rule {
  meta: RuleMetadata;
  check: (context: RuleContext) => Finding[] | Promise<Finding[]>;
}

export type RuleSetting = Severity | "off";

export interface SkillcheckConfig {
  ignore: string[];
  rules: Record<string, RuleSetting>;
  maxDepth: number;
  failOn: "error" | "warning" | "never";
}

export interface AnalyzeOptions {
  paths?: string[];
  cwd?: string;
  configPath?: string;
  config?: Partial<SkillcheckConfig>;
}
