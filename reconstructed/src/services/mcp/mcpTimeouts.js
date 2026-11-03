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
import { maxDescriptionLength } from "./client.js";

//@ chunk-nm347593.js:263-344 placement
/**
 * 一方 http/sse MCP 服务器不设超时（Infinity），其他按默认规则。
 */
function toolTimeoutForServer(config, t = false) {
  return (config.type === "http" || config.type === "sse") && isFirstPartyMcpUrl(config.url)
    ? 1 / 0
    : maxDescriptionLength(t);
}
export { toolTimeoutForServer };
