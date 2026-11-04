/**
 * tasks/LocalMemoryImportTask/LocalMemoryImportTask.ts
 *
 * 2.1.316 新增：本地记忆导入任务（可终止）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kxyd0g16.js (1)
 * attribution: placement 1
 */
import { emitTaskNotification } from "../../utils/task/taskNotifications.js";

//@ chunk-kxyd0g16.js:17064-17376 placement
/**
 * 本地记忆导入任务（可终止）。
 */
var LocalMemoryImportTask = {
  name: "LocalMemoryImportTask",
  type: "local_memory_import",
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
export { LocalMemoryImportTask };
