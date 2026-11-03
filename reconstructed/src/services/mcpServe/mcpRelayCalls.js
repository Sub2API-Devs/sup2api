/**
 * services/mcpServe/mcpRelayCalls.ts
 *
 * 2.1.316 新增：mcp serve 转发调用：列出项目 MCP 服务器、把 JSON-RPC 转发给本机已连接服务器、关闭。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wy9dbk5f.js (30)
 * attribution: placement 30
 */
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { createKeyedQueue } from "../../utils/promiseQueue.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  u as u_2,
  A,
  o,
  U,
  pe,
  oe,
  M,
  E,
  T,
  Ue,
  zodStrictObject,
  A8e,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { ToolPermissionValueSchema } from "../mcp/types.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { sendMcpRequest } from "../mcp/mcpWireUtils.js";
import { getConnectionTimeoutMs, ir } from "../mcp/client.js";
import { sleep } from "../../utils/sleep.js";
import { isOrgConnectorName, normalizeNameForMCP, ORG_CONNECTOR, $gs } from "../mcp/normalization.js";
import {
  setMcpServerEnabledDurably,
  getClaudeCodeMcpConfigs,
  isMcpServerDisabled,
  parseMcpConfig,
  filterMcpServersByPolicy,
} from "../mcp/config.js";
import { loadAllPluginsCacheOnly, syncedPluginFolderId } from "../../utils/plugins/pluginLoader.js";
import { Xbn } from "../plugins/accountSync/syncedPluginHooks.js";
import { isBuiltinPluginId } from "../../plugins/builtinPlugins.js";
import { isPluginHooksMismatched, Pvr, awaitPluginSync } from "../remoteTools/commandRendering.js";
import { kA } from "../policyLimits/coldStartWaiter.js";
import { or } from "../../utils/settings/commandSyncNames.js";
import { ic } from "../../utils/plugins/cacheUtils.js";
import { getStrictMcpConfig } from "../../bootstrap/state.js";
import { isBareMode } from "../../utils/envUtils.js";
import { QHn, rTs } from "../mcp/startedServers.js";
import { isPlainObject as isPlainObject_2 } from "../../utils/isPlainObject.js";
import { errorMessage } from "../../utils/errors.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { mcpInfoFromString, getMcpPrefix } from "../mcp/mcpStringUtils.js";
import { getDenyRules, toolMatchesRule } from "../../utils/permissions/permissions.js";
import { ese } from "../../utils/claudeAiSync/skillsSync.js";
import { marketplaceSuffix } from "../../utils/plugins/pluginIdentifier.js";
import { SYNCED } from "../../utils/telemetry/pluginTelemetry.js";
import { parsePluginServerName } from "../../utils/plugins/lspPluginIntegration.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";

//@ chunk-wy9dbk5f.js:34460-35627 placement
var LISTPROJECTMCPSERVERS = "ListProjectMcpServers",
  RELAYPROJECTMCPMESSAGE = "RelayProjectMcpMessage",
  CLOSEPROJECTMCPSERVERS = "CloseProjectMcpServers",
  SETPROJECTMCPSERVERENABLED = "SetProjectMcpServerEnabled",
  ie = 100,
  Wt = 1000,
  Yn = 8388608,
  Vt = 8388608,
  Jn = 65280,
  Yt = 32768,
  je = 122,
  qn = /^(ping|tools\/call|resources\/(list|read|templates\/list)|prompts\/(list|get))$/,
  no = /(?<=^|HTTP )[1-5]\d\d\b/,
  ee = new SessionRootSlot(() => {
    let e = createKeyedQueue();
    return {
      listed: { project: new Map(), plugins: new Map(), orgConnectors: new Map() },
      round: {},
      list: (r, ...n) => e.run(r === "orgConnectors" ? r : "", () => listMcpServers(r, ...n)),
      setEnabled: (...r) => e.run("", () => closeProjectMcpServers(...r)),
      closed: !1,
    };
  }),
  Qc = DoctorLazy(() =>
    u_2({
      servers: A(
        u_2({
          name: o(),
          status: U(["connected", "failed", "needs-auth", "pending", "disabled"]),
          error: o().optional(),
          initializeResult: pe(o(), oe()).optional(),
          toolsListResult: pe(o(), oe()).optional(),
          toolPermissions: pe(o(), ToolPermissionValueSchema()).optional(),
        }),
      ).max(ie),
      cut: M(),
      hooksChecked: M().optional(),
    }),
  ),
  Zn = DoctorLazy(() => u_2({ plugins: M().optional(), waitMs: E().optional(), only: A(o()).optional() })),
  Qn = DoctorLazy(() =>
    u_2({
      server: o(),
      message: u_2({ jsonrpc: T("2.0"), id: Ue([o(), E()]), method: o(), params: pe(o(), oe()).optional() }),
    }),
  ),
  el = DoctorLazy(() =>
    u_2({
      response: u_2({
        jsonrpc: T("2.0"),
        id: Ue([o(), E()]),
        result: pe(o(), oe()).optional(),
        error: u_2({ code: E(), message: o(), data: oe().optional() }).optional(),
      }),
    }),
  );
//@ chunk-wy9dbk5f.js:35627-35679 placement
function mcpClientModule() {
  return require("./chunk-asne9cp8.js");
}
//@ chunk-wy9dbk5f.js:35679-35754 placement
function toolPermissionsOf({ config: config }) {
  return ("toolPermissions" in config && config.toolPermissions) || {};
}
//@ chunk-wy9dbk5f.js:35754-35901 placement
function initializeResultOf(e) {
  return {
    protocolVersion: e.negotiatedProtocolVersion,
    capabilities: e.capabilities,
    serverInfo: e.serverInfo,
    instructions: e.instructions,
  };
}
//@ chunk-wy9dbk5f.js:35901-36477 placement
async function describeProjectMcpServer(e) {
  let { name: r } = e;
  if (!isConnectedOrCached(e)) {
    let { error: error, errorCode: errorCode } = Object(e),
      [y] = no.exec(`${errorCode} ${error}`) ?? [],
      g = y ? `Server answered HTTP ${y}` : "Connection error",
      h = error && "url" in e.config ? g : error;
    return { server: { name: r, status: e.type, error: h } };
  }
  let n;
  try {
    n = await mcpClientModule().mcpClientModule().ensureConnectedClient(e);
  } catch {
    return { server: { name: r, status: "failed", error: "Connection error" } };
  }
  let s = {
    name: r,
    status: "connected",
    initializeResult: initializeResultOf(n),
    toolPermissions: toolPermissionsOf(n),
  };
  if (n.capabilities.tools)
    try {
      s.toolsListResult = await sendMcpRequest(
        n,
        { method: "tools/list" },
        { timeout: getConnectionTimeoutMs() },
      );
    } catch {}
  return { server: s, live: n };
}
//@ chunk-wy9dbk5f.js:36477-36722 placement
async function serveListProjectMcpServers(e, r, n) {
  let { list: list, round: round } = ee.of(n.session),
    c = Zn().safeParse(e ?? {}).data ?? {};
  if (c.only) {
    let g = sleep(c.waitMs ?? 0, r, { unref: !0 });
    (await Promise.race([round.project?.ended, g]), (c.waitMs = 0));
  }
  let y = c.plugins ? listRelayablePluginServers : listProjectScopedServers;
  return list("project", y, r, n, !1, c);
}
//@ chunk-wy9dbk5f.js:36722-36800 placement
function listProjectMcpServers(e, r, n) {
  let { list: list } = ee.of(n.session);
  return list("project", listRelayablePluginServers, r, n, !0);
}
//@ chunk-wy9dbk5f.js:37139-37911 placement
async function closeProjectMcpServers(e, r, n, s, a) {
  let of = ee.of(a.session);
  if (of.closed) throw Error("The repo's MCP servers have been closed");
  let switched = of.switched;
  if (n !== void 0 && switched?.requestId === n && switched.name === e && switched.enabled === r)
    return formatEnabledChoiceResult(r, switched.isSaved);
  let included = Object.keys(await listRelayablePluginServers(s, a))
      .filter((P) => !isServerDeniedOrInvalid(a, P, "") && !isOrgConnectorName(P))
      .slice(0, ie)
      .includes(e),
    S = of.listed.project.get(e),
    project = of.round.project,
    b = S ?? project?.rows.find((P) => P.name === e);
  if (!(included || (!r && b !== void 0))) throw Error("The listing has no server of that name");
  s.throwIfAborted();
  let { storageV5: storageV5 } = a.toolUseContext(),
    w = await setMcpServerEnabledDurably(e, r, storageV5);
  of.switched = { requestId: n, name: e, enabled: r, isSaved: w };
  let O = formatEnabledChoiceResult(r, w);
  if (!r && b !== void 0)
    (of.listed.project.delete(e),
      project?.settled.set(e, { server: { name: e, status: "disabled" } }),
      await mcpClientModule().mcpClientModule().clearServerCache(e, b.config));
  return O;
}
//@ chunk-wy9dbk5f.js:37911-38048 placement
async function listProjectScopedServers(e, r) {
  let entries = Object.entries(await loadServableMcpConfigs(r));
  return Object.fromEntries(
    entries.filter(function ([, a]) {
      return a.scope === "project";
    }),
  );
}
/**
 * 列出可中继的 MCP 服务器：项目作用域服务器，以及非内置、非受限的插件服务器。
 */
//@ chunk-wy9dbk5f.js:38048-38375 placement
async function listRelayablePluginServers(e, r) {
  let { storageV5: storageV5, credentials: credentials } = r.toolUseContext(),
    entries = Object.entries(await loadServableMcpConfigs(r)),
    c = await loadAllPluginsCacheOnly(storageV5, credentials);
  return Object.fromEntries(
    entries.filter(function ([, g]) {
      let { scope: scope, pluginSource: pluginSource, pluginPath: pluginPath = "" } = g;
      if (pluginSource === void 0) return scope === "project";
      let b = { sourceName: pluginSource, pluginPath: pluginPath };
      return !Xbn(pluginSource) && !isBuiltinPluginId(pluginSource) && !isPluginHooksMismatched(b, c, void 0);
    }),
  );
}
//@ chunk-wy9dbk5f.js:38375-38552 placement
async function loadServableMcpConfigs(e) {
  let { storageV5: storageV5, credentials: credentials } = e.toolUseContext();
  return (
    await kA(),
    or(),
    ic(storageV5, credentials),
    (getStrictMcpConfig() || isBareMode()
      ? { servers: {} }
      : await getClaudeCodeMcpConfigs({}, { storageV5: storageV5, credentials: credentials })
    ).servers
  );
}
/**
 * 开始列出可转发的 MCP 服务器：过滤被拒绝或不可中继的条目（最多 N 个），记录本地服务器，异步连接并收集每台服务器的描述，返回带 rows/settled/ended 的列表状态。
 */
//@ chunk-wy9dbk5f.js:38552-39463 placement
function startServerListing(kind, entries, context) {
  let { storageV5: storageV5, credentials: credentials } = context.toolUseContext(),
    filtered = entries.filter(function ([O]) {
      return !isServerDeniedOrInvalid(context, O, "") && (kind === "orgConnectors" || !isOrgConnectorName(O));
    }),
    y = { launchPermissionContext: void 0 },
    filtered_2 = entries.filter(function ([O]) {
      return (
        kind === "project" &&
        !isMcpServerDisabled(O) &&
        (isServerDeniedOrInvalid(y, O, "") || isOrgConnectorName(O))
      );
    }),
    fromEntries = Object.fromEntries(filtered.slice(0, ie)),
    of = QHn.of(context.session.host);
  for (let [w, O] of Object.entries(fromEntries))
    if (of.size < rTs && mcpClientModule().mcpClientModule().isLocalMcpServer(O) && !isMcpServerDisabled(w))
      of.add(w);
  let pending = [],
    settled = new Map(),
    R = (w) => settled.get(w)?.server.status === "disabled",
    listing = {
      rows: Object.entries(fromEntries).map(function ([O, P]) {
        return { name: O, type: "pending", config: P };
      }),
      settled: settled,
      unnamed: filtered_2,
      cut: filtered.length > ie,
      ended: mcpClientModule()
        .mcpClientModule()
        .getMcpToolsCommandsAndResources(
          function ({ client: client }) {
            if (R(client.name)) return;
            pending.push(
              describeProjectMcpServer(client).then((P) => {
                if (!R(client.name)) settled.set(client.name, P);
              }),
            );
          },
          fromEntries,
          storageV5,
          credentials,
          void 0,
          void 0,
          kind !== "plugins" && context.callerLogsSharedEvents,
        )
        .then(() => Promise.all(pending))
        .finally(() => {
          listing.hasEnded = !0;
        }),
      hasEnded: !1,
    };
  return listing;
}
//@ chunk-wy9dbk5f.js:39463-39643 placement
async function clearRemovedServerCaches(e, r) {
  let n = new Set();
  for (let { name: s, config: config } of e) n.add(ir(s, config));
  for (let { name: s, config: config } of r)
    if (!n.has(ir(s, config))) await mcpClientModule().mcpClientModule().clearServerCache(s, config);
}
//@ chunk-wy9dbk5f.js:39643-41383 placement
async function listMcpServers(e, r, n, s, a = !1, { waitMs: c, only: y } = {}) {
  let of = ee.of(s.session),
    h = of.round[e],
    S =
      y ||
      (c !== void 0 &&
        h?.hasEnded === !1 &&
        !Array.from(h.settled.values()).some(
          ({ server: { name: K, status: v } }) => v === "disabled" && !isMcpServerDisabled(K),
        ));
  if (!S) await h?.ended.catch(() => {});
  if (!a) n.throwIfAborted();
  let C = h;
  if (!C || !S)
    (await clearRemovedServerCaches(of.listed[e].values(), h?.rows ?? []),
      (C = of.round[e] =
        a
          ? { rows: [], settled: new Map(), unnamed: [], cut: !1, ended: Promise.resolve(), hasEnded: !0 }
          : startServerListing(e, Object.entries(await r(n, s)), s)));
  let b = c !== void 0 && sleep(c, n, { unref: !0 });
  if ((await (b ? Promise.race([C.ended, b]) : C.ended), !C.hasEnded)) n.throwIfAborted();
  let { settled: settled, rows: rows } = C,
    { cut: cut } = C,
    O = [...settled.values()],
    P = C.hasEnded ? [] : rows.filter((K) => !settled.has(K.name)),
    L = [],
    j = new Map(),
    B = 0,
    H = 0;
  for (let { name: K, type: v } of P) O.push({ server: { name: K, status: v }, live: void 0 });
  for (let [K] of C.unnamed) O.push({ server: { name: K, status: "failed" }, live: void 0 });
  for (let { server: server, live: live } of O) {
    let X = server.toolsListResult && { ...server.toolsListResult },
      V = X ? { ...server, toolsListResult: X } : server;
    if (Array.isArray(X?.tools)) {
      cut ||= X.tools.length > Wt;
      let sliced = X.tools.slice(0, Wt);
      if (
        ((X.tools = sliced.filter(function (on) {
          let { name: Qe } = Object(on);
          return !isServerDeniedOrInvalid(s, V.name, Qe) && V.toolPermissions?.[Qe] !== "blocked";
        })),
        live?.config.alwaysLoad === !1)
      )
        for (let Ze of sliced) delete Object(Ze)._meta?.["anthropic/alwaysLoad"];
    }
    let { bytes: bytes, values: values, depth: depth } = measureJson(V),
      en = H + values <= Jn && depth <= je;
    if (L.length === ie || !en || B + bytes > Yn) {
      cut = !0;
      continue;
    }
    if (((B += bytes), (H += values), L.push(V), live)) j.set(live.name, live);
  }
  let Y = of.listed[e];
  if (((of.listed[e] = n.aborted && !a ? Y : j), e === "project" && of.listed.project === j && !y))
    of.closed = a;
  let Q = [...of.listed[e].values(), ...P];
  return (
    await clearRemovedServerCaches(Q, [...Y.values(), ...rows]),
    n.throwIfAborted(),
    {
      summary: `${j.size} of ${L.length} servers connected${cut ? ", cut at a limit" : ""}`,
      output: { servers: y ? L.filter((K) => y.includes(K.name)) : L, cut: cut },
    }
  );
}
//@ chunk-wy9dbk5f.js:41383-41429 placement
function relayProjectMcpMessage(e, r, n) {
  return relayMcpMessage("project", e, r, n);
}
/**
 * 把调用方的一条 JSON-RPC 请求转发给本机已连接的 MCP 服务器（项目/组织连接器/插件），检查启动权限、限制答复大小。
 */
//@ chunk-wy9dbk5f.js:41429-41939 placement
async function relayMcpMessage(e, r, n, s) {
  let safeParse = Qn().safeParse(r);
  if (!safeParse.success) throw Error("Takes a server name and one JSON-RPC request with an id");
  let { server: server, message: message } = safeParse.data,
    of = ee.of(s.session),
    h = of.listed[e].get(server);
  if (h === void 0 && e === "project" && of.closed) throw Error("The repo's MCP servers have been closed");
  if (h === void 0) throw Error("The latest listing has no connected server of that name");
  let S = await relayJsonRpc(message, h, n, s);
  return {
    summary: `${message.method}${S.error ? " failed" : ""}`,
    output: { response: { jsonrpc: "2.0", id: message.id, ...S } },
  };
}
//@ chunk-wy9dbk5f.js:41939-43227 placement
async function relayJsonRpc({ method: method, params: params }, n, s, a) {
  if (method === "initialize") {
    let b = params?.protocolVersion;
    return capRelayAnswer(method, { result: { ...initializeResultOf(n), protocolVersion: b } });
  }
  if (!qn.test(method)) return { error: { code: -32601, message: `${method} is not relayed` } };
  let c = method === "tools/call",
    g =
      toolPermissionsOf(n)[String(params?.name)] === "blocked" ||
      isServerDeniedOrInvalid(a, n.name, params?.name);
  if (c && g)
    return {
      error: {
        code: -32602,
        message: "tools/call must name a tool that no launch deny rule names and its entry does not block",
      },
    };
  let mcpClientModule_2 = mcpClientModule().mcpClientModule(),
    S = params?._meta,
    C;
  try {
    let ensureConnectedClient = await mcpClientModule_2.ensureConnectedClient(n, { signal: s }),
      mcpToolTimeoutMs = mcpClientModule_2.getMcpToolTimeoutMs(ensureConnectedClient.config);
    C = {
      result: await sendMcpRequest(
        ensureConnectedClient,
        {
          method: method,
          params: isPlainObject_2(S) ? { ...params, _meta: { ...S, progressToken: void 0 } } : params,
        },
        c
          ? {
              signal: s,
              timeout:
                mcpClientModule_2.getMcpToolIdleTimeoutMs(ensureConnectedClient.config) || mcpToolTimeoutMs,
              maxTotalTimeout: mcpToolTimeoutMs,
              resetTimeoutOnProgress: !0,
              onprogress: function () {},
            }
          : { signal: s, timeout: getConnectionTimeoutMs() },
      ),
    };
  } catch (error) {
    if ((s.throwIfAborted(), mcpClientModule().mcpIsListAuthErrorModule().isListAuthError(error)))
      await mcpClientModule_2.clearServerCache(n.name, n.config);
    let { code: code, data: x } = Object(error),
      { getMcpErrorCode: getMcpErrorCode } = mcpClientModule().mcpSdkErrorClassificationModule(),
      O = code === "REQUEST_TIMEOUT" ? -32001 : getMcpErrorCode(error),
      { status: status = code } = Object(x),
      replaced = errorMessage(error).replace(/^MCP error -?\d+: /, ""),
      [j] = no.exec(`${status} ${replaced}`) ?? [],
      B = j ? `Server answered HTTP ${j}` : "Connection error";
    C =
      O === void 0
        ? { error: { code: -32603, message: B } }
        : { error: { code: O, message: replaced, data: x } };
  }
  return capRelayAnswer(method, C);
}
//@ chunk-wy9dbk5f.js:43227-43439 placement
function capRelayAnswer(e, r) {
  let { bytes: bytes, values: values, depth: depth } = measureJson(r);
  if (bytes > Vt || values > Yt || depth > je)
    return {
      error: {
        code: -32603,
        message: `The answer to ${e} is over ${Vt} bytes, ${Yt} fields and list elements or ${je} levels deep`,
      },
    };
  return r;
}
//@ chunk-wy9dbk5f.js:43439-43715 placement
function measureJson(e) {
  let r = 0,
    n = 0,
    weakMap = new WeakMap();
  try {
    let a = jsonStringify(e, function (y, g) {
      if ((r++, typeof g === "object" && g !== null)) {
        let h = (weakMap.get(Object(this)) ?? 0) + 1;
        (weakMap.set(g, h), (n = Math.max(n, h)));
      }
      return g;
    });
    return { bytes: Buffer.byteLength(a), values: r, depth: n };
  } catch {
    return { bytes: 1 / 0, values: 1 / 0, depth: 1 / 0 };
  }
}
//@ chunk-wy9dbk5f.js:43715-43952 placement
function isServerDeniedOrInvalid({ launchPermissionContext: launchPermissionContext }, r, n) {
  let s = mcpInfoFromString(getMcpPrefix(r))?.serverName;
  if (typeof n !== "string" || s !== normalizeNameForMCP(r)) return !0;
  if (launchPermissionContext === void 0) return !1;
  let a = { name: n, mcpInfo: { serverName: r, toolName: n } };
  return getDenyRules(launchPermissionContext).some(function (y) {
    return toolMatchesRule(launchPermissionContext, a, y);
  });
}
//@ chunk-wy9dbk5f.js:43952-44086 placement
function formatEnabledChoiceResult(e, r) {
  if (!r) throw Error("The choice could not be saved");
  return { summary: e ? "Saved as on" : "Switched off", output: { enabled: e } };
}
//@ chunk-wy9dbk5f.js:44086-44357 placement
var LISTORGCONNECTORMCPSERVERS = "ListOrgConnectorMcpServers",
  RELAYORGCONNECTORMCPMESSAGE = "RelayOrgConnectorMcpMessage",
  ur = DoctorLazy(() =>
    pe(
      o()
        .startsWith(ORG_CONNECTOR)
        .regex(/^(?!.*[._]{2})[A-Za-z0-9._-]+[A-Za-z0-9]$/)
        .max($gs),
      zodStrictObject({ type: U(["http", "sse"]), url: A8e({ protocol: /^https$/ }).max(4096) }),
    ).refine((e) => Object.keys(e).length <= ie),
  );
//@ chunk-wy9dbk5f.js:44357-44967 placement
function serveListOrgConnectorServers(e, r, n) {
  let safeParse = ur().safeParse(Object(e).servers);
  if (!safeParse.success)
    throw Error(
      "Takes `servers`: http or sse entries with an https URL, each under a name that starts with org-connector-, has only letters, digits, . _ and -, has no two of . and _ in a row, ends in a letter or a digit, and has at most 128 characters",
    );
  let { list: list } = ee.of(n.session);
  return list(
    "orgConnectors",
    async function () {
      (await kA(), or());
      let { config: config } = parseMcpConfig({
          configObject: { mcpServers: safeParse.data },
          expandVars: !1,
          scope: "dynamic",
        }),
        { allowed: allowed } = filterMcpServersByPolicy(config?.mcpServers ?? {}),
        h = {};
      for (let [S, C] of Object.entries(allowed)) h[S] = { ...C, scope: "dynamic" };
      return h;
    },
    r,
    n,
  );
}
//@ chunk-wy9dbk5f.js:44967-45019 placement
function relayOrgConnectorMessage(e, r, n) {
  return relayMcpMessage("orgConnectors", e, r, n);
}
//@ chunk-wy9dbk5f.js:45019-45235 placement
var LISTPLUGINMCPSERVERS = "ListPluginMcpServers",
  RELAYPLUGINMCPMESSAGE = "RelayPluginMcpMessage",
  pr = DoctorLazy(() =>
    u_2({
      waitMs: E()
        .int()
        .positive()
        .optional()
        .catch(void 0),
      resync: M()
        .optional()
        .catch(void 0),
      registeredHooks: pe(o(), Pvr())
        .optional()
        .catch(void 0),
    }),
  );
//@ chunk-wy9dbk5f.js:45235-45319 placement = getServerCommandArray (1)
function getServerCommandArray({ type: e, command: command }) {
  return e === "stdio" || (e === void 0 && typeof command === "string");
}
//@ chunk-wy9dbk5f.js:45319-45406 placement
function mr(e, r) {
  let index = e.lastIndexOf("@");
  return `plugin:${index === -1 ? e : e.slice(0, index)}:${r}`;
}
//@ chunk-wy9dbk5f.js:45406-45452 placement
function relayPluginMcpMessage(e, r, n) {
  return relayMcpMessage("plugins", e, r, n);
}
//@ chunk-wy9dbk5f.js:45452-45621 placement
async function serveListPluginMcpServers(e, r, n) {
  let s = pr().safeParse(e ?? {}).data,
    { list: list } = ee.of(n.session),
    c = await list("plugins", createSyncedPluginServerLoader(s ?? {}), r, n);
  return { ...c, output: { ...c.output, hooksChecked: !0 } };
}
/**
 * 生成读取已同步插件 MCP 服务器的函数：等待插件同步（有时限）、加载配置，只保留来自同步市场、清单命名一致且钩子未改变的服务器。
 */
//@ chunk-wy9dbk5f.js:45621-46366 placement
function createSyncedPluginServerLoader({
  waitMs: waitMs = 1 / 0,
  resync: resync = !1,
  registeredHooks: registeredHooks,
}) {
  return async function (signal, context) {
    let { storageV5: storageV5, credentials: credentials } = context.toolUseContext(),
      h = sleep(Math.min(ese(), waitMs), signal, { unref: !0 });
    (await awaitPluginSync(context.session, credentials, { resync: resync, deadline: h }),
      signal.throwIfAborted(),
      ic(storageV5, credentials));
    let configs = await loadServableMcpConfigs(context),
      plugins = await loadAllPluginsCacheOnly(storageV5, credentials),
      b = new Map(
        plugins.enabled.map((O) => [O.source, { folder: syncedPluginFolderId(O.path), pluginPath: O.path }]),
      ),
      result = {},
      x = 0,
      w = 0;
    for (let [O, P] of Object.entries(configs)) {
      let { pluginSource: pluginSource } = P,
        j = pluginSource && b.get(pluginSource);
      if (!j || marketplaceSuffix(pluginSource) !== SYNCED || !getServerCommandArray(P)) continue;
      let B = parsePluginServerName(O)?.serverName,
        H = B && mr(j.folder, B);
      if (H !== O) {
        x++;
        continue;
      }
      let Y = { sourceName: pluginSource, pluginPath: j.pluginPath };
      if (isPluginHooksMismatched(Y, plugins, registeredHooks?.[j.folder])) {
        w++;
        continue;
      }
      result[H] = P;
    }
    if (x > 0) logFeatureSad("ccs_plugin_mcp", "named_otherwise_by_manifest");
    if (w > 0) logFeatureSad("ccs_plugin_mcp", "hooks_differ");
    return result;
  };
}

export {
  ee,
  LISTPROJECTMCPSERVERS,
  serveListProjectMcpServers,
  LISTPLUGINMCPSERVERS,
  serveListPluginMcpServers,
  RELAYPLUGINMCPMESSAGE,
  relayPluginMcpMessage,
  LISTORGCONNECTORMCPSERVERS,
  serveListOrgConnectorServers,
  RELAYORGCONNECTORMCPMESSAGE,
  relayOrgConnectorMessage,
  RELAYPROJECTMCPMESSAGE,
  relayProjectMcpMessage,
  CLOSEPROJECTMCPSERVERS,
  listProjectMcpServers,
  SETPROJECTMCPSERVERENABLED,
};
