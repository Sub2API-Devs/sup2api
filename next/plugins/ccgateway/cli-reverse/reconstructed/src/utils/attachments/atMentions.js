/**
 * utils/attachments/atMentions.ts
 *
 * 2.1.316 新增：@ 提及附件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: placement 2
 */
//@ chunk-5xgkngpb.js:3279103-3279187 placement
/**
 * 中日文标点字符（。、？！）。
 */
var CJK_PUNCTUATION = "\u3002\u3001\uFF1F\uFF01";
var WORD_BOUNDARY_PATTERN = String.raw`[\s${"\u3002\u3001\uFF1F\uFF01"}]`;
//@ chunk-5xgkngpb.js:3279187-3279284 placement
/**
 * 判断某位置的字符是否为词字符（字母、数字或下划线）。
 */
function isWordCharCodeAt(text, index) {
  let code = text.charCodeAt(index);
  return (
    (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || code === 95 || (code >= 97 && code <= 122)
  );
}
export { WORD_BOUNDARY_PATTERN, CJK_PUNCTUATION, isWordCharCodeAt };
