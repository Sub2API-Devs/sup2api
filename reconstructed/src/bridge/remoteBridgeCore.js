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
  noop,
  noopTwoArgs,
  sendWithEpochFollowUps,
  DEFAULT_HISTORY_BACKFILL_CONFIG,
  historyBackfillConfig,
  isBackfillScopeAllowedForOrigin,
  BoundedIdSet,
  hasUserMessagingToolUse,
  isTaskLifecycleMessage,
  isBackfillOriginScope,
  settleRemoteBridgeDelivery,
  isAccountMemoryControlRequest,
} from "./remoteBridgeSettle.js";
import {
  strayDropMode,
  MAX_CONSECUTIVE_UPLOAD_FAILURES,
  MAX_UPLOAD_BATCH_BYTES,
  UPLOAD_REQUEST_TIMEOUT_MS,
  REFRESH_MIN_INTERVAL_MS,
  FLUSH_TIMEOUT_MS,
  PREFLUSH_TIMEOUT_MS,
  TEARDOWN_FLUSH_TIMEOUT_MS,
  describeBridgeCloseCode,
  SUBSCRIBERS_REPORTED_TIMEOUT_MS,
  BACKFILL_BATCH_SIZE,
  BACKFILL_BATCH_FLUSH_TIMEOUT_MS,
  CLEANUP_FLUSH_RESERVE_MS,
  ARCHIVE_AUTH_RETRY_MIN_REMAINING_MS,
  UPLOAD_BUDGET_MS,
  MAX_QUEUED_SUBAGENT_FRAMES,
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
  BRIDGE_REMINT_BACKOFF_CAP_MS,
  createReconnectBudget,
  bucketRecentUse,
  HOURLY_EXHAUSTED_DETAIL,
  DAILY_EXHAUSTED_DETAIL,
  BRIDGE_REMINT_BACKOFF_BASE_MS,
  BRIDGE_REMINT_MIN_JITTER_MS,
  OWNER_REMINT_CAP,
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
import { LONG_POLL_TIMEOUT_MS } from "../cli/transports/SSETransport.js";
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
import { OWNER_PIN_INCONCLUSIVE_TTL_MS } from "./ownerPin.js";
import { checkSdkUrl } from "../cli/transports/sdkUrlValidation.js";
import { isLoopbackHost } from "../utils/localhost.js";
import { sleep, withDeadline, backoffDelayMs } from "../utils/sleep.js";
import { isNonOriginSource, describeNonOriginRefusal } from "../services/api/requestIdSource.js";
import { getLauncherLoginEnd, getLauncherLoginGeneration } from "../utils/auth/launcherHostLogin.js";
import {
  releaseReadReceiptOwnership,
  bindReadReceiptSession,
  resendReceipts,
  withReadReceiptClaim,
  settleHeldReadReceipts,
} from "./readReceipts.js";
import {
  buildWorkerShuttingDownMessage,
  handleReplBridgeControlRequest,
  buildBridgeResultMessage,
} from "./replControlHandler.js";
import { rememberResolvedPromptRequestId, rememberOutboundRequestId } from "./attestationGate.js";
import { pendingActionRows } from "../utils/sessionState.js";
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
import { normalizeUuidOrNull } from "../utils/agentId.js";
import {
  isCoalescableControlRequest,
  isPermissionPromptSubtype,
} from "../cli/transports/streamEventCoalescing.js";
import { resendBridgeEffortMetadata } from "./applyFlagSettings.js";
import { heldHostSessionsBearer, recoverHostSessionsBearer } from "../utils/hostSessionsBearer.js";
import { CLEANUP_TIMEOUT_MS, registerCleanup } from "../utils/cleanupRegistry.js";
import { sanitizeMarkName } from "../utils/startupMarks.js";
import { toInfraSessionId } from "./sessionIdCompat.js";
import { isEvalBuild } from "../utils/envUtils.js";
import { cooAttributes } from "../utils/telemetry/cooAttributes.js";
import { BASH_TOOL_NAME } from "../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../tools/PowerShellTool/toolName.js";
import { ASKUSERQUESTION } from "../tools/AskUserQuestionTool/prompt.js";
import { EXITPLANMODE } from "../tools/ExitPlanModeTool/constants.js";
import { redactSecretsInText } from "../services/teamMemorySync/secretScanner.js";
import { hasHostField } from "./deviceRegistration.js";
import { truncate } from "../utils/format.js";
import { dialogPermissionRequest } from "../utils/teleport/sessionCreate.js";
import { subscribeGithubPullRequest, buildJsonHeaders } from "./githubPrSubscription.js";
import { buildSessionEndpoint } from "../assistant/sessionHistory.js";
import { axios_default } from "../../vendor/axios/dist/esm/axios.js";

//@ chunk-4cm44bmp.js:29785-95205 callgraph-witnessed = initEnvLessBridgeCore (0.223)
/**
 * REPL Remote Control 的总装函数（约 65KB 单函数）：先按 work secret / 重连指针 / 新建三条路径确定 sessionId（cse_*），调 /bridge 取 worker_jwt 与 worker_epoch，再用 createV2ReplTransport 建 SSE+CCRClient 传输；
 * 之后挂接 onConnect（回放历史、处理延迟上传）、onData（handleIngressMessage 分派到入站消息/权限响应/服务端控制请求/取消）、onClose（按关闭码 401/4091/4093/4094 走 rebuildTransport 恢复）；
 * 内含 JWT 刷新调度、FlushGate 排队与 drain、会话标题、账户记忆脱敏、归档/拆除，最后返回 handle（writeSdkMessages、sendControlRequest/Response、sendResult、teardown、archive 等）。返回 null 表示未连接（原因经 onStateChange 报告）。
 */
async function initEnvLessBridgeCore(params) {
  let {
    baseUrl,
    orgUUID,
    title,
    reattachOrFail,
    reattachOrigin,
    reviveInitiated,
    neverArchive,
    onAuthProven,
    noHistoryBackfill,
    onReattachGoneBounce,
    neutralFallbackTitle,
    onReattachPointerDead,
    ownerPin,
    onOwnerChanged,
    getAccessToken,
    onAuth401,
    classifyFailedOAuthRefresh,
    onReadFreshOAuthToken,
    onClassifyMissingOAuthToken,
    onProactiveRefresh,
    toSDKMessages,
    initialHistoryCap,
    initialMessages,
    conversationForPairing,
    placeAccountMemoryTool,
    accountMemoryInPlay,
    onInboundMessage,
    onQueuedNotification,
    onUserMessage,
    onSessionEstablished,
    onBeforePushTriggeringState,
    onPermissionResponse,
    onInterrupt,
    onStopTask,
    onBackgroundTasks,
    onCancelAsyncMessage,
    getInitializeState,
    getCommands,
    isTurnLive,
    onDialogKindsDeclared,
    onClientInitialize,
    onSetModel,
    onSetMaxThinkingTokens,
    onSetPermissionMode,
    onApplyFlagSettings,
    onRenameSession,
    onSetColor,
    onFileSuggestions,
    onReadFile,
    onGetWorkspaceDiff,
    onSideQuestion,
    onGetContextUsage,
    answerSharedControlRequest,
    onMcpAuthenticate,
    onMcpOauthCallbackUrl,
    onMcpReconnect,
    onForkConversation,
    onStateChange,
    onBridgeInjectedMcp,
    onProjectsBindingHint,
    outboundOnly,
    tags,
    sessionGroupingId,
    requestedSessionGroupingId,
    gitRepoUrl = null,
    branch = "",
    defaultBranch = null,
    nameSourceForCreate,
    onTransportPersistenceReady,
    onTransportPersistenceTeardown,
    onTransportRebuilt,
    remoteControlOrigin,
    getBackfillMessages,
    reattachSessionId,
    reattachSequenceNum,
    credentialsStore,
    workSecretCredentials,
    storageV5,
  } = params;
  let accountMemoryRedactor = createRemoteBridgeRedactor({
    mode: strayDropMode,
    placeAccountMemoryTool,
    accountMemoryInPlay,
    onDropped: (e, r) => {
      logForDebugging(
        `[remote-bridge] Kept one '${r}' row's content out of the upload for account memory (reason: ${e})`,
      );
      if (e === "unreadable") logFeatureBad("bridge_account_memory_redaction", `unredactable_${r}_row`);
    },
  });
  accountMemoryRedactor.note(conversationForPairing?.() ?? initialMessages ?? []);
  let toRedactedSdkEvents = (e, r = "history") =>
    accountMemoryRedactor.redact(
      toSDKMessages(accountMemoryRedactor.withoutMemoryCallAttachments(e, r)),
      "events",
      r,
    );
  let keepSessionOnTeardown = workSecretCredentials !== undefined ? true : neverArchive;
  let sessionTitle = title;
  let isReattach = !!reattachSessionId;
  let cfg = await getEnvLessBridgeConfig();
  let workSecretRegistered = false;
  let noteAcceptedToken = (e) => {
    if (!workSecretCredentials) ownerPin?.noteAcceptedToken(e);
  };
  let ri = "work-secret-lane";
  let getLaneToken = () => (workSecretCredentials ? ri : getAccessToken());
  let fetchBridgeCredentials = workSecretCredentials
    ? () => {
        let e = workSecretRegistered ? "refresh" : "initial";
        return workSecretCredentials
          .register(e, {
            stillWanted: () => !I && supersession === undefined,
            reuseHeldAboveS: Math.ceil(cfg.token_refresh_buffer_ms / 1000) + 60,
          })
          .then((r) => {
            if (r !== null && !isCredentialsFailure(r)) workSecretRegistered = true;
            return r;
          });
      }
    : fetchCredentialsWithTrustedDevice;
  let accessToken = getAccessToken();
  if (!accessToken) {
    logForDebugging("[remote-bridge] No OAuth token");
    logFeatureBad("bridge_connect", "bridge_connect_no_token");
    return null;
  }
  let getCurrentAccessToken = () => getAccessToken() ?? accessToken;
  let getOwnerToken = () => ownerPin?.ownerToken() ?? getAccessToken() ?? accessToken;
  let recoveryAttemptedTokens = new Set();
  let { getOriginalCwd } = await import("./chunk-nj7t53r7.js");
  let { getMainLoopModel } = await import("./chunk-gqemcfsb.js");
  let groupingIdForCreate = requestedSessionGroupingId ?? sessionGroupingId;
  let effectiveGroupingId = sessionGroupingId;
  let ii = false;
  async function createSessionWithRetry() {
    let e = gitRepoUrl ? undefined : await nameSourceForCreate?.();
    let r = e
      ? {
          repositoryUrl: e,
        }
      : undefined;
    ii = r !== undefined;
    let warnState = {};
    let y = async () => {
      if (gitRepoUrl) {
        let { buildGitSessionContext } = await import("./chunk-wx4f8343.js");
        let { reportGitSessionContext } = await import("./chunk-587ph99w.js");
        let { report } = await buildGitSessionContext(gitRepoUrl, branch, defaultBranch ?? undefined);
        reportGitSessionContext(report);
      }
    };
    let R = (groupingId) =>
      withRetryAndAuthRecovery(
        (accessToken, j) =>
          createCodeSession(
            baseUrl,
            accessToken,
            sessionTitle,
            cfg.http_timeout_ms,
            tags,
            gitRepoUrl
              ? {
                  gitRepoUrl,
                  branch,
                  defaultBranch: defaultBranch ?? undefined,
                }
              : r,
            getOriginalCwd(),
            getMainLoopModel(),
            groupingId,
            warnState,
            j,
          ).then((codeSession) => {
            if (typeof codeSession === "string") ownerPin?.noteAcceptedToken(accessToken);
            return codeSession;
          }),
        "createCodeSession",
        cfg,
        {
          getAccessToken: getCurrentAccessToken,
          onAuth401,
          recoveryAttemptedTokens,
        },
      );
    let _ = await R(groupingIdForCreate);
    if (
      isCreateSessionFailure(_) &&
      _.reason === "grouping_rejected" &&
      requestedSessionGroupingId === undefined &&
      groupingIdForCreate !== undefined
    ) {
      let S = await R(undefined);
      if (typeof S === "string") {
        effectiveGroupingId = undefined;
        await y();
        if (r) noop("connect");
        logForDiagnosticsNoPII("info", "bridge_repl_v2_grouping_dropped", {
          status: _.status,
        });
        logForDebugging("[bridge:core] persisted Project no longer available; recreated session outside it");
        logForDebugging(`[remote-bridge] Created session ${S}`);
        logForDiagnosticsNoPII("info", "bridge_repl_v2_session_created");
        return S;
      }
      if (r && !isCredentialsRejection(S)) noopTwoArgs("connect", S);
      return _;
    }
    if (typeof _ === "string") {
      effectiveGroupingId = groupingIdForCreate;
      await y();
      if (r) noop("connect");
      logForDebugging(`[remote-bridge] Created session ${_}`);
      logForDiagnosticsNoPII("info", "bridge_repl_v2_session_created");
    }
    return _;
  }
  function describeCreateFailure(e) {
    if (e?.reason === "grouping_rejected" && groupingIdForCreate !== undefined) {
      let r = e.detail ? `: ${e.detail}` : "";
      return requestedSessionGroupingId !== undefined
        ? `Couldn't create a session in the requested Project (server ${e.status}${r}). The Project may not exist or may not be available to you.`
        : `Couldn't recreate the session in its previous Project (server ${e.status}${r}) \u2014 the Project may have been deleted or is no longer available.`;
    }
    if (e?.reason === "request_rejected")
      return `Session creation failed (server ${e.status}) \u2014 see debug log`;
    if (e?.reason === "malformed_response") return BRIDGE_MALFORMED_RESPONSE_HINT;
    return "Session creation failed \u2014 see debug log";
  }
  function reportCreateFailure(sessionWithRetry) {
    if (sessionWithRetry !== null && sessionWithRetry.terminal === false) {
      onStateChange?.("failed", Yn, "auth");
      logBridgeSkip("v2_session_create_oauth_rejected", undefined, true);
      logFeatureBad("bridge_connect", "bridge_connect_create_oauth_rejected");
      return;
    }
    if (ii) noopTwoArgs("connect", isCreateSessionFailure(sessionWithRetry) ? sessionWithRetry : null);
    onStateChange?.(
      "failed",
      describeCreateFailure(isCreateSessionFailure(sessionWithRetry) ? sessionWithRetry : null),
    );
    logBridgeSkip("v2_session_create_failed", undefined, true);
    logFeatureBad("bridge_connect", "bridge_connect_session_create_failed");
  }
  let ca = "JWT refresh failed: no OAuth token \u2014 run /login";
  let Yn = "Claude.ai login was rejected \u2014 run /login, then /remote-control";
  let fa = "Claude.ai login expired \u2014 run /login, then /remote-control";
  let _a = "Claude.ai login expired \u2014 run /login to restore Remote Control";
  let pa = "Signed out of Claude \u2014 run /login, then /remote-control";
  let reattachSuppressed = false;
  let reattachFellBackToFresh = false;
  if (reattachSessionId && isTeleportedSession(reattachSessionId)) {
    if (reattachOrFail) {
      logForDebugging(
        `[remote-bridge] Reattach-or-fail: ${reattachSessionId} is teleported; failing terminally instead of minting fresh`,
      );
      logForDiagnosticsNoPII("info", "bridge_repl_v2_revive_reattach_teleported");
      onReattachPointerDead?.();
      onStateChange?.("failed", BRIDGE_REATTACH_UNAVAILABLE_HINT, "terminal");
      logBridgeSkip("v2_revive_reattach_teleported", undefined, true);
      logFeatureBad("bridge_connect", "bridge_connect_reattach_teleported");
      return null;
    }
    logForDebugging(
      `[remote-bridge] Reattach suppressed for teleported session ${reattachSessionId} \u2014 minting fresh`,
    );
    reattachSuppressed = true;
    isReattach = false;
  }
  let sessionId;
  if (workSecretCredentials) {
    if (!reattachSessionId || reattachSuppressed) {
      logForDebugging("[remote-bridge] Work-secret attach has no session to reattach; failing", {
        level: "error",
      });
      onStateChange?.(
        "failed",
        "Remote Control could not attach: the host supplied a session credential but no session to attach to",
        "terminal",
      );
      logBridgeSkip("v2_work_secret_no_session", undefined, true);
      logFeatureBad("bridge_connect", "bridge_connect_work_secret_no_session");
      return null;
    }
    sessionId = reattachSessionId;
    logForDebugging(`[remote-bridge] Attaching to session ${sessionId} with the host's work secret`);
    logForDiagnosticsNoPII("info", "bridge_repl_v2_work_secret_attach");
  } else if (reattachSessionId && !reattachSuppressed) {
    sessionId = reattachSessionId;
    logForDebugging(`[remote-bridge] Reattaching to session ${sessionId}`);
    logForDiagnosticsNoPII("info", "bridge_repl_v2_session_reattached");
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
        onAuth401,
        recoveryAttemptedTokens,
      },
    );
    if (e?.outcome === "elevated_auth") {
      logForDebugging(
        `[remote-bridge] Reattach ${sessionId}: unarchive elevated-auth (${e.reason}) \u2014 surfacing the failure, pointer preserved`,
      );
      logForDiagnosticsNoPII("info", "bridge_repl_v2_reattach_elevated_auth");
      let r = e.reason === "untrusted_device" && !isTrustedDeviceGateEnabled();
      let { outcome, ...y } = e;
      let R = r
        ? {
            terminal: true,
            reason: "request_rejected",
            status: 403,
          }
        : {
            terminal: true,
            ...y,
          };
      onStateChange?.("failed", describeCredentialFailure(R), failureSeverity(R));
      logBridgeSkip("v2_reattach_elevated_auth", undefined, true);
      logFeatureBad("bridge_connect", "bridge_connect_reattach_elevated_auth");
      return null;
    }
    if (e?.outcome === "gone" && reattachOrFail) {
      logForDebugging(
        `[remote-bridge] Reattach-or-fail: ${sessionId} gone (unarchive ${e.status}); failing terminally instead of minting fresh`,
      );
      logForDiagnosticsNoPII("info", "bridge_repl_v2_revive_reattach_gone");
      onReattachGoneBounce();
      onReattachPointerDead?.();
      onStateChange?.("failed", BRIDGE_REATTACH_UNAVAILABLE_HINT, "terminal");
      logBridgeSkip("v2_revive_reattach_gone", undefined, true, {
        reattach_origin: fromEnumOpt(reattachOrigin),
        revive_initiated: reviveInitiated === true,
      });
      logFeatureBad("bridge_connect", "bridge_connect_reattach_gone");
      return null;
    }
    if (e?.outcome === "gone") {
      logForDebugging(
        `[remote-bridge] Reattach ${sessionId} gone (unarchive ${e.status}); minting fresh session`,
      );
      reattachFellBackToFresh = true;
      onReattachGoneBounce();
      sessionTitle = neutralFallbackTitle ?? `${getBridgeSessionNamePrefix()}-${randomWordSlug()}`;
      logForDiagnosticsNoPII("info", "bridge_repl_v2_reattach_fallback", {
        via: "unarchive",
        status: e.status,
      });
      logEvent("tengu_bridge_repl_env_expired_fresh_session", {
        v2: true,
        via: fromEnum("unarchive"),
        status: typeof e.status === "number" ? e.status : fromEnum(e.status),
        reattach_origin: fromEnumOpt(reattachOrigin),
        revive_initiated: reviveInitiated === true,
      });
      let sessionWithRetry = await createSessionWithRetry();
      if (typeof sessionWithRetry !== "string") {
        reportCreateFailure(sessionWithRetry);
        return null;
      }
      sessionId = sessionWithRetry;
      isReattach = false;
    }
  } else {
    if (reattachOrFail) {
      logForDebugging(
        "[remote-bridge] Reattach-or-fail: no reattach pointer for this init; failing terminally instead of minting fresh",
      );
      logForDiagnosticsNoPII("info", "bridge_repl_v2_revive_fresh_refused");
      onReattachGoneBounce();
      onStateChange?.("failed", BRIDGE_REATTACH_UNAVAILABLE_HINT, "terminal");
      logBridgeSkip("v2_revive_fresh_refused", undefined, true);
      logFeatureBad("bridge_connect", "bridge_connect_revive_fresh_refused");
      return null;
    }
    let sessionWithRetry = await createSessionWithRetry();
    if (typeof sessionWithRetry !== "string") {
      reportCreateFailure(sessionWithRetry);
      return null;
    }
    sessionId = sessionWithRetry;
  }
  if (
    isReattach &&
    requestedSessionGroupingId !== undefined &&
    requestedSessionGroupingId !== effectiveGroupingId
  )
    logForDebugging(
      "[bridge:core] --project ignored: reattached to existing session (Project is fixed at create)",
    );
  if (keepSessionOnTeardown && isReattach) removeBridgePlaceholdersFor(sessionId, storageV5);
  else if (!outboundOnly)
    recordBridgePlaceholder(sessionId, isReattach ? undefined : sessionTitle, storageV5);
  startBridgePlaceholderSweep({
    baseUrl,
    getAccessToken: getCurrentAccessToken,
    skipSessionId: sessionId,
    archive: (e) =>
      archiveRemoteBridgeSession(
        e,
        baseUrl,
        getCurrentAccessToken(),
        orgUUID,
        cfg.http_timeout_ms,
        undefined,
        storageV5,
      ),
    storageV5,
  });
  let ha = BRIDGE_REMINT_BACKOFF_CAP_MS + 60000;
  let ft;
  function Xn() {
    ft = undefined;
  }
  function screenNonOriginRefusal(e) {
    if (!isCredentialsFailure(e) || !isNonOrigin403(e)) {
      if (e !== null && !isCredentialsFailure(e) && !isCredentialsRejection(e)) Xn();
      return e;
    }
    if (!isBridgeNonOrigin403RetryEnabled()) return e;
    let now = Date.now();
    if (ft === undefined || now - ft.lastAtMs > ha)
      ft = {
        startedAtMs: now,
        lastAtMs: now,
        refusals: 0,
      };
    ft.lastAtMs = now;
    ft.refusals++;
    let i = now - ft.startedAtMs;
    if (ft.refusals > 1 && i >= LONG_POLL_TIMEOUT_MS) {
      logForDebugging(
        `[remote-bridge] /bridge refused by ${e.source} ${ft.refusals}\xD7 over ${Math.round(i / 1000)}s with nothing reaching Anthropic since \u2014 treating as a verdict`,
      );
      return e;
    }
    logForDebugging(
      `[remote-bridge] /bridge 403 not written by Anthropic's origin (${e.source}) \u2014 treating as unreachable`,
    );
    logForDiagnosticsNoPII("warn", "bridge_repl_v2_bridge_403_nonorigin", {
      source: e.source,
    });
    return null;
  }
  function refetchCredentials(e, stale) {
    if (I || supersession !== undefined || ae !== stale) return Promise.resolve(null);
    let i = () =>
      eo(sessionId, e).then((y) => {
        if (ae !== stale) return y;
        let R = screenNonOriginRefusal(y);
        if (R !== null && !isCredentialsFailure(R) && !isCredentialsRejection(R)) {
          noteAcceptedToken(e);
          So();
        }
        return R;
      });
    if (!Mt()) return i();
    return lr("owner_changed_recovery").then((y) =>
      y || I || supersession !== undefined || ae !== stale ? null : i(),
    );
  }
  let di = accessToken;
  let bridgeCredentials = await withRetryAndAuthRecovery(
    (e, r) => {
      di = e;
      return fetchBridgeCredentials(sessionId, baseUrl, e, cfg.http_timeout_ms, r, credentialsStore);
    },
    "fetchRemoteCredentials",
    cfg,
    {
      getAccessToken: getCurrentAccessToken,
      onAuth401,
      recoveryAttemptedTokens,
    },
  );
  if (isReattach && bridgeCredentials === null) {
    logForDebugging(
      `[remote-bridge] Reattach ${sessionId}: /bridge failed after unarchive; surfacing retry prompt`,
    );
    logForDiagnosticsNoPII("info", "v2_remote_creds_reattach_transient");
  }
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
          : describeCredentialFailure(bridgeCredentials);
    let r =
      bridgeCredentials === null
        ? reviveInitiated
          ? "auth"
          : "terminal"
        : isCredentialsRejection(bridgeCredentials)
          ? "auth"
          : failureSeverity(bridgeCredentials);
    let reason =
      bridgeCredentials === null
        ? isReattach
          ? "v2_remote_creds_reattach_transient"
          : "v2_remote_creds_failed"
        : isCredentialsRejection(bridgeCredentials)
          ? "v2_remote_creds_oauth_rejected"
          : isNonOrigin403(bridgeCredentials)
            ? `v2_remote_creds_request_rejected_${bridgeCredentials.source}`
            : `v2_remote_creds_${bridgeCredentials.reason}`;
    logForDebugging(
      `[remote-bridge] Creds failed; onStateChange ${onStateChange ? "set" : "UNSET"}, msg="${e}"`,
    );
    onStateChange?.("failed", e, r);
    logBridgeSkip(reason, undefined, true);
    logFeatureBad("bridge_connect", "bridge_connect_creds_failed");
    if (!isReattach)
      retryArchiveAbandonedSession(sessionId, () =>
        archiveRemoteBridgeSession(
          sessionId,
          baseUrl,
          getOwnerToken(),
          orgUUID,
          cfg.http_timeout_ms,
          undefined,
          storageV5,
        ),
      );
    return null;
  }
  logForDebugging(`[remote-bridge] Fetched bridge credentials (expires_in=${bridgeCredentials.expires_in}s)`);
  noteAcceptedToken(di);
  onSessionEstablished?.(sessionId);
  let workerEpoch = bridgeCredentials.worker_epoch;
  function raiseWorkerEpoch(workerEpoch_2) {
    workerEpoch = Math.max(workerEpoch, workerEpoch_2);
  }
  function eo(e, r) {
    if (workSecretCredentials || !isBridgeAttachEpochFenceEnabled())
      return fetchBridgeCredentials(e, baseUrl, r, cfg.http_timeout_ms, undefined, credentialsStore);
    let i = workerEpoch;
    let y = ae;
    return sendWithEpochFollowUps({
      heldEpoch: i,
      send: (R, onRefused) =>
        fetchBridgeCredentials(
          e,
          baseUrl,
          r,
          cfg.http_timeout_ms,
          undefined,
          credentialsStore,
          R === undefined
            ? undefined
            : {
                expectedEpoch: R,
                onRefused,
              },
        ),
      maySendAgain: () => {
        if (isTeleportedSession(sessionId)) return false;
        return !I && !re && supersession === undefined && ae === y;
      },
    }).then((R) => {
      let answer = R.answer;
      try {
        let workerEpoch =
          answer !== null && !isCredentialsFailure(answer) && !isCredentialsRejection(answer)
            ? answer.worker_epoch
            : undefined;
        if (workerEpoch !== undefined && !I && ae === y) raiseWorkerEpoch(workerEpoch);
        if (R.ending !== "not_refused" && qt()) {
          let D = workerEpoch !== undefined;
          logEvent("tengu_bridge_repl_attach_conflict", {
            outcome: fromEnum(R.ending === "followed_up" ? (D ? "resolved" : "unresolved") : R.ending),
            accepted: D,
            stated_epoch: i,
            session_epoch: R.sessionEpoch,
            follow_ups: R.followUps,
            fallback_reason: fromEnumOpt(R.ending === "unfenced_fallback" ? R.fallbackReason : undefined),
          });
        }
      } catch (error) {
        logError(error);
        logForDiagnosticsNoPII("error", "bridge_repl_v2_attach_fence_failed");
      }
      return answer;
    });
  }
  let sessionUrl = buildCCRv2SdkUrl(bridgeCredentials.api_base_url, sessionId);
  logForDebugging(`[remote-bridge] v2 session URL: ${sessionUrl}`);
  function ga() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_selfheal_heartbeats", true);
  }
  function to() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_recovery_patience", true);
  }
  function ci() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_dazzling_garden", true);
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
    return Ht() > 0 || transport.mayHoldUploads?.() === true;
  }
  function ma() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_sse_keepalive_max_interval_s", 0);
  }
  function va() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_sse_long_poll_fallback", true);
  }
  function hi() {
    return outboundOnly
      ? false
      : getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_drop_unwatched_stream_events", false);
  }
  function tr() {
    return outboundOnly ? DEFAULT_HISTORY_BACKFILL_CONFIG : historyBackfillConfig();
  }
  function ba() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_idle_heartbeat", false);
  }
  function ya() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_reconnect_beat", false);
  }
  function Ra() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_reactivation_beat", false);
  }
  function wa() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_skip_redundant_heartbeat", false);
  }
  let idleTracker = createIdleTracker();
  let starts = new Map();
  let artifactSocketIds = new Set();
  let gzipRequestBodyFetch = createGzipFetchWrapper("ccr_worker", storageV5);
  function gi() {
    return {
      heartbeatIntervalMs: cfg.heartbeat_interval_ms,
      heartbeatJitterFraction: cfg.heartbeat_jitter_fraction,
      onRequestAuthOk: Ua,
      causeTypedCloseCodes: true,
      selfHealHeartbeats: ga(),
      advertiseHeartbeatProbeSupport: ba(),
      beatOnStaleReconnect: ya(),
      idleTracker,
      beatOnReactivation: Ra(),
      skipRedundantHeartbeats: wa(),
      uploadTrim: () => getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_upload_trim", {}),
      keepsRequestId: () => getFeatureValue_CACHED_MAY_BE_STALE(TENGU_TOASTY_BEACON, false),
      uploadHoldMarker: () => getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_upload_hold_marker", false),
      liveOnlyShellTaskRows: {
        enabled: () => getFeatureValue_CACHED_MAY_BE_STALE("tengu_shell_task_rows_live_only_enabled", false),
        starts,
      },
      artifactSocketIds,
      followsServedPolicy: true,
      processExiting: isTerminalShutdown,
      streamEventFlushIntervalMs: fi(),
      streamEventFirstFlushMs: _i(),
      sseConnectTimeoutMs: () => getPollIntervalConfig().sse_connect_timeout_ms,
      gzipRequestBodyFetch,
      noSubscriberStreamEventFlushIntervalMs: pi(),
      noSubscriberUploadHoldMs: Ht(),
      dropUnwatchedStreamEvents: hi(),
      sseKeepaliveMaxIntervalSeconds: ma,
      longPollFallback: va,
      outboundOnly,
      nonOrigin403Retry: isBridgeNonOrigin403RetryEnabled(),
      inboundReadReceipts: isBridgeInboundReadReceiptsEnabled,
      onNonOriginRejectionRecovered: Ha,
      retainUndeliveredOnClose: true,
      internalEventUploader: {
        maxConsecutiveFailures: MAX_CONSECUTIVE_UPLOAD_FAILURES,
        maxBatchBytes: MAX_UPLOAD_BATCH_BYTES,
        requestTimeoutMs: UPLOAD_REQUEST_TIMEOUT_MS,
      },
    };
  }
  let ro = isReattach && (remoteControlOrigin !== undefined || noHistoryBackfill);
  let transport;
  try {
    transport = await createV2ReplTransport({
      ...gi(),
      sessionUrl,
      ingressToken: bridgeCredentials.worker_jwt,
      sessionId,
      epoch: bridgeCredentials.worker_epoch,
      initialSequenceNum: isReattach ? reattachSequenceNum : undefined,
      onConnectNeedsRecord: ro,
      getAuthToken: () => bridgeCredentials.worker_jwt,
    });
  } catch (err) {
    logForDebugging(`[remote-bridge] v2 transport setup failed: ${errorMessage(err)}`, {
      level: "error",
    });
    onStateChange?.("failed", `Transport setup failed: ${errorMessage(err)}`);
    logBridgeSkip("v2_transport_setup_failed", undefined, true);
    logFeatureBad("bridge_connect", "bridge_connect_transport_failed");
    if (!isReattach)
      retryArchiveAbandonedSession(sessionId, () =>
        archiveRemoteBridgeSession(
          sessionId,
          baseUrl,
          getOwnerToken(),
          orgUUID,
          cfg.http_timeout_ms,
          undefined,
          storageV5,
        ),
      );
    return null;
  }
  logForDebugging(`[remote-bridge] v2 transport created (epoch=${bridgeCredentials.worker_epoch})`);
  onStateChange?.("ready");
  let { worker_jwt: workerJwt, worker_epoch: workerEpoch_2, api_base_url: apiBaseUrl } = bridgeCredentials;
  let rl = null;
  let nl = new Set();
  let Ca = new Set();
  let Ma = false;
  let ol = false;
  let tn = 0;
  function il() {
    tn++;
    Ma = false;
    Ca = new Set();
  }
  let ka = null;
  function sl(e, r = false) {}
  function dl() {
    ka = null;
  }
  function Aa() {
    return false;
  }
  function ul(e, r, i = false) {
    return {
      added: [],
      removed: [],
    };
  }
  function Pa(e, r = false) {}
  let onMcpSetServers = (e) => {
    if (Object.keys(e).length === 0) {
      onProjectsBindingHint?.();
      return {
        ok: true,
        added: [],
        removed: [],
        errors: {},
        unknownServerCount: 0,
      };
    }
    return {
      ok: false,
      error: "Server-injected MCP servers are disabled for this Remote Control session",
    };
  };
  let xt = 0;
  let Lt = false;
  function Ia() {
    if (I) return;
    let now = Date.now();
    if (now - xt < REFRESH_MIN_INTERVAL_MS) {
      Lt = true;
      return;
    }
    xt = now;
    Lt = false;
    refresh.refreshNow(sessionId);
  }
  function vi() {
    if (I || !Lt) return;
    Lt = false;
    xt = Date.now();
    refresh.refreshNow(sessionId);
  }
  function rn() {
    try {
      Da("withdrawn");
    } catch (error) {
      logError(error);
      logFeatureBad("bridge_webagent_mcp_inject", "relinquish_threw");
    }
  }
  function Da(e) {}
  let recentPostedUUIDs = new BoundedUUIDSet(cfg.uuid_dedup_buffer_size);
  let initialMessageUUIDs = new Set();
  if (initialMessages)
    for (let msg of initialMessages) {
      initialMessageUUIDs.add(msg.uuid);
      recentPostedUUIDs.add(msg.uuid);
    }
  let recentInboundUUIDs = new BoundedUUIDSet(cfg.uuid_dedup_buffer_size);
  let flushGate = new Map();
  let no = new BoundedUUIDSet(cfg.uuid_dedup_buffer_size);
  let messageFlushGate = new FlushGate();
  let frameFlushGate = new FlushGate();
  let oo = 0;
  let $t = false;
  let Rt = false;
  let or = new Map();
  let ja = 64;
  let yr = isReattach;
  let io;
  let Rr;
  let transcriptMirrorMode =
    !isReattach &&
    !noHistoryBackfill &&
    !reattachFellBackToFresh &&
    isBackfillScopeAllowedForOrigin(tr().scope, remoteControlOrigin)
      ? "deferred"
      : "live";
  let transcriptUploadDeferred = remoteControlOrigin;
  let sn = new BoundedUUIDSet(cfg.uuid_dedup_buffer_size);
  let wt;
  let wr = {};
  let I = false;
  let an;
  let Be = false;
  let yi = 0;
  let ae = 0;
  function Ri() {
    yi++;
    ae = yi;
    Be = true;
    ir = Date.now();
    Er = false;
    return ae;
  }
  function wi(e) {
    if (ae !== e) return false;
    ae = 0;
    Be = false;
    ir = 0;
    Ei();
    return true;
  }
  let dn = false;
  function Ei() {
    if (!dn || I || re) {
      dn = false;
      return;
    }
    dn = false;
    if (pt !== undefined || !transport.isConnectedStatus()) return;
    if (messageFlushGate.active || frameFlushGate.active) drainFlushGate();
    Ao();
  }
  function Si() {
    ae = 0;
    Be = false;
    ir = 0;
    Ei();
  }
  let ir = 0;
  let Er = false;
  let Ti =
    cfg.init_retry_max_attempts * cfg.http_timeout_ms +
    (cfg.init_retry_max_attempts - 1) * cfg.init_retry_max_delay_ms;
  let Na =
    cfg.oauth_retry_base_delay_ms * (2 ** cfg.oauth_retry_max_attempts - 1) +
    cfg.oauth_retry_max_attempts * Ti;
  let Ci = 2 * (15000 + Ti + Na);
  let sr = 0;
  let Mi = 3;
  let ln = 0;
  let reconnectBudget = createReconnectBudget();
  function Ua() {
    ln = 0;
    reconnectBudget.noteHealthyBeat(Date.now());
    Xn();
    onAuthProven?.();
  }
  let un = false;
  let pt;
  function ar() {
    clearTimeout(pt);
    pt = undefined;
  }
  let Et = false;
  let St = null;
  let cn = false;
  function Sr() {
    let e = St;
    St = null;
    try {
      e?.tunnel.stop();
    } catch (error) {
      logForDebugging(`[remote-bridge] a held tunnel's stop threw: ${errorMessage(error)}`, {
        level: "error",
      });
      logError(error);
    }
  }
  let Ai = 0;
  let Pi = 0;
  function so(e) {
    let r = e === "a_start" ? Pi : Ai;
    let i = Date.now() - r;
    return Mt() && !(i >= 0 && i < OWNER_PIN_INCONCLUSIVE_TTL_MS);
  }
  function Oi() {
    if (isTeleportedSession(sessionId)) return true;
    if (cn || I || re || Et || supersession !== undefined || checkSdkUrl(apiBaseUrl) !== null) return true;
    let e = URL.parse(apiBaseUrl);
    return e === null || (e.protocol !== "https:" && e.protocol !== "wss:" && !isLoopbackHost(e.hostname));
  }
  let Ii = params.fixedCredentialNow !== undefined && params.fixedCredentialNow() !== "replaced";
  function lo() {
    return Ii && !Ar() && params.fixedCredentialNow?.() === "replaced";
  }
  function Fa(e) {
    if (St === null) return false;
    try {
      let r;
      switch (e) {
        case "flag_refresh":
          r = false;
          break;
        case "hand_over":
          r = so("hand_over");
          break;
        default:
          r = true;
      }
      return Oi() || r || lo() || St.dialedBase !== apiBaseUrl || St.isRefusedBySession();
    } catch (error) {
      logForDebugging(
        `[remote-bridge] live preview: the caller's check of its session threw: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
      logError(error);
      return true;
    }
  }
  function fn(reconnectingDetail) {
    Et = false;
    onStateChange?.("reconnecting", reconnectingDetail);
  }
  function Tr() {
    Et = false;
    onStateChange?.("connected");
  }
  function ve(e, r = "terminal") {
    Et = true;
    ar();
    tt = undefined;
    _n();
    ko?.end();
    Sr();
    onStateChange?.("failed", e, r);
  }
  function Di() {
    let e = er();
    return Promise.all([
      transport.flush({
        retryNow: e,
      }),
      e &&
        transport.flushInternalEvents?.({
          retryNow: e,
        }),
    ]).then(() => {});
  }
  function Cr(e = FLUSH_TIMEOUT_MS) {
    let r = sleep(e);
    let winner = Promise.race([Di().then(() => true), r.then(() => false)]);
    let winner_2 = Promise.race([
      transport.flushDeliveryAcks?.({
        retryNow: true,
      }),
      r,
    ]);
    return Promise.all([winner, winner_2]).then(([R]) => R);
  }
  async function Bi(e, r = Date.now()) {
    let i = transport.getUploadBacklog?.();
    let y = await Cr(PREFLUSH_TIMEOUT_MS);
    let R = {
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
    let e = messageFlushGate.end();
    let mapped = frameFlushGate.end().map((i) => i.frame);
    $t = false;
    Ni(e.length + mapped.length, mapped, transport.discardUndeliveredEvents?.() ?? []);
  }
  function Ni(e, r, i) {
    if (e === 0 && i.length === 0) return;
    logForDiagnosticsNoPII("warn", "bridge_repl_v2_client_events_lost", {
      queued: e,
      undelivered: i.length,
    });
    logFeatureSad("bridge_repl", "client_events_lost_at_dead_end", {
      queued: e,
      undelivered: i.length,
    });
    let y = [
      ...i.map((S) => S.payload.subtype),
      ...r.map((S) => (S.type === "system" && "subtype" in S ? S.subtype : undefined)),
    ];
    let included = y.includes("task_notification");
    let included_2 = y.includes("background_tasks_changed");
    if (included || included_2)
      logFeatureSad("ccr_task_status_publish", "status_events_lost_at_dead_end", {
        has_terminal_bookend: included,
        has_level: included_2,
      });
  }
  let be;
  let supersession;
  let Wt = false;
  let dr;
  let Tt;
  let tt;
  let Se = false;
  let Mr;
  let re = false;
  let kr;
  function qt() {
    return true;
  }
  function ht(e, r, i = true) {
    if (i) {
      dr = undefined;
      Tt = undefined;
    }
    if (!Wt || !qt()) return false;
    if (r === undefined) logFeatureSad("bridge_presence", e);
    else logFeatureSad("bridge_presence", e, r);
    return true;
  }
  function ke(e, r) {
    dr = undefined;
    Tt = undefined;
    Se = true;
    if (!qt()) return false;
    if (!Wt) {
      logFeatureBad("bridge_connect", "bridge_connect_died_before_presence");
      return false;
    }
    if (r === undefined) logFeatureBad("bridge_presence", e);
    else logFeatureBad("bridge_presence", e, r);
    return true;
  }
  let pn = false;
  function Ha(e) {
    if (I || re || Se) return;
    logForDebugging(
      `[remote-bridge] SSE stream live again after ${e.attempts} non-origin 403(s) over ${Math.round(e.streakMs / 1000)}s (source=${e.source})`,
    );
    if (
      ht(
        RECOVERED_NONORIGIN_CODES[e.source],
        {
          attempts: e.attempts,
          streak_s: Math.round(e.streakMs / 1000),
          first_in_episode: pn ? 0 : 1,
          recovery_bucket: bucketRecentUse(e.streakMs),
        },
        false,
      )
    )
      pn = true;
  }
  function uo(detail) {
    if (!isNonOriginSource(detail?.rejectSource)) {
      ke(transportClosed403Code(detail));
      return;
    }
    if (
      ke(transportClosed403Code(detail), {
        ...(detail.streak !== undefined && {
          attempts: detail.streak.attempts,
          streak_s: Math.round(detail.streak.streakMs / 1000),
        }),
        first_in_episode: pn ? 0 : 1,
      })
    )
      pn = true;
  }
  function Ui(e) {
    if (isTeleportedSession(sessionId)) return;
    let r = be === undefined ? undefined : classifySupersession(be.code, be.cause);
    if (supersession !== undefined || be === undefined || r === undefined || (Er && isNotArchived(r))) return;
    supersession = r;
    logForDebugging(
      `[remote-bridge] ${e} latched a stashed supersession close (${be.code}/${be.cause ?? "uncaused"}) \u2014 archive suppressed`,
    );
    if (!Se) {
      if (be.code === 403) uo(be.detail);
      else if (be.code === 404) ke("transport_closed_404");
      else {
        ht("transport_closed_4090");
        Se = true;
      }
      tt = undefined;
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
  function Fi(launcherLoginGeneration) {
    if (!isBridgeHostDeclinedEndEnabled()) return;
    let launcherLoginEnd = getLauncherLoginEnd();
    if (launcherLoginEnd === undefined || launcherLoginEnd.generation <= launcherLoginGeneration) return xi();
    return Hi(launcherLoginEnd.reason);
  }
  function Hi(reason) {
    switch (reason) {
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
    if (Tt === undefined) return;
    if (Tt.generation === getLauncherLoginGeneration()) return Tt.code;
    let launcherLoginEnd = getLauncherLoginEnd();
    return launcherLoginEnd === undefined ? undefined : Hi(launcherLoginEnd.reason);
  }
  function Li(e) {
    return e === "host_signed_out" ? BRIDGE_HOST_SIGNED_OUT_HINT : BRIDGE_HOST_ACCOUNT_CHANGED_HINT;
  }
  function $i(e) {
    return e === "host_signed_out" ? "auth" : "terminal";
  }
  function Ar() {
    return ownerPin !== undefined && !I && !re && isBridgeOwnerPinnedEndEnabled();
  }
  function Mt() {
    return Ar() && ownerPin !== undefined && ownerPin.identityLooksChanged();
  }
  async function fo(e, r) {
    if (re) return "changed";
    if (!Ar() || ownerPin === undefined) return "unchanged";
    let i = await ownerPin.confirmChanged(r);
    if (i === "changed") {
      await xa(e);
      return "changed";
    }
    return re ? "changed" : i;
  }
  async function lr(e) {
    return (await fo(e)) === "changed";
  }
  async function Pr(e, stale) {
    if (Mt() && (await lr(e))) return true;
    return I || ae !== stale;
  }
  async function xa(e) {
    if (I || re || ownerPin === undefined) return;
    re = true;
    kr?.();
    kr = undefined;
    refresh.cancelAll();
    Si();
    onOwnerChanged?.();
    un = false;
    Ui("owner_changed");
    be = undefined;
    clearTimeout(cr);
    ar();
    mn?.();
    mn = undefined;
    Gi();
    Ki();
    releaseReadReceiptOwnership(Ro);
    cn = true;
    Sr();
    if (isTeleportedSession(sessionId)) {
      logForDebugging(
        `[remote-bridge] Signed-in account changed under teleported session ${sessionId} (${e}) \u2014 latched only`,
      );
      _n();
      Sn();
      rn();
      transport.close();
      return;
    }
    let r = Se || supersession !== undefined;
    logForDebugging(
      `[remote-bridge] Signed-in account changed under ${sessionId} (${e}${r ? ", episode already dead" : ""}) \u2014 stopping`,
    );
    logForDiagnosticsNoPII("info", "bridge_repl_v2_owner_changed");
    if (!r) {
      ht(e);
      Se = true;
      ve(BRIDGE_OWNER_CHANGED_HINT, "terminal");
      transport.write(buildWorkerShuttingDownMessage(sessionId, "account_changed"));
      await Cr(er() ? cfg.teardown_archive_timeout_ms : FLUSH_TIMEOUT_MS).catch(() => {
        return;
      });
    } else if (!Et) ve(BRIDGE_OWNER_CHANGED_HINT, "terminal");
    else _n();
    Sn();
    rn();
    if (!I) transport.close();
    if (supersession !== undefined) return;
    let i;
    if (keepSessionOnTeardown) {
      i = "skipped_host_owned";
      logForDebugging(`[remote-bridge] Owner-changed settle left host-owned session ${sessionId} unarchived`);
    } else {
      let archiveResult = await archiveRemoteBridgeSession(
        sessionId,
        baseUrl,
        ownerPin.ownerToken(),
        orgUUID,
        cfg.teardown_archive_timeout_ms,
        undefined,
        storageV5,
      );
      i = archiveStatusCode(archiveResult, supersession);
      logForDebugging(
        `[remote-bridge] Owner-changed settle archived ${sessionId} with the owner's credential (archive=${archiveResult})`,
      );
    }
    if (qt())
      logEvent("tengu_bridge_owner_changed", {
        site: fromEnum(e),
        archive_status: fromEnum(i),
        episode_already_dead: r,
      });
  }
  function Wi() {
    if (supersession !== undefined) return supersession;
    if (re) return "owner_changed";
    return;
  }
  function _o() {
    if (ownerPin !== undefined && isBridgeOwnerPinnedEndEnabled() && ownerPin.identityLooksChanged())
      return {
        token: ownerPin.ownerToken(),
        source: "pinned_owner",
      };
    return {
      token: getAccessToken(),
      source: "current",
    };
  }
  let hn = isReattach;
  let De = new Map();
  let cl = undefined;
  let Gt = new Set();
  let ho = new BoundedIdSet(256);
  let qi = new BoundedIdSet(cfg.uuid_dedup_buffer_size);
  function go(requestId, r) {
    Gt.delete(requestId);
    if (De.delete(requestId) && r) rememberResolvedPromptRequestId(requestId);
  }
  function mo() {
    let e;
    let r = false;
    for (let [i, y] of De) {
      if (Gt.has(i)) continue;
      r = true;
      e = y.details ?? e;
    }
    if (r) $e("requires_action", e);
    else $e("running");
  }
  let vo;
  let $e = (e, r) => {
    if (onBeforePushTriggeringState && !re && (e === "requires_action" || e === "idle"))
      onBeforePushTriggeringState();
    transport.reportState(e, r);
    if (e === "requires_action" && r) {
      hn = true;
      let i = [...De.values()].flatMap((y) => (y.details ? [y.details] : [])).reverse();
      transport.reportMetadata({
        pending_action: r,
        pending_actions: pendingActionRows(
          r,
          i.filter((y) => y !== r),
        ),
      });
    } else if (hn) {
      hn = false;
      transport.reportMetadata({
        pending_action: null,
        pending_actions: null,
      });
    }
    if (e === "running" && vo !== "running") {
      transport.reportMetadata({
        post_turn_summary: null,
        recap: null,
      });
      noteBridgePostTurnSummaryWiped();
      if (transcriptMirrorMode === "deferred") {
        delete wr.post_turn_summary;
        delete wr.recap;
      }
    }
    vo = e;
  };
  function La() {
    Gt.clear();
    return [...De.values()].map((e) => e.request);
  }
  let mn;
  let bo;
  let vn;
  let yo;
  if (gitRepoUrl)
    (async () => {
      let { isNestedGitLabProject, parseGitRemote, parseGitHubRepository } =
        await import("./chunk-zqrznfbt.js");
      let {
        addWatchedRepo,
        removeWatchedRepo,
        getCachedBranchForRepo,
        onRepoBranchChange,
        getRemoteUrlForDir,
      } = await import("./chunk-crvm1n0n.js");
      let j = await import("./chunk-ehd9f85g.js");
      let gitRemote = parseGitRemote(gitRepoUrl);
      if (gitRemote && isNestedGitLabProject(gitRemote)) return;
      let W = gitRemote ? `${gitRemote.owner}/${gitRemote.name}` : parseGitHubRepository(gitRepoUrl);
      if (!W) return;
      let z = gitRemote ? `${gitRemote.host}/${gitRemote.owner}/${gitRemote.name}` : `github.com/${W}`;
      let originalCwd = getOriginalCwd();
      await addWatchedRepo(originalCwd);
      if (I || re) {
        removeWatchedRepo(originalCwd);
        return;
      }
      let le;
      let ce = isReattach;
      let ne = isReattach;
      let xe = 0;
      let qe = false;
      let rt = false;
      let Tn = async () => {
        qe = true;
        try {
          do {
            rt = false;
            let Ue = xe;
            if (I || re) return;
            let originalCwd_2 = getOriginalCwd();
            if (originalCwd_2 !== originalCwd) {
              removeWatchedRepo(originalCwd);
              originalCwd = originalCwd_2;
              await addWatchedRepo(originalCwd_2);
              if (I || re) {
                removeWatchedRepo(originalCwd_2);
                return;
              }
            }
            let cachedBranchForRepo = await getCachedBranchForRepo(originalCwd_2);
            if (Ue !== xe) {
              rt = true;
              continue;
            }
            if (I || et("branch_metadata")) return;
            if (cachedBranchForRepo === undefined) {
              if (le !== null) {
                le = null;
                if (ce) {
                  ce = false;
                  transport.reportMetadata({
                    current_branches: {
                      [W]: null,
                    },
                    worktree_state: {
                      [W]: null,
                    },
                  });
                } else
                  transport.reportMetadata({
                    current_branches: {
                      [W]: null,
                    },
                  });
              }
              continue;
            }
            if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_handoff_metadata", false)) {
              let [nd, Mn] = await Promise.all([
                j.collectWorktreeState(originalCwd_2, cachedBranchForRepo),
                j.withCollectTimeout(getRemoteUrlForDir(originalCwd_2)).catch(() => null),
              ]);
              if (Ue !== xe) {
                rt = true;
                continue;
              }
              if (I || et("branch_metadata")) return;
              let kn = Mn ? parseGitRemote(Mn) : null;
              let us = Mn ? parseGitHubRepository(Mn) : null;
              let cs = (kn ? `${kn.host}/${kn.owner}/${kn.name}` : us ? `github.com/${us}` : null) === z;
              let Io = cs ? cachedBranchForRepo : null;
              let Xe = cs ? nd : null;
              let fs = Xe
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
              le = fs;
              logForDebugging(`[remote-bridge] worktree_state \u2192 ${W}: ${JSON.stringify(Xe)}`);
              ce = Xe !== null;
              if (Xe !== null) ne = true;
              transport.reportMetadata({
                current_branches: {
                  [W]: Io,
                },
                worktree_state: {
                  [W]: Xe,
                },
              });
              continue;
            }
            if (ce) {
              ce = false;
              le = cachedBranchForRepo;
              transport.reportMetadata({
                current_branches: {
                  [W]: cachedBranchForRepo,
                },
                worktree_state: {
                  [W]: null,
                },
              });
              continue;
            }
            if (cachedBranchForRepo === le) continue;
            le = cachedBranchForRepo;
            transport.reportMetadata({
              current_branches: {
                [W]: cachedBranchForRepo,
              },
            });
          } while (rt);
        } catch (error) {
          logForDebugging(`[remote-bridge] current_branches emit failed: ${errorMessage(error)}`);
        } finally {
          qe = false;
        }
      };
      bo = () => {
        le = undefined;
        ce = ne;
        xe++;
        if (qe) rt = true;
      };
      let resolved = Promise.resolve();
      let Je = () => {
        if (qe) rt = true;
        else resolved = Tn();
        return resolved;
      };
      yo = () =>
        withDeadline(
          Je().then(() => transport.flushWorkerState?.() ?? true),
          j.WORKTREE_COLLECT_TIMEOUT_MS + TEARDOWN_FLUSH_TIMEOUT_MS,
        );
      vn = () => void Je();
      let Cn = onRepoBranchChange(vn);
      mn = () => {
        Cn();
        removeWatchedRepo(originalCwd);
      };
      Je();
    })().catch((error) =>
      logForDebugging(`[remote-bridge] current_branches setup failed: ${errorMessage(error)}`),
    );
  let Gi = onInteraction(() => idleTracker.noteActivity());
  let Ki = onGrowthBookRefresh(() => {
    transport.setStreamEventFlushIntervalMs?.(fi());
    transport.setStreamEventFirstFlushMs?.(_i());
    transport.setNoSubscriberStreamEventFlushIntervalMs?.(pi());
    transport.setNoSubscriberUploadHoldMs?.(Ht());
    transport.setDropUnwatchedStreamEvents?.(hi());
    Qa();
  });
  let Ro = {};
  bindReadReceiptSession({
    owner: Ro,
    sessionId,
    report: (e, r) => transport.reportDelivery(e, r),
  });
  let ur = new Map();
  let Vi = !onUserMessage;
  let userMessageCallbackDone = false;
  let connectCause = "initial";
  let wo = 0;
  let cr;
  function onConnectTimeout(cause) {
    if (I) return;
    logEvent("tengu_bridge_repl_connect_timeout", {
      v2: true,
      elapsed_ms: cfg.connect_timeout_ms,
      cause: fromEnum(cause),
    });
    logFeatureBad("bridge_connect", "bridge_connect_timeout");
    if (Se);
    else if (Object.values(CLOSE_CODE_RECOVERY).some((r) => r.cause === cause))
      tt = "recovery_connect_timeout";
    else if (cause === "proactive_refresh") tt = "refresh_connect_timeout";
  }
  async function $a(oauthToken) {
    if (!onAuth401) return "rejected";
    try {
      if (await onAuth401(oauthToken)) return "recovered";
    } catch (error) {
      logForDebugging(`[remote-bridge] Proactive forced OAuth refresh threw: ${errorMessage(error)}`, {
        level: "error",
      });
    }
    if (!ci() || !classifyFailedOAuthRefresh) return "rejected";
    return classifyFailedOAuthRefresh();
  }
  let Wa = 3;
  let Eo;
  let yn = 0;
  function So() {
    Eo = undefined;
    yn = 0;
  }
  function Ji(e) {
    return e !== undefined && e === Eo && ci();
  }
  let refresh = createTokenRefreshScheduler({
    refreshBufferMs: cfg.token_refresh_buffer_ms,
    onExhausted: (e) => {
      if (!I && !Se)
        co({
          leg: "bad",
          code: "chain_exhausted_no_oauth",
        });
      if (Be || I) return;
      if (Et) {
        logForDebugging(
          `[remote-bridge] Token refresh chain exhausted for ${e} \u2014 terminal state already showing, not repainting`,
        );
        return;
      }
      logForDebugging(
        `[remote-bridge] Token refresh chain exhausted for ${e} \u2014 surfacing auth failure`,
        {
          level: "error",
        },
      );
      onStateChange?.(
        "failed",
        "OAuth token unavailable \u2014 run /login to restore Remote Control",
        "auth",
      );
    },
    getAccessToken: async () => {
      if (re) return;
      if (Mt()) {
        let i = Se;
        if (await lr("owner_changed_refresh")) {
          if (re && !i)
            co({
              leg: "sad",
              code: "owner_changed",
            });
          return;
        }
      }
      if (workSecretCredentials) return ri;
      let stale = getAccessToken();
      let r = Ji(stale);
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
        if (supersession !== undefined || re) {
          logForDebugging(
            `[remote-bridge] Proactive refresh skipped: session ${re ? "stopped for an owner change" : "superseded"}`,
          );
          return;
        }
        if (Be || I) {
          logForDebugging("[remote-bridge] Recovery already in flight, skipping proactive refresh");
          if (Be && xt !== 0) Lt = true;
          return;
        }
        if (isTeleportedSession(sid)) {
          logForDebugging(`[remote-bridge] Proactive refresh suppressed for teleported session ${sid}`);
          return;
        }
        let i = Ri();
        let y = Se;
        let R = false;
        let _;
        let S;
        let D;
        let j;
        let H = false;
        function W(L, le, ce = "refresh_credentials_rejected", ne) {
          if (I) return;
          if (tt !== undefined && be === undefined) {
            ke(tt);
            tt = undefined;
          } else if (!y) {
            dr = ce;
            Tt =
              ne === undefined
                ? undefined
                : {
                    code: ne,
                    generation: getLauncherLoginGeneration(),
                  };
          }
          _ = L;
          S = "refresh_credentials_rejected";
          D = le;
        }
        async function z() {
          if (!(await Pr("owner_changed_refresh", i))) return false;
          if (re)
            j = {
              leg: "sad",
              code: "owner_changed",
            };
          return true;
        }
        try {
          if (await z()) return;
          let L = Ji(oauthToken);
          if (!L) So();
          let now = Date.now();
          let ce = tn;
          let fresh = await withRetry(
            () => {
              if (L)
                return Promise.resolve({
                  terminal: false,
                  reason: "oauth_rejected",
                });
              if (I || supersession !== undefined || ae !== i) return Promise.resolve(null);
              return eo(sid, oauthToken).then((qe) => (I || ae !== i ? qe : screenNonOriginRefusal(qe)));
            },
            "fetchRemoteCredentials (proactive)",
            cfg,
          );
          if (I || ae !== i) return;
          if (isCredentialsRejection(fresh)) {
            logForDebugging(
              L
                ? "[remote-bridge] Proactive cycle: bearer already rejected by /bridge \u2014 retrying the forced OAuth refresh without re-registering"
                : "[remote-bridge] Proactive /bridge re-mint rejected (oauth_rejected) \u2014 attempting forced OAuth refresh",
            );
            if (!L) logForDiagnosticsNoPII("error", "bridge_repl_v2_proactive_oauth_rejected");
            if (await z()) return;
            let launcherLoginGeneration = getLauncherLoginGeneration();
            let rt = await $a(oauthToken);
            let Tn = getAccessToken() ?? oauthToken;
            if (await z()) return;
            if (rt === "unreachable") {
              logForDebugging(
                "[remote-bridge] Proactive forced OAuth refresh got no verdict (token endpoint unreachable); keeping transport, a later cycle retries the refresh",
              );
              if (!L)
                j = {
                  leg: "sad",
                  code: "refresh_deferred_transient",
                };
              Eo = oauthToken;
              let Ue = yn < Wa;
              if (isTeleportedSession(sid)) Ue = false;
              if (Ue) {
                yn++;
                refresh.scheduleFromExpiresIn(sid, 0);
              }
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
                    if (I || supersession !== undefined || ae !== i) return Promise.resolve(null);
                    return eo(sid, Tn).then((Ue) => (I || ae !== i ? Ue : screenNonOriginRefusal(Ue)));
                  },
                  "fetchRemoteCredentials (proactive post-refresh)",
                  cfg,
                )
              : null;
            if (I || ae !== i) return;
            if (It && Je === null) {
              logForDebugging(
                "[remote-bridge] Proactive post-refresh re-mint failed (transient); fallback refresh will retry",
              );
              if (supersession === undefined)
                j = {
                  leg: "sad",
                  code: "post_refresh_remint_null",
                };
              return;
            }
            if (isCredentialsFailure(Je)) {
              j = {
                leg: "bad",
                code: `post_refresh_credentials_${failureSeverity(Je)}`,
              };
              W(describeCredentialFailure(Je), failureSeverity(Je), credentialsRejectedCode("refresh", Je));
              return;
            }
            if (Je === null || isCredentialsRejection(Je)) {
              let Ue = It ? undefined : Fi(launcherLoginGeneration);
              if (Ue !== undefined) {
                j = {
                  leg: "sad",
                  code: Ue,
                };
                logForDiagnosticsNoPII("info", "bridge_repl_v2_proactive_host_declined");
                W(Li(Ue), $i(Ue), "refresh_credentials_rejected", Ue);
                return;
              }
              j = {
                leg: "bad",
                code: It
                  ? "oauth_rejected_after_refresh"
                  : onAuth401
                    ? "oauth_rejected_refresh_failed"
                    : "oauth_rejected_no_refresh_path",
              };
              W(_a, "auth");
              return;
            }
            noteAcceptedToken(Tn);
            let Cn = await To(Je, "proactive_refresh", 0, now, ce);
            if (Cn === "suppressed_teleported") H = true;
            if (Cn === "rebuilt") {
              R = true;
              j = {
                leg: "sad",
                code: "oauth_rejected_recovered",
              };
              logForDebugging(
                "[remote-bridge] Transport rebuilt (proactive refresh after forced OAuth refresh)",
              );
            }
            return;
          }
          if (!fresh) {
            logForDebugging(
              "[remote-bridge] Proactive /bridge re-mint failed (transient); fallback refresh will retry",
            );
            logForDiagnosticsNoPII("warn", "bridge_repl_v2_proactive_remint_null");
            if (supersession === undefined)
              j = {
                leg: "sad",
                code: "remint_null",
              };
            return;
          }
          if (isCredentialsFailure(fresh)) {
            j = {
              leg: "bad",
              code: `credentials_${failureSeverity(fresh)}`,
            };
            W(
              describeCredentialFailure(fresh),
              failureSeverity(fresh),
              credentialsRejectedCode("refresh", fresh),
            );
            return;
          }
          noteAcceptedToken(oauthToken);
          let xe = await To(fresh, "proactive_refresh", 0, now, ce);
          if (xe === "suppressed_teleported") H = true;
          if (xe === "rebuilt") {
            R = true;
            j = {
              leg: "ok",
            };
            logForDebugging("[remote-bridge] Transport rebuilt (proactive refresh)");
          }
        } catch (err) {
          logForDebugging(`[remote-bridge] Proactive refresh rebuild failed: ${errorMessage(err)}`, {
            level: "error",
          });
          logForDiagnosticsNoPII("error", "bridge_repl_v2_proactive_refresh_failed");
          if (!I && !re) {
            _ = `Refresh failed: ${errorMessage(err)}`;
            S = "refresh_rebuild_failed";
            D = "terminal";
            j = {
              leg: "bad",
              code: "rebuild_threw",
            };
          }
        } finally {
          let L = H;
          if (isTeleportedSession(sid)) L = true;
          if (j !== undefined && !y && !I && !(L && j.leg === "bad")) co(j);
          if (!wi(i)) return;
          vi();
          let le = be;
          be = undefined;
          if (L) {
            if (le !== undefined && !I) ve("Session teleported to cloud");
          } else if (le !== undefined && !R && !I && !Se) {
            let ce = Rn(le.code, le.cause, le.detail, true, le.at);
            if (_ !== undefined && !ce && !I && !Be) ve(_, D);
          } else if (le !== undefined && R && !I) {
            if (Zi(le.code) && !y)
              ht(CLOSE_CODE_RECOVERY[le.code].recoveredCode, {
                recovery_bucket: bucketRecentUse(Date.now() - le.at),
              });
          } else if (_ !== undefined && !I) {
            ve(_, D);
            if (S !== undefined && S !== "refresh_credentials_rejected" && !y) ke(S);
          }
        }
      })();
    },
    label: "remote",
  });
  refresh.scheduleFromExpiresIn(sessionId, bridgeCredentials.expires_in);
  kr = ownerPin?.subscribe(() => {
    lr("owner_changed");
  });
  if (Mt()) lr("owner_changed");
  let Kt;
  function wireTransportCallbacks() {
    transport.setOnConnect((msgs) => {
      if (re) return;
      clearTimeout(cr);
      sr = 0;
      Mr = undefined;
      tt = undefined;
      Se = false;
      dr = undefined;
      Tt = undefined;
      Et = false;
      Xn();
      supersession = undefined;
      if (De.size > 0) {
        let last = [...De.values()].findLast((_) => _.details !== undefined);
        $e("requires_action", last?.details);
        Gt.clear();
      } else if (vo === "running" && Pt(() => true)) $e("running");
      logForDebugging("[remote-bridge] v2 transport connected");
      logForDiagnosticsNoPII("info", "bridge_repl_v2_transport_connected");
      resendReceipts();
      flushHistory(msgs);
      if (transcriptMirrorMode === "deferred") {
        if (Yt === undefined && !ns)
          reportTranscriptDeferred(transcriptUploadDeferred, () => {
            ns = true;
          });
      } else {
        if (fr)
          reportTranscriptDeferred(null, () => {
            fr = false;
          });
        Ao();
      }
      logEvent("tengu_bridge_repl_ws_connected", {
        v2: true,
        cause: fromEnum(connectCause),
        ...(wo > 0 && {
          remint_attempts: wo,
        }),
      });
      if (!Wt && qt()) {
        Wt = true;
        logFeatureOk("bridge_presence");
      }
      if (transcriptMirrorMode === "deferred") {
        if (!yr && De.size === 0) {
          let last = initialMessages
            ?.filter((initialMessage) => isEligibleBridgeMessage(initialMessage))
            .findLast((initialMessage) => !isAttachmentOrConsentFallback(initialMessage));
          if (Pt(() => last !== undefined && isRealUserTurn(last) && !isInterruptionMessage(last)))
            $e("running");
        }
        yr = true;
      }
      if (!yr && initialMessages && initialMessages.length > 0 && !reattachFellBackToFresh) {
        yr = true;
        let R = transport;
        let _ = flushInitialHistory(initialMessages);
        let deferred = Promise.withResolvers();
        _.catch((error) => logForDebugging(`[remote-bridge] flushHistory failed: ${error}`)).finally(() => {
          deferred.resolve();
          if (transport !== R || I || re || Be) return;
          drainFlushGate();
          Tr();
        });
        io = Promise.all([_, deferred.promise]);
        io.catch(() => {});
      } else if (Ir) Tr();
      else if ((messageFlushGate.active || frameFlushGate.active) && !Be) {
        ar();
        drainFlushGate();
        Tr();
      } else if (!messageFlushGate.active) Tr();
      Ja();
      Rr = transport;
    });
    transport.setOnData((data) => {
      if (re) return;
      if (Kt !== undefined) {
        Kt.push(data);
        return;
      }
      if (!Mt()) {
        i(data);
        return;
      }
      Kt = [data];
      r();
    });
    let e = transport;
    transport.setOnClose((y, R, _) => {
      if (Rr === e) Rr = undefined;
      let now = Date.now();
      return Rn(y, R, _, false, Math.min(now, e.lastFrameReadAt() ?? now));
    });
    function r() {
      lr("owner_changed").then((res) => {
        let R = Kt;
        if (R === undefined) return;
        if (res || I) {
          Kt = undefined;
          return;
        }
        let _ = R.length;
        while (R.length > 0) {
          if (re || I) {
            Kt = undefined;
            return;
          }
          if (_ === 0 && Mt()) {
            r();
            return;
          }
          _ = Math.max(0, _ - 1);
          let req = R.shift();
          if (req !== undefined) i(req);
        }
        Kt = undefined;
      });
    }
    function i(req) {
      handleIngressMessage(
        req,
        recentPostedUUIDs,
        recentInboundUUIDs,
        (code) => {
          if (isHumanInboundMessage(code, "bridge")) {
            idleTracker.noteActivity();
            Ot("client_prompt");
          }
          let _ =
            onInboundMessage !== undefined && code.type === "user" && isBridgeInboundReadReceiptsEnabled()
              ? normalizeUuidOrNull(code.uuid)
              : null;
          if (_ === null) return onInboundMessage?.(code);
          return withReadReceiptClaim(_, () => onInboundMessage?.(code));
        },
        onPermissionResponse
          ? (R) => {
              if (onPermissionResponse(R)) {
                let _ = R.response.subtype === "success" && !!R.response.response;
                if (_) {
                  idleTracker.noteActivity();
                  Ot("client_input");
                }
                go(R.response.request_id, _);
                if (!Rt) mo();
              }
            }
          : undefined,
        (R) => {
          if (isCoalescableControlRequest(R)) {
            idleTracker.noteActivity();
            Ot("client_input");
          }
          handleReplBridgeControlRequest(R, {
            transport,
            sessionId,
            onInterrupt,
            onStopTask,
            onBackgroundTasks,
            onCancelAsyncMessage,
            reportsInboundReadReceipts: () =>
              onInboundMessage !== undefined && isBridgeInboundReadReceiptsEnabled(),
            getInitializeState,
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
            getCommands,
            getPendingPrompts: La,
            onDialogKindsDeclared,
            onClientInitialize: Xa,
            onSetModel,
            onSetMaxThinkingTokens,
            onSetPermissionMode,
            onApplyFlagSettings,
            onRenameSession,
            onSetColor,
            onFileSuggestions,
            onReadFile,
            onGetWorkspaceDiff,
            onSideQuestion,
            onGetContextUsage,
            answerSharedControlRequest,
            onMcpAuthenticate,
            onMcpOauthCallbackUrl,
            onMcpReconnect,
            onMcpSetServers,
            onForkConversation,
            hasPendingPrompts: () => De.size > 0,
            outboundOnly,
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
  function Rn(code, cause, detail, y, R) {
    let _ = false;
    clearTimeout(cr);
    if (I || re) {
      Ni(0, [], transport.discardUndeliveredEvents?.() ?? []);
      return false;
    }
    if (!y) {
      logForDebugging(
        `[remote-bridge] v2 transport closed (code=${code}${detail ? ` source=${detail.rejectSource}` : ""})`,
      );
      logEvent("tengu_bridge_repl_ws_closed", {
        code,
        v2: true,
        close_cause: fromEnumOpt(cause),
        recovery_in_flight: Be,
        ...(detail !== undefined && {
          reject_source: fromEnum(detail.rejectSource),
        }),
      });
    }
    if (Be) {
      let W = ir ? Date.now() - ir : 0;
      if (W <= Ci) {
        be = {
          code: code ?? 4092,
          cause,
          detail,
          at: be?.at ?? Mr ?? R,
        };
        return false;
      }
      logForDebugging(
        `[remote-bridge] authRecoveryInFlight held ${Math.round(W / 1000)}s (> ceiling ${Math.round(Ci / 1000)}s) \u2014 treating as leaked, handling close directly`,
        {
          level: "error",
        },
      );
      logForDiagnosticsNoPII("error", "bridge_repl_v2_recovery_flag_leaked");
      Si();
      be = undefined;
      _ = true;
    }
    if (Zi(code)) {
      if (sr >= Mi) {
        logForDebugging(`[remote-bridge] ${code} recovery exhausted after ${sr} attempts`, {
          level: "error",
        });
        ve(`Transport recovery exhausted (code ${code})`);
        if (!Se)
          ke("recovery_exhausted", {
            close_code: code,
          });
        return false;
      }
      if (code === 4094 && !y) {
        if (ln >= Mi) {
          logForDebugging(
            `[remote-bridge] worker-credential recovery exhausted after ${ln} attempts with no successful heartbeat between them`,
            {
              level: "error",
            },
          );
          ve("Transport recovery exhausted (worker credential failures)", "auth");
          if (!Se) ke("cred_recovery_exhausted");
          return false;
        }
        ln++;
      }
      if (code === 4093 && !y) {
        let W = reconnectBudget.charge(Date.now(), to());
        switch (W) {
          case "hourly_exhausted":
          case "daily_exhausted": {
            let z = W === "hourly_exhausted" ? 1 : 24;
            logForDebugging(`[remote-bridge] heartbeat recovery budget exhausted (${z}h window)`, {
              level: "error",
            });
            ve(W === "hourly_exhausted" ? HOURLY_EXHAUSTED_DETAIL : DAILY_EXHAUSTED_DETAIL);
            if (!Se)
              ke("heartbeat_budget_exhausted", {
                window_h: z,
              });
            return false;
          }
          case "charged":
            break;
        }
      }
      sr++;
      Mr ??= R;
      Ka(code);
      return false;
    }
    let S = (y || _) && Er;
    let D = classifySupersession(code, cause);
    if (D !== undefined && !(S && isNotArchived(D))) supersession = D;
    let j = S && cause === "superseded_by_worker" ? undefined : cause;
    let H =
      code === 4090 &&
      (j === "superseded_by_worker" || j === "session_not_active" || j === "session_not_found");
    ve(
      H ? describeBridgeCloseCode(code, j) : `Transport closed: ${describeBridgeCloseCode(code, j, detail)}`,
      H ? "ended_elsewhere" : "terminal",
    );
    if (Se) return H;
    if (code === 4090) {
      if (y && Er) ke("transport_closed_4090");
      else {
        ht("transport_closed_4090");
        Se = true;
      }
    } else if (code === 403) uo(detail);
    else ke(code === 404 ? "transport_closed_404" : "transport_closed_other");
    return H;
  }
  async function To(fresh, r, i, y, R) {
    raiseWorkerEpoch(fresh.worker_epoch);
    if (isTeleportedSession(sessionId)) {
      logForDebugging(`[remote-bridge] Rebuild suppressed for teleported session ${sessionId}`);
      return "suppressed_teleported";
    }
    connectCause = r;
    wo = i;
    supersession = undefined;
    Er = true;
    hn = false;
    bo?.();
    Sn();
    messageFlushGate.start();
    frameFlushGate.start();
    try {
      let _ = transport;
      let initialSequenceNum = _.getLastSequenceNum();
      let initialLongPollMode = _.isLongPolling?.() === true;
      Rr = undefined;
      _.close({
        goodbye: false,
        retainUndelivered: true,
      });
      transport = await createV2ReplTransport({
        ...gi(),
        sessionUrl: buildCCRv2SdkUrl(fresh.api_base_url, sessionId),
        ingressToken: fresh.worker_jwt,
        sessionId,
        epoch: fresh.worker_epoch,
        initialSequenceNum,
        initialLongPollMode,
        onConnectNeedsRecord: ro && !wn,
        getAuthToken: () => fresh.worker_jwt,
      });
      if (I) {
        transport.close();
        return "rebuilt";
      }
      if (re) {
        transport.close();
        return "suppressed_owner_changed";
      }
      wireTransportCallbacks();
      transport.connect();
      carryOverUndeliveredEvents(_);
      vn?.();
      reseedBridgePermissionMode();
      reseedBridgeCrossSessionInbound();
      reseedBridgeModel();
      reseedBridgeArtifacts();
      reseedBridgePostTurnSummary();
      resendBridgeEffortMetadata();
      reseedBridgeContextUsage();
      onTransportRebuilt?.();
      cr = setTimeout(onConnectTimeout, cfg.connect_timeout_ms, connectCause);
      refresh.scheduleFromExpiresIn(sessionId, fresh.expires_in);
      workerJwt = fresh.worker_jwt;
      workerEpoch_2 = fresh.worker_epoch;
      apiBaseUrl = fresh.api_base_url;
      let j = xt !== 0 && (Lt || y < xt);
      xt = 0;
      let H = R < tn;
      Lt = j || H;
      try {
        Pa(fresh, H);
      } catch (error) {
        logError(error);
        logFeatureBad("bridge_webagent_mcp_inject", "refresh_threw");
      }
      drainFlushGate();
    } finally {
      messageFlushGate.deactivate();
      frameFlushGate.deactivate();
    }
    return "rebuilt";
  }
  async function Qi(e, r, i) {
    let y = !i && onClassifyMissingOAuthToken !== undefined && qt() && isBridgeSignedOutNeutralEnabled();
    let R = y ? await onClassifyMissingOAuthToken(e) : undefined;
    if (y && (I || ae !== r)) return;
    if (R === "signed_out") {
      logForDebugging(`[remote-bridge] Signed out on this machine under ${sessionId} (${e}) \u2014 stopping`);
      logForDiagnosticsNoPII("info", "bridge_repl_v2_signed_out");
      ht("signed_out");
      if (!Wt) logFeatureSad("bridge_connect", "signed_out");
      Se = true;
      ve(pa, "auth");
      return;
    }
    ve(ca, "auth");
    if (!i) ke("recovery_no_oauth_token");
  }
  async function qa(e, stale, i, y) {
    let now = Date.now();
    logForDiagnosticsNoPII("info", "bridge_repl_v2_remint_loop_entered");
    un = true;
    let _ = 0;
    try {
      let S = false;
      let D = 0;
      for (let j = 1; !I; j++) {
        if (ae !== stale)
          return {
            creds: null,
            attempts: _,
          };
        let rounded = Math.round((Date.now() - now) / 60000);
        fn(
          `${workSecretCredentials ? "Remote Control credentials unavailable" : "Remote Control server unreachable"} \u2014 retrying (attempt ${j}${rounded > 0 ? `, ${rounded}m elapsed` : ""})`,
        );
        let min = Math.min(BRIDGE_REMINT_BACKOFF_BASE_MS * 2 ** (j - 1), BRIDGE_REMINT_BACKOFF_CAP_MS);
        await sleep(Math.max(Math.random() * min, BRIDGE_REMINT_MIN_JITTER_MS));
        if (I) break;
        if (ae !== stale)
          return {
            creds: null,
            attempts: _,
          };
        ir = Date.now();
        if (isTeleportedSession(sessionId)) {
          ve("Session teleported to cloud");
          logForDiagnosticsNoPII("info", "bridge_repl_v2_remint_loop_teleported");
          return {
            creds: null,
            attempts: _,
          };
        }
        let laneToken = getLaneToken();
        if (!laneToken) {
          logForDiagnosticsNoPII("info", "bridge_repl_v2_remint_loop_no_oauth");
          await Qi("remint_loop", stale, i);
          return {
            creds: null,
            attempts: _,
          };
        }
        let L = await refetchCredentials(laneToken, stale);
        _ = j;
        if (I) break;
        if (ae !== stale)
          return {
            creds: null,
            attempts: _,
          };
        if (L === null) {
          D++;
          if (y === undefined || D < y.attempts) continue;
          logForDebugging(
            `[remote-bridge] Re-mint loop exhausted (code ${e}): ${D} unreachable attempts, ${Math.round((Date.now() - now) / 1000)}s`,
            {
              level: "error",
            },
          );
          logForDiagnosticsNoPII("info", "bridge_repl_v2_remint_loop_exhausted", {
            attempts: _,
            elapsed_ms: Date.now() - now,
            queued_writes_dropped:
              messageFlushGate.pendingCount + frameFlushGate.pendingCount + frameFlushGate.evictedCount,
          });
          ve(y.exhaustedDetail);
          if (!i)
            ke("recovery_exhausted", {
              close_code: e,
              remint_attempts: _,
            });
          return {
            creds: null,
            attempts: _,
          };
        }
        if (isCredentialsRejection(L)) {
          if (onAuth401 && !S) {
            if (await Pr("owner_changed_recovery", stale))
              return {
                creds: null,
                attempts: _,
              };
            S = true;
            let le = false;
            try {
              le = await onAuth401(laneToken);
            } catch (error) {
              logForDebugging(`[remote-bridge] Re-mint loop OAuth refresh threw: ${errorMessage(error)}`, {
                level: "error",
              });
            }
            if (I) break;
            if (ae !== stale)
              return {
                creds: null,
                attempts: _,
              };
            if (le) {
              logForDebugging(
                "[remote-bridge] Re-mint rejected after outage \u2014 OAuth refresh succeeded; retrying with the refreshed credential",
              );
              continue;
            }
          }
          ve(Yn, "auth");
          if (!i) ke("recovery_credentials_rejected");
          logForDiagnosticsNoPII("info", "bridge_repl_v2_remint_loop_rejected");
          return {
            creds: null,
            attempts: _,
          };
        }
        if (isCredentialsFailure(L)) {
          ve(describeCredentialFailure(L), failureSeverity(L));
          if (!i) ke(credentialsRejectedCode("recovery", L));
          logForDiagnosticsNoPII("info", "bridge_repl_v2_remint_loop_denied");
          return {
            creds: null,
            attempts: _,
          };
        }
        logForDebugging(
          `[remote-bridge] Re-mint loop succeeded (code ${e}, attempt ${j}, ${Math.round((Date.now() - now) / 1000)}s)`,
        );
        logForDiagnosticsNoPII("info", "bridge_repl_v2_remint_loop_recovered", {
          attempts: j,
          elapsed_ms: Date.now() - now,
        });
        return {
          creds: L,
          attempts: _,
        };
      }
      return {
        creds: null,
        attempts: _,
      };
    } finally {
      if (ae === stale) un = false;
    }
  }
  let CLOSE_CODE_RECOVERY = {
    401: {
      reconnectingDetail: "JWT expired \u2014 refreshing",
      cause: "auth_401_recovery",
      failureDiagnostic: "bridge_repl_v2_jwt_refresh_failed",
      fetchFailure: "terminal",
      remintCap: undefined,
      recoveredCode: "recovered_auth_401",
      needsOAuthRefresh: true,
    },
    4091: {
      reconnectingDetail: "CCR init failed \u2014 retrying",
      cause: "init_4091_recovery",
      failureDiagnostic: "bridge_repl_v2_4091_recovery_failed",
      fetchFailure: "terminal",
      remintCap: undefined,
      recoveredCode: "recovered_init_4091",
      needsOAuthRefresh: false,
    },
    4093: {
      reconnectingDetail: "presence heartbeats failing \u2014 reconnecting",
      cause: "heartbeat_4093_recovery",
      failureDiagnostic: "bridge_repl_v2_4093_recovery_failed",
      fetchFailure: "retry",
      remintCap: OWNER_REMINT_CAP,
      recoveredCode: "recovered_heartbeat_4093",
      needsOAuthRefresh: false,
    },
    4094: {
      reconnectingDetail: "worker credential expired \u2014 re-minting",
      cause: "cred_4094_recovery",
      failureDiagnostic: "bridge_repl_v2_4094_recovery_failed",
      fetchFailure: "terminal",
      remintCap: undefined,
      recoveredCode: "recovered_cred_4094",
      needsOAuthRefresh: true,
    },
  };
  function Zi(e) {
    if (e === 4094) return isBridgeAuthReviveEnabled();
    return e === 401 || e === 4091 || e === 4093;
  }
  let es = 30000;
  let Ga = 5000;
  function rebuildTransport(fresh, cause) {
    if (CLOSE_CODE_RECOVERY[fresh].fetchFailure === "terminal") {
      ve(cause);
      return;
    }
    messageFlushGate.start();
    frameFlushGate.start();
    fn("presence recovery failed \u2014 retrying");
    logForDebugging(`[remote-bridge] ${fresh} recovery fetch failed \u2014 retrying in ${es}ms`);
    ar();
    let i = transport;
    function recoverFromAuthFailure() {
      pt = undefined;
      if (I) return;
      if (sr === 0) {
        if (messageFlushGate.active || frameFlushGate.active) {
          if (Be) {
            pt = setTimeout(recoverFromAuthFailure, Ga);
            return;
          }
          drainFlushGate();
          Tr();
        }
        return;
      }
      if (transport !== i) return;
      Rn(fresh, undefined, undefined, true, Mr ?? Date.now());
    }
    pt = setTimeout(recoverFromAuthFailure, es);
  }
  async function Ka(fresh) {
    let r = Se;
    let i = Mr ?? Date.now();
    if (isTeleportedSession(sessionId)) {
      ve("Session teleported to cloud");
      return;
    }
    if (Be) return;
    let stale = Ri();
    messageFlushGate.start();
    frameFlushGate.start();
    fn(CLOSE_CODE_RECOVERY[fresh].reconnectingDetail);
    logForDebugging(`[remote-bridge] ${fresh} on transport \u2014 attempting credential refresh + rebuild`);
    try {
      if (await Pr("owner_changed_recovery", stale)) return;
      let accessToken = getAccessToken();
      let _ = true;
      let launcherLoginGeneration = getLauncherLoginGeneration();
      if (!workSecretCredentials && CLOSE_CODE_RECOVERY[fresh].needsOAuthRefresh && onAuth401)
        try {
          _ = await onAuth401(accessToken ?? "", "stale");
        } catch (error) {
          _ = false;
          logForDebugging(`[remote-bridge] ${fresh} recovery OAuth refresh threw: ${errorMessage(error)}`, {
            level: "error",
          });
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
      let D = getLaneToken() ?? accessToken;
      let j = D === heldHostSessionsBearer();
      if (!D || I) {
        if (!I) await Qi("recovery", stale, r);
        return;
      }
      if (isTeleportedSession(sessionId)) {
        ve("Session teleported to cloud");
        return;
      }
      let now = Date.now();
      let W = tn;
      let fresh_2 = await withRetry(
        () => refetchCredentials(D, stale),
        "fetchRemoteCredentials (recovery)",
        cfg,
      );
      if (ae !== stale) return;
      if (
        (!fresh_2 || isCredentialsRejection(fresh_2)) &&
        !I &&
        CLOSE_CODE_RECOVERY[fresh].needsOAuthRefresh &&
        onAuth401 &&
        !_
      ) {
        let ce = false;
        for (let idx = 1; idx <= cfg.oauth_retry_max_attempts && !I; idx++) {
          fn(
            `OAuth refresh failed \u2014 waiting for a fresh login (${idx}/${cfg.oauth_retry_max_attempts})`,
          );
          await sleep(
            backoffDelayMs({
              attempt: idx,
              baseMs: cfg.oauth_retry_base_delay_ms,
              jitter: {
                kind: "symmetric",
                ratio: cfg.init_retry_jitter_fraction,
              },
            }),
          );
          if (await Pr("owner_changed_recovery", stale)) return;
          let xe;
          try {
            xe = onReadFreshOAuthToken
              ? await onReadFreshOAuthToken()
              : (await onAuth401(accessToken ?? ""))
                ? getAccessToken()
                : undefined;
          } catch (err) {
            logForDebugging(
              `[remote-bridge] Adopt-loop token read threw (attempt ${idx}): ${errorMessage(err)}`,
              {
                level: "error",
              },
            );
          }
          if (I || ae !== stale) return;
          let qe = xe !== undefined && xe !== (accessToken ?? "") ? xe : undefined;
          if (!qe) continue;
          ce = true;
          if (isTeleportedSession(sessionId)) {
            ve("Session teleported to cloud");
            return;
          }
          fresh_2 = await withRetry(
            () => refetchCredentials(qe, stale),
            "fetchRemoteCredentials (recovery re-poll)",
            cfg,
          );
          break;
        }
        if (ae !== stale) return;
        if (isCredentialsRejection(fresh_2) && !ce) {
          if (!I) {
            let ne = Fi(launcherLoginGeneration);
            if (ne !== undefined) {
              logForDiagnosticsNoPII("info", "bridge_repl_v2_recovery_host_declined");
              ve(Li(ne), $i(ne));
              if (!r)
                if (Wt) {
                  ht(ne);
                  Se = true;
                } else ke("recovery_reauth_required");
              return;
            }
            ve("OAuth token refresh failed \u2014 run /login to re-authenticate", "auth");
            if (!r) ke("recovery_reauth_required");
          }
          return;
        }
      }
      if (I) return;
      if (!fresh_2 && CLOSE_CODE_RECOVERY[fresh].fetchFailure === "retry" && !to()) {
        rebuildTransport(fresh, `could not fetch fresh session credentials after code ${fresh}`);
        return;
      }
      if (
        isCredentialsRejection(fresh_2) &&
        (!CLOSE_CODE_RECOVERY[fresh].needsOAuthRefresh || (_ && D === accessToken && j)) &&
        onAuth401
      ) {
        if (await Pr("owner_changed_recovery", stale)) return;
        let ce = false;
        try {
          ce = await onAuth401(CLOSE_CODE_RECOVERY[fresh].needsOAuthRefresh ? D : (accessToken ?? ""));
        } catch (error) {
          logForDebugging(`[remote-bridge] ${fresh} late OAuth refresh threw: ${errorMessage(error)}`, {
            level: "error",
          });
        }
        if (I || ae !== stale) return;
        if (ce) {
          fresh_2 = await withRetry(
            () => refetchCredentials(getAccessToken() ?? accessToken ?? "", stale),
            `fetchRemoteCredentials (${fresh} late refresh)`,
            cfg,
          );
          if (I || ae !== stale) return;
        }
      }
      if (isCredentialsRejection(fresh_2)) {
        ve(Yn, "auth");
        if (!r) ke("recovery_credentials_rejected");
        return;
      }
      let L = 0;
      if (!fresh_2) {
        let ce = await qa(fresh, stale, r, to() ? CLOSE_CODE_RECOVERY[fresh].remintCap : undefined);
        fresh_2 = ce.creds;
        L = ce.attempts;
        if (!fresh_2 || I || ae !== stale) return;
      }
      if (isCredentialsFailure(fresh_2)) {
        if (!I) {
          ve(describeCredentialFailure(fresh_2), failureSeverity(fresh_2));
          if (!r) ke(credentialsRejectedCode("recovery", fresh_2));
        }
        return;
      }
      if (ae !== stale) return;
      let le = await To(fresh_2, CLOSE_CODE_RECOVERY[fresh].cause, L, now, W);
      if (le === "suppressed_teleported") {
        ve("Session teleported to cloud");
        return;
      }
      if (le === "suppressed_owner_changed") return;
      logForDebugging(`[remote-bridge] Transport rebuilt after ${fresh}`);
      if (!I) {
        if (!r)
          ht(CLOSE_CODE_RECOVERY[fresh].recoveredCode, {
            ...(L > 0 && {
              remint_attempts: L,
            }),
            recovery_bucket: bucketRecentUse(Date.now() - i),
          });
      }
    } catch (error) {
      logForDebugging(`[remote-bridge] ${fresh} recovery failed: ${errorMessage(error)}`, {
        level: "error",
      });
      logForDiagnosticsNoPII("error", CLOSE_CODE_RECOVERY[fresh].failureDiagnostic);
      if (!I && !re) {
        rebuildTransport(fresh, `Transport recovery failed (${fresh}): ${errorMessage(error)}`);
        if (CLOSE_CODE_RECOVERY[fresh].fetchFailure === "terminal" && !r) ke("recovery_failed");
      }
    } finally {
      if (wi(stale)) {
        vi();
        if (pt !== undefined && be !== undefined) {
          ar();
          let R = be;
          be = undefined;
          Rn(R.code, R.cause, R.detail, true, R.at);
        } else be = undefined;
        if (pt === undefined && !Be) {
          messageFlushGate.drop();
          frameFlushGate.drop();
          $t = false;
        }
      }
    }
  }
  wireTransportCallbacks();
  if (!isReattach && initialMessages && initialMessages.length > 0) {
    messageFlushGate.start();
    frameFlushGate.start();
  }
  transport.connect();
  cr = setTimeout(onConnectTimeout, cfg.connect_timeout_ms, connectCause);
  function Pt(e) {
    return isTurnLive ? isTurnLive(e) : e();
  }
  function toLiveSdkEvents(e) {
    return toRedactedSdkEvents(e, "live").map((r) => {
      if (r.type !== "assistant" || r.parent_tool_use_id !== null || r.uuid === undefined)
        return {
          ...r,
          session_id: sessionId,
        };
      let i = or.get(r.uuid);
      if (i === undefined)
        return {
          ...r,
          session_id: sessionId,
        };
      or.delete(r.uuid);
      return {
        ...r,
        session_id: sessionId,
        user_message_uuid: i,
        user_message_uuids: [i],
      };
    });
  }
  function drainFlushGate() {
    let e = transcriptMirrorMode === "deferred";
    let r = e
      ? messageFlushGate.end().filter((H) => hasUserMessagingToolUse(H.message))
      : messageFlushGate.end();
    let i = e ? frameFlushGate.end().filter((H) => !isTaskLifecycleMessage(H.frame)) : frameFlushGate.end();
    let y = $t;
    $t = false;
    if (r.length === 0 && i.length === 0) {
      if (e && Pt(() => y) && De.size === 0) $e("running");
      return;
    }
    let R = [];
    let _ = [];
    let S = () => {
      if (_.length > 0) {
        R.push(...toLiveSdkEvents(_));
        _ = [];
      }
    };
    let D = 0;
    let j = 0;
    while (D < r.length || j < i.length) {
      let H = r[D];
      let W = i[j];
      if (H && (!W || H.seq < W.seq)) {
        recentPostedUUIDs.add(H.message.uuid);
        sn.add(H.message.uuid);
        Co = true;
        _.push(H.message);
        D++;
      } else if (W) {
        S();
        let frame = W.frame;
        if ("uuid" in frame && typeof frame.uuid === "string") no.add(frame.uuid);
        R.push(
          Object.assign({}, frame, {
            session_id: sessionId,
          }),
        );
        j++;
      }
    }
    S();
    if (Pt(() => y) && De.size === 0) $e("running");
    logForDebugging(
      `[remote-bridge] Drained ${r.length} queued message(s) and ${i.length} SDK event(s) / control frame(s) after flush`,
    );
    transport.writeBatch(R);
  }
  function carryOverUndeliveredEvents(e) {
    let r = e.takeUndeliveredEvents?.() ?? [];
    if (r.length === 0) return;
    logForDebugging(
      `[remote-bridge] Carrying ${r.length} undelivered client event(s) over to the rebuilt transport`,
    );
    logForDiagnosticsNoPII("info", "bridge_repl_v2_events_carried_over", {
      count: r.length,
    });
    logEvent("tengu_bridge_repl_events_carried_over", {
      count: r.length,
    });
    transport.adoptUndeliveredEvents?.(r);
  }
  function writeOrQueueFrame(event, r) {
    let i = event.type !== "result" && Ir && !Be;
    let [y] = accountMemoryRedactor.redact([event], "events", "live");
    if (y === undefined) return;
    if (
      !i &&
      frameFlushGate.enqueue({
        seq: oo++,
        frame: y,
      })
    ) {
      logForDebugging(`[remote-bridge] Queued ${r} during flush`);
      return;
    }
    transport.write(y);
    logForDebugging(`[remote-bridge] Sent ${r}`);
  }
  async function flushInitialHistory(msgs) {
    accountMemoryRedactor.note(msgs);
    let eligible = msgs.filter(isEligibleBridgeMessage);
    let capped = sliceTailKeepingGroups(eligible, initialHistoryCap);
    if (capped.length < eligible.length)
      logForDebugging(
        `[remote-bridge] Capped initial flush: ${eligible.length} -> ${capped.length} (cap=${initialHistoryCap})`,
      );
    let events = toRedactedSdkEvents(capped).map((m) => ({
      ...m,
      session_id: sessionId,
      historical: true,
    }));
    if (events.length === 0) return;
    let last = eligible.findLast((_) => !isAttachmentOrConsentFallback(_));
    if (Pt(() => last !== undefined && isRealUserTurn(last) && !isInterruptionMessage(last)) && De.size === 0)
      $e("running");
    logForDebugging(`[remote-bridge] Flushing ${events.length} history events`);
    await transport.writeBatch(events);
  }
  let wn = false;
  let Ir = false;
  let Co = false;
  let ns = false;
  let fr = false;
  function reportTranscriptDeferred(transcriptUploadDeferred, r) {
    let i = transport;
    let y = i.droppedWorkerStatePatchCount?.() ?? 0;
    i.reportInternalMetadata?.({
      transcript_upload_deferred: transcriptUploadDeferred,
    });
    i.flushWorkerState?.().then((R) => {
      if (R && (i.droppedWorkerStatePatchCount?.() ?? 0) === y) r();
    });
  }
  let Dr;
  function flushHistory(msgs) {
    if (wn) return;
    wn = true;
    if (transcriptMirrorMode === "deferred") {
      transport.reportMetadata({
        transcript_mirror: "deferred",
      });
      os();
      return;
    }
    if (!ro) return;
    let r = msgs === undefined || msgs.readFailed === true;
    let transcriptUploadDeferred_2 = r ? undefined : msgs.internal?.transcript_upload_deferred;
    if (
      isBackfillOriginScope(transcriptUploadDeferred_2) &&
      (noHistoryBackfill || remoteControlOrigin === undefined)
    ) {
      if (!re)
        transport.reportMetadata({
          transcript_mirror: "live",
        });
      fr = true;
      reportTranscriptDeferred(null, () => {
        fr = false;
      });
    } else if (isBackfillOriginScope(transcriptUploadDeferred_2)) {
      transcriptUploadDeferred = transcriptUploadDeferred_2;
      transcriptMirrorMode = "deferred";
      os();
      if (Co) Yt = "rows_already_live";
      else if (!isBackfillScopeAllowedForOrigin(tr().scope, transcriptUploadDeferred)) Yt = "flag_off";
    } else if (
      (r || (transcriptUploadDeferred_2 !== undefined && transcriptUploadDeferred_2 !== null)) &&
      isBackfillScopeAllowedForOrigin(tr().scope, remoteControlOrigin)
    ) {
      transcriptMirrorMode = "deferred";
      Yt = "marker_unreadable";
    }
  }
  let Yt;
  function Ja() {
    if (Yt === undefined) return;
    let e = Yt;
    Yt = undefined;
    Ot(e);
  }
  function os() {
    Dr = Date.now();
    logForDebugging("[remote-bridge] Transcript upload deferred until a client opens this session");
    logForDiagnosticsNoPII("info", "bridge_repl_transcript_deferred", {
      reattach: isReattach,
    });
    logEvent("tengu_bridge_transcript_deferral", {
      phase: fromEnum("deferred"),
      reattach: isReattach,
      hold_ms: Ht(),
    });
  }
  let is = false;
  function Xa() {
    if (transcriptMirrorMode !== "deferred" || is) {
      onClientInitialize?.();
      return;
    }
    is = true;
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
    if (
      transcriptMirrorMode === "deferred" &&
      !isBackfillScopeAllowedForOrigin(tr().scope, transcriptUploadDeferred)
    )
      Ot("flag_off");
  }
  function Ot(e, r = Promise.resolve()) {
    if (wt) return wt;
    if (I || transcriptMirrorMode !== "deferred") return Promise.resolve();
    if (!re)
      transport.reportMetadata({
        ...wr,
        transcript_mirror: "live",
      });
    wr = {};
    transcriptMirrorMode = "live";
    yr = true;
    let i = De.size > 0;
    logForDebugging(`[remote-bridge] Releasing deferred transcript (${e})`);
    Ir = true;
    messageFlushGate.start();
    frameFlushGate.start();
    resolved = onTransportPersistenceReady ? Mo() : Promise.resolve();
    let y = transport;
    wt = r
      .then(() => ed(e, i))
      .catch((error) =>
        logForDebugging(`[remote-bridge] Transcript back-fill failed: ${errorMessage(error)}`, {
          level: "error",
        }),
      )
      .finally(() => {
        Ir = false;
        if (transport !== y || I || re || !wn) return;
        if (Be) {
          dn = true;
          return;
        }
        drainFlushGate();
        Ao();
      });
    return wt;
  }
  let Jt;
  let resolved = Promise.resolve();
  let ss = [];
  function Mo() {
    return new Promise((resolve) => {
      ss.push(resolve);
    });
  }
  let jr = false;
  let ko;
  function as() {
    return Promise.resolve()
      .then(() => ko?.runNow())
      .catch(logError);
  }
  function Sn() {
    if (Jt !== undefined) {
      jr = true;
      resolved = Mo();
    }
    onTransportPersistenceTeardown?.();
  }
  function Ao() {
    if (!onTransportPersistenceReady || Jt === transport) return;
    let internalEventWriter = transport.getInternalEventWriter?.();
    let r = internalEventWriter && accountMemoryRedactor.wrapInternalEventWriter(internalEventWriter);
    let i = internalEventWriter && accountMemoryRedactor.wrapInternalEventWriter(internalEventWriter, "live");
    let y = r && i && ((_, S, D) => (typeof S.uuid === "string" && qi.has(S.uuid) ? i : r)(_, S, D));
    let internalEventReaders = transport.getInternalEventReaders?.();
    if (r && internalEventReaders) {
      let _ = !isReattach && Jt === undefined;
      let S = transport;
      Jt = S;
      jr = true;
      resolved = Mo();
      ko = onTransportPersistenceReady(
        r,
        internalEventReaders,
        sessionId,
        _,
        (D) => {
          if (D && Jt === S) {
            jr = false;
            for (let j of ss.splice(0)) j();
          }
        },
        accountMemoryRedactor.note,
        y,
      );
    }
  }
  function Za() {
    let e = transport;
    if (!e.setSubscribersReportedListener) return Promise.resolve();
    let promise = new Promise((resolve) => {
      e.setSubscribersReportedListener?.((y) => {
        if (y) resolve();
      });
    });
    return Promise.race([
      promise,
      sleep(SUBSCRIBERS_REPORTED_TIMEOUT_MS, undefined, {
        unref: true,
      }),
    ]).finally(() => e.setSubscribersReportedListener?.(undefined));
  }
  async function ed(e, r) {
    if (I) return;
    let i = et("transcript backfill") ? undefined : getBackfillMessages?.(sessionId);
    accountMemoryRedactor.note(i ?? []);
    let y = new Set(messageFlushGate.pending.map((L) => L.message.uuid));
    let eligible = (i ?? []).filter((m) => isEligibleBridgeMessage(m) && !sn.has(m.uuid) && !y.has(m.uuid));
    let _ = sliceTailKeepingGroups(eligible, tr().backfillMessages);
    logForDebugging(
      `[remote-bridge] Back-filling ${_.length} of ${eligible.length} eligible message(s)${i === undefined ? " (history withheld by host)" : ""}`,
    );
    logForDiagnosticsNoPII("info", "bridge_repl_transcript_released", {
      reason: e,
      backfilled: _.length,
      eligible: eligible.length,
      withheld: i === undefined,
    });
    logEvent("tengu_bridge_transcript_deferral", {
      phase: fromEnum("released"),
      reason: fromEnum(e),
      backfilled: _.length,
      eligible: eligible.length,
      history_withheld: i === undefined,
      deferred_ms: Dr === undefined ? undefined : Date.now() - Dr,
      hold_ms: Ht(),
    });
    let events = toRedactedSdkEvents(_).map((L) => ({
      ...L,
      session_id: sessionId,
      historical: true,
    }));
    for (let L of eligible) {
      recentPostedUUIDs.add(L.uuid);
      initialMessageUUIDs.add(L.uuid);
    }
    for (let L of _) sn.add(L.uuid);
    let last = eligible.findLast((L) => !isAttachmentOrConsentFallback(L));
    let j =
      r ||
      De.size > 0 ||
      Pt(() => last !== undefined && isRealUserTurn(last) && !isInterruptionMessage(last));
    if (e !== "client_prompt" && !j && events.length > 0)
      events.push(
        Object.assign(buildBridgeResultMessage(sessionId), {
          historical: true,
        }),
      );
    let H = transport.droppedDurableBatchCount?.() ?? 0;
    let W = transport;
    for (let L = 0; L < events.length; L += BACKFILL_BATCH_SIZE) {
      if (I || re) return;
      if (transport !== W) {
        await transport.writeBatch(events.slice(L));
        break;
      }
      await transport.writeBatch(events.slice(L, L + BACKFILL_BATCH_SIZE));
      if (L + BACKFILL_BATCH_SIZE < events.length)
        await Promise.race([
          transport.flush(),
          sleep(BACKFILL_BATCH_FLUSH_TIMEOUT_MS, undefined, {
            unref: true,
          }),
        ]);
    }
    let z = transport;
    z.flush().then(() => {
      if ((z.droppedDurableBatchCount?.() ?? 0) > H) {
        logForDiagnosticsNoPII("warn", "bridge_repl_transcript_backfill_dropped");
        logEvent("tengu_bridge_transcript_deferral", {
          phase: fromEnum("backfill_dropped"),
          reason: fromEnum(e),
          hold_ms: Ht(),
        });
      }
      if (I || re) return;
      fr = true;
      reportTranscriptDeferred(null, () => {
        fr = false;
      });
    });
  }
  let Po = keepSessionOnTeardown === true;
  let reason;
  function td(e) {
    if (e?.skipArchive) Po = true;
    if (e?.reason) reason = e.reason;
    if (an) return an;
    I = true;
    an = teardown();
    return an;
  }
  async function teardown() {
    Ui("teardown");
    if (transcriptMirrorMode === "deferred")
      logEvent("tengu_bridge_transcript_deferral", {
        phase: fromEnum("exited_unopened"),
        deferred_ms: Dr === undefined ? undefined : Date.now() - Dr,
        hold_ms: Ht(),
      });
    let e = tt ?? dr;
    if (e !== undefined) {
      if (!isTeleportedSession(sessionId)) {
        let ne = tt === undefined ? xi() : undefined;
        if (ne !== undefined && Wt && isBridgeHostDeclinedEndEnabled()) ht(ne);
        else ke(e);
      }
      tt = undefined;
      dr = undefined;
      Tt = undefined;
    } else if (!Se && be?.code === 403 && !isTeleportedSession(sessionId)) uo(be.detail);
    else if (
      !Se &&
      ((sr > 0 && (pt !== undefined || Be)) || (be !== undefined && be.code !== 4090)) &&
      !isTeleportedSession(sessionId)
    )
      ke("recovery_abandoned_at_teardown");
    mn?.();
    Gi();
    Ki();
    releaseReadReceiptOwnership(Ro);
    kr?.();
    kr = undefined;
    Sn();
    rn();
    cn = true;
    Sr();
    refresh.cancelAll();
    clearTimeout(cr);
    ar();
    _n();
    transport.writeBatch(
      reason !== undefined
        ? [buildWorkerShuttingDownMessage(sessionId, reason), buildBridgeResultMessage(sessionId)]
        : [buildBridgeResultMessage(sessionId)],
    );
    $e("idle");
    if (Po || (un && reason !== "remote_control_disabled")) {
      let ne = keepSessionOnTeardown ? "skipped_host_owned" : Po ? "skipped_teleport" : "skipped_remint_loop";
      let xe;
      if (er()) xe = await Bi("skip_archive_flush_timeout");
      else if (reason !== undefined) await Cr();
      let token = ji();
      transport.close();
      logEvent("tengu_bridge_repl_teardown", {
        v2: true,
        archive_status: fromEnum(ne),
        archive_ok: false,
        ...xe,
        ...token,
      });
      await transport.flushGoodbye();
      logForDebugging(`[remote-bridge] Teardown complete (skipArchive): session=${sessionId}`);
      logForDiagnosticsNoPII("info", "bridge_repl_v2_teardown");
      ls();
      return;
    }
    let teardownArchiveTimeoutMs = cfg.teardown_archive_timeout_ms;
    let now = Date.now();
    let y = Wi();
    let R;
    let _ = now;
    let S = teardownArchiveTimeoutMs;
    if (er() && y === undefined) {
      let ne = now + CLEANUP_TIMEOUT_MS - CLEANUP_FLUSH_RESERVE_MS;
      R = await Bi("exit_flush_timeout", now);
      _ = now + R.hold_preflush_ms;
      S = Math.max(1, Math.min(teardownArchiveTimeoutMs, ne - _));
    }
    let D = _ + S;
    let j = y === undefined ? _o() : undefined;
    let token = j?.token;
    let archiveResult = await archiveRemoteBridgeSession(sessionId, baseUrl, token, orgUUID, S, y, storageV5);
    let z = D - Date.now();
    if (
      archiveResult === 401 &&
      j?.source === "current" &&
      onAuth401 &&
      z >= ARCHIVE_AUTH_RETRY_MIN_REMAINING_MS
    )
      try {
        await Promise.race([onAuth401(token ?? ""), sleep(z)]);
        j = _o();
        token = j.token;
        archiveResult = await archiveRemoteBridgeSession(
          sessionId,
          baseUrl,
          token,
          orgUUID,
          Math.max(1, D - Date.now()),
          y,
          storageV5,
        );
      } catch (error) {
        logForDebugging(`[remote-bridge] Teardown 401 retry threw: ${errorMessage(error)}`, {
          level: "error",
        });
      }
    let archiveMs = Date.now() - _;
    if (reason !== undefined && R === undefined) await Cr();
    let le = ji();
    transport.close();
    let ce = archiveStatusCode(archiveResult, supersession);
    logEvent("tengu_bridge_repl_teardown", {
      v2: true,
      archive_status: fromEnum(ce),
      archive_credential: fromEnumOpt(j?.source),
      archive_ok: typeof archiveResult === "number" && archiveResult < 400,
      archive_http_status:
        typeof archiveResult === "number"
          ? archiveResult
          : archiveResult === "untrusted_device"
            ? 403
            : undefined,
      archive_timeout: archiveResult === "timeout",
      archive_no_token: archiveResult === "no_token",
      ...R,
      archive_budget_ms: S,
      archive_ms: archiveMs,
      ...le,
    });
    await transport.flushGoodbye();
    logForDebugging(`[remote-bridge] Torn down (archive=${archiveResult})`);
    logForDiagnosticsNoPII("info", "bridge_repl_v2_teardown");
    ls();
  }
  logEvent("tengu_bridge_repl_started", {
    has_initial_messages: !!(initialMessages && initialMessages.length > 0),
    v2: true,
    ccr_session_id: sanitizeMarkName(toInfraSessionId(sessionId)),
    expires_in_s: bridgeCredentials.expires_in,
    inProtectedNamespace: isEvalBuild(),
    ...cooAttributes(),
  });
  logFeatureOk("bridge_connect");
  function et(type) {
    if (!re) return false;
    logForDebugging(`[remote-bridge] Dropping ${type} after owner change`);
    return true;
  }
  function fl(e) {
    Sr();
    if (Oi() || outboundOnly || workSecretCredentials) return "refused";
    if (lo()) return "sign_in_changed";
    if (so("a_start")) {
      ds((r) => e.onSignInChecked(r));
      return "checking_sign_in";
    }
    try {
      let r = apiBaseUrl;
      let i = e.start({
        sessionId,
        apiBaseUrl: r,
        accessToken: workerJwt,
      });
      if (i !== null)
        St = {
          tunnel: i,
          isRefusedBySession: e.isRefusedBySession,
          dialedBase: r,
        };
    } catch (error) {
      logForDebugging(`[remote-bridge] live preview: the starter threw: ${errorMessage(error)}`, {
        level: "error",
      });
      logError(error);
    }
    return St === null ? "refused" : "started";
  }
  async function ds(e) {
    let r = false;
    try {
      r =
        (await fo("owner_changed_live_preview", {
          fresh: true,
        })) === "unchanged" && Ai !== 0;
      if (r) Pi = Date.now();
    } catch (error) {
      logForDebugging(`[remote-bridge] live preview: the owner check failed: ${errorMessage(error)}`, {
        level: "error",
      });
      logError(error);
    } finally {
      try {
        e(r);
      } catch (err) {
        logForDebugging(
          `[remote-bridge] live preview: the caller's report of the sign-in check threw: ${errorMessage(err)}`,
          {
            level: "error",
          },
        );
        logError(err);
      }
    }
  }
  function _l() {
    if (St === null) return "refused";
    if (lo()) return "sign_in_changed";
    if (Fa("flag_refresh")) return "refused";
    if (!Ar()) {
      let e = Ii ? params.fixedCredentialNow?.() : undefined;
      switch (e) {
        case "as_at_init":
          return null;
        case "unreadable":
          return "sign_in_unreadable";
        case "replaced":
          return "sign_in_changed";
        case undefined:
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
    getJoinedProjectThread: undefined,
    requestInjectedMcpReassert: Ia,
    canAdoptInjectedMcp: Aa,
    detachForHandoff: () => {
      refresh.cancelAll();
      rn();
      cn = true;
      Sr();
    },
    sessionGroupingId: effectiveGroupingId,
    outboundOnly: outboundOnly ?? false,
    environmentId: "",
    sessionIngressUrl: bridgeCredentials.api_base_url,
    gitRepoUrl,
    ...(workSecretCredentials && {
      getWorkerBearerToken: () => (I ? null : workerJwt),
      getWorkerEpoch: () => workerEpoch_2,
    }),
    ...false,
    getLastSequenceNum: () => transport.getLastSequenceNum(),
    settleUploadsBeforeHandoff: () => {
      if (wt !== undefined || transcriptMirrorMode === "deferred" || jr) {
        let e = async () => {
          let r = Date.now() + UPLOAD_BUDGET_MS;
          let i = async (y, what, _) => {
            let S = false;
            await Promise.race([
              y.finally(() => {
                S = true;
              }),
              sleep(Math.max(0, _ - Date.now()), undefined, {
                unref: true,
              }),
            ]);
            if (!S)
              logForDiagnosticsNoPII("warn", "bridge_repl_handoff_wait_expired", {
                what,
              });
          };
          await i(
            Jt === transport ? as() : resolved,
            "transcript_copy_catch_up",
            r - TEARDOWN_FLUSH_TIMEOUT_MS,
          );
          if (jr) logForDiagnosticsNoPII("warn", "bridge_repl_handoff_transcript_copy_behind");
          await i(
            Promise.all([
              transport.flush({
                retryNow: true,
              }),
              transport.flushInternalEvents?.({
                retryNow: true,
              }),
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
        ? Cr(TEARDOWN_FLUSH_TIMEOUT_MS).then(
            () => {},
            () => {},
          )
        : Promise.resolve();
    },
    awaitUploadsForHandoff: (e) =>
      settleRemoteBridgeDelivery(
        {
          sessionKind: () => {
            if (wt !== undefined || transcriptMirrorMode === "deferred") return "deferred";
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
              transport.flush({
                retryNow: true,
              }),
              transport.flushInternalEvents?.({
                retryNow: true,
              }),
            ]).then(() => {}),
        },
        {
          budgetMs: e?.budgetMs ?? UPLOAD_BUDGET_MS,
          signal: e?.signal,
          log: (r) => logForDebugging(r),
          onBudgetPassed: (what) =>
            logForDiagnosticsNoPII("warn", "bridge_repl_handoff_upload_wait_expired", {
              what,
            }),
          onFault: (what) =>
            logForDiagnosticsNoPII("warn", "bridge_repl_handoff_upload_wait_fault", {
              what,
            }),
        },
      ),
    flush: () => {
      drainFlushGate();
      return Di();
    },
    writeMessages(e) {
      if (et("writeMessages")) return;
      accountMemoryRedactor.note(e, "live");
      for (let _ of e) if (!initialMessageUUIDs.has(_.uuid)) qi.add(_.uuid);
      let filtered = e.filter(
        (m) =>
          isEligibleBridgeMessage(m) && !initialMessageUUIDs.has(m.uuid) && !recentPostedUUIDs.has(m.uuid),
      );
      if (filtered.length === 0) return;
      if (!Vi)
        for (let _ of filtered) {
          let text = deriveTitleFromHumanTurn(_);
          if (text !== undefined && onUserMessage?.(text, sessionId)) {
            Vi = true;
            break;
          }
        }
      let any = filtered.some(Rt ? isPlainUserPrompt : isRealUserTurn);
      if (any) Rt = false;
      if (!userMessageCallbackDone && any) {
        userMessageCallbackDone = true;
        markBridgePlaceholderUsed(sessionId, storageV5);
      }
      let y = filtered;
      if (transcriptMirrorMode === "deferred") {
        y = filtered.filter(hasUserMessagingToolUse);
        if (y.length === 0) {
          if (messageFlushGate.active) $t ||= any;
          else if (Pt(() => any) && De.size === 0) $e("running");
          return;
        }
      }
      if (
        messageFlushGate.enqueue(
          ...y.map((message) => ({
            seq: oo++,
            message,
          })),
        )
      ) {
        if (any) $t = true;
        logForDebugging(`[remote-bridge] Queued ${y.length} message(s) during flush`);
        return;
      }
      for (let msg of y) {
        sn.add(msg.uuid);
        recentPostedUUIDs.add(msg.uuid);
      }
      Co = true;
      let liveSdkEvents = toLiveSdkEvents(y);
      if (Pt(() => any) && De.size === 0) $e("running");
      logForDebugging(`[remote-bridge] Sending ${y.length} message(s)`);
      transport.writeBatch(liveSdkEvents);
    },
    reportMetadata(e) {
      if (et("reportMetadata")) return;
      if (transcriptMirrorMode === "deferred") {
        let { post_turn_summary: postTurnSummary, task_summary: taskSummary, recap, ...R } = e;
        let _ = {
          post_turn_summary: postTurnSummary,
          task_summary: taskSummary,
          recap,
        };
        for (let key of Object.keys(_)) if (key in e) wr[key] = _[key];
        let S = R;
        if ("post_turn_summary" in e)
          S.post_turn_summary =
            typeof postTurnSummary === "object" &&
            postTurnSummary !== null &&
            "status_category" in postTurnSummary
              ? {
                  status_category: postTurnSummary.status_category,
                }
              : null;
        if (Object.keys(S).length === 0) return;
        transport.reportMetadata(S);
        return;
      }
      transport.reportMetadata(e);
    },
    reportInternalMetadata(e) {
      if (et("reportInternalMetadata")) return false;
      return transport.reportInternalMetadata?.(e) ?? false;
    },
    workerEpoch: () => ({
      sessionId,
      epoch: transport.getEpoch(),
    }),
    refreshGitBranch() {
      vn?.();
    },
    async publishGitStateBeforeHandoff() {
      if (!yo) return;
      try {
        bo?.();
        let e = await yo();
        if (e === undefined)
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
      let filtered = e.filter((_) => !_.uuid || !no.has(_.uuid));
      let i =
        transcriptMirrorMode === "deferred" ? filtered.filter((_) => !isTaskLifecycleMessage(_)) : filtered;
      let y = accountMemoryRedactor.redact(i);
      if (y.length === 0) return;
      if (frameFlushGate.active) {
        let filtered = y.filter((D) => D.type !== "stream_event");
        let S = y.length - filtered.length;
        if (S > 0) logForDebugging(`[remote-bridge] Dropped ${S} stream_event frame(s) during flush`);
        if (filtered.length > 0) {
          frameFlushGate.enqueue(
            ...filtered.map((frame) => ({
              seq: oo++,
              frame,
            })),
          );
          logForDebugging(`[remote-bridge] Queued ${filtered.length} SDK event(s) during flush`);
          try {
            if (filtered.some(isSubagentStreamMessage)) {
              let D = frameFlushGate.evictedCount > 0;
              frameFlushGate.evictOldest((j) => isSubagentStreamMessage(j.frame), MAX_QUEUED_SUBAGENT_FRAMES);
              if (!D && frameFlushGate.evictedCount > 0)
                logForDebugging(
                  `[remote-bridge] Over ${MAX_QUEUED_SUBAGENT_FRAMES} subagent frames queued during flush; dropping the oldest until it drains`,
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
      for (let msg of y) if (msg.uuid) no.add(msg.uuid);
      let events = y.map((_) => ({
        ..._,
        session_id: sessionId,
      }));
      transport.writeBatch(events);
    },
    sendControlRequest(e) {
      rememberOutboundRequestId(e.request_id, {
        automated: !isPermissionPromptSubtype(e),
      });
      let request = e.request;
      if (isAccountMemoryControlRequest(request, placeAccountMemoryTool)) {
        ho.add(e.request_id);
        logForDebugging(
          `[remote-bridge] Keeping an account memory prompt at the terminal (not sent to Remote Control): ${e.request_id}`,
        );
        return false;
      }
      if (request.subtype === "can_use_tool" || request.subtype === "request_user_dialog") {
        De.delete(e.request_id);
        De.set(e.request_id, {
          request: e,
        });
        Gt.delete(e.request_id);
      }
      if (request.subtype === "request_user_dialog" && ((frameFlushGate.active && !Ir) || Be)) {
        Gt.add(e.request_id);
        logForDebugging(
          `[remote-bridge] Not forwarding request_user_dialog while writes are gated / transport recovering (local-only): ${e.request_id}`,
        );
        return false;
      }
      if (et("control_request")) return false;
      let event = {
        ...e,
        session_id: sessionId,
      };
      if (request.subtype === "can_use_tool") {
        let y;
        if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_requires_action_details", false)) {
          let R = request.tool_name === BASH_TOOL_NAME || request.tool_name === POWERSHELL_TOOL_NAME;
          let _;
          if (request.tool_name === ASKUSERQUESTION) {
            let questions = Array.isArray(request.input?.questions) ? request.input.questions : [];
            let W = questions[0];
            let z = W?.header || W?.question;
            _ = {
              label: "Question",
              body: z
                ? z + (questions.length > 1 ? ` (+${questions.length - 1} more)` : "")
                : "Tap to answer",
            };
          } else if (request.tool_name === EXITPLANMODE)
            _ = {
              label: "Plan",
              body: "Plan ready for review",
            };
          else if (request.tool_kind === "mcp_skill")
            _ = {
              label: request.display_name ?? request.tool_name,
              body: "",
            };
          if (!_ && request.requires_user_interaction)
            _ = {
              label: request.display_name ?? request.tool_name,
              body: "",
            };
          let S =
            R && typeof request.input?.command === "string"
              ? redactSecretsInText(request.input.command)
              : undefined;
          let D = R && (request.description === undefined || hasHostField(request.input));
          let description =
            R && typeof request.input?.description === "string" ? request.input.description : undefined;
          y = {
            tool_name: request.tool_name,
            display_tool_name: _?.label ?? request.display_name ?? request.tool_name,
            action_description:
              _?.body ??
              redactSecretsInText(
                (!D && (request.description || description)) || (S && truncate(S, 120)) || "",
              ),
            raw_command: _ ? undefined : S,
            tool_use_id: request.tool_use_id,
            request_id: _ ? "" : e.request_id,
            ...(_ &&
              e.request_id && {
                suppressed_request_id: e.request_id,
              }),
            input: request.input,
          };
        }
        if (y)
          De.set(e.request_id, {
            request: e,
            details: y,
          });
        Rt = false;
        $e("requires_action", y);
      } else if (request.subtype === "request_user_dialog") {
        let y;
        if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_requires_action_details", false))
          y = dialogPermissionRequest(
            request.dialog_kind,
            request.payload,
            e.request_id,
            request.tool_use_id,
          );
        if (y)
          De.set(e.request_id, {
            request: e,
            details: y,
          });
        Rt = false;
        $e("requires_action", y);
      }
      writeOrQueueFrame(event, `control_request request_id=${e.request_id}`);
      return true;
    },
    sendControlResponse(e, r) {
      if (ho.has(e.response.request_id)) return;
      if (!r?.skipStateReport) go(e.response.request_id, true);
      if (et("control_response")) return;
      let event = {
        ...e,
        session_id: sessionId,
      };
      if (!r?.skipStateReport && !Rt) mo();
      writeOrQueueFrame(event, "control_response");
    },
    sendControlCancelRequest(e) {
      if (ho.delete(e)) return;
      if (Gt.delete(e)) {
        De.delete(e);
        logForDebugging(`[remote-bridge] Local-only retract of a declined dialog forward request_id=${e}`);
        return;
      }
      go(e, true);
      if (et("control_cancel_request")) return;
      let event = {
        type: "control_cancel_request",
        request_id: e,
        session_id: sessionId,
      };
      if (!Rt) mo();
      writeOrQueueFrame(event, `control_cancel_request request_id=${e}`);
    },
    sendResult(e) {
      $t = false;
      Rt = true;
      if (et("result")) return;
      settleHeldReadReceipts();
      $e("idle");
      if (transcriptMirrorMode === "deferred" && !tr().eagerResult) {
        logForDebugging("[remote-bridge] Withheld result (transcript deferred)");
        return;
      }
      let bridgeResultMessage = buildBridgeResultMessage(
        sessionId,
        transcriptMirrorMode === "deferred" && e?.outcome !== undefined
          ? {
              ...e,
              outcome: {
                ...e.outcome,
                result: undefined,
              },
            }
          : e,
      );
      writeOrQueueFrame(
        bridgeResultMessage,
        `result ${bridgeResultMessage.subtype} is_error=${bridgeResultMessage.is_error} num_turns=${bridgeResultMessage.num_turns}${bridgeResultMessage.user_message_uuid ? ` user_message_uuid=${bridgeResultMessage.user_message_uuid}` : ""}`,
      );
    },
    stampReply({ assistantUuid, userMessageUuid }) {
      or.set(assistantUuid, userMessageUuid);
      if (or.size > ja) {
        let i = or.keys().next().value;
        if (i !== undefined) or.delete(i);
      }
    },
    async subscribePR(e, r, i) {
      if (re)
        return {
          ok: false,
          reason: "owner_changed",
        };
      let y = `${e}#${r}`;
      let R = ur.get(y);
      if (i)
        ur.set(y, {
          agentId: i,
          repo: e,
          prNumber: r,
        });
      let _ = await subscribeGithubPullRequest("subscribe", {
        sessionId,
        repo: e,
        prNumber: r,
        baseUrl,
        getAccessToken,
        getTrustedDeviceToken,
        onUnauthorized: recoverHostSessionsBearer,
      });
      if (!_.ok && i)
        if (R) ur.set(y, R);
        else ur.delete(y);
      return _;
    },
    async unsubscribePR(e, r) {
      if (re)
        return {
          ok: false,
          reason: "owner_changed",
        };
      let i = await subscribeGithubPullRequest("unsubscribe", {
        sessionId,
        repo: e,
        prNumber: r,
        baseUrl,
        getAccessToken,
        getTrustedDeviceToken,
        onUnauthorized: recoverHostSessionsBearer,
      });
      if (i.ok) ur.delete(`${e}#${r}`);
      return i;
    },
    async recordCreatedPR(e, timeoutMs) {
      if (I)
        return {
          ok: false,
          skipped: "no_bridge",
        };
      if (re)
        return {
          ok: false,
          skipped: "owner_changed",
        };
      return buildJsonHeaders({
        sessionUrl: buildCCRv2SdkUrl(apiBaseUrl, sessionId),
        workerToken: workerJwt,
        ...e,
        timeoutMs,
      });
    },
    async fetchInboxMessage(fileId) {
      let r = (i) => {
        logFeatureBad("bridge_inbox_fetch", i);
        return {
          ok: false,
          reason: i,
        };
      };
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
          return I ? "no_bridge" : undefined;
        };
        let y = await i();
        if (y) return r(y);
        if (onProactiveRefresh)
          try {
            await onProactiveRefresh();
          } catch (error) {
            logForDebugging(`[remote-bridge] inbox fetch: token refresh failed: ${errorMessage(error)}`, {
              level: "error",
            });
          }
        let accessToken = getAccessToken();
        let trustedDeviceToken = await getTrustedDeviceToken();
        if (onProactiveRefresh) {
          let D = await i({
            fresh: true,
          });
          if (D) return r(D);
        }
        let { fetchSessionInboxMessage } = require("./chunk-49ddv0ee.js");
        return fetchSessionInboxMessage({
          sessionId,
          fileId,
          baseUrl,
          getAccessToken: () => accessToken,
          getTrustedDeviceToken: () => Promise.resolve(trustedDeviceToken),
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
        e === undefined ? _o().token : undefined,
        orgUUID,
        cfg.teardown_archive_timeout_ms,
        e,
        storageV5,
      );
    },
    [Symbol.asyncDispose]() {
      return Oo.teardown({
        reason: "host_exit",
      });
    },
  };
  if (keepSessionOnTeardown && !isReattach) removeBridgePlaceholdersFor(sessionId, storageV5);
  let ls = registerCleanup(Oo);
  return Oo;
}
//@ chunk-4cm44bmp.js:95205-95591 fingerprint = withRetry (0.782)
/**
 * 通用重试：fn 返回非 null 即成功，否则按 init_retry_* 配置做带对称抖动的指数退避，最多 init_retry_max_attempts 次。
 */
async function withRetry(fn, label, cfg) {
  let max = cfg.init_retry_max_attempts;
  for (let attempt = 1; attempt <= max; attempt++) {
    let result = await fn();
    if (result !== null) return result;
    if (attempt < max) {
      let delay = Math.min(
        backoffDelayMs({
          attempt,
          baseMs: cfg.init_retry_base_delay_ms,
          jitter: {
            kind: "symmetric",
            ratio: cfg.init_retry_jitter_fraction,
          },
        }),
        cfg.init_retry_max_delay_ms,
      );
      logForDebugging(
        `[remote-bridge] ${label} failed (attempt ${attempt}/${max}), retrying in ${Math.round(delay)}ms`,
      );
      await sleep(delay);
    }
  }
  return null;
}
//@ chunk-4cm44bmp.js:95591-96332 layout
/**
 * 在 withRetry 外再加 401 恢复：某次调用报告 401 且该 token 未尝试过时调用 onAuth401 刷新 OAuth；刷新发生在最后一次尝试时再额外试一次。
 */
async function withRetryAndAuthRecovery(call, label, cfg, authOptions) {
  let refreshed = false;
  let x = false;
  let Q = await withRetry(
    async () => {
      if (refreshed) x = true;
      let accessToken = authOptions.getAccessToken();
      let A = false;
      let Z = await call(accessToken, () => {
        A = true;
      });
      let Y = isCredentialsRejection(Z);
      if (
        (Z === null || Y) &&
        A &&
        authOptions.onAuth401 &&
        !refreshed &&
        !authOptions.recoveryAttemptedTokens.has(accessToken)
      ) {
        authOptions.recoveryAttemptedTokens.add(accessToken);
        let ie = false;
        try {
          ie = await authOptions.onAuth401(accessToken);
        } catch (error) {
          logForDebugging(`[remote-bridge] ${label} 401 \u2014 OAuth refresh threw: ${errorMessage(error)}`, {
            level: "error",
          });
        }
        refreshed = ie;
        logForDebugging(
          `[remote-bridge] ${label} 401 \u2014 OAuth ${ie ? "refreshed; retrying with the fresh token" : "refresh unavailable"}`,
        );
        logForDiagnosticsNoPII("info", "bridge_repl_v2_init_401_refresh", {
          refreshed: ie,
        });
        if (refreshed && Y) return null;
      }
      return Z;
    },
    label,
    cfg,
  );
  if (Q === null && refreshed && !x) {
    logForDebugging(
      `[remote-bridge] ${label} refreshed on the final attempt; one extra try with the fresh token`,
    );
    return call(authOptions.getAccessToken(), () => {});
  }
  return Q;
}
//@ chunk-4cm44bmp.js:96332-96474 layout
/**
 * 凭证失败是否可通过重新登录恢复（untrusted_device 且不是 signature_wanted、session_stale_relogin）。
 */
function isReloginRecoverable(failure) {
  if (failure.reason === "untrusted_device")
    return failure.refusal?.kind !== "signature_wanted" && !isProactiveEnrollmentDisabled();
  return failure.reason === "session_stale_relogin";
}
//@ chunk-4cm44bmp.js:96474-96520 layout
/**
 * 失败的严重级别：可重登恢复为 auth，否则 terminal。
 */
function failureSeverity(failure) {
  return isReloginRecoverable(failure) ? "auth" : "terminal";
}
//@ chunk-4cm44bmp.js:96520-96603 layout
/**
 * 是否是"非 Anthropic 源站写的 403"（例如 Cloudflare 拦截）。
 */
function isNonOrigin403(failure) {
  return failure.reason === "request_rejected" && failure.status === 403 && isNonOriginSource(failure.source);
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
    case undefined:
      return "transport_closed_403";
  }
}
//@ chunk-4cm44bmp.js:97020-97520 layout
/**
 * 凭证/会话失败 → 用户可读文案（untrusted_device、session_stale_relogin、invalid_session_id、request_rejected、malformed_response）。
 */
function describeCredentialFailure(failure) {
  switch (failure.reason) {
    case "untrusted_device":
      return untrustedDeviceHint(failure.refusal, {
        justEnrolled: failure.justEnrolled === true,
      });
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
//@ chunk-4cm44bmp.js:97520-98051 callgraph-fingerprint = fetchRemoteCredentials (0.201)
/**
 * 带 trusted device 的 /bridge 凭证获取：先带已存的设备令牌请求，遇 untrusted_device 且可注册时自动注册设备后重试（标 justEnrolled）；不支持 trusted device 时把 untrusted_device 降级为 request_rejected；可选覆盖 api_base_url。
 */
async function fetchCredentialsWithTrustedDevice(
  sessionId,
  baseUrl,
  accessToken,
  timeoutMs,
  onAuth401,
  credentialsStore,
  epochGuard,
) {
  let deviceToken = await getTrustedDeviceToken();
  let result = await attachBridgeWorker(
    sessionId,
    baseUrl,
    accessToken,
    timeoutMs,
    deviceToken,
    onAuth401,
    epochGuard,
  );
  let refusal =
    isCredentialsFailure(result) && result.reason === "untrusted_device" ? result.refusal : undefined;
  if (refusal !== undefined && shouldRemoteControlEnroll(refusal)) {
    let Y = await withUntrustedDeviceRecovery(
      deviceToken,
      (deviceToken) =>
        attachBridgeWorker(sessionId, baseUrl, accessToken, timeoutMs, deviceToken, onAuth401, epochGuard),
      credentialsStore,
    );
    if (Y !== undefined && Y !== null)
      result =
        isCredentialsFailure(Y) && Y.reason === "untrusted_device"
          ? {
              ...Y,
              justEnrolled: true,
            }
          : Y;
  } else if (refusal !== undefined) {
    logRefusalWithoutEnrollment("[remote-bridge]", refusal);
    clearTrustedDeviceTokenCache();
  }
  if (!result) return null;
  if (isCredentialsRejection(result)) return result;
  if (isCredentialsFailure(result)) {
    if (result.reason === "untrusted_device" && !isTrustedDeviceGateEnabled())
      return {
        terminal: true,
        reason: "request_rejected",
        status: 403,
      };
    return result;
  }
  return getBridgeBaseUrlOverride()
    ? {
        ...result,
        api_base_url: baseUrl,
      }
    : result;
}
//@ chunk-4cm44bmp.js:98051-98391 affinity
/**
 * 由关闭码/原因判断会话是否被取代：403/404 → superseded_unknown；4090 + superseded_by_worker → superseded，session_not_active → session_archived。
 */
function classifySupersession(code, cause) {
  if (code === 403 || code === 404) return "superseded_unknown";
  if (code !== 4090) return;
  switch (cause) {
    case "superseded_by_worker":
      return "superseded";
    case "session_not_active":
      return "session_archived";
    case "epoch_conflict":
    case undefined:
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
//@ chunk-4cm44bmp.js:98436-98795 affinity
/**
 * 归档结果 → 遥测码（skipped_*、invalid_id、server_403_untrusted、network_error、server_4xx/5xx、ok）。
 */
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
//@ chunk-kgtpkbhq.js:8680-9302 fingerprint = archiveSession (0.358)
/**
 * 对会话执行生命周期动作（archive / unarchive）：POST {session}/{action}，返回 HTTP 状态或 invalid/timeout/error/untrusted_device 等。
 */
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
  let sessionEndpoint = buildSessionEndpoint(label, baseUrl, accessToken, sessionId, authOptions, pathSuffix);
  if (!sessionEndpoint) return "invalid";
  let { url, headers, id } = sessionEndpoint;
  try {
    let i = await axios_default.post(
      url,
      {},
      {
        headers,
        timeout: timeoutMs,
        validateStatus: () => true,
      },
    );
    logForDebugging(`[code-session] ${label} ${id} status=${i.status}`);
    if (i.status === 403) {
      let compatId = readUntrustedDeviceRefusal(i.data);
      if (compatId !== undefined)
        return refusalMode === "elevated_auth" && !shouldRemoteControlEnroll(compatId)
          ? "untrusted_device_no_enroll"
          : "untrusted_device";
      if (refusalMode === "elevated_auth" && classifyElevatedAuthError(i.data) === "session_stale_relogin")
        return "session_stale_relogin";
    }
    return i.status;
  } catch (err) {
    logForDebugging(`[code-session] ${label} ${id} failed: ${errorMessage(err)}`);
    return axios_default.isAxiosError(err) && err.code === "ECONNABORTED" ? "timeout" : "error";
  }
}
export { describeCredentialFailure, initEnvLessBridgeCore, postSessionAction };
