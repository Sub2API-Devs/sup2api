/**
 * cli/print/resumeCacheWarm.ts
 *
 * resume 后预热提示缓存：按实验开关与入口类型决定是否启用，检查上下文与不安全条件，可重放时重放前缀并记录跳过原因（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (12)
 * attribution: placement 12
 */
import { env } from "../../utils/env.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getEntrypointKind } from "../../utils/entrypointKinds.js";
import { logError } from "../../utils/log.js";
import { isFirstPartyBetaTransportAllowed } from "../../utils/betas.js";
import { isWIFDispatchAuth, isClaudeAISubscriber } from "../../utils/auth.js";
import { getExtraBodyParams, getPromptCachingEnabled } from "../../services/api/claude.js";
import {
  estimateTokensWithAnchor,
  getAutoCompactThresholdTokens,
} from "../../services/compact/autoCompact.js";
import { logForDebugging } from "../../utils/debug.js";
import { sleep } from "../../utils/sleep.js";
import {
  getLastAssistantMessage,
  isNoResponseRequestedMessage,
  normalizeMessagesForAPI,
} from "../../utils/messages.js";
import { promptSnapshotUnlessRenderPoint } from "../../utils/contextAttachments/promptSnapshot.js";
import { messagesSinceCompactBoundary } from "../../services/projects/threadRows.js";
import { latestContextRendering } from "../../utils/claudemd/contextRouting.js";
import { canUseNoTransientReminders, hasServerToolHistory } from "../../services/api/tether.js";
import { getModelContextInfo } from "../../utils/model/modelContextInfo.js";
import { isAutoCompactEnabled } from "../../services/compact/compactSettings.js";
import { hasClearedToolResultsAfterIdle } from "../../services/compact/microCompact.js";
import { needsConsentOrCredits } from "../../utils/planTiers.js";
import { areLimitsObserved, probeQuotaStatus, getCurrentLimits } from "../../services/claudeAiLimits.js";
import { parseUserSpecifiedModel } from "../../utils/model/modelDisplay.js";
import { getTeleportCacheState } from "../../services/teleport/relayState.js";
import { runForkedAgent } from "../../utils/forkedAgent.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { APIUserAbortError } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { isShuttingDown } from "../../utils/gracefulShutdown.js";
import { getRecordedPhase } from "../../utils/startupTiming.js";
import { getCommandQueueSnapshot, isDrainableMainThreadCommand } from "../../utils/messageQueueManager.js";
import { modelSupportsThinking, modelSupportsAdaptiveThinking } from "../../utils/thinking.js";
import { getThinkingTypeOverride } from "../../bootstrap/state.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { extractDiscoveredToolNames } from "../../utils/toolSearch.js";
import { jsonStringifyRaw } from "../../utils/slowOperations.js";

//@ chunk-0yw3taqg.js:536924-537038 placement
var RESUME_CACHE_WARM_MAX_OUTPUT_TOKENS = 1;
var DEFAULT_RESUME_CACHE_WARM_CONFIG = {
  enabled: false,
  delayMs: 2000,
  minContextTokens: 1e4,
  entrypoints: ["remote_cowork"],
};
var TOOL_RESULTS_CLEAR_LOOKAHEAD_MS = 600000;
var INIT_WAIT_POLL_MS = 250;
var MAX_INIT_WAIT_MS = 6000;
//@ chunk-0yw3taqg.js:537038-537642 placement
/**
 * 解析 resume 预热开关：环境变量、实验配置与入口类型三者共同决定是否启用及延迟、上下文门槛与入口白名单。
 */
function getResumeCacheWarmConfig() {
  if (!env.CLAUDE_CODE_REMOTE) return null;
  if (env.CLAUDE_CODE_RESUME_CACHE_WARM === false) return null;
  if (isEssentialTrafficOnly()) return null;
  let isForced = env.CLAUDE_CODE_RESUME_CACHE_WARM === true;
  let rawConfig = getFeatureValue_CACHED_MAY_BE_STALE("tengu_resume_cache_warm_config", {}) ?? {};
  let config = {
    enabled: rawConfig.enabled === true,
    delayMs: coercePositiveInt(rawConfig.delayMs, DEFAULT_RESUME_CACHE_WARM_CONFIG.delayMs, 60000),
    minContextTokens: coercePositiveInt(
      rawConfig.minContextTokens,
      DEFAULT_RESUME_CACHE_WARM_CONFIG.minContextTokens,
      1e7,
    ),
    entrypoints:
      Array.isArray(rawConfig.entrypoints) &&
      rawConfig.entrypoints.every((entrypoint) => typeof entrypoint === "string")
        ? rawConfig.entrypoints
        : DEFAULT_RESUME_CACHE_WARM_CONFIG.entrypoints,
  };
  if (isForced) return config;
  if (!config.enabled) return null;
  let entrypointKind = getEntrypointKind();
  if (
    !config.entrypoints.includes("*") &&
    (entrypointKind === undefined || !config.entrypoints.includes(entrypointKind))
  )
    return null;
  return config;
}
//@ chunk-0yw3taqg.js:537642-537730 placement
function coercePositiveInt(value, fallback, maxValue) {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? Math.min(value, maxValue)
    : fallback;
}
//@ chunk-0yw3taqg.js:537730-538036 placement
/**
 * 在 resume 后延迟启动一次预热尝试，返回取消函数；预算上限或被中断回合救援时跳过。
 */
function scheduleResumeCacheWarm(state) {
  try {
    if (!env.CLAUDE_CODE_REMOTE || env.CLAUDE_CODE_RESUME_CACHE_WARM === false) return null;
    if (state.interruptedTurnRescueArmed) return null;
    if (state.maxBudgetUsd !== undefined) return null;
    let delayMs = getResumeCacheWarmConfig()?.delayMs ?? DEFAULT_RESUME_CACHE_WARM_CONFIG.delayMs;
    let timer = setTimeout(
      (warmState) => {
        warmResumeCache(warmState);
      },
      delayMs,
      state,
    );
    timer.unref?.();
    return () => clearTimeout(timer);
  } catch (error) {
    logError(error);
    return null;
  }
}
//@ chunk-0yw3taqg.js:538036-538121 placement
function canWarmResumeCache(params) {
  let hasTenant = params.tenant !== undefined;
  return (
    isFirstPartyBetaTransportAllowed(hasTenant) &&
    (hasTenant || !isWIFDispatchAuth()) &&
    !("betas" in getExtraBodyParams())
  );
}
//@ chunk-0yw3taqg.js:538121-541577 placement
/**
 * 预热主体的执行：检查上下文规模与各类不安全条件（侧查询标记、缓存关闭、tether、思考预算、掉落系统记录等），可行时重放提示以预热缓存，跳过原因都会记录。
 */
async function warmResumeCache(params) {
  let stage = "params_build";
  let contextTokens = 0;
  let didSend = false;
  try {
    let config = params.tenant ?? getResumeCacheWarmConfig();
    if (!config)
      return {
        kind: "off",
      };
    contextTokens = estimateTokensWithAnchor(params.messages);
    if (contextTokens < config.minContextTokens) {
      logForDebugging(
        `resume_cache_warm: skipped, context ${contextTokens} < ${config.minContextTokens} tokens`,
      );
      return {
        kind: "small",
        contextTokens,
      };
    }
    for (
      let waitedMs = 0;
      waitedMs < MAX_INIT_WAIT_MS && !params.isSessionInitialized() && getWarmBlockedReason(params) === null;
      waitedMs += INIT_WAIT_POLL_MS
    )
      await sleep(INIT_WAIT_POLL_MS);
    let blockedReason = getWarmBlockedReason(params);
    if (blockedReason) return reportWarmSkipped(blockedReason, contextTokens);
    if (!canWarmResumeCache(params)) return reportWarmSkipped("no_side_query_mark", contextTokens);
    if (
      getLastAssistantMessage(params.messages.filter((message) => !isNoResponseRequestedMessage(message)))
        ?.isApiErrorMessage
    )
      return reportWarmSkipped("last_turn_failed", contextTokens);
    if (
      env.CLAUDE_CODE_HOST_PROMPT_SUPERSEDES_RECORD ||
      promptSnapshotUnlessRenderPoint(messagesSinceCompactBoundary(params.messages), {
        systemPromptSnapshot: params.systemPromptSnapshot(),
      }) === undefined
    )
      return reportWarmSkipped("prompt_not_replayable", contextTokens);
    if (latestContextRendering(params.messages) === "inline")
      return reportWarmSkipped("inline_context", contextTokens);
    await params.awaitSdkMcpSettled();
    let cacheSafeParams = await params.buildCacheSafeParams();
    let mainLoopModel = cacheSafeParams.toolUseContext.options.mainLoopModel;
    if (!getPromptCachingEnabled(mainLoopModel)) return reportWarmSkipped("caching_disabled", contextTokens);
    if (params.tenant === undefined && canUseNoTransientReminders("sdk", undefined, mainLoopModel))
      return reportWarmSkipped("tether_live", contextTokens);
    if (!canUseOldCachingThinking(cacheSafeParams.toolUseContext.options.thinkingConfig, mainLoopModel))
      return reportWarmSkipped("thinking_budget_unsafe", contextTokens);
    stage = "truncate";
    let truncateResult = truncateForkContextMessages(cacheSafeParams.forkContextMessages, mainLoopModel);
    if ("blockedReason" in truncateResult)
      return reportWarmSkipped(truncateResult.blockedReason, contextTokens);
    let messages = truncateResult.messages;
    if (
      params.tenant !== undefined &&
      canUseNoTransientReminders("sdk", undefined, mainLoopModel) &&
      !hasServerToolHistory(messages) &&
      hasServerToolHistory(cacheSafeParams.forkContextMessages.slice(messages.length))
    )
      return reportWarmSkipped("dropped_thread_blocker", contextTokens);
    let modelContextInfo = getModelContextInfo(mainLoopModel);
    if (
      isAutoCompactEnabled() &&
      estimateTokensWithAnchor(messages, modelContextInfo.bytesPerToken) >=
        getAutoCompactThresholdTokens(
          modelContextInfo,
          cacheSafeParams.toolUseContext.options.autoCompactWindow,
        )
    )
      return reportWarmSkipped("would_autocompact", contextTokens);
    if (
      hasClearedToolResultsAfterIdle(
        params.messages,
        mainLoopModel,
        new Date(Date.now() + TOOL_RESULTS_CLEAR_LOOKAHEAD_MS).toISOString(),
        cacheSafeParams.toolUseContext.session,
      )
    )
      return reportWarmSkipped("tool_results_may_clear", contextTokens);
    if (needsConsentOrCredits(mainLoopModel)) return reportWarmSkipped("model_needs_consent", contextTokens);
    stage = "query";
    if (params.tenant?.sendsNothing !== true && isClaudeAISubscriber() && !areLimitsObserved())
      await probeQuotaStatus(
        parseUserSpecifiedModel(mainLoopModel),
        cacheSafeParams.toolUseContext.credentials,
        cacheSafeParams.toolUseContext.storageV5,
        {
          probeInNonInteractiveSession: true,
        },
      );
    if (getCurrentLimits().status !== "allowed") return reportWarmSkipped("usage_limited", contextTokens);
    if (needsConsentOrCredits(mainLoopModel)) return reportWarmSkipped("model_needs_consent", contextTokens);
    let recheckBlockedReason = getWarmBlockedReason(params);
    if (recheckBlockedReason) return reportWarmSkipped(recheckBlockedReason, contextTokens);
    if (!canWarmResumeCache(params)) return reportWarmSkipped("no_side_query_mark", contextTokens);
    if (getTeleportCacheState().status === "active") return reportWarmSkipped("relay_active", contextTokens);
    if (params.tenant?.sendsNothing === true)
      return {
        kind: "would_send",
        contextTokens,
      };
    didSend = true;
    params.tenant?.onSend(mainLoopModel, contextTokens);
    let forkedResult = await runForkedAgent({
      promptMessages: [],
      cacheSafeParams: {
        ...cacheSafeParams,
        forkContextMessages: messages,
      },
      canUseTool: async () => ({
        behavior: "deny",
        message: "Cache warm requests cannot use tools",
        decisionReason: {
          type: "other",
          reason: "resume_cache_warm",
        },
      }),
      querySource: "resume_cache_warm",
      forkLabel: "resume_cache_warm",
      maxTurns: 1,
      maxOutputTokens: RESUME_CACHE_WARM_MAX_OUTPUT_TOKENS,
      overrides: {
        options: {
          ...cacheSafeParams.toolUseContext.options,
          bareFork: true,
          querySource: "resume_cache_warm",
        },
        requireCanUseTool: true,
        ...(params.tenant !== undefined && {
          abortController: params.tenant.abortController,
        }),
      },
      skipTranscript: true,
    });
    let lastAssistantMessage = getLastAssistantMessage(forkedResult.messages);
    if (params.tenant?.abortController.signal.aborted === true) {
      logFeatureSad("resume_cache_warm", "aborted");
      return {
        kind: "sent",
        end: "aborted",
        contextTokens,
      };
    }
    let sentInfo = {
      contextTokens,
      usage: forkedResult.totalUsage,
      ...(lastAssistantMessage?.requestId !== undefined && {
        requestId: lastAssistantMessage.requestId,
      }),
    };
    if (lastAssistantMessage?.isApiErrorMessage && lastAssistantMessage.apiError !== "max_output_tokens") {
      logFeatureBad("resume_cache_warm", "api_error");
      return {
        kind: "sent",
        end: "api_error",
        ...sentInfo,
      };
    }
    logFeatureOk("resume_cache_warm");
    return {
      kind: "sent",
      end: "done",
      ...sentInfo,
    };
  } catch (error) {
    if (
      error instanceof APIUserAbortError ||
      params.tenant?.abortController.signal.aborted === true ||
      isShuttingDown() ||
      params.isSessionEnded()
    ) {
      logForDebugging("resume_cache_warm: aborted mid-flight");
      logFeatureSad("resume_cache_warm", "aborted");
      return didSend
        ? {
            kind: "sent",
            end: "aborted",
            contextTokens,
          }
        : {
            kind: "threw",
          };
    }
    logError(error);
    logFeatureBad(
      "resume_cache_warm",
      stage === "params_build"
        ? "params_build_failed"
        : stage === "truncate"
          ? "truncate_failed"
          : "query_failed",
    );
    return didSend
      ? {
          kind: "sent",
          end: "threw",
          contextTokens,
        }
      : {
          kind: "threw",
        };
  }
}
//@ chunk-0yw3taqg.js:541577-541668 placement
function reportWarmSkipped(reason, contextTokens) {
  logFeatureSad("resume_cache_warm", reason);
  return {
    kind: "skipped",
    reason,
    contextTokens,
  };
}
//@ chunk-0yw3taqg.js:541668-542029 placement
/**
 * 判断预热该不该放弃：会话关闭、预算用尽、第一条消息已被读到、队列里已有命令时返回原因码。
 */
function getWarmBlockedReason(state) {
  if (isShuttingDown()) return "shutting_down";
  if (state.isSessionEnded()) return "session_ended";
  if (state.maxBudgetUsd !== undefined) return "budget_capped";
  if (
    state.tenant === undefined
      ? getRecordedPhase("first_message_read_ms") !== undefined
      : state.tenant.hasATurnBegun()
  )
    return "message_won_race";
  if (
    (state.tenant === undefined
      ? getCommandQueueSnapshot()
      : state.tenant.queue.getCommandQueueSnapshot()
    ).some(isDrainableMainThreadCommand)
  )
    return "queued_command";
  return null;
}
//@ chunk-0yw3taqg.js:542029-542229 placement
function canUseOldCachingThinking(thinkingConfig, model) {
  if (thinkingConfig?.type === "disabled") return true;
  if (env.CLAUDE_CODE_DISABLE_THINKING) return true;
  if (!modelSupportsThinking(model)) return true;
  return (
    modelSupportsAdaptiveThinking({
      runtimeOverride: getThinkingTypeOverride(model),
      resolvedModel: model,
      canonicalModel: getCanonicalName(model),
    }) === "adaptive"
  );
}
//@ chunk-0yw3taqg.js:542229-543049 placement
/**
 * 从消息尾部倒推可安全重放的回合前缀，遇到掉落的工具发现或系统记录就判不可重放，返回可重放消息或阻塞原因。
 */
function truncateForkContextMessages(forkContextMessages, mainLoopModel) {
  let discoveredToolNames = extractDiscoveredToolNames(forkContextMessages);
  let normalizedForkMessages = normalizeMessagesForAPI(forkContextMessages, undefined, mainLoopModel);
  let mappedMessages = normalizedForkMessages.map((message) => jsonStringifyRaw(message.message));
  let searchEndIndex = forkContextMessages.length;
  for (let attempt = 0; attempt < 3; attempt++) {
    let lastUserIndex = -1;
    for (let index = searchEndIndex - 1; index >= 0; index--)
      if (forkContextMessages[index].type === "user") {
        lastUserIndex = index;
        break;
      }
    if (lastUserIndex < 0)
      return {
        blockedReason: "no_user_terminal_prefix",
      };
    searchEndIndex = lastUserIndex;
    let cutIndex = lastUserIndex + 1;
    while (
      cutIndex < forkContextMessages.length &&
      forkContextMessages[cutIndex].type !== "user" &&
      forkContextMessages[cutIndex].type !== "assistant"
    )
      cutIndex++;
    let sliced = forkContextMessages.slice(0, cutIndex);
    if (discoveredToolNames.size > 0) {
      let slicedToolNames = extractDiscoveredToolNames(sliced);
      for (let discoveredToolName of discoveredToolNames)
        if (!slicedToolNames.has(discoveredToolName))
          return {
            blockedReason: "dropped_tool_discovery",
          };
    }
    for (let index = cutIndex; index < forkContextMessages.length; index++) {
      let entry = forkContextMessages[index];
      if (
        entry.type === "attachment" &&
        (entry.attachment.type === "prompt_snapshot" || entry.attachment.type === "deferred_tools_record")
      )
        return {
          blockedReason: "dropped_system_record",
        };
    }
    if (hasUnresolvedToolUses(sliced)) continue;
    let normalizedSlice = normalizeMessagesForAPI(sliced, undefined, mainLoopModel);
    let prefixEndIndex = normalizedSlice.findLastIndex((index) => index.type !== "api_system");
    if (normalizedSlice[prefixEndIndex]?.type !== "user") continue;
    if (
      isPrefixPreservedWithPendingAssistant(
        normalizedSlice,
        prefixEndIndex,
        normalizedForkMessages,
        mappedMessages,
      )
    )
      return {
        messages: sliced,
      };
  }
  return {
    blockedReason: "no_user_terminal_prefix",
  };
}
//@ chunk-0yw3taqg.js:543049-543514 placement
/**
 * 判断最后一条 assistant 消息是否还有未结算的 tool_use（用于确认该前缀不能重放）。
 */
function hasUnresolvedToolUses(messages) {
  let lastAssistantIndex = -1;
  for (let j = messages.length - 1; j >= 0; j--)
    if (messages[j].type === "assistant") {
      lastAssistantIndex = j;
      break;
    }
  if (lastAssistantIndex < 0) return false;
  let pendingToolUseIds = new Set();
  let lastAssistant = messages[lastAssistantIndex];
  if (lastAssistant.type === "assistant") {
    for (let contentBlock of lastAssistant.message.content)
      if (contentBlock.type === "tool_use") pendingToolUseIds.add(contentBlock.id);
  }
  if (pendingToolUseIds.size === 0) return false;
  for (let j = lastAssistantIndex + 1; j < messages.length; j++) {
    let entry = messages[j];
    if (entry.type !== "user" || !Array.isArray(entry.message.content)) continue;
    for (let contentBlock of entry.message.content)
      if (typeof contentBlock !== "string" && contentBlock.type === "tool_result")
        pendingToolUseIds.delete(contentBlock.tool_use_id);
  }
  return pendingToolUseIds.size > 0;
}
//@ chunk-0yw3taqg.js:543514-543719 placement
/**
 * 逐条比较重放前缀与原始消息的类型和文本是否一致，并要求其后确有 assistant 消息。
 */
function isPrefixPreservedWithPendingAssistant(
  prefix,
  prefixEndIndex,
  originalNormalized,
  originalSerialized,
) {
  if (prefixEndIndex >= originalNormalized.length) return false;
  for (let index = 0; index <= prefixEndIndex; index++) {
    let entry = prefix[index];
    if (
      entry.type !== originalNormalized[index].type ||
      jsonStringifyRaw(entry.message) !== originalSerialized[index]
    )
      return false;
  }
  for (let index = prefixEndIndex + 1; index < originalNormalized.length; index++)
    if (originalNormalized[index].type === "assistant") return true;
  return false;
}
export { scheduleResumeCacheWarm };
