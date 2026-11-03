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
import { gn } from "../utils/shortHash.js";
import { errorMessage } from "../utils/errors.js";
import { isAlreadyPrintable } from "../utils/printableName.js";
import { logForDebugging } from "../utils/debug.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";

/**
 * 调试日志截断长度与需脱敏的字段名（session_ingress_token、environment_secret、access_token、secret、token）。
 */
//@ chunk-m8z86bna.js:406-553 fingerprint = SECRET_FIELD_NAMES (0.892)
var DEBUG_MSG_LIMIT = 2000,
  SECRET_FIELD_NAMES = ["session_ingress_token", "environment_secret", "access_token", "secret", "token"],
  SECRET_PATTERN = new RegExp(`"(${SECRET_FIELD_NAMES.join("|")})"\\s*:\\s*"[^"]*"`, "g");
//@ chunk-m8z86bna.js:553-607 layout
function redactSecrets(text) {
  return text.replace(SECRET_PATTERN, '"$1":"[REDACTED]"');
}
/**
 * 调试日志截断：换行转义，超长时截断并注明总长度。
 */
//@ chunk-m8z86bna.js:607-723 fingerprint = debugTruncate (1)
function debugTruncate(s) {
  let replaced = s.replaceAll(
    `
`,
    "\\n",
  );
  if (replaced.length <= DEBUG_MSG_LIMIT) return replaced;
  return replaced.slice(0, DEBUG_MSG_LIMIT) + `... (${replaced.length} chars)`;
}
/**
 * 对象/字符串转日志文本：先脱敏再截断到 2000 字符。
 */
//@ chunk-m8z86bna.js:723-849 layout = debugTruncate (1)
function debugBody(s) {
  let n = typeof s === "string" ? s : jsonStringify(s),
    r = redactSecrets(n);
  if (r.length <= DEBUG_MSG_LIMIT) return r;
  return r.slice(0, DEBUG_MSG_LIMIT) + `... (${r.length} chars)`;
}
/**
 * 把 ID 哈希成 sha12:xxx 用于日志。
 */
//@ chunk-m8z86bna.js:849-918 layout
function hashIdForLog(value) {
  return `sha12:${gn(typeof value === "string" ? value : `${jsonStringify(value)}`)}`;
}
/**
 * 安全输出日志用 token：只允许短的单词字符，否则输出 <类型>。
 */
//@ chunk-m8z86bna.js:918-1005 layout
function safeLogToken(e) {
  return typeof e === "string" && /^[\w.-]{1,64}$/.test(e) ? e : `<${typeof e}>`;
}
/**
 * 错误消息附带响应体的 error message（若是单行纯文本）。
 */
//@ chunk-m8z86bna.js:1005-1139 fingerprint = extractHttpStatus (1)
function describeAxiosError(err) {
  let n = errorMessage(err);
  if (err && typeof err === "object" && "response" in err) {
    let response = err.response,
      o = extractPlainErrorDetail(response?.data);
    if (o) return `${n}: ${o}`;
  }
  return n;
}
/**
 * 解析 Retry-After（秒数或 HTTP 日期）为毫秒。
 */
//@ chunk-m8z86bna.js:1139-1318 layout
function parseRetryAfterMs(header, now = Date.now()) {
  if (!header) return;
  let r = Number(header);
  if (Number.isFinite(r) && r >= 0) return r * 1000;
  let parse = Date.parse(header);
  if (Number.isFinite(parse)) {
    let s = parse - now;
    return s > 0 ? s : void 0;
  }
  return;
}
/**
 * 从错误响应体取 message（顶层或 error.message）。
 */
//@ chunk-m8z86bna.js:1318-1574 layout = extractErrorDetail (1)
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
/**
 * 取错误 message 并确保是可展示的单行纯文本。
 */
//@ chunk-m8z86bna.js:1574-1640 layout
function extractPlainErrorDetail(e) {
  let n = extractErrorDetail(e);
  return n ? plainServiceText(n, "error_message") : void 0;
}
/**
 * 服务端错误文本只有是单行且不超过 1024 单位时才显示，否则记 tengu_service_error_detail_not_plain。
 */
//@ chunk-m8z86bna.js:1640-1917 layout
function plainServiceText(text, source) {
  if (isAlreadyPrintable(text, 1024)) return text;
  (logForDebugging(
    `[error-detail] left the service's text (${source}) out of the error shown: it has ${text.length} UTF-16 units and is not one plain line of at most 1,024 units`,
  ),
    logEvent("tengu_service_error_detail_not_plain", { length: text.length, source: fromEnum(source) }));
  return;
}
/**
 * 从错误响应体取 error.details.error_code。
 */
//@ chunk-m8z86bna.js:1917-2168 layout
function extractErrorCode(e) {
  if (!e || typeof e !== "object" || !("error" in e)) return;
  let error = e.error;
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
/**
 * 记 tengu_bridge_repl_skipped（REPL 桥未启动的原因）。
 */
//@ chunk-m8z86bna.js:2168-2271 fingerprint = logBridgeSkip (1)
function logBridgeSkip(e, n, r, o) {
  if (n) logForDebugging(n);
  logEvent("tengu_bridge_repl_skipped", { reason: fromEnum(e), ...(r !== void 0 && { v2: r }), ...o });
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
