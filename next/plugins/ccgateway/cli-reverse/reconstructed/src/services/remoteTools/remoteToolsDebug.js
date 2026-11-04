/**
 * services/remoteTools/remoteToolsDebug.ts
 *
 * 2.1.316 新增：远程工具调试日志。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-djxcrwwj.js (2), chunk-tbjwqzxf.js (1)
 * attribution: placement 3
 */
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-tbjwqzxf.js:191-290 placement
/**
 * 可记录的远端工具日志事件集合。
 */
var REMOTE_TOOLS_LOG_EVENTS = [
  "remote_tool_call",
  "remote_plumbing_call",
  "remote_tools_probe",
  "remote_tools_reannounce",
];
//@ chunk-djxcrwwj.js:226-444 placement
/**
 * 输出带 [remote-tools call=...] 前缀和键值字段的调试日志。
 */
function logRemoteTools(callId, message, fields = {}, level = "debug") {
  let prefix = callId === undefined ? "[remote-tools]" : `[remote-tools call=${callId}]`;
  let joined = Object.entries(fields)
    .flatMap(([key, value]) => (value === undefined ? [] : [`${key}=${value}`]))
    .join(" ");
  logForDebugging(joined === "" ? `${prefix} ${message}` : `${prefix} ${message} ${joined}`, {
    level,
  });
}
//@ chunk-djxcrwwj.js:444-502 placement
/**
 * 读取远端工具日志级别。
 */
function remoteToolsLogLevel(level) {
  return level === "outcome_of" ? "verbose" : "debug";
}
export { REMOTE_TOOLS_LOG_EVENTS, remoteToolsLogLevel, logRemoteTools };
