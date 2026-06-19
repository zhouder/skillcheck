import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/action/**",
        "src/cli.ts",
        "src/index.ts",
        "src/core/types.ts",
        "src/reporters/index.ts"
      ],
      thresholds: {
        branches: 80,
        functions: 85,
        lines: 85,
        statements: 85
      }
    },
    include: ["tests/**/*.test.ts"],
    restoreMocks: true
  }
});
