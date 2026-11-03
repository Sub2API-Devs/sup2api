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
import { jK } from "./keepalive.js";
import { keepaliveReasons, Z2o, isCompletedBackgroundAgent } from "../taskKinds.js";
import { hasQueuedTaskNotification } from "../../utils/messageQueueManager.js";
import { isTerminalTaskStatus } from "../taskStatus.js";
import { removeKeepaliveReason, AP } from "../../utils/task/framework.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { markDirectDelivery } from "../../utils/messageProvenance.js";
import { useTeammateLifecycleNotification } from "../../hooks/notifs/useTeammateShutdownNotification.js";
import { C5t, Nwe } from "../../tools/AgentTool/handbackReport.js";
import { mainAgentId } from "../../bootstrap/state.js";

/**
 * 判断后台代理已完成但仍挂在监控、工作流或后台命令等子工作上。
 */
//@ chunk-e6aww6q8.js:4716201-4716428 placement
function isParkedOnChildWork(e) {
  if (!isLocalAgent(e) || !e.isBackgrounded || e.status !== "completed") return !1;
  let n = jK();
  for (let r of keepaliveReasons(e)) {
    if (r.startsWith("monitor:") || r.startsWith("workflow:") || Z2o(r)) return !0;
    if (n && r.startsWith("bash:")) return !0;
  }
  return !1;
}
//@ chunk-e6aww6q8.js:4716428-4716503 placement
function aXn(e, n) {
  if (!e) return !1;
  let r = n.get(e);
  return isLocalAgent(r) && keepaliveReasons(r).size > 0;
}
/**
 * 判断代理是否有子代理在运行（保活原因中有 agent:）。
 */
//@ chunk-e6aww6q8.js:4716503-4716633 placement
function hasChildAgents(e, n) {
  if (!e) return !1;
  let r = n.get(e);
  if (!isLocalAgent(r)) return !1;
  for (let s of keepaliveReasons(r)) if (s.startsWith("agent:")) return !0;
  return !1;
}
/**
 * 判断代理是否有待完成的子工作（子代理、工作流、后台命令）。
 */
//@ chunk-e6aww6q8.js:4716633-4716896 placement
function hasPendingChildWork(e, n) {
  if (!e) return !1;
  let r = n.get(e);
  if (!isLocalAgent(r)) return !1;
  let s = jK();
  for (let h of keepaliveReasons(r)) {
    if (h.startsWith("agent:")) return !0;
    if (r.isBackgrounded && (h.startsWith("workflow:") || Z2o(h))) return !0;
    if (s && r.isBackgrounded && h.startsWith("bash:")) return !0;
  }
  return !1;
}
/**
 * 移除已结束或不再属于该代理的子工作保活原因。
 */
//@ chunk-e6aww6q8.js:4716896-4717295 placement
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
/**
 * 标记代理已与聊天交互（未放弃固定时）。
 */
//@ chunk-e6aww6q8.js:4717295-4717398 placement
function markChatEngaged(e, n) {
  n.update(e, (r) => (r.chatEngaged === !0 || r.chatPinForfeited === !0 ? r : { ...r, chatEngaged: !0 }));
}
//@ chunk-e6aww6q8.js:4717398-4717678 placement
function forfeitChatPins(e, n) {
  let r;
  for (let [s, h] of Object.entries(e)) {
    if (!isLocalAgent(h) || h.chatPinForfeited === !0) continue;
    let y = isCompletedBackgroundAgent(h);
    ((r ??= { ...e }),
      (r[s] = {
        ...h,
        chatPinForfeited: !0,
        ...(y &&
          !h.retain &&
          (h.keepaliveReasons?.size ?? 0) === 0 && {
            evictAfter: h.endTime === void 0 ? n : Math.max(n, h.endTime + AP),
          }),
      }));
  }
  return r ?? e;
}
/**
 * 放弃所有代理的聊天固定，并清除等待通知的接收者。
 */
//@ chunk-e6aww6q8.js:4717678-4717977 placement
function forfeitAllChatPins(e) {
  for (let r of Object.values(e.tasks))
    if (isLocalAgent(r)) getTaskRunState().chatPinForfeitedAgentIds.add(r.agentId);
  let n = forfeitChatPins(e.tasks, Date.now());
  for (let [r, s] of Object.entries(n))
    if (isLocalAgent(s) && s.waitingNoticeRecipient !== void 0)
      n = { ...n, [r]: { ...s, waitingNoticeRecipient: void 0 } };
  return n === e.tasks ? e : { ...e, tasks: n };
}
/**
 * 向代理的待处理消息队列追加一条消息（带来源、是否元消息、工具等），并记录事件。
 */
//@ chunk-e6aww6q8.js:4717977-4718577 placement
function queueAgentMessage(agentId, text, tasks, options = {}) {
  if (
    (tasks.update(agentId, (h) => ({
      ...h,
      pendingMessages: [
        ...h.pendingMessages,
        {
          text: text,
          origin: options.origin,
          isMeta: options.isMeta ?? !1,
          ...(options.toolsUsed !== void 0 &&
            options.toolsUsed.length > 0 && { toolsUsed: options.toolsUsed }),
          ...(options.userInitiated && { userInitiatedAt: h.userStopCount ?? 0 }),
          ...(options.forwarded && { forwarded: options.forwarded }),
          ...(options.shownAs && { shownAs: options.shownAs }),
        },
      ],
    })),
    markDirectDelivery(agentId, { origin: options.origin, isMeta: options.isMeta ?? !1 }, "queued_command"),
    options.origin?.kind === "peer" &&
      options.origin.handback === !0 &&
      options.origin.senderTaskId !== void 0 &&
      useTeammateLifecycleNotification(tasks.get(agentId)))
  )
    C5t({
      sender: options.origin.senderTaskId,
      recipient: agentId,
      senderName: options.origin.from,
      flagged: options.origin.flagged === !0,
    });
}
//@ chunk-e6aww6q8.js:4718577-4718644 placement
function Q2n(e, n) {
  let r = n.get(e);
  if (isLocalAgent(r) && r.isBackgrounded) Nwe(e);
}
//@ chunk-e6aww6q8.js:4718761-4718810 placement
function lXn(e, n) {
  return e === mainAgentId() || useTeammateLifecycleNotification(n.get(e));
}

export {
  pruneSettledChildWork,
  hasChildAgents,
  hasPendingChildWork,
  lXn,
  aXn,
  queueAgentMessage,
  isParkedOnChildWork,
  forfeitAllChatPins,
  Q2n,
  markChatEngaged,
};
