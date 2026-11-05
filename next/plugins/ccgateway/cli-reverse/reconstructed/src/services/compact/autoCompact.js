/**
 * services/compact/autoCompact.ts
 *
 * 自动压缩的阈值计算：有效上下文窗口（env/settings/服务端/实验/模型默认）、压缩阈值与警告/阻断等级、是否该自动压缩、快速回填熔断。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/compact/autoCompact.ts
 * pieces: chunk-5xgkngpb.js (38), chunk-za6ana42.js (5)
 * attribution: placement 26, layout 11, callgraph-witnessed 1, sole-consumer 1, callgraph-fingerprint 1, fingerprint 3
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { isEnvTruthy, parseIntLoose } from "../../utils/envUtils.js";
import { env } from "../../utils/env.js";
import {
  roughTokenCountEstimationForMessages,
  roughTokenCountEstimationForMessage,
} from "../tokenEstimation.js";
import {
  getTokenCountFromUsage_3,
  getTokenCountFromUsage_2,
  countClearedToolUses,
  isToolUseStop,
  totalTokensOf,
} from "../../utils/messages/usageAndStopReason.js";
import { isCompactBoundaryMessage as isCompactBoundaryMessage_3 } from "../projects/threadRows.js";
import { getTokenUsage, getAssistantMessageApiId } from "../../utils/tokens.js";
import { normalizeMessagesForAPI, SYNTHETIC_MODEL } from "../../utils/messages.js";
import { shouldEchoWireToolInputs } from "../../utils/wireToolInputEcho.js";
import { isStellarDriftEnabled } from "../../utils/api.js";
import {
  getLastMainThreadRequestAt,
  getLastMainThreadCacheRenewedAt,
  getLastMainThreadCacheTtlMs,
  getSdkBetas,
} from "../../bootstrap/state.js";
import { getPromptCacheSummary } from "../api/promptCacheBreakDetection.js";
import { Stream } from "../../utils/stream.js";
import {
  isWindowWithCeiling,
  envWindowTokens,
  resolveAutoCompactWindow,
  resolvePrecomputeFraction,
  autocompactThreshold,
  effectiveContextWindow,
  computeTokenWarning,
  DEFAULT_PRECOMPUTE_FRACTION,
  hasExplicitWindow,
  precomputeTriggerThreshold,
  usesLongContextWindow,
  windowSource,
  logWindowInForce,
  resolveWindowOrigin,
  resolveDesktopWindow,
} from "./autoCompactWindow.js";
import {
  isAutoCompactEnabled,
  canCompactInRemote,
  isLinkedRoseEnabled,
  isCompactCommand,
  isCompactQuerySource,
  isSideQuerySource,
  isSleepyRippleEnabled,
} from "./compactSettings.js";
import { SECONDARY_CONTEXT_WINDOW } from "../../utils/model/model.js";
import { isOver1mThreshold } from "../../utils/model/configs.js";
import { getEffectiveContextWindow } from "../../entrypoints/sdk/coreSchemas.js";
import { logForDebugging } from "../../utils/debug.js";
import { isRemoteCowork, isCcsRemoteCowork } from "../../utils/entrypointKinds.js";
import { logEvent } from "../analytics/index.js";
import { agentTypeForTelemetry } from "../analytics/metadata.js";
import { fromEnum, lit as lit_2 } from "../analytics/safeMetadata.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { getModelContextInfo } from "../../utils/model/modelContextInfo.js";
import { usageCreditsOnlyFamily } from "../../utils/model/modelDisplay.js";
import {
  usesPayAsYouGo,
  isEnterpriseSubscriber as isEnterpriseSubscriber_2,
  hasUsageCreditsConsent,
  hasExtraUsageProvisioned,
} from "../../utils/planTiers.js";
import { isModelAllowed } from "../../utils/model/modelAllowlist.js";
import { isAutoResumableLimit } from "../api/errors.js";
import { getCurrentLimits } from "../claudeAiLimits.js";
import { isMainQuerySource } from "../api/requestHeaders.js";
import { agentIdOrDefault } from "../../bootstrap/sessionSlices.js";
import { isNoModelFallbackEnabled } from "../../utils/model/modelFallback.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import {
  MAX_CONSECUTIVE_COMPACT_FAILURES,
  analyzeOversizedPrefix,
  recoveryTimeoutForMessages,
  autocompactFailure,
  isColdCompactEnabled,
  compactConversation,
  COMPACTION_BLOCKED_BY_HOOK,
  API_REQUEST_ABORTED_MESSAGE,
  ERROR_MESSAGE_NOT_ENOUGH_MESSAGES,
  isCompactionFailure,
  ERROR_MESSAGE_PROMPT_TOO_LONG,
  createClassifierOverflowReminder,
} from "./compact.js";
import { isMainQueryCompaction, cleanupAfterCompaction } from "./postCompactCleanup.js";
import { createChildAbortController, armRecoveryCeiling } from "../../utils/abortController.js";
import { triggerReactiveCompact } from "./reactiveCompact.js";
import { errorMessage, hasExactErrorMessage, withTelemetryMessage, toError } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { formatTokens } from "../../utils/format.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { syncCompactEligibility, markCompactRequestSpent } from "../../utils/permissions/permissions.js";
import { isAutoClassifierActive } from "../../utils/permissions/autoModeState.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";

//@ chunk-za6ana42.js:369-395 placement
var CLAUDE_OPUS_4_8 = "claude-opus-4-8";
//@ chunk-za6ana42.js:395-476 placement
/**
 * 读 tengu_amber_redwood2/3 的信道回退模型。
 */
function getAnthropicApiFallbackModel() {
  return (
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_redwood2", "") ||
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_redwood3", "")
  );
}
//@ chunk-za6ana42.js:476-506 placement
var TENGU_GOOFY_JELLYFISH = "tengu_goofy_jellyfish";
//@ chunk-za6ana42.js:506-536 placement
/**
 * 读 tengu_goofy_jellyfish，用于判断环境变量禁用自动压缩时的模型限制。
 */
function getAutoCompactDisabledByEnvModel() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_GOOFY_JELLYFISH, "");
}
//@ chunk-za6ana42.js:536-621 fingerprint (2.1.88 match: isAutoCompactEnabled, 0.807)
/**
 * DISABLE_COMPACT 或 DISABLE_AUTO_COMPACT 为真时返回 true（是“被环境变量禁用”，不是“已启用”；真正的启用判断是同 chunk 的 kf：未被 env 禁用且设置 autoCompactEnabled 默认 true）。旧版名 isAutoCompactEnabled 语义相反。
 */
function isAutoCompactDisabledByEnv() {
  return Boolean(isEnvTruthy(process.env.DISABLE_COMPACT) || env.DISABLE_AUTO_COMPACT);
}
//@ chunk-5xgkngpb.js:1544927-1545025 placement
/**
 * 估算消息的 token 数：最近一次用量锚点的 token 加上之后消息的估算值。
 */
function estimateTokensWithAnchor(messages, bytesPerToken) {
  let lastUsageAnchor = findLastUsageAnchor(messages);
  if (!lastUsageAnchor) return roughTokenCountEstimationForMessages(messages, bytesPerToken);
  return (
    lastUsageAnchor.tokens +
    roughTokenCountEstimationForMessages(messages.slice(lastUsageAnchor.anchorIndex + 1), bytesPerToken)
  );
}
//@ chunk-5xgkngpb.js:1545025-1545063 placement
function hasNoUsage(usage) {
  return getTokenCountFromUsage_3(getTokenCountFromUsage_2(usage)) === 0;
}
//@ chunk-5xgkngpb.js:1545063-1545194 layout
function serverClearedTokens(messages) {
  let index = lastUsageIndex(messages);
  let message = index === undefined ? undefined : messages[index];
  return message?.type === "assistant"
    ? countClearedToolUses(message.message.context_management).inputTokens
    : 0;
}
//@ chunk-5xgkngpb.js:1545194-1545469 layout
function lastUsageIndex(messages) {
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let message = messages[idx];
    if (message && isCompactBoundaryMessage_3(message)) return;
    let usage = message?.type === "assistant" ? getTokenUsage(message) : undefined;
    if (message?.type !== "assistant" || !usage) continue;
    if (hasNoUsage(usage)) continue;
    if (
      !message.message.context_management &&
      (message.message.stop_reason === null || isToolUseStop(messages, idx))
    )
      continue;
    return idx;
  }
  return;
}
//@ chunk-5xgkngpb.js:1545469-1546251 layout
function turnTokenSizing(allMessages, model, modelName) {
  let anchorIndex = lastUsageIndex(allMessages);
  let anchorMessage = anchorIndex === undefined ? undefined : allMessages[anchorIndex];
  if (
    anchorIndex === undefined ||
    anchorMessage?.type !== "assistant" ||
    anchorMessage.handedOff ||
    anchorMessage.requestedModel !== model
  )
    return;
  let iterations = anchorMessage.message.usage.iterations;
  if (Array.isArray(iterations) && iterations.some((iteration) => iteration?.type === "fallback_message"))
    return;
  if (!anchorMessage.message.context_management)
    for (let idx = anchorIndex - 1; idx >= 0; idx--) {
      let earlierMessage = allMessages[idx];
      if (earlierMessage && isCompactBoundaryMessage_3(earlierMessage)) break;
      if (earlierMessage?.type === "assistant" && earlierMessage.message.context_management) return;
    }
  let assistantMessageApiId = getAssistantMessageApiId(anchorMessage);
  let turnStartIndex = anchorIndex;
  for (let idx = anchorIndex - 1; assistantMessageApiId && idx >= 0; idx--) {
    let earlierMessage = allMessages[idx];
    let turnIndex = earlierMessage ? getAssistantMessageApiId(earlierMessage) : undefined;
    if (turnIndex === assistantMessageApiId) turnStartIndex = idx;
    else if (turnIndex !== undefined) break;
  }
  let clearedCount = countClearedToolUses(anchorMessage.message.context_management);
  let message = allMessages
    .slice(turnStartIndex + 1)
    .filter(
      (candidate) => !assistantMessageApiId || getAssistantMessageApiId(candidate) !== assistantMessageApiId,
    );
  return {
    historyTokens:
      totalTokensOf(anchorMessage.message.usage) +
      roughTokenCountEstimationForMessages(message, modelName) +
      clearedCount.inputTokens,
    clearedTokens: clearedCount.inputTokens,
    clearedToolUses: clearedCount.toolUses,
    clearedTokensAreMeasured: clearedCount.isMeasured,
    addedADocumentOfUnknownSize: roughTokenCountEstimationForMessage(message),
  };
}
//@ chunk-5xgkngpb.js:1546251-1546551 placement
/**
 * 从尾部找最近一条带用量的助手消息（同一 API 回复的多条取最前），返回 token 数与位置；遇到压缩边界返回 0。
 */
function findLastUsageAnchor(messages) {
  let index = messages.length - 1;
  while (index >= 0) {
    let message = messages[index];
    if (message && isCompactBoundaryMessage_3(message))
      return {
        tokens: 0,
        anchorIndex: index,
      };
    let usage = message ? getTokenUsage(message) : undefined;
    if (message && usage && !hasNoUsage(usage)) {
      let assistantMessageApiId = getAssistantMessageApiId(message);
      if (assistantMessageApiId) {
        let searchIndex = index - 1;
        while (searchIndex >= 0) {
          let candidate = messages[searchIndex];
          let apiId = candidate ? getAssistantMessageApiId(candidate) : undefined;
          if (apiId === assistantMessageApiId) index = searchIndex;
          else if (apiId !== undefined) break;
          searchIndex--;
        }
      }
      return {
        tokens: totalTokensOf(usage),
        anchorIndex: index,
      };
    }
    index--;
  }
  return null;
}
//@ chunk-5xgkngpb.js:1546551-1546625 placement
/**
 * 找最近一条带 token 用量锚点的消息。
 */
function getUsageAnchorMessage(messages) {
  let lastUsageAnchor = findLastUsageAnchor(messages);
  return lastUsageAnchor && lastUsageAnchor.tokens > 0 ? messages[lastUsageAnchor.anchorIndex] : undefined;
}
//@ chunk-5xgkngpb.js:1546625-1546664 placement
/**
 * 消息里是否有可用的用量锚点。
 */
function hasUsageAnchor(messages) {
  return getUsageAnchorMessage(messages) !== undefined;
}
//@ chunk-5xgkngpb.js:1546664-1546814 placement
/**
 * 估算最近用量锚点之后的消息 token 数。
 */
function estimateTokensSinceAnchor(messages, bytesPerToken) {
  let lastUsageAnchor = findLastUsageAnchor(messages);
  let sinceAnchor = lastUsageAnchor ? messages.slice(lastUsageAnchor.anchorIndex + 1) : [...messages];
  return roughTokenCountEstimationForMessages(
    normalizeMessagesForAPI(sinceAnchor, undefined, undefined, {
      echoWireToolInputs: shouldEchoWireToolInputs(messages),
      echoApiBlockOrder: isStellarDriftEnabled(),
    }),
    bytesPerToken,
  );
}
//@ chunk-5xgkngpb.js:1607577-1607660 placement
/**
 * 找最后一条真实的助手消息（排除合成模型的消息）。
 */
function findLastRealAssistantMessage(messages) {
  return messages.findLast(
    (message) => message.type === "assistant" && message.message.model !== SYNTHETIC_MODEL,
  );
}
//@ chunk-5xgkngpb.js:1607660-1607825 placement
/**
 * 主线程缓存最近一次变热的时间与 TTL。
 */
function lastCacheWarmth(messages, defaultTtlMs) {
  let timestamp = findLastRealAssistantMessage(messages)?.timestamp;
  let parsedTs = timestamp !== undefined ? Date.parse(timestamp) : NaN;
  return {
    lastWarmAt: Math.max(
      Number.isFinite(parsedTs) ? parsedTs : -1 / 0,
      getLastMainThreadRequestAt() ?? -1 / 0,
      getLastMainThreadCacheRenewedAt() ?? -1 / 0,
    ),
    ttlMs: getLastMainThreadCacheTtlMs() ?? defaultTtlMs,
  };
}
//@ chunk-5xgkngpb.js:1607825-1607906 placement
/**
 * 主线程提示缓存是否已变冷（距上次变热超过 TTL）。
 */
function isCacheCold(messages, defaultTtlMs, now = Date.now()) {
  let { lastWarmAt, ttlMs } = lastCacheWarmth(messages, defaultTtlMs);
  return !(now - lastWarmAt < ttlMs);
}
//@ chunk-5xgkngpb.js:1607906-1607999 placement
/**
 * 主线程提示缓存的预计过期时间（没有请求或 TTL 时返回 null）。
 */
function getMainThreadCacheExpiresAt() {
  let defaultTtlMs = getLastMainThreadCacheTtlMs();
  if (getLastMainThreadRequestAt() === null || defaultTtlMs === null) return null;
  return lastCacheWarmth([], defaultTtlMs).lastWarmAt + defaultTtlMs;
}
//@ chunk-5xgkngpb.js:1607999-1608221 placement
/**
 * 主线程提示缓存的预计过期时间。
 */
function promptCacheExpiresAt(messages) {
  let defaultTtlMs = getLastMainThreadCacheTtlMs();
  if (getLastMainThreadRequestAt() === null || defaultTtlMs === null) return null;
  let promptCacheSummary = getPromptCacheSummary();
  if (
    promptCacheSummary.lastRequest === null ||
    promptCacheSummary.lastActivityAt === null ||
    promptCacheSummary.expiresAt === null
  )
    return null;
  let { lastWarmAt } = lastCacheWarmth(messages, defaultTtlMs);
  return Math.max(lastWarmAt, promptCacheSummary.lastActivityAt) + defaultTtlMs;
}
//@ chunk-5xgkngpb.js:1608221-1608449 placement
/**
 * 把压缩函数的事件与通知转为异步生成器，结束时返回结果。
 */
async function* runCompactionAsStream(runCompaction, context) {
  let stream = new Stream();
  let streamContext = {
    ...context,
    onCompactEvent: (compactEvent) => stream.enqueue(compactEvent),
  };
  let onNotification = (notification) => {
    stream.enqueue({
      type: "notification",
      notification,
    });
  };
  let onResponseLength = (lengthEvent) => {
    stream.enqueue(lengthEvent);
  };
  let result;
  runCompaction(streamContext, onNotification, onResponseLength).then(
    (resolvedResult) => {
      result = resolvedResult;
      stream.done();
    },
    (error) => stream.error(error),
  );
  yield* stream;
  return result;
}
//@ chunk-5xgkngpb.js:1614134-1614630 callgraph-witnessed (2.1.88 match: getEffectiveContextWindowSize, 0.174)
/**
 * 计算自动压缩用的有效上下文窗口 {window, configured, source}：嵌套 ceiling 配置取上限；CLAUDE_CODE_AUTO_COMPACT_WINDOW（source=env）；settings 的 autoCompactWindow（可按模型 byModel）；否则走 bUo（clientdata/实验/模型默认/unknown-model/auto）。window 不超过模型上下文窗口。
 */
function getAutoCompactWindow(modelInfo, windowSetting, sdkBetas = getSdkBetas()) {
  let { contextWindow } = modelInfo;
  if (isWindowWithCeiling(windowSetting)) {
    let autoCompactWindow = getAutoCompactWindow(modelInfo, windowSetting.inner, sdkBetas);
    let { ceiling } = windowSetting;
    if (autoCompactWindow.window <= ceiling) return autoCompactWindow;
    return {
      window: Math.min(contextWindow, ceiling),
      configured: ceiling,
      source: "settings",
    };
  }
  let envTokens = envWindowTokens(env.CLAUDE_CODE_AUTO_COMPACT_WINDOW);
  if (envTokens !== undefined)
    return {
      window: Math.min(contextWindow, envTokens),
      configured: envTokens,
      source: "env",
    };
  let settingsWindow =
    typeof windowSetting !== "object"
      ? windowSetting
      : Object.hasOwn(windowSetting.byModel, modelInfo.settingsKey)
        ? windowSetting.byModel[modelInfo.settingsKey]
        : windowSetting.default;
  if (settingsWindow !== undefined && settingsWindow !== "auto")
    return {
      window: Math.min(contextWindow, settingsWindow),
      configured: settingsWindow,
      source: "settings",
    };
  return resolveAutoCompactWindow(modelInfo, sdkBetas);
}
//@ chunk-5xgkngpb.js:1618275-1618322 sole-consumer
/**
 * 预计算压缩的缓冲比例：GrowthBook tengu_amber_moleskin 表（按窗口大小、repl/sdk）或标量 tengu_amber_rokovoko（默认 0.2）。
 */
function getPrecomputeBufferFraction(model, autoCompactWindow, fact) {
  return resolvePrecomputeFraction(model, autoCompactWindow, fact).fraction;
}
//@ chunk-5xgkngpb.js:1618322-1618817 callgraph-fingerprint (2.1.88 match: getAutoCompactThreshold, 0.186)
/**
 * 自动压缩阈值配置 {enabled, precomputeBufferFraction, testPctOverride, testBlockingOverride}：CLAUDE_AUTOCOMPACT_PCT_OVERRIDE（百分比）、CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE（阻断 token 数）；远程 200k 窗口下可被 tengu_peppy_gosling 抬高百分比。
 */
function getAutoCompactThresholdConfig(facts, autoCompactWindow, querySource, applyPct = true) {
  let envPercent = process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE;
  let envClaudeCodeBlockingLimitOverride = process.env.CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE;
  let autoCompactOn = isAutoCompactEnabled();
  let pctOverride = envPercent ? parseFloat(envPercent) : undefined;
  if (
    pctOverride !== undefined &&
    pctOverride > 0 &&
    applyPct &&
    autoCompactOn &&
    env.CLAUDE_CODE_REMOTE &&
    facts.contextWindow <= SECONDARY_CONTEXT_WINDOW &&
    !isOver1mThreshold(facts.model, getSdkBetas())
  ) {
    let { window: currentWindow, source } = getAutoCompactWindow(facts, autoCompactWindow);
    if (currentWindow === SECONDARY_CONTEXT_WINDOW && source !== "auto") {
      let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_peppy_gosling", 0);
      if (
        typeof featureValue_CACHED_MAY_BE_STALE === "number" &&
        featureValue_CACHED_MAY_BE_STALE > pctOverride &&
        featureValue_CACHED_MAY_BE_STALE <= 100 &&
        canCompactInRemote() &&
        isLinkedRoseEnabled()
      )
        pctOverride = featureValue_CACHED_MAY_BE_STALE;
    }
  }
  return {
    enabled: autoCompactOn,
    precomputeBufferFraction: getPrecomputeBufferFraction(facts, autoCompactWindow, querySource),
    testPctOverride: pctOverride,
    testBlockingOverride: envClaudeCodeBlockingLimitOverride
      ? parseIntLoose(envClaudeCodeBlockingLimitOverride)
      : undefined,
  };
}
//@ chunk-5xgkngpb.js:1618817-1618864 layout
/**
 * 自动压缩阈值 token 数 = 有效窗口(扣输出预留) − 13000，或按 PCT 覆盖取较小值。
 */
function getAutoCompactThresholdTokens(modelFacts, autoCompactWindow) {
  return autocompactThreshold(
    effectiveContextWindow(modelFacts, autoCompactWindow),
    getAutoCompactThresholdConfig(modelFacts, autoCompactWindow),
  );
}
//@ chunk-5xgkngpb.js:1618864-1618940 layout
/**
 * 同上但忽略 CLAUDE_AUTOCOMPACT_PCT_OVERRIDE（远程 fork 判断用）。
 */
function getAutoCompactThresholdWithoutPctOverride(modelFacts, autoCompactWindow) {
  return autocompactThreshold(effectiveContextWindow(modelFacts, autoCompactWindow), {
    ...getAutoCompactThresholdConfig(modelFacts, autoCompactWindow),
    testPctOverride: undefined,
  });
}
//@ chunk-5xgkngpb.js:1618940-1619208 layout
/**
 * 旧版 calculateTokenWarningState：按 token 数返回 {level: ok/warn/compact/blocked, pctLeft}；warn=阈值−20000，blocked=窗口−3000（或 BLOCKING_LIMIT_OVERRIDE）。可传入固定阈值覆盖。
 */
function calculateTokenWarningState(
  tokens,
  modelFacts,
  autoCompactWindow,
  fixedThreshold,
  hasUsageAnchor = true,
) {
  if (fixedThreshold !== undefined)
    return computeTokenWarning(
      tokens,
      fixedThreshold.effectiveWindow,
      {
        enabled: fixedThreshold.enabled,
        precomputeBufferFraction: DEFAULT_PRECOMPUTE_FRACTION,
        testPctOverride: undefined,
        testBlockingOverride: undefined,
      },
      getEffectiveContextWindow(modelFacts),
      fixedThreshold.threshold,
    );
  let config = getAutoCompactThresholdConfig(modelFacts, autoCompactWindow, undefined, hasUsageAnchor);
  let enabledWindow = config.enabled ? autoCompactWindow : undefined;
  return computeTokenWarning(
    tokens,
    effectiveContextWindow(modelFacts, enabledWindow),
    config,
    getEffectiveContextWindow(modelFacts),
  );
}
//@ chunk-5xgkngpb.js:1619208-1619375 layout
/**
 * 是否达到“预计算压缩”阈值（阈值减去缓冲比例）；非 auto 窗口来源时 200k 以下窗口不预计算。queryLoop 用它启动后台预压缩。
 */
function isAtPrecomputeThreshold(contextTokens, facts, autoCompactWindow, querySource, extraTokens = 0) {
  let autoCompactThresholdConfig = getAutoCompactThresholdConfig(facts, autoCompactWindow, querySource);
  let enabledWindow = autoCompactThresholdConfig.enabled ? autoCompactWindow : undefined;
  let effectiveWindow = effectiveContextWindow(facts, enabledWindow);
  if (!hasExplicitWindow(facts, autoCompactWindow))
    return contextTokens >= precomputeTriggerThreshold(effectiveWindow, autoCompactThresholdConfig);
  let { window: contextWindow } = getAutoCompactWindow(facts, enabledWindow);
  if (contextWindow < SECONDARY_CONTEXT_WINDOW) return false;
  return (
    contextTokens + extraTokens >= precomputeTriggerThreshold(effectiveWindow, autoCompactThresholdConfig)
  );
}
//@ chunk-5xgkngpb.js:1619375-1619385 layout
/**
 * 3：压缩后 3 轮内又需要压缩算一次“快速回填”。
 */
var RAPID_REFILL_TURN_WINDOW = 3;
//@ chunk-5xgkngpb.js:1619385-1619479 layout
/**
 * 上次压缩后不到 3 轮又触发时连续计数 +1，否则归零。
 */
function countConsecutiveRapidRefills(state) {
  return state?.compacted === true && state.turnCounter < 3 ? (state?.consecutiveRapidRefills ?? 0) + 1 : 0;
}
//@ chunk-5xgkngpb.js:1619479-1619571 layout
/**
 * 连续快速回填 ≥3 次返回 action:"trip"（autocompact 返回 rapid_refill_breaker_tripped，queryLoop 停止本轮），否则 proceed。
 */
function checkRapidRefillBreaker(state) {
  let refills = countConsecutiveRapidRefills(state);
  return {
    action: refills >= 3 ? "trip" : "proceed",
    consecutiveRapidRefills: refills,
  };
}
//@ chunk-5xgkngpb.js:1619571-1619681 fingerprint (2.1.88 match: autoCompactIfNeeded, 0.387)
/**
 * 压缩成功后的跟踪状态 {compacted:true, turnId, turnCounter:0, consecutiveFailures:0, consecutiveRapidRefills}。旧版名 autoCompactIfNeeded 为错配。
 */
function createCompactTracking(turnId, consecutiveRapidRefills) {
  return {
    compacted: true,
    turnId,
    turnCounter: 0,
    consecutiveFailures: 0,
    consecutiveRapidRefills,
  };
}
//@ chunk-5xgkngpb.js:1619681-1619962 placement
/**
 * 自动压缩反复触发（3 回合内重新填满，连续 3 次）的提示。
 */
var AUTOCOMPACT_THRASHING_TEXT =
  "Autocompact is thrashing: the context refilled to the limit within 3 turns of the previous compact, 3 times in a row.";
var AUTOCOMPACT_THRASHING_NOTICE = `${AUTOCOMPACT_THRASHING_TEXT} A file being read or a tool output is likely too large for the context window. Try reading in smaller chunks, or use /clear to start fresh.`;
//@ chunk-5xgkngpb.js:2500252-2501143 fingerprint (2.1.88 match: shouldAutoCompact, 0.313)
/**
 * 是否需要自动压缩：compact 自身/特定来源/自动压缩关闭时为 false；token = 估算上下文 − snip 节省 + 服务端已清理量，calculateTokenWarningState 为 compact 或 blocked 时为 true；远程 fork 忽略 PCT 覆盖再判一次。
 */
async function shouldAutoCompact(
  messages,
  modelFacts,
  autoCompactWindow,
  querySource,
  serverClearedOffset = 0,
  queryTracking,
  usageAnchor = false,
) {
  if (isCompactCommand(querySource)) return false;
  if (isCompactQuerySource(querySource)) return false;
  if (usesLongContextWindow(querySource, modelFacts, autoCompactWindow)) return false;
  if (!isAutoCompactEnabled()) return false;
  if (canCompactInRemote() && !hasExplicitWindow(modelFacts, autoCompactWindow) && !usageAnchor) return false;
  let serverClearedTokens_2 = serverClearedTokens(messages);
  let tokenCount =
    estimateTokensWithAnchor(messages, modelFacts.bytesPerToken) -
    serverClearedOffset +
    serverClearedTokens_2;
  let threshold = getUsageAnchorMessage(messages);
  let estimatedTokens = threshold?.type === "assistant" && !threshold.handedOff;
  let warningState = calculateTokenWarningState(
    tokenCount,
    modelFacts,
    autoCompactWindow,
    undefined,
    estimatedTokens,
  );
  logForDebugging(
    `autocompact: tokens=${tokenCount} level=${warningState.level} effectiveWindow=${effectiveContextWindow(modelFacts, autoCompactWindow)}${serverClearedTokens_2 > 0 ? ` serverCleared=${serverClearedTokens_2}` : ""}`,
  );
  if (warningState.level === "compact" && env.CLAUDE_CODE_REMOTE && isSideQuerySource(querySource)) {
    let thresholdWithoutOverride = getAutoCompactThresholdWithoutPctOverride(modelFacts, autoCompactWindow);
    if (tokenCount < thresholdWithoutOverride) {
      let skipWindowGate = estimatedTokens && (isRemoteCowork() || isCcsRemoteCowork());
      logEvent("tengu_fork_early_compact", {
        skipped: skipWindowGate,
        querySource: agentTypeForTelemetry(querySource),
        tokenCount,
        overrideThreshold: getAutoCompactThresholdTokens(modelFacts, autoCompactWindow),
        thresholdWithoutOverride,
        thresholdSource: fromEnum(windowSource(modelFacts, autoCompactWindow)),
        queryChainId: sanitizeMarkName(queryTracking?.chainId),
        queryDepth: queryTracking?.depth,
      });
      if (skipWindowGate) {
        logForDebugging(
          `autocompact: not compacting the ${querySource} fork: it ignores CLAUDE_AUTOCOMPACT_PCT_OVERRIDE, and ${tokenCount} tokens is under the threshold without it (${thresholdWithoutOverride})`,
        );
        return false;
      }
    }
  }
  return warningState.level === "compact" || warningState.level === "blocked";
}
//@ chunk-5xgkngpb.js:2501143-2501430 layout
/**
 * 为 /compact 报告生成阈值快照（阈值、窗口、当前 token、压缩前 token、摘要与计量函数）；窗口来源为 auto 时返回 undefined。
 */
function getCompactThresholdSnapshot(precomputed, messages, model, autoCompactWindow) {
  let modelContextInfo = getModelContextInfo(model);
  let windowSetting = isAutoCompactEnabled() ? autoCompactWindow : undefined;
  let { window: contextWindow, source } = getAutoCompactWindow(modelContextInfo, windowSetting);
  if (source === "auto") return;
  return {
    thresholdTokens: getAutoCompactThresholdTokens(modelContextInfo, windowSetting),
    windowTokens: contextWindow,
    liveTokens:
      estimateTokensWithAnchor(messages, modelContextInfo.bytesPerToken) + serverClearedTokens(messages),
    madeFromTokens: precomputed.preCompactTokens,
    summary: precomputed.result.summaryMessages,
    sizeOf: (messagesArg) =>
      roughTokenCountEstimationForMessages(messagesArg, modelContextInfo.bytesPerToken),
  };
}
//@ chunk-5xgkngpb.js:2501430-2501521 placement
/**
 * 本回合是否应做自动压缩：环境未禁用、自动压缩开启、来源不是压缩命令/查询。
 */
function shouldAutoCompactForTurn(querySource) {
  return (
    !isEnvTruthy(process.env.DISABLE_COMPACT) &&
    isAutoCompactEnabled() &&
    querySource !== undefined &&
    !isCompactCommand(querySource) &&
    !isCompactQuerySource(querySource)
  );
}
//@ chunk-5xgkngpb.js:2501521-2501595 placement
/**
 * 用量信用额度模型是否可用（有额度或无限制，且已开通额外用量）。
 */
function canFallbackForUsageCredits(requestedModel) {
  let family = usageCreditsOnlyFamily(requestedModel);
  return (
    family === undefined ||
    usesPayAsYouGo() ||
    isEnterpriseSubscriber_2() ||
    (hasUsageCreditsConsent(family) && hasExtraUsageProvisioned())
  );
}
//@ chunk-5xgkngpb.js:2501595-2501928 placement
/**
 * 上下文将被阻断且请求的模型窗口更大时，返回可切换的模型。
 */
function findLargerWindowModel(messages, context, facts, offset = 0) {
  let last = messages.findLast((message) => getTokenUsage(message) !== undefined);
  let requestedModel = last?.type === "assistant" ? last.requestedModel : undefined;
  if (typeof requestedModel !== "string" || !hasUsageAnchor(messages)) return;
  let modelContextInfo = getModelContextInfo(requestedModel);
  return modelContextInfo.recognized &&
    modelContextInfo.contextWindow > facts.contextWindow &&
    calculateTokenWarningState(
      estimateTokensWithAnchor(messages, facts.bytesPerToken) - offset + serverClearedTokens(messages),
      facts,
      context.options.autoCompactWindow,
    ).level === "blocked" &&
    isModelAllowed(requestedModel) &&
    canFallbackForUsageCredits(requestedModel) &&
    !isAutoResumableLimit(getCurrentLimits())
    ? requestedModel
    : undefined;
}
//@ chunk-5xgkngpb.js:2501928-2507273 placement
/**
 * 需要时执行自动压缩，返回已压缩、被钩子阻止、不需要或失败等结果。
 */
async function* runAutoCompactIfNeeded(
  messages,
  context,
  tokenFacts,
  cacheSafeParams,
  querySource,
  compactState,
  systemPromptTokens,
  precompute,
  isRemote = false,
  precomputed,
) {
  let { model } = tokenFacts;
  let autoCompactWindow = context.options.autoCompactWindow;
  if (
    precompute !== undefined &&
    querySource !== undefined &&
    isMainQuerySource(querySource) &&
    context.session.precompute.get(agentIdOrDefault(context.agentId))?.armTrigger === "idle"
  ) {
    let idleResult = yield* runIdleCompaction(
      messages,
      context,
      tokenFacts,
      cacheSafeParams,
      querySource,
      compactState,
      precompute,
    );
    if (idleResult !== undefined) return idleResult;
  }
  let modelPinned = cacheSafeParams.model !== undefined;
  let hadFailures = (compactState?.consecutiveFailures ?? 0) > 0;
  let largerModel =
    modelPinned || hadFailures || isNoModelFallbackEnabled()
      ? undefined
      : findLargerWindowModel(messages, context, tokenFacts, systemPromptTokens);
  let consecutiveFailures;
  if (largerModel !== undefined) {
    let largerResult = yield* runAutoCompactIfNeeded(
      messages,
      {
        ...context,
        compactionApiAttemptsLeft: {
          count: 1,
        },
      },
      tokenFacts,
      {
        ...cacheSafeParams,
        model: largerModel,
      },
      querySource,
      compactState,
      systemPromptTokens,
      precompute,
      isRemote,
    );
    if (largerResult.kind === "compacted") logFeatureOk("compact_larger_model");
    else if (largerResult.kind === "failed") {
      logFeatureSad("compact_larger_model", largerResult.compactFailure?.reason ?? "failed");
      consecutiveFailures = largerResult.consecutiveFailures;
    }
    if (
      largerResult.kind === "compacted" ||
      largerResult.kind === "hook_blocked" ||
      context.abortController.signal.aborted
    )
      return largerResult;
  }
  let compactDisabled = isEnvTruthy(process.env.DISABLE_COMPACT);
  let isMainTurn = shouldAutoCompactForTurn(querySource);
  let remoteBlocked = isRemote && !canCompactInRemote();
  let compactionDisabled = isMainTurn && !usesLongContextWindow(querySource, tokenFacts, autoCompactWindow);
  let classifierOverflow = remoteBlocked
    ? undefined
    : pendingClassifierOverflow(context, messages, compactionDisabled);
  let blockedByManualCompact = false;
  let canRunHookCompaction = undefined;
  if (!blockedByManualCompact)
    canRunHookCompaction?.({
      kind: "skipped",
      reason: "unavailable",
    });
  let blockedResult = blockedByManualCompact ? canRunHookCompaction : undefined;
  if (compactDisabled)
    return {
      kind: "not_needed",
    };
  if (
    classifierOverflow === undefined &&
    compactState?.consecutiveFailures !== undefined &&
    compactState.consecutiveFailures >= MAX_CONSECUTIVE_COMPACT_FAILURES
  ) {
    blockedResult?.({
      kind: "skipped",
      reason: "failure_breaker_open",
    });
    return {
      kind: "failure_breaker_open",
    };
  }
  let needsCompact =
    classifierOverflow !== undefined ||
    blockedByManualCompact ||
    (remoteBlocked && isMainTurn) ||
    ((await shouldAutoCompact(
      messages,
      tokenFacts,
      autoCompactWindow,
      querySource,
      systemPromptTokens,
      context.queryTracking,
      modelPinned,
    )) &&
      !precomputed?.());
  if (isMainTurn && isMainQueryCompaction(querySource, context.agentId))
    logWindowInForce(context.session, tokenFacts, autoCompactWindow);
  if (!needsCompact)
    return {
      kind: "not_needed",
      consecutiveFailures,
    };
  let prefixOverflow = analyzeOversizedPrefix(messages, tokenFacts, autoCompactWindow, systemPromptTokens);
  if (prefixOverflow) {
    logForDebugging(
      `autocompact: fixed prefix ~${prefixOverflow.prefixTokens} > threshold ${prefixOverflow.thresholdTokens} \u2014 compaction cannot help`,
      {
        level: "warn",
      },
    );
    logFeatureSad("compact_auto", "compact_auto_prefix_overflow");
    logEvent("tengu_auto_compact_prefix_overflow", {
      ...prefixOverflow,
      wouldHaveBlocked: true,
    });
  }
  let refillCheck = checkRapidRefillBreaker(compactState);
  let { consecutiveRapidRefills } = refillCheck;
  if (refillCheck.action === "trip") {
    logForDebugging(
      `autocompact: rapid-refill breaker tripped \u2014 ${consecutiveRapidRefills} consecutive refills within <${RAPID_REFILL_TURN_WINDOW} turns each (last was ${compactState?.turnCounter} turns)`,
      {
        level: "warn",
      },
    );
    logFeatureSad("compact_auto", "compact_auto_rapid_refill_breaker");
    if (classifierOverflow)
      reportClassifierOverflowCompact(context, classifierOverflow, {
        kind: "skipped",
        reason: "rapid_refill",
      });
    blockedResult?.({
      kind: "skipped",
      reason: "rapid_refill",
    });
    return {
      kind: "rapid_refill_breaker_tripped",
    };
  }
  let thresholdSource = windowSource(tokenFacts, autoCompactWindow);
  let windowOrigin = resolveWindowOrigin(tokenFacts, autoCompactWindow);
  let spinnerHintText = autoWindowNotice(tokenFacts, autoCompactWindow);
  if (
    querySource !== undefined &&
    (thresholdSource !== "auto" ||
      classifierOverflow !== undefined ||
      modelPinned ||
      blockedByManualCompact) &&
    canCompactInRemote()
  ) {
    logForDebugging(
      `autocompact: routing through reactive (thresholdSource=${thresholdSource}${classifierOverflow ? ", classifier overflow" : ""})`,
    );
    logEvent("tengu_auto_compact_routed_reactive", {
      thresholdSource: fromEnum(thresholdSource),
      autoCompactWindow: windowOrigin.window,
      autoCompactWindowOrigin: fromEnum(windowOrigin.origin),
      classifierOverflow: classifierOverflow !== undefined,
    });
    let startTime = performance.now();
    let querySource_2 = querySource;
    let { result, hookBlocked, failure } = yield* runCompactionAsStream(
      async (reactiveContext, onNotification, onResponseLength) => {
        let precomputed;
        if (precompute) {
          let abortController = createChildAbortController(reactiveContext.abortController);
          let ceiling = armRecoveryCeiling(
            abortController,
            recoveryTimeoutForMessages(messages),
            reactiveContext.session.host.clock,
          );
          try {
            precomputed = await precompute({
              toolUseContext: {
                ...reactiveContext,
                abortController,
              },
              messages,
              querySource: querySource_2,
              sizingModel: model,
              trigger: "threshold",
              detectedAt: startTime,
              onResponseLength,
            });
          } finally {
            ceiling.clear();
          }
        }
        let modelContextInfo = getModelContextInfo(model);
        let blocked =
          calculateTokenWarningState(
            estimateTokensWithAnchor(messages, modelContextInfo.bytesPerToken) - (systemPromptTokens ?? 0),
            modelContextInfo,
            autoCompactWindow,
          ).level === "blocked";
        let keepNoRound = consecutiveRapidRefills > 0 && !blocked && isSleepyRippleEnabled();
        let reactiveOutcome = await triggerReactiveCompact({
          hasAttempted: false,
          querySource: querySource_2,
          aborted: reactiveContext.abortController.signal.aborted,
          messages,
          cacheSafeParams: {
            ...cacheSafeParams,
            toolUseContext: reactiveContext,
          },
          precomputed: precomputed?.swap,
          precomputeOutcome: precomputed?.outcome,
          userWaitStartedAt: startTime,
          thresholdSource,
          thresholdWindow: windowOrigin,
          allowLastResort: blocked || classifierOverflow !== undefined,
          keepNoRound,
          spinnerHintText,
          onNotification,
          onResponseLength,
        });
        if (reactiveOutcome.result === null && precomputed?.emittedEarlyCompactStart) {
          reactiveContext.onCompactEvent?.({
            type: "compact_progress",
            event: {
              type: "compact_end",
            },
          });
          reactiveContext.onCompactEvent?.({
            type: "sdk_status",
            status: null,
          });
        }
        return reactiveOutcome;
      },
      context,
    );
    if (result) {
      blockedResult?.({
        kind: "compacted",
      });
      return {
        kind: "compacted",
        result: classifierOverflow
          ? compactAfterClassifierOverflow(context, classifierOverflow, result)
          : result,
        consecutiveRapidRefills,
        thresholdSource,
        thresholdWindow: windowOrigin,
        routedThroughReactive: true,
      };
    }
    if (classifierOverflow)
      reportClassifierOverflowCompact(
        context,
        classifierOverflow,
        hookBlocked
          ? {
              kind: "skipped",
              reason: "hook_blocked",
            }
          : failure
            ? {
                kind: "failed",
                reason: failure.reason,
              }
            : context.abortController.signal.aborted
              ? {
                  kind: "skipped",
                  reason: "aborted",
                }
              : {
                  kind: "skipped",
                  reason: "unavailable",
                },
      );
    blockedResult?.(
      hookBlocked
        ? {
            kind: "skipped",
            reason: "hook_blocked",
          }
        : failure?.reason === "aborted" || context.abortController.signal.aborted
          ? {
              kind: "skipped",
              reason: "aborted",
            }
          : failure
            ? {
                kind: "failed",
                reason: failure.reason,
              }
            : {
                kind: "skipped",
                reason: "unavailable",
              },
    );
    if (hookBlocked)
      return {
        kind: "hook_blocked",
        thresholdSource,
        routedThroughReactive: true,
      };
    return autocompactFailure(compactState, true, thresholdSource, failure);
  }
  let recompactionInfo = {
    isRecompactionInChain: compactState?.compacted === true,
    turnsSincePreviousCompact: compactState?.turnCounter ?? -1,
    previousCompactTurnId: compactState?.turnId,
    autoCompactThreshold: getAutoCompactThresholdTokens(tokenFacts, autoCompactWindow),
    querySource,
  };
  let stripNonEssential = isColdCompactEnabled();
  try {
    let result = yield* runCompactionAsStream(
      (context, onNotification, onResponseLength) =>
        compactConversation(messages, context, cacheSafeParams, true, {
          isAutoCompact: true,
          recompactionInfo,
          stripNonEssential,
          spinnerHintText,
          onNotification,
          onResponseLength,
        }),
      context,
    );
    cleanupAfterCompaction(
      context.session,
      querySource,
      context.setAppState,
      context.agentId,
      cacheSafeParams.stickyBetas,
      context.storageV5,
    );
    blockedResult?.({
      kind: "compacted",
    });
    return {
      kind: "compacted",
      result: classifierOverflow
        ? compactAfterClassifierOverflow(context, classifierOverflow, result)
        : result,
      consecutiveRapidRefills,
      thresholdSource,
      thresholdWindow: windowOrigin,
      routedThroughReactive: false,
    };
  } catch (error) {
    if (errorMessage(error).startsWith(COMPACTION_BLOCKED_BY_HOOK)) {
      if (classifierOverflow)
        reportClassifierOverflowCompact(context, classifierOverflow, {
          kind: "skipped",
          reason: "hook_blocked",
        });
      blockedResult?.({
        kind: "skipped",
        reason: "hook_blocked",
      });
      return {
        kind: "hook_blocked",
        routedThroughReactive: false,
      };
    }
    let aborted = hasExactErrorMessage(error, API_REQUEST_ABORTED_MESSAGE);
    blockedResult?.(
      aborted
        ? {
            kind: "skipped",
            reason: "aborted",
          }
        : {
            kind: "failed",
            reason: hasExactErrorMessage(error, ERROR_MESSAGE_NOT_ENOUGH_MESSAGES)
              ? "too_few_groups"
              : "error",
          },
    );
    let tooFewGroups =
      classifierOverflow !== undefined && hasExactErrorMessage(error, ERROR_MESSAGE_NOT_ENOUGH_MESSAGES);
    if (classifierOverflow)
      reportClassifierOverflowCompact(context, classifierOverflow, {
        kind: "failed",
        reason: aborted ? "aborted" : tooFewGroups ? "too_few_groups" : "error",
      });
    if (!aborted)
      if (isCompactionFailure(error) || tooFewGroups)
        logForDebugging(`autocompact failed: ${errorMessage(error)}`, {
          level: "error",
        });
      else
        logError(withTelemetryMessage(toError(error), "autocompact: unexpected compactConversation failure"));
    return autocompactFailure(
      compactState,
      false,
      undefined,
      !remoteBlocked
        ? undefined
        : aborted
          ? {
              reason: "aborted",
            }
          : hasExactErrorMessage(error, ERROR_MESSAGE_PROMPT_TOO_LONG)
            ? {
                reason: "exhausted",
              }
            : hasExactErrorMessage(error, ERROR_MESSAGE_NOT_ENOUGH_MESSAGES)
              ? {
                  reason: "too_few_groups",
                }
              : {
                  reason: "error",
                  detail: isCompactionFailure(error) ? errorMessage(error) : "an internal error",
                },
    );
  }
}
//@ chunk-5xgkngpb.js:2507273-2508346 placement
/**
 * 空闲时执行一次自动压缩。
 */
async function* runIdleCompaction(
  messages,
  context,
  facts,
  cacheSafeParams,
  querySource,
  reuse,
  runPrecomputed,
) {
  let startTime = performance.now();
  let thresholdSource = windowSource(facts, context.options.autoCompactWindow);
  let thresholdWindow = resolveWindowOrigin(facts, context.options.autoCompactWindow);
  let { result, hookBlocked } = yield* runCompactionAsStream(
    async (toolContext, onNotification, onResponseLength) => {
      try {
        let { swap, outcome } = await runPrecomputed({
          toolUseContext: toolContext,
          messages,
          querySource,
          sizingModel: facts.model,
          trigger: "idle",
          detectedAt: startTime,
        });
        if (swap === undefined)
          return {
            result: null,
            hookBlocked: false,
          };
        return await triggerReactiveCompact({
          hasAttempted: false,
          querySource,
          aborted: toolContext.abortController.signal.aborted,
          messages,
          cacheSafeParams: {
            ...cacheSafeParams,
            toolUseContext: toolContext,
          },
          precomputed: swap,
          precomputedOnly: true,
          precomputeOutcome: outcome,
          userWaitStartedAt: startTime,
          thresholdSource,
          thresholdWindow,
          onNotification,
          onResponseLength,
        });
      } catch (error) {
        logError(error);
        return {
          result: null,
          hookBlocked: false,
        };
      }
    },
    context,
  );
  if (result !== null) {
    let { boundaryMarker } = result;
    return {
      kind: "compacted",
      result,
      consecutiveRapidRefills: reuse?.consecutiveRapidRefills ?? 0,
      thresholdSource,
      thresholdWindow,
      routedThroughReactive: true,
      ...(boundaryMarker.subtype === "compact_boundary" &&
        boundaryMarker.compactMetadata.precomputed === true && {
          afterIdle: true,
        }),
    };
  }
  return hookBlocked
    ? {
        kind: "hook_blocked",
        thresholdSource,
        routedThroughReactive: true,
      }
    : undefined;
}
//@ chunk-5xgkngpb.js:2508346-2508583 placement
/**
 * 按实验/服务端窗口压缩时的提示文本。
 */
function autoWindowNotice(modelFacts, autoCompactWindow) {
  if (resolveDesktopWindow(modelFacts) === undefined) return null;
  let { source, configured } = getAutoCompactWindow(modelFacts, autoCompactWindow);
  if ((source !== "experiment" && source !== "clientdata") || configured >= modelFacts.contextWindow)
    return null;
  return `Compacting at auto window (${formatTokens(configured)} tokens) \xB7 /autocompact to configure`;
}
//@ chunk-5xgkngpb.js:2508583-2509021 placement
/**
 * 取出自动模式分类器溢出触发的压缩请求（过期或离开 auto 模式时丢弃并记录）。
 */
function pendingClassifierOverflow(context, messages, canCompact) {
  let { mode, servedCall } = getToolPermissionContext(context);
  let { pending, stale } = syncCompactEligibility(context, messages, mode, canCompact);
  if (pending === undefined) return;
  let leftAutoMode =
    stale === "mode" && !isAutoClassifierActive(mode, servedCall === true) && mode !== "dontAsk";
  if (stale === "epoch" || leftAutoMode) {
    let reason = stale === "epoch" ? "stale" : "left_auto_mode";
    logEvent("tengu_auto_mode_classifier_overflow_compact", {
      stage: lit_2("dropped"),
      reason: fromEnum(reason),
      isSubagent: context.agentId !== undefined,
    });
    logFeatureSad("compact_classifier_overflow", reason);
    return;
  }
  if (!canCompact) {
    reportClassifierOverflowCompact(context, pending, {
      kind: "skipped",
      reason: "unavailable",
    });
    return;
  }
  return pending;
}
//@ chunk-5xgkngpb.js:2509021-2509523 placement
/**
 * 自动模式分类器上下文溢出时触发压缩。
 */
function compactAfterClassifierOverflow(context, denied, result) {
  logForDebugging("autocompact: compacted after the auto mode classifier overflowed");
  logEvent("tengu_auto_mode_classifier_overflow_compact", {
    stage: lit_2("compacted"),
    deniedCalls: denied.deniedToolNames.length,
    isSubagent: context.agentId !== undefined,
    preCompactTokenCount: result.preCompactTokenCount,
    postCompactTokenCount: result.postCompactTokenCount,
    truePostCompactTokenCount: result.truePostCompactTokenCount,
  });
  logFeatureOk("compact_classifier_overflow");
  return {
    ...result,
    attachments: [
      ...result.attachments,
      createClassifierOverflowReminder(
        denied.deniedToolNames.length,
        normalizeCaseForComparison_2(denied.deniedToolNames),
      ),
    ],
  };
}
//@ chunk-5xgkngpb.js:2509523-2509977 placement
/**
 * 记录分类器溢出触发的压缩结果遥测。
 */
function reportClassifierOverflowCompact(context, pending, outcome) {
  let aborted = outcome.reason === "aborted";
  if (!aborted) markCompactRequestSpent(context, pending);
  logForDebugging(
    `autocompact: compaction after the auto mode classifier overflowed ${outcome.kind} (${outcome.reason})`,
    {
      level: "warn",
    },
  );
  logEvent("tengu_auto_mode_classifier_overflow_compact", {
    stage: aborted ? lit_2("skipped") : fromEnum(outcome.kind),
    reason: fromEnum(outcome.reason),
    deniedCalls: pending.deniedToolNames.length,
    isSubagent: context.agentId !== undefined,
  });
  if (outcome.kind === "failed" && !aborted) logFeatureBad("compact_classifier_overflow", outcome.reason);
  else logFeatureSad("compact_classifier_overflow", outcome.reason);
}
export {
  estimateTokensWithAnchor,
  serverClearedTokens,
  turnTokenSizing,
  getAutoCompactThresholdTokens,
  hasUsageAnchor,
  getAutoCompactWindow,
  CLAUDE_OPUS_4_8,
  getAnthropicApiFallbackModel,
  getAutoCompactDisabledByEnvModel,
  getMainThreadCacheExpiresAt,
  isCacheCold,
  findLastRealAssistantMessage,
  estimateTokensSinceAnchor,
  getCompactThresholdSnapshot,
  isAtPrecomputeThreshold,
  promptCacheExpiresAt,
  calculateTokenWarningState,
  shouldAutoCompactForTurn,
  createCompactTracking,
  checkRapidRefillBreaker,
  runCompactionAsStream,
  runAutoCompactIfNeeded,
  AUTOCOMPACT_THRASHING_NOTICE,
  AUTOCOMPACT_THRASHING_TEXT,
  isAutoCompactDisabledByEnv,
};
