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
function sortedKeysReplacer(key, value) {
  if (isPlainObject(value)) {
    let sorted = Object.create(null);
    for (let key of Object.keys(value).toSorted())
      Object.defineProperty(sorted, key, {
        value: value[key],
        enumerable: true,
      });
    return sorted;
  }
  return value;
}
//@ chunk-fpg8jjts.js:388-416 placement
var UNSERIALIZABLE_PREFIX = "\x00unserializable:";
//@ chunk-fpg8jjts.js:416-460 placement
function makeUnserializableId() {
  let counter = 0;
  return () => `${UNSERIALIZABLE_PREFIX}${++counter}`;
}
//@ chunk-fpg8jjts.js:460-470 placement
var nextUnserializableId = makeUnserializableId();
//@ chunk-fpg8jjts.js:470-534 placement
/**
 * 稳定序列化的安全包装：无法序列化时返回唯一占位串。
 */
function stableStringifySafe(value) {
  try {
    return JSON.stringify(value, sortedKeysReplacer);
  } catch {
    return nextUnserializableId();
  }
}
export { stableStringifySafe };
