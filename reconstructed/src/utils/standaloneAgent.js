/**
 * utils/standaloneAgent.ts
 *
 * 独立代理（--agent 运行的单代理会话）名字与上下文的合并更新
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/standaloneAgent.ts
 * pieces: chunk-7s4yj2r0.js (1)
 * attribution: fingerprint 1
 */

/**
 * 合并 standaloneAgentContext 字段（无变化时返回原状态），名字缺省为空串。
 */
//@ chunk-7s4yj2r0.js:317-484 fingerprint = getStandaloneAgentName (1)
function updateStandaloneAgentContext(appState, patch) {
  let standaloneAgentContext = appState.standaloneAgentContext;
  if (!Object.keys(patch).some((o) => standaloneAgentContext?.[o] !== patch[o])) return appState;
  return {
    ...appState,
    standaloneAgentContext: { ...standaloneAgentContext, name: standaloneAgentContext?.name ?? "", ...patch },
  };
}

export { updateStandaloneAgentContext };
