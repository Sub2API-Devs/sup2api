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
import { j, R, y, P, ce } from "../../../vendor/react/cjs/react.production.js";
import { ht, Zl } from "./cliOwnedClients.js";
import { isRetryableRemoteFailure, BEARER_REJECT_CODES, Y2e, commandBelongsToServer } from "./utils.js";
import { pw } from "../../utils/localhost.js";
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
  D3s,
  I3s,
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
import { alr, eae, cCt, REOPEN_REFETCH } from "./mcpCallConstants.js";
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
import { Me } from "../../components/design-system/ThemeProvider.js";
import { Nu } from "../../context/QueuedMessageContext.js";
import { useMcpConnections, useActivePlugins, useAppState } from "../../state/AppState.js";
import { vXe } from "../../hooks/useVoiceIntegration.js";
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
import { Foe, takeScopeExpansionNotice } from "./firstPartyDesignConsent.js";
import { isXaaEnabled } from "./xaaIdpLogin.js";
import { identityEpoch, setIdentityTrippedHandler, V4n } from "./identityChange.js";
import {
  markClaudeInChromeUnwiredIfChrome,
  markClaudeInChromeRewired,
} from "../../utils/claudeInChrome/setup.js";
import { checkMcpServerHealth_2 } from "../../cli/handlers/mcp.js";
import { oa } from "../../types/ids.js";
import { isShuttingDown } from "../../utils/gracefulShutdown.js";
import { logForDebugging } from "../../utils/debug.js";
import { isRemoteMcpTransport, hasRemoteMcpServers } from "./discoveryIdentity.js";
import { IDE, CLAUDE_ARTIFACTS } from "./firstPartyServerIds.js";
import { uo, jW } from "../api/deferredToolsState.js";
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
import { dpe } from "../../utils/telemetry/pluginTelemetry.js";
import { isChannelsEnabled } from "./channelAllowlist.js";
import { logEvent } from "../analytics/index.js";
import { fromEnumOpt, fromEnum, lit as lit_2 } from "../analytics/safeMetadata.js";
import { oq, clearDiscoveryPathMemo, strikeAfterLazyDialFailure } from "./discoveryCache.js";
import { ir } from "./client.js";
import { toolNameForTelemetry, filterObject } from "../analytics/metadata.js";
import { decorateMcpTools, stampToolScope } from "./mcpToolDecoration.js";
import { fd, IM } from "./mcpAccountKey.js";
import { isNoticeableMcpServer } from "../../hooks/notifs/useMcpConnectivityStatus.js";
import {
  hasClaudeAiMcpEverConnected,
  isClaudeAiMcpConnectedThisSession,
  markConnectorListUnavailable,
  clearClaudeAiConfigsFetch,
  resetClaudeAiSessionConnections,
  fetchClaudeAiConfigsOnce,
  F6o,
  U6o,
} from "./claudeai.js";
import { logSetupIssues } from "../../utils/notifications/setupIssues.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { applyMcpServerConfig } from "../../components/mcp/MCPListPanel.js";
import { wkt, RYo, BLOCKED_BY_POLICY_REASON } from "./redactMcpErrors.js";
import { mcpAuthToolsFor, deleteNeedsAuthCache } from "./needsAuthCache.js";
import { isToolFromMcpServer } from "./mcpStringUtils.js";
import { zye } from "../../utils/plugins/refresh.js";
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
j();
//@ chunk-18hwfzwa.js:1709351-1709379 placement
var d_t = 10,
  LVo = 600000,
  FVo = 8;
//@ chunk-18hwfzwa.js:1709379-1710878 placement
function redialFailedMcpServers(h) {
  let { searchRedialFailures: searchRedialFailures } = ht(),
    D = new Map(),
    L = (Re) => {
      let Be = searchRedialFailures.get(Re);
      return Be !== void 0 && performance.now() - Be.endedAt < LVo ? Be : void 0;
    },
    ee = (Re) => {
      try {
        if (!isRetryableRemoteFailure(Re) || (Re.config.type !== "http" && Re.config.type !== "sse"))
          return !1;
        let parse = URL.parse(Re.config.url);
        return (
          parse !== null &&
          !BEARER_REJECT_CODES.has(Re.errorCode ?? "") &&
          pw(parse.hostname) &&
          !parse.username &&
          !parse.password &&
          !parse.search &&
          parse.pathname.split("/").every((He) => He.length < FVo) &&
          !Re.config.oauth &&
          !usesNonOAuthAuth(Re.config) &&
          (L(Re.name)?.count ?? 0) < d_t &&
          getFeatureValue_CACHED_MAY_BE_STALE("tengu_floating_lagoon", !1) &&
          !Zl(Re.config) &&
          !isMcpServerDisabled(Re.name) &&
          !mcpDialBlockCause(Re.name, Re.config)
        );
      } catch (error) {
        return (logError(error), !1);
      }
    },
    ke = async ({ name: Re, config: config }) => {
      let He = "not_connected";
      try {
        let We =
          (config.type !== "http" && config.type !== "sse") || (await hasMcpDiscoveryButNoToken(Re, config));
        if (We === READ_FAILED) He = "store_unreadable";
        else if (We) He = "token_stored";
        else {
          let { client: client } = await h(Re, { discardDiscovery: !1, keepConfig: !0 });
          if (client.type === "connected") He = "connected";
        }
      } catch (error) {
        logMCPDebug(Re, `Re-dial for a search threw: ${errorMessage(error)}`);
      }
      if (He === "connected") searchRedialFailures.delete(Re);
      else
        searchRedialFailures.set(Re, {
          count: He === "token_stored" ? d_t : (L(Re)?.count ?? 0) + 1,
          endedAt: performance.now(),
        });
      return (D.delete(Re), He);
    };
  return {
    allows: ee,
    async redial(Re, Be, He) {
      let filtered = Re.filter((kt) => ee(kt) && performance.now() - (L(kt.name)?.endedAt ?? -1 / 0) >= alr);
      if (filtered.length === 0) return;
      let mapped = filtered.map((kt) => {
          let At = D.get(kt.name) ?? ke(kt);
          return (D.set(kt.name, At), At);
        }),
        Xe = await withDeadline(
          raceWithAbortSignal(Promise.all(mapped), He, () => new AbortError()),
          Be,
        ),
        rt = Xe === void 0 ? "wait_ran_out" : Xe.find((kt) => kt !== "connected");
      if (rt === void 0) logFeatureOk("mcp_search_redial");
      else logFeatureSad("mcp_search_redial", rt);
    },
  };
}
//@ chunk-18hwfzwa.js:1710878-1711114 placement
function keptConnectionOrFailed(h, x) {
  return h.type !== "connected" || (x?.type === "connected" && x.client === h.client)
    ? h
    : {
        name: h.name,
        type: "failed",
        config: h.config,
        error: "The connection was not kept: the server was removed, changed, disabled or refused meanwhile",
      };
}
//@ chunk-18hwfzwa.js:1711114-1711118 placement
j();
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
var MAX_INITIAL_CONNECT_RETRIES = 3,
  CLAUDEAI_LIST_RETRY_DELAYS_MS = [5000, 15000, 45000];
/**
 * useManageMCPConnections：REPL 中管理 MCP 连接的 React hook。初始化时 getMcpToolsCommandsAndResources 批量连接并写入 AppState.mcp；注册 list_changed（工具/提示词/资源）处理、channel 通知、elicitation、远程传输断线自动重连（最多 5 次，指数退避 1s 起、上限 30s）、首次连接瞬时错误重试 3 次、claude.ai 连接器列表后台重试；对外提供 reconnectMcpServer 与 toggleMcpServer。
 */
//@ chunk-18hwfzwa.js:1711320-1737581 fingerprint = useManageMCPConnections (0.547)
function useManageMCPConnections(h, x, D, L) {
  let store = getIsRemoteMode(),
    { storageV5: storageV5, credentials: credentials } = Me(),
    Be = Nu(),
    He = useMcpConnections(),
    We = useActivePlugins(),
    ze = vXe(),
    Xe = R(void 0),
    [rt, kt] = y(0),
    At = R(0),
    It = R(void 0),
    Ot = R(!1),
    Et = useAppState((_o) => mcpPolicySnapshotKey(_o.settings)),
    Dt = useBrowserExtensionAllowed(),
    Lt = useAppState((_o) => _o.mcp.pluginReconnectKey),
    setAppState = useClock(),
    reconnectTimersRef = R(new Map()),
    [io, so] = y(0),
    channelWarnedKindsRef = R(0),
    channelPermCallbacksRef = R(null),
    [co, bo] = y(0),
    Ao = R(!1),
    Bo = R(new Map()),
    Ro = R(new Map()),
    Ho = R(null),
    Io = R(new Set()),
    Wo = R(new Set()),
    mn = R(new Set()),
    Cn = R(null);
  if (Cn.current === null && !store)
    Cn.current = createChannelPermissionCallbacks((_o) => mn.current.has(_o));
  P(() => {
    let callbacks = Cn.current;
    if (!callbacks) return;
    if (!isChannelPermissionRelayEnabled()) return;
    return (
      D.setChannel(callbacks),
      () => {
        D.setChannel(void 0);
      }
    );
  }, [D]);
  let { addNotification: addNotification, removeNotification: removeNotification } = useNotifications(),
    Yo = R(new Set());
  P(
    () =>
      AUTH_LOST_SIGNAL.subscribe((prev) => {
        if (Yo.current.has(prev)) return;
        let found = He.get().clients.find((prev_2) => prev_2.name === prev);
        if (found?.type !== "connected") return;
        (Yo.current.add(prev),
          (async () => {
            let Dn = !1;
            try {
              if (
                (found.config.type === "sse" || found.config.type === "http") &&
                (hasExternalAuthForConfig(
                  found.config,
                  !!getClaudeAIOAuthTokens()?.accessToken ||
                    (isDesignMcpUrl(found.config.url) && (await Foe(credentials).catch(() => !1))),
                ) ||
                  (isXaaEnabled() && !!found.config.oauth?.xaa))
              )
                return;
              (addNotification({
                key: `mcp-needs-reauth-${prev}`,
                kind: "warning",
                priority: "high",
                text: `MCP server "${prev}" lost authentication \xB7 open /mcp and select Re-authenticate`,
                color: "warning",
                timeoutMs: 12000,
              }),
                (Dn = !0));
            } catch (error) {
              logMCPDebug(prev, `Auth-lost notice skipped: ${errorMessage(error)}`);
            } finally {
              if (!Dn) Yo.current.delete(prev);
            }
          })());
      }),
    [He, addNotification, credentials],
  );
  let MCP_BATCH_FLUSH_MS = 16,
    pendingUpdatesRef = R([]),
    flushTimerRef = R(null),
    flushPendingUpdates = ce(() => {
      flushTimerRef.current = null;
      let updates = pendingUpdatesRef.current;
      if (updates.length === 0) return;
      ((pendingUpdatesRef.current = []),
        He.applyQueuedUpdates(updates, {
          currentEpoch: identityEpoch(),
          onDoorDenied: markClaudeInChromeUnwiredIfChrome,
          onOrphanedDisable: (prevState) => {
            (Ro.current.delete(prevState), mn.current.delete(prevState));
            let Dn = reconnectTimersRef.current.get(prevState);
            if (Dn) (Dn(), reconnectTimersRef.current.delete(prevState));
          },
        }));
    }, [He]),
    hn = ce(
      (_o) => {
        if (
          (pendingUpdatesRef.current.push({ ..._o, epoch: identityEpoch() }), flushTimerRef.current === null)
        )
          flushTimerRef.current = setAppState.setTimeout(flushPendingUpdates, MCP_BATCH_FLUSH_MS);
      },
      [setAppState, flushPendingUpdates],
    ),
    Mn = ce(
      (_o) => {
        let found = He.get().clients.find((client) => client.name === _o);
        for (let Dn of pendingUpdatesRef.current)
          if (Dn.name === _o && checkMcpServerHealth_2(found, Dn)) found = Dn;
        return found;
      },
      [He],
    ),
    updateServer = ce(
      ({
        client: client,
        tools: tools,
        commands: commands,
        resources: resources,
        resourceTemplates: resourceTemplates,
        replaceOnly: replaceOnly,
        asked: asked,
        superseded: superseded,
      }) => {
        hn({
          ...client,
          tools: tools,
          commands: commands,
          resources: resources,
          resourceTemplates: resourceTemplates,
          ...(replaceOnly && { replaceOnly: replaceOnly }),
          ...(asked && { asked: asked }),
          ...(superseded && { superseded: superseded }),
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
            (Ro.current.set(client.name, MAX_INITIAL_CONNECT_RETRIES),
              Yo.current.delete(client.name),
              removeNotification(`mcp-reconnect-failed-${client.name}`));
            let { registerElicitationHandler: registerElicitationHandler } =
              require("./chunk-asne9cp8.js").mcpElicitationHandlerModule();
            (registerElicitationHandler(
              oa(client.client),
              client.name,
              L,
              client.transportErrorState,
              client.config.pluginSource,
            ),
              (oa(client.client).onclose = () => {
                if (isShuttingDown()) return;
                let Pr = client.config.type ?? "stdio";
                if (
                  (getMcpClientModule()
                    .clearServerCache(client.name, client.config)
                    .catch(() => {
                      logForDebugging(`Failed to invalidate the server cache: ${client.name}`);
                    }),
                  isMcpServerDisabled(client.name))
                ) {
                  logMCPDebug(client.name, "Server is disabled, skipping automatic reconnection");
                  return;
                }
                if (Pr !== "stdio" && Pr !== "sdk") {
                  let transportType = getTransportDisplayName(Pr);
                  logMCPDebug(
                    client.name,
                    `${transportType} transport closed/disconnected, attempting automatic reconnection`,
                  );
                  let existingTimer = reconnectTimersRef.current.get(client.name);
                  if (existingTimer) (existingTimer(), reconnectTimersRef.current.delete(client.name));
                  let Ur = identityEpoch(),
                    reconnectWithBackoff = () =>
                      identityEpoch() === Ur || !isRemoteMcpTransport(client.config),
                    wr = () => {
                      if (client.name === IDE || isMcpServerDisabled(client.name)) return;
                      addNotification({
                        key: `mcp-reconnect-failed-${client.name}`,
                        kind: "warning",
                        priority: "high",
                        text: `MCP server "${uo(client.name)}" disconnected \xB7 open /mcp to reconnect`,
                        color: "warning",
                        timeoutMs: 12000,
                      });
                    };
                  (async () => {
                    for (let attempt = 1; attempt <= eae; attempt++) {
                      if (isMcpServerDisabled(client.name)) {
                        (logMCPDebug(client.name, "Server disabled during reconnection, stopping retry"),
                          reconnectTimersRef.current.delete(client.name),
                          hn({ ...client }));
                        return;
                      }
                      if (!reconnectWithBackoff()) {
                        logMCPDebug(client.name, "Identity changed during reconnection, stopping retry");
                        return;
                      }
                      let fr = mcpDialBlockCause(client.name, client.config);
                      if (fr) {
                        (markClaudeInChromeUnwiredIfChrome(client.name),
                          logMCPDebug(
                            client.name,
                            "Server blocked by managed policy during reconnection, stopping retry",
                          ),
                          reconnectTimersRef.current.delete(client.name),
                          hn({
                            name: client.name,
                            type: "failed",
                            config: client.config,
                            ...mcpGateError(fr, client.name, client.config),
                          }));
                        return;
                      }
                      hn({
                        ...client,
                        type: "pending",
                        reconnectAttempt: attempt,
                        maxReconnectAttempts: eae,
                      });
                      let reconnectStartTime = setAppState.now();
                      try {
                        let reconnectMcpServerImpl = await getMcpClientModule().reconnectMcpServerImpl(
                            client.name,
                            client.config,
                            storageV5,
                            credentials,
                          ),
                          rounded = Math.round(setAppState.now() - reconnectStartTime);
                        if (!reconnectWithBackoff()) {
                          logMCPDebug(
                            client.name,
                            `Identity changed during reconnection attempt ${attempt}, discarding result`,
                          );
                          return;
                        }
                        if (reconnectMcpServerImpl.client.type === "connected") {
                          (logMCPDebug(
                            client.name,
                            `${transportType} reconnection successful after ${rounded}ms (attempt ${attempt})`,
                          ),
                            reconnectTimersRef.current.delete(client.name),
                            updateServer(reconnectMcpServerImpl));
                          return;
                        }
                        if (
                          (logMCPDebug(
                            client.name,
                            `${transportType} reconnection attempt ${attempt} completed with status: ${reconnectMcpServerImpl.client.type}`,
                          ),
                          attempt === eae)
                        ) {
                          if (
                            (logMCPDebug(
                              client.name,
                              `Max reconnection attempts (${eae}) reached, giving up`,
                            ),
                            reconnectTimersRef.current.delete(client.name),
                            updateServer(reconnectMcpServerImpl),
                            reconnectMcpServerImpl.client.type === "failed")
                          )
                            wr();
                          return;
                        }
                      } catch (error) {
                        let rounded = Math.round(setAppState.now() - reconnectStartTime);
                        if (
                          (logMCPError(
                            client.name,
                            `${transportType} reconnection attempt ${attempt} failed after ${rounded}ms: ${describeConnectError(error, client.config)}`,
                          ),
                          !reconnectWithBackoff())
                        )
                          return;
                        if (attempt === eae) {
                          (logMCPDebug(client.name, `Max reconnection attempts (${eae}) reached, giving up`),
                            reconnectTimersRef.current.delete(client.name),
                            hn({ ...client, type: "failed" }),
                            wr());
                          return;
                        }
                      }
                      let Yr = cCt(attempt);
                      (logMCPDebug(client.name, `Scheduling reconnection attempt ${attempt + 1} in ${Yr}ms`),
                        await new Promise((resolve) => {
                          let Vr = setAppState.setTimeout(resolve, Yr);
                          reconnectTimersRef.current.set(client.name, Vr);
                        }));
                    }
                  })();
                } else (mn.current.delete(client.name), hn({ ...client, type: "failed" }));
              }));
            let Un = gateChannelServer(
                client.name,
                client.capabilities,
                client.config.pluginSource,
                client.protocolEra,
              ),
              timer = findChannelEntry(client.name, getAllowedChannels()),
              or =
                timer?.kind === "plugin" && client.config.pluginSource
                  ? dpe(client.config.pluginSource)
                  : void 0,
              pr = !1,
              Qn = () => {
                if (
                  (mn.current.add(client.name),
                  getMcpClientModule().onMcpNotification(
                    client,
                    ChannelMessageNotificationSchema(),
                    async (notification) => {
                      if (!isChannelsEnabled()) return;
                      let { content: content, meta: meta } = notification.params;
                      (logMCPDebug(client.name, `notifications/claude/channel: ${content.slice(0, 80)}`),
                        logEvent("tengu_mcp_channel_message", {
                          content_length: content.length,
                          meta_key_count: Object.keys(meta ?? {}).length,
                          entry_kind: fromEnumOpt(timer?.kind),
                          is_dev: timer?.dev ?? !1,
                          plugin: or,
                        }),
                        Be.enqueue({
                          mode: "prompt",
                          agentId: mainAgentId(),
                          value: wrapChannelMessage(client.name, content, meta),
                          priority: "next",
                          isMeta: !0,
                          origin: { kind: "channel", server: client.name },
                          skipSlashCommands: !0,
                          skipAttachments: !0,
                        }));
                    },
                  ),
                  hasExperimentalCapability(client.capabilities, "claude/channel/permission"))
                )
                  getMcpClientModule().onMcpNotification(
                    client,
                    ChannelPermissionNotificationSchema(),
                    async (notification) => {
                      if (!isChannelsEnabled()) return;
                      let { request_id: request_id, behavior: behavior } = notification.params,
                        Ur = Cn.current?.resolve(request_id, behavior, client.name) ?? !1;
                      logMCPDebug(
                        client.name,
                        `notifications/claude/channel/permission: ${request_id} \u2192 ${behavior} (${Ur ? "matched pending" : "no pending entry \u2014 stale or unknown ID"})`,
                      );
                    },
                  );
              };
            switch (Un.action) {
              case "register":
                (logMCPDebug(client.name, "Channel notifications registered"), Qn(), (pr = !0));
                break;
              case "skip": {
                let Pr = isChannelGateHardRevocation(Un.kind),
                  ts = mn.current.has(client.name);
                if (Pr) {
                  mn.current.delete(client.name);
                  let Ur = oa(client.client);
                  (Ur.removeNotificationHandler("notifications/claude/channel"),
                    Ur.removeNotificationHandler(CHANNEL_PERMISSION_METHOD));
                } else if (ts) {
                  (logMCPDebug(
                    client.name,
                    `Channel gate says skip:${Un.kind} but was previously registered \u2014 preserving handler`,
                  ),
                    Qn(),
                    (pr = !0));
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
                  (Un.kind === "marketplace" || Un.kind === "allowlist" || timer !== void 0)
                ) {
                  Wo.current.add(Gn);
                  let Ur =
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
                      Un.kind === "era"
                        ? `channels-blocked-era-${client.name}`
                        : `channels-blocked-${Un.kind}`,
                    priority: "high",
                    text: Ur,
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
                skip_kind: Un.action === "skip" ? fromEnum(Un.kind) : void 0,
                entry_kind: fromEnumOpt(timer?.kind),
                is_dev: timer?.dev ?? !1,
                plugin: or,
              });
            let ur = identityEpoch(),
              Ir = () => identityEpoch() === ur || !isRemoteMcpTransport(client.config);
            if (client.capabilities?.tools?.listChanged)
              getMcpClientModule().onMcpToolListChanged(client, async (Pr) => {
                if (!Ir()) return;
                let {
                    fetchToolsForClient: fetchToolsForClient,
                    getToolsListErrorForResult: getToolsListErrorForResult,
                    persistRefreshedToolsIfPresent: persistRefreshedToolsIfPresent,
                  } = getMcpClientModule(),
                  Zr = oq(client.name, client.config),
                  wr = Y2e(Pr);
                logMCPDebug(
                  client.name,
                  Pr === REOPEN_REFETCH
                    ? "Synthesized tools refetch after listen-stream reopen (no notification received)"
                    : "Received tools/list_changed notification, refreshing tools",
                );
                try {
                  let zr = ir(client.name, client.config),
                    previousToolsPromise = fetchToolsForClient.cache.get(zr);
                  fetchToolsForClient.cache.delete(zr);
                  let fr = await fetchToolsForClient(client, storageV5),
                    $r = getToolsListErrorForResult(fr);
                  if ($r)
                    logForDebugging(
                      `[mcp] ${client.name}: tools/list_changed refresh failed (${$r}); keeping previous tools`,
                      { level: "warn" },
                    );
                  let Yr = client.discoveryAuthFailure && fr.length === 0;
                  if (Yr)
                    logMCPDebug(
                      client.name,
                      "tools refresh returned the needs-auth empty list; keeping previous tools",
                    );
                  let newCount = fr.length,
                    Vr = Boolean($r) || Yr;
                  if (!Vr && previousToolsPromise)
                    previousToolsPromise.then(
                      (previousTools) => {
                        logEvent("tengu_mcp_list_changed", {
                          mcpServerKeyHash: toolNameForTelemetry(client.name),
                          type: lit_2("tools"),
                          cause: wr,
                          previousCount: previousTools.length,
                          newCount: newCount,
                        });
                      },
                      () => {
                        logEvent("tengu_mcp_list_changed", {
                          mcpServerKeyHash: toolNameForTelemetry(client.name),
                          type: lit_2("tools"),
                          cause: wr,
                          newCount: newCount,
                        });
                      },
                    );
                  else if (!Vr)
                    logEvent("tengu_mcp_list_changed", {
                      mcpServerKeyHash: toolNameForTelemetry(client.name),
                      type: lit_2("tools"),
                      cause: wr,
                      newCount: newCount,
                    });
                  if (!Ir()) return;
                  if (
                    (hn({ ...client, tools: $r || Yr ? void 0 : decorateMcpTools(client, fr) }), !Vr && fd())
                  )
                    Zr.then((ms) =>
                      persistRefreshedToolsIfPresent(client, fr, { identityEpoch: ur, grantLeg: ms }),
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
                let {
                  fetchCommandsForClient: fetchCommandsForClient,
                  getDiscoveryFetchError: getDiscoveryFetchError,
                } = getMcpClientModule();
                logMCPDebug(
                  client.name,
                  Pr === REOPEN_REFETCH
                    ? "Synthesized prompts refetch after listen-stream reopen (no notification received)"
                    : "Received prompts/list_changed notification, refreshing prompts",
                );
                try {
                  fetchCommandsForClient.cache.delete(ir(client.name, client.config));
                  let [Ur, Zr] = await Promise.all([fetchCommandsForClient(client), Promise.resolve([])]),
                    wr = getDiscoveryFetchError(Ur);
                  if (wr)
                    logForDebugging(
                      `[mcp] ${client.name}: prompts/list_changed refresh failed (${describeConnectError(wr, client.config)}); keeping previous commands`,
                      { level: "warn" },
                    );
                  if (!Ir()) return;
                  (hn({ ...client, commands: wr ? void 0 : stampToolScope(client, [...Ur, ...Zr]) }),
                    clearSkillIndex(),
                    logEvent("tengu_mcp_list_changed", {
                      mcpServerKeyHash: toolNameForTelemetry(client.name),
                      type: lit_2("prompts"),
                      cause: Y2e(Pr),
                    }));
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
                  fetchResourcesForClient: fetchResourcesForClient,
                  fetchResourceTemplatesForClient: fetchResourceTemplatesForClient,
                  fetchCommandsForClient: fetchCommandsForClient,
                  getDiscoveryFetchError: getDiscoveryFetchError,
                } = getMcpClientModule();
                logMCPDebug(
                  client.name,
                  Pr === REOPEN_REFETCH
                    ? "Synthesized resources refetch after listen-stream reopen (no notification received)"
                    : "Received resources/list_changed notification, refreshing resources",
                );
                try {
                  let wr = ir(client.name, client.config);
                  (fetchResourcesForClient.cache.delete(wr),
                    fetchResourceTemplatesForClient.cache.delete(wr));
                  {
                    let [zr, _r] = await Promise.all([
                        fetchResourcesForClient(client),
                        fetchResourceTemplatesForClient(client),
                      ]),
                      fr = getDiscoveryFetchError(zr),
                      $r = getDiscoveryFetchError(_r),
                      Yr = fr ?? $r;
                    if (Yr)
                      logForDebugging(
                        `[mcp] ${client.name}: resources/list_changed refresh partial failure (${describeConnectError(Yr, client.config)}); keeping previous for failed fields`,
                        { level: "warn" },
                      );
                    if (!Ir()) return;
                    hn({ ...client, resources: fr ? void 0 : zr, resourceTemplates: $r ? void 0 : _r });
                  }
                  logEvent("tengu_mcp_list_changed", {
                    mcpServerKeyHash: toolNameForTelemetry(client.name),
                    type: lit_2("resources"),
                    cause: Y2e(Pr),
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
            let Zn = (Ro.current.get(client.name) ?? 0) + 1;
            if (isRetryableRemoteFailure(client) && Zn <= MAX_INITIAL_CONNECT_RETRIES) {
              Ro.current.set(client.name, Zn);
              let Un = cCt(Zn);
              (logMCPDebug(
                client.name,
                `Transient ${client.errorCode ?? "<sse-no-code>"} on initial connect \u2014 retry ${Zn}/${MAX_INITIAL_CONNECT_RETRIES} in ${Un}ms`,
              ),
                hn({
                  name: client.name,
                  config: client.config,
                  type: "pending",
                  reconnectAttempt: Zn,
                  maxReconnectAttempts: MAX_INITIAL_CONNECT_RETRIES,
                }));
              let dr = reconnectTimersRef.current.get(client.name);
              if (dr) dr();
              let or = identityEpoch(),
                pr = setAppState.setTimeout(() => {
                  if ((reconnectTimersRef.current.delete(client.name), isMcpServerDisabled(client.name))) {
                    hn({ ...client });
                    return;
                  }
                  if (identityEpoch() !== or) return;
                  let Qn = mcpDialBlockCause(client.name, client.config);
                  if (Qn) {
                    (markClaudeInChromeUnwiredIfChrome(client.name),
                      logMCPDebug(
                        client.name,
                        "Server blocked by managed policy during initial-connect retry, stopping retry",
                      ),
                      hn({
                        name: client.name,
                        type: "failed",
                        config: client.config,
                        ...mcpGateError(Qn, client.name, client.config),
                      }));
                    return;
                  }
                  getMcpClientModule()
                    .reconnectMcpServerImpl(client.name, client.config, storageV5, credentials)
                    .then(
                      (ur) => {
                        if (identityEpoch() !== or) return;
                        updateServer(ur);
                      },
                      (ur) => {
                        if (
                          (logMCPError(
                            client.name,
                            `Initial-connect retry ${Zn} threw: ${describeConnectError(ur, client.config)}`,
                          ),
                          identityEpoch() !== or)
                        )
                          return;
                        hn({ ...client });
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
      [setAppState, hn, addNotification, removeNotification, Be, storageV5, credentials, L],
    );
  (P(
    () =>
      REAUTH_RECONNECT_SIGNAL.subscribe((_o, cn) => {
        (async () => {
          let Dn = () =>
              void getMcpClientModule()
                .clearServerCache(_o, cn)
                .catch(() => {}),
            wn = identityEpoch();
          try {
            let found = He.get().clients.find((client) => client.name === _o);
            if (
              found === void 0 ||
              !isConnectedOrCached(found) ||
              isMcpServerDisabled(_o) ||
              isMcpDialBlockedByPolicy(_o, cn)
            ) {
              Dn();
              return;
            }
            if (ir(_o, found.config) !== ir(_o, cn)) {
              Dn();
              return;
            }
            let Kn = getMcpClientModule(),
              connectToServer = await Kn.connectToServer(_o, cn, void 0, storageV5, credentials);
            if (identityEpoch() !== wn) {
              if (connectToServer.type === "connected") Kn.detachAndCloseConnection(connectToServer);
              return;
            }
            if (connectToServer.type !== "connected") return;
            let [Fr, Zn, Un, dr] = await Promise.all([
              Kn.fetchToolsForClient(connectToServer, storageV5),
              Kn.fetchCommandsForClient(connectToServer),
              Promise.resolve([]),
              connectToServer.capabilities?.resources
                ? Kn.fetchResourcesForClient(connectToServer)
                : Promise.resolve([]),
            ]);
            if (identityEpoch() !== wn) {
              Kn.detachAndCloseConnection(connectToServer);
              return;
            }
            let found_2 = He.get().clients.find((client) => client.name === _o);
            if (
              found_2 === void 0 ||
              !isConnectedOrCached(found_2) ||
              isMcpServerDisabled(_o) ||
              isMcpDialBlockedByPolicy(_o, cn) ||
              ir(_o, found_2.config) !== ir(_o, cn)
            ) {
              Dn();
              return;
            }
            updateServer(
              applyMcpServerConfig(found_2.config, {
                client: connectToServer,
                tools: Fr,
                commands: [...Zn, ...Un],
                resources: dr,
                resourceTemplates: [],
                replaceOnly: !0,
              }),
            );
          } catch (error) {
            if ((Dn(), !isMcpServerDisabled(_o) && identityEpoch() === wn))
              hn({
                name: _o,
                type: "failed",
                config: cn,
                error: `Re-adopt after re-authentication failed: ${describeConnectError(error, cn)}`,
                replaceOnly: !0,
              });
            logForDebugging(
              `Failed to re-adopt reauth connection for ${_o}: ${describeConnectError(error, cn)}`,
              { level: "error" },
            );
          }
        })();
      }),
    [He, updateServer, hn, storageV5, credentials],
  ),
    P(
      () => (
        setConnectedClientWiring((_o) => {
          if (!fd()) return;
          let { registerElicitationHandler: registerElicitationHandler } =
            require("./chunk-asne9cp8.js").mcpElicitationHandlerModule();
          registerElicitationHandler(
            oa(_o.client),
            _o.name,
            L,
            _o.transportErrorState,
            _o.config.pluginSource,
          );
        }),
        () => setConnectedClientWiring(void 0)
      ),
      [L],
    ),
    P(
      () =>
        CACHED_ADOPT_SIGNAL.subscribe((_o, cn) => {
          (async () => {
            let Dn = identityEpoch(),
              wn = getMcpClientModule();
            try {
              let mr = Mn(_o);
              if (mr?.type !== "cached") return;
              let Kn = mcpDialBlockCause(_o, cn);
              if (Kn) {
                (markClaudeInChromeUnwiredIfChrome(_o),
                  wn.clearServerCache(_o, cn).catch(() => {}),
                  wn.dropDiscoveryEntry(_o, cn).catch(() => {}),
                  hn({ name: _o, type: "failed", config: cn, ...mcpGateError(Kn, _o, cn), replaceOnly: !0 }));
                return;
              }
              if (isMcpServerDisabled(_o)) {
                (wn.clearServerCache(_o, cn).catch(() => {}),
                  updateServer({
                    client: { name: _o, type: "failed", config: cn, error: wkt, errorCode: "DISABLED" },
                    tools: [],
                    commands: [],
                    replaceOnly: !0,
                  }));
                return;
              }
              if (ir(_o, mr.config) !== ir(_o, cn)) {
                wn.clearServerCache(_o, cn).catch(() => {});
                return;
              }
              let connectToServer = await wn.connectToServer(_o, cn, void 0, storageV5, credentials);
              if (identityEpoch() !== Dn) return;
              if (connectToServer.type === "connected" && isMcpServerDisabled(_o)) {
                updateServer({ client: connectToServer, tools: [], commands: [], replaceOnly: !0 });
                return;
              }
              if (connectToServer.type !== "connected") {
                if (connectToServer.type === "needs-auth")
                  updateServer({
                    client: { ...connectToServer, config: mr.config },
                    tools: mcpAuthToolsFor(_o, mr.config),
                    commands: [],
                    resources: [],
                    resourceTemplates: [],
                    replaceOnly: !0,
                  });
                return;
              }
              clearDiscoveryPathMemo(_o);
              let Fr = await oq(_o, cn);
              if (identityEpoch() !== Dn) return;
              let Zn = !!connectToServer.capabilities?.resources,
                [Un, dr, or, pr] = await Promise.all([
                  wn.fetchToolsForClient(connectToServer, storageV5),
                  wn.fetchCommandsForClient(connectToServer),
                  Promise.resolve([]),
                  Zn ? wn.fetchResourcesForClient(connectToServer) : Promise.resolve([]),
                ]);
              if ((await wn.peekSettledConnection(_o, cn)) !== connectToServer) return;
              let Qn = Mn(_o);
              if (identityEpoch() !== Dn || Qn?.type !== "cached") return;
              if (ir(_o, Qn.config) !== ir(_o, cn)) {
                wn.clearServerCache(_o, cn).catch(() => {});
                return;
              }
              let ur = mcpDialBlockCause(_o, cn);
              if (ur) {
                (markClaudeInChromeUnwiredIfChrome(_o),
                  (oa(connectToServer.client).onclose = void 0),
                  wn.clearServerCache(_o, cn).catch(() => {}),
                  wn.dropDiscoveryEntry(_o, cn).catch(() => {}),
                  hn({ name: _o, type: "failed", config: cn, ...mcpGateError(ur, _o, cn), replaceOnly: !0 }));
                return;
              }
              let toolsListErrorForResult = wn.getToolsListErrorForResult(Un),
                Pr = toolsListErrorForResult
                  ? He.get().tools.filter((tool) => isToolFromMcpServer(tool, _o))
                  : Un;
              if (toolsListErrorForResult)
                logForDebugging(
                  `Cached MCP server ${_o}: adoption tools/list failed (${describeConnectError(toolsListErrorForResult, cn)}); keeping cached surface`,
                  { level: "warn" },
                );
              let discoveryFetchError = wn.getDiscoveryFetchError(dr),
                Ur = [
                  ...(discoveryFetchError
                    ? He.get().commands.filter(
                        (command) => commandBelongsToServer(command, _o) && command.loadedFrom !== "mcp",
                      )
                    : dr),
                  ...or,
                ];
              if (discoveryFetchError)
                logForDebugging(
                  `Cached MCP server ${_o}: adoption prompts/list failed (${describeConnectError(discoveryFetchError, cn)}); keeping cached prompts`,
                  { level: "warn" },
                );
              let Zr = pr ? wn.getDiscoveryFetchError(pr) : void 0;
              if (Zr)
                logForDebugging(
                  `Cached MCP server ${_o}: adoption resources/list failed (${describeConnectError(Zr, cn)}); keeping cached resources`,
                  { level: "warn" },
                );
              (updateServer(
                applyMcpServerConfig(Qn.config, {
                  client: connectToServer,
                  tools: Pr,
                  commands: Ur,
                  resources: Zr ? void 0 : pr,
                  resourceTemplates: [],
                  replaceOnly: !0,
                }),
              ),
                wn.persistLiveListing(connectToServer, {
                  tools: Un,
                  commands: dr,
                  resources: pr,
                  identityEpoch: Dn,
                  grantLeg: Fr,
                }));
            } catch (error) {
              logForDebugging(
                `Failed to adopt cached MCP server ${_o} after lazy connect: ${describeConnectError(error, cn)}`,
                { level: "warn" },
              );
            }
          })();
        }),
      [He, updateServer, hn, storageV5, credentials, Mn],
    ),
    P(
      () =>
        CACHED_DIAL_FAILED_SIGNAL.subscribe((_o, cn) => {
          getMcpClientModule().takeSettledCachedDialFailure(_o.name, _o.config);
          let Dn = Mn(_o.name);
          if (Dn?.type !== "cached" || ir(_o.name, Dn.config) !== ir(_o.name, _o.config)) return;
          if ((updateServer({ client: _o, tools: [], commands: [], replaceOnly: !0 }), cn))
            strikeAfterLazyDialFailure(_o.name, _o.config);
        }),
      [updateServer, Mn],
    ),
    P(() => {
      if (store) return;
      let _o = setIdentityTrippedHandler(() => {
        if (It.current === identityEpoch()) return;
        kt((cn) => cn + 1);
      });
      if (V4n()) Ot.current = !0;
      return _o;
    }, [store]));
  let sessionId = getSessionId();
  (P(() => {
    if (store) return;
    async function initializeServersAsPending() {
      let {
          servers: existingConfigs,
          errors: mcpErrors,
          warnings: warnings,
          reservedNameRefusals: reservedNameRefusals = [],
        } = x
          ? { servers: {}, errors: [], warnings: [] }
          : await getClaudeCodeMcpConfigs(h, { storageV5: storageV5, admits: zye() }),
        Kn = mergeUniqueServerRefs(D3s(), reservedNameRefusals);
      He.setReservedNameRefusals(Kn);
      let Wn = new Set(Kn.map((or) => `${or.scope}:${or.name}`));
      for (let or of Io.current) if (!Wn.has(or)) Io.current.delete(or);
      for (let or of []) {
        let pr = `${or.scope}:${or.name}`;
        if (Io.current.has(pr)) continue;
        (Io.current.add(pr),
          addNotification({
            key: `mcp-reserved-name-${pr}`,
            kind: "warning",
            priority: "high",
            text: I3s(or),
            color: "warning",
            timeoutMs: 20000,
          }));
      }
      let { configs: configs, blocked: blocked } = filterUnapprovedMcpServers(h, Dt),
        configs_2 = { ...existingConfigs, ...configs },
        dr = configs[CLAUDE_IN_CHROME_MCP_SERVER_NAME];
      if (dr && dialsClaudeInChromeBridge(CLAUDE_IN_CHROME_MCP_SERVER_NAME, dr)) markClaudeInChromeRewired();
      if (blocked.length > 0) {
        (blocked.sort(),
          logForDebugging(`MCP servers blocked by managed policy at connect time: ${blocked.join(", ")}`, {
            level: "warn",
          }));
        let joined = blocked.join(",");
        if (Ho.current !== joined) {
          Ho.current = joined;
          let pr = [],
            filtered = blocked.filter(
              (prevState) =>
                !pr.includes(prevState) && !(prevState === CLAUDE_ARTIFACTS && Zl(h && getOwn(h, prevState))),
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
          let Qn = h && getOwn(h, pr);
          if (Qn)
            getMcpClientModule()
              .clearServerCache(pr, Qn)
              .catch(() => {});
        }
      } else Ho.current = null;
      (We.addErrors(mcpErrors),
        We.addWarnings(warnings),
        He.reconcileConfiguredServers(configs_2, getOriginalCwd(), (or) => {
          for (let pr of or) {
            let timer = reconnectTimersRef.current.get(pr.name);
            if (timer) (timer(), reconnectTimersRef.current.delete(pr.name));
            if ((mn.current.delete(pr.name), Ro.current.delete(pr.name), !isConnectedOrCached(pr))) continue;
            if (pr.type === "connected") oa(pr.client).onclose = void 0;
            getMcpClientModule()
              .clearServerCache(pr.name, pr.config)
              .catch(() => {});
          }
        }));
    }
    initializeServersAsPending().catch((cn) => {
      logMCPError("useManageMCPConnections", `Failed to initialize servers as pending: ${errorMessage(cn)}`);
    });
  }, [x, h, He, We, sessionId, Lt, Et, Dt, storageV5, co]),
    P(() => {
      if (store) return;
      let _o = !1,
        cn = (error) => updateServer(_o ? { ...error, superseded: !0 } : { ...error, asked: !0 });
      async function loadAndConnectMcpConfigs() {
        let wn = Xe.current !== void 0 && Xe.current !== ze,
          mr = At.current !== rt;
        At.current = rt;
        let Kn = Ot.current;
        Ot.current = !1;
        let Wn = wn || mr || Kn;
        if (Wn) channelWarnedKindsRef.current = 0;
        primeDiscoveryCacheFlag();
        let Fr = fd(),
          Zn = Wn && Fr && (getMcpClientModule().mcpIdentityChangedSinceLastCheck() || Kn);
        if (Zn) {
          let wr = getMcpClientModule(),
            filtered = He.get().clients.filter(isConnectedOrCached),
            _r = new Set(),
            fr = new Set(),
            clients = He.get().clients;
          for (let ms of clients)
            if (!isRemoteMcpTransport(ms.config)) (_r.add(ms.name), fr.add(ir(ms.name, ms.config)));
          let Yr = hasRemoteMcpServers(clients),
            Er = new Set();
          for (let ms of filtered) {
            if (_r.has(ms.name)) continue;
            if (ms.type === "connected") oa(ms.client).onclose = void 0;
            (wr.disposeServerConnectionDetached(ms.name, ms.config), Er.add(ms.name));
          }
          for (let client of He.get().clients)
            if (
              client.type === "needs-auth" &&
              isRemoteMcpTransport(client.config) &&
              (client.config.type === "http" || client.config.type === "sse")
            )
              Er.add(client.name);
          let Vr = new Set();
          for (let client of He.get().clients)
            if (client.config.type === "claudeai-proxy" && !_r.has(client.name)) Vr.add(client.name);
          for (let ms of [...reconnectTimersRef.current.keys()]) {
            if (_r.has(ms)) continue;
            (reconnectTimersRef.current.get(ms)?.(), reconnectTimersRef.current.delete(ms));
          }
          for (let ms of [...mn.current]) if (!_r.has(ms)) mn.current.delete(ms);
          for (let ms of [...Ro.current.keys()]) if (!_r.has(ms)) Ro.current.delete(ms);
          (He.applyIdentityBoundary(Er, Vr),
            wr.evictAllMcpMemosOnIdentityChange(fr, Yr),
            deleteNeedsAuthCache(storageV5),
            jW().clear(),
            (It.current = identityEpoch()));
        }
        if (Fr) Xe.current = ze;
        let claudeaiPromise,
          dr = !1;
        if (x || isBareMode() || shouldSkipClaudeAiFetchForEnterpriseLockdown())
          (markConnectorListUnavailable(), (claudeaiPromise = Promise.resolve({})));
        else {
          if ((clearClaudeAiConfigsFetch(), Wn)) {
            if (!Zn) deleteNeedsAuthCache(storageV5);
            (resetClaudeAiSessionConnections(), (Ao.current = !1));
          }
          ((Xe.current = ze), (dr = !0), (claudeaiPromise = fetchClaudeAiConfigsOnce(credentials)));
        }
        let {
          servers: claudeCodeConfigs,
          errors: mcpErrors,
          warnings: warnings,
        } = x
          ? { servers: {}, errors: [], warnings: [] }
          : await getClaudeCodeMcpConfigs(h, { storageV5: storageV5, admits: zye() });
        if (_o) return;
        (We.addErrors(mcpErrors), We.addWarnings(warnings));
        let ur = filterUnapprovedMcpServers(h, Dt),
          configs = { ...claudeCodeConfigs, ...ur.configs },
          Pr = filterObject(configs, (wr, zr) => !isMcpServerDisabled(zr));
        if (Object.keys(Pr).length > 0 || (Fr && Object.keys(configs).length > 0))
          getMcpClientModule().seedMcpIdentityCheck();
        if (Object.keys(Pr).length > 0)
          getMcpClientModule()
            .getMcpToolsCommandsAndResources(cn, Pr, storageV5, credentials)
            .catch((error) => {
              logMCPError("useManageMcpConnections", `Failed to get MCP resources: ${errorMessage(error)}`);
            });
        let claudeaiConfigs = {};
        if (!x) {
          let wr = (await claudeaiPromise) ?? {},
            { allowed: allowed, blocked: blocked } = filterMcpServersByPolicy(wr);
          if (((claudeaiConfigs = allowed), _o)) return;
          try {
            try {
              if (dr && F6o(wr)) {
                let Yr = channelWarnedKindsRef.current,
                  Er = CLAUDEAI_LIST_RETRY_DELAYS_MS[Yr];
                if (Er !== void 0)
                  (logForDebugging(
                    `[claudeai-mcp] Connector-list fetch failed transiently; background retry ${Yr + 1}/${CLAUDEAI_LIST_RETRY_DELAYS_MS.length} in ${Er}ms`,
                  ),
                    (channelPermCallbacksRef.current = setAppState.setTimeout(() => {
                      ((channelPermCallbacksRef.current = null),
                        (channelWarnedKindsRef.current += 1),
                        so((Vr) => Vr + 1));
                    }, Er)));
              } else if (dr) channelWarnedKindsRef.current = 0;
            } catch (error) {
              logMCPError(
                "useManageMcpConnections",
                `Failed to schedule claude.ai catalog retry: ${errorMessage(error)}`,
              );
            }
            if (hasDisableClaudeAiConnectors())
              for (let client of He.get().clients) {
                if (client.config.scope !== "claudeai") continue;
                if (client.type === "disabled") continue;
                let Er = reconnectTimersRef.current.get(client.name);
                if (Er) (Er(), reconnectTimersRef.current.delete(client.name));
                if (
                  (mn.current.delete(client.name),
                  Ro.current.delete(client.name),
                  isConnectedOrCached(client))
                ) {
                  if (client.type === "connected") oa(client.client).onclose = void 0;
                  getMcpClientModule()
                    .clearServerCache(client.name, client.config)
                    .catch(() => {});
                }
                hn({ name: client.name, type: "failed", config: client.config, error: RYo });
              }
            if (blocked.length > 0) {
              logForDebugging(
                `claude.ai connectors blocked by managed policy at connect time: ${blocked.join(", ")}`,
                { level: "warn" },
              );
              for (let Yr of blocked) {
                let found = He.get().clients.find(
                  (prevState) => prevState.name === Yr && prevState.config.scope === "claudeai",
                );
                if (!found) continue;
                let Vr = reconnectTimersRef.current.get(Yr);
                if (Vr) (Vr(), reconnectTimersRef.current.delete(Yr));
                if (isConnectedOrCached(found)) {
                  if (found.type === "connected") oa(found.client).onclose = void 0;
                  getMcpClientModule()
                    .clearServerCache(Yr, found.config)
                    .catch(() => {});
                }
                hn({ name: Yr, type: "failed", config: found.config, error: BLOCKED_BY_POLICY_REASON });
              }
            }
            let fr = U6o();
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
              let { servers: servers, suppressed: suppressed } = await dedupClaudeAiMcpServers(
                claudeaiConfigs,
                configs,
              );
              if (_o) return;
              ((claudeaiConfigs = servers), ($r = suppressed));
            }
            if ((He.setSuppressedClaudeAiConnectors($r), Object.keys(claudeaiConfigs).length > 0)) {
              He.addPendingServers(claudeaiConfigs);
              let Yr = filterObject(claudeaiConfigs, (Er, Vr) => !isMcpServerDisabled(Vr));
              if (Object.keys(Yr).length > 0 || (Fr && Object.keys(claudeaiConfigs).length > 0))
                getMcpClientModule().seedMcpIdentityCheck();
              if (Object.keys(Yr).length > 0)
                getMcpClientModule()
                  .getMcpToolsCommandsAndResources(cn, Yr, storageV5, credentials)
                  .catch((Er) => {
                    logMCPError(
                      "useManageMcpConnections",
                      `Failed to get claude.ai MCP resources: ${errorMessage(Er)}`,
                    );
                  });
            }
          } finally {
            if (!_o) {
              let fr = filterUnapprovedMcpServers(h, Dt),
                $r =
                  !En(Object.keys(ur.configs).sort(), Object.keys(fr.configs).sort()) ||
                  !En([...ur.blocked].sort(), [...fr.blocked].sort()),
                Yr = F6o(wr),
                Er = isGateOOn() && hasManagedMcpPolicy() && !Yr && !Ao.current;
              if ($r || Er) {
                if (!Yr) Ao.current = !0;
                bo((error) => error + 1);
              }
            }
          }
        }
        let allConfigs = { ...configs, ...claudeaiConfigs },
          Ur = { enterprise: 0, global: 0, project: 0, user: 0, plugin: 0, agent: 0, claudeai: 0 },
          Zr = [];
        for (let [wr, zr] of Object.entries(allConfigs)) {
          let _r = zr.scope ? SCOPE_TO_TELEMETRY_SOURCE[zr.scope] : void 0;
          if (_r) Ur[_r]++;
        }
        logEvent("tengu_mcp_servers", { ...Ur, ...!1 });
      }
      return (
        loadAndConnectMcpConfigs().catch((wn) => {
          logMCPError("useManageMcpConnections", `MCP connect failed on mount: ${describeErrorBrief(wn)}`);
        }),
        () => {
          ((_o = !0), channelPermCallbacksRef.current?.(), (channelPermCallbacksRef.current = null));
        }
      );
    }, [
      x,
      h,
      updateServer,
      He,
      We,
      ze,
      rt,
      sessionId,
      Lt,
      Et,
      Dt,
      storageV5,
      credentials,
      setAppState,
      io,
      co,
    ]),
    P(() => {
      let timers = reconnectTimersRef.current;
      return () => {
        for (let timer of timers.values()) timer();
        if ((timers.clear(), flushTimerRef.current !== null))
          (flushTimerRef.current(), (flushTimerRef.current = null), flushPendingUpdates());
      };
    }, [flushPendingUpdates]));
  let reconnectMcpServer = ce(
      async (_o, cn = { discardDiscovery: !0 }) => {
        let Dn = Bo.current.get(_o);
        while (cn.revokeTokens && Dn && Dn.epoch === identityEpoch())
          (await Dn.attempt.catch(() => {}), (Dn = Bo.current.get(_o)));
        if (Dn && Dn.epoch === identityEpoch()) {
          if (IM() && cn.discardDiscovery && !Dn.discardDiscovery && !Dn.connectNow) {
            let found = He.get().clients.find((serverName) => serverName.name === _o);
            if (found)
              getMcpClientModule()
                .dropDiscoveryEntry(_o, found.config)
                .catch(() => {});
          }
          return Dn.attempt;
        }
        let client = He.get().clients.find((client) => client.name === _o);
        if (!client)
          throw withTelemetryMessage(Error(`MCP server ${_o} not found`), "MCP server not found in store");
        if (isMcpServerDisabled(_o))
          throw new WireSafeControlError(
            client.type === "disabled" ? disabledEnableInMcpText(_o) : disabledElsewhereText(_o),
            "MCP server disabled; enable before reconnect",
          );
        let existingTimer = reconnectTimersRef.current.get(_o);
        if (existingTimer) (existingTimer(), reconnectTimersRef.current.delete(_o));
        let Kn = identityEpoch(),
          Wn = client.type === "cached" || client.type === "pending",
          Fr = cn.discardDiscovery && !Wn,
          Zn = (async () => {
            hn({ name: _o, type: "pending", config: client.config });
            try {
              let dr = cn.keepConfig
                  ? void 0
                  : ((h && getOwn(h, _o)) ??
                    (x
                      ? void 0
                      : getOwn(
                          (await getClaudeCodeMcpConfigs(h, { storageV5: storageV5, admits: zye() })).servers,
                          _o,
                        ))),
                or = dr ?? client.config,
                pr = mcpDialBlockCause(_o, or);
              if (pr)
                throw (
                  markClaudeInChromeUnwiredIfChrome(_o),
                  mcpRefusalError(_o, pr, or, `MCP server ${uo(_o)} is blocked by enterprise managed policy`)
                );
              let Qn = cn.revokeTokens ? await revokeStoredMcpTokens(_o, [client.config, or]) : void 0;
              if (Qn && !Qn.cleared && Qn.reason !== "keychain_unreadable")
                throw new WireSafeControlError(
                  `Claude Code did not reconnect to ${uo(_o)}: sign-in data for the config in your settings is still stored, or the credential store could not be read. Restart Claude Code and use Clear authentication again.`,
                  "MCP clear-auth reconnect: credential store not cleared",
                );
              if (client.type === "connected") oa(client.client).onclose = void 0;
              let ur = await (Fr
                ? getMcpClientModule().reconnectMcpServerDistrusted(_o, or, storageV5, credentials)
                : getMcpClientModule().reconnectMcpServerImpl(_o, or, storageV5, credentials));
              if (isMcpServerDisabled(_o)) {
                if (ur.client.type === "connected") detachClientAndClearCache(ur.client);
                throw new WireSafeControlError(
                  `"${uo(_o)}" was disabled while reconnecting`,
                  "MCP server disabled during reconnect",
                );
              }
              if (identityEpoch() === Kn) {
                if ((updateServer(dr === void 0 ? ur : { ...ur, asked: !0 }), dr === void 0)) {
                  (flushTimerRef.current?.(), flushPendingUpdates());
                  let Ir = keptConnectionOrFailed(
                    ur.client,
                    He.get().clients.find((client) => client.name === _o),
                  );
                  if (Ir !== ur.client) return { ...ur, client: Ir, tools: [], commands: [] };
                }
              }
              return ur;
            } catch (error) {
              if (identityEpoch() === Kn) hn(client);
              throw error;
            }
          })(),
          Un = { attempt: Zn, epoch: Kn, discardDiscovery: Fr, connectNow: Wn };
        Bo.current.set(_o, Un);
        try {
          return await Zn;
        } finally {
          if (Bo.current.get(_o) === Un) Bo.current.delete(_o);
        }
      },
      [He, hn, updateServer, flushPendingUpdates, h, x, storageV5, credentials],
    ),
    toggleMcpServer = ce(
      async (serverName) => {
        let client = He.get().clients.find((client) => client.name === serverName);
        if (!client)
          throw withTelemetryMessage(
            Error(`MCP server ${serverName} not found`),
            "MCP server not found in store",
          );
        if (client.type !== "disabled") {
          let wn = reconnectTimersRef.current.get(serverName);
          if (wn) (wn(), reconnectTimersRef.current.delete(serverName));
          if (
            (setMcpServerEnabled(serverName, !1, storageV5),
            mn.current.delete(serverName),
            Ro.current.delete(serverName),
            client.type === "connected")
          )
            await getMcpClientModule().clearServerCache(serverName, client.config);
          else if (client.type === "cached")
            getMcpClientModule().disposeServerConnectionDetached(serverName, client.config);
          if (IM())
            getMcpClientModule()
              .dropDiscoveryEntry(serverName, client.config)
              .catch(() => {});
          let mr = { name: serverName, type: "disabled", config: client.config };
          return (hn(mr), mr);
        } else {
          let wn =
              (h && getOwn(h, serverName)) ??
              (x
                ? void 0
                : getOwn(
                    (await getClaudeCodeMcpConfigs(h, { storageV5: storageV5, admits: zye() })).servers,
                    serverName,
                  )),
            mr = wn ?? client.config,
            Kn = wn !== void 0,
            Wn = mcpDialBlockCause(serverName, mr);
          if (Wn)
            throw (
              markClaudeInChromeUnwiredIfChrome(serverName),
              mcpRefusalError(
                serverName,
                Wn,
                mr,
                `MCP server ${uo(serverName)} is blocked by enterprise managed policy`,
              )
            );
          (setMcpServerEnabled(serverName, !0, storageV5),
            hn({ name: serverName, type: "pending", config: mr, ...(Kn && { asked: !0 }) }));
          let Fr = identityEpoch(),
            reconnectMcpServerImpl = await getMcpClientModule().reconnectMcpServerImpl(
              serverName,
              mr,
              storageV5,
              credentials,
            );
          if (isMcpServerDisabled(serverName)) {
            if (reconnectMcpServerImpl.client.type === "connected")
              detachClientAndClearCache(reconnectMcpServerImpl.client);
            throw (
              hn({ name: serverName, type: "disabled", config: mr }),
              new WireSafeControlError(
                `"${uo(serverName)}" was disabled while enabling`,
                "MCP server disabled during enable",
              )
            );
          }
          if (identityEpoch() === Fr) {
            if ((updateServer(Kn ? { ...reconnectMcpServerImpl, asked: !0 } : reconnectMcpServerImpl), !Kn))
              return (
                flushTimerRef.current?.(),
                flushPendingUpdates(),
                keptConnectionOrFailed(
                  reconnectMcpServerImpl.client,
                  He.get().clients.find((client) => client.name === serverName),
                )
              );
          }
          return reconnectMcpServerImpl.client;
        }
      },
      [He, hn, updateServer, flushPendingUpdates, h, x, storageV5, credentials],
    );
  return { reconnectMcpServer: reconnectMcpServer, toggleMcpServer: toggleMcpServer };
}
//@ chunk-18hwfzwa.js:1737581-1737678 layout
function detachClientAndClearCache(h) {
  ((oa(h.client).onclose = void 0),
    getMcpClientModule()
      .clearServerCache(h.name, h.config)
      .catch(() => {}));
}
/**
 * getMcpClientModule：经 chunk-asne9cp8 按 MCP_SDK_GENERATION 取 v1/v2 客户端模块（mcpClientModule）。
 */
//@ chunk-18hwfzwa.js:1737678-1737748 layout
function getMcpClientModule() {
  return require("./chunk-asne9cp8.js").mcpClientModule();
}
/**
 * getTransportDisplayName：http → HTTP，ws/ws-ide → WebSocket，其他 → SSE。
 */
//@ chunk-18hwfzwa.js:1737748-1737859 fingerprint = getTransportDisplayName (1)
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
function mcpPolicySnapshotKey(h) {
  return jsonStringify([
    h.allowedMcpServers ?? null,
    h.deniedMcpServers ?? null,
    h.managedMcpServers ?? null,
    h.disableClaudeAiConnectors ?? null,
    getEffectiveMcpPolicyKey(),
  ]);
}
//@ chunk-18hwfzwa.js:1738004-1738045 placement
var ALLOW_CLAUDE_BROWSER_EXTENSION = "allow_claude_browser_extension";
//@ chunk-7nse75qx.js:307-453 fingerprint = getErrorKey (0.72)
function getErrorKey(error) {
  let t = "plugin" in error ? error.plugin : "no-plugin",
    n = error.type === "mcpb-needs-config" ? `:${error.serverName}` : "";
  return `${error.type}:${error.source}:${t}${n}`;
}

export { ALLOW_CLAUDE_BROWSER_EXTENSION, useManageMCPConnections, redialFailedMcpServers, getErrorKey };
