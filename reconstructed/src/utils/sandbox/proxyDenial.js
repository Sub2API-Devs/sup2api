/**
 * utils/sandbox/proxyDenial.ts
 *
 * 沙箱代理拒绝解析（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0hrnrhfq.js (23)
 * attribution: placement 23
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, union } from "../../../vendor/zod/v4/classic/schemas.js";
import { safeParseJSON } from "../json.js";
import { isSnakeCaseReasonCode } from "../../bridge/codeSessionApi.js";
import { truncateToLength } from "../stringUtils.js";
import { printableName } from "../printableName.js";
import { findProxyError } from "../proxy.js";
import { logForDebugging } from "../debug.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0hrnrhfq.js:482-656 placement
/**
 * 代理拒绝响应解析用的常量：读取正文的字节上限、截断保留长度、原因与代码的显示长度上限，以及 JSON 错误体的宽松 schema。
 */
var MAX_BODY_BYTES; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var TRUNCATE_MARGIN;
var MAX_REASON_LENGTH;
var MAX_CODE_LENGTH;
var ERROR_BODY_SCHEMA;
deferInit("chunk-0hrnrhfq.js:482", () => {
  MAX_BODY_BYTES = 8192;
  TRUNCATE_MARGIN = 512;
  MAX_REASON_LENGTH = 200;
  MAX_CODE_LENGTH = 120;
  ERROR_BODY_SCHEMA = DoctorLazy(() =>
    objectSchema({
      message: stringSchema().optional().catch(undefined),
      error: union([
        stringSchema(),
        objectSchema({
          message: stringSchema(),
        }),
      ])
        .optional()
        .catch(undefined),
      detail: stringSchema().optional().catch(undefined),
    }),
  );
});
//@ chunk-0hrnrhfq.js:656-754 placement
/**
 * proxyDenialResult：构造代理拒绝结果。
 */
function proxyDenialResult(headers, body, sanitizeLine) {
  let mediaType = getMediaType(headers);
  return {
    mediaType,
    ...parseDenialBody(mediaType, body, sanitizeLine),
    proxyError: proxyErrorMessage(headers, sanitizeLine),
    requestId: getSafeRequestId(headers, sanitizeLine),
  };
}
//@ chunk-0hrnrhfq.js:754-843 placement
function proxyErrorMessage(headers, fallbackReason) {
  let proxyError = headers?.["x-proxy-error"];
  return typeof proxyError === "string"
    ? toDisplayReason(truncateBodyForDenial(proxyError), fallbackReason, MAX_CODE_LENGTH)
    : undefined;
}
//@ chunk-0hrnrhfq.js:843-967 placement
function getSafeRequestId(requestId, sanitize) {
  let headerValue = requestId?.["x-request-id"];
  return typeof headerValue === "string" &&
    /^[A-Za-z0-9._:-]{1,128}$/.test(headerValue) &&
    sanitize(headerValue) === headerValue
    ? headerValue
    : undefined;
}
//@ chunk-0hrnrhfq.js:967-1172 placement
function getMediaType(headers) {
  let contentType = headers?.["content-type"];
  if (typeof contentType !== "string") return "";
  let index = contentType.indexOf(";");
  return (index === -1 ? contentType : contentType.slice(0, index))
    .replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, "")
    .replace(/[A-Z]/g, (char) => char.toLowerCase());
}
//@ chunk-0hrnrhfq.js:1172-1206 placement
var EMPTY_DENIAL = {
  reason: undefined,
  code: undefined,
};
//@ chunk-0hrnrhfq.js:1206-1585 placement
/**
 * 解析代理拒绝响应正文：按内容类型处理 JSON（截断或含替换字符时放弃）、纯文本（作为原因）或已解析的对象，返回 reason 与 code。
 */
function parseDenialBody(mediaType, body, redact) {
  let isJson = mediaType === "application/json" || mediaType.endsWith("+json");
  let decoded = typeof body === "string" ? truncateBodyForDenial(body) : decodeBodyPrefix(body);
  if (decoded !== undefined) {
    let { text, truncated } = decoded;
    if (text.includes("\uFFFD") || text.includes("\x00")) return EMPTY_DENIAL;
    if (isJson || (mediaType === "" && text.trimStart().startsWith("{")))
      return truncated ? EMPTY_DENIAL : readDenialFields(safeParseJSON(text, false), redact);
    return {
      reason: mediaType === "text/plain" ? toDisplayReason(decoded, redact, MAX_REASON_LENGTH) : undefined,
      code: undefined,
    };
  }
  if (body !== null && typeof body === "object") return readDenialFields(body, redact);
  return EMPTY_DENIAL;
}
//@ chunk-0hrnrhfq.js:1585-1855 placement
function readDenialFields(body, sanitize) {
  let parsed = ERROR_BODY_SCHEMA().safeParse(body);
  if (!parsed.success) return EMPTY_DENIAL;
  let { message, error, detail } = parsed.data;
  let errorMessage = typeof error === "string" ? error : error?.message;
  let firstText = [message, errorMessage, detail].find(
    (candidate) => candidate !== undefined && candidate.trim() !== "",
  );
  return {
    reason:
      firstText === undefined
        ? undefined
        : toDisplayReason(truncateBodyForDenial(firstText), sanitize, MAX_REASON_LENGTH),
    code: typeof error === "string" && isSnakeCaseReasonCode(error) ? error : undefined,
  };
}
//@ chunk-0hrnrhfq.js:1855-1959 placement
function toDisplayReason({ text, truncated }, sanitize, maxLength) {
  let sanitized = sanitize(text);
  let clipped = truncated ? truncateToLength(sanitized, sanitized.length - TRUNCATE_MARGIN) : sanitized;
  let name = printableName(clipped, maxLength);
  return name === "" ? undefined : name;
}
//@ chunk-0hrnrhfq.js:1959-2015 placement
function truncateBodyForDenial(body) {
  return {
    text: truncateToLength(body, MAX_BODY_BYTES),
    truncated: body.length > MAX_BODY_BYTES,
  };
}
//@ chunk-0hrnrhfq.js:2015-2297 placement
function decodeBodyPrefix(body) {
  let bytes;
  if (body instanceof ArrayBuffer) bytes = new Uint8Array(body);
  else if (ArrayBuffer.isView(body)) bytes = new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
  else return;
  let isTruncated = bytes.byteLength > MAX_BODY_BYTES;
  let cutAt = isTruncated ? findUtf8Boundary(bytes, MAX_BODY_BYTES) : bytes.byteLength;
  return {
    text: new TextDecoder("utf-8").decode(bytes.subarray(0, cutAt)),
    truncated: isTruncated,
  };
}
//@ chunk-0hrnrhfq.js:2297-2452 placement
/**
 * 在字节数组的给定截断点向前查找 UTF-8 字符边界：若截断点落在多字节字符中间，返回该字符起始位置。
 */
function findUtf8Boundary(bytes, end) {
  let index = end - 1;
  let continuationBytes = 0;
  while (index >= 0 && continuationBytes < 3 && ((bytes[index] ?? 0) & 192) === 128) {
    index--;
    continuationBytes++;
  }
  if (index < 0) return end;
  let leadByte = bytes[index] ?? 0;
  let sequenceLength = leadByte >= 240 ? 4 : leadByte >= 224 ? 3 : leadByte >= 192 ? 2 : 1;
  return continuationBytes + 1 < sequenceLength ? index : end;
}
//@ chunk-0hrnrhfq.js:2452-2492 placement
var X_PROXY_ERROR = "x-proxy-error";
var X_DENY_REASON = "x-deny-reason";
//@ chunk-0hrnrhfq.js:2492-2588 placement
/**
 * isAllowlistBlockedResponse：403 且为白名单阻断。
 */
function isAllowlistBlockedResponse(status, headers) {
  return (
    status === 403 &&
    (headers?.[X_PROXY_ERROR] === "blocked-by-allowlist" || headers?.[X_DENY_REASON] === "host_not_allowed")
  );
}
//@ chunk-0hrnrhfq.js:2588-2665 placement
/**
 * isBlockedByProxyAllowlist：响应显示被代理白名单阻断。
 */
function isBlockedByProxyAllowlist(error) {
  let proxyError = findProxyError(error);
  return proxyError !== undefined && isAllowlistBlockedResponse(proxyError.connectStatus, proxyError.headers);
}
//@ chunk-0hrnrhfq.js:2665-2900 placement
function parseProxyDenial(status, denial) {
  if (status !== 403) return;
  if (denial.mediaType === "text/plain" && neverDenied(denial.reason)) return "proxy_denied";
  if (denial.code !== "content_scan_blocked") return;
  return denial.reason?.endsWith("(fail closed)") ? "content_scan_transient" : "content_scan_permanent";
}
//@ chunk-0hrnrhfq.js:2900-2923 placement
function neverDenied(reason) {
  return false;
}
//@ chunk-0hrnrhfq.js:2923-3116 placement
/**
 * 对 403 响应解析沙箱代理拒绝原因并记调试日志，返回拒绝类型。
 */
function logProxyDenial({ status, headers, data, redact, label }) {
  if (status !== 403) return;
  let result = proxyDenialResult(headers, data, redact);
  let proxyDenial = parseProxyDenial(status, result);
  if (proxyDenial !== undefined)
    logForDebugging(`${label}: sandbox proxy denied, ${proxyDenial} (${result.reason ?? "no reason"})`);
  return proxyDenial;
}
//@ chunk-0hrnrhfq.js:3116-3529 placement
var ARTIFACT_PROXY_DENIAL_TEXTS = {
  content_scan_transient:
    "artifact content fetch blocked: the sandbox proxy's content scan was unavailable (HTTP 403). This is transient; retry.",
  content_scan_permanent:
    "artifact content fetch blocked: the sandbox proxy's content scan refused this content (HTTP 403); retrying will not help.",
  proxy_denied:
    "artifact content fetch blocked by the sandbox proxy's policy (HTTP 403); retrying will not help.",
};
//@ chunk-0hrnrhfq.js:3529-3596 placement
/**
 * isClientErrorStatus：4xx 但排除 408/429。
 */
function isClientErrorStatus(status) {
  return status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 429;
}
//@ chunk-0hrnrhfq.js:3596-3688 placement
function headerValueMatching(headers, headerName, pattern) {
  let value = headers?.[headerName];
  return typeof value === "string" && value.length <= 64 && pattern.test(value) ? value : undefined;
}
//@ chunk-0hrnrhfq.js:3688-3734 placement
/**
 * proxyErrorCode：取 x-proxy-error 码。
 */
function proxyErrorCode(headers) {
  return headerValueMatching(headers, X_PROXY_ERROR, /^[a-z0-9_-]+$/);
}
//@ chunk-0hrnrhfq.js:3734-3779 placement
/**
 * proxyDenyReason：取 x-deny-reason。
 */
function proxyDenyReason(headers) {
  return headerValueMatching(headers, X_DENY_REASON, /^[a-z0-9_]+$/);
}
export {
  logProxyDenial,
  isAllowlistBlockedResponse,
  isBlockedByProxyAllowlist,
  proxyDenialResult,
  proxyDenyReason,
  proxyErrorCode,
  ARTIFACT_PROXY_DENIAL_TEXTS,
  isClientErrorStatus,
  parseProxyDenial,
};
