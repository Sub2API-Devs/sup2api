/**
 * utils/agentProcessRegistry.ts
 *
 * 2.1.316 新增：代理进程登记
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (14)
 * attribution: placement 14
 */
import {
  getTaskLoopRegistry,
  isTaskLoopSettled,
  getTaskLoop,
  taskAgentIds,
  onTaskLoopSettled,
  liveAgentControllers,
} from "../tasks/taskLoopRegistry.js";
import { logForDebugging } from "./debug.js";
import { killProcessGroup as killProcessGroup_2 } from "./auth/lockHolderLiveness.js";
import { logFeatureSad } from "../services/analytics/featureTelemetry.js";

//@ chunk-5xgkngpb.js:266430-266713 placement
/**
 * 登记某代理的子进程，返回注销函数。
 */
function registerAgentProcess(owningAgentId, childProcess) {
  let pid = childProcess.pid;
  if (owningAgentId === undefined || pid === undefined || !Number.isInteger(pid) || pid <= 1) return () => {};
  let { liveProcessesByAgentId } = getTaskLoopRegistry();
  let processes = liveProcessesByAgentId.get(owningAgentId);
  if (!processes) {
    processes = new Set();
    liveProcessesByAgentId.set(owningAgentId, processes);
  }
  processes.add(childProcess);
  let unregistered = false;
  return () => {
    if (unregistered) return;
    unregistered = true;
    let currentProcesses = liveProcessesByAgentId.get(owningAgentId);
    if (!currentProcesses) return;
    currentProcesses.delete(childProcess);
    if (currentProcesses.size === 0) liveProcessesByAgentId.delete(owningAgentId);
  };
}
//@ chunk-5xgkngpb.js:266713-266871 placement
/**
 * 代理仍在运行的子进程 pid。
 */
function liveAgentPids(agentId) {
  let pids = [];
  for (let childProcess of getTaskLoopRegistry().liveProcessesByAgentId.get(agentId) ?? [])
    if (childProcess.pid !== undefined && childProcess.exitCode === null && childProcess.signalCode === null)
      pids.push(childProcess.pid);
  return pids;
}
//@ chunk-5xgkngpb.js:266871-267079 placement
/**
 * 杀掉代理所有子进程组。
 */
async function killAgentProcessGroups(agentId, signal = "SIGKILL") {
  let pids = liveAgentPids(agentId);
  if (pids.length === 0) return pids;
  logForDebugging(
    `agentProcessRegistry: killing ${pids.length} process group(s) of agent ${agentId} with ${signal}`,
  );
  await Promise.all(pids.map((pid) => killProcessGroup_2(pid, signal)));
  return pids;
}
//@ chunk-5xgkngpb.js:267079-267127 placement
/**
 * 把 agent 加入“待停止”集合。
 */
function markAgentStopPending(agentId) {
  getTaskLoopRegistry().stopPendingAgentIds.add(agentId);
}
//@ chunk-5xgkngpb.js:267127-267178 placement
/**
 * 从“待停止”集合中移除 agent。
 */
function clearAgentStopPending(agentId) {
  getTaskLoopRegistry().stopPendingAgentIds.delete(agentId);
}
//@ chunk-5xgkngpb.js:267178-267232 placement
/**
 * 判断 agent 是否在“待停止”集合里。
 */
function isAgentStopPending(agentId) {
  return getTaskLoopRegistry().stopPendingAgentIds.has(agentId);
}
//@ chunk-5xgkngpb.js:267232-267254 placement
/**
 * 停止超时后升级的默认时长（10 秒）。
 */
var DEFAULT_ESCALATION_MS = 1e4;
var DEFAULT_OVERDUE_MS = 30000;
//@ chunk-5xgkngpb.js:267254-267736 placement
/**
 * 停止任务后安排升级：超时仍未结束则中止控制器并杀进程组，过久仍未结束时记录。
 */
function scheduleKillEscalation(taskId, extraAgentIds = [], options = {}) {
  if (isTaskLoopSettled(taskId)) return;
  if (options.expectedLoopToken !== undefined && getTaskLoop(taskId) !== options.expectedLoopToken) return;
  let taskLoopRegistry = getTaskLoopRegistry();
  clearEscalation(taskLoopRegistry, taskId);
  let escalationMs = options.escalationMs ?? DEFAULT_ESCALATION_MS;
  let overdueMs = options.overdueMs ?? DEFAULT_OVERDUE_MS;
  let agentIds = new Set([...taskAgentIds(taskId), ...extraAgentIds]);
  for (let agentId of agentIds) markAgentStopPending(agentId);
  let escalation = {
    taskId,
    agentIds,
    timers: [],
    loopToken: getTaskLoop(taskId),
  };
  taskLoopRegistry.pendingEscalationsByTaskId.set(taskId, escalation);
  onTaskLoopSettled(taskId, () => {
    for (let agentId of escalation.agentIds) clearAgentStopPending(agentId);
    clearEscalation(taskLoopRegistry, taskId);
  });
  let timer = setTimeout(escalateKill, escalationMs, taskLoopRegistry, escalation, escalationMs);
  timer.unref();
  escalation.timers.push(timer);
  let timer_2 = setTimeout(reportKillOverdue, overdueMs, taskId);
  timer_2.unref();
  escalation.timers.push(timer_2);
}
//@ chunk-5xgkngpb.js:267736-268104 placement
/**
 * 任务停止超时：中止控制器并杀掉相关代理的进程组。
 */
function escalateKill(taskLoopRegistry, escalation, escalationMs) {
  let { taskId } = escalation;
  if (isTaskLoopSettled(taskId) || getTaskLoop(taskId) !== escalation.loopToken) return;
  for (let agentId of taskAgentIds(taskId)) {
    escalation.agentIds.add(agentId);
    markAgentStopPending(agentId);
  }
  for (let controller of liveAgentControllers(taskId))
    controller.abort(new DOMException("workflow-abort", "AbortError"));
  for (let agentId of escalation.agentIds)
    trackProcessSweep(taskLoopRegistry, killAgentProcessGroups(agentId));
  logForDebugging(
    `killEscalation: task ${taskId} still unsettled ${escalationMs}ms after kill; killed process groups of ${escalation.agentIds.size} agent(s)`,
    {
      level: "warn",
    },
  );
}
//@ chunk-5xgkngpb.js:268104-268366 placement
/**
 * 任务循环长时间未结束时记录。
 */
function reportKillOverdue(taskId) {
  if (isTaskLoopSettled(taskId)) return;
  logFeatureSad("task_kill_unsettled_overdue", "loop_never_settled");
  logForDebugging(
    `killEscalation: task ${taskId} loop never settled after kill \u2014 record retained as its stop handle; TaskStop re-fires, session restart is the final recovery`,
    {
      level: "warn",
    },
  );
}
//@ chunk-5xgkngpb.js:268366-268516 placement
/**
 * 取消任务的升级计时器。
 */
function clearEscalation(taskLoopRegistry, taskId) {
  let escalation = taskLoopRegistry.pendingEscalationsByTaskId.get(taskId);
  if (!escalation) return;
  for (let timer of escalation.timers) clearTimeout(timer);
  taskLoopRegistry.pendingEscalationsByTaskId.delete(taskId);
}
//@ chunk-5xgkngpb.js:268516-268614 placement
/**
 * 把进行中的进程清理任务记入集合，完成后移除。
 */
function trackProcessSweep(taskLoopRegistry, sweepPromise) {
  taskLoopRegistry.inFlightProcessSweeps.add(sweepPromise);
  sweepPromise.finally(() => taskLoopRegistry.inFlightProcessSweeps.delete(sweepPromise));
}
//@ chunk-5xgkngpb.js:268614-268642 placement
/**
 * 退出时登记一次进程清理任务。
 */
function trackExitProcessSweep(sweepPromise) {
  trackProcessSweep(getTaskLoopRegistry(), sweepPromise);
}
//@ chunk-5xgkngpb.js:268642-268934 placement
/**
 * 退出时立即杀掉所有待升级任务的进程并等待清理完成。
 */
async function killPendingEscalations() {
  let taskLoopRegistry = getTaskLoopRegistry();
  for (let escalation of taskLoopRegistry.pendingEscalationsByTaskId.values()) {
    if (isTaskLoopSettled(escalation.taskId) || getTaskLoop(escalation.taskId) !== escalation.loopToken)
      continue;
    for (let agentId of new Set([...escalation.agentIds, ...taskAgentIds(escalation.taskId)]))
      trackProcessSweep(taskLoopRegistry, killAgentProcessGroups(agentId));
  }
  while (taskLoopRegistry.inFlightProcessSweeps.size > 0)
    await Promise.all([...taskLoopRegistry.inFlightProcessSweeps]);
}
export {
  scheduleKillEscalation,
  isAgentStopPending,
  registerAgentProcess,
  clearAgentStopPending,
  killPendingEscalations,
  trackExitProcessSweep,
  killAgentProcessGroups,
};
