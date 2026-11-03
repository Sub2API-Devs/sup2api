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
import { PP } from "../../plugins/functionHooks/prompt/decorationSpans.js";
import { uniq } from "../../utils/collections.js";
import { getGraphemeSegmenter } from "../../utils/intl.js";
import { validThemeName, resolvePaneColor } from "../../plugins/functionHooks/panes.js";
import { TEXT_STYLE_PROPS } from "../../plugins/functionHooks/ui/styleProps.js";
import { sanitizeAnsiText, stripAnsi } from "../../utils/stripAnsi.js";
import { clampPositive } from "../../plugins/functionHooks/coreHandlers.js";
import { F7n } from "../../../vendor/@alcalzone/ansi-tokenize/build/reduce.js";
import { reduceCodes } from "../../utils/textHighlighting.js";

//@ chunk-e6aww6q8.js:60352-60668 placement = setCwdState (0.84)
function mapRangesToNfcOffsets(e, n, r) {
  if (e.length === 0) return PP;
  let s = uniq(e.flatMap((w) => [w.start, w.end])).toSorted((w, L) => w - L);
  let h = new Map();
  let y = 0;
  let S = 0;
  for (let w of s) {
    S = y === 0 ? (r + n.slice(0, w)).normalize("NFC").length : S + n.slice(y, w).normalize("NFC").length;
    y = w;
    h.set(w, S);
  }
  return e.map((w) => ({
    ...w,
    start: h.get(w.start) ?? 0,
    end: h.get(w.end) ?? 0,
  }));
}
//@ chunk-e6aww6q8.js:60668-60715 placement
var spanAt = (e, n) => (e !== undefined && e.start <= n ? e : undefined);
//@ chunk-e6aww6q8.js:60715-60995 placement
function splitSpanAroundCursor(e, n, r) {
  if (r === undefined || r.start === r.end || r.end <= e.start || r.start >= e.end) return [e];
  let h = {
    start: Math.max(e.start, r.start),
    end: Math.min(e.end, r.end),
  };
  return [
    ...(r.start > e.start
      ? [
          {
            ...e,
            end: r.start,
          },
        ]
      : []),
    ...(n === undefined
      ? []
      : [
          {
            ...n,
            ...h,
          },
        ]),
    ...(r.end < e.end
      ? [
          {
            ...e,
            start: r.end,
          },
        ]
      : []),
  ];
}
//@ chunk-e6aww6q8.js:60995-61105 placement
function advancePastOffset({ spans, edge, startIndex, offset }) {
  let h = startIndex;
  while (h < spans.length && (spans[h]?.[edge] ?? offset) <= offset) h += 1;
  return h;
}
//@ chunk-e6aww6q8.js:61105-61173 placement
var graphemeBoundaries = (text) => [
  ...Array.from(getGraphemeSegmenter().segment(text), (n) => n.index),
  text.length,
];
//@ chunk-e6aww6q8.js:61173-61643 placement
/**
 * 合并输入框装饰的样式：在基础片段上叠加装饰的颜色、背景、粗体、斜体、下划线、删除线等。
 */
function mergeSpanStyle(e, n, r) {
  let s =
    e === undefined
      ? {
          ...r,
          color: undefined,
          priority: 0,
        }
      : {
          ...e,
          ...r,
        };
  if (n === undefined) return s;
  let h = validThemeName(n.color);
  let y = validThemeName(n.backgroundColor);
  return {
    ...s,
    ...(h !== undefined && {
      color: h,
      shimmerColor: undefined,
    }),
    ...(y !== undefined && {
      backgroundColor: y,
    }),
    ...(n.dimColor !== undefined && {
      dimColor: n.dimColor,
    }),
    ...(n.bold !== undefined && {
      bold: n.bold,
    }),
    ...(n.italic !== undefined && {
      italic: n.italic,
    }),
    ...(n.underline !== undefined && {
      underline: n.underline,
    }),
    ...(n.strikethrough !== undefined && {
      strikethrough: n.strikethrough,
    }),
  };
}
//@ chunk-e6aww6q8.js:61643-61686 placement
var sameTextStyle = (e, n) => TEXT_STYLE_PROPS.every((r) => e[r] === n[r]);
//@ chunk-e6aww6q8.js:61686-61727 placement
var isAsciiOnly = (text) => !/[^\t\n\x20-\x7e]/.test(text);
//@ chunk-e6aww6q8.js:61727-62095 placement = hasAnyTextProps (0.833)
var mergeTextStyleOverrides = (e, n) => ({
  ...e,
  ...(n.color !== undefined && {
    color: resolvePaneColor(n.color),
  }),
  ...(n.backgroundColor !== undefined && {
    backgroundColor: resolvePaneColor(n.backgroundColor),
  }),
  ...(n.dimColor !== undefined && {
    dimColor: n.dimColor,
  }),
  ...(n.bold !== undefined && {
    bold: n.bold,
  }),
  ...(n.italic !== undefined && {
    italic: n.italic,
  }),
  ...(n.underline !== undefined && {
    underline: n.underline,
  }),
  ...(n.strikethrough !== undefined && {
    strikethrough: n.strikethrough,
  }),
});
//@ chunk-e6aww6q8.js:62095-62241 placement
function snapToBoundary(boundaries, n) {
  if (boundaries === undefined) return n;
  let r = 0;
  let s = boundaries.length;
  while (r < s) {
    let floored = Math.floor((r + s) / 2);
    let y = (boundaries[floored] ?? 0) <= n;
    r = y ? floored + 1 : r;
    s = y ? s : floored;
  }
  return boundaries[r - 1] ?? 0;
}
//@ chunk-e6aww6q8.js:62241-62480 placement
var virtualTextSpans = (decorations, n, boundaries) =>
  decorations.flatMap((s) => {
    let normalized = sanitizeAnsiText(s.virtualText ?? "")
      .replace(
        /\r\n?/g,
        `
`,
      )
      .replaceAll("\t", "    ")
      .replace(/[^\P{Cc}\n]/gu, "")
      .normalize("NFC");
    let y = snapToBoundary(boundaries, clampPositive(s.start, n));
    return normalized !== ""
      ? [
          {
            start: y,
            end: y,
            virtualText: normalized,
            ...mergeTextStyleOverrides({}, s),
          },
        ]
      : [];
  });
//@ chunk-e6aww6q8.js:62480-63402 placement
/**
 * 把输入框装饰（颜色、下划线、虚拟文本等）规整成不重叠、按起点排序的区间：坐标吸附到字素边界，重叠部分按声明顺序合并样式，相邻同样式区间合并，虚拟文本单独成零宽区间。
 */
function normalizeInputDecorations(decorations, text) {
  if (decorations === undefined || decorations.length === 0) return PP;
  let boundaries = isAsciiOnly(text) ? undefined : graphemeBoundaries(text);
  let flattened = decorations.flatMap((decoration, order) => {
    let we = snapToBoundary(boundaries, clampPositive(decoration.start, text.length));
    let Ee = snapToBoundary(boundaries, clampPositive(decoration.end, text.length));
    return Ee > we
      ? [
          {
            ...decoration,
            start: we,
            end: Ee,
            order,
          },
        ]
      : [];
  });
  let h = flattened.toSorted((Se, ke) => Se.start - ke.start);
  let y = uniq(flattened.flatMap((Se) => [Se.start, Se.end])).toSorted((Se, ke) => Se - ke);
  let active = [];
  let cursor = 0;
  let flattened_2 = y.flatMap((Se, ke) => {
    let we = y[ke - 1] ?? Se;
    let Ee = advancePastOffset({
      spans: h,
      edge: "start",
      startIndex: cursor,
      offset: we,
    });
    active = [...active, ...h.slice(cursor, Ee)].filter((Me) => Me.end > we);
    cursor = Ee;
    let Ae = we === Se || active.length === 0;
    let reduced = active.toSorted((Me, We) => Me.order - We.order).reduce(mergeTextStyleOverrides, {});
    return Ae
      ? []
      : [
          {
            start: we,
            end: Se,
            ...reduced,
          },
        ];
  });
  let flattened_3 = flattened_2.flatMap((Se, ke) => {
    let we = flattened_2[ke - 1];
    return we !== undefined && we.end === Se.start && sameTextStyle(we, Se) ? [] : [ke];
  });
  let flattened_4 = flattened_3.flatMap((Se, ke) => {
    let we = flattened_2[Se];
    let Ee = flattened_2[(flattened_3[ke + 1] ?? flattened_2.length) - 1];
    return we !== undefined && Ee !== undefined
      ? [
          {
            ...we,
            end: Ee.end,
          },
        ]
      : [];
  });
  let Z = [...virtualTextSpans(decorations, text.length, boundaries), ...flattened_4].toSorted(
    (Se, ke) => Se.start - ke.start,
  );
  return Z.length === 0 ? PP : Z;
}
//@ chunk-e6aww6q8.js:63402-63481 placement
/**
 * 函数 mergeDecorationMaps（把多组装饰合并进已有列表）。
 */
function mergeDecorationMaps(e, n, r) {
  return n.size === 0 ? e : normalizeInputDecorations([...e, ...[...n.values()].flat()], r);
}
//@ chunk-e6aww6q8.js:63481-63648 placement
function shiftOffsetForEdit(e, n, r) {
  let s = r === "start";
  let h = s ? e >= n.end : e > n.end;
  let y = s ? e < n.start : e <= n.start;
  return h ? e + n.inputText.length - (n.end - n.start) : y ? e : n.start + (s ? n.inputText.length : 0);
}
//@ chunk-e6aww6q8.js:63648-63860 placement
/**
 * 文本编辑后平移装饰区间：按编辑位置调整起止点，被删除的区间丢弃。
 */
function shiftDecorationsForEdit(e, n) {
  let flattened = e.flatMap((s) => {
    let h = s.end === s.start;
    let y = shiftOffsetForEdit(s.start, n, "start");
    let S = h ? y : shiftOffsetForEdit(s.end, n, "end");
    return (h ? n.start >= s.start || s.start >= n.end : S > y)
      ? [
          {
            ...s,
            start: y,
            end: S,
          },
        ]
      : [];
  });
  return flattened.length === 0 ? PP : flattened;
}
//@ chunk-e6aww6q8.js:63860-63936 placement
/**
 * 函数 nonEmptySpans（去掉空区间，为空时返回冻结空数组）。
 */
function nonEmptySpans(e) {
  let filtered = e.filter((r) => r.end > r.start);
  return filtered.length === 0 ? PP : filtered;
}
//@ chunk-e6aww6q8.js:63936-64202 placement
/**
 * 把基于原始文本的装饰区间映射到渲染后的行内偏移，去掉空区间。
 */
function mapDecorationsToRendered(e, renderedValue, renderedRowStartOffsets) {
  let mapped = stripAnsi(renderedValue)
    .split(
      `
`,
    )
    .map((line) => line.length);
  let h = [];
  let renderedStart = 0;
  for (let [S, w] of renderedRowStartOffsets.entries()) {
    let L = mapped[S] ?? 0;
    h.push({
      textStart: w,
      renderedStart,
      length: L,
    });
    renderedStart += L + 1;
  }
  return e
    .map((S) => ({
      ...S,
      start: textToRenderedOffset(h, S.start, false),
      end: textToRenderedOffset(h, S.end, true),
    }))
    .filter((S) => S.end > S.start);
}
//@ chunk-e6aww6q8.js:64202-64385 placement
function textToRenderedOffset(e, n, r) {
  let s = 0;
  let h = e.length;
  while (s < h) {
    let S = (s + h) >>> 1;
    let textStart = e[S].textStart;
    if (r ? textStart < n : textStart <= n) s = S + 1;
    else h = S;
  }
  let y = e[s - 1];
  return y ? y.renderedStart + Math.min(n - y.textStart, y.length) : 0;
}
//@ chunk-e6aww6q8.js:65856-65918 placement = hasVisibleSpaceEffect (1)
function activeAnsiCodes(styles) {
  return F7n(styles).filter((style) => style.code !== style.endCode);
}
//@ chunk-e6aww6q8.js:65918-66424 placement
/**
 * 把插件装饰叠加到输入框的样式片段上：按所有边界切分，逐段合并原样式与装饰样式（光标所在的高亮片段除外）。
 */
function overlayDecorations(spans, text, cursorRange) {
  let overlay = nonEmptySpans(text);
  if (overlay.length === 0) return spans;
  let baseSpans = reduceCodes(
    cursorRange === undefined
      ? spans
      : spans.filter(
          (span) => span.dimColor === true || cursorRange.start < span.start || cursorRange.start >= span.end,
        ),
  );
  let y = uniq([...baseSpans, ...overlay].flatMap((L) => [L.start, L.end])).toSorted((L, G) => L - G);
  let S = 0;
  let w = 0;
  return y.flatMap((L, G) => {
    let q = y[G - 1] ?? L;
    S = advancePastOffset({
      spans: baseSpans,
      edge: "end",
      startIndex: S,
      offset: q,
    });
    w = advancePastOffset({
      spans: overlay,
      edge: "end",
      startIndex: w,
      offset: q,
    });
    let Z = spanAt(baseSpans[S], q);
    let Se = spanAt(overlay[w], q);
    let ke = q === L || (Z === undefined && Se === undefined);
    let we = mergeSpanStyle(Z, Se, {
      start: q,
      end: L,
    });
    let Ae = Se === undefined ? [we] : splitSpanAroundCursor(we, Z, cursorRange);
    return ke ? [] : Ae;
  });
}
//@ chunk-e6aww6q8.js:66686-66781 placement
/**
 * 导出值：domSpansToDecorations（DOM 行区间转为装饰）。
 */
var domSpansToDecorations = (text, n) =>
  text.spans.flatMap((span) =>
    splitSpanAroundCursor(
      mergeSpanStyle(undefined, span.run, {
        start: span.start,
        end: span.end,
      }),
      undefined,
      n,
    ),
  );
//@ chunk-e6aww6q8.js:66781-66859 placement
/**
 * 函数 emptySpans（只保留空区间（用于光标位置））。
 */
function emptySpans(decorations) {
  let filtered = decorations.filter((r) => r.end === r.start);
  return filtered.length === 0 ? PP : filtered;
}
//@ chunk-e6aww6q8.js:66859-66892 placement
var NEWLINE_LIKE_CHARS = "\r\v\f\x85\u2028\u2029";
//@ chunk-e6aww6q8.js:66892-67200 placement
/**
 * 计算原始字符串各位置到规范化后字符串偏移的映射表（换行替换与代理对替换字符视为对齐）。
 */
function mapNormalizedOffsets(e, n) {
  let uint32Array = new Uint32Array(e.length + 1);
  let s = 0;
  let h = 0;
  for (let y of e) {
    let S = String.fromCodePoint(n.codePointAt(h) ?? 0);
    let w =
      h < n.length &&
      (y === S ||
        (S ===
          `
` &&
          NEWLINE_LIKE_CHARS.includes(y)) ||
        (S === "\uFFFD" && /^[\uD800-\uDFFF]$/.test(y)));
    for (let idx = 0; idx < y.length; idx++) uint32Array[s + idx] = w ? h + idx : h;
    s += y.length;
    h += w ? S.length : 0;
  }
  uint32Array[e.length] = h;
  return uint32Array;
}
export {
  emptySpans,
  overlayDecorations,
  normalizeInputDecorations,
  mergeDecorationMaps,
  shiftDecorationsForEdit,
  mapRangesToNfcOffsets,
  domSpansToDecorations,
  mapDecorationsToRendered,
  activeAnsiCodes,
  mapNormalizedOffsets,
  nonEmptySpans,
};
