/**
 * tools/REPLTool/toolMeta.ts
 *
 * 工具元信息：内置工具集、按类型的超时与遥测类别（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (8)
 * attribution: placement 8
 */
import { BASH_TOOL_NAME } from "../BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../PowerShellTool/toolName.js";
import { SAFE_READ_ONLY_TOOLS } from "../../services/PromptSuggestion/speculation.js";
import { getMaxBashTimeoutMs, getDefaultBashTimeoutMs } from "../../utils/timeouts.js";
import { isAccepted } from "../../utils/codeMode/accepted.js";
import { GREP_TOOL_NAME } from "../GrepTool/prompt.js";
import { GLOB_TOOL_NAME } from "../GlobTool/prompt.js";
import { getFileAndShellTools } from "../../tools.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { sanitizeToolNameForAnalytics } from "../../services/analytics/metadata.js";
import { SKILL_2 } from "../SkillTool/skillToolNames.js";

//@ chunk-n51jggtb.js:71005-71053 placement
/**
 * 判断工具名是否属于 REPL 内置工具集。
 */
function isFastToolName(toolName) {
  return (
    toolName === BASH_TOOL_NAME || toolName === POWERSHELL_TOOL_NAME || SAFE_READ_ONLY_TOOLS.has(toolName)
  );
}
//@ chunk-n51jggtb.js:71053-71122 placement
/**
 * 取工具自带的超时，否则用给定默认值。
 */
function timeoutFrom(input, defaultMs) {
  let timeout = input.timeout;
  return typeof timeout === "number" && timeout > 0 ? timeout : defaultMs;
}
//@ chunk-n51jggtb.js:71122-71315 placement
/**
 * 按工具类型算出内层调用超时：shell 取上下限夹逼，Code Mode 下部分工具不限，内置工具固定 10 秒。
 */
function callTimeoutMs(tool, input, remainingMs) {
  if (tool.name === BASH_TOOL_NAME || tool.name === POWERSHELL_TOOL_NAME)
    return remainingMs !== undefined
      ? Math.min(timeoutFrom(input, getMaxBashTimeoutMs()), remainingMs)
      : Math.min(timeoutFrom(input, getDefaultBashTimeoutMs()), getMaxBashTimeoutMs());
  if (isAccepted() && (tool.name === GREP_TOOL_NAME || tool.name === GLOB_TOOL_NAME)) return;
  if (SAFE_READ_ONLY_TOOLS.has(tool.name)) return 1e4;
  return;
}
//@ chunk-n51jggtb.js:71315-71341 placement
/**
 * 返回是否处于 Code Mode。
 */
function isCodeModeOn() {
  return isAccepted();
}
//@ chunk-n51jggtb.js:71341-71392 placement
/**
 * 把工具集合与内置工具集合并成新 Set。
 */
function baseToolNameSet(allBaseTools) {
  return new Set([...(allBaseTools ?? []), ...getFileAndShellTools()]);
}
//@ chunk-n51jggtb.js:71392-71557 placement
/**
 * 给工具打遥测用的类别标签（mcp_tool / skill_tool / other_tool）。
 */
function toolKindLabel(tool, baseTools) {
  if (tool.isMcp === true || tool.mcpInfo !== undefined) return lit("mcp_tool");
  if (baseTools.has(tool)) return sanitizeToolNameForAnalytics(tool.name);
  return tool.name.startsWith(SKILL_2) ? lit("skill_tool") : lit("other_tool");
}
//@ chunk-n51jggtb.js:71557-71636 placement
/**
 * 运行中脚本状态容器：经典通道表、上次上报的 running/text、监听标记与 toolUseId。
 */
class ReplStreamState {
  classic = new Map();
  sent = {
    running: false,
    text: null,
  };
  listening = false;
  toolUseId = "";
}
//@ chunk-n51jggtb.js:71636-71659 placement
/**
 * 运行中脚本上报的总开关（恒为假）。
 */
function isStreamingOn() {
  return false;
}
export {
  ReplStreamState,
  isStreamingOn,
  baseToolNameSet,
  toolKindLabel,
  isCodeModeOn,
  callTimeoutMs,
  isFastToolName,
};
