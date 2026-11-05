/**
 * utils/stripControlChars.ts
 *
 * 2.1.316 新增：去除控制字符
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-10pvkygg.js (2)
 * attribution: placement 2
 */

//@ chunk-10pvkygg.js:191-287 placement
/**
 * 去掉控制/格式/代理/行分隔字符，非字符串返回空串。
 */
function stripControlChars(text) {
  return typeof text === "string" ? text.replace(/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/gu, "") : "";
}
//@ chunk-10pvkygg.js:287-394 placement
/**
 * 去掉控制、格式、代理与行/段分隔字符（保留换行与制表符），非字符串返回空串。
 */
function stripControlChars_2(text) {
  return typeof text === "string" ? text.replace(/(?![\n\t])[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/gu, "") : "";
}
export { stripControlChars, stripControlChars_2 };
