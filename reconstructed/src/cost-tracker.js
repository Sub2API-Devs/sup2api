/**
 * cost-tracker.ts
 *
 * 成本与用量统计：每次 API 响应按模型累加 token 与美元成本（含 advisor 子用量、OTel 计数器），会话结束保存到项目配置，/cost 与退出时输出汇总（含提示词缓存状态）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cost-tracker.ts
 * pieces: chunk-e6aww6q8.js (21), chunk-tw8fk0yz.js (1)
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
import { xr } from "../vendor/lodash-es/_inlinedHelpers.js";
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

//@ chunk-e6aww6q8.js:964789-964849 placement
/**
 * 函数 getSessionCostUSD（本次运行成本（扣除恢复部分））；位于「成本与用量统计：每次 API 响应按模型累加 token 与美元成本（含 advisor 子用量、OTel 计数器），会话结束保存到项目配置，/cost 与退出时输出汇总（含提示词缓存状态）」模块。
 */
function getSessionCostUSD() {
  return getTotalCostUSD() - getRootSession().costLedger.restoredCostUSD();
}
//@ chunk-e6aww6q8.js:964849-965083 placement = combineUsage (0.766)
/**
 * 返回本进程累计的 input/output/cache 读/cache 写 token，扣除恢复会话时 costLedger 记入的 restoredTokens（只统计本次运行实际消耗）。
 */
function getSessionUsageExcludingRestored() {
  let e = getRootSession().costLedger.restoredTokens();
  return {
    inputTokens: getTotalInputTokens() - e.inputTokens,
    outputTokens: getTotalOutputTokens() - e.outputTokens,
    cacheReadInputTokens: getTotalCacheReadInputTokens() - e.cacheReadInputTokens,
    cacheCreationInputTokens: getTotalCacheCreationInputTokens() - e.cacheCreationInputTokens,
  };
}
//@ chunk-e6aww6q8.js:965083-965134 placement
/**
 * 函数 getSpentTokens（账本已用 token）；位于「成本与用量统计：每次 API 响应按模型累加 token 与美元成本（含 advisor 子用量、OTel 计数器），会话结束保存到项目配置，/cost 与退出时输出汇总（含提示词缓存状态）」模块。
 */
function getSpentTokens() {
  return getRootSession().costLedger.spentTokens();
}
//@ chunk-e6aww6q8.js:965134-965179 placement
/**
 * 函数 hasReachedBudget（是否达到 --max-budget-usd）；位于「成本与用量统计：每次 API 响应按模型累加 token 与美元成本（含 advisor 子用量、OTel 计数器），会话结束保存到项目配置，/cost 与退出时输出汇总（含提示词缓存状态）」模块。
 */
function hasReachedBudget(maxBudgetUsd) {
  return maxBudgetUsd !== undefined && !(getSessionCostUSD() < maxBudgetUsd);
}
//@ chunk-e6aww6q8.js:965179-965379 placement
/**
 * 达到 --max-budget-usd 上限时的提示；会话成本不是数字时说明拒绝继续。
 */
function maxBudgetReachedMessage(maxBudgetUsd) {
  if (Number.isNaN(getTotalCostUSD()))
    return `Session cost is not a number (a usage or pricing fault upstream); refusing to continue under --max-budget-usd ${maxBudgetUsd}`;
  return `Reached maximum budget ($${maxBudgetUsd})`;
}
//@ chunk-e6aww6q8.js:965379-965388 placement
registerSessionCostSaver(saveSessionCostBeforeExit);
//@ chunk-e6aww6q8.js:965388-965418 placement
function saveSessionCostBeforeExit(e) {
  flushAndSaveCosts(undefined, e);
}
//@ chunk-e6aww6q8.js:965418-966114 placement = resetCostState (0.598)
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
    modelUsage: xr(getModelUsage(), (e) => ({
      inputTokens: e.inputTokens,
      outputTokens: e.outputTokens,
      thinkingTokens: e.thinkingTokens,
      cacheReadInputTokens: e.cacheReadInputTokens,
      cacheCreationInputTokens: e.cacheCreationInputTokens,
      cacheCreationEphemeral5mInputTokens: e.cacheCreationEphemeral5mInputTokens,
      cacheCreationEphemeral1hInputTokens: e.cacheCreationEphemeral1hInputTokens,
      webSearchRequests: e.webSearchRequests,
      costUSD: e.costUSD,
    })),
    hasUnknownModelCost: hasUnknownModelCost(),
  };
}
//@ chunk-e6aww6q8.js:966114-966618 placement = setCostStateForRestore (0.784)
/**
 * 从会话记录的 cost-state 恢复费用账本；没有记录时只限定账本范围。
 */
function setCostStateForRestore(e) {
  let costState = e.costState;
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
    modelUsage: xr(costState.modelUsage, (r, s) => ({
      ...r,
      contextWindow: getContextWindow(s, getSdkBetas()),
      maxOutputTokens: getModelMaxOutputTokens(s).default,
    })),
    hasUnknownModelCost: costState.hasUnknownModelCost,
  });
  return true;
}
//@ chunk-e6aww6q8.js:966618-966675 placement
/**
 * 函数 flushAndSaveCosts（记录成本状态并写项目配置）；位于「成本与用量统计：每次 API 响应按模型累加 token 与美元成本（含 advisor 子用量、OTel 计数器），会话结束保存到项目配置，/cost 与退出时输出汇总（含提示词缓存状态）」模块。
 */
function flushAndSaveCosts(fpsMetrics, storageV5) {
  let r = resetCostState();
  if (r) recordCostStateToTranscript(r, storageV5);
  saveCurrentProjectConfig(saveCurrentSessionCosts(fpsMetrics), storageV5);
}
//@ chunk-e6aww6q8.js:966675-966718 placement
/**
 * 函数 saveCostsAsync（异步保存会话成本）；位于「成本与用量统计：每次 API 响应按模型累加 token 与美元成本（含 advisor 子用量、OTel 计数器），会话结束保存到项目配置，/cost 与退出时输出汇总（含提示词缓存状态）」模块。
 */
async function saveCostsAsync(fpsMetrics, storageV5) {
  await saveCurrentProjectConfig(saveCurrentSessionCosts(fpsMetrics), storageV5);
}
//@ chunk-e6aww6q8.js:966718-966746 placement
/**
 * 函数 saveCostsOnExit（退出时同步保存）；位于「成本与用量统计：每次 API 响应按模型累加 token 与美元成本（含 advisor 子用量、OTel 计数器），会话结束保存到项目配置，/cost 与退出时输出汇总（含提示词缓存状态）」模块。
 */
function saveCostsOnExit(fpsMetrics) {
  saveCurrentProjectConfigSyncForExit(saveCurrentSessionCosts(fpsMetrics));
}
//@ chunk-e6aww6q8.js:966746-967530 fingerprint = saveCurrentSessionCosts (0.912)
/**
 * 生成保存会话成本的更新函数：总成本、API/工具/墙钟时长、增删行数、各类 token、web search 次数、FPS、各模型用量、会话 id。
 */
function saveCurrentSessionCosts(fpsMetrics) {
  let n = {
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
    lastModelUsage: xr(getModelUsage(), (usage) => ({
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
  return (r) => ({
    ...r,
    ...n,
  });
}
//@ chunk-e6aww6q8.js:967530-968243 layout
/**
 * "Usage by model:" 多行文本（按规范化模型名合并）。
 */
function formatModelUsageSummary() {
  let modelUsage = getModelUsage();
  if (Object.keys(modelUsage).length === 0)
    return "Usage:                 0 input, 0 output, 0 cache read, 0 cache write";
  let n = new Map();
  for (let [key, value] of Object.entries(modelUsage)) {
    let canonicalName = getCanonicalName(key);
    let S = n.get(canonicalName);
    if (!S) {
      S = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
        webSearchRequests: 0,
        costUSD: 0,
        contextWindow: 0,
        maxOutputTokens: 0,
      };
      n.set(canonicalName, S);
    }
    S.inputTokens += value.inputTokens;
    S.outputTokens += value.outputTokens;
    S.cacheReadInputTokens += value.cacheReadInputTokens;
    S.cacheCreationInputTokens += value.cacheCreationInputTokens;
    S.webSearchRequests += value.webSearchRequests;
    S.costUSD += value.costUSD;
  }
  let r = "Usage by model:";
  for (let [s, h] of n) {
    let y = `  ${formatModelTokenCounts(h)} (${formatCost(h.costUSD)})`;
    r +=
      `
` +
      `${s}:`.padStart(21) +
      y;
  }
  return r;
}
//@ chunk-e6aww6q8.js:968243-968416 layout = aliasMatchesParentTier (0.852)
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
//@ chunk-e6aww6q8.js:968416-968900 layout
/**
 * /cost 的分解行：各模型族成本占比与缓存命中率。
 */
function formatCostBreakdown() {
  let modelUsage = getModelUsage();
  let entries = Object.entries(modelUsage);
  if (entries.length === 0) return null;
  let r = new Map();
  let s = 0;
  let h = 0;
  let y = 0;
  let S = 0;
  for (let [G, q] of entries) {
    let modelFamilyOrSelf = getModelFamilyOrSelf(getCanonicalName(G));
    r.set(modelFamilyOrSelf, (r.get(modelFamilyOrSelf) ?? 0) + q.costUSD);
    s += q.costUSD;
    h += q.inputTokens;
    y += q.cacheReadInputTokens;
    S += q.cacheCreationInputTokens;
  }
  let w = [];
  if (s > 0)
    for (let [G, q] of [...r].sort((Z, Se) => Se[1] - Z[1])) w.push(`${G}: ${Math.round((q / s) * 100)}%`);
  let L = h + y + S;
  if (L > 0) w.push(`cache hit: ${Math.round((y / L) * 100)}%`);
  return w.length > 0 ? `breakdown \xB7 ${w.join(" \xB7 ")}` : null;
}
//@ chunk-e6aww6q8.js:968900-969274 fingerprint = formatTotalCost (1)
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
  let s = formatPromptCacheStatus();
  return sequential.dim(`Total cost:            ${costDisplay}
Total duration (API):  ${formatDuration(getTotalAPIDuration())}
Total duration (wall): ${formatDuration(getTotalDuration())}
Total code changes:    ${getTotalLinesAdded()} ${getTotalLinesAdded() === 1 ? "line" : "lines"} added, ${getTotalLinesRemoved()} ${getTotalLinesRemoved() === 1 ? "line" : "lines"} removed
${modelUsageDisplay}${
    s
      ? `
${s}`
      : ""
  }`);
}
//@ chunk-e6aww6q8.js:969274-970240 layout
/**
 * "Prompt cache (main):" 行：请求数、缓存命中率、miss 次数与原因、预期重建、warm/cold 与 TTL。
 */
function formatPromptCacheStatus(e = Date.now()) {
  let promptCacheSummary = getPromptCacheSummary(undefined, e);
  if (promptCacheSummary.requests === 0 || promptCacheSummary.lastRequest === null) return null;
  let r = [`${promptCacheSummary.requests} ${promptCacheSummary.requests === 1 ? "request" : "requests"}`];
  if (promptCacheSummary.hitRatio !== null)
    r.push(`${Math.round(promptCacheSummary.hitRatio * 100)}% of input tokens from cache`);
  r.push(
    promptCacheSummary.misses === 0
      ? "no misses"
      : `${promptCacheSummary.misses} ${promptCacheSummary.misses === 1 ? "miss" : "misses"} (last ${formatDuration(e - (promptCacheSummary.lastMissAt ?? e))} ago${formatCacheMissCauses(promptCacheSummary.lastMissAttribution)}, ${formatNumber(promptCacheSummary.missRecacheTokens)} tokens re-cached)`,
  );
  if (promptCacheSummary.expectedRebuilds > 0)
    r.push(
      `${promptCacheSummary.expectedRebuilds} expected ${promptCacheSummary.expectedRebuilds === 1 ? "rebuild" : "rebuilds"} (compaction or tool-result clearing)`,
    );
  let s = formatDuration(e - (promptCacheSummary.lastActivityAt ?? promptCacheSummary.lastRequest.at));
  let h = estimateRecacheTokens();
  if (!promptCacheSummary.cachingObserved) r.push("no prompt caching reported by the API");
  else
    r.push(
      promptCacheSummary.warm
        ? `warm (${promptCacheSummary.lastRequest.ttl} TTL, last activity ${s} ago)`
        : `cold \u2014 idle ${s}, ${h === null ? "next turn re-caches the compacted prompt" : `next turn re-caches ~${formatNumber(h)} tokens`}`,
    );
  return `Prompt cache (main):   ${r.join(" \xB7 ")}`;
}
//@ chunk-e6aww6q8.js:970240-970635 layout
/**
 * miss 原因描述（工具增减、system 字符变化等）。
 */
function formatCacheMissCauses(lastMissAttribution) {
  if (lastMissAttribution === null || lastMissAttribution.causes.length === 0) return "";
  return ` \u2014 likely cause: ${lastMissAttribution.causes
    .map((cause) => {
      let s = CACHE_BREAK_REASONS[cause];
      if (cause === "tools_changed" && lastMissAttribution.toolsAdded !== undefined)
        return `${s} (+${lastMissAttribution.toolsAdded}/-${lastMissAttribution.toolsRemoved ?? 0})`;
      if (
        cause === "system_prompt_changed" &&
        lastMissAttribution.systemCharDelta !== undefined &&
        lastMissAttribution.systemCharDelta !== 0
      ) {
        let systemCharDelta = lastMissAttribution.systemCharDelta;
        return `${s} (${systemCharDelta > 0 ? "+" : ""}${formatNumber(systemCharDelta)} chars)`;
      }
      return s;
    })
    .join(", ")}`;
}
//@ chunk-e6aww6q8.js:970635-971479 fingerprint = addToTotalModelUsage (0.697)
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
  let y = splitCacheCreationTokens(usage);
  modelUsage.cacheCreationEphemeral5mInputTokens =
    (modelUsage.cacheCreationEphemeral5mInputTokens ?? 0) + y.fiveMinute;
  modelUsage.cacheCreationEphemeral1hInputTokens =
    (modelUsage.cacheCreationEphemeral1hInputTokens ?? 0) + y.oneHour;
  modelUsage.webSearchRequests += usage.server_tool_use?.web_search_requests ?? 0;
  modelUsage.costUSD += costUSD;
  modelUsage.contextWindow = getContextWindow(model, getSdkBetas());
  modelUsage.maxOutputTokens = getModelMaxOutputTokens(model).default;
  modelUsage.canonicalModel = getCanonicalModelForCost(model, usage);
  modelUsage.provider = getProviderForModel(model);
  modelUsage.costBasis = getCostBasis(model, usage);
  return modelUsage;
}
//@ chunk-e6aww6q8.js:971479-972881 fingerprint = addToTotalSessionCost (0.752)
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
  let Z = classifyQuerySource(querySource);
  let attrs = {
    model: maskModelIdIfRelayed(model),
    ...(isFastModeEnabled() &&
      usage.speed === "fast" && {
        speed: "fast",
      }),
    ...(Z && {
      query_source: Z,
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
    let Ee = {
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
    let advisorCost = calculateUSDCost(advisorUsage.model, Ee);
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
      Ee,
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
//@ chunk-tw8fk0yz.js:15693-15735 file-local
/**
 * 按精度四舍五入（round(x, 100) 保留两位）。
 */
function round(number, precision) {
  return Math.round(number * precision) / precision;
}
export {
  setCostStateForRestore,
  getSpentTokens,
  hasReachedBudget,
  getSessionCostUSD,
  flushAndSaveCosts,
  resetCostState,
  saveCostsAsync,
  formatTotalCost,
  saveCostsOnExit,
  addToTotalSessionCost,
  round,
  formatCostBreakdown,
  getSessionUsageExcludingRestored,
  maxBudgetReachedMessage,
};
