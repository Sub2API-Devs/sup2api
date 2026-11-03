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
import { stringArray } from "../collections.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { buildMcpToolName } from "../../services/mcp/mcpStringUtils.js";
import { getDenyRuleIndex, isToolDeniedByIndex } from "../permissions/permissions.js";
import { logEvent } from "../../services/analytics/index.js";

//@ chunk-e6aww6q8.js:3288241-3288316 placement
function UAr(e, n, r) {
  return `"${normalizeMcpServerName(n)}" (MCP server "${normalizeMcpServerName(e)}"): "${normalizeMcpServerName(r)}"`;
}
//@ chunk-e6aww6q8.js:3288316-3288327 placement
var jAr = 30;
//@ chunk-e6aww6q8.js:3288327-3288419 placement
function WAr(e, n) {
  return `MCP server "${normalizeMcpServerName(e)}": ${n} tools excluded (invalid input schema)`;
}
/**
 * 生成 MCP 工具被丢弃的增量附件。
 */
//@ chunk-e6aww6q8.js:3288419-3289161 placement
function buildMcpDroppedToolsDelta(e, n, r) {
  let s = new Set();
  for (let w of n) {
    if (w.type !== "attachment" || w.attachment.type !== "mcp_dropped_tools_delta") continue;
    for (let L of stringArray(w.attachment.addedEntries)) s.add(L);
  }
  let h,
    y = new Set();
  for (let w of e) {
    if (!isConnectedOrCached(w) || !w.droppedTools?.length) continue;
    let L = new Set();
    for (let droppedTool of w.droppedTools) {
      let q = {
        name: buildMcpToolName(w.name, droppedTool.toolName),
        mcpInfo: { serverName: w.name, toolName: droppedTool.toolName },
      };
      if (((h ??= getDenyRuleIndex(r)), isToolDeniedByIndex(r, h.index, q))) continue;
      L.add(UAr(w.name, droppedTool.toolName, droppedTool.reason));
    }
    if (L.size > jAr) y.add(WAr(w.name, L.size));
    else for (let G of L) y.add(G);
  }
  let sorted = [...y].filter((w) => !s.has(w)).sort();
  if (sorted.length === 0) return null;
  return (
    logEvent("tengu_mcp_dropped_tools_pool_change", {
      addedCount: sorted.length,
      priorAnnouncedCount: s.size,
      messagesLength: n.length,
    }),
    { addedEntries: sorted }
  );
}

export { buildMcpDroppedToolsDelta };
