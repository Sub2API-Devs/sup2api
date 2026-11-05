/**
 * tasks/types.ts
 *
 * 任务类型守卫：判断任务是否属于"后台任务"（显示在后台任务列表中）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tasks/types.ts
 * pieces: chunk-wjygkcr4.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isPanelAgentTask } from "./taskKinds.js";
import { isObserverAgentTask } from "./LocalAgentTask/LocalAgentTask.js";
import { isTerminalStatus } from "../components/tasks/taskStatusUtils.js";

//@ chunk-wjygkcr4.js:12216-12347 fingerprint (2.1.88 match: isBackgroundTask, 0.763)
/**
 * 判断任务是否应作为后台任务展示：排除非面板代理与观察者代理；运行中/等待中的任务要求 isBackgrounded===false 以外由类型自定义判断。
 */
function isBackgroundTask(task) {
  if (!isPanelAgentTask(task) || isObserverAgentTask(task)) return false;
  if (task.status === "running" || task.status === "pending") return task.isBackgrounded === false;
  return isTerminalStatus(task);
}
export { isBackgroundTask };
