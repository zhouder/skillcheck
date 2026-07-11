import type { Rule } from "../core/types.js";
import { defineRule, readScannableScan } from "./helpers.js";

const scriptScanIncomplete = defineRule(
  {
    id: "security/script-scan-incomplete",
    title: "Bundled scripts were not fully scanned",
    description:
      "Every bundled script must be inspected before a skill can be considered safe to publish.",
    category: "security",
    defaultSeverity: "error",
    recommendation: "Reduce, split, or remove oversized scripts so the complete content can be scanned."
  },
  async ({ skill, createFinding }) => {
    const scan = await readScannableScan(skill);
    const skipped = scan.skipped.filter((file) => file.relativePath.startsWith("scripts/"));
    if (skipped.length === 0) return [];
    const examples = skipped
      .slice(0, 5)
      .map((file) => `\`${file.relativePath}\` (${reasonText(file.reason)})`)
      .join(", ");
    return [
      createFinding({
        message: `${skipped.length.toLocaleString()} bundled script${skipped.length === 1 ? " was" : "s were"} not fully scanned: ${examples}.`,
        location: { path: skill.directory },
        help: "Keep each script below 512 KiB and the total scannable text below 4 MiB, or remove generated content."
      })
    ];
  }
);

const referenceScanIncomplete = defineRule(
  {
    id: "security/reference-scan-incomplete",
    title: "Bundled text resources were not fully scanned",
    description:
      "Skipped text resources reduce confidence that the skill package is free from unsafe instructions.",
    category: "security",
    defaultSeverity: "warning",
    recommendation: "Reduce or split oversized text resources so the complete package can be scanned."
  },
  async ({ skill, createFinding }) => {
    const scan = await readScannableScan(skill);
    const skipped = scan.skipped.filter((file) => !file.relativePath.startsWith("scripts/"));
    if (skipped.length === 0) return [];
    const examples = skipped
      .slice(0, 5)
      .map((file) => `\`${file.relativePath}\` (${reasonText(file.reason)})`)
      .join(", ");
    return [
      createFinding({
        message: `${skipped.length.toLocaleString()} text resource${skipped.length === 1 ? " was" : "s were"} not fully scanned: ${examples}.`,
        location: { path: skill.directory },
        help: "Keep each text resource below 512 KiB and the total scannable text below 4 MiB."
      })
    ];
  }
);

function reasonText(reason: "file-too-large" | "total-budget" | "binary" | "read-failed"): string {
  return {
    "file-too-large": "file exceeds 512 KiB",
    "total-budget": "4 MiB scan budget exhausted",
    binary: "binary content detected",
    "read-failed": "file could not be read"
  }[reason];
}

export const scanCompletenessRules: Rule[] = [scriptScanIncomplete, referenceScanIncomplete];
