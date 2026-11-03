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

/**
 * 在元素间插入分隔。
 */
//@ chunk-q3kq8hyf.js:191-249 placement
function intersperse(e, n) {
  return e.flatMap((t, r) => (r ? [n(r), t] : [t]));
}
/**
 * 统计满足条件的元素数。
 */
//@ chunk-q3kq8hyf.js:249-308 placement
function count(e, n) {
  let t = 0;
  for (let r of e) t += +!!n(r);
  return t;
}
//@ chunk-q3kq8hyf.js:308-442 placement
function setsEqual(e, n) {
  if (e === n) return !0;
  if (e === void 0 || n === void 0 || e.size !== n.size) return !1;
  for (let t of e) if (!n.has(t)) return !1;
  return !0;
}
/**
 * 数组浅相等。
 */
//@ chunk-q3kq8hyf.js:442-593 placement
function arraysEqual(e, n) {
  if (e === n) return !0;
  if (e === void 0 || n === void 0 || e.length !== n.length) return !1;
  for (let t = 0; t < e.length; t++) if (e[t] !== n[t]) return !1;
  return !0;
}
/**
 * 去重。
 */
//@ chunk-q3kq8hyf.js:593-629 placement
function uniq(e) {
  return [...new Set(e)];
}
/**
 * 按键去重。
 */
//@ chunk-q3kq8hyf.js:629-734 placement
function uniqBy(e, n) {
  let t = new Set(),
    r = [];
  for (let o of e) {
    let i = n(o);
    if (!t.has(i)) (t.add(i), r.push(o));
  }
  return r;
}
/**
 * 只保留字符串元素。
 */
//@ chunk-q3kq8hyf.js:734-857 placement
function stringArray(e) {
  if (!Array.isArray(e)) return [];
  return e.every((n) => typeof n === "string") ? e : e.filter((n) => typeof n === "string");
}
//@ chunk-q3kq8hyf.js:857-949 placement
function vks(e, n) {
  let min = Math.min(e.length, n.length),
    r = 0;
  while (r < min && e[r] === n[r]) r++;
  return r;
}

export { count, uniq, arraysEqual, stringArray, vks, uniqBy, intersperse, setsEqual };
