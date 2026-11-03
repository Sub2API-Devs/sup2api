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
import { u, string, union } from "../../../vendor/zod/v4/classic/schemas.js";
import { safeParseJSON } from "../json.js";
import { isSnakeCaseReasonCode } from "../../bridge/codeSessionApi.js";
import { truncateToLength } from "../stringUtils.js";
import { printableName } from "../printableName.js";
import { findProxyError } from "../proxy.js";
import { logForDebugging } from "../debug.js";

//@ chunk-0hrnrhfq.js:482-656 placement
/**
 * 代理拒绝响应解析用的常量：读取正文的字节上限、截断保留长度、原因与代码的显示长度上限，以及 JSON 错误体的宽松 schema。
 */
var MAX_BODY_BYTES = 8192;
var TRUNCATE_MARGIN = 512;
var MAX_REASON_LENGTH = 200;
var MAX_CODE_LENGTH = 120;
var ERROR_BODY_SCHEMA = DoctorLazy(() =>
  u({
    message: string().optional().catch(undefined),
    error: union([
      string(),
      u({
        message: string(),
      }),
    ])
      .optional()
      .catch(undefined),
    detail: string().optional().catch(undefined),
  }),
);
//@ chunk-0hrnrhfq.js:656-754 placement
/**
 * proxyDenialResult：构造代理拒绝结果。
 */
function proxyDenialResult(headers, body, redact) {
  let mediaType = getMediaType(headers);
  return {
    mediaType,
    ...parseDenialBody(mediaType, body, redact),
    proxyError: proxyErrorMessage(headers, redact),
    requestId: getSafeRequestId(headers, redact),
  };
}
//@ chunk-0hrnrhfq.js:754-843 placement
function proxyErrorMessage(n, e) {
  let r = n?.["x-proxy-error"];
  return typeof r === "string" ? toDisplayReason(truncateBodyForDenial(r), e, MAX_CODE_LENGTH) : undefined;
}
//@ chunk-0hrnrhfq.js:843-967 placement
function getSafeRequestId(n, e) {
  let r = n?.["x-request-id"];
  return typeof r === "string" && /^[A-Za-z0-9._:-]{1,128}$/.test(r) && e(r) === r ? r : undefined;
}
//@ chunk-0hrnrhfq.js:967-1172 placement
function getMediaType(n) {
  let e = n?.["content-type"];
  if (typeof e !== "string") return "";
  let index = e.indexOf(";");
  return (index === -1 ? e : e.slice(0, index))
    .replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, "")
    .replace(/[A-Z]/g, (i) => i.toLowerCase());
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
function readDenialFields(n, redact) {
  let parsed = ERROR_BODY_SCHEMA().safeParse(n);
  if (!parsed.success) return EMPTY_DENIAL;
  let { message, error, detail } = parsed.data;
  let errorMessage = typeof error === "string" ? error : error?.message;
  let firstText = [message, errorMessage, detail].find((x) => x !== undefined && x.trim() !== "");
  return {
    reason:
      firstText === undefined
        ? undefined
        : toDisplayReason(truncateBodyForDenial(firstText), redact, MAX_REASON_LENGTH),
    code: typeof error === "string" && isSnakeCaseReasonCode(error) ? error : undefined,
  };
}
//@ chunk-0hrnrhfq.js:1855-1959 placement
function toDisplayReason({ text, truncated }, r, i) {
  let s = r(text);
  let d = truncated ? truncateToLength(s, s.length - TRUNCATE_MARGIN) : s;
  let c = printableName(d, i);
  return c === "" ? undefined : c;
}
//@ chunk-0hrnrhfq.js:1959-2015 placement
function truncateBodyForDenial(n) {
  return {
    text: truncateToLength(n, MAX_BODY_BYTES),
    truncated: n.length > MAX_BODY_BYTES,
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
function findUtf8Boundary(bytes, e) {
  let r = e - 1;
  let i = 0;
  while (r >= 0 && i < 3 && ((bytes[r] ?? 0) & 192) === 128) {
    r--;
    i++;
  }
  if (r < 0) return e;
  let s = bytes[r] ?? 0;
  let d = s >= 240 ? 4 : s >= 224 ? 3 : s >= 192 ? 2 : 1;
  return i + 1 < d ? r : e;
}
//@ chunk-0hrnrhfq.js:2452-2492 placement
var X_PROXY_ERROR = "x-proxy-error";
var X_DENY_REASON = "x-deny-reason";
//@ chunk-0hrnrhfq.js:2492-2588 placement
/**
 * isAllowlistBlockedResponse：403 且为白名单阻断。
 */
function isAllowlistBlockedResponse(n, headers) {
  return (
    n === 403 &&
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
function parseProxyDenial(status, e) {
  if (status !== 403) return;
  if (e.mediaType === "text/plain" && neverDenied(e.reason)) return "proxy_denied";
  if (e.code !== "content_scan_blocked") return;
  return e.reason?.endsWith("(fail closed)") ? "content_scan_transient" : "content_scan_permanent";
}
//@ chunk-0hrnrhfq.js:2900-2923 placement
function neverDenied(reason) {
  return false;
}
//@ chunk-0hrnrhfq.js:2923-3116 placement
/**
 * 对 403 响应解析沙箱代理拒绝原因并记调试日志，返回拒绝类型。
 */
function logProxyDenial({ status, headers, data: r, redact, label }) {
  if (status !== 403) return;
  let d = proxyDenialResult(headers, r, redact);
  let proxyDenial = parseProxyDenial(status, d);
  if (proxyDenial !== undefined)
    logForDebugging(`${label}: sandbox proxy denied, ${proxyDenial} (${d.reason ?? "no reason"})`);
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
function headerValueMatching(n, e, r) {
  let i = n?.[e];
  return typeof i === "string" && i.length <= 64 && r.test(i) ? i : undefined;
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
