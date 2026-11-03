/**
 * ink/selection.ts
 *
 * 鼠标选区：锚点/焦点、按词/按行扩展、跨滚动保持、选区文字提取（含软换行拼接、URL 识别）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/selection.ts
 * pieces: chunk-bzr73sfg.js (33)
 * attribution: fingerprint 21, layout 9, file-local 2, callgraph-fingerprint 1
 */
import { clamp, cellAt, softWrapStartCol, SW_ELIDED_SEP, cellAtIndex, setCellStyleId } from "./screen.js";

/**
 * 新建选区状态：锚点/焦点、是否拖动中、双击/三击时的锚定范围、滚出视口上方/下方的已选文本行（及各行是否软换行）、上次按下是否带 Alt。
 */
//@ chunk-bzr73sfg.js:213752-213930 fingerprint = createSelectionState (1)
function createSelectionState() {
  return {
    anchor: null,
    focus: null,
    isDragging: !1,
    anchorSpan: null,
    scrolledOffAbove: [],
    scrolledOffBelow: [],
    scrolledOffAboveSW: [],
    scrolledOffBelowSW: [],
    lastPressHadAlt: !1,
  };
}
/**
 * 鼠标按下开始选区：记录锚点（限制在 scope 列范围内，例如只选某个面板）、清掉焦点与滚出缓存、进入拖动。
 */
//@ chunk-bzr73sfg.js:213930-214252 fingerprint = startSelection (0.922)
function startSelection(s, col, row, scope) {
  ((s.scope = scope),
    (s.anchor = { col: clampColToScope(s, col), row: row }),
    (s.focus = null),
    (s.isDragging = !0),
    (s.anchorSpan = null),
    (s.scrolledOffAbove = []),
    (s.scrolledOffBelow = []),
    (s.scrolledOffAboveSW = []),
    (s.scrolledOffBelowSW = []),
    (s.virtualAnchorRow = void 0),
    (s.virtualFocusRow = void 0),
    (s.virtualAnchorCol = void 0),
    (s.virtualFocusCol = void 0),
    (s.lastPressHadAlt = !1));
}
/**
 * 拖动中更新焦点（第一次移动且没离开锚点格时不设焦点，避免单击产生空选区）。
 */
//@ chunk-bzr73sfg.js:214252-214396 fingerprint = updateSelection (1)
function updateSelection(s, col, row) {
  if (!s.isDragging) return;
  let m = clampColToScope(s, col);
  if (!s.focus && s.anchor && s.anchor.col === m && s.anchor.row === row) return;
  s.focus = { col: m, row: row };
}
//@ chunk-bzr73sfg.js:214396-214460 layout
function clampColToScope(s, col) {
  return s.scope ? clamp(col, s.scope.x1, s.scope.x2 - 1) : col;
}
/**
 * 选区可用的列范围：有 scope 时为 [scope.x1, min(scope.x2,width)-1]，否则整行。
 */
//@ chunk-bzr73sfg.js:214460-214550 layout
function selectionColRange(s, width) {
  return s.scope ? { lo: s.scope.x1, hi: Math.min(s.scope.x2, width) - 1 } : { lo: 0, hi: width - 1 };
}
/**
 * 鼠标松开：结束拖动（选区保留）。
 */
//@ chunk-bzr73sfg.js:214550-214581 fingerprint = finishSelection (1)
function finishSelection(s) {
  s.isDragging = !1;
}
/**
 * 清除选区及全部虚拟坐标/滚出缓存。
 */
//@ chunk-bzr73sfg.js:214581-214887 fingerprint = clearSelection (0.912)
function clearSelection(s) {
  ((s.anchor = null),
    (s.focus = null),
    (s.isDragging = !1),
    (s.anchorSpan = null),
    (s.scope = void 0),
    (s.scrolledOffAbove = []),
    (s.scrolledOffBelow = []),
    (s.scrolledOffAboveSW = []),
    (s.scrolledOffBelowSW = []),
    (s.virtualAnchorRow = void 0),
    (s.virtualFocusRow = void 0),
    (s.virtualAnchorCol = void 0),
    (s.virtualFocusCol = void 0),
    (s.lastPressHadAlt = !1));
}
//@ chunk-bzr73sfg.js:214887-214919 layout
var WORD_CHAR = /[\p{L}\p{N}_/.\-+~\\]/u;
/**
 * 双击选词用的字符类别：空白 0、单词字符 1、其他标点 2。
 */
//@ chunk-bzr73sfg.js:214919-214994 file-local
function charClass(c) {
  if (c === " " || c === "") return 0;
  if (WORD_CHAR.test(c)) return 1;
  return 2;
}
/**
 * 双击选词的范围：先看是否点在纯文本 URL 上（整条 URL 当一个词），否则按字符类（空白/单词字符/其它）向两侧扩展，跳过宽字符占位、遇 noSelect 停。
 */
//@ chunk-bzr73sfg.js:214994-215622 fingerprint = wordBoundsAt (1)
function wordBoundsAt(screen, col, row) {
  if (row < 0 || row >= screen.height) return null;
  let { width: width, noSelect: noSelect } = screen,
    g = row * width,
    E = col;
  if (E > 0) {
    let cell = cellAt(screen, E, row);
    if (cell && cell.width === 2) E -= 1;
  }
  if (E < 0 || E >= width || noSelect[g + E] === 1) return null;
  let startCell = cellAt(screen, E, row);
  if (!startCell) return null;
  let A = findPlainTextUrlAt(screen, E, row);
  if (A) return { lo: A.lo, hi: A.hi };
  let cls = charClass(startCell.char),
    O = E;
  while (O > 0) {
    let U = O - 1;
    if (noSelect[g + U] === 1) break;
    let pc = cellAt(screen, U, row);
    if (!pc) break;
    if (pc.width === 2) {
      if (U === 0 || noSelect[g + U - 1] === 1) break;
      let head = cellAt(screen, U - 1, row);
      if (!head || charClass(head.char) !== cls) break;
      O = U - 1;
      continue;
    }
    if (charClass(pc.char) !== cls) break;
    O = U;
  }
  let _ = E;
  while (_ < width - 1) {
    let U = _ + 1;
    if (noSelect[g + U] === 1) break;
    let nc = cellAt(screen, U, row);
    if (!nc) break;
    if (nc.width === 2) {
      _ = U;
      continue;
    }
    if (charClass(nc.char) !== cls) break;
    _ = U;
  }
  return { lo: O, hi: _ };
}
/**
 * 比较两个 {row, col} 点的先后（先行后列）。
 */
//@ chunk-bzr73sfg.js:215622-215730 fingerprint = comparePoints (1)
function comparePoints(a, b) {
  if (a.row !== b.row) return a.row < b.row ? -1 : 1;
  if (a.col !== b.col) return a.col < b.col ? -1 : 1;
  return 0;
}
/**
 * 双击：选中该词并设锚定范围 kind=word（后续拖动按词扩展）。
 */
//@ chunk-bzr73sfg.js:215730-215908 fingerprint = selectWordAt (1)
function selectWordAt(s, screen, col, row) {
  let p = wordBoundsAt(screen, col, row);
  if (!p) return;
  let lo = { col: clampColToScope(s, p.lo), row: row },
    hi = { col: clampColToScope(s, p.hi), row: row };
  ((s.anchor = lo), (s.focus = hi), (s.isDragging = !0), (s.anchorSpan = { lo: lo, hi: hi, kind: "word" }));
}
//@ chunk-bzr73sfg.js:215908-215939 fingerprint = URL_BOUNDARY (1)
var URL_BOUNDARY = new Set([..."<>\"'` "]);
/**
 * 可出现在纯文本 URL 中的字符（可打印 ASCII，不含 <>"'` 与空格）。
 */
//@ chunk-bzr73sfg.js:215939-216034 callgraph-fingerprint = isUrlChar (1)
function isUrlChar(c) {
  if (c.length !== 1) return !1;
  let code = c.charCodeAt(0);
  return code >= 33 && code <= 126 && !URL_BOUNDARY.has(c);
}
//@ chunk-bzr73sfg.js:216034-216158 layout
function urlCharAt(screen, col, row) {
  if (screen.noSelect[row * screen.width + col] === 1) return null;
  let m = cellAt(screen, col, row);
  return m && m.width === 0 && isUrlChar(m.char) ? m.char : null;
}
/**
 * 从 col 起在一行内向两侧扩展连续的 URL 字符，返回 {lo, hi, text}。
 */
//@ chunk-bzr73sfg.js:216158-216413 layout
function scanUrlRun(screen, row, col, minCol, maxCol) {
  if (col < minCol || col > maxCol) return null;
  let g = urlCharAt(screen, col, row);
  if (g === null) return null;
  let lo = col,
    before = "";
  while (lo > minCol) {
    let O = urlCharAt(screen, lo - 1, row);
    if (O === null) break;
    ((before = O + before), lo--);
  }
  let hi = col,
    after = "";
  while (hi < maxCol) {
    let O = urlCharAt(screen, hi + 1, row);
    if (O === null) break;
    ((after += O), hi++);
  }
  return { lo: lo, hi: hi, text: before + g + after };
}
/**
 * 一行里属于软换行续接段的列范围：起点取本行软换行标记的起始列，终点取下一行标记记录的上一行结束列。
 */
//@ chunk-bzr73sfg.js:216413-216536 layout
function softWrapSpanOfRow(screen, row) {
  let thisWrap = screen.softWrap[row],
    nextWrap = row + 1 < screen.height ? screen.softWrap[row + 1] : 0;
  return {
    start: thisWrap !== 0 ? softWrapStartCol(thisWrap) : 0,
    end: nextWrap !== 0 ? nextWrap >>> 16 : screen.width,
  };
}
//@ chunk-bzr73sfg.js:216536-216577 layout
function findPlainTextUrl(screen, col, row) {
  return findPlainTextUrlAt(screen, col, row)?.url;
}
/**
 * 找 (col,row) 处的纯文本 URL（http/https/file）：沿软换行把折到多行的 URL 拼回来；以 … 截断的不算；去掉末尾标点和不配对的右括号；返回 {url, lo, hi}（本行内的列范围）。
 */
//@ chunk-bzr73sfg.js:216577-217905 fingerprint = findPlainTextUrlAt (0.805)
function findPlainTextUrlAt(screen, col, row) {
  if (row < 0 || row >= screen.height) return;
  let width = screen.width,
    p = col;
  if (p > 0) {
    let cell = cellAt(screen, p, row);
    if (cell && cell.width === 2) p -= 1;
  }
  if (p < 0 || p >= width) return;
  let softWrap = screen.softWrap,
    span = softWrapSpanOfRow(screen, row),
    T,
    A,
    D = p >= span.start && p < span.end;
  if (D) ((T = span.start), (A = span.end - 1));
  else if (p >= span.end) ((T = span.end), (A = width - 1));
  else ((T = 0), (A = span.start - 1));
  let run = scanUrlRun(screen, row, p, T, A);
  if (!run) return;
  let text = run.text,
    offsetInText = p - run.lo,
    lastRow = row,
    hi = run.hi,
    firstRow = row,
    lo = run.lo;
  if (D) {
    while (lastRow + 1 < screen.height) {
      let ne = softWrap[lastRow + 1];
      if (ne === 0 || hi + 1 !== ne >>> 16 || (ne & SW_ELIDED_SEP) !== 0) break;
      let de = softWrapSpanOfRow(screen, lastRow + 1),
        se = scanUrlRun(screen, lastRow + 1, de.start, de.start, de.end - 1);
      if (!se) break;
      ((text += se.text), lastRow++, (hi = se.hi));
    }
    while (firstRow > 0) {
      let ne = softWrap[firstRow],
        de = ne >>> 16;
      if (ne === 0 || lo !== softWrapStartCol(ne) || de === 0 || (ne & SW_ELIDED_SEP) !== 0) break;
      let se = softWrapSpanOfRow(screen, firstRow - 1),
        ye = scanUrlRun(screen, firstRow - 1, de - 1, se.start, de - 1);
      if (!ye) break;
      ((text = ye.text + text), (offsetInText += ye.text.length), firstRow--, (lo = ye.lo));
    }
  }
  let schemeRe = /(?:https?|file):\/\//g,
    urlStart = -1,
    urlEnd = text.length;
  for (let ne; (ne = schemeRe.exec(text));) {
    if (ne.index > offsetInText) {
      urlEnd = ne.index;
      break;
    }
    urlStart = ne.index;
  }
  if (urlStart < 0) return;
  if (urlEnd === text.length && hi + 1 < width) {
    if (cellAt(screen, hi + 1, lastRow)?.char === "\u2026") return;
  }
  let url = text.slice(urlStart, urlEnd),
    OPENER = { ")": "(", "]": "[", "}": "{" };
  while (url.length > 0) {
    let last = url.at(-1);
    if (".,;:!?".includes(last)) {
      url = url.slice(0, -1);
      continue;
    }
    let de = OPENER[last];
    if (!de) break;
    let se = 0,
      ye = 0;
    for (let ue = 0; ue < url.length; ue++) {
      let ch = url.charAt(ue);
      if (ch === de) se++;
      else if (ch === last) ye++;
    }
    if (ye > se) url = url.slice(0, -1);
    else break;
  }
  if (offsetInText >= urlStart + url.length) return;
  let V = offsetInText - (p - run.lo),
    ee = run.lo + Math.max(0, urlStart - V),
    ae = run.lo + Math.min(run.hi - run.lo, urlStart + url.length - 1 - V);
  return { url: url, lo: ee, hi: ae };
}
/**
 * 三击：选中整行（受 scope 限制），锚定范围 kind=line。
 */
//@ chunk-bzr73sfg.js:217905-218083 fingerprint = selectLineAt (1)
function selectLineAt(s, screen, row) {
  if (row < 0 || row >= screen.height) return;
  let m = selectionColRange(s, screen.width),
    lo = { col: m.lo, row: row },
    hi = { col: m.hi, row: row };
  ((s.anchor = lo), (s.focus = hi), (s.isDragging = !0), (s.anchorSpan = { lo: lo, hi: hi, kind: "line" }));
}
/**
 * 双击/三击后拖动：按词或按行扩展选区，锚点保持在原锚定范围的另一端。
 */
//@ chunk-bzr73sfg.js:218083-218461 fingerprint = extendSelection (1)
function extendSelection(s, screen, col, row) {
  if (!s.isDragging || !s.anchorSpan) return;
  let span = s.anchorSpan,
    g,
    E;
  if (span.kind === "word") {
    let T = wordBoundsAt(screen, col, row);
    ((g = { col: clampColToScope(s, T ? T.lo : col), row: row }),
      (E = { col: clampColToScope(s, T ? T.hi : col), row: row }));
  } else {
    let T = clamp(row, 0, screen.height - 1),
      A = selectionColRange(s, screen.width);
    ((g = { col: A.lo, row: T }), (E = { col: A.hi, row: T }));
  }
  if (comparePoints(E, span.lo) < 0) ((s.anchor = span.hi), (s.focus = g));
  else if (comparePoints(g, span.hi) > 0) ((s.anchor = span.lo), (s.focus = E));
  else ((s.anchor = span.lo), (s.focus = span.hi));
}
/**
 * 键盘移动选区焦点（Shift+方向键），取消锚定范围。
 */
//@ chunk-bzr73sfg.js:218461-218589 fingerprint = moveFocus (0.89)
function moveFocus(s, col, row) {
  if (!s.focus) return;
  ((s.anchorSpan = null),
    (s.focus = { col: col, row: row }),
    (s.virtualFocusRow = void 0),
    (s.virtualFocusCol = void 0));
}
/**
 * 内容滚动 dRow 行时平移选区：超出 [minRow,maxRow] 的端点钳到边界并记下虚拟行/列（滚回来能复原），同步裁剪/交换滚出上方/下方的文本缓存。
 */
//@ chunk-bzr73sfg.js:218589-220371 fingerprint = shiftSelection (0.924)
function shiftSelection(s, dRow, minRow, maxRow, width) {
  if (!s.anchor || !s.focus) return;
  let anchorRow = (s.virtualAnchorRow ?? s.anchor.row) + dRow,
    focusRow = (s.virtualFocusRow ?? s.focus.row) + dRow,
    oldMin = Math.min(s.virtualAnchorRow ?? s.anchor.row, s.virtualFocusRow ?? s.focus.row),
    oldMax = Math.max(s.virtualAnchorRow ?? s.anchor.row, s.virtualFocusRow ?? s.focus.row),
    selHeight = oldMax - oldMin + 1,
    aboveBefore = Math.min(selHeight, Math.max(0, minRow - oldMin)),
    belowBefore = Math.min(selHeight, Math.max(0, oldMax - maxRow)),
    aboveAfter = Math.min(selHeight, Math.max(0, minRow - Math.min(anchorRow, focusRow))),
    belowAfter = Math.min(selHeight, Math.max(0, Math.max(anchorRow, focusRow) - maxRow));
  if (belowBefore === selHeight && aboveAfter === selHeight)
    ((s.scrolledOffAbove = s.scrolledOffBelow),
      (s.scrolledOffAboveSW = s.scrolledOffBelowSW),
      (s.scrolledOffBelow = []),
      (s.scrolledOffBelowSW = []));
  else if (aboveBefore === selHeight && belowAfter === selHeight)
    ((s.scrolledOffBelow = s.scrolledOffAbove),
      (s.scrolledOffBelowSW = s.scrolledOffAboveSW),
      (s.scrolledOffAbove = []),
      (s.scrolledOffAboveSW = []));
  if (aboveAfter < aboveBefore) {
    let min = Math.min(aboveBefore - aboveAfter, s.scrolledOffAbove.length);
    ((s.scrolledOffAbove.length -= min), (s.scrolledOffAboveSW.length = s.scrolledOffAbove.length));
  }
  if (belowAfter < belowBefore) {
    let Y = belowBefore - belowAfter;
    (s.scrolledOffBelow.splice(0, Y), s.scrolledOffBelowSW.splice(0, Y));
  }
  if (s.scrolledOffAbove.length > aboveAfter)
    ((s.scrolledOffAbove = aboveAfter > 0 ? s.scrolledOffAbove.slice(-aboveAfter) : []),
      (s.scrolledOffAboveSW = aboveAfter > 0 ? s.scrolledOffAboveSW.slice(-aboveAfter) : []));
  if (s.scrolledOffBelow.length > belowAfter)
    ((s.scrolledOffBelow = s.scrolledOffBelow.slice(0, belowAfter)),
      (s.scrolledOffBelowSW = s.scrolledOffBelowSW.slice(0, belowAfter)));
  let colRange = selectionColRange(s, width),
    shift = (Y, vRow) => {
      if (Y < minRow) return { col: colRange.lo, row: minRow };
      if (Y > maxRow) return { col: colRange.hi, row: maxRow };
      return { col: vRow, row: Y };
    },
    anchorCol = s.virtualAnchorCol ?? s.anchor.col,
    focusCol = s.virtualFocusCol ?? s.focus.col;
  ((s.anchor = shift(anchorRow, anchorCol)), (s.focus = shift(focusRow, focusCol)));
  let K = anchorRow < minRow || anchorRow > maxRow,
    q = focusRow < minRow || focusRow > maxRow;
  if (
    ((s.virtualAnchorRow = K ? anchorRow : void 0),
    (s.virtualAnchorCol = K ? anchorCol : void 0),
    (s.virtualFocusRow = q ? focusRow : void 0),
    (s.virtualFocusCol = q ? focusCol : void 0),
    s.anchorSpan)
  ) {
    let sp = (J) => {
      let V = J.row + dRow;
      if (V < minRow) return { col: colRange.lo, row: minRow };
      if (V > maxRow) return { col: colRange.hi, row: maxRow };
      return { col: J.col, row: V };
    };
    s.anchorSpan = { lo: sp(s.anchorSpan.lo), hi: sp(s.anchorSpan.hi), kind: s.anchorSpan.kind };
  }
}
/**
 * 拖动中内容滚动时只平移锚点（焦点跟着鼠标），超出范围记虚拟坐标。
 */
//@ chunk-bzr73sfg.js:220371-220752 fingerprint = shiftAnchor (0.922)
function shiftAnchor(s, dRow, minRow, maxRow) {
  if (!s.anchor) return;
  let raw = (s.virtualAnchorRow ?? s.anchor.row) + dRow,
    g = raw < minRow || raw > maxRow,
    E = s.virtualAnchorCol ?? s.anchor.col;
  if (
    ((s.anchor = { col: g ? s.anchor.col : E, row: clamp(raw, minRow, maxRow) }),
    (s.virtualAnchorRow = g ? raw : void 0),
    (s.virtualAnchorCol = g ? E : void 0),
    s.anchorSpan)
  ) {
    let shift = (A) => ({ col: A.col, row: clamp(A.row + dRow, minRow, maxRow) });
    s.anchorSpan = { lo: shift(s.anchorSpan.lo), hi: shift(s.anchorSpan.hi), kind: s.anchorSpan.kind };
  }
}
/**
 * 是否有完整选区（锚点和焦点都在）。
 */
//@ chunk-bzr73sfg.js:220752-220806 fingerprint = hasSelection (1)
function hasSelection(s) {
  return s.anchor !== null && s.focus !== null;
}
/**
 * 选区两端都因滚动被钳到同一侧（虚拟行都在视口上方或都在下方），即整段选区已不在屏幕上。
 */
//@ chunk-bzr73sfg.js:220806-221045 fingerprint = shiftSelectionForFollow (0.7)
function isSelectionFullyOffscreen(s) {
  if (!s.anchor || !s.focus || s.virtualAnchorRow === void 0 || s.virtualFocusRow === void 0) return !1;
  return (
    (s.virtualAnchorRow < s.anchor.row && s.virtualFocusRow < s.focus.row) ||
    (s.virtualAnchorRow > s.anchor.row && s.virtualFocusRow > s.focus.row)
  );
}
/**
 * 返回按位置排序的 {start, end}，没有选区返回 null。
 */
//@ chunk-bzr73sfg.js:221045-221185 layout = hasSelection (1)
function selectionBounds(s) {
  if (!s.anchor || !s.focus) return null;
  return comparePoints(s.anchor, s.focus) <= 0
    ? { start: s.anchor, end: s.focus }
    : { start: s.focus, end: s.anchor };
}
//@ chunk-bzr73sfg.js:221185-221257 layout
function isSoftWrapInRange(packed, colRange) {
  if (!(packed > 0)) return !1;
  let f = softWrapStartCol(packed);
  return f >= colRange.lo && f <= colRange.hi;
}
/**
 * 取一行里 [startCol,endCol] 的选中文本：跳过 noSelect 与宽字符占位格；软换行续接行从续接起点取，折行吞掉的分隔空格补回；不是软换行时去掉行尾空白。
 */
//@ chunk-bzr73sfg.js:221257-221675 fingerprint = extractRowText (1)
function extractRowText(screen, row, startCol, endCol, isContinuation, colRange) {
  let noSelect = screen.noSelect,
    T = row * screen.width,
    A = isSoftWrapInRange(screen.softWrap[row], colRange) ? screen.softWrap[row] : 0,
    O =
      (row + 1 < screen.height && isSoftWrapInRange(screen.softWrap[row + 1], colRange)
        ? screen.softWrap[row + 1]
        : 0) >>> 16,
    _ = O > 0 ? Math.min(endCol, O - 1) : endCol,
    U = A !== 0 ? softWrapStartCol(A) : 0,
    L = A !== 0 ? Math.max(startCol, U) : startCol,
    P = isContinuation && A !== 0 && (A & SW_ELIDED_SEP) !== 0 && startCol <= U && endCol >= U ? " " : "";
  for (let col = L; col <= _; col++) {
    if (noSelect[T + col] === 1) continue;
    let cell = cellAt(screen, col, row);
    if (!cell) continue;
    if (cell.width === 2 || cell.width === 3) continue;
    P += cell.char;
  }
  return O > 0 ? P : P.replace(/\s+$/, "");
}
/**
 * 拼接选中文本行：软换行续接行接在上一行后面，否则另起一行。
 */
//@ chunk-bzr73sfg.js:221675-221743 file-local
function joinRows(lines, text, sw) {
  if (sw && lines.length > 0) lines[lines.length - 1] += text;
  else lines.push(text);
}
/**
 * 得到选中文本：滚出上方的缓存行 + 屏幕上的行 + 滚出下方的缓存行，按软换行合并。
 */
//@ chunk-bzr73sfg.js:221743-222223 fingerprint = getSelectedText (0.879)
function getSelectedText(s, screen) {
  let f = selectionBounds(s);
  if (!f) return "";
  let { start: start, end: end } = f,
    sw = screen.softWrap,
    lines = [];
  for (let T = 0; T < s.scrolledOffAbove.length; T++)
    joinRows(lines, s.scrolledOffAbove[T], s.scrolledOffAboveSW[T]);
  if (!isSelectionFullyOffscreen(s)) {
    let T = selectionColRange(s, screen.width);
    for (let row = start.row; row <= end.row; row++) {
      let D = row === start.row ? Math.max(start.col, T.lo) : T.lo,
        O = row === end.row ? Math.min(end.col, T.hi) : T.hi;
      joinRows(lines, extractRowText(screen, row, D, O, lines.length > 0, T), isSoftWrapInRange(sw[row], T));
    }
  }
  for (let T = 0; T < s.scrolledOffBelow.length; T++)
    joinRows(lines, s.scrolledOffBelow[T], s.scrolledOffBelowSW[T]);
  return lines.join(`
`);
}
/**
 * 内容滚动前把即将滚出视口的已选行文本存进 scrolledOffAbove/Below（复制时还能拿到），并把锚点移到边界。
 */
//@ chunk-bzr73sfg.js:222223-223237 fingerprint = captureScrolledRows (0.961)
function captureScrolledRows(s, screen, firstRow, lastRow, side) {
  let g = selectionBounds(s);
  if (!g || firstRow > lastRow || isSelectionFullyOffscreen(s)) return;
  let { start: start, end: end } = g,
    lo = Math.max(firstRow, start.row),
    hi = Math.min(lastRow, end.row);
  if (lo > hi) return;
  let { width: width, softWrap: softWrap } = screen,
    U = [],
    L = [],
    P = selectionColRange(s, width);
  for (let row = lo; row <= hi; row++) {
    let G = row === start.row ? Math.max(start.col, P.lo) : P.lo,
      X = row === end.row ? Math.min(end.col, P.hi) : P.hi,
      K = row > start.row || s.scrolledOffAbove.length > 0;
    (U.push(extractRowText(screen, row, G, X, K, P)), L.push(isSoftWrapInRange(softWrap[row], P)));
  }
  if (side === "above") {
    if (
      (s.scrolledOffAbove.push(...U),
      s.scrolledOffAboveSW.push(...L),
      s.anchor && s.anchor.row === start.row && lo === start.row)
    ) {
      if (
        ((s.virtualAnchorCol ??= s.anchor.col), (s.anchor = { col: P.lo, row: s.anchor.row }), s.anchorSpan)
      )
        s.anchorSpan = {
          kind: s.anchorSpan.kind,
          lo: { col: P.lo, row: s.anchorSpan.lo.row },
          hi: { col: P.hi, row: s.anchorSpan.hi.row },
        };
    }
  } else if (
    (s.scrolledOffBelow.unshift(...U),
    s.scrolledOffBelowSW.unshift(...L),
    s.anchor && s.anchor.row === end.row && hi === end.row)
  ) {
    if (((s.virtualAnchorCol ??= s.anchor.col), (s.anchor = { col: P.hi, row: s.anchor.row }), s.anchorSpan))
      s.anchorSpan = {
        kind: s.anchorSpan.kind,
        lo: { col: P.lo, row: s.anchorSpan.lo.row },
        hi: { col: P.hi, row: s.anchorSpan.hi.row },
      };
  }
}
/**
 * 把选区画到屏幕上：选区内每格换成 withSelectionBg 派生样式（noSelect 格跳过）。
 */
//@ chunk-bzr73sfg.js:223237-223585 fingerprint = applySelectionOverlay (0.85)
function applySelectionOverlay(screen, selection, stylePool) {
  let m = selectionBounds(selection);
  if (!m || isSelectionFullyOffscreen(selection)) return;
  let { start: start, end: end } = m,
    { width: width, noSelect: noSelect } = screen,
    A = selectionColRange(selection, width);
  for (let row = start.row; row <= end.row && row < screen.height; row++) {
    let O = row === start.row ? Math.max(start.col, A.lo) : A.lo,
      _ = row === end.row ? Math.min(end.col, width - 1, A.hi) : A.hi,
      U = row * width;
    for (let col = O; col <= _; col++) {
      let P = U + col;
      if (noSelect[P] === 1) continue;
      let cell = cellAtIndex(screen, P);
      setCellStyleId(screen, col, row, stylePool.withSelectionBg(cell.styleId));
    }
  }
}

export {
  isSelectionFullyOffscreen,
  selectionBounds,
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
};
