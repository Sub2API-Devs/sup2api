/**
 * bridge/remoteBridgeCore.ts
 *
 * env-less（v2）Remote Control 桥核心：创建/复用云会话、取 worker 凭证、建立 v2 传输、处理入站帧与控制请求、出站消息过滤与 FlushGate、断线/401/4091/4093/4094 恢复、归档与拆除
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/remoteBridgeCore.ts
 * pieces: chunk-4cm44bmp.js (14), chunk-kgtpkbhq.js (1)
 * attribution: callgraph-witnessed 1, fingerprint 2, layout 8, callgraph-fingerprint 1, affinity 3
 */
import {
  createRemoteBridgeRedactor,
  y6n,
  _6n,
  sendWithEpochFollowUps,
  DEFAULT_HISTORY_BACKFILL_CONFIG,
  Es,
  isBackfillScopeAllowedForOrigin,
  BoundedIdSet,
  hasUserMessagingToolUse,
  isTaskLifecycleMessage,
  Lo,
  settleRemoteBridgeDelivery,
  isAccountMemoryControlRequest,
} from "./remoteBridgeSettle.js";
import {
  HNo,
  qd,
  Gd,
  Kd,
  Ud,
  Ls,
  xd,
  zo,
  describeBridgeCloseCode,
  Ld,
  Yo,
  Wd,
  Xs,
  Fd,
  Ws,
  $s,
} from "./remoteBridgeCloseCodes.js";
import { logForDebugging } from "../utils/debug.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { getEnvLessBridgeConfig } from "./envLessBridgeConfig.js";
import {
  isCredentialsFailure,
  createCodeSession,
  isCreateSessionFailure,
  isCredentialsRejection,
  attachBridgeWorker,
  shouldRemoteControlEnroll,
  isValidSessionId,
  readUntrustedDeviceRefusal,
  classifyElevatedAuthError,
} from "./codeSessionApi.js";
import { logForDiagnosticsNoPII } from "../utils/diagLogs.js";
import {
  BRIDGE_MALFORMED_RESPONSE_HINT,
  BRIDGE_REATTACH_UNAVAILABLE_HINT,
  BRIDGE_HOST_SIGNED_OUT_HINT,
  BRIDGE_HOST_ACCOUNT_CHANGED_HINT,
  BRIDGE_OWNER_CHANGED_HINT,
} from "./types.js";
import { logBridgeSkip } from "./debugUtils.js";
import { isTeleportedSession } from "./createSession.js";
import {
  unarchiveRemoteBridgeSession,
  archiveRemoteBridgeSession,
  retryArchiveAbandonedSession,
  isInterruptionMessage,
  sliceTailKeepingGroups,
  isPlainUserPrompt,
  isSubagentStreamMessage,
} from "./remoteBridgeArchive.js";
import {
  isTrustedDeviceGateEnabled,
  getTrustedDeviceToken,
  isProactiveEnrollmentDisabled,
  untrustedDeviceHint,
  SESSION_STALE_RELOGIN_HINT,
  withUntrustedDeviceRecovery,
  logRefusalWithoutEnrollment,
  clearTrustedDeviceTokenCache,
} from "./trustedDevice.js";
import { fromEnumOpt, fromEnum } from "../services/analytics/safeMetadata.js";
import { getBridgeSessionNamePrefix, getBridgeBaseUrlOverride } from "./bridgeConfig.js";
import { randomWordSlug } from "../utils/words.js";
import { logEvent } from "../services/analytics/index.js";
import {
  removeBridgePlaceholdersFor,
  recordBridgePlaceholder,
  startBridgePlaceholderSweep,
  qo,
  createReconnectBudget,
  Nn,
  Ps,
  Os,
  Ms,
  ks,
  Is,
  markBridgePlaceholderUsed,
} from "./bridgeReconnectBudget.js";
import {
  isBridgeNonOrigin403RetryEnabled,
  isBridgeAttachEpochFenceEnabled,
  isBridgeInboundReadReceiptsEnabled,
  isBridgeHostDeclinedEndEnabled,
  isBridgeOwnerPinnedEndEnabled,
  isBridgeSignedOutNeutralEnabled,
  isBridgeAuthReviveEnabled,
} from "./bridgeGates.js";
import { WNo } from "../cli/transports/SSETransport.js";
import { logError } from "../utils/log.js";
import { buildCCRv2SdkUrl } from "./workSecret.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  onGrowthBookRefresh,
} from "../services/analytics/growthbook.js";
import { DEFAULT_STREAM_EVENT_FLUSH_INTERVAL_MS, createIdleTracker } from "../cli/transports/ccrClient.js";
import { createGzipFetchWrapper } from "../services/api/gzipRequestBody.js";
import { TENGU_TOASTY_BEACON } from "../services/api/withRetry.js";
import { isTerminalShutdown } from "../utils/terminalShutdown.js";
import { getPollIntervalConfig } from "./pollConfig.js";
import { createV2ReplTransport } from "./replBridgeTransport.js";
import { errorMessage } from "../utils/errors.js";
import {
  BoundedUUIDSet,
  isEligibleBridgeMessage,
  isAttachmentOrConsentFallback,
  isRealUserTurn,
  handleIngressMessage,
  deriveTitleFromHumanTurn,
} from "./bridgeMessaging.js";
import { FlushGate } from "./flushGate.js";
import { R6n } from "./ownerPin.js";
import { checkSdkUrl } from "../cli/transports/sdkUrlValidation.js";
import { pw } from "../utils/localhost.js";
import { sleep, withDeadline, backoffDelayMs } from "../utils/sleep.js";
import { v5e, describeNonOriginRefusal } from "../services/api/requestIdSource.js";
import { $yr, TXt } from "../utils/auth/launcherHostLogin.js";
import { e9o, bindReadReceiptSession, resendReceipts, withReadReceiptClaim, Lli } from "./readReceipts.js";
import {
  buildWorkerShuttingDownMessage,
  handleReplBridgeControlRequest,
  buildBridgeResultMessage,
} from "./replControlHandler.js";
import { rememberResolvedPromptRequestId, rememberOutboundRequestId } from "./attestationGate.js";
import { h9o } from "../utils/sessionState.js";
import {
  noteBridgePostTurnSummaryWiped,
  reseedBridgePermissionMode,
  reseedBridgeCrossSessionInbound,
  reseedBridgeModel,
  reseedBridgeArtifacts,
  reseedBridgePostTurnSummary,
  reseedBridgeContextUsage,
} from "./replBridgeHandle.js";
import { onInteraction } from "../bootstrap/state.js";
import { createTokenRefreshScheduler } from "./jwtUtils.js";
import { isHumanInboundMessage } from "./inboundMessageOrigin.js";
import { Vt } from "../utils/agentId.js";
import { C6n, JZe } from "../cli/transports/streamEventCoalescing.js";
import { resendBridgeEffortMetadata } from "./applyFlagSettings.js";
import { heldHostSessionsBearer, recoverHostSessionsBearer } from "../utils/hostSessionsBearer.js";
import { CLEANUP_TIMEOUT_MS, registerCleanup } from "../utils/cleanupRegistry.js";
import { ye } from "../utils/startupMarks.js";
import { toInfraSessionId } from "./sessionIdCompat.js";
import { isEvalBuild } from "../utils/envUtils.js";
import { cooAttributes } from "../utils/telemetry/cooAttributes.js";
import { BASH_TOOL_NAME } from "../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../tools/PowerShellTool/toolName.js";
import { ASKUSERQUESTION } from "../tools/AskUserQuestionTool/prompt.js";
import { EXITPLANMODE } from "../tools/ExitPlanModeTool/constants.js";
import { redactSecretsInText } from "../services/teamMemorySync/secretScanner.js";
import { Cf } from "./deviceRegistration.js";
import { truncate } from "../utils/format.js";
import { dialogPermissionRequest } from "../utils/teleport/sessionCreate.js";
import { subscribeGithubPullRequest, buildJsonHeaders } from "./githubPrSubscription.js";
import { buildSessionEndpoint } from "../assistant/sessionHistory.js";
import { Dt } from "../../vendor/axios/dist/esm/axios.js";

/**
 * REPL Remote Control 的总装函数（约 65KB 单函数）：先按 work secret / 重连指针 / 新建三条路径确定 sessionId（cse_*），调 /bridge 取 worker_jwt 与 worker_epoch，再用 createV2ReplTransport 建 SSE+CCRClient 传输；
 * 之后挂接 onConnect（回放历史、处理延迟上传）、onData（handleIngressMessage 分派到入站消息/权限响应/服务端控制请求/取消）、onClose（按关闭码 401/4091/4093/4094 走 rebuildTransport 恢复）；
 * 内含 JWT 刷新调度、FlushGate 排队与 drain、会话标题、账户记忆脱敏、归档/拆除，最后返回 handle（writeSdkMessages、sendControlRequest/Response、sendResult、teardown、archive 等）。返回 null 表示未连接（原因经 onStateChange 报告）。
 */
//@ chunk-4cm44bmp.js:29785-95205 callgraph-witnessed = initEnvLessBridgeCore (0.223)
async function initEnvLessBridgeCore(params) {
  let {
      baseUrl: baseUrl,
      orgUUID: orgUUID,
      title: title,
      reattachOrFail: reattachOrFail,
      reattachOrigin: reattachOrigin,
      reviveInitiated: reviveInitiated,
      neverArchive: neverArchive,
      onAuthProven: onAuthProven,
      noHistoryBackfill: noHistoryBackfill,
      onReattachGoneBounce: onReattachGoneBounce,
      neutralFallbackTitle: neutralFallbackTitle,
      onReattachPointerDead: onReattachPointerDead,
      ownerPin: ownerPin,
      onOwnerChanged: onOwnerChanged,
      getAccessToken: getAccessToken,
      onAuth401: onAuth401,
      classifyFailedOAuthRefresh: classifyFailedOAuthRefresh,
      onReadFreshOAuthToken: onReadFreshOAuthToken,
      onClassifyMissingOAuthToken: onClassifyMissingOAuthToken,
      onProactiveRefresh: onProactiveRefresh,
      toSDKMessages: toSDKMessages,
      initialHistoryCap: initialHistoryCap,
      initialMessages: initialMessages,
      conversationForPairing: conversationForPairing,
      placeAccountMemoryTool: placeAccountMemoryTool,
      accountMemoryInPlay: accountMemoryInPlay,
      onInboundMessage: onInboundMessage,
      onQueuedNotification: onQueuedNotification,
      onUserMessage: onUserMessage,
      onSessionEstablished: onSessionEstablished,
      onBeforePushTriggeringState: onBeforePushTriggeringState,
      onPermissionResponse: onPermissionResponse,
      onInterrupt: onInterrupt,
      onStopTask: onStopTask,
      onBackgroundTasks: onBackgroundTasks,
      onCancelAsyncMessage: onCancelAsyncMessage,
      getInitializeState: getInitializeState,
      getCommands: getCommands,
      isTurnLive: isTurnLive,
      onDialogKindsDeclared: onDialogKindsDeclared,
      onClientInitialize: onClientInitialize,
      onSetModel: onSetModel,
      onSetMaxThinkingTokens: onSetMaxThinkingTokens,
      onSetPermissionMode: onSetPermissionMode,
      onApplyFlagSettings: onApplyFlagSettings,
      onRenameSession: onRenameSession,
      onSetColor: onSetColor,
      onFileSuggestions: onFileSuggestions,
      onReadFile: onReadFile,
      onGetWorkspaceDiff: onGetWorkspaceDiff,
      onSideQuestion: onSideQuestion,
      onGetContextUsage: onGetContextUsage,
      answerSharedControlRequest: answerSharedControlRequest,
      onMcpAuthenticate: onMcpAuthenticate,
      onMcpOauthCallbackUrl: onMcpOauthCallbackUrl,
      onMcpReconnect: onMcpReconnect,
      onForkConversation: onForkConversation,
      onStateChange: onStateChange,
      onBridgeInjectedMcp: onBridgeInjectedMcp,
      onProjectsBindingHint: onProjectsBindingHint,
      outboundOnly: outboundOnly,
      tags: tags,
      sessionGroupingId: sessionGroupingId,
      requestedSessionGroupingId: requestedSessionGroupingId,
      gitRepoUrl: gitRepoUrl = null,
      branch: branch = "",
      defaultBranch: defaultBranch = null,
      nameSourceForCreate: nameSourceForCreate,
      onTransportPersistenceReady: onTransportPersistenceReady,
      onTransportPersistenceTeardown: onTransportPersistenceTeardown,
      onTransportRebuilt: onTransportRebuilt,
      remoteControlOrigin: remoteControlOrigin,
      getBackfillMessages: getBackfillMessages,
      reattachSessionId: reattachSessionId,
      reattachSequenceNum: reattachSequenceNum,
      credentialsStore: credentialsStore,
      workSecretCredentials: workSecretCredentials,
      storageV5: storageV5,
    } = params,
    accountMemoryRedactor = createRemoteBridgeRedactor({
      mode: HNo,
      placeAccountMemoryTool: placeAccountMemoryTool,
      accountMemoryInPlay: accountMemoryInPlay,
      onDropped: (e, r) => {
        if (
          (logForDebugging(
            `[remote-bridge] Kept one '${r}' row's content out of the upload for account memory (reason: ${e})`,
          ),
          e === "unreadable")
        )
          logFeatureBad("bridge_account_memory_redaction", `unredactable_${r}_row`);
      },
    });
  accountMemoryRedactor.note(conversationForPairing?.() ?? initialMessages ?? []);
  let toRedactedSdkEvents = (e, r = "history") =>
      accountMemoryRedactor.redact(
        toSDKMessages(accountMemoryRedactor.withoutMemoryCallAttachments(e, r)),
        "events",
        r,
      ),
    keepSessionOnTeardown = workSecretCredentials !== void 0 ? !0 : neverArchive,
    sessionTitle = title,
    isReattach = !!reattachSessionId,
    cfg = await getEnvLessBridgeConfig(),
    workSecretRegistered = !1,
    noteAcceptedToken = (e) => {
      if (!workSecretCredentials) ownerPin?.noteAcceptedToken(e);
    },
    ri = "work-secret-lane",
    getLaneToken = () => (workSecretCredentials ? ri : getAccessToken()),
    fetchBridgeCredentials = workSecretCredentials
      ? () => {
          let e = workSecretRegistered ? "refresh" : "initial";
          return workSecretCredentials
            .register(e, {
              stillWanted: () => !I && Me === void 0,
              reuseHeldAboveS: Math.ceil(cfg.token_refresh_buffer_ms / 1000) + 60,
            })
            .then((r) => {
              if (r !== null && !isCredentialsFailure(r)) workSecretRegistered = !0;
              return r;
            });
        }
      : fetchCredentialsWithTrustedDevice,
    accessToken = getAccessToken();
  if (!accessToken)
    return (
      logForDebugging("[remote-bridge] No OAuth token"),
      logFeatureBad("bridge_connect", "bridge_connect_no_token"),
      null
    );
  let getCurrentAccessToken = () => getAccessToken() ?? accessToken,
    getOwnerToken = () => ownerPin?.ownerToken() ?? getAccessToken() ?? accessToken,
    recoveryAttemptedTokens = new Set(),
    { getOriginalCwd: getOriginalCwd } = await import("./chunk-nj7t53r7.js"),
    { getMainLoopModel: getMainLoopModel } = await import("./chunk-gqemcfsb.js"),
    groupingIdForCreate = requestedSessionGroupingId ?? sessionGroupingId,
    effectiveGroupingId = sessionGroupingId,
    ii = !1;
  async function createSessionWithRetry() {
    let e = gitRepoUrl ? void 0 : await nameSourceForCreate?.(),
      r = e ? { repositoryUrl: e } : void 0;
    ii = r !== void 0;
    let i = {},
      y = async () => {
        if (gitRepoUrl) {
          let { buildGitSessionContext: buildGitSessionContext } = await import("./chunk-wx4f8343.js"),
            { reportGitSessionContext: reportGitSessionContext } = await import("./chunk-587ph99w.js"),
            { report: report } = await buildGitSessionContext(gitRepoUrl, branch, defaultBranch ?? void 0);
          reportGitSessionContext(report);
        }
      },
      R = (S) =>
        withRetryAndAuthRecovery(
          (D, j) =>
            createCodeSession(
              baseUrl,
              D,
              sessionTitle,
              cfg.http_timeout_ms,
              tags,
              gitRepoUrl
                ? { gitRepoUrl: gitRepoUrl, branch: branch, defaultBranch: defaultBranch ?? void 0 }
                : r,
              getOriginalCwd(),
              getMainLoopModel(),
              S,
              i,
              j,
            ).then((H) => {
              if (typeof H === "string") ownerPin?.noteAcceptedToken(D);
              return H;
            }),
          "createCodeSession",
          cfg,
          {
            getAccessToken: getCurrentAccessToken,
            onAuth401: onAuth401,
            recoveryAttemptedTokens: recoveryAttemptedTokens,
          },
        ),
      _ = await R(groupingIdForCreate);
    if (
      isCreateSessionFailure(_) &&
      _.reason === "grouping_rejected" &&
      requestedSessionGroupingId === void 0 &&
      groupingIdForCreate !== void 0
    ) {
      let S = await R(void 0);
      if (typeof S === "string") {
        if (((effectiveGroupingId = void 0), await y(), r)) y6n("connect");
        return (
          logForDiagnosticsNoPII("info", "bridge_repl_v2_grouping_dropped", { status: _.status }),
          logForDebugging(
            "[bridge:core] persisted Project no longer available; recreated session outside it",
          ),
          logForDebugging(`[remote-bridge] Created session ${S}`),
          logForDiagnosticsNoPII("info", "bridge_repl_v2_session_created"),
          S
        );
      }
      if (r && !isCredentialsRejection(S)) _6n("connect", S);
      return _;
    }
    if (typeof _ === "string") {
      if (((effectiveGroupingId = groupingIdForCreate), await y(), r)) y6n("connect");
      (logForDebugging(`[remote-bridge] Created session ${_}`),
        logForDiagnosticsNoPII("info", "bridge_repl_v2_session_created"));
    }
    return _;
  }
  function describeCreateFailure(e) {
    if (e?.reason === "grouping_rejected" && groupingIdForCreate !== void 0) {
      let r = e.detail ? `: ${e.detail}` : "";
      return requestedSessionGroupingId !== void 0
        ? `Couldn't create a session in the requested Project (server ${e.status}${r}). The Project may not exist or may not be available to you.`
        : `Couldn't recreate the session in its previous Project (server ${e.status}${r}) \u2014 the Project may have been deleted or is no longer available.`;
    }
    if (e?.reason === "request_rejected")
      return `Session creation failed (server ${e.status}) \u2014 see debug log`;
    if (e?.reason === "malformed_response") return BRIDGE_MALFORMED_RESPONSE_HINT;
    return "Session creation failed \u2014 see debug log";
  }
  function reportCreateFailure(e) {
    if (e !== null && e.terminal === !1) {
      (onStateChange?.("failed", Yn, "auth"),
        logBridgeSkip("v2_session_create_oauth_rejected", void 0, !0),
        logFeatureBad("bridge_connect", "bridge_connect_create_oauth_rejected"));
      return;
    }
    if (ii) _6n("connect", isCreateSessionFailure(e) ? e : null);
    (onStateChange?.("failed", describeCreateFailure(isCreateSessionFailure(e) ? e : null)),
      logBridgeSkip("v2_session_create_failed", void 0, !0),
      logFeatureBad("bridge_connect", "bridge_connect_session_create_failed"));
  }
  let ca = "JWT refresh failed: no OAuth token \u2014 run /login",
    Yn = "Claude.ai login was rejected \u2014 run /login, then /remote-control",
    fa = "Claude.ai login expired \u2014 run /login, then /remote-control",
    _a = "Claude.ai login expired \u2014 run /login to restore Remote Control",
    pa = "Signed out of Claude \u2014 run /login, then /remote-control",
    reattachSuppressed = !1,
    reattachFellBackToFresh = !1;
  if (reattachSessionId && isTeleportedSession(reattachSessionId)) {
    if (reattachOrFail)
      return (
        logForDebugging(
          `[remote-bridge] Reattach-or-fail: ${reattachSessionId} is teleported; failing terminally instead of minting fresh`,
        ),
        logForDiagnosticsNoPII("info", "bridge_repl_v2_revive_reattach_teleported"),
        onReattachPointerDead?.(),
        onStateChange?.("failed", BRIDGE_REATTACH_UNAVAILABLE_HINT, "terminal"),
        logBridgeSkip("v2_revive_reattach_teleported", void 0, !0),
        logFeatureBad("bridge_connect", "bridge_connect_reattach_teleported"),
        null
      );
    (logForDebugging(
      `[remote-bridge] Reattach suppressed for teleported session ${reattachSessionId} \u2014 minting fresh`,
    ),
      (reattachSuppressed = !0),
      (isReattach = !1));
  }
  let sessionId;
  if (workSecretCredentials) {
    if (!reattachSessionId || reattachSuppressed)
      return (
        logForDebugging("[remote-bridge] Work-secret attach has no session to reattach; failing", {
          level: "error",
        }),
        onStateChange?.(
          "failed",
          "Remote Control could not attach: the host supplied a session credential but no session to attach to",
          "terminal",
        ),
        logBridgeSkip("v2_work_secret_no_session", void 0, !0),
        logFeatureBad("bridge_connect", "bridge_connect_work_secret_no_session"),
        null
      );
    ((sessionId = reattachSessionId),
      logForDebugging(`[remote-bridge] Attaching to session ${sessionId} with the host's work secret`),
      logForDiagnosticsNoPII("info", "bridge_repl_v2_work_secret_attach"));
  } else if (reattachSessionId && !reattachSuppressed) {
    ((sessionId = reattachSessionId),
      logForDebugging(`[remote-bridge] Reattaching to session ${sessionId}`),
      logForDiagnosticsNoPII("info", "bridge_repl_v2_session_reattached"));
    let e = await withRetryAndAuthRecovery(
      (r, i) =>
        unarchiveRemoteBridgeSession(
          sessionId,
          baseUrl,
          r,
          orgUUID,
          cfg.http_timeout_ms,
          i,
          credentialsStore,
        ),
      "unarchiveSession",
      cfg,
      {
        getAccessToken: getCurrentAccessToken,
        onAuth401: onAuth401,
        recoveryAttemptedTokens: recoveryAttemptedTokens,
      },
    );
    if (e?.outcome === "elevated_auth") {
      (logForDebugging(
        `[remote-bridge] Reattach ${sessionId}: unarchive elevated-auth (${e.reason}) \u2014 surfacing the failure, pointer preserved`,
      ),
        logForDiagnosticsNoPII("info", "bridge_repl_v2_reattach_elevated_auth"));
      let r = e.reason === "untrusted_device" && !isTrustedDeviceGateEnabled(),
        { outcome: outcome, ...y } = e,
        R = r ? { terminal: !0, reason: "request_rejected", status: 403 } : { terminal: !0, ...y };
      return (
        onStateChange?.("failed", describeCredentialFailure(R), failureSeverity(R)),
        logBridgeSkip("v2_reattach_elevated_auth", void 0, !0),
        logFeatureBad("bridge_connect", "bridge_connect_reattach_elevated_auth"),
        null
      );
    }
    if (e?.outcome === "gone" && reattachOrFail)
      return (
        logForDebugging(
          `[remote-bridge] Reattach-or-fail: ${sessionId} gone (unarchive ${e.status}); failing terminally instead of minting fresh`,
        ),
        logForDiagnosticsNoPII("info", "bridge_repl_v2_revive_reattach_gone"),
        onReattachGoneBounce(),
        onReattachPointerDead?.(),
        onStateChange?.("failed", BRIDGE_REATTACH_UNAVAILABLE_HINT, "terminal"),
        logBridgeSkip("v2_revive_reattach_gone", void 0, !0, {
          reattach_origin: fromEnumOpt(reattachOrigin),
          revive_initiated: reviveInitiated === !0,
        }),
        logFeatureBad("bridge_connect", "bridge_connect_reattach_gone"),
        null
      );
    if (e?.outcome === "gone") {
      (logForDebugging(
        `[remote-bridge] Reattach ${sessionId} gone (unarchive ${e.status}); minting fresh session`,
      ),
        (reattachFellBackToFresh = !0),
        onReattachGoneBounce(),
        (sessionTitle = neutralFallbackTitle ?? `${getBridgeSessionNamePrefix()}-${randomWordSlug()}`),
        logForDiagnosticsNoPII("info", "bridge_repl_v2_reattach_fallback", {
          via: "unarchive",
          status: e.status,
        }),
        logEvent("tengu_bridge_repl_env_expired_fresh_session", {
          v2: !0,
          via: fromEnum("unarchive"),
          status: typeof e.status === "number" ? e.status : fromEnum(e.status),
          reattach_origin: fromEnumOpt(reattachOrigin),
          revive_initiated: reviveInitiated === !0,
        }));
      let r = await createSessionWithRetry();
      if (typeof r !== "string") return (reportCreateFailure(r), null);
      ((sessionId = r), (isReattach = !1));
    }
  } else {
    if (reattachOrFail)
      return (
        logForDebugging(
          "[remote-bridge] Reattach-or-fail: no reattach pointer for this init; failing terminally instead of minting fresh",
        ),
        logForDiagnosticsNoPII("info", "bridge_repl_v2_revive_fresh_refused"),
        onReattachGoneBounce(),
        onStateChange?.("failed", BRIDGE_REATTACH_UNAVAILABLE_HINT, "terminal"),
        logBridgeSkip("v2_revive_fresh_refused", void 0, !0),
        logFeatureBad("bridge_connect", "bridge_connect_revive_fresh_refused"),
        null
      );
    let e = await createSessionWithRetry();
    if (typeof e !== "string") return (reportCreateFailure(e), null);
    sessionId = e;
  }
  if (
    isReattach &&
    requestedSessionGroupingId !== void 0 &&
    requestedSessionGroupingId !== effectiveGroupingId
  )
    logForDebugging(
      "[bridge:core] --project ignored: reattached to existing session (Project is fixed at create)",
    );
  if (keepSessionOnTeardown && isReattach) removeBridgePlaceholdersFor(sessionId, storageV5);
  else if (!outboundOnly) recordBridgePlaceholder(sessionId, isReattach ? void 0 : sessionTitle, storageV5);
  startBridgePlaceholderSweep({
    baseUrl: baseUrl,
    getAccessToken: getCurrentAccessToken,
    skipSessionId: sessionId,
    archive: (e) =>
      archiveRemoteBridgeSession(
        e,
        baseUrl,
        getCurrentAccessToken(),
        orgUUID,
        cfg.http_timeout_ms,
        void 0,
        storageV5,
      ),
    storageV5: storageV5,
  });
  let ha = qo + 60000,
    ft;
  function Xn() {
    ft = void 0;
  }
  function screenNonOriginRefusal(e) {
    if (!isCredentialsFailure(e) || !isNonOrigin403(e)) {
      if (e !== null && !isCredentialsFailure(e) && !isCredentialsRejection(e)) Xn();
      return e;
    }
    if (!isBridgeNonOrigin403RetryEnabled()) return e;
    let now = Date.now();
    if (ft === void 0 || now - ft.lastAtMs > ha) ft = { startedAtMs: now, lastAtMs: now, refusals: 0 };
    ((ft.lastAtMs = now), ft.refusals++);
    let i = now - ft.startedAtMs;
    if (ft.refusals > 1 && i >= WNo)
      return (
        logForDebugging(
          `[remote-bridge] /bridge refused by ${e.source} ${ft.refusals}\xD7 over ${Math.round(i / 1000)}s with nothing reaching Anthropic since \u2014 treating as a verdict`,
        ),
        e
      );
    return (
      logForDebugging(
        `[remote-bridge] /bridge 403 not written by Anthropic's origin (${e.source}) \u2014 treating as unreachable`,
      ),
      logForDiagnosticsNoPII("warn", "bridge_repl_v2_bridge_403_nonorigin", { source: e.source }),
      null
    );
  }
  function refetchCredentials(e, r) {
    if (I || Me !== void 0 || ae !== r) return Promise.resolve(null);
    let i = () =>
      eo(sessionId, e).then((y) => {
        if (ae !== r) return y;
        let R = screenNonOriginRefusal(y);
        if (R !== null && !isCredentialsFailure(R) && !isCredentialsRejection(R))
          (noteAcceptedToken(e), So());
        return R;
      });
    if (!Mt()) return i();
    return lr("owner_changed_recovery").then((y) => (y || I || Me !== void 0 || ae !== r ? null : i()));
  }
  let di = accessToken,
    bridgeCredentials = await withRetryAndAuthRecovery(
      (e, r) => (
        (di = e),
        fetchBridgeCredentials(sessionId, baseUrl, e, cfg.http_timeout_ms, r, credentialsStore)
      ),
      "fetchRemoteCredentials",
      cfg,
      {
        getAccessToken: getCurrentAccessToken,
        onAuth401: onAuth401,
        recoveryAttemptedTokens: recoveryAttemptedTokens,
      },
    );
  if (isReattach && bridgeCredentials === null)
    (logForDebugging(
      `[remote-bridge] Reattach ${sessionId}: /bridge failed after unarchive; surfacing retry prompt`,
    ),
      logForDiagnosticsNoPII("info", "v2_remote_creds_reattach_transient"));
  if (
    !bridgeCredentials ||
    isCredentialsFailure(bridgeCredentials) ||
    isCredentialsRejection(bridgeCredentials)
  ) {
    let e =
        bridgeCredentials === null
          ? isReattach
            ? "Couldn't reconnect to your Remote Control session. Retry, or start a fresh session without --resume."
            : "Remote credentials fetch failed \u2014 see debug log"
          : isCredentialsRejection(bridgeCredentials)
            ? fa
            : describeCredentialFailure(bridgeCredentials),
      r =
        bridgeCredentials === null
          ? reviveInitiated
            ? "auth"
            : "terminal"
          : isCredentialsRejection(bridgeCredentials)
            ? "auth"
            : failureSeverity(bridgeCredentials),
      i =
        bridgeCredentials === null
          ? isReattach
            ? "v2_remote_creds_reattach_transient"
            : "v2_remote_creds_failed"
          : isCredentialsRejection(bridgeCredentials)
            ? "v2_remote_creds_oauth_rejected"
            : isNonOrigin403(bridgeCredentials)
              ? `v2_remote_creds_request_rejected_${bridgeCredentials.source}`
              : `v2_remote_creds_${bridgeCredentials.reason}`;
    if (
      (logForDebugging(
        `[remote-bridge] Creds failed; onStateChange ${onStateChange ? "set" : "UNSET"}, msg="${e}"`,
      ),
      onStateChange?.("failed", e, r),
      logBridgeSkip(i, void 0, !0),
      logFeatureBad("bridge_connect", "bridge_connect_creds_failed"),
      !isReattach)
    )
      retryArchiveAbandonedSession(sessionId, () =>
        archiveRemoteBridgeSession(
          sessionId,
          baseUrl,
          getOwnerToken(),
          orgUUID,
          cfg.http_timeout_ms,
          void 0,
          storageV5,
        ),
      );
    return null;
  }
  (logForDebugging(
    `[remote-bridge] Fetched bridge credentials (expires_in=${bridgeCredentials.expires_in}s)`,
  ),
    noteAcceptedToken(di),
    onSessionEstablished?.(sessionId));
  let worker_epoch = bridgeCredentials.worker_epoch;
  function raiseWorkerEpoch(e) {
    worker_epoch = Math.max(worker_epoch, e);
  }
  function eo(e, r) {
    if (workSecretCredentials || !isBridgeAttachEpochFenceEnabled())
      return fetchBridgeCredentials(e, baseUrl, r, cfg.http_timeout_ms, void 0, credentialsStore);
    let i = worker_epoch,
      y = ae;
    return sendWithEpochFollowUps({
      heldEpoch: i,
      send: (R, _) =>
        fetchBridgeCredentials(
          e,
          baseUrl,
          r,
          cfg.http_timeout_ms,
          void 0,
          credentialsStore,
          R === void 0 ? void 0 : { expectedEpoch: R, onRefused: _ },
        ),
      maySendAgain: () => {
        if (isTeleportedSession(sessionId)) return !1;
        return !I && !re && Me === void 0 && ae === y;
      },
    }).then((R) => {
      let answer = R.answer;
      try {
        let S =
          answer !== null && !isCredentialsFailure(answer) && !isCredentialsRejection(answer)
            ? answer.worker_epoch
            : void 0;
        if (S !== void 0 && !I && ae === y) raiseWorkerEpoch(S);
        if (R.ending !== "not_refused" && qt()) {
          let D = S !== void 0;
          logEvent("tengu_bridge_repl_attach_conflict", {
            outcome: fromEnum(R.ending === "followed_up" ? (D ? "resolved" : "unresolved") : R.ending),
            accepted: D,
            stated_epoch: i,
            session_epoch: R.sessionEpoch,
            follow_ups: R.followUps,
            fallback_reason: fromEnumOpt(R.ending === "unfenced_fallback" ? R.fallbackReason : void 0),
          });
        }
      } catch (error) {
        (logError(error), logForDiagnosticsNoPII("error", "bridge_repl_v2_attach_fence_failed"));
      }
      return answer;
    });
  }
  let sessionUrl = buildCCRv2SdkUrl(bridgeCredentials.api_base_url, sessionId);
  logForDebugging(`[remote-bridge] v2 session URL: ${sessionUrl}`);
  function ga() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_selfheal_heartbeats", !0);
  }
  function to() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_recovery_patience", !0);
  }
  function ci() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_dazzling_garden", !0);
  }
  function fi() {
    return getFeatureValue_CACHED_MAY_BE_STALE(
      "tengu_ccr_stream_event_flush_ms",
      DEFAULT_STREAM_EVENT_FLUSH_INTERVAL_MS,
    );
  }
  function _i() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_stream_first_flush_ms", 0);
  }
  function pi() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_no_subscriber_flush_ms", 0);
  }
  function Ht() {
    return outboundOnly ? 0 : getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_no_subscriber_hold_ms", 0);
  }
  function er() {
    return Ht() > 0 || transport.mayHoldUploads?.() === !0;
  }
  function ma() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_sse_keepalive_max_interval_s", 0);
  }
  function va() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_sse_long_poll_fallback", !0);
  }
  function hi() {
    return outboundOnly
      ? !1
      : getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_drop_unwatched_stream_events", !1);
  }
  function tr() {
    return outboundOnly ? DEFAULT_HISTORY_BACKFILL_CONFIG : Es();
  }
  function ba() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_idle_heartbeat", !1);
  }
  function ya() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_reconnect_beat", !1);
  }
  function Ra() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_reactivation_beat", !1);
  }
  function wa() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_skip_redundant_heartbeat", !1);
  }
  let br = createIdleTracker(),
    Ea = new Map(),
    Sa = new Set(),
    Ta = createGzipFetchWrapper("ccr_worker", storageV5);
  function gi() {
    return {
      heartbeatIntervalMs: cfg.heartbeat_interval_ms,
      heartbeatJitterFraction: cfg.heartbeat_jitter_fraction,
      onRequestAuthOk: Ua,
      causeTypedCloseCodes: !0,
      selfHealHeartbeats: ga(),
      advertiseHeartbeatProbeSupport: ba(),
      beatOnStaleReconnect: ya(),
      idleTracker: br,
      beatOnReactivation: Ra(),
      skipRedundantHeartbeats: wa(),
      uploadTrim: () => getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_upload_trim", {}),
      keepsRequestId: () => getFeatureValue_CACHED_MAY_BE_STALE(TENGU_TOASTY_BEACON, !1),
      uploadHoldMarker: () => getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_upload_hold_marker", !1),
      liveOnlyShellTaskRows: {
        enabled: () => getFeatureValue_CACHED_MAY_BE_STALE("tengu_shell_task_rows_live_only_enabled", !1),
        starts: Ea,
      },
      artifactSocketIds: Sa,
      followsServedPolicy: !0,
      processExiting: isTerminalShutdown,
      streamEventFlushIntervalMs: fi(),
      streamEventFirstFlushMs: _i(),
      sseConnectTimeoutMs: () => getPollIntervalConfig().sse_connect_timeout_ms,
      gzipRequestBodyFetch: Ta,
      noSubscriberStreamEventFlushIntervalMs: pi(),
      noSubscriberUploadHoldMs: Ht(),
      dropUnwatchedStreamEvents: hi(),
      sseKeepaliveMaxIntervalSeconds: ma,
      longPollFallback: va,
      outboundOnly: outboundOnly,
      nonOrigin403Retry: isBridgeNonOrigin403RetryEnabled(),
      inboundReadReceipts: isBridgeInboundReadReceiptsEnabled,
      onNonOriginRejectionRecovered: Ha,
      retainUndeliveredOnClose: !0,
      internalEventUploader: { maxConsecutiveFailures: qd, maxBatchBytes: Gd, requestTimeoutMs: Kd },
    };
  }
  let ro = isReattach && (remoteControlOrigin !== void 0 || noHistoryBackfill),
    transport;
  try {
    transport = await createV2ReplTransport({
      ...gi(),
      sessionUrl: sessionUrl,
      ingressToken: bridgeCredentials.worker_jwt,
      sessionId: sessionId,
      epoch: bridgeCredentials.worker_epoch,
      initialSequenceNum: isReattach ? reattachSequenceNum : void 0,
      onConnectNeedsRecord: ro,
      getAuthToken: () => bridgeCredentials.worker_jwt,
    });
  } catch (err) {
    if (
      (logForDebugging(`[remote-bridge] v2 transport setup failed: ${errorMessage(err)}`, { level: "error" }),
      onStateChange?.("failed", `Transport setup failed: ${errorMessage(err)}`),
      logBridgeSkip("v2_transport_setup_failed", void 0, !0),
      logFeatureBad("bridge_connect", "bridge_connect_transport_failed"),
      !isReattach)
    )
      retryArchiveAbandonedSession(sessionId, () =>
        archiveRemoteBridgeSession(
          sessionId,
          baseUrl,
          getOwnerToken(),
          orgUUID,
          cfg.http_timeout_ms,
          void 0,
          storageV5,
        ),
      );
    return null;
  }
  (logForDebugging(`[remote-bridge] v2 transport created (epoch=${bridgeCredentials.worker_epoch})`),
    onStateChange?.("ready"));
  let {
      worker_jwt: worker_jwt,
      worker_epoch: worker_epoch_2,
      api_base_url: api_base_url,
    } = bridgeCredentials,
    rl = null,
    nl = new Set(),
    Ca = new Set(),
    Ma = !1,
    ol = !1,
    tn = 0;
  function il() {
    (tn++, (Ma = !1), (Ca = new Set()));
  }
  let ka = null;
  function sl(e, r = !1) {}
  function dl() {
    ka = null;
  }
  function Aa() {
    return !1;
  }
  function ul(e, r, i = !1) {
    return { added: [], removed: [] };
  }
  function Pa(e, r = !1) {}
  let Oa = (e) => {
      if (Object.keys(e).length === 0)
        return (
          onProjectsBindingHint?.(),
          { ok: !0, added: [], removed: [], errors: {}, unknownServerCount: 0 }
        );
      return { ok: !1, error: "Server-injected MCP servers are disabled for this Remote Control session" };
    },
    xt = 0,
    Lt = !1;
  function Ia() {
    if (I) return;
    let now = Date.now();
    if (now - xt < Ud) {
      Lt = !0;
      return;
    }
    ((xt = now), (Lt = !1), refresh.refreshNow(sessionId));
  }
  function vi() {
    if (I || !Lt) return;
    ((Lt = !1), (xt = Date.now()), refresh.refreshNow(sessionId));
  }
  function rn() {
    try {
      Da("withdrawn");
    } catch (error) {
      (logError(error), logFeatureBad("bridge_webagent_mcp_inject", "relinquish_threw"));
    }
  }
  function Da(e) {}
  let recentPostedUUIDs = new BoundedUUIDSet(cfg.uuid_dedup_buffer_size),
    initialMessageUUIDs = new Set();
  if (initialMessages)
    for (let msg of initialMessages) (initialMessageUUIDs.add(msg.uuid), recentPostedUUIDs.add(msg.uuid));
  let recentInboundUUIDs = new BoundedUUIDSet(cfg.uuid_dedup_buffer_size),
    flushGate = new Map(),
    no = new BoundedUUIDSet(cfg.uuid_dedup_buffer_size),
    messageFlushGate = new FlushGate(),
    frameFlushGate = new FlushGate(),
    oo = 0,
    $t = !1,
    Rt = !1,
    or = new Map(),
    ja = 64,
    yr = isReattach,
    io,
    Rr,
    transcriptMirrorMode =
      !isReattach &&
      !noHistoryBackfill &&
      !reattachFellBackToFresh &&
      isBackfillScopeAllowedForOrigin(tr().scope, remoteControlOrigin)
        ? "deferred"
        : "live",
    on = remoteControlOrigin,
    sn = new BoundedUUIDSet(cfg.uuid_dedup_buffer_size),
    wt,
    wr = {},
    I = !1,
    an,
    Be = !1,
    yi = 0,
    ae = 0;
  function Ri() {
    return (yi++, (ae = yi), (Be = !0), (ir = Date.now()), (Er = !1), ae);
  }
  function wi(e) {
    if (ae !== e) return !1;
    return ((ae = 0), (Be = !1), (ir = 0), Ei(), !0);
  }
  let dn = !1;
  function Ei() {
    if (!dn || I || re) {
      dn = !1;
      return;
    }
    if (((dn = !1), pt !== void 0 || !transport.isConnectedStatus())) return;
    if (messageFlushGate.active || frameFlushGate.active) drainFlushGate();
    Ao();
  }
  function Si() {
    ((ae = 0), (Be = !1), (ir = 0), Ei());
  }
  let ir = 0,
    Er = !1,
    Ti =
      cfg.init_retry_max_attempts * cfg.http_timeout_ms +
      (cfg.init_retry_max_attempts - 1) * cfg.init_retry_max_delay_ms,
    Na =
      cfg.oauth_retry_base_delay_ms * (2 ** cfg.oauth_retry_max_attempts - 1) +
      cfg.oauth_retry_max_attempts * Ti,
    Ci = 2 * (15000 + Ti + Na),
    sr = 0,
    Mi = 3,
    ln = 0,
    ki = createReconnectBudget();
  function Ua() {
    ((ln = 0), ki.noteHealthyBeat(Date.now()), Xn(), onAuthProven?.());
  }
  let un = !1,
    pt;
  function ar() {
    (clearTimeout(pt), (pt = void 0));
  }
  let Et = !1,
    St = null,
    cn = !1;
  function Sr() {
    let e = St;
    St = null;
    try {
      e?.tunnel.stop();
    } catch (error) {
      (logForDebugging(`[remote-bridge] a held tunnel's stop threw: ${errorMessage(error)}`, {
        level: "error",
      }),
        logError(error));
    }
  }
  let Ai = 0,
    Pi = 0;
  function so(e) {
    let r = e === "a_start" ? Pi : Ai,
      i = Date.now() - r;
    return Mt() && !(i >= 0 && i < R6n);
  }
  function Oi() {
    if (isTeleportedSession(sessionId)) return !0;
    if (cn || I || re || Et || Me !== void 0 || checkSdkUrl(api_base_url) !== null) return !0;
    let parse = URL.parse(api_base_url);
    return (
      parse === null || (parse.protocol !== "https:" && parse.protocol !== "wss:" && !pw(parse.hostname))
    );
  }
  let Ii = params.fixedCredentialNow !== void 0 && params.fixedCredentialNow() !== "replaced";
  function lo() {
    return Ii && !Ar() && params.fixedCredentialNow?.() === "replaced";
  }
  function Fa(e) {
    if (St === null) return !1;
    try {
      let r;
      switch (e) {
        case "flag_refresh":
          r = !1;
          break;
        case "hand_over":
          r = so("hand_over");
          break;
        default:
          r = !0;
      }
      return Oi() || r || lo() || St.dialedBase !== api_base_url || St.isRefusedBySession();
    } catch (error) {
      return (
        logForDebugging(
          `[remote-bridge] live preview: the caller's check of its session threw: ${errorMessage(error)}`,
          { level: "error" },
        ),
        logError(error),
        !0
      );
    }
  }
  function fn(e) {
    ((Et = !1), onStateChange?.("reconnecting", e));
  }
  function Tr() {
    ((Et = !1), onStateChange?.("connected"));
  }
  function ve(e, r = "terminal") {
    ((Et = !0), ar(), (tt = void 0), _n(), ko?.end(), Sr(), onStateChange?.("failed", e, r));
  }
  function Di() {
    let e = er();
    return Promise.all([
      transport.flush({ retryNow: e }),
      e && transport.flushInternalEvents?.({ retryNow: e }),
    ]).then(() => {});
  }
  function Cr(e = Ls) {
    let r = sleep(e),
      winner = Promise.race([Di().then(() => !0), r.then(() => !1)]),
      winner_2 = Promise.race([transport.flushDeliveryAcks?.({ retryNow: !0 }), r]);
    return Promise.all([winner, winner_2]).then(([R]) => R);
  }
  async function Bi(e, r = Date.now()) {
    let i = transport.getUploadBacklog?.(),
      y = await Cr(xd),
      R = {
        hold_preflush_ms: Date.now() - r,
        hold_preflush_landed: y,
        hold_preflush_inflight_age_ms: i?.oldestInFlightMs,
        hold_preflush_lane_in_backoff: i?.backingOff,
      };
    if (!y) logFeatureSad("ccr_no_subscriber_hold", e);
    return R;
  }
  function ji() {
    let e = transport.getUploadBacklog?.();
    return {
      unsent_client_events_at_close: e?.unsentClientEvents,
      unsent_internal_events_at_close: e?.unsentInternalEvents,
    };
  }
  function _n() {
    let end = messageFlushGate.end(),
      mapped = frameFlushGate.end().map((i) => i.frame);
    (($t = !1), Ni(end.length + mapped.length, mapped, transport.discardUndeliveredEvents?.() ?? []));
  }
  function Ni(e, r, i) {
    if (e === 0 && i.length === 0) return;
    (logForDiagnosticsNoPII("warn", "bridge_repl_v2_client_events_lost", {
      queued: e,
      undelivered: i.length,
    }),
      logFeatureSad("bridge_repl", "client_events_lost_at_dead_end", { queued: e, undelivered: i.length }));
    let y = [
        ...i.map((S) => S.payload.subtype),
        ...r.map((S) => (S.type === "system" && "subtype" in S ? S.subtype : void 0)),
      ],
      included = y.includes("task_notification"),
      included_2 = y.includes("background_tasks_changed");
    if (included || included_2)
      logFeatureSad("ccr_task_status_publish", "status_events_lost_at_dead_end", {
        has_terminal_bookend: included,
        has_level: included_2,
      });
  }
  let be,
    Me,
    Wt = !1,
    dr,
    Tt,
    tt,
    Se = !1,
    Mr,
    re = !1,
    kr;
  function qt() {
    return !0;
  }
  function ht(e, r, i = !0) {
    if (i) ((dr = void 0), (Tt = void 0));
    if (!Wt || !qt()) return !1;
    if (r === void 0) logFeatureSad("bridge_presence", e);
    else logFeatureSad("bridge_presence", e, r);
    return !0;
  }
  function ke(e, r) {
    if (((dr = void 0), (Tt = void 0), (Se = !0), !qt())) return !1;
    if (!Wt) return (logFeatureBad("bridge_connect", "bridge_connect_died_before_presence"), !1);
    if (r === void 0) logFeatureBad("bridge_presence", e);
    else logFeatureBad("bridge_presence", e, r);
    return !0;
  }
  let pn = !1;
  function Ha(e) {
    if (I || re || Se) return;
    if (
      (logForDebugging(
        `[remote-bridge] SSE stream live again after ${e.attempts} non-origin 403(s) over ${Math.round(e.streakMs / 1000)}s (source=${e.source})`,
      ),
      ht(
        RECOVERED_NONORIGIN_CODES[e.source],
        {
          attempts: e.attempts,
          streak_s: Math.round(e.streakMs / 1000),
          first_in_episode: pn ? 0 : 1,
          recovery_bucket: Nn(e.streakMs),
        },
        !1,
      ))
    )
      pn = !0;
  }
  function uo(e) {
    if (!v5e(e?.rejectSource)) {
      ke(transportClosed403Code(e));
      return;
    }
    if (
      ke(transportClosed403Code(e), {
        ...(e.streak !== void 0 && {
          attempts: e.streak.attempts,
          streak_s: Math.round(e.streak.streakMs / 1000),
        }),
        first_in_episode: pn ? 0 : 1,
      })
    )
      pn = !0;
  }
  function Ui(e) {
    if (isTeleportedSession(sessionId)) return;
    let r = be === void 0 ? void 0 : classifySupersession(be.code, be.cause);
    if (Me !== void 0 || be === void 0 || r === void 0 || (Er && isNotArchived(r))) return;
    if (
      ((Me = r),
      logForDebugging(
        `[remote-bridge] ${e} latched a stashed supersession close (${be.code}/${be.cause ?? "uncaused"}) \u2014 archive suppressed`,
      ),
      !Se)
    ) {
      if (be.code === 403) uo(be.detail);
      else if (be.code === 404) ke("transport_closed_404");
      else (ht("transport_closed_4090"), (Se = !0));
      tt = void 0;
    }
  }
  function co(e) {
    if (!qt()) return;
    switch (e.leg) {
      case "ok":
        logFeatureOk("bridge_token_refresh");
        return;
      case "sad":
        logFeatureSad("bridge_token_refresh", e.code);
        return;
      case "bad":
        logFeatureBad("bridge_token_refresh", e.code);
        return;
    }
  }
  function Fi(e) {
    if (!isBridgeHostDeclinedEndEnabled()) return;
    let r = $yr();
    if (r === void 0 || r.generation <= e) return xi();
    return Hi(r.reason);
  }
  function Hi(e) {
    switch (e) {
      case "signed_out":
        return "host_signed_out";
      case "identity_changed":
        return "host_account_changed";
      case "transient":
      case "refresh_failed":
        return;
    }
  }
  function xi() {
    if (Tt === void 0) return;
    if (Tt.generation === TXt()) return Tt.code;
    let e = $yr();
    return e === void 0 ? void 0 : Hi(e.reason);
  }
  function Li(e) {
    return e === "host_signed_out" ? BRIDGE_HOST_SIGNED_OUT_HINT : BRIDGE_HOST_ACCOUNT_CHANGED_HINT;
  }
  function $i(e) {
    return e === "host_signed_out" ? "auth" : "terminal";
  }
  function Ar() {
    return ownerPin !== void 0 && !I && !re && isBridgeOwnerPinnedEndEnabled();
  }
  function Mt() {
    return Ar() && ownerPin !== void 0 && ownerPin.identityLooksChanged();
  }
  async function fo(e, r) {
    if (re) return "changed";
    if (!Ar() || ownerPin === void 0) return "unchanged";
    let confirmChanged = await ownerPin.confirmChanged(r);
    if (confirmChanged === "changed") return (await xa(e), "changed");
    return re ? "changed" : confirmChanged;
  }
  async function lr(e) {
    return (await fo(e)) === "changed";
  }
  async function Pr(e, r) {
    if (Mt() && (await lr(e))) return !0;
    return I || ae !== r;
  }
  async function xa(e) {
    if (I || re || ownerPin === void 0) return;
    if (
      ((re = !0),
      kr?.(),
      (kr = void 0),
      refresh.cancelAll(),
      Si(),
      onOwnerChanged?.(),
      (un = !1),
      Ui("owner_changed"),
      (be = void 0),
      clearTimeout(cr),
      ar(),
      mn?.(),
      (mn = void 0),
      Gi(),
      Ki(),
      e9o(Ro),
      (cn = !0),
      Sr(),
      isTeleportedSession(sessionId))
    ) {
      (logForDebugging(
        `[remote-bridge] Signed-in account changed under teleported session ${sessionId} (${e}) \u2014 latched only`,
      ),
        _n(),
        Sn(),
        rn(),
        transport.close());
      return;
    }
    let r = Se || Me !== void 0;
    if (
      (logForDebugging(
        `[remote-bridge] Signed-in account changed under ${sessionId} (${e}${r ? ", episode already dead" : ""}) \u2014 stopping`,
      ),
      logForDiagnosticsNoPII("info", "bridge_repl_v2_owner_changed"),
      !r)
    )
      (ht(e),
        (Se = !0),
        ve(BRIDGE_OWNER_CHANGED_HINT, "terminal"),
        transport.write(buildWorkerShuttingDownMessage(sessionId, "account_changed")),
        await Cr(er() ? cfg.teardown_archive_timeout_ms : Ls).catch(() => {
          return;
        }));
    else if (!Et) ve(BRIDGE_OWNER_CHANGED_HINT, "terminal");
    else _n();
    if ((Sn(), rn(), !I)) transport.close();
    if (Me !== void 0) return;
    let i;
    if (keepSessionOnTeardown)
      ((i = "skipped_host_owned"),
        logForDebugging(
          `[remote-bridge] Owner-changed settle left host-owned session ${sessionId} unarchived`,
        ));
    else {
      let y = await archiveRemoteBridgeSession(
        sessionId,
        baseUrl,
        ownerPin.ownerToken(),
        orgUUID,
        cfg.teardown_archive_timeout_ms,
        void 0,
        storageV5,
      );
      ((i = archiveStatusCode(y, Me)),
        logForDebugging(
          `[remote-bridge] Owner-changed settle archived ${sessionId} with the owner's credential (archive=${y})`,
        ));
    }
    if (qt())
      logEvent("tengu_bridge_owner_changed", {
        site: fromEnum(e),
        archive_status: fromEnum(i),
        episode_already_dead: r,
      });
  }
  function Wi() {
    if (Me !== void 0) return Me;
    if (re) return "owner_changed";
    return;
  }
  function _o() {
    if (ownerPin !== void 0 && isBridgeOwnerPinnedEndEnabled() && ownerPin.identityLooksChanged())
      return { token: ownerPin.ownerToken(), source: "pinned_owner" };
    return { token: getAccessToken(), source: "current" };
  }
  let hn = isReattach,
    De = new Map(),
    cl = void 0,
    Gt = new Set(),
    ho = new BoundedIdSet(256),
    qi = new BoundedIdSet(cfg.uuid_dedup_buffer_size);
  function go(e, r) {
    if ((Gt.delete(e), De.delete(e) && r)) rememberResolvedPromptRequestId(e);
  }
  function mo() {
    let e,
      r = !1;
    for (let [i, y] of De) {
      if (Gt.has(i)) continue;
      ((r = !0), (e = y.details ?? e));
    }
    if (r) $e("requires_action", e);
    else $e("running");
  }
  let vo,
    $e = (e, r) => {
      if (onBeforePushTriggeringState && !re && (e === "requires_action" || e === "idle"))
        onBeforePushTriggeringState();
      if ((transport.reportState(e, r), e === "requires_action" && r)) {
        hn = !0;
        let reverse = [...De.values()].flatMap((y) => (y.details ? [y.details] : [])).reverse();
        transport.reportMetadata({
          pending_action: r,
          pending_actions: h9o(
            r,
            reverse.filter((y) => y !== r),
          ),
        });
      } else if (hn) ((hn = !1), transport.reportMetadata({ pending_action: null, pending_actions: null }));
      if (e === "running" && vo !== "running") {
        if (
          (transport.reportMetadata({ post_turn_summary: null, recap: null }),
          noteBridgePostTurnSummaryWiped(),
          transcriptMirrorMode === "deferred")
        )
          (delete wr.post_turn_summary, delete wr.recap);
      }
      vo = e;
    };
  function La() {
    return (Gt.clear(), [...De.values()].map((e) => e.request));
  }
  let mn, bo, vn, yo;
  if (gitRepoUrl)
    (async () => {
      let {
          isNestedGitLabProject: isNestedGitLabProject,
          parseGitRemote: parseGitRemote,
          parseGitHubRepository: parseGitHubRepository,
        } = await import("./chunk-zqrznfbt.js"),
        {
          addWatchedRepo: addWatchedRepo,
          removeWatchedRepo: removeWatchedRepo,
          getCachedBranchForRepo: getCachedBranchForRepo,
          onRepoBranchChange: onRepoBranchChange,
          getRemoteUrlForDir: getRemoteUrlForDir,
        } = await import("./chunk-crvm1n0n.js"),
        j = await import("./chunk-ehd9f85g.js"),
        H = parseGitRemote(gitRepoUrl);
      if (H && isNestedGitLabProject(H)) return;
      let W = H ? `${H.owner}/${H.name}` : parseGitHubRepository(gitRepoUrl);
      if (!W) return;
      let z = H ? `${H.host}/${H.owner}/${H.name}` : `github.com/${W}`,
        L = getOriginalCwd();
      if ((await addWatchedRepo(L), I || re)) {
        removeWatchedRepo(L);
        return;
      }
      let le,
        ce = isReattach,
        ne = isReattach,
        xe = 0,
        qe = !1,
        rt = !1,
        Tn = async () => {
          qe = !0;
          try {
            do {
              rt = !1;
              let Ue = xe;
              if (I || re) return;
              let Xt = getOriginalCwd();
              if (Xt !== L) {
                if ((removeWatchedRepo(L), (L = Xt), await addWatchedRepo(Xt), I || re)) {
                  removeWatchedRepo(Xt);
                  return;
                }
              }
              let Dt = await getCachedBranchForRepo(Xt);
              if (Ue !== xe) {
                rt = !0;
                continue;
              }
              if (I || et("branch_metadata")) return;
              if (Dt === void 0) {
                if (le !== null)
                  if (((le = null), ce))
                    ((ce = !1),
                      transport.reportMetadata({
                        current_branches: { [W]: null },
                        worktree_state: { [W]: null },
                      }));
                  else transport.reportMetadata({ current_branches: { [W]: null } });
                continue;
              }
              if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_handoff_metadata", !1)) {
                let [nd, Mn] = await Promise.all([
                  j.collectWorktreeState(Xt, Dt),
                  j.withCollectTimeout(getRemoteUrlForDir(Xt)).catch(() => null),
                ]);
                if (Ue !== xe) {
                  rt = !0;
                  continue;
                }
                if (I || et("branch_metadata")) return;
                let kn = Mn ? parseGitRemote(Mn) : null,
                  us = Mn ? parseGitHubRepository(Mn) : null,
                  cs = (kn ? `${kn.host}/${kn.owner}/${kn.name}` : us ? `github.com/${us}` : null) === z,
                  Io = cs ? Dt : null,
                  Xe = cs ? nd : null,
                  fs = Xe
                    ? JSON.stringify([
                        Io,
                        Xe.head_sha,
                        Xe.unpushed_count,
                        Xe.is_dirty,
                        Xe.mid_operation,
                        Xe.upstream_exists,
                        Xe.has_submodules,
                        Xe.submodules_unverified,
                        Xe.has_lfs,
                      ])
                    : JSON.stringify([Io]);
                if (fs === le) continue;
                if (
                  ((le = fs),
                  logForDebugging(`[remote-bridge] worktree_state \u2192 ${W}: ${JSON.stringify(Xe)}`),
                  (ce = Xe !== null),
                  Xe !== null)
                )
                  ne = !0;
                transport.reportMetadata({ current_branches: { [W]: Io }, worktree_state: { [W]: Xe } });
                continue;
              }
              if (ce) {
                ((ce = !1),
                  (le = Dt),
                  transport.reportMetadata({ current_branches: { [W]: Dt }, worktree_state: { [W]: null } }));
                continue;
              }
              if (Dt === le) continue;
              ((le = Dt), transport.reportMetadata({ current_branches: { [W]: Dt } }));
            } while (rt);
          } catch (error) {
            logForDebugging(`[remote-bridge] current_branches emit failed: ${errorMessage(error)}`);
          } finally {
            qe = !1;
          }
        };
      bo = () => {
        if (((le = void 0), (ce = ne), xe++, qe)) rt = !0;
      };
      let resolved = Promise.resolve(),
        Je = () => {
          if (qe) rt = !0;
          else resolved = Tn();
          return resolved;
        };
      ((yo = () =>
        withDeadline(
          Je().then(() => transport.flushWorkerState?.() ?? !0),
          j.WORKTREE_COLLECT_TIMEOUT_MS + zo,
        )),
        (vn = () => void Je()));
      let Cn = onRepoBranchChange(vn);
      ((mn = () => {
        (Cn(), removeWatchedRepo(L));
      }),
        Je());
    })().catch((e) => logForDebugging(`[remote-bridge] current_branches setup failed: ${errorMessage(e)}`));
  let Gi = onInteraction(() => br.noteActivity()),
    Ki = onGrowthBookRefresh(() => {
      (transport.setStreamEventFlushIntervalMs?.(fi()),
        transport.setStreamEventFirstFlushMs?.(_i()),
        transport.setNoSubscriberStreamEventFlushIntervalMs?.(pi()),
        transport.setNoSubscriberUploadHoldMs?.(Ht()),
        transport.setDropUnwatchedStreamEvents?.(hi()),
        Qa());
    }),
    Ro = {};
  bindReadReceiptSession({
    owner: Ro,
    sessionId: sessionId,
    report: (e, r) => transport.reportDelivery(e, r),
  });
  let ur = new Map(),
    Vi = !onUserMessage,
    userMessageCallbackDone = !1,
    connectCause = "initial",
    wo = 0,
    cr;
  function onConnectTimeout(cause) {
    if (I) return;
    if (
      (logEvent("tengu_bridge_repl_connect_timeout", {
        v2: !0,
        elapsed_ms: cfg.connect_timeout_ms,
        cause: fromEnum(cause),
      }),
      logFeatureBad("bridge_connect", "bridge_connect_timeout"),
      Se)
    );
    else if (Object.values(CLOSE_CODE_RECOVERY).some((r) => r.cause === cause))
      tt = "recovery_connect_timeout";
    else if (cause === "proactive_refresh") tt = "refresh_connect_timeout";
  }
  async function $a(e) {
    if (!onAuth401) return "rejected";
    try {
      if (await onAuth401(e)) return "recovered";
    } catch (error) {
      logForDebugging(`[remote-bridge] Proactive forced OAuth refresh threw: ${errorMessage(error)}`, {
        level: "error",
      });
    }
    if (!ci() || !classifyFailedOAuthRefresh) return "rejected";
    return classifyFailedOAuthRefresh();
  }
  let Wa = 3,
    Eo,
    yn = 0;
  function So() {
    ((Eo = void 0), (yn = 0));
  }
  function Ji(e) {
    return e !== void 0 && e === Eo && ci();
  }
  let refresh = createTokenRefreshScheduler({
    refreshBufferMs: cfg.token_refresh_buffer_ms,
    onExhausted: (e) => {
      if (!I && !Se) co({ leg: "bad", code: "chain_exhausted_no_oauth" });
      if (Be || I) return;
      if (Et) {
        logForDebugging(
          `[remote-bridge] Token refresh chain exhausted for ${e} \u2014 terminal state already showing, not repainting`,
        );
        return;
      }
      (logForDebugging(
        `[remote-bridge] Token refresh chain exhausted for ${e} \u2014 surfacing auth failure`,
        { level: "error" },
      ),
        onStateChange?.(
          "failed",
          "OAuth token unavailable \u2014 run /login to restore Remote Control",
          "auth",
        ));
    },
    getAccessToken: async () => {
      if (re) return;
      if (Mt()) {
        let i = Se;
        if (await lr("owner_changed_refresh")) {
          if (re && !i) co({ leg: "sad", code: "owner_changed" });
          return;
        }
      }
      if (workSecretCredentials) return ri;
      let stale = getAccessToken(),
        r = Ji(stale);
      try {
        if (r) await onReadFreshOAuthToken?.();
        else await onProactiveRefresh?.();
      } catch (error) {
        logForDebugging(`[remote-bridge] scheduler token refresh failed: ${errorMessage(error)}`, {
          level: "error",
        });
      }
      return getAccessToken() ?? stale;
    },
    onRefresh: (sid, oauthToken) => {
      (async () => {
        if (Me !== void 0 || re) {
          logForDebugging(
            `[remote-bridge] Proactive refresh skipped: session ${re ? "stopped for an owner change" : "superseded"}`,
          );
          return;
        }
        if (Be || I) {
          if (
            (logForDebugging("[remote-bridge] Recovery already in flight, skipping proactive refresh"),
            Be && xt !== 0)
          )
            Lt = !0;
          return;
        }
        if (isTeleportedSession(sid)) {
          logForDebugging(`[remote-bridge] Proactive refresh suppressed for teleported session ${sid}`);
          return;
        }
        let i = Ri(),
          y = Se,
          R = !1,
          _,
          S,
          D,
          j,
          H = !1;
        function W(L, le, ce = "refresh_credentials_rejected", ne) {
          if (I) return;
          if (tt !== void 0 && be === void 0) (ke(tt), (tt = void 0));
          else if (!y) ((dr = ce), (Tt = ne === void 0 ? void 0 : { code: ne, generation: TXt() }));
          ((_ = L), (S = "refresh_credentials_rejected"), (D = le));
        }
        async function z() {
          if (!(await Pr("owner_changed_refresh", i))) return !1;
          if (re) j = { leg: "sad", code: "owner_changed" };
          return !0;
        }
        try {
          if (await z()) return;
          let L = Ji(oauthToken);
          if (!L) So();
          let now = Date.now(),
            ce = tn,
            fresh = await withRetry(
              () => {
                if (L) return Promise.resolve({ terminal: !1, reason: "oauth_rejected" });
                if (I || Me !== void 0 || ae !== i) return Promise.resolve(null);
                return eo(sid, oauthToken).then((qe) => (I || ae !== i ? qe : screenNonOriginRefusal(qe)));
              },
              "fetchRemoteCredentials (proactive)",
              cfg,
            );
          if (I || ae !== i) return;
          if (isCredentialsRejection(fresh)) {
            if (
              (logForDebugging(
                L
                  ? "[remote-bridge] Proactive cycle: bearer already rejected by /bridge \u2014 retrying the forced OAuth refresh without re-registering"
                  : "[remote-bridge] Proactive /bridge re-mint rejected (oauth_rejected) \u2014 attempting forced OAuth refresh",
              ),
              !L)
            )
              logForDiagnosticsNoPII("error", "bridge_repl_v2_proactive_oauth_rejected");
            if (await z()) return;
            let qe = TXt(),
              rt = await $a(oauthToken),
              Tn = getAccessToken() ?? oauthToken;
            if (await z()) return;
            if (rt === "unreachable") {
              if (
                (logForDebugging(
                  "[remote-bridge] Proactive forced OAuth refresh got no verdict (token endpoint unreachable); keeping transport, a later cycle retries the refresh",
                ),
                !L)
              )
                j = { leg: "sad", code: "refresh_deferred_transient" };
              Eo = oauthToken;
              let Ue = yn < Wa;
              if (isTeleportedSession(sid)) Ue = !1;
              if (Ue) (yn++, refresh.scheduleFromExpiresIn(sid, 0));
              logForDiagnosticsNoPII("info", "bridge_repl_v2_proactive_refresh_unreachable", {
                early_retry: yn,
                rearmed: Ue,
              });
              return;
            }
            let It = rt === "recovered";
            if (It) So();
            let Je = It
              ? await withRetry(
                  () => {
                    if (I || Me !== void 0 || ae !== i) return Promise.resolve(null);
                    return eo(sid, Tn).then((Ue) => (I || ae !== i ? Ue : screenNonOriginRefusal(Ue)));
                  },
                  "fetchRemoteCredentials (proactive post-refresh)",
                  cfg,
                )
              : null;
            if (I || ae !== i) return;
            if (It && Je === null) {
              if (
                (logForDebugging(
                  "[remote-bridge] Proactive post-refresh re-mint failed (transient); fallback refresh will retry",
                ),
                Me === void 0)
              )
                j = { leg: "sad", code: "post_refresh_remint_null" };
              return;
            }
            if (isCredentialsFailure(Je)) {
              ((j = { leg: "bad", code: `post_refresh_credentials_${failureSeverity(Je)}` }),
                W(
                  describeCredentialFailure(Je),
                  failureSeverity(Je),
                  credentialsRejectedCode("refresh", Je),
                ));
              return;
            }
            if (Je === null || isCredentialsRejection(Je)) {
              let Ue = It ? void 0 : Fi(qe);
              if (Ue !== void 0) {
                ((j = { leg: "sad", code: Ue }),
                  logForDiagnosticsNoPII("info", "bridge_repl_v2_proactive_host_declined"),
                  W(Li(Ue), $i(Ue), "refresh_credentials_rejected", Ue));
                return;
              }
              ((j = {
                leg: "bad",
                code: It
                  ? "oauth_rejected_after_refresh"
                  : onAuth401
                    ? "oauth_rejected_refresh_failed"
                    : "oauth_rejected_no_refresh_path",
              }),
                W(_a, "auth"));
              return;
            }
            noteAcceptedToken(Tn);
            let Cn = await To(Je, "proactive_refresh", 0, now, ce);
            if (Cn === "suppressed_teleported") H = !0;
            if (Cn === "rebuilt")
              ((R = !0),
                (j = { leg: "sad", code: "oauth_rejected_recovered" }),
                logForDebugging(
                  "[remote-bridge] Transport rebuilt (proactive refresh after forced OAuth refresh)",
                ));
            return;
          }
          if (!fresh) {
            if (
              (logForDebugging(
                "[remote-bridge] Proactive /bridge re-mint failed (transient); fallback refresh will retry",
              ),
              logForDiagnosticsNoPII("warn", "bridge_repl_v2_proactive_remint_null"),
              Me === void 0)
            )
              j = { leg: "sad", code: "remint_null" };
            return;
          }
          if (isCredentialsFailure(fresh)) {
            ((j = { leg: "bad", code: `credentials_${failureSeverity(fresh)}` }),
              W(
                describeCredentialFailure(fresh),
                failureSeverity(fresh),
                credentialsRejectedCode("refresh", fresh),
              ));
            return;
          }
          noteAcceptedToken(oauthToken);
          let xe = await To(fresh, "proactive_refresh", 0, now, ce);
          if (xe === "suppressed_teleported") H = !0;
          if (xe === "rebuilt")
            ((R = !0),
              (j = { leg: "ok" }),
              logForDebugging("[remote-bridge] Transport rebuilt (proactive refresh)"));
        } catch (err) {
          if (
            (logForDebugging(`[remote-bridge] Proactive refresh rebuild failed: ${errorMessage(err)}`, {
              level: "error",
            }),
            logForDiagnosticsNoPII("error", "bridge_repl_v2_proactive_refresh_failed"),
            !I && !re)
          )
            ((_ = `Refresh failed: ${errorMessage(err)}`),
              (S = "refresh_rebuild_failed"),
              (D = "terminal"),
              (j = { leg: "bad", code: "rebuild_threw" }));
        } finally {
          let L = H;
          if (isTeleportedSession(sid)) L = !0;
          if (j !== void 0 && !y && !I && !(L && j.leg === "bad")) co(j);
          if (!wi(i)) return;
          vi();
          let le = be;
          if (((be = void 0), L)) {
            if (le !== void 0 && !I) ve("Session teleported to cloud");
          } else if (le !== void 0 && !R && !I && !Se) {
            let ce = Rn(le.code, le.cause, le.detail, !0, le.at);
            if (_ !== void 0 && !ce && !I && !Be) ve(_, D);
          } else if (le !== void 0 && R && !I) {
            if (Zi(le.code) && !y)
              ht(CLOSE_CODE_RECOVERY[le.code].recoveredCode, { recovery_bucket: Nn(Date.now() - le.at) });
          } else if (_ !== void 0 && !I) {
            if ((ve(_, D), S !== void 0 && S !== "refresh_credentials_rejected" && !y)) ke(S);
          }
        }
      })();
    },
    label: "remote",
  });
  if (
    (refresh.scheduleFromExpiresIn(sessionId, bridgeCredentials.expires_in),
    (kr = ownerPin?.subscribe(() => {
      lr("owner_changed");
    })),
    Mt())
  )
    lr("owner_changed");
  let Kt;
  function wireTransportCallbacks() {
    (transport.setOnConnect((y) => {
      if (re) return;
      if (
        (clearTimeout(cr),
        (sr = 0),
        (Mr = void 0),
        (tt = void 0),
        (Se = !1),
        (dr = void 0),
        (Tt = void 0),
        (Et = !1),
        Xn(),
        (Me = void 0),
        De.size > 0)
      ) {
        let last = [...De.values()].findLast((_) => _.details !== void 0);
        ($e("requires_action", last?.details), Gt.clear());
      } else if (vo === "running" && Pt(() => !0)) $e("running");
      if (
        (logForDebugging("[remote-bridge] v2 transport connected"),
        logForDiagnosticsNoPII("info", "bridge_repl_v2_transport_connected"),
        resendReceipts(),
        flushHistory(y),
        transcriptMirrorMode === "deferred")
      ) {
        if (Yt === void 0 && !ns)
          reportTranscriptDeferred(on, () => {
            ns = !0;
          });
      } else {
        if (fr)
          reportTranscriptDeferred(null, () => {
            fr = !1;
          });
        Ao();
      }
      if (
        (logEvent("tengu_bridge_repl_ws_connected", {
          v2: !0,
          cause: fromEnum(connectCause),
          ...(wo > 0 && { remint_attempts: wo }),
        }),
        !Wt && qt())
      )
        ((Wt = !0), logFeatureOk("bridge_presence"));
      if (transcriptMirrorMode === "deferred") {
        if (!yr && De.size === 0) {
          let R = initialMessages
            ?.filter((_) => isEligibleBridgeMessage(_))
            .findLast((_) => !isAttachmentOrConsentFallback(_));
          if (Pt(() => R !== void 0 && isRealUserTurn(R) && !isInterruptionMessage(R))) $e("running");
        }
        yr = !0;
      }
      if (!yr && initialMessages && initialMessages.length > 0 && !reattachFellBackToFresh) {
        yr = !0;
        let R = transport,
          _ = flushInitialHistory(initialMessages),
          withResolvers = Promise.withResolvers();
        (_.catch((D) => logForDebugging(`[remote-bridge] flushHistory failed: ${D}`)).finally(() => {
          if ((withResolvers.resolve(), transport !== R || I || re || Be)) return;
          (drainFlushGate(), Tr());
        }),
          (io = Promise.all([_, withResolvers.promise])),
          io.catch(() => {}));
      } else if (Ir) Tr();
      else if ((messageFlushGate.active || frameFlushGate.active) && !Be) (ar(), drainFlushGate(), Tr());
      else if (!messageFlushGate.active) Tr();
      (Ja(), (Rr = transport));
    }),
      transport.setOnData((data) => {
        if (re) return;
        if (Kt !== void 0) {
          Kt.push(data);
          return;
        }
        if (!Mt()) {
          i(data);
          return;
        }
        ((Kt = [data]), r());
      }));
    let e = transport;
    transport.setOnClose((y, R, _) => {
      if (Rr === e) Rr = void 0;
      let now = Date.now();
      return Rn(y, R, _, !1, Math.min(now, e.lastFrameReadAt() ?? now));
    });
    function r() {
      lr("owner_changed").then((res) => {
        let R = Kt;
        if (R === void 0) return;
        if (res || I) {
          Kt = void 0;
          return;
        }
        let _ = R.length;
        while (R.length > 0) {
          if (re || I) {
            Kt = void 0;
            return;
          }
          if (_ === 0 && Mt()) {
            r();
            return;
          }
          _ = Math.max(0, _ - 1);
          let S = R.shift();
          if (S !== void 0) i(S);
        }
        Kt = void 0;
      });
    }
    function i(req) {
      handleIngressMessage(
        req,
        recentPostedUUIDs,
        recentInboundUUIDs,
        (code) => {
          if (isHumanInboundMessage(code, "bridge")) (br.noteActivity(), Ot("client_prompt"));
          let _ =
            onInboundMessage !== void 0 && code.type === "user" && isBridgeInboundReadReceiptsEnabled()
              ? Vt(code.uuid)
              : null;
          if (_ === null) return onInboundMessage?.(code);
          return withReadReceiptClaim(_, () => onInboundMessage?.(code));
        },
        onPermissionResponse
          ? (R) => {
              if (onPermissionResponse(R)) {
                let _ = R.response.subtype === "success" && !!R.response.response;
                if (_) (br.noteActivity(), Ot("client_input"));
                if ((go(R.response.request_id, _), !Rt)) mo();
              }
            }
          : void 0,
        (R) => {
          if (C6n(R)) (br.noteActivity(), Ot("client_input"));
          handleReplBridgeControlRequest(R, {
            transport: transport,
            sessionId: sessionId,
            onInterrupt: onInterrupt,
            onStopTask: onStopTask,
            onBackgroundTasks: onBackgroundTasks,
            onCancelAsyncMessage: onCancelAsyncMessage,
            reportsInboundReadReceipts: () =>
              onInboundMessage !== void 0 && isBridgeInboundReadReceiptsEnabled(),
            getInitializeState: getInitializeState,
            claudeCodeVersion: {
              ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
              PACKAGE_URL: "@anthropic-ai/claude-code",
              README_URL: "https://code.claude.com/docs/en/overview",
              VERSION: "2.1.316",
              FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
              BUILD_TIME: "2026-10-30T23:28:13Z",
              GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
              HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
              DD_SOURCEMAP_GROUP: "default",
            }.VERSION,
            getCommands: getCommands,
            getPendingPrompts: La,
            onDialogKindsDeclared: onDialogKindsDeclared,
            onClientInitialize: Xa,
            onSetModel: onSetModel,
            onSetMaxThinkingTokens: onSetMaxThinkingTokens,
            onSetPermissionMode: onSetPermissionMode,
            onApplyFlagSettings: onApplyFlagSettings,
            onRenameSession: onRenameSession,
            onSetColor: onSetColor,
            onFileSuggestions: onFileSuggestions,
            onReadFile: onReadFile,
            onGetWorkspaceDiff: onGetWorkspaceDiff,
            onSideQuestion: onSideQuestion,
            onGetContextUsage: onGetContextUsage,
            answerSharedControlRequest: answerSharedControlRequest,
            onMcpAuthenticate: onMcpAuthenticate,
            onMcpOauthCallbackUrl: onMcpOauthCallbackUrl,
            onMcpReconnect: onMcpReconnect,
            onMcpSetServers: Oa,
            onForkConversation: onForkConversation,
            hasPendingPrompts: () => De.size > 0,
            outboundOnly: outboundOnly,
            writeFrame: (_) => {
              if (et(_.type)) return;
              writeOrQueueFrame(_, _.type);
            },
            cancellableRequests: flushGate,
          });
        },
        (R) => flushGate.get(R)?.abort(),
        onQueuedNotification,
      );
    }
  }
  function Rn(e, r, i, y, R) {
    let _ = !1;
    if ((clearTimeout(cr), I || re)) return (Ni(0, [], transport.discardUndeliveredEvents?.() ?? []), !1);
    if (!y)
      (logForDebugging(
        `[remote-bridge] v2 transport closed (code=${e}${i ? ` source=${i.rejectSource}` : ""})`,
      ),
        logEvent("tengu_bridge_repl_ws_closed", {
          code: e,
          v2: !0,
          close_cause: fromEnumOpt(r),
          recovery_in_flight: Be,
          ...(i !== void 0 && { reject_source: fromEnum(i.rejectSource) }),
        }));
    if (Be) {
      let W = ir ? Date.now() - ir : 0;
      if (W <= Ci) return ((be = { code: e ?? 4092, cause: r, detail: i, at: be?.at ?? Mr ?? R }), !1);
      (logForDebugging(
        `[remote-bridge] authRecoveryInFlight held ${Math.round(W / 1000)}s (> ceiling ${Math.round(Ci / 1000)}s) \u2014 treating as leaked, handling close directly`,
        { level: "error" },
      ),
        logForDiagnosticsNoPII("error", "bridge_repl_v2_recovery_flag_leaked"),
        Si(),
        (be = void 0),
        (_ = !0));
    }
    if (Zi(e)) {
      if (sr >= Mi) {
        if (
          (logForDebugging(`[remote-bridge] ${e} recovery exhausted after ${sr} attempts`, {
            level: "error",
          }),
          ve(`Transport recovery exhausted (code ${e})`),
          !Se)
        )
          ke("recovery_exhausted", { close_code: e });
        return !1;
      }
      if (e === 4094 && !y) {
        if (ln >= Mi) {
          if (
            (logForDebugging(
              `[remote-bridge] worker-credential recovery exhausted after ${ln} attempts with no successful heartbeat between them`,
              { level: "error" },
            ),
            ve("Transport recovery exhausted (worker credential failures)", "auth"),
            !Se)
          )
            ke("cred_recovery_exhausted");
          return !1;
        }
        ln++;
      }
      if (e === 4093 && !y) {
        let charge = ki.charge(Date.now(), to());
        switch (charge) {
          case "hourly_exhausted":
          case "daily_exhausted": {
            let z = charge === "hourly_exhausted" ? 1 : 24;
            if (
              (logForDebugging(`[remote-bridge] heartbeat recovery budget exhausted (${z}h window)`, {
                level: "error",
              }),
              ve(charge === "hourly_exhausted" ? Ps : Os),
              !Se)
            )
              ke("heartbeat_budget_exhausted", { window_h: z });
            return !1;
          }
          case "charged":
            break;
        }
      }
      return (sr++, (Mr ??= R), Ka(e), !1);
    }
    let S = (y || _) && Er,
      D = classifySupersession(e, r);
    if (D !== void 0 && !(S && isNotArchived(D))) Me = D;
    let j = S && r === "superseded_by_worker" ? void 0 : r,
      H =
        e === 4090 &&
        (j === "superseded_by_worker" || j === "session_not_active" || j === "session_not_found");
    if (
      (ve(
        H ? describeBridgeCloseCode(e, j) : `Transport closed: ${describeBridgeCloseCode(e, j, i)}`,
        H ? "ended_elsewhere" : "terminal",
      ),
      Se)
    )
      return H;
    if (e === 4090)
      if (y && Er) ke("transport_closed_4090");
      else (ht("transport_closed_4090"), (Se = !0));
    else if (e === 403) uo(i);
    else ke(e === 404 ? "transport_closed_404" : "transport_closed_other");
    return H;
  }
  async function To(e, r, i, y, R) {
    if ((raiseWorkerEpoch(e.worker_epoch), isTeleportedSession(sessionId)))
      return (
        logForDebugging(`[remote-bridge] Rebuild suppressed for teleported session ${sessionId}`),
        "suppressed_teleported"
      );
    ((connectCause = r),
      (wo = i),
      (Me = void 0),
      (Er = !0),
      (hn = !1),
      bo?.(),
      Sn(),
      messageFlushGate.start(),
      frameFlushGate.start());
    try {
      let _ = transport,
        lastSequenceNum = _.getLastSequenceNum(),
        D = _.isLongPolling?.() === !0;
      if (
        ((Rr = void 0),
        _.close({ goodbye: !1, retainUndelivered: !0 }),
        (transport = await createV2ReplTransport({
          ...gi(),
          sessionUrl: buildCCRv2SdkUrl(e.api_base_url, sessionId),
          ingressToken: e.worker_jwt,
          sessionId: sessionId,
          epoch: e.worker_epoch,
          initialSequenceNum: lastSequenceNum,
          initialLongPollMode: D,
          onConnectNeedsRecord: ro && !wn,
          getAuthToken: () => e.worker_jwt,
        })),
        I)
      )
        return (transport.close(), "rebuilt");
      if (re) return (transport.close(), "suppressed_owner_changed");
      (wireTransportCallbacks(),
        transport.connect(),
        carryOverUndeliveredEvents(_),
        vn?.(),
        reseedBridgePermissionMode(),
        reseedBridgeCrossSessionInbound(),
        reseedBridgeModel(),
        reseedBridgeArtifacts(),
        reseedBridgePostTurnSummary(),
        resendBridgeEffortMetadata(),
        reseedBridgeContextUsage(),
        onTransportRebuilt?.(),
        (cr = setTimeout(onConnectTimeout, cfg.connect_timeout_ms, connectCause)),
        refresh.scheduleFromExpiresIn(sessionId, e.expires_in),
        (worker_jwt = e.worker_jwt),
        (worker_epoch_2 = e.worker_epoch),
        (api_base_url = e.api_base_url));
      let j = xt !== 0 && (Lt || y < xt);
      xt = 0;
      let H = R < tn;
      Lt = j || H;
      try {
        Pa(e, H);
      } catch (error) {
        (logError(error), logFeatureBad("bridge_webagent_mcp_inject", "refresh_threw"));
      }
      drainFlushGate();
    } finally {
      (messageFlushGate.deactivate(), frameFlushGate.deactivate());
    }
    return "rebuilt";
  }
  async function Qi(e, r, i) {
    let y = !i && onClassifyMissingOAuthToken !== void 0 && qt() && isBridgeSignedOutNeutralEnabled(),
      R = y ? await onClassifyMissingOAuthToken(e) : void 0;
    if (y && (I || ae !== r)) return;
    if (R === "signed_out") {
      if (
        (logForDebugging(
          `[remote-bridge] Signed out on this machine under ${sessionId} (${e}) \u2014 stopping`,
        ),
        logForDiagnosticsNoPII("info", "bridge_repl_v2_signed_out"),
        ht("signed_out"),
        !Wt)
      )
        logFeatureSad("bridge_connect", "signed_out");
      ((Se = !0), ve(pa, "auth"));
      return;
    }
    if ((ve(ca, "auth"), !i)) ke("recovery_no_oauth_token");
  }
  async function qa(e, r, i, y) {
    let now = Date.now();
    (logForDiagnosticsNoPII("info", "bridge_repl_v2_remint_loop_entered"), (un = !0));
    let _ = 0;
    try {
      let S = !1,
        D = 0;
      for (let j = 1; !I; j++) {
        if (ae !== r) return { creds: null, attempts: _ };
        let rounded = Math.round((Date.now() - now) / 60000);
        fn(
          `${workSecretCredentials ? "Remote Control credentials unavailable" : "Remote Control server unreachable"} \u2014 retrying (attempt ${j}${rounded > 0 ? `, ${rounded}m elapsed` : ""})`,
        );
        let min = Math.min(Ms * 2 ** (j - 1), qo);
        if ((await sleep(Math.max(Math.random() * min, ks)), I)) break;
        if (ae !== r) return { creds: null, attempts: _ };
        if (((ir = Date.now()), isTeleportedSession(sessionId)))
          return (
            ve("Session teleported to cloud"),
            logForDiagnosticsNoPII("info", "bridge_repl_v2_remint_loop_teleported"),
            { creds: null, attempts: _ }
          );
        let z = getLaneToken();
        if (!z)
          return (
            logForDiagnosticsNoPII("info", "bridge_repl_v2_remint_loop_no_oauth"),
            await Qi("remint_loop", r, i),
            { creds: null, attempts: _ }
          );
        let L = await refetchCredentials(z, r);
        if (((_ = j), I)) break;
        if (ae !== r) return { creds: null, attempts: _ };
        if (L === null) {
          if ((D++, y === void 0 || D < y.attempts)) continue;
          if (
            (logForDebugging(
              `[remote-bridge] Re-mint loop exhausted (code ${e}): ${D} unreachable attempts, ${Math.round((Date.now() - now) / 1000)}s`,
              { level: "error" },
            ),
            logForDiagnosticsNoPII("info", "bridge_repl_v2_remint_loop_exhausted", {
              attempts: _,
              elapsed_ms: Date.now() - now,
              queued_writes_dropped:
                messageFlushGate.pendingCount + frameFlushGate.pendingCount + frameFlushGate.evictedCount,
            }),
            ve(y.exhaustedDetail),
            !i)
          )
            ke("recovery_exhausted", { close_code: e, remint_attempts: _ });
          return { creds: null, attempts: _ };
        }
        if (isCredentialsRejection(L)) {
          if (onAuth401 && !S) {
            if (await Pr("owner_changed_recovery", r)) return { creds: null, attempts: _ };
            S = !0;
            let le = !1;
            try {
              le = await onAuth401(z);
            } catch (error) {
              logForDebugging(`[remote-bridge] Re-mint loop OAuth refresh threw: ${errorMessage(error)}`, {
                level: "error",
              });
            }
            if (I) break;
            if (ae !== r) return { creds: null, attempts: _ };
            if (le) {
              logForDebugging(
                "[remote-bridge] Re-mint rejected after outage \u2014 OAuth refresh succeeded; retrying with the refreshed credential",
              );
              continue;
            }
          }
          if ((ve(Yn, "auth"), !i)) ke("recovery_credentials_rejected");
          return (
            logForDiagnosticsNoPII("info", "bridge_repl_v2_remint_loop_rejected"),
            { creds: null, attempts: _ }
          );
        }
        if (isCredentialsFailure(L)) {
          if ((ve(describeCredentialFailure(L), failureSeverity(L)), !i))
            ke(credentialsRejectedCode("recovery", L));
          return (
            logForDiagnosticsNoPII("info", "bridge_repl_v2_remint_loop_denied"),
            { creds: null, attempts: _ }
          );
        }
        return (
          logForDebugging(
            `[remote-bridge] Re-mint loop succeeded (code ${e}, attempt ${j}, ${Math.round((Date.now() - now) / 1000)}s)`,
          ),
          logForDiagnosticsNoPII("info", "bridge_repl_v2_remint_loop_recovered", {
            attempts: j,
            elapsed_ms: Date.now() - now,
          }),
          { creds: L, attempts: _ }
        );
      }
      return { creds: null, attempts: _ };
    } finally {
      if (ae === r) un = !1;
    }
  }
  let CLOSE_CODE_RECOVERY = {
    401: {
      reconnectingDetail: "JWT expired \u2014 refreshing",
      cause: "auth_401_recovery",
      failureDiagnostic: "bridge_repl_v2_jwt_refresh_failed",
      fetchFailure: "terminal",
      remintCap: void 0,
      recoveredCode: "recovered_auth_401",
      needsOAuthRefresh: !0,
    },
    4091: {
      reconnectingDetail: "CCR init failed \u2014 retrying",
      cause: "init_4091_recovery",
      failureDiagnostic: "bridge_repl_v2_4091_recovery_failed",
      fetchFailure: "terminal",
      remintCap: void 0,
      recoveredCode: "recovered_init_4091",
      needsOAuthRefresh: !1,
    },
    4093: {
      reconnectingDetail: "presence heartbeats failing \u2014 reconnecting",
      cause: "heartbeat_4093_recovery",
      failureDiagnostic: "bridge_repl_v2_4093_recovery_failed",
      fetchFailure: "retry",
      remintCap: Is,
      recoveredCode: "recovered_heartbeat_4093",
      needsOAuthRefresh: !1,
    },
    4094: {
      reconnectingDetail: "worker credential expired \u2014 re-minting",
      cause: "cred_4094_recovery",
      failureDiagnostic: "bridge_repl_v2_4094_recovery_failed",
      fetchFailure: "terminal",
      remintCap: void 0,
      recoveredCode: "recovered_cred_4094",
      needsOAuthRefresh: !0,
    },
  };
  function Zi(e) {
    if (e === 4094) return isBridgeAuthReviveEnabled();
    return e === 401 || e === 4091 || e === 4093;
  }
  let es = 30000,
    Ga = 5000;
  function rebuildTransport(fresh, cause) {
    if (CLOSE_CODE_RECOVERY[fresh].fetchFailure === "terminal") {
      ve(cause);
      return;
    }
    (messageFlushGate.start(),
      frameFlushGate.start(),
      fn("presence recovery failed \u2014 retrying"),
      logForDebugging(`[remote-bridge] ${fresh} recovery fetch failed \u2014 retrying in ${es}ms`),
      ar());
    let i = transport;
    function recoverFromAuthFailure() {
      if (((pt = void 0), I)) return;
      if (sr === 0) {
        if (messageFlushGate.active || frameFlushGate.active) {
          if (Be) {
            pt = setTimeout(recoverFromAuthFailure, Ga);
            return;
          }
          (drainFlushGate(), Tr());
        }
        return;
      }
      if (transport !== i) return;
      Rn(fresh, void 0, void 0, !0, Mr ?? Date.now());
    }
    pt = setTimeout(recoverFromAuthFailure, es);
  }
  async function Ka(e) {
    let r = Se,
      i = Mr ?? Date.now();
    if (isTeleportedSession(sessionId)) {
      ve("Session teleported to cloud");
      return;
    }
    if (Be) return;
    let stale = Ri();
    (messageFlushGate.start(),
      frameFlushGate.start(),
      fn(CLOSE_CODE_RECOVERY[e].reconnectingDetail),
      logForDebugging(`[remote-bridge] ${e} on transport \u2014 attempting credential refresh + rebuild`));
    try {
      if (await Pr("owner_changed_recovery", stale)) return;
      let R = getAccessToken(),
        _ = !0,
        S = TXt();
      if (!workSecretCredentials && CLOSE_CODE_RECOVERY[e].needsOAuthRefresh && onAuth401)
        try {
          _ = await onAuth401(R ?? "", "stale");
        } catch (error) {
          ((_ = !1),
            logForDebugging(`[remote-bridge] ${e} recovery OAuth refresh threw: ${errorMessage(error)}`, {
              level: "error",
            }));
        }
      else if (!workSecretCredentials && onProactiveRefresh)
        try {
          await onProactiveRefresh();
        } catch (error) {
          logForDebugging(`[remote-bridge] pre-recovery token refresh failed: ${errorMessage(error)}`, {
            level: "error",
          });
        }
      if (ae !== stale) return;
      let D = getLaneToken() ?? R,
        j = D === heldHostSessionsBearer();
      if (!D || I) {
        if (!I) await Qi("recovery", stale, r);
        return;
      }
      if (isTeleportedSession(sessionId)) {
        ve("Session teleported to cloud");
        return;
      }
      let now = Date.now(),
        W = tn,
        fresh = await withRetry(() => refetchCredentials(D, stale), "fetchRemoteCredentials (recovery)", cfg);
      if (ae !== stale) return;
      if (
        (!fresh || isCredentialsRejection(fresh)) &&
        !I &&
        CLOSE_CODE_RECOVERY[e].needsOAuthRefresh &&
        onAuth401 &&
        !_
      ) {
        let ce = !1;
        for (let ne = 1; ne <= cfg.oauth_retry_max_attempts && !I; ne++) {
          if (
            (fn(
              `OAuth refresh failed \u2014 waiting for a fresh login (${ne}/${cfg.oauth_retry_max_attempts})`,
            ),
            await sleep(
              backoffDelayMs({
                attempt: ne,
                baseMs: cfg.oauth_retry_base_delay_ms,
                jitter: { kind: "symmetric", ratio: cfg.init_retry_jitter_fraction },
              }),
            ),
            await Pr("owner_changed_recovery", stale))
          )
            return;
          let xe;
          try {
            xe = onReadFreshOAuthToken
              ? await onReadFreshOAuthToken()
              : (await onAuth401(R ?? ""))
                ? getAccessToken()
                : void 0;
          } catch (err) {
            logForDebugging(
              `[remote-bridge] Adopt-loop token read threw (attempt ${ne}): ${errorMessage(err)}`,
              { level: "error" },
            );
          }
          if (I || ae !== stale) return;
          let qe = xe !== void 0 && xe !== (R ?? "") ? xe : void 0;
          if (!qe) continue;
          if (((ce = !0), isTeleportedSession(sessionId))) {
            ve("Session teleported to cloud");
            return;
          }
          fresh = await withRetry(
            () => refetchCredentials(qe, stale),
            "fetchRemoteCredentials (recovery re-poll)",
            cfg,
          );
          break;
        }
        if (ae !== stale) return;
        if (isCredentialsRejection(fresh) && !ce) {
          if (!I) {
            let ne = Fi(S);
            if (ne !== void 0) {
              if (
                (logForDiagnosticsNoPII("info", "bridge_repl_v2_recovery_host_declined"),
                ve(Li(ne), $i(ne)),
                !r)
              )
                if (Wt) (ht(ne), (Se = !0));
                else ke("recovery_reauth_required");
              return;
            }
            if ((ve("OAuth token refresh failed \u2014 run /login to re-authenticate", "auth"), !r))
              ke("recovery_reauth_required");
          }
          return;
        }
      }
      if (I) return;
      if (!fresh && CLOSE_CODE_RECOVERY[e].fetchFailure === "retry" && !to()) {
        rebuildTransport(e, `could not fetch fresh session credentials after code ${e}`);
        return;
      }
      if (
        isCredentialsRejection(fresh) &&
        (!CLOSE_CODE_RECOVERY[e].needsOAuthRefresh || (_ && D === R && j)) &&
        onAuth401
      ) {
        if (await Pr("owner_changed_recovery", stale)) return;
        let ce = !1;
        try {
          ce = await onAuth401(CLOSE_CODE_RECOVERY[e].needsOAuthRefresh ? D : (R ?? ""));
        } catch (error) {
          logForDebugging(`[remote-bridge] ${e} late OAuth refresh threw: ${errorMessage(error)}`, {
            level: "error",
          });
        }
        if (I || ae !== stale) return;
        if (ce) {
          if (
            ((fresh = await withRetry(
              () => refetchCredentials(getAccessToken() ?? R ?? "", stale),
              `fetchRemoteCredentials (${e} late refresh)`,
              cfg,
            )),
            I || ae !== stale)
          )
            return;
        }
      }
      if (isCredentialsRejection(fresh)) {
        if ((ve(Yn, "auth"), !r)) ke("recovery_credentials_rejected");
        return;
      }
      let L = 0;
      if (!fresh) {
        let ce = await qa(e, stale, r, to() ? CLOSE_CODE_RECOVERY[e].remintCap : void 0);
        if (((fresh = ce.creds), (L = ce.attempts), !fresh || I || ae !== stale)) return;
      }
      if (isCredentialsFailure(fresh)) {
        if (!I) {
          if ((ve(describeCredentialFailure(fresh), failureSeverity(fresh)), !r))
            ke(credentialsRejectedCode("recovery", fresh));
        }
        return;
      }
      if (ae !== stale) return;
      let le = await To(fresh, CLOSE_CODE_RECOVERY[e].cause, L, now, W);
      if (le === "suppressed_teleported") {
        ve("Session teleported to cloud");
        return;
      }
      if (le === "suppressed_owner_changed") return;
      if ((logForDebugging(`[remote-bridge] Transport rebuilt after ${e}`), !I)) {
        if (!r)
          ht(CLOSE_CODE_RECOVERY[e].recoveredCode, {
            ...(L > 0 && { remint_attempts: L }),
            recovery_bucket: Nn(Date.now() - i),
          });
      }
    } catch (error) {
      if (
        (logForDebugging(`[remote-bridge] ${e} recovery failed: ${errorMessage(error)}`, { level: "error" }),
        logForDiagnosticsNoPII("error", CLOSE_CODE_RECOVERY[e].failureDiagnostic),
        !I && !re)
      ) {
        if (
          (rebuildTransport(e, `Transport recovery failed (${e}): ${errorMessage(error)}`),
          CLOSE_CODE_RECOVERY[e].fetchFailure === "terminal" && !r)
        )
          ke("recovery_failed");
      }
    } finally {
      if (wi(stale)) {
        if ((vi(), pt !== void 0 && be !== void 0)) {
          ar();
          let R = be;
          ((be = void 0), Rn(R.code, R.cause, R.detail, !0, R.at));
        } else be = void 0;
        if (pt === void 0 && !Be) (messageFlushGate.drop(), frameFlushGate.drop(), ($t = !1));
      }
    }
  }
  if ((wireTransportCallbacks(), !isReattach && initialMessages && initialMessages.length > 0))
    (messageFlushGate.start(), frameFlushGate.start());
  (transport.connect(), (cr = setTimeout(onConnectTimeout, cfg.connect_timeout_ms, connectCause)));
  function Pt(e) {
    return isTurnLive ? isTurnLive(e) : e();
  }
  function toLiveSdkEvents(e) {
    return toRedactedSdkEvents(e, "live").map((r) => {
      if (r.type !== "assistant" || r.parent_tool_use_id !== null || r.uuid === void 0)
        return { ...r, session_id: sessionId };
      let i = or.get(r.uuid);
      if (i === void 0) return { ...r, session_id: sessionId };
      return (
        or.delete(r.uuid),
        { ...r, session_id: sessionId, user_message_uuid: i, user_message_uuids: [i] }
      );
    });
  }
  function drainFlushGate() {
    let e = transcriptMirrorMode === "deferred",
      r = e
        ? messageFlushGate.end().filter((H) => hasUserMessagingToolUse(H.message))
        : messageFlushGate.end(),
      i = e ? frameFlushGate.end().filter((H) => !isTaskLifecycleMessage(H.frame)) : frameFlushGate.end(),
      y = $t;
    if ((($t = !1), r.length === 0 && i.length === 0)) {
      if (e && Pt(() => y) && De.size === 0) $e("running");
      return;
    }
    let R = [],
      _ = [],
      S = () => {
        if (_.length > 0) (R.push(...toLiveSdkEvents(_)), (_ = []));
      },
      D = 0,
      j = 0;
    while (D < r.length || j < i.length) {
      let H = r[D],
        W = i[j];
      if (H && (!W || H.seq < W.seq))
        (recentPostedUUIDs.add(H.message.uuid), sn.add(H.message.uuid), (Co = !0), _.push(H.message), D++);
      else if (W) {
        S();
        let frame = W.frame;
        if ("uuid" in frame && typeof frame.uuid === "string") no.add(frame.uuid);
        (R.push(Object.assign({}, frame, { session_id: sessionId })), j++);
      }
    }
    if ((S(), Pt(() => y) && De.size === 0)) $e("running");
    (logForDebugging(
      `[remote-bridge] Drained ${r.length} queued message(s) and ${i.length} SDK event(s) / control frame(s) after flush`,
    ),
      transport.writeBatch(R));
  }
  function carryOverUndeliveredEvents(e) {
    let r = e.takeUndeliveredEvents?.() ?? [];
    if (r.length === 0) return;
    (logForDebugging(
      `[remote-bridge] Carrying ${r.length} undelivered client event(s) over to the rebuilt transport`,
    ),
      logForDiagnosticsNoPII("info", "bridge_repl_v2_events_carried_over", { count: r.length }),
      logEvent("tengu_bridge_repl_events_carried_over", { count: r.length }),
      transport.adoptUndeliveredEvents?.(r));
  }
  function writeOrQueueFrame(e, r) {
    let i = e.type !== "result" && Ir && !Be,
      [y] = accountMemoryRedactor.redact([e], "events", "live");
    if (y === void 0) return;
    if (!i && frameFlushGate.enqueue({ seq: oo++, frame: y })) {
      logForDebugging(`[remote-bridge] Queued ${r} during flush`);
      return;
    }
    (transport.write(y), logForDebugging(`[remote-bridge] Sent ${r}`));
  }
  async function flushInitialHistory(e) {
    accountMemoryRedactor.note(e);
    let filtered = e.filter(isEligibleBridgeMessage),
      i = sliceTailKeepingGroups(filtered, initialHistoryCap);
    if (i.length < filtered.length)
      logForDebugging(
        `[remote-bridge] Capped initial flush: ${filtered.length} -> ${i.length} (cap=${initialHistoryCap})`,
      );
    let events = toRedactedSdkEvents(i).map((_) => ({ ..._, session_id: sessionId, historical: !0 }));
    if (events.length === 0) return;
    let last = filtered.findLast((_) => !isAttachmentOrConsentFallback(_));
    if (Pt(() => last !== void 0 && isRealUserTurn(last) && !isInterruptionMessage(last)) && De.size === 0)
      $e("running");
    (logForDebugging(`[remote-bridge] Flushing ${events.length} history events`),
      await transport.writeBatch(events));
  }
  let wn = !1,
    Ir = !1,
    Co = !1,
    ns = !1,
    fr = !1;
  function reportTranscriptDeferred(e, r) {
    let i = transport,
      y = i.droppedWorkerStatePatchCount?.() ?? 0;
    (i.reportInternalMetadata?.({ transcript_upload_deferred: e }),
      i.flushWorkerState?.().then((R) => {
        if (R && (i.droppedWorkerStatePatchCount?.() ?? 0) === y) r();
      }));
  }
  let Dr;
  function flushHistory(msgs) {
    if (wn) return;
    if (((wn = !0), transcriptMirrorMode === "deferred")) {
      (transport.reportMetadata({ transcript_mirror: "deferred" }), os());
      return;
    }
    if (!ro) return;
    let r = msgs === void 0 || msgs.readFailed === !0,
      i = r ? void 0 : msgs.internal?.transcript_upload_deferred;
    if (Lo(i) && (noHistoryBackfill || remoteControlOrigin === void 0)) {
      if (!re) transport.reportMetadata({ transcript_mirror: "live" });
      ((fr = !0),
        reportTranscriptDeferred(null, () => {
          fr = !1;
        }));
    } else if (Lo(i)) {
      if (((on = i), (transcriptMirrorMode = "deferred"), os(), Co)) Yt = "rows_already_live";
      else if (!isBackfillScopeAllowedForOrigin(tr().scope, on)) Yt = "flag_off";
    } else if (
      (r || (i !== void 0 && i !== null)) &&
      isBackfillScopeAllowedForOrigin(tr().scope, remoteControlOrigin)
    )
      ((transcriptMirrorMode = "deferred"), (Yt = "marker_unreadable"));
  }
  let Yt;
  function Ja() {
    if (Yt === void 0) return;
    let e = Yt;
    ((Yt = void 0), Ot(e));
  }
  function os() {
    ((Dr = Date.now()),
      logForDebugging("[remote-bridge] Transcript upload deferred until a client opens this session"),
      logForDiagnosticsNoPII("info", "bridge_repl_transcript_deferred", { reattach: isReattach }),
      logEvent("tengu_bridge_transcript_deferral", {
        phase: fromEnum("deferred"),
        reattach: isReattach,
        hold_ms: Ht(),
      }));
  }
  let is = !1;
  function Xa() {
    if (transcriptMirrorMode !== "deferred" || is) {
      onClientInitialize?.();
      return;
    }
    is = !0;
    let e = Za();
    queueMicrotask(() => {
      Ot("client_open", e);
      try {
        onClientInitialize?.();
      } catch (error) {
        logForDebugging(
          `[remote-bridge] onClientInitialize failed after transcript release: ${errorMessage(error)}`,
        );
      }
    });
  }
  function Qa() {
    if (transcriptMirrorMode === "deferred" && !isBackfillScopeAllowedForOrigin(tr().scope, on))
      Ot("flag_off");
  }
  function Ot(e, r = Promise.resolve()) {
    if (wt) return wt;
    if (I || transcriptMirrorMode !== "deferred") return Promise.resolve();
    if (!re) transport.reportMetadata({ ...wr, transcript_mirror: "live" });
    ((wr = {}), (transcriptMirrorMode = "live"), (yr = !0));
    let i = De.size > 0;
    (logForDebugging(`[remote-bridge] Releasing deferred transcript (${e})`),
      (Ir = !0),
      messageFlushGate.start(),
      frameFlushGate.start(),
      (resolved = onTransportPersistenceReady ? Mo() : Promise.resolve()));
    let y = transport;
    return (
      (wt = r
        .then(() => ed(e, i))
        .catch((R) =>
          logForDebugging(`[remote-bridge] Transcript back-fill failed: ${errorMessage(R)}`, {
            level: "error",
          }),
        )
        .finally(() => {
          if (((Ir = !1), transport !== y || I || re || !wn)) return;
          if (Be) {
            dn = !0;
            return;
          }
          (drainFlushGate(), Ao());
        })),
      wt
    );
  }
  let Jt,
    resolved = Promise.resolve(),
    ss = [];
  function Mo() {
    return new Promise((e) => {
      ss.push(e);
    });
  }
  let jr = !1,
    ko;
  function as() {
    return Promise.resolve()
      .then(() => ko?.runNow())
      .catch(logError);
  }
  function Sn() {
    if (Jt !== void 0) ((jr = !0), (resolved = Mo()));
    onTransportPersistenceTeardown?.();
  }
  function Ao() {
    if (!onTransportPersistenceReady || Jt === transport) return;
    let e = transport.getInternalEventWriter?.(),
      r = e && accountMemoryRedactor.wrapInternalEventWriter(e),
      i = e && accountMemoryRedactor.wrapInternalEventWriter(e, "live"),
      y = r && i && ((_, S, D) => (typeof S.uuid === "string" && qi.has(S.uuid) ? i : r)(_, S, D)),
      R = transport.getInternalEventReaders?.();
    if (r && R) {
      let _ = !isReattach && Jt === void 0,
        S = transport;
      ((Jt = S),
        (jr = !0),
        (resolved = Mo()),
        (ko = onTransportPersistenceReady(
          r,
          R,
          sessionId,
          _,
          (D) => {
            if (D && Jt === S) {
              jr = !1;
              for (let j of ss.splice(0)) j();
            }
          },
          accountMemoryRedactor.note,
          y,
        )));
    }
  }
  function Za() {
    let e = transport;
    if (!e.setSubscribersReportedListener) return Promise.resolve();
    let promise = new Promise((i) => {
      e.setSubscribersReportedListener?.((y) => {
        if (y) i();
      });
    });
    return Promise.race([promise, sleep(Ld, void 0, { unref: !0 })]).finally(() =>
      e.setSubscribersReportedListener?.(void 0),
    );
  }
  async function ed(e, r) {
    if (I) return;
    let i = et("transcript backfill") ? void 0 : getBackfillMessages?.(sessionId);
    accountMemoryRedactor.note(i ?? []);
    let y = new Set(messageFlushGate.pending.map((L) => L.message.uuid)),
      eligible = (i ?? []).filter((L) => isEligibleBridgeMessage(L) && !sn.has(L.uuid) && !y.has(L.uuid)),
      _ = sliceTailKeepingGroups(eligible, tr().backfillMessages);
    (logForDebugging(
      `[remote-bridge] Back-filling ${_.length} of ${eligible.length} eligible message(s)${i === void 0 ? " (history withheld by host)" : ""}`,
    ),
      logForDiagnosticsNoPII("info", "bridge_repl_transcript_released", {
        reason: e,
        backfilled: _.length,
        eligible: eligible.length,
        withheld: i === void 0,
      }),
      logEvent("tengu_bridge_transcript_deferral", {
        phase: fromEnum("released"),
        reason: fromEnum(e),
        backfilled: _.length,
        eligible: eligible.length,
        history_withheld: i === void 0,
        deferred_ms: Dr === void 0 ? void 0 : Date.now() - Dr,
        hold_ms: Ht(),
      }));
    let events = toRedactedSdkEvents(_).map((L) => ({ ...L, session_id: sessionId, historical: !0 }));
    for (let L of eligible) (recentPostedUUIDs.add(L.uuid), initialMessageUUIDs.add(L.uuid));
    for (let L of _) sn.add(L.uuid);
    let last = eligible.findLast((L) => !isAttachmentOrConsentFallback(L)),
      j =
        r || De.size > 0 || Pt(() => last !== void 0 && isRealUserTurn(last) && !isInterruptionMessage(last));
    if (e !== "client_prompt" && !j && events.length > 0)
      events.push(Object.assign(buildBridgeResultMessage(sessionId), { historical: !0 }));
    let H = transport.droppedDurableBatchCount?.() ?? 0,
      W = transport;
    for (let L = 0; L < events.length; L += Yo) {
      if (I || re) return;
      if (transport !== W) {
        await transport.writeBatch(events.slice(L));
        break;
      }
      if ((await transport.writeBatch(events.slice(L, L + Yo)), L + Yo < events.length))
        await Promise.race([transport.flush(), sleep(Wd, void 0, { unref: !0 })]);
    }
    let z = transport;
    z.flush().then(() => {
      if ((z.droppedDurableBatchCount?.() ?? 0) > H)
        (logForDiagnosticsNoPII("warn", "bridge_repl_transcript_backfill_dropped"),
          logEvent("tengu_bridge_transcript_deferral", {
            phase: fromEnum("backfill_dropped"),
            reason: fromEnum(e),
            hold_ms: Ht(),
          }));
      if (I || re) return;
      ((fr = !0),
        reportTranscriptDeferred(null, () => {
          fr = !1;
        }));
    });
  }
  let Po = keepSessionOnTeardown === !0,
    _r;
  function td(e) {
    if (e?.skipArchive) Po = !0;
    if (e?.reason) _r = e.reason;
    if (an) return an;
    return ((I = !0), (an = teardown()), an);
  }
  async function teardown() {
    if ((Ui("teardown"), transcriptMirrorMode === "deferred"))
      logEvent("tengu_bridge_transcript_deferral", {
        phase: fromEnum("exited_unopened"),
        deferred_ms: Dr === void 0 ? void 0 : Date.now() - Dr,
        hold_ms: Ht(),
      });
    let e = tt ?? dr;
    if (e !== void 0) {
      if (!isTeleportedSession(sessionId)) {
        let ne = tt === void 0 ? xi() : void 0;
        if (ne !== void 0 && Wt && isBridgeHostDeclinedEndEnabled()) ht(ne);
        else ke(e);
      }
      ((tt = void 0), (dr = void 0), (Tt = void 0));
    } else if (!Se && be?.code === 403 && !isTeleportedSession(sessionId)) uo(be.detail);
    else if (
      !Se &&
      ((sr > 0 && (pt !== void 0 || Be)) || (be !== void 0 && be.code !== 4090)) &&
      !isTeleportedSession(sessionId)
    )
      ke("recovery_abandoned_at_teardown");
    if (
      (mn?.(),
      Gi(),
      Ki(),
      e9o(Ro),
      kr?.(),
      (kr = void 0),
      Sn(),
      rn(),
      (cn = !0),
      Sr(),
      refresh.cancelAll(),
      clearTimeout(cr),
      ar(),
      _n(),
      transport.writeBatch(
        _r !== void 0
          ? [buildWorkerShuttingDownMessage(sessionId, _r), buildBridgeResultMessage(sessionId)]
          : [buildBridgeResultMessage(sessionId)],
      ),
      $e("idle"),
      Po || (un && _r !== "remote_control_disabled"))
    ) {
      let ne = keepSessionOnTeardown ? "skipped_host_owned" : Po ? "skipped_teleport" : "skipped_remint_loop",
        xe;
      if (er()) xe = await Bi("skip_archive_flush_timeout");
      else if (_r !== void 0) await Cr();
      let token = ji();
      (transport.close(),
        logEvent("tengu_bridge_repl_teardown", {
          v2: !0,
          archive_status: fromEnum(ne),
          archive_ok: !1,
          ...xe,
          ...token,
        }),
        await transport.flushGoodbye(),
        logForDebugging(`[remote-bridge] Teardown complete (skipArchive): session=${sessionId}`),
        logForDiagnosticsNoPII("info", "bridge_repl_v2_teardown"),
        ls());
      return;
    }
    let teardown_archive_timeout_ms = cfg.teardown_archive_timeout_ms,
      now = Date.now(),
      y = Wi(),
      R,
      _ = now,
      S = teardown_archive_timeout_ms;
    if (er() && y === void 0) {
      let ne = now + CLEANUP_TIMEOUT_MS - Xs;
      ((R = await Bi("exit_flush_timeout", now)),
        (_ = now + R.hold_preflush_ms),
        (S = Math.max(1, Math.min(teardown_archive_timeout_ms, ne - _))));
    }
    let D = _ + S,
      j = y === void 0 ? _o() : void 0,
      H = j?.token,
      W = await archiveRemoteBridgeSession(sessionId, baseUrl, H, orgUUID, S, y, storageV5),
      z = D - Date.now();
    if (W === 401 && j?.source === "current" && onAuth401 && z >= Fd)
      try {
        (await Promise.race([onAuth401(H ?? ""), sleep(z)]),
          (j = _o()),
          (H = j.token),
          (W = await archiveRemoteBridgeSession(
            sessionId,
            baseUrl,
            H,
            orgUUID,
            Math.max(1, D - Date.now()),
            y,
            storageV5,
          )));
      } catch (error) {
        logForDebugging(`[remote-bridge] Teardown 401 retry threw: ${errorMessage(error)}`, {
          level: "error",
        });
      }
    let L = Date.now() - _;
    if (_r !== void 0 && R === void 0) await Cr();
    let le = ji();
    transport.close();
    let ce = archiveStatusCode(W, Me);
    (logEvent("tengu_bridge_repl_teardown", {
      v2: !0,
      archive_status: fromEnum(ce),
      archive_credential: fromEnumOpt(j?.source),
      archive_ok: typeof W === "number" && W < 400,
      archive_http_status: typeof W === "number" ? W : W === "untrusted_device" ? 403 : void 0,
      archive_timeout: W === "timeout",
      archive_no_token: W === "no_token",
      ...R,
      archive_budget_ms: S,
      archive_ms: L,
      ...le,
    }),
      await transport.flushGoodbye(),
      logForDebugging(`[remote-bridge] Torn down (archive=${W})`),
      logForDiagnosticsNoPII("info", "bridge_repl_v2_teardown"),
      ls());
  }
  (logEvent("tengu_bridge_repl_started", {
    has_initial_messages: !!(initialMessages && initialMessages.length > 0),
    v2: !0,
    ccr_session_id: ye(toInfraSessionId(sessionId)),
    expires_in_s: bridgeCredentials.expires_in,
    inProtectedNamespace: isEvalBuild(),
    ...cooAttributes(),
  }),
    logFeatureOk("bridge_connect"));
  function et(e) {
    if (!re) return !1;
    return (logForDebugging(`[remote-bridge] Dropping ${e} after owner change`), !0);
  }
  function fl(e) {
    if ((Sr(), Oi() || outboundOnly || workSecretCredentials)) return "refused";
    if (lo()) return "sign_in_changed";
    if (so("a_start")) return (ds((r) => e.onSignInChecked(r)), "checking_sign_in");
    try {
      let r = api_base_url,
        start = e.start({ sessionId: sessionId, apiBaseUrl: r, accessToken: worker_jwt });
      if (start !== null) St = { tunnel: start, isRefusedBySession: e.isRefusedBySession, dialedBase: r };
    } catch (error) {
      (logForDebugging(`[remote-bridge] live preview: the starter threw: ${errorMessage(error)}`, {
        level: "error",
      }),
        logError(error));
    }
    return St === null ? "refused" : "started";
  }
  async function ds(e) {
    let r = !1;
    try {
      if (((r = (await fo("owner_changed_live_preview", { fresh: !0 })) === "unchanged" && Ai !== 0), r))
        Pi = Date.now();
    } catch (error) {
      (logForDebugging(`[remote-bridge] live preview: the owner check failed: ${errorMessage(error)}`, {
        level: "error",
      }),
        logError(error));
    } finally {
      try {
        e(r);
      } catch (err) {
        (logForDebugging(
          `[remote-bridge] live preview: the caller's report of the sign-in check threw: ${errorMessage(err)}`,
          { level: "error" },
        ),
          logError(err));
      }
    }
  }
  function _l() {
    if (St === null) return "refused";
    if (lo()) return "sign_in_changed";
    if (Fa("flag_refresh")) return "refused";
    if (!Ar()) {
      let e = Ii ? params.fixedCredentialNow?.() : void 0;
      switch (e) {
        case "as_at_init":
          return null;
        case "unreadable":
          return "sign_in_unreadable";
        case "replaced":
          return "sign_in_changed";
        case void 0:
          return "no_sign_in_check";
        default:
          return "no_sign_in_check";
      }
    }
    return so("a_start") ? "sign_in_in_doubt" : null;
  }
  function pl(e) {
    ds(() => e());
  }
  let Oo = {
    bridgeSessionId: sessionId,
    titleWriter: params.titleWriter,
    noHistoryBackfill: noHistoryBackfill || reattachFellBackToFresh,
    getJoinedProjectThread: void 0,
    requestInjectedMcpReassert: Ia,
    canAdoptInjectedMcp: Aa,
    detachForHandoff: () => {
      (refresh.cancelAll(), rn(), (cn = !0), Sr());
    },
    sessionGroupingId: effectiveGroupingId,
    outboundOnly: outboundOnly ?? !1,
    environmentId: "",
    sessionIngressUrl: bridgeCredentials.api_base_url,
    gitRepoUrl: gitRepoUrl,
    ...(workSecretCredentials && {
      getWorkerBearerToken: () => (I ? null : worker_jwt),
      getWorkerEpoch: () => worker_epoch_2,
    }),
    ...!1,
    getLastSequenceNum: () => transport.getLastSequenceNum(),
    settleUploadsBeforeHandoff: () => {
      if (wt !== void 0 || transcriptMirrorMode === "deferred" || jr) {
        let e = async () => {
          let r = Date.now() + Ws,
            i = async (y, R, _) => {
              let S = !1;
              if (
                (await Promise.race([
                  y.finally(() => {
                    S = !0;
                  }),
                  sleep(Math.max(0, _ - Date.now()), void 0, { unref: !0 }),
                ]),
                !S)
              )
                logForDiagnosticsNoPII("warn", "bridge_repl_handoff_wait_expired", { what: R });
            };
          if ((await i(Jt === transport ? as() : resolved, "transcript_copy_catch_up", r - zo), jr))
            logForDiagnosticsNoPII("warn", "bridge_repl_handoff_transcript_copy_behind");
          await i(
            Promise.all([
              transport.flush({ retryNow: !0 }),
              transport.flushInternalEvents?.({ retryNow: !0 }),
            ]),
            "upload_lanes",
            r,
          );
        };
        return (wt ?? Ot("handoff")).then(e).then(
          () => {},
          () => {},
        );
      }
      return er()
        ? Cr(zo).then(
            () => {},
            () => {},
          )
        : Promise.resolve();
    },
    awaitUploadsForHandoff: (e) =>
      settleRemoteBridgeDelivery(
        {
          sessionKind: () => {
            if (wt !== void 0 || transcriptMirrorMode === "deferred") return "deferred";
            if (er()) return "held";
            return onTransportPersistenceReady ? "live" : "no_transcript_copy";
          },
          release: () => wt ?? (transcriptMirrorMode === "deferred" ? Ot("handoff") : Promise.resolve()),
          isSessionOver: () => I || re,
          hasFailedForGood: () => Et,
          transport: () => transport,
          droppedBatches: (r) =>
            (r.droppedDurableBatchCount?.() ?? 0) + (r.getInternalEventBacklog?.().droppedBatches ?? 0),
          isConnected: () => Rr === transport && transport.isConnectedStatus(),
          transcriptCopy: onTransportPersistenceReady && {
            isInstalledOnCurrentTransport: () => Jt === transport,
            catchUp: () => resolved,
            wakeCatchUp: () => void as(),
          },
          firstHistoryFlush: () => io,
          holdsWrites: () =>
            messageFlushGate.active ||
            frameFlushGate.active ||
            messageFlushGate.pendingCount + frameFlushGate.pendingCount > 0,
          drainLanes: () =>
            Promise.all([
              transport.flush({ retryNow: !0 }),
              transport.flushInternalEvents?.({ retryNow: !0 }),
            ]).then(() => {}),
        },
        {
          budgetMs: e?.budgetMs ?? Ws,
          signal: e?.signal,
          log: (r) => logForDebugging(r),
          onBudgetPassed: (r) =>
            logForDiagnosticsNoPII("warn", "bridge_repl_handoff_upload_wait_expired", { what: r }),
          onFault: (r) =>
            logForDiagnosticsNoPII("warn", "bridge_repl_handoff_upload_wait_fault", { what: r }),
        },
      ),
    flush: () => (drainFlushGate(), Di()),
    writeMessages(e) {
      if (et("writeMessages")) return;
      accountMemoryRedactor.note(e, "live");
      for (let _ of e) if (!initialMessageUUIDs.has(_.uuid)) qi.add(_.uuid);
      let filtered = e.filter(
        (_) =>
          isEligibleBridgeMessage(_) && !initialMessageUUIDs.has(_.uuid) && !recentPostedUUIDs.has(_.uuid),
      );
      if (filtered.length === 0) return;
      if (!Vi)
        for (let _ of filtered) {
          let text = deriveTitleFromHumanTurn(_);
          if (text !== void 0 && onUserMessage?.(text, sessionId)) {
            Vi = !0;
            break;
          }
        }
      let any = filtered.some(Rt ? isPlainUserPrompt : isRealUserTurn);
      if (any) Rt = !1;
      if (!userMessageCallbackDone && any)
        ((userMessageCallbackDone = !0), markBridgePlaceholderUsed(sessionId, storageV5));
      let y = filtered;
      if (transcriptMirrorMode === "deferred") {
        if (((y = filtered.filter(hasUserMessagingToolUse)), y.length === 0)) {
          if (messageFlushGate.active) $t ||= any;
          else if (Pt(() => any) && De.size === 0) $e("running");
          return;
        }
      }
      if (messageFlushGate.enqueue(...y.map((_) => ({ seq: oo++, message: _ })))) {
        if (any) $t = !0;
        logForDebugging(`[remote-bridge] Queued ${y.length} message(s) during flush`);
        return;
      }
      for (let msg of y) (sn.add(msg.uuid), recentPostedUUIDs.add(msg.uuid));
      Co = !0;
      let R = toLiveSdkEvents(y);
      if (Pt(() => any) && De.size === 0) $e("running");
      (logForDebugging(`[remote-bridge] Sending ${y.length} message(s)`), transport.writeBatch(R));
    },
    reportMetadata(e) {
      if (et("reportMetadata")) return;
      if (transcriptMirrorMode === "deferred") {
        let { post_turn_summary: post_turn_summary, task_summary: task_summary, recap: recap, ...R } = e,
          _ = { post_turn_summary: post_turn_summary, task_summary: task_summary, recap: recap };
        for (let D of Object.keys(_)) if (D in e) wr[D] = _[D];
        let S = R;
        if ("post_turn_summary" in e)
          S.post_turn_summary =
            typeof post_turn_summary === "object" &&
            post_turn_summary !== null &&
            "status_category" in post_turn_summary
              ? { status_category: post_turn_summary.status_category }
              : null;
        if (Object.keys(S).length === 0) return;
        transport.reportMetadata(S);
        return;
      }
      transport.reportMetadata(e);
    },
    reportInternalMetadata(e) {
      if (et("reportInternalMetadata")) return !1;
      return transport.reportInternalMetadata?.(e) ?? !1;
    },
    workerEpoch: () => ({ sessionId: sessionId, epoch: transport.getEpoch() }),
    refreshGitBranch() {
      vn?.();
    },
    async publishGitStateBeforeHandoff() {
      if (!yo) return;
      try {
        bo?.();
        let e = await yo();
        if (e === void 0)
          logForDebugging("[remote-bridge] git state publish before handoff ran past its bound");
        else if (!e)
          logForDebugging("[remote-bridge] git state publish before handoff ended with the transport closed");
      } catch (error) {
        logForDebugging(`[remote-bridge] git state publish before handoff failed: ${errorMessage(error)}`, {
          level: "error",
        });
      }
    },
    writeSdkMessages(e) {
      if (et("writeSdkMessages")) return;
      accountMemoryRedactor.note(e);
      let filtered = e.filter((_) => !_.uuid || !no.has(_.uuid)),
        i =
          transcriptMirrorMode === "deferred" ? filtered.filter((_) => !isTaskLifecycleMessage(_)) : filtered,
        redact = accountMemoryRedactor.redact(i);
      if (redact.length === 0) return;
      if (frameFlushGate.active) {
        let filtered = redact.filter((D) => D.type !== "stream_event"),
          S = redact.length - filtered.length;
        if (S > 0) logForDebugging(`[remote-bridge] Dropped ${S} stream_event frame(s) during flush`);
        if (filtered.length > 0) {
          (frameFlushGate.enqueue(...filtered.map((D) => ({ seq: oo++, frame: D }))),
            logForDebugging(`[remote-bridge] Queued ${filtered.length} SDK event(s) during flush`));
          try {
            if (filtered.some(isSubagentStreamMessage)) {
              let D = frameFlushGate.evictedCount > 0;
              if (
                (frameFlushGate.evictOldest((j) => isSubagentStreamMessage(j.frame), $s),
                !D && frameFlushGate.evictedCount > 0)
              )
                logForDebugging(
                  `[remote-bridge] Over ${$s} subagent frames queued during flush; dropping the oldest until it drains`,
                );
            }
          } catch (error) {
            logForDebugging(`[remote-bridge] Subagent frame cap failed: ${errorMessage(error)}`, {
              level: "error",
            });
          }
        }
        return;
      }
      for (let msg of redact) if (msg.uuid) no.add(msg.uuid);
      let events = redact.map((_) => ({ ..._, session_id: sessionId }));
      transport.writeBatch(events);
    },
    sendControlRequest(e) {
      rememberOutboundRequestId(e.request_id, { automated: !JZe(e) });
      let request = e.request;
      if (isAccountMemoryControlRequest(request, placeAccountMemoryTool))
        return (
          ho.add(e.request_id),
          logForDebugging(
            `[remote-bridge] Keeping an account memory prompt at the terminal (not sent to Remote Control): ${e.request_id}`,
          ),
          !1
        );
      if (request.subtype === "can_use_tool" || request.subtype === "request_user_dialog")
        (De.delete(e.request_id), De.set(e.request_id, { request: e }), Gt.delete(e.request_id));
      if (request.subtype === "request_user_dialog" && ((frameFlushGate.active && !Ir) || Be))
        return (
          Gt.add(e.request_id),
          logForDebugging(
            `[remote-bridge] Not forwarding request_user_dialog while writes are gated / transport recovering (local-only): ${e.request_id}`,
          ),
          !1
        );
      if (et("control_request")) return !1;
      let event = { ...e, session_id: sessionId };
      if (request.subtype === "can_use_tool") {
        let y;
        if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_requires_action_details", !1)) {
          let R = request.tool_name === BASH_TOOL_NAME || request.tool_name === POWERSHELL_TOOL_NAME,
            _;
          if (request.tool_name === ASKUSERQUESTION) {
            let H = Array.isArray(request.input?.questions) ? request.input.questions : [],
              W = H[0],
              z = W?.header || W?.question;
            _ = {
              label: "Question",
              body: z ? z + (H.length > 1 ? ` (+${H.length - 1} more)` : "") : "Tap to answer",
            };
          } else if (request.tool_name === EXITPLANMODE) _ = { label: "Plan", body: "Plan ready for review" };
          else if (request.tool_kind === "mcp_skill")
            _ = { label: request.display_name ?? request.tool_name, body: "" };
          if (!_ && request.requires_user_interaction)
            _ = { label: request.display_name ?? request.tool_name, body: "" };
          let S =
              R && typeof request.input?.command === "string"
                ? redactSecretsInText(request.input.command)
                : void 0,
            D = R && (request.description === void 0 || Cf(request.input)),
            j = R && typeof request.input?.description === "string" ? request.input.description : void 0;
          y = {
            tool_name: request.tool_name,
            display_tool_name: _?.label ?? request.display_name ?? request.tool_name,
            action_description:
              _?.body ??
              redactSecretsInText((!D && (request.description || j)) || (S && truncate(S, 120)) || ""),
            raw_command: _ ? void 0 : S,
            tool_use_id: request.tool_use_id,
            request_id: _ ? "" : e.request_id,
            ...(_ && e.request_id && { suppressed_request_id: e.request_id }),
            input: request.input,
          };
        }
        if (y) De.set(e.request_id, { request: e, details: y });
        ((Rt = !1), $e("requires_action", y));
      } else if (request.subtype === "request_user_dialog") {
        let y;
        if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_requires_action_details", !1))
          y = dialogPermissionRequest(
            request.dialog_kind,
            request.payload,
            e.request_id,
            request.tool_use_id,
          );
        if (y) De.set(e.request_id, { request: e, details: y });
        ((Rt = !1), $e("requires_action", y));
      }
      return (writeOrQueueFrame(event, `control_request request_id=${e.request_id}`), !0);
    },
    sendControlResponse(e, r) {
      if (ho.has(e.response.request_id)) return;
      if (!r?.skipStateReport) go(e.response.request_id, !0);
      if (et("control_response")) return;
      let event = { ...e, session_id: sessionId };
      if (!r?.skipStateReport && !Rt) mo();
      writeOrQueueFrame(event, "control_response");
    },
    sendControlCancelRequest(e) {
      if (ho.delete(e)) return;
      if (Gt.delete(e)) {
        (De.delete(e),
          logForDebugging(`[remote-bridge] Local-only retract of a declined dialog forward request_id=${e}`));
        return;
      }
      if ((go(e, !0), et("control_cancel_request"))) return;
      let event = { type: "control_cancel_request", request_id: e, session_id: sessionId };
      if (!Rt) mo();
      writeOrQueueFrame(event, `control_cancel_request request_id=${e}`);
    },
    sendResult(e) {
      if ((($t = !1), (Rt = !0), et("result"))) return;
      if ((Lli(), $e("idle"), transcriptMirrorMode === "deferred" && !tr().eagerResult)) {
        logForDebugging("[remote-bridge] Withheld result (transcript deferred)");
        return;
      }
      let r = buildBridgeResultMessage(
        sessionId,
        transcriptMirrorMode === "deferred" && e?.outcome !== void 0
          ? { ...e, outcome: { ...e.outcome, result: void 0 } }
          : e,
      );
      writeOrQueueFrame(
        r,
        `result ${r.subtype} is_error=${r.is_error} num_turns=${r.num_turns}${r.user_message_uuid ? ` user_message_uuid=${r.user_message_uuid}` : ""}`,
      );
    },
    stampReply({ assistantUuid: e, userMessageUuid: r }) {
      if ((or.set(e, r), or.size > ja)) {
        let i = or.keys().next().value;
        if (i !== void 0) or.delete(i);
      }
    },
    async subscribePR(e, r, i) {
      if (re) return { ok: !1, reason: "owner_changed" };
      let y = `${e}#${r}`,
        R = ur.get(y);
      if (i) ur.set(y, { agentId: i, repo: e, prNumber: r });
      let _ = await subscribeGithubPullRequest("subscribe", {
        sessionId: sessionId,
        repo: e,
        prNumber: r,
        baseUrl: baseUrl,
        getAccessToken: getAccessToken,
        getTrustedDeviceToken: getTrustedDeviceToken,
        onUnauthorized: recoverHostSessionsBearer,
      });
      if (!_.ok && i)
        if (R) ur.set(y, R);
        else ur.delete(y);
      return _;
    },
    async unsubscribePR(e, r) {
      if (re) return { ok: !1, reason: "owner_changed" };
      let i = await subscribeGithubPullRequest("unsubscribe", {
        sessionId: sessionId,
        repo: e,
        prNumber: r,
        baseUrl: baseUrl,
        getAccessToken: getAccessToken,
        getTrustedDeviceToken: getTrustedDeviceToken,
        onUnauthorized: recoverHostSessionsBearer,
      });
      if (i.ok) ur.delete(`${e}#${r}`);
      return i;
    },
    async recordCreatedPR(e, r) {
      if (I) return { ok: !1, skipped: "no_bridge" };
      if (re) return { ok: !1, skipped: "owner_changed" };
      return buildJsonHeaders({
        sessionUrl: buildCCRv2SdkUrl(api_base_url, sessionId),
        workerToken: worker_jwt,
        ...e,
        timeoutMs: r,
      });
    },
    async fetchInboxMessage(e) {
      let r = (i) => (logFeatureBad("bridge_inbox_fetch", i), { ok: !1, reason: i });
      if (I) return r("no_bridge");
      if (re) return r("owner_changed");
      {
        let i = async (D) => {
            if (I) return "no_bridge";
            if (re) return "owner_changed";
            if (D?.fresh ? Ar() : Mt()) {
              let j = await fo("owner_changed_inbox", D);
              if (j === "changed") return "owner_changed";
              if (j === "inconclusive") return I ? "no_bridge" : "owner_unverified";
            }
            return I ? "no_bridge" : void 0;
          },
          y = await i();
        if (y) return r(y);
        if (onProactiveRefresh)
          try {
            await onProactiveRefresh();
          } catch (error) {
            logForDebugging(`[remote-bridge] inbox fetch: token refresh failed: ${errorMessage(error)}`, {
              level: "error",
            });
          }
        let R = getAccessToken(),
          _ = await getTrustedDeviceToken();
        if (onProactiveRefresh) {
          let D = await i({ fresh: !0 });
          if (D) return r(D);
        }
        let { fetchSessionInboxMessage: fetchSessionInboxMessage } = require("./chunk-49ddv0ee.js");
        return fetchSessionInboxMessage({
          sessionId: sessionId,
          fileId: e,
          baseUrl: baseUrl,
          getAccessToken: () => R,
          getTrustedDeviceToken: () => Promise.resolve(_),
        });
      }
      return r("feature_disabled");
    },
    getPRWebhookTargets() {
      return [...ur.values()];
    },
    teardown: td,
    neverArchive: keepSessionOnTeardown,
    async archive() {
      if (keepSessionOnTeardown) return;
      let e = Wi();
      await archiveRemoteBridgeSession(
        sessionId,
        baseUrl,
        e === void 0 ? _o().token : void 0,
        orgUUID,
        cfg.teardown_archive_timeout_ms,
        e,
        storageV5,
      );
    },
    [Symbol.asyncDispose]() {
      return Oo.teardown({ reason: "host_exit" });
    },
  };
  if (keepSessionOnTeardown && !isReattach) removeBridgePlaceholdersFor(sessionId, storageV5);
  let ls = registerCleanup(Oo);
  return Oo;
}
/**
 * 通用重试：fn 返回非 null 即成功，否则按 init_retry_* 配置做带对称抖动的指数退避，最多 init_retry_max_attempts 次。
 */
//@ chunk-4cm44bmp.js:95205-95591 fingerprint = withRetry (0.782)
async function withRetry(fn, label, cfg) {
  let max = cfg.init_retry_max_attempts;
  for (let attempt = 1; attempt <= max; attempt++) {
    let result = await fn();
    if (result !== null) return result;
    if (attempt < max) {
      let delay = Math.min(
        backoffDelayMs({
          attempt: attempt,
          baseMs: cfg.init_retry_base_delay_ms,
          jitter: { kind: "symmetric", ratio: cfg.init_retry_jitter_fraction },
        }),
        cfg.init_retry_max_delay_ms,
      );
      (logForDebugging(
        `[remote-bridge] ${label} failed (attempt ${attempt}/${max}), retrying in ${Math.round(delay)}ms`,
      ),
        await sleep(delay));
    }
  }
  return null;
}
/**
 * 在 withRetry 外再加 401 恢复：某次调用报告 401 且该 token 未尝试过时调用 onAuth401 刷新 OAuth；刷新发生在最后一次尝试时再额外试一次。
 */
//@ chunk-4cm44bmp.js:95591-96332 layout
async function withRetryAndAuthRecovery(call, label, cfg, authOptions) {
  let refreshed = !1,
    x = !1,
    Q = await withRetry(
      async () => {
        if (refreshed) x = !0;
        let accessToken = authOptions.getAccessToken(),
          A = !1,
          Z = await call(accessToken, () => {
            A = !0;
          }),
          Y = isCredentialsRejection(Z);
        if (
          (Z === null || Y) &&
          A &&
          authOptions.onAuth401 &&
          !refreshed &&
          !authOptions.recoveryAttemptedTokens.has(accessToken)
        ) {
          authOptions.recoveryAttemptedTokens.add(accessToken);
          let ie = !1;
          try {
            ie = await authOptions.onAuth401(accessToken);
          } catch (error) {
            logForDebugging(
              `[remote-bridge] ${label} 401 \u2014 OAuth refresh threw: ${errorMessage(error)}`,
              { level: "error" },
            );
          }
          if (
            ((refreshed = ie),
            logForDebugging(
              `[remote-bridge] ${label} 401 \u2014 OAuth ${ie ? "refreshed; retrying with the fresh token" : "refresh unavailable"}`,
            ),
            logForDiagnosticsNoPII("info", "bridge_repl_v2_init_401_refresh", { refreshed: ie }),
            refreshed && Y)
          )
            return null;
        }
        return Z;
      },
      label,
      cfg,
    );
  if (Q === null && refreshed && !x)
    return (
      logForDebugging(
        `[remote-bridge] ${label} refreshed on the final attempt; one extra try with the fresh token`,
      ),
      call(authOptions.getAccessToken(), () => {})
    );
  return Q;
}
/**
 * 凭证失败是否可通过重新登录恢复（untrusted_device 且不是 signature_wanted、session_stale_relogin）。
 */
//@ chunk-4cm44bmp.js:96332-96474 layout
function isReloginRecoverable(failure) {
  if (failure.reason === "untrusted_device")
    return failure.refusal?.kind !== "signature_wanted" && !isProactiveEnrollmentDisabled();
  return failure.reason === "session_stale_relogin";
}
/**
 * 失败的严重级别：可重登恢复为 auth，否则 terminal。
 */
//@ chunk-4cm44bmp.js:96474-96520 layout
function failureSeverity(failure) {
  return isReloginRecoverable(failure) ? "auth" : "terminal";
}
/**
 * 是否是"非 Anthropic 源站写的 403"（例如 Cloudflare 拦截）。
 */
//@ chunk-4cm44bmp.js:96520-96603 layout
function isNonOrigin403(failure) {
  return failure.reason === "request_rejected" && failure.status === 403 && v5e(failure.source);
}
//@ chunk-4cm44bmp.js:96603-96699 layout
function credentialsRejectedCode(prefix, failure) {
  return isNonOrigin403(failure)
    ? `${prefix}_credentials_rejected_nonorigin`
    : `${prefix}_credentials_rejected`;
}
//@ chunk-4cm44bmp.js:96699-96798 layout
var RECOVERED_NONORIGIN_CODES = {
  nonorigin_cf: "recovered_403_nonorigin_cf",
  nonorigin_other: "recovered_403_nonorigin_other",
};
//@ chunk-4cm44bmp.js:96798-97020 layout
function transportClosed403Code(n) {
  switch (n?.rejectSource) {
    case "nonorigin_cf":
      return "transport_closed_403_nonorigin_cf";
    case "nonorigin_other":
      return "transport_closed_403_nonorigin_other";
    case "origin":
    case void 0:
      return "transport_closed_403";
  }
}
/**
 * 凭证/会话失败 → 用户可读文案（untrusted_device、session_stale_relogin、invalid_session_id、request_rejected、malformed_response）。
 */
//@ chunk-4cm44bmp.js:97020-97520 layout
function describeCredentialFailure(failure) {
  switch (failure.reason) {
    case "untrusted_device":
      return untrustedDeviceHint(failure.refusal, { justEnrolled: failure.justEnrolled === !0 });
    case "session_stale_relogin":
      return SESSION_STALE_RELOGIN_HINT;
    case "invalid_session_id":
      return "session id contains unsupported characters \u2014 check the --session-id value";
    case "request_rejected":
      if (isNonOrigin403(failure))
        return `${describeNonOriginRefusal(failure.source)} \u2014 run /remote-control to retry`;
      return `Remote Control server rejected the request (HTTP ${failure.status}) \u2014 run /remote-control to retry`;
    case "malformed_response":
      return BRIDGE_MALFORMED_RESPONSE_HINT;
  }
}
/**
 * 带 trusted device 的 /bridge 凭证获取：先带已存的设备令牌请求，遇 untrusted_device 且可注册时自动注册设备后重试（标 justEnrolled）；不支持 trusted device 时把 untrusted_device 降级为 request_rejected；可选覆盖 api_base_url。
 */
//@ chunk-4cm44bmp.js:97520-98051 callgraph-fingerprint = fetchRemoteCredentials (0.201)
async function fetchCredentialsWithTrustedDevice(
  sessionId,
  baseUrl,
  accessToken,
  timeoutMs,
  onAuth401,
  credentialsStore,
  epochGuard,
) {
  let deviceToken = await getTrustedDeviceToken(),
    result = await attachBridgeWorker(
      sessionId,
      baseUrl,
      accessToken,
      timeoutMs,
      deviceToken,
      onAuth401,
      epochGuard,
    ),
    refusal = isCredentialsFailure(result) && result.reason === "untrusted_device" ? result.refusal : void 0;
  if (refusal !== void 0 && shouldRemoteControlEnroll(refusal)) {
    let Y = await withUntrustedDeviceRecovery(
      deviceToken,
      (ie) => attachBridgeWorker(sessionId, baseUrl, accessToken, timeoutMs, ie, onAuth401, epochGuard),
      credentialsStore,
    );
    if (Y !== void 0 && Y !== null)
      result = isCredentialsFailure(Y) && Y.reason === "untrusted_device" ? { ...Y, justEnrolled: !0 } : Y;
  } else if (refusal !== void 0)
    (logRefusalWithoutEnrollment("[remote-bridge]", refusal), clearTrustedDeviceTokenCache());
  if (!result) return null;
  if (isCredentialsRejection(result)) return result;
  if (isCredentialsFailure(result)) {
    if (result.reason === "untrusted_device" && !isTrustedDeviceGateEnabled())
      return { terminal: !0, reason: "request_rejected", status: 403 };
    return result;
  }
  return getBridgeBaseUrlOverride() ? { ...result, api_base_url: baseUrl } : result;
}
/**
 * 由关闭码/原因判断会话是否被取代：403/404 → superseded_unknown；4090 + superseded_by_worker → superseded，session_not_active → session_archived。
 */
//@ chunk-4cm44bmp.js:98051-98391 affinity
function classifySupersession(code, cause) {
  if (code === 403 || code === 404) return "superseded_unknown";
  if (code !== 4090) return;
  switch (cause) {
    case "superseded_by_worker":
      return "superseded";
    case "session_not_active":
      return "session_archived";
    case "epoch_conflict":
    case void 0:
      return "superseded_unknown";
    case "epoch_stale":
    case "session_not_found":
    case "token_expired":
    case "auth_exhausted":
      return;
  }
}
//@ chunk-4cm44bmp.js:98391-98436 affinity
function isNotArchived(n) {
  return n !== "session_archived";
}
/**
 * 归档结果 → 遥测码（skipped_*、invalid_id、server_403_untrusted、network_error、server_4xx/5xx、ok）。
 */
//@ chunk-4cm44bmp.js:98436-98795 affinity
function archiveStatusCode(archiveResult, supersession) {
  return archiveResult === "skipped_superseded"
    ? supersession === "session_archived"
      ? "skipped_archived"
      : "skipped_superseded"
    : archiveResult === "skipped_owner_changed"
      ? "skipped_owner_changed"
      : archiveResult === "no_token"
        ? "skipped_no_token"
        : archiveResult === "invalid"
          ? "invalid_id"
          : archiveResult === "untrusted_device"
            ? "server_403_untrusted"
            : archiveResult === "timeout" || archiveResult === "error"
              ? "network_error"
              : archiveResult >= 500
                ? "server_5xx"
                : archiveResult >= 400
                  ? "server_4xx"
                  : "ok";
}
/**
 * 对会话执行生命周期动作（archive / unarchive）：POST {session}/{action}，返回 HTTP 状态或 invalid/timeout/error/untrusted_device 等。
 */
//@ chunk-kgtpkbhq.js:8680-9302 fingerprint = archiveSession (0.358)
async function postSessionAction(
  label,
  pathSuffix,
  baseUrl,
  accessToken,
  sessionId,
  timeoutMs,
  authOptions,
  refusalMode,
) {
  if (!isValidSessionId(sessionId, label)) return "invalid";
  let g = buildSessionEndpoint(label, baseUrl, accessToken, sessionId, authOptions, pathSuffix);
  if (!g) return "invalid";
  let { url: url, headers: headers, id: id } = g;
  try {
    let post = await Dt.post(url, {}, { headers: headers, timeout: timeoutMs, validateStatus: () => !0 });
    if ((logForDebugging(`[code-session] ${label} ${id} status=${post.status}`), post.status === 403)) {
      let compatId = readUntrustedDeviceRefusal(post.data);
      if (compatId !== void 0)
        return refusalMode === "elevated_auth" && !shouldRemoteControlEnroll(compatId)
          ? "untrusted_device_no_enroll"
          : "untrusted_device";
      if (refusalMode === "elevated_auth" && classifyElevatedAuthError(post.data) === "session_stale_relogin")
        return "session_stale_relogin";
    }
    return post.status;
  } catch (err) {
    return (
      logForDebugging(`[code-session] ${label} ${id} failed: ${errorMessage(err)}`),
      Dt.isAxiosError(err) && err.code === "ECONNABORTED" ? "timeout" : "error"
    );
  }
}

export { describeCredentialFailure, initEnvLessBridgeCore, postSessionAction };
