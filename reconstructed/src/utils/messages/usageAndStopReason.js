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
  let n = {
    input_tokens: usage.input_tokens ?? 0,
    output_tokens: usage.output_tokens ?? 0,
    cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
    cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
  };
  if (getTokenCountFromUsage_2(n) === 0 || !Array.isArray(usage.iterations)) return n;
  let last = usage.iterations.findLast((iteration) => !isAdvisorOrCompactionBlock(iteration));
  if (!isApiMessageLike(last)) return n;
  return {
    input_tokens: last.input_tokens,
    output_tokens: last.output_tokens,
    cache_creation_input_tokens: last.cache_creation_input_tokens,
    cache_read_input_tokens: last.cache_read_input_tokens,
  };
}
//@ chunk-g54kbxqw.js:44392-44450 placement
function totalTokensOf(e) {
  let tokenCountFromUsage = getTokenCountFromUsage(e);
  return getTokenCountFromUsage_2(tokenCountFromUsage) + tokenCountFromUsage.output_tokens;
}
//@ chunk-g54kbxqw.js:44450-44544 placement = getTokenCountFromUsage (0.857)
function getTokenCountFromUsage_2(usage) {
  return usage.input_tokens + usage.cache_creation_input_tokens + usage.cache_read_input_tokens;
}
//@ chunk-g54kbxqw.js:44544-44662 placement
function isAdvisorOrCompactionBlock(iteration) {
  if (typeof iteration !== "object" || iteration === null) return false;
  let { type: n } = iteration;
  return n === "advisor_message" || n === "compaction";
}
//@ chunk-g54kbxqw.js:44662-44964 placement
function isApiMessageLike(e) {
  if (typeof e !== "object" || e === null) return false;
  let n = e;
  return (
    (n.type === "message" || n.type === "fallback_message") &&
    isNonNegativeNumber(n.input_tokens) &&
    isNonNegativeNumber(n.output_tokens) &&
    isNonNegativeNumber(n.cache_creation_input_tokens) &&
    isNonNegativeNumber(n.cache_read_input_tokens) &&
    n.input_tokens + n.cache_creation_input_tokens + n.cache_read_input_tokens > 0
  );
}
//@ chunk-g54kbxqw.js:44964-45258 placement
function countClearedToolUses(contextManagement) {
  let appliedEdits = contextManagement?.applied_edits;
  if (!Array.isArray(appliedEdits)) return 0;
  let s = 0;
  for (let appliedEdit of appliedEdits) {
    if (typeof appliedEdit !== "object" || appliedEdit === null) continue;
    let { type: y, cleared_input_tokens: clearedInputTokens } = appliedEdit;
    if (y === "clear_tool_uses_20250919" && isNonNegativeNumber(clearedInputTokens)) s += clearedInputTokens;
  }
  let clientEstimatedClearedInputTokens = contextManagement?.client_estimated_cleared_input_tokens;
  return isNonNegativeNumber(clientEstimatedClearedInputTokens)
    ? Math.min(s, clientEstimatedClearedInputTokens)
    : s;
}
//@ chunk-g54kbxqw.js:45258-45599 placement
function isToolUseStop(e, n) {
  let s = e[n];
  if (s?.type !== "assistant") return false;
  let r = messageField(s, "stop_reason");
  if (r !== "tool_use" && r !== "end_turn") return false;
  for (let j = n + 1; j < e.length; j++) {
    let y = e[j];
    if (y?.type === "user") return isStreamCutContinuation(y);
    if (y?.type !== "assistant") continue;
    if (y.isApiErrorMessage) return y.error === "server_error";
    if (messageField(y, "id") !== messageField(s, "id")) return false;
  }
  return false;
}
//@ chunk-g54kbxqw.js:45599-45670 placement
function messageField(e, n) {
  let message = e.message;
  return message !== undefined && n in message ? message[n] : undefined;
}
//@ chunk-g54kbxqw.js:45670-45738 placement
function isNonNegativeNumber(e) {
  return typeof e === "number" && Number.isFinite(e) && e >= 0;
}
export {
  totalTokensOf,
  getTokenCountFromUsage,
  isToolUseStop,
  countClearedToolUses,
  getTokenCountFromUsage_2,
  isNonNegativeNumber,
};
