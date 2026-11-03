/**
 * services/remoteTools/remoteToolExecutor.ts
 *
 * 2.1.316 新增：远程工具的执行器：本地 canUseTool 与远端判定的协作、自动模式分类器、进程重启后接管
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dtv8x2hx.js (36)
 * attribution: placement 36
 */
import { isDeepStrictEqual } from "util";
import {
  PromptScopedAbortController,
  turnAbortControllerOf,
  shutdownInterruptStamp,
  unwrapAbortReason,
} from "../../utils/abortController.js";
import {
  withdrawnAskDecision,
  buildHostAllowRules,
  getToolNameForPermissionCheck,
  REMOTE_TOOL_HOST,
  handleRemoteBackgroundCommand,
  Ar,
  br,
  RemoteToolCallEnded,
} from "./remoteToolRouting.js";
import { $r, YJr, vgi, HT } from "../../bridge/deviceRegistration.js";
import { truncateAtSentence, RemoteAskMemory, EarlyCheckRunner } from "./remoteToolPermissions.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import {
  DONT_ASK_REJECT_MESSAGE,
  buildYoloRejectionMessage,
  buildClassifierRefusedOrTransientGuidance,
  buildClassifierUnavailableMessage,
  REJECT_MESSAGE_WITH_REASON_PREFIX,
  SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX,
  CANCEL_MESSAGE,
  createUserMessage,
  createProgressMessage,
  createCancelledToolResultBlock,
  withMemoryCorrectionHint,
  TOOL_CALL_ENDED_FOR_DELIVERY,
  INTERRUPT_MESSAGE_FOR_TOOL_USE,
} from "../../utils/messages.js";
import { ServedCallRegistry, eKe } from "../../utils/remoteTools/restartNotices.js";
import { parkOnUser, startSessionActivity, endActivity } from "../../utils/sessionActivity.js";
import { executePermissionRequestHooksForSDK } from "../../cli/structuredIO.js";
import { logForDebugging, createAttachmentMessage_2 as createAttachmentMessage } from "../../utils/debug.js";
import { errorMessage, AbortError } from "../../utils/errors.js";
import {
  permissionPromptToolResultToPermissionDecision,
  permissionPromptResultSchemaRefusing,
} from "../../utils/permissions/PermissionPromptToolResultSchema.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { isSameDecision, isCanUseToolFailureReason } from "../../utils/permissions/decisionIdentity.js";
import { isPlanClassifierArmOn } from "./servingGates.js";
import { isAutoClassifierActive } from "../../utils/permissions/autoModeState.js";
import { displayWorkingDir, failedInTransitMessage, approvalSourcePhrase } from "./transportMessages.js";
import { Nrn } from "./lease.js";
import { CommitTurnSlot, Fbt, o3n } from "../../utils/permissions/serverClassifier/context.js";
import {
  isCountedClassifierBlock,
  iwt,
  isChainOnAllowActive,
  recordAutoModeSuccess,
  enforceAutoModeDenialLimits,
  recordAutoModeDenial,
  isAutoModeConsentFlowEnabled,
  autoModeBlockedHelp,
} from "../../utils/permissions/permissions.js";
import { isAutoModeCapableHost } from "./callProgress.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum, fromEnumOpt, lit } from "../analytics/safeMetadata.js";
import { ye } from "../../utils/startupMarks.js";
import { logError } from "../../utils/log.js";
import { fallbackUsageDelta } from "../api/withRetry.js";
import { calculateCostFromTokenCounts } from "../../utils/modelCost.js";
import { cNt, unsupportedFieldRefusal, uNt } from "./pathMapping.js";
import { isModelDrivenSession } from "../../utils/teammate.js";
import {
  prependInheritedVerifiedTurns,
  formatActionForClassifier,
  classifyYoloAction,
} from "../../utils/permissions/yoloClassifier.js";
import { toolMatchesName, getToolRemoteExecution } from "../../Tool.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { pinSessionId } from "../../utils/sessionStorage.js";
import { getSessionId } from "../../bootstrap/state.js";
import { logRemoteForward, primaryInputPath } from "./remoteToolCall.js";
import { RemoteCallLedger } from "./callOutcome.js";
import {
  toolUseErrorResult,
  It,
  formatCompletedOnHost,
  formatTruncatedResult,
  Ke,
  buildRemoteToolResultBlock,
  remoteStructuredOutput,
  Tn,
  remoteResultText,
  Sn,
} from "./remoteToolResult.js";
import { Stream } from "../../utils/stream.js";
import { emitToolHeartbeat, getCancelMessage } from "../tools/toolExecution.js";
import { SERVED_OUTCOME_TABLE, isRanOutcome } from "../../remote/tools/protocolConstants.js";
import { processToolResultBlock, getOriginalCwd } from "../../utils/toolResultStorage.js";
import { contentToText, sanitizeForPrompt } from "./resultConversion.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { LKt } from "./backgroundCommands.js";
import { SANDBOX_OVERRIDE_INPUT_KEYS } from "../../utils/sandbox/sandboxDefaultPolicy.js";

/**
 * 生成远程调用的审批函数：结合本地 canUseTool、宿主允许规则与推测执行（约 4.6 KB）。
 */
//@ chunk-dtv8x2hx.js:81407-86035 placement
function createRemoteApprover({
  tool: tool,
  host: host,
  toolUseContext: toolUseContext,
  canUseTool: canUseTool,
  parentMessage: parentMessage,
  toolUseId: toolUseId,
  honourHostAllowRules: honourHostAllowRules,
  speculation: speculation,
}) {
  return async (h) => {
    let w = new PromptScopedAbortController(toolUseContext.abortController);
    if (
      (w.signal.addEventListener(
        "abort",
        () => {
          if (!h.ended.aborted && !toolUseContext.abortController.signal.aborted)
            toolUseContext.abortController.abort(w.signal.reason);
        },
        { once: !0 },
      ),
      h.ended.aborted)
    )
      return withdrawnAskDecision(h);
    (h.ended.addEventListener("abort", () => w.abort(h.ended.reason), { once: !0 }), h.patience?.hold());
    let k = await classifyRemoteCall({
      tool: tool,
      host: host,
      request: h,
      toolUseContext: toolUseContext,
      toolUseId: toolUseId,
      messageId: parentMessage.message.id,
      honourHostAllowRules: honourHostAllowRules,
      speculation: speculation,
    });
    if (k.kind === "allow") return { decision: "allow", decidedBy: "classifier" };
    if (k.kind === "block")
      return {
        decision: "deny",
        feedback: "blocked by the session's auto-mode classifier",
        insteadOfRejection: { message: k.message, denialKind: k.denialKind },
      };
    let S = `runs on ${h.host.name}`,
      A = tool.isMcp === !0 ? { ...h.input } : { ...h.input, [$r]: h.host.name },
      R = `(${S}) ${truncateAtSentence(h.message)}`,
      T = buildHostAllowRules(tool, h),
      O = {
        behavior: "ask",
        message: R,
        decisionReason: { type: "other", reason: R },
        ...(T === void 0 ? { suppressAlwaysAllowRule: !0 } : { suggestions: [T] }),
        forcedByCaller: !0,
        askPatience: h.patience,
        askEnded: h.askEnded,
        ...(h.pendingBeforeRestart === !0 && { pendingBeforeRestart: !0 }),
      },
      x = getToolPermissionContext(toolUseContext);
    if (x.mode === "dontAsk" || x.shouldAvoidPermissionPrompts)
      return {
        decision: "deny",
        insteadOfRejection: {
          message:
            x.mode === "dontAsk"
              ? DONT_ASK_REJECT_MESSAGE(tool.name)
              : `${h.host.name} asked for approval, and this context cannot show a permission prompt; the call did not run.`,
          denialKind: "permission-rule",
        },
      };
    let M = tool.isMcp === !0 ? { ...tool, suppressesAllPermissionUpdates: () => !0 } : tool,
      E =
        h.pendingBeforeRestart === !0 && !h.ended.aborted
          ? await toolUseContext.toolState.get(ServedCallRegistry).takeInheritedAnswer(toolUseId)?.({
              input: A,
              planMode: () => getToolPermissionContext(toolUseContext).mode === "plan",
            })
          : void 0;
    if (h.ended.aborted) return withdrawnAskDecision(h);
    h.patience?.resume();
    let D = T === void 0 ? "withheld" : T.destination === "session" ? "offered_prefix" : "offered_exact";
    h.noteCard({ standingRow: D, chosen: !1 });
    let X = E === void 0 && getToolPermissionContext(toolUseContext).mode === "plan",
      L = parkOnUser(),
      y;
    try {
      if (E === void 0)
        y = await canUseTool(M, A, { ...toolUseContext, abortController: w }, parentMessage, toolUseId, O);
      else {
        let F;
        try {
          F =
            E.result.behavior === "deny"
              ? void 0
              : await executePermissionRequestHooksForSDK(
                  E.answers,
                  M,
                  toolUseId,
                  A,
                  { ...toolUseContext, abortController: w },
                  T === void 0 ? void 0 : [T],
                  { suppressAlwaysAllowRule: T === void 0 },
                  () => !0,
                );
        } catch (error) {
          if (h.ended.aborted) return withdrawnAskDecision(h);
          if (toolUseContext.abortController.signal.aborted) throw error;
          return (
            logForDebugging(
              `PermissionRequest hooks failed before an inherited answer was applied: ${errorMessage(error)}`,
              { level: "warn" },
            ),
            {
              decision: "deny",
              insteadOfRejection: {
                message: `A PermissionRequest hook failed before the approval given earlier could be applied; the ${tool.name} call did not run on ${h.host.name}.`,
                denialKind: "permission-rule",
              },
            }
          );
        }
        if (F !== void 0 && F.decision.behavior !== "allow") {
          if (F.interrupt) turnAbortControllerOf(toolUseContext.abortController).abort();
          y = F.decision;
        } else
          y = permissionPromptToolResultToPermissionDecision(
            E.answers,
            E.result,
            M,
            A,
            { ...toolUseContext, abortController: w },
            M,
            T === void 0,
            !1,
          );
      }
    } finally {
      L();
    }
    if (y.behavior === "allow") {
      let F =
        y.decisionReason?.type === "permissionPromptTool"
          ? permissionPromptResultSchemaRefusing().safeParse(y.decisionReason.toolResult).data
          : void 0;
      h.noteCard({
        standingRow: D,
        chosen:
          T !== void 0 &&
          F?.behavior === "allow" &&
          F.updatedPermissions?.some((ue) => ue.type === "addRules" && ue.behavior === "allow") === !0,
      });
      let Y = y.updatedInput ?? {};
      if (inputChangedByApproval(Y, h, tool))
        return {
          decision: "deny",
          feedback: `the approval edited the call in a way that cannot apply on ${h.host.name} \u2014 nothing ran`,
          insteadOfRejection: {
            message: `The approval given in this session edited the ${tool.name} call in a way ${h.host.name} cannot honour (it named a different machine, or newly set a privileged field this session does not pass on in an edit); nothing ran.`,
            denialKind: "permission-rule",
          },
        };
      let te = [$r, ...isRunInBackground(tool, host)],
        ee = Uo(Y, te),
        se = Object.keys(ee).length > 0 && !isDeepStrictEqual(ee, Uo(h.input, te));
      return {
        decision: "allow",
        decidedBy:
          y.decisionReason?.type === "hook"
            ? "hook"
            : y.decisionReason?.type === "permissionPromptTool"
              ? "host_prompt"
              : "prompt",
        raisedInPlanMode: X,
        ...(se && { updatedInput: ee }),
        ...(y.acceptFeedback !== void 0 && { feedback: y.acceptFeedback }),
      };
    }
    if (y.behavior === "deny" && y.decisionReason?.type === "hook")
      return { decision: "deny", insteadOfRejection: { message: y.message, denialKind: "permission-rule" } };
    if (isSameDecision(y, O))
      return {
        decision: "deny",
        insteadOfRejection: {
          message: `${h.host.name} asked before running this call and this session had no way to put the question to anyone; the call was not run. Ask the user how to proceed rather than retrying.`,
          denialKind: "permission-rule",
        },
      };
    let I = y.behavior === "ask" ? Mn(y.userFeedback) : usesPermissionPromptTool(y);
    if (
      y.behavior === "deny" &&
      y.decisionReason?.type === "other" &&
      isCanUseToolFailureReason(y.decisionReason.reason)
    )
      return { decision: "unanswerable", message: y.message };
    if (y.behavior === "deny" && I === void 0 && y.decisionReason?.type === "other")
      return { decision: "deny", insteadOfRejection: { message: y.message, denialKind: "permission-rule" } };
    return { decision: "deny", ...(I !== void 0 && { feedback: I }) };
  };
}
//@ chunk-dtv8x2hx.js:86035-86119 placement
function Vt(e) {
  if (e === "plan" && !isPlanClassifierArmOn()) return !1;
  return isAutoClassifierActive(e) || e === "bypassPermissions";
}
//@ chunk-dtv8x2hx.js:86119-86403 placement
function hostRulesContext(e, n) {
  let hostRules = e.hostRules;
  if (hostRules === void 0) return;
  let r = {
    host: e.host.name,
    allow: n ? (hostRules.allow ?? []) : [],
    softDeny: hostRules.soft_deny ?? [],
    hardDeny: hostRules.hard_deny ?? [],
    environment: n ? (hostRules.environment ?? []) : [],
  };
  return [r.allow, r.softDeny, r.hardDeny, r.environment].some((s) => s.length > 0)
    ? { hostRules: r }
    : void 0;
}
/**
 * 自动模式下用分类器判定远程调用（不适用时 no_verdict）。
 */
//@ chunk-dtv8x2hx.js:86403-90201 placement
async function classifyRemoteCall({
  tool: tool,
  host: host,
  request: request,
  toolUseContext: toolUseContext,
  toolUseId: toolUseId,
  messageId: messageId,
  honourHostAllowRules: honourHostAllowRules,
  speculation: speculation,
}) {
  let h = getToolPermissionContext(toolUseContext);
  if (!shouldClassifyRemotely(tool, host, toolUseContext, h.mode) || !request.classifierEligible)
    return (speculation?.abandon("not_eligible"), { kind: "no_verdict" });
  if (getToolNameForPermissionCheck(tool) && (YJr in request.input || $r in request.input))
    return (speculation?.abandon("not_eligible"), { kind: "no_verdict" });
  let w = {
      host: request.host,
      spelledDirectory: displayWorkingDir(Nrn(host).working_dir),
      input: request.input,
      message: request.message,
      decisionReason: request.decisionReason,
      hostRules: request.hostRules,
    },
    now = Date.now(),
    S = {
      host_rules_hard_deny: request.hostRules?.hard_deny?.length ?? 0,
      host_rules_soft_deny: request.hostRules?.soft_deny?.length ?? 0,
      host_rules_environment: request.hostRules?.environment?.length ?? 0,
      host_rules_allow: request.hostRules?.allow?.length ?? 0,
      host_rules_allow_honoured: honourHostAllowRules,
    },
    A,
    R = !1,
    T = speculationFields(speculation !== void 0, void 0, void 0);
  using O = new CommitTurnSlot();
  try {
    A = speculation?.claim();
    let x = A === void 0 ? void 0 : describeAskChange(A, w, tool, toolUseContext, h);
    if (((T = speculationFields(speculation !== void 0, A, x)), speculation !== void 0))
      toolUseContext.toolState.get(RemoteAskMemory).remember(request.host.name, tool.name, w);
    if (A !== void 0 && x !== void 0)
      (speculation?.discard(),
        A.run.leaveRecordToRerun(),
        Fbt(toolUseId),
        logSpeculationUsage({
          reason: x,
          early: A,
          stepReportsTheDrop: !0,
          toolUseContext: toolUseContext,
          toolUseId: toolUseId,
        }));
    R = A !== void 0 && x === void 0;
    let M =
      A !== void 0 && x === void 0
        ? A.run
        : formatRemoteAskReason({
            tool: tool,
            request: w,
            toolUseContext: toolUseContext,
            toolUseId: toolUseId,
            honourHostAllowRules: honourHostAllowRules,
            signal: toolUseContext.abortController.signal,
            commitTurn: O,
            startedAhead: !1,
            rerunOfStoppedCall: A !== void 0,
          });
    if (R) Hr(toolUseContext, w, honourHostAllowRules, O);
    let E = await M.result,
      queueStats = M.queueStats(),
      X,
      L = isCountedClassifierBlock(E) ? O.reached() : void 0;
    if (L !== void 0) {
      let now = Date.now();
      (await L, (X = Date.now() - now));
    }
    let y = getToolPermissionContext(toolUseContext),
      I = !Vt(y.mode) || y.mode !== h.mode || (y.mode === "plan" && !isAutoModeCapableHost(host)),
      F = iwt(tool.name, toolUseContext.getProactivityLevel()),
      Y =
        I || F || E.unavailable || E.transcriptTooLong || E.refusedBySafeguard || E.failureMode !== void 0
          ? "no_verdict"
          : E.shouldBlock
            ? "block"
            : isChainOnAllowActive()
              ? "no_verdict"
              : "allow",
      te = I
        ? "mode_left"
        : F
          ? "ask_level_raised"
          : E.transcriptTooLong
            ? "too_long"
            : E.refusedBySafeguard
              ? "refused"
              : E.unavailable
                ? "unavailable"
                : E.failureMode !== void 0
                  ? "unparseable"
                  : !E.shouldBlock && isChainOnAllowActive()
                    ? "chain_on_allow"
                    : "verdict";
    if (
      (logEvent("tengu_remote_tool_classifier", {
        decision: fromEnum(Y),
        cause: fromEnum(te),
        headless: y.shouldAvoidPermissionPrompts === !0,
        duration_ms: Date.now() - now,
        tool_use_id: ye(toolUseId),
        ...S,
        ...(queueStats?.overlap !== void 0 && {
          queue_depth: queueStats.queueDepth,
          queue_wait_ms: queueStats.queueWaitMs,
          queue_overlap_enabled: !0,
          queue_in_flight_at_start: queueStats.overlap.inFlightAtStart,
          queue_overlapped: queueStats.overlap.overlapped,
          queue_released_by_escalation: queueStats.overlap.releasedByEscalation,
          queue_commit_wait_ms: X,
        }),
        ...T,
        ...classifierUsageFields(E),
      }),
      toolUseContext.abortController.signal.aborted)
    )
      throw new AbortError();
    if (Y === "allow") return (O.runInTurn(() => recordAutoModeSuccess(toolUseContext)), { kind: "allow" });
    if (Y === "block") {
      if (
        enforceAutoModeDenialLimits(
          toolUseContext,
          recordAutoModeDenial(toolUseContext),
          tool,
          messageId,
          toolUseId,
        )
      )
        return { kind: "no_verdict" };
      return {
        kind: "block",
        message: buildYoloRejectionMessage(E.reason, {
          autoModeConsentFlow: isAutoModeConsentFlowEnabled(toolUseContext.agentId),
          blockedHelp: autoModeBlockedHelp(toolUseContext.agentId),
        }),
        denialKind: "automode-blocked",
      };
    }
    if (I || F) return { kind: "no_verdict" };
    let shouldAvoidPermissionPrompts = y.shouldAvoidPermissionPrompts;
    if (E.transcriptTooLong) {
      if (shouldAvoidPermissionPrompts)
        throw new AbortError(
          "Agent aborted: auto mode classifier transcript exceeded context window in headless mode",
        );
      return { kind: "no_verdict" };
    }
    if (E.refusedBySafeguard) {
      if (shouldAvoidPermissionPrompts)
        throw new AbortError(
          "Agent aborted: auto mode classifier request refused by the safety safeguard in headless mode",
        );
      return {
        kind: "block",
        message: buildClassifierRefusedOrTransientGuidance(E.reason, { refused: !0 }),
        denialKind: "automode-unavailable",
      };
    }
    if (E.unavailable)
      return {
        kind: "block",
        message: buildClassifierUnavailableMessage(
          tool.name,
          E.model,
          E.httpStatus,
          E.errorKind,
          E.retryAfterMs,
        ),
        denialKind: "automode-unavailable",
      };
    if (E.failureMode !== void 0) {
      if (
        enforceAutoModeDenialLimits(
          toolUseContext,
          recordAutoModeDenial(toolUseContext),
          tool,
          messageId,
          toolUseId,
        )
      )
        return { kind: "no_verdict" };
      return {
        kind: "block",
        message: buildClassifierRefusedOrTransientGuidance(E.reason, { refused: !1 }),
        denialKind: "automode-parsing-error",
      };
    }
    return { kind: "no_verdict" };
  } catch (error) {
    if (error instanceof AbortError || toolUseContext.abortController.signal.aborted) throw error;
    return (
      logError(error),
      logEvent("tengu_remote_tool_classifier", {
        decision: fromEnum("no_verdict"),
        cause: fromEnum("crashed"),
        headless: getToolPermissionContext(toolUseContext).shouldAvoidPermissionPrompts === !0,
        duration_ms: Date.now() - now,
        tool_use_id: ye(toolUseId),
        ...S,
        ...T,
      }),
      { kind: "no_verdict" }
    );
  } finally {
    if (A !== void 0 && !R) speculation?.discard();
  }
}
//@ chunk-dtv8x2hx.js:90201-90408 placement
function speculationFields(e, n, o) {
  if (!e) return {};
  return n === void 0
    ? { speculative: !1 }
    : {
        speculative: !0,
        speculative_used: o === void 0,
        speculative_discard_reason: fromEnumOpt(o),
        speculative_lead_ms: n.leadMs,
        speculative_ready_ms: n.readyMs,
      };
}
/**
 * 汇总分类器用量字段（各阶段 token、缓存、耗时、费用），用于遥测。
 */
//@ chunk-dtv8x2hx.js:90408-91083 placement
function classifierUsageFields(classification) {
  return {
    classifierInputTokens: classification.usage?.inputTokens,
    classifierOutputTokens: classification.usage?.outputTokens,
    classifierCacheReadInputTokens: classification.usage?.cacheReadInputTokens,
    classifierCacheCreationInputTokens: classification.usage?.cacheCreationInputTokens,
    classifierDurationMs: classification.durationMs,
    classifierCostUSD: fallbackUsageDelta(classification),
    classifierStage: fromEnumOpt(classification.stage),
    classifierStage1InputTokens: classification.stage1Usage?.inputTokens,
    classifierStage1OutputTokens: classification.stage1Usage?.outputTokens,
    classifierStage1CacheReadInputTokens: classification.stage1Usage?.cacheReadInputTokens,
    classifierStage1CacheCreationInputTokens: classification.stage1Usage?.cacheCreationInputTokens,
    classifierStage1CostUSD:
      classification.stage1Usage && classification.model
        ? calculateCostFromTokenCounts(classification.model, classification.stage1Usage)
        : void 0,
  };
}
//@ chunk-dtv8x2hx.js:91083-91477 placement
function logSpeculationUsage({
  reason: reason,
  early: early,
  stepReportsTheDrop: stepReportsTheDrop,
  toolUseContext: toolUseContext,
  toolUseId: toolUseId,
}) {
  let u = { reason: reason, early: early, toolUseContext: toolUseContext, toolUseId: toolUseId };
  if (!stepReportsTheDrop && early.settled) {
    early.run.result
      .then(
        (p) => logRemoteToolClassifier(u, "speculation_unused", classifierUsageFields(p)),
        () => logRemoteToolClassifier(u, "speculation_unused", {}),
      )
      .catch(() => {});
    return;
  }
  if (!stepReportsTheDrop) logRemoteToolClassifier(u, "speculation_unused", {});
  early.run.result
    .then((p) => {
      if (p.usage !== void 0) logRemoteToolClassifier(u, "speculation_usage", classifierUsageFields(p));
    })
    .catch(() => {});
}
//@ chunk-dtv8x2hx.js:91477-91889 placement
function logRemoteToolClassifier(
  { reason: reason, early: early, toolUseContext: toolUseContext, toolUseId: toolUseId },
  s,
  u,
) {
  logEvent("tengu_remote_tool_classifier", {
    decision: fromEnum("no_verdict"),
    cause: fromEnum(s),
    headless: getToolPermissionContext(toolUseContext).shouldAvoidPermissionPrompts === !0,
    duration_ms: early.leadMs,
    tool_use_id: ye(toolUseId),
    speculative: !0,
    speculative_used: !1,
    speculative_discard_reason: fromEnum(reason),
    speculative_settled: s === "speculation_usage" || early.settled,
    speculative_lead_ms: early.leadMs,
    speculative_ready_ms: early.readyMs,
    ...u,
  });
}
//@ chunk-dtv8x2hx.js:91889-92009 placement
function shouldClassifyRemotely(e, n, o, r) {
  return (
    Vt(r) &&
    (r !== "plan" || isAutoModeCapableHost(n)) &&
    (cNt.has(e.name) || getToolNameForPermissionCheck(e)) &&
    !iwt(e.name, o.getProactivityLevel())
  );
}
//@ chunk-dtv8x2hx.js:92009-92294 placement
function classifierTranscript(e, n) {
  let o = isModelDrivenSession(n.agentId),
    r = prependInheritedVerifiedTurns(n.messages, n.inheritedVerifiedHumanTurns, o);
  return {
    messages: [...r.messages, ...(n.sameTurnToolUses ?? [])],
    isSubagentLoop: o,
    inheritedPrefix: r.inheritedPrefix,
    registry: n.options.tools.some((tool) => toolMatchesName(tool, e.name))
      ? n.options.tools
      : [...n.options.tools, e],
  };
}
//@ chunk-dtv8x2hx.js:92294-92399 placement
function classifierCacheKey(e, n, o) {
  let r = hostRulesContext(e, n);
  return { ...(o !== void 0 && { commitTurn: o }), ...(r !== void 0 && { cachePrefix: jsonStringify(r) }) };
}
//@ chunk-dtv8x2hx.js:92399-92482 placement
function Hr(e, n, o, r) {
  o3n(e.agentId ?? "main", () => Promise.resolve(), void 0, classifierCacheKey(n, o, r));
}
//@ chunk-dtv8x2hx.js:92482-92495 placement
var Fr = 60000;
/**
 * 说明调用在另一台机器上运行及该机器 Claude Code 给出的 ask 原因。
 */
//@ chunk-dtv8x2hx.js:92495-93653 placement
function formatRemoteAskReason({
  tool: tool,
  request: request,
  toolUseContext: toolUseContext,
  toolUseId: toolUseId,
  honourHostAllowRules: honourHostAllowRules,
  signal: signal,
  commitTurn: commitTurn,
  startedAhead: startedAhead,
  rerunOfStoppedCall: rerunOfStoppedCall,
}) {
  let w = truncateToLength(
      `${request.message}${request.decisionReason === void 0 ? "" : ` [${request.decisionReason}]`}`,
      jr,
    ),
    k = `runs on ${request.host.name} (another machine, not this one) in ${request.spelledDirectory}; that machine's Claude Code gave this reason for asking (its words, unverified): "${w}"`,
    command = request.input.command,
    A = getToolNameForPermissionCheck(tool),
    R = formatActionForClassifier(
      tool.name,
      vgi(
        {
          ...request.input,
          [$r]: request.host.name,
          ...(A && { [YJr]: k }),
          ...(typeof command === "string" && {
            command: `# ${k}
${command}`,
          }),
        },
        k,
      ),
      toolUseId,
    ),
    {
      messages: messages,
      registry: registry,
      isSubagentLoop: isSubagentLoop,
      inheritedPrefix: inheritedPrefix,
    } = classifierTranscript(tool, toolUseContext),
    E = pinSessionId(getSessionId()),
    D,
    X,
    L = !1;
  return {
    messages: messages,
    registry: registry,
    enqueuedInMode: getToolPermissionContext(toolUseContext).mode,
    ranUnder: () => D,
    queueStats: () => X,
    leaveRecordToRerun: () => {
      L = !0;
    },
    result: o3n(
      toolUseContext.agentId ?? "main",
      (y) => {
        if (startedAhead && signal.aborted) throw new AbortError();
        if (rerunOfStoppedCall) Fbt(toolUseId);
        D = getToolPermissionContext(toolUseContext);
        let I = classifyYoloAction(messages, R, registry, D, signal, {
          localClassifierSite: "remoteDispatch",
          isSubagentLoop: isSubagentLoop,
          inheritedPrefix: inheritedPrefix,
          recordPresumed: toolUseContext.agentId === void 0,
          severityEligible: !0,
          storageV5: toolUseContext.storageV5,
          credentials: toolUseContext.credentials,
          agentId: toolUseContext.agentId,
          sessionId: E,
          queueProgress: y,
          ...hostRulesContext(request, honourHostAllowRules),
        });
        return startedAhead
          ? I.finally(() => {
              if (signal.aborted && !L) Fbt(toolUseId);
            })
          : I;
      },
      (y) => {
        X = y;
      },
      classifierCacheKey(request, honourHostAllowRules, commitTurn),
    ),
  };
}
/**
 * 为远程工具调用提前启动自动模式判定：记得该机器与工具上次的询问时，在真正调用前推测性地运行分类器；放弃时清理记忆并记推测使用情况。
 */
//@ chunk-dtv8x2hx.js:93653-94325 placement
function createEarlyCheckRunner({
  tool: tool,
  host: host,
  toolUseContext: toolUseContext,
  toolUseId: toolUseId,
  honourHostAllowRules: honourHostAllowRules,
}) {
  return new EarlyCheckRunner({
    turn: toolUseContext.abortController,
    start: (call, signal) => {
      let recall = toolUseContext.toolState.get(RemoteAskMemory).recall(call.host.name, tool.name),
        runsInBackground = isRunInBackground(tool, host);
      if (
        recall === void 0 ||
        !shouldClassifyRemotely(tool, host, toolUseContext, getToolPermissionContext(toolUseContext).mode) ||
        unsupportedFieldRefusal(call.input, runsInBackground, call.host.name) !== void 0
      )
        return;
      let predicted = {
        host: call.host,
        spelledDirectory: displayWorkingDir(Nrn(host).working_dir),
        input: uNt(call.input, runsInBackground),
        ...recall,
      };
      return {
        predicted: predicted,
        run: formatRemoteAskReason({
          tool: tool,
          request: predicted,
          toolUseContext: toolUseContext,
          toolUseId: toolUseId,
          honourHostAllowRules: honourHostAllowRules,
          signal: signal,
          startedAhead: !0,
          rerunOfStoppedCall: !1,
        }),
      };
    },
    onAbandoned: (reason, early) => {
      (Fbt(toolUseId),
        toolUseContext.toolState.get(RemoteAskMemory).forget(early.predicted.host.name, tool.name),
        logSpeculationUsage({
          reason: reason,
          early: early,
          stepReportsTheDrop: !1,
          toolUseContext: toolUseContext,
          toolUseId: toolUseId,
        }));
    },
  });
}
//@ chunk-dtv8x2hx.js:94325-94656 placement
function describeAskChange(e, n, o, r, s) {
  if (!isDeepStrictEqual(e.predicted.input, n.input)) return "input_changed";
  if (!isDeepStrictEqual(e.predicted, n)) return "ask_changed";
  let ranUnder = e.run.ranUnder(),
    p = classifierTranscript(o, r);
  if (
    e.run.enqueuedInMode !== s.mode ||
    (ranUnder !== void 0 && !isDeepStrictEqual(ranUnder, s)) ||
    !Wt(e.run.messages, p.messages) ||
    !Wt(e.run.registry, p.registry)
  )
    return "context_changed";
  return e.leadMs > Fr ? "stale" : void 0;
}
//@ chunk-dtv8x2hx.js:94656-94726 placement
function Wt(e, n) {
  return e.length === n.length && e.every((o, r) => o === n[r]);
}
//@ chunk-dtv8x2hx.js:94726-94737 placement
var jr = 300;
//@ chunk-dtv8x2hx.js:94737-94934 placement
function usesPermissionPromptTool(e) {
  let trimmed = e.message.trim();
  for (let o of [REJECT_MESSAGE_WITH_REASON_PREFIX, SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX])
    if (trimmed.startsWith(o.trim())) return Mn(trimmed.slice(o.trim().length));
  return e.decisionReason?.type === "permissionPromptTool" && trimmed !== Kr ? Mn(trimmed) : void 0;
}
//@ chunk-dtv8x2hx.js:94934-94992 placement
function Mn(e) {
  let n = e?.trim() ?? "";
  return n === "" ? void 0 : n;
}
//@ chunk-dtv8x2hx.js:94992-95024 placement
var Kr = "User denied permission";
/**
 * 远程工具执行生成器：错误路由、重启后接管未完成调用、产出结果消息。
 */
//@ chunk-dtv8x2hx.js:95024-97896 placement
async function* executeRemoteToolUse({
  tool: tool,
  toolUse: toolUse,
  route: route,
  assistantMessage: assistantMessage,
  toolUseContext: toolUseContext,
  canUseTool: canUseTool,
  now: now,
}) {
  if (route.kind === "error") {
    if (!toolUseContext.abortController.signal.aborted)
      logRemoteForward(tool, "executor", route.code, toolUse.id);
    let i = toolUseContext.toolState.get(ServedCallRegistry),
      adopted = i.adopted(toolUse.id);
    if (adopted !== void 0)
      (i.takeAdopted(toolUse.id),
        i.remove(toolUse.id),
        logEvent("tengu_remote_tool_restart_adoption_unroutable", {
          where: lit("route_error"),
          route_code: fromEnum(route.code),
          parked_at_restart: adopted.parkedAtRestart === !0,
        }));
    let w = adopted === void 0 ? route.message : eKe({ host: adopted.host }, adopted);
    if (adopted !== void 0 && !adopted.parkedAtRestart && !toolUseContext.abortController.signal.aborted)
      try {
        let input = toolUse.input;
        toolUseContext.toolState
          .get(RemoteCallLedger)
          .gaveUp({
            callId: toolUse.id,
            agentId: toolUseContext.agentId,
            hostName: adopted.host,
            toolName: tool.name,
            wireToolName: tool.mcpInfo?.toolName ?? tool.name,
            spelled: primaryInputPath(typeof input === "object" && input !== null ? input : {}),
            toldAs: "delivery_unknown",
            machineHadCall: !1,
            transport: void 0,
            dispatchEpoch: adopted.host_epoch,
            standing: !1,
            givenUpAt: Date.now(),
          });
      } catch (error) {
        logForDebugging(
          `[remote-tools] could not register an adopted call for a later correction: ${errorMessage(error)}`,
        );
      }
    yield {
      message: toolUseContext.abortController.signal.aborted
        ? toolResultForCancel({
            outcome: { kind: "error", code: "cancelled", message: CANCEL_MESSAGE },
            toolUseId: toolUse.id,
            assistantMessage: assistantMessage,
            signal: toolUseContext.abortController.signal,
            now: now,
          })
        : createUserMessage({
            content: [toolUseErrorResult(w, toolUse.id)],
            toolUseResult: `Error: ${w}`,
            sourceToolAssistantUUID: assistantMessage.uuid,
            now: now,
          }),
    };
    return;
  }
  (toolUseContext.markToolCallStarted?.(toolUse.id),
    yield { type: "set_in_progress_tool_use_ids", op: { action: "add", ids: [toolUse.id] } });
  try {
    let i = new Stream(),
      h = toolUseContext.agentId
        ? () => {}
        : emitToolHeartbeat({
            toolName: tool.name,
            toolUseID: toolUse.id,
            abortSignal: toolUseContext.abortController.signal,
            onProgress: (T) => {
              if (T.type === "progress")
                i.enqueue({
                  message: createProgressMessage({
                    toolUseID: T.toolUseID,
                    parentToolUseID: T.parentToolUseID ?? toolUse.id,
                    data: T.data,
                    now: now,
                  }),
                });
            },
          });
    startSessionActivity("tool_exec", REMOTE_TOOL_HOST);
    let w = handleRemoteBackgroundCommand(
      tool,
      route,
      "executor",
      toolUse.input,
      { ...toolUseContext, toolUseId: toolUse.id },
      canUseTool,
      assistantMessage,
      (T, O = Ar) =>
        i.enqueue({
          type: "notification",
          notification: {
            key: `remote-tool-status-${toolUse.id}`,
            text: T,
            priority: "medium",
            timeoutMs: O,
          },
        }),
      (T) =>
        i.enqueue({
          type: "notification",
          notification: {
            key: `remote-tool-notice-${toolUse.id}`,
            text: T,
            priority: "medium",
            timeoutMs: br,
          },
        }),
    ).finally(() => {
      (endActivity("tool_exec", REMOTE_TOOL_HOST), h(), i.done());
    });
    w.catch(() => {});
    for await (let T of i) yield T;
    let k = await w;
    yield {
      message: await buildRemoteToolResultMessage({
        tool: tool,
        origin: k.remoteOrigin,
        toolUseId: toolUse.id,
        assistantMessage: assistantMessage,
        toolUseContext: toolUseContext,
        now: now,
      }),
    };
    let disposition = k.remoteOrigin.disposition,
      A = It(tool, k.remoteOrigin),
      R = formatCompletedOnHost(tool, k.remoteOrigin);
    yield {
      message: createAttachmentMessage({
        type: "tool_host_result_lines",
        toolUseID: toolUse.id,
        host: HT(k.remoteOrigin.host.name),
        lines: [...(A ? [A] : []), ...(R ? [R] : []), ...formatTruncatedResult(tool, k.remoteOrigin)],
        label: Ke(tool, k.remoteOrigin),
        ...(k.remoteOrigin.envelope !== "present" && { unverified: !0 }),
        ...(k.remoteOrigin.host.working_dir && { workingDir: k.remoteOrigin.host.working_dir }),
        ...(disposition !== void 0 && { disposition: disposition }),
      }),
    };
  } catch (error) {
    if (!(error instanceof RemoteToolCallEnded)) throw error;
    if (Zt(error.outcome)) toolUseContext.onPermissionDenial?.(tool, toolUse.id, toolUse.input);
    if (error.outcome.code === "interrupted" && error.outcome.withdrawnAtAsk !== !0)
      toolUseContext.markToolCallRunning?.(toolUse.id);
    yield {
      message: toolResultForCancel({
        outcome: error.outcome,
        toolUseId: toolUse.id,
        assistantMessage: assistantMessage,
        signal: toolUseContext.abortController.signal,
        now: now,
      }),
    };
  }
}
//@ chunk-dtv8x2hx.js:97896-97962 placement
function Zt(e) {
  return e.kind === "error" && SERVED_OUTCOME_TABLE[e.code].sessionDenial;
}
/**
 * 由远程调用结果构造工具结果用户消息，含拒绝类型与来源助手消息 uuid。
 */
//@ chunk-dtv8x2hx.js:97962-98365 placement
async function buildRemoteToolResultMessage({
  tool: tool,
  origin: origin,
  toolUseId: toolUseId,
  assistantMessage: assistantMessage,
  toolUseContext: toolUseContext,
  now: now,
}) {
  let p = await processToolResultBlock(
      buildRemoteToolResultBlock(tool, origin, toolUseId),
      tool,
      getOriginalCwd(toolUseContext.session),
      toolUseContext.storageV5,
    ),
    i = Gr(origin.disposition);
  return createUserMessage({
    content: [p],
    toolUseResult:
      toolUseContext.agentId &&
      !toolUseContext.preserveToolUseResults &&
      !tool.preserveToolUseResultInSubagents
        ? void 0
        : (remoteStructuredOutput(tool, origin) ?? eo(origin)),
    ...(i && { toolDenialKind: i }),
    toolDenialFromHost: i !== void 0 ? !0 : void 0,
    sourceToolAssistantUUID: assistantMessage.uuid,
    now: now,
  });
}
//@ chunk-dtv8x2hx.js:98365-99193 placement
function toolResultForCancel({
  outcome: outcome,
  toolUseId: toolUseId,
  assistantMessage: assistantMessage,
  signal: signal,
  now: now,
}) {
  switch (outcome.code) {
    case "cancelled": {
      let u = createCancelledToolResultBlock(toolUseId),
        p = getCancelMessage(signal);
      return createUserMessage({
        content: [{ ...u, content: withMemoryCorrectionHint(p) }],
        toolUseResult: p,
        toolDenialKind: "cancelled",
        interruptedByShutdown: shutdownInterruptStamp(signal),
        sourceToolAssistantUUID: assistantMessage.uuid,
        now: now,
      });
    }
    case "interrupted": {
      let u = to(signal);
      return createUserMessage({
        content: [{ type: "tool_result", content: u, is_error: !0, tool_use_id: toolUseId }],
        toolUseResult: u,
        toolDenialKind: "interrupted",
        interruptedByShutdown: shutdownInterruptStamp(signal),
        sourceToolAssistantUUID: assistantMessage.uuid,
        now: now,
      });
    }
    case "rejected_in_session":
      return createUserMessage({
        content: [{ ...createCancelledToolResultBlock(toolUseId), content: outcome.message }],
        toolUseResult: outcome.message,
        toolDenialKind: denialKindOf(outcome),
        sourceToolAssistantUUID: assistantMessage.uuid,
        now: now,
      });
    default: {
      let u = denialKindOf(outcome);
      return createUserMessage({
        content: [toolUseErrorResult(outcome.message, toolUseId)],
        toolUseResult: `Error: ${outcome.message}`,
        ...(u !== void 0 && { toolDenialKind: u }),
        sourceToolAssistantUUID: assistantMessage.uuid,
        now: now,
      });
    }
  }
}
//@ chunk-dtv8x2hx.js:99193-99294 placement
function denialKindOf(e) {
  let { denialKind: denialKind } = SERVED_OUTCOME_TABLE[e.code];
  return e.code === "rejected_in_session" ? (e.denialKind ?? denialKind) : denialKind;
}
//@ chunk-dtv8x2hx.js:99294-99375 placement
function Gr(e) {
  if (e === void 0 || e === "unrecognized") return;
  return SERVED_OUTCOME_TABLE[e].denialKind;
}
//@ chunk-dtv8x2hx.js:99375-100245 placement
async function handleRemoteCancel({
  tool: tool,
  route: route,
  rawInput: rawInput,
  toolUseContext: toolUseContext,
  canUseTool: canUseTool,
  parentMessage: parentMessage,
  toolUseId: toolUseId,
}) {
  if (toolUseContext.abortController.signal.aborted)
    return {
      kind: "error",
      message: getCancelMessage(toolUseContext.abortController.signal),
      denialKind: "cancelled",
    };
  if (route.kind === "error")
    return (logRemoteForward(tool, "repl", route.code, toolUseId), { kind: "error", message: route.message });
  try {
    let remoteOrigin = (
      await handleRemoteBackgroundCommand(
        tool,
        route,
        "repl",
        rawInput,
        { ...toolUseContext, toolUseId: toolUseId },
        canUseTool,
        parentMessage,
      )
    ).remoteOrigin;
    if (remoteOrigin.isError || !isRanOutcome(remoteOrigin.disposition))
      return {
        kind: "error",
        message: `${Ke(tool, remoteOrigin)}
${Pn(remoteOrigin)}`,
        ...(isRanOutcome(remoteOrigin.disposition) && { ran: !0 }),
      };
    return {
      kind: "value",
      value: describeReconnectResult(Tn(tool, remoteOrigin) ?? Pn(remoteOrigin), remoteOrigin),
    };
  } catch (error) {
    if (error instanceof RemoteToolCallEnded) {
      if (Zt(error.outcome)) toolUseContext.onPermissionDenial?.(tool, toolUseId, rawInput);
      return {
        kind: "error",
        message: cancelMessage(error.outcome, toolUseContext.abortController.signal),
        denialKind: denialKindOf(error.outcome),
      };
    }
    if (error instanceof AbortError || toolUseContext.abortController.signal.aborted) throw error;
    return (
      logError(error),
      {
        kind: "error",
        message: failedInTransitMessage({ name: route.host.name, detail: "internal error while forwarding" }),
      }
    );
  }
}
//@ chunk-dtv8x2hx.js:100245-100273 placement
function eo(e) {
  return Pn(e);
}
//@ chunk-dtv8x2hx.js:100273-100361 placement
function Pn(e) {
  return isRanOutcome(e.disposition) && e.envelope === "present"
    ? contentToText(e.content)
    : remoteResultText(e, no);
}
//@ chunk-dtv8x2hx.js:100361-100373 placement
var no = 2000;
//@ chunk-dtv8x2hx.js:100373-100492 placement
function cancelMessage(e, n) {
  switch (e.code) {
    case "cancelled":
      return getCancelMessage(n);
    case "interrupted":
      return to(n);
    default:
      return e.message;
  }
}
//@ chunk-dtv8x2hx.js:100492-100548 placement
function to(e) {
  return unwrapAbortReason(e.reason) === "turn-abort"
    ? TOOL_CALL_ENDED_FOR_DELIVERY
    : INTERRUPT_MESSAGE_FOR_TOOL_USE;
}
//@ chunk-dtv8x2hx.js:100548-101255 placement
function describeReconnectResult(e, n) {
  let { name: o, working_dir: working_dir } = n.host,
    mapped = (n.notes ?? []).map((h) => sanitizeForPrompt(h, no)),
    mapped_2 = (n.sessionNotes ?? []).map((h) => h.text),
    p = working_dir === "" ? o : `${o}:${working_dir}`,
    i = {
      ...(n.envelope === "present"
        ? {
            ran_on: p,
            ...(n.permittedBy !== void 0 && { permitted_by: approvalSourcePhrase(n.permittedBy) }),
          }
        : { answered_by: o, unverified: !0 }),
      ...(n.delivery !== "fresh" && { not_rerun: !0 }),
      ...(n.delivery === "after_reconnect" && { delivered_after_reconnect: !0 }),
      ...(n.truncated && { truncated: !0 }),
      ...(n.spilled !== void 0 && { spilled_bytes: n.spilled.bytes }),
      ...((n.cutHere === !0 || (!(isRanOutcome(n.disposition) && n.envelope === "present") && Sn(n))) && {
        cut_here: !0,
      }),
      ...(mapped.length > 0 && { host_notes: mapped }),
      ...(mapped_2.length > 0 && { session_notes: mapped_2 }),
    };
  return e !== null && typeof e === "object" && !Array.isArray(e) ? { ...e, ...i } : { result: e, ...i };
}
//@ chunk-dtv8x2hx.js:101255-101423 placement
function inputChangedByApproval(e, n, o) {
  let r = e[$r],
    s = r !== void 0 && r !== null && (typeof r !== "string" || r.trim() !== n.host.name),
    any = isRunInBackground(o).some((p) => Boolean(e[p]) && !isDeepStrictEqual(e[p], n.input[p]));
  return s || any;
}
//@ chunk-dtv8x2hx.js:101423-101593 placement
function isRunInBackground(e, n) {
  let o = getToolRemoteExecution(e),
    r = o.supported ? (o.refusedInputFields ?? []) : [],
    s = n !== void 0 && e.name === BASH_TOOL_NAME && LKt(n);
  return r.filter((u) => !SANDBOX_OVERRIDE_INPUT_KEYS.has(u) && !(s && u === "run_in_background"));
}

export { executeRemoteToolUse, handleRemoteCancel, createEarlyCheckRunner, createRemoteApprover, eo };
