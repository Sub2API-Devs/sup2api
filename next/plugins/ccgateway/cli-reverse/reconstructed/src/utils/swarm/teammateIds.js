/**
 * utils/swarm/teammateIds.ts
 *
 * 队友 id（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-gb7aq6sf.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { truncateToLength } from "../stringUtils.js";
import { beginDeferredInits } from "../../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 3771 modules closed by ../hooks/functionHookMatchers.js (in the hooks worker thread);
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("worker:src/utils/hooks/functionHookMatchers.js");
//@ chunk-gb7aq6sf.js:17839-17916 placement
var TEAMMATE_LABEL_INVALID_RUN_RE = /[^\p{L}\p{N}._-]+/gu;
var TEAMMATE_LABEL_EDGE_CHARS_RE = /^[._-]+|[._-]+$/gu;
var TEAMMATE_LABEL_ALNUM_RE = /[\p{L}\p{N}]/u;
var DEFAULT_TEAMMATE_LABEL_CHARS = 20;
//@ chunk-gb7aq6sf.js:17916-18014 placement
/**
 * 去不可见字符后截到 64 字符的队友文本。
 */
function clipTeammateText(text) {
  let trimmed = stripFormatCharsTight(text).trim();
  let chars = [...trimmed];
  return chars.length > 64 ? `${chars.slice(0, 64).join("")}\u2026` : trimmed;
}
//@ chunk-gb7aq6sf.js:18014-18087 placement
function stripFormatCharsTight(text) {
  return text.replace(/[\p{Cf}\p{Cc}\p{Cs}\p{Zl}\p{Zp}]/gu, "");
}
//@ chunk-gb7aq6sf.js:18087-18216 placement
function sanitizeTeammateLabel(text, maxLength = DEFAULT_TEAMMATE_LABEL_CHARS) {
  let replaced = clipTeammateText(text)
    .replace(TEAMMATE_LABEL_INVALID_RUN_RE, "-")
    .replace(TEAMMATE_LABEL_EDGE_CHARS_RE, "");
  if (!TEAMMATE_LABEL_ALNUM_RE.test(replaced)) return "";
  let truncated = truncateToLength(replaced, maxLength);
  return truncated === replaced ? replaced : `${truncated}\u2026`;
}
//@ chunk-gb7aq6sf.js:18216-18236 placement
/**
 * 地址文本上限（512），两倍用于预览。
 */
var MAX_ADDRESS_TEXT_CHARS = 512;
var MAX_DESCRIBED_PREVIEW_CHARS = 4 * MAX_ADDRESS_TEXT_CHARS;
//@ chunk-gb7aq6sf.js:18236-18505 placement
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
//@ chunk-gb7aq6sf.js:18505-18607 placement
function sanitizeAddressPart(fromPlugin) {
  if (typeof fromPlugin !== "string") return;
  let pluginName = clipTeammateText(fromPlugin.replace(/["<>]/g, ""));
  return pluginName === "" ? undefined : pluginName;
}
//@ chunk-gb7aq6sf.js:18607-18618 placement
/**
 * 派生名最大长度（200）。
 */
var MAX_SEED_NAME_CHARS = 200;
//@ chunk-gb7aq6sf.js:18618-18653 placement
/**
 * 拼出 `名字@团队` 的队友地址。
 */
function agentAddress(name, teamName) {
  return `${name}@${teamName}`;
}
//@ chunk-gb7aq6sf.js:18653-18733 placement
/**
 * 百分号编码地址段里的非 ASCII 字符。
 */
function encodeAddressSegment(segment) {
  return segment.replace(/%|[^\x20-\x7e]/gu, (char) => encodeURIComponent(char));
}
//@ chunk-gb7aq6sf.js:18733-18791 placement
/**
 * 生成带时间戳的队友地址。
 */
function timestampedAgentAddress(name, teamName) {
  let now = Date.now();
  return `${name}-${now}@${teamName}`;
}
export {
  clipTeammateText,
  sanitizeAddressPart,
  agentAddress,
  MAX_SEED_NAME_CHARS,
  timestampedAgentAddress,
  encodeAddressSegment,
  sanitizeTeammateLabel,
  MAX_ADDRESS_TEXT_CHARS,
  firstMeaningfulLine,
};
