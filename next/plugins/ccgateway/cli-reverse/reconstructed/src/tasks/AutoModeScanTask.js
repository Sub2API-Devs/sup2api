/**
 * tasks/AutoModeScanTask.ts
 *
 * 2.1.316 新增：auto mode 扫描后台任务。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8x5p2wd7.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { generateTaskId, createTaskStateBase } from "../Task.js";

//@ chunk-8x5p2wd7.js:16161-16252 placement
/**
 * 是否是 auto_mode_scan 任务。
 */
function isAutoModeScanTask(task) {
  return typeof task === "object" && task !== null && "type" in task && task.type === "auto_mode_scan";
}
//@ chunk-8x5p2wd7.js:16252-16349 placement (2.1.88 match: requestTeammateShutdown, 1)
/**
 * 找到正在运行的 auto_mode_scan 任务。
 */
function findRunningAutoModeScanTask(taskRegistry) {
  for (let task of Object.values(taskRegistry.all()))
    if (isAutoModeScanTask(task) && task.status === "running") return task;
  return;
}
//@ chunk-8x5p2wd7.js:16349-16576 placement
/**
 * 注册"scanning for auto-mode setup"后台任务（运行中、不写入记录，记录是否从 GitHub 组织收集），返回任务 id。
 */
function registerAutoModeScanTask(taskRegistry, abortController, gathersFromGitHubOrg) {
  let taskId = generateTaskId("auto_mode_scan");
  let taskState = {
    ...createTaskStateBase(taskId, "auto_mode_scan", "scanning for auto-mode setup"),
    type: "auto_mode_scan",
    status: "running",
    skipTranscript: true,
    gathersFromGitHubOrg,
    abortController,
  };
  taskRegistry.register(taskState);
  return taskId;
}
export { registerAutoModeScanTask, findRunningAutoModeScanTask };
