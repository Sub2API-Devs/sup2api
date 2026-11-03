/**
 * ink/_new/_new/scanImagePlaceholders.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bzr73sfg.js (5)
 * attribution: sole-consumer-new 5
 */
import { decodeImagePlaceholder } from "../../termio/iterm2Image.js";

//@ chunk-bzr73sfg.js:268093-268112 sole-consumer-new
var placeholderDecodeCache = new WeakMap();
//@ chunk-bzr73sfg.js:268112-268251 sole-consumer-new
function decodePlaceholderCached(charPool, charIndex) {
  let f = placeholderDecodeCache.get(charPool);
  if (f === void 0) ((f = new Map()), placeholderDecodeCache.set(charPool, f));
  let m = f.get(charIndex);
  if (m === void 0) ((m = decodeImagePlaceholder(charPool.get(charIndex)) ?? null), f.set(charIndex, m));
  return m;
}
/**
 * 扫描屏幕里的图片占位格，按图片 id 汇总：左上角原点、格数、最大行列、所有格下标、各格是否与同一原点一致（被裁剪/错位时不一致）。
 */
//@ chunk-bzr73sfg.js:268251-268759 sole-consumer-new
function scanImagePlaceholders(screen) {
  let images = new Map(),
    { cells: cells, width: width, charPool: charPool } = screen,
    g = width * screen.height;
  for (let E = 0; E < g; E++) {
    let T = cells[E << 1];
    if (T < 2) continue;
    let A = decodePlaceholderCached(charPool, T);
    if (A === null) continue;
    let D = (E % width) - A.column,
      O = Math.floor(E / width) - A.row,
      _ = images.get(A.id);
    if (_ === void 0) {
      images.set(A.id, {
        originX: D,
        originY: O,
        count: 1,
        isConsistent: !0,
        lastRow: A.row,
        lastColumn: A.column,
        indexes: [E],
      });
      continue;
    }
    (_.count++,
      _.indexes.push(E),
      (_.lastRow = Math.max(_.lastRow, A.row)),
      (_.lastColumn = Math.max(_.lastColumn, A.column)),
      (_.isConsistent &&= _.originX === D && _.originY === O));
  }
  return images;
}
//@ chunk-bzr73sfg.js:268759-268849 sole-consumer-new
function cellChangedAt(prev, next, index) {
  let m = index << 1;
  return prev.cells[m] !== next.cells[m] || prev.cells[m + 1] !== next.cells[m + 1];
}
//@ chunk-bzr73sfg.js:268849-269023 sole-consumer-new = diff (1)
function indexesToRuns(indexes, width) {
  let runs = [];
  for (let m of indexes) {
    let p = m % width,
      floored = Math.floor(m / width),
      at = runs.at(-1);
    if (at !== void 0 && at.y === floored && at.x + at.length === p) at.length++;
    else runs.push({ x: p, y: floored, length: 1 });
  }
  return runs;
}

export { cellChangedAt, scanImagePlaceholders, indexesToRuns };
