import path from "node:path";
import type { Rule } from "../core/types.js";
import {
  compactEvidence,
  defineRule,
  isInside,
  lineOf,
  readScannableFiles,
  regexFindings,
  skillFileLocation
} from "./helpers.js";

const remoteExecution = defineRule(
  {
    id: "security/remote-execution",
    title: "Remote content is executed directly",
    description: "Download-to-shell patterns allow remote content to run without inspection.",
    category: "security",
    defaultSeverity: "error",
    recommendation:
      "Download a pinned artifact, verify its checksum, inspect it, then execute locally."
  },
  async ({ skill, createFinding }) => {
    const files = await readScannableFiles(skill);
    return regexFindings({
      files,
      patterns: [
        /(?:curl|wget)\b[^\n|]{0,500}\|\s*(?:sudo\s+)?(?:sh|bash|zsh|fish|pwsh|powershell)\b/giu,
        /(?:Invoke-WebRequest|iwr|curl)\b[^\n]{0,500}\|\s*(?:Invoke-Expression|iex)\b/giu,
        /(?:Invoke-Expression|iex)\s*\([^\n]{0,300}(?:DownloadString|Invoke-WebRequest)/giu
      ],
      create: ({ file, line, evidence }) =>
        createFinding({
          message:
            "The skill executes content obtained from a remote location without a verification step.",
          location: { path: file.path, line, column: 1 },
          evidence,
          help: "Pin a version and checksum, save the download, verify it, and only then run it."
        })
    });
  }
);

const destructiveCommand = defineRule(
  {
    id: "security/destructive-command",
    title: "Destructive command targets a broad path",
    description: "Broad recursive deletion or disk commands can destroy unrelated user data.",
    category: "security",
    defaultSeverity: "error",
    recommendation: "Constrain destructive operations to a validated workspace subdirectory."
  },
  async ({ skill, createFinding }) => {
    const files = await readScannableFiles(skill);
    return regexFindings({
      files,
      patterns: [
        /\brm\s+(?:-[a-z]*r[a-z]*f|-rf|-fr)\s+(?:\/|~|\$HOME)(?:\s|$)/gimu,
        /\bRemove-Item\b[^\n]{0,300}-Recurse[^\n]{0,300}(?:[A-Za-z]:\\|\$HOME|~)/gimu,
        /\b(?:mkfs(?:\.[a-z\d]+)?|diskpart|format\s+[A-Za-z]:)\b/giu
      ],
      create: ({ file, line, evidence }) =>
        createFinding({
          message:
            "A command may recursively delete or overwrite data outside a bounded workspace.",
          location: { path: file.path, line, column: 1 },
          evidence,
          help: "Resolve and validate an explicit workspace path before any destructive operation."
        })
    });
  }
);

const credentialAccess = defineRule(
  {
    id: "security/credential-access",
    title: "Instruction accesses credential material",
    description: "Reading local credentials can expose secrets to an agent or external service.",
    category: "security",
    defaultSeverity: "warning",
    recommendation:
      "Use narrowly scoped environment variables and never print or transmit secret values."
  },
  async ({ skill, createFinding }) => {
    const files = await readScannableFiles(skill);
    return regexFindings({
      files,
      patterns: [
        /\b(?:cat|type|Get-Content|readFile\w*|open)\b[^\n]{0,200}(?:\.env\b|\.ssh[/\\]|\.aws[/\\]credentials|\.config[/\\]gcloud)/giu,
        /\b(?:print|echo|Write-Output|console\.log)\b[^\n]{0,200}(?:\$(?:env:)?(?:\w*_)?(?:TOKEN|PASSWORD|SECRET|API_KEY|PRIVATE_KEY)\b|(?:\$|#)\{[^}\n]*(?:token|password|secret|api_?key|private_?key)[^}\n]*\}|f["'][^\n]{0,160}\{[^}\n]*(?:token|password|secret|api_?key|private_?key)[^}\n]*\}|process\.env\.(?:\w*_)?(?:TOKEN|PASSWORD|SECRET|API_KEY|PRIVATE_KEY)\b|os\.(?:environ|getenv)\b[^\n]{0,100}(?:TOKEN|PASSWORD|SECRET|API_KEY|PRIVATE_KEY)\b)/giu,
        /\b(?:print|console\.log)\s*\(\s*(?:\w*_)?(?:token|password|secret|api_?key|private_?key)\b/giu
      ],
      create: ({ file, line, evidence }) =>
        createFinding({
          message: "The instruction may read or reveal credentials from the user's environment.",
          location: { path: file.path, line, column: 1 },
          evidence,
          help: "Request only the minimum secret through a documented environment variable and keep it out of output."
        })
    });
  }
);

const promptOverride = defineRule(
  {
    id: "security/prompt-override",
    title: "Instruction attempts to override higher-priority guidance",
    description: "Skills must not suppress system, developer, user, or safety instructions.",
    category: "security",
    defaultSeverity: "warning",
    recommendation: "Remove instruction-hiding and priority-override language."
  },
  ({ skill, createFinding }) => {
    const patterns = [
      /ignore\s+(?:all\s+|any\s+|the\s+)?(?:previous|prior|system|developer|user)\s+instructions?/giu,
      /(?:do\s+not|never)\s+(?:tell|reveal|mention|show)\s+(?:this\s+to\s+)?(?:the\s+)?(?:user|human)/giu,
      /(?:hide|conceal)\s+(?:these|this|the)\s+instructions?/giu
    ];
    const findings = [];
    for (const pattern of patterns) {
      for (const match of skill.body.matchAll(pattern)) {
        if (match.index === undefined) continue;
        if (isDefensivePromptOverrideExample(skill.body, match.index, match[0].length)) continue;
        findings.push(
          createFinding({
            message:
              "The skill contains language commonly used to bypass or conceal higher-priority instructions.",
            location: skillFileLocation(
              skill,
              skill.bodyStartLine + lineOf(skill.body, match.index) - 1
            ),
            evidence: compactEvidence(match[0]),
            help: "State the legitimate task directly and preserve higher-priority instructions."
          })
        );
      }
    }
    return findings;
  }
);

function isDefensivePromptOverrideExample(source: string, index: number, length: number): boolean {
  const before = source.slice(Math.max(0, index - 240), index);
  const context = source.slice(
    Math.max(0, index - 360),
    Math.min(source.length, index + length + 360)
  );
  const introducesExample = /(?:e\.g\.|for example|such as|looks? like)[\s\S]{0,220}$/iu.test(
    before
  );
  const rejectsInstruction =
    /(?:untrusted data|treat[\s\S]{0,120}as data|not an action to execute|(?:do not|don't|never)[^\n]{0,40}(?:follow|obey|execute|interpret)[^\n]{0,80}(?:page|browser|external|untrusted|content))/iu.test(
      context
    );
  return introducesExample && rejectsInstruction;
}

const sensitiveFile = defineRule(
  {
    id: "security/sensitive-file",
    title: "Sensitive file is bundled",
    description: "Credential and private-key files must not be distributed with a skill.",
    category: "security",
    defaultSeverity: "error",
    recommendation:
      "Remove the file, rotate exposed credentials, and document required environment variables."
  },
  async ({ skill, createFinding }) => {
    const findings = skill.files
      .filter((file) => {
        const base = path.basename(file.relativePath).toLowerCase();
        return (
          base === ".env" ||
          base === "id_rsa" ||
          base === "id_ed25519" ||
          base === "credentials" ||
          /\.(?:p12|pfx|key)$/u.test(base)
        );
      })
      .map((file) =>
        createFinding({
          message: `Potential credential file \`${file.relativePath}\` is bundled with the skill.`,
          location: { path: file.absolutePath },
          help: "Remove the file from history and rotate any credential it contained."
        })
      );

    const files = await readScannableFiles(skill);
    findings.push(
      ...regexFindings({
        files,
        patterns: [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/gu],
        create: ({ file, line, evidence }) =>
          createFinding({
            message: "A private key marker appears in a bundled text file.",
            location: { path: file.path, line, column: 1 },
            evidence,
            help: "Remove the key from history and rotate it immediately."
          })
      })
    );
    return findings;
  }
);

const escapingSymlink = defineRule(
  {
    id: "security/symlink-outside",
    title: "Symbolic link escapes the skill directory",
    description: "External symbolic links can expose files that were not intentionally bundled.",
    category: "security",
    defaultSeverity: "error",
    recommendation:
      "Replace external symbolic links with reviewed files inside the skill directory."
  },
  ({ skill, createFinding }) =>
    skill.files.flatMap((file) => {
      if (file.kind !== "symlink" || !file.symlinkTarget) return [];
      const resolved = path.resolve(path.dirname(file.absolutePath), file.symlinkTarget);
      if (isInside(skill.directory, resolved)) return [];
      return [
        createFinding({
          message: `Symbolic link \`${file.relativePath}\` points outside the skill directory.`,
          location: { path: file.absolutePath },
          evidence: file.symlinkTarget,
          help: "Remove the link or replace it with a reviewed in-package resource."
        })
      ];
    })
);

const insecureUrl = defineRule(
  {
    id: "security/insecure-url",
    title: "External URL does not use HTTPS",
    description: "Plain HTTP resources can be modified in transit.",
    category: "security",
    defaultSeverity: "warning",
    recommendation: "Use HTTPS for external resources."
  },
  ({ skill, createFinding }) =>
    skill.references.flatMap((reference) => {
      if (!/^http:\/\//iu.test(reference.destination)) return [];
      if (/^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?:[:/]|$)/iu.test(reference.destination)) {
        return [];
      }
      return [
        createFinding({
          message: `External reference \`${reference.destination}\` uses unencrypted HTTP.`,
          location: skillFileLocation(skill, reference.line, reference.column),
          help: "Use an HTTPS URL or bundle a pinned local reference."
        })
      ];
    })
);

export const securityRules: Rule[] = [
  remoteExecution,
  destructiveCommand,
  credentialAccess,
  promptOverride,
  sensitiveFile,
  escapingSymlink,
  insecureUrl
];
