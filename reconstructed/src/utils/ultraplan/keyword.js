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
import { LIGHTNING } from "../permissions/autoModeRulesPrompt.js";

//@ chunk-s61vbvea.js:32765-32830 fingerprint = OPEN_TO_CLOSE (1)
var OPEN_TO_CLOSE = { "`": "`", '"': '"', "<": ">", "{": "}", "[": "]", "(": ")", "'": "'" };
//@ chunk-s61vbvea.js:32830-33608 affinity = findBtwTriggerPositions (1)
function findBtwTriggerPositions(e, n) {
  if (!new RegExp(n, "i").test(e)) return [];
  if (e.startsWith("/")) return [];
  let s = [],
    h = null,
    y = 0,
    S = (P) => !!P && /[\p{L}\p{N}_]/u.test(P);
  for (let P = 0; P < e.length; P++) {
    let j = e[P];
    if (h) {
      if (h === "[" && j === "[") {
        y = P;
        continue;
      }
      if (j !== OPEN_TO_CLOSE[h]) continue;
      if (h === "'" && S(e[P + 1])) continue;
      (s.push({ start: y, end: P + 1 }), (h = null));
    } else if (
      (j === "<" && P + 1 < e.length && /[a-zA-Z/]/.test(e[P + 1])) ||
      (j === "'" && !S(e[P - 1])) ||
      (j !== "<" && j !== "'" && j in OPEN_TO_CLOSE)
    )
      ((h = j), (y = P));
  }
  let w = [],
    regExp = new RegExp(`\\b${n}\\b`, "gi"),
    matches = e.matchAll(regExp);
  for (let match of matches) {
    if (match.index === void 0) continue;
    let index = match.index,
      G = index + match[0].length;
    if (s.some((Q) => index >= Q.start && index < Q.end)) continue;
    let L = e[index - 1],
      q = e[G];
    if (L === "/" || L === "\\" || L === "-") continue;
    if (q === "/" || q === "\\" || q === "-" || q === "?") continue;
    if (q === "." && S(e[G + 1])) continue;
    w.push({ word: match[0], start: index, end: G });
  }
  return w;
}
/**
 * 查找文本中 ultrareview 关键词的触发位置。
 */
//@ chunk-s61vbvea.js:33648-33691 fingerprint = findUltrareviewTriggerPositions (1)
function findUltrareviewTriggerPositions(text) {
  return findBtwTriggerPositions(text, "ultrareview");
}
//@ chunk-s61vbvea.js:33691-33733 placement
function ULTRATHINK_KEYWORD(e) {
  return findBtwTriggerPositions(e, "ultrathink");
}
//@ chunk-s61vbvea.js:33733-33774 placement
function ULTRACODE_KEYWORD(e) {
  return findBtwTriggerPositions(e, "ultracode");
}
//@ chunk-s61vbvea.js:33774-33813 placement
function hasUltraplanKeyword(text) {
  return ULTRACODE_KEYWORD(text).length > 0;
}
//@ chunk-s61vbvea.js:33813-33891 placement
function wei(e) {
  return e.replace(/(ultra)(code|plan|review|think)/gi, "$1-$2");
}
//@ chunk-s61vbvea.js:33891-34066 placement
function findKeywordTriggerPositions(e) {
  let [n] = buildLaunchMessage(e);
  if (!n) return e;
  let sliced = e.slice(0, n.start),
    sliced_2 = e.slice(n.end);
  if (!(sliced + sliced_2).trim()) return "";
  return ((sliced = sliced.replace(/\b(a)n(\s+)$/i, "$1$2")), sliced + n.word.slice(5) + sliced_2);
}
/**
 * 拼出模型/effort/ultra/fast 标签列表。
 */
//@ chunk-18hwfzwa.js:1442557-1442667 fingerprint = replaceUltraplanKeyword (0.557)
function getModelBadgeParts(modelInfo) {
  return [
    modelInfo.model,
    modelInfo.effort,
    modelInfo.ultra ? "ultra" : void 0,
    modelInfo.fastMode ? LIGHTNING : void 0,
  ].filter((x) => x !== void 0);
}

export {
  ULTRATHINK_KEYWORD,
  findUltrareviewTriggerPositions,
  ULTRACODE_KEYWORD,
  getModelBadgeParts,
  findKeywordTriggerPositions,
  wei,
  findBtwTriggerPositions,
  hasUltraplanKeyword,
};
