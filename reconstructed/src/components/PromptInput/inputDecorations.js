/**
 * components/PromptInput/inputDecorations.ts
 *
 * 2.1.316 新增：输入框内联装饰（@ 提及、斜杠命令、插件标记等高亮）的计算
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (24)
 * attribution: placement 24
 */
import { freeze as freeze_25 } from "../../plugins/functionHooks/prompt/decorationSpans.js";
import { uniq } from "../../utils/collections.js";
import { getGraphemeSegmenter } from "../../utils/intl.js";
import { ekt, JNe } from "../../plugins/functionHooks/panes.js";
import { TEXT_STYLE_PROPS } from "../../plugins/functionHooks/ui/styleProps.js";
import { Pje, Yn } from "../../utils/stripAnsi.js";
import { V$ } from "../../plugins/functionHooks/coreHandlers.js";
import { F7n } from "../../../vendor/@alcalzone/ansi-tokenize/build/reduce.js";
import { reduceCodes } from "../../utils/textHighlighting.js";

//@ chunk-e6aww6q8.js:60352-60668 placement = setCwdState (0.84)
function mapRangesToNfcOffsets(e, n, r) {
  if (e.length === 0) return freeze_25;
  let toSorted = uniq(e.flatMap((w) => [w.start, w.end])).toSorted((w, L) => w - L),
    h = new Map(),
    y = 0,
    S = 0;
  for (let w of toSorted)
    ((S = y === 0 ? (r + n.slice(0, w)).normalize("NFC").length : S + n.slice(y, w).normalize("NFC").length),
      (y = w),
      h.set(w, S));
  return e.map((w) => ({ ...w, start: h.get(w.start) ?? 0, end: h.get(w.end) ?? 0 }));
}
//@ chunk-e6aww6q8.js:60668-60715 placement
var gNe = (e, n) => (e !== void 0 && e.start <= n ? e : void 0);
//@ chunk-e6aww6q8.js:60715-60995 placement
function splitSpanAroundCursor(e, n, r) {
  if (r === void 0 || r.start === r.end || r.end <= e.start || r.start >= e.end) return [e];
  let h = { start: Math.max(e.start, r.start), end: Math.min(e.end, r.end) };
  return [
    ...(r.start > e.start ? [{ ...e, end: r.start }] : []),
    ...(n === void 0 ? [] : [{ ...n, ...h }]),
    ...(r.end < e.end ? [{ ...e, start: r.end }] : []),
  ];
}
//@ chunk-e6aww6q8.js:60995-61105 placement
function advancePastOffset({ spans: spans, edge: edge, startIndex: startIndex, offset: offset }) {
  let h = startIndex;
  while (h < spans.length && (spans[h]?.[edge] ?? offset) <= offset) h += 1;
  return h;
}
//@ chunk-e6aww6q8.js:61105-61173 placement
var Gyt = (e) => [...Array.from(getGraphemeSegmenter().segment(e), (n) => n.index), e.length];
/**
 * 合并输入框装饰的样式：在基础片段上叠加装饰的颜色、背景、粗体、斜体、下划线、删除线等。
 */
//@ chunk-e6aww6q8.js:61173-61643 placement
function mergeSpanStyle(e, n, r) {
  let s = e === void 0 ? { ...r, color: void 0, priority: 0 } : { ...e, ...r };
  if (n === void 0) return s;
  let h = ekt(n.color),
    y = ekt(n.backgroundColor);
  return {
    ...s,
    ...(h !== void 0 && { color: h, shimmerColor: void 0 }),
    ...(y !== void 0 && { backgroundColor: y }),
    ...(n.dimColor !== void 0 && { dimColor: n.dimColor }),
    ...(n.bold !== void 0 && { bold: n.bold }),
    ...(n.italic !== void 0 && { italic: n.italic }),
    ...(n.underline !== void 0 && { underline: n.underline }),
    ...(n.strikethrough !== void 0 && { strikethrough: n.strikethrough }),
  };
}
//@ chunk-e6aww6q8.js:61643-61686 placement
var zyt = (e, n) => TEXT_STYLE_PROPS.every((r) => e[r] === n[r]);
//@ chunk-e6aww6q8.js:61686-61727 placement
var qyt = (e) => !/[^\t\n\x20-\x7e]/.test(e);
//@ chunk-e6aww6q8.js:61727-62095 placement = hasAnyTextProps (0.833)
var mergeTextStyleOverrides = (e, n) => ({
  ...e,
  ...(n.color !== void 0 && { color: JNe(n.color) }),
  ...(n.backgroundColor !== void 0 && { backgroundColor: JNe(n.backgroundColor) }),
  ...(n.dimColor !== void 0 && { dimColor: n.dimColor }),
  ...(n.bold !== void 0 && { bold: n.bold }),
  ...(n.italic !== void 0 && { italic: n.italic }),
  ...(n.underline !== void 0 && { underline: n.underline }),
  ...(n.strikethrough !== void 0 && { strikethrough: n.strikethrough }),
});
//@ chunk-e6aww6q8.js:62095-62241 placement
function snapToBoundary(e, n) {
  if (e === void 0) return n;
  let r = 0,
    s = e.length;
  while (r < s) {
    let floored = Math.floor((r + s) / 2),
      y = (e[floored] ?? 0) <= n;
    ((r = y ? floored + 1 : r), (s = y ? s : floored));
  }
  return e[r - 1] ?? 0;
}
//@ chunk-e6aww6q8.js:62241-62480 placement
var virtualTextSpans = (e, n, r) =>
  e.flatMap((s) => {
    let normalized = Pje(s.virtualText ?? "")
        .replace(
          /\r\n?/g,
          `
`,
        )
        .replaceAll("\t", "    ")
        .replace(/[^\P{Cc}\n]/gu, "")
        .normalize("NFC"),
      y = snapToBoundary(r, V$(s.start, n));
    return normalized !== ""
      ? [{ start: y, end: y, virtualText: normalized, ...mergeTextStyleOverrides({}, s) }]
      : [];
  });
/**
 * 把输入框装饰（颜色、下划线、虚拟文本等）规整成不重叠、按起点排序的区间：坐标吸附到字素边界，重叠部分按声明顺序合并样式，相邻同样式区间合并，虚拟文本单独成零宽区间。
 */
//@ chunk-e6aww6q8.js:62480-63402 placement
function normalizeInputDecorations(decorations, text) {
  if (decorations === void 0 || decorations.length === 0) return freeze_25;
  let boundaries = qyt(text) ? void 0 : Gyt(text),
    flattened = decorations.flatMap((Se, ke) => {
      let we = snapToBoundary(boundaries, V$(Se.start, text.length)),
        Ee = snapToBoundary(boundaries, V$(Se.end, text.length));
      return Ee > we ? [{ ...Se, start: we, end: Ee, order: ke }] : [];
    }),
    toSorted = flattened.toSorted((Se, ke) => Se.start - ke.start),
    toSorted_2 = uniq(flattened.flatMap((Se) => [Se.start, Se.end])).toSorted((Se, ke) => Se - ke),
    active = [],
    cursor = 0,
    flattened_2 = toSorted_2.flatMap((Se, ke) => {
      let we = toSorted_2[ke - 1] ?? Se,
        Ee = advancePastOffset({ spans: toSorted, edge: "start", startIndex: cursor, offset: we });
      ((active = [...active, ...toSorted.slice(cursor, Ee)].filter((Me) => Me.end > we)), (cursor = Ee));
      let Ae = we === Se || active.length === 0,
        reduced = active.toSorted((Me, We) => Me.order - We.order).reduce(mergeTextStyleOverrides, {});
      return Ae ? [] : [{ start: we, end: Se, ...reduced }];
    }),
    flattened_3 = flattened_2.flatMap((Se, ke) => {
      let we = flattened_2[ke - 1];
      return we !== void 0 && we.end === Se.start && zyt(we, Se) ? [] : [ke];
    }),
    flattened_4 = flattened_3.flatMap((Se, ke) => {
      let we = flattened_2[Se],
        Ee = flattened_2[(flattened_3[ke + 1] ?? flattened_2.length) - 1];
      return we !== void 0 && Ee !== void 0 ? [{ ...we, end: Ee.end }] : [];
    }),
    toSorted_3 = [...virtualTextSpans(decorations, text.length, boundaries), ...flattened_4].toSorted(
      (Se, ke) => Se.start - ke.start,
    );
  return toSorted_3.length === 0 ? freeze_25 : toSorted_3;
}
//@ chunk-e6aww6q8.js:63402-63481 placement
function gYs(e, n, r) {
  return n.size === 0 ? e : normalizeInputDecorations([...e, ...[...n.values()].flat()], r);
}
//@ chunk-e6aww6q8.js:63481-63648 placement
function shiftOffsetForEdit(e, n, r) {
  let s = r === "start",
    h = s ? e >= n.end : e > n.end,
    y = s ? e < n.start : e <= n.start;
  return h ? e + n.inputText.length - (n.end - n.start) : y ? e : n.start + (s ? n.inputText.length : 0);
}
/**
 * 文本编辑后平移装饰区间：按编辑位置调整起止点，被删除的区间丢弃。
 */
//@ chunk-e6aww6q8.js:63648-63860 placement
function shiftDecorationsForEdit(e, n) {
  let flattened = e.flatMap((s) => {
    let h = s.end === s.start,
      y = shiftOffsetForEdit(s.start, n, "start"),
      S = h ? y : shiftOffsetForEdit(s.end, n, "end");
    return (h ? n.start >= s.start || s.start >= n.end : S > y) ? [{ ...s, start: y, end: S }] : [];
  });
  return flattened.length === 0 ? freeze_25 : flattened;
}
//@ chunk-e6aww6q8.js:63860-63936 placement
function k8n(e) {
  let filtered = e.filter((r) => r.end > r.start);
  return filtered.length === 0 ? freeze_25 : filtered;
}
/**
 * 把基于原始文本的装饰区间映射到渲染后的行内偏移，去掉空区间。
 */
//@ chunk-e6aww6q8.js:63936-64202 placement
function mapDecorationsToRendered(e, n, r) {
  let mapped = Yn(n)
      .split(
        `
`,
      )
      .map((S) => S.length),
    h = [],
    y = 0;
  for (let [S, w] of r.entries()) {
    let L = mapped[S] ?? 0;
    (h.push({ textStart: w, renderedStart: y, length: L }), (y += L + 1));
  }
  return e
    .map((S) => ({
      ...S,
      start: textToRenderedOffset(h, S.start, !1),
      end: textToRenderedOffset(h, S.end, !0),
    }))
    .filter((S) => S.end > S.start);
}
//@ chunk-e6aww6q8.js:64202-64385 placement
function textToRenderedOffset(e, n, r) {
  let s = 0,
    h = e.length;
  while (s < h) {
    let S = (s + h) >>> 1,
      textStart = e[S].textStart;
    if (r ? textStart < n : textStart <= n) s = S + 1;
    else h = S;
  }
  let y = e[s - 1];
  return y ? y.renderedStart + Math.min(n - y.textStart, y.length) : 0;
}
//@ chunk-e6aww6q8.js:65856-65918 placement = hasVisibleSpaceEffect (1)
function activeAnsiCodes(styles) {
  return F7n(styles).filter((n) => n.code !== n.endCode);
}
/**
 * 把插件装饰叠加到输入框的样式片段上：按所有边界切分，逐段合并原样式与装饰样式（光标所在的高亮片段除外）。
 */
//@ chunk-e6aww6q8.js:65918-66424 placement
function overlayDecorations(spans, text, cursorRange) {
  let overlay = k8n(text);
  if (overlay.length === 0) return spans;
  let baseSpans = reduceCodes(
      cursorRange === void 0
        ? spans
        : spans.filter((L) => L.dimColor === !0 || cursorRange.start < L.start || cursorRange.start >= L.end),
    ),
    toSorted = uniq([...baseSpans, ...overlay].flatMap((L) => [L.start, L.end])).toSorted((L, G) => L - G),
    S = 0,
    w = 0;
  return toSorted.flatMap((L, G) => {
    let q = toSorted[G - 1] ?? L;
    ((S = advancePastOffset({ spans: baseSpans, edge: "end", startIndex: S, offset: q })),
      (w = advancePastOffset({ spans: overlay, edge: "end", startIndex: w, offset: q })));
    let Z = gNe(baseSpans[S], q),
      Se = gNe(overlay[w], q),
      ke = q === L || (Z === void 0 && Se === void 0),
      we = mergeSpanStyle(Z, Se, { start: q, end: L }),
      Ae = Se === void 0 ? [we] : splitSpanAroundCursor(we, Z, cursorRange);
    return ke ? [] : Ae;
  });
}
//@ chunk-e6aww6q8.js:66686-66781 placement
var ZFo = (e, n) =>
  e.spans.flatMap((span) =>
    splitSpanAroundCursor(mergeSpanStyle(void 0, span.run, { start: span.start, end: span.end }), void 0, n),
  );
//@ chunk-e6aww6q8.js:66781-66859 placement
function T8n(e) {
  let filtered = e.filter((r) => r.end === r.start);
  return filtered.length === 0 ? freeze_25 : filtered;
}
//@ chunk-e6aww6q8.js:66859-66892 placement
var Qyt = "\r\v\f\x85\u2028\u2029";
/**
 * 计算原始字符串各位置到规范化后字符串偏移的映射表（换行替换与代理对替换字符视为对齐）。
 */
//@ chunk-e6aww6q8.js:66892-67200 placement
function mapNormalizedOffsets(e, n) {
  let uint32Array = new Uint32Array(e.length + 1),
    s = 0,
    h = 0;
  for (let y of e) {
    let fromCodePoint = String.fromCodePoint(n.codePointAt(h) ?? 0),
      w =
        h < n.length &&
        (y === fromCodePoint ||
          (fromCodePoint ===
            `
` &&
            Qyt.includes(y)) ||
          (fromCodePoint === "\uFFFD" && /^[\uD800-\uDFFF]$/.test(y)));
    for (let L = 0; L < y.length; L++) uint32Array[s + L] = w ? h + L : h;
    ((s += y.length), (h += w ? fromCodePoint.length : 0));
  }
  return ((uint32Array[e.length] = h), uint32Array);
}

export {
  T8n,
  overlayDecorations,
  normalizeInputDecorations,
  gYs,
  shiftDecorationsForEdit,
  mapRangesToNfcOffsets,
  ZFo,
  mapDecorationsToRendered,
  activeAnsiCodes,
  mapNormalizedOffsets,
  k8n,
};
