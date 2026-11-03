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
  let dt = getMaterializedSessionFile() ?? undefined;
  let tornEntryPair =
    dt !== undefined && boundSessionKey !== undefined && !isOwnTranscriptFile(boundSessionKey, dt);
  let lt = tornEntryPair ? undefined : dt;
  let ownerVetoed = false;
  let _e;
  let ct;
  let Qe;
  let attributions = new Map();
  let historyBackfillSuppressed =
    Boolean(suppressHistoryBackfill) ||
    isSessionHistorySuppressed() ||
    isPrecautionarySuppressionHeldFor(boundSessionKey) ||
    isSessionHistorySuppressedFor(boundSessionKey);
  let Ae = () => isRemoteEgressSuppressedFor(pinSessionId(getSessionId()));
  let Ue = (e) => {
    if (historyBackfillSuppressed || isBridgeBindingForeign() || Ae()) return;
    let cfg = getSessionId();
    return cfg ? e(cfg) : undefined;
  };
  async function applyOwnerVeto(e, n, r) {
    historyBackfillSuppressed = true;
    ownerVetoed = true;
    if (tornEntryPair) logFeatureSad("rc_cross_account_suppression", "torn_entry_pair");
    else logFeatureOk("rc_cross_account_suppression");
    if (tornEntryPair) {
      holdPrecautionarySuppressionFor(boundSessionKey);
      claimPrecautionHoldForObservedCause(boundSessionKey);
      logForDebugging(
        `[bridge:repl] ${n} veto under a TORN entry pair (mid-/resume window): precautionary suppression only, no permanent taint write`,
        {
          level: "warn",
        },
      );
    } else await writeHistorySuppression(boundSessionKey, lt, e, r, storageV5);
  }
  function applyDeferredOwnerVeto() {
    if (!_e) return;
    if (Qe?.holds()) return;
    let { cause, againstAccountUuid } = _e;
    _e = undefined;
    let r = cause === "env_owner_mismatch" ? "Env-handoff" : "Restored-pointer";
    logEvent("tengu_bridge_owner_veto_after_dead_pointer", {
      cause: fromEnum(cause),
      permanent: !tornEntryPair,
    });
    logForDebugging(
      `[bridge:repl] ${r} pointer is dead and nothing shows this login to be the recorded owner \u2014 applying the owner veto`,
      {
        level: "warn",
      },
    );
    applyOwnerVeto(cause, r, againstAccountUuid).catch(logError);
  }
  let ft;
  let persistenceHooks = {
    onTransportPersistenceReady: (e, serverReader, bridgeSessionId, serverKnownEmpty, R, O, ee = e) => {
      ft?.abort();
      let abortController = new AbortController();
      ft = abortController;
      let { signal } = abortController;
      let Ze = false;
      let ge;
      let me = false;
      let er = (async () => {
        ge = createPersistenceCatchUp({
          writer: e,
          signal,
          onFallenBehind: () => {
            logFeatureBad("bridge_transcript_catch_up", "fell_behind");
            logForDebugging(
              "[bridge:repl] Persistence sync failed on its first runs \u2014 no transcript writer until a later run works",
              {
                level: "error",
              },
            );
            R?.(false);
          },
          attemptSync: async (uploadRows) => {
            if (historyBackfillSuppressed || Ae()) {
              logForDebugging(
                "[bridge:repl] Persistence backfill suppressed (cross-account veto or foreign binding) \u2014 installing live writer only",
              );
              me = Be?.uncertaintyOnly === true || isScanUncertaintyHoldFor(pinSessionId(getSessionId()));
              return {
                uploadedMain: 0,
                uploadedSubagents: 0,
              };
            }
            let subagentIds = await listSubagentIdsFromDisk(storageV5);
            let et = await runPersistenceBackfill(
              uploadRows,
              serverReader,
              subagentIds,
              serverKnownEmpty,
              signal,
              storageV5,
              bridgeSessionId,
              O && ((kt) => O([kt])),
            );
            me = et === "rows_owed";
            return et;
          },
        });
        let outcome = await ge.outcome;
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
        setInternalEventWriter((St, wt, et) => {
          ee(St, wt, et).catch((error) => {
            logEvent("tengu_session_persistence_failed", {});
            logForDebugging(`[bridge:repl] Internal event write failed: ${errorMessage(error)}`, {
              level: "error",
            });
          });
          return Promise.resolve();
        }, bridgeSessionId);
        setInternalEventReader(() => serverReader.readMain(), serverReader.readSubagents);
        logForDebugging(
          "[bridge:repl] Session persistence enabled \u2014 transcript writer + hydrate readers registered",
        );
        Ze = !me;
      })()
        .catch(logError)
        .finally(() => R?.(Ze));
      return {
        runNow: async () => {
          if (await ge?.runNow()) await er;
        },
        end: () => abortController.abort(),
      };
    },
    onTransportPersistenceTeardown: () => {
      ft?.abort();
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
  let Ut = false;
  let pt;
  let isSameSessionId = (reattachTarget, id) =>
    reattachTarget !== undefined && id !== undefined && sessionIdBody(reattachTarget) === sessionIdBody(id);
  let pointerRecord =
    recordAtEnable === undefined ? getCurrentSessionBridge() : (recordAtEnable ?? undefined);
  if (!envClaudeBridgeReattachSession) {
    if (pointerRecord) {
      let e = Boolean(pointerRecord.ownerAccountUuid);
      let n = {
        accountUuid: pointerRecord.ownerAccountUuid,
        organizationUuid: pointerRecord.ownerOrganizationUuid,
      };
      let r = e
        ? await readFreshOauthAccountFromDisk(storageV5).catch(() => {
            return;
          })
        : undefined;
      let ownerCheckIdentity = await resolveOwnerCheckIdentity({
        site: "restored",
        fileLogin: r,
        owner: n,
        attributions,
        writerHonorsVouch: recordWriterHonorsServerVouch,
      });
      let R =
        ownerCheckIdentity.source === "unconfirmed" &&
        workSecret === undefined &&
        (!reattachTarget || isSameSessionId(reattachTarget, pointerRecord.id));
      let O = ownerCheckIdentity.source === "unconfirmed" && !R ? r : ownerCheckIdentity.login;
      if (ownerCheckIdentity.source === "server" && r) {
        Qe = {
          claim: n,
          login: ownerCheckIdentity.login,
          holds: createBearerOwnerVouch({
            login: ownerCheckIdentity.login,
            bearer: ownerCheckIdentity.bearer,
            attributions,
          }),
        };
        _e = {
          cause: "restored_owner_mismatch",
          againstAccountUuid: r.accountUuid ?? "",
        };
      }
      let ee = e && sameOwnerAccount(O, n);
      if (e && O?.accountUuid && !ee) {
        await applyOwnerVeto(
          "restored_owner_mismatch",
          reattachTarget ? "Host-directed" : "Restored-pointer",
          O.accountUuid,
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
        let pe = e && sameOwnerAccount(O, n);
        if (pointerRecord.noHistoryBackfill) historyBackfillSuppressed = true;
        if (reattachTarget && isSameSessionId(reattachTarget, pointerRecord.id))
          reattachTarget = pointerRecord.id;
        if (!reattachTarget) {
          reattachTarget = pointerRecord.id;
          reattachSeq = pointerRecord.seq;
          if (!pe || !isBridgeRestoredMatchMintEnabled()) mustReattach = true;
          reattachOriginLabel = pe
            ? mustReattach
              ? "restored_owner_match_pinned"
              : "restored_owner_match"
            : R
              ? "restored_owner_unconfirmed"
              : e
                ? "restored_identity_unreadable"
                : "restored_owner_unknown";
          Ut = true;
          logForDebugging(
            `[bridge:repl] Reattaching to persisted bridge session ${pointerRecord.id} at seq ${pointerRecord.seq} (${mustReattach ? "reattach-or-fail" : "fresh-mint fallback"}, ${reattachOriginLabel})`,
          );
        } else if (pe) {
          if (!isSameSessionId(reattachTarget, pointerRecord.id)) pt = n;
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
        if (ownerCheckIdentity.source === "unconfirmed" && R) {
          _e = {
            cause: "restored_owner_mismatch",
            againstAccountUuid: ownerCheckIdentity.mismatchAgainst,
          };
          ct = {
            claim: n,
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
    let e = {
      accountUuid: CLAUDE_BRIDGE_REATTACH_OWNER_ACCT,
      organizationUuid,
    };
    let n = await readFreshOauthAccountFromDisk(storageV5).catch(() => {
      return;
    });
    let ownerCheckIdentity = await resolveOwnerCheckIdentity({
      site: "env_handoff",
      fileLogin: n,
      owner: e,
      attributions,
      writerHonorsVouch: recordWriterHonorsServerVouch,
    });
    let h =
      ownerCheckIdentity.source === "unconfirmed" && workSecret !== undefined ? n : ownerCheckIdentity.login;
    if (ownerCheckIdentity.source === "server" && n) {
      Qe = {
        claim: e,
        login: ownerCheckIdentity.login,
        holds: createBearerOwnerVouch({
          login: ownerCheckIdentity.login,
          bearer: ownerCheckIdentity.bearer,
          attributions,
        }),
      };
      _e = {
        cause: "env_owner_mismatch",
        againstAccountUuid: n.accountUuid ?? "",
      };
    }
    if (CLAUDE_BRIDGE_REATTACH_OWNER_ACCT && h?.accountUuid) {
      if (!sameOwnerAccount(h, e)) {
        reattachTarget = undefined;
        reattachSeq = undefined;
        reattachOriginLabel = undefined;
        await applyOwnerVeto("env_owner_mismatch", "Env-handoff", h.accountUuid);
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
        _e = {
          cause: "env_owner_mismatch",
          againstAccountUuid: ownerCheckIdentity.mismatchAgainst,
        };
        ct = {
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
  let Be;
  let xt = () =>
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
    Be = xt();
    onHistoryBackfillSuppressed?.(Be);
  }
  let Lt = ownerVetoed ? [] : sanitizeStringList(pointerRecord?.declaredDialogKinds);
  if (Lt.length > 0) onDialogKindsDeclared?.(Lt, "restored");
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
      let n = await getBridgeDisabledDiagnosis().catch((error) => {
        logError(error);
        return null;
      });
      if (n !== null) onStateChange?.("failed", n.reason);
    }
    return null;
  }
  let usesCredentialStore = isStorageV5Enabled() && credentials !== undefined;
  if (!(usesCredentialStore ? await getBridgeAccessTokenAsync(credentials) : getBridgeAccessToken())) {
    logBridgeSkip("no_oauth", "[bridge:repl] Skipping: no OAuth tokens");
    onStateChange?.("failed", BRIDGE_LOGIN_HINT, "auth");
    return null;
  }
  let recheckOwnerIdentity = async (e, reason, debugMsg) => {
    let fileLogin = await readFreshOAuthCredentialSnapshot(storageV5, credentials).catch(() => {
      return;
    });
    let { login } = await resolveOwnerCheckIdentity({
      site: "recheck",
      fileLogin,
      owner: e,
      attributions,
      writerHonorsVouch: recordWriterHonorsServerVouch,
    });
    if (sameOwnerAccount(login, e)) return true;
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
  if (localHolderGuard && Ut && reattachTarget && isBridgeResumeRespectsLocalOwnerEnabled()) {
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
  let Ie = pinSessionId(getSessionId());
  if (!isSessionHistorySuppressed()) {
    let historySuppressionFromDisk = await readHistorySuppressionFromDisk(storageV5);
    if (historySuppressionFromDisk === "found") holdSessionHistorySuppressionFor(Ie);
    else if (historySuppressionFromDisk === "clean") releaseScanUncertaintyHoldFor(Ie);
    else if (historySuppressionFromDisk === "torn")
      logFeatureSad("rc_cross_account_suppression", "scan_torn");
    else {
      logFeatureSad(
        "rc_cross_account_suppression",
        historySuppressionFromDisk === "budget-exhausted" ? "scan_budget_exhausted" : "scan_read_error",
      );
      let n = isPrecautionarySuppressionHeldFor(Ie);
      holdPrecautionarySuppressionFor(Ie);
      markPrecautionClearResilientFor(Ie);
      if (!n) markScanUncertaintyHoldFor(Ie);
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
    Be = xt();
    onHistoryBackfillSuppressed?.(Be);
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
      let r = storedOAuthTokenExpiresAt;
      await saveGlobalConfig(
        (h) => ({
          ...h,
          bridgeOauthDeadExpiresAt: r,
          bridgeOauthDeadFailCount:
            h.bridgeOauthDeadExpiresAt === r ? (h.bridgeOauthDeadFailCount ?? 0) + 1 : 1,
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
    let e = Ue(getCurrentSessionTitle);
    let n = Ue(getCurrentSessionAiTitle);
    if (e) {
      title = e;
      hasTitle = true;
      titleIsExplicit = true;
    } else if (n) {
      title = n;
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
  let Xe;
  let ce = null;
  let mt = 0;
  let ownerChangedTornDown = false;
  let ht = false;
  let bt;
  let Hn = (bridgeSessionId) => bt?.bridgeSessionId === bridgeSessionId && bt.sessionId === getSessionId();
  let titleWriter = createTitleWriteCoalescer({
    isOwnTitle: (e, n) => be.has(n),
    onRemoteTitleAdopted: (e, n) => {
      setSelfBridgeTitle(e, n);
      we = e;
    },
  });
  let $e = (bridgeSessionId, title) => be.has(title) || titleWriter.hasSent(bridgeSessionId, title);
  let we;
  let Wt = `${getBridgeSessionNamePrefix()}-${randomWordSlug()}`;
  let be = new Set([title]);
  let jt;
  if (historyBackfillSuppressed) {
    let sessionId = getSessionId();
    let n = sessionId ? getCurrentSessionAiTitle(sessionId) : undefined;
    if (n) be.add(n);
    jt = sessionId ? getCurrentSessionTitle(sessionId) : undefined;
  }
  let resolved = Promise.resolve();
  let applyDerivedTitle = (e, bridgeSessionId, r, h) => {
    let R = () => h && (isBridgeBindingForeign() || Ae());
    let O = () => !ht;
    if (ownerChangedTornDown || R() || isTeleportedSession(bridgeSessionId)) return false;
    hasTitle = true;
    title = e;
    be.add(e);
    setSelfBridgeTitle(bridgeSessionId, e);
    logForDebugging(`[bridge:repl] derived title from message ${r}: ${e}`);
    titleWriter
      .update(bridgeSessionId, e, {
        baseUrl,
        getAccessToken: getBridgeSessionsAccessToken,
        shouldSend: () => {
          if (ownerChangedTornDown || R() || !O()) return false;
          return !isTeleportedSession(bridgeSessionId);
        },
      })
      .catch(() => {});
    return true;
  };
  let generateTitleFromText = (derived, bridgeSessionId, atCount) => {
    if (ownerChangedTornDown) return;
    let gen = ++mt;
    let R = userMessageCount;
    let O = AbortSignal.timeout(15000);
    requestAndPickSessionTitle(derived, O, credentials).then(async (generated) => {
      let pe = () => {
        let currentSessionAiTitle = getCurrentSessionAiTitle(getSessionId());
        return Boolean(currentSessionAiTitle && !be.has(currentSessionAiTitle));
      };
      let Me = () => {
        let currentSessionTitle = getCurrentSessionTitle(getSessionId());
        return (
          ownerChangedTornDown ||
          gen !== mt ||
          Xe !== bridgeSessionId ||
          titleIsExplicit ||
          Boolean(currentSessionTitle && currentSessionTitle !== jt) ||
          pe()
        );
      };
      if (!generated || Me()) return;
      let Ze = usesCredentialStore ? await getBridgeSessionsAccessTokenAsync(credentials) : undefined;
      let ge = await getBridgeSession(bridgeSessionId, {
        baseUrl,
        getAccessToken: usesCredentialStore ? () => Ze : getBridgeSessionsAccessToken,
        credentials,
      }).catch(() => null);
      if (Me()) return;
      if (ge === null) return;
      if (ge.title && !$e(bridgeSessionId, ge.title)) {
        setSelfBridgeTitle(bridgeSessionId, ge.title);
        titleWriter.noteRemoteTitle(bridgeSessionId, ge.title);
        we = bridgeSessionId;
        return;
      }
      applyDerivedTitle(generated, bridgeSessionId, R, atCount);
    });
  };
  let handleRemoteRename = (e) => {
    let n = sanitizeSessionTitle(e);
    if (!n)
      return {
        ok: false,
        error: "title must be non-empty",
      };
    title = n;
    hasTitle = true;
    titleIsExplicit = true;
    be.add(n);
    be.add(e);
    if (ce) {
      ce.selfTitle = n;
      titleWriter.noteRemoteTitle(ce.bridgeSessionId, n);
      if (e !== n) titleWriter.noteRemoteTitle(ce.bridgeSessionId, e);
    }
    let r = isBridgeBindingForeign();
    let h = r ? getBridgeBoundConversationSid() : getSessionId();
    if (h)
      saveCustomTitle(h, n, r ? getDerivedTranscriptPathForSession(h) : undefined, "remote", storageV5).catch(
        (error) => {
          logForDebugging(`saveCustomTitle: transcript append failed: ${errorMessage(error)}`);
        },
      );
    else
      logForDebugging(
        "[bridge:repl] Dropping inbound rename mirror: foreign binding with no bound-sid exposure \u2014 the live conversation is not the one the phone renamed",
      );
    if (!isTeammate() && !r)
      resolved = resolved.then(async () => {
        try {
          await saveSessionAgentName(n, "user", storageV5);
        } catch (error) {
          logForDebugging(`onRenameSession: name propagation failed: ${errorMessage(error)}`);
        }
      });
    return {
      ok: true,
    };
  };
  let zt = (bridgeSessionId) => {
    let sessionId = getSessionId();
    let r = Ue(getCurrentSessionAiTitle);
    if (!r || $e(bridgeSessionId, r)) return false;
    let h = userMessageCount;
    getBridgeSession(bridgeSessionId, {
      baseUrl,
      getAccessToken: getBridgeSessionsAccessToken,
    })
      .catch(() => null)
      .then((R) => {
        if (titleIsExplicit || we === bridgeSessionId || getCurrentSessionTitle(getSessionId())) return;
        if (R === null) return;
        if (R.title && !$e(bridgeSessionId, R.title)) {
          setSelfBridgeTitle(bridgeSessionId, R.title);
          titleWriter.noteRemoteTitle(bridgeSessionId, R.title);
          we = bridgeSessionId;
          return;
        }
        if (getSessionId() !== sessionId || Ue(getCurrentSessionAiTitle) !== r) return;
        mt++;
        if (applyDerivedTitle(r, bridgeSessionId, h, true))
          bt = {
            bridgeSessionId,
            sessionId,
          };
      });
    return true;
  };
  let adoptLocalAiTitle = () => {
    let bridgeSessionId = ce?.bridgeSessionId;
    if (
      !bridgeSessionId ||
      ownerChangedTornDown ||
      ht ||
      titleIsExplicit ||
      we === bridgeSessionId ||
      getCurrentSessionTitle(getSessionId())
    )
      return;
    zt(bridgeSessionId);
  };
  let qt = () => {
    logEvent("tengu_bridge_auto_title_skipped", {
      user_message_count: userMessageCount,
      has_title: hasTitle,
    });
  };
  let onUserMessage = (text, bridgeSessionId) => {
    if (ownerChangedTornDown) return true;
    if (titleIsExplicit || Hn(bridgeSessionId) || we === bridgeSessionId) return true;
    let placeholder = Ue(getCurrentSessionTitle);
    if (placeholder) {
      if (!$e(bridgeSessionId, placeholder))
        getBridgeSession(bridgeSessionId, {
          baseUrl,
          getAccessToken: getBridgeSessionsAccessToken,
        })
          .catch(() => null)
          .then((h) => {
            if (titleIsExplicit || getCurrentSessionTitle(getSessionId()) !== placeholder) return;
            if (h === null) return;
            if (h.title && !$e(bridgeSessionId, h.title)) {
              setSelfBridgeTitle(bridgeSessionId, h.title);
              titleWriter.noteRemoteTitle(bridgeSessionId, h.title);
              we = bridgeSessionId;
              return;
            }
            applyDerivedTitle(placeholder, bridgeSessionId, userMessageCount, true);
            titleIsExplicit = true;
          });
      return true;
    }
    if (zt(bridgeSessionId)) return true;
    if (Xe !== undefined && Xe !== bridgeSessionId) userMessageCount = 0;
    Xe = bridgeSessionId;
    userMessageCount++;
    if (userMessageCount === 1 && !hasTitle) {
      if (skipAutoTitle) qt();
      else generateTitleFromText(text, bridgeSessionId, false);
    } else if (userMessageCount === 3 && skipAutoTitle) qt();
    else if (userMessageCount === 3) {
      let h = historyBackfillSuppressed || isBridgeBindingForeign() || Ae() ? undefined : getMessages?.();
      let derived = h ? extractConversationText(messagesSinceCompactBoundary(h)) : text;
      generateTitleFromText(derived, bridgeSessionId, h !== undefined);
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
  let jn = usesCredentialStore ? await getBridgeAccessTokenAsync(credentials) : undefined;
  let ownerPin = await resolveBridgeOwnerPinOnly({
    getAccessToken: usesCredentialStore ? () => jn : getBridgeAccessToken,
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
  let We;
  let versionError_2 = createAbortController();
  function teardownOnOwnerChange() {
    ownerChangedTornDown = true;
    versionError_2.abort();
    We?.teardown();
    if (ce) {
      titleWriter.forget(ce.bridgeSessionId);
      retireBridgeHandle(ce, storageV5);
    }
  }
  if (pt) {
    if (
      !(await recheckOwnerIdentity(
        pt,
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
      let e = () =>
        readBridgeSessionTags(reattachTarget, {
          baseUrl,
          credentials,
        });
      let branch = await e();
      if (branch === null) {
        await sleep(2000);
        branch = await e();
      }
      let r = machineLaneVersionRefusal();
      if (r !== null && isMachineLaneWork(branch, r)) {
        let h =
          branch === null
            ? `Remote Control could not attach: the session's record could not be read. ${r.message}`
            : `Remote Control could not attach: ${r.message}`;
        logForDebugging(`[bridge:repl] Skipping: ${h}`, {
          level: "error",
        });
        logBridgeSkip("machine_lane_floor", undefined, true);
        logFeatureBad("bridge_machine_lane_floor", branch === null ? `session_unread_${r.reason}` : r.reason);
        onStateChange?.("failed", h, "terminal");
        return null;
      }
    }
    logForDebugging(
      `[bridge:repl] Attaching ${reattachTarget} with the host's work secret (worker-credential path)`,
    );
  }
  if (takingOverLocalHolder) logEvent("tengu_bridge_restored_pointer_takeover", {});
  let Je;
  let Xn = 0;
  let emptyToolPermissionContext = getEmptyToolPermissionContext();
  let Ke;
  let Zn = limitConcurrency(1, readFileForRemote);
  let bridgeHandle = (ce = await initEnvLessBridgeCore({
    titleWriter,
    noHistoryBackfill: historyBackfillSuppressed && Be?.uncertaintyOnly !== true,
    neutralFallbackTitle: Wt,
    onReattachGoneBounce: () => {
      be.add(Wt);
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
          lt,
          lt
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
    onAuth401: (e, n) => recoverCloudSessionsBearer(e, credentials, storageV5, n),
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
    getBackfillMessages: (e) =>
      historyBackfillSuppressed || isBridgeBindingForeign() || Ae() ? undefined : getBackfillMessages?.(e),
    gitRepoUrl,
    branch,
    defaultBranch,
    nameSourceForCreate: outboundOnly ? undefined : nameSourceForCreate,
    onInboundMessage,
    onQueuedNotification,
    onUserMessage,
    onSessionEstablished: (e) => {
      We?.teardown();
      We = startClientPresencePulse(
        toInfraSessionId(e),
        baseUrl,
        () => {
          let bridgeSessionsAccessToken = getBridgeSessionsAccessToken();
          if (!bridgeSessionsAccessToken || ownerChangedTornDown) return null;
          return {
            Authorization: `Bearer ${bridgeSessionsAccessToken}`,
          };
        },
        async (r) =>
          (await recoverHostSessionsBearer(r.Authorization?.replace(/^Bearer /, "") ?? "")) === "recovered",
      );
      if (isKairosPushEnabled() && !isEssentialTrafficOnly()) hydrateNotificationPreferences(storageV5);
      let currentSessionAgentColor = getCurrentSessionAgentColor();
      if (currentSessionAgentColor && currentSessionAgentColor !== "default")
        updateBridgeSessionColorTag(e, currentSessionAgentColor, AGENT_COLOR_NAMES, {
          baseUrl,
          getAccessToken: getBridgeSessionsAccessToken,
        });
    },
    onBeforePushTriggeringState: () => We?.pulseIfClientPresent(),
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
    async onFileSuggestions(e) {
      return (await generateFileSuggestions(globalFileIndexCache, e, true, storageV5)).map((r) => ({
        path: r.displayText,
      }));
    },
    onReadFile: (e, n, encoding, h) =>
      (h === undefined ? readFileForRemote : Zn)(
        e,
        n,
        () => getToolPermissionContext?.() ?? getEmptyToolPermissionContext(),
        {
          encoding,
          anchor: h,
          telemetrySource: "repl_bridge",
        },
      ),
    onGetWorkspaceDiff: host
      ? (opts) => {
          let n = getToolPermissionContext?.() ?? emptyToolPermissionContext;
          let r = Ke;
          Ke = undefined;
          if (r && r.permissionContext === n && Date.now() - r.settledAt <= WORK_SECRET_REFRESH_WINDOW_MS)
            return Promise.resolve(r.result);
          let h = Je;
          if (!h || h.permissionContext !== n) {
            let O = {
              sequence: ++Xn,
              permissionContext: n,
              pendingWaiters: 0,
              promise: buildWorkspaceDiffResponse(host, n, workspaceDiffComputeBudget)
                .then((sessionId) => {
                  if (O.pendingWaiters === 0 && !(Ke && Ke.sequence > O.sequence))
                    Ke = {
                      sequence: O.sequence,
                      settledAt: Date.now(),
                      permissionContext: n,
                      result: sessionId,
                    };
                  return sessionId;
                })
                .finally(() => {
                  if (Je === O) Je = undefined;
                }),
            };
            Je = O;
            h = O;
          }
          let R = h;
          if (!opts.aborted) {
            R.pendingWaiters++;
            opts.addEventListener(
              "abort",
              () => {
                R.pendingWaiters--;
              },
              {
                once: true,
              },
            );
          }
          return R.promise;
        }
      : undefined,
    async onSideQuestion({ question, history }, { signal, onProgress }) {
      if (historyBackfillSuppressed || isBridgeBindingForeign() || Ae()) {
        logForDebugging("[bridge:repl] side_question refused: current conversation egress is barred");
        return {
          response: null,
          synthetic: false,
        };
      }
      let abortController = createAbortController();
      let O = () => abortController.abort();
      if (signal.aborted || versionError_2.signal.aborted) O();
      signal.addEventListener("abort", O, {
        once: true,
      });
      versionError_2.signal.addEventListener("abort", O, {
        once: true,
      });
      try {
        let ee = await runSideQuestionWithProgress({
          question,
          history,
          parentController: abortController,
          onProgress,
          getLiveMessages: getMessages,
          isTurnInProgress: isTurnActive,
        });
        if (ee.cancelled) throw new AbortError("Side question cancelled");
        return ee.response;
      } finally {
        signal.removeEventListener("abort", O);
        versionError_2.signal.removeEventListener("abort", O);
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
    let e = bridgeHandle.detachForHandoff?.bind(bridgeHandle);
    bridgeHandle.detachForHandoff = () => {
      teardownOnOwnerChange();
      e?.();
    };
    let n = bridgeHandle.teardown.bind(bridgeHandle);
    bridgeHandle.teardown = async (err) => {
      ht = true;
      versionError_2.abort();
      titleWriter.forget(bridgeHandle.bridgeSessionId);
      await n(err);
    };
    if (ownerChangedTornDown) retireBridgeHandle(bridgeHandle, storageV5);
    bridgeHandle.selfTitle = title;
    bridgeHandle.adoptLocalAiTitle = adoptLocalAiTitle;
    bridgeHandle.ownerVetoed = ownerVetoed;
    bridgeHandle.serverVouch = Qe ?? (_e ? ct : undefined);
  }
  return wrapTeardownWithPresence(bridgeHandle, () => We);
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
