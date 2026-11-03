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
import { BROADCAST_AGENT_TYPES } from "../../cli/remoteIO/gates.js";
import { normalizeAgentIdOrNull } from "../../utils/agentId.js";

//@ chunk-6vnxsn99.js:24622-24706 shared-adjacent = waitForTaskCompletion (0.87)
/**
 * 任务 running/pending 且不在前台。
 */
function waitForTaskCompletion(e) {
  if (e.status !== "running" && e.status !== "pending") return false;
  return !TaskOutputResultDisplay(e);
}
//@ chunk-6vnxsn99.js:24706-24772 file-last-pair
/**
 * 任务被标记为前台运行（isBackgrounded === false）。
 */
function TaskOutputResultDisplay(t0) {
  return "isBackgrounded" in t0 && t0.isBackgrounded === false;
}
//@ chunk-18hwfzwa.js:729446-729515 fingerprint = waitForTaskCompletion (0.87)
/**
 * 任务状态为 running 或 pending。
 */
function isTaskRunningOrPending(NS) {
  return NS.status === "running" || NS.status === "pending";
}
//@ chunk-z4g2ta8k.js:4871-5081 fingerprint = getTaskOutputData (0.311)
/**
 * 是否为主线程默认启动的内建本地代理任务（遥测/显示判定）。
 */
function getTaskOutputData(task) {
  return (
    task.task_type === "local_agent" &&
    task.is_built_in === true &&
    task.forked_skill === false &&
    task.main_thread_spawned === true &&
    task.default_launch === true &&
    task.agent_type !== undefined &&
    BROADCAST_AGENT_TYPES.has(task.agent_type) &&
    normalizeAgentIdOrNull(task.task_id) !== null
  );
}
export { TaskOutputResultDisplay, waitForTaskCompletion, isTaskRunningOrPending, getTaskOutputData };
