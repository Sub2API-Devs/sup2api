/**
 * tasks/AutoModeScanTask/AutoModeScanTask.ts
 *
 * 2.1.316 新增：auto mode 扫描任务（可终止）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fmnbrxwy.js (1)
 * attribution: placement 1
 */
import { emitTaskNotification } from "../../utils/task/taskNotifications.js";

//@ chunk-fmnbrxwy.js:30190-30492 placement
/**
 * auto mode 扫描任务（可终止）。
 */
var AutoModeScanTask = {
  name: "AutoModeScanTask",
  type: "auto_mode_scan",
  async kill(taskId, taskRegistry) {
    let didKill = false;
    taskRegistry.update(taskId, (task) => {
      if (task.status !== "running") return task;
      task.abortController?.abort();
      didKill = true;
      return {
        ...task,
        status: "killed",
        endTime: Date.now(),
        notified: true,
        abortController: undefined,
      };
    });
    if (didKill)
      emitTaskNotification(taskId, "stopped", {
        skipTranscript: true,
        ambient: true,
      });
  },
};
export { AutoModeScanTask };
