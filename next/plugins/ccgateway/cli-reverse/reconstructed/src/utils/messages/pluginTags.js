/**
 * utils/messages/pluginTags.ts
 *
 * 2.1.316 新增。消息中的插件标签。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8dmq20r8.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { CROSS_SESSION_MESSAGE } from "../../constants/xml.js";
import { RELAY_SOURCE_KINDS_2 } from "../../services/projectsRelay/relayConfig.js";
import { peerTagOpenerOffsets, neutralizePeerTags } from "../sessionPeers.js";
import { codePointLength } from "../confusables.js";
import { regExp_2 } from "../peerMessageHeaders.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-8dmq20r8.js:379-518 placement
var regExp; // deferred: uses AGENT_NOTIFICATION_PREFIX (../../constants/xml.js) of its import cycle while loading; runs once the cycle is complete
var CROSS_SESSION_CLOSE_TAG;
var PLUGIN_TAG_JOINERS;
var FROM_PLUGIN_ATTR_RE;
var FROM_PLUGIN_RE;
deferInit("chunk-8dmq20r8.js:379", () => {
  regExp = new RegExp(`^<${CROSS_SESSION_MESSAGE}[ \\t>]`);
  CROSS_SESSION_CLOSE_TAG = `</${CROSS_SESSION_MESSAGE}>`;
  PLUGIN_TAG_JOINERS = [
    "",
    `
`,
  ];
  FROM_PLUGIN_ATTR_RE = /\sfrom-plugin\s*(?:=\s*(?:"[^"<>]*"|'[^'<>]*'|[^\s>]*))?/gi;
  FROM_PLUGIN_RE = /from-plugin/i;
});
//@ chunk-8dmq20r8.js:518-1068 placement
/**
 * 转义消息文本里可能被误认为插件/系统标签的尖括号：字符串直接处理；内容块数组时把相邻文本块拼接后查找位置，再在原块中插入转义（"<\\"）。
 */
function escapePluginTags(content, sourceKind) {
  if (typeof content === "string") return escapeTagString(content, sourceKind === RELAY_SOURCE_KINDS_2);
  if (!Array.isArray(content)) return content;
  let blocks = content;
  for (let joiner of PLUGIN_TAG_JOINERS) {
    let offsets = [];
    let textIndexes = [];
    let joined = "";
    blocks.forEach((block, blockIndex) => {
      if (block.type === "text") {
        if (textIndexes.length > 0) joined += joiner;
        offsets.push(joined.length);
        textIndexes.push(blockIndex);
        joined += block.text;
      }
    });
    let hits = peerTagOpenerOffsets(joined);
    if (hits.length === 0) continue;
    let updated = blocks.slice();
    let hitIndex = 0;
    textIndexes.forEach((textIndex, textBlockIndex) => {
      let block = updated[textIndex];
      let start = offsets[textBlockIndex];
      let nextStart = offsets[textBlockIndex + 1] ?? 1 / 0;
      if (block.type !== "text") return;
      let parts = [];
      let cursor = 0;
      for (; hitIndex < hits.length && hits[hitIndex] < nextStart; hitIndex++) {
        let cut = hits[hitIndex] - start;
        parts.push(block.text.slice(cursor, cut), "<\\");
        cursor = cut + codePointLength(block.text, cut);
      }
      if (parts.length > 0) {
        parts.push(block.text.slice(cursor));
        updated[textIndex] = {
          ...block,
          text: parts.join(""),
        };
      }
    });
    blocks = updated;
  }
  return blocks;
}
//@ chunk-8dmq20r8.js:1068-1099 placement
/**
 * 严格模式转义跨会话标签字符串。
 */
function escapeTagStringStrict(text) {
  return escapeTagString(text, true);
}
//@ chunk-8dmq20r8.js:1099-1300 placement
function escapeTagString(text, fromRelay) {
  let trimmed = text.trimEnd();
  let tagStart = trimmed.length - CROSS_SESSION_CLOSE_TAG.length;
  let matches = regExp_2.test(text);
  if (!(
    tagStart > 0 &&
    trimmed.endsWith(CROSS_SESSION_CLOSE_TAG) &&
    (matches || (fromRelay && regExp.test(text)))
  ))
    return neutralizePeerTags(text);
  let inner = stripPluginTagPrefix(text.slice(1, tagStart));
  return FROM_PLUGIN_RE.test(openTagText(inner))
    ? neutralizePeerTags(text)
    : `<${neutralizePeerTags(inner)}${text.slice(tagStart)}`;
}
//@ chunk-8dmq20r8.js:1300-1366 placement
function stripPluginTagPrefix(inner) {
  let tagText = openTagText(inner);
  return tagText.replace(FROM_PLUGIN_ATTR_RE, "") + inner.slice(tagText.length);
}
//@ chunk-8dmq20r8.js:1366-1427 placement
function openTagText(inner) {
  let index = inner.indexOf(">");
  return index < 0 ? inner : inner.slice(0, index);
}
export { escapePluginTags, escapeTagStringStrict };
