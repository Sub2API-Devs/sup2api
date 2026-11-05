/**
 * cost-tracker.ts
 *
 * 成本与用量统计：每次 API 响应按模型累加 token 与美元成本（含 advisor 子用量、OTel 计数器），会话结束保存到项目配置，/cost 与退出时输出汇总（含提示词缓存状态）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cost-tracker.ts
 * pieces: chunk-5xgkngpb.js (21), chunk-8n1fbght.js (1)
 * attribution: placement 12, fingerprint 4, layout 5, file-local 1
 */
import {
  getTotalCostUSD,
  getRootSession,
  getTotalInputTokens,
  getTotalOutputTokens,
  getTotalCacheReadInputTokens,
  getTotalCacheCreationInputTokens,
  registerSessionCostSaver,
  costLedgerBelongsToCurrentSession,
  getSessionId,
  getTotalAPIDuration,
  getTotalAPIDurationWithoutRetries,
  getTotalToolDuration,
  getTotalLinesAdded,
  getTotalLinesRemoved,
  getTotalDuration,
  getSessionStartTime,
  getModelUsage,
  hasUnknownModelCost,
  scopeCostLedgerToCurrentSession,
  setCostStateForRestore as setCostStateForRestore_2,
  getSdkBetas,
  recordCostStateToTranscript,
  getTotalWebSearchRequests,
  getUsageForModel,
  addToTotalCostState,
  getUsageSinceLastResult,
  addToSpentTokens,
  getCostCounter,
  getTokenCounter,
} from "./bootstrap/state.js";
import { import_mapValues } from "../vendor/lodash-es/_inlinedHelpers.js";
import { getContextWindow } from "./utils/model/configs.js";
import { getModelMaxOutputTokens } from "./utils/context.js";
import { saveCurrentProjectConfig, saveCurrentProjectConfigSyncForExit } from "./utils/config.js";
import { isShuttingDown } from "./utils/gracefulShutdown.js";
import { getVersionBase, attributionWithMetrics, buildAttribution } from "./services/analytics/metadata.js";
import { getCanonicalName } from "./utils/model/canonicalModelName.js";
import {
  formatModelTokenCounts,
  formatCost,
  UNKNOWN_MODEL_COST_NOTE,
  ORG_MODEL_PRICING_NOTE,
  formatDuration,
  formatNumber,
} from "./utils/format.js";
import {
  hasOrgModelPricing,
  splitCacheCreationTokens,
  getCanonicalModelForCost,
  getCostBasis,
  calculateUSDCost,
} from "./utils/modelCost.js";
import { sequential } from "./utils/sequential.js";
import {
  getPromptCacheSummary,
  estimateRecacheTokens,
  CACHE_BREAK_REASONS,
} from "./services/api/promptCacheBreakDetection.js";
import { getProviderForModel } from "./utils/model/providers.js";
import { classifyQuerySource } from "./services/api/requestHeaders.js";
import { maskModelIdIfRelayed } from "./utils/telemetry/otlpRelay.js";
import { isFastModeEnabled } from "./utils/fastMode.js";
import { getAdvisorUsage } from "./utils/advisor.js";
import { logEvent } from "./services/analytics/index.js";
import { telemetrySafeModelName } from "./utils/model/telemetryModelName.js";
import { deferInit } from "../runtime/deferred-init.js";

//@ chunk-8n1fbght.js:15707-15749 file-local
/**
 * 按精度四舍五入（round(x, 100) 保留两位）。
 */
function round(number, precision) {
  return Math.round(number * precision) / precision;
}
//@ chunk-5xgkngpb.js:978098-978158 placement
/**
 * 函数 getSessionCostUSD（本次运行成本（扣除恢复部分））；位于「成本与用量统计：每次 API 响应按模型累加 token 与美元成本（含 advisor 子用量、OTel 计数器），会话结束保存到项目配置，/cost 与退出时输出汇总（含提示词缓存状态）」模块。
 */
function getSessionCostUSD() {
  return getTotalCostUSD() - getRootSession().costLedger.restoredCostUSD();
}
//@ chunk-5xgkngpb.js:978158-978392 placement (2.1.88 match: combineUsage, 0.766)
/**
 * 返回本进程累计的 input/output/cache 读/cache 写 token，扣除恢复会话时 costLedger 记入的 restoredTokens（只统计本次运行实际消耗）。
 */
function getSessionUsageExcludingRestored() {
  let rootSession = getRootSession().costLedger.restoredTokens();
  return {
    inputTokens: getTotalInputTokens() - rootSession.inputTokens,
    outputTokens: getTotalOutputTokens() - rootSession.outputTokens,
    cacheReadInputTokens: getTotalCacheReadInputTokens() - rootSession.cacheReadInputTokens,
    cacheCreationInputTokens: getTotalCacheCreationInputTokens() - rootSession.cacheCreationInputTokens,
  };
}
//@ chunk-5xgkngpb.js:978392-978443 placement
/**
 * 函数 getSpentTokens（账本已用 token）；位于「成本与用量统计：每次 API 响应按模型累加 token 与美元成本（含 advisor 子用量、OTel 计数器），会话结束保存到项目配置，/cost 与退出时输出汇总（含提示词缓存状态）」模块。
 */
function getSpentTokens() {
  return getRootSession().costLedger.spentTokens();
}
//@ chunk-5xgkngpb.js:978443-978488 placement
/**
 * 函数 hasReachedBudget（是否达到 --max-budget-usd）；位于「成本与用量统计：每次 API 响应按模型累加 token 与美元成本（含 advisor 子用量、OTel 计数器），会话结束保存到项目配置，/cost 与退出时输出汇总（含提示词缓存状态）」模块。
 */
function hasReachedBudget(maxBudgetUsd) {
  return maxBudgetUsd !== undefined && !(getSessionCostUSD() < maxBudgetUsd);
}
//@ chunk-5xgkngpb.js:978488-978688 placement
/**
 * 达到 --max-budget-usd 上限时的提示；会话成本不是数字时说明拒绝继续。
 */
function maxBudgetReachedMessage(maxBudgetUsd) {
  if (Number.isNaN(getTotalCostUSD()))
    return `Session cost is not a number (a usage or pricing fault upstream); refusing to continue under --max-budget-usd ${maxBudgetUsd}`;
  return `Reached maximum budget ($${maxBudgetUsd})`;
}
//@ chunk-5xgkngpb.js:978688-978697 placement
// deferred: uses registerSessionCostSaver (./bootstrap/state.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:978688", () => {
  registerSessionCostSaver(saveSessionCostBeforeExit);
});
//@ chunk-5xgkngpb.js:978697-978727 placement
function saveSessionCostBeforeExit(session) {
  flushAndSaveCosts(undefined, session);
}
//@ chunk-5xgkngpb.js:978727-979423 placement (2.1.88 match: resetCostState, 0.598)
/**
 * 生成要保存的 cost-state 记录（当前会话的费用、时长、token、行数等）；账本不属于本会话时不生成。
 */
function resetCostState() {
  if (!costLedgerBelongsToCurrentSession()) return;
  return {
    type: "cost-state",
    sessionId: getSessionId(),
    totalCostUSD: getTotalCostUSD(),
    totalAPIDuration: getTotalAPIDuration(),
    totalAPIDurationWithoutRetries: getTotalAPIDurationWithoutRetries(),
    totalToolDuration: getTotalToolDuration(),
    totalLinesAdded: getTotalLinesAdded(),
    totalLinesRemoved: getTotalLinesRemoved(),
    totalDuration: getTotalDuration(),
    startTime: getSessionStartTime(),
    modelUsage: import_mapValues(getModelUsage(), (usage) => ({
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      thinkingTokens: usage.thinkingTokens,
      cacheReadInputTokens: usage.cacheReadInputTokens,
      cacheCreationInputTokens: usage.cacheCreationInputTokens,
      cacheCreationEphemeral5mInputTokens: usage.cacheCreationEphemeral5mInputTokens,
      cacheCreationEphemeral1hInputTokens: usage.cacheCreationEphemeral1hInputTokens,
      webSearchRequests: usage.webSearchRequests,
      costUSD: usage.costUSD,
    })),
    hasUnknownModelCost: hasUnknownModelCost(),
  };
}
//@ chunk-5xgkngpb.js:979423-979927 placement (2.1.88 match: setCostStateForRestore, 0.784)
/**
 * 从会话记录的 cost-state 恢复费用账本；没有记录时只限定账本范围。
 */
function setCostStateForRestore(restored) {
  let costState = restored.costState;
  if (!costState) {
    scopeCostLedgerToCurrentSession();
    return false;
  }
  setCostStateForRestore_2({
    totalCostUSD: costState.totalCostUSD,
    totalAPIDuration: costState.totalAPIDuration,
    totalAPIDurationWithoutRetries: costState.totalAPIDurationWithoutRetries,
    totalToolDuration: costState.totalToolDuration,
    totalLinesAdded: costState.totalLinesAdded,
    totalLinesRemoved: costState.totalLinesRemoved,
    lastDuration: costState.totalDuration,
    startTime: costState.startTime,
    modelUsage: import_mapValues(costState.modelUsage, (usage, model) => ({
      ...usage,
      contextWindow: getContextWindow(model, getSdkBetas()),
      maxOutputTokens: getModelMaxOutputTokens(model).default,
    })),
    hasUnknownModelCost: costState.hasUnknownModelCost,
  });
  return true;
}
//@ chunk-5xgkngpb.js:979927-979984 placement
/**
 * 函数 flushAndSaveCosts（记录成本状态并写项目配置）；位于「成本与用量统计：每次 API 响应按模型累加 token 与美元成本（含 advisor 子用量、OTel 计数器），会话结束保存到项目配置，/cost 与退出时输出汇总（含提示词缓存状态）」模块。
 */
function flushAndSaveCosts(fpsMetrics, options) {
  let resetState = resetCostState();
  if (resetState) recordCostStateToTranscript(resetState, options);
  saveCurrentProjectConfig(saveCurrentSessionCosts(fpsMetrics), options);
}
//@ chunk-5xgkngpb.js:979984-980027 placement
/**
 * 函数 saveCostsAsync（异步保存会话成本）；位于「成本与用量统计：每次 API 响应按模型累加 token 与美元成本（含 advisor 子用量、OTel 计数器），会话结束保存到项目配置，/cost 与退出时输出汇总（含提示词缓存状态）」模块。
 */
async function saveCostsAsync(fpsMetrics, storageV5) {
  await saveCurrentProjectConfig(saveCurrentSessionCosts(fpsMetrics), storageV5);
}
//@ chunk-5xgkngpb.js:980027-980055 placement
/**
 * 函数 saveCostsOnExit（退出时同步保存）；位于「成本与用量统计：每次 API 响应按模型累加 token 与美元成本（含 advisor 子用量、OTel 计数器），会话结束保存到项目配置，/cost 与退出时输出汇总（含提示词缓存状态）」模块。
 */
function saveCostsOnExit(fpsMetrics) {
  saveCurrentProjectConfigSyncForExit(saveCurrentSessionCosts(fpsMetrics));
}
//@ chunk-5xgkngpb.js:980055-980839 fingerprint (2.1.88 match: saveCurrentSessionCosts, 0.912)
/**
 * 生成保存会话成本的更新函数：总成本、API/工具/墙钟时长、增删行数、各类 token、web search 次数、FPS、各模型用量、会话 id。
 */
function saveCurrentSessionCosts(fpsMetrics) {
  let sessionCost = {
    lastCost: getTotalCostUSD(),
    lastAPIDuration: getTotalAPIDuration(),
    lastAPIDurationWithoutRetries: getTotalAPIDurationWithoutRetries(),
    lastToolDuration: getTotalToolDuration(),
    lastDuration: getTotalDuration(),
    lastStartTime: getSessionStartTime(),
    lastLinesAdded: getTotalLinesAdded(),
    lastLinesRemoved: getTotalLinesRemoved(),
    lastTotalInputTokens: getTotalInputTokens(),
    lastTotalOutputTokens: getTotalOutputTokens(),
    lastTotalCacheCreationInputTokens: getTotalCacheCreationInputTokens(),
    lastTotalCacheReadInputTokens: getTotalCacheReadInputTokens(),
    lastTotalWebSearchRequests: getTotalWebSearchRequests(),
    lastFpsAverage: fpsMetrics?.averageFps,
    lastFpsLow1Pct: fpsMetrics?.low1PctFps,
    lastGracefulShutdown: isShuttingDown(),
    lastVersionBase: getVersionBase(),
    lastModelUsage: import_mapValues(getModelUsage(), (usage) => ({
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      thinkingTokens: usage.thinkingTokens,
      cacheReadInputTokens: usage.cacheReadInputTokens,
      cacheCreationInputTokens: usage.cacheCreationInputTokens,
      webSearchRequests: usage.webSearchRequests,
      costUSD: usage.costUSD,
    })),
    lastSessionId: getSessionId(),
  };
  return (state) => ({
    ...state,
    ...sessionCost,
  });
}
//@ chunk-5xgkngpb.js:980839-981552 layout
/**
 * "Usage by model:" 多行文本（按规范化模型名合并）。
 */
function formatModelUsageSummary() {
  let modelUsage = getModelUsage();
  if (Object.keys(modelUsage).length === 0)
    return "Usage:                 0 input, 0 output, 0 cache read, 0 cache write";
  let usageByModel = new Map();
  for (let [key, value] of Object.entries(modelUsage)) {
    let canonicalName = getCanonicalName(key);
    let usage = usageByModel.get(canonicalName);
    if (!usage) {
      usage = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
        webSearchRequests: 0,
        costUSD: 0,
        contextWindow: 0,
        maxOutputTokens: 0,
      };
      usageByModel.set(canonicalName, usage);
    }
    usage.inputTokens += value.inputTokens;
    usage.outputTokens += value.outputTokens;
    usage.cacheReadInputTokens += value.cacheReadInputTokens;
    usage.cacheCreationInputTokens += value.cacheCreationInputTokens;
    usage.webSearchRequests += value.webSearchRequests;
    usage.costUSD += value.costUSD;
  }
  let header = "Usage by model:";
  for (let [model, usage] of usageByModel) {
    let line = `  ${formatModelTokenCounts(usage)} (${formatCost(usage.costUSD)})`;
    header +=
      `
` +
      `${model}:`.padStart(21) +
      line;
  }
  return header;
}
//@ chunk-5xgkngpb.js:981552-981725 layout (2.1.88 match: aliasMatchesParentTier, 0.852)
/**
 * 模型名包含 fable/opus/sonnet/haiku 时返回族名，否则原样。
 */
function getModelFamilyOrSelf(canonicalName) {
  if (canonicalName.includes("fable")) return "fable";
  if (canonicalName.includes("opus")) return "opus";
  if (canonicalName.includes("sonnet")) return "sonnet";
  if (canonicalName.includes("haiku")) return "haiku";
  return canonicalName;
}
//@ chunk-5xgkngpb.js:981725-982214 layout
/**
 * /cost 的分解行：各模型族成本占比与缓存命中率。
 */
function formatCostBreakdown() {
  let modelUsage = getModelUsage();
  let entries = Object.entries(modelUsage);
  if (entries.length === 0) return null;
  let costByModel = new Map();
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheWriteTokens = 0;
  for (let [model, usage] of entries) {
    let modelFamilyOrSelf = getModelFamilyOrSelf(getCanonicalName(model));
    costByModel.set(modelFamilyOrSelf, (costByModel.get(modelFamilyOrSelf) ?? 0) + usage.costUSD);
    inputTokens += usage.costUSD;
    outputTokens += usage.inputTokens;
    cacheReadTokens += usage.cacheReadInputTokens;
    cacheWriteTokens += usage.cacheCreationInputTokens;
  }
  let lines = [];
  if (inputTokens > 0)
    for (let [model, cost] of [...costByModel].sort((a, b) => b[1] - a[1]))
      lines.push(`${model}: ${Math.round((cost / inputTokens) * 100)}%`);
  let totalTokens = outputTokens + cacheReadTokens + cacheWriteTokens;
  if (totalTokens > 0) lines.push(`cache hit: ${Math.round((cacheReadTokens / totalTokens) * 100)}%`);
  return lines.length > 0 ? `breakdown \xB7 ${lines.join(" \xB7 ")}` : null;
}
//@ chunk-5xgkngpb.js:982214-982588 fingerprint (2.1.88 match: formatTotalCost, 1)
/**
 * /cost 与退出时的汇总：总成本（未知模型/组织计价提示）、API 与墙钟时长、代码增删行、按模型用量、提示词缓存状态。
 */
function formatTotalCost() {
  let filtered = [
    hasUnknownModelCost() && UNKNOWN_MODEL_COST_NOTE,
    hasOrgModelPricing() && ORG_MODEL_PRICING_NOTE,
  ].filter(Boolean);
  let costDisplay = formatCost(getTotalCostUSD()) + (filtered.length > 0 ? ` (${filtered.join("; ")})` : "");
  let modelUsageDisplay = formatModelUsageSummary();
  let cacheStatus = formatPromptCacheStatus();
  return sequential.dim(`Total cost:            ${costDisplay}
Total duration (API):  ${formatDuration(getTotalAPIDuration())}
Total duration (wall): ${formatDuration(getTotalDuration())}
Total code changes:    ${getTotalLinesAdded()} ${getTotalLinesAdded() === 1 ? "line" : "lines"} added, ${getTotalLinesRemoved()} ${getTotalLinesRemoved() === 1 ? "line" : "lines"} removed
${modelUsageDisplay}${
    cacheStatus
      ? `
${cacheStatus}`
      : ""
  }`);
}
//@ chunk-5xgkngpb.js:982588-983554 layout
/**
 * "Prompt cache (main):" 行：请求数、缓存命中率、miss 次数与原因、预期重建、warm/cold 与 TTL。
 */
function formatPromptCacheStatus(now = Date.now()) {
  let promptCacheSummary = getPromptCacheSummary(undefined, now);
  if (promptCacheSummary.requests === 0 || promptCacheSummary.lastRequest === null) return null;
  let lines = [
    `${promptCacheSummary.requests} ${promptCacheSummary.requests === 1 ? "request" : "requests"}`,
  ];
  if (promptCacheSummary.hitRatio !== null)
    lines.push(`${Math.round(promptCacheSummary.hitRatio * 100)}% of input tokens from cache`);
  lines.push(
    promptCacheSummary.misses === 0
      ? "no misses"
      : `${promptCacheSummary.misses} ${promptCacheSummary.misses === 1 ? "miss" : "misses"} (last ${formatDuration(now - (promptCacheSummary.lastMissAt ?? now))} ago${formatCacheMissCauses(promptCacheSummary.lastMissAttribution)}, ${formatNumber(promptCacheSummary.missRecacheTokens)} tokens re-cached)`,
  );
  if (promptCacheSummary.expectedRebuilds > 0)
    lines.push(
      `${promptCacheSummary.expectedRebuilds} expected ${promptCacheSummary.expectedRebuilds === 1 ? "rebuild" : "rebuilds"} (compaction or tool-result clearing)`,
    );
  let agoText = formatDuration(
    now - (promptCacheSummary.lastActivityAt ?? promptCacheSummary.lastRequest.at),
  );
  let recacheTokens = estimateRecacheTokens();
  if (!promptCacheSummary.cachingObserved) lines.push("no prompt caching reported by the API");
  else
    lines.push(
      promptCacheSummary.warm
        ? `warm (${promptCacheSummary.lastRequest.ttl} TTL, last activity ${agoText} ago)`
        : `cold \u2014 idle ${agoText}, ${recacheTokens === null ? "next turn re-caches the compacted prompt" : `next turn re-caches ~${formatNumber(recacheTokens)} tokens`}`,
    );
  return `Prompt cache (main):   ${lines.join(" \xB7 ")}`;
}
//@ chunk-5xgkngpb.js:983554-983949 layout
/**
 * miss 原因描述（工具增减、system 字符变化等）。
 */
function formatCacheMissCauses(lastMissAttribution) {
  if (lastMissAttribution === null || lastMissAttribution.causes.length === 0) return "";
  return ` \u2014 likely cause: ${lastMissAttribution.causes
    .map((cause) => {
      let label = CACHE_BREAK_REASONS[cause];
      if (cause === "tools_changed" && lastMissAttribution.toolsAdded !== undefined)
        return `${label} (+${lastMissAttribution.toolsAdded}/-${lastMissAttribution.toolsRemoved ?? 0})`;
      if (
        cause === "system_prompt_changed" &&
        lastMissAttribution.systemCharDelta !== undefined &&
        lastMissAttribution.systemCharDelta !== 0
      ) {
        let systemCharDelta = lastMissAttribution.systemCharDelta;
        return `${label} (${systemCharDelta > 0 ? "+" : ""}${formatNumber(systemCharDelta)} chars)`;
      }
      return label;
    })
    .join(", ")}`;
}
//@ chunk-5xgkngpb.js:983949-984793 fingerprint (2.1.88 match: addToTotalModelUsage, 0.697)
/**
 * 把一次响应的 usage 与成本累加到某模型的用量记录（含 thinking、5m/1h 缓存写入、web search、上下文窗口、最大输出、计价依据）。
 */
function addToTotalModelUsage(previousUsage, costUSD, usage, model) {
  let modelUsage = previousUsage ?? {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
    webSearchRequests: 0,
    costUSD: 0,
    contextWindow: 0,
    maxOutputTokens: 0,
  };
  modelUsage.inputTokens += usage.input_tokens;
  modelUsage.outputTokens += usage.output_tokens;
  modelUsage.thinkingTokens =
    (modelUsage.thinkingTokens ?? 0) + (usage.output_tokens_details?.thinking_tokens ?? 0);
  modelUsage.cacheReadInputTokens += usage.cache_read_input_tokens ?? 0;
  modelUsage.cacheCreationInputTokens += usage.cache_creation_input_tokens ?? 0;
  let cacheSplit = splitCacheCreationTokens(usage);
  modelUsage.cacheCreationEphemeral5mInputTokens =
    (modelUsage.cacheCreationEphemeral5mInputTokens ?? 0) + cacheSplit.fiveMinute;
  modelUsage.cacheCreationEphemeral1hInputTokens =
    (modelUsage.cacheCreationEphemeral1hInputTokens ?? 0) + cacheSplit.oneHour;
  modelUsage.webSearchRequests += usage.server_tool_use?.web_search_requests ?? 0;
  modelUsage.costUSD += costUSD;
  modelUsage.contextWindow = getContextWindow(model, getSdkBetas());
  modelUsage.maxOutputTokens = getModelMaxOutputTokens(model).default;
  modelUsage.canonicalModel = getCanonicalModelForCost(model, usage);
  modelUsage.provider = getProviderForModel(model);
  modelUsage.costBasis = getCostBasis(model, usage);
  return modelUsage;
}
//@ chunk-5xgkngpb.js:984793-986198 fingerprint (2.1.88 match: addToTotalSessionCost, 0.753)
/**
 * 每次 API 响应后累加会话成本（旧版 addToTotalSessionCost）：更新按模型用量、总成本、token 统计、OTel 成本/token 计数器（带 model/speed/query_source/effort/归因属性），并对 advisor 子调用单独计价、记 tengu_advisor_tool_token_usage 后递归累加。返回含 advisor 的总成本。
 */
function addToTotalSessionCost(
  cost,
  usage,
  model,
  querySource,
  effort,
  spawnedBySkill,
  activeSkill,
  activeMcpServer,
  activeMcpTool,
) {
  let modelUsage = addToTotalModelUsage(getUsageForModel(model), cost, usage, model);
  addToTotalCostState(cost, modelUsage, model);
  let usageSinceLastResult = getUsageSinceLastResult();
  if (usageSinceLastResult)
    usageSinceLastResult[model] = addToTotalModelUsage(usageSinceLastResult[model], cost, usage, model);
  addToSpentTokens({
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
    cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
  });
  let sourceClass = classifyQuerySource(querySource);
  let attrs = {
    model: maskModelIdIfRelayed(model),
    ...(isFastModeEnabled() &&
      usage.speed === "fast" && {
        speed: "fast",
      }),
    ...(sourceClass && {
      query_source: sourceClass,
    }),
    ...(effort && {
      effort,
    }),
    ...attributionWithMetrics(
      querySource,
      buildAttribution(querySource, spawnedBySkill, activeSkill, activeMcpServer, activeMcpTool),
    ),
  };
  getCostCounter()?.add(cost, attrs);
  getTokenCounter()?.add(usage.input_tokens, {
    ...attrs,
    type: "input",
  });
  getTokenCounter()?.add(usage.output_tokens, {
    ...attrs,
    type: "output",
  });
  getTokenCounter()?.add(usage.cache_read_input_tokens ?? 0, {
    ...attrs,
    type: "cacheRead",
  });
  getTokenCounter()?.add(usage.cache_creation_input_tokens ?? 0, {
    ...attrs,
    type: "cacheCreation",
  });
  let totalCost = cost;
  for (let advisorUsage of getAdvisorUsage(usage)) {
    let costEntry = {
      output_tokens_details: null,
      cache_creation: advisorUsage.cache_creation,
      cache_creation_input_tokens: advisorUsage.cache_creation_input_tokens,
      cache_read_input_tokens: advisorUsage.cache_read_input_tokens,
      inference_geo: usage.inference_geo ?? null,
      input_tokens: advisorUsage.input_tokens,
      iterations: null,
      output_tokens: advisorUsage.output_tokens,
      server_tool_use: null,
      service_tier: null,
      speed: null,
      fallback_credit: null,
    };
    let advisorCost = calculateUSDCost(advisorUsage.model, costEntry);
    logEvent("tengu_advisor_tool_token_usage", {
      advisor_model: telemetrySafeModelName(advisorUsage.model),
      input_tokens: advisorUsage.input_tokens,
      output_tokens: advisorUsage.output_tokens,
      cache_read_input_tokens: advisorUsage.cache_read_input_tokens,
      cache_creation_input_tokens: advisorUsage.cache_creation_input_tokens,
      cost_usd_micros: Math.round(advisorCost * 1e6),
    });
    totalCost += addToTotalSessionCost(
      advisorCost,
      costEntry,
      advisorUsage.model,
      querySource,
      undefined,
      spawnedBySkill,
      activeSkill,
      activeMcpServer,
      activeMcpTool,
    );
  }
  return totalCost;
}
export {
  addToTotalSessionCost,
  hasReachedBudget,
  resetCostState,
  setCostStateForRestore,
  getSessionCostUSD,
  getSessionUsageExcludingRestored,
  round,
  flushAndSaveCosts,
  saveCostsAsync,
  formatTotalCost,
  saveCostsOnExit,
  getSpentTokens,
  maxBudgetReachedMessage,
  formatCostBreakdown,
};
