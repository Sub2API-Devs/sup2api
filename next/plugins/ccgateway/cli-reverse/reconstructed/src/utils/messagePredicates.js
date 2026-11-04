/**
 * utils/messagePredicates.ts
 *
 * 消息判定：是否人类回合、最后一条真实用户输入
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/messagePredicates.ts
 * pieces: chunk-18hwfzwa.js (1), chunk-aepeg2w5.js (4)
 * attribution: placement 4, fingerprint 1
 */
import {
  isHumanQueuedCommand,
  isToolResultOrCompactSummary,
  matchesTaggedCommand,
  isHumanOrUnset,
} from "./messageProvenance.js";
import { SYSTEM_REMINDER_OPEN_PREFIX, USER_SENT_MESSAGE_PREFIX } from "./messages.js";
import { UNNAMED_SOURCE_LABEL, BOUND_THREAD_MESSAGES_HEADER } from "./messages/nonUserMessages.js";

//@ chunk-aepeg2w5.js:605381-605515 placement = buildTranscriptEntries (0.777)
/**
 * 是否为人类亲自发出的回合：用户发出的 queued_command 附件，或既不是工具结果也不是压缩摘要的 user 消息。
 */
function isHumanAuthoredTurn(message) {
  if (message.type === "attachment" && message.attachment.type === "queued_command")
    return isHumanQueuedCommand(message.attachment);
  return message.type === "user" && !isToolResultOrCompactSummary(message);
}
//@ chunk-aepeg2w5.js:608640-608715 fingerprint = isHumanTurn (1)
function isHumanTurn_2(m) {
  return m.type === "user" && !m.isMeta && m.toolUseResult === undefined;
}
//@ chunk-aepeg2w5.js:608715-608909 placement
function isHumanInitiatedMessage(message, commandTags) {
  return (
    isHumanTurn_2(message) ||
    (message.type === "system" &&
      message.subtype === "local_command" &&
      matchesTaggedCommand(message.content, commandTags)) ||
    (message.type === "attachment" &&
      message.attachment.type === "queued_command" &&
      message.attachment.origin?.kind === "human")
  );
}
//@ chunk-aepeg2w5.js:608909-609020 placement = isHumanTurn (0.779)
function isHumanTurn_3(m) {
  return (
    m.type === "user" &&
    !m.isMeta &&
    m.toolUseResult === undefined &&
    !m.isCompactSummary &&
    isHumanOrUnset(m.origin)
  );
}
//@ chunk-18hwfzwa.js:341504-341752 placement
/**
 * user 消息正文（剥 system-reminder 前缀后）以“用户在你工作时发来新消息”“协调者发来消息”等插话前缀开头。旧版名 relocateToolReferenceSiblings 为错配。
 */
function isMidTurnInterjectionMessage(message) {
  if (message.type !== "user") return false;
  let content = message.message.content;
  let text =
    typeof content === "string"
      ? content
      : Array.isArray(content) && content[0]?.type === "text"
        ? content[0].text
        : "";
  let unwrappedText = text.startsWith(SYSTEM_REMINDER_OPEN_PREFIX)
    ? text.slice(SYSTEM_REMINDER_OPEN_PREFIX.length)
    : text;
  return (
    unwrappedText.startsWith(USER_SENT_MESSAGE_PREFIX) ||
    unwrappedText.startsWith(UNNAMED_SOURCE_LABEL) ||
    unwrappedText.startsWith(BOUND_THREAD_MESSAGES_HEADER)
  );
}
export {
  isHumanTurn_2,
  isMidTurnInterjectionMessage,
  isHumanTurn_3,
  isHumanAuthoredTurn,
  isHumanInitiatedMessage,
};
