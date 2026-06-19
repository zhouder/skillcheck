import type { Dir, Stats } from "node:fs";
import { lstat, opendir } from "node:fs/promises";
import path from "node:path";
import { minimatch } from "minimatch";
import { normalizePath } from "./finding.js";

export interface DiscoveryIssue {
  path: string;
  message: string;
}

export interface DiscoveryResult {
  directories: string[];
  issues: DiscoveryIssue[];
}

export async function discoverSkills(options: {
  inputs: string[];
  cwd: string;
  ignore: string[];
  maxDepth: number;
}): Promise<DiscoveryResult> {
  const found = new Set<string>();
  const issues: DiscoveryIssue[] = [];

  for (const input of options.inputs) {
    const absoluteInput = path.resolve(options.cwd, input);
    let stats: Stats;
    try {
      stats = await lstat(absoluteInput);
    } catch {
      issues.push({ path: absoluteInput, message: `Path does not exist: ${input}` });
      continue;
    }

    if (stats.isSymbolicLink()) {
      issues.push({
        path: absoluteInput,
        message: "Input path is a symbolic link and was not followed."
      });
      continue;
    }

    if (stats.isFile()) {
      if (path.basename(absoluteInput) === "SKILL.md") {
        found.add(path.dirname(absoluteInput));
      } else {
        issues.push({ path: absoluteInput, message: "Input file must be named SKILL.md." });
      }
      continue;
    }

    if (!stats.isDirectory()) {
      issues.push({ path: absoluteInput, message: "Input must be a directory or SKILL.md file." });
      continue;
    }

    await walkForSkills({
      directory: absoluteInput,
      root: absoluteInput,
      depth: 0,
      maxDepth: options.maxDepth,
      ignore: options.ignore,
      found,
      issues
    });
  }

  return {
    directories: [...found].sort((left, right) => left.localeCompare(right)),
    issues
  };
}

async function walkForSkills(options: {
  directory: string;
  root: string;
  depth: number;
  maxDepth: number;
  ignore: string[];
  found: Set<string>;
  issues: DiscoveryIssue[];
}): Promise<void> {
  if (isIgnored(options.directory, options.root, options.ignore)) {
    return;
  }

  let handle: Dir;
  try {
    handle = await opendir(options.directory);
  } catch (error) {
    options.issues.push({
      path: options.directory,
      message: `Cannot read directory: ${error instanceof Error ? error.message : String(error)}`
    });
    return;
  }

  const childDirectories: string[] = [];
  let hasSkillFile = false;

  for await (const entry of handle) {
    const entryPath = path.join(options.directory, entry.name);
    let stats: Stats;
    try {
      stats = await lstat(entryPath);
    } catch (error) {
      options.issues.push({
        path: entryPath,
        message: `Cannot inspect path: ${error instanceof Error ? error.message : String(error)}`
      });
      continue;
    }
    if (stats.isSymbolicLink()) {
      continue;
    }
    if (entry.name === "SKILL.md" && stats.isFile()) {
      hasSkillFile = true;
      continue;
    }
    if (stats.isDirectory()) {
      childDirectories.push(entryPath);
    }
  }

  if (hasSkillFile) {
    options.found.add(options.directory);
    return;
  }

  if (options.depth >= options.maxDepth) {
    return;
  }

  childDirectories.sort((left, right) => left.localeCompare(right));
  for (const child of childDirectories) {
    await walkForSkills({ ...options, directory: child, depth: options.depth + 1 });
  }
}

function isIgnored(candidate: string, root: string, patterns: string[]): boolean {
  const relative = normalizePath(path.relative(root, candidate));
  if (!relative) {
    return false;
  }
  return patterns.some(
    (pattern) =>
      minimatch(relative, pattern, { dot: true }) ||
      minimatch(`${relative}/`, pattern, { dot: true })
  );
}
