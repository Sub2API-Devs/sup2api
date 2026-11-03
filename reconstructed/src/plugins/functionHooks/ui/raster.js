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
import { pt } from "./validateTree.js";
import { bunStringWidth } from "../../../ink/stringWidth.js";
import { ge } from "../../../utils/identity.js";
import { getPluginRegistry } from "../../../utils/plugins/pluginLoadState.js";
import { csi } from "../../../ink/termio/csi.js";
import { checkCellSize } from "../sites/uiSites.js";

//@ chunk-4121qate.js:160366-160378 placement
var Mm = 1000;
//@ chunk-4121qate.js:160378-160388 placement
var Fm = 64;
//@ chunk-4121qate.js:160388-160445 placement
var dt = { halfBits: 16, halfMask: 65535, defaultMismatch: 4096 };
//@ chunk-4121qate.js:160445-160485 placement
var Qr = (e) => (e >>> dt.halfBits) & dt.halfMask;
//@ chunk-4121qate.js:160485-161022 placement
function checkRasterPaintArgs(e) {
  let o = typeof e?.requestId === "string" && e.requestId !== "" && typeof e.key === "string" && e.key !== "",
    r = e,
    n = typeof r?.cells === "string",
    s = isPlainObject(r?.source);
  if (!(o && n !== s && (r?.cells === void 0 || n) && (r?.source === void 0 || s)))
    return "takes { requestId, key, cells } (strings; the site, the Raster's key, its encoded cells) or { requestId, key, source } (the Image's key, its next ImageSource)";
  return (e.columns === void 0 || typeof e.columns === "number") &&
    (e.rows === void 0 || typeof e.rows === "number")
    ? void 0
    : "columns and rows are numbers when given";
}
//@ chunk-4121qate.js:161022-161032 placement
var $o = 12;
//@ chunk-4121qate.js:161032-161087 placement
var Lm = (e, o) => Math.ceil((e * o * $o) / pt.bytes) * pt.characters;
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
var oo = { unmeasured: 0, narrow: 1, refused: 2 };
//@ chunk-4121qate.js:161248-161258 placement
var jm = {};
//@ chunk-4121qate.js:161258-161542 placement
function isNarrowPrintable(e) {
  let o = (jm.table ??= new Uint8Array(CODE_POINT_LIMITS.bmpLast + 1)),
    r = o[e] ?? oo.unmeasured;
  if (r !== oo.unmeasured) return r === oo.narrow;
  let n =
    e > CODE_POINT_LIMITS.c0Last &&
    (e < CODE_POINT_LIMITS.delete || e > CODE_POINT_LIMITS.c1Last) &&
    (e < CODE_POINT_LIMITS.surrogateFirst || e > CODE_POINT_LIMITS.surrogateLast) &&
    bunStringWidth(String.fromCodePoint(e)) === 1;
  return ((o[e] = n ? oo.narrow : oo.refused), n);
}
/**
 * 校验栅格单元的码点（基本多文种平面内、可打印窄字符）。
 */
//@ chunk-4121qate.js:161542-161858 placement
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
var _t = 16777216;
//@ chunk-4121qate.js:161874-161938 placement
var ro = { redShift: 16, greenShift: 8, channelMask: 255, mask: 16777215 };
//@ chunk-4121qate.js:161938-161969 placement
var Ni = (e) => e <= ro.mask || e === _t;
//@ chunk-4121qate.js:161969-161978 placement
var Ct = 3;
//@ chunk-4121qate.js:161978-162560 placement
function checkRasterCells(e, o, r) {
  let n = o * r,
    s = Lm(o, r);
  if (typeof e !== "string" || e.length !== s)
    return {
      problem: `cells must be the base64 of ${n} cells of ${$o} bytes (${s} characters for ${o}x${r})`,
    };
  let buffer = Buffer.from(e, "base64");
  if (buffer.length !== n * $o) return { problem: "cells is not base64 (standard alphabet, padded)" };
  let uint32Array = new Uint32Array(n * Ct);
  new Uint8Array(uint32Array.buffer).set(buffer);
  for (let f = 0; f < n; f++) {
    let a = f * Ct,
      m = checkRasterCodePoint(uint32Array[a] ?? 0, f);
    if (m !== void 0) return { problem: m };
    if (!(Ni(uint32Array[a + 1] ?? 0) && Ni(uint32Array[a + 2] ?? 0)))
      return { problem: `cell ${f} holds a color that is neither 0xRRGGBB nor 0x1000000 (the default)` };
  }
  return { words: uint32Array };
}
//@ chunk-4121qate.js:162560-162599 placement
var K5e = (e) => Promise.resolve({ deny: e });
//@ chunk-4121qate.js:162599-162651 placement
var no = ge(
  () => getPluginRegistry().mountedRasters,
  (e) => e().clear(),
);
//@ chunk-4121qate.js:162651-162782 placement
function isRasterKeyTakenByOther(e, o, r) {
  for (let n of no().values())
    for (let raster of n.rasters)
      if (raster.requestId === e && raster.key === o && raster.plugin !== r) return !0;
  return !1;
}
//@ chunk-4121qate.js:162782-162794 placement
var wfr = 120;
//@ chunk-4121qate.js:162794-162825 placement
var fromCharCode = String.fromCharCode(0);
//@ chunk-4121qate.js:162825-162860 placement
var ext = (e, o, r) => [r, e, o].join(fromCharCode);
//@ chunk-4121qate.js:162860-162872 placement
var Km = 1000;
/**
 * 每秒最多 120 次 blit 的限流：窗口过期重置，返回本次是否允许。
 */
//@ chunk-4121qate.js:162872-162981 placement
function takeBlitToken(e, o) {
  if (o - e.windowStart >= Km) ((e.windowStart = o), (e.blits = 0));
  let r = e.blits < wfr;
  return ((e.blits += r ? 1 : 0), r);
}
/**
 * 描述挂载冲突：该 key 下的元素属于其他插件，或不存在。
 */
//@ chunk-4121qate.js:162981-163191 placement
function describeForeignMount(e, o, r) {
  let { requestId: requestId, key: key } = o;
  return r
    ? `the ${e} under key "${key}" in ${requestId} is another plugin's, not its to ${e === "Raster" ? "paint" : "swap"}`
    : `no ${e} of its own is mounted under key "${key}" in ${requestId}`;
}
//@ chunk-4121qate.js:163191-163849 placement
function checkMountedRaster(e, o) {
  let { requestId: requestId, key: key } = e,
    s = no().get(ext(requestId, key, o.plugin)),
    i = [...(s?.rasters ?? [])],
    [p] = i;
  if (s === void 0 || p === void 0)
    return K5e(describeForeignMount("Raster", e, isRasterKeyTakenByOther(requestId, key, o.plugin)));
  let f = e.columns ?? p.columns,
    a = e.rows ?? p.rows,
    filtered = i.filter((u) => u.columns === f && u.rows === a);
  if (filtered.length === 0)
    return K5e(
      `the mounted Raster is ${p.columns}x${p.rows}, not ${f}x${a}; a resize is a redraw (ui.invalidate)`,
    );
  if (!takeBlitToken(s, Date.now()))
    return K5e(
      `more than ${wfr} blits a second; the surface paints at its frame rate, so one blit a frame is all that shows`,
    );
  let c = checkRasterCells(e.cells, f, a);
  if (c.problem !== void 0) return K5e(c.problem);
  for (let u of filtered) u.paint(c.words);
  return Promise.resolve({});
}
//@ chunk-4121qate.js:163849-163918 placement
var We = { channelBits: 4, channelMax: 15, step: 17, greenShift: 4, redShift: 8 };
//@ chunk-4121qate.js:163918-163961 placement
var Zr = (e, o) => ((e >> o) & We.channelMax) * We.step;
//@ chunk-4121qate.js:163961-163974 placement
var so = 32768;
//@ chunk-4121qate.js:163974-164134 placement
function quantizeColor(e) {
  if (e === _t) return so;
  let o = (r) => Math.round(((e >> r) & ro.channelMask) / We.step);
  return (o(ro.redShift) << We.redShift) | (o(ro.greenShift) << We.greenShift) | o(0);
}
//@ chunk-4121qate.js:164134-164173 placement
var en = (e, o) => quantizeColor(e) | (quantizeColor(o) << dt.halfBits);
//@ chunk-4121qate.js:164173-164199 placement
var tn = (e) => e & dt.halfMask;
//@ chunk-4121qate.js:164199-164292 placement
var po = { setForeground: 38, setBackground: 48, resetForeground: 39, resetBackground: 49, truecolor: 2 };
//@ chunk-4121qate.js:164292-164501 placement
function colorSgrPart(e, o) {
  let r = o === "foreground";
  return e === so
    ? String(r ? po.resetForeground : po.resetBackground)
    : [
        r ? po.setForeground : po.setBackground,
        po.truecolor,
        Zr(e, We.redShift),
        Zr(e, We.greenShift),
        Zr(e, 0),
      ].join(";");
}
//@ chunk-4121qate.js:164501-164579 placement
var on = (e) => csi(`${colorSgrPart(tn(e), "foreground")}m`) + csi(`${colorSgrPart(Qr(e), "background")}m`);
//@ chunk-4121qate.js:164579-164604 placement
var rn = () => on(en(_t, _t));
//@ chunk-4121qate.js:164604-164616 placement
var nn = 1024;
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
  table: new Uint8Array(nn * COLOR_ENTRY_LAYOUT.width),
  probe: new Uint8Array(COLOR_ENTRY_LAYOUT.width),
  aliases: new Map(),
  admissions: 0,
  paint: 0,
  frame: new Set(),
  evaluated: 0,
  lastSgr: rn(),
  isStarved: !1,
  hasCarried: !1,
  netMatched: 0,
  hasStale: !1,
});
//@ chunk-4121qate.js:165005-165156 placement
function staleSlotsByAge(e) {
  let o = [],
    r = (n) => e.slots[n]?.lastPaint ?? 0;
  return (
    e.slots.forEach((slot, s) => {
      if (slot.lastPaint < e.paint) o.push(s);
    }),
    o.toSorted((n, s) => r(n) - r(s))
  );
}
//@ chunk-4121qate.js:165156-165169 placement
var Vm = 16384;
/**
 * 在调色板中找最接近的颜色槽。
 */
//@ chunk-4121qate.js:165169-165534 placement
function nearestColorSlot(e, o, r) {
  let n = -1,
    s = 1 / 0;
  for (let i = 0; i < o; i++) {
    let p = i * COLOR_ENTRY_LAYOUT.width,
      f = 0;
    for (let a = 0; a < COLOR_ENTRY_LAYOUT.width; a += COLOR_ENTRY_LAYOUT.backgroundDefault) {
      let m = (e[p + a] ?? 0) === 1,
        c = (r[a] ?? 0) === 1;
      if (m || c) f += m === c ? 0 : dt.defaultMismatch;
      else {
        let u = (e[p + a + 1] ?? 0) - (r[a + 1] ?? 0),
          l = (e[p + a + 2] ?? 0) - (r[a + 2] ?? 0),
          y =
            (e[p + a + COLOR_ENTRY_LAYOUT.foregroundBlue] ?? 0) -
            (r[a + COLOR_ENTRY_LAYOUT.foregroundBlue] ?? 0);
        f += u * u + l * l + y * y;
      }
    }
    if (f < s) ((s = f), (n = i));
  }
  return n;
}
//@ chunk-4121qate.js:165534-165546 placement
var sn = 4096;
//@ chunk-4121qate.js:165546-165584 placement
var zm = () => ({ tokens: sn, refilledAt: 0 });
//@ chunk-4121qate.js:165584-165661 placement
var Ym = ge(
  () => (getPluginRegistry().rasterAdmission ??= zm()),
  () => {
    getPluginRegistry().rasterAdmission = void 0;
  },
);
//@ chunk-4121qate.js:165661-165673 placement
var Jm = 1024;
//@ chunk-4121qate.js:165673-165687 placement
var qm = 131072;
//@ chunk-4121qate.js:165687-165698 placement
var Qm = 160;
//@ chunk-4121qate.js:165698-165841 placement
function takeColorToken(e, o, r) {
  ((e.tokens = Math.min(sn, e.tokens + (Math.max(0, o - e.refilledAt) * Qm) / Mm)), (e.refilledAt = o));
  let n = e.tokens - r >= 1;
  return ((e.tokens -= n ? 1 : 0), n);
}
//@ chunk-4121qate.js:165841-166085 placement
function writeColorEntry(e, o, r) {
  let { redShift: redShift, greenShift: greenShift, channelMax: channelMax } = We;
  function p(f, a) {
    ((e[f] = a === so ? 1 : 0),
      (e[f + COLOR_ENTRY_LAYOUT.foregroundRed] = (a >> redShift) & channelMax),
      (e[f + COLOR_ENTRY_LAYOUT.foregroundGreen] = (a >> greenShift) & channelMax),
      (e[f + COLOR_ENTRY_LAYOUT.foregroundBlue] = a & channelMax));
  }
  (p(o * COLOR_ENTRY_LAYOUT.width, tn(r)),
    p(o * COLOR_ENTRY_LAYOUT.width + COLOR_ENTRY_LAYOUT.backgroundDefault, Qr(r)));
}
//@ chunk-4121qate.js:166085-167861 placement
function RasterStream(e = Date.now, o = Ym()) {
  let r = createRasterStreamState(),
    n = (u) => u !== void 0 && r.held.get(u.entry.key) === u.entry;
  function s(u, l) {
    let y = { key: l, sgr: on(l), lastPaint: r.paint },
      g = r.slots[u];
    if (g !== void 0) r.held.delete(g.key);
    ((r.slots[u] = y), r.held.set(l, y), (r.admissions += 1), writeColorEntry(r.table, u, l));
  }
  function i() {
    let u = [];
    for (let g of r.frame) {
      let x = r.held.get(g),
        T = r.aliases.get(g);
      if (x !== void 0) {
        x.lastPaint = r.paint;
        continue;
      }
      if ((u.push(g), T !== void 0)) (r.aliases.delete(g), r.aliases.set(g, T));
    }
    let l = staleSlotsByAge(r),
      y = 0;
    for (let g of u) {
      let x = r.slots.length < nn,
        T = x ? r.slots.length : l[y];
      if (T === void 0) break;
      if (!takeColorToken(o, e(), x ? 0 : Jm)) {
        r.isStarved = !0;
        break;
      }
      (s(T, g), (y += x ? 0 : 1));
    }
  }
  let p = (u) => !r.frame.has(u) || r.held.has(u) || !n(r.aliases.get(u));
  function f() {
    let u,
      l = 0;
    for (let y of r.aliases.keys()) {
      if (((u ??= y), p(y))) {
        u = y;
        break;
      }
      if (((l += 1), l >= Fm)) break;
    }
    if (u !== void 0) ((r.netMatched -= p(u) ? 0 : 1), r.aliases.delete(u));
  }
  function a(u, l) {
    let y = !n(r.aliases.get(u));
    if (r.aliases.has(u)) r.aliases.delete(u);
    else if (r.aliases.size >= Vm) f();
    (r.aliases.set(u, { entry: l, after: r.admissions }), (r.netMatched += y ? 1 : 0));
  }
  function m(u) {
    if (!(r.slots.length > 0 && r.evaluated + r.slots.length <= qm)) return;
    (writeColorEntry(r.probe, 0, u), (r.evaluated += r.slots.length));
    let y = r.slots[nearestColorSlot(r.table, r.slots.length, r.probe)];
    if (y !== void 0) a(u, y);
    return y;
  }
  function c(u) {
    let l = r.aliases.get(u),
      y = l !== void 0 && n(l);
    if (y && l.after === r.admissions) return l.entry;
    let g = m(u);
    if (g === void 0 && y) return ((r.hasStale = !0), l.entry);
    return ((r.hasCarried ||= g === void 0 && r.slots.length > 0), g);
  }
  return {
    beginPaint: (u) => {
      ((r.paint += 1),
        (r.frame = u),
        (r.evaluated = 0),
        (r.lastSgr = rn()),
        (r.isStarved = !1),
        (r.hasCarried = !1),
        (r.netMatched = 0),
        (r.hasStale = !1),
        i());
    },
    sgrOf: (u) => ((r.lastSgr = (r.held.get(u) ?? c(u))?.sgr ?? r.lastSgr), r.lastSgr),
    size: () => r.held.size,
    standing: () =>
      (((r.hasCarried && r.netMatched > 0) || (r.hasStale && !r.isStarved)) && "progressing") ||
      (r.isStarved ? "waiting" : "complete"),
  };
}
//@ chunk-4121qate.js:167861-168100 placement
function collectColorKeys(e, o) {
  let { columns: columns, rows: rows } = o,
    s = [],
    i = new Set();
  for (let p = 0; p < rows; p++) {
    let f = -1,
      a = -1;
    for (let m = 0; m < columns; m++) {
      let c = (p * columns + m) * Ct,
        u = e[c + 1] ?? 0,
        l = e[c + 2] ?? 0;
      if (u !== f || l !== a) {
        let y = en(u, l);
        (s.push(y), i.add(y), (f = u), (a = l));
      }
    }
  }
  return { keys: s, distinct: i };
}
/**
 * 把 Raster 单元格（字符 + 前景 + 背景）转换为带 SGR 颜色序列的终端文本行。
 */
//@ chunk-4121qate.js:168100-168408 placement
function rasterToAnsi(e, o, r) {
  let { columns: columns, rows: rows } = o,
    i = collectColorKeys(e, o),
    p = Array(rows),
    f = 0;
  r.beginPaint(i.distinct);
  for (let a = 0; a < rows; a++) {
    let m = "",
      c = -1,
      u = -1;
    for (let l = 0; l < columns; l++) {
      let y = (a * columns + l) * Ct,
        g = e[y + 1] ?? 0,
        x = e[y + 2] ?? 0;
      if (g !== c || x !== u) ((m += r.sgrOf(i.keys[f] ?? 0)), (f += 1), (c = g), (u = x));
      m += String.fromCharCode(e[y] ?? 0);
    }
    p[a] = m;
  }
  return p.join(`
`);
}
//@ chunk-4121qate.js:168408-168419 placement
var tu = 512;
//@ chunk-4121qate.js:168419-168430 placement
var ou = 256;
/**
 * 把挂载项加入按 key 索引的站点（不存在则新建），返回卸载函数（空站点会被删除）。
 */
//@ chunk-4121qate.js:168430-168617 placement
function mountOnSite(e) {
  let { sites: sites, siteKey: siteKey, mount: mount, mountsOf: mountsOf, freshSite: freshSite } = e,
    p = sites.get(siteKey) ?? freshSite();
  return (
    mountsOf(p).add(mount),
    sites.set(siteKey, p),
    () => {
      let f = mountsOf(p);
      if ((f.delete(mount), f.size === 0 && sites.get(siteKey) === p)) sites.delete(siteKey);
    }
  );
}
/**
 * 把栅格挂载到按（请求, key, 插件）索引的站点。
 */
//@ chunk-4121qate.js:168617-168776 placement
var mountRaster = (e) =>
  mountOnSite({
    sites: no(),
    siteKey: ext(e.requestId, e.key, e.plugin),
    mount: e,
    mountsOf: (o) => o.rasters,
    freshSite: () => ({ rasters: new Set(), windowStart: 0, blits: 0 }),
  });
//@ chunk-4121qate.js:168776-168819 placement
var WE = (e, o) => checkCellSize(e, o, { columns: tu, rows: ou });

export {
  fromCharCode,
  WE,
  checkRasterCells,
  ext,
  rasterToAnsi,
  mountRaster,
  RasterStream,
  K5e,
  describeForeignMount,
  takeBlitToken,
  wfr,
  mountOnSite,
  checkRasterPaintArgs,
  checkMountedRaster,
};
