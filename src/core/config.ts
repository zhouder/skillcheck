import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { SkillcheckConfig } from "./types.js";

const CONFIG_NAMES = [".skillcheckrc.json", "skillcheck.config.json"] as const;

const configSchema = z
  .object({
    $schema: z.string().optional(),
    ignore: z.array(z.string().min(1)).optional(),
    rules: z.record(z.string(), z.enum(["off", "info", "warning", "error"])).optional(),
    maxDepth: z.number().int().min(0).max(32).optional(),
    failOn: z.enum(["error", "warning", "never"]).optional()
  })
  .strict();

export const defaultConfig: SkillcheckConfig = {
  ignore: [
    "**/.git/**",
    "**/node_modules/**",
    "**/dist/**",
    "**/coverage/**",
    "**/.venv/**",
    "**/venv/**"
  ],
  rules: {},
  maxDepth: 8,
  failOn: "error"
};

export class ConfigError extends Error {
  readonly configPath: string;

  constructor(configPath: string, message: string) {
    super(message);
    this.name = "ConfigError";
    this.configPath = configPath;
  }
}

export async function loadConfig(options: {
  cwd: string;
  explicitPath?: string;
  overrides?: Partial<SkillcheckConfig>;
}): Promise<{ config: SkillcheckConfig; configFile: string | undefined }> {
  const configFile = options.explicitPath
    ? path.resolve(options.cwd, options.explicitPath)
    : await findConfig(options.cwd);

  let fileConfig: Partial<SkillcheckConfig> = {};

  if (configFile) {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(await readFile(configFile, "utf8"));
    } catch (error) {
      throw new ConfigError(configFile, `Cannot parse configuration: ${errorMessage(error)}`);
    }

    const parsed = configSchema.safeParse(parsedJson);
    if (!parsed.success) {
      const details = parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "config"}: ${issue.message}`)
        .join("; ");
      throw new ConfigError(configFile, `Invalid configuration: ${details}`);
    }
    fileConfig = {
      ...(parsed.data.ignore === undefined ? {} : { ignore: parsed.data.ignore }),
      ...(parsed.data.rules === undefined ? {} : { rules: parsed.data.rules }),
      ...(parsed.data.maxDepth === undefined ? {} : { maxDepth: parsed.data.maxDepth }),
      ...(parsed.data.failOn === undefined ? {} : { failOn: parsed.data.failOn })
    };
  }

  const overrides = options.overrides ?? {};
  return {
    config: {
      ...defaultConfig,
      ...fileConfig,
      ...overrides,
      ignore: [
        ...new Set([
          ...defaultConfig.ignore,
          ...(fileConfig.ignore ?? []),
          ...(overrides.ignore ?? [])
        ])
      ],
      rules: {
        ...defaultConfig.rules,
        ...fileConfig.rules,
        ...overrides.rules
      }
    },
    configFile
  };
}

async function findConfig(startDirectory: string): Promise<string | undefined> {
  let current = path.resolve(startDirectory);
  while (true) {
    for (const name of CONFIG_NAMES) {
      const candidate = path.join(current, name);
      try {
        await access(candidate);
        return candidate;
      } catch {
        // Continue searching upward.
      }
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
