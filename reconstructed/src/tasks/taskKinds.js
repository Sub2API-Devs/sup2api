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
/**
 * 追加列表（消息等）保留的条数上限。
 */
var MAX_APPENDED_ENTRIES = 50;
//@ chunk-6vnxsn99.js:23121-23253 placement
/**
 * 追加并保留最近若干项。
 */
function appendBounded(messages, n) {
  if (messages === undefined || messages.length === 0) return [n];
  if (messages.length >= MAX_APPENDED_ENTRIES) {
    let sliced = messages.slice(-(MAX_APPENDED_ENTRIES - 1));
    sliced.push(n);
    return sliced;
  }
  return [...messages, n];
}
//@ chunk-6vnxsn99.js:23253-23368 placement
/**
 * 去掉同 uuid 项后追加。
 */
function appendReplacingUuid(messages, message) {
  let r =
    messages === undefined || messages.every((o) => o.uuid !== message.uuid)
      ? messages
      : messages.filter((o) => o.uuid !== message.uuid);
  return appendBounded(r, message);
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
function taskKindLabel(type) {
  return TASK_KIND_LABELS[type] ?? type;
}
//@ chunk-6vnxsn99.js:23797-24238 placement
function isTaskOwnedBy(e, n, r, isCascadeStopExempt) {
  if (
    isCascadeStopExempt !== undefined &&
    "agentId" in e &&
    typeof e.agentId === "string" &&
    isCascadeStopExempt(e.agentId)
  )
    return false;
  let s = new Set();
  let parentAgentId =
    "parentAgentId" in e && typeof e.parentAgentId === "string" ? e.parentAgentId : undefined;
  while (parentAgentId && !s.has(parentAgentId)) {
    if (parentAgentId === n) return true;
    if (isCascadeStopExempt?.(parentAgentId)) return false;
    s.add(parentAgentId);
    let u = r[parentAgentId];
    parentAgentId =
      u !== undefined &&
      u.type === "local_agent" &&
      !("forkWorker" in u && u.forkWorker === true) &&
      "parentAgentId" in u &&
      typeof u.parentAgentId === "string"
        ? u.parentAgentId
        : undefined;
  }
  return false;
}
//@ chunk-6vnxsn99.js:24238-24535 placement
function taskParentAgentId(e, tasks) {
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
  if (r === undefined) return;
  let o = ownProperty(tasks, r);
  return o?.type === "local_agent" && !isObserverAgentTask(o) ? o.id : undefined;
}
//@ chunk-6vnxsn99.js:24535-24622 placement
/**
 * 该任务是可等待的本地代理（非观察者）或本地工作流。
 */
function isWaitableAgentOrWorkflow(e) {
  if (e.type === "local_agent") return !isObserverAgentTask(e);
  return e.type === "local_workflow";
}
//@ chunk-6vnxsn99.js:24772-24842 placement
function isAwaitedAgentTask(e) {
  return e.type === "local_agent" && e.awaitedByCaller === true;
}
//@ chunk-6vnxsn99.js:24842-24900 placement
function isParkedMcpTask(e) {
  return e.type === "mcp_task" && e.parked === true;
}
//@ chunk-6vnxsn99.js:24900-24962 placement
function isHoldCappedMcpTask(task) {
  return task.type === "mcp_task" && task.holdCapped === true;
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
    (e.type === "monitor_ws" && e.ambient !== true)
  );
}
//@ chunk-6vnxsn99.js:25128-25236 placement
function isBackgroundedShellTask(e) {
  return (
    e.type === "local_bash" && e.isBackgrounded === true && e.kind !== "monitor" && e.agentId === undefined
  );
}
//@ chunk-6vnxsn99.js:25236-25324 placement
/**
 * 环境监视任务且帧不是显式开启。
 */
function isAmbientFrameTask(e) {
  return e.type === "monitor_ws" && e.ambient === true && e.frameLive?.explicit !== true;
}
//@ chunk-6vnxsn99.js:25324-25353 placement
/**
 * 即 isAmbientFrameTask（对外别名）。
 */
function isAmbientTask(e) {
  return isAmbientFrameTask(e);
}
//@ chunk-6vnxsn99.js:25353-25436 placement
function skipsTranscript(e) {
  return e.skipTranscript === true || (e.type === "monitor_ws" && e.ambient === true);
}
//@ chunk-6vnxsn99.js:25436-25501 placement = getSelectableBackgroundTasks (0.813)
function getSelectableBackgroundTasks(task) {
  return task.type === "local_agent" ? task.agentType : undefined;
}
//@ chunk-6vnxsn99.js:25501-25574 placement = _temp6 (0.765)
function isIdleTeammateTask(t_1) {
  return t_1.type === "in_process_teammate" && t_1.isIdle && !isTeammateAwaitingInput(t_1);
}
//@ chunk-6vnxsn99.js:25574-25770 placement
function taskAbortController(task) {
  switch (task.type) {
    case "local_agent":
      return task.abortController?.signal.aborted === true;
    case "in_process_teammate":
      return task.currentWorkAbortController?.signal.aborted === true;
    default:
      return false;
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
    e.isBackgrounded === true &&
    !("isObserver" in e && e.isObserver === true) &&
    !("evictAfter" in e && e.evictAfter === 0) &&
    "chatEngaged" in e &&
    e.chatEngaged === true &&
    !("chatPinForfeited" in e && e.chatPinForfeited === true)
  );
}
//@ chunk-6vnxsn99.js:70426-70499 placement = isPanelAgentTask (0.819)
/**
 * 是否是面板子代理任务：本地代理、非 main-session、非 fork worker。
 */
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
/**
 * 主线程前台代理任务（无 parentAgentId）。
 */
function isMainThreadForegroundAgent(e) {
  return isForegroundAgentTask(e, undefined);
}
//@ chunk-6vnxsn99.js:70676-70753 placement
/**
 * 主线程前台、已武装自动转后台且为直接调用的代理任务。
 */
function isArmedDirectForegroundAgent(e) {
  return isMainThreadForegroundAgent(e) && e.autoBackgroundArmed === true && e.directCall === true;
}
//@ chunk-6vnxsn99.js:70753-70902 placement
/**
 * 本地代理任务是否可接收通知。
 */
function canReceiveNotification(e, { userInitiated: n = false } = {}) {
  if (!isLocalAgent(e)) return false;
  if (n) return true;
  return e.stoppedByUser !== true && (e.status === "running" || e.status === "completed");
}
//@ chunk-6vnxsn99.js:70902-70952 placement
function userStopCount(e) {
  return isLocalAgent(e) ? (e.userStopCount ?? 0) : 0;
}
//@ chunk-6vnxsn99.js:70952-71064 placement
/**
 * 有当前用户停止计数下发起的待处理消息。
 */
function hasUserInitiatedPending(e, n) {
  if (!isLocalAgent(e)) return false;
  let r = userStopCount(e);
  return (n ?? e.pendingMessages).some((o) => o.userInitiatedAt === r);
}
//@ chunk-6vnxsn99.js:71064-71089 placement
var KILL_UNSETTLED = "kill-unsettled";
//@ chunk-6vnxsn99.js:71089-71114 placement
/**
 * 恒返回 false 的占位判断。
 */
function neverTrue(e) {
  return false;
}
//@ chunk-6vnxsn99.js:71114-71236 placement
/**
 * 释放主线程上下文并执行挂起的清理。
 */
function releaseMainThreadContext(e) {
  let { parkedTeardowns, mainThreadContexts } = getTaskRunState();
  mainThreadContexts.delete(e);
  let o = parkedTeardowns.get(e);
  if (o !== undefined) {
    parkedTeardowns.delete(e);
    o();
  }
}
//@ chunk-6vnxsn99.js:71236-71351 placement
/**
 * 本地代理已结束且无保活原因时释放。
 */
function releaseIfFinished(e, taskRegistry) {
  let r = taskRegistry.get(e);
  if (
    isLocalAgent(r) &&
    keepaliveReasons(r).size === 0 &&
    isTerminalTaskStatus(r.status) &&
    r.resuming !== true &&
    r.finalizing !== true
  )
    releaseMainThreadContext(e);
}
//@ chunk-6vnxsn99.js:71351-71401 placement
function keepaliveReasons(e) {
  return e.keepaliveReasons ?? new Set();
}
//@ chunk-6vnxsn99.js:71401-71537 placement = clearMcpClientConfig (0.39)
/**
 * 给本地代理任务的 keepaliveReasons 集合添加一个原因（已存在或不是本地代理任务则不变），防止任务被回收。与 MCP 无关，旧版名 clearMcpClientConfig 配错。
 */
function addAgentKeepaliveReason(e, n, taskRegistry) {
  if (!e) return;
  taskRegistry.update(e, (o) => {
    if (!isLocalAgent(o) || keepaliveReasons(o).has(n)) return o;
    return {
      ...o,
      keepaliveReasons: new Set(keepaliveReasons(o)).add(n),
    };
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
  isAmbientTask,
  appendBounded,
  isIdleTeammateTask,
  isWorkflowTask,
  taskKindLabel,
  isHoldCappedMcpTask,
  taskParentAgentId,
  skipsTranscript,
  isAwaitedAgentTask,
  MAX_APPENDED_ENTRIES,
  appendReplacingUuid,
  isMonitorShellTask,
  neverTrue,
  isWaitableAgentOrWorkflow,
  TASK_KIND_LABELS,
  isMainThreadForegroundAgent,
  isArmedDirectForegroundAgent,
  isHeldMcpTask,
  isBackgroundedShellTask,
  isParkedMcpTask,
};
