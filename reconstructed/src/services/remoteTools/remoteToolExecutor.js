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
  STATUS_NOTIFICATION_TIMEOUT_MS,
  NOTICE_NOTIFICATION_TIMEOUT_MS,
  RemoteToolCallEnded,
} from "./remoteToolRouting.js";
import {
  HOST_TOOL_INPUT_FIELD,
  HOST_CONTEXT_META_FIELD,
  rememberHostContext,
  machineLabelForMessage,
} from "../../bridge/deviceRegistration.js";
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
import { ServedCallRegistry, restartNoticeFor } from "../../utils/remoteTools/restartNotices.js";
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
import { leaseOfMachine } from "./lease.js";
import {
  CommitTurnSlot,
  forgetClassifierContext,
  enqueueClassifierRequest,
} from "../../utils/permissions/serverClassifier/context.js";
import {
  isCountedClassifierBlock,
  isAskOnMutationTool,
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
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { logError } from "../../utils/log.js";
import { fallbackUsageDelta } from "../api/withRetry.js";
import { calculateCostFromTokenCounts } from "../../utils/modelCost.js";
import { PATH_SENSITIVE_TOOLS, unsupportedFieldRefusal, withoutEditKeys } from "./pathMapping.js";
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
  shellOutputShownAbove,
  formatCompletedOnHost,
  formatTruncatedResult,
  unverifiedAnswerWithOutput,
  buildRemoteToolResultBlock,
  remoteStructuredOutput,
  structuredOutputIfStructured,
  remoteResultText_2,
  exceedsAnswerCharLimit,
} from "./remoteToolResult.js";
import { Stream } from "../../utils/stream.js";
import { emitToolHeartbeat, getCancelMessage } from "../tools/toolExecution.js";
import { SERVED_OUTCOME_TABLE, isRanOutcome } from "../../remote/tools/protocolConstants.js";
import { processToolResultBlock, getOriginalCwd } from "../../utils/toolResultStorage.js";
import { contentToText, sanitizeForPrompt } from "./resultConversion.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { supportsBackgroundShells } from "./backgroundCommands.js";
import { SANDBOX_OVERRIDE_INPUT_KEYS } from "../../utils/sandbox/sandboxDefaultPolicy.js";

//@ chunk-dtv8x2hx.js:81407-86035 placement
/**
 * 生成远程调用的审批函数：结合本地 canUseTool、宿主允许规则与推测执行（约 4.6 KB）。
 */
function createRemoteApprover({
  tool,
  host,
  toolUseContext,
  canUseTool,
  parentMessage,
  toolUseId,
  honourHostAllowRules,
  speculation,
}) {
  return async (h) => {
    let w = new PromptScopedAbortController(toolUseContext.abortController);
    w.signal.addEventListener(
      "abort",
      () => {
        if (!h.ended.aborted && !toolUseContext.abortController.signal.aborted)
          toolUseContext.abortController.abort(w.signal.reason);
      },
      {
        once: true,
      },
    );
    if (h.ended.aborted) return withdrawnAskDecision(h);
    h.ended.addEventListener("abort", () => w.abort(h.ended.reason), {
      once: true,
    });
    h.patience?.hold();
    let k = await classifyRemoteCall({
      tool,
      host,
      request: h,
      toolUseContext,
      toolUseId,
      messageId: parentMessage.message.id,
      honourHostAllowRules,
      speculation,
    });
    if (k.kind === "allow")
      return {
        decision: "allow",
        decidedBy: "classifier",
      };
    if (k.kind === "block")
      return {
        decision: "deny",
        feedback: "blocked by the session's auto-mode classifier",
        insteadOfRejection: {
          message: k.message,
          denialKind: k.denialKind,
        },
      };
    let S = `runs on ${h.host.name}`;
    let A =
      tool.isMcp === true
        ? {
            ...h.input,
          }
        : {
            ...h.input,
            [HOST_TOOL_INPUT_FIELD]: h.host.name,
          };
    let R = `(${S}) ${truncateAtSentence(h.message)}`;
    let hostAllowRules = buildHostAllowRules(tool, h);
    let O = {
      behavior: "ask",
      message: R,
      decisionReason: {
        type: "other",
        reason: R,
      },
      ...(hostAllowRules === undefined
        ? {
            suppressAlwaysAllowRule: true,
          }
        : {
            suggestions: [hostAllowRules],
          }),
      forcedByCaller: true,
      askPatience: h.patience,
      askEnded: h.askEnded,
      ...(h.pendingBeforeRestart === true && {
        pendingBeforeRestart: true,
      }),
    };
    let toolPermissionContext = getToolPermissionContext(toolUseContext);
    if (toolPermissionContext.mode === "dontAsk" || toolPermissionContext.shouldAvoidPermissionPrompts)
      return {
        decision: "deny",
        insteadOfRejection: {
          message:
            toolPermissionContext.mode === "dontAsk"
              ? DONT_ASK_REJECT_MESSAGE(tool.name)
              : `${h.host.name} asked for approval, and this context cannot show a permission prompt; the call did not run.`,
          denialKind: "permission-rule",
        },
      };
    let M =
      tool.isMcp === true
        ? {
            ...tool,
            suppressesAllPermissionUpdates: () => true,
          }
        : tool;
    let E =
      h.pendingBeforeRestart === true && !h.ended.aborted
        ? await toolUseContext.toolState.get(ServedCallRegistry).takeInheritedAnswer(toolUseId)?.({
            input: A,
            planMode: () => getToolPermissionContext(toolUseContext).mode === "plan",
          })
        : undefined;
    if (h.ended.aborted) return withdrawnAskDecision(h);
    h.patience?.resume();
    let standingRow =
      hostAllowRules === undefined
        ? "withheld"
        : hostAllowRules.destination === "session"
          ? "offered_prefix"
          : "offered_exact";
    h.noteCard({
      standingRow,
      chosen: false,
    });
    let raisedInPlanMode = E === undefined && getToolPermissionContext(toolUseContext).mode === "plan";
    let L = parkOnUser();
    let y;
    try {
      if (E === undefined)
        y = await canUseTool(
          M,
          A,
          {
            ...toolUseContext,
            abortController: w,
          },
          parentMessage,
          toolUseId,
          O,
        );
      else {
        let F;
        try {
          F =
            E.result.behavior === "deny"
              ? undefined
              : await executePermissionRequestHooksForSDK(
                  E.answers,
                  M,
                  toolUseId,
                  A,
                  {
                    ...toolUseContext,
                    abortController: w,
                  },
                  hostAllowRules === undefined ? undefined : [hostAllowRules],
                  {
                    suppressAlwaysAllowRule: hostAllowRules === undefined,
                  },
                  () => true,
                );
        } catch (error) {
          if (h.ended.aborted) return withdrawnAskDecision(h);
          if (toolUseContext.abortController.signal.aborted) throw error;
          logForDebugging(
            `PermissionRequest hooks failed before an inherited answer was applied: ${errorMessage(error)}`,
            {
              level: "warn",
            },
          );
          return {
            decision: "deny",
            insteadOfRejection: {
              message: `A PermissionRequest hook failed before the approval given earlier could be applied; the ${tool.name} call did not run on ${h.host.name}.`,
              denialKind: "permission-rule",
            },
          };
        }
        if (F !== undefined && F.decision.behavior !== "allow") {
          if (F.interrupt) turnAbortControllerOf(toolUseContext.abortController).abort();
          y = F.decision;
        } else
          y = permissionPromptToolResultToPermissionDecision(
            E.answers,
            E.result,
            M,
            A,
            {
              ...toolUseContext,
              abortController: w,
            },
            M,
            hostAllowRules === undefined,
            false,
          );
      }
    } finally {
      L();
    }
    if (y.behavior === "allow") {
      let F =
        y.decisionReason?.type === "permissionPromptTool"
          ? permissionPromptResultSchemaRefusing().safeParse(y.decisionReason.toolResult).data
          : undefined;
      h.noteCard({
        standingRow,
        chosen:
          hostAllowRules !== undefined &&
          F?.behavior === "allow" &&
          F.updatedPermissions?.some(
            (updatedPermission) =>
              updatedPermission.type === "addRules" && updatedPermission.behavior === "allow",
          ) === true,
      });
      let updatedInput = y.updatedInput ?? {};
      if (inputChangedByApproval(updatedInput, h, tool))
        return {
          decision: "deny",
          feedback: `the approval edited the call in a way that cannot apply on ${h.host.name} \u2014 nothing ran`,
          insteadOfRejection: {
            message: `The approval given in this session edited the ${tool.name} call in a way ${h.host.name} cannot honour (it named a different machine, or newly set a privileged field this session does not pass on in an edit); nothing ran.`,
            denialKind: "permission-rule",
          },
        };
      let te = [HOST_TOOL_INPUT_FIELD, ...isRunInBackground(tool, host)];
      let ee = Uo(updatedInput, te);
      let se = Object.keys(ee).length > 0 && !isDeepStrictEqual(ee, Uo(h.input, te));
      return {
        decision: "allow",
        decidedBy:
          y.decisionReason?.type === "hook"
            ? "hook"
            : y.decisionReason?.type === "permissionPromptTool"
              ? "host_prompt"
              : "prompt",
        raisedInPlanMode,
        ...(se && {
          updatedInput: ee,
        }),
        ...(y.acceptFeedback !== undefined && {
          feedback: y.acceptFeedback,
        }),
      };
    }
    if (y.behavior === "deny" && y.decisionReason?.type === "hook")
      return {
        decision: "deny",
        insteadOfRejection: {
          message: y.message,
          denialKind: "permission-rule",
        },
      };
    if (isSameDecision(y, O))
      return {
        decision: "deny",
        insteadOfRejection: {
          message: `${h.host.name} asked before running this call and this session had no way to put the question to anyone; the call was not run. Ask the user how to proceed rather than retrying.`,
          denialKind: "permission-rule",
        },
      };
    let I = y.behavior === "ask" ? trimmedOrUndefined(y.userFeedback) : usesPermissionPromptTool(y);
    if (
      y.behavior === "deny" &&
      y.decisionReason?.type === "other" &&
      isCanUseToolFailureReason(y.decisionReason.reason)
    )
      return {
        decision: "unanswerable",
        message: y.message,
      };
    if (y.behavior === "deny" && I === undefined && y.decisionReason?.type === "other")
      return {
        decision: "deny",
        insteadOfRejection: {
          message: y.message,
          denialKind: "permission-rule",
        },
      };
    return {
      decision: "deny",
      ...(I !== undefined && {
        feedback: I,
      }),
    };
  };
}
//@ chunk-dtv8x2hx.js:86035-86119 placement
/**
 * 判断该权限模式是否算「已授权」：自动分类器生效或 bypassPermissions（plan 需开关）。
 */
function modeAllowsClassifierBypass(e) {
  if (e === "plan" && !isPlanClassifierArmOn()) return false;
  return isAutoClassifierActive(e) || e === "bypassPermissions";
}
//@ chunk-dtv8x2hx.js:86119-86403 placement
function hostRulesContext(e, n) {
  let hostRules = e.hostRules;
  if (hostRules === undefined) return;
  let r = {
    host: e.host.name,
    allow: n ? (hostRules.allow ?? []) : [],
    softDeny: hostRules.soft_deny ?? [],
    hardDeny: hostRules.hard_deny ?? [],
    environment: n ? (hostRules.environment ?? []) : [],
  };
  return [r.allow, r.softDeny, r.hardDeny, r.environment].some((s) => s.length > 0)
    ? {
        hostRules: r,
      }
    : undefined;
}
//@ chunk-dtv8x2hx.js:86403-90201 placement
/**
 * 自动模式下用分类器判定远程调用（不适用时 no_verdict）。
 */
async function classifyRemoteCall({
  tool,
  host,
  request,
  toolUseContext,
  toolUseId,
  messageId,
  honourHostAllowRules,
  speculation,
}) {
  let toolPermissionContext = getToolPermissionContext(toolUseContext);
  if (
    !shouldClassifyRemotely(tool, host, toolUseContext, toolPermissionContext.mode) ||
    !request.classifierEligible
  ) {
    speculation?.abandon("not_eligible");
    return {
      kind: "no_verdict",
    };
  }
  if (
    getToolNameForPermissionCheck(tool) &&
    (HOST_CONTEXT_META_FIELD in request.input || HOST_TOOL_INPUT_FIELD in request.input)
  ) {
    speculation?.abandon("not_eligible");
    return {
      kind: "no_verdict",
    };
  }
  let w = {
    host: request.host,
    spelledDirectory: displayWorkingDir(leaseOfMachine(host).working_dir),
    input: request.input,
    message: request.message,
    decisionReason: request.decisionReason,
    hostRules: request.hostRules,
  };
  let now = Date.now();
  let S = {
    host_rules_hard_deny: request.hostRules?.hard_deny?.length ?? 0,
    host_rules_soft_deny: request.hostRules?.soft_deny?.length ?? 0,
    host_rules_environment: request.hostRules?.environment?.length ?? 0,
    host_rules_allow: request.hostRules?.allow?.length ?? 0,
    host_rules_allow_honoured: honourHostAllowRules,
  };
  let A;
  let R = false;
  let T = speculationFields(speculation !== undefined, undefined, undefined);
  using O = new CommitTurnSlot();
  try {
    A = speculation?.claim();
    let x =
      A === undefined ? undefined : describeAskChange(A, w, tool, toolUseContext, toolPermissionContext);
    T = speculationFields(speculation !== undefined, A, x);
    if (speculation !== undefined)
      toolUseContext.toolState.get(RemoteAskMemory).remember(request.host.name, tool.name, w);
    if (A !== undefined && x !== undefined) {
      speculation?.discard();
      A.run.leaveRecordToRerun();
      forgetClassifierContext(toolUseId);
      logSpeculationUsage({
        reason: x,
        early: A,
        stepReportsTheDrop: true,
        toolUseContext,
        toolUseId,
      });
    }
    R = A !== undefined && x === undefined;
    let M =
      A !== undefined && x === undefined
        ? A.run
        : formatRemoteAskReason({
            tool,
            request: w,
            toolUseContext,
            toolUseId,
            honourHostAllowRules,
            signal: toolUseContext.abortController.signal,
            commitTurn: O,
            startedAhead: false,
            rerunOfStoppedCall: A !== undefined,
          });
    if (R) resetClassifierCache(toolUseContext, w, honourHostAllowRules, O);
    let classification = await M.result;
    let D = M.queueStats();
    let queueCommitWaitMs;
    let L = isCountedClassifierBlock(classification) ? O.reached() : undefined;
    if (L !== undefined) {
      let now = Date.now();
      await L;
      queueCommitWaitMs = Date.now() - now;
    }
    let toolPermissionContext_2 = getToolPermissionContext(toolUseContext);
    let I =
      !modeAllowsClassifierBypass(toolPermissionContext_2.mode) ||
      toolPermissionContext_2.mode !== toolPermissionContext.mode ||
      (toolPermissionContext_2.mode === "plan" && !isAutoModeCapableHost(host));
    let F = isAskOnMutationTool(tool.name, toolUseContext.getProactivityLevel());
    let Y =
      I ||
      F ||
      classification.unavailable ||
      classification.transcriptTooLong ||
      classification.refusedBySafeguard ||
      classification.failureMode !== undefined
        ? "no_verdict"
        : classification.shouldBlock
          ? "block"
          : isChainOnAllowActive()
            ? "no_verdict"
            : "allow";
    let te = I
      ? "mode_left"
      : F
        ? "ask_level_raised"
        : classification.transcriptTooLong
          ? "too_long"
          : classification.refusedBySafeguard
            ? "refused"
            : classification.unavailable
              ? "unavailable"
              : classification.failureMode !== undefined
                ? "unparseable"
                : !classification.shouldBlock && isChainOnAllowActive()
                  ? "chain_on_allow"
                  : "verdict";
    logEvent("tengu_remote_tool_classifier", {
      decision: fromEnum(Y),
      cause: fromEnum(te),
      headless: toolPermissionContext_2.shouldAvoidPermissionPrompts === true,
      duration_ms: Date.now() - now,
      tool_use_id: sanitizeMarkName(toolUseId),
      ...S,
      ...(D?.overlap !== undefined && {
        queue_depth: D.queueDepth,
        queue_wait_ms: D.queueWaitMs,
        queue_overlap_enabled: true,
        queue_in_flight_at_start: D.overlap.inFlightAtStart,
        queue_overlapped: D.overlap.overlapped,
        queue_released_by_escalation: D.overlap.releasedByEscalation,
        queue_commit_wait_ms: queueCommitWaitMs,
      }),
      ...T,
      ...classifierUsageFields(classification),
    });
    if (toolUseContext.abortController.signal.aborted) throw new AbortError();
    if (Y === "allow") {
      O.runInTurn(() => recordAutoModeSuccess(toolUseContext));
      return {
        kind: "allow",
      };
    }
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
        return {
          kind: "no_verdict",
        };
      return {
        kind: "block",
        message: buildYoloRejectionMessage(classification.reason, {
          autoModeConsentFlow: isAutoModeConsentFlowEnabled(toolUseContext.agentId),
          blockedHelp: autoModeBlockedHelp(toolUseContext.agentId),
        }),
        denialKind: "automode-blocked",
      };
    }
    if (I || F)
      return {
        kind: "no_verdict",
      };
    let shouldAvoidPermissionPrompts = toolPermissionContext_2.shouldAvoidPermissionPrompts;
    if (classification.transcriptTooLong) {
      if (shouldAvoidPermissionPrompts)
        throw new AbortError(
          "Agent aborted: auto mode classifier transcript exceeded context window in headless mode",
        );
      return {
        kind: "no_verdict",
      };
    }
    if (classification.refusedBySafeguard) {
      if (shouldAvoidPermissionPrompts)
        throw new AbortError(
          "Agent aborted: auto mode classifier request refused by the safety safeguard in headless mode",
        );
      return {
        kind: "block",
        message: buildClassifierRefusedOrTransientGuidance(classification.reason, {
          refused: true,
        }),
        denialKind: "automode-unavailable",
      };
    }
    if (classification.unavailable)
      return {
        kind: "block",
        message: buildClassifierUnavailableMessage(
          tool.name,
          classification.model,
          classification.httpStatus,
          classification.errorKind,
          classification.retryAfterMs,
        ),
        denialKind: "automode-unavailable",
      };
    if (classification.failureMode !== undefined) {
      if (
        enforceAutoModeDenialLimits(
          toolUseContext,
          recordAutoModeDenial(toolUseContext),
          tool,
          messageId,
          toolUseId,
        )
      )
        return {
          kind: "no_verdict",
        };
      return {
        kind: "block",
        message: buildClassifierRefusedOrTransientGuidance(classification.reason, {
          refused: false,
        }),
        denialKind: "automode-parsing-error",
      };
    }
    return {
      kind: "no_verdict",
    };
  } catch (error) {
    if (error instanceof AbortError || toolUseContext.abortController.signal.aborted) throw error;
    logError(error);
    logEvent("tengu_remote_tool_classifier", {
      decision: fromEnum("no_verdict"),
      cause: fromEnum("crashed"),
      headless: getToolPermissionContext(toolUseContext).shouldAvoidPermissionPrompts === true,
      duration_ms: Date.now() - now,
      tool_use_id: sanitizeMarkName(toolUseId),
      ...S,
      ...T,
    });
    return {
      kind: "no_verdict",
    };
  } finally {
    if (A !== undefined && !R) speculation?.discard();
  }
}
//@ chunk-dtv8x2hx.js:90201-90408 placement
function speculationFields(e, n, o) {
  if (!e) return {};
  return n === undefined
    ? {
        speculative: false,
      }
    : {
        speculative: true,
        speculative_used: o === undefined,
        speculative_discard_reason: fromEnumOpt(o),
        speculative_lead_ms: n.leadMs,
        speculative_ready_ms: n.readyMs,
      };
}
//@ chunk-dtv8x2hx.js:90408-91083 placement
/**
 * 汇总分类器用量字段（各阶段 token、缓存、耗时、费用），用于遥测。
 */
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
        : undefined,
  };
}
//@ chunk-dtv8x2hx.js:91083-91477 placement
function logSpeculationUsage({ reason, early, stepReportsTheDrop, toolUseContext, toolUseId }) {
  let u = {
    reason,
    early,
    toolUseContext,
    toolUseId,
  };
  if (!stepReportsTheDrop && early.settled) {
    early.run.result
      .then(
        (classification) =>
          logRemoteToolClassifier(u, "speculation_unused", classifierUsageFields(classification)),
        () => logRemoteToolClassifier(u, "speculation_unused", {}),
      )
      .catch(() => {});
    return;
  }
  if (!stepReportsTheDrop) logRemoteToolClassifier(u, "speculation_unused", {});
  early.run.result
    .then((classification) => {
      if (classification.usage !== undefined)
        logRemoteToolClassifier(u, "speculation_usage", classifierUsageFields(classification));
    })
    .catch(() => {});
}
//@ chunk-dtv8x2hx.js:91477-91889 placement
function logRemoteToolClassifier({ reason, early, toolUseContext, toolUseId }, s, u) {
  logEvent("tengu_remote_tool_classifier", {
    decision: fromEnum("no_verdict"),
    cause: fromEnum(s),
    headless: getToolPermissionContext(toolUseContext).shouldAvoidPermissionPrompts === true,
    duration_ms: early.leadMs,
    tool_use_id: sanitizeMarkName(toolUseId),
    speculative: true,
    speculative_used: false,
    speculative_discard_reason: fromEnum(reason),
    speculative_settled: s === "speculation_usage" || early.settled,
    speculative_lead_ms: early.leadMs,
    speculative_ready_ms: early.readyMs,
    ...u,
  });
}
//@ chunk-dtv8x2hx.js:91889-92009 placement
function shouldClassifyRemotely(tool, host, toolUseContext, mode) {
  return (
    modeAllowsClassifierBypass(mode) &&
    (mode !== "plan" || isAutoModeCapableHost(host)) &&
    (PATH_SENSITIVE_TOOLS.has(tool.name) || getToolNameForPermissionCheck(tool)) &&
    !isAskOnMutationTool(tool.name, toolUseContext.getProactivityLevel())
  );
}
//@ chunk-dtv8x2hx.js:92009-92294 placement
function classifierTranscript(e, n) {
  let o = isModelDrivenSession(n.agentId);
  let r = prependInheritedVerifiedTurns(n.messages, n.inheritedVerifiedHumanTurns, o);
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
  return {
    ...(o !== undefined && {
      commitTurn: o,
    }),
    ...(r !== undefined && {
      cachePrefix: jsonStringify(r),
    }),
  };
}
//@ chunk-dtv8x2hx.js:92399-92482 placement
/**
 * 以当前分类器缓存键重置分类器缓存（实际不等待任何工作）。
 */
function resetClassifierCache(toolUseContext, n, honourHostAllowRules, r) {
  enqueueClassifierRequest(
    toolUseContext.agentId ?? "main",
    () => Promise.resolve(),
    undefined,
    classifierCacheKey(n, honourHostAllowRules, r),
  );
}
//@ chunk-dtv8x2hx.js:92482-92495 placement
var ASK_LEAD_STALE_MS = 60000;
//@ chunk-dtv8x2hx.js:92495-93653 placement
/**
 * 说明调用在另一台机器上运行及该机器 Claude Code 给出的 ask 原因。
 */
function formatRemoteAskReason({
  tool,
  request,
  toolUseContext,
  toolUseId,
  honourHostAllowRules,
  signal,
  commitTurn,
  startedAhead,
  rerunOfStoppedCall,
}) {
  let w = truncateToLength(
    `${request.message}${request.decisionReason === undefined ? "" : ` [${request.decisionReason}]`}`,
    MAX_ASK_REASON_CHARS,
  );
  let k = `runs on ${request.host.name} (another machine, not this one) in ${request.spelledDirectory}; that machine's Claude Code gave this reason for asking (its words, unverified): "${w}"`;
  let command = request.input.command;
  let toolNameForPermissionCheck = getToolNameForPermissionCheck(tool);
  let R = formatActionForClassifier(
    tool.name,
    rememberHostContext(
      {
        ...request.input,
        [HOST_TOOL_INPUT_FIELD]: request.host.name,
        ...(toolNameForPermissionCheck && {
          [HOST_CONTEXT_META_FIELD]: k,
        }),
        ...(typeof command === "string" && {
          command: `# ${k}
${command}`,
        }),
      },
      k,
    ),
    toolUseId,
  );
  let { messages, registry, isSubagentLoop, inheritedPrefix } = classifierTranscript(tool, toolUseContext);
  let sessionId = pinSessionId(getSessionId());
  let D;
  let X;
  let L = false;
  return {
    messages,
    registry,
    enqueuedInMode: getToolPermissionContext(toolUseContext).mode,
    ranUnder: () => D,
    queueStats: () => X,
    leaveRecordToRerun: () => {
      L = true;
    },
    result: enqueueClassifierRequest(
      toolUseContext.agentId ?? "main",
      (queueProgress) => {
        if (startedAhead && signal.aborted) throw new AbortError();
        if (rerunOfStoppedCall) forgetClassifierContext(toolUseId);
        D = getToolPermissionContext(toolUseContext);
        let I = classifyYoloAction(messages, R, registry, D, signal, {
          localClassifierSite: "remoteDispatch",
          isSubagentLoop,
          inheritedPrefix,
          recordPresumed: toolUseContext.agentId === undefined,
          severityEligible: true,
          storageV5: toolUseContext.storageV5,
          credentials: toolUseContext.credentials,
          agentId: toolUseContext.agentId,
          sessionId,
          queueProgress,
          ...hostRulesContext(request, honourHostAllowRules),
        });
        return startedAhead
          ? I.finally(() => {
              if (signal.aborted && !L) forgetClassifierContext(toolUseId);
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
//@ chunk-dtv8x2hx.js:93653-94325 placement
/**
 * 为远程工具调用提前启动自动模式判定：记得该机器与工具上次的询问时，在真正调用前推测性地运行分类器；放弃时清理记忆并记推测使用情况。
 */
function createEarlyCheckRunner({ tool, host, toolUseContext, toolUseId, honourHostAllowRules }) {
  return new EarlyCheckRunner({
    turn: toolUseContext.abortController,
    start: (call, signal) => {
      let i = toolUseContext.toolState.get(RemoteAskMemory).recall(call.host.name, tool.name);
      let runsInBackground = isRunInBackground(tool, host);
      if (
        i === undefined ||
        !shouldClassifyRemotely(tool, host, toolUseContext, getToolPermissionContext(toolUseContext).mode) ||
        unsupportedFieldRefusal(call.input, runsInBackground, call.host.name) !== undefined
      )
        return;
      let predicted = {
        host: call.host,
        spelledDirectory: displayWorkingDir(leaseOfMachine(host).working_dir),
        input: withoutEditKeys(call.input, runsInBackground),
        ...i,
      };
      return {
        predicted,
        run: formatRemoteAskReason({
          tool,
          request: predicted,
          toolUseContext,
          toolUseId,
          honourHostAllowRules,
          signal,
          startedAhead: true,
          rerunOfStoppedCall: false,
        }),
      };
    },
    onAbandoned: (reason, early) => {
      forgetClassifierContext(toolUseId);
      toolUseContext.toolState.get(RemoteAskMemory).forget(early.predicted.host.name, tool.name);
      logSpeculationUsage({
        reason,
        early,
        stepReportsTheDrop: false,
        toolUseContext,
        toolUseId,
      });
    },
  });
}
//@ chunk-dtv8x2hx.js:94325-94656 placement
function describeAskChange(e, n, tool, toolUseContext, toolPermissionContext) {
  if (!isDeepStrictEqual(e.predicted.input, n.input)) return "input_changed";
  if (!isDeepStrictEqual(e.predicted, n)) return "ask_changed";
  let u = e.run.ranUnder();
  let p = classifierTranscript(tool, toolUseContext);
  if (
    e.run.enqueuedInMode !== toolPermissionContext.mode ||
    (u !== undefined && !isDeepStrictEqual(u, toolPermissionContext)) ||
    !sameSequence(e.run.messages, p.messages) ||
    !sameSequence(e.run.registry, p.registry)
  )
    return "context_changed";
  return e.leadMs > ASK_LEAD_STALE_MS ? "stale" : undefined;
}
//@ chunk-dtv8x2hx.js:94656-94726 placement
/**
 * 判断两个数组是否逐项相等（用于检测上下文是否变化）。
 */
function sameSequence(e, n) {
  return e.length === n.length && e.every((o, r) => o === n[r]);
}
//@ chunk-dtv8x2hx.js:94726-94737 placement
var MAX_ASK_REASON_CHARS = 300;
//@ chunk-dtv8x2hx.js:94737-94934 placement
function usesPermissionPromptTool(e) {
  let trimmed = e.message.trim();
  for (let o of [REJECT_MESSAGE_WITH_REASON_PREFIX, SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX])
    if (trimmed.startsWith(o.trim())) return trimmedOrUndefined(trimmed.slice(o.trim().length));
  return e.decisionReason?.type === "permissionPromptTool" && trimmed !== USER_DENIED_PERMISSION_MESSAGE
    ? trimmedOrUndefined(trimmed)
    : undefined;
}
//@ chunk-dtv8x2hx.js:94934-94992 placement
/**
 * 去掉字符串首尾空白，空串返回 undefined。
 */
function trimmedOrUndefined(e) {
  let n = e?.trim() ?? "";
  return n === "" ? undefined : n;
}
//@ chunk-dtv8x2hx.js:94992-95024 placement
var USER_DENIED_PERMISSION_MESSAGE = "User denied permission";
//@ chunk-dtv8x2hx.js:95024-97896 placement
/**
 * 远程工具执行生成器：错误路由、重启后接管未完成调用、产出结果消息。
 */
async function* executeRemoteToolUse({
  tool,
  toolUse,
  route,
  assistantMessage,
  toolUseContext,
  canUseTool,
  now,
}) {
  if (route.kind === "error") {
    if (!toolUseContext.abortController.signal.aborted)
      logRemoteForward(tool, "executor", route.code, toolUse.id);
    let i = toolUseContext.toolState.get(ServedCallRegistry);
    let h = i.adopted(toolUse.id);
    if (h !== undefined) {
      i.takeAdopted(toolUse.id);
      i.remove(toolUse.id);
      logEvent("tengu_remote_tool_restart_adoption_unroutable", {
        where: lit("route_error"),
        route_code: fromEnum(route.code),
        parked_at_restart: h.parkedAtRestart === true,
      });
    }
    let w =
      h === undefined
        ? route.message
        : restartNoticeFor(
            {
              host: h.host,
            },
            h,
          );
    if (h !== undefined && !h.parkedAtRestart && !toolUseContext.abortController.signal.aborted)
      try {
        let input = toolUse.input;
        toolUseContext.toolState.get(RemoteCallLedger).gaveUp({
          callId: toolUse.id,
          agentId: toolUseContext.agentId,
          hostName: h.host,
          toolName: tool.name,
          wireToolName: tool.mcpInfo?.toolName ?? tool.name,
          spelled: primaryInputPath(typeof input === "object" && input !== null ? input : {}),
          toldAs: "delivery_unknown",
          machineHadCall: false,
          transport: undefined,
          dispatchEpoch: h.host_epoch,
          standing: false,
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
            outcome: {
              kind: "error",
              code: "cancelled",
              message: CANCEL_MESSAGE,
            },
            toolUseId: toolUse.id,
            assistantMessage,
            signal: toolUseContext.abortController.signal,
            now,
          })
        : createUserMessage({
            content: [toolUseErrorResult(w, toolUse.id)],
            toolUseResult: `Error: ${w}`,
            sourceToolAssistantUUID: assistantMessage.uuid,
            now,
          }),
    };
    return;
  }
  toolUseContext.markToolCallStarted?.(toolUse.id);
  yield {
    type: "set_in_progress_tool_use_ids",
    op: {
      action: "add",
      ids: [toolUse.id],
    },
  };
  try {
    let i = new Stream();
    let h = toolUseContext.agentId
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
                  now,
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
      {
        ...toolUseContext,
        toolUseId: toolUse.id,
      },
      canUseTool,
      assistantMessage,
      (text, timeoutMs = STATUS_NOTIFICATION_TIMEOUT_MS) =>
        i.enqueue({
          type: "notification",
          notification: {
            key: `remote-tool-status-${toolUse.id}`,
            text,
            priority: "medium",
            timeoutMs,
          },
        }),
      (text) =>
        i.enqueue({
          type: "notification",
          notification: {
            key: `remote-tool-notice-${toolUse.id}`,
            text,
            priority: "medium",
            timeoutMs: NOTICE_NOTIFICATION_TIMEOUT_MS,
          },
        }),
    ).finally(() => {
      endActivity("tool_exec", REMOTE_TOOL_HOST);
      h();
      i.done();
    });
    w.catch(() => {});
    for await (let T of i) yield T;
    let k = await w;
    yield {
      message: await buildRemoteToolResultMessage({
        tool,
        origin: k.remoteOrigin,
        toolUseId: toolUse.id,
        assistantMessage,
        toolUseContext,
        now,
      }),
    };
    let disposition = k.remoteOrigin.disposition;
    let A = shellOutputShownAbove(tool, k.remoteOrigin);
    let R = formatCompletedOnHost(tool, k.remoteOrigin);
    yield {
      message: createAttachmentMessage({
        type: "tool_host_result_lines",
        toolUseID: toolUse.id,
        host: machineLabelForMessage(k.remoteOrigin.host.name),
        lines: [...(A ? [A] : []), ...(R ? [R] : []), ...formatTruncatedResult(tool, k.remoteOrigin)],
        label: unverifiedAnswerWithOutput(tool, k.remoteOrigin),
        ...(k.remoteOrigin.envelope !== "present" && {
          unverified: true,
        }),
        ...(k.remoteOrigin.host.working_dir && {
          workingDir: k.remoteOrigin.host.working_dir,
        }),
        ...(disposition !== undefined && {
          disposition,
        }),
      }),
    };
  } catch (error) {
    if (!(error instanceof RemoteToolCallEnded)) throw error;
    if (isSessionDenialOutcome(error.outcome))
      toolUseContext.onPermissionDenial?.(tool, toolUse.id, toolUse.input);
    if (error.outcome.code === "interrupted" && error.outcome.withdrawnAtAsk !== true)
      toolUseContext.markToolCallRunning?.(toolUse.id);
    yield {
      message: toolResultForCancel({
        outcome: error.outcome,
        toolUseId: toolUse.id,
        assistantMessage,
        signal: toolUseContext.abortController.signal,
        now,
      }),
    };
  }
}
//@ chunk-dtv8x2hx.js:97896-97962 placement
/**
 * 判断错误结果是否属于本会话拒绝（需要上报权限拒绝）。
 */
function isSessionDenialOutcome(outcome) {
  return outcome.kind === "error" && SERVED_OUTCOME_TABLE[outcome.code].sessionDenial;
}
//@ chunk-dtv8x2hx.js:97962-98365 placement
/**
 * 由远程调用结果构造工具结果用户消息，含拒绝类型与来源助手消息 uuid。
 */
async function buildRemoteToolResultMessage({
  tool,
  origin,
  toolUseId,
  assistantMessage,
  toolUseContext,
  now,
}) {
  let p = await processToolResultBlock(
    buildRemoteToolResultBlock(tool, origin, toolUseId),
    tool,
    getOriginalCwd(toolUseContext.session),
    toolUseContext.storageV5,
  );
  let i = denialKindOf(origin.disposition);
  return createUserMessage({
    content: [p],
    toolUseResult:
      toolUseContext.agentId &&
      !toolUseContext.preserveToolUseResults &&
      !tool.preserveToolUseResultInSubagents
        ? undefined
        : (remoteStructuredOutput(tool, origin) ?? remoteResultTextOf(origin)),
    ...(i && {
      toolDenialKind: i,
    }),
    toolDenialFromHost: i !== undefined ? true : undefined,
    sourceToolAssistantUUID: assistantMessage.uuid,
    now,
  });
}
//@ chunk-dtv8x2hx.js:98365-99193 placement
function toolResultForCancel({ outcome, toolUseId, assistantMessage, signal, now }) {
  switch (outcome.code) {
    case "cancelled": {
      let cancelledToolResultBlock = createCancelledToolResultBlock(toolUseId);
      let cancelMessage = getCancelMessage(signal);
      return createUserMessage({
        content: [
          {
            ...cancelledToolResultBlock,
            content: withMemoryCorrectionHint(cancelMessage),
          },
        ],
        toolUseResult: cancelMessage,
        toolDenialKind: "cancelled",
        interruptedByShutdown: shutdownInterruptStamp(signal),
        sourceToolAssistantUUID: assistantMessage.uuid,
        now,
      });
    }
    case "interrupted": {
      let u = abortReasonToToolMessage(signal);
      return createUserMessage({
        content: [
          {
            type: "tool_result",
            content: u,
            is_error: true,
            tool_use_id: toolUseId,
          },
        ],
        toolUseResult: u,
        toolDenialKind: "interrupted",
        interruptedByShutdown: shutdownInterruptStamp(signal),
        sourceToolAssistantUUID: assistantMessage.uuid,
        now,
      });
    }
    case "rejected_in_session":
      return createUserMessage({
        content: [
          {
            ...createCancelledToolResultBlock(toolUseId),
            content: outcome.message,
          },
        ],
        toolUseResult: outcome.message,
        toolDenialKind: denialKindOf_2(outcome),
        sourceToolAssistantUUID: assistantMessage.uuid,
        now,
      });
    default: {
      let u = denialKindOf_2(outcome);
      return createUserMessage({
        content: [toolUseErrorResult(outcome.message, toolUseId)],
        toolUseResult: `Error: ${outcome.message}`,
        ...(u !== undefined && {
          toolDenialKind: u,
        }),
        sourceToolAssistantUUID: assistantMessage.uuid,
        now,
      });
    }
  }
}
//@ chunk-dtv8x2hx.js:99193-99294 placement
function denialKindOf_2(outcome) {
  let { denialKind } = SERVED_OUTCOME_TABLE[outcome.code];
  return outcome.code === "rejected_in_session" ? (outcome.denialKind ?? denialKind) : denialKind;
}
//@ chunk-dtv8x2hx.js:99294-99375 placement
/**
 * 把处置结果映射成拒绝类型。
 */
function denialKindOf(disposition) {
  if (disposition === undefined || disposition === "unrecognized") return;
  return SERVED_OUTCOME_TABLE[disposition].denialKind;
}
//@ chunk-dtv8x2hx.js:99375-100245 placement
async function handleRemoteCancel({
  tool,
  route,
  rawInput,
  toolUseContext,
  canUseTool,
  parentMessage,
  toolUseId,
}) {
  if (toolUseContext.abortController.signal.aborted)
    return {
      kind: "error",
      message: getCancelMessage(toolUseContext.abortController.signal),
      denialKind: "cancelled",
    };
  if (route.kind === "error") {
    logRemoteForward(tool, "repl", route.code, toolUseId);
    return {
      kind: "error",
      message: route.message,
    };
  }
  try {
    let remoteOrigin = (
      await handleRemoteBackgroundCommand(
        tool,
        route,
        "repl",
        rawInput,
        {
          ...toolUseContext,
          toolUseId,
        },
        canUseTool,
        parentMessage,
      )
    ).remoteOrigin;
    if (remoteOrigin.isError || !isRanOutcome(remoteOrigin.disposition))
      return {
        kind: "error",
        message: `${unverifiedAnswerWithOutput(tool, remoteOrigin)}
${remoteResultText(remoteOrigin)}`,
        ...(isRanOutcome(remoteOrigin.disposition) && {
          ran: true,
        }),
      };
    return {
      kind: "value",
      value: describeReconnectResult(
        structuredOutputIfStructured(tool, remoteOrigin) ?? remoteResultText(remoteOrigin),
        remoteOrigin,
      ),
    };
  } catch (error) {
    if (error instanceof RemoteToolCallEnded) {
      if (isSessionDenialOutcome(error.outcome))
        toolUseContext.onPermissionDenial?.(tool, toolUseId, rawInput);
      return {
        kind: "error",
        message: cancelMessage(error.outcome, toolUseContext.abortController.signal),
        denialKind: denialKindOf_2(error.outcome),
      };
    }
    if (error instanceof AbortError || toolUseContext.abortController.signal.aborted) throw error;
    logError(error);
    return {
      kind: "error",
      message: failedInTransitMessage({
        name: route.host.name,
        detail: "internal error while forwarding",
      }),
    };
  }
}
//@ chunk-dtv8x2hx.js:100245-100273 placement
/**
 * 取远程结果的展示文本（对外导出的入口）。
 */
function remoteResultTextOf(e) {
  return remoteResultText(e);
}
//@ chunk-dtv8x2hx.js:100273-100361 placement
/**
 * 已运行且有信封时取内容文本，否则生成带说明的远程结果文本。
 */
function remoteResultText(remoteOrigin) {
  return isRanOutcome(remoteOrigin.disposition) && remoteOrigin.envelope === "present"
    ? contentToText(remoteOrigin.content)
    : remoteResultText_2(remoteOrigin, MAX_REMOTE_RESULT_CHARS);
}
//@ chunk-dtv8x2hx.js:100361-100373 placement
var MAX_REMOTE_RESULT_CHARS = 2000;
//@ chunk-dtv8x2hx.js:100373-100492 placement
function cancelMessage(outcome, signal) {
  switch (outcome.code) {
    case "cancelled":
      return getCancelMessage(signal);
    case "interrupted":
      return abortReasonToToolMessage(signal);
    default:
      return outcome.message;
  }
}
//@ chunk-dtv8x2hx.js:100492-100548 placement
/**
 * 把中断原因转成工具结果文案（回合中断或调用已结束）。
 */
function abortReasonToToolMessage(e) {
  return unwrapAbortReason(e.reason) === "turn-abort"
    ? TOOL_CALL_ENDED_FOR_DELIVERY
    : INTERRUPT_MESSAGE_FOR_TOOL_USE;
}
//@ chunk-dtv8x2hx.js:100548-101255 placement
function describeReconnectResult(e, remoteOrigin) {
  let { name: o, working_dir: workingDir } = remoteOrigin.host;
  let mapped = (remoteOrigin.notes ?? []).map((h) => sanitizeForPrompt(h, MAX_REMOTE_RESULT_CHARS));
  let mapped_2 = (remoteOrigin.sessionNotes ?? []).map((h) => h.text);
  let ranOn = workingDir === "" ? o : `${o}:${workingDir}`;
  let i = {
    ...(remoteOrigin.envelope === "present"
      ? {
          ran_on: ranOn,
          ...(remoteOrigin.permittedBy !== undefined && {
            permitted_by: approvalSourcePhrase(remoteOrigin.permittedBy),
          }),
        }
      : {
          answered_by: o,
          unverified: true,
        }),
    ...(remoteOrigin.delivery !== "fresh" && {
      not_rerun: true,
    }),
    ...(remoteOrigin.delivery === "after_reconnect" && {
      delivered_after_reconnect: true,
    }),
    ...(remoteOrigin.truncated && {
      truncated: true,
    }),
    ...(remoteOrigin.spilled !== undefined && {
      spilled_bytes: remoteOrigin.spilled.bytes,
    }),
    ...((remoteOrigin.cutHere === true ||
      (!(isRanOutcome(remoteOrigin.disposition) && remoteOrigin.envelope === "present") &&
        exceedsAnswerCharLimit(remoteOrigin))) && {
      cut_here: true,
    }),
    ...(mapped.length > 0 && {
      host_notes: mapped,
    }),
    ...(mapped_2.length > 0 && {
      session_notes: mapped_2,
    }),
  };
  return e !== null && typeof e === "object" && !Array.isArray(e)
    ? {
        ...e,
        ...i,
      }
    : {
        result: e,
        ...i,
      };
}
//@ chunk-dtv8x2hx.js:101255-101423 placement
function inputChangedByApproval(updatedInput, n, tool) {
  let r = updatedInput[HOST_TOOL_INPUT_FIELD];
  let s = r !== undefined && r !== null && (typeof r !== "string" || r.trim() !== n.host.name);
  let any = isRunInBackground(tool).some(
    (p) => Boolean(updatedInput[p]) && !isDeepStrictEqual(updatedInput[p], n.input[p]),
  );
  return s || any;
}
//@ chunk-dtv8x2hx.js:101423-101593 placement
function isRunInBackground(tool, host) {
  let toolRemoteExecution = getToolRemoteExecution(tool);
  let r = toolRemoteExecution.supported ? (toolRemoteExecution.refusedInputFields ?? []) : [];
  let s = host !== undefined && tool.name === BASH_TOOL_NAME && supportsBackgroundShells(host);
  return r.filter((u) => !SANDBOX_OVERRIDE_INPUT_KEYS.has(u) && !(s && u === "run_in_background"));
}
export {
  executeRemoteToolUse,
  handleRemoteCancel,
  createEarlyCheckRunner,
  createRemoteApprover,
  remoteResultTextOf,
};
