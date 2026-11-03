/**
 * tasks/LocalAgentTask/keepalive.ts
 *
 * 2.1.316 新增：子代理等待子工作时的保活
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: placement 4
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isCompletedBackgroundAgent } from "../taskKinds.js";

//@ chunk-e6aww6q8.js:1620253-1620305 placement
function jK() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_concurrent_shore", !0);
}
//@ chunk-e6aww6q8.js:1620305-1620331 placement
var FLAG_IDLE_WINDOW = "flag:idle-window";
/**
 * 判断后台代理已完成且只因空闲窗口保活。
 */
//@ chunk-e6aww6q8.js:1620331-1620471 placement
function isIdleCompletedAgent(e) {
  return (
    isCompletedBackgroundAgent(e) &&
    (!("keepaliveReasons" in e) ||
      !(e.keepaliveReasons instanceof Set) ||
      [...e.keepaliveReasons].every((n) => n === FLAG_IDLE_WINDOW))
  );
}
/**
 * 判断本地代理已完成但仍有保活原因（在等待子任务）。
 */
//@ chunk-e6aww6q8.js:1620471-1620626 placement
function isWaitingOnChildren(e) {
  return (
    e.type === "local_agent" &&
    e.status === "completed" &&
    "keepaliveReasons" in e &&
    e.keepaliveReasons instanceof Set &&
    e.keepaliveReasons.size > 0
  );
}

export { FLAG_IDLE_WINDOW, isIdleCompletedAgent, jK, isWaitingOnChildren };
