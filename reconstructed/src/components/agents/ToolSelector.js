/**
 * components/agents/ToolSelector.tsx
 *
 * 子代理工具选择；本模块只剩 MCP 服务器分桶函数。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/ToolSelector.tsx
 * pieces: chunk-6mwt0myy.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { mcpInfoFromString, getMcpPrefix } from "../../services/mcp/mcpStringUtils.js";
import { normalizeNameForMCP } from "../../services/mcp/normalization.js";

//@ chunk-6mwt0myy.js:18470-18527 callgraph-fingerprint = getMcpServerBuckets (0.619)
function getPrefixServerKey(tools) {
  return mcpInfoFromString(`${getMcpPrefix(tools)}x`)?.serverName ?? normalizeNameForMCP(tools);
}

export { getPrefixServerKey };
