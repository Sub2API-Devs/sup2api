/**
 * utils/messages/pluginTags.ts
 *
 * 2.1.316 新增。消息中的插件标签。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8w665d4j.js (6)
 * attribution: placement 6
 */
import { CROSS_SESSION_MESSAGE } from "../../constants/xml.js";
import { RELAY_SOURCE_KINDS_2 } from "../../services/projectsRelay/relayConfig.js";
import { peerTagOpenerOffsets, neutralizePeerTags } from "../sessionPeers.js";
import { codePointLength } from "../confusables.js";
import { regExp_2 } from "../peerMessageHeaders.js";

//@ chunk-8w665d4j.js:379-518 placement
var regExp = new RegExp(`^<${CROSS_SESSION_MESSAGE}[ \\t>]`);
var CROSS_SESSION_CLOSE_TAG = `</${CROSS_SESSION_MESSAGE}>`;
var PLUGIN_TAG_JOINERS = [
  "",
  `
`,
];
var FROM_PLUGIN_ATTR_RE = /\sfrom-plugin\s*(?:=\s*(?:"[^"<>]*"|'[^'<>]*'|[^\s>]*))?/gi;
var FROM_PLUGIN_RE = /from-plugin/i;
//@ chunk-8w665d4j.js:518-1068 placement
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
    blocks.forEach((block, p) => {
      if (block.type === "text") {
        if (textIndexes.length > 0) joined += joiner;
        offsets.push(joined.length);
        textIndexes.push(p);
        joined += block.text;
      }
    });
    let hits = peerTagOpenerOffsets(joined);
    if (hits.length === 0) continue;
    let updated = blocks.slice();
    let hitIndex = 0;
    textIndexes.forEach((textIndex, p) => {
      let block = updated[textIndex];
      let start = offsets[p];
      let _ = offsets[p + 1] ?? 1 / 0;
      if (block.type !== "text") return;
      let parts = [];
      let cursor = 0;
      for (; hitIndex < hits.length && hits[hitIndex] < _; hitIndex++) {
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
//@ chunk-8w665d4j.js:1068-1099 placement
/**
 * 严格模式转义跨会话标签字符串。
 */
function escapeTagStringStrict(content) {
  return escapeTagString(content, true);
}
//@ chunk-8w665d4j.js:1099-1300 placement
function escapeTagString(e, n) {
  let t = e.trimEnd();
  let o = t.length - CROSS_SESSION_CLOSE_TAG.length;
  let matches = regExp_2.test(e);
  if (!(o > 0 && t.endsWith(CROSS_SESSION_CLOSE_TAG) && (matches || (n && regExp.test(e)))))
    return neutralizePeerTags(e);
  let r = stripPluginTagPrefix(e.slice(1, o));
  return FROM_PLUGIN_RE.test(openTagText(r))
    ? neutralizePeerTags(e)
    : `<${neutralizePeerTags(r)}${e.slice(o)}`;
}
//@ chunk-8w665d4j.js:1300-1366 placement
function stripPluginTagPrefix(e) {
  let tagText = openTagText(e);
  return tagText.replace(FROM_PLUGIN_ATTR_RE, "") + e.slice(tagText.length);
}
//@ chunk-8w665d4j.js:1366-1427 placement
function openTagText(e) {
  let index = e.indexOf(">");
  return index < 0 ? e : e.slice(0, index);
}
export { escapeTagStringStrict, escapePluginTags };
