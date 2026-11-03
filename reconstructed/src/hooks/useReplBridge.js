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
import { init_react_production, P, Oo, R, ce, yt, y, Uy } from "../../vendor/react/cjs/react.production.js";
import {
  buildRateLimitInfo,
  forwardRateLimitEventToBridge,
  logBridgeRateLimitForward,
  takeRecentWithin,
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
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import { useCommandQueueOrDefault, useQueuedMessageText } from "../context/QueuedMessageContext.js";
import { useSession } from "../context/session.js";
import { useClock } from "../ink/components/ClockContext.js";
import { useAppStateSession, useSetAppState, useAppStoreDirect, useAppState } from "../state/AppState.js";
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
import { loginEventCounter } from "../services/oauth/loginEvents.js";
import { useStoreSelector } from "./useStoreSelector.js";
import {
  resolveEffortLevelOrNull,
  reportEffortForModel,
  applyBridgeFlagSettings,
  reportBridgeEffortForRequest,
  reportBridgeEffortMetadata,
} from "../bridge/applyFlagSettings.js";
import { getMainLoopModel } from "../utils/model/model.js";
import { subscribeFocusMode } from "../utils/focusMode.js";
import { viewTeammateOutput } from "../components/teams/TeamsDialog.js";
import { isHumanTurn_2 } from "../utils/messagePredicates.js";
import { setOwnBridgePeerResolver } from "../utils/udsMessaging/peerGuard.js";
import {
  ownBridgePeerAddress,
  setReplBridgeHandle,
  getReplBridgeHandle,
  reportBridgePermissionMode,
  reportBridgeModel,
  reportBridgeCrossSessionInbound,
} from "../bridge/replBridgeHandle.js";
import { isRemoteSessionAvailable } from "../remote/remoteMode.js";
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
import { messagesSinceCompactBoundary } from "../services/projects/threadRows.js";
import { recordInitTiming } from "../utils/messages/systemInit.js";
import { buildBridgeInitializeCommands, logBridgeInitializeCommands } from "../cli/print/lowLatencySubmit.js";
import { getCurrentForKey, setCurrentForKey } from "../utils/currentRefByKey.js";
import {
  onOrgFastModeChange,
  onFastRejectedFallbackModelsChanged,
  isFastModeEnabled,
  clearFastModeCooldown,
  isFastModeActive,
  reportFastModeToggle,
} from "../utils/fastMode.js";
import { onMemorySkillsChanged } from "../services/memorySync/memorySkills.js";
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
import {
  BRIDGE_FAILED,
  BRIDGE_FAILED_FOOTER_TEXT,
  bridgeStatusLines,
  REMOTE_CONTROL_NOT_STARTED_TEXT,
} from "../bridge/bridgeStatusUtil.js";
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
  noopHandler,
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
import { shortHash } from "../utils/shortHash.js";
import {
  switchSerializerSlot,
  hasPreModelSwitchHook,
  recordSwitchIfChanged,
  serializeModelSwitch,
} from "../utils/model/modelSwitchHooks.js";
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
import {
  formatModelRestrictedNotice,
  displayModelName as displayModelName_2,
} from "../utils/model/validateModel.js";
import { parseUserSpecifiedModel } from "../utils/model/modelDisplay.js";
import { resolveMainLoopModel } from "./useMainLoopModel.js";
import { handleFastModeShortcut } from "../commands/fast/fast.js";
import {
  runPreModelSwitchHooks,
  describeModelSwitchBlocked,
  sanitizeHookText,
} from "../commands/model/modelSwitch.js";
import {
  normalizeServerNameShort,
  normalizeMcpServerName,
  sanitizeErrorDetail,
} from "../services/api/deferredToolsState.js";
import {
  assertToggleableServer,
  disabledElsewhereText,
  mcpRefusalText,
  reservedAddressRefusalText,
} from "../services/mcp/mcpToggleMessages.js";
import {
  getIsDisabledHandle,
  getDialBlockCauseHandle,
  getReconnectHandle,
} from "../services/mcp/reconnectHandles.js";
import { judgeGate } from "../services/analytics/growthbookGates.js";
import { classifyMcpAuthTarget } from "../services/mcp/auth.js";
import { claudeAiConnectorAuthUrl } from "../services/mcp/claudeai.js";
import { shouldSkipCustomRedirect } from "../services/mcp/customRedirectSkip.js";
import { redactMcpErrorDetail } from "../services/mcp/mcpServerOrigin.js";
import { dispatchLocalControlRequest } from "../entrypoints/sdk/controlSchemas.js";
import { AGENT_COLOR_NAMES, getEffectiveAgentColor } from "../tools/AgentTool/agentColorManager.js";
import { isCrossSessionMessagingEnabled } from "../utils/crossSessionMessagingGate.js";
import { noopRenameNotify } from "../utils/sessionTitle.js";
import { persistBridgeArtifactFrames } from "../utils/sessionTagRefresh.js";
import { installRemoteEgressSuppressor } from "../cli/print/turnStreaming.js";
import { setInboundAvailabilityPublisher } from "../utils/crossSessionInbound/inboundMode.js";
import { detectCurrentRepositoryWithHost } from "../utils/detectRepository.js";
import { subagentProgressToSDKMessages, shouldForwardSubagentMessage } from "../utils/queryHelpers.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { createSignal } from "../utils/signal.js";

//@ chunk-18hwfzwa.js:1574185-1574189 placement
init_react_production();
//@ chunk-18hwfzwa.js:1574189-1574407 placement
function useForwardRateLimitEventsToBridge(replBridgeConnected, x) {
  P(() => {
    if (!replBridgeConnected) return;
    function D(L) {
      let ee = x();
      if (!ee) return;
      try {
        let rateLimitInfo = buildRateLimitInfo(L);
        if (rateLimitInfo) forwardRateLimitEventToBridge(ee, rateLimitInfo);
      } catch (error) {
        logForDebugging(`[bridge] rate_limit_event listener failed: ${errorMessage(error)}`, {
          level: "error",
        });
      }
    }
    return onLimitsStatusChanged(D);
  }, [replBridgeConnected, x]);
}
//@ chunk-18hwfzwa.js:1574407-1574557 placement
function reportConcurrentBridgeSessions(h) {
  (h ? Promise.resolve(0) : countLiveBridgeProcesses())
    .then((x) => {
      if (x >= 2)
        logFeatureBad("bridge_repl", "multi_session_crash", {
          concurrent_bridge_sessions: x,
        });
    })
    .catch(() => {});
}
//@ chunk-18hwfzwa.js:1574557-1574596 placement
var bridgeCoordinatorModule = require("./chunk-yxywkh50.js");
//@ chunk-18hwfzwa.js:1574596-1574649 placement
function mcpAuthModule() {
  return require("./chunk-asne9cp8.js");
}
//@ chunk-18hwfzwa.js:1574649-1574693 placement
function getMcpAuthModule() {
  return mcpAuthModule().mcpAuthModule();
}
//@ chunk-18hwfzwa.js:1574693-1574705 placement
var BRIDGE_FLUSH_TIMEOUT_MS = 1e4;
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
function shouldSkipConversationReset(h, replBridgeSessionActive) {
  return (
    !replBridgeSessionActive &&
    !h.outboundOnly &&
    hasQueuedTaskNotification((D) => D.type === "conversation_reset")
  );
}
//@ chunk-18hwfzwa.js:1574965-1575003 placement
var BASELINE_PENDING_SENTINEL = "\x00baseline-pending";
var AUTH_REVIVE_POLL_LIMIT = 10;
//@ chunk-18hwfzwa.js:1575003-1575268 placement
/**
 * 解析从 Remote Control 收到的输入是否为可立即执行的斜杠命令：找到命令且允许即时执行时，返回桥接安全的本地命令（或其回退）、参数与显示名，否则 null。
 */
function resolveBridgeImmediateCommand_2(h, x, renderMode, L) {
  let slashCommand = parseSlashCommand(h);
  if (!slashCommand) return null;
  let command = findCommand(slashCommand.commandName, x);
  if (!command || !isImmediateCommand(command, slashCommand.args, renderMode)) return null;
  let Be =
    command.type === "local" && isBridgeSafeCommand(command) && admitsBridgeAuthor(command, L)
      ? command
      : findBridgeFallback(command);
  if (!Be || Be.type !== "local") return null;
  return {
    target: Be,
    args: slashCommand.args,
    displayName: getCommandName(command),
  };
}
//@ chunk-18hwfzwa.js:1575268-1575278 layout
var MAX_BRIDGE_INIT_FAILURES = 3;
//@ chunk-18hwfzwa.js:1575278-1611905 callgraph-witnessed = useReplBridge (0.238)
/**
 * Remote Control 桥：启用后注册环境并建立会话，把本地消息/工具结果/权限请求转发到 claude.ai，把远程提示、权限回复、命令（/clear、fork、模式切换、teleport pull）应用到本地；处理错误与重连。
 */
function useReplBridge(
  storeSelector,
  transcript,
  D,
  L,
  mainLoopModel,
  ke,
  permissionRelays,
  isTurnActive,
  runBridgeImmediateCommand,
  spawnThinkingConfig,
  updateDynamicMcpConfig,
  isTurnLive,
  thinkingDisplayFlag,
) {
  let renderMode = useRenderMode();
  let { storageV5, credentials } = useTheme_2();
  let queue = useCommandQueueOrDefault();
  let session = useSession();
  let clock = useClock();
  let handleRef = Oo(D);
  let teardownPromiseRef = R(null);
  let Xt = ce(() => teardownPromiseRef.current, []);
  let appStateSession = useAppStateSession();
  P(() => {
    let Ss = new Set([transportStateByHost.of(session), transportStateByHost.of(appStateSession)]);
    let yi = new Map([...Ss].map((Ws) => [Ws, Ws.remoteBridgeLive]));
    for (let Ws of Ss) Ws.remoteBridgeLive = () => teardownPromiseRef.current !== null;
    return () => {
      for (let [Ws, za] of yi) Ws.remoteBridgeLive = za;
    };
  }, [session, appStateSession]);
  let lastWrittenIndexRef = R(undefined);
  let flushedUUIDsRef = R(null);
  let failureTimeoutRef = R(null);
  let consecutiveFailuresRef = R(new WeakSet());
  let bo = R(0);
  let Ao = R(new Set());
  let Bo = R(new Map());
  let Ro = R({});
  let Ho = R(false);
  let Io = R(false);
  let Wo = R(false);
  let mn = R(new Map());
  function Cn(Ss, yi) {
    let Ws = mn.current.get(Ss);
    if (Ws === undefined) mn.current.set(Ss, new Set([yi]));
    else Ws.add(yi);
  }
  let No = R({
    sid: undefined,
    rows: new Set(),
    tip: undefined,
  });
  let vo = Oo((Ss, yi) => {
    let Ws = No.current;
    if (Ws.sid !== undefined && Ws.sid !== Ss) return;
    Ws.sid = Ss;
    for (let za of storeSelector)
      if (!mn.current.get(za.uuid)?.has(yi)) {
        Ws.rows.add(za.uuid);
        Ws.tip = za.uuid;
      }
    return Ws.tip;
  });
  let Yo = R(undefined);
  let kn = R(undefined);
  function Fn(Ss) {
    for (let [Ws, za] of mn.current)
      if (za.delete(PENDING_BRIDGE_SESSION)) {
        if (Ss !== undefined) za.add(Ss);
        else if (za.size === 0) mn.current.delete(Ws);
      }
    let yi = Yo.current;
    if (yi?.bridgeSessionId === PENDING_BRIDGE_SESSION)
      Yo.current =
        Ss === undefined
          ? undefined
          : {
              sids: yi.sids,
              bridgeSessionId: Ss,
            };
  }
  function bn(Ss) {
    if (sessionIdRef.current === Ss) return bridgeSessionIdRef.current;
    return Ss === getSessionId() ? getCurrentSessionBridge()?.id : undefined;
  }
  P(() => {
    let Ss = replBridgeEvents.of(session).subscribe((Ws, za) => {
      if (!za) return;
      let setAppState = getSessionId();
      let as =
        teardownPromiseRef.current !== null &&
        !Ho.current &&
        !Wo.current &&
        mainLoopModelRef.current === setAppState
          ? teardownPromiseRef.current?.bridgeSessionId
          : kn.current?.sid === setAppState
            ? PENDING_BRIDGE_SESSION
            : bn(setAppState);
      if (as === undefined) return;
      let pi = vo(setAppState, as);
      let qa = pi !== undefined && za.includes(pi);
      let pd = 0;
      for (let El of qa ? [] : za) {
        Cn(El, as);
        pd += 1;
      }
      let $l = Yo.current;
      let Yi = $l === undefined || $l.sids.has(Ws);
      if (pd === 0) {
        if (Yi) Yo.current = undefined;
        return;
      }
      if (Yi)
        Yo.current = {
          sids: new Set([Ws]),
          bridgeSessionId: as,
        };
      logForDebugging(
        `[bridge:repl] /teleport pull under the bound conversation \u2014 ${pd} pulled row(s) will not forward into this session`,
      );
    });
    let commandsRef = onSessionSwitch((Ws, za) => {
      if (za === "clear") {
        Yo.current = undefined;
        No.current = {
          sid: undefined,
          rows: new Set(),
          tip: undefined,
        };
      } else if (za === "fork" && Yo.current !== undefined && !Ho.current && !Wo.current) {
        Yo.current.sids.add(Ws);
        No.current.sid = Ws;
      }
    });
    return () => {
      Ss();
      commandsRef();
    };
  }, [session]);
  function Go() {
    let Ss = Yo.current;
    if (Ss === undefined || !Ss.sids.has(getSessionId())) return false;
    let bridgeSessionId = teardownPromiseRef.current?.bridgeSessionId;
    return Ss.bridgeSessionId === bridgeSessionId || Ss.bridgeSessionId === PENDING_BRIDGE_SESSION;
  }
  let mainLoopModelRef = R(undefined);
  P(() => {
    registerForeignConversationProbe(() => ({
      foreign: Ho.current || Wo.current || Go(),
      boundSid: mainLoopModelRef.current,
      pulledWindow: Yo.current,
      pulledRows: mn.current,
    }));
    return () => registerForeignConversationProbe(undefined);
  }, []);
  let messagesRef = R(undefined);
  let Xo = R(0);
  let bridgeSessionIdRef = R(undefined);
  let lastSequenceNumRef = R(undefined);
  let on = R(false);
  let _o = R(undefined);
  let cn = R(false);
  P(
    () =>
      onInteraction(() => {
        if (teardownPromiseRef.current) cn.current = true;
      }),
    [],
  );
  let Dn = R(false);
  let wn = R(env.CLAUDE_BRIDGE_REATTACH_SESSION !== undefined);
  let mr = R(undefined);
  let Kn = R(undefined);
  let headRef = R(undefined);
  let eligibleRef = R(undefined);
  let sessionIdRef = R(undefined);
  let Un = R(undefined);
  let dr = R(undefined);
  let accessTokenRef = R(undefined);
  let pr = R(undefined);
  let Qn = R(false);
  let ur = R(undefined);
  let Ir = R(undefined);
  let Pr = R(0);
  let credentialsPersistedRef = R(0);
  let Gn = R(0);
  let Ur = R(undefined);
  function Zr({ archiveAbandoned }) {
    bridgeSessionIdRef.current = undefined;
    lastSequenceNumRef.current = undefined;
    mr.current = undefined;
    Kn.current = undefined;
    headRef.current = undefined;
    eligibleRef.current = undefined;
    sessionIdRef.current = undefined;
    Ur.current = undefined;
    _o.current = undefined;
    let yi = Un.current;
    Un.current = undefined;
    if (!yi) return false;
    if (archiveAbandoned) {
      yi.fire().finally(() => yi.unregister());
      return true;
    }
    yi.unregister();
    return false;
  }
  let wr = R([]);
  function zr() {
    for (let Ss of wr.current)
      clearBridgeSession(
        Ss.sessionId,
        Ss.path,
        {
          targetExists: true,
        },
        storageV5,
      );
    wr.current = [];
  }
  let store = useSetAppState();
  let fr = Oo(() => L);
  let $r = Oo(() => mainLoopModel);
  let Yr = Oo((Ss, yi, relayAuthored) => {
    if (!runBridgeImmediateCommand) return false;
    let bridgeImmediateCommand = resolveBridgeImmediateCommand_2(Ss, L, renderMode, {
      origin: yi,
      relayAuthored,
    });
    if (!bridgeImmediateCommand) return false;
    logEvent("tengu_immediate_command_executed", {
      commandName: shippedCommandNameForAnalytics(bridgeImmediateCommand.displayName),
      fromKeybinding: false,
      bridgeOrigin: true,
    });
    runBridgeImmediateCommand(
      bridgeImmediateCommand.target,
      bridgeImmediateCommand.args,
      bridgeImmediateCommand.displayName,
      yi,
    );
    return true;
  });
  let store_2 = useAppStoreDirect();
  let setVoiceState = useSetVoiceState();
  let { addNotification, removeNotification } = useNotifications();
  let replBridgeEnabled = useAppState((Ss) => Ss.replBridgeEnabled);
  let replBridgeConnected = useAppState((Ss) => Ss.replBridgeConnected);
  let commands = useAppState((Ss) => Ss.mcp.commands);
  let replBridgeSessionActive = useAppState((Ss) => Ss.replBridgeSessionActive);
  let replBridgeError = useAppState((Ss) => Ss.replBridgeError);
  let replBridgeErrorKind = useAppState((Ss) => Ss.replBridgeErrorKind);
  let Hi = loginEventCounter.of(session);
  let credentialsPersisted = useStoreSelector(Hi, (Ss) => Ss.credentialsPersisted);
  let replBridgeOutboundOnly = useAppState((Ss) => Ss.replBridgeOutboundOnly);
  let replBridgeInitialName = useAppState((Ss) => Ss.replBridgeInitialName);
  let replBridgeSessionGroupingId = useAppState((Ss) => Ss.replBridgeSessionGroupingId);
  let mode = useAppState((Ss) => Ss.toolPermissionContext.mode);
  let fastMode = useAppState((Ss) => Ss.fastMode);
  let autoCompactWindow = useAppState((Ss) => Ss.autoCompactWindow);
  let settings = useAppState((s_0) => s_0.settings);
  let queuedMessageText = useQueuedMessageText();
  let gs = replBridgeConnected && !replBridgeOutboundOnly;
  let es = replBridgeConnected ? resolveEffortLevelOrNull(getMainLoopModel(), queuedMessageText) : null;
  let ds = yt(subscribeFocusMode, viewTeammateOutput);
  let [Hs, _s] = y(() => process.env.CLAUDE_BG_SOURCE === "spare");
  if (Hs && storeSelector.some(isHumanTurn_2)) _s(false);
  P(() => {
    setOwnBridgePeerResolver(ownBridgePeerAddress);
    return () => setOwnBridgePeerResolver(undefined);
  }, []);
  P(() => {
    if (isRemoteSessionAvailable() || Hs) return;
    logEvent("tengu_bridge_repl_evaluated", {
      would_auto_on: getCcrAutoConnectDefault(),
      repl_bridge_enabled: store_2.getState().replBridgeEnabled,
    });
  }, [store_2, Hs]);
  let fs = Oo(({ seedPermissionMode: Ss = false } = {}) => {
    let yi = teardownPromiseRef.current;
    if (!yi) return;
    let Ws = Ss ? toExternalPermissionMode(store_2.getState().toolPermissionContext.mode) : undefined;
    let za =
      Ws !== undefined &&
      !hasQueuedTaskNotification(
        (s_2) =>
          s_2.type === "system" &&
          s_2.subtype === "status" &&
          s_2.status === null &&
          s_2.permissionMode === Ws,
      );
    (async () => {
      try {
        let loadedSkills = await getSlashCommandToolSkills(getCwd(), storageV5);
        let state = store_2.getState();
        let startTime = performance.now();
        let bridgeContextSnapshot = buildBridgeContextSnapshot({
          session,
          tools: ke().tools,
          model: getMainLoopModel(),
          permissionMode: state.toolPermissionContext.mode,
          commands: fr(),
          agents: state.agentDefinitions.activeAgents,
          loadedSkills,
          mcpCommands: state.mcp.commands,
          fastMode: state.fastMode,
          effortValue: resolveEffortLevel(state),
          messagesInView: () => messagesSinceCompactBoundary(transcript.getSnapshot()),
        });
        recordInitTiming(bridgeContextSnapshot, startTime);
        yi.writeSdkMessages([bridgeContextSnapshot]);
        if (za && teardownPromiseRef.current === yi)
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
  });
  let [ii, ua] = Uy((detail) => detail + 1, 0);
  P(() => {
    if (!gs) return;
    fs();
  }, [gs, mainLoopModel, mode, fastMode, es, ds, commands, L, ii]);
  let La = replBridgeConnected && replBridgeOutboundOnly;
  P(() => {
    if (!La) return;
    fs();
  }, [La, mainLoopModel, mode, fastMode, es, ds]);
  P(() => {
    if (!gs) return;
    reportEffortForModel(getMainLoopModel(), store_2.getState());
  }, [gs, es, store_2]);
  P(() => {
    if (!gs) return;
    buildBridgeInitializeCommands(() => ({
      messages: transcript.getSnapshot(),
      model: getMainLoopModel(),
      autoCompactWindow,
      resetBoundary: getCurrentForKey(session),
    }));
  }, [gs, mainLoopModel, autoCompactWindow, settings, transcript, session]);
  P(() => {
    if (!gs) return;
    let Ss = onOrgFastModeChange(() => {
      fs();
    });
    let yi = onFastRejectedFallbackModelsChanged(() => {
      fs();
    });
    let Ws = onMemorySkillsChanged(() => {
      fs();
    });
    return () => {
      Ss();
      yi();
      Ws();
    };
  }, [gs]);
  let Xa = Oo(() => {
    let { replBridgeEnabled, replBridgeConnected, replBridgeOutboundOnly } = store_2.getState();
    if (!replBridgeEnabled || !replBridgeConnected) return;
    let za = connectedBridgePolicyRefusal(replBridgeOutboundOnly);
    if (za === null) return;
    try {
      store((prev) =>
        prev.replBridgeEnabled
          ? {
              ...prev,
              replBridgeEnabled: false,
              replBridgeSessionGroupingId: undefined,
              replBridgeAutoOnByDefault: false,
            }
          : prev,
      );
    } catch (error) {
      logForDebugging(`[bridge:repl] Policy disconnect failed: ${errorMessage(error)}`, {
        level: "error",
      });
      logError(error);
      return;
    }
    try {
      if (!replBridgeOutboundOnly) {
        let detail = za.detail;
        transcript.replace((msg) => {
          let last = msg.at(-1);
          return last?.type === "system" && last.subtype === "informational" && last.content === detail
            ? msg
            : [...msg, createSystemMessage(detail, "notice")];
        });
      }
      logForDebugging(
        `[bridge:repl] Org policy now refuses the connected bridge (${za.policy}: ${za.kind}, outboundOnly=${replBridgeOutboundOnly}); disconnected`,
      );
      logEvent("tengu_bridge_policy_teardown", {
        lane: lit_2("repl"),
        policy: fromEnum(za.policy),
        deny_kind: fromEnum(za.kind),
        outbound_only: replBridgeOutboundOnly,
      });
    } catch (error) {
      logForDebugging(`[bridge:repl] Policy disconnect notice failed: ${errorMessage(error)}`, {
        level: "error",
      });
      logError(error);
    }
  });
  P(() => {
    if (!replBridgeConnected || isLovelyUmbrellaOn()) return;
    let fields = onPolicyVerdictChanged(() => {
      queueMicrotask(() => Xa());
    });
    Xa();
    return fields;
  }, [replBridgeConnected]);
  P(() => {
    if (!replBridgeEnabled || isRemoteSessionAvailable() || Hs) return;
    let outboundOnly = replBridgeOutboundOnly;
    if (!outboundOnly) {
      removeNotification(BRIDGE_FAILED);
      store((Si) =>
        Si.replBridgeError === undefined
          ? Si
          : {
              ...Si,
              replBridgeError: undefined,
              replBridgeErrorKind: undefined,
            },
      );
    }
    let replBridgeExplicit = store_2.getState().replBridgeExplicit;
    let remoteControlOrigin = replBridgeExplicit
      ? "explicit"
      : store_2.getState().replBridgeAutoOnByDefault
        ? "auto_default"
        : "auto_settings";
    let za = wn.current;
    function cl(Si, na = false) {
      logForDebugging(
        `[bridge:repl] notifyBridgeFailed detail="${Si}" outboundOnly=${outboundOnly} wasConnected=${na}`,
      );
      if (outboundOnly) return;
      addNotification({
        key: BRIDGE_FAILED,
        kind: "warning",
        segments: [
          {
            text: `Remote Control ${na ? "disconnected" : "failed"}`,
            color: "error",
          },
          {
            text: ` \xB7 ${Si || "/remote-control"}`,
            dim: true,
          },
        ],
        priority: "immediate",
        requeueOnPreempt: true,
        invalidates: [BRIDGE_FAILED],
      });
    }
    function handleStateChange(state, detail_0) {
      if (outboundOnly) return;
      let js =
        state === BRIDGE_MALFORMED_RESPONSE_HINT ||
        state === BRIDGE_SIGNATURE_WANTED_HINT ||
        state?.includes("/login") ||
        state?.includes("/remote-control") ||
        state?.includes("restart") ||
        state?.includes("policy") ||
        state?.includes("update");
      let Ya =
        detail_0 === "auth"
          ? state?.includes("/login")
            ? ""
            : " \u2014 run /login to restore Remote Control"
          : detail_0 === "ended_elsewhere" || js
            ? ""
            : " \u2014 run /remote-control to reconnect";
      let tl = `Remote Control disconnected${state ? ` \u2014 ${state}` : ""}${Ya}`;
      transcript.replace((prev_3) => {
        let last = prev_3.at(-1);
        if (last?.type === "system" && last.subtype === "informational" && last.content === tl) return prev_3;
        return [...prev_3, createSystemMessage(tl, "warning")];
      });
    }
    function as(state, na = "terminal") {
      cl(state);
      handleStateChange(state, na);
      store((prev_4) => ({
        ...prev_4,
        replBridgeError: state,
        replBridgeErrorKind: na,
      }));
      if (na === "auth") pi();
      Gl();
    }
    function pi() {
      accessTokenRef.current = BASELINE_PENDING_SENTINEL;
      credentialsPersistedRef.current = Hi.getSnapshot().credentialsPersisted;
      let Si = ++Gn.current;
      readFreshOAuthCredentialSnapshot(storageV5, credentials)
        .catch(() => {
          return;
        })
        .then(async (prev_9) => {
          let js =
            prev_9 !== undefined
              ? {
                  accountUuid: prev_9.accountUuid,
                  organizationUuid: prev_9.organizationUuid,
                }
              : await readFreshOauthAccountFromDisk(storageV5).catch(() => {
                  return;
                });
          if (Gn.current !== Si) return;
          if (Hi.getSnapshot().credentialsPersisted !== credentialsPersistedRef.current) {
            pr.current = js;
            accessTokenRef.current = undefined;
            return;
          }
          pr.current = js;
          accessTokenRef.current = prev_9?.accessToken;
        });
    }
    if (Xo.current >= MAX_BRIDGE_INIT_FAILURES && !Qn.current) {
      logForDebugging(
        `[bridge:repl] Hook: ${Xo.current} consecutive init failures, not retrying this session`,
      );
      cl(BRIDGE_FAILED_FOOTER_TEXT);
      handleStateChange(BRIDGE_FAILED_FOOTER_TEXT, "terminal");
      store((prev) => {
        if (prev.replBridgeError === BRIDGE_FAILED_FOOTER_TEXT && !prev.replBridgeEnabled) return prev;
        return {
          ...prev,
          replBridgeError: BRIDGE_FAILED_FOOTER_TEXT,
          replBridgeErrorKind: "terminal",
          replBridgeEnabled: false,
          replBridgeSessionGroupingId: undefined,
        };
      });
      return;
    }
    if (!outboundOnly)
      setDropNotifier((Si) => {
        let { status, payloadType, requestId, windowCapped } = Si;
        if (windowCapped) {
          let ga = formatUnsignedEventWarning(Si);
          addNotification({
            key: "bridge-attestation-drop",
            kind: "warning",
            segments: [
              {
                text: "Remote Control: unsigned activity burst rejected",
                color: "error",
              },
              {
                text: " \xB7 further warnings suppressed",
                dim: true,
              },
            ],
            priority: "immediate",
          });
          transcript.replace((prev_8) => {
            let last = prev_8.at(-1);
            if (last?.type === "system" && last.subtype === "informational" && last.content === ga)
              return prev_8;
            return [...prev_8, createSystemMessage(ga, "warning")];
          });
          return;
        }
        let { what, hint } = describeUnsignedEvent(Si);
        addNotification({
          key: "bridge-attestation-drop",
          kind: "warning",
          segments: [
            {
              text: `Remote Control: unsigned ${what} rejected`,
              color: "error",
            },
            {
              text: ` \xB7 attestation: ${status}${hint ? ` \u2014 ${hint}` : ""}`,
              dim: true,
            },
          ],
          priority: "immediate",
        });
        let _d = formatUnsignedEventWarning(Si);
        transcript.replace((prev_7) => {
          let last = prev_7.at(-1);
          if (last?.type === "system" && last.subtype === "informational" && last.content === _d)
            return prev_7;
          return [...prev_7, createSystemMessage(_d, "warning")];
        });
        if (payloadType === "control_request" && requestId)
          teardownPromiseRef.current?.sendControlResponse(
            {
              type: "control_response",
              response: {
                subtype: "error",
                request_id: requestId,
                error: formatUnsignedEventNotice(Si),
              },
            },
            {
              skipStateReport: true,
            },
          );
      });
    let qa = false;
    let pd = storeSelector.length;
    let $l = false;
    let sessionId = getSessionId();
    if (No.current.sid !== undefined && No.current.sid !== sessionId)
      No.current = {
        sid: undefined,
        rows: new Set(),
        tip: undefined,
      };
    mainLoopModelRef.current = sessionId;
    let transcriptPath = getTranscriptPath();
    let Ll = {
      sid: sessionId,
    };
    kn.current = Ll;
    let _c = sessionId;
    let mc = null;
    let Vd = () => (sessionId === getSessionId() ? (getMaterializedSessionFile() ?? transcriptPath) : mc);
    if (sessionIdRef.current !== undefined && sessionIdRef.current !== sessionId)
      Zr({
        archiveAbandoned: true,
      });
    let cd =
      (headRef.current !== undefined && storeSelector[0]?.uuid !== headRef.current) ||
      (eligibleRef.current !== undefined &&
        storeSelector[eligibleRef.current.index]?.uuid !== eligibleRef.current.uuid);
    if (cd) clearBridgeSessionCache();
    let Ka = !cd && Kn.current !== undefined ? Math.min(Kn.current, storeSelector.length) : undefined;
    let pl = false;
    function Gl() {
      let head = Ro.current.head;
      let eligible = Ro.current.eligible;
      messagesRef.current = clock.setTimeout(() => {
        if (qa) return;
        messagesRef.current = undefined;
        let js = teardownPromiseRef.current;
        if (js) {
          bridgeSessionIdRef.current = js.bridgeSessionId;
          lastSequenceNumRef.current = js.getLastSequenceNum();
          _o.current = on.current ? sessionId : undefined;
          mr.current = supportedKinds.size > 0 ? new Set(supportedKinds) : undefined;
          Kn.current = bo.current;
          headRef.current = head;
          eligibleRef.current = eligible;
          sessionIdRef.current = sessionId;
          Ur.current = dr.current;
          Un.current?.unregister();
          let Ya = Ur.current;
          let tl = async () => {
            if (Ya?.accountUuid === undefined) return;
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
          Un.current = js.archive
            ? {
                fire: tl,
                unregister: registerCleanup(tl),
              }
            : undefined;
        }
        store((prev_6) => {
          if (!prev_6.replBridgeError) return prev_6;
          pl = true;
          logEvent("tengu_bridge_repl_auto_disabled", {
            had_session: js !== null,
          });
          return {
            ...prev_6,
            replBridgeEnabled: false,
            replBridgeSessionGroupingId: undefined,
            ...(js && {
              replBridgeSkipNextArchive: true,
            }),
          };
        });
      }, BRIDGE_FLUSH_TIMEOUT_MS);
    }
    let pendingPermissionHandlers = new Map();
    let pendingHandlers = new Map();
    let supportedKinds = new Set();
    if (!cd && bridgeSessionIdRef.current !== undefined)
      for (let Si of mr.current ?? []) supportedKinds.add(Si);
    function handlePermissionResponse(msg_0) {
      let na = Vd();
      if (na === null) return;
      saveBridgeSession(
        sessionId,
        msg_0.bridgeSessionId,
        msg_0.getLastSequenceNum(),
        na,
        [...supportedKinds],
        msg_0.sessionGroupingId,
        on.current,
        Ir.current,
        undefined,
        storageV5,
      );
    }
    Ho.current = false;
    Io.current = false;
    let Kd = replBridgeEvents.of(session).subscribe((Si, na) => {
      if (qa) return;
      if (na && !Ho.current) return;
      if (Ho.current) {
        Io.current = true;
        return;
      }
      Io.current = false;
      Wo.current = false;
    });
    let ec = onSessionSwitch((Si, na) => {
      if (qa) return;
      let js = _c;
      _c = Si;
      if (js !== _c && js === sessionId) mc = getMaterializedSessionFile();
      if (na !== "clear") {
        switch (na) {
          case "resume":
          case "spare_claim":
            Ho.current = Si !== sessionId;
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
      Ho.current = false;
      Io.current = false;
      Wo.current = false;
      try {
        if (!outboundOnly) {
          let tl = js === sessionId ? getMaterializedSessionFile() : mc;
          if (tl !== null) {
            let ol = Ir.current;
            let oauthAccountInfo = getOauthAccountInfo();
            let _d = !ol?.accountUuid || sameOwnerAccount(oauthAccountInfo, ol);
            let ga = !_d && !oauthAccountInfo?.accountUuid;
            if (!on.current && _d)
              clearBridgeSession(
                sessionId,
                tl,
                {
                  targetExists: true,
                },
                storageV5,
              );
            if (!on.current && (_d || ga))
              wr.current.push({
                sessionId,
                path: tl,
              });
          }
        }
        mc = null;
        sessionId = getSessionId();
        mainLoopModelRef.current = sessionId;
        transcriptPath = getTranscriptPath();
        bo.current = 0;
        $l = true;
        let Ya = teardownPromiseRef.current;
        if (Ya && !outboundOnly)
          restoreSessionMetadata({
            bridgeSessionId: Ya.bridgeSessionId,
            bridgeLastSeq: Ya.getLastSequenceNum(),
            bridgeDialogKinds: [...supportedKinds],
            bridgeSessionGroupingId: Ya.sessionGroupingId,
            bridgeNoHistoryBackfill: on.current || undefined,
            bridgeOwnerAccountUuid: Ir.current?.accountUuid,
            bridgeOwnerOrganizationUuid: Ir.current?.organizationUuid,
          });
      } catch (error) {
        logForDebugging(`[bridge:repl] /clear repoint failed: ${errorMessage(error)}`, {
          level: "error",
        });
        logError(error);
      }
    });
    function qu(Si) {
      let requestId = Si.response?.request_id;
      if (!requestId) return false;
      let handler = pendingHandlers.get(requestId);
      if (handler) {
        let inner = Si.response;
        if (inner.subtype !== "success" || !inner.response || !isDialogResponse(inner.response)) {
          logForDebugging(
            `[bridge:repl] Ignoring non-dialog-shaped control_response for pending dialog request_id=${requestId}`,
            {
              level: "verbose",
            },
          );
          return false;
        }
        pendingHandlers.delete(requestId);
        handler.handler(inner.response);
        return true;
      }
      let Ya = pendingPermissionHandlers.get(requestId);
      if (!Ya) {
        logForDebugging(
          `[bridge:repl] No handler for control_response request_id=${requestId} (late response after local resolve, stale reattach dialog, or unknown id)`,
          {
            level: "verbose",
          },
        );
        return false;
      }
      let response = Si.response;
      if (response.subtype === "success" && response.response) {
        let bridgePermissionResponse = parseBridgePermissionResponse(response.response);
        if (!bridgePermissionResponse) return false;
        if (isValidBridgeToolName(bridgePermissionResponse.toolName, Ya.toolName, requestId)) return false;
        pendingPermissionHandlers.delete(requestId);
        Ya.handler(bridgePermissionResponse);
        return true;
      }
      pendingPermissionHandlers.delete(requestId);
      return true;
    }
    let Ku = false;
    let iu = null;
    let onBridgeInjectedMcp = undefined;
    let Am;
    function handleStateChange_2(state, detail, js) {
      logForDebugging(
        `[bridge:repl] handleStateChange state=${state} detail="${detail}" kind=${js} cancelled=${qa} outboundOnly=${outboundOnly}`,
      );
      if (qa) return;
      if (state === "policy_disabled") {
        Am = detail ?? "disabled by your organization's policy";
        return;
      }
      if (outboundOnly) {
        logForDebugging(`[bridge:repl] Mirror state=${state}${detail ? ` detail=${detail}` : ""}`);
        if (state === "failed")
          store((prev) => {
            if (!prev.replBridgeConnected) return prev;
            return {
              ...prev,
              replBridgeConnected: false,
            };
          });
        else if (state === "ready" || state === "connected") {
          if (state === "connected" && teardownPromiseRef.current && !store_2.getState().replBridgeConnected)
            logBridgeRateLimitForward(teardownPromiseRef.current);
          store((prev) => {
            if (prev.replBridgeConnected) return prev;
            return {
              ...prev,
              replBridgeConnected: true,
            };
          });
        }
        return;
      }
      let Ya = teardownPromiseRef.current;
      switch (state) {
        case "ready":
          removeNotification(BRIDGE_FAILED);
          dr.current = Ir.current;
          store((prev) => {
            let sessionUrl = Ya
              ? getRemoteSessionUrl(Ya.bridgeSessionId, Ya.sessionIngressUrl)
              : prev.replBridgeSessionUrl;
            let envId = Ya?.environmentId;
            let sessionId = Ya?.bridgeSessionId;
            if (
              prev.replBridgeConnected &&
              !prev.replBridgeSessionActive &&
              !prev.replBridgeReconnecting &&
              prev.replBridgeSessionUrl === sessionUrl &&
              prev.replBridgeEnvironmentId === envId &&
              prev.replBridgeSessionId === sessionId
            )
              return prev;
            return {
              ...prev,
              replBridgeConnected: true,
              replBridgeSessionActive: false,
              replBridgeReconnecting: false,
              replBridgeSessionUrl: sessionUrl,
              replBridgeEnvironmentId: envId,
              replBridgeSessionId: sessionId,
              replBridgeError: undefined,
              replBridgeErrorKind: undefined,
            };
          });
          break;
        case "connected": {
          removeNotification(BRIDGE_FAILED);
          let state = store_2.getState();
          if (Ya && !state.replBridgeConnected) logBridgeRateLimitForward(Ya);
          store((prev) => {
            if (prev.replBridgeSessionActive) return prev;
            return {
              ...prev,
              replBridgeConnected: true,
              replBridgeSessionActive: true,
              replBridgeReconnecting: false,
              replBridgeError: undefined,
              replBridgeErrorKind: undefined,
            };
          });
          fs({
            seedPermissionMode: true,
          });
          if (Ya && !Dn.current && !cn.current) {
            let kairosReadyNudgeConfig = getKairosReadyNudgeConfig();
            if (kairosReadyNudgeConfig && canSendReadyPush(kairosReadyNudgeConfig, replBridgeExplicit, za)) {
              Dn.current = true;
              if (
                kairosReadyNudgeConfig.probability >= 1 ||
                Math.random() < kairosReadyNudgeConfig.probability
              ) {
                Ya.writeSdkMessages([
                  buildSyntheticPushNotificationToolUse(RC_READY_PUSH_TEXT, getSessionId()),
                ]);
                recordReadyPushSent(kairosReadyNudgeConfig, storageV5);
              }
            }
          }
          break;
        }
        case "reconnecting":
          store((prev) => {
            if (prev.replBridgeReconnecting) return prev;
            return {
              ...prev,
              replBridgeReconnecting: true,
              replBridgeSessionActive: false,
            };
          });
          break;
        case "failed": {
          messagesRef.current?.();
          cl(detail, Ya !== null);
          let tl = js ?? (nl ? "auth" : "terminal");
          store((prev) => ({
            ...prev,
            replBridgeError: detail,
            replBridgeErrorKind: tl,
            replBridgeReconnecting: false,
            replBridgeSessionActive: false,
            replBridgeConnected: false,
          }));
          if (tl === "auth") pi();
          handleStateChange(detail, tl);
          Gl();
          break;
        }
      }
    }
    let nl = Qn.current;
    Qn.current = false;
    let ss = ur.current;
    ur.current = undefined;
    let Gs = sessionId;
    let materializedSessionFile = getMaterializedSessionFile();
    let $a = materializedSessionFile !== null && !isOwnTranscriptFile(Gs, materializedSessionFile);
    let xl = $a ? undefined : (materializedSessionFile ?? transcriptPath);
    (async () => {
      try {
        if (lastWrittenIndexRef.current) {
          logForDebugging("[bridge:repl] Hook: waiting for previous teardown to complete before re-init");
          await lastWrittenIndexRef.current;
          lastWrittenIndexRef.current = undefined;
          logForDebugging("[bridge:repl] Hook: previous teardown complete, proceeding with re-init");
        }
        if (qa) return;
        let { initReplBridge, REPL_WORKSPACE_DIFF_COMPUTE_BUDGET } = await import("./chunk-cg2r2hy6.js");
        let js = false;
        let Ya = false;
        let tl;
        if (bridgeSessionIdRef.current !== undefined) {
          let Pi = Ur.current;
          let fa = await readFreshOAuthCredentialSnapshot(storageV5, credentials).catch(() => {
            return;
          });
          if (fa?.accountUuid)
            tl = {
              accountUuid: fa.accountUuid,
              organizationUuid: fa.organizationUuid,
            };
          if (qa) return;
          Ya = !Pi?.accountUuid;
          let sa = Boolean(Pi?.accountUuid) && !fa?.accountUuid;
          let td = Boolean(Pi?.accountUuid) && Boolean(fa?.accountUuid) && !sameOwnerAccount(fa, Pi);
          if (td || sa) {
            if (nl) {
              logForDebugging(
                "[bridge:repl] Auto-revive aborted: stash owner vs current account mismatch/unreadable at init",
              );
              Un.current?.unregister();
              Un.current = undefined;
              pl = true;
              store((prev_10) => ({
                ...prev_10,
                replBridgeEnabled: false,
                replBridgeError: BRIDGE_ACCOUNT_UNVERIFIED_HINT,
                replBridgeErrorKind: "terminal",
              }));
              return;
            }
            logForDebugging(
              td
                ? "[bridge:repl] Reattach stash owner differs from current credential account \u2014 dropping stash, minting fresh (history not uploaded)"
                : "[bridge:repl] Current account identity unreadable with an owned stash \u2014 dropping stash, minting fresh (history not uploaded)",
            );
            js = true;
            Un.current?.unregister();
            Un.current = undefined;
            holdPrecautionarySuppressionFor(pinSessionId(Gs));
            markPrecautionClearResilientFor(pinSessionId(Gs));
            claimPrecautionHoldForObservedCause(pinSessionId(Gs));
            if (td && !$a) logFeatureOk("rc_cross_account_suppression");
            else
              logFeatureSad("rc_cross_account_suppression", $a ? "torn_entry_pair" : "identity_unreadable");
            if (td && !$a)
              await writeHistorySuppression(Gs, xl, "chokepoint_veto", fa?.accountUuid, storageV5);
            else if (td)
              logForDebugging(
                "[bridge:repl] Chokepoint veto under a TORN entry pair: precautionary suppression only, no permanent taint write",
                {
                  level: "warn",
                },
              );
            Zr({
              archiveAbandoned: false,
            });
            supportedKinds.clear();
            if (getSessionId() === Gs) clearBridgeSessionCache();
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
        let _d = Ya && cd;
        let ga = cd ? undefined : bridgeSessionIdRef.current;
        let du;
        let apply = (Pi, fa) => {
          let sa;
          if (fa != null) {
            let thinkingDisplayOverride = getThinkingDisplayOverride(thinkingDisplayFlag);
            if (thinkingDisplayOverride !== undefined && thinkingDisplayOverride.display !== fa) {
              let Ad = Pi === undefined ? "budget unchanged" : "budget applied";
              logForDebugging(
                `[bridge:repl] set_max_thinking_tokens: thinking_display=${fa} not applied (local ${thinkingDisplayOverride.source} chose ${thinkingDisplayOverride.display}); ${Ad}`,
              );
              sa = {
                ok: false,
                error: `set_max_thinking_tokens: ${Ad}; thinking_display not applied, the display stays ${thinkingDisplayOverride.display} because the terminal user set it with ${thinkingDisplayOverride.source === "flag" ? "--thinking-display" : "the showThinkingSummaries setting"}`,
              };
            }
          }
          let td;
          if (Pi !== undefined) {
            let Pl = thinkingConfigFor(Pi, undefined, spawnThinkingConfig);
            td = Pl ? Pl.type !== "disabled" : isBetaHeaderAllowed();
          }
          store((prev_11) => {
            let enabled = td ?? prev_11.thinkingEnabled;
            let od =
              fa === undefined || sa !== undefined ? prev_11.thinkingDisplayOverride : (fa ?? undefined);
            if (prev_11.thinkingEnabled === enabled && prev_11.thinkingDisplayOverride === od) return prev_11;
            return {
              ...prev_11,
              thinkingEnabled: enabled,
              thinkingDisplayOverride: od,
            };
          });
          return sa;
        };
        let context = makeBridgeControlContext({
          session,
          engineStore: toSliceStore(store_2),
          transcript,
          storageV5,
          credentials,
          thinkingBudget: {
            current: () =>
              store_2.getState().thinkingEnabled === false
                ? {
                    type: "disabled",
                  }
                : spawnThinkingConfig,
            apply,
          },
          mainLoopModel: $r,
          getContextUsageInputs: ke,
        });
        let bridge = await initReplBridge({
          outboundOnly,
          ...false,
          suppressHistoryBackfill: js || ol || _d,
          onHistoryBackfillSuppressed: (Pi) => {
            if (qa) return;
            if (Pi?.uncertaintyOnly) return;
            on.current = true;
            _o.current = Gs;
          },
          reattachOrFail: (nl && bridgeSessionIdRef.current !== undefined) || Ya,
          reviveInitiated: nl,
          onReattachPointerDead: () => {
            Zr({
              archiveAbandoned: false,
            });
            _o.current = on.current ? Gs : undefined;
            if (isBgSession()) clearBridgeSessionFromJobState(storageV5);
          },
          localHolderGuard:
            !replBridgeExplicit || nl
              ? {
                  mode: "decline",
                  onDeclined: (Pi) => {
                    du = Pi;
                  },
                }
              : {
                  mode: "observe",
                },
          expectedAccount: nl ? ss : undefined,
          onAuthProven: () => {
            Pr.current = 0;
          },
          reattachSessionId: ga,
          reattachSequenceNum: cd ? undefined : lastSequenceNumRef.current,
          tags: outboundOnly
            ? [CCR_MIRROR]
            : [replBridgeExplicit ? REMOTE_CONTROL_REPL : REMOTE_CONTROL_AUTO],
          getToolPermissionContext: () => store_2.getState().toolPermissionContext,
          host: session.host,
          workspaceDiffComputeBudget: REPL_WORKSPACE_DIFF_COMPUTE_BUDGET,
          getTools: () => ke().tools,
          onQueuedNotification: (Pi) =>
            acceptQueuedNotification(Pi, {
              getAppState: () => store_2.getState(),
              setAppState: store,
              session,
            }),
          onInboundMessage: (prev_12) => {
            {
              let { noteOwnerInboxNoticeDelivery } = require("./chunk-dm6d31md.js");
              noteOwnerInboxNoticeDelivery(session, prev_12);
            }
            return handleBridgeInbound(
              queue,
              prev_12,
              (fa, sa, td) => Yr(fa, sa, td),
              undefined,
              () => {
                let next = cancelPendingDialogs(
                  pendingHandlers,
                  (currentQueue) => teardownPromiseRef.current?.sendControlCancelRequest(currentQueue),
                  REFUSAL_FALLBACK_DIALOG.kind,
                );
                for (let sa of next)
                  logEvent("tengu_request_user_dialog_implicit_cancel", {
                    dialog_kind: shortHash(sa),
                    reason: fromEnum("new_user_message"),
                    lane: lit_2("repl_bridge"),
                  });
              },
              () => switchSerializerSlot.of(session).tail,
              storageV5,
              credentials,
            );
          },
          onPermissionResponse: qu,
          getInitializeState() {
            return {
              current_model: $r(),
              current_permission_mode: toExternalPermissionMode(
                store_2.getState().toolPermissionContext.mode,
              ),
            };
          },
          getCommands: () => logBridgeInitializeCommands(fr()),
          onClientInitialize: outboundOnly
            ? undefined
            : () =>
                fs({
                  seedPermissionMode: true,
                }),
          onDialogKindsDeclared: outboundOnly
            ? undefined
            : (Pi, fa) => {
                logBridgeDialogKindsDeclared(supportedKinds, Pi, fa, () => {
                  let sa = teardownPromiseRef.current;
                  if (sa) handlePermissionResponse(sa);
                });
              },
          isTurnLive,
          onInterrupt() {
            syncLoopTickState();
            logForDebugging("[bridge:repl] Remote interrupt \u2192 turn.cancel()");
            handleRef();
          },
          onCancelAsyncMessage: (item) => withdrawBridgeInboundMessage(queue, item),
          onForkConversation: outboundOnly
            ? undefined
            : dedupeByRequestId((Pi, fa) =>
                handleRcForkConversation(Pi, fa, {
                  getMessages: transcript.getSnapshot,
                  isTurnActive,
                  queuedCommandCount: queue.getDrainableMainThreadQueueLength,
                  ownBridgeSessionId: () => teardownPromiseRef.current?.bridgeSessionId,
                  ownSessionGroupingId: () => teardownPromiseRef.current?.sessionGroupingId,
                  getLaunchState: store_2.getState,
                  recordChildBridgeSession: (sa, bridgeSessionId, groupingId) =>
                    persistBridgeSessionToJobState(
                      getJobDir(sa),
                      bridgeSessionId,
                      false,
                      groupingId,
                      undefined,
                      false,
                      storageV5,
                    ),
                  credentials,
                  storageV5,
                  getTools: () => ke().tools,
                  host: session.host,
                }),
              ),
          onSetModel(Pi) {
            let fa = Pi == null || Pi.trim().toLowerCase() === "default";
            let sa = fa ? getDefaultMainLoopModel() : Pi;
            let td = fa ? managedDenyStartupRefusal(sa, "switch") : null;
            if (td !== null)
              return {
                ok: false,
                error: td,
              };
            if (!fa) {
              let zi = logUnrecognizedModelSwitch(sa, lit_2("bridge_repl"));
              if (zi) return zi;
            }
            let Pl = (prev_13) => (fa ? null : prev_13);
            let Ad =
              !fa &&
              !isExemptDefaultResolvingPick(sa) &&
              !(isModelAllowedUnderActiveEnforcement(sa) ?? isModelAllowed(sa));
            let od = Ad ? stepDownRestrictedFamilyAliasPick(sa) : null;
            let setAppState = od ?? sa;
            if (Ad && od === null) {
              let state = store_2.getState();
              let rd = formatModelRestrictedNotice(
                setAppState,
                parseUserSpecifiedModel(
                  resolveMainLoopModel(state.mainLoopModelForSession, state.mainLoopModel),
                ),
              );
              addNotification({
                key: `model-restricted-bridge-${displayModelName_2(setAppState)}`,
                kind: "warning",
                text: rd,
                priority: "immediate",
              });
              logFeatureBad("model_switch", "not_allowed");
              return {
                ok: false,
                error: rd,
              };
            }
            let vp = () => {
              if (od !== null)
                addNotification({
                  key: `model-restricted-bridge-${displayModelName_2(sa)}`,
                  kind: "warning",
                  text: formatModelRestrictedNotice(sa, od),
                  priority: "immediate",
                });
              if (od !== null) logFeatureSad("model_switch", "family_alias_stepped_down");
              else logFeatureOk("model_switch");
              if (isFastModeEnabled()) clearFastModeCooldown();
              setMainLoopModelOverride(setAppState);
              let enable;
              let getAppState;
              store((prev_14) => {
                enable = !!prev_14.fastMode;
                let zd = isFastModeEnabled()
                  ? isFastModeActive(setAppState, prev_14.fastMode)
                  : !!prev_14.fastMode;
                getAppState = zd;
                if (prev_14.mainLoopModelForSession === setAppState && zd === !!prev_14.fastMode)
                  return prev_14;
                return {
                  ...prev_14,
                  mainLoopModelForSession: setAppState,
                  ...(zd !== !!prev_14.fastMode && {
                    fastMode: zd,
                  }),
                };
              });
              if (enable !== undefined && getAppState !== undefined) {
                reportFastModeToggle(enable, getAppState);
                let Qd = handleFastModeShortcut(enable, getAppState, setAppState);
                if (Qd !== null)
                  addNotification({
                    key: "model-switch-fast-mode",
                    kind: "feedback",
                    text: Qd,
                    priority: "immediate",
                    timeoutMs: 3000,
                  });
              }
            };
            let state = store_2.getState();
            if (!hasPreModelSwitchHook(session) && switchSerializerSlot.of(session).pending === 0) {
              recordSwitchIfChanged(session, state, Pl(setAppState), "sdk");
              vp();
              return;
            }
            return serializeModelSwitch(session, () =>
              runPreModelSwitchHooks(session, store_2.getState, Pl(setAppState), "sdk")
                .then((prev_15) => {
                  if (prev_15.decision !== "proceed") {
                    logFeatureSad("model_switch", "blocked_by_hook");
                    let rd = describeModelSwitchBlocked(prev_15);
                    addNotification({
                      key: "model-switch-blocked",
                      kind: "warning",
                      text: rd,
                      color: "warning",
                      priority: "immediate",
                    });
                    return {
                      ok: false,
                      error: rd,
                    };
                  }
                  if (prev_15.messages.length > 0)
                    addNotification({
                      key: "model-switch-hook-note",
                      kind: "feedback",
                      text: prev_15.messages.map(sanitizeHookText).join(" \xB7 "),
                      priority: "immediate",
                    });
                  recordSwitchIfChanged(session, store_2.getState(), Pl(setAppState), "sdk");
                  vp();
                  return {
                    ok: true,
                    notices: prev_15.messages.map(sanitizeHookText),
                  };
                })
                .catch((error) => {
                  logError(toError(error));
                  return {
                    ok: false,
                    error: "Model switch failed",
                  };
                }),
            );
          },
          onSetPermissionMode: (requestedMode) =>
            applyBridgePermissionModeChange(requestedMode, store_2, store),
          onApplyFlagSettings: (Pi, fa) => {
            let mainLoopModel = getMainLoopModel();
            let effortLevelOrNull = resolveEffortLevelOrNull(
              mainLoopModel,
              resolveEffortLevel(store_2.getState()),
            );
            let Pl = applyBridgeFlagSettings(Pi, {
              model: mainLoopModel,
              getAppState: store_2.getState,
              setAppState: store,
            });
            if (!Pl.ok) return Pl;
            reportBridgeEffortForRequest(fa);
            if (
              resolveEffortLevelOrNull(mainLoopModel, resolveEffortLevel(store_2.getState())) ===
              effortLevelOrNull
            )
              fs();
            return {
              ok: true,
            };
          },
          async onMcpAuthenticate(Pi, redirectUri) {
            let config = store_2.getState().mcp.clients.find((prev_16) => prev_16.name === Pi)?.config;
            if (!config)
              throw new WireSafeControlError(`MCP server "${normalizeServerNameShort(Pi)}" not found`);
            let Pl = () => {
              assertToggleableServer(store_2.getState().mcp.clients, Pi);
              let isDisabledHandle = getIsDisabledHandle();
              if (!isDisabledHandle)
                throw new WireSafeControlError(
                  "MCP controls aren't available right now \u2014 the terminal is still starting up or is showing another view",
                );
              if (isDisabledHandle(Pi))
                throw new WireSafeControlError(
                  disabledElsewhereText(Pi),
                  "MCP server disabled in another session; auth refused",
                );
              let rd = getDialBlockCauseHandle()?.(Pi, config);
              if (rd === "project-approval")
                throw new WireSafeControlError(
                  mcpRefusalText(Pi, rd, config),
                  "MCP server not approved for this project; auth refused",
                );
              if (rd && judgeGate(Pi, config))
                throw new WireSafeControlError(
                  reservedAddressRefusalText(Pi),
                  "MCP server refused at a reserved address; auth refused",
                );
              if (rd)
                throw new WireSafeControlError(
                  mcpRefusalText(Pi, rd, config),
                  "MCP server blocked by managed policy; auth refused",
                );
            };
            Pl();
            Bo.current.delete(Pi);
            let url = classifyMcpAuthTarget(Pi, config);
            if (url.kind === "claudeai-proxy") {
              let zi = claudeAiConnectorAuthUrl(url.config);
              if (!zi)
                throw new WireSafeControlError(
                  "Unable to build claude.ai connector auth URL (missing org or server id)",
                );
              logEvent("tengu_claudeai_mcp_auth_started", {});
              return {
                authUrl: zi,
                requiresUserAction: true,
                callbackExpected: false,
              };
            }
            if (url.kind === "unsupported-transport")
              throw new WireSafeControlError(
                `Server type "${url.transport}" does not support OAuth authentication`,
              );
            if (url.kind === "anthropic-hosted")
              throw new WireSafeControlError(normalizeMcpServerName(url.message, 1024, "none"));
            let od = (redirectUri) => {
              let rd;
              let promise = new Promise((resolve) => {
                rd = resolve;
              });
              let callbackPort;
              let state;
              let xc = getMcpAuthModule().performMCPOAuthFlow(Pi, url.config, (Yc) => rd(Yc), undefined, {
                skipBrowserOpen: true,
                redirectUri,
                onWaitingForCallback: (Yc, tc, Cp) => {
                  callbackPort = tc;
                  state = Cp;
                },
              });
              getMcpAuthModule().setActiveOAuthPromise(Pi, xc);
              xc.then(
                () => Bo.current.set(Pi, Date.now()),
                () => {},
              );
              return Promise.race([
                promise.then((authUrl) => ({
                  authUrl,
                  callbackPort,
                  state,
                })),
                xc.then(() => null),
              ]);
            };
            let md = null;
            let vp = "localhost";
            let sg =
              Boolean(redirectUri) &&
              !url.config.oauth?.clientId &&
              !(await shouldSkipCustomRedirect(Pi, url.config));
            Pl();
            if (sg)
              try {
                md = await od(redirectUri);
                vp = "custom";
              } catch (error) {
                logForDebugging(
                  `[bridge:mcp] AS rejected custom redirectUri for ${Pi}; falling back to localhost: ${sanitizeErrorDetail(redactMcpErrorDetail(Pi, url.config, errorMessage(error)))}`,
                );
                Pl();
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
            if (!md)
              return {
                requiresUserAction: false,
                callbackExpected: false,
              };
            return {
              authUrl: md.authUrl,
              requiresUserAction: true,
              callbackExpected: true,
              redirectScheme: vp,
              state: md.state,
              ...(vp === "localhost" && {
                callbackPort: md.callbackPort,
              }),
            };
          },
          async onMcpOauthCallbackUrl(Pi, fa) {
            let oAuthCallbackSubmitter = getMcpAuthModule().getOAuthCallbackSubmitter(Pi);
            if (!oAuthCallbackSubmitter)
              throw new WireSafeControlError(
                `No OAuth flow in progress for "${normalizeServerNameShort(Pi)}" \u2014 call mcp_authenticate first`,
              );
            if (!oAuthCallbackSubmitter(fa))
              throw new WireSafeControlError(
                "Invalid callback URL \u2014 no authorization code, or it belongs to a different sign-in attempt (state mismatch). The flow is still open; retry with the full redirect URL from this sign-in.",
              );
            let activeOAuthPromise = getMcpAuthModule().getActiveOAuthPromise(Pi);
            if (activeOAuthPromise)
              try {
                await activeOAuthPromise;
              } catch (error) {
                let config = store_2.getState().mcp.clients.find((client) => client.name === Pi)?.config;
                throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  `MCP OAuth failed for ${Pi}: ${config ? normalizeMcpServerName(redactMcpErrorDetail(Pi, config, errorMessage(error))) : "[error detail unavailable: server configuration could not be located]"}`,
                  "MCP OAuth completion failed (detail clamped in the local log)",
                );
              }
          },
          async onMcpReconnect(Pi) {
            let reconnectHandle = getReconnectHandle();
            if (!reconnectHandle)
              throw new WireSafeControlError(
                "MCP controls aren't available right now \u2014 the terminal is still starting up or is showing another view",
              );
            assertToggleableServer(store_2.getState().mcp.clients, Pi);
            let sa = await reconnectHandle(Pi, {
              discardDiscovery: !takeRecentWithin(Bo.current, Pi),
            });
            assertMcpReconnected(sa.client);
          },
          answerSharedControlRequest: (request) => dispatchLocalControlRequest(request, context),
          onSetColor(agentColor) {
            let fa = agentColor === "default";
            if (!fa && !AGENT_COLOR_NAMES.includes(agentColor))
              return {
                ok: false,
                error: `Unknown color "${agentColor}". Available: ${AGENT_COLOR_NAMES.join(", ")}, default`,
              };
            let sa = fa ? undefined : agentColor;
            let sessionId = getSessionId();
            saveAgentColor(
              sessionId,
              agentColor,
              getMaterializedSessionFile() ?? getTranscriptPath(),
              storageV5,
            ).catch((prev_17) => {
              logForDebugging(`saveAgentColor: transcript append failed: ${errorMessage(prev_17)}`);
            });
            let state = store_2.getState();
            let Ad = state.agent
              ? state.agentDefinitions.activeAgents.find((prev_18) => prev_18.agentType === state.agent)
              : undefined;
            syncJobColor(
              getOwnJobShortId(),
              getEffectiveAgentColor({
                userOverride: sa,
                agentDefinitionColor: Ad?.color,
              }),
              storageV5,
            );
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
            });
            return {
              ok: true,
            };
          },
          onStateChange: handleStateChange_2,
          onBridgeInjectedMcp,
          initialMessages:
            js || _d
              ? undefined
              : Ka !== undefined
                ? storeSelector.slice(0, Ka)
                : storeSelector.length > 0
                  ? storeSelector
                  : undefined,
          getMessages: transcript.getSnapshot,
          remoteControlOrigin,
          getBackfillMessages: (Pi) => {
            if (Ho.current || Wo.current || Io.current) return;
            return transcript
              .getSnapshot()
              .filter(
                (fa) =>
                  mn.current.get(fa.uuid)?.has(Pi) !== true &&
                  !(isCompactBoundaryOrSummary(fa) && (Go() || isCompactPairWithheldFromRemote())),
              );
          },
          isTurnActive,
          initialName: replBridgeInitialName,
          sessionGroupingId: replBridgeSessionGroupingId,
          enableSessionPersistence:
            outboundOnly || isPersistentRemoteSessionEnabled() || isRemoteControlInternalEventsEnabled(),
          storageV5,
          credentials,
          onTransportRebuilt: forwardRateLimitToBridge,
        });
        if (kn.current === Ll) {
          kn.current = undefined;
          if (!bridge) Fn(bn(Ll.sid));
        }
        if (qa) {
          logForDebugging("[bridge:repl] Hook: init cancelled during flight, tearing down");
          if (bridge) bridge.teardown();
          return;
        }
        if (!bridge && du) {
          logForDebugging(
            `[bridge:repl] Init declined: session held by local pid ${du.pid}; leaving Remote Control off`,
          );
          if (!outboundOnly) {
            let Pi = bridgeStatusLines(du, {
              crossSessionMessaging: isCrossSessionMessagingEnabled(),
            });
            transcript.replace((fa) => {
              let last = fa.at(-1);
              if (
                last?.type === "system" &&
                last.subtype === "informational" &&
                typeof last.content === "string" &&
                last.content.startsWith(REMOTE_CONTROL_NOT_STARTED_TEXT)
              )
                return fa;
              return [...fa, createSystemMessage(Pi, "warning")];
            });
          }
          store((Pi) =>
            Pi.replBridgeEnabled || Pi.replBridgeAutoOnByDefault
              ? {
                  ...Pi,
                  replBridgeEnabled: false,
                  replBridgeSessionGroupingId: undefined,
                  replBridgeAutoOnByDefault: false,
                }
              : Pi,
          );
          return;
        }
        if (!bridge && Am !== undefined) {
          let Pi = Am;
          logForDebugging("[bridge:repl] Init declined by org policy; leaving Remote Control off");
          if (!outboundOnly)
            transcript.replace((fa) =>
              fa.some((sa) => sa.type === "system" && sa.subtype === "informational" && sa.content === Pi)
                ? fa
                : [...fa, createSystemMessage(Pi, "notice")],
            );
          store((fa) =>
            fa.replBridgeEnabled || fa.replBridgeAutoOnByDefault
              ? {
                  ...fa,
                  replBridgeEnabled: false,
                  replBridgeSessionGroupingId: undefined,
                  replBridgeAutoOnByDefault: false,
                }
              : fa,
          );
          return;
        }
        if (!bridge) {
          if (!nl) Xo.current++;
          reportConcurrentBridgeSessions(outboundOnly);
          logForDebugging(
            `[bridge:repl] Init returned null (precondition or session creation failed); consecutive failures: ${Xo.current}`,
          );
          messagesRef.current?.();
          if (store_2.getState().replBridgeError !== undefined) Gl();
          else if (replBridgeExplicit && !outboundOnly && isBridgeEnabled()) as(BRIDGE_LOGIN_HINT, "auth");
          else
            store((Pi) =>
              Pi.replBridgeEnabled
                ? {
                    ...Pi,
                    replBridgeEnabled: false,
                    replBridgeSessionGroupingId: undefined,
                  }
                : Pi,
            );
          return;
        }
        teardownPromiseRef.current = bridge;
        setReplBridgeHandle(bridge, storageV5);
        setCurrentForKey(session, undefined);
        registerLiveSuppressionProbe(() => getReplBridgeHandle()?.noHistoryBackfill === true);
        dr.current = Ir.current;
        reportBridgePermissionMode(store_2.getState().toolPermissionContext.mode);
        noopRenameNotify("bridge_connected", credentials);
        let mainLoopModel = getMainLoopModel();
        reportBridgeModel(mainLoopModel);
        reportEffortForModel(mainLoopModel, store_2.getState());
        buildBridgeInitializeCommands(() => ({
          messages: transcript.getSnapshot(),
          model: mainLoopModel,
          autoCompactWindow: store_2.getState().autoCompactWindow,
          resetBoundary: getCurrentForKey(session),
        }));
        persistBridgeArtifactFrames(store_2.getState().frameUrls);
        installRemoteEgressSuppressor();
        setInboundAvailabilityPublisher(reportBridgeCrossSessionInbound);
        emitBackgroundTasksChanged(store_2.getState());
        logBridgeRateLimitForward(bridge);
        detectCurrentRepositoryWithHost();
        Xo.current = 0;
        if (!outboundOnly) removeNotification(BRIDGE_FAILED);
        if (
          Zr({
            archiveAbandoned: cd,
          })
        )
          logEvent("tengu_bridge_compacted_while_disabled_remint", {});
        let Yd = ga !== undefined && bridge.bridgeSessionId === ga;
        bo.current = $l ? 0 : Yd ? (Ka ?? pd) : pd;
        Fn(bridge.bridgeSessionId);
        if (!$l) {
          No.current.sid = sessionId;
          for (let Pi of storeSelector)
            if (!mn.current.get(Pi.uuid)?.has(bridge.bridgeSessionId)) {
              No.current.rows.add(Pi.uuid);
              No.current.tip = Pi.uuid;
            }
        }
        Ao.current = new Set(storeSelector.slice(0, bo.current).map((Pi) => Pi.uuid));
        Ro.current =
          bo.current > 0
            ? {
                head: storeSelector[0]?.uuid,
              }
            : {};
        Wo.current = false;
        if (isBgSession())
          persistBridgeSessionToJobState(
            process.env.CLAUDE_JOB_DIR,
            bridge.bridgeSessionId,
            outboundOnly,
            bridge.sessionGroupingId,
            ed && {
              accountUuid: ed.accountUuid,
              organizationUuid: ed.organizationUuid,
            },
            on.current,
            storageV5,
          );
        else if (!outboundOnly) handlePermissionResponse(bridge);
        if (outboundOnly) {
          store((prev) => {
            if (prev.replBridgeConnected && prev.replBridgeSessionId === bridge.bridgeSessionId) return prev;
            return {
              ...prev,
              replBridgeConnected: true,
              replBridgeSessionId: bridge.bridgeSessionId,
              replBridgeSessionUrl: undefined,
              replBridgeConnectUrl: undefined,
            };
          });
          logForDebugging(`[bridge:repl] Mirror initialized, session=${bridge.bridgeSessionId}`);
        } else {
          permissionRelays.connectBridge({
            permission: createBridgePermissionCallbacks(bridge, pendingPermissionHandlers),
            dialog: createBridgeDialogCallbacks(bridge, pendingHandlers, supportedKinds),
          });
          let url = getRemoteSessionUrl(bridge.bridgeSessionId, bridge.sessionIngressUrl);
          store((prev) => ({
            ...prev,
            replBridgeConnected: true,
            replBridgeSessionUrl: url,
            replBridgeEnvironmentId: bridge.environmentId,
            replBridgeSessionId: bridge.bridgeSessionId,
            replBridgeError: undefined,
            replBridgeErrorKind: undefined,
          }));
          if (replBridgeExplicit)
            transcript.replace((fa) =>
              fa.some((sa) => sa.type === "system" && sa.subtype === "bridge_status" && sa.url === url)
                ? fa
                : [...fa, createBridgeStatusMessage(url)],
            );
          logForDebugging(`[bridge:repl] Hook initialized, session=${bridge.bridgeSessionId}`);
        }
      } catch (err) {
        if (kn.current === Ll) {
          kn.current = undefined;
          Fn(bn(Ll.sid));
        }
        if (qa) return;
        if (!nl) Xo.current++;
        reportConcurrentBridgeSessions(outboundOnly);
        let errMsg = errorMessage(err);
        logForDebugging(`[bridge:repl] Init failed: ${errMsg}; consecutive failures: ${Xo.current}`);
        messagesRef.current?.();
        if (outboundOnly)
          store((prev_0) =>
            prev_0.replBridgeEnabled
              ? {
                  ...prev_0,
                  replBridgeEnabled: false,
                  replBridgeSessionGroupingId: undefined,
                }
              : prev_0,
          );
        else as(errMsg, nl ? "auth" : "terminal");
      }
    })();
    return () => {
      qa = true;
      if (kn.current === Ll) {
        kn.current = undefined;
        Fn(bn(Ll.sid));
      }
      ec();
      Kd();
      setDropNotifier(undefined);
      messagesRef.current?.();
      messagesRef.current = undefined;
      let replBridgeSkipNextArchive = store_2.getState().replBridgeSkipNextArchive;
      let na = !outboundOnly && hasQueuedTaskNotification((prev_1) => prev_1.type === "conversation_reset");
      if (na) {
        logFeatureSad("bridge_conversation_reset", "undelivered_at_teardown");
        setCurrentForKey(session, undefined);
        Zr({
          archiveAbandoned: teardownPromiseRef.current === null,
        });
        zr();
      }
      if (replBridgeSkipNextArchive)
        store((prev_2) => {
          if (!prev_2.replBridgeSkipNextArchive) return prev_2;
          return {
            ...prev_2,
            replBridgeSkipNextArchive: false,
          };
        });
      if (teardownPromiseRef.current) {
        let js = teardownPromiseRef.current;
        let Ya = !store_2.getState().replBridgeEnabled && !pl;
        let tl = (Ya && !replBridgeSkipNextArchive) || na;
        let ol = replBridgeSkipNextArchive && !(pl && na);
        if (!pl)
          Zr({
            archiveAbandoned: false,
          });
        dr.current = undefined;
        if (!outboundOnly)
          if (tl) {
            let ga = Vd();
            if (ga !== null) clearBridgeSession(sessionId, ga, undefined, storageV5);
            zr();
            if (isBgSession()) clearBridgeSessionFromJobState(storageV5);
          } else if (replBridgeSkipNextArchive && !pl) clearBridgeSessionCache();
          else handlePermissionResponse(js);
        let replBridgeEnabled =
          outboundOnly !== store_2.getState().replBridgeOutboundOnly && store_2.getState().replBridgeEnabled;
        let _d =
          replBridgeSkipNextArchive || pl || replBridgeEnabled
            ? undefined
            : Ya
              ? "remote_control_disabled"
              : "host_exit";
        logForDebugging(
          `[bridge:repl] Hook cleanup: starting teardown for session=${js.bridgeSessionId}${ol ? " (skipArchive)" : ""}${_d ? ` reason=${_d}` : ""}`,
        );
        lastWrittenIndexRef.current = js.teardown({
          skipArchive: ol,
          reason: _d,
        });
        teardownPromiseRef.current = null;
        setReplBridgeHandle(null, storageV5);
        noopHandler(js);
        setCurrentForKey(session, undefined);
        registerLiveSuppressionProbe(undefined);
      }
      if (!pl && !outboundOnly) removeNotification(BRIDGE_FAILED);
      permissionRelays.disconnectBridge();
      detachPendingDialogs(pendingHandlers);
      store((prev_19) => {
        let replBridgeError = pl || outboundOnly ? prev_19.replBridgeError : undefined;
        let replBridgeErrorKind = pl || outboundOnly ? prev_19.replBridgeErrorKind : undefined;
        if (
          !prev_19.replBridgeConnected &&
          !prev_19.replBridgeSessionActive &&
          !prev_19.replBridgeReconnecting &&
          !prev_19.replBridgeConnectUrl &&
          !prev_19.replBridgeSessionUrl &&
          !prev_19.replBridgeEnvironmentId &&
          !prev_19.replBridgeSessionId &&
          prev_19.replBridgeError === replBridgeError &&
          prev_19.replBridgeErrorKind === replBridgeErrorKind
        )
          return prev_19;
        return {
          ...prev_19,
          replBridgeConnected: false,
          replBridgeSessionActive: false,
          replBridgeReconnecting: false,
          replBridgeConnectUrl: undefined,
          replBridgeSessionUrl: undefined,
          replBridgeEnvironmentId: undefined,
          replBridgeSessionId: undefined,
          replBridgeError,
          replBridgeErrorKind,
        };
      });
      bo.current = 0;
      Ao.current = new Set();
      Ro.current = {};
    };
  }, [
    replBridgeEnabled,
    replBridgeOutboundOnly,
    Hs,
    store,
    transcript,
    addNotification,
    removeNotification,
    clock,
    storageV5,
    credentials,
    queue,
    session,
    permissionRelays,
  ]);
  function dl(Ss) {
    let state = store_2.getState();
    if (!state.replBridgeConnected) return;
    let handle_1 = teardownPromiseRef.current;
    if (!handle_1) return;
    if (shouldSkipConversationReset(handle_1, state.replBridgeSessionActive)) return;
    let za = Io.current;
    Io.current = false;
    try {
      let cl = Ao.current;
      let { head, tail, eligible } = Ro.current;
      let qa = head === undefined || Ss[0]?.uuid === head;
      let pd = eligible === undefined || Ss[eligible.index]?.uuid === eligible.uuid;
      let $l = 0;
      if (za) {
        Wo.current = true;
        logForDebugging(
          `[bridge:repl] Transcript replaced under a detached binding \u2014 ${Ss.length} message(s) accounted as seen, not uploaded`,
        );
      } else {
        if (qa && pd) {
          if (tail !== undefined && Ss[tail.index]?.uuid === tail.uuid) $l = tail.index + 1;
          else if (eligible !== undefined) $l = eligible.index + 1;
        }
        if ($l === 0 && (tail !== undefined || eligible !== undefined))
          logForDebugging(
            `[bridge:repl] Transcript rewrite detected (messages.length=${Ss.length}), rescanning`,
          );
      }
      let eligible_2 = $l > 0 ? eligible : undefined;
      let El = [];
      let Ll = [];
      let _c;
      let bridgeSubagentFrameGate = getBridgeSubagentFrameGate();
      for (let cd = $l; cd < Ss.length; cd++) {
        let msg_1 = Ss[cd];
        if (!msg_1 || !isEligibleBridgeMessage(msg_1)) {
          if (msg_1 && extractAgentIdsFromMessages_2(msg_1) && !cl.has(msg_1.uuid)) {
            cl.add(msg_1.uuid);
            if (!za && bridgeSubagentFrameGate.enabled) {
              _c ??= ke().tools;
              for (let pl of subagentProgressToSDKMessages(msg_1, _c))
                if (shouldForwardSubagentMessage(bridgeSubagentFrameGate, pl)) Ll.push(pl);
            }
          }
          continue;
        }
        eligible_2 = {
          index: cd,
          uuid: msg_1.uuid,
        };
        if (cl.has(msg_1.uuid)) continue;
        cl.add(msg_1.uuid);
        if (za || mn.current.get(msg_1.uuid)?.has(handle_1.bridgeSessionId) === true) continue;
        if (isCompactBoundaryOrSummary(msg_1) && (Wo.current || Go() || isCompactPairWithheldFromRemote()))
          continue;
        El.push(msg_1);
      }
      bo.current = Ss.length;
      let last = Ss.at(-1);
      Ro.current = {
        head: Ss[0]?.uuid,
        tail: last && {
          index: Ss.length - 1,
          uuid: last.uuid,
        },
        eligible: eligible_2,
      };
      forwardQueuedSdkEventsToBridge(handle_1);
      if (El.length > 0) handle_1.writeMessages(El);
      if (Ll.length > 0) handle_1.writeSdkMessages(Ll);
    } catch (error) {
      if (za) Io.current = true;
      logError(error);
    }
  }
  P(() => {
    dl(storeSelector);
  }, [storeSelector, replBridgeConnected, replBridgeSessionActive]);
  P(() => {
    if (!replBridgeConnected) return;
    let Ss = () => {
      let yi = teardownPromiseRef.current;
      if (!yi || shouldSkipConversationReset(yi, store_2.getState().replBridgeSessionActive)) return;
      forwardQueuedSdkEventsToBridge(yi);
    };
    setTaskNotificationListener(Ss);
    Ss();
    return () => setTaskNotificationListener(null);
  }, [replBridgeConnected, replBridgeSessionActive]);
  useForwardRateLimitEventsToBridge(replBridgeConnected, Xt);
  P(() => {
    if (!replBridgeEnabled) {
      let Ss = drainTaskNotifications();
      let yi = false;
      let Ws = false;
      for (let za of Ss)
        if (za.subtype === "task_notification") yi = true;
        else if (za.subtype === "background_tasks_changed") Ws = true;
      if (yi || Ws)
        logFeatureSad(
          "ccr_task_status_publish",
          store_2.getState().replBridgeError !== undefined
            ? "status_discarded_failed_init"
            : "status_discarded_user_disable",
          {
            has_terminal_bookend: yi,
            has_level: Ws,
          },
        );
    }
  }, [replBridgeEnabled]);
  P(() => {
    if (
      replBridgeEnabled ||
      replBridgeError === undefined ||
      replBridgeErrorKind !== "auth" ||
      replBridgeOutboundOnly ||
      !isBridgeAuthReviveEnabled()
    )
      return;
    let Ss = false;
    let yi;
    let Ws = 300000;
    async function za() {
      let cl = Hi.getSnapshot().credentialsPersisted !== credentialsPersistedRef.current;
      let Ol = !isBridgeAuthReviveEnabled();
      let as = Ol || (!cl && Pr.current >= AUTH_REVIVE_POLL_LIMIT);
      if (as)
        logForDebugging(
          Ol
            ? "[bridge:repl] Auth-revive watcher: kill switch off \u2014 still polling, no unattended revive"
            : "[bridge:repl] Auth-revive watcher: non-interactive revive brake engaged \u2014 still polling; an in-process /login bypasses",
        );
      let pi = accessTokenRef.current === BASELINE_PENDING_SENTINEL;
      let qa;
      try {
        qa = as || pi ? undefined : await readFreshOAuthCredentialSnapshot(storageV5, credentials);
      } catch {
        qa = undefined;
      }
      if (Ss) return;
      let pd = accessTokenRef.current !== BASELINE_PENDING_SENTINEL;
      let $l = pr.current;
      if (
        pd &&
        qa !== undefined &&
        qa.accessToken !== accessTokenRef.current &&
        qa.accountUuid !== undefined &&
        $l?.accountUuid !== undefined
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
        let El = false;
        store((Ll) => {
          if (Ll.replBridgeEnabled || Ll.replBridgeError === undefined) return Ll;
          El = true;
          return {
            ...Ll,
            replBridgeEnabled: true,
            replBridgeError: undefined,
            replBridgeErrorKind: undefined,
          };
        });
        if (El) {
          logEvent("tengu_bridge_repl_auth_revive", {});
          Pr.current++;
          Qn.current = true;
          ur.current = {
            accountUuid: qa.accountUuid,
            organizationUuid: qa.organizationUuid,
          };
        }
        return;
      }
      yi = clock.setTimeout(() => {
        za();
      }, Ws);
    }
    za();
    return () => {
      Ss = true;
      yi?.();
    };
  }, [
    replBridgeEnabled,
    replBridgeError,
    replBridgeErrorKind,
    credentialsPersisted,
    store,
    clock,
    store_2,
    replBridgeOutboundOnly,
    storageV5,
    credentials,
  ]);
  let sendBridgeResult = (Ss) => {
    dl(transcript.getSnapshot());
    teardownPromiseRef.current?.sendResult(Ss);
    let mainLoopModel_2 = getMainLoopModel();
    reportBridgeModel(mainLoopModel_2);
    reportBridgeEffortMetadata({
      ultracodeActive: isUltracodeActive(store_2.getState().ultracode, mainLoopModel_2),
    });
    buildBridgeInitializeCommands(
      () => ({
        messages: transcript.getSnapshot(),
        model: getMainLoopModel(),
        autoCompactWindow: store_2.getState().autoCompactWindow,
        resetBoundary: getCurrentForKey(session),
      }),
      () =>
        collectBridgeContextUsage(
          {
            getContextUsageInputs: ke,
            store: store_2,
            transcript,
            storageV5,
            credentials,
            mainLoopModel,
          },
          {
            detail: "summary",
          },
        ),
    );
    mirrorTokenUsageToBridge();
    if (teardownPromiseRef.current) ua();
    try {
      if (Ss !== undefined && Ss.terminalReason === undefined && Ss.sendNowCut !== true)
        rearmNotificationNudge({
          getAppState: () => store_2.getState(),
          setAppState: store,
          session,
        });
    } catch (error) {
      logForDebugging(`[bridge:repl] turn-end upkeep failed: ${errorMessage(error)}`, {
        level: "error",
      });
      logError(error);
    }
  };
  let sendBridgeResult_2 = ce((Ss) => {
    teardownPromiseRef.current?.stampReply(Ss);
  }, []);
  return {
    sendBridgeResult,
    stampBridgeReply: sendBridgeResult_2,
  };
}
//@ chunk-tw3rx20q.js:299-324 placement
var replBridgeEvents = new SessionRootSlot(() => createSignal());
//@ chunk-tw3rx20q.js:324-377 placement
function emitReplBridgeEvent(e, s, o) {
  setCurrentForKey(e, undefined);
  replBridgeEvents.of(e).emit(s, o);
}
export { emitReplBridgeEvent, resolveBridgeImmediateCommand_2, useReplBridge };
