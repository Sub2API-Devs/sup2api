/**
 * tasks/types.ts
 *
 * 任务类型守卫：判断任务是否属于"后台任务"（显示在后台任务列表中）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tasks/types.ts
 * pieces: chunk-ah34pb7m.js (1)
 * attribution: fingerprint 1
 */
import { isPanelAgentTask } from "./taskKinds.js";
import { isObserverAgentTask } from "./LocalAgentTask/LocalAgentTask.js";
import { isTerminalStatus } from "../components/tasks/taskStatusUtils.js";

//@ chunk-ah34pb7m.js:12200-12331 fingerprint = isBackgroundTask (0.764)
/**
 * 判断任务是否应作为后台任务展示：排除非面板代理与观察者代理；运行中/等待中的任务要求 isBackgrounded===false 以外由类型自定义判断。
 */
function isBackgroundTask(task) {
  if (!isPanelAgentTask(task) || isObserverAgentTask(task)) return false;
  if (task.status === "running" || task.status === "pending") return task.isBackgrounded === false;
  return isTerminalStatus(task);
}
export { isBackgroundTask };
