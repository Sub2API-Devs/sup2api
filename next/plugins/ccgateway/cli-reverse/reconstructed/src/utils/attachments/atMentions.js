/**
 * utils/attachments/atMentions.ts
 *
 * 2.1.316 新增：@ 提及附件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
//@ chunk-e6aww6q8.js:3194472-3194556 placement
/**
 * 中日文标点字符（。、？！）。
 */
var CJK_PUNCTUATION = "\u3002\u3001\uFF1F\uFF01";
var WORD_BOUNDARY_PATTERN = String.raw`[\s${"\u3002\u3001\uFF1F\uFF01"}]`;
//@ chunk-e6aww6q8.js:3194556-3194653 placement
/**
 * 判断某位置的字符是否为词字符（字母、数字或下划线）。
 */
function isWordCharCodeAt(text, index) {
  let code = text.charCodeAt(index);
  return (
    (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || code === 95 || (code >= 97 && code <= 122)
  );
}
export { WORD_BOUNDARY_PATTERN, isWordCharCodeAt, CJK_PUNCTUATION };
