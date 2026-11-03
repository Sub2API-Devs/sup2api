/**
 * utils/hooks/hookMatchers.ts
 *
 * 2.1.316 新增：钩子匹配器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (5)
 * attribution: placement 5
 */
import { SPLIT_TOOL_PARENT, SPLIT_TOOL_BY_ACTION } from "../../tools/ArtifactTool/constants.js";
import { MONITOR } from "../../tools/MonitorTool/constants.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";

//@ chunk-e6aww6q8.js:823360-823418 placement
/**
 * 查工具名的父工具映射（如 MCP 子工具归到父工具）。
 */
function splitToolParentOf(e) {
  return Object.hasOwn(SPLIT_TOOL_PARENT, e) ? SPLIT_TOOL_PARENT[e] : undefined;
}
//@ chunk-e6aww6q8.js:823418-823552 placement
/**
 * 按 action 把工具名映射到具体动作工具。
 */
function splitToolByAction(e, n) {
  if (!Object.hasOwn(SPLIT_TOOL_BY_ACTION, e)) return;
  let action = n?.action;
  let s = SPLIT_TOOL_BY_ACTION[e];
  return typeof action === "string" && Object.hasOwn(s, action) ? s[action] : undefined;
}
//@ chunk-e6aww6q8.js:823552-823682 placement
function getCommandField(e) {
  return typeof e === "object" &&
    e !== null &&
    "command" in e &&
    typeof e.command === "string" &&
    e.command !== ""
    ? e.command
    : undefined;
}
//@ chunk-e6aww6q8.js:823682-823871 placement
function getCommandAndDescription(toolInput) {
  let commandField = getCommandField(toolInput);
  if (commandField === undefined) return;
  return typeof toolInput === "object" &&
    toolInput !== null &&
    "description" in toolInput &&
    typeof toolInput.description === "string"
    ? {
        command: commandField,
        description: toolInput.description,
      }
    : {
        command: commandField,
      };
}
//@ chunk-e6aww6q8.js:823871-823929 placement
/**
 * Monitor 工具带命令字段时视为 Bash 工具名。
 */
function monitorCommandAsBash(e, hookToolInput) {
  return e === MONITOR && getCommandField(hookToolInput) !== undefined ? BASH_TOOL_NAME : undefined;
}
export {
  splitToolParentOf,
  monitorCommandAsBash,
  getCommandAndDescription,
  splitToolByAction,
  getCommandField,
};
