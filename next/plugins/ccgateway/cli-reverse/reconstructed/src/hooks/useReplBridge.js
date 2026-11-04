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
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { createSignal } from "../utils/signal.js";
import { setCurrentForKey, getCurrentForKey } from "../utils/currentRefByKey.js";
import {
  init_react_production,
  useEffect,
  useEffectEvent,
  useRef,
  useCallback,
  useSyncExternalStore,
  useState,
  useReducer,
} from "../../vendor/react/cjs/react.production.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-tw3rx20q.js:299-324 placement
var replBridgeEvents; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-tw3rx20q.js:299", () => {
  replBridgeEvents = new SessionRootSlot(() => createSignal());
});
//@ chunk-tw3rx20q.js:324-377 placement
function emitReplBridgeEvent(session, event, payload) {
  setCurrentForKey(session, undefined);
  replBridgeEvents.of(session).emit(event, payload);
}
//@ chunk-18hwfzwa.js:1574185-1574189 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1574185", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1574189-1574407 placement
function useForwardRateLimitEventsToBridge(replBridgeConnected, getHandle) {
  useEffect(() => {
    if (!replBridgeConnected) return;
    function onLimitsChanged(status) {
      let handle = getHandle();
      if (!handle) return;
      try {
        let rateLimitInfo = buildRateLimitInfo(status);
        if (rateLimitInfo) forwardRateLimitEventToBridge(handle, rateLimitInfo);
      } catch (error) {
        logForDebugging(`[bridge] rate_limit_event listener failed: ${errorMessage(error)}`, {
          level: "error",
        });
      }
    }
    return onLimitsStatusChanged(onLimitsChanged);
  }, [replBridgeConnected, getHandle]);
}
//@ chunk-18hwfzwa.js:1574407-1574557 placement
function reportConcurrentBridgeSessions(outboundOnly) {
  (outboundOnly ? Promise.resolve(0) : countLiveBridgeProcesses())
    .then((count) => {
      if (count >= 2)
        logFeatureBad("bridge_repl", "multi_session_crash", {
          concurrent_bridge_sessions: count,
        });
    })
    .catch(() => {});
}
//@ chunk-18hwfzwa.js:1574557-1574596 placement
var bridgeCoordinatorModule; // deferred: loads other modules while loading; runs once its import cycle is complete
deferInit("chunk-18hwfzwa.js:1574557", () => {
  bridgeCoordinatorModule = require("../coordinator/coordinatorMode.js");
});
//@ chunk-18hwfzwa.js:1574596-1574649 placement
function mcpAuthModule() {
  return require("../services/mcp/emitTripwireEvent.lazy.js");
}
//@ chunk-18hwfzwa.js:1574649-1574693 placement
function getMcpAuthModule() {
  return mcpAuthModule().mcpAuthModule();
}
//@ chunk-18hwfzwa.js:1574693-1574705 placement
var BRIDGE_FLUSH_TIMEOUT_MS = 1e4;
//@ chunk-18hwfzwa.js:1574705-1574880 placement
function forwardQueuedSdkEventsToBridge(handle) {
  try {
    let mapped = drainTaskNotifications().filter(isEphemeralSdkFrame).map(stripCompactErrorForSdk);
    if (mapped.length > 0) handle.writeSdkMessages(mapped);
  } catch (error) {
    logForDebugging(`[bridge:repl] queued SDK event forward failed: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-18hwfzwa.js:1574880-1574965 placement
function shouldSkipConversationReset(bridgeHandle, replBridgeSessionActive) {
  return (
    !replBridgeSessionActive &&
    !bridgeHandle.outboundOnly &&
    hasQueuedTaskNotification((notification) => notification.type === "conversation_reset")
  );
}
//@ chunk-18hwfzwa.js:1574965-1575003 placement
var BASELINE_PENDING_SENTINEL = "\x00baseline-pending";
var AUTH_REVIVE_POLL_LIMIT = 10;
//@ chunk-18hwfzwa.js:1575003-1575268 placement
/**
 * 解析从 Remote Control 收到的输入是否为可立即执行的斜杠命令：找到命令且允许即时执行时，返回桥接安全的本地命令（或其回退）、参数与显示名，否则 null。
 */
function resolveBridgeImmediateCommand_2(text, commands, renderMode, author) {
  let slashCommand = parseSlashCommand(text);
  if (!slashCommand) return null;
  let command = findCommand(slashCommand.commandName, commands);
  if (!command || !isImmediateCommand(command, slashCommand.args, renderMode)) return null;
  let target =
    command.type === "local" && isBridgeSafeCommand(command) && admitsBridgeAuthor(command, author)
      ? command
      : findBridgeFallback(command);
  if (!target || target.type !== "local") return null;
  return {
    target,
    args: slashCommand.args,
    displayName: getCommandName(command),
  };
}
//@ chunk-18hwfzwa.js:1575268-1575278 layout
var MAX_BRIDGE_INIT_FAILURES = 3;
//@ chunk-18hwfzwa.js:1575278-1611905 callgraph-witnessed (2.1.88 match: useReplBridge, 0.238)
/**
 * Remote Control 桥：启用后注册环境并建立会话，把本地消息/工具结果/权限请求转发到 claude.ai，把远程提示、权限回复、命令（/clear、fork、模式切换、teleport pull）应用到本地；处理错误与重连。
 */
function useReplBridge(
  messages,
  transcript,
  cancelTurn,
  commands,
  mainLoopModel,
  getContextUsageInputs,
  permissionRelays,
  isTurnActive,
  runBridgeImmediateCommand,
  spawnThinkingConfig,
  updateDynamicMcpConfig,
  isTurnLive,
  flag,
) {
  let renderMode = useRenderMode();
  let { storageV5, credentials } = useTheme_2();
  let queue = useCommandQueueOrDefault();
  let session = useSession();
  let clock = useClock();
  let handleRef = useEffectEvent(cancelTurn);
  let teardownPromiseRef = useRef(null);
  let getHandle = useCallback(() => teardownPromiseRef.current, []);
  let appStateSession = useAppStateSession();
  useEffect(() => {
    let sessionHosts = new Set([transportStateByHost.of(session), transportStateByHost.of(appStateSession)]);
    let savedProbes = new Map(
      [...sessionHosts].map((sessionHost) => [sessionHost, sessionHost.remoteBridgeLive]),
    );
    for (let transportState of sessionHosts)
      transportState.remoteBridgeLive = () => teardownPromiseRef.current !== null;
    return () => {
      for (let [sessionHost, savedProbe] of savedProbes) sessionHost.remoteBridgeLive = savedProbe;
    };
  }, [session, appStateSession]);
  let lastWrittenIndexRef = useRef(undefined);
  let flushedUUIDsRef = useRef(null);
  let failureTimeoutRef = useRef(null);
  let consecutiveFailuresRef = useRef(new WeakSet());
  let forwardedCount = useRef(0);
  let seenUuids = useRef(new Set());
  let recentAuthAt = useRef(new Map());
  let uploadWindow = useRef({});
  let isForeignSession = useRef(false);
  let sawForeignEvent = useRef(false);
  let didTranscriptReset = useRef(false);
  let pulledRowsBySession = useRef(new Map());
  function markPulled(sessionId, bridgeSessionId) {
    let rowSet = pulledRowsBySession.current.get(sessionId);
    if (rowSet === undefined) pulledRowsBySession.current.set(sessionId, new Set([bridgeSessionId]));
    else rowSet.add(bridgeSessionId);
  }
  let pulledWindow = useRef({
    sid: undefined,
    rows: new Set(),
    tip: undefined,
  });
  let trackPulledRows = useEffectEvent((sessionId, bridgeSessionId) => {
    let pulledWindow_2 = pulledWindow.current;
    if (pulledWindow_2.sid !== undefined && pulledWindow_2.sid !== sessionId) return;
    pulledWindow_2.sid = sessionId;
    for (let message of messages)
      if (!pulledRowsBySession.current.get(message.uuid)?.has(bridgeSessionId)) {
        pulledWindow_2.rows.add(message.uuid);
        pulledWindow_2.tip = message.uuid;
      }
    return pulledWindow_2.tip;
  });
  let binding = useRef(undefined);
  let bindingToken = useRef(undefined);
  function rebindPendingRows(bridgeSessionId) {
    for (let [sessionId, rowSet] of pulledRowsBySession.current)
      if (rowSet.delete(PENDING_BRIDGE_SESSION)) {
        if (bridgeSessionId !== undefined) rowSet.add(bridgeSessionId);
        else if (rowSet.size === 0) pulledRowsBySession.current.delete(sessionId);
      }
    let currentBinding = binding.current;
    if (currentBinding?.bridgeSessionId === PENDING_BRIDGE_SESSION)
      binding.current =
        bridgeSessionId === undefined
          ? undefined
          : {
              sids: currentBinding.sids,
              bridgeSessionId,
            };
  }
  function resolveBridgeSessionId(sessionId) {
    if (sessionIdRef.current === sessionId) return bridgeSessionIdRef.current;
    return sessionId === getSessionId() ? getCurrentSessionBridge()?.id : undefined;
  }
  useEffect(() => {
    let unsubscribe = replBridgeEvents.of(session).subscribe((sourceSessionId, pulledUuids) => {
      if (!pulledUuids) return;
      let setAppState = getSessionId();
      let bridgeSessionId =
        teardownPromiseRef.current !== null &&
        !isForeignSession.current &&
        !didTranscriptReset.current &&
        mainLoopModelRef.current === setAppState
          ? teardownPromiseRef.current?.bridgeSessionId
          : bindingToken.current?.sid === setAppState
            ? PENDING_BRIDGE_SESSION
            : resolveBridgeSessionId(setAppState);
      if (bridgeSessionId === undefined) return;
      let tipUuid = trackPulledRows(setAppState, bridgeSessionId);
      let includesTip = tipUuid !== undefined && pulledUuids.includes(tipUuid);
      let pulledCount = 0;
      for (let uuid of includesTip ? [] : pulledUuids) {
        markPulled(uuid, bridgeSessionId);
        pulledCount += 1;
      }
      let currentWindow = binding.current;
      let belongsToWindow = currentWindow === undefined || currentWindow.sids.has(sourceSessionId);
      if (pulledCount === 0) {
        if (belongsToWindow) binding.current = undefined;
        return;
      }
      if (belongsToWindow)
        binding.current = {
          sids: new Set([sourceSessionId]),
          bridgeSessionId,
        };
      logForDebugging(
        `[bridge:repl] /teleport pull under the bound conversation \u2014 ${pulledCount} pulled row(s) will not forward into this session`,
      );
    });
    let commandsRef = onSessionSwitch((sessionId, reason) => {
      if (reason === "clear") {
        binding.current = undefined;
        pulledWindow.current = {
          sid: undefined,
          rows: new Set(),
          tip: undefined,
        };
      } else if (
        reason === "fork" &&
        binding.current !== undefined &&
        !isForeignSession.current &&
        !didTranscriptReset.current
      ) {
        binding.current.sids.add(sessionId);
        pulledWindow.current.sid = sessionId;
      }
    });
    return () => {
      unsubscribe();
      commandsRef();
    };
  }, [session]);
  function isForegroundBinding() {
    let bridgeWindow = binding.current;
    if (bridgeWindow === undefined || !bridgeWindow.sids.has(getSessionId())) return false;
    let bridgeSessionId = teardownPromiseRef.current?.bridgeSessionId;
    return (
      bridgeWindow.bridgeSessionId === bridgeSessionId ||
      bridgeWindow.bridgeSessionId === PENDING_BRIDGE_SESSION
    );
  }
  let mainLoopModelRef = useRef(undefined);
  useEffect(() => {
    registerForeignConversationProbe(() => ({
      foreign: isForeignSession.current || didTranscriptReset.current || isForegroundBinding(),
      boundSid: mainLoopModelRef.current,
      pulledWindow: binding.current,
      pulledRows: pulledRowsBySession.current,
    }));
    return () => registerForeignConversationProbe(undefined);
  }, []);
  let messagesRef = useRef(undefined);
  let consecutiveFailures = useRef(0);
  let bridgeSessionIdRef = useRef(undefined);
  let lastSequenceNumRef = useRef(undefined);
  let skipHistoryBackfill = useRef(false);
  let backfillSuppressedSession = useRef(undefined);
  let hadInteraction = useRef(false);
  useEffect(
    () =>
      onInteraction(() => {
        if (teardownPromiseRef.current) hadInteraction.current = true;
      }),
    [],
  );
  let readyPushSent = useRef(false);
  let reattachRequested = useRef(env.CLAUDE_BRIDGE_REATTACH_SESSION !== undefined);
  let supportedDialogKinds = useRef(undefined);
  let forwardedIndex = useRef(undefined);
  let headRef = useRef(undefined);
  let eligibleRef = useRef(undefined);
  let sessionIdRef = useRef(undefined);
  let deferredArchive = useRef(undefined);
  let ownerAccount = useRef(undefined);
  let accessTokenRef = useRef(undefined);
  let pendingOwnerAccount = useRef(undefined);
  let isReviveInitiated = useRef(false);
  let expectedOwner = useRef(undefined);
  let currentOwnerAccount = useRef(undefined);
  let authReviveCount = useRef(0);
  let credentialsPersistedRef = useRef(0);
  let authSnapshotSeq = useRef(0);
  let rowOwnerAccount = useRef(undefined);
  function resetBinding({ archiveAbandoned }) {
    bridgeSessionIdRef.current = undefined;
    lastSequenceNumRef.current = undefined;
    supportedDialogKinds.current = undefined;
    forwardedIndex.current = undefined;
    headRef.current = undefined;
    eligibleRef.current = undefined;
    sessionIdRef.current = undefined;
    rowOwnerAccount.current = undefined;
    backfillSuppressedSession.current = undefined;
    let archive = deferredArchive.current;
    deferredArchive.current = undefined;
    if (!archive) return false;
    if (archiveAbandoned) {
      archive.fire().finally(() => archive.unregister());
      return true;
    }
    archive.unregister();
    return false;
  }
  let deferredClears = useRef([]);
  function flushDeferredClears() {
    for (let entry of deferredClears.current)
      clearBridgeSession(
        entry.sessionId,
        entry.path,
        {
          targetExists: true,
        },
        storageV5,
      );
    deferredClears.current = [];
  }
  let store = useSetAppState();
  let getCommands = useEffectEvent(() => commands);
  let getMainLoopModel_2 = useEffectEvent(() => mainLoopModel);
  let runImmediateCommand = useEffectEvent((text, origin, relayAuthored) => {
    if (!runBridgeImmediateCommand) return false;
    let bridgeImmediateCommand = resolveBridgeImmediateCommand_2(text, commands, renderMode, {
      origin,
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
      origin,
    );
    return true;
  });
  let store_2 = useAppStoreDirect();
  let setVoiceState = useSetVoiceState();
  let { addNotification, removeNotification } = useNotifications();
  let replBridgeEnabled = useAppState((state) => state.replBridgeEnabled);
  let replBridgeConnected = useAppState((state) => state.replBridgeConnected);
  let commands_2 = useAppState((state) => state.mcp.commands);
  let replBridgeSessionActive = useAppState((state) => state.replBridgeSessionActive);
  let replBridgeError = useAppState((state) => state.replBridgeError);
  let replBridgeErrorKind = useAppState((state) => state.replBridgeErrorKind);
  let loginEvents = loginEventCounter.of(session);
  let credentialsPersisted = useStoreSelector(loginEvents, (state) => state.credentialsPersisted);
  let replBridgeOutboundOnly = useAppState((state) => state.replBridgeOutboundOnly);
  let replBridgeInitialName = useAppState((state) => state.replBridgeInitialName);
  let replBridgeSessionGroupingId = useAppState((state) => state.replBridgeSessionGroupingId);
  let mode = useAppState((state) => state.toolPermissionContext.mode);
  let fastMode = useAppState((state) => state.fastMode);
  let autoCompactWindow = useAppState((state) => state.autoCompactWindow);
  let settings = useAppState((s_0) => s_0.settings);
  let queuedMessageText = useQueuedMessageText();
  let isBridgeLive = replBridgeConnected && !replBridgeOutboundOnly;
  let effortLevel = replBridgeConnected
    ? resolveEffortLevelOrNull(getMainLoopModel(), queuedMessageText)
    : null;
  let teammateView = useSyncExternalStore(subscribeFocusMode, viewTeammateOutput);
  let [isSpareProcess, setIsSpareProcess] = useState(() => process.env.CLAUDE_BG_SOURCE === "spare");
  if (isSpareProcess && messages.some(isHumanTurn_2)) setIsSpareProcess(false);
  useEffect(() => {
    setOwnBridgePeerResolver(ownBridgePeerAddress);
    return () => setOwnBridgePeerResolver(undefined);
  }, []);
  useEffect(() => {
    if (isRemoteSessionAvailable() || isSpareProcess) return;
    logEvent("tengu_bridge_repl_evaluated", {
      would_auto_on: getCcrAutoConnectDefault(),
      repl_bridge_enabled: store_2.getState().replBridgeEnabled,
    });
  }, [store_2, isSpareProcess]);
  let sendInitFrame = useEffectEvent(({ seedPermissionMode = false } = {}) => {
    let handle = teardownPromiseRef.current;
    if (!handle) return;
    let externalMode = seedPermissionMode
      ? toExternalPermissionMode(store_2.getState().toolPermissionContext.mode)
      : undefined;
    let needsModeStatus =
      externalMode !== undefined &&
      !hasQueuedTaskNotification(
        (s_2) =>
          s_2.type === "system" &&
          s_2.subtype === "status" &&
          s_2.status === null &&
          s_2.permissionMode === externalMode,
      );
    (async () => {
      try {
        let loadedSkills = await getSlashCommandToolSkills(getCwd(), storageV5);
        let state = store_2.getState();
        let startTime = performance.now();
        let message = buildBridgeContextSnapshot({
          session,
          tools: getContextUsageInputs().tools,
          model: getMainLoopModel(),
          permissionMode: state.toolPermissionContext.mode,
          commands: getCommands(),
          agents: state.agentDefinitions.activeAgents,
          loadedSkills,
          mcpCommands: state.mcp.commands,
          fastMode: state.fastMode,
          effortValue: resolveEffortLevel(state),
          messagesInView: () => messagesSinceCompactBoundary(transcript.getSnapshot()),
        });
        recordInitTiming(message, startTime);
        handle.writeSdkMessages([message]);
        if (needsModeStatus && teardownPromiseRef.current === handle)
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
  let [sentCount, bumpSentCount] = useReducer((detail) => detail + 1, 0);
  useEffect(() => {
    if (!isBridgeLive) return;
    sendInitFrame();
  }, [
    isBridgeLive,
    mainLoopModel,
    mode,
    fastMode,
    effortLevel,
    teammateView,
    commands_2,
    commands,
    sentCount,
  ]);
  let isMirrorOnly = replBridgeConnected && replBridgeOutboundOnly;
  useEffect(() => {
    if (!isMirrorOnly) return;
    sendInitFrame();
  }, [isMirrorOnly, mainLoopModel, mode, fastMode, effortLevel, teammateView]);
  useEffect(() => {
    if (!isBridgeLive) return;
    reportEffortForModel(getMainLoopModel(), store_2.getState());
  }, [isBridgeLive, effortLevel, store_2]);
  useEffect(() => {
    if (!isBridgeLive) return;
    buildBridgeInitializeCommands(() => ({
      messages: transcript.getSnapshot(),
      model: getMainLoopModel(),
      autoCompactWindow,
      resetBoundary: getCurrentForKey(session),
    }));
  }, [isBridgeLive, mainLoopModel, autoCompactWindow, settings, transcript, session]);
  useEffect(() => {
    if (!isBridgeLive) return;
    let unsubFastMode = onOrgFastModeChange(() => {
      sendInitFrame();
    });
    let unsubFallbackRejected = onFastRejectedFallbackModelsChanged(() => {
      sendInitFrame();
    });
    let unsubMemorySkills = onMemorySkillsChanged(() => {
      sendInitFrame();
    });
    return () => {
      unsubFastMode();
      unsubFallbackRejected();
      unsubMemorySkills();
    };
  }, [isBridgeLive]);
  let disconnectForPolicy = useEffectEvent(() => {
    let { replBridgeEnabled, replBridgeConnected, replBridgeOutboundOnly } = store_2.getState();
    if (!replBridgeEnabled || !replBridgeConnected) return;
    let policyRefusal = connectedBridgePolicyRefusal(replBridgeOutboundOnly);
    if (policyRefusal === null) return;
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
        let detail = policyRefusal.detail;
        transcript.replace((msg) => {
          let last = msg.at(-1);
          return last?.type === "system" && last.subtype === "informational" && last.content === detail
            ? msg
            : [...msg, createSystemMessage(detail, "notice")];
        });
      }
      logForDebugging(
        `[bridge:repl] Org policy now refuses the connected bridge (${policyRefusal.policy}: ${policyRefusal.kind}, outboundOnly=${replBridgeOutboundOnly}); disconnected`,
      );
      logEvent("tengu_bridge_policy_teardown", {
        lane: lit_2("repl"),
        policy: fromEnum(policyRefusal.policy),
        deny_kind: fromEnum(policyRefusal.kind),
        outbound_only: replBridgeOutboundOnly,
      });
    } catch (error) {
      logForDebugging(`[bridge:repl] Policy disconnect notice failed: ${errorMessage(error)}`, {
        level: "error",
      });
      logError(error);
    }
  });
  useEffect(() => {
    if (!replBridgeConnected || isLovelyUmbrellaOn()) return;
    let fields = onPolicyVerdictChanged(() => {
      queueMicrotask(() => disconnectForPolicy());
    });
    disconnectForPolicy();
    return fields;
  }, [replBridgeConnected]);
  useEffect(() => {
    if (!replBridgeEnabled || isRemoteSessionAvailable() || isSpareProcess) return;
    let outboundOnly = replBridgeOutboundOnly;
    if (!outboundOnly) {
      removeNotification(BRIDGE_FAILED);
      store((prev) =>
        prev.replBridgeError === undefined
          ? prev
          : {
              ...prev,
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
    let wasReattached = reattachRequested.current;
    function notifyBridgeFailed(detail, wasConnected = false) {
      logForDebugging(
        `[bridge:repl] notifyBridgeFailed detail="${detail}" outboundOnly=${outboundOnly} wasConnected=${wasConnected}`,
      );
      if (outboundOnly) return;
      addNotification({
        key: BRIDGE_FAILED,
        kind: "warning",
        segments: [
          {
            text: `Remote Control ${wasConnected ? "disconnected" : "failed"}`,
            color: "error",
          },
          {
            text: ` \xB7 ${detail || "/remote-control"}`,
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
      let isSelfExplanatory =
        state === BRIDGE_MALFORMED_RESPONSE_HINT ||
        state === BRIDGE_SIGNATURE_WANTED_HINT ||
        state?.includes("/login") ||
        state?.includes("/remote-control") ||
        state?.includes("restart") ||
        state?.includes("policy") ||
        state?.includes("update");
      let reconnectHint =
        detail_0 === "auth"
          ? state?.includes("/login")
            ? ""
            : " \u2014 run /login to restore Remote Control"
          : detail_0 === "ended_elsewhere" || isSelfExplanatory
            ? ""
            : " \u2014 run /remote-control to reconnect";
      let noticeText = `Remote Control disconnected${state ? ` \u2014 ${state}` : ""}${reconnectHint}`;
      transcript.replace((prev_3) => {
        let last = prev_3.at(-1);
        if (last?.type === "system" && last.subtype === "informational" && last.content === noticeText)
          return prev_3;
        return [...prev_3, createSystemMessage(noticeText, "warning")];
      });
    }
    function failBridge(errorMessage, kind = "terminal") {
      notifyBridgeFailed(errorMessage);
      handleStateChange(errorMessage, kind);
      store((prev_4) => ({
        ...prev_4,
        replBridgeError: errorMessage,
        replBridgeErrorKind: kind,
      }));
      if (kind === "auth") refreshCredentials();
      scheduleDisableOnError();
    }
    function refreshCredentials() {
      accessTokenRef.current = BASELINE_PENDING_SENTINEL;
      credentialsPersistedRef.current = loginEvents.getSnapshot().credentialsPersisted;
      let seq = ++authSnapshotSeq.current;
      readFreshOAuthCredentialSnapshot(storageV5, credentials)
        .catch(() => {
          return;
        })
        .then(async (prev_9) => {
          let account =
            prev_9 !== undefined
              ? {
                  accountUuid: prev_9.accountUuid,
                  organizationUuid: prev_9.organizationUuid,
                }
              : await readFreshOauthAccountFromDisk(storageV5).catch(() => {
                  return;
                });
          if (authSnapshotSeq.current !== seq) return;
          if (loginEvents.getSnapshot().credentialsPersisted !== credentialsPersistedRef.current) {
            pendingOwnerAccount.current = account;
            accessTokenRef.current = undefined;
            return;
          }
          pendingOwnerAccount.current = account;
          accessTokenRef.current = prev_9?.accessToken;
        });
    }
    if (consecutiveFailures.current >= MAX_BRIDGE_INIT_FAILURES && !isReviveInitiated.current) {
      logForDebugging(
        `[bridge:repl] Hook: ${consecutiveFailures.current} consecutive init failures, not retrying this session`,
      );
      notifyBridgeFailed(BRIDGE_FAILED_FOOTER_TEXT);
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
      setDropNotifier((drop) => {
        let { status, payloadType, requestId, windowCapped } = drop;
        if (windowCapped) {
          let warningText = formatUnsignedEventWarning(drop);
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
            if (last?.type === "system" && last.subtype === "informational" && last.content === warningText)
              return prev_8;
            return [...prev_8, createSystemMessage(warningText, "warning")];
          });
          return;
        }
        let { what, hint } = describeUnsignedEvent(drop);
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
        let warningText = formatUnsignedEventWarning(drop);
        transcript.replace((prev_7) => {
          let last = prev_7.at(-1);
          if (last?.type === "system" && last.subtype === "informational" && last.content === warningText)
            return prev_7;
          return [...prev_7, createSystemMessage(warningText, "warning")];
        });
        if (payloadType === "control_request" && requestId)
          teardownPromiseRef.current?.sendControlResponse(
            {
              type: "control_response",
              response: {
                subtype: "error",
                request_id: requestId,
                error: formatUnsignedEventNotice(drop),
              },
            },
            {
              skipStateReport: true,
            },
          );
      });
    let isCancelled = false;
    let messageCount = messages.length;
    let reboundSession = false;
    let sessionId = getSessionId();
    if (pulledWindow.current.sid !== undefined && pulledWindow.current.sid !== sessionId)
      pulledWindow.current = {
        sid: undefined,
        rows: new Set(),
        tip: undefined,
      };
    mainLoopModelRef.current = sessionId;
    let transcriptPath = getTranscriptPath();
    let bindingToken_2 = {
      sid: sessionId,
    };
    bindingToken.current = bindingToken_2;
    let boundSessionId = sessionId;
    let savedTranscriptPath = null;
    let getMaterializedPath = () =>
      sessionId === getSessionId() ? (getMaterializedSessionFile() ?? transcriptPath) : savedTranscriptPath;
    if (sessionIdRef.current !== undefined && sessionIdRef.current !== sessionId)
      resetBinding({
        archiveAbandoned: true,
      });
    let transcriptRewritten =
      (headRef.current !== undefined && messages[0]?.uuid !== headRef.current) ||
      (eligibleRef.current !== undefined &&
        messages[eligibleRef.current.index]?.uuid !== eligibleRef.current.uuid);
    if (transcriptRewritten) clearBridgeSessionCache();
    let initialMessageLimit =
      !transcriptRewritten && forwardedIndex.current !== undefined
        ? Math.min(forwardedIndex.current, messages.length)
        : undefined;
    let autoDisabled = false;
    function scheduleDisableOnError() {
      let head = uploadWindow.current.head;
      let eligible = uploadWindow.current.eligible;
      messagesRef.current = clock.setTimeout(() => {
        if (isCancelled) return;
        messagesRef.current = undefined;
        let handle = teardownPromiseRef.current;
        if (handle) {
          bridgeSessionIdRef.current = handle.bridgeSessionId;
          lastSequenceNumRef.current = handle.getLastSequenceNum();
          backfillSuppressedSession.current = skipHistoryBackfill.current ? sessionId : undefined;
          supportedDialogKinds.current = dialogKinds.size > 0 ? new Set(dialogKinds) : undefined;
          forwardedIndex.current = forwardedCount.current;
          headRef.current = head;
          eligibleRef.current = eligible;
          sessionIdRef.current = sessionId;
          rowOwnerAccount.current = ownerAccount.current;
          deferredArchive.current?.unregister();
          let ownerAccount_2 = rowOwnerAccount.current;
          let archiveIfSameOwner = async () => {
            if (ownerAccount_2?.accountUuid === undefined) return;
            let freshAccount = await readFreshOauthAccountFromDisk(storageV5).catch(() => {
              return;
            });
            if (!sameOwnerAccount(freshAccount, ownerAccount_2)) return;
            await handle.archive?.().catch((prev_5) => {
              logForDebugging(`[bridge:repl] Deferred archive failed: ${errorMessage(prev_5)}`, {
                level: "error",
              });
            });
          };
          deferredArchive.current = handle.archive
            ? {
                fire: archiveIfSameOwner,
                unregister: registerCleanup(archiveIfSameOwner),
              }
            : undefined;
        }
        store((prev_6) => {
          if (!prev_6.replBridgeError) return prev_6;
          autoDisabled = true;
          logEvent("tengu_bridge_repl_auto_disabled", {
            had_session: handle !== null,
          });
          return {
            ...prev_6,
            replBridgeEnabled: false,
            replBridgeSessionGroupingId: undefined,
            ...(handle && {
              replBridgeSkipNextArchive: true,
            }),
          };
        });
      }, BRIDGE_FLUSH_TIMEOUT_MS);
    }
    let pendingPermissionHandlers = new Map();
    let pendingDialogs = new Map();
    let dialogKinds = new Set();
    if (!transcriptRewritten && bridgeSessionIdRef.current !== undefined)
      for (let kind of supportedDialogKinds.current ?? []) dialogKinds.add(kind);
    function handlePermissionResponse(msg_0) {
      let path = getMaterializedPath();
      if (path === null) return;
      saveBridgeSession(
        sessionId,
        msg_0.bridgeSessionId,
        msg_0.getLastSequenceNum(),
        path,
        [...dialogKinds],
        msg_0.sessionGroupingId,
        skipHistoryBackfill.current,
        currentOwnerAccount.current,
        undefined,
        storageV5,
      );
    }
    isForeignSession.current = false;
    sawForeignEvent.current = false;
    let unsubEvents = replBridgeEvents.of(session).subscribe((sourceSessionId, isForeign) => {
      if (isCancelled) return;
      if (isForeign && !isForeignSession.current) return;
      if (isForeignSession.current) {
        sawForeignEvent.current = true;
        return;
      }
      sawForeignEvent.current = false;
      didTranscriptReset.current = false;
    });
    let unsubSwitch = onSessionSwitch((nextSessionId, reason) => {
      if (isCancelled) return;
      let previousSessionId = boundSessionId;
      boundSessionId = nextSessionId;
      if (previousSessionId !== boundSessionId && previousSessionId === sessionId)
        savedTranscriptPath = getMaterializedSessionFile();
      if (reason !== "clear") {
        switch (reason) {
          case "resume":
          case "spare_claim":
            isForeignSession.current = nextSessionId !== sessionId;
            break;
          case "fork":
            if (!isForeignSession.current && !didTranscriptReset.current)
              mainLoopModelRef.current = nextSessionId;
            break;
          case "cd":
          case "remote_attach":
          case "hydrate":
          case "startup_custom_id":
            break;
        }
        return;
      }
      isForeignSession.current = false;
      sawForeignEvent.current = false;
      didTranscriptReset.current = false;
      try {
        if (!outboundOnly) {
          let materializedPath =
            previousSessionId === sessionId ? getMaterializedSessionFile() : savedTranscriptPath;
          if (materializedPath !== null) {
            let ownerAccount = currentOwnerAccount.current;
            let oauthAccountInfo = getOauthAccountInfo();
            let ownerMatches = !ownerAccount?.accountUuid || sameOwnerAccount(oauthAccountInfo, ownerAccount);
            let ownerUnreadable = !ownerMatches && !oauthAccountInfo?.accountUuid;
            if (!skipHistoryBackfill.current && ownerMatches)
              clearBridgeSession(
                sessionId,
                materializedPath,
                {
                  targetExists: true,
                },
                storageV5,
              );
            if (!skipHistoryBackfill.current && (ownerMatches || ownerUnreadable))
              deferredClears.current.push({
                sessionId,
                path: materializedPath,
              });
          }
        }
        savedTranscriptPath = null;
        sessionId = getSessionId();
        mainLoopModelRef.current = sessionId;
        transcriptPath = getTranscriptPath();
        forwardedCount.current = 0;
        reboundSession = true;
        let handle = teardownPromiseRef.current;
        if (handle && !outboundOnly)
          restoreSessionMetadata({
            bridgeSessionId: handle.bridgeSessionId,
            bridgeLastSeq: handle.getLastSequenceNum(),
            bridgeDialogKinds: [...dialogKinds],
            bridgeSessionGroupingId: handle.sessionGroupingId,
            bridgeNoHistoryBackfill: skipHistoryBackfill.current || undefined,
            bridgeOwnerAccountUuid: currentOwnerAccount.current?.accountUuid,
            bridgeOwnerOrganizationUuid: currentOwnerAccount.current?.organizationUuid,
          });
      } catch (error) {
        logForDebugging(`[bridge:repl] /clear repoint failed: ${errorMessage(error)}`, {
          level: "error",
        });
        logError(error);
      }
    });
    function handleControlResponse(message) {
      let requestId = message.response?.request_id;
      if (!requestId) return false;
      let handler = pendingDialogs.get(requestId);
      if (handler) {
        let inner = message.response;
        if (inner.subtype !== "success" || !inner.response || !isDialogResponse(inner.response)) {
          logForDebugging(
            `[bridge:repl] Ignoring non-dialog-shaped control_response for pending dialog request_id=${requestId}`,
            {
              level: "verbose",
            },
          );
          return false;
        }
        pendingDialogs.delete(requestId);
        handler.handler(inner.response);
        return true;
      }
      let permissionEntry = pendingPermissionHandlers.get(requestId);
      if (!permissionEntry) {
        logForDebugging(
          `[bridge:repl] No handler for control_response request_id=${requestId} (late response after local resolve, stale reattach dialog, or unknown id)`,
          {
            level: "verbose",
          },
        );
        return false;
      }
      let response = message.response;
      if (response.subtype === "success" && response.response) {
        let bridgePermissionResponse = parseBridgePermissionResponse(response.response);
        if (!bridgePermissionResponse) return false;
        if (isValidBridgeToolName(bridgePermissionResponse.toolName, permissionEntry.toolName, requestId))
          return false;
        pendingPermissionHandlers.delete(requestId);
        permissionEntry.handler(bridgePermissionResponse);
        return true;
      }
      pendingPermissionHandlers.delete(requestId);
      return true;
    }
    let unusedFlag = false;
    let unusedRef = null;
    let onBridgeInjectedMcp = undefined;
    let policyDisabledText;
    function handleStateChange_2(state, detail, kind) {
      logForDebugging(
        `[bridge:repl] handleStateChange state=${state} detail="${detail}" kind=${kind} cancelled=${isCancelled} outboundOnly=${outboundOnly}`,
      );
      if (isCancelled) return;
      if (state === "policy_disabled") {
        policyDisabledText = detail ?? "disabled by your organization's policy";
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
      let handle = teardownPromiseRef.current;
      switch (state) {
        case "ready":
          removeNotification(BRIDGE_FAILED);
          ownerAccount.current = currentOwnerAccount.current;
          store((prev) => {
            let sessionUrl = handle
              ? getRemoteSessionUrl(handle.bridgeSessionId, handle.sessionIngressUrl)
              : prev.replBridgeSessionUrl;
            let envId = handle?.environmentId;
            let sessionId = handle?.bridgeSessionId;
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
          if (handle && !state.replBridgeConnected) logBridgeRateLimitForward(handle);
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
          sendInitFrame({
            seedPermissionMode: true,
          });
          if (handle && !readyPushSent.current && !hadInteraction.current) {
            let kairosReadyNudgeConfig = getKairosReadyNudgeConfig();
            if (
              kairosReadyNudgeConfig &&
              canSendReadyPush(kairosReadyNudgeConfig, replBridgeExplicit, wasReattached)
            ) {
              readyPushSent.current = true;
              if (
                kairosReadyNudgeConfig.probability >= 1 ||
                Math.random() < kairosReadyNudgeConfig.probability
              ) {
                handle.writeSdkMessages([
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
          notifyBridgeFailed(detail, handle !== null);
          let errorKind = kind ?? (isRevive ? "auth" : "terminal");
          store((prev) => ({
            ...prev,
            replBridgeError: detail,
            replBridgeErrorKind: errorKind,
            replBridgeReconnecting: false,
            replBridgeSessionActive: false,
            replBridgeConnected: false,
          }));
          if (errorKind === "auth") refreshCredentials();
          handleStateChange(detail, errorKind);
          scheduleDisableOnError();
          break;
        }
      }
    }
    let isRevive = isReviveInitiated.current;
    isReviveInitiated.current = false;
    let expectedOwner_2 = expectedOwner.current;
    expectedOwner.current = undefined;
    let sessionId_2 = sessionId;
    let materializedSessionFile = getMaterializedSessionFile();
    let transcriptTorn =
      materializedSessionFile !== null && !isOwnTranscriptFile(sessionId_2, materializedSessionFile);
    let transcriptPath_2 = transcriptTorn ? undefined : (materializedSessionFile ?? transcriptPath);
    (async () => {
      try {
        if (lastWrittenIndexRef.current) {
          logForDebugging("[bridge:repl] Hook: waiting for previous teardown to complete before re-init");
          await lastWrittenIndexRef.current;
          lastWrittenIndexRef.current = undefined;
          logForDebugging("[bridge:repl] Hook: previous teardown complete, proceeding with re-init");
        }
        if (isCancelled) return;
        let { initReplBridge, REPL_WORKSPACE_DIFF_COMPUTE_BUDGET } =
          await import("../bridge/HEADLESS_BRIDGE_WORKSPACE_DIFF_COMPUTE_BUDGET.lazy.js");
        let suppressBackfill = false;
        let ownerUnreadable = false;
        let freshAccount;
        if (bridgeSessionIdRef.current !== undefined) {
          let stashedOwner = rowOwnerAccount.current;
          let credentialSnapshot = await readFreshOAuthCredentialSnapshot(storageV5, credentials).catch(
            () => {
              return;
            },
          );
          if (credentialSnapshot?.accountUuid)
            freshAccount = {
              accountUuid: credentialSnapshot.accountUuid,
              organizationUuid: credentialSnapshot.organizationUuid,
            };
          if (isCancelled) return;
          ownerUnreadable = !stashedOwner?.accountUuid;
          let credentialUnreadable = Boolean(stashedOwner?.accountUuid) && !credentialSnapshot?.accountUuid;
          let ownerMismatch =
            Boolean(stashedOwner?.accountUuid) &&
            Boolean(credentialSnapshot?.accountUuid) &&
            !sameOwnerAccount(credentialSnapshot, stashedOwner);
          if (ownerMismatch || credentialUnreadable) {
            if (isRevive) {
              logForDebugging(
                "[bridge:repl] Auto-revive aborted: stash owner vs current account mismatch/unreadable at init",
              );
              deferredArchive.current?.unregister();
              deferredArchive.current = undefined;
              autoDisabled = true;
              store((prev_10) => ({
                ...prev_10,
                replBridgeEnabled: false,
                replBridgeError: BRIDGE_ACCOUNT_UNVERIFIED_HINT,
                replBridgeErrorKind: "terminal",
              }));
              return;
            }
            logForDebugging(
              ownerMismatch
                ? "[bridge:repl] Reattach stash owner differs from current credential account \u2014 dropping stash, minting fresh (history not uploaded)"
                : "[bridge:repl] Current account identity unreadable with an owned stash \u2014 dropping stash, minting fresh (history not uploaded)",
            );
            suppressBackfill = true;
            deferredArchive.current?.unregister();
            deferredArchive.current = undefined;
            holdPrecautionarySuppressionFor(pinSessionId(sessionId_2));
            markPrecautionClearResilientFor(pinSessionId(sessionId_2));
            claimPrecautionHoldForObservedCause(pinSessionId(sessionId_2));
            if (ownerMismatch && !transcriptTorn) logFeatureOk("rc_cross_account_suppression");
            else
              logFeatureSad(
                "rc_cross_account_suppression",
                transcriptTorn ? "torn_entry_pair" : "identity_unreadable",
              );
            if (ownerMismatch && !transcriptTorn)
              await writeHistorySuppression(
                sessionId_2,
                transcriptPath_2,
                "chokepoint_veto",
                credentialSnapshot?.accountUuid,
                storageV5,
              );
            else if (ownerMismatch)
              logForDebugging(
                "[bridge:repl] Chokepoint veto under a TORN entry pair: precautionary suppression only, no permanent taint write",
                {
                  level: "warn",
                },
              );
            resetBinding({
              archiveAbandoned: false,
            });
            dialogKinds.clear();
            if (getSessionId() === sessionId_2) clearBridgeSessionCache();
          }
        }
        let suppressedThisSession = backfillSuppressedSession.current === sessionId_2;
        skipHistoryBackfill.current =
          suppressBackfill || suppressedThisSession || (ownerUnreadable && transcriptRewritten);
        let ownerAccount_2 =
          freshAccount ??
          (await readFreshOauthAccountFromDisk(storageV5).catch(() => {
            return;
          }));
        if (isCancelled) return;
        currentOwnerAccount.current = ownerAccount_2;
        let dropStash = ownerUnreadable && transcriptRewritten;
        let reattachSessionId = transcriptRewritten ? undefined : bridgeSessionIdRef.current;
        let declinedHolder;
        let apply = (budget, display) => {
          let displayRefusal;
          if (display != null) {
            let thinkingDisplayOverride = getThinkingDisplayOverride(flag);
            if (thinkingDisplayOverride !== undefined && thinkingDisplayOverride.display !== display) {
              let budgetNote = budget === undefined ? "budget unchanged" : "budget applied";
              logForDebugging(
                `[bridge:repl] set_max_thinking_tokens: thinking_display=${display} not applied (local ${thinkingDisplayOverride.source} chose ${thinkingDisplayOverride.display}); ${budgetNote}`,
              );
              displayRefusal = {
                ok: false,
                error: `set_max_thinking_tokens: ${budgetNote}; thinking_display not applied, the display stays ${thinkingDisplayOverride.display} because the terminal user set it with ${thinkingDisplayOverride.source === "flag" ? "--thinking-display" : "the showThinkingSummaries setting"}`,
              };
            }
          }
          let thinkingEnabled;
          if (budget !== undefined) {
            let thinkingConfig = thinkingConfigFor(budget, undefined, spawnThinkingConfig);
            thinkingEnabled = thinkingConfig ? thinkingConfig.type !== "disabled" : isBetaHeaderAllowed();
          }
          store((prev_11) => {
            let enabled = thinkingEnabled ?? prev_11.thinkingEnabled;
            let displayOverride =
              display === undefined || displayRefusal !== undefined
                ? prev_11.thinkingDisplayOverride
                : (display ?? undefined);
            if (prev_11.thinkingEnabled === enabled && prev_11.thinkingDisplayOverride === displayOverride)
              return prev_11;
            return {
              ...prev_11,
              thinkingEnabled: enabled,
              thinkingDisplayOverride: displayOverride,
            };
          });
          return displayRefusal;
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
          mainLoopModel: getMainLoopModel_2,
          getContextUsageInputs,
        });
        let replBridge = await initReplBridge({
          outboundOnly,
          ...false,
          suppressHistoryBackfill: suppressBackfill || suppressedThisSession || dropStash,
          onHistoryBackfillSuppressed: (suppressionInfo) => {
            if (isCancelled) return;
            if (suppressionInfo?.uncertaintyOnly) return;
            skipHistoryBackfill.current = true;
            backfillSuppressedSession.current = sessionId_2;
          },
          reattachOrFail: (isRevive && bridgeSessionIdRef.current !== undefined) || ownerUnreadable,
          reviveInitiated: isRevive,
          onReattachPointerDead: () => {
            resetBinding({
              archiveAbandoned: false,
            });
            backfillSuppressedSession.current = skipHistoryBackfill.current ? sessionId_2 : undefined;
            if (isBgSession()) clearBridgeSessionFromJobState(storageV5);
          },
          localHolderGuard:
            !replBridgeExplicit || isRevive
              ? {
                  mode: "decline",
                  onDeclined: (holderPid) => {
                    declinedHolder = holderPid;
                  },
                }
              : {
                  mode: "observe",
                },
          expectedAccount: isRevive ? expectedOwner_2 : undefined,
          onAuthProven: () => {
            authReviveCount.current = 0;
          },
          reattachSessionId,
          reattachSequenceNum: transcriptRewritten ? undefined : lastSequenceNumRef.current,
          tags: outboundOnly
            ? [CCR_MIRROR]
            : [replBridgeExplicit ? REMOTE_CONTROL_REPL : REMOTE_CONTROL_AUTO],
          getToolPermissionContext: () => store_2.getState().toolPermissionContext,
          host: session.host,
          workspaceDiffComputeBudget: REPL_WORKSPACE_DIFF_COMPUTE_BUDGET,
          getTools: () => getContextUsageInputs().tools,
          onQueuedNotification: (notification) =>
            acceptQueuedNotification(notification, {
              getAppState: () => store_2.getState(),
              setAppState: store,
              session,
            }),
          onInboundMessage: (prev_12) => {
            {
              let { noteOwnerInboxNoticeDelivery } = require("../bridge/sessionInboxPointers.js");
              noteOwnerInboxNoticeDelivery(session, prev_12);
            }
            return handleBridgeInbound(
              queue,
              prev_12,
              (text, origin, relayAuthored) => runImmediateCommand(text, origin, relayAuthored),
              undefined,
              () => {
                let next = cancelPendingDialogs(
                  pendingDialogs,
                  (currentQueue) => teardownPromiseRef.current?.sendControlCancelRequest(currentQueue),
                  REFUSAL_FALLBACK_DIALOG.kind,
                );
                for (let dialogKind of next)
                  logEvent("tengu_request_user_dialog_implicit_cancel", {
                    dialog_kind: shortHash(dialogKind),
                    reason: fromEnum("new_user_message"),
                    lane: lit_2("repl_bridge"),
                  });
              },
              () => switchSerializerSlot.of(session).tail,
              storageV5,
              credentials,
            );
          },
          onPermissionResponse: handleControlResponse,
          getInitializeState() {
            return {
              current_model: getMainLoopModel_2(),
              current_permission_mode: toExternalPermissionMode(
                store_2.getState().toolPermissionContext.mode,
              ),
            };
          },
          getCommands: () => logBridgeInitializeCommands(getCommands()),
          onClientInitialize: outboundOnly
            ? undefined
            : () =>
                sendInitFrame({
                  seedPermissionMode: true,
                }),
          onDialogKindsDeclared: outboundOnly
            ? undefined
            : (kinds, revision) => {
                logBridgeDialogKindsDeclared(dialogKinds, kinds, revision, () => {
                  let handle = teardownPromiseRef.current;
                  if (handle) handlePermissionResponse(handle);
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
            : dedupeByRequestId((payload, requestId) =>
                handleRcForkConversation(payload, requestId, {
                  getMessages: transcript.getSnapshot,
                  isTurnActive,
                  queuedCommandCount: queue.getDrainableMainThreadQueueLength,
                  ownBridgeSessionId: () => teardownPromiseRef.current?.bridgeSessionId,
                  ownSessionGroupingId: () => teardownPromiseRef.current?.sessionGroupingId,
                  getLaunchState: store_2.getState,
                  recordChildBridgeSession: (jobShort, bridgeSessionId, groupingId) =>
                    persistBridgeSessionToJobState(
                      getJobDir(jobShort),
                      bridgeSessionId,
                      false,
                      groupingId,
                      undefined,
                      false,
                      storageV5,
                    ),
                  credentials,
                  storageV5,
                  getTools: () => getContextUsageInputs().tools,
                  host: session.host,
                }),
              ),
          onSetModel(model) {
            let isDefault = model == null || model.trim().toLowerCase() === "default";
            let targetModel = isDefault ? getDefaultMainLoopModel() : model;
            let denial = isDefault ? managedDenyStartupRefusal(targetModel, "switch") : null;
            if (denial !== null)
              return {
                ok: false,
                error: denial,
              };
            if (!isDefault) {
              let refusal = logUnrecognizedModelSwitch(targetModel, lit_2("bridge_repl"));
              if (refusal) return refusal;
            }
            let previousOverride = (prev_13) => (isDefault ? null : prev_13);
            let notAllowed =
              !isDefault &&
              !isExemptDefaultResolvingPick(targetModel) &&
              !(isModelAllowedUnderActiveEnforcement(targetModel) ?? isModelAllowed(targetModel));
            let steppedDownModel = notAllowed ? stepDownRestrictedFamilyAliasPick(targetModel) : null;
            let setAppState = steppedDownModel ?? targetModel;
            if (notAllowed && steppedDownModel === null) {
              let state = store_2.getState();
              let restrictedNotice = formatModelRestrictedNotice(
                setAppState,
                parseUserSpecifiedModel(
                  resolveMainLoopModel(state.mainLoopModelForSession, state.mainLoopModel),
                ),
              );
              addNotification({
                key: `model-restricted-bridge-${displayModelName_2(setAppState)}`,
                kind: "warning",
                text: restrictedNotice,
                priority: "immediate",
              });
              logFeatureBad("model_switch", "not_allowed");
              return {
                ok: false,
                error: restrictedNotice,
              };
            }
            let applyModelSwitch = () => {
              if (steppedDownModel !== null)
                addNotification({
                  key: `model-restricted-bridge-${displayModelName_2(targetModel)}`,
                  kind: "warning",
                  text: formatModelRestrictedNotice(targetModel, steppedDownModel),
                  priority: "immediate",
                });
              if (steppedDownModel !== null) logFeatureSad("model_switch", "family_alias_stepped_down");
              else logFeatureOk("model_switch");
              if (isFastModeEnabled()) clearFastModeCooldown();
              setMainLoopModelOverride(setAppState);
              let enable;
              let getAppState;
              store((prev_14) => {
                enable = !!prev_14.fastMode;
                let fastOn = isFastModeEnabled()
                  ? isFastModeActive(setAppState, prev_14.fastMode)
                  : !!prev_14.fastMode;
                getAppState = fastOn;
                if (prev_14.mainLoopModelForSession === setAppState && fastOn === !!prev_14.fastMode)
                  return prev_14;
                return {
                  ...prev_14,
                  mainLoopModelForSession: setAppState,
                  ...(fastOn !== !!prev_14.fastMode && {
                    fastMode: fastOn,
                  }),
                };
              });
              if (enable !== undefined && getAppState !== undefined) {
                reportFastModeToggle(enable, getAppState);
                let fastNotice = handleFastModeShortcut(enable, getAppState, setAppState);
                if (fastNotice !== null)
                  addNotification({
                    key: "model-switch-fast-mode",
                    kind: "feedback",
                    text: fastNotice,
                    priority: "immediate",
                    timeoutMs: 3000,
                  });
              }
            };
            let state = store_2.getState();
            if (!hasPreModelSwitchHook(session) && switchSerializerSlot.of(session).pending === 0) {
              recordSwitchIfChanged(session, state, previousOverride(setAppState), "sdk");
              applyModelSwitch();
              return;
            }
            return serializeModelSwitch(session, () =>
              runPreModelSwitchHooks(session, store_2.getState, previousOverride(setAppState), "sdk")
                .then((prev_15) => {
                  if (prev_15.decision !== "proceed") {
                    logFeatureSad("model_switch", "blocked_by_hook");
                    let blockedText = describeModelSwitchBlocked(prev_15);
                    addNotification({
                      key: "model-switch-blocked",
                      kind: "warning",
                      text: blockedText,
                      color: "warning",
                      priority: "immediate",
                    });
                    return {
                      ok: false,
                      error: blockedText,
                    };
                  }
                  if (prev_15.messages.length > 0)
                    addNotification({
                      key: "model-switch-hook-note",
                      kind: "feedback",
                      text: prev_15.messages.map(sanitizeHookText).join(" \xB7 "),
                      priority: "immediate",
                    });
                  recordSwitchIfChanged(session, store_2.getState(), previousOverride(setAppState), "sdk");
                  applyModelSwitch();
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
          onApplyFlagSettings: (settings, requestContext) => {
            let mainLoopModel = getMainLoopModel();
            let effortLevelOrNull = resolveEffortLevelOrNull(
              mainLoopModel,
              resolveEffortLevel(store_2.getState()),
            );
            let applyResult = applyBridgeFlagSettings(settings, {
              model: mainLoopModel,
              getAppState: store_2.getState,
              setAppState: store,
            });
            if (!applyResult.ok) return applyResult;
            reportBridgeEffortForRequest(requestContext);
            if (
              resolveEffortLevelOrNull(mainLoopModel, resolveEffortLevel(store_2.getState())) ===
              effortLevelOrNull
            )
              sendInitFrame();
            return {
              ok: true,
            };
          },
          async onMcpAuthenticate(serverName, redirectUri) {
            let config = store_2
              .getState()
              .mcp.clients.find((prev_16) => prev_16.name === serverName)?.config;
            if (!config)
              throw new WireSafeControlError(
                `MCP server "${normalizeServerNameShort(serverName)}" not found`,
              );
            let assertServerUsable = () => {
              assertToggleableServer(store_2.getState().mcp.clients, serverName);
              let isDisabledHandle = getIsDisabledHandle();
              if (!isDisabledHandle)
                throw new WireSafeControlError(
                  "MCP controls aren't available right now \u2014 the terminal is still starting up or is showing another view",
                );
              if (isDisabledHandle(serverName))
                throw new WireSafeControlError(
                  disabledElsewhereText(serverName),
                  "MCP server disabled in another session; auth refused",
                );
              let dialBlockCause = getDialBlockCauseHandle()?.(serverName, config);
              if (dialBlockCause === "project-approval")
                throw new WireSafeControlError(
                  mcpRefusalText(serverName, dialBlockCause, config),
                  "MCP server not approved for this project; auth refused",
                );
              if (dialBlockCause && judgeGate(serverName, config))
                throw new WireSafeControlError(
                  reservedAddressRefusalText(serverName),
                  "MCP server refused at a reserved address; auth refused",
                );
              if (dialBlockCause)
                throw new WireSafeControlError(
                  mcpRefusalText(serverName, dialBlockCause, config),
                  "MCP server blocked by managed policy; auth refused",
                );
            };
            assertServerUsable();
            recentAuthAt.current.delete(serverName);
            let url = classifyMcpAuthTarget(serverName, config);
            if (url.kind === "claudeai-proxy") {
              let authUrl = claudeAiConnectorAuthUrl(url.config);
              if (!authUrl)
                throw new WireSafeControlError(
                  "Unable to build claude.ai connector auth URL (missing org or server id)",
                );
              logEvent("tengu_claudeai_mcp_auth_started", {});
              return {
                authUrl,
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
            let runOauthFlow = (redirectUri) => {
              let resolveAuthUrl;
              let promise = new Promise((resolve) => {
                resolveAuthUrl = resolve;
              });
              let callbackPort;
              let state;
              let oauthPromise = getMcpAuthModule().performMCPOAuthFlow(
                serverName,
                url.config,
                (authUrl) => resolveAuthUrl(authUrl),
                undefined,
                {
                  skipBrowserOpen: true,
                  redirectUri,
                  onWaitingForCallback: (port, callbackPort_2, oauthState) => {
                    callbackPort = callbackPort_2;
                    state = oauthState;
                  },
                },
              );
              getMcpAuthModule().setActiveOAuthPromise(serverName, oauthPromise);
              oauthPromise.then(
                () => recentAuthAt.current.set(serverName, Date.now()),
                () => {},
              );
              return Promise.race([
                promise.then((authUrl) => ({
                  authUrl,
                  callbackPort,
                  state,
                })),
                oauthPromise.then(() => null),
              ]);
            };
            let flowResult = null;
            let redirectKind = "localhost";
            let useCustomRedirect =
              Boolean(redirectUri) &&
              !url.config.oauth?.clientId &&
              !(await shouldSkipCustomRedirect(serverName, url.config));
            assertServerUsable();
            if (useCustomRedirect)
              try {
                flowResult = await runOauthFlow(redirectUri);
                redirectKind = "custom";
              } catch (error) {
                logForDebugging(
                  `[bridge:mcp] AS rejected custom redirectUri for ${serverName}; falling back to localhost: ${sanitizeErrorDetail(redactMcpErrorDetail(serverName, url.config, errorMessage(error)))}`,
                );
                assertServerUsable();
              }
            if (redirectKind === "localhost")
              try {
                flowResult = await runOauthFlow();
              } catch (error) {
                throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  `MCP OAuth failed for ${serverName}: ${normalizeMcpServerName(redactMcpErrorDetail(serverName, url.config, errorMessage(error)))}`,
                  "MCP OAuth flow failed (detail clamped in the local log)",
                );
              }
            if (!flowResult)
              return {
                requiresUserAction: false,
                callbackExpected: false,
              };
            return {
              authUrl: flowResult.authUrl,
              requiresUserAction: true,
              callbackExpected: true,
              redirectScheme: redirectKind,
              state: flowResult.state,
              ...(redirectKind === "localhost" && {
                callbackPort: flowResult.callbackPort,
              }),
            };
          },
          async onMcpOauthCallbackUrl(serverName, callbackUrl) {
            let oAuthCallbackSubmitter = getMcpAuthModule().getOAuthCallbackSubmitter(serverName);
            if (!oAuthCallbackSubmitter)
              throw new WireSafeControlError(
                `No OAuth flow in progress for "${normalizeServerNameShort(serverName)}" \u2014 call mcp_authenticate first`,
              );
            if (!oAuthCallbackSubmitter(callbackUrl))
              throw new WireSafeControlError(
                "Invalid callback URL \u2014 no authorization code, or it belongs to a different sign-in attempt (state mismatch). The flow is still open; retry with the full redirect URL from this sign-in.",
              );
            let activeOAuthPromise = getMcpAuthModule().getActiveOAuthPromise(serverName);
            if (activeOAuthPromise)
              try {
                await activeOAuthPromise;
              } catch (error) {
                let config = store_2
                  .getState()
                  .mcp.clients.find((client) => client.name === serverName)?.config;
                throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  `MCP OAuth failed for ${serverName}: ${config ? normalizeMcpServerName(redactMcpErrorDetail(serverName, config, errorMessage(error))) : "[error detail unavailable: server configuration could not be located]"}`,
                  "MCP OAuth completion failed (detail clamped in the local log)",
                );
              }
          },
          async onMcpReconnect(serverName) {
            let reconnectHandle = getReconnectHandle();
            if (!reconnectHandle)
              throw new WireSafeControlError(
                "MCP controls aren't available right now \u2014 the terminal is still starting up or is showing another view",
              );
            assertToggleableServer(store_2.getState().mcp.clients, serverName);
            let reconnectResult = await reconnectHandle(serverName, {
              discardDiscovery: !takeRecentWithin(recentAuthAt.current, serverName),
            });
            assertMcpReconnected(reconnectResult.client);
          },
          answerSharedControlRequest: (request) => dispatchLocalControlRequest(request, context),
          onSetColor(agentColor) {
            let isDefault = agentColor === "default";
            if (!isDefault && !AGENT_COLOR_NAMES.includes(agentColor))
              return {
                ok: false,
                error: `Unknown color "${agentColor}". Available: ${AGENT_COLOR_NAMES.join(", ")}, default`,
              };
            let color = isDefault ? undefined : agentColor;
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
            let agentDefinition = state.agent
              ? state.agentDefinitions.activeAgents.find((prev_18) => prev_18.agentType === state.agent)
              : undefined;
            syncJobColor(
              getOwnJobShortId(),
              getEffectiveAgentColor({
                userOverride: color,
                agentDefinitionColor: agentDefinition?.color,
              }),
              storageV5,
            );
            store((prev) => {
              if (prev.standaloneAgentContext?.color === color) return prev;
              return {
                ...prev,
                standaloneAgentContext: {
                  ...prev.standaloneAgentContext,
                  name: prev.standaloneAgentContext?.name ?? "",
                  color,
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
            suppressBackfill || dropStash
              ? undefined
              : initialMessageLimit !== undefined
                ? messages.slice(0, initialMessageLimit)
                : messages.length > 0
                  ? messages
                  : undefined,
          getMessages: transcript.getSnapshot,
          remoteControlOrigin,
          getBackfillMessages: (bridgeSessionId) => {
            if (isForeignSession.current || didTranscriptReset.current || sawForeignEvent.current) return;
            return transcript
              .getSnapshot()
              .filter(
                (message) =>
                  pulledRowsBySession.current.get(message.uuid)?.has(bridgeSessionId) !== true &&
                  !(
                    isCompactBoundaryOrSummary(message) &&
                    (isForegroundBinding() || isCompactPairWithheldFromRemote())
                  ),
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
        if (bindingToken.current === bindingToken_2) {
          bindingToken.current = undefined;
          if (!replBridge) rebindPendingRows(resolveBridgeSessionId(bindingToken_2.sid));
        }
        if (isCancelled) {
          logForDebugging("[bridge:repl] Hook: init cancelled during flight, tearing down");
          if (replBridge) replBridge.teardown();
          return;
        }
        if (!replBridge && declinedHolder) {
          logForDebugging(
            `[bridge:repl] Init declined: session held by local pid ${declinedHolder.pid}; leaving Remote Control off`,
          );
          if (!outboundOnly) {
            let statusLines = bridgeStatusLines(declinedHolder, {
              crossSessionMessaging: isCrossSessionMessagingEnabled(),
            });
            transcript.replace((messages) => {
              let last = messages.at(-1);
              if (
                last?.type === "system" &&
                last.subtype === "informational" &&
                typeof last.content === "string" &&
                last.content.startsWith(REMOTE_CONTROL_NOT_STARTED_TEXT)
              )
                return messages;
              return [...messages, createSystemMessage(statusLines, "warning")];
            });
          }
          store((prev) =>
            prev.replBridgeEnabled || prev.replBridgeAutoOnByDefault
              ? {
                  ...prev,
                  replBridgeEnabled: false,
                  replBridgeSessionGroupingId: undefined,
                  replBridgeAutoOnByDefault: false,
                }
              : prev,
          );
          return;
        }
        if (!replBridge && policyDisabledText !== undefined) {
          let policyText = policyDisabledText;
          logForDebugging("[bridge:repl] Init declined by org policy; leaving Remote Control off");
          if (!outboundOnly)
            transcript.replace((messages) =>
              messages.some(
                (message) =>
                  message.type === "system" &&
                  message.subtype === "informational" &&
                  message.content === policyText,
              )
                ? messages
                : [...messages, createSystemMessage(policyText, "notice")],
            );
          store((prev) =>
            prev.replBridgeEnabled || prev.replBridgeAutoOnByDefault
              ? {
                  ...prev,
                  replBridgeEnabled: false,
                  replBridgeSessionGroupingId: undefined,
                  replBridgeAutoOnByDefault: false,
                }
              : prev,
          );
          return;
        }
        if (!replBridge) {
          if (!isRevive) consecutiveFailures.current++;
          reportConcurrentBridgeSessions(outboundOnly);
          logForDebugging(
            `[bridge:repl] Init returned null (precondition or session creation failed); consecutive failures: ${consecutiveFailures.current}`,
          );
          messagesRef.current?.();
          if (store_2.getState().replBridgeError !== undefined) scheduleDisableOnError();
          else if (replBridgeExplicit && !outboundOnly && isBridgeEnabled())
            failBridge(BRIDGE_LOGIN_HINT, "auth");
          else
            store((prev) =>
              prev.replBridgeEnabled
                ? {
                    ...prev,
                    replBridgeEnabled: false,
                    replBridgeSessionGroupingId: undefined,
                  }
                : prev,
            );
          return;
        }
        teardownPromiseRef.current = replBridge;
        setReplBridgeHandle(replBridge, storageV5);
        setCurrentForKey(session, undefined);
        registerLiveSuppressionProbe(() => getReplBridgeHandle()?.noHistoryBackfill === true);
        ownerAccount.current = currentOwnerAccount.current;
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
        logBridgeRateLimitForward(replBridge);
        detectCurrentRepositoryWithHost();
        consecutiveFailures.current = 0;
        if (!outboundOnly) removeNotification(BRIDGE_FAILED);
        if (
          resetBinding({
            archiveAbandoned: transcriptRewritten,
          })
        )
          logEvent("tengu_bridge_compacted_while_disabled_remint", {});
        let reattachedSame =
          reattachSessionId !== undefined && replBridge.bridgeSessionId === reattachSessionId;
        forwardedCount.current = reboundSession
          ? 0
          : reattachedSame
            ? (initialMessageLimit ?? messageCount)
            : messageCount;
        rebindPendingRows(replBridge.bridgeSessionId);
        if (!reboundSession) {
          pulledWindow.current.sid = sessionId;
          for (let message of messages)
            if (!pulledRowsBySession.current.get(message.uuid)?.has(replBridge.bridgeSessionId)) {
              pulledWindow.current.rows.add(message.uuid);
              pulledWindow.current.tip = message.uuid;
            }
        }
        seenUuids.current = new Set(messages.slice(0, forwardedCount.current).map((message) => message.uuid));
        uploadWindow.current =
          forwardedCount.current > 0
            ? {
                head: messages[0]?.uuid,
              }
            : {};
        didTranscriptReset.current = false;
        if (isBgSession())
          persistBridgeSessionToJobState(
            process.env.CLAUDE_JOB_DIR,
            replBridge.bridgeSessionId,
            outboundOnly,
            replBridge.sessionGroupingId,
            ownerAccount_2 && {
              accountUuid: ownerAccount_2.accountUuid,
              organizationUuid: ownerAccount_2.organizationUuid,
            },
            skipHistoryBackfill.current,
            storageV5,
          );
        else if (!outboundOnly) handlePermissionResponse(replBridge);
        if (outboundOnly) {
          store((prev) => {
            if (prev.replBridgeConnected && prev.replBridgeSessionId === replBridge.bridgeSessionId)
              return prev;
            return {
              ...prev,
              replBridgeConnected: true,
              replBridgeSessionId: replBridge.bridgeSessionId,
              replBridgeSessionUrl: undefined,
              replBridgeConnectUrl: undefined,
            };
          });
          logForDebugging(`[bridge:repl] Mirror initialized, session=${replBridge.bridgeSessionId}`);
        } else {
          permissionRelays.connectBridge({
            permission: createBridgePermissionCallbacks(replBridge, pendingPermissionHandlers),
            dialog: createBridgeDialogCallbacks(replBridge, pendingDialogs, dialogKinds),
          });
          let url = getRemoteSessionUrl(replBridge.bridgeSessionId, replBridge.sessionIngressUrl);
          store((prev) => ({
            ...prev,
            replBridgeConnected: true,
            replBridgeSessionUrl: url,
            replBridgeEnvironmentId: replBridge.environmentId,
            replBridgeSessionId: replBridge.bridgeSessionId,
            replBridgeError: undefined,
            replBridgeErrorKind: undefined,
          }));
          if (replBridgeExplicit)
            transcript.replace((messages) =>
              messages.some(
                (message) =>
                  message.type === "system" && message.subtype === "bridge_status" && message.url === url,
              )
                ? messages
                : [...messages, createBridgeStatusMessage(url)],
            );
          logForDebugging(`[bridge:repl] Hook initialized, session=${replBridge.bridgeSessionId}`);
        }
      } catch (err) {
        if (bindingToken.current === bindingToken_2) {
          bindingToken.current = undefined;
          rebindPendingRows(resolveBridgeSessionId(bindingToken_2.sid));
        }
        if (isCancelled) return;
        if (!isRevive) consecutiveFailures.current++;
        reportConcurrentBridgeSessions(outboundOnly);
        let errMsg = errorMessage(err);
        logForDebugging(
          `[bridge:repl] Init failed: ${errMsg}; consecutive failures: ${consecutiveFailures.current}`,
        );
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
        else failBridge(errMsg, isRevive ? "auth" : "terminal");
      }
    })();
    return () => {
      isCancelled = true;
      if (bindingToken.current === bindingToken_2) {
        bindingToken.current = undefined;
        rebindPendingRows(resolveBridgeSessionId(bindingToken_2.sid));
      }
      unsubSwitch();
      unsubEvents();
      setDropNotifier(undefined);
      messagesRef.current?.();
      messagesRef.current = undefined;
      let replBridgeSkipNextArchive = store_2.getState().replBridgeSkipNextArchive;
      let hasUndeliveredReset =
        !outboundOnly && hasQueuedTaskNotification((prev_1) => prev_1.type === "conversation_reset");
      if (hasUndeliveredReset) {
        logFeatureSad("bridge_conversation_reset", "undelivered_at_teardown");
        setCurrentForKey(session, undefined);
        resetBinding({
          archiveAbandoned: teardownPromiseRef.current === null,
        });
        flushDeferredClears();
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
        let handle = teardownPromiseRef.current;
        let userDisabled = !store_2.getState().replBridgeEnabled && !autoDisabled;
        let shouldClearSession = (userDisabled && !replBridgeSkipNextArchive) || hasUndeliveredReset;
        let unusedFlag = replBridgeSkipNextArchive && !(autoDisabled && hasUndeliveredReset);
        if (!autoDisabled)
          resetBinding({
            archiveAbandoned: false,
          });
        ownerAccount.current = undefined;
        if (!outboundOnly)
          if (shouldClearSession) {
            let path = getMaterializedPath();
            if (path !== null) clearBridgeSession(sessionId, path, undefined, storageV5);
            flushDeferredClears();
            if (isBgSession()) clearBridgeSessionFromJobState(storageV5);
          } else if (replBridgeSkipNextArchive && !autoDisabled) clearBridgeSessionCache();
          else handlePermissionResponse(handle);
        let replBridgeEnabled =
          outboundOnly !== store_2.getState().replBridgeOutboundOnly && store_2.getState().replBridgeEnabled;
        let clearProblem =
          replBridgeSkipNextArchive || autoDisabled || replBridgeEnabled
            ? undefined
            : userDisabled
              ? "remote_control_disabled"
              : "host_exit";
        logForDebugging(
          `[bridge:repl] Hook cleanup: starting teardown for session=${handle.bridgeSessionId}${unusedFlag ? " (skipArchive)" : ""}${clearProblem ? ` reason=${clearProblem}` : ""}`,
        );
        lastWrittenIndexRef.current = handle.teardown({
          skipArchive: unusedFlag,
          reason: clearProblem,
        });
        teardownPromiseRef.current = null;
        setReplBridgeHandle(null, storageV5);
        noopHandler(handle);
        setCurrentForKey(session, undefined);
        registerLiveSuppressionProbe(undefined);
      }
      if (!autoDisabled && !outboundOnly) removeNotification(BRIDGE_FAILED);
      permissionRelays.disconnectBridge();
      detachPendingDialogs(pendingDialogs);
      store((prev_19) => {
        let replBridgeError = autoDisabled || outboundOnly ? prev_19.replBridgeError : undefined;
        let replBridgeErrorKind = autoDisabled || outboundOnly ? prev_19.replBridgeErrorKind : undefined;
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
      forwardedCount.current = 0;
      seenUuids.current = new Set();
      uploadWindow.current = {};
    };
  }, [
    replBridgeEnabled,
    replBridgeOutboundOnly,
    isSpareProcess,
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
  function forwardTranscriptDelta(messages) {
    let state = store_2.getState();
    if (!state.replBridgeConnected) return;
    let handle_1 = teardownPromiseRef.current;
    if (!handle_1) return;
    if (shouldSkipConversationReset(handle_1, state.replBridgeSessionActive)) return;
    let wasDetached = sawForeignEvent.current;
    sawForeignEvent.current = false;
    try {
      let seenUuids_2 = seenUuids.current;
      let { head, tail, eligible } = uploadWindow.current;
      let headMatches = head === undefined || messages[0]?.uuid === head;
      let eligibleMatches = eligible === undefined || messages[eligible.index]?.uuid === eligible.uuid;
      let startIndex = 0;
      if (wasDetached) {
        didTranscriptReset.current = true;
        logForDebugging(
          `[bridge:repl] Transcript replaced under a detached binding \u2014 ${messages.length} message(s) accounted as seen, not uploaded`,
        );
      } else {
        if (headMatches && eligibleMatches) {
          if (tail !== undefined && messages[tail.index]?.uuid === tail.uuid) startIndex = tail.index + 1;
          else if (eligible !== undefined) startIndex = eligible.index + 1;
        }
        if (startIndex === 0 && (tail !== undefined || eligible !== undefined))
          logForDebugging(
            `[bridge:repl] Transcript rewrite detected (messages.length=${messages.length}), rescanning`,
          );
      }
      let eligible_2 = startIndex > 0 ? eligible : undefined;
      let newMessages = [];
      let subagentFrames = [];
      let toolset;
      let bridgeSubagentFrameGate = getBridgeSubagentFrameGate();
      for (let index = startIndex; index < messages.length; index++) {
        let msg_1 = messages[index];
        if (!msg_1 || !isEligibleBridgeMessage(msg_1)) {
          if (msg_1 && extractAgentIdsFromMessages_2(msg_1) && !seenUuids_2.has(msg_1.uuid)) {
            seenUuids_2.add(msg_1.uuid);
            if (!wasDetached && bridgeSubagentFrameGate.enabled) {
              toolset ??= getContextUsageInputs().tools;
              for (let frame of subagentProgressToSDKMessages(msg_1, toolset))
                if (shouldForwardSubagentMessage(bridgeSubagentFrameGate, frame)) subagentFrames.push(frame);
            }
          }
          continue;
        }
        eligible_2 = {
          index,
          uuid: msg_1.uuid,
        };
        if (seenUuids_2.has(msg_1.uuid)) continue;
        seenUuids_2.add(msg_1.uuid);
        if (
          wasDetached ||
          pulledRowsBySession.current.get(msg_1.uuid)?.has(handle_1.bridgeSessionId) === true
        )
          continue;
        if (
          isCompactBoundaryOrSummary(msg_1) &&
          (didTranscriptReset.current || isForegroundBinding() || isCompactPairWithheldFromRemote())
        )
          continue;
        newMessages.push(msg_1);
      }
      forwardedCount.current = messages.length;
      let last = messages.at(-1);
      uploadWindow.current = {
        head: messages[0]?.uuid,
        tail: last && {
          index: messages.length - 1,
          uuid: last.uuid,
        },
        eligible: eligible_2,
      };
      forwardQueuedSdkEventsToBridge(handle_1);
      if (newMessages.length > 0) handle_1.writeMessages(newMessages);
      if (subagentFrames.length > 0) handle_1.writeSdkMessages(subagentFrames);
    } catch (error) {
      if (wasDetached) sawForeignEvent.current = true;
      logError(error);
    }
  }
  useEffect(() => {
    forwardTranscriptDelta(messages);
  }, [messages, replBridgeConnected, replBridgeSessionActive]);
  useEffect(() => {
    if (!replBridgeConnected) return;
    let forwardEvents = () => {
      let handle = teardownPromiseRef.current;
      if (!handle || shouldSkipConversationReset(handle, store_2.getState().replBridgeSessionActive)) return;
      forwardQueuedSdkEventsToBridge(handle);
    };
    setTaskNotificationListener(forwardEvents);
    forwardEvents();
    return () => setTaskNotificationListener(null);
  }, [replBridgeConnected, replBridgeSessionActive]);
  useForwardRateLimitEventsToBridge(replBridgeConnected, getHandle);
  useEffect(() => {
    if (!replBridgeEnabled) {
      let notifications = drainTaskNotifications();
      let hadTaskNotification = false;
      let hadLevel = false;
      for (let notification of notifications)
        if (notification.subtype === "task_notification") hadTaskNotification = true;
        else if (notification.subtype === "background_tasks_changed") hadLevel = true;
      if (hadTaskNotification || hadLevel)
        logFeatureSad(
          "ccr_task_status_publish",
          store_2.getState().replBridgeError !== undefined
            ? "status_discarded_failed_init"
            : "status_discarded_user_disable",
          {
            has_terminal_bookend: hadTaskNotification,
            has_level: hadLevel,
          },
        );
    }
  }, [replBridgeEnabled]);
  useEffect(() => {
    if (
      replBridgeEnabled ||
      replBridgeError === undefined ||
      replBridgeErrorKind !== "auth" ||
      replBridgeOutboundOnly ||
      !isBridgeAuthReviveEnabled()
    )
      return;
    let isStopped = false;
    let pollTimer;
    let pollIntervalMs = 300000;
    async function pollAuth() {
      let credentialsChanged =
        loginEvents.getSnapshot().credentialsPersisted !== credentialsPersistedRef.current;
      let killSwitchOff = !isBridgeAuthReviveEnabled();
      let reviveBraked =
        killSwitchOff || (!credentialsChanged && authReviveCount.current >= AUTH_REVIVE_POLL_LIMIT);
      if (reviveBraked)
        logForDebugging(
          killSwitchOff
            ? "[bridge:repl] Auth-revive watcher: kill switch off \u2014 still polling, no unattended revive"
            : "[bridge:repl] Auth-revive watcher: non-interactive revive brake engaged \u2014 still polling; an in-process /login bypasses",
        );
      let baselinePending = accessTokenRef.current === BASELINE_PENDING_SENTINEL;
      let snapshot;
      try {
        snapshot =
          reviveBraked || baselinePending
            ? undefined
            : await readFreshOAuthCredentialSnapshot(storageV5, credentials);
      } catch {
        snapshot = undefined;
      }
      if (isStopped) return;
      let hasToken = accessTokenRef.current !== BASELINE_PENDING_SENTINEL;
      let owner = pendingOwnerAccount.current;
      if (
        hasToken &&
        snapshot !== undefined &&
        snapshot.accessToken !== accessTokenRef.current &&
        snapshot.accountUuid !== undefined &&
        owner?.accountUuid !== undefined
      ) {
        if (!sameOwnerAccount(snapshot, owner)) {
          logForDebugging(
            "[bridge:repl] Auth-revive watcher: credential belongs to a different account \u2014 disarming",
          );
          return;
        }
        logForDebugging(
          "[bridge:repl] Auth-revive watcher: fresh same-account credential \u2014 re-enabling Remote Control",
        );
        let wasRevived = false;
        store((prev) => {
          if (prev.replBridgeEnabled || prev.replBridgeError === undefined) return prev;
          wasRevived = true;
          return {
            ...prev,
            replBridgeEnabled: true,
            replBridgeError: undefined,
            replBridgeErrorKind: undefined,
          };
        });
        if (wasRevived) {
          logEvent("tengu_bridge_repl_auth_revive", {});
          authReviveCount.current++;
          isReviveInitiated.current = true;
          expectedOwner.current = {
            accountUuid: snapshot.accountUuid,
            organizationUuid: snapshot.organizationUuid,
          };
        }
        return;
      }
      pollTimer = clock.setTimeout(() => {
        pollAuth();
      }, pollIntervalMs);
    }
    pollAuth();
    return () => {
      isStopped = true;
      pollTimer?.();
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
  let sendBridgeResult = (result) => {
    forwardTranscriptDelta(transcript.getSnapshot());
    teardownPromiseRef.current?.sendResult(result);
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
            getContextUsageInputs,
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
    if (teardownPromiseRef.current) bumpSentCount();
    try {
      if (result !== undefined && result.terminalReason === undefined && result.sendNowCut !== true)
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
  let sendBridgeResult_2 = useCallback((action) => {
    teardownPromiseRef.current?.stampReply(action);
  }, []);
  return {
    sendBridgeResult,
    stampBridgeReply: sendBridgeResult_2,
  };
}
export { emitReplBridgeEvent, resolveBridgeImmediateCommand_2, useReplBridge };
