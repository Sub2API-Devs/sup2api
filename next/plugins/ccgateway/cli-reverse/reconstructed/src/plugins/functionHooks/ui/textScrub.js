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
import { deferInit } from "../../../../runtime/deferred-init.js";

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
var CHARACTER_CLASSES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-4121qate.js:78452", () => {
  CHARACTER_CLASSES = {
    escape: String.raw`\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f`,
    placeholder: String.raw`\u{10eeee}`,
    itermPlaceholder: String.raw`\u2800`,
    loneSurrogate: String.raw`\ud800-\udfff`,
    kittyDiacritic: COMBINING_MARK_CODES.map((code) => `\\u{${code.toString(16)}}`).join(""),
  };
});
//@ chunk-4121qate.js:78690-78859 placement
var LINE_SCRUB; // deferred: uses CHARACTER_CLASSES of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4121qate.js:78690", () => {
  LINE_SCRUB = new RegExp(
    `^[${CHARACTER_CLASSES.kittyDiacritic}]+|${CHARACTER_CLASSES.itermPlaceholder}[${CHARACTER_CLASSES.kittyDiacritic}]+|[${String.raw`\t\n\r`}${CHARACTER_CLASSES.escape}${CHARACTER_CLASSES.loneSurrogate}${CHARACTER_CLASSES.placeholder}]`,
    "gu",
  );
});
//@ chunk-4121qate.js:78859-78912 placement
var regExp; // deferred: uses CHARACTER_CLASSES of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4121qate.js:78859", () => {
  regExp = new RegExp(`^[\\s${CHARACTER_CLASSES.kittyDiacritic}]+`, "u");
});
//@ chunk-4121qate.js:78912-79046 placement
/**
 * 取首行、清除控制/特殊字符、截到 120 字符（加省略号），用于日志与提示。
 */
function scrubLine(shape) {
  let line = (shape.split(/\r?\n/u)[0] ?? "").replace(LINE_SCRUB, " ").replace(regExp, "").trimEnd();
  return line.length <= MAX_SCRUB_CHARS
    ? line
    : truncateToLength(line, MAX_SCRUB_CHARS - TRUNCATION_SUFFIX.length) + TRUNCATION_SUFFIX;
}
//@ chunk-4121qate.js:133340-133409 placement
/**
 * 是否为固定属性
 */
var isPinnedProp = (prop, passed, received) =>
  Object.hasOwn(received, prop)
    ? checkPinnedKeys([prop], passed, received) === undefined
    : passed[prop] === undefined;
//@ chunk-4121qate.js:133409-133529 placement
/**
 * 找出第一个变化的属性并返回其问题说明。
 */
function findChangedProp(passed, received, explain) {
  for (let key of Object.keys(passed)) {
    let problem =
      passed[key] !== received[key] && !isPinnedProp(key, passed, received) ? explain(key) : undefined;
    if (problem !== undefined) return problem;
  }
  return;
}
//@ chunk-4121qate.js:133529-133642 placement
function characterCount(text, pattern) {
  if (!pattern.test(text)) return 0;
  let count = 0;
  for (let match of text.matchAll(new RegExp(pattern.source, "gu"))) count++;
  return count;
}
//@ chunk-4121qate.js:133642-133843 placement
/**
 * 递归收集值中的所有字符串（对象的键也计入）。
 */
function collectStrings(value) {
  switch (typeof value) {
    case "string":
      return [value];
    case "object":
      if (value === null) return [];
      return Array.isArray(value)
        ? denseListCopy(value).flatMap(collectStrings)
        : Object.entries(value).flatMap(([key, value]) => [key, ...collectStrings(value)]);
    default:
      return [];
  }
}
//@ chunk-4121qate.js:133843-133892 placement
/**
 * 字符串总字符数
 */
var stringsCharCount = (value, pattern) =>
  collectStrings(value).reduce((acc, text) => acc + characterCount(text, pattern), 0);
//@ chunk-4121qate.js:133892-133933 placement = matchesKeystroke (0.73)
var ESCAPE_CHARACTER; // deferred: uses CHARACTER_CLASSES of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4121qate.js:133892", () => {
  ESCAPE_CHARACTER = new RegExp(`[${CHARACTER_CLASSES.escape}]`, "u");
});
//@ chunk-4121qate.js:133933-134148 placement
var ITERM_CELL; // deferred: uses CHARACTER_CLASSES of its import cycle while loading; runs once the cycle is complete
var SPREAD_CELL;
var OPENING_MARK;
deferInit("chunk-4121qate.js:133933", () => {
  ITERM_CELL = new RegExp(`${CHARACTER_CLASSES.itermPlaceholder}[${CHARACTER_CLASSES.kittyDiacritic}]`, "u");
  SPREAD_CELL = new RegExp(
    `^[^${CHARACTER_CLASSES.itermPlaceholder}]*${CHARACTER_CLASSES.itermPlaceholder}[^]*[${CHARACTER_CLASSES.kittyDiacritic}]`,
    "u",
  );
  OPENING_MARK = new RegExp(`^[${CHARACTER_CLASSES.kittyDiacritic}]`, "u");
});
//@ chunk-4121qate.js:134148-134196 placement
var LONE_SURROGATE; // deferred: uses CHARACTER_CLASSES of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4121qate.js:134148", () => {
  LONE_SURROGATE = new RegExp(`[${CHARACTER_CLASSES.loneSurrogate}]`, "u");
});
//@ chunk-4121qate.js:134196-134242 placement
var PLACEHOLDER_CHARACTER; // deferred: uses CHARACTER_CLASSES of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4121qate.js:134196", () => {
  PLACEHOLDER_CHARACTER = new RegExp(`[${CHARACTER_CLASSES.placeholder}]`, "u");
});
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
