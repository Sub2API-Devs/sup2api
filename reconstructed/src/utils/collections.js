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
function intersperse(e, n) {
  return e.flatMap((t, r) => (r ? [n(r), t] : [t]));
}
//@ chunk-q3kq8hyf.js:249-308 placement
/**
 * 统计满足条件的元素数。
 */
function count(e, n) {
  let t = 0;
  for (let r of e) t += +!!n(r);
  return t;
}
//@ chunk-q3kq8hyf.js:308-442 placement
function setsEqual(e, n) {
  if (e === n) return true;
  if (e === undefined || n === undefined || e.size !== n.size) return false;
  for (let t of e) if (!n.has(t)) return false;
  return true;
}
//@ chunk-q3kq8hyf.js:442-593 placement
/**
 * 数组浅相等。
 */
function arraysEqual(e, n) {
  if (e === n) return true;
  if (e === undefined || n === undefined || e.length !== n.length) return false;
  for (let i = 0; i < e.length; i++) if (e[i] !== n[i]) return false;
  return true;
}
//@ chunk-q3kq8hyf.js:593-629 placement
/**
 * 去重。
 */
function uniq(e) {
  return [...new Set(e)];
}
//@ chunk-q3kq8hyf.js:629-734 placement
/**
 * 按键去重。
 */
function uniqBy(e, n) {
  let t = new Set();
  let r = [];
  for (let o of e) {
    let i = n(o);
    if (!t.has(i)) {
      t.add(i);
      r.push(o);
    }
  }
  return r;
}
//@ chunk-q3kq8hyf.js:734-857 placement
/**
 * 只保留字符串元素。
 */
function stringArray(e) {
  if (!Array.isArray(e)) return [];
  return e.every((n) => typeof n === "string") ? e : e.filter((n) => typeof n === "string");
}
//@ chunk-q3kq8hyf.js:857-949 placement
/**
 * 返回两个字符串数组的公共前缀长度。
 */
function commonPrefixLength(e, n) {
  let min = Math.min(e.length, n.length);
  let r = 0;
  while (r < min && e[r] === n[r]) r++;
  return r;
}
export { count, uniq, arraysEqual, stringArray, commonPrefixLength, uniqBy, intersperse, setsEqual };
