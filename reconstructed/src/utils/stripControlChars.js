/**
 * utils/stripControlChars.ts
 *
 * 2.1.316 新增：去除控制字符
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kgg2ns9n.js (2)
 * attribution: placement 2
 */

//@ chunk-kgg2ns9n.js:191-287 placement
function I1(n) {
  return typeof n === "string" ? n.replace(/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/gu, "") : "";
}
/**
 * 去掉控制、格式、代理与行/段分隔字符（保留换行与制表符），非字符串返回空串。
 */
//@ chunk-kgg2ns9n.js:287-394 placement
function stripControlChars(n) {
  return typeof n === "string" ? n.replace(/(?![\n\t])[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/gu, "") : "";
}

export { I1, stripControlChars };
