/**
 * query/outputLimitRecovery.ts
 *
 * 2.1.316 新增：回退到上下文窗口更小的模型时生成说明；输出上限恢复耗尽时的处理（丢弃思考或继续）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ha3km179.js (23)
 * attribution: placement 23
 */
import { classifyQuerySource } from "../services/api/requestHeaders.js";
import { isClaudeAiChatCowork } from "../utils/entrypointKinds.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { lit, fromEnum, fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { oXt, TIt, OUTPUT_LIMIT_RESUME, isThinkingBlock } from "../utils/messages.js";
import { logForDebugging } from "../utils/debug.js";
import { logError } from "../utils/log.js";
import { EFFORT_LEVELS, modelSupportsEffort } from "../utils/effort.js";
import { canSuggestSlashCommands } from "../services/api/errors.js";
import { artifactPathPrefix } from "../services/artifacts/artifactMount.js";
import { h0e } from "../plugins/functionHooks/commandRunDispatch.js";
import { mainAgentId, getSdkBetas } from "../bootstrap/state.js";
import { withTelemetryMessage, toError, errorMessage } from "../utils/errors.js";
import { logEvent } from "../services/analytics/index.js";
import { isErrorTerminalReason } from "../entrypoints/sdk/coreSchemas.js";
import { isNonMainSessionSubagent, isMainAgent } from "../utils/agentContext.js";
import { agentTypeForTelemetry } from "../services/analytics/metadata.js";
import {
  AUTOCOMPACT_THRASHING_NOTICE,
  getAutoCompactWindow,
  AUTOCOMPACT_THRASHING_TEXT,
} from "../services/compact/autoCompact.js";
import { getModelContextInfo } from "../utils/model/modelContextInfo.js";
import { renderModelName } from "../utils/model/modelDisplay.js";
import { getContextWindow } from "../utils/model/configs.js";
import { has1mSuffix } from "../utils/model/contextWindow1m.js";
import { append1mSuffixIfMissing } from "../utils/model/planModeModel.js";
import { getCanonicalName } from "../utils/model/canonicalModelName.js";
import { modelFamilyOf } from "../utils/model/providers.js";
import {
  shouldProbeThirdPartyDefaults,
  shouldProbeThirdPartyDefaultsAlt,
} from "../utils/model/thirdPartyModelDefaults.js";
import { getCatalogEntry } from "../utils/model/modelCatalog.js";
import { Lt } from "../utils/model/modelIds.js";
import { formatTokens } from "../utils/format.js";
import { discardInFlightTools } from "../services/tools/StreamingToolExecutor.js";

/**
 * 输出上限/反应式压缩恢复计数的初始值。
 */
//@ chunk-ha3km179.js:143553-143743 placement
var INITIAL_RECOVERY_STATE = {
    maxOutputTokensRecoveryCount: 0,
    hasAttemptedReactiveCompact: !1,
    reactiveCompactDeeperPass: "none",
  },
  INITIAL_LOOP_RECOVERY_STATE = {
    ...INITIAL_RECOVERY_STATE,
    thinkingOnlyNudged: !1,
    malformedToolUseRetryCount: 0,
    stopHookBlockingCount: 0,
  };
//@ chunk-ha3km179.js:143743-143766 placement
function $r() {
  return !1;
}
//@ chunk-ha3km179.js:143766-143838 placement
var Kr = 3,
  Ng = " The last attempt reached the limit while still thinking.";
/**
 * 输出达到 max_tokens 时是否用提示让模型继续（tengu_rosy_pebble）。
 */
//@ chunk-ha3km179.js:143838-144349 placement
function shouldNudgeOutputLimitResume(e, n, r) {
  try {
    let s = endsWithThinkingOnly(e),
      h = e.findLast((M) => !M.isApiErrorMessage)?.message,
      y = h?.content.at(-1),
      S =
        h?.stop_reason === "max_tokens" &&
        y?.type === "text" &&
        y.text.trim() !== "" &&
        classifyQuerySource(r) === "main" &&
        isClaudeAiChatCowork() &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_rosy_pebble", !1);
    if (
      (logFeatureSad(
        "query_output_limit_recovery",
        s ? "nudged_thinking_discarded" : "nudged_resume",
        S ? { attempt: n, nudge_name: lit("reopen_block") } : { attempt: n },
      ),
      S)
    )
      return oXt;
    return s && $r() ? TIt : OUTPUT_LIMIT_RESUME;
  } catch (error) {
    return (
      logForDebugging("[output-limit-recovery] nudge choice threw; keeping the resume nudge", {
        level: "warn",
      }),
      logError(error),
      OUTPUT_LIMIT_RESUME
    );
  }
}
/**
 * 输出上限恢复耗尽时的处理（丢弃思考或继续）。
 */
//@ chunk-ha3km179.js:144349-145065 placement
function recoverExhaustedOutput({
  withheld: withheld,
  responses: responses,
  model: model,
  isNonInteractiveSession: isNonInteractiveSession,
  agentId: agentId,
}) {
  try {
    let y = endsWithThinkingOnly(responses);
    logFeatureBad("query_output_limit_recovery", y ? "exhausted_thinking_discarded" : "exhausted_resume");
    let S = withheld.message.content[0];
    if (
      !y ||
      !$r() ||
      withheld.message.content.length !== 1 ||
      S?.type !== "text" ||
      responses.findLast((T) => !T.isApiErrorMessage)?.effort === EFFORT_LEVELS[0] ||
      !modelSupportsEffort(model)
    )
      return withheld;
    let M =
        !isNonInteractiveSession && agentId === void 0 && canSuggestSlashCommands()
          ? artifactPathPrefix("effort")
          : void 0,
      R =
        M === void 0
          ? " Lower the effort level to leave room for a reply."
          : ` Lower the effort level with ${M} to leave room for a reply.`;
    return { ...withheld, message: { ...withheld.message, content: [{ ...S, text: S.text + Ng + R }] } };
  } catch (error) {
    return (
      logForDebugging("[output-limit-recovery] exhausted-error build threw; surfacing the withheld error", {
        level: "warn",
      }),
      logError(error),
      withheld
    );
  }
}
/**
 * 上报输出上限恢复的结果。
 */
//@ chunk-ha3km179.js:145065-145666 placement
function reportOutputLimitRecovery({
  transition: transition,
  resumed: resumed,
  request: request,
  responses: responses,
  withheld: withheld,
}) {
  try {
    if (transition?.reason !== "max_output_tokens_recovery" || resumed) return;
    let at = responses.at(-1);
    if (at?.isApiErrorMessage) {
      if (at !== withheld)
        logFeatureBad("query_output_limit_recovery", "continuation_failed", { attempt: transition.attempt });
      return;
    }
    let last = request.findLast(
      (M) =>
        M.type === "user" &&
        (M.message.content === TIt || M.message.content === OUTPUT_LIMIT_RESUME || M.message.content === oXt),
    );
    if (at === void 0 || last?.type !== "user") return;
    logFeatureOk("query_output_limit_recovery", {
      attempt: transition.attempt,
      ...($r() && { thinking_discarded: last.message.content === TIt }),
    });
  } catch (error) {
    (logForDebugging("[output-limit-recovery] outcome count threw", { level: "warn" }), logError(error));
  }
}
/**
 * 输出上限恢复重试时发出 agent-mode 事件（含尝试次数）。
 */
//@ chunk-ha3km179.js:145666-145926 placement
function announceOutputLimitRecovery(e, n) {
  try {
    if (n !== void 0 || e?.reason !== "max_output_tokens_recovery") return;
    h0e.emit({
      kind: "agent-mode",
      agentId: mainAgentId(),
      mode: "requesting",
      outputLimitRecovery: { attempt: e.attempt, limit: Kr },
    });
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "output-limit recovery announcement failed"));
  }
}
/**
 * 最后一条因 max_tokens 结束，且全部内容都是思考块。
 */
//@ chunk-ha3km179.js:145926-146115 placement
function endsWithThinkingOnly(e) {
  let filtered = e.filter((r) => !r.isApiErrorMessage);
  return (
    filtered.at(-1)?.message.stop_reason === "max_tokens" &&
    filtered.every((r) => r.message.content.length > 0 && r.message.content.every((s) => isThinkingBlock(s)))
  );
}
/**
 * 上报 tengu_turn_end（终止原因、错误类型、是否有目标）。
 */
//@ chunk-ha3km179.js:146115-146655 placement
function reportTurnEnd({
  terminal: terminal,
  querySource: querySource,
  agentContext: agentContext,
  hasActiveGoal: hasActiveGoal,
  startedAt: startedAt,
}) {
  try {
    let y = classifyQuerySource(querySource);
    logEvent("tengu_turn_end", {
      terminal_reason: fromEnum(terminal.reason),
      error_kind: fromEnumOpt(terminal.reason === "api_error" ? (terminal.errorKind ?? "unknown") : void 0),
      is_error: isErrorTerminalReason(terminal.reason),
      turn_count: terminal.reason === "max_turns" ? terminal.turnCount : void 0,
      is_subagent: isNonMainSessionSubagent(agentContext),
      goal_active: y === "main" && isMainAgent(agentContext) && hasActiveGoal,
      duration_ms: Math.max(0, Math.round(performance.now() - startedAt)),
      query_source: agentTypeForTelemetry(querySource),
      query_source_category: fromEnumOpt(y),
    });
  } catch (error) {
    logForDebugging(`tengu_turn_end: analytics sink threw, event dropped: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
/**
 * 模型回退记录（来源、目标、是否全部过载）。
 */
//@ chunk-ha3km179.js:146655-146774 placement
function newFallbackRecord(e, n, r, s) {
  return {
    fromModel: e,
    toModel: n,
    toModelIsConfigured: r,
    leftModels: [e],
    allOverloaded: s === "overloaded",
  };
}
/**
 * 连续回退时合并回退记录。
 */
//@ chunk-ha3km179.js:146774-146946 placement
function chainFallbackRecord(e, n) {
  return e?.toModel === n.fromModel
    ? {
        ...n,
        fromModel: e.fromModel,
        leftModels: [...e.leftModels, ...n.leftModels],
        allOverloaded: e.allOverloaded && n.allOverloaded,
      }
    : n;
}
/**
 * 回退到上下文窗口更小的模型时生成说明后缀。
 */
//@ chunk-ha3km179.js:146946-147205 placement
function describeFallbackWindow(e, n) {
  try {
    let r = zu(e),
      s = canFallBackToConfiguredFamily(n, e.fromModel);
    return {
      ...r,
      noticeSuffix:
        r.toWindow >= r.fromWindow
          ? ""
          : ` \xB7 context window ${_n(r.fromWindow)} \u2192 ${_n(r.toWindow)} tokens` +
            (s === void 0 ? "" : ` (to keep ${_n(r.fromWindow)}, ${s})`),
    };
  } catch (error) {
    logError(error);
    return;
  }
}
/**
 * 回退到上下文窗口更小的模型时生成说明。
 */
//@ chunk-ha3km179.js:147205-147994 placement
function fallbackWindowNotice({
  fallback: fallback,
  mainLoopModel: mainLoopModel,
  configuredWindow: configuredWindow,
}) {
  let s = { content: AUTOCOMPACT_THRASHING_NOTICE, afterShrinkingFallback: !1 };
  if (fallback === void 0 || fallback.toModel !== mainLoopModel) return s;
  try {
    let h = zu(fallback);
    if (
      h.toWindow >= h.fromWindow ||
      getAutoCompactWindow(getModelContextInfo(fallback.toModel), configuredWindow).window >=
        getAutoCompactWindow(getModelContextInfo(fallback.fromModel), configuredWindow).window
    )
      return s;
    let y = renderModelName(fallback.fromModel),
      S = canFallBackToConfiguredFamily(fallback, fallback.fromModel);
    return {
      content:
        `${AUTOCOMPACT_THRASHING_TEXT} The likely cause: while working on this response, Claude Code fell back from ${y} to ${renderModelName(fallback.toModel)} and runs that model with a ${_n(h.toWindow)}-token context window on your provider, instead of ${_n(h.fromWindow)}. Your next message tries ${y} first. ` +
        (S === void 0
          ? `To avoid this, use a fallback model with a ${_n(h.fromWindow)} context window, or use /clear to start fresh.`
          : `To keep ${_n(h.fromWindow)}, ${S}.`),
      afterShrinkingFallback: !0,
    };
  } catch (error) {
    return (logError(error), s);
  }
}
//@ chunk-ha3km179.js:147994-148082 placement
function zu(e) {
  let n = getSdkBetas();
  return { fromWindow: getContextWindow(e.fromModel, n), toWindow: getContextWindow(e.toModel, n) };
}
/**
 * 所有模型过载时能否回退到配置的同族模型。
 */
//@ chunk-ha3km179.js:148082-148417 placement
function canFallBackToConfiguredFamily(e, n) {
  if (!e.toModelIsConfigured || !has1mSuffix(n) || !e.allOverloaded) return;
  let r = append1mSuffixIfMissing(e.toModel);
  if (e.leftModels.some((leftModel) => leftModel.toLowerCase() === r.toLowerCase())) return;
  let s = getCanonicalName(r),
    h = modelFamilyOf(r, s);
  return (h === "opus"
    ? shouldProbeThirdPartyDefaults()
    : h === "sonnet"
      ? shouldProbeThirdPartyDefaultsAlt()
      : !0) && getCatalogEntry(Lt(s))?.context?.supports_1m_beta === !0
    ? `use ${r} for this entry in your fallback model list`
    : void 0;
}
//@ chunk-ha3km179.js:148417-148459 placement
function _n(e) {
  return formatTokens(e).toUpperCase();
}
//@ chunk-ha3km179.js:148459-148619 placement
var IMAGE_ERROR_TOOL_CANCEL_TEXT =
  "An image in this turn could not be sent to the API, so this tool call was cancelled. If it had already started, some of its effects may have happened.";
/**
 * 回合出错导致工具调用取消的说明。
 */
//@ chunk-ha3km179.js:148619-148781 placement
function turnErrorToolCancelText(e) {
  return `The turn ended on an error, so this tool call was cancelled. If it had already started, some of its effects may have happened. Error: ${e}`;
}
//@ chunk-ha3km179.js:148781-148961 placement
var TOOL_CANCEL_FAILURE_MESSAGES = {
  safety_monitor_block: "tool cancel failed after safety monitor block",
  image_error: "tool cancel failed after image error",
  model_error: "tool cancel failed after model error",
};
/**
 * 重置流式工具执行器，取回已完成结果。
 */
//@ chunk-ha3km179.js:148961-149283 placement
function resetStreamingToolExecutor(e, n) {
  let r = new Set(toolResultIds(e)),
    s = [];
  try {
    s = e.streamingToolExecutor.takeFinishedResults();
    let { removes: removes } = discardInFlightTools(e.streamingToolExecutor, n);
    return (
      e.rebuildStreamingToolExecutor(),
      { removes: removes, answeredToolUseIds: r, finishedResults: s }
    );
  } catch (error) {
    return (
      logError(withTelemetryMessage(toError(error), TOOL_CANCEL_FAILURE_MESSAGES[n])),
      { removes: void 0, answeredToolUseIds: r, finishedResults: s }
    );
  }
}
/**
 * 已有结果（含 hook_deferred_tool 附件）的工具调用 id。
 */
//@ chunk-ha3km179.js:149283-149448 placement
function completedToolUseIds(e) {
  return new Set([
    ...toolResultIds(e),
    ...e.toolResults.flatMap((toolResult) =>
      toolResult.type === "attachment" && toolResult.attachment.type === "hook_deferred_tool"
        ? [toolResult.attachment.toolUseID]
        : [],
    ),
  ]);
}
/**
 * 工具结果中的 tool_use_id 列表。
 */
//@ chunk-ha3km179.js:149448-149629 placement
function toolResultIds(e) {
  return e.toolResults.flatMap((toolResult) =>
    toolResult.type === "user" && Array.isArray(toolResult.message.content)
      ? toolResult.message.content.filter((r) => r.type === "tool_result").map((r) => r.tool_use_id)
      : [],
  );
}
//@ chunk-ha3km179.js:149629-149773 placement
var SAFETY_BLOCK_TOOL_CANCEL_TEXT =
  "A safety monitor blocked this turn, so this tool call was cancelled. If it had already started, some of its effects may have happened.";

export {
  reportTurnEnd,
  INITIAL_LOOP_RECOVERY_STATE,
  announceOutputLimitRecovery,
  fallbackWindowNotice,
  resetStreamingToolExecutor,
  IMAGE_ERROR_TOOL_CANCEL_TEXT,
  turnErrorToolCancelText,
  completedToolUseIds,
  newFallbackRecord,
  chainFallbackRecord,
  describeFallbackWindow,
  SAFETY_BLOCK_TOOL_CANCEL_TEXT,
  reportOutputLimitRecovery,
  Kr,
  shouldNudgeOutputLimitResume,
  recoverExhaustedOutput,
  INITIAL_RECOVERY_STATE,
};
