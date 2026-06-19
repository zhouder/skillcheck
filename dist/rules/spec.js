import path from "node:path";
import { defineRule, frontmatterLine, isRecord, skillFileLocation } from "./helpers.js";
const ALLOWED_FIELDS = new Set([
    "name",
    "description",
    "license",
    "allowed-tools",
    "metadata",
    "compatibility"
]);
const unknownFields = defineRule({
    id: "spec/unknown-field",
    title: "Unknown frontmatter field",
    description: "Only fields defined by the Agent Skills specification are allowed.",
    category: "spec",
    defaultSeverity: "error",
    recommendation: "Move custom values below the `metadata` mapping."
}, ({ skill, createFinding }) => Object.keys(skill.metadata)
    .filter((field) => !ALLOWED_FIELDS.has(field))
    .map((field) => createFinding({
    message: `Frontmatter field \`${field}\` is not defined by the Agent Skills specification.`,
    location: skillFileLocation(skill, frontmatterLine(skill, field)),
    evidence: field,
    help: "Remove the field or store a string value under `metadata`."
})));
const nameRule = defineRule({
    id: "spec/name",
    title: "Invalid skill name",
    description: "Skill names must follow the Agent Skills naming constraints.",
    category: "spec",
    defaultSeverity: "error",
    recommendation: "Use a lowercase name of at most 64 letters, numbers, and hyphens."
}, ({ skill, createFinding }) => {
    const value = skill.metadata.name;
    const location = skillFileLocation(skill, frontmatterLine(skill, "name"));
    if (typeof value !== "string" || !value.trim()) {
        return [
            createFinding({
                message: "Frontmatter requires a non-empty string `name` field.",
                location,
                help: "Add `name: your-skill-name`."
            })
        ];
    }
    const name = value.trim().normalize("NFKC");
    const problems = [];
    if (name.length > 64)
        problems.push(`exceeds the 64 character limit (${name.length})`);
    if (name !== name.toLowerCase())
        problems.push("must be lowercase");
    if (name.startsWith("-") || name.endsWith("-"))
        problems.push("cannot start or end with a hyphen");
    if (name.includes("--"))
        problems.push("cannot contain consecutive hyphens");
    if (![...name].every((character) => /[\p{L}\p{N}-]/u.test(character))) {
        problems.push("may contain only letters, numbers, and hyphens");
    }
    return problems.map((problem) => createFinding({
        message: `Skill name \`${name}\` ${problem}.`,
        location,
        evidence: name,
        help: "Choose a short lowercase name with words separated by single hyphens."
    }));
});
const directoryNameRule = defineRule({
    id: "spec/directory-name",
    title: "Directory does not match skill name",
    description: "The skill directory name must match the normalized frontmatter name.",
    category: "spec",
    defaultSeverity: "error",
    recommendation: "Rename the directory or update the frontmatter name."
}, ({ skill, createFinding }) => {
    if (typeof skill.metadata.name !== "string" || !skill.metadata.name.trim()) {
        return [];
    }
    const name = skill.metadata.name.trim().normalize("NFKC");
    const directoryName = path.basename(skill.directory).normalize("NFKC");
    if (name === directoryName) {
        return [];
    }
    return [
        createFinding({
            message: `Directory \`${directoryName}\` must match skill name \`${name}\`.`,
            location: skillFileLocation(skill, frontmatterLine(skill, "name")),
            help: `Rename the directory to \`${name}\` or make the names agree.`
        })
    ];
});
const descriptionRule = defineRule({
    id: "spec/description",
    title: "Invalid skill description",
    description: "A description is required and is limited to 1024 characters.",
    category: "spec",
    defaultSeverity: "error",
    recommendation: "Describe what the skill does and when an agent should activate it."
}, ({ skill, createFinding }) => {
    const value = skill.metadata.description;
    const location = skillFileLocation(skill, frontmatterLine(skill, "description"));
    if (typeof value !== "string" || !value.trim()) {
        return [
            createFinding({
                message: "Frontmatter requires a non-empty string `description` field.",
                location,
                help: "Add a concrete description of the capability and activation context."
            })
        ];
    }
    if (value.length <= 1024) {
        return [];
    }
    return [
        createFinding({
            message: `Description exceeds the 1024 character limit (${value.length}).`,
            location,
            help: "Keep discovery metadata concise and move detailed instructions into the body."
        })
    ];
});
const compatibilityRule = defineRule({
    id: "spec/compatibility",
    title: "Invalid compatibility field",
    description: "Compatibility must be a string of no more than 500 characters.",
    category: "spec",
    defaultSeverity: "error",
    recommendation: "Use a short string describing required products, packages, or network access."
}, ({ skill, createFinding }) => {
    if (!("compatibility" in skill.metadata))
        return [];
    const value = skill.metadata.compatibility;
    const location = skillFileLocation(skill, frontmatterLine(skill, "compatibility"));
    if (typeof value !== "string") {
        return [createFinding({ message: "`compatibility` must be a string.", location })];
    }
    if (value.length > 500) {
        return [
            createFinding({
                message: `Compatibility exceeds the 500 character limit (${value.length}).`,
                location,
                help: "Keep only environment requirements in this field."
            })
        ];
    }
    return [];
});
const metadataRule = defineRule({
    id: "spec/metadata",
    title: "Invalid metadata mapping",
    description: "Custom metadata must map string keys to string values.",
    category: "spec",
    defaultSeverity: "error",
    recommendation: "Store flat string key-value pairs under `metadata`."
}, ({ skill, createFinding }) => {
    if (!("metadata" in skill.metadata))
        return [];
    const value = skill.metadata.metadata;
    const location = skillFileLocation(skill, frontmatterLine(skill, "metadata"));
    if (!isRecord(value)) {
        return [createFinding({ message: "`metadata` must be a key-value mapping.", location })];
    }
    const invalidKeys = Object.entries(value)
        .filter(([, entryValue]) => typeof entryValue !== "string")
        .map(([key]) => key);
    if (invalidKeys.length === 0)
        return [];
    return [
        createFinding({
            message: `Metadata values must be strings; invalid keys: ${invalidKeys.join(", ")}.`,
            location,
            help: "Quote numeric and boolean values and avoid nested metadata objects."
        })
    ];
});
const optionalStringFields = defineRule({
    id: "spec/optional-field-type",
    title: "Invalid optional field type",
    description: "License and allowed-tools values must be strings when present.",
    category: "spec",
    defaultSeverity: "error",
    recommendation: "Represent optional fields as short YAML strings."
}, ({ skill, createFinding }) => ["license", "allowed-tools"]
    .filter((field) => field in skill.metadata && typeof skill.metadata[field] !== "string")
    .map((field) => createFinding({
    message: `\`${field}\` must be a string.`,
    location: skillFileLocation(skill, frontmatterLine(skill, field)),
    help: `Replace \`${field}\` with a string value.`
})));
export const specRules = [
    unknownFields,
    nameRule,
    directoryNameRule,
    descriptionRule,
    compatibilityRule,
    metadataRule,
    optionalStringFields
];
//# sourceMappingURL=spec.js.map