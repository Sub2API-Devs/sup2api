/**
 * ink/selection.ts
 *
 * 鼠标选区：锚点/焦点、按词/按行扩展、跨滚动保持、选区文字提取（含软换行拼接、URL 识别）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/selection.ts
 * pieces: chunk-2avr6cej.js (33)
 * attribution: fingerprint 21, layout 9, file-local 2, callgraph-fingerprint 1
 */
import { clamp, cellAt, softWrapStartCol, SW_ELIDED_SEP, cellAtIndex, setCellStyleId } from "./screen.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-2avr6cej.js:213347-213525 fingerprint (2.1.88 match: createSelectionState, 1)
/**
 * 新建选区状态：锚点/焦点、是否拖动中、双击/三击时的锚定范围、滚出视口上方/下方的已选文本行（及各行是否软换行）、上次按下是否带 Alt。
 */
function createSelectionState() {
  return {
    anchor: null,
    focus: null,
    isDragging: false,
    anchorSpan: null,
    scrolledOffAbove: [],
    scrolledOffBelow: [],
    scrolledOffAboveSW: [],
    scrolledOffBelowSW: [],
    lastPressHadAlt: false,
  };
}
//@ chunk-2avr6cej.js:213525-213847 fingerprint (2.1.88 match: startSelection, 0.922)
/**
 * 鼠标按下开始选区：记录锚点（限制在 scope 列范围内，例如只选某个面板）、清掉焦点与滚出缓存、进入拖动。
 */
function startSelection(selection, col, row, scope) {
  selection.scope = scope;
  selection.anchor = {
    col: clampColToScope(selection, col),
    row,
  };
  selection.focus = null;
  selection.isDragging = true;
  selection.anchorSpan = null;
  selection.scrolledOffAbove = [];
  selection.scrolledOffBelow = [];
  selection.scrolledOffAboveSW = [];
  selection.scrolledOffBelowSW = [];
  selection.virtualAnchorRow = undefined;
  selection.virtualFocusRow = undefined;
  selection.virtualAnchorCol = undefined;
  selection.virtualFocusCol = undefined;
  selection.lastPressHadAlt = false;
}
//@ chunk-2avr6cej.js:213847-213991 fingerprint (2.1.88 match: updateSelection, 1)
/**
 * 拖动中更新焦点（第一次移动且没离开锚点格时不设焦点，避免单击产生空选区）。
 */
function updateSelection(s, col, row) {
  if (!s.isDragging) return;
  let clampedCol = clampColToScope(s, col);
  if (!s.focus && s.anchor && s.anchor.col === clampedCol && s.anchor.row === row) return;
  s.focus = {
    col: clampedCol,
    row,
  };
}
//@ chunk-2avr6cej.js:213991-214055 layout
function clampColToScope(selection, col) {
  return selection.scope ? clamp(col, selection.scope.x1, selection.scope.x2 - 1) : col;
}
//@ chunk-2avr6cej.js:214055-214145 layout
/**
 * 选区可用的列范围：有 scope 时为 [scope.x1, min(scope.x2,width)-1]，否则整行。
 */
function selectionColRange(selection, width) {
  return selection.scope
    ? {
        lo: selection.scope.x1,
        hi: Math.min(selection.scope.x2, width) - 1,
      }
    : {
        lo: 0,
        hi: width - 1,
      };
}
//@ chunk-2avr6cej.js:214145-214176 fingerprint (2.1.88 match: finishSelection, 1)
/**
 * 鼠标松开：结束拖动（选区保留）。
 */
function finishSelection(s) {
  s.isDragging = false;
}
//@ chunk-2avr6cej.js:214176-214482 fingerprint (2.1.88 match: clearSelection, 0.912)
/**
 * 清除选区及全部虚拟坐标/滚出缓存。
 */
function clearSelection(s) {
  s.anchor = null;
  s.focus = null;
  s.isDragging = false;
  s.anchorSpan = null;
  s.scope = undefined;
  s.scrolledOffAbove = [];
  s.scrolledOffBelow = [];
  s.scrolledOffAboveSW = [];
  s.scrolledOffBelowSW = [];
  s.virtualAnchorRow = undefined;
  s.virtualFocusRow = undefined;
  s.virtualAnchorCol = undefined;
  s.virtualFocusCol = undefined;
  s.lastPressHadAlt = false;
}
//@ chunk-2avr6cej.js:214482-214514 layout
var WORD_CHAR = /[\p{L}\p{N}_/.\-+~\\]/u;
//@ chunk-2avr6cej.js:214514-214589 file-local
/**
 * 双击选词用的字符类别：空白 0、单词字符 1、其他标点 2。
 */
function charClass(c) {
  if (c === " " || c === "") return 0;
  if (WORD_CHAR.test(c)) return 1;
  return 2;
}
//@ chunk-2avr6cej.js:214589-215217 fingerprint (2.1.88 match: wordBoundsAt, 1)
/**
 * 双击选词的范围：先看是否点在纯文本 URL 上（整条 URL 当一个词），否则按字符类（空白/单词字符/其它）向两侧扩展，跳过宽字符占位、遇 noSelect 停。
 */
function wordBoundsAt(screen, col, row) {
  if (row < 0 || row >= screen.height) return null;
  let { width, noSelect } = screen;
  let rowOff = row * width;
  let col_2 = col;
  if (col_2 > 0) {
    let cell = cellAt(screen, col_2, row);
    if (cell && cell.width === 2) col_2 -= 1;
  }
  if (col_2 < 0 || col_2 >= width || noSelect[rowOff + col_2] === 1) return null;
  let startCell = cellAt(screen, col_2, row);
  if (!startCell) return null;
  let plainTextUrlAt = findPlainTextUrlAt(screen, col_2, row);
  if (plainTextUrlAt)
    return {
      lo: plainTextUrlAt.lo,
      hi: plainTextUrlAt.hi,
    };
  let cls = charClass(startCell.char);
  let lo = col_2;
  while (lo > 0) {
    let prev = lo - 1;
    if (noSelect[rowOff + prev] === 1) break;
    let pc = cellAt(screen, prev, row);
    if (!pc) break;
    if (pc.width === 2) {
      if (prev === 0 || noSelect[rowOff + prev - 1] === 1) break;
      let head = cellAt(screen, prev - 1, row);
      if (!head || charClass(head.char) !== cls) break;
      lo = prev - 1;
      continue;
    }
    if (charClass(pc.char) !== cls) break;
    lo = prev;
  }
  let hi = col_2;
  while (hi < width - 1) {
    let next = hi + 1;
    if (noSelect[rowOff + next] === 1) break;
    let nc = cellAt(screen, next, row);
    if (!nc) break;
    if (nc.width === 2) {
      hi = next;
      continue;
    }
    if (charClass(nc.char) !== cls) break;
    hi = next;
  }
  return {
    lo,
    hi,
  };
}
//@ chunk-2avr6cej.js:215217-215325 fingerprint (2.1.88 match: comparePoints, 1)
/**
 * 比较两个 {row, col} 点的先后（先行后列）。
 */
function comparePoints(a, b) {
  if (a.row !== b.row) return a.row < b.row ? -1 : 1;
  if (a.col !== b.col) return a.col < b.col ? -1 : 1;
  return 0;
}
//@ chunk-2avr6cej.js:215325-215503 fingerprint (2.1.88 match: selectWordAt, 1)
/**
 * 双击：选中该词并设锚定范围 kind=word（后续拖动按词扩展）。
 */
function selectWordAt(s, screen, col, row) {
  let bounds = wordBoundsAt(screen, col, row);
  if (!bounds) return;
  let lo = {
    col: clampColToScope(s, bounds.lo),
    row,
  };
  let hi = {
    col: clampColToScope(s, bounds.hi),
    row,
  };
  s.anchor = lo;
  s.focus = hi;
  s.isDragging = true;
  s.anchorSpan = {
    lo,
    hi,
    kind: "word",
  };
}
//@ chunk-2avr6cej.js:215503-215534 fingerprint (2.1.88 match: URL_BOUNDARY, 1)
var URL_BOUNDARY; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-2avr6cej.js:215503", () => {
  URL_BOUNDARY = new Set([..."<>\"'` "]);
});
//@ chunk-2avr6cej.js:215534-215629 callgraph-fingerprint (2.1.88 match: isUrlChar, 1)
/**
 * 可出现在纯文本 URL 中的字符（可打印 ASCII，不含 <>"'` 与空格）。
 */
function isUrlChar(c) {
  if (c.length !== 1) return false;
  let code = c.charCodeAt(0);
  return code >= 33 && code <= 126 && !URL_BOUNDARY.has(c);
}
//@ chunk-2avr6cej.js:215629-215753 layout
function urlCharAt(screen, col, row) {
  if (screen.noSelect[row * screen.width + col] === 1) return null;
  let cell = cellAt(screen, col, row);
  return cell && cell.width === 0 && isUrlChar(cell.char) ? cell.char : null;
}
//@ chunk-2avr6cej.js:215753-216008 layout
/**
 * 从 col 起在一行内向两侧扩展连续的 URL 字符，返回 {lo, hi, text}。
 */
function scanUrlRun(screen, row, col, minCol, maxCol) {
  if (col < minCol || col > maxCol) return null;
  let char = urlCharAt(screen, col, row);
  if (char === null) return null;
  let lo = col;
  let before = "";
  while (lo > minCol) {
    let prevChar = urlCharAt(screen, lo - 1, row);
    if (prevChar === null) break;
    before = prevChar + before;
    lo--;
  }
  let hi = col;
  let after = "";
  while (hi < maxCol) {
    let nextChar = urlCharAt(screen, hi + 1, row);
    if (nextChar === null) break;
    after += nextChar;
    hi++;
  }
  return {
    lo,
    hi,
    text: before + char + after,
  };
}
//@ chunk-2avr6cej.js:216008-216131 layout
/**
 * 一行里属于软换行续接段的列范围：起点取本行软换行标记的起始列，终点取下一行标记记录的上一行结束列。
 */
function softWrapSpanOfRow(screen, row) {
  let thisWrap = screen.softWrap[row];
  let nextWrap = row + 1 < screen.height ? screen.softWrap[row + 1] : 0;
  return {
    start: thisWrap !== 0 ? softWrapStartCol(thisWrap) : 0,
    end: nextWrap !== 0 ? nextWrap >>> 16 : screen.width,
  };
}
//@ chunk-2avr6cej.js:216131-216172 layout
function findPlainTextUrl(screen, col, row) {
  return findPlainTextUrlAt(screen, col, row)?.url;
}
//@ chunk-2avr6cej.js:216172-217500 fingerprint (2.1.88 match: findPlainTextUrlAt, 0.805)
/**
 * 找 (col,row) 处的纯文本 URL（http/https/file）：沿软换行把折到多行的 URL 拼回来；以 … 截断的不算；去掉末尾标点和不配对的右括号；返回 {url, lo, hi}（本行内的列范围）。
 */
function findPlainTextUrlAt(screen, col, row) {
  if (row < 0 || row >= screen.height) return;
  let width = screen.width;
  let col_2 = col;
  if (col_2 > 0) {
    let cell = cellAt(screen, col_2, row);
    if (cell && cell.width === 2) col_2 -= 1;
  }
  if (col_2 < 0 || col_2 >= width) return;
  let softWrap = screen.softWrap;
  let span = softWrapSpanOfRow(screen, row);
  let minCol;
  let maxCol;
  let insideSpan = col_2 >= span.start && col_2 < span.end;
  if (insideSpan) {
    minCol = span.start;
    maxCol = span.end - 1;
  } else if (col_2 >= span.end) {
    minCol = span.end;
    maxCol = width - 1;
  } else {
    minCol = 0;
    maxCol = span.start - 1;
  }
  let run = scanUrlRun(screen, row, col_2, minCol, maxCol);
  if (!run) return;
  let text = run.text;
  let offsetInText = col_2 - run.lo;
  let lastRow = row;
  let hi = run.hi;
  let firstRow = row;
  let lo = run.lo;
  if (insideSpan) {
    while (lastRow + 1 < screen.height) {
      let nextWrap = softWrap[lastRow + 1];
      if (nextWrap === 0 || hi + 1 !== nextWrap >>> 16 || (nextWrap & SW_ELIDED_SEP) !== 0) break;
      let nextSpan = softWrapSpanOfRow(screen, lastRow + 1);
      let nextRun = scanUrlRun(screen, lastRow + 1, nextSpan.start, nextSpan.start, nextSpan.end - 1);
      if (!nextRun) break;
      text += nextRun.text;
      lastRow++;
      hi = nextRun.hi;
    }
    while (firstRow > 0) {
      let wrap = softWrap[firstRow];
      let prevRowStart = wrap >>> 16;
      if (wrap === 0 || lo !== softWrapStartCol(wrap) || prevRowStart === 0 || (wrap & SW_ELIDED_SEP) !== 0)
        break;
      let prevSpan = softWrapSpanOfRow(screen, firstRow - 1);
      let prevRun = scanUrlRun(screen, firstRow - 1, prevRowStart - 1, prevSpan.start, prevRowStart - 1);
      if (!prevRun) break;
      text = prevRun.text + text;
      offsetInText += prevRun.text.length;
      firstRow--;
      lo = prevRun.lo;
    }
  }
  let schemeRe = /(?:https?|file):\/\//g;
  let urlStart = -1;
  let urlEnd = text.length;
  for (let m; (m = schemeRe.exec(text));) {
    if (m.index > offsetInText) {
      urlEnd = m.index;
      break;
    }
    urlStart = m.index;
  }
  if (urlStart < 0) return;
  if (urlEnd === text.length && hi + 1 < width) {
    if (cellAt(screen, hi + 1, lastRow)?.char === "\u2026") return;
  }
  let url = text.slice(urlStart, urlEnd);
  let OPENER = {
    ")": "(",
    "]": "[",
    "}": "{",
  };
  while (url.length > 0) {
    let last = url.at(-1);
    if (".,;:!?".includes(last)) {
      url = url.slice(0, -1);
      continue;
    }
    let opener = OPENER[last];
    if (!opener) break;
    let opens = 0;
    let closes = 0;
    for (let i = 0; i < url.length; i++) {
      let ch = url.charAt(i);
      if (ch === opener) opens++;
      else if (ch === last) closes++;
    }
    if (closes > opens) url = url.slice(0, -1);
    else break;
  }
  if (offsetInText >= urlStart + url.length) return;
  let urlOffsetInRun = offsetInText - (col_2 - run.lo);
  let lo_2 = run.lo + Math.max(0, urlStart - urlOffsetInRun);
  let hi_2 = run.lo + Math.min(run.hi - run.lo, urlStart + url.length - 1 - urlOffsetInRun);
  return {
    url,
    lo: lo_2,
    hi: hi_2,
  };
}
//@ chunk-2avr6cej.js:217500-217678 fingerprint (2.1.88 match: selectLineAt, 1)
/**
 * 三击：选中整行（受 scope 限制），锚定范围 kind=line。
 */
function selectLineAt(s, screen, row) {
  if (row < 0 || row >= screen.height) return;
  let range = selectionColRange(s, screen.width);
  let lo = {
    col: range.lo,
    row,
  };
  let hi = {
    col: range.hi,
    row,
  };
  s.anchor = lo;
  s.focus = hi;
  s.isDragging = true;
  s.anchorSpan = {
    lo,
    hi,
    kind: "line",
  };
}
//@ chunk-2avr6cej.js:217678-218056 fingerprint (2.1.88 match: extendSelection, 1)
/**
 * 双击/三击后拖动：按词或按行扩展选区，锚点保持在原锚定范围的另一端。
 */
function extendSelection(s, screen, col, row) {
  if (!s.isDragging || !s.anchorSpan) return;
  let span = s.anchorSpan;
  let mLo;
  let mHi;
  if (span.kind === "word") {
    let bounds = wordBoundsAt(screen, col, row);
    mLo = {
      col: clampColToScope(s, bounds ? bounds.lo : col),
      row,
    };
    mHi = {
      col: clampColToScope(s, bounds ? bounds.hi : col),
      row,
    };
  } else {
    let row_2 = clamp(row, 0, screen.height - 1);
    let selectionCols = selectionColRange(s, screen.width);
    mLo = {
      col: selectionCols.lo,
      row: row_2,
    };
    mHi = {
      col: selectionCols.hi,
      row: row_2,
    };
  }
  if (comparePoints(mHi, span.lo) < 0) {
    s.anchor = span.hi;
    s.focus = mLo;
  } else if (comparePoints(mLo, span.hi) > 0) {
    s.anchor = span.lo;
    s.focus = mHi;
  } else {
    s.anchor = span.lo;
    s.focus = span.hi;
  }
}
//@ chunk-2avr6cej.js:218056-218184 fingerprint (2.1.88 match: moveFocus, 0.89)
/**
 * 键盘移动选区焦点（Shift+方向键），取消锚定范围。
 */
function moveFocus(s, col, row) {
  if (!s.focus) return;
  s.anchorSpan = null;
  s.focus = {
    col,
    row,
  };
  s.virtualFocusRow = undefined;
  s.virtualFocusCol = undefined;
}
//@ chunk-2avr6cej.js:218184-219966 fingerprint (2.1.88 match: shiftSelection, 0.924)
/**
 * 内容滚动 dRow 行时平移选区：超出 [minRow,maxRow] 的端点钳到边界并记下虚拟行/列（滚回来能复原），同步裁剪/交换滚出上方/下方的文本缓存。
 */
function shiftSelection(s, dRow, minRow, maxRow, width) {
  if (!s.anchor || !s.focus) return;
  let anchorRow = (s.virtualAnchorRow ?? s.anchor.row) + dRow;
  let focusRow = (s.virtualFocusRow ?? s.focus.row) + dRow;
  let oldMin = Math.min(s.virtualAnchorRow ?? s.anchor.row, s.virtualFocusRow ?? s.focus.row);
  let oldMax = Math.max(s.virtualAnchorRow ?? s.anchor.row, s.virtualFocusRow ?? s.focus.row);
  let selHeight = oldMax - oldMin + 1;
  let aboveBefore = Math.min(selHeight, Math.max(0, minRow - oldMin));
  let belowBefore = Math.min(selHeight, Math.max(0, oldMax - maxRow));
  let aboveAfter = Math.min(selHeight, Math.max(0, minRow - Math.min(anchorRow, focusRow)));
  let belowAfter = Math.min(selHeight, Math.max(0, Math.max(anchorRow, focusRow) - maxRow));
  if (belowBefore === selHeight && aboveAfter === selHeight) {
    s.scrolledOffAbove = s.scrolledOffBelow;
    s.scrolledOffAboveSW = s.scrolledOffBelowSW;
    s.scrolledOffBelow = [];
    s.scrolledOffBelowSW = [];
  } else if (aboveBefore === selHeight && belowAfter === selHeight) {
    s.scrolledOffBelow = s.scrolledOffAbove;
    s.scrolledOffBelowSW = s.scrolledOffAboveSW;
    s.scrolledOffAbove = [];
    s.scrolledOffAboveSW = [];
  }
  if (aboveAfter < aboveBefore) {
    let drop = Math.min(aboveBefore - aboveAfter, s.scrolledOffAbove.length);
    s.scrolledOffAbove.length -= drop;
    s.scrolledOffAboveSW.length = s.scrolledOffAbove.length;
  }
  if (belowAfter < belowBefore) {
    let drop = belowBefore - belowAfter;
    s.scrolledOffBelow.splice(0, drop);
    s.scrolledOffBelowSW.splice(0, drop);
  }
  if (s.scrolledOffAbove.length > aboveAfter) {
    s.scrolledOffAbove = aboveAfter > 0 ? s.scrolledOffAbove.slice(-aboveAfter) : [];
    s.scrolledOffAboveSW = aboveAfter > 0 ? s.scrolledOffAboveSW.slice(-aboveAfter) : [];
  }
  if (s.scrolledOffBelow.length > belowAfter) {
    s.scrolledOffBelow = s.scrolledOffBelow.slice(0, belowAfter);
    s.scrolledOffBelowSW = s.scrolledOffBelowSW.slice(0, belowAfter);
  }
  let colRange = selectionColRange(s, width);
  let shift = (row, vRow) => {
    if (row < minRow)
      return {
        col: colRange.lo,
        row: minRow,
      };
    if (row > maxRow)
      return {
        col: colRange.hi,
        row: maxRow,
      };
    return {
      col: vRow,
      row,
    };
  };
  let anchorCol = s.virtualAnchorCol ?? s.anchor.col;
  let focusCol = s.virtualFocusCol ?? s.focus.col;
  s.anchor = shift(anchorRow, anchorCol);
  s.focus = shift(focusRow, focusCol);
  let anchorOffscreen = anchorRow < minRow || anchorRow > maxRow;
  let focusOffscreen = focusRow < minRow || focusRow > maxRow;
  s.virtualAnchorRow = anchorOffscreen ? anchorRow : undefined;
  s.virtualAnchorCol = anchorOffscreen ? anchorCol : undefined;
  s.virtualFocusRow = focusOffscreen ? focusRow : undefined;
  s.virtualFocusCol = focusOffscreen ? focusCol : undefined;
  if (s.anchorSpan) {
    let sp = (point) => {
      let clampedRow = point.row + dRow;
      if (clampedRow < minRow)
        return {
          col: colRange.lo,
          row: minRow,
        };
      if (clampedRow > maxRow)
        return {
          col: colRange.hi,
          row: maxRow,
        };
      return {
        col: point.col,
        row: clampedRow,
      };
    };
    s.anchorSpan = {
      lo: sp(s.anchorSpan.lo),
      hi: sp(s.anchorSpan.hi),
      kind: s.anchorSpan.kind,
    };
  }
}
//@ chunk-2avr6cej.js:219966-220347 fingerprint (2.1.88 match: shiftAnchor, 0.922)
/**
 * 拖动中内容滚动时只平移锚点（焦点跟着鼠标），超出范围记虚拟坐标。
 */
function shiftAnchor(s, dRow, minRow, maxRow) {
  if (!s.anchor) return;
  let raw = (s.virtualAnchorRow ?? s.anchor.row) + dRow;
  let offscreen = raw < minRow || raw > maxRow;
  let col = s.virtualAnchorCol ?? s.anchor.col;
  s.anchor = {
    col: offscreen ? s.anchor.col : col,
    row: clamp(raw, minRow, maxRow),
  };
  s.virtualAnchorRow = offscreen ? raw : undefined;
  s.virtualAnchorCol = offscreen ? col : undefined;
  if (s.anchorSpan) {
    let shift = (point) => ({
      col: point.col,
      row: clamp(point.row + dRow, minRow, maxRow),
    });
    s.anchorSpan = {
      lo: shift(s.anchorSpan.lo),
      hi: shift(s.anchorSpan.hi),
      kind: s.anchorSpan.kind,
    };
  }
}
//@ chunk-2avr6cej.js:220347-220401 fingerprint (2.1.88 match: hasSelection, 1)
/**
 * 是否有完整选区（锚点和焦点都在）。
 */
function hasSelection(s) {
  return s.anchor !== null && s.focus !== null;
}
//@ chunk-2avr6cej.js:220401-220640 fingerprint (2.1.88 match: shiftSelectionForFollow, 0.7)
/**
 * 选区两端都因滚动被钳到同一侧（虚拟行都在视口上方或都在下方），即整段选区已不在屏幕上。
 */
function isSelectionFullyOffscreen(selection) {
  if (
    !selection.anchor ||
    !selection.focus ||
    selection.virtualAnchorRow === undefined ||
    selection.virtualFocusRow === undefined
  )
    return false;
  return (
    (selection.virtualAnchorRow < selection.anchor.row && selection.virtualFocusRow < selection.focus.row) ||
    (selection.virtualAnchorRow > selection.anchor.row && selection.virtualFocusRow > selection.focus.row)
  );
}
//@ chunk-2avr6cej.js:220640-220780 layout (2.1.88 match: hasSelection, 1)
/**
 * 返回按位置排序的 {start, end}，没有选区返回 null。
 */
function selectionBounds(s) {
  if (!s.anchor || !s.focus) return null;
  return comparePoints(s.anchor, s.focus) <= 0
    ? {
        start: s.anchor,
        end: s.focus,
      }
    : {
        start: s.focus,
        end: s.anchor,
      };
}
//@ chunk-2avr6cej.js:220780-220852 layout
function isSoftWrapInRange(packed, colRange) {
  if (!(packed > 0)) return false;
  let startCol = softWrapStartCol(packed);
  return startCol >= colRange.lo && startCol <= colRange.hi;
}
//@ chunk-2avr6cej.js:220852-221270 fingerprint (2.1.88 match: extractRowText, 1)
/**
 * 取一行里 [startCol,endCol] 的选中文本：跳过 noSelect 与宽字符占位格；软换行续接行从续接起点取，折行吞掉的分隔空格补回；不是软换行时去掉行尾空白。
 */
function extractRowText(screen, row, startCol, endCol, isContinuation, colRange) {
  let noSelect = screen.noSelect;
  let rowOff = row * screen.width;
  let softWrap = isSoftWrapInRange(screen.softWrap[row], colRange) ? screen.softWrap[row] : 0;
  let contentEnd =
    (row + 1 < screen.height && isSoftWrapInRange(screen.softWrap[row + 1], colRange)
      ? screen.softWrap[row + 1]
      : 0) >>> 16;
  let lastCol = contentEnd > 0 ? Math.min(endCol, contentEnd - 1) : endCol;
  let wrapStart = softWrap !== 0 ? softWrapStartCol(softWrap) : 0;
  let firstCol = softWrap !== 0 ? Math.max(startCol, wrapStart) : startCol;
  let line =
    isContinuation &&
    softWrap !== 0 &&
    (softWrap & SW_ELIDED_SEP) !== 0 &&
    startCol <= wrapStart &&
    endCol >= wrapStart
      ? " "
      : "";
  for (let col = firstCol; col <= lastCol; col++) {
    if (noSelect[rowOff + col] === 1) continue;
    let cell = cellAt(screen, col, row);
    if (!cell) continue;
    if (cell.width === 2 || cell.width === 3) continue;
    line += cell.char;
  }
  return contentEnd > 0 ? line : line.replace(/\s+$/, "");
}
//@ chunk-2avr6cej.js:221270-221338 file-local
/**
 * 拼接选中文本行：软换行续接行接在上一行后面，否则另起一行。
 */
function joinRows(lines, text, sw) {
  if (sw && lines.length > 0) lines[lines.length - 1] += text;
  else lines.push(text);
}
//@ chunk-2avr6cej.js:221338-221818 fingerprint (2.1.88 match: getSelectedText, 0.879)
/**
 * 得到选中文本：滚出上方的缓存行 + 屏幕上的行 + 滚出下方的缓存行，按软换行合并。
 */
function getSelectedText(s, screen) {
  let selection = selectionBounds(s);
  if (!selection) return "";
  let { start, end } = selection;
  let sw = screen.softWrap;
  let lines = [];
  for (let i = 0; i < s.scrolledOffAbove.length; i++)
    joinRows(lines, s.scrolledOffAbove[i], s.scrolledOffAboveSW[i]);
  if (!isSelectionFullyOffscreen(s)) {
    let colRange = selectionColRange(s, screen.width);
    for (let row = start.row; row <= end.row; row++) {
      let rowStart = row === start.row ? Math.max(start.col, colRange.lo) : colRange.lo;
      let rowEnd = row === end.row ? Math.min(end.col, colRange.hi) : colRange.hi;
      joinRows(
        lines,
        extractRowText(screen, row, rowStart, rowEnd, lines.length > 0, colRange),
        isSoftWrapInRange(sw[row], colRange),
      );
    }
  }
  for (let i = 0; i < s.scrolledOffBelow.length; i++)
    joinRows(lines, s.scrolledOffBelow[i], s.scrolledOffBelowSW[i]);
  return lines.join(`
`);
}
//@ chunk-2avr6cej.js:221818-222832 fingerprint (2.1.88 match: captureScrolledRows, 0.961)
/**
 * 内容滚动前把即将滚出视口的已选行文本存进 scrolledOffAbove/Below（复制时还能拿到），并把锚点移到边界。
 */
function captureScrolledRows(s, screen, firstRow, lastRow, side) {
  let bounds = selectionBounds(s);
  if (!bounds || firstRow > lastRow || isSelectionFullyOffscreen(s)) return;
  let { start, end } = bounds;
  let lo = Math.max(firstRow, start.row);
  let hi = Math.min(lastRow, end.row);
  if (lo > hi) return;
  let { width, softWrap } = screen;
  let rowTexts = [];
  let rowWraps = [];
  let colRange = selectionColRange(s, width);
  for (let row = lo; row <= hi; row++) {
    let colStart = row === start.row ? Math.max(start.col, colRange.lo) : colRange.lo;
    let colEnd = row === end.row ? Math.min(end.col, colRange.hi) : colRange.hi;
    let isContinuation = row > start.row || s.scrolledOffAbove.length > 0;
    rowTexts.push(extractRowText(screen, row, colStart, colEnd, isContinuation, colRange));
    rowWraps.push(isSoftWrapInRange(softWrap[row], colRange));
  }
  if (side === "above") {
    s.scrolledOffAbove.push(...rowTexts);
    s.scrolledOffAboveSW.push(...rowWraps);
    if (s.anchor && s.anchor.row === start.row && lo === start.row) {
      s.virtualAnchorCol ??= s.anchor.col;
      s.anchor = {
        col: colRange.lo,
        row: s.anchor.row,
      };
      if (s.anchorSpan)
        s.anchorSpan = {
          kind: s.anchorSpan.kind,
          lo: {
            col: colRange.lo,
            row: s.anchorSpan.lo.row,
          },
          hi: {
            col: colRange.hi,
            row: s.anchorSpan.hi.row,
          },
        };
    }
  } else {
    s.scrolledOffBelow.unshift(...rowTexts);
    s.scrolledOffBelowSW.unshift(...rowWraps);
    if (s.anchor && s.anchor.row === end.row && hi === end.row) {
      s.virtualAnchorCol ??= s.anchor.col;
      s.anchor = {
        col: colRange.hi,
        row: s.anchor.row,
      };
      if (s.anchorSpan)
        s.anchorSpan = {
          kind: s.anchorSpan.kind,
          lo: {
            col: colRange.lo,
            row: s.anchorSpan.lo.row,
          },
          hi: {
            col: colRange.hi,
            row: s.anchorSpan.hi.row,
          },
        };
    }
  }
}
//@ chunk-2avr6cej.js:222832-223180 fingerprint (2.1.88 match: applySelectionOverlay, 0.85)
/**
 * 把选区画到屏幕上：选区内每格换成 withSelectionBg 派生样式（noSelect 格跳过）。
 */
function applySelectionOverlay(screen, selection, stylePool) {
  let bounds = selectionBounds(selection);
  if (!bounds || isSelectionFullyOffscreen(selection)) return;
  let { start, end } = bounds;
  let { width, noSelect } = screen;
  let colRange = selectionColRange(selection, width);
  for (let row = start.row; row <= end.row && row < screen.height; row++) {
    let colStart = row === start.row ? Math.max(start.col, colRange.lo) : colRange.lo;
    let colEnd = row === end.row ? Math.min(end.col, width - 1, colRange.hi) : colRange.hi;
    let rowOff = row * width;
    for (let col = colStart; col <= colEnd; col++) {
      let idx = rowOff + col;
      if (noSelect[idx] === 1) continue;
      let cell = cellAtIndex(screen, idx);
      setCellStyleId(screen, col, row, stylePool.withSelectionBg(cell.styleId));
    }
  }
}
export {
  isSelectionFullyOffscreen,
  finishSelection,
  hasSelection,
  clearSelection,
  createSelectionState,
  captureScrolledRows,
  shiftAnchor,
  shiftSelection,
  applySelectionOverlay,
  getSelectedText,
  moveFocus,
  findPlainTextUrl,
  startSelection,
  selectWordAt,
  selectLineAt,
  extendSelection,
  updateSelection,
  selectionBounds,
};
