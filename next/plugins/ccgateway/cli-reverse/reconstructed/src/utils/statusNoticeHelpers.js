/**
 * utils/statusNoticeHelpers.ts
 *
 * 状态提示辅助：统计内置 agent 描述 token 总量。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/statusNoticeHelpers.ts
 * pieces: chunk-hnxhr3bs.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { roughTokenCountEstimation } from "../services/tokenEstimation.js";

//@ chunk-hnxhr3bs.js:69996-70156 fingerprint (2.1.88 match: getAgentDescriptionsTotalTokens, 1)
function getAgentDescriptionsTotalTokens(agentDefinitions) {
  if (!agentDefinitions) return 0;
  return agentDefinitions.activeAgents
    .filter((activeAgent) => activeAgent.source !== "built-in")
    .reduce((total, agent) => {
      let description = `${agent.agentType}: ${agent.whenToUse}`;
      return total + roughTokenCountEstimation(description);
    }, 0);
}
export { getAgentDescriptionsTotalTokens };
