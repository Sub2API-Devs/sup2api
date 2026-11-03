/**
 * services/mcp/serverDiscover.ts
 *
 * 2.1.316 新增：MCP 握手追踪：包装 fetch 记录握手响应与 discover 判定。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8t8n4kdh.js (30)
 * attribution: placement 30
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
import { isSameOriginAsCcr, CCR_SESSION_MCP_PATH } from "./ccrMcpUrls.js";
import { hasUniqueQueryParams } from "../analytics/metadata.js";
import { isKnownProxyEndpointUrl } from "../../tools/WebFetchTool/utils.js";
import { headerValues, X_MCP_SERVER_ORIGIN } from "./fileReference/fileReferencePolicy.js";
import { RESERVED_SERVER_IDS_WITH_DOCS } from "./remoteBrowserServer.js";
import { MCP_PROTOCOL_NEXT } from "./mcpCallConstants.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, literal, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { wasListenGetSkipped } from "./connectionLifecycle.js";
import { fromEnumOpt } from "../analytics/safeMetadata.js";
import { getCliOwnedState } from "./cliOwnedClients.js";
import { logError } from "../../utils/log.js";

//@ chunk-8t8n4kdh.js:30726-30795 placement
/**
 * 允许的发现来源（directory、custom）。
 */
var CCR_UNIQUE_QUERY_KEYS = ["toolbox_mcp_server_id", "mcp_url"];
var DIRECTORY_SOURCES = ["directory", "custom"];
//@ chunk-8t8n4kdh.js:30795-31351 placement
/**
 * getDiscoverVerdictKey：判定键：claudeai-proxy 用连接器 id；stdio 用 hash(command,args,排序 env,项目根) 前缀 stdio:；CCR toolbox http URL 用 hash(server_id, mcp_url) 前缀 ccr:；其他返回 undefined（不记）。
 */
function getDiscoverVerdictKey(config) {
  if (config.type === "claudeai-proxy") return config.id;
  if ("command" in config) {
    let y = jsonStringify([
      config.command,
      config.args ?? [],
      Object.entries(config.env ?? {}).sort(([S], [w]) => (S < w ? -1 : S > w ? 1 : 0)),
      getProjectConfigRoot() ?? getOriginalCwdOrNull() ?? "",
    ]);
    return `${STDIO_VERDICT_PREFIX}${computeContentHash(y).slice(0, 32)}`;
  }
  if (
    config.type !== "http" ||
    !isSameOriginAsCcr(config.url) ||
    !hasUniqueQueryParams(config.url, CCR_UNIQUE_QUERY_KEYS) ||
    isKnownProxyEndpointUrl(config.url)
  )
    return;
  let n = headerValues(config.headers, X_MCP_SERVER_ORIGIN);
  let r = new URL(config.url);
  let lower = r.searchParams.get("toolbox_mcp_server_id")?.toLowerCase();
  if (
    !CCR_SESSION_MCP_PATH.test(r.pathname) ||
    n.length !== 1 ||
    !n.every((y) => DIRECTORY_SOURCES.includes(y)) ||
    !lower ||
    RESERVED_SERVER_IDS_WITH_DOCS.includes(lower)
  )
    return;
  let h = jsonStringify([lower, r.searchParams.get("mcp_url")]);
  return `${CCR_VERDICT_PREFIX}${computeContentHash(h).slice(0, 32)}`;
}
//@ chunk-8t8n4kdh.js:31351-31483 placement
/**
 * isRememberedLegacyPeer：判定表中有未过期且记录时 modern 版本等于当前（2026-07-28）的条目。
 */
async function isRememberedLegacyPeer(config, storageV5, r = Date.now()) {
  let discoverVerdictKey = getDiscoverVerdictKey(config);
  if (discoverVerdictKey === undefined || !shouldRememberVerdict(discoverVerdictKey)) return false;
  let discoverVerdict = readDiscoverVerdict(await getDiscoverVerdicts(storageV5), discoverVerdictKey);
  return discoverVerdict !== undefined && isModernVerdictValid(discoverVerdictKey, discoverVerdict, r);
}
//@ chunk-8t8n4kdh.js:31483-31707 placement
/**
 * rememberLegacyPeer：记录 {observedAt, modernProtocolVersion}，表示该服务器对 server/discover 回 -32601 或没回应，下次直接走 legacy initialize。
 */
function rememberLegacyPeer(config, storageV5, r = Date.now()) {
  let discoverVerdictKey = getDiscoverVerdictKey(config);
  if (discoverVerdictKey === undefined || !shouldRememberVerdict(discoverVerdictKey))
    return Promise.resolve();
  return updateDiscoverVerdicts(storageV5, (h) => {
    let discoverVerdict = readDiscoverVerdict(h, discoverVerdictKey);
    if (discoverVerdict !== undefined && isModernVerdictValid(discoverVerdictKey, discoverVerdict, r)) return;
    let S = retainValidDiscoverVerdicts(h, r);
    S[discoverVerdictKey] = {
      observedAt: r,
      modernProtocolVersion: MCP_PROTOCOL_NEXT,
    };
    return S;
  });
}
//@ chunk-8t8n4kdh.js:31707-31873 placement
/**
 * forgetDiscoverVerdict：删除判定（服务器后来以 modern 协议应答、或基于判定的连接被拒）。
 */
function forgetDiscoverVerdict(config, storageV5, r = Date.now()) {
  let discoverVerdictKey = getDiscoverVerdictKey(config);
  if (discoverVerdictKey === undefined) return Promise.resolve();
  return updateDiscoverVerdicts(storageV5, (h) => {
    if (!Object.hasOwn(h, discoverVerdictKey)) return;
    let y = retainValidDiscoverVerdicts(h, r);
    delete y[discoverVerdictKey];
    return y;
  });
}
//@ chunk-8t8n4kdh.js:31873-32005 placement
/**
 * JSON-RPC 错误响应的 schema。
 */
var DISCOVER_SNIFF_MAX_BYTES = 16384;
var discoverRequestSchema = DoctorLazy(() =>
  u({
    method: literal("server/discover"),
  }),
);
var methodNotFoundSchema = DoctorLazy(() =>
  u({
    error: u({
      code: literal(-32601),
    }),
  }),
);
var jsonRpcErrorSchema = DoctorLazy(() =>
  u({
    error: u({
      code: E(),
    }),
  }),
);
//@ chunk-8t8n4kdh.js:32005-32202 placement
/**
 * wrapFetchDetectDiscoverMethodNotFound：包装 fetch，POST 体是 server/discover 时异步读响应前 16 KiB，若是 JSON-RPC -32601 错误就回调（标记 discoverMethodNotFound）。
 */
function wrapFetchDetectDiscoverMethodNotFound(fetchFn, onMethodNotFound) {
  return async (r, s) => {
    let h =
      (s?.method ?? "GET").toUpperCase() === "POST" &&
      typeof s?.body === "string" &&
      isDiscoverRequestBody(s.body);
    let y = await fetchFn(r, s);
    if (h)
      isMethodNotFoundResponse(y.clone()).then(
        (S) => {
          if (S) onMethodNotFound();
        },
        () => {},
      );
    return y;
  };
}
//@ chunk-8t8n4kdh.js:32202-32248 placement
/**
 * 尝试解析 JSON，失败返回 undefined。
 */
function tryJsonParse(e) {
  try {
    return jsonParse(e);
  } catch {
    return;
  }
}
//@ chunk-8t8n4kdh.js:32248-32331 placement
function isDiscoverRequestBody(body) {
  return body.includes("server/discover") && discoverRequestSchema().safeParse(tryJsonParse(body)).success;
}
//@ chunk-8t8n4kdh.js:32331-32513 placement
function parseJsonRpcFromBody(e) {
  let n = e.trimStart().startsWith("{")
    ? [e]
    : e
        .split(
          `
`,
        )
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5));
  for (let r of n) {
    let s = tryJsonParse(r);
    if (s !== undefined) return s;
  }
  return;
}
//@ chunk-8t8n4kdh.js:32513-32610 placement
/**
 * 从响应体里取 JSON-RPC 错误码。
 */
function discoverErrorCode(text) {
  let n = jsonRpcErrorSchema().safeParse(parseJsonRpcFromBody(text.slice(0, DISCOVER_SNIFF_MAX_BYTES)));
  return n.success ? n.data.error.code : undefined;
}
//@ chunk-8t8n4kdh.js:32610-32891 placement
async function isMethodNotFoundResponse(e) {
  let reader = e.body?.getReader();
  if (!reader) return false;
  let textDecoder = new TextDecoder();
  let s = "";
  let h = 0;
  let y = undefined;
  while (y === undefined && h < DISCOVER_SNIFF_MAX_BYTES) {
    let { done: S, value: w } = await reader.read();
    if (S) break;
    h += w.byteLength;
    s += textDecoder.decode(w, {
      stream: true,
    });
    y = parseJsonRpcFromBody(s);
  }
  reader.cancel().catch(() => {});
  return methodNotFoundSchema().safeParse(y).success;
}
//@ chunk-8t8n4kdh.js:32891-33112 placement
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
//@ chunk-8t8n4kdh.js:33112-33395 placement
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
//@ chunk-8t8n4kdh.js:33395-33772 placement
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
//@ chunk-8t8n4kdh.js:33772-33819 placement
/**
 * 标记连接已结束。
 */
function markConnectEnded(handshakeTrace) {
  if (handshakeTrace !== undefined) handshakeTrace.connectEnded = true;
}
//@ chunk-8t8n4kdh.js:33819-34961 placement
/**
 * wrapFetchWithHandshakeTrace：记录 server/discover、initialize、notifications/initialized 的请求耗时与响应类型，以及 GET 通知流的结果（opened/405/401…）。
 */
function wrapFetchWithHandshakeTrace(e, handshakeTrace) {
  return (r, s) => {
    let upper = (s?.method ?? "GET").toUpperCase();
    if (upper === "GET") {
      let messageStreamGetOutcome = handshakeTrace.messageStreamGetOutcome;
      if (
        (messageStreamGetOutcome !== "not_sent" &&
          messageStreamGetOutcome !== "unauthorized" &&
          messageStreamGetOutcome !== "forbidden") ||
        !sameMcpHref(r, handshakeTrace) ||
        hasLastEventId(s)
      )
        return e(r, s);
      let transportBuilds = handshakeTrace.transportBuilds;
      handshakeTrace.messageStreamGetOutcome = "awaiting_response";
      let R = e(r, s);
      R.then(
        (ce) =>
          safeRun(() => {
            if (handshakeTrace.transportBuilds === transportBuilds)
              handshakeTrace.messageStreamGetOutcome =
                handshakeTrace.getAnsweredLocally || wasListenGetSkipped(ce)
                  ? "answered_locally"
                  : listenStreamOutcome(ce);
          }),
        () =>
          safeRun(() => {
            if (handshakeTrace.transportBuilds === transportBuilds)
              handshakeTrace.messageStreamGetOutcome = "no_response";
          }),
      );
      return R;
    }
    if (
      upper !== "POST" ||
      handshakeTrace.connectEnded ||
      handshakeTrace.initializedNotificationAnswered ||
      handshakeTrace.handshakeSends >= MAX_HANDSHAKE_SENDS ||
      typeof s?.body !== "string" ||
      !sameMcpHref(r, handshakeTrace)
    )
      return e(r, s);
    let y = handshakeMethodOf(s.body);
    if (y === undefined) return e(r, s);
    handshakeTrace.handshakeSends++;
    let transportBuilds = handshakeTrace.transportBuilds;
    let startTime = performance.now();
    handshakeTrace.pendingMethod = y;
    if (y === "initialize") {
      handshakeTrace.initializeStartMs = startTime;
      handshakeTrace.initializeRequestMs = undefined;
      handshakeTrace.initializeResultMs = undefined;
    } else if (y === "notifications/initialized") {
      handshakeTrace.initializedNotificationMs = undefined;
      if (handshakeTrace.initializeStartMs !== undefined && handshakeTrace.initializeResultMs === undefined)
        handshakeTrace.initializeResultMs = clampTraceMs(startTime - handshakeTrace.initializeStartMs);
    }
    let P = e(r, s);
    P.then(
      (M) => safeRun(() => recordHandshakeResponse(handshakeTrace, y, transportBuilds, startTime, M)),
      () => safeRun(() => recordHandshakeResponse(handshakeTrace, y, transportBuilds, startTime, undefined)),
    );
    return P;
  };
}
//@ chunk-8t8n4kdh.js:34961-35440 placement
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
//@ chunk-8t8n4kdh.js:35440-35530 placement
/**
 * 登记首次工具列表请求的上报信息。
 */
function armFirstToolsListReport(client, report) {
  getCliOwnedState().firstToolsListReports.set(client, {
    report,
    armedAtMs: performance.now(),
  });
}
//@ chunk-8t8n4kdh.js:35530-35854 placement
/**
 * 首次工具列表请求结束后上报耗时与工具数（仅在登记后的有效期内）。
 */
function reportFirstToolsList(e, n, r) {
  let s = () => (typeof r === "function" ? r() : r);
  let firstToolsListReports = getCliOwnedState().firstToolsListReports;
  let y = firstToolsListReports.get(e);
  if (y === undefined) return n;
  firstToolsListReports.delete(e);
  let startTime = performance.now();
  let w = startTime - y.armedAtMs;
  if (w > SLOW_ANSWER_MS) return n;
  let toolsListStartAfterConnectMs = clampTraceMs(w);
  n.then(
    (M) =>
      safeRun(() =>
        emitToolsListReport(
          y.report,
          startTime,
          true,
          toolsListStartAfterConnectMs,
          s(),
          Array.isArray(M) ? M.length : undefined,
        ),
      ),
    () => safeRun(() => emitToolsListReport(y.report, startTime, false, toolsListStartAfterConnectMs, s())),
  );
  return n;
}
//@ chunk-8t8n4kdh.js:35854-36089 placement
function emitToolsListReport(report, n, toolsListOk, toolsListStartAfterConnectMs, h, y) {
  let startTime = performance.now();
  let w = {
    toolsListMs: clampTraceMs(startTime - n),
    toolsListOk,
    toolsListStartAfterConnectMs,
    ...(h !== undefined && {
      toolsListFromSendMs: clampTraceMs(startTime - h),
    }),
    ...(y !== undefined && {
      toolsListCount: y,
    }),
  };
  setImmediate((P, M) => safeRun(() => P(M)), report, w);
}
//@ chunk-8t8n4kdh.js:36089-36176 placement
/**
 * 判断请求头里是否带 last-event-id。
 */
function hasLastEventId(e) {
  try {
    return new Headers(e?.headers).has("last-event-id");
  } catch {
    return false;
  }
}
//@ chunk-8t8n4kdh.js:36176-36226 placement
/**
 * 判断请求地址是否与跟踪的地址一致。
 */
function sameMcpHref(e, n) {
  return normalizedHref(String(e)) === n.mcpHref;
}
//@ chunk-8t8n4kdh.js:36226-36284 placement
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
//@ chunk-8t8n4kdh.js:36284-36460 placement
function listenStreamOutcome(e) {
  if (e.ok) return "opened";
  switch (e.status) {
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
//@ chunk-8t8n4kdh.js:36460-37037 placement
function recordHandshakeResponse(e, n, transportBuilds, s, h) {
  let y = clampTraceMs(performance.now() - s);
  if (n === "server/discover") e.discoverRequestMs = y;
  if (e.transportBuilds !== transportBuilds) return;
  if (e.pendingMethod === n) e.pendingMethod = undefined;
  let S = h?.ok ? responseContentKind(h) : undefined;
  switch (n) {
    case "server/discover":
      e.discoverResponseKind = S ?? e.discoverResponseKind;
      return;
    case "initialize":
      e.initializeRequestMs = y;
      e.initializeResponseKind = S ?? e.initializeResponseKind;
      return;
    case "notifications/initialized":
      e.initializedNotificationMs = y;
      e.initializedNotificationAnswered = h?.ok === true;
      if (h?.ok === true) e.initializedNotificationAnsweredAtMs = performance.now();
      return;
  }
}
//@ chunk-8t8n4kdh.js:37037-37244 placement
function responseContentKind(e) {
  let [n = ""] = (e.headers.get("content-type") ?? "").split(";");
  switch (n.trim().toLowerCase()) {
    case "application/json":
      return "json";
    case "text/event-stream":
      return "event_stream";
    default:
      return "other";
  }
}
//@ chunk-8t8n4kdh.js:37244-37427 placement
function handshakeMethodOf(body) {
  let index = body.indexOf(METHOD_MARKER);
  if (index === -1) return;
  let r = index + METHOD_MARKER.length;
  let found = HANDSHAKE_METHODS.find((h) => body.startsWith(`${h}"`, r));
  if (found === undefined) return;
  try {
    return jsonParse(body)?.method === found ? found : undefined;
  } catch {
    return;
  }
}
//@ chunk-8t8n4kdh.js:37427-37488 placement
/**
 * 把耗时夹到 [0, $a] 并取整。
 */
function clampTraceMs(e) {
  return Math.min(Math.max(Math.round(e), 0), MAX_TRACE_MS);
}
//@ chunk-8t8n4kdh.js:37488-37526 placement
/**
 * 安全执行回调（出错只记日志）。
 */
function safeRun(e) {
  try {
    e();
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
