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

//@ chunk-e6aww6q8.js:4718913-4718996 placement
/**
 * 往子代理的 transcript 追加一条消息。
 */
function appendAgentTranscriptMessage(taskId, message, taskRegistry) {
  taskRegistry.updateTranscript(taskId, (transcript) => ({
    ...transcript,
    messages: [...transcript.messages, message],
  }));
}
//@ chunk-e6aww6q8.js:4718996-4719155 placement = queuePendingMessage (0.752)
/**
 * 取出并清空子代理的 pendingMessages。
 */
function drainPendingMessages(taskId, taskRegistry) {
  let task = taskRegistry.get(taskId);
  if (!isLocalAgent(task) || task.pendingMessages.length === 0) return [];
  let drained = task.pendingMessages;
  taskRegistry.update(taskId, (t) => ({
    ...t,
    pendingMessages: [],
  }));
  return drained;
}
//@ chunk-e6aww6q8.js:4719236-4719571 placement
/**
 * 插件拒绝恢复代理时，丢弃对应的排队消息并发出恢复失败事件。
 */
function dropDeniedResumeMessages(agentId, taskRegistry, deniedMessages, { deniedByPlugin }) {
  let deniedIds = new Set(deniedMessages);
  let filtered = drainPendingMessages(agentId, taskRegistry).filter((queued) => !deniedIds.has(queued));
  queuePendingMessage(agentId, filtered, taskRegistry);
  logForDebugging(
    `resume of ${agentId} denied: dropping ${deniedMessages.length} queued message(s): ${deniedByPlugin}`,
  );
  getTaskRunState().agentResumeFailed.emit(agentId, {
    error: new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      deniedByPlugin,
      "Subagent resume denied by a plugin",
    ),
    undeliverable: deniedMessages,
    terminal: false,
  });
  if (filtered.length > 0) getTaskRunState().agentStrandedMessages.emit(agentId);
}
//@ chunk-e6aww6q8.js:4719571-4719714 placement
/**
 * 向代理发送消息，代理未运行时发出消息滞留事件，返回代理是否存在。
 */
function sendMessageToAgent(agentId, text, taskRegistry, options = {}) {
  queueAgentMessage(agentId, text, taskRegistry, options);
  let status = taskRegistry.get(agentId)?.status;
  if (status !== undefined && status !== "running") getTaskRunState().agentStrandedMessages.emit(agentId);
  return status !== undefined;
}
//@ chunk-e6aww6q8.js:4719714-4719839 placement
/**
 * 发送消息后清除代理的等待通知接收者（若匹配）。
 */
function clearWaitingNotice(agentId, agentId_2, taskRegistry) {
  let recipient = resolveVisibleSubagentId(agentId_2, taskRegistry) ?? mainAgentId();
  taskRegistry.update(agentId, (task) =>
    task.waitingNoticeRecipient === recipient
      ? {
          ...task,
          waitingNoticeRecipient: undefined,
        }
      : task,
  );
}
export {
  sendMessageToAgent,
  appendAgentTranscriptMessage,
  drainPendingMessages,
  dropDeniedResumeMessages,
  clearWaitingNotice,
};
