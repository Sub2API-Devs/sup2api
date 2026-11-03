/**
 * query/refusalRecovery.ts
 *
 * 2.1.316 新增：处理模型拒绝：压缩、同模型重试或切换模型；询问用户是否在拒绝时自动切换模型并保存设置等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ha3km179.js (15)
 * attribution: placement 15
 */
import { shouldAutoCompactForTurn, hasUsageAnchor } from "../services/compact/autoCompact.js";
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
import { isMainQuerySource, classifyQuerySource } from "../services/api/requestHeaders.js";
import { TENGU_MODULAR_SEAL, TENGU_MODULAR_SEAL_2 } from "./turnEndReasons.js";
import { requestPrefixStats } from "../services/api/logging.js";
import { fromEnumOpt, fromEnum, lit } from "../services/analytics/safeMetadata.js";
import { getEffectiveContextWindow } from "../entrypoints/sdk/coreSchemas.js";
import { agentTypeForTelemetry } from "../services/analytics/metadata.js";
import { sanitizeMarkName } from "../utils/startupMarks.js";
import { logEvent } from "../services/analytics/index.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { logError } from "../utils/log.js";
import { withTelemetryMessage, toError } from "../utils/errors.js";
import { unwrapAbortReason } from "../utils/abortController.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { isCompactBoundaryMessage } from "../services/projects/threadRows.js";
import { SYNTHETIC_MODEL } from "../constants/messages.js";
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
import { env } from "../utils/env.js";
import { telemetrySafeModelName } from "../utils/model/telemetryModelName.js";
import { normalizeRefusalCategory } from "../services/api/refusalFallback.js";
import {
  createInformationalSystemMessage,
  SAFETY_CLASSIFIER_STOPPED_WITH_INTERRUPT_TEXT,
  SAFETY_CLASSIFIER_STOPPED_TEXT,
} from "../utils/messages.js";
import { renderModelName } from "../utils/model/modelDisplay.js";
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

//@ chunk-ha3km179.js:107203-110228 placement
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
    let G = roughTokenCountEstimationForMessages(messages, facts.bytesPerToken);
    let ee =
      actualTokens !== undefined && limitTokens !== undefined ? limitTokens - (actualTokens - G) : undefined;
    let V = ee !== undefined && ee < MAX_OUTPUT_TOKENS_CAP;
    let { refusals, afterBoundary } = countRecentRefusals(messages);
    let Z = afterBoundary;
    let re = countNonProgressMessages(messages.filter((message) => !isSyntheticModelMessage(message))).length;
    let Re = re < 2;
    let cleanupHelpers = loadCleanupHelpers();
    let status = cleanupHelpers?.getTeleportCacheState().status;
    let lastDispatchFallback = cleanupHelpers?.getLastDispatchFallback();
    let nt =
      status === "active" &&
      lastDispatchFallback?.cause !== "model_mismatch" &&
      lastDispatchFallback?.httpStatus !== 400 &&
      lastDispatchFallback?.httpStatus !== 413;
    let bt = hasAttempted
      ? "prior_attempt"
      : toolUseContext.abortController.signal.aborted
        ? "aborted"
        : !isMainQuerySource(querySource) || toolUseContext.agentId !== undefined
          ? "not_main_thread"
          : loopTopOutcome !== "not_needed"
            ? "decided_at_loop_top"
            : offPickedModel
              ? "off_picked_model"
              : Z
                ? "unanswered_compaction"
                : refusals >= TENGU_MODULAR_SEAL
                  ? "repeated_refusals"
                  : Re
                    ? "one_round"
                    : nt
                      ? "relay_still_on"
                      : V
                        ? "futile"
                        : undefined;
    let dt = requestPrefixStats(
      sentSystemPrompt.map((text) => ({
        text,
      })),
      sentInlineTools?.map((sentInlineTool) => sentInlineTool.schema) ?? [],
      new Map(),
    );
    let rt = {
      skipReason: fromEnumOpt(bt),
      loopTopOutcome: fromEnum(loopTopOutcome),
      refusalsSinceReply: refusals,
      unansweredCompaction: Z,
      oneRound: Re,
      roundsInViewMax5: Math.min(re, 5),
      futile: V,
      roomAfterPrefixTokens: ee,
      requestOffPickedModel: offPickedModel,
      relayStatus: fromEnumOpt(status),
      relayFallbackCause: fromEnumOpt(lastDispatchFallback?.cause),
      relayHttpStatus: lastDispatchFallback?.httpStatus,
      actualTokens,
      limitTokens,
      messagesEstimate: G,
      systemCharLength: dt?.systemCharLength,
      toolsCharLength: dt?.toolsCharLength,
      toolsCount: dt?.toolsCount,
      bytesPerToken: facts.bytesPerToken,
      blockingLimitTokens: getEffectiveContextWindow(facts) - MAX_WINDOW_TOKENS,
      hadPromptUsage: hasUsageAnchor(messages),
      thresholdSource: fromEnum(windowSource(facts, toolUseContext.options.autoCompactWindow)),
      querySource: agentTypeForTelemetry(querySource),
      queryChainId: sanitizeMarkName(toolUseContext.queryTracking?.chainId),
      queryDepth: toolUseContext.queryTracking?.depth,
    };
    if (bt !== undefined) {
      logEvent("tengu_compact_after_prompt_too_long", {
        ...rt,
        outcome: lit("skipped"),
      });
      return {
        result: null,
      };
    }
    if (getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MODULAR_SEAL_2, false) !== true) {
      logEvent("tengu_compact_after_prompt_too_long", {
        ...rt,
        outcome: lit("flag_off"),
      });
      return {
        result: null,
      };
    }
    let startTime = performance.now();
    let Pe;
    try {
      Pe = yield* autocompact(
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
      Pe = {
        kind: "threw",
      };
    }
    let Ke =
      Pe.kind === "failed"
        ? Pe.compactFailure
        : Pe.kind === "threw"
          ? {
              reason: "error",
              detail: "an internal error",
            }
          : undefined;
    let J = Pe.kind === "compacted" ? Pe.result : null;
    try {
      let je = unwrapAbortReason(toolUseContext.abortController.signal.reason) === "recovery-timeout";
      logEvent("tengu_compact_after_prompt_too_long", {
        ...rt,
        outcome: fromEnum(Pe.kind),
        failureReason: fromEnumOpt(Ke?.reason),
        recoveryTimedOut: je,
        preCompactTokenCount: J?.preCompactTokenCount,
        truePostCompactTokenCount: J?.truePostCompactTokenCount,
        ptlAttempts: J?.ptlAttempts,
        promptCacheSharingEnabled: J?.promptCacheSharingEnabled,
        durationMs: Math.round(performance.now() - startTime),
      });
      if (J) logFeatureOk("compact_after_prompt_too_long");
      else if (je) logFeatureBad("compact_after_prompt_too_long", "recovery_timeout");
      else if (Ke?.reason === "aborted") logFeatureSad("compact_after_prompt_too_long", Ke.reason);
      else logFeatureBad("compact_after_prompt_too_long", Ke?.reason ?? Pe.kind);
    } catch (error) {
      logError(withTelemetryMessage(toError(error), "compactAfterRefusal: logging the outcome threw"));
    }
    return {
      result: J,
      failure: Ke,
    };
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "compactAfterRefusal: threw before the compaction"));
    return {
      result: null,
    };
  }
}
//@ chunk-ha3km179.js:110228-110593 placement
/**
 * 统计最近的拒绝次数（是否在压缩边界后）。
 */
function countRecentRefusals(messages) {
  let n = 0;
  let preservedMessages = messages.findLast(isCompactBoundaryMessage)?.compactMetadata?.preservedMessages;
  let s = new Set(preservedMessages?.allUuids ?? preservedMessages?.uuids);
  for (let j = messages.length - 1; j >= 0; j--) {
    let y = messages[j];
    if (!y || s.has(y.uuid)) continue;
    if (isCompactBoundaryMessage(y))
      return {
        refusals: n,
        afterBoundary: true,
      };
    if (y.type === "assistant" && !isSyntheticModelMessage(y))
      return {
        refusals: n,
        afterBoundary: false,
      };
    if (y.type === "assistant" && isPromptTooLongMessage_2(y)) n++;
  }
  return {
    refusals: n,
    afterBoundary: false,
  };
}
//@ chunk-ha3km179.js:110593-110658 placement
/**
 * 合成模型的消息
 */
function isSyntheticModelMessage(e) {
  return e.type === "assistant" && e.message.model === SYNTHETIC_MODEL;
}
//@ chunk-ha3km179.js:110658-110893 placement
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
//@ chunk-ha3km179.js:110893-111521 placement
/**
 * 从错误详情计算提示过长时的令牌比例分档。
 */
function promptTooLongFacts(e) {
  try {
    let { actualTokens, limitTokens } = parsePromptTooLongTokenCounts(e.errorDetails ?? "");
    let s = requestPrefixStats(
      e.systemPrompt.map((text) => ({
        text,
      })),
      e.inlineTools?.map((inlineTool) => inlineTool.schema) ?? [],
      new Map(),
    );
    if (s === undefined) return {};
    let h = roughTokenCountEstimationForMessages(e.messages);
    let y =
      actualTokens === undefined
        ? undefined
        : (actualTokens - (s.systemCharLength + s.toolsCharLength) / 4) / h;
    return {
      actualTokens,
      limitTokens,
      systemCharLength: s.systemCharLength,
      toolsCharLength: s.toolsCharLength,
      roundSizingEstimate: h,
      actualToRoundSizingRatio: fromEnum(
        y === undefined
          ? "no_numbers"
          : y < 1.5
            ? "under_1_5"
            : y < 2
              ? "1_5_to_2"
              : y < 3
                ? "2_to_3"
                : y < 4
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
//@ chunk-ha3km179.js:111521-111592 placement
var mi = Object.freeze({
  delivery: "transient",
  records: Object.freeze([]),
});
//@ chunk-ha3km179.js:111592-112007 placement
/**
 * 决定系统提醒的投递方式（kept/next_user_message 等）。
 */
function decideReminderDelivery(e) {
  try {
    let n =
      e.deliveryOverride ??
      e.decide(
        e.querySource,
        e.agentId,
        e.model,
        e.reminderModel,
        e.creditRetryStateless,
        e.recordedKeptReminders,
      );
    if (n !== "kept")
      return {
        delivery: n,
        records: [],
      };
    let records = e.recordsDue(e.messages, e.session, e.reminderModel).map((s) =>
      e.createRecord(
        {
          type: s.type,
          text: s.text,
          model: e.reminderModel,
          clearAt: "next_user_message",
        },
        e.stamp,
      ),
    );
    return {
      delivery: n,
      records,
    };
  } catch (error) {
    logError(error);
    return mi;
  }
}
//@ chunk-ha3km179.js:112007-112114 placement
/**
 * 判断所有结果是否都在未发请求的情况下得到回答。
 */
function allAnsweredWithoutRequest(assistantMessages) {
  try {
    return assistantMessages.length > 0 && assistantMessages.every((n) => n.answeredWithoutRequest === true);
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-ha3km179.js:112114-112367 placement
var TOOL_NOT_RUN_AFTER_REFUSAL =
  "Not run: the response that made this tool call was stopped by a safety classifier.";
var TOOL_INTERRUPTED_BY_REFUSAL =
  "Interrupted: the response that made this tool call was stopped by a safety classifier while the call was running; it may have partially or fully completed.";
//@ chunk-ha3km179.js:112367-112481 placement
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
//@ chunk-ha3km179.js:112481-112586 placement
/**
 * 判断消息是否为 stop_reason 为 refusal 的 API 错误消息。
 */
function isRefusalErrorMessage(e) {
  return e?.type === "assistant" && e.isApiErrorMessage === true && e.message.stop_reason === "refusal";
}
//@ chunk-ha3km179.js:112586-113781 placement
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
  let w = new Set(
    answered.flatMap((L) =>
      L.type === "user" && Array.isArray(L.message.content)
        ? L.message.content.flatMap((z) => (z.type === "tool_result" ? [z.tool_use_id] : []))
        : [],
    ),
  );
  let P = new Set(started);
  let Q = 0;
  let flattened = kept.flatMap((L) =>
    L.message.content.flatMap((z) => {
      if (z.type !== "tool_use" || w.has(z.id)) return [];
      let G = P.has(z.id);
      if (G) Q++;
      let ee = G ? TOOL_INTERRUPTED_BY_REFUSAL : TOOL_NOT_RUN_AFTER_REFUSAL;
      return [
        makeUserMessage({
          content: [
            {
              type: "tool_result",
              tool_use_id: z.id,
              is_error: true,
              content: ee,
            },
          ],
          toolUseResult: ee,
          toolDenialKind: G ? "interrupted" : "cancelled",
          sourceToolAssistantUUID: L.uuid,
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
      tool_calls_not_run: flattened.length - Q,
      tool_calls_interrupted: Q,
      tool_calls_already_finished: w.size,
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
      content: Q > 0 ? SAFETY_CLASSIFIER_STOPPED_WITH_INTERRUPT_TEXT : SAFETY_CLASSIFIER_STOPPED_TEXT,
      isMeta: true,
      turnCompanion: true,
      refusedMessageId: refused.refusedMessageId,
      now: deps.now,
      uuidFn: deps.uuid,
    }),
  };
}
//@ chunk-ha3km179.js:113781-114097 placement
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
//@ chunk-ha3km179.js:114097-114408 placement
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
//@ chunk-ha3km179.js:114408-115839 placement
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
    let S = renderModelName(originalModel);
    let M = renderModelName(fallbackModel);
    let safeguardLead = getSafeguardLead(S, originalModel, apiRefusalCategory);
    let T = await confirmWithUser({
      canUseTool,
      toolUseContext,
      source: "refusal_fallback_preference",
      header: "Model switch",
      question: `${safeguardLead} Switch to ${M} and keep going whenever this happens? You can change this later in /config.`,
      choices: [
        {
          value: "switch_automatically",
          label: FALLBACK_PREFERENCE_LABELS.switchAutomatically,
          description: `Continue on ${M} now, and switch without asking from now on`,
        },
        {
          value: "pause",
          label: `Stay on ${S}`,
          description: "Stop here without switching, and ask me each time a message is flagged",
        },
      ],
    });
    let w = T.kind === "chose" ? T.value : T.kind;
    switch (
      (logEvent("tengu_refusal_fallback_preference_prompt", {
        ...telemetry,
        choice: fromEnum(w),
      }),
      T.kind)
    ) {
      case "unanswered":
        logFeatureSad("refusal_fallback_preference_prompt", T.reason);
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
    let P = T.value === "switch_automatically";
    let { error } = await setSwitchModelsOnFlag(
      P,
      "first_flag_prompt",
      isStorageV5Enabled() ? toolUseContext.storageV5 : undefined,
    );
    if (error) {
      logForDebugging(`refusal fallback preference: could not store the answer: ${error.message}`, {
        level: "warn",
      });
      logFeatureSad("refusal_fallback_preference_prompt", "save_failed");
    } else logFeatureOk("refusal_fallback_preference_prompt");
    return P ? "retry_fallback" : "edit_prompt";
  } catch (error) {
    logError(error);
    logFeatureBad("refusal_fallback_preference_prompt", "error");
    return "retry_fallback";
  }
}
export {
  shouldRetryRefusal,
  shouldAskRefusalFallbackPreference,
  mi,
  decideReminderDelivery,
  askRefusalFallbackPreference,
  allAnsweredWithoutRequest,
  shouldCompactAfterLongContextRefusal,
  isRefusalErrorMessage,
  reportRefusalRetry,
  synthesizeRefusedToolResults,
  recoverFromRefusal,
  promptTooLongFacts,
};
