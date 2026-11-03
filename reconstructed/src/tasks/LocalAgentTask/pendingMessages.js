/**
 * tasks/LocalAgentTask/pendingMessages.ts
 *
 * 2.1.316 新增：子代理待投递消息的追加与排空，插件可拒绝恢复
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (5)
 * attribution: placement 5
 */
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { queuePendingMessage, resolveVisibleSubagentId } from "./LocalAgentTask.js";
import { logForDebugging } from "../../utils/debug.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { queueAgentMessage } from "./childWork.js";
import { mainAgentId } from "../../bootstrap/state.js";

/**
 * 往子代理的 transcript 追加一条消息。
 */
//@ chunk-e6aww6q8.js:4718913-4718996 placement
function appendAgentTranscriptMessage(taskId, message, taskRegistry) {
  taskRegistry.updateTranscript(taskId, (s) => ({ ...s, messages: [...s.messages, message] }));
}
/**
 * 取出并清空子代理的 pendingMessages。
 */
//@ chunk-e6aww6q8.js:4718996-4719155 placement = queuePendingMessage (0.752)
function drainPendingMessages(taskId, taskRegistry) {
  let r = taskRegistry.get(taskId);
  if (!isLocalAgent(r) || r.pendingMessages.length === 0) return [];
  let pendingMessages = r.pendingMessages;
  return (taskRegistry.update(taskId, (task) => ({ ...task, pendingMessages: [] })), pendingMessages);
}
/**
 * 插件拒绝恢复代理时，丢弃对应的排队消息并发出恢复失败事件。
 */
//@ chunk-e6aww6q8.js:4719236-4719571 placement
function dropDeniedResumeMessages(e, n, r, { deniedByPlugin: deniedByPlugin }) {
  let h = new Set(r),
    filtered = drainPendingMessages(e, n).filter((S) => !h.has(S));
  if (
    (queuePendingMessage(e, filtered, n),
    logForDebugging(`resume of ${e} denied: dropping ${r.length} queued message(s): ${deniedByPlugin}`),
    getTaskRunState().agentResumeFailed.emit(e, {
      error: new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        deniedByPlugin,
        "Subagent resume denied by a plugin",
      ),
      undeliverable: r,
      terminal: !1,
    }),
    filtered.length > 0)
  )
    getTaskRunState().agentStrandedMessages.emit(e);
}
/**
 * 向代理发送消息，代理未运行时发出消息滞留事件，返回代理是否存在。
 */
//@ chunk-e6aww6q8.js:4719571-4719714 placement
function sendMessageToAgent(e, n, r, s = {}) {
  queueAgentMessage(e, n, r, s);
  let h = r.get(e)?.status;
  if (h !== void 0 && h !== "running") getTaskRunState().agentStrandedMessages.emit(e);
  return h !== void 0;
}
/**
 * 发送消息后清除代理的等待通知接收者（若匹配）。
 */
//@ chunk-e6aww6q8.js:4719714-4719839 placement
function clearWaitingNotice(e, n, r) {
  let s = resolveVisibleSubagentId(n, r) ?? mainAgentId();
  r.update(e, (h) => (h.waitingNoticeRecipient === s ? { ...h, waitingNoticeRecipient: void 0 } : h));
}

export {
  sendMessageToAgent,
  appendAgentTranscriptMessage,
  drainPendingMessages,
  dropDeniedResumeMessages,
  clearWaitingNotice,
};
