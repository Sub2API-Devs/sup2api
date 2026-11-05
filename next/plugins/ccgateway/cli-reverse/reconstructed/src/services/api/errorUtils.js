/**
 * services/api/errorUtils.ts
 *
 * 连接错误细节提取与格式化：沿 cause 链取错误码（SSL、网络不可达、断流、休眠）、formatAPIError 生成面向用户的连接/SSL/超时文案、提取嵌套错误消息、限额头摘要。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/errorUtils.ts
 * pieces: chunk-7jxyna5q.js (2), chunk-k1t1w9mg.js (25), chunk-pcv9zvvv.js (14)
 * attribution: placement 26, fingerprint 3, layout 9, file-local 3
 */
import { STATUS_CODES } from "http";
import { APIError, APIConnectionError } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { is529Error } from "./withRetry.js";
import { isRateLimitError } from "./errors.js";
import { fromSanitizer_SANITIZER_OUTPUT_ONLY, lit } from "../analytics/safeMetadata.js";
import {
  BUN_CONNECTION_CLOSED_MESSAGE_PREFIX,
  findInCauseChain,
  getErrnoCode,
  toError,
} from "../../utils/errors.js";
import { isHostEntrypoint } from "../../utils/entrypointKinds.js";
import {
  isDisklessProcess,
  getRootSession,
  getLastInteractionTime,
  getLastApiCompletionTimestamp,
} from "../../bootstrap/state.js";
import { findStreamNoResponseError, retryWindowFor } from "./streamErrors.js";
import { logError } from "../../utils/log.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { isSessionActive } from "../../utils/sessionActivity.js";
import { isSessionsToken } from "../oauth/sessionsBearerHooks.js";
import { SERVER_ERROR_TYPES, POLICY_AUTH_DENIAL_CODES } from "../policyLimits/complianceTaints.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-k1t1w9mg.js:5042-5137 placement (2.1.88 match: TeamMemoryTooManyEntriesSchema, 0.458)
function getApiErrorCode(error) {
  if (!(error instanceof APIError) || !hasNestedError(error)) return;
  return error.error?.error?.details?.error_code;
}
//@ chunk-k1t1w9mg.js:5137-5168 placement
var API_ERROR_CODE_RE = /^[a-z][a-z0-9_]{0,63}$/;
//@ chunk-k1t1w9mg.js:5168-5244 placement
/**
 * 导出函数 `apiErrorCode`：参数 e，返回 typeof t === "string" && A.test(t) ? t : void 0。
 */
function apiErrorCode(error) {
  let apiErrorCode = getApiErrorCode(error);
  return typeof apiErrorCode === "string" && API_ERROR_CODE_RE.test(apiErrorCode) ? apiErrorCode : undefined;
}
//@ chunk-k1t1w9mg.js:5244-5352 placement
/**
 * 取错误的有效状态码：自带的状态码，否则 529 过载或 429 限流。
 */
function effectiveErrorStatus(error) {
  if (typeof error.status === "number") return error.status;
  if (is529Error(error)) return 529;
  if (isRateLimitError(error)) return 429;
  return;
}
//@ chunk-k1t1w9mg.js:5352-6373 placement
/**
 * 网络/SSL 错误码分组：证书相关错误、含 TLS 握手的全部 SSL 错误、不可达（拒绝/DNS/网络）与 socket 关闭、可重试的瞬态 socket 错误。
 */
var SSL_CERT_ERROR_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var STRICT_SSL_ERROR_CODES;
var ALL_SSL_ERROR_CODES;
var UNREACHABLE_ERROR_CODES;
var SOCKET_CLOSED_CODES;
var TRANSIENT_SOCKET_CODES;
deferInit("chunk-k1t1w9mg.js:5352", () => {
  SSL_CERT_ERROR_CODES = new Set([
    "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
    "UNABLE_TO_GET_ISSUER_CERT",
    "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
    "CERT_SIGNATURE_FAILURE",
    "CERT_NOT_YET_VALID",
    "CERT_HAS_EXPIRED",
    "CERT_REVOKED",
    "CERT_REJECTED",
    "CERT_UNTRUSTED",
    "DEPTH_ZERO_SELF_SIGNED_CERT",
    "SELF_SIGNED_CERT_IN_CHAIN",
    "CERT_CHAIN_TOO_LONG",
    "PATH_LENGTH_EXCEEDED",
    "ERR_TLS_CERT_ALTNAME_INVALID",
    "HOSTNAME_MISMATCH",
  ]);
  STRICT_SSL_ERROR_CODES = new Set([
    "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
    "UNABLE_TO_GET_ISSUER_CERT",
    "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
    "DEPTH_ZERO_SELF_SIGNED_CERT",
    "SELF_SIGNED_CERT_IN_CHAIN",
  ]);
  ALL_SSL_ERROR_CODES = new Set([
    ...SSL_CERT_ERROR_CODES,
    "ERR_TLS_HANDSHAKE_TIMEOUT",
    "ERR_SSL_WRONG_VERSION_NUMBER",
    "ERR_SSL_DECRYPTION_FAILED_OR_BAD_RECORD_MAC",
  ]);
  UNREACHABLE_ERROR_CODES = new Set([
    "ECONNREFUSED",
    "ConnectionRefused",
    "ENOTFOUND",
    "ENETUNREACH",
    "ENETDOWN",
    "EHOSTUNREACH",
    "EHOSTDOWN",
    "EAI_AGAIN",
    "FailedToOpenSocket",
    "ERR_PROXY_TUNNEL",
  ]);
  SOCKET_CLOSED_CODES = new Set(["ECONNRESET", "EPIPE", "ConnectionClosed", "ERR_SOCKET_CLOSED"]);
  TRANSIENT_SOCKET_CODES = new Set([
    ...SOCKET_CLOSED_CODES,
    "UND_ERR_SOCKET",
    "ETIMEDOUT",
    "ECONNABORTED",
    "StreamSuspended",
    "StreamTruncated",
  ]);
});
//@ chunk-k1t1w9mg.js:6373-6434 placement
/**
 * 导出函数 `reducibleErrorCode`：参数 e，返回 LK.has(e) || PU.has(e) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e) : lit("other")。
 */
function reducibleErrorCode(code) {
  return TRANSIENT_SOCKET_CODES.has(code) || UNREACHABLE_ERROR_CODES.has(code)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(code)
    : lit("other");
}
//@ chunk-k1t1w9mg.js:6434-6503 placement
/**
 * 导出函数 `sanitizableErrorCode`：参数 e，返回 PU.has(e) || LK.has(e) || SSL_CERT_ERROR_CODES.has(e) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e) : void 0。
 */
function sanitizableErrorCode(code) {
  return UNREACHABLE_ERROR_CODES.has(code) ||
    TRANSIENT_SOCKET_CODES.has(code) ||
    SSL_CERT_ERROR_CODES.has(code)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(code)
    : undefined;
}
//@ chunk-k1t1w9mg.js:6503-6645 placement
function formatApiErrorType(type, status) {
  let safeType = /^[a-z][a-z0-9_]{0,63}$/.test(type) ? type : "unknown";
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(
    `API error: type=${safeType} status=${typeof status === "number" ? status : "none"}`,
  );
}
//@ chunk-k1t1w9mg.js:6645-6773 placement
/**
 * 云凭证错误文案：AWS 凭据链解析失败与 Google OAuth 凭据获取失败，沿 cause 链用于识别与过滤。
 */
var CREDENTIAL_PROVIDER_ERRORS = "Failed to resolve AWS credentials from the credential provider chain.";
var GOOGLE_CREDENTIAL_ERROR_TEXT = "Failed to acquire Google OAuth credentials.";
//@ chunk-k1t1w9mg.js:6773-7169 fingerprint (2.1.88 match: extractConnectionErrorDetails, 0.813)
/**
 * 沿 cause 链（最多 5 层）提取 {code, message, isSSLError}；socket 意外关闭视为 ConnectionClosed。
 */
function extractConnectionErrorDetails(error) {
  if (!error || typeof error !== "object") return null;
  let current = error;
  let maxDepth = 5;
  let depth = 0;
  while (current && depth < maxDepth) {
    if (current instanceof Error) {
      if ("code" in current && typeof current.code === "string") {
        let code = current.code;
        let isSSLError = ALL_SSL_ERROR_CODES.has(code);
        return {
          code,
          message: current.message,
          isSSLError,
        };
      }
      if (current.message.startsWith(BUN_CONNECTION_CLOSED_MESSAGE_PREFIX))
        return {
          code: "ConnectionClosed",
          message: current.message,
          isSSLError: false,
        };
    }
    if (current instanceof Error && "cause" in current && current.cause !== current) {
      current = current.cause;
      depth++;
    } else break;
  }
  return null;
}
//@ chunk-k1t1w9mg.js:7169-7227 layout
/**
 * 错误码属于 ECONNREFUSED/ENOTFOUND/ENETUNREACH/EAI_AGAIN/代理隧道等网络不可达类。
 */
function isNetworkUnreachableError(error) {
  let details = extractConnectionErrorDetails(error);
  return details !== null && UNREACHABLE_ERROR_CODES.has(details.code);
}
//@ chunk-k1t1w9mg.js:7227-7376 layout
/**
 * 网络不可达类错误码（ENOTFOUND/EAI_AGAIN/ENETUNREACH/…/ConnectionRefused）。
 */
var NETWORK_DOWN_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-k1t1w9mg.js:7227", () => {
  NETWORK_DOWN_CODES = new Set([
    "ENOTFOUND",
    "EAI_AGAIN",
    "ENETUNREACH",
    "ENETDOWN",
    "EHOSTUNREACH",
    "EHOSTDOWN",
    "FailedToOpenSocket",
    "ECONNREFUSED",
    "ConnectionRefused",
  ]);
});
//@ chunk-k1t1w9mg.js:7376-7436 layout
/**
 * cause 链中的 ERR_PROXY_TUNNEL 错误。
 */
function findProxyTunnelError(error) {
  return findInCauseChain(error, (cause) => getErrnoCode(cause) === "ERR_PROXY_TUNNEL");
}
//@ chunk-k1t1w9mg.js:7436-7635 layout
/**
 * 连接错误为网络不可达（代理隧道 502/503 也算）：可按重连预算多重试。
 */
function isNetworkDownError(error) {
  if (!(error instanceof APIConnectionError)) return false;
  let code = extractConnectionErrorDetails(error)?.code;
  if (code !== "ERR_PROXY_TUNNEL") return code !== undefined && NETWORK_DOWN_CODES.has(code);
  let proxyTunnelError = findProxyTunnelError(error);
  let status =
    proxyTunnelError !== undefined && "status" in proxyTunnelError ? proxyTunnelError.status : undefined;
  return status === 502 || status === 503;
}
//@ chunk-k1t1w9mg.js:7635-7690 layout
/**
 * 错误码 StreamSuspended（电脑休眠断流）。
 */
function isStreamSuspendedError(error) {
  return extractConnectionErrorDetails(error)?.code === "StreamSuspended";
}
//@ chunk-k1t1w9mg.js:7690-7796 layout
/**
 * 网络不可达或连接中断类错误（排除休眠）。
 */
function isConnectionError(error) {
  let connectionErrorDetails = extractConnectionErrorDetails(error);
  return (
    connectionErrorDetails !== null &&
    connectionErrorDetails.code !== "StreamSuspended" &&
    (UNREACHABLE_ERROR_CODES.has(connectionErrorDetails.code) ||
      TRANSIENT_SOCKET_CODES.has(connectionErrorDetails.code))
  );
}
//@ chunk-k1t1w9mg.js:7796-8086 fingerprint (2.1.88 match: getSSLErrorHint, 0.743)
/**
 * SSL 错误时给出 NODE_EXTRA_CA_CERTS/代理建议。
 */
function getSSLErrorHint(error) {
  let details = extractConnectionErrorDetails(error);
  if (!details?.isSSLError) return null;
  return `SSL certificate error (${details.code}). If you are behind a corporate proxy or TLS-intercepting firewall, set NODE_EXTRA_CA_CERTS to your CA bundle path, or ask IT to allowlist *.anthropic.com. Run \`claude doctor\` for details.`;
}
//@ chunk-k1t1w9mg.js:8086-8118 layout
/**
 * bd() 为真取第二个，否则第一个。
 */
function pickByEntrypoint(hostValue, managedValue) {
  return isHostEntrypoint() ? managedValue : hostValue;
}
//@ chunk-k1t1w9mg.js:8118-8260 layout
/**
 * HTML 内容只保留 <title>，非 HTML 原样。
 */
function stripHtmlToTitle(message) {
  if (/<!DOCTYPE html|<html\b/i.test(message)) {
    let titleMatch = message.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) return titleMatch[1].trim();
    return "";
  }
  return message;
}
//@ chunk-k1t1w9mg.js:8260-8319 file-local
/**
 * 取错误消息，HTML 响应只留 <title>。
 */
function sanitizeAPIError(apiError) {
  let message = apiError.message;
  if (!message) return "";
  return stripHtmlToTitle(message);
}
//@ chunk-k1t1w9mg.js:8319-8426 file-local
/**
 * 对象有对象类型的 error 字段。
 */
function hasNestedError(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "object" &&
    value.error !== null
  );
}
//@ chunk-k1t1w9mg.js:8426-8666 file-local
/**
 * 嵌套错误消息：error.error.message 或 error.message（HTML 只留标题）。
 */
function extractNestedErrorMessage(error) {
  if (!hasNestedError(error)) return null;
  let nested = error.error;
  let deepMsg = nested?.error?.message;
  if (typeof deepMsg === "string" && deepMsg.length > 0) {
    let sanitized = stripHtmlToTitle(deepMsg);
    if (sanitized.length > 0) return sanitized;
  }
  let msg = nested?.message;
  if (typeof msg === "string" && msg.length > 0) {
    let sanitized = stripHtmlToTitle(msg);
    if (sanitized.length > 0) return sanitized;
  }
  return null;
}
//@ chunk-k1t1w9mg.js:8666-8695 layout
/**
 * "Connection dropped"。
 */
var CONNECTION_DROPPED_MESSAGE = "Connection dropped";
//@ chunk-k1t1w9mg.js:8695-12849 fingerprint (2.1.88 match: formatAPIError, 0.504)
/**
 * 面向用户的 API 错误文案：连接类（休眠断流、提前关闭、无响应、超时、SSL 证书逐码说明与 NODE_EXTRA_CA_CERTS 建议）、HTML 错误页、嵌套消息等。
 */
function formatAPIError(error) {
  let connectionDetails = extractConnectionErrorDetails(error);
  if (connectionDetails) {
    let { code, isSSLError } = connectionDetails;
    if (code === "StreamSuspended")
      return isDisklessProcess() ? "Connection lost" : "Connection lost while your computer was asleep";
    if (code === "StreamTruncated") return "Connection closed before the response finished";
    if (code === "StreamNoResponse") return "No response from API";
    if (code === "RouteTurnedAway") return "The API is temporarily unavailable";
    if (code === "BedrockUnexpectedContentType") return connectionDetails.message;
    if (code === "ETIMEDOUT")
      return isDisklessProcess()
        ? "Request timed out"
        : "Request timed out. Check your internet connection and proxy settings";
    if (isSSLError) {
      let hint = pickByEntrypoint(
        "set NODE_EXTRA_CA_CERTS to that CA bundle, or add it to the system certificate store \xB7 see https://code.claude.com/docs/en/network-config",
        "ask your IT team to add that CA to this computer's certificate store or to the CA file that your organization configured.",
      );
      let detail = `(${code}). The certificate comes from an authority Claude Code doesn't trust, usually a TLS-inspecting corporate proxy or a gateway signed by a private CA: ${hint}`;
      switch (code) {
        case "UNABLE_TO_VERIFY_LEAF_SIGNATURE":
        case "UNABLE_TO_GET_ISSUER_CERT_LOCALLY":
          return `Unable to connect to API: SSL certificate verification failed (${code}). The certificates the server sent don't lead to a trusted authority. If the server leaves out an intermediate certificate, which browsers fetch by themselves, whoever runs it must have it send its full chain. If it is a TLS-inspecting corporate proxy or a gateway signed by a private CA, ${hint}`;
        case "UNABLE_TO_GET_ISSUER_CERT":
          return `Unable to connect to API: SSL certificate verification failed (${code}). The certificates this computer trusts include a CA certificate whose own issuer is missing, often a leftover from a renewal: ${pickByEntrypoint("remove it from the system certificate store or the NODE_EXTRA_CA_CERTS file, or add its issuer there.", "ask your IT team to remove it from this computer's certificate store or the CA file that your organization configured, or to add its issuer there.")}`;
        case "CERT_HAS_EXPIRED":
          return "Unable to connect to API: SSL certificate has expired";
        case "CERT_REVOKED":
          return "Unable to connect to API: SSL certificate has been revoked";
        case "DEPTH_ZERO_SELF_SIGNED_CERT":
        case "SELF_SIGNED_CERT_IN_CHAIN":
          return `Unable to connect to API: Self-signed certificate detected ${detail}`;
        case "ERR_TLS_CERT_ALTNAME_INVALID":
        case "HOSTNAME_MISMATCH":
          return "Unable to connect to API: SSL certificate hostname mismatch";
        case "CERT_NOT_YET_VALID":
          return "Unable to connect to API: SSL certificate is not yet valid";
        default:
          return `Unable to connect to API: SSL error (${code})`;
      }
    }
  }
  if (error.message === CREDENTIAL_PROVIDER_ERRORS || error.message === GOOGLE_CREDENTIAL_ERROR_TEXT) {
    let inCauseChain = findInCauseChain(
      error.cause,
      (cause) =>
        cause.message.trim().length > 0 &&
        cause.message !== CREDENTIAL_PROVIDER_ERRORS &&
        cause.message !== GOOGLE_CREDENTIAL_ERROR_TEXT,
    );
    if (inCauseChain) {
      let sanitizedMessage = stripHtmlToTitle(inCauseChain.message.trim());
      if (sanitizedMessage.length > 0) return sanitizedMessage;
    }
  }
  if (error.message === "Connection error.") {
    let code = connectionDetails?.code;
    if (isDisklessProcess())
      return code === undefined ? "Unable to connect to API" : `Unable to connect to API (${code})`;
    if (code === undefined) return "Unable to connect to API. Check your internet connection";
    switch (code) {
      case "ECONNRESET":
      case "EPIPE":
      case "ECONNABORTED":
      case "ConnectionClosed":
      case "ERR_SOCKET_CLOSED":
      case "UND_ERR_SOCKET":
        return `${CONNECTION_DROPPED_MESSAGE} (${code})`;
      case "ECONNREFUSED":
      case "ConnectionRefused":
        return `Connection refused \u2014 a firewall or proxy may be blocking it (${code})`;
      case "ENOTFOUND":
      case "EAI_AGAIN":
      case "FailedToOpenSocket":
        return `Can't reach the API server \u2014 check your internet or DNS (${code})`;
      case "ENETUNREACH":
      case "ENETDOWN":
      case "EHOSTUNREACH":
      case "EHOSTDOWN":
        return `No internet route \u2014 check your connection or VPN (${code})`;
      case "ERR_PROXY_TUNNEL":
        return `Couldn't connect through your proxy (${code}) \u2014 the proxy refused the tunnel: check its credentials and that it allows this host`;
      default:
        return `Unable to connect to API (${code})`;
    }
  }
  if (!error.message)
    return extractNestedErrorMessage(error) ?? `API error (status ${error.status ?? "unknown"})`;
  if (error.message.includes('{"')) {
    let nestedErrorMessage = extractNestedErrorMessage(error);
    if (nestedErrorMessage)
      return error.status ? `${error.status} ${nestedErrorMessage}` : nestedErrorMessage;
  }
  let sanitized = sanitizeAPIError(error);
  let matches = /^(\d+ )?\s*</.test(error.message);
  if (sanitized.length === 0 && matches) {
    if (!error.status) return "API error (status unknown)";
    let statusText = STATUS_CODES[error.status];
    return statusText ? `${error.status} ${statusText}` : String(error.status);
  }
  if (sanitized !== error.message && sanitized.length > 0) {
    let statusPrefix = error.status ? String(error.status) : undefined;
    return statusPrefix && !sanitized.match(/\d+/g)?.includes(statusPrefix)
      ? `${statusPrefix} ${sanitized}`
      : sanitized;
  }
  return error.message.trimEnd();
}
//@ chunk-k1t1w9mg.js:12849-13353 placement
/**
 * API 错误的展示摘要：message/status/requestId/formatted、连接错误、是否断网、限额头（representative-claim、reset）、无响应等待。
 */
function summarizeApiError(error) {
  let headerGetter = (headerName) => error.headers?.get?.(headerName) ?? undefined;
  let rateLimitType = headerGetter("anthropic-ratelimit-unified-representative-claim");
  let resetsAtRaw = headerGetter("anthropic-ratelimit-unified-reset");
  let overageStatus = headerGetter("anthropic-ratelimit-unified-overage-status");
  let streamNoResponseError = findStreamNoResponseError(error);
  return {
    message: error.message,
    status: error.status,
    requestId: error.requestID ?? undefined,
    formatted: formatAPIError(error),
    connection: extractConnectionErrorDetails(error),
    isNetworkDown: isNetworkUnreachableError(error),
    rateLimits:
      rateLimitType || overageStatus
        ? {
            ...(rateLimitType && {
              rateLimitType,
            }),
            ...(resetsAtRaw && {
              resetsAt: Math.round(Number(resetsAtRaw)),
            }),
          }
        : null,
    noResponse: streamNoResponseError
      ? {
          waitedMs: retryWindowFor(streamNoResponseError.deadline),
          retryWaitMs: streamNoResponseError.deadline.retryWindowMs,
        }
      : null,
  };
}
//@ chunk-7jxyna5q.js:374890-374916 placement
var X_AMZN_REQUESTID = "x-amzn-requestid";
//@ chunk-7jxyna5q.js:374916-375006 placement
/**
 * 导出函数 `amazonRequestId`：参数 e, n，返回 e; try { return n?.get(X_AMZN_REQUESTID) || null; } catch (error) { return (logError(toError(error)), null); }…。
 */
function amazonRequestId(requestId, headers) {
  if (requestId) return requestId;
  try {
    return headers?.get(X_AMZN_REQUESTID) || null;
  } catch (error) {
    logError(toError(error));
    return null;
  }
}
//@ chunk-pcv9zvvv.js:1954-1972 placement
class IdleTaskState {
  run = null;
}
//@ chunk-pcv9zvvv.js:1972-1997 placement
var idleTaskSlot; // deferred: uses IdleTaskState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-pcv9zvvv.js:1972", () => {
  idleTaskSlot = new HostScoped(() => new IdleTaskState());
});
//@ chunk-pcv9zvvv.js:1997-2034 placement
function idleTask() {
  return idleTaskSlot.of(getRootSession().host);
}
//@ chunk-pcv9zvvv.js:2034-2074 placement
/**
 * 导出函数 `runIdleTask`。
 */
async function runIdleTask() {
  await idleTask().run?.();
}
//@ chunk-pcv9zvvv.js:2074-2145 placement
function setIdleTask(refetchAfterRegimeRefusal) {
  let idle = idleTask();
  idle.run = refetchAfterRegimeRefusal;
  return () => {
    if (idle.run === refetchAfterRegimeRefusal) idle.run = null;
  };
}
//@ chunk-pcv9zvvv.js:2705-2780 placement
/**
 * 导出函数 `isIdleLongerThan`：参数 e，返回 !isSessionActive() && Date.now() - max > e。
 */
function isIdleLongerThan(idleMs) {
  let max = Math.max(getLastInteractionTime(), getLastApiCompletionTimestamp() ?? 0);
  return !isSessionActive() && Date.now() - max > idleMs;
}
//@ chunk-pcv9zvvv.js:3117-3213 placement
/**
 * 响应 content-type 到内容种类（html/json/text/other）的匹配模式表。
 */
var CONTENT_TYPE_PATTERNS = [
  ["text/html", "html"],
  ["application/json", "json"],
  ["text/json", "json"],
  ["text/", "text"],
];
//@ chunk-pcv9zvvv.js:3213-3301 placement
function contentKindOf(contentType) {
  let lower = contentType.toLowerCase();
  return CONTENT_TYPE_PATTERNS.find(([needle]) => lower.includes(needle))?.[1] ?? "other";
}
//@ chunk-pcv9zvvv.js:3301-3380 placement
/**
 * 导出函数 `hasSessionsTokenRequestId`：参数 e，返回 !1; return isSessionsToken(e["request-id"])。
 */
function hasSessionsTokenRequestId(headers) {
  if (!headers || typeof headers !== "object") return false;
  return isSessionsToken(headers["request-id"]);
}
//@ chunk-pcv9zvvv.js:3380-3526 placement
/**
 * 从响应头提取是否带 request-id 与内容类型，供遥测使用。
 */
function responseHeaderFacts(headers) {
  if (!headers || typeof headers !== "object") return {};
  let headerMap = headers;
  return {
    requestIdPresent: hasSessionsTokenRequestId(headerMap),
    responseContentType: contentKindOf(String(headerMap["content-type"] ?? "")),
  };
}
//@ chunk-pcv9zvvv.js:3526-3618 placement
/**
 * 导出函数 `responseHeaderFactsOf`：参数 e，返回 {}; return responseHeaderFacts(r.headers)。
 */
function responseHeaderFactsOf(error) {
  let response = error?.response;
  if (!response || typeof response !== "object") return {};
  return responseHeaderFacts(response.headers);
}
//@ chunk-pcv9zvvv.js:3618-4228 placement
function extractServerErrorFields(error) {
  let response = error?.response;
  let error_2 = response?.data?.error;
  if (!error_2 || typeof error_2 !== "object") return {};
  let errorType = typeof error_2.type === "string" ? error_2.type : undefined;
  let errorCode = error_2.details?.error_code;
  let code =
    typeof errorCode === "string"
      ? errorCode
      : typeof error_2.error_code === "string"
        ? error_2.error_code
        : typeof error_2.code === "string"
          ? error_2.code
          : undefined;
  let message = typeof error_2.message === "string" ? error_2.message : undefined;
  let authDenial =
    code === undefined &&
    message !== undefined &&
    (errorType === "authentication_error" || errorType === "permission_error")
      ? classifyRevokedAccess(message)
      : undefined;
  return {
    serverErrorType:
      errorType === undefined ? undefined : SERVER_ERROR_TYPES.includes(errorType) ? errorType : "other",
    serverErrorCode:
      code === undefined ? undefined : POLICY_AUTH_DENIAL_CODES.includes(code) ? code : "other",
    ...(authDenial !== undefined && {
      serverAuthDenial: authDenial,
    }),
    ...(hasSessionsTokenRequestId(response?.headers) && {
      serverErrorStamped: true,
    }),
  };
}
//@ chunk-pcv9zvvv.js:4228-4331 placement
/**
 * 返回服务器明确标注的错误类型（非 other 时）。
 */
function stampedServerErrorType(facts) {
  return facts.serverErrorStamped === true && facts.serverErrorType !== "other"
    ? facts.serverErrorType
    : undefined;
}
//@ chunk-pcv9zvvv.js:4331-5204 placement
function classifyRevokedAccess(message) {
  if (message.startsWith("Organization access has been revoked")) return "org_access_revoked";
  if (message.startsWith("Workspace access has been revoked")) return "workspace_revoked";
  if (/^OAuth (?:access )?token has been revoked\b/.test(message)) return "token_revoked";
  if (/^OAuth (?:access )?token has expired\b/.test(message)) return "token_expired";
  if (message.startsWith("OAuth access token is invalid") || message.startsWith("Invalid bearer token"))
    return "token_invalid";
  if (message.startsWith("OAuth token application has been deactivated")) return "application_deactivated";
  if (message.startsWith("Account is no longer a member of the organization")) return "account_not_member";
  if (message.startsWith("Token lacks associated organization")) return "token_no_organization";
  if (message.startsWith("Token lacks associated account")) return "token_no_account";
  if (message.startsWith("Credential is invalid")) return "credential_invalid";
  return "other";
}
export {
  SSL_CERT_ERROR_CODES,
  extractNestedErrorMessage,
  amazonRequestId,
  apiErrorCode,
  getApiErrorCode,
  extractConnectionErrorDetails,
  TRANSIENT_SOCKET_CODES,
  UNREACHABLE_ERROR_CODES,
  isStreamSuspendedError,
  reducibleErrorCode,
  isConnectionError,
  summarizeApiError,
  getSSLErrorHint,
  sanitizableErrorCode,
  SOCKET_CLOSED_CODES,
  hasNestedError,
  effectiveErrorStatus,
  formatAPIError,
  sanitizeAPIError,
  STRICT_SSL_ERROR_CODES,
  CONNECTION_DROPPED_MESSAGE,
  runIdleTask,
  formatApiErrorType,
  GOOGLE_CREDENTIAL_ERROR_TEXT,
  findProxyTunnelError,
  isNetworkDownError,
  responseHeaderFacts,
  hasSessionsTokenRequestId,
  responseHeaderFactsOf,
  extractServerErrorFields,
  stampedServerErrorType,
  contentKindOf,
  isIdleLongerThan,
  setIdleTask,
};
