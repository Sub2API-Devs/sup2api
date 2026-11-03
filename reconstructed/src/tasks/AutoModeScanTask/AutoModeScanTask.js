/**
 * tasks/AutoModeScanTask/AutoModeScanTask.ts
 *
 * 2.1.316 新增：auto mode 扫描任务（可终止）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kxyd0g16.js (1)
 * attribution: placement 1
 */
import { emitTaskNotification } from "../../utils/task/taskNotifications.js";

//@ chunk-kxyd0g16.js:16347-16649 placement
/**
 * auto mode 扫描任务（可终止）。
 */
var AutoModeScanTask = {
  name: "AutoModeScanTask",
  type: "auto_mode_scan",
  async kill(e, r) {
    let n = false;
    r.update(e, (s) => {
      if (s.status !== "running") return s;
      s.abortController?.abort();
      n = true;
      return {
        ...s,
        status: "killed",
        endTime: Date.now(),
        notified: true,
        abortController: undefined,
      };
    });
    if (n)
      emitTaskNotification(e, "stopped", {
        skipTranscript: true,
        ambient: true,
      });
  },
};
export { AutoModeScanTask };
