/**
 * bridge/debugUtils.ts
 *
 * Remote Control 调试日志工具：脱敏截断、ID 哈希、错误详情提取、retry-after 解析、跳过事件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/debugUtils.ts
 * pieces: chunk-m8z86bna.js (13)
 * attribution: fingerprint 4, layout 9
 */
import { jsonStringify } from "../utils/slowOperations.js";
import { shortHash } from "../utils/shortHash.js";
import { errorMessage } from "../utils/errors.js";
import { isAlreadyPrintable } from "../utils/printableName.js";
import { logForDebugging } from "../utils/debug.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-m8z86bna.js:406-553 fingerprint (2.1.88 match: SECRET_FIELD_NAMES, 0.892)
/**
 * 调试日志截断长度与需脱敏的字段名（session_ingress_token、environment_secret、access_token、secret、token）。
 */
var DEBUG_MSG_LIMIT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SECRET_FIELD_NAMES;
var SECRET_PATTERN;
deferInit("chunk-m8z86bna.js:406", () => {
  DEBUG_MSG_LIMIT = 2000;
  SECRET_FIELD_NAMES = ["session_ingress_token", "environment_secret", "access_token", "secret", "token"];
  SECRET_PATTERN = new RegExp(`"(${SECRET_FIELD_NAMES.join("|")})"\\s*:\\s*"[^"]*"`, "g");
});
//@ chunk-m8z86bna.js:553-607 layout
function redactSecrets(text) {
  return text.replace(SECRET_PATTERN, '"$1":"[REDACTED]"');
}
//@ chunk-m8z86bna.js:607-723 fingerprint (2.1.88 match: debugTruncate, 1)
/**
 * 调试日志截断：换行转义，超长时截断并注明总长度。
 */
function debugTruncate(s) {
  let flat = s.replaceAll(
    `
`,
    "\\n",
  );
  if (flat.length <= DEBUG_MSG_LIMIT) return flat;
  return flat.slice(0, DEBUG_MSG_LIMIT) + `... (${flat.length} chars)`;
}
//@ chunk-m8z86bna.js:723-849 layout (2.1.88 match: debugTruncate, 1)
/**
 * 对象/字符串转日志文本：先脱敏再截断到 2000 字符。
 */
function debugBody(data) {
  let raw = typeof data === "string" ? data : jsonStringify(data);
  let flat = redactSecrets(raw);
  if (flat.length <= DEBUG_MSG_LIMIT) return flat;
  return flat.slice(0, DEBUG_MSG_LIMIT) + `... (${flat.length} chars)`;
}
//@ chunk-m8z86bna.js:849-918 layout
/**
 * 把 ID 哈希成 sha12:xxx 用于日志。
 */
function hashIdForLog(value) {
  return `sha12:${shortHash(typeof value === "string" ? value : `${jsonStringify(value)}`)}`;
}
//@ chunk-m8z86bna.js:918-1005 layout
/**
 * 安全输出日志用 token：只允许短的单词字符，否则输出 <类型>。
 */
function safeLogToken(value) {
  return typeof value === "string" && /^[\w.-]{1,64}$/.test(value) ? value : `<${typeof value}>`;
}
//@ chunk-m8z86bna.js:1005-1139 fingerprint (2.1.88 match: extractHttpStatus, 1)
/**
 * 错误消息附带响应体的 error message（若是单行纯文本）。
 */
function describeAxiosError(err) {
  let message = errorMessage(err);
  if (err && typeof err === "object" && "response" in err) {
    let response = err.response;
    let plainErrorDetail = extractPlainErrorDetail(response?.data);
    if (plainErrorDetail) return `${message}: ${plainErrorDetail}`;
  }
  return message;
}
//@ chunk-m8z86bna.js:1139-1318 layout
/**
 * 解析 Retry-After（秒数或 HTTP 日期）为毫秒。
 */
function parseRetryAfterMs(header, now = Date.now()) {
  if (!header) return;
  let seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  let timestamp = Date.parse(header);
  if (Number.isFinite(timestamp)) {
    let deltaMs = timestamp - now;
    return deltaMs > 0 ? deltaMs : undefined;
  }
  return;
}
//@ chunk-m8z86bna.js:1318-1574 layout (2.1.88 match: extractErrorDetail, 1)
/**
 * 从错误响应体取 message（顶层或 error.message）。
 */
function extractErrorDetail(data) {
  if (!data || typeof data !== "object") return;
  if ("message" in data && typeof data.message === "string") return data.message;
  if (
    "error" in data &&
    data.error !== null &&
    typeof data.error === "object" &&
    "message" in data.error &&
    typeof data.error.message === "string"
  )
    return data.error.message;
  return;
}
//@ chunk-m8z86bna.js:1574-1640 layout
/**
 * 取错误 message 并确保是可展示的单行纯文本。
 */
function extractPlainErrorDetail(body) {
  let text = extractErrorDetail(body);
  return text ? plainServiceText(text, "error_message") : undefined;
}
//@ chunk-m8z86bna.js:1640-1917 layout
/**
 * 服务端错误文本只有是单行且不超过 1024 单位时才显示，否则记 tengu_service_error_detail_not_plain。
 */
function plainServiceText(text, source) {
  if (isAlreadyPrintable(text, 1024)) return text;
  logForDebugging(
    `[error-detail] left the service's text (${source}) out of the error shown: it has ${text.length} UTF-16 units and is not one plain line of at most 1,024 units`,
  );
  logEvent("tengu_service_error_detail_not_plain", {
    length: text.length,
    source: fromEnum(source),
  });
  return;
}
//@ chunk-m8z86bna.js:1917-2168 layout
/**
 * 从错误响应体取 error.details.error_code。
 */
function extractErrorCode(body) {
  if (!body || typeof body !== "object" || !("error" in body)) return;
  let error = body.error;
  if (!error || typeof error !== "object" || !("details" in error)) return;
  let details = error.details;
  if (
    details &&
    typeof details === "object" &&
    "error_code" in details &&
    typeof details.error_code === "string"
  )
    return details.error_code;
  return;
}
//@ chunk-m8z86bna.js:2168-2271 fingerprint (2.1.88 match: logBridgeSkip, 1)
/**
 * 记 tengu_bridge_repl_skipped（REPL 桥未启动的原因）。
 */
function logBridgeSkip(reason, debugMsg, v2, extraAttributes) {
  if (debugMsg) logForDebugging(debugMsg);
  logEvent("tengu_bridge_repl_skipped", {
    reason: fromEnum(reason),
    ...(v2 !== undefined && {
      v2,
    }),
    ...extraAttributes,
  });
}
export {
  parseRetryAfterMs,
  hashIdForLog,
  describeAxiosError,
  extractErrorDetail,
  extractPlainErrorDetail,
  logBridgeSkip,
  extractErrorCode,
  plainServiceText,
  debugBody,
  safeLogToken,
  debugTruncate,
};
