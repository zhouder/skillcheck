import packageJson from "../../package.json" with { type: "json" };

if (typeof packageJson.version !== "string" || packageJson.version.length === 0) {
  throw new Error("package.json must contain a non-empty version string.");
}

export const SKILLCHECK_VERSION = packageJson.version;
