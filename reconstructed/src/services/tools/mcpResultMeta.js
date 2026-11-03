/**
 * services/tools/mcpResultMeta.ts
 *
 * 2.1.316 新增：MCP 工具结果的结构化内容与元数据处理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (12)
 * attribution: placement 12
 */
import { nei } from "../mcp/toolNameLimits.js";
import { isStructuredContentBase64Envelope } from "../mcp/mcpWireUtils.js";
import { logEvent } from "../analytics/index.js";
import { logMCPDebug } from "../../utils/log.js";
import { hasMcpInboundDoor } from "../mcp/mcpInboundDoor.js";
import { countJsonMembers } from "../../utils/jsonScan.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-e6aww6q8.js:1805174-1805233 placement
var CLAUDE_ENDTURN = "claude/endTurn",
  CLAUDE_ENDTURNHONORSSTOPHOOKS = "claude/endTurnHonorsStopHooks";
//@ chunk-e6aww6q8.js:1805233-1805337 placement
function getEndTurnMetaKind(e) {
  if (e?._meta?.[CLAUDE_ENDTURN] !== !0) return !1;
  return e._meta[CLAUDE_ENDTURNHONORSSTOPHOOKS] === !0 ? "mcp_meta_blockable" : "mcp_meta";
}
/**
 * 判断用户消息是否结束本轮：工具声明或 MCP 元数据给出结束原因，且结果不是错误时返回该原因。
 */
//@ chunk-e6aww6q8.js:1805337-1805456 placement
function getToolEndsTurnKind(e) {
  if (e.type !== "user") return !1;
  let n = e.toolEndsTurn ? "tool" : getEndTurnMetaKind(e.mcpMeta);
  if (!n || hasToolResultError(e)) return !1;
  return n;
}
//@ chunk-e6aww6q8.js:1805456-1805508 placement
var stn = [!1, "mcp_meta_blockable", "mcp_meta", "tool"];
//@ chunk-e6aww6q8.js:1805508-1805567 placement
function m5s(e, n) {
  return stn.indexOf(n) > stn.indexOf(e) ? n : e;
}
/**
 * 用户消息中是否含 is_error 的工具结果。
 */
//@ chunk-e6aww6q8.js:1805567-1805710 placement
function hasToolResultError(e) {
  return (
    e.type === "user" &&
    Array.isArray(e.message.content) &&
    e.message.content.some((n) => n.type === "tool_result" && n.is_error === !0)
  );
}
//@ chunk-e6aww6q8.js:1805710-1805843 placement
var MAX_STRUCTURED_CONTENT_DEPTH = 8192,
  MAX_META_KEYS = 128,
  freeze_11 = Object.freeze({ _meta: Object.freeze({ [CLAUDE_ENDTURN]: !0 }) }),
  freeze_12 = Object.freeze({
    _meta: Object.freeze({ [CLAUDE_ENDTURN]: !0, [CLAUDE_ENDTURNHONORSSTOPHOOKS]: !0 }),
  });
//@ chunk-e6aww6q8.js:1805843-1805951 placement
function getEndTurnMeta(e) {
  switch (getEndTurnMetaKind(e)) {
    case "mcp_meta":
      return freeze_11;
    case "mcp_meta_blockable":
      return freeze_12;
    case !1:
      return;
  }
}
//@ chunk-e6aww6q8.js:1805951-1806124 placement
var MAX_STRUCTURED_CONTENT_BYTES = 1048576,
  DEFAULT_STRUCTURED_CONTENT_LIMIT = MAX_STRUCTURED_CONTENT_BYTES,
  UI_RESOURCE_STRUCTURED_CONTENT_LIMIT = 8388608,
  UI_RESOURCE_LIMIT_NOTE = `The limit is ${UI_RESOURCE_STRUCTURED_CONTENT_LIMIT} for a tool whose tools/list entry names a ui:// resource (_meta.ui.resourceUri, or the older ui/resourceUri). `;
/**
 * 处理 MCP 工具返回的 structuredContent：过大或不可序列化时省略并说明。
 */
//@ chunk-e6aww6q8.js:1806124-1807170 placement
function formatMcpStructuredContent(e, n, r, s = !1) {
  if (!e) {
    if (r.mcpInfo?.serverType === "sdk") return n;
    let S = nei(r.mcpInfo?.uiMeta);
    if (!s) n = checkMcpResultMetaSize(n, r.mcpInfo, S);
    if (n?.structuredContent === void 0) return n;
    let { structuredContent: structuredContent, ...L } = n;
    if (isStructuredContentBase64Envelope(n.structuredContent))
      return (
        logEvent("tengu_mcp_structured_content_omitted", { isAppTool: S, asText: !0 }),
        { ...L, structuredContentOmitted: !0 }
      );
    let G = S ? UI_RESOURCE_STRUCTURED_CONTENT_LIMIT : MAX_STRUCTURED_CONTENT_BYTES,
      q = f3e(n.structuredContent)?.length ?? 1 / 0;
    if (q <= G) return n;
    return (
      logMCPDebug(
        r.mcpInfo?.serverName ?? "unknown",
        `Tool '${r.mcpInfo?.toolName ?? "unknown"}': structuredContent (${Number.isFinite(q) ? `${q} characters of JSON` : "not serializable"}, limit ${G}) left off the result message; tool_use_result.structuredContentOmitted is set, and content and resourceLinks are kept. ${S ? "" : UI_RESOURCE_LIMIT_NOTE}Exempt: in-process SDK servers`,
      ),
      logEvent("tengu_mcp_structured_content_omitted", {
        ...(Number.isFinite(q) && { jsonChars: q }),
        isAppTool: S,
      }),
      { ...L, structuredContentOmitted: !0 }
    );
  }
  let h = n?._meta;
  if (!h || Object.keys(h).length === 0) return;
  let y = f3e(h);
  if (
    y !== void 0 &&
    y.length <= MAX_STRUCTURED_CONTENT_DEPTH &&
    (!hasMcpInboundDoor() || countJsonMembers(y, MAX_META_KEYS) !== void 0)
  )
    return { _meta: h };
  return getEndTurnMeta(n);
}
/**
 * 检查 MCP 工具结果 _meta 的大小与可序列化性。
 */
//@ chunk-e6aww6q8.js:1807170-1807850 placement
function checkMcpResultMetaSize(e, n, r) {
  if (e?._meta === void 0) return e;
  let s = r ? UI_RESOURCE_STRUCTURED_CONTENT_LIMIT : DEFAULT_STRUCTURED_CONTENT_LIMIT,
    h = f3e(e._meta)?.length ?? 1 / 0;
  if (h <= s) return e;
  (logMCPDebug(
    n?.serverName ?? "unknown",
    `Tool '${n?.toolName ?? "unknown"}': result _meta (${Number.isFinite(h) ? `${h} characters of JSON` : "not serializable"}, limit ${s}) left off the result message; only its ${CLAUDE_ENDTURN} marker, if set, is kept, with ${CLAUDE_ENDTURNHONORSSTOPHOOKS} beside it. ${r ? "" : UI_RESOURCE_LIMIT_NOTE}Exempt: in-process SDK servers, and a successful result of an account memory tool or, in a Projects session, a Projects read tool`,
  ),
    logEvent("tengu_mcp_result_meta_omitted", { ...(Number.isFinite(h) && { jsonChars: h }), isAppTool: r }));
  let { _meta: _meta, ...S } = e,
    w = getEndTurnMeta(e);
  if (w) return { ...S, ...w };
  return Object.keys(S).length > 0 ? S : void 0;
}
//@ chunk-e6aww6q8.js:1807850-1807896 placement
function f3e(e) {
  try {
    return jsonStringify(e);
  } catch {
    return;
  }
}

export {
  getToolEndsTurnKind,
  m5s,
  CLAUDE_ENDTURN,
  CLAUDE_ENDTURNHONORSSTOPHOOKS,
  formatMcpStructuredContent,
  hasToolResultError,
};
