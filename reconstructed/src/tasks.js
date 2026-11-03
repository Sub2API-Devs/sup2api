/**
 * tasks.ts
 *
 * 任务实现注册表：把各类任务实现（shell、agent、远程、dream、teammate、workflow、MCP 任务等）按 type 建成 Map
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tasks.ts
 * pieces: chunk-kxyd0g16.js (1)
 * attribution: fingerprint 1
 */
import { LocalShellTask } from "./tasks/LocalShellTask/LocalShellTask.js";
import { LocalAgentTask } from "./tasks/LocalAgentTask/LocalAgentTask.js";
import { RemoteAgentTask } from "./tasks/RemoteAgentTask/RemoteAgentTask.js";
import { DreamTask } from "./tasks/DreamTask/DreamTask.js";
import { AutoModeScanTask } from "./tasks/AutoModeScanTask/AutoModeScanTask.js";
import { LocalMemoryImportTask } from "./tasks/LocalMemoryImportTask/LocalMemoryImportTask.js";
import { PostTurnMemoryTask } from "./tasks/PostTurnMemoryTask/PostTurnMemoryTask.js";
import { MonitorMcpTaskImpl } from "./tasks/MonitorMcpTask/MonitorMcpTask.js";
import { MonitorWsTask } from "./tasks/MonitorWsTask/MonitorWsTask.js";
import { InProcessTeammateTask } from "./tasks/InProcessTeammateTask/InProcessTeammateTask.js";

//@ chunk-kxyd0g16.js:18118-18315 fingerprint = LocalWorkflowTask (0.309)
/**
 * 返回 type → 任务实现（含 kill 方法）的 Map；local_workflow 与 MCP 任务实现通过懒加载 chunk 取得。旧版是 getAllTasks()/getTaskByType()。
 */
function getTaskImplsByType() {
  let taskImpls = [
    LocalShellTask,
    LocalAgentTask,
    RemoteAgentTask,
    DreamTask,
    AutoModeScanTask,
    LocalMemoryImportTask,
    PostTurnMemoryTask,
    MonitorMcpTaskImpl,
    MonitorWsTask,
    InProcessTeammateTask,
    require("./chunk-xxmv82wc.js").LocalWorkflowTask,
  ];
  taskImpls.push(require("./chunk-1wp0vvkk.js").MCP_TASK);
  return new Map(taskImpls.map((taskImpl) => [taskImpl.type, taskImpl]));
}
export { getTaskImplsByType };
