import path from "node:path";
import { estimateTokens } from "../rules/efficiency.js";
import { findRule, rules } from "../rules/index.js";
import { loadConfig } from "./config.js";
import { discoverSkills } from "./discovery.js";
import { createFinding, normalizePath } from "./finding.js";
import { parseSkill } from "./parser.js";
import { scoreFindings, scoreGrade } from "./scoring.js";
export const SKILLCHECK_VERSION = "0.1.0";
export async function analyze(options = {}) {
    const cwd = path.resolve(options.cwd ?? process.cwd());
    const { config, configFile } = await loadConfig({
        cwd,
        ...(options.configPath === undefined ? {} : { explicitPath: options.configPath }),
        ...(options.config === undefined ? {} : { overrides: options.config })
    });
    const discovery = await discoverSkills({
        inputs: options.paths?.length ? options.paths : ["."],
        cwd,
        ignore: config.ignore,
        maxDepth: config.maxDepth
    });
    const globalFindings = discovery.issues.map((issue) => createFinding({
        ruleId: "discovery/invalid-input",
        title: "Input cannot be analyzed",
        message: issue.message,
        severity: "error",
        category: "internal",
        filePath: issue.path,
        root: cwd,
        help: "Pass a readable skill directory, parent directory, or SKILL.md file."
    }));
    if (discovery.directories.length === 0 && globalFindings.length === 0) {
        globalFindings.push(createFinding({
            ruleId: "discovery/no-skills",
            title: "No Agent Skills found",
            message: `No SKILL.md files were found within depth ${config.maxDepth}.`,
            severity: "error",
            category: "internal",
            filePath: cwd,
            root: cwd,
            help: "Pass a skill directory or increase `maxDepth` in the configuration."
        }));
    }
    for (const ruleId of Object.keys(config.rules)) {
        if (!findRule(ruleId)) {
            globalFindings.push(createFinding({
                ruleId: "config/unknown-rule",
                title: "Configuration references an unknown rule",
                message: `Rule \`${ruleId}\` does not exist in Skillcheck ${SKILLCHECK_VERSION}.`,
                severity: "warning",
                category: "internal",
                filePath: configFile ?? cwd,
                root: cwd,
                help: "Run `skillcheck rules` and update or remove the rule override."
            }));
        }
    }
    const results = [];
    for (const directory of discovery.directories) {
        const skill = await parseSkill(directory, cwd);
        const findings = await runRules(skill, cwd, config.rules);
        const score = scoreFindings(findings);
        results.push({
            directory: normalizePath(path.relative(cwd, directory) || "."),
            skillFile: normalizePath(path.relative(cwd, skill.skillFile)),
            name: typeof skill.metadata.name === "string" ? skill.metadata.name : undefined,
            score,
            grade: scoreGrade(score),
            metrics: collectMetrics(skill),
            findings: sortFindings(findings)
        });
    }
    const allFindings = [...globalFindings, ...results.flatMap((result) => result.findings)];
    return {
        schemaVersion: "1",
        tool: { name: "skillcheck", version: SKILLCHECK_VERSION },
        root: normalizePath(cwd),
        configFile: configFile ? normalizePath(path.relative(cwd, configFile)) : undefined,
        settings: { failOn: config.failOn },
        results,
        globalFindings: sortFindings(globalFindings),
        summary: {
            skills: results.length,
            errors: allFindings.filter((finding) => finding.severity === "error").length,
            warnings: allFindings.filter((finding) => finding.severity === "warning").length,
            infos: allFindings.filter((finding) => finding.severity === "info").length,
            lowestScore: results.length ? Math.min(...results.map((result) => result.score)) : undefined
        }
    };
}
async function runRules(skill, root, settings) {
    const findings = [...skill.parseFindings];
    for (const rule of rules) {
        const setting = settings[rule.meta.id] ?? rule.meta.defaultSeverity;
        if (setting === "off")
            continue;
        try {
            const ruleFindings = await rule.check({
                skill,
                severity: setting,
                createFinding: (input) => ({
                    ...input,
                    ruleId: rule.meta.id,
                    title: rule.meta.title,
                    severity: setting,
                    category: rule.meta.category,
                    location: {
                        ...input.location,
                        path: path.isAbsolute(input.location.path)
                            ? normalizePath(path.relative(root, input.location.path))
                            : normalizePath(input.location.path)
                    }
                })
            });
            findings.push(...ruleFindings);
        }
        catch (error) {
            findings.push(createFinding({
                ruleId: "internal/rule-failure",
                title: "Rule execution failed",
                message: `Rule \`${rule.meta.id}\` failed: ${error instanceof Error ? error.message : String(error)}`,
                severity: "error",
                category: "internal",
                filePath: skill.skillFile,
                root,
                help: "Report this as a Skillcheck bug with a minimal reproduction."
            }));
        }
    }
    return findings;
}
function collectMetrics(skill) {
    const totalBytes = skill.files.reduce((sum, file) => sum + file.size, 0);
    return {
        fileCount: skill.files.length,
        totalBytes,
        scriptCount: skill.files.filter((file) => file.relativePath.startsWith("scripts/")).length,
        referenceCount: skill.references.filter((reference) => !/^[a-z][a-z\d+.-]*:/iu.test(reference.destination)).length,
        externalLinkCount: skill.references.filter((reference) => /^https?:\/\//iu.test(reference.destination)).length,
        skillLines: skill.raw ? skill.raw.split(/\r?\n/u).length : 0,
        estimatedTokens: estimateTokens(skill.body)
    };
}
function sortFindings(findings) {
    const severityRank = { error: 0, warning: 1, info: 2 };
    return findings.sort((left, right) => left.location.path.localeCompare(right.location.path) ||
        (left.location.line ?? 0) - (right.location.line ?? 0) ||
        severityRank[left.severity] - severityRank[right.severity] ||
        left.ruleId.localeCompare(right.ruleId));
}
//# sourceMappingURL=analyze.js.map