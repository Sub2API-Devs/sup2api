/**
 * utils/statusNoticeHelpers.ts
 *
 * 状态提示辅助：统计内置 agent 描述 token 总量。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/statusNoticeHelpers.ts
 * pieces: chunk-ag5x7vhf.js (1)
 * attribution: fingerprint 1
 */
import { roughTokenCountEstimation } from "../services/tokenEstimation.js";

//@ chunk-ag5x7vhf.js:70439-70599 fingerprint = getAgentDescriptionsTotalTokens (1)
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
