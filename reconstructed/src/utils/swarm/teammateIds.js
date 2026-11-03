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
function clipTeammateText(e) {
  let trimmed = stripFormatCharsTight(e).trim();
  let t = [...trimmed];
  return t.length > 64 ? `${t.slice(0, 64).join("")}\u2026` : trimmed;
}
//@ chunk-qg0af0yq.js:17986-18059 placement
function stripFormatCharsTight(e) {
  return e.replace(/[\p{Cf}\p{Cc}\p{Cs}\p{Zl}\p{Zp}]/gu, "");
}
//@ chunk-qg0af0yq.js:18059-18189 placement
function sanitizeTeammateLabel(e, n = DEFAULT_TEAMMATE_LABEL_CHARS) {
  let replaced = clipTeammateText(e)
    .replace(TEAMMATE_LABEL_INVALID_RUN_RE, "-")
    .replace(TEAMMATE_LABEL_EDGE_CHARS_RE, "");
  if (!TEAMMATE_LABEL_ALNUM_RE.test(replaced)) return "";
  let r = truncateToLength(replaced, n);
  return r === replaced ? replaced : `${r}\u2026`;
}
//@ chunk-qg0af0yq.js:18189-18209 placement
/**
 * 地址文本上限（512），两倍用于预览。
 */
var MAX_ADDRESS_TEXT_CHARS = 512;
var MAX_DESCRIBED_PREVIEW_CHARS = 4 * MAX_ADDRESS_TEXT_CHARS;
//@ chunk-qg0af0yq.js:18209-18480 placement
function firstMeaningfulLine(e, n) {
  let t = 0;
  while (t <= e.length) {
    let index = e.indexOf(
      `
`,
      t,
    );
    let i = index === -1 ? e.length : index;
    let s = i - t <= MAX_DESCRIBED_PREVIEW_CHARS;
    let o = truncateToLength(
      e.slice(t, Math.min(i, t + MAX_DESCRIBED_PREVIEW_CHARS)),
      MAX_DESCRIBED_PREVIEW_CHARS,
    );
    let trimmed = n(o).replace(/\s+/g, " ").trim();
    if (trimmed !== "" || !s) {
      let l = truncateToLength(trimmed, MAX_ADDRESS_TEXT_CHARS);
      return !s || l.length < trimmed.length ? `${l}\u2026` : l;
    }
    if (index === -1) break;
    t = index + 1;
  }
  return "";
}
//@ chunk-qg0af0yq.js:18480-18582 placement
function sanitizeAddressPart(fromPlugin) {
  if (typeof fromPlugin !== "string") return;
  let n = clipTeammateText(fromPlugin.replace(/["<>]/g, ""));
  return n === "" ? undefined : n;
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
function agentAddress(e, teamName) {
  return `${e}@${teamName}`;
}
//@ chunk-qg0af0yq.js:18628-18708 placement
/**
 * 百分号编码地址段里的非 ASCII 字符。
 */
function encodeAddressSegment(e) {
  return e.replace(/%|[^\x20-\x7e]/gu, (n) => encodeURIComponent(n));
}
//@ chunk-qg0af0yq.js:18708-18766 placement
/**
 * 生成带时间戳的队友地址。
 */
function timestampedAgentAddress(e, n) {
  let now = Date.now();
  return `${e}-${now}@${n}`;
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
