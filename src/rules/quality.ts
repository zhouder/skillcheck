import { access } from "node:fs/promises";
import path from "node:path";
import type { Heading, Nodes } from "mdast";
import { visit } from "unist-util-visit";
import type { Finding, Rule } from "../core/types.js";
import { defineRule, frontmatterLine, isInside, skillFileLocation } from "./helpers.js";

const bodyContent = defineRule(
  {
    id: "quality/instructions",
    title: "Instructions are too thin",
    description: "A useful skill needs concrete instructions beyond its metadata.",
    category: "quality",
    defaultSeverity: "warning",
    recommendation: "Add a focused workflow, examples, and important edge cases."
  },
  ({ skill, createFinding }) => {
    const content = skill.body.replaceAll(/<!--[\s\S]*?-->/gu, "").trim();
    if (content.length >= 120) return [];
    return [
      createFinding({
        message: content
          ? "The instruction body is too short to guide reliable execution."
          : "The instruction body is empty.",
        location: skillFileLocation(skill, skill.bodyStartLine),
        help: "Add the minimum concrete procedure an agent needs to perform the task correctly."
      })
    ];
  }
);

const descriptionDiscovery = defineRule(
  {
    id: "quality/discoverable-description",
    title: "Description may be hard to discover",
    description: "Descriptions should explain both capability and activation context.",
    category: "quality",
    defaultSeverity: "warning",
    recommendation: "Name concrete operations, file types, domains, and when the skill applies."
  },
  ({ skill, createFinding }) => {
    if (typeof skill.metadata.description !== "string") return [];
    const description = skill.metadata.description.trim();
    const hasActivationContext =
      /\b(when|whenever|use (?:this )?(?:skill )?(?:for|to)|trigger|task|working with)\b/iu.test(
        description
      ) || /(?:当|用于|适用|使用场景|需要|任务)/u.test(description);
    if (description.length >= 60 && hasActivationContext) return [];

    return [
      createFinding({
        message:
          description.length < 60
            ? "The description is short and may not contain enough discovery keywords."
            : "The description explains capability but not when the skill should activate.",
        location: skillFileLocation(skill, frontmatterLine(skill, "description")),
        evidence: description,
        help: "Describe what the skill does and include a concrete `Use when ...` clause."
      })
    ];
  }
);

const license = defineRule(
  {
    id: "quality/license",
    title: "License is not declared",
    description:
      "Published skills should tell users how bundled instructions and code may be used.",
    category: "quality",
    defaultSeverity: "info",
    recommendation: "Set the `license` field and include the referenced license file when needed."
  },
  ({ skill, createFinding }) => {
    if (typeof skill.metadata.license === "string" && skill.metadata.license.trim()) return [];
    return [
      createFinding({
        message: "No `license` field is present in the frontmatter.",
        location: skillFileLocation(skill, 2),
        help: "Add a license identifier or a reference such as `license: MIT`."
      })
    ];
  }
);

const duplicateHeadings = defineRule(
  {
    id: "quality/duplicate-heading",
    title: "Duplicate heading",
    description: "Repeated section names make long instructions harder to navigate.",
    category: "quality",
    defaultSeverity: "info",
    recommendation: "Merge duplicate sections or give each section a distinct purpose."
  },
  ({ skill, createFinding }) => {
    if (!skill.markdown) return [];
    const seen = new Map<string, number>();
    const findings: Finding[] = [];
    visit(skill.markdown, "heading", (node: Nodes) => {
      const heading = node as Heading;
      const text = heading.children
        .map((child) => ("value" in child && typeof child.value === "string" ? child.value : ""))
        .join("")
        .trim()
        .toLowerCase();
      if (!text) return;
      const prior = seen.get(text);
      if (prior) {
        findings.push(
          createFinding({
            message: `Heading \`${text}\` repeats the section first seen on line ${prior}.`,
            location: skillFileLocation(
              skill,
              skill.bodyStartLine + (heading.position?.start.line ?? 1) - 1,
              heading.position?.start.column ?? 1
            ),
            help: "Combine the sections or rename one to clarify the distinction."
          })
        );
      } else {
        seen.set(text, skill.bodyStartLine + (heading.position?.start.line ?? 1) - 1);
      }
    });
    return findings;
  }
);

const localReferences = defineRule(
  {
    id: "quality/local-reference",
    title: "Invalid local reference",
    description: "Local Markdown links must stay within the skill and point to existing files.",
    category: "quality",
    defaultSeverity: "error",
    recommendation: "Use valid relative paths from the skill root."
  },
  async ({ skill, createFinding }) => {
    const findings = [];
    for (const reference of skill.references) {
      const destination = localDestination(reference.destination);
      if (destination === undefined) continue;
      const absolute = path.resolve(skill.directory, destination);
      if (!isInside(skill.directory, absolute)) {
        findings.push(
          createFinding({
            message: `Reference \`${reference.destination}\` escapes the skill directory.`,
            location: skillFileLocation(skill, reference.line, reference.column),
            evidence: reference.destination,
            help: "Bundle the resource in the skill and use a relative path without `..`."
          })
        );
        continue;
      }
      try {
        await access(absolute);
      } catch {
        findings.push(
          createFinding({
            message: `Reference \`${reference.destination}\` does not exist.`,
            location: skillFileLocation(skill, reference.line, reference.column),
            evidence: reference.destination,
            help: "Correct the path or add the referenced file."
          })
        );
      }
    }
    return findings;
  }
);

const deepReferences = defineRule(
  {
    id: "quality/deep-reference",
    title: "Reference is deeply nested",
    description: "Agent Skills recommend keeping file references one level deep from SKILL.md.",
    category: "quality",
    defaultSeverity: "warning",
    recommendation: "Keep referenced resources in a direct folder such as `references/`."
  },
  ({ skill, createFinding }) =>
    skill.references.flatMap((reference) => {
      const destination = localDestination(reference.destination);
      if (destination === undefined) return [];
      const segments = destination.split(/[\\/]/u).filter((segment) => segment && segment !== ".");
      if (segments.length <= 2) return [];
      return [
        createFinding({
          message: `Reference \`${reference.destination}\` is more than one directory level deep.`,
          location: skillFileLocation(skill, reference.line, reference.column),
          help: "Flatten reference paths so agents can load supporting material directly."
        })
      ];
    })
);

function localDestination(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("#")) return undefined;
  if (/^[a-z][a-z\d+.-]*:/iu.test(trimmed) || trimmed.startsWith("//")) return undefined;
  const withoutFragment = trimmed.split(/[?#]/u, 1)[0];
  if (!withoutFragment) return undefined;
  try {
    return decodeURIComponent(withoutFragment);
  } catch {
    return withoutFragment;
  }
}

export const qualityRules: Rule[] = [
  bodyContent,
  descriptionDiscovery,
  license,
  duplicateHeadings,
  localReferences,
  deepReferences
];
