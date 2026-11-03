/**
 * utils/task/sdkProgress.ts
 *
 * 向 SDK 发送 task_progress 系统事件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/task/sdkProgress.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { enqueueTaskNotification as enqueueTaskNotification_2, getRunId } from "./taskNotifications.js";

//@ chunk-e6aww6q8.js:4713141-4713493 fingerprint = emitTaskProgress (0.911)
function emitTaskProgress(params) {
  enqueueTaskNotification_2({
    type: "system",
    subtype: "task_progress",
    task_id: params.taskId,
    run_id: getRunId(params.taskId),
    tool_use_id: params.toolUseId,
    description: params.description,
    subagent_type: params.subagentType,
    usage: {
      total_tokens: params.totalTokens,
      tool_uses: params.toolUses,
      duration_ms: Date.now() - params.startTime,
    },
    last_tool_name: params.lastToolName,
    summary: params.summary,
    workflow_progress: params.workflowProgress,
  });
}

export { emitTaskProgress };
