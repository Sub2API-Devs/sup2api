/**
 * tools/AgentTool/agentDisplay.ts
 *
 * 代理显示相关的零散函数（多为共享指纹误归：模型写法判定、来源分组、队友模型解析）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/AgentTool/agentDisplay.ts
 * pieces: chunk-5xgkngpb.js (4)
 * attribution: placement 4
 */
import { WEB_FETCH_AGENT, isWebFetchAgent_2 } from "../WebFetchTool/harnessNotes.js";

//@ chunk-5xgkngpb.js:2261161-2261235 placement (2.1.88 match: updateAgentFile, 1)
function updateAgentFile(agents) {
  return agents.find((agent) => agent.agentType === WEB_FETCH_AGENT)?.source === "built-in";
}
//@ chunk-5xgkngpb.js:2261235-2261367 placement
function resolveAgentOverrides(allAgents, activeAgents) {
  if (activeAgents === undefined || !updateAgentFile(activeAgents)) return false;
  if (allAgents === WEB_FETCH_AGENT) return true;
  return (
    isWebFetchAgent_2(allAgents) &&
    !activeAgents.some(
      (activeAgent) => activeAgent.agentType !== WEB_FETCH_AGENT && isWebFetchAgent_2(activeAgent.agentType),
    )
  );
}
//@ chunk-5xgkngpb.js:2261367-2261466 placement
/**
 * 判断输入是否指定了可解析的 subagent_type 覆盖。
 */
function hasSubagentOverride(input, activeAgents) {
  return (
    typeof input === "object" &&
    input !== null &&
    "subagent_type" in input &&
    resolveAgentOverrides(input.subagent_type, activeAgents)
  );
}
//@ chunk-5xgkngpb.js:2261466-2261650 placement
function compareAgentsByName(progressMessagesForMessage, activeAgents, fallback = false) {
  let found = progressMessagesForMessage.find(
    (progressMessage) => progressMessage.data.type === "agent_progress",
  );
  if (!found) return fallback;
  return found.data.isBuiltIn === undefined
    ? resolveAgentOverrides(found.data.agentType, activeAgents)
    : found.data.isBuiltIn && found.data.agentType === WEB_FETCH_AGENT;
}
export { updateAgentFile, resolveAgentOverrides, hasSubagentOverride, compareAgentsByName };
