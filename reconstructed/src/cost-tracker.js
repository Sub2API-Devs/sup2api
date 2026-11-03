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
import { getVersionBase, Jki, buildAttribution } from "./services/analytics/metadata.js";
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
import { pTn } from "./utils/telemetry/otlpRelay.js";
import { isFastModeEnabled } from "./utils/fastMode.js";
import { getAdvisorUsage } from "./utils/advisor.js";
import { logEvent } from "./services/analytics/index.js";
import { telemetrySafeModelName } from "./utils/model/telemetryModelName.js";

//@ chunk-e6aww6q8.js:964789-964849 placement
function ACe() {
  return getTotalCostUSD() - getRootSession().costLedger.restoredCostUSD();
}
/**
 * 返回本进程累计的 input/output/cache 读/cache 写 token，扣除恢复会话时 costLedger 记入的 restoredTokens（只统计本次运行实际消耗）。
 */
//@ chunk-e6aww6q8.js:964849-965083 placement = combineUsage (0.766)
function getSessionUsageExcludingRestored() {
  let restoredTokens = getRootSession().costLedger.restoredTokens();
  return {
    inputTokens: getTotalInputTokens() - restoredTokens.inputTokens,
    outputTokens: getTotalOutputTokens() - restoredTokens.outputTokens,
    cacheReadInputTokens: getTotalCacheReadInputTokens() - restoredTokens.cacheReadInputTokens,
    cacheCreationInputTokens: getTotalCacheCreationInputTokens() - restoredTokens.cacheCreationInputTokens,
  };
}
//@ chunk-e6aww6q8.js:965083-965134 placement
function OVs() {
  return getRootSession().costLedger.spentTokens();
}
//@ chunk-e6aww6q8.js:965134-965179 placement
function uN(e) {
  return e !== void 0 && !(ACe() < e);
}
/**
 * 达到 --max-budget-usd 上限时的提示；会话成本不是数字时说明拒绝继续。
 */
//@ chunk-e6aww6q8.js:965179-965379 placement
function maxBudgetReachedMessage(e) {
  if (Number.isNaN(getTotalCostUSD()))
    return `Session cost is not a number (a usage or pricing fault upstream); refusing to continue under --max-budget-usd ${e}`;
  return `Reached maximum budget ($${e})`;
}
//@ chunk-e6aww6q8.js:965379-965388 placement
registerSessionCostSaver(Ixo);
//@ chunk-e6aww6q8.js:965388-965418 placement
function Ixo(e) {
  Ozt(void 0, e);
}
/**
 * 生成要保存的 cost-state 记录（当前会话的费用、时长、token、行数等）；账本不属于本会话时不生成。
 */
//@ chunk-e6aww6q8.js:965418-966114 placement = resetCostState (0.598)
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
/**
 * 从会话记录的 cost-state 恢复费用账本；没有记录时只限定账本范围。
 */
//@ chunk-e6aww6q8.js:966114-966618 placement = setCostStateForRestore (0.784)
function setCostStateForRestore(e) {
  let costState = e.costState;
  if (!costState) return (scopeCostLedgerToCurrentSession(), !1);
  return (
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
    }),
    !0
  );
}
//@ chunk-e6aww6q8.js:966618-966675 placement
function Ozt(e, n) {
  let r = resetCostState();
  if (r) recordCostStateToTranscript(r, n);
  saveCurrentProjectConfig(saveCurrentSessionCosts(e), n);
}
//@ chunk-e6aww6q8.js:966675-966718 placement
async function Q9s(e, n) {
  await saveCurrentProjectConfig(saveCurrentSessionCosts(e), n);
}
//@ chunk-e6aww6q8.js:966718-966746 placement
function Z9s(e) {
  saveCurrentProjectConfigSyncForExit(saveCurrentSessionCosts(e));
}
/**
 * 生成保存会话成本的更新函数：总成本、API/工具/墙钟时长、增删行数、各类 token、web search 次数、FPS、各模型用量、会话 id。
 */
//@ chunk-e6aww6q8.js:966746-967530 fingerprint = saveCurrentSessionCosts (0.912)
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
    lastModelUsage: xr(getModelUsage(), (current) => ({
      inputTokens: current.inputTokens,
      outputTokens: current.outputTokens,
      thinkingTokens: current.thinkingTokens,
      cacheReadInputTokens: current.cacheReadInputTokens,
      cacheCreationInputTokens: current.cacheCreationInputTokens,
      webSearchRequests: current.webSearchRequests,
      costUSD: current.costUSD,
    })),
    lastSessionId: getSessionId(),
  };
  return (r) => ({ ...r, ...n });
}
/**
 * "Usage by model:" 多行文本（按规范化模型名合并）。
 */
//@ chunk-e6aww6q8.js:967530-968243 layout
function formatModelUsageSummary() {
  let e = getModelUsage();
  if (Object.keys(e).length === 0)
    return "Usage:                 0 input, 0 output, 0 cache read, 0 cache write";
  let n = new Map();
  for (let [s, h] of Object.entries(e)) {
    let y = getCanonicalName(s),
      S = n.get(y);
    if (!S)
      ((S = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
        webSearchRequests: 0,
        costUSD: 0,
        contextWindow: 0,
        maxOutputTokens: 0,
      }),
        n.set(y, S));
    ((S.inputTokens += h.inputTokens),
      (S.outputTokens += h.outputTokens),
      (S.cacheReadInputTokens += h.cacheReadInputTokens),
      (S.cacheCreationInputTokens += h.cacheCreationInputTokens),
      (S.webSearchRequests += h.webSearchRequests),
      (S.costUSD += h.costUSD));
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
/**
 * 模型名包含 fable/opus/sonnet/haiku 时返回族名，否则原样。
 */
//@ chunk-e6aww6q8.js:968243-968416 layout = aliasMatchesParentTier (0.852)
function getModelFamilyOrSelf(e) {
  if (e.includes("fable")) return "fable";
  if (e.includes("opus")) return "opus";
  if (e.includes("sonnet")) return "sonnet";
  if (e.includes("haiku")) return "haiku";
  return e;
}
/**
 * /cost 的分解行：各模型族成本占比与缓存命中率。
 */
//@ chunk-e6aww6q8.js:968416-968900 layout
function formatCostBreakdown() {
  let e = getModelUsage(),
    entries = Object.entries(e);
  if (entries.length === 0) return null;
  let r = new Map(),
    s = 0,
    h = 0,
    y = 0,
    S = 0;
  for (let [G, q] of entries) {
    let Z = getModelFamilyOrSelf(getCanonicalName(G));
    (r.set(Z, (r.get(Z) ?? 0) + q.costUSD),
      (s += q.costUSD),
      (h += q.inputTokens),
      (y += q.cacheReadInputTokens),
      (S += q.cacheCreationInputTokens));
  }
  let w = [];
  if (s > 0)
    for (let [G, q] of [...r].sort((Z, Se) => Se[1] - Z[1])) w.push(`${G}: ${Math.round((q / s) * 100)}%`);
  let L = h + y + S;
  if (L > 0) w.push(`cache hit: ${Math.round((y / L) * 100)}%`);
  return w.length > 0 ? `breakdown \xB7 ${w.join(" \xB7 ")}` : null;
}
/**
 * /cost 与退出时的汇总：总成本（未知模型/组织计价提示）、API 与墙钟时长、代码增删行、按模型用量、提示词缓存状态。
 */
//@ chunk-e6aww6q8.js:968900-969274 fingerprint = formatTotalCost (1)
function formatTotalCost() {
  let filtered = [
      hasUnknownModelCost() && UNKNOWN_MODEL_COST_NOTE,
      hasOrgModelPricing() && ORG_MODEL_PRICING_NOTE,
    ].filter(Boolean),
    costDisplay = formatCost(getTotalCostUSD()) + (filtered.length > 0 ? ` (${filtered.join("; ")})` : ""),
    modelUsageDisplay = formatModelUsageSummary(),
    s = formatPromptCacheStatus();
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
/**
 * "Prompt cache (main):" 行：请求数、缓存命中率、miss 次数与原因、预期重建、warm/cold 与 TTL。
 */
//@ chunk-e6aww6q8.js:969274-970240 layout
function formatPromptCacheStatus(e = Date.now()) {
  let n = getPromptCacheSummary(void 0, e);
  if (n.requests === 0 || n.lastRequest === null) return null;
  let r = [`${n.requests} ${n.requests === 1 ? "request" : "requests"}`];
  if (n.hitRatio !== null) r.push(`${Math.round(n.hitRatio * 100)}% of input tokens from cache`);
  if (
    (r.push(
      n.misses === 0
        ? "no misses"
        : `${n.misses} ${n.misses === 1 ? "miss" : "misses"} (last ${formatDuration(e - (n.lastMissAt ?? e))} ago${formatCacheMissCauses(n.lastMissAttribution)}, ${formatNumber(n.missRecacheTokens)} tokens re-cached)`,
    ),
    n.expectedRebuilds > 0)
  )
    r.push(
      `${n.expectedRebuilds} expected ${n.expectedRebuilds === 1 ? "rebuild" : "rebuilds"} (compaction or tool-result clearing)`,
    );
  let s = formatDuration(e - (n.lastActivityAt ?? n.lastRequest.at)),
    h = estimateRecacheTokens();
  if (!n.cachingObserved) r.push("no prompt caching reported by the API");
  else
    r.push(
      n.warm
        ? `warm (${n.lastRequest.ttl} TTL, last activity ${s} ago)`
        : `cold \u2014 idle ${s}, ${h === null ? "next turn re-caches the compacted prompt" : `next turn re-caches ~${formatNumber(h)} tokens`}`,
    );
  return `Prompt cache (main):   ${r.join(" \xB7 ")}`;
}
/**
 * miss 原因描述（工具增减、system 字符变化等）。
 */
//@ chunk-e6aww6q8.js:970240-970635 layout
function formatCacheMissCauses(e) {
  if (e === null || e.causes.length === 0) return "";
  return ` \u2014 likely cause: ${e.causes
    .map((cause) => {
      let s = CACHE_BREAK_REASONS[cause];
      if (cause === "tools_changed" && e.toolsAdded !== void 0)
        return `${s} (+${e.toolsAdded}/-${e.toolsRemoved ?? 0})`;
      if (cause === "system_prompt_changed" && e.systemCharDelta !== void 0 && e.systemCharDelta !== 0) {
        let systemCharDelta = e.systemCharDelta;
        return `${s} (${systemCharDelta > 0 ? "+" : ""}${formatNumber(systemCharDelta)} chars)`;
      }
      return s;
    })
    .join(", ")}`;
}
/**
 * 把一次响应的 usage 与成本累加到某模型的用量记录（含 thinking、5m/1h 缓存写入、web search、上下文窗口、最大输出、计价依据）。
 */
//@ chunk-e6aww6q8.js:970635-971479 fingerprint = addToTotalModelUsage (0.697)
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
  ((modelUsage.inputTokens += usage.input_tokens),
    (modelUsage.outputTokens += usage.output_tokens),
    (modelUsage.thinkingTokens =
      (modelUsage.thinkingTokens ?? 0) + (usage.output_tokens_details?.thinking_tokens ?? 0)),
    (modelUsage.cacheReadInputTokens += usage.cache_read_input_tokens ?? 0),
    (modelUsage.cacheCreationInputTokens += usage.cache_creation_input_tokens ?? 0));
  let y = splitCacheCreationTokens(usage);
  return (
    (modelUsage.cacheCreationEphemeral5mInputTokens =
      (modelUsage.cacheCreationEphemeral5mInputTokens ?? 0) + y.fiveMinute),
    (modelUsage.cacheCreationEphemeral1hInputTokens =
      (modelUsage.cacheCreationEphemeral1hInputTokens ?? 0) + y.oneHour),
    (modelUsage.webSearchRequests += usage.server_tool_use?.web_search_requests ?? 0),
    (modelUsage.costUSD += costUSD),
    (modelUsage.contextWindow = getContextWindow(model, getSdkBetas())),
    (modelUsage.maxOutputTokens = getModelMaxOutputTokens(model).default),
    (modelUsage.canonicalModel = getCanonicalModelForCost(model, usage)),
    (modelUsage.provider = getProviderForModel(model)),
    (modelUsage.costBasis = getCostBasis(model, usage)),
    modelUsage
  );
}
/**
 * 每次 API 响应后累加会话成本（旧版 addToTotalSessionCost）：更新按模型用量、总成本、token 统计、OTel 成本/token 计数器（带 model/speed/query_source/effort/归因属性），并对 advisor 子调用单独计价、记 tengu_advisor_tool_token_usage 后递归累加。返回含 advisor 的总成本。
 */
//@ chunk-e6aww6q8.js:971479-972881 fingerprint = addToTotalSessionCost (0.752)
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
  let G = addToTotalModelUsage(getUsageForModel(model), cost, usage, model);
  addToTotalCostState(cost, G, model);
  let q = getUsageSinceLastResult();
  if (q) q[model] = addToTotalModelUsage(q[model], cost, usage, model);
  addToSpentTokens({
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
    cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
  });
  let Z = classifyQuerySource(querySource),
    Se = {
      model: pTn(model),
      ...(isFastModeEnabled() && usage.speed === "fast" && { speed: "fast" }),
      ...(Z && { query_source: Z }),
      ...(effort && { effort: effort }),
      ...Jki(
        querySource,
        buildAttribution(querySource, spawnedBySkill, activeSkill, activeMcpServer, activeMcpTool),
      ),
    };
  (getCostCounter()?.add(cost, Se),
    getTokenCounter()?.add(usage.input_tokens, { ...Se, type: "input" }),
    getTokenCounter()?.add(usage.output_tokens, { ...Se, type: "output" }),
    getTokenCounter()?.add(usage.cache_read_input_tokens ?? 0, { ...Se, type: "cacheRead" }),
    getTokenCounter()?.add(usage.cache_creation_input_tokens ?? 0, { ...Se, type: "cacheCreation" }));
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
      },
      advisorCost = calculateUSDCost(advisorUsage.model, Ee);
    (logEvent("tengu_advisor_tool_token_usage", {
      advisor_model: telemetrySafeModelName(advisorUsage.model),
      input_tokens: advisorUsage.input_tokens,
      output_tokens: advisorUsage.output_tokens,
      cache_read_input_tokens: advisorUsage.cache_read_input_tokens,
      cache_creation_input_tokens: advisorUsage.cache_creation_input_tokens,
      cost_usd_micros: Math.round(advisorCost * 1e6),
    }),
      (totalCost += addToTotalSessionCost(
        advisorCost,
        Ee,
        advisorUsage.model,
        querySource,
        void 0,
        spawnedBySkill,
        activeSkill,
        activeMcpServer,
        activeMcpTool,
      )));
  }
  return totalCost;
}
/**
 * 按精度四舍五入（round(x, 100) 保留两位）。
 */
//@ chunk-tw8fk0yz.js:15693-15735 file-local
function round(number, precision) {
  return Math.round(number * precision) / precision;
}

export {
  setCostStateForRestore,
  OVs,
  uN,
  ACe,
  Ozt,
  resetCostState,
  Q9s,
  formatTotalCost,
  Z9s,
  addToTotalSessionCost,
  round,
  formatCostBreakdown,
  getSessionUsageExcludingRestored,
  maxBudgetReachedMessage,
};
