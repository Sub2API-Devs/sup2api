/**
 * bridge/metaMcpTools.ts
 *
 * 解析 bridge meta MCP 工具列表（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-mam6bqzr.js (2)
 * attribution: placement 2
 */
import { CLAUDE_CODE_REMOTE } from "../services/mcp/ccrMetaMcp.js";
import { logForDebugging } from "../utils/debug.js";
import { collectServerToolPolicies, buildMcpToolName } from "../services/mcp/mcpStringUtils.js";

//@ chunk-mam6bqzr.js:302-332 placement
var META_MCP_TOOL_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
//@ chunk-mam6bqzr.js:332-953 placement
/**
 * 解析 bridge meta MCP 的 tools[] 列表，非数组时告警
 */
function parseMetaMcpTools(entry, serverName = CLAUDE_CODE_REMOTE) {
  if (!("tools" in entry) || entry.tools === undefined) return [];
  if (!Array.isArray(entry.tools)) {
    logForDebugging("[bridge:meta-mcp] meta tools[] is not an array", {
      level: "warn",
    });
    return null;
  }
  let tools = [];
  for (let tool of entry.tools) {
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
    tools.push({
      name: tool.name,
      ...("permission_policy" in tool &&
        typeof tool.permission_policy === "string" && {
          permission_policy: tool.permission_policy,
        }),
    });
  }
  let { allow } = collectServerToolPolicies({
    [serverName]: {
      type: "http",
      tools,
    },
  });
  let mcpToolName = buildMcpToolName(serverName, "");
  return allow.map((rule) => (rule.startsWith(mcpToolName) ? rule.slice(mcpToolName.length) : rule));
}
export { parseMetaMcpTools };
