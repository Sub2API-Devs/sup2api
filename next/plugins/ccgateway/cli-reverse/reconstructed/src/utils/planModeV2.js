/**
 * utils/planModeV2.ts
 *
 * 计划模式 v2 的并行规划/探索代理数量（按订阅档位）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/planModeV2.ts
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: fingerprint 2
 */
import { env } from "./env.js";
import { getSubscriptionType, getRateLimitTier } from "./auth.js";

//@ chunk-e6aww6q8.js:4862127-4862337 fingerprint = getPlanModeV2AgentCount (1)
function getPlanModeV2AgentCount() {
  let count = env.CLAUDE_CODE_PLAN_V2_AGENT_COUNT;
  if (count !== undefined && count > 0 && count <= 10) return count;
  let subscriptionType = getSubscriptionType();
  let rateLimitTier = getRateLimitTier();
  if (subscriptionType === "max" && rateLimitTier === "default_claude_max_20x") return 3;
  if (subscriptionType === "enterprise" || subscriptionType === "team") return 3;
  return 1;
}
//@ chunk-e6aww6q8.js:4862337-4862444 fingerprint = getPlanModeV2ExploreAgentCount (1)
function getPlanModeV2ExploreAgentCount() {
  let count = env.CLAUDE_CODE_PLAN_V2_EXPLORE_AGENT_COUNT;
  if (count !== undefined && count > 0 && count <= 10) return count;
  return 3;
}
export { getPlanModeV2AgentCount, getPlanModeV2ExploreAgentCount };
