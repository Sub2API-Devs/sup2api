/**
 * bridge/metaMcpTools.ts
 *
 * 解析 bridge meta MCP 工具列表（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ebk61d3a.js (2)
 * attribution: placement 2
 */
import { CLAUDE_CODE_REMOTE } from "../services/mcp/ccrMetaMcp.js";
import { logForDebugging } from "../utils/debug.js";
import { collectServerToolPolicies, buildMcpToolName } from "../services/mcp/mcpStringUtils.js";

//@ chunk-ebk61d3a.js:302-332 placement
var META_MCP_TOOL_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
//@ chunk-ebk61d3a.js:332-953 placement
/**
 * 解析 bridge meta MCP 的 tools[] 列表，非数组时告警
 */
function parseMetaMcpTools(i, n = CLAUDE_CODE_REMOTE) {
  if (!("tools" in i) || i.tools === undefined) return [];
  if (!Array.isArray(i.tools)) {
    logForDebugging("[bridge:meta-mcp] meta tools[] is not an array", {
      level: "warn",
    });
    return null;
  }
  let e = [];
  for (let tool of i.tools) {
    if (
      tool === null ||
      typeof tool !== "object" ||
      !("name" in tool) ||
      typeof tool.name !== "string" ||
      !META_MCP_TOOL_NAME_PATTERN.test(tool.name)
    ) {
      logForDebugging("[bridge:meta-mcp] injected tools[] entry is malformed", {
        level: "warn",
      });
      return null;
    }
    e.push({
      name: tool.name,
      ...("permission_policy" in tool &&
        typeof tool.permission_policy === "string" && {
          permission_policy: tool.permission_policy,
        }),
    });
  }
  let { allow } = collectServerToolPolicies({
    [n]: {
      type: "http",
      tools: e,
    },
  });
  let mcpToolName = buildMcpToolName(n, "");
  return allow.map((o) => (o.startsWith(mcpToolName) ? o.slice(mcpToolName.length) : o));
}
export { parseMetaMcpTools };
