/**
 * tasks/McpTask/McpTask.ts
 *
 * 2.1.316 新增：MCP 后台任务类型
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-f7mbg0zr.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { deleteMcpTaskMetadata } from "../../services/mcp/mcpTasks.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";

//@ chunk-f7mbg0zr.js:1228-2035 placement
/**
 * MCP 后台任务类型定义：终止、状态与输出处理。
 */
var McpTask = {
  name: "MCP Task",
  type: "mcp_task",
  async kill(taskId, taskRegistry, setAppState, unusedGuard, storageV5) {
    let task = taskRegistry.get(taskId);
    let sidecarSessionId = task?.type === "mcp_task" ? task.sidecarSessionId : undefined;
    let sidecarProjectDir = task?.type === "mcp_task" ? task.sidecarProjectDir : undefined;
    let sidecarWrite = task?.type === "mcp_task" ? task.sidecarWrite : undefined;
    if (task?.type === "mcp_task") {
      task.abortController?.abort();
      task.driveAbortController?.abort();
      task.sep2663Cancel?.();
    }
    let didKill = false;
    taskRegistry.update(taskId, (task) => {
      if (task.notified || task.status !== "running") return task;
      didKill = true;
      return {
        ...task,
        status: "killed",
        endTime: Date.now(),
        parked: undefined,
        notified: true,
      };
    });
    if (didKill && task?.type === "mcp_task")
      try {
        task.onWorkerWakeOutcome?.({
          kind: "stopped",
        });
      } catch (error) {
        logForDebugging("McpTask.kill: onWorkerWakeOutcome threw, the stop continues");
        logError(error);
      }
    (async () => {
      await sidecarWrite;
      await deleteMcpTaskMetadata(taskId, storageV5, sidecarSessionId, sidecarProjectDir);
    })().catch((error) => logForDebugging(`McpTask.kill deleteMcpTaskMetadata: ${String(error)}`));
    if (didKill && task?.type === "mcp_task" && task.protocol === "sep2663") logFeatureOk("mcp_task_stop");
  },
};
export { McpTask };
