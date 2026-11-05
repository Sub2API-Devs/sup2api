/**
 * ink/termio/iterm2Image.ts
 *
 * 2.1.316 新增：生成 iTerm2 内联图片的 OSC 1337 转义序列（校验 base64 与尺寸）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2avr6cej.js (10)
 * attribution: placement 6, layout 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { deflateSync } from "zlib";
import { ESC, BEL as BEL_2 } from "./ansi.js";
import { COMBINING_MARK_CODES } from "../../utils/unicode/combiningMarks.js";

//@ chunk-2avr6cej.js:265366-265506 placement
/**
 * 终端内联图片（iTerm2 File= / kitty Unicode 占位）编码常量：图片 id 上限 2^24、行列下标上限为附加符号表长度、PNG 边长上限 10000；占位字符 U+2800（盲文空格）+ 组合附加符号编码行/列/id。316 新增。
 */
var ITERM_FILE_PREFIX = `${ESC}]1337;File=`;
var MAX_ITERM_IMAGE_ID = 16777216;
var MAX_PLACEHOLDER_INDEX = COMBINING_MARK_CODES.length;
var MAX_PNG_DIMENSION = 1e4;
var DIACRITIC_INDEX = new Map(COMBINING_MARK_CODES.map((code, index) => [code, index]));
var DIACRITIC_COUNT = COMBINING_MARK_CODES.length;
var PLACEHOLDER_CHAR = "\u2800";
var PLACEHOLDER_CODE_POINT = PLACEHOLDER_CHAR.codePointAt(0);
//@ chunk-2avr6cej.js:265506-265660 placement
function assertImageInt(value, max) {
  if (!Number.isInteger(value) || value < 1 || value > max)
    throw TypeError("iTerm2 image: an id, cell count or size must be a positive integer within its range");
}
//@ chunk-2avr6cej.js:265660-265818 placement
function assertBase64(payload) {
  if (typeof payload !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(payload))
    throw TypeError("iTerm2 image: payload must be standard base64 (A-Z a-z 0-9 + / =)");
}
//@ chunk-2avr6cej.js:266158-266435 placement
function decodeImagePlaceholder(grapheme) {
  if (grapheme.codePointAt(0) !== PLACEHOLDER_CODE_POINT) return;
  let mapped = Array.from(grapheme)
    .slice(1)
    .map((char) => DIACRITIC_INDEX.get(char.codePointAt(0)));
  let [rowIndex, columnIndex, high, mid, low] = mapped;
  if (
    mapped.length !== 5 ||
    rowIndex === undefined ||
    columnIndex === undefined ||
    high === undefined ||
    mid === undefined ||
    low === undefined
  )
    return;
  let imageId = (high * DIACRITIC_COUNT + mid) * DIACRITIC_COUNT + low;
  return imageId === 0 || imageId >= MAX_ITERM_IMAGE_ID
    ? undefined
    : {
        id: imageId,
        row: rowIndex,
        column: columnIndex,
      };
}
//@ chunk-2avr6cej.js:266435-266747 placement
/**
 * 生成 iTerm2 内联图片的 OSC 1337 转义序列（校验 base64 与尺寸）。
 */
function buildItermImageSequence(image) {
  let { pngBase64, columns, rows } = image;
  assertImageInt(columns, MAX_PLACEHOLDER_INDEX);
  assertImageInt(rows, MAX_PLACEHOLDER_INDEX);
  assertBase64(pngBase64);
  if (pngBase64 === "") throw TypeError("iTerm2 image: the payload is empty");
  let padding = pngBase64.endsWith("==") ? 2 : pngBase64.endsWith("=") ? 1 : 0;
  let params = `inline=1;size=${(pngBase64.length / 4) * 3 - padding};width=${columns};height=${rows};preserveAspectRatio=1;doNotMoveCursor=1`;
  return `${ITERM_FILE_PREFIX}${params}:${pngBase64}${BEL_2}`;
}
//@ chunk-2avr6cej.js:266747-266891 layout
var CRC32_TABLE = (() => {
  let uint32Array = new Uint32Array(256);
  for (let idx = 0; idx < 256; idx++) {
    let crc = idx;
    for (let idx = 0; idx < 8; idx++) crc = crc & 1 ? 3988292384 ^ (crc >>> 1) : crc >>> 1;
    uint32Array[idx] = crc >>> 0;
  }
  return uint32Array;
})();
//@ chunk-2avr6cej.js:266891-266985 layout
function crc32(bytes) {
  let crc = 4294967295;
  for (let byte of bytes) crc = CRC32_TABLE[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 4294967295) >>> 0;
}
//@ chunk-2avr6cej.js:266985-267199 layout (2.1.88 match: chunk, 0.773)
function pngChunk(type, data) {
  let body = Buffer.alloc(8);
  body.writeUInt32BE(data.length, 0);
  body.write(type, 4, "ascii");
  let buffer = Buffer.concat([body.subarray(4), data]);
  let out = Buffer.alloc(4);
  out.writeUInt32BE(crc32(buffer), 0);
  return Buffer.concat([body.subarray(0, 4), buffer, out]);
}
//@ chunk-2avr6cej.js:267199-267246 layout
var PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
//@ chunk-2avr6cej.js:267246-267674 placement (2.1.88 match: encodePng, 0.779)
function encodeRgbaPng(px, width, height) {
  assertImageInt(width, MAX_PNG_DIMENSION);
  assertImageInt(height, MAX_PNG_DIMENSION);
  assertBase64(px);
  let buffer = Buffer.from(px, "base64");
  let rowBytes = width * 4;
  if (buffer.length !== rowBytes * height) throw TypeError("iTerm2 image: RGBA bytes do not match the size");
  let raw = Buffer.alloc((rowBytes + 1) * height);
  for (let y = 0; y < height; y++) buffer.copy(raw, y * (rowBytes + 1) + 1, y * rowBytes, (y + 1) * rowBytes);
  let pngHeader = Buffer.alloc(13);
  pngHeader.writeUInt32BE(width, 0);
  pngHeader.writeUInt32BE(height, 4);
  pngHeader[8] = 8;
  pngHeader[9] = 6;
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", pngHeader),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", new Uint8Array(0)),
  ]).toString("base64");
}
export {
  PLACEHOLDER_CHAR,
  DIACRITIC_COUNT,
  assertImageInt,
  MAX_ITERM_IMAGE_ID,
  MAX_PLACEHOLDER_INDEX,
  decodeImagePlaceholder,
  buildItermImageSequence,
  encodeRgbaPng,
};
