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
import { di } from "./terminal.js";
import { Hr } from "./outputReplay.js";
import { Output, serializeScreenRow } from "./output.js";
import { renderNodeToOutputAlias } from "./render-to-screen-reader.js";
import { createRenderState, dropSubtreeCache } from "./render-node-to-output.js";

/**
 * 在屏幕上查找查询串（不区分大小写，跳过宽字符占位与 noSelect 格），返回每个匹配的 {row, col, len}（列为屏幕列）。
 */
//@ chunk-bzr73sfg.js:319573-320032 fingerprint = scanPositions (0.924)
function scanPositions(screen, query) {
  let lq = query.toLowerCase();
  if (!lq) return [];
  let qlen = lq.length,
    { width: width, height: height, noSelect: noSelect } = screen,
    T = [];
  for (let A = 0; A < height; A++) {
    let D = A * width,
      text = "",
      _ = [],
      U = [];
    for (let P = 0; P < width; P++) {
      let z = D + P,
        cell = cellAtIndex(screen, z);
      if (cell.width === 2 || cell.width === 3 || noSelect[z] === 1) continue;
      let lc = cell.char.toLowerCase(),
        cellIdx = _.length;
      for (let q = 0; q < lc.length; q++) U.push(cellIdx);
      ((text += lc), _.push(P));
    }
    let pos = text.indexOf(lq);
    while (pos >= 0) {
      let P = U[pos],
        z = U[pos + qlen - 1],
        G = _[P],
        X = _[z] + 1;
      (T.push({ row: A, col: G, len: X - G }), (pos = text.indexOf(lq, pos + qlen)));
    }
  }
  return T;
}
/**
 * 把第 currentIdx 个匹配（行加 rowOffset）高亮为“当前匹配”样式。
 */
//@ chunk-bzr73sfg.js:320032-320291 fingerprint = applyPositionedHighlight (1)
function applyPositionedHighlight(screen, stylePool, positions, rowOffset, currentIdx) {
  if (currentIdx < 0 || currentIdx >= positions.length) return !1;
  let g = positions[currentIdx],
    E = g.row + rowOffset;
  if (E < 0 || E >= screen.height) return !1;
  let transform = (id) => stylePool.withCurrentMatch(id),
    A = E * screen.width;
  for (let col = g.col; col < g.col + g.len; col++) {
    if (col < 0 || col >= screen.width) continue;
    let cell = cellAtIndex(screen, A + col);
    setCellStyleId(screen, col, E, transform(cell.styleId));
  }
  return !0;
}
/**
 * 把滚动容器里 [fromRow, toRow) 范围的内容离屏渲染成 ANSI 文本行（新建 Screen+Output，从内容节点 renderNodeToOutput，渲染后恢复其 cachedLayout 并标脏），用于把已滚出的对话写入终端回滚区等。
 */
//@ chunk-ag5x7vhf.js:21309-21878 callgraph-fingerprint = renderToScreen (0.22)
function renderToScreen(scrollBox, fromRow, toRow, width, stylePool) {
  let _ = scrollBox.childNodes[0];
  if (!_) return [];
  if ((scrollBox.scrollHeight ?? 0) <= 0 || toRow <= fromRow) return [];
  let D = di().get(process.stdout);
  if (!D) return [];
  let height = Math.ceil(toRow),
    max = Math.max(0, Math.floor(fromRow), height - Hr),
    V = height - max;
  if (V <= 0) return [];
  let screen = createScreen(width, V, stylePool, D.getCharPool(), D.getHyperlinkPool()),
    z = new Output({ width: width, height: V, stylePool: stylePool, screen: screen });
  z.clip({ x1: void 0, x2: void 0, y1: 0, y2: V });
  let cachedLayout = _.cachedLayout;
  if (
    (renderNodeToOutputAlias(_, z, createRenderState(), { offsetX: 0, offsetY: -max, prevScreen: void 0 }),
    z.unclip(),
    dropSubtreeCache(_),
    cachedLayout)
  )
    _.cachedLayout = cachedLayout;
  let rendered = z.get();
  _.dirty = !0;
  let Y = [];
  for (let pe = 0; pe < V; pe++) Y.push(serializeScreenRow(rendered, stylePool, pe));
  return Y;
}

export { renderToScreen, applyPositionedHighlight, scanPositions };
