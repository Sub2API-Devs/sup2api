/**
 * tasks/AutoModeScanTask.ts
 *
 * 2.1.316 新增：auto mode 扫描后台任务。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-m8444q1d.js (3)
 * attribution: placement 3
 */
import { generateTaskId, createTaskStateBase } from "../Task.js";

//@ chunk-m8444q1d.js:14984-15075 placement
/**
 * 是否是 auto_mode_scan 任务。
 */
function isAutoModeScanTask(task) {
  return typeof task === "object" && task !== null && "type" in task && task.type === "auto_mode_scan";
}
//@ chunk-m8444q1d.js:15075-15172 placement = requestTeammateShutdown (1)
/**
 * 找到正在运行的 auto_mode_scan 任务。
 */
function findRunningAutoModeScanTask(taskRegistry) {
  for (let task of Object.values(taskRegistry.all()))
    if (isAutoModeScanTask(task) && task.status === "running") return task;
  return;
}
//@ chunk-m8444q1d.js:15172-15399 placement
/**
 * 注册"scanning for auto-mode setup"后台任务（运行中、不写入记录，记录是否从 GitHub 组织收集），返回任务 id。
 */
function registerAutoModeScanTask(taskRegistry, abortController, gathersFromGitHubOrg) {
  let taskId = generateTaskId("auto_mode_scan");
  let M = {
    ...createTaskStateBase(taskId, "auto_mode_scan", "scanning for auto-mode setup"),
    type: "auto_mode_scan",
    status: "running",
    skipTranscript: true,
    gathersFromGitHubOrg,
    abortController,
  };
  taskRegistry.register(M);
  return taskId;
}
export { registerAutoModeScanTask, findRunningAutoModeScanTask };
