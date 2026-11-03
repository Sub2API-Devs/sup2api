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
  let l = buildSessionAllowRuleUpdates(e);
  if (l.length === 0) return o;
  return (
    logForDebugging(
      `Applying permission update: Adding ${l.length} allow rule(s) to source 'mcpMount': ${jsonStringify(l)}`,
    ),
    {
      ...o,
      alwaysAllowRules: { ...o.alwaysAllowRules, mcpMount: [...(o.alwaysAllowRules.mcpMount ?? []), ...l] },
    }
  );
}
//@ chunk-yckdkb4w.js:696-1100 placement
function replaceMcpMountRules(o, e, l) {
  let s = o.alwaysAllowRules.mcpMount ?? [],
    r = buildSessionAllowRuleUpdates(e),
    n = l === "every" ? s.filter((i) => !r.includes(i)) : [...s];
  if (l === "one")
    for (let i of r) {
      let index = n.lastIndexOf(i);
      if (index !== -1) n.splice(index, 1);
    }
  if (n.length === s.length) return o;
  return (
    logForDebugging(
      `Applying permission update: Removing ${s.length - n.length} allow rule(s) from source 'mcpMount', of ${jsonStringify(r)}`,
    ),
    { ...o, alwaysAllowRules: { ...o.alwaysAllowRules, mcpMount: n } }
  );
}

export { buildSessionAllowRuleUpdates, applyMcpMountAllowRules, replaceMcpMountRules };
