import { readFile } from "node:fs/promises";
import path from "node:path";
const TEXT_EXTENSIONS = new Set([
    "",
    ".md",
    ".txt",
    ".json",
    ".yaml",
    ".yml",
    ".sh",
    ".bash",
    ".zsh",
    ".fish",
    ".ps1",
    ".py",
    ".js",
    ".mjs",
    ".cjs",
    ".ts",
    ".tsx",
    ".rb",
    ".go",
    ".rs"
]);
const MAX_SCANNED_FILE_BYTES = 512 * 1024;
const MAX_TOTAL_SCAN_BYTES = 4 * 1024 * 1024;
export function defineRule(meta, check) {
    return { meta, check };
}
export function frontmatterLine(skill, field) {
    const lines = skill.frontmatterRaw.split(/\r?\n/u);
    const index = lines.findIndex((line) => {
        const separator = line.indexOf(":");
        return separator >= 0 && line.slice(0, separator).trim() === field;
    });
    return index >= 0 ? index + 2 : 2;
}
export function skillFileLocation(skill, line, column = 1) {
    return {
        path: skill.skillFile,
        ...(line === undefined ? {} : { line, column })
    };
}
export function lineOf(source, offset) {
    return source.slice(0, offset).split(/\r?\n/u).length;
}
export function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function isInside(parent, candidate) {
    const relative = path.relative(parent, candidate);
    return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== "..");
}
export async function readScannableFiles(skill) {
    const result = [];
    let total = 0;
    for (const file of skill.files) {
        if (file.kind !== "file" || file.size > MAX_SCANNED_FILE_BYTES) {
            continue;
        }
        const extension = path.extname(file.relativePath).toLowerCase();
        const inTextDirectory = /^(scripts|references)\//u.test(file.relativePath);
        if (!TEXT_EXTENSIONS.has(extension) && !inTextDirectory) {
            continue;
        }
        if (total + file.size > MAX_TOTAL_SCAN_BYTES) {
            break;
        }
        try {
            const content = await readFile(file.absolutePath, "utf8");
            if (content.includes("\0")) {
                continue;
            }
            result.push({ path: file.absolutePath, relativePath: file.relativePath, content });
            total += file.size;
        }
        catch {
            // The parser reports unreadable paths. Security rules remain best effort.
        }
    }
    return result;
}
export function regexFindings(options) {
    const findings = [];
    for (const file of options.files) {
        for (const pattern of options.patterns) {
            const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
            const globalPattern = new RegExp(pattern.source, flags);
            for (const match of file.content.matchAll(globalPattern)) {
                if (match.index === undefined) {
                    continue;
                }
                findings.push(options.create({
                    file,
                    match,
                    line: lineOf(file.content, match.index),
                    evidence: compactEvidence(match[0])
                }));
            }
        }
    }
    return findings;
}
export function compactEvidence(value, maxLength = 160) {
    const compact = value.replaceAll(/\s+/gu, " ").trim();
    return compact.length > maxLength ? `${compact.slice(0, maxLength - 1)}...` : compact;
}
export function severityAtLeast(value, threshold) {
    const rank = { error: 3, warning: 2, info: 1 };
    return rank[value] >= rank[threshold];
}
//# sourceMappingURL=helpers.js.map