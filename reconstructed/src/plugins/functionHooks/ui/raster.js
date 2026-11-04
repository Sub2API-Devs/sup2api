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
import { deferInit } from "../../../../runtime/deferred-init.js";

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
var upperHalf = (value) => (value >>> HALF_SPLIT_CONSTANTS.halfBits) & HALF_SPLIT_CONSTANTS.halfMask;
//@ chunk-4121qate.js:160485-161022 placement
function checkRasterPaintArgs(args) {
  let hasPlace =
    typeof args?.requestId === "string" &&
    args.requestId !== "" &&
    typeof args.key === "string" &&
    args.key !== "";
  let request = args;
  let hasCells = typeof request?.cells === "string";
  let hasSource = isPlainObject(request?.source);
  if (!(
    hasPlace &&
    hasCells !== hasSource &&
    (request?.cells === undefined || hasCells) &&
    (request?.source === undefined || hasSource)
  ))
    return "takes { requestId, key, cells } (strings; the site, the Raster's key, its encoded cells) or { requestId, key, source } (the Image's key, its next ImageSource)";
  return (args.columns === undefined || typeof args.columns === "number") &&
    (args.rows === undefined || typeof args.rows === "number")
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
var estimateCellBytes = (columns, rows) =>
  Math.ceil((columns * rows * RGBA_BYTES) / base64BytesPerFour.bytes) * base64BytesPerFour.characters;
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
function isNarrowPrintable(codePoint) {
  let table = (EMPTY_RASTER_MAP.table ??= new Uint8Array(CODE_POINT_LIMITS.bmpLast + 1));
  let known = table[codePoint] ?? RASTER_MEASURE_STATES.unmeasured;
  if (known !== RASTER_MEASURE_STATES.unmeasured) return known === RASTER_MEASURE_STATES.narrow;
  let isNarrow =
    codePoint > CODE_POINT_LIMITS.c0Last &&
    (codePoint < CODE_POINT_LIMITS.delete || codePoint > CODE_POINT_LIMITS.c1Last) &&
    (codePoint < CODE_POINT_LIMITS.surrogateFirst || codePoint > CODE_POINT_LIMITS.surrogateLast) &&
    bunStringWidth(String.fromCodePoint(codePoint)) === 1;
  table[codePoint] = isNarrow ? RASTER_MEASURE_STATES.narrow : RASTER_MEASURE_STATES.refused;
  return isNarrow;
}
//@ chunk-4121qate.js:161542-161858 placement
/**
 * 校验栅格单元的码点（基本多文种平面内、可打印窄字符）。
 */
function checkRasterCodePoint(codePoint, cellIndex) {
  if (codePoint > CODE_POINT_LIMITS.bmpLast)
    return `cell ${cellIndex} holds code point ${codePoint}, beyond the Basic Multilingual Plane`;
  if (isNarrowPrintable(codePoint)) return;
  let padded = codePoint
    .toString(CODE_POINT_LIMITS.hexRadix)
    .toUpperCase()
    .padStart(CODE_POINT_LIMITS.hexDigits, "0");
  return `cell ${cellIndex} holds U+${padded}, which is not one printable width-1 code point (a control, combining or wide character)`;
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
var isValidColorInt = (color) => color <= TRUECOLOR_SHIFTS.mask || color === TRANSPARENT_SENTINEL;
//@ chunk-4121qate.js:161969-161978 placement
/**
 * 3
 */
var RASTER_RETRY_COUNT = 3;
//@ chunk-4121qate.js:161978-162560 placement
function checkRasterCells(cells, columns, rows) {
  let cellCount = columns * rows;
  let expectedChars = estimateCellBytes(columns, rows);
  if (typeof cells !== "string" || cells.length !== expectedChars)
    return {
      problem: `cells must be the base64 of ${cellCount} cells of ${RGBA_BYTES} bytes (${expectedChars} characters for ${columns}x${rows})`,
    };
  let buffer = Buffer.from(cells, "base64");
  if (buffer.length !== cellCount * RGBA_BYTES)
    return {
      problem: "cells is not base64 (standard alphabet, padded)",
    };
  let uint32Array = new Uint32Array(cellCount * RASTER_RETRY_COUNT);
  new Uint8Array(uint32Array.buffer).set(buffer);
  for (let j = 0; j < cellCount; j++) {
    let wordIndex = j * RASTER_RETRY_COUNT;
    let codePointProblem = checkRasterCodePoint(uint32Array[wordIndex] ?? 0, j);
    if (codePointProblem !== undefined)
      return {
        problem: codePointProblem,
      };
    if (!(
      isValidColorInt(uint32Array[wordIndex + 1] ?? 0) && isValidColorInt(uint32Array[wordIndex + 2] ?? 0)
    ))
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
var mountedRasters; // deferred: uses getPluginRegistry (../../../utils/plugins/pluginLoadState.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4121qate.js:162599", () => {
  mountedRasters = identity(
    () => getPluginRegistry().mountedRasters,
    (registry) => registry().clear(),
  );
});
//@ chunk-4121qate.js:162651-162782 placement
function isRasterKeyTakenByOther(requestId, key, plugin) {
  for (let entry of mountedRasters().values())
    for (let raster of entry.rasters)
      if (raster.requestId === requestId && raster.key === key && raster.plugin !== plugin) return true;
  return false;
}
//@ chunk-4121qate.js:162782-162794 placement
/**
 * raster 每秒最多贴 120 次；超出后本次直接拒绝，防止界面被单插件刷屏。
 */
var MAX_BLITS_PER_SECOND = 120;
//@ chunk-4121qate.js:162794-162825 placement
var KEY_SEPARATOR; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-4121qate.js:162794", () => {
  KEY_SEPARATOR = String.fromCharCode(0);
});
//@ chunk-4121qate.js:162825-162860 placement
/**
 * raster 键
 */
var rasterKey = (requestId, key, plugin) => [plugin, requestId, key].join(KEY_SEPARATOR);
//@ chunk-4121qate.js:162860-162872 placement
/**
 * 1000
 */
var BLIT_WINDOW_MS = 1000;
//@ chunk-4121qate.js:162872-162981 placement
/**
 * 每秒最多 120 次 blit 的限流：窗口过期重置，返回本次是否允许。
 */
function takeBlitToken(budget, now) {
  if (now - budget.windowStart >= BLIT_WINDOW_MS) {
    budget.windowStart = now;
    budget.blits = 0;
  }
  let isAllowed = budget.blits < MAX_BLITS_PER_SECOND;
  budget.blits += isAllowed ? 1 : 0;
  return isAllowed;
}
//@ chunk-4121qate.js:162981-163191 placement
/**
 * 描述挂载冲突：该 key 下的元素属于其他插件，或不存在。
 */
function describeForeignMount(noun, args, isOther) {
  let { requestId, key } = args;
  return isOther
    ? `the ${noun} under key "${key}" in ${requestId} is another plugin's, not its to ${noun === "Raster" ? "paint" : "swap"}`
    : `no ${noun} of its own is mounted under key "${key}" in ${requestId}`;
}
//@ chunk-4121qate.js:163191-163849 placement
function checkMountedRaster(args, context) {
  let { requestId, key } = args;
  let mounted = mountedRasters().get(rasterKey(requestId, key, context.plugin));
  let rasters = [...(mounted?.rasters ?? [])];
  let [firstRaster] = rasters;
  if (mounted === undefined || firstRaster === undefined)
    return denyLater(
      describeForeignMount("Raster", args, isRasterKeyTakenByOther(requestId, key, context.plugin)),
    );
  let columns = args.columns ?? firstRaster.columns;
  let rows = args.rows ?? firstRaster.rows;
  let filtered = rasters.filter((raster) => raster.columns === columns && raster.rows === rows);
  if (filtered.length === 0)
    return denyLater(
      `the mounted Raster is ${firstRaster.columns}x${firstRaster.rows}, not ${columns}x${rows}; a resize is a redraw (ui.invalidate)`,
    );
  if (!takeBlitToken(mounted, Date.now()))
    return denyLater(
      `more than ${MAX_BLITS_PER_SECOND} blits a second; the surface paints at its frame rate, so one blit a frame is all that shows`,
    );
  let checked = checkRasterCells(args.cells, columns, rows);
  if (checked.problem !== undefined) return denyLater(checked.problem);
  for (let raster of filtered) raster.paint(checked.words);
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
var expandChannel = (color, shift) =>
  ((color >> shift) & ANSI_16_COLOR_SHIFTS.channelMax) * ANSI_16_COLOR_SHIFTS.step;
//@ chunk-4121qate.js:163961-163974 placement
/**
 * 32768
 */
var MAX_COLOR_DISTANCE = 32768;
//@ chunk-4121qate.js:163974-164134 placement
function quantizeColor(color) {
  if (color === TRANSPARENT_SENTINEL) return MAX_COLOR_DISTANCE;
  let channelOf = (shift) =>
    Math.round(((color >> shift) & TRUECOLOR_SHIFTS.channelMask) / ANSI_16_COLOR_SHIFTS.step);
  return (
    (channelOf(TRUECOLOR_SHIFTS.redShift) << ANSI_16_COLOR_SHIFTS.redShift) |
    (channelOf(TRUECOLOR_SHIFTS.greenShift) << ANSI_16_COLOR_SHIFTS.greenShift) |
    channelOf(0)
  );
}
//@ chunk-4121qate.js:164134-164173 placement
/**
 * 打包前景/背景色
 */
var packColorPair = (first, second) =>
  quantizeColor(first) | (quantizeColor(second) << HALF_SPLIT_CONSTANTS.halfBits);
//@ chunk-4121qate.js:164173-164199 placement
/**
 * 取低 16 位
 */
var lowerHalf = (value) => value & HALF_SPLIT_CONSTANTS.halfMask;
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
function colorSgrPart(color, layer) {
  let isForeground = layer === "foreground";
  return color === MAX_COLOR_DISTANCE
    ? String(isForeground ? COLOR_SGR_CODES.resetForeground : COLOR_SGR_CODES.resetBackground)
    : [
        isForeground ? COLOR_SGR_CODES.setForeground : COLOR_SGR_CODES.setBackground,
        COLOR_SGR_CODES.truecolor,
        expandChannel(color, ANSI_16_COLOR_SHIFTS.redShift),
        expandChannel(color, ANSI_16_COLOR_SHIFTS.greenShift),
        expandChannel(color, 0),
      ].join(";");
}
//@ chunk-4121qate.js:164501-164579 placement
/**
 * 生成前景+背景 SGR
 */
var colorPairSgr = (colorPair) =>
  csi(`${colorSgrPart(lowerHalf(colorPair), "foreground")}m`) +
  csi(`${colorSgrPart(upperHalf(colorPair), "background")}m`);
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
  let stale = [];
  let lastPaintOf = (slotIndex) => rasterStreamState.slots[slotIndex]?.lastPaint ?? 0;
  rasterStreamState.slots.forEach((slot, slotIndex) => {
    if (slot.lastPaint < rasterStreamState.paint) stale.push(slotIndex);
  });
  return stale.toSorted((a, b) => lastPaintOf(a) - lastPaintOf(b));
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
function nearestColorSlot(table, slotCount, probe) {
  let bestIndex = -1;
  let bestDistance = 1 / 0;
  for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
    let base = slotIndex * COLOR_ENTRY_LAYOUT.width;
    let distance = 0;
    for (
      let layerOffset = 0;
      layerOffset < COLOR_ENTRY_LAYOUT.width;
      layerOffset += COLOR_ENTRY_LAYOUT.backgroundDefault
    ) {
      let isDefault = (table[base + layerOffset] ?? 0) === 1;
      let probeDefault = (probe[layerOffset] ?? 0) === 1;
      if (isDefault || probeDefault)
        distance += isDefault === probeDefault ? 0 : HALF_SPLIT_CONSTANTS.defaultMismatch;
      else {
        let redDiff = (table[base + layerOffset + 1] ?? 0) - (probe[layerOffset + 1] ?? 0);
        let greenDiff = (table[base + layerOffset + 2] ?? 0) - (probe[layerOffset + 2] ?? 0);
        let blueDiff =
          (table[base + layerOffset + COLOR_ENTRY_LAYOUT.foregroundBlue] ?? 0) -
          (probe[layerOffset + COLOR_ENTRY_LAYOUT.foregroundBlue] ?? 0);
        distance += redDiff * redDiff + greenDiff * greenDiff + blueDiff * blueDiff;
      }
    }
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = slotIndex;
    }
  }
  return bestIndex;
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
var rasterAdmissionSlot; // deferred: uses getPluginRegistry (../../../utils/plugins/pluginLoadState.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4121qate.js:165584", () => {
  rasterAdmissionSlot = identity(
    () => (getPluginRegistry().rasterAdmission ??= newAdmissionState()),
    () => {
      getPluginRegistry().rasterAdmission = undefined;
    },
  );
});
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
function takeColorToken(bucket, now, cost) {
  bucket.tokens = Math.min(
    RASTER_ADMISSION_TOKENS,
    bucket.tokens + (Math.max(0, now - bucket.refilledAt) * MAX_RASTER_ROW_WIDTH) / MAX_RASTER_COLUMNS,
  );
  bucket.refilledAt = now;
  let isAllowed = bucket.tokens - cost >= 1;
  bucket.tokens -= isAllowed ? 1 : 0;
  return isAllowed;
}
//@ chunk-4121qate.js:165841-166085 placement
function writeColorEntry(table, slotIndex, colorPair) {
  let { redShift, greenShift, channelMax } = ANSI_16_COLOR_SHIFTS;
  function writeLayer(offset, color) {
    table[offset] = color === MAX_COLOR_DISTANCE ? 1 : 0;
    table[offset + COLOR_ENTRY_LAYOUT.foregroundRed] = (color >> redShift) & channelMax;
    table[offset + COLOR_ENTRY_LAYOUT.foregroundGreen] = (color >> greenShift) & channelMax;
    table[offset + COLOR_ENTRY_LAYOUT.foregroundBlue] = color & channelMax;
  }
  writeLayer(slotIndex * COLOR_ENTRY_LAYOUT.width, lowerHalf(colorPair));
  writeLayer(
    slotIndex * COLOR_ENTRY_LAYOUT.width + COLOR_ENTRY_LAYOUT.backgroundDefault,
    upperHalf(colorPair),
  );
}
//@ chunk-4121qate.js:166085-167861 placement
function RasterStream(now = Date.now, bucket = rasterAdmissionSlot()) {
  let rasterStreamState = createRasterStreamState();
  let isHeld = (aliasEntry) =>
    aliasEntry !== undefined && rasterStreamState.held.get(aliasEntry.entry.key) === aliasEntry.entry;
  function admitSlot(slotIndex, colorPair) {
    let slot = {
      key: colorPair,
      sgr: colorPairSgr(colorPair),
      lastPaint: rasterStreamState.paint,
    };
    let previous = rasterStreamState.slots[slotIndex];
    if (previous !== undefined) rasterStreamState.held.delete(previous.key);
    rasterStreamState.slots[slotIndex] = slot;
    rasterStreamState.held.set(colorPair, slot);
    rasterStreamState.admissions += 1;
    writeColorEntry(rasterStreamState.table, slotIndex, colorPair);
  }
  function dropStale() {
    let missing = [];
    for (let colorPair of rasterStreamState.frame) {
      let entry = rasterStreamState.held.get(colorPair);
      let aliasEntry = rasterStreamState.aliases.get(colorPair);
      if (entry !== undefined) {
        entry.lastPaint = rasterStreamState.paint;
        continue;
      }
      missing.push(colorPair);
      if (aliasEntry !== undefined) {
        rasterStreamState.aliases.delete(colorPair);
        rasterStreamState.aliases.set(colorPair, aliasEntry);
      }
    }
    let stale = staleSlotsByAge(rasterStreamState);
    let staleIndex = 0;
    for (let colorPair of missing) {
      let isFreshSlot = rasterStreamState.slots.length < MAX_PALETTE_ENTRIES;
      let targetSlot = isFreshSlot ? rasterStreamState.slots.length : stale[staleIndex];
      if (targetSlot === undefined) break;
      if (!takeColorToken(bucket, now(), isFreshSlot ? 0 : MAX_RASTER_CACHE)) {
        rasterStreamState.isStarved = true;
        break;
      }
      admitSlot(targetSlot, colorPair);
      staleIndex += isFreshSlot ? 0 : 1;
    }
  }
  let isDroppable = (colorPair) =>
    !rasterStreamState.frame.has(colorPair) ||
    rasterStreamState.held.has(colorPair) ||
    !isHeld(rasterStreamState.aliases.get(colorPair));
  function evictOne() {
    let victim;
    let scanned = 0;
    for (let key of rasterStreamState.aliases.keys()) {
      victim ??= key;
      if (isDroppable(key)) {
        victim = key;
        break;
      }
      scanned += 1;
      if (scanned >= MAX_RASTER_ROWS) break;
    }
    if (victim !== undefined) {
      rasterStreamState.netMatched -= isDroppable(victim) ? 0 : 1;
      rasterStreamState.aliases.delete(victim);
    }
  }
  function noteAlias(colorPair, entry) {
    let wasUnheld = !isHeld(rasterStreamState.aliases.get(colorPair));
    if (rasterStreamState.aliases.has(colorPair)) rasterStreamState.aliases.delete(colorPair);
    else if (rasterStreamState.aliases.size >= PALETTE_CACHE_SIZE) evictOne();
    rasterStreamState.aliases.set(colorPair, {
      entry,
      after: rasterStreamState.admissions,
    });
    rasterStreamState.netMatched += wasUnheld ? 1 : 0;
  }
  function bestEntry(colorPair) {
    if (!(
      rasterStreamState.slots.length > 0 &&
      rasterStreamState.evaluated + rasterStreamState.slots.length <= MAX_RASTER_BYTES
    ))
      return;
    writeColorEntry(rasterStreamState.probe, 0, colorPair);
    rasterStreamState.evaluated += rasterStreamState.slots.length;
    let entry =
      rasterStreamState.slots[
        nearestColorSlot(rasterStreamState.table, rasterStreamState.slots.length, rasterStreamState.probe)
      ];
    if (entry !== undefined) noteAlias(colorPair, entry);
    return entry;
  }
  function entryFor(colorPair) {
    let aliasEntry = rasterStreamState.aliases.get(colorPair);
    let isAliasHeld = aliasEntry !== undefined && isHeld(aliasEntry);
    if (isAliasHeld && aliasEntry.after === rasterStreamState.admissions) return aliasEntry.entry;
    let entry = bestEntry(colorPair);
    if (entry === undefined && isAliasHeld) {
      rasterStreamState.hasStale = true;
      return aliasEntry.entry;
    }
    rasterStreamState.hasCarried ||= entry === undefined && rasterStreamState.slots.length > 0;
    return entry;
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
      dropStale();
    },
    sgrOf: (colorPair) => {
      rasterStreamState.lastSgr =
        (rasterStreamState.held.get(colorPair) ?? entryFor(colorPair))?.sgr ?? rasterStreamState.lastSgr;
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
function collectColorKeys(words, size) {
  let { columns, rows } = size;
  let keys = [];
  let distinct = new Set();
  for (let j = 0; j < rows; j++) {
    let previousForeground = -1;
    let previousBackground = -1;
    for (let j_2 = 0; j_2 < columns; j_2++) {
      let wordIndex = (j * columns + j_2) * RASTER_RETRY_COUNT;
      let foreground = words[wordIndex + 1] ?? 0;
      let background = words[wordIndex + 2] ?? 0;
      if (foreground !== previousForeground || background !== previousBackground) {
        let colorPair = packColorPair(foreground, background);
        keys.push(colorPair);
        distinct.add(colorPair);
        previousForeground = foreground;
        previousBackground = background;
      }
    }
  }
  return {
    keys,
    distinct,
  };
}
//@ chunk-4121qate.js:168100-168408 placement
/**
 * 把 Raster 单元格（字符 + 前景 + 背景）转换为带 SGR 颜色序列的终端文本行。
 */
function rasterToAnsi(words, size, paint) {
  let { columns, rows } = size;
  let colorKeys = collectColorKeys(words, size);
  let lines = Array(rows);
  let keyIndex = 0;
  paint.beginPaint(colorKeys.distinct);
  for (let j = 0; j < rows; j++) {
    let line = "";
    let previousForeground = -1;
    let previousBackground = -1;
    for (let j_2 = 0; j_2 < columns; j_2++) {
      let wordIndex = (j * columns + j_2) * RASTER_RETRY_COUNT;
      let foreground = words[wordIndex + 1] ?? 0;
      let background = words[wordIndex + 2] ?? 0;
      if (foreground !== previousForeground || background !== previousBackground) {
        line += paint.sgrOf(colorKeys.keys[keyIndex] ?? 0);
        keyIndex += 1;
        previousForeground = foreground;
        previousBackground = background;
      }
      line += String.fromCharCode(words[wordIndex] ?? 0);
    }
    lines[j] = line;
  }
  return lines.join(`
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
function mountOnSite(options) {
  let { sites, siteKey, mount, mountsOf, freshSite } = options;
  let site = sites.get(siteKey) ?? freshSite();
  mountsOf(site).add(mount);
  sites.set(siteKey, site);
  return () => {
    let mounts = mountsOf(site);
    mounts.delete(mount);
    if (mounts.size === 0 && sites.get(siteKey) === site) sites.delete(siteKey);
  };
}
//@ chunk-4121qate.js:168617-168776 placement
/**
 * 把栅格挂载到按（请求, key, 插件）索引的站点。
 */
var mountRaster = (mount) =>
  mountOnSite({
    sites: mountedRasters(),
    siteKey: rasterKey(mount.requestId, mount.key, mount.plugin),
    mount,
    mountsOf: (site) => site.rasters,
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
  KEY_SEPARATOR,
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
