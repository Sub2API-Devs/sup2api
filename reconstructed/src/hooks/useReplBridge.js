/**
 * hooks/useReplBridge.tsx
 *
 * Remote Control（bridge）：把本地 REPL 会话桥接到 claude.ai，双向转发消息、权限、命令（/clear、fork、teleport pull 等）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useReplBridge.tsx
 * pieces: chunk-18hwfzwa.js (13), chunk-tw3rx20q.js (2)
 * attribution: placement 13, layout 1, callgraph-witnessed 1
 */
import { j, P, Oo, R, ce, yt, y, Uy } from "../../vendor/react/cjs/react.production.js";
import {
  buildRateLimitInfo,
  forwardRateLimitEventToBridge,
  logBridgeRateLimitForward,
  gNn,
  forwardRateLimitToBridge,
} from "../cli/print/rateLimitForwarding.js";
import { logForDebugging } from "../utils/debug.js";
import {
  errorMessage,
  toError,
  WireSafeControlError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../utils/errors.js";
import { onLimitsStatusChanged } from "../services/claudeAiLimits.js";
import { countLiveBridgeProcesses } from "../bridge/bridgeReconnectBudget.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import {
  drainTaskNotifications,
  hasQueuedTaskNotification,
  setTaskNotificationListener,
} from "../utils/task/taskNotifications.js";
import { isEphemeralSdkFrame, isEligibleBridgeMessage } from "../bridge/bridgeMessaging.js";
import {
  stripCompactErrorForSdk,
  emitStatusChange,
  emitBackgroundTasksChanged,
} from "../state/onChangeAppState.js";
import { parseSlashCommand } from "../utils/slashCommandParsing.js";
import {
  findCommand,
  isImmediateCommand,
  isBridgeSafeCommand,
  admitsBridgeAuthor,
  findBridgeFallback,
  getCommandName,
  shippedCommandNameForAnalytics,
  getSlashCommandToolSkills,
} from "../commands.js";
import { useRenderMode } from "../ink/renderModeContext.js";
import { Me } from "../components/design-system/ThemeProvider.js";
import { Nu, dg } from "../context/QueuedMessageContext.js";
import { useSession } from "../context/session.js";
import { useClock } from "../ink/components/ClockContext.js";
import { useAppStateSession, useSetAppState, Cr, useAppState } from "../state/AppState.js";
import { transportStateByHost } from "../cli/transportState.js";
import {
  PENDING_BRIDGE_SESSION,
  getCurrentSessionBridge,
  registerForeignConversationProbe,
  clearBridgeSession,
  getTranscriptPath,
  getMaterializedSessionFile,
  clearBridgeSessionCache,
  saveBridgeSession,
  restoreSessionMetadata,
  isOwnTranscriptFile,
  holdPrecautionarySuppressionFor,
  pinSessionId,
  markPrecautionClearResilientFor,
  claimPrecautionHoldForObservedCause,
  writeHistorySuppression,
  saveAgentColor,
  isCompactPairWithheldFromRemote,
  registerLiveSuppressionProbe,
} from "../utils/sessionStorage.js";
import {
  getSessionId,
  onSessionSwitch,
  onInteraction,
  setMainLoopModelOverride,
} from "../bootstrap/state.js";
import { env } from "../utils/env.js";
import { logEvent } from "../services/analytics/index.js";
import { useSetVoiceState } from "../context/voice.js";
import { useNotifications } from "../context/notifications.js";
import { KV } from "../services/oauth/loginEvents.js";
import { useStoreSelector } from "./useStoreSelector.js";
import {
  M_e,
  reportEffortForModel,
  applyBridgeFlagSettings,
  w6n,
  reportBridgeEffortMetadata,
} from "../bridge/applyFlagSettings.js";
import { getMainLoopModel } from "../utils/model/model.js";
import { Zir } from "../utils/focusMode.js";
import { viewTeammateOutput } from "../components/teams/TeamsDialog.js";
import { isHumanTurn_2 } from "../utils/messagePredicates.js";
import { _wn } from "../utils/udsMessaging/peerGuard.js";
import {
  ownBridgePeerAddress,
  setReplBridgeHandle,
  getReplBridgeHandle,
  reportBridgePermissionMode,
  reportBridgeModel,
  reportBridgeCrossSessionInbound,
} from "../bridge/replBridgeHandle.js";
import { wt } from "../remote/remoteMode.js";
import {
  getCcrAutoConnectDefault,
  isPersistentRemoteSessionEnabled,
  isRemoteControlInternalEventsEnabled,
  getBridgeSubagentFrameGate,
  isBridgeAuthReviveEnabled,
} from "../bridge/bridgeGates.js";
import { toExternalPermissionMode } from "../utils/permissions/PermissionMode.js";
import { getCwd } from "../utils/cwd.js";
import { buildBridgeContextSnapshot, mirrorTokenUsageToBridge } from "../cli/print/bridgeTokenUsageMirror.js";
import { resolveEffortLevel, isUltracodeActive } from "../utils/effort.js";
import { Us } from "../services/projects/threadRows.js";
import { recordInitTiming } from "../utils/messages/systemInit.js";
import { buildBridgeInitializeCommands, logBridgeInitializeCommands } from "../cli/print/lowLatencySubmit.js";
import { bUt, setCurrentForKey } from "../utils/currentRefByKey.js";
import {
  onOrgFastModeChange,
  onFastRejectedFallbackModelsChanged,
  isFastModeEnabled,
  clearFastModeCooldown,
  isFastModeActive,
  reportFastModeToggle,
} from "../utils/fastMode.js";
import { uqr } from "../services/memorySync/memorySkills.js";
import { connectedBridgePolicyRefusal, isBridgeEnabled } from "../bridge/bridgeEntitlement.js";
import { logError } from "../utils/log.js";
import {
  createSystemMessage,
  isCompactBoundaryOrSummary,
  createBridgeStatusMessage,
  extractAgentIdsFromMessages_2,
} from "../utils/messages.js";
import { lit as lit_2, fromEnum } from "../services/analytics/safeMetadata.js";
import { isLovelyUmbrellaOn } from "../utils/settings/settingsSourceTrust.js";
import { onPolicyVerdictChanged } from "../services/policyLimits/policyState.js";
import { BRIDGE_FAILED, cgt, bridgeStatusLines, wbo } from "../bridge/bridgeStatusUtil.js";
import {
  BRIDGE_MALFORMED_RESPONSE_HINT,
  BRIDGE_SIGNATURE_WANTED_HINT,
  BRIDGE_ACCOUNT_UNVERIFIED_HINT,
  BRIDGE_LOGIN_HINT,
} from "../bridge/types.js";
import { readFreshOAuthCredentialSnapshot, sameOwnerAccount, getOauthAccountInfo } from "../utils/auth.js";
import { readFreshOauthAccountFromDisk } from "../utils/config.js";
import {
  setDropNotifier,
  formatUnsignedEventWarning,
  describeUnsignedEvent,
  formatUnsignedEventNotice,
} from "../bridge/deviceAttestation.js";
import { registerCleanup } from "../utils/cleanupRegistry.js";
import {
  isDialogResponse,
  cancelPendingDialogs,
  REFUSAL_FALLBACK_DIALOG,
  detachPendingDialogs,
} from "../services/requestUserDialog.js";
import { parseBridgePermissionResponse, isValidBridgeToolName } from "../bridge/bridgePermissionResponse.js";
import { getRemoteSessionUrl } from "../constants/product.js";
import {
  getKairosReadyNudgeConfig,
  canSendReadyPush,
  RC_READY_PUSH_TEXT,
  recordReadyPushSent,
} from "../services/tips/remoteControlNudges.js";
import { buildSyntheticPushNotificationToolUse, assertMcpReconnected } from "../bridge/replControlHandler.js";
import { getThinkingDisplayOverride } from "../utils/thinking.js";
import { thinkingConfigFor } from "../cli/print/setMaxThinkingTokens.js";
import { isBetaHeaderAllowed } from "../utils/betas.js";
import {
  makeBridgeControlContext,
  withdrawBridgeInboundMessage,
  dedupeByRequestId,
  handleRcForkConversation,
  ovt,
} from "../bridge/replBridgeControl.js";
import { toSliceStore } from "../state/sliceHelpers.js";
import { isBgSession } from "../utils/concurrentSessions.js";
import {
  clearBridgeSessionFromJobState,
  handleBridgeInbound,
  persistBridgeSessionToJobState,
  applyBridgePermissionModeChange,
  createBridgePermissionCallbacks,
  createBridgeDialogCallbacks,
  collectBridgeContextUsage,
} from "../bridge/replBridgeInbound.js";
import { CCR_MIRROR, REMOTE_CONTROL_REPL, REMOTE_CONTROL_AUTO } from "../bridge/sessionOrigins.js";
import {
  acceptQueuedNotification,
  rearmNotificationNudge,
} from "../services/queuedNotifications/queuedNotifications.js";
import { gn } from "../utils/shortHash.js";
import { sN, WZ, zE, serializeModelSwitch } from "../utils/model/modelSwitchHooks.js";
import { logBridgeDialogKindsDeclared } from "../cli/print/resumeMcpTasks.js";
import { syncLoopTickState } from "../utils/loop/loopWakeups.js";
import { getJobDir, syncJobColor, getOwnJobShortId } from "../services/daemon/jobState.js";
import { getDefaultMainLoopModel } from "../utils/model/modelFallback.js";
import { managedDenyStartupRefusal, isModelAllowed } from "../utils/model/modelAllowlist.js";
import { logUnrecognizedModelSwitch } from "../cli/print/setModelControl.js";
import {
  isExemptDefaultResolvingPick,
  isModelAllowedUnderActiveEnforcement,
} from "../utils/model/defaultModel.js";
import { stepDownRestrictedFamilyAliasPick } from "../utils/model/planModeModel.js";
import { formatModelRestrictedNotice, displayModelName } from "../utils/model/validateModel.js";
import { parseUserSpecifiedModel } from "../utils/model/modelDisplay.js";
import { vCr } from "./useMainLoopModel.js";
import { handleFastModeShortcut } from "../commands/fast/fast.js";
import { runPreModelSwitchHooks, describeModelSwitchBlocked, Nf } from "../commands/model/modelSwitch.js";
import { uo, normalizeMcpServerName, sanitizeErrorDetail } from "../services/api/deferredToolsState.js";
import {
  assertToggleableServer,
  disabledElsewhereText,
  mcpRefusalText,
  reservedAddressRefusalText,
} from "../services/mcp/mcpToggleMessages.js";
import { hAe, Y1s, Iyt } from "../services/mcp/reconnectHandles.js";
import { judgeGate } from "../services/analytics/growthbookGates.js";
import { classifyMcpAuthTarget } from "../services/mcp/auth.js";
import { claudeAiConnectorAuthUrl } from "../services/mcp/claudeai.js";
import { shouldSkipCustomRedirect } from "../services/mcp/customRedirectSkip.js";
import { redactMcpErrorDetail } from "../services/mcp/mcpServerOrigin.js";
import { dispatchLocalControlRequest } from "../entrypoints/sdk/controlSchemas.js";
import { AGENT_COLOR_NAMES, getEffectiveAgentColor } from "../tools/AgentTool/agentColorManager.js";
import { isCrossSessionMessagingEnabled } from "../utils/crossSessionMessagingGate.js";
import { noopRenameNotify } from "../utils/sessionTitle.js";
import { aW } from "../utils/sessionTagRefresh.js";
import { sNn } from "../cli/print/turnStreaming.js";
import { setInboundAvailabilityPublisher } from "../utils/crossSessionInbound/inboundMode.js";
import { detectCurrentRepositoryWithHost } from "../utils/detectRepository.js";
import { subagentProgressToSDKMessages, shouldForwardSubagentMessage } from "../utils/queryHelpers.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { createSignal } from "../utils/signal.js";

//@ chunk-18hwfzwa.js:1574185-1574189 placement
j();
//@ chunk-18hwfzwa.js:1574189-1574407 placement
function useForwardRateLimitEventsToBridge(h, x) {
  P(() => {
    if (!h) return;
    function D(L) {
      let ee = x();
      if (!ee) return;
      try {
        let ke = buildRateLimitInfo(L);
        if (ke) forwardRateLimitEventToBridge(ee, ke);
      } catch (error) {
        logForDebugging(`[bridge] rate_limit_event listener failed: ${errorMessage(error)}`, {
          level: "error",
        });
      }
    }
    return onLimitsStatusChanged(D);
  }, [h, x]);
}
//@ chunk-18hwfzwa.js:1574407-1574557 placement
function reportConcurrentBridgeSessions(h) {
  (h ? Promise.resolve(0) : countLiveBridgeProcesses())
    .then((x) => {
      if (x >= 2) logFeatureBad("bridge_repl", "multi_session_crash", { concurrent_bridge_sessions: x });
    })
    .catch(() => {});
}
//@ chunk-18hwfzwa.js:1574557-1574596 placement
var XTs = require("./chunk-yxywkh50.js");
//@ chunk-18hwfzwa.js:1574596-1574649 placement
function p$o() {
  return require("./chunk-asne9cp8.js");
}
//@ chunk-18hwfzwa.js:1574649-1574693 placement
function dte() {
  return p$o().mcpAuthModule();
}
//@ chunk-18hwfzwa.js:1574693-1574705 placement
var f$o = 1e4;
//@ chunk-18hwfzwa.js:1574705-1574880 placement
function forwardQueuedSdkEventsToBridge(h) {
  try {
    let mapped = drainTaskNotifications().filter(isEphemeralSdkFrame).map(stripCompactErrorForSdk);
    if (mapped.length > 0) h.writeSdkMessages(mapped);
  } catch (error) {
    logForDebugging(`[bridge:repl] queued SDK event forward failed: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-18hwfzwa.js:1574880-1574965 placement
function yvt(h, x) {
  return !x && !h.outboundOnly && hasQueuedTaskNotification((D) => D.type === "conversation_reset");
}
//@ chunk-18hwfzwa.js:1574965-1575003 placement
var _Ie = "\x00baseline-pending",
  h$o = 10;
/**
 * 解析从 Remote Control 收到的输入是否为可立即执行的斜杠命令：找到命令且允许即时执行时，返回桥接安全的本地命令（或其回退）、参数与显示名，否则 null。
 */
//@ chunk-18hwfzwa.js:1575003-1575268 placement
function resolveBridgeImmediateCommand_2(h, x, D, L) {
  let ee = parseSlashCommand(h);
  if (!ee) return null;
  let ke = findCommand(ee.commandName, x);
  if (!ke || !isImmediateCommand(ke, ee.args, D)) return null;
  let Be =
    ke.type === "local" && isBridgeSafeCommand(ke) && admitsBridgeAuthor(ke, L) ? ke : findBridgeFallback(ke);
  if (!Be || Be.type !== "local") return null;
  return { target: Be, args: ee.args, displayName: getCommandName(ke) };
}
//@ chunk-18hwfzwa.js:1575268-1575278 layout
var y$o = 3;
/**
 * Remote Control 桥：启用后注册环境并建立会话，把本地消息/工具结果/权限请求转发到 claude.ai，把远程提示、权限回复、命令（/clear、fork、模式切换、teleport pull）应用到本地；处理错误与重连。
 */
//@ chunk-18hwfzwa.js:1575278-1611905 callgraph-witnessed = useReplBridge (0.238)
function useReplBridge(h, x, D, L, ee, ke, Re, Be, He, We, ze, Xe, rt) {
  let kt = useRenderMode(),
    { storageV5: storageV5, credentials: credentials } = Me(),
    Ot = Nu(),
    Et = useSession(),
    Dt = useClock(),
    handleRef = Oo(D),
    teardownPromiseRef = R(null),
    Xt = ce(() => teardownPromiseRef.current, []),
    io = useAppStateSession();
  P(() => {
    let Ss = new Set([transportStateByHost.of(Et), transportStateByHost.of(io)]),
      yi = new Map([...Ss].map((Ws) => [Ws, Ws.remoteBridgeLive]));
    for (let Ws of Ss) Ws.remoteBridgeLive = () => teardownPromiseRef.current !== null;
    return () => {
      for (let [Ws, za] of yi) Ws.remoteBridgeLive = za;
    };
  }, [Et, io]);
  let lastWrittenIndexRef = R(void 0),
    flushedUUIDsRef = R(null),
    failureTimeoutRef = R(null),
    consecutiveFailuresRef = R(new WeakSet()),
    bo = R(0),
    Ao = R(new Set()),
    Bo = R(new Map()),
    Ro = R({}),
    Ho = R(!1),
    Io = R(!1),
    Wo = R(!1),
    mn = R(new Map());
  function Cn(Ss, yi) {
    let Ws = mn.current.get(Ss);
    if (Ws === void 0) mn.current.set(Ss, new Set([yi]));
    else Ws.add(yi);
  }
  let No = R({ sid: void 0, rows: new Set(), tip: void 0 }),
    vo = Oo((Ss, yi) => {
      let Ws = No.current;
      if (Ws.sid !== void 0 && Ws.sid !== Ss) return;
      Ws.sid = Ss;
      for (let za of h) if (!mn.current.get(za.uuid)?.has(yi)) (Ws.rows.add(za.uuid), (Ws.tip = za.uuid));
      return Ws.tip;
    }),
    Yo = R(void 0),
    kn = R(void 0);
  function Fn(Ss) {
    for (let [Ws, za] of mn.current)
      if (za.delete(PENDING_BRIDGE_SESSION)) {
        if (Ss !== void 0) za.add(Ss);
        else if (za.size === 0) mn.current.delete(Ws);
      }
    let yi = Yo.current;
    if (yi?.bridgeSessionId === PENDING_BRIDGE_SESSION)
      Yo.current = Ss === void 0 ? void 0 : { sids: yi.sids, bridgeSessionId: Ss };
  }
  function bn(Ss) {
    if (Zn.current === Ss) return Sn.current;
    return Ss === getSessionId() ? getCurrentSessionBridge()?.id : void 0;
  }
  P(() => {
    let subscribe = replBridgeEvents.of(Et).subscribe((Ws, za) => {
        if (!za) return;
        let setAppState = getSessionId(),
          as =
            teardownPromiseRef.current !== null &&
            !Ho.current &&
            !Wo.current &&
            mainLoopModelRef.current === setAppState
              ? teardownPromiseRef.current?.bridgeSessionId
              : kn.current?.sid === setAppState
                ? PENDING_BRIDGE_SESSION
                : bn(setAppState);
        if (as === void 0) return;
        let pi = vo(setAppState, as),
          qa = pi !== void 0 && za.includes(pi),
          pd = 0;
        for (let El of qa ? [] : za) (Cn(El, as), (pd += 1));
        let $l = Yo.current,
          Yi = $l === void 0 || $l.sids.has(Ws);
        if (pd === 0) {
          if (Yi) Yo.current = void 0;
          return;
        }
        if (Yi) Yo.current = { sids: new Set([Ws]), bridgeSessionId: as };
        logForDebugging(
          `[bridge:repl] /teleport pull under the bound conversation \u2014 ${pd} pulled row(s) will not forward into this session`,
        );
      }),
      commandsRef = onSessionSwitch((Ws, za) => {
        if (za === "clear")
          ((Yo.current = void 0), (No.current = { sid: void 0, rows: new Set(), tip: void 0 }));
        else if (za === "fork" && Yo.current !== void 0 && !Ho.current && !Wo.current)
          (Yo.current.sids.add(Ws), (No.current.sid = Ws));
      });
    return () => {
      (subscribe(), commandsRef());
    };
  }, [Et]);
  function Go() {
    let Ss = Yo.current;
    if (Ss === void 0 || !Ss.sids.has(getSessionId())) return !1;
    let yi = teardownPromiseRef.current?.bridgeSessionId;
    return Ss.bridgeSessionId === yi || Ss.bridgeSessionId === PENDING_BRIDGE_SESSION;
  }
  let mainLoopModelRef = R(void 0);
  P(
    () => (
      registerForeignConversationProbe(() => ({
        foreign: Ho.current || Wo.current || Go(),
        boundSid: mainLoopModelRef.current,
        pulledWindow: Yo.current,
        pulledRows: mn.current,
      })),
      () => registerForeignConversationProbe(void 0)
    ),
    [],
  );
  let messagesRef = R(void 0),
    Xo = R(0),
    Sn = R(void 0),
    $n = R(void 0),
    on = R(!1),
    _o = R(void 0),
    cn = R(!1);
  P(
    () =>
      onInteraction(() => {
        if (teardownPromiseRef.current) cn.current = !0;
      }),
    [],
  );
  let Dn = R(!1),
    wn = R(env.CLAUDE_BRIDGE_REATTACH_SESSION !== void 0),
    mr = R(void 0),
    Kn = R(void 0),
    Wn = R(void 0),
    Fr = R(void 0),
    Zn = R(void 0),
    Un = R(void 0),
    dr = R(void 0),
    or = R(void 0),
    pr = R(void 0),
    Qn = R(!1),
    ur = R(void 0),
    Ir = R(void 0),
    Pr = R(0),
    ts = R(0),
    Gn = R(0),
    Ur = R(void 0);
  function Zr({ archiveAbandoned: archiveAbandoned }) {
    ((Sn.current = void 0),
      ($n.current = void 0),
      (mr.current = void 0),
      (Kn.current = void 0),
      (Wn.current = void 0),
      (Fr.current = void 0),
      (Zn.current = void 0),
      (Ur.current = void 0),
      (_o.current = void 0));
    let yi = Un.current;
    if (((Un.current = void 0), !yi)) return !1;
    if (archiveAbandoned) return (yi.fire().finally(() => yi.unregister()), !0);
    return (yi.unregister(), !1);
  }
  let wr = R([]);
  function zr() {
    for (let Ss of wr.current) clearBridgeSession(Ss.sessionId, Ss.path, { targetExists: !0 }, storageV5);
    wr.current = [];
  }
  let store = useSetAppState(),
    fr = Oo(() => L),
    $r = Oo(() => ee),
    Yr = Oo((Ss, yi, Ws) => {
      if (!He) return !1;
      let za = resolveBridgeImmediateCommand_2(Ss, L, kt, { origin: yi, relayAuthored: Ws });
      if (!za) return !1;
      return (
        logEvent("tengu_immediate_command_executed", {
          commandName: shippedCommandNameForAnalytics(za.displayName),
          fromKeybinding: !1,
          bridgeOrigin: !0,
        }),
        He(za.target, za.args, za.displayName, yi),
        !0
      );
    }),
    Er = Cr(),
    Vr = useSetVoiceState(),
    { addNotification: addNotification, removeNotification: removeNotification } = useNotifications(),
    replBridgeEnabled = useAppState((Ss) => Ss.replBridgeEnabled),
    replBridgeConnected = useAppState((Ss) => Ss.replBridgeConnected),
    commands = useAppState((Ss) => Ss.mcp.commands),
    replBridgeSessionActive = useAppState((Ss) => Ss.replBridgeSessionActive),
    replBridgeError = useAppState((Ss) => Ss.replBridgeError),
    replBridgeErrorKind = useAppState((Ss) => Ss.replBridgeErrorKind),
    of = KV.of(Et),
    credentialsPersisted = useStoreSelector(of, (Ss) => Ss.credentialsPersisted),
    replBridgeOutboundOnly = useAppState((Ss) => Ss.replBridgeOutboundOnly),
    replBridgeInitialName = useAppState((Ss) => Ss.replBridgeInitialName),
    replBridgeSessionGroupingId = useAppState((Ss) => Ss.replBridgeSessionGroupingId),
    mode = useAppState((Ss) => Ss.toolPermissionContext.mode),
    fastMode = useAppState((Ss) => Ss.fastMode),
    autoCompactWindow = useAppState((Ss) => Ss.autoCompactWindow),
    settings = useAppState((s_0) => s_0.settings),
    qs = dg(),
    gs = replBridgeConnected && !replBridgeOutboundOnly,
    es = replBridgeConnected ? M_e(getMainLoopModel(), qs) : null,
    ds = yt(Zir, viewTeammateOutput),
    [Hs, _s] = y(() => process.env.CLAUDE_BG_SOURCE === "spare");
  if (Hs && h.some(isHumanTurn_2)) _s(!1);
  (P(() => (_wn(ownBridgePeerAddress), () => _wn(void 0)), []),
    P(() => {
      if (wt() || Hs) return;
      logEvent("tengu_bridge_repl_evaluated", {
        would_auto_on: getCcrAutoConnectDefault(),
        repl_bridge_enabled: Er.getState().replBridgeEnabled,
      });
    }, [Er, Hs]));
  let fs = Oo(({ seedPermissionMode: Ss = !1 } = {}) => {
      let yi = teardownPromiseRef.current;
      if (!yi) return;
      let Ws = Ss ? toExternalPermissionMode(Er.getState().toolPermissionContext.mode) : void 0,
        za =
          Ws !== void 0 &&
          !hasQueuedTaskNotification(
            (s_2) =>
              s_2.type === "system" &&
              s_2.subtype === "status" &&
              s_2.status === null &&
              s_2.permissionMode === Ws,
          );
      (async () => {
        try {
          let cl = await getSlashCommandToolSkills(getCwd(), storageV5),
            state = Er.getState(),
            startTime = performance.now(),
            pi = buildBridgeContextSnapshot({
              session: Et,
              tools: ke().tools,
              model: getMainLoopModel(),
              permissionMode: state.toolPermissionContext.mode,
              commands: fr(),
              agents: state.agentDefinitions.activeAgents,
              loadedSkills: cl,
              mcpCommands: state.mcp.commands,
              fastMode: state.fastMode,
              effortValue: resolveEffortLevel(state),
              messagesInView: () => Us(x.getSnapshot()),
            });
          if (
            (recordInitTiming(pi, startTime),
            yi.writeSdkMessages([pi]),
            za && teardownPromiseRef.current === yi)
          )
            emitStatusChange({
              status: null,
              permissionMode: toExternalPermissionMode(state.toolPermissionContext.mode),
            });
        } catch (error) {
          logForDebugging(`[bridge:repl] Failed to send system/init: ${errorMessage(error)}`, {
            level: "error",
          });
        }
      })();
    }),
    [ii, ua] = Uy((detail) => detail + 1, 0);
  P(() => {
    if (!gs) return;
    fs();
  }, [gs, ee, mode, fastMode, es, ds, commands, L, ii]);
  let La = replBridgeConnected && replBridgeOutboundOnly;
  (P(() => {
    if (!La) return;
    fs();
  }, [La, ee, mode, fastMode, es, ds]),
    P(() => {
      if (!gs) return;
      reportEffortForModel(getMainLoopModel(), Er.getState());
    }, [gs, es, Er]),
    P(() => {
      if (!gs) return;
      buildBridgeInitializeCommands(() => ({
        messages: x.getSnapshot(),
        model: getMainLoopModel(),
        autoCompactWindow: autoCompactWindow,
        resetBoundary: bUt(Et),
      }));
    }, [gs, ee, autoCompactWindow, settings, x, Et]),
    P(() => {
      if (!gs) return;
      let Ss = onOrgFastModeChange(() => {
          fs();
        }),
        yi = onFastRejectedFallbackModelsChanged(() => {
          fs();
        }),
        Ws = uqr(() => {
          fs();
        });
      return () => {
        (Ss(), yi(), Ws());
      };
    }, [gs]));
  let Xa = Oo(() => {
    let {
      replBridgeEnabled: replBridgeEnabled,
      replBridgeConnected: replBridgeConnected,
      replBridgeOutboundOnly: replBridgeOutboundOnly,
    } = Er.getState();
    if (!replBridgeEnabled || !replBridgeConnected) return;
    let za = connectedBridgePolicyRefusal(replBridgeOutboundOnly);
    if (za === null) return;
    try {
      store((prev) =>
        prev.replBridgeEnabled
          ? {
              ...prev,
              replBridgeEnabled: !1,
              replBridgeSessionGroupingId: void 0,
              replBridgeAutoOnByDefault: !1,
            }
          : prev,
      );
    } catch (error) {
      (logForDebugging(`[bridge:repl] Policy disconnect failed: ${errorMessage(error)}`, { level: "error" }),
        logError(error));
      return;
    }
    try {
      if (!replBridgeOutboundOnly) {
        let detail = za.detail;
        x.replace((msg) => {
          let at = msg.at(-1);
          return at?.type === "system" && at.subtype === "informational" && at.content === detail
            ? msg
            : [...msg, createSystemMessage(detail, "notice")];
        });
      }
      (logForDebugging(
        `[bridge:repl] Org policy now refuses the connected bridge (${za.policy}: ${za.kind}, outboundOnly=${replBridgeOutboundOnly}); disconnected`,
      ),
        logEvent("tengu_bridge_policy_teardown", {
          lane: lit_2("repl"),
          policy: fromEnum(za.policy),
          deny_kind: fromEnum(za.kind),
          outbound_only: replBridgeOutboundOnly,
        }));
    } catch (error) {
      (logForDebugging(`[bridge:repl] Policy disconnect notice failed: ${errorMessage(error)}`, {
        level: "error",
      }),
        logError(error));
    }
  });
  (P(() => {
    if (!replBridgeConnected || isLovelyUmbrellaOn()) return;
    let fields = onPolicyVerdictChanged(() => {
      queueMicrotask(() => Xa());
    });
    return (Xa(), fields);
  }, [replBridgeConnected]),
    P(() => {
      if (!replBridgeEnabled || wt() || Hs) return;
      let Ss = replBridgeOutboundOnly;
      if (!Ss)
        (removeNotification(BRIDGE_FAILED),
          store((Si) =>
            Si.replBridgeError === void 0
              ? Si
              : { ...Si, replBridgeError: void 0, replBridgeErrorKind: void 0 },
          ));
      let replBridgeExplicit = Er.getState().replBridgeExplicit,
        Ws = replBridgeExplicit
          ? "explicit"
          : Er.getState().replBridgeAutoOnByDefault
            ? "auto_default"
            : "auto_settings",
        za = wn.current;
      function cl(Si, na = !1) {
        if (
          (logForDebugging(
            `[bridge:repl] notifyBridgeFailed detail="${Si}" outboundOnly=${Ss} wasConnected=${na}`,
          ),
          Ss)
        )
          return;
        addNotification({
          key: BRIDGE_FAILED,
          kind: "warning",
          segments: [
            { text: `Remote Control ${na ? "disconnected" : "failed"}`, color: "error" },
            { text: ` \xB7 ${Si || "/remote-control"}`, dim: !0 },
          ],
          priority: "immediate",
          requeueOnPreempt: !0,
          invalidates: [BRIDGE_FAILED],
        });
      }
      function handleStateChange(state, detail_0) {
        if (Ss) return;
        let js =
            state === BRIDGE_MALFORMED_RESPONSE_HINT ||
            state === BRIDGE_SIGNATURE_WANTED_HINT ||
            state?.includes("/login") ||
            state?.includes("/remote-control") ||
            state?.includes("restart") ||
            state?.includes("policy") ||
            state?.includes("update"),
          Ya =
            detail_0 === "auth"
              ? state?.includes("/login")
                ? ""
                : " \u2014 run /login to restore Remote Control"
              : detail_0 === "ended_elsewhere" || js
                ? ""
                : " \u2014 run /remote-control to reconnect",
          tl = `Remote Control disconnected${state ? ` \u2014 ${state}` : ""}${Ya}`;
        x.replace((prev_3) => {
          let at = prev_3.at(-1);
          if (at?.type === "system" && at.subtype === "informational" && at.content === tl) return prev_3;
          return [...prev_3, createSystemMessage(tl, "warning")];
        });
      }
      function as(Si, na = "terminal") {
        if (
          (cl(Si),
          handleStateChange(Si, na),
          store((prev_4) => ({ ...prev_4, replBridgeError: Si, replBridgeErrorKind: na })),
          na === "auth")
        )
          pi();
        Gl();
      }
      function pi() {
        ((or.current = _Ie), (ts.current = of.getSnapshot().credentialsPersisted));
        let Si = ++Gn.current;
        readFreshOAuthCredentialSnapshot(storageV5, credentials)
          .catch(() => {
            return;
          })
          .then(async (prev_9) => {
            let js =
              prev_9 !== void 0
                ? { accountUuid: prev_9.accountUuid, organizationUuid: prev_9.organizationUuid }
                : await readFreshOauthAccountFromDisk(storageV5).catch(() => {
                    return;
                  });
            if (Gn.current !== Si) return;
            if (of.getSnapshot().credentialsPersisted !== ts.current) {
              ((pr.current = js), (or.current = void 0));
              return;
            }
            ((pr.current = js), (or.current = prev_9?.accessToken));
          });
      }
      if (Xo.current >= y$o && !Qn.current) {
        (logForDebugging(
          `[bridge:repl] Hook: ${Xo.current} consecutive init failures, not retrying this session`,
        ),
          cl(cgt),
          handleStateChange(cgt, "terminal"),
          store((Si) => {
            if (Si.replBridgeError === cgt && !Si.replBridgeEnabled) return Si;
            return {
              ...Si,
              replBridgeError: cgt,
              replBridgeErrorKind: "terminal",
              replBridgeEnabled: !1,
              replBridgeSessionGroupingId: void 0,
            };
          }));
        return;
      }
      if (!Ss)
        setDropNotifier((Si) => {
          let {
            status: status,
            payloadType: payloadType,
            requestId: requestId,
            windowCapped: windowCapped,
          } = Si;
          if (windowCapped) {
            let ga = formatUnsignedEventWarning(Si);
            (addNotification({
              key: "bridge-attestation-drop",
              kind: "warning",
              segments: [
                { text: "Remote Control: unsigned activity burst rejected", color: "error" },
                { text: " \xB7 further warnings suppressed", dim: !0 },
              ],
              priority: "immediate",
            }),
              x.replace((prev_8) => {
                let at = prev_8.at(-1);
                if (at?.type === "system" && at.subtype === "informational" && at.content === ga)
                  return prev_8;
                return [...prev_8, createSystemMessage(ga, "warning")];
              }));
            return;
          }
          let { what: what, hint: hint } = describeUnsignedEvent(Si);
          addNotification({
            key: "bridge-attestation-drop",
            kind: "warning",
            segments: [
              { text: `Remote Control: unsigned ${what} rejected`, color: "error" },
              { text: ` \xB7 attestation: ${status}${hint ? ` \u2014 ${hint}` : ""}`, dim: !0 },
            ],
            priority: "immediate",
          });
          let _d = formatUnsignedEventWarning(Si);
          if (
            (x.replace((prev_7) => {
              let at = prev_7.at(-1);
              if (at?.type === "system" && at.subtype === "informational" && at.content === _d) return prev_7;
              return [...prev_7, createSystemMessage(_d, "warning")];
            }),
            payloadType === "control_request" && requestId)
          )
            teardownPromiseRef.current?.sendControlResponse(
              {
                type: "control_response",
                response: { subtype: "error", request_id: requestId, error: formatUnsignedEventNotice(Si) },
              },
              { skipStateReport: !0 },
            );
        });
      let qa = !1,
        pd = h.length,
        $l = !1,
        Yi = getSessionId();
      if (No.current.sid !== void 0 && No.current.sid !== Yi)
        No.current = { sid: void 0, rows: new Set(), tip: void 0 };
      mainLoopModelRef.current = Yi;
      let El = getTranscriptPath(),
        Ll = { sid: Yi };
      kn.current = Ll;
      let _c = Yi,
        mc = null,
        Vd = () => (Yi === getSessionId() ? (getMaterializedSessionFile() ?? El) : mc);
      if (Zn.current !== void 0 && Zn.current !== Yi) Zr({ archiveAbandoned: !0 });
      let cd =
        (Wn.current !== void 0 && h[0]?.uuid !== Wn.current) ||
        (Fr.current !== void 0 && h[Fr.current.index]?.uuid !== Fr.current.uuid);
      if (cd) clearBridgeSessionCache();
      let Ka = !cd && Kn.current !== void 0 ? Math.min(Kn.current, h.length) : void 0,
        pl = !1;
      function Gl() {
        let head = Ro.current.head,
          eligible = Ro.current.eligible;
        messagesRef.current = Dt.setTimeout(() => {
          if (qa) return;
          messagesRef.current = void 0;
          let js = teardownPromiseRef.current;
          if (js) {
            ((Sn.current = js.bridgeSessionId),
              ($n.current = js.getLastSequenceNum()),
              (_o.current = on.current ? Yi : void 0),
              (mr.current = bd.size > 0 ? new Set(bd) : void 0),
              (Kn.current = bo.current),
              (Wn.current = head),
              (Fr.current = eligible),
              (Zn.current = Yi),
              (Ur.current = dr.current),
              Un.current?.unregister());
            let Ya = Ur.current,
              tl = async () => {
                if (Ya?.accountUuid === void 0) return;
                let ol = await readFreshOauthAccountFromDisk(storageV5).catch(() => {
                  return;
                });
                if (!sameOwnerAccount(ol, Ya)) return;
                await js.archive?.().catch((prev_5) => {
                  logForDebugging(`[bridge:repl] Deferred archive failed: ${errorMessage(prev_5)}`, {
                    level: "error",
                  });
                });
              };
            Un.current = js.archive ? { fire: tl, unregister: registerCleanup(tl) } : void 0;
          }
          store((prev_6) => {
            if (!prev_6.replBridgeError) return prev_6;
            return (
              (pl = !0),
              logEvent("tengu_bridge_repl_auto_disabled", { had_session: js !== null }),
              {
                ...prev_6,
                replBridgeEnabled: !1,
                replBridgeSessionGroupingId: void 0,
                ...(js && { replBridgeSkipNextArchive: !0 }),
              }
            );
          });
        }, f$o);
      }
      let pendingPermissionHandlers = new Map(),
        hd = new Map(),
        bd = new Set();
      if (!cd && Sn.current !== void 0) for (let Si of mr.current ?? []) bd.add(Si);
      function handlePermissionResponse(msg_0) {
        let na = Vd();
        if (na === null) return;
        saveBridgeSession(
          Yi,
          msg_0.bridgeSessionId,
          msg_0.getLastSequenceNum(),
          na,
          [...bd],
          msg_0.sessionGroupingId,
          on.current,
          Ir.current,
          void 0,
          storageV5,
        );
      }
      ((Ho.current = !1), (Io.current = !1));
      let subscribe = replBridgeEvents.of(Et).subscribe((Si, na) => {
          if (qa) return;
          if (na && !Ho.current) return;
          if (Ho.current) {
            Io.current = !0;
            return;
          }
          ((Io.current = !1), (Wo.current = !1));
        }),
        ec = onSessionSwitch((Si, na) => {
          if (qa) return;
          let js = _c;
          if (((_c = Si), js !== _c && js === Yi)) mc = getMaterializedSessionFile();
          if (na !== "clear") {
            switch (na) {
              case "resume":
              case "spare_claim":
                Ho.current = Si !== Yi;
                break;
              case "fork":
                if (!Ho.current && !Wo.current) mainLoopModelRef.current = Si;
                break;
              case "cd":
              case "remote_attach":
              case "hydrate":
              case "startup_custom_id":
                break;
            }
            return;
          }
          ((Ho.current = !1), (Io.current = !1), (Wo.current = !1));
          try {
            if (!Ss) {
              let tl = js === Yi ? getMaterializedSessionFile() : mc;
              if (tl !== null) {
                let ol = Ir.current,
                  ed = getOauthAccountInfo(),
                  _d = !ol?.accountUuid || sameOwnerAccount(ed, ol),
                  ga = !_d && !ed?.accountUuid;
                if (!on.current && _d) clearBridgeSession(Yi, tl, { targetExists: !0 }, storageV5);
                if (!on.current && (_d || ga)) wr.current.push({ sessionId: Yi, path: tl });
              }
            }
            ((mc = null),
              (Yi = getSessionId()),
              (mainLoopModelRef.current = Yi),
              (El = getTranscriptPath()),
              (bo.current = 0),
              ($l = !0));
            let Ya = teardownPromiseRef.current;
            if (Ya && !Ss)
              restoreSessionMetadata({
                bridgeSessionId: Ya.bridgeSessionId,
                bridgeLastSeq: Ya.getLastSequenceNum(),
                bridgeDialogKinds: [...bd],
                bridgeSessionGroupingId: Ya.sessionGroupingId,
                bridgeNoHistoryBackfill: on.current || void 0,
                bridgeOwnerAccountUuid: Ir.current?.accountUuid,
                bridgeOwnerOrganizationUuid: Ir.current?.organizationUuid,
              });
          } catch (error) {
            (logForDebugging(`[bridge:repl] /clear repoint failed: ${errorMessage(error)}`, {
              level: "error",
            }),
              logError(error));
          }
        });
      function qu(Si) {
        let requestId = Si.response?.request_id;
        if (!requestId) return !1;
        let handler = hd.get(requestId);
        if (handler) {
          let inner = Si.response;
          if (inner.subtype !== "success" || !inner.response || !isDialogResponse(inner.response))
            return (
              logForDebugging(
                `[bridge:repl] Ignoring non-dialog-shaped control_response for pending dialog request_id=${requestId}`,
                { level: "verbose" },
              ),
              !1
            );
          return (hd.delete(requestId), handler.handler(inner.response), !0);
        }
        let Ya = pendingPermissionHandlers.get(requestId);
        if (!Ya)
          return (
            logForDebugging(
              `[bridge:repl] No handler for control_response request_id=${requestId} (late response after local resolve, stale reattach dialog, or unknown id)`,
              { level: "verbose" },
            ),
            !1
          );
        let response = Si.response;
        if (response.subtype === "success" && response.response) {
          let ol = parseBridgePermissionResponse(response.response);
          if (!ol) return !1;
          if (isValidBridgeToolName(ol.toolName, Ya.toolName, requestId)) return !1;
          return (pendingPermissionHandlers.delete(requestId), Ya.handler(ol), !0);
        }
        return (pendingPermissionHandlers.delete(requestId), !0);
      }
      let Ku = !1,
        iu = null,
        Iu = void 0,
        Am;
      function Kp(Si, na, js) {
        if (
          (logForDebugging(
            `[bridge:repl] handleStateChange state=${Si} detail="${na}" kind=${js} cancelled=${qa} outboundOnly=${Ss}`,
          ),
          qa)
        )
          return;
        if (Si === "policy_disabled") {
          Am = na ?? "disabled by your organization's policy";
          return;
        }
        if (Ss) {
          if (
            (logForDebugging(`[bridge:repl] Mirror state=${Si}${na ? ` detail=${na}` : ""}`), Si === "failed")
          )
            store((tl) => {
              if (!tl.replBridgeConnected) return tl;
              return { ...tl, replBridgeConnected: !1 };
            });
          else if (Si === "ready" || Si === "connected") {
            if (Si === "connected" && teardownPromiseRef.current && !Er.getState().replBridgeConnected)
              logBridgeRateLimitForward(teardownPromiseRef.current);
            store((tl) => {
              if (tl.replBridgeConnected) return tl;
              return { ...tl, replBridgeConnected: !0 };
            });
          }
          return;
        }
        let Ya = teardownPromiseRef.current;
        switch (Si) {
          case "ready":
            (removeNotification(BRIDGE_FAILED),
              (dr.current = Ir.current),
              store((tl) => {
                let ol = Ya
                    ? getRemoteSessionUrl(Ya.bridgeSessionId, Ya.sessionIngressUrl)
                    : tl.replBridgeSessionUrl,
                  ed = Ya?.environmentId,
                  _d = Ya?.bridgeSessionId;
                if (
                  tl.replBridgeConnected &&
                  !tl.replBridgeSessionActive &&
                  !tl.replBridgeReconnecting &&
                  tl.replBridgeSessionUrl === ol &&
                  tl.replBridgeEnvironmentId === ed &&
                  tl.replBridgeSessionId === _d
                )
                  return tl;
                return {
                  ...tl,
                  replBridgeConnected: !0,
                  replBridgeSessionActive: !1,
                  replBridgeReconnecting: !1,
                  replBridgeSessionUrl: ol,
                  replBridgeEnvironmentId: ed,
                  replBridgeSessionId: _d,
                  replBridgeError: void 0,
                  replBridgeErrorKind: void 0,
                };
              }));
            break;
          case "connected": {
            removeNotification(BRIDGE_FAILED);
            let state = Er.getState();
            if (Ya && !state.replBridgeConnected) logBridgeRateLimitForward(Ya);
            if (
              (store((ol) => {
                if (ol.replBridgeSessionActive) return ol;
                return {
                  ...ol,
                  replBridgeConnected: !0,
                  replBridgeSessionActive: !0,
                  replBridgeReconnecting: !1,
                  replBridgeError: void 0,
                  replBridgeErrorKind: void 0,
                };
              }),
              fs({ seedPermissionMode: !0 }),
              Ya && !Dn.current && !cn.current)
            ) {
              let ol = getKairosReadyNudgeConfig();
              if (ol && canSendReadyPush(ol, replBridgeExplicit, za)) {
                if (((Dn.current = !0), ol.probability >= 1 || Math.random() < ol.probability))
                  (Ya.writeSdkMessages([
                    buildSyntheticPushNotificationToolUse(RC_READY_PUSH_TEXT, getSessionId()),
                  ]),
                    recordReadyPushSent(ol, storageV5));
              }
            }
            break;
          }
          case "reconnecting":
            store((tl) => {
              if (tl.replBridgeReconnecting) return tl;
              return { ...tl, replBridgeReconnecting: !0, replBridgeSessionActive: !1 };
            });
            break;
          case "failed": {
            (messagesRef.current?.(), cl(na, Ya !== null));
            let tl = js ?? (nl ? "auth" : "terminal");
            if (
              (store((ol) => ({
                ...ol,
                replBridgeError: na,
                replBridgeErrorKind: tl,
                replBridgeReconnecting: !1,
                replBridgeSessionActive: !1,
                replBridgeConnected: !1,
              })),
              tl === "auth")
            )
              pi();
            (handleStateChange(na, tl), Gl());
            break;
          }
        }
      }
      let nl = Qn.current;
      Qn.current = !1;
      let ss = ur.current;
      ur.current = void 0;
      let Gs = Yi,
        ma = getMaterializedSessionFile(),
        $a = ma !== null && !isOwnTranscriptFile(Gs, ma),
        xl = $a ? void 0 : (ma ?? El);
      return (
        (async () => {
          try {
            if (lastWrittenIndexRef.current)
              (logForDebugging(
                "[bridge:repl] Hook: waiting for previous teardown to complete before re-init",
              ),
                await lastWrittenIndexRef.current,
                (lastWrittenIndexRef.current = void 0),
                logForDebugging("[bridge:repl] Hook: previous teardown complete, proceeding with re-init"));
            if (qa) return;
            let {
                initReplBridge: initReplBridge,
                REPL_WORKSPACE_DIFF_COMPUTE_BUDGET: REPL_WORKSPACE_DIFF_COMPUTE_BUDGET,
              } = await import("./chunk-cg2r2hy6.js"),
              js = !1,
              Ya = !1,
              tl;
            if (Sn.current !== void 0) {
              let Pi = Ur.current,
                fa = await readFreshOAuthCredentialSnapshot(storageV5, credentials).catch(() => {
                  return;
                });
              if (fa?.accountUuid)
                tl = { accountUuid: fa.accountUuid, organizationUuid: fa.organizationUuid };
              if (qa) return;
              Ya = !Pi?.accountUuid;
              let sa = Boolean(Pi?.accountUuid) && !fa?.accountUuid,
                td = Boolean(Pi?.accountUuid) && Boolean(fa?.accountUuid) && !sameOwnerAccount(fa, Pi);
              if (td || sa) {
                if (nl) {
                  (logForDebugging(
                    "[bridge:repl] Auto-revive aborted: stash owner vs current account mismatch/unreadable at init",
                  ),
                    Un.current?.unregister(),
                    (Un.current = void 0),
                    (pl = !0),
                    store((prev_10) => ({
                      ...prev_10,
                      replBridgeEnabled: !1,
                      replBridgeError: BRIDGE_ACCOUNT_UNVERIFIED_HINT,
                      replBridgeErrorKind: "terminal",
                    })));
                  return;
                }
                if (
                  (logForDebugging(
                    td
                      ? "[bridge:repl] Reattach stash owner differs from current credential account \u2014 dropping stash, minting fresh (history not uploaded)"
                      : "[bridge:repl] Current account identity unreadable with an owned stash \u2014 dropping stash, minting fresh (history not uploaded)",
                  ),
                  (js = !0),
                  Un.current?.unregister(),
                  (Un.current = void 0),
                  holdPrecautionarySuppressionFor(pinSessionId(Gs)),
                  markPrecautionClearResilientFor(pinSessionId(Gs)),
                  claimPrecautionHoldForObservedCause(pinSessionId(Gs)),
                  td && !$a)
                )
                  logFeatureOk("rc_cross_account_suppression");
                else
                  logFeatureSad(
                    "rc_cross_account_suppression",
                    $a ? "torn_entry_pair" : "identity_unreadable",
                  );
                if (td && !$a)
                  await writeHistorySuppression(Gs, xl, "chokepoint_veto", fa?.accountUuid, storageV5);
                else if (td)
                  logForDebugging(
                    "[bridge:repl] Chokepoint veto under a TORN entry pair: precautionary suppression only, no permanent taint write",
                    { level: "warn" },
                  );
                if ((Zr({ archiveAbandoned: !1 }), bd.clear(), getSessionId() === Gs))
                  clearBridgeSessionCache();
              }
            }
            let ol = _o.current === Gs;
            on.current = js || ol || (Ya && cd);
            let ed =
              tl ??
              (await readFreshOauthAccountFromDisk(storageV5).catch(() => {
                return;
              }));
            if (qa) return;
            Ir.current = ed;
            let _d = Ya && cd,
              ga = cd ? void 0 : Sn.current,
              du,
              rg = (Pi, fa) => {
                let sa;
                if (fa != null) {
                  let Pl = getThinkingDisplayOverride(rt);
                  if (Pl !== void 0 && Pl.display !== fa) {
                    let Ad = Pi === void 0 ? "budget unchanged" : "budget applied";
                    (logForDebugging(
                      `[bridge:repl] set_max_thinking_tokens: thinking_display=${fa} not applied (local ${Pl.source} chose ${Pl.display}); ${Ad}`,
                    ),
                      (sa = {
                        ok: !1,
                        error: `set_max_thinking_tokens: ${Ad}; thinking_display not applied, the display stays ${Pl.display} because the terminal user set it with ${Pl.source === "flag" ? "--thinking-display" : "the showThinkingSummaries setting"}`,
                      }));
                  }
                }
                let td;
                if (Pi !== void 0) {
                  let Pl = thinkingConfigFor(Pi, void 0, We);
                  td = Pl ? Pl.type !== "disabled" : isBetaHeaderAllowed();
                }
                return (
                  store((prev_11) => {
                    let Ad = td ?? prev_11.thinkingEnabled,
                      od = fa === void 0 || sa !== void 0 ? prev_11.thinkingDisplayOverride : (fa ?? void 0);
                    if (prev_11.thinkingEnabled === Ad && prev_11.thinkingDisplayOverride === od)
                      return prev_11;
                    return { ...prev_11, thinkingEnabled: Ad, thinkingDisplayOverride: od };
                  }),
                  sa
                );
              },
              wp = makeBridgeControlContext({
                session: Et,
                engineStore: toSliceStore(Er),
                transcript: x,
                storageV5: storageV5,
                credentials: credentials,
                thinkingBudget: {
                  current: () => (Er.getState().thinkingEnabled === !1 ? { type: "disabled" } : We),
                  apply: rg,
                },
                mainLoopModel: $r,
                getContextUsageInputs: ke,
              }),
              Wd = await initReplBridge({
                outboundOnly: Ss,
                ...!1,
                suppressHistoryBackfill: js || ol || _d,
                onHistoryBackfillSuppressed: (Pi) => {
                  if (qa) return;
                  if (Pi?.uncertaintyOnly) return;
                  ((on.current = !0), (_o.current = Gs));
                },
                reattachOrFail: (nl && Sn.current !== void 0) || Ya,
                reviveInitiated: nl,
                onReattachPointerDead: () => {
                  if ((Zr({ archiveAbandoned: !1 }), (_o.current = on.current ? Gs : void 0), isBgSession()))
                    clearBridgeSessionFromJobState(storageV5);
                },
                localHolderGuard:
                  !replBridgeExplicit || nl
                    ? {
                        mode: "decline",
                        onDeclined: (Pi) => {
                          du = Pi;
                        },
                      }
                    : { mode: "observe" },
                expectedAccount: nl ? ss : void 0,
                onAuthProven: () => {
                  Pr.current = 0;
                },
                reattachSessionId: ga,
                reattachSequenceNum: cd ? void 0 : $n.current,
                tags: Ss ? [CCR_MIRROR] : [replBridgeExplicit ? REMOTE_CONTROL_REPL : REMOTE_CONTROL_AUTO],
                getToolPermissionContext: () => Er.getState().toolPermissionContext,
                host: Et.host,
                workspaceDiffComputeBudget: REPL_WORKSPACE_DIFF_COMPUTE_BUDGET,
                getTools: () => ke().tools,
                onQueuedNotification: (Pi) =>
                  acceptQueuedNotification(Pi, {
                    getAppState: () => Er.getState(),
                    setAppState: store,
                    session: Et,
                  }),
                onInboundMessage: (prev_12) => {
                  {
                    let {
                      noteOwnerInboxNoticeDelivery: noteOwnerInboxNoticeDelivery,
                    } = require("./chunk-dm6d31md.js");
                    noteOwnerInboxNoticeDelivery(Et, prev_12);
                  }
                  return handleBridgeInbound(
                    Ot,
                    prev_12,
                    (fa, sa, td) => Yr(fa, sa, td),
                    void 0,
                    () => {
                      let next = cancelPendingDialogs(
                        hd,
                        (currentQueue) => teardownPromiseRef.current?.sendControlCancelRequest(currentQueue),
                        REFUSAL_FALLBACK_DIALOG.kind,
                      );
                      for (let sa of next)
                        logEvent("tengu_request_user_dialog_implicit_cancel", {
                          dialog_kind: gn(sa),
                          reason: fromEnum("new_user_message"),
                          lane: lit_2("repl_bridge"),
                        });
                    },
                    () => sN.of(Et).tail,
                    storageV5,
                    credentials,
                  );
                },
                onPermissionResponse: qu,
                getInitializeState() {
                  return {
                    current_model: $r(),
                    current_permission_mode: toExternalPermissionMode(
                      Er.getState().toolPermissionContext.mode,
                    ),
                  };
                },
                getCommands: () => logBridgeInitializeCommands(fr()),
                onClientInitialize: Ss ? void 0 : () => fs({ seedPermissionMode: !0 }),
                onDialogKindsDeclared: Ss
                  ? void 0
                  : (Pi, fa) => {
                      logBridgeDialogKindsDeclared(bd, Pi, fa, () => {
                        let sa = teardownPromiseRef.current;
                        if (sa) handlePermissionResponse(sa);
                      });
                    },
                isTurnLive: Xe,
                onInterrupt() {
                  (syncLoopTickState(),
                    logForDebugging("[bridge:repl] Remote interrupt \u2192 turn.cancel()"),
                    handleRef());
                },
                onCancelAsyncMessage: (item) => withdrawBridgeInboundMessage(Ot, item),
                onForkConversation: Ss
                  ? void 0
                  : dedupeByRequestId((Pi, fa) =>
                      handleRcForkConversation(Pi, fa, {
                        getMessages: x.getSnapshot,
                        isTurnActive: Be,
                        queuedCommandCount: Ot.getDrainableMainThreadQueueLength,
                        ownBridgeSessionId: () => teardownPromiseRef.current?.bridgeSessionId,
                        ownSessionGroupingId: () => teardownPromiseRef.current?.sessionGroupingId,
                        getLaunchState: Er.getState,
                        recordChildBridgeSession: (sa, td, Pl) =>
                          persistBridgeSessionToJobState(getJobDir(sa), td, !1, Pl, void 0, !1, storageV5),
                        credentials: credentials,
                        storageV5: storageV5,
                        getTools: () => ke().tools,
                        host: Et.host,
                      }),
                    ),
                onSetModel(Pi) {
                  let fa = Pi == null || Pi.trim().toLowerCase() === "default",
                    sa = fa ? getDefaultMainLoopModel() : Pi,
                    td = fa ? managedDenyStartupRefusal(sa, "switch") : null;
                  if (td !== null) return { ok: !1, error: td };
                  if (!fa) {
                    let zi = logUnrecognizedModelSwitch(sa, lit_2("bridge_repl"));
                    if (zi) return zi;
                  }
                  let Pl = (prev_13) => (fa ? null : prev_13),
                    Ad =
                      !fa &&
                      !isExemptDefaultResolvingPick(sa) &&
                      !(isModelAllowedUnderActiveEnforcement(sa) ?? isModelAllowed(sa)),
                    od = Ad ? stepDownRestrictedFamilyAliasPick(sa) : null,
                    md = od ?? sa;
                  if (Ad && od === null) {
                    let state = Er.getState(),
                      rd = formatModelRestrictedNotice(
                        md,
                        parseUserSpecifiedModel(vCr(state.mainLoopModelForSession, state.mainLoopModel)),
                      );
                    return (
                      addNotification({
                        key: `model-restricted-bridge-${displayModelName(md)}`,
                        kind: "warning",
                        text: rd,
                        priority: "immediate",
                      }),
                      logFeatureBad("model_switch", "not_allowed"),
                      { ok: !1, error: rd }
                    );
                  }
                  let vp = () => {
                      if (od !== null)
                        addNotification({
                          key: `model-restricted-bridge-${displayModelName(sa)}`,
                          kind: "warning",
                          text: formatModelRestrictedNotice(sa, od),
                          priority: "immediate",
                        });
                      if (od !== null) logFeatureSad("model_switch", "family_alias_stepped_down");
                      else logFeatureOk("model_switch");
                      if (isFastModeEnabled()) clearFastModeCooldown();
                      setMainLoopModelOverride(md);
                      let zi, rd;
                      if (
                        (store((prev_14) => {
                          zi = !!prev_14.fastMode;
                          let zd = isFastModeEnabled()
                            ? isFastModeActive(md, prev_14.fastMode)
                            : !!prev_14.fastMode;
                          if (
                            ((rd = zd), prev_14.mainLoopModelForSession === md && zd === !!prev_14.fastMode)
                          )
                            return prev_14;
                          return {
                            ...prev_14,
                            mainLoopModelForSession: md,
                            ...(zd !== !!prev_14.fastMode && { fastMode: zd }),
                          };
                        }),
                        zi !== void 0 && rd !== void 0)
                      ) {
                        reportFastModeToggle(zi, rd);
                        let Qd = handleFastModeShortcut(zi, rd, md);
                        if (Qd !== null)
                          addNotification({
                            key: "model-switch-fast-mode",
                            kind: "feedback",
                            text: Qd,
                            priority: "immediate",
                            timeoutMs: 3000,
                          });
                      }
                    },
                    state = Er.getState();
                  if (!WZ(Et) && sN.of(Et).pending === 0) {
                    (zE(Et, state, Pl(md), "sdk"), vp());
                    return;
                  }
                  return serializeModelSwitch(Et, () =>
                    runPreModelSwitchHooks(Et, Er.getState, Pl(md), "sdk")
                      .then((prev_15) => {
                        if (prev_15.decision !== "proceed") {
                          logFeatureSad("model_switch", "blocked_by_hook");
                          let rd = describeModelSwitchBlocked(prev_15);
                          return (
                            addNotification({
                              key: "model-switch-blocked",
                              kind: "warning",
                              text: rd,
                              color: "warning",
                              priority: "immediate",
                            }),
                            { ok: !1, error: rd }
                          );
                        }
                        if (prev_15.messages.length > 0)
                          addNotification({
                            key: "model-switch-hook-note",
                            kind: "feedback",
                            text: prev_15.messages.map(Nf).join(" \xB7 "),
                            priority: "immediate",
                          });
                        return (
                          zE(Et, Er.getState(), Pl(md), "sdk"),
                          vp(),
                          { ok: !0, notices: prev_15.messages.map(Nf) }
                        );
                      })
                      .catch((zi) => (logError(toError(zi)), { ok: !1, error: "Model switch failed" })),
                  );
                },
                onSetPermissionMode: (Pi) => applyBridgePermissionModeChange(Pi, Er, store),
                onApplyFlagSettings: (Pi, fa) => {
                  let sa = getMainLoopModel(),
                    td = M_e(sa, resolveEffortLevel(Er.getState())),
                    Pl = applyBridgeFlagSettings(Pi, {
                      model: sa,
                      getAppState: Er.getState,
                      setAppState: store,
                    });
                  if (!Pl.ok) return Pl;
                  if ((w6n(fa), M_e(sa, resolveEffortLevel(Er.getState())) === td)) fs();
                  return { ok: !0 };
                },
                async onMcpAuthenticate(Pi, fa) {
                  let td = Er.getState().mcp.clients.find((prev_16) => prev_16.name === Pi)?.config;
                  if (!td) throw new WireSafeControlError(`MCP server "${uo(Pi)}" not found`);
                  let Pl = () => {
                    assertToggleableServer(Er.getState().mcp.clients, Pi);
                    let zi = hAe();
                    if (!zi)
                      throw new WireSafeControlError(
                        "MCP controls aren't available right now \u2014 the terminal is still starting up or is showing another view",
                      );
                    if (zi(Pi))
                      throw new WireSafeControlError(
                        disabledElsewhereText(Pi),
                        "MCP server disabled in another session; auth refused",
                      );
                    let rd = Y1s()?.(Pi, td);
                    if (rd === "project-approval")
                      throw new WireSafeControlError(
                        mcpRefusalText(Pi, rd, td),
                        "MCP server not approved for this project; auth refused",
                      );
                    if (rd && judgeGate(Pi, td))
                      throw new WireSafeControlError(
                        reservedAddressRefusalText(Pi),
                        "MCP server refused at a reserved address; auth refused",
                      );
                    if (rd)
                      throw new WireSafeControlError(
                        mcpRefusalText(Pi, rd, td),
                        "MCP server blocked by managed policy; auth refused",
                      );
                  };
                  (Pl(), Bo.current.delete(Pi));
                  let url = classifyMcpAuthTarget(Pi, td);
                  if (url.kind === "claudeai-proxy") {
                    let zi = claudeAiConnectorAuthUrl(url.config);
                    if (!zi)
                      throw new WireSafeControlError(
                        "Unable to build claude.ai connector auth URL (missing org or server id)",
                      );
                    return (
                      logEvent("tengu_claudeai_mcp_auth_started", {}),
                      { authUrl: zi, requiresUserAction: !0, callbackExpected: !1 }
                    );
                  }
                  if (url.kind === "unsupported-transport")
                    throw new WireSafeControlError(
                      `Server type "${url.transport}" does not support OAuth authentication`,
                    );
                  if (url.kind === "anthropic-hosted")
                    throw new WireSafeControlError(normalizeMcpServerName(url.message, 1024, "none"));
                  let od = (zi) => {
                      let rd,
                        promise = new Promise((Yc) => {
                          rd = Yc;
                        }),
                        zd,
                        Hc,
                        performMCPOAuthFlow = dte().performMCPOAuthFlow(
                          Pi,
                          url.config,
                          (Yc) => rd(Yc),
                          void 0,
                          {
                            skipBrowserOpen: !0,
                            redirectUri: zi,
                            onWaitingForCallback: (Yc, tc, Cp) => {
                              ((zd = tc), (Hc = Cp));
                            },
                          },
                        );
                      return (
                        dte().setActiveOAuthPromise(Pi, performMCPOAuthFlow),
                        performMCPOAuthFlow.then(
                          () => Bo.current.set(Pi, Date.now()),
                          () => {},
                        ),
                        Promise.race([
                          promise.then((Yc) => ({ authUrl: Yc, callbackPort: zd, state: Hc })),
                          performMCPOAuthFlow.then(() => null),
                        ])
                      );
                    },
                    md = null,
                    vp = "localhost",
                    sg =
                      Boolean(fa) &&
                      !url.config.oauth?.clientId &&
                      !(await shouldSkipCustomRedirect(Pi, url.config));
                  if ((Pl(), sg))
                    try {
                      ((md = await od(fa)), (vp = "custom"));
                    } catch (error) {
                      (logForDebugging(
                        `[bridge:mcp] AS rejected custom redirectUri for ${Pi}; falling back to localhost: ${sanitizeErrorDetail(redactMcpErrorDetail(Pi, url.config, errorMessage(error)))}`,
                      ),
                        Pl());
                    }
                  if (vp === "localhost")
                    try {
                      md = await od();
                    } catch (error) {
                      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                        `MCP OAuth failed for ${Pi}: ${normalizeMcpServerName(redactMcpErrorDetail(Pi, url.config, errorMessage(error)))}`,
                        "MCP OAuth flow failed (detail clamped in the local log)",
                      );
                    }
                  if (!md) return { requiresUserAction: !1, callbackExpected: !1 };
                  return {
                    authUrl: md.authUrl,
                    requiresUserAction: !0,
                    callbackExpected: !0,
                    redirectScheme: vp,
                    state: md.state,
                    ...(vp === "localhost" && { callbackPort: md.callbackPort }),
                  };
                },
                async onMcpOauthCallbackUrl(Pi, fa) {
                  let oAuthCallbackSubmitter = dte().getOAuthCallbackSubmitter(Pi);
                  if (!oAuthCallbackSubmitter)
                    throw new WireSafeControlError(
                      `No OAuth flow in progress for "${uo(Pi)}" \u2014 call mcp_authenticate first`,
                    );
                  if (!oAuthCallbackSubmitter(fa))
                    throw new WireSafeControlError(
                      "Invalid callback URL \u2014 no authorization code, or it belongs to a different sign-in attempt (state mismatch). The flow is still open; retry with the full redirect URL from this sign-in.",
                    );
                  let activeOAuthPromise = dte().getActiveOAuthPromise(Pi);
                  if (activeOAuthPromise)
                    try {
                      await activeOAuthPromise;
                    } catch (error) {
                      let Ad = Er.getState().mcp.clients.find((client) => client.name === Pi)?.config;
                      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                        `MCP OAuth failed for ${Pi}: ${Ad ? normalizeMcpServerName(redactMcpErrorDetail(Pi, Ad, errorMessage(error))) : "[error detail unavailable: server configuration could not be located]"}`,
                        "MCP OAuth completion failed (detail clamped in the local log)",
                      );
                    }
                },
                async onMcpReconnect(Pi) {
                  let fa = Iyt();
                  if (!fa)
                    throw new WireSafeControlError(
                      "MCP controls aren't available right now \u2014 the terminal is still starting up or is showing another view",
                    );
                  assertToggleableServer(Er.getState().mcp.clients, Pi);
                  let sa = await fa(Pi, { discardDiscovery: !gNn(Bo.current, Pi) });
                  assertMcpReconnected(sa.client);
                },
                answerSharedControlRequest: (Pi) => dispatchLocalControlRequest(Pi, wp),
                onSetColor(Pi) {
                  let fa = Pi === "default";
                  if (!fa && !AGENT_COLOR_NAMES.includes(Pi))
                    return {
                      ok: !1,
                      error: `Unknown color "${Pi}". Available: ${AGENT_COLOR_NAMES.join(", ")}, default`,
                    };
                  let sa = fa ? void 0 : Pi,
                    td = getSessionId();
                  saveAgentColor(
                    td,
                    Pi,
                    getMaterializedSessionFile() ?? getTranscriptPath(),
                    storageV5,
                  ).catch((prev_17) => {
                    logForDebugging(`saveAgentColor: transcript append failed: ${errorMessage(prev_17)}`);
                  });
                  let state = Er.getState(),
                    Ad = state.agent
                      ? state.agentDefinitions.activeAgents.find(
                          (prev_18) => prev_18.agentType === state.agent,
                        )
                      : void 0;
                  return (
                    syncJobColor(
                      getOwnJobShortId(),
                      getEffectiveAgentColor({ userOverride: sa, agentDefinitionColor: Ad?.color }),
                      storageV5,
                    ),
                    store((od) => {
                      if (od.standaloneAgentContext?.color === sa) return od;
                      return {
                        ...od,
                        standaloneAgentContext: {
                          ...od.standaloneAgentContext,
                          name: od.standaloneAgentContext?.name ?? "",
                          color: sa,
                        },
                      };
                    }),
                    { ok: !0 }
                  );
                },
                onStateChange: Kp,
                onBridgeInjectedMcp: Iu,
                initialMessages:
                  js || _d ? void 0 : Ka !== void 0 ? h.slice(0, Ka) : h.length > 0 ? h : void 0,
                getMessages: x.getSnapshot,
                remoteControlOrigin: Ws,
                getBackfillMessages: (Pi) => {
                  if (Ho.current || Wo.current || Io.current) return;
                  return x
                    .getSnapshot()
                    .filter(
                      (fa) =>
                        mn.current.get(fa.uuid)?.has(Pi) !== !0 &&
                        !(isCompactBoundaryOrSummary(fa) && (Go() || isCompactPairWithheldFromRemote())),
                    );
                },
                isTurnActive: Be,
                initialName: replBridgeInitialName,
                sessionGroupingId: replBridgeSessionGroupingId,
                enableSessionPersistence:
                  Ss || isPersistentRemoteSessionEnabled() || isRemoteControlInternalEventsEnabled(),
                storageV5: storageV5,
                credentials: credentials,
                onTransportRebuilt: forwardRateLimitToBridge,
              });
            if (kn.current === Ll) {
              if (((kn.current = void 0), !Wd)) Fn(bn(Ll.sid));
            }
            if (qa) {
              if ((logForDebugging("[bridge:repl] Hook: init cancelled during flight, tearing down"), Wd))
                Wd.teardown();
              return;
            }
            if (!Wd && du) {
              if (
                (logForDebugging(
                  `[bridge:repl] Init declined: session held by local pid ${du.pid}; leaving Remote Control off`,
                ),
                !Ss)
              ) {
                let Pi = bridgeStatusLines(du, { crossSessionMessaging: isCrossSessionMessagingEnabled() });
                x.replace((fa) => {
                  let at = fa.at(-1);
                  if (
                    at?.type === "system" &&
                    at.subtype === "informational" &&
                    typeof at.content === "string" &&
                    at.content.startsWith(wbo)
                  )
                    return fa;
                  return [...fa, createSystemMessage(Pi, "warning")];
                });
              }
              store((Pi) =>
                Pi.replBridgeEnabled || Pi.replBridgeAutoOnByDefault
                  ? {
                      ...Pi,
                      replBridgeEnabled: !1,
                      replBridgeSessionGroupingId: void 0,
                      replBridgeAutoOnByDefault: !1,
                    }
                  : Pi,
              );
              return;
            }
            if (!Wd && Am !== void 0) {
              let Pi = Am;
              if (
                (logForDebugging("[bridge:repl] Init declined by org policy; leaving Remote Control off"),
                !Ss)
              )
                x.replace((fa) =>
                  fa.some((sa) => sa.type === "system" && sa.subtype === "informational" && sa.content === Pi)
                    ? fa
                    : [...fa, createSystemMessage(Pi, "notice")],
                );
              store((fa) =>
                fa.replBridgeEnabled || fa.replBridgeAutoOnByDefault
                  ? {
                      ...fa,
                      replBridgeEnabled: !1,
                      replBridgeSessionGroupingId: void 0,
                      replBridgeAutoOnByDefault: !1,
                    }
                  : fa,
              );
              return;
            }
            if (!Wd) {
              if (!nl) Xo.current++;
              if (
                (reportConcurrentBridgeSessions(Ss),
                logForDebugging(
                  `[bridge:repl] Init returned null (precondition or session creation failed); consecutive failures: ${Xo.current}`,
                ),
                messagesRef.current?.(),
                Er.getState().replBridgeError !== void 0)
              )
                Gl();
              else if (replBridgeExplicit && !Ss && isBridgeEnabled()) as(BRIDGE_LOGIN_HINT, "auth");
              else
                store((Pi) =>
                  Pi.replBridgeEnabled
                    ? { ...Pi, replBridgeEnabled: !1, replBridgeSessionGroupingId: void 0 }
                    : Pi,
                );
              return;
            }
            ((teardownPromiseRef.current = Wd),
              setReplBridgeHandle(Wd, storageV5),
              setCurrentForKey(Et, void 0),
              registerLiveSuppressionProbe(() => getReplBridgeHandle()?.noHistoryBackfill === !0),
              (dr.current = Ir.current),
              reportBridgePermissionMode(Er.getState().toolPermissionContext.mode),
              noopRenameNotify("bridge_connected", credentials));
            let Rl = getMainLoopModel();
            if (
              (reportBridgeModel(Rl),
              reportEffortForModel(Rl, Er.getState()),
              buildBridgeInitializeCommands(() => ({
                messages: x.getSnapshot(),
                model: Rl,
                autoCompactWindow: Er.getState().autoCompactWindow,
                resetBoundary: bUt(Et),
              })),
              aW(Er.getState().frameUrls),
              sNn(),
              setInboundAvailabilityPublisher(reportBridgeCrossSessionInbound),
              emitBackgroundTasksChanged(Er.getState()),
              logBridgeRateLimitForward(Wd),
              detectCurrentRepositoryWithHost(),
              (Xo.current = 0),
              !Ss)
            )
              removeNotification(BRIDGE_FAILED);
            if (Zr({ archiveAbandoned: cd })) logEvent("tengu_bridge_compacted_while_disabled_remint", {});
            let Yd = ga !== void 0 && Wd.bridgeSessionId === ga;
            if (((bo.current = $l ? 0 : Yd ? (Ka ?? pd) : pd), Fn(Wd.bridgeSessionId), !$l)) {
              No.current.sid = Yi;
              for (let Pi of h)
                if (!mn.current.get(Pi.uuid)?.has(Wd.bridgeSessionId))
                  (No.current.rows.add(Pi.uuid), (No.current.tip = Pi.uuid));
            }
            if (
              ((Ao.current = new Set(h.slice(0, bo.current).map((Pi) => Pi.uuid))),
              (Ro.current = bo.current > 0 ? { head: h[0]?.uuid } : {}),
              (Wo.current = !1),
              isBgSession())
            )
              persistBridgeSessionToJobState(
                process.env.CLAUDE_JOB_DIR,
                Wd.bridgeSessionId,
                Ss,
                Wd.sessionGroupingId,
                ed && { accountUuid: ed.accountUuid, organizationUuid: ed.organizationUuid },
                on.current,
                storageV5,
              );
            else if (!Ss) handlePermissionResponse(Wd);
            if (Ss)
              (store((Pi) => {
                if (Pi.replBridgeConnected && Pi.replBridgeSessionId === Wd.bridgeSessionId) return Pi;
                return {
                  ...Pi,
                  replBridgeConnected: !0,
                  replBridgeSessionId: Wd.bridgeSessionId,
                  replBridgeSessionUrl: void 0,
                  replBridgeConnectUrl: void 0,
                };
              }),
                logForDebugging(`[bridge:repl] Mirror initialized, session=${Wd.bridgeSessionId}`));
            else {
              Re.connectBridge({
                permission: createBridgePermissionCallbacks(Wd, pendingPermissionHandlers),
                dialog: createBridgeDialogCallbacks(Wd, hd, bd),
              });
              let Pi = getRemoteSessionUrl(Wd.bridgeSessionId, Wd.sessionIngressUrl);
              if (
                (store((fa) => ({
                  ...fa,
                  replBridgeConnected: !0,
                  replBridgeSessionUrl: Pi,
                  replBridgeEnvironmentId: Wd.environmentId,
                  replBridgeSessionId: Wd.bridgeSessionId,
                  replBridgeError: void 0,
                  replBridgeErrorKind: void 0,
                })),
                replBridgeExplicit)
              )
                x.replace((fa) =>
                  fa.some((sa) => sa.type === "system" && sa.subtype === "bridge_status" && sa.url === Pi)
                    ? fa
                    : [...fa, createBridgeStatusMessage(Pi)],
                );
              logForDebugging(`[bridge:repl] Hook initialized, session=${Wd.bridgeSessionId}`);
            }
          } catch (err) {
            if (kn.current === Ll) ((kn.current = void 0), Fn(bn(Ll.sid)));
            if (qa) return;
            if (!nl) Xo.current++;
            reportConcurrentBridgeSessions(Ss);
            let errMsg = errorMessage(err);
            if (
              (logForDebugging(`[bridge:repl] Init failed: ${errMsg}; consecutive failures: ${Xo.current}`),
              messagesRef.current?.(),
              Ss)
            )
              store((prev_0) =>
                prev_0.replBridgeEnabled
                  ? { ...prev_0, replBridgeEnabled: !1, replBridgeSessionGroupingId: void 0 }
                  : prev_0,
              );
            else as(errMsg, nl ? "auth" : "terminal");
          }
        })(),
        () => {
          if (((qa = !0), kn.current === Ll)) ((kn.current = void 0), Fn(bn(Ll.sid)));
          (ec(),
            subscribe(),
            setDropNotifier(void 0),
            messagesRef.current?.(),
            (messagesRef.current = void 0));
          let replBridgeSkipNextArchive = Er.getState().replBridgeSkipNextArchive,
            na = !Ss && hasQueuedTaskNotification((prev_1) => prev_1.type === "conversation_reset");
          if (na)
            (logFeatureSad("bridge_conversation_reset", "undelivered_at_teardown"),
              setCurrentForKey(Et, void 0),
              Zr({ archiveAbandoned: teardownPromiseRef.current === null }),
              zr());
          if (replBridgeSkipNextArchive)
            store((prev_2) => {
              if (!prev_2.replBridgeSkipNextArchive) return prev_2;
              return { ...prev_2, replBridgeSkipNextArchive: !1 };
            });
          if (teardownPromiseRef.current) {
            let js = teardownPromiseRef.current,
              Ya = !Er.getState().replBridgeEnabled && !pl,
              tl = (Ya && !replBridgeSkipNextArchive) || na,
              ol = replBridgeSkipNextArchive && !(pl && na);
            if (!pl) Zr({ archiveAbandoned: !1 });
            if (((dr.current = void 0), !Ss))
              if (tl) {
                let ga = Vd();
                if (ga !== null) clearBridgeSession(Yi, ga, void 0, storageV5);
                if ((zr(), isBgSession())) clearBridgeSessionFromJobState(storageV5);
              } else if (replBridgeSkipNextArchive && !pl) clearBridgeSessionCache();
              else handlePermissionResponse(js);
            let ed = Ss !== Er.getState().replBridgeOutboundOnly && Er.getState().replBridgeEnabled,
              _d =
                replBridgeSkipNextArchive || pl || ed ? void 0 : Ya ? "remote_control_disabled" : "host_exit";
            (logForDebugging(
              `[bridge:repl] Hook cleanup: starting teardown for session=${js.bridgeSessionId}${ol ? " (skipArchive)" : ""}${_d ? ` reason=${_d}` : ""}`,
            ),
              (lastWrittenIndexRef.current = js.teardown({ skipArchive: ol, reason: _d })),
              (teardownPromiseRef.current = null),
              setReplBridgeHandle(null, storageV5),
              ovt(js),
              setCurrentForKey(Et, void 0),
              registerLiveSuppressionProbe(void 0));
          }
          if (!pl && !Ss) removeNotification(BRIDGE_FAILED);
          (Re.disconnectBridge(),
            detachPendingDialogs(hd),
            store((prev_19) => {
              let Ya = pl || Ss ? prev_19.replBridgeError : void 0,
                tl = pl || Ss ? prev_19.replBridgeErrorKind : void 0;
              if (
                !prev_19.replBridgeConnected &&
                !prev_19.replBridgeSessionActive &&
                !prev_19.replBridgeReconnecting &&
                !prev_19.replBridgeConnectUrl &&
                !prev_19.replBridgeSessionUrl &&
                !prev_19.replBridgeEnvironmentId &&
                !prev_19.replBridgeSessionId &&
                prev_19.replBridgeError === Ya &&
                prev_19.replBridgeErrorKind === tl
              )
                return prev_19;
              return {
                ...prev_19,
                replBridgeConnected: !1,
                replBridgeSessionActive: !1,
                replBridgeReconnecting: !1,
                replBridgeConnectUrl: void 0,
                replBridgeSessionUrl: void 0,
                replBridgeEnvironmentId: void 0,
                replBridgeSessionId: void 0,
                replBridgeError: Ya,
                replBridgeErrorKind: tl,
              };
            }),
            (bo.current = 0),
            (Ao.current = new Set()),
            (Ro.current = {}));
        }
      );
    }, [
      replBridgeEnabled,
      replBridgeOutboundOnly,
      Hs,
      store,
      x,
      addNotification,
      removeNotification,
      Dt,
      storageV5,
      credentials,
      Ot,
      Et,
      Re,
    ]));
  function dl(Ss) {
    let state = Er.getState();
    if (!state.replBridgeConnected) return;
    let handle_1 = teardownPromiseRef.current;
    if (!handle_1) return;
    if (yvt(handle_1, state.replBridgeSessionActive)) return;
    let za = Io.current;
    Io.current = !1;
    try {
      let cl = Ao.current,
        { head: head, tail: tail, eligible: eligible } = Ro.current,
        qa = head === void 0 || Ss[0]?.uuid === head,
        pd = eligible === void 0 || Ss[eligible.index]?.uuid === eligible.uuid,
        $l = 0;
      if (za)
        ((Wo.current = !0),
          logForDebugging(
            `[bridge:repl] Transcript replaced under a detached binding \u2014 ${Ss.length} message(s) accounted as seen, not uploaded`,
          ));
      else {
        if (qa && pd) {
          if (tail !== void 0 && Ss[tail.index]?.uuid === tail.uuid) $l = tail.index + 1;
          else if (eligible !== void 0) $l = eligible.index + 1;
        }
        if ($l === 0 && (tail !== void 0 || eligible !== void 0))
          logForDebugging(
            `[bridge:repl] Transcript rewrite detected (messages.length=${Ss.length}), rescanning`,
          );
      }
      let Yi = $l > 0 ? eligible : void 0,
        El = [],
        Ll = [],
        _c,
        mc = getBridgeSubagentFrameGate();
      for (let cd = $l; cd < Ss.length; cd++) {
        let msg_1 = Ss[cd];
        if (!msg_1 || !isEligibleBridgeMessage(msg_1)) {
          if (msg_1 && extractAgentIdsFromMessages_2(msg_1) && !cl.has(msg_1.uuid)) {
            if ((cl.add(msg_1.uuid), !za && mc.enabled)) {
              _c ??= ke().tools;
              for (let pl of subagentProgressToSDKMessages(msg_1, _c))
                if (shouldForwardSubagentMessage(mc, pl)) Ll.push(pl);
            }
          }
          continue;
        }
        if (((Yi = { index: cd, uuid: msg_1.uuid }), cl.has(msg_1.uuid))) continue;
        if ((cl.add(msg_1.uuid), za || mn.current.get(msg_1.uuid)?.has(handle_1.bridgeSessionId) === !0))
          continue;
        if (isCompactBoundaryOrSummary(msg_1) && (Wo.current || Go() || isCompactPairWithheldFromRemote()))
          continue;
        El.push(msg_1);
      }
      bo.current = Ss.length;
      let at = Ss.at(-1);
      if (
        ((Ro.current = {
          head: Ss[0]?.uuid,
          tail: at && { index: Ss.length - 1, uuid: at.uuid },
          eligible: Yi,
        }),
        forwardQueuedSdkEventsToBridge(handle_1),
        El.length > 0)
      )
        handle_1.writeMessages(El);
      if (Ll.length > 0) handle_1.writeSdkMessages(Ll);
    } catch (error) {
      if (za) Io.current = !0;
      logError(error);
    }
  }
  (P(() => {
    dl(h);
  }, [h, replBridgeConnected, replBridgeSessionActive]),
    P(() => {
      if (!replBridgeConnected) return;
      let Ss = () => {
        let yi = teardownPromiseRef.current;
        if (!yi || yvt(yi, Er.getState().replBridgeSessionActive)) return;
        forwardQueuedSdkEventsToBridge(yi);
      };
      return (setTaskNotificationListener(Ss), Ss(), () => setTaskNotificationListener(null));
    }, [replBridgeConnected, replBridgeSessionActive]),
    useForwardRateLimitEventsToBridge(replBridgeConnected, Xt),
    P(() => {
      if (!replBridgeEnabled) {
        let Ss = drainTaskNotifications(),
          yi = !1,
          Ws = !1;
        for (let za of Ss)
          if (za.subtype === "task_notification") yi = !0;
          else if (za.subtype === "background_tasks_changed") Ws = !0;
        if (yi || Ws)
          logFeatureSad(
            "ccr_task_status_publish",
            Er.getState().replBridgeError !== void 0
              ? "status_discarded_failed_init"
              : "status_discarded_user_disable",
            { has_terminal_bookend: yi, has_level: Ws },
          );
      }
    }, [replBridgeEnabled]),
    P(() => {
      if (
        replBridgeEnabled ||
        replBridgeError === void 0 ||
        replBridgeErrorKind !== "auth" ||
        replBridgeOutboundOnly ||
        !isBridgeAuthReviveEnabled()
      )
        return;
      let Ss = !1,
        yi,
        Ws = 300000;
      async function za() {
        let cl = of.getSnapshot().credentialsPersisted !== ts.current,
          Ol = !isBridgeAuthReviveEnabled(),
          as = Ol || (!cl && Pr.current >= h$o);
        if (as)
          logForDebugging(
            Ol
              ? "[bridge:repl] Auth-revive watcher: kill switch off \u2014 still polling, no unattended revive"
              : "[bridge:repl] Auth-revive watcher: non-interactive revive brake engaged \u2014 still polling; an in-process /login bypasses",
          );
        let pi = or.current === _Ie,
          qa;
        try {
          qa = as || pi ? void 0 : await readFreshOAuthCredentialSnapshot(storageV5, credentials);
        } catch {
          qa = void 0;
        }
        if (Ss) return;
        let pd = or.current !== _Ie,
          $l = pr.current;
        if (
          pd &&
          qa !== void 0 &&
          qa.accessToken !== or.current &&
          qa.accountUuid !== void 0 &&
          $l?.accountUuid !== void 0
        ) {
          if (!sameOwnerAccount(qa, $l)) {
            logForDebugging(
              "[bridge:repl] Auth-revive watcher: credential belongs to a different account \u2014 disarming",
            );
            return;
          }
          logForDebugging(
            "[bridge:repl] Auth-revive watcher: fresh same-account credential \u2014 re-enabling Remote Control",
          );
          let El = !1;
          if (
            (store((Ll) => {
              if (Ll.replBridgeEnabled || Ll.replBridgeError === void 0) return Ll;
              return (
                (El = !0),
                { ...Ll, replBridgeEnabled: !0, replBridgeError: void 0, replBridgeErrorKind: void 0 }
              );
            }),
            El)
          )
            (logEvent("tengu_bridge_repl_auth_revive", {}),
              Pr.current++,
              (Qn.current = !0),
              (ur.current = { accountUuid: qa.accountUuid, organizationUuid: qa.organizationUuid }));
          return;
        }
        yi = Dt.setTimeout(() => {
          za();
        }, Ws);
      }
      return (
        za(),
        () => {
          ((Ss = !0), yi?.());
        }
      );
    }, [
      replBridgeEnabled,
      replBridgeError,
      replBridgeErrorKind,
      credentialsPersisted,
      store,
      Dt,
      Er,
      replBridgeOutboundOnly,
      storageV5,
      credentials,
    ]));
  let Vl = (Ss) => {
      (dl(x.getSnapshot()), teardownPromiseRef.current?.sendResult(Ss));
      let yi = getMainLoopModel();
      if (
        (reportBridgeModel(yi),
        reportBridgeEffortMetadata({ ultracodeActive: isUltracodeActive(Er.getState().ultracode, yi) }),
        buildBridgeInitializeCommands(
          () => ({
            messages: x.getSnapshot(),
            model: getMainLoopModel(),
            autoCompactWindow: Er.getState().autoCompactWindow,
            resetBoundary: bUt(Et),
          }),
          () =>
            collectBridgeContextUsage(
              {
                getContextUsageInputs: ke,
                store: Er,
                transcript: x,
                storageV5: storageV5,
                credentials: credentials,
                mainLoopModel: ee,
              },
              { detail: "summary" },
            ),
        ),
        mirrorTokenUsageToBridge(),
        teardownPromiseRef.current)
      )
        ua();
      try {
        if (Ss !== void 0 && Ss.terminalReason === void 0 && Ss.sendNowCut !== !0)
          rearmNotificationNudge({ getAppState: () => Er.getState(), setAppState: store, session: Et });
      } catch (error) {
        (logForDebugging(`[bridge:repl] turn-end upkeep failed: ${errorMessage(error)}`, { level: "error" }),
          logError(error));
      }
    },
    sendBridgeResult = ce((Ss) => {
      teardownPromiseRef.current?.stampReply(Ss);
    }, []);
  return { sendBridgeResult: Vl, stampBridgeReply: sendBridgeResult };
}
//@ chunk-tw3rx20q.js:299-324 placement
var replBridgeEvents = new SessionRootSlot(() => createSignal());
//@ chunk-tw3rx20q.js:324-377 placement
function emitReplBridgeEvent(e, s, o) {
  (setCurrentForKey(e, void 0), replBridgeEvents.of(e).emit(s, o));
}

export { emitReplBridgeEvent, resolveBridgeImmediateCommand_2, useReplBridge };
