/**
 * utils/task/sdkProgress.ts
 *
 * 向 SDK 发送 task_progress 系统事件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/task/sdkProgress.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { enqueueTaskNotification, getRunId } from "./taskNotifications.js";

//@ chunk-5xgkngpb.js:4823985-4824337 fingerprint (2.1.88 match: emitTaskProgress, 0.907)
function emitTaskProgress(params) {
  enqueueTaskNotification({
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
