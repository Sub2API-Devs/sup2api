/**
 * utils/permissions/mcpMountRules.ts
 *
 * 2.1.316 新增：MCP 挂载允许规则
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yckdkb4w.js (3)
 * attribution: placement 3
 */
import { extractRules, sanitizePermissionUpdates } from "./PermissionUpdate.js";
import { permissionRuleValueFromString } from "./permissionRuleParser.js";
import { formatPermissionRule } from "./disallowedToolsFlag.js";
import { logForDebugging } from "../debug.js";
import { jsonStringify } from "../slowOperations.js";

//@ chunk-yckdkb4w.js:308-438 placement (2.1.88 match: buildPermissionUpdates, 0.774)
function buildSessionAllowRuleUpdates(rules) {
  return rules.flatMap((rule) =>
    extractRules(
      sanitizePermissionUpdates([
        {
          type: "addRules",
          destination: "session",
          behavior: "allow",
          rules: [permissionRuleValueFromString(rule)],
        },
      ]),
    ).map(formatPermissionRule),
  );
}
//@ chunk-yckdkb4w.js:438-696 placement
function applyMcpMountAllowRules(toolPermissionContext, rules) {
  let sessionAllowRuleUpdates = buildSessionAllowRuleUpdates(rules);
  if (sessionAllowRuleUpdates.length === 0) return toolPermissionContext;
  logForDebugging(
    `Applying permission update: Adding ${sessionAllowRuleUpdates.length} allow rule(s) to source 'mcpMount': ${jsonStringify(sessionAllowRuleUpdates)}`,
  );
  return {
    ...toolPermissionContext,
    alwaysAllowRules: {
      ...toolPermissionContext.alwaysAllowRules,
      mcpMount: [...(toolPermissionContext.alwaysAllowRules.mcpMount ?? []), ...sessionAllowRuleUpdates],
    },
  };
}
//@ chunk-yckdkb4w.js:696-1100 placement
function replaceMcpMountRules(toolPermissionContext, rules, removalMode) {
  let mcpMount = toolPermissionContext.alwaysAllowRules.mcpMount ?? [];
  let sessionAllowRuleUpdates = buildSessionAllowRuleUpdates(rules);
  let nextRules =
    removalMode === "every"
      ? mcpMount.filter((rule) => !sessionAllowRuleUpdates.includes(rule))
      : [...mcpMount];
  if (removalMode === "one")
    for (let sessionAllowRuleUpdate of sessionAllowRuleUpdates) {
      let index = nextRules.lastIndexOf(sessionAllowRuleUpdate);
      if (index !== -1) nextRules.splice(index, 1);
    }
  if (nextRules.length === mcpMount.length) return toolPermissionContext;
  logForDebugging(
    `Applying permission update: Removing ${mcpMount.length - nextRules.length} allow rule(s) from source 'mcpMount', of ${jsonStringify(sessionAllowRuleUpdates)}`,
  );
  return {
    ...toolPermissionContext,
    alwaysAllowRules: {
      ...toolPermissionContext.alwaysAllowRules,
      mcpMount: nextRules,
    },
  };
}
export { buildSessionAllowRuleUpdates, applyMcpMountAllowRules, replaceMcpMountRules };
