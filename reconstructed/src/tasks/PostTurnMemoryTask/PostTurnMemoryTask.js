/**
 * tasks/PostTurnMemoryTask/PostTurnMemoryTask.ts
 *
 * 2.1.316 新增：回合后记忆任务（可终止）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kxyd0g16.js (1)
 * attribution: placement 1
 */
import { emitTaskNotification } from "../../utils/task/taskNotifications.js";

/**
 * 回合后记忆任务（可终止）。
 */
//@ chunk-kxyd0g16.js:17713-18019 placement
var PostTurnMemoryTask = {
  name: "PostTurnMemoryTask",
  type: "post_turn_memory",
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

export { PostTurnMemoryTask };
