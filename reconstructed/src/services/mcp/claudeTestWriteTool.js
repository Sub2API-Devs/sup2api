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

//@ chunk-e6aww6q8.js:4678621-4678802 placement = mergeClients (1)
function mergeClients_2(e) {
  if (e === null || typeof e !== "object" || !("name" in e) || !("text" in e)) return null;
  let { name: n, text: text } = e;
  return typeof n === "string" && typeof text === "string" ? { name: n, text: text } : null;
}
/**
 * Claude 测试草稿写入工具的显示覆盖：显示名与工具调用消息渲染（名称合法时直接显示）。
 */
//@ chunk-e6aww6q8.js:4678802-4679035 placement
function claudeTestWriteToolOverrides() {
  return {
    uiTableKey: MCP_CLAUDE_TEST_WRITE,
    userFacingName() {
      return "Write Claude Test draft";
    },
    renderToolUseMessage(e, n) {
      if (n.verbose) return renderToolUseMessage_3(e, n);
      if (typeof e.name !== "string") return "";
      return regExp_17.test(e.name) ? e.name : renderToolUseMessage_3({ name: e.name }, n);
    },
  };
}

export { claudeTestWriteToolOverrides, mergeClients_2 };
