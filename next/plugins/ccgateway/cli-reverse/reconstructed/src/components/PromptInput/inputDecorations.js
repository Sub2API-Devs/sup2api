/**
 * components/PromptInput/inputDecorations.ts
 *
 * 2.1.316 新增：输入框内联装饰（@ 提及、斜杠命令、插件标记等高亮）的计算
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (24)
 * attribution: placement 24
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { EMPTY_SPANS } from "../../plugins/functionHooks/prompt/decorationSpans.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { getGraphemeSegmenter } from "../../utils/intl.js";
import { validThemeName, resolvePaneColor } from "../../plugins/functionHooks/panes.js";
import { TEXT_STYLE_PROPS } from "../../plugins/functionHooks/ui/styleProps.js";
import { sanitizeAnsiText, stripAnsi } from "../../utils/stripAnsi.js";
import { clampPositive } from "../../plugins/functionHooks/coreHandlers.js";
import { reduceAnsiCodes } from "../../../vendor/@alcalzone/ansi-tokenize/build/reduce.js";
import { reduceCodes } from "../../utils/textHighlighting.js";

//@ chunk-5xgkngpb.js:62880-63196 placement (2.1.88 match: setCwdState, 0.84)
function mapRangesToNfcOffsets(ranges, text, mode) {
  if (ranges.length === 0) return EMPTY_SPANS;
  let boundaries = normalizeCaseForComparison_2(ranges.flatMap((range) => [range.start, range.end])).toSorted(
    (a, b) => a - b,
  );
  let offsets = new Map();
  let prevBoundary = 0;
  let nextBoundary = 0;
  for (let transformed of boundaries) {
    nextBoundary =
      prevBoundary === 0
        ? (mode + text.slice(0, transformed)).normalize("NFC").length
        : nextBoundary + text.slice(prevBoundary, transformed).normalize("NFC").length;
    prevBoundary = transformed;
    offsets.set(transformed, nextBoundary);
  }
  return ranges.map((range) => ({
    ...range,
    start: offsets.get(range.start) ?? 0,
    end: offsets.get(range.end) ?? 0,
  }));
}
//@ chunk-5xgkngpb.js:63196-63243 placement
var spanAt = (span, offset) => (span !== undefined && span.start <= offset ? span : undefined);
//@ chunk-5xgkngpb.js:63243-63523 placement
function splitSpanAroundCursor(span, run, cursorRange) {
  if (
    cursorRange === undefined ||
    cursorRange.start === cursorRange.end ||
    cursorRange.end <= span.start ||
    cursorRange.start >= span.end
  )
    return [span];
  let overlap = {
    start: Math.max(span.start, cursorRange.start),
    end: Math.min(span.end, cursorRange.end),
  };
  return [
    ...(cursorRange.start > span.start
      ? [
          {
            ...span,
            end: cursorRange.start,
          },
        ]
      : []),
    ...(run === undefined
      ? []
      : [
          {
            ...run,
            ...overlap,
          },
        ]),
    ...(cursorRange.end < span.end
      ? [
          {
            ...span,
            start: cursorRange.end,
          },
        ]
      : []),
  ];
}
//@ chunk-5xgkngpb.js:63523-63633 placement
function advancePastOffset({ spans, edge, startIndex, offset }) {
  let spanIndex = startIndex;
  while (spanIndex < spans.length && (spans[spanIndex]?.[edge] ?? offset) <= offset) spanIndex += 1;
  return spanIndex;
}
//@ chunk-5xgkngpb.js:63633-63701 placement
var graphemeBoundaries = (text) => [
  ...Array.from(getGraphemeSegmenter().segment(text), (segment) => segment.index),
  text.length,
];
//@ chunk-5xgkngpb.js:63701-64171 placement
/**
 * 合并输入框装饰的样式：在基础片段上叠加装饰的颜色、背景、粗体、斜体、下划线、删除线等。
 */
function mergeSpanStyle(base, override, span) {
  let merged =
    base === undefined
      ? {
          ...span,
          color: undefined,
          priority: 0,
        }
      : {
          ...base,
          ...span,
        };
  if (override === undefined) return merged;
  let colorName = validThemeName(override.color);
  let bgColorName = validThemeName(override.backgroundColor);
  return {
    ...merged,
    ...(colorName !== undefined && {
      color: colorName,
      shimmerColor: undefined,
    }),
    ...(bgColorName !== undefined && {
      backgroundColor: bgColorName,
    }),
    ...(override.dimColor !== undefined && {
      dimColor: override.dimColor,
    }),
    ...(override.bold !== undefined && {
      bold: override.bold,
    }),
    ...(override.italic !== undefined && {
      italic: override.italic,
    }),
    ...(override.underline !== undefined && {
      underline: override.underline,
    }),
    ...(override.strikethrough !== undefined && {
      strikethrough: override.strikethrough,
    }),
  };
}
//@ chunk-5xgkngpb.js:64171-64214 placement
var sameTextStyle = (a, b) => TEXT_STYLE_PROPS.every((prop) => a[prop] === b[prop]);
//@ chunk-5xgkngpb.js:64214-64255 placement
var isAsciiOnly = (text) => !/[^\t\n\x20-\x7e]/.test(text);
//@ chunk-5xgkngpb.js:64255-64623 placement (2.1.88 match: hasAnyTextProps, 0.832)
var mergeTextStyleOverrides = (baseStyle, overrides) => ({
  ...baseStyle,
  ...(overrides.color !== undefined && {
    color: resolvePaneColor(overrides.color),
  }),
  ...(overrides.backgroundColor !== undefined && {
    backgroundColor: resolvePaneColor(overrides.backgroundColor),
  }),
  ...(overrides.dimColor !== undefined && {
    dimColor: overrides.dimColor,
  }),
  ...(overrides.bold !== undefined && {
    bold: overrides.bold,
  }),
  ...(overrides.italic !== undefined && {
    italic: overrides.italic,
  }),
  ...(overrides.underline !== undefined && {
    underline: overrides.underline,
  }),
  ...(overrides.strikethrough !== undefined && {
    strikethrough: overrides.strikethrough,
  }),
});
//@ chunk-5xgkngpb.js:64623-64769 placement
function snapToBoundary(boundaries, offset) {
  if (boundaries === undefined) return offset;
  let nearest = 0;
  let high = boundaries.length;
  while (nearest < high) {
    let floored = Math.floor((nearest + high) / 2);
    let index = (boundaries[floored] ?? 0) <= offset;
    nearest = index ? floored + 1 : nearest;
    high = index ? high : floored;
  }
  return boundaries[nearest - 1] ?? 0;
}
//@ chunk-5xgkngpb.js:64769-65008 placement
var virtualTextSpans = (decorations, style, boundaries) =>
  decorations.flatMap((decoration) => {
    let normalized = sanitizeAnsiText(decoration.virtualText ?? "")
      .replace(
        /\r\n?/g,
        `
`,
      )
      .replaceAll("\t", "    ")
      .replace(/[^\P{Cc}\n]/gu, "")
      .normalize("NFC");
    let startOffset = snapToBoundary(boundaries, clampPositive(decoration.start, style));
    return normalized !== ""
      ? [
          {
            start: startOffset,
            end: startOffset,
            virtualText: normalized,
            ...mergeTextStyleOverrides({}, decoration),
          },
        ]
      : [];
  });
//@ chunk-5xgkngpb.js:65008-65934 placement
/**
 * 把输入框装饰（颜色、下划线、虚拟文本等）规整成不重叠、按起点排序的区间：坐标吸附到字素边界，重叠部分按声明顺序合并样式，相邻同样式区间合并，虚拟文本单独成零宽区间。
 */
function normalizeInputDecorations(decorations, text) {
  if (decorations === undefined || decorations.length === 0) return EMPTY_SPANS;
  let boundaries = isAsciiOnly(text) ? undefined : graphemeBoundaries(text);
  let flattened = decorations.flatMap((decoration, order) => {
    let start = snapToBoundary(boundaries, clampPositive(decoration.start, text.length));
    let end = snapToBoundary(boundaries, clampPositive(decoration.end, text.length));
    return end > start
      ? [
          {
            ...decoration,
            start,
            end,
            order,
          },
        ]
      : [];
  });
  let sorted = flattened.toSorted((left, right) => left.start - right.start);
  let edges = normalizeCaseForComparison_2(flattened.flatMap((span) => [span.start, span.end])).toSorted(
    (left, right) => left - right,
  );
  let active = [];
  let cursor = 0;
  let flattened_2 = edges.flatMap((edge, index) => {
    let prevEdge = edges[index - 1] ?? edge;
    let nextIndex = advancePastOffset({
      spans: sorted,
      edge: "start",
      startIndex: cursor,
      offset: prevEdge,
    });
    active = [...active, ...sorted.slice(cursor, nextIndex)].filter((span) => span.end > prevEdge);
    cursor = nextIndex;
    let isGap = prevEdge === edge || active.length === 0;
    let reduced = active
      .toSorted((left, right) => left.order - right.order)
      .reduce(mergeTextStyleOverrides, {});
    return isGap
      ? []
      : [
          {
            start: prevEdge,
            end: edge,
            ...reduced,
          },
        ];
  });
  let flattened_3 = flattened_2.flatMap((segment, index) => {
    let prev = flattened_2[index - 1];
    return prev !== undefined && prev.end === segment.start && sameTextStyle(prev, segment) ? [] : [index];
  });
  let flattened_4 = flattened_3.flatMap((breakIndex, index) => {
    let first = flattened_2[breakIndex];
    let last = flattened_2[(flattened_3[index + 1] ?? flattened_2.length) - 1];
    return first !== undefined && last !== undefined
      ? [
          {
            ...first,
            end: last.end,
          },
        ]
      : [];
  });
  let result = [...virtualTextSpans(decorations, text.length, boundaries), ...flattened_4].toSorted(
    (left, right) => left.start - right.start,
  );
  return result.length === 0 ? EMPTY_SPANS : result;
}
//@ chunk-5xgkngpb.js:65934-66014 placement
/**
 * 函数 mergeDecorationMaps（把多组装饰合并进已有列表）。
 */
function mergeDecorationMaps(existing, incoming, options) {
  return incoming.size === 0
    ? existing
    : normalizeInputDecorations([...existing, ...[...incoming.values()].flat()], options);
}
//@ chunk-5xgkngpb.js:66014-66181 placement
function shiftOffsetForEdit(offset, edit, side) {
  let isStart = side === "start";
  let isAfterEnd = isStart ? offset >= edit.end : offset > edit.end;
  let shifted = isStart ? offset < edit.start : offset <= edit.start;
  return isAfterEnd
    ? offset + edit.inputText.length - (edit.end - edit.start)
    : shifted
      ? offset
      : edit.start + (isStart ? edit.inputText.length : 0);
}
//@ chunk-5xgkngpb.js:66181-66393 placement
/**
 * 文本编辑后平移装饰区间：按编辑位置调整起止点，被删除的区间丢弃。
 */
function shiftDecorationsForEdit(decorations, edit) {
  let flattened = decorations.flatMap((decoration) => {
    let isEmpty = decoration.end === decoration.start;
    let startOffset = shiftOffsetForEdit(decoration.start, edit, "start");
    let endOffset = isEmpty ? startOffset : shiftOffsetForEdit(decoration.end, edit, "end");
    return (
      isEmpty ? edit.start >= decoration.start || decoration.start >= edit.end : endOffset > startOffset
    )
      ? [
          {
            ...decoration,
            start: startOffset,
            end: endOffset,
          },
        ]
      : [];
  });
  return flattened.length === 0 ? EMPTY_SPANS : flattened;
}
//@ chunk-5xgkngpb.js:66393-66469 placement
/**
 * 函数 nonEmptySpans（去掉空区间，为空时返回冻结空数组）。
 */
function nonEmptySpans(spans) {
  let filtered = spans.filter((span) => span.end > span.start);
  return filtered.length === 0 ? EMPTY_SPANS : filtered;
}
//@ chunk-5xgkngpb.js:66469-66735 placement
/**
 * 把基于原始文本的装饰区间映射到渲染后的行内偏移，去掉空区间。
 */
function mapDecorationsToRendered(decorations, renderedValue, renderedRowStartOffsets) {
  let mapped = stripAnsi(renderedValue)
    .split(
      `
`,
    )
    .map((line) => line.length);
  let rows = [];
  let renderedStart = 0;
  for (let [rowIndex, rowStart] of renderedRowStartOffsets.entries()) {
    let rowLength = mapped[rowIndex] ?? 0;
    rows.push({
      textStart: rowStart,
      renderedStart,
      length: rowLength,
    });
    renderedStart += rowLength + 1;
  }
  return decorations
    .map((decoration) => ({
      ...decoration,
      start: textToRenderedOffset(rows, decoration.start, false),
      end: textToRenderedOffset(rows, decoration.end, true),
    }))
    .filter((state) => state.end > state.start);
}
//@ chunk-5xgkngpb.js:66735-66918 placement
function textToRenderedOffset(text, offset, isEnd) {
  let rendered = 0;
  let remaining = text.length;
  while (rendered < remaining) {
    let mid = (rendered + remaining) >>> 1;
    let textStart = text[mid].textStart;
    if (isEnd ? textStart < offset : textStart <= offset) rendered = mid + 1;
    else remaining = mid;
  }
  let row = text[rendered - 1];
  return row ? row.renderedStart + Math.min(offset - row.textStart, row.length) : 0;
}
//@ chunk-5xgkngpb.js:68393-68455 placement (2.1.88 match: hasVisibleSpaceEffect, 1)
function activeAnsiCodes(styles) {
  return reduceAnsiCodes(styles).filter((style) => style.code !== style.endCode);
}
//@ chunk-5xgkngpb.js:68455-68965 placement
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
  let boundaries = normalizeCaseForComparison_2(
    [...baseSpans, ...overlay].flatMap((range) => [range.start, range.end]),
  ).toSorted((a, b) => a - b);
  let nextStart = 0;
  let nextEnd = 0;
  return boundaries.flatMap((cursor, index) => {
    let boundary = boundaries[index - 1] ?? cursor;
    nextStart = advancePastOffset({
      spans: baseSpans,
      edge: "end",
      startIndex: nextStart,
      offset: boundary,
    });
    nextEnd = advancePastOffset({
      spans: overlay,
      edge: "end",
      startIndex: nextEnd,
      offset: boundary,
    });
    let baseSpan = spanAt(baseSpans[nextStart], boundary);
    let overlaySpan = spanAt(overlay[nextEnd], boundary);
    let isEmptyPart = boundary === cursor || (baseSpan === undefined && overlaySpan === undefined);
    let merged = mergeSpanStyle(baseSpan, overlaySpan, {
      start: boundary,
      end: cursor,
    });
    let decoratedSpan =
      overlaySpan === undefined ? [merged] : splitSpanAroundCursor(merged, baseSpan, cursorRange);
    return isEmptyPart ? [] : decoratedSpan;
  });
}
//@ chunk-5xgkngpb.js:69227-69322 placement
/**
 * 导出值：domSpansToDecorations（DOM 行区间转为装饰）。
 */
var domSpansToDecorations = (text, cursorOffset) =>
  text.spans.flatMap((span) =>
    splitSpanAroundCursor(
      mergeSpanStyle(undefined, span.run, {
        start: span.start,
        end: span.end,
      }),
      undefined,
      cursorOffset,
    ),
  );
//@ chunk-5xgkngpb.js:69322-69400 placement
/**
 * 函数 emptySpans（只保留空区间（用于光标位置））。
 */
function emptySpans(decorations) {
  let filtered = decorations.filter((decoration) => decoration.end === decoration.start);
  return filtered.length === 0 ? EMPTY_SPANS : filtered;
}
//@ chunk-5xgkngpb.js:69400-69433 placement
var NEWLINE_LIKE_CHARS = "\r\v\f\x85\u2028\u2029";
//@ chunk-5xgkngpb.js:69433-69741 placement
/**
 * 计算原始字符串各位置到规范化后字符串偏移的映射表（换行替换与代理对替换字符视为对齐）。
 */
function mapNormalizedOffsets(offsets, edit) {
  let uint32Array = new Uint32Array(offsets.length + 1);
  let index = 0;
  let delta = 0;
  for (let next of offsets) {
    let shifted = String.fromCodePoint(edit.codePointAt(delta) ?? 0);
    let isForward =
      delta < edit.length &&
      (next === shifted ||
        (shifted ===
          `
` &&
          NEWLINE_LIKE_CHARS.includes(next)) ||
        (shifted === "\uFFFD" && /^[\uD800-\uDFFF]$/.test(next)));
    for (let idx = 0; idx < next.length; idx++) uint32Array[index + idx] = isForward ? delta + idx : delta;
    index += next.length;
    delta += isForward ? shifted.length : 0;
  }
  uint32Array[offsets.length] = delta;
  return uint32Array;
}
export {
  nonEmptySpans,
  normalizeInputDecorations,
  domSpansToDecorations,
  mapDecorationsToRendered,
  activeAnsiCodes,
  mapNormalizedOffsets,
  emptySpans,
  overlayDecorations,
  mergeDecorationMaps,
  shiftDecorationsForEdit,
  mapRangesToNfcOffsets,
};
