/**
 * tools/MCPTool/MCPTool.ts
 *
 * MCP 工具模板（name "mcp"），services/mcp/client 展开后为每个服务器工具覆盖名称、权限、调用等；base64 文档瘦身
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/MCPTool/MCPTool.ts
 * pieces: chunk-79gnqwq0.js (7)
 * attribution: placement 1, fingerprint 2, layout 4
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, Ue, o, A, QD } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { renderToolUseMessage_3 } from "./UI.js";
import { capTextBlockMeta, stripTextBlockMeta } from "../../utils/mcpValidation.js";

/**
 * MCP 模板工具的占位 prompt/description（空串），以及 uiTableKey 常量 "mcp" 与 "mcp-display-only"。
 */
//@ chunk-79gnqwq0.js:385-432 placement
var MCP_TOOL_PROMPT_PLACEHOLDER = "",
  MCP_TOOL_DESCRIPTION_PLACEHOLDER = "",
  MCP = "mcp",
  MCP_DISPLAY_ONLY = "mcp-display-only";
/**
 * MCP 工具输入 schema（passthrough 空对象）与输出 schema（字符串、内容块数组或结构化内容）。
 */
//@ chunk-79gnqwq0.js:432-560 fingerprint = outputSchema (0.793)
var mcpInputSchema = DoctorLazy(() => u({}).passthrough()),
  mcpOutputSchema = DoctorLazy(() =>
    Ue([o(), A(u({ type: o() }).passthrough()), QD()]).describe("MCP tool execution result"),
  );
/**
 * 把结果里 base64 document 块的 data 置空（用于持久化/转录前瘦身）。
 */
//@ chunk-79gnqwq0.js:560-678 layout
function blankBase64DocumentData(e) {
  if (!Array.isArray(e) || !e.some(hasBase64DocumentData)) return e;
  return e.map((t) => (hasBase64DocumentData(t) ? { ...t, source: { ...t.source, data: "" } } : t));
}
/**
 * 过滤掉 data 已被置空的 base64 document 块。
 */
//@ chunk-79gnqwq0.js:678-750 layout
function dropBlankDocuments(e) {
  return Array.isArray(e) && e.some(isBlankBase64Document) ? e.filter((t) => !isBlankBase64Document(t)) : e;
}
//@ chunk-79gnqwq0.js:750-839 layout
function isBlankBase64Document(e) {
  return e?.type === "document" && e.source?.type === "base64" && e.source.data === "";
}
//@ chunk-79gnqwq0.js:839-928 layout
function hasBase64DocumentData(e) {
  return e?.type === "document" && e.source?.type === "base64" && e.source.data !== "";
}
/**
 * MCP 工具模板（name "mcp"，isMcp，backgrounding "self"，maxResultSizeChars 100000）。本身 call 返回空、checkPermissions 为 passthrough；services/mcp/client 用 `...MCPTool` 展开后为每个服务器工具覆盖 name（mcp__服务器__工具）、mcpInfo、prompt/description、isReadOnly/isConcurrencySafe（看 readOnlyHint）、alwaysLoad（anthropic/alwaysLoad）、call 等。stripForCreation 清空 base64 文档数据，回传模型前再丢掉这些空文档。
 */
//@ chunk-79gnqwq0.js:928-1528 fingerprint = MCPTool (0.731)
var MCPTool = buildTool({
  isMcp: !0,
  isOpenWorld() {
    return !1;
  },
  name: "mcp",
  uiTableKey: MCP,
  backgrounding: "self",
  maxResultSizeChars: 1e5,
  async description() {
    return MCP_TOOL_DESCRIPTION_PLACEHOLDER;
  },
  async prompt() {
    return MCP_TOOL_PROMPT_PLACEHOLDER;
  },
  get inputSchema() {
    return mcpInputSchema();
  },
  get outputSchema() {
    return mcpOutputSchema();
  },
  create() {
    return {
      async call() {
        return { data: "" };
      },
      async checkPermissions() {
        return { behavior: "passthrough", message: "MCPTool requires permission." };
      },
    };
  },
  renderToolUseMessage(e, { verbose: t }) {
    return renderToolUseMessage_3(e, { verbose: t });
  },
  userFacingName: () => "mcp",
  stripForCreation: (e) => capTextBlockMeta(blankBase64DocumentData(e)),
  mapToolResultToToolResultBlockParam(e, t) {
    return { tool_use_id: t, type: "tool_result", content: stripTextBlockMeta(dropBlankDocuments(e)) };
  },
});

export { MCPTool, MCP, MCP_DISPLAY_ONLY, mcpOutputSchema };
