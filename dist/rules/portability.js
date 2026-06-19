import path from "node:path";
import { defineRule, frontmatterLine, skillFileLocation } from "./helpers.js";
const unicodeName = defineRule({
    id: "portability/unicode-name",
    title: "Unicode skill name may have limited client support",
    description: "The reference validator accepts Unicode names, but some clients document ASCII-only names.",
    category: "portability",
    defaultSeverity: "info",
    recommendation: "Prefer lowercase ASCII letters, numbers, and hyphens for maximum compatibility."
}, ({ skill, createFinding }) => {
    if (typeof skill.metadata.name !== "string" || /^[a-z0-9-]+$/u.test(skill.metadata.name))
        return [];
    return [
        createFinding({
            message: `Skill name \`${skill.metadata.name}\` is valid in the reference implementation but may not load in ASCII-only clients.`,
            location: skillFileLocation(skill, frontmatterLine(skill, "name")),
            help: "Use an ASCII slug unless internationalized names are an explicit requirement."
        })
    ];
});
const experimentalTools = defineRule({
    id: "portability/allowed-tools",
    title: "allowed-tools support is experimental",
    description: "Tool pre-approval syntax and enforcement differ between Agent Skill clients.",
    category: "portability",
    defaultSeverity: "info",
    recommendation: "Document tool requirements in compatibility and do not rely on universal enforcement."
}, ({ skill, createFinding }) => {
    if (!("allowed-tools" in skill.metadata))
        return [];
    return [
        createFinding({
            message: "This skill uses the experimental `allowed-tools` field.",
            location: skillFileLocation(skill, frontmatterLine(skill, "allowed-tools")),
            help: "Test the skill in each target client and document any client-specific behavior."
        })
    ];
});
const symbolicLinks = defineRule({
    id: "portability/symlink",
    title: "Symbolic link may not survive packaging",
    description: "Some archives, package managers, and operating systems do not preserve symbolic links.",
    category: "portability",
    defaultSeverity: "warning",
    recommendation: "Bundle regular files or generate links during an explicit installation step."
}, ({ skill, createFinding }) => skill.files
    .filter((file) => file.kind === "symlink")
    .map((file) => createFinding({
    message: `\`${file.relativePath}\` is a symbolic link.`,
    location: { path: file.absolutePath },
    evidence: file.symlinkTarget ?? "unknown target",
    help: "Replace the link with a regular bundled file for cross-platform distribution."
})));
const hardcodedHome = defineRule({
    id: "portability/hardcoded-home",
    title: "Hardcoded user path",
    description: "Absolute home-directory paths fail on other machines and operating systems.",
    category: "portability",
    defaultSeverity: "warning",
    recommendation: "Use workspace-relative paths or documented environment variables."
}, ({ skill, createFinding }) => {
    const patterns = [
        /(?:^|[\s`"'])(\/(?:Users|home)\/[A-Za-z0-9._-]+\/[^\s`"']*)/gmu,
        /(?:^|[\s`"'])([A-Za-z]:\\Users\\[^\s`"']+)/gmu
    ];
    const findings = [];
    for (const pattern of patterns) {
        for (const match of skill.body.matchAll(pattern)) {
            if (match.index === undefined)
                continue;
            const matchedPath = match[1];
            if (!matchedPath || path.isAbsolute(matchedPath) === false)
                continue;
            const line = skill.bodyStartLine + skill.body.slice(0, match.index).split(/\r?\n/u).length - 1;
            findings.push(createFinding({
                message: `Instruction contains machine-specific path \`${matchedPath}\`.`,
                location: skillFileLocation(skill, line),
                evidence: matchedPath,
                help: "Resolve the path from the workspace or an environment variable at runtime."
            }));
        }
    }
    return findings;
});
export const portabilityRules = [
    unicodeName,
    experimentalTools,
    symbolicLinks,
    hardcodedHome
];
//# sourceMappingURL=portability.js.map