/**
 * ink/searchHighlight.ts
 *
 * 在 Screen 上叠加搜索命中高亮
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/searchHighlight.ts
 * pieces: chunk-bzr73sfg.js (1)
 * attribution: fingerprint 1
 */
import { cellAtIndex, setCellStyleId } from "./screen.js";

//@ chunk-bzr73sfg.js:322260-322757 fingerprint = applySearchHighlight (1)
/**
 * 把屏幕上所有匹配查询串的格反显（搜索高亮），返回是否有匹配。
 */
function applySearchHighlight(screen, query, stylePool) {
  if (!query) return false;
  let lq = query.toLowerCase();
  let qlen = lq.length;
  let { width, noSelect, height } = screen;
  let found = false;
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
      found = true;
      let startCi = codeUnitToCell[pos];
      let endCi = codeUnitToCell[pos + qlen - 1];
      for (let ci = startCi; ci <= endCi; ci++) {
        let col = colOf[ci];
        let cell = cellAtIndex(screen, rowOff + col);
        setCellStyleId(screen, col, row, stylePool.withInverse(cell.styleId));
      }
      pos = text.indexOf(lq, pos + qlen);
    }
  }
  return found;
}
export { applySearchHighlight };
