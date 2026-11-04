/**
 * tools/shared/textSearchTools.ts
 *
 * 2.1.316 新增：Bash/PowerShell 作为文本搜索工具时的提示（head/tail/grep 等价物）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vf6hkvee.js (5)
 * attribution: placement 5
 */
import { BASH_TOOL_NAME } from "../BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../PowerShellTool/toolName.js";

//@ chunk-vf6hkvee.js:230-253 placement
/**
 * shell 工具名的集合（Bash、PowerShell）。
 */
var SHELL_TOOL_NAMES = new Set([BASH_TOOL_NAME, POWERSHELL_TOOL_NAME]);
//@ chunk-vf6hkvee.js:253-285 placement
/**
 * 判断工具名是否为 shell 工具。
 */
function isShellToolName(toolName) {
  return SHELL_TOOL_NAMES.has(toolName);
}
//@ chunk-vf6hkvee.js:285-321 placement
/**
 * 是 shell 工具则返回该名，否则返回默认名。
 */
function shellToolOrDefault(name, servedShellToolName) {
  return isShellToolName(name) ? name : servedShellToolName;
}
//@ chunk-vf6hkvee.js:321-433 placement
/**
 * 截断输出时建议的过滤命令（PowerShell 或 head/tail/grep）。
 */
function outputFilterHint(name) {
  return name === POWERSHELL_TOOL_NAME
    ? "Select-Object -First, Select-Object -Last or Select-String"
    : "head, tail or grep";
}
//@ chunk-vf6hkvee.js:433-481 placement
/**
 * 判断是否为非 MCP 的 shell 工具。
 */
function isNonMcpShellTool(tool) {
  return tool.isMcp !== true && isShellToolName(tool.name);
}
export { isShellToolName, isNonMcpShellTool, outputFilterHint, shellToolOrDefault };
