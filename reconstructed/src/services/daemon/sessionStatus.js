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
function m5(e) {
  if (e === void 0) return;
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(JOB_STATE_NAMES.has(e) ? e : "other");
}
//@ chunk-ex2reyb6.js:440-482 placement
var t = new Set(["cold", "spare", "adopted"]);
//@ chunk-ex2reyb6.js:482-544 placement
function ENt(e) {
  return typeof e === "string" && t.has(e) ? e : void 0;
}

export { m5, ENt };
