/**
 * utils/textNormalize.ts
 *
 * 2.1.316 新增：显示文本清洗
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rk08ek8r.js (15)
 * attribution: placement 15
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  sanitizeArtifactTitle,
  isDecisionSurfaceControl,
  INVISIBLE_BLANKS,
  scrubArtifactEnvelopeTags,
  SCHEME_SEPARATOR_RE,
  DEFANGED_SCHEME_SEPARATOR,
  INVISIBLE_BLANK_CODE_POINT,
} from "../tools/ArtifactTool/artifactUrls.js";
import { truncateCodePoints } from "./stringUtils.js";
import { matchTagSequenceEnd } from "./invisibleChars.js";

//@ chunk-rk08ek8r.js:321-457 placement
/**
 * 比较 “N-” 数字前缀，返回差值。
 */
function compareNumericPrefix(version, version_2) {
  let major = /^(\d{1,15})-/.exec(version)?.[1];
  let major_2 = /^(\d{1,15})-/.exec(version_2)?.[1];
  return major === undefined || major_2 === undefined ? null : Number(major) - Number(major_2);
}
//@ chunk-rk08ek8r.js:457-493 placement
/**
 * 带版本号名称的模式（数字-哈希）。
 */
var VERSIONED_NAME_RE = /^\d{1,15}-[0-9a-f]{1,32}$/;
//@ chunk-rk08ek8r.js:493-503 placement
var MAX_DISPLAY_TITLE_CHARS = 100;
//@ chunk-rk08ek8r.js:503-535 placement
function sanitizeAndTrim(cwd) {
  return sanitizeArtifactTitle(sanitizeDisplayText(cwd));
}
//@ chunk-rk08ek8r.js:535-780 placement (2.1.88 match: setCwdState, 0.839)
function sanitizeDisplayText(cwd) {
  let normalized = cwd.normalize("NFC");
  return Array.from(normalized, (char) => (isDecisionSurfaceControl(char.codePointAt(0) ?? 0) ? " " : char))
    .join("")
    .replace(INVISIBLE_BLANKS, " ")
    .replace(STATUS_DOT_RE, " ")
    .replace(
      /[\u0300-\u036F\u0483-\u0489\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20F0\uA66F-\uA67D\uFE20-\uFE2F]/g,
      " ",
    );
}
//@ chunk-rk08ek8r.js:780-1022 placement
function truncateSingleLine(description, maxLength) {
  let trimmed = Array.from(sanitizeDisplayText(description), (char) => {
    let codePoint = char.codePointAt(0) ?? 0;
    return codePoint <= 31 || (codePoint >= 127 && codePoint <= 159) ? " " : char;
  })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  if (trimmed === "") return null;
  let truncated = truncateCodePoints(trimmed, maxLength);
  return scrubArtifactEnvelopeTags(
    (truncated === trimmed ? trimmed : `${truncated.trimEnd()}\u2026`).replace(
      SCHEME_SEPARATOR_RE,
      DEFANGED_SCHEME_SEPARATOR,
    ),
  );
}
//@ chunk-rk08ek8r.js:1022-1188 placement
var STATUS_DOT_RE =
  /[\u20DD-\u20E4\u23FA\u25C9\u25CB\u25CE\u25CF\u25EF\u26AA\u26AB\u26AC\u29BE\u29BF\u2B24\u2B55\u2B58\u{1F534}\u{1F535}\u{1F785}-\u{1F78B}\u{1F7E0}-\u{1F7E4}]/gu;
//@ chunk-rk08ek8r.js:1188-1240 placement (2.1.88 match: setCwdState, 1)
function sanitizeTitleText(cwd) {
  return sanitizeArtifactTitle(stripJoinerSequences(cwd.normalize("NFC"), false));
}
//@ chunk-rk08ek8r.js:1240-1271 placement
function stripJoinersKeepLeading(text) {
  return stripJoinerSequences(text, true);
}
//@ chunk-rk08ek8r.js:1271-1674 placement
function stripJoinerSequences(text, keepLeading) {
  let list = Array.from(text);
  let chars = [];
  for (let j = 0; j < list.length; j++) {
    let char = list[j];
    let charCode = char.codePointAt(0) ?? 0;
    let last = chars.at(-1);
    let codePoint = last?.codePointAt(0);
    let keepChar = last === undefined ? keepLeading : !/\s/u.test(last);
    if (charCode === 127988) {
      let tagEnd = matchTagSequenceEnd(list, j);
      if (tagEnd !== -1) {
        chars.push(...list.slice(j, tagEnd + 1));
        j = tagEnd;
        continue;
      }
    }
    if (isVariationSelector(charCode)) {
      if (keepChar && (codePoint === undefined || !isJoinerOrVariationSelector(codePoint))) chars.push(char);
      continue;
    }
    if (isZeroWidthJoiner(charCode)) {
      if (keepChar && (codePoint === undefined || !isZeroWidthJoiner(codePoint))) chars.push(char);
      continue;
    }
    chars.push(isDecisionSurfaceControl(charCode) || INVISIBLE_BLANK_CODE_POINT.test(char) ? " " : char);
  }
  return chars.join("");
}
//@ chunk-rk08ek8r.js:1674-1764 placement
function isVariationSelector(codePoint) {
  return (
    (codePoint >= 6155 && codePoint <= 6157) ||
    codePoint === 6159 ||
    (codePoint >= 65024 && codePoint <= 65039) ||
    (codePoint >= 917760 && codePoint <= 917999)
  );
}
//@ chunk-rk08ek8r.js:1764-1804 placement
function isZeroWidthJoiner(codePoint) {
  return codePoint === 8204 || codePoint === 8205;
}
//@ chunk-rk08ek8r.js:1804-1836 placement
function isJoinerOrVariationSelector(codePoint) {
  return isZeroWidthJoiner(codePoint) || isVariationSelector(codePoint);
}
//@ chunk-rk08ek8r.js:1836-1962 placement (2.1.88 match: setCwdState, 0.839)
function sanitizeInvisibleChars(cwd) {
  let joined = Array.from(cwd.normalize("NFC"), (char) =>
    isDecisionSurfaceControl(char.codePointAt(0) ?? 0) ? " " : char,
  ).join("");
  return sanitizeArtifactTitle(joined.replace(INVISIBLE_BLANKS, " "));
}
//@ chunk-rk08ek8r.js:1962-2079 placement
/**
 * 清洗显示标题（截断、去封装标签、去链接协议）。
 */
function sanitizeDisplayTitle(title) {
  let sanitized = sanitizeAndTrim(title);
  if (sanitized === null) return null;
  let truncated = truncateCodePoints(sanitized, MAX_DISPLAY_TITLE_CHARS);
  return scrubArtifactEnvelopeTags(
    (truncated === sanitized ? sanitized : `${truncated}\u2026`).replace(
      SCHEME_SEPARATOR_RE,
      DEFANGED_SCHEME_SEPARATOR,
    ),
  );
}
export {
  sanitizeDisplayTitle,
  truncateSingleLine,
  VERSIONED_NAME_RE,
  compareNumericPrefix,
  sanitizeAndTrim,
  sanitizeInvisibleChars,
  sanitizeTitleText,
  stripJoinersKeepLeading,
};
