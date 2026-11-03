/**
 * tasks/taskKinds.ts
 *
 * 2.1.316 新增：任务种类判定、标签、所属代理与中止控制器。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6vnxsn99.js (37)
 * attribution: placement 37
 */
import { ownProperty } from "../utils/git/gitLanes.js";
import { isObserverAgentTask } from "./LocalAgentTask/LocalAgentTask.js";
import { isTeammateAwaitingInput } from "../utils/inProcessTeammateHelpers.js";
import { isLocalAgent } from "../state/teammateViewHelpers.js";
import { getTaskRunState } from "../utils/task/taskNotifications.js";
import { isTerminalTaskStatus } from "./taskStatus.js";

//@ chunk-6vnxsn99.js:23110-23121 placement
var AVr = 50;
/**
 * 追加并保留最近若干项。
 */
//@ chunk-6vnxsn99.js:23121-23253 placement
function appendBounded(e, n) {
  if (e === void 0 || e.length === 0) return [n];
  if (e.length >= AVr) {
    let sliced = e.slice(-(AVr - 1));
    return (sliced.push(n), sliced);
  }
  return [...e, n];
}
/**
 * 去掉同 uuid 项后追加。
 */
//@ chunk-6vnxsn99.js:23253-23368 placement
function appendReplacingUuid(e, n) {
  let r = e === void 0 || e.every((o) => o.uuid !== n.uuid) ? e : e.filter((o) => o.uuid !== n.uuid);
  return appendBounded(r, n);
}
//@ chunk-6vnxsn99.js:23368-23682 placement
var TASK_KIND_LABELS = {
  local_agent: "subagent",
  local_workflow: "workflow",
  local_bash: "shell",
  monitor_mcp: "monitor",
  monitor_ws: "monitor",
  mcp_task: "MCP task",
  in_process_teammate: "teammate",
  dream: "dream",
  auto_mode_scan: "auto-mode scan",
  local_memory_import: "memory import",
  post_turn_memory: "memory save",
  remote_agent: "cloud session",
};
//@ chunk-6vnxsn99.js:23682-23715 placement
function taskKindLabel(e) {
  return TASK_KIND_LABELS[e] ?? e;
}
//@ chunk-6vnxsn99.js:23797-24238 placement
function isTaskOwnedBy(e, n, r, o) {
  if (o !== void 0 && "agentId" in e && typeof e.agentId === "string" && o(e.agentId)) return !1;
  let s = new Set(),
    a = "parentAgentId" in e && typeof e.parentAgentId === "string" ? e.parentAgentId : void 0;
  while (a && !s.has(a)) {
    if (a === n) return !0;
    if (o?.(a)) return !1;
    s.add(a);
    let u = r[a];
    a =
      u !== void 0 &&
      u.type === "local_agent" &&
      !("forkWorker" in u && u.forkWorker === !0) &&
      "parentAgentId" in u &&
      typeof u.parentAgentId === "string"
        ? u.parentAgentId
        : void 0;
  }
  return !1;
}
//@ chunk-6vnxsn99.js:24238-24535 placement
function taskParentAgentId(e, n) {
  let r;
  switch (e.type) {
    case "local_agent":
      r = e.parentAgentId;
      break;
    case "local_workflow":
      r = e.spawnerAgentId;
      break;
    case "local_bash":
    case "monitor_mcp":
    case "monitor_ws":
      r = e.agentId;
      break;
    default:
      return;
  }
  if (r === void 0) return;
  let o = ownProperty(n, r);
  return o?.type === "local_agent" && !isObserverAgentTask(o) ? o.id : void 0;
}
//@ chunk-6vnxsn99.js:24535-24622 placement
function Lq(e) {
  if (e.type === "local_agent") return !isObserverAgentTask(e);
  return e.type === "local_workflow";
}
//@ chunk-6vnxsn99.js:24772-24842 placement
function isAwaitedAgentTask(e) {
  return e.type === "local_agent" && e.awaitedByCaller === !0;
}
//@ chunk-6vnxsn99.js:24842-24900 placement
function isParkedMcpTask(e) {
  return e.type === "mcp_task" && e.parked === !0;
}
//@ chunk-6vnxsn99.js:24900-24962 placement
function isHoldCappedMcpTask(e) {
  return e.type === "mcp_task" && e.holdCapped === !0;
}
//@ chunk-6vnxsn99.js:24962-25000 placement
function isHeldMcpTask(e) {
  return isParkedMcpTask(e) || isHoldCappedMcpTask(e);
}
//@ chunk-6vnxsn99.js:25000-25128 placement
function isMonitorShellTask(e) {
  return (
    (e.type === "local_bash" && e.kind === "monitor") ||
    e.type === "monitor_mcp" ||
    (e.type === "monitor_ws" && e.ambient !== !0)
  );
}
//@ chunk-6vnxsn99.js:25128-25236 placement
function isBackgroundedShellTask(e) {
  return e.type === "local_bash" && e.isBackgrounded === !0 && e.kind !== "monitor" && e.agentId === void 0;
}
//@ chunk-6vnxsn99.js:25236-25324 placement
function Jn(e) {
  return e.type === "monitor_ws" && e.ambient === !0 && e.frameLive?.explicit !== !0;
}
//@ chunk-6vnxsn99.js:25324-25353 placement
function SNe(e) {
  return Jn(e);
}
//@ chunk-6vnxsn99.js:25353-25436 placement
function skipsTranscript(e) {
  return e.skipTranscript === !0 || (e.type === "monitor_ws" && e.ambient === !0);
}
//@ chunk-6vnxsn99.js:25436-25501 placement = getSelectableBackgroundTasks (0.813)
function getSelectableBackgroundTasks(e) {
  return e.type === "local_agent" ? e.agentType : void 0;
}
//@ chunk-6vnxsn99.js:25501-25574 placement = _temp6 (0.765)
function isIdleTeammateTask(t_1) {
  return t_1.type === "in_process_teammate" && t_1.isIdle && !isTeammateAwaitingInput(t_1);
}
//@ chunk-6vnxsn99.js:25574-25770 placement
function taskAbortController(e) {
  switch (e.type) {
    case "local_agent":
      return e.abortController?.signal.aborted === !0;
    case "in_process_teammate":
      return e.currentWorkAbortController?.signal.aborted === !0;
    default:
      return !1;
  }
}
//@ chunk-6vnxsn99.js:25770-25820 placement
function isWorkflowTask(e) {
  return e?.type === "local_workflow";
}
//@ chunk-6vnxsn99.js:25820-25919 placement
var AGENT_TASK_TYPES = new Set([
  "local_agent",
  "in_process_teammate",
  "local_workflow",
  "dream",
  "post_turn_memory",
]);
//@ chunk-6vnxsn99.js:61830-62167 placement
function isCompletedBackgroundAgent(e) {
  return (
    e.type === "local_agent" &&
    e.status === "completed" &&
    "agentType" in e &&
    e.agentType !== "main-session" &&
    "isBackgrounded" in e &&
    e.isBackgrounded === !0 &&
    !("isObserver" in e && e.isObserver === !0) &&
    !("evictAfter" in e && e.evictAfter === 0) &&
    "chatEngaged" in e &&
    e.chatEngaged === !0 &&
    !("chatPinForfeited" in e && e.chatPinForfeited === !0)
  );
}
/**
 * 是否是面板子代理任务：本地代理、非 main-session、非 fork worker。
 */
//@ chunk-6vnxsn99.js:70426-70499 placement = isPanelAgentTask (0.819)
function isPanelAgentTask(task) {
  return isLocalAgent(task) && task.agentType !== "main-session" && !task.forkWorker;
}
//@ chunk-6vnxsn99.js:70499-70546 placement
function isMainSessionTask(e) {
  return isPanelAgentTask(e) && e.evictAfter !== 0;
}
//@ chunk-6vnxsn99.js:70546-70639 placement
function isForegroundAgentTask(e, n) {
  return isLocalAgent(e) && e.status === "running" && !e.isBackgrounded && e.parentAgentId === n;
}
//@ chunk-6vnxsn99.js:70639-70676 placement
function Ghn(e) {
  return isForegroundAgentTask(e, void 0);
}
//@ chunk-6vnxsn99.js:70676-70753 placement
function fQs(e) {
  return Ghn(e) && e.autoBackgroundArmed === !0 && e.directCall === !0;
}
/**
 * 本地代理任务是否可接收通知。
 */
//@ chunk-6vnxsn99.js:70753-70902 placement
function canReceiveNotification(e, { userInitiated: n = !1 } = {}) {
  if (!isLocalAgent(e)) return !1;
  if (n) return !0;
  return e.stoppedByUser !== !0 && (e.status === "running" || e.status === "completed");
}
//@ chunk-6vnxsn99.js:70902-70952 placement
function userStopCount(e) {
  return isLocalAgent(e) ? (e.userStopCount ?? 0) : 0;
}
/**
 * 有当前用户停止计数下发起的待处理消息。
 */
//@ chunk-6vnxsn99.js:70952-71064 placement
function hasUserInitiatedPending(e, n) {
  if (!isLocalAgent(e)) return !1;
  let r = userStopCount(e);
  return (n ?? e.pendingMessages).some((o) => o.userInitiatedAt === r);
}
//@ chunk-6vnxsn99.js:71064-71089 placement
var KILL_UNSETTLED = "kill-unsettled";
//@ chunk-6vnxsn99.js:71089-71114 placement
function Z2o(e) {
  return !1;
}
/**
 * 释放主线程上下文并执行挂起的清理。
 */
//@ chunk-6vnxsn99.js:71114-71236 placement
function releaseMainThreadContext(e) {
  let { parkedTeardowns: parkedTeardowns, mainThreadContexts: mainThreadContexts } = getTaskRunState();
  mainThreadContexts.delete(e);
  let o = parkedTeardowns.get(e);
  if (o !== void 0) (parkedTeardowns.delete(e), o());
}
/**
 * 本地代理已结束且无保活原因时释放。
 */
//@ chunk-6vnxsn99.js:71236-71351 placement
function releaseIfFinished(e, n) {
  let r = n.get(e);
  if (
    isLocalAgent(r) &&
    keepaliveReasons(r).size === 0 &&
    isTerminalTaskStatus(r.status) &&
    r.resuming !== !0 &&
    r.finalizing !== !0
  )
    releaseMainThreadContext(e);
}
//@ chunk-6vnxsn99.js:71351-71401 placement
function keepaliveReasons(e) {
  return e.keepaliveReasons ?? new Set();
}
/**
 * 给本地代理任务的 keepaliveReasons 集合添加一个原因（已存在或不是本地代理任务则不变），防止任务被回收。与 MCP 无关，旧版名 clearMcpClientConfig 配错。
 */
//@ chunk-6vnxsn99.js:71401-71537 placement = clearMcpClientConfig (0.39)
function addAgentKeepaliveReason(e, n, r) {
  if (!e) return;
  r.update(e, (o) => {
    if (!isLocalAgent(o) || keepaliveReasons(o).has(n)) return o;
    return { ...o, keepaliveReasons: new Set(keepaliveReasons(o)).add(n) };
  });
}

export {
  addAgentKeepaliveReason,
  keepaliveReasons,
  releaseIfFinished,
  userStopCount,
  isForegroundAgentTask,
  hasUserInitiatedPending,
  canReceiveNotification,
  isPanelAgentTask,
  isCompletedBackgroundAgent,
  isMainSessionTask,
  AGENT_TASK_TYPES,
  releaseMainThreadContext,
  isTaskOwnedBy,
  taskAbortController,
  KILL_UNSETTLED,
  getSelectableBackgroundTasks,
  SNe,
  appendBounded,
  isIdleTeammateTask,
  isWorkflowTask,
  taskKindLabel,
  isHoldCappedMcpTask,
  taskParentAgentId,
  skipsTranscript,
  isAwaitedAgentTask,
  AVr,
  appendReplacingUuid,
  isMonitorShellTask,
  Z2o,
  Lq,
  TASK_KIND_LABELS,
  Ghn,
  fQs,
  isHeldMcpTask,
  isBackgroundedShellTask,
  isParkedMcpTask,
};
