/**
 * tasks/LocalAgentTask/childWork.ts
 *
 * 2.1.316 新增：子代理派出的子工作（agent:/bash:/workflow:）跟踪
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { isConcurrentShoreOn } from "./keepalive.js";
import { keepaliveReasons, neverTrue, isCompletedBackgroundAgent } from "../taskKinds.js";
import { isTaskNotificationQueuedFor } from "../../utils/messageQueueManager.js";
import { isTerminalTaskStatus } from "../taskStatus.js";
import { removeKeepaliveReason, MCP_TASK_KEEPALIVE_MS } from "../../utils/task/framework.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { allPeerOrigins } from "../../services/mcp/ccrTurnId.js";
import { markDirectDelivery_2 } from "../../utils/messageProvenance.js";
import { useTeammateLifecycleNotification } from "../../hooks/notifs/useTeammateShutdownNotification.js";
import { noteHandback, forgetHandback } from "../../tools/AgentTool/handbackReport.js";
import { mainAgentId } from "../../bootstrap/state.js";

//@ chunk-5xgkngpb.js:4827393-4827620 placement
/**
 * 判断后台代理已完成但仍挂在监控、工作流或后台命令等子工作上。
 */
function isParkedOnChildWork(task) {
  if (!isLocalAgent(task) || !task.isBackgrounded || task.status !== "completed") return false;
  let isConcurrentShore = isConcurrentShoreOn();
  for (let reason of keepaliveReasons(task)) {
    if (reason.startsWith("monitor:") || reason.startsWith("workflow:") || neverTrue(reason)) return true;
    if (isConcurrentShore && reason.startsWith("bash:")) return true;
  }
  return false;
}
//@ chunk-5xgkngpb.js:4827620-4827695 placement
/**
 * 判断代理是否仍有保活原因（即尚有子工作在跑）。
 */
function hasAnyKeepaliveReason(agentId, taskRegistry) {
  if (!agentId) return false;
  let task = taskRegistry.get(agentId);
  return isLocalAgent(task) && keepaliveReasons(task).size > 0;
}
//@ chunk-5xgkngpb.js:4827695-4827825 placement
/**
 * 判断代理是否有子代理在运行（保活原因中有 agent:）。
 */
function hasChildAgents(agentId, taskRegistry) {
  if (!agentId) return false;
  let task = taskRegistry.get(agentId);
  if (!isLocalAgent(task)) return false;
  for (let reason of keepaliveReasons(task)) if (reason.startsWith("agent:")) return true;
  return false;
}
//@ chunk-5xgkngpb.js:4827825-4828088 placement
/**
 * 判断代理是否有待完成的子工作（子代理、工作流、后台命令）。
 */
function hasPendingChildWork(agentId, taskRegistry) {
  if (!agentId) return false;
  let task = taskRegistry.get(agentId);
  if (!isLocalAgent(task)) return false;
  let isConcurrentShore = isConcurrentShoreOn();
  for (let reason of keepaliveReasons(task)) {
    if (reason.startsWith("agent:")) return true;
    if (task.isBackgrounded && (reason.startsWith("workflow:") || neverTrue(reason))) return true;
    if (isConcurrentShore && task.isBackgrounded && reason.startsWith("bash:")) return true;
  }
  return false;
}
//@ chunk-5xgkngpb.js:4828088-4828489 placement
/**
 * 移除已结束或不再属于该代理的子工作保活原因。
 */
function pruneSettledChildWork(agentId, tasks) {
  let task = tasks.get(agentId);
  if (!isLocalAgent(task)) return;
  for (let reason of keepaliveReasons(task)) {
    let childId;
    if (reason.startsWith("agent:")) childId = reason.slice(6);
    else if (reason.startsWith("workflow:")) childId = reason.slice(9);
    else if (reason.startsWith("bash:")) childId = reason.slice(5);
    else continue;
    if (isTaskNotificationQueuedFor(agentId, childId)) continue;
    let child = tasks.get(childId);
    if (
      !child ||
      (isLocalAgent(child) && (child.notified || child.ownerAgentId !== agentId)) ||
      (child.type === "local_workflow" && child.notified) ||
      (child.type === "local_bash" && child.notified && isTerminalTaskStatus(child.status))
    )
      removeKeepaliveReason(agentId, reason, tasks);
  }
}
//@ chunk-5xgkngpb.js:4828489-4828592 placement
/**
 * 标记代理已与聊天交互（未放弃固定时）。
 */
function markChatEngaged(id, taskRegistry) {
  taskRegistry.update(id, (task) =>
    task.chatEngaged === true || task.chatPinForfeited === true
      ? task
      : {
          ...task,
          chatEngaged: true,
        },
  );
}
//@ chunk-5xgkngpb.js:4828592-4828872 placement (2.1.88 match: failAgentTask, 0.506)
function forfeitChatPins(tasks, nowMs) {
  let next;
  for (let [key, value] of Object.entries(tasks)) {
    if (!isLocalAgent(value) || value.chatPinForfeited === true) continue;
    let isCompleted = isCompletedBackgroundAgent(value);
    next ??= {
      ...tasks,
    };
    next[key] = {
      ...value,
      chatPinForfeited: true,
      ...(isCompleted &&
        !value.retain &&
        (value.keepaliveReasons?.size ?? 0) === 0 && {
          evictAfter:
            value.endTime === undefined ? nowMs : Math.max(nowMs, value.endTime + MCP_TASK_KEEPALIVE_MS),
        }),
    };
  }
  return next ?? tasks;
}
//@ chunk-5xgkngpb.js:4828872-4829171 placement
/**
 * 放弃所有代理的聊天固定，并清除等待通知的接收者。
 */
function forfeitAllChatPins(state) {
  for (let task of Object.values(state.tasks))
    if (isLocalAgent(task)) getTaskRunState().chatPinForfeitedAgentIds.add(task.agentId);
  let tasks = forfeitChatPins(state.tasks, Date.now());
  for (let [key, value] of Object.entries(tasks))
    if (isLocalAgent(value) && value.waitingNoticeRecipient !== undefined)
      tasks = {
        ...tasks,
        [key]: {
          ...value,
          waitingNoticeRecipient: undefined,
        },
      };
  return tasks === state.tasks
    ? state
    : {
        ...state,
        tasks,
      };
}
//@ chunk-5xgkngpb.js:4829171-4829780 placement
/**
 * 向代理的待处理消息队列追加一条消息（带来源、是否元消息、工具等），并记录事件。
 */
function queueAgentMessage(agentId, text, tasks, options = {}) {
  allPeerOrigins([options]);
  tasks.update(agentId, (task) => ({
    ...task,
    pendingMessages: [
      ...task.pendingMessages,
      {
        text,
        origin: options.origin,
        isMeta: options.isMeta ?? false,
        ...(options.toolsUsed !== undefined &&
          options.toolsUsed.length > 0 && {
            toolsUsed: options.toolsUsed,
          }),
        ...(options.userInitiated && {
          userInitiatedAt: task.userStopCount ?? 0,
        }),
        ...(options.forwarded && {
          forwarded: options.forwarded,
        }),
        ...(options.shownAs && {
          shownAs: options.shownAs,
        }),
      },
    ],
  }));
  markDirectDelivery_2(
    agentId,
    {
      origin: options.origin,
      isMeta: options.isMeta ?? false,
    },
    "queued_command",
  );
  if (
    options.origin?.kind === "peer" &&
    options.origin.handback === true &&
    options.origin.senderTaskId !== undefined &&
    useTeammateLifecycleNotification(tasks.get(agentId))
  )
    noteHandback({
      sender: options.origin.senderTaskId,
      recipient: agentId,
      senderName: options.origin.from,
      flagged: options.origin.flagged === true,
    });
}
//@ chunk-5xgkngpb.js:4829780-4829847 placement
function releaseBackgroundedAgent(taskId, taskRegistry) {
  let task = taskRegistry.get(taskId);
  if (isLocalAgent(task) && task.isBackgrounded) forgetHandback(taskId);
}
//@ chunk-5xgkngpb.js:4829964-4830013 placement
/**
 * 判断是否应发送队友生命周期通知（主代理总是发）。
 */
function shouldNotifyTeammateLifecycle(agentId, taskRegistry) {
  return agentId === mainAgentId() || useTeammateLifecycleNotification(taskRegistry.get(agentId));
}
export {
  isParkedOnChildWork,
  hasChildAgents,
  releaseBackgroundedAgent,
  pruneSettledChildWork,
  hasAnyKeepaliveReason,
  hasPendingChildWork,
  queueAgentMessage,
  forfeitAllChatPins,
  markChatEngaged,
  shouldNotifyTeammateLifecycle,
};
