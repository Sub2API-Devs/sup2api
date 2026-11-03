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
    let o = Object.create(null);
    for (let key of Object.keys(e).toSorted())
      Object.defineProperty(o, key, {
        value: e[key],
        enumerable: true,
      });
    return o;
  }
  return e;
}
//@ chunk-fpg8jjts.js:388-416 placement
var UNSERIALIZABLE_PREFIX = "\x00unserializable:";
//@ chunk-fpg8jjts.js:416-460 placement
function makeUnserializableId() {
  let r = 0;
  return () => `${UNSERIALIZABLE_PREFIX}${++r}`;
}
//@ chunk-fpg8jjts.js:460-470 placement
var nextUnserializableId = makeUnserializableId();
//@ chunk-fpg8jjts.js:470-534 placement
/**
 * 稳定序列化的安全包装：无法序列化时返回唯一占位串。
 */
function stableStringifySafe(r) {
  try {
    return JSON.stringify(r, sortedKeysReplacer);
  } catch {
    return nextUnserializableId();
  }
}
export { stableStringifySafe };
