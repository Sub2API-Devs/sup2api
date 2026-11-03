/**
 * remote/tools/serve/serveCall.ts
 *
 * 2.1.316 新增：服务端执行一次远程工具调用的主流程与遥测
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5ghnps9r.js (1), chunk-ad2e1aj6.js (21)
 * attribution: placement 22
 */
import { randomUUID } from "crypto";
import { logEvent } from "../../../services/analytics/index.js";
import { sanitizeMarkName } from "../../../utils/startupMarks.js";
import {
  unattendedServingConsentViewIsFresh,
  freshUnattendedServingConsent,
  unattendedServingAllowedByHostFlag,
  unattendedServingConsentPending,
} from "../../../services/remoteTools/unattendedConsentStore.js";
import { getToolRemoteExecution, findToolByName } from "../../../Tool.js";
import {
  unsupportedFieldRefusal,
  withoutEditKeys,
  stripTargetField,
  renameInputFields,
  SIMULATED_SED_EDIT_KEY,
  pickKnownFields,
  unrenameOutputFields,
  renamedFieldCacheMap,
} from "../../../services/remoteTools/pathMapping.js";
import {
  refusedEnvelope,
  createNoteSet,
  sessionModeFromStamp,
  isServedNutEnabled,
} from "./backgroundCommands.js";
import { defaultServedCallRunner, callerKey, decidingInput, callFailedText } from "./servedShellSettings.js";
import { logRemoteTools } from "../../../services/remoteTools/remoteToolsDebug.js";
import {
  tooManySessionsMessage,
  withdrawnRequestMessage,
  staleApprovalMessage,
  unsupportedFieldMessage,
  expiredApprovalMessage,
  admissionChangedMessage,
  credentialRefusalMessage,
  tooManyPendingApprovalsMessage,
  vmUnavailableMessage,
  settingsUnreadableMessage,
  backgroundStopReasonText,
} from "../../../services/remoteTools/hostRefusals.js";
import {
  resetCallerReadStateOnClear,
  withdrawAskedCall,
  recordSessionDenial,
  settleAskedCall,
  askEndedDenial,
} from "./pendingAsks.js";
import { joinKnownCall, joinRetry, callDeadlineMs, createCallLifetime } from "./callLedger.js";
import {
  platformPathGuard,
  arrivesOverSession,
  acceptsArrival,
  callerKindForArrival,
  deviceFrame,
  parseExecutionMode,
} from "./servingPolicy.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "../consentText.js";
import { stableHashWithSalt } from "../../../utils/stableHash.js";
import { isSessionDenial, failedEnvelope, rebindEnvelopeCallId } from "./callStatusQuery.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../../services/analytics/featureTelemetry.js";
import { REPLACED_BY_RETRY, TERMINAL_CALL_STATES } from "../servedCallLog.js";
import { SYNC_ANSWER_TTL_MS } from "../../../services/remoteTools/shellForwarding.js";
import {
  servingConsentRequirement,
  callResultEnvelope,
  stoppedBeforeStart,
  timedOutOrCancelled,
  callNotRunEnvelope,
  isPermissionGranted,
} from "./callOutcomeText.js";
import {
  autoModeRefusedForServedCalls,
  autoOffNotice,
  autoModeRefusedForServedCallsWhy,
} from "./servedAutoMode.js";
import {
  isPlanFloor,
  REMOTE_CALL_SESSION_ANSWER,
  servedPermissionContext,
  servedModeTelemetry,
  tryAutoModeAllowlist,
  effectiveServedMode,
} from "./servedPermissionDecision.js";
import {
  sessionDeclineDenial,
  acknowledgedEnvelope,
  keepStandingApprovals,
  needsApprovalEnvelope,
} from "./sessionApprovals.js";
import { logForDebugging } from "../../../utils/debug.js";
import { errorMessage, toError, isAbortError, isENOENT } from "../../../utils/errors.js";
import { createChildAbortController_2, createAbortController } from "../../../utils/abortController.js";
import { needsApprovalSuggestions } from "../../../tools/PowerShellTool/PowerShellTool.js";
import { clampToMaxPageSize } from "../callResults.js";
import { formatDuration } from "../../../utils/format.js";
import { isNonMcpShellTool, isShellToolName } from "../../../tools/shared/textSearchTools.js";
import {
  HOOK_NOT_ACCEPTED_NOTICE,
  lastIfStoppedQuestion,
  SERVED_HOOK_NOTICES,
  READ_LIMIT_BLOCKED_QUESTION,
  READ_LIMIT_SET_NOTICE,
  SKIPS_UNSAFE_HOOKS_NOTICE,
  lastIfChangedQuestion,
  findLastMatchingQuestion,
  SERVED_HOOK_UPDATED_ACCEPTED,
  HOOK_UPDATED_ACCEPTED_NOTICE,
  SERVED_HOOK_SET_ASIDE,
  HOOK_SET_ASIDE_NOTICE,
  SERVED_HOOK_UPDATE_NOTICES,
} from "../../../utils/hooks/servedHooks/notices.js";
import { canonicalNameKeeping1m } from "../../../utils/model/canonicalModelName.js";
import { logError } from "../../../utils/log.js";
import { settingsSourcesInReach } from "../../../utils/hooks.js";
import { normalizeCommandForPlatform } from "../../../utils/git.js";
import { drainPendingKillBackstops } from "../../../utils/ShellCommand.js";
import { servedToolPath, isMountPointRule, stripDoubleSlashPrefix } from "./servedPathJudgement.js";
import { HOST_CREDENTIAL_RULE_SOURCE, isUnderUserProfiles } from "./credentialPathGuards.js";
import { credentialRuleKind } from "./servedSafetyChecks.js";
import { cancelledToolResult } from "./resultShaping.js";
import { isRanOutcome, REMOTE_TOOL_PROTOCOL_VERSION, serverVerdictKind } from "../protocolConstants.js";
import { SANDBOX_MAX_DEPTH } from "../../../utils/sandbox/sandboxDefaultPolicy.js";
import { SESSION_APPROVAL_STALE_MS, isWindowsSandboxPolicyViolation } from "./servingState.js";
import { isMultiEntryAliasTool } from "../../../services/tools/permissionCheckGuard.js";
import { BASH_TOOL_NAME } from "../../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../../tools/PowerShellTool/toolName.js";
import { getFsImplementation, safeResolvePath } from "../../../utils/fsOperations.js";
import { isSpecialPath } from "../../../utils/fsBoundRead.js";
import { isSettingSourceEnabled } from "../../../utils/settings/constants.js";
import {
  getSettingsParseErrorsForSource,
  getSettingsFilePathForSource,
} from "../../../utils/settings/settings.js";
import { parseSettingsFileIfChanged } from "../../../utils/settings/settingsFileParsing.js";
import { shortHash } from "../../../utils/shortHash.js";
import { lit, fromEnumOpt, fromEnum } from "../../../services/analytics/safeMetadata.js";
import { REMOTE_TOOL_PROTOCOL_LABEL } from "../protocolSchemas.js";
import { jsonStringify } from "../../../utils/slowOperations.js";

//@ chunk-ad2e1aj6.js:43267-43284 placement
var SERVING_KIT_INSTANCE_ID = randomUUID();
var servingKitFrameCounter = 0;
//@ chunk-ad2e1aj6.js:43284-43314 placement
function nextServingKitFrameSeq() {
  servingKitFrameCounter += 1;
  return servingKitFrameCounter;
}
//@ chunk-ad2e1aj6.js:43314-43565 placement
function noteLateHoldRelease(facts, n, s) {
  if (!n || !s.wasAnsweredAheadOfItsKills()) return;
  facts.holdStandsAtAnswer = true;
  let now = Date.now();
  s.holdMayGo
    .then(() =>
      logEvent("tengu_remote_tool_hold_released_late", {
        call_id: sanitizeMarkName(facts.callId),
        second_leg: facts.secondLeg,
        late_ms: Date.now() - now,
      }),
    )
    .catch(() => {});
}
//@ chunk-ad2e1aj6.js:43565-62338 placement
/**
 * 远程工具服务端的单次调用全流程：无人值守同意、输入校验、权限判定（会话询问/分类器/钩子）、执行、结果与遥测。
 */
async function serveToolCall(e) {
  let { tool, wireArguments, ctx, deps, facts } = e;
  if (deps.policy.stance.unattended !== "conveyed" && !unattendedServingConsentViewIsFresh())
    await freshUnattendedServingConsent(ctx.signal);
  let toolRemoteExecution = getToolRemoteExecution(tool);
  let fields =
    deps.policy.refusedInputFields?.(tool) ??
    (toolRemoteExecution.supported ? (toolRemoteExecution.refusedInputFields ?? []) : []);
  let R = unsupportedFieldRefusal(e.toolInput, fields, deps.targetName);
  if (R !== undefined) return refusedEnvelope(e.target, facts, "refused_field", R);
  let w = executionPlacement(deps);
  if (w.where === "refused") return refusedEnvelope(e.target, facts, "sandbox_unavailable", w.message);
  let { executor } = w;
  let P = executor === defaultServedCallRunner;
  let x = deps.policy.constraints(tool, deps.launchDir, {
    approvalAttested: facts.approvalAttested,
  });
  let Y =
    deps.policy.stance.unattended === "own_record" && unattendedServingAllowedByHostFlag()
      ? {
          ...x,
          sandbox: "required",
          scrubCredentialEnv: true,
        }
      : x;
  let F = withoutEditKeys(e.toolInput, fields);
  let D = deps.sessions.forCaller(callerKey(ctx));
  if (D === undefined) {
    facts.seatsFull = true;
    logRemoteTools(facts.envelope?.call_id, "capacity refused", {
      sessions_in_use: deps.sessions.size,
      sessions_limit: deps.sessions.limit,
    });
    return refusedEnvelope(
      e.target,
      facts,
      "too_many_in_flight",
      tooManySessionsMessage({
        targetName: deps.targetName,
        limit: deps.sessions.limit,
      }),
    );
  }
  let callId = facts.envelope?.call_id;
  let approval = facts.envelope?.approval;
  resetCallerReadStateOnClear(D, facts.envelope);
  let M = ctx.sessionId === undefined ? undefined : deps.dirSyncOf?.(ctx.sessionId);
  if (callId !== undefined && approval === undefined && !facts.enteredRecord)
    if (
      D.calls.receive(callId, {
        retryKey: decidingInput(tool, e.toolInput, D.cwd ?? deps.launchDir),
        workerEpoch: ctx.workerEpoch,
      })
    )
      facts.enteredRecord = true;
    else {
      let S = D.calls.lookup(callId);
      if (S !== undefined)
        return joinKnownCall({
          known: S,
          session: D,
          hostEpoch: deps.sessions.epoch,
          callId,
          target: e.target,
          facts,
        });
    }
  let cwd = D.cwd;
  let ee = Y.pinCwd || cwd === undefined ? deps.launchDir : cwd;
  let q = {
    ...e.target,
    working_dir: deps.announcedDir ?? ee,
  };
  let ae = approval === undefined ? platformPathGuard(tool, F, ee) : undefined;
  if (ae !== undefined) {
    facts.pathOverLimit = true;
    return refusedEnvelope(
      q,
      facts,
      "invalid_request",
      REMOTE_TOOLS_CONSENT_TEXT["refused.path_too_long"](deps.targetName, ae),
    );
  }
  let fe = stableHashWithSalt(tool.name, F);
  facts.inputFingerprint = fe;
  let V = (callId, G) => {
    if (callId !== undefined) D.calls.remember(callId, G);
  };
  let K = (callId, G) => {
    if (callId !== undefined) D.calls.settle(callId, G, isSessionDenial(G));
  };
  if (callId !== undefined && approval === undefined) {
    let S = D.calls.retryOf(callId);
    if (S !== undefined && !isServedReadOnly(tool, F, deps)) {
      let { summary } = S.call;
      let re =
        summary.state === "asked" && summary.askId !== undefined
          ? D.pendingAsks.peek(summary.askId)
          : undefined;
      if (re === undefined || re.redeemingLegs > 0)
        return joinRetry({
          session: D,
          joined: S,
          hostEpoch: deps.sessions.epoch,
          callId,
          target: q,
          facts,
          workerEpoch: ctx.workerEpoch,
        });
      logRemoteTools(callId, "retry replaced ask", {
        replaced_call: S.callId,
        ask_id: re.askId,
        worker_epoch: ctx.workerEpoch,
      });
      if (facts.arrivedOver !== "relay") logFeatureSad("remote_tool_serve", "ask_replaced_by_retry");
      withdrawAskedCall(D, re.askId, {
        reason: REPLACED_BY_RETRY,
        message: withdrawnRequestMessage({
          targetName: deps.targetName,
          reason: REPLACED_BY_RETRY,
        }),
      });
      let ie = D.calls.lookup(S.callId)?.result;
      let De = {
        state: "failed",
        code: REPLACED_BY_RETRY,
      };
      if (ie === undefined) V(S.callId, De);
      else D.calls.settle(S.callId, ie, De);
    }
    if (facts.enteredRecord) D.calls.rekey(callId, decidingInput(tool, e.toolInput, D.cwd ?? deps.launchDir));
  }
  if (approval !== undefined) {
    let S = D.pendingAsks.peek(approval.ask_id);
    if (S === undefined) {
      let ie = callId === undefined ? undefined : D.calls.lookup(callId);
      return ie !== undefined && callId !== undefined
        ? joinKnownCall({
            known: ie,
            session: D,
            hostEpoch: deps.sessions.epoch,
            callId,
            target: q,
            facts,
          })
        : refusedEnvelope(
            q,
            facts,
            "invalid_request",
            approval.decision === "deny"
              ? `That permission request was no longer pending on ${deps.targetName} \u2014 nothing ran and nothing will.`
              : staleApprovalMessage({
                  targetName: deps.targetName,
                  why: "gone",
                }),
          );
    }
    facts.askedInMode = S.askedInMode;
    let G = {
      ...e.target,
      working_dir: deps.announcedDir ?? S.startCwd,
    };
    let re = S.callId !== undefined && S.callId === callId;
    if (approval.decision === "deny" && !re) {
      facts.askStillPending = true;
      return refusedEnvelope(
        G,
        facts,
        "invalid_request",
        `That decline named a different call than the pending question on ${deps.targetName} \u2014 the question is still pending and nothing ran.`,
      );
    }
    if (approval.decision === "deny" || (re && S.fingerprints.includes(fe))) {
      let ie = stripTargetField(
        approval.updated_input === undefined
          ? undefined
          : renameInputFields(approval.updated_input, wireArguments),
        deps.targetName,
      );
      if (ie !== undefined && approval.decision === "allow") {
        let se =
          unsupportedFieldRefusal(ie, fields, deps.targetName) ??
          (SIMULATED_SED_EDIT_KEY in ie
            ? unsupportedFieldMessage({
                field: SIMULATED_SED_EDIT_KEY,
                targetName: deps.targetName,
              })
            : undefined);
        if (se !== undefined) {
          facts.askStillPending = true;
          return refusedEnvelope(G, facts, "refused_field", se);
        }
        if (
          !S.fingerprints.includes(
            stableHashWithSalt(tool.name, pickKnownFields(S.evaluatedInput, withoutEditKeys(ie, fields))),
          )
        ) {
          facts.askStillPending = true;
          return refusedEnvelope(
            G,
            facts,
            "invalid_request",
            `An approval cannot change the call it approves on ${deps.targetName} \u2014 nothing ran and the request is still pending. Send the changed call as a new one.`,
          );
        }
      }
      if (approval.decision === "allow") {
        let se = Date.now() - S.createdAt;
        let Ae = arrivesOverSession(S.raisedOver) || arrivesOverSession(facts.arrivedOver);
        if ((!Ae || deps.policy.limits.max_ask_ms !== undefined) && se > SYNC_ANSWER_TTL_MS) {
          let xe = expiredApprovalMessage({
            targetName: deps.targetName,
            askAgeMs: se,
            windowMs: SYNC_ANSWER_TTL_MS,
            dated: Ae,
          });
          withdrawAskedCall(D, approval.ask_id, {
            reason: "stale_answer",
            message: xe,
          });
          facts.staleLeg = {
            ageMs: se,
            windowMs: SYNC_ANSWER_TTL_MS,
            judgedBy: Ae ? "dated_ask_age" : "ask_age",
          };
          logRemoteTools(callId, `${Ae ? "aged" : "undated"} allow refused`, {
            ask_age_ms: Math.round(se),
            window_ms: SYNC_ANSWER_TTL_MS,
          });
          return refusedEnvelope(G, facts, "stale", xe, {
            reason: "stale_answer",
          });
        }
      }
      if (acceptsArrival(S.raisedOver, facts.arrivedOver)) {
        let se = callerKindForArrival(
          facts.arrivedOver,
          deps.registrationTransport ?? "auto",
          {
            attested: approval.attested,
            callerKind: facts.envelope?.caller.kind,
            toolName: tool.name,
            isServedMcpTool: tool.isMcp === true,
            sessionMode: facts.sessionMode,
            askedInMode: S.askedInMode,
            classifierEligible: S.classifierEligible,
            autoModeRefusedHere:
              w.where === "handed_on"
                ? servingConsentRequirement(deps.policy.stance.unattended) !== undefined
                : deps.policy.stance.unattended === "conveyed" || autoModeRefusedForServedCalls(),
            planClaimBackedHere: isPlanFloor(facts.sessionMode, deps.policy.stance.unattended),
            serverVerdict: facts.serverVerdict,
          },
          facts.trust,
        );
        facts.approvalAttested = se === "attested";
        if (approval.decision === "allow") facts.approvalBasis = se;
      }
      if (approval.decision === "allow" && facts.approvalBasis === undefined) {
        facts.askStillPending = true;
        return refusedEnvelope(
          G,
          facts,
          "no_approval",
          acceptsArrival(S.raisedOver, facts.arrivedOver)
            ? `The approval for this call could not be verified as the person's own, so ${deps.targetName} did not run it; the request is still pending.`
            : `The approval for this call arrived over a different channel than the one the request was put on, so ${deps.targetName} did not run it; the request is still pending.`,
        );
      }
      facts.forceAsk = S.raisedToAsk;
      if (approval.decision === "deny") {
        facts.deniedBySession = true;
        if (facts.approvalAttested) S.onDeclined?.();
        recordSessionDenial(D, approval.ask_id, sessionDeclineDenial(approval.feedback));
        return acknowledgedEnvelope(G, facts, approval.ask_id);
      }
      let De = () => {
        let se = callId === undefined ? undefined : D.calls.lookup(callId);
        return se !== undefined && callId !== undefined
          ? joinKnownCall({
              known: se,
              session: D,
              hostEpoch: deps.sessions.epoch,
              callId,
              target: q,
              facts,
            })
          : refusedEnvelope(
              G,
              facts,
              "invalid_request",
              staleApprovalMessage({
                targetName: deps.targetName,
                why: "gone",
              }),
            );
      };
      let $e = (se, Ae) => {
        let xe = {
          ...failedEnvelope(G, facts, se, Ae),
          ...(P && {
            ranNothing: true,
          }),
        };
        return settleAskedCall(D, approval.ask_id, xe, askEndedDenial(Ae)) ? xe : De();
      };
      if (callDeadlineMs(deps.policy.limits, facts.envelope) - (Date.now() - facts.startedAt) <= 0)
        return $e(
          "timed_out",
          `The approval reached ${deps.targetName} with no time left to run the call (admission took longer than the caller allowed) \u2014 nothing ran, and the approval is used up. Run the tool again if it is still needed.`,
        );
      let aborted = M?.holdInstalls !== undefined && ctx.signal.aborted;
      if (aborted) facts.stoppedBeforeHold = true;
      let dt = `${approval.ask_id}:${randomUUID()}`;
      let fn = false;
      let Ve =
        M?.holdInstalls === undefined || aborted
          ? null
          : Promise.resolve(M.holdInstalls(dt, () => !fn && !S.isPipelineOver())).catch(() => {});
      let pn = () =>
        void Ve?.then(() => {
          try {
            M?.releaseInstalls?.(dt);
          } catch (error) {
            logForDebugging(`[remote-tools] releasing the install hold failed: ${errorMessage(error)}`, {
              level: "warn",
            });
          }
        });
      let Ye = () => {
        fn = true;
        pn();
      };
      if (Ve !== null) {
        let se = false;
        Ve.then(() => {
          se = true;
        });
        let Ae = callDeadlineMs(deps.policy.limits, facts.envelope) - (Date.now() - facts.startedAt);
        let now = Date.now();
        await Promise.race([
          Ve,
          createChildAbortController_2(ctx.signal),
          ...(Number.isFinite(Ae)
            ? [createChildAbortController_2(AbortSignal.timeout(Math.max(0, Ae)))]
            : []),
        ]);
        facts.holdMs = Date.now() - now;
        if (!se) {
          Ye();
          return $e(
            ctx.signal.aborted ? "cancelled" : "timed_out",
            `The approval reached ${deps.targetName}, but the call was stopped before the command started \u2014 nothing ran, and the approval is used up. Run the tool again if it is still needed.`,
          );
        }
      }
      let hn = w.where === "handed_on" && facts.approvalBasis === "auto_arm";
      if (hn && !unattendedServingConsentViewIsFresh()) await freshUnattendedServingConsent(ctx.signal);
      if (hn && servingConsentRequirement(deps.policy.stance.unattended) !== undefined) {
        Ye();
        facts.approvalBasis = undefined;
        facts.askStillPending = true;
        return refusedEnvelope(
          G,
          facts,
          "no_approval",
          `${deps.targetName} no longer lets a classifier approve this call, so it did not run; the request is still pending for a person.`,
        );
      }
      if (D.pendingAsks.take(approval.ask_id) === undefined) {
        Ye();
        return De();
      }
      let bt = w.where === "here" ? executionPlacementRefusal(deps) : undefined;
      if (bt !== undefined) {
        Ye();
        let se = {
          ...refusedEnvelope(G, facts, "sandbox_unavailable", bt),
          ranNothing: true,
        };
        K(S.callId, se);
        S.windDown();
        S.answer(askEndedDenial(bt));
        return se;
      }
      S.holdMayGo.then(pn);
      let settled = S.settled;
      settled.catch(() => {});
      let now = Date.now();
      try {
        if (S.callId !== undefined && !ctx.signal.aborted) {
          V(S.callId, {
            state: "running",
            started: true,
          });
          deps.callLog?.note({
            t: "started",
            caller: D.callerSessionId,
            call_id: S.callId,
            tool: tool.name,
            input_fp: fe,
            by: "session",
            basis: facts.approvalBasis,
          });
        }
        S.resume({
          signal: ctx.signal,
          startedAt: facts.startedAt,
          expiresInMs: callDeadlineMs(deps.policy.limits, facts.envelope),
        });
        if (facts.arrivedOver !== "session" || facts.approvalAttested)
          S.onApproved?.({
            attested: facts.approvalAttested,
          });
      } catch (error) {
        Ye();
        facts.askEndedByThrow = true;
        let Ae = {
          ...callFailureEnvelope(error, G, facts, ctx.signal, {}),
          ...(P && {
            ranNothing: true,
          }),
        };
        K(S.callId, Ae);
        S.windDown();
        S.answer(askEndedDenial(callFailedText(deps.targetName)));
        return Ae;
      }
      S.answer({
        behavior: "allow",
        updatedInput: S.evaluatedInput,
        decisionReason: {
          type: "other",
          reason: REMOTE_CALL_SESSION_ANSWER,
        },
      });
      if (
        facts.approvalAttested &&
        deps.policy.capabilities?.includes("standing_approvals") === true &&
        S.standingRowOffered
      )
        await keepStandingApprovals(D, approval.permission_updates, facts, {
          toolName: tool.name,
          input: S.evaluatedInput,
          offered: needsApprovalSuggestions(S.asked.envelope),
        }).catch((error) => {
          logRemoteTools(
            callId,
            "standing approval not kept",
            {
              error: error instanceof Error ? error.name : "unknown",
            },
            "warn",
          );
        });
      let lt = await settled;
      noteLateHoldRelease(facts, Ve !== null, S);
      facts.captureAtPipelineEnd = S.takesCaptureAtPipelineEnd();
      facts.pipelineMs = Date.now() - now;
      facts.truncated = lt.envelope.outcome === "completed" && lt.envelope.truncated === true;
      if (S.pipelineCallId === undefined) return lt;
      logRemoteTools(S.callId, "carried run settled", {
        pipeline_call: S.pipelineCallId,
      });
      let Sn = rebindEnvelopeCallId(lt, S.callId);
      K(S.callId, Sn);
      return Sn;
    }
  }
  if (approval !== undefined) {
    let S = callId === undefined ? undefined : D.calls.lookup(callId);
    if (S !== undefined && callId !== undefined)
      return joinKnownCall({
        known: S,
        session: D,
        hostEpoch: deps.sessions.epoch,
        callId,
        target: q,
        facts,
      });
    facts.askStillPending = true;
    return refusedEnvelope(
      q,
      facts,
      "invalid_request",
      staleApprovalMessage({
        targetName: deps.targetName,
        why: "other",
      }),
    );
  }
  let Se = (S) => V(callId, S);
  let stance = deps.policy.stance;
  let abortController = createAbortController();
  let X = clampToMaxPageSize(callDeadlineMs(deps.policy.limits, facts.envelope));
  let ce = X - (Date.now() - facts.startedAt);
  if (ce <= 0) {
    Se({
      state: "failed",
      code: "timed_out",
      ranNothing: true,
    });
    return {
      ...failedEnvelope(
        q,
        facts,
        "timed_out",
        `The call reached ${deps.targetName} with no time left before its ${formatDuration(Math.max(1000, X))} deadline (admission took longer than the caller allowed) \u2014 nothing ran.`,
      ),
      ranNothing: true,
    };
  }
  let ge = isNonMcpShellTool(tool) || tool.mcpInfo !== undefined;
  let _e = {
    facts,
    target: q,
    targetName: deps.targetName,
    callId,
    controller: abortController,
    clock: createCallLifetime({
      remainingMs: ce,
      controller: abortController,
      leg: ctx.signal,
      lifetime: deps.lifetime,
    }),
    notes: createNoteSet(),
    permissionOutcome: undefined,
    toolVerdict: undefined,
  };
  if (deps.projectHookWaitingFor?.(callerKey(ctx)) === true)
    _e.notes.add("project_hook_waiting", HOOK_NOT_ACCEPTED_NOTICE);
  let { clock } = _e;
  let te;
  let promise = new Promise((resolve) => {
    te = resolve;
  });
  let sessionModel =
    facts.envelope?.caller.model !== undefined
      ? canonicalNameKeeping1m(facts.envelope.caller.model, {
          overridesMap: {},
        })
      : undefined;
  let ke;
  let onOutcome = (S) => {
    ke?.giveUp();
    _e.permissionOutcome = S;
    facts.forceAsk = S.raisedToAsk;
    facts.throughSecondRootMount = S.throughSecondRootMount;
    facts.allowBasis = S.allowBasis;
    facts.denySource = S.denySource;
    facts.hostCredentialRefusal = S.hostCredentialRefusal;
    facts.underWindowsProfileGlob = S.underWindowsProfileGlob;
    facts.rulesCheckCrashed = S.rulesCheckCrashed && true;
    facts.inputParseThrew = S.rulesCheckCrashed?.inputParseThrew || undefined;
    facts.crashClass = S.rulesCheckCrashed?.crashClass;
    facts.deniedUnderForcedAsk = S.deniedUnderForcedAsk;
    let G = (S.kind === "allowed" || S.kind === "approved_by_session") && !abortController.signal.aborted;
    if (G)
      Se({
        state: "running",
        started: true,
      });
    if (G && S.kind === "allowed" && callId !== undefined)
      deps.callLog?.note({
        t: "started",
        caller: D.callerSessionId,
        call_id: callId,
        tool: tool.name,
        input_fp: fe,
        by: "host",
        basis: S.allowBasis,
      });
    if ((S.kind === "allowed" || S.kind === "approved_by_session") && Y.maxTimeoutMs === undefined && ge) {
      clock.enterRunning();
      logRemoteTools(callId, "running: call deadline disarmed", {
        epoch: deps.sessions.epoch,
        outcome: S.kind,
      });
    }
  };
  let onAsk = (S) => {
    ke?.giveUp();
    facts.forceAsk = S.raisedToAsk;
    facts.askClass = S.askClass;
    facts.mcpPathWhy = S.mcpPathWhy;
    try {
      if (deps.ownSettingsWaitingFor?.(callerKey(ctx)) === true)
        _e.notes.add(
          "own_settings_waiting",
          REMOTE_TOOLS_CONSENT_TEXT["served_settings.own_waiting.session_note"],
        );
    } catch (error) {
      logError(toError(error));
    }
    te?.(S);
  };
  let toolUseId = `remote_${randomUUID()}`;
  Se({
    state: "running",
  });
  let Ee = `ask_${randomUUID()}`;
  if (stance.honorLocalRules)
    await settingsSourcesInReach(
      (await deps.reach.current()).map(normalizeCommandForPlatform),
      deps.storageV5,
      deps.reach.distrustedSources,
    );
  let vt = Ee;
  let Ie = null;
  let He = false;
  let tt = () => {
    if (Ie !== null && !He) {
      He = true;
      Ie.then(() => {
        try {
          M?.releaseInstalls?.(vt);
        } catch (error) {
          logForDebugging(`[remote-tools] releasing the install hold failed: ${errorMessage(error)}`, {
            level: "warn",
          });
        }
      });
    }
  };
  let We;
  let Ke = false;
  let wt = false;
  let Tt = false;
  let deferred = Promise.withResolvers();
  let nt = () => {
    Ke = true;
    deferred.resolve();
  };
  let deferred_2 = Promise.withResolvers();
  let on = false;
  let rn = false;
  let rt;
  let refusalAsAllowLands = () => {
    rt =
      executionPlacementRefusal(deps) ??
      (Y.sandbox !== "required" && stance.unattended === "own_record" && unattendedServingAllowedByHostFlag()
        ? admissionChangedMessage({
            targetName: deps.targetName,
          })
        : undefined);
    return rt;
  };
  let st;
  let onAnsweredAhead = (S) => {
    if (st !== undefined) return;
    st = S;
    S.ended.then(nt, nt);
    if (S.givenUp && !ge) {
      let G = () => {
        wt = true;
        deferred_2.resolve();
      };
      Promise.resolve().then(drainPendingKillBackstops).then(G, G);
    }
  };
  let sn = (async () => {
    let S;
    try {
      let G = () =>
        servedPermissionContext({
          stance,
          launchDir: deps.launchDir,
          sessionMode: facts.sessionMode,
          sessionUpdates: sessionUpdatesForCaller(D),
          call: facts.trust,
          userSettings: deps.userSettingsAtAttach?.(),
          sandboxTurnedOnByHeldFile: deps.sandboxTurnedOnByHeldFile?.(),
        });
      let re = G();
      logRemoteTools(callId, "permission mode", {
        tool: tool.name,
        ...servedModeTelemetry({
          stance,
          sessionMode: facts.sessionMode,
          evaluatedMode: re.mode,
        }),
      });
      let ie = servedToolPath(tool, F, re, ee);
      if (ie !== undefined) {
        facts.throughSecondRootMount = isMountPointRule(ie);
        _e.permissionOutcome = {
          kind: "denied_by_rule",
          raisedToAsk: false,
        };
        facts.denySource = HOST_CREDENTIAL_RULE_SOURCE;
        let Te = credentialRuleKind(ie);
        facts.hostCredentialRefusal = Te;
        facts.underWindowsProfileGlob = isUnderUserProfiles(stripDoubleSlashPrefix(ie));
        S = callResultEnvelope(
          _e,
          cancelledToolResult(
            toolUseId,
            credentialRefusalMessage({
              targetName: deps.targetName,
              kind: Te,
              subject: stripDoubleSlashPrefix(ie),
            }),
          ),
        );
        return S;
      }
      let De = executor({
        tool,
        toolInput: F,
        toolUseId,
        startCwd: ee,
        constraints: Y,
        sessionModel,
        permissionContext: re,
        permissionContextNow: G,
        session: D,
        state: _e,
        callerSessionId: ctx.sessionId,
        deps,
        legDeadlineAt: facts.startedAt + X,
        onOutcome,
        onAsk,
        onAnsweredAhead,
        ...(w.where === "here" && {
          refusalAsAllowLands,
          ownCheckAhead: () => ke,
        }),
      });
      if (M?.holdInstalls !== undefined) {
        if (abortController.signal.aborted) {
          facts.stoppedBeforeHold = true;
          S = stoppedBeforeStart(_e);
          return S;
        }
        if (w.where === "here")
          ke = tryAutoModeAllowlist({
            stance,
            tool,
            forwardedInput: F,
            permissionContext: re,
            sessionMode: facts.sessionMode,
            serviceWrittenSessionMode: sessionModeFromStamp(facts),
            call: facts.trust,
            callStop: abortController,
            callId: callId ?? toolUseId,
            legDeadlineAt: facts.startedAt + X,
          });
        let Te = false;
        let now = Date.now();
        Ie = Promise.resolve(M.holdInstalls(vt, () => !rn && !Ke && !wt))
          .catch(() => {})
          .then(() => {
            Te = true;
          });
        await Promise.race([Ie, createChildAbortController_2(abortController.signal)]);
        facts.holdMs = Date.now() - now;
        if (abortController.signal.aborted && !Te) {
          S = timedOutOrCancelled(_e);
          return S;
        }
      }
      let $e = w.where === "here" ? executionPlacementRefusal(deps) : undefined;
      if ($e !== undefined) {
        S = {
          ...refusedEnvelope(q, facts, "sandbox_unavailable", $e, {
            notes: _e.notes.lines(),
          }),
          ranNothing: true,
        };
        return S;
      }
      We = Date.now();
      S = await De();
      if (st === undefined) nt();
      if (rt !== undefined)
        S = {
          ...refusedEnvelope(q, facts, "sandbox_unavailable", rt, {
            notes: _e.notes.lines(),
          }),
          ranNothing: true,
        };
      if (
        S.envelope.outcome === "completed" &&
        isRanOutcome(S.envelope.disposition) &&
        M?.capturePoint !== undefined &&
        !abortController.signal.aborted &&
        Ke
      ) {
        on = true;
        try {
          let Te = await M.capturePoint().catch(() => ({
            kind: "not_running",
          }));
          if (Te !== undefined) {
            S = {
              ...S,
              dirSync: deviceFrame(Te, SERVING_KIT_INSTANCE_ID, nextServingKitFrameSeq()),
            };
            logRemoteTools(callId, "capture answer attached", {
              answer: Te.kind,
            });
          }
        } catch (error) {
          logForDebugging(
            `[remote-tools] the capture answer was not attached to the result: ${errorMessage(error)}`,
            {
              level: "warn",
            },
          );
        }
      }
      facts.pipelineMs = Date.now() - We;
      return S;
    } catch (error) {
      if (abortController.signal.aborted || isAbortError(error)) {
        let { ranNothing, ...ie } = callNotRunEnvelope(_e);
        S =
          ranNothing === true && (P || We === undefined)
            ? {
                ...ie,
                ranNothing,
              }
            : ie;
      } else
        S = callFailureEnvelope(error, q, facts, abortController.signal, {
          notes: _e.notes.lines(),
        });
      return S;
    } finally {
      ke?.giveUp();
      if (st === undefined) nt();
      let G = on ? undefined : M?.capturePoint?.bind(M);
      facts.captureAtPipelineEnd = G !== undefined && isPermissionGranted(_e);
      deferred.promise
        .then(() => (facts.captureAtPipelineEnd === true && !clock.shuttingDown() ? G?.() : undefined))
        .catch(() =>
          logForDebugging("[remote-tools] the capture at the pipeline's end failed", {
            level: "warn",
          }),
        )
        .then(
          () => deferred_2.resolve(),
          () => deferred_2.resolve(),
        );
      Tt = !Ke;
      noteLateHoldRelease(facts, Ie !== null && !He, {
        wasAnsweredAheadOfItsKills: () => Tt,
        holdMayGo: deferred_2.promise,
      });
      deferred_2.promise.then(tt);
      withdrawAskedCall(D, Ee, {
        reason: "host_stopped",
        message: withdrawnRequestMessage({
          targetName: deps.targetName,
          reason: "host_stopped",
        }),
      });
      let re = callId === undefined ? undefined : D.calls.lookup(callId);
      if (
        !(
          re?.result !== undefined ||
          (re?.summary.state === "failed" &&
            re.summary.code !== undefined &&
            (TERMINAL_CALL_STATES.has(re.summary.code) || re.summary.ranNothing === true))
        ) &&
        S !== undefined
      )
        K(callId, S);
      clock.dispose();
    }
  })();
  let winner = await Promise.race([
    sn.then((served) => ({
      suspended: false,
      served,
    })),
    promise.then((ask) => ({
      suspended: true,
      ask,
    })),
  ]);
  if (!winner.suspended) return winner.served;
  if (We !== undefined) facts.pipelineMs = Date.now() - We;
  rn = true;
  tt();
  clock.detachLeg();
  let an = false;
  let it = false;
  if (D.pendingAsks.size >= SANDBOX_MAX_DEPTH) {
    let filtered = D.pendingAsks.list().filter((ie) => ie.redeemingLegs === 0);
    let maxAskMs = deps.policy.limits.max_ask_ms;
    let re =
      maxAskMs === undefined
        ? filtered[0]
        : filtered.find((ie) => Date.now() - ie.createdAt > maxAskMs + SESSION_APPROVAL_STALE_MS);
    if (re === undefined) {
      an = true;
      it = filtered.length > 0;
    } else
      withdrawAskedCall(D, re.askId, {
        reason: "evicted",
        message: withdrawnRequestMessage({
          targetName: deps.targetName,
          reason: "evicted",
        }),
      });
  }
  if (
    winner.ask.heldHook &&
    lastIfStoppedQuestion(winner.ask.message, facts.stoppedWorkingHookKeys) === undefined
  )
    deps.onNotice?.(
      SERVED_HOOK_NOTICES,
      winner.ask.message.endsWith(READ_LIMIT_BLOCKED_QUESTION)
        ? READ_LIMIT_SET_NOTICE
        : SKIPS_UNSAFE_HOOKS_NOTICE,
    );
  if (
    (facts.sessionMode === "auto" || facts.sessionMode === "bypassPermissions") &&
    deps.policy.stance.unattended === "own_record" &&
    isServedNutEnabled()
  ) {
    let S = autoOffNotice(deps.targetName);
    if (S !== undefined) deps.onNotice?.(S.key, S.text);
  }
  let At = callId === undefined ? undefined : D.calls.newestRetryJoinedTo(callId);
  let Pe = callId !== undefined && At !== undefined && D.calls.carryQuestion(callId, At, Ee) ? At : undefined;
  if (callId !== undefined && Pe !== undefined) {
    logRemoteTools(callId, "ask carried by retry", {
      carrier_call: Pe,
      ask_id: Ee,
      worker_epoch: ctx.workerEpoch,
    });
    if (facts.arrivedOver !== "relay") logFeatureSad("remote_tool_serve", "ask_carried_by_retry");
    facts.askCarriedBy = Pe;
  }
  let dn = Pe ?? callId;
  let un = stableHashWithSalt(tool.name, withoutEditKeys(winner.ask.input, fields));
  let mn = needsApprovalEnvelope({
    target: q,
    facts,
    askId: Ee,
    toolName: tool.name,
    ask: {
      ...winner.ask,
      input: unrenameOutputFields(winner.ask.input, wireArguments),
    },
    notes: _e.notes.lines(),
    inputFingerprint: un,
    hostRules: !stance.honorLocalRules ? "none" : w.where === "here" ? "full" : "denies",
  });
  let Wo =
    Pe !== undefined && callId !== undefined
      ? {
          callId: Pe,
          pipelineCallId: callId,
        }
      : {
          callId,
        };
  D.pendingAsks.register({
    askId: Ee,
    ...Wo,
    toolName: tool.name,
    raisedOver: facts.arrivedOver,
    toolStillServed: () => findServedTool(deps, tool.name) !== undefined,
    fingerprints: [fe, un],
    createdAt: Date.now(),
    asked: mn,
    startCwd: ee,
    evaluatedInput: winner.ask.input,
    raisedToAsk: winner.ask.raisedToAsk,
    classifierEligible: winner.ask.classifierEligible,
    standingRowOffered: winner.ask.standingRowOffered,
    askedInMode: facts.sessionMode,
    redeemingLegs: 0,
    answer: winner.ask.answer,
    ...(winner.ask.heldHook && {
      onApproved: ({ attested }) => {
        let G = lastIfChangedQuestion(winner.ask.message, facts.changedHookKeys);
        if (G !== undefined) deps.reach.projectHooks?.shownChanged.add(G);
        let re = attested
          ? findLastMatchingQuestion(
              winner.ask.message,
              facts.changedHookKeys,
              deps.reach.projectHooks?.updatedAsks,
            )
          : undefined;
        if (re !== undefined) {
          deps.reach.projectHooks?.shownChanged.add(re);
          deps.reach.projectHooks?.acceptedUpdated.add(re);
          deps.onNotice?.(SERVED_HOOK_UPDATED_ACCEPTED, HOOK_UPDATED_ACCEPTED_NOTICE);
        }
        let ie = attested
          ? lastIfStoppedQuestion(winner.ask.message, facts.stoppedWorkingHookKeys)
          : undefined;
        if (ie !== undefined) {
          deps.reach.projectHooks?.setAside.add(ie);
          deps.onNotice?.(SERVED_HOOK_SET_ASIDE, HOOK_SET_ASIDE_NOTICE);
        }
      },
      onDeclined: () => {
        let S = lastIfStoppedQuestion(winner.ask.message, facts.stoppedWorkingHookKeys);
        if (S !== undefined) deps.reach.projectHooks?.declinedSetAside.add(S);
        let lastMatchingQuestion = findLastMatchingQuestion(
          winner.ask.message,
          facts.changedHookKeys,
          deps.reach.projectHooks?.updatedAsks,
        );
        if (lastMatchingQuestion !== undefined) {
          deps.reach.projectHooks?.declinedChangedSinceLast.add(lastMatchingQuestion);
          deps.reach.projectHooks?.acceptedUpdated.delete(lastMatchingQuestion);
          deps.reach.projectHooks?.shownChanged.delete(lastMatchingQuestion);
        }
      },
    }),
    settled: sn,
    isPipelineOver: () => Ke || wt,
    wasAnsweredAheadOfItsKills: () => Tt,
    holdMayGo: deferred_2.promise,
    takesCaptureAtPipelineEnd: () => facts.captureAtPipelineEnd === true,
    resume: clock.resume,
    windDown: clock.windDown,
  });
  if (Pe === undefined)
    V(callId, {
      state: "asked",
      askId: Ee,
    });
  if (an) {
    let S = it
      ? tooManyPendingApprovalsMessage({
          targetName: deps.targetName,
          limit: SANDBOX_MAX_DEPTH,
        })
      : withdrawnRequestMessage({
          targetName: deps.targetName,
          reason: "evicted",
        });
    facts.askSeatsFull = it;
    withdrawAskedCall(D, Ee, {
      reason: "evicted",
      message: S,
      countedByItsLeg: it,
    });
    let G = dn === undefined ? undefined : D.calls.lookup(dn)?.result;
    return G !== undefined && callId !== undefined
      ? rebindEnvelopeCallId(G, callId)
      : (G ??
          refusedEnvelope(q, facts, "withdrawn", S, {
            reason: "evicted",
            notes: _e.notes.lines(),
          }));
  }
  let projectHooks = deps.reach.projectHooks;
  let at = winner.ask.heldHook
    ? findLastMatchingQuestion(winner.ask.message, facts.changedHookKeys, projectHooks?.updatedAsks)
    : undefined;
  let Et = at === undefined ? undefined : projectHooks?.updatedAsks.get(at);
  if (at !== undefined && Et !== undefined) {
    Et.puts += 1;
    if (Et.puts >= SERVED_HOOK_UPDATE_NOTICES) projectHooks?.declinedChangedSinceLast.add(at);
  }
  return mn;
}
//@ chunk-ad2e1aj6.js:62338-62426 placement
function servableTools(e) {
  return e.tools.filter(
    (tool) => !isMultiEntryAliasTool(tool) && getToolRemoteExecution(tool).supported && e.policy.serves(tool),
  );
}
//@ chunk-ad2e1aj6.js:62426-62514 placement
function servedShellToolName(e) {
  let n = new Set(servableTools(e).map((s) => s.name));
  return [BASH_TOOL_NAME, POWERSHELL_TOOL_NAME].find((s) => n.has(s));
}
//@ chunk-ad2e1aj6.js:62514-62584 placement
function allServedTools(e) {
  return [...servableTools(e), ...(e.servedMcpTools?.().values() ?? [])];
}
//@ chunk-ad2e1aj6.js:62584-62650 placement
function findServedTool(e, n) {
  return e.servedMcpTools?.().get(n) ?? findToolByName(servableTools(e), n);
}
//@ chunk-ad2e1aj6.js:62650-62711 placement
function servedMcpWireArgs(e, n) {
  return e.servedMcpWireArguments?.(n) ?? renamedFieldCacheMap();
}
//@ chunk-ad2e1aj6.js:62711-63290 placement
function executionPlacement(e) {
  let n = vmUnavailableMessage({
    targetName: e.targetName,
  });
  if (parseExecutionMode(e.execution).mode !== "in_process")
    return typeof e.executor === "function"
      ? {
          where: "handed_on",
          executor: e.executor,
        }
      : {
          where: "refused",
          message: n,
        };
  let s = true;
  if (typeof e.sandboxRequiredNow === "function")
    try {
      s = e.sandboxRequiredNow();
    } catch (error) {
      logError(toError(error));
    }
  if (s === false)
    return {
      where: "here",
      executor: typeof e.executor === "function" ? e.executor : defaultServedCallRunner,
    };
  if ((typeof s === "object" || typeof s === "function") && s !== null && "then" in s)
    Promise.resolve(s).catch((error) => logError(toError(error)));
  return {
    where: "refused",
    message:
      s === "could_not_be_read"
        ? settingsUnreadableMessage({
            targetName: e.targetName,
          })
        : n,
  };
}
//@ chunk-ad2e1aj6.js:63290-63437 placement
function executionPlacementRefusal(deps) {
  let n = executionPlacement(deps);
  switch (n.where) {
    case "here":
      return;
    case "refused":
      return n.message;
    case "handed_on":
      return vmUnavailableMessage({
        targetName: deps.targetName,
      });
  }
}
//@ chunk-ad2e1aj6.js:63437-63547 placement
function isServedReadOnly(e, n, s) {
  if (parseExecutionMode(s.execution).mode !== "in_process") return false;
  try {
    return e.isReadOnly(n);
  } catch {
    return false;
  }
}
//@ chunk-ad2e1aj6.js:63547-63698 placement
function callFailureEnvelope(error, n, facts, signal, r) {
  if (signal.aborted || isAbortError(error))
    return failedEnvelope(n, facts, "cancelled", "The call was cancelled.", r);
  logError(toError(error));
  return failedEnvelope(n, facts, "internal_error", callFailedText(n.name), r);
}
//@ chunk-ad2e1aj6.js:63698-63743 placement
function isSettingsError(e) {
  return e.severity !== "warning";
}
//@ chunk-ad2e1aj6.js:63743-63812 placement
function isMissingPath(settingsFilePathForSource) {
  try {
    getFsImplementation().lstatSync(settingsFilePathForSource);
    return false;
  } catch (error) {
    return isENOENT(error);
  }
}
//@ chunk-ad2e1aj6.js:63812-63907 placement
function isSymlinkedSettingsPath(settingsFilePathForSource) {
  let { resolvedPath, isSymlink, isCanonical } = safeResolvePath(
    getFsImplementation(),
    settingsFilePathForSource,
  );
  return isSymlink && (!isCanonical || isSpecialPath(resolvedPath));
}
//@ chunk-ad2e1aj6.js:63907-64167 placement
function userSettingsErrorWatcher() {
  let e = new Map();
  return () => {
    try {
      if (!isSettingSourceEnabled("userSettings")) return;
      if (getSettingsParseErrorsForSource("userSettings").some(isSettingsError)) return "held";
      let settingsFilePathForSource = getSettingsFilePathForSource("userSettings");
      if (settingsFilePathForSource === undefined || isMissingPath(settingsFilePathForSource)) return;
      return parseSettingsFileIfChanged(settingsFilePathForSource, e).errors.some(isSettingsError) &&
        !isSymlinkedSettingsPath(settingsFilePathForSource)
        ? "disk"
        : undefined;
    } catch (error) {
      logError(toError(error));
      return "unknown";
    }
  };
}
//@ chunk-ad2e1aj6.js:64167-65171 placement
function backgroundCommandStatusText(e, callId, s) {
  let { started, startedAt, ended } = s.command;
  let { outputTail } = s;
  let now = Date.now();
  let max = Math.max(0, (ended?.at ?? now) - startedAt);
  let w = ended && Math.max(0, now - ended.at);
  let C = (j) =>
    formatDuration(j, {
      hideTrailingZeros: true,
    });
  let P = `on ${e.name}`;
  let x =
    ended === undefined || w === undefined
      ? `${P} is running: started ${C(max)} ago, writing its output there to ${started.outputPath}, and stopped after ${C(started.limitMs)} in the background or earlier if ${e.name} stops serving this session.`
      : `${ended.how === "exited" ? `${P} is over: it exited with code ${ended.exitCode}` : `was stopped ${backgroundStopReasonText(ended.how, e.name)}`} ${C(w)} ago, after ${C(max)}.`;
  let Y =
    outputTail === undefined
      ? " Its output could not be read."
      : outputTail.trim() === ""
        ? " It has written no output."
        : `
Its output ends:
${outputTail}`;
  let content = [
    {
      type: "text",
      text: `Background command ${started.shellId} ${x}${Y}`,
    },
  ];
  let background = {
    state: ended?.how ?? "running",
    exit_code: ended?.exitCode,
    ran_ms: max,
    ended_ms_ago: w,
  };
  return {
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "completed",
      call_id: callId,
      target: e,
      is_error: false,
      content,
      output: {
        ...(ended === undefined && {
          backgroundTaskId: started.shellId,
        }),
        background,
      },
      disposition: "ran",
      replayed: true,
      served_at: startedAt,
    },
    content,
  };
}
//@ chunk-ad2e1aj6.js:65171-71408 placement
/**
 * 记录远程工具调用的 tengu_remote_tool_serve 遥测（结果、耗时、权限路径、分类器判定等）。
 */
function logServedCallTelemetry(envelope, n, s, h) {
  let r =
    envelope.outcome === "completed"
      ? envelope.is_error
        ? "completed_error"
        : "completed"
      : envelope.outcome === "failed" && (envelope.code === "cancelled" || envelope.code === "timed_out")
        ? envelope.code
        : envelope.outcome;
  let i = n.secondLeg ? n.askedInMode : n.sessionMode;
  let y = effectiveServedMode({
    stance: s.policy.stance,
    sessionMode: i,
    call: n.trust,
  });
  let O =
    n.query || n.answeredFromRecord !== undefined || n.callId === undefined
      ? undefined
      : h?.calls.lookup(n.callId);
  if (
    s.callLog !== undefined &&
    h !== undefined &&
    O !== undefined &&
    O.priorEpoch === undefined &&
    n.callId !== undefined
  ) {
    let w = (callId, summary) => ({
      t: "leg",
      caller: h.callerSessionId,
      call_id: callId,
      tool: n.resolvedToolName ?? "unresolved",
      is_mcp: n.isMcp,
      input_fp: n.inputFingerprint,
      transport: n.arrivedOver,
      second_leg: n.secondLeg,
      session_mode: n.sessionMode ?? "absent",
      evaluated_mode: y.mode,
      ...(n.secondLeg && {
        approval_basis: n.approvalBasis ?? "none",
      }),
      ...(n.allowBasis !== undefined && {
        allow_basis: n.allowBasis,
      }),
      ...(n.denySource !== undefined && {
        deny_source: n.denySource,
      }),
      ...(n.rulesCheckCrashed === true && {
        rules_check_crashed: true,
      }),
      ...(n.crashClass !== undefined && {
        crash_class: n.crashClass,
      }),
      ...(n.projectHook !== undefined && {
        hook: n.projectHook,
      }),
      outcome: envelope.outcome,
      ...(envelope.outcome === "completed" &&
        envelope.disposition !== undefined && {
          disposition: envelope.disposition,
        }),
      ...((envelope.outcome === "refused" || envelope.outcome === "failed") && {
        code: envelope.code,
      }),
      ...(envelope.outcome === "refused" &&
        envelope.reason !== undefined && {
          reason: envelope.reason,
        }),
      ...(envelope.outcome === "completed" && {
        is_error: envelope.is_error,
      }),
      duration_ms: Date.now() - n.startedAt,
      record: {
        state: summary.state,
        ...(summary.code !== undefined && {
          code: summary.code,
        }),
        ...(summary.endedAs !== undefined && {
          ended_as: summary.endedAs,
        }),
        ...(summary.ranNothing === true && {
          ran_nothing: true,
        }),
        ...(summary.isError !== undefined && {
          is_error: summary.isError,
        }),
        ...(summary.askId !== undefined && {
          ask_id: summary.askId,
        }),
        ...(summary.joinedCallId !== undefined && {
          joined_call_id: summary.joinedCallId,
        }),
      },
    });
    s.callLog.note(w(n.callId, O.summary));
    let C = n.askCarriedBy === undefined ? undefined : h.calls.lookup(n.askCarriedBy);
    if (n.askCarriedBy !== undefined && C !== undefined && C.priorEpoch === undefined)
      s.callLog.note(w(n.askCarriedBy, C.summary));
  }
  let R =
    n.query && n.callId !== undefined
      ? h?.calls.countOutcomeQuery(
          n.callId,
          `${r}:${envelope.outcome === "in_progress" ? `${envelope.state}${envelope.output_tail === undefined ? "" : "+output"}` : envelope.outcome === "refused" || envelope.outcome === "failed" ? envelope.code : ""}`,
        )
      : undefined;
  if (R?.report === false) return;
  logEvent("tengu_remote_tool_serve", {
    call_id: sanitizeMarkName(n.callId),
    host_epoch: sanitizeMarkName(s.sessions.epoch),
    handle_hash: shortHash(s.targetName),
    host_device_id: sanitizeMarkName(s.deviceId),
    criteria_version: lit(REMOTE_TOOL_PROTOCOL_LABEL),
    tool: n.toolNameForAnalytics,
    isMcp: n.isMcp,
    shell: fromEnumOpt(servedShellKind(n)),
    policy: fromEnum(s.policy.name),
    transport: fromEnum(n.arrivedOver),
    op: fromEnum(n.query ? "outcome_of" : "call"),
    outcome_queries_since_last_row: R?.sinceReported,
    outcome: fromEnum(r),
    answered_from_record: fromEnumOpt(n.answeredFromRecord),
    from_prior_epoch: n.fromPriorEpoch,
    ...(n.joinedCallId !== undefined && {
      joined_call_id: sanitizeMarkName(n.joinedCallId),
    }),
    ...(n.askCarriedBy !== undefined && {
      ask_carried_by: sanitizeMarkName(n.askCarriedBy),
    }),
    ...(n.workerEpoch !== undefined && {
      worker_epoch: n.workerEpoch,
    }),
    ...(envelope.outcome === "refused" && {
      refusal_code: fromEnum(envelope.code),
    }),
    ...(n.pathOverLimit === true && {
      path_over_limit: true,
    }),
    ...(n.staleLeg !== undefined && {
      age_ms: n.staleLeg.ageMs === undefined ? undefined : Math.round(n.staleLeg.ageMs),
      window_ms: n.staleLeg.windowMs,
    }),
    ...(n.attestation !== undefined && {
      attestation_mode: fromEnum(n.attestation.mode),
      request_attestation: fromEnum(n.attestation.status),
      attestation_verdict: fromEnum(n.attestation.verdict),
    }),
    ...(n.untrustedRepositories !== undefined && {
      untrusted_repositories: fromEnum(n.untrustedRepositories),
    }),
    mode_stamp: fromEnum(n.modeStamp ?? "absent"),
    server_verdict: fromEnum(serverVerdictKind(n.serverVerdict)),
    ...(envelope.outcome === "refused" &&
      n.seatsFull && {
        sessions_in_use: s.sessions.size,
        sessions_limit: s.sessions.limit,
      }),
    ...(envelope.outcome === "failed" && {
      failure_code: fromEnum(envelope.code),
    }),
    ...(envelope.outcome === "completed" &&
      envelope.disposition !== undefined && {
        disposition: fromEnum(envelope.disposition),
      }),
    force_ask: n.forceAsk,
    ask_class: envelope.outcome === "needs_approval" ? fromEnumOpt(n.askClass) : lit("none"),
    ...(envelope.outcome === "needs_approval" &&
      n.mcpPathWhy !== undefined && {
        mcp_path_why: fromEnum(n.mcpPathWhy),
      }),
    through_second_root_mount: n.throughSecondRootMount,
    allow_basis: fromEnumOpt(n.allowBasis),
    deny_source: fromEnumOpt(n.denySource),
    host_credential_refusal: fromEnumOpt(n.hostCredentialRefusal),
    under_windows_profile_glob: n.underWindowsProfileGlob,
    rules_check_crashed: n.rulesCheckCrashed === true,
    input_parse_threw: n.inputParseThrew === true,
    crash_class: n.crashClass,
    denied_under_forced_ask: n.deniedUnderForcedAsk === true,
    owner_settings_lost: fromEnumOpt(n.ownerSettingsLost),
    second_leg: n.secondLeg,
    approval_decision: fromEnum(n.envelope?.approval?.decision ?? "none"),
    ...(n.secondLeg && {
      approval_basis: fromEnum(n.approvalBasis ?? "none"),
    }),
    ask_ended_by_throw: n.askEndedByThrow,
    evaluated_mode: fromEnum(y.mode),
    mode_capped: y.capped,
    auto_refused_here: y.autoRefusedHere,
    consent_pending:
      s.policy.stance.unattended === "own_record" ? unattendedServingConsentPending() : undefined,
    unattended_by_host_flag:
      s.policy.stance.unattended === "own_record" ? unattendedServingAllowedByHostFlag() : undefined,
    auto_refused_why:
      s.policy.stance.unattended === "own_record"
        ? fromEnum(y.autoRefusedHere ? autoModeRefusedForServedCallsWhy() : "none")
        : undefined,
    plan_classifier_backed: isPlanFloor(i, s.policy.stance.unattended),
    destination_downgraded: n.destinationDowngraded,
    session_mode: fromEnum(n.sessionMode ?? "absent"),
    envelope: fromEnum(n.envelopeStatus),
    read_baseline_carried: n.envelope?.read_baseline !== undefined,
    truncated: n.truncated,
    ...(envelope.outcome === "completed" && {
      documents: envelope.documents?.length ?? 0,
    }),
    ...(envelope.outcome === "in_progress" &&
      envelope.output_tail !== undefined && {
        output_tail_bytes: Buffer.byteLength(envelope.output_tail.text),
      }),
    duration_ms: Date.now() - n.startedAt,
    posture_wait_ms: n.postureWaitMs,
    hold_ms: n.holdMs,
    hold_stands_at_answer: n.holdStandsAtAnswer === true,
    pipeline_ms: n.pipelineMs,
    capture_at_pipeline_end: n.captureAtPipelineEnd === true,
    stopped_before_hold: n.stoppedBeforeHold,
    output_bytes: Buffer.byteLength(
      jsonStringify(
        envelope.outcome === "completed"
          ? envelope.content
          : envelope.outcome === "refused" || envelope.outcome === "failed"
            ? envelope.message
            : "",
      ),
      "utf8",
    ),
  });
  if (n.query || n.answeredFromRecord !== undefined) return;
  if (n.arrivedOver === "relay") return;
  if (envelope.outcome === "completed" && !envelope.is_error) logFeatureOk("remote_tool_serve");
  else if (envelope.outcome === "completed")
    logFeatureSad("remote_tool_serve", envelope.disposition ?? "completed_error");
  else if (envelope.outcome === "acknowledged" && n.deniedBySession)
    logFeatureSad("remote_tool_serve", "denied_by_session");
  else if (
    envelope.outcome === "needs_approval" ||
    envelope.outcome === "acknowledged" ||
    envelope.outcome === "in_progress" ||
    n.askStillPending
  );
  else if (envelope.code === "cancelled") logFeatureSad("remote_tool_serve", "cancelled");
  else if (n.staleLeg !== undefined)
    logFeatureSad(
      "remote_tool_serve",
      n.staleLeg.judgedBy === "ask_age"
        ? "undated_answer"
        : n.staleLeg.judgedBy === "dated_ask_age"
          ? "aged_answer"
          : n.staleLeg.ageMs === undefined
            ? "undatable_leg"
            : "stale_leg",
      {
        answer_leg: n.secondLeg,
      },
    );
  else if (n.askSeatsFull) logFeatureSad("remote_tool_serve", "ask_seats_full");
  else logFeatureBad("remote_tool_serve", envelope.code);
}
//@ chunk-ad2e1aj6.js:71408-71526 placement
function servedShellKind(e) {
  let resolvedToolName = e.resolvedToolName;
  if (e.isMcp === true || resolvedToolName === undefined || !isShellToolName(resolvedToolName)) return;
  return resolvedToolName === POWERSHELL_TOOL_NAME ? "powershell" : "bash";
}
//@ chunk-ad2e1aj6.js:71526-71537 placement
var MAX_TELEMETRY_STRING = 128;
//@ chunk-5ghnps9r.js:1209-1360 placement
/**
 * （切分错误，权限 UI）可提供常驻更新时把它们并入会话权限更新。
 */
function sessionUpdatesForCaller(e) {
  return e.offeredStandingUpdates.length > 0 && isWindowsSandboxPolicyViolation()
    ? [...e.sessionPermissionUpdates, ...e.offeredStandingUpdates]
    : e.sessionPermissionUpdates;
}
export {
  servableTools,
  allServedTools,
  servedShellToolName,
  findServedTool,
  servedMcpWireArgs,
  MAX_TELEMETRY_STRING,
  isServedReadOnly,
  backgroundCommandStatusText,
  serveToolCall,
  callFailureEnvelope,
  logServedCallTelemetry,
  userSettingsErrorWatcher,
};
