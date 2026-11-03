/**
 * services/mcp/mcpTimeouts.ts
 *
 * 2.1.316 新增：MCP 超时常量。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-nm347593.js (1)
 * attribution: placement 1
 */
import { isFirstPartyMcpUrl } from "./auth.js";
import { vF } from "./client.js";

//@ chunk-nm347593.js:263-344 placement
function TB(r, t = !1) {
  return (r.type === "http" || r.type === "sse") && isFirstPartyMcpUrl(r.url) ? 1 / 0 : vF(t);
}

export { TB };
