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
var r = new Set([BASH_TOOL_NAME, POWERSHELL_TOOL_NAME]);
//@ chunk-vf6hkvee.js:253-285 placement
function xTe(e) {
  return r.has(e);
}
//@ chunk-vf6hkvee.js:285-321 placement
function QOs(e, n) {
  return xTe(e) ? e : n;
}
/**
 * 截断输出时建议的过滤命令（PowerShell 或 head/tail/grep）。
 */
//@ chunk-vf6hkvee.js:321-433 placement
function outputFilterHint(e) {
  return e === POWERSHELL_TOOL_NAME
    ? "Select-Object -First, Select-Object -Last or Select-String"
    : "head, tail or grep";
}
//@ chunk-vf6hkvee.js:433-481 placement
function FL(e) {
  return e.isMcp !== !0 && xTe(e.name);
}

export { xTe, FL, outputFilterHint, QOs };
