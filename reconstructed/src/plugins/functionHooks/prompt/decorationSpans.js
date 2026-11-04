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
var EMPTY_SPANS = Object.freeze([]);
//@ chunk-s61vbvea.js:16208-16288 placement
/**
 * 平移装饰段
 */
var shiftSpans = (text, cursor) =>
  text.spans.reduce((acc, span) => acc - Math.max(0, Math.min(cursor, span.end) - span.start), cursor);
//@ chunk-s61vbvea.js:16288-16390 placement
/**
 * 把装饰段整体平移 n 个位置（空列表返回共享的冻结空数组）。
 */
function offsetDecorations(decorations, delta) {
  let isEmpty = decorations.length === 0;
  let mapped = decorations.map((decoration) => ({
    ...decoration,
    start: decoration.start + delta,
    end: decoration.end + delta,
  }));
  return isEmpty ? EMPTY_SPANS : mapped;
}
//@ chunk-s61vbvea.js:16390-16502 placement
/**
 * 把草稿中的位置换算为显示文本中的位置（加上之前各虚拟文本段的长度）。
 */
var draftToDisplayOffset = (layout, cursor, boundary) =>
  layout.spans
    .filter((span) => (boundary === "after" ? span.run.start <= cursor : span.run.start < cursor))
    .reduce((acc, span) => acc + span.end - span.start, cursor);
//@ chunk-s61vbvea.js:16502-16761 placement
/**
 * 把草稿与带 virtualText 的装饰段合成显示文本，并给出每段在显示文本中的区间。
 */
function buildVirtualTextLayout(draft, decorations) {
  let offset = 0;
  let spans = decorations.map((decoration) => {
    let start = decoration.start + offset;
    offset += (decoration.virtualText ?? "").length;
    return {
      start,
      end: decoration.start + offset,
      run: decoration,
    };
  });
  return {
    draft,
    text:
      decorations
        .map(
          (decoration, index) =>
            draft.slice(decorations[index - 1]?.start ?? 0, decoration.start) +
            (decoration.virtualText ?? ""),
        )
        .join("") + draft.slice(decorations.at(-1)?.start ?? 0),
    spans,
  };
}
export { EMPTY_SPANS, buildVirtualTextLayout, offsetDecorations, shiftSpans, draftToDisplayOffset };
