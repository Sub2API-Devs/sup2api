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
/**
 * 归一化查找键（去连字符/下划线并转小写）。
 */
function normalizeKey(n) {
  return n.replace(/[-_]/g, "").toLowerCase();
}
//@ chunk-hwmn0xfn.js:249-303 placement
/**
 * 生成"归一化键 → 原名"的索引 Map。
 */
function normalizeKeyIndex(n) {
  return new Map(n.map((t) => [normalizeKey(t), t]));
}
//@ chunk-hwmn0xfn.js:303-429 placement
function isPlainObject(n) {
  if (typeof n !== "object" || n === null) return false;
  let prototypeOf = Object.getPrototypeOf(n);
  return prototypeOf === Object.prototype || prototypeOf === null;
}
export { isPlainObject, normalizeKey, normalizeKeyIndex };
