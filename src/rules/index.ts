import type { Rule } from "../core/types.js";
import { efficiencyRules } from "./efficiency.js";
import { portabilityRules } from "./portability.js";
import { qualityRules } from "./quality.js";
import { scanCompletenessRules } from "./scan-completeness.js";
import { securityRules } from "./security.js";
import { specRules } from "./spec.js";

export const rules: Rule[] = [
  ...specRules,
  ...scanCompletenessRules,
  ...securityRules,
  ...qualityRules,
  ...efficiencyRules,
  ...portabilityRules
];

const duplicateIds = rules
  .map((rule) => rule.meta.id)
  .filter((id, index, all) => all.indexOf(id) !== index);

if (duplicateIds.length > 0) {
  throw new Error(`Duplicate Skillcheck rule IDs: ${duplicateIds.join(", ")}`);
}

export function findRule(id: string): Rule | undefined {
  return rules.find((rule) => rule.meta.id === id);
}
