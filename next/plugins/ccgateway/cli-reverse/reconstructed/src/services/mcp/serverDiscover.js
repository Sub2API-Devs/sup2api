/**
 * services/mcp/serverDiscover.ts
 *
 * 2.1.316 新增：MCP 握手追踪：包装 fetch 记录握手响应与 discover 判定。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-sywnjtqb.js (30)
 * attribution: placement 30
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { getProjectConfigRoot, getOriginalCwdOrNull } from "../../bootstrap/state.js";
import {
  STDIO_VERDICT_PREFIX,
  CCR_VERDICT_PREFIX,
  shouldRememberVerdict,
  readDiscoverVerdict,
  getDiscoverVerdicts,
  isModernVerdictValid,
  updateDiscoverVerdicts,
  retainValidDiscoverVerdicts,
} from "./discoverVerdicts.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { isSameOriginAsCcr, isKnownProxyEndpointUrl, CCR_SESSION_MCP_PATH } from "./ccrMcpUrls.js";
import { hasUniqueQueryParams } from "../analytics/metadata.js";
import { headerValues, X_MCP_SERVER_ORIGIN } from "./fileReference/fileReferencePolicy.js";
import { RESERVED_SERVER_IDS_WITH_DOCS } from "./remoteBrowserServer.js";
import { MCP_PROTOCOL_NEXT } from "./mcpCallConstants.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, literal, numberSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { wasListenGetSkipped } from "./connectionLifecycle.js";
import { fromEnumOpt } from "../analytics/safeMetadata.js";
import { getCliOwnedState } from "./cliOwnedClients.js";
import { logError } from "../../utils/log.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-sywnjtqb.js:32463-32532 placement
/**
 * 允许的发现来源（directory、custom）。
 */
var CCR_UNIQUE_QUERY_KEYS = ["toolbox_mcp_server_id", "mcp_url"];
var DIRECTORY_SOURCES = ["directory", "custom"];
//@ chunk-sywnjtqb.js:32532-33088 placement
/**
 * getDiscoverVerdictKey：判定键：claudeai-proxy 用连接器 id；stdio 用 hash(command,args,排序 env,项目根) 前缀 stdio:；CCR toolbox http URL 用 hash(server_id, mcp_url) 前缀 ccr:；其他返回 undefined（不记）。
 */
function getDiscoverVerdictKey(config) {
  if (config.type === "claudeai-proxy") return config.id;
  if ("command" in config) {
    let stdioKeyMaterial = jsonStringify([
      config.command,
      config.args ?? [],
      Object.entries(config.env ?? {}).sort(([keyA], [keyB]) => (keyA < keyB ? -1 : keyA > keyB ? 1 : 0)),
      getProjectConfigRoot() ?? getOriginalCwdOrNull() ?? "",
    ]);
    return `${STDIO_VERDICT_PREFIX}${computeContentHash(stdioKeyMaterial).slice(0, 32)}`;
  }
  if (
    config.type !== "http" ||
    !isSameOriginAsCcr(config.url) ||
    !hasUniqueQueryParams(config.url, CCR_UNIQUE_QUERY_KEYS) ||
    isKnownProxyEndpointUrl(config.url)
  )
    return;
  let origins = headerValues(config.headers, X_MCP_SERVER_ORIGIN);
  let url = new URL(config.url);
  let lower = url.searchParams.get("toolbox_mcp_server_id")?.toLowerCase();
  if (
    !CCR_SESSION_MCP_PATH.test(url.pathname) ||
    origins.length !== 1 ||
    !origins.every((origin) => DIRECTORY_SOURCES.includes(origin)) ||
    !lower ||
    RESERVED_SERVER_IDS_WITH_DOCS.includes(lower)
  )
    return;
  let ccrKeyMaterial = jsonStringify([lower, url.searchParams.get("mcp_url")]);
  return `${CCR_VERDICT_PREFIX}${computeContentHash(ccrKeyMaterial).slice(0, 32)}`;
}
//@ chunk-sywnjtqb.js:33088-33220 placement
/**
 * isRememberedLegacyPeer：判定表中有未过期且记录时 modern 版本等于当前（2026-07-28）的条目。
 */
async function isRememberedLegacyPeer(config, storageV5, now = Date.now()) {
  let discoverVerdictKey = getDiscoverVerdictKey(config);
  if (discoverVerdictKey === undefined || !shouldRememberVerdict(discoverVerdictKey)) return false;
  let discoverVerdict = readDiscoverVerdict(await getDiscoverVerdicts(storageV5), discoverVerdictKey);
  return discoverVerdict !== undefined && isModernVerdictValid(discoverVerdictKey, discoverVerdict, now);
}
//@ chunk-sywnjtqb.js:33220-33444 placement
/**
 * rememberLegacyPeer：记录 {observedAt, modernProtocolVersion}，表示该服务器对 server/discover 回 -32601 或没回应，下次直接走 legacy initialize。
 */
function rememberLegacyPeer(config, storageV5, now = Date.now()) {
  let discoverVerdictKey = getDiscoverVerdictKey(config);
  if (discoverVerdictKey === undefined || !shouldRememberVerdict(discoverVerdictKey))
    return Promise.resolve();
  return updateDiscoverVerdicts(storageV5, (verdicts) => {
    let discoverVerdict = readDiscoverVerdict(verdicts, discoverVerdictKey);
    if (discoverVerdict !== undefined && isModernVerdictValid(discoverVerdictKey, discoverVerdict, now))
      return;
    let kept = retainValidDiscoverVerdicts(verdicts, now);
    kept[discoverVerdictKey] = {
      observedAt: now,
      modernProtocolVersion: MCP_PROTOCOL_NEXT,
    };
    return kept;
  });
}
//@ chunk-sywnjtqb.js:33444-33610 placement
/**
 * forgetDiscoverVerdict：删除判定（服务器后来以 modern 协议应答、或基于判定的连接被拒）。
 */
function forgetDiscoverVerdict(config, storageV5, now = Date.now()) {
  let discoverVerdictKey = getDiscoverVerdictKey(config);
  if (discoverVerdictKey === undefined) return Promise.resolve();
  return updateDiscoverVerdicts(storageV5, (verdicts) => {
    if (!Object.hasOwn(verdicts, discoverVerdictKey)) return;
    let kept = retainValidDiscoverVerdicts(verdicts, now);
    delete kept[discoverVerdictKey];
    return kept;
  });
}
//@ chunk-sywnjtqb.js:33610-33742 placement
/**
 * JSON-RPC 错误响应的 schema。
 */
var DISCOVER_SNIFF_MAX_BYTES; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var discoverRequestSchema;
var methodNotFoundSchema;
var jsonRpcErrorSchema;
deferInit("chunk-sywnjtqb.js:33610", () => {
  DISCOVER_SNIFF_MAX_BYTES = 16384;
  discoverRequestSchema = DoctorLazy(() =>
    objectSchema({
      method: literal("server/discover"),
    }),
  );
  methodNotFoundSchema = DoctorLazy(() =>
    objectSchema({
      error: objectSchema({
        code: literal(-32601),
      }),
    }),
  );
  jsonRpcErrorSchema = DoctorLazy(() =>
    objectSchema({
      error: objectSchema({
        code: numberSchema(),
      }),
    }),
  );
});
//@ chunk-sywnjtqb.js:33742-33939 placement
/**
 * wrapFetchDetectDiscoverMethodNotFound：包装 fetch，POST 体是 server/discover 时异步读响应前 16 KiB，若是 JSON-RPC -32601 错误就回调（标记 discoverMethodNotFound）。
 */
function wrapFetchDetectDiscoverMethodNotFound(fetchFn, onMethodNotFound) {
  return async (input, init) => {
    let isDiscoverPost =
      (init?.method ?? "GET").toUpperCase() === "POST" &&
      typeof init?.body === "string" &&
      isDiscoverRequestBody(init.body);
    let response = await fetchFn(input, init);
    if (isDiscoverPost)
      isMethodNotFoundResponse(response.clone()).then(
        (missing) => {
          if (missing) onMethodNotFound();
        },
        () => {},
      );
    return response;
  };
}
//@ chunk-sywnjtqb.js:33939-33985 placement
/**
 * 尝试解析 JSON，失败返回 undefined。
 */
function tryJsonParse(text) {
  try {
    return jsonParse(text);
  } catch {
    return;
  }
}
//@ chunk-sywnjtqb.js:33985-34068 placement
function isDiscoverRequestBody(text) {
  return text.includes("server/discover") && discoverRequestSchema().safeParse(tryJsonParse(text)).success;
}
//@ chunk-sywnjtqb.js:34068-34250 placement
function parseJsonRpcFromBody(body) {
  let chunks = body.trimStart().startsWith("{")
    ? [body]
    : body
        .split(
          `
`,
        )
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5));
  for (let chunk of chunks) {
    let parsed = tryJsonParse(chunk);
    if (parsed !== undefined) return parsed;
  }
  return;
}
//@ chunk-sywnjtqb.js:34250-34347 placement
/**
 * 从响应体里取 JSON-RPC 错误码。
 */
function discoverErrorCode(text) {
  let parseResult = jsonRpcErrorSchema().safeParse(
    parseJsonRpcFromBody(text.slice(0, DISCOVER_SNIFF_MAX_BYTES)),
  );
  return parseResult.success ? parseResult.data.error.code : undefined;
}
//@ chunk-sywnjtqb.js:34347-34628 placement
async function isMethodNotFoundResponse(response) {
  let reader = response.body?.getReader();
  if (!reader) return false;
  let textDecoder = new TextDecoder();
  let accumulated = "";
  let bytesRead = 0;
  let parsed = undefined;
  while (parsed === undefined && bytesRead < DISCOVER_SNIFF_MAX_BYTES) {
    let { done, value } = await reader.read();
    if (done) break;
    bytesRead += value.byteLength;
    accumulated += textDecoder.decode(value, {
      stream: true,
    });
    parsed = parseJsonRpcFromBody(accumulated);
  }
  reader.cancel().catch(() => {});
  return methodNotFoundSchema().safeParse(parsed).success;
}
//@ chunk-sywnjtqb.js:34628-34849 placement
/**
 * 在请求体里定位方法的标记字符串。
 */
var HANDSHAKE_METHODS = ["server/discover", "initialize", "notifications/initialized"];
var HANDSHAKE_METHOD_LABELS = {
  "server/discover": "discover",
  initialize: "initialize",
  "notifications/initialized": "initialized_notification",
};
var MAX_HANDSHAKE_SENDS = 8;
var MAX_TRACE_MS = 600000;
var SLOW_ANSWER_MS = 30000;
var METHOD_MARKER = '"method":"';
//@ chunk-sywnjtqb.js:34849-35132 placement
/**
 * createHandshakeTrace：握手跟踪状态（mcpHref、keepAliveDisabled、getAnsweredLocally、statelessGated、各阶段耗时与响应类型）。
 */
function createHandshakeTrace({ mcpUrl, keepAliveDisabled, getAnsweredLocally, statelessGated }) {
  return {
    mcpHref: normalizedHref(mcpUrl),
    keepAliveDisabled,
    getAnsweredLocally,
    statelessGated,
    transportBuilds: 0,
    handshakeSends: 0,
    connectEnded: false,
    initializedNotificationAnswered: false,
    messageStreamGetOutcome: "not_sent",
  };
}
//@ chunk-sywnjtqb.js:35132-35509 placement
/**
 * 重建传输时重置握手追踪的计时与状态字段。
 */
function resetHandshakeTrace(handshakeTrace) {
  handshakeTrace.transportBuilds++;
  handshakeTrace.handshakeSends = 0;
  handshakeTrace.initializedNotificationAnswered = false;
  handshakeTrace.pendingMethod = undefined;
  handshakeTrace.initializeRequestMs = undefined;
  handshakeTrace.initializeStartMs = undefined;
  handshakeTrace.initializeResultMs = undefined;
  handshakeTrace.initializedNotificationMs = undefined;
  handshakeTrace.initializedNotificationAnsweredAtMs = undefined;
  handshakeTrace.discoverResponseKind = undefined;
  handshakeTrace.initializeResponseKind = undefined;
  handshakeTrace.messageStreamGetOutcome = "not_sent";
}
//@ chunk-sywnjtqb.js:35509-35556 placement
/**
 * 标记连接已结束。
 */
function markConnectEnded(handshakeTrace) {
  if (handshakeTrace !== undefined) handshakeTrace.connectEnded = true;
}
//@ chunk-sywnjtqb.js:35556-36698 placement
/**
 * wrapFetchWithHandshakeTrace：记录 server/discover、initialize、notifications/initialized 的请求耗时与响应类型，以及 GET 通知流的结果（opened/405/401…）。
 */
function wrapFetchWithHandshakeTrace(fetchFn, handshakeTrace) {
  return (input, init) => {
    let upper = (init?.method ?? "GET").toUpperCase();
    if (upper === "GET") {
      let messageStreamGetOutcome = handshakeTrace.messageStreamGetOutcome;
      if (
        (messageStreamGetOutcome !== "not_sent" &&
          messageStreamGetOutcome !== "unauthorized" &&
          messageStreamGetOutcome !== "forbidden") ||
        !sameMcpHref(input, handshakeTrace) ||
        hasLastEventId(init)
      )
        return fetchFn(input, init);
      let transportBuilds = handshakeTrace.transportBuilds;
      handshakeTrace.messageStreamGetOutcome = "awaiting_response";
      let responsePromise = fetchFn(input, init);
      responsePromise.then(
        (response) =>
          safeRun(() => {
            if (handshakeTrace.transportBuilds === transportBuilds)
              handshakeTrace.messageStreamGetOutcome =
                handshakeTrace.getAnsweredLocally || wasListenGetSkipped(response)
                  ? "answered_locally"
                  : listenStreamOutcome(response);
          }),
        () =>
          safeRun(() => {
            if (handshakeTrace.transportBuilds === transportBuilds)
              handshakeTrace.messageStreamGetOutcome = "no_response";
          }),
      );
      return responsePromise;
    }
    if (
      upper !== "POST" ||
      handshakeTrace.connectEnded ||
      handshakeTrace.initializedNotificationAnswered ||
      handshakeTrace.handshakeSends >= MAX_HANDSHAKE_SENDS ||
      typeof init?.body !== "string" ||
      !sameMcpHref(input, handshakeTrace)
    )
      return fetchFn(input, init);
    let method = handshakeMethodOf(init.body);
    if (method === undefined) return fetchFn(input, init);
    handshakeTrace.handshakeSends++;
    let transportBuilds = handshakeTrace.transportBuilds;
    let startTime = performance.now();
    handshakeTrace.pendingMethod = method;
    if (method === "initialize") {
      handshakeTrace.initializeStartMs = startTime;
      handshakeTrace.initializeRequestMs = undefined;
      handshakeTrace.initializeResultMs = undefined;
    } else if (method === "notifications/initialized") {
      handshakeTrace.initializedNotificationMs = undefined;
      if (handshakeTrace.initializeStartMs !== undefined && handshakeTrace.initializeResultMs === undefined)
        handshakeTrace.initializeResultMs = clampTraceMs(startTime - handshakeTrace.initializeStartMs);
    }
    let responsePromise = fetchFn(input, init);
    responsePromise.then(
      (response) =>
        safeRun(() => recordHandshakeResponse(handshakeTrace, method, transportBuilds, startTime, response)),
      () =>
        safeRun(() => recordHandshakeResponse(handshakeTrace, method, transportBuilds, startTime, undefined)),
    );
    return responsePromise;
  };
}
//@ chunk-sywnjtqb.js:36698-37177 placement
/**
 * handshakeTraceTelemetry：把握手跟踪整理成遥测字段（discoverRequestMs、initializeRequestMs、statelessGated、keepAliveDisabled 等）。
 */
function handshakeTraceTelemetry(handshakeTrace) {
  if (handshakeTrace === undefined) return {};
  return {
    discoverRequestMs: handshakeTrace.discoverRequestMs,
    initializeRequestMs: handshakeTrace.initializeRequestMs,
    initializeResultMs: handshakeTrace.initializeResultMs,
    initializedNotificationMs: handshakeTrace.initializedNotificationMs,
    handshakeResponseKind: fromEnumOpt(
      handshakeTrace.initializeResponseKind ?? handshakeTrace.discoverResponseKind,
    ),
    handshakeRequestPending: fromEnumOpt(
      handshakeTrace.pendingMethod === undefined
        ? undefined
        : HANDSHAKE_METHOD_LABELS[handshakeTrace.pendingMethod],
    ),
    transportBuilds: handshakeTrace.transportBuilds,
    statelessGated: handshakeTrace.statelessGated,
    keepAliveDisabled: handshakeTrace.keepAliveDisabled,
  };
}
//@ chunk-sywnjtqb.js:37177-37267 placement
/**
 * 登记首次工具列表请求的上报信息。
 */
function armFirstToolsListReport(client, report) {
  getCliOwnedState().firstToolsListReports.set(client, {
    report,
    armedAtMs: performance.now(),
  });
}
//@ chunk-sywnjtqb.js:37267-37591 placement
/**
 * 首次工具列表请求结束后上报耗时与工具数（仅在登记后的有效期内）。
 */
function reportFirstToolsList(client, listingPromise, sentAtMs) {
  let getSentAtMs = () => (typeof sentAtMs === "function" ? sentAtMs() : sentAtMs);
  let firstToolsListReports = getCliOwnedState().firstToolsListReports;
  let armed = firstToolsListReports.get(client);
  if (armed === undefined) return listingPromise;
  firstToolsListReports.delete(client);
  let startTime = performance.now();
  let elapsedMs = startTime - armed.armedAtMs;
  if (elapsedMs > SLOW_ANSWER_MS) return listingPromise;
  let toolsListStartAfterConnectMs = clampTraceMs(elapsedMs);
  listingPromise.then(
    (tools) =>
      safeRun(() =>
        emitToolsListReport(
          armed.report,
          startTime,
          true,
          toolsListStartAfterConnectMs,
          getSentAtMs(),
          Array.isArray(tools) ? tools.length : undefined,
        ),
      ),
    () =>
      safeRun(() =>
        emitToolsListReport(armed.report, startTime, false, toolsListStartAfterConnectMs, getSentAtMs()),
      ),
  );
  return listingPromise;
}
//@ chunk-sywnjtqb.js:37591-37826 placement
function emitToolsListReport(
  report,
  startTime,
  toolsListOk,
  toolsListStartAfterConnectMs,
  sentAtMs,
  toolsCount,
) {
  let startTime_2 = performance.now();
  let fields = {
    toolsListMs: clampTraceMs(startTime_2 - startTime),
    toolsListOk,
    toolsListStartAfterConnectMs,
    ...(sentAtMs !== undefined && {
      toolsListFromSendMs: clampTraceMs(startTime_2 - sentAtMs),
    }),
    ...(toolsCount !== undefined && {
      toolsListCount: toolsCount,
    }),
  };
  setImmediate((reportFn, reportFields) => safeRun(() => reportFn(reportFields)), report, fields);
}
//@ chunk-sywnjtqb.js:37826-37913 placement
/**
 * 判断请求头里是否带 last-event-id。
 */
function hasLastEventId(init) {
  try {
    return new Headers(init?.headers).has("last-event-id");
  } catch {
    return false;
  }
}
//@ chunk-sywnjtqb.js:37913-37963 placement
/**
 * 判断请求地址是否与跟踪的地址一致。
 */
function sameMcpHref(input, handshakeTrace) {
  return normalizedHref(String(input)) === handshakeTrace.mcpHref;
}
//@ chunk-sywnjtqb.js:37963-38021 placement
/**
 * 规范化 URL 的 href（无效时原样）。
 */
function normalizedHref(mcpUrl) {
  try {
    return new URL(mcpUrl).href;
  } catch {
    return mcpUrl;
  }
}
//@ chunk-sywnjtqb.js:38021-38197 placement
function listenStreamOutcome(response) {
  if (response.ok) return "opened";
  switch (response.status) {
    case 405:
      return "method_not_allowed";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    default:
      return "http_error";
  }
}
//@ chunk-sywnjtqb.js:38197-38774 placement
function recordHandshakeResponse(handshakeTrace, method, transportBuilds, startTime, response) {
  let elapsedMs = clampTraceMs(performance.now() - startTime);
  if (method === "server/discover") handshakeTrace.discoverRequestMs = elapsedMs;
  if (handshakeTrace.transportBuilds !== transportBuilds) return;
  if (handshakeTrace.pendingMethod === method) handshakeTrace.pendingMethod = undefined;
  let contentKind = response?.ok ? responseContentKind(response) : undefined;
  switch (method) {
    case "server/discover":
      handshakeTrace.discoverResponseKind = contentKind ?? handshakeTrace.discoverResponseKind;
      return;
    case "initialize":
      handshakeTrace.initializeRequestMs = elapsedMs;
      handshakeTrace.initializeResponseKind = contentKind ?? handshakeTrace.initializeResponseKind;
      return;
    case "notifications/initialized":
      handshakeTrace.initializedNotificationMs = elapsedMs;
      handshakeTrace.initializedNotificationAnswered = response?.ok === true;
      if (response?.ok === true) handshakeTrace.initializedNotificationAnsweredAtMs = performance.now();
      return;
  }
}
//@ chunk-sywnjtqb.js:38774-38981 placement
function responseContentKind(response) {
  let [mediaType = ""] = (response.headers.get("content-type") ?? "").split(";");
  switch (mediaType.trim().toLowerCase()) {
    case "application/json":
      return "json";
    case "text/event-stream":
      return "event_stream";
    default:
      return "other";
  }
}
//@ chunk-sywnjtqb.js:38981-39164 placement
function handshakeMethodOf(body) {
  let index = body.indexOf(METHOD_MARKER);
  if (index === -1) return;
  let scanFrom = index + METHOD_MARKER.length;
  let found = HANDSHAKE_METHODS.find((candidate) => body.startsWith(`${candidate}"`, scanFrom));
  if (found === undefined) return;
  try {
    return jsonParse(body)?.method === found ? found : undefined;
  } catch {
    return;
  }
}
//@ chunk-sywnjtqb.js:39164-39225 placement
/**
 * 把耗时夹到 [0, $a] 并取整。
 */
function clampTraceMs(ms) {
  return Math.min(Math.max(Math.round(ms), 0), MAX_TRACE_MS);
}
//@ chunk-sywnjtqb.js:39225-39263 placement
/**
 * 安全执行回调（出错只记日志）。
 */
function safeRun(fn) {
  try {
    fn();
  } catch (error) {
    logError(error);
  }
}
export {
  getDiscoverVerdictKey,
  forgetDiscoverVerdict,
  isRememberedLegacyPeer,
  discoverErrorCode,
  wrapFetchDetectDiscoverMethodNotFound,
  createHandshakeTrace,
  wrapFetchWithHandshakeTrace,
  resetHandshakeTrace,
  markConnectEnded,
  handshakeTraceTelemetry,
  rememberLegacyPeer,
  armFirstToolsListReport,
  reportFirstToolsList,
};
