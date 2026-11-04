/**
 * utils/highlightMatch.tsx
 *
 * 高亮匹配子串的文本组件辅助。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/highlightMatch.tsx
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-18hwfzwa.js:798958-799024 fingerprint = highlightMatch (0.743)
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
