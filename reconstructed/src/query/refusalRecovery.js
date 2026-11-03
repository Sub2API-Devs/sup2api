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
import { xjo, OSt } from "../services/compact/autoCompact.js";
import {
  parsePromptTooLongTokenCounts,
  isPromptTooLongMessage_2,
  isLongContextCreditsRequiredMessage,
} from "../services/api/errors.js";
import { Lg } from "../services/tokenEstimation.js";
import { sjr, rjr, fse } from "../services/compact/autoCompactWindow.js";
import { countNonProgressMessages } from "../services/compact/compact.js";
import { Ywt } from "../services/compact/postCompactCleanup.js";
import { isMainQuerySource, classifyQuerySource } from "../services/api/requestHeaders.js";
import { Jf, TENGU_MODULAR_SEAL } from "./turnEndReasons.js";
import { requestPrefixStats } from "../services/api/logging.js";
import { fromEnumOpt, fromEnum, lit } from "../services/analytics/safeMetadata.js";
import { getEffectiveContextWindow } from "../entrypoints/sdk/coreSchemas.js";
import { agentTypeForTelemetry } from "../services/analytics/metadata.js";
import { ye } from "../utils/startupMarks.js";
import { logEvent } from "../services/analytics/index.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { logError } from "../utils/log.js";
import { withTelemetryMessage, toError } from "../utils/errors.js";
import { unwrapAbortReason } from "../utils/abortController.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { isCompactBoundaryMessage } from "../services/projects/threadRows.js";
import { SYNTHETIC_MODEL } from "../constants/messages.js";
import { CK } from "../utils/model/model.js";
import { isOver1mThreshold } from "../utils/model/configs.js";
import {
  getSdkBetas,
  getTeammateAgentId,
  getIsNonInteractiveSession,
  getSdkSupportedDialogKinds,
} from "../bootstrap/state.js";
import { canReactiveCompact } from "../services/compact/reactiveCompact.js";
import { nnr } from "../services/compact/compactSettings.js";
import { env } from "../utils/env.js";
import { telemetrySafeModelName } from "../utils/model/telemetryModelName.js";
import { normalizeRefusalCategory } from "../services/api/refusalFallback.js";
import { createInformationalSystemMessage, Dds, Joo } from "../utils/messages.js";
import { renderModelName } from "../utils/model/modelDisplay.js";
import { resolveSetting } from "../utils/settings/userIntentSettings.js";
import { getEnabledSettingSources } from "../utils/settings/constants.js";
import { isHeadlessHostEntrypoint } from "../utils/entrypointKinds.js";
import { isUnattendedBgSession } from "../utils/concurrentSessions.js";
import { oZe, confirmWithUser } from "../utils/permissions/confirmWithUser.js";
import {
  TENGU_JAZZY_GOBLET,
  getSafeguardLead,
  Bie,
  setSwitchModelsOnFlag,
} from "../services/api/safeguardMessages.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { logForDebugging } from "../utils/debug.js";

/**
 * 处理模型拒绝：压缩、同模型重试或切换模型。
 */
//@ chunk-ha3km179.js:107203-110228 placement
async function* recoverFromRefusal({
  autocompact: autocompact,
  refusal: refusal,
  hasAttempted: hasAttempted,
  loopTopOutcome: loopTopOutcome,
  offPickedModel: offPickedModel,
  messages: messages,
  toolUseContext: toolUseContext,
  facts: facts,
  cacheSafeParams: cacheSafeParams,
  querySource: querySource,
  tracking: tracking,
  snipTokensFreed: snipTokensFreed,
  sentSystemPrompt: sentSystemPrompt,
  sentInlineTools: sentInlineTools,
}) {
  try {
    if (!xjo(querySource)) return { result: null };
    let { actualTokens: actualTokens, limitTokens: limitTokens } = parsePromptTooLongTokenCounts(
        refusal.errorDetails ?? "",
      ),
      G = Lg(messages, facts.bytesPerToken),
      ee = actualTokens !== void 0 && limitTokens !== void 0 ? limitTokens - (actualTokens - G) : void 0,
      V = ee !== void 0 && ee < sjr,
      { refusals: refusals, afterBoundary: afterBoundary } = countRecentRefusals(messages),
      Z = afterBoundary,
      re = countNonProgressMessages(messages.filter((je) => !Bd(je))).length,
      Re = re < 2,
      se = Ywt(),
      Te = se?.getTeleportCacheState().status,
      U = se?.getLastDispatchFallback(),
      nt = Te === "active" && U?.cause !== "model_mismatch" && U?.httpStatus !== 400 && U?.httpStatus !== 413,
      bt = hasAttempted
        ? "prior_attempt"
        : toolUseContext.abortController.signal.aborted
          ? "aborted"
          : !isMainQuerySource(querySource) || toolUseContext.agentId !== void 0
            ? "not_main_thread"
            : loopTopOutcome !== "not_needed"
              ? "decided_at_loop_top"
              : offPickedModel
                ? "off_picked_model"
                : Z
                  ? "unanswered_compaction"
                  : refusals >= Jf
                    ? "repeated_refusals"
                    : Re
                      ? "one_round"
                      : nt
                        ? "relay_still_on"
                        : V
                          ? "futile"
                          : void 0,
      dt = requestPrefixStats(
        sentSystemPrompt.map((je) => ({ text: je })),
        sentInlineTools?.map((je) => je.schema) ?? [],
        new Map(),
      ),
      rt = {
        skipReason: fromEnumOpt(bt),
        loopTopOutcome: fromEnum(loopTopOutcome),
        refusalsSinceReply: refusals,
        unansweredCompaction: Z,
        oneRound: Re,
        roundsInViewMax5: Math.min(re, 5),
        futile: V,
        roomAfterPrefixTokens: ee,
        requestOffPickedModel: offPickedModel,
        relayStatus: fromEnumOpt(Te),
        relayFallbackCause: fromEnumOpt(U?.cause),
        relayHttpStatus: U?.httpStatus,
        actualTokens: actualTokens,
        limitTokens: limitTokens,
        messagesEstimate: G,
        systemCharLength: dt?.systemCharLength,
        toolsCharLength: dt?.toolsCharLength,
        toolsCount: dt?.toolsCount,
        bytesPerToken: facts.bytesPerToken,
        blockingLimitTokens: getEffectiveContextWindow(facts) - rjr,
        hadPromptUsage: OSt(messages),
        thresholdSource: fromEnum(fse(facts, toolUseContext.options.autoCompactWindow)),
        querySource: agentTypeForTelemetry(querySource),
        queryChainId: ye(toolUseContext.queryTracking?.chainId),
        queryDepth: toolUseContext.queryTracking?.depth,
      };
    if (bt !== void 0)
      return (
        logEvent("tengu_compact_after_prompt_too_long", { ...rt, outcome: lit("skipped") }),
        { result: null }
      );
    if (getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MODULAR_SEAL, !1) !== !0)
      return (
        logEvent("tengu_compact_after_prompt_too_long", { ...rt, outcome: lit("flag_off") }),
        { result: null }
      );
    let startTime = performance.now(),
      Pe;
    try {
      Pe = yield* autocompact(
        messages,
        toolUseContext,
        facts,
        cacheSafeParams,
        querySource,
        tracking,
        snipTokensFreed,
        void 0,
        !0,
      );
    } catch (error) {
      (logError(withTelemetryMessage(toError(error), "compactAfterRefusal: the compaction threw")),
        (Pe = { kind: "threw" }));
    }
    let Ke =
        Pe.kind === "failed"
          ? Pe.compactFailure
          : Pe.kind === "threw"
            ? { reason: "error", detail: "an internal error" }
            : void 0,
      J = Pe.kind === "compacted" ? Pe.result : null;
    try {
      let je = unwrapAbortReason(toolUseContext.abortController.signal.reason) === "recovery-timeout";
      if (
        (logEvent("tengu_compact_after_prompt_too_long", {
          ...rt,
          outcome: fromEnum(Pe.kind),
          failureReason: fromEnumOpt(Ke?.reason),
          recoveryTimedOut: je,
          preCompactTokenCount: J?.preCompactTokenCount,
          truePostCompactTokenCount: J?.truePostCompactTokenCount,
          ptlAttempts: J?.ptlAttempts,
          promptCacheSharingEnabled: J?.promptCacheSharingEnabled,
          durationMs: Math.round(performance.now() - startTime),
        }),
        J)
      )
        logFeatureOk("compact_after_prompt_too_long");
      else if (je) logFeatureBad("compact_after_prompt_too_long", "recovery_timeout");
      else if (Ke?.reason === "aborted") logFeatureSad("compact_after_prompt_too_long", Ke.reason);
      else logFeatureBad("compact_after_prompt_too_long", Ke?.reason ?? Pe.kind);
    } catch (error) {
      logError(withTelemetryMessage(toError(error), "compactAfterRefusal: logging the outcome threw"));
    }
    return { result: J, failure: Ke };
  } catch (error) {
    return (
      logError(withTelemetryMessage(toError(error), "compactAfterRefusal: threw before the compaction")),
      { result: null }
    );
  }
}
/**
 * 统计最近的拒绝次数（是否在压缩边界后）。
 */
//@ chunk-ha3km179.js:110228-110593 placement
function countRecentRefusals(e) {
  let n = 0,
    r = e.findLast(isCompactBoundaryMessage)?.compactMetadata?.preservedMessages,
    s = new Set(r?.allUuids ?? r?.uuids);
  for (let h = e.length - 1; h >= 0; h--) {
    let y = e[h];
    if (!y || s.has(y.uuid)) continue;
    if (isCompactBoundaryMessage(y)) return { refusals: n, afterBoundary: !0 };
    if (y.type === "assistant" && !Bd(y)) return { refusals: n, afterBoundary: !1 };
    if (y.type === "assistant" && isPromptTooLongMessage_2(y)) n++;
  }
  return { refusals: n, afterBoundary: !1 };
}
//@ chunk-ha3km179.js:110593-110658 placement
function Bd(e) {
  return e.type === "assistant" && e.message.model === SYNTHETIC_MODEL;
}
/**
 * 判断是否因长上下文需要额度的拒绝而自动压缩（上下文未超 1M、可压缩、开关开启）。
 */
//@ chunk-ha3km179.js:110658-110893 placement
function shouldCompactAfterLongContextRefusal(e, n, r) {
  try {
    return (
      e.type === "assistant" &&
      isLongContextCreditsRequiredMessage(e) &&
      n.contextWindow <= CK &&
      !isOver1mThreshold(n.model, getSdkBetas()) &&
      canReactiveCompact({ hasAttempted: !1, querySource: r, aborted: !1 }) &&
      nnr()
    );
  } catch (error) {
    return (logFeatureSad("compact_after_long_context_refusal", "check_threw"), logError(error), !1);
  }
}
/**
 * 从错误详情计算提示过长时的令牌比例分档。
 */
//@ chunk-ha3km179.js:110893-111521 placement
function promptTooLongFacts(e) {
  try {
    let { actualTokens: actualTokens, limitTokens: limitTokens } = parsePromptTooLongTokenCounts(
        e.errorDetails ?? "",
      ),
      s = requestPrefixStats(
        e.systemPrompt.map((S) => ({ text: S })),
        e.inlineTools?.map((S) => S.schema) ?? [],
        new Map(),
      );
    if (s === void 0) return {};
    let h = Lg(e.messages),
      y =
        actualTokens === void 0 ? void 0 : (actualTokens - (s.systemCharLength + s.toolsCharLength) / 4) / h;
    return {
      actualTokens: actualTokens,
      limitTokens: limitTokens,
      systemCharLength: s.systemCharLength,
      toolsCharLength: s.toolsCharLength,
      roundSizingEstimate: h,
      actualToRoundSizingRatio: fromEnum(
        y === void 0
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
    return (
      logError(
        withTelemetryMessage(
          toError(error),
          "refusedRequestSizeFields threw: the too-long event has no sizes",
        ),
      ),
      {}
    );
  }
}
//@ chunk-ha3km179.js:111521-111592 placement
var freeze = Object.freeze({ delivery: "transient", records: Object.freeze([]) });
/**
 * 决定系统提醒的投递方式（kept/next_user_message 等）。
 */
//@ chunk-ha3km179.js:111592-112007 placement
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
    if (n !== "kept") return { delivery: n, records: [] };
    let mapped = e
      .recordsDue(e.messages, e.session, e.reminderModel)
      .map((s) =>
        e.createRecord(
          { type: s.type, text: s.text, model: e.reminderModel, clearAt: "next_user_message" },
          e.stamp,
        ),
      );
    return { delivery: n, records: mapped };
  } catch (error) {
    return (logError(error), freeze);
  }
}
/**
 * 判断所有结果是否都在未发请求的情况下得到回答。
 */
//@ chunk-ha3km179.js:112007-112114 placement
function allAnsweredWithoutRequest(e) {
  try {
    return e.length > 0 && e.every((n) => n.answeredWithoutRequest === !0);
  } catch (error) {
    return (logError(error), !1);
  }
}
//@ chunk-ha3km179.js:112114-112367 placement
var TOOL_NOT_RUN_AFTER_REFUSAL =
    "Not run: the response that made this tool call was stopped by a safety classifier.",
  TOOL_INTERRUPTED_BY_REFUSAL =
    "Interrupted: the response that made this tool call was stopped by a safety classifier while the call was running; it may have partially or fully completed.";
/**
 * 判断拒答后是否应重试：未重试过、非辅助查询且未通过环境变量禁用。
 */
//@ chunk-ha3km179.js:112367-112481 placement
function shouldRetryRefusal(e, n) {
  try {
    return !n && classifyQuerySource(e) !== "auxiliary" && !env.CLAUDE_CODE_DISABLE_REFUSAL_RETRY;
  } catch (error) {
    return (logError(error), !1);
  }
}
/**
 * 判断消息是否为 stop_reason 为 refusal 的 API 错误消息。
 */
//@ chunk-ha3km179.js:112481-112586 placement
function isRefusalErrorMessage(e) {
  return e?.type === "assistant" && e.isApiErrorMessage === !0 && e.message.stop_reason === "refusal";
}
/**
 * 为被拒绝回合中未回答的工具调用生成结果。
 */
//@ chunk-ha3km179.js:112586-113781 placement
function synthesizeRefusedToolResults({
  refused: refused,
  kept: kept,
  answered: answered,
  started: started,
  model: model,
  querySource: querySource,
  queryChainId: queryChainId,
  queryDepth: queryDepth,
  deps: deps,
  makeUserMessage: makeUserMessage,
}) {
  let w = new Set(
      answered.flatMap((L) =>
        L.type === "user" && Array.isArray(L.message.content)
          ? L.message.content.flatMap((z) => (z.type === "tool_result" ? [z.tool_use_id] : []))
          : [],
      ),
    ),
    P = new Set(started),
    Q = 0,
    flattened = kept.flatMap((L) =>
      L.message.content.flatMap((z) => {
        if (z.type !== "tool_use" || w.has(z.id)) return [];
        let G = P.has(z.id);
        if (G) Q++;
        let ee = G ? TOOL_INTERRUPTED_BY_REFUSAL : TOOL_NOT_RUN_AFTER_REFUSAL;
        return [
          makeUserMessage({
            content: [{ type: "tool_result", tool_use_id: z.id, is_error: !0, content: ee }],
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
    let L = refused.message.stop_details?.category;
    logEvent("tengu_refusal_same_model_retry", {
      model: telemetrySafeModelName(model),
      request_id: ye(refused.requestId),
      api_refusal_category: fromEnumOpt(L ? normalizeRefusalCategory(L) : void 0),
      queryChainId: queryChainId,
      queryDepth: queryDepth,
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
      content: Q > 0 ? Dds : Joo,
      isMeta: !0,
      turnCompanion: !0,
      refusedMessageId: refused.refusedMessageId,
      now: deps.now,
      uuidFn: deps.uuid,
    }),
  };
}
/**
 * 上报拒绝后同模型重试的结果。
 */
//@ chunk-ha3km179.js:113781-114097 placement
function reportRefusalRetry({
  sentOn: sentOn,
  servedBy: servedBy,
  lastMessage: lastMessage,
  withheldRecoverable: withheldRecoverable,
}) {
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
/**
 * 是否询问用户"拒绝时切换模型"的偏好。
 */
//@ chunk-ha3km179.js:114097-114408 placement
function shouldAskRefusalFallbackPreference({ toolUseContext: toolUseContext, isMainThread: isMainThread }) {
  try {
    return (
      isMainThread &&
      toolUseContext.agentId === void 0 &&
      resolveSetting("switchModelsOnFlag", !0).source === "default" &&
      getEnabledSettingSources().includes("userSettings") &&
      !isHeadlessHostEntrypoint() &&
      !isUnattendedBgSession() &&
      getTeammateAgentId() === void 0 &&
      oZe(toolUseContext) &&
      (!getIsNonInteractiveSession() || getSdkSupportedDialogKinds() !== void 0) &&
      getFeatureValue_CACHED_MAY_BE_STALE(TENGU_JAZZY_GOBLET, !1)
    );
  } catch (error) {
    return (logError(error), logFeatureBad("refusal_fallback_preference_prompt", "gate_error"), !1);
  }
}
/**
 * 询问用户是否在拒绝时自动切换模型并保存设置。
 */
//@ chunk-ha3km179.js:114408-115839 placement
async function askRefusalFallbackPreference({
  canUseTool: canUseTool,
  toolUseContext: toolUseContext,
  originalModel: originalModel,
  fallbackModel: fallbackModel,
  apiRefusalCategory: apiRefusalCategory,
  telemetry: telemetry,
}) {
  try {
    let S = renderModelName(originalModel),
      M = renderModelName(fallbackModel),
      R = getSafeguardLead(S, originalModel, apiRefusalCategory),
      T = await confirmWithUser({
        canUseTool: canUseTool,
        toolUseContext: toolUseContext,
        source: "refusal_fallback_preference",
        header: "Model switch",
        question: `${R} Switch to ${M} and keep going whenever this happens? You can change this later in /config.`,
        choices: [
          {
            value: "switch_automatically",
            label: Bie.switchAutomatically,
            description: `Continue on ${M} now, and switch without asking from now on`,
          },
          {
            value: "pause",
            label: `Stay on ${S}`,
            description: "Stop here without switching, and ask me each time a message is flagged",
          },
        ],
      }),
      w = T.kind === "chose" ? T.value : T.kind;
    switch (
      (logEvent("tengu_refusal_fallback_preference_prompt", { ...telemetry, choice: fromEnum(w) }), T.kind)
    ) {
      case "unanswered":
        return (logFeatureSad("refusal_fallback_preference_prompt", T.reason), "retry_fallback");
      case "declined":
        return (logFeatureOk("refusal_fallback_preference_prompt"), "retry_fallback");
      case "aborted":
        return (logFeatureOk("refusal_fallback_preference_prompt"), "cancelled");
      case "chose":
        break;
    }
    let P = T.value === "switch_automatically",
      { error: error } = await setSwitchModelsOnFlag(
        P,
        "first_flag_prompt",
        isStorageV5Enabled() ? toolUseContext.storageV5 : void 0,
      );
    if (error)
      (logForDebugging(`refusal fallback preference: could not store the answer: ${error.message}`, {
        level: "warn",
      }),
        logFeatureSad("refusal_fallback_preference_prompt", "save_failed"));
    else logFeatureOk("refusal_fallback_preference_prompt");
    return P ? "retry_fallback" : "edit_prompt";
  } catch (error) {
    return (logError(error), logFeatureBad("refusal_fallback_preference_prompt", "error"), "retry_fallback");
  }
}

export {
  shouldRetryRefusal,
  shouldAskRefusalFallbackPreference,
  freeze,
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
