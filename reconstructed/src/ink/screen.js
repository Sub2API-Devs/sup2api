/**
 * ink/screen.ts
 *
 * 并入已有模块：样式池监控（记录键、饱和、主动重置统计）；把数值限制在 [min, max]。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/screen.ts
 * pieces: chunk-4ymxyb4g.js (1), chunk-ag5x7vhf.js (1), chunk-bc20zedk.js (1), chunk-bzr73sfg.js (58)
 * attribution: fingerprint 25, placement 6, layout 26, callgraph-witnessed 2, file-local 2
 */
import { colorSupport } from "./colorize.js";
import {
  SGR_BOLD,
  SGR_DIM,
  SGR_NORMAL_INTENSITY,
  SGR_INVERSE,
  SGR_NO_INVERSE,
  SGR_UNDERLINE,
  SGR_NO_UNDERLINE,
  SGR_FG_YELLOW,
  SGR_DEFAULT_FG,
  SGR_DEFAULT_BG,
  SGR_NO_STRIKETHROUGH,
  SGR_NO_OVERLINE,
} from "./termio/sgr.js";
import { isDefaultFgColor } from "./terminalColorSupport.js";
import { logForDebugging } from "../utils/debug.js";
import { ansiCodesToString } from "../../vendor/@alcalzone/ansi-tokenize/build/ansiCodes.js";
import { diffAnsiCodes } from "../../vendor/@alcalzone/ansi-tokenize/build/diff.js";
import { assertCellSegmenter } from "./terminalImages.js";
import { DEFAULT_TAB_WIDTH } from "./wrapAnsi.js";
import { ifNotInteger } from "./warn.js";
import { unionRect } from "./layout/geometry.js";
import { bunStringWidth } from "./stringWidth.js";
import { ELLIPSIS } from "./styles.js";
import { ESC, SEP, BEL as BEL_2 } from "./termio/ansi.js";
import { getGraphemeSegmenter } from "../utils/intl.js";
import { normalizeFullWidthSpace } from "../utils/stringUtils.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useContext, useRef } from "../../vendor/react/cjs/react.production.js";
import { ScrollAnchorContext } from "./outputReplay.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BaseBox } from "./components/Box.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-4ymxyb4g.js:8187-8248 fingerprint = INVERSE_CODE (0.705)
function inverseText(result) {
  colorSupport.ensureInit();
  return "\x1B[7m" + result + "\x1B[27m";
}
//@ chunk-bzr73sfg.js:199617-199701 placement
/**
 * 把数值限制在 [min, max]。
 */
function clamp(value, min, max) {
  if (min !== undefined && value < min) return min;
  if (max !== undefined && value > max) return max;
  return value;
}
//@ chunk-bzr73sfg.js:199701-200485 placement
/**
 * 样式池监控（记录键、饱和、主动重置统计）。
 */
class StylePoolMonitor {
  recording = false;
  autoResetEnabled = false;
  debugTainted = false;
  stylePoolHealthyReported = false;
  stylePoolCapHitReported = false;
  keys = new Set();
  saturatedLatch = false;
  maxKeys = 131072;
  proactiveResetCount = 0;
  lastProactiveResetReason = "none";
  lastProactiveResetAt = 0;
  record(fg, bg) {
    if (fg < 2) return;
    if (this.keys.size >= this.maxKeys) {
      this.saturatedLatch = true;
      return;
    }
    this.keys.add(fg * 32768 + bg);
  }
  get size() {
    return this.keys.size;
  }
  get saturated() {
    return this.saturatedLatch;
  }
  reset() {
    this.keys.clear();
    this.saturatedLatch = false;
  }
  setMaxKeys(maxKeys) {
    this.maxKeys = maxKeys ?? 131072;
  }
  recordProactiveReset(lastProactiveResetReason) {
    this.proactiveResetCount++;
    this.lastProactiveResetReason = lastProactiveResetReason;
    this.lastProactiveResetAt = performance.now();
  }
  get proactiveResetStats() {
    return {
      count: this.proactiveResetCount,
      lastReason: this.lastProactiveResetReason,
      lastResetAt: this.lastProactiveResetAt,
    };
  }
}
//@ chunk-bzr73sfg.js:200485-200706 placement
/**
 * 粗体与暗淡共用关闭码 SGR 22：从同时有粗体/暗淡切到只保留其一时，先输出 22 再补回保留的那个；返回需要前置的序列。
 */
function boldDimResetPrefix(fromStyles, toStyles) {
  let fromMask = 0;
  let toMask = 0;
  for (let style of fromStyles)
    if (style.code === SGR_BOLD) fromMask |= 1;
    else if (style.code === SGR_DIM) fromMask |= 2;
  for (let toStyle of toStyles)
    if (toStyle.code === SGR_BOLD) toMask |= 1;
    else if (toStyle.code === SGR_DIM) toMask |= 2;
  if (fromMask & ~toMask && toMask) {
    let keepMask = fromMask & toMask;
    return SGR_NORMAL_INTENSITY + (keepMask & 1 ? SGR_BOLD : "") + (keepMask & 2 ? SGR_DIM : "");
  }
  return "";
}
//@ chunk-bzr73sfg.js:200706-200783 placement
/**
 * 样式里已有某种颜色码（mYr 判断）时去掉暗淡码，供反显/选区背景等派生样式使用。
 */
function dropDimIfColored(styles) {
  return styles.some((style) => isDefaultFgColor(style.code))
    ? styles.filter((style) => style.code !== SGR_DIM)
    : styles;
}
//@ chunk-bzr73sfg.js:200783-201232 fingerprint = CharPool (1)
/**
 * 字符驻留池：字符串 → 下标；ASCII 单字符走 128 项快表；下标 0 是空格、1 是空串（宽字符的占位格）。
 */
class CharPool {
  strings = [" ", ""];
  stringMap = new Map([
    [" ", 0],
    ["", 1],
  ]);
  ascii = initCharAscii();
  intern(char) {
    if (char.length === 1) {
      let code = char.charCodeAt(0);
      if (code < 128) {
        let cached = this.ascii[code];
        if (cached !== -1) return cached;
        let index = this.strings.length;
        this.strings.push(char);
        this.ascii[code] = index;
        return index;
      }
    }
    let existing = this.stringMap.get(char);
    if (existing !== undefined) return existing;
    let index = this.strings.length;
    this.strings.push(char);
    this.stringMap.set(char, index);
    return index;
  }
  get(index) {
    return this.strings[index] ?? " ";
  }
  get size() {
    return this.strings.length;
  }
}
//@ chunk-bzr73sfg.js:201232-201259 layout
var STYLE_POOL_SOFT_LIMIT = 4096;
var STYLE_POOL_COMPACT_MIN = 512;
var TRANSITION_CACHE_MAX = 8192;
//@ chunk-bzr73sfg.js:201259-201524 fingerprint = HyperlinkPool (1)
/**
 * OSC 8 超链接驻留池：URL → 下标，0 表示无链接。
 */
class HyperlinkPool {
  strings = [""];
  stringMap = new Map();
  intern(hyperlink) {
    if (!hyperlink) return 0;
    let id = this.stringMap.get(hyperlink);
    if (id === undefined) {
      id = this.strings.length;
      this.strings.push(hyperlink);
      this.stringMap.set(hyperlink, id);
    }
    return id;
  }
  get(id) {
    return id === 0 ? undefined : this.strings[id];
  }
  get size() {
    return this.strings.length;
  }
}
//@ chunk-bzr73sfg.js:201524-201680 fingerprint = UNDERLINE_CODE (1)
var INVERSE_CODE = {
  type: "ansi",
  code: SGR_INVERSE,
  endCode: SGR_NO_INVERSE,
};
var BOLD_CODE = {
  type: "ansi",
  code: SGR_BOLD,
  endCode: SGR_NORMAL_INTENSITY,
};
var UNDERLINE_CODE = {
  type: "ansi",
  code: SGR_UNDERLINE,
  endCode: SGR_NO_UNDERLINE,
};
var YELLOW_FG_CODE = {
  type: "ansi",
  code: SGR_FG_YELLOW,
  endCode: SGR_DEFAULT_FG,
};
//@ chunk-bzr73sfg.js:201680-204527 fingerprint = StylePool (0.543)
/**
 * 样式驻留池：AnsiCode 数组 → styleId（下标 <<1，最低位表示该样式在空格上可见，如背景/反显/下划线），上限约 2^14 个，超出后新组合退化为无样式并告警。transition(from,to) 缓存两样式间切换所需的 SGR 串；派生样式：withInverse、withUnderline、withCurrentMatch（搜索当前匹配：黄字+反显+粗体+下划线）、withSelectionBg（选区背景色，未设置时退回反显）；compact() 重建池并返回旧 id→新 id 的映射函数。
 */
class StylePool {
  ids = new Map();
  styles = [];
  transitionCache = new Map();
  overflowWarned = false;
  generationCount = 0;
  none;
  atlasRecorder = new StylePoolMonitor();
  constructor() {
    this.none = this.intern([]);
  }
  get size() {
    return this.styles.length;
  }
  get overflowed() {
    return this.overflowWarned;
  }
  get transitionCacheSize() {
    return this.transitionCache.size;
  }
  get isNearCapacity() {
    return this.overflowWarned || this.styles.length > STYLE_NEAR_CAPACITY;
  }
  needsCompaction(liveCount) {
    return this.overflowWarned || this.styles.length > Math.max(STYLE_POOL_COMPACT_MIN, 2 * liveCount);
  }
  get generation() {
    return this.generationCount;
  }
  intern(styles) {
    let key = styles.length === 0 ? "" : styles.map((style) => style.code).join("\x00");
    let id = this.ids.get(key);
    if (id === undefined) {
      let rawId = this.styles.length;
      if (rawId > MAX_STYLE_INDEX) {
        if (!this.overflowWarned) {
          this.overflowWarned = true;
          logForDebugging(
            `StylePool exhausted ${MAX_STYLE_INDEX} unique styles \u2014 further ` +
              "style combinations render unstyled to avoid packed-cell aliasing",
            {
              level: "warn",
            },
          );
        }
        return this.none;
      }
      this.styles.push(styles.length === 0 ? [] : styles);
      id = (rawId << 1) | (styles.length > 0 && hasVisibleSpaceEffect(styles) ? 1 : 0);
      this.ids.set(key, id);
    }
    return id;
  }
  get(id) {
    return this.styles[id >>> 1] ?? [];
  }
  transition(fromId, toId) {
    if (fromId === toId) return "";
    let key = fromId * 1048576 + toId;
    let str = this.transitionCache.get(key);
    if (str === undefined) {
      if (this.transitionCache.size >= TRANSITION_CACHE_MAX) this.transitionCache.clear();
      let fromStyles = this.get(fromId);
      let toStyles = this.get(toId);
      str = boldDimResetPrefix(fromStyles, toStyles) + ansiCodesToString(diffAnsiCodes(fromStyles, toStyles));
      this.transitionCache.set(key, str);
    }
    return str;
  }
  inverseCache = new Map();
  withInverse(baseId) {
    let id = this.inverseCache.get(baseId);
    if (id === undefined) {
      let baseCodes = this.get(baseId);
      id = baseCodes.some((baseCode) => baseCode.endCode === SGR_NO_INVERSE)
        ? baseId
        : this.intern([...dropDimIfColored(baseCodes), INVERSE_CODE]);
      this.inverseCache.set(baseId, id);
    }
    return id;
  }
  underlineCache = new Map();
  withUnderline(baseId) {
    let id = this.underlineCache.get(baseId);
    if (id === undefined) {
      let baseCodes = this.get(baseId);
      id = baseCodes.some((baseCode) => baseCode.endCode === SGR_NO_UNDERLINE)
        ? baseId
        : this.intern([...baseCodes, UNDERLINE_CODE]);
      this.underlineCache.set(baseId, id);
    }
    return id;
  }
  currentMatchCache = new Map();
  withCurrentMatch(baseId) {
    let id = this.currentMatchCache.get(baseId);
    if (id === undefined) {
      let baseCodes = dropDimIfColored(this.get(baseId));
      let codes = baseCodes.filter(
        (baseCode) => baseCode.endCode !== SGR_DEFAULT_FG && baseCode.endCode !== SGR_DEFAULT_BG,
      );
      codes.push(YELLOW_FG_CODE);
      if (!baseCodes.some((baseCode) => baseCode.endCode === SGR_NO_INVERSE)) codes.push(INVERSE_CODE);
      if (!baseCodes.some((baseCode) => baseCode.endCode === SGR_NORMAL_INTENSITY)) codes.push(BOLD_CODE);
      if (!baseCodes.some((baseCode) => baseCode.endCode === SGR_NO_UNDERLINE)) codes.push(UNDERLINE_CODE);
      id = this.intern(codes);
      this.currentMatchCache.set(baseId, id);
    }
    return id;
  }
  selectionBgCode = null;
  selectionBgCache = new Map();
  setSelectionBg(code) {
    if (this.selectionBgCode?.code === code?.code) return;
    this.selectionBgCode = code;
    this.selectionBgCache.clear();
  }
  withSelectionBg(baseId) {
    let selectionBgCode = this.selectionBgCode;
    if (selectionBgCode === null) return this.withInverse(baseId);
    let id = this.selectionBgCache.get(baseId);
    if (id === undefined) {
      let kept = dropDimIfColored(this.get(baseId)).filter(
        (code) => code.endCode !== SGR_DEFAULT_BG && code.endCode !== SGR_NO_INVERSE,
      );
      kept.push(selectionBgCode);
      id = this.intern(kept);
      this.selectionBgCache.set(baseId, id);
    }
    return id;
  }
  compact() {
    let styles = this.styles;
    this.ids = new Map();
    this.styles = [];
    this.transitionCache.clear();
    this.inverseCache.clear();
    this.underlineCache.clear();
    this.currentMatchCache.clear();
    this.selectionBgCache.clear();
    this.overflowWarned = false;
    this.generationCount++;
    this.intern([]);
    let remapScratch = new Int32Array(styles.length).fill(-1);
    return (oldId) => {
      let styleIndex = oldId >>> 1;
      let mapped = remapScratch[styleIndex];
      if (mapped !== undefined && mapped !== -1) return mapped;
      let newId = this.intern(styles[styleIndex] ?? []);
      if (styleIndex < remapScratch.length) remapScratch[styleIndex] = newId;
      return newId;
    };
  }
}
//@ chunk-bzr73sfg.js:204527-204565 layout
var VISIBLE_ON_SPACE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bzr73sfg.js:204527", () => {
  VISIBLE_ON_SPACE = new Set([
    SGR_DEFAULT_BG,
    SGR_NO_INVERSE,
    SGR_NO_UNDERLINE,
    SGR_NO_STRIKETHROUGH,
    SGR_NO_OVERLINE,
  ]);
});
//@ chunk-bzr73sfg.js:204565-204634 fingerprint = hasVisibleSpaceEffect (1)
/**
 * 样式里是否有在空格上也看得见的效果（反显、背景、下划线、上划线、删除线等关闭码判断）。
 */
function hasVisibleSpaceEffect(styles) {
  for (let style of styles) if (VISIBLE_ON_SPACE.has(style.endCode)) return true;
  return false;
}
//@ chunk-bzr73sfg.js:204634-204648 layout
var EMPTY_CHAR_INDEX = 0;
var SPACER_CHAR_INDEX = 1;
//@ chunk-bzr73sfg.js:204648-204717 layout
function initCharAscii() {
  let table = new Int32Array(128);
  table.fill(-1);
  table[32] = EMPTY_CHAR_INDEX;
  return table;
}
//@ chunk-bzr73sfg.js:204717-204782 layout
/**
 * 屏幕格第二个 Int32 字的位布局：styleId 占高 15 位（<<17），超链接下标 15 位（<<2），宽度种类 2 位（0 窄、1 宽、2 宽字符右半占位、3 行尾宽字符占位）。
 */
var STYLE_SHIFT = 17;
var HYPERLINK_SHIFT = 2;
var HYPERLINK_MASK = 32767;
var WIDTH_MASK = 3;
var STYLE_ID_MASK = (1 << (32 - STYLE_SHIFT)) - 1;
var MAX_STYLE_INDEX = STYLE_ID_MASK >>> 1;
var STYLE_NEAR_CAPACITY = MAX_STYLE_INDEX >>> 1;
//@ chunk-bzr73sfg.js:204782-204822 layout
function packWord1(styleId, hyperlinkId, width) {
  return (styleId << STYLE_SHIFT) | (hyperlinkId << HYPERLINK_SHIFT) | width;
}
//@ chunk-bzr73sfg.js:204822-204978 layout
/**
 * 为屏幕写入创建原生 CellSegmenter（Bun.ant.CellSegmenter）：告诉原生代码格的编码（宽度掩码 3，窄/宽/右半占位/行尾占位 = 0/1/2/3，空格与占位的字符下标 0/1，空格的 word1，制表位宽）。substitute 是需要替换显示的码点集合。
 */
function createScreenSegmenter(substitute) {
  return assertCellSegmenter(substitute, {
    widthMask: WIDTH_MASK,
    narrow: 0,
    wide: 1,
    spacerTail: 2,
    spacerHead: 3,
    emptyCharIndex: EMPTY_CHAR_INDEX,
    spacerCharIndex: SPACER_CHAR_INDEX,
    emptyWord: packWord1(0, 0, 0),
    tabWidth: DEFAULT_TAB_WIDTH,
  });
}
//@ chunk-bzr73sfg.js:204978-204991 callgraph-witnessed = EMPTY_CELL_VALUE (0)
var cellSetter;
var EMPTY_CELL_VALUE = 0n;
//@ chunk-bzr73sfg.js:204991-205056 layout
/**
 * 把屏幕每格的字符下标设成占位（SPACER_CHAR_INDEX），用于强制下一帧整屏重画。
 */
function fillScreenWithSpacers(screen) {
  let cells = screen.cells;
  for (let index = 0; index < cells.length; index += 2) cells[index] = SPACER_CHAR_INDEX;
}
//@ chunk-bzr73sfg.js:205056-205222 layout
function screensEqual(a, b) {
  if (a.width !== b.width || a.height !== b.height) return false;
  let cellCount = a.width * a.height * 2;
  let cells = a.cells;
  let cells_2 = b.cells;
  for (let idx = 0; idx < cellCount; idx++) if (cells[idx] !== cells_2[idx]) return false;
  return true;
}
//@ chunk-bzr73sfg.js:205222-205409 layout
/**
 * 打包软换行标记：高 16 位为上一行内容结束列，低 15 位为本行起始列；第 15 位保留给 SW_ELIDED_SEP（折行处吞掉了分隔空格）。
 */
function packSoftWrap(prevRowEnd, startCol) {
  if (startCol > 32767)
    logForDebugging(
      `packSoftWrap: start column ${startCol} exceeds the 15-bit field; bit 15 is reserved for SW_ELIDED_SEP and will be corrupted`,
      {
        level: "error",
      },
    );
  return (prevRowEnd << 16) | (startCol & 32767);
}
//@ chunk-bzr73sfg.js:205409-205422 layout
var SW_ELIDED_SEP = 32768;
//@ chunk-bzr73sfg.js:205422-205452 layout
function softWrapStartCol(packed) {
  return packed & 32767;
}
//@ chunk-bzr73sfg.js:205452-205512 layout
var SoftWrapKind = {
  HardBreak: 0,
  Continuation: 1,
  ContinuationElidedSep: 2,
};
//@ chunk-bzr73sfg.js:205512-205576 layout
function isEmptyCellByIndex(screen, index) {
  let cellIndex = index << 1;
  return (screen.cells[cellIndex] | screen.cells[cellIndex | 1]) === 0;
}
//@ chunk-bzr73sfg.js:205576-205666 layout
function isEmptyCellAt(screen, x, y) {
  if (x < 0 || y < 0 || x >= screen.width || y >= screen.height) return true;
  return isEmptyCellByIndex(screen, y * screen.width + x);
}
//@ chunk-bzr73sfg.js:205666-205716 fingerprint = internHyperlink (1)
/**
 * 把超链接 URL 驻留进屏幕的超链接池，返回下标。
 */
function internHyperlink(screen, hyperlink) {
  return screen.hyperlinkPool.intern(hyperlink);
}
//@ chunk-bzr73sfg.js:205716-206180 fingerprint = createScreen (0.967)
/**
 * 创建屏幕缓冲：每格两个 Int32（字符下标、packWord1），同一块内存再用 BigInt64Array 视图做整格比较/清零；另有 noSelect（不可选中的格）、softWrap（每行的软换行标记）、damage（本帧改动矩形）。池子（字符/超链接/样式）在新旧两帧之间共享。
 */
function createScreen(width, height, styles, charPool, hyperlinkPool) {
  ifNotInteger(width, "createScreen width");
  ifNotInteger(height, "createScreen height");
  if (!Number.isInteger(width) || width < 0) width = Math.max(0, Math.floor(width) || 0);
  if (!Number.isInteger(height) || height < 0) height = Math.max(0, Math.floor(height) || 0);
  let cellCount = width * height;
  let buffer = new ArrayBuffer(cellCount << 3);
  let cells = new Int32Array(buffer);
  let cells64 = new BigInt64Array(buffer);
  return {
    width,
    height,
    cells,
    cells64,
    charPool,
    hyperlinkPool,
    emptyStyleId: styles.none,
    atlasRecorder: styles.atlasRecorder,
    damage: undefined,
    noSelect: new Uint8Array(cellCount),
    softWrap: new Int32Array(height),
  };
}
//@ chunk-bzr73sfg.js:206180-206677 fingerprint = resetScreen (1)
/**
 * 把屏幕重置为指定尺寸并清空（容量不够才重新分配），damage 清掉。
 */
function resetScreen(screen, width, height) {
  ifNotInteger(width, "resetScreen width");
  ifNotInteger(height, "resetScreen height");
  if (!Number.isInteger(width) || width < 0) width = Math.max(0, Math.floor(width) || 0);
  if (!Number.isInteger(height) || height < 0) height = Math.max(0, Math.floor(height) || 0);
  let size = width * height;
  if (screen.cells64.length < size) {
    let buf = new ArrayBuffer(size << 3);
    screen.cells = new Int32Array(buf);
    screen.cells64 = new BigInt64Array(buf);
    screen.noSelect = new Uint8Array(size);
  }
  if (screen.softWrap.length < height) screen.softWrap = new Int32Array(height);
  screen.cells64.fill(EMPTY_CELL_VALUE, 0, size);
  screen.noSelect.fill(0, 0, size);
  screen.softWrap.fill(0, 0, height);
  screen.width = width;
  screen.height = height;
  screen.damage = undefined;
}
//@ chunk-bzr73sfg.js:206677-207029 fingerprint = migrateScreenPools (1)
/**
 * 池子换代（字符池/超链接池重建、样式池 compact）后，把屏幕里每格的下标迁移到新池。
 */
function migrateScreenPools(screen, newCharPool, newHyperlinkPool, remapStyle) {
  let { charPool: oldCharPool, hyperlinkPool } = screen;
  let charPoolChanged = oldCharPool !== newCharPool;
  let linkPoolChanged = hyperlinkPool !== newHyperlinkPool;
  if (!charPoolChanged && !linkPoolChanged && !remapStyle) return;
  let cellCount = screen.width * screen.height;
  let cells = screen.cells;
  for (let ci = 0; ci < cellCount << 1; ci += 2) {
    if (charPoolChanged) {
      let oldCharId = cells[ci];
      cells[ci] = newCharPool.intern(oldCharPool.get(oldCharId));
    }
    let word1 = cells[ci + 1];
    let oldHyperlinkId = (word1 >>> HYPERLINK_SHIFT) & HYPERLINK_MASK;
    let oldStyleId = word1 >>> STYLE_SHIFT;
    let newHyperlinkId =
      linkPoolChanged && oldHyperlinkId !== 0
        ? newHyperlinkPool.intern(hyperlinkPool.get(oldHyperlinkId))
        : oldHyperlinkId;
    let newStyleId = remapStyle && oldStyleId !== 0 ? remapStyle(oldStyleId) : oldStyleId;
    if (newHyperlinkId !== oldHyperlinkId || newStyleId !== oldStyleId) {
      let width = word1 & WIDTH_MASK;
      cells[ci + 1] = packWord1(newStyleId, newHyperlinkId, width);
    }
  }
  screen.charPool = newCharPool;
  screen.hyperlinkPool = newHyperlinkPool;
}
//@ chunk-bzr73sfg.js:207029-207118 callgraph-witnessed = cellAt (1)
/**
 * 读 (x,y) 的格（越界返回 undefined）：{char, styleId, width, hyperlink}。
 */
function cellAt(screen, x, y) {
  if (x < 0 || y < 0 || x >= screen.width || y >= screen.height) return;
  return cellAtIndex(screen, y * screen.width + x);
}
//@ chunk-bzr73sfg.js:207118-207286 fingerprint = cellAtIndex (1)
/**
 * 按线性下标读格。
 */
function cellAtIndex(screen, index) {
  let cellIndex = index << 1;
  let word1 = screen.cells[cellIndex + 1];
  let hid = (word1 >>> HYPERLINK_SHIFT) & HYPERLINK_MASK;
  return {
    char: screen.charPool.get(screen.cells[cellIndex]),
    styleId: word1 >>> STYLE_SHIFT,
    width: word1 & WIDTH_MASK,
    hyperlink: hid === 0 ? undefined : screen.hyperlinkPool.get(hid),
  };
}
//@ chunk-bzr73sfg.js:207286-207514 fingerprint = visibleCellAtIndex (1)
/**
 * diff 输出用：读格，但跳过宽字符占位格，以及与上次输出样式相同的空白格（无需重画）。
 */
function visibleCellAtIndex(cells, charPool, hyperlinkPool, index, lastRenderedStyleId) {
  let cellIndex = index << 1;
  let charId = cells[cellIndex];
  if (charId === 1) return;
  let word1 = cells[cellIndex + 1];
  if (charId === 0 && (word1 & 262140) === 0) {
    let fgStyle = word1 >>> STYLE_SHIFT;
    if (fgStyle === 0 || fgStyle === lastRenderedStyleId) return;
  }
  let hid = (word1 >>> HYPERLINK_SHIFT) & HYPERLINK_MASK;
  return {
    char: charPool.get(charId),
    styleId: word1 >>> STYLE_SHIFT,
    width: word1 & WIDTH_MASK,
    hyperlink: hid === 0 ? undefined : hyperlinkPool.get(hid),
  };
}
//@ chunk-bzr73sfg.js:207514-207684 layout = cellAtIndex (1)
/**
 * 按 cells 数组下标（格下标×2）把格读进调用方提供的 out 对象，避免分配；diff 热路径用。
 */
function cellAtCI(screen, ci, out) {
  let wordIndex = ci | 1;
  let word1 = screen.cells[wordIndex];
  out.char = screen.charPool.get(screen.cells[ci]);
  out.styleId = word1 >>> STYLE_SHIFT;
  out.width = word1 & WIDTH_MASK;
  let hid = (word1 >>> HYPERLINK_SHIFT) & HYPERLINK_MASK;
  out.hyperlink = hid === 0 ? undefined : screen.hyperlinkPool.get(hid);
}
//@ chunk-bzr73sfg.js:207684-207802 fingerprint = charInCellAt (1)
/**
 * 读 (x,y) 格的字符。
 */
function charInCellAt(screen, x, y) {
  if (x < 0 || y < 0 || x >= screen.width || y >= screen.height) return;
  let ci = (y * screen.width + x) << 1;
  return screen.charPool.get(screen.cells[ci]);
}
//@ chunk-bzr73sfg.js:207802-208043 file-local
/**
 * 写一个格：字符驻留后调用原生 CellSegmenter.setCell（处理宽字符右半占位、覆盖宽字符时清孤儿格等），用返回的打包值扩大 damage；图集记录开启时记下组合。
 */
function setCellAt(screen, x, y, cell) {
  if (x < 0 || y < 0 || x >= screen.width || y >= screen.height) return;
  cellSetter ??= createScreenSegmenter([]);
  let charIndex = internCharString(screen, cell.char);
  let packed = cellSetter.setCell(
    screen.cells,
    screen.width,
    x,
    y,
    charIndex,
    packWord1(cell.styleId, internHyperlink(screen, cell.hyperlink), cell.width),
  );
  addDamageFromPacked(screen, y, packed);
  let atlasRecorder = screen.atlasRecorder;
  if (atlasRecorder.recording) atlasRecorder.record(charIndex, cell.styleId);
}
//@ chunk-bzr73sfg.js:208043-208209 fingerprint = diffEach (1)
/**
 * 原生 CellSegmenter 返回值打包格式：结束列 + 改动起始列·2^20 + 改动结束列·2^36；取出改动区间并入屏幕的 damage 矩形。
 */
function addDamageFromPacked(screen, row, packed) {
  let startCol = Math.floor(packed / 1048576) % 65536;
  let endCol = Math.floor(packed / 68719476736);
  if (startCol >= endCol) return;
  let rect = {
    x: startCol,
    y: row,
    width: endCol - startCol,
    height: 1,
  };
  screen.damage = screen.damage ? unionRect(screen.damage, rect) : rect;
}
//@ chunk-bzr73sfg.js:208209-208487 file-local
/**
 * 用 CellSegmenter.paint 把上一次 segment() 切出的字素/样式段写到 (x,y) 起的一行，更新 damage、图集记录，返回写完后的列。
 */
function paintSegments(screen, x, y, segmenter) {
  let packed = segmenter.paint(screen.cells, screen.width, x, y, screen.hyperlinkPool);
  addDamageFromPacked(screen, y, packed);
  let atlasRecorder = screen.atlasRecorder;
  if (atlasRecorder.recording) {
    let firstCol = Math.floor(packed / 1048576) % 65536;
    let floored = Math.floor(packed / 68719476736);
    let cells = screen.cells;
    for (
      let col = firstCol, cellIndex = (y * screen.width + firstCol) << 1;
      col < floored;
      col++, cellIndex += 2
    )
      atlasRecorder.record(cells[cellIndex], cells[cellIndex + 1] >>> STYLE_SHIFT);
  }
  return packed % 1048576;
}
//@ chunk-bzr73sfg.js:208487-208520 layout
function isMultiCodeUnitGrapheme(char) {
  return char.length > 2;
}
//@ chunk-bzr73sfg.js:208520-208935 fingerprint = setCellAt (0.918)
/**
 * 后处理 damage 区域：宽字素（如 emoji 序列）实际显示宽度超出右边界时，换成占位字符并把到行尾的格清成空格，避免终端换行错位。
 */
function clampWideGraphemesAtRightEdge(screen) {
  let damage = screen.damage;
  if (!damage) return;
  let lastCol = Math.min(screen.width - 2, damage.x + damage.width - 1);
  let endRow = Math.min(screen.height, damage.y + damage.height);
  for (let row = damage.y; row < endRow; row++)
    for (let col = damage.x; col <= lastCol; col++) {
      if ((screen.cells[((row * screen.width + col) << 1) + 1] & WIDTH_MASK) !== 1) continue;
      let cell = cellAt(screen, col, row);
      if (!cell || !isMultiCodeUnitGrapheme(cell.char)) continue;
      let glyphWidth = Math.max(2, bunStringWidth(cell.char));
      if (col + glyphWidth < screen.width) continue;
      for (let col_2 = col; col_2 < screen.width; col_2++)
        setCellAt(screen, col_2, row, {
          char: col_2 === col ? ELLIPSIS : " ",
          styleId: cell.styleId,
          width: 0,
          hyperlink: cell.hyperlink,
        });
    }
}
//@ chunk-bzr73sfg.js:208935-209318 fingerprint = setCellStyleId (1)
/**
 * 只改一个格的 styleId（宽字符占位格跳过），并扩大 damage；选区高亮、搜索高亮用。
 */
function setCellStyleId(screen, x, y, styleId) {
  if (x < 0 || y < 0 || x >= screen.width || y >= screen.height) return;
  let cellIndex = (y * screen.width + x) << 1;
  let cells = screen.cells;
  let word1 = cells[cellIndex + 1];
  let width = word1 & WIDTH_MASK;
  if (width === 2 || width === 3) return;
  let hid = (word1 >>> HYPERLINK_SHIFT) & HYPERLINK_MASK;
  cells[cellIndex + 1] = packWord1(styleId, hid, width);
  let damage = screen.damage;
  if (damage) {
    let damageRight = damage.x + damage.width;
    let damageBottom = damage.y + damage.height;
    if (x < damage.x) {
      damage.width += damage.x - x;
      damage.x = x;
    } else if (x >= damageRight) damage.width = x - damage.x + 1;
    if (y < damage.y) {
      damage.height += damage.y - y;
      damage.y = y;
    } else if (y >= damageBottom) damage.height = y - damage.y + 1;
  } else
    screen.damage = {
      x,
      y,
      width: 1,
      height: 1,
    };
}
//@ chunk-bzr73sfg.js:209318-209363 fingerprint = internCharString (1)
/**
 * 把字符驻留进屏幕字符池。
 */
function internCharString(screen, char) {
  return screen.charPool.intern(char);
}
//@ chunk-bzr73sfg.js:209363-210531 fingerprint = blitRegion (1)
/**
 * 把上一帧屏幕的一个矩形区域整块拷进当前帧（渲染缓存命中时跳过重画子树），连同 noSelect 和 softWrap；整行时一次 set。随后修补区域左右边界被切开的宽字符（清掉孤儿半格），并把区域并入 damage。
 */
function blitRegion(dst, src, regionX, regionY, maxX, maxY) {
  regionX = Math.max(0, regionX);
  regionY = Math.max(0, regionY);
  if (regionX >= maxX || regionY >= maxY) return;
  let regionWidth = maxX - regionX;
  let srcStride = src.width << 1;
  let dstStride = dst.width << 1;
  let rowCells = regionWidth << 1;
  let srcCells = src.cells;
  let dstCells = dst.cells;
  let srcNoSel = src.noSelect;
  let dstNoSel = dst.noSelect;
  dst.softWrap.set(src.softWrap.subarray(regionY, maxY), regionY);
  if (regionX === 0 && maxX === src.width && src.width === dst.width) {
    let srcStart = regionY * srcStride;
    let totalBytes = (maxY - regionY) * srcStride;
    dstCells.set(srcCells.subarray(srcStart, srcStart + totalBytes), srcStart);
    let nsStart = regionY * src.width;
    let nsLen = (maxY - regionY) * src.width;
    dstNoSel.set(srcNoSel.subarray(nsStart, nsStart + nsLen), nsStart);
  } else {
    let srcRowCI = regionY * srcStride + (regionX << 1);
    let dstRowCI = regionY * dstStride + (regionX << 1);
    let srcRowNS = regionY * src.width + regionX;
    let dstRowNS = regionY * dst.width + regionX;
    for (let y = regionY; y < maxY; y++) {
      dstCells.set(srcCells.subarray(srcRowCI, srcRowCI + rowCells), dstRowCI);
      dstNoSel.set(srcNoSel.subarray(srcRowNS, srcRowNS + regionWidth), dstRowNS);
      srcRowCI += srcStride;
      dstRowCI += dstStride;
      srcRowNS += src.width;
      dstRowNS += dst.width;
    }
  }
  let leftEdge = regionX > 0;
  let rightEdge = maxX < dst.width;
  let widenedLeft = false;
  let widenedRight = 0;
  if (leftEdge || rightEdge) {
    let leftCellIndex = (regionY * dst.width + regionX - 1) << 1;
    let rightCellIndex = (regionY * dst.width + maxX - 1) << 1;
    for (let y = regionY; y < maxY; y++) {
      if (leftEdge) {
        let nextWidth = dstCells[leftCellIndex + 3] & WIDTH_MASK;
        if ((dstCells[leftCellIndex + 1] & WIDTH_MASK) === 1) {
          if (nextWidth !== 2) {
            dstCells[leftCellIndex] = EMPTY_CHAR_INDEX;
            dstCells[leftCellIndex + 1] = packWord1(dst.emptyStyleId, 0, 0);
            widenedLeft = true;
          }
        } else if (nextWidth === 2) {
          dstCells[leftCellIndex + 2] = EMPTY_CHAR_INDEX;
          dstCells[leftCellIndex + 3] = packWord1(dst.emptyStyleId, 0, 0);
        }
      }
      if (rightEdge) {
        if ((dstCells[rightCellIndex + 1] & WIDTH_MASK) === 1) {
          if (
            maxX + 1 < dst.width &&
            (dstCells[rightCellIndex + 3] & WIDTH_MASK) === 1 &&
            (dstCells[rightCellIndex + 5] & WIDTH_MASK) === 2
          ) {
            dstCells[rightCellIndex + 4] = EMPTY_CHAR_INDEX;
            dstCells[rightCellIndex + 5] = packWord1(dst.emptyStyleId, 0, 0);
            widenedRight = 2;
          } else if (widenedRight < 1) widenedRight = 1;
          dstCells[rightCellIndex + 2] = SPACER_CHAR_INDEX;
          dstCells[rightCellIndex + 3] = packWord1(dst.emptyStyleId, 0, 2);
        } else if ((dstCells[rightCellIndex + 3] & WIDTH_MASK) === 2) {
          dstCells[rightCellIndex + 2] = EMPTY_CHAR_INDEX;
          dstCells[rightCellIndex + 3] = packWord1(dst.emptyStyleId, 0, 0);
          if (widenedRight < 1) widenedRight = 1;
        }
      }
      leftCellIndex += dstStride;
      rightCellIndex += dstStride;
    }
  }
  let damageX = widenedLeft ? regionX - 1 : regionX;
  let damageRight = maxX + widenedRight;
  let damageRect = {
    x: damageX,
    y: regionY,
    width: damageRight - damageX,
    height: maxY - regionY,
  };
  if (dst.damage) dst.damage = unionRect(dst.damage, damageRect);
  else dst.damage = damageRect;
}
//@ chunk-bzr73sfg.js:210531-211066 fingerprint = shiftRows (1)
/**
 * 把 [top,bottom] 行区间整体上移（n>0）或下移 n 行并清空腾出的行（cells、noSelect、softWrap 一起），用于滚动优化（DECSTBM 滚动区域）。
 */
function shiftRows(screen, top, bottom, n) {
  if (n === 0 || top < 0 || bottom >= screen.height || top > bottom) return;
  let { width, cells64, noSelect: noSel, softWrap } = screen;
  if (Math.abs(n) > bottom - top) {
    cells64.fill(EMPTY_CELL_VALUE, top * width, (bottom + 1) * width);
    noSel.fill(0, top * width, (bottom + 1) * width);
    softWrap.fill(0, top, bottom + 1);
    return;
  }
  if (n > 0) {
    cells64.copyWithin(top * width, (top + n) * width, (bottom + 1) * width);
    noSel.copyWithin(top * width, (top + n) * width, (bottom + 1) * width);
    softWrap.copyWithin(top, top + n, bottom + 1);
    cells64.fill(EMPTY_CELL_VALUE, (bottom - n + 1) * width, (bottom + 1) * width);
    noSel.fill(0, (bottom - n + 1) * width, (bottom + 1) * width);
    softWrap.fill(0, bottom - n + 1, bottom + 1);
  } else {
    cells64.copyWithin((top - n) * width, top * width, (bottom + n + 1) * width);
    noSel.copyWithin((top - n) * width, top * width, (bottom + n + 1) * width);
    softWrap.copyWithin(top - n, top, bottom + n + 1);
    cells64.fill(EMPTY_CELL_VALUE, top * width, (top - n) * width);
    noSel.fill(0, top * width, (top - n) * width);
    softWrap.fill(0, top, top - n);
  }
}
//@ chunk-bzr73sfg.js:211066-211147 fingerprint = OSC8_REGEX (1)
var OSC8_REGEX; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var OSC8_PREFIX;
deferInit("chunk-bzr73sfg.js:211066", () => {
  OSC8_REGEX = new RegExp(`^${ESC}\\]8${SEP}${SEP}([^${BEL_2}]*)${BEL_2}$`);
  OSC8_PREFIX = `${ESC}]8${SEP}`;
});
//@ chunk-bzr73sfg.js:211147-211623 layout = diffEach (1)
/**
 * 逐格比较两帧，只在 damage 区域（两帧 damage 之并，加上尺寸缩小露出的区域）内调用 cb(x, y, prevCell, nextCell)；cb 返回真则提前结束。宽度相同走 diffSameWidth，否则 diffDifferentWidth。
 */
function diffEach(prev, next, cb) {
  let prevWidth = prev.width;
  let nextWidth = next.width;
  let prevHeight = prev.height;
  let nextHeight = next.height;
  let region;
  if (prevWidth === 0 && prevHeight === 0)
    region = {
      x: 0,
      y: 0,
      width: nextWidth,
      height: nextHeight,
    };
  else if (next.damage) {
    region = next.damage;
    if (prev.damage) region = unionRect(region, prev.damage);
  } else if (prev.damage) region = prev.damage;
  else
    region = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
  if (prevHeight > nextHeight)
    region = unionRect(region, {
      x: 0,
      y: nextHeight,
      width: prevWidth,
      height: prevHeight - nextHeight,
    });
  if (prevWidth > nextWidth)
    region = unionRect(region, {
      x: nextWidth,
      y: 0,
      width: prevWidth - nextWidth,
      height: prevHeight,
    });
  let maxHeight = Math.max(prevHeight, nextHeight);
  let maxWidth = Math.max(prevWidth, nextWidth);
  let endY = Math.min(region.y + region.height, maxHeight);
  let endX = Math.min(region.x + region.width, maxWidth);
  if (prevWidth === nextWidth) return diffSameWidth(prev, next, region.x, endX, region.y, endY, cb);
  return diffDifferentWidth(prev, next, region.x, endX, region.y, endY, cb);
}
//@ chunk-bzr73sfg.js:211623-211726 layout
function findNextDiff(prevCells, nextCells, ci, count) {
  for (let i = 0; i < count; i++, ci += 2) {
    let wordIndex = ci | 1;
    if (prevCells[ci] !== nextCells[ci] || prevCells[wordIndex] !== nextCells[wordIndex]) return i;
  }
  return count;
}
//@ chunk-bzr73sfg.js:211726-211888 layout
function diffRowBoth(prevCells, nextCells, prev, next, rowCI, y, startX, endX, prevCell, nextCell, cb) {
  let x = startX;
  while (x < endX) {
    let skip = findNextDiff(prevCells, nextCells, rowCI, endX - x);
    x += skip;
    rowCI += skip << 1;
    if (x >= endX) break;
    cellAtCI(prev, rowCI, prevCell);
    cellAtCI(next, rowCI, nextCell);
    if (cb(x, y, prevCell, nextCell)) return true;
    x++;
    rowCI += 2;
  }
  return false;
}
//@ chunk-bzr73sfg.js:211888-211987 layout
function diffRowRemoved(prev, rowCI, y, startX, endX, prevCell, cb) {
  for (let x = startX; x < endX; x++, rowCI += 2) {
    cellAtCI(prev, rowCI, prevCell);
    if (cb(x, y, prevCell, undefined)) return true;
  }
  return false;
}
//@ chunk-bzr73sfg.js:211987-212122 layout
function diffRowAdded(nextCells, next, rowCI, y, startX, endX, nextCell, cb) {
  for (let x = startX; x < endX; x++, rowCI += 2) {
    if (nextCells[rowCI] === 0 && nextCells[rowCI | 1] === 0) continue;
    cellAtCI(next, rowCI, nextCell);
    if (cb(x, y, undefined, nextCell)) return true;
  }
  return false;
}
//@ chunk-bzr73sfg.js:212122-212517 fingerprint = diffSameWidth (1)
/**
 * 两帧宽度相同时的逐行 diff：两帧都有的行跳过相同格；只在旧帧的行报删除；只在新帧的行报新增（跳过全空格）。
 */
function diffSameWidth(prev, next, startX, endX, startY, endY, cb) {
  let prevCells = prev.cells;
  let nextCells = next.cells;
  let { width, height } = prev;
  let prevHeight = next.height;
  let stride = width << 1;
  let prevCell = {
    char: " ",
    styleId: 0,
    width: 0,
    hyperlink: undefined,
  };
  let nextCell = {
    char: " ",
    styleId: 0,
    width: 0,
    hyperlink: undefined,
  };
  let rowEndX = Math.min(endX, width);
  let rowCI = (startY * width + startX) << 1;
  for (let y = startY; y < endY; y++) {
    let prevIn = y < height;
    let nextIn = y < prevHeight;
    if (prevIn && nextIn) {
      if (diffRowBoth(prevCells, nextCells, prev, next, rowCI, y, startX, rowEndX, prevCell, nextCell, cb))
        return true;
    } else if (prevIn) {
      if (diffRowRemoved(prev, rowCI, y, startX, rowEndX, prevCell, cb)) return true;
    } else if (nextIn) {
      if (diffRowAdded(nextCells, next, rowCI, y, startX, rowEndX, nextCell, cb)) return true;
    }
    rowCI += stride;
  }
  return false;
}
//@ chunk-bzr73sfg.js:212517-213222 layout = diffSameWidth (1)
/**
 * 两帧宽度不同时的逐行 diff（各自步长），同样分公共列、旧帧多出的列、新帧多出的列。
 */
function diffDifferentWidth(prev, next, startX, endX, startY, endY, cb) {
  let prevWidth = prev.width;
  let nextWidth = next.width;
  let prevCells = prev.cells;
  let nextCells = next.cells;
  let prevCell = {
    char: " ",
    styleId: 0,
    width: 0,
    hyperlink: undefined,
  };
  let nextCell = {
    char: " ",
    styleId: 0,
    width: 0,
    hyperlink: undefined,
  };
  let prevStride = prevWidth << 1;
  let nextStride = nextWidth << 1;
  let prevRowCI = (startY * prevWidth + startX) << 1;
  let nextRowCI = (startY * nextWidth + startX) << 1;
  for (let y = startY; y < endY; y++) {
    let prevIn = y < prev.height;
    let nextIn = y < next.height;
    let prevEndX = prevIn ? Math.min(endX, prevWidth) : startX;
    let nextEndX = nextIn ? Math.min(endX, nextWidth) : startX;
    let bothEndX = Math.min(prevEndX, nextEndX);
    let prevCI = prevRowCI;
    let nextCI = nextRowCI;
    for (let x = startX; x < bothEndX; x++) {
      if (prevCells[prevCI] === nextCells[nextCI] && prevCells[prevCI + 1] === nextCells[nextCI + 1]) {
        prevCI += 2;
        nextCI += 2;
        continue;
      }
      cellAtCI(prev, prevCI, prevCell);
      cellAtCI(next, nextCI, nextCell);
      prevCI += 2;
      nextCI += 2;
      if (cb(x, y, prevCell, nextCell)) return true;
    }
    if (prevEndX > bothEndX) {
      prevCI = prevRowCI + ((bothEndX - startX) << 1);
      for (let x = bothEndX; x < prevEndX; x++) {
        cellAtCI(prev, prevCI, prevCell);
        prevCI += 2;
        if (cb(x, y, prevCell, undefined)) return true;
      }
    }
    if (nextEndX > bothEndX) {
      nextCI = nextRowCI + ((bothEndX - startX) << 1);
      for (let x = bothEndX; x < nextEndX; x++) {
        if (nextCells[nextCI] === 0 && nextCells[nextCI | 1] === 0) {
          nextCI += 2;
          continue;
        }
        cellAtCI(next, nextCI, nextCell);
        nextCI += 2;
        if (cb(x, y, undefined, nextCell)) return true;
      }
    }
    prevRowCI += prevStride;
    nextRowCI += nextStride;
  }
  return false;
}
//@ chunk-bzr73sfg.js:213222-213261 layout
function markNoSelect(screen, x, y, width, height) {
  markNoSelectRegion(screen, x, y, width, height, 1);
}
//@ chunk-bzr73sfg.js:213261-213300 layout
function clearNoSelect(screen, x, y, width, height) {
  markNoSelectRegion(screen, x, y, width, height, 0);
}
//@ chunk-bzr73sfg.js:213300-213577 layout
/**
 * 把源屏幕一个矩形区域的 noSelect 标记拷到目标屏幕。
 */
function copyNoSelectRegion(dst, src, x1, y1, x2, y2) {
  let max = Math.max(0, x1);
  let max_2 = Math.max(0, y1);
  let min = Math.min(x2, dst.width, src.width);
  let maxY = Math.min(y2, dst.height, src.height);
  if (max >= min || max_2 >= maxY) return;
  let noSelect = src.noSelect;
  let noSelect_2 = dst.noSelect;
  let width = min - max;
  let srcIndex = max_2 * src.width + max;
  let dstIndex = max_2 * dst.width + max;
  for (let row = max_2; row < maxY; row++) {
    noSelect_2.set(noSelect.subarray(srcIndex, srcIndex + width), dstIndex);
    srcIndex += src.width;
    dstIndex += dst.width;
  }
}
//@ chunk-bzr73sfg.js:213577-213752 fingerprint = markNoSelectRegion (1)
/**
 * 把矩形区域的 noSelect 置为 value（<NoSelect> 包住的内容、行号栏等不参与选区复制）。
 */
function markNoSelectRegion(screen, x, y, width, height, value) {
  let maxX = Math.min(x + width, screen.width);
  let maxY = Math.min(y + height, screen.height);
  let { noSelect, width: width_2 } = screen;
  for (let row = Math.max(0, y); row < maxY; row++) {
    let rowStart = row * width_2;
    noSelect.fill(value, rowStart + Math.max(0, x), rowStart + maxX);
  }
}
//@ chunk-bzr73sfg.js:285211-285346 placement
var UNREADABLE_TEXT = "[unreadable text]";
var UNREADABLE_FALLBACKS = [UNREADABLE_TEXT, "[unreadable]", "[?]"];
var MARK_OR_CONTROL_RE = /^[\p{M}\p{Cc}\p{Cf}]?$/u;
var WIDE_AMBIGUOUS_OPTS = {
  ambiguousIsNarrow: false,
};
var UNASSIGNED_OR_EMOJI_RE = /[\p{Cn}\p{Emoji}]/u;
//@ chunk-bzr73sfg.js:285346-285537 placement
/**
 * 保守估计显示宽度：未分配码点与 emoji 按 2、东亚歧义宽度按宽，取逐字素累加与整串宽度的较大者。
 */
function conservativeWidth(text) {
  let width = 0;
  for (let char of text) {
    let codePoint = char.codePointAt(0) ?? 0;
    width +=
      codePoint > 127 && UNASSIGNED_OR_EMOJI_RE.test(char)
        ? 2
        : Math.max(
            1,
            Bun.stringWidth(codePoint >= 55296 && codePoint <= 57343 ? "\uFFFD" : char, WIDE_AMBIGUOUS_OPTS),
          );
  }
  return Math.max(width, Bun.stringWidth(text, WIDE_AMBIGUOUS_OPTS));
}
//@ chunk-bzr73sfg.js:285537-286172 fingerprint = isEmptyCellByIndex (0.534)
/**
 * 按保守宽度把文本折成多行（不超过 maxWidth）：单个字素都放不下时用 "[unreadable text]" 等占位替代，优先在空格处断行。
 */
function wrapTextConservatively(screen, maxWidth) {
  let fallback = UNREADABLE_FALLBACKS.find((candidate) => conservativeWidth(candidate) <= maxWidth) ?? "?";
  let fallbackCell = {
    text: fallback,
    cells: conservativeWidth(fallback),
  };
  let cells = [];
  for (let { segment } of getGraphemeSegmenter().segment(normalizeFullWidthSpace(screen))) {
    let width = conservativeWidth(segment);
    if (width <= maxWidth) {
      cells.push({
        text: segment,
        cells: width,
      });
      continue;
    }
    let list = Array.from(segment);
    let index = list.findIndex((char) => Array.from(getGraphemeSegmenter().segment(`${char}a`)).length > 1);
    let char = list[index] ?? "";
    let width_2 = conservativeWidth(char);
    let isRenderable = !MARK_OR_CONTROL_RE.test(char) && width_2 <= maxWidth;
    if ((!isRenderable || index > 0) && cells.at(-1) !== fallbackCell) cells.push(fallbackCell);
    if (isRenderable) {
      cells.push({
        text: char,
        cells: width_2,
      });
      if (index < list.length - 1) cells.push(fallbackCell);
    }
  }
  let lines = [];
  let start = 0;
  while (start < cells.length) {
    let end = start;
    let lineWidth = 0;
    let lastSpaceBreak = start;
    while (end < cells.length && lineWidth + cells[end].cells <= maxWidth) {
      lineWidth += cells[end].cells;
      end++;
      if (cells[end - 1].text === " ") lastSpaceBreak = end;
    }
    if (end === start) end++;
    else if (end < cells.length && cells[end].text !== " " && lastSpaceBreak > start) end = lastSpaceBreak;
    lines.push(
      cells
        .slice(start, end)
        .map((cell) => cell.text)
        .join(""),
    );
    start = end;
  }
  return lines;
}
//@ chunk-bc20zedk.js:11835-11866 fingerprint = BOLD_CODE (0.759)
var BOLD_OPEN = "\x1B[1m";
var BOLD_CLOSE = "\x1B[22m";
//@ chunk-ag5x7vhf.js:18368-18504 fingerprint = isEmptyCellAt (0.664)
function ScrollAnchor() {
  let $ = useMemoCache(2);
  let contextRef = useContext(ScrollAnchorContext);
  let fallbackRef = useRef(null);
  const ref = contextRef ?? fallbackRef;
  let element;
  if ($[0] !== ref) {
    element = jsxProd_default(BaseBox, {
      ref,
      height: 0,
    });
    $[0] = ref;
    $[1] = element;
  } else element = $[1];
  return element;
}
export {
  clamp,
  ScrollAnchor,
  isEmptyCellAt,
  cellAt,
  softWrapStartCol,
  cellAtIndex,
  setCellStyleId,
  inverseText,
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
  createScreen,
  BOLD_OPEN,
  BOLD_CLOSE,
  screensEqual,
  diffEach,
  charInCellAt,
  visibleCellAtIndex,
  isMultiCodeUnitGrapheme,
  clampWideGraphemesAtRightEdge,
  StylePool,
  CharPool,
  HyperlinkPool,
  fillScreenWithSpacers,
  conservativeWidth,
  wrapTextConservatively,
  STYLE_POOL_SOFT_LIMIT,
  migrateScreenPools,
  OSC8_PREFIX,
};
