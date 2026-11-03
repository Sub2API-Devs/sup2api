/**
 * utils/frozenMarkers.ts
 *
 * 2.1.316 新增：是否为冻结标记对象。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-75swpmx0.js (3)
 * attribution: placement 3
 */

//@ chunk-75swpmx0.js:191-209 placement
var weakSet = new WeakSet();
//@ chunk-75swpmx0.js:209-266 placement
function GCo() {
  let freeze = Object.freeze({});
  return (weakSet.add(freeze), freeze);
}
/**
 * 是否为冻结标记对象。
 */
//@ chunk-75swpmx0.js:266-328 placement
function isFrozenMarker(e) {
  return typeof e === "object" && e !== null && weakSet.has(e);
}

export { GCo, isFrozenMarker };
