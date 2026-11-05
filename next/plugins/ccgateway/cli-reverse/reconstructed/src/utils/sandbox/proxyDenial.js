/**
 * utils/sandbox/proxyDenial.ts
 *
 * 沙箱代理拒绝解析（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-pwqspacd.js (23)
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

//@ chunk-pwqspacd.js:481-655 placement
/**
 * 代理拒绝响应解析用的常量：读取正文的字节上限、截断保留长度、原因与代码的显示长度上限，以及 JSON 错误体的宽松 schema。
 */
var MAX_BODY_BYTES; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var TRUNCATE_MARGIN;
var MAX_REASON_LENGTH;
var MAX_CODE_LENGTH;
var ERROR_BODY_SCHEMA;
deferInit("chunk-pwqspacd.js:481", () => {
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
//@ chunk-pwqspacd.js:655-753 placement
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
//@ chunk-pwqspacd.js:753-842 placement
function proxyErrorMessage(headers, fallbackReason) {
  let proxyError = headers?.["x-proxy-error"];
  return typeof proxyError === "string"
    ? toDisplayReason(truncateBodyForDenial(proxyError), fallbackReason, MAX_CODE_LENGTH)
    : undefined;
}
//@ chunk-pwqspacd.js:842-966 placement
function getSafeRequestId(requestId, sanitize) {
  let headerValue = requestId?.["x-request-id"];
  return typeof headerValue === "string" &&
    /^[A-Za-z0-9._:-]{1,128}$/.test(headerValue) &&
    sanitize(headerValue) === headerValue
    ? headerValue
    : undefined;
}
//@ chunk-pwqspacd.js:966-1171 placement
function getMediaType(headers) {
  let contentType = headers?.["content-type"];
  if (typeof contentType !== "string") return "";
  let index = contentType.indexOf(";");
  return (index === -1 ? contentType : contentType.slice(0, index))
    .replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, "")
    .replace(/[A-Z]/g, (char) => char.toLowerCase());
}
//@ chunk-pwqspacd.js:1171-1205 placement
var EMPTY_DENIAL = {
  reason: undefined,
  code: undefined,
};
//@ chunk-pwqspacd.js:1205-1584 placement
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
//@ chunk-pwqspacd.js:1584-1854 placement
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
//@ chunk-pwqspacd.js:1854-1957 placement
function toDisplayReason({ text, truncated }, sanitize, maxLength) {
  let sanitized = sanitize(text);
  let clipped = truncated ? truncateToLength(sanitized, sanitized.length - TRUNCATE_MARGIN) : sanitized;
  let name = printableName(clipped, maxLength);
  return name === "" ? undefined : name;
}
//@ chunk-pwqspacd.js:1957-2012 placement
function truncateBodyForDenial(body) {
  return {
    text: truncateToLength(body, MAX_BODY_BYTES),
    truncated: body.length > MAX_BODY_BYTES,
  };
}
//@ chunk-pwqspacd.js:2012-2294 placement
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
//@ chunk-pwqspacd.js:2294-2449 placement
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
//@ chunk-pwqspacd.js:2449-2489 placement
var X_PROXY_ERROR = "x-proxy-error";
var X_DENY_REASON = "x-deny-reason";
//@ chunk-pwqspacd.js:2489-2585 placement
/**
 * isAllowlistBlockedResponse：403 且为白名单阻断。
 */
function isAllowlistBlockedResponse(status, headers) {
  return (
    status === 403 &&
    (headers?.[X_PROXY_ERROR] === "blocked-by-allowlist" || headers?.[X_DENY_REASON] === "host_not_allowed")
  );
}
//@ chunk-pwqspacd.js:2585-2662 placement
/**
 * isBlockedByProxyAllowlist：响应显示被代理白名单阻断。
 */
function isBlockedByProxyAllowlist(error) {
  let proxyError = findProxyError(error);
  return proxyError !== undefined && isAllowlistBlockedResponse(proxyError.connectStatus, proxyError.headers);
}
//@ chunk-pwqspacd.js:2662-2897 placement
function parseProxyDenial(status, denial) {
  if (status !== 403) return;
  if (denial.mediaType === "text/plain" && neverDenied(denial.reason)) return "proxy_denied";
  if (denial.code !== "content_scan_blocked") return;
  return denial.reason?.endsWith("(fail closed)") ? "content_scan_transient" : "content_scan_permanent";
}
//@ chunk-pwqspacd.js:2897-2920 placement
function neverDenied(reason) {
  return false;
}
//@ chunk-pwqspacd.js:2920-3113 placement
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
//@ chunk-pwqspacd.js:3113-3526 placement
var ARTIFACT_PROXY_DENIAL_TEXTS = {
  content_scan_transient:
    "artifact content fetch blocked: the sandbox proxy's content scan was unavailable (HTTP 403). This is transient; retry.",
  content_scan_permanent:
    "artifact content fetch blocked: the sandbox proxy's content scan refused this content (HTTP 403); retrying will not help.",
  proxy_denied:
    "artifact content fetch blocked by the sandbox proxy's policy (HTTP 403); retrying will not help.",
};
//@ chunk-pwqspacd.js:3526-3593 placement
/**
 * isClientErrorStatus：4xx 但排除 408/429。
 */
function isClientErrorStatus(status) {
  return status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 429;
}
//@ chunk-pwqspacd.js:3593-3685 placement
function headerValueMatching(headers, headerName, pattern) {
  let value = headers?.[headerName];
  return typeof value === "string" && value.length <= 64 && pattern.test(value) ? value : undefined;
}
//@ chunk-pwqspacd.js:3685-3731 placement
/**
 * proxyErrorCode：取 x-proxy-error 码。
 */
function proxyErrorCode(headers) {
  return headerValueMatching(headers, X_PROXY_ERROR, /^[a-z0-9_-]+$/);
}
//@ chunk-pwqspacd.js:3731-3776 placement
/**
 * proxyDenyReason：取 x-deny-reason。
 */
function proxyDenyReason(headers) {
  return headerValueMatching(headers, X_DENY_REASON, /^[a-z0-9_]+$/);
}
export {
  isBlockedByProxyAllowlist,
  isAllowlistBlockedResponse,
  proxyDenialResult,
  proxyDenyReason,
  isClientErrorStatus,
  logProxyDenial,
  proxyErrorCode,
  ARTIFACT_PROXY_DENIAL_TEXTS,
  parseProxyDenial,
};
