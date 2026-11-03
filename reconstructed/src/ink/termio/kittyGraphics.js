/**
 * ink/termio/kittyGraphics.ts
 *
 * 2.1.316 新增。Kitty 图形协议。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-m1vyn8g1.js (14)
 * attribution: placement 14
 */
import { ESC, ESC_TYPE } from "./ansi.js";
import { csi } from "./csi.js";
import { COMBINING_MARK_CODES } from "../../utils/unicode/combiningMarks.js";
import { SGR_DEFAULT_FG } from "./sgr.js";
import { ST } from "./osc.js";

//@ chunk-m1vyn8g1.js:3511-3675 placement
/**
 * Kitty 图形协议常量：APC 前缀与 G 命令头、分块大小 4096、占位码点 U+10EEEE、颜色/尺寸上限、路径字节上限。
 */
var KITTY_APC = ESC + String.fromCharCode(ESC_TYPE.APC);
var KITTY_GRAPHICS_PREFIX = `${KITTY_APC}G`;
var KITTY_CHUNK_SIZE = 4096;
var KITTY_PLACEHOLDER_CODE_POINT = 1109742;
var KITTY_PLACEHOLDER_CHAR = String.fromCodePoint(KITTY_PLACEHOLDER_CODE_POINT);
var ANSI_256_LIMIT = 256;
var MAX_UINT32 = 4294967295;
var MAX_PIXEL_SIZE = 1e4;
var RGB_SHIFTS = {
  mask: 255,
  redShift: 16,
  greenShift: 8,
};
var MAX_PATH_BYTES = (KITTY_CHUNK_SIZE / 4) * 3;
//@ chunk-m1vyn8g1.js:3675-3836 placement
function assertIntInRange(e, n) {
  if (!Number.isInteger(e) || e < 1 || e > n)
    throw TypeError(
      "kitty graphics: an id, cell count or pixel size must be a positive integer within its range",
    );
}
//@ chunk-m1vyn8g1.js:3836-3995 placement
function assertBase64(e) {
  if (typeof e !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(e))
    throw TypeError("kitty graphics: payload must be standard base64 (A-Z a-z 0-9 + / =)");
}
//@ chunk-m1vyn8g1.js:3995-4222 placement
function assertMediumName(e) {
  if (!(
    typeof e === "string" &&
    e !== "" &&
    !e.includes("\x00") &&
    Buffer.byteLength(e, "utf8") <= MAX_PATH_BYTES
  ))
    throw TypeError(
      "kitty graphics: a file path or shared-memory name must be a non-empty string of at most 3072 bytes, no NUL",
    );
}
//@ chunk-m1vyn8g1.js:4222-4274 placement = base64URLEncode (1)
var base64URLEncode = (buffer) => Buffer.from(buffer, "utf8").toString("base64");
//@ chunk-m1vyn8g1.js:4274-4417 placement
function imageIdColorSgr(e) {
  assertIntInRange(e, MAX_UINT32);
  let n = e < ANSI_256_LIMIT;
  let o = (e >>> RGB_SHIFTS.redShift) & RGB_SHIFTS.mask;
  let t = (e >>> RGB_SHIFTS.greenShift) & RGB_SHIFTS.mask;
  let i = e & RGB_SHIFTS.mask;
  return csi(n ? `38;5;${e}m` : `38;2;${o};${t};${i}m`);
}
//@ chunk-m1vyn8g1.js:4417-4477 placement
/**
 * 按行生成组合标记字符
 */
var buildPlaceholderColumnMarks = (e) => COMBINING_MARK_CODES.slice(0, e).map((n) => String.fromCodePoint(n));
//@ chunk-m1vyn8g1.js:4477-4612 placement
/**
 * 生成 Kitty 图形协议的 Unicode 占位符网格（按行列附加组合标记与图像 id 颜色）。
 */
function buildKittyPlaceholderGrid(id, columns, rows) {
  assertIntInRange(columns, COMBINING_MARK_CODES.length);
  assertIntInRange(rows, COMBINING_MARK_CODES.length);
  let t = imageIdColorSgr(id);
  let placeholderColumnMarks = buildPlaceholderColumnMarks(columns);
  return buildPlaceholderColumnMarks(rows).map(
    (s) =>
      t +
      placeholderColumnMarks
        .map((placeholderColumnMark) => KITTY_PLACEHOLDER_CHAR + s + placeholderColumnMark)
        .join("") +
      SGR_DEFAULT_FG,
  ).join(`
`);
}
//@ chunk-m1vyn8g1.js:4612-4683 placement
/**
 * 拼接 kitty 图形协议的 APC 序列（payload 与可选的 base64 元数据）。
 */
function kittyGraphicsSequence(e, n) {
  let o = n === undefined ? "" : `;${n}`;
  return `${KITTY_GRAPHICS_PREFIX}${e}${o}${ST}`;
}
//@ chunk-m1vyn8g1.js:4683-4751 placement
/**
 * 格式码映射
 */
var KITTY_FORMAT_CODES = {
  png: "f=100",
  rgba: "f=32",
  rgb: "f=24",
};
var KITTY_MEDIUM_CODES = {
  file: "t=f",
  shm: "t=s",
};
//@ chunk-m1vyn8g1.js:4751-5320 placement
/**
 * 生成 Kitty 图形传输并放置序列：校验 id/行列/尺寸，文件或共享内存介质传路径，否则把 base64 按 4096 分块（m=1/m=0）。
 */
function buildKittyTransmitSequence(e) {
  let { id, source, columns, rows } = e;
  assertIntInRange(id, MAX_UINT32);
  assertIntInRange(columns, COMBINING_MARK_CODES.length);
  assertIntInRange(rows, COMBINING_MARK_CODES.length);
  if (source.format !== "png") {
    assertIntInRange(source.width, MAX_PIXEL_SIZE);
    assertIntInRange(source.height, MAX_PIXEL_SIZE);
  }
  let r = source.format !== "png" ? `,s=${source.width},v=${source.height}` : "";
  let u = `${KITTY_FORMAT_CODES[source.format]}${r}`;
  let m = `i=${id},c=${columns},r=${rows}`;
  if ("medium" in source) {
    assertMediumName(source.name);
    let l = KITTY_MEDIUM_CODES[source.medium];
    return kittyGraphicsSequence(`a=T,U=1,q=1,${u},${l},${m}`, base64URLEncode(source.name));
  }
  assertBase64(source.base64);
  let p = `a=T,U=1,q=2,${u},${m}`;
  let { base64 } = source;
  if (base64.length <= KITTY_CHUNK_SIZE) return kittyGraphicsSequence(p, base64);
  let g = [];
  for (let l = 0; l < base64.length; l += KITTY_CHUNK_SIZE) {
    let T = l + KITTY_CHUNK_SIZE >= base64.length ? "m=0" : "m=1";
    let C = l === 0 ? `${p},${T}` : `${T},q=2`;
    g.push(kittyGraphicsSequence(C, base64.slice(l, l + KITTY_CHUNK_SIZE)));
  }
  return g.join("");
}
//@ chunk-m1vyn8g1.js:5320-5374 placement
/**
 * 生成按 id 删除 kitty 图像的序列。
 */
function deleteKittyImage(pendingDelete) {
  assertIntInRange(pendingDelete, MAX_UINT32);
  return kittyGraphicsSequence(`a=d,d=I,i=${pendingDelete},q=2`);
}
//@ chunk-m1vyn8g1.js:5374-5442 placement
/**
 * 生成传输并立即显示的 kitty 图像序列（1×1 占位）。
 */
function transmitKittyImage(e) {
  assertIntInRange(e, MAX_UINT32);
  return kittyGraphicsSequence(`i=${e},s=1,v=1,a=q,t=d,f=24`, "AAAA");
}
//@ chunk-m1vyn8g1.js:5442-5517 placement
/**
 * 以 32 位 RGBA（f=32）传输给定数据并放置图像。
 */
function transmitKittyRgba(e, buffer) {
  assertIntInRange(e, MAX_UINT32);
  assertMediumName(buffer);
  return kittyGraphicsSequence(`i=${e},s=1,v=1,a=q,t=f,f=32`, base64URLEncode(buffer));
}
export {
  transmitKittyRgba,
  buildKittyTransmitSequence,
  buildKittyPlaceholderGrid,
  ANSI_256_LIMIT,
  deleteKittyImage,
  transmitKittyImage,
};
