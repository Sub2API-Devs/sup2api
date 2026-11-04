/**
 * utils/messages/usageAndStopReason.ts
 *
 * 2.1.316 新增：用量 token 统计与停止原因判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g54kbxqw.js (9)
 * attribution: placement 9
 */
import { isStreamCutContinuation } from "../messages.js";

//@ chunk-g54kbxqw.js:43903-44392 placement = getTokenCountFromUsage (0.798)
function getTokenCountFromUsage(usage) {
  let counts = {
    input_tokens: usage.input_tokens ?? 0,
    output_tokens: usage.output_tokens ?? 0,
    cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
    cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
  };
  if (getTokenCountFromUsage_2(counts) === 0 || !Array.isArray(usage.iterations)) return counts;
  let message = usage.iterations.findLast((iteration) => !isAdvisorOrCompactionBlock(iteration));
  if (!isApiMessageLike(message)) return counts;
  return {
    input_tokens: message.input_tokens,
    output_tokens: message.output_tokens,
    cache_creation_input_tokens: message.cache_creation_input_tokens,
    cache_read_input_tokens: message.cache_read_input_tokens,
  };
}
//@ chunk-g54kbxqw.js:44392-44450 placement
function totalTokensOf(usage) {
  let tokenCountFromUsage = getTokenCountFromUsage(usage);
  return getTokenCountFromUsage_2(tokenCountFromUsage) + tokenCountFromUsage.output_tokens;
}
//@ chunk-g54kbxqw.js:44450-44544 placement = getTokenCountFromUsage (0.857)
function getTokenCountFromUsage_2(usage) {
  return usage.input_tokens + usage.cache_creation_input_tokens + usage.cache_read_input_tokens;
}
//@ chunk-g54kbxqw.js:44544-44662 placement
function isAdvisorOrCompactionBlock(iteration) {
  if (typeof iteration !== "object" || iteration === null) return false;
  let { type } = iteration;
  return type === "advisor_message" || type === "compaction";
}
//@ chunk-g54kbxqw.js:44662-44964 placement
function isApiMessageLike(message) {
  if (typeof message !== "object" || message === null) return false;
  let value = message;
  return (
    (value.type === "message" || value.type === "fallback_message") &&
    isNonNegativeNumber(value.input_tokens) &&
    isNonNegativeNumber(value.output_tokens) &&
    isNonNegativeNumber(value.cache_creation_input_tokens) &&
    isNonNegativeNumber(value.cache_read_input_tokens) &&
    value.input_tokens + value.cache_creation_input_tokens + value.cache_read_input_tokens > 0
  );
}
//@ chunk-g54kbxqw.js:44964-45258 placement
function countClearedToolUses(contextManagement) {
  let appliedEdits = contextManagement?.applied_edits;
  if (!Array.isArray(appliedEdits)) return 0;
  let total = 0;
  for (let appliedEdit of appliedEdits) {
    if (typeof appliedEdit !== "object" || appliedEdit === null) continue;
    let { type, cleared_input_tokens: clearedInputTokens } = appliedEdit;
    if (type === "clear_tool_uses_20250919" && isNonNegativeNumber(clearedInputTokens))
      total += clearedInputTokens;
  }
  let clientEstimatedClearedInputTokens = contextManagement?.client_estimated_cleared_input_tokens;
  return isNonNegativeNumber(clientEstimatedClearedInputTokens)
    ? Math.min(total, clientEstimatedClearedInputTokens)
    : total;
}
//@ chunk-g54kbxqw.js:45258-45599 placement
function isToolUseStop(messages, index) {
  let message = messages[index];
  if (message?.type !== "assistant") return false;
  let stopReason = messageField(message, "stop_reason");
  if (stopReason !== "tool_use" && stopReason !== "end_turn") return false;
  for (let j = index + 1; j < messages.length; j++) {
    let laterMessage = messages[j];
    if (laterMessage?.type === "user") return isStreamCutContinuation(laterMessage);
    if (laterMessage?.type !== "assistant") continue;
    if (laterMessage.isApiErrorMessage) return laterMessage.error === "server_error";
    if (messageField(laterMessage, "id") !== messageField(message, "id")) return false;
  }
  return false;
}
//@ chunk-g54kbxqw.js:45599-45670 placement
function messageField(message, field) {
  let message_2 = message.message;
  return message_2 !== undefined && field in message_2 ? message_2[field] : undefined;
}
//@ chunk-g54kbxqw.js:45670-45738 placement
function isNonNegativeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
export {
  totalTokensOf,
  getTokenCountFromUsage,
  isToolUseStop,
  countClearedToolUses,
  getTokenCountFromUsage_2,
  isNonNegativeNumber,
};
