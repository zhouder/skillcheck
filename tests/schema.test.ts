import { readFile } from "node:fs/promises";
import path from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { analyze } from "../src/core/analyze.js";
import { temporaryDirectory, validSkillMarkdown, writeSkill } from "./helpers.js";

describe("published JSON schemas", () => {
  it("accepts JSON reports produced by Skillcheck", async () => {
    const root = await temporaryDirectory();
    await writeSkill(root, "schema-skill", validSkillMarkdown("schema-skill"), {
      "references/guide.md": "# Guide\n"
    });
    const schema = JSON.parse(await readFile(path.resolve("schema", "report.schema.json"), "utf8"));
    const validate = new Ajv2020({ strict: true }).compile(schema);
    const jsonValue = JSON.parse(JSON.stringify(await analyze({ cwd: root })));

    expect(validate(jsonValue), JSON.stringify(validate.errors)).toBe(true);
  });

  it("accepts documented config and rejects unknown fields", async () => {
    const schema = JSON.parse(await readFile(path.resolve("schema", "config.schema.json"), "utf8"));
    const validate = new Ajv2020({ strict: true }).compile(schema);

    expect(
      validate({
        $schema: "https://unpkg.com/skillcheck/schema/config.schema.json",
        maxDepth: 8,
        failOn: "warning",
        rules: { "quality/license": "error" }
      })
    ).toBe(true);
    expect(validate({ plugins: ["execute-me.js"] })).toBe(false);
  });
});
