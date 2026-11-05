/**
 * utils/pastedContent.ts
 *
 * 粘贴内容标签（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-dahajswd.js (13)
 * attribution: placement 13
 */
//@ chunk-dahajswd.js:191-287 placement
/**
 * 粘贴内容标签名与 id 长度、前后标签前缀与行尾格式。
 */
var PASTED_CONTENT_TAG = "pasted_content";
var PASTE_ID_LENGTH = 4;
var PASTED_CONTENT_OPEN_PREFIX = '<pasted_content id="';
var PASTED_CONTENT_LINE_END = `">
`;
var PASTED_CONTENT_CLOSE_PREFIX = '</pasted_content id="';
//@ chunk-dahajswd.js:287-339 placement
/**
 * 生成粘贴内容的开始标签。
 */
function pastedContentOpenTag(pasteId) {
  return `<pasted_content id="${pasteId}">
`;
}
//@ chunk-dahajswd.js:339-392 placement
/**
 * 生成粘贴内容的结束标签。
 */
function pastedContentCloseTag(pasteId) {
  return `</pasted_content id="${pasteId}">
`;
}
//@ chunk-dahajswd.js:392-535 placement
/**
 * 是否为 4 位小写十六进制。
 */
function isPasteIdHex(candidate) {
  if (candidate.length !== 4) return false;
  for (let i = 0; i < candidate.length; i++) {
    let code = candidate.charCodeAt(i);
    if (!((code >= 48 && code <= 57) || (code >= 97 && code <= 102))) return false;
  }
  return true;
}
//@ chunk-dahajswd.js:535-576 placement
/**
 * 开/闭标点字符正则。
 */
var OPENING_PUNCT_RE = /[([{"'`]/;
var CLOSING_PUNCT_RE = /[)\]}"'`.,;:!?]/;
//@ chunk-dahajswd.js:576-674 placement
/**
 * 判断标点后是否接了词（后有空白或到末尾）。
 */
function hasWordAfterPunct(text, start = 0, end = text.length) {
  let index = start;
  while (index < end && CLOSING_PUNCT_RE.test(text[index])) index++;
  return index >= end || /\s/.test(text[index]);
}
//@ chunk-dahajswd.js:674-1204 placement
/**
 * （切分错误）把文本拆成普通文本段和 <pasted_content id="xxxx"> 块。
 */
function splitPastedContentBlocks(text) {
  let segments = [];
  let cursor = 0;
  let searchFrom = 0;
  for (;;) {
    let index = text.indexOf('<pasted_content id="', searchFrom);
    if (index === -1) break;
    let idStart = index + 20;
    let sliced = text.slice(idStart, idStart + 4);
    if (
      !isPasteIdHex(sliced) ||
      !text.startsWith(
        `">
`,
        idStart + 4,
      )
    ) {
      searchFrom = idStart;
      continue;
    }
    let bodyStart = idStart + 4 + 3;
    let sliced_2 = pastedContentCloseTag(sliced).slice(0, -1);
    let bodyEnd =
      text.indexOf(
        `
${sliced_2}`,
        bodyStart - 1,
      ) + 1;
    if (bodyEnd === 0) break;
    let blockStart = index;
    for (
      let j = 0;
      j < 2 &&
      blockStart > cursor &&
      text[blockStart - 1] ===
        `
`;
      j++
    )
      blockStart--;
    if (blockStart > cursor)
      segments.push({
        kind: "text",
        text: text.slice(cursor, blockStart),
      });
    cursor = bodyEnd + sliced_2.length;
    for (
      let j = 0;
      j < 2 &&
      text[cursor] ===
        `
`;
      j++
    )
      cursor++;
    segments.push({
      kind: "block",
      id: sliced,
      body: text.slice(bodyStart, bodyEnd - 1),
      raw: text.slice(blockStart, cursor),
    });
    searchFrom = cursor;
  }
  if (cursor < text.length)
    segments.push({
      kind: "text",
      text: text.slice(cursor),
    });
  return segments;
}
//@ chunk-dahajswd.js:1204-1343 placement
/**
 * （切分错误）去掉 pasted_content 包装，只保留块正文。
 */
function unwrapPastedContentBlocks(text) {
  let segments = splitPastedContentBlocks(text);
  if (!segments.some((segment) => segment.kind === "block")) return text;
  return segments
    .map((segment) => (segment.kind === "text" ? segment.text : segment.body))
    .join(
      `

`,
    )
    .trim();
}
//@ chunk-dahajswd.js:1343-1475 placement
/**
 * 展开粘贴内容块为原文。
 */
function flattenPastedBlocks(text) {
  let segments = splitPastedContentBlocks(text);
  if (segments.length === 1 && segments[0].kind === "text") return text;
  return segments.map((segment) => (segment.kind === "text" ? segment.text : segment.body)).join("");
}
//@ chunk-dahajswd.js:1475-2076 placement
function expandPastedContent(text, pasteId) {
  let segments = splitPastedContentBlocks(text);
  if (!segments.some((segment) => segment.kind === "block" && segment.id === pasteId)) return text;
  let result = "";
  let endsWithNewline = false;
  for (let [index, segment] of segments.entries()) {
    let nextSegment = segments[index + 1];
    let nextIsSameBlock = nextSegment?.kind === "block" && nextSegment.id === pasteId;
    if (segment.kind === "text" || segment.id !== pasteId) {
      let piece = segment.kind === "text" ? segment.text : segment.raw;
      if (endsWithNewline) piece = piece.replace(/^\s+/, "");
      if (
        nextIsSameBlock &&
        nextSegment.body.includes(`
`)
      )
        piece = piece.replace(/\s+$/, "");
      if (piece === "") continue;
      if (endsWithNewline && result !== "")
        result += `
`;
      result += piece;
      endsWithNewline = false;
      continue;
    }
    let included = segment.body.includes(`
`);
    let punctStart = result.length;
    while (punctStart > 0 && OPENING_PUNCT_RE.test(result[punctStart - 1])) punctStart--;
    let isWordBoundary = punctStart === 0 || /\s/.test(result[punctStart - 1]);
    if ((included || endsWithNewline || !isWordBoundary) && result !== "")
      result += `
`;
    result += segment.body;
    let nextMiddle =
      nextSegment === undefined ? "" : nextSegment.kind === "text" ? nextSegment.text : nextSegment.raw;
    endsWithNewline =
      included || nextIsSameBlock || /^\s\s/.test(nextMiddle) || !hasWordAfterPunct(nextMiddle);
  }
  return result;
}
//@ chunk-dahajswd.js:2076-2165 placement
/**
 * 31 位字符串哈希（Java String.hashCode 形式）。
 */
function hashString31(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  return hash;
}
//@ chunk-dahajswd.js:2165-2210 placement
/**
 * 用 Bun.hash 计算单个值的字符串哈希。
 */
function bunHashOf(text) {
  return Bun.hash(text).toString();
}
//@ chunk-dahajswd.js:2210-2270 placement
/**
 * 用 Bun.hash 计算两个值的组合哈希。
 */
function bunHashPair(first, second) {
  return Bun.hash(second, Bun.hash(first)).toString();
}
export {
  flattenPastedBlocks,
  splitPastedContentBlocks,
  hasWordAfterPunct,
  hashString31,
  bunHashPair,
  bunHashOf,
  PASTE_ID_LENGTH,
  PASTED_CONTENT_TAG,
  pastedContentOpenTag,
  pastedContentCloseTag,
  unwrapPastedContentBlocks,
  OPENING_PUNCT_RE,
  CLOSING_PUNCT_RE,
  PASTED_CONTENT_OPEN_PREFIX,
  PASTED_CONTENT_CLOSE_PREFIX,
  isPasteIdHex,
  PASTED_CONTENT_LINE_END,
  expandPastedContent,
};
