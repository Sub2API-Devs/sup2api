/**
 * utils/frozenMarkers.ts
 *
 * 2.1.316 新增：是否为冻结标记对象。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-zz3hcf31.js (3)
 * attribution: placement 3
 */

//@ chunk-zz3hcf31.js:191-209 placement
var weakSet = new WeakSet();
//@ chunk-zz3hcf31.js:209-266 placement
/**
 * 创建一个冻结的空标记对象并登记，供"已冻结标记"判定使用。
 */
function createFrozenMarker() {
  let marker = Object.freeze({});
  weakSet.add(marker);
  return marker;
}
//@ chunk-zz3hcf31.js:266-328 placement
/**
 * 是否为冻结标记对象。
 */
function isFrozenMarker(value) {
  return typeof value === "object" && value !== null && weakSet.has(value);
}
export { isFrozenMarker, createFrozenMarker };
