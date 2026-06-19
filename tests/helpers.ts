import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export async function temporaryDirectory(prefix = "skillcheck-"): Promise<string> {
  return mkdtemp(path.join(tmpdir(), prefix));
}

export async function writeSkill(
  root: string,
  name: string,
  skillMarkdown: string,
  files: Record<string, string> = {}
): Promise<string> {
  const directory = path.join(root, name);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "SKILL.md"), skillMarkdown, "utf8");
  for (const [relativePath, content] of Object.entries(files)) {
    const target = path.join(directory, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  }
  return directory;
}

export function validSkillMarkdown(name: string): string {
  return `---
name: ${name}
description: Reviews CSV datasets and produces validated summaries. Use when a user needs to inspect, clean, or summarize CSV files.
license: MIT
---
# CSV review workflow

1. Read the input CSV and validate the header.
2. Identify missing values and inconsistent column types.
3. Produce a concise summary with concrete row counts.

See [the reference guide](references/guide.md) for malformed-row handling.
`;
}
