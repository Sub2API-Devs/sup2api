/**
 * utils/Cursor.ts
 *
 * 输入框光标与按宽度换行的文本模型（MeasuredText），实现移动、删除、kill ring、vim 动作
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/Cursor.ts
 * pieces: chunk-4121qate.js (1), chunk-530hfzwb.js (5), chunk-7p2hc4jn.js (8), chunk-tzghj6zv.js (11)
 * attribution: fingerprint 4, placement 19, layout 1, affinity 1
 */
import { renderWithForceUpdate } from "../hooks/useForceRender.js";
import { tE } from "./permissions/currentPermissionContext.js";
import { j } from "../../vendor/react/cjs/react.production.js";
import { wrapAnsi, DEFAULT_TAB_WIDTH } from "../ink/wrapAnsi.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { getGraphemeSegmenter, firstGrapheme, getWordSegmenter } from "./intl.js";
import { wrapTextRows } from "./textWrap.js";
import { logWrapFallbackOnce } from "../hooks/useTextInput.js";
import { truncateToWidth } from "./truncate.js";
import { snapToPlaceholderEnd } from "../vim/operators.js";

//@ chunk-tzghj6zv.js:47769-47798 placement
function rHt() {
  return !renderWithForceUpdate(tE);
}
//@ chunk-tzghj6zv.js:47798-47802 placement
j();
/**
 * 按宽度硬换行文本，生成带起始偏移、是否换行开头/结尾的行信息，返回冻结的度量对象。
 */
//@ chunk-tzghj6zv.js:47802-48601 placement
function measureText(text, columns) {
  let max = Math.max(1, Math.floor(columns) || 1),
    wrapped = columns > 0 ? wrapAnsi(text, max, { hard: !0, trim: !1 }) : text,
    lines = [],
    searchFrom = 0,
    newlineIndex = -1,
    parts = wrapped.split(`
`);
  for (let row = 0; row < parts.length; row++) {
    let lineText = parts[row] ?? "";
    if (lineText.length === 0) {
      if (
        ((newlineIndex = text.indexOf(
          `
`,
          newlineIndex + 1,
        )),
        newlineIndex !== -1)
      ) {
        let oe = newlineIndex;
        lines.push(
          ar({
            text: lineText,
            startOffset: oe,
            isPrecededByNewline: sr(text, oe, row === 0),
            endsWithNewline: !0,
          }),
        );
      } else {
        let oe = text.length;
        lines.push(
          ar({
            text: lineText,
            startOffset: oe,
            isPrecededByNewline: sr(text, oe, row === 0),
            endsWithNewline: !1,
          }),
        );
      }
      continue;
    }
    let index = text.indexOf(lineText, searchFrom);
    if (index === -1) {
      let oe = searchFrom;
      (lines.push(
        ar({
          text: lineText,
          startOffset: oe,
          isPrecededByNewline: sr(text, oe, row === 0),
          endsWithNewline: !1,
        }),
      ),
        (searchFrom = oe + lineText.length));
      continue;
    }
    searchFrom = index + lineText.length;
    let lineEnd = index + lineText.length,
      endsWithNewline =
        lineEnd < text.length &&
        text[lineEnd] ===
          `
`;
    if (endsWithNewline) newlineIndex = lineEnd;
    lines.push(
      ar({
        text: lineText,
        startOffset: index,
        isPrecededByNewline: sr(text, index, row === 0),
        endsWithNewline: endsWithNewline,
      }),
    );
  }
  return Object.freeze({ text: text, columns: max, lines: Object.freeze(lines) });
}
//@ chunk-tzghj6zv.js:48601-48746 fingerprint = WrappedLine (0.613)
function WrappedLine(d, h) {
  let x = fo(h, 0, Math.max(0, d.lines.length - 1));
  return d.lines[x] ?? { text: "", startOffset: 0, isPrecededByNewline: !0, endsWithNewline: !1 };
}
/**
 * 把文本偏移换成换行后的行列位置（非换行开头的行忽略前导空白）。
 */
//@ chunk-tzghj6zv.js:48746-49198 placement
function offsetToPosition(d, h) {
  if (d.lines.length === 0) return { line: 0, column: 0 };
  let x = fo(h, 0, d.text.length);
  for (let M = 0; M < d.lines.length; M++) {
    let O = d.lines[M],
      I = d.lines[M + 1];
    if (x >= O.startOffset && (!I || x < I.startOffset)) {
      let V = x - O.startOffset,
        Y;
      if (O.isPrecededByNewline) Y = canYankPop(O.text, V);
      else {
        let N = O.text.length - O.text.trimStart().length;
        if (V < N) Y = 0;
        else Y = canYankPop(O.text.slice(N), V - N);
      }
      return { line: M, column: Y };
    }
  }
  let C = d.lines.length - 1,
    A = d.lines[C];
  return { line: C, column: bunStringWidth(A.text) };
}
//@ chunk-tzghj6zv.js:49198-49454 placement
function positionToOffset(d, h, x) {
  if (d.lines.length === 0) return 0;
  let C = WrappedLine(d, h);
  if (C.text.length === 0 && C.endsWithNewline) return C.startOffset;
  let A = C.isPrecededByNewline ? 0 : C.text.length - C.text.trimStart().length,
    M = getKillRingItem(C.text.slice(A), Math.max(0, x)) + A;
  return C.startOffset + M;
}
//@ chunk-tzghj6zv.js:49454-49540 placement
function canYankPop(d, h) {
  if (h <= 0) return 0;
  if (h >= d.length) return bunStringWidth(d);
  return bunStringWidth(d.slice(0, h));
}
//@ chunk-tzghj6zv.js:49540-49669 placement
function getKillRingItem(d, h) {
  if (h <= 0 || d.length === 0) return 0;
  let x = 0,
    C = 0;
  for (let A of d) {
    let M = bunStringWidth(A);
    if (x + M > h) break;
    ((x += M), (C += A.length));
  }
  return C;
}
//@ chunk-tzghj6zv.js:49669-49727 placement
function sr(d, h, x) {
  if (x) return !0;
  return (
    h > 0 &&
    d[h - 1] ===
      `
`
  );
}
//@ chunk-tzghj6zv.js:49727-49766 placement
function ar(d) {
  return Object.freeze(d);
}
//@ chunk-tzghj6zv.js:49766-49806 placement
function fo(d, h, x) {
  return d < h ? h : d > x ? x : d;
}
/**
 * 按显示宽度逐字素换行每个逻辑行，返回行信息（起始偏移、是否换行开头/结尾）。
 */
//@ chunk-7p2hc4jn.js:19779-20193 placement
function wrapByDisplayWidth(e, r) {
  let n = [],
    s = 0;
  for (let o of e.split(/\r\n|[\n\r]/)) {
    let u = 0,
      d = 0;
    for (let { segment: segment, index: index } of getGraphemeSegmenter().segment(o)) {
      let A = bunStringWidth(segment);
      if (d + A > r && index > u)
        (n.push({
          text: o.slice(u, index),
          startOffset: s + u,
          isPrecededByNewline: u === 0,
          endsWithNewline: !1,
        }),
          (u = index),
          (d = 0));
      d += A;
    }
    let h = s + o.length,
      x = e.startsWith(
        `\r
`,
        h,
      )
        ? 2
        : h < e.length
          ? 1
          : 0;
    (n.push({ text: o.slice(u), startOffset: s + u, isPrecededByNewline: u === 0, endsWithNewline: x > 0 }),
      (s = h + x));
  }
  return n;
}
/**
 * 输入框光标的单词与占位符正则：词字符、词、空白，以及粘贴/图片等占位符模式及其行首/行尾/全局正则与位置判断。
 */
//@ chunk-7p2hc4jn.js:20193-20518 placement
var WORD_CHAR_RE = /^[\p{L}\p{N}\p{M}_]+$/u,
  WORD_RE = /[\p{L}\p{N}][\p{L}\p{N}\p{M}]*/gu,
  WHITESPACE_RE = /\s/,
  PLACEHOLDER_PATTERN =
    "(?:\\[(?:Pasted text|Image|\\.\\.\\.Truncated text|\u2726 Team setup guide) #\\d+(?: \\+\\d+ lines)?\\.*\\]|\\[\u29C9 [^\\]\\n]+\\])",
  PLACEHOLDER_AT_END_RE = new RegExp(PLACEHOLDER_PATTERN + "$"),
  regExp = new RegExp("^" + PLACEHOLDER_PATTERN),
  isPlaceholderAt = (e, r) => e[r] === "[" && regExp.test(e.slice(r)),
  regExp_2 = new RegExp(PLACEHOLDER_PATTERN, "g");
//@ chunk-7p2hc4jn.js:20518-20581 placement
function rIs(e) {
  return e.replace(regExp_2, (r) => " ".repeat(r.length));
}
//@ chunk-7p2hc4jn.js:20581-20663 placement
var xJe = (e) => WORD_CHAR_RE.test(e),
  zWe = (e) => WHITESPACE_RE.test(e),
  qmt = (e) => e.length > 0 && !zWe(e) && !xJe(e);
/**
 * 输入框光标模型：基于按显示宽度换行的文本（MeasuredText），实现左右/上下/词移动、删除、kill ring、vim 动作等。
 */
//@ chunk-7p2hc4jn.js:20663-34257 fingerprint = Cursor (0.818)
class Cursor {
  measuredText;
  selection;
  offset;
  constructor(e, r = 0, n = 0) {
    this.measuredText = e;
    this.selection = n;
    this.offset = Math.max(0, Math.min(this.text.length, r));
  }
  static fromText(e, r, n = 0, s = 0) {
    return new Cursor(new MeasuredText(e, r - 1), n, s);
  }
  getViewportStartLine(e) {
    if (e === void 0 || e <= 0) return 0;
    let { line: line } = this.getPosition(),
      wrappedText = this.measuredText.getWrappedText();
    if (wrappedText.length <= e) return 0;
    let floored = Math.floor(e / 2),
      max = Math.max(0, line - floored),
      min = Math.min(wrappedText.length, max + e);
    if (min - max < e) max = Math.max(0, min - e);
    return max;
  }
  getRenderedRowStartOffsets(e) {
    let { startLine: startLine, endLine: endLine } = this.getViewportLineRange(e);
    return this.measuredText
      .getWrappedLines()
      .slice(startLine, endLine)
      .map((s) => s.displayStartOffset);
  }
  getViewportLineRange(e) {
    let r = this.measuredText.getWrappedLines().length,
      viewportStartLine = this.getViewportStartLine(e),
      s = e !== void 0 && e > 0 ? Math.min(r, viewportStartLine + e) : r;
    return { startLine: viewportStartLine, endLine: s };
  }
  render(e, r, n, s, o, u, d, h, x, T) {
    let wrappedLines = this.measuredText.getWrappedLines(),
      { startLine: startLine, endLine: endLine } = this.getViewportLineRange(o);
    if (u !== void 0) {
      let min = Math.min(u, this.offset),
        max = Math.max(u, this.offset),
        V = d ? this.findLogicalLineStart(min) : min,
        k = d ? this.findLogicalLineEnd(max) : this.measuredText.nextOffset(max);
      return wrappedLines.slice(startLine, endLine).map((Y, pe) => {
        let xe = (h ?? !1) && (Y.endsWithNewline || pe + startLine === wrappedLines.length - 1),
          { displayText: displayText, displayStartOffset: displayStartOffset } = Y,
          oe = displayStartOffset + displayText.length;
        if (k <= displayStartOffset || V >= oe) {
          if (displayStartOffset === oe && V <= displayStartOffset && (d ? k >= oe : k > oe))
            return (h ?? !1) ? "" : n(" ");
          return xe ? displayText : displayText.trimEnd();
        }
        if (displayStartOffset === oe) return (h ?? !1) ? "" : n(" ");
        let max = Math.max(0, V - displayStartOffset),
          min = Math.min(displayText.length, k - displayStartOffset);
        if (h ?? !1) {
          let M = xe ? displayText : displayText.trimEnd(),
            min_2 = Math.min(max, M.length),
            min_3 = Math.min(min, M.length);
          return (
            M.slice(0, min_2) +
            renderRowSpans(M, { from: min_2, to: min_3 }, n, {
              spans: x ?? [],
              rowStart: displayStartOffset,
            }) +
            M.slice(min_3)
          );
        }
        return (
          displayText.slice(0, max) +
          renderRowSpans(displayText, { from: max, to: min }, n, {
            spans: x ?? [],
            rowStart: displayStartOffset,
          }) +
          displayText.slice(min).trimEnd()
        );
      }).join(`
`);
    }
    let { line: line, column: column } = this.getPosition(),
      wrappedText = this.measuredText.getWrappedText(),
      wrappedLines_2 = this.measuredText.getWrappedLines();
    return wrappedText.slice(startLine, endLine).map((H, K) => {
      let V = K + startLine,
        k = (h ?? !1) && ((wrappedLines_2[V]?.endsWithNewline ?? !1) || V === wrappedText.length - 1),
        Y = H;
      if (r) {
        let list = Array.from(getGraphemeSegmenter().segment(H));
        if (V === wrappedText.length - 1 && !T) {
          let min = Math.min(6, list.length),
            re = list.length - min,
            B = list.length > min ? list[re].index : 0;
          Y = r.repeat(re) + H.slice(B);
        } else Y = r.repeat(list.length);
      }
      if (line !== V) return k ? Y : Y.trimEnd();
      let pe = "",
        xe = e,
        S = "",
        U = 0,
        oe = !1;
      for (let { segment: segment } of getGraphemeSegmenter().segment(Y)) {
        if (oe) {
          S += segment;
          continue;
        }
        let q = U + bunStringWidth(segment);
        if (q > column) ((xe = segment), (oe = !0));
        else ((U = q), (pe += segment));
      }
      let te,
        J = "";
      if (s && V === wrappedText.length - 1 && this.isAtEnd() && s.text.length > 0) {
        let M = firstGrapheme(s.text) || s.text[0];
        te = e ? n(M) : M;
        let sliced = s.text.slice(M.length);
        if (sliced.length > 0) J = s.dim(sliced);
      } else te = e ? n(xe) : xe;
      if (h && !k && e === "") return (pe + te + J + S).trimEnd();
      return pe + te + J + (k ? S : S.trimEnd());
    }).join(`
`);
  }
  left() {
    if (this.offset === 0) return this;
    let placeholderEndingAt = this.placeholderEndingAt(this.offset);
    if (placeholderEndingAt) return new Cursor(this.measuredText, placeholderEndingAt.start);
    let prevOffset = this.measuredText.prevOffset(this.offset);
    return new Cursor(this.measuredText, prevOffset);
  }
  right() {
    if (this.offset >= this.text.length) return this;
    let placeholderStartingAt = this.placeholderStartingAt(this.offset);
    if (placeholderStartingAt) return new Cursor(this.measuredText, placeholderStartingAt.end);
    let nextOffset = this.measuredText.nextOffset(this.offset);
    return new Cursor(this.measuredText, Math.min(nextOffset, this.text.length));
  }
  placeholderEndingAt(e) {
    if (this.text[e - 1] !== "]") return null;
    let match = this.text.slice(0, e).match(PLACEHOLDER_AT_END_RE);
    return match ? { start: e - match[0].length, end: e } : null;
  }
  placeholderStartingAt(e) {
    if (this.text[e] !== "[") return null;
    let match = this.text.slice(e).match(regExp);
    return match ? { start: e, end: e + match[0].length } : null;
  }
  placeholderContaining(e) {
    for (let r of this.text.matchAll(regExp_2)) {
      let index = r.index,
        s = index + r[0].length;
      if (e > index && e < s) return { start: index, end: s };
      if (index >= e) break;
    }
    return null;
  }
  snapOutOfPlaceholder(e, r) {
    let placeholderContaining = this.placeholderContaining(e);
    if (!placeholderContaining) return e;
    return r === "start" ? placeholderContaining.start : placeholderContaining.end;
  }
  up() {
    let { line: line, column: column } = this.getPosition();
    if (line === 0) return this;
    let n = this.measuredText.getWrappedText()[line - 1];
    if (n === void 0) return this;
    let s = bunStringWidth(n);
    if (column > s) {
      let offset = this.getOffset({ line: line - 1, column: s });
      return new Cursor(this.measuredText, offset, 0);
    }
    let offset = this.getOffset({ line: line - 1, column: column });
    return new Cursor(this.measuredText, offset, 0);
  }
  down() {
    let { line: line, column: column } = this.getPosition();
    if (line >= this.measuredText.lineCount - 1) return this;
    let n = this.measuredText.getWrappedText()[line + 1];
    if (n === void 0) return this;
    let s = bunStringWidth(n);
    if (column > s) {
      let offset = this.getOffset({ line: line + 1, column: s });
      return new Cursor(this.measuredText, offset, 0);
    }
    let offset = this.getOffset({ line: line + 1, column: column });
    return new Cursor(this.measuredText, offset, 0);
  }
  startOfCurrentLine() {
    let { line: line } = this.getPosition();
    return new Cursor(this.measuredText, this.getOffset({ line: line, column: 0 }), 0);
  }
  startOfLine() {
    let { line: line, column: column } = this.getPosition();
    if (column === 0 && line > 0)
      return new Cursor(this.measuredText, this.getOffset({ line: line - 1, column: 0 }), 0);
    return this.startOfCurrentLine();
  }
  firstNonBlankInLine() {
    let { line: line } = this.getPosition(),
      match = (this.measuredText.getWrappedText()[line] || "").match(/^\s*\S/),
      s = match?.index ? match.index + match[0].length - 1 : 0,
      offset = this.getOffset({ line: line, column: s });
    return new Cursor(this.measuredText, offset, 0);
  }
  endOfLine() {
    let { line: line, column: column } = this.getPosition(),
      lineLength = this.measuredText.getLineLength(line);
    if (column >= lineLength && line < this.measuredText.lineCount - 1) {
      let lineLength = this.measuredText.getLineLength(line + 1),
        offset = this.getOffset({ line: line + 1, column: lineLength });
      return new Cursor(this.measuredText, offset, 0);
    }
    let offset = this.getOffset({ line: line, column: lineLength });
    return new Cursor(this.measuredText, offset, 0);
  }
  findLogicalLineStart(e = this.offset) {
    if (e === 0) return 0;
    let index = this.text.lastIndexOf(
      `
`,
      e - 1,
    );
    return index === -1 ? 0 : index + 1;
  }
  findLogicalLineEnd(e = this.offset) {
    let index = this.text.indexOf(
      `
`,
      e,
    );
    return index === -1 ? this.text.length : index;
  }
  getLogicalLineBounds() {
    return { start: this.findLogicalLineStart(), end: this.findLogicalLineEnd() };
  }
  createCursorWithColumn(e, r, n) {
    let s = r - e,
      min = Math.min(n, s),
      u = e + min,
      snapToGraphemeBoundary = this.measuredText.snapToGraphemeBoundary(u);
    return new Cursor(this.measuredText, snapToGraphemeBoundary, 0);
  }
  endOfLogicalLine() {
    return new Cursor(this.measuredText, this.findLogicalLineEnd(), 0);
  }
  lastCharInLogicalLine() {
    let logicalLineStart = this.findLogicalLineStart(),
      logicalLineEnd = this.findLogicalLineEnd(),
      n = logicalLineEnd > logicalLineStart ? this.measuredText.prevOffset(logicalLineEnd) : logicalLineStart;
    return new Cursor(this.measuredText, n, 0);
  }
  startOfLogicalLine() {
    return new Cursor(this.measuredText, this.findLogicalLineStart(), 0);
  }
  firstNonBlankInLogicalLine() {
    let { start: start, end: end } = this.getLogicalLineBounds(),
      match = this.text.slice(start, end).match(/\S/),
      o = start + (match?.index ?? 0);
    return new Cursor(this.measuredText, o, 0);
  }
  upLogicalLine() {
    let { start: start } = this.getLogicalLineBounds();
    if (start === 0) return new Cursor(this.measuredText, 0, 0);
    let r = this.offset - start,
      n = start - 1,
      logicalLineStart = this.findLogicalLineStart(n);
    return this.createCursorWithColumn(logicalLineStart, n, r);
  }
  downLogicalLine() {
    let { start: start, end: end } = this.getLogicalLineBounds();
    if (end >= this.text.length) return new Cursor(this.measuredText, this.text.length, 0);
    let n = this.offset - start,
      s = end + 1,
      logicalLineEnd = this.findLogicalLineEnd(s);
    return this.createCursorWithColumn(s, logicalLineEnd, n);
  }
  forwardWord() {
    if (this.isAtEnd()) return this;
    let e = this.placeholderStartingAt(this.offset) ?? this.placeholderContaining(this.offset);
    if (e) return new Cursor(this.measuredText, e.end);
    for (let r of this.measuredText.getReadlineWordBoundaries())
      if (r.end > this.offset) {
        let snapOutOfPlaceholder = this.snapOutOfPlaceholder(r.end, "end");
        return new Cursor(this.measuredText, snapOutOfPlaceholder);
      }
    return new Cursor(this.measuredText, this.text.length);
  }
  backwardWord() {
    if (this.isAtStart()) return this;
    let e = this.placeholderEndingAt(this.offset) ?? this.placeholderContaining(this.offset);
    if (e) return new Cursor(this.measuredText, e.start);
    let readlineWordBoundaries = this.measuredText.getReadlineWordBoundaries();
    for (let n = readlineWordBoundaries.length - 1; n >= 0; n--) {
      let s = readlineWordBoundaries[n];
      if (s.start < this.offset) {
        let snapOutOfPlaceholder = this.snapOutOfPlaceholder(s.start, "start");
        return new Cursor(this.measuredText, snapOutOfPlaceholder);
      }
    }
    return new Cursor(this.measuredText, 0);
  }
  killWord() {
    let forwardWord = this.forwardWord();
    if (forwardWord.offset === this.offset) return { cursor: this, killed: "" };
    return this.killRange(this.offset, forwardWord.offset);
  }
  backwardKillWord() {
    let backwardWord = this.backwardWord();
    if (backwardWord.offset === this.offset) return { cursor: this, killed: "" };
    return this.killRange(backwardWord.offset, this.offset);
  }
  nextVimWord() {
    if (this.isAtEnd()) return this;
    let e = this.placeholderStartingAt(this.offset) ?? this.placeholderContaining(this.offset);
    if (e) return new Cursor(this.measuredText, this.skipBlanks(e.end));
    let offset = this.offset,
      n = (o) => this.measuredText.nextOffset(o),
      graphemeAt = this.graphemeAt(offset);
    if (!graphemeAt) return this;
    if (this.isOnEmptyLine(offset)) offset = n(offset);
    else if (xJe(graphemeAt))
      while (offset < this.text.length && xJe(this.graphemeAt(offset))) offset = n(offset);
    else if (qmt(graphemeAt))
      while (offset < this.text.length && qmt(this.graphemeAt(offset))) offset = n(offset);
    return new Cursor(this.measuredText, this.snapOutOfPlaceholder(this.skipBlanks(offset), "end"));
  }
  skipBlanks(e) {
    let r = e;
    while (r < this.text.length && WHITESPACE_RE.test(this.graphemeAt(r)) && !this.isOnEmptyLine(r))
      r = this.measuredText.nextOffset(r);
    return r;
  }
  isOnEmptyLine(e) {
    return (
      this.text[e] ===
        `
` &&
      (e === 0 ||
        this.text[e - 1] ===
          `
`)
    );
  }
  endOfVimWord() {
    if (this.isAtEnd()) return this;
    let e = this.placeholderStartingAt(this.offset) ?? this.placeholderContaining(this.offset);
    if (e && this.offset < e.end - 1) return new Cursor(this.measuredText, e.end - 1);
    let text = this.text,
      offset = this.offset,
      s = (d) => this.measuredText.nextOffset(d);
    if (this.graphemeAt(offset) === "") return this;
    offset = s(offset);
    while (offset < text.length && WHITESPACE_RE.test(this.graphemeAt(offset))) offset = s(offset);
    if (offset >= text.length) return new Cursor(this.measuredText, text.length);
    let graphemeAt = this.graphemeAt(offset);
    if (xJe(graphemeAt))
      while (offset < text.length) {
        let d = s(offset);
        if (d >= text.length || !xJe(this.graphemeAt(d))) break;
        offset = d;
      }
    else if (qmt(graphemeAt))
      while (offset < text.length) {
        let d = s(offset);
        if (d >= text.length || !qmt(this.graphemeAt(d))) break;
        offset = d;
      }
    let u = this.placeholderStartingAt(offset) ?? this.placeholderContaining(offset);
    if (u) offset = u.end - 1;
    return new Cursor(this.measuredText, offset);
  }
  prevVimWord() {
    if (this.isAtStart()) return this;
    let placeholderEndingAt = this.placeholderEndingAt(this.offset);
    if (placeholderEndingAt) return new Cursor(this.measuredText, placeholderEndingAt.start);
    let placeholderContaining = this.placeholderContaining(this.offset);
    if (placeholderContaining) return new Cursor(this.measuredText, placeholderContaining.start);
    let offset = this.offset,
      s = (u) => this.measuredText.prevOffset(u);
    offset = s(offset);
    while (offset > 0 && WHITESPACE_RE.test(this.graphemeAt(offset))) offset = s(offset);
    if (offset === 0 && WHITESPACE_RE.test(this.graphemeAt(0))) return new Cursor(this.measuredText, 0);
    let graphemeAt = this.graphemeAt(offset);
    if (xJe(graphemeAt))
      while (offset > 0) {
        let u = s(offset);
        if (!xJe(this.graphemeAt(u))) break;
        offset = u;
      }
    else if (qmt(graphemeAt))
      while (offset > 0) {
        let u = s(offset);
        if (!qmt(this.graphemeAt(u))) break;
        offset = u;
      }
    return new Cursor(this.measuredText, this.snapOutOfPlaceholder(offset, "start"));
  }
  nextWORD() {
    let e = this;
    if (this.isOnEmptyLine(this.offset)) e = this.right();
    else while (!e.isOverWhitespace() && !e.isAtEnd()) e = e.right();
    while (e.isOverWhitespace() && !e.isAtEnd() && !this.isOnEmptyLine(e.offset)) e = e.right();
    return e;
  }
  endOfWORD() {
    if (this.isAtEnd()) return this;
    let e = this.placeholderStartingAt(this.offset) ?? this.placeholderContaining(this.offset);
    if (e && this.offset < e.end - 1) return new Cursor(this.measuredText, e.end - 1);
    let r = this;
    if (!r.isOverWhitespace() && (r.right().isOverWhitespace() || r.right().isAtEnd()))
      return ((r = r.right()), r.endOfWORD());
    if (r.isOverWhitespace()) {
      while (r.isOverWhitespace() && !r.isAtEnd()) r = r.nextWORD();
      let placeholderStartingAt = r.placeholderStartingAt(r.offset);
      if (placeholderStartingAt) return new Cursor(this.measuredText, placeholderStartingAt.end - 1);
    }
    while (!r.right().isOverWhitespace() && !r.isAtEnd()) r = r.right();
    return r;
  }
  prevWORD() {
    let e = this;
    if (e.left().isOverWhitespace()) e = e.left();
    while (e.isOverWhitespace() && !e.isAtStart()) e = e.left();
    if (!e.isOverWhitespace()) while (!e.left().isOverWhitespace() && !e.isAtStart()) e = e.left();
    return e;
  }
  modifyText(e, r = "") {
    let offset = this.offset,
      offset_2 = e.offset,
      o = this.text.slice(0, offset) + r,
      u = o + this.text.slice(offset_2),
      d = o.normalize("NFC").length,
      fromText = Cursor.fromText(u, this.columns, d),
      x = d !== offset + r.normalize("NFC").length,
      { measuredText: measuredText, offset: offset_3 } = fromText;
    if (x && measuredText.snapToGraphemeBoundary(offset_3) !== offset_3)
      return new Cursor(measuredText, measuredText.nextOffset(offset_3));
    return fromText;
  }
  insert(e) {
    return this.modifyText(this, e);
  }
  del() {
    if (this.isAtEnd()) return this;
    return this.modifyText(this.right());
  }
  backspace() {
    if (this.isAtStart()) return this;
    return this.left().modifyText(this);
  }
  deleteToLineStart(e) {
    if (
      this.offset > 0 &&
      this.text[this.offset - 1] ===
        `
`
    )
      return {
        cursor: this.left().modifyText(this),
        killed: `
`,
      };
    let r = e ?? this.startOfLine();
    return this.killRange(r.offset, this.offset);
  }
  deleteToLineEnd(e) {
    if (
      this.text[this.offset] ===
      `
`
    )
      return {
        cursor: this.modifyText(this.right()),
        killed: `
`,
      };
    return this.killRange(this.offset, (e ?? this.endOfLine()).offset);
  }
  deleteToLogicalLineEnd() {
    if (
      this.text[this.offset] ===
      `
`
    )
      return this.modifyText(this.right());
    return this.killRange(this.offset, this.endOfLogicalLine().offset).cursor;
  }
  deleteWORDBefore() {
    if (this.isAtStart()) return { cursor: this, killed: "" };
    return this.killRange(this.prevWORD().offset, this.offset);
  }
  killRange(e, r) {
    let snapOutOfPlaceholder = this.snapOutOfPlaceholder(e, "start"),
      snapOutOfPlaceholder_2 = this.snapOutOfPlaceholder(r, "end"),
      o = new Cursor(this.measuredText, snapOutOfPlaceholder),
      u = new Cursor(this.measuredText, snapOutOfPlaceholder_2);
    return { cursor: o.modifyText(u), killed: this.text.slice(snapOutOfPlaceholder, snapOutOfPlaceholder_2) };
  }
  graphemeAt(e) {
    if (e >= this.text.length) return "";
    let nextOffset = this.measuredText.nextOffset(e);
    return this.text.slice(e, nextOffset);
  }
  isOverWhitespace() {
    let e = this.text[this.offset] ?? "";
    return /\s/.test(e);
  }
  equals(e) {
    return this.offset === e.offset && this.measuredText === e.measuredText;
  }
  isAtStart() {
    return this.offset === 0;
  }
  isAtEnd() {
    return this.offset >= this.text.length;
  }
  startOfFirstLine() {
    return new Cursor(this.measuredText, 0, 0);
  }
  startOfLastLine() {
    let index = this.text.lastIndexOf(`
`);
    if (index === -1) return this.startOfLine();
    return new Cursor(this.measuredText, index + 1, 0);
  }
  goToLine(e) {
    let parts = this.text.split(`
`),
      min = Math.min(Math.max(0, e - 1), parts.length - 1),
      s = 0;
    for (let o = 0; o < min; o++) s += (parts[o]?.length ?? 0) + 1;
    return new Cursor(this.measuredText, s, 0);
  }
  endOfFile() {
    return new Cursor(this.measuredText, this.text.length, 0);
  }
  get text() {
    return this.measuredText.text;
  }
  get columns() {
    return this.measuredText.columns + 1;
  }
  getPosition() {
    return this.measuredText.getPositionFromOffset(this.offset);
  }
  getOffset(e) {
    return this.measuredText.getOffsetFromPosition(e);
  }
  findCharacter(e, r, n = 1) {
    let s = r === "f" || r === "t",
      o = r === "t" || r === "T",
      u = 0;
    if (s) {
      let logicalLineEnd = this.findLogicalLineEnd(),
        nextOffset = this.measuredText.nextOffset(this.offset);
      while (nextOffset < logicalLineEnd) {
        if (this.graphemeAt(nextOffset) === e) {
          if ((u++, u === n))
            return o ? Math.max(this.offset, this.measuredText.prevOffset(nextOffset)) : nextOffset;
        }
        nextOffset = this.measuredText.nextOffset(nextOffset);
      }
    } else {
      let logicalLineStart = this.findLogicalLineStart();
      if (this.offset <= logicalLineStart) return null;
      let prevOffset = this.measuredText.prevOffset(this.offset);
      while (prevOffset >= logicalLineStart) {
        if (this.graphemeAt(prevOffset) === e) {
          if ((u++, u === n))
            return o ? Math.min(this.offset, this.measuredText.nextOffset(prevOffset)) : prevOffset;
        }
        if (prevOffset === logicalLineStart) break;
        prevOffset = this.measuredText.prevOffset(prevOffset);
      }
    }
    return null;
  }
}
/**
 * 换行后的一行：原文、起始偏移、是否换行开头/结尾，以及去掉前导空白的显示文本。
 */
//@ chunk-7p2hc4jn.js:34257-34619 layout
class MeasuredLine {
  text;
  startOffset;
  isPrecededByNewline;
  endsWithNewline;
  displayText;
  displayStartOffset;
  constructor(e, r, n, s) {
    this.text = e;
    this.startOffset = r;
    this.isPrecededByNewline = n;
    this.endsWithNewline = s;
    ((this.displayText = n ? e : e.trimStart()),
      (this.displayStartOffset = r + (e.length - this.displayText.length)));
  }
  equals(e) {
    return this.text === e.text && this.startOffset === e.startOffset;
  }
}
/**
 * 按终端宽度换行并缓存行信息的文本，提供偏移与行列互转。
 */
//@ chunk-7p2hc4jn.js:34619-38481 fingerprint = MeasuredText (0.898)
class MeasuredText {
  columns;
  _wrappedLines;
  text;
  navigationCache;
  graphemeBoundaries;
  constructor(e, r) {
    this.columns = r;
    ((this.text = e.normalize("NFC")), (this.navigationCache = new Map()));
  }
  get wrappedLines() {
    if (!this._wrappedLines) {
      let { rows: rows, degraded: degraded } = wrapTextRows(this.text, this.columns);
      if (degraded) logWrapFallbackOnce(this.columns, this.text.length);
      this._wrappedLines = rows.map(
        (n) => new MeasuredLine(n.text, n.startOffset, n.isPrecededByNewline, n.endsWithNewline),
      );
    }
    return this._wrappedLines;
  }
  getGraphemeBoundaries() {
    if (!this.graphemeBoundaries) {
      this.graphemeBoundaries = [];
      for (let { index: index } of getGraphemeSegmenter().segment(this.text))
        this.graphemeBoundaries.push(index);
      this.graphemeBoundaries.push(this.text.length);
    }
    return this.graphemeBoundaries;
  }
  wordBoundariesCache;
  getWordBoundaries() {
    if (!this.wordBoundariesCache) {
      this.wordBoundariesCache = [];
      for (let e of getWordSegmenter().segment(this.text))
        this.wordBoundariesCache.push({ start: e.index, end: e.index + e.segment.length });
    }
    return this.wordBoundariesCache;
  }
  readlineWordBoundariesCache;
  getReadlineWordBoundaries() {
    if (!this.readlineWordBoundariesCache) {
      let e = [],
        r = !1;
      for (let n of this.getWordBoundaries()) {
        let sliced = this.text.slice(n.start, n.end);
        for (let o of sliced.matchAll(WORD_RE)) {
          let snapToGraphemeBoundary = this.snapToGraphemeBoundary(n.start + o.index),
            d = n.start + o.index + o[0].length,
            snapToGraphemeBoundary_2 = this.snapToGraphemeBoundary(d),
            x = snapToGraphemeBoundary_2 === d ? d : this.nextOffset(snapToGraphemeBoundary_2),
            at = e.at(-1);
          if (at && (snapToGraphemeBoundary < at.end || (snapToGraphemeBoundary === at.end && r)))
            at.end = Math.max(at.end, x);
          else e.push({ start: snapToGraphemeBoundary, end: x });
          r = x !== d;
        }
      }
      this.readlineWordBoundariesCache = e;
    }
    return this.readlineWordBoundariesCache;
  }
  binarySearchBoundary(e, r, n) {
    let s = 0,
      o = e.length - 1,
      u = n ? this.text.length : 0;
    while (s <= o) {
      let floored = Math.floor((s + o) / 2),
        h = e[floored];
      if (h === void 0) break;
      if (n)
        if (h > r) ((u = h), (o = floored - 1));
        else s = floored + 1;
      else if (h < r) ((u = h), (s = floored + 1));
      else o = floored - 1;
    }
    return u;
  }
  stringIndexToDisplayWidth(e, r) {
    if (r <= 0) return 0;
    if (r >= e.length) return bunStringWidth(e);
    return bunStringWidth(e.substring(0, r));
  }
  displayWidthToStringIndex(e, r) {
    if (r <= 0) return 0;
    if (!e) return 0;
    if (e === this.text) return this.offsetAtDisplayWidth(r);
    let n = 0,
      s = 0;
    for (let { segment: segment, index: index } of getGraphemeSegmenter().segment(e)) {
      let d = bunStringWidth(segment);
      if (n + d > r) break;
      ((n += d), (s = index + segment.length));
    }
    return s;
  }
  offsetAtDisplayWidth(e) {
    if (e <= 0) return 0;
    let r = 0,
      graphemeBoundaries = this.getGraphemeBoundaries();
    for (let s = 0; s < graphemeBoundaries.length - 1; s++) {
      let o = graphemeBoundaries[s],
        u = graphemeBoundaries[s + 1];
      if (o === void 0 || u === void 0) continue;
      let substring = this.text.substring(o, u),
        h = bunStringWidth(substring);
      if (r + h > e) return o;
      r += h;
    }
    return this.text.length;
  }
  getWrappedText() {
    return this.wrappedLines.map((wrappedLine) => wrappedLine.displayText);
  }
  getWrappedLines() {
    return this.wrappedLines;
  }
  getLine(e) {
    let wrappedLines = this.wrappedLines;
    return wrappedLines[Math.max(0, Math.min(e, wrappedLines.length - 1))];
  }
  getOffsetFromPosition(e) {
    let line = this.getLine(e.line);
    if (line.text.length === 0 && line.endsWithNewline) return line.startOffset;
    let n = line.displayStartOffset - line.startOffset,
      s = e.column + n,
      displayWidthToStringIndex = this.displayWidthToStringIndex(line.text, s),
      u = line.startOffset + displayWidthToStringIndex;
    return this.snapToGraphemeBoundary(u);
  }
  getLineLength(e) {
    let line = this.getLine(e);
    return bunStringWidth(line.text);
  }
  getPositionFromOffset(e) {
    let wrappedLines = this.wrappedLines;
    for (let o = 0; o < wrappedLines.length; o++) {
      let u = wrappedLines[o],
        d = wrappedLines[o + 1];
      if (e >= u.startOffset && (!d || e < d.startOffset)) {
        let h = e - u.startOffset,
          x;
        if (u.isPrecededByNewline) x = this.stringIndexToDisplayWidth(u.text, h);
        else {
          let T = u.displayStartOffset - u.startOffset;
          if (h < T) x = 0;
          else {
            let displayText = u.displayText,
              A = h - T;
            x = this.stringIndexToDisplayWidth(displayText, A);
          }
        }
        return { line: o, column: Math.max(0, x) };
      }
    }
    let n = wrappedLines.length - 1,
      s = this.wrappedLines[n];
    return { line: n, column: bunStringWidth(s.text) };
  }
  get lineCount() {
    return this.wrappedLines.length;
  }
  withCache(e, r) {
    let n = this.navigationCache.get(e);
    if (n !== void 0) return n;
    let s = r();
    return (this.navigationCache.set(e, s), s);
  }
  nextOffset(e) {
    return this.withCache(`next:${e}`, () => {
      let graphemeBoundaries = this.getGraphemeBoundaries();
      return this.binarySearchBoundary(graphemeBoundaries, e, !0);
    });
  }
  prevOffset(e) {
    if (e <= 0) return 0;
    return this.withCache(`prev:${e}`, () => {
      let graphemeBoundaries = this.getGraphemeBoundaries();
      return this.binarySearchBoundary(graphemeBoundaries, e, !1);
    });
  }
  snapToGraphemeBoundary(e) {
    if (e <= 0) return 0;
    if (e >= this.text.length) return this.text.length;
    let graphemeBoundaries = this.getGraphemeBoundaries(),
      n = 0,
      s = graphemeBoundaries.length - 1;
    while (n < s) {
      let o = (n + s + 1) >> 1;
      if (graphemeBoundaries[o] <= e) n = o;
      else s = o - 1;
    }
    return graphemeBoundaries[n];
  }
}
//@ chunk-7p2hc4jn.js:38481-38712 affinity
function renderRowSpans(e, { from: from, to: to }, s, { spans: spans, rowStart: rowStart }) {
  let d = from,
    h = "";
  for (let x of spans) {
    let max = Math.max(d, x.start - rowStart),
      min = Math.min(to, x.end - rowStart);
    if (min <= max) continue;
    ((h += (max > d ? s(e.slice(d, max)) : "") + e.slice(max, min)), (d = min));
  }
  return d === from || to > d ? h + s(e.slice(d, to)) : h;
}
/**
 * 光标所在逻辑行的显示列（制表符按 tab stop 计）。
 */
//@ chunk-530hfzwb.js:745-927 placement
function getCursorDisplayColumn(e, t) {
  if (t?.offset === e.offset && t.text === e.text) return t.column;
  let offset = e.startOfLogicalLine().offset,
    n = truncateToWidth(e.text, offset, e.offset);
  return e.text[e.offset] === "\t" ? n + charDisplayWidth("\t", n) - 1 : n;
}
/**
 * 从起点累加显示宽度，超过宽度时返回该处偏移（误配名）。
 */
//@ chunk-530hfzwb.js:1022-1145 placement = truncateStartToWidth (1)
function truncateStartToWidth(e, t, r, n) {
  let width = 0;
  for (let { segment: segment, index: index } of getGraphemeSegmenter().segment(e.slice(t, r)))
    if (((width += charDisplayWidth(segment, width)), width > n)) return t + index;
  return r;
}
//@ chunk-530hfzwb.js:1145-1194 placement
function charDisplayWidth(e, t) {
  return e === "\t" ? DEFAULT_TAB_WIDTH - (t % DEFAULT_TAB_WIDTH) : bunStringWidth(e);
}
/**
 * 返回行首空白之后第一个非空白字符的偏移（误配名 wrapText）。
 */
//@ chunk-530hfzwb.js:19092-19200 placement = wrapText (1)
function wrapText(e) {
  let currentWidth = 0;
  for (let { segment: segment, index: index } of getGraphemeSegmenter().segment(e))
    if (((currentWidth = index), segment !== " " && segment !== "\t")) break;
  return currentWidth;
}
/**
 * 按逻辑行移动光标并保持期望列（误配名 truncatePathMiddle，属输入框光标）。
 */
//@ chunk-530hfzwb.js:28612-28975 placement = truncatePathMiddle (0.223)
function truncatePathMiddle(e, t, r) {
  let { cursor: cursor } = r,
    text = cursor.text,
    offset = cursor.startOfLogicalLine().offset,
    i = getCursorDisplayColumn(cursor, r.wantedColumn),
    u = offset;
  for (let h = 0; h < t; h++)
    if (e) {
      let index = text.indexOf(
        `
`,
        u,
      );
      if (index === -1) break;
      u = index + 1;
    } else if (u === 0) break;
    else
      u =
        u === 1
          ? 0
          : text.lastIndexOf(
              `
`,
              u - 2,
            ) + 1;
  if (u === offset) return { offset: null, column: i };
  let index = text.indexOf(
      `
`,
      u,
    ),
    d = index === -1 ? text.length : index,
    p = truncateStartToWidth(text, u, d, i);
  return { offset: snapToPlaceholderEnd(cursor, p, u), column: i };
}
//@ chunk-4121qate.js:76332-76361 fingerprint = pushToKillRing (0.819)
var pushToKillRing = ["prepend", "append"];

export {
  Cursor,
  isPlaceholderAt,
  rHt,
  measureText,
  charDisplayWidth,
  zWe,
  qmt,
  xJe,
  rIs,
  truncateStartToWidth,
  getCursorDisplayColumn,
  wrapText,
  truncatePathMiddle,
  wrapByDisplayWidth,
  offsetToPosition,
  positionToOffset,
  pushToKillRing,
};
