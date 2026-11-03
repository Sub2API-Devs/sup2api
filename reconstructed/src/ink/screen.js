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
import { mYr } from "./terminalColorSupport.js";
import { logForDebugging } from "../utils/debug.js";
import { VEt } from "../../vendor/@alcalzone/ansi-tokenize/build/ansiCodes.js";
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
import { p } from "./colorize.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { Se, R } from "../../vendor/react/cjs/react.production.js";
import { ScrollAnchorContext } from "./outputReplay.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BaseBox } from "./components/Box.js";

/**
 * 把数值限制在 [min, max]。
 */
//@ chunk-bzr73sfg.js:199617-199701 placement
function clamp(value, min, max) {
  if (min !== void 0 && value < min) return min;
  if (max !== void 0 && value > max) return max;
  return value;
}
/**
 * 样式池监控（记录键、饱和、主动重置统计）。
 */
//@ chunk-bzr73sfg.js:199701-200485 placement
class StylePoolMonitor {
  recording = !1;
  autoResetEnabled = !1;
  debugTainted = !1;
  stylePoolHealthyReported = !1;
  stylePoolCapHitReported = !1;
  keys = new Set();
  saturatedLatch = !1;
  maxKeys = 131072;
  proactiveResetCount = 0;
  lastProactiveResetReason = "none";
  lastProactiveResetAt = 0;
  record(n, u) {
    if (n < 2) return;
    if (this.keys.size >= this.maxKeys) {
      this.saturatedLatch = !0;
      return;
    }
    this.keys.add(n * 32768 + u);
  }
  get size() {
    return this.keys.size;
  }
  get saturated() {
    return this.saturatedLatch;
  }
  reset() {
    (this.keys.clear(), (this.saturatedLatch = !1));
  }
  setMaxKeys(n) {
    this.maxKeys = n ?? 131072;
  }
  recordProactiveReset(n) {
    (this.proactiveResetCount++,
      (this.lastProactiveResetReason = n),
      (this.lastProactiveResetAt = performance.now()));
  }
  get proactiveResetStats() {
    return {
      count: this.proactiveResetCount,
      lastReason: this.lastProactiveResetReason,
      lastResetAt: this.lastProactiveResetAt,
    };
  }
}
/**
 * 粗体与暗淡共用关闭码 SGR 22：从同时有粗体/暗淡切到只保留其一时，先输出 22 再补回保留的那个；返回需要前置的序列。
 */
//@ chunk-bzr73sfg.js:200485-200706 placement
function boldDimResetPrefix(fromStyles, toStyles) {
  let fromMask = 0,
    toMask = 0;
  for (let style of fromStyles)
    if (style.code === SGR_BOLD) fromMask |= 1;
    else if (style.code === SGR_DIM) fromMask |= 2;
  for (let p of toStyles)
    if (p.code === SGR_BOLD) toMask |= 1;
    else if (p.code === SGR_DIM) toMask |= 2;
  if (fromMask & ~toMask && toMask) {
    let keepMask = fromMask & toMask;
    return SGR_NORMAL_INTENSITY + (keepMask & 1 ? SGR_BOLD : "") + (keepMask & 2 ? SGR_DIM : "");
  }
  return "";
}
/**
 * 样式里已有某种颜色码（mYr 判断）时去掉暗淡码，供反显/选区背景等派生样式使用。
 */
//@ chunk-bzr73sfg.js:200706-200783 placement
function dropDimIfColored(styles) {
  return styles.some((style) => mYr(style.code)) ? styles.filter((u) => u.code !== SGR_DIM) : styles;
}
/**
 * 字符驻留池：字符串 → 下标；ASCII 单字符走 128 项快表；下标 0 是空格、1 是空串（宽字符的占位格）。
 */
//@ chunk-bzr73sfg.js:200783-201232 fingerprint = CharPool (1)
class CharPool {
  strings = [" ", ""];
  stringMap = new Map([
    [" ", 0],
    ["", 1],
  ]);
  ascii = initCharAscii();
  intern(n) {
    if (n.length === 1) {
      let code = n.charCodeAt(0);
      if (code < 128) {
        let p = this.ascii[code];
        if (p !== -1) return p;
        let g = this.strings.length;
        return (this.strings.push(n), (this.ascii[code] = g), g);
      }
    }
    let u = this.stringMap.get(n);
    if (u !== void 0) return u;
    let f = this.strings.length;
    return (this.strings.push(n), this.stringMap.set(n, f), f);
  }
  get(n) {
    return this.strings[n] ?? " ";
  }
  get size() {
    return this.strings.length;
  }
}
//@ chunk-bzr73sfg.js:201232-201259 layout
var STYLE_POOL_SOFT_LIMIT = 4096,
  STYLE_POOL_COMPACT_MIN = 512,
  TRANSITION_CACHE_MAX = 8192;
/**
 * OSC 8 超链接驻留池：URL → 下标，0 表示无链接。
 */
//@ chunk-bzr73sfg.js:201259-201524 fingerprint = HyperlinkPool (1)
class HyperlinkPool {
  strings = [""];
  stringMap = new Map();
  intern(n) {
    if (!n) return 0;
    let u = this.stringMap.get(n);
    if (u === void 0) ((u = this.strings.length), this.strings.push(n), this.stringMap.set(n, u));
    return u;
  }
  get(n) {
    return n === 0 ? void 0 : this.strings[n];
  }
  get size() {
    return this.strings.length;
  }
}
//@ chunk-bzr73sfg.js:201524-201680 fingerprint = UNDERLINE_CODE (1)
var INVERSE_CODE = { type: "ansi", code: SGR_INVERSE, endCode: SGR_NO_INVERSE },
  BOLD_CODE = { type: "ansi", code: SGR_BOLD, endCode: SGR_NORMAL_INTENSITY },
  UNDERLINE_CODE = { type: "ansi", code: SGR_UNDERLINE, endCode: SGR_NO_UNDERLINE },
  YELLOW_FG_CODE = { type: "ansi", code: SGR_FG_YELLOW, endCode: SGR_DEFAULT_FG };
/**
 * 样式驻留池：AnsiCode 数组 → styleId（下标 <<1，最低位表示该样式在空格上可见，如背景/反显/下划线），上限约 2^14 个，超出后新组合退化为无样式并告警。transition(from,to) 缓存两样式间切换所需的 SGR 串；派生样式：withInverse、withUnderline、withCurrentMatch（搜索当前匹配：黄字+反显+粗体+下划线）、withSelectionBg（选区背景色，未设置时退回反显）；compact() 重建池并返回旧 id→新 id 的映射函数。
 */
//@ chunk-bzr73sfg.js:201680-204527 fingerprint = StylePool (0.543)
class StylePool {
  ids = new Map();
  styles = [];
  transitionCache = new Map();
  overflowWarned = !1;
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
  needsCompaction(n) {
    return this.overflowWarned || this.styles.length > Math.max(STYLE_POOL_COMPACT_MIN, 2 * n);
  }
  get generation() {
    return this.generationCount;
  }
  intern(n) {
    let u = n.length === 0 ? "" : n.map((m) => m.code).join("\x00"),
      f = this.ids.get(u);
    if (f === void 0) {
      let m = this.styles.length;
      if (m > MAX_STYLE_INDEX) {
        if (!this.overflowWarned)
          ((this.overflowWarned = !0),
            logForDebugging(
              `StylePool exhausted ${MAX_STYLE_INDEX} unique styles \u2014 further ` +
                "style combinations render unstyled to avoid packed-cell aliasing",
              { level: "warn" },
            ));
        return this.none;
      }
      (this.styles.push(n.length === 0 ? [] : n),
        (f = (m << 1) | (n.length > 0 && hasVisibleSpaceEffect(n) ? 1 : 0)),
        this.ids.set(u, f));
    }
    return f;
  }
  get(n) {
    return this.styles[n >>> 1] ?? [];
  }
  transition(n, u) {
    if (n === u) return "";
    let f = n * 1048576 + u,
      m = this.transitionCache.get(f);
    if (m === void 0) {
      if (this.transitionCache.size >= TRANSITION_CACHE_MAX) this.transitionCache.clear();
      let p = this.get(n),
        g = this.get(u);
      ((m = boldDimResetPrefix(p, g) + VEt(diffAnsiCodes(p, g))), this.transitionCache.set(f, m));
    }
    return m;
  }
  inverseCache = new Map();
  withInverse(n) {
    let u = this.inverseCache.get(n);
    if (u === void 0) {
      let f = this.get(n);
      ((u = f.some((p) => p.endCode === SGR_NO_INVERSE)
        ? n
        : this.intern([...dropDimIfColored(f), INVERSE_CODE])),
        this.inverseCache.set(n, u));
    }
    return u;
  }
  underlineCache = new Map();
  withUnderline(n) {
    let u = this.underlineCache.get(n);
    if (u === void 0) {
      let f = this.get(n);
      ((u = f.some((p) => p.endCode === SGR_NO_UNDERLINE) ? n : this.intern([...f, UNDERLINE_CODE])),
        this.underlineCache.set(n, u));
    }
    return u;
  }
  currentMatchCache = new Map();
  withCurrentMatch(n) {
    let u = this.currentMatchCache.get(n);
    if (u === void 0) {
      let f = dropDimIfColored(this.get(n)),
        filtered = f.filter((p) => p.endCode !== SGR_DEFAULT_FG && p.endCode !== SGR_DEFAULT_BG);
      if ((filtered.push(YELLOW_FG_CODE), !f.some((p) => p.endCode === SGR_NO_INVERSE)))
        filtered.push(INVERSE_CODE);
      if (!f.some((p) => p.endCode === SGR_NORMAL_INTENSITY)) filtered.push(BOLD_CODE);
      if (!f.some((p) => p.endCode === SGR_NO_UNDERLINE)) filtered.push(UNDERLINE_CODE);
      ((u = this.intern(filtered)), this.currentMatchCache.set(n, u));
    }
    return u;
  }
  selectionBgCode = null;
  selectionBgCache = new Map();
  setSelectionBg(n) {
    if (this.selectionBgCode?.code === n?.code) return;
    ((this.selectionBgCode = n), this.selectionBgCache.clear());
  }
  withSelectionBg(n) {
    let selectionBgCode = this.selectionBgCode;
    if (selectionBgCode === null) return this.withInverse(n);
    let f = this.selectionBgCache.get(n);
    if (f === void 0) {
      let filtered = dropDimIfColored(this.get(n)).filter(
        (p) => p.endCode !== SGR_DEFAULT_BG && p.endCode !== SGR_NO_INVERSE,
      );
      (filtered.push(selectionBgCode), (f = this.intern(filtered)), this.selectionBgCache.set(n, f));
    }
    return f;
  }
  compact() {
    let styles = this.styles;
    ((this.ids = new Map()),
      (this.styles = []),
      this.transitionCache.clear(),
      this.inverseCache.clear(),
      this.underlineCache.clear(),
      this.currentMatchCache.clear(),
      this.selectionBgCache.clear(),
      (this.overflowWarned = !1),
      this.generationCount++,
      this.intern([]));
    let fill = new Int32Array(styles.length).fill(-1);
    return (f) => {
      let m = f >>> 1,
        p = fill[m];
      if (p !== void 0 && p !== -1) return p;
      let intern = this.intern(styles[m] ?? []);
      if (m < fill.length) fill[m] = intern;
      return intern;
    };
  }
}
//@ chunk-bzr73sfg.js:204527-204565 layout
var VISIBLE_ON_SPACE = new Set([
  SGR_DEFAULT_BG,
  SGR_NO_INVERSE,
  SGR_NO_UNDERLINE,
  SGR_NO_STRIKETHROUGH,
  SGR_NO_OVERLINE,
]);
/**
 * 样式里是否有在空格上也看得见的效果（反显、背景、下划线、上划线、删除线等关闭码判断）。
 */
//@ chunk-bzr73sfg.js:204565-204634 fingerprint = hasVisibleSpaceEffect (1)
function hasVisibleSpaceEffect(styles) {
  for (let style of styles) if (VISIBLE_ON_SPACE.has(style.endCode)) return !0;
  return !1;
}
//@ chunk-bzr73sfg.js:204634-204648 layout
var EMPTY_CHAR_INDEX = 0,
  SPACER_CHAR_INDEX = 1;
//@ chunk-bzr73sfg.js:204648-204717 layout
function initCharAscii() {
  let int32Array = new Int32Array(128);
  return (int32Array.fill(-1), (int32Array[32] = EMPTY_CHAR_INDEX), int32Array);
}
/**
 * 屏幕格第二个 Int32 字的位布局：styleId 占高 15 位（<<17），超链接下标 15 位（<<2），宽度种类 2 位（0 窄、1 宽、2 宽字符右半占位、3 行尾宽字符占位）。
 */
//@ chunk-bzr73sfg.js:204717-204782 layout
var STYLE_SHIFT = 17,
  HYPERLINK_SHIFT = 2,
  HYPERLINK_MASK = 32767,
  WIDTH_MASK = 3,
  STYLE_ID_MASK = (1 << (32 - STYLE_SHIFT)) - 1,
  MAX_STYLE_INDEX = STYLE_ID_MASK >>> 1,
  STYLE_NEAR_CAPACITY = MAX_STYLE_INDEX >>> 1;
//@ chunk-bzr73sfg.js:204782-204822 layout
function packWord1(styleId, hyperlinkId, width) {
  return (styleId << STYLE_SHIFT) | (hyperlinkId << HYPERLINK_SHIFT) | width;
}
/**
 * 为屏幕写入创建原生 CellSegmenter（Bun.ant.CellSegmenter）：告诉原生代码格的编码（宽度掩码 3，窄/宽/右半占位/行尾占位 = 0/1/2/3，空格与占位的字符下标 0/1，空格的 word1，制表位宽）。substitute 是需要替换显示的码点集合。
 */
//@ chunk-bzr73sfg.js:204822-204978 layout
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
var cellSetter,
  EMPTY_CELL_VALUE = 0n;
/**
 * 把屏幕每格的字符下标设成占位（SPACER_CHAR_INDEX），用于强制下一帧整屏重画。
 */
//@ chunk-bzr73sfg.js:204991-205056 layout
function fillScreenWithSpacers(screen) {
  let cells = screen.cells;
  for (let f = 0; f < cells.length; f += 2) cells[f] = SPACER_CHAR_INDEX;
}
//@ chunk-bzr73sfg.js:205056-205222 layout
function screensEqual(a, b) {
  if (a.width !== b.width || a.height !== b.height) return !1;
  let f = a.width * a.height * 2,
    cells = a.cells,
    cells_2 = b.cells;
  for (let g = 0; g < f; g++) if (cells[g] !== cells_2[g]) return !1;
  return !0;
}
/**
 * 打包软换行标记：高 16 位为上一行内容结束列，低 15 位为本行起始列；第 15 位保留给 SW_ELIDED_SEP（折行处吞掉了分隔空格）。
 */
//@ chunk-bzr73sfg.js:205222-205409 layout
function packSoftWrap(prevRowEnd, startCol) {
  if (startCol > 32767)
    logForDebugging(
      `packSoftWrap: start column ${startCol} exceeds the 15-bit field; bit 15 is reserved for SW_ELIDED_SEP and will be corrupted`,
      { level: "error" },
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
var SoftWrapKind = { HardBreak: 0, Continuation: 1, ContinuationElidedSep: 2 };
//@ chunk-bzr73sfg.js:205512-205576 layout
function isEmptyCellByIndex(screen, index) {
  let f = index << 1;
  return (screen.cells[f] | screen.cells[f | 1]) === 0;
}
//@ chunk-bzr73sfg.js:205576-205666 layout
function isEmptyCellAt(screen, x, y) {
  if (x < 0 || y < 0 || x >= screen.width || y >= screen.height) return !0;
  return isEmptyCellByIndex(screen, y * screen.width + x);
}
/**
 * 把超链接 URL 驻留进屏幕的超链接池，返回下标。
 */
//@ chunk-bzr73sfg.js:205666-205716 fingerprint = internHyperlink (1)
function internHyperlink(screen, hyperlink) {
  return screen.hyperlinkPool.intern(hyperlink);
}
/**
 * 创建屏幕缓冲：每格两个 Int32（字符下标、packWord1），同一块内存再用 BigInt64Array 视图做整格比较/清零；另有 noSelect（不可选中的格）、softWrap（每行的软换行标记）、damage（本帧改动矩形）。池子（字符/超链接/样式）在新旧两帧之间共享。
 */
//@ chunk-bzr73sfg.js:205716-206180 fingerprint = createScreen (0.967)
function createScreen(width, height, styles, charPool, hyperlinkPool) {
  if (
    (ifNotInteger(width, "createScreen width"),
    ifNotInteger(height, "createScreen height"),
    !Number.isInteger(width) || width < 0)
  )
    width = Math.max(0, Math.floor(width) || 0);
  if (!Number.isInteger(height) || height < 0) height = Math.max(0, Math.floor(height) || 0);
  let cellCount = width * height,
    buffer = new ArrayBuffer(cellCount << 3),
    cells = new Int32Array(buffer),
    cells64 = new BigInt64Array(buffer);
  return {
    width: width,
    height: height,
    cells: cells,
    cells64: cells64,
    charPool: charPool,
    hyperlinkPool: hyperlinkPool,
    emptyStyleId: styles.none,
    atlasRecorder: styles.atlasRecorder,
    damage: void 0,
    noSelect: new Uint8Array(cellCount),
    softWrap: new Int32Array(height),
  };
}
/**
 * 把屏幕重置为指定尺寸并清空（容量不够才重新分配），damage 清掉。
 */
//@ chunk-bzr73sfg.js:206180-206677 fingerprint = resetScreen (1)
function resetScreen(screen, width, height) {
  if (
    (ifNotInteger(width, "resetScreen width"),
    ifNotInteger(height, "resetScreen height"),
    !Number.isInteger(width) || width < 0)
  )
    width = Math.max(0, Math.floor(width) || 0);
  if (!Number.isInteger(height) || height < 0) height = Math.max(0, Math.floor(height) || 0);
  let size = width * height;
  if (screen.cells64.length < size) {
    let buf = new ArrayBuffer(size << 3);
    ((screen.cells = new Int32Array(buf)),
      (screen.cells64 = new BigInt64Array(buf)),
      (screen.noSelect = new Uint8Array(size)));
  }
  if (screen.softWrap.length < height) screen.softWrap = new Int32Array(height);
  (screen.cells64.fill(EMPTY_CELL_VALUE, 0, size),
    screen.noSelect.fill(0, 0, size),
    screen.softWrap.fill(0, 0, height),
    (screen.width = width),
    (screen.height = height),
    (screen.damage = void 0));
}
/**
 * 池子换代（字符池/超链接池重建、样式池 compact）后，把屏幕里每格的下标迁移到新池。
 */
//@ chunk-bzr73sfg.js:206677-207029 fingerprint = migrateScreenPools (1)
function migrateScreenPools(screen, newCharPool, newHyperlinkPool, remapStyle) {
  let { charPool: charPool, hyperlinkPool: hyperlinkPool } = screen,
    charPoolChanged = charPool !== newCharPool,
    linkPoolChanged = hyperlinkPool !== newHyperlinkPool;
  if (!charPoolChanged && !linkPoolChanged && !remapStyle) return;
  let cellCount = screen.width * screen.height,
    cells = screen.cells;
  for (let ci = 0; ci < cellCount << 1; ci += 2) {
    if (charPoolChanged) {
      let G = cells[ci];
      cells[ci] = newCharPool.intern(charPool.get(G));
    }
    let _ = cells[ci + 1],
      U = (_ >>> HYPERLINK_SHIFT) & HYPERLINK_MASK,
      L = _ >>> STYLE_SHIFT,
      P = linkPoolChanged && U !== 0 ? newHyperlinkPool.intern(hyperlinkPool.get(U)) : U,
      z = remapStyle && L !== 0 ? remapStyle(L) : L;
    if (P !== U || z !== L) {
      let G = _ & WIDTH_MASK;
      cells[ci + 1] = packWord1(z, P, G);
    }
  }
  ((screen.charPool = newCharPool), (screen.hyperlinkPool = newHyperlinkPool));
}
/**
 * 读 (x,y) 的格（越界返回 undefined）：{char, styleId, width, hyperlink}。
 */
//@ chunk-bzr73sfg.js:207029-207118 callgraph-witnessed = cellAt (1)
function cellAt(screen, x, y) {
  if (x < 0 || y < 0 || x >= screen.width || y >= screen.height) return;
  return cellAtIndex(screen, y * screen.width + x);
}
/**
 * 按线性下标读格。
 */
//@ chunk-bzr73sfg.js:207118-207286 fingerprint = cellAtIndex (1)
function cellAtIndex(screen, index) {
  let f = index << 1,
    word1 = screen.cells[f + 1],
    p = (word1 >>> HYPERLINK_SHIFT) & HYPERLINK_MASK;
  return {
    char: screen.charPool.get(screen.cells[f]),
    styleId: word1 >>> STYLE_SHIFT,
    width: word1 & WIDTH_MASK,
    hyperlink: p === 0 ? void 0 : screen.hyperlinkPool.get(p),
  };
}
/**
 * diff 输出用：读格，但跳过宽字符占位格，以及与上次输出样式相同的空白格（无需重画）。
 */
//@ chunk-bzr73sfg.js:207286-207514 fingerprint = visibleCellAtIndex (1)
function visibleCellAtIndex(cells, charPool, hyperlinkPool, index, lastRenderedStyleId) {
  let g = index << 1,
    E = cells[g];
  if (E === 1) return;
  let T = cells[g + 1];
  if (E === 0 && (T & 262140) === 0) {
    let D = T >>> STYLE_SHIFT;
    if (D === 0 || D === lastRenderedStyleId) return;
  }
  let A = (T >>> HYPERLINK_SHIFT) & HYPERLINK_MASK;
  return {
    char: charPool.get(E),
    styleId: T >>> STYLE_SHIFT,
    width: T & WIDTH_MASK,
    hyperlink: A === 0 ? void 0 : hyperlinkPool.get(A),
  };
}
/**
 * 按 cells 数组下标（格下标×2）把格读进调用方提供的 out 对象，避免分配；diff 热路径用。
 */
//@ chunk-bzr73sfg.js:207514-207684 layout = cellAtIndex (1)
function cellAtCI(screen, ci, out) {
  let m = ci | 1,
    word1 = screen.cells[m];
  ((out.char = screen.charPool.get(screen.cells[ci])),
    (out.styleId = word1 >>> STYLE_SHIFT),
    (out.width = word1 & WIDTH_MASK));
  let g = (word1 >>> HYPERLINK_SHIFT) & HYPERLINK_MASK;
  out.hyperlink = g === 0 ? void 0 : screen.hyperlinkPool.get(g);
}
/**
 * 读 (x,y) 格的字符。
 */
//@ chunk-bzr73sfg.js:207684-207802 fingerprint = charInCellAt (1)
function charInCellAt(screen, x, y) {
  if (x < 0 || y < 0 || x >= screen.width || y >= screen.height) return;
  let ci = (y * screen.width + x) << 1;
  return screen.charPool.get(screen.cells[ci]);
}
/**
 * 写一个格：字符驻留后调用原生 CellSegmenter.setCell（处理宽字符右半占位、覆盖宽字符时清孤儿格等），用返回的打包值扩大 damage；图集记录开启时记下组合。
 */
//@ chunk-bzr73sfg.js:207802-208043 file-local
function setCellAt(screen, x, y, cell) {
  if (x < 0 || y < 0 || x >= screen.width || y >= screen.height) return;
  cellSetter ??= createScreenSegmenter([]);
  let charIndex = internCharString(screen, cell.char),
    packed = cellSetter.setCell(
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
/**
 * 原生 CellSegmenter 返回值打包格式：结束列 + 改动起始列·2^20 + 改动结束列·2^36；取出改动区间并入屏幕的 damage 矩形。
 */
//@ chunk-bzr73sfg.js:208043-208209 fingerprint = diffEach (1)
function addDamageFromPacked(screen, row, packed) {
  let startCol = Math.floor(packed / 1048576) % 65536,
    endCol = Math.floor(packed / 68719476736);
  if (startCol >= endCol) return;
  let rect = { x: startCol, y: row, width: endCol - startCol, height: 1 };
  screen.damage = screen.damage ? unionRect(screen.damage, rect) : rect;
}
/**
 * 用 CellSegmenter.paint 把上一次 segment() 切出的字素/样式段写到 (x,y) 起的一行，更新 damage、图集记录，返回写完后的列。
 */
//@ chunk-bzr73sfg.js:208209-208487 file-local
function paintSegments(screen, x, y, segmenter) {
  let packed = segmenter.paint(screen.cells, screen.width, x, y, screen.hyperlinkPool);
  addDamageFromPacked(screen, y, packed);
  let atlasRecorder = screen.atlasRecorder;
  if (atlasRecorder.recording) {
    let E = Math.floor(packed / 1048576) % 65536,
      floored = Math.floor(packed / 68719476736),
      cells = screen.cells;
    for (let D = E, O = (y * screen.width + E) << 1; D < floored; D++, O += 2)
      atlasRecorder.record(cells[O], cells[O + 1] >>> STYLE_SHIFT);
  }
  return packed % 1048576;
}
//@ chunk-bzr73sfg.js:208487-208520 layout
function isMultiCodeUnitGrapheme(char) {
  return char.length > 2;
}
/**
 * 后处理 damage 区域：宽字素（如 emoji 序列）实际显示宽度超出右边界时，换成占位字符并把到行尾的格清成空格，避免终端换行错位。
 */
//@ chunk-bzr73sfg.js:208520-208935 fingerprint = setCellAt (0.918)
function clampWideGraphemesAtRightEdge(screen) {
  let damage = screen.damage;
  if (!damage) return;
  let lastCol = Math.min(screen.width - 2, damage.x + damage.width - 1),
    endRow = Math.min(screen.height, damage.y + damage.height);
  for (let p = damage.y; p < endRow; p++)
    for (let g = damage.x; g <= lastCol; g++) {
      if ((screen.cells[((p * screen.width + g) << 1) + 1] & WIDTH_MASK) !== 1) continue;
      let cell = cellAt(screen, g, p);
      if (!cell || !isMultiCodeUnitGrapheme(cell.char)) continue;
      let glyphWidth = Math.max(2, bunStringWidth(cell.char));
      if (g + glyphWidth < screen.width) continue;
      for (let D = g; D < screen.width; D++)
        setCellAt(screen, D, p, {
          char: D === g ? ELLIPSIS : " ",
          styleId: cell.styleId,
          width: 0,
          hyperlink: cell.hyperlink,
        });
    }
}
/**
 * 只改一个格的 styleId（宽字符占位格跳过），并扩大 damage；选区高亮、搜索高亮用。
 */
//@ chunk-bzr73sfg.js:208935-209318 fingerprint = setCellStyleId (1)
function setCellStyleId(screen, x, y, styleId) {
  if (x < 0 || y < 0 || x >= screen.width || y >= screen.height) return;
  let p = (y * screen.width + x) << 1,
    cells = screen.cells,
    word1 = cells[p + 1],
    T = word1 & WIDTH_MASK;
  if (T === 2 || T === 3) return;
  let A = (word1 >>> HYPERLINK_SHIFT) & HYPERLINK_MASK;
  cells[p + 1] = packWord1(styleId, A, T);
  let damage = screen.damage;
  if (damage) {
    let O = damage.x + damage.width,
      _ = damage.y + damage.height;
    if (x < damage.x) ((damage.width += damage.x - x), (damage.x = x));
    else if (x >= O) damage.width = x - damage.x + 1;
    if (y < damage.y) ((damage.height += damage.y - y), (damage.y = y));
    else if (y >= _) damage.height = y - damage.y + 1;
  } else screen.damage = { x: x, y: y, width: 1, height: 1 };
}
/**
 * 把字符驻留进屏幕字符池。
 */
//@ chunk-bzr73sfg.js:209318-209363 fingerprint = internCharString (1)
function internCharString(screen, char) {
  return screen.charPool.intern(char);
}
/**
 * 把上一帧屏幕的一个矩形区域整块拷进当前帧（渲染缓存命中时跳过重画子树），连同 noSelect 和 softWrap；整行时一次 set。随后修补区域左右边界被切开的宽字符（清掉孤儿半格），并把区域并入 damage。
 */
//@ chunk-bzr73sfg.js:209363-210531 fingerprint = blitRegion (1)
function blitRegion(dst, src, regionX, regionY, maxX, maxY) {
  if (
    ((regionX = Math.max(0, regionX)), (regionY = Math.max(0, regionY)), regionX >= maxX || regionY >= maxY)
  )
    return;
  let regionWidth = maxX - regionX,
    srcStride = src.width << 1,
    dstStride = dst.width << 1,
    rowCells = regionWidth << 1,
    srcCells = src.cells,
    dstCells = dst.cells,
    srcNoSel = src.noSelect,
    dstNoSel = dst.noSelect;
  if (
    (dst.softWrap.set(src.softWrap.subarray(regionY, maxY), regionY),
    regionX === 0 && maxX === src.width && src.width === dst.width)
  ) {
    let J = regionY * srcStride,
      V = (maxY - regionY) * srcStride;
    dstCells.set(srcCells.subarray(J, J + V), J);
    let ee = regionY * src.width,
      ae = (maxY - regionY) * src.width;
    dstNoSel.set(srcNoSel.subarray(ee, ee + ae), ee);
  } else {
    let J = regionY * srcStride + (regionX << 1),
      V = regionY * dstStride + (regionX << 1),
      ee = regionY * src.width + regionX,
      ae = regionY * dst.width + regionX;
    for (let ne = regionY; ne < maxY; ne++)
      (dstCells.set(srcCells.subarray(J, J + rowCells), V),
        dstNoSel.set(srcNoSel.subarray(ee, ee + regionWidth), ae),
        (J += srcStride),
        (V += dstStride),
        (ee += src.width),
        (ae += dst.width));
  }
  let leftEdge = regionX > 0,
    rightEdge = maxX < dst.width,
    widenedLeft = !1,
    widenedRight = 0;
  if (leftEdge || rightEdge) {
    let J = (regionY * dst.width + regionX - 1) << 1,
      V = (regionY * dst.width + maxX - 1) << 1;
    for (let ee = regionY; ee < maxY; ee++) {
      if (leftEdge) {
        let ae = dstCells[J + 3] & WIDTH_MASK;
        if ((dstCells[J + 1] & WIDTH_MASK) === 1) {
          if (ae !== 2)
            ((dstCells[J] = EMPTY_CHAR_INDEX),
              (dstCells[J + 1] = packWord1(dst.emptyStyleId, 0, 0)),
              (widenedLeft = !0));
        } else if (ae === 2)
          ((dstCells[J + 2] = EMPTY_CHAR_INDEX), (dstCells[J + 3] = packWord1(dst.emptyStyleId, 0, 0)));
      }
      if (rightEdge) {
        if ((dstCells[V + 1] & WIDTH_MASK) === 1) {
          if (
            maxX + 1 < dst.width &&
            (dstCells[V + 3] & WIDTH_MASK) === 1 &&
            (dstCells[V + 5] & WIDTH_MASK) === 2
          )
            ((dstCells[V + 4] = EMPTY_CHAR_INDEX),
              (dstCells[V + 5] = packWord1(dst.emptyStyleId, 0, 0)),
              (widenedRight = 2));
          else if (widenedRight < 1) widenedRight = 1;
          ((dstCells[V + 2] = SPACER_CHAR_INDEX), (dstCells[V + 3] = packWord1(dst.emptyStyleId, 0, 2)));
        } else if ((dstCells[V + 3] & WIDTH_MASK) === 2) {
          if (
            ((dstCells[V + 2] = EMPTY_CHAR_INDEX),
            (dstCells[V + 3] = packWord1(dst.emptyStyleId, 0, 0)),
            widenedRight < 1)
          )
            widenedRight = 1;
        }
      }
      ((J += dstStride), (V += dstStride));
    }
  }
  let K = widenedLeft ? regionX - 1 : regionX,
    q = maxX + widenedRight,
    Y = { x: K, y: regionY, width: q - K, height: maxY - regionY };
  if (dst.damage) dst.damage = unionRect(dst.damage, Y);
  else dst.damage = Y;
}
/**
 * 把 [top,bottom] 行区间整体上移（n>0）或下移 n 行并清空腾出的行（cells、noSelect、softWrap 一起），用于滚动优化（DECSTBM 滚动区域）。
 */
//@ chunk-bzr73sfg.js:210531-211066 fingerprint = shiftRows (1)
function shiftRows(screen, top, bottom, n) {
  if (n === 0 || top < 0 || bottom >= screen.height || top > bottom) return;
  let { width: width, cells64: cells64, noSelect: noSelect, softWrap: softWrap } = screen;
  if (Math.abs(n) > bottom - top) {
    (cells64.fill(EMPTY_CELL_VALUE, top * width, (bottom + 1) * width),
      noSelect.fill(0, top * width, (bottom + 1) * width),
      softWrap.fill(0, top, bottom + 1));
    return;
  }
  if (n > 0)
    (cells64.copyWithin(top * width, (top + n) * width, (bottom + 1) * width),
      noSelect.copyWithin(top * width, (top + n) * width, (bottom + 1) * width),
      softWrap.copyWithin(top, top + n, bottom + 1),
      cells64.fill(EMPTY_CELL_VALUE, (bottom - n + 1) * width, (bottom + 1) * width),
      noSelect.fill(0, (bottom - n + 1) * width, (bottom + 1) * width),
      softWrap.fill(0, bottom - n + 1, bottom + 1));
  else
    (cells64.copyWithin((top - n) * width, top * width, (bottom + n + 1) * width),
      noSelect.copyWithin((top - n) * width, top * width, (bottom + n + 1) * width),
      softWrap.copyWithin(top - n, top, bottom + n + 1),
      cells64.fill(EMPTY_CELL_VALUE, top * width, (top - n) * width),
      noSelect.fill(0, top * width, (top - n) * width),
      softWrap.fill(0, top, top - n));
}
//@ chunk-bzr73sfg.js:211066-211147 fingerprint = OSC8_REGEX (1)
var OSC8_REGEX = new RegExp(`^${ESC}\\]8${SEP}${SEP}([^${BEL_2}]*)${BEL_2}$`),
  OSC8_PREFIX = `${ESC}]8${SEP}`;
/**
 * 逐格比较两帧，只在 damage 区域（两帧 damage 之并，加上尺寸缩小露出的区域）内调用 cb(x, y, prevCell, nextCell)；cb 返回真则提前结束。宽度相同走 diffSameWidth，否则 diffDifferentWidth。
 */
//@ chunk-bzr73sfg.js:211147-211623 layout = diffEach (1)
function diffEach(prev, next, cb) {
  let prevWidth = prev.width,
    nextWidth = next.width,
    prevHeight = prev.height,
    nextHeight = next.height,
    region;
  if (prevWidth === 0 && prevHeight === 0) region = { x: 0, y: 0, width: nextWidth, height: nextHeight };
  else if (next.damage) {
    if (((region = next.damage), prev.damage)) region = unionRect(region, prev.damage);
  } else if (prev.damage) region = prev.damage;
  else region = { x: 0, y: 0, width: 0, height: 0 };
  if (prevHeight > nextHeight)
    region = unionRect(region, { x: 0, y: nextHeight, width: prevWidth, height: prevHeight - nextHeight });
  if (prevWidth > nextWidth)
    region = unionRect(region, { x: nextWidth, y: 0, width: prevWidth - nextWidth, height: prevHeight });
  let maxHeight = Math.max(prevHeight, nextHeight),
    maxWidth = Math.max(prevWidth, nextWidth),
    endY = Math.min(region.y + region.height, maxHeight),
    endX = Math.min(region.x + region.width, maxWidth);
  if (prevWidth === nextWidth) return diffSameWidth(prev, next, region.x, endX, region.y, endY, cb);
  return diffDifferentWidth(prev, next, region.x, endX, region.y, endY, cb);
}
//@ chunk-bzr73sfg.js:211623-211726 layout
function findNextDiff(prevCells, nextCells, ci, count) {
  for (let p = 0; p < count; p++, ci += 2) {
    let g = ci | 1;
    if (prevCells[ci] !== nextCells[ci] || prevCells[g] !== nextCells[g]) return p;
  }
  return count;
}
//@ chunk-bzr73sfg.js:211726-211888 layout
function diffRowBoth(n, u, f, m, p, g, E, T, A, D, O) {
  let _ = E;
  while (_ < T) {
    let U = findNextDiff(n, u, p, T - _);
    if (((_ += U), (p += U << 1), _ >= T)) break;
    if ((cellAtCI(f, p, A), cellAtCI(m, p, D), O(_, g, A, D))) return !0;
    (_++, (p += 2));
  }
  return !1;
}
//@ chunk-bzr73sfg.js:211888-211987 layout
function diffRowRemoved(n, u, f, m, p, g, E) {
  for (let T = m; T < p; T++, u += 2) if ((cellAtCI(n, u, g), E(T, f, g, void 0))) return !0;
  return !1;
}
//@ chunk-bzr73sfg.js:211987-212122 layout
function diffRowAdded(n, u, f, m, p, g, E, T) {
  for (let A = p; A < g; A++, f += 2) {
    if (n[f] === 0 && n[f | 1] === 0) continue;
    if ((cellAtCI(u, f, E), T(A, m, void 0, E))) return !0;
  }
  return !1;
}
/**
 * 两帧宽度相同时的逐行 diff：两帧都有的行跳过相同格；只在旧帧的行报删除；只在新帧的行报新增（跳过全空格）。
 */
//@ chunk-bzr73sfg.js:212122-212517 fingerprint = diffSameWidth (1)
function diffSameWidth(prev, next, startX, endX, startY, endY, cb) {
  let prevCells = prev.cells,
    nextCells = next.cells,
    { width: width, height: height } = prev,
    prevHeight = next.height,
    U = width << 1,
    prevCell = { char: " ", styleId: 0, width: 0, hyperlink: void 0 },
    nextCell = { char: " ", styleId: 0, width: 0, hyperlink: void 0 },
    rowEndX = Math.min(endX, width),
    G = (startY * width + startX) << 1;
  for (let X = startY; X < endY; X++) {
    let K = X < height,
      q = X < prevHeight;
    if (K && q) {
      if (diffRowBoth(prevCells, nextCells, prev, next, G, X, startX, rowEndX, prevCell, nextCell, cb))
        return !0;
    } else if (K) {
      if (diffRowRemoved(prev, G, X, startX, rowEndX, prevCell, cb)) return !0;
    } else if (q) {
      if (diffRowAdded(nextCells, next, G, X, startX, rowEndX, nextCell, cb)) return !0;
    }
    G += U;
  }
  return !1;
}
/**
 * 两帧宽度不同时的逐行 diff（各自步长），同样分公共列、旧帧多出的列、新帧多出的列。
 */
//@ chunk-bzr73sfg.js:212517-213222 layout = diffSameWidth (1)
function diffDifferentWidth(prev, next, startX, endX, startY, endY, cb) {
  let width = prev.width,
    width_2 = next.width,
    prevCells = prev.cells,
    nextCells = next.cells,
    prevCell = { char: " ", styleId: 0, width: 0, hyperlink: void 0 },
    nextCell = { char: " ", styleId: 0, width: 0, hyperlink: void 0 },
    L = width << 1,
    P = width_2 << 1,
    z = (startY * width + startX) << 1,
    G = (startY * width_2 + startX) << 1;
  for (let X = startY; X < endY; X++) {
    let K = X < prev.height,
      q = X < next.height,
      Y = K ? Math.min(endX, width) : startX,
      J = q ? Math.min(endX, width_2) : startX,
      min = Math.min(Y, J),
      ee = z,
      ae = G;
    for (let ne = startX; ne < min; ne++) {
      if (prevCells[ee] === nextCells[ae] && prevCells[ee + 1] === nextCells[ae + 1]) {
        ((ee += 2), (ae += 2));
        continue;
      }
      if (
        (cellAtCI(prev, ee, prevCell),
        cellAtCI(next, ae, nextCell),
        (ee += 2),
        (ae += 2),
        cb(ne, X, prevCell, nextCell))
      )
        return !0;
    }
    if (Y > min) {
      ee = z + ((min - startX) << 1);
      for (let ne = min; ne < Y; ne++)
        if ((cellAtCI(prev, ee, prevCell), (ee += 2), cb(ne, X, prevCell, void 0))) return !0;
    }
    if (J > min) {
      ae = G + ((min - startX) << 1);
      for (let ne = min; ne < J; ne++) {
        if (nextCells[ae] === 0 && nextCells[ae | 1] === 0) {
          ae += 2;
          continue;
        }
        if ((cellAtCI(next, ae, nextCell), (ae += 2), cb(ne, X, void 0, nextCell))) return !0;
      }
    }
    ((z += L), (G += P));
  }
  return !1;
}
//@ chunk-bzr73sfg.js:213222-213261 layout
function markNoSelect(screen, x, y, width, height) {
  markNoSelectRegion(screen, x, y, width, height, 1);
}
//@ chunk-bzr73sfg.js:213261-213300 layout
function clearNoSelect(screen, x, y, width, height) {
  markNoSelectRegion(screen, x, y, width, height, 0);
}
/**
 * 把源屏幕一个矩形区域的 noSelect 标记拷到目标屏幕。
 */
//@ chunk-bzr73sfg.js:213300-213577 layout
function copyNoSelectRegion(dst, src, x1, y1, x2, y2) {
  let max = Math.max(0, x1),
    max_2 = Math.max(0, y1),
    min = Math.min(x2, dst.width, src.width),
    min_2 = Math.min(y2, dst.height, src.height);
  if (max >= min || max_2 >= min_2) return;
  let noSelect = src.noSelect,
    noSelect_2 = dst.noSelect,
    U = min - max,
    L = max_2 * src.width + max,
    P = max_2 * dst.width + max;
  for (let z = max_2; z < min_2; z++)
    (noSelect_2.set(noSelect.subarray(L, L + U), P), (L += src.width), (P += dst.width));
}
/**
 * 把矩形区域的 noSelect 置为 value（<NoSelect> 包住的内容、行号栏等不参与选区复制）。
 */
//@ chunk-bzr73sfg.js:213577-213752 fingerprint = markNoSelectRegion (1)
function markNoSelectRegion(screen, x, y, width, height, value) {
  let maxX = Math.min(x + width, screen.width),
    maxY = Math.min(y + height, screen.height),
    { noSelect: noSelect, width: width_2 } = screen;
  for (let row = Math.max(0, y); row < maxY; row++) {
    let rowStart = row * width_2;
    noSelect.fill(value, rowStart + Math.max(0, x), rowStart + maxX);
  }
}
//@ chunk-bzr73sfg.js:285211-285346 placement
var UNREADABLE_TEXT = "[unreadable text]",
  UNREADABLE_FALLBACKS = [UNREADABLE_TEXT, "[unreadable]", "[?]"],
  MARK_OR_CONTROL_RE = /^[\p{M}\p{Cc}\p{Cf}]?$/u,
  WIDE_AMBIGUOUS_OPTS = { ambiguousIsNarrow: !1 },
  UNASSIGNED_OR_EMOJI_RE = /[\p{Cn}\p{Emoji}]/u;
/**
 * 保守估计显示宽度：未分配码点与 emoji 按 2、东亚歧义宽度按宽，取逐字素累加与整串宽度的较大者。
 */
//@ chunk-bzr73sfg.js:285346-285537 placement
function conservativeWidth(text) {
  let u = 0;
  for (let f of text) {
    let m = f.codePointAt(0) ?? 0;
    u +=
      m > 127 && UNASSIGNED_OR_EMOJI_RE.test(f)
        ? 2
        : Math.max(1, Bun.stringWidth(m >= 55296 && m <= 57343 ? "\uFFFD" : f, WIDE_AMBIGUOUS_OPTS));
  }
  return Math.max(u, Bun.stringWidth(text, WIDE_AMBIGUOUS_OPTS));
}
/**
 * 按保守宽度把文本折成多行（不超过 maxWidth）：单个字素都放不下时用 "[unreadable text]" 等占位替代，优先在空格处断行。
 */
//@ chunk-bzr73sfg.js:285537-286172 fingerprint = isEmptyCellByIndex (0.534)
function wrapTextConservatively(screen, maxWidth) {
  let f = UNREADABLE_FALLBACKS.find((T) => conservativeWidth(T) <= maxWidth) ?? "?",
    m = { text: f, cells: conservativeWidth(f) },
    p = [];
  for (let { segment: segment } of getGraphemeSegmenter().segment(normalizeFullWidthSpace(screen))) {
    let A = conservativeWidth(segment);
    if (A <= maxWidth) {
      p.push({ text: segment, cells: A });
      continue;
    }
    let list = Array.from(segment),
      index = list.findIndex((P) => Array.from(getGraphemeSegmenter().segment(`${P}a`)).length > 1),
      _ = list[index] ?? "",
      U = conservativeWidth(_),
      L = !MARK_OR_CONTROL_RE.test(_) && U <= maxWidth;
    if ((!L || index > 0) && p.at(-1) !== m) p.push(m);
    if (L) {
      if ((p.push({ text: _, cells: U }), index < list.length - 1)) p.push(m);
    }
  }
  let g = [],
    E = 0;
  while (E < p.length) {
    let T = E,
      A = 0,
      D = E;
    while (T < p.length && A + p[T].cells <= maxWidth)
      if (((A += p[T].cells), T++, p[T - 1].text === " ")) D = T;
    if (T === E) T++;
    else if (T < p.length && p[T].text !== " " && D > E) T = D;
    (g.push(
      p
        .slice(E, T)
        .map((O) => O.text)
        .join(""),
    ),
      (E = T));
  }
  return g;
}
//@ chunk-4ymxyb4g.js:8187-8248 fingerprint = INVERSE_CODE (0.705)
function inverseText(e) {
  return (p.ensureInit(), "\x1B[7m" + e + "\x1B[27m");
}
//@ chunk-ag5x7vhf.js:18368-18504 fingerprint = isEmptyCellAt (0.664)
function ScrollAnchor() {
  let T = w(2),
    m = Se(ScrollAnchorContext),
    h = R(null);
  const x = m ?? h;
  let k;
  if (T[0] !== x) ((k = e(BaseBox, { ref: x, height: 0 })), (T[0] = x), (T[1] = k));
  else k = T[1];
  return k;
}
//@ chunk-bc20zedk.js:11835-11866 fingerprint = BOLD_CODE (0.759)
var BOLD_OPEN = "\x1B[1m",
  BOLD_CLOSE = "\x1B[22m";

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
