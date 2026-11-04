/**
 * hooks/useRemoteSession.ts
 *
 * 远程（云）会话：连接 WebSocket、同步消息、发送提示、处理权限请求/中断/断线重连与未送达提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useRemoteSession.ts
 * pieces: chunk-18hwfzwa.js (19)
 * attribution: sole-consumer 16, affinity 2, callgraph-witnessed 1
 */
import { writeSync } from "fs";
import {
  init_react_production,
  useRef,
  useEffectEvent,
  useEffect,
  useCallback,
  useState,
  useMemo,
} from "../../vendor/react/cjs/react.production.js";
import { createSettingsChangeDetector, settingsChangeDetector } from "../utils/settings/changeDetector.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { resetLocalSettingsGitTrackedCache } from "../utils/config.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { REFUSAL_FALLBACK_DIALOG } from "../services/requestUserDialog.js";
import {
  serverFallbackNoticeSpec,
  truncateGatewayHost,
  withGatewayHost,
} from "../utils/permissions/serverClassifier/fallbackNotice.js";
import { HostScoped } from "../utils/hostScoped.js";
import { isFirstPartyProvider } from "../utils/model/providers.js";
import {
  hasUsableClaudeAILogin,
  isOAuthRefreshKnownDead,
  checkAndRefreshOAuthTokenIfNeeded,
} from "../utils/auth.js";
import { getLoginAvailability } from "../commands/login/loginAvailability.js";
import { env } from "../utils/env.js";
import { exitHint } from "../utils/remoteSessionCommands.js";
import { useTheme_2, useTheme } from "../components/design-system/ThemeProvider.js";
import { useSession } from "../context/session.js";
import { useTerminalSize } from "./useTerminalSize.js";
import { useClock } from "../ink/components/ClockContext.js";
import { useSetAppState, useAppStoreDirect } from "../state/AppState.js";
import { useSpinnerStore } from "../components/Spinner/spinnerStatus.js";
import {
  useNotifications,
  isValidNotice,
  normalizeSdkNotification,
  pickRemoteNotificationToEvict,
} from "../context/notifications.js";
import {
  reconcileRemoteTasks,
  applyRemoteTaskState,
  mergeCloudArtifactFrames,
  markTasksUnlisted,
  isModelRefusalFallback as isModelRefusalFallback_2,
  evictRefusalRetraction,
  dropRemoteRateLimitFrame,
  sessionMetadataArtifacts,
  applyRemoteTaskEvent,
  isResultEvent,
  shouldDeliverEvent,
  clearInProgressToolUses,
  countOrphanToolResults,
  dropLateRetracted,
  recordNestedUuidAliases,
  recordInProgressToolUses,
  checkRefusalRetractionSource,
} from "../remote/remoteSessionEvents.js";
import {
  ServedCallWatch,
  isServedCallWatchEnabled,
  createRemoteSessionConnection,
  syncRemotePermissionMode,
  retirePostedMode,
  MODE_NOT_SAVED_IDLE_TEXT,
  UNRESPONSIVE_NOTICE,
  responseTimeoutMs,
  WAITING_FOR_ANSWER_NOTICE,
} from "../remote/tools/servedChannel.js";
import {
  createSystemMessage,
  isNonRenderableSystemMessage,
  extractTextContent_2,
} from "../utils/messages.js";
import {
  setupReadySummary,
  completeSetupProgress,
  isStaleTimestamp,
  createSetupProgress,
  applySetupEvent,
  currentSetupLabel,
  classifySetupFrame,
  markCurrentStepFailed,
} from "../services/cloudSessions/setupProgress.js";
import { plural, TRAILING_ELLIPSIS_RE } from "../utils/stringUtils.js";
import { truncateToRemainingWidth } from "../utils/format.js";
import {
  isDeviceIdentityEnabledCached,
  isViolinWoodEnabledCached,
  isCloudPluginForwardingEnabledCached,
  getHomeSettingsForwardingBlocker,
  isSettingsToCloudEnabledCached,
} from "../services/analytics/violinGates.js";
import { dirSyncSessionByHost } from "../utils/teleport/dirSync.js";
import {
  mapRecordWhereToReason,
  noop_2 as noop_2_2,
  getLocalToolsSyncStatus,
  directorySyncStatusOrUndefined,
  nullOnError_2,
  toSeedSyncState,
  describeProjectFilesSync,
  normalizeNoProjectFiles,
  getPluginsSyncStatus,
  isSameSyncStatus,
} from "../cli/headlessCloud/syncStatus.js";
import { isRepositoryTrustGateEnabled } from "../utils/teleport/repositoryTrustGate.js";
import { reportableRepositoryTrust } from "../remote/tools/repositoryTrust.js";
import { isTrustedDeviceActiveForOrg, isTrustedDeviceGateEnabled } from "../bridge/trustedDevice.js";
import {
  formatDeviceNotBoundMessage,
  createDeviceNotBoundNotification,
  REMOTE_DEVICE_NOT_BOUND,
} from "../bridge/deviceBinding.js";
import { isBelowFloorEnforced, attestationFor } from "../services/remoteTools/toolHostAttestation.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import {
  fetchSession,
  SESSION_EXPIRED_MESSAGE,
  markSessionRead,
  updateSessionTitle,
  isConsoleProfileSessionsCredential,
} from "../utils/teleport/api.js";
import { errorMessage } from "../utils/errors.js";
import { logForDebugging } from "../utils/debug.js";
import { serviceSessionName, followServiceSessionName } from "../utils/teleport/serviceSessionName.js";
import { BoundedUUIDSet } from "../bridge/bridgeMessaging.js";
import { isSubagentToolRequest, capFrameDepth } from "../remote/wireFrameShape.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "../remote/tools/consentText.js";
import { getRemoteSessionUrl } from "../constants/product.js";
import {
  REMOTE_PERMISSION_UNSHOWABLE_SHORT,
  REMOTE_PERMISSION_UNSHOWABLE_TEXTS,
} from "../remote/forwardedPermissionDialog.js";
import { NOT_HELD_LEASE } from "../services/remoteTools/lease.js";
import { TransportPermissionDispatcher } from "../remote/TransportPermissionDispatcher.js";
import { logEvent } from "../services/analytics/index.js";
import { lit as lit_2, fromEnum } from "../services/analytics/safeMetadata.js";
import { count } from "../utils/collections.js";
import {
  createRemoteRateLimitAdopter,
  convertSDKMessage,
  parseInitFrame,
  parseGoalState,
  adoptRemoteAutocompactState,
} from "../remote/sdkMessageAdapter.js";
import { configChangeBlocker } from "../utils/model/providerAttribution.js";
import { deviceHooksProcessMemories } from "../utils/hooks/deviceHooks/cloudRegistration.js";
import { logError } from "../utils/log.js";
import { registerCleanup } from "../utils/cleanupRegistry.js";
import { isHookForwardingEnabled } from "../utils/hooks/deviceHooks/commandReach.js";
import { startDeviceHookForwarding } from "../utils/hooks/deviceHooks/deviceHookSession.js";
import { getOriginalCwd, setCloudCwd, setCwdState as setCwdState_2 } from "../bootstrap/state.js";
import {
  RemoteSessionManager,
  CANCELLED,
  formatUndeliveredAnswerNotice,
  getSessionRequestConfig,
  sendFailureMessage,
} from "../remote/RemoteSessionManager.js";
import { classifyLaunchDirPosition, isHarpForepillarOn } from "../utils/launchDirPosition.js";
import { isAdoptableSessionCwd } from "../commands/resume/openLiveBackground.js";
import {
  isSystemInitMessage,
  getForegroundBashToolUseIds,
  BASH_TASK_COUNT_DELAY_MS,
} from "../remote/backgroundTaskEvents.js";
import { parsePermissionMode, EXTERNAL_PERMISSION_MODES } from "../types/permissions.js";
import { trackThinClientFrame, requestSendNow } from "../services/homeSeed/firstSend.js";
import { isHumanTurn_2 } from "../utils/messagePredicates.js";
import { addHistoryEntry } from "../history.js";
import { getCurrentLimits, currentLimits } from "../services/claudeAiLimits.js";
import { fetchLatestEvents, fetchOlderEvents } from "../assistant/sessionHistory.js";
import { describeCredentialFailure } from "../bridge/remoteBridgeCore.js";
import {
  beginModeLanding,
  clearOutstandingMode,
  notifyRemoteModeRejected,
  sendModeWithRetry,
  notifyRemoteModeUnsynced,
} from "../remote/remotePermissionModeSync.js";
import { classifyControlRequestError } from "../remote/controlRequestErrors.js";
import { isExternalPermissionMode } from "../utils/permissions/PermissionMode.js";
import { isAutoModeFromFallback } from "../utils/permissions/autoModeState.js";
import { forwardCloudPlugins } from "../cli/headlessCloud/cloudPlugins.js";
import { deviceProofStateRegistry } from "../utils/hooks/deviceHooks/contentDigest.js";
import { createDeviceHookDecider, reachStateRegistry } from "../utils/hooks/deviceHooks/runDeviceHook.js";
import { isShuttingDown } from "../utils/gracefulShutdown.js";
import { startClientPresencePulse } from "../bridge/clientPresence.js";
import { getOauthConfig } from "../constants/oauth.js";
import { SDKAutocompactStateMessageSchema } from "../entrypoints/sdk/coreSchemas.js";
import { checkSessionTitlePolicyTaint } from "../utils/teleport/sessionTitle.js";
import {
  storedHomeSettingsMode,
  storedForwardMode,
  isHomeSettingsForwardConsent,
} from "../utils/teleport/homeSettingsMode.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:263226-263230 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:263226", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:263263-263795 sole-consumer
/**
 * 远程会话中监视本机设置变化：已有全局监视器时复用，否则新建一个（不监视 bridge store），变化时清缓存并向远程会话广播 servedSettingsChanged。
 */
function watchServedSettings(
  cwd,
  options,
  signals,
  createDetector = () =>
    createSettingsChangeDetector({
      bridgeStore: false,
    }),
  sharedDetector = settingsChangeDetector,
) {
  if (sharedDetector.isWatching())
    return {
      subscribe: (listener) => sharedDetector.subscribe(listener),
      dispose: () => Promise.resolve(),
    };
  let detector = createDetector();
  detector
    .initialize(cwd, options, {
      machineServesSession: true,
    })
    .then(
      () => logFeatureOk("remote_served_settings_watch"),
      () => logFeatureBad("remote_served_settings_watch", "watch_failed_to_start"),
    );
  let unsubscribeGit = detector.subscribe(() => resetLocalSettingsGitTrackedCache());
  let unsubscribeEmit = detector.subscribe((change) => signals.servedSettingsChanged.emit(change));
  return {
    subscribe: (listener) => {
      let unsubscribes = [detector.subscribe(listener), sharedDetector.subscribe(listener)];
      return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
    },
    dispose: () => {
      unsubscribeGit();
      unsubscribeEmit();
      return detector.dispose();
    },
  };
}
//@ chunk-18hwfzwa.js:263795-264564 sole-consumer
/**
 * 跟踪远程会话中"清空对话"的发送：记录清空请求及之后发送的消息，收到重置帧时给出需要保留的消息 uuid 集合。
 */
class ConversationClearTracker {
  #e = [];
  noteSend(entry) {
    if (entry?.clearsConversation) {
      if (entry.uuid !== undefined && this.#e.some((item) => item.uuid === entry.uuid)) return;
      this.#e.push({
        uuid: entry.uuid,
        sends: new Set(),
      });
      if (this.#e.length > 20) this.#e.shift();
      return;
    }
    let last = this.#e.at(-1);
    if (!last || !entry?.uuid) return;
    if (last.sends.size >= 100) last.sends.clear();
    last.sends.add(entry.uuid);
  }
  noteSendFailed(entry) {
    let uuid = entry?.uuid;
    if (entry?.clearsConversation) {
      let index = uuid === undefined ? this.#e.length - 1 : this.#e.findIndex((item) => item.uuid === uuid);
      if (index !== -1) this.#e.splice(index, 1);
      return;
    }
    if (uuid === undefined) return;
    for (let item of this.#e) item.sends.delete(uuid);
  }
  onResetFrame() {
    let first = this.#e.shift();
    if (!first)
      return {
        ownClear: false,
        preserved: new Set(),
      };
    let sends = new Set(first.sends);
    for (let item of this.#e) {
      if (item.uuid !== undefined) sends.add(item.uuid);
      for (let send of item.sends) sends.add(send);
    }
    return {
      ownClear: true,
      preserved: sends,
    };
  }
  forget() {
    this.#e = [];
  }
}
//@ chunk-18hwfzwa.js:264564-265112 sole-consumer
/**
 * 远程会话对话框请求的处理表：校验载荷后弹出对应对话框，返回完成结果或取消。
 */
var REMOTE_DIALOG_HANDLERS; // deferred: uses REFUSAL_FALLBACK_DIALOG (../services/requestUserDialog.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-18hwfzwa.js:264564", () => {
  REMOTE_DIALOG_HANDLERS = {
    [REFUSAL_FALLBACK_DIALOG.kind]: async (requestDialog, payload, signal) => {
      let parsed = REFUSAL_FALLBACK_DIALOG.payload().safeParse(payload);
      if (!parsed.success)
        return {
          behavior: "cancelled",
        };
      let answer = await requestDialog(REFUSAL_FALLBACK_DIALOG, parsed.data, signal);
      return answer === "cancelled"
        ? {
            behavior: "cancelled",
          }
        : {
            behavior: "completed",
            result: answer,
          };
    },
    [serverFallbackNoticeSpec.kind]: async (requestDialog, payload, signal) => {
      let parsed = serverFallbackNoticeSpec.payload().safeParse(payload);
      if (!parsed.success)
        return {
          behavior: "cancelled",
        };
      let answer =
        parsed.data.gatewayHost === undefined || parsed.data.gatewayHost === ""
          ? undefined
          : truncateGatewayHost(parsed.data.gatewayHost);
      let result = await requestDialog(
        serverFallbackNoticeSpec,
        withGatewayHost(
          answer === undefined
            ? {}
            : {
                gatewayHost: answer,
              },
        ),
        signal,
      );
      return result === "cancelled"
        ? {
            behavior: "cancelled",
          }
        : {
            behavior: "completed",
            result,
          };
    },
  };
});
//@ chunk-18hwfzwa.js:265112-265842 sole-consumer
/**
 * 处理远程会话发来的 request_user_dialog 控制请求：按 dialog_kind 找处理器打开本地对话框并回复结果，在途请求可单独取消或整体中止。
 */
class RemoteDialogDispatcher {
  inputs;
  inFlight = new Map();
  constructor(inputs) {
    this.inputs = inputs;
  }
  setInputs(inputs) {
    this.inputs = inputs;
  }
  dispatch = (request) => {
    if (request.request.subtype !== "request_user_dialog") return;
    let { request: request_2, request_id: requestId } = request;
    let handler = REMOTE_DIALOG_HANDLERS[request_2.dialog_kind];
    if (!handler) {
      this.inputs.sendResponse(requestId, {
        behavior: "cancelled",
      });
      return;
    }
    let inFlight = this.inFlight;
    let abortController = new AbortController();
    inFlight.set(requestId, abortController);
    let remove = () => inFlight.get(requestId) === abortController && inFlight.delete(requestId);
    handler(this.inputs.requestDialog, request_2.payload, {
      signal: abortController.signal,
    })
      .then((answer) => {
        if (!remove()) return;
        this.inputs.sendResponse(requestId, answer);
      })
      .catch(() => {
        if (!remove()) return;
        this.inputs.sendResponse(requestId, {
          behavior: "cancelled",
        });
      });
  };
  cancel = (requestId) => {
    let controller = this.inFlight.get(requestId);
    if (!controller) return;
    this.inFlight.delete(requestId);
    controller.abort();
  };
  drain() {
    for (let [requestId, controller] of this.inFlight) {
      this.inFlight.delete(requestId);
      controller.abort();
    }
  }
}
//@ chunk-18hwfzwa.js:265842-265863 sole-consumer
class InFlightCounter {
  inFlight = 0;
}
//@ chunk-18hwfzwa.js:265863-265890 sole-consumer
var inFlightCounterSlot; // deferred: uses InFlightCounter of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-18hwfzwa.js:265863", () => {
  inFlightCounterSlot = new HostScoped(() => new InFlightCounter());
});
//@ chunk-18hwfzwa.js:265890-266572 sole-consumer
/**
 * 云会话发送失败是否因为本机 claude.ai 登录失效：是则给出重新登录（/login 或 claude auth login）的说明，forceLoginMethod 限制时说明需要放开设置。
 */
function signInNoLongerUsableReason(failure) {
  if (!isFirstPartyProvider()) return;
  if (
    !(failure.status === undefined
      ? failure.advice !== undefined && !hasUsableClaudeAILogin()
      : failure.status === 401 && (!hasUsableClaudeAILogin() || isOAuthRefreshKnownDead()))
  )
    return;
  let loginAvailability = getLoginAvailability();
  if (loginAvailability.kind === "refused")
    return loginAvailability.cause === "login_method_pin"
      ? "The claude.ai sign-in this session was using is no longer usable, and the forceLoginMethod setting on this machine requires a different sign-in method. To sign in again here, that setting has to allow claude.ai."
      : undefined;
  return `The claude.ai sign-in this session was using is no longer usable. ${env.DISABLE_LOGIN_COMMAND ? `${exitHint(true)}, sign in to the same account with \`claude auth login\`, then attach to this session again.` : "Run /login with the same account, then send your message again."}`;
}
//@ chunk-18hwfzwa.js:266572-266584 affinity
var replyChannelConfig = null;
//@ chunk-18hwfzwa.js:266584-266602 affinity
var REFUSAL_RETRY_DELAY_MS = 750;
var MAX_REFUSAL_RETRIES = 3;
//@ chunk-18hwfzwa.js:266602-308155 callgraph-witnessed = useRemoteSession (0.184)
/**
 * 远程（云）会话：订阅云端事件流，把消息写入本地转录；发送用户提示（确认送达，否则提示 "Couldn't send your message"）；转发权限请求/中断；断线重连与状态显示。
 */
function useRemoteSession({ config, adoptRateLimits, sink, requestDialog, toolPermissionContext, tools }) {
  let isRemoteMode = !!config;
  let {
    setMessages,
    setIsLoading,
    holdLine,
    lineTaken,
    landWaitingLines,
    getIsLoading,
    onInit,
    onPermissionModeChange,
    noteOwnPermissionModePush,
    noteOwnPermissionModeAnswer,
    noteOwnUnrecordedModeAnswer,
    streaming,
    setStreamMode,
    setInProgressToolUseIDs,
    onTurnComplete,
    onTurnStopped,
    onOtherTurnComplete,
    onConversationReset,
    retraction,
  } = sink;
  let { credentials, storageV5 } = useTheme_2();
  let host = useSession((host) => host.host);
  let setAppState = useSession();
  let heldServedCallRef = useRef(undefined);
  let toolsRef = useEffectEvent(() => tools);
  let askToolRef = useEffectEvent((request) => Promise.resolve("unanswered"));
  let askTool = useEffectEvent((tool, context) => Promise.resolve("unanswered"));
  let questionRef = useEffectEvent((question) =>
    Promise.resolve({
      answer: "unanswered",
    }),
  );
  useEffect(() => {
    return;
  }, [config]);
  let { columns } = useTerminalSize();
  let columnsRef = useEffectEvent(() => columns);
  let setConnStatus = useCallback(
    (input) => {
      if (input && getIsLoading()) return;
      setIsLoading(input);
    },
    [getIsLoading, setIsLoading],
  );
  let stopped = useRef(false);
  let [pendingRequests] = useState(() => new Map());
  let isReconnecting = useRef(false);
  let isSending = useRef(false);
  let sentCount = useRef(0);
  let receivedCount = useRef(0);
  let initialPromptUuidRef = useRef(undefined);
  let isFlushing = useRef(false);
  let resetCounters = useCallback(() => {
    streaming.applyStreamingText(() => null);
    streaming.setStreamingToolUses((prev) => (prev.length > 0 ? [] : prev));
  }, [streaming]);
  let clock = useClock();
  let setAppState_2 = useSetAppState();
  let appStoreDirect = useAppStoreDirect();
  let spinnerStore = useSpinnerStore();
  let { addNotification, removeNotification } = useNotifications();
  let onTransportEvent = useCallback(
    (event) =>
      setAppState_2((prev) =>
        prev.remoteConnectionStatus === event
          ? prev
          : {
              ...prev,
              remoteConnectionStatus: event,
            },
      ),
    [setAppState_2],
  );
  let runningTaskIdsRef = useRef(new Map());
  let remoteTasks = useRef(new Map());
  let runningTaskIds = useRef(new Set());
  let heldIds = useRef([]);
  let pendingCount = useRef(0);
  let writeTaskCount = useCallback(() => {
    let runningIds = [...runningTaskIdsRef.current.values()];
    let held = runningTaskIds.current;
    let anyHeld = heldIds.current.some((id) => held.has(id)) ? "seeded" : held.size > 0 ? "in_turn" : "none";
    let reconciled = reconcileRemoteTasks(remoteTasks.current, runningTaskIdsRef.current, Date.now());
    setAppState_2((prev) => applyRemoteTaskState(prev, runningIds, reconciled, anyHeld));
  }, [setAppState_2]);
  let [servedCallWatch] = useState(() => new ServedCallWatch());
  let onServedCall = useCallback(() => {
    servedCallWatch.clear();
  }, [servedCallWatch]);
  let servedCallCount = useRef(0);
  let onServedCallEnd = useCallback(() => {
    servedCallCount.current++;
    onServedCall();
  }, [onServedCall]);
  let activeToolUse = useRef(null);
  let lastActivityAt = useRef(Date.now());
  let isStreaming = useRef(false);
  let pendingElicitation = useRef(null);
  let pendingPrompt = useRef(null);
  let pendingDialog = useRef(null);
  let onMessage = useCallback(
    (message) => {
      activeToolUse.current = message;
      setAppState_2((prev) =>
        prev.remoteBootstrap === message
          ? prev
          : {
              ...prev,
              remoteBootstrap: message,
            },
      );
    },
    [setAppState_2],
  );
  let onDialogs = useCallback(
    (dialogs) => {
      let pending = activeToolUse.current;
      onMessage(dialogs);
      if ((pending === null || !pending.terminal) && dialogs.terminal) {
        pendingElicitation.current?.workerCameUp();
        pendingPrompt.current?.onWorkerUp();
        if (dialogs.hasStructuredSteps) {
          let any = dialogs.steps.some((step) => step.status === "failed");
          if (!dialogs.dismissed && !any)
            setMessages((prev) => [...prev, createSystemMessage(setupReadySummary(dialogs), "info")]);
          if (!any) logFeatureOk("remote_bootstrap");
        }
      }
    },
    [onMessage, setMessages],
  );
  let accepting = useRef(true);
  let heldMessages = useRef([]);
  let held = useRef(false);
  let releaseHeld = useRef(() => {});
  let [clearTracker] = useState(() => new ConversationClearTracker());
  let seenUuids = useRef(new Set());
  let disconnect = useCallback(
    (flush = true, reason = "disconnected") => {
      landWaitingLines();
      let heldCount = heldMessages.current.length;
      heldMessages.current = [];
      clearTracker.forget();
      if (heldCount > 0) {
        if (flush) logFeatureSad("remote_bootstrap", "queue_dropped");
        setMessages((prev) => [
          ...prev,
          createSystemMessage(
            reason === "start_failed"
              ? `${heldCount} queued ${plural(heldCount, "message")} not sent \u2014 the cloud session didn't start. Send ${heldCount === 1 ? "it" : "them"} again to retry.`
              : `${heldCount} queued ${plural(heldCount, "message")} not sent \u2014 the session disconnected before the container was ready.`,
            "warning",
          ),
        ]);
      }
      if (activeToolUse.current !== null && activeToolUse.current.queuedCount !== 0)
        onMessage({
          ...activeToolUse.current,
          queuedCount: 0,
        });
    },
    [setMessages, landWaitingLines, onMessage, clearTracker],
  );
  let closeDialogs = useCallback(() => {
    let active = activeToolUse.current;
    if (active !== null && !active.terminal) onDialogs(completeSetupProgress(active, Date.now()));
    if (!accepting.current) {
      isSending.current = false;
      stopped.current = false;
      sentCount.current = 0;
      accepting.current = true;
      managerRef.current?.endWorkerStart();
      if (active === null) {
        pendingElicitation.current?.workerCameUp();
        pendingPrompt.current?.onWorkerUp();
      }
      let noHeld = heldMessages.current.length === 0;
      releaseHeld.current();
      let gate =
        config?.initialPromptUuid !== undefined && config.initialPromptUuid !== initialPromptUuidRef.current;
      if (noHeld && getIsLoading() && !gate) setConnStatus(false);
    }
  }, [onDialogs, config, getIsLoading, setConnStatus]);
  let onReconnect = useCallback(
    (message) => {
      logFeatureBad("remote_bootstrap", "step_failed");
      isStreaming.current = false;
      disconnect(false, "start_failed");
      accepting.current = true;
      managerRef.current?.endWorkerStart();
      isSending.current = false;
      stopped.current = false;
      sentCount.current = 0;
      receivedCount.current = 0;
      isFlushing.current = false;
      setConnStatus(false);
      if (message)
        setMessages((prev) => [
          ...prev,
          createSystemMessage(
            "Cloud container provisioning failed \u2014 reconnect or check the session logs",
            "warning",
          ),
        ]);
    },
    [disconnect, setConnStatus, setMessages],
  );
  let onDisconnect = useCallback(() => {
    onServedCallEnd();
    if (!stopped.current) {
      sentCount.current++;
      receivedCount.current = Math.max(0, receivedCount.current - 1);
    }
    isFlushing.current = false;
    stopped.current = true;
    isSending.current = true;
    setConnStatus(false);
    let active_ = activeToolUse.current;
    if (active_ !== null && !active_.terminal && !active_.dismissed)
      onMessage({
        ...active_,
        dismissed: true,
      });
  }, [onServedCallEnd, setConnStatus, onMessage]);
  let autoFollow = useRef(false);
  let echoRef = useRef(null);
  let queued = useRef(false);
  let sendQueued = useEffectEvent((text, state, index) => {
    if (stopped.current) return;
    if (state === "provisioning" && queued.current) return;
    let overrideMessage = spinnerStore.get().overrideMessage;
    if (overrideMessage === null || overrideMessage === echoRef.current) {
      let replaced = text.replace(TRAILING_ELLIPSIS_RE, "");
      let trimmed = truncateToRemainingWidth(state === "held" ? replaced : text, columnsRef());
      spinnerStore.main.setMessage(
        trimmed,
        index === null
          ? null
          : {
              words: index,
              detail:
                replaced.trim().toLowerCase() === index.replace(TRAILING_ELLIPSIS_RE, "").trim().toLowerCase()
                  ? null
                  : text,
            },
      );
      echoRef.current = trimmed;
      queued.current = state === "held";
    }
  });
  let pendingAttachments = useRef(undefined);
  let pendingPrompt_ = useRef(undefined);
  let textRef = useRef(undefined);
  let managerRef = useRef(null);
  let onQueueEmpty = useCallback(() => {
    if (!config || config.viewerOnly || !isDeviceIdentityEnabledCached() || managerRef.current === null)
      return;
    let prompt = pendingElicitation.current;
    let syncState = dirSyncSessionByHost.of(host);
    let notArmed = syncState.silentlyNotArmed(config.sessionId);
    let sessionState = {
      state: "absent",
      ...(config.isAttachToExisting
        ? {
            reason: mapRecordWhereToReason(config.sessionRecordLookup),
          }
        : notArmed !== undefined
          ? {
              reason: notArmed,
            }
          : (syncState.notOptedIn(config.sessionId) ?? {
              reason: "not_set_up",
            })),
    };
    let promptRef = pendingPrompt_.current;
    let reportSession = noop_2_2(sessionState);
    if (textRef.current === undefined && !config.isAttachToExisting)
      textRef.current = deviceNotBoundNoticeText(appStoreDirect.getState().notifications);
    let text = textRef.current;
    let trustValue = isRepositoryTrustGateEnabled() ? config.repositoryTrust?.current() : undefined;
    let trust = reportableRepositoryTrust(trustValue, isTrustedDeviceActiveForOrg());
    let localToolsSyncStatus = getLocalToolsSyncStatus(
      promptRef,
      text === undefined ? undefined : formatDeviceNotBoundMessage(text),
      trustValue === "nothing_to_mark" && isBelowFloorEnforced(attestationFor(undefined)),
    );
    let syncStatus = directorySyncStatusOrUndefined(sessionState, nullOnError_2(undefined));
    let seedSyncState = toSeedSyncState(
      config.homeSeed,
      homeSettingsForwardingStatus(host.launchOptions.mayForwardHomeSettings(), false),
      pendingAttachments.current,
    );
    let report = {
      ...(syncStatus !== undefined && {
        projectFiles: syncStatus,
      }),
      ...(reportSession !== undefined && {
        whileClosed: reportSession,
      }),
      ...(trust !== undefined && {
        repositoryTrust: trust,
      }),
      settings: describeProjectFilesSync(
        syncStatus === undefined ? normalizeNoProjectFiles(seedSyncState) : seedSyncState,
      ),
      plugins: getPluginsSyncStatus(
        prompt !== null
          ? {
              kind: "attached",
              state: prompt.state(),
            }
          : pendingDialog.current !== null
            ? {
                kind: "absent",
                reason: pendingDialog.current,
              }
            : {
                kind: "pending",
              },
      ),
      ...(localToolsSyncStatus !== undefined && {
        localTools: localToolsSyncStatus,
      }),
    };
    setAppState_2((prev) =>
      prev.cloudSessionSync !== undefined && isSameSyncStatus(prev.cloudSessionSync, report)
        ? prev
        : {
            ...prev,
            cloudSessionSync: report,
          },
    );
  }, [config, host, setAppState_2, appStoreDirect]);
  let taskById = useRef(new Map());
  let heldServedCallRef_2 = useRef(undefined);
  let onTaskUpdate = useCallback(
    (isHeld) => {
      if (!isHeld) {
        taskById.current.clear();
        heldServedCallRef_2.current = undefined;
      }
      let call = isHeld ? heldServedCallRef_2.current : undefined;
      setAppState_2((prev) =>
        (prev.cloudMessageHeld !== undefined) === isHeld && prev.cloudMessageHeld?.row === call
          ? prev
          : {
              ...prev,
              cloudMessageHeld: isHeld
                ? call === undefined
                  ? {}
                  : {
                      row: call,
                    }
                : undefined,
            },
      );
    },
    [setAppState_2],
  );
  let onTaskRemove = useCallback(() => {
    pendingAttachments.current = undefined;
    pendingPrompt_.current = undefined;
    onTaskUpdate(false);
    setAppState_2((prev) =>
      prev.cloudSessionSync === undefined
        ? prev
        : {
            ...prev,
            cloudSessionSync: undefined,
          },
    );
  }, [setAppState_2, onTaskUpdate]);
  let onElicitation = useCallback(() => {
    queued.current = false;
    let elicitation = echoRef.current;
    if (elicitation === null) return;
    echoRef.current = null;
    if (spinnerStore.get().overrideMessage === elicitation) spinnerStore.main.setMessage(null);
  }, [spinnerStore]);
  let onPrompt = useCallback(() => {
    if (queued.current) onElicitation();
  }, [onElicitation]);
  let onPromptClear = useCallback(() => {
    if (!queued.current) onElicitation();
  }, [onElicitation]);
  let onError = useCallback(() => {
    onTransportEvent("connecting");
    onElicitation();
    onMessage(null);
    onTaskRemove();
    isStreaming.current = false;
    runningTaskIdsRef.current.clear();
    isCompactingRef.current.clear();
    runningTaskIds.current.clear();
    remoteTasks.current.clear();
    writeTaskCount();
    setAppState_2((prev) =>
      prev.remoteWorkerReportedGone
        ? {
            ...prev,
            remoteWorkerReportedGone: false,
          }
        : prev,
    );
    setInProgressToolUseIDs({
      action: "clear",
    });
    isReconnecting.current = false;
    setAppState_2((prev) =>
      prev.hasRemoteReplyChannel
        ? {
            ...prev,
            hasRemoteReplyChannel: false,
          }
        : prev,
    );
    setAppState_2((prev) =>
      prev.workerInventory === null
        ? prev
        : {
            ...prev,
            workerInventory: null,
          },
    );
    setAppState_2((prev) =>
      prev.remoteSessionName === undefined
        ? prev
        : {
            ...prev,
            remoteSessionName: undefined,
          },
    );
    setAppState_2((prev) =>
      prev.activeGoal === undefined
        ? prev
        : {
            ...prev,
            activeGoal: undefined,
          },
    );
    setAppState_2((prev) =>
      prev.remoteAutocompactState === undefined
        ? prev
        : {
            ...prev,
            remoteAutocompactState: undefined,
          },
    );
    setAppState_2((prev) => mergeCloudArtifactFrames(prev, null));
  }, [
    onTransportEvent,
    onElicitation,
    onMessage,
    onTaskRemove,
    writeTaskCount,
    setInProgressToolUseIDs,
    setAppState_2,
  ]);
  let onFrames = useCallback(() => {
    onServedCallEnd();
    stopped.current = false;
    isSending.current = false;
    sentCount.current = 0;
    receivedCount.current = 0;
    isFlushing.current = false;
    setConnStatus(false);
    onElicitation();
    runningTaskIdsRef.current.clear();
    runningTaskIds.current.clear();
    markTasksUnlisted(remoteTasks.current);
    writeTaskCount();
    setInProgressToolUseIDs({
      action: "clear",
    });
    retraction.inProgressToolUses.clear();
    resetCounters();
    streaming.resetMetrics();
  }, [
    onServedCallEnd,
    setConnStatus,
    onElicitation,
    writeTaskCount,
    setInProgressToolUseIDs,
    retraction,
    resetCounters,
    streaming,
  ]);
  let errorRef = useRef(null);
  let hasError = useRef(false);
  let retryCount = useRef(0);
  let onRetry = useCallback(() => {
    hasError.current = false;
    errorRef.current = null;
    retryCount.current++;
  }, []);
  let onConnect = useCallback(() => {
    let watch = managerRef.current;
    if (config === undefined || watch === null) return Promise.resolve();
    if (isEssentialTrafficOnly()) return Promise.resolve();
    if (errorRef.current !== null) return errorRef.current;
    let count = retryCount.current;
    let connect = (async () => {
      try {
        let accessTokenRefreshed = await getAccessTokenRefreshed(config, {
          credentials,
          storageV5,
        });
        let result;
        try {
          result = (
            await fetchSession(config.sessionId, {
              accessToken: accessTokenRefreshed,
            })
          ).session_status;
        } catch (error) {
          if (
            errorMessage(error) !== SESSION_EXPIRED_MESSAGE ||
            !(await config.onAuth401?.(accessTokenRefreshed))
          )
            throw error;
          result = (
            await fetchSession(config.sessionId, {
              accessToken: config.getAccessToken(),
            })
          ).session_status;
        }
        if (result !== "archived" || managerRef.current !== watch || retryCount.current !== count) return;
        if (!hasError.current) {
          hasError.current = true;
          setMessages((prev) => [
            ...prev,
            createSystemMessage(archivedSessionMessage(config.sessionId), "warning"),
          ]);
        }
        onFrames();
      } catch (error) {
        logForDebugging(
          `[useRemoteSession] Could not read whether the session was archived: ${errorMessage(error)}`,
        );
      }
    })();
    errorRef.current = connect;
    connect.finally(() => {
      if (errorRef.current === connect) errorRef.current = null;
    });
    return connect;
  }, [config, credentials, storageV5, setMessages, onFrames]);
  let onDialogAnswer = useCallback(
    (requestId, answer) => {
      let pending = taskById.current.get(requestId);
      if (pending === undefined || answer === pending) {
        taskById.current.set(requestId, answer);
        return;
      }
      if (heldServedCallRef_2.current !== undefined) return;
      heldServedCallRef_2.current = requestId;
      setAppState_2((prev) =>
        prev.cloudMessageHeld !== undefined && prev.cloudMessageHeld.row !== requestId
          ? {
              ...prev,
              cloudMessageHeld: {
                row: requestId,
              },
            }
          : prev,
      );
    },
    [setAppState_2],
  );
  let onAskAnswer = useCallback(
    (requestId, answer) => {
      let watch = managerRef.current;
      queueMicrotask(() => {
        if (managerRef.current !== watch || watch?.hasWithholdableHeldSend() !== true) return;
        onDialogAnswer(requestId, answer);
      });
    },
    [onDialogAnswer],
  );
  let heartbeatCount = useRef(0);
  let lastReceivedAt = useRef(0);
  let timeoutTimer = useRef(null);
  let isTimedOut = useRef(false);
  let timedOutNotified = useRef(false);
  useEffect(() => {
    if (config === undefined) return;
    let cancelled = false;
    let onTick = async (now) => {
      try {
        let accessToken = await getAccessTokenRefreshed(config, {
          credentials,
          storageV5,
        });
        if (now.aborted) return;
        let session = await fetchSession(config.sessionId, {
          accessToken,
        });
        if (!cancelled) {
          cancelled = true;
          logFeatureOk("ccr_session_name_follow");
        }
        return serviceSessionName(session.title);
      } catch (error) {
        logForDebugging(`[useRemoteSession] Could not re-read the session's name: ${errorMessage(error)}`);
        if (!cancelled) {
          cancelled = true;
          logFeatureBad("ccr_session_name_follow", "read_failed");
        }
        return;
      }
    };
    return followServiceSessionName(
      clock,
      config.serviceName,
      isEssentialTrafficOnly() ? undefined : onTick,
      (value) =>
        setAppState_2((prev) =>
          prev.remoteSessionName === value
            ? prev
            : {
                ...prev,
                remoteSessionName: value,
              },
        ),
    );
  }, [config, credentials, storageV5, setAppState_2, clock]);
  let [compactingIds] = useState(() => new BoundedUUIDSet(50));
  let responseTimeoutRef = useRef(0);
  let isCompactingRef = useRef(new Set());
  let [retryingIds] = useState(() => new BoundedUUIDSet(256));
  let isBusy = useCallback((id) => isCompactingRef.current.has(id) || retryingIds.has(id), [retryingIds]);
  let isHeldToolRequest = useCallback(
    (request) => isSubagentToolRequest(request) && isBusy(String(request.agent_id)),
    [isBusy],
  );
  let managerRef_2 = useRef(new Set());
  let [theme] = useTheme();
  let hasUpdatedTitleRef = useRef(false);
  let sentUUIDsRef = useRef(undefined);
  let toolsRef_2 = useRef(undefined);
  useEffect(() => {
    sentUUIDsRef.current = undefined;
    toolsRef_2.current = config?.eventSigner === undefined ? false : undefined;
    hasUpdatedTitleRef.current = false;
    let mounted = true;
    config?.eventSigner?.then(
      (input_) => {
        if (mounted) toolsRef_2.current = input_ !== undefined;
      },
      () => {
        if (mounted) toolsRef_2.current = false;
      },
    );
    config?.boundHere?.then(
      (sdkMessage) => {
        if (mounted) sentUUIDsRef.current = sdkMessage;
      },
      () => {},
    );
    return () => {
      mounted = false;
    };
  }, [config]);
  let watcher = useMemo(
    () =>
      config && isRepositoryTrustGateEnabled()
        ? {
            get answersProveDevice() {
              return sentUUIDsRef.current === false && toolsRef_2.current !== false
                ? undefined
                : sentUUIDsRef.current;
            },
            onAnswered: () => {
              hasUpdatedTitleRef.current = true;
            },
            onNotShown: (requestId, payload) => {
              if (requestId === "proves_no_device") servedCallWatch.requestOpened(payload);
              setMessages((prev) => [
                ...prev,
                createSystemMessage(
                  requestId === "proves_no_device"
                    ? REMOTE_TOOLS_CONSENT_TEXT["repository_trust.prompt.answer_elsewhere"](
                        getRemoteSessionUrl(config.sessionId, undefined, {
                          from: "cli",
                        }),
                      )
                    : REMOTE_TOOLS_CONSENT_TEXT["repository_trust.prompt.not_shown_here"],
                  "warning",
                ),
              ]);
            },
          }
        : undefined,
    [config, setMessages, servedCallWatch],
  );
  let inputs = {
    sendResponse: (requestId, answer) => {
      servedCallWatch.requestClosed(requestId);
      let pending = pendingRequests.get(requestId);
      pendingRequests.delete(requestId);
      let wasCompacting = managerRef.current;
      if (!wasCompacting) return;
      wasCompacting.respondToPermissionRequest(requestId, answer);
      if (answer.behavior === "allow") {
        let last = answer.updatedPermissions?.findLast(
          (updatedPermission) => updatedPermission.type === "setMode",
        );
        let mode = last?.type === "setMode" && last.destination === "session" ? last.mode : undefined;
        if (mode === "default" || mode === "acceptEdits") {
          if (isDeviceIdentityEnabledCached()) lastReceivedAt.current++;
          noteOwnPermissionModeAnswer(mode);
        } else if (mode !== undefined) noteOwnUnrecordedModeAnswer();
        if (pending === undefined || !isBusy(pending)) setConnStatus(true);
      } else if (answer.interrupt && pending === undefined) {
        onDisconnect();
        onTurnStopped?.();
      }
    },
    requestDialog,
    toolRegistry: tools,
    toolPermissionContext,
    theme,
    canInterruptTurn: !config?.viewerOnly,
    askedByBackgroundSubagent: isHeldToolRequest,
    onAskNotShown: (requestId) => {
      setMessages((prev) => [
        ...prev,
        createSystemMessage(
          requestId ? REMOTE_PERMISSION_UNSHOWABLE_SHORT : REMOTE_PERMISSION_UNSHOWABLE_TEXTS,
          "warning",
        ),
      ]);
    },
    handedOverAtAttach: config?.seedSubagentRequests,
    heldServedCall: (call) => {
      let held = heldServedCallRef.current?.(call);
      if (held?.held) return held;
      let held_2 = config?.heldServedCall?.(call);
      if (held_2?.held) return held_2;
      return (
        [held, held_2].find((prev) => prev?.reason === "other_input") ?? held_2 ?? held ?? NOT_HELD_LEASE
      );
    },
    ...(watcher && {
      repositoryTrustQuestion: watcher,
    }),
    ...(isServedCallWatchEnabled() && {
      computerFolderPrompt: true,
    }),
  };
  let [permissionDispatcher] = useState(() => new TransportPermissionDispatcher(inputs));
  let inputs_2 = {
    sendResponse: (requestId, answer) => {
      managerRef.current?.respondToUserDialogRequest(requestId, answer);
    },
    requestDialog,
  };
  let [dialogDispatcher] = useState(() => new RemoteDialogDispatcher(inputs_2));
  useEffect(() => {
    permissionDispatcher.setInputs(inputs);
    dialogDispatcher.setInputs(inputs_2);
  });
  useEffect(() => {
    let flattened = [
      ...[],
      {
        feed: config?.homeSeed?.status,
        name: "home-settings",
        wait: "settings",
      },
    ].flatMap(({ feed, name, wait }) =>
      feed === undefined
        ? []
        : [
            {
              feed,
              name,
              wait,
            },
          ],
    );
    if (flattened.length === 0) return;
    let handle =
      (wait, wait_2) =>
      ({ line, level }) => {
        switch ((onQueueEmpty(), level)) {
          case "progress":
            logForDebugging(`[useRemoteSession] ${wait}: ${line}`);
            sendQueued(line, "held", null);
            onAskAnswer(wait_2, line.replace(TRAILING_ELLIPSIS_RE, ""));
            return;
          case "debug":
            logForDebugging(`[useRemoteSession] ${wait}: ${line}`);
            return;
          case "info":
          case "warning": {
            let converted = createSystemMessage(line, level === "info" ? "notice" : "warning");
            seenUuids.current.add(converted.uuid);
            setMessages((prev) => [...prev, converted]);
            return;
          }
          default:
        }
      };
    let toolUseIds = flattened.map(({ feed, name, wait }) => {
      let handler = handle(name, wait);
      let unsubscribe = feed.subscribe(handler);
      for (let item of feed.takeBacklog()) handler(item);
      return unsubscribe;
    });
    return () => toolUseIds.forEach((block) => block());
  }, [undefined, config?.homeSeed, setMessages, onQueueEmpty, onAskAnswer]);
  useEffect(() => {
    let deviceNotBoundNotice = config?.deviceNotBoundNotice;
    if (!deviceNotBoundNotice) return;
    let seeded = true;
    deviceNotBoundNotice.then((block) => {
      if (!seeded || block === undefined) return;
      if (block.toast) addNotification(createDeviceNotBoundNotification(block.text));
      textRef.current = block.text;
      onQueueEmpty();
    });
    return () => {
      seeded = false;
      textRef.current = undefined;
    };
  }, [config?.deviceNotBoundNotice, addNotification, onQueueEmpty]);
  useEffect(() => {
    if (!config) {
      if (isTimedOut.current) {
        isTimedOut.current = false;
        setConnStatus(false);
        timedOutNotified.current = false;
        autoFollow.current = false;
        stopped.current = false;
        isSending.current = false;
        sentCount.current = 0;
        responseTimeoutRef.current = 0;
        receivedCount.current = 0;
        isFlushing.current = false;
        accepting.current = true;
        disconnect();
        onError();
        retraction.inProgressToolUses.clear();
        resetCounters();
        streaming.resetMetrics();
      }
      return;
    }
    isTimedOut.current = true;
    accepting.current = Boolean(config.isAttachToExisting || config.viewerOnly);
    disconnect();
    onMessage(null);
    isStreaming.current = false;
    onRetry();
    responseTimeoutRef.current = 0;
    receivedCount.current = config.initialPromptUuid !== undefined ? 1 : 0;
    isFlushing.current = false;
    let seedBackgroundTasks = config.seedBackgroundTasks;
    isCompactingRef.current = new Set(seedBackgroundTasks?.awaitingFinish);
    runningTaskIds.current = new Set(seedBackgroundTasks?.foreground);
    heldIds.current = seedBackgroundTasks?.foreground ?? [];
    retryingIds.clear();
    config.seedAskersPastATurn?.forEach((prev) => retryingIds.add(prev));
    runningTaskIdsRef.current = new Map(seedBackgroundTasks?.running.map((task) => [task.id, task]));
    remoteTasks.current = new Map(
      config.seedWorkflowRuns?.map((seedWorkflowRun) => [seedWorkflowRun.id, seedWorkflowRun]),
    );
    writeTaskCount();
    if (seedBackgroundTasks !== undefined)
      logEvent("tengu_remote_background_tasks_adopted", {
        via: lit_2("seed"),
        running: seedBackgroundTasks.running.length,
        awaiting_finish: seedBackgroundTasks.awaitingFinish.length,
      });
    lastActivityAt.current = Date.now();
    if (config.initialPromptUuid) compactingIds.add(config.initialPromptUuid);
    logForDebugging(`[useRemoteSession] Initializing for session ${config.sessionId}`);
    let done = false;
    let needsRefetch = false;
    let loggedNestedFrames = new Set();
    let loggedToolResult = false;
    let admitProjectPersonMessages = undefined;
    let mapIncomingMessage = undefined;
    let next = new Set(replyChannelConfig !== null ? (config.seedReplyChannelToolUseIds ?? []) : []);
    isReconnecting.current = replyChannelConfig !== null && appStoreDirect.getState().hasRemoteReplyChannel;
    let wasReconnecting = isReconnecting.current;
    function noteReplyChannelInit() {
      let previouslyReconnecting = wasReconnecting;
      wasReconnecting = false;
      if (isReconnecting.current) {
        if (previouslyReconnecting) logEvent("tengu_remote_reply_channel_init", {});
        return;
      }
      isReconnecting.current = true;
      logEvent("tengu_remote_reply_channel_init", {});
      setAppState_2((replyPrev) =>
        replyPrev.hasRemoteReplyChannel
          ? replyPrev
          : {
              ...replyPrev,
              hasRemoteReplyChannel: true,
            },
      );
    }
    if (config.seedActiveGoal !== undefined) {
      let seedActiveGoal = config.seedActiveGoal ?? undefined;
      setAppState_2((goalPrev) =>
        goalPrev.activeGoal === seedActiveGoal
          ? goalPrev
          : {
              ...goalPrev,
              activeGoal: seedActiveGoal,
            },
      );
      if (seedActiveGoal !== undefined)
        logEvent("tengu_remote_active_goal_adopted", {
          via: lit_2("seed"),
          active: true,
        });
    }
    if (config.seedAutocompactState !== undefined) {
      let seedAutocompactState = config.seedAutocompactState;
      setAppState_2((autocompactPrev) => ({
        ...autocompactPrev,
        remoteAutocompactState: seedAutocompactState,
      }));
      logEvent("tengu_remote_autocompact_state_adopted", {
        via: lit_2("seed"),
        enabled: seedAutocompactState.enabled,
        enforced: seedAutocompactState.enforced,
        source: fromEnum(seedAutocompactState.source),
      });
    }
    let hasAutocompactState = config.seedAutocompactState !== undefined;
    let adoptArtifacts = (artifacts, via) => {
      let keptCount = 0;
      let changed = false;
      setAppState_2((artifactPrev) => {
        let mergedArtifacts = mergeCloudArtifactFrames(artifactPrev, artifacts);
        changed = mergedArtifacts !== artifactPrev;
        keptCount = count(
          Object.values(mergedArtifacts.frameUrls),
          (frameUrl) => frameUrl.fromCloudSession === true,
        );
        return mergedArtifacts;
      });
      if (!changed && keptCount === (artifacts?.length ?? 0)) return;
      logEvent("tengu_remote_cloud_artifacts_adopted", {
        via: fromEnum(via),
        listed: artifacts?.length ?? 0,
        kept: keptCount,
      });
    };
    let hasSessionArtifacts = config.seedSessionArtifacts !== undefined;
    if (config.seedSessionArtifacts !== undefined) adoptArtifacts(config.seedSessionArtifacts, "seed");
    let remoteRateLimitAdopter = createRemoteRateLimitAdopter(
      () => adoptRateLimits && !config.viewerOnly,
      "stream",
    );
    queueMicrotask(() => remoteRateLimitAdopter.adopt(config.seedRateLimitInfos ?? [], "seed"));
    let rateLimitPhase = config.initialSequenceNum === undefined ? "history" : "replay";
    let settleRateLimits = () => {
      remoteRateLimitAdopter.settle(rateLimitPhase);
      rateLimitPhase = "replay";
    };
    let replInputAccumulator = undefined;
    let cwdApplySeq = 0;
    let loggedCwd = false;
    let manager = null;
    let announcedLive = false;
    let loggedListedAtReconnect = false;
    let sawWorkerFrame = false;
    let onLine = ({ line, level }) => {
      if (level === "debug") {
        logForDebugging(`[useRemoteSession] hooks: ${line}`);
        return;
      }
      setMessages((messagesForHookLine) => [
        ...messagesForHookLine,
        createSystemMessage(line, level === "warning" ? "warning" : "notice"),
      ]);
    };
    let syncRoot = () => null;
    let settingsWatcher = (() => {
      if (config.viewerOnly || !isViolinWoodEnabledCached()) return null;
      try {
        return watchServedSettings(
          configChangeBlocker(setAppState, storageV5, credentials),
          storageV5,
          deviceHooksProcessMemories.of(host),
        );
      } catch (error) {
        logError(error);
        return null;
      }
    })();
    let servedToolsConnection = (() => {
      if (config.servedTools === undefined || config.viewerOnly || !isViolinWoodEnabledCached()) return null;
      try {
        let onAnnounceOutcome = config.servedTools.onAnnounceOutcome;
        let onRevoked = config.servedTools.onRevoked;
        let remoteSessionConnection = createRemoteSessionConnection({
          sessionId: config.sessionId,
          manager: () => manager,
          ...config.servedTools,
          onAnnounceOutcome: (announceOutcome, reason) => {
            if (announceOutcome.kind === "announced") {
              pendingPrompt_.current =
                announceOutcome.status === "announced"
                  ? {
                      on: true,
                      name: remoteSessionConnection.servedHost()?.name ?? "",
                    }
                  : {
                      on: false,
                    };
              onQueueEmpty();
            } else if (announceOutcome.kind === "refused" || announceOutcome.kind === "unsupported") {
              pendingPrompt_.current = {
                on: false,
              };
              onQueueEmpty();
            }
            onAnnounceOutcome?.(announceOutcome, reason);
          },
          onRevoked:
            onRevoked === undefined
              ? undefined
              : (prev) =>
                  onRevoked((message) => {
                    pendingPrompt_.current = {
                      on: false,
                    };
                    onQueueEmpty();
                    prev(message);
                  }),
        });
        heldServedCallRef.current = remoteSessionConnection.heldServedCall;
        let unregisterCleanup = registerCleanup(() => remoteSessionConnection.close());
        return {
          ...remoteSessionConnection,
          close: () => {
            unregisterCleanup();
            let closePromise = remoteSessionConnection.close();
            let onCloseCleanup = registerCleanup(() => closePromise);
            closePromise.finally(onCloseCleanup);
            return closePromise;
          },
        };
      } catch (error) {
        logError(error);
        return null;
      }
    })();
    let hookForwarding = (() => {
      if (settingsWatcher === null || config.viewerOnly || !isHookForwardingEnabled()) return null;
      try {
        return startDeviceHookForwarding({
          launchDir: getOriginalCwd(),
          cloudSessionId: config.sessionId,
          memory: deviceHooksProcessMemories.of(host),
          getTools: () => toolsRef(),
          storageV5,
          manager: () => manager,
          syncRoot,
          onLine,
          registerCleanup,
          subscribeSettingsChanges: (prev) => settingsWatcher.subscribe(prev),
        });
      } catch (error) {
        logError(error);
        return null;
      }
    })();
    let managerConfig = {
      ...config,
      admitProjectPersonMessages: admitProjectPersonMessages !== undefined,
      subagentRequestsOutliveTheTurn: true,
      trackSendsInFlight: true,
      keepUndeliveredResponses: config.keepUndeliveredResponses ?? isDeviceIdentityEnabledCached(),
      nameToolOnPermissionAllow: config.nameToolOnPermissionAllow ?? isDeviceIdentityEnabledCached(),
      rearmRedeliveredPermissionRequests:
        config.rearmRedeliveredPermissionRequests ?? isDeviceIdentityEnabledCached(),
      ignoreErrorShapedDialogReplies:
        config.ignoreErrorShapedDialogReplies ?? isDeviceIdentityEnabledCached(),
      nameRepositoryTrustAnswers: config.nameRepositoryTrustAnswers ?? isRepositoryTrustGateEnabled(),
      pinComputerFolderAllow: isServedCallWatchEnabled,
    };
    pendingPrompt.current = hookForwarding;
    let notifiedUndelivered = new Set();
    let manager_2 = new RemoteSessionManager(managerConfig, {
      onMessage: (request, requestId) => {
        sawWorkerFrame = true;
        if (!capFrameDepth(request)) return;
        let frameTags = [`type=${request.type}`];
        if ("subtype" in request) frameTags.push(`subtype=${request.subtype}`);
        if (request.type === "user") {
          let content = request.message?.content;
          frameTags.push(
            `content=${Array.isArray(content) ? content.map((block) => block.type).join(",") : typeof content}`,
          );
        }
        logForDebugging(`[useRemoteSession] Received ${frameTags.join(" ")}`);
        scheduleRefusalRetry();
        if (requestId?.replayed === false && request.type !== "rate_limit_event") settleRateLimits();
        let sentThisTurn = stopped.current || isSending.current || sentCount.current > 0;
        let receivedBefore = receivedCount.current;
        let turnMarkers = {
          sent: receivedBefore > 0,
          taskWake: isFlushing.current,
        };
        let isReplay = requestId?.replayed === true && requestId.resumed !== true;
        let refusalSignal = isModelRefusalFallback_2(request);
        if (refusalSignal)
          evictRefusalRetraction({
            index: retraction,
            signal: refusalSignal,
            surface: "ccr",
            setMessages,
            setInProgressToolUseIDs,
          });
        onServedCall();
        if (request.type === "env_manager_log") {
          let now = Date.now();
          let hasOpenSetup =
            activeToolUse.current !== null &&
            activeToolUse.current.hasStructuredSteps &&
            !activeToolUse.current.terminal;
          if (accepting.current && !hasOpenSetup && isStaleTimestamp(request, now)) return;
          let converted = convertSDKMessage(request);
          let setupProgress =
            activeToolUse.current ??
            createSetupProgress(now, {
              wake: Boolean(config.isAttachToExisting),
            });
          let nextProgress = applySetupEvent(
            setupProgress,
            request,
            converted.type === "env_log" ? converted.message : "",
            now,
            lastActivityAt.current,
          );
          if (!stopped.current && converted.type === "env_log" && converted.message !== "") {
            if (!accepting.current) setConnStatus(true);
            sendQueued(converted.message, "provisioning", currentSetupLabel(nextProgress));
          }
          if (nextProgress !== activeToolUse.current) {
            if (
              setupProgress.terminal &&
              !nextProgress.terminal &&
              nextProgress.dismissed &&
              !isStreaming.current
            ) {
              isStreaming.current = true;
              logEvent("tengu_remote_bootstrap_cycle_hidden", {});
            }
            onDialogs(nextProgress);
            if (
              nextProgress.steps.some((step) => step.status === "failed") &&
              !setupProgress.steps.some((step) => step.status === "failed")
            )
              onReconnect(nextProgress.dismissed);
            if (nextProgress.terminal) {
              isStreaming.current = false;
              onPromptClear();
              closeDialogs();
            }
          }
          return;
        }
        let currentSetup = activeToolUse.current;
        let syntheticMessage = classifySetupFrame(currentSetup, request);
        if (syntheticMessage === "failed" && currentSetup !== null) {
          let failedProgress = markCurrentStepFailed(currentSetup, Date.now());
          if (failedProgress !== currentSetup) {
            onDialogs(failedProgress);
            onReconnect(false);
          } else if (!currentSetup.steps.some((queue) => queue.status === "failed")) syntheticMessage = null;
        }
        if (syntheticMessage !== "notice") onPromptClear();
        if (request.type !== "user" && syntheticMessage === null) closeDialogs();
        if (
          !stopped.current &&
          (request.type === "assistant" ||
            request.type === "stream_event" ||
            (request.type === "system" && request.subtype === "status" && request.status === "requesting"))
        ) {
          setConnStatus(true);
          hookForwarding?.onTurnInFlight();
        }
        if (request.type === "tool_progress") {
          hookForwarding?.onTurnInFlight();
          if (request.heartbeat === true && requestId?.replayed !== true && !stopped.current)
            setConnStatus(true);
        }
        if (request.type === "user" && request.uuid && compactingIds.has(request.uuid)) {
          let uuid = request.uuid;
          if (uuid === config.initialPromptUuid) {
            let convertedFirst = convertSDKMessage(request, {
              convertUserTextMessages: true,
            });
            setMessages((item) =>
              convertedFirst.type !== "message" || item.some((queue) => queue.uuid === uuid)
                ? item
                : [...item, convertedFirst.message],
            );
            return;
          }
          let wasCompacting = managerRef_2.current.delete(uuid);
          setMessages((item) => {
            let lastIndex = item.findLastIndex((queue) => queue.uuid === uuid);
            if (lastIndex === -1) {
              if (!wasCompacting) return item;
              let convertedEcho = convertSDKMessage(request, {
                convertUserTextMessages: true,
              });
              return convertedEcho.type === "message" ? [...item, convertedEcho.message] : item;
            }
            if (lastIndex === item.length - 1) return item;
            let echoedMessage = item[lastIndex];
            return item.slice(0, lastIndex).concat(item.slice(lastIndex + 1), echoedMessage);
          });
          logForDebugging(`[useRemoteSession] Reconciled echoed user message ${uuid} to canonical position`);
          return;
        }
        if (request.type === "system" && request.subtype === "init") {
          let initFrame = parseInitFrame(request);
          logForDebugging(
            `[useRemoteSession] Init received with ${initFrame.slashCommands?.length ?? "no"} slash commands`,
          );
          if (replyChannelConfig !== null) {
            if (
              replyChannelConfig.hasReplyChannelInit({
                mcp_servers: initFrame.mcpServers,
                tools: initFrame.tools,
              })
            )
              noteReplyChannelInit();
            else if (!isReconnecting.current || wasReconnecting) {
              isReconnecting.current = false;
              wasReconnecting = false;
              setAppState_2((item) =>
                item.hasRemoteReplyChannel
                  ? {
                      ...item,
                      hasRemoteReplyChannel: false,
                    }
                  : item,
              );
            }
          }
          if (initFrame.cwd && !loggedCwd) {
            loggedCwd = true;
            logEvent("tengu_remote_reported_cwd", {
              place: fromEnum(classifyLaunchDirPosition(initFrame.cwd, getOriginalCwd())),
              is_following_reports: !isHarpForepillarOn(),
            });
          }
          if (initFrame.cwd) {
            let cwd = initFrame.cwd;
            let cwdSeq = ++cwdApplySeq;
            isAdoptableSessionCwd(cwd, "useRemoteSession")
              .then((queue) => {
                if (queue && cwdSeq === cwdApplySeq && managerRef.current === manager_2)
                  if (isHarpForepillarOn())
                    setCloudCwd({
                      sessionId: config.sessionId,
                      cwd,
                    });
                  else setCwdState_2(cwd);
              })
              .catch(() => {});
          }
          onInit({
            slash_commands: initFrame.slashCommands,
            model: initFrame.model,
            skills: initFrame.skills,
            plugins: initFrame.plugins,
            tools: initFrame.tools,
          });
          isSystemInitMessage(runningTaskIds.current, request);
          pendingCount.current++;
          writeTaskCount();
          hookForwarding?.onWorkerInit();
          servedToolsConnection?.requestAnnounce("worker_init", {
            workerEpoch: initFrame.workerEpoch,
          });
        }
        if (request.type === "result") {
          hookForwarding?.onTurnEnded();
          pendingRequests.forEach((requestId, toolUseId) => {
            servedCallWatch.requestClosed(toolUseId);
            retryingIds.add(requestId);
          });
          let repositoryTrust = config.repositoryTrust;
          if (repositoryTrust !== undefined) {
            let titleUpdated = hasUpdatedTitleRef.current;
            hasUpdatedTitleRef.current = false;
            let currentTrust = repositoryTrust.current();
            if (titleUpdated)
              repositoryTrust.refresh({
                force: true,
              });
            else if (currentTrust !== "trusted" && currentTrust !== "no_repository")
              repositoryTrust.refresh();
          }
        }
        if (request.type === "system" && "permissionMode" in request && request.permissionMode) {
          observedPermissionMode = parsePermissionMode(request.permissionMode) ?? observedPermissionMode;
          if (observedPermissionMode !== undefined) reportedModes.add(observedPermissionMode);
          noteObservedMode(request.permissionMode);
          onPermissionModeChange(request.permissionMode);
        }
        if (
          ((request.type === "system" && request.subtype === "init") || request.type === "result") &&
          request.fast_mode_state !== undefined
        ) {
          let fastModeState = request.fast_mode_state;
          if (fastModeState !== "on" && fastModeState !== "cooldown" && fastModeState !== "off")
            logForDebugging("[useRemoteSession] Ignoring fast_mode_state that is not on/cooldown/off", {
              level: "error",
            });
          else if (fastModeState === "off" && request.fast_mode_disabled_reason === "model_not_allowed");
          else {
            let fastOn = fastModeState !== "off";
            let fastChanged = false;
            setAppState_2((fastModePrev) => {
              if (!!fastModePrev.fastMode === fastOn) return fastModePrev;
              fastChanged = true;
              return {
                ...fastModePrev,
                fastMode: fastOn,
              };
            });
            if (fastChanged)
              logEvent("tengu_fast_mode_toggled", {
                enabled: fastOn,
                source: lit_2("remote_wire_adopt"),
                remote: true,
              });
          }
        }
        if (request.type === "active_goal") {
          let goalState = parseGoalState(request.value);
          setAppState_2((goalPrevStream) =>
            goalPrevStream.activeGoal === goalState
              ? goalPrevStream
              : {
                  ...goalPrevStream,
                  activeGoal: goalState,
                },
          );
          logEvent("tengu_remote_active_goal_adopted", {
            via: lit_2("stream"),
            active: goalState !== undefined,
          });
          return;
        }
        if (request.type === "autocompact_state") {
          hasAutocompactState = true;
          adoptRemoteAutocompactState(setAppState_2, request.value, lit_2("stream"));
          return;
        }
        if (request.type === "rate_limit_event") {
          let rateLimitInfo = dropRemoteRateLimitFrame(request.rate_limit_info);
          if (rateLimitInfo === undefined)
            logForDebugging("[useRemoteSession] Dropping rate_limit_event with invalid rate_limit_info", {
              level: "warn",
            });
          else if (requestId?.replayed === true) {
            remoteRateLimitAdopter.hold(rateLimitInfo);
            scheduleRefusalRetry();
          } else {
            remoteRateLimitAdopter.push(rateLimitInfo);
            rateLimitPhase = "replay";
          }
          return;
        }
        if (request.type === "system") {
          let sessionArtifacts = sessionMetadataArtifacts(request);
          if (sessionArtifacts !== undefined) {
            hasSessionArtifacts = true;
            adoptArtifacts(sessionArtifacts, "stream");
            return;
          }
          if (request.subtype === "plugin_install") pendingElicitation.current?.pluginInstallFrame();
          let { backgroundTaskEnded, isTaskLifecycleFrame } = trackThinClientFrame(
            {
              running: runningTaskIdsRef.current,
              awaitingFinish: isCompactingRef.current,
              foreground: runningTaskIds.current,
            },
            request,
          );
          applyRemoteTaskEvent(remoteTasks.current, request, Date.now());
          if (
            backgroundTaskEnded &&
            request.subtype === "task_notification" &&
            !isReplay &&
            (request.status !== "stopped" || request.reason === "worker_restart")
          )
            isFlushing.current = true;
          if (isTaskLifecycleFrame) {
            writeTaskCount();
            return;
          }
          if (request.subtype === "notification") {
            if (isValidNotice(request)) {
              let notice = normalizeSdkNotification(request, "remote");
              let evictedKey = pickRemoteNotificationToEvict(
                appStoreDirect.getState().notifications,
                notice.key,
              );
              if (evictedKey !== null) removeNotification(evictedKey);
              addNotification(notice);
              logEvent("tengu_remote_notification_routed", {
                via: lit_2("stream"),
                priority: fromEnum(request.priority),
              });
            } else logForDebugging("[useRemoteSession] Dropping malformed notification frame");
            return;
          }
          if (request.subtype === "status") {
            let wasAutoFollowing = autoFollow.current;
            autoFollow.current = request.status === "compacting";
            if (wasAutoFollowing && autoFollow.current) return;
          }
          if (request.subtype === "compact_boundary") autoFollow.current = false;
        }
        if (isResultEvent(request)) {
          isSystemInitMessage(runningTaskIds.current, request);
          pendingCount.current++;
          writeTaskCount();
          let shouldDeliver = !isReplay && shouldDeliverEvent(request, compactingIds, turnMarkers);
          if (!sentThisTurn && !isReplay) {
            receivedCount.current = Math.max(0, receivedCount.current - receivedBefore);
            isFlushing.current = false;
          }
          autoFollow.current = false;
          stopped.current = false;
          isSending.current = false;
          if (sentThisTurn) {
            if (sentCount.current > 0) sentCount.current--;
          } else if (shouldDeliver) onTurnComplete?.(request);
          else {
            logForDebugging(
              "[useRemoteSession] Result not counted as this client's turn; idle notification not re-armed",
            );
            if (!isReplay) onOtherTurnComplete?.(requestId?.ageMs ?? 0);
          }
          setConnStatus(false);
          resetCounters();
          streaming.resetMetrics();
        }
        if (request.type === "user") {
          let content = request.message?.content;
          if (Array.isArray(content)) {
            let toolUseIds = [];
            for (let block of content) if (block.type === "tool_result") toolUseIds.push(block.tool_use_id);
            if (toolUseIds.length > 0) {
              setInProgressToolUseIDs({
                action: "remove",
                ids: toolUseIds,
              });
              clearInProgressToolUses(retraction, toolUseIds);
              countOrphanToolResults(
                retraction,
                toolUseIds,
                "ccr",
                typeof request.uuid === "string" ? request.uuid : null,
              );
              let filtered = toolUseIds.filter((queue) => runningTaskIds.current.has(queue));
              if (manager_2.workerMovesBash() && filtered.length > 0) {
                filtered.forEach((item) => runningTaskIds.current.delete(item));
                writeTaskCount();
              }
            }
          }
        }
        if (replyChannelConfig !== null && request.type === "assistant" && !request.parent_tool_use_id)
          for (let replyBlock of request.message.content) {
            let blockKind = replyChannelConfig.replyChannelBlockKind(replyBlock);
            if (blockKind === undefined) continue;
            if (replyBlock.type === "tool_use") {
              if (next.has(replyBlock.id)) {
                noteReplyChannelInit();
                continue;
              }
              next.add(replyBlock.id);
            }
            noteReplyChannelInit();
            logEvent("tengu_remote_reply_channel_frame", {
              kind: fromEnum(blockKind),
            });
          }
        let nestedFrames = null;
        if (nestedFrames !== null) {
          if (typeof request.uuid === "string" && dropLateRetracted(retraction, request.uuid, "ccr")) return;
          if (nestedFrames.length > 0) {
            if (typeof request.uuid === "string")
              recordNestedUuidAliases(
                retraction,
                request.uuid,
                nestedFrames.map((prev) => prev.uuid),
              );
            let parentToolUseID = nestedFrames[0].parentToolUseID;
            if (!loggedNestedFrames.has(parentToolUseID)) {
              loggedNestedFrames.add(parentToolUseID);
              logEvent("tengu_remote_subagent_frame_nested", {
                frame_type: fromEnum(request.type),
              });
            }
            setMessages((prev) => {
              let filtered = nestedFrames.filter(
                (error) => !prev.some((existingMessage) => existingMessage.uuid === error.uuid),
              );
              return filtered.length === 0 ? prev : [...prev, ...filtered];
            });
          }
          return;
        }
        let sendMessage = convertSDKMessage(request, {
          convertUserTextMessages: true,
        });
        if (sendMessage.type === "conversation_reset") {
          let { ownClear, preserved } = clearTracker.onResetFrame();
          landWaitingLines();
          setMessages((messagesOnReset) => {
            if (managerRef_2.current.size > 100) managerRef_2.current.clear();
            for (let existingResetMessage of messagesOnReset)
              if (
                existingResetMessage.type === "user" &&
                compactingIds.has(existingResetMessage.uuid) &&
                !preserved.has(existingResetMessage.uuid)
              )
                managerRef_2.current.add(existingResetMessage.uuid);
            return messagesOnReset.filter(
              (keptMessage) =>
                (keptMessage.type === "user" && preserved.has(keptMessage.uuid)) ||
                (keptMessage.type === "system" && (ownClear || seenUuids.current.has(keptMessage.uuid))),
            );
          });
          streaming.setStreamingToolUses((prevToolUses) => (prevToolUses.length > 0 ? [] : prevToolUses));
          streaming.applyStreamingText(() => null);
          setInProgressToolUseIDs({
            action: "clear",
          });
          retraction.inProgressToolUses.clear();
          setConnStatus(false);
          onConversationReset?.(sendMessage.newConversationId);
          return;
        }
        if (sendMessage.type === "message") {
          if (sendMessage.message.type === "assistant") {
            let newToolUseIds = new Set(
              sendMessage.message.message.content
                .filter((block) => block.type === "tool_use")
                .map((block) => block.id),
            );
            streaming.setStreamingToolUses((prevToolUses) =>
              prevToolUses.some((toolUseEntry) => newToolUseIds.has(toolUseEntry.contentBlock.id))
                ? prevToolUses.filter((toolUseEntry) => !newToolUseIds.has(toolUseEntry.contentBlock.id))
                : prevToolUses,
            );
          } else
            streaming.setStreamingToolUses((prevToolUses) => (prevToolUses.length > 0 ? [] : prevToolUses));
          if (
            sendMessage.message.type === "assistant" &&
            sendMessage.message.message.content.some((block) => block.type === "text")
          )
            streaming.applyStreamingText(() => null);
          if (dropLateRetracted(retraction, sendMessage.message.uuid, "ccr")) return;
          if (sendMessage.message.type === "assistant") {
            let toolUseIds = sendMessage.message.message.content
              .filter((block) => block.type === "tool_use")
              .map((block) => block.id);
            if (toolUseIds.length > 0) {
              setInProgressToolUseIDs({
                action: "add",
                ids: toolUseIds,
              });
              recordInProgressToolUses(retraction, sendMessage.message.uuid, toolUseIds);
              if (manager_2.workerMovesBash()) {
                let pendingAtSend = pendingCount.current;
                getForegroundBashToolUseIds(request).forEach((toolUseId) =>
                  clock.setTimeout(() => {
                    if (
                      managerRef.current === manager_2 &&
                      pendingCount.current === pendingAtSend &&
                      retraction.inProgressToolUses.has(toolUseId)
                    ) {
                      runningTaskIds.current.add(toolUseId);
                      writeTaskCount();
                    }
                  }, BASH_TASK_COUNT_DELAY_MS),
                );
              }
            }
          }
          if (!loggedToolResult && request.type === "user") {
            let content = request.message?.content;
            if (Array.isArray(content) && content.some((block) => block.type === "tool_result")) {
              loggedToolResult = true;
              logEvent("tengu_remote_tool_result_rendered", {
                viewer_only: fromEnum(config.viewerOnly ? "true" : "false"),
              });
            }
          }
          let uuid = sendMessage.message.uuid;
          let baseMessage =
            admitProjectPersonMessages === undefined
              ? sendMessage.message
              : admitProjectPersonMessages(sendMessage.message, request, requestId?.source);
          let finalMessage =
            mapIncomingMessage === undefined
              ? baseMessage
              : mapIncomingMessage(baseMessage, request, requestId?.source);
          if (
            isHumanTurn_2(finalMessage) &&
            baseMessage === sendMessage.message &&
            requestId?.source?.startsWith("client") === true &&
            requestId.replayed !== true &&
            getIsLoading()
          ) {
            holdLine(finalMessage);
            return;
          }
          setMessages((messagesAfterDedupe) =>
            uuid && messagesAfterDedupe.some((existingMessage) => existingMessage.uuid === uuid)
              ? messagesAfterDedupe
              : [...messagesAfterDedupe, finalMessage],
          );
        } else if (sendMessage.type === "stream_event") {
          if (isSending.current) return;
          isNonRenderableSystemMessage(sendMessage.event, {
            onMessage: (systemMessage) =>
              setMessages((messagesWithSystem) => [...messagesWithSystem, systemMessage]),
            onUpdateLength: streaming.addResponseLength,
            onSetStreamMode: setStreamMode,
            onStreamingToolUses: streaming.setStreamingToolUses,
            replInputAccumulator,
            onApiMetrics: streaming.recordApiMetricsEvent,
            onStreamingText: (streamingText) => {
              if (!isReconnecting.current) streaming.applyStreamingText(streamingText);
            },
          });
        }
      },
      onPermissionRequest: (request, requestId, toolName, extra) => {
        logForDebugging(`[useRemoteSession] Permission request for tool: ${request.tool_name}`);
        let isSubagent = isSubagentToolRequest(request);
        if (isSubagent) pendingRequests.set(requestId, String(request.agent_id));
        if (config.viewerOnly) {
          if (!isSubagent) setConnStatus(false);
          return;
        }
        if (
          permissionDispatcher.dispatch(
            {
              type: "control_request",
              request_id: requestId,
              request,
            },
            false,
          )
        ) {
          if (!isHeldToolRequest(request)) servedCallWatch.requestOpened(requestId);
          if (!isSubagent) setConnStatus(false);
        }
      },
      onPermissionCancelled: (content, opts) => {
        logForDebugging(`[useRemoteSession] Permission request cancelled: ${content}`);
        servedCallWatch.requestClosed(content);
        permissionDispatcher.cancel(content);
        if (!pendingRequests.delete(content) && !stopped.current) setConnStatus(true);
      },
      onUserDialogRequest: (request, requestId) => {
        logForDebugging(`[useRemoteSession] User dialog request: ${request.dialog_kind}`);
        setConnStatus(false);
        if (config.viewerOnly) return;
        dialogDispatcher.dispatch({
          type: "control_request",
          request_id: requestId,
          request,
        });
      },
      onUserDialogCancelled: (requestId) => {
        logForDebugging(`[useRemoteSession] User dialog request cancelled: ${requestId}`);
        dialogDispatcher.cancel(requestId);
      },
      ...(hookForwarding !== null && hookForwarding.callbacks),
      ...(servedToolsConnection !== null && servedToolsConnection.callbacks),
      onWorkerLive: () => {
        sawWorkerFrame = true;
        servedToolsConnection?.requestAnnounce(announcedLive ? "reconnected" : "attached");
        servedToolsConnection?.callbacks.onWorkerLive?.();
        announcedLive = true;
        onRetry();
      },
      onWorkerConnectionStatus: (status) => {
        if (managerRef.current !== manager_2) return;
        let isGone = status === "disconnected";
        if (isGone && !sawWorkerFrame) {
          if (runningTaskIdsRef.current.size > 0) {
            logEvent("tengu_remote_background_tasks_dropped", {
              count: runningTaskIdsRef.current.size,
            });
            runningTaskIdsRef.current.clear();
          }
          runningTaskIds.current.clear();
          markTasksUnlisted(remoteTasks.current);
          writeTaskCount();
        }
        sawWorkerFrame = true;
        let goneChanged = false;
        setAppState_2((workerGonePrev) => {
          goneChanged = workerGonePrev.remoteWorkerReportedGone !== isGone;
          return goneChanged
            ? {
                ...workerGonePrev,
                remoteWorkerReportedGone: isGone,
              }
            : workerGonePrev;
        });
        let size = runningTaskIdsRef.current.size;
        if (goneChanged && size > 0)
          logEvent("tengu_remote_background_tasks_worker_report_changed", {
            worker_reported_gone: isGone,
            count: size,
          });
        if (isGone && getIsLoading() && accepting.current) onConnect();
      },
      onConnected: () => {
        logForDebugging("[useRemoteSession] Connected");
        onTransportEvent("connected");
        hookForwarding?.onStreamConnected();
        adoptSeedPermissionModeOnce();
        landWaitingLines();
        if (loggedListedAtReconnect && runningTaskIdsRef.current.size > 0)
          logEvent("tengu_remote_background_tasks_listed_at_reconnect", {
            count: runningTaskIdsRef.current.size,
          });
        loggedListedAtReconnect = true;
      },
      onLineTaken: lineTaken,
      onReconnecting: () => {
        logForDebugging("[useRemoteSession] Reconnecting");
        onTransportEvent("reconnecting");
        landWaitingLines();
        stopped.current = false;
        isSending.current = false;
        sentCount.current = 0;
        setInProgressToolUseIDs({
          action: "clear",
        });
        retraction.inProgressToolUses.clear();
      },
      onWithheldPromptSent: () => {
        onPrompt();
        pendingElicitation.current?.messageSent();
      },
      onWithholdableHeldChanged: (isHeld) => {
        if (managerRef.current === manager_2)
          onTaskUpdate(isHeld && !config.viewerOnly && isDeviceIdentityEnabledCached());
      },
      onWithheldPromptFailed: (reason, mayHaveReached) => {
        onPrompt();
        initialPromptUuidRef.current = config.initialPromptUuid;
        let content = config.withheldInitialPrompt?.content;
        if (typeof content === "string")
          addHistoryEntry(content, storageV5, {
            armUndo: false,
          });
        setMessages((messagesOnWithheldFail) => [
          ...messagesOnWithheldFail,
          reason === CANCELLED
            ? createSystemMessage(
                "You took your first message back. It wasn't sent to the cloud session.",
                "notice",
              )
            : createSystemMessage(
                mayHaveReached
                  ? `Your first message may not have reached the cloud session${formatReasonSuffix(reason)}. If Claude doesn't respond to it soon, send it again.`
                  : `Couldn't send your first message${formatReasonSuffix(reason)}.`,
                "warning",
              ),
        ]);
        if (responseTimeoutRef.current === 0) {
          setConnStatus(false);
          if (!mayHaveReached) receivedCount.current = 0;
        }
      },
      onResponseUndelivered: (reason, answerId, details) => {
        if (notifiedUndelivered.has(answerId)) return;
        if (notifiedUndelivered.size === 0) queueMicrotask(() => notifiedUndelivered.clear());
        notifiedUndelivered.add(answerId);
        setMessages((messagesOnUndelivered) => [
          ...messagesOnUndelivered,
          createSystemMessage(formatUndeliveredAnswerNotice(answerId, details), "warning"),
        ]);
      },
      onCatchUpTruncated: () => {
        logForDebugging("[useRemoteSession] Catch-up truncated \u2014 transcript gap");
        clearTracker.forget();
        setMessages((messagesOnTruncation) => [
          ...messagesOnTruncation,
          createSystemMessage(
            "Some earlier messages from this session could not be loaded after reconnecting.",
            "warning",
          ),
        ]);
        hasAutocompactState = true;
        setAppState_2((autocompactPrevTrunc) =>
          autocompactPrevTrunc.remoteAutocompactState === undefined
            ? autocompactPrevTrunc
            : {
                ...autocompactPrevTrunc,
                remoteAutocompactState: undefined,
              },
        );
        runningTaskIdsRef.current.clear();
        markTasksUnlisted(remoteTasks.current);
        writeTaskCount();
        remoteRateLimitAdopter.flush();
        let { status, isUsingOverage } = getCurrentLimits();
        if (status === "rejected" && !isUsingOverage)
          remoteRateLimitAdopter.adopt([currentLimits], "truncation");
        if (done) needsRefetch = true;
        else {
          done = true;
          let sessionId = config.sessionId;
          (async () => {
            try {
              do {
                needsRefetch = false;
                try {
                  if ((await harvestTruncated()) === "stale") return;
                } catch {}
              } while (needsRefetch);
            } finally {
              done = false;
            }
          })();
          async function harvestTruncated() {
            let ctx = await getSessionRequestConfig(sessionId, credentials);
            if (managerRef.current !== manager_2) return "stale";
            let latestEvents = await fetchLatestEvents(ctx, undefined, {
              reportFeatureHealth: false,
            });
            let signalCount = 0;
            let pageCount = 0;
            while (latestEvents && pageCount < MAX_REFUSAL_RETRIES) {
              if (managerRef.current !== manager_2) return "stale";
              pageCount++;
              signalCount += checkRefusalRetractionSource({
                index: retraction,
                events: latestEvents.events,
                surface: "truncation_harvest",
                setMessages,
                setInProgressToolUseIDs,
              });
              latestEvents =
                pageCount < MAX_REFUSAL_RETRIES && latestEvents.hasMore && latestEvents.firstId
                  ? await fetchOlderEvents(ctx, latestEvents.firstId)
                  : null;
            }
            if (managerRef.current !== manager_2) return "stale";
            logEvent("tengu_refusal_retraction_truncation_harvest", {
              signal_count: signalCount,
              page_count: pageCount,
            });
            return "done";
          }
        }
      },
      onDisconnected: (reason) => {
        logForDebugging("[useRemoteSession] Disconnected");
        if (
          reason === "session_stale_relogin" ||
          (reason === "untrusted_device" && isDeviceIdentityEnabledCached() && isTrustedDeviceGateEnabled())
        )
          setMessages((messagesOnDisconnect) => [
            ...messagesOnDisconnect,
            createSystemMessage(
              describeCredentialFailure({
                terminal: true,
                reason,
              }),
              "warning",
            ),
          ]);
        onTransportEvent("disconnected");
        onFrames();
      },
      onError: (error) => {
        logForDebugging(`[useRemoteSession] Error: ${error.message}`);
      },
    });
    let canPushLaunchMode = Boolean(config.isAttachToExisting) && !config.viewerOnly;
    let usesWithheldCreateMode =
      !config.isAttachToExisting &&
      !config.viewerOnly &&
      config.withheldInitialPrompt?.followsPermissionMode === true;
    let createPermissionMode =
      !config.isAttachToExisting &&
      !config.viewerOnly &&
      (isDeviceIdentityEnabledCached() || usesWithheldCreateMode)
        ? config.createPermissionMode
        : undefined;
    let sessionId = config.sessionId;
    let mode = appStoreDirect.getState().toolPermissionContext.mode;
    let launchModePush = (config.launchModePush ??= {
      mode,
      pushed: false,
    });
    let isPushingLaunchMode = false;
    let isManagerCurrent = () =>
      lastReceivedAt.current === receivedAtStart && heartbeatCount.current === manager_3;
    let manager_3 = heartbeatCount.current;
    let receivedAtStart = lastReceivedAt.current;
    function trackPendingMode(promise) {
      timeoutTimer.current = promise;
      let clearTimer = () => {
        if (timeoutTimer.current === promise) timeoutTimer.current = null;
      };
      promise.then(clearTimer, clearTimer);
    }
    function pushLaunchPermissionMode() {
      if (createPermissionMode !== undefined) {
        if (createPermissionMode.pushed) {
          logForDebugging("[useRemoteSession] Create permission mode already pushed for this session");
          return;
        }
        createPermissionMode.pushed = true;
        let { mode } = createPermissionMode;
        let posted = syncRemotePermissionMode({
          manager: manager_2,
          mode,
          surface: "terminal",
          sessionId,
          onTaken: noteOwnPermissionModePush(mode),
          superseded: () => managerRef.current !== manager_2 || lastReceivedAt.current !== receivedAtStart,
          observedMode: () => observedPermissionMode,
          seededModeReported: () => reportedModes.has(mode),
          linkDown: () => appStoreDirect.getState().remoteConnectionStatus !== "connected",
          onRefused: (refusal) => {
            noteOwnPermissionModePush("default");
            createPermissionMode.convergeEntry = beginModeLanding(setAppState_2, sessionId, "default", mode);
            refusal.then((outcome) => {
              if (outcome.outcome === "accepted" && createPermissionMode.convergeEntry !== undefined)
                clearOutstandingMode(setAppState_2, sessionId, createPermissionMode.convergeEntry);
            });
            trackPendingMode(refusal);
            if (appStoreDirect.getState().toolPermissionContext.mode === mode)
              onPermissionModeChange("default", "client");
            addNotification(notifyRemoteModeRejected(mode));
          },
          onGaveUp: (text) => {
            createPermissionMode.notTakenTold = true;
            if (createPermissionMode.convergeEntry !== undefined)
              clearOutstandingMode(setAppState_2, sessionId, createPermissionMode.convergeEntry);
            addNotification({
              key: "remote-create-mode-unrecorded",
              kind: "feedback",
              text,
              color: "warning",
              priority: "immediate",
            });
          },
        });
        createPermissionMode.posted = posted;
        trackPendingMode(posted);
        return;
      }
      let deviceIdentity = isDeviceIdentityEnabledCached();
      let from = deviceIdentity ? launchModePush.mode : mode;
      if (!canPushLaunchMode || from !== "plan" || (deviceIdentity && launchModePush.pushed)) return;
      launchModePush.pushed = true;
      isPushingLaunchMode = true;
      let revertPush = noteOwnPermissionModePush(from);
      manager_2
        .sendControlRequest({
          subtype: "set_permission_mode",
          mode: from,
        })
        .then(
          () => {
            isPushingLaunchMode = false;
            revertPush();
            logForDebugging(`[useRemoteSession] Applied launch permission mode: ${from}`);
            logFeatureOk("mode_switch");
          },
          (error) => {
            isPushingLaunchMode = false;
            let errorKind = classifyControlRequestError(error);
            logForDebugging(
              `[useRemoteSession] Launch set_permission_mode rejected (${errorKind}): ${errorMessage(error)}`,
            );
            logFeatureBad("mode_switch", errorKind);
            let isDisconnected =
              (errorKind === "disconnected" || errorKind === "not_connected") &&
              appStoreDirect.getState().remoteConnectionStatus !== "connected";
            if (
              managerRef.current !== manager_2 ||
              isDisconnected ||
              errorKind === "aborted" ||
              heartbeatCount.current !== manager_3 ||
              (isDeviceIdentityEnabledCached() && lastReceivedAt.current !== receivedAtStart)
            ) {
              if (
                managerRef.current === manager_2 &&
                (isDisconnected || errorKind === "aborted") &&
                isManagerCurrent()
              )
                launchModePush.pushed = false;
              return;
            }
            if (appStoreDirect.getState().toolPermissionContext.mode === from)
              onPermissionModeChange("default", "client");
            addNotification(notifyRemoteModeRejected(from));
            if (isDeviceIdentityEnabledCached()) {
              let receivedAt = lastReceivedAt.current;
              let convergeEntry = beginModeLanding(setAppState_2, sessionId, "default", from);
              let clearConverge = () => clearOutstandingMode(setAppState_2, sessionId, convergeEntry);
              sendModeWithRetry({
                mode: "default",
                send: (modeToSend) => {
                  noteOwnPermissionModePush(modeToSend);
                  return manager_2.sendControlRequest({
                    subtype: "set_permission_mode",
                    mode: modeToSend,
                  });
                },
                superseded: () => managerRef.current !== manager_2 || lastReceivedAt.current !== receivedAt,
                onTaken: clearConverge,
                onGaveUp: () => {
                  clearConverge();
                  addNotification(notifyRemoteModeUnsynced());
                },
                onNotTaken: (sendError) => {
                  if (managerRef.current === manager_2) clearConverge();
                  logForDebugging(
                    `[useRemoteSession] The default sent after that refusal was not taken either: ${errorMessage(sendError)}`,
                  );
                },
              });
            }
          },
        );
    }
    let deviceIdentity = isDeviceIdentityEnabledCached();
    let launchMode = deviceIdentity ? launchModePush.mode : mode;
    let mustWarnOnModeMismatch =
      canPushLaunchMode &&
      !(deviceIdentity && launchModePush.judged) &&
      launchMode !== "default" &&
      launchMode !== "plan" &&
      isExternalPermissionMode(launchMode) &&
      !(launchMode === "auto" && deviceIdentity && isAutoModeFromFallback());
    let observedMode = null;
    let reportedModes = new Set();
    let observedPermissionMode;
    let retryTimer = null;
    function noteObservedMode(permissionMode) {
      if (!mustWarnOnModeMismatch) return;
      if (!EXTERNAL_PERMISSION_MODES.includes(permissionMode)) return;
      observedMode = permissionMode;
      scheduleRefusalRetry();
    }
    function scheduleRefusalRetry() {
      if (!(mustWarnOnModeMismatch && observedMode !== null) && !remoteRateLimitAdopter.hasHeld()) return;
      retryTimer?.();
      retryTimer = clock.setTimeout(runDelayedRetry, REFUSAL_RETRY_DELAY_MS);
    }
    function runDelayedRetry() {
      retryTimer = null;
      if (managerRef.current !== manager_2) return;
      settleRateLimits();
      if (mustWarnOnModeMismatch && observedMode !== null) warnModeMismatch();
    }
    function warnModeMismatch() {
      if (!mustWarnOnModeMismatch || managerRef.current !== manager_2) return;
      mustWarnOnModeMismatch = false;
      launchModePush.judged = true;
      let sessionOwnsMode =
        deviceIdentity &&
        observedMode !== null &&
        (() => {
          let label = appStoreDirect.getState().remoteModeSessions[sessionId]?.label;
          return label?.mode === observedMode && label.origin === "person";
        })();
      if (
        observedMode === null ||
        observedMode === launchMode ||
        heartbeatCount.current !== manager_3 ||
        sessionOwnsMode
      )
        return;
      addNotification({
        key: "remote-launch-mode-not-applied",
        kind: "warning",
        text: `This cloud session is in ${observedMode} mode; your ${launchMode} setting wasn't applied.`,
        color: "warning",
        priority: "high",
      });
    }
    let seedPermissionMode = config.seedPermissionMode;
    let adoptSeedMode = config.adoptSeedPermissionMode === true;
    let seedModeAdopted = seedPermissionMode === undefined;
    function adoptSeedPermissionModeOnce() {
      if (seedModeAdopted || managerRef.current !== manager_2) return;
      seedModeAdopted = true;
      if (seedPermissionMode === undefined || !(adoptSeedMode || isDeviceIdentityEnabledCached())) return;
      try {
        let mode = appStoreDirect.getState().toolPermissionContext.mode;
        onPermissionModeChange(seedPermissionMode);
        logEvent("tengu_remote_permission_mode_adopted", {
          via: lit_2("seed"),
          mode: fromEnum(seedPermissionMode),
          applied:
            mode !== seedPermissionMode &&
            appStoreDirect.getState().toolPermissionContext.mode === seedPermissionMode,
        });
      } catch (error) {
        logForDebugging(`[useRemoteSession] Seeded permission mode not adopted: ${errorMessage(error)}`, {
          level: "warn",
        });
      }
    }
    managerRef.current = manager_2;
    if (!accepting.current) manager_2.beginWorkerStart();
    manager = manager_2;
    if (hookForwarding !== null)
      manager_2.addSendGate(
        (gate) => Promise.race([hookForwarding.beforeSend(), gate.released, gate.withdrawn, gate.decided]),
        {
          onRelease: "send",
        },
      );
    manager_2.connect();
    pushLaunchPermissionMode();
    let posted = usesWithheldCreateMode ? createPermissionMode?.posted : undefined;
    if (createPermissionMode !== undefined && posted !== undefined) {
      let retireGate = () => {};
      retireGate = manager_2.addSendGate(
        retirePostedMode({
          posted,
          mode: createPermissionMode.mode,
          latch: createPermissionMode,
          retire: () => retireGate(),
        }),
        {
          onRelease: "withhold",
          onExit: "await",
        },
      );
      posted
        .then(
          (postResult) => postResult.outcome === "accepted",
          () => false,
        )
        .then((accepted) => {
          if (
            accepted ||
            createPermissionMode.notTakenTold ||
            managerRef.current !== manager_2 ||
            lastReceivedAt.current !== receivedAtStart
          )
            return;
          createPermissionMode.notTakenTold = true;
          addNotification({
            key: "remote-create-mode-unrecorded",
            kind: "feedback",
            text: MODE_NOT_SAVED_IDLE_TEXT,
            color: "warning",
            priority: "immediate",
          });
        });
    }
    let pluginForwarding = null;
    pendingDialog.current = config.viewerOnly
      ? null
      : env.CLAUDE_CODE_DISABLE_PLUGIN_FORWARDING
        ? "switched_off"
        : isCloudPluginForwardingEnabledCached()
          ? null
          : "not_enabled";
    try {
      pluginForwarding =
        !config.viewerOnly && pendingDialog.current === null
          ? forwardCloudPlugins({
              sessionId: config.sessionId,
              reattach: Boolean(config.isAttachToExisting),
              manager: manager_2,
              memory: deviceProofStateRegistry.of(host),
              storageV5,
              reach: createDeviceHookDecider({
                launchDir: getOriginalCwd(),
                syncRoot,
                syncElsewhere: config.isAttachToExisting
                  ? (config.sessionRecordMayBeElsewhere ?? "unknown")
                  : false,
                memory: reachStateRegistry.of(host).reachFor(getOriginalCwd()),
              }),
              say: ({ line, level }) => {
                if (level === "debug") {
                  logForDebugging(`[useRemoteSession] plugins: ${line}`);
                  return;
                }
                setMessages((messagesOnPluginLog) => [
                  ...messagesOnPluginLog,
                  createSystemMessage(line, level),
                ]);
              },
              onChange: () => onQueueEmpty(),
            })
          : null;
    } catch (error) {
      logError(error);
      pendingDialog.current = "attach_failed";
    }
    pendingElicitation.current = pluginForwarding;
    onQueueEmpty();
    let unsubTrust = config.repositoryTrust?.onChanged(() => {
      if (managerRef.current === manager_2) onQueueEmpty();
    });
    config.homeSeed?.completion.then(() => {
      if (managerRef.current === manager_2) onQueueEmpty();
    });
    config.homeSeed?.readBack.then((attachments) => {
      if (managerRef.current === manager_2) {
        pendingAttachments.current = attachments;
        onQueueEmpty();
      }
    });
    if (config.isAttachToExisting) pluginForwarding?.workerKnownUp();
    else if (config.initialPromptUuid !== undefined && config.withheldInitialPrompt === undefined)
      pluginForwarding?.messageSent();
    let dirSyncSendGate = config.dirSync?.sync.sendGate?.bind(config.dirSync.sync);
    if (dirSyncSendGate !== undefined)
      manager_2.addSendGate((gateArg) => dirSyncSendGate(gateArg), {
        onRelease: "withhold",
      });
    let teardownExitWatcher = undefined;
    let unsentReporter = null;
    let unusedFlagA = false;
    let unusedFlagB = false;
    let unusedRefA = undefined;
    let unusedTeardown = undefined;
    let abortController = null;
    let labelForCount = (count) => (count === 1 ? "Your last message" : `Your last ${count} messages`);
    let writeStderr = (text) => {
      try {
        writeSync(2, text);
      } catch {}
    };
    let reportUnsent = ({ unsent, refused, unconfirmed }) => {
      if (unsent > 0 && unsentReporter?.tellsOfUnsent !== true)
        writeStderr(`${labelForCount(unsent)} ${unsent === 1 ? "was" : "were"} not sent: ${unsent === 1 ? "it was" : "they were"} still waiting to be sent when you quit.
`);
      let refusedCounts = new Map();
      for (let reason of refused) refusedCounts.set(reason, (refusedCounts.get(reason) ?? 0) + 1);
      for (let [reason, refusedCount] of refusedCounts)
        writeStderr(`${labelForCount(refusedCount)} ${refusedCount === 1 ? "was" : "were"} not sent \u2014 ${reason}.
`);
      if (unconfirmed > 0)
        writeStderr(`${labelForCount(unconfirmed)} may not have reached the cloud session: ${unconfirmed === 1 ? "it was" : "they were"} still being sent when you quit.
`);
    };
    let lastReport = {
      unsent: 0,
      refused: [],
      unconfirmed: 0,
    };
    let pendingExit = null;
    let flushAndReport = () =>
      (pendingExit ?? Promise.resolve())
        .then(() =>
          manager_2.releaseHeldSends(pendingExit === null ? undefined : 100, {
            exiting: true,
            final: true,
          }),
        )
        .then((report) =>
          reportUnsent({
            unsent: lastReport.unsent + report.unsent,
            refused: [...lastReport.refused, ...report.refused],
            unconfirmed: lastReport.unconfirmed + report.unconfirmed,
          }),
        );
    let unregisterFlush = registerCleanup(flushAndReport);
    let flushOnExit = () => {
      unregisterFlush();
      let reportPromise = manager_2.releaseHeldSends(undefined, {
        exiting: true,
        final: isShuttingDown(),
      });
      pendingExit = reportPromise.catch(() => {});
      let unregister = registerCleanup(flushAndReport);
      reportPromise.then((report) => {
        lastReport = report;
        if (
          report.unsent === 0 &&
          report.refused.length === 0 &&
          report.unconfirmed === 0 &&
          report.stillHeld === 0
        )
          unregister();
      }, unregister);
    };
    let clientPresencePulse = startClientPresencePulse(
      config.sessionId,
      getOauthConfig().BASE_API_URL,
      async () => ({
        Authorization: `Bearer ${await getAccessTokenRefreshed(config, {
          credentials,
          storageV5,
        })}`,
      }),
      (headers, kind) => {
        if (kind === "resend") return Promise.resolve(false);
        let Authorization = headers.Authorization;
        let token = Authorization?.startsWith("Bearer ") ? Authorization.slice(7) : "";
        return config.onAuth401?.(token) ?? Promise.resolve(false);
      },
    );
    let drainDispatchers = () => {
      permissionDispatcher.drain();
      pendingRequests.clear();
      dialogDispatcher.drain();
    };
    config.storedSessionArtifacts?.then((artifacts) => {
      if (managerRef.current === manager_2 && !hasSessionArtifacts && Array.isArray(artifacts))
        adoptArtifacts(artifacts, "stored");
    });
    config.storedAutocompactState?.then((autocompactState) => {
      let frame = SDKAutocompactStateMessageSchema().shape.value.safeParse(autocompactState).data;
      if (managerRef.current === manager_2 && !hasAutocompactState && frame !== undefined)
        adoptRemoteAutocompactState(setAppState_2, frame, lit_2("seed"));
    });
    config.preflightCheck?.catch((error) => {
      if (managerRef.current !== manager_2) return;
      setMessages((messagesOnPreflight) => [
        ...messagesOnPreflight,
        createSystemMessage(errorMessage(error), "warning"),
      ]);
      drainDispatchers();
      pluginForwarding?.teardown();
      pendingElicitation.current = null;
      hookForwarding?.dispose();
      pendingPrompt.current = null;
      heldServedCallRef.current = undefined;
      servedToolsConnection?.close();
      settingsWatcher?.dispose();
      clientPresencePulse.teardown();
      manager_2.disconnect();
      managerRef.current = null;
      onTaskRemove();
      onTransportEvent("disconnected");
      onFrames();
    });
    return () => {
      logForDebugging("[useRemoteSession] Cleanup - disconnecting");
      drainDispatchers();
      let { count, settled } = manager_2.sendsInFlight();
      if (count > 0) {
        let unregisterExitLog = registerCleanup(() => {
          let startTime = performance.now();
          logEvent("tengu_remote_exit_sends_awaited", {
            count,
          });
          return settled.then(() =>
            logEvent("tengu_remote_exit_sends_settled", {
              settled_after_ms: Math.round(performance.now() - startTime),
            }),
          );
        });
        settled.finally(unregisterExitLog);
      }
      onServedCallEnd();
      mustWarnOnModeMismatch = false;
      retryTimer?.();
      retryTimer = null;
      clientPresencePulse.teardown();
      markSessionRead(config.sessionId);
      onError();
      pluginForwarding?.teardown();
      pendingElicitation.current = null;
      unsubTrust?.();
      remoteRateLimitAdopter.dispose();
      flushOnExit();
      teardownExitWatcher?.();
      unusedTeardown?.();
      abortController?.abort();
      hookForwarding?.dispose();
      pendingPrompt.current = null;
      heldServedCallRef.current = undefined;
      servedToolsConnection?.close();
      settingsWatcher?.dispose();
      if (isPushingLaunchMode && isManagerCurrent()) launchModePush.pushed = false;
      manager_2.disconnect();
      managerRef.current = null;
      onTaskRemove();
    };
  }, [
    config,
    adoptRateLimits,
    setMessages,
    holdLine,
    lineTaken,
    landWaitingLines,
    setConnStatus,
    onInit,
    onPermissionModeChange,
    noteOwnPermissionModePush,
    onTurnComplete,
    onOtherTurnComplete,
    onConversationReset,
    streaming,
    setStreamMode,
    setInProgressToolUseIDs,
    onTransportEvent,
    writeTaskCount,
    clock,
    credentials,
    setAppState,
    host,
    storageV5,
    permissionDispatcher,
    dialogDispatcher,
    servedCallWatch,
    pendingRequests,
    retryingIds,
    isHeldToolRequest,
    onServedCall,
    onServedCallEnd,
    onFrames,
    onConnect,
    onRetry,
    getIsLoading,
    resetCounters,
    onElicitation,
    onPrompt,
    onPromptClear,
    spinnerStore,
    setAppState_2,
    appStoreDirect,
    addNotification,
    removeNotification,
    onQueueEmpty,
    onTaskRemove,
    onTaskUpdate,
    retraction,
  ]);
  let maybeNameSession = useCallback(
    (input) => {
      if (
        timedOutNotified.current ||
        !config ||
        config.initialPromptUuid ||
        config.hasExplicitTitle ||
        config.viewerOnly ||
        config.isAttachToExisting ||
        appStoreDirect.getState().remoteSessionName !== undefined
      )
        return;
      timedOutNotified.current = true;
      let sessionId = config.sessionId;
      let text = typeof input === "string" ? input : extractTextContent_2(input, " ");
      if (text)
        checkSessionTitlePolicyTaint(text, new AbortController().signal, credentials).then((title) => {
          if (appStoreDirect.getState().remoteSessionName !== undefined) return;
          updateSessionTitle(sessionId, title.title);
        });
    },
    [config, credentials, appStoreDirect],
  );
  let sendNow = useCallback(
    async (content, options, submittedAtMs) => {
      let manager = managerRef.current;
      if (!manager) {
        logForDebugging("[useRemoteSession] Cannot send - no manager");
        return false;
      }
      onServedCall();
      let servedBefore = servedCallCount.current;
      let wasStopped = stopped.current;
      stopped.current = false;
      setConnStatus(true);
      let openSetup = activeToolUse.current;
      if (
        openSetup !== null &&
        !openSetup.terminal &&
        !openSetup.dismissed &&
        openSetup.steps.some((step) => step.status === "failed")
      )
        onMessage({
          ...openSetup,
          dismissed: true,
        });
      if (options?.uuid) compactingIds.add(options.uuid);
      receivedCount.current++;
      clearTracker.noteSend(options);
      pendingElicitation.current?.messageSent();
      let inFlightSlot = undefined;
      if (inFlightSlot !== undefined) inFlightSlot.inFlight++;
      let sendResult;
      try {
        sendResult = await (submittedAtMs === undefined
          ? manager.sendMessage(content, options)
          : manager.sendMessage(content, options, submittedAtMs));
      } finally {
        if (inFlightSlot !== undefined) inFlightSlot.inFlight--;
      }
      onPrompt();
      if (!sendResult.ok) {
        stopped.current = stopped.current || (wasStopped && isSending.current);
        receivedCount.current = Math.max(0, receivedCount.current - 1);
        clearTracker.noteSendFailed(options);
        landWaitingLines();
        setMessages((messagesOnSendFail) => [
          ...messagesOnSendFail,
          sendResult.reason === CANCELLED
            ? createSystemMessage(MESSAGE_WITHDRAWN_TEXT, "notice")
            : createSystemMessage(sendFailedMessage(sendResult), "warning"),
        ]);
        setConnStatus(false);
        if (sendResult.status === 409) onConnect();
        return false;
      }
      onRetry();
      maybeNameSession(content);
      if (!config?.viewerOnly && servedCallCount.current === servedBefore) {
        if (
          !servedCallWatch.watch(
            () => {
              logForDebugging("[useRemoteSession] Response timeout - attempting reconnect");
              landWaitingLines();
              let warningMessage = createSystemMessage(UNRESPONSIVE_NOTICE, "warning");
              setMessages((prev) => [...prev, warningMessage]);
              manager.reconnect();
            },
            (scheduleTimeout) => clock.setTimeout(scheduleTimeout, responseTimeoutMs(autoFollow.current)),
          )
        )
          setMessages((messagesOnWaitingNotice) => [
            ...messagesOnWaitingNotice,
            createSystemMessage(WAITING_FOR_ANSWER_NOTICE, "notice"),
          ]);
      }
      return true;
    },
    [
      config,
      host,
      setConnStatus,
      setMessages,
      landWaitingLines,
      clock,
      servedCallWatch,
      onServedCall,
      onPrompt,
      maybeNameSession,
      clearTracker,
      onConnect,
      onRetry,
    ],
  );
  let flushHeld = useCallback(async () => {
    if (held.current) return;
    held.current = true;
    try {
      while (heldMessages.current.length > 0) {
        let heldMessage = heldMessages.current.shift();
        if (heldMessage === undefined) break;
        let openSetup = activeToolUse.current;
        if (openSetup !== null && openSetup.queuedCount !== heldMessages.current.length)
          onMessage({
            ...openSetup,
            queuedCount: heldMessages.current.length,
          });
        await sendNow(heldMessage.content, heldMessage.opts, heldMessage.submittedAtMs);
      }
    } finally {
      held.current = false;
    }
  }, [sendNow, onMessage]);
  useEffect(() => {
    releaseHeld.current = () => {
      flushHeld().catch((error) => logError(error));
    };
  }, [flushHeld]);
  let holdsSends = useCallback(
    () => !config?.viewerOnly && (!accepting.current || held.current || heldMessages.current.length > 0),
    [config],
  );
  let sendMessage = useCallback(
    async (content, options) => {
      if (!managerRef.current) {
        logForDebugging("[useRemoteSession] Cannot send - no manager");
        return false;
      }
      responseTimeoutRef.current += 1;
      if (holdsSends()) {
        if (options?.uuid) compactingIds.add(options.uuid);
        clearTracker.noteSend(options);
        stopped.current = false;
        setConnStatus(true);
        heldMessages.current.push({
          content,
          opts: options,
          submittedAtMs: Date.now(),
        });
        let openSetup =
          activeToolUse.current ??
          createSetupProgress(Date.now(), {
            wake: Boolean(config?.isAttachToExisting),
          });
        onMessage({
          ...openSetup,
          queuedCount: heldMessages.current.length,
        });
        maybeNameSession(content);
        logForDebugging(
          `[useRemoteSession] Queued message during bootstrap (${heldMessages.current.length} queued)`,
        );
        return true;
      }
      return sendNow(content, options);
    },
    [holdsSends, setConnStatus, onMessage, maybeNameSession, sendNow, clearTracker],
  );
  let cancelHeldMessages = useCallback(() => {
    let allowed = !config?.viewerOnly && isDeviceIdentityEnabledCached();
    let cancelledCount = allowed ? (managerRef.current?.cancelHeldSends() ?? 0) : 0;
    if (cancelledCount === 0) {
      if (appStoreDirect.getState().cloudMessageHeld !== undefined)
        logFeatureSad("remote_held_message_cancel", allowed ? "nothing_held" : "not_allowed");
      onTaskUpdate(false);
      return false;
    }
    logForDebugging(
      `[useRemoteSession] Esc at idle: took back ${cancelledCount} held message(s), no interrupt`,
    );
    logFeatureOk("remote_held_message_cancel", {
      count: cancelledCount,
    });
    return true;
  }, [config, appStoreDirect, onTaskUpdate]);
  let cancelRequest = useCallback(() => {
    onElicitation();
    if (!config?.viewerOnly) {
      managerRef.current?.cancelSession();
      onDisconnect();
      return;
    }
    onServedCallEnd();
    setConnStatus(false);
  }, [config, setConnStatus, onServedCallEnd, onDisconnect, onElicitation]);
  let sendControlRequest = useCallback((setMessages, manager) => {
    let manager_2 = managerRef.current;
    if (!manager_2)
      return Promise.reject(
        Error("[useRemoteSession] Cannot send control request (no manager): not connected"),
      );
    let waitForMode = setMessages.subtype === "set_permission_mode" ? timeoutTimer.current : null;
    let pending =
      waitForMode === null
        ? manager_2.sendControlRequest(setMessages, manager)
        : waitForMode.then(() => {
            let manager_2 = managerRef.current;
            if (!manager_2)
              throw Error("[useRemoteSession] Cannot send control request (no manager): not connected");
            return manager_2.sendControlRequest(setMessages, manager);
          });
    if (setMessages.subtype === "set_permission_mode") {
      lastReceivedAt.current++;
      pending.then(
        () => {
          heartbeatCount.current++;
        },
        () => {},
      );
    }
    return pending;
  }, []);
  let sendQueuedNow = useCallback(
    (options) => {
      let manager = managerRef.current;
      if (!manager || config?.viewerOnly) return Promise.resolve("failed");
      let sendsNow = manager.workerSendsNow();
      if (holdsSends() || sendsNow === false || (sendsNow === undefined && !manager.hasPostedMessage()))
        return Promise.resolve("not_asked");
      return requestSendNow(async (prev) => {
        await manager.releaseHeldSends(undefined, {
          keepWithheld: true,
        });
        if (managerRef.current !== manager) throw Error("disconnected before the request was sent");
        return manager.sendControlRequest(prev);
      }, options);
    },
    [config, holdsSends],
  );
  let cancelRequest_2 = useCallback(() => managerRef.current?.workerSendsNow(), []);
  let disconnect_2 = useCallback(() => managerRef.current?.serviceTimeMs(), []);
  let viewerOnly = config?.viewerOnly ?? false;
  let sessionId = config?.sessionId;
  let dynamicFields = useMemo(() => {
    return;
  }, [viewerOnly, sessionId]);
  let disconnect_3 = useCallback(() => {
    onServedCallEnd();
    managerRef.current?.disconnect();
    managerRef.current = null;
    onTaskUpdate(false);
  }, [onServedCallEnd, onTaskUpdate]);
  return useMemo(
    () => ({
      isRemoteMode,
      sendMessage,
      cancelRequest,
      cancelHeldMessages,
      sendQueuedNow,
      workerSendsNow: cancelRequest_2,
      serviceTimeMs: disconnect_2,
      holdsSends,
      disconnect: disconnect_3,
      sendControlRequest,
      ...dynamicFields,
    }),
    [
      isRemoteMode,
      sendMessage,
      cancelRequest,
      cancelHeldMessages,
      sendQueuedNow,
      cancelRequest_2,
      disconnect_2,
      holdsSends,
      disconnect_3,
      sendControlRequest,
      dynamicFields,
    ],
  );
}
//@ chunk-18hwfzwa.js:308155-308479 sole-consumer
/**
 * 判断用户主目录设置向云会话转发的状态：功能未开、启动时保留、留在本机、未决定或未发送。
 */
function homeSettingsForwardingStatus(launchKeepsSettings, useAntiCloudMode) {
  let homeSettingsForwardingBlocker = getHomeSettingsForwardingBlocker(isSettingsToCloudEnabledCached());
  if (homeSettingsForwardingBlocker !== null)
    return homeSettingsForwardingBlocker === "flag_off" ? "not_enabled" : homeSettingsForwardingBlocker;
  if (!launchKeepsSettings) return "launch_keeps_them";
  let forwardMode = (useAntiCloudMode ? storedHomeSettingsMode() : storedForwardMode()) ?? "unspecified";
  if (!isHomeSettingsForwardConsent() && forwardMode !== "keep_local") return "not_sent";
  switch (forwardMode) {
    case "keep_local":
      return "kept_on_this_machine";
    case "unspecified":
      return "not_decided";
    case "forward":
      return "not_sent";
  }
}
//@ chunk-18hwfzwa.js:308479-308579 sole-consumer
function deviceNotBoundNoticeText(notifications) {
  for (let notification of [notifications.current, ...notifications.queue])
    if (notification?.key === REMOTE_DEVICE_NOT_BOUND && "text" in notification) return notification.text;
  return;
}
//@ chunk-18hwfzwa.js:308579-308654 sole-consumer
var MESSAGE_WITHDRAWN_TEXT = "You took your message back. It wasn't sent to the cloud session.";
//@ chunk-18hwfzwa.js:308654-308714 sole-consumer
function formatReasonSuffix(reason) {
  return reason === "" ? "" : `: ${reason.replace(/\.+$/, "")}`;
}
//@ chunk-18hwfzwa.js:308714-308930 sole-consumer
function sendFailedMessage(failure) {
  let suffix = sendFailureMessage(failure);
  return suffix === undefined
    ? `Couldn't send your message${formatReasonSuffix(signInNoLongerUsableReason(failure) ?? failure.reason)}.`
    : `Your message may not have reached the cloud session${formatReasonSuffix(suffix)}. If Claude doesn't respond to it soon, send it again.`;
}
//@ chunk-18hwfzwa.js:308930-309142 sole-consumer
function archivedSessionMessage(sessionId) {
  return `This cloud session was archived, so it can't take new messages until it is unarchived at claude.ai. Start a new session to continue, or view this one at ${getRemoteSessionUrl(
    sessionId,
    undefined,
    {
      from: "cli",
      m: "0",
    },
  )}`;
}
//@ chunk-18hwfzwa.js:309142-309213 sole-consumer
async function getAccessTokenRefreshed(config, options) {
  if (!isConsoleProfileSessionsCredential()) await checkAndRefreshOAuthTokenIfNeeded(options);
  return config.getAccessToken();
}
//@ chunk-18hwfzwa.js:309213-309217 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:309213", () => {
  init_react_production();
});
export { useRemoteSession };
