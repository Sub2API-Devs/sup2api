/**
 * utils/messages/messagePredicates.ts
 *
 * 消息判定小函数（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qz53w8v8.js (7)
 * attribution: placement 7
 */

//@ chunk-qz53w8v8.js:500-567 placement
/**
 * 归一化队列优先级（now/next/later）。
 */
function queuePriorityOrUndefined(priority) {
  return priority === "now" || priority === "next" || priority === "later" ? priority : undefined;
}
//@ chunk-qz53w8v8.js:567-627 placement = _temp (1)
function isNonEmptyImageAttachment(c) {
  return c.type === "image" && c.content.length > 0;
}
//@ chunk-qz53w8v8.js:627-726 placement
/**
 * 判断命令是否为被动/附带型（poll-event、任务通知、跳过附件）。
 */
function isPassiveOrAttachedCommand(command) {
  return (
    command.mode === "poll-event" || command.mode === "task-notification" || command.skipAttachments === true
  );
}
//@ chunk-qz53w8v8.js:726-870 placement
/**
 * 判断是否为真实的助手消息：类型为 assistant、不是交接产生的，且 uuid 不是版本 5（合成）格式。
 */
function isRealAssistantMessage(message) {
  return (
    message.type === "assistant" &&
    message.handedOff !== true &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(message.uuid)
  );
}
//@ chunk-qz53w8v8.js:870-948 placement
/**
 * 取最后一条 user/assistant 消息。
 */
function lastConversationMessage(messages) {
  return messages.findLast((message) => message.type === "user" || message.type === "assistant");
}
//@ chunk-qz53w8v8.js:948-1544 placement = countToolCallsSince (1)
function isToolResultForToolUse(messages) {
  let isToolResultMessage = (message) =>
    message.type === "user" &&
    Array.isArray(message.message.content) &&
    message.message.content.length > 0 &&
    message.message.content.every((block) => block.type === "tool_result");
  let filtered = messages.filter((message) => message.type === "user" || message.type === "assistant");
  let index = filtered.length - 1;
  let answeredIds = new Set();
  while (index >= 0 && isToolResultMessage(filtered[index])) {
    let message = filtered[index];
    if (message.type === "user" && Array.isArray(message.message.content)) {
      for (let block of message.message.content)
        if (block.type === "tool_result") answeredIds.add(block.tool_use_id);
    }
    index--;
  }
  for (; index >= 0 && filtered[index].type === "assistant"; index--) {
    let message = filtered[index];
    if (
      message.type === "assistant" &&
      Array.isArray(message.message.content) &&
      message.message.content.some((block) => block.type === "tool_use" && !answeredIds.has(block.id))
    )
      return true;
  }
  return false;
}
//@ chunk-qz53w8v8.js:1544-1699 placement = getLastToolUseName (1)
/**
 * 找最后一条包含 tool_use 的 assistant 消息，找不到时取最后一条消息。
 */
function findLastToolUseAssistantMessage(message) {
  return (
    message.findLast(
      (message) =>
        message.type === "assistant" &&
        Array.isArray(message.message.content) &&
        message.message.content.some((block) => block.type === "tool_use"),
    ) ?? message.at(-1)
  );
}
export {
  isToolResultForToolUse,
  findLastToolUseAssistantMessage,
  lastConversationMessage,
  queuePriorityOrUndefined,
  isPassiveOrAttachedCommand,
  isNonEmptyImageAttachment,
  isRealAssistantMessage,
};
