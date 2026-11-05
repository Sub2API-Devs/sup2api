/**
 * utils/unsafePathGlyphs.ts
 *
 * 含隐藏字符路径的提示（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-thd5yvta.js (6)
 * attribution: placement 6
 */

//@ chunk-thd5yvta.js:191-284 placement
/**
 * 含隐藏/控制/不可忽略字符的路径模式。
 */
var UNSAFE_PATH_GLYPH_RE =
  /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}\u2800]|(?!\u0020)\p{Zs}/u;
//@ chunk-thd5yvta.js:284-319 placement
function hasUnsafePathGlyphs(path) {
  return UNSAFE_PATH_GLYPH_RE.test(path);
}
//@ chunk-thd5yvta.js:319-335 placement
var SURROGATE_RE = /\p{Cs}/u;
//@ chunk-thd5yvta.js:335-376 placement
/**
 * 文本是否含不安全路径字符或代理项。
 */
function hasUnsafePathGlyphsOrSurrogate(path) {
  return hasUnsafePathGlyphs(path) || SURROGATE_RE.test(path);
}
//@ chunk-thd5yvta.js:376-501 placement
/**
 * 含隐藏/控制字符时以说明代替原文。
 */
function hideUnsafeText(text, marker) {
  return text.split(/\r?\n/).some(hasUnsafePathGlyphsOrSurrogate)
    ? `${marker} is not shown here because it holds hidden or control characters`
    : text;
}
//@ chunk-thd5yvta.js:501-602 placement
/**
 * 含隐藏/控制字符的路径以说明代替。
 */
function hideUnsafePath(worktreePath) {
  return hasUnsafePathGlyphsOrSurrogate(worktreePath)
    ? "a path not shown here because it holds hidden or control characters"
    : worktreePath;
}
export {
  hasUnsafePathGlyphsOrSurrogate,
  hideUnsafePath,
  hideUnsafeText,
  hasUnsafePathGlyphs,
  UNSAFE_PATH_GLYPH_RE,
};
