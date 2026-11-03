/**
 * tasks/LocalAgentTask/childWork.ts
 *
 * 2.1.316 新增：子代理派出的子工作（agent:/bash:/workflow:）跟踪
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (11)
 * attribution: placement 11
 */
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { isConcurrentShoreOn } from "./keepalive.js";
import { keepaliveReasons, neverTrue as neverTrue_3, isCompletedBackgroundAgent } from "../taskKinds.js";
import { hasQueuedTaskNotification } from "../../utils/messageQueueManager.js";
import { isTerminalTaskStatus } from "../taskStatus.js";
import { removeKeepaliveReason, MCP_TASK_KEEPALIVE_MS } from "../../utils/task/framework.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { markDirectDelivery_2 } from "../../utils/messageProvenance.js";
import { useTeammateLifecycleNotification } from "../../hooks/notifs/useTeammateShutdownNotification.js";
import { noteHandback, forgetHandback } from "../../tools/AgentTool/handbackReport.js";
import { mainAgentId } from "../../bootstrap/state.js";

//@ chunk-e6aww6q8.js:4716201-4716428 placement
/**
 * 判断后台代理已完成但仍挂在监控、工作流或后台命令等子工作上。
 */
function isParkedOnChildWork(task) {
  if (!isLocalAgent(task) || !task.isBackgrounded || task.status !== "completed") return false;
  let n = isConcurrentShoreOn();
  for (let r of keepaliveReasons(task)) {
    if (r.startsWith("monitor:") || r.startsWith("workflow:") || neverTrue_3(r)) return true;
    if (n && r.startsWith("bash:")) return true;
  }
  return false;
}
//@ chunk-e6aww6q8.js:4716428-4716503 placement
/**
 * 判断代理是否仍有保活原因（即尚有子工作在跑）。
 */
function hasAnyKeepaliveReason(agentId, taskRegistry) {
  if (!agentId) return false;
  let r = taskRegistry.get(agentId);
  return isLocalAgent(r) && keepaliveReasons(r).size > 0;
}
//@ chunk-e6aww6q8.js:4716503-4716633 placement
/**
 * 判断代理是否有子代理在运行（保活原因中有 agent:）。
 */
function hasChildAgents(e, taskRegistry) {
  if (!e) return false;
  let r = taskRegistry.get(e);
  if (!isLocalAgent(r)) return false;
  for (let s of keepaliveReasons(r)) if (s.startsWith("agent:")) return true;
  return false;
}
//@ chunk-e6aww6q8.js:4716633-4716896 placement
/**
 * 判断代理是否有待完成的子工作（子代理、工作流、后台命令）。
 */
function hasPendingChildWork(e, taskRegistry) {
  if (!e) return false;
  let r = taskRegistry.get(e);
  if (!isLocalAgent(r)) return false;
  let s = isConcurrentShoreOn();
  for (let h of keepaliveReasons(r)) {
    if (h.startsWith("agent:")) return true;
    if (r.isBackgrounded && (h.startsWith("workflow:") || neverTrue_3(h))) return true;
    if (s && r.isBackgrounded && h.startsWith("bash:")) return true;
  }
  return false;
}
//@ chunk-e6aww6q8.js:4716896-4717295 placement
/**
 * 移除已结束或不再属于该代理的子工作保活原因。
 */
function pruneSettledChildWork(agentId, tasks) {
  let r = tasks.get(agentId);
  if (!isLocalAgent(r)) return;
  for (let s of keepaliveReasons(r)) {
    let h;
    if (s.startsWith("agent:")) h = s.slice(6);
    else if (s.startsWith("workflow:")) h = s.slice(9);
    else if (s.startsWith("bash:")) h = s.slice(5);
    else continue;
    if (hasQueuedTaskNotification(agentId, h)) continue;
    let y = tasks.get(h);
    if (
      !y ||
      (isLocalAgent(y) && (y.notified || y.ownerAgentId !== agentId)) ||
      (y.type === "local_workflow" && y.notified) ||
      (y.type === "local_bash" && y.notified && isTerminalTaskStatus(y.status))
    )
      removeKeepaliveReason(agentId, s, tasks);
  }
}
//@ chunk-e6aww6q8.js:4717295-4717398 placement
/**
 * 标记代理已与聊天交互（未放弃固定时）。
 */
function markChatEngaged(id, taskRegistry) {
  taskRegistry.update(id, (r) =>
    r.chatEngaged === true || r.chatPinForfeited === true
      ? r
      : {
          ...r,
          chatEngaged: true,
        },
  );
}
//@ chunk-e6aww6q8.js:4717398-4717678 placement
function forfeitChatPins(tasks, n) {
  let r;
  for (let [key, value] of Object.entries(tasks)) {
    if (!isLocalAgent(value) || value.chatPinForfeited === true) continue;
    let y = isCompletedBackgroundAgent(value);
    r ??= {
      ...tasks,
    };
    r[key] = {
      ...value,
      chatPinForfeited: true,
      ...(y &&
        !value.retain &&
        (value.keepaliveReasons?.size ?? 0) === 0 && {
          evictAfter: value.endTime === undefined ? n : Math.max(n, value.endTime + MCP_TASK_KEEPALIVE_MS),
        }),
    };
  }
  return r ?? tasks;
}
//@ chunk-e6aww6q8.js:4717678-4717977 placement
/**
 * 放弃所有代理的聊天固定，并清除等待通知的接收者。
 */
function forfeitAllChatPins(e) {
  for (let task of Object.values(e.tasks))
    if (isLocalAgent(task)) getTaskRunState().chatPinForfeitedAgentIds.add(task.agentId);
  let n = forfeitChatPins(e.tasks, Date.now());
  for (let [key, value] of Object.entries(n))
    if (isLocalAgent(value) && value.waitingNoticeRecipient !== undefined)
      n = {
        ...n,
        [key]: {
          ...value,
          waitingNoticeRecipient: undefined,
        },
      };
  return n === e.tasks
    ? e
    : {
        ...e,
        tasks: n,
      };
}
//@ chunk-e6aww6q8.js:4717977-4718577 placement
/**
 * 向代理的待处理消息队列追加一条消息（带来源、是否元消息、工具等），并记录事件。
 */
function queueAgentMessage(agentId, text, tasks, options = {}) {
  tasks.update(agentId, (h) => ({
    ...h,
    pendingMessages: [
      ...h.pendingMessages,
      {
        text,
        origin: options.origin,
        isMeta: options.isMeta ?? false,
        ...(options.toolsUsed !== undefined &&
          options.toolsUsed.length > 0 && {
            toolsUsed: options.toolsUsed,
          }),
        ...(options.userInitiated && {
          userInitiatedAt: h.userStopCount ?? 0,
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
//@ chunk-e6aww6q8.js:4718577-4718644 placement
function releaseBackgroundedAgent(taskId, taskRegistry) {
  let r = taskRegistry.get(taskId);
  if (isLocalAgent(r) && r.isBackgrounded) forgetHandback(taskId);
}
//@ chunk-e6aww6q8.js:4718761-4718810 placement
/**
 * 判断是否应发送队友生命周期通知（主代理总是发）。
 */
function shouldNotifyTeammateLifecycle(e, taskRegistry) {
  return e === mainAgentId() || useTeammateLifecycleNotification(taskRegistry.get(e));
}
export {
  pruneSettledChildWork,
  hasChildAgents,
  hasPendingChildWork,
  shouldNotifyTeammateLifecycle,
  hasAnyKeepaliveReason,
  queueAgentMessage,
  isParkedOnChildWork,
  forfeitAllChatPins,
  releaseBackgroundedAgent,
  markChatEngaged,
};
