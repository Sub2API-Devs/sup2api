/**
 * query/refusalRecovery.ts
 *
 * 2.1.316 新增：处理模型拒绝：压缩、同模型重试或切换模型；询问用户是否在拒绝时自动切换模型并保存设置等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-frs14hy1.js (6), chunk-w3ch4xq2.js (11)
 * attribution: placement 15, layout 2
 */
import { classifyQuerySource, isMainQuerySource } from "../services/api/requestHeaders.js";
import { env } from "../utils/env.js";
import { logError } from "../utils/log.js";
import { logEvent } from "../services/analytics/index.js";
import { telemetrySafeModelName } from "../utils/model/telemetryModelName.js";
import { sanitizeMarkName } from "../utils/startupMarks.js";
import { fromEnumOpt, fromEnum, lit } from "../services/analytics/safeMetadata.js";
import { normalizeRefusalCategory } from "../services/api/refusalFallback.js";
import { agentTypeForTelemetry } from "../services/analytics/metadata.js";
import {
  createInformationalSystemMessage,
  SAFETY_CLASSIFIER_STOPPED_WITH_INTERRUPT_TEXT,
  SAFETY_CLASSIFIER_STOPPED_TEXT,
  SYNTHETIC_MODEL,
} from "../utils/messages.js";
import { renderModelName } from "../utils/model/modelDisplay.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import {
  shouldAutoCompactForTurn,
  hasUsageAnchor,
  serverClearedTokens,
  getAutoCompactThresholdTokens,
  getAutoCompactWindow,
  calculateTokenWarningState,
} from "../services/compact/autoCompact.js";
import {
  parsePromptTooLongTokenCounts,
  isPromptTooLongMessage_2,
  isLongContextCreditsRequiredMessage,
} from "../services/api/errors.js";
import { roughTokenCountEstimationForMessages } from "../services/tokenEstimation.js";
import {
  MAX_OUTPUT_TOKENS_CAP,
  MAX_WINDOW_TOKENS,
  windowSource,
} from "../services/compact/autoCompactWindow.js";
import { countNonProgressMessages } from "../services/compact/compact.js";
import { loadCleanupHelpers } from "../services/compact/postCompactCleanup.js";
import { TENGU_MODULAR_SEAL, TENGU_MODULAR_SEAL_2 } from "./turnEndReasons.js";
import { requestPrefixStats } from "../services/api/logging.js";
import { getEffectiveContextWindow } from "../entrypoints/sdk/coreSchemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { withTelemetryMessage, toError } from "../utils/errors.js";
import { unwrapAbortReason } from "../utils/abortController.js";
import { isCompactBoundaryMessage } from "../services/projects/threadRows.js";
import { SECONDARY_CONTEXT_WINDOW } from "../utils/model/model.js";
import { isOver1mThreshold } from "../utils/model/configs.js";
import {
  getSdkBetas,
  getTeammateAgentId,
  getIsNonInteractiveSession,
  getSdkSupportedDialogKinds,
} from "../bootstrap/state.js";
import { canReactiveCompact } from "../services/compact/reactiveCompact.js";
import { isLinkedRoseEnabled } from "../services/compact/compactSettings.js";
import { tokenCountFromLastAPIResponse } from "../utils/tokens.js";
import { canResumeThinkingOnModel } from "./turnHooks.js";
import { resolveSetting } from "../utils/settings/userIntentSettings.js";
import { getEnabledSettingSources } from "../utils/settings/constants.js";
import { isHeadlessHostEntrypoint } from "../utils/entrypointKinds.js";
import { isUnattendedBgSession } from "../utils/concurrentSessions.js";
import { canPromptForConfirmation, confirmWithUser } from "../utils/permissions/confirmWithUser.js";
import {
  TENGU_JAZZY_GOBLET,
  getSafeguardLead,
  FALLBACK_PREFERENCE_LABELS,
  setSwitchModelsOnFlag,
} from "../services/api/safeguardMessages.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { logForDebugging } from "../utils/debug.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-frs14hy1.js:7975-8228 placement
var TOOL_NOT_RUN_AFTER_REFUSAL =
  "Not run: the response that made this tool call was stopped by a safety classifier.";
var TOOL_INTERRUPTED_BY_REFUSAL =
  "Interrupted: the response that made this tool call was stopped by a safety classifier while the call was running; it may have partially or fully completed.";
//@ chunk-frs14hy1.js:8228-8343 placement
/**
 * 判断拒答后是否应重试：未重试过、非辅助查询且未通过环境变量禁用。
 */
function shouldRetryRefusal(querySource, refusalRetrySpent) {
  try {
    return (
      !refusalRetrySpent &&
      classifyQuerySource(querySource) !== "auxiliary" &&
      !env.CLAUDE_CODE_DISABLE_REFUSAL_RETRY
    );
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-frs14hy1.js:8343-8410 layout
function shouldRetryRefusalNow(querySource, retryRefusal) {
  return retryRefusal || (querySource === "resume_cache_warm" && shouldRetryRefusal("sdk", false));
}
//@ chunk-frs14hy1.js:8410-8516 placement
/**
 * 判断消息是否为 stop_reason 为 refusal 的 API 错误消息。
 */
function isRefusalErrorMessage(message) {
  return (
    message?.type === "assistant" &&
    message.isApiErrorMessage === true &&
    message.message.stop_reason === "refusal"
  );
}
//@ chunk-frs14hy1.js:8516-9716 placement
/**
 * 为被拒绝回合中未回答的工具调用生成结果。
 */
function synthesizeRefusedToolResults({
  refused,
  kept,
  answered,
  started,
  model,
  querySource,
  queryChainId,
  queryDepth,
  deps,
  makeUserMessage,
}) {
  let answeredIds = new Set(
    answered.flatMap((message) =>
      message.type === "user" && Array.isArray(message.message.content)
        ? message.message.content.flatMap((block) =>
            block.type === "tool_result" ? [block.tool_use_id] : [],
          )
        : [],
    ),
  );
  let startedIds = new Set(started);
  let interruptedCount = 0;
  let flattened = kept.flatMap((message) =>
    message.message.content.flatMap((block) => {
      if (block.type !== "tool_use" || answeredIds.has(block.id)) return [];
      let wasStarted = startedIds.has(block.id);
      if (wasStarted) interruptedCount++;
      let resultText = wasStarted ? TOOL_INTERRUPTED_BY_REFUSAL : TOOL_NOT_RUN_AFTER_REFUSAL;
      return [
        makeUserMessage({
          content: [
            {
              type: "tool_result",
              tool_use_id: block.id,
              is_error: true,
              content: resultText,
            },
          ],
          toolUseResult: resultText,
          toolDenialKind: wasStarted ? "interrupted" : "cancelled",
          sourceToolAssistantUUID: message.uuid,
          now: deps.now,
          uuidFn: deps.uuid,
        }),
      ];
    }),
  );
  try {
    let category = refused.message.stop_details?.category;
    logEvent("tengu_refusal_same_model_retry", {
      model: telemetrySafeModelName(model),
      request_id: sanitizeMarkName(refused.requestId),
      api_refusal_category: fromEnumOpt(category ? normalizeRefusalCategory(category) : undefined),
      queryChainId,
      queryDepth,
      querySource: agentTypeForTelemetry(querySource),
      tool_calls_not_run: flattened.length - interruptedCount,
      tool_calls_interrupted: interruptedCount,
      tool_calls_already_finished: answeredIds.size,
    });
  } catch (error) {
    logError(error);
  }
  return {
    notRun: flattened,
    notice: createInformationalSystemMessage(
      `${renderModelName(model)}'s safeguards stopped the response above \xB7 continuing once with that noted`,
      "notice",
    ),
    nudge: makeUserMessage({
      content:
        interruptedCount > 0 ? SAFETY_CLASSIFIER_STOPPED_WITH_INTERRUPT_TEXT : SAFETY_CLASSIFIER_STOPPED_TEXT,
      isMeta: true,
      turnCompanion: true,
      refusedMessageId: refused.refusedMessageId,
      now: deps.now,
      uuidFn: deps.uuid,
    }),
  };
}
//@ chunk-frs14hy1.js:9716-10033 placement
/**
 * 上报拒绝后同模型重试的结果。
 */
function reportRefusalRetry({ sentOn, servedBy, lastMessage, withheldRecoverable }) {
  try {
    if (lastMessage?.isApiErrorMessage) {
      if (lastMessage !== withheldRecoverable)
        logFeatureBad(
          "refusal_same_model_retry",
          lastMessage.message.stop_reason === "refusal" ? "refused_again" : "api_error",
        );
    } else if (servedBy !== sentOn) logFeatureSad("refusal_same_model_retry", "served_by_fallback");
    else logFeatureOk("refusal_same_model_retry");
  } catch (error) {
    logError(error);
  }
}
//@ chunk-w3ch4xq2.js:117501-120527 placement
/**
 * 处理模型拒绝：压缩、同模型重试或切换模型。
 */
async function* recoverFromRefusal({
  autocompact,
  refusal,
  hasAttempted,
  loopTopOutcome,
  offPickedModel,
  messages,
  toolUseContext,
  facts,
  cacheSafeParams,
  querySource,
  tracking,
  snipTokensFreed,
  sentSystemPrompt,
  sentInlineTools,
}) {
  try {
    if (!shouldAutoCompactForTurn(querySource))
      return {
        result: null,
      };
    let { actualTokens, limitTokens } = parsePromptTooLongTokenCounts(refusal.errorDetails ?? "");
    let messagesEstimate = roughTokenCountEstimationForMessages(messages, facts.bytesPerToken);
    let roomAfterPrefix =
      actualTokens !== undefined && limitTokens !== undefined
        ? limitTokens - (actualTokens - messagesEstimate)
        : undefined;
    let futile = roomAfterPrefix !== undefined && roomAfterPrefix < MAX_OUTPUT_TOKENS_CAP;
    let { refusals, afterBoundary } = countRecentRefusals(messages);
    let unansweredCompaction = afterBoundary;
    let roundsInView = countNonProgressMessages(
      messages.filter((message) => !isSyntheticModelMessage(message)),
    ).length;
    let oneRound = roundsInView < 2;
    let cleanupHelpers = loadCleanupHelpers();
    let status = cleanupHelpers?.getTeleportCacheState().status;
    let lastDispatchFallback = cleanupHelpers?.getLastDispatchFallback();
    let relayStillOn =
      status === "active" &&
      lastDispatchFallback?.cause !== "model_mismatch" &&
      lastDispatchFallback?.httpStatus !== 400 &&
      lastDispatchFallback?.httpStatus !== 413;
    let skipReason = hasAttempted
      ? "prior_attempt"
      : toolUseContext.abortController.signal.aborted
        ? "aborted"
        : !isMainQuerySource(querySource) || toolUseContext.agentId !== undefined
          ? "not_main_thread"
          : loopTopOutcome !== "not_needed"
            ? "decided_at_loop_top"
            : offPickedModel
              ? "off_picked_model"
              : unansweredCompaction
                ? "unanswered_compaction"
                : refusals >= TENGU_MODULAR_SEAL
                  ? "repeated_refusals"
                  : oneRound
                    ? "one_round"
                    : relayStillOn
                      ? "relay_still_on"
                      : futile
                        ? "futile"
                        : undefined;
    let prefixStats = requestPrefixStats(
      sentSystemPrompt.map((text) => ({
        text,
      })),
      sentInlineTools?.map((sentInlineTool) => sentInlineTool.schema) ?? [],
      new Map(),
    );
    let telemetryBase = {
      skipReason: fromEnumOpt(skipReason),
      loopTopOutcome: fromEnum(loopTopOutcome),
      refusalsSinceReply: refusals,
      unansweredCompaction,
      oneRound,
      roundsInViewMax5: Math.min(roundsInView, 5),
      futile,
      roomAfterPrefixTokens: roomAfterPrefix,
      requestOffPickedModel: offPickedModel,
      relayStatus: fromEnumOpt(status),
      relayFallbackCause: fromEnumOpt(lastDispatchFallback?.cause),
      relayHttpStatus: lastDispatchFallback?.httpStatus,
      actualTokens,
      limitTokens,
      messagesEstimate,
      systemCharLength: prefixStats?.systemCharLength,
      toolsCharLength: prefixStats?.toolsCharLength,
      toolsCount: prefixStats?.toolsCount,
      bytesPerToken: facts.bytesPerToken,
      blockingLimitTokens: getEffectiveContextWindow(facts) - MAX_WINDOW_TOKENS,
      hadPromptUsage: hasUsageAnchor(messages),
      thresholdSource: fromEnum(windowSource(facts, toolUseContext.options.autoCompactWindow)),
      querySource: agentTypeForTelemetry(querySource),
      queryChainId: sanitizeMarkName(toolUseContext.queryTracking?.chainId),
      queryDepth: toolUseContext.queryTracking?.depth,
    };
    if (skipReason !== undefined) {
      logEvent("tengu_compact_after_prompt_too_long", {
        ...telemetryBase,
        outcome: lit("skipped"),
      });
      return {
        result: null,
      };
    }
    if (getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MODULAR_SEAL_2, false) !== true) {
      logEvent("tengu_compact_after_prompt_too_long", {
        ...telemetryBase,
        outcome: lit("flag_off"),
      });
      return {
        result: null,
      };
    }
    let startTime = performance.now();
    let compactOutcome;
    try {
      compactOutcome = yield* autocompact(
        messages,
        toolUseContext,
        facts,
        cacheSafeParams,
        querySource,
        tracking,
        snipTokensFreed,
        undefined,
        true,
      );
    } catch (error) {
      logError(withTelemetryMessage(toError(error), "compactAfterRefusal: the compaction threw"));
      compactOutcome = {
        kind: "threw",
      };
    }
    let failure =
      compactOutcome.kind === "failed"
        ? compactOutcome.compactFailure
        : compactOutcome.kind === "threw"
          ? {
              reason: "error",
              detail: "an internal error",
            }
          : undefined;
    let result = compactOutcome.kind === "compacted" ? compactOutcome.result : null;
    try {
      let recoveryTimedOut =
        unwrapAbortReason(toolUseContext.abortController.signal.reason) === "recovery-timeout";
      logEvent("tengu_compact_after_prompt_too_long", {
        ...telemetryBase,
        outcome: fromEnum(compactOutcome.kind),
        failureReason: fromEnumOpt(failure?.reason),
        recoveryTimedOut,
        preCompactTokenCount: result?.preCompactTokenCount,
        truePostCompactTokenCount: result?.truePostCompactTokenCount,
        ptlAttempts: result?.ptlAttempts,
        promptCacheSharingEnabled: result?.promptCacheSharingEnabled,
        durationMs: Math.round(performance.now() - startTime),
      });
      if (result) logFeatureOk("compact_after_prompt_too_long");
      else if (recoveryTimedOut) logFeatureBad("compact_after_prompt_too_long", "recovery_timeout");
      else if (failure?.reason === "aborted") logFeatureSad("compact_after_prompt_too_long", failure.reason);
      else logFeatureBad("compact_after_prompt_too_long", failure?.reason ?? compactOutcome.kind);
    } catch (error) {
      logError(withTelemetryMessage(toError(error), "compactAfterRefusal: logging the outcome threw"));
    }
    return {
      result,
      failure,
    };
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "compactAfterRefusal: threw before the compaction"));
    return {
      result: null,
    };
  }
}
//@ chunk-w3ch4xq2.js:120527-120892 placement
/**
 * 统计最近的拒绝次数（是否在压缩边界后）。
 */
function countRecentRefusals(messages) {
  let refusals = 0;
  let preservedMessages = messages.findLast(isCompactBoundaryMessage)?.compactMetadata?.preservedMessages;
  let preservedUuids = new Set(preservedMessages?.allUuids ?? preservedMessages?.uuids);
  for (let j = messages.length - 1; j >= 0; j--) {
    let message = messages[j];
    if (!message || preservedUuids.has(message.uuid)) continue;
    if (isCompactBoundaryMessage(message))
      return {
        refusals,
        afterBoundary: true,
      };
    if (message.type === "assistant" && !isSyntheticModelMessage(message))
      return {
        refusals,
        afterBoundary: false,
      };
    if (message.type === "assistant" && isPromptTooLongMessage_2(message)) refusals++;
  }
  return {
    refusals,
    afterBoundary: false,
  };
}
//@ chunk-w3ch4xq2.js:120892-120957 placement
/**
 * 合成模型的消息
 */
function isSyntheticModelMessage(message) {
  return message.type === "assistant" && message.message.model === SYNTHETIC_MODEL;
}
//@ chunk-w3ch4xq2.js:120957-121192 placement
/**
 * 判断是否因长上下文需要额度的拒绝而自动压缩（上下文未超 1M、可压缩、开关开启）。
 */
function shouldCompactAfterLongContextRefusal(msg, attemptModelFacts, querySource) {
  try {
    return (
      msg.type === "assistant" &&
      isLongContextCreditsRequiredMessage(msg) &&
      attemptModelFacts.contextWindow <= SECONDARY_CONTEXT_WINDOW &&
      !isOver1mThreshold(attemptModelFacts.model, getSdkBetas()) &&
      canReactiveCompact({
        hasAttempted: false,
        querySource,
        aborted: false,
      }) &&
      isLinkedRoseEnabled()
    );
  } catch (error) {
    logFeatureSad("compact_after_long_context_refusal", "check_threw");
    logError(error);
    return false;
  }
}
//@ chunk-w3ch4xq2.js:121192-121820 placement
/**
 * 从错误详情计算提示过长时的令牌比例分档。
 */
function promptTooLongFacts(reply) {
  try {
    let { actualTokens, limitTokens } = parsePromptTooLongTokenCounts(reply.errorDetails ?? "");
    let prefixStats = requestPrefixStats(
      reply.systemPrompt.map((text) => ({
        text,
      })),
      reply.inlineTools?.map((inlineTool) => inlineTool.schema) ?? [],
      new Map(),
    );
    if (prefixStats === undefined) return {};
    let roundEstimate = roughTokenCountEstimationForMessages(reply.messages);
    let ratio =
      actualTokens === undefined
        ? undefined
        : (actualTokens - (prefixStats.systemCharLength + prefixStats.toolsCharLength) / 4) / roundEstimate;
    return {
      actualTokens,
      limitTokens,
      systemCharLength: prefixStats.systemCharLength,
      toolsCharLength: prefixStats.toolsCharLength,
      roundSizingEstimate: roundEstimate,
      actualToRoundSizingRatio: fromEnum(
        ratio === undefined
          ? "no_numbers"
          : ratio < 1.5
            ? "under_1_5"
            : ratio < 2
              ? "1_5_to_2"
              : ratio < 3
                ? "2_to_3"
                : ratio < 4
                  ? "3_to_4"
                  : "4_and_over",
      ),
    };
  } catch (error) {
    logError(
      withTelemetryMessage(toError(error), "refusedRequestSizeFields threw: the too-long event has no sizes"),
    );
    return {};
  }
}
//@ chunk-w3ch4xq2.js:121820-121891 placement
var EMPTY_ANNOUNCEMENT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-w3ch4xq2.js:121820", () => {
  EMPTY_ANNOUNCEMENT = Object.freeze({
    delivery: "transient",
    records: Object.freeze([]),
  });
});
//@ chunk-w3ch4xq2.js:121891-122306 placement
/**
 * 决定系统提醒的投递方式（kept/next_user_message 等）。
 */
function decideReminderDelivery(params) {
  try {
    let delivery =
      params.deliveryOverride ??
      params.decide(
        params.querySource,
        params.agentId,
        params.model,
        params.reminderModel,
        params.creditRetryStateless,
        params.recordedKeptReminders,
      );
    if (delivery !== "kept")
      return {
        delivery,
        records: [],
      };
    let records = params.recordsDue(params.messages, params.session, params.reminderModel).map((record) =>
      params.createRecord(
        {
          type: record.type,
          text: record.text,
          model: params.reminderModel,
          clearAt: "next_user_message",
        },
        params.stamp,
      ),
    );
    return {
      delivery,
      records,
    };
  } catch (error) {
    logError(error);
    return EMPTY_ANNOUNCEMENT;
  }
}
//@ chunk-w3ch4xq2.js:122306-122413 placement
/**
 * 判断所有结果是否都在未发请求的情况下得到回答。
 */
function allAnsweredWithoutRequest(assistantMessages) {
  try {
    return (
      assistantMessages.length > 0 &&
      assistantMessages.every((message) => message.answeredWithoutRequest === true)
    );
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-w3ch4xq2.js:122413-122729 layout
function canResumeThinking(messages, attemptModelFacts, autoCompactWindow) {
  try {
    let tokenCount = tokenCountFromLastAPIResponse(messages);
    if (tokenCount <= 0 || !canResumeThinkingOnModel(messages, attemptModelFacts.model)) return false;
    let totalTokens = tokenCount + serverClearedTokens(messages) + attemptModelFacts.maxOutputTokens;
    let thresholdBelowSecondary =
      getAutoCompactThresholdTokens(attemptModelFacts, autoCompactWindow) <= SECONDARY_CONTEXT_WINDOW;
    let { window: contextWindow } = getAutoCompactWindow(attemptModelFacts, autoCompactWindow);
    return (
      calculateTokenWarningState(totalTokens, attemptModelFacts, autoCompactWindow).level !== "blocked" &&
      (!thresholdBelowSecondary || totalTokens < Math.min(contextWindow, SECONDARY_CONTEXT_WINDOW)) &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_concurrent_lake", false)
    );
  } catch (error) {
    logFeatureSad("query_thinking_block_resumption", "compaction_skip_gate_threw");
    logError(error);
    return false;
  }
}
//@ chunk-w3ch4xq2.js:122729-123040 placement
/**
 * 是否询问用户"拒绝时切换模型"的偏好。
 */
function shouldAskRefusalFallbackPreference({ toolUseContext, isMainThread }) {
  try {
    return (
      isMainThread &&
      toolUseContext.agentId === undefined &&
      resolveSetting("switchModelsOnFlag", true).source === "default" &&
      getEnabledSettingSources().includes("userSettings") &&
      !isHeadlessHostEntrypoint() &&
      !isUnattendedBgSession() &&
      getTeammateAgentId() === undefined &&
      canPromptForConfirmation(toolUseContext) &&
      (!getIsNonInteractiveSession() || getSdkSupportedDialogKinds() !== undefined) &&
      getFeatureValue_CACHED_MAY_BE_STALE(TENGU_JAZZY_GOBLET, false)
    );
  } catch (error) {
    logError(error);
    logFeatureBad("refusal_fallback_preference_prompt", "gate_error");
    return false;
  }
}
//@ chunk-w3ch4xq2.js:123040-124471 placement
/**
 * 询问用户是否在拒绝时自动切换模型并保存设置。
 */
async function askRefusalFallbackPreference({
  canUseTool,
  toolUseContext,
  originalModel,
  fallbackModel,
  apiRefusalCategory,
  telemetry,
}) {
  try {
    let originalName = renderModelName(originalModel);
    let fallbackName = renderModelName(fallbackModel);
    let safeguardLead = getSafeguardLead(originalName, originalModel, apiRefusalCategory);
    let answer = await confirmWithUser({
      canUseTool,
      toolUseContext,
      source: "refusal_fallback_preference",
      header: "Model switch",
      question: `${safeguardLead} Switch to ${fallbackName} and keep going whenever this happens? You can change this later in /config.`,
      choices: [
        {
          value: "switch_automatically",
          label: FALLBACK_PREFERENCE_LABELS.switchAutomatically,
          description: `Continue on ${fallbackName} now, and switch without asking from now on`,
        },
        {
          value: "pause",
          label: `Stay on ${originalName}`,
          description: "Stop here without switching, and ask me each time a message is flagged",
        },
      ],
    });
    let choiceValue = answer.kind === "chose" ? answer.value : answer.kind;
    switch (
      (logEvent("tengu_refusal_fallback_preference_prompt", {
        ...telemetry,
        choice: fromEnum(choiceValue),
      }),
      answer.kind)
    ) {
      case "unanswered":
        logFeatureSad("refusal_fallback_preference_prompt", answer.reason);
        return "retry_fallback";
      case "declined":
        logFeatureOk("refusal_fallback_preference_prompt");
        return "retry_fallback";
      case "aborted":
        logFeatureOk("refusal_fallback_preference_prompt");
        return "cancelled";
      case "chose":
        break;
    }
    let switchAutomatically = answer.value === "switch_automatically";
    let { error } = await setSwitchModelsOnFlag(
      switchAutomatically,
      "first_flag_prompt",
      isStorageV5Enabled() ? toolUseContext.storageV5 : undefined,
    );
    if (error) {
      logForDebugging(`refusal fallback preference: could not store the answer: ${error.message}`, {
        level: "warn",
      });
      logFeatureSad("refusal_fallback_preference_prompt", "save_failed");
    } else logFeatureOk("refusal_fallback_preference_prompt");
    return switchAutomatically ? "retry_fallback" : "edit_prompt";
  } catch (error) {
    logError(error);
    logFeatureBad("refusal_fallback_preference_prompt", "error");
    return "retry_fallback";
  }
}
export {
  isRefusalErrorMessage,
  canResumeThinking,
  shouldRetryRefusal,
  shouldRetryRefusalNow,
  shouldAskRefusalFallbackPreference,
  EMPTY_ANNOUNCEMENT,
  decideReminderDelivery,
  askRefusalFallbackPreference,
  allAnsweredWithoutRequest,
  shouldCompactAfterLongContextRefusal,
  reportRefusalRetry,
  synthesizeRefusedToolResults,
  promptTooLongFacts,
  recoverFromRefusal,
};
