/**
 * services/claudeGateway/upstreamErrors.ts
 *
 * 2.1.316 新增：网关上游错误映射
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (16)
 * attribution: placement 16
 */
import { nVo, classifyBadRequest } from "../api/badRequestClassifier.js";
import { UPSTREAM_REQUEST_ID_HEADERS } from "./proxyRequest.js";
import { rqe } from "../api/errorUtils.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { gatewayLog } from "../gateway/gatewayBanner.js";
import { truncateToLength } from "../../utils/stringUtils.js";

/**
 * 构造 Anthropic 风格的 JSON 错误响应（与 RemoteTrigger 无关）。
 */
//@ chunk-1ny7cxrt.js:1349195-1349330 placement = renderToolResultMessage (0.67)
function jsonErrorResponse(e, t, n, o, r) {
  return Response.json(
    { type: "error", ...(o && { request_id: o }), error: { type: t, message: n } },
    { status: e, ...(r && { headers: r }) },
  );
}
//@ chunk-1ny7cxrt.js:1349330-1349396 placement
function h_(e, t) {
  return t !== void 0 ? nVo(t) : (UPSTREAM_ERROR_MESSAGES[e] ?? "upstream error");
}
/**
 * 去掉指定响应头与 anthropic-ratelimit-* 头。
 */
//@ chunk-1ny7cxrt.js:1349396-1349550 placement
function stripResponseHeaders(e, t) {
  let headers = new Headers();
  return (
    e.forEach((o, r) => {
      let lower = r.toLowerCase();
      if (!t.includes(lower) && !lower.startsWith("anthropic-ratelimit-")) headers.set(r, o);
    }),
    headers
  );
}
/**
 * 网关添加的诊断响应头（上游名、类型、模型、请求 id）。
 */
//@ chunk-1ny7cxrt.js:1349550-1349657 placement
var GATEWAY_DIAGNOSTIC_HEADERS = [
  "x-gateway-upstream",
  "x-gateway-upstream-kind",
  "x-gateway-model",
  "x-gateway-upstream-model",
  ...UPSTREAM_REQUEST_ID_HEADERS,
];
//@ chunk-1ny7cxrt.js:1349657-1349730 placement
function Bf(e, t) {
  for (let n of GATEWAY_DIAGNOSTIC_HEADERS) {
    let o = e.get(n);
    if (o !== null) t.set(n, o);
  }
}
/**
 * 上游错误替换为通用错误文本（保留 429 的 retry-after 与诊断头）。
 */
//@ chunk-1ny7cxrt.js:1349730-1349966 placement
function sanitizeUpstreamError(e, t) {
  e.body?.cancel().catch(() => {});
  let n = jsonErrorResponse(e.status, Bu(e.status), UPSTREAM_ERROR_MESSAGES[e.status] ?? "upstream error", t),
    o = e.headers.get("retry-after");
  if (e.status === 429 && o !== null) n.headers.set("retry-after", o);
  return (Bf(e.headers, n.headers), n);
}
/**
 * 把上游 request-id 与 apim-request-id 写进 x-gateway-upstream-* 头。
 */
//@ chunk-1ny7cxrt.js:1349966-1350193 placement
function withUpstreamRequestIds(e, t) {
  let n = rqe(t?.get("request-id"), t);
  if (n !== null) e.headers.set("x-gateway-upstream-request-id", n);
  let o = rqe(t?.get("apim-request-id"), t);
  if (o !== null) e.headers.set("x-gateway-upstream-cloud-request-id", o);
  return e;
}
/**
 * 读取响应体前 n 字节为文本。
 */
//@ chunk-1ny7cxrt.js:1350193-1350449 placement
async function readBodyPrefix(e, t) {
  if (!e) return "";
  let reader = e.getReader(),
    o = [],
    r = 0;
  try {
    while (r < t) {
      let { done: s, value: a } = await reader.read();
      if (s) break;
      (o.push(a), (r += a.byteLength));
    }
  } catch {
  } finally {
    reader.cancel().catch(() => {});
  }
  return new TextDecoder().decode(Buffer.concat(o)).slice(0, t);
}
/**
 * Anthropic API 的错误类型集合。
 */
//@ chunk-1ny7cxrt.js:1350449-1350670 placement
var KNOWN_ERROR_TYPES = new Set([
  "invalid_request_error",
  "authentication_error",
  "permission_error",
  "not_found_error",
  "request_too_large",
  "rate_limit_error",
  "not_supported",
  "overloaded_error",
  "api_error",
  "billing_error",
  "policy_blocked",
]);
/**
 * 400/413 上游错误：读出原错误、按能力分类生成给 CRI 调用方的安全错误文本并记录。
 */
//@ chunk-1ny7cxrt.js:1350670-1351129 placement
async function sanitizeBadRequest(e, t, n) {
  let o = await readBodyPrefix(e.body, 65536),
    r,
    s = o;
  try {
    let c = jsonParse(o);
    if (typeof c?.error?.message === "string") s = c.error.message;
    if (typeof c?.error?.type === "string" && KNOWN_ERROR_TYPES.has(c.error.type)) r = c.error.type;
  } catch {}
  let a = classifyBadRequest(e.status, s, t?.split(","));
  gatewayLog(
    "warn",
    `upstream ${e.status} sanitized for CRI caller (${a ?? "no capability class"}) request_id=${n ?? "-"}: ${truncateToLength(s, 1000)}`,
  );
  let l = jsonErrorResponse(e.status, r ?? Bu(e.status), h_(e.status, a), n);
  return (Bf(e.headers, l.headers), l);
}
/**
 * 去掉组织 id 头；上游错误（≥300）改写为网关的标准错误响应。
 */
//@ chunk-1ny7cxrt.js:1351129-1351591 placement
async function finalizeUpstreamResponse(e, t, n) {
  if (
    (e.headers.delete("anthropic-organization-id"),
    e.status < 300 || e.headers.get("x-gateway-upstream") === null)
  )
    return e;
  let o = weakMap.get(e);
  if (o) {
    if (e.status === 400 || e.status === 413) {
      let r = classifyBadRequest(e.status, o.message, t.headers.get("anthropic-beta")?.split(",")),
        s = jsonErrorResponse(e.status, Bu(e.status), h_(e.status, r), n);
      return (Bf(e.headers, s.headers), s);
    }
    return e;
  }
  if (e.status === 400 || e.status === 413)
    return sanitizeBadRequest(e, t.headers.get("anthropic-beta") ?? void 0, n);
  return sanitizeUpstreamError(e, n);
}
/**
 * 带超时与外部取消信号的 fetch。
 */
//@ chunk-1ny7cxrt.js:1351591-1351770 placement
async function fetchWithAbortTimeout(e, t, n, o, r) {
  let abortController = new AbortController(),
    a = setTimeout((l) => l.abort(), r, abortController);
  try {
    return await e(t, { ...n, signal: AbortSignal.any([o, abortController.signal]) });
  } finally {
    clearTimeout(a);
  }
}
//@ chunk-1ny7cxrt.js:1351770-1351851 placement
var Ja = 3600000,
  weakMap = new WeakMap(),
  KH = "400 The provided model identifier is invalid.";
/**
 * 上游状态码到错误类型与通用错误文本的映射。
 */
//@ chunk-1ny7cxrt.js:1374403-1374986 placement
var ERROR_TYPE_BY_STATUS = {
    400: "invalid_request_error",
    401: "authentication_error",
    403: "permission_error",
    404: "not_found_error",
    413: "request_too_large",
    429: "rate_limit_error",
    501: "not_supported",
    529: "overloaded_error",
  },
  UPSTREAM_ERROR_MESSAGES = {
    400: "upstream rejected the request",
    401: "upstream authentication failed \u2014 check the gateway operator",
    403: "upstream denied the request \u2014 check the gateway operator",
    404: "upstream resource not found",
    413: "request too large for this upstream",
    429: "upstream rate limit exceeded",
    500: "upstream error",
    501: "upstream does not support this endpoint",
    529: "upstream overloaded",
  };
//@ chunk-1ny7cxrt.js:1374986-1375039 placement
function Bu(e) {
  return (e !== void 0 && ERROR_TYPE_BY_STATUS[e]) || "api_error";
}
/**
 * 上游错误给客户端的文本（400/413 时尽量用 API 原文或能力分类说明）。
 */
//@ chunk-1ny7cxrt.js:1375039-1375332 placement
function upstreamErrorMessage(e, t, n) {
  if (e !== 400 && e !== 413) return UPSTREAM_ERROR_MESSAGES[e] ?? "upstream error";
  let error = t.error;
  if (
    error?.type === "error" &&
    typeof error.error?.message === "string" &&
    error.error.message !== "" &&
    typeof error.error.type === "string" &&
    KNOWN_ERROR_TYPES.has(error.error.type)
  )
    return truncateToLength(error.error.message, 1000);
  return h_(e, classifyBadRequest(e, t.message, n?.split(",")));
}

export {
  Ja,
  jsonErrorResponse,
  weakMap,
  KH,
  Bf,
  fetchWithAbortTimeout,
  stripResponseHeaders,
  withUpstreamRequestIds,
  Bu,
  UPSTREAM_ERROR_MESSAGES,
  upstreamErrorMessage,
  finalizeUpstreamResponse,
  GATEWAY_DIAGNOSTIC_HEADERS,
};
