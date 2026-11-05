/**
 * tasks/PostTurnMemoryTask/PostTurnMemoryTask.ts
 *
 * 2.1.316 新增：回合后记忆任务（可终止）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fmnbrxwy.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { emitTaskNotification } from "../../utils/task/taskNotifications.js";

//@ chunk-fmnbrxwy.js:31556-31862 placement
/**
 * 回合后记忆任务（可终止）。
 */
var PostTurnMemoryTask = {
  name: "PostTurnMemoryTask",
  type: "post_turn_memory",
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
export { PostTurnMemoryTask };
