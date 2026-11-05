/**
 * tasks/LocalAgentTask/keepalive.ts
 *
 * 2.1.316 新增：子代理等待子工作时的保活
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (4)
 * attribution: placement 4
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isCompletedBackgroundAgent } from "../taskKinds.js";

//@ chunk-5xgkngpb.js:1687953-1688005 placement
function isConcurrentShoreOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_concurrent_shore", true);
}
//@ chunk-5xgkngpb.js:1688005-1688031 placement
var FLAG_IDLE_WINDOW = "flag:idle-window";
//@ chunk-5xgkngpb.js:1688031-1688171 placement
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
//@ chunk-5xgkngpb.js:1688171-1688326 placement
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
export { FLAG_IDLE_WINDOW, isConcurrentShoreOn, isIdleCompletedAgent, isWaitingOnChildren };
