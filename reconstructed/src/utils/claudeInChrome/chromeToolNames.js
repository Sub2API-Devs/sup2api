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
var Ddr = ["mcp__Claude_Preview__", "mcp__Claude_Browser__", "mcp__remote-devices__Claude_Browser__"];
//@ chunk-20nqyqvq.js:289-506 placement
var MCP_CLAUDE_DEVICE_CHROME = "mcp__claude-device__chrome_",
  uae = [
    "mcp__claude-in-chrome__",
    "mcp__Claude_in_Chrome__",
    "mcp__remote-devices__claude-in-chrome__",
    "mcp__remote-devices__Claude_in_Chrome__",
    "mcp__claude-device__chrome_",
    ...Ddr,
  ];
/**
 * 取 claude-device chrome 工具后缀
 */
//@ chunk-20nqyqvq.js:506-656 placement
function chromeToolSuffix(_) {
  if (!_.startsWith("mcp__claude-device__chrome_")) return null;
  let sliced = _.slice(27);
  return sliced === "" || sliced.startsWith("_") || sliced.includes("__") ? null : sliced;
}
//@ chunk-20nqyqvq.js:729-795 placement
function mgi(_, e) {
  let n = chromeToolSuffix(_);
  return n !== null && e === "chrome_" + n ? n : e;
}
//@ chunk-20nqyqvq.js:795-865 placement
var regExp = new RegExp("(?<![\\w-])mcp__claude-device__chrome_[\\w-]*", "g");
//@ chunk-20nqyqvq.js:865-973 placement
function rewriteDeviceChromeToolNames(_) {
  return _.replace(regExp, (e) =>
    e === "mcp__claude-device__chrome_" ? "mcp__claude-in-chrome__" : CLAUDE_IN_CHROME_MCP_TOOLS(e),
  );
}
//@ chunk-20nqyqvq.js:973-1026 placement
function isChromeToolName(_) {
  return uae.some((e) => _.startsWith(e));
}
//@ chunk-20nqyqvq.js:1026-1080 placement
function E5t(_) {
  return Ddr.some((e) => _.startsWith(e));
}

export {
  isChromeToolName,
  E5t,
  chromeToolSuffix,
  mgi,
  rewriteDeviceChromeToolNames,
  uae,
  Ddr,
  MCP_CLAUDE_DEVICE_CHROME,
};
