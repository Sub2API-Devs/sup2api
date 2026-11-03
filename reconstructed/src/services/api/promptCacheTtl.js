/**
 * services/api/promptCacheTtl.ts
 *
 * 2.1.316 新增：提示缓存 TTL 选择
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 9
 */
import { env } from "../../utils/env.js";
import { getInitialSettings_2 } from "../../utils/settings/settings.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { EMPTY_USAGE } from "./emptyUsage.js";
import { calculateCostWithPricingSource } from "../../utils/modelCost.js";
import { getLastMainThreadCacheTtlMs } from "../../bootstrap/state.js";
import { CACHE_TTL_1H_MS } from "./promptCacheBreakDetection.js";
import { isOneHourCacheTtl, getPromptCachingEnabled, should1hCacheTTL } from "./claude.js";

//@ chunk-e6aww6q8.js:2075584-2075651 placement
var ONE_HOUR_TTL_SOURCES = ["repl_main_thread*", "sdk", "auto_mode", "memdir_relevance"];
//@ chunk-e6aww6q8.js:2075651-2075685 placement
function usesOneHourTtl(e) {
  return matchesModelPattern(e, ONE_HOUR_TTL_SOURCES);
}
//@ chunk-e6aww6q8.js:2075685-2075785 placement
function matchesModelPattern(e, n) {
  return e !== undefined && n.some((r) => (r.endsWith("*") ? e.startsWith(r.slice(0, -1)) : e === r));
}
//@ chunk-e6aww6q8.js:2075785-2075862 placement
function applyFiveMinuteOverride(e) {
  return env.CLAUDE_CODE_MESSAGES_PROMPT_CACHE_TTL === "5m" ? "5m" : e;
}
//@ chunk-e6aww6q8.js:2075862-2076386 placement
/**
 * 决定提示缓存 TTL（5 分钟或 1 小时），来源包括环境变量、设置、代理 frontmatter、Bedrock。
 */
function resolvePromptCacheTtl(e, n, r = false) {
  if (env.FORCE_PROMPT_CACHING_5M)
    return {
      ttl: "5m",
      reason: "force_5m_env",
    };
  let s = usesOneHourTtl(e);
  let h = s ? env.CLAUDE_CODE_PROMPT_CACHE_TTL : env.CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL;
  if (h !== undefined)
    return {
      ttl: h,
      reason: "env",
    };
  let initialSettings = getInitialSettings_2();
  let S = s ? initialSettings.promptCacheTtl : initialSettings.subagentPromptCacheTtl;
  if (S !== undefined)
    return {
      ttl: S,
      reason: "setting",
    };
  if (n !== undefined && !(n === "1h" && r))
    return {
      ttl: n,
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
//@ chunk-e6aww6q8.js:2076624-2076894 placement
/**
 * 估算以 n 个 token 写入提示缓存的费用（按 5m/1h TTL），返回 TTL、估计美元数与定价来源。
 */
function estimateCacheWriteCost(e, n, r = resolveMainThreadCacheTtl()) {
  let s = {
    ...EMPTY_USAGE,
    cache_creation_input_tokens: n,
    cache_creation: {
      ephemeral_5m_input_tokens: r === "5m" ? n : 0,
      ephemeral_1h_input_tokens: r === "1h" ? n : 0,
    },
  };
  let { usd, pricing } = calculateCostWithPricingSource(e, s);
  return {
    cache_ttl: r,
    estimated_cache_write_usd: Math.round(usd * 1e4) / 1e4,
    pricing,
  };
}
//@ chunk-e6aww6q8.js:2076894-2076968 placement
function resolveMainThreadCacheTtl() {
  let lastMainThreadCacheTtlMs = getLastMainThreadCacheTtlMs();
  if (lastMainThreadCacheTtlMs !== null) return lastMainThreadCacheTtlMs >= CACHE_TTL_1H_MS ? "1h" : "5m";
  return getMainThreadCacheTtl();
}
//@ chunk-e6aww6q8.js:2076968-2077028 placement = isMainThreadSource (1)
function getMainThreadCacheTtl() {
  return applyFiveMinuteOverride(isOneHourCacheTtl("repl_main_thread") ? "1h" : "5m");
}
//@ chunk-e6aww6q8.js:2077028-2077127 placement = isMainThreadSource (0.793)
function getMainThreadCacheTtlConfig(querySource) {
  if (!getPromptCachingEnabled(querySource)) return;
  let n = should1hCacheTTL("repl_main_thread");
  return applyFiveMinuteOverride(n.ttl) === n.ttl ? n : undefined;
}
export {
  estimateCacheWriteCost,
  resolvePromptCacheTtl,
  ONE_HOUR_TTL_SOURCES,
  matchesModelPattern,
  applyFiveMinuteOverride,
  resolveMainThreadCacheTtl,
  getMainThreadCacheTtl,
  getMainThreadCacheTtlConfig,
};
