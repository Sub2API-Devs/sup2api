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
import { Ot, ef } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
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
import { Yxn, Poo } from "./streamErrors.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { isSessionActive } from "../../utils/sessionActivity.js";
import { isSessionsToken } from "../oauth/sessionsBearerHooks.js";
import { tbi, vur } from "../policyLimits/complianceTaints.js";
import { logError } from "../../utils/log.js";

//@ chunk-gr2vfhah.js:3506-3601 placement = TeamMemoryTooManyEntriesSchema (0.459)
function getApiErrorCode(e) {
  if (!(e instanceof Ot) || !hasNestedError(e)) return;
  return e.error?.error?.details?.error_code;
}
//@ chunk-gr2vfhah.js:3601-3632 placement
var A = /^[a-z][a-z0-9_]{0,63}$/;
//@ chunk-gr2vfhah.js:3632-3708 placement
function Loo(e) {
  let t = getApiErrorCode(e);
  return typeof t === "string" && A.test(t) ? t : void 0;
}
/**
 * 取错误的有效状态码：自带的状态码，否则 529 过载或 429 限流。
 */
//@ chunk-gr2vfhah.js:3708-3816 placement
function effectiveErrorStatus(e) {
  if (typeof e.status === "number") return e.status;
  if (is529Error(e)) return 529;
  if (isRateLimitError(e)) return 429;
  return;
}
//@ chunk-gr2vfhah.js:3816-4837 placement
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
  ]),
  EAi = new Set([
    "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
    "UNABLE_TO_GET_ISSUER_CERT",
    "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
    "DEPTH_ZERO_SELF_SIGNED_CERT",
    "SELF_SIGNED_CERT_IN_CHAIN",
  ]),
  T = new Set([
    ...SSL_CERT_ERROR_CODES,
    "ERR_TLS_HANDSHAKE_TIMEOUT",
    "ERR_SSL_WRONG_VERSION_NUMBER",
    "ERR_SSL_DECRYPTION_FAILED_OR_BAD_RECORD_MAC",
  ]),
  PU = new Set([
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
  ]),
  Zls = new Set(["ECONNRESET", "EPIPE", "ConnectionClosed", "ERR_SOCKET_CLOSED"]),
  LK = new Set([...Zls, "UND_ERR_SOCKET", "ETIMEDOUT", "ECONNABORTED", "StreamSuspended", "StreamTruncated"]);
//@ chunk-gr2vfhah.js:4837-4898 placement
function Thr(e) {
  return LK.has(e) || PU.has(e) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e) : lit("other");
}
//@ chunk-gr2vfhah.js:4898-4967 placement
function oIt(e) {
  return PU.has(e) || LK.has(e) || SSL_CERT_ERROR_CODES.has(e)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e)
    : void 0;
}
//@ chunk-gr2vfhah.js:4967-5109 placement
function formatApiErrorType(e, t) {
  let r = /^[a-z][a-z0-9_]{0,63}$/.test(e) ? e : "unknown";
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(
    `API error: type=${r} status=${typeof t === "number" ? t : "none"}`,
  );
}
//@ chunk-gr2vfhah.js:5109-5237 placement
var CREDENTIAL_PROVIDER_ERRORS = "Failed to resolve AWS credentials from the credential provider chain.",
  Ahr = "Failed to acquire Google OAuth credentials.";
/**
 * 沿 cause 链（最多 5 层）提取 {code, message, isSSLError}；socket 意外关闭视为 ConnectionClosed。
 */
//@ chunk-gr2vfhah.js:5237-5633 fingerprint = extractConnectionErrorDetails (0.813)
function extractConnectionErrorDetails(error) {
  if (!error || typeof error !== "object") return null;
  let current = error,
    maxDepth = 5,
    depth = 0;
  while (current && depth < maxDepth) {
    if (current instanceof Error) {
      if ("code" in current && typeof current.code === "string") {
        let code = current.code,
          isSSLError = T.has(code);
        return { code: code, message: current.message, isSSLError: isSSLError };
      }
      if (current.message.startsWith(BUN_CONNECTION_CLOSED_MESSAGE_PREFIX))
        return { code: "ConnectionClosed", message: current.message, isSSLError: !1 };
    }
    if (current instanceof Error && "cause" in current && current.cause !== current)
      ((current = current.cause), depth++);
    else break;
  }
  return null;
}
/**
 * 错误码属于 ECONNREFUSED/ENOTFOUND/ENETUNREACH/EAI_AGAIN/代理隧道等网络不可达类。
 */
//@ chunk-gr2vfhah.js:5633-5691 layout
function isNetworkUnreachableError(e) {
  let t = extractConnectionErrorDetails(e);
  return t !== null && PU.has(t.code);
}
/**
 * 网络不可达类错误码（ENOTFOUND/EAI_AGAIN/ENETUNREACH/…/ConnectionRefused）。
 */
//@ chunk-gr2vfhah.js:5691-5840 layout
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
/**
 * cause 链中的 ERR_PROXY_TUNNEL 错误。
 */
//@ chunk-gr2vfhah.js:5840-5900 layout
function findProxyTunnelError(e) {
  return findInCauseChain(e, (t) => getErrnoCode(t) === "ERR_PROXY_TUNNEL");
}
/**
 * 连接错误为网络不可达（代理隧道 502/503 也算）：可按重连预算多重试。
 */
//@ chunk-gr2vfhah.js:5900-6099 layout
function isNetworkDownError(e) {
  if (!(e instanceof ef)) return !1;
  let t = extractConnectionErrorDetails(e)?.code;
  if (t !== "ERR_PROXY_TUNNEL") return t !== void 0 && NETWORK_DOWN_CODES.has(t);
  let r = findProxyTunnelError(e),
    s = r !== void 0 && "status" in r ? r.status : void 0;
  return s === 502 || s === 503;
}
/**
 * 错误码 StreamSuspended（电脑休眠断流）。
 */
//@ chunk-gr2vfhah.js:6099-6154 layout
function isStreamSuspendedError(e) {
  return extractConnectionErrorDetails(e)?.code === "StreamSuspended";
}
/**
 * 网络不可达或连接中断类错误（排除休眠）。
 */
//@ chunk-gr2vfhah.js:6154-6260 layout
function isConnectionError(e) {
  let t = extractConnectionErrorDetails(e);
  return t !== null && t.code !== "StreamSuspended" && (PU.has(t.code) || LK.has(t.code));
}
/**
 * SSL 错误时给出 NODE_EXTRA_CA_CERTS/代理建议。
 */
//@ chunk-gr2vfhah.js:6260-6550 fingerprint = getSSLErrorHint (0.743)
function getSSLErrorHint(error) {
  let details = extractConnectionErrorDetails(error);
  if (!details?.isSSLError) return null;
  return `SSL certificate error (${details.code}). If you are behind a corporate proxy or TLS-intercepting firewall, set NODE_EXTRA_CA_CERTS to your CA bundle path, or ask IT to allowlist *.anthropic.com. Run \`claude doctor\` for details.`;
}
/**
 * bd() 为真取第二个，否则第一个。
 */
//@ chunk-gr2vfhah.js:6550-6582 layout
function pickByEntrypoint(e, t) {
  return isHostEntrypoint() ? t : e;
}
/**
 * HTML 内容只保留 <title>，非 HTML 原样。
 */
//@ chunk-gr2vfhah.js:6582-6724 layout
function stripHtmlToTitle(e) {
  if (/<!DOCTYPE html|<html\b/i.test(e)) {
    let match = e.match(/<title>([^<]+)<\/title>/i);
    if (match && match[1]) return match[1].trim();
    return "";
  }
  return e;
}
/**
 * 取错误消息，HTML 响应只留 <title>。
 */
//@ chunk-gr2vfhah.js:6724-6783 file-local
function sanitizeAPIError(apiError) {
  let message = apiError.message;
  if (!message) return "";
  return stripHtmlToTitle(message);
}
/**
 * 对象有对象类型的 error 字段。
 */
//@ chunk-gr2vfhah.js:6783-6890 file-local
function hasNestedError(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "object" &&
    value.error !== null
  );
}
/**
 * 嵌套错误消息：error.error.message 或 error.message（HTML 只留标题）。
 */
//@ chunk-gr2vfhah.js:6890-7130 file-local
function extractNestedErrorMessage(error) {
  if (!hasNestedError(error)) return null;
  let nested = error.error,
    deepMsg = nested?.error?.message;
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
/**
 * "Connection dropped"。
 */
//@ chunk-gr2vfhah.js:7130-7159 layout
var CONNECTION_DROPPED_MESSAGE = "Connection dropped";
/**
 * 面向用户的 API 错误文案：连接类（休眠断流、提前关闭、无响应、超时、SSL 证书逐码说明与 NODE_EXTRA_CA_CERTS 建议）、HTML 错误页、嵌套消息等。
 */
//@ chunk-gr2vfhah.js:7159-11245 fingerprint = formatAPIError (0.518)
function formatAPIError(error) {
  let connectionDetails = extractConnectionErrorDetails(error);
  if (connectionDetails) {
    let { code: code, isSSLError: isSSLError } = connectionDetails;
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
        ),
        l = `(${code}). The certificate comes from an authority Claude Code doesn't trust, usually a TLS-inspecting corporate proxy or a gateway signed by a private CA: ${i}`;
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
  if (error.message === CREDENTIAL_PROVIDER_ERRORS || error.message === Ahr) {
    let n = findInCauseChain(
      error.cause,
      (o) => o.message.trim().length > 0 && o.message !== CREDENTIAL_PROVIDER_ERRORS && o.message !== Ahr,
    );
    if (n) {
      let sanitizedMessage = stripHtmlToTitle(n.message.trim());
      if (sanitizedMessage.length > 0) return sanitizedMessage;
    }
  }
  if (error.message === "Connection error.") {
    let n = connectionDetails?.code;
    if (isDisklessProcess())
      return n === void 0 ? "Unable to connect to API" : `Unable to connect to API (${n})`;
    if (n === void 0) return "Unable to connect to API. Check your internet connection";
    switch (n) {
      case "ECONNRESET":
      case "EPIPE":
      case "ECONNABORTED":
      case "ConnectionClosed":
      case "ERR_SOCKET_CLOSED":
      case "UND_ERR_SOCKET":
        return `${CONNECTION_DROPPED_MESSAGE} (${n})`;
      case "ECONNREFUSED":
      case "ConnectionRefused":
        return `Connection refused \u2014 a firewall or proxy may be blocking it (${n})`;
      case "ENOTFOUND":
      case "EAI_AGAIN":
      case "FailedToOpenSocket":
        return `Can't reach the API server \u2014 check your internet or DNS (${n})`;
      case "ENETUNREACH":
      case "ENETDOWN":
      case "EHOSTUNREACH":
      case "EHOSTDOWN":
        return `No internet route \u2014 check your connection or VPN (${n})`;
      case "ERR_PROXY_TUNNEL":
        return `Couldn't connect through your proxy (${n}) \u2014 the proxy refused the tunnel: check its credentials and that it allows this host`;
      default:
        return `Unable to connect to API (${n})`;
    }
  }
  if (!error.message)
    return extractNestedErrorMessage(error) ?? `API error (status ${error.status ?? "unknown"})`;
  if (error.message.includes('{"')) {
    let n = extractNestedErrorMessage(error);
    if (n) return error.status ? `${error.status} ${n}` : n;
  }
  let r = sanitizeAPIError(error),
    matches = /^(\d+ )?\s*</.test(error.message);
  if (r.length === 0 && matches) {
    if (!error.status) return "API error (status unknown)";
    let n = STATUS_CODES[error.status];
    return n ? `${error.status} ${n}` : String(error.status);
  }
  if (r !== error.message && r.length > 0) {
    let n = error.status ? String(error.status) : void 0;
    return n && !r.match(/\d+/g)?.includes(n) ? `${n} ${r}` : r;
  }
  return error.message.trimEnd();
}
/**
 * API 错误的展示摘要：message/status/requestId/formatted、连接错误、是否断网、限额头（representative-claim、reset）、无响应等待。
 */
//@ chunk-gr2vfhah.js:11245-11749 placement
function summarizeApiError(e) {
  let t = (i) => e.headers?.get?.(i) ?? void 0,
    r = t("anthropic-ratelimit-unified-representative-claim"),
    s = t("anthropic-ratelimit-unified-reset"),
    n = t("anthropic-ratelimit-unified-overage-status"),
    o = Yxn(e);
  return {
    message: e.message,
    status: e.status,
    requestId: e.requestID ?? void 0,
    formatted: formatAPIError(e),
    connection: extractConnectionErrorDetails(e),
    isNetworkDown: isNetworkUnreachableError(e),
    rateLimits:
      r || n ? { ...(r && { rateLimitType: r }), ...(s && { resetsAt: Math.round(Number(s)) }) } : null,
    noResponse: o ? { waitedMs: Poo(o.deadline), retryWaitMs: o.deadline.retryWindowMs } : null,
  };
}
//@ chunk-7t4fmt2f.js:1953-1971 placement
class ht {
  run = null;
}
//@ chunk-7t4fmt2f.js:1971-1996 placement
var zt = new HostScoped(() => new ht());
//@ chunk-7t4fmt2f.js:1996-2033 placement
function ft() {
  return zt.of(getRootSession().host);
}
//@ chunk-7t4fmt2f.js:2033-2073 placement
async function Gts() {
  await ft().run?.();
}
//@ chunk-7t4fmt2f.js:2073-2144 placement
function mt(e) {
  let r = ft();
  return (
    (r.run = e),
    () => {
      if (r.run === e) r.run = null;
    }
  );
}
//@ chunk-7t4fmt2f.js:2704-2778 placement
function Wts(e) {
  let max = Math.max(getLastInteractionTime(), getLastApiCompletionTimestamp() ?? 0);
  return !isSessionActive() && Date.now() - max > e;
}
//@ chunk-7t4fmt2f.js:3115-3211 placement
var Qt = [
  ["text/html", "html"],
  ["application/json", "json"],
  ["text/json", "json"],
  ["text/", "text"],
];
//@ chunk-7t4fmt2f.js:3211-3299 placement
function Ge(e) {
  let lower = e.toLowerCase();
  return Qt.find(([n]) => lower.includes(n))?.[1] ?? "other";
}
//@ chunk-7t4fmt2f.js:3299-3378 placement
function k5e(e) {
  if (!e || typeof e !== "object") return !1;
  return isSessionsToken(e["request-id"]);
}
/**
 * 从响应头提取是否带 request-id 与内容类型，供遥测使用。
 */
//@ chunk-7t4fmt2f.js:3378-3524 placement
function responseHeaderFacts(e) {
  if (!e || typeof e !== "object") return {};
  let r = e;
  return { requestIdPresent: k5e(r), responseContentType: Ge(String(r["content-type"] ?? "")) };
}
//@ chunk-7t4fmt2f.js:3524-3616 placement
function eAn(e) {
  let r = e?.response;
  if (!r || typeof r !== "object") return {};
  return responseHeaderFacts(r.headers);
}
//@ chunk-7t4fmt2f.js:3616-4226 placement
function extractServerErrorFields(e) {
  let r = e?.response,
    n = r?.data?.error;
  if (!n || typeof n !== "object") return {};
  let o = typeof n.type === "string" ? n.type : void 0,
    u = n.details?.error_code,
    p =
      typeof u === "string"
        ? u
        : typeof n.error_code === "string"
          ? n.error_code
          : typeof n.code === "string"
            ? n.code
            : void 0,
    h = typeof n.message === "string" ? n.message : void 0,
    y =
      p === void 0 && h !== void 0 && (o === "authentication_error" || o === "permission_error")
        ? classifyRevokedAccess(h)
        : void 0;
  return {
    serverErrorType: o === void 0 ? void 0 : tbi.includes(o) ? o : "other",
    serverErrorCode: p === void 0 ? void 0 : vur.includes(p) ? p : "other",
    ...(y !== void 0 && { serverAuthDenial: y }),
    ...(k5e(r?.headers) && { serverErrorStamped: !0 }),
  };
}
/**
 * 返回服务器明确标注的错误类型（非 other 时）。
 */
//@ chunk-7t4fmt2f.js:4226-4329 placement
function stampedServerErrorType(e) {
  return e.serverErrorStamped === !0 && e.serverErrorType !== "other" ? e.serverErrorType : void 0;
}
//@ chunk-7t4fmt2f.js:4329-5202 placement
function classifyRevokedAccess(e) {
  if (e.startsWith("Organization access has been revoked")) return "org_access_revoked";
  if (e.startsWith("Workspace access has been revoked")) return "workspace_revoked";
  if (/^OAuth (?:access )?token has been revoked\b/.test(e)) return "token_revoked";
  if (/^OAuth (?:access )?token has expired\b/.test(e)) return "token_expired";
  if (e.startsWith("OAuth access token is invalid") || e.startsWith("Invalid bearer token"))
    return "token_invalid";
  if (e.startsWith("OAuth token application has been deactivated")) return "application_deactivated";
  if (e.startsWith("Account is no longer a member of the organization")) return "account_not_member";
  if (e.startsWith("Token lacks associated organization")) return "token_no_organization";
  if (e.startsWith("Token lacks associated account")) return "token_no_account";
  if (e.startsWith("Credential is invalid")) return "credential_invalid";
  return "other";
}
//@ chunk-s61vbvea.js:456221-456247 placement
var X_AMZN_REQUESTID = "x-amzn-requestid";
//@ chunk-s61vbvea.js:456247-456337 placement
function rqe(e, n) {
  if (e) return e;
  try {
    return n?.get(X_AMZN_REQUESTID) || null;
  } catch (error) {
    return (logError(toError(error)), null);
  }
}

export {
  PU,
  getSSLErrorHint,
  SSL_CERT_ERROR_CODES,
  oIt,
  Ge,
  extractServerErrorFields,
  eAn,
  LK,
  extractConnectionErrorDetails,
  rqe,
  extractNestedErrorMessage,
  Loo,
  getApiErrorCode,
  isStreamSuspendedError,
  Thr,
  isConnectionError,
  summarizeApiError,
  responseHeaderFacts,
  k5e,
  stampedServerErrorType,
  Zls,
  Wts,
  mt,
  effectiveErrorStatus,
  formatAPIError,
  sanitizeAPIError,
  EAi,
  CONNECTION_DROPPED_MESSAGE,
  hasNestedError,
  Ahr,
  findProxyTunnelError,
  isNetworkDownError,
  formatApiErrorType,
  Gts,
};
