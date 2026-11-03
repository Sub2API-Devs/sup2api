/**
 * tools/AgentTool/agentDisplay.ts
 *
 * 代理显示相关的零散函数（多为共享指纹误归：模型写法判定、来源分组、队友模型解析）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/AgentTool/agentDisplay.ts
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: placement 4
 */
import { WEB_FETCH_AGENT, isWebFetchAgent_2 } from "../WebFetchTool/harnessNotes.js";

//@ chunk-e6aww6q8.js:2206709-2206783 placement = updateAgentFile (1)
function updateAgentFile(e) {
  return e.find((n) => n.agentType === WEB_FETCH_AGENT)?.source === "built-in";
}
//@ chunk-e6aww6q8.js:2206783-2206915 placement
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
//@ chunk-e6aww6q8.js:2206915-2207014 placement
/**
 * 判断输入是否指定了可解析的 subagent_type 覆盖。
 */
function hasSubagentOverride(e, activeAgents) {
  return (
    typeof e === "object" &&
    e !== null &&
    "subagent_type" in e &&
    resolveAgentOverrides(e.subagent_type, activeAgents)
  );
}
//@ chunk-e6aww6q8.js:2207014-2207198 placement
function compareAgentsByName(progressMessagesForMessage, activeAgents, r = false) {
  let found = progressMessagesForMessage.find((h) => h.data.type === "agent_progress");
  if (!found) return r;
  return found.data.isBuiltIn === undefined
    ? resolveAgentOverrides(found.data.agentType, activeAgents)
    : found.data.isBuiltIn && found.data.agentType === WEB_FETCH_AGENT;
}
export { updateAgentFile, resolveAgentOverrides, compareAgentsByName, hasSubagentOverride };
