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
function isConcurrentShoreOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_concurrent_shore", true);
}
//@ chunk-e6aww6q8.js:1620305-1620331 placement
var FLAG_IDLE_WINDOW = "flag:idle-window";
//@ chunk-e6aww6q8.js:1620331-1620471 placement
/**
 * 判断后台代理已完成且只因空闲窗口保活。
 */
function isIdleCompletedAgent(task) {
  return (
    isCompletedBackgroundAgent(task) &&
    (!("keepaliveReasons" in task) ||
      !(task.keepaliveReasons instanceof Set) ||
      [...task.keepaliveReasons].every((keepaliveReason) => keepaliveReason === FLAG_IDLE_WINDOW))
  );
}
//@ chunk-e6aww6q8.js:1620471-1620626 placement
/**
 * 判断本地代理已完成但仍有保活原因（在等待子任务）。
 */
function isWaitingOnChildren(task) {
  return (
    task.type === "local_agent" &&
    task.status === "completed" &&
    "keepaliveReasons" in task &&
    task.keepaliveReasons instanceof Set &&
    task.keepaliveReasons.size > 0
  );
}
export { FLAG_IDLE_WINDOW, isIdleCompletedAgent, isConcurrentShoreOn, isWaitingOnChildren };
