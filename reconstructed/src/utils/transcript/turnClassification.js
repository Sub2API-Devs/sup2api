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
function isMalformedToolUseExhausted(e) {
  return e.isApiErrorMessage === true && Array.isArray(e.retractedMessageUuids);
}
//@ chunk-e6aww6q8.js:1859341-1859519 placement
function isRefusalTurn(e) {
  return (
    e.message.stop_reason === "refusal" ||
    e.apiError === "dlp_request_denied" ||
    e.apiError === "safety_monitor_blocked" ||
    e.apiError === "unattended_start_limit" ||
    isMalformedToolUseExhausted(e)
  );
}
//@ chunk-e6aww6q8.js:1859519-1859576 placement
/**
 * 是 API 错误但不是拒绝型。
 */
function isApiErrorWithoutRefusal(e) {
  return e.isApiErrorMessage === true && !isRefusalTurn(e);
}
//@ chunk-e6aww6q8.js:1859576-1859669 placement
/**
 * 是否「无人值守启动未确认」的 API 错误。
 */
function isUnattendedStartUnconfirmed(e) {
  return e.isApiErrorMessage === true && e.apiError === "unattended_start_unconfirmed";
}
//@ chunk-e6aww6q8.js:1859669-1859894 placement
function refusalKind(e) {
  if (isMalformedToolUseExhausted(e)) return "malformed_tool_use_exhausted";
  if (e.apiError === "safety_monitor_blocked" || e.apiError === "unattended_start_limit") return e.apiError;
  return e.apiError === "dlp_request_denied" ? "dlp_denied" : "refusal";
}
//@ chunk-e6aww6q8.js:1859894-1860017 placement
function apiErrorKind(e) {
  switch (e.error) {
    case "overloaded":
    case "rate_limit":
    case "server_error":
      return e.error;
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
