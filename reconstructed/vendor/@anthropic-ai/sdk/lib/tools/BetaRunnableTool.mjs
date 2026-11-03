/**
 * @anthropic-ai/sdk/lib/tools/BetaRunnableTool.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (3)
 * attribution: esm-fingerprint 3
 */
import { ToolError } from "./ToolError.mjs";

//@ chunk-hwmsct5x.js:60910-60998 esm-fingerprint
function toolName(tool) {
  return "name" in tool ? tool.name : "mcp_server_name" in tool ? tool.mcp_server_name : tool.type;
}
//@ chunk-hwmsct5x.js:60998-61097 esm-fingerprint
function formatToolRunnerError(e) {
  return e instanceof ToolError ? e.content : `Error: ${e instanceof Error ? e.message : String(e)}`;
}
//@ chunk-hwmsct5x.js:61097-61240 esm-fingerprint
/**
 * （切分错误，Anthropic SDK 会话 tool runner）解析工具输入并运行，异常转为 {content: "Error: …", isError: true}。
 */
async function runRunnableTool(tool, rawInput, r) {
  try {
    let input = tool.parse ? tool.parse(rawInput) : rawInput;
    return {
      content: await tool.run(input, r),
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
