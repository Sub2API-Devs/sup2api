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
import { init_react_production, R, y, P, ce } from "../../../vendor/react/cjs/react.production.js";
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
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { isGateOOn } from "../../utils/settings/settingsSourceTrust.js";
import { revokeStoredMcpTokens } from "./revokeTokens.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-18hwfzwa.js:1709347-1709351 placement
init_react_production();
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
  let D = new Map();
  let L = (name) => {
    let Be = searchRedialFailures.get(name);
    return Be !== undefined && performance.now() - Be.endedAt < DIAL_RESULT_TTL_MS ? Be : undefined;
  };
  let ee = (Re) => {
    try {
      if (!isRetryableRemoteFailure(Re) || (Re.config.type !== "http" && Re.config.type !== "sse"))
        return false;
      let Be = URL.parse(Re.config.url);
      return (
        Be !== null &&
        !BEARER_REJECT_CODES.has(Re.errorCode ?? "") &&
        isLoopbackHost(Be.hostname) &&
        !Be.username &&
        !Be.password &&
        !Be.search &&
        Be.pathname.split("/").every((He) => He.length < MAX_PATH_SEGMENT_CHARS) &&
        !Re.config.oauth &&
        !usesNonOAuthAuth(Re.config) &&
        (L(Re.name)?.count ?? 0) < MAX_TOKEN_STORED_RETRIES &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_floating_lagoon", false) &&
        !isCliOwnedConfig(Re.config) &&
        !isMcpServerDisabled(Re.name) &&
        !mcpDialBlockCause(Re.name, Re.config)
      );
    } catch (error) {
      logError(error);
      return false;
    }
  };
  let ke = async ({ name: serverName, config }) => {
    let He = "not_connected";
    try {
      let We =
        (config.type !== "http" && config.type !== "sse") ||
        (await hasMcpDiscoveryButNoToken(serverName, config));
      if (We === READ_FAILED) He = "store_unreadable";
      else if (We) He = "token_stored";
      else {
        let { client } = await reconnectMcpServer(serverName, {
          discardDiscovery: false,
          keepConfig: true,
        });
        if (client.type === "connected") He = "connected";
      }
    } catch (error) {
      logMCPDebug(serverName, `Re-dial for a search threw: ${errorMessage(error)}`);
    }
    if (He === "connected") searchRedialFailures.delete(serverName);
    else
      searchRedialFailures.set(serverName, {
        count: He === "token_stored" ? MAX_TOKEN_STORED_RETRIES : (L(serverName)?.count ?? 0) + 1,
        endedAt: performance.now(),
      });
    D.delete(serverName);
    return He;
  };
  return {
    allows: ee,
    async redial(Re, Be, He) {
      let filtered = Re.filter(
        (kt) => ee(kt) && performance.now() - (L(kt.name)?.endedAt ?? -1 / 0) >= REOPEN_REFETCH_BASE_MS,
      );
      if (filtered.length === 0) return;
      let mapped = filtered.map((kt) => {
        let At = D.get(kt.name) ?? ke(kt);
        D.set(kt.name, At);
        return At;
      });
      let Xe = await withDeadline(
        raceWithAbortSignal(Promise.all(mapped), He, () => new AbortError()),
        Be,
      );
      let rt = Xe === undefined ? "wait_ran_out" : Xe.find((kt) => kt !== "connected");
      if (rt === undefined) logFeatureOk("mcp_search_redial");
      else logFeatureSad("mcp_search_redial", rt);
    },
  };
}
//@ chunk-18hwfzwa.js:1710878-1711114 placement
function keptConnectionOrFailed(client, x) {
  return client.type !== "connected" || (x?.type === "connected" && x.client === client.client)
    ? client
    : {
        name: client.name,
        type: "failed",
        config: client.config,
        error: "The connection was not kept: the server was removed, changed, disabled or refused meanwhile",
      };
}
//@ chunk-18hwfzwa.js:1711114-1711118 placement
init_react_production();
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
function useManageMCPConnections(dynamicMcpConfig, isStrictMcpConfig, permissionRelays, requestDialog) {
  let store = getIsRemoteMode();
  let { storageV5, credentials } = useTheme_2();
  let commandQueueOrDefault = useCommandQueueOrDefault();
  let mcpConnections = useMcpConnections();
  let activePlugins = useActivePlugins();
  let voiceLoginCompleted = useVoiceLoginCompleted();
  let voiceLoginCompletedRef = R(undefined);
  let [rt, kt] = y(0);
  let At = R(0);
  let It = R(undefined);
  let Ot = R(false);
  let Et = useAppState((_o) => mcpPolicySnapshotKey(_o.settings));
  let browserExtensionAllowed = useBrowserExtensionAllowed();
  let Lt = useAppState((_o) => _o.mcp.pluginReconnectKey);
  let setAppState = useClock();
  let reconnectTimersRef = R(new Map());
  let [io, so] = y(0);
  let channelWarnedKindsRef = R(0);
  let channelPermCallbacksRef = R(null);
  let [co, bo] = y(0);
  let Ao = R(false);
  let Bo = R(new Map());
  let Ro = R(new Map());
  let Ho = R(null);
  let Io = R(new Set());
  let Wo = R(new Set());
  let mn = R(new Set());
  let channelPermissionCallbacksRef = R(null);
  if (channelPermissionCallbacksRef.current === null && !store)
    channelPermissionCallbacksRef.current = createChannelPermissionCallbacks((_o) => mn.current.has(_o));
  P(() => {
    let callbacks = channelPermissionCallbacksRef.current;
    if (!callbacks) return;
    if (!isChannelPermissionRelayEnabled()) return;
    permissionRelays.setChannel(callbacks);
    return () => {
      permissionRelays.setChannel(undefined);
    };
  }, [permissionRelays]);
  let { addNotification, removeNotification } = useNotifications();
  let Yo = R(new Set());
  P(
    () =>
      AUTH_LOST_SIGNAL.subscribe((prev) => {
        if (Yo.current.has(prev)) return;
        let found = mcpConnections.get().clients.find((prev_2) => prev_2.name === prev);
        if (found?.type !== "connected") return;
        Yo.current.add(prev);
        (async () => {
          let Dn = false;
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
            Dn = true;
          } catch (error) {
            logMCPDebug(prev, `Auth-lost notice skipped: ${errorMessage(error)}`);
          } finally {
            if (!Dn) Yo.current.delete(prev);
          }
        })();
      }),
    [mcpConnections, addNotification, credentials],
  );
  let MCP_BATCH_FLUSH_MS = 16;
  let pendingUpdatesRef = R([]);
  let flushTimerRef = R(null);
  let flushPendingUpdates = ce(() => {
    flushTimerRef.current = null;
    let updates = pendingUpdatesRef.current;
    if (updates.length === 0) return;
    pendingUpdatesRef.current = [];
    mcpConnections.applyQueuedUpdates(updates, {
      currentEpoch: identityEpoch(),
      onDoorDenied: markClaudeInChromeUnwiredIfChrome,
      onOrphanedDisable: (prevState) => {
        Ro.current.delete(prevState);
        mn.current.delete(prevState);
        let Dn = reconnectTimersRef.current.get(prevState);
        if (Dn) {
          Dn();
          reconnectTimersRef.current.delete(prevState);
        }
      },
    });
  }, [mcpConnections]);
  let hn = ce(
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
  let Mn = ce(
    (_o) => {
      let name = mcpConnections.get().clients.find((client) => client.name === _o);
      for (let Dn of pendingUpdatesRef.current)
        if (Dn.name === _o && checkMcpServerHealth_2(name, Dn)) name = Dn;
      return name;
    },
    [mcpConnections],
  );
  let updateServer = ce(
    ({ client, tools, commands, resources, resourceTemplates, replaceOnly, asked, superseded }) => {
      hn({
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
        let Zn = takeScopeExpansionNotice();
        if (Zn)
          addNotification({
            key: "mcp-first-party-scope-expanded",
            kind: "event",
            priority: "high",
            text: Zn,
            color: "remember",
            timeoutMs: 12000,
          });
      }
      switch (client.type) {
        case "connected": {
          Ro.current.set(client.name, MAX_INITIAL_CONNECT_RETRIES);
          Yo.current.delete(client.name);
          removeNotification(`mcp-reconnect-failed-${client.name}`);
          let { registerElicitationHandler } = require("./chunk-asne9cp8.js").mcpElicitationHandlerModule();
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
              let Ur = identityEpoch();
              let reconnectWithBackoff = () => identityEpoch() === Ur || !isRemoteMcpTransport(client.config);
              let wr = () => {
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
                    hn({
                      ...client,
                    });
                    return;
                  }
                  if (!reconnectWithBackoff()) {
                    logMCPDebug(client.name, "Identity changed during reconnection, stopping retry");
                    return;
                  }
                  let fr = mcpDialBlockCause(client.name, client.config);
                  if (fr) {
                    markClaudeInChromeUnwiredIfChrome(client.name);
                    logMCPDebug(
                      client.name,
                      "Server blocked by managed policy during reconnection, stopping retry",
                    );
                    reconnectTimersRef.current.delete(client.name);
                    hn({
                      name: client.name,
                      type: "failed",
                      config: client.config,
                      ...mcpGateError(fr, client.name, client.config),
                    });
                    return;
                  }
                  hn({
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
                      if (result.client.type === "failed") wr();
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
                      hn({
                        ...client,
                        type: "failed",
                      });
                      wr();
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
              mn.current.delete(client.name);
              hn({
                ...client,
                type: "failed",
              });
            }
          };
          let Un = gateChannelServer(
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
          let pr = false;
          let Qn = () => {
            mn.current.add(client.name);
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
          switch (Un.action) {
            case "register":
              logMCPDebug(client.name, "Channel notifications registered");
              Qn();
              pr = true;
              break;
            case "skip": {
              let Pr = isChannelGateHardRevocation(Un.kind);
              let ts = mn.current.has(client.name);
              if (Pr) {
                mn.current.delete(client.name);
                let Ur = identityId2(client.client);
                Ur.removeNotificationHandler("notifications/claude/channel");
                Ur.removeNotificationHandler(CHANNEL_PERMISSION_METHOD);
              } else if (ts) {
                logMCPDebug(
                  client.name,
                  `Channel gate says skip:${Un.kind} but was previously registered \u2014 preserving handler`,
                );
                Qn();
                pr = true;
                break;
              }
              logMCPDebug(client.name, `Channel notifications skipped: ${Un.reason}`);
              let Gn =
                Un.kind === "capability" || Un.kind === "session"
                  ? null
                  : Un.kind === "era"
                    ? `era:${client.name}`
                    : Un.kind;
              if (
                Gn !== null &&
                !Wo.current.has(Gn) &&
                (Un.kind === "marketplace" || Un.kind === "allowlist" || timer !== undefined)
              ) {
                Wo.current.add(Gn);
                let text =
                  Un.kind === "disabled"
                    ? "Channels are not currently available"
                    : Un.kind === "provider"
                      ? "Channels are not available on Bedrock, Vertex, or Foundry"
                      : Un.kind === "policy"
                        ? "Channels are not enabled for your org \xB7 have an administrator set channelsEnabled: true in managed settings"
                        : Un.kind === "era"
                          ? `Channel messages from "${client.name}" are unavailable: this connection's protocol version has no channel delivery path`
                          : Un.reason;
                addNotification({
                  key:
                    Un.kind === "era" ? `channels-blocked-era-${client.name}` : `channels-blocked-${Un.kind}`,
                  priority: "high",
                  text,
                  color: "warning",
                  timeoutMs: 12000,
                });
              }
              break;
            }
          }
          if (pr || (Un.action === "skip" && Un.kind !== "capability"))
            logEvent("tengu_mcp_channel_gate", {
              registered: pr,
              skip_kind: Un.action === "skip" ? fromEnum(Un.kind) : undefined,
              entry_kind: fromEnumOpt(timer?.kind),
              is_dev: timer?.dev ?? false,
              plugin,
            });
          let ur = identityEpoch();
          let Ir = () => identityEpoch() === ur || !isRemoteMcpTransport(client.config);
          if (client.capabilities?.tools?.listChanged)
            getMcpClientModule().onMcpToolListChanged(client, async (Pr) => {
              if (!Ir()) return;
              let { fetchToolsForClient, getToolsListErrorForResult, persistRefreshedToolsIfPresent } =
                getMcpClientModule();
              let Zr = cacheGrantLeg(client.name, client.config);
              let cause = refetchReasonTelemetry(Pr);
              logMCPDebug(
                client.name,
                Pr === REOPEN_REFETCH
                  ? "Synthesized tools refetch after listen-stream reopen (no notification received)"
                  : "Received tools/list_changed notification, refreshing tools",
              );
              try {
                let zr = serverCacheKey(client.name, client.config);
                let previousToolsPromise = fetchToolsForClient.cache.get(zr);
                fetchToolsForClient.cache.delete(zr);
                let toolsForClient = await fetchToolsForClient(client, storageV5);
                let toolsListErrorForResult = getToolsListErrorForResult(toolsForClient);
                if (toolsListErrorForResult)
                  logForDebugging(
                    `[mcp] ${client.name}: tools/list_changed refresh failed (${toolsListErrorForResult}); keeping previous tools`,
                    {
                      level: "warn",
                    },
                  );
                let Yr = client.discoveryAuthFailure && toolsForClient.length === 0;
                if (Yr)
                  logMCPDebug(
                    client.name,
                    "tools refresh returned the needs-auth empty list; keeping previous tools",
                  );
                let newCount = toolsForClient.length;
                let Vr = Boolean(toolsListErrorForResult) || Yr;
                if (!Vr && previousToolsPromise)
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
                else if (!Vr)
                  logEvent("tengu_mcp_list_changed", {
                    mcpServerKeyHash: toolNameForTelemetry(client.name),
                    type: lit_2("tools"),
                    cause,
                    newCount,
                  });
                if (!Ir()) return;
                hn({
                  ...client,
                  tools: toolsListErrorForResult || Yr ? undefined : decorateMcpTools(client, toolsForClient),
                });
                if (!Vr && isDiscoveryCacheOn())
                  Zr.then((grantLeg) =>
                    persistRefreshedToolsIfPresent(client, toolsForClient, {
                      identityEpoch: ur,
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
            getMcpClientModule().onMcpPromptListChanged(client, async (Pr) => {
              if (!Ir()) return;
              let { fetchCommandsForClient, getDiscoveryFetchError } = getMcpClientModule();
              logMCPDebug(
                client.name,
                Pr === REOPEN_REFETCH
                  ? "Synthesized prompts refetch after listen-stream reopen (no notification received)"
                  : "Received prompts/list_changed notification, refreshing prompts",
              );
              try {
                fetchCommandsForClient.cache.delete(serverCacheKey(client.name, client.config));
                let [commandsForClient, Zr] = await Promise.all([
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
                if (!Ir()) return;
                hn({
                  ...client,
                  commands: discoveryFetchError
                    ? undefined
                    : stampToolScope(client, [...commandsForClient, ...Zr]),
                });
                clearSkillIndex();
                logEvent("tengu_mcp_list_changed", {
                  mcpServerKeyHash: toolNameForTelemetry(client.name),
                  type: lit_2("prompts"),
                  cause: refetchReasonTelemetry(Pr),
                });
              } catch (error) {
                logMCPError(
                  client.name,
                  `Failed to refresh prompts after list_changed notification: ${describeConnectError(error, client.config)}`,
                );
              }
            });
          if (client.capabilities?.resources)
            getMcpClientModule().onMcpResourceListChanged(client, async (Pr) => {
              if (!Ir()) return;
              let {
                fetchResourcesForClient,
                fetchResourceTemplatesForClient,
                fetchCommandsForClient,
                getDiscoveryFetchError,
              } = getMcpClientModule();
              logMCPDebug(
                client.name,
                Pr === REOPEN_REFETCH
                  ? "Synthesized resources refetch after listen-stream reopen (no notification received)"
                  : "Received resources/list_changed notification, refreshing resources",
              );
              try {
                let wr = serverCacheKey(client.name, client.config);
                fetchResourcesForClient.cache.delete(wr);
                fetchResourceTemplatesForClient.cache.delete(wr);
                {
                  let [resourcesForClient, resourceTemplatesForClient] = await Promise.all([
                    fetchResourcesForClient(client),
                    fetchResourceTemplatesForClient(client),
                  ]);
                  let discoveryFetchError = getDiscoveryFetchError(resourcesForClient);
                  let discoveryFetchError_2 = getDiscoveryFetchError(resourceTemplatesForClient);
                  let Yr = discoveryFetchError ?? discoveryFetchError_2;
                  if (Yr)
                    logForDebugging(
                      `[mcp] ${client.name}: resources/list_changed refresh partial failure (${describeConnectError(Yr, client.config)}); keeping previous for failed fields`,
                      {
                        level: "warn",
                      },
                    );
                  if (!Ir()) return;
                  hn({
                    ...client,
                    resources: discoveryFetchError ? undefined : resourcesForClient,
                    resourceTemplates: discoveryFetchError_2 ? undefined : resourceTemplatesForClient,
                  });
                }
                logEvent("tengu_mcp_list_changed", {
                  mcpServerKeyHash: toolNameForTelemetry(client.name),
                  type: lit_2("resources"),
                  cause: refetchReasonTelemetry(Pr),
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
          let attempt = (Ro.current.get(client.name) ?? 0) + 1;
          if (isRetryableRemoteFailure(client) && attempt <= MAX_INITIAL_CONNECT_RETRIES) {
            Ro.current.set(client.name, attempt);
            let Un = retryDelayMs(attempt);
            logMCPDebug(
              client.name,
              `Transient ${client.errorCode ?? "<sse-no-code>"} on initial connect \u2014 retry ${attempt}/${MAX_INITIAL_CONNECT_RETRIES} in ${Un}ms`,
            );
            hn({
              name: client.name,
              config: client.config,
              type: "pending",
              reconnectAttempt: attempt,
              maxReconnectAttempts: MAX_INITIAL_CONNECT_RETRIES,
            });
            let dr = reconnectTimersRef.current.get(client.name);
            if (dr) dr();
            let or = identityEpoch();
            let pr = setAppState.setTimeout(() => {
              reconnectTimersRef.current.delete(client.name);
              if (isMcpServerDisabled(client.name)) {
                hn({
                  ...client,
                });
                return;
              }
              if (identityEpoch() !== or) return;
              let Qn = mcpDialBlockCause(client.name, client.config);
              if (Qn) {
                markClaudeInChromeUnwiredIfChrome(client.name);
                logMCPDebug(
                  client.name,
                  "Server blocked by managed policy during initial-connect retry, stopping retry",
                );
                hn({
                  name: client.name,
                  type: "failed",
                  config: client.config,
                  ...mcpGateError(Qn, client.name, client.config),
                });
                return;
              }
              getMcpClientModule()
                .reconnectMcpServerImpl(client.name, client.config, storageV5, credentials)
                .then(
                  (ur) => {
                    if (identityEpoch() !== or) return;
                    updateServer(ur);
                  },
                  (error) => {
                    logMCPError(
                      client.name,
                      `Initial-connect retry ${attempt} threw: ${describeConnectError(error, client.config)}`,
                    );
                    if (identityEpoch() !== or) return;
                    hn({
                      ...client,
                    });
                  },
                );
            }, Un);
            reconnectTimersRef.current.set(client.name, pr);
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
      hn,
      addNotification,
      removeNotification,
      commandQueueOrDefault,
      storageV5,
      credentials,
      requestDialog,
    ],
  );
  P(
    () =>
      REAUTH_RECONNECT_SIGNAL.subscribe((_o, cn) => {
        (async () => {
          let Dn = () =>
            void getMcpClientModule()
              .clearServerCache(_o, cn)
              .catch(() => {});
          let wn = identityEpoch();
          try {
            let found = mcpConnections.get().clients.find((client) => client.name === _o);
            if (
              found === undefined ||
              !isConnectedOrCached(found) ||
              isMcpServerDisabled(_o) ||
              isMcpDialBlockedByPolicy(_o, cn)
            ) {
              Dn();
              return;
            }
            if (serverCacheKey(_o, found.config) !== serverCacheKey(_o, cn)) {
              Dn();
              return;
            }
            let mcpClientModule = getMcpClientModule();
            let Wn = await mcpClientModule.connectToServer(_o, cn, undefined, storageV5, credentials);
            if (identityEpoch() !== wn) {
              if (Wn.type === "connected") mcpClientModule.detachAndCloseConnection(Wn);
              return;
            }
            if (Wn.type !== "connected") return;
            let [Fr, Zn, Un, dr] = await Promise.all([
              mcpClientModule.fetchToolsForClient(Wn, storageV5),
              mcpClientModule.fetchCommandsForClient(Wn),
              Promise.resolve([]),
              Wn.capabilities?.resources ? mcpClientModule.fetchResourcesForClient(Wn) : Promise.resolve([]),
            ]);
            if (identityEpoch() !== wn) {
              mcpClientModule.detachAndCloseConnection(Wn);
              return;
            }
            let found_2 = mcpConnections.get().clients.find((client) => client.name === _o);
            if (
              found_2 === undefined ||
              !isConnectedOrCached(found_2) ||
              isMcpServerDisabled(_o) ||
              isMcpDialBlockedByPolicy(_o, cn) ||
              serverCacheKey(_o, found_2.config) !== serverCacheKey(_o, cn)
            ) {
              Dn();
              return;
            }
            updateServer(
              applyMcpServerConfig(found_2.config, {
                client: Wn,
                tools: Fr,
                commands: [...Zn, ...Un],
                resources: dr,
                resourceTemplates: [],
                replaceOnly: true,
              }),
            );
          } catch (error) {
            Dn();
            if (!isMcpServerDisabled(_o) && identityEpoch() === wn)
              hn({
                name: _o,
                type: "failed",
                config: cn,
                error: `Re-adopt after re-authentication failed: ${describeConnectError(error, cn)}`,
                replaceOnly: true,
              });
            logForDebugging(
              `Failed to re-adopt reauth connection for ${_o}: ${describeConnectError(error, cn)}`,
              {
                level: "error",
              },
            );
          }
        })();
      }),
    [mcpConnections, updateServer, hn, storageV5, credentials],
  );
  P(() => {
    setConnectedClientWiring((_o) => {
      if (!isDiscoveryCacheOn()) return;
      let { registerElicitationHandler } = require("./chunk-asne9cp8.js").mcpElicitationHandlerModule();
      registerElicitationHandler(
        identityId2(_o.client),
        _o.name,
        requestDialog,
        _o.transportErrorState,
        _o.config.pluginSource,
      );
    });
    return () => setConnectedClientWiring(undefined);
  }, [requestDialog]);
  P(
    () =>
      CACHED_ADOPT_SIGNAL.subscribe((_o, cn) => {
        (async () => {
          let Dn = identityEpoch();
          let mcpClientModule = getMcpClientModule();
          try {
            let mr = Mn(_o);
            if (mr?.type !== "cached") return;
            let Kn = mcpDialBlockCause(_o, cn);
            if (Kn) {
              markClaudeInChromeUnwiredIfChrome(_o);
              mcpClientModule.clearServerCache(_o, cn).catch(() => {});
              mcpClientModule.dropDiscoveryEntry(_o, cn).catch(() => {});
              hn({
                name: _o,
                type: "failed",
                config: cn,
                ...mcpGateError(Kn, _o, cn),
                replaceOnly: true,
              });
              return;
            }
            if (isMcpServerDisabled(_o)) {
              mcpClientModule.clearServerCache(_o, cn).catch(() => {});
              updateServer({
                client: {
                  name: _o,
                  type: "failed",
                  config: cn,
                  error: DISABLED_IN_MCP_REASON,
                  errorCode: "DISABLED",
                },
                tools: [],
                commands: [],
                replaceOnly: true,
              });
              return;
            }
            if (serverCacheKey(_o, mr.config) !== serverCacheKey(_o, cn)) {
              mcpClientModule.clearServerCache(_o, cn).catch(() => {});
              return;
            }
            let Wn = await mcpClientModule.connectToServer(_o, cn, undefined, storageV5, credentials);
            if (identityEpoch() !== Dn) return;
            if (Wn.type === "connected" && isMcpServerDisabled(_o)) {
              updateServer({
                client: Wn,
                tools: [],
                commands: [],
                replaceOnly: true,
              });
              return;
            }
            if (Wn.type !== "connected") {
              if (Wn.type === "needs-auth")
                updateServer({
                  client: {
                    ...Wn,
                    config: mr.config,
                  },
                  tools: mcpAuthToolsFor(_o, mr.config),
                  commands: [],
                  resources: [],
                  resourceTemplates: [],
                  replaceOnly: true,
                });
              return;
            }
            clearDiscoveryPathMemo(_o);
            let grantLeg = await cacheGrantLeg(_o, cn);
            if (identityEpoch() !== Dn) return;
            let Zn = !!Wn.capabilities?.resources;
            let [Un, dr, or, pr] = await Promise.all([
              mcpClientModule.fetchToolsForClient(Wn, storageV5),
              mcpClientModule.fetchCommandsForClient(Wn),
              Promise.resolve([]),
              Zn ? mcpClientModule.fetchResourcesForClient(Wn) : Promise.resolve([]),
            ]);
            if ((await mcpClientModule.peekSettledConnection(_o, cn)) !== Wn) return;
            let Qn = Mn(_o);
            if (identityEpoch() !== Dn || Qn?.type !== "cached") return;
            if (serverCacheKey(_o, Qn.config) !== serverCacheKey(_o, cn)) {
              mcpClientModule.clearServerCache(_o, cn).catch(() => {});
              return;
            }
            let ur = mcpDialBlockCause(_o, cn);
            if (ur) {
              markClaudeInChromeUnwiredIfChrome(_o);
              identityId2(Wn.client).onclose = undefined;
              mcpClientModule.clearServerCache(_o, cn).catch(() => {});
              mcpClientModule.dropDiscoveryEntry(_o, cn).catch(() => {});
              hn({
                name: _o,
                type: "failed",
                config: cn,
                ...mcpGateError(ur, _o, cn),
                replaceOnly: true,
              });
              return;
            }
            let toolsListErrorForResult = mcpClientModule.getToolsListErrorForResult(Un);
            let tools = toolsListErrorForResult
              ? mcpConnections.get().tools.filter((tool) => isToolFromMcpServer(tool, _o))
              : Un;
            if (toolsListErrorForResult)
              logForDebugging(
                `Cached MCP server ${_o}: adoption tools/list failed (${describeConnectError(toolsListErrorForResult, cn)}); keeping cached surface`,
                {
                  level: "warn",
                },
              );
            let discoveryFetchError = mcpClientModule.getDiscoveryFetchError(dr);
            let commands = [
              ...(discoveryFetchError
                ? mcpConnections
                    .get()
                    .commands.filter(
                      (command) => commandBelongsToServer(command, _o) && command.loadedFrom !== "mcp",
                    )
                : dr),
              ...or,
            ];
            if (discoveryFetchError)
              logForDebugging(
                `Cached MCP server ${_o}: adoption prompts/list failed (${describeConnectError(discoveryFetchError, cn)}); keeping cached prompts`,
                {
                  level: "warn",
                },
              );
            let Zr = pr ? mcpClientModule.getDiscoveryFetchError(pr) : undefined;
            if (Zr)
              logForDebugging(
                `Cached MCP server ${_o}: adoption resources/list failed (${describeConnectError(Zr, cn)}); keeping cached resources`,
                {
                  level: "warn",
                },
              );
            updateServer(
              applyMcpServerConfig(Qn.config, {
                client: Wn,
                tools,
                commands,
                resources: Zr ? undefined : pr,
                resourceTemplates: [],
                replaceOnly: true,
              }),
            );
            mcpClientModule.persistLiveListing(Wn, {
              tools: Un,
              commands: dr,
              resources: pr,
              identityEpoch: Dn,
              grantLeg,
            });
          } catch (error) {
            logForDebugging(
              `Failed to adopt cached MCP server ${_o} after lazy connect: ${describeConnectError(error, cn)}`,
              {
                level: "warn",
              },
            );
          }
        })();
      }),
    [mcpConnections, updateServer, hn, storageV5, credentials, Mn],
  );
  P(
    () =>
      CACHED_DIAL_FAILED_SIGNAL.subscribe((_o, cn) => {
        getMcpClientModule().takeSettledCachedDialFailure(_o.name, _o.config);
        let Dn = Mn(_o.name);
        if (
          Dn?.type !== "cached" ||
          serverCacheKey(_o.name, Dn.config) !== serverCacheKey(_o.name, _o.config)
        )
          return;
        updateServer({
          client: _o,
          tools: [],
          commands: [],
          replaceOnly: true,
        });
        if (cn) strikeAfterLazyDialFailure(_o.name, _o.config);
      }),
    [updateServer, Mn],
  );
  P(() => {
    if (store) return;
    let _o = setIdentityTrippedHandler(() => {
      if (It.current === identityEpoch()) return;
      kt((cn) => cn + 1);
    });
    if (takeIdentityTripUnowned()) Ot.current = true;
    return _o;
  }, [store]);
  let sessionId = getSessionId();
  P(() => {
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
        : await getClaudeCodeMcpConfigs(dynamicMcpConfig, {
            storageV5,
            admits: bareModePluginAllow(),
          });
      let Kn = mergeUniqueServerRefs(refusedReservedNames(), reservedNameRefusals);
      mcpConnections.setReservedNameRefusals(Kn);
      let Wn = new Set(Kn.map((or) => `${or.scope}:${or.name}`));
      for (let or of Io.current) if (!Wn.has(or)) Io.current.delete(or);
      for (let or of []) {
        let pr = `${or.scope}:${or.name}`;
        if (Io.current.has(pr)) continue;
        Io.current.add(pr);
        addNotification({
          key: `mcp-reserved-name-${pr}`,
          kind: "warning",
          priority: "high",
          text: emptyString_2(or),
          color: "warning",
          timeoutMs: 20000,
        });
      }
      let { configs, blocked } = filterUnapprovedMcpServers(dynamicMcpConfig, browserExtensionAllowed);
      let configs_2 = {
        ...existingConfigs,
        ...configs,
      };
      let dr = configs[CLAUDE_IN_CHROME_MCP_SERVER_NAME];
      if (dr && dialsClaudeInChromeBridge(CLAUDE_IN_CHROME_MCP_SERVER_NAME, dr)) markClaudeInChromeRewired();
      if (blocked.length > 0) {
        blocked.sort();
        logForDebugging(`MCP servers blocked by managed policy at connect time: ${blocked.join(", ")}`, {
          level: "warn",
        });
        let joined = blocked.join(",");
        if (Ho.current !== joined) {
          Ho.current = joined;
          let pr = [];
          let filtered = blocked.filter(
            (prevState) =>
              !pr.includes(prevState) &&
              !(
                prevState === CLAUDE_ARTIFACTS &&
                isCliOwnedConfig(dynamicMcpConfig && getOwn(dynamicMcpConfig, prevState))
              ),
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
        for (let pr of blocked) {
          markClaudeInChromeUnwiredIfChrome(pr);
          let Qn = dynamicMcpConfig && getOwn(dynamicMcpConfig, pr);
          if (Qn)
            getMcpClientModule()
              .clearServerCache(pr, Qn)
              .catch(() => {});
        }
      } else Ho.current = null;
      activePlugins.addErrors(mcpErrors);
      activePlugins.addWarnings(warnings);
      mcpConnections.reconcileConfiguredServers(configs_2, getOriginalCwd(), (or) => {
        for (let pr of or) {
          let timer = reconnectTimersRef.current.get(pr.name);
          if (timer) {
            timer();
            reconnectTimersRef.current.delete(pr.name);
          }
          mn.current.delete(pr.name);
          Ro.current.delete(pr.name);
          if (!isConnectedOrCached(pr)) continue;
          if (pr.type === "connected") identityId2(pr.client).onclose = undefined;
          getMcpClientModule()
            .clearServerCache(pr.name, pr.config)
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
    dynamicMcpConfig,
    mcpConnections,
    activePlugins,
    sessionId,
    Lt,
    Et,
    browserExtensionAllowed,
    storageV5,
    co,
  ]);
  P(() => {
    if (store) return;
    let _o = false;
    let cn = (error) =>
      updateServer(
        _o
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
      let wn =
        voiceLoginCompletedRef.current !== undefined &&
        voiceLoginCompletedRef.current !== voiceLoginCompleted;
      let mr = At.current !== rt;
      At.current = rt;
      let Kn = Ot.current;
      Ot.current = false;
      let Wn = wn || mr || Kn;
      if (Wn) channelWarnedKindsRef.current = 0;
      primeDiscoveryCacheFlag();
      let Fr = isDiscoveryCacheOn();
      let Zn = Wn && Fr && (getMcpClientModule().mcpIdentityChangedSinceLastCheck() || Kn);
      if (Zn) {
        let mcpClientModule = getMcpClientModule();
        let filtered = mcpConnections.get().clients.filter(isConnectedOrCached);
        let _r = new Set();
        let fr = new Set();
        let clients = mcpConnections.get().clients;
        for (let client of clients)
          if (!isRemoteMcpTransport(client.config)) {
            _r.add(client.name);
            fr.add(serverCacheKey(client.name, client.config));
          }
        let Yr = hasRemoteMcpServers(clients);
        let Er = new Set();
        for (let ms of filtered) {
          if (_r.has(ms.name)) continue;
          if (ms.type === "connected") identityId2(ms.client).onclose = undefined;
          mcpClientModule.disposeServerConnectionDetached(ms.name, ms.config);
          Er.add(ms.name);
        }
        for (let client of mcpConnections.get().clients)
          if (
            client.type === "needs-auth" &&
            isRemoteMcpTransport(client.config) &&
            (client.config.type === "http" || client.config.type === "sse")
          )
            Er.add(client.name);
        let Vr = new Set();
        for (let client of mcpConnections.get().clients)
          if (client.config.type === "claudeai-proxy" && !_r.has(client.name)) Vr.add(client.name);
        for (let key of [...reconnectTimersRef.current.keys()]) {
          if (_r.has(key)) continue;
          reconnectTimersRef.current.get(key)?.();
          reconnectTimersRef.current.delete(key);
        }
        for (let ms of [...mn.current]) if (!_r.has(ms)) mn.current.delete(ms);
        for (let key of [...Ro.current.keys()]) if (!_r.has(key)) Ro.current.delete(key);
        mcpConnections.applyIdentityBoundary(Er, Vr);
        mcpClientModule.evictAllMcpMemosOnIdentityChange(fr, Yr);
        deleteNeedsAuthCache(storageV5);
        deferredToolCache().clear();
        It.current = identityEpoch();
      }
      if (Fr) voiceLoginCompletedRef.current = voiceLoginCompleted;
      let claudeaiPromise;
      let dr = false;
      if (isStrictMcpConfig || isBareMode() || shouldSkipClaudeAiFetchForEnterpriseLockdown()) {
        markConnectorListUnavailable();
        claudeaiPromise = Promise.resolve({});
      } else {
        clearClaudeAiConfigsFetch();
        if (Wn) {
          if (!Zn) deleteNeedsAuthCache(storageV5);
          resetClaudeAiSessionConnections();
          Ao.current = false;
        }
        voiceLoginCompletedRef.current = voiceLoginCompleted;
        dr = true;
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
        : await getClaudeCodeMcpConfigs(dynamicMcpConfig, {
            storageV5,
            admits: bareModePluginAllow(),
          });
      if (_o) return;
      activePlugins.addErrors(mcpErrors);
      activePlugins.addWarnings(warnings);
      let ur = filterUnapprovedMcpServers(dynamicMcpConfig, browserExtensionAllowed);
      let configs = {
        ...claudeCodeConfigs,
        ...ur.configs,
      };
      let Pr = filterObject(configs, (wr, zr) => !isMcpServerDisabled(zr));
      if (Object.keys(Pr).length > 0 || (Fr && Object.keys(configs).length > 0))
        getMcpClientModule().seedMcpIdentityCheck();
      if (Object.keys(Pr).length > 0)
        getMcpClientModule()
          .getMcpToolsCommandsAndResources(cn, Pr, storageV5, credentials)
          .catch((error) => {
            logMCPError("useManageMcpConnections", `Failed to get MCP resources: ${errorMessage(error)}`);
          });
      let claudeaiConfigs = {};
      if (!isStrictMcpConfig) {
        let wr = (await claudeaiPromise) ?? {};
        let { allowed, blocked } = filterMcpServersByPolicy(wr);
        claudeaiConfigs = allowed;
        if (_o) return;
        try {
          try {
            if (dr && hasTransientConfigFailure(wr)) {
              let Yr = channelWarnedKindsRef.current;
              let Er = CLAUDEAI_LIST_RETRY_DELAYS_MS[Yr];
              if (Er !== undefined) {
                logForDebugging(
                  `[claudeai-mcp] Connector-list fetch failed transiently; background retry ${Yr + 1}/${CLAUDEAI_LIST_RETRY_DELAYS_MS.length} in ${Er}ms`,
                );
                channelPermCallbacksRef.current = setAppState.setTimeout(() => {
                  channelPermCallbacksRef.current = null;
                  channelWarnedKindsRef.current += 1;
                  so((Vr) => Vr + 1);
                }, Er);
              }
            } else if (dr) channelWarnedKindsRef.current = 0;
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
              let Er = reconnectTimersRef.current.get(client.name);
              if (Er) {
                Er();
                reconnectTimersRef.current.delete(client.name);
              }
              mn.current.delete(client.name);
              Ro.current.delete(client.name);
              if (isConnectedOrCached(client)) {
                if (client.type === "connected") identityId2(client.client).onclose = undefined;
                getMcpClientModule()
                  .clearServerCache(client.name, client.config)
                  .catch(() => {});
              }
              hn({
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
            for (let Yr of blocked) {
              let found = mcpConnections
                .get()
                .clients.find((prevState) => prevState.name === Yr && prevState.config.scope === "claudeai");
              if (!found) continue;
              let Vr = reconnectTimersRef.current.get(Yr);
              if (Vr) {
                Vr();
                reconnectTimersRef.current.delete(Yr);
              }
              if (isConnectedOrCached(found)) {
                if (found.type === "connected") identityId2(found.client).onclose = undefined;
                getMcpClientModule()
                  .clearServerCache(Yr, found.config)
                  .catch(() => {});
              }
              hn({
                name: Yr,
                type: "failed",
                config: found.config,
                error: BLOCKED_BY_POLICY_REASON,
              });
            }
          }
          let fr = takePendingCrossOrgNotice();
          if (fr)
            addNotification({
              key: "claudeai-mcp-cross-org-override",
              priority: "immediate",
              text: fr.level === "error" ? fr.message : `\u26A0 ${fr.message}`,
              color: fr.level === "error" ? "error" : "warning",
              timeoutMs: 20000,
            });
          let $r = [];
          if (Object.keys(claudeaiConfigs).length > 0) {
            let { servers, suppressed } = await dedupClaudeAiMcpServers(claudeaiConfigs, configs);
            if (_o) return;
            claudeaiConfigs = servers;
            $r = suppressed;
          }
          mcpConnections.setSuppressedClaudeAiConnectors($r);
          if (Object.keys(claudeaiConfigs).length > 0) {
            mcpConnections.addPendingServers(claudeaiConfigs);
            let Yr = filterObject(claudeaiConfigs, (Er, Vr) => !isMcpServerDisabled(Vr));
            if (Object.keys(Yr).length > 0 || (Fr && Object.keys(claudeaiConfigs).length > 0))
              getMcpClientModule().seedMcpIdentityCheck();
            if (Object.keys(Yr).length > 0)
              getMcpClientModule()
                .getMcpToolsCommandsAndResources(cn, Yr, storageV5, credentials)
                .catch((error) => {
                  logMCPError(
                    "useManageMcpConnections",
                    `Failed to get claude.ai MCP resources: ${errorMessage(error)}`,
                  );
                });
          }
        } finally {
          if (!_o) {
            let fr = filterUnapprovedMcpServers(dynamicMcpConfig, browserExtensionAllowed);
            let $r =
              !En(Object.keys(ur.configs).sort(), Object.keys(fr.configs).sort()) ||
              !En([...ur.blocked].sort(), [...fr.blocked].sort());
            let Yr = hasTransientConfigFailure(wr);
            let Er = isGateOOn() && hasManagedMcpPolicy() && !Yr && !Ao.current;
            if ($r || Er) {
              if (!Yr) Ao.current = true;
              bo((error) => error + 1);
            }
          }
        }
      }
      let allConfigs = {
        ...configs,
        ...claudeaiConfigs,
      };
      let Ur = {
        enterprise: 0,
        global: 0,
        project: 0,
        user: 0,
        plugin: 0,
        agent: 0,
        claudeai: 0,
      };
      let Zr = [];
      for (let [key, value] of Object.entries(allConfigs)) {
        let _r = value.scope ? SCOPE_TO_TELEMETRY_SOURCE[value.scope] : undefined;
        if (_r) Ur[_r]++;
      }
      logEvent("tengu_mcp_servers", {
        ...Ur,
        ...false,
      });
    }
    loadAndConnectMcpConfigs().catch((error) => {
      logMCPError("useManageMcpConnections", `MCP connect failed on mount: ${describeErrorBrief(error)}`);
    });
    return () => {
      _o = true;
      channelPermCallbacksRef.current?.();
      channelPermCallbacksRef.current = null;
    };
  }, [
    isStrictMcpConfig,
    dynamicMcpConfig,
    updateServer,
    mcpConnections,
    activePlugins,
    voiceLoginCompleted,
    rt,
    sessionId,
    Lt,
    Et,
    browserExtensionAllowed,
    storageV5,
    credentials,
    setAppState,
    io,
    co,
  ]);
  P(() => {
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
  let reconnectMcpServer = ce(
    async (
      _o,
      cn = {
        discardDiscovery: true,
      },
    ) => {
      let Dn = Bo.current.get(_o);
      while (cn.revokeTokens && Dn && Dn.epoch === identityEpoch()) {
        await Dn.attempt.catch(() => {});
        Dn = Bo.current.get(_o);
      }
      if (Dn && Dn.epoch === identityEpoch()) {
        if (isDiscoveryCacheUsable() && cn.discardDiscovery && !Dn.discardDiscovery && !Dn.connectNow) {
          let found = mcpConnections.get().clients.find((serverName) => serverName.name === _o);
          if (found)
            getMcpClientModule()
              .dropDiscoveryEntry(_o, found.config)
              .catch(() => {});
        }
        return Dn.attempt;
      }
      let client = mcpConnections.get().clients.find((client) => client.name === _o);
      if (!client)
        throw withTelemetryMessage(Error(`MCP server ${_o} not found`), "MCP server not found in store");
      if (isMcpServerDisabled(_o))
        throw new WireSafeControlError(
          client.type === "disabled" ? disabledEnableInMcpText(_o) : disabledElsewhereText(_o),
          "MCP server disabled; enable before reconnect",
        );
      let existingTimer = reconnectTimersRef.current.get(_o);
      if (existingTimer) {
        existingTimer();
        reconnectTimersRef.current.delete(_o);
      }
      let Kn = identityEpoch();
      let Wn = client.type === "cached" || client.type === "pending";
      let Fr = cn.discardDiscovery && !Wn;
      let Zn = (async () => {
        hn({
          name: _o,
          type: "pending",
          config: client.config,
        });
        try {
          let dr = cn.keepConfig
            ? undefined
            : ((dynamicMcpConfig && getOwn(dynamicMcpConfig, _o)) ??
              (isStrictMcpConfig
                ? undefined
                : getOwn(
                    (
                      await getClaudeCodeMcpConfigs(dynamicMcpConfig, {
                        storageV5,
                        admits: bareModePluginAllow(),
                      })
                    ).servers,
                    _o,
                  )));
          let or = dr ?? client.config;
          let pr = mcpDialBlockCause(_o, or);
          if (pr) {
            markClaudeInChromeUnwiredIfChrome(_o);
            throw mcpRefusalError(
              _o,
              pr,
              or,
              `MCP server ${normalizeServerNameShort(_o)} is blocked by enterprise managed policy`,
            );
          }
          let Qn = cn.revokeTokens ? await revokeStoredMcpTokens(_o, [client.config, or]) : undefined;
          if (Qn && !Qn.cleared && Qn.reason !== "keychain_unreadable")
            throw new WireSafeControlError(
              `Claude Code did not reconnect to ${normalizeServerNameShort(_o)}: sign-in data for the config in your settings is still stored, or the credential store could not be read. Restart Claude Code and use Clear authentication again.`,
              "MCP clear-auth reconnect: credential store not cleared",
            );
          if (client.type === "connected") identityId2(client.client).onclose = undefined;
          let ur = await (Fr
            ? getMcpClientModule().reconnectMcpServerDistrusted(_o, or, storageV5, credentials)
            : getMcpClientModule().reconnectMcpServerImpl(_o, or, storageV5, credentials));
          if (isMcpServerDisabled(_o)) {
            if (ur.client.type === "connected") detachClientAndClearCache(ur.client);
            throw new WireSafeControlError(
              `"${normalizeServerNameShort(_o)}" was disabled while reconnecting`,
              "MCP server disabled during reconnect",
            );
          }
          if (identityEpoch() === Kn) {
            updateServer(
              dr === undefined
                ? ur
                : {
                    ...ur,
                    asked: true,
                  },
            );
            if (dr === undefined) {
              flushTimerRef.current?.();
              flushPendingUpdates();
              let Ir = keptConnectionOrFailed(
                ur.client,
                mcpConnections.get().clients.find((client) => client.name === _o),
              );
              if (Ir !== ur.client)
                return {
                  ...ur,
                  client: Ir,
                  tools: [],
                  commands: [],
                };
            }
          }
          return ur;
        } catch (error) {
          if (identityEpoch() === Kn) hn(client);
          throw error;
        }
      })();
      let Un = {
        attempt: Zn,
        epoch: Kn,
        discardDiscovery: Fr,
        connectNow: Wn,
      };
      Bo.current.set(_o, Un);
      try {
        return await Zn;
      } finally {
        if (Bo.current.get(_o) === Un) Bo.current.delete(_o);
      }
    },
    [
      mcpConnections,
      hn,
      updateServer,
      flushPendingUpdates,
      dynamicMcpConfig,
      isStrictMcpConfig,
      storageV5,
      credentials,
    ],
  );
  let toggleMcpServer = ce(
    async (serverName) => {
      let client = mcpConnections.get().clients.find((client) => client.name === serverName);
      if (!client)
        throw withTelemetryMessage(
          Error(`MCP server ${serverName} not found`),
          "MCP server not found in store",
        );
      if (client.type !== "disabled") {
        let wn = reconnectTimersRef.current.get(serverName);
        if (wn) {
          wn();
          reconnectTimersRef.current.delete(serverName);
        }
        setMcpServerEnabled(serverName, false, storageV5);
        mn.current.delete(serverName);
        Ro.current.delete(serverName);
        if (client.type === "connected")
          await getMcpClientModule().clearServerCache(serverName, client.config);
        else if (client.type === "cached")
          getMcpClientModule().disposeServerConnectionDetached(serverName, client.config);
        if (isDiscoveryCacheUsable())
          getMcpClientModule()
            .dropDiscoveryEntry(serverName, client.config)
            .catch(() => {});
        let mr = {
          name: serverName,
          type: "disabled",
          config: client.config,
        };
        hn(mr);
        return mr;
      } else {
        let wn =
          (dynamicMcpConfig && getOwn(dynamicMcpConfig, serverName)) ??
          (isStrictMcpConfig
            ? undefined
            : getOwn(
                (
                  await getClaudeCodeMcpConfigs(dynamicMcpConfig, {
                    storageV5,
                    admits: bareModePluginAllow(),
                  })
                ).servers,
                serverName,
              ));
        let mr = wn ?? client.config;
        let Kn = wn !== undefined;
        let Wn = mcpDialBlockCause(serverName, mr);
        if (Wn) {
          markClaudeInChromeUnwiredIfChrome(serverName);
          throw mcpRefusalError(
            serverName,
            Wn,
            mr,
            `MCP server ${normalizeServerNameShort(serverName)} is blocked by enterprise managed policy`,
          );
        }
        setMcpServerEnabled(serverName, true, storageV5);
        hn({
          name: serverName,
          type: "pending",
          config: mr,
          ...(Kn && {
            asked: true,
          }),
        });
        let Fr = identityEpoch();
        let Zn = await getMcpClientModule().reconnectMcpServerImpl(serverName, mr, storageV5, credentials);
        if (isMcpServerDisabled(serverName)) {
          if (Zn.client.type === "connected") detachClientAndClearCache(Zn.client);
          hn({
            name: serverName,
            type: "disabled",
            config: mr,
          });
          throw new WireSafeControlError(
            `"${normalizeServerNameShort(serverName)}" was disabled while enabling`,
            "MCP server disabled during enable",
          );
        }
        if (identityEpoch() === Fr) {
          updateServer(
            Kn
              ? {
                  ...Zn,
                  asked: true,
                }
              : Zn,
          );
          if (!Kn) {
            flushTimerRef.current?.();
            flushPendingUpdates();
            return keptConnectionOrFailed(
              Zn.client,
              mcpConnections.get().clients.find((client) => client.name === serverName),
            );
          }
        }
        return Zn.client;
      }
    },
    [
      mcpConnections,
      hn,
      updateServer,
      flushPendingUpdates,
      dynamicMcpConfig,
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
  return require("./chunk-asne9cp8.js").mcpClientModule();
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
//@ chunk-7nse75qx.js:307-453 fingerprint = getErrorKey (0.72)
function getErrorKey(error) {
  let plugin = "plugin" in error ? error.plugin : "no-plugin";
  let n = error.type === "mcpb-needs-config" ? `:${error.serverName}` : "";
  return `${error.type}:${error.source}:${plugin}${n}`;
}
export { ALLOW_CLAUDE_BROWSER_EXTENSION, useManageMCPConnections, redialFailedMcpServers, getErrorKey };
