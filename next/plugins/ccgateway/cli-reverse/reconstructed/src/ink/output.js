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
import { getGraphemeSegmenter } from "../utils/intl.js";
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

//@ chunk-bfrv6ttc.js:567-648 callgraph-fingerprint (2.1.88 match: flushBuffer, 0.346)
function countGraphemes(text) {
  if (!text) return 0;
  let count = 0;
  for (let segment of getGraphemeSegmenter().segment(text)) count++;
  return count;
}
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
  segment(text, reordered) {
    if (
      this.sgrKeys.length > MAX_SEGMENT_CELLS ||
      this.uris.length > MAX_SEGMENT_CELLS ||
      this.graphemes.length > 4 * MAX_SEGMENT_CELLS
    )
      this.resetNative();
    this.refreshGenerations();
    let segCount = this.native.segment(text, this.cells, this.runs, reordered);
    if (segCount < 0) {
      let max = Math.max(-segCount, this.cells.length);
      this.cells = new Int32Array(2 * max);
      this.runs = new Int32Array(2 * max);
      segCount = this.native.segment(text, this.cells, this.runs, reordered);
    }
    this.count = segCount;
    this.reordered = reordered;
    return segCount;
  }
  width(text, startCol, reordered) {
    let segCount = this.segment(text, reordered);
    let col = startCol;
    for (let idx = 0; idx < segCount; idx++) {
      let packed = this.cells[2 * idx + 1];
      col += (packed & TAB_FLAG) !== 0 ? DEFAULT_TAB_WIDTH - (col % DEFAULT_TAB_WIDTH) : packed & WIDTH_BITS;
    }
    return col - startCol;
  }
  keepColumns(startCol, clipFrom, clipTo) {
    let col = startCol;
    let max = Math.max(startCol, clipFrom);
    let kept = 0;
    for (let idx = 0; idx < this.count; idx++) {
      let packed = this.cells[2 * idx + 1];
      let nextCol =
        col +
        ((packed & TAB_FLAG) !== 0 ? DEFAULT_TAB_WIDTH - (col % DEFAULT_TAB_WIDTH) : packed & WIDTH_BITS);
      if (col >= clipFrom && col < clipTo && nextCol <= clipTo) {
        if (kept === 0) max = col;
        this.cells[2 * kept] = this.cells[2 * idx];
        this.cells[2 * kept + 1] = packed;
        kept++;
      }
      col = nextCol;
    }
    this.count = kept;
    return max;
  }
  trailingSpaces() {
    let trailing = 0;
    while (trailing < this.count && this.graphemes[this.cells[2 * (this.count - 1 - trailing)]] === " ")
      trailing++;
    return trailing;
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
  runWords(hyperlinkPool) {
    let count = this.count;
    if (count === 0) return this.words;
    if (this.hyperlinkPool !== hyperlinkPool) {
      this.hyperlinkPool = hyperlinkPool;
      this.linkIds.fill(0);
    }
    let maxRun = this.cells[2 * count - 1] >>> RUN_SHIFT;
    if (this.reordered)
      for (let idx = 0; idx < count; idx++) maxRun = Math.max(maxRun, this.cells[2 * idx + 1] >>> RUN_SHIFT);
    let runCount = maxRun + 1;
    this.words = growInt32Array(this.words, runCount, 0);
    for (let idx = 0; idx < runCount; idx++) {
      let linkIndex = this.runs[2 * idx + 1];
      let linkId = 0;
      if (linkIndex !== 0) {
        this.linkIds = growInt32Array(this.linkIds, linkIndex + 1, this.linkIds.length);
        linkId = this.linkIds[linkIndex];
        if (linkId === 0) {
          linkId = hyperlinkPool.intern(this.uris[linkIndex]) + 1;
          this.linkIds[linkIndex] = linkId;
        }
        linkId -= 1;
      }
      this.words[idx] = packWord1(this.styleId(this.runs[2 * idx]), linkId, 0);
    }
    return this.words;
  }
  paint(screen, x, y, width, hyperlinkPool) {
    return this.native.paint(
      screen,
      x,
      y,
      width,
      this.cells,
      this.count,
      undefined,
      this.charIndices(),
      this.runWords(hyperlinkPool),
    );
  }
  refreshGenerations() {
    let generation = levelGeneration();
    if (this.stylePool.generation === this.styleGeneration && generation === this.chalkGeneration) return;
    this.styleGeneration = this.stylePool.generation;
    this.chalkGeneration = generation;
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
  styleId(styleIndex) {
    this.styleIds = growInt32Array(this.styleIds, styleIndex + 1, this.styleIds.length);
    let cached = this.styleIds[styleIndex];
    if (cached === 0) {
      cached =
        this.stylePool.intern(dropItalicIfStandout(downgradeTrueColorCodes(this.ansiCodes(styleIndex)))) + 1;
      this.styleIds[styleIndex] = cached;
    }
    return cached - 1;
  }
  ansiCodes(styleIndex) {
    if (styleIndex === 0) return [];
    let parts = this.sgrKeys[styleIndex].split("\x00");
    let parts_2 = this.sgrCloseKeys[styleIndex].split("\x00");
    let codes = [];
    for (let idx = 0; idx < parts.length; idx++) {
      let code = parts[idx];
      if (SGR_CODE_RE.test(code))
        codes.push({
          type: "ansi",
          code,
          endCode: parts_2[idx],
        });
    }
    return codes;
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
//@ chunk-bzr73sfg.js:279540-279648 fingerprint (2.1.88 match: intersectClip, 1)
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
//@ chunk-bzr73sfg.js:279648-279900 layout (2.1.88 match: intersectClip, 0.795)
function isClipRedundant(outerClip, clip, rect) {
  if (clip === undefined) return true;
  let x1 = maxDefined(outerClip?.x1, rect?.x) ?? -1 / 0;
  let y1 = maxDefined(outerClip?.y1, rect?.y) ?? -1 / 0;
  let x2 = minDefined(outerClip?.x2, rect && rect.x + rect.width) ?? 1 / 0;
  let y2 = minDefined(outerClip?.y2, rect && rect.y + rect.height) ?? 1 / 0;
  if (x1 >= x2 || y1 >= y2) return true;
  return (
    x1 >= (clip.x1 ?? -1 / 0) &&
    x2 <= (clip.x2 ?? 1 / 0) &&
    y1 >= (clip.y1 ?? -1 / 0) &&
    y2 <= (clip.y2 ?? 1 / 0)
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
//@ chunk-bzr73sfg.js:280078-285029 fingerprint (2.1.88 match: Output, 0.81)
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
  blit(src, x, y, width, height, options) {
    this.operations.push({
      type: "blit",
      src,
      x,
      y,
      width,
      height,
      restoreNoSelect: options?.restoreNoSelect,
      unclipped: options?.unclipped,
    });
  }
  blitsOver(region) {
    for (let operation of this.operations)
      if (
        operation.type === "blit" &&
        operation.x < region.x + region.width &&
        region.x < operation.x + operation.width &&
        operation.y < region.y + region.height &&
        region.y < operation.y + operation.height
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
  writeDirected(x, y, text, softWrap, direction, maxWidth) {
    if (!isDirectionalWrite(direction)) {
      this.write(x, y, text, softWrap);
      return;
    }
    if (direction === "ltr") {
      if (text)
        this.operations.push({
          type: "write",
          x,
          y,
          text,
          softWrap,
          direction,
        });
      return;
    }
    let lines = text.split(`
`);
    let min = Math.min(lines.length, this.height - y);
    for (let max = Math.max(0, -y); max < min; max++) {
      let line = lines[max];
      let lineWidth = this.lineCells.width(line, x, false);
      let wrapKind = softWrap?.[max + 1] ?? SoftWrapKind.HardBreak;
      let trailingSpaces = wrapKind === SoftWrapKind.HardBreak ? 0 : this.lineCells.trailingSpaces();
      let isContinuation = wrapKind === SoftWrapKind.Continuation && trailingSpaces < lineWidth;
      let visibleWidth =
        lineWidth - Math.min(trailingSpaces, Math.max(lineWidth - maxWidth, +isContinuation));
      if (visibleWidth > 0)
        this.operations.push({
          type: "write",
          x: x + Math.max(0, maxWidth - visibleWidth),
          y: y + max,
          text: visibleWidth < lineWidth ? Bun.sliceAnsi(line, 0, visibleWidth) : line,
          direction,
        });
    }
  }
  paintedWidth(text, startCol) {
    return this.lineCells.width(text, startCol, needsBidiReorder());
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
    let absoluteClears = [];
    for (let idx = 0; idx < this.operations.length; idx++) {
      let operation = this.operations[idx];
      if (operation.type !== "clear") continue;
      let { x, y, width, height } = operation.region;
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
      if (operation.fromAbsolute)
        absoluteClears.push({
          rect,
          opIndex: idx,
        });
    }
    let clips = [];
    let restoreNoSelectRegions = [];
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
          let laterClears =
            absoluteClears.length === 0
              ? NO_ABSOLUTE_CLEARS
              : absoluteClears.filter((absoluteClear) => absoluteClear.opIndex > idx);
          if (laterClears.length === 0) {
            blitRegion(screen, src, startX, startY, maxX, maxY);
            blitCells += (maxY - startY) * (maxX - startX);
            if (operation.restoreNoSelect)
              restoreNoSelectRegions.push({
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
                laterClears.some(
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
                  restoreNoSelectRegions.push({
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
          let previousWrap = 0;
          let clip;
          let clip_2 = clips.at(-1);
          if (clip_2) {
            let clipHorizontally = typeof clip_2?.x1 === "number" && typeof clip_2?.x2 === "number";
            let clipVertically = typeof clip_2?.y1 === "number" && typeof clip_2?.y2 === "number";
            let needsReorder = needsBidiReorder();
            let clipDirectional = clipHorizontally && isDirectionalWrite(direction);
            if (clipHorizontally && startCol > clip_2.x2) continue;
            if (clipVertically) {
              let height = lines.length;
              if (y + height < clip_2.y1 || y > clip_2.y2) continue;
            }
            if (clipHorizontally) {
              let firstLine = 0;
              let lastLine = lines.length;
              let firstRow = y;
              if (clipVertically) {
                firstLine = y < clip_2.y1 ? clip_2.y1 - y : 0;
                lastLine = y + lines.length > clip_2.y2 ? clip_2.y2 - y : lastLine;
                firstRow = y < clip_2.y1 ? clip_2.y1 : y;
              }
              lastLine = Math.min(lastLine, firstLine + (screenHeight - firstRow));
              let anyVisible = false;
              lines = lines.map((line, lineIndex) => {
                if (lineIndex < firstLine - 1 || lineIndex >= lastLine) return line;
                let skipCols = startCol < clip_2.x1 ? clip_2.x1 - startCol : 0;
                let lineWidth = this.lineCells.width(line, startCol, needsReorder);
                if (startCol + lineWidth >= clip_2.x1) anyVisible = true;
                if (clipDirectional || (skipCols === 0 && startCol + lineWidth <= clip_2.x2)) return line;
                let cleanLine = replaceInvalidUtf16(line);
                let endCol = clip_2.x2 - startCol;
                let sliced = Bun.sliceAnsi(cleanLine, skipCols, endCol);
                let max = Math.max(startCol, clip_2.x1);
                let availableWidth = clip_2.x2 - max;
                while (
                  endCol > skipCols &&
                  this.lineCells.width(sliced, max, needsReorder) > availableWidth
                ) {
                  endCol--;
                  sliced = Bun.sliceAnsi(cleanLine, skipCols, endCol);
                }
                return sliced;
              });
              if (!anyVisible) continue;
              if (clipDirectional) clip = clip_2;
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
                let wrapStartCol = clip ? operation.x : startCol;
                let wrapEndCol =
                  wrapStartCol + this.lineCells.width(lines[from - 1], wrapStartCol, needsReorder);
                previousWrap = packSoftWrap(
                  clip ? Math.min(Math.max(wrapEndCol, startCol), clip.x2) : wrapEndCol,
                  startCol,
                );
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
                    ? previousWrap | SW_ELIDED_SEP
                    : previousWrap;
              previousWrap = packSoftWrap(contentEnd, startCol);
            }
            offsetY++;
          }
          continue;
        }
      }
    }
    let clipStack = [];
    let restoreIndex = 0;
    for (let idx = 0; idx < this.operations.length; idx++) {
      let operation = this.operations[idx];
      if (operation.type === "clip") clipStack.push(intersectClip(clipStack.at(-1), operation.clip));
      else if (operation.type === "unclip") clipStack.pop();
      else if (operation.type === "blit")
        while (
          restoreIndex < restoreNoSelectRegions.length &&
          restoreNoSelectRegions[restoreIndex].opIndex === idx
        ) {
          let { src, x1, y1, x2, y2 } = restoreNoSelectRegions[restoreIndex];
          copyNoSelectRegion(screen, src, x1, y1, x2, y2);
          restoreIndex++;
        }
      else if (operation.type === "noSelect") {
        let { x, y, width, height } = operation.region;
        let last = clipStack.at(-1);
        let max = Math.max(x, last?.x1 ?? 0);
        let max_2 = Math.max(y, last?.y1 ?? 0);
        let min = Math.min(x + width, last?.x2 ?? 1 / 0);
        let min_2 = Math.min(y + height, last?.y2 ?? 1 / 0);
        if (min > max && min_2 > max_2)
          if (operation.value === 1) markNoSelect(screen, max, max_2, min - max, min_2 - max_2);
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
  let markedLine = isDirectionalWrite(direction) ? DIRECTION_MARKS[direction] + line : line;
  segmenter.segment(markedLine, needsBidiReorder());
  if (clip !== undefined) x = segmenter.keepColumns(x, clip.x1, clip.x2);
  return segmenter.count === 0 ? x : paintSegments(screen, x, y, segmenter);
}
//@ chunk-ag5x7vhf.js:17851-18348 fingerprint (2.1.88 match: writeLineToScreen, 0.806)
/**
 * 把屏幕的一行转回带样式与超链接的 ANSI 字符串（跳过占位格，去掉行尾无效空格），renderToScreen 用来把离屏渲染结果变成文本行。
 */
function serializeScreenRow(screen, stylePool, row) {
  let width = screen.width;
  let rowStart = row * width;
  let lastCol = -1;
  for (let idx = width - 1; idx >= 0; idx--) {
    let cell = cellAtIndex(screen, rowStart + idx);
    if (cell.width === 2) continue;
    if (cell.char === " " && (cell.styleId & 1) === 0 && cell.hyperlink === undefined) continue;
    lastCol = idx;
    break;
  }
  if (lastCol < 0) return "";
  let out = "";
  let none = stylePool.none;
  let hyperlink;
  for (let idx = 0; idx <= lastCol; idx++) {
    let cell = cellAtIndex(screen, rowStart + idx);
    if (cell.width === 2 || cell.width === 3) continue;
    if (cell.hyperlink !== hyperlink) {
      if (hyperlink !== undefined) out += LINK_END;
      if (cell.hyperlink !== undefined) out += link(cell.hyperlink);
      hyperlink = cell.hyperlink;
    }
    out += stylePool.transition(none, cell.styleId);
    none = cell.styleId;
    out += cell.char;
  }
  if (hyperlink !== undefined) out += LINK_END;
  if (none !== stylePool.none) out += RESET;
  return out;
}
export { countGraphemes, serializeScreenRow, Output, intersectClip, isClipRedundant };
