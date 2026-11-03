/**
 * components/tasks/_new/logSubagentHistoryLaunchError.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (10)
 * attribution: sole-consumer-new 10
 */
import { isFsInaccessible } from "../../../utils/errors.js";
import { logForDebugging } from "../../../utils/debug.js";
import { logError } from "../../../utils/log.js";

//@ chunk-18hwfzwa.js:728758-728809 sole-consumer-new
function J6t(OS) {
  return OS.type === "auto_mode_scan";
}
//@ chunk-18hwfzwa.js:728809-728865 sole-consumer-new
function X6t(xE) {
  return xE.type === "local_memory_import";
}
//@ chunk-18hwfzwa.js:728865-728918 sole-consumer-new
function Z6t(nw) {
  return nw.type === "post_turn_memory";
}
//@ chunk-18hwfzwa.js:728918-728952 sole-consumer-new
function e4t(qk) {
  return [qk.id, qk];
}
/**
 * 子代理历史无法读取时记调试日志（文件不可访问）或记错误，返回 false。
 */
//@ chunk-18hwfzwa.js:728952-729052 sole-consumer-new
function logSubagentHistoryLaunchError(PE) {
  if (isFsInaccessible(PE)) logForDebugging(`subagent history: launch unreadable: ${PE.code}`);
  else logError(PE);
  return !1;
}
//@ chunk-18hwfzwa.js:729052-729082 sole-consumer-new
function o4t(b_) {
  return logError(b_);
}
//@ chunk-18hwfzwa.js:729082-729112 sole-consumer-new
function n4t($k) {
  return logError($k);
}
//@ chunk-18hwfzwa.js:729112-729142 sole-consumer-new
function r4t(Gx) {
  return logError(Gx);
}
//@ chunk-18hwfzwa.js:729142-729158 sole-consumer-new
function s4t() {}
//@ chunk-18hwfzwa.js:729158-729174 sole-consumer-new
function i4t() {}

export { J6t, X6t, Z6t, e4t, logSubagentHistoryLaunchError, o4t, n4t, r4t, s4t, i4t };
