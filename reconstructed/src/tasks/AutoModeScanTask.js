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

/**
 * 是否是 auto_mode_scan 任务。
 */
//@ chunk-m8444q1d.js:14984-15075 placement
function isAutoModeScanTask(task) {
  return typeof task === "object" && task !== null && "type" in task && task.type === "auto_mode_scan";
}
/**
 * 找到正在运行的 auto_mode_scan 任务。
 */
//@ chunk-m8444q1d.js:15075-15172 placement = requestTeammateShutdown (1)
function findRunningAutoModeScanTask(taskRegistry) {
  for (let t of Object.values(taskRegistry.all()))
    if (isAutoModeScanTask(t) && t.status === "running") return t;
  return;
}
/**
 * 注册"scanning for auto-mode setup"后台任务（运行中、不写入记录，记录是否从 GitHub 组织收集），返回任务 id。
 */
//@ chunk-m8444q1d.js:15172-15399 placement
function registerAutoModeScanTask(o, t, i) {
  let u = generateTaskId("auto_mode_scan"),
    M = {
      ...createTaskStateBase(u, "auto_mode_scan", "scanning for auto-mode setup"),
      type: "auto_mode_scan",
      status: "running",
      skipTranscript: !0,
      gathersFromGitHubOrg: i,
      abortController: t,
    };
  return (o.register(M), u);
}

export { registerAutoModeScanTask, findRunningAutoModeScanTask };
