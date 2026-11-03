/**
 * utils/printableName.ts
 *
 * 2.1.316 新增：引号类字符正则；截取时避免切断转义序列等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cbe70hjy.js (18)
 * attribution: placement 18
 */
import { replaceControlChars } from "./resultError.js";
import {
  toWellFormedString,
  truncateToLength,
  collapseWhitespace,
  printableText as printableText_2,
  truncateMiddle as truncateMiddle_2,
  takeLastChars,
} from "./stringUtils.js";
import { INVISIBLE_CHAR_CLASS_SOURCE } from "./sanitization.js";
import { errorMessage } from "./errors.js";

//@ chunk-cbe70hjy.js:317-765 placement
/**
 * 引号类字符正则。
 */
var QUOTE_CHARS_PATTERN_2 =
  /[\p{Pi}\p{Pf}\u201a\u201e\u201f\u2e32\u2e34\u2e41\u2e49\u2e42\u3003\u300c-\u300f\ufe41-\ufe44\u301d-\u301f\u275b-\u2760\u276e\u276f\u{1f676}-\u{1f678}\u2032-\u2037\u2057\u02b9\u02ba\u0374\u02bd-\u02bf\u02c8\u02d2\u02d3\u02ca\u02ce\u02cf\u02dd\u02f4-\u02f6\u02ee\u00b4\u0384\u0385\u1fbd\u1fbf\u1fcd-\u1fcf\u1fdd-\u1fdf\u1ffd\u1ffe\u05f3\u05f4\u0559-\u055b\u07f4\u07f5\ua67f\ua78b\ua78c\uff02\uff07\uff62\uff63]/gu;
var QUOTE_CHARS_PATTERN = /(?<![^\s\p{P}])\p{M}+/gu;
//@ chunk-cbe70hjy.js:765-831 placement
/**
 * 去掉 ANSI 序列与控制字符并压缩空格。
 */
function stripAnsiAndControls(n) {
  return replaceControlChars(stripAnsiSequences(toWellFormedString(n)))
    .replace(/ {2,}/g, " ")
    .trim();
}
//@ chunk-cbe70hjy.js:831-926 placement
var ANSI_ESCAPE_RE = /\x1b\[[\x30-\x3f]*[\x20-\x2f]*[\x40-\x7e]|\x1b[\]PX^_][^\x1b\x07]*(?:\x07|\x1b\\)/g;
var MAX_ANSI_STRIP_ROUNDS = 4;
//@ chunk-cbe70hjy.js:926-1021 placement
/**
 * 反复去掉 ANSI 转义序列。
 */
function stripAnsiSequences(wellFormedString) {
  let e = wellFormedString;
  for (let i = 0; i < MAX_ANSI_STRIP_ROUNDS; i++) {
    let replaced = e.replace(ANSI_ESCAPE_RE, "");
    if (replaced === e) break;
    e = replaced;
  }
  return e;
}
//@ chunk-cbe70hjy.js:1021-1141 placement = setCwdState (1)
/**
 * 生成可打印的名字（去控制字符、反引号替换、截断）。
 */
function printableName(n, e = 160) {
  return truncateWithEllipsis(
    stripAnsiAndControls(sliceSafely(n, e))
      .normalize("NFC")
      .replace(/[`\uff40\u02cb\u1fef\u2035]/g, "'")
      .replace(QUOTE_CHARS_PATTERN, ""),
    e,
  );
}
//@ chunk-cbe70hjy.js:1141-1181 placement
var regExp = new RegExp(`[^\\S ]|[${INVISIBLE_CHAR_CLASS_SOURCE}]`, "u");
//@ chunk-cbe70hjy.js:1181-1263 placement
/**
 * 名字是否已是可打印形式。
 */
function isAlreadyPrintable(n, e) {
  return n.length <= e && !regExp.test(n) && printableName(n, e) === n.replaceAll("`", "'");
}
//@ chunk-cbe70hjy.js:1263-1342 placement
/**
 * 可打印文本（长度上限 2000）。
 */
function printableText(n, e = 2000) {
  let t = stripAnsiAndControls(sliceSafely(n, e));
  return t.length > e ? `${truncateToLength(t, e)}\u2026` : t;
}
//@ chunk-cbe70hjy.js:1342-1403 placement
/**
 * 超长时截断加省略号。
 */
function truncateWithEllipsis(n, e = 2000) {
  return n.length > e ? `${truncateToLength(n, e)}\u2026` : n;
}
//@ chunk-cbe70hjy.js:1403-1553 placement
/**
 * 单行化文本（去控制字符、压缩空白）。
 */
function singleLineText(n, e = 160) {
  let trimmed = toWellFormedString(n)
    .replace(/[\p{Cc}\p{Cf}]/gu, (r) => (/\s/.test(r) ? r : ""))
    .replace(/\s+/g, " ")
    .trim();
  return trimmed.length > e ? `${truncateToLength(trimmed, e)}\u2026` : trimmed;
}
//@ chunk-cbe70hjy.js:1553-1593 placement
/**
 * 可打印名字（空值为空串）。
 */
function printableOrEmpty(n, e = 300) {
  return printableName(n ?? "", e);
}
//@ chunk-cbe70hjy.js:1593-1743 placement
/**
 * 可打印名字（引号统一为弯引号）。
 */
function quotedPrintable(n, e = 300) {
  return printableName(n ?? "", e)
    .replace(QUOTE_CHARS_PATTERN_2, "")
    .replace(/[\u02bb\u02bc]/g, "\u2019")
    .replace(/"/g, "\u201D")
    .replace(/'/g, "\u2019")
    .replace(QUOTE_CHARS_PATTERN, "");
}
//@ chunk-cbe70hjy.js:1743-1961 placement
/**
 * 可打印标签（规范引号）。
 */
function printableLabel(n, e) {
  let trimmed = collapseWhitespace(printableText_2(toWellFormedString(n).replace(/\s+/g, " ")))
    .normalize("NFC")
    .replace(QUOTE_CHARS_PATTERN_2, "'")
    .replace(/["\u02BB\u02BC]/g, "'")
    .replace(QUOTE_CHARS_PATTERN, "")
    .trim();
  if (!trimmed) return "";
  return `\u201C${e ? truncateMiddle_2(trimmed, e.head, e.tail, () => "\u2026") : trimmed}\u201D`;
}
//@ chunk-cbe70hjy.js:1961-2139 placement
/**
 * 可打印名字，为空时显示占位。
 */
function printableNameOrPlaceholder(n) {
  let replaced = printableLabel(n)
    .replace(/[`\uff40\u02cb\u1fef\u2035]/g, "'")
    .replace(QUOTE_CHARS_PATTERN, "");
  return replaced === ""
    ? "(no printable name)"
    : replaced === `\u201C${n}\u201D`
      ? replaced
      : `${replaced} (not its exact spelling)`;
}
//@ chunk-cbe70hjy.js:2139-2230 placement = readHeadAndTail (0.802)
function readHeadAndTail(n, e) {
  let t = printableLabel(n) || "\u201C\u201D";
  return t.length <= e
    ? t
    : printableLabel(n, {
        head: e - 3,
        tail: 0,
      });
}
//@ chunk-cbe70hjy.js:2230-2538 placement
/**
 * 保留首尾截断中间（保持引号平衡）。
 */
function truncateMiddle(n, { head, tail }) {
  if (n.length <= head + tail) return n;
  let r = head > 0 ? truncateToLength(n, head) : "";
  let u = tail > 0 ? takeLastChars(n, tail) : "";
  let i = (r.match(/\u201C/g)?.length ?? 0) > (r.match(/\u201D/g)?.length ?? 0);
  let index = u.indexOf("\u201D");
  let index_2 = u.indexOf("\u201C");
  let g = index !== -1 && (index_2 === -1 || index < index_2);
  return `${r}${i === g ? "\u2026" : i ? "\u2026\u201D\u2026" : "\u2026\u201C\u2026"}${u}`;
}
//@ chunk-cbe70hjy.js:2538-2868 placement
/**
 * 截取时避免切断转义序列。
 */
function sliceSafely(n, e) {
  let t = truncateToLength(n, e * 8);
  if (t.length === n.length) return t;
  let match = /\x1b(?:[\]PX^_][^\x1b\x07]*\x1b?|\[[\x30-\x3f]*[\x20-\x2f]*)$/.exec(t);
  if (match === null) return t;
  let sliced = n.slice(match.index);
  return (
    sliced[1] === "["
      ? /^\x1b\[[\x30-\x3f]*[\x20-\x2f]*[\x40-\x7e]/.test(sliced)
      : /^\x1b[\]PX^_][^\x1b\x07]*(?:\x07|\x1b\\)/.test(sliced)
  )
    ? t.slice(0, match.index)
    : t;
}
//@ chunk-cbe70hjy.js:2868-2948 placement
/**
 * 消息的可打印形式（组合文本更长）。
 */
function printableMessage(n, { isComposed: e } = {}) {
  let t = errorMessage(n);
  return e?.(n) ? printableText(t, 2000) : printableName(t, 500);
}
export {
  stripAnsiAndControls,
  printableName,
  quotedPrintable,
  printableOrEmpty,
  stripAnsiSequences,
  printableMessage,
  singleLineText,
  printableLabel,
  truncateWithEllipsis,
  printableNameOrPlaceholder,
  truncateMiddle,
  readHeadAndTail,
  isAlreadyPrintable,
  printableText,
};
