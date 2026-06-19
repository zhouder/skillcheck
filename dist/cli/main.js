import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Command, InvalidArgumentError } from "commander";
import { analyze, SKILLCHECK_VERSION } from "../core/analyze.js";
import { ConfigError } from "../core/config.js";
import { badgeReport, jsonReport, markdownReport, prettyReport, sarifReport } from "../reporters/index.js";
import { allFindings } from "../reporters/shared.js";
import { severityAtLeast } from "../rules/helpers.js";
import { rules } from "../rules/index.js";
export async function runCli(argv, io = process) {
    const program = createProgram(io);
    try {
        await program.parseAsync(argv, { from: "user" });
        return Number(program.getOptionValue("exitCode") ?? 0);
    }
    catch (error) {
        if (error instanceof ConfigError) {
            io.stderr.write(`skillcheck: ${error.message}\nconfig: ${error.configPath}\n`);
            return 2;
        }
        if (error instanceof Error && "code" in error && String(error.code).startsWith("commander.")) {
            return "exitCode" in error && error.exitCode === 0 ? 0 : 2;
        }
        io.stderr.write(`skillcheck: ${error instanceof Error ? error.message : String(error)}\n`);
        return 2;
    }
}
function createProgram(io) {
    const program = new Command();
    program
        .name("skillcheck")
        .description("Validate, secure, and score Agent Skills.")
        .version(SKILLCHECK_VERSION)
        .exitOverride()
        .showSuggestionAfterError()
        .configureOutput({
        writeOut: (value) => io.stdout.write(value),
        writeErr: (value) => io.stderr.write(value)
    })
        .argument("[paths...]", "Skill directories, parent directories, or SKILL.md files", ["."])
        .option("-c, --config <file>", "path to a JSON configuration file")
        .option("-f, --format <format>", "pretty, json, sarif, markdown, or badge", parseFormat, "pretty")
        .option("-o, --output <file>", "write the report to a file instead of stdout")
        .option("--fail-on <severity>", "error, warning, or never", parseFailOn)
        .option("--max-depth <number>", "maximum discovery depth", parseDepth)
        .option("--no-color", "disable terminal colors")
        .option("-q, --quiet", "suppress stdout unless --output is used")
        .action(async (paths, options, command) => {
        const report = await analyze({
            paths,
            ...(options.config === undefined ? {} : { configPath: options.config }),
            ...(options.maxDepth === undefined && options.failOn === undefined
                ? {}
                : {
                    config: {
                        ...(options.maxDepth === undefined ? {} : { maxDepth: options.maxDepth }),
                        ...(options.failOn === undefined ? {} : { failOn: options.failOn })
                    }
                })
        });
        const output = renderReport(report, options.format, options.color);
        if (options.output) {
            const target = path.resolve(options.output);
            await mkdir(path.dirname(target), { recursive: true });
            await writeFile(target, output, "utf8");
        }
        else if (!options.quiet) {
            io.stdout.write(output);
        }
        const failOn = options.failOn ?? report.settings.failOn;
        command.parent?.setOptionValue("exitCode", exitCodeFor(report, failOn));
        program.setOptionValue("exitCode", exitCodeFor(report, failOn));
    });
    program
        .command("rules")
        .description("List available rules and their default severities")
        .option("--json", "emit machine-readable JSON")
        .action((options) => {
        if (options.json) {
            io.stdout.write(`${JSON.stringify(rules.map((rule) => rule.meta), null, 2)}\n`);
        }
        else {
            const lines = rules.map((rule) => `${rule.meta.id.padEnd(34)} ${rule.meta.defaultSeverity.padEnd(7)} ${rule.meta.title}`);
            io.stdout.write(`${lines.join("\n")}\n`);
        }
    });
    program
        .command("init")
        .description("Create a minimal Agent Skill without overwriting existing files")
        .argument("[directory]", "new skill directory", ".")
        .option("--description <text>", "discovery description")
        .action(async (directory, options) => {
        const targetDirectory = path.resolve(directory);
        const name = path.basename(targetDirectory).normalize("NFKC");
        validateInitName(name);
        const target = path.join(targetDirectory, "SKILL.md");
        try {
            await stat(target);
            throw new Error(`Refusing to overwrite existing file: ${target}`);
        }
        catch (error) {
            if (error instanceof Error && "code" in error && error.code === "ENOENT") {
                // Expected for a new skill.
            }
            else if (error instanceof Error && error.message.startsWith("Refusing")) {
                throw error;
            }
        }
        await mkdir(targetDirectory, { recursive: true });
        const description = options.description ??
            "Describe what this skill does. Use when the user needs this specific workflow.";
        await writeFile(target, `---\nname: ${name}\ndescription: ${JSON.stringify(description)}\nlicense: MIT\n---\n# ${name}\n\n## Workflow\n\n1. Add concrete, repeatable instructions.\n2. Document important validation and edge cases.\n3. Verify the result before returning it.\n`, "utf8");
        io.stdout.write(`Created ${target}\n`);
    });
    return program;
}
function renderReport(report, format, color) {
    switch (format) {
        case "pretty":
            return prettyReport(report, { color });
        case "json":
            return jsonReport(report);
        case "sarif":
            return sarifReport(report);
        case "markdown":
            return markdownReport(report);
        case "badge":
            return badgeReport(report);
    }
}
function exitCodeFor(report, failOn) {
    if (failOn === "never")
        return 0;
    const threshold = failOn;
    return allFindings(report).some((finding) => severityAtLeast(finding.severity, threshold))
        ? 1
        : 0;
}
function parseFormat(value) {
    if (["pretty", "json", "sarif", "markdown", "badge"].includes(value)) {
        return value;
    }
    throw new InvalidArgumentError("expected pretty, json, sarif, markdown, or badge");
}
function parseFailOn(value) {
    if (["error", "warning", "never"].includes(value))
        return value;
    throw new InvalidArgumentError("expected error, warning, or never");
}
function parseDepth(value) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 32) {
        throw new InvalidArgumentError("expected an integer from 0 to 32");
    }
    return parsed;
}
function validateInitName(name) {
    const validCharacters = [...name].every((character) => /[\p{L}\p{N}-]/u.test(character));
    if (!name ||
        name.length > 64 ||
        name !== name.toLowerCase() ||
        name.startsWith("-") ||
        name.endsWith("-") ||
        name.includes("--") ||
        !validCharacters) {
        throw new Error(`Cannot initialize skill in \`${name}\`: the directory name must be lowercase letters, numbers, and single hyphens.`);
    }
}
//# sourceMappingURL=main.js.map