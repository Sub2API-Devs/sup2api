/**
 * tasks/taskStatus.ts
 *
 * 2.1.316 新增：任务状态
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-c0cahhqh.js (7)
 * attribution: placement 7
 */

//@ chunk-c0cahhqh.js:299-365 placement = isTerminalTaskStatus (1)
/**
 * 任务状态是否为终态（completed / failed / killed）。chunk-c0cahhqh 内的副本。
 */
function isTerminalTaskStatus(status) {
  return status === "completed" || status === "failed" || status === "killed";
}
//@ chunk-c0cahhqh.js:365-452 placement
/**
 * 代理类任务的类型集合：local_agent、remote_agent、in_process_teammate、local_workflow。
 */
var AGENT_TASK_TYPES = new Set(["local_agent", "remote_agent", "in_process_teammate", "local_workflow"]);
//@ chunk-c0cahhqh.js:452-501 placement
/**
 * 任务表里是否存在活动中的代理类任务（isActiveAgentTask）。
 */
function hasActiveAgentTasks(tasks) {
  return Object.values(tasks).some(isActiveAgentTask);
}
//@ chunk-c0cahhqh.js:501-786 placement
/**
 * 是否有"值得等待"的活动代理任务：在 isActiveAgentTask 基础上排除已暂停的、无法恢复的 teammate，以及处于 needs_input / plan_ready 或恢复来的 ultraplan 远程任务。
 */
function hasAwaitableAgentTasks(tasks) {
  return Object.values(tasks).some(
    (task) =>
      isActiveAgentTask(task) &&
      task.status !== "paused" &&
      !(task.type === "in_process_teammate" && task.identity?.resumableAgentId === undefined) &&
      !(
        task.type === "remote_agent" &&
        (task.ultraplanPhase === "needs_input" ||
          task.ultraplanPhase === "plan_ready" ||
          (task.isUltraplan && task.restoredOnResume))
      ),
  );
}
//@ chunk-c0cahhqh.js:786-930 placement
/**
 * 判断一个任务是否是"活动中的代理类任务"：类型在 AGENT_TASK_TYPES 里、未到终态、不是空闲的 teammate、不是长期运行的远程代理。
 */
function isActiveAgentTask(task) {
  return (
    AGENT_TASK_TYPES.has(task.type) &&
    !isTerminalTaskStatus(task.status) &&
    !(task.type === "in_process_teammate" && task.isIdle) &&
    !(task.type === "remote_agent" && task.isLongRunning)
  );
}
//@ chunk-c0cahhqh.js:930-980 placement
/**
 * 任务表里是否有正在运行的 shell 任务。
 */
function hasRunningShellTasks(tasks) {
  return Object.values(tasks).some(isRunningShellTask);
}
//@ chunk-c0cahhqh.js:980-1040 placement
/**
 * 是否是未到终态的 local_bash 任务。
 */
function isRunningShellTask(task) {
  return task.type === "local_bash" && !isTerminalTaskStatus(task.status);
}
export {
  isTerminalTaskStatus,
  hasAwaitableAgentTasks,
  AGENT_TASK_TYPES,
  isActiveAgentTask,
  hasActiveAgentTasks,
  hasRunningShellTasks,
  isRunningShellTask,
};
