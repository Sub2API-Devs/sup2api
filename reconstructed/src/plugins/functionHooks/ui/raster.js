/**
 * plugins/functionHooks/ui/raster.ts
 *
 * 钩子 Raster 组件绘制参数校验与流（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (59)
 * attribution: placement 59
 */
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { base64BytesPerFour } from "./validateTree.js";
import { bunStringWidth } from "../../../ink/stringWidth.js";
import { identity } from "../../../utils/identity.js";
import { getPluginRegistry } from "../../../utils/plugins/pluginLoadState.js";
import { csi } from "../../../ink/termio/csi.js";
import { checkCellSize } from "../sites/uiSites.js";

//@ chunk-4121qate.js:160366-160378 placement
/**
 * 1000
 */
var MAX_RASTER_COLUMNS = 1000;
//@ chunk-4121qate.js:160378-160388 placement
/**
 * 64
 */
var MAX_RASTER_ROWS = 64;
//@ chunk-4121qate.js:160388-160445 placement
/**
 * 16 位半段常量
 */
var HALF_SPLIT_CONSTANTS = {
  halfBits: 16,
  halfMask: 65535,
  defaultMismatch: 4096,
};
//@ chunk-4121qate.js:160445-160485 placement
/**
 * 取高 16 位
 */
var upperHalf = (e) => (e >>> HALF_SPLIT_CONSTANTS.halfBits) & HALF_SPLIT_CONSTANTS.halfMask;
//@ chunk-4121qate.js:160485-161022 placement
function checkRasterPaintArgs(e) {
  let o = typeof e?.requestId === "string" && e.requestId !== "" && typeof e.key === "string" && e.key !== "";
  let r = e;
  let n = typeof r?.cells === "string";
  let s = isPlainObject(r?.source);
  if (!(o && n !== s && (r?.cells === undefined || n) && (r?.source === undefined || s)))
    return "takes { requestId, key, cells } (strings; the site, the Raster's key, its encoded cells) or { requestId, key, source } (the Image's key, its next ImageSource)";
  return (e.columns === undefined || typeof e.columns === "number") &&
    (e.rows === undefined || typeof e.rows === "number")
    ? undefined
    : "columns and rows are numbers when given";
}
//@ chunk-4121qate.js:161022-161032 placement
/**
 * 12
 */
var RGBA_BYTES = 12;
//@ chunk-4121qate.js:161032-161087 placement
/**
 * 估算单元格字节
 */
var estimateCellBytes = (e, o) =>
  Math.ceil((e * o * RGBA_BYTES) / base64BytesPerFour.bytes) * base64BytesPerFour.characters;
//@ chunk-4121qate.js:161087-161207 placement
var CODE_POINT_LIMITS = {
  bmpLast: 65535,
  c0Last: 31,
  delete: 127,
  c1Last: 159,
  surrogateFirst: 55296,
  surrogateLast: 57343,
  hexRadix: 16,
  hexDigits: 4,
};
//@ chunk-4121qate.js:161207-161248 placement
/**
 * unmeasured/narrow/refused
 */
var RASTER_MEASURE_STATES = {
  unmeasured: 0,
  narrow: 1,
  refused: 2,
};
//@ chunk-4121qate.js:161248-161258 placement
/**
 * 空对象
 */
var EMPTY_RASTER_MAP = {};
//@ chunk-4121qate.js:161258-161542 placement
function isNarrowPrintable(e) {
  let o = (EMPTY_RASTER_MAP.table ??= new Uint8Array(CODE_POINT_LIMITS.bmpLast + 1));
  let r = o[e] ?? RASTER_MEASURE_STATES.unmeasured;
  if (r !== RASTER_MEASURE_STATES.unmeasured) return r === RASTER_MEASURE_STATES.narrow;
  let n =
    e > CODE_POINT_LIMITS.c0Last &&
    (e < CODE_POINT_LIMITS.delete || e > CODE_POINT_LIMITS.c1Last) &&
    (e < CODE_POINT_LIMITS.surrogateFirst || e > CODE_POINT_LIMITS.surrogateLast) &&
    bunStringWidth(String.fromCodePoint(e)) === 1;
  o[e] = n ? RASTER_MEASURE_STATES.narrow : RASTER_MEASURE_STATES.refused;
  return n;
}
//@ chunk-4121qate.js:161542-161858 placement
/**
 * 校验栅格单元的码点（基本多文种平面内、可打印窄字符）。
 */
function checkRasterCodePoint(e, o) {
  if (e > CODE_POINT_LIMITS.bmpLast)
    return `cell ${o} holds code point ${e}, beyond the Basic Multilingual Plane`;
  if (isNarrowPrintable(e)) return;
  let padded = e
    .toString(CODE_POINT_LIMITS.hexRadix)
    .toUpperCase()
    .padStart(CODE_POINT_LIMITS.hexDigits, "0");
  return `cell ${o} holds U+${padded}, which is not one printable width-1 code point (a control, combining or wide character)`;
}
//@ chunk-4121qate.js:161858-161874 placement
/**
 * 16777216
 */
var TRANSPARENT_SENTINEL = 16777216;
//@ chunk-4121qate.js:161874-161938 placement
/**
 * 真彩色位偏移
 */
var TRUECOLOR_SHIFTS = {
  redShift: 16,
  greenShift: 8,
  channelMask: 255,
  mask: 16777215,
};
//@ chunk-4121qate.js:161938-161969 placement
/**
 * 合法颜色整数
 */
var isValidColorInt = (e) => e <= TRUECOLOR_SHIFTS.mask || e === TRANSPARENT_SENTINEL;
//@ chunk-4121qate.js:161969-161978 placement
/**
 * 3
 */
var RASTER_RETRY_COUNT = 3;
//@ chunk-4121qate.js:161978-162560 placement
function checkRasterCells(cells, columns, rows) {
  let n = columns * rows;
  let s = estimateCellBytes(columns, rows);
  if (typeof cells !== "string" || cells.length !== s)
    return {
      problem: `cells must be the base64 of ${n} cells of ${RGBA_BYTES} bytes (${s} characters for ${columns}x${rows})`,
    };
  let buffer = Buffer.from(cells, "base64");
  if (buffer.length !== n * RGBA_BYTES)
    return {
      problem: "cells is not base64 (standard alphabet, padded)",
    };
  let uint32Array = new Uint32Array(n * RASTER_RETRY_COUNT);
  new Uint8Array(uint32Array.buffer).set(buffer);
  for (let j = 0; j < n; j++) {
    let a = j * RASTER_RETRY_COUNT;
    let m = checkRasterCodePoint(uint32Array[a] ?? 0, j);
    if (m !== undefined)
      return {
        problem: m,
      };
    if (!(isValidColorInt(uint32Array[a + 1] ?? 0) && isValidColorInt(uint32Array[a + 2] ?? 0)))
      return {
        problem: `cell ${j} holds a color that is neither 0xRRGGBB nor 0x1000000 (the default)`,
      };
  }
  return {
    words: uint32Array,
  };
}
//@ chunk-4121qate.js:162560-162599 placement
/**
 * 稍后拒绝
 */
var denyLater = (deny) =>
  Promise.resolve({
    deny,
  });
//@ chunk-4121qate.js:162599-162651 placement
/**
 * 已挂载 raster
 */
var mountedRasters = identity(
  () => getPluginRegistry().mountedRasters,
  (e) => e().clear(),
);
//@ chunk-4121qate.js:162651-162782 placement
function isRasterKeyTakenByOther(requestId, key, plugin) {
  for (let n of mountedRasters().values())
    for (let raster of n.rasters)
      if (raster.requestId === requestId && raster.key === key && raster.plugin !== plugin) return true;
  return false;
}
//@ chunk-4121qate.js:162782-162794 placement
/**
 * raster 每秒最多贴 120 次；超出后本次直接拒绝，防止界面被单插件刷屏。
 */
var MAX_BLITS_PER_SECOND = 120;
//@ chunk-4121qate.js:162794-162825 placement
var Vme = String.fromCharCode(0);
//@ chunk-4121qate.js:162825-162860 placement
/**
 * raster 键
 */
var rasterKey = (requestId, key, plugin) => [plugin, requestId, key].join(Vme);
//@ chunk-4121qate.js:162860-162872 placement
/**
 * 1000
 */
var BLIT_WINDOW_MS = 1000;
//@ chunk-4121qate.js:162872-162981 placement
/**
 * 每秒最多 120 次 blit 的限流：窗口过期重置，返回本次是否允许。
 */
function takeBlitToken(e, o) {
  if (o - e.windowStart >= BLIT_WINDOW_MS) {
    e.windowStart = o;
    e.blits = 0;
  }
  let r = e.blits < MAX_BLITS_PER_SECOND;
  e.blits += r ? 1 : 0;
  return r;
}
//@ chunk-4121qate.js:162981-163191 placement
/**
 * 描述挂载冲突：该 key 下的元素属于其他插件，或不存在。
 */
function describeForeignMount(e, o, r) {
  let { requestId, key } = o;
  return r
    ? `the ${e} under key "${key}" in ${requestId} is another plugin's, not its to ${e === "Raster" ? "paint" : "swap"}`
    : `no ${e} of its own is mounted under key "${key}" in ${requestId}`;
}
//@ chunk-4121qate.js:163191-163849 placement
function checkMountedRaster(e, o) {
  let { requestId, key } = e;
  let s = mountedRasters().get(rasterKey(requestId, key, o.plugin));
  let i = [...(s?.rasters ?? [])];
  let [p] = i;
  if (s === undefined || p === undefined)
    return denyLater(describeForeignMount("Raster", e, isRasterKeyTakenByOther(requestId, key, o.plugin)));
  let columns = e.columns ?? p.columns;
  let rows = e.rows ?? p.rows;
  let filtered = i.filter((u) => u.columns === columns && u.rows === rows);
  if (filtered.length === 0)
    return denyLater(
      `the mounted Raster is ${p.columns}x${p.rows}, not ${columns}x${rows}; a resize is a redraw (ui.invalidate)`,
    );
  if (!takeBlitToken(s, Date.now()))
    return denyLater(
      `more than ${MAX_BLITS_PER_SECOND} blits a second; the surface paints at its frame rate, so one blit a frame is all that shows`,
    );
  let c = checkRasterCells(e.cells, columns, rows);
  if (c.problem !== undefined) return denyLater(c.problem);
  for (let u of filtered) u.paint(c.words);
  return Promise.resolve({});
}
//@ chunk-4121qate.js:163849-163918 placement
/**
 * 16 色位偏移
 */
var ANSI_16_COLOR_SHIFTS = {
  channelBits: 4,
  channelMax: 15,
  step: 17,
  greenShift: 4,
  redShift: 8,
};
//@ chunk-4121qate.js:163918-163961 placement
/**
 * 展开 4 位通道
 */
var expandChannel = (e, o) => ((e >> o) & ANSI_16_COLOR_SHIFTS.channelMax) * ANSI_16_COLOR_SHIFTS.step;
//@ chunk-4121qate.js:163961-163974 placement
/**
 * 32768
 */
var MAX_COLOR_DISTANCE = 32768;
//@ chunk-4121qate.js:163974-164134 placement
function quantizeColor(e) {
  if (e === TRANSPARENT_SENTINEL) return MAX_COLOR_DISTANCE;
  let o = (r) => Math.round(((e >> r) & TRUECOLOR_SHIFTS.channelMask) / ANSI_16_COLOR_SHIFTS.step);
  return (
    (o(TRUECOLOR_SHIFTS.redShift) << ANSI_16_COLOR_SHIFTS.redShift) |
    (o(TRUECOLOR_SHIFTS.greenShift) << ANSI_16_COLOR_SHIFTS.greenShift) |
    o(0)
  );
}
//@ chunk-4121qate.js:164134-164173 placement
/**
 * 打包前景/背景色
 */
var packColorPair = (e, o) => quantizeColor(e) | (quantizeColor(o) << HALF_SPLIT_CONSTANTS.halfBits);
//@ chunk-4121qate.js:164173-164199 placement
/**
 * 取低 16 位
 */
var lowerHalf = (e) => e & HALF_SPLIT_CONSTANTS.halfMask;
//@ chunk-4121qate.js:164199-164292 placement
/**
 * 38/48/39/49
 */
var COLOR_SGR_CODES = {
  setForeground: 38,
  setBackground: 48,
  resetForeground: 39,
  resetBackground: 49,
  truecolor: 2,
};
//@ chunk-4121qate.js:164292-164501 placement
function colorSgrPart(e, o) {
  let r = o === "foreground";
  return e === MAX_COLOR_DISTANCE
    ? String(r ? COLOR_SGR_CODES.resetForeground : COLOR_SGR_CODES.resetBackground)
    : [
        r ? COLOR_SGR_CODES.setForeground : COLOR_SGR_CODES.setBackground,
        COLOR_SGR_CODES.truecolor,
        expandChannel(e, ANSI_16_COLOR_SHIFTS.redShift),
        expandChannel(e, ANSI_16_COLOR_SHIFTS.greenShift),
        expandChannel(e, 0),
      ].join(";");
}
//@ chunk-4121qate.js:164501-164579 placement
/**
 * 生成前景+背景 SGR
 */
var colorPairSgr = (e) =>
  csi(`${colorSgrPart(lowerHalf(e), "foreground")}m`) + csi(`${colorSgrPart(upperHalf(e), "background")}m`);
//@ chunk-4121qate.js:164579-164604 placement
/**
 * 透明色 SGR
 */
var transparentSgr = () => colorPairSgr(packColorPair(TRANSPARENT_SENTINEL, TRANSPARENT_SENTINEL));
//@ chunk-4121qate.js:164604-164616 placement
/**
 * 1024
 */
var MAX_PALETTE_ENTRIES = 1024;
//@ chunk-4121qate.js:164616-164775 placement
var COLOR_ENTRY_LAYOUT = {
  width: 8,
  foregroundDefault: 0,
  foregroundRed: 1,
  foregroundGreen: 2,
  foregroundBlue: 3,
  backgroundDefault: 4,
  backgroundRed: 5,
  backgroundGreen: 6,
  backgroundBlue: 7,
};
//@ chunk-4121qate.js:164775-165005 placement
var createRasterStreamState = () => ({
  slots: [],
  held: new Map(),
  table: new Uint8Array(MAX_PALETTE_ENTRIES * COLOR_ENTRY_LAYOUT.width),
  probe: new Uint8Array(COLOR_ENTRY_LAYOUT.width),
  aliases: new Map(),
  admissions: 0,
  paint: 0,
  frame: new Set(),
  evaluated: 0,
  lastSgr: transparentSgr(),
  isStarved: false,
  hasCarried: false,
  netMatched: 0,
  hasStale: false,
});
//@ chunk-4121qate.js:165005-165156 placement
function staleSlotsByAge(rasterStreamState) {
  let o = [];
  let r = (n) => rasterStreamState.slots[n]?.lastPaint ?? 0;
  rasterStreamState.slots.forEach((slot, s) => {
    if (slot.lastPaint < rasterStreamState.paint) o.push(s);
  });
  return o.toSorted((n, s) => r(n) - r(s));
}
//@ chunk-4121qate.js:165156-165169 placement
/**
 * 16384
 */
var PALETTE_CACHE_SIZE = 16384;
//@ chunk-4121qate.js:165169-165534 placement
/**
 * 在调色板中找最接近的颜色槽。
 */
function nearestColorSlot(table, o, probe) {
  let n = -1;
  let s = 1 / 0;
  for (let i = 0; i < o; i++) {
    let p = i * COLOR_ENTRY_LAYOUT.width;
    let f = 0;
    for (let a = 0; a < COLOR_ENTRY_LAYOUT.width; a += COLOR_ENTRY_LAYOUT.backgroundDefault) {
      let m = (table[p + a] ?? 0) === 1;
      let c = (probe[a] ?? 0) === 1;
      if (m || c) f += m === c ? 0 : HALF_SPLIT_CONSTANTS.defaultMismatch;
      else {
        let u = (table[p + a + 1] ?? 0) - (probe[a + 1] ?? 0);
        let l = (table[p + a + 2] ?? 0) - (probe[a + 2] ?? 0);
        let y =
          (table[p + a + COLOR_ENTRY_LAYOUT.foregroundBlue] ?? 0) -
          (probe[a + COLOR_ENTRY_LAYOUT.foregroundBlue] ?? 0);
        f += u * u + l * l + y * y;
      }
    }
    if (f < s) {
      s = f;
      n = i;
    }
  }
  return n;
}
//@ chunk-4121qate.js:165534-165546 placement
/**
 * 4096
 */
var RASTER_ADMISSION_TOKENS = 4096;
//@ chunk-4121qate.js:165546-165584 placement
/**
 * 准入令牌状态
 */
var newAdmissionState = () => ({
  tokens: RASTER_ADMISSION_TOKENS,
  refilledAt: 0,
});
//@ chunk-4121qate.js:165584-165661 placement
/**
 * raster 准入槽
 */
var rasterAdmissionSlot = identity(
  () => (getPluginRegistry().rasterAdmission ??= newAdmissionState()),
  () => {
    getPluginRegistry().rasterAdmission = undefined;
  },
);
//@ chunk-4121qate.js:165661-165673 placement
/**
 * 1024
 */
var MAX_RASTER_CACHE = 1024;
//@ chunk-4121qate.js:165673-165687 placement
/**
 * 131072
 */
var MAX_RASTER_BYTES = 131072;
//@ chunk-4121qate.js:165687-165698 placement
/**
 * 160
 */
var MAX_RASTER_ROW_WIDTH = 160;
//@ chunk-4121qate.js:165698-165841 placement
function takeColorToken(e, o, r) {
  e.tokens = Math.min(
    RASTER_ADMISSION_TOKENS,
    e.tokens + (Math.max(0, o - e.refilledAt) * MAX_RASTER_ROW_WIDTH) / MAX_RASTER_COLUMNS,
  );
  e.refilledAt = o;
  let n = e.tokens - r >= 1;
  e.tokens -= n ? 1 : 0;
  return n;
}
//@ chunk-4121qate.js:165841-166085 placement
function writeColorEntry(e, o, r) {
  let { redShift, greenShift, channelMax } = ANSI_16_COLOR_SHIFTS;
  function p(f, a) {
    e[f] = a === MAX_COLOR_DISTANCE ? 1 : 0;
    e[f + COLOR_ENTRY_LAYOUT.foregroundRed] = (a >> redShift) & channelMax;
    e[f + COLOR_ENTRY_LAYOUT.foregroundGreen] = (a >> greenShift) & channelMax;
    e[f + COLOR_ENTRY_LAYOUT.foregroundBlue] = a & channelMax;
  }
  p(o * COLOR_ENTRY_LAYOUT.width, lowerHalf(r));
  p(o * COLOR_ENTRY_LAYOUT.width + COLOR_ENTRY_LAYOUT.backgroundDefault, upperHalf(r));
}
//@ chunk-4121qate.js:166085-167861 placement
function RasterStream(e = Date.now, o = rasterAdmissionSlot()) {
  let rasterStreamState = createRasterStreamState();
  let n = (u) => u !== undefined && rasterStreamState.held.get(u.entry.key) === u.entry;
  function s(u, l) {
    let y = {
      key: l,
      sgr: colorPairSgr(l),
      lastPaint: rasterStreamState.paint,
    };
    let g = rasterStreamState.slots[u];
    if (g !== undefined) rasterStreamState.held.delete(g.key);
    rasterStreamState.slots[u] = y;
    rasterStreamState.held.set(l, y);
    rasterStreamState.admissions += 1;
    writeColorEntry(rasterStreamState.table, u, l);
  }
  function i() {
    let u = [];
    for (let g of rasterStreamState.frame) {
      let x = rasterStreamState.held.get(g);
      let T = rasterStreamState.aliases.get(g);
      if (x !== undefined) {
        x.lastPaint = rasterStreamState.paint;
        continue;
      }
      u.push(g);
      if (T !== undefined) {
        rasterStreamState.aliases.delete(g);
        rasterStreamState.aliases.set(g, T);
      }
    }
    let l = staleSlotsByAge(rasterStreamState);
    let y = 0;
    for (let g of u) {
      let x = rasterStreamState.slots.length < MAX_PALETTE_ENTRIES;
      let T = x ? rasterStreamState.slots.length : l[y];
      if (T === undefined) break;
      if (!takeColorToken(o, e(), x ? 0 : MAX_RASTER_CACHE)) {
        rasterStreamState.isStarved = true;
        break;
      }
      s(T, g);
      y += x ? 0 : 1;
    }
  }
  let p = (u) =>
    !rasterStreamState.frame.has(u) || rasterStreamState.held.has(u) || !n(rasterStreamState.aliases.get(u));
  function f() {
    let u;
    let l = 0;
    for (let key of rasterStreamState.aliases.keys()) {
      u ??= key;
      if (p(key)) {
        u = key;
        break;
      }
      l += 1;
      if (l >= MAX_RASTER_ROWS) break;
    }
    if (u !== undefined) {
      rasterStreamState.netMatched -= p(u) ? 0 : 1;
      rasterStreamState.aliases.delete(u);
    }
  }
  function a(u, entry) {
    let y = !n(rasterStreamState.aliases.get(u));
    if (rasterStreamState.aliases.has(u)) rasterStreamState.aliases.delete(u);
    else if (rasterStreamState.aliases.size >= PALETTE_CACHE_SIZE) f();
    rasterStreamState.aliases.set(u, {
      entry,
      after: rasterStreamState.admissions,
    });
    rasterStreamState.netMatched += y ? 1 : 0;
  }
  function m(u) {
    if (!(
      rasterStreamState.slots.length > 0 &&
      rasterStreamState.evaluated + rasterStreamState.slots.length <= MAX_RASTER_BYTES
    ))
      return;
    writeColorEntry(rasterStreamState.probe, 0, u);
    rasterStreamState.evaluated += rasterStreamState.slots.length;
    let entry =
      rasterStreamState.slots[
        nearestColorSlot(rasterStreamState.table, rasterStreamState.slots.length, rasterStreamState.probe)
      ];
    if (entry !== undefined) a(u, entry);
    return entry;
  }
  function c(u) {
    let l = rasterStreamState.aliases.get(u);
    let y = l !== undefined && n(l);
    if (y && l.after === rasterStreamState.admissions) return l.entry;
    let g = m(u);
    if (g === undefined && y) {
      rasterStreamState.hasStale = true;
      return l.entry;
    }
    rasterStreamState.hasCarried ||= g === undefined && rasterStreamState.slots.length > 0;
    return g;
  }
  return {
    beginPaint: (frame) => {
      rasterStreamState.paint += 1;
      rasterStreamState.frame = frame;
      rasterStreamState.evaluated = 0;
      rasterStreamState.lastSgr = transparentSgr();
      rasterStreamState.isStarved = false;
      rasterStreamState.hasCarried = false;
      rasterStreamState.netMatched = 0;
      rasterStreamState.hasStale = false;
      i();
    },
    sgrOf: (u) => {
      rasterStreamState.lastSgr = (rasterStreamState.held.get(u) ?? c(u))?.sgr ?? rasterStreamState.lastSgr;
      return rasterStreamState.lastSgr;
    },
    size: () => rasterStreamState.held.size,
    standing: () =>
      (((rasterStreamState.hasCarried && rasterStreamState.netMatched > 0) ||
        (rasterStreamState.hasStale && !rasterStreamState.isStarved)) &&
        "progressing") ||
      (rasterStreamState.isStarved ? "waiting" : "complete"),
  };
}
//@ chunk-4121qate.js:167861-168100 placement
function collectColorKeys(e, o) {
  let { columns, rows } = o;
  let s = [];
  let i = new Set();
  for (let j = 0; j < rows; j++) {
    let f = -1;
    let a = -1;
    for (let j_2 = 0; j_2 < columns; j_2++) {
      let c = (j * columns + j_2) * RASTER_RETRY_COUNT;
      let u = e[c + 1] ?? 0;
      let l = e[c + 2] ?? 0;
      if (u !== f || l !== a) {
        let y = packColorPair(u, l);
        s.push(y);
        i.add(y);
        f = u;
        a = l;
      }
    }
  }
  return {
    keys: s,
    distinct: i,
  };
}
//@ chunk-4121qate.js:168100-168408 placement
/**
 * 把 Raster 单元格（字符 + 前景 + 背景）转换为带 SGR 颜色序列的终端文本行。
 */
function rasterToAnsi(e, o, r) {
  let { columns, rows } = o;
  let colorKeys = collectColorKeys(e, o);
  let p = Array(rows);
  let f = 0;
  r.beginPaint(colorKeys.distinct);
  for (let j = 0; j < rows; j++) {
    let m = "";
    let c = -1;
    let u = -1;
    for (let j_2 = 0; j_2 < columns; j_2++) {
      let y = (j * columns + j_2) * RASTER_RETRY_COUNT;
      let g = e[y + 1] ?? 0;
      let x = e[y + 2] ?? 0;
      if (g !== c || x !== u) {
        m += r.sgrOf(colorKeys.keys[f] ?? 0);
        f += 1;
        c = g;
        u = x;
      }
      m += String.fromCharCode(e[y] ?? 0);
    }
    p[j] = m;
  }
  return p.join(`
`);
}
//@ chunk-4121qate.js:168408-168419 placement
/**
 * 512
 */
var MAX_MOUNT_COLUMNS = 512;
//@ chunk-4121qate.js:168419-168430 placement
/**
 * 256
 */
var MAX_MOUNT_ROWS = 256;
//@ chunk-4121qate.js:168430-168617 placement
/**
 * 把挂载项加入按 key 索引的站点（不存在则新建），返回卸载函数（空站点会被删除）。
 */
function mountOnSite(e) {
  let { sites, siteKey, mount, mountsOf, freshSite } = e;
  let p = sites.get(siteKey) ?? freshSite();
  mountsOf(p).add(mount);
  sites.set(siteKey, p);
  return () => {
    let f = mountsOf(p);
    f.delete(mount);
    if (f.size === 0 && sites.get(siteKey) === p) sites.delete(siteKey);
  };
}
//@ chunk-4121qate.js:168617-168776 placement
/**
 * 把栅格挂载到按（请求, key, 插件）索引的站点。
 */
var mountRaster = (e) =>
  mountOnSite({
    sites: mountedRasters(),
    siteKey: rasterKey(e.requestId, e.key, e.plugin),
    mount: e,
    mountsOf: (o) => o.rasters,
    freshSite: () => ({
      rasters: new Set(),
      windowStart: 0,
      blits: 0,
    }),
  });
//@ chunk-4121qate.js:168776-168819 placement
/**
 * 校验挂载单元格
 */
var checkMountCellSize = (columns, rows) =>
  checkCellSize(columns, rows, {
    columns: MAX_MOUNT_COLUMNS,
    rows: MAX_MOUNT_ROWS,
  });
export {
  Vme,
  checkMountCellSize,
  checkRasterCells,
  rasterKey,
  rasterToAnsi,
  mountRaster,
  RasterStream,
  denyLater,
  describeForeignMount,
  takeBlitToken,
  MAX_BLITS_PER_SECOND,
  mountOnSite,
  checkRasterPaintArgs,
  checkMountedRaster,
};
