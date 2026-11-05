/**
 * utils/messages/forwardedTurnSanitize.ts
 *
 * 2.1.316 新增：转发回合清理。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-qdnd7zgn.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  TAG_BRACKET_CLASSES,
  lookaheadCapture,
  escapeXml_2 as escapeXml,
  foldLookalikeChars,
} from "../confusables.js";
import { urlPatternToRegex } from "../stringUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-qdnd7zgn.js:273-342 placement
/**
 * 把转发文本换行统一并每行缩进两格。
 */
function indentForwardedText(text) {
  return (
    "  " +
    text.replace(
      LINE_BREAK_RE,
      `
`,
    ).split(`
`).join(`
  `)
  );
}
//@ chunk-qdnd7zgn.js:342-404 placement
/**
 * 转发回合缩进的别名，并定义换行/分隔符正则。
 */
var indentForwardedTurn = indentTurn;
var LINE_BREAK_RE = /\r\n?|[\u001c-\u001e\u2028\u2029\u0085\v\f]/g;
//@ chunk-qdnd7zgn.js:404-446 placement
/**
 * 把各种换行与分页符统一为 \n。
 */
function normalizeLineBreaks(text) {
  return text.replace(
    LINE_BREAK_RE,
    `
`,
  );
}
//@ chunk-qdnd7zgn.js:446-527 placement
/**
 * 不可见格式字符正则（Cf 与 Default_Ignorable）。
 */
var INVISIBLE_FORMAT_CHARS_RE; // deferred: uses INVISIBLE_CHAR_CLASSES (../confusables.js) of its import cycle while loading; runs once the cycle is complete
var open;
var close;
var slash;
deferInit("chunk-qdnd7zgn.js:446", () => {
  INVISIBLE_FORMAT_CHARS_RE = /[\p{Cf}\p{Default_Ignorable_Code_Point}]/gu;
  ({ open, close, slash } = TAG_BRACKET_CLASSES);
});
//@ chunk-qdnd7zgn.js:527-674 placement
/**
 * 中和转发回合中的链接：去掉特殊字符，并把指向指定地址的括号链接改写为普通方括号，避免被当成可点击链接。
 */
function neutralizeForwardedLinks_2(pathPrefix, text) {
  return text
    .replace(INVISIBLE_FORMAT_CHARS_RE, "")
    .replace(
      new RegExp(
        `[${open}]([\\s${slash}]*${urlPatternToRegex(pathPrefix)}\\b(?:${lookaheadCapture(`^${open}${close}`, 2)}[${close}])?)`,
        "giu",
      ),
      (match, captured) => "[" + captured,
    );
}
//@ chunk-qdnd7zgn.js:674-751 placement
var FORWARDED_USER_TURNS = "forwarded_user_turns";
var FORWARDED_TURN = "forwarded_turn";
var FORWARDED_TRANSCRIPT_PATH = ["transcript", FORWARDED_USER_TURNS, FORWARDED_TURN];
//@ chunk-qdnd7zgn.js:751-810 placement
/**
 * 逐层中和转发内容中的链接（避免被渲染为可点击）。
 */
function neutralizeForwardedLinks(text) {
  let result = text;
  for (let prefix of FORWARDED_TRANSCRIPT_PATH) result = neutralizeForwardedLinks_2(prefix, result);
  return result;
}
//@ chunk-qdnd7zgn.js:810-871 placement
/**
 * 统一换行、去链接后每行缩进两格。
 */
function indentTurn(text) {
  return (
    "  " +
    neutralizeForwardedLinks(normalizeLineBreaks(text)).split(`
`).join(`
  `)
  );
}
//@ chunk-qdnd7zgn.js:871-910 placement
var CONTROL_CHARS_RE = /[\x00-\x08\x0b-\x1f\x7f-\x9f]/g;
//@ chunk-qdnd7zgn.js:910-983 placement
/**
 * 生成转义 XML 的转发回合文本块。
 */
function formatForwardedTurnXML(text) {
  return indentForwardedText(
    escapeXml(
      foldLookalikeChars(
        normalizeLineBreaks(text).replace(INVISIBLE_FORMAT_CHARS_RE, "").replace(CONTROL_CHARS_RE, ""),
      ),
    ),
  );
}
export {
  formatForwardedTurnXML,
  INVISIBLE_FORMAT_CHARS_RE,
  neutralizeForwardedLinks,
  indentTurn,
  neutralizeForwardedLinks_2,
  FORWARDED_TURN,
  FORWARDED_USER_TURNS,
  normalizeLineBreaks,
  LINE_BREAK_RE,
  indentForwardedText,
  indentForwardedTurn,
};
