/**
 * bridge/_new/extractMcpConfigContent.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kgtpkbhq.js (2)
 * attribution: sole-consumer-new 2
 */

/**
 * 从桥接 worker 的启动参数里取 mcp_config.content（必须是非空字符串），否则返回 undefined。
 */
//@ chunk-kgtpkbhq.js:9302-9495 sole-consumer-new
function extractMcpConfigContent(e) {
  if (!("mcp_config" in e)) return;
  let mcp_config = e.mcp_config;
  if (
    mcp_config !== null &&
    typeof mcp_config === "object" &&
    "content" in mcp_config &&
    typeof mcp_config.content === "string" &&
    mcp_config.content.length > 0
  )
    return { content: mcp_config.content };
  return;
}
/**
 * 字符串或数字转成安全整数，否则 undefined。
 */
//@ chunk-kgtpkbhq.js:9495-9608 sole-consumer-new
function toSafeInteger(e) {
  let n = typeof e === "string" ? Number(e) : e;
  return typeof n === "number" && Number.isSafeInteger(n) ? n : void 0;
}

export { toSafeInteger, extractMcpConfigContent };
