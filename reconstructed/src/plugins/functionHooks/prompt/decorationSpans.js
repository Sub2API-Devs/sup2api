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
var PP = Object.freeze([]);
//@ chunk-s61vbvea.js:16208-16288 placement
/**
 * 平移装饰段
 */
var shiftSpans = (text, n) =>
  text.spans.reduce((acc, span) => acc - Math.max(0, Math.min(n, span.end) - span.start), n);
//@ chunk-s61vbvea.js:16288-16390 placement
/**
 * 把装饰段整体平移 n 个位置（空列表返回共享的冻结空数组）。
 */
function offsetDecorations(e, n) {
  let r = e.length === 0;
  let mapped = e.map((h) => ({
    ...h,
    start: h.start + n,
    end: h.end + n,
  }));
  return r ? PP : mapped;
}
//@ chunk-s61vbvea.js:16390-16502 placement
/**
 * 把草稿中的位置换算为显示文本中的位置（加上之前各虚拟文本段的长度）。
 */
var draftToDisplayOffset = (e, n, r) =>
  e.spans
    .filter((span) => (r === "after" ? span.run.start <= n : span.run.start < n))
    .reduce((acc, span) => acc + span.end - span.start, n);
//@ chunk-s61vbvea.js:16502-16761 placement
/**
 * 把草稿与带 virtualText 的装饰段合成显示文本，并给出每段在显示文本中的区间。
 */
function buildVirtualTextLayout(e, n) {
  let r = 0;
  let spans = n.map((h) => {
    let start = h.start + r;
    r += (h.virtualText ?? "").length;
    return {
      start,
      end: h.start + r,
      run: h,
    };
  });
  return {
    draft: e,
    text:
      n.map((h, y) => e.slice(n[y - 1]?.start ?? 0, h.start) + (h.virtualText ?? "")).join("") +
      e.slice(n.at(-1)?.start ?? 0),
    spans,
  };
}
export { PP, buildVirtualTextLayout, offsetDecorations, shiftSpans, draftToDisplayOffset };
