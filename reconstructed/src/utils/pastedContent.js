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
var PASTED_CONTENT_TAG = "pasted_content",
  GDn = 4,
  CDi = '<pasted_content id="',
  G_s = `">
`,
  RDi = '</pasted_content id="';
//@ chunk-km6vv5ys.js:287-339 placement
function Gwr(t) {
  return `<pasted_content id="${t}">
`;
}
//@ chunk-km6vv5ys.js:339-392 placement
function zDn(t) {
  return `</pasted_content id="${t}">
`;
}
/**
 * 是否为 4 位小写十六进制。
 */
//@ chunk-km6vv5ys.js:392-535 placement
function isPasteIdHex(t) {
  if (t.length !== 4) return !1;
  for (let e = 0; e < t.length; e++) {
    let code = t.charCodeAt(e);
    if (!((code >= 48 && code <= 57) || (code >= 97 && code <= 102))) return !1;
  }
  return !0;
}
//@ chunk-km6vv5ys.js:535-576 placement
var K_s = /[([{"'`]/,
  V_s = /[)\]}"'`.,;:!?]/;
//@ chunk-km6vv5ys.js:576-674 placement
function q_s(t, e = 0, n = t.length) {
  let s = e;
  while (s < n && V_s.test(t[s])) s++;
  return s >= n || /\s/.test(t[s]);
}
/**
 * （切分错误）把文本拆成普通文本段和 <pasted_content id="xxxx"> 块。
 */
//@ chunk-km6vv5ys.js:674-1204 placement
function splitPastedContentBlocks(t) {
  let e = [],
    n = 0,
    s = 0;
  for (;;) {
    let index = t.indexOf('<pasted_content id="', s);
    if (index === -1) break;
    let r = index + 20,
      sliced = t.slice(r, r + 4);
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
    let i = r + 4 + 3,
      sliced_2 = zDn(sliced).slice(0, -1),
      l =
        t.indexOf(
          `
${sliced_2}`,
          i - 1,
        ) + 1;
    if (l === 0) break;
    let d = index;
    for (
      let a = 0;
      a < 2 &&
      d > n &&
      t[d - 1] ===
        `
`;
      a++
    )
      d--;
    if (d > n) e.push({ kind: "text", text: t.slice(n, d) });
    n = l + sliced_2.length;
    for (
      let a = 0;
      a < 2 &&
      t[n] ===
        `
`;
      a++
    )
      n++;
    (e.push({ kind: "block", id: sliced, body: t.slice(i, l - 1), raw: t.slice(d, n) }), (s = n));
  }
  if (n < t.length) e.push({ kind: "text", text: t.slice(n) });
  return e;
}
/**
 * （切分错误）去掉 pasted_content 包装，只保留块正文。
 */
//@ chunk-km6vv5ys.js:1204-1343 placement = createContentSummary (0.501)
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
/**
 * 展开粘贴内容块为原文。
 */
//@ chunk-km6vv5ys.js:1343-1475 placement
function flattenPastedBlocks(t) {
  let e = splitPastedContentBlocks(t);
  if (e.length === 1 && e[0].kind === "text") return t;
  return e.map((n) => (n.kind === "text" ? n.text : n.body)).join("");
}
//@ chunk-km6vv5ys.js:1475-2076 placement
function expandPastedContent(t, e) {
  let n = splitPastedContentBlocks(t);
  if (!n.some((r) => r.kind === "block" && r.id === e)) return t;
  let s = "",
    c = !1;
  for (let [r, o] of n.entries()) {
    let i = n[r + 1],
      u = i?.kind === "block" && i.id === e;
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
      ((s += E), (c = !1));
      continue;
    }
    let included = o.body.includes(`
`),
      l = s.length;
    while (l > 0 && K_s.test(s[l - 1])) l--;
    let d = l === 0 || /\s/.test(s[l - 1]);
    if ((included || c || !d) && s !== "")
      s += `
`;
    s += o.body;
    let a = i === void 0 ? "" : i.kind === "text" ? i.text : i.raw;
    c = included || u || /^\s\s/.test(a) || !q_s(a);
  }
  return s;
}
//@ chunk-km6vv5ys.js:2076-2165 placement
function zhe(t) {
  let e = 0;
  for (let n = 0; n < t.length; n++) e = ((e << 5) - e + t.charCodeAt(n)) | 0;
  return e;
}
//@ chunk-km6vv5ys.js:2165-2210 placement
function sT(t) {
  return Bun.hash(t).toString();
}
//@ chunk-km6vv5ys.js:2210-2270 placement
function hDt(t, e) {
  return Bun.hash(e, Bun.hash(t)).toString();
}

export {
  splitPastedContentBlocks,
  q_s,
  flattenPastedBlocks,
  hDt,
  zhe,
  sT,
  unwrapPastedContentBlocks,
  PASTED_CONTENT_TAG,
  expandPastedContent,
  GDn,
  Gwr,
  zDn,
  K_s,
  V_s,
  CDi,
  RDi,
  isPasteIdHex,
  G_s,
};
