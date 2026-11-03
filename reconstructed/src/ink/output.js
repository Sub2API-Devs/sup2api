/**
 * ink/output.ts
 *
 * Output：渲染期操作队列（write/blit/clip/clear/shift/noSelect），落到 Screen 网格；写行时调用原生 CellSegmenter
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/output.ts
 * pieces: chunk-ag5x7vhf.js (1), chunk-bfrv6ttc.js (1), chunk-bzr73sfg.js (13)
 * attribution: fingerprint 3, callgraph-fingerprint 1, sole-consumer 6, affinity 1, layout 2, file-local 2
 */
import {
  createScreenSegmenter,
  packWord1,
  resetScreen,
  SoftWrapKind,
  blitRegion,
  shiftRows,
  packSoftWrap,
  SW_ELIDED_SEP,
  copyNoSelectRegion,
  markNoSelect,
  clearNoSelect,
  paintSegments,
  cellAtIndex,
} from "./screen.js";
import { BIDI_CONTROL_RANGES } from "./render-border.js";
import { levelGeneration } from "./colorize.js";
import { MAX_SEGMENT_CELLS } from "./terminalImages.js";
import { DEFAULT_TAB_WIDTH } from "./wrapAnsi.js";
import { dropItalicIfStandout, downgradeTrueColorCodes } from "./terminalColorSupport.js";
import { needsBidiReorder } from "./bidi.js";
import { unionRect } from "./layout/geometry.js";
import { replaceInvalidUtf16 } from "./layout/node.js";
import { logForDebugging } from "../utils/debug.js";
import { LINK_END, link } from "./termio/osc.js";
import { RESET } from "./outputReplay.js";
import { getGraphemeSegmenter } from "../utils/intl.js";

//@ chunk-bzr73sfg.js:276084-276116 sole-consumer
var RUN_SHIFT = 10;
var WIDTH_BITS = 255;
var TAB_FLAG = 256;
var MAX_SGR_KEYS_BEFORE_RESET = 2048;
//@ chunk-bzr73sfg.js:276116-279287 sole-consumer
/**
 * Output 的行切分器，包装原生 Bun.ant.CellSegmenter：segment(text, reorder) 把带 ANSI 的一行切成字素格（cells：[字素下标, 宽度|制表符位|段号<<10]）与样式/链接段（runs：[sgr 键下标, uri 下标]）；width() 算显示宽度（制表位展开）；keepColumns() 只保留裁剪区内的格；paint() 调原生 paint 把格写进屏幕，字素用 charIndices() 映射到屏幕字符池、样式段用 runWords() 映射成 packWord1（SGR 键 → AnsiCode → StylePool id，链接 → 超链接池）。原生驻留表过大或样式池/chalk 换代时重建。
 */
class LineCellSegmenter {
  stylePool;
  charPool;
  native = createScreenSegmenter(BIDI_CONTROL_RANGES);
  cells = new Int32Array(512);
  runs = new Int32Array(512);
  count = 0;
  reordered = false;
  graphemes = this.native.graphemes;
  sgrKeys = this.native.sgrKeys;
  sgrCloseKeys = this.native.sgrCloseKeys;
  uris = this.native.uris;
  charMap = new Int32Array(256);
  charMapLength = 0;
  styleIds = new Int32Array(64);
  styleGeneration;
  chalkGeneration = levelGeneration();
  linkIds = new Int32Array(16);
  hyperlinkPool;
  words = new Int32Array(64);
  constructor(stylePool, charPool) {
    this.stylePool = stylePool;
    this.charPool = charPool;
    this.styleGeneration = stylePool.generation;
  }
  segment(n, u) {
    if (
      this.sgrKeys.length > MAX_SEGMENT_CELLS ||
      this.uris.length > MAX_SEGMENT_CELLS ||
      this.graphemes.length > 4 * MAX_SEGMENT_CELLS
    )
      this.resetNative();
    this.refreshGenerations();
    let f = this.native.segment(n, this.cells, this.runs, u);
    if (f < 0) {
      let max = Math.max(-f, this.cells.length);
      this.cells = new Int32Array(2 * max);
      this.runs = new Int32Array(2 * max);
      f = this.native.segment(n, this.cells, this.runs, u);
    }
    this.count = f;
    this.reordered = u;
    return f;
  }
  width(n, u, f) {
    let m = this.segment(n, f);
    let p = u;
    for (let idx = 0; idx < m; idx++) {
      let E = this.cells[2 * idx + 1];
      p += (E & TAB_FLAG) !== 0 ? DEFAULT_TAB_WIDTH - (p % DEFAULT_TAB_WIDTH) : E & WIDTH_BITS;
    }
    return p - u;
  }
  keepColumns(n, u, f) {
    let m = n;
    let max = Math.max(n, u);
    let g = 0;
    for (let idx = 0; idx < this.count; idx++) {
      let T = this.cells[2 * idx + 1];
      let A = m + ((T & TAB_FLAG) !== 0 ? DEFAULT_TAB_WIDTH - (m % DEFAULT_TAB_WIDTH) : T & WIDTH_BITS);
      if (m >= u && m < f && A <= f) {
        if (g === 0) max = m;
        this.cells[2 * g] = this.cells[2 * idx];
        this.cells[2 * g + 1] = T;
        g++;
      }
      m = A;
    }
    this.count = g;
    return max;
  }
  trailingSpaces() {
    let n = 0;
    while (n < this.count && this.graphemes[this.cells[2 * (this.count - 1 - n)]] === " ") n++;
    return n;
  }
  charIndices() {
    let graphemes = this.graphemes;
    if (this.charMapLength < graphemes.length) {
      this.charMap = growInt32Array(this.charMap, graphemes.length, this.charMapLength);
      for (let charMapLength = this.charMapLength; charMapLength < graphemes.length; charMapLength++)
        this.charMap[charMapLength] = this.charPool.intern(graphemes[charMapLength]);
      this.charMapLength = graphemes.length;
    }
    return this.charMap;
  }
  runWords(n) {
    let count = this.count;
    if (count === 0) return this.words;
    if (this.hyperlinkPool !== n) {
      this.hyperlinkPool = n;
      this.linkIds.fill(0);
    }
    let f = this.cells[2 * count - 1] >>> RUN_SHIFT;
    if (this.reordered)
      for (let idx = 0; idx < count; idx++) f = Math.max(f, this.cells[2 * idx + 1] >>> RUN_SHIFT);
    let m = f + 1;
    this.words = growInt32Array(this.words, m, 0);
    for (let idx = 0; idx < m; idx++) {
      let g = this.runs[2 * idx + 1];
      let E = 0;
      if (g !== 0) {
        this.linkIds = growInt32Array(this.linkIds, g + 1, this.linkIds.length);
        E = this.linkIds[g];
        if (E === 0) {
          E = n.intern(this.uris[g]) + 1;
          this.linkIds[g] = E;
        }
        E -= 1;
      }
      this.words[idx] = packWord1(this.styleId(this.runs[2 * idx]), E, 0);
    }
    return this.words;
  }
  paint(n, u, f, m, p) {
    return this.native.paint(
      n,
      u,
      f,
      m,
      this.cells,
      this.count,
      undefined,
      this.charIndices(),
      this.runWords(p),
    );
  }
  refreshGenerations() {
    let n = levelGeneration();
    if (this.stylePool.generation === this.styleGeneration && n === this.chalkGeneration) return;
    this.styleGeneration = this.stylePool.generation;
    this.chalkGeneration = n;
    if (this.sgrKeys.length > MAX_SGR_KEYS_BEFORE_RESET) this.resetNative();
    else this.styleIds.fill(0);
  }
  resetNative() {
    this.native = createScreenSegmenter(BIDI_CONTROL_RANGES);
    this.graphemes = this.native.graphemes;
    this.sgrKeys = this.native.sgrKeys;
    this.sgrCloseKeys = this.native.sgrCloseKeys;
    this.uris = this.native.uris;
    this.charMapLength = 0;
    this.linkIds.fill(0);
    this.styleIds = new Int32Array(64);
  }
  styleId(n) {
    this.styleIds = growInt32Array(this.styleIds, n + 1, this.styleIds.length);
    let u = this.styleIds[n];
    if (u === 0) {
      u = this.stylePool.intern(dropItalicIfStandout(downgradeTrueColorCodes(this.ansiCodes(n)))) + 1;
      this.styleIds[n] = u;
    }
    return u - 1;
  }
  ansiCodes(n) {
    if (n === 0) return [];
    let parts = this.sgrKeys[n].split("\x00");
    let parts_2 = this.sgrCloseKeys[n].split("\x00");
    let m = [];
    for (let idx = 0; idx < parts.length; idx++) {
      let g = parts[idx];
      if (SGR_CODE_RE.test(g))
        m.push({
          type: "ansi",
          code: g,
          endCode: parts_2[idx],
        });
    }
    return m;
  }
}
//@ chunk-bzr73sfg.js:279287-279359 sole-consumer
var SGR_CODE_RE = /^\x1b\[(?:\d{1,3})(?:;5;\d{1,3}|;2;\d{1,3};\d{1,3};\d{1,3})?m$/;
//@ chunk-bzr73sfg.js:279359-279505 sole-consumer
function growInt32Array(array, minLength, keep) {
  if (array.length >= minLength) return array;
  let int32Array = new Int32Array(Math.max(minLength, 2 * array.length));
  if (keep > 0) int32Array.set(array.subarray(0, Math.min(keep, array.length)));
  return int32Array;
}
//@ chunk-bzr73sfg.js:279505-279540 affinity
var DIRECTION_MARKS = {
  ltr: "\u200E",
  rtl: "\u200F",
};
//@ chunk-bzr73sfg.js:279540-279648 fingerprint = intersectClip (1)
/**
 * 两个裁剪矩形求交（未定义的边视为无限）。
 */
function intersectClip(parent, child) {
  if (!parent) return child;
  return {
    x1: maxDefined(parent.x1, child.x1),
    x2: minDefined(parent.x2, child.x2),
    y1: maxDefined(parent.y1, child.y1),
    y2: minDefined(parent.y2, child.y2),
  };
}
//@ chunk-bzr73sfg.js:279648-279900 layout = intersectClip (0.795)
function isClipRedundant(outerClip, clip, rect) {
  if (clip === undefined) return true;
  let m = maxDefined(outerClip?.x1, rect?.x) ?? -1 / 0;
  let p = maxDefined(outerClip?.y1, rect?.y) ?? -1 / 0;
  let g = minDefined(outerClip?.x2, rect && rect.x + rect.width) ?? 1 / 0;
  let E = minDefined(outerClip?.y2, rect && rect.y + rect.height) ?? 1 / 0;
  if (m >= g || p >= E) return true;
  return (
    m >= (clip.x1 ?? -1 / 0) && g <= (clip.x2 ?? 1 / 0) && p >= (clip.y1 ?? -1 / 0) && E <= (clip.y2 ?? 1 / 0)
  );
}
//@ chunk-bzr73sfg.js:279900-279984 file-local
function maxDefined(a, b) {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return Math.max(a, b);
}
//@ chunk-bzr73sfg.js:279984-280068 file-local
function minDefined(a, b) {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return Math.min(a, b);
}
//@ chunk-bzr73sfg.js:280068-280078 layout
var NO_ABSOLUTE_CLEARS = [];
//@ chunk-bzr73sfg.js:280078-285029 fingerprint = Output (0.81)
/**
 * 渲染操作缓冲：renderNodeToOutput 往里记 write/blit/shift/clear/clip/noSelect 操作，get() 依次落到屏幕：clear 只扩大 damage（绝对定位节点的清除会阻止被其覆盖的 blit）；blit 从上一帧拷贝未变子树；write 按裁剪区截断文字（Bun.sliceAnsi）后用 LineCellSegmenter 切分并 paint，同时写软换行标记；最后应用 noSelect。writeDirected 支持 RTL 文本右对齐。写入远多于拷贝时记日志。
 */
class Output {
  width;
  height;
  screen;
  operations = [];
  lineCells;
  constructor(options) {
    let { width, height, stylePool, screen } = options;
    this.width = width;
    this.height = height;
    this.screen = screen;
    this.lineCells = new LineCellSegmenter(stylePool, screen.charPool);
    resetScreen(screen, width, height);
  }
  reset(width, height, screen) {
    this.width = width;
    this.height = height;
    this.screen = screen;
    this.operations.length = 0;
    resetScreen(screen, width, height);
  }
  blit(src, x, y, width, height, g) {
    this.operations.push({
      type: "blit",
      src,
      x,
      y,
      width,
      height,
      restoreNoSelect: g?.restoreNoSelect,
      unclipped: g?.unclipped,
    });
  }
  blitsOver(n) {
    for (let operation of this.operations)
      if (
        operation.type === "blit" &&
        operation.x < n.x + n.width &&
        n.x < operation.x + operation.width &&
        operation.y < n.y + n.height &&
        n.y < operation.y + operation.height
      )
        return true;
    return false;
  }
  shift(top, bottom, n) {
    this.operations.push({
      type: "shift",
      top,
      bottom,
      n,
    });
  }
  clear(region, fromAbsolute) {
    this.operations.push({
      type: "clear",
      region,
      fromAbsolute,
    });
  }
  noSelect(region) {
    this.operations.push({
      type: "noSelect",
      region,
      value: 1,
    });
  }
  clearNoSelect(region) {
    this.operations.push({
      type: "noSelect",
      region,
      value: 0,
    });
  }
  write(x, y, text, softWrap) {
    if (!text) return;
    this.operations.push({
      type: "write",
      x,
      y,
      text,
      softWrap,
    });
  }
  writeDirected(n, u, f, m, direction, g) {
    if (!isDirectionalWrite(direction)) {
      this.write(n, u, f, m);
      return;
    }
    if (direction === "ltr") {
      if (f)
        this.operations.push({
          type: "write",
          x: n,
          y: u,
          text: f,
          softWrap: m,
          direction,
        });
      return;
    }
    let lines = f.split(`
`);
    let min = Math.min(lines.length, this.height - u);
    for (let max = Math.max(0, -u); max < min; max++) {
      let D = lines[max];
      let O = this.lineCells.width(D, n, false);
      let _ = m?.[max + 1] ?? SoftWrapKind.HardBreak;
      let U = _ === SoftWrapKind.HardBreak ? 0 : this.lineCells.trailingSpaces();
      let L = _ === SoftWrapKind.Continuation && U < O;
      let P = O - Math.min(U, Math.max(O - g, +L));
      if (P > 0)
        this.operations.push({
          type: "write",
          x: n + Math.max(0, g - P),
          y: u + max,
          text: P < O ? Bun.sliceAnsi(D, 0, P) : D,
          direction,
        });
    }
  }
  paintedWidth(n, u) {
    return this.lineCells.width(n, u, needsBidiReorder());
  }
  clip(clip) {
    this.operations.push({
      type: "clip",
      clip,
    });
  }
  unclip() {
    this.operations.push({
      type: "unclip",
    });
  }
  get() {
    let screen = this.screen;
    let screenWidth = this.width;
    let screenHeight = this.height;
    let blitCells = 0;
    let writeCells = 0;
    let g = [];
    for (let idx = 0; idx < this.operations.length; idx++) {
      let U = this.operations[idx];
      if (U.type !== "clear") continue;
      let { x, y, width, height } = U.region;
      let startX = Math.max(0, x);
      let startY = Math.max(0, y);
      let maxX = Math.min(x + width, screenWidth);
      let maxY = Math.min(y + height, screenHeight);
      if (startX >= maxX || startY >= maxY) continue;
      let rect = {
        x: startX,
        y: startY,
        width: maxX - startX,
        height: maxY - startY,
      };
      screen.damage = screen.damage ? unionRect(screen.damage, rect) : rect;
      if (U.fromAbsolute)
        g.push({
          rect,
          opIndex: idx,
        });
    }
    let clips = [];
    let T = [];
    for (let idx = 0; idx < this.operations.length; idx++) {
      let operation = this.operations[idx];
      switch (operation.type) {
        case "clear":
          continue;
        case "clip":
          clips.push(intersectClip(clips.at(-1), operation.clip));
          continue;
        case "unclip":
          clips.pop();
          continue;
        case "blit": {
          let { src, x: regionX, y: regionY, width: regionWidth, height: regionHeight } = operation;
          let clip = operation.unclipped ? undefined : clips.at(-1);
          let startX = Math.max(regionX, clip?.x1 ?? 0);
          let startY = Math.max(regionY, clip?.y1 ?? 0);
          let maxY = Math.min(regionY + regionHeight, screenHeight, src.height, clip?.y2 ?? 1 / 0);
          let maxX = Math.min(regionX + regionWidth, screenWidth, src.width, clip?.x2 ?? 1 / 0);
          if (startX >= maxX || startY >= maxY) continue;
          let ee = g.length === 0 ? NO_ABSOLUTE_CLEARS : g.filter((ne) => ne.opIndex > idx);
          if (ee.length === 0) {
            blitRegion(screen, src, startX, startY, maxX, maxY);
            blitCells += (maxY - startY) * (maxX - startX);
            if (operation.restoreNoSelect)
              T.push({
                opIndex: idx,
                src,
                x1: startX,
                y1: startY,
                x2: maxX,
                y2: maxY,
              });
            continue;
          }
          let rowStart = startY;
          for (let row = startY; row <= maxY; row++)
            if (
              (row < maxY &&
                ee.some(
                  ({ rect }) =>
                    row >= rect.y &&
                    row < rect.y + rect.height &&
                    startX >= rect.x &&
                    maxX <= rect.x + rect.width,
                )) ||
              row === maxY
            ) {
              if (row > rowStart) {
                blitRegion(screen, src, startX, rowStart, maxX, row);
                blitCells += (row - rowStart) * (maxX - startX);
                if (operation.restoreNoSelect)
                  T.push({
                    opIndex: idx,
                    src,
                    x1: startX,
                    y1: rowStart,
                    x2: maxX,
                    y2: row,
                  });
              }
              rowStart = row + 1;
            }
          continue;
        }
        case "shift": {
          shiftRows(screen, operation.top, operation.bottom, operation.n);
          continue;
        }
        case "write": {
          let { text, softWrap, direction } = operation;
          let { x: startCol, y } = operation;
          let lines = text.split(`
`);
          let swFrom = 0;
          let Y = 0;
          let clip;
          let clip_2 = clips.at(-1);
          if (clip_2) {
            let clipHorizontally = typeof clip_2?.x1 === "number" && typeof clip_2?.x2 === "number";
            let clipVertically = typeof clip_2?.y1 === "number" && typeof clip_2?.y2 === "number";
            let se = needsBidiReorder();
            let ye = clipHorizontally && isDirectionalWrite(direction);
            if (clipHorizontally && startCol > clip_2.x2) continue;
            if (clipVertically) {
              let height = lines.length;
              if (y + height < clip_2.y1 || y > clip_2.y2) continue;
            }
            if (clipHorizontally) {
              let ue = 0;
              let ce = lines.length;
              let pe = y;
              if (clipVertically) {
                ue = y < clip_2.y1 ? clip_2.y1 - y : 0;
                ce = y + lines.length > clip_2.y2 ? clip_2.y2 - y : ce;
                pe = y < clip_2.y1 ? clip_2.y1 : y;
              }
              ce = Math.min(ce, ue + (screenHeight - pe));
              let Se = false;
              lines = lines.map((line, fe) => {
                if (fe < ue - 1 || fe >= ce) return line;
                let ge = startCol < clip_2.x1 ? clip_2.x1 - startCol : 0;
                let we = this.lineCells.width(line, startCol, se);
                if (startCol + we >= clip_2.x1) Se = true;
                if (ye || (ge === 0 && startCol + we <= clip_2.x2)) return line;
                let Fe = replaceInvalidUtf16(line);
                let Ne = clip_2.x2 - startCol;
                let Ce = Bun.sliceAnsi(Fe, ge, Ne);
                let max = Math.max(startCol, clip_2.x1);
                let Ae = clip_2.x2 - max;
                while (Ne > ge && this.lineCells.width(Ce, max, se) > Ae) {
                  Ne--;
                  Ce = Bun.sliceAnsi(Fe, ge, Ne);
                }
                return Ce;
              });
              if (!Se) continue;
              if (ye) clip = clip_2;
              if (startCol < clip_2.x1) startCol = clip_2.x1;
            }
            if (clipVertically) {
              let from = y < clip_2.y1 ? clip_2.y1 - y : 0;
              let height = lines.length;
              let to = y + height > clip_2.y2 ? clip_2.y2 - y : height;
              if (
                softWrap &&
                from > 0 &&
                (softWrap[from] ?? SoftWrapKind.HardBreak) !== SoftWrapKind.HardBreak
              ) {
                let Se = clip ? operation.x : startCol;
                let xe = Se + this.lineCells.width(lines[from - 1], Se, se);
                Y = packSoftWrap(clip ? Math.min(Math.max(xe, startCol), clip.x2) : xe, startCol);
              }
              lines = lines.slice(from, to);
              swFrom = from;
              if (y < clip_2.y1) y = clip_2.y1;
            }
          }
          let swBits = screen.softWrap;
          let offsetY = 0;
          for (let line of lines) {
            let lineY = y + offsetY;
            if (lineY >= screenHeight) break;
            let contentEnd = writeLineToScreen(
              screen,
              line,
              clip ? operation.x : startCol,
              lineY,
              this.lineCells,
              direction,
              clip,
            );
            writeCells += contentEnd - startCol;
            if (softWrap) {
              let isSW = softWrap[swFrom + offsetY];
              swBits[lineY] =
                isSW === SoftWrapKind.HardBreak || isSW === undefined
                  ? 0
                  : isSW === SoftWrapKind.ContinuationElidedSep
                    ? Y | SW_ELIDED_SEP
                    : Y;
              Y = packSoftWrap(contentEnd, startCol);
            }
            offsetY++;
          }
          continue;
        }
      }
    }
    let A = [];
    let D = 0;
    for (let idx = 0; idx < this.operations.length; idx++) {
      let U = this.operations[idx];
      if (U.type === "clip") A.push(intersectClip(A.at(-1), U.clip));
      else if (U.type === "unclip") A.pop();
      else if (U.type === "blit")
        while (D < T.length && T[D].opIndex === idx) {
          let { src, x1, y1, x2, y2 } = T[D];
          copyNoSelectRegion(screen, src, x1, y1, x2, y2);
          D++;
        }
      else if (U.type === "noSelect") {
        let { x: L, y: P, width, height } = U.region;
        let last = A.at(-1);
        let max = Math.max(L, last?.x1 ?? 0);
        let max_2 = Math.max(P, last?.y1 ?? 0);
        let min = Math.min(L + width, last?.x2 ?? 1 / 0);
        let min_2 = Math.min(P + height, last?.y2 ?? 1 / 0);
        if (min > max && min_2 > max_2)
          if (U.value === 1) markNoSelect(screen, max, max_2, min - max, min_2 - max_2);
          else clearNoSelect(screen, max, max_2, min - max, min_2 - max_2);
      }
    }
    let totalCells = blitCells + writeCells;
    if (totalCells > 1000 && writeCells > blitCells)
      logForDebugging(
        `High write ratio: blit=${blitCells}, write=${writeCells} (${((writeCells / totalCells) * 100).toFixed(1)}% writes), screen=${screenHeight}x${screenWidth}`,
      );
    return screen;
  }
}
//@ chunk-bzr73sfg.js:285029-285068 sole-consumer
function isDirectionalWrite(direction) {
  return direction !== undefined && needsBidiReorder();
}
//@ chunk-bzr73sfg.js:285068-285211 sole-consumer
/**
 * 把一行写进屏幕：有方向时前置 LRM/RLM，交给 LineCellSegmenter 切分（必要时双向重排），按裁剪区保留列，paint 后返回结束列。
 */
function writeLineToScreen(screen, line, x, y, segmenter, direction, clip) {
  let T = isDirectionalWrite(direction) ? DIRECTION_MARKS[direction] + line : line;
  segmenter.segment(T, needsBidiReorder());
  if (clip !== undefined) x = segmenter.keepColumns(x, clip.x1, clip.x2);
  return segmenter.count === 0 ? x : paintSegments(screen, x, y, segmenter);
}
//@ chunk-ag5x7vhf.js:17851-18348 fingerprint = writeLineToScreen (0.806)
/**
 * 把屏幕的一行转回带样式与超链接的 ANSI 字符串（跳过占位格，去掉行尾无效空格），renderToScreen 用来把离屏渲染结果变成文本行。
 */
function serializeScreenRow(screen, stylePool, row) {
  let width = screen.width;
  let k = row * width;
  let _ = -1;
  for (let idx = width - 1; idx >= 0; idx--) {
    let V = cellAtIndex(screen, k + idx);
    if (V.width === 2) continue;
    if (V.char === " " && (V.styleId & 1) === 0 && V.hyperlink === undefined) continue;
    _ = idx;
    break;
  }
  if (_ < 0) return "";
  let I = "";
  let none = stylePool.none;
  let A;
  for (let idx = 0; idx <= _; idx++) {
    let V = cellAtIndex(screen, k + idx);
    if (V.width === 2 || V.width === 3) continue;
    if (V.hyperlink !== A) {
      if (A !== undefined) I += LINK_END;
      if (V.hyperlink !== undefined) I += link(V.hyperlink);
      A = V.hyperlink;
    }
    I += stylePool.transition(none, V.styleId);
    none = V.styleId;
    I += V.char;
  }
  if (A !== undefined) I += LINK_END;
  if (none !== stylePool.none) I += RESET;
  return I;
}
//@ chunk-bfrv6ttc.js:567-648 callgraph-fingerprint = flushBuffer (0.346)
function countGraphemes(e) {
  if (!e) return 0;
  let t = 0;
  for (let r of getGraphemeSegmenter().segment(e)) t++;
  return t;
}
export { countGraphemes, serializeScreenRow, Output, intersectClip, isClipRedundant };
