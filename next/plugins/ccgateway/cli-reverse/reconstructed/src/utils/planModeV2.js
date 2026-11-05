/**
 * utils/planModeV2.ts
 *
 * 计划模式 v2 的并行规划/探索代理数量（按订阅档位）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/planModeV2.ts
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { env } from "./env.js";
import { getSubscriptionType, getRateLimitTier } from "./auth.js";

//@ chunk-5xgkngpb.js:5002991-5003201 fingerprint (2.1.88 match: getPlanModeV2AgentCount, 1)
function getPlanModeV2AgentCount() {
  let count = env.CLAUDE_CODE_PLAN_V2_AGENT_COUNT;
  if (count !== undefined && count > 0 && count <= 10) return count;
  let subscriptionType = getSubscriptionType();
  let rateLimitTier = getRateLimitTier();
  if (subscriptionType === "max" && rateLimitTier === "default_claude_max_20x") return 3;
  if (subscriptionType === "enterprise" || subscriptionType === "team") return 3;
  return 1;
}
//@ chunk-5xgkngpb.js:5003201-5003308 fingerprint (2.1.88 match: getPlanModeV2ExploreAgentCount, 1)
function getPlanModeV2ExploreAgentCount() {
  let count = env.CLAUDE_CODE_PLAN_V2_EXPLORE_AGENT_COUNT;
  if (count !== undefined && count > 0 && count <= 10) return count;
  return 3;
}
export { getPlanModeV2AgentCount, getPlanModeV2ExploreAgentCount };
