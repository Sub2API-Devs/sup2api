/**
 * utils/untrustedArray.ts
 *
 * 2.1.316 新增：安全读取不可信数组（异常访问、长度上限）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vmqnw714.js (3)
 * attribution: placement 3
 */
import { CLONE_DEPTH_THRESHOLD } from "./structuredCloneLimits.js";

//@ chunk-vmqnw714.js:227-293 placement
/**
 * 不可读数组的标记符号。
 */
var UNREADABLE_ARRAY = Symbol("untrustedArray.unreadable");
var UNREADABLE_LIST_TEXT = "<unreadable list>";
//@ chunk-vmqnw714.js:293-524 placement
/**
 * 安全复制不可信数组：读取失败的元素为 undefined；长度不可读或超出上限时返回 unreadable 标记，非数组为 undefined。
 */
function readUntrustedArray(array) {
  let length;
  try {
    if (!Array.isArray(array)) return;
    length = array.length;
  } catch {
    return UNREADABLE_ARRAY;
  }
  if (
    typeof length !== "number" ||
    !Number.isSafeInteger(length) ||
    length < 0 ||
    length > CLONE_DEPTH_THRESHOLD
  )
    return UNREADABLE_ARRAY;
  let copy = [];
  for (let i = 0; i < length; i++) {
    let element;
    try {
      element = array[i];
    } catch {
      element = undefined;
    }
    copy.push(element);
  }
  return copy;
}
//@ chunk-vmqnw714.js:524-575 placement
/**
 * 安全读取不可信数组，不可读返回 undefined。
 */
function readUntrustedArrayOrUndefined(array) {
  let untrustedArray = readUntrustedArray(array);
  return untrustedArray === UNREADABLE_ARRAY ? undefined : untrustedArray;
}
export { UNREADABLE_ARRAY, UNREADABLE_LIST_TEXT, readUntrustedArray, readUntrustedArrayOrUndefined };
