/**
 * bridge/initReplBridge.ts
 *
 * REPL 侧 Remote Control 入口：门控（开关/OAuth/组织策略/信任设备/最低版本）、重连目标与属主校验（环境交接、恢复指针）、会话标题派生，然后调用 initEnvLessBridgeCore
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/initReplBridge.ts
 * pieces: chunk-cg2r2hy6.js (1)
 * attribution: callgraph-witnessed 1
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
  en,
} from "./_new/runPersistenceBackfill.js";
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
  mr,
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
import { firstSentenceSnippet } from "./_new/firstSentenceSnippet.js";
import { createTitleWriteCoalescer } from "./titleWrite.js";
import { setSelfBridgeTitle, retireBridgeHandle } from "./replBridgeHandle.js";
import { isTeleportedSession, getBridgeSession, updateBridgeSessionColorTag } from "./createSession.js";
import { Eyt, saveSessionAgentName, extractConversationText } from "../utils/sessionTitle.js";
import { sanitizeSessionTitle } from "../utils/stringUtils.js";
import { isTeammate } from "../utils/teammate.js";
import { Us } from "../services/projects/threadRows.js";
import { getOrganizationUUID } from "../services/oauth/client.js";
import { OKs } from "./ownerPin.js";
import { checkEnvLessBridgeMinVersion } from "./envLessBridgeConfig.js";
import { snapshotGitEvidenceForBridge } from "../utils/git.js";
import { createAbortController } from "../utils/abortController.js";
import { machineLaneVersionRefusal, isMachineLaneWork } from "./bridgeEnabled.js";
import { $Je } from "./sessionTags.js";
import { sleep } from "../utils/sleep.js";
import { getEmptyToolPermissionContext } from "../Tool.js";
import { limitConcurrency } from "../utils/concurrencyLimit.js";
import { readFileForRemote } from "../services/remoteTools/remoteFileRead.js";
import { initEnvLessBridgeCore } from "./remoteBridgeCore.js";
import { classifyFailedOAuthRefresh } from "./oauthRefreshFailure.js";
import { wasLauncherHostLoginToken } from "../utils/auth/launcherHostLogin.js";
import { createMemoryServerVerifier } from "../services/mcp/memoryServerVerification.js";
import { qHt } from "../utils/transcriptWithholding.js";
import { startClientPresencePulse } from "./clientPresence.js";
import { recoverHostSessionsBearer } from "../utils/hostSessionsBearer.js";
import { qrt } from "../tools/PushNotificationTool/prompt.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { hydrateNotificationPreferences } from "../services/notifications/notificationPreferences.js";
import { AGENT_COLOR_NAMES } from "../tools/AgentTool/agentColorManager.js";
import { generateFileSuggestions, globalFileIndexCache } from "../hooks/fileSuggestions.js";
import { buildWorkspaceDiffResponse } from "./workspaceDiff.js";
import { runSideQuestionWithProgress } from "../utils/sideQuestionProgress.js";
import { wrapTeardownWithPresence } from "../ink/reconciler.js";

/**
 * 启用 REPL Remote Control：读 CLAUDE_BRIDGE_REATTACH_* 环境交接或恢复指针确定重连目标，校验当前登录是否为记录的属主（不一致则否决并抑制历史回填）；
 * 依次检查桥开关、OAuth、allow_remote_control/allow_remote_sessions 策略、本地另一进程是否持有该会话、OAuth 死令牌退避、trusted device、组织 UUID、最低版本；
 * 派生标题（显式名/当前会话标题/首条用户消息/AI 生成），再把全部回调传给 initEnvLessBridgeCore，并包装 teardown/detachForHandoff。返回桥句柄或 null。
 */
//@ chunk-cg2r2hy6.js:27697-48603 callgraph-witnessed = initReplBridge (0.22)
async function initReplBridge(options) {
  let {
    getToolPermissionContext: getToolPermissionContext,
    host: host,
    workspaceDiffComputeBudget: workspaceDiffComputeBudget,
    getTools: getTools,
    onInboundMessage: onInboundMessage,
    onQueuedNotification: onQueuedNotification,
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
    onSetColor: onSetColor,
    onMcpAuthenticate: onMcpAuthenticate,
    onMcpOauthCallbackUrl: onMcpOauthCallbackUrl,
    onMcpReconnect: onMcpReconnect,
    onForkConversation: onForkConversation,
    onBridgeInjectedMcp: onBridgeInjectedMcp,
    onProjectsBindingHint: onProjectsBindingHint,
    onGetContextUsage: onGetContextUsage,
    answerSharedControlRequest: answerSharedControlRequest,
    onStateChange: onStateChange,
    reportGateRefusalReason: reportGateRefusalReason,
    initialMessages: initialMessages,
    getMessages: getMessages,
    getBackfillMessages: getBackfillMessages,
    remoteControlOrigin: remoteControlOrigin,
    isTurnActive: isTurnActive,
    initialName: initialName,
    skipAutoTitle: skipAutoTitle,
    outboundOnly: outboundOnly,
    nameSourceForCreate: nameSourceForCreate,
    tags: tags,
    sessionGroupingId: sessionGroupingId,
    reattachSessionId: reattachSessionId,
    reattachSequenceNum: reattachSequenceNum,
    reattachOrFail: reattachOrFail,
    reviveInitiated: reviveInitiated,
    neverArchive: neverArchive,
    recordAtEnable: recordAtEnable,
    recordWriterHonorsServerVouch: recordWriterHonorsServerVouch = !1,
    onReattachPointerDead: onReattachPointerDead,
    localHolderGuard: localHolderGuard,
    suppressHistoryBackfill: suppressHistoryBackfill,
    onHistoryBackfillSuppressed: onHistoryBackfillSuppressed,
    expectedAccount: expectedAccount,
    onAuthProven: onAuthProven,
    enableSessionPersistence: enableSessionPersistence,
    onTransportRebuilt: onTransportRebuilt,
    storageV5: storageV5,
    credentials: credentials,
    workSecret: workSecret,
    onWorkSecretRefresh: onWorkSecretRefresh,
  } = options ?? {};
  (setCseShimGate(isCseShimEnabled),
    setBridgeStateFramesGate(isBridgeStateFramesEnabled),
    setAttestationFilterPolicy(getAttestationFilterPolicy));
  let boundSessionKey = pinSessionId(getSessionId()),
    dt = getMaterializedSessionFile() ?? void 0,
    tornEntryPair = dt !== void 0 && boundSessionKey !== void 0 && !isOwnTranscriptFile(boundSessionKey, dt),
    lt = tornEntryPair ? void 0 : dt,
    ownerVetoed = !1,
    _e,
    ct,
    Qe,
    ye = new Map(),
    historyBackfillSuppressed =
      Boolean(suppressHistoryBackfill) ||
      isSessionHistorySuppressed() ||
      isPrecautionarySuppressionHeldFor(boundSessionKey) ||
      isSessionHistorySuppressedFor(boundSessionKey),
    Ae = () => isRemoteEgressSuppressedFor(pinSessionId(getSessionId())),
    Ue = (e) => {
      if (historyBackfillSuppressed || isBridgeBindingForeign() || Ae()) return;
      let cfg = getSessionId();
      return cfg ? e(cfg) : void 0;
    };
  async function applyOwnerVeto(e, n, r) {
    if (((historyBackfillSuppressed = !0), (ownerVetoed = !0), tornEntryPair))
      logFeatureSad("rc_cross_account_suppression", "torn_entry_pair");
    else logFeatureOk("rc_cross_account_suppression");
    if (tornEntryPair)
      (holdPrecautionarySuppressionFor(boundSessionKey),
        claimPrecautionHoldForObservedCause(boundSessionKey),
        logForDebugging(
          `[bridge:repl] ${n} veto under a TORN entry pair (mid-/resume window): precautionary suppression only, no permanent taint write`,
          { level: "warn" },
        ));
    else await writeHistorySuppression(boundSessionKey, lt, e, r, storageV5);
  }
  function applyDeferredOwnerVeto() {
    if (!_e) return;
    if (Qe?.holds()) return;
    let { cause: cause, againstAccountUuid: againstAccountUuid } = _e;
    _e = void 0;
    let r = cause === "env_owner_mismatch" ? "Env-handoff" : "Restored-pointer";
    (logEvent("tengu_bridge_owner_veto_after_dead_pointer", {
      cause: fromEnum(cause),
      permanent: !tornEntryPair,
    }),
      logForDebugging(
        `[bridge:repl] ${r} pointer is dead and nothing shows this login to be the recorded owner \u2014 applying the owner veto`,
        { level: "warn" },
      ),
      applyOwnerVeto(cause, r, againstAccountUuid).catch(logError));
  }
  let ft,
    persistenceHooks = {
      onTransportPersistenceReady: (e, n, r, h, R, O, ee = e) => {
        ft?.abort();
        let abortController = new AbortController();
        ft = abortController;
        let { signal: signal } = abortController,
          Ze = !1,
          ge,
          me = !1,
          er = (async () => {
            ge = createPersistenceCatchUp({
              writer: e,
              signal: signal,
              onFallenBehind: () => {
                (logFeatureBad("bridge_transcript_catch_up", "fell_behind"),
                  logForDebugging(
                    "[bridge:repl] Persistence sync failed on its first runs \u2014 no transcript writer until a later run works",
                    { level: "error" },
                  ),
                  R?.(!1));
              },
              attemptSync: async (St) => {
                if (historyBackfillSuppressed || Ae())
                  return (
                    logForDebugging(
                      "[bridge:repl] Persistence backfill suppressed (cross-account veto or foreign binding) \u2014 installing live writer only",
                    ),
                    (me =
                      Be?.uncertaintyOnly === !0 || isScanUncertaintyHoldFor(pinSessionId(getSessionId()))),
                    { uploadedMain: 0, uploadedSubagents: 0 }
                  );
                let wt = await listSubagentIdsFromDisk(storageV5),
                  et = await runPersistenceBackfill(
                    St,
                    n,
                    wt,
                    h,
                    signal,
                    storageV5,
                    r,
                    O && ((kt) => O([kt])),
                  );
                return ((me = et === "rows_owed"), et);
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
            (setInternalEventWriter(
              (St, wt, et) => (
                ee(St, wt, et).catch((kt) => {
                  (logEvent("tengu_session_persistence_failed", {}),
                    logForDebugging(`[bridge:repl] Internal event write failed: ${errorMessage(kt)}`, {
                      level: "error",
                    }));
                }),
                Promise.resolve()
              ),
              r,
            ),
              setInternalEventReader(() => n.readMain(), n.readSubagents),
              logForDebugging(
                "[bridge:repl] Session persistence enabled \u2014 transcript writer + hydrate readers registered",
              ),
              (Ze = !me));
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
        (ft?.abort(), clearInternalEventWriter());
      },
    },
    envClaudeBridgeReattachSession = process.env.CLAUDE_BRIDGE_REATTACH_SESSION,
    reattachTarget = envClaudeBridgeReattachSession ?? reattachSessionId,
    envClaudeBridgeReattachSeq = process.env.CLAUDE_BRIDGE_REATTACH_SEQ,
    envClaudeBridgeReattachGrouping = process.env.CLAUDE_BRIDGE_REATTACH_GROUPING,
    CLAUDE_BRIDGE_REATTACH_OWNER_ACCT = env.CLAUDE_BRIDGE_REATTACH_OWNER_ACCT,
    CLAUDE_BRIDGE_REATTACH_OWNER_ORG = env.CLAUDE_BRIDGE_REATTACH_OWNER_ORG,
    CLAUDE_BRIDGE_REATTACH_NO_BACKFILL = env.CLAUDE_BRIDGE_REATTACH_NO_BACKFILL;
  if (envClaudeBridgeReattachSession)
    (delete process.env.CLAUDE_BRIDGE_REATTACH_SESSION,
      delete process.env.CLAUDE_BRIDGE_REATTACH_SEQ,
      delete process.env.CLAUDE_BRIDGE_REATTACH_OUTBOUND_ONLY,
      delete process.env.CLAUDE_BRIDGE_REATTACH_GROUPING,
      delete process.env.CLAUDE_BRIDGE_REATTACH_OWNER_ACCT,
      delete process.env.CLAUDE_BRIDGE_REATTACH_OWNER_ORG,
      delete process.env.CLAUDE_BRIDGE_REATTACH_NO_BACKFILL);
  let reattachSeq = envClaudeBridgeReattachSession
      ? envClaudeBridgeReattachSeq
        ? Number.parseInt(envClaudeBridgeReattachSeq, 10) || void 0
        : void 0
      : reattachSequenceNum,
    mustReattach = reattachOrFail,
    reattachOriginLabel = envClaudeBridgeReattachSession ? "env" : reattachSessionId ? "option" : void 0,
    Ut = !1,
    pt,
    isSameSessionId = (e, n) => e !== void 0 && n !== void 0 && sessionIdBody(e) === sessionIdBody(n),
    pointerRecord = recordAtEnable === void 0 ? getCurrentSessionBridge() : (recordAtEnable ?? void 0);
  if (!envClaudeBridgeReattachSession) {
    if (pointerRecord) {
      let e = Boolean(pointerRecord.ownerAccountUuid),
        n = {
          accountUuid: pointerRecord.ownerAccountUuid,
          organizationUuid: pointerRecord.ownerOrganizationUuid,
        },
        r = e
          ? await readFreshOauthAccountFromDisk(storageV5).catch(() => {
              return;
            })
          : void 0,
        h = await resolveOwnerCheckIdentity({
          site: "restored",
          fileLogin: r,
          owner: n,
          attributions: ye,
          writerHonorsVouch: recordWriterHonorsServerVouch,
        }),
        R =
          h.source === "unconfirmed" &&
          workSecret === void 0 &&
          (!reattachTarget || isSameSessionId(reattachTarget, pointerRecord.id)),
        O = h.source === "unconfirmed" && !R ? r : h.login;
      if (h.source === "server" && r)
        ((Qe = {
          claim: n,
          login: h.login,
          holds: createBearerOwnerVouch({ login: h.login, bearer: h.bearer, attributions: ye }),
        }),
          (_e = { cause: "restored_owner_mismatch", againstAccountUuid: r.accountUuid ?? "" }));
      let ee = e && sameOwnerAccount(O, n);
      if (e && O?.accountUuid && !ee)
        (await applyOwnerVeto(
          "restored_owner_mismatch",
          reattachTarget ? "Host-directed" : "Restored-pointer",
          O.accountUuid,
        ),
          logForDebugging(
            `[bridge:repl] ${reattachTarget ? "Host-directed" : "Restored-pointer"} reattach vetoed: the credential store account changed since this conversation's pointer was persisted \u2014 minting fresh, history channels suppressed`,
            { level: "warn" },
          ),
          (reattachTarget = void 0),
          (reattachSeq = void 0),
          (reattachOriginLabel = void 0));
      else {
        let pe = e && sameOwnerAccount(O, n);
        if (pointerRecord.noHistoryBackfill) historyBackfillSuppressed = !0;
        if (reattachTarget && isSameSessionId(reattachTarget, pointerRecord.id))
          reattachTarget = pointerRecord.id;
        if (!reattachTarget) {
          if (
            ((reattachTarget = pointerRecord.id),
            (reattachSeq = pointerRecord.seq),
            !pe || !isBridgeRestoredMatchMintEnabled())
          )
            mustReattach = !0;
          ((reattachOriginLabel = pe
            ? mustReattach
              ? "restored_owner_match_pinned"
              : "restored_owner_match"
            : R
              ? "restored_owner_unconfirmed"
              : e
                ? "restored_identity_unreadable"
                : "restored_owner_unknown"),
            (Ut = !0),
            logForDebugging(
              `[bridge:repl] Reattaching to persisted bridge session ${pointerRecord.id} at seq ${pointerRecord.seq} (${mustReattach ? "reattach-or-fail" : "fresh-mint fallback"}, ${reattachOriginLabel})`,
            ));
        } else if (pe) {
          if (!isSameSessionId(reattachTarget, pointerRecord.id)) pt = n;
        } else if (isSameSessionId(reattachTarget, pointerRecord.id))
          ((mustReattach = !0),
            logForDebugging(
              `[bridge:repl] Reattaching to the recorded bridge session ${pointerRecord.id} as named by the carrier; owner unconfirmed \u2014 reattach-or-fail`,
            ));
        else
          ((historyBackfillSuppressed = !0),
            holdPrecautionarySuppressionFor(boundSessionKey),
            claimPrecautionHoldForObservedCause(boundSessionKey),
            logForDebugging(
              "[bridge:repl] Host-directed reattach: this conversation\u2019s recorded owner could not be confirmed as the current login \u2014 attaching with history channels suppressed",
              { level: "warn" },
            ));
        if (h.source === "unconfirmed" && R)
          ((_e = { cause: "restored_owner_mismatch", againstAccountUuid: h.mismatchAgainst }),
            (ct = {
              claim: n,
              login: h.attributed,
              holds: createBearerOwnerVouch({ login: h.attributed, bearer: h.bearer, attributions: ye }),
            }));
      }
    }
  }
  if (envClaudeBridgeReattachSession && reattachTarget) {
    if (CLAUDE_BRIDGE_REATTACH_NO_BACKFILL)
      ((historyBackfillSuppressed = !0),
        holdPrecautionarySuppressionFor(boundSessionKey),
        claimPrecautionHoldForObservedCause(boundSessionKey));
    let e = {
        accountUuid: CLAUDE_BRIDGE_REATTACH_OWNER_ACCT,
        organizationUuid: CLAUDE_BRIDGE_REATTACH_OWNER_ORG,
      },
      n = await readFreshOauthAccountFromDisk(storageV5).catch(() => {
        return;
      }),
      r = await resolveOwnerCheckIdentity({
        site: "env_handoff",
        fileLogin: n,
        owner: e,
        attributions: ye,
        writerHonorsVouch: recordWriterHonorsServerVouch,
      }),
      h = r.source === "unconfirmed" && workSecret !== void 0 ? n : r.login;
    if (r.source === "server" && n)
      ((Qe = {
        claim: e,
        login: r.login,
        holds: createBearerOwnerVouch({ login: r.login, bearer: r.bearer, attributions: ye }),
      }),
        (_e = { cause: "env_owner_mismatch", againstAccountUuid: n.accountUuid ?? "" }));
    if (CLAUDE_BRIDGE_REATTACH_OWNER_ACCT && h?.accountUuid) {
      if (!sameOwnerAccount(h, e))
        ((reattachTarget = void 0),
          (reattachSeq = void 0),
          (reattachOriginLabel = void 0),
          await applyOwnerVeto("env_owner_mismatch", "Env-handoff", h.accountUuid),
          logForDebugging(
            "[bridge:repl] Env-handoff reattach vetoed: the credential store account changed since the handoff was recorded \u2014 minting fresh, history channels suppressed",
            { level: "warn" },
          ));
    } else {
      if (((mustReattach = !0), (reattachOriginLabel = "env_or_fail"), r.source === "unconfirmed"))
        ((_e = { cause: "env_owner_mismatch", againstAccountUuid: r.mismatchAgainst }),
          (ct = {
            claim: void 0,
            login: r.attributed,
            holds: createBearerOwnerVouch({ login: r.attributed, bearer: r.bearer, attributions: ye }),
          }));
      logForDebugging(
        `[bridge:repl] Env-handoff reattach: owner identity ${r.source === "unconfirmed" ? "unconfirmed" : "unavailable"} \u2014 reattach-or-fail`,
      );
    }
  }
  let targetMatchesPointer = isSameSessionId(reattachTarget, pointerRecord?.id);
  if (targetMatchesPointer) {
    if (pointerRecord?.noHistoryBackfill) historyBackfillSuppressed = !0;
    reattachSeq ??= pointerRecord?.seq;
  }
  let Be,
    xt = () =>
      isScanUncertaintyHoldFor(boundSessionKey) &&
      !suppressHistoryBackfill &&
      !ownerVetoed &&
      !isSessionHistorySuppressed() &&
      !isSessionHistorySuppressedFor(boundSessionKey) &&
      pointerRecord?.noHistoryBackfill !== !0 &&
      getSessionId() === boundSessionKey
        ? { uncertaintyOnly: !0 }
        : void 0;
  if (historyBackfillSuppressed) ((Be = xt()), onHistoryBackfillSuppressed?.(Be));
  let Lt = ownerVetoed ? [] : sanitizeStringList(pointerRecord?.declaredDialogKinds);
  if (Lt.length > 0) onDialogKindsDeclared?.(Lt, "restored");
  let groupingId;
  if (reattachTarget)
    groupingId = envClaudeBridgeReattachSession
      ? envClaudeBridgeReattachGrouping
      : targetMatchesPointer
        ? pointerRecord?.groupingId
        : void 0;
  else groupingId = sessionGroupingId;
  if (!(await isBridgeEnabledBlocking({ storageV5: storageV5, credentials: credentials }))) {
    logBridgeSkip("not_enabled", "[bridge:repl] Skipping: bridge not enabled");
    let e = await getBridgeBlockedCode();
    if (
      (logFeatureBad("remote_control_entry", e ?? "bridge_disabled"),
      reportGateRefusalReason && e !== null && !FLAG_UNAVAILABLE_CAUSES.has(e))
    ) {
      let n = await getBridgeDisabledDiagnosis().catch((r) => (logError(r), null));
      if (n !== null) onStateChange?.("failed", n.reason);
    }
    return null;
  }
  let usesCredentialStore = isStorageV5Enabled() && credentials !== void 0;
  if (!(usesCredentialStore ? await getBridgeAccessTokenAsync(credentials) : getBridgeAccessToken()))
    return (
      logBridgeSkip("no_oauth", "[bridge:repl] Skipping: no OAuth tokens"),
      onStateChange?.("failed", BRIDGE_LOGIN_HINT, "auth"),
      null
    );
  let recheckOwnerIdentity = async (e, n, r) => {
    let h = await readFreshOAuthCredentialSnapshot(storageV5, credentials).catch(() => {
        return;
      }),
      { login: login } = await resolveOwnerCheckIdentity({
        site: "recheck",
        fileLogin: h,
        owner: e,
        attributions: ye,
        writerHonorsVouch: recordWriterHonorsServerVouch,
      });
    if (sameOwnerAccount(login, e)) return !0;
    return (logBridgeSkip(n, r), onStateChange?.("failed", BRIDGE_ACCOUNT_UNVERIFIED_HINT, "terminal"), !1);
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
  if (remoteControlPolicy === "cache_miss")
    (await ensurePolicyLimitsLoadedForDiagnostic(),
      (remoteControlPolicy = policyDenyKind("allow_remote_control")));
  switch (remoteControlPolicy) {
    case null:
      break;
    case "cache_miss":
    case "route_missing":
      return (
        logBridgeSkip(
          remoteControlPolicy === "route_missing" ? "policy_route_missing" : "policy_unverified",
          `[bridge:repl] Skipping: allow_remote_control policy unverified (${remoteControlPolicy})`,
        ),
        onStateChange?.("failed", policyDeniedHint("allow_remote_control"), "terminal"),
        null
      );
    case "latched":
      return (
        logBridgeSkip(
          "policy_denied",
          "[bridge:repl] Skipping: allow_remote_control denied by the latched HIPAA taint",
        ),
        onStateChange?.("policy_disabled", policyBlockedMessage("Remote Control", "is")),
        null
      );
    case "org_denied":
      return (
        logBridgeSkip("policy_denied", "[bridge:repl] Skipping: allow_remote_control policy not allowed"),
        onStateChange?.("policy_disabled", describeRemoteControlPolicyDenial()),
        null
      );
    default:
      return (
        logBridgeSkip(
          "policy_denied",
          "[bridge:repl] Skipping: allow_remote_control denied (unrecognized deny kind)",
        ),
        onStateChange?.("policy_disabled", describeRemoteControlPolicyDenial()),
        null
      );
  }
  if (outboundOnly && !isPolicyAllowed("allow_remote_sessions"))
    return (
      logBridgeSkip(
        "policy_denied",
        "[bridge:repl] Skipping mirror: allow_remote_sessions policy not allowed",
      ),
      onStateChange?.(
        "policy_disabled",
        "session mirroring is disabled by your organization's policy (allow_remote_sessions)",
      ),
      null
    );
  let takingOverLocalHolder = !1;
  if (localHolderGuard && Ut && reattachTarget && isBridgeResumeRespectsLocalOwnerEnabled()) {
    let e = await findLiveBridgeSessionHolder(reattachTarget);
    if (e) {
      if (localHolderGuard.mode === "decline")
        return (
          logBridgeSkip(
            "restored_pointer_held_locally",
            `[bridge:repl] Skipping: bridge session ${reattachTarget} from the resumed transcript is still served by local pid ${e.pid} \u2014 not taking it over (/remote-control here moves it)`,
          ),
          logFeatureOk("bridge_resume_guard"),
          localHolderGuard.onDeclined(e),
          null
        );
      (logForDebugging(
        `[bridge:repl] Explicit enable is taking over bridge session ${reattachTarget} from local pid ${e.pid}`,
      ),
        (takingOverLocalHolder = !0));
    }
  }
  let Ie = pinSessionId(getSessionId());
  if (!isSessionHistorySuppressed()) {
    let e = await readHistorySuppressionFromDisk(storageV5);
    if (e === "found") holdSessionHistorySuppressionFor(Ie);
    else if (e === "clean") releaseScanUncertaintyHoldFor(Ie);
    else if (e === "torn") logFeatureSad("rc_cross_account_suppression", "scan_torn");
    else {
      logFeatureSad(
        "rc_cross_account_suppression",
        e === "budget-exhausted" ? "scan_budget_exhausted" : "scan_read_error",
      );
      let n = isPrecautionarySuppressionHeldFor(Ie);
      if ((holdPrecautionarySuppressionFor(Ie), markPrecautionClearResilientFor(Ie), !n))
        markScanUncertaintyHoldFor(Ie);
    }
  }
  if (
    !historyBackfillSuppressed &&
    (isSessionHistorySuppressed() ||
      isPrecautionarySuppressionHeldFor(boundSessionKey) ||
      isSessionHistorySuppressedFor(boundSessionKey) ||
      getSessionId() !== boundSessionKey)
  )
    ((historyBackfillSuppressed = !0), (Be = xt()), onHistoryBackfillSuppressed?.(Be));
  if (!getBridgeTokenOverride()) {
    let tokens = getGlobalConfig();
    if (
      tokens.bridgeOauthDeadExpiresAt != null &&
      (tokens.bridgeOauthDeadFailCount ?? 0) >= 3 &&
      getStoredOAuthTokenExpiresAt() === tokens.bridgeOauthDeadExpiresAt
    )
      return (
        logForDebugging(
          `[bridge:repl] Skipping: cross-process backoff (dead token seen ${tokens.bridgeOauthDeadFailCount} times)`,
        ),
        null
      );
    await checkAndRefreshOAuthTokenIfNeeded({ credentials: credentials, storageV5: storageV5 });
    let n = getStoredOAuthTokenExpiresAt();
    if (n !== null && n <= Date.now()) {
      (logBridgeSkip(
        "oauth_expired_unrefreshable",
        "[bridge:repl] Skipping: OAuth token expired and refresh failed (re-login required)",
      ),
        onStateChange?.("failed", BRIDGE_LOGIN_HINT, "auth"));
      let r = n;
      return (
        await saveGlobalConfig(
          (h) => ({
            ...h,
            bridgeOauthDeadExpiresAt: r,
            bridgeOauthDeadFailCount:
              h.bridgeOauthDeadExpiresAt === r ? (h.bridgeOauthDeadFailCount ?? 0) + 1 : 1,
          }),
          storageV5,
        ),
        null
      );
    }
  }
  let trustedDeviceError = await preflightTrustedDeviceBlocking(credentials);
  if (trustedDeviceError)
    return (
      logBridgeSkip("trusted_device_unenrolled", `[bridge:repl] Skipping: ${trustedDeviceError}`),
      onStateChange?.(
        "failed",
        trustedDeviceError,
        trustedDeviceError === PROACTIVE_ENROLLMENT_DISABLED_MESSAGE || trustedDeviceError === nullStub3()
          ? "terminal"
          : "auth",
      ),
      null
    );
  let baseUrl = getBridgeBaseUrl(),
    title = `${getBridgeSessionNamePrefix()}-${randomWordSlug()}`,
    hasTitle = !1,
    titleIsExplicit = !1;
  if (initialName) ((title = initialName), (hasTitle = !0), (titleIsExplicit = !0));
  else if (!historyBackfillSuppressed) {
    let e = Ue(getCurrentSessionTitle),
      n = Ue(getCurrentSessionAiTitle);
    if (e) ((title = e), (hasTitle = !0), (titleIsExplicit = !0));
    else if (n) ((title = n), (hasTitle = !0));
    else if (initialMessages && initialMessages.length > 0)
      for (let r = initialMessages.length - 1; r >= 0; r--) {
        let msg = initialMessages[r];
        if (!isHumanTurn_3(msg) || isSyntheticMessage(msg)) continue;
        let rawContent = getContentText(msg.message.content);
        if (!rawContent) continue;
        let derived = firstSentenceSnippet(rawContent);
        if (!derived) continue;
        ((title = derived), (hasTitle = !0));
        break;
      }
  }
  let userMessageCount = 0,
    Xe,
    ce = null,
    mt = 0,
    ownerChangedTornDown = !1,
    ht = !1,
    bt,
    Hn = (e) => bt?.bridgeSessionId === e && bt.sessionId === getSessionId(),
    titleWriter = createTitleWriteCoalescer({
      isOwnTitle: (e, n) => be.has(n),
      onRemoteTitleAdopted: (e, n) => {
        (setSelfBridgeTitle(e, n), (we = e));
      },
    }),
    $e = (e, n) => be.has(n) || titleWriter.hasSent(e, n),
    we,
    Wt = `${getBridgeSessionNamePrefix()}-${randomWordSlug()}`,
    be = new Set([title]),
    jt;
  if (historyBackfillSuppressed) {
    let e = getSessionId(),
      n = e ? getCurrentSessionAiTitle(e) : void 0;
    if (n) be.add(n);
    jt = e ? getCurrentSessionTitle(e) : void 0;
  }
  let resolved = Promise.resolve(),
    applyDerivedTitle = (e, n, r, h) => {
      let R = () => h && (isBridgeBindingForeign() || Ae()),
        O = () => !ht;
      if (ownerChangedTornDown || R() || isTeleportedSession(n)) return !1;
      return (
        (hasTitle = !0),
        (title = e),
        be.add(e),
        setSelfBridgeTitle(n, e),
        logForDebugging(`[bridge:repl] derived title from message ${r}: ${e}`),
        titleWriter
          .update(n, e, {
            baseUrl: baseUrl,
            getAccessToken: getBridgeSessionsAccessToken,
            shouldSend: () => {
              if (ownerChangedTornDown || R() || !O()) return !1;
              return !isTeleportedSession(n);
            },
          })
          .catch(() => {}),
        !0
      );
    },
    generateTitleFromText = (derived, bridgeSessionId, atCount) => {
      if (ownerChangedTornDown) return;
      let gen = ++mt,
        R = userMessageCount,
        timeout = AbortSignal.timeout(15000);
      Eyt(derived, timeout, credentials).then(async (generated) => {
        let pe = () => {
            let me = getCurrentSessionAiTitle(getSessionId());
            return Boolean(me && !be.has(me));
          },
          Me = () => {
            let me = getCurrentSessionTitle(getSessionId());
            return (
              ownerChangedTornDown ||
              gen !== mt ||
              Xe !== bridgeSessionId ||
              titleIsExplicit ||
              Boolean(me && me !== jt) ||
              pe()
            );
          };
        if (!generated || Me()) return;
        let Ze = usesCredentialStore ? await getBridgeSessionsAccessTokenAsync(credentials) : void 0,
          ge = await getBridgeSession(bridgeSessionId, {
            baseUrl: baseUrl,
            getAccessToken: usesCredentialStore ? () => Ze : getBridgeSessionsAccessToken,
            credentials: credentials,
          }).catch(() => null);
        if (Me()) return;
        if (ge === null) return;
        if (ge.title && !$e(bridgeSessionId, ge.title)) {
          (setSelfBridgeTitle(bridgeSessionId, ge.title),
            titleWriter.noteRemoteTitle(bridgeSessionId, ge.title),
            (we = bridgeSessionId));
          return;
        }
        applyDerivedTitle(generated, bridgeSessionId, R, atCount);
      });
    },
    handleRemoteRename = (e) => {
      let n = sanitizeSessionTitle(e);
      if (!n) return { ok: !1, error: "title must be non-empty" };
      if (((title = n), (hasTitle = !0), (titleIsExplicit = !0), be.add(n), be.add(e), ce)) {
        if (((ce.selfTitle = n), titleWriter.noteRemoteTitle(ce.bridgeSessionId, n), e !== n))
          titleWriter.noteRemoteTitle(ce.bridgeSessionId, e);
      }
      let r = isBridgeBindingForeign(),
        h = r ? getBridgeBoundConversationSid() : getSessionId();
      if (h)
        saveCustomTitle(h, n, r ? getDerivedTranscriptPathForSession(h) : void 0, "remote", storageV5).catch(
          (R) => {
            logForDebugging(`saveCustomTitle: transcript append failed: ${errorMessage(R)}`);
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
      return { ok: !0 };
    },
    zt = (e) => {
      let n = getSessionId(),
        r = Ue(getCurrentSessionAiTitle);
      if (!r || $e(e, r)) return !1;
      let h = userMessageCount;
      return (
        getBridgeSession(e, { baseUrl: baseUrl, getAccessToken: getBridgeSessionsAccessToken })
          .catch(() => null)
          .then((R) => {
            if (titleIsExplicit || we === e || getCurrentSessionTitle(getSessionId())) return;
            if (R === null) return;
            if (R.title && !$e(e, R.title)) {
              (setSelfBridgeTitle(e, R.title), titleWriter.noteRemoteTitle(e, R.title), (we = e));
              return;
            }
            if (getSessionId() !== n || Ue(getCurrentSessionAiTitle) !== r) return;
            if ((mt++, applyDerivedTitle(r, e, h, !0))) bt = { bridgeSessionId: e, sessionId: n };
          }),
        !0
      );
    },
    Ln = () => {
      let e = ce?.bridgeSessionId;
      if (
        !e ||
        ownerChangedTornDown ||
        ht ||
        titleIsExplicit ||
        we === e ||
        getCurrentSessionTitle(getSessionId())
      )
        return;
      zt(e);
    },
    qt = () => {
      logEvent("tengu_bridge_auto_title_skipped", {
        user_message_count: userMessageCount,
        has_title: hasTitle,
      });
    },
    onUserMessage = (text, bridgeSessionId) => {
      if (ownerChangedTornDown) return !0;
      if (titleIsExplicit || Hn(bridgeSessionId) || we === bridgeSessionId) return !0;
      let placeholder = Ue(getCurrentSessionTitle);
      if (placeholder) {
        if (!$e(bridgeSessionId, placeholder))
          getBridgeSession(bridgeSessionId, {
            baseUrl: baseUrl,
            getAccessToken: getBridgeSessionsAccessToken,
          })
            .catch(() => null)
            .then((h) => {
              if (titleIsExplicit || getCurrentSessionTitle(getSessionId()) !== placeholder) return;
              if (h === null) return;
              if (h.title && !$e(bridgeSessionId, h.title)) {
                (setSelfBridgeTitle(bridgeSessionId, h.title),
                  titleWriter.noteRemoteTitle(bridgeSessionId, h.title),
                  (we = bridgeSessionId));
                return;
              }
              (applyDerivedTitle(placeholder, bridgeSessionId, userMessageCount, !0), (titleIsExplicit = !0));
            });
        return !0;
      }
      if (zt(bridgeSessionId)) return !0;
      if (Xe !== void 0 && Xe !== bridgeSessionId) userMessageCount = 0;
      if (((Xe = bridgeSessionId), userMessageCount++, userMessageCount === 1 && !hasTitle))
        if (skipAutoTitle) qt();
        else generateTitleFromText(text, bridgeSessionId, !1);
      else if (userMessageCount === 3 && skipAutoTitle) qt();
      else if (userMessageCount === 3) {
        let h = historyBackfillSuppressed || isBridgeBindingForeign() || Ae() ? void 0 : getMessages?.(),
          R = h ? extractConversationText(Us(h)) : text;
        generateTitleFromText(R, bridgeSessionId, h !== void 0);
      }
      return (userMessageCount >= 3 && (hasTitle || titleIsExplicit)) || userMessageCount >= 8;
    },
    $n = 200,
    orgUUID = await getOrganizationUUID();
  if (!orgUUID)
    return (
      logBridgeSkip("no_org_uuid", "[bridge:repl] Skipping: no org UUID"),
      onStateChange?.("failed", BRIDGE_LOGIN_HINT, "auth"),
      null
    );
  let jn = usesCredentialStore ? await getBridgeAccessTokenAsync(credentials) : void 0,
    Gn = await OKs({
      getAccessToken: usesCredentialStore ? () => jn : getBridgeAccessToken,
      storageV5: storageV5,
      credentials: credentials,
    }),
    Kn = await en(storageV5, credentials),
    zn = void 0,
    versionError = await checkEnvLessBridgeMinVersion();
  if (versionError)
    return (
      logBridgeSkip("version_too_old", `[bridge:repl] Skipping: ${versionError}`, !0),
      onStateChange?.("failed", "run `claude update` to upgrade", "terminal"),
      null
    );
  let {
      branch: branch,
      gitRepoUrl: gitRepoUrl,
      defaultBranch: defaultBranch,
    } = await snapshotGitEvidenceForBridge(),
    We,
    versionError_2 = createAbortController();
  function teardownOnOwnerChange() {
    if (((ownerChangedTornDown = !0), versionError_2.abort(), We?.teardown(), ce))
      (titleWriter.forget(ce.bridgeSessionId), retireBridgeHandle(ce, storageV5));
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
  if (workSecret !== void 0) {
    if (!reattachTarget)
      return (
        logForDebugging(
          "[bridge:repl] Skipping: work secret supplied but this init has no session to reattach (no target, or the target was vetoed)",
          { level: "error" },
        ),
        logBridgeSkip("work_secret_no_target", void 0, !0),
        onStateChange?.(
          "failed",
          "Remote Control could not attach: no session to attach the host credential to",
          "terminal",
        ),
        null
      );
    try {
      workSecretLane = refreshWorkSecret({
        secret: workSecret,
        sessionId: reattachTarget,
        apiBaseUrl: baseUrl,
        requestFreshSecret: onWorkSecretRefresh,
      });
    } catch (error) {
      return (
        logForDebugging(`[bridge:repl] Skipping: ${errorMessage(error)}`, { level: "error" }),
        logBridgeSkip("work_secret_rejected", void 0, !0),
        onStateChange?.("failed", `Remote Control could not attach: ${errorMessage(error)}`, "terminal"),
        null
      );
    }
    if (machineLaneVersionRefusal() !== null) {
      let e = () => $Je(reattachTarget, { baseUrl: baseUrl, credentials: credentials }),
        branch = await e();
      if (branch === null) (await sleep(2000), (branch = await e()));
      let r = machineLaneVersionRefusal();
      if (r !== null && isMachineLaneWork(branch, r)) {
        let h =
          branch === null
            ? `Remote Control could not attach: the session's record could not be read. ${r.message}`
            : `Remote Control could not attach: ${r.message}`;
        return (
          logForDebugging(`[bridge:repl] Skipping: ${h}`, { level: "error" }),
          logBridgeSkip("machine_lane_floor", void 0, !0),
          logFeatureBad(
            "bridge_machine_lane_floor",
            branch === null ? `session_unread_${r.reason}` : r.reason,
          ),
          onStateChange?.("failed", h, "terminal"),
          null
        );
      }
    }
    logForDebugging(
      `[bridge:repl] Attaching ${reattachTarget} with the host's work secret (worker-credential path)`,
    );
  }
  if (takingOverLocalHolder) logEvent("tengu_bridge_restored_pointer_takeover", {});
  let Je,
    Xn = 0,
    Jn = getEmptyToolPermissionContext(),
    Ke,
    Zn = limitConcurrency(1, readFileForRemote),
    bridgeHandle = (ce = await initEnvLessBridgeCore({
      titleWriter: titleWriter,
      noHistoryBackfill: historyBackfillSuppressed && Be?.uncertaintyOnly !== !0,
      neutralFallbackTitle: Wt,
      onReattachGoneBounce: () => {
        (be.add(Wt),
          (historyBackfillSuppressed = !0),
          onHistoryBackfillSuppressed?.(),
          holdPrecautionarySuppressionFor(boundSessionKey),
          markPrecautionClearResilientFor(boundSessionKey),
          claimPrecautionHoldForObservedCause(boundSessionKey),
          applyDeferredOwnerVeto());
      },
      reattachSessionId: reattachTarget,
      reattachSequenceNum: reattachSeq,
      reattachOrFail: mustReattach,
      reattachOrigin: reattachOriginLabel,
      reviveInitiated: reviveInitiated,
      neverArchive: neverArchive,
      onAuthProven: onAuthProven,
      onReattachPointerDead: () => {
        if (
          (applyDeferredOwnerVeto(),
          holdPrecautionarySuppressionFor(boundSessionKey),
          markPrecautionClearResilientFor(boundSessionKey),
          claimPrecautionHoldForObservedCause(boundSessionKey),
          !tornEntryPair)
        )
          clearBridgeSession(boundSessionKey, lt, lt ? { targetExists: !0 } : void 0, storageV5);
        onReattachPointerDead?.();
      },
      baseUrl: baseUrl,
      orgUUID: orgUUID,
      title: title,
      ownerPin: Gn,
      fixedCredentialNow: zn,
      onOwnerChanged: teardownOnOwnerChange,
      getAccessToken: getBridgeSessionsAccessToken,
      onAuth401: (e, n) => recoverCloudSessionsBearer(e, credentials, storageV5, n),
      classifyFailedOAuthRefresh: classifyFailedOAuthRefresh,
      onReadFreshOAuthToken: async () => {
        let e = await readFreshOAuthAccessToken(credentials);
        return e !== void 0 && wasLauncherHostLoginToken(e) ? void 0 : e;
      },
      onClassifyMissingOAuthToken: Kn,
      onProactiveRefresh: async () => {
        await checkAndRefreshOAuthTokenIfNeeded({ credentials: credentials, storageV5: storageV5 });
      },
      toSDKMessages: mr(getTools),
      placeAccountMemoryTool: createMemoryServerVerifier(() => getTools?.()),
      accountMemoryInPlay: () => qHt(host),
      initialHistoryCap: $n,
      initialMessages: historyBackfillSuppressed ? void 0 : initialMessages,
      conversationForPairing: () => getMessages?.() ?? initialMessages ?? [],
      remoteControlOrigin: historyBackfillSuppressed ? void 0 : remoteControlOrigin,
      getBackfillMessages: (e) =>
        historyBackfillSuppressed || isBridgeBindingForeign() || Ae() ? void 0 : getBackfillMessages?.(e),
      gitRepoUrl: gitRepoUrl,
      branch: branch,
      defaultBranch: defaultBranch,
      nameSourceForCreate: outboundOnly ? void 0 : nameSourceForCreate,
      onInboundMessage: onInboundMessage,
      onQueuedNotification: onQueuedNotification,
      onUserMessage: onUserMessage,
      onSessionEstablished: (e) => {
        if (
          (We?.teardown(),
          (We = startClientPresencePulse(
            toInfraSessionId(e),
            baseUrl,
            () => {
              let r = getBridgeSessionsAccessToken();
              if (!r || ownerChangedTornDown) return null;
              return { Authorization: `Bearer ${r}` };
            },
            async (r) =>
              (await recoverHostSessionsBearer(r.Authorization?.replace(/^Bearer /, "") ?? "")) ===
              "recovered",
          )),
          qrt() && !isEssentialTrafficOnly())
        )
          hydrateNotificationPreferences(storageV5);
        let n = getCurrentSessionAgentColor();
        if (n && n !== "default")
          updateBridgeSessionColorTag(e, n, AGENT_COLOR_NAMES, {
            baseUrl: baseUrl,
            getAccessToken: getBridgeSessionsAccessToken,
          });
      },
      onBeforePushTriggeringState: () => We?.pulseIfClientPresent(),
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
      onRenameSession: handleRemoteRename,
      onSetColor: onSetColor,
      async onFileSuggestions(e) {
        return (await generateFileSuggestions(globalFileIndexCache, e, !0, storageV5)).map((r) => ({
          path: r.displayText,
        }));
      },
      onReadFile: (e, n, r, h) =>
        (h === void 0 ? readFileForRemote : Zn)(
          e,
          n,
          () => getToolPermissionContext?.() ?? getEmptyToolPermissionContext(),
          { encoding: r, anchor: h, telemetrySource: "repl_bridge" },
        ),
      onGetWorkspaceDiff: host
        ? (opts) => {
            let n = getToolPermissionContext?.() ?? Jn,
              r = Ke;
            if (
              ((Ke = void 0),
              r && r.permissionContext === n && Date.now() - r.settledAt <= WORK_SECRET_REFRESH_WINDOW_MS)
            )
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
                    if (Je === O) Je = void 0;
                  }),
              };
              ((Je = O), (h = O));
            }
            let R = h;
            if (!opts.aborted)
              (R.pendingWaiters++,
                opts.addEventListener(
                  "abort",
                  () => {
                    R.pendingWaiters--;
                  },
                  { once: !0 },
                ));
            return R.promise;
          }
        : void 0,
      async onSideQuestion({ question: e, history: n }, { signal: r, onProgress: h }) {
        if (historyBackfillSuppressed || isBridgeBindingForeign() || Ae())
          return (
            logForDebugging("[bridge:repl] side_question refused: current conversation egress is barred"),
            { response: null, synthetic: !1 }
          );
        let R = createAbortController(),
          O = () => R.abort();
        if (r.aborted || versionError_2.signal.aborted) O();
        (r.addEventListener("abort", O, { once: !0 }),
          versionError_2.signal.addEventListener("abort", O, { once: !0 }));
        try {
          let ee = await runSideQuestionWithProgress({
            question: e,
            history: n,
            parentController: R,
            onProgress: h,
            getLiveMessages: getMessages,
            isTurnInProgress: isTurnActive,
          });
          if (ee.cancelled) throw new AbortError("Side question cancelled");
          return ee.response;
        } finally {
          (r.removeEventListener("abort", O), versionError_2.signal.removeEventListener("abort", O));
        }
      },
      onMcpAuthenticate: onMcpAuthenticate,
      onMcpOauthCallbackUrl: onMcpOauthCallbackUrl,
      onMcpReconnect: onMcpReconnect,
      onForkConversation: onForkConversation,
      onBridgeInjectedMcp: onBridgeInjectedMcp,
      onProjectsBindingHint: onProjectsBindingHint,
      onGetContextUsage: onGetContextUsage,
      answerSharedControlRequest: answerSharedControlRequest,
      onStateChange: onStateChange,
      outboundOnly: outboundOnly,
      tags: tags,
      sessionGroupingId: groupingId,
      requestedSessionGroupingId: sessionGroupingId,
      onTransportRebuilt: onTransportRebuilt,
      storageV5: storageV5,
      credentialsStore: credentials,
      workSecretCredentials: workSecretLane,
      ...(enableSessionPersistence ? persistenceHooks : {}),
    }));
  if (bridgeHandle) {
    let e = bridgeHandle.detachForHandoff?.bind(bridgeHandle);
    bridgeHandle.detachForHandoff = () => {
      (teardownOnOwnerChange(), e?.());
    };
    let n = bridgeHandle.teardown.bind(bridgeHandle);
    if (
      ((bridgeHandle.teardown = async (err) => {
        ((ht = !0), versionError_2.abort(), titleWriter.forget(bridgeHandle.bridgeSessionId), await n(err));
      }),
      ownerChangedTornDown)
    )
      retireBridgeHandle(bridgeHandle, storageV5);
    ((bridgeHandle.selfTitle = title),
      (bridgeHandle.adoptLocalAiTitle = Ln),
      (bridgeHandle.ownerVetoed = ownerVetoed),
      (bridgeHandle.serverVouch = Qe ?? (_e ? ct : void 0)));
  }
  return wrapTeardownWithPresence(bridgeHandle, () => We);
}
