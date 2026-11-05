/**
 * vim/operators.ts
 *
 * 并入旧版已有路径：vim 操作符。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/vim/operators.ts
 * pieces: chunk-880p06ha.js (58)
 * attribution: fingerprint 16, layout 32, file-local 1, affinity 2, placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { resolveMotion, CHAR_MOTIONS } from "./types.js";
import { isLinewiseMotion, isInclusiveMotion } from "./motions.js";
import {
  displayColumnToOffset,
  getCursorDisplayColumn,
  Cursor,
  firstNonBlankOffset,
  isWhitespaceChar,
} from "../utils/Cursor.js";
import { findTextObject } from "./textObjects.js";
import { isImagePlaceholder } from "../commands.js";
import { firstGrapheme, lastGrapheme, countGraphemes, getGraphemeSegmenter } from "../utils/intl.js";
import { countCharInString } from "../utils/stringUtils.js";
import { getSecuritySensitiveSetting } from "../utils/settings/settings.js";

//@ chunk-880p06ha.js:4644-5842 fingerprint (2.1.88 match: executeLineOp, 0.667)
/**
 * 操作符 + 移动（如 dw、c$、yj、dgj）：整行移动（j k G gg）按行处理；移动没动且不是包含式移动时只做空操作的副作用（c 进插入、y 清寄存器）；否则用 getOperatorRange 算范围（cw 特例、w 跨行截断、整行化判断）后应用操作并记录可重复的修改。
 */
function executeOperatorMotion(op, motion, count, ctx) {
  if (motion === "gj" || motion === "gk") {
    let screenLineMove = computeScreenLineMove(motion, count, ctx);
    if (screenLineMove.rowsRunOut) {
      ctx.setOffset(clampOffsetOutsidePlaceholder(ctx.cursor, screenLineMove.offset));
      return;
    }
  }
  let target = resolveMotion(motion, ctx.cursor, count);
  if (isLinewiseMotion(motion)) {
    let lineIndexAt = getLineIndexAt(ctx.text, ctx.cursor.offset);
    let lineIndexAt_2 = getLineIndexAt(ctx.text, target.offset);
    if (lineIndexAt_2 !== lineIndexAt) {
      let lineStartAt = getLineStartAt(ctx.text, target.offset);
      let index = ctx.text.indexOf(
        `
`,
        lineStartAt,
      );
      let lineEndOffset = index === -1 ? ctx.text.length : index;
      let clampedOffset = displayColumnToOffset(
        ctx.text,
        lineStartAt,
        lineEndOffset,
        getCursorDisplayColumn(ctx.cursor, ctx.wantedColumn),
      );
      let targetOffset =
        clampedOffset === lineEndOffset &&
        lineEndOffset > lineStartAt &&
        clampOffsetOutsidePlaceholder(ctx.cursor, lineEndOffset) === lineEndOffset
          ? ctx.cursor.measuredText.prevOffset(lineEndOffset)
          : clampedOffset;
      let linewiseOffset =
        motion === "k"
          ? snapToPlaceholderEnd(ctx.cursor, targetOffset, lineStartAt)
          : Math.min(ctx.cursor.offset, target.offset);
      applyLinewiseOperator(op, lineIndexAt, lineIndexAt_2, ctx, linewiseOffset);
      recordRepeatableChange(ctx, {
        type: "operator",
        op,
        motion,
        count,
      });
    }
    return;
  }
  if (motion === "%" && target.equals(ctx.cursor)) return;
  if (target.equals(ctx.cursor) && !isInclusiveMotion(motion)) {
    let isWordMotion = (motion === "w" || motion === "W") && count > 0;
    if (motion === "0" || motion === "^" || isWordMotion || CHAR_MOTIONS.has(motion)) {
      if (op === "yank") ctx.setRegister("", false);
      else if (op === "change") ctx.enterInsert(ctx.cursor.offset);
      recordRepeatableChange(ctx, {
        type: "operator",
        op,
        motion,
        count,
      });
    }
    return;
  }
  let operatorRange = getOperatorRange(ctx.cursor, target, motion, op, count);
  if (operatorRange.from === operatorRange.to && !(operatorRange.linewise && motion === " ")) {
    if (op === "change" || op === "yank") ctx.setRegister("", false);
    if (op === "change") {
      ctx.enterInsert(operatorRange.from);
      recordRepeatableChange(ctx, {
        type: "operator",
        op,
        motion,
        count,
      });
    }
    return;
  }
  if (operatorRange.linewise && op !== "change")
    applyLinewiseOperator(
      op,
      getLineIndexAt(ctx.text, operatorRange.from),
      getLineIndexAt(ctx.text, Math.max(operatorRange.from, operatorRange.to - 1)),
      ctx,
      ctx.cursor.offset,
    );
  else applyOperator(op, operatorRange.from, operatorRange.to, ctx, operatorRange.linewise);
  recordRepeatableChange(ctx, {
    type: "operator",
    op,
    motion,
    count,
  });
}
//@ chunk-880p06ha.js:5842-6070 fingerprint (2.1.88 match: executeOperatorFind, 0.944)
/**
 * 操作符 + 查找（如 dfx、ct)）：找到目标字符后对包含式范围应用操作，并记住这次查找供 ; , 重复。
 */
function executeOperatorFind(op, findType, char, count, ctx) {
  let targetOffset = ctx.cursor.findCharacter(char, findType, count);
  if (targetOffset === null) return;
  let target = new Cursor(ctx.cursor.measuredText, targetOffset);
  let range = getFindRange(ctx.cursor, target, findType);
  applyOperator(op, range.from, range.to, ctx);
  ctx.setLastFind(findType, char);
  recordRepeatableChange(ctx, {
    type: "operatorFind",
    op,
    find: findType,
    char,
    count,
  });
}
//@ chunk-880p06ha.js:6070-6363 fingerprint (2.1.88 match: executeOperatorTextObj, 0.701)
/**
 * 操作符 + 文本对象（如 diw、ca"、yi(）：用 findTextObject 求范围后应用；yi( 这类内容从换行开始时光标落到下一行。
 */
function executeOperatorTextObj(op, scope, objType, count, ctx) {
  let range = findTextObject(ctx.text, ctx.cursor.offset, objType, scope === "inner");
  if (!range) return;
  applyOperator(op, range.start, range.end, ctx);
  let { start } = range;
  let followsParenNewline =
    scope === "inner" &&
    count === 1 &&
    start > 0 &&
    "([{<".includes(ctx.text[start - 1] ?? " ") &&
    ctx.text[start] ===
      `
`;
  if (op === "yank" && followsParenNewline) ctx.setOffset(start + 1);
  recordRepeatableChange(ctx, {
    type: "operatorTextObj",
    op,
    objType,
    scope,
    count,
  });
}
//@ chunk-880p06ha.js:6363-6715 fingerprint (2.1.88 match: executeOperatorMotion, 0.559)
/**
 * 双写操作符（dd、cc、yy、S、Y）：对从当前行起的 count 行做整行操作；count>1 但光标后已没有换行时不执行。
 */
function executeLineOp(op, count, ctx) {
  if (count < 1) return;
  let lineIndexAt = getLineIndexAt(ctx.text, ctx.cursor.offset);
  if (
    count > 1 &&
    !ctx.cursor.text.includes(
      `
`,
      ctx.cursor.offset,
    )
  )
    return;
  let { offset } = ctx.cursor;
  let placeholderEnd =
    ctx.text[offset] ===
    `
`
      ? ctx.cursor.placeholderEndingAt(offset)
      : null;
  let isEmptyPromptLine =
    placeholderEnd !== null && isImagePlaceholder(ctx.text.slice(placeholderEnd.start, placeholderEnd.end));
  applyLinewiseOperator(
    op,
    lineIndexAt,
    lineIndexAt + count - 1,
    ctx,
    isEmptyPromptLine ? ctx.cursor.startOfLogicalLine().offset : offset,
  );
  recordRepeatableChange(ctx, {
    type: "operator",
    op,
    motion: op[0],
    count,
  });
}
//@ chunk-880p06ha.js:6715-6961 fingerprint (2.1.88 match: executeX, 0.838)
/**
 * x：删除光标处 count 个字符（不跨行），存入寄存器。
 */
function executeX(count, ctx) {
  let from = ctx.cursor.offset;
  if (from >= ctx.text.length) return;
  let end = advanceCharsInLine(ctx, count);
  if (end === from) return;
  let deleted = ctx.text.slice(from, end);
  let newText = ctx.text.slice(0, from) + ctx.text.slice(end);
  ctx.setRegister(deleted, false);
  ctx.setText(newText);
  ctx.setOffset(clampCursorOffset(newText, from));
  ctx.recordChange({
    type: "x",
    count,
  });
}
//@ chunk-880p06ha.js:6961-7159 layout
/**
 * s：删除 count 个字符并进入插入模式。
 */
function executeSubstitute(count, ctx) {
  let offset = ctx.cursor.offset;
  let end = advanceCharsInLine(ctx, count);
  if (end > offset) {
    ctx.setRegister(ctx.text.slice(offset, end), false);
    ctx.setText(ctx.text.slice(0, offset) + ctx.text.slice(end));
  }
  ctx.enterInsert(offset);
  ctx.recordChange({
    type: "substitute",
    count,
  });
}
//@ chunk-880p06ha.js:7159-7422 fingerprint (2.1.88 match: executeReplace, 0.948)
/**
 * r{char}：把光标起 count 个字素替换为该字符（遇到行尾则不执行）。
 */
function executeReplace(char, count, ctx) {
  let offset = ctx.cursor.offset;
  let newText = ctx.text;
  let pos = offset;
  for (let index = 0; index < count; index++) {
    if (
      pos >= newText.length ||
      newText[pos] ===
        `
`
    )
      return;
    pos += firstGrapheme(newText.slice(pos)).length || 1;
  }
  ctx.setText(newText.slice(0, offset) + char.repeat(count) + newText.slice(pos));
  ctx.setOffset(offset + char.length * (count - 1));
  ctx.recordChange({
    type: "replace",
    char,
    count,
  });
}
//@ chunk-880p06ha.js:7422-7810 fingerprint (2.1.88 match: executeToggleCase, 0.755)
/**
 * ~：切换光标起 count 个字素的大小写（NFC 规范化），光标后移。
 */
function executeToggleCase(count, ctx) {
  let columns = ctx.cursor.measuredText.columns;
  let newText = ctx.text;
  let offset = ctx.cursor.offset;
  let toggled = 0;
  while (
    offset < newText.length &&
    newText[offset] !==
      `
` &&
    toggled < count
  ) {
    let grapheme = firstGrapheme(newText.slice(offset));
    let graphemeLen = grapheme.length;
    let toggledGrapheme = (
      grapheme === grapheme.toUpperCase() ? grapheme.toLowerCase() : grapheme.toUpperCase()
    ).normalize("NFC");
    newText = newText.slice(0, offset) + toggledGrapheme + newText.slice(offset + graphemeLen);
    offset += toggledGrapheme.length;
    toggled++;
  }
  if (toggled === 0) return;
  let toggledCursor = Cursor.fromText(newText, columns);
  ctx.setText(newText);
  ctx.setOffset(clampOffsetOutsidePlaceholder(toggledCursor, offset));
  ctx.recordChange({
    type: "toggleCase",
    count,
  });
}
//@ chunk-880p06ha.js:7810-8061 layout
/**
 * J：把当前行与后面 max(count,2)-1 行合并。
 */
function executeJoinLines(count, ctx) {
  let lines = ctx.text.split(`
`);
  let lineIndex = getLineIndexAt(ctx.cursor.text, ctx.cursor.offset);
  if (lineIndex >= lines.length - 1) {
    if (count >= 3) {
      ctx.setOffset(getLineStartAt(ctx.cursor.text, ctx.cursor.offset));
      ctx.recordChange({
        type: "join",
        count: 2,
      });
    }
    return;
  }
  let min = Math.min(Math.max(count, 2) - 1, lines.length - lineIndex - 1);
  executeJoin(lines, lineIndex, min, ctx);
}
//@ chunk-880p06ha.js:8061-8399 fingerprint (2.1.88 match: executeJoin, 0.739)
/**
 * 合并行：去掉后续行行首空白，必要时补一个空格（下一行以 ) 开头或上一段以空白结尾时不补），光标停在最后一个连接点。
 */
function executeJoin(lines, lineIndex, joinCount, ctx) {
  let joinedLine = lines[lineIndex];
  let cursorPos = joinedLine.length;
  let previousLine = joinedLine;
  for (let i = 1; i <= joinCount; i++) {
    cursorPos = joinedLine.length;
    let nextLine = lines[lineIndex + i].replace(/^[ \t\r]+/, "");
    if (
      nextLine.length > 0 &&
      joinedLine.length > 0 &&
      !nextLine.startsWith(")") &&
      !/[ \t]$/.test(previousLine)
    )
      joinedLine += " ";
    joinedLine += nextLine;
    previousLine = nextLine;
  }
  let newLines = [...lines.slice(0, lineIndex), joinedLine, ...lines.slice(lineIndex + joinCount + 1)];
  let newText = newLines.join(`
`);
  ctx.setText(newText);
  ctx.setOffset(clampCursorOffset(newText, getLineStartOffset(newLines, lineIndex) + cursorPos));
  ctx.recordChange({
    type: "join",
    count: joinCount + 1,
  });
}
//@ chunk-880p06ha.js:8399-9241 fingerprint (2.1.88 match: executePaste, 0.568)
/**
 * p/P：按寄存器是否整行分两种：整行内容插到当前行下/上方并把光标放到首个非空字符；字符内容插到光标后/前，光标停在插入内容最后一个字素。
 */
function executePaste(after, count, ctx) {
  let register = ctx.getRegister();
  if (!register) return;
  ctx.recordChange({
    type: "paste",
    after,
    count,
  });
  let isLinewise = ctx.getRegisterIsLinewise();
  let content =
    isLinewise &&
    register.endsWith(`
`)
      ? register.slice(0, -1)
      : register;
  if (isLinewise) {
    let text = ctx.text;
    let lines = text.split(`
`);
    let currentLine = getLineIndexAt(ctx.cursor.text, ctx.cursor.offset);
    let insertLine = after ? currentLine + 1 : currentLine;
    let contentLines = content.split(`
`);
    let repeatedLines = [];
    for (let i = 0; i < count; i++) repeatedLines.push(...contentLines);
    let newLines = [...lines.slice(0, insertLine), ...repeatedLines, ...lines.slice(insertLine)];
    let newText = newLines.join(`
`);
    let lineStartOffset = getLineStartOffset(newLines, insertLine);
    let firstLineCursor = Cursor.fromText(contentLines[0] ?? "", ctx.cursor.measuredText.columns);
    let firstNonBlank = firstNonBlankOffset_2(firstLineCursor);
    ctx.setText(newText, {
      previous: {
        value: text,
        cursorOffset: lineStartOffset,
      },
    });
    ctx.setOffset(
      lineStartOffset + (firstLineCursor.placeholderStartingAt(firstNonBlank) ? 0 : firstNonBlank),
    );
  } else {
    let textToInsert = content.repeat(count);
    let offset = ctx.cursor.offset;
    let isAtLineStart =
      ctx.text[offset] ===
        `
` &&
      (offset === 0 ||
        ctx.text[offset - 1] ===
          `
`);
    let insertOffset =
      after && offset < ctx.text.length && !isAtLineStart
        ? ctx.cursor.measuredText.nextOffset(offset)
        : offset;
    let newText = ctx.text.slice(0, insertOffset) + textToInsert + ctx.text.slice(insertOffset);
    let lastGr = textToInsert.includes(`
`)
      ? clampCursorOffset(newText, insertOffset)
      : insertOffset + textToInsert.length - (lastGrapheme(textToInsert).length || 1);
    ctx.setText(newText, {
      previous: {
        value: ctx.text,
        cursorOffset: insertOffset,
      },
    });
    ctx.setOffset(lastGr);
  }
}
//@ chunk-880p06ha.js:9241-9508 fingerprint (2.1.88 match: executeIndent, 0.819)
/**
 * >> / <<：给当前行起 count 行加/减两个空格缩进（减时也去掉一个 tab 或最多两个空白）。
 */
function executeIndent(dir, count, ctx) {
  let lines = ctx.text.split(`
`);
  let from = getLineIndexAt(ctx.cursor.text, ctx.cursor.offset);
  if (count > 1 && from === lines.length - 1) return;
  let linesToAffect = Math.min(count, lines.length - from);
  indentLines(lines, from, from + linesToAffect - 1, dir);
  let newText = lines.join(`
`);
  let firstLineWidth = firstNonBlankOffset(lines[from] ?? "");
  ctx.setText(newText);
  ctx.setOffset(getLineStartOffset(lines, from) + firstLineWidth);
  ctx.recordChange({
    type: "indent",
    dir,
    count,
  });
}
//@ chunk-880p06ha.js:9508-9780 fingerprint (2.1.88 match: executeOpenLine, 0.807)
/**
 * o/O：在当前行下/上方插入空行并进入插入模式。
 */
function executeOpenLine(direction, ctx) {
  let text = ctx.text;
  let lines = text.split(`
`);
  let currentLine = getLineIndexAt(ctx.cursor.text, ctx.cursor.offset);
  let insertLine = direction === "below" ? currentLine + 1 : currentLine;
  let newLines = [...lines.slice(0, insertLine), "", ...lines.slice(insertLine)];
  let newText = newLines.join(`
`);
  let lineStartOffset = getLineStartOffset(newLines, insertLine);
  ctx.setText(newText, {
    previous: {
      value: text,
      cursorOffset: lineStartOffset,
    },
  });
  ctx.enterInsert(lineStartOffset);
  ctx.recordChange({
    type: "openLine",
    direction,
  });
}
//@ chunk-880p06ha.js:9780-9831 layout
function recordRepeatableChange(ctx, change) {
  if (change.op !== "yank") ctx.recordChange(change);
}
//@ chunk-880p06ha.js:9831-9958 layout
function advanceCharsInLine(ctx, count) {
  let cursor = ctx.cursor;
  for (let i = 0; i < count && !cursor.isAtEnd(); i++) {
    if (
      ctx.text[cursor.offset] ===
      `
`
    )
      break;
    cursor = cursor.right();
  }
  return cursor.offset;
}
//@ chunk-880p06ha.js:9958-10021 file-local
function getLineStartOffset(lines, lineIndex) {
  return (
    lines.slice(0, lineIndex).join(`
`).length + (lineIndex > 0 ? 1 : 0)
  );
}
//@ chunk-880p06ha.js:10021-11264 fingerprint (2.1.88 match: getOperatorRange, 0.852)
/**
 * 操作符 + 移动的范围计算（vim 兼容细节）：cw 当作 ce；dw/yw 不越过行尾；包含式移动（e E $ %）把终点含进去；跨行删除且前面只有空白时整行化。最后把起止点推出占位符（图片/粘贴占位）之外。
 */
function getOperatorRange(cursor, target, motion, op, count) {
  let from = Math.min(cursor.offset, target.offset);
  let to = Math.max(cursor.offset, target.offset);
  let linewise = false;
  let isWordWise = motion === "w" || motion === "W";
  let isChangeWord = isWordWise && op === "change";
  let isYankOrDeleteWord = isWordWise && op !== "change";
  let cursorChar = cursor.text[cursor.offset];
  let isOnWhitespace =
    (cursorChar === " " ||
      cursorChar === "\t" ||
      cursorChar ===
        `
`) &&
    cursor.snapOutOfPlaceholder(cursor.offset, "start") === cursor.offset;
  if (isChangeWord && isOnWhitespace) {
    to = clampWordMotionToLineEnd(cursor, motion, count, to);
    if (
      to > from &&
      cursor.text[to - 1] ===
        `
`
    ) {
      to -= 1;
      let offset = cursor.startOfLogicalLine().offset;
      if (/^[ \t]*$/.test(cursor.text.slice(offset, from))) {
        from = offset;
        linewise = true;
      }
    }
  } else if (isChangeWord) {
    let wordCursor = cursor;
    for (let i = 0; i < count - 1; i++)
      do wordCursor = motion === "w" ? wordCursor.nextVimWord() : wordCursor.nextWORD();
      while (cursor.isOnEmptyLine(wordCursor.offset));
    let wordEnd = motion === "w" ? wordCursor.endOfVimWord() : wordCursor.endOfWORD();
    let nextOffset = cursor.measuredText.nextOffset(wordCursor.offset);
    let nextWord = motion === "w" ? wordCursor.nextVimWord() : wordCursor.nextWORD();
    if (
      (nextOffset >= cursor.text.length ||
        isWhitespaceChar(cursor.text[nextOffset] ?? "") ||
        nextWord.offset === nextOffset) &&
      !isWhitespaceChar(cursor.text[cursor.offset] ?? "") &&
      !isWhitespaceChar(cursor.text[wordCursor.offset] ?? "")
    )
      wordEnd = wordCursor;
    to = cursor.measuredText.nextOffset(wordEnd.offset);
  } else if (
    isInclusiveMotion(motion) &&
    (motion === "%" || cursor.offset <= target.offset) &&
    cursor.text[to] !==
      `
`
  )
    to = cursor.measuredText.nextOffset(to);
  else if (isYankOrDeleteWord) to = clampWordMotionToLineEnd(cursor, motion, count, to);
  let lineStartAt = getLineStartAt(cursor.text, from);
  let matches = /^[ \t]*$/.test(cursor.text.slice(lineStartAt, from));
  if (
    (motion === " " || isYankOrDeleteWord) &&
    to > from &&
    cursor.text[to - 1] ===
      `
`
  ) {
    linewise = matches;
    from = linewise ? lineStartAt : from;
    to = linewise && op !== "change" ? to : to - 1;
  } else if (
    isYankOrDeleteWord &&
    op === "delete" &&
    matches &&
    cursor.text.slice(from, to).includes(`
`) &&
    /^[ \t]*(\n|$)/.test(cursor.text.slice(to))
  ) {
    from = lineStartAt;
    linewise = true;
  }
  from = cursor.snapOutOfPlaceholder(from, "start");
  to = cursor.snapOutOfPlaceholder(to, "end");
  return {
    from,
    to,
    linewise,
  };
}
//@ chunk-880p06ha.js:11264-11373 layout
function clampWordMotionToLineEnd(cursor, motion, count, targetOffset) {
  let motion_2 = resolveMotion(motion, cursor, count - 1);
  let offset = motion_2.endOfLogicalLine().offset;
  if (targetOffset <= offset) return targetOffset;
  return offset > motion_2.offset ? offset : offset + 1;
}
//@ chunk-880p06ha.js:11373-11569 layout
function getFindRange(cursor, target, _findType) {
  let max = Math.max(cursor.offset, target.offset);
  let from = cursor.snapOutOfPlaceholder(Math.min(cursor.offset, target.offset), "start");
  let to = cursor.snapOutOfPlaceholder(cursor.measuredText.nextOffset(max), "end");
  return {
    from,
    to,
  };
}
//@ chunk-880p06ha.js:11569-11920 fingerprint (2.1.88 match: applyOperator, 0.962)
/**
 * 对字符范围应用操作：内容写寄存器（整行时补换行）；yank 只移动光标；delete 删除并修正光标；change 删除后进入插入模式。
 */
function applyOperator(op, from, to, ctx, linewise = false) {
  let content = ctx.text.slice(from, to);
  if (
    linewise &&
    !content.endsWith(`
`)
  )
    content =
      content +
      `
`;
  if (content || op !== "delete") ctx.setRegister(content, linewise);
  if (op === "yank") ctx.setOffset(clampOffsetOutsidePlaceholder(ctx.cursor, from));
  else if (op === "delete") {
    let newText = ctx.text.slice(0, from) + ctx.text.slice(to);
    ctx.setText(newText);
    ctx.setOffset(clampCursorOffset(newText, from));
  } else if (op === "change") {
    let newText = ctx.text.slice(0, from) + ctx.text.slice(to);
    ctx.setText(newText);
    ctx.enterInsert(from);
  }
}
//@ chunk-880p06ha.js:11920-12099 layout
/**
 * 普通模式光标不能停在行尾换行符上或文本末尾之后：退回到前一个字素。
 */
function clampCursorOffset(text, offset) {
  if (
    text[offset] ===
      `
` &&
    offset > 0 &&
    text[offset - 1] !==
      `
`
  )
    return offset - (lastGrapheme(text.slice(0, offset)).length || 1);
  if (
    offset >= text.length &&
    !text.endsWith(`
`)
  )
    return Math.max(0, text.length - (lastGrapheme(text).length || 1));
  return offset;
}
//@ chunk-880p06ha.js:12099-12262 layout
function snapToPlaceholderEnd(cursor, offset, lineStart) {
  let placeholder = placeholderAt(cursor, offset);
  let currentOffset = offset;
  while (placeholder && placeholder.start > lineStart) {
    currentOffset = cursor.measuredText.prevOffset(placeholder.start);
    placeholder = placeholderAt(cursor, currentOffset);
  }
  if (!placeholder) return currentOffset;
  let end = placeholder.end;
  while ((placeholder = placeholderAt(cursor, end))) end = placeholder.end;
  return end;
}
//@ chunk-880p06ha.js:12262-12353 layout
function placeholderAt(cursor, offset) {
  let snappedOffset = cursor.snapOutOfPlaceholder(offset, "start");
  return cursor.placeholderStartingAt(snappedOffset);
}
//@ chunk-880p06ha.js:12353-12443 layout
function clampOffsetOutsidePlaceholder(cursor, offset, text = cursor.text) {
  let clampedOffset = clampCursorOffset(text, offset);
  return cursor.snapOutOfPlaceholder(clampedOffset, "start") === clampedOffset ? clampedOffset : offset;
}
//@ chunk-880p06ha.js:12443-13003 layout
/**
 * gj/gk 的屏幕行移动：按折行后的行计算目标位置并保持目标列（wantedColumn）；返回 {offset, column, rowsRunOut}。
 */
function computeScreenLineMove(motion, count, ctx) {
  let { cursor } = ctx;
  let motion_2 = resolveMotion(motion, cursor, count);
  let wrappedLines = cursor.measuredText.getWrappedLines();
  let line = cursor.getPosition().line;
  let rowsRunOut = (motion === "gj" ? wrappedLines.length - 1 - line : line) < count;
  let currentRow = wrappedLines[line];
  let targetRow = wrappedLines[motion_2.getPosition().line];
  let currentRowStartsLine = currentRow?.startOffset === 0 || currentRow?.isPrecededByNewline;
  let targetRowStartsLine = targetRow?.startOffset === 0 || targetRow?.isPrecededByNewline;
  if (motion_2.equals(cursor) || !currentRowStartsLine || !targetRowStartsLine || !targetRow)
    return {
      offset: motion_2.offset,
      column: null,
      rowsRunOut,
    };
  let cursorDisplayColumn = getCursorDisplayColumn(cursor, ctx.wantedColumn);
  let rowEndOffset = targetRow.startOffset + targetRow.text.length;
  let clampedOffset = displayColumnToOffset(
    cursor.text,
    targetRow.startOffset,
    rowEndOffset,
    cursorDisplayColumn,
  );
  let snappedOffset = snapToPlaceholderEnd(cursor, clampedOffset, targetRow.startOffset);
  let hasMoreText = !targetRow.endsWithNewline && rowEndOffset < cursor.text.length;
  return {
    offset:
      snappedOffset === rowEndOffset && hasMoreText
        ? cursor.measuredText.prevOffset(rowEndOffset)
        : snappedOffset,
    column: cursorDisplayColumn,
    rowsRunOut,
  };
}
//@ chunk-880p06ha.js:13003-13087 layout
function getLineStartAt(text, offset) {
  if (offset === 0) return 0;
  let index = text.lastIndexOf(
    `
`,
    offset - 1,
  );
  return index === -1 ? 0 : index + 1;
}
//@ chunk-880p06ha.js:13087-13169 layout
/**
 * 可视模式记录跨度：整行时为行数，否则为字素数（供 . 重复同样大小的可视操作）。
 */
function measureSpan(text, countLines) {
  if (countLines) {
    let newlineCount = countCharInString(
      text,
      `
`,
    );
    return text.endsWith(`
`)
      ? newlineCount
      : newlineCount + 1;
  }
  return countGraphemes(text);
}
//@ chunk-880p06ha.js:13169-13453 fingerprint (2.1.88 match: getOperatorRangeForFind, 0.907)
/**
 * 用记录的跨度从当前光标重建可视范围（. 重复可视操作时用）。
 */
function getRepeatVisualRange(cursor, target, _findType) {
  let text = cursor.text;
  if (_findType) {
    let lineStartAt = getLineStartAt(text, cursor.cursor.offset);
    let endOffset = lineStartAt;
    for (let k = 0; k < target; k++) {
      let index = text.indexOf(
        `
`,
        endOffset,
      );
      if (index === -1) {
        endOffset = text.length;
        break;
      }
      endOffset = index + 1;
    }
    return {
      from: lineStartAt,
      to: endOffset,
    };
  }
  let offset = cursor.cursor.offset;
  let endOffset = offset;
  for (let index = 0; index < target && endOffset < text.length; index++)
    endOffset = cursor.cursor.measuredText.nextOffset(endOffset);
  return {
    from: offset,
    to: endOffset,
  };
}
//@ chunk-880p06ha.js:13453-13680 layout (2.1.88 match: getOperatorRangeForFind, 0.907)
/**
 * 可视选区范围：字符可视为 [min, max+1)，整行可视扩到首行行首至末行换行之后。
 */
function getVisualRange(cursor, target, _findType) {
  let from = Math.min(cursor, target.cursor.offset);
  let maxOffset = Math.max(cursor, target.cursor.offset);
  if (!_findType)
    return {
      from,
      to: target.cursor.measuredText.nextOffset(maxOffset),
    };
  let text = target.text;
  let from_2 = getLineStartAt(text, from);
  let index = text.indexOf(
    `
`,
    maxOffset,
  );
  let to = index === -1 ? text.length : index + 1;
  return {
    from: from_2,
    to,
  };
}
//@ chunk-880p06ha.js:13680-13940 layout
function indentLines(lines, from, to, direction) {
  for (let line = from; line <= to; line++) {
    let lineText = lines[line] ?? "";
    if (lineText === "") continue;
    if (direction === ">") lines[line] = "  " + lineText;
    else if (lineText.startsWith("  ")) lines[line] = lineText.slice(2);
    else if (lineText.startsWith("\t")) lines[line] = lineText.slice(1);
    else {
      let stripCount = 0;
      while (stripCount < lineText.length && stripCount < 2 && /\s/.test(lineText[stripCount])) stripCount++;
      lines[line] = lineText.slice(stripCount);
    }
  }
}
//@ chunk-880p06ha.js:13940-14271 layout
function executeVisualJoin(anchor, ctx, linewise) {
  let min = Math.min(anchor, ctx.cursor.offset);
  let max = Math.max(anchor, ctx.cursor.offset);
  let text = ctx.text;
  let lineIndex = countCharInString(
    text.slice(0, min),
    `
`,
  );
  let lineSpan =
    countCharInString(
      text.slice(min, max),
      `
`,
    ) + 1;
  let lines = text.split(`
`);
  if (lineIndex >= lines.length - 1) {
    ctx.setOffset(linewise ? getLineStartAt(ctx.cursor.text, min) : clampCursorOffset(ctx.cursor.text, min));
    ctx.recordChange({
      type: "join",
      count: 2,
    });
    return;
  }
  let max_2 = Math.max(1, Math.min(lineSpan - 1, lines.length - lineIndex - 1));
  executeJoin(lines, lineIndex, max_2, ctx);
}
//@ chunk-880p06ha.js:14271-14367 layout
function executeJoinIfNotLastLine(count, ctx) {
  let lines = ctx.text.split(`
`);
  if (getLineIndexAt(ctx.cursor.text, ctx.cursor.offset) < lines.length - 1) executeJoinLines(count, ctx);
}
//@ chunk-880p06ha.js:14367-14688 layout
function executeVisualIndent(direction, count, anchor, ctx) {
  let min = Math.min(anchor, ctx.cursor.offset);
  let max = Math.max(anchor, ctx.cursor.offset);
  let text = ctx.text;
  let fromLine = countCharInString(
    text.slice(0, min),
    `
`,
  );
  let toLine =
    fromLine +
    countCharInString(
      text.slice(min, max),
      `
`,
    );
  let lines = text.split(`
`);
  for (let k = 0; k < count; k++) indentLines(lines, fromLine, toLine, direction);
  let joined = lines.join(`
`);
  let firstLineWidth = firstNonBlankOffset(lines[fromLine] ?? "");
  ctx.setText(joined);
  ctx.setOffset(getLineStartOffset(lines, fromLine) + firstLineWidth);
  ctx.recordChange({
    type: "visualIndent",
    dir: direction,
    count,
    lines: toLine - fromLine + 1,
  });
}
//@ chunk-880p06ha.js:14688-14903 layout
function repeatVisualIndent(direction, count, lines, ctx) {
  let text = ctx.text;
  let lines_2 = text.split(`
`);
  let fromLine = countCharInString(
    text.slice(0, ctx.cursor.offset),
    `
`,
  );
  let min = Math.min(fromLine + lines - 1, lines_2.length - 1);
  for (let k = 0; k < count; k++) indentLines(lines_2, fromLine, min, direction);
  let joined = lines_2.join(`
`);
  let firstLineWidth = firstNonBlankOffset(lines_2[fromLine] ?? "");
  ctx.setText(joined);
  ctx.setOffset(getLineStartOffset(lines_2, fromLine) + firstLineWidth);
}
//@ chunk-880p06ha.js:14903-15598 layout
/**
 * 对可视选区应用操作：整行 c 留一个空行进插入；整行 d 删除整行并把光标放到下一行首个非空；其他走 applyOperator。
 */
function applyVisualOperator(op, from, to, ctx, linewise, selectionEndsLine = false) {
  if (linewise && op === "change") {
    let sliced = ctx.text.slice(from, to);
    let registerText = sliced;
    if (
      !registerText.endsWith(`
`)
    )
      registerText += `
`;
    ctx.setRegister(registerText, true);
    let sliced_2 = ctx.text.slice(0, from);
    let sliced_3 = ctx.text.slice(to);
    let needsNewline =
      sliced_3 !== "" ||
      (sliced.endsWith(`
`) &&
        !selectionEndsLine);
    ctx.setText(
      sliced_2 +
        (needsNewline
          ? `
`
          : "") +
        sliced_3,
    );
    ctx.enterInsert(from);
    return;
  }
  if (linewise && op === "delete") {
    let sliced = ctx.text.slice(from, to);
    if (
      !sliced.endsWith(`
`)
    )
      sliced += `
`;
    ctx.setRegister(sliced, true);
    let deleteStart = from;
    if (
      to === ctx.text.length &&
      from > 0 &&
      ctx.text[from - 1] ===
        `
`
    )
      deleteStart -= 1;
    let hasMoreText = to < ctx.text.length;
    let newText = ctx.text.slice(0, deleteStart) + ctx.text.slice(to);
    ctx.setText(newText);
    let searchFrom = hasMoreText ? from : getLineStartAt(newText, newText.length);
    let index = newText.indexOf(
      `
`,
      searchFrom,
    );
    let lineEnd = index === -1 ? newText.length : index;
    let lineCursor = Cursor.fromText(newText.slice(searchFrom, lineEnd), ctx.cursor.measuredText.columns + 1);
    let firstNonBlank = firstNonBlankOffsetSafe(lineCursor, hasMoreText);
    let isPlaceholderOnly = !hasMoreText && lineCursor.placeholderStartingAt(firstNonBlank) !== null;
    ctx.setOffset(
      isPlaceholderOnly ? clampCursorOffset(newText, newText.length) : searchFrom + firstNonBlank,
    );
    return;
  }
  applyOperator(op, from, to, ctx, linewise);
}
//@ chunk-880p06ha.js:15598-15742 layout
function executeVisualOperator(op, anchor, ctx, linewise) {
  let { from, to } = getVisualRange(anchor, ctx, linewise);
  let span = measureSpan(ctx.text.slice(from, to), linewise);
  applyVisualOperator(op, from, to, ctx, linewise, selectionReachesTrailingNewline(anchor, ctx, linewise));
  recordRepeatableChange(ctx, {
    type: "visualOp",
    op,
    span,
    linewise,
  });
}
//@ chunk-880p06ha.js:15742-15843 layout
function repeatVisualOperator(op, span, linewise, ctx) {
  let { from, to } = getRepeatVisualRange(ctx, span, linewise);
  if (from === to && !(linewise && ctx.text.length > 0)) return;
  applyVisualOperator(op, from, to, ctx, linewise);
}
//@ chunk-880p06ha.js:15843-16095 layout
function repeatVisualChange(span, linewise, ctx) {
  let { from, to } = getRepeatVisualRange(ctx, span, linewise);
  if (from === to && !linewise) return;
  let sliced = ctx.text.slice(from, to);
  let registerText = sliced;
  if (
    linewise &&
    !registerText.endsWith(`
`)
  )
    registerText += `
`;
  ctx.setRegister(registerText, linewise);
  let sliced_2 = ctx.text.slice(to);
  let tailText =
    linewise &&
    (sliced_2 !== "" ||
      sliced.endsWith(`
`))
      ? `
` + sliced_2
      : sliced_2;
  ctx.setText(ctx.text.slice(0, from) + tailText);
  ctx.enterInsert(from);
}
//@ chunk-880p06ha.js:16095-16288 layout
function replaceRangeWithChar(char, from, to, ctx) {
  let sliced = ctx.text.slice(from, to);
  let replacement = "";
  for (let { segment } of getGraphemeSegmenter().segment(sliced))
    replacement +=
      segment ===
      `
`
        ? `
`
        : char;
  let newText = ctx.text.slice(0, from) + replacement + ctx.text.slice(to);
  let cursor = ctx.cursor;
  ctx.setText(newText);
  ctx.setOffset(clampOffsetOutsidePlaceholder(cursor, from, newText));
}
//@ chunk-880p06ha.js:16288-16438 layout
function executeVisualReplace(char, anchor, ctx, linewise) {
  let { from, to } = getVisualRange(anchor, ctx, linewise);
  let span = measureSpan(ctx.text.slice(from, to), linewise);
  replaceRangeWithChar(char, from, to, ctx);
  ctx.recordChange({
    type: "visualReplace",
    char,
    span,
    linewise,
  });
}
//@ chunk-880p06ha.js:16438-16514 layout
function repeatVisualReplace(char, span, linewise, ctx) {
  let { from, to } = getRepeatVisualRange(ctx, span, linewise);
  if (from === to) return;
  replaceRangeWithChar(char, from, to, ctx);
}
//@ chunk-880p06ha.js:16514-16823 layout
function changeRangeCase(caseOp, from, to, ctx) {
  let sliced = ctx.text.slice(from, to);
  let replacement = "";
  for (let { segment } of getGraphemeSegmenter().segment(sliced))
    if (caseOp === "upper") replacement += segment.toUpperCase();
    else if (caseOp === "lower") replacement += segment.toLowerCase();
    else replacement += segment === segment.toUpperCase() ? segment.toLowerCase() : segment.toUpperCase();
  let newText = ctx.text.slice(0, from) + replacement + ctx.text.slice(to);
  let cursor = ctx.cursor;
  ctx.setText(newText);
  ctx.setOffset(clampOffsetOutsidePlaceholder(cursor, from, newText));
}
//@ chunk-880p06ha.js:16823-16972 layout
function executeVisualCase(caseOp, anchor, ctx, linewise) {
  let { from, to } = getVisualRange(anchor, ctx, linewise);
  let span = measureSpan(ctx.text.slice(from, to), linewise);
  changeRangeCase(caseOp, from, to, ctx);
  ctx.recordChange({
    type: "visualCase",
    caseOp,
    span,
    linewise,
  });
}
//@ chunk-880p06ha.js:16972-17048 layout
function repeatVisualCase(caseOp, span, linewise, ctx) {
  let { from, to } = getRepeatVisualRange(ctx, span, linewise);
  if (from === to) return;
  changeRangeCase(caseOp, from, to, ctx);
}
//@ chunk-880p06ha.js:17048-17380 layout
function executeVisualPaste(anchor, ctx, linewise) {
  let register = ctx.getRegister();
  if (!register) return;
  let registerLinewise = ctx.getRegisterIsLinewise();
  let { from, to } = getVisualRange(anchor, ctx, linewise);
  let sliced = ctx.text.slice(from, to);
  let span = measureSpan(sliced, linewise);
  replaceRangeWithRegister(
    register,
    registerLinewise,
    from,
    to,
    ctx,
    linewise,
    selectionReachesTrailingNewline(anchor, ctx, linewise),
  );
  ctx.recordChange({
    type: "visualPaste",
    content: register,
    registerLinewise,
    selectionEndsLine: sliced.endsWith(`
`),
    selectionOnOneLine: !sliced.slice(0, -1).includes(`
`),
    span,
    linewise,
  });
}
//@ chunk-880p06ha.js:17380-17534 layout
function repeatVisualPaste(
  content,
  registerLinewise,
  selectionEndsLine,
  selectionOnOneLine,
  span,
  linewise,
  ctx,
) {
  let { from, to } = getRepeatVisualRange(ctx, span, linewise);
  if (from === to && !linewise) return;
  replaceRangeWithRegister(
    content,
    registerLinewise,
    from,
    !linewise && selectionOnOneLine
      ? Math.min(to, ctx.cursor.endOfLogicalLine().offset + (selectionEndsLine ? 1 : 0))
      : to,
    ctx,
    linewise,
    false,
  );
}
//@ chunk-880p06ha.js:17534-18039 layout
/**
 * 可视粘贴：用寄存器内容替换选区，原选区内容进寄存器；处理整行/字符寄存器与整行/字符选区的四种组合。
 */
function replaceRangeWithRegister(content, registerLinewise, from, to, ctx, linewise, selectionEndsLine) {
  let sliced = ctx.text.slice(from, to);
  let insertText = registerLinewise ? content.replace(/\n$/, "") : content;
  let hasTrailingNewline =
    sliced.endsWith(`
`) && !selectionEndsLine;
  let replacement = content;
  let insertOffset = from;
  if (linewise)
    replacement = hasTrailingNewline
      ? insertText +
        `
`
      : insertText;
  else if (registerLinewise) {
    replacement = ctx.text
      ? `
` +
        insertText +
        `
`
      : `
` + insertText;
    insertOffset = from + 1;
  }
  let registerText = sliced;
  if (linewise && !hasTrailingNewline)
    registerText += `
`;
  if (registerText) ctx.setRegister(registerText, linewise);
  let newText = ctx.text.slice(0, from) + replacement + ctx.text.slice(to);
  ctx.setText(newText);
  if (linewise || registerLinewise) {
    let cursor = Cursor.fromText(newText, ctx.cursor.measuredText.columns, insertOffset);
    let firstNonBlank = firstNonBlankOffset_2(cursor);
    ctx.setOffset(cursor.placeholderStartingAt(firstNonBlank) ? insertOffset : firstNonBlank);
  } else if (
    replacement.includes(`
`)
  )
    ctx.setOffset(clampOffsetOutsidePlaceholder(ctx.cursor, from, newText));
  else {
    let lastChar = lastGrapheme(replacement);
    ctx.setOffset(Math.max(from, from + replacement.length - (lastChar.length || 1)));
  }
}
//@ chunk-880p06ha.js:18039-18250 fingerprint (2.1.88 match: executeOperatorG, 0.751)
/**
 * 操作符 + G（如 dG、d3G）：整行操作到最后一行或第 count 行。
 */
function executeOperatorG(op, count, ctx) {
  let target = count === 0 ? ctx.cursor.startOfLastLine() : ctx.cursor.goToLine(count);
  applyLinewiseOperator(
    op,
    getLineIndexAt(ctx.text, ctx.cursor.offset),
    getLineIndexAt(ctx.text, target.offset),
    ctx,
    Math.min(ctx.cursor.offset, firstNonBlankOffset_2(target)),
  );
  recordRepeatableChange(ctx, {
    type: "operator",
    op,
    motion: "G",
    count,
  });
}
//@ chunk-880p06ha.js:18250-18463 fingerprint (2.1.88 match: executeOperatorGg, 0.75)
/**
 * 操作符 + gg（如 dgg）：整行操作到第一行或第 count 行。
 */
function executeOperatorGg(op, count, ctx) {
  let target = count === 1 ? ctx.cursor.startOfFirstLine() : ctx.cursor.goToLine(count);
  applyLinewiseOperator(
    op,
    getLineIndexAt(ctx.text, ctx.cursor.offset),
    getLineIndexAt(ctx.text, target.offset),
    ctx,
    Math.min(ctx.cursor.offset, firstNonBlankOffset_2(target)),
  );
  recordRepeatableChange(ctx, {
    type: "operator",
    op,
    motion: "gg",
    count,
  });
}
//@ chunk-880p06ha.js:18463-19053 affinity (2.1.88 match: applyOperator, 0.754)
/**
 * 按行号范围做整行操作：整行内容写寄存器；yank 只移光标；delete 删行后光标到相应行首个非空；change 留一个空行进入插入模式。
 */
function applyLinewiseOperator(op, fromLine, toLine, ctx, cursorOffset) {
  let lines = ctx.text.split(`
`);
  let min = Math.min(fromLine, toLine);
  let min_2 = Math.min(Math.max(fromLine, toLine) + 1, lines.length);
  let content = lines.slice(0, min);
  let sliced = lines.slice(min_2);
  let lineStartOffset = getLineStartOffset(lines, min);
  let joined = lines
    .slice(min, min_2)
    .map(
      (line) =>
        line +
        `
`,
    )
    .join("");
  ctx.setRegister(joined, true);
  if (op === "yank") {
    let clampedOffset = clampCursorOffset(ctx.text, cursorOffset);
    ctx.setOffset(
      cursorOffset === ctx.text.length
        ? snapOffsetOutOfPlaceholder(ctx.cursor, clampedOffset)
        : ctx.cursor.snapOutOfPlaceholder(clampedOffset, "start"),
    );
  } else if (op === "delete") {
    let remainingLines = [...content, ...sliced];
    ctx.setText(
      remainingLines.join(`
`),
    );
    let maxOff = Math.max(0, Math.min(min, remainingLines.length - 1));
    let lineCursor = Cursor.fromText(remainingLines[maxOff] ?? "", ctx.cursor.measuredText.columns + 1);
    ctx.setOffset(
      getLineStartOffset(remainingLines, maxOff) + firstNonBlankOffsetSafe(lineCursor, sliced.length > 0),
    );
  } else if (op === "change") {
    ctx.setText(
      [...content, "", ...sliced].join(`
`),
    );
    ctx.enterInsert(lineStartOffset);
  }
}
//@ chunk-880p06ha.js:19053-19097 affinity
function getLineIndexAt(text, offset) {
  return countCharInString(
    text.slice(0, offset),
    `
`,
  );
}
//@ chunk-880p06ha.js:19205-19351 placement
function firstNonBlankOffsetSafe(cursor, allowLineStart) {
  let firstNonBlank = firstNonBlankOffset(cursor.text);
  if (cursor.placeholderStartingAt(firstNonBlank) === null) return firstNonBlank;
  if (firstNonBlank > 0 || allowLineStart) return 0;
  let endOffset = clampCursorOffset(cursor.text, cursor.text.length);
  return snapOffsetOutOfPlaceholder(cursor, endOffset);
}
//@ chunk-880p06ha.js:19351-19498 placement
function snapOffsetOutOfPlaceholder(cursor, offset) {
  let startOffset = cursor.snapOutOfPlaceholder(offset, "start");
  if (startOffset === offset) return offset;
  let endOffset = cursor.snapOutOfPlaceholder(offset, "end");
  return isImagePlaceholder(cursor.text.slice(startOffset, endOffset)) ? endOffset : startOffset;
}
//@ chunk-880p06ha.js:19498-19610 placement
function firstNonBlankOffset_2(cursor) {
  let offset = cursor.startOfLogicalLine().offset;
  let offset_2 = cursor.endOfLogicalLine().offset;
  return offset + firstNonBlankOffset(cursor.text.slice(offset, offset_2));
}
//@ chunk-880p06ha.js:19610-19704 placement
function selectionReachesTrailingNewline(anchor, ctx, linewise) {
  return (
    linewise &&
    ctx.text.endsWith(`
`) &&
    Math.max(anchor, ctx.cursor.offset) >= ctx.text.length
  );
}
//@ chunk-880p06ha.js:19704-19716 placement
var VIM_ESCAPE_REMAP_TIMEOUT_MS = 1000;
//@ chunk-880p06ha.js:19716-19944 placement
/**
 * 读取 vimInsertModeRemaps 设置：只接受映射到 <Esc> 的两字符可见序列（如 jk、jj）。
 */
function parseInsertModeEscapeRemaps(remaps) {
  let escapeRemaps = new Map();
  for (let [key, value] of Object.entries(remaps)) {
    if (typeof value !== "string" || value.toLowerCase() !== "<esc>") continue;
    let normalized = key.normalize("NFC");
    if (!/^[^\p{C}\p{Z}]{2}$/u.test(normalized) || countGraphemes(normalized) !== 2) continue;
    escapeRemaps.set(normalized, "<Esc>");
  }
  return escapeRemaps;
}
//@ chunk-880p06ha.js:19944-20003 placement
function getInsertModeEscapeRemaps() {
  return parseInsertModeEscapeRemaps(getSecuritySensitiveSetting("vimInsertModeRemaps")[0] ?? {});
}
export {
  snapToPlaceholderEnd,
  executeX,
  executeSubstitute,
  executeReplace,
  executeToggleCase,
  executeIndent,
  executeJoinIfNotLastLine,
  executeOpenLine,
  executeLineOp,
  executeOperatorGg,
  executeOperatorG,
  executeOperatorMotion,
  executeOperatorFind,
  executeOperatorTextObj,
  repeatVisualOperator,
  repeatVisualReplace,
  repeatVisualCase,
  repeatVisualPaste,
  repeatVisualIndent,
  repeatVisualChange,
  executePaste,
  getInsertModeEscapeRemaps,
  VIM_ESCAPE_REMAP_TIMEOUT_MS,
  executeVisualOperator,
  executeVisualReplace,
  executeVisualCase,
  executeVisualPaste,
  executeVisualJoin,
  executeVisualIndent,
  executeJoinLines,
  clampOffsetOutsidePlaceholder,
  computeScreenLineMove,
  clampCursorOffset,
};
