/**
 * utils/agentProcessRegistry.ts
 *
 * 2.1.316 新增：代理进程登记
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (14)
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

//@ chunk-e6aww6q8.js:267146-267429 placement
/**
 * 登记某代理的子进程，返回注销函数。
 */
function registerAgentProcess(owningAgentId, childProcess) {
  let pid = childProcess.pid;
  if (owningAgentId === undefined || pid === undefined || !Number.isInteger(pid) || pid <= 1) return () => {};
  let { liveProcessesByAgentId } = getTaskLoopRegistry();
  let h = liveProcessesByAgentId.get(owningAgentId);
  if (!h) {
    h = new Set();
    liveProcessesByAgentId.set(owningAgentId, h);
  }
  h.add(childProcess);
  let y = false;
  return () => {
    if (y) return;
    y = true;
    let S = liveProcessesByAgentId.get(owningAgentId);
    if (!S) return;
    S.delete(childProcess);
    if (S.size === 0) liveProcessesByAgentId.delete(owningAgentId);
  };
}
//@ chunk-e6aww6q8.js:267429-267587 placement
/**
 * 代理仍在运行的子进程 pid。
 */
function liveAgentPids(e) {
  let n = [];
  for (let r of getTaskLoopRegistry().liveProcessesByAgentId.get(e) ?? [])
    if (r.pid !== undefined && r.exitCode === null && r.signalCode === null) n.push(r.pid);
  return n;
}
//@ chunk-e6aww6q8.js:267587-267795 placement
/**
 * 杀掉代理所有子进程组。
 */
async function killAgentProcessGroups(e, n = "SIGKILL") {
  let r = liveAgentPids(e);
  if (r.length === 0) return r;
  logForDebugging(`agentProcessRegistry: killing ${r.length} process group(s) of agent ${e} with ${n}`);
  await Promise.all(r.map((s) => killProcessGroup_2(s, n)));
  return r;
}
//@ chunk-e6aww6q8.js:267795-267843 placement
/**
 * 把 agent 加入“待停止”集合。
 */
function markAgentStopPending(e) {
  getTaskLoopRegistry().stopPendingAgentIds.add(e);
}
//@ chunk-e6aww6q8.js:267843-267894 placement
/**
 * 从“待停止”集合中移除 agent。
 */
function clearAgentStopPending(e) {
  getTaskLoopRegistry().stopPendingAgentIds.delete(e);
}
//@ chunk-e6aww6q8.js:267894-267948 placement
/**
 * 判断 agent 是否在“待停止”集合里。
 */
function isAgentStopPending(agentId) {
  return getTaskLoopRegistry().stopPendingAgentIds.has(agentId);
}
//@ chunk-e6aww6q8.js:267948-267970 placement
/**
 * 停止超时后升级的默认时长（10 秒）。
 */
var DEFAULT_ESCALATION_MS = 1e4;
var DEFAULT_OVERDUE_MS = 30000;
//@ chunk-e6aww6q8.js:267970-268452 placement
/**
 * 停止任务后安排升级：超时仍未结束则中止控制器并杀进程组，过久仍未结束时记录。
 */
function scheduleKillEscalation(e, n = [], r = {}) {
  if (isTaskLoopSettled(e)) return;
  if (r.expectedLoopToken !== undefined && getTaskLoop(e) !== r.expectedLoopToken) return;
  let taskLoopRegistry = getTaskLoopRegistry();
  clearEscalation(taskLoopRegistry, e);
  let escalationMs = r.escalationMs ?? DEFAULT_ESCALATION_MS;
  let overdueMs = r.overdueMs ?? DEFAULT_OVERDUE_MS;
  let S = new Set([...taskAgentIds(e), ...n]);
  for (let q of S) markAgentStopPending(q);
  let w = {
    taskId: e,
    agentIds: S,
    timers: [],
    loopToken: getTaskLoop(e),
  };
  taskLoopRegistry.pendingEscalationsByTaskId.set(e, w);
  onTaskLoopSettled(e, () => {
    for (let agentId of w.agentIds) clearAgentStopPending(agentId);
    clearEscalation(taskLoopRegistry, e);
  });
  let timer = setTimeout(escalateKill, escalationMs, taskLoopRegistry, w, escalationMs);
  timer.unref();
  w.timers.push(timer);
  let timer_2 = setTimeout(reportKillOverdue, overdueMs, e);
  timer_2.unref();
  w.timers.push(timer_2);
}
//@ chunk-e6aww6q8.js:268452-268820 placement
/**
 * 任务停止超时：中止控制器并杀掉相关代理的进程组。
 */
function escalateKill(e, n, r) {
  let { taskId } = n;
  if (isTaskLoopSettled(taskId) || getTaskLoop(taskId) !== n.loopToken) return;
  for (let h of taskAgentIds(taskId)) {
    n.agentIds.add(h);
    markAgentStopPending(h);
  }
  for (let h of liveAgentControllers(taskId)) h.abort(new DOMException("workflow-abort", "AbortError"));
  for (let agentId of n.agentIds) trackProcessSweep(e, killAgentProcessGroups(agentId));
  logForDebugging(
    `killEscalation: task ${taskId} still unsettled ${r}ms after kill; killed process groups of ${n.agentIds.size} agent(s)`,
    {
      level: "warn",
    },
  );
}
//@ chunk-e6aww6q8.js:268820-269082 placement
/**
 * 任务循环长时间未结束时记录。
 */
function reportKillOverdue(e) {
  if (isTaskLoopSettled(e)) return;
  logFeatureSad("task_kill_unsettled_overdue", "loop_never_settled");
  logForDebugging(
    `killEscalation: task ${e} loop never settled after kill \u2014 record retained as its stop handle; TaskStop re-fires, session restart is the final recovery`,
    {
      level: "warn",
    },
  );
}
//@ chunk-e6aww6q8.js:269082-269232 placement
/**
 * 取消任务的升级计时器。
 */
function clearEscalation(taskLoopRegistry, n) {
  let r = taskLoopRegistry.pendingEscalationsByTaskId.get(n);
  if (!r) return;
  for (let timer of r.timers) clearTimeout(timer);
  taskLoopRegistry.pendingEscalationsByTaskId.delete(n);
}
//@ chunk-e6aww6q8.js:269232-269330 placement
/**
 * 把进行中的进程清理任务记入集合，完成后移除。
 */
function trackProcessSweep(taskLoopRegistry, n) {
  taskLoopRegistry.inFlightProcessSweeps.add(n);
  n.finally(() => taskLoopRegistry.inFlightProcessSweeps.delete(n));
}
//@ chunk-e6aww6q8.js:269330-269358 placement
/**
 * 退出时登记一次进程清理任务。
 */
function trackExitProcessSweep(e) {
  trackProcessSweep(getTaskLoopRegistry(), e);
}
//@ chunk-e6aww6q8.js:269358-269650 placement
/**
 * 退出时立即杀掉所有待升级任务的进程并等待清理完成。
 */
async function killPendingEscalations() {
  let taskLoopRegistry = getTaskLoopRegistry();
  for (let n of taskLoopRegistry.pendingEscalationsByTaskId.values()) {
    if (isTaskLoopSettled(n.taskId) || getTaskLoop(n.taskId) !== n.loopToken) continue;
    for (let r of new Set([...n.agentIds, ...taskAgentIds(n.taskId)]))
      trackProcessSweep(taskLoopRegistry, killAgentProcessGroups(r));
  }
  while (taskLoopRegistry.inFlightProcessSweeps.size > 0)
    await Promise.all([...taskLoopRegistry.inFlightProcessSweeps]);
}
export {
  clearAgentStopPending,
  isAgentStopPending,
  trackExitProcessSweep,
  killAgentProcessGroups,
  scheduleKillEscalation,
  killPendingEscalations,
  registerAgentProcess,
};
