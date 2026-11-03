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
  Qr,
  readDiscoverVerdict,
  getDiscoverVerdicts,
  es,
  updateDiscoverVerdicts,
  retainValidDiscoverVerdicts,
} from "./discoverVerdicts.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { isSameOriginAsCcr, CCR_SESSION_MCP_PATH } from "./ccrMcpUrls.js";
import { hasUniqueQueryParams } from "../analytics/metadata.js";
import { isKnownProxyEndpointUrl } from "../../tools/WebFetchTool/utils.js";
import { iJ, X_MCP_SERVER_ORIGIN } from "./fileReference/fileReferencePolicy.js";
import { cyr } from "./remoteBrowserServer.js";
import { MCP_PROTOCOL_NEXT } from "./mcpCallConstants.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, T, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { JGs } from "./connectionLifecycle.js";
import { fromEnumOpt } from "../analytics/safeMetadata.js";
import { ht } from "./cliOwnedClients.js";
import { logError } from "../../utils/log.js";

//@ chunk-8t8n4kdh.js:30726-30795 placement
var va = ["toolbox_mcp_server_id", "mcp_url"],
  Ra = ["directory", "custom"];
/**
 * getDiscoverVerdictKey：判定键：claudeai-proxy 用连接器 id；stdio 用 hash(command,args,排序 env,项目根) 前缀 stdio:；CCR toolbox http URL 用 hash(server_id, mcp_url) 前缀 ccr:；其他返回 undefined（不记）。
 */
//@ chunk-8t8n4kdh.js:30795-31351 placement
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
    !hasUniqueQueryParams(config.url, va) ||
    isKnownProxyEndpointUrl(config.url)
  )
    return;
  let n = iJ(config.headers, X_MCP_SERVER_ORIGIN),
    r = new URL(config.url),
    s = r.searchParams.get("toolbox_mcp_server_id")?.toLowerCase();
  if (
    !CCR_SESSION_MCP_PATH.test(r.pathname) ||
    n.length !== 1 ||
    !n.every((y) => Ra.includes(y)) ||
    !s ||
    cyr.includes(s)
  )
    return;
  let h = jsonStringify([s, r.searchParams.get("mcp_url")]);
  return `${CCR_VERDICT_PREFIX}${computeContentHash(h).slice(0, 32)}`;
}
/**
 * isRememberedLegacyPeer：判定表中有未过期且记录时 modern 版本等于当前（2026-07-28）的条目。
 */
//@ chunk-8t8n4kdh.js:31351-31483 placement
async function isRememberedLegacyPeer(config, storageV5, r = Date.now()) {
  let s = getDiscoverVerdictKey(config);
  if (s === void 0 || !Qr(s)) return !1;
  let h = readDiscoverVerdict(await getDiscoverVerdicts(storageV5), s);
  return h !== void 0 && es(s, h, r);
}
/**
 * rememberLegacyPeer：记录 {observedAt, modernProtocolVersion}，表示该服务器对 server/discover 回 -32601 或没回应，下次直接走 legacy initialize。
 */
//@ chunk-8t8n4kdh.js:31483-31707 placement
function rememberLegacyPeer(config, storageV5, r = Date.now()) {
  let s = getDiscoverVerdictKey(config);
  if (s === void 0 || !Qr(s)) return Promise.resolve();
  return updateDiscoverVerdicts(storageV5, (h) => {
    let y = readDiscoverVerdict(h, s);
    if (y !== void 0 && es(s, y, r)) return;
    let S = retainValidDiscoverVerdicts(h, r);
    return ((S[s] = { observedAt: r, modernProtocolVersion: MCP_PROTOCOL_NEXT }), S);
  });
}
/**
 * forgetDiscoverVerdict：删除判定（服务器后来以 modern 协议应答、或基于判定的连接被拒）。
 */
//@ chunk-8t8n4kdh.js:31707-31873 placement
function forgetDiscoverVerdict(config, storageV5, r = Date.now()) {
  let s = getDiscoverVerdictKey(config);
  if (s === void 0) return Promise.resolve();
  return updateDiscoverVerdicts(storageV5, (h) => {
    if (!Object.hasOwn(h, s)) return;
    let y = retainValidDiscoverVerdicts(h, r);
    return (delete y[s], y);
  });
}
//@ chunk-8t8n4kdh.js:31873-32005 placement
var DISCOVER_SNIFF_MAX_BYTES = 16384,
  ka = DoctorLazy(() => u({ method: T("server/discover") })),
  Oa = DoctorLazy(() => u({ error: u({ code: T(-32601) }) })),
  La = DoctorLazy(() => u({ error: u({ code: E() }) }));
/**
 * wrapFetchDetectDiscoverMethodNotFound：包装 fetch，POST 体是 server/discover 时异步读响应前 16 KiB，若是 JSON-RPC -32601 错误就回调（标记 discoverMethodNotFound）。
 */
//@ chunk-8t8n4kdh.js:32005-32202 placement
function wrapFetchDetectDiscoverMethodNotFound(fetchFn, onMethodNotFound) {
  return async (r, s) => {
    let h =
        (s?.method ?? "GET").toUpperCase() === "POST" &&
        typeof s?.body === "string" &&
        isDiscoverRequestBody(s.body),
      y = await fetchFn(r, s);
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
function as(e) {
  try {
    return jsonParse(e);
  } catch {
    return;
  }
}
//@ chunk-8t8n4kdh.js:32248-32331 placement
function isDiscoverRequestBody(e) {
  return e.includes("server/discover") && ka().safeParse(as(e)).success;
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
        .filter((r) => r.startsWith("data:"))
        .map((r) => r.slice(5));
  for (let r of n) {
    let s = as(r);
    if (s !== void 0) return s;
  }
  return;
}
//@ chunk-8t8n4kdh.js:32513-32610 placement
function ds(e) {
  let safeParse = La().safeParse(parseJsonRpcFromBody(e.slice(0, DISCOVER_SNIFF_MAX_BYTES)));
  return safeParse.success ? safeParse.data.error.code : void 0;
}
//@ chunk-8t8n4kdh.js:32610-32891 placement
async function isMethodNotFoundResponse(e) {
  let n = e.body?.getReader();
  if (!n) return !1;
  let textDecoder = new TextDecoder(),
    s = "",
    h = 0,
    y = void 0;
  while (y === void 0 && h < DISCOVER_SNIFF_MAX_BYTES) {
    let { done: S, value: w } = await n.read();
    if (S) break;
    ((h += w.byteLength), (s += textDecoder.decode(w, { stream: !0 })), (y = parseJsonRpcFromBody(s)));
  }
  return (n.cancel().catch(() => {}), Oa().safeParse(y).success);
}
//@ chunk-8t8n4kdh.js:32891-33112 placement
var HANDSHAKE_METHODS = ["server/discover", "initialize", "notifications/initialized"],
  xa = {
    "server/discover": "discover",
    initialize: "initialize",
    "notifications/initialized": "initialized_notification",
  },
  Ua = 8,
  $a = 600000,
  Ba = 30000,
  us = '"method":"';
/**
 * createHandshakeTrace：握手跟踪状态（mcpHref、keepAliveDisabled、getAnsweredLocally、statelessGated、各阶段耗时与响应类型）。
 */
//@ chunk-8t8n4kdh.js:33112-33395 placement
function createHandshakeTrace({
  mcpUrl: mcpUrl,
  keepAliveDisabled: keepAliveDisabled,
  getAnsweredLocally: getAnsweredLocally,
  statelessGated: statelessGated,
}) {
  return {
    mcpHref: _s(mcpUrl),
    keepAliveDisabled: keepAliveDisabled,
    getAnsweredLocally: getAnsweredLocally,
    statelessGated: statelessGated,
    transportBuilds: 0,
    handshakeSends: 0,
    connectEnded: !1,
    initializedNotificationAnswered: !1,
    messageStreamGetOutcome: "not_sent",
  };
}
/**
 * 重建传输时重置握手追踪的计时与状态字段。
 */
//@ chunk-8t8n4kdh.js:33395-33772 placement
function resetHandshakeTrace(e) {
  (e.transportBuilds++,
    (e.handshakeSends = 0),
    (e.initializedNotificationAnswered = !1),
    (e.pendingMethod = void 0),
    (e.initializeRequestMs = void 0),
    (e.initializeStartMs = void 0),
    (e.initializeResultMs = void 0),
    (e.initializedNotificationMs = void 0),
    (e.initializedNotificationAnsweredAtMs = void 0),
    (e.discoverResponseKind = void 0),
    (e.initializeResponseKind = void 0),
    (e.messageStreamGetOutcome = "not_sent"));
}
//@ chunk-8t8n4kdh.js:33772-33819 placement
function zn(e) {
  if (e !== void 0) e.connectEnded = !0;
}
/**
 * wrapFetchWithHandshakeTrace：记录 server/discover、initialize、notifications/initialized 的请求耗时与响应类型，以及 GET 通知流的结果（opened/405/401…）。
 */
//@ chunk-8t8n4kdh.js:33819-34961 placement
function wrapFetchWithHandshakeTrace(e, n) {
  return (r, s) => {
    let upper = (s?.method ?? "GET").toUpperCase();
    if (upper === "GET") {
      let messageStreamGetOutcome = n.messageStreamGetOutcome;
      if (
        (messageStreamGetOutcome !== "not_sent" &&
          messageStreamGetOutcome !== "unauthorized" &&
          messageStreamGetOutcome !== "forbidden") ||
        !fs(r, n) ||
        Ha(s)
      )
        return e(r, s);
      let transportBuilds = n.transportBuilds;
      n.messageStreamGetOutcome = "awaiting_response";
      let R = e(r, s);
      return (
        R.then(
          (ce) =>
            Cn(() => {
              if (n.transportBuilds === transportBuilds)
                n.messageStreamGetOutcome =
                  n.getAnsweredLocally || JGs(ce) ? "answered_locally" : listenStreamOutcome(ce);
            }),
          () =>
            Cn(() => {
              if (n.transportBuilds === transportBuilds) n.messageStreamGetOutcome = "no_response";
            }),
        ),
        R
      );
    }
    if (
      upper !== "POST" ||
      n.connectEnded ||
      n.initializedNotificationAnswered ||
      n.handshakeSends >= Ua ||
      typeof s?.body !== "string" ||
      !fs(r, n)
    )
      return e(r, s);
    let y = handshakeMethodOf(s.body);
    if (y === void 0) return e(r, s);
    n.handshakeSends++;
    let transportBuilds = n.transportBuilds,
      startTime = performance.now();
    if (((n.pendingMethod = y), y === "initialize"))
      ((n.initializeStartMs = startTime), (n.initializeRequestMs = void 0), (n.initializeResultMs = void 0));
    else if (y === "notifications/initialized") {
      if (
        ((n.initializedNotificationMs = void 0),
        n.initializeStartMs !== void 0 && n.initializeResultMs === void 0)
      )
        n.initializeResultMs = jn(startTime - n.initializeStartMs);
    }
    let P = e(r, s);
    return (
      P.then(
        (M) => Cn(() => recordHandshakeResponse(n, y, transportBuilds, startTime, M)),
        () => Cn(() => recordHandshakeResponse(n, y, transportBuilds, startTime, void 0)),
      ),
      P
    );
  };
}
/**
 * handshakeTraceTelemetry：把握手跟踪整理成遥测字段（discoverRequestMs、initializeRequestMs、statelessGated、keepAliveDisabled 等）。
 */
//@ chunk-8t8n4kdh.js:34961-35440 placement
function handshakeTraceTelemetry(e) {
  if (e === void 0) return {};
  return {
    discoverRequestMs: e.discoverRequestMs,
    initializeRequestMs: e.initializeRequestMs,
    initializeResultMs: e.initializeResultMs,
    initializedNotificationMs: e.initializedNotificationMs,
    handshakeResponseKind: fromEnumOpt(e.initializeResponseKind ?? e.discoverResponseKind),
    handshakeRequestPending: fromEnumOpt(e.pendingMethod === void 0 ? void 0 : xa[e.pendingMethod]),
    transportBuilds: e.transportBuilds,
    statelessGated: e.statelessGated,
    keepAliveDisabled: e.keepAliveDisabled,
  };
}
//@ chunk-8t8n4kdh.js:35440-35530 placement
function hs(e, n) {
  ht().firstToolsListReports.set(e, { report: n, armedAtMs: performance.now() });
}
/**
 * 首次工具列表请求结束后上报耗时与工具数（仅在登记后的有效期内）。
 */
//@ chunk-8t8n4kdh.js:35530-35854 placement
function reportFirstToolsList(e, n, r) {
  let s = () => (typeof r === "function" ? r() : r),
    firstToolsListReports = ht().firstToolsListReports,
    y = firstToolsListReports.get(e);
  if (y === void 0) return n;
  firstToolsListReports.delete(e);
  let startTime = performance.now(),
    w = startTime - y.armedAtMs;
  if (w > Ba) return n;
  let P = jn(w);
  return (
    n.then(
      (M) =>
        Cn(() => emitToolsListReport(y.report, startTime, !0, P, s(), Array.isArray(M) ? M.length : void 0)),
      () => Cn(() => emitToolsListReport(y.report, startTime, !1, P, s())),
    ),
    n
  );
}
//@ chunk-8t8n4kdh.js:35854-36089 placement
function emitToolsListReport(e, n, r, s, h, y) {
  let startTime = performance.now(),
    w = {
      toolsListMs: jn(startTime - n),
      toolsListOk: r,
      toolsListStartAfterConnectMs: s,
      ...(h !== void 0 && { toolsListFromSendMs: jn(startTime - h) }),
      ...(y !== void 0 && { toolsListCount: y }),
    };
  setImmediate((P, M) => Cn(() => P(M)), e, w);
}
//@ chunk-8t8n4kdh.js:36089-36176 placement
function Ha(e) {
  try {
    return new Headers(e?.headers).has("last-event-id");
  } catch {
    return !1;
  }
}
//@ chunk-8t8n4kdh.js:36176-36226 placement
function fs(e, n) {
  return _s(String(e)) === n.mcpHref;
}
//@ chunk-8t8n4kdh.js:36226-36284 placement
function _s(e) {
  try {
    return new URL(e).href;
  } catch {
    return e;
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
function recordHandshakeResponse(e, n, r, s, h) {
  let y = jn(performance.now() - s);
  if (n === "server/discover") e.discoverRequestMs = y;
  if (e.transportBuilds !== r) return;
  if (e.pendingMethod === n) e.pendingMethod = void 0;
  let S = h?.ok ? responseContentKind(h) : void 0;
  switch (n) {
    case "server/discover":
      e.discoverResponseKind = S ?? e.discoverResponseKind;
      return;
    case "initialize":
      ((e.initializeRequestMs = y), (e.initializeResponseKind = S ?? e.initializeResponseKind));
      return;
    case "notifications/initialized":
      if (
        ((e.initializedNotificationMs = y), (e.initializedNotificationAnswered = h?.ok === !0), h?.ok === !0)
      )
        e.initializedNotificationAnsweredAtMs = performance.now();
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
function handshakeMethodOf(e) {
  let index = e.indexOf(us);
  if (index === -1) return;
  let r = index + us.length,
    found = HANDSHAKE_METHODS.find((h) => e.startsWith(`${h}"`, r));
  if (found === void 0) return;
  try {
    return jsonParse(e)?.method === found ? found : void 0;
  } catch {
    return;
  }
}
//@ chunk-8t8n4kdh.js:37427-37488 placement
function jn(e) {
  return Math.min(Math.max(Math.round(e), 0), $a);
}
//@ chunk-8t8n4kdh.js:37488-37526 placement
function Cn(e) {
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
  ds,
  wrapFetchDetectDiscoverMethodNotFound,
  createHandshakeTrace,
  wrapFetchWithHandshakeTrace,
  resetHandshakeTrace,
  zn,
  handshakeTraceTelemetry,
  rememberLegacyPeer,
  hs,
  reportFirstToolsList,
};
