/**
 * cli/print/mcpControlRequests.ts
 *
 * 2.1.316 新增：SDK 控制请求中 MCP 相关的处理（mcp_status、mcp_set_servers、mcp_reconnect、mcp_toggle、权限模式覆盖、mcp_read_resource）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-nkdv7dw8.js (53)
 * attribution: placement 53
 */
import { CJt, Ji } from "../../../vendor/lodash-es/uniqBy.js";
import { identityEpoch } from "../../services/mcp/identityChange.js";
import { pendingReconnect } from "../../services/mcp/mcpReconnect.js";
import { isRemoteMcpTransport } from "../../services/mcp/discoveryIdentity.js";
import { getMcpPrefix, isToolFromMcpServer } from "../../services/mcp/mcpStringUtils.js";
import { OPERATOR_SUPPLIED_IGNORED_TEXT } from "../../services/mcp/mcpConfigProvenance.js";
import {
  BLOCKED_BY_POLICY_REASON,
  RESERVED_ADDRESS_REASON,
  ACCOUNT_CHANGED_REASON,
  isArtifacts404Failure,
} from "../../services/mcp/redactMcpErrors.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import { isPrototypeKey } from "../../schemas/hookEntryValidation.js";
import {
  reservedServerNameMessage,
  emptyServerMap,
  mcpDialBlockCause,
  isMcpServerDisabled,
  setMcpServerEnabled,
  redactManagedMcpServerConfig,
  MCP_SETTINGS_SCOPE_SET,
  clientStatusForSnapshot,
} from "../../services/mcp/config.js";
import { isFromBuiltinMarketplace } from "../../utils/plugins/pluginIdentifier.js";
import {
  WireSafeControlError,
  getErrnoCode,
  sanitizeErrorName,
  errorMessage,
  isFsInaccessible,
} from "../../utils/errors.js";
import { isClaudeInChromeMCPServer } from "../../utils/claudeInChrome/common.js";
import {
  mcpRefusalText,
  notApprovedText,
  disabledEnableBeforeText,
} from "../../services/mcp/mcpToggleMessages.js";
import { isClientWithoutTransport } from "../../services/mcp/officialPluginPromptOverrides.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { UNSUPPORTED_CONTROL_SUBTYPE_TEXT } from "../../remote/wireFrameShape.js";
import { takeRecentWithin } from "./rateLimitForwarding.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { QueuedNotificationError } from "../../services/queuedNotifications/queuedNotifications.js";
import { logForDebugging } from "../../utils/debug.js";
import { isDiscoveryCacheUsable } from "../../services/mcp/mcpAccountKey.js";
import { flushDiscoveryCache } from "../../services/mcp/discoveryCache.js";
import { reject_default } from "../../../vendor/lodash-es/reject.js";
import { commandBelongsToServer, filterToolsByServer } from "../../services/mcp/utils.js";
import { omitKeys } from "../../utils/hooks/hookCommandResolution.js";
import { minimalStatuses, isBridgeOrTransport, mayTransportPersist } from "../transportState.js";
import { getVersionReport } from "../earlyArgs.js";
import { stripInitializeAgentPaths } from "../../bridge/controlRequests.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { collectContextData } from "../../commands/context/context-noninteractive.js";
import { toSdkModelInfos, mcpAuthErrorCode } from "../../entrypoints/sdk/coreSchemas.js";
import { buildModelPickerOptions } from "../../utils/model/modelOptions.js";
import { stripAnsi } from "../../utils/stripAnsi.js";
import { formatTotalCost } from "../../cost-tracker.js";
import { clearOutputStyleCaches } from "../../outputStyles/loadOutputStylesDir.js";
import { clearOutputStylesCache, getAllOutputStylesCached } from "../../constants/outputStyles.js";
import { getCwdOrNull } from "../../utils/cwd.js";
import { projectModelScopedUsage } from "../../services/api/usage.js";
import { effortBelowMaxSaved } from "../../services/usageInsights/recommendations.js";
import { resolveEffortLevel } from "../../utils/effort.js";
import { isCcrInjectedMcpUrl, ccrPathPrefixIndex } from "../../services/mcp/ccrMcpUrls.js";
import { isClaudeAiProxyServer } from "../../components/mcp/MCPListPanel.js";
import { mcpServerSource } from "../../services/mcp/fileReference/fileReferencePolicy.js";
import { describeMcpServerOrigin } from "../../services/mcp/mcpServerOrigin.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { hasExperimentalCapability } from "../../services/mcp/channelPermissions.js";
import { isChannelsEnabled, isChannelAllowlisted } from "../../services/mcp/channelAllowlist.js";
import {
  parsePermissionMode,
  UNRECOGNIZED_PERMISSION_MODE_ERROR,
  MCP_ASK_FOR_TOOLS_MAX,
  MCP_ASK_FOR_TOOLS_NAME,
} from "../../types/permissions.js";
import { parseMcpModeOverride } from "../../utils/permissions/browserToolNames.js";
import {
  isAutoModeGateEnabled,
  getAutoModeUnavailableReason,
  getAutoModeUnavailableNotification,
} from "../../utils/permissions/permissionSetup.js";
import { getOwn } from "../../utils/objectSafety.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { judgeGate } from "../../services/analytics/growthbookGates.js";
import { hostedDesktopRefusal_2, readMcpResource } from "../../services/mcp/mcpWireUtils.js";
import { fromEnum, lit, fromNumber } from "../../services/analytics/safeMetadata.js";
import { getConnectionTimeoutMs } from "../../services/mcp/client.js";
import { classifyMcpErrorSourceCategory } from "../../services/mcp/mcpResultErrors.js";
import { stripAnthropicMeta } from "../../services/mcp/anthropicMeta.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logPrefetchOutcome, prefetchInboundAttachments } from "../../bridge/inboundAttachments.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { getSessionId } from "../../bootstrap/state.js";
import {
  getMaterializedSessionFile,
  saveAiGeneratedTitle,
  getCurrentSessionDisplayTitle,
  cacheAiTitle,
} from "../../utils/sessionStorage.js";
import {
  requestSessionTitle,
  nextTitleFallback,
  syncTitleToRemoteSession,
} from "../../utils/sessionTitle.js";
import { sanitizeSessionTitle } from "../../utils/stringUtils.js";
import { logTitleChangeError } from "./sessionControlRequests.js";
import { getSdkHostedBridgeHandle } from "../../bridge/replBridgeHandle.js";

//@ chunk-nkdv7dw8.js:3284-3371 placement
function mergeClientConfigsIfAny(e, n) {
  n = typeof n == "function" ? n : undefined;
  return e && e.length ? CJt(e, undefined, n) : [];
}
//@ chunk-nkdv7dw8.js:3371-3381 placement
var mergeMcpClientConfigs = mergeClientConfigsIfAny;
//@ chunk-nkdv7dw8.js:3381-3419 placement
var requireVtyyqz9qChunk = require("./chunk-vtyyqz9q.js");
//@ chunk-nkdv7dw8.js:3419-3488 placement
function mcpClientModule_5() {
  return require("./chunk-asne9cp8.js").mcpClientModule();
}
//@ chunk-nkdv7dw8.js:3488-3584 placement
function describeMcpServerStatus(e) {
  return e.type === "failed" ? (e.error ?? "Connection failed") : `Server status: ${e.type}`;
}
//@ chunk-nkdv7dw8.js:3584-5072 placement
/**
 * 汇总 MCP 服务器状态供 mcp_status 返回。
 */
function buildMcpStatusList(e, n, clients) {
  let s = new Map(n.clients.map((client) => [client.name, client]));
  let r = new Map((clients ?? []).map((w) => [w.name, w]));
  let u = new Set(n.names);
  let S = identityEpoch();
  let y = new Set();
  let C = new Map();
  let E = new Set();
  let D = new Set();
  let x = (client, P) => {
    let G = r.get(client.name);
    if (!G) {
      D.add(client.name);
      return;
    }
    if (G !== P && G.type !== "pending" && mcpClientModule_5().areMcpConfigsEqual(G.config, client.config)) {
      E.add(client.name);
      return G;
    }
    return client;
  };
  let clients_2 = e.clients.flatMap((client) => {
    if (client.type !== "pending") return [client];
    let P = s.get(client.name);
    if (!P) {
      if (!u.has(client.name) || clients === undefined) return [client];
      return x(client, undefined) ?? [];
    }
    if (!mcpClientModule_5().areMcpConfigsEqual(client.config, P.config)) return [client];
    if (clients !== undefined && r.get(client.name) === P) {
      y.add(client.name);
      let G = pendingReconnect(P);
      if (G !== undefined) C.set(client.name, G);
      return [P];
    }
    if (n.dialEpochs[client.name] !== S && isRemoteMcpTransport(client.config))
      return clients === undefined ? [client] : (x(client, P) ?? []);
    if (clients === undefined) {
      y.add(client.name);
      return [P];
    }
    return x(client, P) ?? [];
  });
  if (y.size === 0 && E.size === 0 && D.size === 0) return e;
  let mapped = [...y].map((w) => [w, getMcpPrefix(w)]);
  let mapped_2 = n.clients.map((client) => [client.name, getMcpPrefix(client.name)]);
  let B = (tool, P) => P.some(([G, oe]) => isToolFromMcpServer(tool, G, oe));
  let mapped_3 = [...D].map((w) => [w, getMcpPrefix(w)]);
  let mapped_4 = [...C.keys()].map((key) => [key, getMcpPrefix(key)]);
  let U = (tool) => mapped_4.find(([P, G]) => isToolFromMcpServer(tool, P, G))?.[0];
  let z = new Map();
  for (let tool of n.tools) {
    let P = U(tool);
    if (P !== undefined) z.set(P, (z.get(P) ?? new Set()).add(tool.name));
  }
  let J = new Set();
  let flattened = n.tools.flatMap((tool) => {
    let P = U(tool);
    if (P !== undefined) {
      if (J.has(P)) return [];
      J.add(P);
      let G = z.get(P);
      return (C.get(P) ?? []).filter((oe) => G?.has(oe.name));
    }
    return B(tool, mapped) || (y.size > 0 && !B(tool, mapped_2)) ? [tool] : [];
  });
  let flattened_2 = [...C].flatMap(([w, P]) => P.filter((G) => !z.get(w)?.has(G.name)));
  return {
    ...e,
    clients: clients_2,
    tools: Ji([...e.tools.filter((tool) => !B(tool, mapped_3)), ...flattened, ...flattened_2], "name"),
  };
}
//@ chunk-nkdv7dw8.js:5072-7153 placement
/**
 * 推送的 MCP 服务器被忽略/不接纳的原因文本。
 */
var BUILTIN_SERVER_IGNORED_REASON = "Builtin server is CLI-owned; ignored";
var IGNORED_BY_ENTERPRISE_POLICY_TEXT = "Blocked by enterprise policy (allowedMcpServers/deniedMcpServers)";
var IGNORED_HERMETIC_MODE_TEXT = "Ignored in hermetic mode (not declared in user config)";
var IGNORED_EXCLUSIVE_MANAGED_CONFIG_TEXT =
  "Ignored: an enterprise MCP config (managed-mcp.json) is present and has exclusive control over MCP servers";
var IGNORED_DISABLE_SIDELOAD_TEXT =
  "Ignored: managed setting disableSideloadFlags forbids server-delivered MCP servers on this machine";
var IGNORED_REMOTE_CONTROL_TEXT =
  "Ignored in a Remote Control session: MCP servers are loaded only from the verified startup config on this machine";
var IGNORED_IDE_TRANSPORT_TEXT =
  "Ignored: IDE transports are registered by the CLI itself, not mcp_set_servers";
var NOT_ADMITTED_PROXY_SHAPE_TEXT =
  "Not admitted: a pushed server must be an http server on this session's MCP proxy route, with a URL of at most 4,096 characters (a non-ASCII character counts as its percent-encoded bytes)";
var NOT_ADMITTED_RESERVED_NAME_TEXT =
  "Not admitted: this name is reserved for a first-party server, and this entry cannot be added after session start";
var NOT_CONNECTED_LIMITS_TEXT =
  "Not connected: this worker could not take all of this server's per-tool limits; the next worker that the session moves to reads the entry again";
var NOT_CONNECTED_NOT_TAKEN_TEXT =
  "Not connected: this worker's start did not take this server, so the worker takes no push of it; the next worker that the session moves to reads the entry again";
var APPLIED_AT_NEXT_REDISPATCH_TEXT = "Change to a running server is applied at the next re-dispatch";
var NO_TOOL_POLICY_IN_SESSION_TEXT =
  "Not applied: this session applies no per-tool permission_policy to a client-hosted MCP server, so no always_ask or always_deny in this entry takes effect; the server is otherwise unchanged";
var TOGGLED_BY_SERVER_SET_TEXT =
  "Not applied: in this session, servers are turned on or off by changing the session's server set";
var UNCONFIRMED_TOGGLE_TEXT =
  "The session's tool container did not confirm the change, so the server may be on or off. Check its status before trying again";
var SAVED_FOR_NEXT_START_TEXT =
  "Saved. The server stays off for now and will be connected the next time this session starts after being idle. There is nothing more to do";
var KNOWN_MCP_STATUS_TEXTS = new Set([
  BUILTIN_SERVER_IGNORED_REASON,
  OPERATOR_SUPPLIED_IGNORED_TEXT,
  IGNORED_BY_ENTERPRISE_POLICY_TEXT,
  IGNORED_HERMETIC_MODE_TEXT,
  IGNORED_EXCLUSIVE_MANAGED_CONFIG_TEXT,
  IGNORED_DISABLE_SIDELOAD_TEXT,
  IGNORED_REMOTE_CONTROL_TEXT,
  IGNORED_IDE_TRANSPORT_TEXT,
  NOT_ADMITTED_PROXY_SHAPE_TEXT,
  NOT_ADMITTED_RESERVED_NAME_TEXT,
  NOT_CONNECTED_LIMITS_TEXT,
  NOT_CONNECTED_NOT_TAKEN_TEXT,
  APPLIED_AT_NEXT_REDISPATCH_TEXT,
  NO_TOOL_POLICY_IN_SESSION_TEXT,
  TOGGLED_BY_SERVER_SET_TEXT,
  UNCONFIRMED_TOGGLE_TEXT,
  SAVED_FOR_NEXT_START_TEXT,
  BLOCKED_BY_POLICY_REASON,
  RESERVED_ADDRESS_REASON,
  ACCOUNT_CHANGED_REASON,
]);
var KNOWN_RUNNER_SKIP_REASONS = new Set([
  "synced-file staging not supported on this runner kind",
  "CLAUDE_CODE_REMOTE_SESSION_ID unset",
  "list returned incomplete credential",
]);
//@ chunk-nkdv7dw8.js:7153-7450 placement
/**
 * MCP 资源请求错误文字的白名单校验：只放行固定集合或符合 gated/failed/truncated/stalled 格式的文字，其他返回 undefined。
 */
function sanitizeMcpResourceError(error) {
  if (KNOWN_RUNNER_SKIP_REASONS.has(error)) return error;
  if (
    /^(list|read) gated: [a-z-]{2,32}$/.test(error) ||
    /^(list|read|write|mkdir) failed: (http \d{3}|[A-Za-z_-]{2,24}|-?\d{1,5})$/.test(error) ||
    /^read truncated: got \d{1,16} of \d{1,16} bytes$/.test(error) ||
    /^read stalled: no bytes for \d{1,16}ms$/.test(error)
  )
    return error;
  return;
}
//@ chunk-nkdv7dw8.js:7450-7613 placement
function allowlistedStatusText(e) {
  if (e.match(/^Server status: ([a-z][a-z-]{0,31})$/) !== null) return e;
  if (e.match(/^Server not found: ([A-Za-z0-9 _.-]{1,64})$/) !== null) return e;
  return;
}
//@ chunk-nkdv7dw8.js:7613-7684 placement
/**
 * mcp_set_servers 的 servers 参数必须为对象映射时的错误文本。
 */
var SERVERS_OBJECT_REQUIRED_TEXT = "mcp_set_servers: servers must be an object of config objects";
//@ chunk-nkdv7dw8.js:7684-7945 placement
/**
 * 生成可上报的 MCP 服务器状态表：需要脱敏时清洗服务器名（重名加 #n），状态文本只保留白名单内的形状，否则记为 "connection failed"。
 */
function sanitizeMcpStatusMap(e, errors) {
  let o = e;
  let s = Object.create(null);
  for (let [key, value] of Object.entries(errors)) {
    let S = o ? sanitizeTelemetryString(key) : key;
    if (o && Object.hasOwn(s, S)) {
      let y = 2;
      while (Object.hasOwn(s, `${S}#${y}`)) y++;
      S = `${S}#${y}`;
    }
    s[S] =
      !e ||
      KNOWN_MCP_STATUS_TEXTS.has(value) ||
      (isPrototypeKey(key) && value === reservedServerNameMessage(key))
        ? value
        : (allowlistedStatusText(value) ?? "connection failed");
  }
  return s;
}
//@ chunk-nkdv7dw8.js:7945-7997 placement
var NOT_DIALED_SUPERSEDED_TEXT = "not dialed: a newer server set replaced it";
//@ chunk-nkdv7dw8.js:7997-8143 placement
/**
 * 按范围筛选 MCP 服务器配置：严格配置模式返回空；configured 范围全部保留，否则只留内置市场来的服务器。
 */
function filterServersForScope(servers, { scope, strictMcpConfig }) {
  let s = emptyServerMap();
  if (strictMcpConfig) return s;
  for (let [key, value] of Object.entries(servers))
    if (scope === "configured" || isFromBuiltinMarketplace(value)) s[key] = value;
  return s;
}
//@ chunk-nkdv7dw8.js:8143-8230 placement
/**
 * 从服务器配置表里挑出非内置市场来源的服务器（未知上下文下会整体保留）。
 */
function nonBuiltinMarketplaceServers(configs) {
  let n = emptyServerMap();
  for (let [key, value] of Object.entries(configs)) if (!isFromBuiltinMarketplace(value)) n[key] = value;
  return n;
}
//@ chunk-nkdv7dw8.js:21884-21956 placement
var teleportRelayEnvModule = require("./chunk-1d5behve.js");
var chromeSwitchNotesModule = require("./chunk-1cnesc1e.js");
//@ chunk-nkdv7dw8.js:21956-22026 placement
function mcpClientModule_7() {
  return require("./chunk-asne9cp8.js").mcpClientModule();
}
//@ chunk-nkdv7dw8.js:22026-23645 placement
/**
 * mcp_reconnect / mcp_toggle 的开关处理：解析 lane 上下文、处理待定手工交换，再按目标状态启用或禁用服务器并回复。
 */
var handleMcpReconnect = (e, n) => {
  let o = requireMcpControlLanes(n);
  o.resolveDeferredPluginStartup();
  let { serverName } = e;
  if (typeof serverName !== "string")
    throw new WireSafeControlError("mcp_reconnect: serverName must be a string");
  let r = o.pendingManualExchange(serverName);
  if (r) return awaitExchangeThenToggle(r, n, o, serverName);
  return toggleMcpServer(n, o, serverName);
};
var handleMcpToggle = (e, n) => {
  let o = requireMcpControlLanes(n);
  o.resolveDeferredPluginStartup();
  let s = n.engineState();
  let { serverName, enabled } = e;
  if (typeof serverName !== "string")
    throw new WireSafeControlError("mcp_toggle: serverName must be a string");
  if (typeof enabled !== "boolean") throw new WireSafeControlError("mcp_toggle: enabled must be a boolean");
  if (isClaudeInChromeMCPServer(serverName) && teleportRelayEnvModule?.getTeleportRelayEnvConfig())
    chromeSwitchNotesModule?.noteChromeSwitch(enabled);
  let S =
    s.mcp.clients.find((client) => client.name === serverName) ??
    o.dynamicClients().find((h) => h.name === serverName);
  let y = isUnadoptedSdkServer(o, s, serverName);
  let config = y
    ? o.registeredSdkServer(serverName)
    : (o.ownerConfig(serverName) ??
      o.sdkClients().find((h) => h.name === serverName)?.config ??
      (enabled ? null : (S?.config ?? null)));
  let E = config ? mcpDialBlockCause(serverName, config) : null;
  if (!config) {
    if (enabled && isClaudeInChromeMCPServer(serverName)) setServerEnabledEverywhere(n, o, serverName, true);
    throw new WireSafeControlError(`Server not found: ${sanitizeTelemetryString(serverName)}`);
  }
  if (!enabled)
    return y
      ? disableSdkServerControl(n, o, serverName, config)
      : reconnectDisabledServer(n, o, serverName, config, s);
  if (E)
    throw new WireSafeControlError(
      E === "managed-policy"
        ? mcpRefusalText(
            serverName,
            E,
            config,
            `MCP server ${sanitizeTelemetryString(serverName)} is blocked by enterprise managed policy`,
          )
        : notApprovedText(serverName, "enabling"),
    );
  let filtered = [...s.mcp.clients, ...o.dynamicClients(), ...o.sdkClients()].filter(
    (h) => h.name === serverName,
  );
  let x =
    config.type !== "sdk" &&
    !isMcpServerDisabled(serverName) &&
    o.pendingManualExchange(serverName) === undefined &&
    !o.postOAuthReconnectPending.has(serverName) &&
    filtered.length > 0 &&
    filtered.every(
      (h) =>
        h.type === "connected" &&
        !isClientWithoutTransport(h) &&
        (h.transportErrorState?.consecutiveErrors ?? 0) === 0 &&
        h.toolsListError === undefined &&
        !h.discoveryBearerRejected &&
        !h.discoveryAuthFailure &&
        !h.capabilities?.prompts &&
        !h.capabilities?.resources &&
        mcpClientModule_7().areMcpConfigsEqual(h.config, config),
    );
  setServerEnabledEverywhere(n, o, serverName, true);
  if (y) return enableSdkServerControl(n, o, serverName, config);
  if (x) {
    logForDiagnosticsNoPII("info", "cli_mcp_toggle_unchanged");
    return;
  }
  return reconnectServerForControl(n, o, serverName, config, false);
};
//@ chunk-nkdv7dw8.js:23645-23816 placement
/**
 * 判断 SDK 注册的 MCP 服务器是否尚未被接管：不是 Chrome 服务器、有 SDK 注册、无归属配置，且不在当前客户端或动态客户端中。
 */
function isUnadoptedSdkServer(e, n, serverName) {
  return (
    !isClaudeInChromeMCPServer(serverName) &&
    e.registeredSdkServer(serverName) !== null &&
    e.ownerConfig(serverName) === null &&
    !n.mcp.clients.some((client) => client.name === serverName) &&
    !e.dynamicClients().some((s) => s.name === serverName)
  );
}
//@ chunk-nkdv7dw8.js:23816-23901 placement
function requireMcpControlLanes(e) {
  if (e.mcpControlLanes === null) throw new WireSafeControlError(UNSUPPORTED_CONTROL_SUBTYPE_TEXT);
  return e.mcpControlLanes;
}
//@ chunk-nkdv7dw8.js:23901-23962 placement
function setServerEnabledEverywhere(e, n, serverName, s) {
  setMcpServerEnabled(serverName, s, e.storageV5);
  n.switchSaved(serverName, s);
}
//@ chunk-nkdv7dw8.js:23962-24028 placement
async function awaitExchangeThenToggle(e, n, o, serverName) {
  await e.catch(() => {});
  return toggleMcpServer(n, o, serverName);
}
//@ chunk-nkdv7dw8.js:24028-24596 placement
function toggleMcpServer(e, n, o) {
  let s = e.engineState();
  let r = n.ownerConfig(o) ?? n.sdkClients().find((C) => C.name === o)?.config ?? null;
  let u = r ? mcpDialBlockCause(o, r) : null;
  if (!r) throw new WireSafeControlError(`Server not found: ${sanitizeTelemetryString(o)}`);
  if (u === "managed-policy")
    throw new WireSafeControlError(
      mcpRefusalText(
        o,
        u,
        r,
        `MCP server ${sanitizeTelemetryString(o)} is blocked by enterprise managed policy`,
      ),
    );
  if (isMcpServerDisabled(o)) throw new WireSafeControlError(disabledEnableBeforeText(o, "reconnecting"));
  if (u) throw new WireSafeControlError(notApprovedText(o, "reconnecting"));
  let S = s.mcp.clients.find((client) => client.name === o) ?? n.dynamicClients().find((C) => C.name === o);
  let distrust =
    !takeRecentWithin(n.postOAuthReconnectPending, o) &&
    S !== undefined &&
    S.type !== "cached" &&
    S.type !== "pending";
  return reconnectServerForControl(e, n, o, r, distrust);
}
//@ chunk-nkdv7dw8.js:24596-24791 placement
async function reconnectServerForControl(e, n, o, s, distrust) {
  n.seedControlDialSlot(o, s);
  let u = await n.reconnectForControlRequest(o, s, {
    distrust,
  });
  let S = En(n.ownerConfig(o), s);
  replyThenThrowOnError(
    e,
    reconnectMcpServer(
      e,
      n.landControlResult(
        o,
        S
          ? {
              ...u,
              asked: true,
            }
          : u,
      ),
    ),
  );
}
//@ chunk-nkdv7dw8.js:24791-24888 placement
function replyThenThrowOnError(e, n) {
  if (e.replyNow !== null) e.replyNow(n);
  if (n.subtype === "error") throw new QueuedNotificationError(n.error);
}
//@ chunk-nkdv7dw8.js:24888-25250 placement
function reconnectMcpServer(e, n) {
  if (n.type === "connected")
    return {
      subtype: "success",
    };
  if (n.type === "failed") {
    if (e.redactsPersistedLane())
      logForDebugging(`mcp reconnect/toggle failed: ${n.error ?? "(no detail)"}`, {
        level: "error",
      });
    let error = n.error ?? "Connection failed";
    return {
      subtype: "error",
      error: KNOWN_MCP_STATUS_TEXTS.has(error)
        ? error
        : (allowlistedStatusText(error) ?? (e.redactsPersistedLane() ? "Connection failed" : error)),
    };
  }
  return {
    subtype: "error",
    error: describeMcpServerStatus(n),
  };
}
//@ chunk-nkdv7dw8.js:25250-25308 placement
function reconnectDisabledServer(e, n, serverName, s, r) {
  setServerEnabledEverywhere(e, n, serverName, false);
  return reconnectMcpServerByName(e, n, serverName, s, r);
}
//@ chunk-nkdv7dw8.js:25308-25697 placement
/**
 * 处理 mcp_reconnect：找到同名的启动/SDK/动态/已连接客户端，清除已连接实例（按配置去重）的服务器缓存，再重连并回复。
 */
function reconnectMcpServerByName(e, n, o, s, r, u) {
  let filtered = [...n.startupClients(), ...n.sdkClients(), ...n.dynamicClients(), ...r.mcp.clients].filter(
    (C) => C.name === o,
  );
  let filtered_2 = filtered.filter((C) => C.type === "connected");
  if (filtered_2.length > 0) {
    let C = mcpClientModule_7();
    return mergeMcpClientConfigs([s, ...filtered_2.map((E) => E.config)], C.areMcpConfigsEqual)
      .reduce((acc, D) => acc.then(() => C.clearServerCache(o, D)), Promise.resolve())
      .then(() => finishMcpReconnect(e, n, o, s, filtered_2.at(-1), u));
  }
  return finishMcpReconnect(e, n, o, s, filtered[0], u);
}
//@ chunk-nkdv7dw8.js:25697-25802 placement
async function disableSdkServerControl(e, n, serverName, s) {
  setServerEnabledEverywhere(e, n, serverName, false);
  await n.disableSdkServer(serverName);
  markServerDisabled(e, n, serverName);
  replyThenThrowOnError(e, {
    subtype: "success",
  });
}
//@ chunk-nkdv7dw8.js:25802-25944 placement
async function enableSdkServerControl(e, n, serverName, config) {
  let r = await n.enableSdkServer(serverName);
  replyThenThrowOnError(
    e,
    reconnectMcpServer(
      e,
      r ?? {
        name: serverName,
        type: "failed",
        config,
        error: `Server not found: ${sanitizeTelemetryString(serverName)}`,
      },
    ),
  );
}
//@ chunk-nkdv7dw8.js:25944-26281 placement
/**
 * MCP 重连控制请求的收尾：仍有效时找到该服务器的当前客户端；若是缓存/新连接则先刷新其工具再回复成功，否则直接清理并回复成功。
 */
function finishMcpReconnect(e, n, o, s, r, u = () => true) {
  if (!u()) return;
  let S =
    e.engineState().mcp.clients.find((client) => client.name === o) ??
    n.dynamicClients().find((C) => C.name === o) ??
    r;
  if (S?.type === "cached" || (S?.type === "connected" && S !== r) || isDiscoveryCacheUsable())
    return dropServerCaches(o, S?.config ?? s, S, r).then(() => {
      if (!u()) return;
      markServerDisabled(e, n, o);
      replyThenThrowOnError(e, {
        subtype: "success",
      });
    });
  markServerDisabled(e, n, o);
  replyThenThrowOnError(e, {
    subtype: "success",
  });
}
//@ chunk-nkdv7dw8.js:26281-26511 placement
async function dropServerCaches(e, n, o, s) {
  if (o?.type === "cached") mcpClientModule_7().disposeServerConnectionDetached(e, o.config);
  else if (o?.type === "connected" && o !== s) await mcpClientModule_7().clearServerCache(e, o.config);
  if (!isDiscoveryCacheUsable()) return;
  await flushDiscoveryCache(mcpClientModule_7().dropDiscoveryEntry(e, n));
}
//@ chunk-nkdv7dw8.js:26511-26865 placement
/**
 * 把 MCP 服务器在引擎状态中标为 disabled：客户端条目改为 disabled，并移除其工具、命令、资源与资源模板。
 */
function markServerDisabled(e, n, o) {
  n.markDynamicServerDisabled(o);
  let mcpPrefix = getMcpPrefix(o);
  e.setEngineState((r) => ({
    ...r,
    mcp: {
      ...r.mcp,
      clients: r.mcp.clients.map((client) =>
        client.name === o
          ? {
              name: o,
              type: "disabled",
              config: client.config,
            }
          : client,
      ),
      tools: reject_default(r.mcp.tools, (u) => isToolFromMcpServer(u, o, mcpPrefix)),
      commands: reject_default(r.mcp.commands, (u) => commandBelongsToServer(u, o)),
      resources: omitKeys(r.mcp.resources, o),
      resourceTemplates: omitKeys(r.mcp.resourceTemplates, o),
    },
  }));
}
//@ chunk-nkdv7dw8.js:26865-26900 placement
var handleMcpStatus = (e, n) => ({
  mcpServers: mcpStatusForReply(n),
});
//@ chunk-nkdv7dw8.js:26900-27000 placement
function mcpStatusForReply(e) {
  return e.redactsPersistedLane()
    ? minimalStatuses(describeMcpServerForStatus(e.mcpConnections()))
    : describeMcpServerForStatus(e.mcpConnections());
}
//@ chunk-nkdv7dw8.js:27000-27281 placement
var handleGetBinaryVersion = () => getVersionReport();
var handleGetContextUsage = async (e, n) => {
  if (e.detail != null && e.detail !== "summary" && e.detail !== "full")
    throw new WireSafeControlError("get_context_usage: detail must be 'summary' or 'full'");
  let contextUsage = await collectContextUsage(n, e.detail, mayIncludeAgentPaths(n));
  return {
    ...contextUsage,
    memoryFiles: n.redactsPersistedLane() ? [] : contextUsage.memoryFiles,
    ...(!mayIncludeAgentPaths(n) && stripInitializeAgentPaths(contextUsage)),
  };
};
//@ chunk-nkdv7dw8.js:27281-27566 placement
function collectContextUsage(e, detail, localPaths) {
  let { messages, mainLoopModel = getMainLoopModel(), ...u } = e.contextUsageInputs();
  return collectContextData({
    session: e.session,
    messages,
    getAppState: e.engineState,
    getMcp: () => e.engineState().mcp,
    storageV5: e.storageV5,
    credentials: e.credentials,
    options: {
      mainLoopModel,
      ...u,
    },
    detail,
    localPaths,
  });
}
//@ chunk-nkdv7dw8.js:27566-28256 placement
/**
 * 控制请求的三个小处理器：get_session_cost 返回总费用文本、reload_output_styles 清缓存并返回可用样式名、get_usage 校验 skip_behaviors 参数后返回用量。
 */
var handleListModels = () => ({
  models: toSdkModelInfos(buildModelPickerOptions()),
});
var handleGetSessionCost = () => ({
  text: stripAnsi(formatTotalCost()),
});
var handleReloadOutputStyles = async (e, n) => {
  clearOutputStyleCaches();
  clearOutputStylesCache();
  let allOutputStyles = await getAllOutputStylesCached(getCwdOrNull(), n.storageV5);
  return {
    available_output_styles: Object.keys(allOutputStyles),
  };
};
var handleGetUsage = async (e, n) => {
  if (e.skip_behaviors != null && typeof e.skip_behaviors !== "boolean")
    throw new WireSafeControlError("get_usage: skip_behaviors must be a boolean");
  let o = await projectModelScopedUsage({
    storageV5: n.storageV5,
    credentials: n.credentials,
    live: effortBelowMaxSaved(
      getMainLoopModel(),
      resolveEffortLevel(n.engineState()),
      n.engineState().ultracode,
    ),
    includeBehaviors: !n.redactsPersistedLane() && e.skip_behaviors !== true,
  });
  let s = mayIncludeAgentPaths(n);
  if (!o.behaviors || (s && !isBridgeOrTransport(n.session))) return o;
  let r = {
    fix: undefined,
    ...(!s && {
      recommendations: undefined,
    }),
  };
  let { day, week } = o.behaviors;
  return {
    ...o,
    behaviors: {
      day: {
        ...day,
        ...r,
      },
      week: {
        ...week,
        ...r,
      },
    },
  };
};
//@ chunk-nkdv7dw8.js:28256-29878 placement
function describeMcpServerForStatus({ connections, tools }) {
  let o = Ji(tools, "name");
  return connections
    .filter((connection) => !isArtifacts404Failure(connection))
    .map((connection) => {
      let u =
        isCcrInjectedMcpUrl(connection.name, connection.config) || isClaudeAiProxyServer(connection.config);
      let S = mcpServerSource(connection.name, connection.config);
      let y;
      let C;
      let E = false;
      if (connection.config.type === "sse" || connection.config.type === "http") {
        let h = URL.parse(connection.config.url);
        E = u && S === "dynamic" && h !== null && ccrPathPrefixIndex(h);
        y = redactManagedMcpServerConfig(
          {
            type: connection.config.type,
            url: connection.config.url,
            headers: connection.config.headers,
            oauth: connection.config.oauth,
          },
          connection.config.scope,
        );
        if (!u && MCP_SETTINGS_SCOPE_SET.has(connection.config.scope)) {
          let L = describeMcpServerOrigin(connection.name, connection.config, {
            detail: "origin",
          });
          try {
            C = L === undefined || L.includes("${") ? undefined : new URL(L).host || undefined;
          } catch {
            C = undefined;
          }
        }
      } else if (connection.config.type === "claudeai-proxy")
        y = {
          type: "claudeai-proxy",
          url: connection.config.url,
          id: connection.config.id,
        };
      else if (connection.config.type === "stdio" || connection.config.type === undefined)
        y = {
          type: "stdio",
          command: connection.config.command,
          args: connection.config.args,
        };
      let tools = isConnectedOrCached(connection)
        ? filterToolsByServer(o, connection.name).map((h) => ({
            name: h.mcpInfo?.toolName ?? h.name,
            annotations: {
              readOnly: h.isReadOnly({}) || undefined,
              destructive: h.isDestructive?.({}) || undefined,
              openWorld: h.isOpenWorld?.({}) || undefined,
            },
            ...(h.mcpInfo?.uiMeta && {
              _meta: h.mcpInfo.uiMeta,
            }),
          }))
        : undefined;
      let capabilities;
      if (isConnectedOrCached(connection) && connection.capabilities.experimental) {
        let h = {
          ...connection.capabilities.experimental,
        };
        if (
          "claude/channel" in h &&
          (!hasExperimentalCapability(connection.capabilities, "claude/channel") ||
            !isChannelsEnabled() ||
            !isChannelAllowlisted(connection.config.pluginSource) ||
            (connection.type === "connected" && connection.protocolEra === "modern"))
        )
          delete h["claude/channel"];
        if (Object.keys(h).length > 0)
          capabilities = {
            experimental: h,
          };
      }
      return {
        name: connection.name,
        status: clientStatusForSnapshot(connection.type),
        serverInfo: isConnectedOrCached(connection) ? connection.serverInfo : undefined,
        error: connection.type === "failed" ? connection.error : undefined,
        error_code: mcpAuthErrorCode(connection),
        config: y,
        transport: connection.config.type ?? "stdio",
        ...(u
          ? {
              sessionProxied: u,
              ...(E && {
                cloudServiceProvided: E,
              }),
            }
          : C && {
              urlHost: C,
            }),
        scope: connection.config.scope,
        source: S,
        tools,
        capabilities,
      };
    });
}
//@ chunk-nkdv7dw8.js:29878-29942 placement
function mayIncludeAgentPaths(e) {
  return !e.redactsPersistedLane() && !mayTransportPersist(e.session);
}
//@ chunk-nkdv7dw8.js:29942-30609 placement
function handleSetMcpPermissionModeOverride(e) {
  let { serverName, mode } = e;
  if (typeof serverName !== "string")
    throw new WireSafeControlError("set_mcp_permission_mode_override: serverName must be a string");
  let s = mode === null ? null : parsePermissionMode(mode);
  if (s === undefined) throw new WireSafeControlError(UNRECOGNIZED_PERMISSION_MODE_ERROR);
  let mcpModeOverride = parseMcpModeOverride(s);
  if (!mcpModeOverride.ok) {
    logForDebugging(
      `set_mcp_permission_mode_override: rejected mode='${mcpModeOverride.rejected}' for ${sanitizeTelemetryString(serverName)} (tighten-only)`,
      {
        level: "warn",
      },
    );
    throw new WireSafeControlError(
      `Permission mode override over the control channel is tighten-only ('default', 'auto', or null); rejected '${mcpModeOverride.rejected}'`,
    );
  }
  if (mcpModeOverride.override === "auto" && !isAutoModeGateEnabled()) {
    let autoModeUnavailableReason = getAutoModeUnavailableReason();
    throw new WireSafeControlError(
      autoModeUnavailableReason
        ? `Cannot pin MCP server '${sanitizeTelemetryString(serverName)}' to auto: ${getAutoModeUnavailableNotification(autoModeUnavailableReason)}`
        : `Cannot pin MCP server '${sanitizeTelemetryString(serverName)}' to auto`,
    );
  }
  return {
    serverName,
    override: mcpModeOverride.override,
  };
}
//@ chunk-nkdv7dw8.js:30609-30771 placement
var ASK_FOR_TOOLS_INVALID_MESSAGE = `set_mcp_permission_mode_override: askForTools must be a list of at most ${MCP_ASK_FOR_TOOLS_MAX} {name} entries, each name 1 to 64 letters, digits, underscores or hyphens`;
//@ chunk-nkdv7dw8.js:30771-31143 placement
/**
 * 校验 set_mcp_permission_mode_override 的 askForTools：至多上限个 {name}、名字合法，去掉服务器前缀后去重返回，空则 undefined；不合法抛 WireSafeControlError。
 */
function parseAskForTools(e, serverName) {
  let askForTools = e.askForTools;
  if (askForTools === undefined || askForTools === null) return;
  if (!Array.isArray(askForTools) || askForTools.length > MCP_ASK_FOR_TOOLS_MAX)
    throw new WireSafeControlError(ASK_FOR_TOOLS_INVALID_MESSAGE);
  let mcpPrefix = getMcpPrefix(serverName);
  let r = new Set();
  for (let askForTool of askForTools) {
    let S =
      typeof askForTool === "object" && askForTool !== null && !Array.isArray(askForTool)
        ? askForTool.name
        : undefined;
    if (typeof S !== "string" || !MCP_ASK_FOR_TOOLS_NAME.test(S))
      throw new WireSafeControlError(ASK_FOR_TOOLS_INVALID_MESSAGE);
    let y = S.startsWith(mcpPrefix) ? S.slice(mcpPrefix.length) : S;
    if (y !== "") r.add(y);
  }
  return r.size > 0 ? [...r] : undefined;
}
//@ chunk-nkdv7dw8.js:31143-31938 placement
var clearUnknownServerOverride = (e, n) => {
  let { serverName, override } = handleSetMcpPermissionModeOverride(e);
  let askForTools = parseAskForTools(e, serverName);
  let u = override === "default" ? askForTools : undefined;
  let S = false;
  n.setEngineState((y) => {
    let mcpPermissionModeOverrides = y.toolPermissionContext.mcpPermissionModeOverrides;
    let mcpAskForTools = y.toolPermissionContext.mcpAskForTools ?? {};
    S = Object.hasOwn(mcpPermissionModeOverrides, serverName);
    if (
      (S ? mcpPermissionModeOverrides[serverName] === override : override === undefined) &&
      En(getOwn(mcpAskForTools, serverName), u)
    )
      return y;
    let mcpAskForTools_2 =
      u === undefined
        ? omitKeys(mcpAskForTools, serverName)
        : {
            ...mcpAskForTools,
            [serverName]: u,
          };
    return {
      ...y,
      toolPermissionContext: {
        ...y.toolPermissionContext,
        mcpPermissionModeOverrides:
          override === undefined
            ? omitKeys(mcpPermissionModeOverrides, serverName)
            : {
                ...mcpPermissionModeOverrides,
                [serverName]: override,
              },
        mcpAskForTools: mcpAskForTools_2,
      },
    };
  });
  if (n.isKnownMcpServer(serverName)) return;
  return {
    warning:
      override === undefined
        ? S
          ? `MCP server '${sanitizeTelemetryString(serverName)}' is not known; its stored override was cleared.`
          : `MCP server '${sanitizeTelemetryString(serverName)}' is not known; no override was present to clear.`
        : `MCP server '${sanitizeTelemetryString(serverName)}' is not yet known; override stored but will not apply until a server with that exact name connects.`,
  };
};
//@ chunk-nkdv7dw8.js:31938-31966 placement
/**
 * mcp_read_resource 结果 JSON 的长度上限 10MB，超过即拒绝。
 */
var MAX_MCP_RESOURCE_JSON_CHARS = 10485760;
var UI = "ui://";
//@ chunk-nkdv7dw8.js:31966-32018 placement
function mcpModulesChunk_3() {
  return require("./chunk-asne9cp8.js");
}
//@ chunk-nkdv7dw8.js:32018-32076 placement
function refuseMcpReadResource(e, n) {
  logFeatureBad("mcp_read_resource", e);
  throw new WireSafeControlError(n);
}
//@ chunk-nkdv7dw8.js:32076-34360 placement
var handleMcpReadResource = async (e, n) => {
  if (n.redactsPersistedLane())
    refuseMcpReadResource("redacting_lane", "mcp_read_resource is not available on this connection");
  let { serverName, uri } = e;
  if (typeof serverName !== "string")
    refuseMcpReadResource("bad_request", "mcp_read_resource: serverName must be a string");
  if (typeof uri !== "string")
    refuseMcpReadResource("bad_request", "mcp_read_resource: uri must be a string");
  if (!uri.startsWith(UI))
    refuseMcpReadResource("not_ui_uri", "mcp_read_resource: uri must use the ui:// scheme");
  let found = n.mcpConnections().connections.find((connection) => connection.name === serverName);
  if (!found) {
    if (n.isKnownMcpServer(serverName))
      refuseMcpReadResource(
        "not_connected",
        `MCP server ${sanitizeTelemetryString(serverName)} is not connected`,
      );
    refuseMcpReadResource("server_not_found", `Server not found: ${sanitizeTelemetryString(serverName)}`);
  }
  let u = mcpDialBlockCause(found.name, found.config);
  if (u === "managed-policy")
    refuseMcpReadResource(
      judgeGate(serverName, found.config) ? "reserved_address" : "policy_blocked",
      mcpRefusalText(
        serverName,
        u,
        found.config,
        `MCP server ${sanitizeTelemetryString(serverName)} is blocked by enterprise managed policy`,
      ),
    );
  if (found.type === "disabled" || isMcpServerDisabled(found.name))
    refuseMcpReadResource("disabled", disabledEnableBeforeText(serverName, "reading"));
  if (u) refuseMcpReadResource("approval_required", notApprovedText(serverName, "reading"));
  if (!isConnectedOrCached(found))
    refuseMcpReadResource(
      "not_connected",
      `MCP server ${sanitizeTelemetryString(serverName)} is not connected (status: ${clientStatusForSnapshot(found.type)})`,
    );
  if (found.config.type === "sdk")
    refuseMcpReadResource(
      "sdk_server",
      "mcp_read_resource does not support SDK MCP servers: the caller hosts them and can read them directly",
    );
  let S = hostedDesktopRefusal_2(found);
  if (S) refuseMcpReadResource("hosted_desktop", S.message);
  let y = {
    transport: fromEnum(found.config.type ?? "stdio"),
    row_type: fromEnum(found.type),
  };
  let now = Date.now();
  let phase = lit("connect");
  let D;
  try {
    let h = await mcpModulesChunk_3().mcpClientModule().ensureConnectedClient(found, {
      context: "mcp_read_resource",
    });
    phase = lit("read");
    D = await readMcpResource(h, uri, {
      timeout: getConnectionTimeoutMs(),
    });
  } catch (error) {
    let L = mcpModulesChunk_3();
    let mcpErrorCode = L.mcpSdkErrorClassificationModule().getMcpErrorCode(error);
    let errnoCode = getErrnoCode(error);
    logFeatureBad("mcp_read_resource", "read_failed", {
      ...y,
      elapsed_ms: Date.now() - now,
      phase,
      error_source: fromEnum(classifyMcpErrorSourceCategory(error)),
      ...(mcpErrorCode !== undefined && {
        rpc_code: mcpErrorCode,
      }),
      ...(errnoCode !== undefined && {
        local_code: L.mcpClientModule().sanitizeConnectErrorCodeForTelemetry(errnoCode),
      }),
      ...(error instanceof Error &&
        "status" in error &&
        typeof error.status === "number" && {
          http_status: fromNumber(error.status),
        }),
    });
    logForDebugging(
      `mcp_read_resource: resources/read on "${found.name}" failed (${sanitizeErrorName(error) ?? "unknown"})`,
      {
        level: "warn",
      },
    );
    throw new QueuedNotificationError(sanitizeTelemetryString(`mcp_read_resource: ${errorMessage(error)}`));
  }
  let mapped = D.contents.map((content) => ({
    uri: content.uri,
    mimeType: content.mimeType,
    text: "text" in content ? content.text : undefined,
    blob: "blob" in content ? content.blob : undefined,
    _meta: stripAnthropicMeta(content._meta),
  }));
  if (jsonStringify(mapped).length > MAX_MCP_RESOURCE_JSON_CHARS)
    refuseMcpReadResource(
      "too_large",
      `mcp_read_resource: the resource exceeds the ${MAX_MCP_RESOURCE_JSON_CHARS}-character limit`,
    );
  logFeatureOk("mcp_read_resource", {
    ...y,
    elapsed_ms: Date.now() - now,
  });
  return {
    contents: mapped,
  };
};
//@ chunk-nkdv7dw8.js:34360-34374 placement
var noop = () => {};
//@ chunk-nkdv7dw8.js:34374-35228 placement
/**
 * prefetch_attachments 请求的形状错误文案，以及对应的合法性校验函数。
 */
var PREFETCH_MAX_FILES = 16;
var PREFETCH_FILES_SHAPE_ERROR =
  "prefetch_attachments: files must be a list of at most 16 { file_uuid: UUID, file_size?: number }, issued_at a number (epoch milliseconds), and only_these, if present, a boolean";
var isValidPrefetchAttachmentsRequest = (e, n) => {
  let { files, issued_at: issuedAt, only_these: onlyThese } = e;
  if (
    !Array.isArray(files) ||
    files.length > PREFETCH_MAX_FILES ||
    typeof issuedAt !== "number" ||
    (onlyThese !== undefined && onlyThese !== null && typeof onlyThese !== "boolean")
  ) {
    logFeatureSad("bridge_attachment_prefetch", "invalid_request");
    logPrefetchOutcome("bridge_attachment_prefetch_invalid_request", {});
    throw new QueuedNotificationError(PREFETCH_FILES_SHAPE_ERROR);
  }
  let u = [];
  for (let file of files) {
    let y = normalizeUuidOrNull(isPlainObjectOrArrayCheck(file) ? file.file_uuid : undefined);
    let fileSize = isPlainObjectOrArrayCheck(file) ? file.file_size : undefined;
    if (y === null || (fileSize !== undefined && typeof fileSize !== "number")) {
      logFeatureSad("bridge_attachment_prefetch", "invalid_request");
      logPrefetchOutcome("bridge_attachment_prefetch_invalid_request", {});
      throw new QueuedNotificationError(PREFETCH_FILES_SHAPE_ERROR);
    }
    u.push(
      fileSize === undefined
        ? {
            file_uuid: y,
          }
        : {
            file_uuid: y,
            file_size: fileSize,
          },
    );
  }
  return {
    accepted: prefetchInboundAttachments(u, {
      issuedAt,
      credentials: n.credentials,
      onlyThese: onlyThese === true,
    }),
  };
};
//@ chunk-nkdv7dw8.js:35228-35299 placement
function isPlainObjectOrArrayCheck(file) {
  return typeof file === "object" && file !== null && !Array.isArray(file);
}
//@ chunk-nkdv7dw8.js:35299-35384 placement
/**
 * 创建一次写尝试状态 {latched, attempted, pending, fallback, owed}（MCP 控制请求的写重试用）。
 */
function initialWriteAttempt(e) {
  return {
    latched: e,
    attempted: e,
    pending: undefined,
    fallback: undefined,
    owed: false,
  };
}
//@ chunk-nkdv7dw8.js:35384-35428 placement
/**
 * 把写尝试状态锁存到给定值（latched 与 attempted 同时更新）。
 */
function latchWriteAttempt(e, n) {
  e.latched = n;
  e.attempted = n;
}
//@ chunk-nkdv7dw8.js:35428-36337 placement
function saveGeneratedTitle(text, n, signal = n.turnAbortSignal()) {
  let { titles } = n;
  let sessionId = getSessionId();
  if (titles.pending?.sessionId === sessionId) return titles.pending.title;
  let u = getMaterializedSessionFile() !== null;
  let S = {
    settled: false,
    retracted: false,
  };
  let y = requestSessionTitle(text, signal, n.credentials)
    .then((E) => {
      S.settled = true;
      if (S.retracted) return null;
      let D = E;
      if (E.kind === "titled") {
        let L = sanitizeSessionTitle(E.title);
        D = L
          ? {
              kind: "titled",
              title: L,
            }
          : {
              kind: "unusable",
            };
      }
      if (titles.fallback?.sessionId === sessionId) {
        let L = nextTitleFallback(titles.fallback.fallback, D);
        titles.fallback = L
          ? {
              sessionId,
              fallback: L,
            }
          : undefined;
      }
      if (D.kind !== "titled") {
        titles.attempted = titles.latched;
        return null;
      }
      titles.attempted = true;
      let { title } = D;
      let h = () => {
        try {
          saveAiGeneratedTitle(sessionId, title, n.storageV5);
        } catch (error) {
          if (isFsInaccessible(error)) logForDebugging(`saveAiGeneratedTitle failed: ${error}`);
          else logTitleChangeError(n, error);
        }
      };
      if (sessionId !== getSessionId()) {
        if (u) h();
        return title;
      }
      if (!getCurrentSessionDisplayTitle(sessionId)) {
        if (getMaterializedSessionFile()) h();
        else cacheAiTitle(title);
        getSdkHostedBridgeHandle()?.adoptLocalAiTitle?.();
        syncTitleToRemoteSession(title);
      }
      return title;
    })
    .catch((error) => {
      S.settled = true;
      titles.attempted = titles.latched;
      logTitleChangeError(n, error);
      return null;
    });
  let C = {
    sessionId,
    title: y,
    call: S,
  };
  titles.pending = C;
  y.then((E) => {
    if (E === null && titles.pending === C) titles.pending = undefined;
  });
  return y;
}
export {
  nonBuiltinMarketplaceServers,
  initialWriteAttempt,
  filterServersForScope,
  latchWriteAttempt,
  sanitizeMcpResourceError,
  SERVERS_OBJECT_REQUIRED_TEXT,
  sanitizeMcpStatusMap,
  describeMcpServerForStatus,
  BUILTIN_SERVER_IGNORED_REASON,
  IGNORED_IDE_TRANSPORT_TEXT,
  IGNORED_BY_ENTERPRISE_POLICY_TEXT,
  IGNORED_HERMETIC_MODE_TEXT,
  IGNORED_EXCLUSIVE_MANAGED_CONFIG_TEXT,
  IGNORED_DISABLE_SIDELOAD_TEXT,
  IGNORED_REMOTE_CONTROL_TEXT,
  requireVtyyqz9qChunk,
  buildMcpStatusList,
  NOT_DIALED_SUPERSEDED_TEXT,
  mcpClientModule_5,
  describeMcpServerStatus,
  saveGeneratedTitle,
  handleMcpStatus,
  handleGetContextUsage,
  handleGetUsage,
  handleGetSessionCost,
  handleListModels,
  handleGetBinaryVersion,
  handleReloadOutputStyles,
  clearUnknownServerOverride,
  handleMcpReconnect,
  handleMcpToggle,
  handleMcpReadResource,
  isValidPrefetchAttachmentsRequest,
  noop,
  isUnadoptedSdkServer,
  reconnectMcpServerByName,
  markServerDisabled,
  MAX_MCP_RESOURCE_JSON_CHARS,
};
