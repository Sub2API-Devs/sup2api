/**
 * utils/Cursor.ts
 *
 * 输入框光标与按宽度换行的文本模型（MeasuredText），实现移动、删除、kill ring、vim 动作
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/Cursor.ts
 * pieces: chunk-18rrbwq1.js (11), chunk-42wa4pww.js (8), chunk-880p06ha.js (6), chunk-j8f885h1.js (1)
 * attribution: placement 19, fingerprint 4, layout 2, affinity 1
 */
import { getGraphemeSegmenter, firstGrapheme, getWordSegmenter } from "./intl.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { wrapTextRows } from "./textWrap.js";
import { logWrapFallbackOnce } from "../hooks/useTextInput.js";
import { DEFAULT_TAB_WIDTH, wrapAnsi } from "../ink/wrapAnsi.js";
import { snapToPlaceholderEnd } from "../vim/operators.js";
import { init_react_production } from "../../vendor/react/cjs/react.production.js";
import { renderWithForceUpdate } from "../hooks/useForceRender.js";
import { currentToolPermissionContext } from "./permissions/currentPermissionContext.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-j8f885h1.js:56934-56963 fingerprint (2.1.88 match: pushToKillRing, 0.82)
var pushToKillRing = ["prepend", "append"];
//@ chunk-42wa4pww.js:19779-20193 placement
/**
 * 按显示宽度逐字素换行每个逻辑行，返回行信息（起始偏移、是否换行开头/结尾）。
 */
function wrapByDisplayWidth(text, maxWidth) {
  let rows = [];
  let lineStartOffset = 0;
  for (let line of text.split(/\r\n|[\n\r]/)) {
    let rowStartIndex = 0;
    let rowWidth = 0;
    for (let { segment, index } of getGraphemeSegmenter().segment(line)) {
      let segmentWidth = bunStringWidth(segment);
      if (rowWidth + segmentWidth > maxWidth && index > rowStartIndex) {
        rows.push({
          text: line.slice(rowStartIndex, index),
          startOffset: lineStartOffset + rowStartIndex,
          isPrecededByNewline: rowStartIndex === 0,
          endsWithNewline: false,
        });
        rowStartIndex = index;
        rowWidth = 0;
      }
      rowWidth += segmentWidth;
    }
    let lineEndOffset = lineStartOffset + line.length;
    let newlineLength = text.startsWith(
      `\r
`,
      lineEndOffset,
    )
      ? 2
      : lineEndOffset < text.length
        ? 1
        : 0;
    rows.push({
      text: line.slice(rowStartIndex),
      startOffset: lineStartOffset + rowStartIndex,
      isPrecededByNewline: rowStartIndex === 0,
      endsWithNewline: newlineLength > 0,
    });
    lineStartOffset = lineEndOffset + newlineLength;
  }
  return rows;
}
//@ chunk-42wa4pww.js:20193-20518 placement
/**
 * 输入框光标的单词与占位符正则：词字符、词、空白，以及粘贴/图片等占位符模式及其行首/行尾/全局正则与位置判断。
 */
var WORD_CHAR_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var WORD_RE;
var WHITESPACE_RE;
var PLACEHOLDER_PATTERN;
var PLACEHOLDER_AT_END_RE;
var regExp;
var isPlaceholderAt;
var regExp_2;
deferInit("chunk-42wa4pww.js:20193", () => {
  WORD_CHAR_RE = /^[\p{L}\p{N}\p{M}_]+$/u;
  WORD_RE = /[\p{L}\p{N}][\p{L}\p{N}\p{M}]*/gu;
  WHITESPACE_RE = /\s/;
  PLACEHOLDER_PATTERN =
    "(?:\\[(?:Pasted text|Image|\\.\\.\\.Truncated text|\u2726 Team setup guide) #\\d+(?: \\+\\d+ lines)?\\.*\\]|\\[\u29C9 [^\\]\\n]+\\])";
  PLACEHOLDER_AT_END_RE = new RegExp(PLACEHOLDER_PATTERN + "$");
  regExp = new RegExp("^" + PLACEHOLDER_PATTERN);
  isPlaceholderAt = (text, offset) => text[offset] === "[" && regExp.test(text.slice(offset));
  regExp_2 = new RegExp(PLACEHOLDER_PATTERN, "g");
});
//@ chunk-42wa4pww.js:20518-20581 placement
/**
 * 把匹配片段替换成等长空格（保持列宽）。
 */
function replaceWithSpaces(text) {
  return text.replace(regExp_2, (matchText) => " ".repeat(matchText.length));
}
//@ chunk-42wa4pww.js:20581-20663 placement
/**
 * 判断字符是否为词字符（字母数字下划线）。
 */
var isWordChar = (char) => WORD_CHAR_RE.test(char);
var isWhitespaceChar = (char) => WHITESPACE_RE.test(char);
var isPunctuationChar = (char) => char.length > 0 && !isWhitespaceChar(char) && !isWordChar(char);
//@ chunk-42wa4pww.js:20663-34257 fingerprint (2.1.88 match: Cursor, 0.818)
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
      .map((wrappedLine) => wrappedLine.displayStartOffset);
  }
  getViewportLineRange(maxVisibleLines) {
    let totalLines = this.measuredText.getWrappedLines().length;
    let viewportStartLine = this.getViewportStartLine(maxVisibleLines);
    let endLine =
      maxVisibleLines !== undefined && maxVisibleLines > 0
        ? Math.min(totalLines, viewportStartLine + maxVisibleLines)
        : totalLines;
    return {
      startLine: viewportStartLine,
      endLine,
    };
  }
  render(
    cursorChar,
    mask,
    invert,
    ghostText,
    maxVisibleLines,
    selectionAnchor,
    selectionLinewise,
    preserveTrailingWhitespace,
    spans,
    maskWhole,
  ) {
    let wrappedLines = this.measuredText.getWrappedLines();
    let { startLine, endLine } = this.getViewportLineRange(maxVisibleLines);
    if (selectionAnchor !== undefined) {
      let min = Math.min(selectionAnchor, this.offset);
      let max = Math.max(selectionAnchor, this.offset);
      let selectionStart = selectionLinewise ? this.findLogicalLineStart(min) : min;
      let selectionEnd = selectionLinewise ? this.findLogicalLineEnd(max) : this.measuredText.nextOffset(max);
      return wrappedLines.slice(startLine, endLine).map((wrappedLine, rowIndex) => {
        let extendsToLineEnd =
          (preserveTrailingWhitespace ?? false) &&
          (wrappedLine.endsWithNewline || rowIndex + startLine === wrappedLines.length - 1);
        let { displayText, displayStartOffset } = wrappedLine;
        let rowEndOffset = displayStartOffset + displayText.length;
        if (selectionEnd <= displayStartOffset || selectionStart >= rowEndOffset) {
          if (
            displayStartOffset === rowEndOffset &&
            selectionStart <= displayStartOffset &&
            (selectionLinewise ? selectionEnd >= rowEndOffset : selectionEnd > rowEndOffset)
          )
            return (preserveTrailingWhitespace ?? false) ? "" : invert(" ");
          return extendsToLineEnd ? displayText : displayText.trimEnd();
        }
        if (displayStartOffset === rowEndOffset)
          return (preserveTrailingWhitespace ?? false) ? "" : invert(" ");
        let max = Math.max(0, selectionStart - displayStartOffset);
        let min = Math.min(displayText.length, selectionEnd - displayStartOffset);
        if (preserveTrailingWhitespace ?? false) {
          let lineText = extendsToLineEnd ? displayText : displayText.trimEnd();
          let min_2 = Math.min(max, lineText.length);
          let min_3 = Math.min(min, lineText.length);
          return (
            lineText.slice(0, min_2) +
            renderRowSpans(
              lineText,
              {
                from: min_2,
                to: min_3,
              },
              invert,
              {
                spans: spans ?? [],
                rowStart: displayStartOffset,
              },
            ) +
            lineText.slice(min_3)
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
            invert,
            {
              spans: spans ?? [],
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
      let keepTrailingSpace =
        (preserveTrailingWhitespace ?? false) &&
        ((wrappedLines_2[currentLine]?.endsWithNewline ?? false) || currentLine === wrappedText.length - 1);
      let displayText = text;
      if (mask) {
        let graphemes = Array.from(getGraphemeSegmenter().segment(text));
        if (currentLine === wrappedText.length - 1 && !maskWhole) {
          let visibleCount = Math.min(6, graphemes.length);
          let maskCount = graphemes.length - visibleCount;
          let splitOffset = graphemes.length > visibleCount ? graphemes[maskCount].index : 0;
          displayText = mask.repeat(maskCount) + text.slice(splitOffset);
        } else displayText = mask.repeat(graphemes.length);
      }
      if (line !== currentLine) return keepTrailingSpace ? displayText : displayText.trimEnd();
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
        renderedCursor = cursorChar ? invert(firstGhostChar) : firstGhostChar;
        let ghostRest = ghostText.text.slice(firstGhostChar.length);
        if (ghostRest.length > 0) ghostSuffix = ghostText.dim(ghostRest);
      } else renderedCursor = cursorChar ? invert(atCursor) : atCursor;
      if (preserveTrailingWhitespace && !keepTrailingSpace && cursorChar === "")
        return (beforeCursor + renderedCursor + ghostSuffix + afterCursor).trimEnd();
      return (
        beforeCursor +
        renderedCursor +
        ghostSuffix +
        (keepTrailingSpace ? afterCursor : afterCursor.trimEnd())
      );
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
    for (let match of this.text.matchAll(regExp_2)) {
      let start = match.index;
      let end = start + match[0].length;
      if (offset > start && offset < end)
        return {
          start,
          end,
        };
      if (start >= offset) break;
    }
    return null;
  }
  snapOutOfPlaceholder(offset, edge) {
    let chip = this.placeholderContaining(offset);
    if (!chip) return offset;
    return edge === "start" ? chip.start : chip.end;
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
    let prevOffset =
      logicalLineEnd > logicalLineStart ? this.measuredText.prevOffset(logicalLineEnd) : logicalLineStart;
    return new Cursor(this.measuredText, prevOffset, 0);
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
    for (let boundary of this.measuredText.getReadlineWordBoundaries())
      if (boundary.end > this.offset) {
        let snappedOffset = this.snapOutOfPlaceholder(boundary.end, "end");
        return new Cursor(this.measuredText, snappedOffset);
      }
    return new Cursor(this.measuredText, this.text.length);
  }
  backwardWord() {
    if (this.isAtStart()) return this;
    let chip = this.placeholderEndingAt(this.offset) ?? this.placeholderContaining(this.offset);
    if (chip) return new Cursor(this.measuredText, chip.start);
    let readlineWordBoundaries = this.measuredText.getReadlineWordBoundaries();
    for (let k = readlineWordBoundaries.length - 1; k >= 0; k--) {
      let boundary = readlineWordBoundaries[k];
      if (boundary.start < this.offset) {
        let snappedOffset = this.snapOutOfPlaceholder(boundary.start, "start");
        return new Cursor(this.measuredText, snappedOffset);
      }
    }
    return new Cursor(this.measuredText, 0);
  }
  killWord() {
    let nextCursor = this.forwardWord();
    if (nextCursor.offset === this.offset)
      return {
        cursor: this,
        killed: "",
      };
    return this.killRange(this.offset, nextCursor.offset);
  }
  backwardKillWord() {
    let prevCursor = this.backwardWord();
    if (prevCursor.offset === this.offset)
      return {
        cursor: this,
        killed: "",
      };
    return this.killRange(prevCursor.offset, this.offset);
  }
  nextVimWord() {
    if (this.isAtEnd()) return this;
    let chip = this.placeholderStartingAt(this.offset) ?? this.placeholderContaining(this.offset);
    if (chip) return new Cursor(this.measuredText, this.skipBlanks(chip.end));
    let pos = this.offset;
    let nextOffset = (pos) => this.measuredText.nextOffset(pos);
    let currentGrapheme = this.graphemeAt(pos);
    if (!currentGrapheme) return this;
    if (this.isOnEmptyLine(pos)) pos = nextOffset(pos);
    else if (isWordChar(currentGrapheme))
      while (pos < this.text.length && isWordChar(this.graphemeAt(pos))) pos = nextOffset(pos);
    else if (isPunctuationChar(currentGrapheme))
      while (pos < this.text.length && isPunctuationChar(this.graphemeAt(pos))) pos = nextOffset(pos);
    return new Cursor(this.measuredText, this.snapOutOfPlaceholder(this.skipBlanks(pos), "end"));
  }
  skipBlanks(offset) {
    let current = offset;
    while (
      current < this.text.length &&
      WHITESPACE_RE.test(this.graphemeAt(current)) &&
      !this.isOnEmptyLine(current)
    )
      current = this.measuredText.nextOffset(current);
    return current;
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
    let chip = this.placeholderStartingAt(this.offset) ?? this.placeholderContaining(this.offset);
    if (chip && this.offset < chip.end - 1) return new Cursor(this.measuredText, chip.end - 1);
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
    let chip_2 = this.placeholderStartingAt(pos) ?? this.placeholderContaining(pos);
    if (chip_2) pos = chip_2.end - 1;
    return new Cursor(this.measuredText, pos);
  }
  prevVimWord() {
    if (this.isAtStart()) return this;
    let chip = this.placeholderEndingAt(this.offset);
    if (chip) return new Cursor(this.measuredText, chip.start);
    let chip_2 = this.placeholderContaining(this.offset);
    if (chip_2) return new Cursor(this.measuredText, chip_2.start);
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
    let chip = this.placeholderStartingAt(this.offset) ?? this.placeholderContaining(this.offset);
    if (chip && this.offset < chip.end - 1) return new Cursor(this.measuredText, chip.end - 1);
    let cursor = this;
    if (!cursor.isOverWhitespace() && (cursor.right().isOverWhitespace() || cursor.right().isAtEnd())) {
      cursor = cursor.right();
      return cursor.endOfWORD();
    }
    if (cursor.isOverWhitespace()) {
      while (cursor.isOverWhitespace() && !cursor.isAtEnd()) cursor = cursor.nextWORD();
      let chip = cursor.placeholderStartingAt(cursor.offset);
      if (chip) return new Cursor(this.measuredText, chip.end - 1);
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
    let prefixText = this.text.slice(0, startOffset) + insertString;
    let mergedText = prefixText + this.text.slice(endOffset);
    let nextOffset = prefixText.normalize("NFC").length;
    let nextCursor = Cursor.fromText(mergedText, this.columns, nextOffset);
    let offsetShifted = nextOffset !== startOffset + insertString.normalize("NFC").length;
    let { measuredText, offset } = nextCursor;
    if (offsetShifted && measuredText.snapToGraphemeBoundary(offset) !== offset)
      return new Cursor(measuredText, measuredText.nextOffset(offset));
    return nextCursor;
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
  deleteToLineStart(startCursor) {
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
    let startCursor_2 = startCursor ?? this.startOfLine();
    return this.killRange(startCursor_2.offset, this.offset);
  }
  deleteToLineEnd(endCursor) {
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
    return this.killRange(this.offset, (endCursor ?? this.endOfLine()).offset);
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
  killRange(startOffset, endOffset) {
    let snappedStart = this.snapOutOfPlaceholder(startOffset, "start");
    let snappedEnd = this.snapOutOfPlaceholder(endOffset, "end");
    let startCursor = new Cursor(this.measuredText, snappedStart);
    let endCursor = new Cursor(this.measuredText, snappedEnd);
    return {
      cursor: startCursor.modifyText(endCursor),
      killed: this.text.slice(snappedStart, snappedEnd),
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
    let isFCharMotion = type === "f" || type === "t";
    let till = type === "t" || type === "T";
    let found = 0;
    if (isFCharMotion) {
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
//@ chunk-42wa4pww.js:34257-34619 layout
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
  equals(other) {
    return this.text === other.text && this.startOffset === other.startOffset;
  }
}
//@ chunk-42wa4pww.js:34619-38481 fingerprint (2.1.88 match: MeasuredText, 0.898)
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
        (row) => new MeasuredLine(row.text, row.startOffset, row.isPrecededByNewline, row.endsWithNewline),
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
      let boundaries = [];
      let prevEndWasSnapped = false;
      for (let wordBoundary of this.getWordBoundaries()) {
        let sliced = this.text.slice(wordBoundary.start, wordBoundary.end);
        for (let wordMatch of sliced.matchAll(WORD_RE)) {
          let wordStart = this.snapToGraphemeBoundary(wordBoundary.start + wordMatch.index);
          let wordEnd = wordBoundary.start + wordMatch.index + wordMatch[0].length;
          let snappedWordEnd = this.snapToGraphemeBoundary(wordEnd);
          let boundaryEnd = snappedWordEnd === wordEnd ? wordEnd : this.nextOffset(snappedWordEnd);
          let last = boundaries.at(-1);
          if (last && (wordStart < last.end || (wordStart === last.end && prevEndWasSnapped)))
            last.end = Math.max(last.end, boundaryEnd);
          else
            boundaries.push({
              start: wordStart,
              end: boundaryEnd,
            });
          prevEndWasSnapped = boundaryEnd !== wordEnd;
        }
      }
      this.readlineWordBoundariesCache = boundaries;
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
//@ chunk-42wa4pww.js:38481-38712 affinity
function renderRowSpans(displayText, { from, to }, invert, { spans, rowStart }) {
  let cursorPos = from;
  let output = "";
  for (let span of spans) {
    let max = Math.max(cursorPos, span.start - rowStart);
    let min = Math.min(to, span.end - rowStart);
    if (min <= max) continue;
    output +=
      (max > cursorPos ? invert(displayText.slice(cursorPos, max)) : "") + displayText.slice(max, min);
    cursorPos = min;
  }
  return cursorPos === from || to > cursorPos ? output + invert(displayText.slice(cursorPos, to)) : output;
}
//@ chunk-880p06ha.js:746-928 placement
/**
 * 光标所在逻辑行的显示列（制表符按 tab stop 计）。
 */
function getCursorDisplayColumn(cursor, wantedColumn) {
  if (wantedColumn?.offset === cursor.offset && wantedColumn.text === cursor.text) return wantedColumn.column;
  let offset = cursor.startOfLogicalLine().offset;
  let displayColumn = displayWidthBetween(cursor.text, offset, cursor.offset);
  return cursor.text[cursor.offset] === "\t"
    ? displayColumn + charDisplayWidth("\t", displayColumn) - 1
    : displayColumn;
}
//@ chunk-880p06ha.js:928-1023 layout
function displayWidthBetween(text, offset, offset_2) {
  let column = 0;
  for (let { segment } of getGraphemeSegmenter().segment(text.slice(offset, offset_2)))
    column += charDisplayWidth(segment, column);
  return column;
}
//@ chunk-880p06ha.js:1023-1146 placement
/**
 * 从起点累加显示宽度，超过宽度时返回该处偏移（误配名）。
 */
function displayColumnToOffset(text, startIndex, endIndex, cursorDisplayColumn) {
  let column = 0;
  for (let { segment, index } of getGraphemeSegmenter().segment(text.slice(startIndex, endIndex))) {
    column += charDisplayWidth(segment, column);
    if (column > cursorDisplayColumn) return startIndex + index;
  }
  return endIndex;
}
//@ chunk-880p06ha.js:1146-1195 placement
function charDisplayWidth(segment, column) {
  return segment === "\t" ? DEFAULT_TAB_WIDTH - (column % DEFAULT_TAB_WIDTH) : bunStringWidth(segment);
}
//@ chunk-880p06ha.js:19097-19205 placement
/**
 * 返回行首空白之后第一个非空白字符的偏移（误配名 wrapText）。
 */
function firstNonBlankOffset(text) {
  let lastIndex = 0;
  for (let { segment, index } of getGraphemeSegmenter().segment(text)) {
    lastIndex = index;
    if (segment !== " " && segment !== "\t") break;
  }
  return lastIndex;
}
//@ chunk-880p06ha.js:28617-28980 placement
/**
 * 按逻辑行移动光标并保持期望列（误配名 truncatePathMiddle，属输入框光标）。
 */
function moveLogicalLinesToColumn(isDirForEllipsis, count, ctx) {
  let { cursor } = ctx;
  let text = cursor.text;
  let offset = cursor.startOfLogicalLine().offset;
  let cursorDisplayColumn = getCursorDisplayColumn(cursor, ctx.wantedColumn);
  let offset_2 = offset;
  for (let k = 0; k < count; k++)
    if (isDirForEllipsis) {
      let index = text.indexOf(
        `
`,
        offset_2,
      );
      if (index === -1) break;
      offset_2 = index + 1;
    } else if (offset_2 === 0) break;
    else
      offset_2 =
        offset_2 === 1
          ? 0
          : text.lastIndexOf(
              `
`,
              offset_2 - 2,
            ) + 1;
  if (offset_2 === offset)
    return {
      offset: null,
      column: cursorDisplayColumn,
    };
  let index = text.indexOf(
    `
`,
    offset_2,
  );
  let endIndex = index === -1 ? text.length : index;
  let truncatedStart = displayColumnToOffset(text, offset_2, endIndex, cursorDisplayColumn);
  return {
    offset: snapToPlaceholderEnd(cursor, truncatedStart, offset_2),
    column: cursorDisplayColumn,
  };
}
//@ chunk-18rrbwq1.js:37738-37742 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18rrbwq1.js:37738", () => {
  init_react_production();
});
//@ chunk-18rrbwq1.js:47750-47779 placement
/**
 * 是否处于“不强制重渲染”的模式。
 */
function isNoForceUpdateRenders() {
  return !renderWithForceUpdate(currentToolPermissionContext);
}
//@ chunk-18rrbwq1.js:47783-48582 placement
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
        let startOffset = newlineIndex;
        lines.push(
          freezeLineInfo({
            text: lineText,
            startOffset,
            isPrecededByNewline: isPrecededByNewline(text, startOffset, row === 0),
            endsWithNewline: true,
          }),
        );
      } else {
        let startOffset = text.length;
        lines.push(
          freezeLineInfo({
            text: lineText,
            startOffset,
            isPrecededByNewline: isPrecededByNewline(text, startOffset, row === 0),
            endsWithNewline: false,
          }),
        );
      }
      continue;
    }
    let index = text.indexOf(lineText, searchFrom);
    if (index === -1) {
      let startOffset = searchFrom;
      lines.push(
        freezeLineInfo({
          text: lineText,
          startOffset,
          isPrecededByNewline: isPrecededByNewline(text, startOffset, row === 0),
          endsWithNewline: false,
        }),
      );
      searchFrom = startOffset + lineText.length;
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
//@ chunk-18rrbwq1.js:48582-48727 fingerprint (2.1.88 match: WrappedLine, 0.614)
function WrappedLine(measured, index) {
  let lineIndex = clampIndex(index, 0, Math.max(0, measured.lines.length - 1));
  return (
    measured.lines[lineIndex] ?? {
      text: "",
      startOffset: 0,
      isPrecededByNewline: true,
      endsWithNewline: false,
    }
  );
}
//@ chunk-18rrbwq1.js:48727-49179 placement
/**
 * 把文本偏移换成换行后的行列位置（非换行开头的行忽略前导空白）。
 */
function offsetToPosition(measured, offset) {
  if (measured.lines.length === 0)
    return {
      line: 0,
      column: 0,
    };
  let clampedOffset = clampIndex(offset, 0, measured.text.length);
  for (let idx = 0; idx < measured.lines.length; idx++) {
    let line = measured.lines[idx];
    let nextLine = measured.lines[idx + 1];
    if (clampedOffset >= line.startOffset && (!nextLine || clampedOffset < nextLine.startOffset)) {
      let index = clampedOffset - line.startOffset;
      let column;
      if (line.isPrecededByNewline) column = getKillRingSize(line.text, index);
      else {
        let indentWidth = line.text.length - line.text.trimStart().length;
        if (index < indentWidth) column = 0;
        else column = getKillRingSize(line.text.slice(indentWidth), index - indentWidth);
      }
      return {
        line: idx,
        column,
      };
    }
  }
  let lastIndex = measured.lines.length - 1;
  let lastLine = measured.lines[lastIndex];
  return {
    line: lastIndex,
    column: bunStringWidth(lastLine.text),
  };
}
//@ chunk-18rrbwq1.js:49179-49435 placement
function positionToOffset(measured, lineIndex, column) {
  if (measured.lines.length === 0) return 0;
  let line = WrappedLine(measured, lineIndex);
  if (line.text.length === 0 && line.endsWithNewline) return line.startOffset;
  let indentWidth = line.isPrecededByNewline ? 0 : line.text.length - line.text.trimStart().length;
  let offsetInLine = getKillRingItem(line.text.slice(indentWidth), Math.max(0, column)) + indentWidth;
  return line.startOffset + offsetInLine;
}
//@ chunk-18rrbwq1.js:49435-49521 placement
function getKillRingSize(text, index) {
  if (index <= 0) return 0;
  if (index >= text.length) return bunStringWidth(text);
  return bunStringWidth(text.slice(0, index));
}
//@ chunk-18rrbwq1.js:49521-49650 placement
function getKillRingItem(graphemes, targetColumn) {
  if (targetColumn <= 0 || graphemes.length === 0) return 0;
  let width = 0;
  let length = 0;
  for (let grapheme of graphemes) {
    let graphemeWidth = bunStringWidth(grapheme);
    if (width + graphemeWidth > targetColumn) break;
    width += graphemeWidth;
    length += grapheme.length;
  }
  return length;
}
//@ chunk-18rrbwq1.js:49650-49708 placement
/**
 * 判断某位置的前一个字符是否为换行（行首）。
 */
function isPrecededByNewline(text, offset, isFirstRow) {
  if (isFirstRow) return true;
  return (
    offset > 0 &&
    text[offset - 1] ===
      `
`
  );
}
//@ chunk-18rrbwq1.js:49708-49747 placement
/**
 * 冻结行信息对象，防止被修改。
 */
function freezeLineInfo(line) {
  return Object.freeze(line);
}
//@ chunk-18rrbwq1.js:49747-49787 placement
/**
 * 把索引限制在 [min, max] 区间内。
 */
function clampIndex(value, min, max) {
  return value < min ? min : value > max ? max : value;
}
export {
  Cursor,
  measureText,
  offsetToPosition,
  positionToOffset,
  wrapByDisplayWidth,
  isWordChar,
  isWhitespaceChar,
  isPunctuationChar,
  replaceWithSpaces,
  displayColumnToOffset,
  getCursorDisplayColumn,
  firstNonBlankOffset,
  moveLogicalLinesToColumn,
  isNoForceUpdateRenders,
  isPlaceholderAt,
  pushToKillRing,
};
