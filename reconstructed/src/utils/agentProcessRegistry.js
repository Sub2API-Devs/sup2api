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

/**
 * 登记某代理的子进程，返回注销函数。
 */
//@ chunk-e6aww6q8.js:267146-267429 placement
function registerAgentProcess(e, n) {
  let pid = n.pid;
  if (e === void 0 || pid === void 0 || !Number.isInteger(pid) || pid <= 1) return () => {};
  let { liveProcessesByAgentId: liveProcessesByAgentId } = getTaskLoopRegistry(),
    h = liveProcessesByAgentId.get(e);
  if (!h) ((h = new Set()), liveProcessesByAgentId.set(e, h));
  h.add(n);
  let y = !1;
  return () => {
    if (y) return;
    y = !0;
    let S = liveProcessesByAgentId.get(e);
    if (!S) return;
    if ((S.delete(n), S.size === 0)) liveProcessesByAgentId.delete(e);
  };
}
/**
 * 代理仍在运行的子进程 pid。
 */
//@ chunk-e6aww6q8.js:267429-267587 placement
function liveAgentPids(e) {
  let n = [];
  for (let r of getTaskLoopRegistry().liveProcessesByAgentId.get(e) ?? [])
    if (r.pid !== void 0 && r.exitCode === null && r.signalCode === null) n.push(r.pid);
  return n;
}
/**
 * 杀掉代理所有子进程组。
 */
//@ chunk-e6aww6q8.js:267587-267795 placement
async function killAgentProcessGroups(e, n = "SIGKILL") {
  let r = liveAgentPids(e);
  if (r.length === 0) return r;
  return (
    logForDebugging(`agentProcessRegistry: killing ${r.length} process group(s) of agent ${e} with ${n}`),
    await Promise.all(r.map((s) => killProcessGroup_2(s, n))),
    r
  );
}
//@ chunk-e6aww6q8.js:267795-267843 placement
function pHe(e) {
  getTaskLoopRegistry().stopPendingAgentIds.add(e);
}
//@ chunk-e6aww6q8.js:267843-267894 placement
function rBr(e) {
  getTaskLoopRegistry().stopPendingAgentIds.delete(e);
}
//@ chunk-e6aww6q8.js:267894-267948 placement
function hW(e) {
  return getTaskLoopRegistry().stopPendingAgentIds.has(e);
}
//@ chunk-e6aww6q8.js:267948-267970 placement
var Dco = 1e4,
  Lco = 30000;
/**
 * 停止任务后安排升级：超时仍未结束则中止控制器并杀进程组，过久仍未结束时记录。
 */
//@ chunk-e6aww6q8.js:267970-268452 placement
function scheduleKillEscalation(e, n = [], r = {}) {
  if (isTaskLoopSettled(e)) return;
  if (r.expectedLoopToken !== void 0 && getTaskLoop(e) !== r.expectedLoopToken) return;
  let s = getTaskLoopRegistry();
  clearEscalation(s, e);
  let h = r.escalationMs ?? Dco,
    y = r.overdueMs ?? Lco,
    S = new Set([...taskAgentIds(e), ...n]);
  for (let q of S) pHe(q);
  let w = { taskId: e, agentIds: S, timers: [], loopToken: getTaskLoop(e) };
  (s.pendingEscalationsByTaskId.set(e, w),
    onTaskLoopSettled(e, () => {
      for (let agentId of w.agentIds) rBr(agentId);
      clearEscalation(s, e);
    }));
  let L = setTimeout(escalateKill, h, s, w, h);
  (L.unref(), w.timers.push(L));
  let G = setTimeout(reportKillOverdue, y, e);
  (G.unref(), w.timers.push(G));
}
/**
 * 任务停止超时：中止控制器并杀掉相关代理的进程组。
 */
//@ chunk-e6aww6q8.js:268452-268820 placement
function escalateKill(e, n, r) {
  let { taskId: taskId } = n;
  if (isTaskLoopSettled(taskId) || getTaskLoop(taskId) !== n.loopToken) return;
  for (let h of taskAgentIds(taskId)) (n.agentIds.add(h), pHe(h));
  for (let h of liveAgentControllers(taskId)) h.abort(new DOMException("workflow-abort", "AbortError"));
  for (let agentId of n.agentIds) mHe(e, killAgentProcessGroups(agentId));
  logForDebugging(
    `killEscalation: task ${taskId} still unsettled ${r}ms after kill; killed process groups of ${n.agentIds.size} agent(s)`,
    { level: "warn" },
  );
}
/**
 * 任务循环长时间未结束时记录。
 */
//@ chunk-e6aww6q8.js:268820-269082 placement
function reportKillOverdue(e) {
  if (isTaskLoopSettled(e)) return;
  (logFeatureSad("task_kill_unsettled_overdue", "loop_never_settled"),
    logForDebugging(
      `killEscalation: task ${e} loop never settled after kill \u2014 record retained as its stop handle; TaskStop re-fires, session restart is the final recovery`,
      { level: "warn" },
    ));
}
/**
 * 取消任务的升级计时器。
 */
//@ chunk-e6aww6q8.js:269082-269232 placement
function clearEscalation(e, n) {
  let r = e.pendingEscalationsByTaskId.get(n);
  if (!r) return;
  for (let timer of r.timers) clearTimeout(timer);
  e.pendingEscalationsByTaskId.delete(n);
}
//@ chunk-e6aww6q8.js:269232-269330 placement
function mHe(e, n) {
  (e.inFlightProcessSweeps.add(n), n.finally(() => e.inFlightProcessSweeps.delete(n)));
}
//@ chunk-e6aww6q8.js:269330-269358 placement
function p3n(e) {
  mHe(getTaskLoopRegistry(), e);
}
/**
 * 退出时立即杀掉所有待升级任务的进程并等待清理完成。
 */
//@ chunk-e6aww6q8.js:269358-269650 placement
async function killPendingEscalations() {
  let e = getTaskLoopRegistry();
  for (let n of e.pendingEscalationsByTaskId.values()) {
    if (isTaskLoopSettled(n.taskId) || getTaskLoop(n.taskId) !== n.loopToken) continue;
    for (let r of new Set([...n.agentIds, ...taskAgentIds(n.taskId)])) mHe(e, killAgentProcessGroups(r));
  }
  while (e.inFlightProcessSweeps.size > 0) await Promise.all([...e.inFlightProcessSweeps]);
}

export {
  rBr,
  hW,
  p3n,
  killAgentProcessGroups,
  scheduleKillEscalation,
  killPendingEscalations,
  registerAgentProcess,
};
