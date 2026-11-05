/**
 * utils/swarm/teammateAgentIdentity.ts
 *
 * 2.1.316 新增：队友代理身份（内置 teammate 类型）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-61yv2bce.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-61yv2bce.js:191-250 placement
/**
 * 构造内置 teammate 的代理身份 {agentType, source}。
 */
var teammateAgentIdentity = (agentType) => ({
  agentType: agentType || "teammate",
  source: "built-in",
});
export { teammateAgentIdentity };
