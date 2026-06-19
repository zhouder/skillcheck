import { writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ConfigError, defaultConfig, loadConfig } from "../src/core/config.js";
import { temporaryDirectory } from "./helpers.js";

describe("configuration", () => {
  it("uses safe defaults without a config file", async () => {
    const cwd = await temporaryDirectory();
    const result = await loadConfig({ cwd });

    expect(result.config).toEqual(defaultConfig);
    expect(result.configFile).toBeUndefined();
  });

  it("loads an upward JSON config and merges rule overrides", async () => {
    const cwd = await temporaryDirectory();
    const nested = path.join(cwd, "one", "two");
    await import("node:fs/promises").then(({ mkdir }) => mkdir(nested, { recursive: true }));
    await writeFile(
      path.join(cwd, ".skillcheckrc.json"),
      JSON.stringify({
        maxDepth: 3,
        ignore: ["**/vendor/**"],
        rules: { "quality/license": "off" }
      }),
      "utf8"
    );

    const result = await loadConfig({
      cwd: nested,
      overrides: {
        ignore: ["**/generated/**"],
        rules: { "security/insecure-url": "error" }
      }
    });

    expect(result.config.maxDepth).toBe(3);
    expect(result.config.rules).toEqual({
      "quality/license": "off",
      "security/insecure-url": "error"
    });
    expect(result.config.ignore).toEqual([
      ...defaultConfig.ignore,
      "**/vendor/**",
      "**/generated/**"
    ]);
  });

  it("rejects unknown fields and executable-style config files", async () => {
    const cwd = await temporaryDirectory();
    const file = path.join(cwd, "bad.json");
    await writeFile(file, JSON.stringify({ plugin: "./run-me.js" }), "utf8");

    await expect(loadConfig({ cwd, explicitPath: file })).rejects.toBeInstanceOf(ConfigError);
  });
});
