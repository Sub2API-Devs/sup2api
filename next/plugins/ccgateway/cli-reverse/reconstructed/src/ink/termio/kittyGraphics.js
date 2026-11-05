/**
 * ink/termio/kittyGraphics.ts
 *
 * 2.1.316 新增。Kitty 图形协议。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-kx37bqfp.js (14)
 * attribution: placement 14
 */
import { ESC, ESC_TYPE } from "./ansi.js";
import { csi } from "./csi.js";
import { COMBINING_MARK_CODES } from "../../utils/unicode/combiningMarks.js";
import { SGR_DEFAULT_FG } from "./sgr.js";
import { ST } from "./osc.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-kx37bqfp.js:3511-3675 placement
/**
 * Kitty 图形协议常量：APC 前缀与 G 命令头、分块大小 4096、占位码点 U+10EEEE、颜色/尺寸上限、路径字节上限。
 */
var KITTY_APC; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var KITTY_GRAPHICS_PREFIX;
var KITTY_CHUNK_SIZE;
var KITTY_PLACEHOLDER_CODE_POINT;
var KITTY_PLACEHOLDER_CHAR;
var ANSI_256_LIMIT;
var MAX_UINT32;
var MAX_PIXEL_SIZE;
var RGB_SHIFTS;
var MAX_PATH_BYTES;
deferInit("chunk-kx37bqfp.js:3511", () => {
  KITTY_APC = ESC + String.fromCharCode(ESC_TYPE.APC);
  KITTY_GRAPHICS_PREFIX = `${KITTY_APC}G`;
  KITTY_CHUNK_SIZE = 4096;
  KITTY_PLACEHOLDER_CODE_POINT = 1109742;
  KITTY_PLACEHOLDER_CHAR = String.fromCodePoint(KITTY_PLACEHOLDER_CODE_POINT);
  ANSI_256_LIMIT = 256;
  MAX_UINT32 = 4294967295;
  MAX_PIXEL_SIZE = 1e4;
  RGB_SHIFTS = {
    mask: 255,
    redShift: 16,
    greenShift: 8,
  };
  MAX_PATH_BYTES = (KITTY_CHUNK_SIZE / 4) * 3;
});
//@ chunk-kx37bqfp.js:3675-3836 placement
function assertIntInRange(value, max) {
  if (!Number.isInteger(value) || value < 1 || value > max)
    throw TypeError(
      "kitty graphics: an id, cell count or pixel size must be a positive integer within its range",
    );
}
//@ chunk-kx37bqfp.js:3836-3995 placement
function assertBase64(data) {
  if (typeof data !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(data))
    throw TypeError("kitty graphics: payload must be standard base64 (A-Z a-z 0-9 + / =)");
}
//@ chunk-kx37bqfp.js:3995-4222 placement
function assertMediumName(name) {
  if (!(
    typeof name === "string" &&
    name !== "" &&
    !name.includes("\x00") &&
    Buffer.byteLength(name, "utf8") <= MAX_PATH_BYTES
  ))
    throw TypeError(
      "kitty graphics: a file path or shared-memory name must be a non-empty string of at most 3072 bytes, no NUL",
    );
}
//@ chunk-kx37bqfp.js:4222-4274 placement (2.1.88 match: base64URLEncode, 1)
var base64URLEncode = (buffer) => Buffer.from(buffer, "utf8").toString("base64");
//@ chunk-kx37bqfp.js:4274-4417 placement
function imageIdColorSgr(imageId) {
  assertIntInRange(imageId, MAX_UINT32);
  let isAnsi256 = imageId < ANSI_256_LIMIT;
  let red = (imageId >>> RGB_SHIFTS.redShift) & RGB_SHIFTS.mask;
  let green = (imageId >>> RGB_SHIFTS.greenShift) & RGB_SHIFTS.mask;
  let blue = imageId & RGB_SHIFTS.mask;
  return csi(isAnsi256 ? `38;5;${imageId}m` : `38;2;${red};${green};${blue}m`);
}
//@ chunk-kx37bqfp.js:4417-4477 placement
/**
 * 按行生成组合标记字符
 */
var buildPlaceholderColumnMarks = (count) =>
  COMBINING_MARK_CODES.slice(0, count).map((codePoint) => String.fromCodePoint(codePoint));
//@ chunk-kx37bqfp.js:4477-4612 placement
/**
 * 生成 Kitty 图形协议的 Unicode 占位符网格（按行列附加组合标记与图像 id 颜色）。
 */
function buildKittyPlaceholderGrid(imageId, count, count_2) {
  assertIntInRange(count, COMBINING_MARK_CODES.length);
  assertIntInRange(count_2, COMBINING_MARK_CODES.length);
  let colorSgr = imageIdColorSgr(imageId);
  let placeholderColumnMarks = buildPlaceholderColumnMarks(count);
  return buildPlaceholderColumnMarks(count_2).map(
    (rowMark) =>
      colorSgr +
      placeholderColumnMarks
        .map((placeholderColumnMark) => KITTY_PLACEHOLDER_CHAR + rowMark + placeholderColumnMark)
        .join("") +
      SGR_DEFAULT_FG,
  ).join(`
`);
}
//@ chunk-kx37bqfp.js:4612-4683 placement
/**
 * 拼接 kitty 图形协议的 APC 序列（payload 与可选的 base64 元数据）。
 */
function kittyGraphicsSequence(command, payload) {
  let payloadSuffix = payload === undefined ? "" : `;${payload}`;
  return `${KITTY_GRAPHICS_PREFIX}${command}${payloadSuffix}${ST}`;
}
//@ chunk-kx37bqfp.js:4683-4751 placement
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
//@ chunk-kx37bqfp.js:4751-5320 placement
/**
 * 生成 Kitty 图形传输并放置序列：校验 id/行列/尺寸，文件或共享内存介质传路径，否则把 base64 按 4096 分块（m=1/m=0）。
 */
function buildKittyTransmitSequence(transmit) {
  let { id, source, columns, rows } = transmit;
  assertIntInRange(id, MAX_UINT32);
  assertIntInRange(columns, COMBINING_MARK_CODES.length);
  assertIntInRange(rows, COMBINING_MARK_CODES.length);
  if (source.format !== "png") {
    assertIntInRange(source.width, MAX_PIXEL_SIZE);
    assertIntInRange(source.height, MAX_PIXEL_SIZE);
  }
  let sizeParams = source.format !== "png" ? `,s=${source.width},v=${source.height}` : "";
  let formatParam = `${KITTY_FORMAT_CODES[source.format]}${sizeParams}`;
  let idParams = `i=${id},c=${columns},r=${rows}`;
  if ("medium" in source) {
    assertMediumName(source.name);
    let mediumParam = KITTY_MEDIUM_CODES[source.medium];
    return kittyGraphicsSequence(
      `a=T,U=1,q=1,${formatParam},${mediumParam},${idParams}`,
      base64URLEncode(source.name),
    );
  }
  assertBase64(source.base64);
  let controlParams = `a=T,U=1,q=2,${formatParam},${idParams}`;
  let { base64 } = source;
  if (base64.length <= KITTY_CHUNK_SIZE) return kittyGraphicsSequence(controlParams, base64);
  let chunks = [];
  for (let offset = 0; offset < base64.length; offset += KITTY_CHUNK_SIZE) {
    let moreFlag = offset + KITTY_CHUNK_SIZE >= base64.length ? "m=0" : "m=1";
    let chunkParams = offset === 0 ? `${controlParams},${moreFlag}` : `${moreFlag},q=2`;
    chunks.push(kittyGraphicsSequence(chunkParams, base64.slice(offset, offset + KITTY_CHUNK_SIZE)));
  }
  return chunks.join("");
}
//@ chunk-kx37bqfp.js:5320-5374 placement
/**
 * 生成按 id 删除 kitty 图像的序列。
 */
function deleteKittyImage(pendingDelete) {
  assertIntInRange(pendingDelete, MAX_UINT32);
  return kittyGraphicsSequence(`a=d,d=I,i=${pendingDelete},q=2`);
}
//@ chunk-kx37bqfp.js:5374-5442 placement
/**
 * 生成传输并立即显示的 kitty 图像序列（1×1 占位）。
 */
function transmitKittyImage(imageId) {
  assertIntInRange(imageId, MAX_UINT32);
  return kittyGraphicsSequence(`i=${imageId},s=1,v=1,a=q,t=d,f=24`, "AAAA");
}
//@ chunk-kx37bqfp.js:5442-5517 placement
/**
 * 以 32 位 RGBA（f=32）传输给定数据并放置图像。
 */
function transmitKittyRgba(imageId, tempPath) {
  assertIntInRange(imageId, MAX_UINT32);
  assertMediumName(tempPath);
  return kittyGraphicsSequence(`i=${imageId},s=1,v=1,a=q,t=f,f=32`, base64URLEncode(tempPath));
}
export {
  ANSI_256_LIMIT,
  deleteKittyImage,
  transmitKittyImage,
  transmitKittyRgba,
  buildKittyTransmitSequence,
  buildKittyPlaceholderGrid,
};
