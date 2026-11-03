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
import { capabilityRejectedText, classifyBadRequest } from "../api/badRequestClassifier.js";
import { UPSTREAM_REQUEST_ID_HEADERS } from "./proxyRequest.js";
import { amazonRequestId } from "../api/errorUtils.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { gatewayLog } from "../gateway/gatewayBanner.js";
import { truncateToLength } from "../../utils/stringUtils.js";

//@ chunk-1ny7cxrt.js:1349195-1349330 placement = renderToolResultMessage (0.67)
/**
 * 构造 Anthropic 风格的 JSON 错误响应（与 RemoteTrigger 无关）。
 */
function jsonErrorResponse(status, type, message, o, r) {
  return Response.json(
    {
      type: "error",
      ...(o && {
        request_id: o,
      }),
      error: {
        type,
        message,
      },
    },
    {
      status,
      ...(r && {
        headers: r,
      }),
    },
  );
}
//@ chunk-1ny7cxrt.js:1349330-1349396 placement
/**
 * 取某状态码对客户端的错误文本：400 且带详情时尽量用分类说明，否则用内置文案。
 */
function upstreamErrorMessageFor(status, t) {
  return t !== undefined ? capabilityRejectedText(t) : (UPSTREAM_ERROR_MESSAGES[status] ?? "upstream error");
}
//@ chunk-1ny7cxrt.js:1349396-1349550 placement
/**
 * 去掉指定响应头与 anthropic-ratelimit-* 头。
 */
function stripResponseHeaders(headers, t) {
  let headers_2 = new Headers();
  headers.forEach((o, r) => {
    let lower = r.toLowerCase();
    if (!t.includes(lower) && !lower.startsWith("anthropic-ratelimit-")) headers_2.set(r, o);
  });
  return headers_2;
}
//@ chunk-1ny7cxrt.js:1349550-1349657 placement
/**
 * 网关添加的诊断响应头（上游名、类型、模型、请求 id）。
 */
var GATEWAY_DIAGNOSTIC_HEADERS = [
  "x-gateway-upstream",
  "x-gateway-upstream-kind",
  "x-gateway-model",
  "x-gateway-upstream-model",
  ...UPSTREAM_REQUEST_ID_HEADERS,
];
//@ chunk-1ny7cxrt.js:1349657-1349730 placement
/**
 * 把上游响应里的诊断头复制到网关响应。
 */
function copyDiagnosticHeaders(headers, headers_2) {
  for (let n of GATEWAY_DIAGNOSTIC_HEADERS) {
    let o = headers.get(n);
    if (o !== null) headers_2.set(n, o);
  }
}
//@ chunk-1ny7cxrt.js:1349730-1349966 placement
/**
 * 上游错误替换为通用错误文本（保留 429 的 retry-after 与诊断头）。
 */
function sanitizeUpstreamError(e, t) {
  e.body?.cancel().catch(() => {});
  let n = jsonErrorResponse(
    e.status,
    errorTypeForStatus(e.status),
    UPSTREAM_ERROR_MESSAGES[e.status] ?? "upstream error",
    t,
  );
  let o = e.headers.get("retry-after");
  if (e.status === 429 && o !== null) n.headers.set("retry-after", o);
  copyDiagnosticHeaders(e.headers, n.headers);
  return n;
}
//@ chunk-1ny7cxrt.js:1349966-1350193 placement
/**
 * 把上游 request-id 与 apim-request-id 写进 x-gateway-upstream-* 头。
 */
function withUpstreamRequestIds(e, headers) {
  let n = amazonRequestId(headers?.get("request-id"), headers);
  if (n !== null) e.headers.set("x-gateway-upstream-request-id", n);
  let o = amazonRequestId(headers?.get("apim-request-id"), headers);
  if (o !== null) e.headers.set("x-gateway-upstream-cloud-request-id", o);
  return e;
}
//@ chunk-1ny7cxrt.js:1350193-1350449 placement
/**
 * 读取响应体前 n 字节为文本。
 */
async function readBodyPrefix(body, t) {
  if (!body) return "";
  let reader = body.getReader();
  let o = [];
  let r = 0;
  try {
    while (r < t) {
      let { done: s, value: a } = await reader.read();
      if (s) break;
      o.push(a);
      r += a.byteLength;
    }
  } catch {
  } finally {
    reader.cancel().catch(() => {});
  }
  return new TextDecoder().decode(Buffer.concat(o)).slice(0, t);
}
//@ chunk-1ny7cxrt.js:1350449-1350670 placement
/**
 * Anthropic API 的错误类型集合。
 */
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
//@ chunk-1ny7cxrt.js:1350670-1351129 placement
/**
 * 400/413 上游错误：读出原错误、按能力分类生成给 CRI 调用方的安全错误文本并记录。
 */
async function sanitizeBadRequest(e, t, n) {
  let bodyPrefix = await readBodyPrefix(e.body, 65536);
  let r;
  let s = bodyPrefix;
  try {
    let c = jsonParse(bodyPrefix);
    if (typeof c?.error?.message === "string") s = c.error.message;
    if (typeof c?.error?.type === "string" && KNOWN_ERROR_TYPES.has(c.error.type)) r = c.error.type;
  } catch {}
  let a = classifyBadRequest(e.status, s, t?.split(","));
  gatewayLog(
    "warn",
    `upstream ${e.status} sanitized for CRI caller (${a ?? "no capability class"}) request_id=${n ?? "-"}: ${truncateToLength(s, 1000)}`,
  );
  let l = jsonErrorResponse(
    e.status,
    r ?? errorTypeForStatus(e.status),
    upstreamErrorMessageFor(e.status, a),
    n,
  );
  copyDiagnosticHeaders(e.headers, l.headers);
  return l;
}
//@ chunk-1ny7cxrt.js:1351129-1351591 placement
/**
 * 去掉组织 id 头；上游错误（≥300）改写为网关的标准错误响应。
 */
async function finalizeUpstreamResponse(e, t, n) {
  e.headers.delete("anthropic-organization-id");
  if (e.status < 300 || e.headers.get("x-gateway-upstream") === null) return e;
  let o = weakMap.get(e);
  if (o) {
    if (e.status === 400 || e.status === 413) {
      let r = classifyBadRequest(e.status, o.message, t.headers.get("anthropic-beta")?.split(","));
      let s = jsonErrorResponse(
        e.status,
        errorTypeForStatus(e.status),
        upstreamErrorMessageFor(e.status, r),
        n,
      );
      copyDiagnosticHeaders(e.headers, s.headers);
      return s;
    }
    return e;
  }
  if (e.status === 400 || e.status === 413)
    return sanitizeBadRequest(e, t.headers.get("anthropic-beta") ?? undefined, n);
  return sanitizeUpstreamError(e, n);
}
//@ chunk-1ny7cxrt.js:1351591-1351770 placement
/**
 * 带超时与外部取消信号的 fetch。
 */
async function fetchWithAbortTimeout(e, t, n, signal, r) {
  let abortController = new AbortController();
  let timer = setTimeout((l) => l.abort(), r, abortController);
  try {
    return await e(t, {
      ...n,
      signal: AbortSignal.any([signal, abortController.signal]),
    });
  } finally {
    clearTimeout(timer);
  }
}
//@ chunk-1ny7cxrt.js:1351770-1351851 placement
/**
 * 模型 id 无效时的固定错误文案。
 */
var ERROR_RETRY_AFTER_MS = 3600000;
var weakMap = new WeakMap();
var INVALID_MODEL_ID_MESSAGE = "400 The provided model identifier is invalid.";
//@ chunk-1ny7cxrt.js:1374403-1374986 placement
/**
 * 上游状态码到错误类型与通用错误文本的映射。
 */
var ERROR_TYPE_BY_STATUS = {
  400: "invalid_request_error",
  401: "authentication_error",
  403: "permission_error",
  404: "not_found_error",
  413: "request_too_large",
  429: "rate_limit_error",
  501: "not_supported",
  529: "overloaded_error",
};
var UPSTREAM_ERROR_MESSAGES = {
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
/**
 * 状态码到 API 错误类型的映射，未知默认 api_error。
 */
function errorTypeForStatus(status) {
  return (status !== undefined && ERROR_TYPE_BY_STATUS[status]) || "api_error";
}
//@ chunk-1ny7cxrt.js:1375039-1375332 placement
/**
 * 上游错误给客户端的文本（400/413 时尽量用 API 原文或能力分类说明）。
 */
function upstreamErrorMessage(status, error, n) {
  if (status !== 400 && status !== 413) return UPSTREAM_ERROR_MESSAGES[status] ?? "upstream error";
  let error_2 = error.error;
  if (
    error_2?.type === "error" &&
    typeof error_2.error?.message === "string" &&
    error_2.error.message !== "" &&
    typeof error_2.error.type === "string" &&
    KNOWN_ERROR_TYPES.has(error_2.error.type)
  )
    return truncateToLength(error_2.error.message, 1000);
  return upstreamErrorMessageFor(status, classifyBadRequest(status, error.message, n?.split(",")));
}
export {
  ERROR_RETRY_AFTER_MS,
  jsonErrorResponse,
  weakMap,
  INVALID_MODEL_ID_MESSAGE,
  copyDiagnosticHeaders,
  fetchWithAbortTimeout,
  stripResponseHeaders,
  withUpstreamRequestIds,
  errorTypeForStatus,
  UPSTREAM_ERROR_MESSAGES,
  upstreamErrorMessage,
  finalizeUpstreamResponse,
  GATEWAY_DIAGNOSTIC_HEADERS,
};
