/**
 * services/api/responseDiagnostics.ts
 *
 * 2.1.316 新增：异常响应诊断（代理/网关错误签名、响应体描述）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (36)
 * attribution: placement 36
 */
import { isSessionsToken } from "../oauth/sessionsBearerHooks.js";
import { ye } from "../../utils/startupMarks.js";
import { firstLineOf, plural } from "../../utils/stringUtils.js";
import { GATEWAY_FINGERPRINT_ENTRIES, detectGateway, GATEWAY_FINGERPRINTS } from "./logging.js";
import { extractConnectionErrorDetails } from "./errorUtils.js";
import { Ot, Lf, fT, ef } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
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

//@ chunk-e6aww6q8.js:1560527-1560723 placement
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
//@ chunk-e6aww6q8.js:1560723-1560775 placement
function LJ(e) {
  return API_ERROR_TYPES.find((n) => n === e) ?? "other";
}
//@ chunk-e6aww6q8.js:1560775-1560821 placement
function Ske(e) {
  return isSessionsToken(e) ? (ye(e) ?? null) : null;
}
/**
 * 把响应 Content-Type 归类为 none、json、event-stream、html、text、xml、aws-eventstream 或 other。
 */
//@ chunk-e6aww6q8.js:1560821-1561242 placement
function contentTypeKind(e) {
  let n = e ? firstLineOf(e, ";").trim().toLowerCase() : "";
  switch (n) {
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
      return n.endsWith("+json") ? "json" : "other";
  }
}
//@ chunk-e6aww6q8.js:1561242-1561807 placement
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
//@ chunk-e6aww6q8.js:1561807-1561915 placement
function serverKind(e) {
  if (!e) return "absent";
  let lower = e.toLowerCase();
  return PROXY_VENDOR_NAMES.find(([, r]) => r.test(lower))?.[0] ?? "other";
}
/**
 * 代理与网关错误特征表（Apigee、Envoy 等），用于识别异常响应来自哪一层。
 */
//@ chunk-e6aww6q8.js:1561915-1563801 placement
var PROXY_ERROR_SIGNATURES = ["target", "proxy", "policy", "apigee", "mp"],
  z6o = [
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
  ],
  q6o = [
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
//@ chunk-e6aww6q8.js:1563801-1563901 placement
function apigeeFaultSource(e) {
  if (!e) return null;
  let lower = e.trim().toLowerCase();
  return PROXY_ERROR_SIGNATURES.find((r) => r === lower) ?? "other";
}
//@ chunk-e6aww6q8.js:1563901-1564056 placement
function apigeeFaultCode(e) {
  if (!e) return null;
  let trimmed = e.trim(),
    found = z6o.find((y) => y === trimmed);
  if (found) return found;
  let s = firstLineOf(trimmed, "."),
    found_2 = q6o.find((y) => y === s);
  return found_2 ? `${found_2}.other` : "other";
}
//@ chunk-e6aww6q8.js:1564056-1564138 placement
var Y6o = /^\d{1,3}\.\d{1,4}\.\d{1,4}(?:(?:a|b|rc)\d{1,4}|\.(?:dev|post)\d{1,4})?$/;
//@ chunk-e6aww6q8.js:1564138-1564226 placement
function X6o(e) {
  if (typeof e !== "string") return null;
  return Y6o.test(e) ? e : "nonconforming";
}
//@ chunk-e6aww6q8.js:1564226-1564824 placement
var CACHE_HEADER_NAMES = new Set([
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
  ]),
  J6o = [
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
    ...GATEWAY_FINGERPRINT_ENTRIES.flatMap(([, { headerPrefixes: e }]) => e ?? []),
  ];
/**
 * 从响应状态与头部提取诊断信息：内容类型、长度、request-id 是否为 Anthropic、server 厂商、Apigee 故障来源/代码、中间代理头、识别出的网关及版本。
 */
//@ chunk-e6aww6q8.js:1564824-1565509 placement
function describeResponseHeaders(status, headers) {
  let r = new Set();
  headers?.forEach((G, q) => {
    if (CACHE_HEADER_NAMES.has(q)) {
      r.add(q);
      return;
    }
    let found = J6o.find((Se) => q.startsWith(Se));
    if (found) r.add(found + "*");
  });
  let int = Number.parseInt(headers?.get("content-length") ?? "", 10),
    h = headers?.get("request-id"),
    y = Ske(h),
    S = detectGateway({ headers: headers }) ?? null,
    L = (S ? GATEWAY_FINGERPRINTS[S] : void 0)?.versionHeader;
  return {
    status: status ?? null,
    content_type: contentTypeKind(headers?.get("content-type")),
    content_length: Number.isFinite(int) && int >= 0 ? int : null,
    request_id: y,
    request_id_header: y ? "anthropic" : h ? "other" : "absent",
    server: serverKind(headers?.get("server")),
    apigee_fault_source: apigeeFaultSource(headers?.get("x-apigee-fault-source")),
    apigee_fault_code: apigeeFaultCode(headers?.get("x-apigee-fault-code")),
    intermediary_headers: [...r].sort(),
    gateway: S,
    gateway_version: X6o(L ? headers?.get(L) : void 0),
  };
}
//@ chunk-e6aww6q8.js:1565509-1565544 placement
var Z6o = /^(event|data|id|retry)?:/;
/**
 * 判断响应体的形态：空、事件流、HTML/XML、像 JSON 的文本、非 Message 的 JSON 或其他。
 */
//@ chunk-e6aww6q8.js:1565544-1565914 placement
function bodyKind(e) {
  if (e === null || e === void 0) return "empty";
  if (typeof e === "string") {
    let sliced = e.trimStart().slice(0, 16);
    if (sliced.length === 0) return "empty";
    if (Z6o.test(sliced)) return "event-stream";
    if (sliced.startsWith("<")) return sliced.startsWith("<?xml") ? "xml" : "html";
    if (sliced.startsWith("{") || sliced.startsWith("[")) return "json-text";
    return "other-text";
  }
  return typeof e === "object" ? "json-not-message" : "other";
}
//@ chunk-e6aww6q8.js:1565914-1566036 placement
var STREAM_EVENT_TYPES = [
  "message_start",
  "message_delta",
  "message_stop",
  "content_block_start",
  "content_block_delta",
  "content_block_stop",
];
//@ chunk-e6aww6q8.js:1566036-1566089 placement
function bke(e) {
  return STREAM_EVENT_TYPES.find((n) => n === e) ?? "other";
}
//@ chunk-e6aww6q8.js:1566089-1566683 placement
function classifyApiErrorKind(e, n, r) {
  let s = extractConnectionErrorDetails(e),
    h = e instanceof Ot ? e : void 0,
    y = h?.status ?? r?.status,
    S = h?.headers ?? r?.headers;
  return {
    error_kind: n,
    error_class:
      e instanceof Lf
        ? "user_abort"
        : e instanceof fT
          ? "connection_timeout"
          : e instanceof ef
            ? "connection_error"
            : h
              ? "api_error"
              : e instanceof Error
                ? "error"
                : "non_error",
    error_name: sanitizeErrorName_2(e) ?? null,
    cause_name: e instanceof Error ? (sanitizeErrorName_2(e.cause) ?? null) : null,
    api_error_type: h?.type ? LJ(h.type) : null,
    connection_code: sanitizedConnectionCodeForTelemetry(s?.code) ?? null,
    ssl_error: s?.isSSLError ?? !1,
    ...(e instanceof UnexpectedApiResponseError
      ? { response: e.response, body_kind: e.bodyKind, body_bytes: e.bodyBytes }
      : { response: y !== void 0 || S ? describeResponseHeaders(y, S) : null }),
  };
}
/**
 * 汇总连接配置事实：提供方、基地址类型、网关、是否有代理、自定义头、额外 CA、客户端证书。
 */
//@ chunk-e6aww6q8.js:1566683-1566996 placement
function connectionSetupFacts() {
  let e = getAPIProvider(),
    n = providerBaseUrl(e);
  return {
    provider: e,
    base_url: !n ? "default" : isAnthropicHost(n) ? "anthropic" : "custom",
    base_url_gateway: detectGateway({ baseUrl: n }) ?? null,
    https_proxy: getProxyUrl() !== void 0,
    custom_headers: Boolean(env.ANTHROPIC_CUSTOM_HEADERS),
    extra_ca_certs: Boolean(env.NODE_EXTRA_CA_CERTS),
    client_cert: Boolean(env.CLAUDE_CODE_CLIENT_CERT),
  };
}
/**
 * 从错误或响应头提取诊断字段：状态码、是否带 request-id 头、服务器类型、代理与额外 CA。
 */
//@ chunk-e6aww6q8.js:1566996-1567475 placement
function responseDiagnosticFields(e, n) {
  try {
    let r = e instanceof Ot ? e : void 0,
      s = r?.headers ?? n?.headers,
      h =
        e instanceof UnexpectedApiResponseError
          ? e.response
          : s
            ? describeResponseHeaders(r?.status ?? n?.status, s)
            : void 0,
      y = connectionSetupFacts();
    return {
      ...(typeof h?.status === "number" && { response_status: h.status }),
      response_request_id_header: fromEnum(h?.request_id_header ?? "no_response"),
      response_server: fromEnum(h?.server ?? "no_response"),
      https_proxy: y.https_proxy,
      extra_ca_certs: y.extra_ca_certs,
    };
  } catch (error) {
    return (
      logError(error),
      { response_request_id_header: lit_2("unknown"), response_server: lit_2("unknown") }
    );
  }
}
/**
 * 按提供方取对应的基地址环境变量。
 */
//@ chunk-e6aww6q8.js:1567475-1567884 placement
function providerBaseUrl(e) {
  switch (e) {
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
/**
 * 各种响应体形态的说明文字。
 */
//@ chunk-e6aww6q8.js:1567884-1568243 placement
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
/**
 * 描述异常响应体（内容类型、大小、是否为空），用于错误日志。
 */
//@ chunk-e6aww6q8.js:1568243-1569479 placement
function describeResponseBody({ data: e, status: status, headers: headers, originating: originating }) {
  try {
    let h = describeResponseHeaders(status, headers),
      y = bodyKind(e),
      S = typeof e === "string" ? Buffer.byteLength(e, "utf8") : y === "empty" ? 0 : h.content_length,
      joined = [
        ` Response: content-type ${h.content_type}`,
        BODY_KIND_DESCRIPTIONS[y],
        S === null ? "size unknown" : `${S} bytes`,
        `request-id ${h.request_id ?? (h.request_id_header === "other" ? "present but not Anthropic-issued" : "absent")}`,
        ...(h.server === "absent" ? [] : [`server ${h.server}`]),
        ...(h.intermediary_headers.length > 0
          ? [`intermediary headers ${h.intermediary_headers.join(" ")}`]
          : []),
      ].join(", "),
      L = originating
        ? [originating.cause, originating.errorName, originating.connectionCode]
            .filter((Se) => Se && Se !== "Error")
            .join(", ")
        : "",
      G = originating?.stall,
      q = G
        ? `; ${[`${G.events_received} stream ${plural(G.events_received, "event")} received`, ...(G.ms_to_first_event === null ? [] : [`first after ${G.ms_to_first_event} ms`]), ...(G.ms_since_last_event === null ? [] : [`none in the final ${G.ms_since_last_event} ms`])].join(", ")}`
        : "",
      Z = originating
        ? ` This was the non-streaming retry of streaming request ${originating.requestId ?? "(no Anthropic request-id)"}, which failed with: ${L}${q}.`
        : "";
    return { summary: `${joined}.${Z}`, bodyKind: y, bodyBytes: S, response: h };
  } catch (error) {
    return (
      logForDebugging(`unexpected-response description failed: ${errorMessage(error)}`, { level: "error" }),
      { summary: "", bodyKind: "other", bodyBytes: null, response: describeResponseHeaders(void 0, void 0) }
    );
  }
}
/**
 * API 返回空或格式错误响应时的错误类，记录响应体形态、字节数和响应摘要，提示检查是否有代理或网关拦截。
 */
//@ chunk-e6aww6q8.js:1569479-1569869 placement
class UnexpectedApiResponseError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  name = "UnexpectedApiResponseError";
  bodyKind;
  bodyBytes;
  response;
  constructor(e) {
    let n = describeResponseBody(e);
    super(
      `API returned an empty or malformed response (HTTP ${e.status ?? "unknown"}) \u2014 check for a proxy or gateway intercepting the request.${n.summary}`,
      "API returned an empty or malformed response",
    );
    ((this.bodyKind = n.bodyKind), (this.bodyBytes = n.bodyBytes), (this.response = n.response));
  }
}
//@ chunk-e6aww6q8.js:1569869-1569898 placement
function f6e(e, n, r) {
  return !1;
}
//@ chunk-e6aww6q8.js:1569898-1569923 placement
function Tke(e) {
  return !1;
}
//@ chunk-e6aww6q8.js:1569923-1569981 placement
var s5o = ["bio", "cyber", "aup", "agentic", "control"],
  i5o = s5o;
//@ chunk-e6aww6q8.js:1569981-1570047 placement
class CQt {
  skipped = new Set();
  refusedFromSetting = new Set();
  changed = createSignal();
}
//@ chunk-e6aww6q8.js:1570047-1570074 placement
var a5o = new HostScoped(() => new CQt());
//@ chunk-e6aww6q8.js:1570074-1570113 placement
function l5o() {
  return a5o.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:1570113-1570137 placement
function d5o() {
  return !1;
}
//@ chunk-e6aww6q8.js:1570137-1570210 placement
function kUo(e) {
  if (!d5o()) return () => {};
  return l5o().changed.subscribe(e);
}
//@ chunk-e6aww6q8.js:1570210-1570252 placement
var OTHER = "other",
  eZa = new Set([...i5o, OTHER]);
//@ chunk-e6aww6q8.js:1570252-1570283 placement
function RK(e, n = getAPIProvider()) {
  return !1;
}
//@ chunk-e6aww6q8.js:1570283-1570312 placement
function AQt(e, n, r) {
  return !1;
}
//@ chunk-e6aww6q8.js:1570312-1570337 placement
function PQt(e) {
  return "";
}

export {
  kUo,
  describeResponseHeaders,
  connectionSetupFacts,
  UnexpectedApiResponseError,
  classifyApiErrorKind,
  f6e,
  RK,
  Tke,
  bke,
  responseDiagnosticFields,
  Ske,
  LJ,
  AQt,
  PQt,
};
