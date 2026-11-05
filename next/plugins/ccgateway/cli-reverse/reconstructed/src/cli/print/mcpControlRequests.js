/**
 * cli/print/mcpControlRequests.ts
 *
 * 2.1.316 新增：SDK 控制请求中 MCP 相关的处理（mcp_status、mcp_set_servers、mcp_reconnect、mcp_toggle、权限模式覆盖、mcp_read_resource）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vxsfen55.js (56)
 * attribution: placement 51, layout 5
 */
import { import_baseUniq, uniqByExport } from "../../../vendor/lodash-es/uniqBy.js";
import { identityEpoch } from "../../services/mcp/identityChange.js";
import { pendingReconnect } from "../../services/mcp/mcpReconnect.js";
import { isRemoteMcpTransport } from "../../services/mcp/discoveryIdentity.js";
import { getMcpPrefix, isToolFromMcpServer } from "../../services/mcp/mcpStringUtils.js";
import { OPERATOR_SUPPLIED_IGNORED_TEXT } from "../../services/mcp/mcpConfigProvenance.js";
import {
  BLOCKED_BY_POLICY_REASON,
  RESERVED_ADDRESS_REASON,
  ACCOUNT_CHANGED_REASON,
  NOT_APPROVED_REASON,
  DISABLED_BY_SETTING_REASON,
  DISABLED_IN_MCP_REASON,
  AUTH_CLEARED_REASON,
  AUTH_CLEAR_FAILED_REASON,
  CLOSED_WHILE_SIGNING_IN_REASON,
  TOKEN_REJECTED_REASON,
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
import { isPluginServerConfig } from "../../services/mcp/types.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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
import {
  redactsOrPersists,
  transportStateByHost,
  isBridgeOrTransport,
  mayTransportPersist,
} from "../transportState.js";
import { QueuedNotificationError } from "../../services/queuedNotifications/queuedNotifications.js";
import { logForDebugging } from "../../utils/debug.js";
import { isDiscoveryCacheUsable } from "../../services/mcp/mcpAccountKey.js";
import { flushDiscoveryCache } from "../../services/mcp/discoveryCache.js";
import { reject_default } from "../../../vendor/lodash-es/reject.js";
import { commandBelongsToServer, filterToolsByServer } from "../../services/mcp/utils.js";
import { omitKeys } from "../../utils/hooks/hookCommandResolution.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { MAX_LIVE_RESPONSE_BYTES, stripInitializeAgentPaths } from "../../bridge/controlRequests.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { getVersionReport } from "../earlyArgs.js";
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
import { logPrefetchOutcome, prefetchInboundAttachments } from "../../bridge/inboundAttachments.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { isSessionJwtAuth } from "../../services/projects/projectMemory.js";
import { env } from "../../utils/env.js";
import { forgetKeptProjectDetail } from "../../services/projects/projectContext.js";
import { invalidateUserContext } from "../../context.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-vxsfen55.js:3660-3747 placement
function mergeClientConfigsIfAny(configs, transform) {
  transform = typeof transform == "function" ? transform : undefined;
  return configs && configs.length ? import_baseUniq(configs, undefined, transform) : [];
}
//@ chunk-vxsfen55.js:3747-3757 placement
var mergeMcpClientConfigs = mergeClientConfigsIfAny;
//@ chunk-vxsfen55.js:3757-3795 placement
var requireVtyyqz9qChunk; // deferred: loads other modules while loading; runs once its import cycle is complete
deferInit("chunk-vxsfen55.js:3757", () => {
  requireVtyyqz9qChunk = require("../../services/mcp/CCR_ARTIFACTS_WITHHELD.lazy.js");
});
//@ chunk-vxsfen55.js:3795-3864 placement
function mcpClientModule_5() {
  return require("../../services/mcp/emitTripwireEvent.lazy.js").mcpClientModule();
}
//@ chunk-vxsfen55.js:3864-3960 placement
function describeMcpServerStatus(serverInfo) {
  return serverInfo.type === "failed"
    ? (serverInfo.error ?? "Connection failed")
    : `Server status: ${serverInfo.type}`;
}
//@ chunk-vxsfen55.js:3960-5451 placement
/**
 * 汇总 MCP 服务器状态供 mcp_status 返回。
 */
function buildMcpStatusList(status, controlState, clients) {
  let configuredByName = new Map(controlState.clients.map((client) => [client.name, client]));
  let liveByName = new Map((clients ?? []).map((liveClient) => [liveClient.name, liveClient]));
  let configuredNames = new Set(controlState.names);
  let currentEpoch = identityEpoch();
  let reconnectNames = new Set();
  let reconnectTools = new Map();
  let refreshedNames = new Set();
  let missingNames = new Set();
  let reconcileClient = (client, previousClient) => {
    let existingClient = liveByName.get(client.name);
    if (!existingClient) {
      missingNames.add(client.name);
      return;
    }
    if (
      existingClient !== previousClient &&
      existingClient.type !== "pending" &&
      mcpClientModule_5().areMcpConfigsEqual(existingClient.config, client.config)
    ) {
      refreshedNames.add(client.name);
      return existingClient;
    }
    return client;
  };
  let clients_2 = status.clients.flatMap((client) => {
    if (client.type !== "pending") return [client];
    let configuredClient = configuredByName.get(client.name);
    if (!configuredClient) {
      if (!configuredNames.has(client.name) || clients === undefined) return [client];
      return reconcileClient(client, undefined) ?? [];
    }
    if (!mcpClientModule_5().areMcpConfigsEqual(client.config, configuredClient.config)) return [client];
    if (clients !== undefined && liveByName.get(client.name) === configuredClient) {
      reconnectNames.add(client.name);
      let tools = pendingReconnect(configuredClient);
      if (tools !== undefined) reconnectTools.set(client.name, tools);
      return [configuredClient];
    }
    if (controlState.dialEpochs[client.name] !== currentEpoch && isRemoteMcpTransport(client.config))
      return clients === undefined ? [client] : (reconcileClient(client, configuredClient) ?? []);
    if (clients === undefined) {
      reconnectNames.add(client.name);
      return [configuredClient];
    }
    return reconcileClient(client, configuredClient) ?? [];
  });
  if (reconnectNames.size === 0 && refreshedNames.size === 0 && missingNames.size === 0) return status;
  let prefixPairs = [...reconnectNames].map((serverName) => [serverName, getMcpPrefix(serverName)]);
  let prefixPairs_2 = controlState.clients.map((client) => [client.name, getMcpPrefix(client.name)]);
  let isToolFromAny = (tool, prefixPairs) =>
    prefixPairs.some(([serverName, prefix]) => isToolFromMcpServer(tool, serverName, prefix));
  let prefixPairs_3 = [...missingNames].map((serverName) => [serverName, getMcpPrefix(serverName)]);
  let mapped = [...reconnectTools.keys()].map((key) => [key, getMcpPrefix(key)]);
  let serverNameForTool = (tool) =>
    mapped.find(([serverName, prefix]) => isToolFromMcpServer(tool, serverName, prefix))?.[0];
  let toolNamesByServer = new Map();
  for (let tool of controlState.tools) {
    let serverName = serverNameForTool(tool);
    if (serverName !== undefined)
      toolNamesByServer.set(serverName, (toolNamesByServer.get(serverName) ?? new Set()).add(tool.name));
  }
  let emittedServers = new Set();
  let flattened = controlState.tools.flatMap((tool) => {
    let serverName = serverNameForTool(tool);
    if (serverName !== undefined) {
      if (emittedServers.has(serverName)) return [];
      emittedServers.add(serverName);
      let toolNames = toolNamesByServer.get(serverName);
      return (reconnectTools.get(serverName) ?? []).filter((tool) => toolNames?.has(tool.name));
    }
    return isToolFromAny(tool, prefixPairs) ||
      (reconnectNames.size > 0 && !isToolFromAny(tool, prefixPairs_2))
      ? [tool]
      : [];
  });
  let flattened_2 = [...reconnectTools].flatMap(([serverName, tools]) =>
    tools.filter((tool) => !toolNamesByServer.get(serverName)?.has(tool.name)),
  );
  return {
    ...status,
    clients: clients_2,
    tools: uniqByExport(
      [...status.tools.filter((tool) => !isToolFromAny(tool, prefixPairs_3)), ...flattened, ...flattened_2],
      "name",
    ),
  };
}
//@ chunk-vxsfen55.js:5451-7693 placement
/**
 * 推送的 MCP 服务器被忽略/不接纳的原因文本。
 */
var BUILTIN_SERVER_IGNORED_REASON; // deferred: uses requireVtyyqz9qChunk of its import cycle while loading; runs once the cycle is complete
var IGNORED_BY_ENTERPRISE_POLICY_TEXT;
var IGNORED_HERMETIC_MODE_TEXT;
var IGNORED_EXCLUSIVE_MANAGED_CONFIG_TEXT;
var IGNORED_DISABLE_SIDELOAD_TEXT;
var IGNORED_REMOTE_CONTROL_TEXT;
var IGNORED_IDE_TRANSPORT_TEXT;
var NOT_ADMITTED_PROXY_SHAPE_TEXT;
var NOT_ADMITTED_RESERVED_NAME_TEXT;
var NOT_CONNECTED_LIMITS_TEXT;
var NOT_CONNECTED_NOT_TAKEN_TEXT;
var APPLIED_AT_NEXT_REDISPATCH_TEXT;
var NO_TOOL_POLICY_IN_SESSION_TEXT;
var TOGGLED_BY_SERVER_SET_TEXT;
var UNCONFIRMED_TOGGLE_TEXT;
var SAVED_FOR_NEXT_START_TEXT;
var NOT_DIALED_SUPERSEDED_TEXT;
var KNOWN_STATUS_TEXTS;
var KNOWN_RUNNER_SKIP_REASONS;
deferInit("chunk-vxsfen55.js:5451", () => {
  BUILTIN_SERVER_IGNORED_REASON = "Builtin server is CLI-owned; ignored";
  IGNORED_BY_ENTERPRISE_POLICY_TEXT = "Blocked by enterprise policy (allowedMcpServers/deniedMcpServers)";
  IGNORED_HERMETIC_MODE_TEXT = "Ignored in hermetic mode (not declared in user config)";
  IGNORED_EXCLUSIVE_MANAGED_CONFIG_TEXT =
    "Ignored: an enterprise MCP config (managed-mcp.json) is present and has exclusive control over MCP servers";
  IGNORED_DISABLE_SIDELOAD_TEXT =
    "Ignored: managed setting disableSideloadFlags forbids server-delivered MCP servers on this machine";
  IGNORED_REMOTE_CONTROL_TEXT =
    "Ignored in a Remote Control session: MCP servers are loaded only from the verified startup config on this machine";
  IGNORED_IDE_TRANSPORT_TEXT =
    "Ignored: IDE transports are registered by the CLI itself, not mcp_set_servers";
  NOT_ADMITTED_PROXY_SHAPE_TEXT =
    "Not admitted: a pushed server must be an http server on this session's MCP proxy route, with a URL of at most 4,096 characters (a non-ASCII character counts as its percent-encoded bytes)";
  NOT_ADMITTED_RESERVED_NAME_TEXT =
    "Not admitted: this name is reserved for a first-party server, and this entry cannot be added after session start";
  NOT_CONNECTED_LIMITS_TEXT =
    "Not connected: this worker could not take all of this server's per-tool limits; the next worker that the session moves to reads the entry again";
  NOT_CONNECTED_NOT_TAKEN_TEXT =
    "Not connected: this worker's start did not take this server, so the worker takes no push of it; the next worker that the session moves to reads the entry again";
  APPLIED_AT_NEXT_REDISPATCH_TEXT = "Change to a running server is applied at the next re-dispatch";
  NO_TOOL_POLICY_IN_SESSION_TEXT =
    "Not applied: this session applies no per-tool permission_policy to a client-hosted MCP server, so no always_ask or always_deny in this entry takes effect; the server is otherwise unchanged";
  TOGGLED_BY_SERVER_SET_TEXT =
    "Not applied: in this session, servers are turned on or off by changing the session's server set";
  UNCONFIRMED_TOGGLE_TEXT =
    "The session's tool container did not confirm the change, so the server may be on or off. Check its status before trying again";
  SAVED_FOR_NEXT_START_TEXT =
    "Saved. The server stays off for now and will be connected the next time this session starts after being idle. There is nothing more to do";
  NOT_DIALED_SUPERSEDED_TEXT = "not dialed: a newer server set replaced it";
  KNOWN_STATUS_TEXTS = new Set([
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
    NOT_APPROVED_REASON,
    DISABLED_BY_SETTING_REASON,
    DISABLED_IN_MCP_REASON,
    AUTH_CLEARED_REASON,
    AUTH_CLEAR_FAILED_REASON,
    CLOSED_WHILE_SIGNING_IN_REASON,
    NOT_DIALED_SUPERSEDED_TEXT,
    TOKEN_REJECTED_REASON,
    ...(requireVtyyqz9qChunk !== null
      ? [requireVtyyqz9qChunk.CCR_ARTIFACTS_WITHHELD, requireVtyyqz9qChunk.CCR_ARTIFACTS_WITHHELD_ON_A_RUNNER]
      : []),
  ]);
  KNOWN_RUNNER_SKIP_REASONS = new Set([
    "synced-file staging not supported on this runner kind",
    "CLAUDE_CODE_REMOTE_SESSION_ID unset",
    "list returned incomplete credential",
  ]);
});
//@ chunk-vxsfen55.js:7693-7990 placement
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
//@ chunk-vxsfen55.js:7990-8153 placement
function allowlistedStatusText(text) {
  if (text.match(/^Server status: ([a-z][a-z-]{0,31})$/) !== null) return text;
  if (text.match(/^Server not found: ([A-Za-z0-9 _.-]{1,64})$/) !== null) return text;
  return;
}
//@ chunk-vxsfen55.js:8153-8218 layout
function statusTextOrFallback(text, fallbackText = "Connection failed") {
  return KNOWN_STATUS_TEXTS.has(text) ? text : (allowlistedStatusText(text) ?? fallbackText);
}
//@ chunk-vxsfen55.js:8218-8289 placement
/**
 * mcp_set_servers 的 servers 参数必须为对象映射时的错误文本。
 */
var SERVERS_OBJECT_REQUIRED_TEXT = "mcp_set_servers: servers must be an object of config objects";
//@ chunk-vxsfen55.js:8289-8538 placement
/**
 * 生成可上报的 MCP 服务器状态表：需要脱敏时清洗服务器名（重名加 #n），状态文本只保留白名单内的形状，否则记为 "connection failed"。
 */
function sanitizeMcpStatusMap(shouldSanitize, errors) {
  let redactEnabled = shouldSanitize;
  let sanitized = Object.create(null);
  for (let [key, value] of Object.entries(errors)) {
    let sanitizedKey = redactEnabled ? sanitizeTelemetryString(key) : key;
    if (redactEnabled && Object.hasOwn(sanitized, sanitizedKey)) {
      let suffix = 2;
      while (Object.hasOwn(sanitized, `${sanitizedKey}#${suffix}`)) suffix++;
      sanitizedKey = `${sanitizedKey}#${suffix}`;
    }
    sanitized[sanitizedKey] =
      !shouldSanitize || (isPrototypeKey(key) && value === reservedServerNameMessage(key))
        ? value
        : statusTextOrFallback(value, "connection failed");
  }
  return sanitized;
}
//@ chunk-vxsfen55.js:8538-8669 placement
/**
 * 按范围筛选 MCP 服务器配置：严格配置模式返回空；configured 范围全部保留，否则只留内置市场来的服务器。
 */
function filterServersForScope(servers, { scope, strictMcpConfig }) {
  let result = emptyServerMap();
  if (strictMcpConfig) return result;
  for (let [key, value] of Object.entries(servers))
    if (isScopeAllowedForServer(scope, key, value)) result[key] = value;
  return result;
}
//@ chunk-vxsfen55.js:8669-8792 layout
function isScopeAllowedForServer(scope, serverName, command) {
  if (scope === "configured") return true;
  if (scope === "account_plugins") return isFromBuiltinMarketplace(command);
  return isPluginServerConfig(command) && import_sortedIndex_2(command, scope.copies.get(serverName));
}
//@ chunk-vxsfen55.js:8792-8884 placement
/**
 * 从服务器配置表里挑出非内置市场来源的服务器（未知上下文下会整体保留）。
 */
function nonBuiltinMarketplaceServers(configs, scope) {
  let result = emptyServerMap();
  for (let [key, value] of Object.entries(configs))
    if (!isScopeAllowedForServer(scope, key, value)) result[key] = value;
  return result;
}
//@ chunk-vxsfen55.js:24950-25022 placement
var teleportRelayEnvModule; // deferred: loads other modules while loading; runs once its import cycle is complete
var chromeSwitchNotesModule;
deferInit("chunk-vxsfen55.js:24950", () => {
  teleportRelayEnvModule = require("../../utils/teleport/relayEnv.js");
  chromeSwitchNotesModule = require("../../services/teleport/relayState.js");
});
//@ chunk-vxsfen55.js:25022-25092 placement
function mcpClientModule_7() {
  return require("../../services/mcp/emitTripwireEvent.lazy.js").mcpClientModule();
}
//@ chunk-vxsfen55.js:25092-26711 placement
/**
 * mcp_reconnect / mcp_toggle 的开关处理：解析 lane 上下文、处理待定手工交换，再按目标状态启用或禁用服务器并回复。
 */
var handleMcpReconnect = (request, context) => {
  let lanes = requireMcpControlLanes(context);
  lanes.resolveDeferredPluginStartup();
  let { serverName } = request;
  if (typeof serverName !== "string")
    throw new WireSafeControlError("mcp_reconnect: serverName must be a string");
  let exchange = lanes.pendingManualExchange(serverName);
  if (exchange) return awaitExchangeThenToggle(exchange, context, lanes, serverName);
  return toggleMcpServer(context, lanes, serverName);
};
var handleMcpToggle = (request, context) => {
  let lanes = requireMcpControlLanes(context);
  lanes.resolveDeferredPluginStartup();
  let engineState = context.engineState();
  let { serverName, enabled } = request;
  if (typeof serverName !== "string")
    throw new WireSafeControlError("mcp_toggle: serverName must be a string");
  if (typeof enabled !== "boolean") throw new WireSafeControlError("mcp_toggle: enabled must be a boolean");
  if (isClaudeInChromeMCPServer(serverName) && teleportRelayEnvModule?.getTeleportRelayEnvConfig())
    chromeSwitchNotesModule?.noteChromeSwitch(enabled);
  let existingClient =
    engineState.mcp.clients.find((client) => client.name === serverName) ??
    lanes.dynamicClients().find((client) => client.name === serverName);
  let isUnadoptedSdk = isUnadoptedSdkServer(lanes, engineState, serverName);
  let config = isUnadoptedSdk
    ? lanes.registeredSdkServer(serverName)
    : (lanes.ownerConfig(serverName) ??
      lanes.sdkClients().find((sdkClient) => sdkClient.name === serverName)?.config ??
      (enabled ? null : (existingClient?.config ?? null)));
  let blockCause = config ? mcpDialBlockCause(serverName, config) : null;
  if (!config) {
    if (enabled && isClaudeInChromeMCPServer(serverName))
      setServerEnabledEverywhere(context, lanes, serverName, true);
    throw new WireSafeControlError(`Server not found: ${sanitizeTelemetryString(serverName)}`);
  }
  if (!enabled)
    return isUnadoptedSdk
      ? disableSdkServerControl(context, lanes, serverName, config)
      : reconnectDisabledServer(context, lanes, serverName, config, engineState);
  if (blockCause)
    throw new WireSafeControlError(
      blockCause === "managed-policy"
        ? mcpRefusalText(
            serverName,
            blockCause,
            config,
            `MCP server ${sanitizeTelemetryString(serverName)} is blocked by enterprise managed policy`,
          )
        : notApprovedText(serverName, "enabling"),
    );
  let filtered = [...engineState.mcp.clients, ...lanes.dynamicClients(), ...lanes.sdkClients()].filter(
    (client) => client.name === serverName,
  );
  let alreadyConnected =
    config.type !== "sdk" &&
    !isMcpServerDisabled(serverName) &&
    lanes.pendingManualExchange(serverName) === undefined &&
    !lanes.postOAuthReconnectPending.has(serverName) &&
    filtered.length > 0 &&
    filtered.every(
      (client) =>
        client.type === "connected" &&
        !isClientWithoutTransport(client) &&
        (client.transportErrorState?.consecutiveErrors ?? 0) === 0 &&
        client.toolsListError === undefined &&
        !client.discoveryBearerRejected &&
        !client.discoveryAuthFailure &&
        !client.capabilities?.prompts &&
        !client.capabilities?.resources &&
        mcpClientModule_7().areMcpConfigsEqual(client.config, config),
    );
  setServerEnabledEverywhere(context, lanes, serverName, true);
  if (isUnadoptedSdk) return enableSdkServerControl(context, lanes, serverName, config);
  if (alreadyConnected) {
    logForDiagnosticsNoPII("info", "cli_mcp_toggle_unchanged");
    return;
  }
  return reconnectServerForControl(context, lanes, serverName, config, false);
};
//@ chunk-vxsfen55.js:26711-26882 placement
/**
 * 判断 SDK 注册的 MCP 服务器是否尚未被接管：不是 Chrome 服务器、有 SDK 注册、无归属配置，且不在当前客户端或动态客户端中。
 */
function isUnadoptedSdkServer(lanes, engineState, serverName) {
  return (
    !isClaudeInChromeMCPServer(serverName) &&
    lanes.registeredSdkServer(serverName) !== null &&
    lanes.ownerConfig(serverName) === null &&
    !engineState.mcp.clients.some((client) => client.name === serverName) &&
    !lanes.dynamicClients().some((client) => client.name === serverName)
  );
}
//@ chunk-vxsfen55.js:26882-26967 placement
function requireMcpControlLanes(context) {
  if (context.mcpControlLanes === null) throw new WireSafeControlError(UNSUPPORTED_CONTROL_SUBTYPE_TEXT);
  return context.mcpControlLanes;
}
//@ chunk-vxsfen55.js:26967-27028 placement
function setServerEnabledEverywhere(context, lanes, serverName, enabled) {
  setMcpServerEnabled(serverName, enabled, context.storageV5);
  lanes.switchSaved(serverName, enabled);
}
//@ chunk-vxsfen55.js:27028-27094 placement
async function awaitExchangeThenToggle(exchange, context, lanes, serverName) {
  await exchange.catch(() => {});
  return toggleMcpServer(context, lanes, serverName);
}
//@ chunk-vxsfen55.js:27094-27662 placement
function toggleMcpServer(context, lanes, serverName) {
  let engineState = context.engineState();
  let config =
    lanes.ownerConfig(serverName) ??
    lanes.sdkClients().find((client) => client.name === serverName)?.config ??
    null;
  let blockCause = config ? mcpDialBlockCause(serverName, config) : null;
  if (!config) throw new WireSafeControlError(`Server not found: ${sanitizeTelemetryString(serverName)}`);
  if (blockCause === "managed-policy")
    throw new WireSafeControlError(
      mcpRefusalText(
        serverName,
        blockCause,
        config,
        `MCP server ${sanitizeTelemetryString(serverName)} is blocked by enterprise managed policy`,
      ),
    );
  if (isMcpServerDisabled(serverName))
    throw new WireSafeControlError(disabledEnableBeforeText(serverName, "reconnecting"));
  if (blockCause) throw new WireSafeControlError(notApprovedText(serverName, "reconnecting"));
  let existing =
    engineState.mcp.clients.find((client) => client.name === serverName) ??
    lanes.dynamicClients().find((client) => client.name === serverName);
  let distrust =
    !takeRecentWithin(lanes.postOAuthReconnectPending, serverName) &&
    existing !== undefined &&
    existing.type !== "cached" &&
    existing.type !== "pending";
  return reconnectServerForControl(context, lanes, serverName, config, distrust);
}
//@ chunk-vxsfen55.js:27662-27862 placement
async function reconnectServerForControl(context, lanes, serverName, config, distrust) {
  lanes.seedControlDialSlot(serverName, config);
  let result = await lanes.reconnectForControlRequest(serverName, config, {
    distrust,
  });
  let sameConfig = import_sortedIndex_2(lanes.ownerConfig(serverName), config);
  replyThenThrowOnError(
    context,
    reconnectMcpServer(
      redactsOrPersists(context),
      lanes.landControlResult(
        serverName,
        sameConfig
          ? {
              ...result,
              asked: true,
            }
          : result,
      ),
    ),
  );
}
//@ chunk-vxsfen55.js:27862-27959 placement
function replyThenThrowOnError(context, reply) {
  if (context.replyNow !== null) context.replyNow(reply);
  if (reply.subtype === "error") throw new QueuedNotificationError(reply.error);
}
//@ chunk-vxsfen55.js:27959-28258 placement
function reconnectMcpServer(isLive, client) {
  if (client.type === "connected")
    return {
      subtype: "success",
    };
  if (client.type === "failed") {
    if (isLive)
      logForDebugging(
        `mcp reconnect/toggle failed for ${sanitizeTelemetryString(client.name)}: ${client.error ?? "(no detail)"}`,
        {
          level: "error",
        },
      );
    let error = client.error ?? "Connection failed";
    return {
      subtype: "error",
      error: isLive ? statusTextOrFallback(error) : error,
    };
  }
  return {
    subtype: "error",
    error: describeMcpServerStatus(client),
  };
}
//@ chunk-vxsfen55.js:28258-28316 placement
function reconnectDisabledServer(context, lanes, serverName, config, engineState) {
  setServerEnabledEverywhere(context, lanes, serverName, false);
  return reconnectMcpServerByName(context, lanes, serverName, config, engineState);
}
//@ chunk-vxsfen55.js:28316-28705 placement
/**
 * 处理 mcp_reconnect：找到同名的启动/SDK/动态/已连接客户端，清除已连接实例（按配置去重）的服务器缓存，再重连并回复。
 */
function reconnectMcpServerByName(context, lanes, serverName, config, engineState, shouldFinish) {
  let filtered = [
    ...lanes.startupClients(),
    ...lanes.sdkClients(),
    ...lanes.dynamicClients(),
    ...engineState.mcp.clients,
  ].filter((client) => client.name === serverName);
  let filtered_2 = filtered.filter((client) => client.type === "connected");
  if (filtered_2.length > 0) {
    let mcpModule = mcpClientModule_7();
    return mergeMcpClientConfigs(
      [config, ...filtered_2.map((client) => client.config)],
      mcpModule.areMcpConfigsEqual,
    )
      .reduce(
        (acc, config) => acc.then(() => mcpModule.clearServerCache(serverName, config)),
        Promise.resolve(),
      )
      .then(() => finishMcpReconnect(context, lanes, serverName, config, filtered_2.at(-1), shouldFinish));
  }
  return finishMcpReconnect(context, lanes, serverName, config, filtered[0], shouldFinish);
}
//@ chunk-vxsfen55.js:28705-28810 placement
async function disableSdkServerControl(context, lanes, serverName, config) {
  setServerEnabledEverywhere(context, lanes, serverName, false);
  await lanes.disableSdkServer(serverName);
  markServerDisabled(context, lanes, serverName);
  replyThenThrowOnError(context, {
    subtype: "success",
  });
}
//@ chunk-vxsfen55.js:28810-28957 placement
async function enableSdkServerControl(context, lanes, serverName, config) {
  let result = await lanes.enableSdkServer(serverName);
  replyThenThrowOnError(
    context,
    reconnectMcpServer(
      redactsOrPersists(context),
      result ?? {
        name: serverName,
        type: "failed",
        config,
        error: `Server not found: ${sanitizeTelemetryString(serverName)}`,
      },
    ),
  );
}
//@ chunk-vxsfen55.js:28957-29294 placement
/**
 * MCP 重连控制请求的收尾：仍有效时找到该服务器的当前客户端；若是缓存/新连接则先刷新其工具再回复成功，否则直接清理并回复成功。
 */
function finishMcpReconnect(context, lanes, serverName, config, client, shouldFinish = () => true) {
  if (!shouldFinish()) return;
  let current =
    context.engineState().mcp.clients.find((client) => client.name === serverName) ??
    lanes.dynamicClients().find((client) => client.name === serverName) ??
    client;
  if (
    current?.type === "cached" ||
    (current?.type === "connected" && current !== client) ||
    isDiscoveryCacheUsable()
  )
    return dropServerCaches(serverName, current?.config ?? config, current, client).then(() => {
      if (!shouldFinish()) return;
      markServerDisabled(context, lanes, serverName);
      replyThenThrowOnError(context, {
        subtype: "success",
      });
    });
  markServerDisabled(context, lanes, serverName);
  replyThenThrowOnError(context, {
    subtype: "success",
  });
}
//@ chunk-vxsfen55.js:29294-29525 placement
async function dropServerCaches(serverName, config, client, fallbackClient) {
  if (client?.type === "cached")
    mcpClientModule_7().disposeServerConnectionDetached(serverName, client.config);
  else if (client?.type === "connected" && client !== fallbackClient)
    await mcpClientModule_7().clearServerCache(serverName, client.config);
  if (!isDiscoveryCacheUsable()) return;
  await flushDiscoveryCache(mcpClientModule_7().dropDiscoveryEntry(serverName, config));
}
//@ chunk-vxsfen55.js:29525-29879 placement
/**
 * 把 MCP 服务器在引擎状态中标为 disabled：客户端条目改为 disabled，并移除其工具、命令、资源与资源模板。
 */
function markServerDisabled(context, lanes, serverName) {
  lanes.markDynamicServerDisabled(serverName);
  let mcpPrefix = getMcpPrefix(serverName);
  context.setEngineState((state) => ({
    ...state,
    mcp: {
      ...state.mcp,
      clients: state.mcp.clients.map((client) =>
        client.name === serverName
          ? {
              name: serverName,
              type: "disabled",
              config: client.config,
            }
          : client,
      ),
      tools: reject_default(state.mcp.tools, (tool) => isToolFromMcpServer(tool, serverName, mcpPrefix)),
      commands: reject_default(state.mcp.commands, (command) => commandBelongsToServer(command, serverName)),
      resources: omitKeys(state.mcp.resources, serverName),
      resourceTemplates: omitKeys(state.mcp.resourceTemplates, serverName),
    },
  }));
}
//@ chunk-vxsfen55.js:29879-30000 placement
var handleMcpStatus = (request, context) => {
  let servers = describeMcpServersForStatus(context);
  return {
    mcpServers:
      request.liveReply === true && transportStateByHost.of(context.session).transportPersists === true
        ? trimServerDetailForSize(servers)
        : servers,
  };
};
var LIVE_RESPONSE_OVERHEAD_BYTES = 256;
//@ chunk-vxsfen55.js:30000-30155 layout
function trimServerDetailForSize(servers) {
  if (Buffer.byteLength(jsonStringify(servers)) <= MAX_LIVE_RESPONSE_BYTES - LIVE_RESPONSE_OVERHEAD_BYTES)
    return servers;
  return servers.map(({ tools, serverInfo, capabilities, ...rest }) => ({
    ...rest,
    ...(tools && {
      toolCount: tools.length,
    }),
  }));
}
//@ chunk-vxsfen55.js:30155-30680 layout
function describeMcpServersForStatus(context) {
  let servers = describeMcpServerForStatus(context.mcpConnections());
  if (!redactsOrPersists(context)) return servers;
  if (context.redactsPersistedLane())
    return servers.map(({ name, status }) => ({
      name,
      status,
    }));
  return servers.map((server) => ({
    name: server.name,
    status: server.status,
    serverInfo: server.serverInfo,
    error: server.error === undefined ? undefined : statusTextOrFallback(server.error),
    error_code: server.error_code,
    config: undefined,
    transport: server.transport,
    sessionProxied: server.sessionProxied,
    cloudServiceProvided: server.cloudServiceProvided,
    urlHost: isRemoteManagedEnvironment() ? server.urlHost : undefined,
    scope: server.scope,
    source: server.source,
    tools: server.tools,
    toolCount: server.toolCount,
    capabilities: server.capabilities,
  }));
}
//@ chunk-vxsfen55.js:30680-30961 placement
var handleGetBinaryVersion = () => getVersionReport();
var handleGetContextUsage = async (request, context) => {
  if (request.detail != null && request.detail !== "summary" && request.detail !== "full")
    throw new WireSafeControlError("get_context_usage: detail must be 'summary' or 'full'");
  let payload = await collectContextUsage(context, request.detail, mayIncludeAgentPaths(context));
  return {
    ...payload,
    memoryFiles: context.redactsPersistedLane() ? [] : payload.memoryFiles,
    ...(!mayIncludeAgentPaths(context) && stripInitializeAgentPaths(payload)),
  };
};
//@ chunk-vxsfen55.js:30961-31246 placement
function collectContextUsage(context, detail, localPaths) {
  let { messages, mainLoopModel = getMainLoopModel(), ...rest } = context.contextUsageInputs();
  return collectContextData({
    session: context.session,
    messages,
    getAppState: context.engineState,
    getMcp: () => context.engineState().mcp,
    storageV5: context.storageV5,
    credentials: context.credentials,
    options: {
      mainLoopModel,
      ...rest,
    },
    detail,
    localPaths,
  });
}
//@ chunk-vxsfen55.js:31246-31936 placement
/**
 * 控制请求的三个小处理器：get_session_cost 返回总费用文本、reload_output_styles 清缓存并返回可用样式名、get_usage 校验 skip_behaviors 参数后返回用量。
 */
var handleListModels = () => ({
  models: toSdkModelInfos(buildModelPickerOptions()),
});
var handleGetSessionCost = () => ({
  text: stripAnsi(formatTotalCost()),
});
var handleReloadOutputStyles = async (request, context) => {
  clearOutputStyleCaches();
  clearOutputStylesCache();
  let allOutputStyles = await getAllOutputStylesCached(getCwdOrNull(), context.storageV5);
  return {
    available_output_styles: Object.keys(allOutputStyles),
  };
};
var handleGetUsage = async (request, context) => {
  if (request.skip_behaviors != null && typeof request.skip_behaviors !== "boolean")
    throw new WireSafeControlError("get_usage: skip_behaviors must be a boolean");
  let usage = await projectModelScopedUsage({
    storageV5: context.storageV5,
    credentials: context.credentials,
    live: effortBelowMaxSaved(
      getMainLoopModel(),
      resolveEffortLevel(context.engineState()),
      context.engineState().ultracode,
    ),
    includeBehaviors: !context.redactsPersistedLane() && request.skip_behaviors !== true,
  });
  let includeAgentPaths = mayIncludeAgentPaths(context);
  if (!usage.behaviors || (includeAgentPaths && !isBridgeOrTransport(context.session))) return usage;
  let redactions = {
    fix: undefined,
    ...(!includeAgentPaths && {
      recommendations: undefined,
    }),
  };
  let { day, week } = usage.behaviors;
  return {
    ...usage,
    behaviors: {
      day: {
        ...day,
        ...redactions,
      },
      week: {
        ...week,
        ...redactions,
      },
    },
  };
};
//@ chunk-vxsfen55.js:31936-33558 placement
function describeMcpServerForStatus({ connections, tools }) {
  let allTools = uniqByExport(tools, "name");
  return connections
    .filter((connection) => !isArtifacts404Failure(connection))
    .map((connection) => {
      let isSessionProxied =
        isCcrInjectedMcpUrl(connection.name, connection.config) || isClaudeAiProxyServer(connection.config);
      let source = mcpServerSource(connection.name, connection.config);
      let configOut;
      let urlHost;
      let cloudServiceProvided = false;
      if (connection.config.type === "sse" || connection.config.type === "http") {
        let url = URL.parse(connection.config.url);
        cloudServiceProvided =
          isSessionProxied && source === "dynamic" && url !== null && ccrPathPrefixIndex(url);
        configOut = redactManagedMcpServerConfig(
          {
            type: connection.config.type,
            url: connection.config.url,
            headers: connection.config.headers,
            oauth: connection.config.oauth,
          },
          connection.config.scope,
        );
        if (!isSessionProxied && MCP_SETTINGS_SCOPE_SET.has(connection.config.scope)) {
          let origin = describeMcpServerOrigin(connection.name, connection.config, {
            detail: "origin",
          });
          try {
            urlHost =
              origin === undefined || origin.includes("${") ? undefined : new URL(origin).host || undefined;
          } catch {
            urlHost = undefined;
          }
        }
      } else if (connection.config.type === "claudeai-proxy")
        configOut = {
          type: "claudeai-proxy",
          url: connection.config.url,
          id: connection.config.id,
        };
      else if (connection.config.type === "stdio" || connection.config.type === undefined)
        configOut = {
          type: "stdio",
          command: connection.config.command,
          args: connection.config.args,
        };
      let tools = isConnectedOrCached(connection)
        ? filterToolsByServer(allTools, connection.name).map((tool) => ({
            name: tool.mcpInfo?.toolName ?? tool.name,
            annotations: {
              readOnly: tool.isReadOnly({}) || undefined,
              destructive: tool.isDestructive?.({}) || undefined,
              openWorld: tool.isOpenWorld?.({}) || undefined,
            },
            ...(tool.mcpInfo?.uiMeta && {
              _meta: tool.mcpInfo.uiMeta,
            }),
          }))
        : undefined;
      let capabilities;
      if (isConnectedOrCached(connection) && connection.capabilities.experimental) {
        let experimental = {
          ...connection.capabilities.experimental,
        };
        if (
          "claude/channel" in experimental &&
          (!hasExperimentalCapability(connection.capabilities, "claude/channel") ||
            !isChannelsEnabled() ||
            !isChannelAllowlisted(connection.config.pluginSource) ||
            (connection.type === "connected" && connection.protocolEra === "modern"))
        )
          delete experimental["claude/channel"];
        if (Object.keys(experimental).length > 0)
          capabilities = {
            experimental,
          };
      }
      return {
        name: connection.name,
        status: clientStatusForSnapshot(connection.type),
        serverInfo: isConnectedOrCached(connection) ? connection.serverInfo : undefined,
        error: connection.type === "failed" ? connection.error : undefined,
        error_code: mcpAuthErrorCode(connection),
        config: configOut,
        transport: connection.config.type ?? "stdio",
        ...(isSessionProxied
          ? {
              sessionProxied: isSessionProxied,
              ...(cloudServiceProvided && {
                cloudServiceProvided,
              }),
            }
          : urlHost && {
              urlHost,
            }),
        scope: connection.config.scope,
        source,
        tools,
        capabilities,
      };
    });
}
//@ chunk-vxsfen55.js:33558-33622 placement
function mayIncludeAgentPaths(context) {
  return !context.redactsPersistedLane() && !mayTransportPersist(context.session);
}
//@ chunk-vxsfen55.js:33622-34289 placement
function handleSetMcpPermissionModeOverride(request) {
  let { serverName, mode } = request;
  if (typeof serverName !== "string")
    throw new WireSafeControlError("set_mcp_permission_mode_override: serverName must be a string");
  let parsedMode = mode === null ? null : parsePermissionMode(mode);
  if (parsedMode === undefined) throw new WireSafeControlError(UNRECOGNIZED_PERMISSION_MODE_ERROR);
  let mcpModeOverride = parseMcpModeOverride(parsedMode);
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
//@ chunk-vxsfen55.js:34289-34451 placement
var ASK_FOR_TOOLS_INVALID_MESSAGE; // deferred: uses UNRECOGNIZED_PERMISSION_MODE_ERROR (../../types/permissions.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-vxsfen55.js:34289", () => {
  ASK_FOR_TOOLS_INVALID_MESSAGE = `set_mcp_permission_mode_override: askForTools must be a list of at most ${MCP_ASK_FOR_TOOLS_MAX} {name} entries, each name 1 to 64 letters, digits, underscores or hyphens`;
});
//@ chunk-vxsfen55.js:34451-34823 placement
/**
 * 校验 set_mcp_permission_mode_override 的 askForTools：至多上限个 {name}、名字合法，去掉服务器前缀后去重返回，空则 undefined；不合法抛 WireSafeControlError。
 */
function parseAskForTools(request, serverName) {
  let askForTools = request.askForTools;
  if (askForTools === undefined || askForTools === null) return;
  if (!Array.isArray(askForTools) || askForTools.length > MCP_ASK_FOR_TOOLS_MAX)
    throw new WireSafeControlError(ASK_FOR_TOOLS_INVALID_MESSAGE);
  let mcpPrefix = getMcpPrefix(serverName);
  let names = new Set();
  for (let askForTool of askForTools) {
    let name =
      typeof askForTool === "object" && askForTool !== null && !Array.isArray(askForTool)
        ? askForTool.name
        : undefined;
    if (typeof name !== "string" || !MCP_ASK_FOR_TOOLS_NAME.test(name))
      throw new WireSafeControlError(ASK_FOR_TOOLS_INVALID_MESSAGE);
    let shortName = name.startsWith(mcpPrefix) ? name.slice(mcpPrefix.length) : name;
    if (shortName !== "") names.add(shortName);
  }
  return names.size > 0 ? [...names] : undefined;
}
//@ chunk-vxsfen55.js:34823-35618 placement
var clearUnknownServerOverride = (request, context) => {
  let { serverName, override } = handleSetMcpPermissionModeOverride(request);
  let askForTools = parseAskForTools(request, serverName);
  let nextAskForTools = override === "default" ? askForTools : undefined;
  let hadOverride = false;
  context.setEngineState((state) => {
    let mcpPermissionModeOverrides = state.toolPermissionContext.mcpPermissionModeOverrides;
    let mcpAskForTools = state.toolPermissionContext.mcpAskForTools ?? {};
    hadOverride = Object.hasOwn(mcpPermissionModeOverrides, serverName);
    if (
      (hadOverride ? mcpPermissionModeOverrides[serverName] === override : override === undefined) &&
      import_sortedIndex_2(getOwn(mcpAskForTools, serverName), nextAskForTools)
    )
      return state;
    let mcpAskForTools_2 =
      nextAskForTools === undefined
        ? omitKeys(mcpAskForTools, serverName)
        : {
            ...mcpAskForTools,
            [serverName]: nextAskForTools,
          };
    return {
      ...state,
      toolPermissionContext: {
        ...state.toolPermissionContext,
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
  if (context.isKnownMcpServer(serverName)) return;
  return {
    warning:
      override === undefined
        ? hadOverride
          ? `MCP server '${sanitizeTelemetryString(serverName)}' is not known; its stored override was cleared.`
          : `MCP server '${sanitizeTelemetryString(serverName)}' is not known; no override was present to clear.`
        : `MCP server '${sanitizeTelemetryString(serverName)}' is not yet known; override stored but will not apply until a server with that exact name connects.`,
  };
};
//@ chunk-vxsfen55.js:35618-35646 placement
/**
 * mcp_read_resource 结果 JSON 的长度上限 10MB，超过即拒绝。
 */
var MAX_MCP_RESOURCE_JSON_CHARS = 10485760;
var UI = "ui://";
//@ chunk-vxsfen55.js:35646-35698 placement
function mcpModulesChunk_3() {
  return require("../../services/mcp/emitTripwireEvent.lazy.js");
}
//@ chunk-vxsfen55.js:35698-35756 placement
function refuseMcpReadResource(reason, message) {
  logFeatureBad("mcp_read_resource", reason);
  throw new WireSafeControlError(message);
}
//@ chunk-vxsfen55.js:35756-38096 placement
var handleMcpReadResource = async (request, context) => {
  if (context.redactsPersistedLane())
    refuseMcpReadResource("redacting_lane", "mcp_read_resource is not available on this connection");
  let { serverName, uri } = request;
  if (typeof serverName !== "string")
    refuseMcpReadResource("bad_request", "mcp_read_resource: serverName must be a string");
  if (typeof uri !== "string")
    refuseMcpReadResource("bad_request", "mcp_read_resource: uri must be a string");
  if (!uri.startsWith(UI))
    refuseMcpReadResource("not_ui_uri", "mcp_read_resource: uri must use the ui:// scheme");
  let found = context.mcpConnections().connections.find((connection) => connection.name === serverName);
  if (!found) {
    if (context.isKnownMcpServer(serverName))
      refuseMcpReadResource(
        "not_connected",
        `MCP server ${sanitizeTelemetryString(serverName)} is not connected`,
      );
    refuseMcpReadResource("server_not_found", `Server not found: ${sanitizeTelemetryString(serverName)}`);
  }
  let blockCause = mcpDialBlockCause(found.name, found.config);
  if (blockCause === "managed-policy")
    refuseMcpReadResource(
      judgeGate(serverName, found.config) ? "reserved_address" : "policy_blocked",
      mcpRefusalText(
        serverName,
        blockCause,
        found.config,
        `MCP server ${sanitizeTelemetryString(serverName)} is blocked by enterprise managed policy`,
      ),
    );
  if (found.type === "disabled" || isMcpServerDisabled(found.name))
    refuseMcpReadResource("disabled", disabledEnableBeforeText(serverName, "reading"));
  if (blockCause) refuseMcpReadResource("approval_required", notApprovedText(serverName, "reading"));
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
  let hostedRefusal = hostedDesktopRefusal_2(found);
  if (hostedRefusal) refuseMcpReadResource("hosted_desktop", hostedRefusal.message);
  let fields = {
    transport: fromEnum(found.config.type ?? "stdio"),
    row_type: fromEnum(found.type),
  };
  let now = Date.now();
  let phase = lit("connect");
  let resource;
  try {
    let client = await mcpModulesChunk_3().mcpClientModule().ensureConnectedClient(found, {
      context: "mcp_read_resource",
    });
    phase = lit("read");
    resource = await readMcpResource(client, uri, {
      timeout: getConnectionTimeoutMs(),
    });
  } catch (error) {
    let modules = mcpModulesChunk_3();
    let mcpErrorCode = modules.mcpSdkErrorClassificationModule().getMcpErrorCode(error);
    let errnoCode = getErrnoCode(error);
    logFeatureBad("mcp_read_resource", "read_failed", {
      ...fields,
      elapsed_ms: Date.now() - now,
      phase,
      error_source: fromEnum(classifyMcpErrorSourceCategory(error)),
      ...(mcpErrorCode !== undefined && {
        rpc_code: mcpErrorCode,
      }),
      ...(errnoCode !== undefined && {
        local_code: modules.mcpClientModule().sanitizeConnectErrorCodeForTelemetry(errnoCode),
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
    throw new QueuedNotificationError(
      redactsOrPersists(context)
        ? "mcp_read_resource: could not read the resource"
        : sanitizeTelemetryString(`mcp_read_resource: ${errorMessage(error)}`),
    );
  }
  let mapped = resource.contents.map((content) => ({
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
    ...fields,
    elapsed_ms: Date.now() - now,
  });
  return {
    contents: mapped,
  };
};
//@ chunk-vxsfen55.js:38096-38110 placement
var noop = () => {};
//@ chunk-vxsfen55.js:38110-38964 placement
/**
 * prefetch_attachments 请求的形状错误文案，以及对应的合法性校验函数。
 */
var PREFETCH_MAX_FILES = 16;
var PREFETCH_FILES_SHAPE_ERROR =
  "prefetch_attachments: files must be a list of at most 16 { file_uuid: UUID, file_size?: number }, issued_at a number (epoch milliseconds), and only_these, if present, a boolean";
var isValidPrefetchAttachmentsRequest = (request, context) => {
  let { files, issued_at: issuedAt, only_these: onlyThese } = request;
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
  let normalizedFiles = [];
  for (let file of files) {
    let fileUuid = normalizeUuidOrNull(isPlainObjectOrArrayCheck(file) ? file.file_uuid : undefined);
    let fileSize = isPlainObjectOrArrayCheck(file) ? file.file_size : undefined;
    if (fileUuid === null || (fileSize !== undefined && typeof fileSize !== "number")) {
      logFeatureSad("bridge_attachment_prefetch", "invalid_request");
      logPrefetchOutcome("bridge_attachment_prefetch_invalid_request", {});
      throw new QueuedNotificationError(PREFETCH_FILES_SHAPE_ERROR);
    }
    normalizedFiles.push(
      fileSize === undefined
        ? {
            file_uuid: fileUuid,
          }
        : {
            file_uuid: fileUuid,
            file_size: fileSize,
          },
    );
  }
  return {
    accepted: prefetchInboundAttachments(normalizedFiles, {
      issuedAt,
      credentials: context.credentials,
      onlyThese: onlyThese === true,
    }),
  };
};
//@ chunk-vxsfen55.js:38964-39035 placement
function isPlainObjectOrArrayCheck(file) {
  return typeof file === "object" && file !== null && !Array.isArray(file);
}
//@ chunk-vxsfen55.js:39035-39481 layout
var handleSetAttachedProject = (request, { session }) => {
  let projectUuid = request.project_uuid;
  let normalizedProjectUuid = normalizeUuidOrNull(projectUuid);
  if (projectUuid !== null && normalizedProjectUuid === null)
    throw new WireSafeControlError("set_attached_project: project_uuid must be a UUID or null");
  if (!isSessionJwtAuth())
    throw new WireSafeControlError(
      "set_attached_project: this session does not read its Project through the service that hosts it",
    );
  if (normalizedProjectUuid === null) {
    if (env.CLAUDE_PROJECT_UUID === undefined) return;
    env.unset("CLAUDE_PROJECT_UUID");
  } else env.set("CLAUDE_PROJECT_UUID", normalizedProjectUuid);
  forgetKeptProjectDetail();
  invalidateUserContext(session, normalizedProjectUuid === null ? "project_left" : "project_changed");
};
//@ chunk-vxsfen55.js:39481-39566 placement
/**
 * 创建一次写尝试状态 {latched, attempted, pending, fallback, owed}（MCP 控制请求的写重试用）。
 */
function initialWriteAttempt(latched) {
  return {
    latched,
    attempted: latched,
    pending: undefined,
    fallback: undefined,
    owed: false,
  };
}
//@ chunk-vxsfen55.js:39566-39610 placement
/**
 * 把写尝试状态锁存到给定值（latched 与 attempted 同时更新）。
 */
function latchWriteAttempt(state, attempted) {
  state.latched = attempted;
  state.attempted = attempted;
}
//@ chunk-vxsfen55.js:39610-40539 placement
function saveGeneratedTitle(text, host, promptUuid) {
  let { titles } = host;
  let sessionId = getSessionId();
  if (titles.pending?.sessionId === sessionId) return titles.pending.title;
  let materialized = getMaterializedSessionFile() !== null;
  let call = {
    settled: false,
    retracted: false,
  };
  let titlePromise = requestSessionTitle(text, new AbortController().signal, host.credentials)
    .then((response) => {
      call.settled = true;
      if (call.retracted) return null;
      let outcome = response;
      if (response.kind === "titled") {
        let title = sanitizeSessionTitle(response.title);
        outcome = title
          ? {
              kind: "titled",
              title,
            }
          : {
              kind: "unusable",
            };
      }
      if (titles.fallback?.sessionId === sessionId) {
        let fallback = nextTitleFallback(titles.fallback.fallback, outcome);
        titles.fallback = fallback
          ? {
              sessionId,
              fallback,
            }
          : undefined;
      }
      if (outcome.kind !== "titled") {
        titles.attempted = titles.latched;
        return null;
      }
      titles.attempted = true;
      let { title } = outcome;
      let saveLocal = () => {
        try {
          saveAiGeneratedTitle(sessionId, title, host.storageV5);
        } catch (error) {
          if (isFsInaccessible(error)) logForDebugging(`saveAiGeneratedTitle failed: ${error}`);
          else logTitleChangeError(host, error);
        }
      };
      if (sessionId !== getSessionId()) {
        if (materialized) saveLocal();
        return title;
      }
      if (!getCurrentSessionDisplayTitle(sessionId)) {
        if (getMaterializedSessionFile()) saveLocal();
        else cacheAiTitle(title);
        getSdkHostedBridgeHandle()?.adoptLocalAiTitle?.();
        syncTitleToRemoteSession(title);
      }
      return title;
    })
    .catch((error) => {
      call.settled = true;
      titles.attempted = titles.latched;
      logTitleChangeError(host, error);
      return null;
    });
  let pending = {
    sessionId,
    title: titlePromise,
    promptUuid,
    call,
  };
  titles.pending = pending;
  titlePromise.then((title) => {
    if (title === null && titles.pending === pending) titles.pending = undefined;
  });
  return titlePromise;
}
export {
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
  nonBuiltinMarketplaceServers,
  initialWriteAttempt,
  filterServersForScope,
  latchWriteAttempt,
  sanitizeMcpResourceError,
  SERVERS_OBJECT_REQUIRED_TEXT,
  sanitizeMcpStatusMap,
  describeMcpServersForStatus,
  reconnectMcpServerByName,
  markServerDisabled,
  MAX_MCP_RESOURCE_JSON_CHARS,
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
  handleSetAttachedProject,
  isUnadoptedSdkServer,
};
