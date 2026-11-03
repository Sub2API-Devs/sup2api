/**
 * components/PromptInput/_new/isMidTurnInterjectionMessage.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: sole-consumer-new 1
 */
import { SYSTEM_REMINDER_OPEN_PREFIX, USER_SENT_MESSAGE_PREFIX } from "../../../utils/messages.js";
import { ihn, BOUND_THREAD_MESSAGES_HEADER } from "../../../utils/messages/nonUserMessages.js";

/**
 * user 消息正文（剥 system-reminder 前缀后）以“用户在你工作时发来新消息”“协调者发来消息”等插话前缀开头。旧版名 relocateToolReferenceSiblings 为错配。
 */
//@ chunk-18hwfzwa.js:341504-341752 sole-consumer-new
function isMidTurnInterjectionMessage(h) {
  if (h.type !== "user") return !1;
  let content = h.message.content,
    D =
      typeof content === "string"
        ? content
        : Array.isArray(content) && content[0]?.type === "text"
          ? content[0].text
          : "",
    L = D.startsWith(SYSTEM_REMINDER_OPEN_PREFIX) ? D.slice(SYSTEM_REMINDER_OPEN_PREFIX.length) : D;
  return (
    L.startsWith(USER_SENT_MESSAGE_PREFIX) || L.startsWith(ihn) || L.startsWith(BOUND_THREAD_MESSAGES_HEADER)
  );
}

export { isMidTurnInterjectionMessage };
