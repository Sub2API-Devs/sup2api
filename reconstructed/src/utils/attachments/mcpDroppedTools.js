/**
 * utils/attachments/mcpDroppedTools.ts
 *
 * 2.1.316 新增：MCP 工具被丢弃的附件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: placement 4
 */
import { normalizeMcpServerName } from "../../services/api/deferredToolsState.js";
import { stringArray as stringArray_2 } from "../collections.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { buildMcpToolName } from "../../services/mcp/mcpStringUtils.js";
import { getDenyRuleIndex, isToolDeniedByIndex } from "../permissions/permissions.js";
import { logEvent } from "../../services/analytics/index.js";

//@ chunk-e6aww6q8.js:3288241-3288316 placement
/**
 * 描述一个被丢弃的 MCP 工具（服务器、工具名与原因）。
 */
function describeDroppedMcpTool(name, toolName, reason) {
  return `"${normalizeMcpServerName(toolName)}" (MCP server "${normalizeMcpServerName(name)}"): "${normalizeMcpServerName(reason)}"`;
}
//@ chunk-e6aww6q8.js:3288316-3288327 placement
/**
 * 逐条列出的被丢弃工具上限（30），超出改给汇总。
 */
var MAX_LISTED_DROPPED_TOOLS = 30;
//@ chunk-e6aww6q8.js:3288327-3288419 placement
/**
 * 汇总某 MCP 服务器被丢弃工具数量的说明。
 */
function describeDroppedToolSummary(name, n) {
  return `MCP server "${normalizeMcpServerName(name)}": ${n} tools excluded (invalid input schema)`;
}
//@ chunk-e6aww6q8.js:3288419-3289161 placement
/**
 * 生成 MCP 工具被丢弃的增量附件。
 */
function buildMcpDroppedToolsDelta(mcpClients, n, toolPermissionContext) {
  let s = new Set();
  for (let w of n) {
    if (w.type !== "attachment" || w.attachment.type !== "mcp_dropped_tools_delta") continue;
    for (let L of stringArray_2(w.attachment.addedEntries)) s.add(L);
  }
  let h;
  let y = new Set();
  for (let w of mcpClients) {
    if (!isConnectedOrCached(w) || !w.droppedTools?.length) continue;
    let L = new Set();
    for (let droppedTool of w.droppedTools) {
      let q = {
        name: buildMcpToolName(w.name, droppedTool.toolName),
        mcpInfo: {
          serverName: w.name,
          toolName: droppedTool.toolName,
        },
      };
      h ??= getDenyRuleIndex(toolPermissionContext);
      if (isToolDeniedByIndex(toolPermissionContext, h.index, q)) continue;
      L.add(describeDroppedMcpTool(w.name, droppedTool.toolName, droppedTool.reason));
    }
    if (L.size > MAX_LISTED_DROPPED_TOOLS) y.add(describeDroppedToolSummary(w.name, L.size));
    else for (let G of L) y.add(G);
  }
  let sorted = [...y].filter((w) => !s.has(w)).sort();
  if (sorted.length === 0) return null;
  logEvent("tengu_mcp_dropped_tools_pool_change", {
    addedCount: sorted.length,
    priorAnnouncedCount: s.size,
    messagesLength: n.length,
  });
  return {
    addedEntries: sorted,
  };
}
export { buildMcpDroppedToolsDelta };
