/**
 * utils/isPlainObject.ts
 *
 * 2.1.316 新增：是否为非数组对象。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-n3a8e1qg.js (1)
 * attribution: placement 1
 */

//@ chunk-n3a8e1qg.js:191-261 placement
/**
 * 是否为非数组对象。
 */
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export { isPlainObject };
