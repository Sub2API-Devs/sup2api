/**
 * services/tools/mcpResultMeta.ts
 *
 * 2.1.316 新增：MCP 工具结果的结构化内容与元数据处理
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { hasUiResource } from "../mcp/toolNameLimits.js";
import { isStructuredContentBase64Envelope } from "../mcp/mcpWireUtils.js";
import { logEvent } from "../analytics/index.js";
import { logMCPDebug } from "../../utils/log.js";
import { hasMcpInboundDoor } from "../mcp/mcpInboundDoor.js";
import { countJsonMembers } from "../../utils/jsonScan.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1882065-1882124 placement
var CLAUDE_ENDTURN = "claude/endTurn";
var CLAUDE_ENDTURNHONORSSTOPHOOKS = "claude/endTurnHonorsStopHooks";
//@ chunk-5xgkngpb.js:1882124-1882228 placement
function getEndTurnMetaKind(toolResult) {
  if (toolResult?._meta?.[CLAUDE_ENDTURN] !== true) return false;
  return toolResult._meta[CLAUDE_ENDTURNHONORSSTOPHOOKS] === true ? "mcp_meta_blockable" : "mcp_meta";
}
//@ chunk-5xgkngpb.js:1882228-1882347 placement
/**
 * 判断用户消息是否结束本轮：工具声明或 MCP 元数据给出结束原因，且结果不是错误时返回该原因。
 */
function getToolEndsTurnKind(message) {
  if (message.type !== "user") return false;
  let kind = message.toolEndsTurn ? "tool" : getEndTurnMetaKind(message.mcpMeta);
  if (!kind || hasToolResultError(message)) return false;
  return kind;
}
//@ chunk-5xgkngpb.js:1882347-1882399 placement
var MCP_META_SOURCE_RANK = [false, "mcp_meta_blockable", "mcp_meta", "tool"];
//@ chunk-5xgkngpb.js:1882399-1882458 placement
/**
 * 比较两个元信息来源的优先级，返回更高者。
 */
function higherSourceRank(toolRequestedEndTurn, toolEndsTurnKind) {
  return MCP_META_SOURCE_RANK.indexOf(toolEndsTurnKind) > MCP_META_SOURCE_RANK.indexOf(toolRequestedEndTurn)
    ? toolEndsTurnKind
    : toolRequestedEndTurn;
}
//@ chunk-5xgkngpb.js:1882458-1882601 placement
/**
 * 用户消息中是否含 is_error 的工具结果。
 */
function hasToolResultError(message) {
  return (
    message.type === "user" &&
    Array.isArray(message.message.content) &&
    message.message.content.some((block) => block.type === "tool_result" && block.is_error === true)
  );
}
//@ chunk-5xgkngpb.js:1882601-1882734 placement
var MAX_STRUCTURED_CONTENT_DEPTH; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_META_KEYS;
var MCP_RESULT_META;
var MCP_RESULT_META_BLOCKABLE;
deferInit("chunk-5xgkngpb.js:1882601", () => {
  MAX_STRUCTURED_CONTENT_DEPTH = 8192;
  MAX_META_KEYS = 128;
  MCP_RESULT_META = Object.freeze({
    _meta: Object.freeze({
      [CLAUDE_ENDTURN]: true,
    }),
  });
  MCP_RESULT_META_BLOCKABLE = Object.freeze({
    _meta: Object.freeze({
      [CLAUDE_ENDTURN]: true,
      [CLAUDE_ENDTURNHONORSSTOPHOOKS]: true,
    }),
  });
});
//@ chunk-5xgkngpb.js:1882734-1882842 placement
function getEndTurnMeta(toolResult) {
  switch (getEndTurnMetaKind(toolResult)) {
    case "mcp_meta":
      return MCP_RESULT_META;
    case "mcp_meta_blockable":
      return MCP_RESULT_META_BLOCKABLE;
    case false:
      return;
  }
}
//@ chunk-5xgkngpb.js:1882842-1883015 placement
var MAX_STRUCTURED_CONTENT_BYTES = 1048576;
var DEFAULT_STRUCTURED_CONTENT_LIMIT = MAX_STRUCTURED_CONTENT_BYTES;
var UI_RESOURCE_STRUCTURED_CONTENT_LIMIT = 8388608;
var UI_RESOURCE_LIMIT_NOTE = `The limit is ${UI_RESOURCE_STRUCTURED_CONTENT_LIMIT} for a tool whose tools/list entry names a ui:// resource (_meta.ui.resourceUri, or the older ui/resourceUri). `;
//@ chunk-5xgkngpb.js:1883015-1884060 placement
/**
 * 处理 MCP 工具返回的 structuredContent：过大或不可序列化时省略并说明。
 */
function formatMcpStructuredContent(agentId, mcpMeta, tool, isAppTool = false) {
  if (!agentId) {
    if (tool.mcpInfo?.serverType === "sdk") return mcpMeta;
    let hasUiResourceFlag = hasUiResource(tool.mcpInfo?.uiMeta);
    if (!isAppTool) mcpMeta = checkMcpResultMetaSize(mcpMeta, tool.mcpInfo, hasUiResourceFlag);
    if (mcpMeta?.structuredContent === undefined) return mcpMeta;
    let { structuredContent, ...rest } = mcpMeta;
    if (isStructuredContentBase64Envelope(mcpMeta.structuredContent)) {
      logEvent("tengu_mcp_structured_content_omitted", {
        isAppTool: hasUiResourceFlag,
        asText: true,
      });
      return {
        ...rest,
        structuredContentOmitted: true,
      };
    }
    let limit = hasUiResourceFlag ? UI_RESOURCE_STRUCTURED_CONTENT_LIMIT : MAX_STRUCTURED_CONTENT_BYTES;
    let jsonLength = safeJsonStringify(mcpMeta.structuredContent)?.length ?? 1 / 0;
    if (jsonLength <= limit) return mcpMeta;
    logMCPDebug(
      tool.mcpInfo?.serverName ?? "unknown",
      `Tool '${tool.mcpInfo?.toolName ?? "unknown"}': structuredContent (${Number.isFinite(jsonLength) ? `${jsonLength} characters of JSON` : "not serializable"}, limit ${limit}) left off the result message; tool_use_result.structuredContentOmitted is set, and content and resourceLinks are kept. ${hasUiResourceFlag ? "" : UI_RESOURCE_LIMIT_NOTE}Exempt: in-process SDK servers`,
    );
    logEvent("tengu_mcp_structured_content_omitted", {
      ...(Number.isFinite(jsonLength) && {
        jsonChars: jsonLength,
      }),
      isAppTool: hasUiResourceFlag,
    });
    return {
      ...rest,
      structuredContentOmitted: true,
    };
  }
  let _meta = mcpMeta?._meta;
  if (!_meta || Object.keys(_meta).length === 0) return;
  let metaJson = safeJsonStringify(_meta);
  if (
    metaJson !== undefined &&
    metaJson.length <= MAX_STRUCTURED_CONTENT_DEPTH &&
    (!hasMcpInboundDoor() || countJsonMembers(metaJson, MAX_META_KEYS) !== undefined)
  )
    return {
      _meta,
    };
  return getEndTurnMeta(mcpMeta);
}
//@ chunk-5xgkngpb.js:1884060-1884740 placement
/**
 * 检查 MCP 工具结果 _meta 的大小与可序列化性。
 */
function checkMcpResultMetaSize(mcpMeta, mcpInfo, isAppTool) {
  if (mcpMeta?._meta === undefined) return mcpMeta;
  let limit = isAppTool ? UI_RESOURCE_STRUCTURED_CONTENT_LIMIT : DEFAULT_STRUCTURED_CONTENT_LIMIT;
  let metaJsonLength = safeJsonStringify(mcpMeta._meta)?.length ?? 1 / 0;
  if (metaJsonLength <= limit) return mcpMeta;
  logMCPDebug(
    mcpInfo?.serverName ?? "unknown",
    `Tool '${mcpInfo?.toolName ?? "unknown"}': result _meta (${Number.isFinite(metaJsonLength) ? `${metaJsonLength} characters of JSON` : "not serializable"}, limit ${limit}) left off the result message; only its ${CLAUDE_ENDTURN} marker, if set, is kept, with ${CLAUDE_ENDTURNHONORSSTOPHOOKS} beside it. ${isAppTool ? "" : UI_RESOURCE_LIMIT_NOTE}Exempt: in-process SDK servers, and a successful result of an account memory tool or, in a Projects session, a Projects read tool`,
  );
  logEvent("tengu_mcp_result_meta_omitted", {
    ...(Number.isFinite(metaJsonLength) && {
      jsonChars: metaJsonLength,
    }),
    isAppTool,
  });
  let { _meta, ...rest } = mcpMeta;
  let endTurnMeta = getEndTurnMeta(mcpMeta);
  if (endTurnMeta)
    return {
      ...rest,
      ...endTurnMeta,
    };
  return Object.keys(rest).length > 0 ? rest : undefined;
}
//@ chunk-5xgkngpb.js:1884740-1884786 placement
/**
 * 把值序列化成 JSON，循环等异常时返回 undefined。
 */
function safeJsonStringify(value) {
  try {
    return jsonStringify(value);
  } catch {
    return;
  }
}
export {
  getToolEndsTurnKind,
  hasToolResultError,
  CLAUDE_ENDTURN,
  CLAUDE_ENDTURNHONORSSTOPHOOKS,
  formatMcpStructuredContent,
  higherSourceRank,
};
