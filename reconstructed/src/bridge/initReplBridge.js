/**
 * bridge/initReplBridge.ts
 *
 * REPL 侧 Remote Control 入口：门控（开关/OAuth/组织策略/信任设备/最低版本）、重连目标与属主校验（环境交接、恢复指针）、会话标题派生，然后调用 initEnvLessBridgeCore
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/initReplBridge.ts
 * pieces: chunk-cg2r2hy6.js (3)
 * attribution: callgraph-witnessed 1, placement 2
 */
import { setCseShimGate, sessionIdBody, toInfraSessionId } from "./sessionIdCompat.js";
import {
  isCseShimEnabled,
  isBridgeStateFramesEnabled,
  isBridgeRestoredMatchMintEnabled,
  ensurePolicyLimitsLoadedForDiagnostic,
  isBridgeResumeRespectsLocalOwnerEnabled,
} from "./bridgeGates.js";
import { setBridgeStateFramesGate } from "./bridgeMessaging.js";
import { setAttestationFilterPolicy } from "./deviceAttestation.js";
import {
  getAttestationFilterPolicy,
  preflightTrustedDeviceBlocking,
  PROACTIVE_ENROLLMENT_DISABLED_MESSAGE,
} from "./trustedDevice.js";
import {
  pinSessionId,
  getMaterializedSessionFile,
  isOwnTranscriptFile,
  isSessionHistorySuppressed,
  isPrecautionarySuppressionHeldFor,
  isSessionHistorySuppressedFor,
  isRemoteEgressSuppressedFor,
  isBridgeBindingForeign,
  holdPrecautionarySuppressionFor,
  claimPrecautionHoldForObservedCause,
  writeHistorySuppression,
  isScanUncertaintyHoldFor,
  listSubagentIdsFromDisk,
  setInternalEventWriter,
  setInternalEventReader,
  clearInternalEventWriter,
  getCurrentSessionBridge,
  readHistorySuppressionFromDisk,
  holdSessionHistorySuppressionFor,
  releaseScanUncertaintyHoldFor,
  markPrecautionClearResilientFor,
  markScanUncertaintyHoldFor,
  getCurrentSessionTitle,
  getCurrentSessionAiTitle,
  getBridgeBoundConversationSid,
  saveCustomTitle,
  getDerivedTranscriptPathForSession,
  clearBridgeSession,
  getCurrentSessionAgentColor,
} from "../utils/sessionStorage.js";
import { getSessionId } from "../bootstrap/state.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../utils/debug.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { logError } from "../utils/log.js";
import {
  createPersistenceCatchUp,
  runPersistenceBackfill,
  resolveOwnerCheckIdentity,
  createBearerOwnerVouch,
  findLiveBridgeSessionHolder,
  createTokenAbsenceClassifier,
} from "./persistenceBackfill.js";
import { logForDiagnosticsNoPII } from "../utils/diagLogs.js";
import { errorMessage, AbortError } from "../utils/errors.js";
import { env } from "../utils/env.js";
import { readFreshOauthAccountFromDisk, getGlobalConfig, saveGlobalConfig } from "../utils/config.js";
import {
  sameOwnerAccount,
  readFreshOAuthCredentialSnapshot,
  getStoredOAuthTokenExpiresAt,
  checkAndRefreshOAuthTokenIfNeeded,
  recoverCloudSessionsBearer,
  readFreshOAuthAccessToken,
} from "../utils/auth.js";
import { sanitizeStringList } from "./controlRequests.js";
import {
  isBridgeEnabledBlocking,
  getBridgeBlockedCode,
  getBridgeDisabledDiagnosis,
  describeRemoteControlPolicyDenial,
} from "./bridgeEntitlement.js";
import { logBridgeSkip } from "./debugUtils.js";
import {
  FLAG_UNAVAILABLE_CAUSES,
  refreshWorkSecret,
  transcriptForwarder,
  WORK_SECRET_REFRESH_WINDOW_MS,
} from "./workSecretRefresh.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import {
  getBridgeAccessTokenAsync,
  getBridgeAccessToken,
  getBridgeTokenOverride,
  getBridgeBaseUrl,
  getBridgeSessionNamePrefix,
  getBridgeSessionsAccessToken,
  getBridgeSessionsAccessTokenAsync,
} from "./bridgeConfig.js";
import { BRIDGE_LOGIN_HINT, BRIDGE_ACCOUNT_UNVERIFIED_HINT } from "./types.js";
import { waitForPolicyLimitsToLoad } from "../services/policyLimits/PolicyLimitsClient.js";
import {
  policyDenyKind,
  policyDeniedHint,
  isPolicyAllowed,
} from "../services/policyLimits/policyEvidence.js";
import { policyBlockedMessage } from "../services/policyLimits/policyMessages.js";
import { nullStub3 } from "../utils/externalBuildStubs.js";
import { randomWordSlug } from "../utils/words.js";
import { isHumanTurn_3 } from "../utils/messagePredicates.js";
import { isSyntheticMessage, getContentText } from "../utils/messages.js";
import { createTitleWriteCoalescer } from "./titleWrite.js";
import { setSelfBridgeTitle, retireBridgeHandle } from "./replBridgeHandle.js";
import { isTeleportedSession, getBridgeSession, updateBridgeSessionColorTag } from "./createSession.js";
import {
  requestAndPickSessionTitle,
  saveSessionAgentName,
  extractConversationText,
} from "../utils/sessionTitle.js";
import { sanitizeSessionTitle } from "../utils/stringUtils.js";
import { isTeammate } from "../utils/teammate.js";
import { messagesSinceCompactBoundary } from "../services/projects/threadRows.js";
import { getOrganizationUUID } from "../services/oauth/client.js";
import { resolveBridgeOwnerPinOnly } from "./ownerPin.js";
import { checkEnvLessBridgeMinVersion } from "./envLessBridgeConfig.js";
import { snapshotGitEvidenceForBridge } from "../utils/git.js";
import { createAbortController } from "../utils/abortController.js";
import { machineLaneVersionRefusal, isMachineLaneWork } from "./bridgeEnabled.js";
import { readBridgeSessionTags } from "./sessionTags.js";
import { sleep } from "../utils/sleep.js";
import { getEmptyToolPermissionContext } from "../Tool.js";
import { limitConcurrency } from "../utils/concurrencyLimit.js";
import { readFileForRemote } from "../services/remoteTools/remoteFileRead.js";
import { initEnvLessBridgeCore } from "./remoteBridgeCore.js";
import { classifyFailedOAuthRefresh } from "./oauthRefreshFailure.js";
import { wasLauncherHostLoginToken } from "../utils/auth/launcherHostLogin.js";
import { createMemoryServerVerifier } from "../services/mcp/memoryServerVerification.js";
import { hasRecordedTextForHost } from "../utils/transcriptWithholding.js";
import { startClientPresencePulse } from "./clientPresence.js";
import { recoverHostSessionsBearer } from "../utils/hostSessionsBearer.js";
import { isKairosPushEnabled } from "../tools/PushNotificationTool/prompt.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { hydrateNotificationPreferences } from "../services/notifications/notificationPreferences.js";
import { AGENT_COLOR_NAMES } from "../tools/AgentTool/agentColorManager.js";
import { generateFileSuggestions, globalFileIndexCache } from "../hooks/fileSuggestions.js";
import { buildWorkspaceDiffResponse } from "./workspaceDiff.js";
import { runSideQuestionWithProgress } from "../utils/sideQuestionProgress.js";
import { wrapTeardownWithPresence } from "../ink/reconciler.js";
import { unwrapReminderText } from "../utils/systemReminder.js";

//@ chunk-cg2r2hy6.js:27697-48603 callgraph-witnessed = initReplBridge (0.22)
/**
 * 启用 REPL Remote Control：读 CLAUDE_BRIDGE_REATTACH_* 环境交接或恢复指针确定重连目标，校验当前登录是否为记录的属主（不一致则否决并抑制历史回填）；
 * 依次检查桥开关、OAuth、allow_remote_control/allow_remote_sessions 策略、本地另一进程是否持有该会话、OAuth 死令牌退避、trusted device、组织 UUID、最低版本；
 * 派生标题（显式名/当前会话标题/首条用户消息/AI 生成），再把全部回调传给 initEnvLessBridgeCore，并包装 teardown/detachForHandoff。返回桥句柄或 null。
 */
async function initReplBridge(options) {
  let {
    getToolPermissionContext,
    host,
    workspaceDiffComputeBudget,
    getTools,
    onInboundMessage,
    onQueuedNotification,
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
    onSetColor,
    onMcpAuthenticate,
    onMcpOauthCallbackUrl,
    onMcpReconnect,
    onForkConversation,
    onBridgeInjectedMcp,
    onProjectsBindingHint,
    onGetContextUsage,
    answerSharedControlRequest,
    onStateChange,
    reportGateRefusalReason,
    initialMessages,
    getMessages,
    getBackfillMessages,
    remoteControlOrigin,
    isTurnActive,
    initialName,
    skipAutoTitle,
    outboundOnly,
    nameSourceForCreate,
    tags,
    sessionGroupingId,
    reattachSessionId,
    reattachSequenceNum,
    reattachOrFail,
    reviveInitiated,
    neverArchive,
    recordAtEnable,
    recordWriterHonorsServerVouch = false,
    onReattachPointerDead,
    localHolderGuard,
    suppressHistoryBackfill,
    onHistoryBackfillSuppressed,
    expectedAccount,
    onAuthProven,
    enableSessionPersistence,
    onTransportRebuilt,
    storageV5,
    credentials,
    workSecret,
    onWorkSecretRefresh,
  } = options ?? {};
  setCseShimGate(isCseShimEnabled);
  setBridgeStateFramesGate(isBridgeStateFramesEnabled);
  setAttestationFilterPolicy(getAttestationFilterPolicy);
  let boundSessionKey = pinSessionId(getSessionId());
  let materializedFile = getMaterializedSessionFile() ?? undefined;
  let tornEntryPair =
    materializedFile !== undefined &&
    boundSessionKey !== undefined &&
    !isOwnTranscriptFile(boundSessionKey, materializedFile);
  let ownTranscriptPath = tornEntryPair ? undefined : materializedFile;
  let ownerVetoed = false;
  let deferredVeto;
  let deferredVouch;
  let vouch;
  let attributions = new Map();
  let historyBackfillSuppressed =
    Boolean(suppressHistoryBackfill) ||
    isSessionHistorySuppressed() ||
    isPrecautionarySuppressionHeldFor(boundSessionKey) ||
    isSessionHistorySuppressedFor(boundSessionKey);
  let isEgressSuppressed = () => isRemoteEgressSuppressedFor(pinSessionId(getSessionId()));
  let withCurrentSession = (take) => {
    if (historyBackfillSuppressed || isBridgeBindingForeign() || isEgressSuppressed()) return;
    let cfg = getSessionId();
    return cfg ? take(cfg) : undefined;
  };
  async function applyOwnerVeto(cause, label, againstAccountUuid) {
    historyBackfillSuppressed = true;
    ownerVetoed = true;
    if (tornEntryPair) logFeatureSad("rc_cross_account_suppression", "torn_entry_pair");
    else logFeatureOk("rc_cross_account_suppression");
    if (tornEntryPair) {
      holdPrecautionarySuppressionFor(boundSessionKey);
      claimPrecautionHoldForObservedCause(boundSessionKey);
      logForDebugging(
        `[bridge:repl] ${label} veto under a TORN entry pair (mid-/resume window): precautionary suppression only, no permanent taint write`,
        {
          level: "warn",
        },
      );
    } else
      await writeHistorySuppression(boundSessionKey, ownTranscriptPath, cause, againstAccountUuid, storageV5);
  }
  function applyDeferredOwnerVeto() {
    if (!deferredVeto) return;
    if (vouch?.holds()) return;
    let { cause, againstAccountUuid } = deferredVeto;
    deferredVeto = undefined;
    let label = cause === "env_owner_mismatch" ? "Env-handoff" : "Restored-pointer";
    logEvent("tengu_bridge_owner_veto_after_dead_pointer", {
      cause: fromEnum(cause),
      permanent: !tornEntryPair,
    });
    logForDebugging(
      `[bridge:repl] ${label} pointer is dead and nothing shows this login to be the recorded owner \u2014 applying the owner veto`,
      {
        level: "warn",
      },
    );
    applyOwnerVeto(cause, label, againstAccountUuid).catch(logError);
  }
  let persistenceAbort;
  let persistenceHooks = {
    onTransportPersistenceReady: (
      writer,
      serverReader,
      persistenceSessionId,
      serverKnownEmpty,
      onCaughtUp,
      onLocalRows,
      internalWriter = writer,
    ) => {
      persistenceAbort?.abort();
      let abortController = new AbortController();
      persistenceAbort = abortController;
      let { signal } = abortController;
      let cleanCaughtUp = false;
      let catchUp;
      let rowsOwed = false;
      let installWriter = (async () => {
        catchUp = createPersistenceCatchUp({
          writer,
          signal,
          onFallenBehind: () => {
            logFeatureBad("bridge_transcript_catch_up", "fell_behind");
            logForDebugging(
              "[bridge:repl] Persistence sync failed on its first runs \u2014 no transcript writer until a later run works",
              {
                level: "error",
              },
            );
            onCaughtUp?.(false);
          },
          attemptSync: async (uploadRows) => {
            if (historyBackfillSuppressed || isEgressSuppressed()) {
              logForDebugging(
                "[bridge:repl] Persistence backfill suppressed (cross-account veto or foreign binding) \u2014 installing live writer only",
              );
              rowsOwed =
                uncertainty?.uncertaintyOnly === true ||
                isScanUncertaintyHoldFor(pinSessionId(getSessionId()));
              return {
                uploadedMain: 0,
                uploadedSubagents: 0,
              };
            }
            let subagentIds = await listSubagentIdsFromDisk(storageV5);
            let outcome = await runPersistenceBackfill(
              uploadRows,
              serverReader,
              subagentIds,
              serverKnownEmpty,
              signal,
              storageV5,
              persistenceSessionId,
              onLocalRows && ((row) => onLocalRows([row])),
            );
            rowsOwed = outcome === "rows_owed";
            return outcome;
          },
        });
        let outcome = await catchUp.outcome;
        if (outcome === "abandoned" || signal.aborted) {
          logForDebugging("[bridge:repl] Transport torn down during sync \u2014 skipping writer install");
          return;
        }
        switch (outcome) {
          case "caught_up":
            logFeatureOk("bridge_transcript_catch_up");
            break;
          case "caught_up_after_retry":
            logFeatureSad("bridge_transcript_catch_up", "retried");
            break;
          case "caught_up_late":
            logForDiagnosticsNoPII("info", "bridge_repl_transcript_catch_up_late");
            break;
        }
        setInternalEventWriter((session, message, options) => {
          internalWriter(session, message, options).catch((error) => {
            logEvent("tengu_session_persistence_failed", {});
            logForDebugging(`[bridge:repl] Internal event write failed: ${errorMessage(error)}`, {
              level: "error",
            });
          });
          return Promise.resolve();
        }, persistenceSessionId);
        setInternalEventReader(() => serverReader.readMain(), serverReader.readSubagents);
        logForDebugging(
          "[bridge:repl] Session persistence enabled \u2014 transcript writer + hydrate readers registered",
        );
        cleanCaughtUp = !rowsOwed;
      })()
        .catch(logError)
        .finally(() => onCaughtUp?.(cleanCaughtUp));
      return {
        runNow: async () => {
          if (await catchUp?.runNow()) await installWriter;
        },
        end: () => abortController.abort(),
      };
    },
    onTransportPersistenceTeardown: () => {
      persistenceAbort?.abort();
      clearInternalEventWriter();
    },
  };
  let envClaudeBridgeReattachSession = process.env.CLAUDE_BRIDGE_REATTACH_SESSION;
  let reattachTarget = envClaudeBridgeReattachSession ?? reattachSessionId;
  let envClaudeBridgeReattachSeq = process.env.CLAUDE_BRIDGE_REATTACH_SEQ;
  let envClaudeBridgeReattachGrouping = process.env.CLAUDE_BRIDGE_REATTACH_GROUPING;
  let CLAUDE_BRIDGE_REATTACH_OWNER_ACCT = env.CLAUDE_BRIDGE_REATTACH_OWNER_ACCT;
  let organizationUuid = env.CLAUDE_BRIDGE_REATTACH_OWNER_ORG;
  let CLAUDE_BRIDGE_REATTACH_NO_BACKFILL = env.CLAUDE_BRIDGE_REATTACH_NO_BACKFILL;
  if (envClaudeBridgeReattachSession) {
    delete process.env.CLAUDE_BRIDGE_REATTACH_SESSION;
    delete process.env.CLAUDE_BRIDGE_REATTACH_SEQ;
    delete process.env.CLAUDE_BRIDGE_REATTACH_OUTBOUND_ONLY;
    delete process.env.CLAUDE_BRIDGE_REATTACH_GROUPING;
    delete process.env.CLAUDE_BRIDGE_REATTACH_OWNER_ACCT;
    delete process.env.CLAUDE_BRIDGE_REATTACH_OWNER_ORG;
    delete process.env.CLAUDE_BRIDGE_REATTACH_NO_BACKFILL;
  }
  let reattachSeq = envClaudeBridgeReattachSession
    ? envClaudeBridgeReattachSeq
      ? Number.parseInt(envClaudeBridgeReattachSeq, 10) || undefined
      : undefined
    : reattachSequenceNum;
  let mustReattach = reattachOrFail;
  let reattachOriginLabel = envClaudeBridgeReattachSession ? "env" : reattachSessionId ? "option" : undefined;
  let adoptedFromPointer = false;
  let deferredClaim;
  let isSameSessionId = (reattachTarget, id) =>
    reattachTarget !== undefined && id !== undefined && sessionIdBody(reattachTarget) === sessionIdBody(id);
  let pointerRecord =
    recordAtEnable === undefined ? getCurrentSessionBridge() : (recordAtEnable ?? undefined);
  if (!envClaudeBridgeReattachSession) {
    if (pointerRecord) {
      let hasOwner = Boolean(pointerRecord.ownerAccountUuid);
      let recordedOwner = {
        accountUuid: pointerRecord.ownerAccountUuid,
        organizationUuid: pointerRecord.ownerOrganizationUuid,
      };
      let fileLogin = hasOwner
        ? await readFreshOauthAccountFromDisk(storageV5).catch(() => {
            return;
          })
        : undefined;
      let ownerCheckIdentity = await resolveOwnerCheckIdentity({
        site: "restored",
        fileLogin,
        owner: recordedOwner,
        attributions,
        writerHonorsVouch: recordWriterHonorsServerVouch,
      });
      let ownerUnconfirmed =
        ownerCheckIdentity.source === "unconfirmed" &&
        workSecret === undefined &&
        (!reattachTarget || isSameSessionId(reattachTarget, pointerRecord.id));
      let login =
        ownerCheckIdentity.source === "unconfirmed" && !ownerUnconfirmed
          ? fileLogin
          : ownerCheckIdentity.login;
      if (ownerCheckIdentity.source === "server" && fileLogin) {
        vouch = {
          claim: recordedOwner,
          login: ownerCheckIdentity.login,
          holds: createBearerOwnerVouch({
            login: ownerCheckIdentity.login,
            bearer: ownerCheckIdentity.bearer,
            attributions,
          }),
        };
        deferredVeto = {
          cause: "restored_owner_mismatch",
          againstAccountUuid: fileLogin.accountUuid ?? "",
        };
      }
      let ownerMatches = hasOwner && sameOwnerAccount(login, recordedOwner);
      if (hasOwner && login?.accountUuid && !ownerMatches) {
        await applyOwnerVeto(
          "restored_owner_mismatch",
          reattachTarget ? "Host-directed" : "Restored-pointer",
          login.accountUuid,
        );
        logForDebugging(
          `[bridge:repl] ${reattachTarget ? "Host-directed" : "Restored-pointer"} reattach vetoed: the credential store account changed since this conversation's pointer was persisted \u2014 minting fresh, history channels suppressed`,
          {
            level: "warn",
          },
        );
        reattachTarget = undefined;
        reattachSeq = undefined;
        reattachOriginLabel = undefined;
      } else {
        let sameOwner = hasOwner && sameOwnerAccount(login, recordedOwner);
        if (pointerRecord.noHistoryBackfill) historyBackfillSuppressed = true;
        if (reattachTarget && isSameSessionId(reattachTarget, pointerRecord.id))
          reattachTarget = pointerRecord.id;
        if (!reattachTarget) {
          reattachTarget = pointerRecord.id;
          reattachSeq = pointerRecord.seq;
          if (!sameOwner || !isBridgeRestoredMatchMintEnabled()) mustReattach = true;
          reattachOriginLabel = sameOwner
            ? mustReattach
              ? "restored_owner_match_pinned"
              : "restored_owner_match"
            : ownerUnconfirmed
              ? "restored_owner_unconfirmed"
              : hasOwner
                ? "restored_identity_unreadable"
                : "restored_owner_unknown";
          adoptedFromPointer = true;
          logForDebugging(
            `[bridge:repl] Reattaching to persisted bridge session ${pointerRecord.id} at seq ${pointerRecord.seq} (${mustReattach ? "reattach-or-fail" : "fresh-mint fallback"}, ${reattachOriginLabel})`,
          );
        } else if (sameOwner) {
          if (!isSameSessionId(reattachTarget, pointerRecord.id)) deferredClaim = recordedOwner;
        } else if (isSameSessionId(reattachTarget, pointerRecord.id)) {
          mustReattach = true;
          logForDebugging(
            `[bridge:repl] Reattaching to the recorded bridge session ${pointerRecord.id} as named by the carrier; owner unconfirmed \u2014 reattach-or-fail`,
          );
        } else {
          historyBackfillSuppressed = true;
          holdPrecautionarySuppressionFor(boundSessionKey);
          claimPrecautionHoldForObservedCause(boundSessionKey);
          logForDebugging(
            "[bridge:repl] Host-directed reattach: this conversation\u2019s recorded owner could not be confirmed as the current login \u2014 attaching with history channels suppressed",
            {
              level: "warn",
            },
          );
        }
        if (ownerCheckIdentity.source === "unconfirmed" && ownerUnconfirmed) {
          deferredVeto = {
            cause: "restored_owner_mismatch",
            againstAccountUuid: ownerCheckIdentity.mismatchAgainst,
          };
          deferredVouch = {
            claim: recordedOwner,
            login: ownerCheckIdentity.attributed,
            holds: createBearerOwnerVouch({
              login: ownerCheckIdentity.attributed,
              bearer: ownerCheckIdentity.bearer,
              attributions,
            }),
          };
        }
      }
    }
  }
  if (envClaudeBridgeReattachSession && reattachTarget) {
    if (CLAUDE_BRIDGE_REATTACH_NO_BACKFILL) {
      historyBackfillSuppressed = true;
      holdPrecautionarySuppressionFor(boundSessionKey);
      claimPrecautionHoldForObservedCause(boundSessionKey);
    }
    let envOwner = {
      accountUuid: CLAUDE_BRIDGE_REATTACH_OWNER_ACCT,
      organizationUuid,
    };
    let fileLogin = await readFreshOauthAccountFromDisk(storageV5).catch(() => {
      return;
    });
    let ownerCheckIdentity = await resolveOwnerCheckIdentity({
      site: "env_handoff",
      fileLogin,
      owner: envOwner,
      attributions,
      writerHonorsVouch: recordWriterHonorsServerVouch,
    });
    let login =
      ownerCheckIdentity.source === "unconfirmed" && workSecret !== undefined
        ? fileLogin
        : ownerCheckIdentity.login;
    if (ownerCheckIdentity.source === "server" && fileLogin) {
      vouch = {
        claim: envOwner,
        login: ownerCheckIdentity.login,
        holds: createBearerOwnerVouch({
          login: ownerCheckIdentity.login,
          bearer: ownerCheckIdentity.bearer,
          attributions,
        }),
      };
      deferredVeto = {
        cause: "env_owner_mismatch",
        againstAccountUuid: fileLogin.accountUuid ?? "",
      };
    }
    if (CLAUDE_BRIDGE_REATTACH_OWNER_ACCT && login?.accountUuid) {
      if (!sameOwnerAccount(login, envOwner)) {
        reattachTarget = undefined;
        reattachSeq = undefined;
        reattachOriginLabel = undefined;
        await applyOwnerVeto("env_owner_mismatch", "Env-handoff", login.accountUuid);
        logForDebugging(
          "[bridge:repl] Env-handoff reattach vetoed: the credential store account changed since the handoff was recorded \u2014 minting fresh, history channels suppressed",
          {
            level: "warn",
          },
        );
      }
    } else {
      mustReattach = true;
      reattachOriginLabel = "env_or_fail";
      if (ownerCheckIdentity.source === "unconfirmed") {
        deferredVeto = {
          cause: "env_owner_mismatch",
          againstAccountUuid: ownerCheckIdentity.mismatchAgainst,
        };
        deferredVouch = {
          claim: undefined,
          login: ownerCheckIdentity.attributed,
          holds: createBearerOwnerVouch({
            login: ownerCheckIdentity.attributed,
            bearer: ownerCheckIdentity.bearer,
            attributions,
          }),
        };
      }
      logForDebugging(
        `[bridge:repl] Env-handoff reattach: owner identity ${ownerCheckIdentity.source === "unconfirmed" ? "unconfirmed" : "unavailable"} \u2014 reattach-or-fail`,
      );
    }
  }
  let targetMatchesPointer = isSameSessionId(reattachTarget, pointerRecord?.id);
  if (targetMatchesPointer) {
    if (pointerRecord?.noHistoryBackfill) historyBackfillSuppressed = true;
    reattachSeq ??= pointerRecord?.seq;
  }
  let uncertainty;
  let suppressionUncertainty = () =>
    isScanUncertaintyHoldFor(boundSessionKey) &&
    !suppressHistoryBackfill &&
    !ownerVetoed &&
    !isSessionHistorySuppressed() &&
    !isSessionHistorySuppressedFor(boundSessionKey) &&
    pointerRecord?.noHistoryBackfill !== true &&
    getSessionId() === boundSessionKey
      ? {
          uncertaintyOnly: true,
        }
      : undefined;
  if (historyBackfillSuppressed) {
    uncertainty = suppressionUncertainty();
    onHistoryBackfillSuppressed?.(uncertainty);
  }
  let declaredKinds = ownerVetoed ? [] : sanitizeStringList(pointerRecord?.declaredDialogKinds);
  if (declaredKinds.length > 0) onDialogKindsDeclared?.(declaredKinds, "restored");
  let groupingId;
  if (reattachTarget)
    groupingId = envClaudeBridgeReattachSession
      ? envClaudeBridgeReattachGrouping
      : targetMatchesPointer
        ? pointerRecord?.groupingId
        : undefined;
  else groupingId = sessionGroupingId;
  if (
    !(await isBridgeEnabledBlocking({
      storageV5,
      credentials,
    }))
  ) {
    logBridgeSkip("not_enabled", "[bridge:repl] Skipping: bridge not enabled");
    let bridgeBlockedCode = await getBridgeBlockedCode();
    logFeatureBad("remote_control_entry", bridgeBlockedCode ?? "bridge_disabled");
    if (
      reportGateRefusalReason &&
      bridgeBlockedCode !== null &&
      !FLAG_UNAVAILABLE_CAUSES.has(bridgeBlockedCode)
    ) {
      let diagnosis = await getBridgeDisabledDiagnosis().catch((error) => {
        logError(error);
        return null;
      });
      if (diagnosis !== null) onStateChange?.("failed", diagnosis.reason);
    }
    return null;
  }
  let usesCredentialStore = isStorageV5Enabled() && credentials !== undefined;
  if (!(usesCredentialStore ? await getBridgeAccessTokenAsync(credentials) : getBridgeAccessToken())) {
    logBridgeSkip("no_oauth", "[bridge:repl] Skipping: no OAuth tokens");
    onStateChange?.("failed", BRIDGE_LOGIN_HINT, "auth");
    return null;
  }
  let recheckOwnerIdentity = async (expected, reason, debugMsg) => {
    let fileLogin = await readFreshOAuthCredentialSnapshot(storageV5, credentials).catch(() => {
      return;
    });
    let { login } = await resolveOwnerCheckIdentity({
      site: "recheck",
      fileLogin,
      owner: expected,
      attributions,
      writerHonorsVouch: recordWriterHonorsServerVouch,
    });
    if (sameOwnerAccount(login, expected)) return true;
    logBridgeSkip(reason, debugMsg);
    onStateChange?.("failed", BRIDGE_ACCOUNT_UNVERIFIED_HINT, "terminal");
    return false;
  };
  if (
    expectedAccount &&
    !(await recheckOwnerIdentity(
      expectedAccount,
      "revive_identity_recheck_failed",
      "[bridge:repl] Skipping: revive identity re-check failed (store changed or unreadable since the watcher validated)",
    ))
  )
    return null;
  await waitForPolicyLimitsToLoad();
  let remoteControlPolicy = policyDenyKind("allow_remote_control");
  if (remoteControlPolicy === "cache_miss") {
    await ensurePolicyLimitsLoadedForDiagnostic();
    remoteControlPolicy = policyDenyKind("allow_remote_control");
  }
  switch (remoteControlPolicy) {
    case null:
      break;
    case "cache_miss":
    case "route_missing":
      logBridgeSkip(
        remoteControlPolicy === "route_missing" ? "policy_route_missing" : "policy_unverified",
        `[bridge:repl] Skipping: allow_remote_control policy unverified (${remoteControlPolicy})`,
      );
      onStateChange?.("failed", policyDeniedHint("allow_remote_control"), "terminal");
      return null;
    case "latched":
      logBridgeSkip(
        "policy_denied",
        "[bridge:repl] Skipping: allow_remote_control denied by the latched HIPAA taint",
      );
      onStateChange?.("policy_disabled", policyBlockedMessage("Remote Control", "is"));
      return null;
    case "org_denied":
      logBridgeSkip("policy_denied", "[bridge:repl] Skipping: allow_remote_control policy not allowed");
      onStateChange?.("policy_disabled", describeRemoteControlPolicyDenial());
      return null;
    default:
      logBridgeSkip(
        "policy_denied",
        "[bridge:repl] Skipping: allow_remote_control denied (unrecognized deny kind)",
      );
      onStateChange?.("policy_disabled", describeRemoteControlPolicyDenial());
      return null;
  }
  if (outboundOnly && !isPolicyAllowed("allow_remote_sessions")) {
    logBridgeSkip("policy_denied", "[bridge:repl] Skipping mirror: allow_remote_sessions policy not allowed");
    onStateChange?.(
      "policy_disabled",
      "session mirroring is disabled by your organization's policy (allow_remote_sessions)",
    );
    return null;
  }
  let takingOverLocalHolder = false;
  if (localHolderGuard && adoptedFromPointer && reattachTarget && isBridgeResumeRespectsLocalOwnerEnabled()) {
    let liveBridgeSessionHolder = await findLiveBridgeSessionHolder(reattachTarget);
    if (liveBridgeSessionHolder) {
      if (localHolderGuard.mode === "decline") {
        logBridgeSkip(
          "restored_pointer_held_locally",
          `[bridge:repl] Skipping: bridge session ${reattachTarget} from the resumed transcript is still served by local pid ${liveBridgeSessionHolder.pid} \u2014 not taking it over (/remote-control here moves it)`,
        );
        logFeatureOk("bridge_resume_guard");
        localHolderGuard.onDeclined(liveBridgeSessionHolder);
        return null;
      }
      logForDebugging(
        `[bridge:repl] Explicit enable is taking over bridge session ${reattachTarget} from local pid ${liveBridgeSessionHolder.pid}`,
      );
      takingOverLocalHolder = true;
    }
  }
  let sessionKey = pinSessionId(getSessionId());
  if (!isSessionHistorySuppressed()) {
    let historySuppressionFromDisk = await readHistorySuppressionFromDisk(storageV5);
    if (historySuppressionFromDisk === "found") holdSessionHistorySuppressionFor(sessionKey);
    else if (historySuppressionFromDisk === "clean") releaseScanUncertaintyHoldFor(sessionKey);
    else if (historySuppressionFromDisk === "torn")
      logFeatureSad("rc_cross_account_suppression", "scan_torn");
    else {
      logFeatureSad(
        "rc_cross_account_suppression",
        historySuppressionFromDisk === "budget-exhausted" ? "scan_budget_exhausted" : "scan_read_error",
      );
      let alreadyHeld = isPrecautionarySuppressionHeldFor(sessionKey);
      holdPrecautionarySuppressionFor(sessionKey);
      markPrecautionClearResilientFor(sessionKey);
      if (!alreadyHeld) markScanUncertaintyHoldFor(sessionKey);
    }
  }
  if (
    !historyBackfillSuppressed &&
    (isSessionHistorySuppressed() ||
      isPrecautionarySuppressionHeldFor(boundSessionKey) ||
      isSessionHistorySuppressedFor(boundSessionKey) ||
      getSessionId() !== boundSessionKey)
  ) {
    historyBackfillSuppressed = true;
    uncertainty = suppressionUncertainty();
    onHistoryBackfillSuppressed?.(uncertainty);
  }
  if (!getBridgeTokenOverride()) {
    let tokens = getGlobalConfig();
    if (
      tokens.bridgeOauthDeadExpiresAt != null &&
      (tokens.bridgeOauthDeadFailCount ?? 0) >= 3 &&
      getStoredOAuthTokenExpiresAt() === tokens.bridgeOauthDeadExpiresAt
    ) {
      logForDebugging(
        `[bridge:repl] Skipping: cross-process backoff (dead token seen ${tokens.bridgeOauthDeadFailCount} times)`,
      );
      return null;
    }
    await checkAndRefreshOAuthTokenIfNeeded({
      credentials,
      storageV5,
    });
    let storedOAuthTokenExpiresAt = getStoredOAuthTokenExpiresAt();
    if (storedOAuthTokenExpiresAt !== null && storedOAuthTokenExpiresAt <= Date.now()) {
      logBridgeSkip(
        "oauth_expired_unrefreshable",
        "[bridge:repl] Skipping: OAuth token expired and refresh failed (re-login required)",
      );
      onStateChange?.("failed", BRIDGE_LOGIN_HINT, "auth");
      let expiresAt = storedOAuthTokenExpiresAt;
      await saveGlobalConfig(
        (config) => ({
          ...config,
          bridgeOauthDeadExpiresAt: expiresAt,
          bridgeOauthDeadFailCount:
            config.bridgeOauthDeadExpiresAt === expiresAt ? (config.bridgeOauthDeadFailCount ?? 0) + 1 : 1,
        }),
        storageV5,
      );
      return null;
    }
  }
  let trustedDeviceError = await preflightTrustedDeviceBlocking(credentials);
  if (trustedDeviceError) {
    logBridgeSkip("trusted_device_unenrolled", `[bridge:repl] Skipping: ${trustedDeviceError}`);
    onStateChange?.(
      "failed",
      trustedDeviceError,
      trustedDeviceError === PROACTIVE_ENROLLMENT_DISABLED_MESSAGE || trustedDeviceError === nullStub3()
        ? "terminal"
        : "auth",
    );
    return null;
  }
  let baseUrl = getBridgeBaseUrl();
  let title = `${getBridgeSessionNamePrefix()}-${randomWordSlug()}`;
  let hasTitle = false;
  let titleIsExplicit = false;
  if (initialName) {
    title = initialName;
    hasTitle = true;
    titleIsExplicit = true;
  } else if (!historyBackfillSuppressed) {
    let currentTitle = withCurrentSession(getCurrentSessionTitle);
    let currentAiTitle = withCurrentSession(getCurrentSessionAiTitle);
    if (currentTitle) {
      title = currentTitle;
      hasTitle = true;
      titleIsExplicit = true;
    } else if (currentAiTitle) {
      title = currentAiTitle;
      hasTitle = true;
    } else if (initialMessages && initialMessages.length > 0)
      for (let idx = initialMessages.length - 1; idx >= 0; idx--) {
        let msg = initialMessages[idx];
        if (!isHumanTurn_3(msg) || isSyntheticMessage(msg)) continue;
        let rawContent = getContentText(msg.message.content);
        if (!rawContent) continue;
        let derived = firstSentenceSnippet(rawContent);
        if (!derived) continue;
        title = derived;
        hasTitle = true;
        break;
      }
  }
  let userMessageCount = 0;
  let lastTitleSessionId;
  let handle = null;
  let titleGeneration = 0;
  let ownerChangedTornDown = false;
  let tornDown = false;
  let adoptedAiTitle;
  let isAdoptedAiTitle = (bridgeSessionId) =>
    adoptedAiTitle?.bridgeSessionId === bridgeSessionId && adoptedAiTitle.sessionId === getSessionId();
  let titleWriter = createTitleWriteCoalescer({
    isOwnTitle: (bridgeSessionId, title) => knownTitles.has(title),
    onRemoteTitleAdopted: (bridgeSessionId, title) => {
      setSelfBridgeTitle(bridgeSessionId, title);
      remoteTitleSessionId = bridgeSessionId;
    },
  });
  let isTitleKnown = (bridgeSessionId, titleText) =>
    knownTitles.has(titleText) || titleWriter.hasSent(bridgeSessionId, titleText);
  let remoteTitleSessionId;
  let fallbackTitle = `${getBridgeSessionNamePrefix()}-${randomWordSlug()}`;
  let knownTitles = new Set([title]);
  let originalLocalTitle;
  if (historyBackfillSuppressed) {
    let sessionId = getSessionId();
    let aiTitle = sessionId ? getCurrentSessionAiTitle(sessionId) : undefined;
    if (aiTitle) knownTitles.add(aiTitle);
    originalLocalTitle = sessionId ? getCurrentSessionTitle(sessionId) : undefined;
  }
  let resolved = Promise.resolve();
  let applyDerivedTitle = (derivedTitle, bridgeSessionId, fromMessageIndex, fromAutomation) => {
    let egressBarred = () => fromAutomation && (isBridgeBindingForeign() || isEgressSuppressed());
    let stillLive = () => !tornDown;
    if (ownerChangedTornDown || egressBarred() || isTeleportedSession(bridgeSessionId)) return false;
    hasTitle = true;
    title = derivedTitle;
    knownTitles.add(derivedTitle);
    setSelfBridgeTitle(bridgeSessionId, derivedTitle);
    logForDebugging(`[bridge:repl] derived title from message ${fromMessageIndex}: ${derivedTitle}`);
    titleWriter
      .update(bridgeSessionId, derivedTitle, {
        baseUrl,
        getAccessToken: getBridgeSessionsAccessToken,
        shouldSend: () => {
          if (ownerChangedTornDown || egressBarred() || !stillLive()) return false;
          return !isTeleportedSession(bridgeSessionId);
        },
      })
      .catch(() => {});
    return true;
  };
  let generateTitleFromText = (derived, bridgeSessionId, atCount) => {
    if (ownerChangedTornDown) return;
    let gen = ++titleGeneration;
    let messageCount = userMessageCount;
    let timeoutSignal = AbortSignal.timeout(15000);
    requestAndPickSessionTitle(derived, timeoutSignal, credentials).then(async (generated) => {
      let localAiTitlePending = () => {
        let currentSessionAiTitle = getCurrentSessionAiTitle(getSessionId());
        return Boolean(currentSessionAiTitle && !knownTitles.has(currentSessionAiTitle));
      };
      let isStale = () => {
        let currentSessionTitle = getCurrentSessionTitle(getSessionId());
        return (
          ownerChangedTornDown ||
          gen !== titleGeneration ||
          lastTitleSessionId !== bridgeSessionId ||
          titleIsExplicit ||
          Boolean(currentSessionTitle && currentSessionTitle !== originalLocalTitle) ||
          localAiTitlePending()
        );
      };
      if (!generated || isStale()) return;
      let bridgeToken = usesCredentialStore
        ? await getBridgeSessionsAccessTokenAsync(credentials)
        : undefined;
      let session = await getBridgeSession(bridgeSessionId, {
        baseUrl,
        getAccessToken: usesCredentialStore ? () => bridgeToken : getBridgeSessionsAccessToken,
        credentials,
      }).catch(() => null);
      if (isStale()) return;
      if (session === null) return;
      if (session.title && !isTitleKnown(bridgeSessionId, session.title)) {
        setSelfBridgeTitle(bridgeSessionId, session.title);
        titleWriter.noteRemoteTitle(bridgeSessionId, session.title);
        remoteTitleSessionId = bridgeSessionId;
        return;
      }
      applyDerivedTitle(generated, bridgeSessionId, messageCount, atCount);
    });
  };
  let handleRemoteRename = (requestedTitle) => {
    let cleanTitle = sanitizeSessionTitle(requestedTitle);
    if (!cleanTitle)
      return {
        ok: false,
        error: "title must be non-empty",
      };
    title = cleanTitle;
    hasTitle = true;
    titleIsExplicit = true;
    knownTitles.add(cleanTitle);
    knownTitles.add(requestedTitle);
    if (handle) {
      handle.selfTitle = cleanTitle;
      titleWriter.noteRemoteTitle(handle.bridgeSessionId, cleanTitle);
      if (requestedTitle !== cleanTitle) titleWriter.noteRemoteTitle(handle.bridgeSessionId, requestedTitle);
    }
    let bindingForeign = isBridgeBindingForeign();
    let titleOwnerSid = bindingForeign ? getBridgeBoundConversationSid() : getSessionId();
    if (titleOwnerSid)
      saveCustomTitle(
        titleOwnerSid,
        cleanTitle,
        bindingForeign ? getDerivedTranscriptPathForSession(titleOwnerSid) : undefined,
        "remote",
        storageV5,
      ).catch((error) => {
        logForDebugging(`saveCustomTitle: transcript append failed: ${errorMessage(error)}`);
      });
    else
      logForDebugging(
        "[bridge:repl] Dropping inbound rename mirror: foreign binding with no bound-sid exposure \u2014 the live conversation is not the one the phone renamed",
      );
    if (!isTeammate() && !bindingForeign)
      resolved = resolved.then(async () => {
        try {
          await saveSessionAgentName(cleanTitle, "user", storageV5);
        } catch (error) {
          logForDebugging(`onRenameSession: name propagation failed: ${errorMessage(error)}`);
        }
      });
    return {
      ok: true,
    };
  };
  let adoptAiTitleFor = (bridgeSessionId) => {
    let sessionId = getSessionId();
    let aiTitle = withCurrentSession(getCurrentSessionAiTitle);
    if (!aiTitle || isTitleKnown(bridgeSessionId, aiTitle)) return false;
    let messageCount = userMessageCount;
    getBridgeSession(bridgeSessionId, {
      baseUrl,
      getAccessToken: getBridgeSessionsAccessToken,
    })
      .catch(() => null)
      .then((session) => {
        if (
          titleIsExplicit ||
          remoteTitleSessionId === bridgeSessionId ||
          getCurrentSessionTitle(getSessionId())
        )
          return;
        if (session === null) return;
        if (session.title && !isTitleKnown(bridgeSessionId, session.title)) {
          setSelfBridgeTitle(bridgeSessionId, session.title);
          titleWriter.noteRemoteTitle(bridgeSessionId, session.title);
          remoteTitleSessionId = bridgeSessionId;
          return;
        }
        if (getSessionId() !== sessionId || withCurrentSession(getCurrentSessionAiTitle) !== aiTitle) return;
        titleGeneration++;
        if (applyDerivedTitle(aiTitle, bridgeSessionId, messageCount, true))
          adoptedAiTitle = {
            bridgeSessionId,
            sessionId,
          };
      });
    return true;
  };
  let adoptLocalAiTitle = () => {
    let bridgeSessionId = handle?.bridgeSessionId;
    if (
      !bridgeSessionId ||
      ownerChangedTornDown ||
      tornDown ||
      titleIsExplicit ||
      remoteTitleSessionId === bridgeSessionId ||
      getCurrentSessionTitle(getSessionId())
    )
      return;
    adoptAiTitleFor(bridgeSessionId);
  };
  let logAutoTitleSkipped = () => {
    logEvent("tengu_bridge_auto_title_skipped", {
      user_message_count: userMessageCount,
      has_title: hasTitle,
    });
  };
  let onUserMessage = (text, bridgeSessionId) => {
    if (ownerChangedTornDown) return true;
    if (titleIsExplicit || isAdoptedAiTitle(bridgeSessionId) || remoteTitleSessionId === bridgeSessionId)
      return true;
    let placeholder = withCurrentSession(getCurrentSessionTitle);
    if (placeholder) {
      if (!isTitleKnown(bridgeSessionId, placeholder))
        getBridgeSession(bridgeSessionId, {
          baseUrl,
          getAccessToken: getBridgeSessionsAccessToken,
        })
          .catch(() => null)
          .then((session) => {
            if (titleIsExplicit || getCurrentSessionTitle(getSessionId()) !== placeholder) return;
            if (session === null) return;
            if (session.title && !isTitleKnown(bridgeSessionId, session.title)) {
              setSelfBridgeTitle(bridgeSessionId, session.title);
              titleWriter.noteRemoteTitle(bridgeSessionId, session.title);
              remoteTitleSessionId = bridgeSessionId;
              return;
            }
            applyDerivedTitle(placeholder, bridgeSessionId, userMessageCount, true);
            titleIsExplicit = true;
          });
      return true;
    }
    if (adoptAiTitleFor(bridgeSessionId)) return true;
    if (lastTitleSessionId !== undefined && lastTitleSessionId !== bridgeSessionId) userMessageCount = 0;
    lastTitleSessionId = bridgeSessionId;
    userMessageCount++;
    if (userMessageCount === 1 && !hasTitle) {
      if (skipAutoTitle) logAutoTitleSkipped();
      else generateTitleFromText(text, bridgeSessionId, false);
    } else if (userMessageCount === 3 && skipAutoTitle) logAutoTitleSkipped();
    else if (userMessageCount === 3) {
      let history =
        historyBackfillSuppressed || isBridgeBindingForeign() || isEgressSuppressed()
          ? undefined
          : getMessages?.();
      let derived = history ? extractConversationText(messagesSinceCompactBoundary(history)) : text;
      generateTitleFromText(derived, bridgeSessionId, history !== undefined);
    }
    return (userMessageCount >= 3 && (hasTitle || titleIsExplicit)) || userMessageCount >= 8;
  };
  let initialHistoryCap = 200;
  let orgUUID = await getOrganizationUUID();
  if (!orgUUID) {
    logBridgeSkip("no_org_uuid", "[bridge:repl] Skipping: no org UUID");
    onStateChange?.("failed", BRIDGE_LOGIN_HINT, "auth");
    return null;
  }
  let bridgeToken = usesCredentialStore ? await getBridgeAccessTokenAsync(credentials) : undefined;
  let ownerPin = await resolveBridgeOwnerPinOnly({
    getAccessToken: usesCredentialStore ? () => bridgeToken : getBridgeAccessToken,
    storageV5,
    credentials,
  });
  let onClassifyMissingOAuthToken = await createTokenAbsenceClassifier(storageV5, credentials);
  let fixedCredentialNow = undefined;
  let versionError = await checkEnvLessBridgeMinVersion();
  if (versionError) {
    logBridgeSkip("version_too_old", `[bridge:repl] Skipping: ${versionError}`, true);
    onStateChange?.("failed", "run `claude update` to upgrade", "terminal");
    return null;
  }
  let { branch, gitRepoUrl, defaultBranch } = await snapshotGitEvidenceForBridge();
  let presencePulse;
  let versionError_2 = createAbortController();
  function teardownOnOwnerChange() {
    ownerChangedTornDown = true;
    versionError_2.abort();
    presencePulse?.teardown();
    if (handle) {
      titleWriter.forget(handle.bridgeSessionId);
      retireBridgeHandle(handle, storageV5);
    }
  }
  if (deferredClaim) {
    if (
      !(await recheckOwnerIdentity(
        deferredClaim,
        "host_target_owner_recheck_failed",
        "[bridge:repl] Skipping: the login changed (or became unreadable) between adjudicating this conversation\u2019s owner and connecting \u2014 not attaching it to the host\u2019s session",
      ))
    )
      return null;
    logForDebugging(
      "[bridge:repl] Host-directed target on a recorded conversation: owner re-verified immediately before connecting",
    );
  }
  let workSecretLane;
  if (workSecret !== undefined) {
    if (!reattachTarget) {
      logForDebugging(
        "[bridge:repl] Skipping: work secret supplied but this init has no session to reattach (no target, or the target was vetoed)",
        {
          level: "error",
        },
      );
      logBridgeSkip("work_secret_no_target", undefined, true);
      onStateChange?.(
        "failed",
        "Remote Control could not attach: no session to attach the host credential to",
        "terminal",
      );
      return null;
    }
    try {
      workSecretLane = refreshWorkSecret({
        secret: workSecret,
        sessionId: reattachTarget,
        apiBaseUrl: baseUrl,
        requestFreshSecret: onWorkSecretRefresh,
      });
    } catch (error) {
      logForDebugging(`[bridge:repl] Skipping: ${errorMessage(error)}`, {
        level: "error",
      });
      logBridgeSkip("work_secret_rejected", undefined, true);
      onStateChange?.("failed", `Remote Control could not attach: ${errorMessage(error)}`, "terminal");
      return null;
    }
    if (machineLaneVersionRefusal() !== null) {
      let readTags = () =>
        readBridgeSessionTags(reattachTarget, {
          baseUrl,
          credentials,
        });
      let branch = await readTags();
      if (branch === null) {
        await sleep(2000);
        branch = await readTags();
      }
      let tags = machineLaneVersionRefusal();
      if (tags !== null && isMachineLaneWork(branch, tags)) {
        let refusalMessage =
          branch === null
            ? `Remote Control could not attach: the session's record could not be read. ${tags.message}`
            : `Remote Control could not attach: ${tags.message}`;
        logForDebugging(`[bridge:repl] Skipping: ${refusalMessage}`, {
          level: "error",
        });
        logBridgeSkip("machine_lane_floor", undefined, true);
        logFeatureBad(
          "bridge_machine_lane_floor",
          branch === null ? `session_unread_${tags.reason}` : tags.reason,
        );
        onStateChange?.("failed", refusalMessage, "terminal");
        return null;
      }
    }
    logForDebugging(
      `[bridge:repl] Attaching ${reattachTarget} with the host's work secret (worker-credential path)`,
    );
  }
  if (takingOverLocalHolder) logEvent("tengu_bridge_restored_pointer_takeover", {});
  let inflightDiff;
  let diffSequence = 0;
  let emptyToolPermissionContext = getEmptyToolPermissionContext();
  let lastDiff;
  let readFileLimited = limitConcurrency(1, readFileForRemote);
  let bridgeHandle = (handle = await initEnvLessBridgeCore({
    titleWriter,
    noHistoryBackfill: historyBackfillSuppressed && uncertainty?.uncertaintyOnly !== true,
    neutralFallbackTitle: fallbackTitle,
    onReattachGoneBounce: () => {
      knownTitles.add(fallbackTitle);
      historyBackfillSuppressed = true;
      onHistoryBackfillSuppressed?.();
      holdPrecautionarySuppressionFor(boundSessionKey);
      markPrecautionClearResilientFor(boundSessionKey);
      claimPrecautionHoldForObservedCause(boundSessionKey);
      applyDeferredOwnerVeto();
    },
    reattachSessionId: reattachTarget,
    reattachSequenceNum: reattachSeq,
    reattachOrFail: mustReattach,
    reattachOrigin: reattachOriginLabel,
    reviveInitiated,
    neverArchive,
    onAuthProven,
    onReattachPointerDead: () => {
      applyDeferredOwnerVeto();
      holdPrecautionarySuppressionFor(boundSessionKey);
      markPrecautionClearResilientFor(boundSessionKey);
      claimPrecautionHoldForObservedCause(boundSessionKey);
      if (!tornEntryPair)
        clearBridgeSession(
          boundSessionKey,
          ownTranscriptPath,
          ownTranscriptPath
            ? {
                targetExists: true,
              }
            : undefined,
          storageV5,
        );
      onReattachPointerDead?.();
    },
    baseUrl,
    orgUUID,
    title,
    ownerPin,
    fixedCredentialNow,
    onOwnerChanged: teardownOnOwnerChange,
    getAccessToken: getBridgeSessionsAccessToken,
    onAuth401: (token, options) => recoverCloudSessionsBearer(token, credentials, storageV5, options),
    classifyFailedOAuthRefresh,
    onReadFreshOAuthToken: async () => {
      let freshOAuthAccessToken = await readFreshOAuthAccessToken(credentials);
      return freshOAuthAccessToken !== undefined && wasLauncherHostLoginToken(freshOAuthAccessToken)
        ? undefined
        : freshOAuthAccessToken;
    },
    onClassifyMissingOAuthToken,
    onProactiveRefresh: async () => {
      await checkAndRefreshOAuthTokenIfNeeded({
        credentials,
        storageV5,
      });
    },
    toSDKMessages: transcriptForwarder(getTools),
    placeAccountMemoryTool: createMemoryServerVerifier(() => getTools?.()),
    accountMemoryInPlay: () => hasRecordedTextForHost(host),
    initialHistoryCap,
    initialMessages: historyBackfillSuppressed ? undefined : initialMessages,
    conversationForPairing: () => getMessages?.() ?? initialMessages ?? [],
    remoteControlOrigin: historyBackfillSuppressed ? undefined : remoteControlOrigin,
    getBackfillMessages: (sessionId) =>
      historyBackfillSuppressed || isBridgeBindingForeign() || isEgressSuppressed()
        ? undefined
        : getBackfillMessages?.(sessionId),
    gitRepoUrl,
    branch,
    defaultBranch,
    nameSourceForCreate: outboundOnly ? undefined : nameSourceForCreate,
    onInboundMessage,
    onQueuedNotification,
    onUserMessage,
    onSessionEstablished: (bridgeSessionId) => {
      presencePulse?.teardown();
      presencePulse = startClientPresencePulse(
        toInfraSessionId(bridgeSessionId),
        baseUrl,
        () => {
          let bridgeSessionsAccessToken = getBridgeSessionsAccessToken();
          if (!bridgeSessionsAccessToken || ownerChangedTornDown) return null;
          return {
            Authorization: `Bearer ${bridgeSessionsAccessToken}`,
          };
        },
        async (authHeader) =>
          (await recoverHostSessionsBearer(authHeader.Authorization?.replace(/^Bearer /, "") ?? "")) ===
          "recovered",
      );
      if (isKairosPushEnabled() && !isEssentialTrafficOnly()) hydrateNotificationPreferences(storageV5);
      let currentSessionAgentColor = getCurrentSessionAgentColor();
      if (currentSessionAgentColor && currentSessionAgentColor !== "default")
        updateBridgeSessionColorTag(bridgeSessionId, currentSessionAgentColor, AGENT_COLOR_NAMES, {
          baseUrl,
          getAccessToken: getBridgeSessionsAccessToken,
        });
    },
    onBeforePushTriggeringState: () => presencePulse?.pulseIfClientPresent(),
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
    onRenameSession: handleRemoteRename,
    onSetColor,
    async onFileSuggestions(query) {
      return (await generateFileSuggestions(globalFileIndexCache, query, true, storageV5)).map(
        (suggestion) => ({
          path: suggestion.displayText,
        }),
      );
    },
    onReadFile: (filePath, maxBytes, encoding, anchor) =>
      (anchor === undefined ? readFileForRemote : readFileLimited)(
        filePath,
        maxBytes,
        () => getToolPermissionContext?.() ?? getEmptyToolPermissionContext(),
        {
          encoding,
          anchor,
          telemetrySource: "repl_bridge",
        },
      ),
    onGetWorkspaceDiff: host
      ? (opts) => {
          let permissionContext = getToolPermissionContext?.() ?? emptyToolPermissionContext;
          let cachedDiff = lastDiff;
          lastDiff = undefined;
          if (
            cachedDiff &&
            cachedDiff.permissionContext === permissionContext &&
            Date.now() - cachedDiff.settledAt <= WORK_SECRET_REFRESH_WINDOW_MS
          )
            return Promise.resolve(cachedDiff.result);
          let current = inflightDiff;
          if (!current || current.permissionContext !== permissionContext) {
            let entry = {
              sequence: ++diffSequence,
              permissionContext,
              pendingWaiters: 0,
              promise: buildWorkspaceDiffResponse(host, permissionContext, workspaceDiffComputeBudget)
                .then((sessionId) => {
                  if (entry.pendingWaiters === 0 && !(lastDiff && lastDiff.sequence > entry.sequence))
                    lastDiff = {
                      sequence: entry.sequence,
                      settledAt: Date.now(),
                      permissionContext,
                      result: sessionId,
                    };
                  return sessionId;
                })
                .finally(() => {
                  if (inflightDiff === entry) inflightDiff = undefined;
                }),
            };
            inflightDiff = entry;
            current = entry;
          }
          let seq = current;
          if (!opts.aborted) {
            seq.pendingWaiters++;
            opts.addEventListener(
              "abort",
              () => {
                seq.pendingWaiters--;
              },
              {
                once: true,
              },
            );
          }
          return seq.promise;
        }
      : undefined,
    async onSideQuestion({ question, history }, { signal, onProgress }) {
      if (historyBackfillSuppressed || isBridgeBindingForeign() || isEgressSuppressed()) {
        logForDebugging("[bridge:repl] side_question refused: current conversation egress is barred");
        return {
          response: null,
          synthetic: false,
        };
      }
      let abortController = createAbortController();
      let abort = () => abortController.abort();
      if (signal.aborted || versionError_2.signal.aborted) abort();
      signal.addEventListener("abort", abort, {
        once: true,
      });
      versionError_2.signal.addEventListener("abort", abort, {
        once: true,
      });
      try {
        let result = await runSideQuestionWithProgress({
          question,
          history,
          parentController: abortController,
          onProgress,
          getLiveMessages: getMessages,
          isTurnInProgress: isTurnActive,
        });
        if (result.cancelled) throw new AbortError("Side question cancelled");
        return result.response;
      } finally {
        signal.removeEventListener("abort", abort);
        versionError_2.signal.removeEventListener("abort", abort);
      }
    },
    onMcpAuthenticate,
    onMcpOauthCallbackUrl,
    onMcpReconnect,
    onForkConversation,
    onBridgeInjectedMcp,
    onProjectsBindingHint,
    onGetContextUsage,
    answerSharedControlRequest,
    onStateChange,
    outboundOnly,
    tags,
    sessionGroupingId: groupingId,
    requestedSessionGroupingId: sessionGroupingId,
    onTransportRebuilt,
    storageV5,
    credentialsStore: credentials,
    workSecretCredentials: workSecretLane,
    ...(enableSessionPersistence ? persistenceHooks : {}),
  }));
  if (bridgeHandle) {
    let originalDetach = bridgeHandle.detachForHandoff?.bind(bridgeHandle);
    bridgeHandle.detachForHandoff = () => {
      teardownOnOwnerChange();
      originalDetach?.();
    };
    let originalTeardown = bridgeHandle.teardown.bind(bridgeHandle);
    bridgeHandle.teardown = async (err) => {
      tornDown = true;
      versionError_2.abort();
      titleWriter.forget(bridgeHandle.bridgeSessionId);
      await originalTeardown(err);
    };
    if (ownerChangedTornDown) retireBridgeHandle(bridgeHandle, storageV5);
    bridgeHandle.selfTitle = title;
    bridgeHandle.adoptLocalAiTitle = adoptLocalAiTitle;
    bridgeHandle.ownerVetoed = ownerVetoed;
    bridgeHandle.serverVouch = vouch ?? (deferredVeto ? deferredVouch : undefined);
  }
  return wrapTeardownWithPresence(bridgeHandle, () => presencePulse);
}
//@ chunk-cg2r2hy6.js:48738-48748 placement
var FIRST_SENTENCE_MAX_CHARS = 50;
//@ chunk-cg2r2hy6.js:48748-48898 placement
/**
 * 取文本的第一句、压缩空白，超过长度上限截断加省略号。
 */
function firstSentenceSnippet(raw) {
  let clean = unwrapReminderText(raw);
  let flat = (/^(.*?[.!?])\s/.exec(clean)?.[1] ?? clean).replace(/\s+/g, " ").trim();
  if (!flat) return;
  return flat.length > FIRST_SENTENCE_MAX_CHARS
    ? flat.slice(0, FIRST_SENTENCE_MAX_CHARS - 1) + "\u2026"
    : flat;
}
export { initReplBridge };
