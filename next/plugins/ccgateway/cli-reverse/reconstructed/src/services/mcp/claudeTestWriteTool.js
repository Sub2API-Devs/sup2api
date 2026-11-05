/**
 * services/mcp/claudeTestWriteTool.ts
 *
 * 2.1.316 新增：claude-test 写草稿 MCP 工具的识别与显示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { MCP_CLAUDE_TEST_WRITE, regExp_20 } from "../../plugins/bundled/claudeTest/constants.js";
import { renderToolUseMessage_4 } from "../../tools/MCPTool/UI.js";

//@ chunk-5xgkngpb.js:4787230-4787411 placement (2.1.88 match: mergeClients, 1)
function mergeClients_2(candidate) {
  if (candidate === null || typeof candidate !== "object" || !("name" in candidate) || !("text" in candidate))
    return null;
  let { name: draftName, text } = candidate;
  return typeof draftName === "string" && typeof text === "string"
    ? {
        name: draftName,
        text,
      }
    : null;
}
//@ chunk-5xgkngpb.js:4787411-4787644 placement
/**
 * Claude 测试草稿写入工具的显示覆盖：显示名与工具调用消息渲染（名称合法时直接显示）。
 */
function claudeTestWriteToolOverrides() {
  return {
    uiTableKey: MCP_CLAUDE_TEST_WRITE,
    userFacingName() {
      return "Write Claude Test draft";
    },
    renderToolUseMessage(input, context) {
      if (context.verbose) return renderToolUseMessage_4(input, context);
      if (typeof input.name !== "string") return "";
      return regExp_20.test(input.name)
        ? input.name
        : renderToolUseMessage_4(
            {
              name: input.name,
            },
            context,
          );
    },
  };
}
export { claudeTestWriteToolOverrides, mergeClients_2 };
