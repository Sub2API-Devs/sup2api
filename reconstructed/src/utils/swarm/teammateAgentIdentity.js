/**
 * utils/swarm/teammateAgentIdentity.ts
 *
 * 2.1.316 新增：队友代理身份（内置 teammate 类型）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-n3nr6yb5.js (1)
 * attribution: placement 1
 */

//@ chunk-n3nr6yb5.js:191-250 placement
/**
 * 构造内置 teammate 的代理身份 {agentType, source}。
 */
var teammateAgentIdentity = (e) => ({
  agentType: e || "teammate",
  source: "built-in",
});
export { teammateAgentIdentity };
