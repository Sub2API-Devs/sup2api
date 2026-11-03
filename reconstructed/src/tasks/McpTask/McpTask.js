/**
 * tasks/McpTask/McpTask.ts
 *
 * 2.1.316 新增：MCP 后台任务类型
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1wp0vvkk.js (1)
 * attribution: placement 1
 */
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { deleteMcpTaskMetadata } from "../../services/mcp/mcpTasks.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";

//@ chunk-1wp0vvkk.js:1144-1951 placement
/**
 * MCP 后台任务类型定义：终止、状态与输出处理。
 */
var McpTask = {
  name: "MCP Task",
  type: "mcp_task",
  async kill(o, s, d, k, i) {
    let e = s.get(o);
    let sidecarSessionId = e?.type === "mcp_task" ? e.sidecarSessionId : undefined;
    let sidecarProjectDir = e?.type === "mcp_task" ? e.sidecarProjectDir : undefined;
    let sidecarWrite = e?.type === "mcp_task" ? e.sidecarWrite : undefined;
    if (e?.type === "mcp_task") {
      e.abortController?.abort();
      e.driveAbortController?.abort();
      e.sep2663Cancel?.();
    }
    let a = false;
    s.update(o, (r) => {
      if (r.notified || r.status !== "running") return r;
      a = true;
      return {
        ...r,
        status: "killed",
        endTime: Date.now(),
        parked: undefined,
        notified: true,
      };
    });
    if (a && e?.type === "mcp_task")
      try {
        e.onWorkerWakeOutcome?.({
          kind: "stopped",
        });
      } catch (error) {
        logForDebugging("McpTask.kill: onWorkerWakeOutcome threw, the stop continues");
        logError(error);
      }
    (async () => {
      await sidecarWrite;
      await deleteMcpTaskMetadata(o, i, sidecarSessionId, sidecarProjectDir);
    })().catch((error) => logForDebugging(`McpTask.kill deleteMcpTaskMetadata: ${String(error)}`));
    if (a && e?.type === "mcp_task" && e.protocol === "sep2663") logFeatureOk("mcp_task_stop");
  },
};
