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
import { currentToolPermissionContext } from "./permissions/currentPermissionContext.js";
import { init_react_production } from "../../vendor/react/cjs/react.production.js";
import { wrapAnsi, DEFAULT_TAB_WIDTH } from "../ink/wrapAnsi.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { getGraphemeSegmenter, firstGrapheme, getWordSegmenter } from "./intl.js";
import { wrapTextRows } from "./textWrap.js";
import { logWrapFallbackOnce } from "../hooks/useTextInput.js";
import { truncateToWidth } from "./truncate.js";
import { snapToPlaceholderEnd } from "../vim/operators.js";

//@ chunk-tzghj6zv.js:47769-47798 placement
/**
 * 是否处于“不强制重渲染”的模式。
 */
function isNoForceUpdateRenders() {
  return !renderWithForceUpdate(currentToolPermissionContext);
}
//@ chunk-tzghj6zv.js:47798-47802 placement
init_react_production();
//@ chunk-tzghj6zv.js:47802-48601 placement
/**
 * 按宽度硬换行文本，生成带起始偏移、是否换行开头/结尾的行信息，返回冻结的度量对象。
 */
function measureText(text, columns) {
  let max = Math.max(1, Math.floor(columns) || 1);
  let wrapped =
    columns > 0
      ? wrapAnsi(text, max, {
          hard: true,
          trim: false,
        })
      : text;
  let lines = [];
  let searchFrom = 0;
  let newlineIndex = -1;
  let lines_2 = wrapped.split(`
`);
  for (let row = 0; row < lines_2.length; row++) {
    let lineText = lines_2[row] ?? "";
    if (lineText.length === 0) {
      newlineIndex = text.indexOf(
        `
`,
        newlineIndex + 1,
      );
      if (newlineIndex !== -1) {
        let oe = newlineIndex;
        lines.push(
          freezeLineInfo({
            text: lineText,
            startOffset: oe,
            isPrecededByNewline: isPrecededByNewline(text, oe, row === 0),
            endsWithNewline: true,
          }),
        );
      } else {
        let oe = text.length;
        lines.push(
          freezeLineInfo({
            text: lineText,
            startOffset: oe,
            isPrecededByNewline: isPrecededByNewline(text, oe, row === 0),
            endsWithNewline: false,
          }),
        );
      }
      continue;
    }
    let index = text.indexOf(lineText, searchFrom);
    if (index === -1) {
      let oe = searchFrom;
      lines.push(
        freezeLineInfo({
          text: lineText,
          startOffset: oe,
          isPrecededByNewline: isPrecededByNewline(text, oe, row === 0),
          endsWithNewline: false,
        }),
      );
      searchFrom = oe + lineText.length;
      continue;
    }
    searchFrom = index + lineText.length;
    let lineEnd = index + lineText.length;
    let endsWithNewline =
      lineEnd < text.length &&
      text[lineEnd] ===
        `
`;
    if (endsWithNewline) newlineIndex = lineEnd;
    lines.push(
      freezeLineInfo({
        text: lineText,
        startOffset: index,
        isPrecededByNewline: isPrecededByNewline(text, index, row === 0),
        endsWithNewline,
      }),
    );
  }
  return Object.freeze({
    text,
    columns: max,
    lines: Object.freeze(lines),
  });
}
//@ chunk-tzghj6zv.js:48601-48746 fingerprint = WrappedLine (0.613)
function WrappedLine(d, h) {
  let x = clampIndex(h, 0, Math.max(0, d.lines.length - 1));
  return (
    d.lines[x] ?? {
      text: "",
      startOffset: 0,
      isPrecededByNewline: true,
      endsWithNewline: false,
    }
  );
}
//@ chunk-tzghj6zv.js:48746-49198 placement
/**
 * 把文本偏移换成换行后的行列位置（非换行开头的行忽略前导空白）。
 */
function offsetToPosition(d, h) {
  if (d.lines.length === 0)
    return {
      line: 0,
      column: 0,
    };
  let x = clampIndex(h, 0, d.text.length);
  for (let idx = 0; idx < d.lines.length; idx++) {
    let O = d.lines[idx];
    let I = d.lines[idx + 1];
    if (x >= O.startOffset && (!I || x < I.startOffset)) {
      let index = x - O.startOffset;
      let Y;
      if (O.isPrecededByNewline) Y = canYankPop(O.text, index);
      else {
        let N = O.text.length - O.text.trimStart().length;
        if (index < N) Y = 0;
        else Y = canYankPop(O.text.slice(N), index - N);
      }
      return {
        line: idx,
        column: Y,
      };
    }
  }
  let C = d.lines.length - 1;
  let A = d.lines[C];
  return {
    line: C,
    column: bunStringWidth(A.text),
  };
}
//@ chunk-tzghj6zv.js:49198-49454 placement
function positionToOffset(d, h, x) {
  if (d.lines.length === 0) return 0;
  let C = WrappedLine(d, h);
  if (C.text.length === 0 && C.endsWithNewline) return C.startOffset;
  let A = C.isPrecededByNewline ? 0 : C.text.length - C.text.trimStart().length;
  let M = getKillRingItem(C.text.slice(A), Math.max(0, x)) + A;
  return C.startOffset + M;
}
//@ chunk-tzghj6zv.js:49454-49540 placement
function canYankPop(text, index) {
  if (index <= 0) return 0;
  if (index >= text.length) return bunStringWidth(text);
  return bunStringWidth(text.slice(0, index));
}
//@ chunk-tzghj6zv.js:49540-49669 placement
function getKillRingItem(d, h) {
  if (h <= 0 || d.length === 0) return 0;
  let x = 0;
  let C = 0;
  for (let A of d) {
    let M = bunStringWidth(A);
    if (x + M > h) break;
    x += M;
    C += A.length;
  }
  return C;
}
//@ chunk-tzghj6zv.js:49669-49727 placement
/**
 * 判断某位置的前一个字符是否为换行（行首）。
 */
function isPrecededByNewline(text, h, x) {
  if (x) return true;
  return (
    h > 0 &&
    text[h - 1] ===
      `
`
  );
}
//@ chunk-tzghj6zv.js:49727-49766 placement
/**
 * 冻结行信息对象，防止被修改。
 */
function freezeLineInfo(d) {
  return Object.freeze(d);
}
//@ chunk-tzghj6zv.js:49766-49806 placement
/**
 * 把索引限制在 [min, max] 区间内。
 */
function clampIndex(d, h, x) {
  return d < h ? h : d > x ? x : d;
}
//@ chunk-7p2hc4jn.js:19779-20193 placement
/**
 * 按显示宽度逐字素换行每个逻辑行，返回行信息（起始偏移、是否换行开头/结尾）。
 */
function wrapByDisplayWidth(e, r) {
  let n = [];
  let s = 0;
  for (let line of e.split(/\r\n|[\n\r]/)) {
    let u = 0;
    let d = 0;
    for (let { segment, index } of getGraphemeSegmenter().segment(line)) {
      let A = bunStringWidth(segment);
      if (d + A > r && index > u) {
        n.push({
          text: line.slice(u, index),
          startOffset: s + u,
          isPrecededByNewline: u === 0,
          endsWithNewline: false,
        });
        u = index;
        d = 0;
      }
      d += A;
    }
    let h = s + line.length;
    let x = e.startsWith(
      `\r
`,
      h,
    )
      ? 2
      : h < e.length
        ? 1
        : 0;
    n.push({
      text: line.slice(u),
      startOffset: s + u,
      isPrecededByNewline: u === 0,
      endsWithNewline: x > 0,
    });
    s = h + x;
  }
  return n;
}
//@ chunk-7p2hc4jn.js:20193-20518 placement
/**
 * 输入框光标的单词与占位符正则：词字符、词、空白，以及粘贴/图片等占位符模式及其行首/行尾/全局正则与位置判断。
 */
var WORD_CHAR_RE = /^[\p{L}\p{N}\p{M}_]+$/u;
var WORD_RE = /[\p{L}\p{N}][\p{L}\p{N}\p{M}]*/gu;
var WHITESPACE_RE = /\s/;
var PLACEHOLDER_PATTERN =
  "(?:\\[(?:Pasted text|Image|\\.\\.\\.Truncated text|\u2726 Team setup guide) #\\d+(?: \\+\\d+ lines)?\\.*\\]|\\[\u29C9 [^\\]\\n]+\\])";
var PLACEHOLDER_AT_END_RE = new RegExp(PLACEHOLDER_PATTERN + "$");
var regExp = new RegExp("^" + PLACEHOLDER_PATTERN);
var isPlaceholderAt = (e, r) => e[r] === "[" && regExp.test(e.slice(r));
var regExp_2 = new RegExp(PLACEHOLDER_PATTERN, "g");
//@ chunk-7p2hc4jn.js:20518-20581 placement
/**
 * 把匹配片段替换成等长空格（保持列宽）。
 */
function replaceWithSpaces(text) {
  return text.replace(regExp_2, (r) => " ".repeat(r.length));
}
//@ chunk-7p2hc4jn.js:20581-20663 placement
/**
 * 判断字符是否为词字符（字母数字下划线）。
 */
var isWordChar = (e) => WORD_CHAR_RE.test(e);
var isWhitespaceChar = (e) => WHITESPACE_RE.test(e);
var isPunctuationChar = (e) => e.length > 0 && !isWhitespaceChar(e) && !isWordChar(e);
//@ chunk-7p2hc4jn.js:20663-34257 fingerprint = Cursor (0.818)
/**
 * 输入框光标模型：基于按显示宽度换行的文本（MeasuredText），实现左右/上下/词移动、删除、kill ring、vim 动作等。
 */
class Cursor {
  measuredText;
  selection;
  offset;
  constructor(measuredText, offset = 0, selection = 0) {
    this.measuredText = measuredText;
    this.selection = selection;
    this.offset = Math.max(0, Math.min(this.text.length, offset));
  }
  static fromText(text, columns, offset = 0, selection = 0) {
    return new Cursor(new MeasuredText(text, columns - 1), offset, selection);
  }
  getViewportStartLine(maxVisibleLines) {
    if (maxVisibleLines === undefined || maxVisibleLines <= 0) return 0;
    let { line } = this.getPosition();
    let allLines = this.measuredText.getWrappedText();
    if (allLines.length <= maxVisibleLines) return 0;
    let half = Math.floor(maxVisibleLines / 2);
    let startLine = Math.max(0, line - half);
    let endLine = Math.min(allLines.length, startLine + maxVisibleLines);
    if (endLine - startLine < maxVisibleLines) startLine = Math.max(0, endLine - maxVisibleLines);
    return startLine;
  }
  getRenderedRowStartOffsets(maxVisibleLines) {
    let { startLine, endLine } = this.getViewportLineRange(maxVisibleLines);
    return this.measuredText
      .getWrappedLines()
      .slice(startLine, endLine)
      .map((s) => s.displayStartOffset);
  }
  getViewportLineRange(e) {
    let r = this.measuredText.getWrappedLines().length;
    let viewportStartLine = this.getViewportStartLine(e);
    let endLine = e !== undefined && e > 0 ? Math.min(r, viewportStartLine + e) : r;
    return {
      startLine: viewportStartLine,
      endLine,
    };
  }
  render(cursorChar, mask, n, ghostText, o, u, d, h, x, T) {
    let wrappedLines = this.measuredText.getWrappedLines();
    let { startLine, endLine } = this.getViewportLineRange(o);
    if (u !== undefined) {
      let min = Math.min(u, this.offset);
      let max = Math.max(u, this.offset);
      let V = d ? this.findLogicalLineStart(min) : min;
      let k = d ? this.findLogicalLineEnd(max) : this.measuredText.nextOffset(max);
      return wrappedLines.slice(startLine, endLine).map((Y, pe) => {
        let xe = (h ?? false) && (Y.endsWithNewline || pe + startLine === wrappedLines.length - 1);
        let { displayText, displayStartOffset } = Y;
        let oe = displayStartOffset + displayText.length;
        if (k <= displayStartOffset || V >= oe) {
          if (displayStartOffset === oe && V <= displayStartOffset && (d ? k >= oe : k > oe))
            return (h ?? false) ? "" : n(" ");
          return xe ? displayText : displayText.trimEnd();
        }
        if (displayStartOffset === oe) return (h ?? false) ? "" : n(" ");
        let max = Math.max(0, V - displayStartOffset);
        let min = Math.min(displayText.length, k - displayStartOffset);
        if (h ?? false) {
          let M = xe ? displayText : displayText.trimEnd();
          let min_2 = Math.min(max, M.length);
          let min_3 = Math.min(min, M.length);
          return (
            M.slice(0, min_2) +
            renderRowSpans(
              M,
              {
                from: min_2,
                to: min_3,
              },
              n,
              {
                spans: x ?? [],
                rowStart: displayStartOffset,
              },
            ) +
            M.slice(min_3)
          );
        }
        return (
          displayText.slice(0, max) +
          renderRowSpans(
            displayText,
            {
              from: max,
              to: min,
            },
            n,
            {
              spans: x ?? [],
              rowStart: displayStartOffset,
            },
          ) +
          displayText.slice(min).trimEnd()
        );
      }).join(`
`);
    }
    let { line, column } = this.getPosition();
    let wrappedText = this.measuredText.getWrappedText();
    let wrappedLines_2 = this.measuredText.getWrappedLines();
    return wrappedText.slice(startLine, endLine).map((text, i) => {
      let currentLine = i + startLine;
      let k =
        (h ?? false) &&
        ((wrappedLines_2[currentLine]?.endsWithNewline ?? false) || currentLine === wrappedText.length - 1);
      let displayText = text;
      if (mask) {
        let graphemes = Array.from(getGraphemeSegmenter().segment(text));
        if (currentLine === wrappedText.length - 1 && !T) {
          let visibleCount = Math.min(6, graphemes.length);
          let maskCount = graphemes.length - visibleCount;
          let splitOffset = graphemes.length > visibleCount ? graphemes[maskCount].index : 0;
          displayText = mask.repeat(maskCount) + text.slice(splitOffset);
        } else displayText = mask.repeat(graphemes.length);
      }
      if (line !== currentLine) return k ? displayText : displayText.trimEnd();
      let beforeCursor = "";
      let atCursor = cursorChar;
      let afterCursor = "";
      let currentWidth = 0;
      let cursorFound = false;
      for (let { segment } of getGraphemeSegmenter().segment(displayText)) {
        if (cursorFound) {
          afterCursor += segment;
          continue;
        }
        let nextWidth = currentWidth + bunStringWidth(segment);
        if (nextWidth > column) {
          atCursor = segment;
          cursorFound = true;
        } else {
          currentWidth = nextWidth;
          beforeCursor += segment;
        }
      }
      let renderedCursor;
      let ghostSuffix = "";
      if (
        ghostText &&
        currentLine === wrappedText.length - 1 &&
        this.isAtEnd() &&
        ghostText.text.length > 0
      ) {
        let firstGhostChar = firstGrapheme(ghostText.text) || ghostText.text[0];
        renderedCursor = cursorChar ? n(firstGhostChar) : firstGhostChar;
        let ghostRest = ghostText.text.slice(firstGhostChar.length);
        if (ghostRest.length > 0) ghostSuffix = ghostText.dim(ghostRest);
      } else renderedCursor = cursorChar ? n(atCursor) : atCursor;
      if (h && !k && cursorChar === "")
        return (beforeCursor + renderedCursor + ghostSuffix + afterCursor).trimEnd();
      return beforeCursor + renderedCursor + ghostSuffix + (k ? afterCursor : afterCursor.trimEnd());
    }).join(`
`);
  }
  left() {
    if (this.offset === 0) return this;
    let chip = this.placeholderEndingAt(this.offset);
    if (chip) return new Cursor(this.measuredText, chip.start);
    let prevOffset = this.measuredText.prevOffset(this.offset);
    return new Cursor(this.measuredText, prevOffset);
  }
  right() {
    if (this.offset >= this.text.length) return this;
    let chip = this.placeholderStartingAt(this.offset);
    if (chip) return new Cursor(this.measuredText, chip.end);
    let nextOffset = this.measuredText.nextOffset(this.offset);
    return new Cursor(this.measuredText, Math.min(nextOffset, this.text.length));
  }
  placeholderEndingAt(offset) {
    if (this.text[offset - 1] !== "]") return null;
    let m = this.text.slice(0, offset).match(PLACEHOLDER_AT_END_RE);
    return m
      ? {
          start: offset - m[0].length,
          end: offset,
        }
      : null;
  }
  placeholderStartingAt(offset) {
    if (this.text[offset] !== "[") return null;
    let m = this.text.slice(offset).match(regExp);
    return m
      ? {
          start: offset,
          end: offset + m[0].length,
        }
      : null;
  }
  placeholderContaining(offset) {
    for (let r of this.text.matchAll(regExp_2)) {
      let start = r.index;
      let end = start + r[0].length;
      if (offset > start && offset < end)
        return {
          start,
          end,
        };
      if (start >= offset) break;
    }
    return null;
  }
  snapOutOfPlaceholder(e, r) {
    let n = this.placeholderContaining(e);
    if (!n) return e;
    return r === "start" ? n.start : n.end;
  }
  up() {
    let { line, column } = this.getPosition();
    if (line === 0) return this;
    let prevLine = this.measuredText.getWrappedText()[line - 1];
    if (prevLine === undefined) return this;
    let prevLineDisplayWidth = bunStringWidth(prevLine);
    if (column > prevLineDisplayWidth) {
      let newOffset = this.getOffset({
        line: line - 1,
        column: prevLineDisplayWidth,
      });
      return new Cursor(this.measuredText, newOffset, 0);
    }
    let newOffset = this.getOffset({
      line: line - 1,
      column,
    });
    return new Cursor(this.measuredText, newOffset, 0);
  }
  down() {
    let { line, column } = this.getPosition();
    if (line >= this.measuredText.lineCount - 1) return this;
    let nextLine = this.measuredText.getWrappedText()[line + 1];
    if (nextLine === undefined) return this;
    let nextLineDisplayWidth = bunStringWidth(nextLine);
    if (column > nextLineDisplayWidth) {
      let newOffset = this.getOffset({
        line: line + 1,
        column: nextLineDisplayWidth,
      });
      return new Cursor(this.measuredText, newOffset, 0);
    }
    let newOffset = this.getOffset({
      line: line + 1,
      column,
    });
    return new Cursor(this.measuredText, newOffset, 0);
  }
  startOfCurrentLine() {
    let { line } = this.getPosition();
    return new Cursor(
      this.measuredText,
      this.getOffset({
        line,
        column: 0,
      }),
      0,
    );
  }
  startOfLine() {
    let { line, column } = this.getPosition();
    if (column === 0 && line > 0)
      return new Cursor(
        this.measuredText,
        this.getOffset({
          line: line - 1,
          column: 0,
        }),
        0,
      );
    return this.startOfCurrentLine();
  }
  firstNonBlankInLine() {
    let { line } = this.getPosition();
    let match = (this.measuredText.getWrappedText()[line] || "").match(/^\s*\S/);
    let column = match?.index ? match.index + match[0].length - 1 : 0;
    let offset = this.getOffset({
      line,
      column,
    });
    return new Cursor(this.measuredText, offset, 0);
  }
  endOfLine() {
    let { line, column } = this.getPosition();
    let lineLength = this.measuredText.getLineLength(line);
    if (column >= lineLength && line < this.measuredText.lineCount - 1) {
      let column = this.measuredText.getLineLength(line + 1);
      let offset = this.getOffset({
        line: line + 1,
        column,
      });
      return new Cursor(this.measuredText, offset, 0);
    }
    let offset = this.getOffset({
      line,
      column: lineLength,
    });
    return new Cursor(this.measuredText, offset, 0);
  }
  findLogicalLineStart(fromOffset = this.offset) {
    if (fromOffset === 0) return 0;
    let prevNewline = this.text.lastIndexOf(
      `
`,
      fromOffset - 1,
    );
    return prevNewline === -1 ? 0 : prevNewline + 1;
  }
  findLogicalLineEnd(fromOffset = this.offset) {
    let nextNewline = this.text.indexOf(
      `
`,
      fromOffset,
    );
    return nextNewline === -1 ? this.text.length : nextNewline;
  }
  getLogicalLineBounds() {
    return {
      start: this.findLogicalLineStart(),
      end: this.findLogicalLineEnd(),
    };
  }
  createCursorWithColumn(lineStart, lineEnd, targetColumn) {
    let lineLength = lineEnd - lineStart;
    let clampedColumn = Math.min(targetColumn, lineLength);
    let rawOffset = lineStart + clampedColumn;
    let offset = this.measuredText.snapToGraphemeBoundary(rawOffset);
    return new Cursor(this.measuredText, offset, 0);
  }
  endOfLogicalLine() {
    return new Cursor(this.measuredText, this.findLogicalLineEnd(), 0);
  }
  lastCharInLogicalLine() {
    let logicalLineStart = this.findLogicalLineStart();
    let logicalLineEnd = this.findLogicalLineEnd();
    let n =
      logicalLineEnd > logicalLineStart ? this.measuredText.prevOffset(logicalLineEnd) : logicalLineStart;
    return new Cursor(this.measuredText, n, 0);
  }
  startOfLogicalLine() {
    return new Cursor(this.measuredText, this.findLogicalLineStart(), 0);
  }
  firstNonBlankInLogicalLine() {
    let { start, end } = this.getLogicalLineBounds();
    let match = this.text.slice(start, end).match(/\S/);
    let offset = start + (match?.index ?? 0);
    return new Cursor(this.measuredText, offset, 0);
  }
  upLogicalLine() {
    let { start: currentStart } = this.getLogicalLineBounds();
    if (currentStart === 0) return new Cursor(this.measuredText, 0, 0);
    let currentColumn = this.offset - currentStart;
    let prevLineEnd = currentStart - 1;
    let prevLineStart = this.findLogicalLineStart(prevLineEnd);
    return this.createCursorWithColumn(prevLineStart, prevLineEnd, currentColumn);
  }
  downLogicalLine() {
    let { start: currentStart, end: currentEnd } = this.getLogicalLineBounds();
    if (currentEnd >= this.text.length) return new Cursor(this.measuredText, this.text.length, 0);
    let currentColumn = this.offset - currentStart;
    let nextLineStart = currentEnd + 1;
    let nextLineEnd = this.findLogicalLineEnd(nextLineStart);
    return this.createCursorWithColumn(nextLineStart, nextLineEnd, currentColumn);
  }
  forwardWord() {
    if (this.isAtEnd()) return this;
    let chip = this.placeholderStartingAt(this.offset) ?? this.placeholderContaining(this.offset);
    if (chip) return new Cursor(this.measuredText, chip.end);
    for (let r of this.measuredText.getReadlineWordBoundaries())
      if (r.end > this.offset) {
        let n = this.snapOutOfPlaceholder(r.end, "end");
        return new Cursor(this.measuredText, n);
      }
    return new Cursor(this.measuredText, this.text.length);
  }
  backwardWord() {
    if (this.isAtStart()) return this;
    let e = this.placeholderEndingAt(this.offset) ?? this.placeholderContaining(this.offset);
    if (e) return new Cursor(this.measuredText, e.start);
    let readlineWordBoundaries = this.measuredText.getReadlineWordBoundaries();
    for (let k = readlineWordBoundaries.length - 1; k >= 0; k--) {
      let s = readlineWordBoundaries[k];
      if (s.start < this.offset) {
        let o = this.snapOutOfPlaceholder(s.start, "start");
        return new Cursor(this.measuredText, o);
      }
    }
    return new Cursor(this.measuredText, 0);
  }
  killWord() {
    let e = this.forwardWord();
    if (e.offset === this.offset)
      return {
        cursor: this,
        killed: "",
      };
    return this.killRange(this.offset, e.offset);
  }
  backwardKillWord() {
    let e = this.backwardWord();
    if (e.offset === this.offset)
      return {
        cursor: this,
        killed: "",
      };
    return this.killRange(e.offset, this.offset);
  }
  nextVimWord() {
    if (this.isAtEnd()) return this;
    let e = this.placeholderStartingAt(this.offset) ?? this.placeholderContaining(this.offset);
    if (e) return new Cursor(this.measuredText, this.skipBlanks(e.end));
    let pos = this.offset;
    let n = (pos) => this.measuredText.nextOffset(pos);
    let currentGrapheme = this.graphemeAt(pos);
    if (!currentGrapheme) return this;
    if (this.isOnEmptyLine(pos)) pos = n(pos);
    else if (isWordChar(currentGrapheme))
      while (pos < this.text.length && isWordChar(this.graphemeAt(pos))) pos = n(pos);
    else if (isPunctuationChar(currentGrapheme))
      while (pos < this.text.length && isPunctuationChar(this.graphemeAt(pos))) pos = n(pos);
    return new Cursor(this.measuredText, this.snapOutOfPlaceholder(this.skipBlanks(pos), "end"));
  }
  skipBlanks(e) {
    let r = e;
    while (r < this.text.length && WHITESPACE_RE.test(this.graphemeAt(r)) && !this.isOnEmptyLine(r))
      r = this.measuredText.nextOffset(r);
    return r;
  }
  isOnEmptyLine(startOffset) {
    return (
      this.text[startOffset] ===
        `
` &&
      (startOffset === 0 ||
        this.text[startOffset - 1] ===
          `
`)
    );
  }
  endOfVimWord() {
    if (this.isAtEnd()) return this;
    let e = this.placeholderStartingAt(this.offset) ?? this.placeholderContaining(this.offset);
    if (e && this.offset < e.end - 1) return new Cursor(this.measuredText, e.end - 1);
    let text = this.text;
    let pos = this.offset;
    let advance = (pos) => this.measuredText.nextOffset(pos);
    if (this.graphemeAt(pos) === "") return this;
    pos = advance(pos);
    while (pos < text.length && WHITESPACE_RE.test(this.graphemeAt(pos))) pos = advance(pos);
    if (pos >= text.length) return new Cursor(this.measuredText, text.length);
    let charAtPos = this.graphemeAt(pos);
    if (isWordChar(charAtPos))
      while (pos < text.length) {
        let nextPos = advance(pos);
        if (nextPos >= text.length || !isWordChar(this.graphemeAt(nextPos))) break;
        pos = nextPos;
      }
    else if (isPunctuationChar(charAtPos))
      while (pos < text.length) {
        let nextPos = advance(pos);
        if (nextPos >= text.length || !isPunctuationChar(this.graphemeAt(nextPos))) break;
        pos = nextPos;
      }
    let u = this.placeholderStartingAt(pos) ?? this.placeholderContaining(pos);
    if (u) pos = u.end - 1;
    return new Cursor(this.measuredText, pos);
  }
  prevVimWord() {
    if (this.isAtStart()) return this;
    let e = this.placeholderEndingAt(this.offset);
    if (e) return new Cursor(this.measuredText, e.start);
    let r = this.placeholderContaining(this.offset);
    if (r) return new Cursor(this.measuredText, r.start);
    let pos = this.offset;
    let retreat = (pos) => this.measuredText.prevOffset(pos);
    pos = retreat(pos);
    while (pos > 0 && WHITESPACE_RE.test(this.graphemeAt(pos))) pos = retreat(pos);
    if (pos === 0 && WHITESPACE_RE.test(this.graphemeAt(0))) return new Cursor(this.measuredText, 0);
    let charAtPos = this.graphemeAt(pos);
    if (isWordChar(charAtPos))
      while (pos > 0) {
        let prevPos = retreat(pos);
        if (!isWordChar(this.graphemeAt(prevPos))) break;
        pos = prevPos;
      }
    else if (isPunctuationChar(charAtPos))
      while (pos > 0) {
        let prevPos = retreat(pos);
        if (!isPunctuationChar(this.graphemeAt(prevPos))) break;
        pos = prevPos;
      }
    return new Cursor(this.measuredText, this.snapOutOfPlaceholder(pos, "start"));
  }
  nextWORD() {
    let nextCursor = this;
    if (this.isOnEmptyLine(this.offset)) nextCursor = this.right();
    else while (!nextCursor.isOverWhitespace() && !nextCursor.isAtEnd()) nextCursor = nextCursor.right();
    while (nextCursor.isOverWhitespace() && !nextCursor.isAtEnd() && !this.isOnEmptyLine(nextCursor.offset))
      nextCursor = nextCursor.right();
    return nextCursor;
  }
  endOfWORD() {
    if (this.isAtEnd()) return this;
    let e = this.placeholderStartingAt(this.offset) ?? this.placeholderContaining(this.offset);
    if (e && this.offset < e.end - 1) return new Cursor(this.measuredText, e.end - 1);
    let cursor = this;
    if (!cursor.isOverWhitespace() && (cursor.right().isOverWhitespace() || cursor.right().isAtEnd())) {
      cursor = cursor.right();
      return cursor.endOfWORD();
    }
    if (cursor.isOverWhitespace()) {
      while (cursor.isOverWhitespace() && !cursor.isAtEnd()) cursor = cursor.nextWORD();
      let s = cursor.placeholderStartingAt(cursor.offset);
      if (s) return new Cursor(this.measuredText, s.end - 1);
    }
    while (!cursor.right().isOverWhitespace() && !cursor.isAtEnd()) cursor = cursor.right();
    return cursor;
  }
  prevWORD() {
    let cursor = this;
    if (cursor.left().isOverWhitespace()) cursor = cursor.left();
    while (cursor.isOverWhitespace() && !cursor.isAtStart()) cursor = cursor.left();
    if (!cursor.isOverWhitespace())
      while (!cursor.left().isOverWhitespace() && !cursor.isAtStart()) cursor = cursor.left();
    return cursor;
  }
  modifyText(end, insertString = "") {
    let startOffset = this.offset;
    let endOffset = end.offset;
    let o = this.text.slice(0, startOffset) + insertString;
    let u = o + this.text.slice(endOffset);
    let d = o.normalize("NFC").length;
    let h = Cursor.fromText(u, this.columns, d);
    let x = d !== startOffset + insertString.normalize("NFC").length;
    let { measuredText, offset } = h;
    if (x && measuredText.snapToGraphemeBoundary(offset) !== offset)
      return new Cursor(measuredText, measuredText.nextOffset(offset));
    return h;
  }
  insert(insertString) {
    return this.modifyText(this, insertString);
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
    let startCursor = e ?? this.startOfLine();
    return this.killRange(startCursor.offset, this.offset);
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
    if (this.isAtStart())
      return {
        cursor: this,
        killed: "",
      };
    return this.killRange(this.prevWORD().offset, this.offset);
  }
  killRange(e, r) {
    let n = this.snapOutOfPlaceholder(e, "start");
    let s = this.snapOutOfPlaceholder(r, "end");
    let o = new Cursor(this.measuredText, n);
    let u = new Cursor(this.measuredText, s);
    return {
      cursor: o.modifyText(u),
      killed: this.text.slice(n, s),
    };
  }
  graphemeAt(pos) {
    if (pos >= this.text.length) return "";
    let nextOff = this.measuredText.nextOffset(pos);
    return this.text.slice(pos, nextOff);
  }
  isOverWhitespace() {
    let currentChar = this.text[this.offset] ?? "";
    return /\s/.test(currentChar);
  }
  equals(other) {
    return this.offset === other.offset && this.measuredText === other.measuredText;
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
    let lastNewlineIndex = this.text.lastIndexOf(`
`);
    if (lastNewlineIndex === -1) return this.startOfLine();
    return new Cursor(this.measuredText, lastNewlineIndex + 1, 0);
  }
  goToLine(lineNumber) {
    let lines = this.text.split(`
`);
    let targetLine = Math.min(Math.max(0, lineNumber - 1), lines.length - 1);
    let offset = 0;
    for (let i = 0; i < targetLine; i++) offset += (lines[i]?.length ?? 0) + 1;
    return new Cursor(this.measuredText, offset, 0);
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
  getOffset(position) {
    return this.measuredText.getOffsetFromPosition(position);
  }
  findCharacter(char, type, count = 1) {
    let s = type === "f" || type === "t";
    let till = type === "t" || type === "T";
    let found = 0;
    if (s) {
      let logicalLineEnd = this.findLogicalLineEnd();
      let pos = this.measuredText.nextOffset(this.offset);
      while (pos < logicalLineEnd) {
        if (this.graphemeAt(pos) === char) {
          found++;
          if (found === count) return till ? Math.max(this.offset, this.measuredText.prevOffset(pos)) : pos;
        }
        pos = this.measuredText.nextOffset(pos);
      }
    } else {
      let logicalLineStart = this.findLogicalLineStart();
      if (this.offset <= logicalLineStart) return null;
      let pos = this.measuredText.prevOffset(this.offset);
      while (pos >= logicalLineStart) {
        if (this.graphemeAt(pos) === char) {
          found++;
          if (found === count) return till ? Math.min(this.offset, this.measuredText.nextOffset(pos)) : pos;
        }
        if (pos === logicalLineStart) break;
        pos = this.measuredText.prevOffset(pos);
      }
    }
    return null;
  }
}
//@ chunk-7p2hc4jn.js:34257-34619 layout
/**
 * 换行后的一行：原文、起始偏移、是否换行开头/结尾，以及去掉前导空白的显示文本。
 */
class MeasuredLine {
  text;
  startOffset;
  isPrecededByNewline;
  endsWithNewline;
  displayText;
  displayStartOffset;
  constructor(text, startOffset, isPrecededByNewline, endsWithNewline) {
    this.text = text;
    this.startOffset = startOffset;
    this.isPrecededByNewline = isPrecededByNewline;
    this.endsWithNewline = endsWithNewline;
    this.displayText = isPrecededByNewline ? text : text.trimStart();
    this.displayStartOffset = startOffset + (text.length - this.displayText.length);
  }
  equals(e) {
    return this.text === e.text && this.startOffset === e.startOffset;
  }
}
//@ chunk-7p2hc4jn.js:34619-38481 fingerprint = MeasuredText (0.898)
/**
 * 按终端宽度换行并缓存行信息的文本，提供偏移与行列互转。
 */
class MeasuredText {
  columns;
  _wrappedLines;
  text;
  navigationCache;
  graphemeBoundaries;
  constructor(text, columns) {
    this.columns = columns;
    this.text = text.normalize("NFC");
    this.navigationCache = new Map();
  }
  get wrappedLines() {
    if (!this._wrappedLines) {
      let { rows, degraded } = wrapTextRows(this.text, this.columns);
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
      for (let { index } of getGraphemeSegmenter().segment(this.text)) this.graphemeBoundaries.push(index);
      this.graphemeBoundaries.push(this.text.length);
    }
    return this.graphemeBoundaries;
  }
  wordBoundariesCache;
  getWordBoundaries() {
    if (!this.wordBoundariesCache) {
      this.wordBoundariesCache = [];
      for (let segment of getWordSegmenter().segment(this.text))
        this.wordBoundariesCache.push({
          start: segment.index,
          end: segment.index + segment.segment.length,
        });
    }
    return this.wordBoundariesCache;
  }
  readlineWordBoundariesCache;
  getReadlineWordBoundaries() {
    if (!this.readlineWordBoundariesCache) {
      let e = [];
      let r = false;
      for (let n of this.getWordBoundaries()) {
        let sliced = this.text.slice(n.start, n.end);
        for (let o of sliced.matchAll(WORD_RE)) {
          let u = this.snapToGraphemeBoundary(n.start + o.index);
          let d = n.start + o.index + o[0].length;
          let h = this.snapToGraphemeBoundary(d);
          let x = h === d ? d : this.nextOffset(h);
          let last = e.at(-1);
          if (last && (u < last.end || (u === last.end && r))) last.end = Math.max(last.end, x);
          else
            e.push({
              start: u,
              end: x,
            });
          r = x !== d;
        }
      }
      this.readlineWordBoundariesCache = e;
    }
    return this.readlineWordBoundariesCache;
  }
  binarySearchBoundary(boundaries, target, findNext) {
    let left = 0;
    let right = boundaries.length - 1;
    let result = findNext ? this.text.length : 0;
    while (left <= right) {
      let mid = Math.floor((left + right) / 2);
      let boundary = boundaries[mid];
      if (boundary === undefined) break;
      if (findNext) {
        if (boundary > target) {
          result = boundary;
          right = mid - 1;
        } else left = mid + 1;
      } else if (boundary < target) {
        result = boundary;
        left = mid + 1;
      } else right = mid - 1;
    }
    return result;
  }
  stringIndexToDisplayWidth(text, index) {
    if (index <= 0) return 0;
    if (index >= text.length) return bunStringWidth(text);
    return bunStringWidth(text.substring(0, index));
  }
  displayWidthToStringIndex(text, targetWidth) {
    if (targetWidth <= 0) return 0;
    if (!text) return 0;
    if (text === this.text) return this.offsetAtDisplayWidth(targetWidth);
    let currentWidth = 0;
    let currentOffset = 0;
    for (let { segment, index } of getGraphemeSegmenter().segment(text)) {
      let segmentWidth = bunStringWidth(segment);
      if (currentWidth + segmentWidth > targetWidth) break;
      currentWidth += segmentWidth;
      currentOffset = index + segment.length;
    }
    return currentOffset;
  }
  offsetAtDisplayWidth(targetWidth) {
    if (targetWidth <= 0) return 0;
    let currentWidth = 0;
    let boundaries = this.getGraphemeBoundaries();
    for (let i = 0; i < boundaries.length - 1; i++) {
      let start = boundaries[i];
      let end = boundaries[i + 1];
      if (start === undefined || end === undefined) continue;
      let segment = this.text.substring(start, end);
      let segmentWidth = bunStringWidth(segment);
      if (currentWidth + segmentWidth > targetWidth) return start;
      currentWidth += segmentWidth;
    }
    return this.text.length;
  }
  getWrappedText() {
    return this.wrappedLines.map((line) => line.displayText);
  }
  getWrappedLines() {
    return this.wrappedLines;
  }
  getLine(line) {
    let lines = this.wrappedLines;
    return lines[Math.max(0, Math.min(line, lines.length - 1))];
  }
  getOffsetFromPosition(position) {
    let wrappedLine = this.getLine(position.line);
    if (wrappedLine.text.length === 0 && wrappedLine.endsWithNewline) return wrappedLine.startOffset;
    let leadingWhitespace = wrappedLine.displayStartOffset - wrappedLine.startOffset;
    let displayColumnWithLeading = position.column + leadingWhitespace;
    let stringIndex = this.displayWidthToStringIndex(wrappedLine.text, displayColumnWithLeading);
    let offset = wrappedLine.startOffset + stringIndex;
    return this.snapToGraphemeBoundary(offset);
  }
  getLineLength(line) {
    let wrappedLine = this.getLine(line);
    return bunStringWidth(wrappedLine.text);
  }
  getPositionFromOffset(offset) {
    let lines = this.wrappedLines;
    for (let line = 0; line < lines.length; line++) {
      let currentLine = lines[line];
      let nextLine = lines[line + 1];
      if (offset >= currentLine.startOffset && (!nextLine || offset < nextLine.startOffset)) {
        let stringPosInLine = offset - currentLine.startOffset;
        let displayColumn;
        if (currentLine.isPrecededByNewline)
          displayColumn = this.stringIndexToDisplayWidth(currentLine.text, stringPosInLine);
        else {
          let leadingWhitespace = currentLine.displayStartOffset - currentLine.startOffset;
          if (stringPosInLine < leadingWhitespace) displayColumn = 0;
          else {
            let trimmedText = currentLine.displayText;
            let posInTrimmed = stringPosInLine - leadingWhitespace;
            displayColumn = this.stringIndexToDisplayWidth(trimmedText, posInTrimmed);
          }
        }
        return {
          line,
          column: Math.max(0, displayColumn),
        };
      }
    }
    let line = lines.length - 1;
    let lastLine = this.wrappedLines[line];
    return {
      line,
      column: bunStringWidth(lastLine.text),
    };
  }
  get lineCount() {
    return this.wrappedLines.length;
  }
  withCache(key, compute) {
    let cached = this.navigationCache.get(key);
    if (cached !== undefined) return cached;
    let result = compute();
    this.navigationCache.set(key, result);
    return result;
  }
  nextOffset(offset) {
    return this.withCache(`next:${offset}`, () => {
      let boundaries = this.getGraphemeBoundaries();
      return this.binarySearchBoundary(boundaries, offset, true);
    });
  }
  prevOffset(offset) {
    if (offset <= 0) return 0;
    return this.withCache(`prev:${offset}`, () => {
      let boundaries = this.getGraphemeBoundaries();
      return this.binarySearchBoundary(boundaries, offset, false);
    });
  }
  snapToGraphemeBoundary(offset) {
    if (offset <= 0) return 0;
    if (offset >= this.text.length) return this.text.length;
    let boundaries = this.getGraphemeBoundaries();
    let lo = 0;
    let hi = boundaries.length - 1;
    while (lo < hi) {
      let mid = (lo + hi + 1) >> 1;
      if (boundaries[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return boundaries[lo];
  }
}
//@ chunk-7p2hc4jn.js:38481-38712 affinity
function renderRowSpans(e, { from, to }, s, { spans, rowStart }) {
  let d = from;
  let h = "";
  for (let span of spans) {
    let max = Math.max(d, span.start - rowStart);
    let min = Math.min(to, span.end - rowStart);
    if (min <= max) continue;
    h += (max > d ? s(e.slice(d, max)) : "") + e.slice(max, min);
    d = min;
  }
  return d === from || to > d ? h + s(e.slice(d, to)) : h;
}
//@ chunk-530hfzwb.js:745-927 placement
/**
 * 光标所在逻辑行的显示列（制表符按 tab stop 计）。
 */
function getCursorDisplayColumn(cursor, wantedColumn) {
  if (wantedColumn?.offset === cursor.offset && wantedColumn.text === cursor.text) return wantedColumn.column;
  let offset = cursor.startOfLogicalLine().offset;
  let n = truncateToWidth(cursor.text, offset, cursor.offset);
  return cursor.text[cursor.offset] === "\t" ? n + charDisplayWidth("\t", n) - 1 : n;
}
//@ chunk-530hfzwb.js:1022-1145 placement = truncateStartToWidth (1)
/**
 * 从起点累加显示宽度，超过宽度时返回该处偏移（误配名）。
 */
function truncateStartToWidth(text, t, r, cursorDisplayColumn) {
  let width = 0;
  for (let { segment, index } of getGraphemeSegmenter().segment(text.slice(t, r))) {
    width += charDisplayWidth(segment, width);
    if (width > cursorDisplayColumn) return t + index;
  }
  return r;
}
//@ chunk-530hfzwb.js:1145-1194 placement
function charDisplayWidth(segment, width) {
  return segment === "\t" ? DEFAULT_TAB_WIDTH - (width % DEFAULT_TAB_WIDTH) : bunStringWidth(segment);
}
//@ chunk-530hfzwb.js:19092-19200 placement = wrapText (1)
/**
 * 返回行首空白之后第一个非空白字符的偏移（误配名 wrapText）。
 */
function wrapText(text) {
  let currentWidth = 0;
  for (let { segment, index } of getGraphemeSegmenter().segment(text)) {
    currentWidth = index;
    if (segment !== " " && segment !== "\t") break;
  }
  return currentWidth;
}
//@ chunk-530hfzwb.js:28612-28975 placement = truncatePathMiddle (0.223)
/**
 * 按逻辑行移动光标并保持期望列（误配名 truncatePathMiddle，属输入框光标）。
 */
function truncatePathMiddle(e, count, ctx) {
  let { cursor } = ctx;
  let text = cursor.text;
  let offset = cursor.startOfLogicalLine().offset;
  let cursorDisplayColumn = getCursorDisplayColumn(cursor, ctx.wantedColumn);
  let u = offset;
  for (let k = 0; k < count; k++)
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
  if (u === offset)
    return {
      offset: null,
      column: cursorDisplayColumn,
    };
  let index = text.indexOf(
    `
`,
    u,
  );
  let d = index === -1 ? text.length : index;
  let p = truncateStartToWidth(text, u, d, cursorDisplayColumn);
  return {
    offset: snapToPlaceholderEnd(cursor, p, u),
    column: cursorDisplayColumn,
  };
}
//@ chunk-4121qate.js:76332-76361 fingerprint = pushToKillRing (0.819)
var pushToKillRing = ["prepend", "append"];
export {
  Cursor,
  isPlaceholderAt,
  isNoForceUpdateRenders,
  measureText,
  charDisplayWidth,
  isWhitespaceChar,
  isPunctuationChar,
  isWordChar,
  replaceWithSpaces,
  truncateStartToWidth,
  getCursorDisplayColumn,
  wrapText,
  truncatePathMiddle,
  wrapByDisplayWidth,
  offsetToPosition,
  positionToOffset,
  pushToKillRing,
};
