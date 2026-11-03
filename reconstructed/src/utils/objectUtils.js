/**
 * utils/objectUtils.ts
 *
 * 2.1.316 新增：对象小工具
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hwmn0xfn.js (3)
 * attribution: placement 3
 */

//@ chunk-hwmn0xfn.js:191-249 placement
function BQ(n) {
  return n.replace(/[-_]/g, "").toLowerCase();
}
//@ chunk-hwmn0xfn.js:249-303 placement
function Ibr(n) {
  return new Map(n.map((t) => [BQ(t), t]));
}
//@ chunk-hwmn0xfn.js:303-429 placement
function isPlainObject(n) {
  if (typeof n !== "object" || n === null) return !1;
  let prototypeOf = Object.getPrototypeOf(n);
  return prototypeOf === Object.prototype || prototypeOf === null;
}

export { isPlainObject, BQ, Ibr };
