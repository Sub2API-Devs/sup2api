/**
 * services/api/retryAfter.ts
 *
 * 2.1.316 新增：Retry-After 头解析
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (6)
 * attribution: placement 6
 */
import { Ot } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";

//@ chunk-e6aww6q8.js:225873-225908 placement
var X_CC_RETRY_AFTER_TOO_LONG = "x-cc-retry-after-too-long";
//@ chunk-e6aww6q8.js:225908-226167 placement
function parseRetryAfterMs(headers, now = Date.now()) {
  let r = parseFloat(headers.get("retry-after-ms") ?? "");
  if (!Number.isNaN(r) && r !== 0) return r;
  let s = headers.get("retry-after");
  if (!s) return;
  let h = parseFloat(s);
  if (!Number.isNaN(h)) return h * 1000;
  let parse = Date.parse(s);
  return Number.isNaN(parse) ? void 0 : parse - now;
}
/**
 * 429/529 响应的 Retry-After 超过可等待时长时，改写响应头：x-should-retry=false 并写入 X_CC_RETRY_AFTER_TOO_LONG（毫秒），让 SDK 不再自行重试。
 */
//@ chunk-e6aww6q8.js:226167-226617 placement
function markRetryAfterTooLong(response, maxWaitMs) {
  let r = response.status === 429 || response.status === 529 ? parseRetryAfterMs(response.headers) : void 0,
    s =
      r !== void 0 &&
      Number.isFinite(r) &&
      r >= Math.max(maxWaitMs, 0) &&
      response.headers.get("x-should-retry") !== "false";
  if (!s && !response.headers.has(X_CC_RETRY_AFTER_TOO_LONG)) return response;
  let headers = new Headers(response.headers);
  if ((headers.delete(X_CC_RETRY_AFTER_TOO_LONG), s))
    (headers.set("x-should-retry", "false"), headers.set(X_CC_RETRY_AFTER_TOO_LONG, String(Math.round(r))));
  let response_2 = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers,
  });
  return (Object.defineProperty(response_2, "url", { value: response.url }), response_2);
}
//@ chunk-e6aww6q8.js:226617-226807 placement
function retryAfterTooLongMs(e) {
  if (!(e instanceof Ot) || (e.status !== 429 && e.status !== 529) || !(e.headers instanceof Headers)) return;
  let n = parseFloat(e.headers.get(X_CC_RETRY_AFTER_TOO_LONG) ?? "");
  return Number.isFinite(n) && n >= 0 ? n : void 0;
}
//@ chunk-e6aww6q8.js:226807-226911 placement
function stripRetryAfterTooLongHeader(e) {
  let headers = new Headers(e.headers);
  return (headers.delete(X_CC_RETRY_AFTER_TOO_LONG), Ot.generate(e.status, e.error, void 0, headers));
}
//@ chunk-e6aww6q8.js:226911-227039 placement
function retryAfterBucket(e) {
  if (e <= 1e4) return "le_10s";
  if (e <= 60000) return "le_1m";
  if (e <= 300000) return "le_5m";
  return e <= 3600000 ? "le_1h" : "gt_1h";
}

export {
  retryAfterTooLongMs,
  retryAfterBucket,
  X_CC_RETRY_AFTER_TOO_LONG,
  stripRetryAfterTooLongHeader,
  parseRetryAfterMs,
  markRetryAfterTooLong,
};
