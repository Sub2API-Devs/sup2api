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
  objectSchema,
  array,
  stringSchema,
  _enum,
  record,
  unknown,
  booleanSchema,
  numberSchema,
  literal,
  union,
  zodStrictObject,
  urlSchema,
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
    list: (kind, ...args) =>
      keyedQueue.run(kind === "orgConnectors" ? kind : "", () => listMcpServers(kind, ...args)),
    setEnabled: (...args) => keyedQueue.run("", () => closeProjectMcpServers(...args)),
    closed: false,
  };
});
var listProjectMcpServersResultSchema = DoctorLazy(() =>
  objectSchema({
    servers: array(
      objectSchema({
        name: stringSchema(),
        status: _enum(["connected", "failed", "needs-auth", "pending", "disabled"]),
        error: stringSchema().optional(),
        initializeResult: record(stringSchema(), unknown()).optional(),
        toolsListResult: record(stringSchema(), unknown()).optional(),
        toolPermissions: record(stringSchema(), ToolPermissionValueSchema()).optional(),
      }),
    ).max(MAX_SERVERS_PER_LISTING),
    cut: booleanSchema(),
    hooksChecked: booleanSchema().optional(),
  }),
);
var relayOptionsSchema = DoctorLazy(() =>
  objectSchema({
    plugins: booleanSchema().optional(),
    waitMs: numberSchema().optional(),
    only: array(stringSchema()).optional(),
  }),
);
var relayResultSchema = DoctorLazy(() =>
  objectSchema({
    server: stringSchema(),
    message: objectSchema({
      jsonrpc: literal("2.0"),
      id: union([stringSchema(), numberSchema()]),
      method: stringSchema(),
      params: record(stringSchema(), unknown()).optional(),
    }),
  }),
);
var relayMessageResultSchema = DoctorLazy(() =>
  objectSchema({
    response: objectSchema({
      jsonrpc: literal("2.0"),
      id: union([stringSchema(), numberSchema()]),
      result: record(stringSchema(), unknown()).optional(),
      error: objectSchema({
        code: numberSchema(),
        message: stringSchema(),
        data: unknown().optional(),
      }).optional(),
    }),
  }),
);
//@ chunk-wy9dbk5f.js:35627-35679 placement
function mcpClientModule() {
  return require("../mcp/emitTripwireEvent.lazy.js");
}
//@ chunk-wy9dbk5f.js:35679-35754 placement
function toolPermissionsOf({ config }) {
  return ("toolPermissions" in config && config.toolPermissions) || {};
}
//@ chunk-wy9dbk5f.js:35754-35901 placement
function initializeResultOf(client) {
  return {
    protocolVersion: client.negotiatedProtocolVersion,
    capabilities: client.capabilities,
    serverInfo: client.serverInfo,
    instructions: client.instructions,
  };
}
//@ chunk-wy9dbk5f.js:35901-36477 placement
async function describeProjectMcpServer(client) {
  let { name } = client;
  if (!isConnectedOrCached(client)) {
    let { error, errorCode } = Object(client);
    let [statusMatch] = HTTP_STATUS_IN_TEXT_RE.exec(`${errorCode} ${error}`) ?? [];
    let statusText = statusMatch ? `Server answered HTTP ${statusMatch}` : "Connection error";
    let error_2 = error && "url" in client.config ? statusText : error;
    return {
      server: {
        name,
        status: client.type,
        error: error_2,
      },
    };
  }
  let connected;
  try {
    connected = await mcpClientModule().mcpClientModule().ensureConnectedClient(client);
  } catch {
    return {
      server: {
        name,
        status: "failed",
        error: "Connection error",
      },
    };
  }
  let description = {
    name,
    status: "connected",
    initializeResult: initializeResultOf(connected),
    toolPermissions: toolPermissionsOf(connected),
  };
  if (connected.capabilities.tools)
    try {
      description.toolsListResult = await sendMcpRequest(
        connected,
        {
          method: "tools/list",
        },
        {
          timeout: getConnectionTimeoutMs(),
        },
      );
    } catch {}
  return {
    server: description,
    live: connected,
  };
}
//@ chunk-wy9dbk5f.js:36477-36722 placement
async function serveListProjectMcpServers(input, signal, context) {
  let { list, round } = relayStateSlot.of(context.session);
  let options = relayOptionsSchema().safeParse(input ?? {}).data ?? {};
  if (options.only) {
    let wait = sleep(options.waitMs ?? 0, signal, {
      unref: true,
    });
    await Promise.race([round.project?.ended, wait]);
    options.waitMs = 0;
  }
  let listServers = options.plugins ? listRelayablePluginServers : listProjectScopedServers;
  return list("project", listServers, signal, context, false, options);
}
//@ chunk-wy9dbk5f.js:36722-36800 placement
function listProjectMcpServers(input, signal, context) {
  let { list } = relayStateSlot.of(context.session);
  return list("project", listRelayablePluginServers, signal, context, true);
}
//@ chunk-wy9dbk5f.js:36875-37139 placement
/**
 * handleSetMcpServerEnabled：控制协议中 "启用/禁用 MCP 服务器" 请求的处理（校验 {server, enabled, requestId}）。
 */
function handleSetMcpServerEnabled(input, signal, context) {
  let parsed = SetMcpServerEnabledInputSchema().safeParse(input);
  if (!parsed.success)
    throw Error(
      "Takes a server name, whether it is enabled, and optionally a request id of at most 64 characters",
    );
  let { server, enabled, requestId } = parsed.data;
  let { setEnabled } = relayStateSlot.of(context.session);
  return setEnabled(server, enabled, requestId, signal, context);
}
//@ chunk-wy9dbk5f.js:37139-37911 placement
async function closeProjectMcpServers(serverName, enabled, requestId, signal, context) {
  let state = relayStateSlot.of(context.session);
  if (state.closed) throw Error("The repo's MCP servers have been closed");
  let switched = state.switched;
  if (
    requestId !== undefined &&
    switched?.requestId === requestId &&
    switched.name === serverName &&
    switched.enabled === enabled
  )
    return formatEnabledChoiceResult(enabled, switched.isSaved);
  let included = Object.keys(await listRelayablePluginServers(signal, context))
    .filter((key) => !isServerDeniedOrInvalid(context, key, "") && !isOrgConnectorName(key))
    .slice(0, MAX_SERVERS_PER_LISTING)
    .includes(serverName);
  let listedLive = state.listed.project.get(serverName);
  let project = state.round.project;
  let row = listedLive ?? project?.rows.find((row) => row.name === serverName);
  if (!(included || (!enabled && row !== undefined))) throw Error("The listing has no server of that name");
  signal.throwIfAborted();
  let { storageV5 } = context.toolUseContext();
  let saved = await setMcpServerEnabledDurably(serverName, enabled, storageV5);
  state.switched = {
    requestId,
    name: serverName,
    enabled,
    isSaved: saved,
  };
  let result = formatEnabledChoiceResult(enabled, saved);
  if (!enabled && row !== undefined) {
    state.listed.project.delete(serverName);
    project?.settled.set(serverName, {
      server: {
        name: serverName,
        status: "disabled",
      },
    });
    await mcpClientModule().mcpClientModule().clearServerCache(serverName, row.config);
  }
  return result;
}
//@ chunk-wy9dbk5f.js:37911-38048 placement
async function listProjectScopedServers(context, callerContext) {
  let entries = Object.entries(await loadServableMcpConfigs(callerContext));
  return Object.fromEntries(
    entries.filter(function ([, config]) {
      return config.scope === "project";
    }),
  );
}
//@ chunk-wy9dbk5f.js:38048-38375 placement
/**
 * 列出可中继的 MCP 服务器：项目作用域服务器，以及非内置、非受限的插件服务器。
 */
async function listRelayablePluginServers(context, callContext) {
  let { storageV5, credentials } = callContext.toolUseContext();
  let entries = Object.entries(await loadServableMcpConfigs(callContext));
  let allPluginsCacheOnly = await loadAllPluginsCacheOnly(storageV5, credentials);
  return Object.fromEntries(
    entries.filter(function ([, config]) {
      let { scope, pluginSource, pluginPath = "" } = config;
      if (pluginSource === undefined) return scope === "project";
      let ref = {
        sourceName: pluginSource,
        pluginPath,
      };
      return (
        !isSyncedMarketplace(pluginSource) &&
        !isBuiltinPluginId(pluginSource) &&
        !isPluginHooksMismatched(ref, allPluginsCacheOnly, undefined)
      );
    }),
  );
}
//@ chunk-wy9dbk5f.js:38375-38552 placement
async function loadServableMcpConfigs(context) {
  let { storageV5, credentials } = context.toolUseContext();
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
  let filtered = entries.filter(function ([name]) {
    return (
      !isServerDeniedOrInvalid(context, name, "") && (kind === "orgConnectors" || !isOrgConnectorName(name))
    );
  });
  let listingContext = {
    launchPermissionContext: undefined,
  };
  let unnamed = entries.filter(function ([name]) {
    return (
      kind === "project" &&
      !isMcpServerDisabled(name) &&
      (isServerDeniedOrInvalid(listingContext, name, "") || isOrgConnectorName(name))
    );
  });
  let servedConfigs = Object.fromEntries(filtered.slice(0, MAX_SERVERS_PER_LISTING));
  let startedKeys = startedServerKeys.of(context.session.host);
  for (let [key, value] of Object.entries(servedConfigs))
    if (
      startedKeys.size < MAX_STARTED_SERVER_KEYS &&
      mcpClientModule().mcpClientModule().isLocalMcpServer(value) &&
      !isMcpServerDisabled(key)
    )
      startedKeys.add(key);
  let pending = [];
  let settled = new Map();
  let isSettledDisabled = (name) => settled.get(name)?.server.status === "disabled";
  let listing = {
    rows: Object.entries(servedConfigs).map(function ([key, value]) {
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
          if (isSettledDisabled(client.name)) return;
          pending.push(
            describeProjectMcpServer(client).then((serverDescription) => {
              if (!isSettledDisabled(client.name)) settled.set(client.name, serverDescription);
            }),
          );
        },
        servedConfigs,
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
async function clearRemovedServerCaches(nextRows, previousRows) {
  let keptKeys = new Set();
  for (let { name, config } of nextRows) keptKeys.add(serverCacheKey(name, config));
  for (let { name, config } of previousRows)
    if (!keptKeys.has(serverCacheKey(name, config)))
      await mcpClientModule().mcpClientModule().clearServerCache(name, config);
}
//@ chunk-wy9dbk5f.js:39643-41383 placement
async function listMcpServers(kind, loadConfigs, signal, context, forceClose = false, { waitMs, only } = {}) {
  let state = relayStateSlot.of(context.session);
  let currentRound = state.round[kind];
  let reuseRound =
    only ||
    (waitMs !== undefined &&
      currentRound?.hasEnded === false &&
      !Array.from(currentRound.settled.values()).some(
        ({ server: { name, status } }) => status === "disabled" && !isMcpServerDisabled(name),
      ));
  if (!reuseRound) await currentRound?.ended.catch(() => {});
  if (!forceClose) signal.throwIfAborted();
  let round = currentRound;
  if (!round || !reuseRound) {
    await clearRemovedServerCaches(state.listed[kind].values(), currentRound?.rows ?? []);
    round = state.round[kind] = forceClose
      ? {
          rows: [],
          settled: new Map(),
          unnamed: [],
          cut: false,
          ended: Promise.resolve(),
          hasEnded: true,
        }
      : startServerListing(kind, Object.entries(await loadConfigs(signal, context)), context);
  }
  let wait =
    waitMs !== undefined &&
    sleep(waitMs, signal, {
      unref: true,
    });
  await (wait ? Promise.race([round.ended, wait]) : round.ended);
  if (!round.hasEnded) signal.throwIfAborted();
  let { settled, rows } = round;
  let { cut } = round;
  let entries = [...settled.values()];
  let pendingRows = round.hasEnded ? [] : rows.filter((row) => !settled.has(row.name));
  let servers = [];
  let liveByName = new Map();
  let totalBytes = 0;
  let totalFields = 0;
  for (let { name, type: status } of pendingRows)
    entries.push({
      server: {
        name,
        status,
      },
      live: undefined,
    });
  for (let [name] of round.unnamed)
    entries.push({
      server: {
        name,
        status: "failed",
      },
      live: undefined,
    });
  for (let { server, live } of entries) {
    let toolsListResult = server.toolsListResult && {
      ...server.toolsListResult,
    };
    let serverCopy = toolsListResult
      ? {
          ...server,
          toolsListResult,
        }
      : server;
    if (Array.isArray(toolsListResult?.tools)) {
      cut ||= toolsListResult.tools.length > MAX_TOOLS_PER_SERVER;
      let sliced = toolsListResult.tools.slice(0, MAX_TOOLS_PER_SERVER);
      toolsListResult.tools = sliced.filter(function (tool) {
        let { name: toolName } = Object(tool);
        return (
          !isServerDeniedOrInvalid(context, serverCopy.name, toolName) &&
          serverCopy.toolPermissions?.[toolName] !== "blocked"
        );
      });
      if (live?.config.alwaysLoad === false)
        for (let tool of sliced) delete Object(tool)._meta?.["anthropic/alwaysLoad"];
    }
    let { bytes, values, depth } = measureJson(serverCopy);
    let withinLimits = totalFields + values <= MAX_RELAY_FIELDS && depth <= MAX_RELAY_DEPTH;
    if (
      servers.length === MAX_SERVERS_PER_LISTING ||
      !withinLimits ||
      totalBytes + bytes > MAX_RELAY_LISTING_BYTES
    ) {
      cut = true;
      continue;
    }
    totalBytes += bytes;
    totalFields += values;
    servers.push(serverCopy);
    if (live) liveByName.set(live.name, live);
  }
  let previousLive = state.listed[kind];
  state.listed[kind] = signal.aborted && !forceClose ? previousLive : liveByName;
  if (kind === "project" && state.listed.project === liveByName && !only) state.closed = forceClose;
  let allLive = [...state.listed[kind].values(), ...pendingRows];
  await clearRemovedServerCaches(allLive, [...previousLive.values(), ...rows]);
  signal.throwIfAborted();
  return {
    summary: `${liveByName.size} of ${servers.length} servers connected${cut ? ", cut at a limit" : ""}`,
    output: {
      servers: only ? servers.filter((server) => only.includes(server.name)) : servers,
      cut,
    },
  };
}
//@ chunk-wy9dbk5f.js:41383-41429 placement
function relayProjectMcpMessage(input, rawInput, context) {
  return relayMcpMessage("project", input, rawInput, context);
}
//@ chunk-wy9dbk5f.js:41429-41939 placement
/**
 * 把调用方的一条 JSON-RPC 请求转发给本机已连接的 MCP 服务器（项目/组织连接器/插件），检查启动权限、限制答复大小。
 */
async function relayMcpMessage(kind, input, signal, context) {
  let parsed = relayResultSchema().safeParse(input);
  if (!parsed.success) throw Error("Takes a server name and one JSON-RPC request with an id");
  let { server, message } = parsed.data;
  let state = relayStateSlot.of(context.session);
  let live = state.listed[kind].get(server);
  if (live === undefined && kind === "project" && state.closed)
    throw Error("The repo's MCP servers have been closed");
  if (live === undefined) throw Error("The latest listing has no connected server of that name");
  let response = await relayJsonRpc(message, live, signal, context);
  return {
    summary: `${message.method}${response.error ? " failed" : ""}`,
    output: {
      response: {
        jsonrpc: "2.0",
        id: message.id,
        ...response,
      },
    },
  };
}
//@ chunk-wy9dbk5f.js:41939-43227 placement
async function relayJsonRpc({ method, params }, live, signal, context) {
  if (method === "initialize") {
    let protocolVersion = params?.protocolVersion;
    return capRelayAnswer(method, {
      result: {
        ...initializeResultOf(live),
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
  let isToolCall = method === "tools/call";
  let toolBlocked =
    toolPermissionsOf(live)[String(params?.name)] === "blocked" ||
    isServerDeniedOrInvalid(context, live.name, params?.name);
  if (isToolCall && toolBlocked)
    return {
      error: {
        code: -32602,
        message: "tools/call must name a tool that no launch deny rule names and its entry does not block",
      },
    };
  let mcpClient = mcpClientModule().mcpClientModule();
  let _meta = params?._meta;
  let answer;
  try {
    let client = await mcpClient.ensureConnectedClient(live, {
      signal,
    });
    let mcpToolTimeoutMs = mcpClient.getMcpToolTimeoutMs(client.config);
    answer = {
      result: await sendMcpRequest(
        client,
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
        isToolCall
          ? {
              signal,
              timeout: mcpClient.getMcpToolIdleTimeoutMs(client.config) || mcpToolTimeoutMs,
              maxTotalTimeout: mcpToolTimeoutMs,
              resetTimeoutOnProgress: true,
              onprogress: function () {},
            }
          : {
              signal,
              timeout: getConnectionTimeoutMs(),
            },
      ),
    };
  } catch (error) {
    signal.throwIfAborted();
    if (mcpClientModule().mcpIsListAuthErrorModule().isListAuthError(error))
      await mcpClient.clearServerCache(live.name, live.config);
    let { code, data } = Object(error);
    let { getMcpErrorCode } = mcpClientModule().mcpSdkErrorClassificationModule();
    let errorCode = code === "REQUEST_TIMEOUT" ? -32001 : getMcpErrorCode(error);
    let { status = code } = Object(data);
    let replaced = errorMessage(error).replace(/^MCP error -?\d+: /, "");
    let [statusMatch] = HTTP_STATUS_IN_TEXT_RE.exec(`${status} ${replaced}`) ?? [];
    let message = statusMatch ? `Server answered HTTP ${statusMatch}` : "Connection error";
    answer =
      errorCode === undefined
        ? {
            error: {
              code: -32603,
              message,
            },
          }
        : {
            error: {
              code: errorCode,
              message: replaced,
              data,
            },
          };
  }
  return capRelayAnswer(method, answer);
}
//@ chunk-wy9dbk5f.js:43227-43439 placement
function capRelayAnswer(method, answer) {
  let { bytes, values, depth } = measureJson(answer);
  if (bytes > MAX_RELAY_ANSWER_BYTES || values > MAX_RELAY_VALUES || depth > MAX_RELAY_DEPTH)
    return {
      error: {
        code: -32603,
        message: `The answer to ${method} is over ${MAX_RELAY_ANSWER_BYTES} bytes, ${MAX_RELAY_VALUES} fields and list elements or ${MAX_RELAY_DEPTH} levels deep`,
      },
    };
  return answer;
}
//@ chunk-wy9dbk5f.js:43439-43715 placement
function measureJson(value) {
  let valueCount = 0;
  let maxDepth = 0;
  let weakMap = new WeakMap();
  try {
    let json = jsonStringify(value, function (key, item) {
      valueCount++;
      if (typeof item === "object" && item !== null) {
        let depth = (weakMap.get(Object(this)) ?? 0) + 1;
        weakMap.set(item, depth);
        maxDepth = Math.max(maxDepth, depth);
      }
      return item;
    });
    return {
      bytes: Buffer.byteLength(json),
      values: valueCount,
      depth: maxDepth,
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
function isServerDeniedOrInvalid({ launchPermissionContext }, serverKey, toolName) {
  let serverName = mcpInfoFromString(getMcpPrefix(serverKey))?.serverName;
  if (typeof toolName !== "string" || serverName !== normalizeNameForMCP(serverKey)) return true;
  if (launchPermissionContext === undefined) return false;
  let ruleInput = {
    name: toolName,
    mcpInfo: {
      serverName: serverKey,
      toolName,
    },
  };
  return getDenyRules(launchPermissionContext).some(function (rule) {
    return toolMatchesRule(launchPermissionContext, ruleInput, rule);
  });
}
//@ chunk-wy9dbk5f.js:43952-44086 placement
function formatEnabledChoiceResult(enabled, saved) {
  if (!saved) throw Error("The choice could not be saved");
  return {
    summary: enabled ? "Saved as on" : "Switched off",
    output: {
      enabled,
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
    stringSchema()
      .startsWith(ORG_CONNECTOR)
      .regex(/^(?!.*[._]{2})[A-Za-z0-9._-]+[A-Za-z0-9]$/)
      .max(MAX_SERVER_NAME_CHARS),
    zodStrictObject({
      type: _enum(["http", "sse"]),
      url: urlSchema({
        protocol: /^https$/,
      }).max(4096),
    }),
  ).refine((servers) => Object.keys(servers).length <= MAX_SERVERS_PER_LISTING),
);
//@ chunk-wy9dbk5f.js:44357-44967 placement
function serveListOrgConnectorServers(input, signal, context) {
  let parsed = orgConnectorServersSchema().safeParse(Object(input).servers);
  if (!parsed.success)
    throw Error(
      "Takes `servers`: http or sse entries with an https URL, each under a name that starts with org-connector-, has only letters, digits, . _ and -, has no two of . and _ in a row, ends in a letter or a digit, and has at most 128 characters",
    );
  let { list } = relayStateSlot.of(context.session);
  return list(
    "orgConnectors",
    async function () {
      await awaitPolicyColdStartWaiter();
      invalidateCommandNames();
      let { config } = parseMcpConfig({
        configObject: {
          mcpServers: parsed.data,
        },
        expandVars: false,
        scope: "dynamic",
      });
      let { allowed } = filterMcpServersByPolicy(config?.mcpServers ?? {});
      let servable = {};
      for (let [key, value] of Object.entries(allowed))
        servable[key] = {
          ...value,
          scope: "dynamic",
        };
      return servable;
    },
    signal,
    context,
  );
}
//@ chunk-wy9dbk5f.js:44967-45019 placement
function relayOrgConnectorMessage(input, rawInput, context) {
  return relayMcpMessage("orgConnectors", input, rawInput, context);
}
//@ chunk-wy9dbk5f.js:45019-45235 placement
/**
 * 列出插件服务器的输入 schema。
 */
var LISTPLUGINMCPSERVERS = "ListPluginMcpServers";
var RELAYPLUGINMCPMESSAGE = "RelayPluginMcpMessage";
var listPluginServersInputSchema = DoctorLazy(() =>
  objectSchema({
    waitMs: numberSchema().int().positive().optional().catch(undefined),
    resync: booleanSchema().optional().catch(undefined),
    registeredHooks: record(stringSchema(), registeredHooksListSchema()).optional().catch(undefined),
  }),
);
//@ chunk-wy9dbk5f.js:45235-45319 placement = getServerCommandArray (1)
function getServerCommandArray({ type, command }) {
  return type === "stdio" || (type === undefined && typeof command === "string");
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
function relayPluginMcpMessage(input, rawInput, context) {
  return relayMcpMessage("plugins", input, rawInput, context);
}
//@ chunk-wy9dbk5f.js:45452-45621 placement
async function serveListPluginMcpServers(input, signal, context) {
  let parsed = listPluginServersInputSchema().safeParse(input ?? {}).data;
  let { list } = relayStateSlot.of(context.session);
  let listing = await list("plugins", createSyncedPluginServerLoader(parsed ?? {}), signal, context);
  return {
    ...listing,
    output: {
      ...listing.output,
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
    let folderBySource = new Map(
      plugins.enabled.map((plugin) => [
        plugin.source,
        {
          folder: syncedPluginFolderId(plugin.path),
          pluginPath: plugin.path,
        },
      ]),
    );
    let result = {};
    let renamedCount = 0;
    let hooksDifferCount = 0;
    for (let [key, value] of Object.entries(configs)) {
      let { pluginSource } = value;
      let pluginInfo = pluginSource && folderBySource.get(pluginSource);
      if (!pluginInfo || marketplaceSuffix(pluginSource) !== SYNCED || !getServerCommandArray(value))
        continue;
      let serverName = parsePluginServerName(key)?.serverName;
      let serverKey = serverName && pluginServerKey(pluginInfo.folder, serverName);
      if (serverKey !== key) {
        renamedCount++;
        continue;
      }
      let pluginRef = {
        sourceName: pluginSource,
        pluginPath: pluginInfo.pluginPath,
      };
      if (isPluginHooksMismatched(pluginRef, plugins, registeredHooks?.[pluginInfo.folder])) {
        hooksDifferCount++;
        continue;
      }
      result[serverKey] = value;
    }
    if (renamedCount > 0) logFeatureSad("ccs_plugin_mcp", "named_otherwise_by_manifest");
    if (hooksDifferCount > 0) logFeatureSad("ccs_plugin_mcp", "hooks_differ");
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
