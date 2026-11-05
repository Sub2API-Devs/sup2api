/**
 * utils/attachments/mcpDroppedTools.ts
 *
 * 2.1.316 新增：MCP 工具被丢弃的附件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { normalizeMcpServerName } from "../../services/api/deferredToolsState.js";
import { stringArray as stringArray_2 } from "../collections.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { buildMcpToolName } from "../../services/mcp/mcpStringUtils.js";
import { getDenyRuleIndex, isToolDeniedByIndex } from "../permissions/permissions.js";
import { logEvent } from "../../services/analytics/index.js";

//@ chunk-5xgkngpb.js:3373852-3373927 placement
/**
 * 描述一个被丢弃的 MCP 工具（服务器、工具名与原因）。
 */
function describeDroppedMcpTool(name, toolName, reason) {
  return `"${normalizeMcpServerName(toolName)}" (MCP server "${normalizeMcpServerName(name)}"): "${normalizeMcpServerName(reason)}"`;
}
//@ chunk-5xgkngpb.js:3373927-3373938 placement
/**
 * 逐条列出的被丢弃工具上限（30），超出改给汇总。
 */
var MAX_LISTED_DROPPED_TOOLS = 30;
//@ chunk-5xgkngpb.js:3373938-3374030 placement
/**
 * 汇总某 MCP 服务器被丢弃工具数量的说明。
 */
function describeDroppedToolSummary(name, toolCount) {
  return `MCP server "${normalizeMcpServerName(name)}": ${toolCount} tools excluded (invalid input schema)`;
}
//@ chunk-5xgkngpb.js:3374030-3374772 placement
/**
 * 生成 MCP 工具被丢弃的增量附件。
 */
function buildMcpDroppedToolsDelta(mcpClients, messages, toolPermissionContext) {
  let announcedEntries = new Set();
  for (let message of messages) {
    if (message.type !== "attachment" || message.attachment.type !== "mcp_dropped_tools_delta") continue;
    for (let entry of stringArray_2(message.attachment.addedEntries)) announcedEntries.add(entry);
  }
  let denyRuleIndex;
  let entries = new Set();
  for (let mcpClient of mcpClients) {
    if (!isConnectedOrCached(mcpClient) || !mcpClient.droppedTools?.length) continue;
    let serverEntries = new Set();
    for (let droppedTool of mcpClient.droppedTools) {
      let toolRef = {
        name: buildMcpToolName(mcpClient.name, droppedTool.toolName),
        mcpInfo: {
          serverName: mcpClient.name,
          toolName: droppedTool.toolName,
        },
      };
      denyRuleIndex ??= getDenyRuleIndex(toolPermissionContext);
      if (isToolDeniedByIndex(toolPermissionContext, denyRuleIndex.index, toolRef)) continue;
      serverEntries.add(describeDroppedMcpTool(mcpClient.name, droppedTool.toolName, droppedTool.reason));
    }
    if (serverEntries.size > MAX_LISTED_DROPPED_TOOLS)
      entries.add(describeDroppedToolSummary(mcpClient.name, serverEntries.size));
    else for (let entry of serverEntries) entries.add(entry);
  }
  let sorted = [...entries].filter((entry) => !announcedEntries.has(entry)).sort();
  if (sorted.length === 0) return null;
  logEvent("tengu_mcp_dropped_tools_pool_change", {
    addedCount: sorted.length,
    priorAnnouncedCount: announcedEntries.size,
    messagesLength: messages.length,
  });
  return {
    addedEntries: sorted,
  };
}
export { buildMcpDroppedToolsDelta };
