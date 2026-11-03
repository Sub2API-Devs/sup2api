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
  let last = usage.iterations.findLast((r) => !isAdvisorOrCompactionBlock(r));
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
  let n = getTokenCountFromUsage(e);
  return getTokenCountFromUsage_2(n) + n.output_tokens;
}
//@ chunk-g54kbxqw.js:44450-44544 placement = getTokenCountFromUsage (0.857)
function getTokenCountFromUsage_2(usage) {
  return usage.input_tokens + usage.cache_creation_input_tokens + usage.cache_read_input_tokens;
}
//@ chunk-g54kbxqw.js:44544-44662 placement
function isAdvisorOrCompactionBlock(e) {
  if (typeof e !== "object" || e === null) return !1;
  let { type: n } = e;
  return n === "advisor_message" || n === "compaction";
}
//@ chunk-g54kbxqw.js:44662-44964 placement
function isApiMessageLike(e) {
  if (typeof e !== "object" || e === null) return !1;
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
function countClearedToolUses(e) {
  let n = e?.applied_edits;
  if (!Array.isArray(n)) return 0;
  let s = 0;
  for (let h of n) {
    if (typeof h !== "object" || h === null) continue;
    let { type: y, cleared_input_tokens: cleared_input_tokens } = h;
    if (y === "clear_tool_uses_20250919" && isNonNegativeNumber(cleared_input_tokens))
      s += cleared_input_tokens;
  }
  let r = e?.client_estimated_cleared_input_tokens;
  return isNonNegativeNumber(r) ? Math.min(s, r) : s;
}
//@ chunk-g54kbxqw.js:45258-45599 placement
function isToolUseStop(e, n) {
  let s = e[n];
  if (s?.type !== "assistant") return !1;
  let r = sn(s, "stop_reason");
  if (r !== "tool_use" && r !== "end_turn") return !1;
  for (let h = n + 1; h < e.length; h++) {
    let y = e[h];
    if (y?.type === "user") return isStreamCutContinuation(y);
    if (y?.type !== "assistant") continue;
    if (y.isApiErrorMessage) return y.error === "server_error";
    if (sn(y, "id") !== sn(s, "id")) return !1;
  }
  return !1;
}
//@ chunk-g54kbxqw.js:45599-45670 placement
function sn(e, n) {
  let message = e.message;
  return message !== void 0 && n in message ? message[n] : void 0;
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
