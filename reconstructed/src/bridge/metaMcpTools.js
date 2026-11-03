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
var r = /^[a-zA-Z0-9_-]{1,64}$/;
/**
 * 解析 bridge meta MCP 的 tools[] 列表，非数组时告警
 */
//@ chunk-ebk61d3a.js:332-953 placement
function parseMetaMcpTools(i, n = CLAUDE_CODE_REMOTE) {
  if (!("tools" in i) || i.tools === void 0) return [];
  if (!Array.isArray(i.tools))
    return (logForDebugging("[bridge:meta-mcp] meta tools[] is not an array", { level: "warn" }), null);
  let e = [];
  for (let tool of i.tools) {
    if (
      tool === null ||
      typeof tool !== "object" ||
      !("name" in tool) ||
      typeof tool.name !== "string" ||
      !r.test(tool.name)
    )
      return (
        logForDebugging("[bridge:meta-mcp] injected tools[] entry is malformed", { level: "warn" }),
        null
      );
    e.push({
      name: tool.name,
      ...("permission_policy" in tool &&
        typeof tool.permission_policy === "string" && { permission_policy: tool.permission_policy }),
    });
  }
  let { allow: allow } = collectServerToolPolicies({ [n]: { type: "http", tools: e } }),
    l = buildMcpToolName(n, "");
  return allow.map((o) => (o.startsWith(l) ? o.slice(l.length) : o));
}

export { parseMetaMcpTools };
