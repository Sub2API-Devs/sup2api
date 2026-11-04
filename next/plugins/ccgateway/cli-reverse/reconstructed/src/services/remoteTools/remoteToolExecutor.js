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
import { omitAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
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
  return async (request) => {
    let scopedAbort = new PromptScopedAbortController(toolUseContext.abortController);
    scopedAbort.signal.addEventListener(
      "abort",
      () => {
        if (!request.ended.aborted && !toolUseContext.abortController.signal.aborted)
          toolUseContext.abortController.abort(scopedAbort.signal.reason);
      },
      {
        once: true,
      },
    );
    if (request.ended.aborted) return withdrawnAskDecision(request);
    request.ended.addEventListener("abort", () => scopedAbort.abort(request.ended.reason), {
      once: true,
    });
    request.patience?.hold();
    let verdict = await classifyRemoteCall({
      tool,
      host,
      request,
      toolUseContext,
      toolUseId,
      messageId: parentMessage.message.id,
      honourHostAllowRules,
      speculation,
    });
    if (verdict.kind === "allow")
      return {
        decision: "allow",
        decidedBy: "classifier",
      };
    if (verdict.kind === "block")
      return {
        decision: "deny",
        feedback: "blocked by the session's auto-mode classifier",
        insteadOfRejection: {
          message: verdict.message,
          denialKind: verdict.denialKind,
        },
      };
    let whereText = `runs on ${request.host.name}`;
    let askInput =
      tool.isMcp === true
        ? {
            ...request.input,
          }
        : {
            ...request.input,
            [HOST_TOOL_INPUT_FIELD]: request.host.name,
          };
    let askMessage = `(${whereText}) ${truncateAtSentence(request.message)}`;
    let hostAllowRules = buildHostAllowRules(tool, request);
    let forcedAsk = {
      behavior: "ask",
      message: askMessage,
      decisionReason: {
        type: "other",
        reason: askMessage,
      },
      ...(hostAllowRules === undefined
        ? {
            suppressAlwaysAllowRule: true,
          }
        : {
            suggestions: [hostAllowRules],
          }),
      forcedByCaller: true,
      askPatience: request.patience,
      askEnded: request.askEnded,
      ...(request.pendingBeforeRestart === true && {
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
              : `${request.host.name} asked for approval, and this context cannot show a permission prompt; the call did not run.`,
          denialKind: "permission-rule",
        },
      };
    let toolForAsk =
      tool.isMcp === true
        ? {
            ...tool,
            suppressesAllPermissionUpdates: () => true,
          }
        : tool;
    let inherited =
      request.pendingBeforeRestart === true && !request.ended.aborted
        ? await toolUseContext.toolState.get(ServedCallRegistry).takeInheritedAnswer(toolUseId)?.({
            input: askInput,
            planMode: () => getToolPermissionContext(toolUseContext).mode === "plan",
          })
        : undefined;
    if (request.ended.aborted) return withdrawnAskDecision(request);
    request.patience?.resume();
    let standingRow =
      hostAllowRules === undefined
        ? "withheld"
        : hostAllowRules.destination === "session"
          ? "offered_prefix"
          : "offered_exact";
    request.noteCard({
      standingRow,
      chosen: false,
    });
    let raisedInPlanMode =
      inherited === undefined && getToolPermissionContext(toolUseContext).mode === "plan";
    let releasePark = parkOnUser();
    let decision;
    try {
      if (inherited === undefined)
        decision = await canUseTool(
          toolForAsk,
          askInput,
          {
            ...toolUseContext,
            abortController: scopedAbort,
          },
          parentMessage,
          toolUseId,
          forcedAsk,
        );
      else {
        let hookOutcome;
        try {
          hookOutcome =
            inherited.result.behavior === "deny"
              ? undefined
              : await executePermissionRequestHooksForSDK(
                  inherited.answers,
                  toolForAsk,
                  toolUseId,
                  askInput,
                  {
                    ...toolUseContext,
                    abortController: scopedAbort,
                  },
                  hostAllowRules === undefined ? undefined : [hostAllowRules],
                  {
                    suppressAlwaysAllowRule: hostAllowRules === undefined,
                  },
                  () => true,
                );
        } catch (error) {
          if (request.ended.aborted) return withdrawnAskDecision(request);
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
              message: `A PermissionRequest hook failed before the approval given earlier could be applied; the ${tool.name} call did not run on ${request.host.name}.`,
              denialKind: "permission-rule",
            },
          };
        }
        if (hookOutcome !== undefined && hookOutcome.decision.behavior !== "allow") {
          if (hookOutcome.interrupt) turnAbortControllerOf(toolUseContext.abortController).abort();
          decision = hookOutcome.decision;
        } else
          decision = permissionPromptToolResultToPermissionDecision(
            inherited.answers,
            inherited.result,
            toolForAsk,
            askInput,
            {
              ...toolUseContext,
              abortController: scopedAbort,
            },
            toolForAsk,
            hostAllowRules === undefined,
            false,
          );
      }
    } finally {
      releasePark();
    }
    if (decision.behavior === "allow") {
      let toolResult =
        decision.decisionReason?.type === "permissionPromptTool"
          ? permissionPromptResultSchemaRefusing().safeParse(decision.decisionReason.toolResult).data
          : undefined;
      request.noteCard({
        standingRow,
        chosen:
          hostAllowRules !== undefined &&
          toolResult?.behavior === "allow" &&
          toolResult.updatedPermissions?.some(
            (updatedPermission) =>
              updatedPermission.type === "addRules" && updatedPermission.behavior === "allow",
          ) === true,
      });
      let updatedInput = decision.updatedInput ?? {};
      if (inputChangedByApproval(updatedInput, request, tool))
        return {
          decision: "deny",
          feedback: `the approval edited the call in a way that cannot apply on ${request.host.name} \u2014 nothing ran`,
          insteadOfRejection: {
            message: `The approval given in this session edited the ${tool.name} call in a way ${request.host.name} cannot honour (it named a different machine, or newly set a privileged field this session does not pass on in an edit); nothing ran.`,
            denialKind: "permission-rule",
          },
        };
      let excludedKeys = [HOST_TOOL_INPUT_FIELD, ...isRunInBackground(tool, host)];
      let editedInput = omitAlias(updatedInput, excludedKeys);
      let inputChanged =
        Object.keys(editedInput).length > 0 &&
        !isDeepStrictEqual(editedInput, omitAlias(request.input, excludedKeys));
      return {
        decision: "allow",
        decidedBy:
          decision.decisionReason?.type === "hook"
            ? "hook"
            : decision.decisionReason?.type === "permissionPromptTool"
              ? "host_prompt"
              : "prompt",
        raisedInPlanMode,
        ...(inputChanged && {
          updatedInput: editedInput,
        }),
        ...(decision.acceptFeedback !== undefined && {
          feedback: decision.acceptFeedback,
        }),
      };
    }
    if (decision.behavior === "deny" && decision.decisionReason?.type === "hook")
      return {
        decision: "deny",
        insteadOfRejection: {
          message: decision.message,
          denialKind: "permission-rule",
        },
      };
    if (isSameDecision(decision, forcedAsk))
      return {
        decision: "deny",
        insteadOfRejection: {
          message: `${request.host.name} asked before running this call and this session had no way to put the question to anyone; the call was not run. Ask the user how to proceed rather than retrying.`,
          denialKind: "permission-rule",
        },
      };
    let feedback =
      decision.behavior === "ask"
        ? trimmedOrUndefined(decision.userFeedback)
        : usesPermissionPromptTool(decision);
    if (
      decision.behavior === "deny" &&
      decision.decisionReason?.type === "other" &&
      isCanUseToolFailureReason(decision.decisionReason.reason)
    )
      return {
        decision: "unanswerable",
        message: decision.message,
      };
    if (decision.behavior === "deny" && feedback === undefined && decision.decisionReason?.type === "other")
      return {
        decision: "deny",
        insteadOfRejection: {
          message: decision.message,
          denialKind: "permission-rule",
        },
      };
    return {
      decision: "deny",
      ...(feedback !== undefined && {
        feedback,
      }),
    };
  };
}
//@ chunk-dtv8x2hx.js:86035-86119 placement
/**
 * 判断该权限模式是否算「已授权」：自动分类器生效或 bypassPermissions（plan 需开关）。
 */
function modeAllowsClassifierBypass(mode) {
  if (mode === "plan" && !isPlanClassifierArmOn()) return false;
  return isAutoClassifierActive(mode) || mode === "bypassPermissions";
}
//@ chunk-dtv8x2hx.js:86119-86403 placement
function hostRulesContext(request, honourAllow) {
  let hostRules = request.hostRules;
  if (hostRules === undefined) return;
  let rules = {
    host: request.host.name,
    allow: honourAllow ? (hostRules.allow ?? []) : [],
    softDeny: hostRules.soft_deny ?? [],
    hardDeny: hostRules.hard_deny ?? [],
    environment: honourAllow ? (hostRules.environment ?? []) : [],
  };
  return [rules.allow, rules.softDeny, rules.hardDeny, rules.environment].some((list) => list.length > 0)
    ? {
        hostRules: rules,
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
  let askRequest = {
    host: request.host,
    spelledDirectory: displayWorkingDir(leaseOfMachine(host).working_dir),
    input: request.input,
    message: request.message,
    decisionReason: request.decisionReason,
    hostRules: request.hostRules,
  };
  let now = Date.now();
  let ruleCounts = {
    host_rules_hard_deny: request.hostRules?.hard_deny?.length ?? 0,
    host_rules_soft_deny: request.hostRules?.soft_deny?.length ?? 0,
    host_rules_environment: request.hostRules?.environment?.length ?? 0,
    host_rules_allow: request.hostRules?.allow?.length ?? 0,
    host_rules_allow_honoured: honourHostAllowRules,
  };
  let speculationState;
  let usedSpeculation = false;
  let speculationFlags = speculationFields(speculation !== undefined, undefined, undefined);
  using turnSlot = new CommitTurnSlot();
  try {
    speculationState = speculation?.claim();
    let discardReason =
      speculationState === undefined
        ? undefined
        : describeAskChange(speculationState, askRequest, tool, toolUseContext, toolPermissionContext);
    speculationFlags = speculationFields(speculation !== undefined, speculationState, discardReason);
    if (speculation !== undefined)
      toolUseContext.toolState.get(RemoteAskMemory).remember(request.host.name, tool.name, askRequest);
    if (speculationState !== undefined && discardReason !== undefined) {
      speculation?.discard();
      speculationState.run.leaveRecordToRerun();
      forgetClassifierContext(toolUseId);
      logSpeculationUsage({
        reason: discardReason,
        early: speculationState,
        stepReportsTheDrop: true,
        toolUseContext,
        toolUseId,
      });
    }
    usedSpeculation = speculationState !== undefined && discardReason === undefined;
    let askRun =
      speculationState !== undefined && discardReason === undefined
        ? speculationState.run
        : formatRemoteAskReason({
            tool,
            request: askRequest,
            toolUseContext,
            toolUseId,
            honourHostAllowRules,
            signal: toolUseContext.abortController.signal,
            commitTurn: turnSlot,
            startedAhead: false,
            rerunOfStoppedCall: speculationState !== undefined,
          });
    if (usedSpeculation) resetClassifierCache(toolUseContext, askRequest, honourHostAllowRules, turnSlot);
    let classifierResult = await askRun.result;
    let queueStats = askRun.queueStats();
    let queueCommitWaitMs;
    let commitWait = isCountedClassifierBlock(classifierResult) ? turnSlot.reached() : undefined;
    if (commitWait !== undefined) {
      let now = Date.now();
      await commitWait;
      queueCommitWaitMs = Date.now() - now;
    }
    let toolPermissionContext_2 = getToolPermissionContext(toolUseContext);
    let modeLeft =
      !modeAllowsClassifierBypass(toolPermissionContext_2.mode) ||
      toolPermissionContext_2.mode !== toolPermissionContext.mode ||
      (toolPermissionContext_2.mode === "plan" && !isAutoModeCapableHost(host));
    let askLevelRaised = isAskOnMutationTool(tool.name, toolUseContext.getProactivityLevel());
    let decision =
      modeLeft ||
      askLevelRaised ||
      classifierResult.unavailable ||
      classifierResult.transcriptTooLong ||
      classifierResult.refusedBySafeguard ||
      classifierResult.failureMode !== undefined
        ? "no_verdict"
        : classifierResult.shouldBlock
          ? "block"
          : isChainOnAllowActive()
            ? "no_verdict"
            : "allow";
    let cause = modeLeft
      ? "mode_left"
      : askLevelRaised
        ? "ask_level_raised"
        : classifierResult.transcriptTooLong
          ? "too_long"
          : classifierResult.refusedBySafeguard
            ? "refused"
            : classifierResult.unavailable
              ? "unavailable"
              : classifierResult.failureMode !== undefined
                ? "unparseable"
                : !classifierResult.shouldBlock && isChainOnAllowActive()
                  ? "chain_on_allow"
                  : "verdict";
    logEvent("tengu_remote_tool_classifier", {
      decision: fromEnum(decision),
      cause: fromEnum(cause),
      headless: toolPermissionContext_2.shouldAvoidPermissionPrompts === true,
      duration_ms: Date.now() - now,
      tool_use_id: sanitizeMarkName(toolUseId),
      ...ruleCounts,
      ...(queueStats?.overlap !== undefined && {
        queue_depth: queueStats.queueDepth,
        queue_wait_ms: queueStats.queueWaitMs,
        queue_overlap_enabled: true,
        queue_in_flight_at_start: queueStats.overlap.inFlightAtStart,
        queue_overlapped: queueStats.overlap.overlapped,
        queue_released_by_escalation: queueStats.overlap.releasedByEscalation,
        queue_commit_wait_ms: queueCommitWaitMs,
      }),
      ...speculationFlags,
      ...classifierUsageFields(classifierResult),
    });
    if (toolUseContext.abortController.signal.aborted) throw new AbortError();
    if (decision === "allow") {
      turnSlot.runInTurn(() => recordAutoModeSuccess(toolUseContext));
      return {
        kind: "allow",
      };
    }
    if (decision === "block") {
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
        message: buildYoloRejectionMessage(classifierResult.reason, {
          autoModeConsentFlow: isAutoModeConsentFlowEnabled(toolUseContext.agentId),
          blockedHelp: autoModeBlockedHelp(toolUseContext.agentId),
        }),
        denialKind: "automode-blocked",
      };
    }
    if (modeLeft || askLevelRaised)
      return {
        kind: "no_verdict",
      };
    let shouldAvoidPermissionPrompts = toolPermissionContext_2.shouldAvoidPermissionPrompts;
    if (classifierResult.transcriptTooLong) {
      if (shouldAvoidPermissionPrompts)
        throw new AbortError(
          "Agent aborted: auto mode classifier transcript exceeded context window in headless mode",
        );
      return {
        kind: "no_verdict",
      };
    }
    if (classifierResult.refusedBySafeguard) {
      if (shouldAvoidPermissionPrompts)
        throw new AbortError(
          "Agent aborted: auto mode classifier request refused by the safety safeguard in headless mode",
        );
      return {
        kind: "block",
        message: buildClassifierRefusedOrTransientGuidance(classifierResult.reason, {
          refused: true,
        }),
        denialKind: "automode-unavailable",
      };
    }
    if (classifierResult.unavailable)
      return {
        kind: "block",
        message: buildClassifierUnavailableMessage(
          tool.name,
          classifierResult.model,
          classifierResult.httpStatus,
          classifierResult.errorKind,
          classifierResult.retryAfterMs,
        ),
        denialKind: "automode-unavailable",
      };
    if (classifierResult.failureMode !== undefined) {
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
        message: buildClassifierRefusedOrTransientGuidance(classifierResult.reason, {
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
      ...ruleCounts,
      ...speculationFlags,
    });
    return {
      kind: "no_verdict",
    };
  } finally {
    if (speculationState !== undefined && !usedSpeculation) speculation?.discard();
  }
}
//@ chunk-dtv8x2hx.js:90201-90408 placement
function speculationFields(speculated, speculationState, discardReason) {
  if (!speculated) return {};
  return speculationState === undefined
    ? {
        speculative: false,
      }
    : {
        speculative: true,
        speculative_used: discardReason === undefined,
        speculative_discard_reason: fromEnumOpt(discardReason),
        speculative_lead_ms: speculationState.leadMs,
        speculative_ready_ms: speculationState.readyMs,
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
  let context = {
    reason,
    early,
    toolUseContext,
    toolUseId,
  };
  if (!stepReportsTheDrop && early.settled) {
    early.run.result
      .then(
        (classification) =>
          logRemoteToolClassifier(context, "speculation_unused", classifierUsageFields(classification)),
        () => logRemoteToolClassifier(context, "speculation_unused", {}),
      )
      .catch(() => {});
    return;
  }
  if (!stepReportsTheDrop) logRemoteToolClassifier(context, "speculation_unused", {});
  early.run.result
    .then((classification) => {
      if (classification.usage !== undefined)
        logRemoteToolClassifier(context, "speculation_usage", classifierUsageFields(classification));
    })
    .catch(() => {});
}
//@ chunk-dtv8x2hx.js:91477-91889 placement
function logRemoteToolClassifier({ reason, early, toolUseContext, toolUseId }, cause, extraFields) {
  logEvent("tengu_remote_tool_classifier", {
    decision: fromEnum("no_verdict"),
    cause: fromEnum(cause),
    headless: getToolPermissionContext(toolUseContext).shouldAvoidPermissionPrompts === true,
    duration_ms: early.leadMs,
    tool_use_id: sanitizeMarkName(toolUseId),
    speculative: true,
    speculative_used: false,
    speculative_discard_reason: fromEnum(reason),
    speculative_settled: cause === "speculation_usage" || early.settled,
    speculative_lead_ms: early.leadMs,
    speculative_ready_ms: early.readyMs,
    ...extraFields,
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
function classifierTranscript(tool, toolUseContext) {
  let isSubagentLoop = isModelDrivenSession(toolUseContext.agentId);
  let prepared = prependInheritedVerifiedTurns(
    toolUseContext.messages,
    toolUseContext.inheritedVerifiedHumanTurns,
    isSubagentLoop,
  );
  return {
    messages: [...prepared.messages, ...(toolUseContext.sameTurnToolUses ?? [])],
    isSubagentLoop,
    inheritedPrefix: prepared.inheritedPrefix,
    registry: toolUseContext.options.tools.some((tool_2) => toolMatchesName(tool_2, tool.name))
      ? toolUseContext.options.tools
      : [...toolUseContext.options.tools, tool],
  };
}
//@ chunk-dtv8x2hx.js:92294-92399 placement
function classifierCacheKey(request, honourAllow, commitTurn) {
  let hostCtx = hostRulesContext(request, honourAllow);
  return {
    ...(commitTurn !== undefined && {
      commitTurn,
    }),
    ...(hostCtx !== undefined && {
      cachePrefix: jsonStringify(hostCtx),
    }),
  };
}
//@ chunk-dtv8x2hx.js:92399-92482 placement
/**
 * 以当前分类器缓存键重置分类器缓存（实际不等待任何工作）。
 */
function resetClassifierCache(toolUseContext, request, honourAllow, commitTurn) {
  enqueueClassifierRequest(
    toolUseContext.agentId ?? "main",
    () => Promise.resolve(),
    undefined,
    classifierCacheKey(request, honourAllow, commitTurn),
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
  let reasonText = truncateToLength(
    `${request.message}${request.decisionReason === undefined ? "" : ` [${request.decisionReason}]`}`,
    MAX_ASK_REASON_CHARS,
  );
  let hostReason = `runs on ${request.host.name} (another machine, not this one) in ${request.spelledDirectory}; that machine's Claude Code gave this reason for asking (its words, unverified): "${reasonText}"`;
  let command = request.input.command;
  let toolNameForPermissionCheck = getToolNameForPermissionCheck(tool);
  let action = formatActionForClassifier(
    tool.name,
    rememberHostContext(
      {
        ...request.input,
        [HOST_TOOL_INPUT_FIELD]: request.host.name,
        ...(toolNameForPermissionCheck && {
          [HOST_CONTEXT_META_FIELD]: hostReason,
        }),
        ...(typeof command === "string" && {
          command: `# ${hostReason}
${command}`,
        }),
      },
      hostReason,
    ),
    toolUseId,
  );
  let { messages, registry, isSubagentLoop, inheritedPrefix } = classifierTranscript(tool, toolUseContext);
  let sessionId = pinSessionId(getSessionId());
  let ranUnder;
  let queueStats;
  let keepRecord = false;
  return {
    messages,
    registry,
    enqueuedInMode: getToolPermissionContext(toolUseContext).mode,
    ranUnder: () => ranUnder,
    queueStats: () => queueStats,
    leaveRecordToRerun: () => {
      keepRecord = true;
    },
    result: enqueueClassifierRequest(
      toolUseContext.agentId ?? "main",
      (queueProgress) => {
        if (startedAhead && signal.aborted) throw new AbortError();
        if (rerunOfStoppedCall) forgetClassifierContext(toolUseId);
        ranUnder = getToolPermissionContext(toolUseContext);
        let classification = classifyYoloAction(messages, action, registry, ranUnder, signal, {
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
          ? classification.finally(() => {
              if (signal.aborted && !keepRecord) forgetClassifierContext(toolUseId);
            })
          : classification;
      },
      (stats) => {
        queueStats = stats;
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
      let recalled = toolUseContext.toolState.get(RemoteAskMemory).recall(call.host.name, tool.name);
      let runsInBackground = isRunInBackground(tool, host);
      if (
        recalled === undefined ||
        !shouldClassifyRemotely(tool, host, toolUseContext, getToolPermissionContext(toolUseContext).mode) ||
        unsupportedFieldRefusal(call.input, runsInBackground, call.host.name) !== undefined
      )
        return;
      let predicted = {
        host: call.host,
        spelledDirectory: displayWorkingDir(leaseOfMachine(host).working_dir),
        input: withoutEditKeys(call.input, runsInBackground),
        ...recalled,
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
function describeAskChange(speculation, askRequest, tool, toolUseContext, toolPermissionContext) {
  if (!isDeepStrictEqual(speculation.predicted.input, askRequest.input)) return "input_changed";
  if (!isDeepStrictEqual(speculation.predicted, askRequest)) return "ask_changed";
  let ranUnder = speculation.run.ranUnder();
  let transcript = classifierTranscript(tool, toolUseContext);
  if (
    speculation.run.enqueuedInMode !== toolPermissionContext.mode ||
    (ranUnder !== undefined && !isDeepStrictEqual(ranUnder, toolPermissionContext)) ||
    !sameSequence(speculation.run.messages, transcript.messages) ||
    !sameSequence(speculation.run.registry, transcript.registry)
  )
    return "context_changed";
  return speculation.leadMs > ASK_LEAD_STALE_MS ? "stale" : undefined;
}
//@ chunk-dtv8x2hx.js:94656-94726 placement
/**
 * 判断两个数组是否逐项相等（用于检测上下文是否变化）。
 */
function sameSequence(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
//@ chunk-dtv8x2hx.js:94726-94737 placement
var MAX_ASK_REASON_CHARS = 300;
//@ chunk-dtv8x2hx.js:94737-94934 placement
function usesPermissionPromptTool(decision) {
  let text = decision.message.trim();
  for (let prefix of [REJECT_MESSAGE_WITH_REASON_PREFIX, SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX])
    if (text.startsWith(prefix.trim())) return trimmedOrUndefined(text.slice(prefix.trim().length));
  return decision.decisionReason?.type === "permissionPromptTool" && text !== USER_DENIED_PERMISSION_MESSAGE
    ? trimmedOrUndefined(text)
    : undefined;
}
//@ chunk-dtv8x2hx.js:94934-94992 placement
/**
 * 去掉字符串首尾空白，空串返回 undefined。
 */
function trimmedOrUndefined(text) {
  let trimmed = text?.trim() ?? "";
  return trimmed === "" ? undefined : trimmed;
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
    let registry = toolUseContext.toolState.get(ServedCallRegistry);
    let adopted = registry.adopted(toolUse.id);
    if (adopted !== undefined) {
      registry.takeAdopted(toolUse.id);
      registry.remove(toolUse.id);
      logEvent("tengu_remote_tool_restart_adoption_unroutable", {
        where: lit("route_error"),
        route_code: fromEnum(route.code),
        parked_at_restart: adopted.parkedAtRestart === true,
      });
    }
    let message =
      adopted === undefined
        ? route.message
        : restartNoticeFor(
            {
              host: adopted.host,
            },
            adopted,
          );
    if (adopted !== undefined && !adopted.parkedAtRestart && !toolUseContext.abortController.signal.aborted)
      try {
        let input = toolUse.input;
        toolUseContext.toolState.get(RemoteCallLedger).gaveUp({
          callId: toolUse.id,
          agentId: toolUseContext.agentId,
          hostName: adopted.host,
          toolName: tool.name,
          wireToolName: tool.mcpInfo?.toolName ?? tool.name,
          spelled: primaryInputPath(typeof input === "object" && input !== null ? input : {}),
          toldAs: "delivery_unknown",
          machineHadCall: false,
          transport: undefined,
          dispatchEpoch: adopted.host_epoch,
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
            content: [toolUseErrorResult(message, toolUse.id)],
            toolUseResult: `Error: ${message}`,
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
    let events = new Stream();
    let stopHeartbeat = toolUseContext.agentId
      ? () => {}
      : emitToolHeartbeat({
          toolName: tool.name,
          toolUseID: toolUse.id,
          abortSignal: toolUseContext.abortController.signal,
          onProgress: (event) => {
            if (event.type === "progress")
              events.enqueue({
                message: createProgressMessage({
                  toolUseID: event.toolUseID,
                  parentToolUseID: event.parentToolUseID ?? toolUse.id,
                  data: event.data,
                  now,
                }),
              });
          },
        });
    startSessionActivity("tool_exec", REMOTE_TOOL_HOST);
    let call = handleRemoteBackgroundCommand(
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
        events.enqueue({
          type: "notification",
          notification: {
            key: `remote-tool-status-${toolUse.id}`,
            text,
            priority: "medium",
            timeoutMs,
          },
        }),
      (text) =>
        events.enqueue({
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
      stopHeartbeat();
      events.done();
    });
    call.catch(() => {});
    for await (let event of events) yield event;
    let result = await call;
    yield {
      message: await buildRemoteToolResultMessage({
        tool,
        origin: result.remoteOrigin,
        toolUseId: toolUse.id,
        assistantMessage,
        toolUseContext,
        now,
      }),
    };
    let disposition = result.remoteOrigin.disposition;
    let shellOutput = shellOutputShownAbove(tool, result.remoteOrigin);
    let completedLine = formatCompletedOnHost(tool, result.remoteOrigin);
    yield {
      message: createAttachmentMessage({
        type: "tool_host_result_lines",
        toolUseID: toolUse.id,
        host: machineLabelForMessage(result.remoteOrigin.host.name),
        lines: [
          ...(shellOutput ? [shellOutput] : []),
          ...(completedLine ? [completedLine] : []),
          ...formatTruncatedResult(tool, result.remoteOrigin),
        ],
        label: unverifiedAnswerWithOutput(tool, result.remoteOrigin),
        ...(result.remoteOrigin.envelope !== "present" && {
          unverified: true,
        }),
        ...(result.remoteOrigin.host.working_dir && {
          workingDir: result.remoteOrigin.host.working_dir,
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
  let content = await processToolResultBlock(
    buildRemoteToolResultBlock(tool, origin, toolUseId),
    tool,
    getOriginalCwd(toolUseContext.session),
    toolUseContext.storageV5,
  );
  let denialKind = denialKindOf(origin.disposition);
  return createUserMessage({
    content: [content],
    toolUseResult:
      toolUseContext.agentId &&
      !toolUseContext.preserveToolUseResults &&
      !tool.preserveToolUseResultInSubagents
        ? undefined
        : (remoteStructuredOutput(tool, origin) ?? remoteResultTextOf(origin)),
    ...(denialKind && {
      toolDenialKind: denialKind,
    }),
    toolDenialFromHost: denialKind !== undefined ? true : undefined,
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
      let text = abortReasonToToolMessage(signal);
      return createUserMessage({
        content: [
          {
            type: "tool_result",
            content: text,
            is_error: true,
            tool_use_id: toolUseId,
          },
        ],
        toolUseResult: text,
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
      let denialKind = denialKindOf_2(outcome);
      return createUserMessage({
        content: [toolUseErrorResult(outcome.message, toolUseId)],
        toolUseResult: `Error: ${outcome.message}`,
        ...(denialKind !== undefined && {
          toolDenialKind: denialKind,
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
function remoteResultTextOf(origin) {
  return remoteResultText(origin);
}
//@ chunk-dtv8x2hx.js:100273-100361 placement
/**
 * 已运行且有信封时取内容文本，否则生成带说明的远程结果文本。
 */
function remoteResultText(outcome) {
  return isRanOutcome(outcome.disposition) && outcome.envelope === "present"
    ? contentToText(outcome.content)
    : remoteResultText_2(outcome, MAX_REMOTE_RESULT_CHARS);
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
function abortReasonToToolMessage(signal) {
  return unwrapAbortReason(signal.reason) === "turn-abort"
    ? TOOL_CALL_ENDED_FOR_DELIVERY
    : INTERRUPT_MESSAGE_FOR_TOOL_USE;
}
//@ chunk-dtv8x2hx.js:100548-101255 placement
function describeReconnectResult(result, outcome) {
  let { name: hostName, working_dir: workingDir } = outcome.host;
  let mapped = (outcome.notes ?? []).map((note) => sanitizeForPrompt(note, MAX_REMOTE_RESULT_CHARS));
  let mapped_2 = (outcome.sessionNotes ?? []).map((note) => note.text);
  let ranOn = workingDir === "" ? hostName : `${hostName}:${workingDir}`;
  let fields = {
    ...(outcome.envelope === "present"
      ? {
          ran_on: ranOn,
          ...(outcome.permittedBy !== undefined && {
            permitted_by: approvalSourcePhrase(outcome.permittedBy),
          }),
        }
      : {
          answered_by: hostName,
          unverified: true,
        }),
    ...(outcome.delivery !== "fresh" && {
      not_rerun: true,
    }),
    ...(outcome.delivery === "after_reconnect" && {
      delivered_after_reconnect: true,
    }),
    ...(outcome.truncated && {
      truncated: true,
    }),
    ...(outcome.spilled !== undefined && {
      spilled_bytes: outcome.spilled.bytes,
    }),
    ...((outcome.cutHere === true ||
      (!(isRanOutcome(outcome.disposition) && outcome.envelope === "present") &&
        exceedsAnswerCharLimit(outcome))) && {
      cut_here: true,
    }),
    ...(mapped.length > 0 && {
      host_notes: mapped,
    }),
    ...(mapped_2.length > 0 && {
      session_notes: mapped_2,
    }),
  };
  return result !== null && typeof result === "object" && !Array.isArray(result)
    ? {
        ...result,
        ...fields,
      }
    : {
        result,
        ...fields,
      };
}
//@ chunk-dtv8x2hx.js:101255-101423 placement
function inputChangedByApproval(updatedInput, request, tool) {
  let target = updatedInput[HOST_TOOL_INPUT_FIELD];
  let targetChanged =
    target !== undefined &&
    target !== null &&
    (typeof target !== "string" || target.trim() !== request.host.name);
  let any = isRunInBackground(tool).some(
    (key) => Boolean(updatedInput[key]) && !isDeepStrictEqual(updatedInput[key], request.input[key]),
  );
  return targetChanged || any;
}
//@ chunk-dtv8x2hx.js:101423-101593 placement
function isRunInBackground(tool, server) {
  let toolRemoteExecution = getToolRemoteExecution(tool);
  let refusedFields = toolRemoteExecution.supported ? (toolRemoteExecution.refusedInputFields ?? []) : [];
  let backgroundSupported =
    server !== undefined && tool.name === BASH_TOOL_NAME && supportsBackgroundShells(server);
  return refusedFields.filter(
    (key) => !SANDBOX_OVERRIDE_INPUT_KEYS.has(key) && !(backgroundSupported && key === "run_in_background"),
  );
}
export {
  executeRemoteToolUse,
  handleRemoteCancel,
  createEarlyCheckRunner,
  createRemoteApprover,
  remoteResultTextOf,
};
