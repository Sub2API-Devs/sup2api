/**
 * plugins/functionHooks/prompt/decorationSpans.ts
 *
 * 提示词草稿装饰段（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (5)
 * attribution: placement 5
 */

//@ chunk-s61vbvea.js:16183-16208 placement
var freeze = Object.freeze([]);
//@ chunk-s61vbvea.js:16208-16288 placement
var cqo = (e, n) => e.spans.reduce((r, s) => r - Math.max(0, Math.min(n, s.end) - s.start), n);
/**
 * 把装饰段整体平移 n 个位置（空列表返回共享的冻结空数组）。
 */
//@ chunk-s61vbvea.js:16288-16390 placement
function offsetDecorations(e, n) {
  let r = e.length === 0,
    mapped = e.map((h) => ({ ...h, start: h.start + n, end: h.end + n }));
  return r ? freeze : mapped;
}
/**
 * 把草稿中的位置换算为显示文本中的位置（加上之前各虚拟文本段的长度）。
 */
//@ chunk-s61vbvea.js:16390-16502 placement
var draftToDisplayOffset = (e, n, r) =>
  e.spans
    .filter((span) => (r === "after" ? span.run.start <= n : span.run.start < n))
    .reduce((s, h) => s + h.end - h.start, n);
/**
 * 把草稿与带 virtualText 的装饰段合成显示文本，并给出每段在显示文本中的区间。
 */
//@ chunk-s61vbvea.js:16502-16761 placement
function buildVirtualTextLayout(e, n) {
  let r = 0,
    mapped = n.map((h) => {
      let y = h.start + r;
      return ((r += (h.virtualText ?? "").length), { start: y, end: h.start + r, run: h });
    });
  return {
    draft: e,
    text:
      n.map((h, y) => e.slice(n[y - 1]?.start ?? 0, h.start) + (h.virtualText ?? "")).join("") +
      e.slice(n.at(-1)?.start ?? 0),
    spans: mapped,
  };
}

export { freeze, buildVirtualTextLayout, offsetDecorations, cqo, draftToDisplayOffset };
