/**
 * utils/claudeInChrome/chromeToolNames.ts
 *
 * 2.1.316 新增：Claude in Chrome / 设备浏览器工具名前缀与改写
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-20nqyqvq.js (8)
 * attribution: placement 8
 */
import { CLAUDE_IN_CHROME_MCP_TOOLS } from "../../skills/bundled/claudeInChrome.js";

//@ chunk-20nqyqvq.js:191-289 placement
/**
 * 浏览器预览类 MCP 工具名的前缀列表。
 */
var BROWSER_PREVIEW_TOOL_PREFIXES = [
  "mcp__Claude_Preview__",
  "mcp__Claude_Browser__",
  "mcp__remote-devices__Claude_Browser__",
];
//@ chunk-20nqyqvq.js:289-506 placement
/**
 * Chrome 工具名的各种 MCP 前缀（含 remote-devices 与 claude-device）。
 */
var MCP_CLAUDE_DEVICE_CHROME = "mcp__claude-device__chrome_";
var CHROME_TOOL_PREFIXES = [
  "mcp__claude-in-chrome__",
  "mcp__Claude_in_Chrome__",
  "mcp__remote-devices__claude-in-chrome__",
  "mcp__remote-devices__Claude_in_Chrome__",
  "mcp__claude-device__chrome_",
  ...BROWSER_PREVIEW_TOOL_PREFIXES,
];
//@ chunk-20nqyqvq.js:506-656 placement
/**
 * 取 claude-device chrome 工具后缀
 */
function chromeToolSuffix(_) {
  if (!_.startsWith("mcp__claude-device__chrome_")) return null;
  let sliced = _.slice(27);
  return sliced === "" || sliced.startsWith("_") || sliced.includes("__") ? null : sliced;
}
//@ chunk-20nqyqvq.js:729-795 placement
/**
 * 把 “chrome_x” 形式的设备工具名归一回后缀。
 */
function normalizeDeviceChromeToolName(toolName, e) {
  let n = chromeToolSuffix(toolName);
  return n !== null && e === "chrome_" + n ? n : e;
}
//@ chunk-20nqyqvq.js:795-865 placement
var regExp = new RegExp("(?<![\\w-])mcp__claude-device__chrome_[\\w-]*", "g");
//@ chunk-20nqyqvq.js:865-973 placement
function rewriteDeviceChromeToolNames(rule) {
  return rule.replace(regExp, (tool) =>
    tool === "mcp__claude-device__chrome_" ? "mcp__claude-in-chrome__" : CLAUDE_IN_CHROME_MCP_TOOLS(tool),
  );
}
//@ chunk-20nqyqvq.js:973-1026 placement
function isChromeToolName(toolNameForPermissionCheck) {
  return CHROME_TOOL_PREFIXES.some((e) => toolNameForPermissionCheck.startsWith(e));
}
//@ chunk-20nqyqvq.js:1026-1080 placement
/**
 * 判断工具名是否属于浏览器预览类。
 */
function isBrowserPreviewToolName(toolNameForPermissionCheck) {
  return BROWSER_PREVIEW_TOOL_PREFIXES.some((e) => toolNameForPermissionCheck.startsWith(e));
}
export {
  isChromeToolName,
  isBrowserPreviewToolName,
  chromeToolSuffix,
  normalizeDeviceChromeToolName,
  rewriteDeviceChromeToolNames,
  CHROME_TOOL_PREFIXES,
  BROWSER_PREVIEW_TOOL_PREFIXES,
  MCP_CLAUDE_DEVICE_CHROME,
};
