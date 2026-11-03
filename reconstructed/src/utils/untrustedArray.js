/**
 * utils/untrustedArray.ts
 *
 * 2.1.316 新增：安全读取不可信数组（异常访问、长度上限）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kev4jdty.js (3)
 * attribution: placement 3
 */
import { CLONE_DEPTH_THRESHOLD } from "./structuredCloneLimits.js";

//@ chunk-kev4jdty.js:227-293 placement
/**
 * 不可读数组的标记符号。
 */
var UNREADABLE_ARRAY = Symbol("untrustedArray.unreadable");
var UNREADABLE_LIST_TEXT = "<unreadable list>";
//@ chunk-kev4jdty.js:293-524 placement
/**
 * 安全复制不可信数组：读取失败的元素为 undefined；长度不可读或超出上限时返回 unreadable 标记，非数组为 undefined。
 */
function readUntrustedArray(e) {
  let n;
  try {
    if (!Array.isArray(e)) return;
    n = e.length;
  } catch {
    return UNREADABLE_ARRAY;
  }
  if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 0 || n > CLONE_DEPTH_THRESHOLD)
    return UNREADABLE_ARRAY;
  let u = [];
  for (let i = 0; i < n; i++) {
    let t;
    try {
      t = e[i];
    } catch {
      t = undefined;
    }
    u.push(t);
  }
  return u;
}
//@ chunk-kev4jdty.js:524-575 placement
/**
 * 安全读取不可信数组，不可读返回 undefined。
 */
function readUntrustedArrayOrUndefined(e) {
  let untrustedArray = readUntrustedArray(e);
  return untrustedArray === UNREADABLE_ARRAY ? undefined : untrustedArray;
}
export { UNREADABLE_ARRAY, UNREADABLE_LIST_TEXT, readUntrustedArray, readUntrustedArrayOrUndefined };
