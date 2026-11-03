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
import { writeSync, writeSync as writeSync_2 } from "fs";
import { j, R, Oo, P, ce, y, Q } from "../../vendor/react/cjs/react.production.js";
import { createSettingsChangeDetector, settingsChangeDetector } from "../utils/settings/changeDetector.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { resetLocalSettingsGitTrackedCache } from "../utils/config.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { REFUSAL_FALLBACK_DIALOG } from "../services/requestUserDialog.js";
import { serverFallbackNoticeSpec, hBo, Yjr } from "../utils/permissions/serverClassifier/fallbackNotice.js";
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
import { Me, useTheme } from "../components/design-system/ThemeProvider.js";
import { useSession } from "../context/session.js";
import { useTerminalSize } from "./useTerminalSize.js";
import { useClock } from "../ink/components/ClockContext.js";
import { useSetAppState, Cr } from "../state/AppState.js";
import { useSpinnerStore } from "../components/Spinner/spinnerStatus.js";
import {
  useNotifications,
  SLr,
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
  Skr,
  gAs,
  M0n,
  countOrphanToolResults,
  dropLateRetracted,
  Ekr,
  vkr,
  checkRefusalRetractionSource,
} from "../remote/remoteSessionEvents.js";
import {
  ServedCallWatch,
  isServedCallWatchEnabled,
  createRemoteSessionConnection,
  syncRemotePermissionMode,
  retirePostedMode,
  kmo,
  ONn,
  responseTimeoutMs,
  MNn,
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
import { plural, Eft } from "../utils/stringUtils.js";
import { ISr } from "../utils/format.js";
import {
  isDeviceIdentityEnabledCached,
  isViolinWoodEnabledCached,
  isCloudPluginForwardingEnabledCached,
  getHomeSettingsForwardingBlocker,
  isSettingsToCloudEnabledCached,
} from "../services/analytics/violinGates.js";
import { vBo } from "../utils/teleport/dirSync.js";
import {
  mapRecordWhereToReason,
  Uho,
  getLocalToolsSyncStatus,
  Bxs,
  uFn,
  toSeedSyncState,
  describeProjectFilesSync,
  normalizeNoProjectFiles,
  getPluginsSyncStatus,
  isSameSyncStatus,
} from "../cli/headlessCloud/syncStatus.js";
import { dce } from "../utils/teleport/repositoryTrustGate.js";
import { Str } from "../remote/tools/repositoryTrust.js";
import { isTrustedDeviceActiveForOrg, isTrustedDeviceGateEnabled } from "../bridge/trustedDevice.js";
import {
  formatDeviceNotBoundMessage,
  createDeviceNotBoundNotification,
  REMOTE_DEVICE_NOT_BOUND,
} from "../bridge/deviceBinding.js";
import { PTe, Cye } from "../services/remoteTools/toolHostAttestation.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import {
  fetchSession,
  ggr,
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
import { rUe, REMOTE_PERMISSION_UNSHOWABLE_TEXTS } from "../remote/forwardedPermissionDialog.js";
import { p5 } from "../services/remoteTools/lease.js";
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
  tCs,
} from "../remote/RemoteSessionManager.js";
import { pAs, KZt } from "../utils/launchDirPosition.js";
import { isAdoptableSessionCwd } from "../commands/resume/openLiveBackground.js";
import { isSystemInitMessage, getForegroundBashToolUseIds, YAs } from "../remote/backgroundTaskEvents.js";
import { parsePermissionMode, EXTERNAL_PERMISSION_MODES } from "../types/permissions.js";
import { trackThinClientFrame, requestSendNow } from "../services/homeSeed/firstSend.js";
import { isHumanTurn_2 } from "../utils/messagePredicates.js";
import { ySe } from "../history.js";
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
import { kpt } from "../utils/hooks/deviceHooks/contentDigest.js";
import { createDeviceHookDecider, xNn } from "../utils/hooks/deviceHooks/runDeviceHook.js";
import { isShuttingDown } from "../utils/gracefulShutdown.js";
import { startClientPresencePulse } from "../bridge/clientPresence.js";
import { getOauthConfig } from "../constants/oauth.js";
import { SDKAutocompactStateMessageSchema } from "../entrypoints/sdk/coreSchemas.js";
import { checkSessionTitlePolicyTaint } from "../utils/teleport/sessionTitle.js";
import { gbe, mwt, Rpn } from "../utils/teleport/homeSettingsMode.js";

//@ chunk-18hwfzwa.js:263226-263230 sole-consumer
j();
/**
 * 远程会话中监视本机设置变化：已有全局监视器时复用，否则新建一个（不监视 bridge store），变化时清缓存并向远程会话广播 servedSettingsChanged。
 */
//@ chunk-18hwfzwa.js:263263-263795 sole-consumer
function watchServedSettings(
  cwd,
  options,
  signals,
  createDetector = () => createSettingsChangeDetector({ bridgeStore: !1 }),
  sharedDetector = settingsChangeDetector,
) {
  if (sharedDetector.isWatching())
    return { subscribe: (He) => sharedDetector.subscribe(He), dispose: () => Promise.resolve() };
  let detector = createDetector();
  detector.initialize(cwd, options, { machineServesSession: !0 }).then(
    () => logFeatureOk("remote_served_settings_watch"),
    () => logFeatureBad("remote_served_settings_watch", "watch_failed_to_start"),
  );
  let subscribe = detector.subscribe(() => resetLocalSettingsGitTrackedCache()),
    subscribe_2 = detector.subscribe((He) => signals.servedSettingsChanged.emit(He));
  return {
    subscribe: (He) => {
      let We = [detector.subscribe(He), sharedDetector.subscribe(He)];
      return () => We.forEach((ze) => ze());
    },
    dispose: () => (subscribe(), subscribe_2(), detector.dispose()),
  };
}
/**
 * 跟踪远程会话中"清空对话"的发送：记录清空请求及之后发送的消息，收到重置帧时给出需要保留的消息 uuid 集合。
 */
//@ chunk-18hwfzwa.js:263795-264564 sole-consumer
class ConversationClearTracker {
  #e = [];
  noteSend(h) {
    if (h?.clearsConversation) {
      if (h.uuid !== void 0 && this.#e.some((D) => D.uuid === h.uuid)) return;
      if ((this.#e.push({ uuid: h.uuid, sends: new Set() }), this.#e.length > 20)) this.#e.shift();
      return;
    }
    let at = this.#e.at(-1);
    if (!at || !h?.uuid) return;
    if (at.sends.size >= 100) at.sends.clear();
    at.sends.add(h.uuid);
  }
  noteSendFailed(h) {
    let x = h?.uuid;
    if (h?.clearsConversation) {
      let D = x === void 0 ? this.#e.length - 1 : this.#e.findIndex((L) => L.uuid === x);
      if (D !== -1) this.#e.splice(D, 1);
      return;
    }
    if (x === void 0) return;
    for (let D of this.#e) D.sends.delete(x);
  }
  onResetFrame() {
    let h = this.#e.shift();
    if (!h) return { ownClear: !1, preserved: new Set() };
    let x = new Set(h.sends);
    for (let D of this.#e) {
      if (D.uuid !== void 0) x.add(D.uuid);
      for (let send of D.sends) x.add(send);
    }
    return { ownClear: !0, preserved: x };
  }
  forget() {
    this.#e = [];
  }
}
/**
 * 远程会话对话框请求的处理表：校验载荷后弹出对应对话框，返回完成结果或取消。
 */
//@ chunk-18hwfzwa.js:264564-265112 sole-consumer
var REMOTE_DIALOG_HANDLERS = {
  [REFUSAL_FALLBACK_DIALOG.kind]: async (h, x, D) => {
    let safeParse = REFUSAL_FALLBACK_DIALOG.payload().safeParse(x);
    if (!safeParse.success) return { behavior: "cancelled" };
    let ee = await h(REFUSAL_FALLBACK_DIALOG, safeParse.data, D);
    return ee === "cancelled" ? { behavior: "cancelled" } : { behavior: "completed", result: ee };
  },
  [serverFallbackNoticeSpec.kind]: async (h, x, D) => {
    let safeParse = serverFallbackNoticeSpec.payload().safeParse(x);
    if (!safeParse.success) return { behavior: "cancelled" };
    let ee =
        safeParse.data.gatewayHost === void 0 || safeParse.data.gatewayHost === ""
          ? void 0
          : hBo(safeParse.data.gatewayHost),
      ke = await h(serverFallbackNoticeSpec, Yjr(ee === void 0 ? {} : { gatewayHost: ee }), D);
    return ke === "cancelled" ? { behavior: "cancelled" } : { behavior: "completed", result: ke };
  },
};
/**
 * 处理远程会话发来的 request_user_dialog 控制请求：按 dialog_kind 找处理器打开本地对话框并回复结果，在途请求可单独取消或整体中止。
 */
//@ chunk-18hwfzwa.js:265112-265842 sole-consumer
class RemoteDialogDispatcher {
  inputs;
  inFlight = new Map();
  constructor(h) {
    this.inputs = h;
  }
  setInputs(h) {
    this.inputs = h;
  }
  dispatch = (h) => {
    if (h.request.subtype !== "request_user_dialog") return;
    let { request: request, request_id: request_id } = h,
      L = REMOTE_DIALOG_HANDLERS[request.dialog_kind];
    if (!L) {
      this.inputs.sendResponse(request_id, { behavior: "cancelled" });
      return;
    }
    let inFlight = this.inFlight,
      abortController = new AbortController();
    inFlight.set(request_id, abortController);
    let Re = () => inFlight.get(request_id) === abortController && inFlight.delete(request_id);
    L(this.inputs.requestDialog, request.payload, { signal: abortController.signal })
      .then((Be) => {
        if (!Re()) return;
        this.inputs.sendResponse(request_id, Be);
      })
      .catch(() => {
        if (!Re()) return;
        this.inputs.sendResponse(request_id, { behavior: "cancelled" });
      });
  };
  cancel = (h) => {
    let x = this.inFlight.get(h);
    if (!x) return;
    (this.inFlight.delete(h), x.abort());
  };
  drain() {
    for (let [h, x] of this.inFlight) (this.inFlight.delete(h), x.abort());
  }
}
//@ chunk-18hwfzwa.js:265842-265863 sole-consumer
class xUe {
  inFlight = 0;
}
//@ chunk-18hwfzwa.js:265863-265890 sole-consumer
var Ybn = new HostScoped(() => new xUe());
/**
 * 云会话发送失败是否因为本机 claude.ai 登录失效：是则给出重新登录（/login 或 claude auth login）的说明，forceLoginMethod 限制时说明需要放开设置。
 */
//@ chunk-18hwfzwa.js:265890-266572 sole-consumer
function signInNoLongerUsableReason(failure) {
  if (!isFirstPartyProvider()) return;
  if (
    !(failure.status === void 0
      ? failure.advice !== void 0 && !hasUsableClaudeAILogin()
      : failure.status === 401 && (!hasUsableClaudeAILogin() || isOAuthRefreshKnownDead()))
  )
    return;
  let D = getLoginAvailability();
  if (D.kind === "refused")
    return D.cause === "login_method_pin"
      ? "The claude.ai sign-in this session was using is no longer usable, and the forceLoginMethod setting on this machine requires a different sign-in method. To sign in again here, that setting has to allow claude.ai."
      : void 0;
  return `The claude.ai sign-in this session was using is no longer usable. ${env.DISABLE_LOGIN_COMMAND ? `${exitHint(!0)}, sign in to the same account with \`claude auth login\`, then attach to this session again.` : "Run /login with the same account, then send your message again."}`;
}
//@ chunk-18hwfzwa.js:266572-266584 affinity
var XD = null;
//@ chunk-18hwfzwa.js:266584-266602 affinity
var p0t = 750,
  AUe = 3;
/**
 * 远程（云）会话：订阅云端事件流，把消息写入本地转录；发送用户提示（确认送达，否则提示 "Couldn't send your message"）；转发权限请求/中断；断线重连与状态显示。
 */
//@ chunk-18hwfzwa.js:266602-308155 callgraph-witnessed = useRemoteSession (0.184)
function useRemoteSession({
  config: config,
  adoptRateLimits: adoptRateLimits,
  sink: sink,
  requestDialog: requestDialog,
  toolPermissionContext: toolPermissionContext,
  tools: tools,
}) {
  let isRemoteMode = !!config,
    {
      setMessages: setMessages,
      setIsLoading: setIsLoading,
      holdLine: holdLine,
      lineTaken: lineTaken,
      landWaitingLines: landWaitingLines,
      getIsLoading: getIsLoading,
      onInit: onInit,
      onPermissionModeChange: onPermissionModeChange,
      noteOwnPermissionModePush: noteOwnPermissionModePush,
      noteOwnPermissionModeAnswer: noteOwnPermissionModeAnswer,
      noteOwnUnrecordedModeAnswer: noteOwnUnrecordedModeAnswer,
      streaming: streaming,
      setStreamMode: setStreamMode,
      setInProgressToolUseIDs: setInProgressToolUseIDs,
      onTurnComplete: onTurnComplete,
      onTurnStopped: onTurnStopped,
      onOtherTurnComplete: onOtherTurnComplete,
      onConversationReset: onConversationReset,
      retraction: retraction,
    } = sink,
    { credentials: credentials, storageV5: storageV5 } = Me(),
    host = useSession((ss) => ss.host),
    setAppState = useSession(),
    Ro = R(void 0),
    Ho = Oo(() => tools),
    Io = Oo((ss) => Promise.resolve("unanswered")),
    Wo = Oo((ss, Gs) => Promise.resolve("unanswered")),
    mn = Oo((ss) => Promise.resolve({ answer: "unanswered" }));
  P(() => {
    return;
  }, [config]);
  let { columns: columns } = useTerminalSize(),
    No = Oo(() => columns),
    setConnStatus = ce(
      (ss) => {
        if (ss && getIsLoading()) return;
        setIsLoading(ss);
      },
      [getIsLoading, setIsLoading],
    ),
    Yo = R(!1),
    [kn] = y(() => new Map()),
    Fn = R(!1),
    bn = R(!1),
    Go = R(0),
    hn = R(0),
    Mn = R(void 0),
    Xo = R(!1),
    Sn = ce(() => {
      (streaming.applyStreamingText(() => null),
        streaming.setStreamingToolUses((prev) => (prev.length > 0 ? [] : prev)));
    }, [streaming]),
    $n = useClock(),
    on = useSetAppState(),
    _o = Cr(),
    cn = useSpinnerStore(),
    { addNotification: addNotification, removeNotification: removeNotification } = useNotifications(),
    mr = ce(
      (ss) => on((Gs) => (Gs.remoteConnectionStatus === ss ? Gs : { ...Gs, remoteConnectionStatus: ss })),
      [on],
    ),
    runningTaskIdsRef = R(new Map()),
    Wn = R(new Map()),
    Fr = R(new Set()),
    Zn = R([]),
    Un = R(0),
    writeTaskCount = ce(() => {
      let ss = [...runningTaskIdsRef.current.values()],
        Gs = Fr.current,
        ma = Zn.current.some((xl) => Gs.has(xl)) ? "seeded" : Gs.size > 0 ? "in_turn" : "none",
        $a = reconcileRemoteTasks(Wn.current, runningTaskIdsRef.current, Date.now());
      on((xl) => applyRemoteTaskState(xl, ss, $a, ma));
    }, [on]),
    [or] = y(() => new ServedCallWatch()),
    pr = ce(() => {
      or.clear();
    }, [or]),
    Qn = R(0),
    ur = ce(() => {
      (Qn.current++, pr());
    }, [pr]),
    Ir = R(null),
    Pr = R(Date.now()),
    ts = R(!1),
    Gn = R(null),
    Ur = R(null),
    Zr = R(null),
    wr = ce(
      (ss) => {
        ((Ir.current = ss), on((Gs) => (Gs.remoteBootstrap === ss ? Gs : { ...Gs, remoteBootstrap: ss })));
      },
      [on],
    ),
    zr = ce(
      (ss) => {
        let Gs = Ir.current;
        if ((wr(ss), (Gs === null || !Gs.terminal) && ss.terminal)) {
          if ((Gn.current?.workerCameUp(), Ur.current?.onWorkerUp(), ss.hasStructuredSteps)) {
            let any = ss.steps.some((step) => step.status === "failed");
            if (!ss.dismissed && !any)
              setMessages(($a) => [...$a, createSystemMessage(setupReadySummary(ss), "info")]);
            if (!any) logFeatureOk("remote_bootstrap");
          }
        }
      },
      [wr, setMessages],
    ),
    _r = R(!0),
    fr = R([]),
    $r = R(!1),
    Yr = R(() => {}),
    [Er] = y(() => new ConversationClearTracker()),
    Vr = R(new Set()),
    ms = ce(
      (ss = !0, Gs = "disconnected") => {
        landWaitingLines();
        let ma = fr.current.length;
        if (((fr.current = []), Er.forget(), ma > 0)) {
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
        if (Ir.current !== null && Ir.current.queuedCount !== 0) wr({ ...Ir.current, queuedCount: 0 });
      },
      [setMessages, landWaitingLines, wr, Er],
    ),
    Xs = ce(() => {
      let ss = Ir.current;
      if (ss !== null && !ss.terminal) zr(completeSetupProgress(ss, Date.now()));
      if (!_r.current) {
        if (
          ((bn.current = !1),
          (Yo.current = !1),
          (Go.current = 0),
          (_r.current = !0),
          qn.current?.endWorkerStart(),
          ss === null)
        )
          (Gn.current?.workerCameUp(), Ur.current?.onWorkerUp());
        let Gs = fr.current.length === 0;
        Yr.current();
        let ma = config?.initialPromptUuid !== void 0 && config.initialPromptUuid !== Mn.current;
        if (Gs && getIsLoading() && !ma) setConnStatus(!1);
      }
    }, [zr, config, getIsLoading, setConnStatus]),
    Ls = ce(
      (ss) => {
        if (
          (logFeatureBad("remote_bootstrap", "step_failed"),
          (ts.current = !1),
          ms(!1, "start_failed"),
          (_r.current = !0),
          qn.current?.endWorkerStart(),
          (bn.current = !1),
          (Yo.current = !1),
          (Go.current = 0),
          (hn.current = 0),
          (Xo.current = !1),
          setConnStatus(!1),
          ss)
        )
          setMessages((Gs) => [
            ...Gs,
            createSystemMessage(
              "Cloud container provisioning failed \u2014 reconnect or check the session logs",
              "warning",
            ),
          ]);
      },
      [ms, setConnStatus, setMessages],
    ),
    is = ce(() => {
      if ((ur(), !Yo.current)) (Go.current++, (hn.current = Math.max(0, hn.current - 1)));
      ((Xo.current = !1), (Yo.current = !0), (bn.current = !0), setConnStatus(!1));
      let ss = Ir.current;
      if (ss !== null && !ss.terminal && !ss.dismissed) wr({ ...ss, dismissed: !0 });
    }, [ur, setConnStatus, wr]),
    ws = R(!1),
    Ci = R(null),
    oi = R(!1),
    Oi = Oo((ss, Gs, ma) => {
      if (Yo.current) return;
      if (Gs === "provisioning" && oi.current) return;
      let overrideMessage = cn.get().overrideMessage;
      if (overrideMessage === null || overrideMessage === Ci.current) {
        let replaced = ss.replace(Eft, ""),
          Si = ISr(Gs === "held" ? replaced : ss, No());
        (cn.main.setMessage(
          Si,
          ma === null
            ? null
            : {
                words: ma,
                detail:
                  replaced.trim().toLowerCase() === ma.replace(Eft, "").trim().toLowerCase() ? null : ss,
              },
        ),
          (Ci.current = Si),
          (oi.current = Gs === "held"));
      }
    }),
    Hi = R(void 0),
    Zi = R(void 0),
    da = R(void 0),
    qn = R(null),
    ps = ce(() => {
      if (!config || config.viewerOnly || !isDeviceIdentityEnabledCached() || qn.current === null) return;
      let ss = Gn.current,
        of = vBo.of(host),
        silentlyNotArmed = of.silentlyNotArmed(config.sessionId),
        $a = {
          state: "absent",
          ...(config.isAttachToExisting
            ? { reason: mapRecordWhereToReason(config.sessionRecordLookup) }
            : silentlyNotArmed !== void 0
              ? { reason: silentlyNotArmed }
              : (of.notOptedIn(config.sessionId) ?? { reason: "not_set_up" })),
        },
        xl = Zi.current,
        Si = Uho($a);
      if (da.current === void 0 && !config.isAttachToExisting)
        da.current = deviceNotBoundNoticeText(_o.getState().notifications);
      let na = da.current,
        js = dce() ? config.repositoryTrust?.current() : void 0,
        Ya = Str(js, isTrustedDeviceActiveForOrg()),
        tl = getLocalToolsSyncStatus(
          xl,
          na === void 0 ? void 0 : formatDeviceNotBoundMessage(na),
          js === "nothing_to_mark" && PTe(Cye(void 0)),
        ),
        ol = Bxs($a, uFn(void 0)),
        ed = toSeedSyncState(
          config.homeSeed,
          homeSettingsForwardingStatus(host.launchOptions.mayForwardHomeSettings(), !1),
          Hi.current,
        ),
        _d = {
          ...(ol !== void 0 && { projectFiles: ol }),
          ...(Si !== void 0 && { whileClosed: Si }),
          ...(Ya !== void 0 && { repositoryTrust: Ya }),
          settings: describeProjectFilesSync(ol === void 0 ? normalizeNoProjectFiles(ed) : ed),
          plugins: getPluginsSyncStatus(
            ss !== null
              ? { kind: "attached", state: ss.state() }
              : Zr.current !== null
                ? { kind: "absent", reason: Zr.current }
                : { kind: "pending" },
          ),
          ...(tl !== void 0 && { localTools: tl }),
        };
      on((ga) =>
        ga.cloudSessionSync !== void 0 && isSameSyncStatus(ga.cloudSessionSync, _d)
          ? ga
          : { ...ga, cloudSessionSync: _d },
      );
    }, [config, host, on, _o]),
    xs = R(new Map()),
    kr = R(void 0),
    ls = ce(
      (ss) => {
        if (!ss) (xs.current.clear(), (kr.current = void 0));
        let Gs = ss ? kr.current : void 0;
        on((ma) =>
          (ma.cloudMessageHeld !== void 0) === ss && ma.cloudMessageHeld?.row === Gs
            ? ma
            : { ...ma, cloudMessageHeld: ss ? (Gs === void 0 ? {} : { row: Gs }) : void 0 },
        );
      },
      [on],
    ),
    Ms = ce(() => {
      ((Hi.current = void 0),
        (Zi.current = void 0),
        ls(!1),
        on((ss) => (ss.cloudSessionSync === void 0 ? ss : { ...ss, cloudSessionSync: void 0 })));
    }, [on, ls]),
    qs = ce(() => {
      oi.current = !1;
      let ss = Ci.current;
      if (ss === null) return;
      if (((Ci.current = null), cn.get().overrideMessage === ss)) cn.main.setMessage(null);
    }, [cn]),
    gs = ce(() => {
      if (oi.current) qs();
    }, [qs]),
    es = ce(() => {
      if (!oi.current) qs();
    }, [qs]),
    ds = ce(() => {
      (mr("connecting"),
        qs(),
        wr(null),
        Ms(),
        (ts.current = !1),
        runningTaskIdsRef.current.clear(),
        isCompactingRef.current.clear(),
        Fr.current.clear(),
        Wn.current.clear(),
        writeTaskCount(),
        on((ss) => (ss.remoteWorkerReportedGone ? { ...ss, remoteWorkerReportedGone: !1 } : ss)),
        setInProgressToolUseIDs({ action: "clear" }),
        (Fn.current = !1),
        on((ss) => (ss.hasRemoteReplyChannel ? { ...ss, hasRemoteReplyChannel: !1 } : ss)),
        on((ss) => (ss.workerInventory === null ? ss : { ...ss, workerInventory: null })),
        on((ss) => (ss.remoteSessionName === void 0 ? ss : { ...ss, remoteSessionName: void 0 })),
        on((ss) => (ss.activeGoal === void 0 ? ss : { ...ss, activeGoal: void 0 })),
        on((ss) => (ss.remoteAutocompactState === void 0 ? ss : { ...ss, remoteAutocompactState: void 0 })),
        on((ss) => mergeCloudArtifactFrames(ss, null)));
    }, [mr, qs, wr, Ms, writeTaskCount, setInProgressToolUseIDs, on]),
    Hs = ce(() => {
      (ur(),
        (Yo.current = !1),
        (bn.current = !1),
        (Go.current = 0),
        (hn.current = 0),
        (Xo.current = !1),
        setConnStatus(!1),
        qs(),
        runningTaskIdsRef.current.clear(),
        Fr.current.clear(),
        markTasksUnlisted(Wn.current),
        writeTaskCount(),
        setInProgressToolUseIDs({ action: "clear" }),
        retraction.inProgressToolUses.clear(),
        Sn(),
        streaming.resetMetrics());
    }, [ur, setConnStatus, qs, writeTaskCount, setInProgressToolUseIDs, retraction, Sn, streaming]),
    _s = R(null),
    fs = R(!1),
    ii = R(0),
    ua = ce(() => {
      ((fs.current = !1), (_s.current = null), ii.current++);
    }, []),
    La = ce(() => {
      let ss = qn.current;
      if (config === void 0 || ss === null) return Promise.resolve();
      if (isEssentialTrafficOnly()) return Promise.resolve();
      if (_s.current !== null) return _s.current;
      let Gs = ii.current,
        $a = (async () => {
          try {
            let xl = await fae(config, { credentials: credentials, storageV5: storageV5 }),
              Si;
            try {
              Si = (await fetchSession(config.sessionId, { accessToken: xl })).session_status;
            } catch (error) {
              if (errorMessage(error) !== ggr || !(await config.onAuth401?.(xl))) throw error;
              Si = (await fetchSession(config.sessionId, { accessToken: config.getAccessToken() }))
                .session_status;
            }
            if (Si !== "archived" || qn.current !== ss || ii.current !== Gs) return;
            if (!fs.current)
              ((fs.current = !0),
                setMessages((na) => [
                  ...na,
                  createSystemMessage(archivedSessionMessage(config.sessionId), "warning"),
                ]));
            Hs();
          } catch (error) {
            logForDebugging(
              `[useRemoteSession] Could not read whether the session was archived: ${errorMessage(error)}`,
            );
          }
        })();
      return (
        (_s.current = $a),
        $a.finally(() => {
          if (_s.current === $a) _s.current = null;
        }),
        $a
      );
    }, [config, credentials, storageV5, setMessages, Hs]),
    Xa = ce(
      (ss, Gs) => {
        let ma = xs.current.get(ss);
        if (ma === void 0 || Gs === ma) {
          xs.current.set(ss, Gs);
          return;
        }
        if (kr.current !== void 0) return;
        ((kr.current = ss),
          on(($a) =>
            $a.cloudMessageHeld !== void 0 && $a.cloudMessageHeld.row !== ss
              ? { ...$a, cloudMessageHeld: { row: ss } }
              : $a,
          ));
      },
      [on],
    ),
    dl = ce(
      (ss, Gs) => {
        let ma = qn.current;
        queueMicrotask(() => {
          if (qn.current !== ma || ma?.hasWithholdableHeldSend() !== !0) return;
          Xa(ss, Gs);
        });
      },
      [Xa],
    ),
    Vl = R(0),
    Hd = R(0),
    Ss = R(null),
    yi = R(!1),
    Ws = R(!1);
  P(() => {
    if (config === void 0) return;
    let ss = !1,
      Gs = async (ma) => {
        try {
          let $a = await fae(config, { credentials: credentials, storageV5: storageV5 });
          if (ma.aborted) return;
          let xl = await fetchSession(config.sessionId, { accessToken: $a });
          if (!ss) ((ss = !0), logFeatureOk("ccr_session_name_follow"));
          return serviceSessionName(xl.title);
        } catch (error) {
          if (
            (logForDebugging(
              `[useRemoteSession] Could not re-read the session's name: ${errorMessage(error)}`,
            ),
            !ss)
          )
            ((ss = !0), logFeatureBad("ccr_session_name_follow", "read_failed"));
          return;
        }
      };
    return followServiceSessionName($n, config.serviceName, isEssentialTrafficOnly() ? void 0 : Gs, (ma) =>
      on((prev) => (prev.remoteSessionName === ma ? prev : { ...prev, remoteSessionName: ma })),
    );
  }, [config, credentials, storageV5, on, $n]);
  let [za] = y(() => new BoundedUUIDSet(50)),
    responseTimeoutRef = R(0),
    isCompactingRef = R(new Set()),
    [as] = y(() => new BoundedUUIDSet(256)),
    pi = ce((ss) => isCompactingRef.current.has(ss) || as.has(ss), [as]),
    qa = ce((ss) => isSubagentToolRequest(ss) && pi(String(ss.agent_id)), [pi]),
    managerRef = R(new Set()),
    [$l] = useTheme(),
    hasUpdatedTitleRef = R(!1),
    sentUUIDsRef = R(void 0),
    toolsRef = R(void 0);
  P(() => {
    ((sentUUIDsRef.current = void 0),
      (toolsRef.current = config?.eventSigner === void 0 ? !1 : void 0),
      (hasUpdatedTitleRef.current = !1));
    let ss = !0;
    return (
      config?.eventSigner?.then(
        (Gs) => {
          if (ss) toolsRef.current = Gs !== void 0;
        },
        () => {
          if (ss) toolsRef.current = !1;
        },
      ),
      config?.boundHere?.then(
        (sdkMessage) => {
          if (ss) sentUUIDsRef.current = sdkMessage;
        },
        () => {},
      ),
      () => {
        ss = !1;
      }
    );
  }, [config]);
  let _c = Q(
      () =>
        config && dce()
          ? {
              get answersProveDevice() {
                return sentUUIDsRef.current === !1 && toolsRef.current !== !1 ? void 0 : sentUUIDsRef.current;
              },
              onAnswered: () => {
                hasUpdatedTitleRef.current = !0;
              },
              onNotShown: (ss, Gs) => {
                if (ss === "proves_no_device") or.requestOpened(Gs);
                setMessages((ma) => [
                  ...ma,
                  createSystemMessage(
                    ss === "proves_no_device"
                      ? REMOTE_TOOLS_CONSENT_TEXT["repository_trust.prompt.answer_elsewhere"](
                          getRemoteSessionUrl(config.sessionId, void 0, { from: "cli" }),
                        )
                      : REMOTE_TOOLS_CONSENT_TEXT["repository_trust.prompt.not_shown_here"],
                    "warning",
                  ),
                ]);
              },
            }
          : void 0,
      [config, setMessages, or],
    ),
    mc = {
      sendResponse: (ss, Gs) => {
        or.requestClosed(ss);
        let ma = kn.get(ss);
        kn.delete(ss);
        let wasCompacting = qn.current;
        if (!wasCompacting) return;
        if ((wasCompacting.respondToPermissionRequest(ss, Gs), Gs.behavior === "allow")) {
          let xl = Gs.updatedPermissions?.findLast((na) => na.type === "setMode"),
            Si = xl?.type === "setMode" && xl.destination === "session" ? xl.mode : void 0;
          if (Si === "default" || Si === "acceptEdits") {
            if (isDeviceIdentityEnabledCached()) Hd.current++;
            noteOwnPermissionModeAnswer(Si);
          } else if (Si !== void 0) noteOwnUnrecordedModeAnswer();
          if (ma === void 0 || !pi(ma)) setConnStatus(!0);
        } else if (Gs.interrupt && ma === void 0) (is(), onTurnStopped?.());
      },
      requestDialog: requestDialog,
      toolRegistry: tools,
      toolPermissionContext: toolPermissionContext,
      theme: $l,
      canInterruptTurn: !config?.viewerOnly,
      askedByBackgroundSubagent: qa,
      onAskNotShown: (ss) => {
        setMessages((Gs) => [
          ...Gs,
          createSystemMessage(ss ? rUe : REMOTE_PERMISSION_UNSHOWABLE_TEXTS, "warning"),
        ]);
      },
      handedOverAtAttach: config?.seedSubagentRequests,
      heldServedCall: (ss) => {
        let Gs = Ro.current?.(ss);
        if (Gs?.held) return Gs;
        let ma = config?.heldServedCall?.(ss);
        if (ma?.held) return ma;
        return [Gs, ma].find((prev) => prev?.reason === "other_input") ?? ma ?? Gs ?? p5;
      },
      ...(_c && { repositoryTrustQuestion: _c }),
      ...(isServedCallWatchEnabled() && { computerFolderPrompt: !0 }),
    },
    [Vd] = y(() => new TransportPermissionDispatcher(mc)),
    cd = {
      sendResponse: (ss, Gs) => {
        qn.current?.respondToUserDialogRequest(ss, Gs);
      },
      requestDialog: requestDialog,
    },
    [Ka] = y(() => new RemoteDialogDispatcher(cd));
  (P(() => {
    (Vd.setInputs(mc), Ka.setInputs(cd));
  }),
    P(() => {
      let flattened = [
        ...[],
        { feed: config?.homeSeed?.status, name: "home-settings", wait: "settings" },
      ].flatMap(({ feed: feed, name: xl, wait: wait }) =>
        feed === void 0 ? [] : [{ feed: feed, name: xl, wait: wait }],
      );
      if (flattened.length === 0) return;
      let Gs =
          ($a, xl) =>
          ({ line: line, level: level }) => {
            switch ((ps(), level)) {
              case "progress":
                (logForDebugging(`[useRemoteSession] ${$a}: ${line}`),
                  Oi(line, "held", null),
                  dl(xl, line.replace(Eft, "")));
                return;
              case "debug":
                logForDebugging(`[useRemoteSession] ${$a}: ${line}`);
                return;
              case "info":
              case "warning": {
                let converted = createSystemMessage(line, level === "info" ? "notice" : "warning");
                (Vr.current.add(converted.uuid), setMessages((prev) => [...prev, converted]));
                return;
              }
              default:
            }
          },
        toolUseIds = flattened.map(({ feed: feed, name: xl, wait: wait }) => {
          let na = Gs(xl, wait),
            subscribe = feed.subscribe(na);
          for (let Ya of feed.takeBacklog()) na(Ya);
          return subscribe;
        });
      return () => toolUseIds.forEach((block) => block());
    }, [void 0, config?.homeSeed, setMessages, ps, dl]),
    P(() => {
      let ss = config?.deviceNotBoundNotice;
      if (!ss) return;
      let Gs = !0;
      return (
        ss.then((block) => {
          if (!Gs || block === void 0) return;
          if (block.toast) addNotification(createDeviceNotBoundNotification(block.text));
          ((da.current = block.text), ps());
        }),
        () => {
          ((Gs = !1), (da.current = void 0));
        }
      );
    }, [config?.deviceNotBoundNotice, addNotification, ps]),
    P(() => {
      if (!config) {
        if (yi.current)
          ((yi.current = !1),
            setConnStatus(!1),
            (Ws.current = !1),
            (ws.current = !1),
            (Yo.current = !1),
            (bn.current = !1),
            (Go.current = 0),
            (responseTimeoutRef.current = 0),
            (hn.current = 0),
            (Xo.current = !1),
            (_r.current = !0),
            ms(),
            ds(),
            retraction.inProgressToolUses.clear(),
            Sn(),
            streaming.resetMetrics());
        return;
      }
      ((yi.current = !0),
        (_r.current = Boolean(config.isAttachToExisting || config.viewerOnly)),
        ms(),
        wr(null),
        (ts.current = !1),
        ua(),
        (responseTimeoutRef.current = 0),
        (hn.current = config.initialPromptUuid !== void 0 ? 1 : 0),
        (Xo.current = !1));
      let seedBackgroundTasks = config.seedBackgroundTasks;
      if (
        ((isCompactingRef.current = new Set(seedBackgroundTasks?.awaitingFinish)),
        (Fr.current = new Set(seedBackgroundTasks?.foreground)),
        (Zn.current = seedBackgroundTasks?.foreground ?? []),
        as.clear(),
        config.seedAskersPastATurn?.forEach((prev) => as.add(prev)),
        (runningTaskIdsRef.current = new Map(seedBackgroundTasks?.running.map((Br) => [Br.id, Br]))),
        (Wn.current = new Map(config.seedWorkflowRuns?.map((Br) => [Br.id, Br]))),
        writeTaskCount(),
        seedBackgroundTasks !== void 0)
      )
        logEvent("tengu_remote_background_tasks_adopted", {
          via: lit_2("seed"),
          running: seedBackgroundTasks.running.length,
          awaiting_finish: seedBackgroundTasks.awaitingFinish.length,
        });
      if (((Pr.current = Date.now()), config.initialPromptUuid)) za.add(config.initialPromptUuid);
      logForDebugging(`[useRemoteSession] Initializing for session ${config.sessionId}`);
      let Gs = !1,
        ma = !1,
        $a = new Set(),
        xl = !1,
        Si = void 0,
        na = void 0,
        next = new Set(XD !== null ? (config.seedReplyChannelToolUseIds ?? []) : []);
      Fn.current = XD !== null && _o.getState().hasRemoteReplyChannel;
      let Ya = Fn.current;
      function tl() {
        let Br = Ya;
        if (((Ya = !1), Fn.current)) {
          if (Br) logEvent("tengu_remote_reply_channel_init", {});
          return;
        }
        ((Fn.current = !0),
          logEvent("tengu_remote_reply_channel_init", {}),
          on((Fi) => (Fi.hasRemoteReplyChannel ? Fi : { ...Fi, hasRemoteReplyChannel: !0 })));
      }
      if (config.seedActiveGoal !== void 0) {
        let Br = config.seedActiveGoal ?? void 0;
        if ((on((Fi) => (Fi.activeGoal === Br ? Fi : { ...Fi, activeGoal: Br })), Br !== void 0))
          logEvent("tengu_remote_active_goal_adopted", { via: lit_2("seed"), active: !0 });
      }
      if (config.seedAutocompactState !== void 0) {
        let seedAutocompactState = config.seedAutocompactState;
        (on((Fi) => ({ ...Fi, remoteAutocompactState: seedAutocompactState })),
          logEvent("tengu_remote_autocompact_state_adopted", {
            via: lit_2("seed"),
            enabled: seedAutocompactState.enabled,
            enforced: seedAutocompactState.enforced,
            source: fromEnum(seedAutocompactState.source),
          }));
      }
      let ol = config.seedAutocompactState !== void 0,
        ed = (Br, Fi) => {
          let ia = 0,
            vl = !1;
          if (
            (on((hl) => {
              let dd = mergeCloudArtifactFrames(hl, Br);
              return (
                (vl = dd !== hl),
                (ia = count(Object.values(dd.frameUrls), (Ra) => Ra.fromCloudSession === !0)),
                dd
              );
            }),
            !vl && ia === (Br?.length ?? 0))
          )
            return;
          logEvent("tengu_remote_cloud_artifacts_adopted", {
            via: fromEnum(Fi),
            listed: Br?.length ?? 0,
            kept: ia,
          });
        },
        _d = config.seedSessionArtifacts !== void 0;
      if (config.seedSessionArtifacts !== void 0) ed(config.seedSessionArtifacts, "seed");
      let ga = createRemoteRateLimitAdopter(() => adoptRateLimits && !config.viewerOnly, "stream");
      queueMicrotask(() => ga.adopt(config.seedRateLimitInfos ?? [], "seed"));
      let du = config.initialSequenceNum === void 0 ? "history" : "replay",
        rg = () => {
          (ga.settle(du), (du = "replay"));
        },
        wp = void 0,
        Wd = 0,
        Rl = !1,
        Yd = null,
        Pi = !1,
        fa = !1,
        sa = !1,
        td = ({ line: line, level: level }) => {
          if (level === "debug") {
            logForDebugging(`[useRemoteSession] hooks: ${line}`);
            return;
          }
          setMessages((ia) => [...ia, createSystemMessage(line, level === "warning" ? "warning" : "notice")]);
        },
        Pl = () => null,
        Ad = (() => {
          if (config.viewerOnly || !isViolinWoodEnabledCached()) return null;
          try {
            return watchServedSettings(
              configChangeBlocker(setAppState, storageV5, credentials),
              storageV5,
              deviceHooksProcessMemories.of(host),
            );
          } catch (error) {
            return (logError(error), null);
          }
        })(),
        od = (() => {
          if (config.servedTools === void 0 || config.viewerOnly || !isViolinWoodEnabledCached()) return null;
          try {
            let onAnnounceOutcome = config.servedTools.onAnnounceOutcome,
              onRevoked = config.servedTools.onRevoked,
              ia = createRemoteSessionConnection({
                sessionId: config.sessionId,
                manager: () => Yd,
                ...config.servedTools,
                onAnnounceOutcome: (hl, dd) => {
                  if (hl.kind === "announced")
                    ((Zi.current =
                      hl.status === "announced" ? { on: !0, name: ia.servedHost()?.name ?? "" } : { on: !1 }),
                      ps());
                  else if (hl.kind === "refused" || hl.kind === "unsupported")
                    ((Zi.current = { on: !1 }), ps());
                  onAnnounceOutcome?.(hl, dd);
                },
                onRevoked:
                  onRevoked === void 0
                    ? void 0
                    : (prev) =>
                        onRevoked((message) => {
                          ((Zi.current = { on: !1 }), ps(), prev(message));
                        }),
              });
            Ro.current = ia.heldServedCall;
            let vl = registerCleanup(() => ia.close());
            return {
              ...ia,
              close: () => {
                vl();
                let close = ia.close(),
                  dd = registerCleanup(() => close);
                return (close.finally(dd), close);
              },
            };
          } catch (error) {
            return (logError(error), null);
          }
        })(),
        md = (() => {
          if (Ad === null || config.viewerOnly || !isHookForwardingEnabled()) return null;
          try {
            return startDeviceHookForwarding({
              launchDir: getOriginalCwd(),
              cloudSessionId: config.sessionId,
              memory: deviceHooksProcessMemories.of(host),
              getTools: () => Ho(),
              storageV5: storageV5,
              manager: () => Yd,
              syncRoot: Pl,
              onLine: td,
              registerCleanup: registerCleanup,
              subscribeSettingsChanges: (prev) => Ad.subscribe(prev),
            });
          } catch (error) {
            return (logError(error), null);
          }
        })(),
        vp = {
          ...config,
          admitProjectPersonMessages: Si !== void 0,
          subagentRequestsOutliveTheTurn: !0,
          trackSendsInFlight: !0,
          keepUndeliveredResponses: config.keepUndeliveredResponses ?? isDeviceIdentityEnabledCached(),
          nameToolOnPermissionAllow: config.nameToolOnPermissionAllow ?? isDeviceIdentityEnabledCached(),
          rearmRedeliveredPermissionRequests:
            config.rearmRedeliveredPermissionRequests ?? isDeviceIdentityEnabledCached(),
          ignoreErrorShapedDialogReplies:
            config.ignoreErrorShapedDialogReplies ?? isDeviceIdentityEnabledCached(),
          nameRepositoryTrustAnswers: config.nameRepositoryTrustAnswers ?? dce(),
          pinComputerFolderAllow: isServedCallWatchEnabled,
        };
      Ur.current = md;
      let sg = new Set(),
        zi = new RemoteSessionManager(vp, {
          onMessage: (request, requestId) => {
            if (((sa = !0), !capFrameDepth(request))) return;
            let ia = [`type=${request.type}`];
            if ("subtype" in request) ia.push(`subtype=${request.subtype}`);
            if (request.type === "user") {
              let Aa = request.message?.content;
              ia.push(`content=${Array.isArray(Aa) ? Aa.map((rl) => rl.type).join(",") : typeof Aa}`);
            }
            if (
              (logForDebugging(`[useRemoteSession] Received ${ia.join(" ")}`),
              Ti(),
              requestId?.replayed === !1 && request.type !== "rate_limit_event")
            )
              rg();
            let vl = Yo.current || bn.current || Go.current > 0,
              hl = hn.current,
              dd = { sent: hl > 0, taskWake: Xo.current },
              Ra = requestId?.replayed === !0 && requestId.resumed !== !0,
              Dl = isModelRefusalFallback_2(request);
            if (Dl)
              evictRefusalRetraction({
                index: retraction,
                signal: Dl,
                surface: "ccr",
                setMessages: setMessages,
                setInProgressToolUseIDs: setInProgressToolUseIDs,
              });
            if ((pr(), request.type === "env_manager_log")) {
              let now = Date.now(),
                rl = Ir.current !== null && Ir.current.hasStructuredSteps && !Ir.current.terminal;
              if (_r.current && !rl && isStaleTimestamp(request, now)) return;
              let Cl = convertSDKMessage(request),
                _a = Ir.current ?? createSetupProgress(now, { wake: Boolean(config.isAttachToExisting) }),
                Jl = applySetupEvent(_a, request, Cl.type === "env_log" ? Cl.message : "", now, Pr.current);
              if (!Yo.current && Cl.type === "env_log" && Cl.message !== "") {
                if (!_r.current) setConnStatus(!0);
                Oi(Cl.message, "provisioning", currentSetupLabel(Jl));
              }
              if (Jl !== Ir.current) {
                if (_a.terminal && !Jl.terminal && Jl.dismissed && !ts.current)
                  ((ts.current = !0), logEvent("tengu_remote_bootstrap_cycle_hidden", {}));
                if (
                  (zr(Jl),
                  Jl.steps.some((step) => step.status === "failed") &&
                    !_a.steps.some((step) => step.status === "failed"))
                )
                  Ls(Jl.dismissed);
                if (Jl.terminal) ((ts.current = !1), es(), Xs());
              }
              return;
            }
            let Gu = Ir.current,
              syntheticMessage = classifySetupFrame(Gu, request);
            if (syntheticMessage === "failed" && Gu !== null) {
              let Aa = markCurrentStepFailed(Gu, Date.now());
              if (Aa !== Gu) (zr(Aa), Ls(!1));
              else if (!Gu.steps.some((queue) => queue.status === "failed")) syntheticMessage = null;
            }
            if (syntheticMessage !== "notice") es();
            if (request.type !== "user" && syntheticMessage === null) Xs();
            if (
              !Yo.current &&
              (request.type === "assistant" ||
                request.type === "stream_event" ||
                (request.type === "system" &&
                  request.subtype === "status" &&
                  request.status === "requesting"))
            )
              (setConnStatus(!0), md?.onTurnInFlight());
            if (request.type === "tool_progress") {
              if (
                (md?.onTurnInFlight(), request.heartbeat === !0 && requestId?.replayed !== !0 && !Yo.current)
              )
                setConnStatus(!0);
            }
            if (request.type === "user" && request.uuid && za.has(request.uuid)) {
              let uuid = request.uuid;
              if (uuid === config.initialPromptUuid) {
                let Cl = convertSDKMessage(request, { convertUserTextMessages: !0 });
                setMessages((item) =>
                  Cl.type !== "message" || item.some((queue) => queue.uuid === uuid)
                    ? item
                    : [...item, Cl.message],
                );
                return;
              }
              let rl = managerRef.current.delete(uuid);
              (setMessages((item) => {
                let lastIndex = item.findLastIndex((queue) => queue.uuid === uuid);
                if (lastIndex === -1) {
                  if (!rl) return item;
                  let Cu = convertSDKMessage(request, { convertUserTextMessages: !0 });
                  return Cu.type === "message" ? [...item, Cu.message] : item;
                }
                if (lastIndex === item.length - 1) return item;
                let Jl = item[lastIndex];
                return item.slice(0, lastIndex).concat(item.slice(lastIndex + 1), Jl);
              }),
                logForDebugging(
                  `[useRemoteSession] Reconciled echoed user message ${uuid} to canonical position`,
                ));
              return;
            }
            if (request.type === "system" && request.subtype === "init") {
              let Aa = parseInitFrame(request);
              if (
                (logForDebugging(
                  `[useRemoteSession] Init received with ${Aa.slashCommands?.length ?? "no"} slash commands`,
                ),
                XD !== null)
              ) {
                if (XD.hasReplyChannelInit({ mcp_servers: Aa.mcpServers, tools: Aa.tools })) tl();
                else if (!Fn.current || Ya)
                  ((Fn.current = !1),
                    (Ya = !1),
                    on((item) =>
                      item.hasRemoteReplyChannel ? { ...item, hasRemoteReplyChannel: !1 } : item,
                    ));
              }
              if (Aa.cwd && !Rl)
                ((Rl = !0),
                  logEvent("tengu_remote_reported_cwd", {
                    place: fromEnum(pAs(Aa.cwd, getOriginalCwd())),
                    is_following_reports: !KZt(),
                  }));
              if (Aa.cwd) {
                let cwd = Aa.cwd,
                  Cl = ++Wd;
                isAdoptableSessionCwd(cwd, "useRemoteSession")
                  .then((queue) => {
                    if (queue && Cl === Wd && qn.current === zi)
                      if (KZt()) setCloudCwd({ sessionId: config.sessionId, cwd: cwd });
                      else setCwdState_2(cwd);
                  })
                  .catch(() => {});
              }
              (onInit({
                slash_commands: Aa.slashCommands,
                model: Aa.model,
                skills: Aa.skills,
                plugins: Aa.plugins,
                tools: Aa.tools,
              }),
                isSystemInitMessage(Fr.current, request),
                Un.current++,
                writeTaskCount(),
                md?.onWorkerInit(),
                od?.requestAnnounce("worker_init", { workerEpoch: Aa.workerEpoch }));
            }
            if (request.type === "result") {
              (md?.onTurnEnded(),
                kn.forEach((requestId, toolUseId) => {
                  (or.requestClosed(toolUseId), as.add(requestId));
                }));
              let repositoryTrust = config.repositoryTrust;
              if (repositoryTrust !== void 0) {
                let rl = hasUpdatedTitleRef.current;
                hasUpdatedTitleRef.current = !1;
                let Cl = repositoryTrust.current();
                if (rl) repositoryTrust.refresh({ force: !0 });
                else if (Cl !== "trusted" && Cl !== "no_repository") repositoryTrust.refresh();
              }
            }
            if (request.type === "system" && "permissionMode" in request && request.permissionMode) {
              if (((ns = parsePermissionMode(request.permissionMode) ?? ns), ns !== void 0)) Fg.add(ns);
              (Mi(request.permissionMode), onPermissionModeChange(request.permissionMode));
            }
            if (
              ((request.type === "system" && request.subtype === "init") || request.type === "result") &&
              request.fast_mode_state !== void 0
            ) {
              let fast_mode_state = request.fast_mode_state;
              if (fast_mode_state !== "on" && fast_mode_state !== "cooldown" && fast_mode_state !== "off")
                logForDebugging("[useRemoteSession] Ignoring fast_mode_state that is not on/cooldown/off", {
                  level: "error",
                });
              else if (
                fast_mode_state === "off" &&
                request.fast_mode_disabled_reason === "model_not_allowed"
              );
              else {
                let rl = fast_mode_state !== "off",
                  Cl = !1;
                if (
                  (on((_a) => {
                    if (!!_a.fastMode === rl) return _a;
                    return ((Cl = !0), { ..._a, fastMode: rl });
                  }),
                  Cl)
                )
                  logEvent("tengu_fast_mode_toggled", {
                    enabled: rl,
                    source: lit_2("remote_wire_adopt"),
                    remote: !0,
                  });
              }
            }
            if (request.type === "active_goal") {
              let Aa = parseGoalState(request.value);
              (on((rl) => (rl.activeGoal === Aa ? rl : { ...rl, activeGoal: Aa })),
                logEvent("tengu_remote_active_goal_adopted", {
                  via: lit_2("stream"),
                  active: Aa !== void 0,
                }));
              return;
            }
            if (request.type === "autocompact_state") {
              ((ol = !0), adoptRemoteAutocompactState(on, request.value, lit_2("stream")));
              return;
            }
            if (request.type === "rate_limit_event") {
              let Aa = dropRemoteRateLimitFrame(request.rate_limit_info);
              if (Aa === void 0)
                logForDebugging("[useRemoteSession] Dropping rate_limit_event with invalid rate_limit_info", {
                  level: "warn",
                });
              else if (requestId?.replayed === !0) (ga.hold(Aa), Ti());
              else (ga.push(Aa), (du = "replay"));
              return;
            }
            if (request.type === "system") {
              let Aa = sessionMetadataArtifacts(request);
              if (Aa !== void 0) {
                ((_d = !0), ed(Aa, "stream"));
                return;
              }
              if (request.subtype === "plugin_install") Gn.current?.pluginInstallFrame();
              let { backgroundTaskEnded: backgroundTaskEnded, isTaskLifecycleFrame: isTaskLifecycleFrame } =
                trackThinClientFrame(
                  {
                    running: runningTaskIdsRef.current,
                    awaitingFinish: isCompactingRef.current,
                    foreground: Fr.current,
                  },
                  request,
                );
              if (
                (applyRemoteTaskEvent(Wn.current, request, Date.now()),
                backgroundTaskEnded &&
                  request.subtype === "task_notification" &&
                  !Ra &&
                  (request.status !== "stopped" || request.reason === "worker_restart"))
              )
                Xo.current = !0;
              if (isTaskLifecycleFrame) {
                writeTaskCount();
                return;
              }
              if (request.subtype === "notification") {
                if (SLr(request)) {
                  let _a = normalizeSdkNotification(request, "remote"),
                    Jl = pickRemoteNotificationToEvict(_o.getState().notifications, _a.key);
                  if (Jl !== null) removeNotification(Jl);
                  (addNotification(_a),
                    logEvent("tengu_remote_notification_routed", {
                      via: lit_2("stream"),
                      priority: fromEnum(request.priority),
                    }));
                } else logForDebugging("[useRemoteSession] Dropping malformed notification frame");
                return;
              }
              if (request.subtype === "status") {
                let _a = ws.current;
                if (((ws.current = request.status === "compacting"), _a && ws.current)) return;
              }
              if (request.subtype === "compact_boundary") ws.current = !1;
            }
            if (Skr(request)) {
              (isSystemInitMessage(Fr.current, request), Un.current++, writeTaskCount());
              let Aa = !Ra && gAs(request, za, dd);
              if (!vl && !Ra) ((hn.current = Math.max(0, hn.current - hl)), (Xo.current = !1));
              if (((ws.current = !1), (Yo.current = !1), (bn.current = !1), vl)) {
                if (Go.current > 0) Go.current--;
              } else if (Aa) onTurnComplete?.(request);
              else if (
                (logForDebugging(
                  "[useRemoteSession] Result not counted as this client's turn; idle notification not re-armed",
                ),
                !Ra)
              )
                onOtherTurnComplete?.(requestId?.ageMs ?? 0);
              (setConnStatus(!1), Sn(), streaming.resetMetrics());
            }
            if (request.type === "user") {
              let Aa = request.message?.content;
              if (Array.isArray(Aa)) {
                let rl = [];
                for (let Cl of Aa) if (Cl.type === "tool_result") rl.push(Cl.tool_use_id);
                if (rl.length > 0) {
                  (setInProgressToolUseIDs({ action: "remove", ids: rl }),
                    M0n(retraction, rl),
                    countOrphanToolResults(
                      retraction,
                      rl,
                      "ccr",
                      typeof request.uuid === "string" ? request.uuid : null,
                    ));
                  let filtered = rl.filter((queue) => Fr.current.has(queue));
                  if (zi.workerMovesBash() && filtered.length > 0)
                    (filtered.forEach((item) => Fr.current.delete(item)), writeTaskCount());
                }
              }
            }
            if (XD !== null && request.type === "assistant" && !request.parent_tool_use_id)
              for (let Aa of request.message.content) {
                let replyChannelBlockKind = XD.replyChannelBlockKind(Aa);
                if (replyChannelBlockKind === void 0) continue;
                if (Aa.type === "tool_use") {
                  if (next.has(Aa.id)) {
                    tl();
                    continue;
                  }
                  next.add(Aa.id);
                }
                (tl(),
                  logEvent("tengu_remote_reply_channel_frame", { kind: fromEnum(replyChannelBlockKind) }));
              }
            let qh = null;
            if (qh !== null) {
              if (typeof request.uuid === "string" && dropLateRetracted(retraction, request.uuid, "ccr"))
                return;
              if (qh.length > 0) {
                if (typeof request.uuid === "string")
                  Ekr(
                    retraction,
                    request.uuid,
                    qh.map((prev) => prev.uuid),
                  );
                let parentToolUseID = qh[0].parentToolUseID;
                if (!$a.has(parentToolUseID))
                  ($a.add(parentToolUseID),
                    logEvent("tengu_remote_subagent_frame_nested", { frame_type: fromEnum(request.type) }));
                setMessages((prev) => {
                  let filtered = qh.filter((error) => !prev.some((Jl) => Jl.uuid === error.uuid));
                  return filtered.length === 0 ? prev : [...prev, ...filtered];
                });
              }
              return;
            }
            let sendMessage = convertSDKMessage(request, { convertUserTextMessages: !0 });
            if (sendMessage.type === "conversation_reset") {
              let { ownClear: ownClear, preserved: preserved } = Er.onResetFrame();
              (landWaitingLines(),
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
                }),
                streaming.setStreamingToolUses((Cl) => (Cl.length > 0 ? [] : Cl)),
                streaming.applyStreamingText(() => null),
                setInProgressToolUseIDs({ action: "clear" }),
                retraction.inProgressToolUses.clear(),
                setConnStatus(!1),
                onConversationReset?.(sendMessage.newConversationId));
              return;
            }
            if (sendMessage.type === "message") {
              if (sendMessage.message.type === "assistant") {
                let _a = new Set(
                  sendMessage.message.message.content
                    .filter((Jl) => Jl.type === "tool_use")
                    .map((Jl) => Jl.id),
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
                  if (
                    (setInProgressToolUseIDs({ action: "add", ids: mapped }),
                    vkr(retraction, sendMessage.message.uuid, mapped),
                    zi.workerMovesBash())
                  ) {
                    let Jl = Un.current;
                    getForegroundBashToolUseIds(request).forEach((Cu) =>
                      $n.setTimeout(() => {
                        if (qn.current === zi && Un.current === Jl && retraction.inProgressToolUses.has(Cu))
                          (Fr.current.add(Cu), writeTaskCount());
                      }, YAs),
                    );
                  }
                }
              }
              if (!xl && request.type === "user") {
                let _a = request.message?.content;
                if (Array.isArray(_a) && _a.some((Jl) => Jl.type === "tool_result"))
                  ((xl = !0),
                    logEvent("tengu_remote_tool_result_rendered", {
                      viewer_only: fromEnum(config.viewerOnly ? "true" : "false"),
                    }));
              }
              let uuid = sendMessage.message.uuid,
                rl =
                  Si === void 0 ? sendMessage.message : Si(sendMessage.message, request, requestId?.source),
                Cl = na === void 0 ? rl : na(rl, request, requestId?.source);
              if (
                isHumanTurn_2(Cl) &&
                rl === sendMessage.message &&
                requestId?.source?.startsWith("client") === !0 &&
                requestId.replayed !== !0 &&
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
                replInputAccumulator: wp,
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
              if (!hl) setConnStatus(!1);
              return;
            }
            if (Vd.dispatch({ type: "control_request", request_id: Fi, request: Br }, !1)) {
              if (!qa(Br)) or.requestOpened(Fi);
              if (!hl) setConnStatus(!1);
            }
          },
          onPermissionCancelled: (content, opts) => {
            if (
              (logForDebugging(`[useRemoteSession] Permission request cancelled: ${content}`),
              or.requestClosed(content),
              Vd.cancel(content),
              !kn.delete(content) && !Yo.current)
            )
              setConnStatus(!0);
          },
          onUserDialogRequest: (Br, Fi) => {
            if (
              (logForDebugging(`[useRemoteSession] User dialog request: ${Br.dialog_kind}`),
              setConnStatus(!1),
              config.viewerOnly)
            )
              return;
            Ka.dispatch({ type: "control_request", request_id: Fi, request: Br });
          },
          onUserDialogCancelled: (Br) => {
            (logForDebugging(`[useRemoteSession] User dialog request cancelled: ${Br}`), Ka.cancel(Br));
          },
          ...(md !== null && md.callbacks),
          ...(od !== null && od.callbacks),
          onWorkerLive: () => {
            ((sa = !0),
              od?.requestAnnounce(Pi ? "reconnected" : "attached"),
              od?.callbacks.onWorkerLive?.(),
              (Pi = !0),
              ua());
          },
          onWorkerConnectionStatus: (Br) => {
            if (qn.current !== zi) return;
            let Fi = Br === "disconnected";
            if (Fi && !sa) {
              if (runningTaskIdsRef.current.size > 0)
                (logEvent("tengu_remote_background_tasks_dropped", { count: runningTaskIdsRef.current.size }),
                  runningTaskIdsRef.current.clear());
              (Fr.current.clear(), markTasksUnlisted(Wn.current), writeTaskCount());
            }
            sa = !0;
            let ia = !1;
            on(
              (hl) => (
                (ia = hl.remoteWorkerReportedGone !== Fi),
                ia ? { ...hl, remoteWorkerReportedGone: Fi } : hl
              ),
            );
            let size = runningTaskIdsRef.current.size;
            if (ia && size > 0)
              logEvent("tengu_remote_background_tasks_worker_report_changed", {
                worker_reported_gone: Fi,
                count: size,
              });
            if (Fi && getIsLoading() && _r.current) La();
          },
          onConnected: () => {
            if (
              (logForDebugging("[useRemoteSession] Connected"),
              mr("connected"),
              md?.onStreamConnected(),
              Hh(),
              landWaitingLines(),
              fa && runningTaskIdsRef.current.size > 0)
            )
              logEvent("tengu_remote_background_tasks_listed_at_reconnect", {
                count: runningTaskIdsRef.current.size,
              });
            fa = !0;
          },
          onLineTaken: lineTaken,
          onReconnecting: () => {
            (logForDebugging("[useRemoteSession] Reconnecting"),
              mr("reconnecting"),
              landWaitingLines(),
              (Yo.current = !1),
              (bn.current = !1),
              (Go.current = 0),
              setInProgressToolUseIDs({ action: "clear" }),
              retraction.inProgressToolUses.clear());
          },
          onWithheldPromptSent: () => {
            (gs(), Gn.current?.messageSent());
          },
          onWithholdableHeldChanged: (Br) => {
            if (qn.current === zi) ls(Br && !config.viewerOnly && isDeviceIdentityEnabledCached());
          },
          onWithheldPromptFailed: (Br, Fi) => {
            (gs(), (Mn.current = config.initialPromptUuid));
            let ia = config.withheldInitialPrompt?.content;
            if (typeof ia === "string") ySe(ia, storageV5, { armUndo: !1 });
            if (
              (setMessages((vl) => [
                ...vl,
                Br === CANCELLED
                  ? createSystemMessage(
                      "You took your first message back. It wasn't sent to the cloud session.",
                      "notice",
                    )
                  : createSystemMessage(
                      Fi
                        ? `Your first message may not have reached the cloud session${ZQ(Br)}. If Claude doesn't respond to it soon, send it again.`
                        : `Couldn't send your first message${ZQ(Br)}.`,
                      "warning",
                    ),
              ]),
              responseTimeoutRef.current === 0)
            ) {
              if ((setConnStatus(!1), !Fi)) hn.current = 0;
            }
          },
          onResponseUndelivered: (Br, Fi, ia) => {
            if (sg.has(Fi)) return;
            if (sg.size === 0) queueMicrotask(() => sg.clear());
            (sg.add(Fi),
              setMessages((vl) => [
                ...vl,
                createSystemMessage(formatUndeliveredAnswerNotice(Fi, ia), "warning"),
              ]));
          },
          onCatchUpTruncated: () => {
            (logForDebugging("[useRemoteSession] Catch-up truncated \u2014 transcript gap"),
              Er.forget(),
              setMessages((ia) => [
                ...ia,
                createSystemMessage(
                  "Some earlier messages from this session could not be loaded after reconnecting.",
                  "warning",
                ),
              ]),
              (ol = !0),
              on((ia) =>
                ia.remoteAutocompactState === void 0 ? ia : { ...ia, remoteAutocompactState: void 0 },
              ),
              runningTaskIdsRef.current.clear(),
              markTasksUnlisted(Wn.current),
              writeTaskCount(),
              ga.flush());
            let { status: status, isUsingOverage: isUsingOverage } = getCurrentLimits();
            if (status === "rejected" && !isUsingOverage) ga.adopt([currentLimits], "truncation");
            if (Gs) ma = !0;
            else {
              Gs = !0;
              let sessionId = config.sessionId;
              (async () => {
                try {
                  do {
                    ma = !1;
                    try {
                      if ((await vl()) === "stale") return;
                    } catch {}
                  } while (ma);
                } finally {
                  Gs = !1;
                }
              })();
              async function vl() {
                let hl = await getSessionRequestConfig(sessionId, credentials);
                if (qn.current !== zi) return "stale";
                let dd = await fetchLatestEvents(hl, void 0, { reportFeatureHealth: !1 }),
                  Ra = 0,
                  Dl = 0;
                while (dd && Dl < AUe) {
                  if (qn.current !== zi) return "stale";
                  (Dl++,
                    (Ra += checkRefusalRetractionSource({
                      index: retraction,
                      events: dd.events,
                      surface: "truncation_harvest",
                      setMessages: setMessages,
                      setInProgressToolUseIDs: setInProgressToolUseIDs,
                    })),
                    (dd =
                      Dl < AUe && dd.hasMore && dd.firstId ? await fetchOlderEvents(hl, dd.firstId) : null));
                }
                if (qn.current !== zi) return "stale";
                return (
                  logEvent("tengu_refusal_retraction_truncation_harvest", {
                    signal_count: Ra,
                    page_count: Dl,
                  }),
                  "done"
                );
              }
            }
          },
          onDisconnected: (Br) => {
            if (
              (logForDebugging("[useRemoteSession] Disconnected"),
              Br === "session_stale_relogin" ||
                (Br === "untrusted_device" &&
                  isDeviceIdentityEnabledCached() &&
                  isTrustedDeviceGateEnabled()))
            )
              setMessages((Fi) => [
                ...Fi,
                createSystemMessage(describeCredentialFailure({ terminal: !0, reason: Br }), "warning"),
              ]);
            (mr("disconnected"), Hs());
          },
          onError: (Br) => {
            logForDebugging(`[useRemoteSession] Error: ${Br.message}`);
          },
        }),
        rd = Boolean(config.isAttachToExisting) && !config.viewerOnly,
        Qd =
          !config.isAttachToExisting &&
          !config.viewerOnly &&
          config.withheldInitialPrompt?.followsPermissionMode === !0,
        zd =
          !config.isAttachToExisting && !config.viewerOnly && (isDeviceIdentityEnabledCached() || Qd)
            ? config.createPermissionMode
            : void 0,
        sessionId = config.sessionId,
        mode = _o.getState().toolPermissionContext.mode,
        Yc = (config.launchModePush ??= { mode: mode, pushed: !1 }),
        tc = !1,
        Cp = () => Hd.current === Rp && Vl.current === manager,
        manager = Vl.current,
        Rp = Hd.current;
      function Fh(Br) {
        Ss.current = Br;
        let Fi = () => {
          if (Ss.current === Br) Ss.current = null;
        };
        Br.then(Fi, Fi);
      }
      function cy() {
        if (zd !== void 0) {
          if (zd.pushed) {
            logForDebugging("[useRemoteSession] Create permission mode already pushed for this session");
            return;
          }
          zd.pushed = !0;
          let { mode: mode } = zd,
            hl = syncRemotePermissionMode({
              manager: zi,
              mode: mode,
              surface: "terminal",
              sessionId: sessionId,
              onTaken: noteOwnPermissionModePush(mode),
              superseded: () => qn.current !== zi || Hd.current !== Rp,
              observedMode: () => ns,
              seededModeReported: () => Fg.has(mode),
              linkDown: () => _o.getState().remoteConnectionStatus !== "connected",
              onRefused: (dd) => {
                if (
                  (noteOwnPermissionModePush("default"),
                  (zd.convergeEntry = beginModeLanding(on, sessionId, "default", mode)),
                  dd.then((Ra) => {
                    if (Ra.outcome === "accepted" && zd.convergeEntry !== void 0)
                      clearOutstandingMode(on, sessionId, zd.convergeEntry);
                  }),
                  Fh(dd),
                  _o.getState().toolPermissionContext.mode === mode)
                )
                  onPermissionModeChange("default", "client");
                addNotification(notifyRemoteModeRejected(mode));
              },
              onGaveUp: (dd) => {
                if (((zd.notTakenTold = !0), zd.convergeEntry !== void 0))
                  clearOutstandingMode(on, sessionId, zd.convergeEntry);
                addNotification({
                  key: "remote-create-mode-unrecorded",
                  kind: "feedback",
                  text: dd,
                  color: "warning",
                  priority: "immediate",
                });
              },
            });
          ((zd.posted = hl), Fh(hl));
          return;
        }
        let Br = isDeviceIdentityEnabledCached(),
          Fi = Br ? Yc.mode : mode;
        if (!rd || Fi !== "plan" || (Br && Yc.pushed)) return;
        ((Yc.pushed = !0), (tc = !0));
        let ia = noteOwnPermissionModePush(Fi);
        zi.sendControlRequest({ subtype: "set_permission_mode", mode: Fi }).then(
          () => {
            ((tc = !1),
              ia(),
              logForDebugging(`[useRemoteSession] Applied launch permission mode: ${Fi}`),
              logFeatureOk("mode_switch"));
          },
          (vl) => {
            tc = !1;
            let hl = classifyControlRequestError(vl);
            (logForDebugging(
              `[useRemoteSession] Launch set_permission_mode rejected (${hl}): ${errorMessage(vl)}`,
            ),
              logFeatureBad("mode_switch", hl));
            let dd =
              (hl === "disconnected" || hl === "not_connected") &&
              _o.getState().remoteConnectionStatus !== "connected";
            if (
              qn.current !== zi ||
              dd ||
              hl === "aborted" ||
              Vl.current !== manager ||
              (isDeviceIdentityEnabledCached() && Hd.current !== Rp)
            ) {
              if (qn.current === zi && (dd || hl === "aborted") && Cp()) Yc.pushed = !1;
              return;
            }
            if (_o.getState().toolPermissionContext.mode === Fi) onPermissionModeChange("default", "client");
            if ((addNotification(notifyRemoteModeRejected(Fi)), isDeviceIdentityEnabledCached())) {
              let Ra = Hd.current,
                Dl = beginModeLanding(on, sessionId, "default", Fi),
                Gu = () => clearOutstandingMode(on, sessionId, Dl);
              sendModeWithRetry({
                mode: "default",
                send: (zp) => (
                  noteOwnPermissionModePush(zp),
                  zi.sendControlRequest({ subtype: "set_permission_mode", mode: zp })
                ),
                superseded: () => qn.current !== zi || Hd.current !== Ra,
                onTaken: Gu,
                onGaveUp: () => {
                  (Gu(), addNotification(notifyRemoteModeUnsynced()));
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
      let Nd = isDeviceIdentityEnabledCached(),
        Af = Nd ? Yc.mode : mode,
        Du =
          rd &&
          !(Nd && Yc.judged) &&
          Af !== "default" &&
          Af !== "plan" &&
          isExternalPermissionMode(Af) &&
          !(Af === "auto" && Nd && isAutoModeFromFallback()),
        Va = null,
        Fg = new Set(),
        ns,
        ba = null;
      function Mi(Br) {
        if (!Du) return;
        if (!EXTERNAL_PERMISSION_MODES.includes(Br)) return;
        ((Va = Br), Ti());
      }
      function Ti() {
        if (!(Du && Va !== null) && !ga.hasHeld()) return;
        (ba?.(), (ba = $n.setTimeout(Qa, p0t)));
      }
      function Qa() {
        if (((ba = null), qn.current !== zi)) return;
        if ((rg(), Du && Va !== null)) Gp();
      }
      function Gp() {
        if (!Du || qn.current !== zi) return;
        ((Du = !1), (Yc.judged = !0));
        let Br =
          Nd &&
          Va !== null &&
          (() => {
            let Fi = _o.getState().remoteModeSessions[sessionId]?.label;
            return Fi?.mode === Va && Fi.origin === "person";
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
      let seedPermissionMode = config.seedPermissionMode,
        Dc = config.adoptSeedPermissionMode === !0,
        Bh = seedPermissionMode === void 0;
      function Hh() {
        if (Bh || qn.current !== zi) return;
        if (((Bh = !0), seedPermissionMode === void 0 || !(Dc || isDeviceIdentityEnabledCached()))) return;
        try {
          let mode = _o.getState().toolPermissionContext.mode;
          (onPermissionModeChange(seedPermissionMode),
            logEvent("tengu_remote_permission_mode_adopted", {
              via: lit_2("seed"),
              mode: fromEnum(seedPermissionMode),
              applied:
                mode !== seedPermissionMode &&
                _o.getState().toolPermissionContext.mode === seedPermissionMode,
            }));
        } catch (error) {
          logForDebugging(`[useRemoteSession] Seeded permission mode not adopted: ${errorMessage(error)}`, {
            level: "warn",
          });
        }
      }
      if (((qn.current = zi), !_r.current)) zi.beginWorkerStart();
      if (((Yd = zi), md !== null))
        zi.addSendGate((Br) => Promise.race([md.beforeSend(), Br.released, Br.withdrawn, Br.decided]), {
          onRelease: "send",
        });
      (zi.connect(), cy());
      let ES = Qd ? zd?.posted : void 0;
      if (zd !== void 0 && ES !== void 0) {
        let Br = () => {};
        ((Br = zi.addSendGate(
          retirePostedMode({ posted: ES, mode: zd.mode, latch: zd, retire: () => Br() }),
          { onRelease: "withhold", onExit: "await" },
        )),
          ES.then(
            (Fi) => Fi.outcome === "accepted",
            () => !1,
          ).then((Fi) => {
            if (Fi || zd.notTakenTold || qn.current !== zi || Hd.current !== Rp) return;
            ((zd.notTakenTold = !0),
              addNotification({
                key: "remote-create-mode-unrecorded",
                kind: "feedback",
                text: kmo,
                color: "warning",
                priority: "immediate",
              }));
          }));
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
                memory: kpt.of(host),
                storageV5: storageV5,
                reach: createDeviceHookDecider({
                  launchDir: getOriginalCwd(),
                  syncRoot: Pl,
                  syncElsewhere: config.isAttachToExisting
                    ? (config.sessionRecordMayBeElsewhere ?? "unknown")
                    : !1,
                  memory: xNn.of(host).reachFor(getOriginalCwd()),
                }),
                say: ({ line: line, level: level }) => {
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
        (logError(error), (Zr.current = "attach_failed"));
      }
      ((Gn.current = vu), ps());
      let dm = config.repositoryTrust?.onChanged(() => {
        if (qn.current === zi) ps();
      });
      if (
        (config.homeSeed?.completion.then(() => {
          if (qn.current === zi) ps();
        }),
        config.homeSeed?.readBack.then((Br) => {
          if (qn.current === zi) ((Hi.current = Br), ps());
        }),
        config.isAttachToExisting)
      )
        vu?.workerKnownUp();
      else if (config.initialPromptUuid !== void 0 && config.withheldInitialPrompt === void 0)
        vu?.messageSent();
      let Uc = config.dirSync?.sync.sendGate?.bind(config.dirSync.sync);
      if (Uc !== void 0) zi.addSendGate((Br) => Uc(Br), { onRelease: "withhold" });
      let uy = void 0,
        Wh = null,
        my = !1,
        jh = !1,
        Jb = void 0,
        Im = void 0,
        Hg = null,
        Zb = (Br) => (Br === 1 ? "Your last message" : `Your last ${Br} messages`),
        Dd = (Br) => {
          try {
            writeSync_2(2, Br);
          } catch {}
        },
        p_ = ({ unsent: unsent, refused: refused, unconfirmed: unconfirmed }) => {
          if (unsent > 0 && Wh?.tellsOfUnsent !== !0)
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
        },
        Mf = { unsent: 0, refused: [], unconfirmed: 0 },
        Zd = null,
        ig = () =>
          (Zd ?? Promise.resolve())
            .then(() => zi.releaseHeldSends(Zd === null ? void 0 : 100, { exiting: !0, final: !0 }))
            .then((Br) =>
              p_({
                unsent: Mf.unsent + Br.unsent,
                refused: [...Mf.refused, ...Br.refused],
                unconfirmed: Mf.unconfirmed + Br.unconfirmed,
              }),
            ),
        fy = registerCleanup(ig),
        Fx = () => {
          fy();
          let releaseHeldSends = zi.releaseHeldSends(void 0, { exiting: !0, final: isShuttingDown() });
          Zd = releaseHeldSends.catch(() => {});
          let Fi = registerCleanup(ig);
          releaseHeldSends.then((ia) => {
            if (
              ((Mf = ia),
              ia.unsent === 0 && ia.refused.length === 0 && ia.unconfirmed === 0 && ia.stillHeld === 0)
            )
              Fi();
          }, Fi);
        },
        Wk = startClientPresencePulse(
          config.sessionId,
          getOauthConfig().BASE_API_URL,
          async () => ({
            Authorization: `Bearer ${await fae(config, { credentials: credentials, storageV5: storageV5 })}`,
          }),
          (Br, Fi) => {
            if (Fi === "resend") return Promise.resolve(!1);
            let Authorization = Br.Authorization,
              vl = Authorization?.startsWith("Bearer ") ? Authorization.slice(7) : "";
            return config.onAuth401?.(vl) ?? Promise.resolve(!1);
          },
        ),
        Qp = () => {
          (Vd.drain(), kn.clear(), Ka.drain());
        };
      return (
        config.storedSessionArtifacts?.then((Br) => {
          if (qn.current === zi && !_d && Array.isArray(Br)) ed(Br, "stored");
        }),
        config.storedAutocompactState?.then((Br) => {
          let Fi = SDKAutocompactStateMessageSchema().shape.value.safeParse(Br).data;
          if (qn.current === zi && !ol && Fi !== void 0) adoptRemoteAutocompactState(on, Fi, lit_2("seed"));
        }),
        config.preflightCheck?.catch((Br) => {
          if (qn.current !== zi) return;
          (setMessages((Fi) => [...Fi, createSystemMessage(errorMessage(Br), "warning")]),
            Qp(),
            vu?.teardown(),
            (Gn.current = null),
            md?.dispose(),
            (Ur.current = null),
            (Ro.current = void 0),
            od?.close(),
            Ad?.dispose(),
            Wk.teardown(),
            zi.disconnect(),
            (qn.current = null),
            Ms(),
            mr("disconnected"),
            Hs());
        }),
        () => {
          (logForDebugging("[useRemoteSession] Cleanup - disconnecting"), Qp());
          let { count: count, settled: settled } = zi.sendsInFlight();
          if (count > 0) {
            let ia = registerCleanup(() => {
              let startTime = performance.now();
              return (
                logEvent("tengu_remote_exit_sends_awaited", { count: count }),
                settled.then(() =>
                  logEvent("tengu_remote_exit_sends_settled", {
                    settled_after_ms: Math.round(performance.now() - startTime),
                  }),
                )
              );
            });
            settled.finally(ia);
          }
          if (
            (ur(),
            (Du = !1),
            ba?.(),
            (ba = null),
            Wk.teardown(),
            markSessionRead(config.sessionId),
            ds(),
            vu?.teardown(),
            (Gn.current = null),
            dm?.(),
            ga.dispose(),
            Fx(),
            uy?.(),
            Im?.(),
            Hg?.abort(),
            md?.dispose(),
            (Ur.current = null),
            (Ro.current = void 0),
            od?.close(),
            Ad?.dispose(),
            tc && Cp())
          )
            Yc.pushed = !1;
          (zi.disconnect(), (qn.current = null), Ms());
        }
      );
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
      $n,
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
      cn,
      on,
      _o,
      addNotification,
      removeNotification,
      ps,
      Ms,
      ls,
      retraction,
    ]));
  let Gl = ce(
      (ss) => {
        if (
          Ws.current ||
          !config ||
          config.initialPromptUuid ||
          config.hasExplicitTitle ||
          config.viewerOnly ||
          config.isAttachToExisting ||
          _o.getState().remoteSessionName !== void 0
        )
          return;
        Ws.current = !0;
        let sessionId = config.sessionId,
          ma = typeof ss === "string" ? ss : extractTextContent_2(ss, " ");
        if (ma)
          checkSessionTitlePolicyTaint(ma, new AbortController().signal, credentials).then((title) => {
            if (_o.getState().remoteSessionName !== void 0) return;
            updateSessionTitle(sessionId, title.title);
          });
      },
      [config, credentials, _o],
    ),
    gd = ce(
      async (ss, Gs, ma) => {
        let $a = qn.current;
        if (!$a) return (logForDebugging("[useRemoteSession] Cannot send - no manager"), !1);
        pr();
        let xl = Qn.current,
          Si = Yo.current;
        ((Yo.current = !1), setConnStatus(!0));
        let na = Ir.current;
        if (na !== null && !na.terminal && !na.dismissed && na.steps.some((step) => step.status === "failed"))
          wr({ ...na, dismissed: !0 });
        if (Gs?.uuid) za.add(Gs.uuid);
        (hn.current++, Er.noteSend(Gs), Gn.current?.messageSent());
        let js = void 0;
        if (js !== void 0) js.inFlight++;
        let Ya;
        try {
          Ya = await (ma === void 0 ? $a.sendMessage(ss, Gs) : $a.sendMessage(ss, Gs, ma));
        } finally {
          if (js !== void 0) js.inFlight--;
        }
        if ((gs(), !Ya.ok)) {
          if (
            ((Yo.current = Yo.current || (Si && bn.current)),
            (hn.current = Math.max(0, hn.current - 1)),
            Er.noteSendFailed(Gs),
            landWaitingLines(),
            setMessages((tl) => [
              ...tl,
              Ya.reason === CANCELLED
                ? createSystemMessage(b0t, "notice")
                : createSystemMessage(sendFailedMessage(Ya), "warning"),
            ]),
            setConnStatus(!1),
            Ya.status === 409)
          )
            La();
          return !1;
        }
        if ((ua(), Gl(ss), !config?.viewerOnly && Qn.current === xl)) {
          if (
            !or.watch(
              () => {
                (logForDebugging("[useRemoteSession] Response timeout - attempting reconnect"),
                  landWaitingLines());
                let ol = createSystemMessage(ONn, "warning");
                (setMessages((ed) => [...ed, ol]), $a.reconnect());
              },
              (ol) => $n.setTimeout(ol, responseTimeoutMs(ws.current)),
            )
          )
            setMessages((ol) => [...ol, createSystemMessage(MNn, "notice")]);
        }
        return !0;
      },
      [config, host, setConnStatus, setMessages, landWaitingLines, $n, or, pr, gs, Gl, Er, La, ua],
    ),
    hd = ce(async () => {
      if ($r.current) return;
      $r.current = !0;
      try {
        while (fr.current.length > 0) {
          let ss = fr.current.shift();
          if (ss === void 0) break;
          let Gs = Ir.current;
          if (Gs !== null && Gs.queuedCount !== fr.current.length)
            wr({ ...Gs, queuedCount: fr.current.length });
          await gd(ss.content, ss.opts, ss.submittedAtMs);
        }
      } finally {
        $r.current = !1;
      }
    }, [gd, wr]);
  P(() => {
    Yr.current = () => {
      hd().catch((ss) => logError(ss));
    };
  }, [hd]);
  let bd = ce(() => !config?.viewerOnly && (!_r.current || $r.current || fr.current.length > 0), [config]),
    Od = ce(
      async (ss, Gs) => {
        if (!qn.current) return (logForDebugging("[useRemoteSession] Cannot send - no manager"), !1);
        if (((responseTimeoutRef.current += 1), bd())) {
          if (Gs?.uuid) za.add(Gs.uuid);
          (Er.noteSend(Gs),
            (Yo.current = !1),
            setConnStatus(!0),
            fr.current.push({ content: ss, opts: Gs, submittedAtMs: Date.now() }));
          let $a =
            Ir.current ?? createSetupProgress(Date.now(), { wake: Boolean(config?.isAttachToExisting) });
          return (
            wr({ ...$a, queuedCount: fr.current.length }),
            Gl(ss),
            logForDebugging(
              `[useRemoteSession] Queued message during bootstrap (${fr.current.length} queued)`,
            ),
            !0
          );
        }
        return gd(ss, Gs);
      },
      [bd, setConnStatus, wr, Gl, gd, Er],
    ),
    pc = ce(() => {
      let ss = !config?.viewerOnly && isDeviceIdentityEnabledCached(),
        Gs = ss ? (qn.current?.cancelHeldSends() ?? 0) : 0;
      if (Gs === 0) {
        if (_o.getState().cloudMessageHeld !== void 0)
          logFeatureSad("remote_held_message_cancel", ss ? "nothing_held" : "not_allowed");
        return (ls(!1), !1);
      }
      return (
        logForDebugging(`[useRemoteSession] Esc at idle: took back ${Gs} held message(s), no interrupt`),
        logFeatureOk("remote_held_message_cancel", { count: Gs }),
        !0
      );
    }, [config, _o, ls]),
    Kd = ce(() => {
      if ((qs(), !config?.viewerOnly)) {
        (qn.current?.cancelSession(), is());
        return;
      }
      (ur(), setConnStatus(!1));
    }, [config, setConnStatus, ur, is, qs]),
    ec = ce((setMessages, manager) => {
      let ma = qn.current;
      if (!ma)
        return Promise.reject(
          Error("[useRemoteSession] Cannot send control request (no manager): not connected"),
        );
      let $a = setMessages.subtype === "set_permission_mode" ? Ss.current : null,
        xl =
          $a === null
            ? ma.sendControlRequest(setMessages, manager)
            : $a.then(() => {
                let Si = qn.current;
                if (!Si)
                  throw Error("[useRemoteSession] Cannot send control request (no manager): not connected");
                return Si.sendControlRequest(setMessages, manager);
              });
      if (setMessages.subtype === "set_permission_mode")
        (Hd.current++,
          xl.then(
            () => {
              Vl.current++;
            },
            () => {},
          ));
      return xl;
    }, []),
    qu = ce(
      (ss) => {
        let Gs = qn.current;
        if (!Gs || config?.viewerOnly) return Promise.resolve("failed");
        let workerSendsNow = Gs.workerSendsNow();
        if (bd() || workerSendsNow === !1 || (workerSendsNow === void 0 && !Gs.hasPostedMessage()))
          return Promise.resolve("not_asked");
        return requestSendNow(async (prev) => {
          if ((await Gs.releaseHeldSends(void 0, { keepWithheld: !0 }), qn.current !== Gs))
            throw Error("disconnected before the request was sent");
          return Gs.sendControlRequest(prev);
        }, ss);
      },
      [config, bd],
    ),
    cancelRequest = ce(() => qn.current?.workerSendsNow(), []),
    disconnect = ce(() => qn.current?.serviceTimeMs(), []),
    Iu = config?.viewerOnly ?? !1,
    Am = config?.sessionId,
    Kp = Q(() => {
      return;
    }, [Iu, Am]),
    nl = ce(() => {
      (ur(), qn.current?.disconnect(), (qn.current = null), ls(!1));
    }, [ur, ls]);
  return Q(
    () => ({
      isRemoteMode: isRemoteMode,
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
/**
 * 判断用户主目录设置向云会话转发的状态：功能未开、启动时保留、留在本机、未决定或未发送。
 */
//@ chunk-18hwfzwa.js:308155-308479 sole-consumer
function homeSettingsForwardingStatus(h, x) {
  let D = getHomeSettingsForwardingBlocker(isSettingsToCloudEnabledCached());
  if (D !== null) return D === "flag_off" ? "not_enabled" : D;
  if (!h) return "launch_keeps_them";
  let L = (x ? gbe() : mwt()) ?? "unspecified";
  if (!Rpn() && L !== "keep_local") return "not_sent";
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
function deviceNotBoundNoticeText(h) {
  for (let x of [h.current, ...h.queue]) if (x?.key === REMOTE_DEVICE_NOT_BOUND && "text" in x) return x.text;
  return;
}
//@ chunk-18hwfzwa.js:308579-308654 sole-consumer
var b0t = "You took your message back. It wasn't sent to the cloud session.";
//@ chunk-18hwfzwa.js:308654-308714 sole-consumer
function ZQ(h) {
  return h === "" ? "" : `: ${h.replace(/\.+$/, "")}`;
}
//@ chunk-18hwfzwa.js:308714-308930 sole-consumer
function sendFailedMessage(h) {
  let x = tCs(h);
  return x === void 0
    ? `Couldn't send your message${ZQ(signInNoLongerUsableReason(h) ?? h.reason)}.`
    : `Your message may not have reached the cloud session${ZQ(x)}. If Claude doesn't respond to it soon, send it again.`;
}
//@ chunk-18hwfzwa.js:308930-309142 sole-consumer
function archivedSessionMessage(h) {
  return `This cloud session was archived, so it can't take new messages until it is unarchived at claude.ai. Start a new session to continue, or view this one at ${getRemoteSessionUrl(h, void 0, { from: "cli", m: "0" })}`;
}
//@ chunk-18hwfzwa.js:309142-309213 sole-consumer
async function fae(h, x) {
  if (!isConsoleProfileSessionsCredential()) await checkAndRefreshOAuthTokenIfNeeded(x);
  return h.getAccessToken();
}
//@ chunk-18hwfzwa.js:309213-309217 sole-consumer
j();

export { useRemoteSession };
