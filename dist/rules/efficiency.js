import { defineRule, skillFileLocation } from "./helpers.js";
const contextBudget = defineRule({
    id: "efficiency/context-budget",
    title: "SKILL.md exceeds the recommended context budget",
    description: "The Agent Skills specification recommends fewer than 500 lines and 5000 tokens.",
    category: "efficiency",
    defaultSeverity: "warning",
    recommendation: "Keep core instructions concise and move conditional detail into references."
}, ({ skill, createFinding }) => {
    const lines = skill.raw ? skill.raw.split(/\r?\n/u).length : 0;
    const estimatedTokens = estimateTokens(skill.body);
    if (lines <= 500 && estimatedTokens <= 5_000)
        return [];
    const reasons = [
        ...(lines > 500 ? [`${lines.toLocaleString()} lines`] : []),
        ...(estimatedTokens > 5_000 ? [`about ${estimatedTokens.toLocaleString()} tokens`] : [])
    ];
    return [
        createFinding({
            message: `SKILL.md uses ${reasons.join(" and ")}.`,
            location: skillFileLocation(skill, 1),
            help: "Keep only always-needed instructions in SKILL.md and load focused references on demand."
        })
    ];
});
const largeResource = defineRule({
    id: "efficiency/large-resource",
    title: "Bundled resource is unusually large",
    description: "Large resources slow installation and may consume excessive agent context.",
    category: "efficiency",
    defaultSeverity: "warning",
    recommendation: "Remove generated assets or document how the agent should access large files selectively."
}, ({ skill, createFinding }) => skill.files
    .filter((file) => file.kind === "file" && file.size > 1024 * 1024)
    .map((file) => createFinding({
    message: `\`${file.relativePath}\` is ${formatBytes(file.size)}.`,
    location: { path: file.absolutePath },
    help: "Compress, remove, or replace the resource with a smaller focused artifact."
})));
const packageSize = defineRule({
    id: "efficiency/package-size",
    title: "Skill package is unusually large",
    description: "A skill should not include unrelated build output or dependency directories.",
    category: "efficiency",
    defaultSeverity: "warning",
    recommendation: "Exclude generated output, dependencies, caches, and source material not used at runtime."
}, ({ skill, createFinding }) => {
    const total = skill.files.reduce((sum, file) => sum + file.size, 0);
    if (total <= 10 * 1024 * 1024 && skill.files.length <= 250)
        return [];
    return [
        createFinding({
            message: `The skill contains ${skill.files.length.toLocaleString()} files totaling ${formatBytes(total)}.`,
            location: { path: skill.directory },
            help: "Keep only instructions, scripts, references, and assets required by the skill."
        })
    ];
});
export function estimateTokens(value) {
    if (!value)
        return 0;
    const asciiLength = [...value].filter((character) => (character.codePointAt(0) ?? 0) <= 0x7f).length;
    const nonAsciiLength = [...value].length - asciiLength;
    return Math.ceil(asciiLength / 4 + nonAsciiLength / 1.5);
}
function formatBytes(value) {
    if (value < 1024)
        return `${value} B`;
    if (value < 1024 * 1024)
        return `${(value / 1024).toFixed(1)} KiB`;
    return `${(value / 1024 / 1024).toFixed(1)} MiB`;
}
export const efficiencyRules = [contextBudget, largeResource, packageSize];
//# sourceMappingURL=efficiency.js.map