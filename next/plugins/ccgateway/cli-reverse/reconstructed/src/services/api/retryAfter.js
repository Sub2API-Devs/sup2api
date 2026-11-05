/**
 * services/api/retryAfter.ts
 *
 * 2.1.316 新增：Retry-After 头解析
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (6)
 * attribution: placement 6
 */
import { APIError } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";

//@ chunk-5xgkngpb.js:226439-226474 placement
var X_CC_RETRY_AFTER_TOO_LONG = "x-cc-retry-after-too-long";
//@ chunk-5xgkngpb.js:226474-226733 placement
function parseRetryAfterMs(headers, now = Date.now()) {
  let retryAfterMs = parseFloat(headers.get("retry-after-ms") ?? "");
  if (!Number.isNaN(retryAfterMs) && retryAfterMs !== 0) return retryAfterMs;
  let retryAfter = headers.get("retry-after");
  if (!retryAfter) return;
  let seconds = parseFloat(retryAfter);
  if (!Number.isNaN(seconds)) return seconds * 1000;
  let timestamp = Date.parse(retryAfter);
  return Number.isNaN(timestamp) ? undefined : timestamp - now;
}
//@ chunk-5xgkngpb.js:226733-227183 placement
/**
 * 429/529 响应的 Retry-After 超过可等待时长时，改写响应头：x-should-retry=false 并写入 X_CC_RETRY_AFTER_TOO_LONG（毫秒），让 SDK 不再自行重试。
 */
function markRetryAfterTooLong(response, maxWaitMs) {
  let values =
    response.status === 429 || response.status === 529 ? parseRetryAfterMs(response.headers) : undefined;
  let hint =
    values !== undefined &&
    Number.isFinite(values) &&
    values >= Math.max(maxWaitMs, 0) &&
    response.headers.get("x-should-retry") !== "false";
  if (!hint && !response.headers.has(X_CC_RETRY_AFTER_TOO_LONG)) return response;
  let headers = new Headers(response.headers);
  headers.delete(X_CC_RETRY_AFTER_TOO_LONG);
  if (hint) {
    headers.set("x-should-retry", "false");
    headers.set(X_CC_RETRY_AFTER_TOO_LONG, String(Math.round(values)));
  }
  let response_2 = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  Object.defineProperty(response_2, "url", {
    value: response.url,
  });
  return response_2;
}
//@ chunk-5xgkngpb.js:227183-227373 placement
function retryAfterTooLongMs(error) {
  if (
    !(error instanceof APIError) ||
    (error.status !== 429 && error.status !== 529) ||
    !(error.headers instanceof Headers)
  )
    return;
  let seconds = parseFloat(error.headers.get(X_CC_RETRY_AFTER_TOO_LONG) ?? "");
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}
//@ chunk-5xgkngpb.js:227373-227477 placement
function stripRetryAfterTooLongHeader(error) {
  let headers = new Headers(error.headers);
  headers.delete(X_CC_RETRY_AFTER_TOO_LONG);
  return APIError.generate(error.status, error.error, undefined, headers);
}
//@ chunk-5xgkngpb.js:227477-227605 placement
function retryAfterBucket(tooLong) {
  if (tooLong <= 1e4) return "le_10s";
  if (tooLong <= 60000) return "le_1m";
  if (tooLong <= 300000) return "le_5m";
  return tooLong <= 3600000 ? "le_1h" : "gt_1h";
}
export {
  parseRetryAfterMs,
  retryAfterTooLongMs,
  retryAfterBucket,
  X_CC_RETRY_AFTER_TOO_LONG,
  stripRetryAfterTooLongHeader,
  markRetryAfterTooLong,
};
