/**
 * services/api/errorUtils.ts
 *
 * 连接错误细节提取与格式化：沿 cause 链取错误码（SSL、网络不可达、断流、休眠）、formatAPIError 生成面向用户的连接/SSL/超时文案、提取嵌套错误消息、限额头摘要。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/errorUtils.ts
 * pieces: chunk-7t4fmt2f.js (14), chunk-gr2vfhah.js (25), chunk-s61vbvea.js (2)
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
import { HostScoped } from "../../utils/hostScoped.js";
import { isSessionActive } from "../../utils/sessionActivity.js";
import { isSessionsToken } from "../oauth/sessionsBearerHooks.js";
import { SERVER_ERROR_TYPES, POLICY_AUTH_DENIAL_CODES } from "../policyLimits/complianceTaints.js";
import { logError } from "../../utils/log.js";

//@ chunk-gr2vfhah.js:3506-3601 placement = TeamMemoryTooManyEntriesSchema (0.459)
function getApiErrorCode(e) {
  if (!(e instanceof APIError) || !hasNestedError(e)) return;
  return e.error?.error?.details?.error_code;
}
//@ chunk-gr2vfhah.js:3601-3632 placement
var API_ERROR_CODE_RE = /^[a-z][a-z0-9_]{0,63}$/;
//@ chunk-gr2vfhah.js:3632-3708 placement
/**
 * 导出函数 `apiErrorCode`：参数 e，返回 typeof t === "string" && A.test(t) ? t : void 0。
 */
function apiErrorCode(e) {
  let apiErrorCode = getApiErrorCode(e);
  return typeof apiErrorCode === "string" && API_ERROR_CODE_RE.test(apiErrorCode) ? apiErrorCode : undefined;
}
//@ chunk-gr2vfhah.js:3708-3816 placement
/**
 * 取错误的有效状态码：自带的状态码，否则 529 过载或 429 限流。
 */
function effectiveErrorStatus(e) {
  if (typeof e.status === "number") return e.status;
  if (is529Error(e)) return 529;
  if (isRateLimitError(e)) return 429;
  return;
}
//@ chunk-gr2vfhah.js:3816-4837 placement
/**
 * 网络/SSL 错误码分组：证书相关错误、含 TLS 握手的全部 SSL 错误、不可达（拒绝/DNS/网络）与 socket 关闭、可重试的瞬态 socket 错误。
 */
var SSL_CERT_ERROR_CODES = new Set([
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
var STRICT_SSL_ERROR_CODES = new Set([
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "UNABLE_TO_GET_ISSUER_CERT",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "SELF_SIGNED_CERT_IN_CHAIN",
]);
var ALL_SSL_ERROR_CODES = new Set([
  ...SSL_CERT_ERROR_CODES,
  "ERR_TLS_HANDSHAKE_TIMEOUT",
  "ERR_SSL_WRONG_VERSION_NUMBER",
  "ERR_SSL_DECRYPTION_FAILED_OR_BAD_RECORD_MAC",
]);
var UNREACHABLE_ERROR_CODES = new Set([
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
var SOCKET_CLOSED_CODES = new Set(["ECONNRESET", "EPIPE", "ConnectionClosed", "ERR_SOCKET_CLOSED"]);
var TRANSIENT_SOCKET_CODES = new Set([
  ...SOCKET_CLOSED_CODES,
  "UND_ERR_SOCKET",
  "ETIMEDOUT",
  "ECONNABORTED",
  "StreamSuspended",
  "StreamTruncated",
]);
//@ chunk-gr2vfhah.js:4837-4898 placement
/**
 * 导出函数 `reducibleErrorCode`：参数 e，返回 LK.has(e) || PU.has(e) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e) : lit("other")。
 */
function reducibleErrorCode(code) {
  return TRANSIENT_SOCKET_CODES.has(code) || UNREACHABLE_ERROR_CODES.has(code)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(code)
    : lit("other");
}
//@ chunk-gr2vfhah.js:4898-4967 placement
/**
 * 导出函数 `sanitizableErrorCode`：参数 e，返回 PU.has(e) || LK.has(e) || SSL_CERT_ERROR_CODES.has(e) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e) : void 0。
 */
function sanitizableErrorCode(e) {
  return UNREACHABLE_ERROR_CODES.has(e) || TRANSIENT_SOCKET_CODES.has(e) || SSL_CERT_ERROR_CODES.has(e)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e)
    : undefined;
}
//@ chunk-gr2vfhah.js:4967-5109 placement
function formatApiErrorType(e, status) {
  let r = /^[a-z][a-z0-9_]{0,63}$/.test(e) ? e : "unknown";
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(
    `API error: type=${r} status=${typeof status === "number" ? status : "none"}`,
  );
}
//@ chunk-gr2vfhah.js:5109-5237 placement
/**
 * 云凭证错误文案：AWS 凭据链解析失败与 Google OAuth 凭据获取失败，沿 cause 链用于识别与过滤。
 */
var CREDENTIAL_PROVIDER_ERRORS = "Failed to resolve AWS credentials from the credential provider chain.";
var GOOGLE_CREDENTIAL_ERROR_TEXT = "Failed to acquire Google OAuth credentials.";
//@ chunk-gr2vfhah.js:5237-5633 fingerprint = extractConnectionErrorDetails (0.813)
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
//@ chunk-gr2vfhah.js:5633-5691 layout
/**
 * 错误码属于 ECONNREFUSED/ENOTFOUND/ENETUNREACH/EAI_AGAIN/代理隧道等网络不可达类。
 */
function isNetworkUnreachableError(error) {
  let details = extractConnectionErrorDetails(error);
  return details !== null && UNREACHABLE_ERROR_CODES.has(details.code);
}
//@ chunk-gr2vfhah.js:5691-5840 layout
/**
 * 网络不可达类错误码（ENOTFOUND/EAI_AGAIN/ENETUNREACH/…/ConnectionRefused）。
 */
var NETWORK_DOWN_CODES = new Set([
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
//@ chunk-gr2vfhah.js:5840-5900 layout
/**
 * cause 链中的 ERR_PROXY_TUNNEL 错误。
 */
function findProxyTunnelError(e) {
  return findInCauseChain(e, (t) => getErrnoCode(t) === "ERR_PROXY_TUNNEL");
}
//@ chunk-gr2vfhah.js:5900-6099 layout
/**
 * 连接错误为网络不可达（代理隧道 502/503 也算）：可按重连预算多重试。
 */
function isNetworkDownError(e) {
  if (!(e instanceof APIConnectionError)) return false;
  let code = extractConnectionErrorDetails(e)?.code;
  if (code !== "ERR_PROXY_TUNNEL") return code !== undefined && NETWORK_DOWN_CODES.has(code);
  let proxyTunnelError = findProxyTunnelError(e);
  let status =
    proxyTunnelError !== undefined && "status" in proxyTunnelError ? proxyTunnelError.status : undefined;
  return status === 502 || status === 503;
}
//@ chunk-gr2vfhah.js:6099-6154 layout
/**
 * 错误码 StreamSuspended（电脑休眠断流）。
 */
function isStreamSuspendedError(error) {
  return extractConnectionErrorDetails(error)?.code === "StreamSuspended";
}
//@ chunk-gr2vfhah.js:6154-6260 layout
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
//@ chunk-gr2vfhah.js:6260-6550 fingerprint = getSSLErrorHint (0.743)
/**
 * SSL 错误时给出 NODE_EXTRA_CA_CERTS/代理建议。
 */
function getSSLErrorHint(error) {
  let details = extractConnectionErrorDetails(error);
  if (!details?.isSSLError) return null;
  return `SSL certificate error (${details.code}). If you are behind a corporate proxy or TLS-intercepting firewall, set NODE_EXTRA_CA_CERTS to your CA bundle path, or ask IT to allowlist *.anthropic.com. Run \`claude doctor\` for details.`;
}
//@ chunk-gr2vfhah.js:6550-6582 layout
/**
 * bd() 为真取第二个，否则第一个。
 */
function pickByEntrypoint(e, t) {
  return isHostEntrypoint() ? t : e;
}
//@ chunk-gr2vfhah.js:6582-6724 layout
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
//@ chunk-gr2vfhah.js:6724-6783 file-local
/**
 * 取错误消息，HTML 响应只留 <title>。
 */
function sanitizeAPIError(apiError) {
  let message = apiError.message;
  if (!message) return "";
  return stripHtmlToTitle(message);
}
//@ chunk-gr2vfhah.js:6783-6890 file-local
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
//@ chunk-gr2vfhah.js:6890-7130 file-local
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
//@ chunk-gr2vfhah.js:7130-7159 layout
/**
 * "Connection dropped"。
 */
var CONNECTION_DROPPED_MESSAGE = "Connection dropped";
//@ chunk-gr2vfhah.js:7159-11245 fingerprint = formatAPIError (0.518)
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
    if (code === "BedrockUnexpectedContentType") return connectionDetails.message;
    if (code === "ETIMEDOUT")
      return isDisklessProcess()
        ? "Request timed out"
        : "Request timed out. Check your internet connection and proxy settings";
    if (isSSLError) {
      let i = pickByEntrypoint(
        "set NODE_EXTRA_CA_CERTS to that CA bundle, or add it to the system certificate store \xB7 see https://code.claude.com/docs/en/network-config",
        "ask your IT team to add that CA to this computer's certificate store or to the CA file that your organization configured.",
      );
      let l = `(${code}). The certificate comes from an authority Claude Code doesn't trust, usually a TLS-inspecting corporate proxy or a gateway signed by a private CA: ${i}`;
      switch (code) {
        case "UNABLE_TO_VERIFY_LEAF_SIGNATURE":
        case "UNABLE_TO_GET_ISSUER_CERT_LOCALLY":
          return `Unable to connect to API: SSL certificate verification failed (${code}). The certificates the server sent don't lead to a trusted authority. If the server leaves out an intermediate certificate, which browsers fetch by themselves, whoever runs it must have it send its full chain. If it is a TLS-inspecting corporate proxy or a gateway signed by a private CA, ${i}`;
        case "UNABLE_TO_GET_ISSUER_CERT":
          return `Unable to connect to API: SSL certificate verification failed (${code}). The certificates this computer trusts include a CA certificate whose own issuer is missing, often a leftover from a renewal: ${pickByEntrypoint("remove it from the system certificate store or the NODE_EXTRA_CA_CERTS file, or add its issuer there.", "ask your IT team to remove it from this computer's certificate store or the CA file that your organization configured, or to add its issuer there.")}`;
        case "CERT_HAS_EXPIRED":
          return "Unable to connect to API: SSL certificate has expired";
        case "CERT_REVOKED":
          return "Unable to connect to API: SSL certificate has been revoked";
        case "DEPTH_ZERO_SELF_SIGNED_CERT":
        case "SELF_SIGNED_CERT_IN_CHAIN":
          return `Unable to connect to API: Self-signed certificate detected ${l}`;
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
      (o) =>
        o.message.trim().length > 0 &&
        o.message !== CREDENTIAL_PROVIDER_ERRORS &&
        o.message !== GOOGLE_CREDENTIAL_ERROR_TEXT,
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
  let r = sanitizeAPIError(error);
  let matches = /^(\d+ )?\s*</.test(error.message);
  if (r.length === 0 && matches) {
    if (!error.status) return "API error (status unknown)";
    let n = STATUS_CODES[error.status];
    return n ? `${error.status} ${n}` : String(error.status);
  }
  if (r !== error.message && r.length > 0) {
    let n = error.status ? String(error.status) : undefined;
    return n && !r.match(/\d+/g)?.includes(n) ? `${n} ${r}` : r;
  }
  return error.message.trimEnd();
}
//@ chunk-gr2vfhah.js:11245-11749 placement
/**
 * API 错误的展示摘要：message/status/requestId/formatted、连接错误、是否断网、限额头（representative-claim、reset）、无响应等待。
 */
function summarizeApiError(error) {
  let t = (i) => error.headers?.get?.(i) ?? undefined;
  let r = t("anthropic-ratelimit-unified-representative-claim");
  let s = t("anthropic-ratelimit-unified-reset");
  let n = t("anthropic-ratelimit-unified-overage-status");
  let streamNoResponseError = findStreamNoResponseError(error);
  return {
    message: error.message,
    status: error.status,
    requestId: error.requestID ?? undefined,
    formatted: formatAPIError(error),
    connection: extractConnectionErrorDetails(error),
    isNetworkDown: isNetworkUnreachableError(error),
    rateLimits:
      r || n
        ? {
            ...(r && {
              rateLimitType: r,
            }),
            ...(s && {
              resetsAt: Math.round(Number(s)),
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
//@ chunk-7t4fmt2f.js:1953-1971 placement
class IdleTaskState {
  run = null;
}
//@ chunk-7t4fmt2f.js:1971-1996 placement
var idleTaskSlot = new HostScoped(() => new IdleTaskState());
//@ chunk-7t4fmt2f.js:1996-2033 placement
function idleTask() {
  return idleTaskSlot.of(getRootSession().host);
}
//@ chunk-7t4fmt2f.js:2033-2073 placement
/**
 * 导出函数 `runIdleTask`。
 */
async function runIdleTask() {
  await idleTask().run?.();
}
//@ chunk-7t4fmt2f.js:2073-2144 placement
function setIdleTask(refetchAfterRegimeRefusal) {
  let r = idleTask();
  r.run = refetchAfterRegimeRefusal;
  return () => {
    if (r.run === refetchAfterRegimeRefusal) r.run = null;
  };
}
//@ chunk-7t4fmt2f.js:2704-2778 placement
/**
 * 导出函数 `isIdleLongerThan`：参数 e，返回 !isSessionActive() && Date.now() - max > e。
 */
function isIdleLongerThan(e) {
  let max = Math.max(getLastInteractionTime(), getLastApiCompletionTimestamp() ?? 0);
  return !isSessionActive() && Date.now() - max > e;
}
//@ chunk-7t4fmt2f.js:3115-3211 placement
/**
 * 响应 content-type 到内容种类（html/json/text/other）的匹配模式表。
 */
var CONTENT_TYPE_PATTERNS = [
  ["text/html", "html"],
  ["application/json", "json"],
  ["text/json", "json"],
  ["text/", "text"],
];
//@ chunk-7t4fmt2f.js:3211-3299 placement
function contentKindOf(contentType) {
  let lower = contentType.toLowerCase();
  return CONTENT_TYPE_PATTERNS.find(([n]) => lower.includes(n))?.[1] ?? "other";
}
//@ chunk-7t4fmt2f.js:3299-3378 placement
/**
 * 导出函数 `hasSessionsTokenRequestId`：参数 e，返回 !1; return isSessionsToken(e["request-id"])。
 */
function hasSessionsTokenRequestId(headers) {
  if (!headers || typeof headers !== "object") return false;
  return isSessionsToken(headers["request-id"]);
}
//@ chunk-7t4fmt2f.js:3378-3524 placement
/**
 * 从响应头提取是否带 request-id 与内容类型，供遥测使用。
 */
function responseHeaderFacts(headers) {
  if (!headers || typeof headers !== "object") return {};
  let r = headers;
  return {
    requestIdPresent: hasSessionsTokenRequestId(r),
    responseContentType: contentKindOf(String(r["content-type"] ?? "")),
  };
}
//@ chunk-7t4fmt2f.js:3524-3616 placement
/**
 * 导出函数 `responseHeaderFactsOf`：参数 e，返回 {}; return responseHeaderFacts(r.headers)。
 */
function responseHeaderFactsOf(error) {
  let response = error?.response;
  if (!response || typeof response !== "object") return {};
  return responseHeaderFacts(response.headers);
}
//@ chunk-7t4fmt2f.js:3616-4226 placement
function extractServerErrorFields(error) {
  let response = error?.response;
  let error_2 = response?.data?.error;
  if (!error_2 || typeof error_2 !== "object") return {};
  let o = typeof error_2.type === "string" ? error_2.type : undefined;
  let errorCode = error_2.details?.error_code;
  let p =
    typeof errorCode === "string"
      ? errorCode
      : typeof error_2.error_code === "string"
        ? error_2.error_code
        : typeof error_2.code === "string"
          ? error_2.code
          : undefined;
  let message = typeof error_2.message === "string" ? error_2.message : undefined;
  let y =
    p === undefined && message !== undefined && (o === "authentication_error" || o === "permission_error")
      ? classifyRevokedAccess(message)
      : undefined;
  return {
    serverErrorType: o === undefined ? undefined : SERVER_ERROR_TYPES.includes(o) ? o : "other",
    serverErrorCode: p === undefined ? undefined : POLICY_AUTH_DENIAL_CODES.includes(p) ? p : "other",
    ...(y !== undefined && {
      serverAuthDenial: y,
    }),
    ...(hasSessionsTokenRequestId(response?.headers) && {
      serverErrorStamped: true,
    }),
  };
}
//@ chunk-7t4fmt2f.js:4226-4329 placement
/**
 * 返回服务器明确标注的错误类型（非 other 时）。
 */
function stampedServerErrorType(e) {
  return e.serverErrorStamped === true && e.serverErrorType !== "other" ? e.serverErrorType : undefined;
}
//@ chunk-7t4fmt2f.js:4329-5202 placement
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
//@ chunk-s61vbvea.js:456221-456247 placement
var X_AMZN_REQUESTID = "x-amzn-requestid";
//@ chunk-s61vbvea.js:456247-456337 placement
/**
 * 导出函数 `amazonRequestId`：参数 e, n，返回 e; try { return n?.get(X_AMZN_REQUESTID) || null; } catch (error) { return (logError(toError(error)), null); }…。
 */
function amazonRequestId(e, headers) {
  if (e) return e;
  try {
    return headers?.get(X_AMZN_REQUESTID) || null;
  } catch (error) {
    logError(toError(error));
    return null;
  }
}
export {
  UNREACHABLE_ERROR_CODES,
  getSSLErrorHint,
  SSL_CERT_ERROR_CODES,
  sanitizableErrorCode,
  contentKindOf,
  extractServerErrorFields,
  responseHeaderFactsOf,
  TRANSIENT_SOCKET_CODES,
  extractConnectionErrorDetails,
  amazonRequestId,
  extractNestedErrorMessage,
  apiErrorCode,
  getApiErrorCode,
  isStreamSuspendedError,
  reducibleErrorCode,
  isConnectionError,
  summarizeApiError,
  responseHeaderFacts,
  hasSessionsTokenRequestId,
  stampedServerErrorType,
  SOCKET_CLOSED_CODES,
  isIdleLongerThan,
  setIdleTask,
  effectiveErrorStatus,
  formatAPIError,
  sanitizeAPIError,
  STRICT_SSL_ERROR_CODES,
  CONNECTION_DROPPED_MESSAGE,
  hasNestedError,
  GOOGLE_CREDENTIAL_ERROR_TEXT,
  findProxyTunnelError,
  isNetworkDownError,
  formatApiErrorType,
  runIdleTask,
};
