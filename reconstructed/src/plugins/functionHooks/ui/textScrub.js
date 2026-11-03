/**
 * plugins/functionHooks/ui/textScrub.ts
 *
 * 钩子文本清理（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (15)
 * attribution: placement 15
 */
import { COMBINING_MARK_CODES } from "../../../utils/unicode/combiningMarks.js";
import { truncateToLength } from "../../../utils/stringUtils.js";
import { checkPinnedKeys } from "../sites/siteRules.js";
import { denseListCopy } from "../sites/promptContextSites.js";

//@ chunk-4121qate.js:78428-78441 placement
/**
 * "..."
 */
var TRUNCATION_SUFFIX = "...";
//@ chunk-4121qate.js:78441-78452 placement
/**
 * 120
 */
var MAX_SCRUB_CHARS = 120;
//@ chunk-4121qate.js:78452-78690 placement
var CHARACTER_CLASSES = {
  escape: String.raw`\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f`,
  placeholder: String.raw`\u{10eeee}`,
  itermPlaceholder: String.raw`\u2800`,
  loneSurrogate: String.raw`\ud800-\udfff`,
  kittyDiacritic: COMBINING_MARK_CODES.map((e) => `\\u{${e.toString(16)}}`).join(""),
};
//@ chunk-4121qate.js:78690-78859 placement
var LINE_SCRUB = new RegExp(
  `^[${CHARACTER_CLASSES.kittyDiacritic}]+|${CHARACTER_CLASSES.itermPlaceholder}[${CHARACTER_CLASSES.kittyDiacritic}]+|[${String.raw`\t\n\r`}${CHARACTER_CLASSES.escape}${CHARACTER_CLASSES.loneSurrogate}${CHARACTER_CLASSES.placeholder}]`,
  "gu",
);
//@ chunk-4121qate.js:78859-78912 placement
var regExp = new RegExp(`^[\\s${CHARACTER_CLASSES.kittyDiacritic}]+`, "u");
//@ chunk-4121qate.js:78912-79046 placement
/**
 * 取首行、清除控制/特殊字符、截到 120 字符（加省略号），用于日志与提示。
 */
function scrubLine(shape) {
  let o = (shape.split(/\r?\n/u)[0] ?? "").replace(LINE_SCRUB, " ").replace(regExp, "").trimEnd();
  return o.length <= MAX_SCRUB_CHARS
    ? o
    : truncateToLength(o, MAX_SCRUB_CHARS - TRUNCATION_SUFFIX.length) + TRUNCATION_SUFFIX;
}
//@ chunk-4121qate.js:133340-133409 placement
/**
 * 是否为固定属性
 */
var isPinnedProp = (e, o, r) =>
  Object.hasOwn(r, e) ? checkPinnedKeys([e], o, r) === undefined : o[e] === undefined;
//@ chunk-4121qate.js:133409-133529 placement
/**
 * 找出第一个变化的属性并返回其问题说明。
 */
function findChangedProp(e, props, r) {
  for (let key of Object.keys(e)) {
    let i = e[key] !== props[key] && !isPinnedProp(key, e, props) ? r(key) : undefined;
    if (i !== undefined) return i;
  }
  return;
}
//@ chunk-4121qate.js:133529-133642 placement
function characterCount(e, o) {
  if (!o.test(e)) return 0;
  let r = 0;
  for (let n of e.matchAll(new RegExp(o.source, "gu"))) r++;
  return r;
}
//@ chunk-4121qate.js:133642-133843 placement
/**
 * 递归收集值中的所有字符串（对象的键也计入）。
 */
function collectStrings(e) {
  switch (typeof e) {
    case "string":
      return [e];
    case "object":
      if (e === null) return [];
      return Array.isArray(e)
        ? denseListCopy(e).flatMap(collectStrings)
        : Object.entries(e).flatMap(([key, value]) => [key, ...collectStrings(value)]);
    default:
      return [];
  }
}
//@ chunk-4121qate.js:133843-133892 placement
/**
 * 字符串总字符数
 */
var stringsCharCount = (e, o) => collectStrings(e).reduce((acc, n) => acc + characterCount(n, o), 0);
//@ chunk-4121qate.js:133892-133933 placement = matchesKeystroke (0.73)
var ESCAPE_CHARACTER = new RegExp(`[${CHARACTER_CLASSES.escape}]`, "u");
//@ chunk-4121qate.js:133933-134148 placement
var ITERM_CELL = new RegExp(
  `${CHARACTER_CLASSES.itermPlaceholder}[${CHARACTER_CLASSES.kittyDiacritic}]`,
  "u",
);
var SPREAD_CELL = new RegExp(
  `^[^${CHARACTER_CLASSES.itermPlaceholder}]*${CHARACTER_CLASSES.itermPlaceholder}[^]*[${CHARACTER_CLASSES.kittyDiacritic}]`,
  "u",
);
var OPENING_MARK = new RegExp(`^[${CHARACTER_CLASSES.kittyDiacritic}]`, "u");
//@ chunk-4121qate.js:134148-134196 placement
var LONE_SURROGATE = new RegExp(`[${CHARACTER_CLASSES.loneSurrogate}]`, "u");
//@ chunk-4121qate.js:134196-134242 placement
var PLACEHOLDER_CHARACTER = new RegExp(`[${CHARACTER_CLASSES.placeholder}]`, "u");
export {
  findChangedProp,
  stringsCharCount,
  isPinnedProp,
  collectStrings,
  scrubLine,
  ESCAPE_CHARACTER,
  PLACEHOLDER_CHARACTER,
  SPREAD_CELL,
  OPENING_MARK,
  LONE_SURROGATE,
  LINE_SCRUB,
  CHARACTER_CLASSES,
  ITERM_CELL,
  characterCount,
};
