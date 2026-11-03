/**
 * utils/taggedId.ts
 *
 * 带前缀的 ID 编码（UUID 转大整数等）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/taggedId.ts
 * pieces: chunk-6mwt0myy.js (8)
 * attribution: placement 7, fingerprint 1
 */
import { truncateCodePoints } from "./stringUtils.js";

//@ chunk-6mwt0myy.js:635-655 placement
/**
 * 工具名最大字符数（200）。
 */
var MAX_WIRE_TOOL_NAME_CHARS = 200;
var MAX_WIRE_TOOL_NAME_BYTES = 128;
//@ chunk-6mwt0myy.js:655-751 placement
/**
 * 工具名是否超过长度上限（按码点计）。
 */
function isOverlongToolName(e) {
  if (e.length <= MAX_WIRE_TOOL_NAME_CHARS) return false;
  let n = 0;
  for (let r of e) {
    n++;
    if (n > MAX_WIRE_TOOL_NAME_CHARS) return true;
  }
  return false;
}
//@ chunk-6mwt0myy.js:751-819 placement
/**
 * 超长工具名截断，否则返回 undefined。
 */
function clippedToolName(name) {
  return typeof name === "string" && isOverlongToolName(name)
    ? truncateCodePoints(name, MAX_WIRE_TOOL_NAME_CHARS)
    : undefined;
}
//@ chunk-6mwt0myy.js:819-1022 placement = countToolCallsSince (1)
function countToolCallsSince(content) {
  if (!Array.isArray(content)) return content;
  let n;
  content.forEach((r, t) => {
    if (!isObjectNonNull(r) || r.type !== "tool_use") return;
    let s = clippedToolName(r.name);
    if (s === undefined) return;
    n ??= content.slice();
    n[t] = {
      ...r,
      name: s,
    };
  });
  return n === undefined ? content : n;
}
//@ chunk-6mwt0myy.js:1022-1073 placement
function isObjectNonNull(e) {
  return typeof e === "object" && e !== null;
}
//@ chunk-6mwt0myy.js:1073-1110 placement
/**
 * 记忆 id 格式。
 */
var MEMORY_ID_PATTERN = /^mem_[A-Za-z0-9_-]{1,120}$/;
//@ chunk-6mwt0myy.js:1110-1299 placement
function base58Encode(n_2) {
  let base = BigInt(58);
  let result = Array(22).fill("1");
  let i_2 = 21;
  let value = n_2;
  while (value > 0n) {
    let rem = Number(value % base);
    result[i_2] = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"[rem];
    value = value / base;
    i_2--;
  }
  return result.join("");
}
//@ chunk-6mwt0myy.js:1299-1431 fingerprint = uuidToBigInt (1)
function uuidToBigInt(uuid) {
  let hex = uuid.replaceAll("-", "");
  if (hex.length !== 32) throw Error(`Invalid UUID hex length: ${hex.length}`);
  return BigInt("0x" + hex);
}
export {
  MAX_WIRE_TOOL_NAME_BYTES,
  clippedToolName,
  MAX_WIRE_TOOL_NAME_CHARS,
  countToolCallsSince,
  uuidToBigInt,
  base58Encode,
  MEMORY_ID_PATTERN,
  isOverlongToolName,
};
