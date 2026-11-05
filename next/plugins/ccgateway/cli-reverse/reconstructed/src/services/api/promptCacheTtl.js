/**
 * services/api/promptCacheTtl.ts
 *
 * 2.1.316 新增：提示缓存 TTL 选择
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (10)
 * attribution: placement 10
 */
import { normalizeModelId } from "../../utils/model/modelCatalog/catalogEntries.js";
import { env } from "../../utils/env.js";
import { getInitialSettings } from "../../utils/settings/settings.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { EMPTY_USAGE } from "./emptyUsage.js";
import { calculateCostWithPricingSource } from "../../utils/modelCost.js";
import { getLastMainThreadCacheTtlMs } from "../../bootstrap/state.js";
import { CACHE_TTL_1H_MS } from "./promptCacheBreakDetection.js";
import { isOneHourCacheTtl, getPromptCachingEnabled, should1hCacheTTL } from "./claude.js";

//@ chunk-5xgkngpb.js:2128693-2128744 placement
function stripModelDateSuffix(modelId) {
  return normalizeModelId(modelId).replace(/-\d{8}$/, "");
}
//@ chunk-5xgkngpb.js:2128744-2128811 placement
var ONE_HOUR_TTL_SOURCES = ["repl_main_thread*", "sdk", "auto_mode", "memdir_relevance"];
//@ chunk-5xgkngpb.js:2128811-2128845 placement
function usesOneHourTtl(source) {
  return matchesModelPattern(source, ONE_HOUR_TTL_SOURCES);
}
//@ chunk-5xgkngpb.js:2128845-2128945 placement
function matchesModelPattern(model, patterns) {
  return (
    model !== undefined &&
    patterns.some((pattern) =>
      pattern.endsWith("*") ? model.startsWith(pattern.slice(0, -1)) : model === pattern,
    )
  );
}
//@ chunk-5xgkngpb.js:2128945-2129021 placement
function applyFiveMinuteOverride(ttl) {
  return env.CLAUDE_CODE_MESSAGES_PROMPT_CACHE_TTL === "5m" ? "5m" : ttl;
}
//@ chunk-5xgkngpb.js:2129021-2129545 placement
/**
 * 决定提示缓存 TTL（5 分钟或 1 小时），来源包括环境变量、设置、代理 frontmatter、Bedrock。
 */
function resolvePromptCacheTtl(querySource, agentOverride, billedOverage = false) {
  if (env.FORCE_PROMPT_CACHING_5M)
    return {
      ttl: "5m",
      reason: "force_5m_env",
    };
  let oneHour = usesOneHourTtl(querySource);
  let envTtl = oneHour ? env.CLAUDE_CODE_PROMPT_CACHE_TTL : env.CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL;
  if (envTtl !== undefined)
    return {
      ttl: envTtl,
      reason: "env",
    };
  let initialSettings = getInitialSettings();
  let settingsTtl = oneHour ? initialSettings.promptCacheTtl : initialSettings.subagentPromptCacheTtl;
  if (settingsTtl !== undefined)
    return {
      ttl: settingsTtl,
      reason: "setting",
    };
  if (agentOverride !== undefined && !(agentOverride === "1h" && billedOverage))
    return {
      ttl: agentOverride,
      reason: "agent_frontmatter",
    };
  if (
    env.ENABLE_PROMPT_CACHING_1H ||
    (getAPIProvider() === "bedrock" && env.ENABLE_PROMPT_CACHING_1H_BEDROCK)
  )
    return {
      ttl: "1h",
      reason: "enable_1h_env",
    };
  return;
}
//@ chunk-5xgkngpb.js:2133020-2133290 placement
/**
 * 估算以 n 个 token 写入提示缓存的费用（按 5m/1h TTL），返回 TTL、估计美元数与定价来源。
 */
function estimateCacheWriteCost(model, tokens, ttl = resolveMainThreadCacheTtl()) {
  let out = {
    ...EMPTY_USAGE,
    cache_creation_input_tokens: tokens,
    cache_creation: {
      ephemeral_5m_input_tokens: ttl === "5m" ? tokens : 0,
      ephemeral_1h_input_tokens: ttl === "1h" ? tokens : 0,
    },
  };
  let { usd, pricing } = calculateCostWithPricingSource(model, out);
  return {
    cache_ttl: ttl,
    estimated_cache_write_usd: Math.round(usd * 1e4) / 1e4,
    pricing,
  };
}
//@ chunk-5xgkngpb.js:2133290-2133364 placement
function resolveMainThreadCacheTtl() {
  let lastMainThreadCacheTtlMs = getLastMainThreadCacheTtlMs();
  if (lastMainThreadCacheTtlMs !== null) return lastMainThreadCacheTtlMs >= CACHE_TTL_1H_MS ? "1h" : "5m";
  return getMainThreadCacheTtl();
}
//@ chunk-5xgkngpb.js:2133364-2133423 placement (2.1.88 match: isMainThreadSource, 1)
function getMainThreadCacheTtl() {
  return applyFiveMinuteOverride(isOneHourCacheTtl("repl_main_thread") ? "1h" : "5m");
}
//@ chunk-5xgkngpb.js:2133423-2133520 placement (2.1.88 match: isMainThreadSource, 0.793)
function getMainThreadCacheTtlConfig(querySource) {
  if (!getPromptCachingEnabled(querySource)) return;
  let ttl = should1hCacheTTL("repl_main_thread");
  return applyFiveMinuteOverride(ttl.ttl) === ttl.ttl ? ttl : undefined;
}
export {
  estimateCacheWriteCost,
  resolvePromptCacheTtl,
  ONE_HOUR_TTL_SOURCES,
  matchesModelPattern,
  stripModelDateSuffix,
  applyFiveMinuteOverride,
  resolveMainThreadCacheTtl,
  getMainThreadCacheTtl,
  getMainThreadCacheTtlConfig,
};
