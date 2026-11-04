/**
 * tools/SendMessageTool/UI.tsx
 *
 * SendMessage 结果渲染位置（316 中此处只有一个误归的小判断函数）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/SendMessageTool/UI.tsx
 * pieces: chunk-cpqpnzp4.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-cpqpnzp4.js:21474-21510 fingerprint (2.1.88 match: renderToolResultMessage, 0.489)
/**
 * 结果对象是否带 target 字段（MCP 面板用，切分误归 SendMessage UI）。
 */
function renderToolResultMessage(result) {
  return "target" in result;
}
export { renderToolResultMessage };
