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
function splitToolParentOf(toolName) {
  return Object.hasOwn(SPLIT_TOOL_PARENT, toolName) ? SPLIT_TOOL_PARENT[toolName] : undefined;
}
//@ chunk-e6aww6q8.js:823418-823552 placement
/**
 * 按 action 把工具名映射到具体动作工具。
 */
function splitToolByAction(toolName, input) {
  if (!Object.hasOwn(SPLIT_TOOL_BY_ACTION, toolName)) return;
  let action = input?.action;
  let byAction = SPLIT_TOOL_BY_ACTION[toolName];
  return typeof action === "string" && Object.hasOwn(byAction, action) ? byAction[action] : undefined;
}
//@ chunk-e6aww6q8.js:823552-823682 placement
function getCommandField(input) {
  return typeof input === "object" &&
    input !== null &&
    "command" in input &&
    typeof input.command === "string" &&
    input.command !== ""
    ? input.command
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
function monitorCommandAsBash(toolName, hookToolInput) {
  return toolName === MONITOR && getCommandField(hookToolInput) !== undefined ? BASH_TOOL_NAME : undefined;
}
export {
  splitToolParentOf,
  monitorCommandAsBash,
  getCommandAndDescription,
  splitToolByAction,
  getCommandField,
};
