/**
 * utils/permissions/shellAllowRuleTelemetry.ts
 *
 * shell 允许规则遥测（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4p0ppc72.js (5)
 * attribution: placement 5
 */
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import {
  isDangerousBashPermission,
  isDangerousPowerShellPermission,
  PERMISSION_UPDATE_DESTINATIONS,
} from "./permissionSetup.js";
import { permissionRuleValueFromString } from "./permissionRuleParser.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

//@ chunk-4p0ppc72.js:468-534 placement
function s(l) {
  if (l === BASH_TOOL_NAME) return BASH_TOOL_NAME;
  if (l === POWERSHELL_TOOL_NAME) return POWERSHELL_TOOL_NAME;
  return null;
}
//@ chunk-4p0ppc72.js:534-701 placement
function classifyShellAllowRule(l, e) {
  let o = s(l);
  if (o === null) return null;
  if (e === void 0 || e === "" || /^[\s*]+$/.test(e)) return "bare";
  return (o === BASH_TOOL_NAME ? isDangerousBashPermission(o, e) : isDangerousPowerShellPermission(o, e))
    ? "dangerous_prefix"
    : "scoped";
}
//@ chunk-4p0ppc72.js:701-945 placement
function countShellAllowRules(l) {
  let e = {},
    o = 0;
  for (let r of PERMISSION_UPDATE_DESTINATIONS)
    for (let t of l[r] ?? []) {
      let { toolName: toolName, ruleContent: ruleContent } = permissionRuleValueFromString(t),
        n = s(toolName);
      if (n === null) continue;
      let i = classifyShellAllowRule(n, ruleContent);
      if (i === null) continue;
      let u = `${r}_${n}_${i}`;
      ((e[u] = (e[u] ?? 0) + 1), o++);
    }
  return ((e.total_shell_allow_rules = o), e);
}
//@ chunk-4p0ppc72.js:945-1003 placement
function D0s(l) {
  logEvent("tengu_shell_allow_rules_at_init", countShellAllowRules(l));
}
//@ chunk-4p0ppc72.js:1003-1302 placement
function logShellAllowRuleAdded(l) {
  for (let e of l) {
    if (e.type !== "addRules" || e.behavior !== "allow") continue;
    for (let rule of e.rules) {
      let r = s(rule.toolName);
      if (r === null) continue;
      let t = classifyShellAllowRule(rule.toolName, rule.ruleContent);
      if (t === null) continue;
      logEvent("tengu_shell_allow_rule_added", {
        toolName: fromEnum(r),
        category: fromEnum(t),
        destination: fromEnum(e.destination),
      });
    }
  }
}

export { D0s, logShellAllowRuleAdded };
