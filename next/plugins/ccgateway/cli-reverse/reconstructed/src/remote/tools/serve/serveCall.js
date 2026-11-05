/**
 * remote/tools/serve/serveCall.ts
 *
 * 2.1.316 新增：服务端执行一次远程工具调用的主流程与遥测
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-azq8n2fy.js (1), chunk-nvm0wye1.js (22)
 * attribution: placement 22, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID, randomBytes } from "crypto";
import { isWindowsSandboxPolicyViolation, SESSION_APPROVAL_STALE_MS } from "./servingState.js";
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
  describeMisfit,
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
import { TASKSTOP } from "../../../tools/TaskStopTool/prompt.js";
import {
  misfitOfFit,
  isRanOutcome,
  REMOTE_TOOL_PROTOCOL_VERSION,
  serverVerdictKind,
  interfaceTelemetry,
  misfitDirection,
} from "../protocolConstants.js";
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
import { needsApprovalSuggestions } from "../../../tools/PowerShellTool/PowerShellTool.js";
import { createAbortController } from "../../../utils/abortController.js";
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
import { SANDBOX_MAX_DEPTH } from "../../../utils/sandbox/sandboxDefaultPolicy.js";
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
import { deferInit, runDeferredInits } from "../../../../runtime/deferred-init.js";

//@ chunk-azq8n2fy.js:1242-1393 placement
/**
 * （切分错误，权限 UI）可提供常驻更新时把它们并入会话权限更新。
 */
function sessionUpdatesForCaller(callerSession) {
  return callerSession.offeredStandingUpdates.length > 0 && isWindowsSandboxPolicyViolation()
    ? [...callerSession.sessionPermissionUpdates, ...callerSession.offeredStandingUpdates]
    : callerSession.sessionPermissionUpdates;
}
//@ chunk-nvm0wye1.js:43571-43681 affinity (2.1.88 match: createChildAbortController, 0.878)
function createChildAbortController(signal) {
  return new Promise((resolve) => {
    if (signal.aborted) resolve();
    else
      signal.addEventListener("abort", () => resolve(), {
        once: true,
      });
  });
}
//@ chunk-nvm0wye1.js:43681-43698 placement
var SERVING_KIT_INSTANCE_ID; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var servingKitFrameCounter;
deferInit("chunk-nvm0wye1.js:43681", () => {
  SERVING_KIT_INSTANCE_ID = randomUUID();
  servingKitFrameCounter = 0;
});
//@ chunk-nvm0wye1.js:43698-43728 placement
function nextServingKitFrameSeq() {
  servingKitFrameCounter += 1;
  return servingKitFrameCounter;
}
//@ chunk-nvm0wye1.js:43728-43979 placement
function noteLateHoldRelease(facts, heldHold, ask) {
  if (!heldHold || !ask.wasAnsweredAheadOfItsKills()) return;
  facts.holdStandsAtAnswer = true;
  let now = Date.now();
  ask.holdMayGo
    .then(() =>
      logEvent("tengu_remote_tool_hold_released_late", {
        call_id: sanitizeMarkName(facts.callId),
        second_leg: facts.secondLeg,
        late_ms: Date.now() - now,
      }),
    )
    .catch(() => {});
}
//@ chunk-nvm0wye1.js:43979-63318 placement
/**
 * 远程工具服务端的单次调用全流程：无人值守同意、输入校验、权限判定（会话询问/分类器/钩子）、执行、结果与遥测。
 */
async function serveToolCall(args) {
  let { tool, wireArguments, ctx, deps, facts } = args;
  if (deps.policy.stance.unattended !== "conveyed" && !unattendedServingConsentViewIsFresh())
    await freshUnattendedServingConsent(ctx.signal);
  let toolRemoteExecution = getToolRemoteExecution(tool);
  let fields =
    deps.policy.refusedInputFields?.(tool) ??
    (toolRemoteExecution.supported ? (toolRemoteExecution.refusedInputFields ?? []) : []);
  let fieldRefusal = unsupportedFieldRefusal(args.toolInput, fields, deps.targetName);
  if (fieldRefusal !== undefined) return refusedEnvelope(args.target, facts, "refused_field", fieldRefusal);
  let placement = executionPlacement(deps);
  if (placement.where === "refused")
    return refusedEnvelope(args.target, facts, "sandbox_unavailable", placement.message);
  let { executor } = placement;
  let isDefaultRunner = executor === defaultServedCallRunner;
  let constraints = deps.policy.constraints(tool, deps.launchDir, {
    approvalAttested: facts.approvalAttested,
  });
  let effectiveConstraints =
    deps.policy.stance.unattended === "own_record" && unattendedServingAllowedByHostFlag()
      ? {
          ...constraints,
          sandbox: "required",
          scrubCredentialEnv: true,
        }
      : constraints;
  let forwardedInput = withoutEditKeys(args.toolInput, fields);
  let session = deps.sessions.forCaller(callerKey(ctx));
  if (session === undefined) {
    facts.seatsFull = true;
    logRemoteTools(facts.envelope?.call_id, "capacity refused", {
      sessions_in_use: deps.sessions.size,
      sessions_limit: deps.sessions.limit,
    });
    return refusedEnvelope(
      args.target,
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
  resetCallerReadStateOnClear(session, facts.envelope);
  let dirSync = ctx.sessionId === undefined ? undefined : deps.dirSyncOf?.(ctx.sessionId);
  if (callId !== undefined && approval === undefined && !facts.enteredRecord)
    if (
      session.calls.receive(callId, {
        retryKey: decidingInput(tool, args.toolInput, session.cwd ?? deps.launchDir),
        workerEpoch: ctx.workerEpoch,
      })
    )
      facts.enteredRecord = true;
    else {
      let known = session.calls.lookup(callId);
      if (known !== undefined)
        return joinKnownCall({
          known,
          session,
          hostEpoch: deps.sessions.epoch,
          callId,
          target: args.target,
          facts,
        });
    }
  let cwd = session.cwd;
  let effectiveCwd = effectiveConstraints.pinCwd || cwd === undefined ? deps.launchDir : cwd;
  let target = {
    ...args.target,
    working_dir: deps.announcedDir ?? effectiveCwd,
  };
  let pathTooLong =
    approval === undefined ? platformPathGuard(tool, forwardedInput, effectiveCwd) : undefined;
  if (pathTooLong !== undefined) {
    facts.pathOverLimit = true;
    return refusedEnvelope(
      target,
      facts,
      "invalid_request",
      REMOTE_TOOLS_CONSENT_TEXT["refused.path_too_long"](deps.targetName, pathTooLong),
    );
  }
  let inputFingerprint = stableHashWithSalt(tool.name, forwardedInput);
  facts.inputFingerprint = inputFingerprint;
  let refuseForMisfit = (target) => {
    let misfit =
      tool.name === TASKSTOP ? undefined : facts.sessionInterface && misfitOfFit(facts.sessionInterface.fit);
    return misfit === undefined
      ? undefined
      : refusedEnvelope(
          target,
          facts,
          "unsupported_protocol",
          describeMisfit({
            misfit,
            targetName: deps.targetName,
            approvalCame: approval !== undefined,
          }),
        );
  };
  let rememberOutcome = (callId, outcome) => {
    if (callId !== undefined) session.calls.remember(callId, outcome);
  };
  let settleCall = (callId, result) => {
    if (callId !== undefined) session.calls.settle(callId, result, isSessionDenial(result));
  };
  if (callId !== undefined && approval === undefined) {
    let retry = session.calls.retryOf(callId);
    if (retry !== undefined && !isServedReadOnly(tool, forwardedInput, deps)) {
      let { summary } = retry.call;
      let pendingAskOfRetry =
        summary.state === "asked" && summary.askId !== undefined
          ? session.pendingAsks.peek(summary.askId)
          : undefined;
      if (pendingAskOfRetry === undefined || pendingAskOfRetry.redeemingLegs > 0)
        return joinRetry({
          session,
          joined: retry,
          hostEpoch: deps.sessions.epoch,
          callId,
          target,
          facts,
          workerEpoch: ctx.workerEpoch,
        });
      let refusal = refuseForMisfit(target);
      if (refusal !== undefined) return refusal;
      logRemoteTools(callId, "retry replaced ask", {
        replaced_call: retry.callId,
        ask_id: pendingAskOfRetry.askId,
        worker_epoch: ctx.workerEpoch,
      });
      if (facts.arrivedOver !== "relay") logFeatureSad("remote_tool_serve", "ask_replaced_by_retry");
      withdrawAskedCall(session, pendingAskOfRetry.askId, {
        reason: REPLACED_BY_RETRY,
        message: withdrawnRequestMessage({
          targetName: deps.targetName,
          reason: REPLACED_BY_RETRY,
        }),
      });
      let previousResult = session.calls.lookup(retry.callId)?.result;
      let replacedSummary = {
        state: "failed",
        code: REPLACED_BY_RETRY,
      };
      if (previousResult === undefined) rememberOutcome(retry.callId, replacedSummary);
      else session.calls.settle(retry.callId, previousResult, replacedSummary);
    }
    let refusal = refuseForMisfit(target);
    if (refusal !== undefined) return refusal;
    if (facts.enteredRecord)
      session.calls.rekey(callId, decidingInput(tool, args.toolInput, session.cwd ?? deps.launchDir));
  }
  if (approval !== undefined) {
    let ask = session.pendingAsks.peek(approval.ask_id);
    if (ask === undefined) {
      let known = callId === undefined ? undefined : session.calls.lookup(callId);
      return known !== undefined && callId !== undefined
        ? joinKnownCall({
            known,
            session,
            hostEpoch: deps.sessions.epoch,
            callId,
            target,
            facts,
          })
        : refusedEnvelope(
            target,
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
    facts.askedInMode = ask.askedInMode;
    let askTarget = {
      ...args.target,
      working_dir: deps.announcedDir ?? ask.startCwd,
    };
    let sameCall = ask.callId !== undefined && ask.callId === callId;
    if (approval.decision === "deny" && !sameCall) {
      facts.askStillPending = true;
      return refusedEnvelope(
        askTarget,
        facts,
        "invalid_request",
        `That decline named a different call than the pending question on ${deps.targetName} \u2014 the question is still pending and nothing ran.`,
      );
    }
    if (approval.decision === "deny" || (sameCall && ask.fingerprints.includes(inputFingerprint))) {
      let updatedInput = stripTargetField(
        approval.updated_input === undefined
          ? undefined
          : renameInputFields(approval.updated_input, wireArguments),
        deps.targetName,
      );
      if (updatedInput !== undefined && approval.decision === "allow") {
        let refusal =
          unsupportedFieldRefusal(updatedInput, fields, deps.targetName) ??
          (SIMULATED_SED_EDIT_KEY in updatedInput
            ? unsupportedFieldMessage({
                field: SIMULATED_SED_EDIT_KEY,
                targetName: deps.targetName,
              })
            : undefined);
        if (refusal !== undefined) {
          facts.askStillPending = true;
          return refusedEnvelope(askTarget, facts, "refused_field", refusal);
        }
        if (
          !ask.fingerprints.includes(
            stableHashWithSalt(
              tool.name,
              pickKnownFields(ask.evaluatedInput, withoutEditKeys(updatedInput, fields)),
            ),
          )
        ) {
          facts.askStillPending = true;
          return refusedEnvelope(
            askTarget,
            facts,
            "invalid_request",
            `An approval cannot change the call it approves on ${deps.targetName} \u2014 nothing ran and the request is still pending. Send the changed call as a new one.`,
          );
        }
      }
      if (approval.decision === "allow") {
        let refusal = refuseForMisfit(askTarget);
        if (refusal !== undefined) {
          let known =
            ask.redeemingLegs > 1 && callId !== undefined ? session.calls.lookup(callId) : undefined;
          if (known !== undefined && callId !== undefined)
            return joinKnownCall({
              known,
              session,
              hostEpoch: deps.sessions.epoch,
              callId,
              target: askTarget,
              facts,
            });
          facts.askStillPending = true;
          return refusal;
        }
        let askAgeMs = Date.now() - ask.createdAt;
        let dated = arrivesOverSession(ask.raisedOver) || arrivesOverSession(facts.arrivedOver);
        if ((!dated || deps.policy.limits.max_ask_ms !== undefined) && askAgeMs > SYNC_ANSWER_TTL_MS) {
          let expiredMessage = expiredApprovalMessage({
            targetName: deps.targetName,
            askAgeMs,
            windowMs: SYNC_ANSWER_TTL_MS,
            dated,
          });
          withdrawAskedCall(session, approval.ask_id, {
            reason: "stale_answer",
            message: expiredMessage,
          });
          facts.staleLeg = {
            ageMs: askAgeMs,
            windowMs: SYNC_ANSWER_TTL_MS,
            judgedBy: dated ? "dated_ask_age" : "ask_age",
          };
          logRemoteTools(callId, `${dated ? "aged" : "undated"} allow refused`, {
            ask_age_ms: Math.round(askAgeMs),
            window_ms: SYNC_ANSWER_TTL_MS,
          });
          return refusedEnvelope(askTarget, facts, "stale", expiredMessage, {
            reason: "stale_answer",
          });
        }
      }
      if (acceptsArrival(ask.raisedOver, facts.arrivedOver)) {
        let approvalBasis = callerKindForArrival(
          facts.arrivedOver,
          deps.registrationTransport ?? "auto",
          {
            attested: approval.attested,
            callerKind: facts.envelope?.caller.kind,
            toolName: tool.name,
            isServedMcpTool: tool.isMcp === true,
            sessionMode: facts.sessionMode,
            askedInMode: ask.askedInMode,
            classifierEligible: ask.classifierEligible,
            autoModeRefusedHere:
              placement.where === "handed_on"
                ? servingConsentRequirement(deps.policy.stance.unattended) !== undefined
                : deps.policy.stance.unattended === "conveyed" || autoModeRefusedForServedCalls(),
            planClaimBackedHere: isPlanFloor(facts.sessionMode, deps.policy.stance.unattended),
            serverVerdict: facts.serverVerdict,
          },
          facts.trust,
        );
        facts.approvalAttested = approvalBasis === "attested";
        if (approval.decision === "allow") facts.approvalBasis = approvalBasis;
      }
      if (approval.decision === "allow" && facts.approvalBasis === undefined) {
        facts.askStillPending = true;
        return refusedEnvelope(
          askTarget,
          facts,
          "no_approval",
          acceptsArrival(ask.raisedOver, facts.arrivedOver)
            ? `The approval for this call could not be verified as the person's own, so ${deps.targetName} did not run it; the request is still pending.`
            : `The approval for this call arrived over a different channel than the one the request was put on, so ${deps.targetName} did not run it; the request is still pending.`,
        );
      }
      facts.forceAsk = ask.raisedToAsk;
      if (approval.decision === "deny") {
        facts.deniedBySession = true;
        if (facts.approvalAttested) ask.onDeclined?.();
        recordSessionDenial(session, approval.ask_id, sessionDeclineDenial(approval.feedback));
        return acknowledgedEnvelope(askTarget, facts, approval.ask_id);
      }
      let refuseGone = () => {
        let known = callId === undefined ? undefined : session.calls.lookup(callId);
        return known !== undefined && callId !== undefined
          ? joinKnownCall({
              known,
              session,
              hostEpoch: deps.sessions.epoch,
              callId,
              target,
              facts,
            })
          : refusedEnvelope(
              askTarget,
              facts,
              "invalid_request",
              staleApprovalMessage({
                targetName: deps.targetName,
                why: "gone",
              }),
            );
      };
      let failAskedCall = (code, message) => {
        let envelope = {
          ...failedEnvelope(askTarget, facts, code, message),
          ...(isDefaultRunner && {
            ranNothing: true,
          }),
        };
        return settleAskedCall(session, approval.ask_id, envelope, askEndedDenial(message))
          ? envelope
          : refuseGone();
      };
      if (callDeadlineMs(deps.policy.limits, facts.envelope) - (Date.now() - facts.startedAt) <= 0)
        return failAskedCall(
          "timed_out",
          `The approval reached ${deps.targetName} with no time left to run the call (admission took longer than the caller allowed) \u2014 nothing ran, and the approval is used up. Run the tool again if it is still needed.`,
        );
      let aborted = dirSync?.holdInstalls !== undefined && ctx.signal.aborted;
      if (aborted) facts.stoppedBeforeHold = true;
      let holdKey = `${approval.ask_id}:${randomUUID()}`;
      let released = false;
      let holdPromise =
        dirSync?.holdInstalls === undefined || aborted
          ? null
          : Promise.resolve(dirSync.holdInstalls(holdKey, () => !released && !ask.isPipelineOver())).catch(
              () => {},
            );
      let releaseHold = () =>
        void holdPromise?.then(() => {
          try {
            dirSync?.releaseInstalls?.(holdKey);
          } catch (error) {
            logForDebugging(`[remote-tools] releasing the install hold failed: ${errorMessage(error)}`, {
              level: "warn",
            });
          }
        });
      let markReleased = () => {
        released = true;
        releaseHold();
      };
      if (holdPromise !== null) {
        let holdGranted = false;
        holdPromise.then(() => {
          holdGranted = true;
        });
        let remainingMs = callDeadlineMs(deps.policy.limits, facts.envelope) - (Date.now() - facts.startedAt);
        let now = Date.now();
        await Promise.race([
          holdPromise,
          createChildAbortController(ctx.signal),
          ...(Number.isFinite(remainingMs)
            ? [createChildAbortController(AbortSignal.timeout(Math.max(0, remainingMs)))]
            : []),
        ]);
        facts.holdMs = Date.now() - now;
        if (!holdGranted) {
          markReleased();
          return failAskedCall(
            ctx.signal.aborted ? "cancelled" : "timed_out",
            `The approval reached ${deps.targetName}, but the call was stopped before the command started \u2014 nothing ran, and the approval is used up. Run the tool again if it is still needed.`,
          );
        }
      }
      let handedAutoArm = placement.where === "handed_on" && facts.approvalBasis === "auto_arm";
      if (handedAutoArm && !unattendedServingConsentViewIsFresh())
        await freshUnattendedServingConsent(ctx.signal);
      if (handedAutoArm && servingConsentRequirement(deps.policy.stance.unattended) !== undefined) {
        markReleased();
        facts.approvalBasis = undefined;
        facts.askStillPending = true;
        return refusedEnvelope(
          askTarget,
          facts,
          "no_approval",
          `${deps.targetName} no longer lets a classifier approve this call, so it did not run; the request is still pending for a person.`,
        );
      }
      if (session.pendingAsks.take(approval.ask_id) === undefined) {
        markReleased();
        return refuseGone();
      }
      let placementRefusal = placement.where === "here" ? executionPlacementRefusal(deps) : undefined;
      if (placementRefusal !== undefined) {
        markReleased();
        let refused = {
          ...refusedEnvelope(askTarget, facts, "sandbox_unavailable", placementRefusal),
          ranNothing: true,
        };
        settleCall(ask.callId, refused);
        ask.windDown();
        ask.answer(askEndedDenial(placementRefusal));
        return refused;
      }
      ask.holdMayGo.then(releaseHold);
      let settled = ask.settled;
      settled.catch(() => {});
      let now = Date.now();
      try {
        if (ask.callId !== undefined && !ctx.signal.aborted) {
          rememberOutcome(ask.callId, {
            state: "running",
            started: true,
          });
          deps.callLog?.note({
            t: "started",
            caller: session.callerSessionId,
            call_id: ask.callId,
            tool: tool.name,
            input_fp: inputFingerprint,
            by: "session",
            basis: facts.approvalBasis,
          });
        }
        ask.resume({
          signal: ctx.signal,
          startedAt: facts.startedAt,
          expiresInMs: callDeadlineMs(deps.policy.limits, facts.envelope),
        });
        if (facts.arrivedOver !== "session" || facts.approvalAttested)
          ask.onApproved?.({
            attested: facts.approvalAttested,
          });
      } catch (error) {
        markReleased();
        facts.askEndedByThrow = true;
        let failureEnvelope = {
          ...callFailureEnvelope(error, askTarget, facts, ctx.signal, {}),
          ...(isDefaultRunner && {
            ranNothing: true,
          }),
        };
        settleCall(ask.callId, failureEnvelope);
        ask.windDown();
        ask.answer(askEndedDenial(callFailedText(deps.targetName)));
        return failureEnvelope;
      }
      ask.answer({
        behavior: "allow",
        updatedInput: ask.evaluatedInput,
        decisionReason: {
          type: "other",
          reason: REMOTE_CALL_SESSION_ANSWER,
        },
      });
      if (
        facts.approvalAttested &&
        deps.policy.capabilities?.includes("standing_approvals") === true &&
        ask.standingRowOffered
      )
        await keepStandingApprovals(session, approval.permission_updates, facts, {
          toolName: tool.name,
          input: ask.evaluatedInput,
          offered: needsApprovalSuggestions(ask.asked.envelope),
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
      let servedResult = await settled;
      noteLateHoldRelease(facts, holdPromise !== null, ask);
      facts.captureAtPipelineEnd = ask.takesCaptureAtPipelineEnd();
      facts.pipelineMs = Date.now() - now;
      facts.truncated =
        servedResult.envelope.outcome === "completed" && servedResult.envelope.truncated === true;
      if (ask.pipelineCallId === undefined) return servedResult;
      logRemoteTools(ask.callId, "carried run settled", {
        pipeline_call: ask.pipelineCallId,
      });
      let rebound = rebindEnvelopeCallId(servedResult, ask.callId);
      settleCall(ask.callId, rebound);
      return rebound;
    }
  }
  if (approval !== undefined) {
    let known = callId === undefined ? undefined : session.calls.lookup(callId);
    if (known !== undefined && callId !== undefined)
      return joinKnownCall({
        known,
        session,
        hostEpoch: deps.sessions.epoch,
        callId,
        target,
        facts,
      });
    facts.askStillPending = true;
    return refusedEnvelope(
      target,
      facts,
      "invalid_request",
      staleApprovalMessage({
        targetName: deps.targetName,
        why: "other",
      }),
    );
  }
  let noteCallState = (state) => rememberOutcome(callId, state);
  let stance = deps.policy.stance;
  let abortController = createAbortController();
  let deadlineMs = clampToMaxPageSize(callDeadlineMs(deps.policy.limits, facts.envelope));
  let remainingMs = deadlineMs - (Date.now() - facts.startedAt);
  if (remainingMs <= 0) {
    noteCallState({
      state: "failed",
      code: "timed_out",
      ranNothing: true,
    });
    return {
      ...failedEnvelope(
        target,
        facts,
        "timed_out",
        `The call reached ${deps.targetName} with no time left before its ${formatDuration(Math.max(1000, deadlineMs))} deadline (admission took longer than the caller allowed) \u2014 nothing ran.`,
      ),
      ranNothing: true,
    };
  }
  let shellTool = isNonMcpShellTool(tool) || tool.mcpInfo !== undefined;
  let state = {
    facts,
    target,
    targetName: deps.targetName,
    callId,
    controller: abortController,
    clock: createCallLifetime({
      remainingMs,
      controller: abortController,
      leg: ctx.signal,
      lifetime: deps.lifetime,
    }),
    notes: createNoteSet(),
    permissionOutcome: undefined,
    toolVerdict: undefined,
  };
  if (deps.projectHookWaitingFor?.(callerKey(ctx)) === true)
    state.notes.add("project_hook_waiting", HOOK_NOT_ACCEPTED_NOTICE);
  let { clock } = state;
  let resolveAsk;
  let promise = new Promise((resolve) => {
    resolveAsk = resolve;
  });
  let sessionModel =
    facts.envelope?.caller.model !== undefined
      ? canonicalNameKeeping1m(facts.envelope.caller.model, {
          overridesMap: {},
        })
      : undefined;
  let autoModeAllow;
  let onOutcome = (outcome) => {
    autoModeAllow?.giveUp();
    state.permissionOutcome = outcome;
    facts.forceAsk = outcome.raisedToAsk;
    facts.throughSecondRootMount = outcome.throughSecondRootMount;
    facts.allowBasis = outcome.allowBasis;
    facts.denySource = outcome.denySource;
    facts.hostCredentialRefusal = outcome.hostCredentialRefusal;
    facts.underWindowsProfileGlob = outcome.underWindowsProfileGlob;
    facts.rulesCheckCrashed = outcome.rulesCheckCrashed && true;
    facts.inputParseThrew = outcome.rulesCheckCrashed?.inputParseThrew || undefined;
    facts.crashClass = outcome.rulesCheckCrashed?.crashClass;
    facts.deniedUnderForcedAsk = outcome.deniedUnderForcedAsk;
    let mayRun =
      (outcome.kind === "allowed" || outcome.kind === "approved_by_session") &&
      !abortController.signal.aborted;
    if (mayRun)
      noteCallState({
        state: "running",
        started: true,
      });
    if (mayRun && outcome.kind === "allowed" && callId !== undefined)
      deps.callLog?.note({
        t: "started",
        caller: session.callerSessionId,
        call_id: callId,
        tool: tool.name,
        input_fp: inputFingerprint,
        by: "host",
        basis: outcome.allowBasis,
      });
    if (
      (outcome.kind === "allowed" || outcome.kind === "approved_by_session") &&
      effectiveConstraints.maxTimeoutMs === undefined &&
      shellTool
    ) {
      clock.enterRunning();
      logRemoteTools(callId, "running: call deadline disarmed", {
        epoch: deps.sessions.epoch,
        outcome: outcome.kind,
      });
    }
  };
  let onAsk = (ask) => {
    autoModeAllow?.giveUp();
    facts.forceAsk = ask.raisedToAsk;
    facts.askClass = ask.askClass;
    facts.mcpPathWhy = ask.mcpPathWhy;
    try {
      if (deps.ownSettingsWaitingFor?.(callerKey(ctx)) === true)
        state.notes.add(
          "own_settings_waiting",
          REMOTE_TOOLS_CONSENT_TEXT["served_settings.own_waiting.session_note"],
        );
    } catch (error) {
      logError(toError(error));
    }
    resolveAsk?.(ask);
  };
  let toolUseId = `remote_${randomUUID()}`;
  noteCallState({
    state: "running",
  });
  let askId = facts.arrivedOver === "relay" ? `ask_${randomUUID()}` : randomBytes(32).toString("hex");
  if (stance.honorLocalRules)
    await settingsSourcesInReach(
      (await deps.reach.current()).map(normalizeCommandForPlatform),
      deps.storageV5,
      deps.reach.distrustedSources,
    );
  let holdKey = askId;
  let holdPromise = null;
  let holdReleased = false;
  let releaseHold = () => {
    if (holdPromise !== null && !holdReleased) {
      holdReleased = true;
      holdPromise.then(() => {
        try {
          dirSync?.releaseInstalls?.(holdKey);
        } catch (error) {
          logForDebugging(`[remote-tools] releasing the install hold failed: ${errorMessage(error)}`, {
            level: "warn",
          });
        }
      });
    }
  };
  let pipelineStart;
  let pipelineOver = false;
  let gaveUp = false;
  let answeredAhead = false;
  let deferred = Promise.withResolvers();
  let markSettled = () => {
    pipelineOver = true;
    deferred.resolve();
  };
  let deferred_2 = Promise.withResolvers();
  let captureTaken = false;
  let stoppedSinceAnswer = false;
  let lateRefusal;
  let refusalAsAllowLands = () => {
    lateRefusal =
      executionPlacementRefusal(deps) ??
      (effectiveConstraints.sandbox !== "required" &&
      stance.unattended === "own_record" &&
      unattendedServingAllowedByHostFlag()
        ? admissionChangedMessage({
            targetName: deps.targetName,
          })
        : undefined);
    return lateRefusal;
  };
  let answeredAheadInfo;
  let onAnsweredAhead = (info) => {
    if (answeredAheadInfo !== undefined) return;
    answeredAheadInfo = info;
    info.ended.then(markSettled, markSettled);
    if (info.givenUp && !shellTool) {
      let markGaveUp = () => {
        gaveUp = true;
        deferred_2.resolve();
      };
      Promise.resolve().then(drainPendingKillBackstops).then(markGaveUp, markGaveUp);
    }
  };
  let pipeline = (async () => {
    let envelope;
    try {
      let permissionContextNow = () =>
        servedPermissionContext({
          stance,
          launchDir: deps.launchDir,
          sessionMode: facts.sessionMode,
          sessionUpdates: sessionUpdatesForCaller(session),
          call: facts.trust,
          userSettings: deps.userSettingsAtAttach?.(),
          sandboxTurnedOnByHeldFile: deps.sandboxTurnedOnByHeldFile?.(),
        });
      let permissionContext = permissionContextNow();
      logRemoteTools(callId, "permission mode", {
        tool: tool.name,
        ...servedModeTelemetry({
          stance,
          sessionMode: facts.sessionMode,
          evaluatedMode: permissionContext.mode,
        }),
      });
      let blockedPath = servedToolPath(tool, forwardedInput, permissionContext, effectiveCwd);
      if (blockedPath !== undefined) {
        facts.throughSecondRootMount = isMountPointRule(blockedPath);
        state.permissionOutcome = {
          kind: "denied_by_rule",
          raisedToAsk: false,
        };
        facts.denySource = HOST_CREDENTIAL_RULE_SOURCE;
        let ruleKind = credentialRuleKind(blockedPath);
        facts.hostCredentialRefusal = ruleKind;
        facts.underWindowsProfileGlob = isUnderUserProfiles(stripDoubleSlashPrefix(blockedPath));
        envelope = callResultEnvelope(
          state,
          cancelledToolResult(
            toolUseId,
            credentialRefusalMessage({
              targetName: deps.targetName,
              kind: ruleKind,
              subject: stripDoubleSlashPrefix(blockedPath),
            }),
          ),
        );
        return envelope;
      }
      let runPromise = executor({
        tool,
        toolInput: forwardedInput,
        toolUseId,
        startCwd: effectiveCwd,
        constraints: effectiveConstraints,
        sessionModel,
        permissionContext,
        permissionContextNow,
        session,
        state,
        callerSessionId: ctx.sessionId,
        deps,
        legDeadlineAt: facts.startedAt + deadlineMs,
        onOutcome,
        onAsk,
        onAnsweredAhead,
        ...(placement.where === "here" && {
          refusalAsAllowLands,
          ownCheckAhead: () => autoModeAllow,
        }),
      });
      if (dirSync?.holdInstalls !== undefined) {
        if (abortController.signal.aborted) {
          facts.stoppedBeforeHold = true;
          envelope = stoppedBeforeStart(state);
          return envelope;
        }
        if (placement.where === "here")
          autoModeAllow = tryAutoModeAllowlist({
            stance,
            tool,
            forwardedInput,
            permissionContext,
            sessionMode: facts.sessionMode,
            serviceWrittenSessionMode: sessionModeFromStamp(facts),
            call: facts.trust,
            callStop: abortController,
            callId: callId ?? toolUseId,
            legDeadlineAt: facts.startedAt + deadlineMs,
          });
        let holdGranted = false;
        let now = Date.now();
        holdPromise = Promise.resolve(
          dirSync.holdInstalls(holdKey, () => !stoppedSinceAnswer && !pipelineOver && !gaveUp),
        )
          .catch(() => {})
          .then(() => {
            holdGranted = true;
          });
        await Promise.race([holdPromise, createChildAbortController(abortController.signal)]);
        facts.holdMs = Date.now() - now;
        if (abortController.signal.aborted && !holdGranted) {
          envelope = timedOutOrCancelled(state);
          return envelope;
        }
      }
      let placementRefusal = placement.where === "here" ? executionPlacementRefusal(deps) : undefined;
      if (placementRefusal !== undefined) {
        envelope = {
          ...refusedEnvelope(target, facts, "sandbox_unavailable", placementRefusal, {
            notes: state.notes.lines(),
          }),
          ranNothing: true,
        };
        return envelope;
      }
      pipelineStart = Date.now();
      envelope = await runPromise();
      if (answeredAheadInfo === undefined) markSettled();
      if (lateRefusal !== undefined)
        envelope = {
          ...refusedEnvelope(target, facts, "sandbox_unavailable", lateRefusal, {
            notes: state.notes.lines(),
          }),
          ranNothing: true,
        };
      if (
        envelope.envelope.outcome === "completed" &&
        isRanOutcome(envelope.envelope.disposition) &&
        dirSync?.capturePoint !== undefined &&
        !abortController.signal.aborted &&
        pipelineOver
      ) {
        captureTaken = true;
        try {
          let capture = await dirSync.capturePoint().catch(() => ({
            kind: "not_running",
          }));
          if (capture !== undefined) {
            envelope = {
              ...envelope,
              dirSync: deviceFrame(capture, SERVING_KIT_INSTANCE_ID, nextServingKitFrameSeq()),
            };
            logRemoteTools(callId, "capture answer attached", {
              answer: capture.kind,
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
      facts.pipelineMs = Date.now() - pipelineStart;
      return envelope;
    } catch (error) {
      if (abortController.signal.aborted || isAbortError(error)) {
        let { ranNothing, ...notRun } = callNotRunEnvelope(state);
        envelope =
          ranNothing === true && (isDefaultRunner || pipelineStart === undefined)
            ? {
                ...notRun,
                ranNothing,
              }
            : notRun;
      } else
        envelope = callFailureEnvelope(error, target, facts, abortController.signal, {
          notes: state.notes.lines(),
        });
      return envelope;
    } finally {
      autoModeAllow?.giveUp();
      if (answeredAheadInfo === undefined) markSettled();
      let capturePoint = captureTaken ? undefined : dirSync?.capturePoint?.bind(dirSync);
      facts.captureAtPipelineEnd = capturePoint !== undefined && isPermissionGranted(state);
      deferred.promise
        .then(() =>
          facts.captureAtPipelineEnd === true && !clock.shuttingDown() ? capturePoint?.() : undefined,
        )
        .catch(() =>
          logForDebugging("[remote-tools] the capture at the pipeline's end failed", {
            level: "warn",
          }),
        )
        .then(
          () => deferred_2.resolve(),
          () => deferred_2.resolve(),
        );
      answeredAhead = !pipelineOver;
      noteLateHoldRelease(facts, holdPromise !== null && !holdReleased, {
        wasAnsweredAheadOfItsKills: () => answeredAhead,
        holdMayGo: deferred_2.promise,
      });
      deferred_2.promise.then(releaseHold);
      withdrawAskedCall(session, askId, {
        reason: "host_stopped",
        message: withdrawnRequestMessage({
          targetName: deps.targetName,
          reason: "host_stopped",
        }),
      });
      let known = callId === undefined ? undefined : session.calls.lookup(callId);
      if (
        !(
          known?.result !== undefined ||
          (known?.summary.state === "failed" &&
            known.summary.code !== undefined &&
            (TERMINAL_CALL_STATES.has(known.summary.code) || known.summary.ranNothing === true))
        ) &&
        envelope !== undefined
      )
        settleCall(callId, envelope);
      clock.dispose();
    }
  })();
  let winner = await Promise.race([
    pipeline.then((served) => ({
      suspended: false,
      served,
    })),
    promise.then((ask) => ({
      suspended: true,
      ask,
    })),
  ]);
  if (!winner.suspended) return winner.served;
  if (pipelineStart !== undefined) facts.pipelineMs = Date.now() - pipelineStart;
  stoppedSinceAnswer = true;
  releaseHold();
  clock.detachLeg();
  let askSeatsFull = false;
  let seatsCounted = false;
  if (session.pendingAsks.size >= SANDBOX_MAX_DEPTH) {
    let filtered = session.pendingAsks.list().filter((ask) => ask.redeemingLegs === 0);
    let maxAskMs = deps.policy.limits.max_ask_ms;
    let evictedAsk =
      maxAskMs === undefined
        ? filtered[0]
        : filtered.find((ask) => Date.now() - ask.createdAt > maxAskMs + SESSION_APPROVAL_STALE_MS);
    if (evictedAsk === undefined) {
      askSeatsFull = true;
      seatsCounted = filtered.length > 0;
    } else
      withdrawAskedCall(session, evictedAsk.askId, {
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
    let notice = autoOffNotice(deps.targetName);
    if (notice !== undefined) deps.onNotice?.(notice.key, notice.text);
  }
  let retryJoined = callId === undefined ? undefined : session.calls.newestRetryJoinedTo(callId);
  let carrierCallId =
    callId !== undefined &&
    retryJoined !== undefined &&
    session.calls.carryQuestion(callId, retryJoined, askId)
      ? retryJoined
      : undefined;
  if (callId !== undefined && carrierCallId !== undefined) {
    logRemoteTools(callId, "ask carried by retry", {
      carrier_call: carrierCallId,
      ask_id: askId,
      worker_epoch: ctx.workerEpoch,
    });
    if (facts.arrivedOver !== "relay") logFeatureSad("remote_tool_serve", "ask_carried_by_retry");
    facts.askCarriedBy = carrierCallId;
  }
  let callIdForRecord = carrierCallId ?? callId;
  let askInputFingerprint = stableHashWithSalt(tool.name, withoutEditKeys(winner.ask.input, fields));
  let askEnvelope = needsApprovalEnvelope({
    target,
    facts,
    askId,
    toolName: tool.name,
    ask: {
      ...winner.ask,
      input: unrenameOutputFields(winner.ask.input, wireArguments),
    },
    notes: state.notes.lines(),
    inputFingerprint: askInputFingerprint,
    hostRules: !stance.honorLocalRules ? "none" : placement.where === "here" ? "full" : "denies",
  });
  let callRefs =
    carrierCallId !== undefined && callId !== undefined
      ? {
          callId: carrierCallId,
          pipelineCallId: callId,
        }
      : {
          callId,
        };
  session.pendingAsks.register({
    askId,
    ...callRefs,
    toolName: tool.name,
    raisedOver: facts.arrivedOver,
    toolStillServed: () => findServedTool(deps, tool.name) !== undefined,
    fingerprints: [inputFingerprint, askInputFingerprint],
    createdAt: Date.now(),
    asked: askEnvelope,
    startCwd: effectiveCwd,
    evaluatedInput: winner.ask.input,
    raisedToAsk: winner.ask.raisedToAsk,
    classifierEligible: winner.ask.classifierEligible,
    standingRowOffered: winner.ask.standingRowOffered,
    askedInMode: facts.sessionMode,
    redeemingLegs: 0,
    answer: winner.ask.answer,
    ...(winner.ask.heldHook && {
      onApproved: ({ attested }) => {
        let changedQuestion = lastIfChangedQuestion(winner.ask.message, facts.changedHookKeys);
        if (changedQuestion !== undefined) deps.reach.projectHooks?.shownChanged.add(changedQuestion);
        let updatedQuestion = attested
          ? findLastMatchingQuestion(
              winner.ask.message,
              facts.changedHookKeys,
              deps.reach.projectHooks?.updatedAsks,
            )
          : undefined;
        if (updatedQuestion !== undefined) {
          deps.reach.projectHooks?.shownChanged.add(updatedQuestion);
          deps.reach.projectHooks?.acceptedUpdated.add(updatedQuestion);
          deps.onNotice?.(SERVED_HOOK_UPDATED_ACCEPTED, HOOK_UPDATED_ACCEPTED_NOTICE);
        }
        let stoppedQuestion = attested
          ? lastIfStoppedQuestion(winner.ask.message, facts.stoppedWorkingHookKeys)
          : undefined;
        if (stoppedQuestion !== undefined) {
          deps.reach.projectHooks?.setAside.add(stoppedQuestion);
          deps.onNotice?.(SERVED_HOOK_SET_ASIDE, HOOK_SET_ASIDE_NOTICE);
        }
      },
      onDeclined: () => {
        let stoppedQuestion = lastIfStoppedQuestion(winner.ask.message, facts.stoppedWorkingHookKeys);
        if (stoppedQuestion !== undefined) deps.reach.projectHooks?.declinedSetAside.add(stoppedQuestion);
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
    settled: pipeline,
    isPipelineOver: () => pipelineOver || gaveUp,
    wasAnsweredAheadOfItsKills: () => answeredAhead,
    holdMayGo: deferred_2.promise,
    takesCaptureAtPipelineEnd: () => facts.captureAtPipelineEnd === true,
    resume: clock.resume,
    windDown: clock.windDown,
  });
  if (carrierCallId === undefined)
    rememberOutcome(callId, {
      state: "asked",
      askId,
    });
  if (askSeatsFull) {
    let withdrawMessage = seatsCounted
      ? tooManyPendingApprovalsMessage({
          targetName: deps.targetName,
          limit: SANDBOX_MAX_DEPTH,
        })
      : withdrawnRequestMessage({
          targetName: deps.targetName,
          reason: "evicted",
        });
    facts.askSeatsFull = seatsCounted;
    withdrawAskedCall(session, askId, {
      reason: "evicted",
      message: withdrawMessage,
      countedByItsLeg: seatsCounted,
    });
    let priorResult =
      callIdForRecord === undefined ? undefined : session.calls.lookup(callIdForRecord)?.result;
    return priorResult !== undefined && callId !== undefined
      ? rebindEnvelopeCallId(priorResult, callId)
      : (priorResult ??
          refusedEnvelope(target, facts, "withdrawn", withdrawMessage, {
            reason: "evicted",
            notes: state.notes.lines(),
          }));
  }
  let projectHooks = deps.reach.projectHooks;
  let updatedQuestion = winner.ask.heldHook
    ? findLastMatchingQuestion(winner.ask.message, facts.changedHookKeys, projectHooks?.updatedAsks)
    : undefined;
  let updatedEntry =
    updatedQuestion === undefined ? undefined : projectHooks?.updatedAsks.get(updatedQuestion);
  if (updatedQuestion !== undefined && updatedEntry !== undefined) {
    updatedEntry.puts += 1;
    if (updatedEntry.puts >= SERVED_HOOK_UPDATE_NOTICES)
      projectHooks?.declinedChangedSinceLast.add(updatedQuestion);
  }
  return askEnvelope;
}
//@ chunk-nvm0wye1.js:63318-63406 placement
function servableTools(deps) {
  return deps.tools.filter(
    (tool) =>
      !isMultiEntryAliasTool(tool) && getToolRemoteExecution(tool).supported && deps.policy.serves(tool),
  );
}
//@ chunk-nvm0wye1.js:63406-63494 placement
function servedShellToolName(deps) {
  let names = new Set(servableTools(deps).map((tool) => tool.name));
  return [BASH_TOOL_NAME, POWERSHELL_TOOL_NAME].find((name) => names.has(name));
}
//@ chunk-nvm0wye1.js:63494-63564 placement
function allServedTools(deps) {
  return [...servableTools(deps), ...(deps.servedMcpTools?.().values() ?? [])];
}
//@ chunk-nvm0wye1.js:63564-63630 placement
function findServedTool(deps, name) {
  return deps.servedMcpTools?.().get(name) ?? findToolByName(servableTools(deps), name);
}
//@ chunk-nvm0wye1.js:63630-63691 placement
function servedMcpWireArgs(deps, toolName) {
  return deps.servedMcpWireArguments?.(toolName) ?? renamedFieldCacheMap();
}
//@ chunk-nvm0wye1.js:63691-64270 placement
function executionPlacement(deps) {
  let vmMessage = vmUnavailableMessage({
    targetName: deps.targetName,
  });
  if (parseExecutionMode(deps.execution).mode !== "in_process")
    return typeof deps.executor === "function"
      ? {
          where: "handed_on",
          executor: deps.executor,
        }
      : {
          where: "refused",
          message: vmMessage,
        };
  let sandboxRequired = true;
  if (typeof deps.sandboxRequiredNow === "function")
    try {
      sandboxRequired = deps.sandboxRequiredNow();
    } catch (error) {
      logError(toError(error));
    }
  if (sandboxRequired === false)
    return {
      where: "here",
      executor: typeof deps.executor === "function" ? deps.executor : defaultServedCallRunner,
    };
  if (
    (typeof sandboxRequired === "object" || typeof sandboxRequired === "function") &&
    sandboxRequired !== null &&
    "then" in sandboxRequired
  )
    Promise.resolve(sandboxRequired).catch((error) => logError(toError(error)));
  return {
    where: "refused",
    message:
      sandboxRequired === "could_not_be_read"
        ? settingsUnreadableMessage({
            targetName: deps.targetName,
          })
        : vmMessage,
  };
}
//@ chunk-nvm0wye1.js:64270-64417 placement
function executionPlacementRefusal(deps) {
  let placement = executionPlacement(deps);
  switch (placement.where) {
    case "here":
      return;
    case "refused":
      return placement.message;
    case "handed_on":
      return vmUnavailableMessage({
        targetName: deps.targetName,
      });
  }
}
//@ chunk-nvm0wye1.js:64417-64527 placement
function isServedReadOnly(tool, input, deps) {
  if (parseExecutionMode(deps.execution).mode !== "in_process") return false;
  try {
    return tool.isReadOnly(input);
  } catch {
    return false;
  }
}
//@ chunk-nvm0wye1.js:64527-64680 placement
function callFailureEnvelope(error, target, facts, signal, extra) {
  if (signal.aborted || isAbortError(error))
    return failedEnvelope(target, facts, "cancelled", "The call was cancelled.", extra);
  logError(toError(error));
  return failedEnvelope(target, facts, "internal_error", callFailedText(target.name), extra);
}
//@ chunk-nvm0wye1.js:64680-64725 placement
function isSettingsError(parseError) {
  return parseError.severity !== "warning";
}
//@ chunk-nvm0wye1.js:64725-64794 placement
function isMissingPath(settingsFilePathForSource) {
  try {
    getFsImplementation().lstatSync(settingsFilePathForSource);
    return false;
  } catch (error) {
    return isENOENT(error);
  }
}
//@ chunk-nvm0wye1.js:64794-64889 placement
function isSymlinkedSettingsPath(settingsFilePathForSource) {
  let { resolvedPath, isSymlink, isCanonical } = safeResolvePath(
    getFsImplementation(),
    settingsFilePathForSource,
  );
  return isSymlink && (!isCanonical || isSpecialPath(resolvedPath));
}
//@ chunk-nvm0wye1.js:64889-65149 placement
function userSettingsErrorWatcher() {
  let cache = new Map();
  return () => {
    try {
      if (!isSettingSourceEnabled("userSettings")) return;
      if (getSettingsParseErrorsForSource("userSettings").some(isSettingsError)) return "held";
      let settingsFilePathForSource = getSettingsFilePathForSource("userSettings");
      if (settingsFilePathForSource === undefined || isMissingPath(settingsFilePathForSource)) return;
      return parseSettingsFileIfChanged(settingsFilePathForSource, cache).errors.some(isSettingsError) &&
        !isSymlinkedSettingsPath(settingsFilePathForSource)
        ? "disk"
        : undefined;
    } catch (error) {
      logError(toError(error));
      return "unknown";
    }
  };
}
//@ chunk-nvm0wye1.js:65149-66153 placement
function backgroundCommandStatusText(target, callId, status) {
  let { started, startedAt, ended } = status.command;
  let { outputTail } = status;
  let now = Date.now();
  let max = Math.max(0, (ended?.at ?? now) - startedAt);
  let sinceEndMs = ended && Math.max(0, now - ended.at);
  let format = (ms) =>
    formatDuration(ms, {
      hideTrailingZeros: true,
    });
  let where = `on ${target.name}`;
  let stateText =
    ended === undefined || sinceEndMs === undefined
      ? `${where} is running: started ${format(max)} ago, writing its output there to ${started.outputPath}, and stopped after ${format(started.limitMs)} in the background or earlier if ${target.name} stops serving this session.`
      : `${ended.how === "exited" ? `${where} is over: it exited with code ${ended.exitCode}` : `was stopped ${backgroundStopReasonText(ended.how, target.name)}`} ${format(sinceEndMs)} ago, after ${format(max)}.`;
  let tailText =
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
      text: `Background command ${started.shellId} ${stateText}${tailText}`,
    },
  ];
  let background = {
    state: ended?.how ?? "running",
    exit_code: ended?.exitCode,
    ran_ms: max,
    ended_ms_ago: sinceEndMs,
  };
  return {
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "completed",
      call_id: callId,
      target,
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
//@ chunk-nvm0wye1.js:66153-72918 placement
/**
 * 记录远程工具调用的 tengu_remote_tool_serve 遥测（结果、耗时、权限路径、分类器判定等）。
 */
function logServedCallTelemetry(envelope, facts, deps, session) {
  let outcomeKind =
    envelope.outcome === "completed"
      ? envelope.is_error
        ? "completed_error"
        : "completed"
      : envelope.outcome === "failed" && (envelope.code === "cancelled" || envelope.code === "timed_out")
        ? envelope.code
        : envelope.outcome;
  let modeForEval = facts.secondLeg ? facts.askedInMode : facts.sessionMode;
  let evaluated = effectiveServedMode({
    stance: deps.policy.stance,
    sessionMode: modeForEval,
    call: facts.trust,
  });
  let record =
    facts.query || facts.answeredFromRecord !== undefined || facts.callId === undefined
      ? undefined
      : session?.calls.lookup(facts.callId);
  if (
    deps.callLog !== undefined &&
    session !== undefined &&
    record !== undefined &&
    record.priorEpoch === undefined &&
    facts.callId !== undefined
  ) {
    let legNote = (callId, summary) => ({
      t: "leg",
      caller: session.callerSessionId,
      call_id: callId,
      tool: facts.resolvedToolName ?? "unresolved",
      is_mcp: facts.isMcp,
      input_fp: facts.inputFingerprint,
      transport: facts.arrivedOver,
      second_leg: facts.secondLeg,
      session_mode: facts.sessionMode ?? "absent",
      evaluated_mode: evaluated.mode,
      ...(facts.secondLeg && {
        approval_basis: facts.approvalBasis ?? "none",
      }),
      ...(facts.allowBasis !== undefined && {
        allow_basis: facts.allowBasis,
      }),
      ...(facts.denySource !== undefined && {
        deny_source: facts.denySource,
      }),
      ...(facts.rulesCheckCrashed === true && {
        rules_check_crashed: true,
      }),
      ...(facts.crashClass !== undefined && {
        crash_class: facts.crashClass,
      }),
      ...(facts.projectHook !== undefined && {
        hook: facts.projectHook,
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
      duration_ms: Date.now() - facts.startedAt,
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
    deps.callLog.note(legNote(facts.callId, record.summary));
    let carrierRecord =
      facts.askCarriedBy === undefined ? undefined : session.calls.lookup(facts.askCarriedBy);
    if (
      facts.askCarriedBy !== undefined &&
      carrierRecord !== undefined &&
      carrierRecord.priorEpoch === undefined
    )
      deps.callLog.note(legNote(facts.askCarriedBy, carrierRecord.summary));
  }
  let queryCount =
    facts.query && facts.callId !== undefined
      ? session?.calls.countOutcomeQuery(
          facts.callId,
          `${outcomeKind}:${envelope.outcome === "in_progress" ? `${envelope.state}${envelope.output_tail === undefined ? "" : "+output"}` : envelope.outcome === "refused" || envelope.outcome === "failed" ? envelope.code : ""}`,
        )
      : undefined;
  if (queryCount?.report === false) return;
  logEvent("tengu_remote_tool_serve", {
    call_id: sanitizeMarkName(facts.callId ?? facts.refusedToolUseId),
    host_epoch: sanitizeMarkName(deps.sessions.epoch),
    handle_hash: shortHash(deps.targetName),
    host_device_id: sanitizeMarkName(deps.deviceId),
    criteria_version: lit(REMOTE_TOOL_PROTOCOL_LABEL),
    tool: facts.toolNameForAnalytics,
    isMcp: facts.isMcp,
    shell: fromEnumOpt(servedShellKind(facts)),
    policy: fromEnum(deps.policy.name),
    transport: fromEnum(facts.arrivedOver),
    op: fromEnum(facts.query ? "outcome_of" : "call"),
    outcome_queries_since_last_row: queryCount?.sinceReported,
    outcome: fromEnum(outcomeKind),
    answered_from_record: fromEnumOpt(facts.answeredFromRecord),
    from_prior_epoch: facts.fromPriorEpoch,
    ...(facts.joinedCallId !== undefined && {
      joined_call_id: sanitizeMarkName(facts.joinedCallId),
    }),
    ...(facts.askCarriedBy !== undefined && {
      ask_carried_by: sanitizeMarkName(facts.askCarriedBy),
    }),
    ...(facts.workerEpoch !== undefined && {
      worker_epoch: facts.workerEpoch,
    }),
    ...(envelope.outcome === "refused" && {
      refusal_code: fromEnum(envelope.code),
    }),
    ...(facts.pathOverLimit === true && {
      path_over_limit: true,
    }),
    ...(facts.staleLeg !== undefined && {
      age_ms: facts.staleLeg.ageMs === undefined ? undefined : Math.round(facts.staleLeg.ageMs),
      window_ms: facts.staleLeg.windowMs,
    }),
    ...(facts.attestation !== undefined && {
      attestation_mode: fromEnum(facts.attestation.mode),
      request_attestation: fromEnum(facts.attestation.status),
      attestation_verdict: fromEnum(facts.attestation.verdict),
    }),
    ...(facts.untrustedRepositories !== undefined && {
      untrusted_repositories: fromEnum(facts.untrustedRepositories),
    }),
    mode_stamp: fromEnum(facts.modeStamp ?? "absent"),
    request_form: fromEnum(facts.requestForm),
    ...(facts.sharedRequestRefusal !== undefined && {
      shared_request_refusal: fromEnum(facts.sharedRequestRefusal),
    }),
    ...(facts.sharedRequestPart !== undefined && {
      part: fromEnum(facts.sharedRequestPart),
    }),
    server_verdict: fromEnum(serverVerdictKind(facts.serverVerdict)),
    ...(facts.sessionInterface !== undefined &&
      interfaceTelemetry(facts.sessionInterface.stated, facts.sessionInterface.fit)),
    ...(envelope.outcome === "refused" &&
      facts.seatsFull && {
        sessions_in_use: deps.sessions.size,
        sessions_limit: deps.sessions.limit,
      }),
    ...(envelope.outcome === "failed" && {
      failure_code: fromEnum(envelope.code),
    }),
    ...(envelope.outcome === "completed" &&
      envelope.disposition !== undefined && {
        disposition: fromEnum(envelope.disposition),
      }),
    force_ask: facts.forceAsk,
    ask_class: envelope.outcome === "needs_approval" ? fromEnumOpt(facts.askClass) : lit("none"),
    ...(envelope.outcome === "needs_approval" &&
      facts.mcpPathWhy !== undefined && {
        mcp_path_why: fromEnum(facts.mcpPathWhy),
      }),
    through_second_root_mount: facts.throughSecondRootMount,
    allow_basis: fromEnumOpt(facts.allowBasis),
    deny_source: fromEnumOpt(facts.denySource),
    host_credential_refusal: fromEnumOpt(facts.hostCredentialRefusal),
    under_windows_profile_glob: facts.underWindowsProfileGlob,
    rules_check_crashed: facts.rulesCheckCrashed === true,
    input_parse_threw: facts.inputParseThrew === true,
    crash_class: facts.crashClass,
    denied_under_forced_ask: facts.deniedUnderForcedAsk === true,
    owner_settings_lost: fromEnumOpt(facts.ownerSettingsLost),
    second_leg: facts.secondLeg,
    approval_decision: fromEnum(facts.envelope?.approval?.decision ?? "none"),
    ...(facts.secondLeg && {
      approval_basis: fromEnum(facts.approvalBasis ?? "none"),
    }),
    ask_ended_by_throw: facts.askEndedByThrow,
    evaluated_mode: fromEnum(evaluated.mode),
    mode_capped: evaluated.capped,
    auto_refused_here: evaluated.autoRefusedHere,
    consent_pending:
      deps.policy.stance.unattended === "own_record" ? unattendedServingConsentPending() : undefined,
    unattended_by_host_flag:
      deps.policy.stance.unattended === "own_record" ? unattendedServingAllowedByHostFlag() : undefined,
    auto_refused_why:
      deps.policy.stance.unattended === "own_record"
        ? fromEnum(evaluated.autoRefusedHere ? autoModeRefusedForServedCallsWhy() : "none")
        : undefined,
    plan_classifier_backed: isPlanFloor(modeForEval, deps.policy.stance.unattended),
    destination_downgraded: facts.destinationDowngraded,
    session_mode: fromEnum(facts.sessionMode ?? "absent"),
    envelope: fromEnum(facts.envelopeStatus),
    read_baseline_carried: facts.envelope?.read_baseline !== undefined,
    truncated: facts.truncated,
    ...(envelope.outcome === "completed" && {
      documents: envelope.documents?.length ?? 0,
    }),
    ...(envelope.outcome === "in_progress" &&
      envelope.output_tail !== undefined && {
        output_tail_bytes: Buffer.byteLength(envelope.output_tail.text),
      }),
    duration_ms: Date.now() - facts.startedAt,
    posture_wait_ms: facts.postureWaitMs,
    hold_ms: facts.holdMs,
    hold_stands_at_answer: facts.holdStandsAtAnswer === true,
    pipeline_ms: facts.pipelineMs,
    capture_at_pipeline_end: facts.captureAtPipelineEnd === true,
    stopped_before_hold: facts.stoppedBeforeHold,
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
  if (facts.query || facts.answeredFromRecord !== undefined) return;
  if (facts.arrivedOver === "relay") return;
  let misfit = facts.sessionInterface && misfitOfFit(facts.sessionInterface.fit);
  if (envelope.outcome === "completed" && !envelope.is_error) logFeatureOk("remote_tool_serve");
  else if (envelope.outcome === "completed")
    logFeatureSad("remote_tool_serve", envelope.disposition ?? "completed_error");
  else if (envelope.outcome === "acknowledged" && facts.deniedBySession)
    logFeatureSad("remote_tool_serve", "denied_by_session");
  else if (
    envelope.outcome === "needs_approval" ||
    envelope.outcome === "acknowledged" ||
    envelope.outcome === "in_progress" ||
    facts.askStillPending
  );
  else if (envelope.code === "cancelled") logFeatureSad("remote_tool_serve", "cancelled");
  else if (facts.staleLeg !== undefined)
    logFeatureSad(
      "remote_tool_serve",
      facts.staleLeg.judgedBy === "ask_age"
        ? "undated_answer"
        : facts.staleLeg.judgedBy === "dated_ask_age"
          ? "aged_answer"
          : facts.staleLeg.ageMs === undefined
            ? "undatable_leg"
            : "stale_leg",
      {
        answer_leg: facts.secondLeg,
      },
    );
  else if (facts.askSeatsFull) logFeatureSad("remote_tool_serve", "ask_seats_full");
  else if (misfit !== undefined && envelope.code === "unsupported_protocol")
    logFeatureSad("remote_tool_serve", misfitDirection(misfit));
  else if (facts.sharedRequestRefusal !== undefined)
    logFeatureBad("remote_tool_serve", `shared_request_${facts.sharedRequestRefusal}`);
  else logFeatureBad("remote_tool_serve", envelope.code);
}
//@ chunk-nvm0wye1.js:72918-73036 placement
function servedShellKind(facts) {
  let resolvedToolName = facts.resolvedToolName;
  if (facts.isMcp === true || resolvedToolName === undefined || !isShellToolName(resolvedToolName)) return;
  return resolvedToolName === POWERSHELL_TOOL_NAME ? "powershell" : "bash";
}
//@ chunk-nvm0wye1.js:73036-73047 placement
var MAX_TELEMETRY_STRING = 128;

// The import cycle this module closes (3 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("src/remote/tools/serve/serveCall.js");
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
