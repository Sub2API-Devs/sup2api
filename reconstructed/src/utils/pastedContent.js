/**
 * utils/pastedContent.ts
 *
 * 粘贴内容标签（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-km6vv5ys.js (13)
 * attribution: placement 13
 */
//@ chunk-km6vv5ys.js:191-287 placement
/**
 * 粘贴内容标签名与 id 长度、前后标签前缀与行尾格式。
 */
var PASTED_CONTENT_TAG = "pasted_content";
var PASTE_ID_LENGTH = 4;
var PASTED_CONTENT_OPEN_PREFIX = '<pasted_content id="';
var PASTED_CONTENT_LINE_END = `">
`;
var PASTED_CONTENT_CLOSE_PREFIX = '</pasted_content id="';
//@ chunk-km6vv5ys.js:287-339 placement
/**
 * 生成粘贴内容的开始标签。
 */
function pastedContentOpenTag(t) {
  return `<pasted_content id="${t}">
`;
}
//@ chunk-km6vv5ys.js:339-392 placement
/**
 * 生成粘贴内容的结束标签。
 */
function pastedContentCloseTag(t) {
  return `</pasted_content id="${t}">
`;
}
//@ chunk-km6vv5ys.js:392-535 placement
/**
 * 是否为 4 位小写十六进制。
 */
function isPasteIdHex(t) {
  if (t.length !== 4) return false;
  for (let i = 0; i < t.length; i++) {
    let code = t.charCodeAt(i);
    if (!((code >= 48 && code <= 57) || (code >= 97 && code <= 102))) return false;
  }
  return true;
}
//@ chunk-km6vv5ys.js:535-576 placement
/**
 * 开/闭标点字符正则。
 */
var OPENING_PUNCT_RE = /[([{"'`]/;
var CLOSING_PUNCT_RE = /[)\]}"'`.,;:!?]/;
//@ chunk-km6vv5ys.js:576-674 placement
/**
 * 判断标点后是否接了词（后有空白或到末尾）。
 */
function hasWordAfterPunct(t, e = 0, n = t.length) {
  let s = e;
  while (s < n && CLOSING_PUNCT_RE.test(t[s])) s++;
  return s >= n || /\s/.test(t[s]);
}
//@ chunk-km6vv5ys.js:674-1204 placement
/**
 * （切分错误）把文本拆成普通文本段和 <pasted_content id="xxxx"> 块。
 */
function splitPastedContentBlocks(t) {
  let e = [];
  let n = 0;
  let s = 0;
  for (;;) {
    let index = t.indexOf('<pasted_content id="', s);
    if (index === -1) break;
    let r = index + 20;
    let sliced = t.slice(r, r + 4);
    if (
      !isPasteIdHex(sliced) ||
      !t.startsWith(
        `">
`,
        r + 4,
      )
    ) {
      s = r;
      continue;
    }
    let i = r + 4 + 3;
    let sliced_2 = pastedContentCloseTag(sliced).slice(0, -1);
    let l =
      t.indexOf(
        `
${sliced_2}`,
        i - 1,
      ) + 1;
    if (l === 0) break;
    let d = index;
    for (
      let j = 0;
      j < 2 &&
      d > n &&
      t[d - 1] ===
        `
`;
      j++
    )
      d--;
    if (d > n)
      e.push({
        kind: "text",
        text: t.slice(n, d),
      });
    n = l + sliced_2.length;
    for (
      let j = 0;
      j < 2 &&
      t[n] ===
        `
`;
      j++
    )
      n++;
    e.push({
      kind: "block",
      id: sliced,
      body: t.slice(i, l - 1),
      raw: t.slice(d, n),
    });
    s = n;
  }
  if (n < t.length)
    e.push({
      kind: "text",
      text: t.slice(n),
    });
  return e;
}
//@ chunk-km6vv5ys.js:1204-1343 placement = createContentSummary (0.501)
/**
 * （切分错误）去掉 pasted_content 包装，只保留块正文。
 */
function unwrapPastedContentBlocks(content) {
  let e = splitPastedContentBlocks(content);
  if (!e.some((n) => n.kind === "block")) return content;
  return e
    .map((n) => (n.kind === "text" ? n.text : n.body))
    .join(
      `

`,
    )
    .trim();
}
//@ chunk-km6vv5ys.js:1343-1475 placement
/**
 * 展开粘贴内容块为原文。
 */
function flattenPastedBlocks(t) {
  let e = splitPastedContentBlocks(t);
  if (e.length === 1 && e[0].kind === "text") return t;
  return e.map((n) => (n.kind === "text" ? n.text : n.body)).join("");
}
//@ chunk-km6vv5ys.js:1475-2076 placement
function expandPastedContent(text, e) {
  let n = splitPastedContentBlocks(text);
  if (!n.some((r) => r.kind === "block" && r.id === e)) return text;
  let s = "";
  let c = false;
  for (let [r, o] of n.entries()) {
    let i = n[r + 1];
    let u = i?.kind === "block" && i.id === e;
    if (o.kind === "text" || o.id !== e) {
      let E = o.kind === "text" ? o.text : o.raw;
      if (c) E = E.replace(/^\s+/, "");
      if (
        u &&
        i.body.includes(`
`)
      )
        E = E.replace(/\s+$/, "");
      if (E === "") continue;
      if (c && s !== "")
        s += `
`;
      s += E;
      c = false;
      continue;
    }
    let included = o.body.includes(`
`);
    let l = s.length;
    while (l > 0 && OPENING_PUNCT_RE.test(s[l - 1])) l--;
    let d = l === 0 || /\s/.test(s[l - 1]);
    if ((included || c || !d) && s !== "")
      s += `
`;
    s += o.body;
    let a = i === undefined ? "" : i.kind === "text" ? i.text : i.raw;
    c = included || u || /^\s\s/.test(a) || !hasWordAfterPunct(a);
  }
  return s;
}
//@ chunk-km6vv5ys.js:2076-2165 placement
/**
 * 31 位字符串哈希（Java String.hashCode 形式）。
 */
function hashString31(t) {
  let e = 0;
  for (let i = 0; i < t.length; i++) e = ((e << 5) - e + t.charCodeAt(i)) | 0;
  return e;
}
//@ chunk-km6vv5ys.js:2165-2210 placement
/**
 * 用 Bun.hash 计算单个值的字符串哈希。
 */
function bunHashOf(t) {
  return Bun.hash(t).toString();
}
//@ chunk-km6vv5ys.js:2210-2270 placement
/**
 * 用 Bun.hash 计算两个值的组合哈希。
 */
function bunHashPair(t, e) {
  return Bun.hash(e, Bun.hash(t)).toString();
}
export {
  splitPastedContentBlocks,
  hasWordAfterPunct,
  flattenPastedBlocks,
  bunHashPair,
  hashString31,
  bunHashOf,
  unwrapPastedContentBlocks,
  PASTED_CONTENT_TAG,
  expandPastedContent,
  PASTE_ID_LENGTH,
  pastedContentOpenTag,
  pastedContentCloseTag,
  OPENING_PUNCT_RE,
  CLOSING_PUNCT_RE,
  PASTED_CONTENT_OPEN_PREFIX,
  PASTED_CONTENT_CLOSE_PREFIX,
  isPasteIdHex,
  PASTED_CONTENT_LINE_END,
};
