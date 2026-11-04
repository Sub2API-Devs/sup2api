/**
 * services/mcp/claudeTestWriteTool.ts
 *
 * 2.1.316 新增：claude-test 写草稿 MCP 工具的识别与显示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
import { MCP_CLAUDE_TEST_WRITE, regExp_17 } from "../../plugins/bundled/claudeTest/constants.js";
import { renderToolUseMessage_3 } from "../../tools/MCPTool/UI.js";

//@ chunk-e6aww6q8.js:4678621-4678802 placement (2.1.88 match: mergeClients, 1)
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
//@ chunk-e6aww6q8.js:4678802-4679035 placement
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
      if (context.verbose) return renderToolUseMessage_3(input, context);
      if (typeof input.name !== "string") return "";
      return regExp_17.test(input.name)
        ? input.name
        : renderToolUseMessage_3(
            {
              name: input.name,
            },
            context,
          );
    },
  };
}
export { claudeTestWriteToolOverrides, mergeClients_2 };
