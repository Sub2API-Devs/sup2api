/**
 * query/outputLimitRecovery.ts
 *
 * 2.1.316 新增：回退到上下文窗口更小的模型时生成说明；输出上限恢复耗尽时的处理（丢弃思考或继续）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-w3ch4xq2.js (26)
 * attribution: placement 23, layout 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-w3ch4xq2.js:152465-152680 placement
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
  emptyCompletionResent: false,
  malformedToolUseRetryCount: 0,
  stopHookBlockingCount: 0,
};
//@ chunk-w3ch4xq2.js:152680-152703 placement
/**
 * 恒 false
 */
function alwaysFalse() {
  return false;
}
//@ chunk-w3ch4xq2.js:152703-152775 placement
/**
 * 3
 */
var MAX_CONTINUE_ATTEMPTS = 3;
var THINKING_LIMIT_NOTE = " The last attempt reached the limit while still thinking.";
//@ chunk-w3ch4xq2.js:152775-153286 placement
/**
 * 输出达到 max_tokens 时是否用提示让模型继续（tengu_rosy_pebble）。
 */
function shouldNudgeOutputLimitResume(responses, attempt, querySource) {
  try {
    let endsWithThinking = endsWithThinkingOnly(responses);
    let message = responses.findLast((message) => !message.isApiErrorMessage)?.message;
    let last = message?.content.at(-1);
    let reopenBlock =
      message?.stop_reason === "max_tokens" &&
      last?.type === "text" &&
      last.text.trim() !== "" &&
      classifyQuerySource(querySource) === "main" &&
      isClaudeAiChatCowork() &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_rosy_pebble", false);
    logFeatureSad(
      "query_output_limit_recovery",
      endsWithThinking ? "nudged_thinking_discarded" : "nudged_resume",
      reopenBlock
        ? {
            attempt,
            nudge_name: lit("reopen_block"),
          }
        : {
            attempt,
          },
    );
    if (reopenBlock) return OUTPUT_LIMIT_CUT_TEXT;
    return endsWithThinking && alwaysFalse() ? OUTPUT_LIMIT_REASONING_RESUME_TEXT : OUTPUT_LIMIT_RESUME;
  } catch (error) {
    logForDebugging("[output-limit-recovery] nudge choice threw; keeping the resume nudge", {
      level: "warn",
    });
    logError(error);
    return OUTPUT_LIMIT_RESUME;
  }
}
//@ chunk-w3ch4xq2.js:153286-154002 placement
/**
 * 输出上限恢复耗尽时的处理（丢弃思考或继续）。
 */
function recoverExhaustedOutput({ withheld, responses, model, isNonInteractiveSession, agentId }) {
  try {
    let endsThinkingOnly = endsWithThinkingOnly(responses);
    logFeatureBad(
      "query_output_limit_recovery",
      endsThinkingOnly ? "exhausted_thinking_discarded" : "exhausted_resume",
    );
    let firstBlock = withheld.message.content[0];
    if (
      !endsThinkingOnly ||
      !alwaysFalse() ||
      withheld.message.content.length !== 1 ||
      firstBlock?.type !== "text" ||
      responses.findLast((response) => !response.isApiErrorMessage)?.effort === EFFORT_LEVELS[0] ||
      !modelSupportsEffort(model)
    )
      return withheld;
    let effortHintPath =
      !isNonInteractiveSession && agentId === undefined && canSuggestSlashCommands()
        ? artifactPathPrefix("effort")
        : undefined;
    let effortHint =
      effortHintPath === undefined
        ? " Lower the effort level to leave room for a reply."
        : ` Lower the effort level with ${effortHintPath} to leave room for a reply.`;
    return {
      ...withheld,
      message: {
        ...withheld.message,
        content: [
          {
            ...firstBlock,
            text: firstBlock.text + THINKING_LIMIT_NOTE + effortHint,
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
//@ chunk-w3ch4xq2.js:154002-154603 placement
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
      (message) =>
        message.type === "user" &&
        (message.message.content === OUTPUT_LIMIT_REASONING_RESUME_TEXT ||
          message.message.content === OUTPUT_LIMIT_RESUME ||
          message.message.content === OUTPUT_LIMIT_CUT_TEXT),
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
//@ chunk-w3ch4xq2.js:154603-154863 placement
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
//@ chunk-w3ch4xq2.js:154863-155052 placement
/**
 * 最后一条因 max_tokens 结束，且全部内容都是思考块。
 */
function endsWithThinkingOnly(responses) {
  let filtered = responses.filter((response) => !response.isApiErrorMessage);
  return (
    filtered.at(-1)?.message.stop_reason === "max_tokens" &&
    filtered.every(
      (response) =>
        response.message.content.length > 0 &&
        response.message.content.every((block) => isThinkingBlock(block)),
    )
  );
}
//@ chunk-w3ch4xq2.js:155052-155119 layout
async function drainIfStopsAtToolGap(stopsAtToolGap) {
  try {
    return await stopsAtToolGap();
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-w3ch4xq2.js:155119-155659 placement
/**
 * 上报 tengu_turn_end（终止原因、错误类型、是否有目标）。
 */
function reportTurnEnd({ terminal, querySource, agentContext, hasActiveGoal, startedAt }) {
  try {
    let sourceKind = classifyQuerySource(querySource);
    logEvent("tengu_turn_end", {
      terminal_reason: fromEnum(terminal.reason),
      error_kind: fromEnumOpt(
        terminal.reason === "api_error" ? (terminal.errorKind ?? "unknown") : undefined,
      ),
      is_error: isErrorTerminalReason(terminal.reason),
      turn_count: terminal.reason === "max_turns" ? terminal.turnCount : undefined,
      is_subagent: isNonMainSessionSubagent(agentContext),
      goal_active: sourceKind === "main" && isMainAgent(agentContext) && hasActiveGoal,
      duration_ms: Math.max(0, Math.round(performance.now() - startedAt)),
      query_source: agentTypeForTelemetry(querySource),
      query_source_category: fromEnumOpt(sourceKind),
    });
  } catch (error) {
    logForDebugging(`tengu_turn_end: analytics sink threw, event dropped: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-w3ch4xq2.js:155659-155798 layout
function fixStopSequence(event) {
  try {
    if (event.message.stop_reason === "stop_sequence") {
      event.message.stop_reason = "tool_use";
      event.message.stop_sequence = null;
    }
  } catch (error) {
    logError(error);
  }
}
//@ chunk-w3ch4xq2.js:155798-155940 layout
function fixOutgoingStopReason(event, attemptState) {
  if (
    event.isApiErrorMessage &&
    attemptState.needsFollowUp &&
    attemptState.toolRequestedEndTurn === false &&
    !attemptState.shouldPreventContinuation &&
    !attemptState.toolWasDeferred
  )
    fixStopSequence(event);
}
//@ chunk-w3ch4xq2.js:155940-156059 placement
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
//@ chunk-w3ch4xq2.js:156059-156231 placement
/**
 * 连续回退时合并回退记录。
 */
function chainFallbackRecord(previousRecord, fallbackRecord) {
  return previousRecord?.toModel === fallbackRecord.fromModel
    ? {
        ...fallbackRecord,
        fromModel: previousRecord.fromModel,
        leftModels: [...previousRecord.leftModels, ...fallbackRecord.leftModels],
        allOverloaded: previousRecord.allOverloaded && fallbackRecord.allOverloaded,
      }
    : fallbackRecord;
}
//@ chunk-w3ch4xq2.js:156231-156490 placement
/**
 * 回退到上下文窗口更小的模型时生成说明后缀。
 */
function describeFallbackWindow(fallbackRecord, previousRecord) {
  try {
    let windows = contextWindowsOf(fallbackRecord);
    let keepHint = canFallBackToConfiguredFamily(previousRecord, fallbackRecord.fromModel);
    return {
      ...windows,
      noticeSuffix:
        windows.toWindow >= windows.fromWindow
          ? ""
          : ` \xB7 context window ${formatCompactTokens(windows.fromWindow)} \u2192 ${formatCompactTokens(windows.toWindow)} tokens` +
            (keepHint === undefined
              ? ""
              : ` (to keep ${formatCompactTokens(windows.fromWindow)}, ${keepHint})`),
    };
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-w3ch4xq2.js:156490-157279 placement
/**
 * 回退到上下文窗口更小的模型时生成说明。
 */
function fallbackWindowNotice({ fallback, mainLoopModel, configuredWindow }) {
  let plainNotice = {
    content: AUTOCOMPACT_THRASHING_NOTICE,
    afterShrinkingFallback: false,
  };
  if (fallback === undefined || fallback.toModel !== mainLoopModel) return plainNotice;
  try {
    let windows = contextWindowsOf(fallback);
    if (
      windows.toWindow >= windows.fromWindow ||
      getAutoCompactWindow(getModelContextInfo(fallback.toModel), configuredWindow).window >=
        getAutoCompactWindow(getModelContextInfo(fallback.fromModel), configuredWindow).window
    )
      return plainNotice;
    let fromModelName = renderModelName(fallback.fromModel);
    let keepHint = canFallBackToConfiguredFamily(fallback, fallback.fromModel);
    return {
      content:
        `${AUTOCOMPACT_THRASHING_TEXT} The likely cause: while working on this response, Claude Code fell back from ${fromModelName} to ${renderModelName(fallback.toModel)} and runs that model with a ${formatCompactTokens(windows.toWindow)}-token context window on your provider, instead of ${formatCompactTokens(windows.fromWindow)}. Your next message tries ${fromModelName} first. ` +
        (keepHint === undefined
          ? `To avoid this, use a fallback model with a ${formatCompactTokens(windows.fromWindow)} context window, or use /clear to start fresh.`
          : `To keep ${formatCompactTokens(windows.fromWindow)}, ${keepHint}.`),
      afterShrinkingFallback: true,
    };
  } catch (error) {
    logError(error);
    return plainNotice;
  }
}
//@ chunk-w3ch4xq2.js:157279-157367 placement
/**
 * 两个模型的上下文窗口
 */
function contextWindowsOf(fallbackRecord) {
  let sdkBetas = getSdkBetas();
  return {
    fromWindow: getContextWindow(fallbackRecord.fromModel, sdkBetas),
    toWindow: getContextWindow(fallbackRecord.toModel, sdkBetas),
  };
}
//@ chunk-w3ch4xq2.js:157367-157702 placement
/**
 * 所有模型过载时能否回退到配置的同族模型。
 */
function canFallBackToConfiguredFamily(fallbackRecord, fromModel) {
  if (!fallbackRecord.toModelIsConfigured || !has1mSuffix_2(fromModel) || !fallbackRecord.allOverloaded)
    return;
  let familyModel = append1mSuffixIfMissing(fallbackRecord.toModel);
  if (fallbackRecord.leftModels.some((leftModel) => leftModel.toLowerCase() === familyModel.toLowerCase()))
    return;
  let canonicalName = getCanonicalName(familyModel);
  let family = modelFamilyOf(familyModel, canonicalName);
  return (family === "opus"
    ? shouldProbeThirdPartyDefaults()
    : family === "sonnet"
      ? shouldProbeThirdPartyDefaultsAlt()
      : true) && getCatalogEntry(strip1mSuffix(canonicalName))?.context?.supports_1m_beta === true
    ? `use ${familyModel} for this entry in your fallback model list`
    : undefined;
}
//@ chunk-w3ch4xq2.js:157702-157744 placement
/**
 * 紧凑 token 文本
 */
function formatCompactTokens(tokenCount) {
  return formatTokens(tokenCount).toUpperCase();
}
//@ chunk-w3ch4xq2.js:157744-157904 placement
var IMAGE_ERROR_TOOL_CANCEL_TEXT =
  "An image in this turn could not be sent to the API, so this tool call was cancelled. If it had already started, some of its effects may have happened.";
//@ chunk-w3ch4xq2.js:157904-158066 placement
/**
 * 回合出错导致工具调用取消的说明。
 */
function turnErrorToolCancelText(errorText) {
  return `The turn ended on an error, so this tool call was cancelled. If it had already started, some of its effects may have happened. Error: ${errorText}`;
}
//@ chunk-w3ch4xq2.js:158066-158246 placement
var TOOL_CANCEL_FAILURE_MESSAGES = {
  safety_monitor_block: "tool cancel failed after safety monitor block",
  image_error: "tool cancel failed after image error",
  model_error: "tool cancel failed after model error",
};
//@ chunk-w3ch4xq2.js:158246-158568 placement
/**
 * 重置流式工具执行器，取回已完成结果。
 */
function resetStreamingToolExecutor(attemptState, cancelReason) {
  let answeredToolUseIds = new Set(toolResultIds(attemptState));
  let finishedResults = [];
  try {
    finishedResults = attemptState.streamingToolExecutor.takeFinishedResults();
    let { removes } = discardInFlightTools(attemptState.streamingToolExecutor, cancelReason);
    attemptState.rebuildStreamingToolExecutor();
    return {
      removes,
      answeredToolUseIds,
      finishedResults,
    };
  } catch (error) {
    logError(withTelemetryMessage(toError(error), TOOL_CANCEL_FAILURE_MESSAGES[cancelReason]));
    return {
      removes: undefined,
      answeredToolUseIds,
      finishedResults,
    };
  }
}
//@ chunk-w3ch4xq2.js:158568-158733 placement
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
//@ chunk-w3ch4xq2.js:158733-158914 placement
/**
 * 工具结果中的 tool_use_id 列表。
 */
function toolResultIds(attemptState) {
  return attemptState.toolResults.flatMap((toolResult) =>
    toolResult.type === "user" && Array.isArray(toolResult.message.content)
      ? toolResult.message.content
          .filter((block) => block.type === "tool_result")
          .map((block) => block.tool_use_id)
      : [],
  );
}
//@ chunk-w3ch4xq2.js:158914-159058 placement
var SAFETY_BLOCK_TOOL_CANCEL_TEXT =
  "A safety monitor blocked this turn, so this tool call was cancelled. If it had already started, some of its effects may have happened.";
export {
  reportTurnEnd,
  INITIAL_LOOP_RECOVERY_STATE,
  drainIfStopsAtToolGap,
  announceOutputLimitRecovery,
  fallbackWindowNotice,
  resetStreamingToolExecutor,
  IMAGE_ERROR_TOOL_CANCEL_TEXT,
  turnErrorToolCancelText,
  completedToolUseIds,
  fixStopSequence,
  fixOutgoingStopReason,
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
