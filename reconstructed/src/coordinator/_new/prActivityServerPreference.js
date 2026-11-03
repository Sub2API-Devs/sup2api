/**
 * coordinator/_new/prActivityServerPreference.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hg2zbde4.js (1)
 * attribution: sole-consumer-new 1
 */
import { PR_ACTIVITY_MCP_SERVERS } from "../../utils/toolPool.js";
import { getMcpPrefix } from "../../services/mcp/mcpStringUtils.js";

/**
 * 协调器提示：工具列表中同时有多个 PR 活动 MCP 服务器副本时，优先调用第一个的那份。
 */
//@ chunk-hg2zbde4.js:13803-13957 sole-consumer-new
function prActivityServerPreference() {
  let [e, ...o] = PR_ACTIVITY_MCP_SERVERS.map((r) => `\`${getMcpPrefix(r)}\``);
  return `When your tool list has both a ${e} copy and a ${o.join(" or ")} copy, call the ${e} one.`;
}

export { prActivityServerPreference };
