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

/**
 * Kitty 图形协议常量：APC 前缀与 G 命令头、分块大小 4096、占位码点 U+10EEEE、颜色/尺寸上限、路径字节上限。
 */
//@ chunk-m1vyn8g1.js:3511-3675 placement
var KITTY_APC = ESC + String.fromCharCode(ESC_TYPE.APC),
  KITTY_GRAPHICS_PREFIX = `${KITTY_APC}G`,
  KITTY_CHUNK_SIZE = 4096,
  KITTY_PLACEHOLDER_CODE_POINT = 1109742,
  KITTY_PLACEHOLDER_CHAR = String.fromCodePoint(KITTY_PLACEHOLDER_CODE_POINT),
  ANSI_256_LIMIT = 256,
  MAX_UINT32 = 4294967295,
  MAX_PIXEL_SIZE = 1e4,
  RGB_SHIFTS = { mask: 255, redShift: 16, greenShift: 8 },
  MAX_PATH_BYTES = (KITTY_CHUNK_SIZE / 4) * 3;
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
  let n = e < ANSI_256_LIMIT,
    o = (e >>> RGB_SHIFTS.redShift) & RGB_SHIFTS.mask,
    t = (e >>> RGB_SHIFTS.greenShift) & RGB_SHIFTS.mask,
    i = e & RGB_SHIFTS.mask;
  return csi(n ? `38;5;${e}m` : `38;2;${o};${t};${i}m`);
}
//@ chunk-m1vyn8g1.js:4417-4477 placement
var R = (e) => COMBINING_MARK_CODES.slice(0, e).map((n) => String.fromCodePoint(n));
/**
 * 生成 Kitty 图形协议的 Unicode 占位符网格（按行列附加组合标记与图像 id 颜色）。
 */
//@ chunk-m1vyn8g1.js:4477-4612 placement
function buildKittyPlaceholderGrid(e, n, o) {
  (assertIntInRange(n, COMBINING_MARK_CODES.length), assertIntInRange(o, COMBINING_MARK_CODES.length));
  let t = imageIdColorSgr(e),
    i = R(n);
  return R(o).map((s) => t + i.map((r) => KITTY_PLACEHOLDER_CHAR + s + r).join("") + SGR_DEFAULT_FG).join(`
`);
}
//@ chunk-m1vyn8g1.js:4612-4683 placement
function c(e, n) {
  let o = n === void 0 ? "" : `;${n}`;
  return `${KITTY_GRAPHICS_PREFIX}${e}${o}${ST}`;
}
//@ chunk-m1vyn8g1.js:4683-4751 placement
var O = { png: "f=100", rgba: "f=32", rgb: "f=24" },
  Y = { file: "t=f", shm: "t=s" };
/**
 * 生成 Kitty 图形传输并放置序列：校验 id/行列/尺寸，文件或共享内存介质传路径，否则把 base64 按 4096 分块（m=1/m=0）。
 */
//@ chunk-m1vyn8g1.js:4751-5320 placement
function buildKittyTransmitSequence(e) {
  let { id: id, source: source, columns: columns, rows: rows } = e;
  if (
    (assertIntInRange(id, MAX_UINT32),
    assertIntInRange(columns, COMBINING_MARK_CODES.length),
    assertIntInRange(rows, COMBINING_MARK_CODES.length),
    source.format !== "png")
  )
    (assertIntInRange(source.width, MAX_PIXEL_SIZE), assertIntInRange(source.height, MAX_PIXEL_SIZE));
  let r = source.format !== "png" ? `,s=${source.width},v=${source.height}` : "",
    u = `${O[source.format]}${r}`,
    m = `i=${id},c=${columns},r=${rows}`;
  if ("medium" in source) {
    assertMediumName(source.name);
    let l = Y[source.medium];
    return c(`a=T,U=1,q=1,${u},${l},${m}`, base64URLEncode(source.name));
  }
  assertBase64(source.base64);
  let p = `a=T,U=1,q=2,${u},${m}`,
    { base64: base64 } = source;
  if (base64.length <= KITTY_CHUNK_SIZE) return c(p, base64);
  let g = [];
  for (let l = 0; l < base64.length; l += KITTY_CHUNK_SIZE) {
    let T = l + KITTY_CHUNK_SIZE >= base64.length ? "m=0" : "m=1",
      C = l === 0 ? `${p},${T}` : `${T},q=2`;
    g.push(c(C, base64.slice(l, l + KITTY_CHUNK_SIZE)));
  }
  return g.join("");
}
//@ chunk-m1vyn8g1.js:5320-5374 placement
function RIs(e) {
  return (assertIntInRange(e, MAX_UINT32), c(`a=d,d=I,i=${e},q=2`));
}
//@ chunk-m1vyn8g1.js:5374-5442 placement
function v(e) {
  return (assertIntInRange(e, MAX_UINT32), c(`i=${e},s=1,v=1,a=q,t=d,f=24`, "AAAA"));
}
//@ chunk-m1vyn8g1.js:5442-5517 placement
function xIs(e, n) {
  return (
    assertIntInRange(e, MAX_UINT32),
    assertMediumName(n),
    c(`i=${e},s=1,v=1,a=q,t=f,f=32`, base64URLEncode(n))
  );
}

export { xIs, buildKittyTransmitSequence, buildKittyPlaceholderGrid, ANSI_256_LIMIT, RIs, v };
