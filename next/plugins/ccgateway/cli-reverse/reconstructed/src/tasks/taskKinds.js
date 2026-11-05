/**
 * tasks/taskKinds.ts
 *
 * 2.1.316 新增：任务种类判定、标签、所属代理与中止控制器。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-01kgd7xg.js (40)
 * attribution: placement 39, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { codeModeAccepted } from "../utils/codeMode/accepted.js";
import { ownProperty } from "../utils/git/gitLanes.js";
import { isObserverAgentTask } from "./LocalAgentTask/LocalAgentTask.js";
import { isTeammateAwaitingInput } from "../utils/inProcessTeammateHelpers.js";
import { isLocalAgent } from "../state/teammateViewHelpers.js";
import { getTaskRunState } from "../utils/task/taskNotifications.js";
import { isTerminalTaskStatus } from "./taskStatus.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-01kgd7xg.js:22902-22913 placement
/**
 * 追加列表（消息等）保留的条数上限。
 */
var MAX_APPENDED_ENTRIES = 50;
//@ chunk-01kgd7xg.js:22913-23045 placement
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
//@ chunk-01kgd7xg.js:23045-23160 placement
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
//@ chunk-01kgd7xg.js:23160-23474 placement
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
//@ chunk-01kgd7xg.js:23474-23536 placement (2.1.88 match: isConnectionError, 1)
function taskKindLabel(err) {
  if (codeModeAccepted() && isLocalScriptTaskState(err)) return "code";
  return TASK_KIND_LABELS[err] ?? err;
}
//@ chunk-01kgd7xg.js:23536-23584 placement
/**
 * 判定任务类型是否为 local_script（仅当 Code 模式已接受时成立）；tasks/taskKinds 用它把该类型显示成 code。
 */
function isLocalScriptTaskState(type) {
  return codeModeAccepted() && type === "local_script";
}
//@ chunk-01kgd7xg.js:23584-23618 placement
/**
 * 按任务的 type 判定是否为 local_script；utils/task/framework 用它决定任务呈现。
 */
function isLocalScriptTask(task) {
  return isLocalScriptTaskState(task.type);
}
//@ chunk-01kgd7xg.js:23700-24141 placement
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
//@ chunk-01kgd7xg.js:24141-24438 placement
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
//@ chunk-01kgd7xg.js:24438-24525 placement
/**
 * 该任务是可等待的本地代理（非观察者）或本地工作流。
 */
function isWaitableAgentOrWorkflow(task) {
  if (task.type === "local_agent") return !isObserverAgentTask(task);
  return task.type === "local_workflow";
}
//@ chunk-01kgd7xg.js:24675-24745 placement
function isAwaitedAgentTask(task) {
  return task.type === "local_agent" && task.awaitedByCaller === true;
}
//@ chunk-01kgd7xg.js:24745-24803 placement
function isParkedMcpTask(task) {
  return task.type === "mcp_task" && task.parked === true;
}
//@ chunk-01kgd7xg.js:24803-24865 placement
function isHoldCappedMcpTask(task) {
  return task.type === "mcp_task" && task.holdCapped === true;
}
//@ chunk-01kgd7xg.js:24865-24903 placement
function isHeldMcpTask(task) {
  return isParkedMcpTask(task) || isHoldCappedMcpTask(task);
}
//@ chunk-01kgd7xg.js:24903-25031 placement
function isMonitorShellTask(task) {
  return (
    (task.type === "local_bash" && task.kind === "monitor") ||
    task.type === "monitor_mcp" ||
    (task.type === "monitor_ws" && task.ambient !== true)
  );
}
//@ chunk-01kgd7xg.js:25031-25139 placement
function isBackgroundedShellTask(task) {
  return (
    task.type === "local_bash" &&
    task.isBackgrounded === true &&
    task.kind !== "monitor" &&
    task.agentId === undefined
  );
}
//@ chunk-01kgd7xg.js:25139-25227 placement
/**
 * 环境监视任务且帧不是显式开启。
 */
function isAmbientFrameTask(task) {
  return task.type === "monitor_ws" && task.ambient === true && task.frameLive?.explicit !== true;
}
//@ chunk-01kgd7xg.js:25227-25256 placement
/**
 * 即 isAmbientFrameTask（对外别名）。
 */
function isAmbientTask(task) {
  return isAmbientFrameTask(task);
}
//@ chunk-01kgd7xg.js:25256-25339 placement
function skipsTranscript(task) {
  return task.skipTranscript === true || (task.type === "monitor_ws" && task.ambient === true);
}
//@ chunk-01kgd7xg.js:25339-25404 placement (2.1.88 match: getSelectableBackgroundTasks, 0.813)
function getSelectableBackgroundTasks(task) {
  return task.type === "local_agent" ? task.agentType : undefined;
}
//@ chunk-01kgd7xg.js:25404-25477 placement (2.1.88 match: _temp6, 0.768)
function isIdleTeammateTask(t_1) {
  return t_1.type === "in_process_teammate" && t_1.isIdle && !isTeammateAwaitingInput(t_1);
}
//@ chunk-01kgd7xg.js:25477-25673 placement
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
//@ chunk-01kgd7xg.js:25673-25723 placement
function isWorkflowTask(task) {
  return task?.type === "local_workflow";
}
//@ chunk-01kgd7xg.js:25723-25822 placement
var AGENT_TASK_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-01kgd7xg.js:25723", () => {
  AGENT_TASK_TYPES = new Set([
    "local_agent",
    "in_process_teammate",
    "local_workflow",
    "dream",
    "post_turn_memory",
  ]);
});
//@ chunk-01kgd7xg.js:62978-63315 placement
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
//@ chunk-01kgd7xg.js:71724-71797 placement (2.1.88 match: isPanelAgentTask, 0.819)
/**
 * 是否是面板子代理任务：本地代理、非 main-session、非 fork worker。
 */
function isPanelAgentTask(task) {
  return isLocalAgent(task) && task.agentType !== "main-session" && !task.forkWorker;
}
//@ chunk-01kgd7xg.js:71797-71844 placement
function isMainSessionTask(task) {
  return isPanelAgentTask(task) && task.evictAfter !== 0;
}
//@ chunk-01kgd7xg.js:71844-71937 placement
function isForegroundAgentTask(task, parentAgentId) {
  return (
    isLocalAgent(task) &&
    task.status === "running" &&
    !task.isBackgrounded &&
    task.parentAgentId === parentAgentId
  );
}
//@ chunk-01kgd7xg.js:71937-71974 placement
/**
 * 主线程前台代理任务（无 parentAgentId）。
 */
function isMainThreadForegroundAgent(task) {
  return isForegroundAgentTask(task, undefined);
}
//@ chunk-01kgd7xg.js:71974-72051 placement
/**
 * 主线程前台、已武装自动转后台且为直接调用的代理任务。
 */
function isArmedDirectForegroundAgent(task) {
  return isMainThreadForegroundAgent(task) && task.autoBackgroundArmed === true && task.directCall === true;
}
//@ chunk-01kgd7xg.js:72051-72200 placement
/**
 * 本地代理任务是否可接收通知。
 */
function canReceiveNotification(task, { userInitiated: options = false } = {}) {
  if (!isLocalAgent(task)) return false;
  if (options) return true;
  return task.stoppedByUser !== true && (task.status === "running" || task.status === "completed");
}
//@ chunk-01kgd7xg.js:72200-72250 placement
function userStopCount(task) {
  return isLocalAgent(task) ? (task.userStopCount ?? 0) : 0;
}
//@ chunk-01kgd7xg.js:72250-72362 placement
/**
 * 有当前用户停止计数下发起的待处理消息。
 */
function hasUserInitiatedPending(task, messages) {
  if (!isLocalAgent(task)) return false;
  let stopCount = userStopCount(task);
  return (messages ?? task.pendingMessages).some((message) => message.userInitiatedAt === stopCount);
}
//@ chunk-01kgd7xg.js:72362-72387 placement
var KILL_UNSETTLED = "kill-unsettled";
//@ chunk-01kgd7xg.js:72387-72430 layout
function evalTaskId(evalId) {
  return codeModeAccepted() ? `repl:${evalId}` : "";
}
//@ chunk-01kgd7xg.js:72430-72481 placement
/**
 * 恒返回 false 的占位判断。
 */
function neverTrue(task) {
  return codeModeAccepted() && task.startsWith("repl:");
}
//@ chunk-01kgd7xg.js:72481-72603 placement
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
//@ chunk-01kgd7xg.js:72603-72718 placement
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
//@ chunk-01kgd7xg.js:72718-72768 placement
function keepaliveReasons(task) {
  return task.keepaliveReasons ?? new Set();
}
//@ chunk-01kgd7xg.js:72768-72904 placement (2.1.88 match: clearMcpClientConfig, 0.39)
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
  keepaliveReasons,
  isCompletedBackgroundAgent,
  isPanelAgentTask,
  canReceiveNotification,
  addAgentKeepaliveReason,
  KILL_UNSETTLED,
  releaseMainThreadContext,
  releaseIfFinished,
  getSelectableBackgroundTasks,
  isLocalScriptTask,
  skipsTranscript,
  taskParentAgentId,
  isHoldCappedMcpTask,
  isAwaitedAgentTask,
  isMainSessionTask,
  isMainThreadForegroundAgent,
  isArmedDirectForegroundAgent,
  isWaitableAgentOrWorkflow,
  isHeldMcpTask,
  isMonitorShellTask,
  isBackgroundedShellTask,
  taskKindLabel,
  isParkedMcpTask,
  hasUserInitiatedPending,
  isIdleTeammateTask,
  appendBounded,
  MAX_APPENDED_ENTRIES,
  appendReplacingUuid,
  neverTrue,
  isWorkflowTask,
  isAmbientTask,
  isForegroundAgentTask,
  taskAbortController,
  TASK_KIND_LABELS,
  AGENT_TASK_TYPES,
  isTaskOwnedBy,
  isLocalScriptTaskState,
  evalTaskId,
  userStopCount,
};
