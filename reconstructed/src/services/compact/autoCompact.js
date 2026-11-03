/**
 * services/compact/autoCompact.ts
 *
 * 自动压缩的阈值计算：有效上下文窗口（env/settings/服务端/实验/模型默认）、压缩阈值与警告/阻断等级、是否该自动压缩、快速回填熔断。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/compact/autoCompact.ts
 * pieces: chunk-9m4wzd68.js (5), chunk-e6aww6q8.js (35)
 * attribution: placement 26, fingerprint 3, callgraph-witnessed 1, sole-consumer 1, callgraph-fingerprint 1, layout 8
 */
import { roughTokenCountEstimationForMessages } from "../tokenEstimation.js";
import {
  getTokenCountFromUsage_2 as getTokenCountFromUsage_2_2,
  getTokenCountFromUsage as getTokenCountFromUsage_5,
  totalTokensOf,
} from "../../utils/messages/usageAndStopReason.js";
import { isCompactBoundaryMessage as isCompactBoundaryMessage_3 } from "../projects/threadRows.js";
import { getTokenUsage, getAssistantMessageApiId } from "../../utils/tokens.js";
import { normalizeMessagesForAPI, API_REQUEST_ABORTED_MESSAGE } from "../../utils/messages.js";
import { shouldEchoWireToolInputs } from "../../utils/wireToolInputEcho.js";
import { isStellarDriftEnabled } from "../../utils/api.js";
import { SYNTHETIC_MODEL } from "../../constants/messages.js";
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
import { env } from "../../utils/env.js";
import {
  isAutoCompactEnabled,
  canCompactInRemote,
  isLinkedRoseEnabled,
  isCompactCommand,
  isCompactQuerySource,
  isSideQuerySource,
  isTidyOrigamiEnabled,
  isSleepyRippleEnabled,
} from "./compactSettings.js";
import { SECONDARY_CONTEXT_WINDOW } from "../../utils/model/model.js";
import { isOver1mThreshold } from "../../utils/model/configs.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { parseIntLoose, isEnvTruthy } from "../../utils/envUtils.js";
import { getEffectiveContextWindow } from "../../entrypoints/sdk/coreSchemas.js";
import { stripInProgressAssistantMessage } from "../../commands/btw/btw.js";
import { logForDebugging } from "../../utils/debug.js";
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
import { uniq } from "../../utils/collections.js";

//@ chunk-e6aww6q8.js:1536673-1536771 placement
/**
 * 估算消息的 token 数：最近一次用量锚点的 token 加上之后消息的估算值。
 */
function estimateTokensWithAnchor(e, bytesPerToken) {
  let lastUsageAnchor = findLastUsageAnchor(e);
  if (!lastUsageAnchor) return roughTokenCountEstimationForMessages(e, bytesPerToken);
  return (
    lastUsageAnchor.tokens +
    roughTokenCountEstimationForMessages(e.slice(lastUsageAnchor.anchorIndex + 1), bytesPerToken)
  );
}
//@ chunk-e6aww6q8.js:1536771-1536810 placement
function hasNoUsage(e) {
  return getTokenCountFromUsage_2_2(getTokenCountFromUsage_5(e)) === 0;
}
//@ chunk-e6aww6q8.js:1537121-1537423 placement
/**
 * 从尾部找最近一条带用量的助手消息（同一 API 回复的多条取最前），返回 token 数与位置；遇到压缩边界返回 0。
 */
function findLastUsageAnchor(e) {
  let n = e.length - 1;
  while (n >= 0) {
    let r = e[n];
    if (r && isCompactBoundaryMessage_3(r))
      return {
        tokens: 0,
        anchorIndex: n,
      };
    let s = r ? getTokenUsage(r) : undefined;
    if (r && s && !hasNoUsage(s)) {
      let assistantMessageApiId = getAssistantMessageApiId(r);
      if (assistantMessageApiId) {
        let y = n - 1;
        while (y >= 0) {
          let S = e[y];
          let w = S ? getAssistantMessageApiId(S) : undefined;
          if (w === assistantMessageApiId) n = y;
          else if (w !== undefined) break;
          y--;
        }
      }
      return {
        tokens: totalTokensOf(s),
        anchorIndex: n,
      };
    }
    n--;
  }
  return null;
}
//@ chunk-e6aww6q8.js:1537423-1537497 placement
/**
 * 找最近一条带 token 用量锚点的消息。
 */
function getUsageAnchorMessage(e) {
  let lastUsageAnchor = findLastUsageAnchor(e);
  return lastUsageAnchor && lastUsageAnchor.tokens > 0 ? e[lastUsageAnchor.anchorIndex] : undefined;
}
//@ chunk-e6aww6q8.js:1537497-1537536 placement
/**
 * 消息里是否有可用的用量锚点。
 */
function hasUsageAnchor(messages) {
  return getUsageAnchorMessage(messages) !== undefined;
}
//@ chunk-e6aww6q8.js:1537536-1537686 placement
/**
 * 估算最近用量锚点之后的消息 token 数。
 */
function estimateTokensSinceAnchor(e, n) {
  let lastUsageAnchor = findLastUsageAnchor(e);
  let s = lastUsageAnchor ? e.slice(lastUsageAnchor.anchorIndex + 1) : [...e];
  return roughTokenCountEstimationForMessages(
    normalizeMessagesForAPI(s, undefined, undefined, {
      echoWireToolInputs: shouldEchoWireToolInputs(e),
      echoApiBlockOrder: isStellarDriftEnabled(),
    }),
    n,
  );
}
//@ chunk-e6aww6q8.js:1542130-1542213 placement
/**
 * 找最后一条真实的助手消息（排除合成模型的消息）。
 */
function findLastRealAssistantMessage(e) {
  return e.findLast((n) => n.type === "assistant" && n.message.model !== SYNTHETIC_MODEL);
}
//@ chunk-e6aww6q8.js:1542213-1542378 placement
/**
 * 主线程缓存最近一次变热的时间与 TTL。
 */
function lastCacheWarmth(e, lastMainThreadCacheTtlMs) {
  let timestamp = findLastRealAssistantMessage(e)?.timestamp;
  let s = timestamp !== undefined ? Date.parse(timestamp) : NaN;
  return {
    lastWarmAt: Math.max(
      Number.isFinite(s) ? s : -1 / 0,
      getLastMainThreadRequestAt() ?? -1 / 0,
      getLastMainThreadCacheRenewedAt() ?? -1 / 0,
    ),
    ttlMs: getLastMainThreadCacheTtlMs() ?? lastMainThreadCacheTtlMs,
  };
}
//@ chunk-e6aww6q8.js:1542378-1542459 placement
/**
 * 主线程提示缓存是否已变冷（距上次变热超过 TTL）。
 */
function isCacheCold(e, n, r = Date.now()) {
  let { lastWarmAt, ttlMs } = lastCacheWarmth(e, n);
  return !(r - lastWarmAt < ttlMs);
}
//@ chunk-e6aww6q8.js:1542459-1542552 placement
/**
 * 主线程提示缓存的预计过期时间（没有请求或 TTL 时返回 null）。
 */
function getMainThreadCacheExpiresAt() {
  let lastMainThreadCacheTtlMs = getLastMainThreadCacheTtlMs();
  if (getLastMainThreadRequestAt() === null || lastMainThreadCacheTtlMs === null) return null;
  return lastCacheWarmth([], lastMainThreadCacheTtlMs).lastWarmAt + lastMainThreadCacheTtlMs;
}
//@ chunk-e6aww6q8.js:1542552-1542774 placement
/**
 * 主线程提示缓存的预计过期时间。
 */
function promptCacheExpiresAt(snapshot) {
  let lastMainThreadCacheTtlMs = getLastMainThreadCacheTtlMs();
  if (getLastMainThreadRequestAt() === null || lastMainThreadCacheTtlMs === null) return null;
  let promptCacheSummary = getPromptCacheSummary();
  if (
    promptCacheSummary.lastRequest === null ||
    promptCacheSummary.lastActivityAt === null ||
    promptCacheSummary.expiresAt === null
  )
    return null;
  let { lastWarmAt } = lastCacheWarmth(snapshot, lastMainThreadCacheTtlMs);
  return Math.max(lastWarmAt, promptCacheSummary.lastActivityAt) + lastMainThreadCacheTtlMs;
}
//@ chunk-e6aww6q8.js:1542774-1543002 placement
/**
 * 把压缩函数的事件与通知转为异步生成器，结束时返回结果。
 */
async function* runCompactionAsStream(e, n) {
  let r = new Stream();
  let s = {
    ...n,
    onCompactEvent: (w) => r.enqueue(w),
  };
  let h = (notification) => {
    r.enqueue({
      type: "notification",
      notification,
    });
  };
  let y = (w) => {
    r.enqueue(w);
  };
  let S;
  e(s, h, y).then(
    (w) => {
      S = w;
      r.done();
    },
    (error) => r.error(error),
  );
  yield* r;
  return S;
}
//@ chunk-e6aww6q8.js:1548685-1549181 callgraph-witnessed = getEffectiveContextWindowSize (0.174)
/**
 * 计算自动压缩用的有效上下文窗口 {window, configured, source}：嵌套 ceiling 配置取上限；CLAUDE_CODE_AUTO_COMPACT_WINDOW（source=env）；settings 的 autoCompactWindow（可按模型 byModel）；否则走 bUo（clientdata/实验/模型默认/unknown-model/auto）。window 不超过模型上下文窗口。
 */
function getAutoCompactWindow(modelContextInfo, n, r = getSdkBetas()) {
  let { contextWindow } = modelContextInfo;
  if (isWindowWithCeiling(n)) {
    let autoCompactWindow = getAutoCompactWindow(modelContextInfo, n.inner, r);
    let { ceiling } = n;
    if (autoCompactWindow.window <= ceiling) return autoCompactWindow;
    return {
      window: Math.min(contextWindow, ceiling),
      configured: ceiling,
      source: "settings",
    };
  }
  let h = envWindowTokens(env.CLAUDE_CODE_AUTO_COMPACT_WINDOW);
  if (h !== undefined)
    return {
      window: Math.min(contextWindow, h),
      configured: h,
      source: "env",
    };
  let settingsWindow =
    typeof n !== "object"
      ? n
      : Object.hasOwn(n.byModel, modelContextInfo.settingsKey)
        ? n.byModel[modelContextInfo.settingsKey]
        : n.default;
  if (settingsWindow !== undefined && settingsWindow !== "auto")
    return {
      window: Math.min(contextWindow, settingsWindow),
      configured: settingsWindow,
      source: "settings",
    };
  return resolveAutoCompactWindow(modelContextInfo, r);
}
//@ chunk-e6aww6q8.js:1552755-1552802 sole-consumer
/**
 * 预计算压缩的缓冲比例：GrowthBook tengu_amber_moleskin 表（按窗口大小、repl/sdk）或标量 tengu_amber_rokovoko（默认 0.2）。
 */
function getPrecomputeBufferFraction(e, n, r) {
  return resolvePrecomputeFraction(e, n, r).fraction;
}
//@ chunk-e6aww6q8.js:1552802-1553297 callgraph-fingerprint = getAutoCompactThreshold (0.186)
/**
 * 自动压缩阈值配置 {enabled, precomputeBufferFraction, testPctOverride, testBlockingOverride}：CLAUDE_AUTOCOMPACT_PCT_OVERRIDE（百分比）、CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE（阻断 token 数）；远程 200k 窗口下可被 tengu_peppy_gosling 抬高百分比。
 */
function getAutoCompactThresholdConfig(e, n, r, s = true) {
  let envPercent = process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE;
  let envClaudeCodeBlockingLimitOverride = process.env.CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE;
  let S = isAutoCompactEnabled();
  let pctOverride = envPercent ? parseFloat(envPercent) : undefined;
  if (
    pctOverride !== undefined &&
    pctOverride > 0 &&
    s &&
    S &&
    env.CLAUDE_CODE_REMOTE &&
    e.contextWindow <= SECONDARY_CONTEXT_WINDOW &&
    !isOver1mThreshold(e.model, getSdkBetas())
  ) {
    let { window: L, source } = getAutoCompactWindow(e, n);
    if (L === SECONDARY_CONTEXT_WINDOW && source !== "auto") {
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
    enabled: S,
    precomputeBufferFraction: getPrecomputeBufferFraction(e, n, r),
    testPctOverride: pctOverride,
    testBlockingOverride: envClaudeCodeBlockingLimitOverride
      ? parseIntLoose(envClaudeCodeBlockingLimitOverride)
      : undefined,
  };
}
//@ chunk-e6aww6q8.js:1553297-1553342 layout
/**
 * 自动压缩阈值 token 数 = 有效窗口(扣输出预留) − 13000，或按 PCT 覆盖取较小值。
 */
function getAutoCompactThresholdTokens(modelContextInfo, n) {
  return autocompactThreshold(
    effectiveContextWindow(modelContextInfo, n),
    getAutoCompactThresholdConfig(modelContextInfo, n),
  );
}
//@ chunk-e6aww6q8.js:1553342-1553416 layout
/**
 * 同上但忽略 CLAUDE_AUTOCOMPACT_PCT_OVERRIDE（远程 fork 判断用）。
 */
function getAutoCompactThresholdWithoutPctOverride(modelFacts, autoCompactWindow) {
  return autocompactThreshold(effectiveContextWindow(modelFacts, autoCompactWindow), {
    ...getAutoCompactThresholdConfig(modelFacts, autoCompactWindow),
    testPctOverride: undefined,
  });
}
//@ chunk-e6aww6q8.js:1553416-1553684 layout
/**
 * 旧版 calculateTokenWarningState：按 token 数返回 {level: ok/warn/compact/blocked, pctLeft}；warn=阈值−20000，blocked=窗口−3000（或 BLOCKING_LIMIT_OVERRIDE）。可传入固定阈值覆盖。
 */
function calculateTokenWarningState(e, modelFacts, autoCompactWindow, fixedThreshold, h = true) {
  if (fixedThreshold !== undefined)
    return computeTokenWarning(
      e,
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
  let autoCompactThresholdConfig = getAutoCompactThresholdConfig(modelFacts, autoCompactWindow, undefined, h);
  let S = autoCompactThresholdConfig.enabled ? autoCompactWindow : undefined;
  return computeTokenWarning(
    e,
    effectiveContextWindow(modelFacts, S),
    autoCompactThresholdConfig,
    getEffectiveContextWindow(modelFacts),
  );
}
//@ chunk-e6aww6q8.js:1553684-1553850 layout
/**
 * 是否达到“预计算压缩”阈值（阈值减去缓冲比例）；非 auto 窗口来源时 200k 以下窗口不预计算。queryLoop 用它启动后台预压缩。
 */
function isAtPrecomputeThreshold(contextTokens, facts, autoCompactWindow, querySource, h = 0) {
  let autoCompactThresholdConfig = getAutoCompactThresholdConfig(facts, autoCompactWindow, querySource);
  let S = autoCompactThresholdConfig.enabled ? autoCompactWindow : undefined;
  let w = effectiveContextWindow(facts, S);
  if (!hasExplicitWindow(facts, autoCompactWindow))
    return contextTokens >= precomputeTriggerThreshold(w, autoCompactThresholdConfig);
  let { window: L } = getAutoCompactWindow(facts, S);
  if (L < SECONDARY_CONTEXT_WINDOW) return false;
  return contextTokens + h >= precomputeTriggerThreshold(w, autoCompactThresholdConfig);
}
//@ chunk-e6aww6q8.js:1553850-1553860 layout
/**
 * 3：压缩后 3 轮内又需要压缩算一次“快速回填”。
 */
var RAPID_REFILL_TURN_WINDOW = 3;
//@ chunk-e6aww6q8.js:1553860-1553954 layout
/**
 * 上次压缩后不到 3 轮又触发时连续计数 +1，否则归零。
 */
function countConsecutiveRapidRefills(e) {
  return e?.compacted === true && e.turnCounter < 3 ? (e?.consecutiveRapidRefills ?? 0) + 1 : 0;
}
//@ chunk-e6aww6q8.js:1553954-1554046 layout
/**
 * 连续快速回填 ≥3 次返回 action:"trip"（autocompact 返回 rapid_refill_breaker_tripped，queryLoop 停止本轮），否则 proceed。
 */
function checkRapidRefillBreaker(e) {
  let n = countConsecutiveRapidRefills(e);
  return {
    action: n >= 3 ? "trip" : "proceed",
    consecutiveRapidRefills: n,
  };
}
//@ chunk-e6aww6q8.js:1554046-1554156 fingerprint = autoCompactIfNeeded (0.387)
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
//@ chunk-e6aww6q8.js:1554156-1554437 placement
/**
 * 自动压缩反复触发（3 回合内重新填满，连续 3 次）的提示。
 */
var AUTOCOMPACT_THRASHING_TEXT =
  "Autocompact is thrashing: the context refilled to the limit within 3 turns of the previous compact, 3 times in a row.";
var AUTOCOMPACT_THRASHING_NOTICE = `${AUTOCOMPACT_THRASHING_TEXT} A file being read or a tool output is likely too large for the context window. Try reading in smaller chunks, or use /clear to start fresh.`;
//@ chunk-e6aww6q8.js:2443672-2444540 fingerprint = shouldAutoCompact (0.312)
/**
 * 是否需要自动压缩：compact 自身/特定来源/自动压缩关闭时为 false；token = 估算上下文 − snip 节省 + 服务端已清理量，calculateTokenWarningState 为 compact 或 blocked 时为 true；远程 fork 忽略 PCT 覆盖再判一次。
 */
async function shouldAutoCompact(
  messages,
  modelFacts,
  autoCompactWindow,
  querySource,
  h = 0,
  queryTracking,
  S = false,
) {
  if (isCompactCommand(querySource)) return false;
  if (isCompactQuerySource(querySource)) return false;
  if (usesLongContextWindow(querySource, modelFacts, autoCompactWindow)) return false;
  if (!isAutoCompactEnabled()) return false;
  if (canCompactInRemote() && !hasExplicitWindow(modelFacts, autoCompactWindow) && !S) return false;
  let serverClearedTokens = stripInProgressAssistantMessage(messages);
  let tokenCount = estimateTokensWithAnchor(messages, modelFacts.bytesPerToken) - h + serverClearedTokens;
  let threshold = getUsageAnchorMessage(messages);
  let warningState = calculateTokenWarningState(
    tokenCount,
    modelFacts,
    autoCompactWindow,
    undefined,
    threshold?.type === "assistant" && !threshold.handedOff,
  );
  logForDebugging(
    `autocompact: tokens=${tokenCount} level=${warningState.level} effectiveWindow=${effectiveContextWindow(modelFacts, autoCompactWindow)}${serverClearedTokens > 0 ? ` serverCleared=${serverClearedTokens}` : ""}`,
  );
  if (warningState.level === "compact" && env.CLAUDE_CODE_REMOTE && isSideQuerySource(querySource)) {
    let thresholdWithoutOverride = getAutoCompactThresholdWithoutPctOverride(modelFacts, autoCompactWindow);
    if (tokenCount < thresholdWithoutOverride) {
      let Se = isTidyOrigamiEnabled();
      logEvent("tengu_fork_early_compact", {
        skipped: Se,
        querySource: agentTypeForTelemetry(querySource),
        tokenCount,
        overrideThreshold: getAutoCompactThresholdTokens(modelFacts, autoCompactWindow),
        thresholdWithoutOverride,
        thresholdSource: fromEnum(windowSource(modelFacts, autoCompactWindow)),
        queryChainId: sanitizeMarkName(queryTracking?.chainId),
        queryDepth: queryTracking?.depth,
      });
      if (Se) {
        logForDebugging(
          `autocompact: not compacting the ${querySource} fork: it ignores CLAUDE_AUTOCOMPACT_PCT_OVERRIDE, and ${tokenCount} tokens is under the threshold without it (${thresholdWithoutOverride})`,
        );
        return false;
      }
    }
  }
  return warningState.level === "compact" || warningState.level === "blocked";
}
//@ chunk-e6aww6q8.js:2444540-2444827 layout
/**
 * 为 /compact 报告生成阈值快照（阈值、窗口、当前 token、压缩前 token、摘要与计量函数）；窗口来源为 auto 时返回 undefined。
 */
function getCompactThresholdSnapshot(e, messages, r, s) {
  let modelContextInfo = getModelContextInfo(r);
  let y = isAutoCompactEnabled() ? s : undefined;
  let { window: S, source } = getAutoCompactWindow(modelContextInfo, y);
  if (source === "auto") return;
  return {
    thresholdTokens: getAutoCompactThresholdTokens(modelContextInfo, y),
    windowTokens: S,
    liveTokens:
      estimateTokensWithAnchor(messages, modelContextInfo.bytesPerToken) +
      stripInProgressAssistantMessage(messages),
    madeFromTokens: e.preCompactTokens,
    summary: e.result.summaryMessages,
    sizeOf: (L) => roughTokenCountEstimationForMessages(L, modelContextInfo.bytesPerToken),
  };
}
//@ chunk-e6aww6q8.js:2444827-2444918 placement
/**
 * 本回合是否应做自动压缩：环境未禁用、自动压缩开启、来源不是压缩命令/查询。
 */
function shouldAutoCompactForTurn(e) {
  return (
    !isEnvTruthy(process.env.DISABLE_COMPACT) &&
    isAutoCompactEnabled() &&
    e !== undefined &&
    !isCompactCommand(e) &&
    !isCompactQuerySource(e)
  );
}
//@ chunk-e6aww6q8.js:2444918-2444992 placement
/**
 * 用量信用额度模型是否可用（有额度或无限制，且已开通额外用量）。
 */
function canFallbackForUsageCredits(requestedModel) {
  let n = usageCreditsOnlyFamily(requestedModel);
  return (
    n === undefined ||
    usesPayAsYouGo() ||
    isEnterpriseSubscriber_2() ||
    (hasUsageCreditsConsent(n) && hasExtraUsageProvisioned())
  );
}
//@ chunk-e6aww6q8.js:2444992-2445326 placement
/**
 * 上下文将被阻断且请求的模型窗口更大时，返回可切换的模型。
 */
function findLargerWindowModel(e, n, r, s = 0) {
  let last = e.findLast((w) => getTokenUsage(w) !== undefined);
  let requestedModel = last?.type === "assistant" ? last.requestedModel : undefined;
  if (typeof requestedModel !== "string" || !hasUsageAnchor(e)) return;
  let modelContextInfo = getModelContextInfo(requestedModel);
  return modelContextInfo.recognized &&
    modelContextInfo.contextWindow > r.contextWindow &&
    calculateTokenWarningState(
      estimateTokensWithAnchor(e, r.bytesPerToken) - s + stripInProgressAssistantMessage(e),
      r,
      n.options.autoCompactWindow,
    ).level === "blocked" &&
    isModelAllowed(requestedModel) &&
    canFallbackForUsageCredits(requestedModel) &&
    !isAutoResumableLimit(getCurrentLimits())
    ? requestedModel
    : undefined;
}
//@ chunk-e6aww6q8.js:2445326-2450031 placement
/**
 * 需要时执行自动压缩，返回已压缩、被钩子阻止、不需要或失败等结果。
 */
async function* runAutoCompactIfNeeded(
  messages,
  n,
  modelFacts,
  cacheSafeParams,
  querySource,
  y,
  S,
  w,
  L = false,
) {
  let { model } = modelFacts;
  let autoCompactWindow = n.options.autoCompactWindow;
  if (
    w !== undefined &&
    querySource !== undefined &&
    isMainQuerySource(querySource) &&
    n.session.precompute.get(agentIdOrDefault(n.agentId))?.armTrigger === "idle"
  ) {
    let At = yield* runIdleCompaction(messages, n, modelFacts, cacheSafeParams, querySource, y, w);
    if (At !== undefined) return At;
  }
  let Z = cacheSafeParams.model !== undefined;
  let Se = (y?.consecutiveFailures ?? 0) > 0;
  let ke =
    Z || Se || isNoModelFallbackEnabled() ? undefined : findLargerWindowModel(messages, n, modelFacts, S);
  let consecutiveFailures;
  if (ke !== undefined) {
    let At = yield* runAutoCompactIfNeeded(
      messages,
      {
        ...n,
        compactionApiAttemptsLeft: {
          count: 1,
        },
      },
      modelFacts,
      {
        ...cacheSafeParams,
        model: ke,
      },
      querySource,
      y,
      S,
      w,
      L,
    );
    if (At.kind === "compacted") logFeatureOk("compact_larger_model");
    else if (At.kind === "failed") {
      logFeatureSad("compact_larger_model", At.compactFailure?.reason ?? "failed");
      consecutiveFailures = At.consecutiveFailures;
    }
    if (At.kind === "compacted" || At.kind === "hook_blocked" || n.abortController.signal.aborted) return At;
  }
  let Ee = isEnvTruthy(process.env.DISABLE_COMPACT);
  let Ae = shouldAutoCompactForTurn(querySource);
  let Ie = L && !canCompactInRemote();
  let Me = Ie
    ? undefined
    : pendingClassifierOverflow(
        n,
        messages,
        Ae && !usesLongContextWindow(querySource, modelFacts, autoCompactWindow),
      );
  if (Ee)
    return {
      kind: "not_needed",
    };
  if (
    Me === undefined &&
    y?.consecutiveFailures !== undefined &&
    y.consecutiveFailures >= MAX_CONSECUTIVE_COMPACT_FAILURES
  )
    return {
      kind: "failure_breaker_open",
    };
  let We =
    Me !== undefined ||
    (Ie && Ae) ||
    (await shouldAutoCompact(messages, modelFacts, autoCompactWindow, querySource, S, n.queryTracking, Z));
  if (Ae && isMainQueryCompaction(querySource, n.agentId))
    logWindowInForce(n.session, modelFacts, autoCompactWindow);
  if (!We)
    return {
      kind: "not_needed",
      consecutiveFailures,
    };
  let ze = analyzeOversizedPrefix(messages, modelFacts, autoCompactWindow, S);
  if (ze) {
    logForDebugging(
      `autocompact: fixed prefix ~${ze.prefixTokens} > threshold ${ze.thresholdTokens} \u2014 compaction cannot help`,
      {
        level: "warn",
      },
    );
    logFeatureSad("compact_auto", "compact_auto_prefix_overflow");
    logEvent("tengu_auto_compact_prefix_overflow", {
      ...ze,
      wouldHaveBlocked: true,
    });
  }
  let lt = checkRapidRefillBreaker(y);
  let { consecutiveRapidRefills } = lt;
  if (lt.action === "trip") {
    logForDebugging(
      `autocompact: rapid-refill breaker tripped \u2014 ${consecutiveRapidRefills} consecutive refills within <${RAPID_REFILL_TURN_WINDOW} turns each (last was ${y?.turnCounter} turns)`,
      {
        level: "warn",
      },
    );
    logFeatureSad("compact_auto", "compact_auto_rapid_refill_breaker");
    if (Me)
      reportClassifierOverflowCompact(n, Me, {
        kind: "skipped",
        reason: "rapid_refill",
      });
    return {
      kind: "rapid_refill_breaker_tripped",
    };
  }
  let nt = windowSource(modelFacts, autoCompactWindow);
  let windowOrigin = resolveWindowOrigin(modelFacts, autoCompactWindow);
  let spinnerHintText = autoWindowNotice(modelFacts, autoCompactWindow);
  if (querySource !== undefined && (nt !== "auto" || Me !== undefined || Z) && canCompactInRemote()) {
    logForDebugging(
      `autocompact: routing through reactive (thresholdSource=${nt}${Me ? ", classifier overflow" : ""})`,
    );
    logEvent("tengu_auto_compact_routed_reactive", {
      thresholdSource: fromEnum(nt),
      autoCompactWindow: windowOrigin.window,
      autoCompactWindowOrigin: fromEnum(windowOrigin.origin),
      classifierOverflow: Me !== undefined,
    });
    let startTime = performance.now();
    let querySource_2 = querySource;
    let {
      result: Yt,
      hookBlocked,
      failure,
    } = yield* runCompactionAsStream(async (rn, onNotification, onResponseLength) => {
      let hn;
      if (w) {
        let childAbortController = createChildAbortController(rn.abortController);
        let To = armRecoveryCeiling(
          childAbortController,
          recoveryTimeoutForMessages(messages),
          rn.session.host.clock,
        );
        try {
          hn = await w({
            toolUseContext: {
              ...rn,
              abortController: childAbortController,
            },
            messages,
            querySource: querySource_2,
            sizingModel: model,
            trigger: "threshold",
            detectedAt: startTime,
            onResponseLength,
          });
        } finally {
          To.clear();
        }
      }
      let modelContextInfo = getModelContextInfo(model);
      let yn =
        calculateTokenWarningState(
          estimateTokensWithAnchor(messages, modelContextInfo.bytesPerToken) - (S ?? 0),
          modelContextInfo,
          autoCompactWindow,
        ).level === "blocked";
      let keepNoRound = consecutiveRapidRefills > 0 && !yn && isSleepyRippleEnabled();
      let Xn = await triggerReactiveCompact({
        hasAttempted: false,
        querySource: querySource_2,
        aborted: rn.abortController.signal.aborted,
        messages,
        cacheSafeParams: {
          ...cacheSafeParams,
          toolUseContext: rn,
        },
        precomputed: hn?.swap,
        precomputeOutcome: hn?.outcome,
        userWaitStartedAt: startTime,
        thresholdSource: nt,
        thresholdWindow: windowOrigin,
        allowLastResort: yn || Me !== undefined,
        keepNoRound,
        spinnerHintText,
        onNotification,
        onResponseLength,
      });
      if (Xn.result === null && hn?.emittedEarlyCompactStart) {
        rn.onCompactEvent?.({
          type: "compact_progress",
          event: {
            type: "compact_end",
          },
        });
        rn.onCompactEvent?.({
          type: "sdk_status",
          status: null,
        });
      }
      return Xn;
    }, n);
    if (Yt)
      return {
        kind: "compacted",
        result: Me ? compactAfterClassifierOverflow(n, Me, Yt) : Yt,
        consecutiveRapidRefills,
        thresholdSource: nt,
        thresholdWindow: windowOrigin,
        routedThroughReactive: true,
      };
    if (Me)
      reportClassifierOverflowCompact(
        n,
        Me,
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
            : n.abortController.signal.aborted
              ? {
                  kind: "skipped",
                  reason: "aborted",
                }
              : {
                  kind: "skipped",
                  reason: "unavailable",
                },
      );
    if (hookBlocked)
      return {
        kind: "hook_blocked",
        thresholdSource: nt,
        routedThroughReactive: true,
      };
    return autocompactFailure(y, true, nt, failure);
  }
  let recompactionInfo = {
    isRecompactionInChain: y?.compacted === true,
    turnsSincePreviousCompact: y?.turnCounter ?? -1,
    previousCompactTurnId: y?.turnId,
    autoCompactThreshold: getAutoCompactThresholdTokens(modelFacts, autoCompactWindow),
    querySource,
  };
  let stripNonEssential = isColdCompactEnabled();
  try {
    let At = yield* runCompactionAsStream(
      (context, onNotification, onResponseLength) =>
        compactConversation(messages, context, cacheSafeParams, true, {
          isAutoCompact: true,
          recompactionInfo,
          stripNonEssential,
          spinnerHintText,
          onNotification,
          onResponseLength,
        }),
      n,
    );
    cleanupAfterCompaction(
      n.session,
      querySource,
      n.setAppState,
      n.agentId,
      cacheSafeParams.stickyBetas,
      n.storageV5,
    );
    return {
      kind: "compacted",
      result: Me ? compactAfterClassifierOverflow(n, Me, At) : At,
      consecutiveRapidRefills,
      thresholdSource: nt,
      thresholdWindow: windowOrigin,
      routedThroughReactive: false,
    };
  } catch (error) {
    if (errorMessage(error).startsWith(COMPACTION_BLOCKED_BY_HOOK)) {
      if (Me)
        reportClassifierOverflowCompact(n, Me, {
          kind: "skipped",
          reason: "hook_blocked",
        });
      return {
        kind: "hook_blocked",
        routedThroughReactive: false,
      };
    }
    let It = hasExactErrorMessage(error, API_REQUEST_ABORTED_MESSAGE);
    let Yt = Me !== undefined && hasExactErrorMessage(error, ERROR_MESSAGE_NOT_ENOUGH_MESSAGES);
    if (Me)
      reportClassifierOverflowCompact(n, Me, {
        kind: "failed",
        reason: It ? "aborted" : Yt ? "too_few_groups" : "error",
      });
    if (!It)
      if (isCompactionFailure(error) || Yt)
        logForDebugging(`autocompact failed: ${errorMessage(error)}`, {
          level: "error",
        });
      else
        logError(withTelemetryMessage(toError(error), "autocompact: unexpected compactConversation failure"));
    return autocompactFailure(
      y,
      false,
      undefined,
      !Ie
        ? undefined
        : It
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
//@ chunk-e6aww6q8.js:2450031-2451102 placement
/**
 * 空闲时执行一次自动压缩。
 */
async function* runIdleCompaction(messages, n, r, s, querySource, y, S) {
  let startTime = performance.now();
  let thresholdSource = windowSource(r, n.options.autoCompactWindow);
  let thresholdWindow = resolveWindowOrigin(r, n.options.autoCompactWindow);
  let { result: q, hookBlocked } = yield* runCompactionAsStream(
    async (Se, onNotification, onResponseLength) => {
      try {
        let { swap, outcome } = await S({
          toolUseContext: Se,
          messages,
          querySource,
          sizingModel: r.model,
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
          aborted: Se.abortController.signal.aborted,
          messages,
          cacheSafeParams: {
            ...s,
            toolUseContext: Se,
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
    n,
  );
  if (q !== null) {
    let { boundaryMarker } = q;
    return {
      kind: "compacted",
      result: q,
      consecutiveRapidRefills: y?.consecutiveRapidRefills ?? 0,
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
//@ chunk-e6aww6q8.js:2451102-2451339 placement
/**
 * 按实验/服务端窗口压缩时的提示文本。
 */
function autoWindowNotice(e, autoCompactWindow) {
  if (resolveDesktopWindow(e) === undefined) return null;
  let { source, configured } = getAutoCompactWindow(e, autoCompactWindow);
  if ((source !== "experiment" && source !== "clientdata") || configured >= e.contextWindow) return null;
  return `Compacting at auto window (${formatTokens(configured)} tokens) \xB7 /autocompact to configure`;
}
//@ chunk-e6aww6q8.js:2451339-2451777 placement
/**
 * 取出自动模式分类器溢出触发的压缩请求（过期或离开 auto 模式时丢弃并记录）。
 */
function pendingClassifierOverflow(e, n, canCompact) {
  let { mode, servedCall } = getToolPermissionContext(e);
  let { pending, stale } = syncCompactEligibility(e, n, mode, canCompact);
  if (pending === undefined) return;
  let w = stale === "mode" && !isAutoClassifierActive(mode, servedCall === true) && mode !== "dontAsk";
  if (stale === "epoch" || w) {
    let L = stale === "epoch" ? "stale" : "left_auto_mode";
    logEvent("tengu_auto_mode_classifier_overflow_compact", {
      stage: lit_2("dropped"),
      reason: fromEnum(L),
      isSubagent: e.agentId !== undefined,
    });
    logFeatureSad("compact_classifier_overflow", L);
    return;
  }
  if (!canCompact) {
    reportClassifierOverflowCompact(e, pending, {
      kind: "skipped",
      reason: "unavailable",
    });
    return;
  }
  return pending;
}
//@ chunk-e6aww6q8.js:2451777-2452279 placement
/**
 * 自动模式分类器上下文溢出时触发压缩。
 */
function compactAfterClassifierOverflow(e, n, r) {
  logForDebugging("autocompact: compacted after the auto mode classifier overflowed");
  logEvent("tengu_auto_mode_classifier_overflow_compact", {
    stage: lit_2("compacted"),
    deniedCalls: n.deniedToolNames.length,
    isSubagent: e.agentId !== undefined,
    preCompactTokenCount: r.preCompactTokenCount,
    postCompactTokenCount: r.postCompactTokenCount,
    truePostCompactTokenCount: r.truePostCompactTokenCount,
  });
  logFeatureOk("compact_classifier_overflow");
  return {
    ...r,
    attachments: [
      ...r.attachments,
      createClassifierOverflowReminder(n.deniedToolNames.length, uniq(n.deniedToolNames)),
    ],
  };
}
//@ chunk-e6aww6q8.js:2452279-2452733 placement
/**
 * 记录分类器溢出触发的压缩结果遥测。
 */
function reportClassifierOverflowCompact(e, n, r) {
  let s = r.reason === "aborted";
  if (!s) markCompactRequestSpent(e, n);
  logForDebugging(
    `autocompact: compaction after the auto mode classifier overflowed ${r.kind} (${r.reason})`,
    {
      level: "warn",
    },
  );
  logEvent("tengu_auto_mode_classifier_overflow_compact", {
    stage: s ? lit_2("skipped") : fromEnum(r.kind),
    reason: fromEnum(r.reason),
    deniedCalls: n.deniedToolNames.length,
    isSubagent: e.agentId !== undefined,
  });
  if (r.kind === "failed" && !s) logFeatureBad("compact_classifier_overflow", r.reason);
  else logFeatureSad("compact_classifier_overflow", r.reason);
}
//@ chunk-9m4wzd68.js:369-395 placement
var CLAUDE_OPUS_4_8 = "claude-opus-4-8";
//@ chunk-9m4wzd68.js:395-476 placement
/**
 * 读 tengu_amber_redwood2/3 的信道回退模型。
 */
function getAnthropicApiFallbackModel() {
  return (
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_redwood2", "") ||
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_redwood3", "")
  );
}
//@ chunk-9m4wzd68.js:476-506 placement
var TENGU_GOOFY_JELLYFISH = "tengu_goofy_jellyfish";
//@ chunk-9m4wzd68.js:506-536 placement
/**
 * 读 tengu_goofy_jellyfish，用于判断环境变量禁用自动压缩时的模型限制。
 */
function getAutoCompactDisabledByEnvModel() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_GOOFY_JELLYFISH, "");
}
//@ chunk-9m4wzd68.js:536-621 fingerprint = isAutoCompactEnabled (0.807)
/**
 * DISABLE_COMPACT 或 DISABLE_AUTO_COMPACT 为真时返回 true（是“被环境变量禁用”，不是“已启用”；真正的启用判断是同 chunk 的 kf：未被 env 禁用且设置 autoCompactEnabled 默认 true）。旧版名 isAutoCompactEnabled 语义相反。
 */
function isAutoCompactDisabledByEnv() {
  return Boolean(isEnvTruthy(process.env.DISABLE_COMPACT) || env.DISABLE_AUTO_COMPACT);
}
export {
  getAutoCompactWindow,
  estimateTokensWithAnchor,
  findLastRealAssistantMessage,
  isCacheCold,
  promptCacheExpiresAt,
  calculateTokenWarningState,
  getAutoCompactThresholdTokens,
  createCompactTracking,
  checkRapidRefillBreaker,
  runCompactionAsStream,
  hasNoUsage,
  isAutoCompactDisabledByEnv,
  hasUsageAnchor,
  CLAUDE_OPUS_4_8,
  getAnthropicApiFallbackModel,
  getAutoCompactDisabledByEnvModel,
  getMainThreadCacheExpiresAt,
  estimateTokensSinceAnchor,
  getCompactThresholdSnapshot,
  isAtPrecomputeThreshold,
  shouldAutoCompactForTurn,
  runAutoCompactIfNeeded,
  AUTOCOMPACT_THRASHING_NOTICE,
  AUTOCOMPACT_THRASHING_TEXT,
};
