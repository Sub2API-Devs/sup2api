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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1ny7cxrt.js:1349195-1349330 placement (2.1.88 match: renderToolResultMessage, 0.67)
/**
 * 构造 Anthropic 风格的 JSON 错误响应（与 RemoteTrigger 无关）。
 */
function jsonErrorResponse(status, type, message, requestId, extraHeaders) {
  return Response.json(
    {
      type: "error",
      ...(requestId && {
        request_id: requestId,
      }),
      error: {
        type,
        message,
      },
    },
    {
      status,
      ...(extraHeaders && {
        headers: extraHeaders,
      }),
    },
  );
}
//@ chunk-1ny7cxrt.js:1349330-1349396 placement
/**
 * 取某状态码对客户端的错误文本：400 且带详情时尽量用分类说明，否则用内置文案。
 */
function upstreamErrorMessageFor(status, rejected) {
  return rejected !== undefined
    ? capabilityRejectedText(rejected)
    : (UPSTREAM_ERROR_MESSAGES[status] ?? "upstream error");
}
//@ chunk-1ny7cxrt.js:1349396-1349550 placement
/**
 * 去掉指定响应头与 anthropic-ratelimit-* 头。
 */
function stripResponseHeaders(headers, dropList) {
  let headers_2 = new Headers();
  headers.forEach((value, name) => {
    let lower = name.toLowerCase();
    if (!dropList.includes(lower) && !lower.startsWith("anthropic-ratelimit-")) headers_2.set(name, value);
  });
  return headers_2;
}
//@ chunk-1ny7cxrt.js:1349550-1349657 placement
/**
 * 网关添加的诊断响应头（上游名、类型、模型、请求 id）。
 */
var GATEWAY_DIAGNOSTIC_HEADERS; // deferred: uses UPSTREAM_REQUEST_ID_HEADERS (./proxyRequest.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-1ny7cxrt.js:1349550", () => {
  GATEWAY_DIAGNOSTIC_HEADERS = [
    "x-gateway-upstream",
    "x-gateway-upstream-kind",
    "x-gateway-model",
    "x-gateway-upstream-model",
    ...UPSTREAM_REQUEST_ID_HEADERS,
  ];
});
//@ chunk-1ny7cxrt.js:1349657-1349730 placement
/**
 * 把上游响应里的诊断头复制到网关响应。
 */
function copyDiagnosticHeaders(headers, headers_2) {
  for (let name of GATEWAY_DIAGNOSTIC_HEADERS) {
    let value = headers.get(name);
    if (value !== null) headers_2.set(name, value);
  }
}
//@ chunk-1ny7cxrt.js:1349730-1349966 placement
/**
 * 上游错误替换为通用错误文本（保留 429 的 retry-after 与诊断头）。
 */
function sanitizeUpstreamError(upstreamResponse, requestId) {
  upstreamResponse.body?.cancel().catch(() => {});
  let response = jsonErrorResponse(
    upstreamResponse.status,
    errorTypeForStatus(upstreamResponse.status),
    UPSTREAM_ERROR_MESSAGES[upstreamResponse.status] ?? "upstream error",
    requestId,
  );
  let retryAfter = upstreamResponse.headers.get("retry-after");
  if (upstreamResponse.status === 429 && retryAfter !== null) response.headers.set("retry-after", retryAfter);
  copyDiagnosticHeaders(upstreamResponse.headers, response.headers);
  return response;
}
//@ chunk-1ny7cxrt.js:1349966-1350193 placement
/**
 * 把上游 request-id 与 apim-request-id 写进 x-gateway-upstream-* 头。
 */
function withUpstreamRequestIds(response, headers) {
  let requestId = amazonRequestId(headers?.get("request-id"), headers);
  if (requestId !== null) response.headers.set("x-gateway-upstream-request-id", requestId);
  let cloudRequestId = amazonRequestId(headers?.get("apim-request-id"), headers);
  if (cloudRequestId !== null) response.headers.set("x-gateway-upstream-cloud-request-id", cloudRequestId);
  return response;
}
//@ chunk-1ny7cxrt.js:1350193-1350449 placement
/**
 * 读取响应体前 n 字节为文本。
 */
async function readBodyPrefix(body, maxChars) {
  if (!body) return "";
  let reader = body.getReader();
  let chunks = [];
  let total = 0;
  try {
    while (total < maxChars) {
      let { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
    }
  } catch {
  } finally {
    reader.cancel().catch(() => {});
  }
  return new TextDecoder().decode(Buffer.concat(chunks)).slice(0, maxChars);
}
//@ chunk-1ny7cxrt.js:1350449-1350670 placement
/**
 * Anthropic API 的错误类型集合。
 */
var KNOWN_ERROR_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1ny7cxrt.js:1350449", () => {
  KNOWN_ERROR_TYPES = new Set([
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
});
//@ chunk-1ny7cxrt.js:1350670-1351129 placement
/**
 * 400/413 上游错误：读出原错误、按能力分类生成给 CRI 调用方的安全错误文本并记录。
 */
async function sanitizeBadRequest(response, capabilityList, requestId) {
  let bodyPrefix = await readBodyPrefix(response.body, 65536);
  let errorType;
  let message = bodyPrefix;
  try {
    let parsed = jsonParse(bodyPrefix);
    if (typeof parsed?.error?.message === "string") message = parsed.error.message;
    if (typeof parsed?.error?.type === "string" && KNOWN_ERROR_TYPES.has(parsed.error.type))
      errorType = parsed.error.type;
  } catch {}
  let capabilityClass = classifyBadRequest(response.status, message, capabilityList?.split(","));
  gatewayLog(
    "warn",
    `upstream ${response.status} sanitized for CRI caller (${capabilityClass ?? "no capability class"}) request_id=${requestId ?? "-"}: ${truncateToLength(message, 1000)}`,
  );
  let sanitized = jsonErrorResponse(
    response.status,
    errorType ?? errorTypeForStatus(response.status),
    upstreamErrorMessageFor(response.status, capabilityClass),
    requestId,
  );
  copyDiagnosticHeaders(response.headers, sanitized.headers);
  return sanitized;
}
//@ chunk-1ny7cxrt.js:1351129-1351591 placement
/**
 * 去掉组织 id 头；上游错误（≥300）改写为网关的标准错误响应。
 */
async function finalizeUpstreamResponse(response, request, requestId) {
  response.headers.delete("anthropic-organization-id");
  if (response.status < 300 || response.headers.get("x-gateway-upstream") === null) return response;
  let parsed = weakMap.get(response);
  if (parsed) {
    if (response.status === 400 || response.status === 413) {
      let rejection = classifyBadRequest(
        response.status,
        parsed.message,
        request.headers.get("anthropic-beta")?.split(","),
      );
      let sanitized = jsonErrorResponse(
        response.status,
        errorTypeForStatus(response.status),
        upstreamErrorMessageFor(response.status, rejection),
        requestId,
      );
      copyDiagnosticHeaders(response.headers, sanitized.headers);
      return sanitized;
    }
    return response;
  }
  if (response.status === 400 || response.status === 413)
    return sanitizeBadRequest(response, request.headers.get("anthropic-beta") ?? undefined, requestId);
  return sanitizeUpstreamError(response, requestId);
}
//@ chunk-1ny7cxrt.js:1351591-1351770 placement
/**
 * 带超时与外部取消信号的 fetch。
 */
async function fetchWithAbortTimeout(fetchFn, url, init, signal, timeoutMs) {
  let abortController = new AbortController();
  let timer = setTimeout((controller) => controller.abort(), timeoutMs, abortController);
  try {
    return await fetchFn(url, {
      ...init,
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
var ERROR_RETRY_AFTER_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var weakMap;
var INVALID_MODEL_ID_MESSAGE;
deferInit("chunk-1ny7cxrt.js:1351770", () => {
  ERROR_RETRY_AFTER_MS = 3600000;
  weakMap = new WeakMap();
  INVALID_MODEL_ID_MESSAGE = "400 The provided model identifier is invalid.";
});
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
function upstreamErrorMessage(status, error, accept) {
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
  return upstreamErrorMessageFor(status, classifyBadRequest(status, error.message, accept?.split(",")));
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
