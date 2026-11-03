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
import { init_react_production, R, Oo, P, ce, y, Q } from "../../vendor/react/cjs/react.production.js";
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

//@ chunk-18hwfzwa.js:263226-263230 sole-consumer
init_react_production();
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
      subscribe: (He) => sharedDetector.subscribe(He),
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
  let Re = detector.subscribe(() => resetLocalSettingsGitTrackedCache());
  let Be = detector.subscribe((He) => signals.servedSettingsChanged.emit(He));
  return {
    subscribe: (He) => {
      let We = [detector.subscribe(He), sharedDetector.subscribe(He)];
      return () => We.forEach((ze) => ze());
    },
    dispose: () => {
      Re();
      Be();
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
  noteSend(h) {
    if (h?.clearsConversation) {
      if (h.uuid !== undefined && this.#e.some((D) => D.uuid === h.uuid)) return;
      this.#e.push({
        uuid: h.uuid,
        sends: new Set(),
      });
      if (this.#e.length > 20) this.#e.shift();
      return;
    }
    let last = this.#e.at(-1);
    if (!last || !h?.uuid) return;
    if (last.sends.size >= 100) last.sends.clear();
    last.sends.add(h.uuid);
  }
  noteSendFailed(h) {
    let uuid = h?.uuid;
    if (h?.clearsConversation) {
      let D = uuid === undefined ? this.#e.length - 1 : this.#e.findIndex((L) => L.uuid === uuid);
      if (D !== -1) this.#e.splice(D, 1);
      return;
    }
    if (uuid === undefined) return;
    for (let D of this.#e) D.sends.delete(uuid);
  }
  onResetFrame() {
    let h = this.#e.shift();
    if (!h)
      return {
        ownClear: false,
        preserved: new Set(),
      };
    let x = new Set(h.sends);
    for (let D of this.#e) {
      if (D.uuid !== undefined) x.add(D.uuid);
      for (let send of D.sends) x.add(send);
    }
    return {
      ownClear: true,
      preserved: x,
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
var REMOTE_DIALOG_HANDLERS = {
  [REFUSAL_FALLBACK_DIALOG.kind]: async (h, x, D) => {
    let L = REFUSAL_FALLBACK_DIALOG.payload().safeParse(x);
    if (!L.success)
      return {
        behavior: "cancelled",
      };
    let ee = await h(REFUSAL_FALLBACK_DIALOG, L.data, D);
    return ee === "cancelled"
      ? {
          behavior: "cancelled",
        }
      : {
          behavior: "completed",
          result: ee,
        };
  },
  [serverFallbackNoticeSpec.kind]: async (h, x, D) => {
    let L = serverFallbackNoticeSpec.payload().safeParse(x);
    if (!L.success)
      return {
        behavior: "cancelled",
      };
    let ee =
      L.data.gatewayHost === undefined || L.data.gatewayHost === ""
        ? undefined
        : truncateGatewayHost(L.data.gatewayHost);
    let ke = await h(
      serverFallbackNoticeSpec,
      withGatewayHost(
        ee === undefined
          ? {}
          : {
              gatewayHost: ee,
            },
      ),
      D,
    );
    return ke === "cancelled"
      ? {
          behavior: "cancelled",
        }
      : {
          behavior: "completed",
          result: ke,
        };
  },
};
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
  dispatch = (h) => {
    if (h.request.subtype !== "request_user_dialog") return;
    let { request, request_id: requestId } = h;
    let L = REMOTE_DIALOG_HANDLERS[request.dialog_kind];
    if (!L) {
      this.inputs.sendResponse(requestId, {
        behavior: "cancelled",
      });
      return;
    }
    let inFlight = this.inFlight;
    let abortController = new AbortController();
    inFlight.set(requestId, abortController);
    let Re = () => inFlight.get(requestId) === abortController && inFlight.delete(requestId);
    L(this.inputs.requestDialog, request.payload, {
      signal: abortController.signal,
    })
      .then((Be) => {
        if (!Re()) return;
        this.inputs.sendResponse(requestId, Be);
      })
      .catch(() => {
        if (!Re()) return;
        this.inputs.sendResponse(requestId, {
          behavior: "cancelled",
        });
      });
  };
  cancel = (h) => {
    let x = this.inFlight.get(h);
    if (!x) return;
    this.inFlight.delete(h);
    x.abort();
  };
  drain() {
    for (let [h, x] of this.inFlight) {
      this.inFlight.delete(h);
      x.abort();
    }
  }
}
//@ chunk-18hwfzwa.js:265842-265863 sole-consumer
class InFlightCounter {
  inFlight = 0;
}
//@ chunk-18hwfzwa.js:265863-265890 sole-consumer
var inFlightCounterSlot = new HostScoped(() => new InFlightCounter());
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
  let host = useSession((ss) => ss.host);
  let setAppState = useSession();
  let heldServedCallRef = R(undefined);
  let Ho = Oo(() => tools);
  let Io = Oo((ss) => Promise.resolve("unanswered"));
  let Wo = Oo((ss, Gs) => Promise.resolve("unanswered"));
  let mn = Oo((ss) =>
    Promise.resolve({
      answer: "unanswered",
    }),
  );
  P(() => {
    return;
  }, [config]);
  let { columns } = useTerminalSize();
  let No = Oo(() => columns);
  let setConnStatus = ce(
    (ss) => {
      if (ss && getIsLoading()) return;
      setIsLoading(ss);
    },
    [getIsLoading, setIsLoading],
  );
  let Yo = R(false);
  let [kn] = y(() => new Map());
  let Fn = R(false);
  let bn = R(false);
  let Go = R(0);
  let hn = R(0);
  let initialPromptUuidRef = R(undefined);
  let Xo = R(false);
  let Sn = ce(() => {
    streaming.applyStreamingText(() => null);
    streaming.setStreamingToolUses((prev) => (prev.length > 0 ? [] : prev));
  }, [streaming]);
  let clock = useClock();
  let setAppState_2 = useSetAppState();
  let appStoreDirect = useAppStoreDirect();
  let spinnerStore = useSpinnerStore();
  let { addNotification, removeNotification } = useNotifications();
  let mr = ce(
    (ss) =>
      setAppState_2((prev) =>
        prev.remoteConnectionStatus === ss
          ? prev
          : {
              ...prev,
              remoteConnectionStatus: ss,
            },
      ),
    [setAppState_2],
  );
  let runningTaskIdsRef = R(new Map());
  let Wn = R(new Map());
  let Fr = R(new Set());
  let Zn = R([]);
  let Un = R(0);
  let writeTaskCount = ce(() => {
    let ss = [...runningTaskIdsRef.current.values()];
    let Gs = Fr.current;
    let ma = Zn.current.some((xl) => Gs.has(xl)) ? "seeded" : Gs.size > 0 ? "in_turn" : "none";
    let $a = reconcileRemoteTasks(Wn.current, runningTaskIdsRef.current, Date.now());
    setAppState_2((xl) => applyRemoteTaskState(xl, ss, $a, ma));
  }, [setAppState_2]);
  let [or] = y(() => new ServedCallWatch());
  let pr = ce(() => {
    or.clear();
  }, [or]);
  let Qn = R(0);
  let ur = ce(() => {
    Qn.current++;
    pr();
  }, [pr]);
  let Ir = R(null);
  let Pr = R(Date.now());
  let ts = R(false);
  let Gn = R(null);
  let Ur = R(null);
  let Zr = R(null);
  let wr = ce(
    (ss) => {
      Ir.current = ss;
      setAppState_2((Gs) =>
        Gs.remoteBootstrap === ss
          ? Gs
          : {
              ...Gs,
              remoteBootstrap: ss,
            },
      );
    },
    [setAppState_2],
  );
  let zr = ce(
    (ss) => {
      let Gs = Ir.current;
      wr(ss);
      if ((Gs === null || !Gs.terminal) && ss.terminal) {
        Gn.current?.workerCameUp();
        Ur.current?.onWorkerUp();
        if (ss.hasStructuredSteps) {
          let any = ss.steps.some((step) => step.status === "failed");
          if (!ss.dismissed && !any)
            setMessages(($a) => [...$a, createSystemMessage(setupReadySummary(ss), "info")]);
          if (!any) logFeatureOk("remote_bootstrap");
        }
      }
    },
    [wr, setMessages],
  );
  let _r = R(true);
  let fr = R([]);
  let $r = R(false);
  let Yr = R(() => {});
  let [Er] = y(() => new ConversationClearTracker());
  let Vr = R(new Set());
  let ms = ce(
    (ss = true, Gs = "disconnected") => {
      landWaitingLines();
      let ma = fr.current.length;
      fr.current = [];
      Er.forget();
      if (ma > 0) {
        if (ss) logFeatureSad("remote_bootstrap", "queue_dropped");
        setMessages(($a) => [
          ...$a,
          createSystemMessage(
            Gs === "start_failed"
              ? `${ma} queued ${plural(ma, "message")} not sent \u2014 the cloud session didn't start. Send ${ma === 1 ? "it" : "them"} again to retry.`
              : `${ma} queued ${plural(ma, "message")} not sent \u2014 the session disconnected before the container was ready.`,
            "warning",
          ),
        ]);
      }
      if (Ir.current !== null && Ir.current.queuedCount !== 0)
        wr({
          ...Ir.current,
          queuedCount: 0,
        });
    },
    [setMessages, landWaitingLines, wr, Er],
  );
  let Xs = ce(() => {
    let ss = Ir.current;
    if (ss !== null && !ss.terminal) zr(completeSetupProgress(ss, Date.now()));
    if (!_r.current) {
      bn.current = false;
      Yo.current = false;
      Go.current = 0;
      _r.current = true;
      qn.current?.endWorkerStart();
      if (ss === null) {
        Gn.current?.workerCameUp();
        Ur.current?.onWorkerUp();
      }
      let Gs = fr.current.length === 0;
      Yr.current();
      let ma =
        config?.initialPromptUuid !== undefined && config.initialPromptUuid !== initialPromptUuidRef.current;
      if (Gs && getIsLoading() && !ma) setConnStatus(false);
    }
  }, [zr, config, getIsLoading, setConnStatus]);
  let Ls = ce(
    (ss) => {
      logFeatureBad("remote_bootstrap", "step_failed");
      ts.current = false;
      ms(false, "start_failed");
      _r.current = true;
      qn.current?.endWorkerStart();
      bn.current = false;
      Yo.current = false;
      Go.current = 0;
      hn.current = 0;
      Xo.current = false;
      setConnStatus(false);
      if (ss)
        setMessages((Gs) => [
          ...Gs,
          createSystemMessage(
            "Cloud container provisioning failed \u2014 reconnect or check the session logs",
            "warning",
          ),
        ]);
    },
    [ms, setConnStatus, setMessages],
  );
  let is = ce(() => {
    ur();
    if (!Yo.current) {
      Go.current++;
      hn.current = Math.max(0, hn.current - 1);
    }
    Xo.current = false;
    Yo.current = true;
    bn.current = true;
    setConnStatus(false);
    let ss = Ir.current;
    if (ss !== null && !ss.terminal && !ss.dismissed)
      wr({
        ...ss,
        dismissed: true,
      });
  }, [ur, setConnStatus, wr]);
  let ws = R(false);
  let Ci = R(null);
  let oi = R(false);
  let Oi = Oo((ss, Gs, ma) => {
    if (Yo.current) return;
    if (Gs === "provisioning" && oi.current) return;
    let overrideMessage = spinnerStore.get().overrideMessage;
    if (overrideMessage === null || overrideMessage === Ci.current) {
      let replaced = ss.replace(TRAILING_ELLIPSIS_RE, "");
      let Si = truncateToRemainingWidth(Gs === "held" ? replaced : ss, No());
      spinnerStore.main.setMessage(
        Si,
        ma === null
          ? null
          : {
              words: ma,
              detail:
                replaced.trim().toLowerCase() === ma.replace(TRAILING_ELLIPSIS_RE, "").trim().toLowerCase()
                  ? null
                  : ss,
            },
      );
      Ci.current = Si;
      oi.current = Gs === "held";
    }
  });
  let Hi = R(undefined);
  let Zi = R(undefined);
  let textRef = R(undefined);
  let qn = R(null);
  let ps = ce(() => {
    if (!config || config.viewerOnly || !isDeviceIdentityEnabledCached() || qn.current === null) return;
    let ss = Gn.current;
    let Gs = dirSyncSessionByHost.of(host);
    let ma = Gs.silentlyNotArmed(config.sessionId);
    let $a = {
      state: "absent",
      ...(config.isAttachToExisting
        ? {
            reason: mapRecordWhereToReason(config.sessionRecordLookup),
          }
        : ma !== undefined
          ? {
              reason: ma,
            }
          : (Gs.notOptedIn(config.sessionId) ?? {
              reason: "not_set_up",
            })),
    };
    let xl = Zi.current;
    let Si = noop_2_2($a);
    if (textRef.current === undefined && !config.isAttachToExisting)
      textRef.current = deviceNotBoundNoticeText(appStoreDirect.getState().notifications);
    let na = textRef.current;
    let js = isRepositoryTrustGateEnabled() ? config.repositoryTrust?.current() : undefined;
    let Ya = reportableRepositoryTrust(js, isTrustedDeviceActiveForOrg());
    let localToolsSyncStatus = getLocalToolsSyncStatus(
      xl,
      na === undefined ? undefined : formatDeviceNotBoundMessage(na),
      js === "nothing_to_mark" && isBelowFloorEnforced(attestationFor(undefined)),
    );
    let ol = directorySyncStatusOrUndefined($a, nullOnError_2(undefined));
    let seedSyncState = toSeedSyncState(
      config.homeSeed,
      homeSettingsForwardingStatus(host.launchOptions.mayForwardHomeSettings(), false),
      Hi.current,
    );
    let _d = {
      ...(ol !== undefined && {
        projectFiles: ol,
      }),
      ...(Si !== undefined && {
        whileClosed: Si,
      }),
      ...(Ya !== undefined && {
        repositoryTrust: Ya,
      }),
      settings: describeProjectFilesSync(
        ol === undefined ? normalizeNoProjectFiles(seedSyncState) : seedSyncState,
      ),
      plugins: getPluginsSyncStatus(
        ss !== null
          ? {
              kind: "attached",
              state: ss.state(),
            }
          : Zr.current !== null
            ? {
                kind: "absent",
                reason: Zr.current,
              }
            : {
                kind: "pending",
              },
      ),
      ...(localToolsSyncStatus !== undefined && {
        localTools: localToolsSyncStatus,
      }),
    };
    setAppState_2((ga) =>
      ga.cloudSessionSync !== undefined && isSameSyncStatus(ga.cloudSessionSync, _d)
        ? ga
        : {
            ...ga,
            cloudSessionSync: _d,
          },
    );
  }, [config, host, setAppState_2, appStoreDirect]);
  let xs = R(new Map());
  let kr = R(undefined);
  let ls = ce(
    (ss) => {
      if (!ss) {
        xs.current.clear();
        kr.current = undefined;
      }
      let Gs = ss ? kr.current : undefined;
      setAppState_2((ma) =>
        (ma.cloudMessageHeld !== undefined) === ss && ma.cloudMessageHeld?.row === Gs
          ? ma
          : {
              ...ma,
              cloudMessageHeld: ss
                ? Gs === undefined
                  ? {}
                  : {
                      row: Gs,
                    }
                : undefined,
            },
      );
    },
    [setAppState_2],
  );
  let Ms = ce(() => {
    Hi.current = undefined;
    Zi.current = undefined;
    ls(false);
    setAppState_2((prev) =>
      prev.cloudSessionSync === undefined
        ? prev
        : {
            ...prev,
            cloudSessionSync: undefined,
          },
    );
  }, [setAppState_2, ls]);
  let qs = ce(() => {
    oi.current = false;
    let ss = Ci.current;
    if (ss === null) return;
    Ci.current = null;
    if (spinnerStore.get().overrideMessage === ss) spinnerStore.main.setMessage(null);
  }, [spinnerStore]);
  let gs = ce(() => {
    if (oi.current) qs();
  }, [qs]);
  let es = ce(() => {
    if (!oi.current) qs();
  }, [qs]);
  let ds = ce(() => {
    mr("connecting");
    qs();
    wr(null);
    Ms();
    ts.current = false;
    runningTaskIdsRef.current.clear();
    isCompactingRef.current.clear();
    Fr.current.clear();
    Wn.current.clear();
    writeTaskCount();
    setAppState_2((ss) =>
      ss.remoteWorkerReportedGone
        ? {
            ...ss,
            remoteWorkerReportedGone: false,
          }
        : ss,
    );
    setInProgressToolUseIDs({
      action: "clear",
    });
    Fn.current = false;
    setAppState_2((ss) =>
      ss.hasRemoteReplyChannel
        ? {
            ...ss,
            hasRemoteReplyChannel: false,
          }
        : ss,
    );
    setAppState_2((ss) =>
      ss.workerInventory === null
        ? ss
        : {
            ...ss,
            workerInventory: null,
          },
    );
    setAppState_2((ss) =>
      ss.remoteSessionName === undefined
        ? ss
        : {
            ...ss,
            remoteSessionName: undefined,
          },
    );
    setAppState_2((ss) =>
      ss.activeGoal === undefined
        ? ss
        : {
            ...ss,
            activeGoal: undefined,
          },
    );
    setAppState_2((ss) =>
      ss.remoteAutocompactState === undefined
        ? ss
        : {
            ...ss,
            remoteAutocompactState: undefined,
          },
    );
    setAppState_2((ss) => mergeCloudArtifactFrames(ss, null));
  }, [mr, qs, wr, Ms, writeTaskCount, setInProgressToolUseIDs, setAppState_2]);
  let Hs = ce(() => {
    ur();
    Yo.current = false;
    bn.current = false;
    Go.current = 0;
    hn.current = 0;
    Xo.current = false;
    setConnStatus(false);
    qs();
    runningTaskIdsRef.current.clear();
    Fr.current.clear();
    markTasksUnlisted(Wn.current);
    writeTaskCount();
    setInProgressToolUseIDs({
      action: "clear",
    });
    retraction.inProgressToolUses.clear();
    Sn();
    streaming.resetMetrics();
  }, [ur, setConnStatus, qs, writeTaskCount, setInProgressToolUseIDs, retraction, Sn, streaming]);
  let _s = R(null);
  let fs = R(false);
  let ii = R(0);
  let ua = ce(() => {
    fs.current = false;
    _s.current = null;
    ii.current++;
  }, []);
  let La = ce(() => {
    let ss = qn.current;
    if (config === undefined || ss === null) return Promise.resolve();
    if (isEssentialTrafficOnly()) return Promise.resolve();
    if (_s.current !== null) return _s.current;
    let Gs = ii.current;
    let $a = (async () => {
      try {
        let accessTokenRefreshed = await getAccessTokenRefreshed(config, {
          credentials,
          storageV5,
        });
        let Si;
        try {
          Si = (
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
          Si = (
            await fetchSession(config.sessionId, {
              accessToken: config.getAccessToken(),
            })
          ).session_status;
        }
        if (Si !== "archived" || qn.current !== ss || ii.current !== Gs) return;
        if (!fs.current) {
          fs.current = true;
          setMessages((na) => [
            ...na,
            createSystemMessage(archivedSessionMessage(config.sessionId), "warning"),
          ]);
        }
        Hs();
      } catch (error) {
        logForDebugging(
          `[useRemoteSession] Could not read whether the session was archived: ${errorMessage(error)}`,
        );
      }
    })();
    _s.current = $a;
    $a.finally(() => {
      if (_s.current === $a) _s.current = null;
    });
    return $a;
  }, [config, credentials, storageV5, setMessages, Hs]);
  let Xa = ce(
    (ss, Gs) => {
      let ma = xs.current.get(ss);
      if (ma === undefined || Gs === ma) {
        xs.current.set(ss, Gs);
        return;
      }
      if (kr.current !== undefined) return;
      kr.current = ss;
      setAppState_2(($a) =>
        $a.cloudMessageHeld !== undefined && $a.cloudMessageHeld.row !== ss
          ? {
              ...$a,
              cloudMessageHeld: {
                row: ss,
              },
            }
          : $a,
      );
    },
    [setAppState_2],
  );
  let dl = ce(
    (ss, Gs) => {
      let ma = qn.current;
      queueMicrotask(() => {
        if (qn.current !== ma || ma?.hasWithholdableHeldSend() !== true) return;
        Xa(ss, Gs);
      });
    },
    [Xa],
  );
  let Vl = R(0);
  let Hd = R(0);
  let Ss = R(null);
  let yi = R(false);
  let Ws = R(false);
  P(() => {
    if (config === undefined) return;
    let ss = false;
    let Gs = async (ma) => {
      try {
        let accessToken = await getAccessTokenRefreshed(config, {
          credentials,
          storageV5,
        });
        if (ma.aborted) return;
        let session = await fetchSession(config.sessionId, {
          accessToken,
        });
        if (!ss) {
          ss = true;
          logFeatureOk("ccr_session_name_follow");
        }
        return serviceSessionName(session.title);
      } catch (error) {
        logForDebugging(`[useRemoteSession] Could not re-read the session's name: ${errorMessage(error)}`);
        if (!ss) {
          ss = true;
          logFeatureBad("ccr_session_name_follow", "read_failed");
        }
        return;
      }
    };
    return followServiceSessionName(
      clock,
      config.serviceName,
      isEssentialTrafficOnly() ? undefined : Gs,
      (ma) =>
        setAppState_2((prev) =>
          prev.remoteSessionName === ma
            ? prev
            : {
                ...prev,
                remoteSessionName: ma,
              },
        ),
    );
  }, [config, credentials, storageV5, setAppState_2, clock]);
  let [za] = y(() => new BoundedUUIDSet(50));
  let responseTimeoutRef = R(0);
  let isCompactingRef = R(new Set());
  let [as] = y(() => new BoundedUUIDSet(256));
  let pi = ce((ss) => isCompactingRef.current.has(ss) || as.has(ss), [as]);
  let qa = ce((ss) => isSubagentToolRequest(ss) && pi(String(ss.agent_id)), [pi]);
  let managerRef = R(new Set());
  let [$l] = useTheme();
  let hasUpdatedTitleRef = R(false);
  let sentUUIDsRef = R(undefined);
  let toolsRef = R(undefined);
  P(() => {
    sentUUIDsRef.current = undefined;
    toolsRef.current = config?.eventSigner === undefined ? false : undefined;
    hasUpdatedTitleRef.current = false;
    let ss = true;
    config?.eventSigner?.then(
      (Gs) => {
        if (ss) toolsRef.current = Gs !== undefined;
      },
      () => {
        if (ss) toolsRef.current = false;
      },
    );
    config?.boundHere?.then(
      (sdkMessage) => {
        if (ss) sentUUIDsRef.current = sdkMessage;
      },
      () => {},
    );
    return () => {
      ss = false;
    };
  }, [config]);
  let _c = Q(
    () =>
      config && isRepositoryTrustGateEnabled()
        ? {
            get answersProveDevice() {
              return sentUUIDsRef.current === false && toolsRef.current !== false
                ? undefined
                : sentUUIDsRef.current;
            },
            onAnswered: () => {
              hasUpdatedTitleRef.current = true;
            },
            onNotShown: (ss, Gs) => {
              if (ss === "proves_no_device") or.requestOpened(Gs);
              setMessages((ma) => [
                ...ma,
                createSystemMessage(
                  ss === "proves_no_device"
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
    [config, setMessages, or],
  );
  let inputs = {
    sendResponse: (ss, Gs) => {
      or.requestClosed(ss);
      let ma = kn.get(ss);
      kn.delete(ss);
      let wasCompacting = qn.current;
      if (!wasCompacting) return;
      wasCompacting.respondToPermissionRequest(ss, Gs);
      if (Gs.behavior === "allow") {
        let last = Gs.updatedPermissions?.findLast(
          (updatedPermission) => updatedPermission.type === "setMode",
        );
        let mode = last?.type === "setMode" && last.destination === "session" ? last.mode : undefined;
        if (mode === "default" || mode === "acceptEdits") {
          if (isDeviceIdentityEnabledCached()) Hd.current++;
          noteOwnPermissionModeAnswer(mode);
        } else if (mode !== undefined) noteOwnUnrecordedModeAnswer();
        if (ma === undefined || !pi(ma)) setConnStatus(true);
      } else if (Gs.interrupt && ma === undefined) {
        is();
        onTurnStopped?.();
      }
    },
    requestDialog,
    toolRegistry: tools,
    toolPermissionContext,
    theme: $l,
    canInterruptTurn: !config?.viewerOnly,
    askedByBackgroundSubagent: qa,
    onAskNotShown: (ss) => {
      setMessages((Gs) => [
        ...Gs,
        createSystemMessage(
          ss ? REMOTE_PERMISSION_UNSHOWABLE_SHORT : REMOTE_PERMISSION_UNSHOWABLE_TEXTS,
          "warning",
        ),
      ]);
    },
    handedOverAtAttach: config?.seedSubagentRequests,
    heldServedCall: (ss) => {
      let Gs = heldServedCallRef.current?.(ss);
      if (Gs?.held) return Gs;
      let ma = config?.heldServedCall?.(ss);
      if (ma?.held) return ma;
      return [Gs, ma].find((prev) => prev?.reason === "other_input") ?? ma ?? Gs ?? NOT_HELD_LEASE;
    },
    ...(_c && {
      repositoryTrustQuestion: _c,
    }),
    ...(isServedCallWatchEnabled() && {
      computerFolderPrompt: true,
    }),
  };
  let [Vd] = y(() => new TransportPermissionDispatcher(inputs));
  let inputs_2 = {
    sendResponse: (ss, Gs) => {
      qn.current?.respondToUserDialogRequest(ss, Gs);
    },
    requestDialog,
  };
  let [Ka] = y(() => new RemoteDialogDispatcher(inputs_2));
  P(() => {
    Vd.setInputs(inputs);
    Ka.setInputs(inputs_2);
  });
  P(() => {
    let flattened = [
      ...[],
      {
        feed: config?.homeSeed?.status,
        name: "home-settings",
        wait: "settings",
      },
    ].flatMap(({ feed, name: xl, wait }) =>
      feed === undefined
        ? []
        : [
            {
              feed,
              name: xl,
              wait,
            },
          ],
    );
    if (flattened.length === 0) return;
    let Gs =
      ($a, wait) =>
      ({ line, level }) => {
        switch ((ps(), level)) {
          case "progress":
            logForDebugging(`[useRemoteSession] ${$a}: ${line}`);
            Oi(line, "held", null);
            dl(wait, line.replace(TRAILING_ELLIPSIS_RE, ""));
            return;
          case "debug":
            logForDebugging(`[useRemoteSession] ${$a}: ${line}`);
            return;
          case "info":
          case "warning": {
            let converted = createSystemMessage(line, level === "info" ? "notice" : "warning");
            Vr.current.add(converted.uuid);
            setMessages((prev) => [...prev, converted]);
            return;
          }
          default:
        }
      };
    let toolUseIds = flattened.map(({ feed, name: xl, wait }) => {
      let na = Gs(xl, wait);
      let js = feed.subscribe(na);
      for (let Ya of feed.takeBacklog()) na(Ya);
      return js;
    });
    return () => toolUseIds.forEach((block) => block());
  }, [undefined, config?.homeSeed, setMessages, ps, dl]);
  P(() => {
    let deviceNotBoundNotice = config?.deviceNotBoundNotice;
    if (!deviceNotBoundNotice) return;
    let Gs = true;
    deviceNotBoundNotice.then((block) => {
      if (!Gs || block === undefined) return;
      if (block.toast) addNotification(createDeviceNotBoundNotification(block.text));
      textRef.current = block.text;
      ps();
    });
    return () => {
      Gs = false;
      textRef.current = undefined;
    };
  }, [config?.deviceNotBoundNotice, addNotification, ps]);
  P(() => {
    if (!config) {
      if (yi.current) {
        yi.current = false;
        setConnStatus(false);
        Ws.current = false;
        ws.current = false;
        Yo.current = false;
        bn.current = false;
        Go.current = 0;
        responseTimeoutRef.current = 0;
        hn.current = 0;
        Xo.current = false;
        _r.current = true;
        ms();
        ds();
        retraction.inProgressToolUses.clear();
        Sn();
        streaming.resetMetrics();
      }
      return;
    }
    yi.current = true;
    _r.current = Boolean(config.isAttachToExisting || config.viewerOnly);
    ms();
    wr(null);
    ts.current = false;
    ua();
    responseTimeoutRef.current = 0;
    hn.current = config.initialPromptUuid !== undefined ? 1 : 0;
    Xo.current = false;
    let seedBackgroundTasks = config.seedBackgroundTasks;
    isCompactingRef.current = new Set(seedBackgroundTasks?.awaitingFinish);
    Fr.current = new Set(seedBackgroundTasks?.foreground);
    Zn.current = seedBackgroundTasks?.foreground ?? [];
    as.clear();
    config.seedAskersPastATurn?.forEach((prev) => as.add(prev));
    runningTaskIdsRef.current = new Map(seedBackgroundTasks?.running.map((Br) => [Br.id, Br]));
    Wn.current = new Map(
      config.seedWorkflowRuns?.map((seedWorkflowRun) => [seedWorkflowRun.id, seedWorkflowRun]),
    );
    writeTaskCount();
    if (seedBackgroundTasks !== undefined)
      logEvent("tengu_remote_background_tasks_adopted", {
        via: lit_2("seed"),
        running: seedBackgroundTasks.running.length,
        awaiting_finish: seedBackgroundTasks.awaitingFinish.length,
      });
    Pr.current = Date.now();
    if (config.initialPromptUuid) za.add(config.initialPromptUuid);
    logForDebugging(`[useRemoteSession] Initializing for session ${config.sessionId}`);
    let Gs = false;
    let ma = false;
    let $a = new Set();
    let xl = false;
    let Si = undefined;
    let na = undefined;
    let next = new Set(replyChannelConfig !== null ? (config.seedReplyChannelToolUseIds ?? []) : []);
    Fn.current = replyChannelConfig !== null && appStoreDirect.getState().hasRemoteReplyChannel;
    let Ya = Fn.current;
    function tl() {
      let Br = Ya;
      Ya = false;
      if (Fn.current) {
        if (Br) logEvent("tengu_remote_reply_channel_init", {});
        return;
      }
      Fn.current = true;
      logEvent("tengu_remote_reply_channel_init", {});
      setAppState_2((Fi) =>
        Fi.hasRemoteReplyChannel
          ? Fi
          : {
              ...Fi,
              hasRemoteReplyChannel: true,
            },
      );
    }
    if (config.seedActiveGoal !== undefined) {
      let seedActiveGoal = config.seedActiveGoal ?? undefined;
      setAppState_2((Fi) =>
        Fi.activeGoal === seedActiveGoal
          ? Fi
          : {
              ...Fi,
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
      setAppState_2((Fi) => ({
        ...Fi,
        remoteAutocompactState: seedAutocompactState,
      }));
      logEvent("tengu_remote_autocompact_state_adopted", {
        via: lit_2("seed"),
        enabled: seedAutocompactState.enabled,
        enforced: seedAutocompactState.enforced,
        source: fromEnum(seedAutocompactState.source),
      });
    }
    let ol = config.seedAutocompactState !== undefined;
    let ed = (Br, Fi) => {
      let ia = 0;
      let vl = false;
      setAppState_2((hl) => {
        let dd = mergeCloudArtifactFrames(hl, Br);
        vl = dd !== hl;
        ia = count(Object.values(dd.frameUrls), (Ra) => Ra.fromCloudSession === true);
        return dd;
      });
      if (!vl && ia === (Br?.length ?? 0)) return;
      logEvent("tengu_remote_cloud_artifacts_adopted", {
        via: fromEnum(Fi),
        listed: Br?.length ?? 0,
        kept: ia,
      });
    };
    let _d = config.seedSessionArtifacts !== undefined;
    if (config.seedSessionArtifacts !== undefined) ed(config.seedSessionArtifacts, "seed");
    let remoteRateLimitAdopter = createRemoteRateLimitAdopter(
      () => adoptRateLimits && !config.viewerOnly,
      "stream",
    );
    queueMicrotask(() => remoteRateLimitAdopter.adopt(config.seedRateLimitInfos ?? [], "seed"));
    let du = config.initialSequenceNum === undefined ? "history" : "replay";
    let rg = () => {
      remoteRateLimitAdopter.settle(du);
      du = "replay";
    };
    let replInputAccumulator = undefined;
    let Wd = 0;
    let Rl = false;
    let Yd = null;
    let Pi = false;
    let fa = false;
    let sa = false;
    let onLine = ({ line, level }) => {
      if (level === "debug") {
        logForDebugging(`[useRemoteSession] hooks: ${line}`);
        return;
      }
      setMessages((ia) => [...ia, createSystemMessage(line, level === "warning" ? "warning" : "notice")]);
    };
    let syncRoot = () => null;
    let Ad = (() => {
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
    let od = (() => {
      if (config.servedTools === undefined || config.viewerOnly || !isViolinWoodEnabledCached()) return null;
      try {
        let onAnnounceOutcome = config.servedTools.onAnnounceOutcome;
        let onRevoked = config.servedTools.onRevoked;
        let remoteSessionConnection = createRemoteSessionConnection({
          sessionId: config.sessionId,
          manager: () => Yd,
          ...config.servedTools,
          onAnnounceOutcome: (hl, dd) => {
            if (hl.kind === "announced") {
              Zi.current =
                hl.status === "announced"
                  ? {
                      on: true,
                      name: remoteSessionConnection.servedHost()?.name ?? "",
                    }
                  : {
                      on: false,
                    };
              ps();
            } else if (hl.kind === "refused" || hl.kind === "unsupported") {
              Zi.current = {
                on: false,
              };
              ps();
            }
            onAnnounceOutcome?.(hl, dd);
          },
          onRevoked:
            onRevoked === undefined
              ? undefined
              : (prev) =>
                  onRevoked((message) => {
                    Zi.current = {
                      on: false,
                    };
                    ps();
                    prev(message);
                  }),
        });
        heldServedCallRef.current = remoteSessionConnection.heldServedCall;
        let vl = registerCleanup(() => remoteSessionConnection.close());
        return {
          ...remoteSessionConnection,
          close: () => {
            vl();
            let hl = remoteSessionConnection.close();
            let dd = registerCleanup(() => hl);
            hl.finally(dd);
            return hl;
          },
        };
      } catch (error) {
        logError(error);
        return null;
      }
    })();
    let md = (() => {
      if (Ad === null || config.viewerOnly || !isHookForwardingEnabled()) return null;
      try {
        return startDeviceHookForwarding({
          launchDir: getOriginalCwd(),
          cloudSessionId: config.sessionId,
          memory: deviceHooksProcessMemories.of(host),
          getTools: () => Ho(),
          storageV5,
          manager: () => Yd,
          syncRoot,
          onLine,
          registerCleanup,
          subscribeSettingsChanges: (prev) => Ad.subscribe(prev),
        });
      } catch (error) {
        logError(error);
        return null;
      }
    })();
    let vp = {
      ...config,
      admitProjectPersonMessages: Si !== undefined,
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
    Ur.current = md;
    let sg = new Set();
    let zi = new RemoteSessionManager(vp, {
      onMessage: (request, requestId) => {
        sa = true;
        if (!capFrameDepth(request)) return;
        let ia = [`type=${request.type}`];
        if ("subtype" in request) ia.push(`subtype=${request.subtype}`);
        if (request.type === "user") {
          let content = request.message?.content;
          ia.push(
            `content=${Array.isArray(content) ? content.map((rl) => rl.type).join(",") : typeof content}`,
          );
        }
        logForDebugging(`[useRemoteSession] Received ${ia.join(" ")}`);
        Ti();
        if (requestId?.replayed === false && request.type !== "rate_limit_event") rg();
        let vl = Yo.current || bn.current || Go.current > 0;
        let hl = hn.current;
        let dd = {
          sent: hl > 0,
          taskWake: Xo.current,
        };
        let Ra = requestId?.replayed === true && requestId.resumed !== true;
        let Dl = isModelRefusalFallback_2(request);
        if (Dl)
          evictRefusalRetraction({
            index: retraction,
            signal: Dl,
            surface: "ccr",
            setMessages,
            setInProgressToolUseIDs,
          });
        pr();
        if (request.type === "env_manager_log") {
          let now = Date.now();
          let rl = Ir.current !== null && Ir.current.hasStructuredSteps && !Ir.current.terminal;
          if (_r.current && !rl && isStaleTimestamp(request, now)) return;
          let Cl = convertSDKMessage(request);
          let _a =
            Ir.current ??
            createSetupProgress(now, {
              wake: Boolean(config.isAttachToExisting),
            });
          let Jl = applySetupEvent(_a, request, Cl.type === "env_log" ? Cl.message : "", now, Pr.current);
          if (!Yo.current && Cl.type === "env_log" && Cl.message !== "") {
            if (!_r.current) setConnStatus(true);
            Oi(Cl.message, "provisioning", currentSetupLabel(Jl));
          }
          if (Jl !== Ir.current) {
            if (_a.terminal && !Jl.terminal && Jl.dismissed && !ts.current) {
              ts.current = true;
              logEvent("tengu_remote_bootstrap_cycle_hidden", {});
            }
            zr(Jl);
            if (
              Jl.steps.some((step) => step.status === "failed") &&
              !_a.steps.some((step) => step.status === "failed")
            )
              Ls(Jl.dismissed);
            if (Jl.terminal) {
              ts.current = false;
              es();
              Xs();
            }
          }
          return;
        }
        let Gu = Ir.current;
        let syntheticMessage = classifySetupFrame(Gu, request);
        if (syntheticMessage === "failed" && Gu !== null) {
          let Aa = markCurrentStepFailed(Gu, Date.now());
          if (Aa !== Gu) {
            zr(Aa);
            Ls(false);
          } else if (!Gu.steps.some((queue) => queue.status === "failed")) syntheticMessage = null;
        }
        if (syntheticMessage !== "notice") es();
        if (request.type !== "user" && syntheticMessage === null) Xs();
        if (
          !Yo.current &&
          (request.type === "assistant" ||
            request.type === "stream_event" ||
            (request.type === "system" && request.subtype === "status" && request.status === "requesting"))
        ) {
          setConnStatus(true);
          md?.onTurnInFlight();
        }
        if (request.type === "tool_progress") {
          md?.onTurnInFlight();
          if (request.heartbeat === true && requestId?.replayed !== true && !Yo.current) setConnStatus(true);
        }
        if (request.type === "user" && request.uuid && za.has(request.uuid)) {
          let uuid = request.uuid;
          if (uuid === config.initialPromptUuid) {
            let Cl = convertSDKMessage(request, {
              convertUserTextMessages: true,
            });
            setMessages((item) =>
              Cl.type !== "message" || item.some((queue) => queue.uuid === uuid)
                ? item
                : [...item, Cl.message],
            );
            return;
          }
          let rl = managerRef.current.delete(uuid);
          setMessages((item) => {
            let lastIndex = item.findLastIndex((queue) => queue.uuid === uuid);
            if (lastIndex === -1) {
              if (!rl) return item;
              let Cu = convertSDKMessage(request, {
                convertUserTextMessages: true,
              });
              return Cu.type === "message" ? [...item, Cu.message] : item;
            }
            if (lastIndex === item.length - 1) return item;
            let Jl = item[lastIndex];
            return item.slice(0, lastIndex).concat(item.slice(lastIndex + 1), Jl);
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
              tl();
            else if (!Fn.current || Ya) {
              Fn.current = false;
              Ya = false;
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
          if (initFrame.cwd && !Rl) {
            Rl = true;
            logEvent("tengu_remote_reported_cwd", {
              place: fromEnum(classifyLaunchDirPosition(initFrame.cwd, getOriginalCwd())),
              is_following_reports: !isHarpForepillarOn(),
            });
          }
          if (initFrame.cwd) {
            let cwd = initFrame.cwd;
            let Cl = ++Wd;
            isAdoptableSessionCwd(cwd, "useRemoteSession")
              .then((queue) => {
                if (queue && Cl === Wd && qn.current === zi)
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
          isSystemInitMessage(Fr.current, request);
          Un.current++;
          writeTaskCount();
          md?.onWorkerInit();
          od?.requestAnnounce("worker_init", {
            workerEpoch: initFrame.workerEpoch,
          });
        }
        if (request.type === "result") {
          md?.onTurnEnded();
          kn.forEach((requestId, toolUseId) => {
            or.requestClosed(toolUseId);
            as.add(requestId);
          });
          let repositoryTrust = config.repositoryTrust;
          if (repositoryTrust !== undefined) {
            let rl = hasUpdatedTitleRef.current;
            hasUpdatedTitleRef.current = false;
            let Cl = repositoryTrust.current();
            if (rl)
              repositoryTrust.refresh({
                force: true,
              });
            else if (Cl !== "trusted" && Cl !== "no_repository") repositoryTrust.refresh();
          }
        }
        if (request.type === "system" && "permissionMode" in request && request.permissionMode) {
          ns = parsePermissionMode(request.permissionMode) ?? ns;
          if (ns !== undefined) Fg.add(ns);
          Mi(request.permissionMode);
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
            let rl = fastModeState !== "off";
            let Cl = false;
            setAppState_2((_a) => {
              if (!!_a.fastMode === rl) return _a;
              Cl = true;
              return {
                ..._a,
                fastMode: rl,
              };
            });
            if (Cl)
              logEvent("tengu_fast_mode_toggled", {
                enabled: rl,
                source: lit_2("remote_wire_adopt"),
                remote: true,
              });
          }
        }
        if (request.type === "active_goal") {
          let goalState = parseGoalState(request.value);
          setAppState_2((rl) =>
            rl.activeGoal === goalState
              ? rl
              : {
                  ...rl,
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
          ol = true;
          adoptRemoteAutocompactState(setAppState_2, request.value, lit_2("stream"));
          return;
        }
        if (request.type === "rate_limit_event") {
          let Aa = dropRemoteRateLimitFrame(request.rate_limit_info);
          if (Aa === undefined)
            logForDebugging("[useRemoteSession] Dropping rate_limit_event with invalid rate_limit_info", {
              level: "warn",
            });
          else if (requestId?.replayed === true) {
            remoteRateLimitAdopter.hold(Aa);
            Ti();
          } else {
            remoteRateLimitAdopter.push(Aa);
            du = "replay";
          }
          return;
        }
        if (request.type === "system") {
          let Aa = sessionMetadataArtifacts(request);
          if (Aa !== undefined) {
            _d = true;
            ed(Aa, "stream");
            return;
          }
          if (request.subtype === "plugin_install") Gn.current?.pluginInstallFrame();
          let { backgroundTaskEnded, isTaskLifecycleFrame } = trackThinClientFrame(
            {
              running: runningTaskIdsRef.current,
              awaitingFinish: isCompactingRef.current,
              foreground: Fr.current,
            },
            request,
          );
          applyRemoteTaskEvent(Wn.current, request, Date.now());
          if (
            backgroundTaskEnded &&
            request.subtype === "task_notification" &&
            !Ra &&
            (request.status !== "stopped" || request.reason === "worker_restart")
          )
            Xo.current = true;
          if (isTaskLifecycleFrame) {
            writeTaskCount();
            return;
          }
          if (request.subtype === "notification") {
            if (isValidNotice(request)) {
              let _a = normalizeSdkNotification(request, "remote");
              let Jl = pickRemoteNotificationToEvict(appStoreDirect.getState().notifications, _a.key);
              if (Jl !== null) removeNotification(Jl);
              addNotification(_a);
              logEvent("tengu_remote_notification_routed", {
                via: lit_2("stream"),
                priority: fromEnum(request.priority),
              });
            } else logForDebugging("[useRemoteSession] Dropping malformed notification frame");
            return;
          }
          if (request.subtype === "status") {
            let _a = ws.current;
            ws.current = request.status === "compacting";
            if (_a && ws.current) return;
          }
          if (request.subtype === "compact_boundary") ws.current = false;
        }
        if (isResultEvent(request)) {
          isSystemInitMessage(Fr.current, request);
          Un.current++;
          writeTaskCount();
          let Aa = !Ra && shouldDeliverEvent(request, za, dd);
          if (!vl && !Ra) {
            hn.current = Math.max(0, hn.current - hl);
            Xo.current = false;
          }
          ws.current = false;
          Yo.current = false;
          bn.current = false;
          if (vl) {
            if (Go.current > 0) Go.current--;
          } else if (Aa) onTurnComplete?.(request);
          else {
            logForDebugging(
              "[useRemoteSession] Result not counted as this client's turn; idle notification not re-armed",
            );
            if (!Ra) onOtherTurnComplete?.(requestId?.ageMs ?? 0);
          }
          setConnStatus(false);
          Sn();
          streaming.resetMetrics();
        }
        if (request.type === "user") {
          let content = request.message?.content;
          if (Array.isArray(content)) {
            let rl = [];
            for (let Cl of content) if (Cl.type === "tool_result") rl.push(Cl.tool_use_id);
            if (rl.length > 0) {
              setInProgressToolUseIDs({
                action: "remove",
                ids: rl,
              });
              clearInProgressToolUses(retraction, rl);
              countOrphanToolResults(
                retraction,
                rl,
                "ccr",
                typeof request.uuid === "string" ? request.uuid : null,
              );
              let filtered = rl.filter((queue) => Fr.current.has(queue));
              if (zi.workerMovesBash() && filtered.length > 0) {
                filtered.forEach((item) => Fr.current.delete(item));
                writeTaskCount();
              }
            }
          }
        }
        if (replyChannelConfig !== null && request.type === "assistant" && !request.parent_tool_use_id)
          for (let Aa of request.message.content) {
            let rl = replyChannelConfig.replyChannelBlockKind(Aa);
            if (rl === undefined) continue;
            if (Aa.type === "tool_use") {
              if (next.has(Aa.id)) {
                tl();
                continue;
              }
              next.add(Aa.id);
            }
            tl();
            logEvent("tengu_remote_reply_channel_frame", {
              kind: fromEnum(rl),
            });
          }
        let qh = null;
        if (qh !== null) {
          if (typeof request.uuid === "string" && dropLateRetracted(retraction, request.uuid, "ccr")) return;
          if (qh.length > 0) {
            if (typeof request.uuid === "string")
              recordNestedUuidAliases(
                retraction,
                request.uuid,
                qh.map((prev) => prev.uuid),
              );
            let parentToolUseID = qh[0].parentToolUseID;
            if (!$a.has(parentToolUseID)) {
              $a.add(parentToolUseID);
              logEvent("tengu_remote_subagent_frame_nested", {
                frame_type: fromEnum(request.type),
              });
            }
            setMessages((prev) => {
              let filtered = qh.filter((error) => !prev.some((Jl) => Jl.uuid === error.uuid));
              return filtered.length === 0 ? prev : [...prev, ...filtered];
            });
          }
          return;
        }
        let sendMessage = convertSDKMessage(request, {
          convertUserTextMessages: true,
        });
        if (sendMessage.type === "conversation_reset") {
          let { ownClear, preserved } = Er.onResetFrame();
          landWaitingLines();
          setMessages((Cl) => {
            if (managerRef.current.size > 100) managerRef.current.clear();
            for (let _a of Cl)
              if (_a.type === "user" && za.has(_a.uuid) && !preserved.has(_a.uuid))
                managerRef.current.add(_a.uuid);
            return Cl.filter(
              (_a) =>
                (_a.type === "user" && preserved.has(_a.uuid)) ||
                (_a.type === "system" && (ownClear || Vr.current.has(_a.uuid))),
            );
          });
          streaming.setStreamingToolUses((Cl) => (Cl.length > 0 ? [] : Cl));
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
            let _a = new Set(
              sendMessage.message.message.content.filter((Jl) => Jl.type === "tool_use").map((Jl) => Jl.id),
            );
            streaming.setStreamingToolUses((Jl) =>
              Jl.some((Cu) => _a.has(Cu.contentBlock.id))
                ? Jl.filter((Cu) => !_a.has(Cu.contentBlock.id))
                : Jl,
            );
          } else streaming.setStreamingToolUses((_a) => (_a.length > 0 ? [] : _a));
          if (
            sendMessage.message.type === "assistant" &&
            sendMessage.message.message.content.some((_a) => _a.type === "text")
          )
            streaming.applyStreamingText(() => null);
          if (dropLateRetracted(retraction, sendMessage.message.uuid, "ccr")) return;
          if (sendMessage.message.type === "assistant") {
            let mapped = sendMessage.message.message.content
              .filter((Jl) => Jl.type === "tool_use")
              .map((Jl) => Jl.id);
            if (mapped.length > 0) {
              setInProgressToolUseIDs({
                action: "add",
                ids: mapped,
              });
              recordInProgressToolUses(retraction, sendMessage.message.uuid, mapped);
              if (zi.workerMovesBash()) {
                let Jl = Un.current;
                getForegroundBashToolUseIds(request).forEach((Cu) =>
                  clock.setTimeout(() => {
                    if (qn.current === zi && Un.current === Jl && retraction.inProgressToolUses.has(Cu)) {
                      Fr.current.add(Cu);
                      writeTaskCount();
                    }
                  }, BASH_TASK_COUNT_DELAY_MS),
                );
              }
            }
          }
          if (!xl && request.type === "user") {
            let content = request.message?.content;
            if (Array.isArray(content) && content.some((Jl) => Jl.type === "tool_result")) {
              xl = true;
              logEvent("tengu_remote_tool_result_rendered", {
                viewer_only: fromEnum(config.viewerOnly ? "true" : "false"),
              });
            }
          }
          let uuid = sendMessage.message.uuid;
          let rl =
            Si === undefined ? sendMessage.message : Si(sendMessage.message, request, requestId?.source);
          let Cl = na === undefined ? rl : na(rl, request, requestId?.source);
          if (
            isHumanTurn_2(Cl) &&
            rl === sendMessage.message &&
            requestId?.source?.startsWith("client") === true &&
            requestId.replayed !== true &&
            getIsLoading()
          ) {
            holdLine(Cl);
            return;
          }
          setMessages((_a) => (uuid && _a.some((Jl) => Jl.uuid === uuid) ? _a : [..._a, Cl]));
        } else if (sendMessage.type === "stream_event") {
          if (bn.current) return;
          isNonRenderableSystemMessage(sendMessage.event, {
            onMessage: (Aa) => setMessages((rl) => [...rl, Aa]),
            onUpdateLength: streaming.addResponseLength,
            onSetStreamMode: setStreamMode,
            onStreamingToolUses: streaming.setStreamingToolUses,
            replInputAccumulator,
            onApiMetrics: streaming.recordApiMetricsEvent,
            onStreamingText: (Aa) => {
              if (!Fn.current) streaming.applyStreamingText(Aa);
            },
          });
        }
      },
      onPermissionRequest: (Br, Fi, ia, vl) => {
        logForDebugging(`[useRemoteSession] Permission request for tool: ${Br.tool_name}`);
        let hl = isSubagentToolRequest(Br);
        if (hl) kn.set(Fi, String(Br.agent_id));
        if (config.viewerOnly) {
          if (!hl) setConnStatus(false);
          return;
        }
        if (
          Vd.dispatch(
            {
              type: "control_request",
              request_id: Fi,
              request: Br,
            },
            false,
          )
        ) {
          if (!qa(Br)) or.requestOpened(Fi);
          if (!hl) setConnStatus(false);
        }
      },
      onPermissionCancelled: (content, opts) => {
        logForDebugging(`[useRemoteSession] Permission request cancelled: ${content}`);
        or.requestClosed(content);
        Vd.cancel(content);
        if (!kn.delete(content) && !Yo.current) setConnStatus(true);
      },
      onUserDialogRequest: (Br, requestId) => {
        logForDebugging(`[useRemoteSession] User dialog request: ${Br.dialog_kind}`);
        setConnStatus(false);
        if (config.viewerOnly) return;
        Ka.dispatch({
          type: "control_request",
          request_id: requestId,
          request: Br,
        });
      },
      onUserDialogCancelled: (Br) => {
        logForDebugging(`[useRemoteSession] User dialog request cancelled: ${Br}`);
        Ka.cancel(Br);
      },
      ...(md !== null && md.callbacks),
      ...(od !== null && od.callbacks),
      onWorkerLive: () => {
        sa = true;
        od?.requestAnnounce(Pi ? "reconnected" : "attached");
        od?.callbacks.onWorkerLive?.();
        Pi = true;
        ua();
      },
      onWorkerConnectionStatus: (Br) => {
        if (qn.current !== zi) return;
        let Fi = Br === "disconnected";
        if (Fi && !sa) {
          if (runningTaskIdsRef.current.size > 0) {
            logEvent("tengu_remote_background_tasks_dropped", {
              count: runningTaskIdsRef.current.size,
            });
            runningTaskIdsRef.current.clear();
          }
          Fr.current.clear();
          markTasksUnlisted(Wn.current);
          writeTaskCount();
        }
        sa = true;
        let ia = false;
        setAppState_2((hl) => {
          ia = hl.remoteWorkerReportedGone !== Fi;
          return ia
            ? {
                ...hl,
                remoteWorkerReportedGone: Fi,
              }
            : hl;
        });
        let size = runningTaskIdsRef.current.size;
        if (ia && size > 0)
          logEvent("tengu_remote_background_tasks_worker_report_changed", {
            worker_reported_gone: Fi,
            count: size,
          });
        if (Fi && getIsLoading() && _r.current) La();
      },
      onConnected: () => {
        logForDebugging("[useRemoteSession] Connected");
        mr("connected");
        md?.onStreamConnected();
        Hh();
        landWaitingLines();
        if (fa && runningTaskIdsRef.current.size > 0)
          logEvent("tengu_remote_background_tasks_listed_at_reconnect", {
            count: runningTaskIdsRef.current.size,
          });
        fa = true;
      },
      onLineTaken: lineTaken,
      onReconnecting: () => {
        logForDebugging("[useRemoteSession] Reconnecting");
        mr("reconnecting");
        landWaitingLines();
        Yo.current = false;
        bn.current = false;
        Go.current = 0;
        setInProgressToolUseIDs({
          action: "clear",
        });
        retraction.inProgressToolUses.clear();
      },
      onWithheldPromptSent: () => {
        gs();
        Gn.current?.messageSent();
      },
      onWithholdableHeldChanged: (Br) => {
        if (qn.current === zi) ls(Br && !config.viewerOnly && isDeviceIdentityEnabledCached());
      },
      onWithheldPromptFailed: (Br, Fi) => {
        gs();
        initialPromptUuidRef.current = config.initialPromptUuid;
        let content = config.withheldInitialPrompt?.content;
        if (typeof content === "string")
          addHistoryEntry(content, storageV5, {
            armUndo: false,
          });
        setMessages((vl) => [
          ...vl,
          Br === CANCELLED
            ? createSystemMessage(
                "You took your first message back. It wasn't sent to the cloud session.",
                "notice",
              )
            : createSystemMessage(
                Fi
                  ? `Your first message may not have reached the cloud session${formatReasonSuffix(Br)}. If Claude doesn't respond to it soon, send it again.`
                  : `Couldn't send your first message${formatReasonSuffix(Br)}.`,
                "warning",
              ),
        ]);
        if (responseTimeoutRef.current === 0) {
          setConnStatus(false);
          if (!Fi) hn.current = 0;
        }
      },
      onResponseUndelivered: (Br, Fi, ia) => {
        if (sg.has(Fi)) return;
        if (sg.size === 0) queueMicrotask(() => sg.clear());
        sg.add(Fi);
        setMessages((vl) => [...vl, createSystemMessage(formatUndeliveredAnswerNotice(Fi, ia), "warning")]);
      },
      onCatchUpTruncated: () => {
        logForDebugging("[useRemoteSession] Catch-up truncated \u2014 transcript gap");
        Er.forget();
        setMessages((ia) => [
          ...ia,
          createSystemMessage(
            "Some earlier messages from this session could not be loaded after reconnecting.",
            "warning",
          ),
        ]);
        ol = true;
        setAppState_2((ia) =>
          ia.remoteAutocompactState === undefined
            ? ia
            : {
                ...ia,
                remoteAutocompactState: undefined,
              },
        );
        runningTaskIdsRef.current.clear();
        markTasksUnlisted(Wn.current);
        writeTaskCount();
        remoteRateLimitAdopter.flush();
        let { status, isUsingOverage } = getCurrentLimits();
        if (status === "rejected" && !isUsingOverage)
          remoteRateLimitAdopter.adopt([currentLimits], "truncation");
        if (Gs) ma = true;
        else {
          Gs = true;
          let sessionId = config.sessionId;
          (async () => {
            try {
              do {
                ma = false;
                try {
                  if ((await vl()) === "stale") return;
                } catch {}
              } while (ma);
            } finally {
              Gs = false;
            }
          })();
          async function vl() {
            let ctx = await getSessionRequestConfig(sessionId, credentials);
            if (qn.current !== zi) return "stale";
            let latestEvents = await fetchLatestEvents(ctx, undefined, {
              reportFeatureHealth: false,
            });
            let signalCount = 0;
            let Dl = 0;
            while (latestEvents && Dl < MAX_REFUSAL_RETRIES) {
              if (qn.current !== zi) return "stale";
              Dl++;
              signalCount += checkRefusalRetractionSource({
                index: retraction,
                events: latestEvents.events,
                surface: "truncation_harvest",
                setMessages,
                setInProgressToolUseIDs,
              });
              latestEvents =
                Dl < MAX_REFUSAL_RETRIES && latestEvents.hasMore && latestEvents.firstId
                  ? await fetchOlderEvents(ctx, latestEvents.firstId)
                  : null;
            }
            if (qn.current !== zi) return "stale";
            logEvent("tengu_refusal_retraction_truncation_harvest", {
              signal_count: signalCount,
              page_count: Dl,
            });
            return "done";
          }
        }
      },
      onDisconnected: (Br) => {
        logForDebugging("[useRemoteSession] Disconnected");
        if (
          Br === "session_stale_relogin" ||
          (Br === "untrusted_device" && isDeviceIdentityEnabledCached() && isTrustedDeviceGateEnabled())
        )
          setMessages((Fi) => [
            ...Fi,
            createSystemMessage(
              describeCredentialFailure({
                terminal: true,
                reason: Br,
              }),
              "warning",
            ),
          ]);
        mr("disconnected");
        Hs();
      },
      onError: (Br) => {
        logForDebugging(`[useRemoteSession] Error: ${Br.message}`);
      },
    });
    let rd = Boolean(config.isAttachToExisting) && !config.viewerOnly;
    let Qd =
      !config.isAttachToExisting &&
      !config.viewerOnly &&
      config.withheldInitialPrompt?.followsPermissionMode === true;
    let createPermissionMode =
      !config.isAttachToExisting && !config.viewerOnly && (isDeviceIdentityEnabledCached() || Qd)
        ? config.createPermissionMode
        : undefined;
    let sessionId = config.sessionId;
    let mode = appStoreDirect.getState().toolPermissionContext.mode;
    let Yc = (config.launchModePush ??= {
      mode,
      pushed: false,
    });
    let tc = false;
    let Cp = () => Hd.current === Rp && Vl.current === manager;
    let manager = Vl.current;
    let Rp = Hd.current;
    function Fh(Br) {
      Ss.current = Br;
      let Fi = () => {
        if (Ss.current === Br) Ss.current = null;
      };
      Br.then(Fi, Fi);
    }
    function cy() {
      if (createPermissionMode !== undefined) {
        if (createPermissionMode.pushed) {
          logForDebugging("[useRemoteSession] Create permission mode already pushed for this session");
          return;
        }
        createPermissionMode.pushed = true;
        let { mode } = createPermissionMode;
        let hl = syncRemotePermissionMode({
          manager: zi,
          mode,
          surface: "terminal",
          sessionId,
          onTaken: noteOwnPermissionModePush(mode),
          superseded: () => qn.current !== zi || Hd.current !== Rp,
          observedMode: () => ns,
          seededModeReported: () => Fg.has(mode),
          linkDown: () => appStoreDirect.getState().remoteConnectionStatus !== "connected",
          onRefused: (dd) => {
            noteOwnPermissionModePush("default");
            createPermissionMode.convergeEntry = beginModeLanding(setAppState_2, sessionId, "default", mode);
            dd.then((Ra) => {
              if (Ra.outcome === "accepted" && createPermissionMode.convergeEntry !== undefined)
                clearOutstandingMode(setAppState_2, sessionId, createPermissionMode.convergeEntry);
            });
            Fh(dd);
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
        createPermissionMode.posted = hl;
        Fh(hl);
        return;
      }
      let Br = isDeviceIdentityEnabledCached();
      let from = Br ? Yc.mode : mode;
      if (!rd || from !== "plan" || (Br && Yc.pushed)) return;
      Yc.pushed = true;
      tc = true;
      let ia = noteOwnPermissionModePush(from);
      zi.sendControlRequest({
        subtype: "set_permission_mode",
        mode: from,
      }).then(
        () => {
          tc = false;
          ia();
          logForDebugging(`[useRemoteSession] Applied launch permission mode: ${from}`);
          logFeatureOk("mode_switch");
        },
        (error) => {
          tc = false;
          let hl = classifyControlRequestError(error);
          logForDebugging(
            `[useRemoteSession] Launch set_permission_mode rejected (${hl}): ${errorMessage(error)}`,
          );
          logFeatureBad("mode_switch", hl);
          let dd =
            (hl === "disconnected" || hl === "not_connected") &&
            appStoreDirect.getState().remoteConnectionStatus !== "connected";
          if (
            qn.current !== zi ||
            dd ||
            hl === "aborted" ||
            Vl.current !== manager ||
            (isDeviceIdentityEnabledCached() && Hd.current !== Rp)
          ) {
            if (qn.current === zi && (dd || hl === "aborted") && Cp()) Yc.pushed = false;
            return;
          }
          if (appStoreDirect.getState().toolPermissionContext.mode === from)
            onPermissionModeChange("default", "client");
          addNotification(notifyRemoteModeRejected(from));
          if (isDeviceIdentityEnabledCached()) {
            let Ra = Hd.current;
            let Dl = beginModeLanding(setAppState_2, sessionId, "default", from);
            let Gu = () => clearOutstandingMode(setAppState_2, sessionId, Dl);
            sendModeWithRetry({
              mode: "default",
              send: (zp) => {
                noteOwnPermissionModePush(zp);
                return zi.sendControlRequest({
                  subtype: "set_permission_mode",
                  mode: zp,
                });
              },
              superseded: () => qn.current !== zi || Hd.current !== Ra,
              onTaken: Gu,
              onGaveUp: () => {
                Gu();
                addNotification(notifyRemoteModeUnsynced());
              },
              onNotTaken: (zp) => {
                if (qn.current === zi) Gu();
                logForDebugging(
                  `[useRemoteSession] The default sent after that refusal was not taken either: ${errorMessage(zp)}`,
                );
              },
            });
          }
        },
      );
    }
    let Nd = isDeviceIdentityEnabledCached();
    let Af = Nd ? Yc.mode : mode;
    let Du =
      rd &&
      !(Nd && Yc.judged) &&
      Af !== "default" &&
      Af !== "plan" &&
      isExternalPermissionMode(Af) &&
      !(Af === "auto" && Nd && isAutoModeFromFallback());
    let Va = null;
    let Fg = new Set();
    let ns;
    let ba = null;
    function Mi(permissionMode) {
      if (!Du) return;
      if (!EXTERNAL_PERMISSION_MODES.includes(permissionMode)) return;
      Va = permissionMode;
      Ti();
    }
    function Ti() {
      if (!(Du && Va !== null) && !remoteRateLimitAdopter.hasHeld()) return;
      ba?.();
      ba = clock.setTimeout(Qa, REFUSAL_RETRY_DELAY_MS);
    }
    function Qa() {
      ba = null;
      if (qn.current !== zi) return;
      rg();
      if (Du && Va !== null) Gp();
    }
    function Gp() {
      if (!Du || qn.current !== zi) return;
      Du = false;
      Yc.judged = true;
      let Br =
        Nd &&
        Va !== null &&
        (() => {
          let label = appStoreDirect.getState().remoteModeSessions[sessionId]?.label;
          return label?.mode === Va && label.origin === "person";
        })();
      if (Va === null || Va === Af || Vl.current !== manager || Br) return;
      addNotification({
        key: "remote-launch-mode-not-applied",
        kind: "warning",
        text: `This cloud session is in ${Va} mode; your ${Af} setting wasn't applied.`,
        color: "warning",
        priority: "high",
      });
    }
    let seedPermissionMode = config.seedPermissionMode;
    let Dc = config.adoptSeedPermissionMode === true;
    let Bh = seedPermissionMode === undefined;
    function Hh() {
      if (Bh || qn.current !== zi) return;
      Bh = true;
      if (seedPermissionMode === undefined || !(Dc || isDeviceIdentityEnabledCached())) return;
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
    qn.current = zi;
    if (!_r.current) zi.beginWorkerStart();
    Yd = zi;
    if (md !== null)
      zi.addSendGate((Br) => Promise.race([md.beforeSend(), Br.released, Br.withdrawn, Br.decided]), {
        onRelease: "send",
      });
    zi.connect();
    cy();
    let posted = Qd ? createPermissionMode?.posted : undefined;
    if (createPermissionMode !== undefined && posted !== undefined) {
      let Br = () => {};
      Br = zi.addSendGate(
        retirePostedMode({
          posted,
          mode: createPermissionMode.mode,
          latch: createPermissionMode,
          retire: () => Br(),
        }),
        {
          onRelease: "withhold",
          onExit: "await",
        },
      );
      posted
        .then(
          (Fi) => Fi.outcome === "accepted",
          () => false,
        )
        .then((Fi) => {
          if (Fi || createPermissionMode.notTakenTold || qn.current !== zi || Hd.current !== Rp) return;
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
    let vu = null;
    Zr.current = config.viewerOnly
      ? null
      : env.CLAUDE_CODE_DISABLE_PLUGIN_FORWARDING
        ? "switched_off"
        : isCloudPluginForwardingEnabledCached()
          ? null
          : "not_enabled";
    try {
      vu =
        !config.viewerOnly && Zr.current === null
          ? forwardCloudPlugins({
              sessionId: config.sessionId,
              reattach: Boolean(config.isAttachToExisting),
              manager: zi,
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
                setMessages((ia) => [...ia, createSystemMessage(line, level)]);
              },
              onChange: () => ps(),
            })
          : null;
    } catch (error) {
      logError(error);
      Zr.current = "attach_failed";
    }
    Gn.current = vu;
    ps();
    let dm = config.repositoryTrust?.onChanged(() => {
      if (qn.current === zi) ps();
    });
    config.homeSeed?.completion.then(() => {
      if (qn.current === zi) ps();
    });
    config.homeSeed?.readBack.then((Br) => {
      if (qn.current === zi) {
        Hi.current = Br;
        ps();
      }
    });
    if (config.isAttachToExisting) vu?.workerKnownUp();
    else if (config.initialPromptUuid !== undefined && config.withheldInitialPrompt === undefined)
      vu?.messageSent();
    let Uc = config.dirSync?.sync.sendGate?.bind(config.dirSync.sync);
    if (Uc !== undefined)
      zi.addSendGate((Br) => Uc(Br), {
        onRelease: "withhold",
      });
    let uy = undefined;
    let Wh = null;
    let my = false;
    let jh = false;
    let Jb = undefined;
    let Im = undefined;
    let Hg = null;
    let Zb = (Br) => (Br === 1 ? "Your last message" : `Your last ${Br} messages`);
    let Dd = (Br) => {
      try {
        writeSync(2, Br);
      } catch {}
    };
    let p_ = ({ unsent, refused, unconfirmed }) => {
      if (unsent > 0 && Wh?.tellsOfUnsent !== true)
        Dd(`${Zb(unsent)} ${unsent === 1 ? "was" : "were"} not sent: ${unsent === 1 ? "it was" : "they were"} still waiting to be sent when you quit.
`);
      let vl = new Map();
      for (let hl of refused) vl.set(hl, (vl.get(hl) ?? 0) + 1);
      for (let [hl, dd] of vl)
        Dd(`${Zb(dd)} ${dd === 1 ? "was" : "were"} not sent \u2014 ${hl}.
`);
      if (unconfirmed > 0)
        Dd(`${Zb(unconfirmed)} may not have reached the cloud session: ${unconfirmed === 1 ? "it was" : "they were"} still being sent when you quit.
`);
    };
    let Mf = {
      unsent: 0,
      refused: [],
      unconfirmed: 0,
    };
    let Zd = null;
    let ig = () =>
      (Zd ?? Promise.resolve())
        .then(() =>
          zi.releaseHeldSends(Zd === null ? undefined : 100, {
            exiting: true,
            final: true,
          }),
        )
        .then((Br) =>
          p_({
            unsent: Mf.unsent + Br.unsent,
            refused: [...Mf.refused, ...Br.refused],
            unconfirmed: Mf.unconfirmed + Br.unconfirmed,
          }),
        );
    let fy = registerCleanup(ig);
    let Fx = () => {
      fy();
      let Br = zi.releaseHeldSends(undefined, {
        exiting: true,
        final: isShuttingDown(),
      });
      Zd = Br.catch(() => {});
      let Fi = registerCleanup(ig);
      Br.then((ia) => {
        Mf = ia;
        if (ia.unsent === 0 && ia.refused.length === 0 && ia.unconfirmed === 0 && ia.stillHeld === 0) Fi();
      }, Fi);
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
      (Br, Fi) => {
        if (Fi === "resend") return Promise.resolve(false);
        let Authorization = Br.Authorization;
        let vl = Authorization?.startsWith("Bearer ") ? Authorization.slice(7) : "";
        return config.onAuth401?.(vl) ?? Promise.resolve(false);
      },
    );
    let Qp = () => {
      Vd.drain();
      kn.clear();
      Ka.drain();
    };
    config.storedSessionArtifacts?.then((Br) => {
      if (qn.current === zi && !_d && Array.isArray(Br)) ed(Br, "stored");
    });
    config.storedAutocompactState?.then((Br) => {
      let frame = SDKAutocompactStateMessageSchema().shape.value.safeParse(Br).data;
      if (qn.current === zi && !ol && frame !== undefined)
        adoptRemoteAutocompactState(setAppState_2, frame, lit_2("seed"));
    });
    config.preflightCheck?.catch((error) => {
      if (qn.current !== zi) return;
      setMessages((Fi) => [...Fi, createSystemMessage(errorMessage(error), "warning")]);
      Qp();
      vu?.teardown();
      Gn.current = null;
      md?.dispose();
      Ur.current = null;
      heldServedCallRef.current = undefined;
      od?.close();
      Ad?.dispose();
      clientPresencePulse.teardown();
      zi.disconnect();
      qn.current = null;
      Ms();
      mr("disconnected");
      Hs();
    });
    return () => {
      logForDebugging("[useRemoteSession] Cleanup - disconnecting");
      Qp();
      let { count, settled } = zi.sendsInFlight();
      if (count > 0) {
        let ia = registerCleanup(() => {
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
        settled.finally(ia);
      }
      ur();
      Du = false;
      ba?.();
      ba = null;
      clientPresencePulse.teardown();
      markSessionRead(config.sessionId);
      ds();
      vu?.teardown();
      Gn.current = null;
      dm?.();
      remoteRateLimitAdopter.dispose();
      Fx();
      uy?.();
      Im?.();
      Hg?.abort();
      md?.dispose();
      Ur.current = null;
      heldServedCallRef.current = undefined;
      od?.close();
      Ad?.dispose();
      if (tc && Cp()) Yc.pushed = false;
      zi.disconnect();
      qn.current = null;
      Ms();
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
    mr,
    writeTaskCount,
    clock,
    credentials,
    setAppState,
    host,
    storageV5,
    Vd,
    Ka,
    or,
    kn,
    as,
    qa,
    pr,
    ur,
    Hs,
    La,
    ua,
    getIsLoading,
    Sn,
    qs,
    gs,
    es,
    spinnerStore,
    setAppState_2,
    appStoreDirect,
    addNotification,
    removeNotification,
    ps,
    Ms,
    ls,
    retraction,
  ]);
  let Gl = ce(
    (ss) => {
      if (
        Ws.current ||
        !config ||
        config.initialPromptUuid ||
        config.hasExplicitTitle ||
        config.viewerOnly ||
        config.isAttachToExisting ||
        appStoreDirect.getState().remoteSessionName !== undefined
      )
        return;
      Ws.current = true;
      let sessionId = config.sessionId;
      let ma = typeof ss === "string" ? ss : extractTextContent_2(ss, " ");
      if (ma)
        checkSessionTitlePolicyTaint(ma, new AbortController().signal, credentials).then((title) => {
          if (appStoreDirect.getState().remoteSessionName !== undefined) return;
          updateSessionTitle(sessionId, title.title);
        });
    },
    [config, credentials, appStoreDirect],
  );
  let gd = ce(
    async (ss, Gs, ma) => {
      let $a = qn.current;
      if (!$a) {
        logForDebugging("[useRemoteSession] Cannot send - no manager");
        return false;
      }
      pr();
      let xl = Qn.current;
      let Si = Yo.current;
      Yo.current = false;
      setConnStatus(true);
      let na = Ir.current;
      if (na !== null && !na.terminal && !na.dismissed && na.steps.some((step) => step.status === "failed"))
        wr({
          ...na,
          dismissed: true,
        });
      if (Gs?.uuid) za.add(Gs.uuid);
      hn.current++;
      Er.noteSend(Gs);
      Gn.current?.messageSent();
      let js = undefined;
      if (js !== undefined) js.inFlight++;
      let Ya;
      try {
        Ya = await (ma === undefined ? $a.sendMessage(ss, Gs) : $a.sendMessage(ss, Gs, ma));
      } finally {
        if (js !== undefined) js.inFlight--;
      }
      gs();
      if (!Ya.ok) {
        Yo.current = Yo.current || (Si && bn.current);
        hn.current = Math.max(0, hn.current - 1);
        Er.noteSendFailed(Gs);
        landWaitingLines();
        setMessages((tl) => [
          ...tl,
          Ya.reason === CANCELLED
            ? createSystemMessage(MESSAGE_WITHDRAWN_TEXT, "notice")
            : createSystemMessage(sendFailedMessage(Ya), "warning"),
        ]);
        setConnStatus(false);
        if (Ya.status === 409) La();
        return false;
      }
      ua();
      Gl(ss);
      if (!config?.viewerOnly && Qn.current === xl) {
        if (
          !or.watch(
            () => {
              logForDebugging("[useRemoteSession] Response timeout - attempting reconnect");
              landWaitingLines();
              let warningMessage = createSystemMessage(UNRESPONSIVE_NOTICE, "warning");
              setMessages((prev) => [...prev, warningMessage]);
              $a.reconnect();
            },
            (ol) => clock.setTimeout(ol, responseTimeoutMs(ws.current)),
          )
        )
          setMessages((ol) => [...ol, createSystemMessage(WAITING_FOR_ANSWER_NOTICE, "notice")]);
      }
      return true;
    },
    [config, host, setConnStatus, setMessages, landWaitingLines, clock, or, pr, gs, Gl, Er, La, ua],
  );
  let hd = ce(async () => {
    if ($r.current) return;
    $r.current = true;
    try {
      while (fr.current.length > 0) {
        let ss = fr.current.shift();
        if (ss === undefined) break;
        let Gs = Ir.current;
        if (Gs !== null && Gs.queuedCount !== fr.current.length)
          wr({
            ...Gs,
            queuedCount: fr.current.length,
          });
        await gd(ss.content, ss.opts, ss.submittedAtMs);
      }
    } finally {
      $r.current = false;
    }
  }, [gd, wr]);
  P(() => {
    Yr.current = () => {
      hd().catch((error) => logError(error));
    };
  }, [hd]);
  let bd = ce(() => !config?.viewerOnly && (!_r.current || $r.current || fr.current.length > 0), [config]);
  let Od = ce(
    async (ss, Gs) => {
      if (!qn.current) {
        logForDebugging("[useRemoteSession] Cannot send - no manager");
        return false;
      }
      responseTimeoutRef.current += 1;
      if (bd()) {
        if (Gs?.uuid) za.add(Gs.uuid);
        Er.noteSend(Gs);
        Yo.current = false;
        setConnStatus(true);
        fr.current.push({
          content: ss,
          opts: Gs,
          submittedAtMs: Date.now(),
        });
        let $a =
          Ir.current ??
          createSetupProgress(Date.now(), {
            wake: Boolean(config?.isAttachToExisting),
          });
        wr({
          ...$a,
          queuedCount: fr.current.length,
        });
        Gl(ss);
        logForDebugging(`[useRemoteSession] Queued message during bootstrap (${fr.current.length} queued)`);
        return true;
      }
      return gd(ss, Gs);
    },
    [bd, setConnStatus, wr, Gl, gd, Er],
  );
  let pc = ce(() => {
    let ss = !config?.viewerOnly && isDeviceIdentityEnabledCached();
    let Gs = ss ? (qn.current?.cancelHeldSends() ?? 0) : 0;
    if (Gs === 0) {
      if (appStoreDirect.getState().cloudMessageHeld !== undefined)
        logFeatureSad("remote_held_message_cancel", ss ? "nothing_held" : "not_allowed");
      ls(false);
      return false;
    }
    logForDebugging(`[useRemoteSession] Esc at idle: took back ${Gs} held message(s), no interrupt`);
    logFeatureOk("remote_held_message_cancel", {
      count: Gs,
    });
    return true;
  }, [config, appStoreDirect, ls]);
  let Kd = ce(() => {
    qs();
    if (!config?.viewerOnly) {
      qn.current?.cancelSession();
      is();
      return;
    }
    ur();
    setConnStatus(false);
  }, [config, setConnStatus, ur, is, qs]);
  let ec = ce((setMessages, manager) => {
    let ma = qn.current;
    if (!ma)
      return Promise.reject(
        Error("[useRemoteSession] Cannot send control request (no manager): not connected"),
      );
    let $a = setMessages.subtype === "set_permission_mode" ? Ss.current : null;
    let xl =
      $a === null
        ? ma.sendControlRequest(setMessages, manager)
        : $a.then(() => {
            let Si = qn.current;
            if (!Si)
              throw Error("[useRemoteSession] Cannot send control request (no manager): not connected");
            return Si.sendControlRequest(setMessages, manager);
          });
    if (setMessages.subtype === "set_permission_mode") {
      Hd.current++;
      xl.then(
        () => {
          Vl.current++;
        },
        () => {},
      );
    }
    return xl;
  }, []);
  let qu = ce(
    (ss) => {
      let Gs = qn.current;
      if (!Gs || config?.viewerOnly) return Promise.resolve("failed");
      let ma = Gs.workerSendsNow();
      if (bd() || ma === false || (ma === undefined && !Gs.hasPostedMessage()))
        return Promise.resolve("not_asked");
      return requestSendNow(async (prev) => {
        await Gs.releaseHeldSends(undefined, {
          keepWithheld: true,
        });
        if (qn.current !== Gs) throw Error("disconnected before the request was sent");
        return Gs.sendControlRequest(prev);
      }, ss);
    },
    [config, bd],
  );
  let cancelRequest = ce(() => qn.current?.workerSendsNow(), []);
  let disconnect = ce(() => qn.current?.serviceTimeMs(), []);
  let viewerOnly = config?.viewerOnly ?? false;
  let sessionId = config?.sessionId;
  let Kp = Q(() => {
    return;
  }, [viewerOnly, sessionId]);
  let nl = ce(() => {
    ur();
    qn.current?.disconnect();
    qn.current = null;
    ls(false);
  }, [ur, ls]);
  return Q(
    () => ({
      isRemoteMode,
      sendMessage: Od,
      cancelRequest: Kd,
      cancelHeldMessages: pc,
      sendQueuedNow: qu,
      workerSendsNow: cancelRequest,
      serviceTimeMs: disconnect,
      holdsSends: bd,
      disconnect: nl,
      sendControlRequest: ec,
      ...Kp,
    }),
    [isRemoteMode, Od, Kd, pc, qu, cancelRequest, disconnect, bd, nl, ec, Kp],
  );
}
//@ chunk-18hwfzwa.js:308155-308479 sole-consumer
/**
 * 判断用户主目录设置向云会话转发的状态：功能未开、启动时保留、留在本机、未决定或未发送。
 */
function homeSettingsForwardingStatus(h, x) {
  let homeSettingsForwardingBlocker = getHomeSettingsForwardingBlocker(isSettingsToCloudEnabledCached());
  if (homeSettingsForwardingBlocker !== null)
    return homeSettingsForwardingBlocker === "flag_off" ? "not_enabled" : homeSettingsForwardingBlocker;
  if (!h) return "launch_keeps_them";
  let L = (x ? storedHomeSettingsMode() : storedForwardMode()) ?? "unspecified";
  if (!isHomeSettingsForwardConsent() && L !== "keep_local") return "not_sent";
  switch (L) {
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
  for (let x of [notifications.current, ...notifications.queue])
    if (x?.key === REMOTE_DEVICE_NOT_BOUND && "text" in x) return x.text;
  return;
}
//@ chunk-18hwfzwa.js:308579-308654 sole-consumer
var MESSAGE_WITHDRAWN_TEXT = "You took your message back. It wasn't sent to the cloud session.";
//@ chunk-18hwfzwa.js:308654-308714 sole-consumer
function formatReasonSuffix(h) {
  return h === "" ? "" : `: ${h.replace(/\.+$/, "")}`;
}
//@ chunk-18hwfzwa.js:308714-308930 sole-consumer
function sendFailedMessage(failure) {
  let x = sendFailureMessage(failure);
  return x === undefined
    ? `Couldn't send your message${formatReasonSuffix(signInNoLongerUsableReason(failure) ?? failure.reason)}.`
    : `Your message may not have reached the cloud session${formatReasonSuffix(x)}. If Claude doesn't respond to it soon, send it again.`;
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
async function getAccessTokenRefreshed(config, x) {
  if (!isConsoleProfileSessionsCredential()) await checkAndRefreshOAuthTokenIfNeeded(x);
  return config.getAccessToken();
}
//@ chunk-18hwfzwa.js:309213-309217 sole-consumer
init_react_production();
export { useRemoteSession };
