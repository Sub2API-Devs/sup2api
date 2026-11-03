/**
 * vim/operators.ts
 *
 * 并入旧版已有路径：vim 操作符。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/vim/operators.ts
 * pieces: chunk-530hfzwb.js (58)
 * attribution: fingerprint 16, layout 32, file-local 1, affinity 2, placement 7
 */
import { resolveMotion, CHAR_MOTIONS } from "./types.js";
import { isLinewiseMotion, isInclusiveMotion } from "./motions.js";
import {
  truncateStartToWidth,
  getCursorDisplayColumn,
  Cursor,
  wrapText,
  isWhitespaceChar,
} from "../utils/Cursor.js";
import { findTextObject } from "./textObjects.js";
import { isImagePlaceholder } from "../commands.js";
import { firstGrapheme, lastGrapheme, getGraphemeSegmenter } from "../utils/intl.js";
import { countCharInString } from "../utils/stringUtils.js";
import { countGraphemes } from "../ink/output.js";
import { getSecuritySensitiveSetting } from "../utils/settings/settings.js";

//@ chunk-530hfzwb.js:4643-5841 fingerprint = executeLineOp (0.678)
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
      let p = index === -1 ? ctx.text.length : index;
      let h = truncateStartToWidth(
        ctx.text,
        lineStartAt,
        p,
        getCursorDisplayColumn(ctx.cursor, ctx.wantedColumn),
      );
      let x =
        h === p && p > lineStartAt && clampOffsetOutsidePlaceholder(ctx.cursor, p) === p
          ? ctx.cursor.measuredText.prevOffset(p)
          : h;
      let b =
        motion === "k"
          ? snapToPlaceholderEnd(ctx.cursor, x, lineStartAt)
          : Math.min(ctx.cursor.offset, target.offset);
      applyLinewiseOperator(op, lineIndexAt, lineIndexAt_2, ctx, b);
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
    let i = (motion === "w" || motion === "W") && count > 0;
    if (motion === "0" || motion === "^" || i || CHAR_MOTIONS.has(motion)) {
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
//@ chunk-530hfzwb.js:5841-6069 fingerprint = executeOperatorFind (0.948)
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
//@ chunk-530hfzwb.js:6069-6362 fingerprint = executeOperatorTextObj (0.718)
/**
 * 操作符 + 文本对象（如 diw、ca"、yi(）：用 findTextObject 求范围后应用；yi( 这类内容从换行开始时光标落到下一行。
 */
function executeOperatorTextObj(op, scope, objType, count, ctx) {
  let range = findTextObject(ctx.text, ctx.cursor.offset, objType, scope === "inner");
  if (!range) return;
  applyOperator(op, range.start, range.end, ctx);
  let { start } = range;
  let u =
    scope === "inner" &&
    count === 1 &&
    start > 0 &&
    "([{<".includes(ctx.text[start - 1] ?? " ") &&
    ctx.text[start] ===
      `
`;
  if (op === "yank" && u) ctx.setOffset(start + 1);
  recordRepeatableChange(ctx, {
    type: "operatorTextObj",
    op,
    objType,
    scope,
    count,
  });
}
//@ chunk-530hfzwb.js:6362-6714 fingerprint = executeOperatorMotion (0.593)
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
  let o =
    ctx.text[offset] ===
    `
`
      ? ctx.cursor.placeholderEndingAt(offset)
      : null;
  let i = o !== null && isImagePlaceholder(ctx.text.slice(o.start, o.end));
  applyLinewiseOperator(
    op,
    lineIndexAt,
    lineIndexAt + count - 1,
    ctx,
    i ? ctx.cursor.startOfLogicalLine().offset : offset,
  );
  recordRepeatableChange(ctx, {
    type: "operator",
    op,
    motion: op[0],
    count,
  });
}
//@ chunk-530hfzwb.js:6714-6960 fingerprint = executeX (0.853)
/**
 * x：删除光标处 count 个字符（不跨行），存入寄存器。
 */
function executeX(count, ctx) {
  let from = ctx.cursor.offset;
  if (from >= ctx.text.length) return;
  let n = advanceCharsInLine(ctx, count);
  if (n === from) return;
  let deleted = ctx.text.slice(from, n);
  let newText = ctx.text.slice(0, from) + ctx.text.slice(n);
  ctx.setRegister(deleted, false);
  ctx.setText(newText);
  ctx.setOffset(clampCursorOffset(newText, from));
  ctx.recordChange({
    type: "x",
    count,
  });
}
//@ chunk-530hfzwb.js:6960-7158 layout
/**
 * s：删除 count 个字符并进入插入模式。
 */
function executeSubstitute(count, ctx) {
  let offset = ctx.cursor.offset;
  let n = advanceCharsInLine(ctx, count);
  if (n > offset) {
    ctx.setRegister(ctx.text.slice(offset, n), false);
    ctx.setText(ctx.text.slice(0, offset) + ctx.text.slice(n));
  }
  ctx.enterInsert(offset);
  ctx.recordChange({
    type: "substitute",
    count,
  });
}
//@ chunk-530hfzwb.js:7158-7421 fingerprint = executeReplace (0.952)
/**
 * r{char}：把光标起 count 个字素替换为该字符（遇到行尾则不执行）。
 */
function executeReplace(char, count, ctx) {
  let offset = ctx.cursor.offset;
  let newText = ctx.text;
  let o = offset;
  for (let i = 0; i < count; i++) {
    if (
      o >= newText.length ||
      newText[o] ===
        `
`
    )
      return;
    o += firstGrapheme(newText.slice(o)).length || 1;
  }
  ctx.setText(newText.slice(0, offset) + char.repeat(count) + newText.slice(o));
  ctx.setOffset(offset + char.length * (count - 1));
  ctx.recordChange({
    type: "replace",
    char,
    count,
  });
}
//@ chunk-530hfzwb.js:7421-7809 fingerprint = executeToggleCase (0.769)
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
  let i = Cursor.fromText(newText, columns);
  ctx.setText(newText);
  ctx.setOffset(clampOffsetOutsidePlaceholder(i, offset));
  ctx.recordChange({
    type: "toggleCase",
    count,
  });
}
//@ chunk-530hfzwb.js:7809-8060 layout
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
//@ chunk-530hfzwb.js:8060-8398 fingerprint = executeJoin (0.763)
/**
 * 合并行：去掉后续行行首空白，必要时补一个空格（下一行以 ) 开头或上一段以空白结尾时不补），光标停在最后一个连接点。
 */
function executeJoin(lines, lineIndex, joinCount, ctx) {
  let joinedLine = lines[lineIndex];
  let cursorPos = joinedLine.length;
  let i = joinedLine;
  for (let i_2 = 1; i_2 <= joinCount; i_2++) {
    cursorPos = joinedLine.length;
    let nextLine = lines[lineIndex + i_2].replace(/^[ \t\r]+/, "");
    if (nextLine.length > 0 && joinedLine.length > 0 && !nextLine.startsWith(")") && !/[ \t]$/.test(i))
      joinedLine += " ";
    joinedLine += nextLine;
    i = nextLine;
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
//@ chunk-530hfzwb.js:8398-9239 fingerprint = executePaste (0.554)
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
    let I = Cursor.fromText(contentLines[0] ?? "", ctx.cursor.measuredText.columns);
    let F = firstNonBlankOffset(I);
    ctx.setText(newText, {
      previous: {
        value: text,
        cursorOffset: lineStartOffset,
      },
    });
    ctx.setOffset(lineStartOffset + (I.placeholderStartingAt(F) ? 0 : F));
  } else {
    let textToInsert = content.repeat(count);
    let offset = ctx.cursor.offset;
    let f =
      ctx.text[offset] ===
        `
` &&
      (offset === 0 ||
        ctx.text[offset - 1] ===
          `
`);
    let d = after && offset < ctx.text.length && !f ? ctx.cursor.measuredText.nextOffset(offset) : offset;
    let newText = ctx.text.slice(0, d) + textToInsert + ctx.text.slice(d);
    let lastGr = textToInsert.includes(`
`)
      ? clampCursorOffset(newText, d)
      : d + textToInsert.length - (lastGrapheme(textToInsert).length || 1);
    ctx.setText(newText, {
      previous: {
        value: ctx.text,
        cursorOffset: d,
      },
    });
    ctx.setOffset(lastGr);
  }
}
//@ chunk-530hfzwb.js:9239-9506 fingerprint = executeIndent (0.834)
/**
 * >> / <<：给当前行起 count 行加/减两个空格缩进（减时也去掉一个 tab 或最多两个空白）。
 */
function executeIndent(dir, count, ctx) {
  let lines = ctx.text.split(`
`);
  let lineIndexAt = getLineIndexAt(ctx.cursor.text, ctx.cursor.offset);
  if (count > 1 && lineIndexAt === lines.length - 1) return;
  let linesToAffect = Math.min(count, lines.length - lineIndexAt);
  indentLines(lines, lineIndexAt, lineIndexAt + linesToAffect - 1, dir);
  let newText = lines.join(`
`);
  let f = wrapText(lines[lineIndexAt] ?? "");
  ctx.setText(newText);
  ctx.setOffset(getLineStartOffset(lines, lineIndexAt) + f);
  ctx.recordChange({
    type: "indent",
    dir,
    count,
  });
}
//@ chunk-530hfzwb.js:9506-9778 fingerprint = executeOpenLine (0.808)
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
//@ chunk-530hfzwb.js:9778-9829 layout
function recordRepeatableChange(ctx, t) {
  if (t.op !== "yank") ctx.recordChange(t);
}
//@ chunk-530hfzwb.js:9829-9956 layout
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
//@ chunk-530hfzwb.js:9956-10019 file-local
function getLineStartOffset(lines, lineIndex) {
  return (
    lines.slice(0, lineIndex).join(`
`).length + (lineIndex > 0 ? 1 : 0)
  );
}
//@ chunk-530hfzwb.js:10019-11262 fingerprint = getOperatorRange (0.852)
/**
 * 操作符 + 移动的范围计算（vim 兼容细节）：cw 当作 ce；dw/yw 不越过行尾；包含式移动（e E $ %）把终点含进去；跨行删除且前面只有空白时整行化。最后把起止点推出占位符（图片/粘贴占位）之外。
 */
function getOperatorRange(cursor, target, motion, op, count) {
  let from = Math.min(cursor.offset, target.offset);
  let to = Math.max(cursor.offset, target.offset);
  let u = false;
  let f = motion === "w" || motion === "W";
  let d = f && op === "change";
  let p = f && op !== "change";
  let h = cursor.text[cursor.offset];
  let x =
    (h === " " ||
      h === "\t" ||
      h ===
        `
`) &&
    cursor.snapOutOfPlaceholder(cursor.offset, "start") === cursor.offset;
  if (d && x) {
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
        u = true;
      }
    }
  } else if (d) {
    let wordCursor = cursor;
    for (let i = 0; i < count - 1; i++)
      do wordCursor = motion === "w" ? wordCursor.nextVimWord() : wordCursor.nextWORD();
      while (cursor.isOnEmptyLine(wordCursor.offset));
    let F = motion === "w" ? wordCursor.endOfVimWord() : wordCursor.endOfWORD();
    let D = cursor.measuredText.nextOffset(wordCursor.offset);
    let K = motion === "w" ? wordCursor.nextVimWord() : wordCursor.nextWORD();
    if (
      (D >= cursor.text.length || isWhitespaceChar(cursor.text[D] ?? "") || K.offset === D) &&
      !isWhitespaceChar(cursor.text[cursor.offset] ?? "") &&
      !isWhitespaceChar(cursor.text[wordCursor.offset] ?? "")
    )
      F = wordCursor;
    to = cursor.measuredText.nextOffset(F.offset);
  } else if (
    isInclusiveMotion(motion) &&
    (motion === "%" || cursor.offset <= target.offset) &&
    cursor.text[to] !==
      `
`
  )
    to = cursor.measuredText.nextOffset(to);
  else if (p) to = clampWordMotionToLineEnd(cursor, motion, count, to);
  let lineStartAt = getLineStartAt(cursor.text, from);
  let matches = /^[ \t]*$/.test(cursor.text.slice(lineStartAt, from));
  if (
    (motion === " " || p) &&
    to > from &&
    cursor.text[to - 1] ===
      `
`
  ) {
    u = matches;
    from = u ? lineStartAt : from;
    to = u && op !== "change" ? to : to - 1;
  } else if (
    p &&
    op === "delete" &&
    matches &&
    cursor.text.slice(from, to).includes(`
`) &&
    /^[ \t]*(\n|$)/.test(cursor.text.slice(to))
  ) {
    from = lineStartAt;
    u = true;
  }
  from = cursor.snapOutOfPlaceholder(from, "start");
  to = cursor.snapOutOfPlaceholder(to, "end");
  return {
    from,
    to,
    linewise: u,
  };
}
//@ chunk-530hfzwb.js:11262-11371 layout
function clampWordMotionToLineEnd(cursor, motion, count, n) {
  let motion_2 = resolveMotion(motion, cursor, count - 1);
  let offset = motion_2.endOfLogicalLine().offset;
  if (n <= offset) return n;
  return offset > motion_2.offset ? offset : offset + 1;
}
//@ chunk-530hfzwb.js:11371-11567 layout
function getFindRange(cursor, target, _findType) {
  let max = Math.max(cursor.offset, target.offset);
  let from = cursor.snapOutOfPlaceholder(Math.min(cursor.offset, target.offset), "start");
  let to = cursor.snapOutOfPlaceholder(cursor.measuredText.nextOffset(max), "end");
  return {
    from,
    to,
  };
}
//@ chunk-530hfzwb.js:11567-11918 fingerprint = applyOperator (0.962)
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
//@ chunk-530hfzwb.js:11918-12095 layout
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
//@ chunk-530hfzwb.js:12095-12258 layout
function snapToPlaceholderEnd(cursor, t, r) {
  let n = placeholderAt(cursor, t);
  let s = t;
  while (n && n.start > r) {
    s = cursor.measuredText.prevOffset(n.start);
    n = placeholderAt(cursor, s);
  }
  if (!n) return s;
  let end = n.end;
  while ((n = placeholderAt(cursor, end))) end = n.end;
  return end;
}
//@ chunk-530hfzwb.js:12258-12349 layout
function placeholderAt(e, t) {
  let r = e.snapOutOfPlaceholder(t, "start");
  return e.placeholderStartingAt(r);
}
//@ chunk-530hfzwb.js:12349-12439 layout
function clampOffsetOutsidePlaceholder(cursor, offset, r = cursor.text) {
  let n = clampCursorOffset(r, offset);
  return cursor.snapOutOfPlaceholder(n, "start") === n ? n : offset;
}
//@ chunk-530hfzwb.js:12439-12999 layout
/**
 * gj/gk 的屏幕行移动：按折行后的行计算目标位置并保持目标列（wantedColumn）；返回 {offset, column, rowsRunOut}。
 */
function computeScreenLineMove(motion, count, ctx) {
  let { cursor } = ctx;
  let motion_2 = resolveMotion(motion, cursor, count);
  let wrappedLines = cursor.measuredText.getWrappedLines();
  let line = cursor.getPosition().line;
  let rowsRunOut = (motion === "gj" ? wrappedLines.length - 1 - line : line) < count;
  let d = wrappedLines[line];
  let p = wrappedLines[motion_2.getPosition().line];
  let h = d?.startOffset === 0 || d?.isPrecededByNewline;
  let x = p?.startOffset === 0 || p?.isPrecededByNewline;
  if (motion_2.equals(cursor) || !h || !x || !p)
    return {
      offset: motion_2.offset,
      column: null,
      rowsRunOut,
    };
  let cursorDisplayColumn = getCursorDisplayColumn(cursor, ctx.wantedColumn);
  let O = p.startOffset + p.text.length;
  let I = truncateStartToWidth(cursor.text, p.startOffset, O, cursorDisplayColumn);
  let F = snapToPlaceholderEnd(cursor, I, p.startOffset);
  let D = !p.endsWithNewline && O < cursor.text.length;
  return {
    offset: F === O && D ? cursor.measuredText.prevOffset(O) : F,
    column: cursorDisplayColumn,
    rowsRunOut,
  };
}
//@ chunk-530hfzwb.js:12999-13083 layout
function getLineStartAt(text, offset) {
  if (offset === 0) return 0;
  let index = text.lastIndexOf(
    `
`,
    offset - 1,
  );
  return index === -1 ? 0 : index + 1;
}
//@ chunk-530hfzwb.js:13083-13165 layout
/**
 * 可视模式记录跨度：整行时为行数，否则为字素数（供 . 重复同样大小的可视操作）。
 */
function measureSpan(e, t) {
  if (t) {
    let r = countCharInString(
      e,
      `
`,
    );
    return e.endsWith(`
`)
      ? r
      : r + 1;
  }
  return countGraphemes(e);
}
//@ chunk-530hfzwb.js:13165-13449 fingerprint = getOperatorRangeForFind (0.907)
/**
 * 用记录的跨度从当前光标重建可视范围（. 重复可视操作时用）。
 */
function getRepeatVisualRange(cursor, target, _findType) {
  let text = cursor.text;
  if (_findType) {
    let lineStartAt = getLineStartAt(text, cursor.cursor.offset);
    let u = lineStartAt;
    for (let k = 0; k < target; k++) {
      let index = text.indexOf(
        `
`,
        u,
      );
      if (index === -1) {
        u = text.length;
        break;
      }
      u = index + 1;
    }
    return {
      from: lineStartAt,
      to: u,
    };
  }
  let offset = cursor.cursor.offset;
  let o = offset;
  for (let i = 0; i < target && o < text.length; i++) o = cursor.cursor.measuredText.nextOffset(o);
  return {
    from: offset,
    to: o,
  };
}
//@ chunk-530hfzwb.js:13449-13676 layout = getOperatorRangeForFind (0.907)
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
//@ chunk-530hfzwb.js:13676-13936 layout
function indentLines(lines, t, r, n) {
  for (let o = t; o <= r; o++) {
    let i = lines[o] ?? "";
    if (i === "") continue;
    if (n === ">") lines[o] = "  " + i;
    else if (i.startsWith("  ")) lines[o] = i.slice(2);
    else if (i.startsWith("\t")) lines[o] = i.slice(1);
    else {
      let u = 0;
      while (u < i.length && u < 2 && /\s/.test(i[u])) u++;
      lines[o] = i.slice(u);
    }
  }
}
//@ chunk-530hfzwb.js:13936-14267 layout
function executeVisualJoin(anchor, ctx, r) {
  let min = Math.min(anchor, ctx.cursor.offset);
  let max = Math.max(anchor, ctx.cursor.offset);
  let text = ctx.text;
  let lineIndex = countCharInString(
    text.slice(0, min),
    `
`,
  );
  let u =
    countCharInString(
      text.slice(min, max),
      `
`,
    ) + 1;
  let lines = text.split(`
`);
  if (lineIndex >= lines.length - 1) {
    ctx.setOffset(r ? getLineStartAt(ctx.cursor.text, min) : clampCursorOffset(ctx.cursor.text, min));
    ctx.recordChange({
      type: "join",
      count: 2,
    });
    return;
  }
  let max_2 = Math.max(1, Math.min(u - 1, lines.length - lineIndex - 1));
  executeJoin(lines, lineIndex, max_2, ctx);
}
//@ chunk-530hfzwb.js:14267-14363 layout
function executeJoinIfNotLastLine(count, ctx) {
  let lines = ctx.text.split(`
`);
  if (getLineIndexAt(ctx.cursor.text, ctx.cursor.offset) < lines.length - 1) executeJoinLines(count, ctx);
}
//@ chunk-530hfzwb.js:14363-14684 layout
function executeVisualIndent(dir, count, anchor, n) {
  let min = Math.min(anchor, n.cursor.offset);
  let max = Math.max(anchor, n.cursor.offset);
  let text = n.text;
  let u = countCharInString(
    text.slice(0, min),
    `
`,
  );
  let f =
    u +
    countCharInString(
      text.slice(min, max),
      `
`,
    );
  let lines = text.split(`
`);
  for (let k = 0; k < count; k++) indentLines(lines, u, f, dir);
  let joined = lines.join(`
`);
  let h = wrapText(lines[u] ?? "");
  n.setText(joined);
  n.setOffset(getLineStartOffset(lines, u) + h);
  n.recordChange({
    type: "visualIndent",
    dir,
    count,
    lines: f - u + 1,
  });
}
//@ chunk-530hfzwb.js:14684-14899 layout
function repeatVisualIndent(dir, count, lines, n) {
  let text = n.text;
  let lines_2 = text.split(`
`);
  let i = countCharInString(
    text.slice(0, n.cursor.offset),
    `
`,
  );
  let min = Math.min(i + lines - 1, lines_2.length - 1);
  for (let k = 0; k < count; k++) indentLines(lines_2, i, min, dir);
  let joined = lines_2.join(`
`);
  let d = wrapText(lines_2[i] ?? "");
  n.setText(joined);
  n.setOffset(getLineStartOffset(lines_2, i) + d);
}
//@ chunk-530hfzwb.js:14899-15594 layout
/**
 * 对可视选区应用操作：整行 c 留一个空行进插入；整行 d 删除整行并把光标放到下一行首个非空；其他走 applyOperator。
 */
function applyVisualOperator(e, from, r, n, s, o = false) {
  if (s && e === "change") {
    let sliced = n.text.slice(from, r);
    let u = sliced;
    if (
      !u.endsWith(`
`)
    )
      u += `
`;
    n.setRegister(u, true);
    let sliced_2 = n.text.slice(0, from);
    let sliced_3 = n.text.slice(r);
    let p =
      sliced_3 !== "" ||
      (sliced.endsWith(`
`) &&
        !o);
    n.setText(
      sliced_2 +
        (p
          ? `
`
          : "") +
        sliced_3,
    );
    n.enterInsert(from);
    return;
  }
  if (s && e === "delete") {
    let sliced = n.text.slice(from, r);
    if (
      !sliced.endsWith(`
`)
    )
      sliced += `
`;
    n.setRegister(sliced, true);
    let u = from;
    if (
      r === n.text.length &&
      from > 0 &&
      n.text[from - 1] ===
        `
`
    )
      u -= 1;
    let f = r < n.text.length;
    let d = n.text.slice(0, u) + n.text.slice(r);
    n.setText(d);
    let p = f ? from : getLineStartAt(d, d.length);
    let index = d.indexOf(
      `
`,
      p,
    );
    let x = index === -1 ? d.length : index;
    let b = Cursor.fromText(d.slice(p, x), n.cursor.measuredText.columns + 1);
    let O = firstNonBlankOffsetSafe(b, f);
    let I = !f && b.placeholderStartingAt(O) !== null;
    n.setOffset(I ? clampCursorOffset(d, d.length) : p + O);
    return;
  }
  applyOperator(e, from, r, n, s);
}
//@ chunk-530hfzwb.js:15594-15738 layout
function executeVisualOperator(e, anchor, r, n) {
  let { from, to } = getVisualRange(anchor, r, n);
  let span = measureSpan(r.text.slice(from, to), n);
  applyVisualOperator(e, from, to, r, n, selectionReachesTrailingNewline(anchor, r, n));
  recordRepeatableChange(r, {
    type: "visualOp",
    op: e,
    span,
    linewise: n,
  });
}
//@ chunk-530hfzwb.js:15738-15839 layout
function repeatVisualOperator(e, span, linewise, n) {
  let { from, to } = getRepeatVisualRange(n, span, linewise);
  if (from === to && !(linewise && n.text.length > 0)) return;
  applyVisualOperator(e, from, to, n, linewise);
}
//@ chunk-530hfzwb.js:15839-16091 layout
function repeatVisualChange(span, linewise, r) {
  let { from, to } = getRepeatVisualRange(r, span, linewise);
  if (from === to && !linewise) return;
  let sliced = r.text.slice(from, to);
  let i = sliced;
  if (
    linewise &&
    !i.endsWith(`
`)
  )
    i += `
`;
  r.setRegister(i, linewise);
  let sliced_2 = r.text.slice(to);
  let f =
    linewise &&
    (sliced_2 !== "" ||
      sliced.endsWith(`
`))
      ? `
` + sliced_2
      : sliced_2;
  r.setText(r.text.slice(0, from) + f);
  r.enterInsert(from);
}
//@ chunk-530hfzwb.js:16091-16284 layout
function replaceRangeWithChar(e, from, r, n) {
  let sliced = n.text.slice(from, r);
  let o = "";
  for (let { segment } of getGraphemeSegmenter().segment(sliced))
    o +=
      segment ===
      `
`
        ? `
`
        : e;
  let i = n.text.slice(0, from) + o + n.text.slice(r);
  let cursor = n.cursor;
  n.setText(i);
  n.setOffset(clampOffsetOutsidePlaceholder(cursor, from, i));
}
//@ chunk-530hfzwb.js:16284-16434 layout
function executeVisualReplace(char, anchor, r, n) {
  let { from, to } = getVisualRange(anchor, r, n);
  let span = measureSpan(r.text.slice(from, to), n);
  replaceRangeWithChar(char, from, to, r);
  r.recordChange({
    type: "visualReplace",
    char,
    span,
    linewise: n,
  });
}
//@ chunk-530hfzwb.js:16434-16510 layout
function repeatVisualReplace(char, span, linewise, n) {
  let { from, to } = getRepeatVisualRange(n, span, linewise);
  if (from === to) return;
  replaceRangeWithChar(char, from, to, n);
}
//@ chunk-530hfzwb.js:16510-16819 layout
function changeRangeCase(e, from, r, n) {
  let sliced = n.text.slice(from, r);
  let o = "";
  for (let { segment } of getGraphemeSegmenter().segment(sliced))
    if (e === "upper") o += segment.toUpperCase();
    else if (e === "lower") o += segment.toLowerCase();
    else o += segment === segment.toUpperCase() ? segment.toLowerCase() : segment.toUpperCase();
  let i = n.text.slice(0, from) + o + n.text.slice(r);
  let cursor = n.cursor;
  n.setText(i);
  n.setOffset(clampOffsetOutsidePlaceholder(cursor, from, i));
}
//@ chunk-530hfzwb.js:16819-16968 layout
function executeVisualCase(e, anchor, r, n) {
  let { from, to } = getVisualRange(anchor, r, n);
  let span = measureSpan(r.text.slice(from, to), n);
  changeRangeCase(e, from, to, r);
  r.recordChange({
    type: "visualCase",
    caseOp: e,
    span,
    linewise: n,
  });
}
//@ chunk-530hfzwb.js:16968-17044 layout
function repeatVisualCase(caseOp, span, linewise, n) {
  let { from, to } = getRepeatVisualRange(n, span, linewise);
  if (from === to) return;
  changeRangeCase(caseOp, from, to, n);
}
//@ chunk-530hfzwb.js:17044-17376 layout
function executeVisualPaste(anchor, t, r) {
  let n = t.getRegister();
  if (!n) return;
  let s = t.getRegisterIsLinewise();
  let { from, to } = getVisualRange(anchor, t, r);
  let sliced = t.text.slice(from, to);
  let span = measureSpan(sliced, r);
  replaceRangeWithRegister(n, s, from, to, t, r, selectionReachesTrailingNewline(anchor, t, r));
  t.recordChange({
    type: "visualPaste",
    content: n,
    registerLinewise: s,
    selectionEndsLine: sliced.endsWith(`
`),
    selectionOnOneLine: !sliced.slice(0, -1).includes(`
`),
    span,
    linewise: r,
  });
}
//@ chunk-530hfzwb.js:17376-17530 layout
function repeatVisualPaste(
  content,
  registerLinewise,
  selectionEndsLine,
  selectionOnOneLine,
  span,
  linewise,
  i,
) {
  let { from, to } = getRepeatVisualRange(i, span, linewise);
  if (from === to && !linewise) return;
  replaceRangeWithRegister(
    content,
    registerLinewise,
    from,
    !linewise && selectionOnOneLine
      ? Math.min(to, i.cursor.endOfLogicalLine().offset + (selectionEndsLine ? 1 : 0))
      : to,
    i,
    linewise,
    false,
  );
}
//@ chunk-530hfzwb.js:17530-18034 layout
/**
 * 可视粘贴：用寄存器内容替换选区，原选区内容进寄存器；处理整行/字符寄存器与整行/字符选区的四种组合。
 */
function replaceRangeWithRegister(e, t, from, n, s, o, i) {
  let sliced = s.text.slice(from, n);
  let f = t ? e.replace(/\n$/, "") : e;
  let d =
    sliced.endsWith(`
`) && !i;
  let p = e;
  let h = from;
  if (o)
    p = d
      ? f +
        `
`
      : f;
  else if (t) {
    p = s.text
      ? `
` +
        f +
        `
`
      : `
` + f;
    h = from + 1;
  }
  let x = sliced;
  if (o && !d)
    x += `
`;
  if (x) s.setRegister(x, o);
  let b = s.text.slice(0, from) + p + s.text.slice(n);
  s.setText(b);
  if (o || t) {
    let O = Cursor.fromText(b, s.cursor.measuredText.columns, h);
    let I = firstNonBlankOffset(O);
    s.setOffset(O.placeholderStartingAt(I) ? h : I);
  } else if (
    p.includes(`
`)
  )
    s.setOffset(clampOffsetOutsidePlaceholder(s.cursor, from, b));
  else {
    let O = lastGrapheme(p);
    s.setOffset(Math.max(from, from + p.length - (O.length || 1)));
  }
}
//@ chunk-530hfzwb.js:18034-18245 fingerprint = executeOperatorG (0.768)
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
    Math.min(ctx.cursor.offset, firstNonBlankOffset(target)),
  );
  recordRepeatableChange(ctx, {
    type: "operator",
    op,
    motion: "G",
    count,
  });
}
//@ chunk-530hfzwb.js:18245-18458 fingerprint = executeOperatorGg (0.767)
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
    Math.min(ctx.cursor.offset, firstNonBlankOffset(target)),
  );
  recordRepeatableChange(ctx, {
    type: "operator",
    op,
    motion: "gg",
    count,
  });
}
//@ chunk-530hfzwb.js:18458-19048 affinity = applyOperator (0.753)
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
    let x = clampCursorOffset(ctx.text, cursorOffset);
    ctx.setOffset(
      cursorOffset === ctx.text.length
        ? snapOffsetOutOfPlaceholder(ctx.cursor, x)
        : ctx.cursor.snapOutOfPlaceholder(x, "start"),
    );
  } else if (op === "delete") {
    let x = [...content, ...sliced];
    ctx.setText(
      x.join(`
`),
    );
    let maxOff = Math.max(0, Math.min(min, x.length - 1));
    let O = Cursor.fromText(x[maxOff] ?? "", ctx.cursor.measuredText.columns + 1);
    ctx.setOffset(getLineStartOffset(x, maxOff) + firstNonBlankOffsetSafe(O, sliced.length > 0));
  } else if (op === "change") {
    ctx.setText(
      [...content, "", ...sliced].join(`
`),
    );
    ctx.enterInsert(lineStartOffset);
  }
}
//@ chunk-530hfzwb.js:19048-19092 affinity
function getLineIndexAt(text, offset) {
  return countCharInString(
    text.slice(0, offset),
    `
`,
  );
}
//@ chunk-530hfzwb.js:19200-19346 placement
function firstNonBlankOffsetSafe(e, t) {
  let r = wrapText(e.text);
  if (e.placeholderStartingAt(r) === null) return r;
  if (r > 0 || t) return 0;
  let n = clampCursorOffset(e.text, e.text.length);
  return snapOffsetOutOfPlaceholder(e, n);
}
//@ chunk-530hfzwb.js:19346-19493 placement
function snapOffsetOutOfPlaceholder(e, t) {
  let r = e.snapOutOfPlaceholder(t, "start");
  if (r === t) return t;
  let n = e.snapOutOfPlaceholder(t, "end");
  return isImagePlaceholder(e.text.slice(r, n)) ? n : r;
}
//@ chunk-530hfzwb.js:19493-19605 placement
function firstNonBlankOffset(target) {
  let offset = target.startOfLogicalLine().offset;
  let offset_2 = target.endOfLogicalLine().offset;
  return offset + wrapText(target.text.slice(offset, offset_2));
}
//@ chunk-530hfzwb.js:19605-19699 placement
function selectionReachesTrailingNewline(e, t, r) {
  return (
    r &&
    t.text.endsWith(`
`) &&
    Math.max(e, t.cursor.offset) >= t.text.length
  );
}
//@ chunk-530hfzwb.js:19699-19711 placement
var VIM_ESCAPE_REMAP_TIMEOUT_MS = 1000;
//@ chunk-530hfzwb.js:19711-19939 placement
/**
 * 读取 vimInsertModeRemaps 设置：只接受映射到 <Esc> 的两字符可见序列（如 jk、jj）。
 */
function parseInsertModeEscapeRemaps(e) {
  let t = new Map();
  for (let [key, value] of Object.entries(e)) {
    if (typeof value !== "string" || value.toLowerCase() !== "<esc>") continue;
    let normalized = key.normalize("NFC");
    if (!/^[^\p{C}\p{Z}]{2}$/u.test(normalized) || countGraphemes(normalized) !== 2) continue;
    t.set(normalized, "<Esc>");
  }
  return t;
}
//@ chunk-530hfzwb.js:19939-19998 placement
function getInsertModeEscapeRemaps() {
  return parseInsertModeEscapeRemaps(getSecuritySensitiveSetting("vimInsertModeRemaps")[0] ?? {});
}
export {
  getInsertModeEscapeRemaps,
  clampCursorOffset,
  clampOffsetOutsidePlaceholder,
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
  VIM_ESCAPE_REMAP_TIMEOUT_MS,
  executeVisualOperator,
  executeVisualReplace,
  executeVisualCase,
  executeVisualPaste,
  executeVisualJoin,
  executeVisualIndent,
  executeJoinLines,
  computeScreenLineMove,
};
