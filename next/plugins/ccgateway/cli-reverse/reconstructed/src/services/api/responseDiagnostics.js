/**
 * services/api/responseDiagnostics.ts
 *
 * 2.1.316 新增：异常响应诊断（代理/网关错误签名、响应体描述）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (36)
 * attribution: placement 36
 */
import { isSessionsToken } from "../oauth/sessionsBearerHooks.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { firstLineOf, plural } from "../../utils/stringUtils.js";
import { GATEWAY_FINGERPRINT_ENTRIES, detectGateway, GATEWAY_FINGERPRINTS } from "./logging.js";
import { extractConnectionErrorDetails } from "./errorUtils.js";
import {
  APIError,
  APIUserAbortError,
  APIConnectionTimeoutError,
  APIConnectionError,
} from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import {
  sanitizeErrorName as sanitizeErrorName_2,
  sanitizedConnectionCodeForTelemetry,
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { isAnthropicHost } from "../../utils/anthropicHosts.js";
import { getProxyUrl } from "../../utils/proxy.js";
import { env } from "../../utils/env.js";
import { fromEnum, lit as lit_2 } from "../analytics/safeMetadata.js";
import { logError } from "../../utils/log.js";
import { logForDebugging } from "../../utils/debug.js";
import { createSignal } from "../../utils/signal.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1626109-1626305 placement
var API_ERROR_TYPES = [
  "invalid_request_error",
  "authentication_error",
  "billing_error",
  "permission_error",
  "not_found_error",
  "request_too_large",
  "rate_limit_error",
  "timeout_error",
  "api_error",
  "overloaded_error",
];
//@ chunk-5xgkngpb.js:1626305-1626358 placement
function normalizeApiErrorTypeDiag(type) {
  return API_ERROR_TYPES.find((errorType) => errorType === type) ?? "other";
}
//@ chunk-5xgkngpb.js:1626358-1626404 placement
function requestIdFromHeaders(headers) {
  return isSessionsToken(headers) ? (sanitizeMarkName(headers) ?? null) : null;
}
//@ chunk-5xgkngpb.js:1626404-1626825 placement
/**
 * 把响应 Content-Type 归类为 none、json、event-stream、html、text、xml、aws-eventstream 或 other。
 */
function contentTypeKind(contentType) {
  let base = contentType ? firstLineOf(contentType, ";").trim().toLowerCase() : "";
  switch (base) {
    case "":
      return "none";
    case "application/json":
      return "json";
    case "text/event-stream":
      return "event-stream";
    case "text/html":
    case "application/xhtml+xml":
      return "html";
    case "text/plain":
      return "text";
    case "application/xml":
    case "text/xml":
      return "xml";
    case "application/vnd.amazon.eventstream":
      return "aws-eventstream";
    default:
      return base.endsWith("+json") ? "json" : "other";
  }
}
//@ chunk-5xgkngpb.js:1626825-1627390 placement
var PROXY_VENDOR_NAMES = [
  ["cloudflare", /cloudflare/],
  ["envoy", /envoy|istio/],
  ["nginx", /nginx|openresty/],
  ["apigee", /apigee/],
  ["akamai", /akamai/],
  ["aws", /awselb|amazon|cloudfront/],
  ["azure", /azure/],
  ["google", /^(gws|gfe|esf|gse)\b|google/],
  ["iis", /microsoft-iis/],
  ["apache", /apache/],
  ["zscaler", /zscaler/],
  ["netskope", /netskope/],
  ["bluecoat", /bluecoat|symantec/],
  ["forcepoint", /forcepoint|websense/],
  ["f5", /big-?ip|\bf5\b/],
  ["netscaler", /netscaler|citrix/],
  ["squid", /squid/],
  ["haproxy", /haproxy/],
  ["traefik", /traefik/],
  ["kestrel", /kestrel/],
  ["python", /uvicorn|gunicorn|hypercorn/],
];
//@ chunk-5xgkngpb.js:1627390-1627498 placement
function serverKind(server) {
  if (!server) return "absent";
  let lower = server.toLowerCase();
  return PROXY_VENDOR_NAMES.find(([, pattern]) => pattern.test(lower))?.[0] ?? "other";
}
//@ chunk-5xgkngpb.js:1627498-1629384 placement
/**
 * 代理与网关错误特征表（Apigee、Envoy 等），用于识别异常响应来自哪一层。
 */
var PROXY_ERROR_SIGNATURES = ["target", "proxy", "policy", "apigee", "mp"];
var APIGEE_FAULT_NAMES = [
  "flow.APITimedOut",
  "flow.SharedFlowNotFound",
  "messaging.adaptors.http.flow.ApplicationNotFound",
  "messaging.adaptors.http.flow.DecompressionFailureAtRequest",
  "messaging.adaptors.http.flow.DecompressionFailureAtResponse",
  "messaging.adaptors.http.flow.ErrorResponseCode",
  "messaging.adaptors.http.flow.GatewayTimeout",
  "messaging.adaptors.http.flow.LengthRequired",
  "messaging.adaptors.http.flow.NoActiveTargets",
  "messaging.adaptors.http.flow.ServiceUnavailable",
  "messaging.adaptors.http.flow.SslHandshakeFailed",
  "messaging.adaptors.http.flow.UnexpectedEOFAtTarget",
  "messaging.runtime.RouteFailed",
  "messaging.runtime.TargetMissing",
  "protocol.http.BadPath",
  "protocol.http.DuplicateHeader",
  "protocol.http.ProxyTunnelCreationFailed",
  "protocol.http.Response405WithoutAllowHeader",
  "protocol.http.TooBigBody",
  "protocol.http.TooBigHeaders",
  "protocol.http.TooBigLine",
  "protocol.http.UnsupportedEncoding",
  "policies.ratelimit.QuotaViolation",
  "policies.ratelimit.SpikeArrestViolation",
  "policies.ratelimit.InvalidMessageWeight",
  "policies.concurrentratelimit.ConcurrentRatelimitViolation",
  "steps.raisefault.RaiseFault",
  "steps.jsonthreatprotection.ExecutionFailed",
  "steps.regexprotection.ThreatDetected",
  "steps.servicecallout.ExecutionFailed",
  "steps.javascript.ScriptExecutionFailed",
  "oauth.v2.InvalidAccessToken",
  "oauth.v2.InvalidApiKey",
  "oauth.v2.InvalidApiKeyForGivenResource",
  "oauth.v2.FailedToResolveAPIKey",
  "keymanagement.service.access_token_expired",
  "keymanagement.service.access_token_not_approved",
  "keymanagement.service.invalid_access_token",
  "keymanagement.service.consumer_key_expired",
  "keymanagement.service.invalid_consumer_key",
  "keymanagement.service.InvalidAPICallAsNoApiProductMatchFound",
  "security.util.KeyAliasNotFound",
];
var APIGEE_FLOW_NAMES = [
  "messaging",
  "protocol",
  "flow",
  "steps",
  "policies",
  "security",
  "keymanagement",
  "oauth",
  "mintstep",
  "scripts",
];
//@ chunk-5xgkngpb.js:1629384-1629484 placement
function apigeeFaultSource(server) {
  if (!server) return null;
  let lower = server.trim().toLowerCase();
  return PROXY_ERROR_SIGNATURES.find((signature) => signature === lower) ?? "other";
}
//@ chunk-5xgkngpb.js:1629484-1629639 placement
function apigeeFaultCode(server) {
  if (!server) return null;
  let trimmed = server.trim();
  let found = APIGEE_FAULT_NAMES.find((name) => name === trimmed);
  if (found) return found;
  let firstPart = firstLineOf(trimmed, ".");
  let found_2 = APIGEE_FLOW_NAMES.find((name) => name === firstPart);
  return found_2 ? `${found_2}.other` : "other";
}
//@ chunk-5xgkngpb.js:1629639-1629721 placement
var VERSION_STRING_RE = /^\d{1,3}\.\d{1,4}\.\d{1,4}(?:(?:a|b|rc)\d{1,4}|\.(?:dev|post)\d{1,4})?$/;
//@ chunk-5xgkngpb.js:1629721-1629809 placement
function gatewayVersion(headers) {
  if (typeof headers !== "string") return null;
  return VERSION_STRING_RE.test(headers) ? headers : "nonconforming";
}
//@ chunk-5xgkngpb.js:1629809-1630407 placement
/**
 * 诊断用的缓存/代理响应头名单与网关头前缀（anthropic-、x-amz-、x-goog- 等），用于识别中间层。
 */
var CACHE_HEADER_NAMES; // deferred: uses GATEWAY_FINGERPRINTS (./logging.js) of its import cycle while loading; runs once the cycle is complete
var GATEWAY_HEADER_PREFIXES;
deferInit("chunk-5xgkngpb.js:1629809", () => {
  CACHE_HEADER_NAMES = new Set([
    "via",
    "x-cache",
    "x-cache-hits",
    "x-served-by",
    "x-varnish",
    "age",
    "cf-ray",
    "cf-cache-status",
    "x-request-id",
    "x-correlation-id",
    "x-forwarded-for",
    "x-powered-by",
    "x-squid-error",
    "proxy-authenticate",
    "proxy-connection",
    "www-authenticate",
    "server-timing",
    "retry-after",
    "x-should-retry",
    "content-encoding",
    "transfer-encoding",
    "x-accel-buffering",
    "traceparent",
    "x-cloud-trace-context",
    "cf-mitigated",
    "x-iinfo",
  ]);
  GATEWAY_HEADER_PREFIXES = [
    "anthropic-",
    "x-amz-",
    "x-amzn-",
    "x-ms-",
    "x-azure-",
    "x-goog-",
    "x-envoy-",
    "x-apigee-",
    "x-akamai-",
    "x-zscaler-",
    "x-databricks-",
    ...GATEWAY_FINGERPRINT_ENTRIES.flatMap(([, { headerPrefixes: prefixes }]) => prefixes ?? []),
  ];
});
//@ chunk-5xgkngpb.js:1630407-1631096 placement
/**
 * 从响应状态与头部提取诊断信息：内容类型、长度、request-id 是否为 Anthropic、server 厂商、Apigee 故障来源/代码、中间代理头、识别出的网关及版本。
 */
function describeResponseHeaders(status, headers) {
  let seen = new Set();
  headers?.forEach((header, name) => {
    if (CACHE_HEADER_NAMES.has(name)) {
      seen.add(name);
      return;
    }
    let found = GATEWAY_HEADER_PREFIXES.find((prefix) => name.startsWith(prefix));
    if (found) seen.add(found + "*");
  });
  let contentLength = Number.parseInt(headers?.get("content-length") ?? "", 10);
  let requestIdHeader = headers?.get("request-id");
  let requestId = requestIdFromHeaders(requestIdHeader);
  let gateway =
    detectGateway({
      headers,
    }) ?? null;
  let versionHeader = (gateway ? GATEWAY_FINGERPRINTS[gateway] : undefined)?.versionHeader;
  return {
    status: status ?? null,
    content_type: contentTypeKind(headers?.get("content-type")),
    content_length: Number.isFinite(contentLength) && contentLength >= 0 ? contentLength : null,
    request_id: requestId,
    request_id_header: requestId ? "anthropic" : requestIdHeader ? "other" : "absent",
    server: serverKind(headers?.get("server")),
    apigee_fault_source: apigeeFaultSource(headers?.get("x-apigee-fault-source")),
    apigee_fault_code: apigeeFaultCode(headers?.get("x-apigee-fault-code")),
    intermediary_headers: [...seen].sort(),
    gateway,
    gateway_version: gatewayVersion(versionHeader ? headers?.get(versionHeader) : undefined),
  };
}
//@ chunk-5xgkngpb.js:1631096-1631131 placement
var SSE_FIELD_RE = /^(event|data|id|retry)?:/;
//@ chunk-5xgkngpb.js:1631131-1631501 placement
/**
 * 判断响应体的形态：空、事件流、HTML/XML、像 JSON 的文本、非 Message 的 JSON 或其他。
 */
function bodyKind(body) {
  if (body === null || body === undefined) return "empty";
  if (typeof body === "string") {
    let sliced = body.trimStart().slice(0, 16);
    if (sliced.length === 0) return "empty";
    if (SSE_FIELD_RE.test(sliced)) return "event-stream";
    if (sliced.startsWith("<")) return sliced.startsWith("<?xml") ? "xml" : "html";
    if (sliced.startsWith("{") || sliced.startsWith("[")) return "json-text";
    return "other-text";
  }
  return typeof body === "object" ? "json-not-message" : "other";
}
//@ chunk-5xgkngpb.js:1631501-1631623 placement
var STREAM_EVENT_TYPES = [
  "message_start",
  "message_delta",
  "message_stop",
  "content_block_start",
  "content_block_delta",
  "content_block_stop",
];
//@ chunk-5xgkngpb.js:1631623-1631676 placement
function normalizeStreamEventType(type) {
  return STREAM_EVENT_TYPES.find((eventType) => eventType === type) ?? "other";
}
//@ chunk-5xgkngpb.js:1631676-1632272 placement
function classifyApiErrorKind(error, errorKind, observedResponse) {
  let connectionErrorDetails = extractConnectionErrorDetails(error);
  let apiError = error instanceof APIError ? error : undefined;
  let status = apiError?.status ?? observedResponse?.status;
  let headers = apiError?.headers ?? observedResponse?.headers;
  return {
    error_kind: errorKind,
    error_class:
      error instanceof APIUserAbortError
        ? "user_abort"
        : error instanceof APIConnectionTimeoutError
          ? "connection_timeout"
          : error instanceof APIConnectionError
            ? "connection_error"
            : apiError
              ? "api_error"
              : error instanceof Error
                ? "error"
                : "non_error",
    error_name: sanitizeErrorName_2(error) ?? null,
    cause_name: error instanceof Error ? (sanitizeErrorName_2(error.cause) ?? null) : null,
    api_error_type: apiError?.type ? normalizeApiErrorTypeDiag(apiError.type) : null,
    connection_code: sanitizedConnectionCodeForTelemetry(connectionErrorDetails?.code) ?? null,
    ssl_error: connectionErrorDetails?.isSSLError ?? false,
    ...(error instanceof UnexpectedApiResponseError
      ? {
          response: error.response,
          body_kind: error.bodyKind,
          body_bytes: error.bodyBytes,
        }
      : {
          response: status !== undefined || headers ? describeResponseHeaders(status, headers) : null,
        }),
  };
}
//@ chunk-5xgkngpb.js:1632272-1632586 placement
/**
 * 汇总连接配置事实：提供方、基地址类型、网关、是否有代理、自定义头、额外 CA、客户端证书。
 */
function connectionSetupFacts() {
  let apiProvider = getAPIProvider();
  let provider = providerBaseUrl(apiProvider);
  return {
    provider: apiProvider,
    base_url: !provider ? "default" : isAnthropicHost(provider) ? "anthropic" : "custom",
    base_url_gateway:
      detectGateway({
        baseUrl: provider,
      }) ?? null,
    https_proxy: getProxyUrl() !== undefined,
    custom_headers: Boolean(env.ANTHROPIC_CUSTOM_HEADERS),
    extra_ca_certs: Boolean(env.NODE_EXTRA_CA_CERTS),
    client_cert: Boolean(env.CLAUDE_CODE_CLIENT_CERT),
  };
}
//@ chunk-5xgkngpb.js:1632586-1633066 placement
/**
 * 从错误或响应头提取诊断字段：状态码、是否带 request-id 头、服务器类型、代理与额外 CA。
 */
function responseDiagnosticFields(error, response) {
  try {
    let apiError = error instanceof APIError ? error : undefined;
    let headers = apiError?.headers ?? response?.headers;
    let diagnostic =
      error instanceof UnexpectedApiResponseError
        ? error.response
        : headers
          ? describeResponseHeaders(apiError?.status ?? response?.status, headers)
          : undefined;
    let route = connectionSetupFacts();
    return {
      ...(typeof diagnostic?.status === "number" && {
        response_status: diagnostic.status,
      }),
      response_request_id_header: fromEnum(diagnostic?.request_id_header ?? "no_response"),
      response_server: fromEnum(diagnostic?.server ?? "no_response"),
      https_proxy: route.https_proxy,
      extra_ca_certs: route.extra_ca_certs,
    };
  } catch (error) {
    logError(error);
    return {
      response_request_id_header: lit_2("unknown"),
      response_server: lit_2("unknown"),
    };
  }
}
//@ chunk-5xgkngpb.js:1633066-1633475 placement
/**
 * 按提供方取对应的基地址环境变量。
 */
function providerBaseUrl(apiProvider) {
  switch (apiProvider) {
    case "firstParty":
    case "gateway":
      return env.ANTHROPIC_BASE_URL;
    case "bedrock":
      return env.ANTHROPIC_BEDROCK_BASE_URL;
    case "mantle":
      return env.ANTHROPIC_BEDROCK_MANTLE_BASE_URL;
    case "anthropicAws":
      return env.ANTHROPIC_AWS_BASE_URL;
    case "anthropicGoogleCloud":
      return env.ANTHROPIC_GOOGLE_CLOUD_BASE_URL;
    case "vertex":
      return env.ANTHROPIC_VERTEX_BASE_URL;
    case "foundry":
      return env.ANTHROPIC_FOUNDRY_BASE_URL;
  }
}
//@ chunk-5xgkngpb.js:1633475-1633834 placement
/**
 * 各种响应体形态的说明文字。
 */
var BODY_KIND_DESCRIPTIONS = {
  empty: "empty body",
  "event-stream": "body is an event stream (the non-streaming request was answered with a stream)",
  html: "body is an HTML page",
  xml: "body is an XML document",
  "json-text": "body looks like JSON but does not parse",
  "json-not-message": "body is JSON but not a Message",
  "other-text": "body is unrecognized text",
  other: "body is unrecognized",
};
//@ chunk-5xgkngpb.js:1633834-1635072 placement
/**
 * 描述异常响应体（内容类型、大小、是否为空），用于错误日志。
 */
function describeResponseBody({ data: body, status, headers, originating }) {
  try {
    let responseHeaders = describeResponseHeaders(status, headers);
    let kind = bodyKind(body);
    let detail =
      typeof body === "string"
        ? Buffer.byteLength(body, "utf8")
        : kind === "empty"
          ? 0
          : responseHeaders.content_length;
    let joined = [
      ` Response: content-type ${responseHeaders.content_type}`,
      BODY_KIND_DESCRIPTIONS[kind],
      detail === null ? "size unknown" : `${detail} bytes`,
      `request-id ${responseHeaders.request_id ?? (responseHeaders.request_id_header === "other" ? "present but not Anthropic-issued" : "absent")}`,
      ...(responseHeaders.server === "absent" ? [] : [`server ${responseHeaders.server}`]),
      ...(responseHeaders.intermediary_headers.length > 0
        ? [`intermediary headers ${responseHeaders.intermediary_headers.join(" ")}`]
        : []),
    ].join(", ");
    let errorNames = originating
      ? [originating.cause, originating.errorName, originating.connectionCode]
          .filter((name) => name && name !== "Error")
          .join(", ")
      : "";
    let stall = originating?.stall;
    let stallInfo = stall
      ? `; ${[`${stall.events_received} stream ${plural(stall.events_received, "event")} received`, ...(stall.ms_to_first_event === null ? [] : [`first after ${stall.ms_to_first_event} ms`]), ...(stall.ms_since_last_event === null ? [] : [`none in the final ${stall.ms_since_last_event} ms`])].join(", ")}`
      : "";
    let names = originating
      ? ` This was the non-streaming retry of streaming request ${originating.requestId ?? "(no Anthropic request-id)"}, which failed with: ${errorNames}${stallInfo}.`
      : "";
    return {
      summary: `${joined}.${names}`,
      bodyKind: kind,
      bodyBytes: detail,
      response: responseHeaders,
    };
  } catch (error) {
    logForDebugging(`unexpected-response description failed: ${errorMessage(error)}`, {
      level: "error",
    });
    return {
      summary: "",
      bodyKind: "other",
      bodyBytes: null,
      response: describeResponseHeaders(undefined, undefined),
    };
  }
}
//@ chunk-5xgkngpb.js:1635072-1635463 placement
/**
 * API 返回空或格式错误响应时的错误类，记录响应体形态、字节数和响应摘要，提示检查是否有代理或网关拦截。
 */
let UnexpectedApiResponseError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1635072", () => {
  UnexpectedApiResponseError = class UnexpectedApiResponseError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    name = "UnexpectedApiResponseError";
    bodyKind;
    bodyBytes;
    response;
    constructor(response) {
      let description = describeResponseBody(response);
      super(
        `API returned an empty or malformed response (HTTP ${response.status ?? "unknown"}) \u2014 check for a proxy or gateway intercepting the request.${description.summary}`,
        "API returned an empty or malformed response",
      );
      this.bodyKind = description.bodyKind;
      this.bodyBytes = description.bodyBytes;
      this.response = description.response;
    }
  };
});
//@ chunk-5xgkngpb.js:1635463-1635492 placement
function alwaysFalseResponseDiag(messages, model, provider) {
  return false;
}
//@ chunk-5xgkngpb.js:1635492-1635517 placement
function alwaysFalseB(error) {
  return false;
}
//@ chunk-5xgkngpb.js:1635517-1635575 placement
var SAFEGUARD_CATEGORIES = ["bio", "cyber", "aup", "agentic", "control"];
var SAFEGUARD_CATEGORIES_ALIAS = SAFEGUARD_CATEGORIES;
//@ chunk-5xgkngpb.js:1635575-1635641 placement
/**
 * 按宿主保存的安全拒绝设置状态（跳过的类别、被设置拒绝的类别、变更信号）。
 */
class RefusalSettingsState {
  skipped = new Set();
  refusedFromSetting = new Set();
  changed = createSignal();
}
//@ chunk-5xgkngpb.js:1635641-1635668 placement
var refusalSettingsSlot; // deferred: uses RefusalSettingsState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1635641", () => {
  refusalSettingsSlot = new HostScoped(() => new RefusalSettingsState());
});
//@ chunk-5xgkngpb.js:1635668-1635707 placement
function refusalSettingsState() {
  return refusalSettingsSlot.of(getRootSession().host);
}
//@ chunk-5xgkngpb.js:1635707-1635731 placement
function alwaysFalseC() {
  return false;
}
//@ chunk-5xgkngpb.js:1635731-1635804 placement
/**
 * 导出函数 `onRefusalSettingsChange`：参数 e，返回 () => {}; return l5o().changed.subscribe(e)。
 */
function onRefusalSettingsChange(settings) {
  if (!alwaysFalseC()) return () => {};
  return refusalSettingsState().changed.subscribe(settings);
}
//@ chunk-5xgkngpb.js:1635804-1635846 placement
var OTHER; // deferred: uses SAFEGUARD_CATEGORIES of its import cycle while loading; runs once the cycle is complete
var SAFEGUARD_CATEGORY_SET;
deferInit("chunk-5xgkngpb.js:1635804", () => {
  OTHER = "other";
  SAFEGUARD_CATEGORY_SET = new Set([...SAFEGUARD_CATEGORIES_ALIAS, OTHER]);
});
//@ chunk-5xgkngpb.js:1635846-1635877 placement
function alwaysFalseD(error, providerForModel = getAPIProvider()) {
  return false;
}
//@ chunk-5xgkngpb.js:1635877-1635906 placement
function alwaysFalseE(error, baseError, retryDirective) {
  return false;
}
//@ chunk-5xgkngpb.js:1635906-1635931 placement
function emptyString(message) {
  return "";
}
export {
  describeResponseHeaders,
  connectionSetupFacts,
  UnexpectedApiResponseError,
  classifyApiErrorKind,
  alwaysFalseResponseDiag,
  alwaysFalseD,
  alwaysFalseB,
  normalizeStreamEventType,
  responseDiagnosticFields,
  requestIdFromHeaders,
  normalizeApiErrorTypeDiag,
  alwaysFalseE,
  emptyString,
  onRefusalSettingsChange,
};
