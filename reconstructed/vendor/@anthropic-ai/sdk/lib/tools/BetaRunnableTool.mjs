/**
 * @anthropic-ai/sdk/lib/tools/BetaRunnableTool.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (3)
 * attribution: esm-fingerprint 3
 */
import { ch } from "./ToolError.mjs";

//@ chunk-hwmsct5x.js:60910-60998 esm-fingerprint
function la(e) {
  return "name" in e ? e.name : "mcp_server_name" in e ? e.mcp_server_name : e.type;
}
//@ chunk-hwmsct5x.js:60998-61097 esm-fingerprint
function formatToolRunnerError(e) {
  return e instanceof ch ? e.content : `Error: ${e instanceof Error ? e.message : String(e)}`;
}
/**
 * （切分错误，Anthropic SDK 会话 tool runner）解析工具输入并运行，异常转为 {content: "Error: …", isError: true}。
 */
//@ chunk-hwmsct5x.js:61097-61240 esm-fingerprint
async function zu(e, n, r) {
  try {
    let s = e.parse ? e.parse(n) : n;
    return { content: await e.run(s, r), isError: !1 };
  } catch (error) {
    return { content: formatToolRunnerError(error), isError: !0 };
  }
}

export { la, zu };
