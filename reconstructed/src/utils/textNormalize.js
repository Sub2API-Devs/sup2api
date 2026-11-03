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

/**
 * 比较 “N-” 数字前缀，返回差值。
 */
//@ chunk-c6bzd0wx.js:321-457 placement
function compareNumericPrefix(n, e) {
  let t = /^(\d{1,15})-/.exec(n)?.[1],
    r = /^(\d{1,15})-/.exec(e)?.[1];
  return t === void 0 || r === void 0 ? null : Number(t) - Number(r);
}
//@ chunk-c6bzd0wx.js:457-493 placement
var w4e = /^\d{1,15}-[0-9a-f]{1,32}$/;
//@ chunk-c6bzd0wx.js:493-503 placement
var A = 100;
//@ chunk-c6bzd0wx.js:503-535 placement
function sanitizeAndTrim(n) {
  return sanitizeArtifactTitle(sanitizeDisplayText(n));
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
function truncateSingleLine(n, e) {
  let trimmed = Array.from(sanitizeDisplayText(n), (o) => {
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
  return sanitizeArtifactTitle(stripJoinerSequences(cwd.normalize("NFC"), !1));
}
//@ chunk-c6bzd0wx.js:1240-1271 placement
function stripJoinersKeepLeading(n) {
  return stripJoinerSequences(n, !0);
}
//@ chunk-c6bzd0wx.js:1271-1674 placement
function stripJoinerSequences(n, e) {
  let list = Array.from(n),
    r = [];
  for (let o = 0; o < list.length; o++) {
    let i = list[o],
      u = i.codePointAt(0) ?? 0,
      at = r.at(-1),
      s = at?.codePointAt(0),
      a = at === void 0 ? e : !/\s/u.test(at);
    if (u === 127988) {
      let l = matchTagSequenceEnd(list, o);
      if (l !== -1) {
        (r.push(...list.slice(o, l + 1)), (o = l));
        continue;
      }
    }
    if (isVariationSelector(u)) {
      if (a && (s === void 0 || !isJoinerOrVariationSelector(s))) r.push(i);
      continue;
    }
    if (isZeroWidthJoiner(u)) {
      if (a && (s === void 0 || !isZeroWidthJoiner(s))) r.push(i);
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
/**
 * 清洗显示标题（截断、去封装标签、去链接协议）。
 */
//@ chunk-c6bzd0wx.js:1962-2079 placement
function sanitizeDisplayTitle(n) {
  let e = sanitizeAndTrim(n);
  if (e === null) return null;
  let t = truncateCodePoints(e, A);
  return scrubArtifactEnvelopeTags(
    (t === e ? e : `${t}\u2026`).replace(SCHEME_SEPARATOR_RE, DEFANGED_SCHEME_SEPARATOR),
  );
}

export {
  compareNumericPrefix,
  sanitizeDisplayTitle,
  w4e,
  truncateSingleLine,
  sanitizeAndTrim,
  sanitizeInvisibleChars,
  sanitizeTitleText,
  stripJoinersKeepLeading,
};
