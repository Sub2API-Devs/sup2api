/**
 * tools/BashTool/backgroundPolicy.ts
 *
 * 2.1.316 新增：Bash 后台运行判定：返回 foreground / moves_at_timeout / kept / under_a_rule。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fb9qe48t.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { BASH_TOOL_NAME } from "./toolName.js";
import { TOOL_HOST_INTERFACE_FEATURES } from "../../remote/tools/protocolNegotiation.js";
import { isBackgroundTasksDisabled } from "../AgentTool/AgentTool.js";
import { matchToolRule } from "../../utils/permissions/permissions.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";

//@ chunk-fb9qe48t.js:38575-38807 placement
/**
 * Bash 后台运行判定（与 Agent 无关，切分误归）：返回 foreground / moves_at_timeout / kept / under_a_rule。
 */
function classifyBashBackgrounding(toolCall, input, version, permissionContext, isAtTimeout) {
  if (toolCall.name !== BASH_TOOL_NAME) return "foreground";
  if (input?.run_in_background !== true)
    return isAtTimeout && !hasBackgroundRunRule(toolCall, permissionContext)
      ? "moves_at_timeout"
      : "foreground";
  if (version < TOOL_HOST_INTERFACE_FEATURES.keptBackgroundCommands || isBackgroundTasksDisabled())
    return "foreground";
  return hasBackgroundRunRule(toolCall, permissionContext) ? "under_a_rule" : "kept";
}
//@ chunk-fb9qe48t.js:38807-38900 placement (2.1.88 match: inputSchema, 0.669)
/**
 * deny/ask 规则是否对该工具的 run_in_background:true 生效。
 */
function hasBackgroundRunRule(toolCall, permissionContext) {
  return ["deny", "ask"].some(
    (behavior) =>
      matchToolRule(
        getToolPermissionContext(permissionContext),
        toolCall,
        {
          run_in_background: true,
        },
        behavior,
      ) !== null,
  );
}
export { classifyBashBackgrounding };
