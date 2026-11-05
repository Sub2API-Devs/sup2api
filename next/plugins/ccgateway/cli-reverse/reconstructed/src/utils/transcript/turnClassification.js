/**
 * utils/transcript/turnClassification.ts
 *
 * 2.1.316 新增：回合分类
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (6)
 * attribution: placement 6
 */

//@ chunk-5xgkngpb.js:1938014-1938102 placement
/**
 * 是否因工具调用畸形而被耗尽（API 错误且带撤回的 uuid）。
 */
function isMalformedToolUseExhausted(row) {
  return row.isApiErrorMessage === true && Array.isArray(row.retractedMessageUuids);
}
//@ chunk-5xgkngpb.js:1938102-1938280 placement
function isRefusalTurn(msg) {
  return (
    msg.message.stop_reason === "refusal" ||
    msg.apiError === "dlp_request_denied" ||
    msg.apiError === "safety_monitor_blocked" ||
    msg.apiError === "unattended_start_limit" ||
    isMalformedToolUseExhausted(msg)
  );
}
//@ chunk-5xgkngpb.js:1938280-1938337 placement
/**
 * 是 API 错误但不是拒绝型。
 */
function isApiErrorWithoutRefusal(msg) {
  return msg.isApiErrorMessage === true && !isRefusalTurn(msg);
}
//@ chunk-5xgkngpb.js:1938337-1938430 placement
/**
 * 是否「无人值守启动未确认」的 API 错误。
 */
function isUnattendedStartUnconfirmed(msg) {
  return msg.isApiErrorMessage === true && msg.apiError === "unattended_start_unconfirmed";
}
//@ chunk-5xgkngpb.js:1938430-1938655 placement
function refusalKind(msg) {
  if (isMalformedToolUseExhausted(msg)) return "malformed_tool_use_exhausted";
  if (msg.apiError === "safety_monitor_blocked" || msg.apiError === "unattended_start_limit")
    return msg.apiError;
  return msg.apiError === "dlp_request_denied" ? "dlp_denied" : "refusal";
}
//@ chunk-5xgkngpb.js:1938655-1938778 placement
function apiErrorKind(msg) {
  switch (msg.error) {
    case "overloaded":
    case "rate_limit":
    case "server_error":
      return msg.error;
    default:
      return "other";
  }
}
export {
  isUnattendedStartUnconfirmed,
  isApiErrorWithoutRefusal,
  isMalformedToolUseExhausted,
  apiErrorKind,
  refusalKind,
};
