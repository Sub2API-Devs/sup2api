/**
 * utils/textNormalize.ts
 *
 * 2.1.316 新增：显示文本清洗
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-c6bzd0wx.js (15)
 * attribution: placement 15
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

//@ chunk-c6bzd0wx.js:321-457 placement
/**
 * 比较 “N-” 数字前缀，返回差值。
 */
function compareNumericPrefix(ver, e) {
  let t = /^(\d{1,15})-/.exec(ver)?.[1];
  let r = /^(\d{1,15})-/.exec(e)?.[1];
  return t === undefined || r === undefined ? null : Number(t) - Number(r);
}
//@ chunk-c6bzd0wx.js:457-493 placement
/**
 * 带版本号名称的模式（数字-哈希）。
 */
var VERSIONED_NAME_RE = /^\d{1,15}-[0-9a-f]{1,32}$/;
//@ chunk-c6bzd0wx.js:493-503 placement
var MAX_DISPLAY_TITLE_CHARS = 100;
//@ chunk-c6bzd0wx.js:503-535 placement
function sanitizeAndTrim(cwd) {
  return sanitizeArtifactTitle(sanitizeDisplayText(cwd));
}
//@ chunk-c6bzd0wx.js:535-780 placement = setCwdState (0.838)
function sanitizeDisplayText(cwd) {
  let normalized = cwd.normalize("NFC");
  return Array.from(normalized, (r) => (isDecisionSurfaceControl(r.codePointAt(0) ?? 0) ? " " : r))
    .join("")
    .replace(INVISIBLE_BLANKS, " ")
    .replace(STATUS_DOT_CHARS, " ")
    .replace(
      /[\u0300-\u036F\u0483-\u0489\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20F0\uA66F-\uA67D\uFE20-\uFE2F]/g,
      " ",
    );
}
//@ chunk-c6bzd0wx.js:780-1022 placement
function truncateSingleLine(description, e) {
  let trimmed = Array.from(sanitizeDisplayText(description), (o) => {
    let i = o.codePointAt(0) ?? 0;
    return i <= 31 || (i >= 127 && i <= 159) ? " " : o;
  })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  if (trimmed === "") return null;
  let r = truncateCodePoints(trimmed, e);
  return scrubArtifactEnvelopeTags(
    (r === trimmed ? trimmed : `${r.trimEnd()}\u2026`).replace(
      SCHEME_SEPARATOR_RE,
      DEFANGED_SCHEME_SEPARATOR,
    ),
  );
}
//@ chunk-c6bzd0wx.js:1022-1188 placement
var STATUS_DOT_CHARS =
  /[\u20DD-\u20E4\u23FA\u25C9\u25CB\u25CE\u25CF\u25EF\u26AA\u26AB\u26AC\u29BE\u29BF\u2B24\u2B55\u2B58\u{1F534}\u{1F535}\u{1F785}-\u{1F78B}\u{1F7E0}-\u{1F7E4}]/gu;
//@ chunk-c6bzd0wx.js:1188-1240 placement = setCwdState (1)
function sanitizeTitleText(cwd) {
  return sanitizeArtifactTitle(stripJoinerSequences(cwd.normalize("NFC"), false));
}
//@ chunk-c6bzd0wx.js:1240-1271 placement
function stripJoinersKeepLeading(n) {
  return stripJoinerSequences(n, true);
}
//@ chunk-c6bzd0wx.js:1271-1674 placement
function stripJoinerSequences(n, e) {
  let list = Array.from(n);
  let r = [];
  for (let j = 0; j < list.length; j++) {
    let i = list[j];
    let u = i.codePointAt(0) ?? 0;
    let last = r.at(-1);
    let codePoint = last?.codePointAt(0);
    let a = last === undefined ? e : !/\s/u.test(last);
    if (u === 127988) {
      let l = matchTagSequenceEnd(list, j);
      if (l !== -1) {
        r.push(...list.slice(j, l + 1));
        j = l;
        continue;
      }
    }
    if (isVariationSelector(u)) {
      if (a && (codePoint === undefined || !isJoinerOrVariationSelector(codePoint))) r.push(i);
      continue;
    }
    if (isZeroWidthJoiner(u)) {
      if (a && (codePoint === undefined || !isZeroWidthJoiner(codePoint))) r.push(i);
      continue;
    }
    r.push(isDecisionSurfaceControl(u) || INVISIBLE_BLANK_CODE_POINT.test(i) ? " " : i);
  }
  return r.join("");
}
//@ chunk-c6bzd0wx.js:1674-1764 placement
function isVariationSelector(n) {
  return (n >= 6155 && n <= 6157) || n === 6159 || (n >= 65024 && n <= 65039) || (n >= 917760 && n <= 917999);
}
//@ chunk-c6bzd0wx.js:1764-1804 placement
function isZeroWidthJoiner(n) {
  return n === 8204 || n === 8205;
}
//@ chunk-c6bzd0wx.js:1804-1836 placement
function isJoinerOrVariationSelector(n) {
  return isZeroWidthJoiner(n) || isVariationSelector(n);
}
//@ chunk-c6bzd0wx.js:1836-1962 placement = setCwdState (0.838)
function sanitizeInvisibleChars(cwd) {
  let joined = Array.from(cwd.normalize("NFC"), (t) =>
    isDecisionSurfaceControl(t.codePointAt(0) ?? 0) ? " " : t,
  ).join("");
  return sanitizeArtifactTitle(joined.replace(INVISIBLE_BLANKS, " "));
}
//@ chunk-c6bzd0wx.js:1962-2079 placement
/**
 * 清洗显示标题（截断、去封装标签、去链接协议）。
 */
function sanitizeDisplayTitle(n) {
  let e = sanitizeAndTrim(n);
  if (e === null) return null;
  let t = truncateCodePoints(e, MAX_DISPLAY_TITLE_CHARS);
  return scrubArtifactEnvelopeTags(
    (t === e ? e : `${t}\u2026`).replace(SCHEME_SEPARATOR_RE, DEFANGED_SCHEME_SEPARATOR),
  );
}
export {
  compareNumericPrefix,
  sanitizeDisplayTitle,
  VERSIONED_NAME_RE,
  truncateSingleLine,
  sanitizeAndTrim,
  sanitizeInvisibleChars,
  sanitizeTitleText,
  stripJoinersKeepLeading,
};
