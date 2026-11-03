/**
 * utils/unsafePathGlyphs.ts
 *
 * 含隐藏字符路径的提示（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1qbn4d6a.js (6)
 * attribution: placement 6
 */

//@ chunk-1qbn4d6a.js:191-284 placement
var qbn = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}\u2800]|(?!\u0020)\p{Zs}/u;
//@ chunk-1qbn4d6a.js:284-319 placement
function hasUnsafePathGlyphs(n) {
  return qbn.test(n);
}
//@ chunk-1qbn4d6a.js:319-335 placement
var o = /\p{Cs}/u;
//@ chunk-1qbn4d6a.js:335-376 placement
function Lee(n) {
  return hasUnsafePathGlyphs(n) || o.test(n);
}
/**
 * 含隐藏/控制字符时以说明代替原文。
 */
//@ chunk-1qbn4d6a.js:376-501 placement
function hideUnsafeText(n, t) {
  return n.split(/\r?\n/).some(Lee)
    ? `${t} is not shown here because it holds hidden or control characters`
    : n;
}
/**
 * 含隐藏/控制字符的路径以说明代替。
 */
//@ chunk-1qbn4d6a.js:501-602 placement
function hideUnsafePath(n) {
  return Lee(n) ? "a path not shown here because it holds hidden or control characters" : n;
}

export { Lee, qbn, hasUnsafePathGlyphs, hideUnsafePath, hideUnsafeText };
