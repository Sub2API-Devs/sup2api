/**
 * tools/TaskOutputTool/TaskOutputTool.tsx
 *
 * 316 已无 TaskOutput 工具（名字列入已退役集合）；此处只剩任务运行状态判定小函数
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/TaskOutputTool/TaskOutputTool.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-6vnxsn99.js (2), chunk-z4g2ta8k.js (1)
 * attribution: fingerprint 2, shared-adjacent 1, file-last-pair 1
 */
import { ar } from "../../cli/remoteIO/gates.js";
import { Um } from "../../utils/agentId.js";

/**
 * 任务 running/pending 且不在前台。
 */
//@ chunk-6vnxsn99.js:24622-24706 shared-adjacent = waitForTaskCompletion (0.87)
function waitForTaskCompletion(e) {
  if (e.status !== "running" && e.status !== "pending") return !1;
  return !TaskOutputResultDisplay(e);
}
/**
 * 任务被标记为前台运行（isBackgrounded === false）。
 */
//@ chunk-6vnxsn99.js:24706-24772 file-last-pair
function TaskOutputResultDisplay(t0) {
  return "isBackgrounded" in t0 && t0.isBackgrounded === !1;
}
/**
 * 任务状态为 running 或 pending。
 */
//@ chunk-18hwfzwa.js:729446-729515 fingerprint = waitForTaskCompletion (0.87)
function isTaskRunningOrPending(NS) {
  return NS.status === "running" || NS.status === "pending";
}
/**
 * 是否为主线程默认启动的内建本地代理任务（遥测/显示判定）。
 */
//@ chunk-z4g2ta8k.js:4871-5081 fingerprint = getTaskOutputData (0.311)
function getTaskOutputData(task) {
  return (
    task.task_type === "local_agent" &&
    task.is_built_in === !0 &&
    task.forked_skill === !1 &&
    task.main_thread_spawned === !0 &&
    task.default_launch === !0 &&
    task.agent_type !== void 0 &&
    ar.has(task.agent_type) &&
    Um(task.task_id) !== null
  );
}

export { TaskOutputResultDisplay, waitForTaskCompletion, isTaskRunningOrPending, getTaskOutputData };
