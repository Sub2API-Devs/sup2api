/**
 * utils/collections.ts
 *
 * 2.1.316 新增：数组浅相等；只保留字符串元素等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q3kq8hyf.js (8)
 * attribution: placement 8
 */

//@ chunk-q3kq8hyf.js:191-249 placement
/**
 * 在元素间插入分隔。
 */
function intersperse(items, separator) {
  return items.flatMap((item, index) => (index ? [separator(index), item] : [item]));
}
//@ chunk-q3kq8hyf.js:249-308 placement
/**
 * 统计满足条件的元素数。
 */
function count(items, predicate) {
  let count = 0;
  for (let item of items) count += +!!predicate(item);
  return count;
}
//@ chunk-q3kq8hyf.js:308-442 placement
function setsEqual(left, right) {
  if (left === right) return true;
  if (left === undefined || right === undefined || left.size !== right.size) return false;
  for (let value of left) if (!right.has(value)) return false;
  return true;
}
//@ chunk-q3kq8hyf.js:442-593 placement
/**
 * 数组浅相等。
 */
function arraysEqual(left, right) {
  if (left === right) return true;
  if (left === undefined || right === undefined || left.length !== right.length) return false;
  for (let i = 0; i < left.length; i++) if (left[i] !== right[i]) return false;
  return true;
}
//@ chunk-q3kq8hyf.js:593-629 placement
/**
 * 去重。
 */
function uniq(items) {
  return [...new Set(items)];
}
//@ chunk-q3kq8hyf.js:629-734 placement
/**
 * 按键去重。
 */
function uniqBy(items, keyOf) {
  let seen = new Set();
  let result = [];
  for (let item of items) {
    let key = keyOf(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}
//@ chunk-q3kq8hyf.js:734-857 placement
/**
 * 只保留字符串元素。
 */
function stringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.every((item) => typeof item === "string")
    ? value
    : value.filter((item) => typeof item === "string");
}
//@ chunk-q3kq8hyf.js:857-949 placement
/**
 * 返回两个字符串数组的公共前缀长度。
 */
function commonPrefixLength(left, right) {
  let min = Math.min(left.length, right.length);
  let index = 0;
  while (index < min && left[index] === right[index]) index++;
  return index;
}
export { count, uniq, arraysEqual, stringArray, commonPrefixLength, uniqBy, intersperse, setsEqual };
