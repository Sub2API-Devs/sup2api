/**
 * utils/toolUseErrorText.ts
 *
 * 2.1.316 新增：工具调用错误文本
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8eppk1se.js (2)
 * attribution: placement 2
 */
//@ chunk-8eppk1se.js:227-314 placement
var TOOL_USE_ERROR_WRAPPER_RE = /^\s*<tool_use_error>([\s\S]*)<\/tool_use_error>\s*$/i;
var NESTED_TOOL_USE_ERROR_RE = /<\/?tool_use_error\b/i;
//@ chunk-8eppk1se.js:753-829 placement
/**
 * 从 `<tool_use_error>` 包裹中取错误正文，嵌套时返回 undefined。
 */
function unwrapToolUseErrorText(n) {
  let e = TOOL_USE_ERROR_WRAPPER_RE.exec(n)?.[1];
  return e !== undefined && !NESTED_TOOL_USE_ERROR_RE.test(e) ? e : undefined;
}
export { unwrapToolUseErrorText };
