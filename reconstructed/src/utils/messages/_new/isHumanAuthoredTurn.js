/**
 * utils/messages/_new/isHumanAuthoredTurn.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (1)
 * attribution: sole-consumer-new 1
 */
import { isHumanQueuedCommand, isToolResultOrCompactSummary } from "../../messageProvenance.js";

/**
 * 是否为人类亲自发出的回合：用户发出的 queued_command 附件，或既不是工具结果也不是压缩摘要的 user 消息。
 */
//@ chunk-aepeg2w5.js:605381-605515 sole-consumer-new = buildTranscriptEntries (0.777)
function isHumanAuthoredTurn(message) {
  if (message.type === "attachment" && message.attachment.type === "queued_command")
    return isHumanQueuedCommand(message.attachment);
  return message.type === "user" && !isToolResultOrCompactSummary(message);
}

export { isHumanAuthoredTurn };
