/**
 * services/analytics/flushSinks.ts
 *
 * 2.1.316 新增。退出前刷新遥测汇（含注册的预刷新任务）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-c13g0cfa.js (5)
 * attribution: placement 5
 */
import { sleep } from "../../utils/sleep.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { onProcessRootHost } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-c13g0cfa.js:297-711 placement
/**
 * 退出前刷新遥测汇（含注册的预刷新任务）。
 */
async function flushAnalyticsSinks() {
  try {
    let shutdownTasks = getShutdownTasks();
    if (shutdownTasks.length > 0) {
      await Promise.race([Promise.allSettled(shutdownTasks), sleep(200)]);
      shutdownTasks.length = 0;
    }
    let [
      { settle1PEventLoggingBeforeExit: settle1P, shutdown1PEventLogging: shutdown1P },
      { shutdownDatadog },
      { shutdownErrorTracking },
    ] = await Promise.all([
      import("./firstPartyEventLogger.js"),
      import("./datadog.js"),
      import("../errorTracking/datadogErrorSink.js"),
    ]);
    let settled = settle1P();
    let shutdowns = [shutdown1P(), shutdownDatadog(), shutdownErrorTracking()];
    await Promise.race([Promise.all(shutdowns), sleep(500)]);
    await settled;
  } catch {}
}
//@ chunk-c13g0cfa.js:711-728 placement
/**
 * 按宿主保存的退出前刷新任务列表（HostScoped），供各遥测 sink 注册收尾工作。
 */
class ShutdownTaskList {
  tasks = [];
}
//@ chunk-c13g0cfa.js:728-751 placement
var shutdownTasksSlot; // deferred: uses ShutdownTaskList of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-c13g0cfa.js:728", () => {
  shutdownTasksSlot = new HostScoped(() => new ShutdownTaskList());
});
//@ chunk-c13g0cfa.js:751-783 placement
function getShutdownTasks() {
  return onProcessRootHost(shutdownTasksSlot).tasks;
}
//@ chunk-c13g0cfa.js:783-825 placement
function registerPreFlushTask(task) {
  getShutdownTasks().push(task.catch(() => {}));
}
export { flushAnalyticsSinks, registerPreFlushTask };
