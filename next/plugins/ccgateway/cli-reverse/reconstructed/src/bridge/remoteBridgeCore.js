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
  isValidSessionId,
  readUntrustedDeviceRefusal,
  shouldRemoteControlEnroll,
  classifyElevatedAuthError,
  isCredentialsFailure,
  createCodeSession,
  isCreateSessionFailure,
  isCredentialsRejection,
  attachBridgeWorker,
} from "./codeSessionApi.js";
import { buildSessionEndpoint } from "../assistant/sessionHistory.js";
import { axios_default } from "../../vendor/axios/dist/esm/axios.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage } from "../utils/errors.js";
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
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { getEnvLessBridgeConfig } from "./envLessBridgeConfig.js";
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

//@ chunk-kgtpkbhq.js:8680-9302 fingerprint (2.1.88 match: archiveSession, 0.358)
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
    let response = await axios_default.post(
      url,
      {},
      {
        headers,
        timeout: timeoutMs,
        validateStatus: () => true,
      },
    );
    logForDebugging(`[code-session] ${label} ${id} status=${response.status}`);
    if (response.status === 403) {
      let compatId = readUntrustedDeviceRefusal(response.data);
      if (compatId !== undefined)
        return refusalMode === "elevated_auth" && !shouldRemoteControlEnroll(compatId)
          ? "untrusted_device_no_enroll"
          : "untrusted_device";
      if (
        refusalMode === "elevated_auth" &&
        classifyElevatedAuthError(response.data) === "session_stale_relogin"
      )
        return "session_stale_relogin";
    }
    return response.status;
  } catch (err) {
    logForDebugging(`[code-session] ${label} ${id} failed: ${errorMessage(err)}`);
    return axios_default.isAxiosError(err) && err.code === "ECONNABORTED" ? "timeout" : "error";
  }
}
//@ chunk-4cm44bmp.js:29785-95205 callgraph-witnessed (2.1.88 match: initEnvLessBridgeCore, 0.223)
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
    onDropped: (reason, rowKind) => {
      logForDebugging(
        `[remote-bridge] Kept one '${rowKind}' row's content out of the upload for account memory (reason: ${reason})`,
      );
      if (reason === "unreadable")
        logFeatureBad("bridge_account_memory_redaction", `unredactable_${rowKind}_row`);
    },
  });
  accountMemoryRedactor.note(conversationForPairing?.() ?? initialMessages ?? []);
  let toRedactedSdkEvents = (messages, mirror = "history") =>
    accountMemoryRedactor.redact(
      toSDKMessages(accountMemoryRedactor.withoutMemoryCallAttachments(messages, mirror)),
      "events",
      mirror,
    );
  let keepSessionOnTeardown = workSecretCredentials !== undefined ? true : neverArchive;
  let sessionTitle = title;
  let isReattach = !!reattachSessionId;
  let cfg = await getEnvLessBridgeConfig();
  let workSecretRegistered = false;
  let noteAcceptedToken = (token) => {
    if (!workSecretCredentials) ownerPin?.noteAcceptedToken(token);
  };
  let workSecretLaneToken = "work-secret-lane";
  let getLaneToken = () => (workSecretCredentials ? workSecretLaneToken : getAccessToken());
  let fetchBridgeCredentials = workSecretCredentials
    ? () => {
        let registerKind = workSecretRegistered ? "refresh" : "initial";
        return workSecretCredentials
          .register(registerKind, {
            stillWanted: () => !stopped && supersession === undefined,
            reuseHeldAboveS: Math.ceil(cfg.token_refresh_buffer_ms / 1000) + 60,
          })
          .then((credentials) => {
            if (credentials !== null && !isCredentialsFailure(credentials)) workSecretRegistered = true;
            return credentials;
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
  let { getOriginalCwd } = await import("../bootstrap/state.js");
  let { getMainLoopModel } = await import("../utils/model/DEFAULT_3P_FABLE_KEY.lazy.js");
  let groupingIdForCreate = requestedSessionGroupingId ?? sessionGroupingId;
  let effectiveGroupingId = sessionGroupingId;
  let repositoryUrl = false;
  async function createSessionWithRetry() {
    let namedRepository = gitRepoUrl ? undefined : await nameSourceForCreate?.();
    let fallbackGitContext = namedRepository
      ? {
          repositoryUrl: namedRepository,
        }
      : undefined;
    repositoryUrl = fallbackGitContext !== undefined;
    let warnState = {};
    let reportGitContext = async () => {
      if (gitRepoUrl) {
        let { buildGitSessionContext } = await import("./gitSessionContext.js");
        let { reportGitSessionContext } = await import("./reportGitSessionContext.js");
        let { report } = await buildGitSessionContext(gitRepoUrl, branch, defaultBranch ?? undefined);
        reportGitSessionContext(report);
      }
    };
    let createForGrouping = (groupingId) =>
      withRetryAndAuthRecovery(
        (accessToken, recoverAuth) =>
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
              : fallbackGitContext,
            getOriginalCwd(),
            getMainLoopModel(),
            groupingId,
            warnState,
            recoverAuth,
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
    let created = await createForGrouping(groupingIdForCreate);
    if (
      isCreateSessionFailure(created) &&
      created.reason === "grouping_rejected" &&
      requestedSessionGroupingId === undefined &&
      groupingIdForCreate !== undefined
    ) {
      let retried = await createForGrouping(undefined);
      if (typeof retried === "string") {
        effectiveGroupingId = undefined;
        await reportGitContext();
        if (fallbackGitContext) noop("connect");
        logForDiagnosticsNoPII("info", "bridge_repl_v2_grouping_dropped", {
          status: created.status,
        });
        logForDebugging("[bridge:core] persisted Project no longer available; recreated session outside it");
        logForDebugging(`[remote-bridge] Created session ${retried}`);
        logForDiagnosticsNoPII("info", "bridge_repl_v2_session_created");
        return retried;
      }
      if (fallbackGitContext && !isCredentialsRejection(retried)) noopTwoArgs("connect", retried);
      return created;
    }
    if (typeof created === "string") {
      effectiveGroupingId = groupingIdForCreate;
      await reportGitContext();
      if (fallbackGitContext) noop("connect");
      logForDebugging(`[remote-bridge] Created session ${created}`);
      logForDiagnosticsNoPII("info", "bridge_repl_v2_session_created");
    }
    return created;
  }
  function describeCreateFailure(failure) {
    if (failure?.reason === "grouping_rejected" && groupingIdForCreate !== undefined) {
      let detailSuffix = failure.detail ? `: ${failure.detail}` : "";
      return requestedSessionGroupingId !== undefined
        ? `Couldn't create a session in the requested Project (server ${failure.status}${detailSuffix}). The Project may not exist or may not be available to you.`
        : `Couldn't recreate the session in its previous Project (server ${failure.status}${detailSuffix}) \u2014 the Project may have been deleted or is no longer available.`;
    }
    if (failure?.reason === "request_rejected")
      return `Session creation failed (server ${failure.status}) \u2014 see debug log`;
    if (failure?.reason === "malformed_response") return BRIDGE_MALFORMED_RESPONSE_HINT;
    return "Session creation failed \u2014 see debug log";
  }
  function reportCreateFailure(sessionWithRetry) {
    if (sessionWithRetry !== null && sessionWithRetry.terminal === false) {
      onStateChange?.("failed", loginRejectedMessage, "auth");
      logBridgeSkip("v2_session_create_oauth_rejected", undefined, true);
      logFeatureBad("bridge_connect", "bridge_connect_create_oauth_rejected");
      return;
    }
    if (repositoryUrl)
      noopTwoArgs("connect", isCreateSessionFailure(sessionWithRetry) ? sessionWithRetry : null);
    onStateChange?.(
      "failed",
      describeCreateFailure(isCreateSessionFailure(sessionWithRetry) ? sessionWithRetry : null),
    );
    logBridgeSkip("v2_session_create_failed", undefined, true);
    logFeatureBad("bridge_connect", "bridge_connect_session_create_failed");
  }
  let jwtRefreshNoTokenMessage = "JWT refresh failed: no OAuth token \u2014 run /login";
  let loginRejectedMessage = "Claude.ai login was rejected \u2014 run /login, then /remote-control";
  let loginExpiredMessage = "Claude.ai login expired \u2014 run /login, then /remote-control";
  let loginExpiredForRefreshMessage = "Claude.ai login expired \u2014 run /login to restore Remote Control";
  let signedOutMessage = "Signed out of Claude \u2014 run /login, then /remote-control";
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
    let unarchiveOutcome = await withRetryAndAuthRecovery(
      (token, recoverAuth) =>
        unarchiveRemoteBridgeSession(
          sessionId,
          baseUrl,
          token,
          orgUUID,
          cfg.http_timeout_ms,
          recoverAuth,
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
    if (unarchiveOutcome?.outcome === "elevated_auth") {
      logForDebugging(
        `[remote-bridge] Reattach ${sessionId}: unarchive elevated-auth (${unarchiveOutcome.reason}) \u2014 surfacing the failure, pointer preserved`,
      );
      logForDiagnosticsNoPII("info", "bridge_repl_v2_reattach_elevated_auth");
      let untrustedGateOff = unarchiveOutcome.reason === "untrusted_device" && !isTrustedDeviceGateEnabled();
      let { outcome, ...outcomeRest } = unarchiveOutcome;
      let credentialFailure = untrustedGateOff
        ? {
            terminal: true,
            reason: "request_rejected",
            status: 403,
          }
        : {
            terminal: true,
            ...outcomeRest,
          };
      onStateChange?.(
        "failed",
        describeCredentialFailure(credentialFailure),
        failureSeverity_2(credentialFailure),
      );
      logBridgeSkip("v2_reattach_elevated_auth", undefined, true);
      logFeatureBad("bridge_connect", "bridge_connect_reattach_elevated_auth");
      return null;
    }
    if (unarchiveOutcome?.outcome === "gone" && reattachOrFail) {
      logForDebugging(
        `[remote-bridge] Reattach-or-fail: ${sessionId} gone (unarchive ${unarchiveOutcome.status}); failing terminally instead of minting fresh`,
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
    if (unarchiveOutcome?.outcome === "gone") {
      logForDebugging(
        `[remote-bridge] Reattach ${sessionId} gone (unarchive ${unarchiveOutcome.status}); minting fresh session`,
      );
      reattachFellBackToFresh = true;
      onReattachGoneBounce();
      sessionTitle = neutralFallbackTitle ?? `${getBridgeSessionNamePrefix()}-${randomWordSlug()}`;
      logForDiagnosticsNoPII("info", "bridge_repl_v2_reattach_fallback", {
        via: "unarchive",
        status: unarchiveOutcome.status,
      });
      logEvent("tengu_bridge_repl_env_expired_fresh_session", {
        v2: true,
        via: fromEnum("unarchive"),
        status:
          typeof unarchiveOutcome.status === "number"
            ? unarchiveOutcome.status
            : fromEnum(unarchiveOutcome.status),
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
    archive: (sessionIdToArchive) =>
      archiveRemoteBridgeSession(
        sessionIdToArchive,
        baseUrl,
        getCurrentAccessToken(),
        orgUUID,
        cfg.http_timeout_ms,
        undefined,
        storageV5,
      ),
    storageV5,
  });
  let nonOriginWindowMs = BRIDGE_REMINT_BACKOFF_CAP_MS + 60000;
  let nonOriginStreak;
  function resetNonOriginStreak() {
    nonOriginStreak = undefined;
  }
  function screenNonOriginRefusal(refusal) {
    if (!isCredentialsFailure(refusal) || !isNonOrigin403(refusal)) {
      if (refusal !== null && !isCredentialsFailure(refusal) && !isCredentialsRejection(refusal))
        resetNonOriginStreak();
      return refusal;
    }
    if (!isBridgeNonOrigin403RetryEnabled()) return refusal;
    let now = Date.now();
    if (nonOriginStreak === undefined || now - nonOriginStreak.lastAtMs > nonOriginWindowMs)
      nonOriginStreak = {
        startedAtMs: now,
        lastAtMs: now,
        refusals: 0,
      };
    nonOriginStreak.lastAtMs = now;
    nonOriginStreak.refusals++;
    let streakMs = now - nonOriginStreak.startedAtMs;
    if (nonOriginStreak.refusals > 1 && streakMs >= LONG_POLL_TIMEOUT_MS) {
      logForDebugging(
        `[remote-bridge] /bridge refused by ${refusal.source} ${nonOriginStreak.refusals}\xD7 over ${Math.round(streakMs / 1000)}s with nothing reaching Anthropic since \u2014 treating as a verdict`,
      );
      return refusal;
    }
    logForDebugging(
      `[remote-bridge] /bridge 403 not written by Anthropic's origin (${refusal.source}) \u2014 treating as unreachable`,
    );
    logForDiagnosticsNoPII("warn", "bridge_repl_v2_bridge_403_nonorigin", {
      source: refusal.source,
    });
    return null;
  }
  function refetchCredentials(token, stale) {
    if (stopped || supersession !== undefined || recoveryGeneration !== stale) return Promise.resolve(null);
    let refetch = () =>
      refetchWithEpoch(sessionId, token).then((result) => {
        if (recoveryGeneration !== stale) return result;
        let screened = screenNonOriginRefusal(result);
        if (screened !== null && !isCredentialsFailure(screened) && !isCredentialsRejection(screened)) {
          noteAcceptedToken(token);
          clearRejectedToken();
        }
        return screened;
      });
    if (!ownerLooksChanged()) return refetch();
    return ownerChangedSince("owner_changed_recovery").then((ownerUnchanged) =>
      ownerUnchanged || stopped || supersession !== undefined || recoveryGeneration !== stale
        ? null
        : refetch(),
    );
  }
  let lastFetchedToken = accessToken;
  let bridgeCredentials = await withRetryAndAuthRecovery(
    (token, deviceToken) => {
      lastFetchedToken = token;
      return fetchBridgeCredentials(
        sessionId,
        baseUrl,
        token,
        cfg.http_timeout_ms,
        deviceToken,
        credentialsStore,
      );
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
    let failureMessage =
      bridgeCredentials === null
        ? isReattach
          ? "Couldn't reconnect to your Remote Control session. Retry, or start a fresh session without --resume."
          : "Remote credentials fetch failed \u2014 see debug log"
        : isCredentialsRejection(bridgeCredentials)
          ? loginExpiredMessage
          : describeCredentialFailure(bridgeCredentials);
    let severity =
      bridgeCredentials === null
        ? reviveInitiated
          ? "auth"
          : "terminal"
        : isCredentialsRejection(bridgeCredentials)
          ? "auth"
          : failureSeverity_2(bridgeCredentials);
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
      `[remote-bridge] Creds failed; onStateChange ${onStateChange ? "set" : "UNSET"}, msg="${failureMessage}"`,
    );
    onStateChange?.("failed", failureMessage, severity);
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
  noteAcceptedToken(lastFetchedToken);
  onSessionEstablished?.(sessionId);
  let workerEpoch = bridgeCredentials.worker_epoch;
  function raiseWorkerEpoch(workerEpoch_2) {
    workerEpoch = Math.max(workerEpoch, workerEpoch_2);
  }
  function refetchWithEpoch(token, deviceToken) {
    if (workSecretCredentials || !isBridgeAttachEpochFenceEnabled())
      return fetchBridgeCredentials(
        token,
        baseUrl,
        deviceToken,
        cfg.http_timeout_ms,
        undefined,
        credentialsStore,
      );
    let heldEpoch = workerEpoch;
    let generation = recoveryGeneration;
    return sendWithEpochFollowUps({
      heldEpoch,
      send: (epoch, onRefused) =>
        fetchBridgeCredentials(
          token,
          baseUrl,
          deviceToken,
          cfg.http_timeout_ms,
          undefined,
          credentialsStore,
          epoch === undefined
            ? undefined
            : {
                expectedEpoch: epoch,
                onRefused,
              },
        ),
      maySendAgain: () => {
        if (isTeleportedSession(sessionId)) return false;
        return !stopped && !ownerChanged && supersession === undefined && recoveryGeneration === generation;
      },
    }).then((followUp) => {
      let answer = followUp.answer;
      try {
        let workerEpoch =
          answer !== null && !isCredentialsFailure(answer) && !isCredentialsRejection(answer)
            ? answer.worker_epoch
            : undefined;
        if (workerEpoch !== undefined && !stopped && recoveryGeneration === generation)
          raiseWorkerEpoch(workerEpoch);
        if (followUp.ending !== "not_refused" && canReportPresence()) {
          let hasAnswer = workerEpoch !== undefined;
          logEvent("tengu_bridge_repl_attach_conflict", {
            outcome: fromEnum(
              followUp.ending === "followed_up" ? (hasAnswer ? "resolved" : "unresolved") : followUp.ending,
            ),
            accepted: hasAnswer,
            stated_epoch: heldEpoch,
            session_epoch: followUp.sessionEpoch,
            follow_ups: followUp.followUps,
            fallback_reason: fromEnumOpt(
              followUp.ending === "unfenced_fallback" ? followUp.fallbackReason : undefined,
            ),
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
  function selfHealHeartbeats() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_selfheal_heartbeats", true);
  }
  function isRecoveryPatienceEnabled() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_recovery_patience", true);
  }
  function isDazzlingGardenEnabled() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_dazzling_garden", true);
  }
  function streamEventFlushIntervalMs() {
    return getFeatureValue_CACHED_MAY_BE_STALE(
      "tengu_ccr_stream_event_flush_ms",
      DEFAULT_STREAM_EVENT_FLUSH_INTERVAL_MS,
    );
  }
  function streamEventFirstFlushMs() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_stream_first_flush_ms", 0);
  }
  function noSubscriberFlushMs() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_no_subscriber_flush_ms", 0);
  }
  function noSubscriberHoldMs() {
    return outboundOnly ? 0 : getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_no_subscriber_hold_ms", 0);
  }
  function mayHoldUploads() {
    return noSubscriberHoldMs() > 0 || transport.mayHoldUploads?.() === true;
  }
  function sseKeepaliveMaxIntervalSeconds() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_sse_keepalive_max_interval_s", 0);
  }
  function shouldLongPollFallback() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_sse_long_poll_fallback", true);
  }
  function shouldDropUnwatchedStreamEvents() {
    return outboundOnly
      ? false
      : getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_drop_unwatched_stream_events", false);
  }
  function backfillConfig() {
    return outboundOnly ? DEFAULT_HISTORY_BACKFILL_CONFIG : historyBackfillConfig();
  }
  function advertiseHeartbeatProbeSupport() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_idle_heartbeat", false);
  }
  function shouldBeatOnStaleReconnect() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_reconnect_beat", false);
  }
  function shouldBeatOnReactivation() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_reactivation_beat", false);
  }
  function shouldSkipRedundantHeartbeats() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_skip_redundant_heartbeat", false);
  }
  let idleTracker = createIdleTracker();
  let starts = new Map();
  let artifactSocketIds = new Set();
  let gzipRequestBodyFetch = createGzipFetchWrapper("ccr_worker", storageV5);
  function buildTransportOptions() {
    return {
      heartbeatIntervalMs: cfg.heartbeat_interval_ms,
      heartbeatJitterFraction: cfg.heartbeat_jitter_fraction,
      onRequestAuthOk: noteAuthOk,
      causeTypedCloseCodes: true,
      selfHealHeartbeats: selfHealHeartbeats(),
      advertiseHeartbeatProbeSupport: advertiseHeartbeatProbeSupport(),
      beatOnStaleReconnect: shouldBeatOnStaleReconnect(),
      idleTracker,
      beatOnReactivation: shouldBeatOnReactivation(),
      skipRedundantHeartbeats: shouldSkipRedundantHeartbeats(),
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
      streamEventFlushIntervalMs: streamEventFlushIntervalMs(),
      streamEventFirstFlushMs: streamEventFirstFlushMs(),
      sseConnectTimeoutMs: () => getPollIntervalConfig().sse_connect_timeout_ms,
      gzipRequestBodyFetch,
      noSubscriberStreamEventFlushIntervalMs: noSubscriberFlushMs(),
      noSubscriberUploadHoldMs: noSubscriberHoldMs(),
      dropUnwatchedStreamEvents: shouldDropUnwatchedStreamEvents(),
      sseKeepaliveMaxIntervalSeconds,
      longPollFallback: shouldLongPollFallback,
      outboundOnly,
      nonOrigin403Retry: isBridgeNonOrigin403RetryEnabled(),
      inboundReadReceipts: isBridgeInboundReadReceiptsEnabled,
      onNonOriginRejectionRecovered: onNonOriginRecovered,
      retainUndeliveredOnClose: true,
      internalEventUploader: {
        maxConsecutiveFailures: MAX_CONSECUTIVE_UPLOAD_FAILURES,
        maxBatchBytes: MAX_UPLOAD_BATCH_BYTES,
        requestTimeoutMs: UPLOAD_REQUEST_TIMEOUT_MS,
      },
    };
  }
  let onConnectNeedsRecord = isReattach && (remoteControlOrigin !== undefined || noHistoryBackfill);
  let transport;
  try {
    transport = await createV2ReplTransport({
      ...buildTransportOptions(),
      sessionUrl,
      ingressToken: bridgeCredentials.worker_jwt,
      sessionId,
      epoch: bridgeCredentials.worker_epoch,
      initialSequenceNum: isReattach ? reattachSequenceNum : undefined,
      onConnectNeedsRecord,
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
  let heldMcpStatus = null;
  let pendingMcpAdds = new Set();
  let removedMcpServers = new Set();
  let mcpInjectedOnce = false;
  let mcpRelinquished = false;
  let mcpGeneration = 0;
  function resetMcpSync() {
    mcpGeneration++;
    mcpInjectedOnce = false;
    removedMcpServers = new Set();
  }
  let heldMcpSync = null;
  function applyInjectedMcp(servers, reassert = false) {}
  function clearHeldMcpSync() {
    heldMcpSync = null;
  }
  function canAdoptInjectedMcp() {
    return false;
  }
  function computeMcpDelta(servers, reassert, force = false) {
    return {
      added: [],
      removed: [],
    };
  }
  function refreshInjectedMcp(results, reassert = false) {}
  let onMcpSetServers = (servers) => {
    if (Object.keys(servers).length === 0) {
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
  let lastRefreshAt = 0;
  let refreshDeferred = false;
  function requestInjectedMcpReassert() {
    if (stopped) return;
    let now = Date.now();
    if (now - lastRefreshAt < REFRESH_MIN_INTERVAL_MS) {
      refreshDeferred = true;
      return;
    }
    lastRefreshAt = now;
    refreshDeferred = false;
    refresh.refreshNow(sessionId);
  }
  function runDeferredRefresh() {
    if (stopped || !refreshDeferred) return;
    refreshDeferred = false;
    lastRefreshAt = Date.now();
    refresh.refreshNow(sessionId);
  }
  function relinquishInjectedMcp() {
    try {
      reportMcpRelinquished("withdrawn");
    } catch (error) {
      logError(error);
      logFeatureBad("bridge_webagent_mcp_inject", "relinquish_threw");
    }
  }
  function reportMcpRelinquished(reason) {}
  let recentPostedUUIDs = new BoundedUUIDSet(cfg.uuid_dedup_buffer_size);
  let initialMessageUUIDs = new Set();
  if (initialMessages)
    for (let msg of initialMessages) {
      initialMessageUUIDs.add(msg.uuid);
      recentPostedUUIDs.add(msg.uuid);
    }
  let recentInboundUUIDs = new BoundedUUIDSet(cfg.uuid_dedup_buffer_size);
  let flushGate = new Map();
  let writtenSdkUuids = new BoundedUUIDSet(cfg.uuid_dedup_buffer_size);
  let messageFlushGate = new FlushGate();
  let frameFlushGate = new FlushGate();
  let frameSeq = 0;
  let queuedAnyMessage = false;
  let turnResultReported = false;
  let replyStamps = new Map();
  let maxReplyStamps = 64;
  let historyFlushed = isReattach;
  let firstHistoryPromise;
  let lastClosedTransport;
  let transcriptMirrorMode =
    !isReattach &&
    !noHistoryBackfill &&
    !reattachFellBackToFresh &&
    isBackfillScopeAllowedForOrigin(backfillConfig().scope, remoteControlOrigin)
      ? "deferred"
      : "live";
  let transcriptUploadDeferred = remoteControlOrigin;
  let backfilledUuids = new BoundedUUIDSet(cfg.uuid_dedup_buffer_size);
  let transcriptRelease;
  let deferredMetadata = {};
  let stopped = false;
  let teardownPromise;
  let recoveryInFlight = false;
  let generationCounter = 0;
  let recoveryGeneration = 0;
  function beginRecovery() {
    generationCounter++;
    recoveryGeneration = generationCounter;
    recoveryInFlight = true;
    recoveryStartedAt = Date.now();
    rebuiltSinceStart = false;
    return recoveryGeneration;
  }
  function endRecovery(token) {
    if (recoveryGeneration !== token) return false;
    recoveryGeneration = 0;
    recoveryInFlight = false;
    recoveryStartedAt = 0;
    drainAfterRecovery();
    return true;
  }
  let drainAfterRecoveryPending = false;
  function drainAfterRecovery() {
    if (!drainAfterRecoveryPending || stopped || ownerChanged) {
      drainAfterRecoveryPending = false;
      return;
    }
    drainAfterRecoveryPending = false;
    if (recoverTimer !== undefined || !transport.isConnectedStatus()) return;
    if (messageFlushGate.active || frameFlushGate.active) drainFlushGate();
    installPersistence();
  }
  function resetRecoveryFlags() {
    recoveryGeneration = 0;
    recoveryInFlight = false;
    recoveryStartedAt = 0;
    drainAfterRecovery();
  }
  let recoveryStartedAt = 0;
  let rebuiltSinceStart = false;
  let initRetryBudgetMs =
    cfg.init_retry_max_attempts * cfg.http_timeout_ms +
    (cfg.init_retry_max_attempts - 1) * cfg.init_retry_max_delay_ms;
  let oauthRetryBudgetMs =
    cfg.oauth_retry_base_delay_ms * (2 ** cfg.oauth_retry_max_attempts - 1) +
    cfg.oauth_retry_max_attempts * initRetryBudgetMs;
  let recoveryCeilingMs = 2 * (15000 + initRetryBudgetMs + oauthRetryBudgetMs);
  let recoveryAttempts = 0;
  let maxRecoveryAttempts = 3;
  let credRecoveryAttempts = 0;
  let reconnectBudget = createReconnectBudget();
  function noteAuthOk() {
    credRecoveryAttempts = 0;
    reconnectBudget.noteHealthyBeat(Date.now());
    resetNonOriginStreak();
    onAuthProven?.();
  }
  let remintLoopActive = false;
  let recoverTimer;
  function clearRecoverTimer() {
    clearTimeout(recoverTimer);
    recoverTimer = undefined;
  }
  let failedTerminally = false;
  let livePreview = null;
  let shutdownStarted = false;
  function stopLivePreview() {
    let held = livePreview;
    livePreview = null;
    try {
      held?.tunnel.stop();
    } catch (error) {
      logForDebugging(`[remote-bridge] a held tunnel's stop threw: ${errorMessage(error)}`, {
        level: "error",
      });
      logError(error);
    }
  }
  let lastSignInCheckAt = 0;
  let lastFreshCheckAt = 0;
  function isSignInCheckStale(kind) {
    let lastCheckAt = kind === "a_start" ? lastFreshCheckAt : lastSignInCheckAt;
    let ageMs = Date.now() - lastCheckAt;
    return ownerLooksChanged() && !(ageMs >= 0 && ageMs < OWNER_PIN_INCONCLUSIVE_TTL_MS);
  }
  function isTransportUnusable() {
    if (isTeleportedSession(sessionId)) return true;
    if (
      shutdownStarted ||
      stopped ||
      ownerChanged ||
      failedTerminally ||
      supersession !== undefined ||
      checkSdkUrl(apiBaseUrl) !== null
    )
      return true;
    let parsedBase = URL.parse(apiBaseUrl);
    return (
      parsedBase === null ||
      (parsedBase.protocol !== "https:" &&
        parsedBase.protocol !== "wss:" &&
        !isLoopbackHost(parsedBase.hostname))
    );
  }
  let hasFixedCredential =
    params.fixedCredentialNow !== undefined && params.fixedCredentialNow() !== "replaced";
  function credentialWasReplaced() {
    return hasFixedCredential && !isOwnerPinned() && params.fixedCredentialNow?.() === "replaced";
  }
  function livePreviewMustRestart(cause) {
    if (livePreview === null) return false;
    try {
      let mustRestart;
      switch (cause) {
        case "flag_refresh":
          mustRestart = false;
          break;
        case "hand_over":
          mustRestart = isSignInCheckStale("hand_over");
          break;
        default:
          mustRestart = true;
      }
      return (
        isTransportUnusable() ||
        mustRestart ||
        credentialWasReplaced() ||
        livePreview.dialedBase !== apiBaseUrl ||
        livePreview.isRefusedBySession()
      );
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
  function setReconnecting(reconnectingDetail) {
    failedTerminally = false;
    onStateChange?.("reconnecting", reconnectingDetail);
  }
  function setConnected() {
    failedTerminally = false;
    onStateChange?.("connected");
  }
  function failTransport(message, severity = "terminal") {
    failedTerminally = true;
    clearRecoverTimer();
    pendingAuthCode = undefined;
    dropPendingWrites();
    persistenceCatchUp?.end();
    stopLivePreview();
    onStateChange?.("failed", message, severity);
  }
  function flushAll() {
    let holdUploads = mayHoldUploads();
    return Promise.all([
      transport.flush({
        retryNow: holdUploads,
      }),
      holdUploads &&
        transport.flushInternalEvents?.({
          retryNow: holdUploads,
        }),
    ]).then(() => {});
  }
  function flushWithTimeout(timeoutMs = FLUSH_TIMEOUT_MS) {
    let sleeper = sleep(timeoutMs);
    let winner = Promise.race([flushAll().then(() => true), sleeper.then(() => false)]);
    let winner_2 = Promise.race([
      transport.flushDeliveryAcks?.({
        retryNow: true,
      }),
      sleeper,
    ]);
    return Promise.all([winner, winner_2]).then(([flushed]) => flushed);
  }
  async function preflushHold(bucket, startedAt = Date.now()) {
    let backlog = transport.getUploadBacklog?.();
    let landed = await flushWithTimeout(PREFLUSH_TIMEOUT_MS);
    let attributes = {
      hold_preflush_ms: Date.now() - startedAt,
      hold_preflush_landed: landed,
      hold_preflush_inflight_age_ms: backlog?.oldestInFlightMs,
      hold_preflush_lane_in_backoff: backlog?.backingOff,
    };
    if (!landed) logFeatureSad("ccr_no_subscriber_hold", bucket);
    return attributes;
  }
  function backlogAtClose() {
    let backlog = transport.getUploadBacklog?.();
    return {
      unsent_client_events_at_close: backlog?.unsentClientEvents,
      unsent_internal_events_at_close: backlog?.unsentInternalEvents,
    };
  }
  function dropPendingWrites() {
    let queuedMessages = messageFlushGate.end();
    let frames = frameFlushGate.end().map((frame) => frame.frame);
    queuedAnyMessage = false;
    reportLostEvents(
      queuedMessages.length + frames.length,
      frames,
      transport.discardUndeliveredEvents?.() ?? [],
    );
  }
  function reportLostEvents(queuedCount, frames, undelivered) {
    if (queuedCount === 0 && undelivered.length === 0) return;
    logForDiagnosticsNoPII("warn", "bridge_repl_v2_client_events_lost", {
      queued: queuedCount,
      undelivered: undelivered.length,
    });
    logFeatureSad("bridge_repl", "client_events_lost_at_dead_end", {
      queued: queuedCount,
      undelivered: undelivered.length,
    });
    let subtypes = [
      ...undelivered.map((event) => event.payload.subtype),
      ...frames.map((frame) => (frame.type === "system" && "subtype" in frame ? frame.subtype : undefined)),
    ];
    let included = subtypes.includes("task_notification");
    let included_2 = subtypes.includes("background_tasks_changed");
    if (included || included_2)
      logFeatureSad("ccr_task_status_publish", "status_events_lost_at_dead_end", {
        has_terminal_bookend: included,
        has_level: included_2,
      });
  }
  let pendingClose;
  let supersession;
  let presenceLogged = false;
  let pendingPresenceSad;
  let authEndCode;
  let pendingAuthCode;
  let episodeDead = false;
  let firstCloseAt;
  let ownerChanged = false;
  let unsubscribeOwnerPin;
  function canReportPresence() {
    return true;
  }
  function notePresenceSad(code, attributes, clearDetail = true) {
    if (clearDetail) {
      pendingPresenceSad = undefined;
      authEndCode = undefined;
    }
    if (!presenceLogged || !canReportPresence()) return false;
    if (attributes === undefined) logFeatureSad("bridge_presence", code);
    else logFeatureSad("bridge_presence", code, attributes);
    return true;
  }
  function notePresenceBad(code, attributes) {
    pendingPresenceSad = undefined;
    authEndCode = undefined;
    episodeDead = true;
    if (!canReportPresence()) return false;
    if (!presenceLogged) {
      logFeatureBad("bridge_connect", "bridge_connect_died_before_presence");
      return false;
    }
    if (attributes === undefined) logFeatureBad("bridge_presence", code);
    else logFeatureBad("bridge_presence", code, attributes);
    return true;
  }
  let nonOriginEpisodeReported = false;
  function onNonOriginRecovered(detail) {
    if (stopped || ownerChanged || episodeDead) return;
    logForDebugging(
      `[remote-bridge] SSE stream live again after ${detail.attempts} non-origin 403(s) over ${Math.round(detail.streakMs / 1000)}s (source=${detail.source})`,
    );
    if (
      notePresenceSad(
        RECOVERED_NONORIGIN_CODES[detail.source],
        {
          attempts: detail.attempts,
          streak_s: Math.round(detail.streakMs / 1000),
          first_in_episode: nonOriginEpisodeReported ? 0 : 1,
          recovery_bucket: bucketRecentUse(detail.streakMs),
        },
        false,
      )
    )
      nonOriginEpisodeReported = true;
  }
  function noteNonOriginClose(details) {
    if (!isNonOriginSource(details?.rejectSource)) {
      notePresenceBad(transportClosed403Code(details));
      return;
    }
    if (
      notePresenceBad(transportClosed403Code(details), {
        ...(details.streak !== undefined && {
          attempts: details.streak.attempts,
          streak_s: Math.round(details.streak.streakMs / 1000),
        }),
        first_in_episode: nonOriginEpisodeReported ? 0 : 1,
      })
    )
      nonOriginEpisodeReported = true;
  }
  function latchSupersession(site) {
    if (isTeleportedSession(sessionId)) return;
    let classified =
      pendingClose === undefined ? undefined : classifySupersession(pendingClose.code, pendingClose.cause);
    if (
      supersession !== undefined ||
      pendingClose === undefined ||
      classified === undefined ||
      (rebuiltSinceStart && isNotArchived(classified))
    )
      return;
    supersession = classified;
    logForDebugging(
      `[remote-bridge] ${site} latched a stashed supersession close (${pendingClose.code}/${pendingClose.cause ?? "uncaused"}) \u2014 archive suppressed`,
    );
    if (!episodeDead) {
      if (pendingClose.code === 403) noteNonOriginClose(pendingClose.detail);
      else if (pendingClose.code === 404) notePresenceBad("transport_closed_404");
      else {
        notePresenceSad("transport_closed_4090");
        episodeDead = true;
      }
      pendingAuthCode = undefined;
    }
  }
  function reportRefreshLeg(status) {
    if (!canReportPresence()) return;
    switch (status.leg) {
      case "ok":
        logFeatureOk("bridge_token_refresh");
        return;
      case "sad":
        logFeatureSad("bridge_token_refresh", status.code);
        return;
      case "bad":
        logFeatureBad("bridge_token_refresh", status.code);
        return;
    }
  }
  function hostDeclinedCode(launcherLoginGeneration) {
    if (!isBridgeHostDeclinedEndEnabled()) return;
    let launcherLoginEnd = getLauncherLoginEnd();
    if (launcherLoginEnd === undefined || launcherLoginEnd.generation <= launcherLoginGeneration)
      return staleLauncherCode();
    return mapLauncherReason(launcherLoginEnd.reason);
  }
  function mapLauncherReason(reason) {
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
  function staleLauncherCode() {
    if (authEndCode === undefined) return;
    if (authEndCode.generation === getLauncherLoginGeneration()) return authEndCode.code;
    let launcherLoginEnd = getLauncherLoginEnd();
    return launcherLoginEnd === undefined ? undefined : mapLauncherReason(launcherLoginEnd.reason);
  }
  function hostDeclinedHint(declineReason) {
    return declineReason === "host_signed_out"
      ? BRIDGE_HOST_SIGNED_OUT_HINT
      : BRIDGE_HOST_ACCOUNT_CHANGED_HINT;
  }
  function hostDeclinedSeverity(declineReason) {
    return declineReason === "host_signed_out" ? "auth" : "terminal";
  }
  function isOwnerPinned() {
    return ownerPin !== undefined && !stopped && !ownerChanged && isBridgeOwnerPinnedEndEnabled();
  }
  function ownerLooksChanged() {
    return isOwnerPinned() && ownerPin !== undefined && ownerPin.identityLooksChanged();
  }
  async function confirmOwnerChange(site, options) {
    if (ownerChanged) return "changed";
    if (!isOwnerPinned() || ownerPin === undefined) return "unchanged";
    let verdict = await ownerPin.confirmChanged(options);
    if (verdict === "changed") {
      await stopForOwnerChange(site);
      return "changed";
    }
    return ownerChanged ? "changed" : verdict;
  }
  async function ownerChangedSince(site) {
    return (await confirmOwnerChange(site)) === "changed";
  }
  async function staleAfterOwnerCheck(site, stale) {
    if (ownerLooksChanged() && (await ownerChangedSince(site))) return true;
    return stopped || recoveryGeneration !== stale;
  }
  async function stopForOwnerChange(site) {
    if (stopped || ownerChanged || ownerPin === undefined) return;
    ownerChanged = true;
    unsubscribeOwnerPin?.();
    unsubscribeOwnerPin = undefined;
    refresh.cancelAll();
    resetRecoveryFlags();
    onOwnerChanged?.();
    remintLoopActive = false;
    latchSupersession("owner_changed");
    pendingClose = undefined;
    clearTimeout(connectTimeoutTimer);
    clearRecoverTimer();
    stopGitWatcher?.();
    stopGitWatcher = undefined;
    unsubscribeInteraction();
    unsubscribeGrowthBook();
    releaseReadReceiptOwnership(readReceiptOwner);
    shutdownStarted = true;
    stopLivePreview();
    if (isTeleportedSession(sessionId)) {
      logForDebugging(
        `[remote-bridge] Signed-in account changed under teleported session ${sessionId} (${site}) \u2014 latched only`,
      );
      dropPendingWrites();
      teardownPersistence();
      relinquishInjectedMcp();
      transport.close();
      return;
    }
    let episodeDeadAlready = episodeDead || supersession !== undefined;
    logForDebugging(
      `[remote-bridge] Signed-in account changed under ${sessionId} (${site}${episodeDeadAlready ? ", episode already dead" : ""}) \u2014 stopping`,
    );
    logForDiagnosticsNoPII("info", "bridge_repl_v2_owner_changed");
    if (!episodeDeadAlready) {
      notePresenceSad(site);
      episodeDead = true;
      failTransport(BRIDGE_OWNER_CHANGED_HINT, "terminal");
      transport.write(buildWorkerShuttingDownMessage(sessionId, "account_changed"));
      await flushWithTimeout(mayHoldUploads() ? cfg.teardown_archive_timeout_ms : FLUSH_TIMEOUT_MS).catch(
        () => {
          return;
        },
      );
    } else if (!failedTerminally) failTransport(BRIDGE_OWNER_CHANGED_HINT, "terminal");
    else dropPendingWrites();
    teardownPersistence();
    relinquishInjectedMcp();
    if (!stopped) transport.close();
    if (supersession !== undefined) return;
    let archiveStatus;
    if (keepSessionOnTeardown) {
      archiveStatus = "skipped_host_owned";
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
      archiveStatus = archiveStatusCode(archiveResult, supersession);
      logForDebugging(
        `[remote-bridge] Owner-changed settle archived ${sessionId} with the owner's credential (archive=${archiveResult})`,
      );
    }
    if (canReportPresence())
      logEvent("tengu_bridge_owner_changed", {
        site: fromEnum(site),
        archive_status: fromEnum(archiveStatus),
        episode_already_dead: episodeDeadAlready,
      });
  }
  function deadReason() {
    if (supersession !== undefined) return supersession;
    if (ownerChanged) return "owner_changed";
    return;
  }
  function archiveCredential() {
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
  let pendingActionShown = isReattach;
  let pendingRequests = new Map();
  let pendingAction = undefined;
  let notForwardedIds = new Set();
  let localOnlyMemoryRequests = new BoundedIdSet(256);
  let liveOnlyUuids = new BoundedIdSet(cfg.uuid_dedup_buffer_size);
  function resolvePendingAction(requestId, answered) {
    notForwardedIds.delete(requestId);
    if (pendingRequests.delete(requestId) && answered) rememberResolvedPromptRequestId(requestId);
  }
  function reportPendingState() {
    let lastDetails;
    let hasPending = false;
    for (let [requestId, entry] of pendingRequests) {
      if (notForwardedIds.has(requestId)) continue;
      hasPending = true;
      lastDetails = entry.details ?? lastDetails;
    }
    if (hasPending) reportState("requires_action", lastDetails);
    else reportState("running");
  }
  let lastReportedState;
  let reportState = (state, details) => {
    if (onBeforePushTriggeringState && !ownerChanged && (state === "requires_action" || state === "idle"))
      onBeforePushTriggeringState();
    transport.reportState(state, details);
    if (state === "requires_action" && details) {
      pendingActionShown = true;
      let otherDetails = [...pendingRequests.values()]
        .flatMap((entry) => (entry.details ? [entry.details] : []))
        .reverse();
      transport.reportMetadata({
        pending_action: details,
        pending_actions: pendingActionRows(
          details,
          otherDetails.filter((detail) => detail !== details),
        ),
      });
    } else if (pendingActionShown) {
      pendingActionShown = false;
      transport.reportMetadata({
        pending_action: null,
        pending_actions: null,
      });
    }
    if (state === "running" && lastReportedState !== "running") {
      transport.reportMetadata({
        post_turn_summary: null,
        recap: null,
      });
      noteBridgePostTurnSummaryWiped();
      if (transcriptMirrorMode === "deferred") {
        delete deferredMetadata.post_turn_summary;
        delete deferredMetadata.recap;
      }
    }
    lastReportedState = state;
  };
  function takePendingPrompts() {
    notForwardedIds.clear();
    return [...pendingRequests.values()].map((entry) => entry.request);
  }
  let stopGitWatcher;
  let invalidateGitState;
  let refreshGitBranch;
  let publishGitStateBeforeHandoff;
  if (gitRepoUrl)
    (async () => {
      let { isNestedGitLabProject, parseGitRemote, parseGitHubRepository } =
        await import("../utils/detectRepository.js");
      let {
        addWatchedRepo,
        removeWatchedRepo,
        getCachedBranchForRepo,
        onRepoBranchChange,
        getRemoteUrlForDir,
      } = await import("../utils/git/gitFilesystem.js");
      let worktreeModule = await import("./worktreeState.js");
      let gitRemote = parseGitRemote(gitRepoUrl);
      if (gitRemote && isNestedGitLabProject(gitRemote)) return;
      let repoKey = gitRemote ? `${gitRemote.owner}/${gitRemote.name}` : parseGitHubRepository(gitRepoUrl);
      if (!repoKey) return;
      let repoLabel = gitRemote
        ? `${gitRemote.host}/${gitRemote.owner}/${gitRemote.name}`
        : `github.com/${repoKey}`;
      let originalCwd = getOriginalCwd();
      await addWatchedRepo(originalCwd);
      if (stopped || ownerChanged) {
        removeWatchedRepo(originalCwd);
        return;
      }
      let lastEmitted;
      let emittedWorktreeState = isReattach;
      let everHadWorktreeState = isReattach;
      let generationCounter = 0;
      let running = false;
      let rerun = false;
      let emitGitState = async () => {
        running = true;
        try {
          do {
            rerun = false;
            let generation = generationCounter;
            if (stopped || ownerChanged) return;
            let originalCwd_2 = getOriginalCwd();
            if (originalCwd_2 !== originalCwd) {
              removeWatchedRepo(originalCwd);
              originalCwd = originalCwd_2;
              await addWatchedRepo(originalCwd_2);
              if (stopped || ownerChanged) {
                removeWatchedRepo(originalCwd_2);
                return;
              }
            }
            let cachedBranchForRepo = await getCachedBranchForRepo(originalCwd_2);
            if (generation !== generationCounter) {
              rerun = true;
              continue;
            }
            if (stopped || shouldDropAfterOwnerChange("branch_metadata")) return;
            if (cachedBranchForRepo === undefined) {
              if (lastEmitted !== null) {
                lastEmitted = null;
                if (emittedWorktreeState) {
                  emittedWorktreeState = false;
                  transport.reportMetadata({
                    current_branches: {
                      [repoKey]: null,
                    },
                    worktree_state: {
                      [repoKey]: null,
                    },
                  });
                } else
                  transport.reportMetadata({
                    current_branches: {
                      [repoKey]: null,
                    },
                  });
              }
              continue;
            }
            if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_handoff_metadata", false)) {
              let [worktreeState, remoteUrl] = await Promise.all([
                worktreeModule.collectWorktreeState(originalCwd_2, cachedBranchForRepo),
                worktreeModule.withCollectTimeout(getRemoteUrlForDir(originalCwd_2)).catch(() => null),
              ]);
              if (generation !== generationCounter) {
                rerun = true;
                continue;
              }
              if (stopped || shouldDropAfterOwnerChange("branch_metadata")) return;
              let parsedRemote = remoteUrl ? parseGitRemote(remoteUrl) : null;
              let repository = remoteUrl ? parseGitHubRepository(remoteUrl) : null;
              let isRepoLabelMatch =
                (parsedRemote
                  ? `${parsedRemote.host}/${parsedRemote.owner}/${parsedRemote.name}`
                  : repository
                    ? `github.com/${repository}`
                    : null) === repoLabel;
              let branchName = isRepoLabelMatch ? cachedBranchForRepo : null;
              let emittedState = isRepoLabelMatch ? worktreeState : null;
              let stateKey = emittedState
                ? JSON.stringify([
                    branchName,
                    emittedState.head_sha,
                    emittedState.unpushed_count,
                    emittedState.is_dirty,
                    emittedState.mid_operation,
                    emittedState.upstream_exists,
                    emittedState.has_submodules,
                    emittedState.submodules_unverified,
                    emittedState.has_lfs,
                  ])
                : JSON.stringify([branchName]);
              if (stateKey === lastEmitted) continue;
              lastEmitted = stateKey;
              logForDebugging(
                `[remote-bridge] worktree_state \u2192 ${repoKey}: ${JSON.stringify(emittedState)}`,
              );
              emittedWorktreeState = emittedState !== null;
              if (emittedState !== null) everHadWorktreeState = true;
              transport.reportMetadata({
                current_branches: {
                  [repoKey]: branchName,
                },
                worktree_state: {
                  [repoKey]: emittedState,
                },
              });
              continue;
            }
            if (emittedWorktreeState) {
              emittedWorktreeState = false;
              lastEmitted = cachedBranchForRepo;
              transport.reportMetadata({
                current_branches: {
                  [repoKey]: cachedBranchForRepo,
                },
                worktree_state: {
                  [repoKey]: null,
                },
              });
              continue;
            }
            if (cachedBranchForRepo === lastEmitted) continue;
            lastEmitted = cachedBranchForRepo;
            transport.reportMetadata({
              current_branches: {
                [repoKey]: cachedBranchForRepo,
              },
            });
          } while (rerun);
        } catch (error) {
          logForDebugging(`[remote-bridge] current_branches emit failed: ${errorMessage(error)}`);
        } finally {
          running = false;
        }
      };
      invalidateGitState = () => {
        lastEmitted = undefined;
        emittedWorktreeState = everHadWorktreeState;
        generationCounter++;
        if (running) rerun = true;
      };
      let resolved = Promise.resolve();
      let runEmit = () => {
        if (running) rerun = true;
        else resolved = emitGitState();
        return resolved;
      };
      publishGitStateBeforeHandoff = () =>
        withDeadline(
          runEmit().then(() => transport.flushWorkerState?.() ?? true),
          worktreeModule.WORKTREE_COLLECT_TIMEOUT_MS + TEARDOWN_FLUSH_TIMEOUT_MS,
        );
      refreshGitBranch = () => void runEmit();
      let unsubscribeBranch = onRepoBranchChange(refreshGitBranch);
      stopGitWatcher = () => {
        unsubscribeBranch();
        removeWatchedRepo(originalCwd);
      };
      runEmit();
    })().catch((error) =>
      logForDebugging(`[remote-bridge] current_branches setup failed: ${errorMessage(error)}`),
    );
  let unsubscribeInteraction = onInteraction(() => idleTracker.noteActivity());
  let unsubscribeGrowthBook = onGrowthBookRefresh(() => {
    transport.setStreamEventFlushIntervalMs?.(streamEventFlushIntervalMs());
    transport.setStreamEventFirstFlushMs?.(streamEventFirstFlushMs());
    transport.setNoSubscriberStreamEventFlushIntervalMs?.(noSubscriberFlushMs());
    transport.setNoSubscriberUploadHoldMs?.(noSubscriberHoldMs());
    transport.setDropUnwatchedStreamEvents?.(shouldDropUnwatchedStreamEvents());
    recheckBackfillFlag();
  });
  let readReceiptOwner = {};
  bindReadReceiptSession({
    owner: readReceiptOwner,
    sessionId,
    report: (eventId, phase) => transport.reportDelivery(eventId, phase),
  });
  let prSubscriptions = new Map();
  let userMessageTitleSent = !onUserMessage;
  let userMessageCallbackDone = false;
  let connectCause = "initial";
  let remintAttempts = 0;
  let connectTimeoutTimer;
  function onConnectTimeout(cause) {
    if (stopped) return;
    logEvent("tengu_bridge_repl_connect_timeout", {
      v2: true,
      elapsed_ms: cfg.connect_timeout_ms,
      cause: fromEnum(cause),
    });
    logFeatureBad("bridge_connect", "bridge_connect_timeout");
    if (episodeDead);
    else if (Object.values(CLOSE_CODE_RECOVERY).some((recoveryEntry) => recoveryEntry.cause === cause))
      pendingAuthCode = "recovery_connect_timeout";
    else if (cause === "proactive_refresh") pendingAuthCode = "refresh_connect_timeout";
  }
  async function forceOAuthRefresh(oauthToken) {
    if (!onAuth401) return "rejected";
    try {
      if (await onAuth401(oauthToken)) return "recovered";
    } catch (error) {
      logForDebugging(`[remote-bridge] Proactive forced OAuth refresh threw: ${errorMessage(error)}`, {
        level: "error",
      });
    }
    if (!isDazzlingGardenEnabled() || !classifyFailedOAuthRefresh) return "rejected";
    return classifyFailedOAuthRefresh();
  }
  let maxEarlyRetries = 3;
  let rejectedToken;
  let earlyRetryCount = 0;
  function clearRejectedToken() {
    rejectedToken = undefined;
    earlyRetryCount = 0;
  }
  function isAlreadyRejected(token) {
    return token !== undefined && token === rejectedToken && isDazzlingGardenEnabled();
  }
  let refresh = createTokenRefreshScheduler({
    refreshBufferMs: cfg.token_refresh_buffer_ms,
    onExhausted: (sessionId) => {
      if (!stopped && !episodeDead)
        reportRefreshLeg({
          leg: "bad",
          code: "chain_exhausted_no_oauth",
        });
      if (recoveryInFlight || stopped) return;
      if (failedTerminally) {
        logForDebugging(
          `[remote-bridge] Token refresh chain exhausted for ${sessionId} \u2014 terminal state already showing, not repainting`,
        );
        return;
      }
      logForDebugging(
        `[remote-bridge] Token refresh chain exhausted for ${sessionId} \u2014 surfacing auth failure`,
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
      if (ownerChanged) return;
      if (ownerLooksChanged()) {
        let episodeWasDead = episodeDead;
        if (await ownerChangedSince("owner_changed_refresh")) {
          if (ownerChanged && !episodeWasDead)
            reportRefreshLeg({
              leg: "sad",
              code: "owner_changed",
            });
          return;
        }
      }
      if (workSecretCredentials) return workSecretLaneToken;
      let stale = getAccessToken();
      let alreadyRejected = isAlreadyRejected(stale);
      try {
        if (alreadyRejected) await onReadFreshOAuthToken?.();
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
        if (supersession !== undefined || ownerChanged) {
          logForDebugging(
            `[remote-bridge] Proactive refresh skipped: session ${ownerChanged ? "stopped for an owner change" : "superseded"}`,
          );
          return;
        }
        if (recoveryInFlight || stopped) {
          logForDebugging("[remote-bridge] Recovery already in flight, skipping proactive refresh");
          if (recoveryInFlight && lastRefreshAt !== 0) refreshDeferred = true;
          return;
        }
        if (isTeleportedSession(sid)) {
          logForDebugging(`[remote-bridge] Proactive refresh suppressed for teleported session ${sid}`);
          return;
        }
        let generation = beginRecovery();
        let episodeDeadAtStart = episodeDead;
        let rebuilt = false;
        let failureMessage;
        let failureCode;
        let failureSeverity;
        let refreshLeg;
        let suppressedTeleported = false;
        function noteRefreshFailure(message, severity, code = "refresh_credentials_rejected", authCode) {
          if (stopped) return;
          if (pendingAuthCode !== undefined && pendingClose === undefined) {
            notePresenceBad(pendingAuthCode);
            pendingAuthCode = undefined;
          } else if (!episodeDeadAtStart) {
            pendingPresenceSad = code;
            authEndCode =
              authCode === undefined
                ? undefined
                : {
                    code: authCode,
                    generation: getLauncherLoginGeneration(),
                  };
          }
          failureMessage = message;
          failureCode = "refresh_credentials_rejected";
          failureSeverity = severity;
        }
        async function checkOwnerStale() {
          if (!(await staleAfterOwnerCheck("owner_changed_refresh", generation))) return false;
          if (ownerChanged)
            refreshLeg = {
              leg: "sad",
              code: "owner_changed",
            };
          return true;
        }
        try {
          if (await checkOwnerStale()) return;
          let alreadyRejected = isAlreadyRejected(oauthToken);
          if (!alreadyRejected) clearRejectedToken();
          let now = Date.now();
          let mcpGenerationAtRefresh = mcpGeneration;
          let fresh = await withRetry(
            () => {
              if (alreadyRejected)
                return Promise.resolve({
                  terminal: false,
                  reason: "oauth_rejected",
                });
              if (stopped || supersession !== undefined || recoveryGeneration !== generation)
                return Promise.resolve(null);
              return refetchWithEpoch(sid, oauthToken).then((result) =>
                stopped || recoveryGeneration !== generation ? result : screenNonOriginRefusal(result),
              );
            },
            "fetchRemoteCredentials (proactive)",
            cfg,
          );
          if (stopped || recoveryGeneration !== generation) return;
          if (isCredentialsRejection(fresh)) {
            logForDebugging(
              alreadyRejected
                ? "[remote-bridge] Proactive cycle: bearer already rejected by /bridge \u2014 retrying the forced OAuth refresh without re-registering"
                : "[remote-bridge] Proactive /bridge re-mint rejected (oauth_rejected) \u2014 attempting forced OAuth refresh",
            );
            if (!alreadyRejected) logForDiagnosticsNoPII("error", "bridge_repl_v2_proactive_oauth_rejected");
            if (await checkOwnerStale()) return;
            let launcherLoginGeneration = getLauncherLoginGeneration();
            let refreshOutcome = await forceOAuthRefresh(oauthToken);
            let latestToken = getAccessToken() ?? oauthToken;
            if (await checkOwnerStale()) return;
            if (refreshOutcome === "unreachable") {
              logForDebugging(
                "[remote-bridge] Proactive forced OAuth refresh got no verdict (token endpoint unreachable); keeping transport, a later cycle retries the refresh",
              );
              if (!alreadyRejected)
                refreshLeg = {
                  leg: "sad",
                  code: "refresh_deferred_transient",
                };
              rejectedToken = oauthToken;
              let shouldRetry = earlyRetryCount < maxEarlyRetries;
              if (isTeleportedSession(sid)) shouldRetry = false;
              if (shouldRetry) {
                earlyRetryCount++;
                refresh.scheduleFromExpiresIn(sid, 0);
              }
              logForDiagnosticsNoPII("info", "bridge_repl_v2_proactive_refresh_unreachable", {
                early_retry: earlyRetryCount,
                rearmed: shouldRetry,
              });
              return;
            }
            let recovered = refreshOutcome === "recovered";
            if (recovered) clearRejectedToken();
            let reminted = recovered
              ? await withRetry(
                  () => {
                    if (stopped || supersession !== undefined || recoveryGeneration !== generation)
                      return Promise.resolve(null);
                    return refetchWithEpoch(sid, latestToken).then((result) =>
                      stopped || recoveryGeneration !== generation ? result : screenNonOriginRefusal(result),
                    );
                  },
                  "fetchRemoteCredentials (proactive post-refresh)",
                  cfg,
                )
              : null;
            if (stopped || recoveryGeneration !== generation) return;
            if (recovered && reminted === null) {
              logForDebugging(
                "[remote-bridge] Proactive post-refresh re-mint failed (transient); fallback refresh will retry",
              );
              if (supersession === undefined)
                refreshLeg = {
                  leg: "sad",
                  code: "post_refresh_remint_null",
                };
              return;
            }
            if (isCredentialsFailure(reminted)) {
              refreshLeg = {
                leg: "bad",
                code: `post_refresh_credentials_${failureSeverity_2(reminted)}`,
              };
              noteRefreshFailure(
                describeCredentialFailure(reminted),
                failureSeverity_2(reminted),
                credentialsRejectedCode("refresh", reminted),
              );
              return;
            }
            if (reminted === null || isCredentialsRejection(reminted)) {
              let hostDeclined = recovered ? undefined : hostDeclinedCode(launcherLoginGeneration);
              if (hostDeclined !== undefined) {
                refreshLeg = {
                  leg: "sad",
                  code: hostDeclined,
                };
                logForDiagnosticsNoPII("info", "bridge_repl_v2_proactive_host_declined");
                noteRefreshFailure(
                  hostDeclinedHint(hostDeclined),
                  hostDeclinedSeverity(hostDeclined),
                  "refresh_credentials_rejected",
                  hostDeclined,
                );
                return;
              }
              refreshLeg = {
                leg: "bad",
                code: recovered
                  ? "oauth_rejected_after_refresh"
                  : onAuth401
                    ? "oauth_rejected_refresh_failed"
                    : "oauth_rejected_no_refresh_path",
              };
              noteRefreshFailure(loginExpiredForRefreshMessage, "auth");
              return;
            }
            noteAcceptedToken(latestToken);
            let rebuildResult = await rebuildWithCredentials(
              reminted,
              "proactive_refresh",
              0,
              now,
              mcpGenerationAtRefresh,
            );
            if (rebuildResult === "suppressed_teleported") suppressedTeleported = true;
            if (rebuildResult === "rebuilt") {
              rebuilt = true;
              refreshLeg = {
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
              refreshLeg = {
                leg: "sad",
                code: "remint_null",
              };
            return;
          }
          if (isCredentialsFailure(fresh)) {
            refreshLeg = {
              leg: "bad",
              code: `credentials_${failureSeverity_2(fresh)}`,
            };
            noteRefreshFailure(
              describeCredentialFailure(fresh),
              failureSeverity_2(fresh),
              credentialsRejectedCode("refresh", fresh),
            );
            return;
          }
          noteAcceptedToken(oauthToken);
          let rebuildResult = await rebuildWithCredentials(
            fresh,
            "proactive_refresh",
            0,
            now,
            mcpGenerationAtRefresh,
          );
          if (rebuildResult === "suppressed_teleported") suppressedTeleported = true;
          if (rebuildResult === "rebuilt") {
            rebuilt = true;
            refreshLeg = {
              leg: "ok",
            };
            logForDebugging("[remote-bridge] Transport rebuilt (proactive refresh)");
          }
        } catch (err) {
          logForDebugging(`[remote-bridge] Proactive refresh rebuild failed: ${errorMessage(err)}`, {
            level: "error",
          });
          logForDiagnosticsNoPII("error", "bridge_repl_v2_proactive_refresh_failed");
          if (!stopped && !ownerChanged) {
            failureMessage = `Refresh failed: ${errorMessage(err)}`;
            failureCode = "refresh_rebuild_failed";
            failureSeverity = "terminal";
            refreshLeg = {
              leg: "bad",
              code: "rebuild_threw",
            };
          }
        } finally {
          let teleported = suppressedTeleported;
          if (isTeleportedSession(sid)) teleported = true;
          if (
            refreshLeg !== undefined &&
            !episodeDeadAtStart &&
            !stopped &&
            !(teleported && refreshLeg.leg === "bad")
          )
            reportRefreshLeg(refreshLeg);
          if (!endRecovery(generation)) return;
          runDeferredRefresh();
          let stashedClose = pendingClose;
          pendingClose = undefined;
          if (teleported) {
            if (stashedClose !== undefined && !stopped) failTransport("Session teleported to cloud");
          } else if (stashedClose !== undefined && !rebuilt && !stopped && !episodeDead) {
            let handled = handleClose(
              stashedClose.code,
              stashedClose.cause,
              stashedClose.detail,
              true,
              stashedClose.at,
            );
            if (failureMessage !== undefined && !handled && !stopped && !recoveryInFlight)
              failTransport(failureMessage, failureSeverity);
          } else if (stashedClose !== undefined && rebuilt && !stopped) {
            if (isRecoverableCode(stashedClose.code) && !episodeDeadAtStart)
              notePresenceSad(CLOSE_CODE_RECOVERY[stashedClose.code].recoveredCode, {
                recovery_bucket: bucketRecentUse(Date.now() - stashedClose.at),
              });
          } else if (failureMessage !== undefined && !stopped) {
            failTransport(failureMessage, failureSeverity);
            if (
              failureCode !== undefined &&
              failureCode !== "refresh_credentials_rejected" &&
              !episodeDeadAtStart
            )
              notePresenceBad(failureCode);
          }
        }
      })();
    },
    label: "remote",
  });
  refresh.scheduleFromExpiresIn(sessionId, bridgeCredentials.expires_in);
  unsubscribeOwnerPin = ownerPin?.subscribe(() => {
    ownerChangedSince("owner_changed");
  });
  if (ownerLooksChanged()) ownerChangedSince("owner_changed");
  let heldData;
  function wireTransportCallbacks() {
    transport.setOnConnect((msgs) => {
      if (ownerChanged) return;
      clearTimeout(connectTimeoutTimer);
      recoveryAttempts = 0;
      firstCloseAt = undefined;
      pendingAuthCode = undefined;
      episodeDead = false;
      pendingPresenceSad = undefined;
      authEndCode = undefined;
      failedTerminally = false;
      resetNonOriginStreak();
      supersession = undefined;
      if (pendingRequests.size > 0) {
        let last = [...pendingRequests.values()].findLast((entry) => entry.details !== undefined);
        reportState("requires_action", last?.details);
        notForwardedIds.clear();
      } else if (lastReportedState === "running" && isLive(() => true)) reportState("running");
      logForDebugging("[remote-bridge] v2 transport connected");
      logForDiagnosticsNoPII("info", "bridge_repl_v2_transport_connected");
      resendReceipts();
      flushHistory(msgs);
      if (transcriptMirrorMode === "deferred") {
        if (releaseReason === undefined && !deferralReported)
          reportTranscriptDeferred(transcriptUploadDeferred, () => {
            deferralReported = true;
          });
      } else {
        if (deferralCleared)
          reportTranscriptDeferred(null, () => {
            deferralCleared = false;
          });
        installPersistence();
      }
      logEvent("tengu_bridge_repl_ws_connected", {
        v2: true,
        cause: fromEnum(connectCause),
        ...(remintAttempts > 0 && {
          remint_attempts: remintAttempts,
        }),
      });
      if (!presenceLogged && canReportPresence()) {
        presenceLogged = true;
        logFeatureOk("bridge_presence");
      }
      if (transcriptMirrorMode === "deferred") {
        if (!historyFlushed && pendingRequests.size === 0) {
          let last = initialMessages
            ?.filter((initialMessage) => isEligibleBridgeMessage(initialMessage))
            .findLast((initialMessage) => !isAttachmentOrConsentFallback(initialMessage));
          if (isLive(() => last !== undefined && isRealUserTurn(last) && !isInterruptionMessage(last)))
            reportState("running");
        }
        historyFlushed = true;
      }
      if (!historyFlushed && initialMessages && initialMessages.length > 0 && !reattachFellBackToFresh) {
        historyFlushed = true;
        let flushingTransport = transport;
        let historyFlush = flushInitialHistory(initialMessages);
        let deferred = Promise.withResolvers();
        historyFlush
          .catch((error) => logForDebugging(`[remote-bridge] flushHistory failed: ${error}`))
          .finally(() => {
            deferred.resolve();
            if (transport !== flushingTransport || stopped || ownerChanged || recoveryInFlight) return;
            drainFlushGate();
            setConnected();
          });
        firstHistoryPromise = Promise.all([historyFlush, deferred.promise]);
        firstHistoryPromise.catch(() => {});
      } else if (transcriptReleasing) setConnected();
      else if ((messageFlushGate.active || frameFlushGate.active) && !recoveryInFlight) {
        clearRecoverTimer();
        drainFlushGate();
        setConnected();
      } else if (!messageFlushGate.active) setConnected();
      reportReleaseReason();
      lastClosedTransport = transport;
    });
    transport.setOnData((data) => {
      if (ownerChanged) return;
      if (heldData !== undefined) {
        heldData.push(data);
        return;
      }
      if (!ownerLooksChanged()) {
        handleFrame(data);
        return;
      }
      heldData = [data];
      drainHeldData();
    });
    let closedTransport = transport;
    transport.setOnClose((code, cause, detail) => {
      if (lastClosedTransport === closedTransport) lastClosedTransport = undefined;
      let now = Date.now();
      return handleClose(code, cause, detail, false, Math.min(now, closedTransport.lastFrameReadAt() ?? now));
    });
    function drainHeldData() {
      ownerChangedSince("owner_changed").then((res) => {
        let queue = heldData;
        if (queue === undefined) return;
        if (res || stopped) {
          heldData = undefined;
          return;
        }
        let remaining = queue.length;
        while (queue.length > 0) {
          if (ownerChanged || stopped) {
            heldData = undefined;
            return;
          }
          if (remaining === 0 && ownerLooksChanged()) {
            drainHeldData();
            return;
          }
          remaining = Math.max(0, remaining - 1);
          let req = queue.shift();
          if (req !== undefined) handleFrame(req);
        }
        heldData = undefined;
      });
    }
    function handleFrame(req) {
      handleIngressMessage(
        req,
        recentPostedUUIDs,
        recentInboundUUIDs,
        (code) => {
          if (isHumanInboundMessage(code, "bridge")) {
            idleTracker.noteActivity();
            releaseTranscript("client_prompt");
          }
          let receiptUuid =
            onInboundMessage !== undefined && code.type === "user" && isBridgeInboundReadReceiptsEnabled()
              ? normalizeUuidOrNull(code.uuid)
              : null;
          if (receiptUuid === null) return onInboundMessage?.(code);
          return withReadReceiptClaim(receiptUuid, () => onInboundMessage?.(code));
        },
        onPermissionResponse
          ? (response) => {
              if (onPermissionResponse(response)) {
                let answered = response.response.subtype === "success" && !!response.response.response;
                if (answered) {
                  idleTracker.noteActivity();
                  releaseTranscript("client_input");
                }
                resolvePendingAction(response.response.request_id, answered);
                if (!turnResultReported) reportPendingState();
              }
            }
          : undefined,
        (controlRequest) => {
          if (isCoalescableControlRequest(controlRequest)) {
            idleTracker.noteActivity();
            releaseTranscript("client_input");
          }
          handleReplBridgeControlRequest(controlRequest, {
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
            getPendingPrompts: takePendingPrompts,
            onDialogKindsDeclared,
            onClientInitialize: clientInitializeHandler,
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
            hasPendingPrompts: () => pendingRequests.size > 0,
            outboundOnly,
            writeFrame: (frame) => {
              if (shouldDropAfterOwnerChange(frame.type)) return;
              writeOrQueueFrame(frame, frame.type);
            },
            cancellableRequests: flushGate,
          });
        },
        (requestId) => flushGate.get(requestId)?.abort(),
        onQueuedNotification,
      );
    }
  }
  function handleClose(code, cause, detail, synthetic, closedAt) {
    let leakedRecovery = false;
    clearTimeout(connectTimeoutTimer);
    if (stopped || ownerChanged) {
      reportLostEvents(0, [], transport.discardUndeliveredEvents?.() ?? []);
      return false;
    }
    if (!synthetic) {
      logForDebugging(
        `[remote-bridge] v2 transport closed (code=${code}${detail ? ` source=${detail.rejectSource}` : ""})`,
      );
      logEvent("tengu_bridge_repl_ws_closed", {
        code,
        v2: true,
        close_cause: fromEnumOpt(cause),
        recovery_in_flight: recoveryInFlight,
        ...(detail !== undefined && {
          reject_source: fromEnum(detail.rejectSource),
        }),
      });
    }
    if (recoveryInFlight) {
      let heldMs = recoveryStartedAt ? Date.now() - recoveryStartedAt : 0;
      if (heldMs <= recoveryCeilingMs) {
        pendingClose = {
          code: code ?? 4092,
          cause,
          detail,
          at: pendingClose?.at ?? firstCloseAt ?? closedAt,
        };
        return false;
      }
      logForDebugging(
        `[remote-bridge] authRecoveryInFlight held ${Math.round(heldMs / 1000)}s (> ceiling ${Math.round(recoveryCeilingMs / 1000)}s) \u2014 treating as leaked, handling close directly`,
        {
          level: "error",
        },
      );
      logForDiagnosticsNoPII("error", "bridge_repl_v2_recovery_flag_leaked");
      resetRecoveryFlags();
      pendingClose = undefined;
      leakedRecovery = true;
    }
    if (isRecoverableCode(code)) {
      if (recoveryAttempts >= maxRecoveryAttempts) {
        logForDebugging(`[remote-bridge] ${code} recovery exhausted after ${recoveryAttempts} attempts`, {
          level: "error",
        });
        failTransport(`Transport recovery exhausted (code ${code})`);
        if (!episodeDead)
          notePresenceBad("recovery_exhausted", {
            close_code: code,
          });
        return false;
      }
      if (code === 4094 && !synthetic) {
        if (credRecoveryAttempts >= maxRecoveryAttempts) {
          logForDebugging(
            `[remote-bridge] worker-credential recovery exhausted after ${credRecoveryAttempts} attempts with no successful heartbeat between them`,
            {
              level: "error",
            },
          );
          failTransport("Transport recovery exhausted (worker credential failures)", "auth");
          if (!episodeDead) notePresenceBad("cred_recovery_exhausted");
          return false;
        }
        credRecoveryAttempts++;
      }
      if (code === 4093 && !synthetic) {
        let budgetVerdict = reconnectBudget.charge(Date.now(), isRecoveryPatienceEnabled());
        switch (budgetVerdict) {
          case "hourly_exhausted":
          case "daily_exhausted": {
            let windowHours = budgetVerdict === "hourly_exhausted" ? 1 : 24;
            logForDebugging(`[remote-bridge] heartbeat recovery budget exhausted (${windowHours}h window)`, {
              level: "error",
            });
            failTransport(
              budgetVerdict === "hourly_exhausted" ? HOURLY_EXHAUSTED_DETAIL : DAILY_EXHAUSTED_DETAIL,
            );
            if (!episodeDead)
              notePresenceBad("heartbeat_budget_exhausted", {
                window_h: windowHours,
              });
            return false;
          }
          case "charged":
            break;
        }
      }
      recoveryAttempts++;
      firstCloseAt ??= closedAt;
      recoverFromClose(code);
      return false;
    }
    let inEpisode = (synthetic || leakedRecovery) && rebuiltSinceStart;
    let supersessionClass = classifySupersession(code, cause);
    if (supersessionClass !== undefined && !(inEpisode && isNotArchived(supersessionClass)))
      supersession = supersessionClass;
    let effectiveCause = inEpisode && cause === "superseded_by_worker" ? undefined : cause;
    let endedElsewhere =
      code === 4090 &&
      (effectiveCause === "superseded_by_worker" ||
        effectiveCause === "session_not_active" ||
        effectiveCause === "session_not_found");
    failTransport(
      endedElsewhere
        ? describeBridgeCloseCode(code, effectiveCause)
        : `Transport closed: ${describeBridgeCloseCode(code, effectiveCause, detail)}`,
      endedElsewhere ? "ended_elsewhere" : "terminal",
    );
    if (episodeDead) return endedElsewhere;
    if (code === 4090) {
      if (synthetic && rebuiltSinceStart) notePresenceBad("transport_closed_4090");
      else {
        notePresenceSad("transport_closed_4090");
        episodeDead = true;
      }
    } else if (code === 403) noteNonOriginClose(detail);
    else notePresenceBad(code === 404 ? "transport_closed_404" : "transport_closed_other");
    return endedElsewhere;
  }
  async function rebuildWithCredentials(results, cause, attempts, refreshAt, mcpGenerationAt) {
    raiseWorkerEpoch(results.worker_epoch);
    if (isTeleportedSession(sessionId)) {
      logForDebugging(`[remote-bridge] Rebuild suppressed for teleported session ${sessionId}`);
      return "suppressed_teleported";
    }
    connectCause = cause;
    remintAttempts = attempts;
    supersession = undefined;
    rebuiltSinceStart = true;
    pendingActionShown = false;
    invalidateGitState?.();
    teardownPersistence();
    messageFlushGate.start();
    frameFlushGate.start();
    try {
      let oldTransport = transport;
      let initialSequenceNum = oldTransport.getLastSequenceNum();
      let initialLongPollMode = oldTransport.isLongPolling?.() === true;
      lastClosedTransport = undefined;
      oldTransport.close({
        goodbye: false,
        retainUndelivered: true,
      });
      transport = await createV2ReplTransport({
        ...buildTransportOptions(),
        sessionUrl: buildCCRv2SdkUrl(results.api_base_url, sessionId),
        ingressToken: results.worker_jwt,
        sessionId,
        epoch: results.worker_epoch,
        initialSequenceNum,
        initialLongPollMode,
        onConnectNeedsRecord: onConnectNeedsRecord && !historyFlushStarted,
        getAuthToken: () => results.worker_jwt,
      });
      if (stopped) {
        transport.close();
        return "rebuilt";
      }
      if (ownerChanged) {
        transport.close();
        return "suppressed_owner_changed";
      }
      wireTransportCallbacks();
      transport.connect();
      carryOverUndeliveredEvents(oldTransport);
      refreshGitBranch?.();
      reseedBridgePermissionMode();
      reseedBridgeCrossSessionInbound();
      reseedBridgeModel();
      reseedBridgeArtifacts();
      reseedBridgePostTurnSummary();
      resendBridgeEffortMetadata();
      reseedBridgeContextUsage();
      onTransportRebuilt?.();
      connectTimeoutTimer = setTimeout(onConnectTimeout, cfg.connect_timeout_ms, connectCause);
      refresh.scheduleFromExpiresIn(sessionId, results.expires_in);
      workerJwt = results.worker_jwt;
      workerEpoch_2 = results.worker_epoch;
      apiBaseUrl = results.api_base_url;
      let deferredRefresh = lastRefreshAt !== 0 && (refreshDeferred || refreshAt < lastRefreshAt);
      lastRefreshAt = 0;
      let staleMentions = mcpGenerationAt < mcpGeneration;
      refreshDeferred = deferredRefresh || staleMentions;
      try {
        refreshInjectedMcp(results, staleMentions);
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
  async function handleMissingToken(site, generation, episodeDeadInHandler) {
    let classifyEnabled =
      !episodeDeadInHandler &&
      onClassifyMissingOAuthToken !== undefined &&
      canReportPresence() &&
      isBridgeSignedOutNeutralEnabled();
    let verdict = classifyEnabled ? await onClassifyMissingOAuthToken(site) : undefined;
    if (classifyEnabled && (stopped || recoveryGeneration !== generation)) return;
    if (verdict === "signed_out") {
      logForDebugging(
        `[remote-bridge] Signed out on this machine under ${sessionId} (${site}) \u2014 stopping`,
      );
      logForDiagnosticsNoPII("info", "bridge_repl_v2_signed_out");
      notePresenceSad("signed_out");
      if (!presenceLogged) logFeatureSad("bridge_connect", "signed_out");
      episodeDead = true;
      failTransport(signedOutMessage, "auth");
      return;
    }
    failTransport(jwtRefreshNoTokenMessage, "auth");
    if (!episodeDeadInHandler) notePresenceBad("recovery_no_oauth_token");
  }
  async function remintLoop(closeCode, generation, episodeDead, cap) {
    let now = Date.now();
    logForDiagnosticsNoPII("info", "bridge_repl_v2_remint_loop_entered");
    remintLoopActive = true;
    let attempts = 0;
    try {
      let oauthRetried = false;
      let unreachableCount = 0;
      for (let attempt = 1; !stopped; attempt++) {
        if (recoveryGeneration !== generation)
          return {
            creds: null,
            attempts,
          };
        let rounded = Math.round((Date.now() - now) / 60000);
        setReconnecting(
          `${workSecretCredentials ? "Remote Control credentials unavailable" : "Remote Control server unreachable"} \u2014 retrying (attempt ${attempt}${rounded > 0 ? `, ${rounded}m elapsed` : ""})`,
        );
        let min = Math.min(BRIDGE_REMINT_BACKOFF_BASE_MS * 2 ** (attempt - 1), BRIDGE_REMINT_BACKOFF_CAP_MS);
        await sleep(Math.max(Math.random() * min, BRIDGE_REMINT_MIN_JITTER_MS));
        if (stopped) break;
        if (recoveryGeneration !== generation)
          return {
            creds: null,
            attempts,
          };
        recoveryStartedAt = Date.now();
        if (isTeleportedSession(sessionId)) {
          failTransport("Session teleported to cloud");
          logForDiagnosticsNoPII("info", "bridge_repl_v2_remint_loop_teleported");
          return {
            creds: null,
            attempts,
          };
        }
        let laneToken = getLaneToken();
        if (!laneToken) {
          logForDiagnosticsNoPII("info", "bridge_repl_v2_remint_loop_no_oauth");
          await handleMissingToken("remint_loop", generation, episodeDead);
          return {
            creds: null,
            attempts,
          };
        }
        let result = await refetchCredentials(laneToken, generation);
        attempts = attempt;
        if (stopped) break;
        if (recoveryGeneration !== generation)
          return {
            creds: null,
            attempts,
          };
        if (result === null) {
          unreachableCount++;
          if (cap === undefined || unreachableCount < cap.attempts) continue;
          logForDebugging(
            `[remote-bridge] Re-mint loop exhausted (code ${closeCode}): ${unreachableCount} unreachable attempts, ${Math.round((Date.now() - now) / 1000)}s`,
            {
              level: "error",
            },
          );
          logForDiagnosticsNoPII("info", "bridge_repl_v2_remint_loop_exhausted", {
            attempts,
            elapsed_ms: Date.now() - now,
            queued_writes_dropped:
              messageFlushGate.pendingCount + frameFlushGate.pendingCount + frameFlushGate.evictedCount,
          });
          failTransport(cap.exhaustedDetail);
          if (!episodeDead)
            notePresenceBad("recovery_exhausted", {
              close_code: closeCode,
              remint_attempts: attempts,
            });
          return {
            creds: null,
            attempts,
          };
        }
        if (isCredentialsRejection(result)) {
          if (onAuth401 && !oauthRetried) {
            if (await staleAfterOwnerCheck("owner_changed_recovery", generation))
              return {
                creds: null,
                attempts,
              };
            oauthRetried = true;
            let refreshed = false;
            try {
              refreshed = await onAuth401(laneToken);
            } catch (error) {
              logForDebugging(`[remote-bridge] Re-mint loop OAuth refresh threw: ${errorMessage(error)}`, {
                level: "error",
              });
            }
            if (stopped) break;
            if (recoveryGeneration !== generation)
              return {
                creds: null,
                attempts,
              };
            if (refreshed) {
              logForDebugging(
                "[remote-bridge] Re-mint rejected after outage \u2014 OAuth refresh succeeded; retrying with the refreshed credential",
              );
              continue;
            }
          }
          failTransport(loginRejectedMessage, "auth");
          if (!episodeDead) notePresenceBad("recovery_credentials_rejected");
          logForDiagnosticsNoPII("info", "bridge_repl_v2_remint_loop_rejected");
          return {
            creds: null,
            attempts,
          };
        }
        if (isCredentialsFailure(result)) {
          failTransport(describeCredentialFailure(result), failureSeverity_2(result));
          if (!episodeDead) notePresenceBad(credentialsRejectedCode("recovery", result));
          logForDiagnosticsNoPII("info", "bridge_repl_v2_remint_loop_denied");
          return {
            creds: null,
            attempts,
          };
        }
        logForDebugging(
          `[remote-bridge] Re-mint loop succeeded (code ${closeCode}, attempt ${attempt}, ${Math.round((Date.now() - now) / 1000)}s)`,
        );
        logForDiagnosticsNoPII("info", "bridge_repl_v2_remint_loop_recovered", {
          attempts: attempt,
          elapsed_ms: Date.now() - now,
        });
        return {
          creds: result,
          attempts,
        };
      }
      return {
        creds: null,
        attempts,
      };
    } finally {
      if (recoveryGeneration === generation) remintLoopActive = false;
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
  function isRecoverableCode(code) {
    if (code === 4094) return isBridgeAuthReviveEnabled();
    return code === 401 || code === 4091 || code === 4093;
  }
  let retryDelayMs = 30000;
  let deferredRetryMs = 5000;
  function rebuildTransport(fresh, cause) {
    if (CLOSE_CODE_RECOVERY[fresh].fetchFailure === "terminal") {
      failTransport(cause);
      return;
    }
    messageFlushGate.start();
    frameFlushGate.start();
    setReconnecting("presence recovery failed \u2014 retrying");
    logForDebugging(`[remote-bridge] ${fresh} recovery fetch failed \u2014 retrying in ${retryDelayMs}ms`);
    clearRecoverTimer();
    let closedTransport = transport;
    function recoverFromAuthFailure() {
      recoverTimer = undefined;
      if (stopped) return;
      if (recoveryAttempts === 0) {
        if (messageFlushGate.active || frameFlushGate.active) {
          if (recoveryInFlight) {
            recoverTimer = setTimeout(recoverFromAuthFailure, deferredRetryMs);
            return;
          }
          drainFlushGate();
          setConnected();
        }
        return;
      }
      if (transport !== closedTransport) return;
      handleClose(fresh, undefined, undefined, true, firstCloseAt ?? Date.now());
    }
    recoverTimer = setTimeout(recoverFromAuthFailure, retryDelayMs);
  }
  async function recoverFromClose(closeCode) {
    let episodeDeadBeforeRecovery = episodeDead;
    let episodeStartAt = firstCloseAt ?? Date.now();
    if (isTeleportedSession(sessionId)) {
      failTransport("Session teleported to cloud");
      return;
    }
    if (recoveryInFlight) return;
    let stale = beginRecovery();
    messageFlushGate.start();
    frameFlushGate.start();
    setReconnecting(CLOSE_CODE_RECOVERY[closeCode].reconnectingDetail);
    logForDebugging(
      `[remote-bridge] ${closeCode} on transport \u2014 attempting credential refresh + rebuild`,
    );
    try {
      if (await staleAfterOwnerCheck("owner_changed_recovery", stale)) return;
      let accessToken = getAccessToken();
      let refreshed = true;
      let launcherLoginGeneration = getLauncherLoginGeneration();
      if (!workSecretCredentials && CLOSE_CODE_RECOVERY[closeCode].needsOAuthRefresh && onAuth401)
        try {
          refreshed = await onAuth401(accessToken ?? "", "stale");
        } catch (error) {
          refreshed = false;
          logForDebugging(
            `[remote-bridge] ${closeCode} recovery OAuth refresh threw: ${errorMessage(error)}`,
            {
              level: "error",
            },
          );
        }
      else if (!workSecretCredentials && onProactiveRefresh)
        try {
          await onProactiveRefresh();
        } catch (error) {
          logForDebugging(`[remote-bridge] pre-recovery token refresh failed: ${errorMessage(error)}`, {
            level: "error",
          });
        }
      if (recoveryGeneration !== stale) return;
      let laneToken = getLaneToken() ?? accessToken;
      let isHostBearer = laneToken === heldHostSessionsBearer();
      if (!laneToken || stopped) {
        if (!stopped) await handleMissingToken("recovery", stale, episodeDeadBeforeRecovery);
        return;
      }
      if (isTeleportedSession(sessionId)) {
        failTransport("Session teleported to cloud");
        return;
      }
      let now = Date.now();
      let mcpGenerationAtRecovery = mcpGeneration;
      let fresh = await withRetry(
        () => refetchCredentials(laneToken, stale),
        "fetchRemoteCredentials (recovery)",
        cfg,
      );
      if (recoveryGeneration !== stale) return;
      if (
        (!fresh || isCredentialsRejection(fresh)) &&
        !stopped &&
        CLOSE_CODE_RECOVERY[closeCode].needsOAuthRefresh &&
        onAuth401 &&
        !refreshed
      ) {
        let adoptedNewToken = false;
        for (let idx = 1; idx <= cfg.oauth_retry_max_attempts && !stopped; idx++) {
          setReconnecting(
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
          if (await staleAfterOwnerCheck("owner_changed_recovery", stale)) return;
          let nextToken;
          try {
            nextToken = onReadFreshOAuthToken
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
          if (stopped || recoveryGeneration !== stale) return;
          let usableToken =
            nextToken !== undefined && nextToken !== (accessToken ?? "") ? nextToken : undefined;
          if (!usableToken) continue;
          adoptedNewToken = true;
          if (isTeleportedSession(sessionId)) {
            failTransport("Session teleported to cloud");
            return;
          }
          fresh = await withRetry(
            () => refetchCredentials(usableToken, stale),
            "fetchRemoteCredentials (recovery re-poll)",
            cfg,
          );
          break;
        }
        if (recoveryGeneration !== stale) return;
        if (isCredentialsRejection(fresh) && !adoptedNewToken) {
          if (!stopped) {
            let hostDeclined = hostDeclinedCode(launcherLoginGeneration);
            if (hostDeclined !== undefined) {
              logForDiagnosticsNoPII("info", "bridge_repl_v2_recovery_host_declined");
              failTransport(hostDeclinedHint(hostDeclined), hostDeclinedSeverity(hostDeclined));
              if (!episodeDeadBeforeRecovery)
                if (presenceLogged) {
                  notePresenceSad(hostDeclined);
                  episodeDead = true;
                } else notePresenceBad("recovery_reauth_required");
              return;
            }
            failTransport("OAuth token refresh failed \u2014 run /login to re-authenticate", "auth");
            if (!episodeDeadBeforeRecovery) notePresenceBad("recovery_reauth_required");
          }
          return;
        }
      }
      if (stopped) return;
      if (!fresh && CLOSE_CODE_RECOVERY[closeCode].fetchFailure === "retry" && !isRecoveryPatienceEnabled()) {
        rebuildTransport(closeCode, `could not fetch fresh session credentials after code ${closeCode}`);
        return;
      }
      if (
        isCredentialsRejection(fresh) &&
        (!CLOSE_CODE_RECOVERY[closeCode].needsOAuthRefresh ||
          (refreshed && laneToken === accessToken && isHostBearer)) &&
        onAuth401
      ) {
        if (await staleAfterOwnerCheck("owner_changed_recovery", stale)) return;
        let refreshed = false;
        try {
          refreshed = await onAuth401(
            CLOSE_CODE_RECOVERY[closeCode].needsOAuthRefresh ? laneToken : (accessToken ?? ""),
          );
        } catch (error) {
          logForDebugging(`[remote-bridge] ${closeCode} late OAuth refresh threw: ${errorMessage(error)}`, {
            level: "error",
          });
        }
        if (stopped || recoveryGeneration !== stale) return;
        if (refreshed) {
          fresh = await withRetry(
            () => refetchCredentials(getAccessToken() ?? accessToken ?? "", stale),
            `fetchRemoteCredentials (${closeCode} late refresh)`,
            cfg,
          );
          if (stopped || recoveryGeneration !== stale) return;
        }
      }
      if (isCredentialsRejection(fresh)) {
        failTransport(loginRejectedMessage, "auth");
        if (!episodeDeadBeforeRecovery) notePresenceBad("recovery_credentials_rejected");
        return;
      }
      let remintAttempts = 0;
      if (!fresh) {
        let remintResult = await remintLoop(
          closeCode,
          stale,
          episodeDeadBeforeRecovery,
          isRecoveryPatienceEnabled() ? CLOSE_CODE_RECOVERY[closeCode].remintCap : undefined,
        );
        fresh = remintResult.creds;
        remintAttempts = remintResult.attempts;
        if (!fresh || stopped || recoveryGeneration !== stale) return;
      }
      if (isCredentialsFailure(fresh)) {
        if (!stopped) {
          failTransport(describeCredentialFailure(fresh), failureSeverity_2(fresh));
          if (!episodeDeadBeforeRecovery) notePresenceBad(credentialsRejectedCode("recovery", fresh));
        }
        return;
      }
      if (recoveryGeneration !== stale) return;
      let rebuildResult = await rebuildWithCredentials(
        fresh,
        CLOSE_CODE_RECOVERY[closeCode].cause,
        remintAttempts,
        now,
        mcpGenerationAtRecovery,
      );
      if (rebuildResult === "suppressed_teleported") {
        failTransport("Session teleported to cloud");
        return;
      }
      if (rebuildResult === "suppressed_owner_changed") return;
      logForDebugging(`[remote-bridge] Transport rebuilt after ${closeCode}`);
      if (!stopped) {
        if (!episodeDeadBeforeRecovery)
          notePresenceSad(CLOSE_CODE_RECOVERY[closeCode].recoveredCode, {
            ...(remintAttempts > 0 && {
              remint_attempts: remintAttempts,
            }),
            recovery_bucket: bucketRecentUse(Date.now() - episodeStartAt),
          });
      }
    } catch (error) {
      logForDebugging(`[remote-bridge] ${closeCode} recovery failed: ${errorMessage(error)}`, {
        level: "error",
      });
      logForDiagnosticsNoPII("error", CLOSE_CODE_RECOVERY[closeCode].failureDiagnostic);
      if (!stopped && !ownerChanged) {
        rebuildTransport(closeCode, `Transport recovery failed (${closeCode}): ${errorMessage(error)}`);
        if (CLOSE_CODE_RECOVERY[closeCode].fetchFailure === "terminal" && !episodeDeadBeforeRecovery)
          notePresenceBad("recovery_failed");
      }
    } finally {
      if (endRecovery(stale)) {
        runDeferredRefresh();
        if (recoverTimer !== undefined && pendingClose !== undefined) {
          clearRecoverTimer();
          let stashedClose = pendingClose;
          pendingClose = undefined;
          handleClose(stashedClose.code, stashedClose.cause, stashedClose.detail, true, stashedClose.at);
        } else pendingClose = undefined;
        if (recoverTimer === undefined && !recoveryInFlight) {
          messageFlushGate.drop();
          frameFlushGate.drop();
          queuedAnyMessage = false;
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
  connectTimeoutTimer = setTimeout(onConnectTimeout, cfg.connect_timeout_ms, connectCause);
  function isLive(check) {
    return isTurnLive ? isTurnLive(check) : check();
  }
  function toLiveSdkEvents(messages) {
    return toRedactedSdkEvents(messages, "live").map((event) => {
      if (event.type !== "assistant" || event.parent_tool_use_id !== null || event.uuid === undefined)
        return {
          ...event,
          session_id: sessionId,
        };
      let userMessageUuid = replyStamps.get(event.uuid);
      if (userMessageUuid === undefined)
        return {
          ...event,
          session_id: sessionId,
        };
      replyStamps.delete(event.uuid);
      return {
        ...event,
        session_id: sessionId,
        user_message_uuid: userMessageUuid,
        user_message_uuids: [userMessageUuid],
      };
    });
  }
  function drainFlushGate() {
    let deferred = transcriptMirrorMode === "deferred";
    let messages = deferred
      ? messageFlushGate.end().filter((entry) => hasUserMessagingToolUse(entry.message))
      : messageFlushGate.end();
    let frames = deferred
      ? frameFlushGate.end().filter((entry) => !isTaskLifecycleMessage(entry.frame))
      : frameFlushGate.end();
    let passedLive = queuedAnyMessage;
    queuedAnyMessage = false;
    if (messages.length === 0 && frames.length === 0) {
      if (deferred && isLive(() => passedLive) && pendingRequests.size === 0) reportState("running");
      return;
    }
    let out = [];
    let pendingMessages = [];
    let flushPending = () => {
      if (pendingMessages.length > 0) {
        out.push(...toLiveSdkEvents(pendingMessages));
        pendingMessages = [];
      }
    };
    let messageIndex = 0;
    let frameIndex = 0;
    while (messageIndex < messages.length || frameIndex < frames.length) {
      let messageEntry = messages[messageIndex];
      let frameEntry = frames[frameIndex];
      if (messageEntry && (!frameEntry || messageEntry.seq < frameEntry.seq)) {
        recentPostedUUIDs.add(messageEntry.message.uuid);
        backfilledUuids.add(messageEntry.message.uuid);
        anyMessageLive = true;
        pendingMessages.push(messageEntry.message);
        messageIndex++;
      } else if (frameEntry) {
        flushPending();
        let frame = frameEntry.frame;
        if ("uuid" in frame && typeof frame.uuid === "string") writtenSdkUuids.add(frame.uuid);
        out.push(
          Object.assign({}, frame, {
            session_id: sessionId,
          }),
        );
        frameIndex++;
      }
    }
    flushPending();
    if (isLive(() => passedLive) && pendingRequests.size === 0) reportState("running");
    logForDebugging(
      `[remote-bridge] Drained ${messages.length} queued message(s) and ${frames.length} SDK event(s) / control frame(s) after flush`,
    );
    transport.writeBatch(out);
  }
  function carryOverUndeliveredEvents(oldTransport) {
    let undelivered = oldTransport.takeUndeliveredEvents?.() ?? [];
    if (undelivered.length === 0) return;
    logForDebugging(
      `[remote-bridge] Carrying ${undelivered.length} undelivered client event(s) over to the rebuilt transport`,
    );
    logForDiagnosticsNoPII("info", "bridge_repl_v2_events_carried_over", {
      count: undelivered.length,
    });
    logEvent("tengu_bridge_repl_events_carried_over", {
      count: undelivered.length,
    });
    transport.adoptUndeliveredEvents?.(undelivered);
  }
  function writeOrQueueFrame(event, label) {
    let canHold = event.type !== "result" && transcriptReleasing && !recoveryInFlight;
    let [redacted] = accountMemoryRedactor.redact([event], "events", "live");
    if (redacted === undefined) return;
    if (
      !canHold &&
      frameFlushGate.enqueue({
        seq: frameSeq++,
        frame: redacted,
      })
    ) {
      logForDebugging(`[remote-bridge] Queued ${label} during flush`);
      return;
    }
    transport.write(redacted);
    logForDebugging(`[remote-bridge] Sent ${label}`);
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
    let last = eligible.findLast((message) => !isAttachmentOrConsentFallback(message));
    if (
      isLive(() => last !== undefined && isRealUserTurn(last) && !isInterruptionMessage(last)) &&
      pendingRequests.size === 0
    )
      reportState("running");
    logForDebugging(`[remote-bridge] Flushing ${events.length} history events`);
    await transport.writeBatch(events);
  }
  let historyFlushStarted = false;
  let transcriptReleasing = false;
  let anyMessageLive = false;
  let deferralReported = false;
  let deferralCleared = false;
  function reportTranscriptDeferred(transcriptUploadDeferred, onCleared) {
    let currentTransport = transport;
    let droppedBefore = currentTransport.droppedWorkerStatePatchCount?.() ?? 0;
    currentTransport.reportInternalMetadata?.({
      transcript_upload_deferred: transcriptUploadDeferred,
    });
    currentTransport.flushWorkerState?.().then((flushed) => {
      if (flushed && (currentTransport.droppedWorkerStatePatchCount?.() ?? 0) === droppedBefore) onCleared();
    });
  }
  let deferredAt;
  function flushHistory(msgs) {
    if (historyFlushStarted) return;
    historyFlushStarted = true;
    if (transcriptMirrorMode === "deferred") {
      transport.reportMetadata({
        transcript_mirror: "deferred",
      });
      noteTranscriptDeferred();
      return;
    }
    if (!onConnectNeedsRecord) return;
    let historyUnreadable = msgs === undefined || msgs.readFailed === true;
    let transcriptUploadDeferred_2 = historyUnreadable
      ? undefined
      : msgs.internal?.transcript_upload_deferred;
    if (
      isBackfillOriginScope(transcriptUploadDeferred_2) &&
      (noHistoryBackfill || remoteControlOrigin === undefined)
    ) {
      if (!ownerChanged)
        transport.reportMetadata({
          transcript_mirror: "live",
        });
      deferralCleared = true;
      reportTranscriptDeferred(null, () => {
        deferralCleared = false;
      });
    } else if (isBackfillOriginScope(transcriptUploadDeferred_2)) {
      transcriptUploadDeferred = transcriptUploadDeferred_2;
      transcriptMirrorMode = "deferred";
      noteTranscriptDeferred();
      if (anyMessageLive) releaseReason = "rows_already_live";
      else if (!isBackfillScopeAllowedForOrigin(backfillConfig().scope, transcriptUploadDeferred))
        releaseReason = "flag_off";
    } else if (
      (historyUnreadable ||
        (transcriptUploadDeferred_2 !== undefined && transcriptUploadDeferred_2 !== null)) &&
      isBackfillScopeAllowedForOrigin(backfillConfig().scope, remoteControlOrigin)
    ) {
      transcriptMirrorMode = "deferred";
      releaseReason = "marker_unreadable";
    }
  }
  let releaseReason;
  function reportReleaseReason() {
    if (releaseReason === undefined) return;
    let reason = releaseReason;
    releaseReason = undefined;
    releaseTranscript(reason);
  }
  function noteTranscriptDeferred() {
    deferredAt = Date.now();
    logForDebugging("[remote-bridge] Transcript upload deferred until a client opens this session");
    logForDiagnosticsNoPII("info", "bridge_repl_transcript_deferred", {
      reattach: isReattach,
    });
    logEvent("tengu_bridge_transcript_deferral", {
      phase: fromEnum("deferred"),
      reattach: isReattach,
      hold_ms: noSubscriberHoldMs(),
    });
  }
  let clientInitHandled = false;
  function clientInitializeHandler() {
    if (transcriptMirrorMode !== "deferred" || clientInitHandled) {
      onClientInitialize?.();
      return;
    }
    clientInitHandled = true;
    let subscribersReported = awaitSubscribersReported();
    queueMicrotask(() => {
      releaseTranscript("client_open", subscribersReported);
      try {
        onClientInitialize?.();
      } catch (error) {
        logForDebugging(
          `[remote-bridge] onClientInitialize failed after transcript release: ${errorMessage(error)}`,
        );
      }
    });
  }
  function recheckBackfillFlag() {
    if (
      transcriptMirrorMode === "deferred" &&
      !isBackfillScopeAllowedForOrigin(backfillConfig().scope, transcriptUploadDeferred)
    )
      releaseTranscript("flag_off");
  }
  function releaseTranscript(reason, waitFor = Promise.resolve()) {
    if (transcriptRelease) return transcriptRelease;
    if (stopped || transcriptMirrorMode !== "deferred") return Promise.resolve();
    if (!ownerChanged)
      transport.reportMetadata({
        ...deferredMetadata,
        transcript_mirror: "live",
      });
    deferredMetadata = {};
    transcriptMirrorMode = "live";
    historyFlushed = true;
    let hadPendingAction = pendingRequests.size > 0;
    logForDebugging(`[remote-bridge] Releasing deferred transcript (${reason})`);
    transcriptReleasing = true;
    messageFlushGate.start();
    frameFlushGate.start();
    resolved = onTransportPersistenceReady ? makePersistenceWaiter() : Promise.resolve();
    let releasedTransport = transport;
    transcriptRelease = waitFor
      .then(() => backfillTranscript(reason, hadPendingAction))
      .catch((error) =>
        logForDebugging(`[remote-bridge] Transcript back-fill failed: ${errorMessage(error)}`, {
          level: "error",
        }),
      )
      .finally(() => {
        transcriptReleasing = false;
        if (transport !== releasedTransport || stopped || ownerChanged || !historyFlushStarted) return;
        if (recoveryInFlight) {
          drainAfterRecoveryPending = true;
          return;
        }
        drainFlushGate();
        installPersistence();
      });
    return transcriptRelease;
  }
  let persistenceOwner;
  let resolved = Promise.resolve();
  let persistenceWaiters = [];
  function makePersistenceWaiter() {
    return new Promise((resolve) => {
      persistenceWaiters.push(resolve);
    });
  }
  let persistenceBehind = false;
  let persistenceCatchUp;
  function runCatchUp() {
    return Promise.resolve()
      .then(() => persistenceCatchUp?.runNow())
      .catch(logError);
  }
  function teardownPersistence() {
    if (persistenceOwner !== undefined) {
      persistenceBehind = true;
      resolved = makePersistenceWaiter();
    }
    onTransportPersistenceTeardown?.();
  }
  function installPersistence() {
    if (!onTransportPersistenceReady || persistenceOwner === transport) return;
    let internalEventWriter = transport.getInternalEventWriter?.();
    let historyWriter =
      internalEventWriter && accountMemoryRedactor.wrapInternalEventWriter(internalEventWriter);
    let liveWriter =
      internalEventWriter && accountMemoryRedactor.wrapInternalEventWriter(internalEventWriter, "live");
    let pickWriter =
      historyWriter &&
      liveWriter &&
      ((session, message, options) =>
        (typeof message.uuid === "string" && liveOnlyUuids.has(message.uuid) ? liveWriter : historyWriter)(
          session,
          message,
          options,
        ));
    let internalEventReaders = transport.getInternalEventReaders?.();
    if (historyWriter && internalEventReaders) {
      let catchUpOnInstall = !isReattach && persistenceOwner === undefined;
      let installedTransport = transport;
      persistenceOwner = installedTransport;
      persistenceBehind = true;
      resolved = makePersistenceWaiter();
      persistenceCatchUp = onTransportPersistenceReady(
        historyWriter,
        internalEventReaders,
        sessionId,
        catchUpOnInstall,
        (caughtUp) => {
          if (caughtUp && persistenceOwner === installedTransport) {
            persistenceBehind = false;
            for (let resolve of persistenceWaiters.splice(0)) resolve();
          }
        },
        accountMemoryRedactor.note,
        pickWriter,
      );
    }
  }
  function awaitSubscribersReported() {
    let currentTransport = transport;
    if (!currentTransport.setSubscribersReportedListener) return Promise.resolve();
    let promise = new Promise((resolve) => {
      currentTransport.setSubscribersReportedListener?.((reported) => {
        if (reported) resolve();
      });
    });
    return Promise.race([
      promise,
      sleep(SUBSCRIBERS_REPORTED_TIMEOUT_MS, undefined, {
        unref: true,
      }),
    ]).finally(() => currentTransport.setSubscribersReportedListener?.(undefined));
  }
  async function backfillTranscript(reason, hadPendingAction) {
    if (stopped) return;
    let messages = shouldDropAfterOwnerChange("transcript backfill")
      ? undefined
      : getBackfillMessages?.(sessionId);
    accountMemoryRedactor.note(messages ?? []);
    let queuedUuids = new Set(messageFlushGate.pending.map((entry) => entry.message.uuid));
    let eligible = (messages ?? []).filter(
      (m) => isEligibleBridgeMessage(m) && !backfilledUuids.has(m.uuid) && !queuedUuids.has(m.uuid),
    );
    let selected = sliceTailKeepingGroups(eligible, backfillConfig().backfillMessages);
    logForDebugging(
      `[remote-bridge] Back-filling ${selected.length} of ${eligible.length} eligible message(s)${messages === undefined ? " (history withheld by host)" : ""}`,
    );
    logForDiagnosticsNoPII("info", "bridge_repl_transcript_released", {
      reason,
      backfilled: selected.length,
      eligible: eligible.length,
      withheld: messages === undefined,
    });
    logEvent("tengu_bridge_transcript_deferral", {
      phase: fromEnum("released"),
      reason: fromEnum(reason),
      backfilled: selected.length,
      eligible: eligible.length,
      history_withheld: messages === undefined,
      deferred_ms: deferredAt === undefined ? undefined : Date.now() - deferredAt,
      hold_ms: noSubscriberHoldMs(),
    });
    let events = toRedactedSdkEvents(selected).map((event) => ({
      ...event,
      session_id: sessionId,
      historical: true,
    }));
    for (let message of eligible) {
      recentPostedUUIDs.add(message.uuid);
      initialMessageUUIDs.add(message.uuid);
    }
    for (let message of selected) backfilledUuids.add(message.uuid);
    let last = eligible.findLast((message) => !isAttachmentOrConsentFallback(message));
    let turnWillRun =
      hadPendingAction ||
      pendingRequests.size > 0 ||
      isLive(() => last !== undefined && isRealUserTurn(last) && !isInterruptionMessage(last));
    if (reason !== "client_prompt" && !turnWillRun && events.length > 0)
      events.push(
        Object.assign(buildBridgeResultMessage(sessionId), {
          historical: true,
        }),
      );
    let droppedBefore = transport.droppedDurableBatchCount?.() ?? 0;
    let writingTransport = transport;
    for (let index = 0; index < events.length; index += BACKFILL_BATCH_SIZE) {
      if (stopped || ownerChanged) return;
      if (transport !== writingTransport) {
        await transport.writeBatch(events.slice(index));
        break;
      }
      await transport.writeBatch(events.slice(index, index + BACKFILL_BATCH_SIZE));
      if (index + BACKFILL_BATCH_SIZE < events.length)
        await Promise.race([
          transport.flush(),
          sleep(BACKFILL_BATCH_FLUSH_TIMEOUT_MS, undefined, {
            unref: true,
          }),
        ]);
    }
    let finalTransport = transport;
    finalTransport.flush().then(() => {
      if ((finalTransport.droppedDurableBatchCount?.() ?? 0) > droppedBefore) {
        logForDiagnosticsNoPII("warn", "bridge_repl_transcript_backfill_dropped");
        logEvent("tengu_bridge_transcript_deferral", {
          phase: fromEnum("backfill_dropped"),
          reason: fromEnum(reason),
          hold_ms: noSubscriberHoldMs(),
        });
      }
      if (stopped || ownerChanged) return;
      deferralCleared = true;
      reportTranscriptDeferred(null, () => {
        deferralCleared = false;
      });
    });
  }
  let teleported = keepSessionOnTeardown === true;
  let reason;
  function teardown(options) {
    if (options?.skipArchive) teleported = true;
    if (options?.reason) reason = options.reason;
    if (teardownPromise) return teardownPromise;
    stopped = true;
    teardownPromise = teardown_2();
    return teardownPromise;
  }
  async function teardown_2() {
    latchSupersession("teardown");
    if (transcriptMirrorMode === "deferred")
      logEvent("tengu_bridge_transcript_deferral", {
        phase: fromEnum("exited_unopened"),
        deferred_ms: deferredAt === undefined ? undefined : Date.now() - deferredAt,
        hold_ms: noSubscriberHoldMs(),
      });
    let pendingCode = pendingAuthCode ?? pendingPresenceSad;
    if (pendingCode !== undefined) {
      if (!isTeleportedSession(sessionId)) {
        let hostDeclined = pendingAuthCode === undefined ? staleLauncherCode() : undefined;
        if (hostDeclined !== undefined && presenceLogged && isBridgeHostDeclinedEndEnabled())
          notePresenceSad(hostDeclined);
        else notePresenceBad(pendingCode);
      }
      pendingAuthCode = undefined;
      pendingPresenceSad = undefined;
      authEndCode = undefined;
    } else if (!episodeDead && pendingClose?.code === 403 && !isTeleportedSession(sessionId))
      noteNonOriginClose(pendingClose.detail);
    else if (
      !episodeDead &&
      ((recoveryAttempts > 0 && (recoverTimer !== undefined || recoveryInFlight)) ||
        (pendingClose !== undefined && pendingClose.code !== 4090)) &&
      !isTeleportedSession(sessionId)
    )
      notePresenceBad("recovery_abandoned_at_teardown");
    stopGitWatcher?.();
    unsubscribeInteraction();
    unsubscribeGrowthBook();
    releaseReadReceiptOwnership(readReceiptOwner);
    unsubscribeOwnerPin?.();
    unsubscribeOwnerPin = undefined;
    teardownPersistence();
    relinquishInjectedMcp();
    shutdownStarted = true;
    stopLivePreview();
    refresh.cancelAll();
    clearTimeout(connectTimeoutTimer);
    clearRecoverTimer();
    dropPendingWrites();
    transport.writeBatch(
      reason !== undefined
        ? [buildWorkerShuttingDownMessage(sessionId, reason), buildBridgeResultMessage(sessionId)]
        : [buildBridgeResultMessage(sessionId)],
    );
    reportState("idle");
    if (teleported || (remintLoopActive && reason !== "remote_control_disabled")) {
      let skipReason = keepSessionOnTeardown
        ? "skipped_host_owned"
        : teleported
          ? "skipped_teleport"
          : "skipped_remint_loop";
      let preflush;
      if (mayHoldUploads()) preflush = await preflushHold("skip_archive_flush_timeout");
      else if (reason !== undefined) await flushWithTimeout();
      let token = backlogAtClose();
      transport.close();
      logEvent("tengu_bridge_repl_teardown", {
        v2: true,
        archive_status: fromEnum(skipReason),
        archive_ok: false,
        ...preflush,
        ...token,
      });
      await transport.flushGoodbye();
      logForDebugging(`[remote-bridge] Teardown complete (skipArchive): session=${sessionId}`);
      logForDiagnosticsNoPII("info", "bridge_repl_v2_teardown");
      unregisterCleanup();
      return;
    }
    let teardownArchiveTimeoutMs = cfg.teardown_archive_timeout_ms;
    let now = Date.now();
    let deadReasonForArchive = deadReason();
    let preflushResult;
    let archiveStartAt = now;
    let archiveBudgetMs = teardownArchiveTimeoutMs;
    if (mayHoldUploads() && deadReasonForArchive === undefined) {
      let cleanupDeadline = now + CLEANUP_TIMEOUT_MS - CLEANUP_FLUSH_RESERVE_MS;
      preflushResult = await preflushHold("exit_flush_timeout", now);
      archiveStartAt = now + preflushResult.hold_preflush_ms;
      archiveBudgetMs = Math.max(1, Math.min(teardownArchiveTimeoutMs, cleanupDeadline - archiveStartAt));
    }
    let archiveDeadline = archiveStartAt + archiveBudgetMs;
    let credential = deadReasonForArchive === undefined ? archiveCredential() : undefined;
    let token = credential?.token;
    let archiveResult = await archiveRemoteBridgeSession(
      sessionId,
      baseUrl,
      token,
      orgUUID,
      archiveBudgetMs,
      deadReasonForArchive,
      storageV5,
    );
    let remainingMs = archiveDeadline - Date.now();
    if (
      archiveResult === 401 &&
      credential?.source === "current" &&
      onAuth401 &&
      remainingMs >= ARCHIVE_AUTH_RETRY_MIN_REMAINING_MS
    )
      try {
        await Promise.race([onAuth401(token ?? ""), sleep(remainingMs)]);
        credential = archiveCredential();
        token = credential.token;
        archiveResult = await archiveRemoteBridgeSession(
          sessionId,
          baseUrl,
          token,
          orgUUID,
          Math.max(1, archiveDeadline - Date.now()),
          deadReasonForArchive,
          storageV5,
        );
      } catch (error) {
        logForDebugging(`[remote-bridge] Teardown 401 retry threw: ${errorMessage(error)}`, {
          level: "error",
        });
      }
    let archiveMs = Date.now() - archiveStartAt;
    if (reason !== undefined && preflushResult === undefined) await flushWithTimeout();
    let backlog = backlogAtClose();
    transport.close();
    let archiveStatus = archiveStatusCode(archiveResult, supersession);
    logEvent("tengu_bridge_repl_teardown", {
      v2: true,
      archive_status: fromEnum(archiveStatus),
      archive_credential: fromEnumOpt(credential?.source),
      archive_ok: typeof archiveResult === "number" && archiveResult < 400,
      archive_http_status:
        typeof archiveResult === "number"
          ? archiveResult
          : archiveResult === "untrusted_device"
            ? 403
            : undefined,
      archive_timeout: archiveResult === "timeout",
      archive_no_token: archiveResult === "no_token",
      ...preflushResult,
      archive_budget_ms: archiveBudgetMs,
      archive_ms: archiveMs,
      ...backlog,
    });
    await transport.flushGoodbye();
    logForDebugging(`[remote-bridge] Torn down (archive=${archiveResult})`);
    logForDiagnosticsNoPII("info", "bridge_repl_v2_teardown");
    unregisterCleanup();
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
  function shouldDropAfterOwnerChange(type) {
    if (!ownerChanged) return false;
    logForDebugging(`[remote-bridge] Dropping ${type} after owner change`);
    return true;
  }
  function startLivePreview(starter) {
    stopLivePreview();
    if (isTransportUnusable() || outboundOnly || workSecretCredentials) return "refused";
    if (credentialWasReplaced()) return "sign_in_changed";
    if (isSignInCheckStale("a_start")) {
      checkOwnerThenStart((ownerUnchanged) => starter.onSignInChecked(ownerUnchanged));
      return "checking_sign_in";
    }
    try {
      let baseUrl = apiBaseUrl;
      let tunnel = starter.start({
        sessionId,
        apiBaseUrl: baseUrl,
        accessToken: workerJwt,
      });
      if (tunnel !== null)
        livePreview = {
          tunnel,
          isRefusedBySession: starter.isRefusedBySession,
          dialedBase: baseUrl,
        };
    } catch (error) {
      logForDebugging(`[remote-bridge] live preview: the starter threw: ${errorMessage(error)}`, {
        level: "error",
      });
      logError(error);
    }
    return livePreview === null ? "refused" : "started";
  }
  async function checkOwnerThenStart(onSignInChecked) {
    let ownerUnchanged = false;
    try {
      ownerUnchanged =
        (await confirmOwnerChange("owner_changed_live_preview", {
          fresh: true,
        })) === "unchanged" && lastSignInCheckAt !== 0;
      if (ownerUnchanged) lastFreshCheckAt = Date.now();
    } catch (error) {
      logForDebugging(`[remote-bridge] live preview: the owner check failed: ${errorMessage(error)}`, {
        level: "error",
      });
      logError(error);
    } finally {
      try {
        onSignInChecked(ownerUnchanged);
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
  function livePreviewStopReason() {
    if (livePreview === null) return "refused";
    if (credentialWasReplaced()) return "sign_in_changed";
    if (livePreviewMustRestart("flag_refresh")) return "refused";
    if (!isOwnerPinned()) {
      let credentialNow = hasFixedCredential ? params.fixedCredentialNow?.() : undefined;
      switch (credentialNow) {
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
    return isSignInCheckStale("a_start") ? "sign_in_in_doubt" : null;
  }
  function checkSignInThen(onChecked) {
    checkOwnerThenStart(() => onChecked());
  }
  let bridgeHandle = {
    bridgeSessionId: sessionId,
    titleWriter: params.titleWriter,
    noHistoryBackfill: noHistoryBackfill || reattachFellBackToFresh,
    getJoinedProjectThread: undefined,
    requestInjectedMcpReassert,
    canAdoptInjectedMcp,
    detachForHandoff: () => {
      refresh.cancelAll();
      relinquishInjectedMcp();
      shutdownStarted = true;
      stopLivePreview();
    },
    sessionGroupingId: effectiveGroupingId,
    outboundOnly: outboundOnly ?? false,
    environmentId: "",
    sessionIngressUrl: bridgeCredentials.api_base_url,
    gitRepoUrl,
    ...(workSecretCredentials && {
      getWorkerBearerToken: () => (stopped ? null : workerJwt),
      getWorkerEpoch: () => workerEpoch_2,
    }),
    ...false,
    getLastSequenceNum: () => transport.getLastSequenceNum(),
    settleUploadsBeforeHandoff: () => {
      if (transcriptRelease !== undefined || transcriptMirrorMode === "deferred" || persistenceBehind) {
        let settleTask = async () => {
          let deadline = Date.now() + UPLOAD_BUDGET_MS;
          let waitBounded = async (promise, what, deadlineAt) => {
            let done = false;
            await Promise.race([
              promise.finally(() => {
                done = true;
              }),
              sleep(Math.max(0, deadlineAt - Date.now()), undefined, {
                unref: true,
              }),
            ]);
            if (!done)
              logForDiagnosticsNoPII("warn", "bridge_repl_handoff_wait_expired", {
                what,
              });
          };
          await waitBounded(
            persistenceOwner === transport ? runCatchUp() : resolved,
            "transcript_copy_catch_up",
            deadline - TEARDOWN_FLUSH_TIMEOUT_MS,
          );
          if (persistenceBehind) logForDiagnosticsNoPII("warn", "bridge_repl_handoff_transcript_copy_behind");
          await waitBounded(
            Promise.all([
              transport.flush({
                retryNow: true,
              }),
              transport.flushInternalEvents?.({
                retryNow: true,
              }),
            ]),
            "upload_lanes",
            deadline,
          );
        };
        return (transcriptRelease ?? releaseTranscript("handoff")).then(settleTask).then(
          () => {},
          () => {},
        );
      }
      return mayHoldUploads()
        ? flushWithTimeout(TEARDOWN_FLUSH_TIMEOUT_MS).then(
            () => {},
            () => {},
          )
        : Promise.resolve();
    },
    awaitUploadsForHandoff: (options) =>
      settleRemoteBridgeDelivery(
        {
          sessionKind: () => {
            if (transcriptRelease !== undefined || transcriptMirrorMode === "deferred") return "deferred";
            if (mayHoldUploads()) return "held";
            return onTransportPersistenceReady ? "live" : "no_transcript_copy";
          },
          release: () =>
            transcriptRelease ??
            (transcriptMirrorMode === "deferred" ? releaseTranscript("handoff") : Promise.resolve()),
          isSessionOver: () => stopped || ownerChanged,
          hasFailedForGood: () => failedTerminally,
          transport: () => transport,
          droppedBatches: (transport) =>
            (transport.droppedDurableBatchCount?.() ?? 0) +
            (transport.getInternalEventBacklog?.().droppedBatches ?? 0),
          isConnected: () => lastClosedTransport === transport && transport.isConnectedStatus(),
          transcriptCopy: onTransportPersistenceReady && {
            isInstalledOnCurrentTransport: () => persistenceOwner === transport,
            catchUp: () => resolved,
            wakeCatchUp: () => void runCatchUp(),
          },
          firstHistoryFlush: () => firstHistoryPromise,
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
          budgetMs: options?.budgetMs ?? UPLOAD_BUDGET_MS,
          signal: options?.signal,
          log: (message) => logForDebugging(message),
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
      return flushAll();
    },
    writeMessages(messages) {
      if (shouldDropAfterOwnerChange("writeMessages")) return;
      accountMemoryRedactor.note(messages, "live");
      for (let message of messages)
        if (!initialMessageUUIDs.has(message.uuid)) liveOnlyUuids.add(message.uuid);
      let filtered = messages.filter(
        (m) =>
          isEligibleBridgeMessage(m) && !initialMessageUUIDs.has(m.uuid) && !recentPostedUUIDs.has(m.uuid),
      );
      if (filtered.length === 0) return;
      if (!userMessageTitleSent)
        for (let message of filtered) {
          let text = deriveTitleFromHumanTurn(message);
          if (text !== undefined && onUserMessage?.(text, sessionId)) {
            userMessageTitleSent = true;
            break;
          }
        }
      let any = filtered.some(turnResultReported ? isPlainUserPrompt : isRealUserTurn);
      if (any) turnResultReported = false;
      if (!userMessageCallbackDone && any) {
        userMessageCallbackDone = true;
        markBridgePlaceholderUsed(sessionId, storageV5);
      }
      let toSend = filtered;
      if (transcriptMirrorMode === "deferred") {
        toSend = filtered.filter(hasUserMessagingToolUse);
        if (toSend.length === 0) {
          if (messageFlushGate.active) queuedAnyMessage ||= any;
          else if (isLive(() => any) && pendingRequests.size === 0) reportState("running");
          return;
        }
      }
      if (
        messageFlushGate.enqueue(
          ...toSend.map((message) => ({
            seq: frameSeq++,
            message,
          })),
        )
      ) {
        if (any) queuedAnyMessage = true;
        logForDebugging(`[remote-bridge] Queued ${toSend.length} message(s) during flush`);
        return;
      }
      for (let msg of toSend) {
        backfilledUuids.add(msg.uuid);
        recentPostedUUIDs.add(msg.uuid);
      }
      anyMessageLive = true;
      let liveSdkEvents = toLiveSdkEvents(toSend);
      if (isLive(() => any) && pendingRequests.size === 0) reportState("running");
      logForDebugging(`[remote-bridge] Sending ${toSend.length} message(s)`);
      transport.writeBatch(liveSdkEvents);
    },
    reportMetadata(metadata) {
      if (shouldDropAfterOwnerChange("reportMetadata")) return;
      if (transcriptMirrorMode === "deferred") {
        let { post_turn_summary: postTurnSummary, task_summary: taskSummary, recap, ...rest } = metadata;
        let deferredFields = {
          post_turn_summary: postTurnSummary,
          task_summary: taskSummary,
          recap,
        };
        for (let key of Object.keys(deferredFields))
          if (key in metadata) deferredMetadata[key] = deferredFields[key];
        let forward = rest;
        if ("post_turn_summary" in metadata)
          forward.post_turn_summary =
            typeof postTurnSummary === "object" &&
            postTurnSummary !== null &&
            "status_category" in postTurnSummary
              ? {
                  status_category: postTurnSummary.status_category,
                }
              : null;
        if (Object.keys(forward).length === 0) return;
        transport.reportMetadata(forward);
        return;
      }
      transport.reportMetadata(metadata);
    },
    reportInternalMetadata(metadata) {
      if (shouldDropAfterOwnerChange("reportInternalMetadata")) return false;
      return transport.reportInternalMetadata?.(metadata) ?? false;
    },
    workerEpoch: () => ({
      sessionId,
      epoch: transport.getEpoch(),
    }),
    refreshGitBranch() {
      refreshGitBranch?.();
    },
    async publishGitStateBeforeHandoff() {
      if (!publishGitStateBeforeHandoff) return;
      try {
        invalidateGitState?.();
        let published = await publishGitStateBeforeHandoff();
        if (published === undefined)
          logForDebugging("[remote-bridge] git state publish before handoff ran past its bound");
        else if (!published)
          logForDebugging("[remote-bridge] git state publish before handoff ended with the transport closed");
      } catch (error) {
        logForDebugging(`[remote-bridge] git state publish before handoff failed: ${errorMessage(error)}`, {
          level: "error",
        });
      }
    },
    writeSdkMessages(events) {
      if (shouldDropAfterOwnerChange("writeSdkMessages")) return;
      accountMemoryRedactor.note(events);
      let filtered = events.filter((event) => !event.uuid || !writtenSdkUuids.has(event.uuid));
      let eligible =
        transcriptMirrorMode === "deferred"
          ? filtered.filter((event) => !isTaskLifecycleMessage(event))
          : filtered;
      let redacted = accountMemoryRedactor.redact(eligible);
      if (redacted.length === 0) return;
      if (frameFlushGate.active) {
        let filtered = redacted.filter((event) => event.type !== "stream_event");
        let droppedStreamEvents = redacted.length - filtered.length;
        if (droppedStreamEvents > 0)
          logForDebugging(
            `[remote-bridge] Dropped ${droppedStreamEvents} stream_event frame(s) during flush`,
          );
        if (filtered.length > 0) {
          frameFlushGate.enqueue(
            ...filtered.map((frame) => ({
              seq: frameSeq++,
              frame,
            })),
          );
          logForDebugging(`[remote-bridge] Queued ${filtered.length} SDK event(s) during flush`);
          try {
            if (filtered.some(isSubagentStreamMessage)) {
              let evictedBefore = frameFlushGate.evictedCount > 0;
              frameFlushGate.evictOldest(
                (entry) => isSubagentStreamMessage(entry.frame),
                MAX_QUEUED_SUBAGENT_FRAMES,
              );
              if (!evictedBefore && frameFlushGate.evictedCount > 0)
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
      for (let msg of redacted) if (msg.uuid) writtenSdkUuids.add(msg.uuid);
      let events_2 = redacted.map((event) => ({
        ...event,
        session_id: sessionId,
      }));
      transport.writeBatch(events_2);
    },
    sendControlRequest(request) {
      rememberOutboundRequestId(request.request_id, {
        automated: !isPermissionPromptSubtype(request),
      });
      let request_2 = request.request;
      if (isAccountMemoryControlRequest(request_2, placeAccountMemoryTool)) {
        localOnlyMemoryRequests.add(request.request_id);
        logForDebugging(
          `[remote-bridge] Keeping an account memory prompt at the terminal (not sent to Remote Control): ${request.request_id}`,
        );
        return false;
      }
      if (request_2.subtype === "can_use_tool" || request_2.subtype === "request_user_dialog") {
        pendingRequests.delete(request.request_id);
        pendingRequests.set(request.request_id, {
          request,
        });
        notForwardedIds.delete(request.request_id);
      }
      if (
        request_2.subtype === "request_user_dialog" &&
        ((frameFlushGate.active && !transcriptReleasing) || recoveryInFlight)
      ) {
        notForwardedIds.add(request.request_id);
        logForDebugging(
          `[remote-bridge] Not forwarding request_user_dialog while writes are gated / transport recovering (local-only): ${request.request_id}`,
        );
        return false;
      }
      if (shouldDropAfterOwnerChange("control_request")) return false;
      let event = {
        ...request,
        session_id: sessionId,
      };
      if (request_2.subtype === "can_use_tool") {
        let details;
        if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_requires_action_details", false)) {
          let isShellTool =
            request_2.tool_name === BASH_TOOL_NAME || request_2.tool_name === POWERSHELL_TOOL_NAME;
          let summary;
          if (request_2.tool_name === ASKUSERQUESTION) {
            let questions = Array.isArray(request_2.input?.questions) ? request_2.input.questions : [];
            let firstQuestion = questions[0];
            let questionTitle = firstQuestion?.header || firstQuestion?.question;
            summary = {
              label: "Question",
              body: questionTitle
                ? questionTitle + (questions.length > 1 ? ` (+${questions.length - 1} more)` : "")
                : "Tap to answer",
            };
          } else if (request_2.tool_name === EXITPLANMODE)
            summary = {
              label: "Plan",
              body: "Plan ready for review",
            };
          else if (request_2.tool_kind === "mcp_skill")
            summary = {
              label: request_2.display_name ?? request_2.tool_name,
              body: "",
            };
          if (!summary && request_2.requires_user_interaction)
            summary = {
              label: request_2.display_name ?? request_2.tool_name,
              body: "",
            };
          let commandText =
            isShellTool && typeof request_2.input?.command === "string"
              ? redactSecretsInText(request_2.input.command)
              : undefined;
          let useHostField =
            isShellTool && (request_2.description === undefined || hasHostField(request_2.input));
          let description =
            isShellTool && typeof request_2.input?.description === "string"
              ? request_2.input.description
              : undefined;
          details = {
            tool_name: request_2.tool_name,
            display_tool_name: summary?.label ?? request_2.display_name ?? request_2.tool_name,
            action_description:
              summary?.body ??
              redactSecretsInText(
                (!useHostField && (request_2.description || description)) ||
                  (commandText && truncate(commandText, 120)) ||
                  "",
              ),
            raw_command: summary ? undefined : commandText,
            tool_use_id: request_2.tool_use_id,
            request_id: summary ? "" : request.request_id,
            ...(summary &&
              request.request_id && {
                suppressed_request_id: request.request_id,
              }),
            input: request_2.input,
          };
        }
        if (details)
          pendingRequests.set(request.request_id, {
            request,
            details,
          });
        turnResultReported = false;
        reportState("requires_action", details);
      } else if (request_2.subtype === "request_user_dialog") {
        let details;
        if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_requires_action_details", false))
          details = dialogPermissionRequest(
            request_2.dialog_kind,
            request_2.payload,
            request.request_id,
            request_2.tool_use_id,
          );
        if (details)
          pendingRequests.set(request.request_id, {
            request,
            details,
          });
        turnResultReported = false;
        reportState("requires_action", details);
      }
      writeOrQueueFrame(event, `control_request request_id=${request.request_id}`);
      return true;
    },
    sendControlResponse(response, options) {
      if (localOnlyMemoryRequests.has(response.response.request_id)) return;
      if (!options?.skipStateReport) resolvePendingAction(response.response.request_id, true);
      if (shouldDropAfterOwnerChange("control_response")) return;
      let event = {
        ...response,
        session_id: sessionId,
      };
      if (!options?.skipStateReport && !turnResultReported) reportPendingState();
      writeOrQueueFrame(event, "control_response");
    },
    sendControlCancelRequest(requestId) {
      if (localOnlyMemoryRequests.delete(requestId)) return;
      if (notForwardedIds.delete(requestId)) {
        pendingRequests.delete(requestId);
        logForDebugging(
          `[remote-bridge] Local-only retract of a declined dialog forward request_id=${requestId}`,
        );
        return;
      }
      resolvePendingAction(requestId, true);
      if (shouldDropAfterOwnerChange("control_cancel_request")) return;
      let event = {
        type: "control_cancel_request",
        request_id: requestId,
        session_id: sessionId,
      };
      if (!turnResultReported) reportPendingState();
      writeOrQueueFrame(event, `control_cancel_request request_id=${requestId}`);
    },
    sendResult(result) {
      queuedAnyMessage = false;
      turnResultReported = true;
      if (shouldDropAfterOwnerChange("result")) return;
      settleHeldReadReceipts();
      reportState("idle");
      if (transcriptMirrorMode === "deferred" && !backfillConfig().eagerResult) {
        logForDebugging("[remote-bridge] Withheld result (transcript deferred)");
        return;
      }
      let bridgeResultMessage = buildBridgeResultMessage(
        sessionId,
        transcriptMirrorMode === "deferred" && result?.outcome !== undefined
          ? {
              ...result,
              outcome: {
                ...result.outcome,
                result: undefined,
              },
            }
          : result,
      );
      writeOrQueueFrame(
        bridgeResultMessage,
        `result ${bridgeResultMessage.subtype} is_error=${bridgeResultMessage.is_error} num_turns=${bridgeResultMessage.num_turns}${bridgeResultMessage.user_message_uuid ? ` user_message_uuid=${bridgeResultMessage.user_message_uuid}` : ""}`,
      );
    },
    stampReply({ assistantUuid, userMessageUuid }) {
      replyStamps.set(assistantUuid, userMessageUuid);
      if (replyStamps.size > maxReplyStamps) {
        let oldestUuid = replyStamps.keys().next().value;
        if (oldestUuid !== undefined) replyStamps.delete(oldestUuid);
      }
    },
    async subscribePR(repo, prNumber, agentId) {
      if (ownerChanged)
        return {
          ok: false,
          reason: "owner_changed",
        };
      let key = `${repo}#${prNumber}`;
      let previous = prSubscriptions.get(key);
      if (agentId)
        prSubscriptions.set(key, {
          agentId,
          repo,
          prNumber,
        });
      let outcome = await subscribeGithubPullRequest("subscribe", {
        sessionId,
        repo,
        prNumber,
        baseUrl,
        getAccessToken,
        getTrustedDeviceToken,
        onUnauthorized: recoverHostSessionsBearer,
      });
      if (!outcome.ok && agentId)
        if (previous) prSubscriptions.set(key, previous);
        else prSubscriptions.delete(key);
      return outcome;
    },
    async unsubscribePR(repo, prNumber) {
      if (ownerChanged)
        return {
          ok: false,
          reason: "owner_changed",
        };
      let outcome = await subscribeGithubPullRequest("unsubscribe", {
        sessionId,
        repo,
        prNumber,
        baseUrl,
        getAccessToken,
        getTrustedDeviceToken,
        onUnauthorized: recoverHostSessionsBearer,
      });
      if (outcome.ok) prSubscriptions.delete(`${repo}#${prNumber}`);
      return outcome;
    },
    async recordCreatedPR(prInfo, timeoutMs) {
      if (stopped)
        return {
          ok: false,
          skipped: "no_bridge",
        };
      if (ownerChanged)
        return {
          ok: false,
          skipped: "owner_changed",
        };
      return buildJsonHeaders({
        sessionUrl: buildCCRv2SdkUrl(apiBaseUrl, sessionId),
        workerToken: workerJwt,
        ...prInfo,
        timeoutMs,
      });
    },
    async fetchInboxMessage(fileId) {
      let fail = (reason) => {
        logFeatureBad("bridge_inbox_fetch", reason);
        return {
          ok: false,
          reason,
        };
      };
      if (stopped) return fail("no_bridge");
      if (ownerChanged) return fail("owner_changed");
      {
        let checkOwner = async (options) => {
          if (stopped) return "no_bridge";
          if (ownerChanged) return "owner_changed";
          if (options?.fresh ? isOwnerPinned() : ownerLooksChanged()) {
            let verdict = await confirmOwnerChange("owner_changed_inbox", options);
            if (verdict === "changed") return "owner_changed";
            if (verdict === "inconclusive") return stopped ? "no_bridge" : "owner_unverified";
          }
          return stopped ? "no_bridge" : undefined;
        };
        let blocked = await checkOwner();
        if (blocked) return fail(blocked);
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
          let blocked = await checkOwner({
            fresh: true,
          });
          if (blocked) return fail(blocked);
        }
        let { fetchSessionInboxMessage } = require("./sessionInbox.js");
        return fetchSessionInboxMessage({
          sessionId,
          fileId,
          baseUrl,
          getAccessToken: () => accessToken,
          getTrustedDeviceToken: () => Promise.resolve(trustedDeviceToken),
        });
      }
      return fail("feature_disabled");
    },
    getPRWebhookTargets() {
      return [...prSubscriptions.values()];
    },
    teardown,
    neverArchive: keepSessionOnTeardown,
    async archive() {
      if (keepSessionOnTeardown) return;
      let deadReasonAtArchive = deadReason();
      await archiveRemoteBridgeSession(
        sessionId,
        baseUrl,
        deadReasonAtArchive === undefined ? archiveCredential().token : undefined,
        orgUUID,
        cfg.teardown_archive_timeout_ms,
        deadReasonAtArchive,
        storageV5,
      );
    },
    [Symbol.asyncDispose]() {
      return bridgeHandle.teardown({
        reason: "host_exit",
      });
    },
  };
  if (keepSessionOnTeardown && !isReattach) removeBridgePlaceholdersFor(sessionId, storageV5);
  let unregisterCleanup = registerCleanup(bridgeHandle);
  return bridgeHandle;
}
//@ chunk-4cm44bmp.js:95205-95591 fingerprint (2.1.88 match: withRetry, 0.782)
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
  let didLoseRefresh = false;
  let result = await withRetry(
    async () => {
      if (refreshed) didLoseRefresh = true;
      let accessToken = authOptions.getAccessToken();
      let didCall = false;
      let callResult = await call(accessToken, () => {
        didCall = true;
      });
      let isRejected = isCredentialsRejection(callResult);
      if (
        (callResult === null || isRejected) &&
        didCall &&
        authOptions.onAuth401 &&
        !refreshed &&
        !authOptions.recoveryAttemptedTokens.has(accessToken)
      ) {
        authOptions.recoveryAttemptedTokens.add(accessToken);
        let didRefresh = false;
        try {
          didRefresh = await authOptions.onAuth401(accessToken);
        } catch (error) {
          logForDebugging(`[remote-bridge] ${label} 401 \u2014 OAuth refresh threw: ${errorMessage(error)}`, {
            level: "error",
          });
        }
        refreshed = didRefresh;
        logForDebugging(
          `[remote-bridge] ${label} 401 \u2014 OAuth ${didRefresh ? "refreshed; retrying with the fresh token" : "refresh unavailable"}`,
        );
        logForDiagnosticsNoPII("info", "bridge_repl_v2_init_401_refresh", {
          refreshed: didRefresh,
        });
        if (refreshed && isRejected) return null;
      }
      return callResult;
    },
    label,
    cfg,
  );
  if (result === null && refreshed && !didLoseRefresh) {
    logForDebugging(
      `[remote-bridge] ${label} refreshed on the final attempt; one extra try with the fresh token`,
    );
    return call(authOptions.getAccessToken(), () => {});
  }
  return result;
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
function failureSeverity_2(failure) {
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
function transportClosed403Code(details) {
  switch (details?.rejectSource) {
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
//@ chunk-4cm44bmp.js:97520-98051 callgraph-fingerprint (2.1.88 match: fetchRemoteCredentials, 0.201)
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
    let recoveryResult = await withUntrustedDeviceRecovery(
      deviceToken,
      (deviceToken) =>
        attachBridgeWorker(sessionId, baseUrl, accessToken, timeoutMs, deviceToken, onAuth401, epochGuard),
      credentialsStore,
    );
    if (recoveryResult !== undefined && recoveryResult !== null)
      result =
        isCredentialsFailure(recoveryResult) && recoveryResult.reason === "untrusted_device"
          ? {
              ...recoveryResult,
              justEnrolled: true,
            }
          : recoveryResult;
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
function isNotArchived(outcome) {
  return outcome !== "session_archived";
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
export { describeCredentialFailure, initEnvLessBridgeCore, postSessionAction };
