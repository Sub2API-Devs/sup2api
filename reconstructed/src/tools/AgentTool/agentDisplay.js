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
import { WEB_FETCH_AGENT, k_n } from "../WebFetchTool/harnessNotes.js";

//@ chunk-e6aww6q8.js:2206709-2206783 placement = updateAgentFile (1)
function updateAgentFile(e) {
  return e.find((n) => n.agentType === WEB_FETCH_AGENT)?.source === "built-in";
}
//@ chunk-e6aww6q8.js:2206783-2206915 placement
function resolveAgentOverrides(allAgents, activeAgents) {
  if (activeAgents === void 0 || !updateAgentFile(activeAgents)) return !1;
  if (allAgents === WEB_FETCH_AGENT) return !0;
  return k_n(allAgents) && !activeAgents.some((r) => r.agentType !== WEB_FETCH_AGENT && k_n(r.agentType));
}
//@ chunk-e6aww6q8.js:2206915-2207014 placement
function fmn(e, n) {
  return (
    typeof e === "object" && e !== null && "subagent_type" in e && resolveAgentOverrides(e.subagent_type, n)
  );
}
//@ chunk-e6aww6q8.js:2207014-2207198 placement
function compareAgentsByName(e, n, r = !1) {
  let found = e.find((h) => h.data.type === "agent_progress");
  if (!found) return r;
  return found.data.isBuiltIn === void 0
    ? resolveAgentOverrides(found.data.agentType, n)
    : found.data.isBuiltIn && found.data.agentType === WEB_FETCH_AGENT;
}

export { updateAgentFile, resolveAgentOverrides, compareAgentsByName, fmn };
