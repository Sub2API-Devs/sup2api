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

//@ chunk-yckdkb4w.js:308-438 placement = buildPermissionUpdates (0.774)
function buildSessionAllowRuleUpdates(o) {
  return o.flatMap((e) =>
    extractRules(
      sanitizePermissionUpdates([
        {
          type: "addRules",
          destination: "session",
          behavior: "allow",
          rules: [permissionRuleValueFromString(e)],
        },
      ]),
    ).map(formatPermissionRule),
  );
}
//@ chunk-yckdkb4w.js:438-696 placement
function applyMcpMountAllowRules(o, e) {
  let sessionAllowRuleUpdates = buildSessionAllowRuleUpdates(e);
  if (sessionAllowRuleUpdates.length === 0) return o;
  logForDebugging(
    `Applying permission update: Adding ${sessionAllowRuleUpdates.length} allow rule(s) to source 'mcpMount': ${jsonStringify(sessionAllowRuleUpdates)}`,
  );
  return {
    ...o,
    alwaysAllowRules: {
      ...o.alwaysAllowRules,
      mcpMount: [...(o.alwaysAllowRules.mcpMount ?? []), ...sessionAllowRuleUpdates],
    },
  };
}
//@ chunk-yckdkb4w.js:696-1100 placement
function replaceMcpMountRules(o, e, l) {
  let mcpMount = o.alwaysAllowRules.mcpMount ?? [];
  let sessionAllowRuleUpdates = buildSessionAllowRuleUpdates(e);
  let n = l === "every" ? mcpMount.filter((i) => !sessionAllowRuleUpdates.includes(i)) : [...mcpMount];
  if (l === "one")
    for (let sessionAllowRuleUpdate of sessionAllowRuleUpdates) {
      let index = n.lastIndexOf(sessionAllowRuleUpdate);
      if (index !== -1) n.splice(index, 1);
    }
  if (n.length === mcpMount.length) return o;
  logForDebugging(
    `Applying permission update: Removing ${mcpMount.length - n.length} allow rule(s) from source 'mcpMount', of ${jsonStringify(sessionAllowRuleUpdates)}`,
  );
  return {
    ...o,
    alwaysAllowRules: {
      ...o.alwaysAllowRules,
      mcpMount: n,
    },
  };
}
export { buildSessionAllowRuleUpdates, applyMcpMountAllowRules, replaceMcpMountRules };
