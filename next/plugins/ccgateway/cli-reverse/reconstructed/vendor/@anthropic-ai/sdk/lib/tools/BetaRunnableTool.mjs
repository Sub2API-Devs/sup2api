/**
 * @anthropic-ai/sdk/lib/tools/BetaRunnableTool.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (3)
 * attribution: esm-fingerprint 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { ToolError } from "./ToolError.mjs";

//@ chunk-vn3g7zt8.js:61281-61369 esm-fingerprint
function toolName(tool) {
  return "name" in tool ? tool.name : "mcp_server_name" in tool ? tool.mcp_server_name : tool.type;
}
//@ chunk-vn3g7zt8.js:61369-61468 esm-fingerprint
function formatToolRunnerError(tool) {
  return tool instanceof ToolError
    ? tool.content
    : `Error: ${tool instanceof Error ? tool.message : String(tool)}`;
}
//@ chunk-vn3g7zt8.js:61468-61611 esm-fingerprint
/**
 * （切分错误，Anthropic SDK 会话 tool runner）解析工具输入并运行，异常转为 {content: "Error: …", isError: true}。
 */
async function runRunnableTool(tool, rawInput, options) {
  try {
    let input = tool.parse ? tool.parse(rawInput) : rawInput;
    return {
      content: await tool.run(input, options),
      isError: false,
    };
  } catch (e) {
    return {
      content: formatToolRunnerError(e),
      isError: true,
    };
  }
}
export { toolName, runRunnableTool };
