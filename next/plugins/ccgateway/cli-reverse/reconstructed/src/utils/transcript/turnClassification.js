/**
 * utils/transcript/turnClassification.ts
 *
 * 2.1.316 新增：回合分类
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (6)
 * attribution: placement 6
 */

//@ chunk-e6aww6q8.js:1859253-1859341 placement
/**
 * 是否因工具调用畸形而被耗尽（API 错误且带撤回的 uuid）。
 */
function isMalformedToolUseExhausted(row) {
  return row.isApiErrorMessage === true && Array.isArray(row.retractedMessageUuids);
}
//@ chunk-e6aww6q8.js:1859341-1859519 placement
function isRefusalTurn(msg) {
  return (
    msg.message.stop_reason === "refusal" ||
    msg.apiError === "dlp_request_denied" ||
    msg.apiError === "safety_monitor_blocked" ||
    msg.apiError === "unattended_start_limit" ||
    isMalformedToolUseExhausted(msg)
  );
}
//@ chunk-e6aww6q8.js:1859519-1859576 placement
/**
 * 是 API 错误但不是拒绝型。
 */
function isApiErrorWithoutRefusal(msg) {
  return msg.isApiErrorMessage === true && !isRefusalTurn(msg);
}
//@ chunk-e6aww6q8.js:1859576-1859669 placement
/**
 * 是否「无人值守启动未确认」的 API 错误。
 */
function isUnattendedStartUnconfirmed(msg) {
  return msg.isApiErrorMessage === true && msg.apiError === "unattended_start_unconfirmed";
}
//@ chunk-e6aww6q8.js:1859669-1859894 placement
function refusalKind(msg) {
  if (isMalformedToolUseExhausted(msg)) return "malformed_tool_use_exhausted";
  if (msg.apiError === "safety_monitor_blocked" || msg.apiError === "unattended_start_limit")
    return msg.apiError;
  return msg.apiError === "dlp_request_denied" ? "dlp_denied" : "refusal";
}
//@ chunk-e6aww6q8.js:1859894-1860017 placement
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
  apiErrorKind,
  isApiErrorWithoutRefusal,
  refusalKind,
  isMalformedToolUseExhausted,
};
