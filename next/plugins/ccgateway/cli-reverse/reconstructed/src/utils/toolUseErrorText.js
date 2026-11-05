/**
 * utils/toolUseErrorText.ts
 *
 * 2.1.316 新增：工具调用错误文本
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a99d5w8y.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-a99d5w8y.js:227-314 placement
var TOOL_USE_ERROR_WRAPPER_RE = /^\s*<tool_use_error>([\s\S]*)<\/tool_use_error>\s*$/i;
var NESTED_TOOL_USE_ERROR_RE = /<\/?tool_use_error\b/i;
//@ chunk-a99d5w8y.js:753-829 placement
/**
 * 从 `<tool_use_error>` 包裹中取错误正文，嵌套时返回 undefined。
 */
function unwrapToolUseErrorText(text) {
  let inner = TOOL_USE_ERROR_WRAPPER_RE.exec(text)?.[1];
  return inner !== undefined && !NESTED_TOOL_USE_ERROR_RE.test(inner) ? inner : undefined;
}
export { unwrapToolUseErrorText };
