/**
 * ink/termio/iterm2Image.ts
 *
 * 2.1.316 新增：生成 iTerm2 内联图片的 OSC 1337 转义序列（校验 base64 与尺寸）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bzr73sfg.js (9)
 * attribution: placement 6, sole-consumer 3
 */
import { deflateSync } from "zlib";
import { ESC, BEL as BEL_2 } from "./ansi.js";
import { COMBINING_MARK_CODES } from "../../utils/unicode/combiningMarks.js";
import { PNG_SIGNATURE } from "../../utils/ansiToPng.js";

//@ chunk-bzr73sfg.js:265785-265925 placement
/**
 * 终端内联图片（iTerm2 File= / kitty Unicode 占位）编码常量：图片 id 上限 2^24、行列下标上限为附加符号表长度、PNG 边长上限 10000；占位字符 U+2800（盲文空格）+ 组合附加符号编码行/列/id。316 新增。
 */
var ITERM_FILE_PREFIX = `${ESC}]1337;File=`;
var MAX_ITERM_IMAGE_ID = 16777216;
var MAX_PLACEHOLDER_INDEX = COMBINING_MARK_CODES.length;
var MAX_PNG_DIMENSION = 1e4;
var DIACRITIC_INDEX = new Map(COMBINING_MARK_CODES.map((n, u) => [n, u]));
var DIACRITIC_COUNT = COMBINING_MARK_CODES.length;
var PLACEHOLDER_CHAR = "\u2800";
var PLACEHOLDER_CODE_POINT = PLACEHOLDER_CHAR.codePointAt(0);
//@ chunk-bzr73sfg.js:265925-266079 placement
function assertImageInt(value, max) {
  if (!Number.isInteger(value) || value < 1 || value > max)
    throw TypeError("iTerm2 image: an id, cell count or size must be a positive integer within its range");
}
//@ chunk-bzr73sfg.js:266079-266237 placement
function assertBase64(payload) {
  if (typeof payload !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(payload))
    throw TypeError("iTerm2 image: payload must be standard base64 (A-Z a-z 0-9 + / =)");
}
//@ chunk-bzr73sfg.js:266577-266854 placement
function decodeImagePlaceholder(grapheme) {
  if (grapheme.codePointAt(0) !== PLACEHOLDER_CODE_POINT) return;
  let mapped = Array.from(grapheme)
    .slice(1)
    .map((A) => DIACRITIC_INDEX.get(A.codePointAt(0)));
  let [f, m, p, g, E] = mapped;
  if (
    mapped.length !== 5 ||
    f === undefined ||
    m === undefined ||
    p === undefined ||
    g === undefined ||
    E === undefined
  )
    return;
  let T = (p * DIACRITIC_COUNT + g) * DIACRITIC_COUNT + E;
  return T === 0 || T >= MAX_ITERM_IMAGE_ID
    ? undefined
    : {
        id: T,
        row: f,
        column: m,
      };
}
//@ chunk-bzr73sfg.js:266854-267166 placement
/**
 * 生成 iTerm2 内联图片的 OSC 1337 转义序列（校验 base64 与尺寸）。
 */
function buildItermImageSequence(image) {
  let { pngBase64, columns, rows } = image;
  assertImageInt(columns, MAX_PLACEHOLDER_INDEX);
  assertImageInt(rows, MAX_PLACEHOLDER_INDEX);
  assertBase64(pngBase64);
  if (pngBase64 === "") throw TypeError("iTerm2 image: the payload is empty");
  let p = pngBase64.endsWith("==") ? 2 : pngBase64.endsWith("=") ? 1 : 0;
  let E = `inline=1;size=${(pngBase64.length / 4) * 3 - p};width=${columns};height=${rows};preserveAspectRatio=1;doNotMoveCursor=1`;
  return `${ITERM_FILE_PREFIX}${E}:${pngBase64}${BEL_2}`;
}
//@ chunk-bzr73sfg.js:267166-267310 sole-consumer
var CRC32_TABLE = (() => {
  let uint32Array = new Uint32Array(256);
  for (let idx = 0; idx < 256; idx++) {
    let f = idx;
    for (let idx = 0; idx < 8; idx++) f = f & 1 ? 3988292384 ^ (f >>> 1) : f >>> 1;
    uint32Array[idx] = f >>> 0;
  }
  return uint32Array;
})();
//@ chunk-bzr73sfg.js:267310-267404 sole-consumer
function crc32(bytes) {
  let u = 4294967295;
  for (let byte of bytes) u = CRC32_TABLE[(u ^ byte) & 255] ^ (u >>> 8);
  return (u ^ 4294967295) >>> 0;
}
//@ chunk-bzr73sfg.js:267404-267618 sole-consumer = chunk (0.773)
function pngChunk(type, data) {
  let body = Buffer.alloc(8);
  body.writeUInt32BE(data.length, 0);
  body.write(type, 4, "ascii");
  let buffer = Buffer.concat([body.subarray(4), data]);
  let out = Buffer.alloc(4);
  out.writeUInt32BE(crc32(buffer), 0);
  return Buffer.concat([body.subarray(0, 4), buffer, out]);
}
//@ chunk-bzr73sfg.js:267665-268093 placement = encodePng (0.778)
function encodeRgbaPng(px, width, height) {
  assertImageInt(width, MAX_PNG_DIMENSION);
  assertImageInt(height, MAX_PNG_DIMENSION);
  assertBase64(px);
  let buffer = Buffer.from(px, "base64");
  let p = width * 4;
  if (buffer.length !== p * height) throw TypeError("iTerm2 image: RGBA bytes do not match the size");
  let raw = Buffer.alloc((p + 1) * height);
  for (let y = 0; y < height; y++) buffer.copy(raw, y * (p + 1) + 1, y * p, (y + 1) * p);
  let E = Buffer.alloc(13);
  E.writeUInt32BE(width, 0);
  E.writeUInt32BE(height, 4);
  E[8] = 8;
  E[9] = 6;
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", E),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", new Uint8Array(0)),
  ]).toString("base64");
}
export {
  buildItermImageSequence,
  encodeRgbaPng,
  PLACEHOLDER_CHAR,
  DIACRITIC_COUNT,
  assertImageInt,
  MAX_ITERM_IMAGE_ID,
  MAX_PLACEHOLDER_INDEX,
  decodeImagePlaceholder,
};
