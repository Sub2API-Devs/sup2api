/**
 * utils/ultraplan/keyword.ts
 *
 * 已有模块；g2 补充 ultrathink/ultracode 关键词
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/ultraplan/keyword.ts
 * pieces: chunk-18hwfzwa.js (1), chunk-s61vbvea.js (8)
 * attribution: fingerprint 3, affinity 1, placement 5
 */
import { buildLaunchMessage } from "../../commands/ultraplan.js";
import { LIGHTNING } from "../../constants/figures.js";

//@ chunk-s61vbvea.js:32765-32830 fingerprint (2.1.88 match: OPEN_TO_CLOSE, 1)
var OPEN_TO_CLOSE = {
  "`": "`",
  '"': '"',
  "<": ">",
  "{": "}",
  "[": "]",
  "(": ")",
  "'": "'",
};
//@ chunk-s61vbvea.js:32830-33608 affinity (2.1.88 match: findBtwTriggerPositions, 1)
function findBtwTriggerPositions(text, keyword) {
  if (!new RegExp(keyword, "i").test(text)) return [];
  if (text.startsWith("/")) return [];
  let codeSpans = [];
  let openChar = null;
  let spanStart = 0;
  let isWordChar = (char) => !!char && /[\p{L}\p{N}_]/u.test(char);
  for (let idx = 0; idx < text.length; idx++) {
    let char = text[idx];
    if (openChar) {
      if (openChar === "[" && char === "[") {
        spanStart = idx;
        continue;
      }
      if (char !== OPEN_TO_CLOSE[openChar]) continue;
      if (openChar === "'" && isWordChar(text[idx + 1])) continue;
      codeSpans.push({
        start: spanStart,
        end: idx + 1,
      });
      openChar = null;
    } else if (
      (char === "<" && idx + 1 < text.length && /[a-zA-Z/]/.test(text[idx + 1])) ||
      (char === "'" && !isWordChar(text[idx - 1])) ||
      (char !== "<" && char !== "'" && char in OPEN_TO_CLOSE)
    ) {
      openChar = char;
      spanStart = idx;
    }
  }
  let hits = [];
  let regExp = new RegExp(`\\b${keyword}\\b`, "gi");
  let matches = text.matchAll(regExp);
  for (let match of matches) {
    if (match.index === undefined) continue;
    let index = match.index;
    let wordEnd = index + match[0].length;
    if (codeSpans.some((span) => index >= span.start && index < span.end)) continue;
    let before = text[index - 1];
    let after = text[wordEnd];
    if (before === "/" || before === "\\" || before === "-") continue;
    if (after === "/" || after === "\\" || after === "-" || after === "?") continue;
    if (after === "." && isWordChar(text[wordEnd + 1])) continue;
    hits.push({
      word: match[0],
      start: index,
      end: wordEnd,
    });
  }
  return hits;
}
//@ chunk-s61vbvea.js:33648-33691 fingerprint (2.1.88 match: findUltrareviewTriggerPositions, 1)
/**
 * 查找文本中 ultrareview 关键词的触发位置。
 */
function findUltrareviewTriggerPositions(text) {
  return findBtwTriggerPositions(text, "ultrareview");
}
//@ chunk-s61vbvea.js:33691-33733 placement
function ULTRATHINK_KEYWORD(text) {
  return findBtwTriggerPositions(text, "ultrathink");
}
//@ chunk-s61vbvea.js:33733-33774 placement
function ULTRACODE_KEYWORD(text) {
  return findBtwTriggerPositions(text, "ultracode");
}
//@ chunk-s61vbvea.js:33774-33813 placement
function hasUltraplanKeyword(text) {
  return ULTRACODE_KEYWORD(text).length > 0;
}
//@ chunk-s61vbvea.js:33813-33891 placement
/**
 * 给 ultra 关键词加连字符（ultra-code 等）。
 */
function hyphenateUltraKeyword(text) {
  return text.replace(/(ultra)(code|plan|review|think)/gi, "$1-$2");
}
//@ chunk-s61vbvea.js:33891-34066 placement
function findKeywordTriggerPositions(text) {
  let [trigger] = buildLaunchMessage(text);
  if (!trigger) return text;
  let before = text.slice(0, trigger.start);
  let after = text.slice(trigger.end);
  if (!(before + after).trim()) return "";
  before = before.replace(/\b(a)n(\s+)$/i, "$1$2");
  return before + trigger.word.slice(5) + after;
}
//@ chunk-18hwfzwa.js:1442557-1442667 fingerprint (2.1.88 match: replaceUltraplanKeyword, 0.557)
/**
 * 拼出模型/effort/ultra/fast 标签列表。
 */
function getModelBadgeParts(modelInfo) {
  return [
    modelInfo.model,
    modelInfo.effort,
    modelInfo.ultra ? "ultra" : undefined,
    modelInfo.fastMode ? LIGHTNING : undefined,
  ].filter((part) => part !== undefined);
}
export {
  ULTRATHINK_KEYWORD,
  findUltrareviewTriggerPositions,
  ULTRACODE_KEYWORD,
  getModelBadgeParts,
  findKeywordTriggerPositions,
  hyphenateUltraKeyword,
  findBtwTriggerPositions,
  hasUltraplanKeyword,
};
