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
import { u, o, Ue } from "../../../vendor/zod/v4/classic/schemas.js";
import { safeParseJSON } from "../json.js";
import { xme } from "../../bridge/codeSessionApi.js";
import { truncateToLength } from "../stringUtils.js";
import { printableName } from "../printableName.js";
import { findProxyError } from "../proxy.js";
import { logForDebugging } from "../debug.js";

/**
 * 代理拒绝响应解析用的常量：读取正文的字节上限、截断保留长度、原因与代码的显示长度上限，以及 JSON 错误体的宽松 schema。
 */
//@ chunk-0hrnrhfq.js:482-656 placement
var MAX_BODY_BYTES = 8192,
  TRUNCATE_MARGIN = 512,
  MAX_REASON_LENGTH = 200,
  MAX_CODE_LENGTH = 120,
  ERROR_BODY_SCHEMA = DoctorLazy(() =>
    u({
      message: o()
        .optional()
        .catch(void 0),
      error: Ue([o(), u({ message: o() })])
        .optional()
        .catch(void 0),
      detail: o()
        .optional()
        .catch(void 0),
    }),
  );
//@ chunk-0hrnrhfq.js:656-754 placement
function Aae(n, e, r) {
  let i = getMediaType(n);
  return {
    mediaType: i,
    ...parseDenialBody(i, e, r),
    proxyError: h(n, r),
    requestId: getSafeRequestId(n, r),
  };
}
//@ chunk-0hrnrhfq.js:754-843 placement
function h(n, e) {
  let r = n?.["x-proxy-error"];
  return typeof r === "string" ? toDisplayReason(g(r), e, MAX_CODE_LENGTH) : void 0;
}
//@ chunk-0hrnrhfq.js:843-967 placement
function getSafeRequestId(n, e) {
  let r = n?.["x-request-id"];
  return typeof r === "string" && /^[A-Za-z0-9._:-]{1,128}$/.test(r) && e(r) === r ? r : void 0;
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
var f = { reason: void 0, code: void 0 };
/**
 * 解析代理拒绝响应正文：按内容类型处理 JSON（截断或含替换字符时放弃）、纯文本（作为原因）或已解析的对象，返回 reason 与 code。
 */
//@ chunk-0hrnrhfq.js:1206-1585 placement
function parseDenialBody(mediaType, body, redact) {
  let isJson = mediaType === "application/json" || mediaType.endsWith("+json"),
    decoded = typeof body === "string" ? g(body) : decodeBodyPrefix(body);
  if (decoded !== void 0) {
    let { text: text, truncated: truncated } = decoded;
    if (text.includes("\uFFFD") || text.includes("\x00")) return f;
    if (isJson || (mediaType === "" && text.trimStart().startsWith("{")))
      return truncated ? f : readDenialFields(safeParseJSON(text, !1), redact);
    return {
      reason: mediaType === "text/plain" ? toDisplayReason(decoded, redact, MAX_REASON_LENGTH) : void 0,
      code: void 0,
    };
  }
  if (body !== null && typeof body === "object") return readDenialFields(body, redact);
  return f;
}
//@ chunk-0hrnrhfq.js:1585-1855 placement
function readDenialFields(n, e) {
  let parsed = ERROR_BODY_SCHEMA().safeParse(n);
  if (!parsed.success) return f;
  let { message: message, error: error, detail: detail } = parsed.data,
    errorMessage = typeof error === "string" ? error : error?.message,
    firstText = [message, errorMessage, detail].find((x) => x !== void 0 && x.trim() !== "");
  return {
    reason: firstText === void 0 ? void 0 : toDisplayReason(g(firstText), e, MAX_REASON_LENGTH),
    code: typeof error === "string" && xme(error) ? error : void 0,
  };
}
//@ chunk-0hrnrhfq.js:1855-1959 placement
function toDisplayReason({ text: text, truncated: truncated }, r, i) {
  let s = r(text),
    d = truncated ? truncateToLength(s, s.length - TRUNCATE_MARGIN) : s,
    c = printableName(d, i);
  return c === "" ? void 0 : c;
}
//@ chunk-0hrnrhfq.js:1959-2015 placement
function g(n) {
  return { text: truncateToLength(n, MAX_BODY_BYTES), truncated: n.length > MAX_BODY_BYTES };
}
//@ chunk-0hrnrhfq.js:2015-2297 placement
function decodeBodyPrefix(n) {
  let bytes;
  if (n instanceof ArrayBuffer) bytes = new Uint8Array(n);
  else if (ArrayBuffer.isView(n)) bytes = new Uint8Array(n.buffer, n.byteOffset, n.byteLength);
  else return;
  let isTruncated = bytes.byteLength > MAX_BODY_BYTES,
    cutAt = isTruncated ? findUtf8Boundary(bytes, MAX_BODY_BYTES) : bytes.byteLength;
  return { text: new TextDecoder("utf-8").decode(bytes.subarray(0, cutAt)), truncated: isTruncated };
}
/**
 * 在字节数组的给定截断点向前查找 UTF-8 字符边界：若截断点落在多字节字符中间，返回该字符起始位置。
 */
//@ chunk-0hrnrhfq.js:2297-2452 placement
function findUtf8Boundary(n, e) {
  let r = e - 1,
    i = 0;
  while (r >= 0 && i < 3 && ((n[r] ?? 0) & 192) === 128) (r--, i++);
  if (r < 0) return e;
  let s = n[r] ?? 0,
    d = s >= 240 ? 4 : s >= 224 ? 3 : s >= 192 ? 2 : 1;
  return i + 1 < d ? r : e;
}
//@ chunk-0hrnrhfq.js:2452-2492 placement
var X_PROXY_ERROR = "x-proxy-error",
  X_DENY_REASON = "x-deny-reason";
//@ chunk-0hrnrhfq.js:2492-2588 placement
function iG(n, e) {
  return (
    n === 403 && (e?.[X_PROXY_ERROR] === "blocked-by-allowlist" || e?.[X_DENY_REASON] === "host_not_allowed")
  );
}
//@ chunk-0hrnrhfq.js:2588-2665 placement
function rat(n) {
  let e = findProxyError(n);
  return e !== void 0 && iG(e.connectStatus, e.headers);
}
//@ chunk-0hrnrhfq.js:2665-2900 placement
function parseProxyDenial(n, e) {
  if (n !== 403) return;
  if (e.mediaType === "text/plain" && z(e.reason)) return "proxy_denied";
  if (e.code !== "content_scan_blocked") return;
  return e.reason?.endsWith("(fail closed)") ? "content_scan_transient" : "content_scan_permanent";
}
//@ chunk-0hrnrhfq.js:2900-2923 placement
function z(n) {
  return !1;
}
/**
 * 对 403 响应解析沙箱代理拒绝原因并记调试日志，返回拒绝类型。
 */
//@ chunk-0hrnrhfq.js:2923-3116 placement
function logProxyDenial({ status: status, headers: headers, data: r, redact: redact, label: label }) {
  if (status !== 403) return;
  let d = Aae(headers, r, redact),
    c = parseProxyDenial(status, d);
  if (c !== void 0) logForDebugging(`${label}: sandbox proxy denied, ${c} (${d.reason ?? "no reason"})`);
  return c;
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
function L_i(n) {
  return n !== void 0 && n >= 400 && n < 500 && n !== 408 && n !== 429;
}
//@ chunk-0hrnrhfq.js:3596-3688 placement
function D(n, e, r) {
  let i = n?.[e];
  return typeof i === "string" && i.length <= 64 && r.test(i) ? i : void 0;
}
//@ chunk-0hrnrhfq.js:3688-3734 placement
function CRt(n) {
  return D(n, X_PROXY_ERROR, /^[a-z0-9_-]+$/);
}
//@ chunk-0hrnrhfq.js:3734-3779 placement
function Cae(n) {
  return D(n, X_DENY_REASON, /^[a-z0-9_]+$/);
}

export { logProxyDenial, iG, rat, Aae, Cae, CRt, ARTIFACT_PROXY_DENIAL_TEXTS, L_i, parseProxyDenial };
