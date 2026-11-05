/**
 * tools/MCPTool/MCPTool.ts
 *
 * MCP 工具模板（name "mcp"），services/mcp/client 展开后为每个服务器工具覆盖名称、权限、调用等；base64 文档瘦身
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/MCPTool/MCPTool.ts
 * pieces: chunk-qb33hteb.js (7)
 * attribution: placement 1, fingerprint 2, layout 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  union,
  stringSchema,
  array,
  undefinedSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { renderToolUseMessage_4 } from "./UI.js";
import { capTextBlockMeta, stripTextBlockMeta } from "../../utils/mcpValidation.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-qb33hteb.js:385-432 placement
/**
 * MCP 模板工具的占位 prompt/description（空串），以及 uiTableKey 常量 "mcp" 与 "mcp-display-only"。
 */
var MCP_TOOL_PROMPT_PLACEHOLDER = "";
var MCP_TOOL_DESCRIPTION_PLACEHOLDER = "";
var MCP_UI_TABLE_KEY = "mcp";
var MCP_DISPLAY_ONLY = "mcp-display-only";
//@ chunk-qb33hteb.js:432-560 fingerprint (2.1.88 match: outputSchema, 0.793)
/**
 * MCP 工具输入 schema（passthrough 空对象）与输出 schema（字符串、内容块数组或结构化内容）。
 */
var mcpInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var mcpOutputSchema;
deferInit("chunk-qb33hteb.js:432", () => {
  mcpInputSchema = DoctorLazy(() => objectSchema({}).passthrough());
  mcpOutputSchema = DoctorLazy(() =>
    union([
      stringSchema(),
      array(
        objectSchema({
          type: stringSchema(),
        }).passthrough(),
      ),
      undefinedSchema(),
    ]).describe("MCP tool execution result"),
  );
});
//@ chunk-qb33hteb.js:560-678 layout
/**
 * 把结果里 base64 document 块的 data 置空（用于持久化/转录前瘦身）。
 */
function blankBase64DocumentData(output) {
  if (!Array.isArray(output) || !output.some(hasBase64DocumentData)) return output;
  return output.map((block) =>
    hasBase64DocumentData(block)
      ? {
          ...block,
          source: {
            ...block.source,
            data: "",
          },
        }
      : block,
  );
}
//@ chunk-qb33hteb.js:678-750 layout
/**
 * 过滤掉 data 已被置空的 base64 document 块。
 */
function dropBlankDocuments(content) {
  return Array.isArray(content) && content.some(isBlankBase64Document)
    ? content.filter((block) => !isBlankBase64Document(block))
    : content;
}
//@ chunk-qb33hteb.js:750-839 layout
function isBlankBase64Document(block) {
  return block?.type === "document" && block.source?.type === "base64" && block.source.data === "";
}
//@ chunk-qb33hteb.js:839-928 layout
function hasBase64DocumentData(block) {
  return block?.type === "document" && block.source?.type === "base64" && block.source.data !== "";
}
//@ chunk-qb33hteb.js:928-1528 fingerprint (2.1.88 match: MCPTool, 0.732)
/**
 * MCP 工具模板（name "mcp"，isMcp，backgrounding "self"，maxResultSizeChars 100000）。本身 call 返回空、checkPermissions 为 passthrough；services/mcp/client 用 `...MCPTool` 展开后为每个服务器工具覆盖 name（mcp__服务器__工具）、mcpInfo、prompt/description、isReadOnly/isConcurrencySafe（看 readOnlyHint）、alwaysLoad（anthropic/alwaysLoad）、call 等。stripForCreation 清空 base64 文档数据，回传模型前再丢掉这些空文档。
 */
var MCPTool; // deferred: uses buildTool (../../services/tools/permissionCheckGuard.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-qb33hteb.js:928", () => {
  MCPTool = buildTool({
    isMcp: true,
    isOpenWorld() {
      return false;
    },
    name: "mcp",
    uiTableKey: MCP_UI_TABLE_KEY,
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
          return {
            data: "",
          };
        },
        async checkPermissions() {
          return {
            behavior: "passthrough",
            message: "MCPTool requires permission.",
          };
        },
      };
    },
    renderToolUseMessage(input, { verbose }) {
      return renderToolUseMessage_4(input, {
        verbose,
      });
    },
    userFacingName: () => "mcp",
    stripForCreation: (output) => capTextBlockMeta(blankBase64DocumentData(output)),
    mapToolResultToToolResultBlockParam(content, toolUseID) {
      return {
        tool_use_id: toolUseID,
        type: "tool_result",
        content: stripTextBlockMeta(dropBlankDocuments(content)),
      };
    },
  });
});
export { MCPTool, mcpOutputSchema, MCP_DISPLAY_ONLY, MCP_UI_TABLE_KEY };
