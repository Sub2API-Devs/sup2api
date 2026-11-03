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
import { randomUUID, randomUUID as randomUUID_2 } from "crypto";
import { logEvent } from "../../../services/analytics/index.js";
import { ye } from "../../../utils/startupMarks.js";
import {
  unattendedServingConsentViewIsFresh,
  freshUnattendedServingConsent,
  unattendedServingAllowedByHostFlag,
  unattendedServingConsentPending,
} from "../../../services/remoteTools/unattendedConsentStore.js";
import { getToolRemoteExecution, findToolByName } from "../../../Tool.js";
import {
  unsupportedFieldRefusal,
  uNt,
  stripTargetField,
  renameInputFields,
  SIMULATED_SED_EDIT_KEY,
  pickKnownFields,
  unrenameOutputFields,
  Lrn,
} from "../../../services/remoteTools/pathMapping.js";
import {
  refusedEnvelope,
  createNoteSet,
  sessionModeFromStamp,
  isServedNutEnabled,
} from "./backgroundCommands.js";
import { wo, callerKey, decidingInput, callFailedText } from "./servedShellSettings.js";
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
import { N6 } from "../../../utils/stableHash.js";
import { isSessionDenial, failedEnvelope, rebindEnvelopeCallId } from "./callStatusQuery.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../../services/analytics/featureTelemetry.js";
import { REPLACED_BY_RETRY, cer } from "../servedCallLog.js";
import { B7 } from "../../../services/remoteTools/shellForwarding.js";
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
import { LOs } from "../../../tools/PowerShellTool/PowerShellTool.js";
import { AJ } from "../callResults.js";
import { formatDuration } from "../../../utils/format.js";
import { FL, xTe } from "../../../tools/shared/textSearchTools.js";
import {
  HOOK_NOT_ACCEPTED_NOTICE,
  GBr,
  SERVED_HOOK_NOTICES,
  jBr,
  Bqs,
  BBr,
  jqs,
  WBr,
  SERVED_HOOK_UPDATED_ACCEPTED,
  zqs,
  SERVED_HOOK_SET_ASIDE,
  Vqs,
  SERVED_HOOK_UPDATE_NOTICES,
} from "../../../utils/hooks/servedHooks/notices.js";
import { canonicalNameKeeping1m } from "../../../utils/model/canonicalModelName.js";
import { logError } from "../../../utils/log.js";
import { settingsSourcesInReach } from "../../../utils/hooks.js";
import { normalizeCommandForPlatform } from "../../../utils/git.js";
import { rjt } from "../../../utils/ShellCommand.js";
import { servedToolPath, isMountPointRule, stripDoubleSlashPrefix } from "./servedPathJudgement.js";
import { HOST_CREDENTIAL_RULE_SOURCE, isUnderUserProfiles } from "./credentialPathGuards.js";
import { credentialRuleKind } from "./servedSafetyChecks.js";
import { cancelledToolResult } from "./resultShaping.js";
import { isRanOutcome, REMOTE_TOOL_PROTOCOL_VERSION, serverVerdictKind } from "../protocolConstants.js";
import { wgt } from "../../../utils/sandbox/sandboxDefaultPolicy.js";
import { ut, isWindowsSandboxPolicyViolation } from "./servingState.js";
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
import { gn } from "../../../utils/shortHash.js";
import { lit, fromEnumOpt, fromEnum } from "../../../services/analytics/safeMetadata.js";
import { DYt } from "../protocolSchemas.js";
import { jsonStringify } from "../../../utils/slowOperations.js";

//@ chunk-ad2e1aj6.js:43267-43284 placement
var es = randomUUID_2(),
  _o = 0;
//@ chunk-ad2e1aj6.js:43284-43314 placement
function ts() {
  return ((_o += 1), _o);
}
//@ chunk-ad2e1aj6.js:43314-43565 placement
function noteLateHoldRelease(e, n, s) {
  if (!n || !s.wasAnsweredAheadOfItsKills()) return;
  e.holdStandsAtAnswer = !0;
  let now = Date.now();
  s.holdMayGo
    .then(() =>
      logEvent("tengu_remote_tool_hold_released_late", {
        call_id: ye(e.callId),
        second_leg: e.secondLeg,
        late_ms: Date.now() - now,
      }),
    )
    .catch(() => {});
}
/**
 * 远程工具服务端的单次调用全流程：无人值守同意、输入校验、权限判定（会话询问/分类器/钩子）、执行、结果与遥测。
 */
//@ chunk-ad2e1aj6.js:43565-62338 placement
async function serveToolCall(e) {
  let { tool: tool, wireArguments: wireArguments, ctx: ctx, deps: deps, facts: facts } = e;
  if (deps.policy.stance.unattended !== "conveyed" && !unattendedServingConsentViewIsFresh())
    await freshUnattendedServingConsent(ctx.signal);
  let y = getToolRemoteExecution(tool),
    O = deps.policy.refusedInputFields?.(tool) ?? (y.supported ? (y.refusedInputFields ?? []) : []),
    R = unsupportedFieldRefusal(e.toolInput, O, deps.targetName);
  if (R !== void 0) return refusedEnvelope(e.target, facts, "refused_field", R);
  let w = executionPlacement(deps);
  if (w.where === "refused") return refusedEnvelope(e.target, facts, "sandbox_unavailable", w.message);
  let { executor: executor } = w,
    P = executor === wo,
    constraints = deps.policy.constraints(tool, deps.launchDir, { approvalAttested: facts.approvalAttested }),
    Y =
      deps.policy.stance.unattended === "own_record" && unattendedServingAllowedByHostFlag()
        ? { ...constraints, sandbox: "required", scrubCredentialEnv: !0 }
        : constraints,
    F = uNt(e.toolInput, O),
    forCaller = deps.sessions.forCaller(callerKey(ctx));
  if (forCaller === void 0)
    return (
      (facts.seatsFull = !0),
      logRemoteTools(facts.envelope?.call_id, "capacity refused", {
        sessions_in_use: deps.sessions.size,
        sessions_limit: deps.sessions.limit,
      }),
      refusedEnvelope(
        e.target,
        facts,
        "too_many_in_flight",
        tooManySessionsMessage({ targetName: deps.targetName, limit: deps.sessions.limit }),
      )
    );
  let L = facts.envelope?.call_id,
    j = facts.envelope?.approval;
  resetCallerReadStateOnClear(forCaller, facts.envelope);
  let M = ctx.sessionId === void 0 ? void 0 : deps.dirSyncOf?.(ctx.sessionId);
  if (L !== void 0 && j === void 0 && !facts.enteredRecord)
    if (
      forCaller.calls.receive(L, {
        retryKey: decidingInput(tool, e.toolInput, forCaller.cwd ?? deps.launchDir),
        workerEpoch: ctx.workerEpoch,
      })
    )
      facts.enteredRecord = !0;
    else {
      let lookup = forCaller.calls.lookup(L);
      if (lookup !== void 0)
        return joinKnownCall({
          known: lookup,
          session: forCaller,
          hostEpoch: deps.sessions.epoch,
          callId: L,
          target: e.target,
          facts: facts,
        });
    }
  let cwd = forCaller.cwd,
    ee = Y.pinCwd || cwd === void 0 ? deps.launchDir : cwd,
    q = { ...e.target, working_dir: deps.announcedDir ?? ee },
    ae = j === void 0 ? platformPathGuard(tool, F, ee) : void 0;
  if (ae !== void 0)
    return (
      (facts.pathOverLimit = !0),
      refusedEnvelope(
        q,
        facts,
        "invalid_request",
        REMOTE_TOOLS_CONSENT_TEXT["refused.path_too_long"](deps.targetName, ae),
      )
    );
  let fe = N6(tool.name, F);
  facts.inputFingerprint = fe;
  let V = (S, G) => {
      if (S !== void 0) forCaller.calls.remember(S, G);
    },
    K = (S, G) => {
      if (S !== void 0) forCaller.calls.settle(S, G, isSessionDenial(G));
    };
  if (L !== void 0 && j === void 0) {
    let retryOf = forCaller.calls.retryOf(L);
    if (retryOf !== void 0 && !isServedReadOnly(tool, F, deps)) {
      let { summary: summary } = retryOf.call,
        re =
          summary.state === "asked" && summary.askId !== void 0
            ? forCaller.pendingAsks.peek(summary.askId)
            : void 0;
      if (re === void 0 || re.redeemingLegs > 0)
        return joinRetry({
          session: forCaller,
          joined: retryOf,
          hostEpoch: deps.sessions.epoch,
          callId: L,
          target: q,
          facts: facts,
          workerEpoch: ctx.workerEpoch,
        });
      if (
        (logRemoteTools(L, "retry replaced ask", {
          replaced_call: retryOf.callId,
          ask_id: re.askId,
          worker_epoch: ctx.workerEpoch,
        }),
        facts.arrivedOver !== "relay")
      )
        logFeatureSad("remote_tool_serve", "ask_replaced_by_retry");
      withdrawAskedCall(forCaller, re.askId, {
        reason: REPLACED_BY_RETRY,
        message: withdrawnRequestMessage({ targetName: deps.targetName, reason: REPLACED_BY_RETRY }),
      });
      let ie = forCaller.calls.lookup(retryOf.callId)?.result,
        De = { state: "failed", code: REPLACED_BY_RETRY };
      if (ie === void 0) V(retryOf.callId, De);
      else forCaller.calls.settle(retryOf.callId, ie, De);
    }
    if (facts.enteredRecord)
      forCaller.calls.rekey(L, decidingInput(tool, e.toolInput, forCaller.cwd ?? deps.launchDir));
  }
  if (j !== void 0) {
    let peek = forCaller.pendingAsks.peek(j.ask_id);
    if (peek === void 0) {
      let ie = L === void 0 ? void 0 : forCaller.calls.lookup(L);
      return ie !== void 0 && L !== void 0
        ? joinKnownCall({
            known: ie,
            session: forCaller,
            hostEpoch: deps.sessions.epoch,
            callId: L,
            target: q,
            facts: facts,
          })
        : refusedEnvelope(
            q,
            facts,
            "invalid_request",
            j.decision === "deny"
              ? `That permission request was no longer pending on ${deps.targetName} \u2014 nothing ran and nothing will.`
              : staleApprovalMessage({ targetName: deps.targetName, why: "gone" }),
          );
    }
    facts.askedInMode = peek.askedInMode;
    let G = { ...e.target, working_dir: deps.announcedDir ?? peek.startCwd },
      re = peek.callId !== void 0 && peek.callId === L;
    if (j.decision === "deny" && !re)
      return (
        (facts.askStillPending = !0),
        refusedEnvelope(
          G,
          facts,
          "invalid_request",
          `That decline named a different call than the pending question on ${deps.targetName} \u2014 the question is still pending and nothing ran.`,
        )
      );
    if (j.decision === "deny" || (re && peek.fingerprints.includes(fe))) {
      let ie = stripTargetField(
        j.updated_input === void 0 ? void 0 : renameInputFields(j.updated_input, wireArguments),
        deps.targetName,
      );
      if (ie !== void 0 && j.decision === "allow") {
        let se =
          unsupportedFieldRefusal(ie, O, deps.targetName) ??
          (SIMULATED_SED_EDIT_KEY in ie
            ? unsupportedFieldMessage({ field: SIMULATED_SED_EDIT_KEY, targetName: deps.targetName })
            : void 0);
        if (se !== void 0)
          return ((facts.askStillPending = !0), refusedEnvelope(G, facts, "refused_field", se));
        if (!peek.fingerprints.includes(N6(tool.name, pickKnownFields(peek.evaluatedInput, uNt(ie, O)))))
          return (
            (facts.askStillPending = !0),
            refusedEnvelope(
              G,
              facts,
              "invalid_request",
              `An approval cannot change the call it approves on ${deps.targetName} \u2014 nothing ran and the request is still pending. Send the changed call as a new one.`,
            )
          );
      }
      if (j.decision === "allow") {
        let se = Date.now() - peek.createdAt,
          Ae = arrivesOverSession(peek.raisedOver) || arrivesOverSession(facts.arrivedOver);
        if ((!Ae || deps.policy.limits.max_ask_ms !== void 0) && se > B7) {
          let xe = expiredApprovalMessage({
            targetName: deps.targetName,
            askAgeMs: se,
            windowMs: B7,
            dated: Ae,
          });
          return (
            withdrawAskedCall(forCaller, j.ask_id, { reason: "stale_answer", message: xe }),
            (facts.staleLeg = { ageMs: se, windowMs: B7, judgedBy: Ae ? "dated_ask_age" : "ask_age" }),
            logRemoteTools(L, `${Ae ? "aged" : "undated"} allow refused`, {
              ask_age_ms: Math.round(se),
              window_ms: B7,
            }),
            refusedEnvelope(G, facts, "stale", xe, { reason: "stale_answer" })
          );
        }
      }
      if (acceptsArrival(peek.raisedOver, facts.arrivedOver)) {
        let se = callerKindForArrival(
          facts.arrivedOver,
          deps.registrationTransport ?? "auto",
          {
            attested: j.attested,
            callerKind: facts.envelope?.caller.kind,
            toolName: tool.name,
            isServedMcpTool: tool.isMcp === !0,
            sessionMode: facts.sessionMode,
            askedInMode: peek.askedInMode,
            classifierEligible: peek.classifierEligible,
            autoModeRefusedHere:
              w.where === "handed_on"
                ? servingConsentRequirement(deps.policy.stance.unattended) !== void 0
                : deps.policy.stance.unattended === "conveyed" || autoModeRefusedForServedCalls(),
            planClaimBackedHere: isPlanFloor(facts.sessionMode, deps.policy.stance.unattended),
            serverVerdict: facts.serverVerdict,
          },
          facts.trust,
        );
        if (((facts.approvalAttested = se === "attested"), j.decision === "allow")) facts.approvalBasis = se;
      }
      if (j.decision === "allow" && facts.approvalBasis === void 0)
        return (
          (facts.askStillPending = !0),
          refusedEnvelope(
            G,
            facts,
            "no_approval",
            acceptsArrival(peek.raisedOver, facts.arrivedOver)
              ? `The approval for this call could not be verified as the person's own, so ${deps.targetName} did not run it; the request is still pending.`
              : `The approval for this call arrived over a different channel than the one the request was put on, so ${deps.targetName} did not run it; the request is still pending.`,
          )
        );
      if (((facts.forceAsk = peek.raisedToAsk), j.decision === "deny")) {
        if (((facts.deniedBySession = !0), facts.approvalAttested)) peek.onDeclined?.();
        return (
          recordSessionDenial(forCaller, j.ask_id, sessionDeclineDenial(j.feedback)),
          acknowledgedEnvelope(G, facts, j.ask_id)
        );
      }
      let De = () => {
          let se = L === void 0 ? void 0 : forCaller.calls.lookup(L);
          return se !== void 0 && L !== void 0
            ? joinKnownCall({
                known: se,
                session: forCaller,
                hostEpoch: deps.sessions.epoch,
                callId: L,
                target: q,
                facts: facts,
              })
            : refusedEnvelope(
                G,
                facts,
                "invalid_request",
                staleApprovalMessage({ targetName: deps.targetName, why: "gone" }),
              );
        },
        $e = (se, Ae) => {
          let xe = { ...failedEnvelope(G, facts, se, Ae), ...(P && { ranNothing: !0 }) };
          return settleAskedCall(forCaller, j.ask_id, xe, askEndedDenial(Ae)) ? xe : De();
        };
      if (callDeadlineMs(deps.policy.limits, facts.envelope) - (Date.now() - facts.startedAt) <= 0)
        return $e(
          "timed_out",
          `The approval reached ${deps.targetName} with no time left to run the call (admission took longer than the caller allowed) \u2014 nothing ran, and the approval is used up. Run the tool again if it is still needed.`,
        );
      let Te = M?.holdInstalls !== void 0 && ctx.signal.aborted;
      if (Te) facts.stoppedBeforeHold = !0;
      let dt = `${j.ask_id}:${randomUUID_2()}`,
        fn = !1,
        Ve =
          M?.holdInstalls === void 0 || Te
            ? null
            : Promise.resolve(M.holdInstalls(dt, () => !fn && !peek.isPipelineOver())).catch(() => {}),
        pn = () =>
          void Ve?.then(() => {
            try {
              M?.releaseInstalls?.(dt);
            } catch (error) {
              logForDebugging(`[remote-tools] releasing the install hold failed: ${errorMessage(error)}`, {
                level: "warn",
              });
            }
          }),
        Ye = () => {
          ((fn = !0), pn());
        };
      if (Ve !== null) {
        let se = !1;
        Ve.then(() => {
          se = !0;
        });
        let Ae = callDeadlineMs(deps.policy.limits, facts.envelope) - (Date.now() - facts.startedAt),
          now = Date.now();
        if (
          (await Promise.race([
            Ve,
            createChildAbortController_2(ctx.signal),
            ...(Number.isFinite(Ae)
              ? [createChildAbortController_2(AbortSignal.timeout(Math.max(0, Ae)))]
              : []),
          ]),
          (facts.holdMs = Date.now() - now),
          !se)
        )
          return (
            Ye(),
            $e(
              ctx.signal.aborted ? "cancelled" : "timed_out",
              `The approval reached ${deps.targetName}, but the call was stopped before the command started \u2014 nothing ran, and the approval is used up. Run the tool again if it is still needed.`,
            )
          );
      }
      let hn = w.where === "handed_on" && facts.approvalBasis === "auto_arm";
      if (hn && !unattendedServingConsentViewIsFresh()) await freshUnattendedServingConsent(ctx.signal);
      if (hn && servingConsentRequirement(deps.policy.stance.unattended) !== void 0)
        return (
          Ye(),
          (facts.approvalBasis = void 0),
          (facts.askStillPending = !0),
          refusedEnvelope(
            G,
            facts,
            "no_approval",
            `${deps.targetName} no longer lets a classifier approve this call, so it did not run; the request is still pending for a person.`,
          )
        );
      if (forCaller.pendingAsks.take(j.ask_id) === void 0) return (Ye(), De());
      let bt = w.where === "here" ? executionPlacementRefusal(deps) : void 0;
      if (bt !== void 0) {
        Ye();
        let se = { ...refusedEnvelope(G, facts, "sandbox_unavailable", bt), ranNothing: !0 };
        return (K(peek.callId, se), peek.windDown(), peek.answer(askEndedDenial(bt)), se);
      }
      peek.holdMayGo.then(pn);
      let settled = peek.settled;
      settled.catch(() => {});
      let now = Date.now();
      try {
        if (peek.callId !== void 0 && !ctx.signal.aborted)
          (V(peek.callId, { state: "running", started: !0 }),
            deps.callLog?.note({
              t: "started",
              caller: forCaller.callerSessionId,
              call_id: peek.callId,
              tool: tool.name,
              input_fp: fe,
              by: "session",
              basis: facts.approvalBasis,
            }));
        if (
          (peek.resume({
            signal: ctx.signal,
            startedAt: facts.startedAt,
            expiresInMs: callDeadlineMs(deps.policy.limits, facts.envelope),
          }),
          facts.arrivedOver !== "session" || facts.approvalAttested)
        )
          peek.onApproved?.({ attested: facts.approvalAttested });
      } catch (error) {
        (Ye(), (facts.askEndedByThrow = !0));
        let Ae = { ...callFailureEnvelope(error, G, facts, ctx.signal, {}), ...(P && { ranNothing: !0 }) };
        return (
          K(peek.callId, Ae),
          peek.windDown(),
          peek.answer(askEndedDenial(callFailedText(deps.targetName))),
          Ae
        );
      }
      if (
        (peek.answer({
          behavior: "allow",
          updatedInput: peek.evaluatedInput,
          decisionReason: { type: "other", reason: REMOTE_CALL_SESSION_ANSWER },
        }),
        facts.approvalAttested &&
          deps.policy.capabilities?.includes("standing_approvals") === !0 &&
          peek.standingRowOffered)
      )
        await keepStandingApprovals(forCaller, j.permission_updates, facts, {
          toolName: tool.name,
          input: peek.evaluatedInput,
          offered: LOs(peek.asked.envelope),
        }).catch((se) => {
          logRemoteTools(
            L,
            "standing approval not kept",
            { error: se instanceof Error ? se.name : "unknown" },
            "warn",
          );
        });
      let lt = await settled;
      if (
        (noteLateHoldRelease(facts, Ve !== null, peek),
        (facts.captureAtPipelineEnd = peek.takesCaptureAtPipelineEnd()),
        (facts.pipelineMs = Date.now() - now),
        (facts.truncated = lt.envelope.outcome === "completed" && lt.envelope.truncated === !0),
        peek.pipelineCallId === void 0)
      )
        return lt;
      logRemoteTools(peek.callId, "carried run settled", { pipeline_call: peek.pipelineCallId });
      let Sn = rebindEnvelopeCallId(lt, peek.callId);
      return (K(peek.callId, Sn), Sn);
    }
  }
  if (j !== void 0) {
    let S = L === void 0 ? void 0 : forCaller.calls.lookup(L);
    if (S !== void 0 && L !== void 0)
      return joinKnownCall({
        known: S,
        session: forCaller,
        hostEpoch: deps.sessions.epoch,
        callId: L,
        target: q,
        facts: facts,
      });
    return (
      (facts.askStillPending = !0),
      refusedEnvelope(
        q,
        facts,
        "invalid_request",
        staleApprovalMessage({ targetName: deps.targetName, why: "other" }),
      )
    );
  }
  let Se = (S) => V(L, S),
    stance = deps.policy.stance,
    Z = createAbortController(),
    X = AJ(callDeadlineMs(deps.policy.limits, facts.envelope)),
    ce = X - (Date.now() - facts.startedAt);
  if (ce <= 0)
    return (
      Se({ state: "failed", code: "timed_out", ranNothing: !0 }),
      {
        ...failedEnvelope(
          q,
          facts,
          "timed_out",
          `The call reached ${deps.targetName} with no time left before its ${formatDuration(Math.max(1000, X))} deadline (admission took longer than the caller allowed) \u2014 nothing ran.`,
        ),
        ranNothing: !0,
      }
    );
  let ge = FL(tool) || tool.mcpInfo !== void 0,
    _e = {
      facts: facts,
      target: q,
      targetName: deps.targetName,
      callId: L,
      controller: Z,
      clock: createCallLifetime({ remainingMs: ce, controller: Z, leg: ctx.signal, lifetime: deps.lifetime }),
      notes: createNoteSet(),
      permissionOutcome: void 0,
      toolVerdict: void 0,
    };
  if (deps.projectHookWaitingFor?.(callerKey(ctx)) === !0)
    _e.notes.add("project_hook_waiting", HOOK_NOT_ACCEPTED_NOTICE);
  let { clock: clock } = _e,
    te,
    promise = new Promise((S) => {
      te = S;
    }),
    me =
      facts.envelope?.caller.model !== void 0
        ? canonicalNameKeeping1m(facts.envelope.caller.model, { overridesMap: {} })
        : void 0,
    ke,
    Qe = (S) => {
      (ke?.giveUp(),
        (_e.permissionOutcome = S),
        (facts.forceAsk = S.raisedToAsk),
        (facts.throughSecondRootMount = S.throughSecondRootMount),
        (facts.allowBasis = S.allowBasis),
        (facts.denySource = S.denySource),
        (facts.hostCredentialRefusal = S.hostCredentialRefusal),
        (facts.underWindowsProfileGlob = S.underWindowsProfileGlob),
        (facts.rulesCheckCrashed = S.rulesCheckCrashed && !0),
        (facts.inputParseThrew = S.rulesCheckCrashed?.inputParseThrew || void 0),
        (facts.crashClass = S.rulesCheckCrashed?.crashClass),
        (facts.deniedUnderForcedAsk = S.deniedUnderForcedAsk));
      let G = (S.kind === "allowed" || S.kind === "approved_by_session") && !Z.signal.aborted;
      if (G) Se({ state: "running", started: !0 });
      if (G && S.kind === "allowed" && L !== void 0)
        deps.callLog?.note({
          t: "started",
          caller: forCaller.callerSessionId,
          call_id: L,
          tool: tool.name,
          input_fp: fe,
          by: "host",
          basis: S.allowBasis,
        });
      if ((S.kind === "allowed" || S.kind === "approved_by_session") && Y.maxTimeoutMs === void 0 && ge)
        (clock.enterRunning(),
          logRemoteTools(L, "running: call deadline disarmed", {
            epoch: deps.sessions.epoch,
            outcome: S.kind,
          }));
    },
    je = (S) => {
      (ke?.giveUp(),
        (facts.forceAsk = S.raisedToAsk),
        (facts.askClass = S.askClass),
        (facts.mcpPathWhy = S.mcpPathWhy));
      try {
        if (deps.ownSettingsWaitingFor?.(callerKey(ctx)) === !0)
          _e.notes.add(
            "own_settings_waiting",
            REMOTE_TOOLS_CONSENT_TEXT["served_settings.own_waiting.session_note"],
          );
      } catch (error) {
        logError(toError(error));
      }
      te?.(S);
    },
    et = `remote_${randomUUID_2()}`;
  Se({ state: "running" });
  let Ee = `ask_${randomUUID_2()}`;
  if (stance.honorLocalRules)
    await settingsSourcesInReach(
      (await deps.reach.current()).map(normalizeCommandForPlatform),
      deps.storageV5,
      deps.reach.distrustedSources,
    );
  let vt = Ee,
    Ie = null,
    He = !1,
    tt = () => {
      if (Ie !== null && !He)
        ((He = !0),
          Ie.then(() => {
            try {
              M?.releaseInstalls?.(vt);
            } catch (error) {
              logForDebugging(`[remote-tools] releasing the install hold failed: ${errorMessage(error)}`, {
                level: "warn",
              });
            }
          }));
    },
    We,
    Ke = !1,
    wt = !1,
    Tt = !1,
    withResolvers = Promise.withResolvers(),
    nt = () => {
      ((Ke = !0), withResolvers.resolve());
    },
    withResolvers_2 = Promise.withResolvers(),
    on = !1,
    rn = !1,
    rt,
    Bo = () => (
      (rt =
        executionPlacementRefusal(deps) ??
        (Y.sandbox !== "required" &&
        stance.unattended === "own_record" &&
        unattendedServingAllowedByHostFlag()
          ? admissionChangedMessage({ targetName: deps.targetName })
          : void 0)),
      rt
    ),
    st,
    jo = (S) => {
      if (st !== void 0) return;
      if (((st = S), S.ended.then(nt, nt), S.givenUp && !ge)) {
        let G = () => {
          ((wt = !0), withResolvers_2.resolve());
        };
        Promise.resolve().then(rjt).then(G, G);
      }
    },
    sn = (async () => {
      let S;
      try {
        let G = () =>
            servedPermissionContext({
              stance: stance,
              launchDir: deps.launchDir,
              sessionMode: facts.sessionMode,
              sessionUpdates: sessionUpdatesForCaller(forCaller),
              call: facts.trust,
              userSettings: deps.userSettingsAtAttach?.(),
              sandboxTurnedOnByHeldFile: deps.sandboxTurnedOnByHeldFile?.(),
            }),
          re = G();
        logRemoteTools(L, "permission mode", {
          tool: tool.name,
          ...servedModeTelemetry({ stance: stance, sessionMode: facts.sessionMode, evaluatedMode: re.mode }),
        });
        let ie = servedToolPath(tool, F, re, ee);
        if (ie !== void 0) {
          ((facts.throughSecondRootMount = isMountPointRule(ie)),
            (_e.permissionOutcome = { kind: "denied_by_rule", raisedToAsk: !1 }),
            (facts.denySource = HOST_CREDENTIAL_RULE_SOURCE));
          let Te = credentialRuleKind(ie);
          return (
            (facts.hostCredentialRefusal = Te),
            (facts.underWindowsProfileGlob = isUnderUserProfiles(stripDoubleSlashPrefix(ie))),
            (S = callResultEnvelope(
              _e,
              cancelledToolResult(
                et,
                credentialRefusalMessage({
                  targetName: deps.targetName,
                  kind: Te,
                  subject: stripDoubleSlashPrefix(ie),
                }),
              ),
            )),
            S
          );
        }
        let De = executor({
          tool: tool,
          toolInput: F,
          toolUseId: et,
          startCwd: ee,
          constraints: Y,
          sessionModel: me,
          permissionContext: re,
          permissionContextNow: G,
          session: forCaller,
          state: _e,
          callerSessionId: ctx.sessionId,
          deps: deps,
          legDeadlineAt: facts.startedAt + X,
          onOutcome: Qe,
          onAsk: je,
          onAnsweredAhead: jo,
          ...(w.where === "here" && { refusalAsAllowLands: Bo, ownCheckAhead: () => ke }),
        });
        if (M?.holdInstalls !== void 0) {
          if (Z.signal.aborted) return ((facts.stoppedBeforeHold = !0), (S = stoppedBeforeStart(_e)), S);
          if (w.where === "here")
            ke = tryAutoModeAllowlist({
              stance: stance,
              tool: tool,
              forwardedInput: F,
              permissionContext: re,
              sessionMode: facts.sessionMode,
              serviceWrittenSessionMode: sessionModeFromStamp(facts),
              call: facts.trust,
              callStop: Z,
              callId: L ?? et,
              legDeadlineAt: facts.startedAt + X,
            });
          let Te = !1,
            now = Date.now();
          if (
            ((Ie = Promise.resolve(M.holdInstalls(vt, () => !rn && !Ke && !wt))
              .catch(() => {})
              .then(() => {
                Te = !0;
              })),
            await Promise.race([Ie, createChildAbortController_2(Z.signal)]),
            (facts.holdMs = Date.now() - now),
            Z.signal.aborted && !Te)
          )
            return ((S = timedOutOrCancelled(_e)), S);
        }
        let $e = w.where === "here" ? executionPlacementRefusal(deps) : void 0;
        if ($e !== void 0)
          return (
            (S = {
              ...refusedEnvelope(q, facts, "sandbox_unavailable", $e, { notes: _e.notes.lines() }),
              ranNothing: !0,
            }),
            S
          );
        if (((We = Date.now()), (S = await De()), st === void 0)) nt();
        if (rt !== void 0)
          S = {
            ...refusedEnvelope(q, facts, "sandbox_unavailable", rt, { notes: _e.notes.lines() }),
            ranNothing: !0,
          };
        if (
          S.envelope.outcome === "completed" &&
          isRanOutcome(S.envelope.disposition) &&
          M?.capturePoint !== void 0 &&
          !Z.signal.aborted &&
          Ke
        ) {
          on = !0;
          try {
            let Te = await M.capturePoint().catch(() => ({ kind: "not_running" }));
            if (Te !== void 0)
              ((S = { ...S, dirSync: deviceFrame(Te, es, ts()) }),
                logRemoteTools(L, "capture answer attached", { answer: Te.kind }));
          } catch (error) {
            logForDebugging(
              `[remote-tools] the capture answer was not attached to the result: ${errorMessage(error)}`,
              { level: "warn" },
            );
          }
        }
        return ((facts.pipelineMs = Date.now() - We), S);
      } catch (error) {
        if (Z.signal.aborted || isAbortError(error)) {
          let { ranNothing: ranNothing, ...ie } = callNotRunEnvelope(_e);
          S = ranNothing === !0 && (P || We === void 0) ? { ...ie, ranNothing: ranNothing } : ie;
        } else S = callFailureEnvelope(error, q, facts, Z.signal, { notes: _e.notes.lines() });
        return S;
      } finally {
        if ((ke?.giveUp(), st === void 0)) nt();
        let G = on ? void 0 : M?.capturePoint?.bind(M);
        ((facts.captureAtPipelineEnd = G !== void 0 && isPermissionGranted(_e)),
          withResolvers.promise
            .then(() => (facts.captureAtPipelineEnd === !0 && !clock.shuttingDown() ? G?.() : void 0))
            .catch(() =>
              logForDebugging("[remote-tools] the capture at the pipeline's end failed", { level: "warn" }),
            )
            .then(
              () => withResolvers_2.resolve(),
              () => withResolvers_2.resolve(),
            ),
          (Tt = !Ke),
          noteLateHoldRelease(facts, Ie !== null && !He, {
            wasAnsweredAheadOfItsKills: () => Tt,
            holdMayGo: withResolvers_2.promise,
          }),
          withResolvers_2.promise.then(tt),
          withdrawAskedCall(forCaller, Ee, {
            reason: "host_stopped",
            message: withdrawnRequestMessage({ targetName: deps.targetName, reason: "host_stopped" }),
          }));
        let re = L === void 0 ? void 0 : forCaller.calls.lookup(L);
        if (
          !(
            re?.result !== void 0 ||
            (re?.summary.state === "failed" &&
              re.summary.code !== void 0 &&
              (cer.has(re.summary.code) || re.summary.ranNothing === !0))
          ) &&
          S !== void 0
        )
          K(L, S);
        clock.dispose();
      }
    })(),
    winner = await Promise.race([
      sn.then((S) => ({ suspended: !1, served: S })),
      promise.then((S) => ({ suspended: !0, ask: S })),
    ]);
  if (!winner.suspended) return winner.served;
  if (We !== void 0) facts.pipelineMs = Date.now() - We;
  ((rn = !0), tt(), clock.detachLeg());
  let an = !1,
    it = !1;
  if (forCaller.pendingAsks.size >= wgt) {
    let filtered = forCaller.pendingAsks.list().filter((ie) => ie.redeemingLegs === 0),
      max_ask_ms = deps.policy.limits.max_ask_ms,
      re =
        max_ask_ms === void 0
          ? filtered[0]
          : filtered.find((ie) => Date.now() - ie.createdAt > max_ask_ms + ut);
    if (re === void 0) ((an = !0), (it = filtered.length > 0));
    else
      withdrawAskedCall(forCaller, re.askId, {
        reason: "evicted",
        message: withdrawnRequestMessage({ targetName: deps.targetName, reason: "evicted" }),
      });
  }
  if (winner.ask.heldHook && GBr(winner.ask.message, facts.stoppedWorkingHookKeys) === void 0)
    deps.onNotice?.(SERVED_HOOK_NOTICES, winner.ask.message.endsWith(jBr) ? Bqs : BBr);
  if (
    (facts.sessionMode === "auto" || facts.sessionMode === "bypassPermissions") &&
    deps.policy.stance.unattended === "own_record" &&
    isServedNutEnabled()
  ) {
    let S = autoOffNotice(deps.targetName);
    if (S !== void 0) deps.onNotice?.(S.key, S.text);
  }
  let At = L === void 0 ? void 0 : forCaller.calls.newestRetryJoinedTo(L),
    Pe = L !== void 0 && At !== void 0 && forCaller.calls.carryQuestion(L, At, Ee) ? At : void 0;
  if (L !== void 0 && Pe !== void 0) {
    if (
      (logRemoteTools(L, "ask carried by retry", {
        carrier_call: Pe,
        ask_id: Ee,
        worker_epoch: ctx.workerEpoch,
      }),
      facts.arrivedOver !== "relay")
    )
      logFeatureSad("remote_tool_serve", "ask_carried_by_retry");
    facts.askCarriedBy = Pe;
  }
  let dn = Pe ?? L,
    un = N6(tool.name, uNt(winner.ask.input, O)),
    mn = needsApprovalEnvelope({
      target: q,
      facts: facts,
      askId: Ee,
      toolName: tool.name,
      ask: { ...winner.ask, input: unrenameOutputFields(winner.ask.input, wireArguments) },
      notes: _e.notes.lines(),
      inputFingerprint: un,
      hostRules: !stance.honorLocalRules ? "none" : w.where === "here" ? "full" : "denies",
    }),
    Wo = Pe !== void 0 && L !== void 0 ? { callId: Pe, pipelineCallId: L } : { callId: L };
  if (
    (forCaller.pendingAsks.register({
      askId: Ee,
      ...Wo,
      toolName: tool.name,
      raisedOver: facts.arrivedOver,
      toolStillServed: () => findServedTool(deps, tool.name) !== void 0,
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
        onApproved: ({ attested: attested }) => {
          let G = jqs(winner.ask.message, facts.changedHookKeys);
          if (G !== void 0) deps.reach.projectHooks?.shownChanged.add(G);
          let re = attested
            ? WBr(winner.ask.message, facts.changedHookKeys, deps.reach.projectHooks?.updatedAsks)
            : void 0;
          if (re !== void 0)
            (deps.reach.projectHooks?.shownChanged.add(re),
              deps.reach.projectHooks?.acceptedUpdated.add(re),
              deps.onNotice?.(SERVED_HOOK_UPDATED_ACCEPTED, zqs));
          let ie = attested ? GBr(winner.ask.message, facts.stoppedWorkingHookKeys) : void 0;
          if (ie !== void 0)
            (deps.reach.projectHooks?.setAside.add(ie), deps.onNotice?.(SERVED_HOOK_SET_ASIDE, Vqs));
        },
        onDeclined: () => {
          let S = GBr(winner.ask.message, facts.stoppedWorkingHookKeys);
          if (S !== void 0) deps.reach.projectHooks?.declinedSetAside.add(S);
          let G = WBr(winner.ask.message, facts.changedHookKeys, deps.reach.projectHooks?.updatedAsks);
          if (G !== void 0)
            (deps.reach.projectHooks?.declinedChangedSinceLast.add(G),
              deps.reach.projectHooks?.acceptedUpdated.delete(G),
              deps.reach.projectHooks?.shownChanged.delete(G));
        },
      }),
      settled: sn,
      isPipelineOver: () => Ke || wt,
      wasAnsweredAheadOfItsKills: () => Tt,
      holdMayGo: withResolvers_2.promise,
      takesCaptureAtPipelineEnd: () => facts.captureAtPipelineEnd === !0,
      resume: clock.resume,
      windDown: clock.windDown,
    }),
    Pe === void 0)
  )
    V(L, { state: "asked", askId: Ee });
  if (an) {
    let S = it
      ? tooManyPendingApprovalsMessage({ targetName: deps.targetName, limit: wgt })
      : withdrawnRequestMessage({ targetName: deps.targetName, reason: "evicted" });
    ((facts.askSeatsFull = it),
      withdrawAskedCall(forCaller, Ee, { reason: "evicted", message: S, countedByItsLeg: it }));
    let G = dn === void 0 ? void 0 : forCaller.calls.lookup(dn)?.result;
    return G !== void 0 && L !== void 0
      ? rebindEnvelopeCallId(G, L)
      : (G ?? refusedEnvelope(q, facts, "withdrawn", S, { reason: "evicted", notes: _e.notes.lines() }));
  }
  let projectHooks = deps.reach.projectHooks,
    at = winner.ask.heldHook
      ? WBr(winner.ask.message, facts.changedHookKeys, projectHooks?.updatedAsks)
      : void 0,
    Et = at === void 0 ? void 0 : projectHooks?.updatedAsks.get(at);
  if (at !== void 0 && Et !== void 0) {
    if (((Et.puts += 1), Et.puts >= SERVED_HOOK_UPDATE_NOTICES))
      projectHooks?.declinedChangedSinceLast.add(at);
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
  return e.servedMcpWireArguments?.(n) ?? Lrn();
}
//@ chunk-ad2e1aj6.js:62711-63290 placement
function executionPlacement(e) {
  let n = vmUnavailableMessage({ targetName: e.targetName });
  if (parseExecutionMode(e.execution).mode !== "in_process")
    return typeof e.executor === "function"
      ? { where: "handed_on", executor: e.executor }
      : { where: "refused", message: n };
  let s = !0;
  if (typeof e.sandboxRequiredNow === "function")
    try {
      s = e.sandboxRequiredNow();
    } catch (error) {
      logError(toError(error));
    }
  if (s === !1) return { where: "here", executor: typeof e.executor === "function" ? e.executor : wo };
  if ((typeof s === "object" || typeof s === "function") && s !== null && "then" in s)
    Promise.resolve(s).catch((h) => logError(toError(h)));
  return {
    where: "refused",
    message: s === "could_not_be_read" ? settingsUnreadableMessage({ targetName: e.targetName }) : n,
  };
}
//@ chunk-ad2e1aj6.js:63290-63437 placement
function executionPlacementRefusal(e) {
  let n = executionPlacement(e);
  switch (n.where) {
    case "here":
      return;
    case "refused":
      return n.message;
    case "handed_on":
      return vmUnavailableMessage({ targetName: e.targetName });
  }
}
//@ chunk-ad2e1aj6.js:63437-63547 placement
function isServedReadOnly(e, n, s) {
  if (parseExecutionMode(s.execution).mode !== "in_process") return !1;
  try {
    return e.isReadOnly(n);
  } catch {
    return !1;
  }
}
//@ chunk-ad2e1aj6.js:63547-63698 placement
function callFailureEnvelope(e, n, s, h, r) {
  if (h.aborted || isAbortError(e)) return failedEnvelope(n, s, "cancelled", "The call was cancelled.", r);
  return (logError(toError(e)), failedEnvelope(n, s, "internal_error", callFailedText(n.name), r));
}
//@ chunk-ad2e1aj6.js:63698-63743 placement
function Eo(e) {
  return e.severity !== "warning";
}
//@ chunk-ad2e1aj6.js:63743-63812 placement
function rs(e) {
  try {
    return (getFsImplementation().lstatSync(e), !1);
  } catch (error) {
    return isENOENT(error);
  }
}
//@ chunk-ad2e1aj6.js:63812-63907 placement
function ss(e) {
  let {
    resolvedPath: resolvedPath,
    isSymlink: isSymlink,
    isCanonical: isCanonical,
  } = safeResolvePath(getFsImplementation(), e);
  return isSymlink && (!isCanonical || isSpecialPath(resolvedPath));
}
//@ chunk-ad2e1aj6.js:63907-64167 placement
function userSettingsErrorWatcher() {
  let e = new Map();
  return () => {
    try {
      if (!isSettingSourceEnabled("userSettings")) return;
      if (getSettingsParseErrorsForSource("userSettings").some(Eo)) return "held";
      let n = getSettingsFilePathForSource("userSettings");
      if (n === void 0 || rs(n)) return;
      return parseSettingsFileIfChanged(n, e).errors.some(Eo) && !ss(n) ? "disk" : void 0;
    } catch (error) {
      return (logError(toError(error)), "unknown");
    }
  };
}
//@ chunk-ad2e1aj6.js:64167-65171 placement
function backgroundCommandStatusText(e, n, s) {
  let { started: started, startedAt: startedAt, ended: ended } = s.command,
    { outputTail: outputTail } = s,
    now = Date.now(),
    max = Math.max(0, (ended?.at ?? now) - startedAt),
    w = ended && Math.max(0, now - ended.at),
    C = (j) => formatDuration(j, { hideTrailingZeros: !0 }),
    P = `on ${e.name}`,
    x =
      ended === void 0 || w === void 0
        ? `${P} is running: started ${C(max)} ago, writing its output there to ${started.outputPath}, and stopped after ${C(started.limitMs)} in the background or earlier if ${e.name} stops serving this session.`
        : `${ended.how === "exited" ? `${P} is over: it exited with code ${ended.exitCode}` : `was stopped ${backgroundStopReasonText(ended.how, e.name)}`} ${C(w)} ago, after ${C(max)}.`,
    Y =
      outputTail === void 0
        ? " Its output could not be read."
        : outputTail.trim() === ""
          ? " It has written no output."
          : `
Its output ends:
${outputTail}`,
    D = [{ type: "text", text: `Background command ${started.shellId} ${x}${Y}` }],
    L = { state: ended?.how ?? "running", exit_code: ended?.exitCode, ran_ms: max, ended_ms_ago: w };
  return {
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "completed",
      call_id: n,
      target: e,
      is_error: !1,
      content: D,
      output: { ...(ended === void 0 && { backgroundTaskId: started.shellId }), background: L },
      disposition: "ran",
      replayed: !0,
      served_at: startedAt,
    },
    content: D,
  };
}
/**
 * 记录远程工具调用的 tengu_remote_tool_serve 遥测（结果、耗时、权限路径、分类器判定等）。
 */
//@ chunk-ad2e1aj6.js:65171-71408 placement
function logServedCallTelemetry(e, n, s, h) {
  let r =
      e.outcome === "completed"
        ? e.is_error
          ? "completed_error"
          : "completed"
        : e.outcome === "failed" && (e.code === "cancelled" || e.code === "timed_out")
          ? e.code
          : e.outcome,
    i = n.secondLeg ? n.askedInMode : n.sessionMode,
    y = effectiveServedMode({ stance: s.policy.stance, sessionMode: i, call: n.trust }),
    O =
      n.query || n.answeredFromRecord !== void 0 || n.callId === void 0 ? void 0 : h?.calls.lookup(n.callId);
  if (
    s.callLog !== void 0 &&
    h !== void 0 &&
    O !== void 0 &&
    O.priorEpoch === void 0 &&
    n.callId !== void 0
  ) {
    let w = (P, x) => ({
      t: "leg",
      caller: h.callerSessionId,
      call_id: P,
      tool: n.resolvedToolName ?? "unresolved",
      is_mcp: n.isMcp,
      input_fp: n.inputFingerprint,
      transport: n.arrivedOver,
      second_leg: n.secondLeg,
      session_mode: n.sessionMode ?? "absent",
      evaluated_mode: y.mode,
      ...(n.secondLeg && { approval_basis: n.approvalBasis ?? "none" }),
      ...(n.allowBasis !== void 0 && { allow_basis: n.allowBasis }),
      ...(n.denySource !== void 0 && { deny_source: n.denySource }),
      ...(n.rulesCheckCrashed === !0 && { rules_check_crashed: !0 }),
      ...(n.crashClass !== void 0 && { crash_class: n.crashClass }),
      ...(n.projectHook !== void 0 && { hook: n.projectHook }),
      outcome: e.outcome,
      ...(e.outcome === "completed" && e.disposition !== void 0 && { disposition: e.disposition }),
      ...((e.outcome === "refused" || e.outcome === "failed") && { code: e.code }),
      ...(e.outcome === "refused" && e.reason !== void 0 && { reason: e.reason }),
      ...(e.outcome === "completed" && { is_error: e.is_error }),
      duration_ms: Date.now() - n.startedAt,
      record: {
        state: x.state,
        ...(x.code !== void 0 && { code: x.code }),
        ...(x.endedAs !== void 0 && { ended_as: x.endedAs }),
        ...(x.ranNothing === !0 && { ran_nothing: !0 }),
        ...(x.isError !== void 0 && { is_error: x.isError }),
        ...(x.askId !== void 0 && { ask_id: x.askId }),
        ...(x.joinedCallId !== void 0 && { joined_call_id: x.joinedCallId }),
      },
    });
    s.callLog.note(w(n.callId, O.summary));
    let C = n.askCarriedBy === void 0 ? void 0 : h.calls.lookup(n.askCarriedBy);
    if (n.askCarriedBy !== void 0 && C !== void 0 && C.priorEpoch === void 0)
      s.callLog.note(w(n.askCarriedBy, C.summary));
  }
  let R =
    n.query && n.callId !== void 0
      ? h?.calls.countOutcomeQuery(
          n.callId,
          `${r}:${e.outcome === "in_progress" ? `${e.state}${e.output_tail === void 0 ? "" : "+output"}` : e.outcome === "refused" || e.outcome === "failed" ? e.code : ""}`,
        )
      : void 0;
  if (R?.report === !1) return;
  if (
    (logEvent("tengu_remote_tool_serve", {
      call_id: ye(n.callId),
      host_epoch: ye(s.sessions.epoch),
      handle_hash: gn(s.targetName),
      host_device_id: ye(s.deviceId),
      criteria_version: lit(DYt),
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
      ...(n.joinedCallId !== void 0 && { joined_call_id: ye(n.joinedCallId) }),
      ...(n.askCarriedBy !== void 0 && { ask_carried_by: ye(n.askCarriedBy) }),
      ...(n.workerEpoch !== void 0 && { worker_epoch: n.workerEpoch }),
      ...(e.outcome === "refused" && { refusal_code: fromEnum(e.code) }),
      ...(n.pathOverLimit === !0 && { path_over_limit: !0 }),
      ...(n.staleLeg !== void 0 && {
        age_ms: n.staleLeg.ageMs === void 0 ? void 0 : Math.round(n.staleLeg.ageMs),
        window_ms: n.staleLeg.windowMs,
      }),
      ...(n.attestation !== void 0 && {
        attestation_mode: fromEnum(n.attestation.mode),
        request_attestation: fromEnum(n.attestation.status),
        attestation_verdict: fromEnum(n.attestation.verdict),
      }),
      ...(n.untrustedRepositories !== void 0 && {
        untrusted_repositories: fromEnum(n.untrustedRepositories),
      }),
      mode_stamp: fromEnum(n.modeStamp ?? "absent"),
      server_verdict: fromEnum(serverVerdictKind(n.serverVerdict)),
      ...(e.outcome === "refused" &&
        n.seatsFull && { sessions_in_use: s.sessions.size, sessions_limit: s.sessions.limit }),
      ...(e.outcome === "failed" && { failure_code: fromEnum(e.code) }),
      ...(e.outcome === "completed" && e.disposition !== void 0 && { disposition: fromEnum(e.disposition) }),
      force_ask: n.forceAsk,
      ask_class: e.outcome === "needs_approval" ? fromEnumOpt(n.askClass) : lit("none"),
      ...(e.outcome === "needs_approval" &&
        n.mcpPathWhy !== void 0 && { mcp_path_why: fromEnum(n.mcpPathWhy) }),
      through_second_root_mount: n.throughSecondRootMount,
      allow_basis: fromEnumOpt(n.allowBasis),
      deny_source: fromEnumOpt(n.denySource),
      host_credential_refusal: fromEnumOpt(n.hostCredentialRefusal),
      under_windows_profile_glob: n.underWindowsProfileGlob,
      rules_check_crashed: n.rulesCheckCrashed === !0,
      input_parse_threw: n.inputParseThrew === !0,
      crash_class: n.crashClass,
      denied_under_forced_ask: n.deniedUnderForcedAsk === !0,
      owner_settings_lost: fromEnumOpt(n.ownerSettingsLost),
      second_leg: n.secondLeg,
      approval_decision: fromEnum(n.envelope?.approval?.decision ?? "none"),
      ...(n.secondLeg && { approval_basis: fromEnum(n.approvalBasis ?? "none") }),
      ask_ended_by_throw: n.askEndedByThrow,
      evaluated_mode: fromEnum(y.mode),
      mode_capped: y.capped,
      auto_refused_here: y.autoRefusedHere,
      consent_pending:
        s.policy.stance.unattended === "own_record" ? unattendedServingConsentPending() : void 0,
      unattended_by_host_flag:
        s.policy.stance.unattended === "own_record" ? unattendedServingAllowedByHostFlag() : void 0,
      auto_refused_why:
        s.policy.stance.unattended === "own_record"
          ? fromEnum(y.autoRefusedHere ? autoModeRefusedForServedCallsWhy() : "none")
          : void 0,
      plan_classifier_backed: isPlanFloor(i, s.policy.stance.unattended),
      destination_downgraded: n.destinationDowngraded,
      session_mode: fromEnum(n.sessionMode ?? "absent"),
      envelope: fromEnum(n.envelopeStatus),
      read_baseline_carried: n.envelope?.read_baseline !== void 0,
      truncated: n.truncated,
      ...(e.outcome === "completed" && { documents: e.documents?.length ?? 0 }),
      ...(e.outcome === "in_progress" &&
        e.output_tail !== void 0 && { output_tail_bytes: Buffer.byteLength(e.output_tail.text) }),
      duration_ms: Date.now() - n.startedAt,
      posture_wait_ms: n.postureWaitMs,
      hold_ms: n.holdMs,
      hold_stands_at_answer: n.holdStandsAtAnswer === !0,
      pipeline_ms: n.pipelineMs,
      capture_at_pipeline_end: n.captureAtPipelineEnd === !0,
      stopped_before_hold: n.stoppedBeforeHold,
      output_bytes: Buffer.byteLength(
        jsonStringify(
          e.outcome === "completed"
            ? e.content
            : e.outcome === "refused" || e.outcome === "failed"
              ? e.message
              : "",
        ),
        "utf8",
      ),
    }),
    n.query || n.answeredFromRecord !== void 0)
  )
    return;
  if (n.arrivedOver === "relay") return;
  if (e.outcome === "completed" && !e.is_error) logFeatureOk("remote_tool_serve");
  else if (e.outcome === "completed") logFeatureSad("remote_tool_serve", e.disposition ?? "completed_error");
  else if (e.outcome === "acknowledged" && n.deniedBySession)
    logFeatureSad("remote_tool_serve", "denied_by_session");
  else if (
    e.outcome === "needs_approval" ||
    e.outcome === "acknowledged" ||
    e.outcome === "in_progress" ||
    n.askStillPending
  );
  else if (e.code === "cancelled") logFeatureSad("remote_tool_serve", "cancelled");
  else if (n.staleLeg !== void 0)
    logFeatureSad(
      "remote_tool_serve",
      n.staleLeg.judgedBy === "ask_age"
        ? "undated_answer"
        : n.staleLeg.judgedBy === "dated_ask_age"
          ? "aged_answer"
          : n.staleLeg.ageMs === void 0
            ? "undatable_leg"
            : "stale_leg",
      { answer_leg: n.secondLeg },
    );
  else if (n.askSeatsFull) logFeatureSad("remote_tool_serve", "ask_seats_full");
  else logFeatureBad("remote_tool_serve", e.code);
}
//@ chunk-ad2e1aj6.js:71408-71526 placement
function servedShellKind(e) {
  let resolvedToolName = e.resolvedToolName;
  if (e.isMcp === !0 || resolvedToolName === void 0 || !xTe(resolvedToolName)) return;
  return resolvedToolName === POWERSHELL_TOOL_NAME ? "powershell" : "bash";
}
//@ chunk-ad2e1aj6.js:71526-71537 placement
var MAX_TELEMETRY_STRING = 128;
/**
 * （切分错误，权限 UI）可提供常驻更新时把它们并入会话权限更新。
 */
//@ chunk-5ghnps9r.js:1209-1360 placement
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
