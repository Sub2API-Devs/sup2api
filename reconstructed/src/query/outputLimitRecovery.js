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
import {
  OUTPUT_LIMIT_CUT_TEXT,
  OUTPUT_LIMIT_REASONING_RESUME_TEXT,
  OUTPUT_LIMIT_RESUME,
  isThinkingBlock,
} from "../utils/messages.js";
import { logForDebugging } from "../utils/debug.js";
import { logError } from "../utils/log.js";
import { EFFORT_LEVELS, modelSupportsEffort } from "../utils/effort.js";
import { canSuggestSlashCommands } from "../services/api/errors.js";
import { artifactPathPrefix } from "../services/artifacts/artifactMount.js";
import { lazyCommandRunSignal } from "../plugins/functionHooks/commandRunDispatch.js";
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
import { has1mSuffix_2 } from "../utils/model/contextWindow1m.js";
import { append1mSuffixIfMissing } from "../utils/model/planModeModel.js";
import { getCanonicalName } from "../utils/model/canonicalModelName.js";
import { modelFamilyOf } from "../utils/model/providers.js";
import {
  shouldProbeThirdPartyDefaults,
  shouldProbeThirdPartyDefaultsAlt,
} from "../utils/model/thirdPartyModelDefaults.js";
import { getCatalogEntry } from "../utils/model/modelCatalog.js";
import { strip1mSuffix } from "../utils/model/modelIds.js";
import { formatTokens } from "../utils/format.js";
import { discardInFlightTools } from "../services/tools/StreamingToolExecutor.js";

//@ chunk-ha3km179.js:143553-143743 placement
/**
 * 输出上限/反应式压缩恢复计数的初始值。
 */
var INITIAL_RECOVERY_STATE = {
  maxOutputTokensRecoveryCount: 0,
  hasAttemptedReactiveCompact: false,
  reactiveCompactDeeperPass: "none",
};
var INITIAL_LOOP_RECOVERY_STATE = {
  ...INITIAL_RECOVERY_STATE,
  thinkingOnlyNudged: false,
  malformedToolUseRetryCount: 0,
  stopHookBlockingCount: 0,
};
//@ chunk-ha3km179.js:143743-143766 placement
/**
 * 恒 false
 */
function alwaysFalse() {
  return false;
}
//@ chunk-ha3km179.js:143766-143838 placement
/**
 * 3
 */
var MAX_CONTINUE_ATTEMPTS = 3;
var THINKING_LIMIT_NOTE = " The last attempt reached the limit while still thinking.";
//@ chunk-ha3km179.js:143838-144349 placement
/**
 * 输出达到 max_tokens 时是否用提示让模型继续（tengu_rosy_pebble）。
 */
function shouldNudgeOutputLimitResume(assistantMessages, attempt, querySource) {
  try {
    let s = endsWithThinkingOnly(assistantMessages);
    let message = assistantMessages.findLast((M) => !M.isApiErrorMessage)?.message;
    let last = message?.content.at(-1);
    let S =
      message?.stop_reason === "max_tokens" &&
      last?.type === "text" &&
      last.text.trim() !== "" &&
      classifyQuerySource(querySource) === "main" &&
      isClaudeAiChatCowork() &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_rosy_pebble", false);
    logFeatureSad(
      "query_output_limit_recovery",
      s ? "nudged_thinking_discarded" : "nudged_resume",
      S
        ? {
            attempt,
            nudge_name: lit("reopen_block"),
          }
        : {
            attempt,
          },
    );
    if (S) return OUTPUT_LIMIT_CUT_TEXT;
    return s && alwaysFalse() ? OUTPUT_LIMIT_REASONING_RESUME_TEXT : OUTPUT_LIMIT_RESUME;
  } catch (error) {
    logForDebugging("[output-limit-recovery] nudge choice threw; keeping the resume nudge", {
      level: "warn",
    });
    logError(error);
    return OUTPUT_LIMIT_RESUME;
  }
}
//@ chunk-ha3km179.js:144349-145065 placement
/**
 * 输出上限恢复耗尽时的处理（丢弃思考或继续）。
 */
function recoverExhaustedOutput({ withheld, responses, model, isNonInteractiveSession, agentId }) {
  try {
    let y = endsWithThinkingOnly(responses);
    logFeatureBad("query_output_limit_recovery", y ? "exhausted_thinking_discarded" : "exhausted_resume");
    let S = withheld.message.content[0];
    if (
      !y ||
      !alwaysFalse() ||
      withheld.message.content.length !== 1 ||
      S?.type !== "text" ||
      responses.findLast((response) => !response.isApiErrorMessage)?.effort === EFFORT_LEVELS[0] ||
      !modelSupportsEffort(model)
    )
      return withheld;
    let M =
      !isNonInteractiveSession && agentId === undefined && canSuggestSlashCommands()
        ? artifactPathPrefix("effort")
        : undefined;
    let R =
      M === undefined
        ? " Lower the effort level to leave room for a reply."
        : ` Lower the effort level with ${M} to leave room for a reply.`;
    return {
      ...withheld,
      message: {
        ...withheld.message,
        content: [
          {
            ...S,
            text: S.text + THINKING_LIMIT_NOTE + R,
          },
        ],
      },
    };
  } catch (error) {
    logForDebugging("[output-limit-recovery] exhausted-error build threw; surfacing the withheld error", {
      level: "warn",
    });
    logError(error);
    return withheld;
  }
}
//@ chunk-ha3km179.js:145065-145666 placement
/**
 * 上报输出上限恢复的结果。
 */
function reportOutputLimitRecovery({ transition, resumed, request, responses, withheld }) {
  try {
    if (transition?.reason !== "max_output_tokens_recovery" || resumed) return;
    let last = responses.at(-1);
    if (last?.isApiErrorMessage) {
      if (last !== withheld)
        logFeatureBad("query_output_limit_recovery", "continuation_failed", {
          attempt: transition.attempt,
        });
      return;
    }
    let last_2 = request.findLast(
      (M) =>
        M.type === "user" &&
        (M.message.content === OUTPUT_LIMIT_REASONING_RESUME_TEXT ||
          M.message.content === OUTPUT_LIMIT_RESUME ||
          M.message.content === OUTPUT_LIMIT_CUT_TEXT),
    );
    if (last === undefined || last_2?.type !== "user") return;
    logFeatureOk("query_output_limit_recovery", {
      attempt: transition.attempt,
      ...(alwaysFalse() && {
        thinking_discarded: last_2.message.content === OUTPUT_LIMIT_REASONING_RESUME_TEXT,
      }),
    });
  } catch (error) {
    logForDebugging("[output-limit-recovery] outcome count threw", {
      level: "warn",
    });
    logError(error);
  }
}
//@ chunk-ha3km179.js:145666-145926 placement
/**
 * 输出上限恢复重试时发出 agent-mode 事件（含尝试次数）。
 */
function announceOutputLimitRecovery(transition, agentId) {
  try {
    if (agentId !== undefined || transition?.reason !== "max_output_tokens_recovery") return;
    lazyCommandRunSignal.emit({
      kind: "agent-mode",
      agentId: mainAgentId(),
      mode: "requesting",
      outputLimitRecovery: {
        attempt: transition.attempt,
        limit: MAX_CONTINUE_ATTEMPTS,
      },
    });
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "output-limit recovery announcement failed"));
  }
}
//@ chunk-ha3km179.js:145926-146115 placement
/**
 * 最后一条因 max_tokens 结束，且全部内容都是思考块。
 */
function endsWithThinkingOnly(e) {
  let filtered = e.filter((r) => !r.isApiErrorMessage);
  return (
    filtered.at(-1)?.message.stop_reason === "max_tokens" &&
    filtered.every((r) => r.message.content.length > 0 && r.message.content.every((s) => isThinkingBlock(s)))
  );
}
//@ chunk-ha3km179.js:146115-146655 placement
/**
 * 上报 tengu_turn_end（终止原因、错误类型、是否有目标）。
 */
function reportTurnEnd({ terminal, querySource, agentContext, hasActiveGoal, startedAt }) {
  try {
    let y = classifyQuerySource(querySource);
    logEvent("tengu_turn_end", {
      terminal_reason: fromEnum(terminal.reason),
      error_kind: fromEnumOpt(
        terminal.reason === "api_error" ? (terminal.errorKind ?? "unknown") : undefined,
      ),
      is_error: isErrorTerminalReason(terminal.reason),
      turn_count: terminal.reason === "max_turns" ? terminal.turnCount : undefined,
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
//@ chunk-ha3km179.js:146655-146774 placement
/**
 * 模型回退记录（来源、目标、是否全部过载）。
 */
function newFallbackRecord(originalModel, toModel, toModelIsConfigured, reason) {
  return {
    fromModel: originalModel,
    toModel,
    toModelIsConfigured,
    leftModels: [originalModel],
    allOverloaded: reason === "overloaded",
  };
}
//@ chunk-ha3km179.js:146774-146946 placement
/**
 * 连续回退时合并回退记录。
 */
function chainFallbackRecord(e, fallbackRecord) {
  return e?.toModel === fallbackRecord.fromModel
    ? {
        ...fallbackRecord,
        fromModel: e.fromModel,
        leftModels: [...e.leftModels, ...fallbackRecord.leftModels],
        allOverloaded: e.allOverloaded && fallbackRecord.allOverloaded,
      }
    : fallbackRecord;
}
//@ chunk-ha3km179.js:146946-147205 placement
/**
 * 回退到上下文窗口更小的模型时生成说明后缀。
 */
function describeFallbackWindow(fallbackRecord, n) {
  try {
    let r = contextWindowsOf(fallbackRecord);
    let s = canFallBackToConfiguredFamily(n, fallbackRecord.fromModel);
    return {
      ...r,
      noticeSuffix:
        r.toWindow >= r.fromWindow
          ? ""
          : ` \xB7 context window ${formatCompactTokens(r.fromWindow)} \u2192 ${formatCompactTokens(r.toWindow)} tokens` +
            (s === undefined ? "" : ` (to keep ${formatCompactTokens(r.fromWindow)}, ${s})`),
    };
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-ha3km179.js:147205-147994 placement
/**
 * 回退到上下文窗口更小的模型时生成说明。
 */
function fallbackWindowNotice({ fallback, mainLoopModel, configuredWindow }) {
  let s = {
    content: AUTOCOMPACT_THRASHING_NOTICE,
    afterShrinkingFallback: false,
  };
  if (fallback === undefined || fallback.toModel !== mainLoopModel) return s;
  try {
    let h = contextWindowsOf(fallback);
    if (
      h.toWindow >= h.fromWindow ||
      getAutoCompactWindow(getModelContextInfo(fallback.toModel), configuredWindow).window >=
        getAutoCompactWindow(getModelContextInfo(fallback.fromModel), configuredWindow).window
    )
      return s;
    let y = renderModelName(fallback.fromModel);
    let S = canFallBackToConfiguredFamily(fallback, fallback.fromModel);
    return {
      content:
        `${AUTOCOMPACT_THRASHING_TEXT} The likely cause: while working on this response, Claude Code fell back from ${y} to ${renderModelName(fallback.toModel)} and runs that model with a ${formatCompactTokens(h.toWindow)}-token context window on your provider, instead of ${formatCompactTokens(h.fromWindow)}. Your next message tries ${y} first. ` +
        (S === undefined
          ? `To avoid this, use a fallback model with a ${formatCompactTokens(h.fromWindow)} context window, or use /clear to start fresh.`
          : `To keep ${formatCompactTokens(h.fromWindow)}, ${S}.`),
      afterShrinkingFallback: true,
    };
  } catch (error) {
    logError(error);
    return s;
  }
}
//@ chunk-ha3km179.js:147994-148082 placement
/**
 * 两个模型的上下文窗口
 */
function contextWindowsOf(e) {
  let sdkBetas = getSdkBetas();
  return {
    fromWindow: getContextWindow(e.fromModel, sdkBetas),
    toWindow: getContextWindow(e.toModel, sdkBetas),
  };
}
//@ chunk-ha3km179.js:148082-148417 placement
/**
 * 所有模型过载时能否回退到配置的同族模型。
 */
function canFallBackToConfiguredFamily(e, fromModel) {
  if (!e.toModelIsConfigured || !has1mSuffix_2(fromModel) || !e.allOverloaded) return;
  let r = append1mSuffixIfMissing(e.toModel);
  if (e.leftModels.some((leftModel) => leftModel.toLowerCase() === r.toLowerCase())) return;
  let canonicalName = getCanonicalName(r);
  let h = modelFamilyOf(r, canonicalName);
  return (h === "opus"
    ? shouldProbeThirdPartyDefaults()
    : h === "sonnet"
      ? shouldProbeThirdPartyDefaultsAlt()
      : true) && getCatalogEntry(strip1mSuffix(canonicalName))?.context?.supports_1m_beta === true
    ? `use ${r} for this entry in your fallback model list`
    : undefined;
}
//@ chunk-ha3km179.js:148417-148459 placement
/**
 * 紧凑 token 文本
 */
function formatCompactTokens(e) {
  return formatTokens(e).toUpperCase();
}
//@ chunk-ha3km179.js:148459-148619 placement
var IMAGE_ERROR_TOOL_CANCEL_TEXT =
  "An image in this turn could not be sent to the API, so this tool call was cancelled. If it had already started, some of its effects may have happened.";
//@ chunk-ha3km179.js:148619-148781 placement
/**
 * 回合出错导致工具调用取消的说明。
 */
function turnErrorToolCancelText(e) {
  return `The turn ended on an error, so this tool call was cancelled. If it had already started, some of its effects may have happened. Error: ${e}`;
}
//@ chunk-ha3km179.js:148781-148961 placement
var TOOL_CANCEL_FAILURE_MESSAGES = {
  safety_monitor_block: "tool cancel failed after safety monitor block",
  image_error: "tool cancel failed after image error",
  model_error: "tool cancel failed after model error",
};
//@ chunk-ha3km179.js:148961-149283 placement
/**
 * 重置流式工具执行器，取回已完成结果。
 */
function resetStreamingToolExecutor(attemptState, n) {
  let answeredToolUseIds = new Set(toolResultIds(attemptState));
  let finishedResults = [];
  try {
    finishedResults = attemptState.streamingToolExecutor.takeFinishedResults();
    let { removes } = discardInFlightTools(attemptState.streamingToolExecutor, n);
    attemptState.rebuildStreamingToolExecutor();
    return {
      removes,
      answeredToolUseIds,
      finishedResults,
    };
  } catch (error) {
    logError(withTelemetryMessage(toError(error), TOOL_CANCEL_FAILURE_MESSAGES[n]));
    return {
      removes: undefined,
      answeredToolUseIds,
      finishedResults,
    };
  }
}
//@ chunk-ha3km179.js:149283-149448 placement
/**
 * 已有结果（含 hook_deferred_tool 附件）的工具调用 id。
 */
function completedToolUseIds(attemptState) {
  return new Set([
    ...toolResultIds(attemptState),
    ...attemptState.toolResults.flatMap((toolResult) =>
      toolResult.type === "attachment" && toolResult.attachment.type === "hook_deferred_tool"
        ? [toolResult.attachment.toolUseID]
        : [],
    ),
  ]);
}
//@ chunk-ha3km179.js:149448-149629 placement
/**
 * 工具结果中的 tool_use_id 列表。
 */
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
  MAX_CONTINUE_ATTEMPTS,
  shouldNudgeOutputLimitResume,
  recoverExhaustedOutput,
  INITIAL_RECOVERY_STATE,
};
