/**
 * utils/collapseTurnMessages.ts
 *
 * 2.1.316 新增：渲染前的消息整理：合并连续的钩子附件为按事件计数的批次、去掉计数未变的重复回合耗时行、去掉重复的远程错误提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hnxhr3bs.js (5)
 * attribution: placement 5
 */
import { deriveUUID, SYNTHETIC_MODEL } from "./messages.js";
import { isHumanTurn_3 } from "./messagePredicates.js";
import { isHumanOrUnset } from "./messageProvenance.js";
import { resolveTaskNotificationOrigin } from "./backgroundSessionResume.js";
import { sanitizedMessageText } from "./messages/mappers.js";

//@ chunk-hnxhr3bs.js:122396-122483 placement
function isAsyncHookResponse(message) {
  return message.type === "attachment" && message.attachment.type === "async_hook_response";
}
//@ chunk-hnxhr3bs.js:122483-122955 placement
/**
 * 把连续的钩子附件合并为按事件计数的一条。
 */
function collapseHookAttachments(messages) {
  let result = [];
  let index = 0;
  while (index < messages.length) {
    let firstMessage = messages[index];
    if (isAsyncHookResponse(firstMessage)) {
      let countsByEvent = new Map();
      let index_2 = 0;
      while (index < messages.length) {
        let message = messages[index];
        if (!isAsyncHookResponse(message)) break;
        let hookEvent = message.attachment.hookEvent;
        countsByEvent.set(hookEvent, (countsByEvent.get(hookEvent) ?? 0) + 1);
        index_2++;
        index++;
      }
      if (index_2 === 1) result.push(firstMessage);
      else {
        let hooks = [];
        for (let [hookEvent, count] of countsByEvent)
          hooks.push({
            hookEvent,
            count,
          });
        let uuid = firstMessage.uuid;
        result.push({
          type: "attachment",
          uuid:
            typeof uuid === "string" && uuid !== ""
              ? deriveUUID(firstMessage.uuid, index_2)
              : firstMessage.uuid,
          timestamp: firstMessage.timestamp,
          attachment: {
            type: "async_hook_response_batch",
            hooks,
          },
        });
      }
    } else {
      result.push(firstMessage);
      index++;
    }
  }
  return result;
}
//@ chunk-hnxhr3bs.js:122955-123474 placement
/**
 * 去掉后台代理/工作流计数未变的重复回合耗时行。
 */
function dropRepeatedTurnDurations(messages, keepAll) {
  if (keepAll) return messages;
  let lastAgentCount = 0;
  let lastWorkflowCount = 0;
  let kept = null;
  for (let [messageIndex, message] of messages.entries()) {
    if (message.type === "system" && message.subtype === "turn_duration") {
      let pendingBackgroundAgentCount = message.pendingBackgroundAgentCount ?? 0;
      let pendingWorkflowCount = message.pendingWorkflowCount ?? 0;
      let isRepeated =
        (pendingBackgroundAgentCount > 0 || pendingWorkflowCount > 0) &&
        pendingBackgroundAgentCount === lastAgentCount &&
        pendingWorkflowCount === lastWorkflowCount &&
        message.budgetLimit === undefined &&
        (message.briefHiddenCount ?? 0) === 0;
      lastAgentCount = pendingBackgroundAgentCount;
      lastWorkflowCount = pendingWorkflowCount;
      if (isRepeated) {
        kept ??= messages.slice(0, messageIndex);
        continue;
      }
    } else if (
      message.type === "user"
        ? isHumanTurn_3(message)
        : message.type === "attachment" &&
          message.attachment.type === "queued_command" &&
          message.attachment.isMeta !== true &&
          isHumanOrUnset(
            resolveTaskNotificationOrigin(message.attachment.origin, message.attachment.commandMode),
          )
    ) {
      lastAgentCount = 0;
      lastWorkflowCount = 0;
    }
    kept?.push(message);
  }
  return kept ?? messages;
}
//@ chunk-hnxhr3bs.js:123474-123553 placement
function dropDuplicateRemoteErrors(messages, skip) {
  if (skip || !messages.some(isDuplicateRemoteError)) return messages;
  return messages.filter((message, index) => !isDuplicateRemoteError(message, index, messages));
}
//@ chunk-hnxhr3bs.js:123553-123800 placement
function isDuplicateRemoteError(message, index, messages) {
  let previous = messages[index - 1];
  if (
    message.type !== "system" ||
    message.subtype !== "informational" ||
    message.fromRemoteErrorResult !== true ||
    previous?.type !== "assistant" ||
    previous.message.model !== SYNTHETIC_MODEL
  )
    return false;
  let firstBlock = previous.message.content[0];
  return (
    firstBlock?.type === "text" &&
    sanitizedMessageText(firstBlock.text) === sanitizedMessageText(message.content)
  );
}
export { collapseHookAttachments, dropDuplicateRemoteErrors, dropRepeatedTurnDurations };
