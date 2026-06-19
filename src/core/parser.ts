import type { Dir, Stats } from "node:fs";
import { lstat, opendir, readFile, readlink } from "node:fs/promises";
import path from "node:path";
import type { Image, Link, Nodes, Root } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { visit } from "unist-util-visit";
import { parseDocument } from "yaml";
import { createFinding, normalizePath } from "./finding.js";
import type { Finding, MarkdownReference, ParsedSkill, SkillFile, SkillMetadata } from "./types.js";

const MAX_SKILL_FILE_BYTES = 1024 * 1024;
const MAX_FILES = 5_000;

export async function parseSkill(directory: string, reportRoot: string): Promise<ParsedSkill> {
  const skillFile = path.join(directory, "SKILL.md");
  const parseFindings: Finding[] = [];
  let raw = "";

  try {
    const stats = await lstat(skillFile);
    if (stats.size > MAX_SKILL_FILE_BYTES) {
      parseFindings.push(
        parserFinding(
          "parse/file-too-large",
          "Skill file is too large",
          `SKILL.md is ${stats.size.toLocaleString()} bytes; the parser limit is ${MAX_SKILL_FILE_BYTES.toLocaleString()} bytes.`,
          "error",
          skillFile,
          reportRoot,
          "Move detailed material into focused reference files."
        )
      );
    } else {
      raw = await readFile(skillFile, "utf8");
    }
  } catch (error) {
    parseFindings.push(
      parserFinding(
        "parse/read-failed",
        "Skill file cannot be read",
        error instanceof Error ? error.message : String(error),
        "error",
        skillFile,
        reportRoot,
        "Ensure SKILL.md exists and is readable."
      )
    );
  }

  const frontmatter = parseFrontmatter(raw, skillFile, reportRoot);
  parseFindings.push(...frontmatter.findings);

  let markdown: Root | undefined;
  const references: MarkdownReference[] = [];
  if (frontmatter.body) {
    try {
      markdown = fromMarkdown(frontmatter.body);
      visit(markdown, ["link", "image"], (node: Nodes) => {
        if (node.type !== "link" && node.type !== "image") {
          return;
        }
        const referenceNode = node as Link | Image;
        references.push({
          destination: referenceNode.url,
          line: frontmatter.bodyStartLine + (referenceNode.position?.start.line ?? 1) - 1,
          column: referenceNode.position?.start.column ?? 1,
          image: node.type === "image"
        });
      });
    } catch (error) {
      parseFindings.push(
        parserFinding(
          "parse/markdown",
          "Markdown cannot be parsed",
          error instanceof Error ? error.message : String(error),
          "error",
          skillFile,
          reportRoot,
          "Correct malformed Markdown syntax."
        )
      );
    }
  }

  const files = await listSkillFiles(directory, reportRoot, parseFindings);

  return {
    directory,
    skillFile,
    raw,
    frontmatterRaw: frontmatter.frontmatterRaw,
    body: frontmatter.body,
    bodyStartLine: frontmatter.bodyStartLine,
    metadata: frontmatter.metadata,
    markdown,
    references,
    files,
    parseFindings
  };
}

function parseFrontmatter(
  raw: string,
  skillFile: string,
  reportRoot: string
): {
  frontmatterRaw: string;
  body: string;
  bodyStartLine: number;
  metadata: SkillMetadata;
  findings: Finding[];
} {
  const findings: Finding[] = [];
  const lines = raw.split(/\r?\n/u);
  if (lines[0] !== "---") {
    findings.push(
      parserFinding(
        "parse/frontmatter-missing",
        "YAML frontmatter is missing",
        "SKILL.md must start with a YAML frontmatter delimiter (`---`).",
        "error",
        skillFile,
        reportRoot,
        "Add frontmatter containing at least `name` and `description`.",
        1
      )
    );
    return {
      frontmatterRaw: "",
      body: raw,
      bodyStartLine: 1,
      metadata: {},
      findings
    };
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line === "---");
  if (closingIndex === -1) {
    findings.push(
      parserFinding(
        "parse/frontmatter-unclosed",
        "YAML frontmatter is not closed",
        "Add a closing `---` delimiter before the Markdown body.",
        "error",
        skillFile,
        reportRoot,
        "Close the YAML frontmatter with a line containing only `---`.",
        1
      )
    );
    return {
      frontmatterRaw: lines.slice(1).join("\n"),
      body: "",
      bodyStartLine: lines.length + 1,
      metadata: {},
      findings
    };
  }

  const frontmatterRaw = lines.slice(1, closingIndex).join("\n");
  const body = lines.slice(closingIndex + 1).join("\n");
  let metadata: SkillMetadata = {};

  try {
    const document = parseDocument(frontmatterRaw, {
      prettyErrors: false,
      strict: true,
      uniqueKeys: true
    });
    if (document.errors.length > 0) {
      for (const error of document.errors) {
        findings.push(
          parserFinding(
            "parse/yaml",
            "YAML frontmatter is invalid",
            error.message,
            "error",
            skillFile,
            reportRoot,
            "Correct the YAML syntax and remove duplicate keys.",
            yamlErrorLine(error.pos[0], frontmatterRaw) + 1
          )
        );
      }
    } else {
      const value: unknown = document.toJS({ maxAliasCount: 10 });
      if (isRecord(value)) {
        metadata = value;
      } else if (value !== null) {
        findings.push(
          parserFinding(
            "parse/frontmatter-type",
            "Frontmatter must be a mapping",
            "The YAML frontmatter root must contain named fields, not a scalar or list.",
            "error",
            skillFile,
            reportRoot,
            "Use `name: ...` and `description: ...` mapping entries.",
            2
          )
        );
      }
    }
  } catch (error) {
    findings.push(
      parserFinding(
        "parse/yaml",
        "YAML frontmatter is invalid",
        error instanceof Error ? error.message : String(error),
        "error",
        skillFile,
        reportRoot,
        "Correct the YAML syntax and avoid aliases with excessive expansion.",
        2
      )
    );
  }

  return {
    frontmatterRaw,
    body,
    bodyStartLine: closingIndex + 2,
    metadata,
    findings
  };
}

async function listSkillFiles(
  directory: string,
  reportRoot: string,
  findings: Finding[]
): Promise<SkillFile[]> {
  const files: SkillFile[] = [];

  async function walk(current: string): Promise<void> {
    if (files.length >= MAX_FILES) {
      return;
    }

    let handle: Dir;
    try {
      handle = await opendir(current);
    } catch (error) {
      findings.push(
        parserFinding(
          "parse/directory-read-failed",
          "Skill directory cannot be read",
          error instanceof Error ? error.message : String(error),
          "warning",
          current,
          reportRoot,
          "Ensure every bundled directory is readable."
        )
      );
      return;
    }

    const entries = [];
    for await (const entry of handle) {
      entries.push(entry);
    }
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      const relativePath = normalizePath(path.relative(directory, absolutePath));
      let stats: Stats;
      try {
        stats = await lstat(absolutePath);
      } catch (error) {
        findings.push(
          parserFinding(
            "parse/path-inspect-failed",
            "Bundled path cannot be inspected",
            error instanceof Error ? error.message : String(error),
            "warning",
            absolutePath,
            reportRoot,
            "Remove the broken path or make it readable."
          )
        );
        continue;
      }
      if (stats.isSymbolicLink()) {
        const target = await readlink(absolutePath).catch(() => "<unreadable>");
        files.push({ absolutePath, relativePath, size: 0, kind: "symlink", symlinkTarget: target });
      } else if (stats.isDirectory()) {
        await walk(absolutePath);
      } else if (stats.isFile()) {
        files.push({ absolutePath, relativePath, size: stats.size, kind: "file" });
      }

      if (files.length >= MAX_FILES) {
        findings.push(
          parserFinding(
            "parse/file-limit",
            "Skill contains too many files",
            `Analysis stopped after ${MAX_FILES.toLocaleString()} files.`,
            "warning",
            directory,
            reportRoot,
            "Remove generated or unrelated files from the skill package."
          )
        );
        return;
      }
    }
  }

  await walk(directory);
  return files;
}

function parserFinding(
  ruleId: string,
  title: string,
  message: string,
  severity: "error" | "warning",
  filePath: string,
  root: string,
  help: string,
  line?: number
): Finding {
  return createFinding({
    ruleId,
    title,
    message,
    severity,
    category: "spec",
    filePath,
    root,
    help,
    ...(line === undefined ? {} : { line, column: 1 })
  });
}

function yamlErrorLine(offset: number, source: string): number {
  return source.slice(0, offset).split(/\r?\n/u).length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
