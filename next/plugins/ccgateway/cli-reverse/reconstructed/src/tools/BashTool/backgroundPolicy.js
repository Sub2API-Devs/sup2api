/**
 * tools/BashTool/backgroundPolicy.ts
 *
 * 2.1.316 新增：Bash 后台运行判定：返回 foreground / moves_at_timeout / kept / under_a_rule。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dz36xfxg.js (2)
 * attribution: placement 2
 */
import { BASH_TOOL_NAME } from "./toolName.js";
import { TOOL_HOST_INTERFACE_FEATURES } from "../../remote/tools/protocolNegotiation.js";
import { isBackgroundTasksDisabled } from "../AgentTool/AgentTool.js";
import { matchToolRule } from "../../utils/permissions/permissions.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";

//@ chunk-dz36xfxg.js:36803-37035 placement
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
//@ chunk-dz36xfxg.js:37035-37128 placement (2.1.88 match: inputSchema, 0.67)
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
