/**
 * tasks/MonitorMcpTask/MonitorMcpTask.ts
 *
 * 2.1.316 新增：MonitorMcpTask：监视 MCP 资源的后台任务类型。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fmnbrxwy.js (4)
 * attribution: placement 4
 */
import { stopMonitorTask } from "../MonitorTask/monitorDelivery.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { getTaskImplsByType } from "../../tasks.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fmnbrxwy.js:31331-31406 placement
/**
 * MonitorMcpTask 的任务实现对象。
 */
var MonitorMcpTaskImpl = {
  name: "MonitorMcpTask",
  type: "monitor_mcp",
  async kill(taskId, taskRegistry) {
    registerMonitorMcpTask(taskId, taskRegistry);
  },
};
//@ chunk-fmnbrxwy.js:31406-31556 placement
function registerMonitorMcpTask(taskId, registry, options) {
  stopMonitorTask(taskId, registry, {
    ...options,
    onKilled: () => {
      options?.onKilled?.();
      let { streamedMonitorStops } = getTaskRunState();
      let stopStream = streamedMonitorStops.get(taskId);
      streamedMonitorStops.delete(taskId);
      try {
        stopStream?.();
      } catch (error) {
        logError(toError(error));
      }
    },
  });
}
//@ chunk-fmnbrxwy.js:31862-31947 placement
/**
 * 按任务类型查实现的调度表类。
 */
class TaskImplDispatch {
  dispatch = undefined;
  lookup(taskType) {
    this.dispatch ??= getTaskImplsByType();
    return this.dispatch.get(taskType);
  }
}
//@ chunk-fmnbrxwy.js:31947-31961 placement
/**
 * 按任务类型查实现的调度表单例。
 */
var taskImplDispatch; // deferred: uses TaskImplDispatch of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fmnbrxwy.js:31947", () => {
  taskImplDispatch = new TaskImplDispatch();
});
export { MonitorMcpTaskImpl, taskImplDispatch };
