/**
 * utils/ultraplan/keyword.ts
 *
 * 已有模块；g2 补充 ultrathink/ultracode 关键词
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/ultraplan/keyword.ts
 * pieces: chunk-7jxyna5q.js (7), chunk-czq1j3j2.js (1)
 * attribution: fingerprint 3, placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { findBtwTriggerPositions_2 } from "../sideQuestion.js";
import { buildLaunchMessage } from "../../commands/ultraplan.js";
import { LIGHTNING } from "../../constants/figures.js";

//@ chunk-7jxyna5q.js:33363-33428 fingerprint (2.1.88 match: OPEN_TO_CLOSE, 1)
var OPEN_TO_CLOSE = {
  "`": "`",
  '"': '"',
  "<": ">",
  "{": "}",
  "[": "]",
  "(": ")",
  "'": "'",
};
//@ chunk-7jxyna5q.js:34246-34289 fingerprint (2.1.88 match: findUltrareviewTriggerPositions, 1)
/**
 * 查找文本中 ultrareview 关键词的触发位置。
 */
function findUltrareviewTriggerPositions(text) {
  return findBtwTriggerPositions_2(text, "ultrareview");
}
//@ chunk-7jxyna5q.js:34289-34331 placement
function ULTRATHINK_KEYWORD(text) {
  return findBtwTriggerPositions_2(text, "ultrathink");
}
//@ chunk-7jxyna5q.js:34331-34372 placement
function ULTRACODE_KEYWORD(text) {
  return findBtwTriggerPositions_2(text, "ultracode");
}
//@ chunk-7jxyna5q.js:34372-34411 placement
function hasUltraplanKeyword(text) {
  return ULTRACODE_KEYWORD(text).length > 0;
}
//@ chunk-7jxyna5q.js:34411-34489 placement
/**
 * 给 ultra 关键词加连字符（ultra-code 等）。
 */
function hyphenateUltraKeyword(text) {
  return text.replace(/(ultra)(code|plan|review|think)/gi, "$1-$2");
}
//@ chunk-7jxyna5q.js:34489-34664 placement
function findKeywordTriggerPositions(text) {
  let [trigger] = buildLaunchMessage(text);
  if (!trigger) return text;
  let before = text.slice(0, trigger.start);
  let after = text.slice(trigger.end);
  if (!(before + after).trim()) return "";
  before = before.replace(/\b(a)n(\s+)$/i, "$1$2");
  return before + trigger.word.slice(5) + after;
}
//@ chunk-czq1j3j2.js:1482786-1482896 fingerprint (2.1.88 match: replaceUltraplanKeyword, 0.558)
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
  hasUltraplanKeyword,
  hyphenateUltraKeyword,
  findKeywordTriggerPositions,
  ULTRATHINK_KEYWORD,
  OPEN_TO_CLOSE,
  findUltrareviewTriggerPositions,
  ULTRACODE_KEYWORD,
  getModelBadgeParts,
};
