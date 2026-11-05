/**
 * services/remoteTools/remoteToolsDebug.ts
 *
 * 2.1.316 新增：远程工具调试日志。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ercjmfs0.js (2), chunk-x6psxkj0.js (1)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-x6psxkj0.js:191-290 placement
/**
 * 可记录的远端工具日志事件集合。
 */
var REMOTE_TOOLS_LOG_EVENTS = [
  "remote_tool_call",
  "remote_plumbing_call",
  "remote_tools_probe",
  "remote_tools_reannounce",
];
//@ chunk-ercjmfs0.js:226-444 placement
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
//@ chunk-ercjmfs0.js:444-502 placement
/**
 * 读取远端工具日志级别。
 */
function remoteToolsLogLevel(level) {
  return level === "outcome_of" ? "verbose" : "debug";
}
export { logRemoteTools, remoteToolsLogLevel, REMOTE_TOOLS_LOG_EVENTS };
