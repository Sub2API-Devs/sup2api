/**
 * services/mcp/claudeAiEligibility.ts
 *
 * 2.1.316 新增：claude.ai 代理 MCP 资格判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-65zhns9p.js (3)
 * attribution: placement 3
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";

//@ chunk-65zhns9p.js:226-290 placement
/**
 * 读 tengu_mcp_claudeai_eligibility_gate（默认关）。
 */
function isEligibilityGateEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_claudeai_eligibility_gate", false);
}
//@ chunk-65zhns9p.js:290-350 placement
function isClaudeAiEligibilityCheckEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_delightful_hamster", false) === true;
}
//@ chunk-65zhns9p.js:350-421 placement = _temp2 (0.774)
function isIneligibleClaudeAiProxy(client) {
  return client.type === "claudeai-proxy" && client.eligible === false && isEligibilityGateEnabled();
}
export { isIneligibleClaudeAiProxy, isClaudeAiEligibilityCheckEnabled };
