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

/**
 * 输出带 [remote-tools call=...] 前缀和键值字段的调试日志。
 */
//@ chunk-djxcrwwj.js:226-444 placement
function logRemoteTools(callId, message, fields = {}, level = "debug") {
  let n = callId === void 0 ? "[remote-tools]" : `[remote-tools call=${callId}]`,
    joined = Object.entries(fields)
      .flatMap(([d, i]) => (i === void 0 ? [] : [`${d}=${i}`]))
      .join(" ");
  logForDebugging(joined === "" ? `${n} ${message}` : `${n} ${message} ${joined}`, { level: level });
}
//@ chunk-djxcrwwj.js:444-502 placement
function Can(e) {
  return e === "outcome_of" ? "verbose" : "debug";
}
//@ chunk-tbjwqzxf.js:191-290 placement
var _Ce = ["remote_tool_call", "remote_plumbing_call", "remote_tools_probe", "remote_tools_reannounce"];

export { _Ce, Can, logRemoteTools };
