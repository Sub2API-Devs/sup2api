/**
 * utils/messages/usageAndStopReason.ts
 *
 * 2.1.316 新增：用量 token 统计与停止原因判定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (10)
 * attribution: placement 9, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isStreamCutContinuation } from "../messages.js";

//@ chunk-5xgkngpb.js:1540468-1540958 placement (2.1.88 match: getTokenCountFromUsage, 0.799)
function getTokenCountFromUsage_2(usage) {
  let counts = {
    input_tokens: usage.input_tokens ?? 0,
    output_tokens: usage.output_tokens ?? 0,
    cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
    cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
  };
  if (getTokenCountFromUsage_3(counts) === 0 || !Array.isArray(usage.iterations)) return counts;
  let message = usage.iterations.findLast((iteration) => !isAdvisorOrCompactionBlock(iteration));
  if (!isApiMessageLike(message)) return counts;
  return {
    input_tokens: message.input_tokens,
    output_tokens: message.output_tokens,
    cache_creation_input_tokens: message.cache_creation_input_tokens,
    cache_read_input_tokens: message.cache_read_input_tokens,
  };
}
//@ chunk-5xgkngpb.js:1540958-1541015 placement
function totalTokensOf(usage) {
  let tokenCountFromUsage = getTokenCountFromUsage_2(usage);
  return getTokenCountFromUsage_3(tokenCountFromUsage) + tokenCountFromUsage.output_tokens;
}
//@ chunk-5xgkngpb.js:1541015-1541108 placement (2.1.88 match: getTokenCountFromUsage, 0.857)
function getTokenCountFromUsage_3(usage) {
  return usage.input_tokens + usage.cache_creation_input_tokens + usage.cache_read_input_tokens;
}
//@ chunk-5xgkngpb.js:1541108-1541227 placement
function isAdvisorOrCompactionBlock(iteration) {
  if (typeof iteration !== "object" || iteration === null) return false;
  let { type } = iteration;
  return type === "advisor_message" || type === "compaction";
}
//@ chunk-5xgkngpb.js:1541227-1541530 placement
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
//@ chunk-5xgkngpb.js:1541530-1541883 layout
function sentInputTokensOf(usage) {
  if (!Array.isArray(usage.iterations) || usage.iterations.length === 0) {
    let serverToolUse = usage.server_tool_use;
    let inputTokenCount =
      (usage.input_tokens ?? 0) +
      (usage.cache_creation_input_tokens ?? 0) +
      (usage.cache_read_input_tokens ?? 0);
    return (serverToolUse?.web_search_requests ?? 0) > 0 ||
      (serverToolUse?.web_fetch_requests ?? 0) > 0 ||
      inputTokenCount === 0
      ? undefined
      : inputTokenCount;
  }
  let message = usage.iterations.find((iteration) => !isAdvisorOrCompactionBlock(iteration));
  return isApiMessageLike(message) && message.type === "message"
    ? getTokenCountFromUsage_3(message)
    : undefined;
}
//@ chunk-5xgkngpb.js:1541883-1542409 placement
function countClearedToolUses(contextManagement) {
  let appliedEdits = contextManagement?.applied_edits;
  if (!Array.isArray(appliedEdits))
    return {
      inputTokens: 0,
      toolUses: 0,
      isMeasured: false,
    };
  let inputTokens = 0;
  let toolUses = 0;
  for (let appliedEdit of appliedEdits) {
    if (typeof appliedEdit !== "object" || appliedEdit === null) continue;
    let { type, cleared_input_tokens: clearedInputTokens, cleared_tool_uses: clearedToolUses } = appliedEdit;
    if (type !== "clear_tool_uses_20250919") continue;
    inputTokens += isNonNegativeNumber(clearedInputTokens) ? clearedInputTokens : 0;
    toolUses += isNonNegativeNumber(clearedToolUses) ? clearedToolUses : 0;
  }
  let clientEstimatedClearedInputTokens = contextManagement?.client_estimated_cleared_input_tokens;
  if (!isNonNegativeNumber(clientEstimatedClearedInputTokens))
    return {
      inputTokens,
      toolUses,
      isMeasured: false,
    };
  let edit = contextManagement?.client_estimate_measured_from_prompts === true && inputTokens > 0;
  return {
    inputTokens: edit
      ? clientEstimatedClearedInputTokens
      : Math.min(inputTokens, clientEstimatedClearedInputTokens),
    toolUses,
    isMeasured: edit,
  };
}
//@ chunk-5xgkngpb.js:1542409-1542753 placement
function isToolUseStop(messages, index) {
  let message = messages[index];
  if (message?.type !== "assistant") return false;
  let stopReason = messageField(message, "stop_reason");
  if (stopReason !== "tool_use" && stopReason !== "end_turn") return false;
  for (let idx = index + 1; idx < messages.length; idx++) {
    let laterMessage = messages[idx];
    if (laterMessage?.type === "user") return isStreamCutContinuation(laterMessage);
    if (laterMessage?.type !== "assistant") continue;
    if (laterMessage.isApiErrorMessage) return laterMessage.error === "server_error";
    if (messageField(laterMessage, "id") !== messageField(message, "id")) return false;
  }
  return false;
}
//@ chunk-5xgkngpb.js:1542753-1542825 placement
function messageField(message, field) {
  let message_2 = message.message;
  return message_2 !== undefined && field in message_2 ? message_2[field] : undefined;
}
//@ chunk-5xgkngpb.js:1542825-1542893 placement
function isNonNegativeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
export {
  totalTokensOf,
  getTokenCountFromUsage_2,
  getTokenCountFromUsage_3,
  countClearedToolUses,
  isToolUseStop,
  isNonNegativeNumber,
  sentInputTokensOf,
};
