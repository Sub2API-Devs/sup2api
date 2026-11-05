/**
 * utils/settings/writeQueues.ts
 *
 * 2.1.316 新增：去除控制字符（保留制表与换行）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1bsktt7r.js (1), chunk-z20c443b.js (4)
 * attribution: placement 5
 */
import { stripVTControlCharacters } from "util";
import { toWellFormedString } from "../stringUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-z20c443b.js:514010-514147 placement
class WriteQueueDrains {
  drains = new Set();
  register(drain) {
    this.drains.add(drain);
  }
  async drainAll() {
    await Promise.all([...this.drains].map((drain) => drain().catch(() => {})));
  }
}
//@ chunk-z20c443b.js:514147-514161 placement
var writeQueueDrains; // deferred: uses WriteQueueDrains of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z20c443b.js:514147", () => {
  writeQueueDrains = new WriteQueueDrains();
});
//@ chunk-z20c443b.js:514161-514192 placement
function registerWriteQueueDrain(drain) {
  writeQueueDrains.register(drain);
}
//@ chunk-z20c443b.js:514192-514227 placement
function drainRegisteredWriteQueues() {
  return writeQueueDrains.drainAll();
}
//@ chunk-1bsktt7r.js:275-359 placement
/**
 * 去除控制字符（保留制表与换行）。
 */
function stripControlChars(text) {
  return stripVTControlCharacters(toWellFormedString(text)).replace(
    /(?![\t\n])[\p{Cc}\p{Cf}\u2028\u2029]/gu,
    "",
  );
}
export { stripControlChars, drainRegisteredWriteQueues, registerWriteQueueDrain };
