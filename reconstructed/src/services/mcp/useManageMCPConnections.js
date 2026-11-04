/**
 * services/mcp/useManageMCPConnections.ts
 *
 * 并入旧版已有路径：管理 MCP 连接 hook。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/useManageMCPConnections.ts
 * pieces: chunk-18hwfzwa.js (14), chunk-7nse75qx.js (1)
 * attribution: placement 7, layout 5, fingerprint 3
 */
import {
  init_react_production,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "../../../vendor/react/cjs/react.production.js";
import { getCliOwnedState, isCliOwnedConfig } from "./cliOwnedClients.js";
import {
  isRetryableRemoteFailure,
  BEARER_REJECT_CODES,
  refetchReasonTelemetry,
  commandBelongsToServer,
} from "./utils.js";
import { isLoopbackHost } from "../../utils/localhost.js";
import {
  usesNonOAuthAuth,
  hasMcpDiscoveryButNoToken,
  hasExternalAuthForConfig,
  isDesignMcpUrl,
  describeConnectError,
  describeErrorBrief,
} from "./auth.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import {
  isMcpServerDisabled,
  mcpDialBlockCause,
  isMcpDialBlockedByPolicy,
  getClaudeCodeMcpConfigs,
  mergeUniqueServerRefs,
  refusedReservedNames,
  emptyString_2,
  filterUnapprovedMcpServers,
  dialsClaudeInChromeBridge,
  shouldSkipClaudeAiFetchForEnterpriseLockdown,
  filterMcpServersByPolicy,
  dedupClaudeAiMcpServers,
  hasManagedMcpPolicy,
  setMcpServerEnabled,
  getEffectiveMcpPolicyKey,
} from "./config.js";
import { logError, logMCPDebug, logMCPError } from "../../utils/log.js";
import { READ_FAILED } from "../../utils/secureStorage/storageWriteLock.js";
import { errorMessage, AbortError, withTelemetryMessage, WireSafeControlError } from "../../utils/errors.js";
import {
  REOPEN_REFETCH_BASE_MS,
  ANSWER_STREAM_GRACE_MS,
  retryDelayMs,
  REOPEN_REFETCH,
} from "./mcpCallConstants.js";
import { withDeadline, raceWithAbortSignal } from "../../utils/sleep.js";
import { logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { getHostState } from "../../utils/hostEnvironment.js";
import {
  getIsRemoteMode,
  getAllowedChannels,
  mainAgentId,
  setConnectedClientWiring,
  getSessionId,
  getOriginalCwd,
} from "../../bootstrap/state.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { useCommandQueueOrDefault } from "../../context/QueuedMessageContext.js";
import { useMcpConnections, useActivePlugins, useAppState } from "../../state/AppState.js";
import { useVoiceLoginCompleted } from "../../hooks/useVoiceIntegration.js";
import { useBrowserExtensionAllowed } from "./MCPConnectionManager.js";
import { useClock } from "../../ink/components/ClockContext.js";
import {
  createChannelPermissionCallbacks,
  isChannelPermissionRelayEnabled,
  hasExperimentalCapability,
} from "./channelPermissions.js";
import { useNotifications } from "../../context/notifications.js";
import {
  AUTH_LOST_SIGNAL,
  REAUTH_RECONNECT_SIGNAL,
  CACHED_ADOPT_SIGNAL,
  CACHED_DIAL_FAILED_SIGNAL,
} from "./connectionFlags.js";
import { getClaudeAIOAuthTokens } from "../../utils/auth.js";
import { checkConsent, takeScopeExpansionNotice } from "./firstPartyDesignConsent.js";
import { isXaaEnabled } from "./xaaIdpLogin.js";
import { identityEpoch, setIdentityTrippedHandler, takeIdentityTripUnowned } from "./identityChange.js";
import {
  markClaudeInChromeUnwiredIfChrome,
  markClaudeInChromeRewired,
} from "../../utils/claudeInChrome/setup.js";
import { checkMcpServerHealth_2 } from "../../cli/handlers/mcp.js";
import { identityId2 } from "../../types/ids.js";
import { isShuttingDown } from "../../utils/gracefulShutdown.js";
import { logForDebugging } from "../../utils/debug.js";
import { isRemoteMcpTransport, hasRemoteMcpServers } from "./discoveryIdentity.js";
import { OFFICE_BRIDGE_LISTING_KEY, CLAUDE_ARTIFACTS } from "./firstPartyServerIds.js";
import { normalizeServerNameShort, deferredToolCache } from "../api/deferredToolsState.js";
import {
  mcpGateError,
  disabledEnableInMcpText,
  disabledElsewhereText,
  mcpRefusalError,
} from "./mcpToggleMessages.js";
import {
  gateChannelServer,
  findChannelEntry,
  ChannelMessageNotificationSchema,
  wrapChannelMessage,
  ChannelPermissionNotificationSchema,
  isChannelGateHardRevocation,
  CHANNEL_PERMISSION_METHOD,
} from "./channelNotification.js";
import { pluginIdForTelemetry } from "../../utils/telemetry/pluginTelemetry.js";
import { isChannelsEnabled } from "./channelAllowlist.js";
import { logEvent } from "../analytics/index.js";
import { fromEnumOpt, fromEnum, lit as lit_2 } from "../analytics/safeMetadata.js";
import { cacheGrantLeg, clearDiscoveryPathMemo, strikeAfterLazyDialFailure } from "./discoveryCache.js";
import { serverCacheKey } from "./client.js";
import { toolNameForTelemetry, filterObject } from "../analytics/metadata.js";
import { decorateMcpTools, stampToolScope } from "./mcpToolDecoration.js";
import { isDiscoveryCacheOn, isDiscoveryCacheUsable } from "./mcpAccountKey.js";
import { isNoticeableMcpServer } from "../../hooks/notifs/useMcpConnectivityStatus.js";
import {
  hasClaudeAiMcpEverConnected,
  isClaudeAiMcpConnectedThisSession,
  markConnectorListUnavailable,
  clearClaudeAiConfigsFetch,
  resetClaudeAiSessionConnections,
  fetchClaudeAiConfigsOnce,
  hasTransientConfigFailure,
  takePendingCrossOrgNotice,
} from "./claudeai.js";
import { logSetupIssues } from "../../utils/notifications/setupIssues.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { applyMcpServerConfig } from "../../components/mcp/MCPListPanel.js";
import {
  DISABLED_IN_MCP_REASON,
  DISABLED_BY_SETTING_REASON,
  BLOCKED_BY_POLICY_REASON,
} from "./redactMcpErrors.js";
import { mcpAuthToolsFor, deleteNeedsAuthCache } from "./needsAuthCache.js";
import { isToolFromMcpServer } from "./mcpStringUtils.js";
import { bareModePluginAllow } from "../../utils/plugins/refresh.js";
import { CLAUDE_IN_CHROME_MCP_SERVER_NAME } from "../../utils/claudeInChrome/common.js";
import { getOwn } from "../../utils/objectSafety.js";
import { plural } from "../../utils/stringUtils.js";
import { primeDiscoveryCacheFlag } from "./elicitationDialogs.js";
import { isBareMode } from "../../utils/envUtils.js";
import { hasDisableClaudeAiConnectors } from "../../utils/settings/settings.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { isGateOOn } from "../../utils/settings/settingsSourceTrust.js";
import { revokeStoredMcpTokens } from "./revokeTokens.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7nse75qx.js:307-453 fingerprint = getErrorKey (0.72)
function getErrorKey(error) {
  let plugin = "plugin" in error ? error.plugin : "no-plugin";
  let serverSuffix = error.type === "mcpb-needs-config" ? `:${error.serverName}` : "";
  return `${error.type}:${error.source}:${plugin}${serverSuffix}`;
}
//@ chunk-18hwfzwa.js:1709347-1709351 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1709347", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1709351-1709379 placement
/**
 * 路径段的最大字符数（8）。
 */
var MAX_TOKEN_STORED_RETRIES = 10;
var DIAL_RESULT_TTL_MS = 600000;
var MAX_PATH_SEGMENT_CHARS = 8;
//@ chunk-18hwfzwa.js:1709379-1710878 placement
function redialFailedMcpServers(reconnectMcpServer) {
  let { searchRedialFailures } = getCliOwnedState();
  let inFlight = new Map();
  let recentFailure = (name) => {
    let failure = searchRedialFailures.get(name);
    return failure !== undefined && performance.now() - failure.endedAt < DIAL_RESULT_TTL_MS
      ? failure
      : undefined;
  };
  let allows = (client) => {
    try {
      if (
        !isRetryableRemoteFailure(client) ||
        (client.config.type !== "http" && client.config.type !== "sse")
      )
        return false;
      let url = URL.parse(client.config.url);
      return (
        url !== null &&
        !BEARER_REJECT_CODES.has(client.errorCode ?? "") &&
        isLoopbackHost(url.hostname) &&
        !url.username &&
        !url.password &&
        !url.search &&
        url.pathname.split("/").every((segment) => segment.length < MAX_PATH_SEGMENT_CHARS) &&
        !client.config.oauth &&
        !usesNonOAuthAuth(client.config) &&
        (recentFailure(client.name)?.count ?? 0) < MAX_TOKEN_STORED_RETRIES &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_floating_lagoon", false) &&
        !isCliOwnedConfig(client.config) &&
        !isMcpServerDisabled(client.name) &&
        !mcpDialBlockCause(client.name, client.config)
      );
    } catch (error) {
      logError(error);
      return false;
    }
  };
  let redialOne = async ({ name: serverName, config }) => {
    let outcome = "not_connected";
    try {
      let tokenState =
        (config.type !== "http" && config.type !== "sse") ||
        (await hasMcpDiscoveryButNoToken(serverName, config));
      if (tokenState === READ_FAILED) outcome = "store_unreadable";
      else if (tokenState) outcome = "token_stored";
      else {
        let { client } = await reconnectMcpServer(serverName, {
          discardDiscovery: false,
          keepConfig: true,
        });
        if (client.type === "connected") outcome = "connected";
      }
    } catch (error) {
      logMCPDebug(serverName, `Re-dial for a search threw: ${errorMessage(error)}`);
    }
    if (outcome === "connected") searchRedialFailures.delete(serverName);
    else
      searchRedialFailures.set(serverName, {
        count:
          outcome === "token_stored" ? MAX_TOKEN_STORED_RETRIES : (recentFailure(serverName)?.count ?? 0) + 1,
        endedAt: performance.now(),
      });
    inFlight.delete(serverName);
    return outcome;
  };
  return {
    allows,
    async redial(clients, timeoutMs, signal) {
      let filtered = clients.filter(
        (client) =>
          allows(client) &&
          performance.now() - (recentFailure(client.name)?.endedAt ?? -1 / 0) >= REOPEN_REFETCH_BASE_MS,
      );
      if (filtered.length === 0) return;
      let mapped = filtered.map((client) => {
        let pending = inFlight.get(client.name) ?? redialOne(client);
        inFlight.set(client.name, pending);
        return pending;
      });
      let outcomes = await withDeadline(
        raceWithAbortSignal(Promise.all(mapped), signal, () => new AbortError()),
        timeoutMs,
      );
      let failureKind =
        outcomes === undefined ? "wait_ran_out" : outcomes.find((outcome) => outcome !== "connected");
      if (failureKind === undefined) logFeatureOk("mcp_search_redial");
      else logFeatureSad("mcp_search_redial", failureKind);
    },
  };
}
//@ chunk-18hwfzwa.js:1710878-1711114 placement
function keptConnectionOrFailed(client, kept) {
  return client.type !== "connected" || (kept?.type === "connected" && kept.client === client.client)
    ? client
    : {
        name: client.name,
        type: "failed",
        config: client.config,
        error: "The connection was not kept: the server was removed, changed, disabled or refused meanwhile",
      };
}
//@ chunk-18hwfzwa.js:1711114-1711118 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1711114", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1711118-1711157 layout
function clearSkillIndex() {
  getHostState().skillIndex.clear();
}
//@ chunk-18hwfzwa.js:1711157-1711287 layout
var SCOPE_TO_TELEMETRY_SOURCE = {
  enterprise: "enterprise",
  user: "global",
  project: "project",
  local: "user",
  dynamic: "plugin",
  agent: "agent",
  claudeai: "claudeai",
};
//@ chunk-18hwfzwa.js:1711287-1711320 layout
var MAX_INITIAL_CONNECT_RETRIES = 3;
var CLAUDEAI_LIST_RETRY_DELAYS_MS = [5000, 15000, 45000];
//@ chunk-18hwfzwa.js:1711320-1737581 fingerprint = useManageMCPConnections (0.547)
/**
 * useManageMCPConnections：REPL 中管理 MCP 连接的 React hook。初始化时 getMcpToolsCommandsAndResources 批量连接并写入 AppState.mcp；注册 list_changed（工具/提示词/资源）处理、channel 通知、elicitation、远程传输断线自动重连（最多 5 次，指数退避 1s 起、上限 30s）、首次连接瞬时错误重试 3 次、claude.ai 连接器列表后台重试；对外提供 reconnectMcpServer 与 toggleMcpServer。
 */
function useManageMCPConnections(configs, isStrictMcpConfig, permissionRelays, requestDialog) {
  let store = getIsRemoteMode();
  let { storageV5, credentials } = useTheme_2();
  let commandQueueOrDefault = useCommandQueueOrDefault();
  let mcpConnections = useMcpConnections();
  let activePlugins = useActivePlugins();
  let voiceLoginCompleted = useVoiceLoginCompleted();
  let voiceLoginCompletedRef = useRef(undefined);
  let [connectGeneration, bumpConnectGeneration] = useState(0);
  let lastConfigGeneration = useRef(0);
  let identityTripEpoch = useRef(undefined);
  let identityTripPending = useRef(false);
  let policySnapshotKey = useAppState((state) => mcpPolicySnapshotKey(state.settings));
  let browserExtensionAllowed = useBrowserExtensionAllowed();
  let pluginReconnectKey = useAppState((state) => state.mcp.pluginReconnectKey);
  let setAppState = useClock();
  let reconnectTimersRef = useRef(new Map());
  let [claudeAiRetryTick, bumpClaudeAiRetryTick] = useState(0);
  let channelWarnedKindsRef = useRef(0);
  let channelPermCallbacksRef = useRef(null);
  let [configRevision, bumpConfigRevision] = useState(0);
  let gateOSeen = useRef(false);
  let inflightReconnects = useRef(new Map());
  let initialRetryCounts = useRef(new Map());
  let lastBlockedKey = useRef(null);
  let reservedNameNoticeKeys = useRef(new Set());
  let warnedChannelGateKeys = useRef(new Set());
  let channelRegisteredServers = useRef(new Set());
  let channelPermissionCallbacksRef = useRef(null);
  if (channelPermissionCallbacksRef.current === null && !store)
    channelPermissionCallbacksRef.current = createChannelPermissionCallbacks((serverName) =>
      channelRegisteredServers.current.has(serverName),
    );
  useEffect(() => {
    let callbacks = channelPermissionCallbacksRef.current;
    if (!callbacks) return;
    if (!isChannelPermissionRelayEnabled()) return;
    permissionRelays.setChannel(callbacks);
    return () => {
      permissionRelays.setChannel(undefined);
    };
  }, [permissionRelays]);
  let { addNotification, removeNotification } = useNotifications();
  let authLostNotifiedServers = useRef(new Set());
  useEffect(
    () =>
      AUTH_LOST_SIGNAL.subscribe((prev) => {
        if (authLostNotifiedServers.current.has(prev)) return;
        let found = mcpConnections.get().clients.find((prev_2) => prev_2.name === prev);
        if (found?.type !== "connected") return;
        authLostNotifiedServers.current.add(prev);
        (async () => {
          let notified = false;
          try {
            if (
              (found.config.type === "sse" || found.config.type === "http") &&
              (hasExternalAuthForConfig(
                found.config,
                !!getClaudeAIOAuthTokens()?.accessToken ||
                  (isDesignMcpUrl(found.config.url) && (await checkConsent(credentials).catch(() => false))),
              ) ||
                (isXaaEnabled() && !!found.config.oauth?.xaa))
            )
              return;
            addNotification({
              key: `mcp-needs-reauth-${prev}`,
              kind: "warning",
              priority: "high",
              text: `MCP server "${prev}" lost authentication \xB7 open /mcp and select Re-authenticate`,
              color: "warning",
              timeoutMs: 12000,
            });
            notified = true;
          } catch (error) {
            logMCPDebug(prev, `Auth-lost notice skipped: ${errorMessage(error)}`);
          } finally {
            if (!notified) authLostNotifiedServers.current.delete(prev);
          }
        })();
      }),
    [mcpConnections, addNotification, credentials],
  );
  let MCP_BATCH_FLUSH_MS = 16;
  let pendingUpdatesRef = useRef([]);
  let flushTimerRef = useRef(null);
  let flushPendingUpdates = useCallback(() => {
    flushTimerRef.current = null;
    let updates = pendingUpdatesRef.current;
    if (updates.length === 0) return;
    pendingUpdatesRef.current = [];
    mcpConnections.applyQueuedUpdates(updates, {
      currentEpoch: identityEpoch(),
      onDoorDenied: markClaudeInChromeUnwiredIfChrome,
      onOrphanedDisable: (prevState) => {
        initialRetryCounts.current.delete(prevState);
        channelRegisteredServers.current.delete(prevState);
        let cancelTimer = reconnectTimersRef.current.get(prevState);
        if (cancelTimer) {
          cancelTimer();
          reconnectTimersRef.current.delete(prevState);
        }
      },
    });
  }, [mcpConnections]);
  let enqueueUpdate = useCallback(
    (update) => {
      pendingUpdatesRef.current.push({
        ...update,
        epoch: identityEpoch(),
      });
      if (flushTimerRef.current === null)
        flushTimerRef.current = setAppState.setTimeout(flushPendingUpdates, MCP_BATCH_FLUSH_MS);
    },
    [setAppState, flushPendingUpdates],
  );
  let findServerClient = useCallback(
    (serverName) => {
      let name = mcpConnections.get().clients.find((client) => client.name === serverName);
      for (let pendingClient of pendingUpdatesRef.current)
        if (pendingClient.name === serverName && checkMcpServerHealth_2(name, pendingClient))
          name = pendingClient;
      return name;
    },
    [mcpConnections],
  );
  let updateServer = useCallback(
    ({ client, tools, commands, resources, resourceTemplates, replaceOnly, asked, superseded }) => {
      enqueueUpdate({
        ...client,
        tools,
        commands,
        resources,
        resourceTemplates,
        ...(replaceOnly && {
          replaceOnly,
        }),
        ...(asked && {
          asked,
        }),
        ...(superseded && {
          superseded,
        }),
      });
      {
        let scopeNotice = takeScopeExpansionNotice();
        if (scopeNotice)
          addNotification({
            key: "mcp-first-party-scope-expanded",
            kind: "event",
            priority: "high",
            text: scopeNotice,
            color: "remember",
            timeoutMs: 12000,
          });
      }
      switch (client.type) {
        case "connected": {
          initialRetryCounts.current.set(client.name, MAX_INITIAL_CONNECT_RETRIES);
          authLostNotifiedServers.current.delete(client.name);
          removeNotification(`mcp-reconnect-failed-${client.name}`);
          let { registerElicitationHandler } =
            require("./emitTripwireEvent.lazy.js").mcpElicitationHandlerModule();
          registerElicitationHandler(
            identityId2(client.client),
            client.name,
            requestDialog,
            client.transportErrorState,
            client.config.pluginSource,
          );
          identityId2(client.client).onclose = () => {
            if (isShuttingDown()) return;
            let configType = client.config.type ?? "stdio";
            getMcpClientModule()
              .clearServerCache(client.name, client.config)
              .catch(() => {
                logForDebugging(`Failed to invalidate the server cache: ${client.name}`);
              });
            if (isMcpServerDisabled(client.name)) {
              logMCPDebug(client.name, "Server is disabled, skipping automatic reconnection");
              return;
            }
            if (configType !== "stdio" && configType !== "sdk") {
              let transportType = getTransportDisplayName(configType);
              logMCPDebug(
                client.name,
                `${transportType} transport closed/disconnected, attempting automatic reconnection`,
              );
              let existingTimer = reconnectTimersRef.current.get(client.name);
              if (existingTimer) {
                existingTimer();
                reconnectTimersRef.current.delete(client.name);
              }
              let retryEpoch = identityEpoch();
              let reconnectWithBackoff = () =>
                identityEpoch() === retryEpoch || !isRemoteMcpTransport(client.config);
              let notifyReconnectFailed = () => {
                if (client.name === OFFICE_BRIDGE_LISTING_KEY || isMcpServerDisabled(client.name)) return;
                addNotification({
                  key: `mcp-reconnect-failed-${client.name}`,
                  kind: "warning",
                  priority: "high",
                  text: `MCP server "${normalizeServerNameShort(client.name)}" disconnected \xB7 open /mcp to reconnect`,
                  color: "warning",
                  timeoutMs: 12000,
                });
              };
              (async () => {
                for (let attempt = 1; attempt <= ANSWER_STREAM_GRACE_MS; attempt++) {
                  if (isMcpServerDisabled(client.name)) {
                    logMCPDebug(client.name, "Server disabled during reconnection, stopping retry");
                    reconnectTimersRef.current.delete(client.name);
                    enqueueUpdate({
                      ...client,
                    });
                    return;
                  }
                  if (!reconnectWithBackoff()) {
                    logMCPDebug(client.name, "Identity changed during reconnection, stopping retry");
                    return;
                  }
                  let blockedCause = mcpDialBlockCause(client.name, client.config);
                  if (blockedCause) {
                    markClaudeInChromeUnwiredIfChrome(client.name);
                    logMCPDebug(
                      client.name,
                      "Server blocked by managed policy during reconnection, stopping retry",
                    );
                    reconnectTimersRef.current.delete(client.name);
                    enqueueUpdate({
                      name: client.name,
                      type: "failed",
                      config: client.config,
                      ...mcpGateError(blockedCause, client.name, client.config),
                    });
                    return;
                  }
                  enqueueUpdate({
                    ...client,
                    type: "pending",
                    reconnectAttempt: attempt,
                    maxReconnectAttempts: ANSWER_STREAM_GRACE_MS,
                  });
                  let reconnectStartTime = setAppState.now();
                  try {
                    let result = await getMcpClientModule().reconnectMcpServerImpl(
                      client.name,
                      client.config,
                      storageV5,
                      credentials,
                    );
                    let elapsed = Math.round(setAppState.now() - reconnectStartTime);
                    if (!reconnectWithBackoff()) {
                      logMCPDebug(
                        client.name,
                        `Identity changed during reconnection attempt ${attempt}, discarding result`,
                      );
                      return;
                    }
                    if (result.client.type === "connected") {
                      logMCPDebug(
                        client.name,
                        `${transportType} reconnection successful after ${elapsed}ms (attempt ${attempt})`,
                      );
                      reconnectTimersRef.current.delete(client.name);
                      updateServer(result);
                      return;
                    }
                    logMCPDebug(
                      client.name,
                      `${transportType} reconnection attempt ${attempt} completed with status: ${result.client.type}`,
                    );
                    if (attempt === ANSWER_STREAM_GRACE_MS) {
                      logMCPDebug(
                        client.name,
                        `Max reconnection attempts (${ANSWER_STREAM_GRACE_MS}) reached, giving up`,
                      );
                      reconnectTimersRef.current.delete(client.name);
                      updateServer(result);
                      if (result.client.type === "failed") notifyReconnectFailed();
                      return;
                    }
                  } catch (error) {
                    let elapsed = Math.round(setAppState.now() - reconnectStartTime);
                    logMCPError(
                      client.name,
                      `${transportType} reconnection attempt ${attempt} failed after ${elapsed}ms: ${describeConnectError(error, client.config)}`,
                    );
                    if (!reconnectWithBackoff()) return;
                    if (attempt === ANSWER_STREAM_GRACE_MS) {
                      logMCPDebug(
                        client.name,
                        `Max reconnection attempts (${ANSWER_STREAM_GRACE_MS}) reached, giving up`,
                      );
                      reconnectTimersRef.current.delete(client.name);
                      enqueueUpdate({
                        ...client,
                        type: "failed",
                      });
                      notifyReconnectFailed();
                      return;
                    }
                  }
                  let backoffMs = retryDelayMs(attempt);
                  logMCPDebug(
                    client.name,
                    `Scheduling reconnection attempt ${attempt + 1} in ${backoffMs}ms`,
                  );
                  await new Promise((resolve) => {
                    let timer = setAppState.setTimeout(resolve, backoffMs);
                    reconnectTimersRef.current.set(client.name, timer);
                  });
                }
              })();
            } else {
              channelRegisteredServers.current.delete(client.name);
              enqueueUpdate({
                ...client,
                type: "failed",
              });
            }
          };
          let gateResult = gateChannelServer(
            client.name,
            client.capabilities,
            client.config.pluginSource,
            client.protocolEra,
          );
          let timer = findChannelEntry(client.name, getAllowedChannels());
          let plugin =
            timer?.kind === "plugin" && client.config.pluginSource
              ? pluginIdForTelemetry(client.config.pluginSource)
              : undefined;
          let registered = false;
          let registerChannelHandlers = () => {
            channelRegisteredServers.current.add(client.name);
            getMcpClientModule().onMcpNotification(
              client,
              ChannelMessageNotificationSchema(),
              async (notification) => {
                if (!isChannelsEnabled()) return;
                let { content, meta } = notification.params;
                logMCPDebug(client.name, `notifications/claude/channel: ${content.slice(0, 80)}`);
                logEvent("tengu_mcp_channel_message", {
                  content_length: content.length,
                  meta_key_count: Object.keys(meta ?? {}).length,
                  entry_kind: fromEnumOpt(timer?.kind),
                  is_dev: timer?.dev ?? false,
                  plugin,
                });
                commandQueueOrDefault.enqueue({
                  mode: "prompt",
                  agentId: mainAgentId(),
                  value: wrapChannelMessage(client.name, content, meta),
                  priority: "next",
                  isMeta: true,
                  origin: {
                    kind: "channel",
                    server: client.name,
                  },
                  skipSlashCommands: true,
                  skipAttachments: true,
                });
              },
            );
            if (hasExperimentalCapability(client.capabilities, "claude/channel/permission"))
              getMcpClientModule().onMcpNotification(
                client,
                ChannelPermissionNotificationSchema(),
                async (notification) => {
                  if (!isChannelsEnabled()) return;
                  let { request_id, behavior } = notification.params;
                  let resolved =
                    channelPermissionCallbacksRef.current?.resolve(request_id, behavior, client.name) ??
                    false;
                  logMCPDebug(
                    client.name,
                    `notifications/claude/channel/permission: ${request_id} \u2192 ${behavior} (${resolved ? "matched pending" : "no pending entry \u2014 stale or unknown ID"})`,
                  );
                },
              );
          };
          switch (gateResult.action) {
            case "register":
              logMCPDebug(client.name, "Channel notifications registered");
              registerChannelHandlers();
              registered = true;
              break;
            case "skip": {
              let hardRevocation = isChannelGateHardRevocation(gateResult.kind);
              let wasRegistered = channelRegisteredServers.current.has(client.name);
              if (hardRevocation) {
                channelRegisteredServers.current.delete(client.name);
                let clientHandle = identityId2(client.client);
                clientHandle.removeNotificationHandler("notifications/claude/channel");
                clientHandle.removeNotificationHandler(CHANNEL_PERMISSION_METHOD);
              } else if (wasRegistered) {
                logMCPDebug(
                  client.name,
                  `Channel gate says skip:${gateResult.kind} but was previously registered \u2014 preserving handler`,
                );
                registerChannelHandlers();
                registered = true;
                break;
              }
              logMCPDebug(client.name, `Channel notifications skipped: ${gateResult.reason}`);
              let noticeKey =
                gateResult.kind === "capability" || gateResult.kind === "session"
                  ? null
                  : gateResult.kind === "era"
                    ? `era:${client.name}`
                    : gateResult.kind;
              if (
                noticeKey !== null &&
                !warnedChannelGateKeys.current.has(noticeKey) &&
                (gateResult.kind === "marketplace" || gateResult.kind === "allowlist" || timer !== undefined)
              ) {
                warnedChannelGateKeys.current.add(noticeKey);
                let text =
                  gateResult.kind === "disabled"
                    ? "Channels are not currently available"
                    : gateResult.kind === "provider"
                      ? "Channels are not available on Bedrock, Vertex, or Foundry"
                      : gateResult.kind === "policy"
                        ? "Channels are not enabled for your org \xB7 have an administrator set channelsEnabled: true in managed settings"
                        : gateResult.kind === "era"
                          ? `Channel messages from "${client.name}" are unavailable: this connection's protocol version has no channel delivery path`
                          : gateResult.reason;
                addNotification({
                  key:
                    gateResult.kind === "era"
                      ? `channels-blocked-era-${client.name}`
                      : `channels-blocked-${gateResult.kind}`,
                  priority: "high",
                  text,
                  color: "warning",
                  timeoutMs: 12000,
                });
              }
              break;
            }
          }
          if (registered || (gateResult.action === "skip" && gateResult.kind !== "capability"))
            logEvent("tengu_mcp_channel_gate", {
              registered,
              skip_kind: gateResult.action === "skip" ? fromEnum(gateResult.kind) : undefined,
              entry_kind: fromEnumOpt(timer?.kind),
              is_dev: timer?.dev ?? false,
              plugin,
            });
          let handlerEpoch = identityEpoch();
          let isCurrentEpoch = () => identityEpoch() === handlerEpoch || !isRemoteMcpTransport(client.config);
          if (client.capabilities?.tools?.listChanged)
            getMcpClientModule().onMcpToolListChanged(client, async (reason) => {
              if (!isCurrentEpoch()) return;
              let { fetchToolsForClient, getToolsListErrorForResult, persistRefreshedToolsIfPresent } =
                getMcpClientModule();
              let grantLegPromise = cacheGrantLeg(client.name, client.config);
              let cause = refetchReasonTelemetry(reason);
              logMCPDebug(
                client.name,
                reason === REOPEN_REFETCH
                  ? "Synthesized tools refetch after listen-stream reopen (no notification received)"
                  : "Received tools/list_changed notification, refreshing tools",
              );
              try {
                let cacheKey = serverCacheKey(client.name, client.config);
                let previousToolsPromise = fetchToolsForClient.cache.get(cacheKey);
                fetchToolsForClient.cache.delete(cacheKey);
                let toolsForClient = await fetchToolsForClient(client, storageV5);
                let toolsListErrorForResult = getToolsListErrorForResult(toolsForClient);
                if (toolsListErrorForResult)
                  logForDebugging(
                    `[mcp] ${client.name}: tools/list_changed refresh failed (${toolsListErrorForResult}); keeping previous tools`,
                    {
                      level: "warn",
                    },
                  );
                let needsAuthEmpty = client.discoveryAuthFailure && toolsForClient.length === 0;
                if (needsAuthEmpty)
                  logMCPDebug(
                    client.name,
                    "tools refresh returned the needs-auth empty list; keeping previous tools",
                  );
                let newCount = toolsForClient.length;
                let refreshFailed = Boolean(toolsListErrorForResult) || needsAuthEmpty;
                if (!refreshFailed && previousToolsPromise)
                  previousToolsPromise.then(
                    (previousTools) => {
                      logEvent("tengu_mcp_list_changed", {
                        mcpServerKeyHash: toolNameForTelemetry(client.name),
                        type: lit_2("tools"),
                        cause,
                        previousCount: previousTools.length,
                        newCount,
                      });
                    },
                    () => {
                      logEvent("tengu_mcp_list_changed", {
                        mcpServerKeyHash: toolNameForTelemetry(client.name),
                        type: lit_2("tools"),
                        cause,
                        newCount,
                      });
                    },
                  );
                else if (!refreshFailed)
                  logEvent("tengu_mcp_list_changed", {
                    mcpServerKeyHash: toolNameForTelemetry(client.name),
                    type: lit_2("tools"),
                    cause,
                    newCount,
                  });
                if (!isCurrentEpoch()) return;
                enqueueUpdate({
                  ...client,
                  tools:
                    toolsListErrorForResult || needsAuthEmpty
                      ? undefined
                      : decorateMcpTools(client, toolsForClient),
                });
                if (!refreshFailed && isDiscoveryCacheOn())
                  grantLegPromise.then((grantLeg) =>
                    persistRefreshedToolsIfPresent(client, toolsForClient, {
                      identityEpoch: handlerEpoch,
                      grantLeg,
                    }),
                  );
              } catch (error) {
                logMCPError(
                  client.name,
                  `Failed to refresh tools after list_changed notification: ${describeConnectError(error, client.config)}`,
                );
              }
            });
          if (client.capabilities?.prompts)
            getMcpClientModule().onMcpPromptListChanged(client, async (reason) => {
              if (!isCurrentEpoch()) return;
              let { fetchCommandsForClient, getDiscoveryFetchError } = getMcpClientModule();
              logMCPDebug(
                client.name,
                reason === REOPEN_REFETCH
                  ? "Synthesized prompts refetch after listen-stream reopen (no notification received)"
                  : "Received prompts/list_changed notification, refreshing prompts",
              );
              try {
                fetchCommandsForClient.cache.delete(serverCacheKey(client.name, client.config));
                let [commandsForClient, extraCommands] = await Promise.all([
                  fetchCommandsForClient(client),
                  Promise.resolve([]),
                ]);
                let discoveryFetchError = getDiscoveryFetchError(commandsForClient);
                if (discoveryFetchError)
                  logForDebugging(
                    `[mcp] ${client.name}: prompts/list_changed refresh failed (${describeConnectError(discoveryFetchError, client.config)}); keeping previous commands`,
                    {
                      level: "warn",
                    },
                  );
                if (!isCurrentEpoch()) return;
                enqueueUpdate({
                  ...client,
                  commands: discoveryFetchError
                    ? undefined
                    : stampToolScope(client, [...commandsForClient, ...extraCommands]),
                });
                clearSkillIndex();
                logEvent("tengu_mcp_list_changed", {
                  mcpServerKeyHash: toolNameForTelemetry(client.name),
                  type: lit_2("prompts"),
                  cause: refetchReasonTelemetry(reason),
                });
              } catch (error) {
                logMCPError(
                  client.name,
                  `Failed to refresh prompts after list_changed notification: ${describeConnectError(error, client.config)}`,
                );
              }
            });
          if (client.capabilities?.resources)
            getMcpClientModule().onMcpResourceListChanged(client, async (reason) => {
              if (!isCurrentEpoch()) return;
              let {
                fetchResourcesForClient,
                fetchResourceTemplatesForClient,
                fetchCommandsForClient,
                getDiscoveryFetchError,
              } = getMcpClientModule();
              logMCPDebug(
                client.name,
                reason === REOPEN_REFETCH
                  ? "Synthesized resources refetch after listen-stream reopen (no notification received)"
                  : "Received resources/list_changed notification, refreshing resources",
              );
              try {
                let cacheKey = serverCacheKey(client.name, client.config);
                fetchResourcesForClient.cache.delete(cacheKey);
                fetchResourceTemplatesForClient.cache.delete(cacheKey);
                {
                  let [resourcesForClient, resourceTemplatesForClient] = await Promise.all([
                    fetchResourcesForClient(client),
                    fetchResourceTemplatesForClient(client),
                  ]);
                  let discoveryFetchError = getDiscoveryFetchError(resourcesForClient);
                  let discoveryFetchError_2 = getDiscoveryFetchError(resourceTemplatesForClient);
                  let fetchError = discoveryFetchError ?? discoveryFetchError_2;
                  if (fetchError)
                    logForDebugging(
                      `[mcp] ${client.name}: resources/list_changed refresh partial failure (${describeConnectError(fetchError, client.config)}); keeping previous for failed fields`,
                      {
                        level: "warn",
                      },
                    );
                  if (!isCurrentEpoch()) return;
                  enqueueUpdate({
                    ...client,
                    resources: discoveryFetchError ? undefined : resourcesForClient,
                    resourceTemplates: discoveryFetchError_2 ? undefined : resourceTemplatesForClient,
                  });
                }
                logEvent("tengu_mcp_list_changed", {
                  mcpServerKeyHash: toolNameForTelemetry(client.name),
                  type: lit_2("resources"),
                  cause: refetchReasonTelemetry(reason),
                });
              } catch (error) {
                logMCPError(
                  client.name,
                  `Failed to refresh resources after list_changed notification: ${describeConnectError(error, client.config)}`,
                );
              }
            });
          break;
        }
        case "failed": {
          let attempt = (initialRetryCounts.current.get(client.name) ?? 0) + 1;
          if (isRetryableRemoteFailure(client) && attempt <= MAX_INITIAL_CONNECT_RETRIES) {
            initialRetryCounts.current.set(client.name, attempt);
            let delayMs = retryDelayMs(attempt);
            logMCPDebug(
              client.name,
              `Transient ${client.errorCode ?? "<sse-no-code>"} on initial connect \u2014 retry ${attempt}/${MAX_INITIAL_CONNECT_RETRIES} in ${delayMs}ms`,
            );
            enqueueUpdate({
              name: client.name,
              config: client.config,
              type: "pending",
              reconnectAttempt: attempt,
              maxReconnectAttempts: MAX_INITIAL_CONNECT_RETRIES,
            });
            let cancelExisting = reconnectTimersRef.current.get(client.name);
            if (cancelExisting) cancelExisting();
            let retryEpoch = identityEpoch();
            let timer = setAppState.setTimeout(() => {
              reconnectTimersRef.current.delete(client.name);
              if (isMcpServerDisabled(client.name)) {
                enqueueUpdate({
                  ...client,
                });
                return;
              }
              if (identityEpoch() !== retryEpoch) return;
              let blockedCause = mcpDialBlockCause(client.name, client.config);
              if (blockedCause) {
                markClaudeInChromeUnwiredIfChrome(client.name);
                logMCPDebug(
                  client.name,
                  "Server blocked by managed policy during initial-connect retry, stopping retry",
                );
                enqueueUpdate({
                  name: client.name,
                  type: "failed",
                  config: client.config,
                  ...mcpGateError(blockedCause, client.name, client.config),
                });
                return;
              }
              getMcpClientModule()
                .reconnectMcpServerImpl(client.name, client.config, storageV5, credentials)
                .then(
                  (result) => {
                    if (identityEpoch() !== retryEpoch) return;
                    updateServer(result);
                  },
                  (error) => {
                    logMCPError(
                      client.name,
                      `Initial-connect retry ${attempt} threw: ${describeConnectError(error, client.config)}`,
                    );
                    if (identityEpoch() !== retryEpoch) return;
                    enqueueUpdate({
                      ...client,
                    });
                  },
                );
            }, delayMs);
            reconnectTimersRef.current.set(client.name, timer);
          } else if (
            isNoticeableMcpServer(client, hasClaudeAiMcpEverConnected, isClaudeAiMcpConnectedThisSession)
          )
            logSetupIssues("MCP", 1);
          break;
        }
        case "needs-auth":
          if (isNoticeableMcpServer(client, hasClaudeAiMcpEverConnected, isClaudeAiMcpConnectedThisSession))
            logSetupIssues("MCP", 1);
          break;
        case "cached":
        case "pending":
        case "disabled":
          break;
        default:
      }
    },
    [
      setAppState,
      enqueueUpdate,
      addNotification,
      removeNotification,
      commandQueueOrDefault,
      storageV5,
      credentials,
      requestDialog,
    ],
  );
  useEffect(
    () =>
      REAUTH_RECONNECT_SIGNAL.subscribe((serverName, config) => {
        (async () => {
          let clearCache = () =>
            void getMcpClientModule()
              .clearServerCache(serverName, config)
              .catch(() => {});
          let epoch = identityEpoch();
          try {
            let found = mcpConnections.get().clients.find((client) => client.name === serverName);
            if (
              found === undefined ||
              !isConnectedOrCached(found) ||
              isMcpServerDisabled(serverName) ||
              isMcpDialBlockedByPolicy(serverName, config)
            ) {
              clearCache();
              return;
            }
            if (serverCacheKey(serverName, found.config) !== serverCacheKey(serverName, config)) {
              clearCache();
              return;
            }
            let mcpClientModule = getMcpClientModule();
            let connection = await mcpClientModule.connectToServer(
              serverName,
              config,
              undefined,
              storageV5,
              credentials,
            );
            if (identityEpoch() !== epoch) {
              if (connection.type === "connected") mcpClientModule.detachAndCloseConnection(connection);
              return;
            }
            if (connection.type !== "connected") return;
            let [tools, commands, extraCommands, resources] = await Promise.all([
              mcpClientModule.fetchToolsForClient(connection, storageV5),
              mcpClientModule.fetchCommandsForClient(connection),
              Promise.resolve([]),
              connection.capabilities?.resources
                ? mcpClientModule.fetchResourcesForClient(connection)
                : Promise.resolve([]),
            ]);
            if (identityEpoch() !== epoch) {
              mcpClientModule.detachAndCloseConnection(connection);
              return;
            }
            let found_2 = mcpConnections.get().clients.find((client) => client.name === serverName);
            if (
              found_2 === undefined ||
              !isConnectedOrCached(found_2) ||
              isMcpServerDisabled(serverName) ||
              isMcpDialBlockedByPolicy(serverName, config) ||
              serverCacheKey(serverName, found_2.config) !== serverCacheKey(serverName, config)
            ) {
              clearCache();
              return;
            }
            updateServer(
              applyMcpServerConfig(found_2.config, {
                client: connection,
                tools,
                commands: [...commands, ...extraCommands],
                resources,
                resourceTemplates: [],
                replaceOnly: true,
              }),
            );
          } catch (error) {
            clearCache();
            if (!isMcpServerDisabled(serverName) && identityEpoch() === epoch)
              enqueueUpdate({
                name: serverName,
                type: "failed",
                config,
                error: `Re-adopt after re-authentication failed: ${describeConnectError(error, config)}`,
                replaceOnly: true,
              });
            logForDebugging(
              `Failed to re-adopt reauth connection for ${serverName}: ${describeConnectError(error, config)}`,
              {
                level: "error",
              },
            );
          }
        })();
      }),
    [mcpConnections, updateServer, enqueueUpdate, storageV5, credentials],
  );
  useEffect(() => {
    setConnectedClientWiring((connection) => {
      if (!isDiscoveryCacheOn()) return;
      let { registerElicitationHandler } =
        require("./emitTripwireEvent.lazy.js").mcpElicitationHandlerModule();
      registerElicitationHandler(
        identityId2(connection.client),
        connection.name,
        requestDialog,
        connection.transportErrorState,
        connection.config.pluginSource,
      );
    });
    return () => setConnectedClientWiring(undefined);
  }, [requestDialog]);
  useEffect(
    () =>
      CACHED_ADOPT_SIGNAL.subscribe((serverName, config) => {
        (async () => {
          let epoch = identityEpoch();
          let mcpClientModule = getMcpClientModule();
          try {
            let cachedClient = findServerClient(serverName);
            if (cachedClient?.type !== "cached") return;
            let blockedCause = mcpDialBlockCause(serverName, config);
            if (blockedCause) {
              markClaudeInChromeUnwiredIfChrome(serverName);
              mcpClientModule.clearServerCache(serverName, config).catch(() => {});
              mcpClientModule.dropDiscoveryEntry(serverName, config).catch(() => {});
              enqueueUpdate({
                name: serverName,
                type: "failed",
                config,
                ...mcpGateError(blockedCause, serverName, config),
                replaceOnly: true,
              });
              return;
            }
            if (isMcpServerDisabled(serverName)) {
              mcpClientModule.clearServerCache(serverName, config).catch(() => {});
              updateServer({
                client: {
                  name: serverName,
                  type: "failed",
                  config,
                  error: DISABLED_IN_MCP_REASON,
                  errorCode: "DISABLED",
                },
                tools: [],
                commands: [],
                replaceOnly: true,
              });
              return;
            }
            if (serverCacheKey(serverName, cachedClient.config) !== serverCacheKey(serverName, config)) {
              mcpClientModule.clearServerCache(serverName, config).catch(() => {});
              return;
            }
            let connection = await mcpClientModule.connectToServer(
              serverName,
              config,
              undefined,
              storageV5,
              credentials,
            );
            if (identityEpoch() !== epoch) return;
            if (connection.type === "connected" && isMcpServerDisabled(serverName)) {
              updateServer({
                client: connection,
                tools: [],
                commands: [],
                replaceOnly: true,
              });
              return;
            }
            if (connection.type !== "connected") {
              if (connection.type === "needs-auth")
                updateServer({
                  client: {
                    ...connection,
                    config: cachedClient.config,
                  },
                  tools: mcpAuthToolsFor(serverName, cachedClient.config),
                  commands: [],
                  resources: [],
                  resourceTemplates: [],
                  replaceOnly: true,
                });
              return;
            }
            clearDiscoveryPathMemo(serverName);
            let grantLeg = await cacheGrantLeg(serverName, config);
            if (identityEpoch() !== epoch) return;
            let hasResources = !!connection.capabilities?.resources;
            let [tools, commands, extraCommands, resources] = await Promise.all([
              mcpClientModule.fetchToolsForClient(connection, storageV5),
              mcpClientModule.fetchCommandsForClient(connection),
              Promise.resolve([]),
              hasResources ? mcpClientModule.fetchResourcesForClient(connection) : Promise.resolve([]),
            ]);
            if ((await mcpClientModule.peekSettledConnection(serverName, config)) !== connection) return;
            let currentClient = findServerClient(serverName);
            if (identityEpoch() !== epoch || currentClient?.type !== "cached") return;
            if (serverCacheKey(serverName, currentClient.config) !== serverCacheKey(serverName, config)) {
              mcpClientModule.clearServerCache(serverName, config).catch(() => {});
              return;
            }
            let lateBlockedCause = mcpDialBlockCause(serverName, config);
            if (lateBlockedCause) {
              markClaudeInChromeUnwiredIfChrome(serverName);
              identityId2(connection.client).onclose = undefined;
              mcpClientModule.clearServerCache(serverName, config).catch(() => {});
              mcpClientModule.dropDiscoveryEntry(serverName, config).catch(() => {});
              enqueueUpdate({
                name: serverName,
                type: "failed",
                config,
                ...mcpGateError(lateBlockedCause, serverName, config),
                replaceOnly: true,
              });
              return;
            }
            let toolsListErrorForResult = mcpClientModule.getToolsListErrorForResult(tools);
            let tools_2 = toolsListErrorForResult
              ? mcpConnections.get().tools.filter((tool) => isToolFromMcpServer(tool, serverName))
              : tools;
            if (toolsListErrorForResult)
              logForDebugging(
                `Cached MCP server ${serverName}: adoption tools/list failed (${describeConnectError(toolsListErrorForResult, config)}); keeping cached surface`,
                {
                  level: "warn",
                },
              );
            let discoveryFetchError = mcpClientModule.getDiscoveryFetchError(commands);
            let commands_2 = [
              ...(discoveryFetchError
                ? mcpConnections
                    .get()
                    .commands.filter(
                      (command) =>
                        commandBelongsToServer(command, serverName) && command.loadedFrom !== "mcp",
                    )
                : commands),
              ...extraCommands,
            ];
            if (discoveryFetchError)
              logForDebugging(
                `Cached MCP server ${serverName}: adoption prompts/list failed (${describeConnectError(discoveryFetchError, config)}); keeping cached prompts`,
                {
                  level: "warn",
                },
              );
            let resourcesError = resources ? mcpClientModule.getDiscoveryFetchError(resources) : undefined;
            if (resourcesError)
              logForDebugging(
                `Cached MCP server ${serverName}: adoption resources/list failed (${describeConnectError(resourcesError, config)}); keeping cached resources`,
                {
                  level: "warn",
                },
              );
            updateServer(
              applyMcpServerConfig(currentClient.config, {
                client: connection,
                tools: tools_2,
                commands: commands_2,
                resources: resourcesError ? undefined : resources,
                resourceTemplates: [],
                replaceOnly: true,
              }),
            );
            mcpClientModule.persistLiveListing(connection, {
              tools,
              commands,
              resources,
              identityEpoch: epoch,
              grantLeg,
            });
          } catch (error) {
            logForDebugging(
              `Failed to adopt cached MCP server ${serverName} after lazy connect: ${describeConnectError(error, config)}`,
              {
                level: "warn",
              },
            );
          }
        })();
      }),
    [mcpConnections, updateServer, enqueueUpdate, storageV5, credentials, findServerClient],
  );
  useEffect(
    () =>
      CACHED_DIAL_FAILED_SIGNAL.subscribe((failedClient, retryable) => {
        getMcpClientModule().takeSettledCachedDialFailure(failedClient.name, failedClient.config);
        let currentClient = findServerClient(failedClient.name);
        if (
          currentClient?.type !== "cached" ||
          serverCacheKey(failedClient.name, currentClient.config) !==
            serverCacheKey(failedClient.name, failedClient.config)
        )
          return;
        updateServer({
          client: failedClient,
          tools: [],
          commands: [],
          replaceOnly: true,
        });
        if (retryable) strikeAfterLazyDialFailure(failedClient.name, failedClient.config);
      }),
    [updateServer, findServerClient],
  );
  useEffect(() => {
    if (store) return;
    let unsubscribe = setIdentityTrippedHandler(() => {
      if (identityTripEpoch.current === identityEpoch()) return;
      bumpConnectGeneration((bump) => bump + 1);
    });
    if (takeIdentityTripUnowned()) identityTripPending.current = true;
    return unsubscribe;
  }, [store]);
  let sessionId = getSessionId();
  useEffect(() => {
    if (store) return;
    async function initializeServersAsPending() {
      let {
        servers: existingConfigs,
        errors: mcpErrors,
        warnings,
        reservedNameRefusals = [],
      } = isStrictMcpConfig
        ? {
            servers: {},
            errors: [],
            warnings: [],
          }
        : await getClaudeCodeMcpConfigs(configs, {
            storageV5,
            admits: bareModePluginAllow(),
          });
      let reservedRefusals = mergeUniqueServerRefs(refusedReservedNames(), reservedNameRefusals);
      mcpConnections.setReservedNameRefusals(reservedRefusals);
      let reservedKeys = new Set(reservedRefusals.map((refusal) => `${refusal.scope}:${refusal.name}`));
      for (let key of reservedNameNoticeKeys.current)
        if (!reservedKeys.has(key)) reservedNameNoticeKeys.current.delete(key);
      for (let refusal of []) {
        let refusalKey = `${refusal.scope}:${refusal.name}`;
        if (reservedNameNoticeKeys.current.has(refusalKey)) continue;
        reservedNameNoticeKeys.current.add(refusalKey);
        addNotification({
          key: `mcp-reserved-name-${refusalKey}`,
          kind: "warning",
          priority: "high",
          text: emptyString_2(refusal),
          color: "warning",
          timeoutMs: 20000,
        });
      }
      let { configs: configs_2, blocked } = filterUnapprovedMcpServers(configs, browserExtensionAllowed);
      let configs_3 = {
        ...existingConfigs,
        ...configs_2,
      };
      let chromeServerRef = configs_2[CLAUDE_IN_CHROME_MCP_SERVER_NAME];
      if (chromeServerRef && dialsClaudeInChromeBridge(CLAUDE_IN_CHROME_MCP_SERVER_NAME, chromeServerRef))
        markClaudeInChromeRewired();
      if (blocked.length > 0) {
        blocked.sort();
        logForDebugging(`MCP servers blocked by managed policy at connect time: ${blocked.join(", ")}`, {
          level: "warn",
        });
        let joined = blocked.join(",");
        if (lastBlockedKey.current !== joined) {
          lastBlockedKey.current = joined;
          let prevStateDedup = [];
          let filtered = blocked.filter(
            (prevState) =>
              !prevStateDedup.includes(prevState) &&
              !(prevState === CLAUDE_ARTIFACTS && isCliOwnedConfig(configs && getOwn(configs, prevState))),
          );
          if (filtered.length > 0)
            addNotification({
              key: "mcp-blocked-policy",
              kind: "warning",
              priority: "high",
              text: `MCP ${plural(filtered.length, "server")} blocked by enterprise policy: ${filtered.join(", ")}`,
              color: "warning",
              timeoutMs: 12000,
            });
        }
        for (let serverName of blocked) {
          markClaudeInChromeUnwiredIfChrome(serverName);
          let serverRef = configs && getOwn(configs, serverName);
          if (serverRef)
            getMcpClientModule()
              .clearServerCache(serverName, serverRef)
              .catch(() => {});
        }
      } else lastBlockedKey.current = null;
      activePlugins.addErrors(mcpErrors);
      activePlugins.addWarnings(warnings);
      mcpConnections.reconcileConfiguredServers(configs_3, getOriginalCwd(), (removedClients) => {
        for (let removedClient of removedClients) {
          let timer = reconnectTimersRef.current.get(removedClient.name);
          if (timer) {
            timer();
            reconnectTimersRef.current.delete(removedClient.name);
          }
          channelRegisteredServers.current.delete(removedClient.name);
          initialRetryCounts.current.delete(removedClient.name);
          if (!isConnectedOrCached(removedClient)) continue;
          if (removedClient.type === "connected") identityId2(removedClient.client).onclose = undefined;
          getMcpClientModule()
            .clearServerCache(removedClient.name, removedClient.config)
            .catch(() => {});
        }
      });
    }
    initializeServersAsPending().catch((error) => {
      logMCPError(
        "useManageMCPConnections",
        `Failed to initialize servers as pending: ${errorMessage(error)}`,
      );
    });
  }, [
    isStrictMcpConfig,
    configs,
    mcpConnections,
    activePlugins,
    sessionId,
    pluginReconnectKey,
    policySnapshotKey,
    browserExtensionAllowed,
    storageV5,
    configRevision,
  ]);
  useEffect(() => {
    if (store) return;
    let cancelled = false;
    let pushUpdate = (error) =>
      updateServer(
        cancelled
          ? {
              ...error,
              superseded: true,
            }
          : {
              ...error,
              asked: true,
            },
      );
    async function loadAndConnectMcpConfigs() {
      let voiceLoginChanged =
        voiceLoginCompletedRef.current !== undefined &&
        voiceLoginCompletedRef.current !== voiceLoginCompleted;
      let generationChanged = lastConfigGeneration.current !== connectGeneration;
      lastConfigGeneration.current = connectGeneration;
      let identityTripped = identityTripPending.current;
      identityTripPending.current = false;
      let needsReconnect = voiceLoginChanged || generationChanged || identityTripped;
      if (needsReconnect) channelWarnedKindsRef.current = 0;
      primeDiscoveryCacheFlag();
      let discoveryCacheOn = isDiscoveryCacheOn();
      let applyIdentityBoundary =
        needsReconnect &&
        discoveryCacheOn &&
        (getMcpClientModule().mcpIdentityChangedSinceLastCheck() || identityTripped);
      if (applyIdentityBoundary) {
        let mcpClientModule = getMcpClientModule();
        let filtered = mcpConnections.get().clients.filter(isConnectedOrCached);
        let localServerNames = new Set();
        let localCacheKeys = new Set();
        let clients = mcpConnections.get().clients;
        for (let client of clients)
          if (!isRemoteMcpTransport(client.config)) {
            localServerNames.add(client.name);
            localCacheKeys.add(serverCacheKey(client.name, client.config));
          }
        let hasRemoteServers = hasRemoteMcpServers(clients);
        let evictedNames = new Set();
        for (let client of filtered) {
          if (localServerNames.has(client.name)) continue;
          if (client.type === "connected") identityId2(client.client).onclose = undefined;
          mcpClientModule.disposeServerConnectionDetached(client.name, client.config);
          evictedNames.add(client.name);
        }
        for (let client of mcpConnections.get().clients)
          if (
            client.type === "needs-auth" &&
            isRemoteMcpTransport(client.config) &&
            (client.config.type === "http" || client.config.type === "sse")
          )
            evictedNames.add(client.name);
        let proxyNames = new Set();
        for (let client of mcpConnections.get().clients)
          if (client.config.type === "claudeai-proxy" && !localServerNames.has(client.name))
            proxyNames.add(client.name);
        for (let key of [...reconnectTimersRef.current.keys()]) {
          if (localServerNames.has(key)) continue;
          reconnectTimersRef.current.get(key)?.();
          reconnectTimersRef.current.delete(key);
        }
        for (let serverName of [...channelRegisteredServers.current])
          if (!localServerNames.has(serverName)) channelRegisteredServers.current.delete(serverName);
        for (let key of [...initialRetryCounts.current.keys()])
          if (!localServerNames.has(key)) initialRetryCounts.current.delete(key);
        mcpConnections.applyIdentityBoundary(evictedNames, proxyNames);
        mcpClientModule.evictAllMcpMemosOnIdentityChange(localCacheKeys, hasRemoteServers);
        deleteNeedsAuthCache(storageV5);
        deferredToolCache().clear();
        identityTripEpoch.current = identityEpoch();
      }
      if (discoveryCacheOn) voiceLoginCompletedRef.current = voiceLoginCompleted;
      let claudeaiPromise;
      let fetchedClaudeAi = false;
      if (isStrictMcpConfig || isBareMode() || shouldSkipClaudeAiFetchForEnterpriseLockdown()) {
        markConnectorListUnavailable();
        claudeaiPromise = Promise.resolve({});
      } else {
        clearClaudeAiConfigsFetch();
        if (needsReconnect) {
          if (!applyIdentityBoundary) deleteNeedsAuthCache(storageV5);
          resetClaudeAiSessionConnections();
          gateOSeen.current = false;
        }
        voiceLoginCompletedRef.current = voiceLoginCompleted;
        fetchedClaudeAi = true;
        claudeaiPromise = fetchClaudeAiConfigsOnce(credentials);
      }
      let {
        servers: claudeCodeConfigs,
        errors: mcpErrors,
        warnings,
      } = isStrictMcpConfig
        ? {
            servers: {},
            errors: [],
            warnings: [],
          }
        : await getClaudeCodeMcpConfigs(configs, {
            storageV5,
            admits: bareModePluginAllow(),
          });
      if (cancelled) return;
      activePlugins.addErrors(mcpErrors);
      activePlugins.addWarnings(warnings);
      let filteredServers = filterUnapprovedMcpServers(configs, browserExtensionAllowed);
      let configs_2 = {
        ...claudeCodeConfigs,
        ...filteredServers.configs,
      };
      let enabledConfigs = filterObject(configs_2, (name, config) => !isMcpServerDisabled(config));
      if (Object.keys(enabledConfigs).length > 0 || (discoveryCacheOn && Object.keys(configs_2).length > 0))
        getMcpClientModule().seedMcpIdentityCheck();
      if (Object.keys(enabledConfigs).length > 0)
        getMcpClientModule()
          .getMcpToolsCommandsAndResources(pushUpdate, enabledConfigs, storageV5, credentials)
          .catch((error) => {
            logMCPError("useManageMcpConnections", `Failed to get MCP resources: ${errorMessage(error)}`);
          });
      let claudeaiConfigs = {};
      if (!isStrictMcpConfig) {
        let claudeAiConfigs = (await claudeaiPromise) ?? {};
        let { allowed, blocked } = filterMcpServersByPolicy(claudeAiConfigs);
        claudeaiConfigs = allowed;
        if (cancelled) return;
        try {
          try {
            if (fetchedClaudeAi && hasTransientConfigFailure(claudeAiConfigs)) {
              let retryIndex = channelWarnedKindsRef.current;
              let delayMs = CLAUDEAI_LIST_RETRY_DELAYS_MS[retryIndex];
              if (delayMs !== undefined) {
                logForDebugging(
                  `[claudeai-mcp] Connector-list fetch failed transiently; background retry ${retryIndex + 1}/${CLAUDEAI_LIST_RETRY_DELAYS_MS.length} in ${delayMs}ms`,
                );
                channelPermCallbacksRef.current = setAppState.setTimeout(() => {
                  channelPermCallbacksRef.current = null;
                  channelWarnedKindsRef.current += 1;
                  bumpClaudeAiRetryTick((prev) => prev + 1);
                }, delayMs);
              }
            } else if (fetchedClaudeAi) channelWarnedKindsRef.current = 0;
          } catch (error) {
            logMCPError(
              "useManageMcpConnections",
              `Failed to schedule claude.ai catalog retry: ${errorMessage(error)}`,
            );
          }
          if (hasDisableClaudeAiConnectors())
            for (let client of mcpConnections.get().clients) {
              if (client.config.scope !== "claudeai") continue;
              if (client.type === "disabled") continue;
              let cancelTimer = reconnectTimersRef.current.get(client.name);
              if (cancelTimer) {
                cancelTimer();
                reconnectTimersRef.current.delete(client.name);
              }
              channelRegisteredServers.current.delete(client.name);
              initialRetryCounts.current.delete(client.name);
              if (isConnectedOrCached(client)) {
                if (client.type === "connected") identityId2(client.client).onclose = undefined;
                getMcpClientModule()
                  .clearServerCache(client.name, client.config)
                  .catch(() => {});
              }
              enqueueUpdate({
                name: client.name,
                type: "failed",
                config: client.config,
                error: DISABLED_BY_SETTING_REASON,
              });
            }
          if (blocked.length > 0) {
            logForDebugging(
              `claude.ai connectors blocked by managed policy at connect time: ${blocked.join(", ")}`,
              {
                level: "warn",
              },
            );
            for (let blockedName of blocked) {
              let found = mcpConnections
                .get()
                .clients.find(
                  (prevState) => prevState.name === blockedName && prevState.config.scope === "claudeai",
                );
              if (!found) continue;
              let cancelTimer = reconnectTimersRef.current.get(blockedName);
              if (cancelTimer) {
                cancelTimer();
                reconnectTimersRef.current.delete(blockedName);
              }
              if (isConnectedOrCached(found)) {
                if (found.type === "connected") identityId2(found.client).onclose = undefined;
                getMcpClientModule()
                  .clearServerCache(blockedName, found.config)
                  .catch(() => {});
              }
              enqueueUpdate({
                name: blockedName,
                type: "failed",
                config: found.config,
                error: BLOCKED_BY_POLICY_REASON,
              });
            }
          }
          let crossOrgNotice = takePendingCrossOrgNotice();
          if (crossOrgNotice)
            addNotification({
              key: "claudeai-mcp-cross-org-override",
              priority: "immediate",
              text:
                crossOrgNotice.level === "error"
                  ? crossOrgNotice.message
                  : `\u26A0 ${crossOrgNotice.message}`,
              color: crossOrgNotice.level === "error" ? "error" : "warning",
              timeoutMs: 20000,
            });
          let suppressedLists = [];
          if (Object.keys(claudeaiConfigs).length > 0) {
            let { servers, suppressed } = await dedupClaudeAiMcpServers(claudeaiConfigs, configs_2);
            if (cancelled) return;
            claudeaiConfigs = servers;
            suppressedLists = suppressed;
          }
          mcpConnections.setSuppressedClaudeAiConnectors(suppressedLists);
          if (Object.keys(claudeaiConfigs).length > 0) {
            mcpConnections.addPendingServers(claudeaiConfigs);
            let enabledClaudeAiConfigs = filterObject(
              claudeaiConfigs,
              (name, config) => !isMcpServerDisabled(config),
            );
            if (
              Object.keys(enabledClaudeAiConfigs).length > 0 ||
              (discoveryCacheOn && Object.keys(claudeaiConfigs).length > 0)
            )
              getMcpClientModule().seedMcpIdentityCheck();
            if (Object.keys(enabledClaudeAiConfigs).length > 0)
              getMcpClientModule()
                .getMcpToolsCommandsAndResources(pushUpdate, enabledClaudeAiConfigs, storageV5, credentials)
                .catch((error) => {
                  logMCPError(
                    "useManageMcpConnections",
                    `Failed to get claude.ai MCP resources: ${errorMessage(error)}`,
                  );
                });
          }
        } finally {
          if (!cancelled) {
            let filteredAgain = filterUnapprovedMcpServers(configs, browserExtensionAllowed);
            let configsChanged =
              !import_sortedIndex_2(
                Object.keys(filteredServers.configs).sort(),
                Object.keys(filteredAgain.configs).sort(),
              ) ||
              !import_sortedIndex_2([...filteredServers.blocked].sort(), [...filteredAgain.blocked].sort());
            let transientFailure = hasTransientConfigFailure(claudeAiConfigs);
            let gateONeedsRefresh =
              isGateOOn() && hasManagedMcpPolicy() && !transientFailure && !gateOSeen.current;
            if (configsChanged || gateONeedsRefresh) {
              if (!transientFailure) gateOSeen.current = true;
              bumpConfigRevision((error) => error + 1);
            }
          }
        }
      }
      let allConfigs = {
        ...configs_2,
        ...claudeaiConfigs,
      };
      let scopeCounts = {
        enterprise: 0,
        global: 0,
        project: 0,
        user: 0,
        plugin: 0,
        agent: 0,
        claudeai: 0,
      };
      let unusedValue = [];
      for (let [key, value] of Object.entries(allConfigs)) {
        let telemetrySource = value.scope ? SCOPE_TO_TELEMETRY_SOURCE[value.scope] : undefined;
        if (telemetrySource) scopeCounts[telemetrySource]++;
      }
      logEvent("tengu_mcp_servers", {
        ...scopeCounts,
        ...false,
      });
    }
    loadAndConnectMcpConfigs().catch((error) => {
      logMCPError("useManageMcpConnections", `MCP connect failed on mount: ${describeErrorBrief(error)}`);
    });
    return () => {
      cancelled = true;
      channelPermCallbacksRef.current?.();
      channelPermCallbacksRef.current = null;
    };
  }, [
    isStrictMcpConfig,
    configs,
    updateServer,
    mcpConnections,
    activePlugins,
    voiceLoginCompleted,
    connectGeneration,
    sessionId,
    pluginReconnectKey,
    policySnapshotKey,
    browserExtensionAllowed,
    storageV5,
    credentials,
    setAppState,
    claudeAiRetryTick,
    configRevision,
  ]);
  useEffect(() => {
    let timers = reconnectTimersRef.current;
    return () => {
      for (let timer of timers.values()) timer();
      timers.clear();
      if (flushTimerRef.current !== null) {
        flushTimerRef.current();
        flushTimerRef.current = null;
        flushPendingUpdates();
      }
    };
  }, [flushPendingUpdates]);
  let reconnectMcpServer = useCallback(
    async (
      serverName,
      options = {
        discardDiscovery: true,
      },
    ) => {
      let existing = inflightReconnects.current.get(serverName);
      while (options.revokeTokens && existing && existing.epoch === identityEpoch()) {
        await existing.attempt.catch(() => {});
        existing = inflightReconnects.current.get(serverName);
      }
      if (existing && existing.epoch === identityEpoch()) {
        if (
          isDiscoveryCacheUsable() &&
          options.discardDiscovery &&
          !existing.discardDiscovery &&
          !existing.connectNow
        ) {
          let found = mcpConnections.get().clients.find((serverName_2) => serverName_2.name === serverName);
          if (found)
            getMcpClientModule()
              .dropDiscoveryEntry(serverName, found.config)
              .catch(() => {});
        }
        return existing.attempt;
      }
      let client = mcpConnections.get().clients.find((client) => client.name === serverName);
      if (!client)
        throw withTelemetryMessage(
          Error(`MCP server ${serverName} not found`),
          "MCP server not found in store",
        );
      if (isMcpServerDisabled(serverName))
        throw new WireSafeControlError(
          client.type === "disabled"
            ? disabledEnableInMcpText(serverName)
            : disabledElsewhereText(serverName),
          "MCP server disabled; enable before reconnect",
        );
      let existingTimer = reconnectTimersRef.current.get(serverName);
      if (existingTimer) {
        existingTimer();
        reconnectTimersRef.current.delete(serverName);
      }
      let epoch = identityEpoch();
      let cacheOnly = client.type === "cached" || client.type === "pending";
      let distrustDiscovery = options.discardDiscovery && !cacheOnly;
      let attempt = (async () => {
        enqueueUpdate({
          name: serverName,
          type: "pending",
          config: client.config,
        });
        try {
          let configOverride = options.keepConfig
            ? undefined
            : ((configs && getOwn(configs, serverName)) ??
              (isStrictMcpConfig
                ? undefined
                : getOwn(
                    (
                      await getClaudeCodeMcpConfigs(configs, {
                        storageV5,
                        admits: bareModePluginAllow(),
                      })
                    ).servers,
                    serverName,
                  )));
          let effectiveConfig = configOverride ?? client.config;
          let blockedCause = mcpDialBlockCause(serverName, effectiveConfig);
          if (blockedCause) {
            markClaudeInChromeUnwiredIfChrome(serverName);
            throw mcpRefusalError(
              serverName,
              blockedCause,
              effectiveConfig,
              `MCP server ${normalizeServerNameShort(serverName)} is blocked by enterprise managed policy`,
            );
          }
          let revokeResult = options.revokeTokens
            ? await revokeStoredMcpTokens(serverName, [client.config, effectiveConfig])
            : undefined;
          if (revokeResult && !revokeResult.cleared && revokeResult.reason !== "keychain_unreadable")
            throw new WireSafeControlError(
              `Claude Code did not reconnect to ${normalizeServerNameShort(serverName)}: sign-in data for the config in your settings is still stored, or the credential store could not be read. Restart Claude Code and use Clear authentication again.`,
              "MCP clear-auth reconnect: credential store not cleared",
            );
          if (client.type === "connected") identityId2(client.client).onclose = undefined;
          let result = await (distrustDiscovery
            ? getMcpClientModule().reconnectMcpServerDistrusted(
                serverName,
                effectiveConfig,
                storageV5,
                credentials,
              )
            : getMcpClientModule().reconnectMcpServerImpl(
                serverName,
                effectiveConfig,
                storageV5,
                credentials,
              ));
          if (isMcpServerDisabled(serverName)) {
            if (result.client.type === "connected") detachClientAndClearCache(result.client);
            throw new WireSafeControlError(
              `"${normalizeServerNameShort(serverName)}" was disabled while reconnecting`,
              "MCP server disabled during reconnect",
            );
          }
          if (identityEpoch() === epoch) {
            updateServer(
              configOverride === undefined
                ? result
                : {
                    ...result,
                    asked: true,
                  },
            );
            if (configOverride === undefined) {
              flushTimerRef.current?.();
              flushPendingUpdates();
              let keptClient = keptConnectionOrFailed(
                result.client,
                mcpConnections.get().clients.find((client) => client.name === serverName),
              );
              if (keptClient !== result.client)
                return {
                  ...result,
                  client: keptClient,
                  tools: [],
                  commands: [],
                };
            }
          }
          return result;
        } catch (error) {
          if (identityEpoch() === epoch) enqueueUpdate(client);
          throw error;
        }
      })();
      let entry = {
        attempt,
        epoch,
        discardDiscovery: distrustDiscovery,
        connectNow: cacheOnly,
      };
      inflightReconnects.current.set(serverName, entry);
      try {
        return await attempt;
      } finally {
        if (inflightReconnects.current.get(serverName) === entry)
          inflightReconnects.current.delete(serverName);
      }
    },
    [
      mcpConnections,
      enqueueUpdate,
      updateServer,
      flushPendingUpdates,
      configs,
      isStrictMcpConfig,
      storageV5,
      credentials,
    ],
  );
  let toggleMcpServer = useCallback(
    async (serverName) => {
      let client = mcpConnections.get().clients.find((client) => client.name === serverName);
      if (!client)
        throw withTelemetryMessage(
          Error(`MCP server ${serverName} not found`),
          "MCP server not found in store",
        );
      if (client.type !== "disabled") {
        let cancelTimer = reconnectTimersRef.current.get(serverName);
        if (cancelTimer) {
          cancelTimer();
          reconnectTimersRef.current.delete(serverName);
        }
        setMcpServerEnabled(serverName, false, storageV5);
        channelRegisteredServers.current.delete(serverName);
        initialRetryCounts.current.delete(serverName);
        if (client.type === "connected")
          await getMcpClientModule().clearServerCache(serverName, client.config);
        else if (client.type === "cached")
          getMcpClientModule().disposeServerConnectionDetached(serverName, client.config);
        if (isDiscoveryCacheUsable())
          getMcpClientModule()
            .dropDiscoveryEntry(serverName, client.config)
            .catch(() => {});
        let disabledClient = {
          name: serverName,
          type: "disabled",
          config: client.config,
        };
        enqueueUpdate(disabledClient);
        return disabledClient;
      } else {
        let configOverride =
          (configs && getOwn(configs, serverName)) ??
          (isStrictMcpConfig
            ? undefined
            : getOwn(
                (
                  await getClaudeCodeMcpConfigs(configs, {
                    storageV5,
                    admits: bareModePluginAllow(),
                  })
                ).servers,
                serverName,
              ));
        let effectiveConfig = configOverride ?? client.config;
        let asked = configOverride !== undefined;
        let blockedCause = mcpDialBlockCause(serverName, effectiveConfig);
        if (blockedCause) {
          markClaudeInChromeUnwiredIfChrome(serverName);
          throw mcpRefusalError(
            serverName,
            blockedCause,
            effectiveConfig,
            `MCP server ${normalizeServerNameShort(serverName)} is blocked by enterprise managed policy`,
          );
        }
        setMcpServerEnabled(serverName, true, storageV5);
        enqueueUpdate({
          name: serverName,
          type: "pending",
          config: effectiveConfig,
          ...(asked && {
            asked: true,
          }),
        });
        let epoch = identityEpoch();
        let result = await getMcpClientModule().reconnectMcpServerImpl(
          serverName,
          effectiveConfig,
          storageV5,
          credentials,
        );
        if (isMcpServerDisabled(serverName)) {
          if (result.client.type === "connected") detachClientAndClearCache(result.client);
          enqueueUpdate({
            name: serverName,
            type: "disabled",
            config: effectiveConfig,
          });
          throw new WireSafeControlError(
            `"${normalizeServerNameShort(serverName)}" was disabled while enabling`,
            "MCP server disabled during enable",
          );
        }
        if (identityEpoch() === epoch) {
          updateServer(
            asked
              ? {
                  ...result,
                  asked: true,
                }
              : result,
          );
          if (!asked) {
            flushTimerRef.current?.();
            flushPendingUpdates();
            return keptConnectionOrFailed(
              result.client,
              mcpConnections.get().clients.find((client) => client.name === serverName),
            );
          }
        }
        return result.client;
      }
    },
    [
      mcpConnections,
      enqueueUpdate,
      updateServer,
      flushPendingUpdates,
      configs,
      isStrictMcpConfig,
      storageV5,
      credentials,
    ],
  );
  return {
    reconnectMcpServer,
    toggleMcpServer,
  };
}
//@ chunk-18hwfzwa.js:1737581-1737678 layout
function detachClientAndClearCache(client) {
  identityId2(client.client).onclose = undefined;
  getMcpClientModule()
    .clearServerCache(client.name, client.config)
    .catch(() => {});
}
//@ chunk-18hwfzwa.js:1737678-1737748 layout
/**
 * getMcpClientModule：经 chunk-asne9cp8 按 MCP_SDK_GENERATION 取 v1/v2 客户端模块（mcpClientModule）。
 */
function getMcpClientModule() {
  return require("./emitTripwireEvent.lazy.js").mcpClientModule();
}
//@ chunk-18hwfzwa.js:1737748-1737859 fingerprint = getTransportDisplayName (1)
/**
 * getTransportDisplayName：http → HTTP，ws/ws-ide → WebSocket，其他 → SSE。
 */
function getTransportDisplayName(type) {
  switch (type) {
    case "http":
      return "HTTP";
    case "ws":
    case "ws-ide":
      return "WebSocket";
    default:
      return "SSE";
  }
}
//@ chunk-18hwfzwa.js:1737859-1738004 placement
function mcpPolicySnapshotKey(settings) {
  return jsonStringify([
    settings.allowedMcpServers ?? null,
    settings.deniedMcpServers ?? null,
    settings.managedMcpServers ?? null,
    settings.disableClaudeAiConnectors ?? null,
    getEffectiveMcpPolicyKey(),
  ]);
}
//@ chunk-18hwfzwa.js:1738004-1738045 placement
var ALLOW_CLAUDE_BROWSER_EXTENSION = "allow_claude_browser_extension";
export { ALLOW_CLAUDE_BROWSER_EXTENSION, useManageMCPConnections, redialFailedMcpServers, getErrorKey };
