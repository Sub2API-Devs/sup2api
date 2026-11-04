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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-6vnxsn99.js:23110-23121 placement
/**
 * 追加列表（消息等）保留的条数上限。
 */
var MAX_APPENDED_ENTRIES = 50;
//@ chunk-6vnxsn99.js:23121-23253 placement
/**
 * 追加并保留最近若干项。
 */
function appendBounded(messages, message) {
  if (messages === undefined || messages.length === 0) return [message];
  if (messages.length >= MAX_APPENDED_ENTRIES) {
    let sliced = messages.slice(-(MAX_APPENDED_ENTRIES - 1));
    sliced.push(message);
    return sliced;
  }
  return [...messages, message];
}
//@ chunk-6vnxsn99.js:23253-23368 placement
/**
 * 去掉同 uuid 项后追加。
 */
function appendReplacingUuid(messages, message) {
  let baseMessages =
    messages === undefined || messages.every((existing) => existing.uuid !== message.uuid)
      ? messages
      : messages.filter((existing) => existing.uuid !== message.uuid);
  return appendBounded(baseMessages, message);
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
function isTaskOwnedBy(task, stoppedOwnerId, allTasks, isCascadeStopExempt) {
  if (
    isCascadeStopExempt !== undefined &&
    "agentId" in task &&
    typeof task.agentId === "string" &&
    isCascadeStopExempt(task.agentId)
  )
    return false;
  let visitedAgentIds = new Set();
  let parentAgentId =
    "parentAgentId" in task && typeof task.parentAgentId === "string" ? task.parentAgentId : undefined;
  while (parentAgentId && !visitedAgentIds.has(parentAgentId)) {
    if (parentAgentId === stoppedOwnerId) return true;
    if (isCascadeStopExempt?.(parentAgentId)) return false;
    visitedAgentIds.add(parentAgentId);
    let ancestorTask = allTasks[parentAgentId];
    parentAgentId =
      ancestorTask !== undefined &&
      ancestorTask.type === "local_agent" &&
      !("forkWorker" in ancestorTask && ancestorTask.forkWorker === true) &&
      "parentAgentId" in ancestorTask &&
      typeof ancestorTask.parentAgentId === "string"
        ? ancestorTask.parentAgentId
        : undefined;
  }
  return false;
}
//@ chunk-6vnxsn99.js:24238-24535 placement
function taskParentAgentId(task, tasks) {
  let ownerAgentId;
  switch (task.type) {
    case "local_agent":
      ownerAgentId = task.parentAgentId;
      break;
    case "local_workflow":
      ownerAgentId = task.spawnerAgentId;
      break;
    case "local_bash":
    case "monitor_mcp":
    case "monitor_ws":
      ownerAgentId = task.agentId;
      break;
    default:
      return;
  }
  if (ownerAgentId === undefined) return;
  let parentTask = ownProperty(tasks, ownerAgentId);
  return parentTask?.type === "local_agent" && !isObserverAgentTask(parentTask) ? parentTask.id : undefined;
}
//@ chunk-6vnxsn99.js:24535-24622 placement
/**
 * 该任务是可等待的本地代理（非观察者）或本地工作流。
 */
function isWaitableAgentOrWorkflow(task) {
  if (task.type === "local_agent") return !isObserverAgentTask(task);
  return task.type === "local_workflow";
}
//@ chunk-6vnxsn99.js:24772-24842 placement
function isAwaitedAgentTask(task) {
  return task.type === "local_agent" && task.awaitedByCaller === true;
}
//@ chunk-6vnxsn99.js:24842-24900 placement
function isParkedMcpTask(task) {
  return task.type === "mcp_task" && task.parked === true;
}
//@ chunk-6vnxsn99.js:24900-24962 placement
function isHoldCappedMcpTask(task) {
  return task.type === "mcp_task" && task.holdCapped === true;
}
//@ chunk-6vnxsn99.js:24962-25000 placement
function isHeldMcpTask(task) {
  return isParkedMcpTask(task) || isHoldCappedMcpTask(task);
}
//@ chunk-6vnxsn99.js:25000-25128 placement
function isMonitorShellTask(task) {
  return (
    (task.type === "local_bash" && task.kind === "monitor") ||
    task.type === "monitor_mcp" ||
    (task.type === "monitor_ws" && task.ambient !== true)
  );
}
//@ chunk-6vnxsn99.js:25128-25236 placement
function isBackgroundedShellTask(task) {
  return (
    task.type === "local_bash" &&
    task.isBackgrounded === true &&
    task.kind !== "monitor" &&
    task.agentId === undefined
  );
}
//@ chunk-6vnxsn99.js:25236-25324 placement
/**
 * 环境监视任务且帧不是显式开启。
 */
function isAmbientFrameTask(task) {
  return task.type === "monitor_ws" && task.ambient === true && task.frameLive?.explicit !== true;
}
//@ chunk-6vnxsn99.js:25324-25353 placement
/**
 * 即 isAmbientFrameTask（对外别名）。
 */
function isAmbientTask(task) {
  return isAmbientFrameTask(task);
}
//@ chunk-6vnxsn99.js:25353-25436 placement
function skipsTranscript(task) {
  return task.skipTranscript === true || (task.type === "monitor_ws" && task.ambient === true);
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
function isWorkflowTask(task) {
  return task?.type === "local_workflow";
}
//@ chunk-6vnxsn99.js:25820-25919 placement
var AGENT_TASK_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-6vnxsn99.js:25820", () => {
  AGENT_TASK_TYPES = new Set([
    "local_agent",
    "in_process_teammate",
    "local_workflow",
    "dream",
    "post_turn_memory",
  ]);
});
//@ chunk-6vnxsn99.js:61830-62167 placement
function isCompletedBackgroundAgent(task) {
  return (
    task.type === "local_agent" &&
    task.status === "completed" &&
    "agentType" in task &&
    task.agentType !== "main-session" &&
    "isBackgrounded" in task &&
    task.isBackgrounded === true &&
    !("isObserver" in task && task.isObserver === true) &&
    !("evictAfter" in task && task.evictAfter === 0) &&
    "chatEngaged" in task &&
    task.chatEngaged === true &&
    !("chatPinForfeited" in task && task.chatPinForfeited === true)
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
function isMainSessionTask(task) {
  return isPanelAgentTask(task) && task.evictAfter !== 0;
}
//@ chunk-6vnxsn99.js:70546-70639 placement
function isForegroundAgentTask(task, parentAgentId) {
  return (
    isLocalAgent(task) &&
    task.status === "running" &&
    !task.isBackgrounded &&
    task.parentAgentId === parentAgentId
  );
}
//@ chunk-6vnxsn99.js:70639-70676 placement
/**
 * 主线程前台代理任务（无 parentAgentId）。
 */
function isMainThreadForegroundAgent(task) {
  return isForegroundAgentTask(task, undefined);
}
//@ chunk-6vnxsn99.js:70676-70753 placement
/**
 * 主线程前台、已武装自动转后台且为直接调用的代理任务。
 */
function isArmedDirectForegroundAgent(task) {
  return isMainThreadForegroundAgent(task) && task.autoBackgroundArmed === true && task.directCall === true;
}
//@ chunk-6vnxsn99.js:70753-70902 placement
/**
 * 本地代理任务是否可接收通知。
 */
function canReceiveNotification(task, { userInitiated: options = false } = {}) {
  if (!isLocalAgent(task)) return false;
  if (options) return true;
  return task.stoppedByUser !== true && (task.status === "running" || task.status === "completed");
}
//@ chunk-6vnxsn99.js:70902-70952 placement
function userStopCount(task) {
  return isLocalAgent(task) ? (task.userStopCount ?? 0) : 0;
}
//@ chunk-6vnxsn99.js:70952-71064 placement
/**
 * 有当前用户停止计数下发起的待处理消息。
 */
function hasUserInitiatedPending(task, messages) {
  if (!isLocalAgent(task)) return false;
  let stopCount = userStopCount(task);
  return (messages ?? task.pendingMessages).some((message) => message.userInitiatedAt === stopCount);
}
//@ chunk-6vnxsn99.js:71064-71089 placement
var KILL_UNSETTLED = "kill-unsettled";
//@ chunk-6vnxsn99.js:71089-71114 placement
/**
 * 恒返回 false 的占位判断。
 */
function neverTrue(task) {
  return false;
}
//@ chunk-6vnxsn99.js:71114-71236 placement
/**
 * 释放主线程上下文并执行挂起的清理。
 */
function releaseMainThreadContext(agentId) {
  let { parkedTeardowns, mainThreadContexts } = getTaskRunState();
  mainThreadContexts.delete(agentId);
  let teardown = parkedTeardowns.get(agentId);
  if (teardown !== undefined) {
    parkedTeardowns.delete(agentId);
    teardown();
  }
}
//@ chunk-6vnxsn99.js:71236-71351 placement
/**
 * 本地代理已结束且无保活原因时释放。
 */
function releaseIfFinished(taskId, taskRegistry) {
  let task = taskRegistry.get(taskId);
  if (
    isLocalAgent(task) &&
    keepaliveReasons(task).size === 0 &&
    isTerminalTaskStatus(task.status) &&
    task.resuming !== true &&
    task.finalizing !== true
  )
    releaseMainThreadContext(taskId);
}
//@ chunk-6vnxsn99.js:71351-71401 placement
function keepaliveReasons(task) {
  return task.keepaliveReasons ?? new Set();
}
//@ chunk-6vnxsn99.js:71401-71537 placement = clearMcpClientConfig (0.39)
/**
 * 给本地代理任务的 keepaliveReasons 集合添加一个原因（已存在或不是本地代理任务则不变），防止任务被回收。与 MCP 无关，旧版名 clearMcpClientConfig 配错。
 */
function addAgentKeepaliveReason(taskId, reason, taskRegistry) {
  if (!taskId) return;
  taskRegistry.update(taskId, (task) => {
    if (!isLocalAgent(task) || keepaliveReasons(task).has(reason)) return task;
    return {
      ...task,
      keepaliveReasons: new Set(keepaliveReasons(task)).add(reason),
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
  isMainSessionTask,
  isPanelAgentTask,
  isCompletedBackgroundAgent,
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
