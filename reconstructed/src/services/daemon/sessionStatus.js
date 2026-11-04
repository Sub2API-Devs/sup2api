/**
 * services/daemon/sessionStatus.ts
 *
 * 后台会话状态（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ex2reyb6.js (4)
 * attribution: placement 4
 */
import { fromSanitizer_SANITIZER_OUTPUT_ONLY } from "../analytics/safeMetadata.js";

//@ chunk-ex2reyb6.js:227-374 placement
var JOB_STATE_NAMES = new Set([
  "starting",
  "running",
  "resuming",
  "adopted",
  "crashed",
  "working",
  "blocked",
  "done",
  "stopped",
  "failed",
  "busy",
  "shell",
  "idle",
  "waiting",
]);
//@ chunk-ex2reyb6.js:374-440 placement
/**
 * 把作业状态名规范成已知枚举，未知归 other。
 */
function daemonSessionStateLabel(jobState) {
  if (jobState === undefined) return;
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(JOB_STATE_NAMES.has(jobState) ? jobState : "other");
}
//@ chunk-ex2reyb6.js:440-482 placement
/**
 * 守护进程会话的三个状态（cold、spare、adopted）。
 */
var DAEMON_SESSION_STATES = new Set(["cold", "spare", "adopted"]);
//@ chunk-ex2reyb6.js:482-544 placement
/**
 * 只保留已知会话状态，其他返回 undefined。
 */
function normalizeDaemonSessionState(state) {
  return typeof state === "string" && DAEMON_SESSION_STATES.has(state) ? state : undefined;
}
export { daemonSessionStateLabel, normalizeDaemonSessionState };
