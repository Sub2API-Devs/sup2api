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
import { RELAY_SOURCE_KINDS } from "../../services/projectsRelay/relayConfig.js";
import { $oo, iIt } from "../sessionPeers.js";
import { codePointLength } from "../confusables.js";
import { regExp_2 } from "../peerMessageHeaders.js";

//@ chunk-8w665d4j.js:379-518 placement
var regExp = new RegExp(`^<${CROSS_SESSION_MESSAGE}[ \\t>]`),
  S = `</${CROSS_SESSION_MESSAGE}>`,
  C = [
    "",
    `
`,
  ],
  I = /\sfrom-plugin\s*(?:=\s*(?:"[^"<>]*"|'[^'<>]*'|[^\s>]*))?/gi,
  A = /from-plugin/i;
/**
 * 转义消息文本里可能被误认为插件/系统标签的尖括号：字符串直接处理；内容块数组时把相邻文本块拼接后查找位置，再在原块中插入转义（"<\\"）。
 */
//@ chunk-8w665d4j.js:518-1068 placement
function escapePluginTags(content, sourceKind) {
  if (typeof content === "string") return escapeTagString(content, sourceKind === RELAY_SOURCE_KINDS);
  if (!Array.isArray(content)) return content;
  let blocks = content;
  for (let joiner of C) {
    let offsets = [],
      textIndexes = [],
      joined = "";
    blocks.forEach((i, p) => {
      if (i.type === "text") {
        if (textIndexes.length > 0) joined += joiner;
        (offsets.push(joined.length), textIndexes.push(p), (joined += i.text));
      }
    });
    let hits = $oo(joined);
    if (hits.length === 0) continue;
    let updated = blocks.slice(),
      hitIndex = 0;
    (textIndexes.forEach((i, p) => {
      let block = updated[i],
        start = offsets[p],
        _ = offsets[p + 1] ?? 1 / 0;
      if (block.type !== "text") return;
      let parts = [],
        cursor = 0;
      for (; hitIndex < hits.length && hits[hitIndex] < _; hitIndex++) {
        let cut = hits[hitIndex] - start;
        (parts.push(block.text.slice(cursor, cut), "<\\"), (cursor = cut + codePointLength(block.text, cut)));
      }
      if (parts.length > 0)
        (parts.push(block.text.slice(cursor)), (updated[i] = { ...block, text: parts.join("") }));
    }),
      (blocks = updated));
  }
  return blocks;
}
//@ chunk-8w665d4j.js:1068-1099 placement
function IKs(e) {
  return escapeTagString(e, !0);
}
//@ chunk-8w665d4j.js:1099-1300 placement
function escapeTagString(e, n) {
  let trimEnd = e.trimEnd(),
    o = trimEnd.length - S.length,
    matches = regExp_2.test(e);
  if (!(o > 0 && trimEnd.endsWith(S) && (matches || (n && regExp.test(e))))) return iIt(e);
  let r = B(e.slice(1, o));
  return A.test(O(r)) ? iIt(e) : `<${iIt(r)}${e.slice(o)}`;
}
//@ chunk-8w665d4j.js:1300-1366 placement
function B(e) {
  let n = O(e);
  return n.replace(I, "") + e.slice(n.length);
}
//@ chunk-8w665d4j.js:1366-1427 placement
function O(e) {
  let index = e.indexOf(">");
  return index < 0 ? e : e.slice(0, index);
}

export { IKs, escapePluginTags };
