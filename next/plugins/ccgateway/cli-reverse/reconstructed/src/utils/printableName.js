/**
 * utils/printableName.ts
 *
 * 2.1.316 新增：引号类字符正则；截取时避免切断转义序列等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-k51y52jw.js (18)
 * attribution: placement 18
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-k51y52jw.js:315-763 placement
/**
 * 引号类字符正则。
 */
var QUOTE_CHARS_PATTERN_2 =
  /[\p{Pi}\p{Pf}\u201a\u201e\u201f\u2e32\u2e34\u2e41\u2e49\u2e42\u3003\u300c-\u300f\ufe41-\ufe44\u301d-\u301f\u275b-\u2760\u276e\u276f\u{1f676}-\u{1f678}\u2032-\u2037\u2057\u02b9\u02ba\u0374\u02bd-\u02bf\u02c8\u02d2\u02d3\u02ca\u02ce\u02cf\u02dd\u02f4-\u02f6\u02ee\u00b4\u0384\u0385\u1fbd\u1fbf\u1fcd-\u1fcf\u1fdd-\u1fdf\u1ffd\u1ffe\u05f3\u05f4\u0559-\u055b\u07f4\u07f5\ua67f\ua78b\ua78c\uff02\uff07\uff62\uff63]/gu;
var QUOTE_CHARS_PATTERN = /(?<![^\s\p{P}])\p{M}+/gu;
//@ chunk-k51y52jw.js:763-829 placement
/**
 * 去掉 ANSI 序列与控制字符并压缩空格。
 */
function stripAnsiAndControls(value) {
  return replaceControlChars(stripAnsiSequences(toWellFormedString(value)))
    .replace(/ {2,}/g, " ")
    .trim();
}
//@ chunk-k51y52jw.js:829-924 placement
var ANSI_ESCAPE_RE = /\x1b\[[\x30-\x3f]*[\x20-\x2f]*[\x40-\x7e]|\x1b[\]PX^_][^\x1b\x07]*(?:\x07|\x1b\\)/g;
var MAX_ANSI_STRIP_ROUNDS = 4;
//@ chunk-k51y52jw.js:924-1019 placement
/**
 * 反复去掉 ANSI 转义序列。
 */
function stripAnsiSequences(wellFormedString) {
  let stripped = wellFormedString;
  for (let i = 0; i < MAX_ANSI_STRIP_ROUNDS; i++) {
    let replaced = stripped.replace(ANSI_ESCAPE_RE, "");
    if (replaced === stripped) break;
    stripped = replaced;
  }
  return stripped;
}
//@ chunk-k51y52jw.js:1019-1140 placement (2.1.88 match: setCwdState, 1)
/**
 * 生成可打印的名字（去控制字符、反引号替换、截断）。
 */
function printableName(value, maxLength = 160) {
  return truncateWithEllipsis(
    stripAnsiAndControls(sliceSafely(value, maxLength))
      .normalize("NFC")
      .replace(/[`\uff40\u02cb\u1fef\u2035]/g, "'")
      .replace(QUOTE_CHARS_PATTERN, ""),
    maxLength,
  );
}
//@ chunk-k51y52jw.js:1140-1180 placement
var regExp; // deferred: uses INVISIBLE_CHAR_CLASSES (./sanitization.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-k51y52jw.js:1140", () => {
  regExp = new RegExp(`[^\\S ]|[${INVISIBLE_CHAR_CLASS_SOURCE}]`, "u");
});
//@ chunk-k51y52jw.js:1180-1262 placement
/**
 * 名字是否已是可打印形式。
 */
function isAlreadyPrintable(value, maxLength) {
  return (
    value.length <= maxLength &&
    !regExp.test(value) &&
    printableName(value, maxLength) === value.replaceAll("`", "'")
  );
}
//@ chunk-k51y52jw.js:1262-1340 placement
/**
 * 可打印文本（长度上限 2000）。
 */
function printableText(text, maxLength = 2000) {
  let stripped = stripAnsiAndControls(sliceSafely(text, maxLength));
  return stripped.length > maxLength ? `${truncateToLength(stripped, maxLength)}\u2026` : stripped;
}
//@ chunk-k51y52jw.js:1340-1401 placement
/**
 * 超长时截断加省略号。
 */
function truncateWithEllipsis(text, maxLength = 2000) {
  return text.length > maxLength ? `${truncateToLength(text, maxLength)}\u2026` : text;
}
//@ chunk-k51y52jw.js:1401-1550 placement
/**
 * 单行化文本（去控制字符、压缩空白）。
 */
function singleLineText(value, maxLength = 160) {
  let trimmed = toWellFormedString(value)
    .replace(/[\p{Cc}\p{Cf}]/gu, (char) => (/\s/.test(char) ? char : ""))
    .replace(/\s+/g, " ")
    .trim();
  return trimmed.length > maxLength ? `${truncateToLength(trimmed, maxLength)}\u2026` : trimmed;
}
//@ chunk-k51y52jw.js:1550-1590 placement
/**
 * 可打印名字（空值为空串）。
 */
function printableOrEmpty(value, maxLength = 300) {
  return printableName(value ?? "", maxLength);
}
//@ chunk-k51y52jw.js:1590-1740 placement
/**
 * 可打印名字（引号统一为弯引号）。
 */
function quotedPrintable(value, maxLength = 300) {
  return printableName(value ?? "", maxLength)
    .replace(QUOTE_CHARS_PATTERN_2, "")
    .replace(/[\u02bb\u02bc]/g, "\u2019")
    .replace(/"/g, "\u201D")
    .replace(/'/g, "\u2019")
    .replace(QUOTE_CHARS_PATTERN, "");
}
//@ chunk-k51y52jw.js:1740-1957 placement
/**
 * 可打印标签（规范引号）。
 */
function printableLabel(value, limits) {
  let trimmed = collapseWhitespace(printableText_2(toWellFormedString(value).replace(/\s+/g, " ")))
    .normalize("NFC")
    .replace(QUOTE_CHARS_PATTERN_2, "'")
    .replace(/["\u02BB\u02BC]/g, "'")
    .replace(QUOTE_CHARS_PATTERN, "")
    .trim();
  if (!trimmed) return "";
  return `\u201C${limits ? truncateMiddle_2(trimmed, limits.head, limits.tail, () => "\u2026") : trimmed}\u201D`;
}
//@ chunk-k51y52jw.js:1957-2135 placement
/**
 * 可打印名字，为空时显示占位。
 */
function printableNameOrPlaceholder(value) {
  let replaced = printableLabel(value)
    .replace(/[`\uff40\u02cb\u1fef\u2035]/g, "'")
    .replace(QUOTE_CHARS_PATTERN, "");
  return replaced === ""
    ? "(no printable name)"
    : replaced === `\u201C${value}\u201D`
      ? replaced
      : `${replaced} (not its exact spelling)`;
}
//@ chunk-k51y52jw.js:2135-2226 placement (2.1.88 match: readHeadAndTail, 0.802)
function readHeadAndTail(value, maxLength) {
  let label = printableLabel(value) || "\u201C\u201D";
  return label.length <= maxLength
    ? label
    : printableLabel(value, {
        head: maxLength - 3,
        tail: 0,
      });
}
//@ chunk-k51y52jw.js:2226-2533 placement
/**
 * 保留首尾截断中间（保持引号平衡）。
 */
function truncateMiddle(text, { head, tail }) {
  if (text.length <= head + tail) return text;
  let headText = head > 0 ? truncateToLength(text, head) : "";
  let tailText = tail > 0 ? takeLastChars(text, tail) : "";
  let opensQuote = (headText.match(/\u201C/g)?.length ?? 0) > (headText.match(/\u201D/g)?.length ?? 0);
  let index = tailText.indexOf("\u201D");
  let index_2 = tailText.indexOf("\u201C");
  let tailClosesQuote = index !== -1 && (index_2 === -1 || index < index_2);
  return `${headText}${opensQuote === tailClosesQuote ? "\u2026" : opensQuote ? "\u2026\u201D\u2026" : "\u2026\u201C\u2026"}${tailText}`;
}
//@ chunk-k51y52jw.js:2533-2862 placement
/**
 * 截取时避免切断转义序列。
 */
function sliceSafely(value, maxLength) {
  let truncated = truncateToLength(value, maxLength * 8);
  if (truncated.length === value.length) return truncated;
  let match = /\x1b(?:[\]PX^_][^\x1b\x07]*\x1b?|\[[\x30-\x3f]*[\x20-\x2f]*)$/.exec(truncated);
  if (match === null) return truncated;
  let sliced = value.slice(match.index);
  return (
    sliced[1] === "["
      ? /^\x1b\[[\x30-\x3f]*[\x20-\x2f]*[\x40-\x7e]/.test(sliced)
      : /^\x1b[\]PX^_][^\x1b\x07]*(?:\x07|\x1b\\)/.test(sliced)
  )
    ? truncated.slice(0, match.index)
    : truncated;
}
//@ chunk-k51y52jw.js:2862-2942 placement
/**
 * 消息的可打印形式（组合文本更长）。
 */
function printableMessage(error, { isComposed } = {}) {
  let message = errorMessage(error);
  return isComposed?.(error) ? printableText(message, 2000) : printableName(message, 500);
}
export {
  printableLabel,
  printableName,
  printableMessage,
  truncateWithEllipsis,
  printableOrEmpty,
  quotedPrintable,
  printableText,
  stripAnsiSequences,
  stripAnsiAndControls,
  readHeadAndTail,
  isAlreadyPrintable,
  printableNameOrPlaceholder,
  singleLineText,
  truncateMiddle,
};
