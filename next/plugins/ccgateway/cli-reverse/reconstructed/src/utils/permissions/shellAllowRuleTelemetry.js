/**
 * utils/permissions/shellAllowRuleTelemetry.ts
 *
 * shell 允许规则遥测（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1z536h0d.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import {
  isDangerousBashPermission,
  isDangerousPowerShellPermission,
  PERMISSION_UPDATE_DESTINATIONS,
} from "./permissionSetup.js";
import { parseRuleString } from "./permissionRuleParser.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

//@ chunk-1z536h0d.js:501-567 placement
function shellToolNameOrNull(toolName) {
  if (toolName === BASH_TOOL_NAME) return BASH_TOOL_NAME;
  if (toolName === POWERSHELL_TOOL_NAME) return POWERSHELL_TOOL_NAME;
  return null;
}
//@ chunk-1z536h0d.js:567-734 placement
function classifyShellAllowRule(toolName, ruleContent) {
  let toolName_2 = shellToolNameOrNull(toolName);
  if (toolName_2 === null) return null;
  if (ruleContent === undefined || ruleContent === "" || /^[\s*]+$/.test(ruleContent)) return "bare";
  return (
    toolName_2 === BASH_TOOL_NAME
      ? isDangerousBashPermission(toolName_2, ruleContent)
      : isDangerousPowerShellPermission(toolName_2, ruleContent)
  )
    ? "dangerous_prefix"
    : "scoped";
}
//@ chunk-1z536h0d.js:734-978 placement
function countShellAllowRules(rulesByDestination) {
  let counts = {};
  let total = 0;
  for (let destination of PERMISSION_UPDATE_DESTINATIONS)
    for (let ruleString of rulesByDestination[destination] ?? []) {
      let { toolName, ruleContent } = parseRuleString(ruleString);
      let shellTool = shellToolNameOrNull(toolName);
      if (shellTool === null) continue;
      let category = classifyShellAllowRule(shellTool, ruleContent);
      if (category === null) continue;
      let key = `${destination}_${shellTool}_${category}`;
      counts[key] = (counts[key] ?? 0) + 1;
      total++;
    }
  counts.total_shell_allow_rules = total;
  return counts;
}
//@ chunk-1z536h0d.js:978-1036 placement
/**
 * logShellAllowRulesAtInit：启动时上报 shell 允许规则数量。
 */
function logShellAllowRulesAtInit(rulesByDestination) {
  logEvent("tengu_shell_allow_rules_at_init", countShellAllowRules(rulesByDestination));
}
//@ chunk-1z536h0d.js:1036-1335 placement
function logShellAllowRuleAdded(updates) {
  for (let update of updates) {
    if (update.type !== "addRules" || update.behavior !== "allow") continue;
    for (let rule of update.rules) {
      let shellTool = shellToolNameOrNull(rule.toolName);
      if (shellTool === null) continue;
      let category = classifyShellAllowRule(rule.toolName, rule.ruleContent);
      if (category === null) continue;
      logEvent("tengu_shell_allow_rule_added", {
        toolName: fromEnum(shellTool),
        category: fromEnum(category),
        destination: fromEnum(update.destination),
      });
    }
  }
}
export { logShellAllowRulesAtInit, logShellAllowRuleAdded };
