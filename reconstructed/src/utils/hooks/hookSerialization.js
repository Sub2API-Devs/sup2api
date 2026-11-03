/**
 * utils/hooks/hookSerialization.ts
 *
 * 2.1.316 新增：钩子序列化
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fpg8jjts.js (5)
 * attribution: placement 5
 */
import { isPlainObject } from "../isPlainObject.js";

//@ chunk-fpg8jjts.js:226-388 placement
function sortedKeysReplacer(r, e) {
  if (isPlainObject(e)) {
    let create = Object.create(null);
    for (let t of Object.keys(e).toSorted())
      Object.defineProperty(create, t, { value: e[t], enumerable: !0 });
    return create;
  }
  return e;
}
//@ chunk-fpg8jjts.js:388-416 placement
var f = "\x00unserializable:";
//@ chunk-fpg8jjts.js:416-460 placement
function s() {
  let r = 0;
  return () => `${f}${++r}`;
}
//@ chunk-fpg8jjts.js:460-470 placement
var u = s();
//@ chunk-fpg8jjts.js:470-534 placement
function Rs(r) {
  try {
    return JSON.stringify(r, sortedKeysReplacer);
  } catch {
    return u();
  }
}

export { Rs };
