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

/**
 * 本地记忆导入任务（可终止）。
 */
//@ chunk-kxyd0g16.js:17064-17376 placement
var LocalMemoryImportTask = {
  name: "LocalMemoryImportTask",
  type: "local_memory_import",
  async kill(e, r) {
    let n = !1;
    if (
      (r.update(e, (s) => {
        if (s.status !== "running") return s;
        return (
          s.abortController?.abort(),
          (n = !0),
          { ...s, status: "killed", endTime: Date.now(), notified: !0, abortController: void 0 }
        );
      }),
      n)
    )
      emitTaskNotification(e, "stopped", { skipTranscript: !0, ambient: !0 });
  },
};

export { LocalMemoryImportTask };
