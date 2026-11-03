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
import { truncateStartToWidth, getCursorDisplayColumn, Cursor, wrapText, zWe } from "../utils/Cursor.js";
import { findTextObject } from "./textObjects.js";
import { isImagePlaceholder } from "../commands.js";
import { firstGrapheme, lastGrapheme, getGraphemeSegmenter } from "../utils/intl.js";
import { countCharInString } from "../utils/stringUtils.js";
import { countGraphemes } from "../ink/output.js";
import { getSecuritySensitiveSetting } from "../utils/settings/settings.js";

/**
 * 操作符 + 移动（如 dw、c$、yj、dgj）：整行移动（j k G gg）按行处理；移动没动且不是包含式移动时只做空操作的副作用（c 进插入、y 清寄存器）；否则用 getOperatorRange 算范围（cw 特例、w 跨行截断、整行化判断）后应用操作并记录可重复的修改。
 */
//@ chunk-530hfzwb.js:4643-5841 fingerprint = executeLineOp (0.678)
function executeOperatorMotion(op, motion, count, ctx) {
  if (motion === "gj" || motion === "gk") {
    let i = computeScreenLineMove(motion, count, ctx);
    if (i.rowsRunOut) {
      ctx.setOffset(clampOffsetOutsidePlaceholder(ctx.cursor, i.offset));
      return;
    }
  }
  let s = resolveMotion(motion, ctx.cursor, count);
  if (isLinewiseMotion(motion)) {
    let i = getLineIndexAt(ctx.text, ctx.cursor.offset),
      u = getLineIndexAt(ctx.text, s.offset);
    if (u !== i) {
      let f = getLineStartAt(ctx.text, s.offset),
        index = ctx.text.indexOf(
          `
`,
          f,
        ),
        p = index === -1 ? ctx.text.length : index,
        h = truncateStartToWidth(ctx.text, f, p, getCursorDisplayColumn(ctx.cursor, ctx.wantedColumn)),
        x =
          h === p && p > f && clampOffsetOutsidePlaceholder(ctx.cursor, p) === p
            ? ctx.cursor.measuredText.prevOffset(p)
            : h,
        b = motion === "k" ? snapToPlaceholderEnd(ctx.cursor, x, f) : Math.min(ctx.cursor.offset, s.offset);
      (applyLinewiseOperator(op, i, u, ctx, b),
        recordRepeatableChange(ctx, { type: "operator", op: op, motion: motion, count: count }));
    }
    return;
  }
  if (motion === "%" && s.equals(ctx.cursor)) return;
  if (s.equals(ctx.cursor) && !isInclusiveMotion(motion)) {
    let i = (motion === "w" || motion === "W") && count > 0;
    if (motion === "0" || motion === "^" || i || CHAR_MOTIONS.has(motion)) {
      if (op === "yank") ctx.setRegister("", !1);
      else if (op === "change") ctx.enterInsert(ctx.cursor.offset);
      recordRepeatableChange(ctx, { type: "operator", op: op, motion: motion, count: count });
    }
    return;
  }
  let o = getOperatorRange(ctx.cursor, s, motion, op, count);
  if (o.from === o.to && !(o.linewise && motion === " ")) {
    if (op === "change" || op === "yank") ctx.setRegister("", !1);
    if (op === "change")
      (ctx.enterInsert(o.from),
        recordRepeatableChange(ctx, { type: "operator", op: op, motion: motion, count: count }));
    return;
  }
  if (o.linewise && op !== "change")
    applyLinewiseOperator(
      op,
      getLineIndexAt(ctx.text, o.from),
      getLineIndexAt(ctx.text, Math.max(o.from, o.to - 1)),
      ctx,
      ctx.cursor.offset,
    );
  else applyOperator(op, o.from, o.to, ctx, o.linewise);
  recordRepeatableChange(ctx, { type: "operator", op: op, motion: motion, count: count });
}
/**
 * 操作符 + 查找（如 dfx、ct)）：找到目标字符后对包含式范围应用操作，并记住这次查找供 ; , 重复。
 */
//@ chunk-530hfzwb.js:5841-6069 fingerprint = executeOperatorFind (0.948)
function executeOperatorFind(op, findType, char, count, ctx) {
  let targetOffset = ctx.cursor.findCharacter(char, findType, count);
  if (targetOffset === null) return;
  let target = new Cursor(ctx.cursor.measuredText, targetOffset),
    range = getFindRange(ctx.cursor, target, findType);
  (applyOperator(op, range.from, range.to, ctx),
    ctx.setLastFind(findType, char),
    recordRepeatableChange(ctx, { type: "operatorFind", op: op, find: findType, char: char, count: count }));
}
/**
 * 操作符 + 文本对象（如 diw、ca"、yi(）：用 findTextObject 求范围后应用；yi( 这类内容从换行开始时光标落到下一行。
 */
//@ chunk-530hfzwb.js:6069-6362 fingerprint = executeOperatorTextObj (0.718)
function executeOperatorTextObj(op, scope, objType, count, ctx) {
  let range = findTextObject(ctx.text, ctx.cursor.offset, objType, scope === "inner");
  if (!range) return;
  applyOperator(op, range.start, range.end, ctx);
  let { start: start } = range,
    u =
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
    op: op,
    objType: objType,
    scope: scope,
    count: count,
  });
}
/**
 * 双写操作符（dd、cc、yy、S、Y）：对从当前行起的 count 行做整行操作；count>1 但光标后已没有换行时不执行。
 */
//@ chunk-530hfzwb.js:6362-6714 fingerprint = executeOperatorMotion (0.593)
function executeLineOp(op, count, ctx) {
  if (count < 1) return;
  let n = getLineIndexAt(ctx.text, ctx.cursor.offset);
  if (
    count > 1 &&
    !ctx.cursor.text.includes(
      `
`,
      ctx.cursor.offset,
    )
  )
    return;
  let { offset: offset } = ctx.cursor,
    o =
      ctx.text[offset] ===
      `
`
        ? ctx.cursor.placeholderEndingAt(offset)
        : null,
    i = o !== null && isImagePlaceholder(ctx.text.slice(o.start, o.end));
  (applyLinewiseOperator(op, n, n + count - 1, ctx, i ? ctx.cursor.startOfLogicalLine().offset : offset),
    recordRepeatableChange(ctx, { type: "operator", op: op, motion: op[0], count: count }));
}
/**
 * x：删除光标处 count 个字符（不跨行），存入寄存器。
 */
//@ chunk-530hfzwb.js:6714-6960 fingerprint = executeX (0.853)
function executeX(count, ctx) {
  let from = ctx.cursor.offset;
  if (from >= ctx.text.length) return;
  let n = advanceCharsInLine(ctx, count);
  if (n === from) return;
  let deleted = ctx.text.slice(from, n),
    newText = ctx.text.slice(0, from) + ctx.text.slice(n);
  (ctx.setRegister(deleted, !1),
    ctx.setText(newText),
    ctx.setOffset(clampCursorOffset(newText, from)),
    ctx.recordChange({ type: "x", count: count }));
}
/**
 * s：删除 count 个字符并进入插入模式。
 */
//@ chunk-530hfzwb.js:6960-7158 layout
function executeSubstitute(count, ctx) {
  let offset = ctx.cursor.offset,
    n = advanceCharsInLine(ctx, count);
  if (n > offset)
    (ctx.setRegister(ctx.text.slice(offset, n), !1),
      ctx.setText(ctx.text.slice(0, offset) + ctx.text.slice(n)));
  (ctx.enterInsert(offset), ctx.recordChange({ type: "substitute", count: count }));
}
/**
 * r{char}：把光标起 count 个字素替换为该字符（遇到行尾则不执行）。
 */
//@ chunk-530hfzwb.js:7158-7421 fingerprint = executeReplace (0.952)
function executeReplace(char, count, ctx) {
  let offset = ctx.cursor.offset,
    newText = ctx.text,
    o = offset;
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
  (ctx.setText(newText.slice(0, offset) + char.repeat(count) + newText.slice(o)),
    ctx.setOffset(offset + char.length * (count - 1)),
    ctx.recordChange({ type: "replace", char: char, count: count }));
}
/**
 * ~：切换光标起 count 个字素的大小写（NFC 规范化），光标后移。
 */
//@ chunk-530hfzwb.js:7421-7809 fingerprint = executeToggleCase (0.769)
function executeToggleCase(count, ctx) {
  let columns = ctx.cursor.measuredText.columns,
    text = ctx.text,
    startOffset = ctx.cursor.offset,
    toggled = 0;
  while (
    startOffset < text.length &&
    text[startOffset] !==
      `
` &&
    toggled < count
  ) {
    let grapheme = firstGrapheme(text.slice(startOffset)),
      graphemeLen = grapheme.length,
      normalized = (
        grapheme === grapheme.toUpperCase() ? grapheme.toLowerCase() : grapheme.toUpperCase()
      ).normalize("NFC");
    ((text = text.slice(0, startOffset) + normalized + text.slice(startOffset + graphemeLen)),
      (startOffset += normalized.length),
      toggled++);
  }
  if (toggled === 0) return;
  let fromText = Cursor.fromText(text, columns);
  (ctx.setText(text),
    ctx.setOffset(clampOffsetOutsidePlaceholder(fromText, startOffset)),
    ctx.recordChange({ type: "toggleCase", count: count }));
}
/**
 * J：把当前行与后面 max(count,2)-1 行合并。
 */
//@ chunk-530hfzwb.js:7809-8060 layout
function executeJoinLines(count, ctx) {
  let parts = ctx.text.split(`
`),
    n = getLineIndexAt(ctx.cursor.text, ctx.cursor.offset);
  if (n >= parts.length - 1) {
    if (count >= 3)
      (ctx.setOffset(getLineStartAt(ctx.cursor.text, ctx.cursor.offset)),
        ctx.recordChange({ type: "join", count: 2 }));
    return;
  }
  let min = Math.min(Math.max(count, 2) - 1, parts.length - n - 1);
  executeJoin(parts, n, min, ctx);
}
/**
 * 合并行：去掉后续行行首空白，必要时补一个空格（下一行以 ) 开头或上一段以空白结尾时不补），光标停在最后一个连接点。
 */
//@ chunk-530hfzwb.js:8060-8398 fingerprint = executeJoin (0.763)
function executeJoin(lines, lineIndex, joinCount, ctx) {
  let joinedLine = lines[lineIndex],
    cursorPos = joinedLine.length,
    i = joinedLine;
  for (let d = 1; d <= joinCount; d++) {
    cursorPos = joinedLine.length;
    let replaced = lines[lineIndex + d].replace(/^[ \t\r]+/, "");
    if (replaced.length > 0 && joinedLine.length > 0 && !replaced.startsWith(")") && !/[ \t]$/.test(i))
      joinedLine += " ";
    ((joinedLine += replaced), (i = replaced));
  }
  let newLines = [...lines.slice(0, lineIndex), joinedLine, ...lines.slice(lineIndex + joinCount + 1)],
    joined = newLines.join(`
`);
  (ctx.setText(joined),
    ctx.setOffset(clampCursorOffset(joined, getLineStartOffset(newLines, lineIndex) + cursorPos)),
    ctx.recordChange({ type: "join", count: joinCount + 1 }));
}
/**
 * p/P：按寄存器是否整行分两种：整行内容插到当前行下/上方并把光标放到首个非空字符；字符内容插到光标后/前，光标停在插入内容最后一个字素。
 */
//@ chunk-530hfzwb.js:8398-9239 fingerprint = executePaste (0.554)
function executePaste(after, count, ctx) {
  let register = ctx.getRegister();
  if (!register) return;
  ctx.recordChange({ type: "paste", after: after, count: count });
  let registerIsLinewise = ctx.getRegisterIsLinewise(),
    o =
      registerIsLinewise &&
      register.endsWith(`
`)
        ? register.slice(0, -1)
        : register;
  if (registerIsLinewise) {
    let text = ctx.text,
      parts = text.split(`
`),
      f = getLineIndexAt(ctx.cursor.text, ctx.cursor.offset),
      d = after ? f + 1 : f,
      parts_2 = o.split(`
`),
      repeatedLines = [];
    for (let D = 0; D < count; D++) repeatedLines.push(...parts_2);
    let newLines = [...parts.slice(0, d), ...repeatedLines, ...parts.slice(d)],
      joined = newLines.join(`
`),
      O = getLineStartOffset(newLines, d),
      fromText = Cursor.fromText(parts_2[0] ?? "", ctx.cursor.measuredText.columns),
      F = firstNonBlankOffset(fromText);
    (ctx.setText(joined, { previous: { value: text, cursorOffset: O } }),
      ctx.setOffset(O + (fromText.placeholderStartingAt(F) ? 0 : F)));
  } else {
    let textToInsert = o.repeat(count),
      offset = ctx.cursor.offset,
      f =
        ctx.text[offset] ===
          `
` &&
        (offset === 0 ||
          ctx.text[offset - 1] ===
            `
`),
      d = after && offset < ctx.text.length && !f ? ctx.cursor.measuredText.nextOffset(offset) : offset,
      p = ctx.text.slice(0, d) + textToInsert + ctx.text.slice(d),
      h = textToInsert.includes(`
`)
        ? clampCursorOffset(p, d)
        : d + textToInsert.length - (lastGrapheme(textToInsert).length || 1);
    (ctx.setText(p, { previous: { value: ctx.text, cursorOffset: d } }), ctx.setOffset(h));
  }
}
/**
 * >> / <<：给当前行起 count 行加/减两个空格缩进（减时也去掉一个 tab 或最多两个空白）。
 */
//@ chunk-530hfzwb.js:9239-9506 fingerprint = executeIndent (0.834)
function executeIndent(dir, count, ctx) {
  let parts = ctx.text.split(`
`),
    o = getLineIndexAt(ctx.cursor.text, ctx.cursor.offset);
  if (count > 1 && o === parts.length - 1) return;
  let linesToAffect = Math.min(count, parts.length - o);
  indentLines(parts, o, o + linesToAffect - 1, dir);
  let joined = parts.join(`
`),
    f = wrapText(parts[o] ?? "");
  (ctx.setText(joined),
    ctx.setOffset(getLineStartOffset(parts, o) + f),
    ctx.recordChange({ type: "indent", dir: dir, count: count }));
}
/**
 * o/O：在当前行下/上方插入空行并进入插入模式。
 */
//@ chunk-530hfzwb.js:9506-9778 fingerprint = executeOpenLine (0.808)
function executeOpenLine(direction, ctx) {
  let text = ctx.text,
    parts = text.split(`
`),
    s = getLineIndexAt(ctx.cursor.text, ctx.cursor.offset),
    insertLine = direction === "below" ? s + 1 : s,
    newLines = [...parts.slice(0, insertLine), "", ...parts.slice(insertLine)],
    joined = newLines.join(`
`),
    f = getLineStartOffset(newLines, insertLine);
  (ctx.setText(joined, { previous: { value: text, cursorOffset: f } }),
    ctx.enterInsert(f),
    ctx.recordChange({ type: "openLine", direction: direction }));
}
//@ chunk-530hfzwb.js:9778-9829 layout
function recordRepeatableChange(e, t) {
  if (t.op !== "yank") e.recordChange(t);
}
//@ chunk-530hfzwb.js:9829-9956 layout
function advanceCharsInLine(ctx, count) {
  let cursor = ctx.cursor;
  for (let n = 0; n < count && !cursor.isAtEnd(); n++) {
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
/**
 * 操作符 + 移动的范围计算（vim 兼容细节）：cw 当作 ce；dw/yw 不越过行尾；包含式移动（e E $ %）把终点含进去；跨行删除且前面只有空白时整行化。最后把起止点推出占位符（图片/粘贴占位）之外。
 */
//@ chunk-530hfzwb.js:10019-11262 fingerprint = getOperatorRange (0.852)
function getOperatorRange(cursor, target, motion, op, count) {
  let from = Math.min(cursor.offset, target.offset),
    to = Math.max(cursor.offset, target.offset),
    u = !1,
    f = motion === "w" || motion === "W",
    d = f && op === "change",
    p = f && op !== "change",
    h = cursor.text[cursor.offset],
    x =
      (h === " " ||
        h === "\t" ||
        h ===
          `
`) &&
      cursor.snapOutOfPlaceholder(cursor.offset, "start") === cursor.offset;
  if (d && x) {
    if (
      ((to = clampWordMotionToLineEnd(cursor, motion, count, to)),
      to > from &&
        cursor.text[to - 1] ===
          `
`)
    ) {
      to -= 1;
      let offset = cursor.startOfLogicalLine().offset;
      if (/^[ \t]*$/.test(cursor.text.slice(offset, from))) ((from = offset), (u = !0));
    }
  } else if (d) {
    let wordCursor = cursor;
    for (let oe = 0; oe < count - 1; oe++)
      do wordCursor = motion === "w" ? wordCursor.nextVimWord() : wordCursor.nextWORD();
      while (cursor.isOnEmptyLine(wordCursor.offset));
    let F = motion === "w" ? wordCursor.endOfVimWord() : wordCursor.endOfWORD(),
      nextOffset = cursor.measuredText.nextOffset(wordCursor.offset),
      K = motion === "w" ? wordCursor.nextVimWord() : wordCursor.nextWORD();
    if (
      (nextOffset >= cursor.text.length || zWe(cursor.text[nextOffset] ?? "") || K.offset === nextOffset) &&
      !zWe(cursor.text[cursor.offset] ?? "") &&
      !zWe(cursor.text[wordCursor.offset] ?? "")
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
  let b = getLineStartAt(cursor.text, from),
    matches = /^[ \t]*$/.test(cursor.text.slice(b, from));
  if (
    (motion === " " || p) &&
    to > from &&
    cursor.text[to - 1] ===
      `
`
  )
    ((u = matches), (from = u ? b : from), (to = u && op !== "change" ? to : to - 1));
  else if (
    p &&
    op === "delete" &&
    matches &&
    cursor.text.slice(from, to).includes(`
`) &&
    /^[ \t]*(\n|$)/.test(cursor.text.slice(to))
  )
    ((from = b), (u = !0));
  return (
    (from = cursor.snapOutOfPlaceholder(from, "start")),
    (to = cursor.snapOutOfPlaceholder(to, "end")),
    { from: from, to: to, linewise: u }
  );
}
//@ chunk-530hfzwb.js:11262-11371 layout
function clampWordMotionToLineEnd(e, t, r, n) {
  let s = resolveMotion(t, e, r - 1),
    offset = s.endOfLogicalLine().offset;
  if (n <= offset) return n;
  return offset > s.offset ? offset : offset + 1;
}
//@ chunk-530hfzwb.js:11371-11567 layout
function getFindRange(e, t, r) {
  let max = Math.max(e.offset, t.offset),
    snapOutOfPlaceholder = e.snapOutOfPlaceholder(Math.min(e.offset, t.offset), "start"),
    snapOutOfPlaceholder_2 = e.snapOutOfPlaceholder(e.measuredText.nextOffset(max), "end");
  return { from: snapOutOfPlaceholder, to: snapOutOfPlaceholder_2 };
}
/**
 * 对字符范围应用操作：内容写寄存器（整行时补换行）；yank 只移动光标；delete 删除并修正光标；change 删除后进入插入模式。
 */
//@ chunk-530hfzwb.js:11567-11918 fingerprint = applyOperator (0.962)
function applyOperator(op, from, to, ctx, linewise = !1) {
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
    let i = ctx.text.slice(0, from) + ctx.text.slice(to);
    (ctx.setText(i), ctx.setOffset(clampCursorOffset(i, from)));
  } else if (op === "change") {
    let i = ctx.text.slice(0, from) + ctx.text.slice(to);
    (ctx.setText(i), ctx.enterInsert(from));
  }
}
/**
 * 普通模式光标不能停在行尾换行符上或文本末尾之后：退回到前一个字素。
 */
//@ chunk-530hfzwb.js:11918-12095 layout
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
function snapToPlaceholderEnd(e, t, r) {
  let n = placeholderAt(e, t),
    s = t;
  while (n && n.start > r) ((s = e.measuredText.prevOffset(n.start)), (n = placeholderAt(e, s)));
  if (!n) return s;
  let end = n.end;
  while ((n = placeholderAt(e, end))) end = n.end;
  return end;
}
//@ chunk-530hfzwb.js:12258-12349 layout
function placeholderAt(e, t) {
  let snapOutOfPlaceholder = e.snapOutOfPlaceholder(t, "start");
  return e.placeholderStartingAt(snapOutOfPlaceholder);
}
//@ chunk-530hfzwb.js:12349-12439 layout
function clampOffsetOutsidePlaceholder(e, t, r = e.text) {
  let n = clampCursorOffset(r, t);
  return e.snapOutOfPlaceholder(n, "start") === n ? n : t;
}
/**
 * gj/gk 的屏幕行移动：按折行后的行计算目标位置并保持目标列（wantedColumn）；返回 {offset, column, rowsRunOut}。
 */
//@ chunk-530hfzwb.js:12439-12999 layout
function computeScreenLineMove(motion, count, ctx) {
  let { cursor: cursor } = ctx,
    s = resolveMotion(motion, cursor, count),
    wrappedLines = cursor.measuredText.getWrappedLines(),
    line = cursor.getPosition().line,
    f = (motion === "gj" ? wrappedLines.length - 1 - line : line) < count,
    d = wrappedLines[line],
    p = wrappedLines[s.getPosition().line],
    h = d?.startOffset === 0 || d?.isPrecededByNewline,
    x = p?.startOffset === 0 || p?.isPrecededByNewline;
  if (s.equals(cursor) || !h || !x || !p) return { offset: s.offset, column: null, rowsRunOut: f };
  let b = getCursorDisplayColumn(cursor, ctx.wantedColumn),
    O = p.startOffset + p.text.length,
    I = truncateStartToWidth(cursor.text, p.startOffset, O, b),
    F = snapToPlaceholderEnd(cursor, I, p.startOffset),
    D = !p.endsWithNewline && O < cursor.text.length;
  return { offset: F === O && D ? cursor.measuredText.prevOffset(O) : F, column: b, rowsRunOut: f };
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
/**
 * 可视模式记录跨度：整行时为行数，否则为字素数（供 . 重复同样大小的可视操作）。
 */
//@ chunk-530hfzwb.js:13083-13165 layout
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
/**
 * 用记录的跨度从当前光标重建可视范围（. 重复可视操作时用）。
 */
//@ chunk-530hfzwb.js:13165-13449 fingerprint = getOperatorRangeForFind (0.907)
function getRepeatVisualRange(cursor, target, _findType) {
  let text = cursor.text;
  if (_findType) {
    let i = getLineStartAt(text, cursor.cursor.offset),
      u = i;
    for (let f = 0; f < target; f++) {
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
    return { from: i, to: u };
  }
  let offset = cursor.cursor.offset,
    o = offset;
  for (let i = 0; i < target && o < text.length; i++) o = cursor.cursor.measuredText.nextOffset(o);
  return { from: offset, to: o };
}
/**
 * 可视选区范围：字符可视为 [min, max+1)，整行可视扩到首行行首至末行换行之后。
 */
//@ chunk-530hfzwb.js:13449-13676 layout = getOperatorRangeForFind (0.907)
function getVisualRange(cursor, target, _findType) {
  let from = Math.min(cursor, target.cursor.offset),
    maxOffset = Math.max(cursor, target.cursor.offset);
  if (!_findType) return { from: from, to: target.cursor.measuredText.nextOffset(maxOffset) };
  let text = target.text,
    i = getLineStartAt(text, from),
    index = text.indexOf(
      `
`,
      maxOffset,
    ),
    f = index === -1 ? text.length : index + 1;
  return { from: i, to: f };
}
//@ chunk-530hfzwb.js:13676-13936 layout
function indentLines(e, t, r, n) {
  for (let o = t; o <= r; o++) {
    let i = e[o] ?? "";
    if (i === "") continue;
    if (n === ">") e[o] = "  " + i;
    else if (i.startsWith("  ")) e[o] = i.slice(2);
    else if (i.startsWith("\t")) e[o] = i.slice(1);
    else {
      let u = 0;
      while (u < i.length && u < 2 && /\s/.test(i[u])) u++;
      e[o] = i.slice(u);
    }
  }
}
//@ chunk-530hfzwb.js:13936-14267 layout
function executeVisualJoin(e, t, r) {
  let min = Math.min(e, t.cursor.offset),
    max = Math.max(e, t.cursor.offset),
    text = t.text,
    i = countCharInString(
      text.slice(0, min),
      `
`,
    ),
    u =
      countCharInString(
        text.slice(min, max),
        `
`,
      ) + 1,
    parts = text.split(`
`);
  if (i >= parts.length - 1) {
    (t.setOffset(r ? getLineStartAt(t.cursor.text, min) : clampCursorOffset(t.cursor.text, min)),
      t.recordChange({ type: "join", count: 2 }));
    return;
  }
  let max_2 = Math.max(1, Math.min(u - 1, parts.length - i - 1));
  executeJoin(parts, i, max_2, t);
}
//@ chunk-530hfzwb.js:14267-14363 layout
function executeJoinIfNotLastLine(e, t) {
  let parts = t.text.split(`
`);
  if (getLineIndexAt(t.cursor.text, t.cursor.offset) < parts.length - 1) executeJoinLines(e, t);
}
//@ chunk-530hfzwb.js:14363-14684 layout
function executeVisualIndent(e, t, r, n) {
  let min = Math.min(r, n.cursor.offset),
    max = Math.max(r, n.cursor.offset),
    text = n.text,
    u = countCharInString(
      text.slice(0, min),
      `
`,
    ),
    f =
      u +
      countCharInString(
        text.slice(min, max),
        `
`,
      ),
    parts = text.split(`
`);
  for (let x = 0; x < t; x++) indentLines(parts, u, f, e);
  let joined = parts.join(`
`),
    h = wrapText(parts[u] ?? "");
  (n.setText(joined),
    n.setOffset(getLineStartOffset(parts, u) + h),
    n.recordChange({ type: "visualIndent", dir: e, count: t, lines: f - u + 1 }));
}
//@ chunk-530hfzwb.js:14684-14899 layout
function repeatVisualIndent(e, t, r, n) {
  let text = n.text,
    parts = text.split(`
`),
    i = countCharInString(
      text.slice(0, n.cursor.offset),
      `
`,
    ),
    min = Math.min(i + r - 1, parts.length - 1);
  for (let p = 0; p < t; p++) indentLines(parts, i, min, e);
  let joined = parts.join(`
`),
    d = wrapText(parts[i] ?? "");
  (n.setText(joined), n.setOffset(getLineStartOffset(parts, i) + d));
}
/**
 * 对可视选区应用操作：整行 c 留一个空行进插入；整行 d 删除整行并把光标放到下一行首个非空；其他走 applyOperator。
 */
//@ chunk-530hfzwb.js:14899-15594 layout
function applyVisualOperator(e, t, r, n, s, o = !1) {
  if (s && e === "change") {
    let sliced = n.text.slice(t, r),
      u = sliced;
    if (
      !u.endsWith(`
`)
    )
      u += `
`;
    n.setRegister(u, !0);
    let sliced_2 = n.text.slice(0, t),
      sliced_3 = n.text.slice(r),
      p =
        sliced_3 !== "" ||
        (sliced.endsWith(`
`) &&
          !o);
    (n.setText(
      sliced_2 +
        (p
          ? `
`
          : "") +
        sliced_3,
    ),
      n.enterInsert(t));
    return;
  }
  if (s && e === "delete") {
    let sliced = n.text.slice(t, r);
    if (
      !sliced.endsWith(`
`)
    )
      sliced += `
`;
    n.setRegister(sliced, !0);
    let u = t;
    if (
      r === n.text.length &&
      t > 0 &&
      n.text[t - 1] ===
        `
`
    )
      u -= 1;
    let f = r < n.text.length,
      d = n.text.slice(0, u) + n.text.slice(r);
    n.setText(d);
    let p = f ? t : getLineStartAt(d, d.length),
      index = d.indexOf(
        `
`,
        p,
      ),
      x = index === -1 ? d.length : index,
      fromText = Cursor.fromText(d.slice(p, x), n.cursor.measuredText.columns + 1),
      O = firstNonBlankOffsetSafe(fromText, f),
      I = !f && fromText.placeholderStartingAt(O) !== null;
    n.setOffset(I ? clampCursorOffset(d, d.length) : p + O);
    return;
  }
  applyOperator(e, t, r, n, s);
}
//@ chunk-530hfzwb.js:15594-15738 layout
function executeVisualOperator(e, t, r, n) {
  let { from: from, to: to } = getVisualRange(t, r, n),
    i = measureSpan(r.text.slice(from, to), n);
  (applyVisualOperator(e, from, to, r, n, selectionReachesTrailingNewline(t, r, n)),
    recordRepeatableChange(r, { type: "visualOp", op: e, span: i, linewise: n }));
}
//@ chunk-530hfzwb.js:15738-15839 layout
function repeatVisualOperator(e, t, r, n) {
  let { from: from, to: to } = getRepeatVisualRange(n, t, r);
  if (from === to && !(r && n.text.length > 0)) return;
  applyVisualOperator(e, from, to, n, r);
}
//@ chunk-530hfzwb.js:15839-16091 layout
function repeatVisualChange(e, t, r) {
  let { from: from, to: to } = getRepeatVisualRange(r, e, t);
  if (from === to && !t) return;
  let sliced = r.text.slice(from, to),
    i = sliced;
  if (
    t &&
    !i.endsWith(`
`)
  )
    i += `
`;
  r.setRegister(i, t);
  let sliced_2 = r.text.slice(to),
    f =
      t &&
      (sliced_2 !== "" ||
        sliced.endsWith(`
`))
        ? `
` + sliced_2
        : sliced_2;
  (r.setText(r.text.slice(0, from) + f), r.enterInsert(from));
}
//@ chunk-530hfzwb.js:16091-16284 layout
function replaceRangeWithChar(e, t, r, n) {
  let sliced = n.text.slice(t, r),
    o = "";
  for (let { segment: segment } of getGraphemeSegmenter().segment(sliced))
    o +=
      segment ===
      `
`
        ? `
`
        : e;
  let i = n.text.slice(0, t) + o + n.text.slice(r),
    cursor = n.cursor;
  (n.setText(i), n.setOffset(clampOffsetOutsidePlaceholder(cursor, t, i)));
}
//@ chunk-530hfzwb.js:16284-16434 layout
function executeVisualReplace(e, t, r, n) {
  let { from: from, to: to } = getVisualRange(t, r, n),
    i = measureSpan(r.text.slice(from, to), n);
  (replaceRangeWithChar(e, from, to, r),
    r.recordChange({ type: "visualReplace", char: e, span: i, linewise: n }));
}
//@ chunk-530hfzwb.js:16434-16510 layout
function repeatVisualReplace(e, t, r, n) {
  let { from: from, to: to } = getRepeatVisualRange(n, t, r);
  if (from === to) return;
  replaceRangeWithChar(e, from, to, n);
}
//@ chunk-530hfzwb.js:16510-16819 layout
function changeRangeCase(e, t, r, n) {
  let sliced = n.text.slice(t, r),
    o = "";
  for (let { segment: segment } of getGraphemeSegmenter().segment(sliced))
    if (e === "upper") o += segment.toUpperCase();
    else if (e === "lower") o += segment.toLowerCase();
    else o += segment === segment.toUpperCase() ? segment.toLowerCase() : segment.toUpperCase();
  let i = n.text.slice(0, t) + o + n.text.slice(r),
    cursor = n.cursor;
  (n.setText(i), n.setOffset(clampOffsetOutsidePlaceholder(cursor, t, i)));
}
//@ chunk-530hfzwb.js:16819-16968 layout
function executeVisualCase(e, t, r, n) {
  let { from: from, to: to } = getVisualRange(t, r, n),
    i = measureSpan(r.text.slice(from, to), n);
  (changeRangeCase(e, from, to, r), r.recordChange({ type: "visualCase", caseOp: e, span: i, linewise: n }));
}
//@ chunk-530hfzwb.js:16968-17044 layout
function repeatVisualCase(e, t, r, n) {
  let { from: from, to: to } = getRepeatVisualRange(n, t, r);
  if (from === to) return;
  changeRangeCase(e, from, to, n);
}
//@ chunk-530hfzwb.js:17044-17376 layout
function executeVisualPaste(e, t, r) {
  let register = t.getRegister();
  if (!register) return;
  let registerIsLinewise = t.getRegisterIsLinewise(),
    { from: from, to: to } = getVisualRange(e, t, r),
    sliced = t.text.slice(from, to),
    f = measureSpan(sliced, r);
  (replaceRangeWithRegister(
    register,
    registerIsLinewise,
    from,
    to,
    t,
    r,
    selectionReachesTrailingNewline(e, t, r),
  ),
    t.recordChange({
      type: "visualPaste",
      content: register,
      registerLinewise: registerIsLinewise,
      selectionEndsLine: sliced.endsWith(`
`),
      selectionOnOneLine: !sliced.slice(0, -1).includes(`
`),
      span: f,
      linewise: r,
    }));
}
//@ chunk-530hfzwb.js:17376-17530 layout
function repeatVisualPaste(e, t, r, n, s, o, i) {
  let { from: from, to: to } = getRepeatVisualRange(i, s, o);
  if (from === to && !o) return;
  replaceRangeWithRegister(
    e,
    t,
    from,
    !o && n ? Math.min(to, i.cursor.endOfLogicalLine().offset + (r ? 1 : 0)) : to,
    i,
    o,
    !1,
  );
}
/**
 * 可视粘贴：用寄存器内容替换选区，原选区内容进寄存器；处理整行/字符寄存器与整行/字符选区的四种组合。
 */
//@ chunk-530hfzwb.js:17530-18034 layout
function replaceRangeWithRegister(e, t, r, n, s, o, i) {
  let sliced = s.text.slice(r, n),
    f = t ? e.replace(/\n$/, "") : e,
    d =
      sliced.endsWith(`
`) && !i,
    p = e,
    h = r;
  if (o)
    p = d
      ? f +
        `
`
      : f;
  else if (t)
    ((p = s.text
      ? `
` +
        f +
        `
`
      : `
` + f),
      (h = r + 1));
  let x = sliced;
  if (o && !d)
    x += `
`;
  if (x) s.setRegister(x, o);
  let b = s.text.slice(0, r) + p + s.text.slice(n);
  if ((s.setText(b), o || t)) {
    let fromText = Cursor.fromText(b, s.cursor.measuredText.columns, h),
      I = firstNonBlankOffset(fromText);
    s.setOffset(fromText.placeholderStartingAt(I) ? h : I);
  } else if (
    p.includes(`
`)
  )
    s.setOffset(clampOffsetOutsidePlaceholder(s.cursor, r, b));
  else {
    let O = lastGrapheme(p);
    s.setOffset(Math.max(r, r + p.length - (O.length || 1)));
  }
}
/**
 * 操作符 + G（如 dG、d3G）：整行操作到最后一行或第 count 行。
 */
//@ chunk-530hfzwb.js:18034-18245 fingerprint = executeOperatorG (0.768)
function executeOperatorG(op, count, ctx) {
  let target = count === 0 ? ctx.cursor.startOfLastLine() : ctx.cursor.goToLine(count);
  (applyLinewiseOperator(
    op,
    getLineIndexAt(ctx.text, ctx.cursor.offset),
    getLineIndexAt(ctx.text, target.offset),
    ctx,
    Math.min(ctx.cursor.offset, firstNonBlankOffset(target)),
  ),
    recordRepeatableChange(ctx, { type: "operator", op: op, motion: "G", count: count }));
}
/**
 * 操作符 + gg（如 dgg）：整行操作到第一行或第 count 行。
 */
//@ chunk-530hfzwb.js:18245-18458 fingerprint = executeOperatorGg (0.767)
function executeOperatorGg(op, count, ctx) {
  let target = count === 1 ? ctx.cursor.startOfFirstLine() : ctx.cursor.goToLine(count);
  (applyLinewiseOperator(
    op,
    getLineIndexAt(ctx.text, ctx.cursor.offset),
    getLineIndexAt(ctx.text, target.offset),
    ctx,
    Math.min(ctx.cursor.offset, firstNonBlankOffset(target)),
  ),
    recordRepeatableChange(ctx, { type: "operator", op: op, motion: "gg", count: count }));
}
/**
 * 按行号范围做整行操作：整行内容写寄存器；yank 只移光标；delete 删行后光标到相应行首个非空；change 留一个空行进入插入模式。
 */
//@ chunk-530hfzwb.js:18458-19048 affinity = applyOperator (0.753)
function applyLinewiseOperator(op, fromLine, toLine, ctx, cursorOffset) {
  let parts = ctx.text.split(`
`),
    min = Math.min(fromLine, toLine),
    min_2 = Math.min(Math.max(fromLine, toLine) + 1, parts.length),
    content = parts.slice(0, min),
    sliced = parts.slice(min_2),
    p = getLineStartOffset(parts, min),
    joined = parts
      .slice(min, min_2)
      .map(
        (x) =>
          x +
          `
`,
      )
      .join("");
  if ((ctx.setRegister(joined, !0), op === "yank")) {
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
    let maxOff = Math.max(0, Math.min(min, x.length - 1)),
      fromText = Cursor.fromText(x[maxOff] ?? "", ctx.cursor.measuredText.columns + 1);
    ctx.setOffset(getLineStartOffset(x, maxOff) + firstNonBlankOffsetSafe(fromText, sliced.length > 0));
  } else if (op === "change")
    (ctx.setText(
      [...content, "", ...sliced].join(`
`),
    ),
      ctx.enterInsert(p));
}
//@ chunk-530hfzwb.js:19048-19092 affinity
function getLineIndexAt(e, t) {
  return countCharInString(
    e.slice(0, t),
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
  let snapOutOfPlaceholder = e.snapOutOfPlaceholder(t, "start");
  if (snapOutOfPlaceholder === t) return t;
  let snapOutOfPlaceholder_2 = e.snapOutOfPlaceholder(t, "end");
  return isImagePlaceholder(e.text.slice(snapOutOfPlaceholder, snapOutOfPlaceholder_2))
    ? snapOutOfPlaceholder_2
    : snapOutOfPlaceholder;
}
//@ chunk-530hfzwb.js:19493-19605 placement
function firstNonBlankOffset(e) {
  let offset = e.startOfLogicalLine().offset,
    offset_2 = e.endOfLogicalLine().offset;
  return offset + wrapText(e.text.slice(offset, offset_2));
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
/**
 * 读取 vimInsertModeRemaps 设置：只接受映射到 <Esc> 的两字符可见序列（如 jk、jj）。
 */
//@ chunk-530hfzwb.js:19711-19939 placement
function parseInsertModeEscapeRemaps(e) {
  let t = new Map();
  for (let [r, n] of Object.entries(e)) {
    if (typeof n !== "string" || n.toLowerCase() !== "<esc>") continue;
    let normalized = r.normalize("NFC");
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
  clampCursorOffset,
  clampOffsetOutsidePlaceholder,
  getInsertModeEscapeRemaps,
  snapToPlaceholderEnd,
  executeToggleCase,
  executeX,
  executeSubstitute,
  executeLineOp,
  executeJoinLines,
  executePaste,
  executeOperatorMotion,
  executeOpenLine,
  executeOperatorG,
  executeOperatorFind,
  executeOperatorTextObj,
  computeScreenLineMove,
  executeOperatorGg,
  executeReplace,
  executeIndent,
  executeJoinIfNotLastLine,
  repeatVisualOperator,
  repeatVisualReplace,
  repeatVisualCase,
  repeatVisualPaste,
  repeatVisualIndent,
  repeatVisualChange,
  VIM_ESCAPE_REMAP_TIMEOUT_MS,
  executeVisualOperator,
  executeVisualReplace,
  executeVisualCase,
  executeVisualPaste,
  executeVisualJoin,
  executeVisualIndent,
};
