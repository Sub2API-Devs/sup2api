/**
 * services/mcpServe/mcpRelayCalls.ts
 *
 * 2.1.316 新增：mcp serve 转发调用：列出项目 MCP 服务器、把 JSON-RPC 转发给本机已连接服务器、关闭。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wy9dbk5f.js (31)
 * attribution: placement 31
 */
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { createKeyedQueue } from "../../utils/promiseQueue.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  u,
  array,
  string,
  _enum,
  record,
  unknown,
  M,
  E,
  literal,
  union,
  zodStrictObject,
  A8e,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { ToolPermissionValueSchema } from "../mcp/types.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { sendMcpRequest } from "../mcp/mcpWireUtils.js";
import { getConnectionTimeoutMs, serverCacheKey } from "../mcp/client.js";
import { sleep } from "../../utils/sleep.js";
import { SetMcpServerEnabledInputSchema } from "../mcp/utils.js";
import {
  isOrgConnectorName,
  normalizeNameForMCP,
  ORG_CONNECTOR,
  MAX_SERVER_NAME_CHARS,
} from "../mcp/normalization.js";
import {
  setMcpServerEnabledDurably,
  getClaudeCodeMcpConfigs,
  isMcpServerDisabled,
  parseMcpConfig,
  filterMcpServersByPolicy,
} from "../mcp/config.js";
import { loadAllPluginsCacheOnly, syncedPluginFolderId } from "../../utils/plugins/pluginLoader.js";
import { isSyncedMarketplace } from "../plugins/accountSync/syncedPluginHooks.js";
import { isBuiltinPluginId } from "../../plugins/builtinPlugins.js";
import {
  isPluginHooksMismatched,
  registeredHooksListSchema,
  awaitPluginSync,
} from "../remoteTools/commandRendering.js";
import { awaitPolicyColdStartWaiter } from "../policyLimits/coldStartWaiter.js";
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";
import { refreshPluginCaches } from "../../utils/plugins/cacheUtils.js";
import { getStrictMcpConfig } from "../../bootstrap/state.js";
import { isBareMode } from "../../utils/envUtils.js";
import { startedServerKeys, MAX_STARTED_SERVER_KEYS } from "../mcp/startedServers.js";
import { isPlainObject as isPlainObject_2 } from "../../utils/isPlainObject.js";
import { errorMessage } from "../../utils/errors.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { mcpInfoFromString, getMcpPrefix } from "../mcp/mcpStringUtils.js";
import { getDenyRules, toolMatchesRule } from "../../utils/permissions/permissions.js";
import { pluginInstallTimeoutMs } from "../../utils/claudeAiSync/skillsSync.js";
import { marketplaceSuffix } from "../../utils/plugins/pluginIdentifier.js";
import { SYNCED } from "../../utils/telemetry/pluginTelemetry.js";
import { parsePluginServerName } from "../../utils/plugins/lspPluginIntegration.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";

//@ chunk-wy9dbk5f.js:34460-35627 placement
/**
 * 转发消息结果的 schema。
 */
var LISTPROJECTMCPSERVERS = "ListProjectMcpServers";
var RELAYPROJECTMCPMESSAGE = "RelayProjectMcpMessage";
var CLOSEPROJECTMCPSERVERS = "CloseProjectMcpServers";
var SETPROJECTMCPSERVERENABLED = "SetProjectMcpServerEnabled";
var MAX_SERVERS_PER_LISTING = 100;
var MAX_TOOLS_PER_SERVER = 1000;
var MAX_RELAY_LISTING_BYTES = 8388608;
var MAX_RELAY_ANSWER_BYTES = 8388608;
var MAX_RELAY_FIELDS = 65280;
var MAX_RELAY_VALUES = 32768;
var MAX_RELAY_DEPTH = 122;
var RELAYABLE_METHODS_RE = /^(ping|tools\/call|resources\/(list|read|templates\/list)|prompts\/(list|get))$/;
var HTTP_STATUS_IN_TEXT_RE = /(?<=^|HTTP )[1-5]\d\d\b/;
var relayStateSlot = new SessionRootSlot(() => {
  let keyedQueue = createKeyedQueue();
  return {
    listed: {
      project: new Map(),
      plugins: new Map(),
      orgConnectors: new Map(),
    },
    round: {},
    list: (r, ...n) => keyedQueue.run(r === "orgConnectors" ? r : "", () => listMcpServers(r, ...n)),
    setEnabled: (...r) => keyedQueue.run("", () => closeProjectMcpServers(...r)),
    closed: false,
  };
});
var listProjectMcpServersResultSchema = DoctorLazy(() =>
  u({
    servers: array(
      u({
        name: string(),
        status: _enum(["connected", "failed", "needs-auth", "pending", "disabled"]),
        error: string().optional(),
        initializeResult: record(string(), unknown()).optional(),
        toolsListResult: record(string(), unknown()).optional(),
        toolPermissions: record(string(), ToolPermissionValueSchema()).optional(),
      }),
    ).max(MAX_SERVERS_PER_LISTING),
    cut: M(),
    hooksChecked: M().optional(),
  }),
);
var relayOptionsSchema = DoctorLazy(() =>
  u({
    plugins: M().optional(),
    waitMs: E().optional(),
    only: array(string()).optional(),
  }),
);
var relayResultSchema = DoctorLazy(() =>
  u({
    server: string(),
    message: u({
      jsonrpc: literal("2.0"),
      id: union([string(), E()]),
      method: string(),
      params: record(string(), unknown()).optional(),
    }),
  }),
);
var relayMessageResultSchema = DoctorLazy(() =>
  u({
    response: u({
      jsonrpc: literal("2.0"),
      id: union([string(), E()]),
      result: record(string(), unknown()).optional(),
      error: u({
        code: E(),
        message: string(),
        data: unknown().optional(),
      }).optional(),
    }),
  }),
);
//@ chunk-wy9dbk5f.js:35627-35679 placement
function mcpClientModule() {
  return require("./chunk-asne9cp8.js");
}
//@ chunk-wy9dbk5f.js:35679-35754 placement
function toolPermissionsOf({ config }) {
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
async function describeProjectMcpServer(client) {
  let { name: r } = client;
  if (!isConnectedOrCached(client)) {
    let { error, errorCode } = Object(client);
    let [y] = HTTP_STATUS_IN_TEXT_RE.exec(`${errorCode} ${error}`) ?? [];
    let g = y ? `Server answered HTTP ${y}` : "Connection error";
    let error_2 = error && "url" in client.config ? g : error;
    return {
      server: {
        name: r,
        status: client.type,
        error: error_2,
      },
    };
  }
  let n;
  try {
    n = await mcpClientModule().mcpClientModule().ensureConnectedClient(client);
  } catch {
    return {
      server: {
        name: r,
        status: "failed",
        error: "Connection error",
      },
    };
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
        {
          method: "tools/list",
        },
        {
          timeout: getConnectionTimeoutMs(),
        },
      );
    } catch {}
  return {
    server: s,
    live: n,
  };
}
//@ chunk-wy9dbk5f.js:36477-36722 placement
async function serveListProjectMcpServers(e, r, n) {
  let { list, round } = relayStateSlot.of(n.session);
  let c = relayOptionsSchema().safeParse(e ?? {}).data ?? {};
  if (c.only) {
    let g = sleep(c.waitMs ?? 0, r, {
      unref: true,
    });
    await Promise.race([round.project?.ended, g]);
    c.waitMs = 0;
  }
  let y = c.plugins ? listRelayablePluginServers : listProjectScopedServers;
  return list("project", y, r, n, false, c);
}
//@ chunk-wy9dbk5f.js:36722-36800 placement
function listProjectMcpServers(e, r, n) {
  let { list } = relayStateSlot.of(n.session);
  return list("project", listRelayablePluginServers, r, n, true);
}
//@ chunk-wy9dbk5f.js:36875-37139 placement
/**
 * handleSetMcpServerEnabled：控制协议中 "启用/禁用 MCP 服务器" 请求的处理（校验 {server, enabled, requestId}）。
 */
function handleSetMcpServerEnabled(e, r, n) {
  let s = SetMcpServerEnabledInputSchema().safeParse(e);
  if (!s.success)
    throw Error(
      "Takes a server name, whether it is enabled, and optionally a request id of at most 64 characters",
    );
  let { server, enabled, requestId } = s.data;
  let { setEnabled } = relayStateSlot.of(n.session);
  return setEnabled(server, enabled, requestId, r, n);
}
//@ chunk-wy9dbk5f.js:37139-37911 placement
async function closeProjectMcpServers(e, r, n, s, a) {
  let c = relayStateSlot.of(a.session);
  if (c.closed) throw Error("The repo's MCP servers have been closed");
  let switched = c.switched;
  if (n !== undefined && switched?.requestId === n && switched.name === e && switched.enabled === r)
    return formatEnabledChoiceResult(r, switched.isSaved);
  let included = Object.keys(await listRelayablePluginServers(s, a))
    .filter((key) => !isServerDeniedOrInvalid(a, key, "") && !isOrgConnectorName(key))
    .slice(0, MAX_SERVERS_PER_LISTING)
    .includes(e);
  let S = c.listed.project.get(e);
  let project = c.round.project;
  let b = S ?? project?.rows.find((P) => P.name === e);
  if (!(included || (!r && b !== undefined))) throw Error("The listing has no server of that name");
  s.throwIfAborted();
  let { storageV5 } = a.toolUseContext();
  let w = await setMcpServerEnabledDurably(e, r, storageV5);
  c.switched = {
    requestId: n,
    name: e,
    enabled: r,
    isSaved: w,
  };
  let O = formatEnabledChoiceResult(r, w);
  if (!r && b !== undefined) {
    c.listed.project.delete(e);
    project?.settled.set(e, {
      server: {
        name: e,
        status: "disabled",
      },
    });
    await mcpClientModule().mcpClientModule().clearServerCache(e, b.config);
  }
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
//@ chunk-wy9dbk5f.js:38048-38375 placement
/**
 * 列出可中继的 MCP 服务器：项目作用域服务器，以及非内置、非受限的插件服务器。
 */
async function listRelayablePluginServers(e, r) {
  let { storageV5, credentials } = r.toolUseContext();
  let entries = Object.entries(await loadServableMcpConfigs(r));
  let allPluginsCacheOnly = await loadAllPluginsCacheOnly(storageV5, credentials);
  return Object.fromEntries(
    entries.filter(function ([, g]) {
      let { scope, pluginSource, pluginPath = "" } = g;
      if (pluginSource === undefined) return scope === "project";
      let b = {
        sourceName: pluginSource,
        pluginPath,
      };
      return (
        !isSyncedMarketplace(pluginSource) &&
        !isBuiltinPluginId(pluginSource) &&
        !isPluginHooksMismatched(b, allPluginsCacheOnly, undefined)
      );
    }),
  );
}
//@ chunk-wy9dbk5f.js:38375-38552 placement
async function loadServableMcpConfigs(e) {
  let { storageV5, credentials } = e.toolUseContext();
  await awaitPolicyColdStartWaiter();
  invalidateCommandNames();
  refreshPluginCaches(storageV5, credentials);
  return (
    getStrictMcpConfig() || isBareMode()
      ? {
          servers: {},
        }
      : await getClaudeCodeMcpConfigs(
          {},
          {
            storageV5,
            credentials,
          },
        )
  ).servers;
}
//@ chunk-wy9dbk5f.js:38552-39463 placement
/**
 * 开始列出可转发的 MCP 服务器：过滤被拒绝或不可中继的条目（最多 N 个），记录本地服务器，异步连接并收集每台服务器的描述，返回带 rows/settled/ended 的列表状态。
 */
function startServerListing(kind, entries, context) {
  let { storageV5, credentials } = context.toolUseContext();
  let filtered = entries.filter(function ([O]) {
    return !isServerDeniedOrInvalid(context, O, "") && (kind === "orgConnectors" || !isOrgConnectorName(O));
  });
  let y = {
    launchPermissionContext: undefined,
  };
  let unnamed = entries.filter(function ([O]) {
    return (
      kind === "project" &&
      !isMcpServerDisabled(O) &&
      (isServerDeniedOrInvalid(y, O, "") || isOrgConnectorName(O))
    );
  });
  let h = Object.fromEntries(filtered.slice(0, MAX_SERVERS_PER_LISTING));
  let S = startedServerKeys.of(context.session.host);
  for (let [key, value] of Object.entries(h))
    if (
      S.size < MAX_STARTED_SERVER_KEYS &&
      mcpClientModule().mcpClientModule().isLocalMcpServer(value) &&
      !isMcpServerDisabled(key)
    )
      S.add(key);
  let pending = [];
  let settled = new Map();
  let R = (name) => settled.get(name)?.server.status === "disabled";
  let listing = {
    rows: Object.entries(h).map(function ([key, value]) {
      return {
        name: key,
        type: "pending",
        config: value,
      };
    }),
    settled,
    unnamed,
    cut: filtered.length > MAX_SERVERS_PER_LISTING,
    ended: mcpClientModule()
      .mcpClientModule()
      .getMcpToolsCommandsAndResources(
        function ({ client }) {
          if (R(client.name)) return;
          pending.push(
            describeProjectMcpServer(client).then((P) => {
              if (!R(client.name)) settled.set(client.name, P);
            }),
          );
        },
        h,
        storageV5,
        credentials,
        undefined,
        undefined,
        kind !== "plugins" && context.callerLogsSharedEvents,
      )
      .then(() => Promise.all(pending))
      .finally(() => {
        listing.hasEnded = true;
      }),
    hasEnded: false,
  };
  return listing;
}
//@ chunk-wy9dbk5f.js:39463-39643 placement
async function clearRemovedServerCaches(e, r) {
  let n = new Set();
  for (let { name: s, config } of e) n.add(serverCacheKey(s, config));
  for (let { name: s, config } of r)
    if (!n.has(serverCacheKey(s, config)))
      await mcpClientModule().mcpClientModule().clearServerCache(s, config);
}
//@ chunk-wy9dbk5f.js:39643-41383 placement
async function listMcpServers(kind, r, n, context, a = false, { waitMs: c, only: y } = {}) {
  let g = relayStateSlot.of(context.session);
  let h = g.round[kind];
  let S =
    y ||
    (c !== undefined &&
      h?.hasEnded === false &&
      !Array.from(h.settled.values()).some(
        ({ server: { name: K, status } }) => status === "disabled" && !isMcpServerDisabled(K),
      ));
  if (!S) await h?.ended.catch(() => {});
  if (!a) n.throwIfAborted();
  let C = h;
  if (!C || !S) {
    await clearRemovedServerCaches(g.listed[kind].values(), h?.rows ?? []);
    C = g.round[kind] = a
      ? {
          rows: [],
          settled: new Map(),
          unnamed: [],
          cut: false,
          ended: Promise.resolve(),
          hasEnded: true,
        }
      : startServerListing(kind, Object.entries(await r(n, context)), context);
  }
  let b =
    c !== undefined &&
    sleep(c, n, {
      unref: true,
    });
  await (b ? Promise.race([C.ended, b]) : C.ended);
  if (!C.hasEnded) n.throwIfAborted();
  let { settled, rows } = C;
  let { cut } = C;
  let O = [...settled.values()];
  let P = C.hasEnded ? [] : rows.filter((K) => !settled.has(K.name));
  let L = [];
  let j = new Map();
  let B = 0;
  let H = 0;
  for (let { name: K, type: v } of P)
    O.push({
      server: {
        name: K,
        status: v,
      },
      live: undefined,
    });
  for (let [K] of C.unnamed)
    O.push({
      server: {
        name: K,
        status: "failed",
      },
      live: undefined,
    });
  for (let { server, live } of O) {
    let X = server.toolsListResult && {
      ...server.toolsListResult,
    };
    let V = X
      ? {
          ...server,
          toolsListResult: X,
        }
      : server;
    if (Array.isArray(X?.tools)) {
      cut ||= X.tools.length > MAX_TOOLS_PER_SERVER;
      let sliced = X.tools.slice(0, MAX_TOOLS_PER_SERVER);
      X.tools = sliced.filter(function (on) {
        let { name: Qe } = Object(on);
        return !isServerDeniedOrInvalid(context, V.name, Qe) && V.toolPermissions?.[Qe] !== "blocked";
      });
      if (live?.config.alwaysLoad === false)
        for (let Ze of sliced) delete Object(Ze)._meta?.["anthropic/alwaysLoad"];
    }
    let { bytes, values, depth } = measureJson(V);
    let en = H + values <= MAX_RELAY_FIELDS && depth <= MAX_RELAY_DEPTH;
    if (L.length === MAX_SERVERS_PER_LISTING || !en || B + bytes > MAX_RELAY_LISTING_BYTES) {
      cut = true;
      continue;
    }
    B += bytes;
    H += values;
    L.push(V);
    if (live) j.set(live.name, live);
  }
  let Y = g.listed[kind];
  g.listed[kind] = n.aborted && !a ? Y : j;
  if (kind === "project" && g.listed.project === j && !y) g.closed = a;
  let Q = [...g.listed[kind].values(), ...P];
  await clearRemovedServerCaches(Q, [...Y.values(), ...rows]);
  n.throwIfAborted();
  return {
    summary: `${j.size} of ${L.length} servers connected${cut ? ", cut at a limit" : ""}`,
    output: {
      servers: y ? L.filter((K) => y.includes(K.name)) : L,
      cut,
    },
  };
}
//@ chunk-wy9dbk5f.js:41383-41429 placement
function relayProjectMcpMessage(e, r, n) {
  return relayMcpMessage("project", e, r, n);
}
//@ chunk-wy9dbk5f.js:41429-41939 placement
/**
 * 把调用方的一条 JSON-RPC 请求转发给本机已连接的 MCP 服务器（项目/组织连接器/插件），检查启动权限、限制答复大小。
 */
async function relayMcpMessage(e, r, n, s) {
  let a = relayResultSchema().safeParse(r);
  if (!a.success) throw Error("Takes a server name and one JSON-RPC request with an id");
  let { server, message } = a.data;
  let g = relayStateSlot.of(s.session);
  let h = g.listed[e].get(server);
  if (h === undefined && e === "project" && g.closed) throw Error("The repo's MCP servers have been closed");
  if (h === undefined) throw Error("The latest listing has no connected server of that name");
  let S = await relayJsonRpc(message, h, n, s);
  return {
    summary: `${message.method}${S.error ? " failed" : ""}`,
    output: {
      response: {
        jsonrpc: "2.0",
        id: message.id,
        ...S,
      },
    },
  };
}
//@ chunk-wy9dbk5f.js:41939-43227 placement
async function relayJsonRpc({ method, params }, n, s, a) {
  if (method === "initialize") {
    let protocolVersion = params?.protocolVersion;
    return capRelayAnswer(method, {
      result: {
        ...initializeResultOf(n),
        protocolVersion,
      },
    });
  }
  if (!RELAYABLE_METHODS_RE.test(method))
    return {
      error: {
        code: -32601,
        message: `${method} is not relayed`,
      },
    };
  let c = method === "tools/call";
  let g =
    toolPermissionsOf(n)[String(params?.name)] === "blocked" ||
    isServerDeniedOrInvalid(a, n.name, params?.name);
  if (c && g)
    return {
      error: {
        code: -32602,
        message: "tools/call must name a tool that no launch deny rule names and its entry does not block",
      },
    };
  let h = mcpClientModule().mcpClientModule();
  let _meta = params?._meta;
  let C;
  try {
    let b = await h.ensureConnectedClient(n, {
      signal: s,
    });
    let mcpToolTimeoutMs = h.getMcpToolTimeoutMs(b.config);
    C = {
      result: await sendMcpRequest(
        b,
        {
          method,
          params: isPlainObject_2(_meta)
            ? {
                ...params,
                _meta: {
                  ..._meta,
                  progressToken: undefined,
                },
              }
            : params,
        },
        c
          ? {
              signal: s,
              timeout: h.getMcpToolIdleTimeoutMs(b.config) || mcpToolTimeoutMs,
              maxTotalTimeout: mcpToolTimeoutMs,
              resetTimeoutOnProgress: true,
              onprogress: function () {},
            }
          : {
              signal: s,
              timeout: getConnectionTimeoutMs(),
            },
      ),
    };
  } catch (error) {
    s.throwIfAborted();
    if (mcpClientModule().mcpIsListAuthErrorModule().isListAuthError(error))
      await h.clearServerCache(n.name, n.config);
    let { code, data: x } = Object(error);
    let { getMcpErrorCode } = mcpClientModule().mcpSdkErrorClassificationModule();
    let O = code === "REQUEST_TIMEOUT" ? -32001 : getMcpErrorCode(error);
    let { status = code } = Object(x);
    let replaced = errorMessage(error).replace(/^MCP error -?\d+: /, "");
    let [j] = HTTP_STATUS_IN_TEXT_RE.exec(`${status} ${replaced}`) ?? [];
    let message = j ? `Server answered HTTP ${j}` : "Connection error";
    C =
      O === undefined
        ? {
            error: {
              code: -32603,
              message,
            },
          }
        : {
            error: {
              code: O,
              message: replaced,
              data: x,
            },
          };
  }
  return capRelayAnswer(method, C);
}
//@ chunk-wy9dbk5f.js:43227-43439 placement
function capRelayAnswer(method, r) {
  let { bytes, values, depth } = measureJson(r);
  if (bytes > MAX_RELAY_ANSWER_BYTES || values > MAX_RELAY_VALUES || depth > MAX_RELAY_DEPTH)
    return {
      error: {
        code: -32603,
        message: `The answer to ${method} is over ${MAX_RELAY_ANSWER_BYTES} bytes, ${MAX_RELAY_VALUES} fields and list elements or ${MAX_RELAY_DEPTH} levels deep`,
      },
    };
  return r;
}
//@ chunk-wy9dbk5f.js:43439-43715 placement
function measureJson(e) {
  let r = 0;
  let n = 0;
  let weakMap = new WeakMap();
  try {
    let a = jsonStringify(e, function (y, g) {
      r++;
      if (typeof g === "object" && g !== null) {
        let h = (weakMap.get(Object(this)) ?? 0) + 1;
        weakMap.set(g, h);
        n = Math.max(n, h);
      }
      return g;
    });
    return {
      bytes: Buffer.byteLength(a),
      values: r,
      depth: n,
    };
  } catch {
    return {
      bytes: 1 / 0,
      values: 1 / 0,
      depth: 1 / 0,
    };
  }
}
//@ chunk-wy9dbk5f.js:43715-43952 placement
function isServerDeniedOrInvalid({ launchPermissionContext }, r, n) {
  let serverName = mcpInfoFromString(getMcpPrefix(r))?.serverName;
  if (typeof n !== "string" || serverName !== normalizeNameForMCP(r)) return true;
  if (launchPermissionContext === undefined) return false;
  let a = {
    name: n,
    mcpInfo: {
      serverName: r,
      toolName: n,
    },
  };
  return getDenyRules(launchPermissionContext).some(function (y) {
    return toolMatchesRule(launchPermissionContext, a, y);
  });
}
//@ chunk-wy9dbk5f.js:43952-44086 placement
function formatEnabledChoiceResult(e, r) {
  if (!r) throw Error("The choice could not be saved");
  return {
    summary: e ? "Saved as on" : "Switched off",
    output: {
      enabled: e,
    },
  };
}
//@ chunk-wy9dbk5f.js:44086-44357 placement
/**
 * 组织连接器服务器表的 schema。
 */
var LISTORGCONNECTORMCPSERVERS = "ListOrgConnectorMcpServers";
var RELAYORGCONNECTORMCPMESSAGE = "RelayOrgConnectorMcpMessage";
var orgConnectorServersSchema = DoctorLazy(() =>
  record(
    string()
      .startsWith(ORG_CONNECTOR)
      .regex(/^(?!.*[._]{2})[A-Za-z0-9._-]+[A-Za-z0-9]$/)
      .max(MAX_SERVER_NAME_CHARS),
    zodStrictObject({
      type: _enum(["http", "sse"]),
      url: A8e({
        protocol: /^https$/,
      }).max(4096),
    }),
  ).refine((e) => Object.keys(e).length <= MAX_SERVERS_PER_LISTING),
);
//@ chunk-wy9dbk5f.js:44357-44967 placement
function serveListOrgConnectorServers(e, r, n) {
  let s = orgConnectorServersSchema().safeParse(Object(e).servers);
  if (!s.success)
    throw Error(
      "Takes `servers`: http or sse entries with an https URL, each under a name that starts with org-connector-, has only letters, digits, . _ and -, has no two of . and _ in a row, ends in a letter or a digit, and has at most 128 characters",
    );
  let { list } = relayStateSlot.of(n.session);
  return list(
    "orgConnectors",
    async function () {
      await awaitPolicyColdStartWaiter();
      invalidateCommandNames();
      let { config } = parseMcpConfig({
        configObject: {
          mcpServers: s.data,
        },
        expandVars: false,
        scope: "dynamic",
      });
      let { allowed } = filterMcpServersByPolicy(config?.mcpServers ?? {});
      let h = {};
      for (let [key, value] of Object.entries(allowed))
        h[key] = {
          ...value,
          scope: "dynamic",
        };
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
/**
 * 列出插件服务器的输入 schema。
 */
var LISTPLUGINMCPSERVERS = "ListPluginMcpServers";
var RELAYPLUGINMCPMESSAGE = "RelayPluginMcpMessage";
var listPluginServersInputSchema = DoctorLazy(() =>
  u({
    waitMs: E().int().positive().optional().catch(undefined),
    resync: M().optional().catch(undefined),
    registeredHooks: record(string(), registeredHooksListSchema()).optional().catch(undefined),
  }),
);
//@ chunk-wy9dbk5f.js:45235-45319 placement = getServerCommandArray (1)
function getServerCommandArray({ type: e, command }) {
  return e === "stdio" || (e === undefined && typeof command === "string");
}
//@ chunk-wy9dbk5f.js:45319-45406 placement
/**
 * 生成插件服务器的键（plugin:<文件夹>:<服务器>）。
 */
function pluginServerKey(folder, serverName) {
  let index = folder.lastIndexOf("@");
  return `plugin:${index === -1 ? folder : folder.slice(0, index)}:${serverName}`;
}
//@ chunk-wy9dbk5f.js:45406-45452 placement
function relayPluginMcpMessage(e, r, n) {
  return relayMcpMessage("plugins", e, r, n);
}
//@ chunk-wy9dbk5f.js:45452-45621 placement
async function serveListPluginMcpServers(e, r, n) {
  let s = listPluginServersInputSchema().safeParse(e ?? {}).data;
  let { list } = relayStateSlot.of(n.session);
  let c = await list("plugins", createSyncedPluginServerLoader(s ?? {}), r, n);
  return {
    ...c,
    output: {
      ...c.output,
      hooksChecked: true,
    },
  };
}
//@ chunk-wy9dbk5f.js:45621-46366 placement
/**
 * 生成读取已同步插件 MCP 服务器的函数：等待插件同步（有时限）、加载配置，只保留来自同步市场、清单命名一致且钩子未改变的服务器。
 */
function createSyncedPluginServerLoader({ waitMs = 1 / 0, resync = false, registeredHooks }) {
  return async function (signal, context) {
    let { storageV5, credentials } = context.toolUseContext();
    let deadline = sleep(Math.min(pluginInstallTimeoutMs(), waitMs), signal, {
      unref: true,
    });
    await awaitPluginSync(context.session, credentials, {
      resync,
      deadline,
    });
    signal.throwIfAborted();
    refreshPluginCaches(storageV5, credentials);
    let configs = await loadServableMcpConfigs(context);
    let plugins = await loadAllPluginsCacheOnly(storageV5, credentials);
    let b = new Map(
      plugins.enabled.map((O) => [
        O.source,
        {
          folder: syncedPluginFolderId(O.path),
          pluginPath: O.path,
        },
      ]),
    );
    let result = {};
    let x = 0;
    let w = 0;
    for (let [key, value] of Object.entries(configs)) {
      let { pluginSource } = value;
      let j = pluginSource && b.get(pluginSource);
      if (!j || marketplaceSuffix(pluginSource) !== SYNCED || !getServerCommandArray(value)) continue;
      let serverName = parsePluginServerName(key)?.serverName;
      let H = serverName && pluginServerKey(j.folder, serverName);
      if (H !== key) {
        x++;
        continue;
      }
      let Y = {
        sourceName: pluginSource,
        pluginPath: j.pluginPath,
      };
      if (isPluginHooksMismatched(Y, plugins, registeredHooks?.[j.folder])) {
        w++;
        continue;
      }
      result[H] = value;
    }
    if (x > 0) logFeatureSad("ccs_plugin_mcp", "named_otherwise_by_manifest");
    if (w > 0) logFeatureSad("ccs_plugin_mcp", "hooks_differ");
    return result;
  };
}
export {
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
  handleSetMcpServerEnabled,
};
