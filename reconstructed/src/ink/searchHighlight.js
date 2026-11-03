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

/**
 * 把屏幕上所有匹配查询串的格反显（搜索高亮），返回是否有匹配。
 */
//@ chunk-bzr73sfg.js:322260-322757 fingerprint = applySearchHighlight (1)
function applySearchHighlight(screen, query, stylePool) {
  if (!query) return !1;
  let lq = query.toLowerCase(),
    qlen = lq.length,
    { width: width, noSelect: noSelect, height: height } = screen,
    A = !1;
  for (let D = 0; D < height; D++) {
    let O = D * width,
      text = "",
      U = [],
      L = [];
    for (let z = 0; z < width; z++) {
      let G = O + z,
        cell = cellAtIndex(screen, G);
      if (cell.width === 2 || cell.width === 3 || noSelect[G] === 1) continue;
      let lc = cell.char.toLowerCase(),
        cellIdx = U.length;
      for (let Y = 0; Y < lc.length; Y++) L.push(cellIdx);
      ((text += lc), U.push(z));
    }
    let pos = text.indexOf(lq);
    while (pos >= 0) {
      A = !0;
      let z = L[pos],
        G = L[pos + qlen - 1];
      for (let ci = z; ci <= G; ci++) {
        let K = U[ci],
          cell = cellAtIndex(screen, O + K);
        setCellStyleId(screen, K, D, stylePool.withInverse(cell.styleId));
      }
      pos = text.indexOf(lq, pos + qlen);
    }
  }
  return A;
}

export { applySearchHighlight };
