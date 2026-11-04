/**
 * ink/render-to-screen.ts
 *
 * 把一棵离屏 React 树渲染成 Screen（搜索定位与静态导出用）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/render-to-screen.ts
 * pieces: chunk-ag5x7vhf.js (1), chunk-bzr73sfg.js (2)
 * attribution: callgraph-fingerprint 1, fingerprint 2
 */
import { cellAtIndex, setCellStyleId, createScreen } from "./screen.js";
import { getSecondRootError } from "./terminal.js";
import { MAX_NATIVE_HISTORY_ROWS } from "./outputReplay.js";
import { Output, serializeScreenRow } from "./output.js";
import { renderNodeToOutputAlias } from "./render-to-screen-reader.js";
import { createRenderState, dropSubtreeCache } from "./render-node-to-output.js";

//@ chunk-bzr73sfg.js:319573-320032 fingerprint = scanPositions (0.924)
/**
 * 在屏幕上查找查询串（不区分大小写，跳过宽字符占位与 noSelect 格），返回每个匹配的 {row, col, len}（列为屏幕列）。
 */
function scanPositions(screen, query) {
  let lq = query.toLowerCase();
  if (!lq) return [];
  let qlen = lq.length;
  let { width, height, noSelect } = screen;
  let positions = [];
  for (let row = 0; row < height; row++) {
    let rowOff = row * width;
    let text = "";
    let colOf = [];
    let codeUnitToCell = [];
    for (let col = 0; col < width; col++) {
      let idx = rowOff + col;
      let cell = cellAtIndex(screen, idx);
      if (cell.width === 2 || cell.width === 3 || noSelect[idx] === 1) continue;
      let lc = cell.char.toLowerCase();
      let cellIdx = colOf.length;
      for (let i = 0; i < lc.length; i++) codeUnitToCell.push(cellIdx);
      text += lc;
      colOf.push(col);
    }
    let pos = text.indexOf(lq);
    while (pos >= 0) {
      let startCi = codeUnitToCell[pos];
      let endCi = codeUnitToCell[pos + qlen - 1];
      let col = colOf[startCi];
      let endCol = colOf[endCi] + 1;
      positions.push({
        row,
        col,
        len: endCol - col,
      });
      pos = text.indexOf(lq, pos + qlen);
    }
  }
  return positions;
}
//@ chunk-bzr73sfg.js:320032-320291 fingerprint = applyPositionedHighlight (1)
/**
 * 把第 currentIdx 个匹配（行加 rowOffset）高亮为“当前匹配”样式。
 */
function applyPositionedHighlight(screen, stylePool, positions, rowOffset, currentIdx) {
  if (currentIdx < 0 || currentIdx >= positions.length) return false;
  let position = positions[currentIdx];
  let row = position.row + rowOffset;
  if (row < 0 || row >= screen.height) return false;
  let transform = (id) => stylePool.withCurrentMatch(id);
  let rowOff = row * screen.width;
  for (let col = position.col; col < position.col + position.len; col++) {
    if (col < 0 || col >= screen.width) continue;
    let cell = cellAtIndex(screen, rowOff + col);
    setCellStyleId(screen, col, row, transform(cell.styleId));
  }
  return true;
}
//@ chunk-ag5x7vhf.js:21309-21878 callgraph-fingerprint = renderToScreen (0.22)
/**
 * 把滚动容器里 [fromRow, toRow) 范围的内容离屏渲染成 ANSI 文本行（新建 Screen+Output，从内容节点 renderNodeToOutput，渲染后恢复其 cachedLayout 并标脏），用于把已滚出的对话写入终端回滚区等。
 */
function renderToScreen(scrollBox, fromRow, toRow, width, stylePool) {
  let contentBox = scrollBox.childNodes[0];
  if (!contentBox) return [];
  if ((scrollBox.scrollHeight ?? 0) <= 0 || toRow <= fromRow) return [];
  let inkInstance = getSecondRootError().get(process.stdout);
  if (!inkInstance) return [];
  let height = Math.ceil(toRow);
  let max = Math.max(0, Math.floor(fromRow), height - MAX_NATIVE_HISTORY_ROWS);
  let rowsToRender = height - max;
  if (rowsToRender <= 0) return [];
  let screen = createScreen(
    width,
    rowsToRender,
    stylePool,
    inkInstance.getCharPool(),
    inkInstance.getHyperlinkPool(),
  );
  let output = new Output({
    width,
    height: rowsToRender,
    stylePool,
    screen,
  });
  output.clip({
    x1: undefined,
    x2: undefined,
    y1: 0,
    y2: rowsToRender,
  });
  let cachedLayout = contentBox.cachedLayout;
  renderNodeToOutputAlias(contentBox, output, createRenderState(), {
    offsetX: 0,
    offsetY: -max,
    prevScreen: undefined,
  });
  output.unclip();
  dropSubtreeCache(contentBox);
  if (cachedLayout) contentBox.cachedLayout = cachedLayout;
  let rendered = output.get();
  contentBox.dirty = true;
  let lines = [];
  for (let idx = 0; idx < rowsToRender; idx++) lines.push(serializeScreenRow(rendered, stylePool, idx));
  return lines;
}
export { renderToScreen, applyPositionedHighlight, scanPositions };
