/**
 * utils/highlightMatch.tsx
 *
 * 高亮匹配子串的文本组件辅助。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/highlightMatch.tsx
 * pieces: chunk-czq1j3j2.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-czq1j3j2.js:831578-831644 fingerprint (2.1.88 match: highlightMatch, 0.742)
/**
 * 匹配文本的默认样式，以及反色变体。
 */
var DEFAULT_MATCH_TEXT_STYLE = {
  color: undefined,
  bold: false,
  inverse: false,
};
var INVERSE_MATCH_TEXT_STYLE = {
  ...DEFAULT_MATCH_TEXT_STYLE,
  inverse: true,
};
export { DEFAULT_MATCH_TEXT_STYLE, INVERSE_MATCH_TEXT_STYLE };
