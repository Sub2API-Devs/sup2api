/**
 * utils/swarm/teammateIds.ts
 *
 * 队友 id（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qg0af0yq.js (11)
 * attribution: placement 11
 */
import { truncateToLength } from "../stringUtils.js";

//@ chunk-qg0af0yq.js:17811-17888 placement
var TEAMMATE_LABEL_INVALID_RUN_RE = /[^\p{L}\p{N}._-]+/gu;
var TEAMMATE_LABEL_EDGE_CHARS_RE = /^[._-]+|[._-]+$/gu;
var TEAMMATE_LABEL_ALNUM_RE = /[\p{L}\p{N}]/u;
var DEFAULT_TEAMMATE_LABEL_CHARS = 20;
//@ chunk-qg0af0yq.js:17888-17986 placement
/**
 * 去不可见字符后截到 64 字符的队友文本。
 */
function clipTeammateText(text) {
  let trimmed = stripFormatCharsTight(text).trim();
  let chars = [...trimmed];
  return chars.length > 64 ? `${chars.slice(0, 64).join("")}\u2026` : trimmed;
}
//@ chunk-qg0af0yq.js:17986-18059 placement
function stripFormatCharsTight(text) {
  return text.replace(/[\p{Cf}\p{Cc}\p{Cs}\p{Zl}\p{Zp}]/gu, "");
}
//@ chunk-qg0af0yq.js:18059-18189 placement
function sanitizeTeammateLabel(text, maxLength = DEFAULT_TEAMMATE_LABEL_CHARS) {
  let replaced = clipTeammateText(text)
    .replace(TEAMMATE_LABEL_INVALID_RUN_RE, "-")
    .replace(TEAMMATE_LABEL_EDGE_CHARS_RE, "");
  if (!TEAMMATE_LABEL_ALNUM_RE.test(replaced)) return "";
  let truncated = truncateToLength(replaced, maxLength);
  return truncated === replaced ? replaced : `${truncated}\u2026`;
}
//@ chunk-qg0af0yq.js:18189-18209 placement
/**
 * 地址文本上限（512），两倍用于预览。
 */
var MAX_ADDRESS_TEXT_CHARS = 512;
var MAX_DESCRIBED_PREVIEW_CHARS = 4 * MAX_ADDRESS_TEXT_CHARS;
//@ chunk-qg0af0yq.js:18209-18480 placement
function firstMeaningfulLine(text, maxLines) {
  let start = 0;
  while (start <= text.length) {
    let index = text.indexOf(
      `
`,
      start,
    );
    let lineEnd = index === -1 ? text.length : index;
    let isWholeLine = lineEnd - start <= MAX_DESCRIBED_PREVIEW_CHARS;
    let lineText = truncateToLength(
      text.slice(start, Math.min(lineEnd, start + MAX_DESCRIBED_PREVIEW_CHARS)),
      MAX_DESCRIBED_PREVIEW_CHARS,
    );
    let trimmed = maxLines(lineText).replace(/\s+/g, " ").trim();
    if (trimmed !== "" || !isWholeLine) {
      let lineText = truncateToLength(trimmed, MAX_ADDRESS_TEXT_CHARS);
      return !isWholeLine || lineText.length < trimmed.length ? `${lineText}\u2026` : lineText;
    }
    if (index === -1) break;
    start = index + 1;
  }
  return "";
}
//@ chunk-qg0af0yq.js:18480-18582 placement
function sanitizeAddressPart(fromPlugin) {
  if (typeof fromPlugin !== "string") return;
  let pluginName = clipTeammateText(fromPlugin.replace(/["<>]/g, ""));
  return pluginName === "" ? undefined : pluginName;
}
//@ chunk-qg0af0yq.js:18582-18593 placement
/**
 * 派生名最大长度（200）。
 */
var MAX_SEED_NAME_CHARS = 200;
//@ chunk-qg0af0yq.js:18593-18628 placement
/**
 * 拼出 `名字@团队` 的队友地址。
 */
function agentAddress(name, teamName) {
  return `${name}@${teamName}`;
}
//@ chunk-qg0af0yq.js:18628-18708 placement
/**
 * 百分号编码地址段里的非 ASCII 字符。
 */
function encodeAddressSegment(segment) {
  return segment.replace(/%|[^\x20-\x7e]/gu, (char) => encodeURIComponent(char));
}
//@ chunk-qg0af0yq.js:18708-18766 placement
/**
 * 生成带时间戳的队友地址。
 */
function timestampedAgentAddress(name, teamName) {
  let now = Date.now();
  return `${name}-${now}@${teamName}`;
}
export {
  sanitizeTeammateLabel,
  sanitizeAddressPart,
  clipTeammateText,
  MAX_SEED_NAME_CHARS,
  agentAddress,
  MAX_ADDRESS_TEXT_CHARS,
  timestampedAgentAddress,
  firstMeaningfulLine,
  encodeAddressSegment,
};
