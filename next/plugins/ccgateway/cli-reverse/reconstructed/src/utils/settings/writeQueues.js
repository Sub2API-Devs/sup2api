/**
 * utils/settings/writeQueues.ts
 *
 * 2.1.316 新增：去除控制字符（保留制表与换行）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (5)
 * attribution: placement 5
 */
import { stripVTControlCharacters } from "util";
import { toWellFormedString } from "../stringUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-dcmhvw5a.js:514548-514685 placement
class WriteQueueDrains {
  drains = new Set();
  register(drain) {
    this.drains.add(drain);
  }
  async drainAll() {
    await Promise.all([...this.drains].map((drain) => drain().catch(() => {})));
  }
}
//@ chunk-dcmhvw5a.js:514685-514699 placement
var writeQueueDrains; // deferred: uses WriteQueueDrains of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-dcmhvw5a.js:514685", () => {
  writeQueueDrains = new WriteQueueDrains();
});
//@ chunk-dcmhvw5a.js:514699-514730 placement
function registerWriteQueueDrain(drain) {
  writeQueueDrains.register(drain);
}
//@ chunk-dcmhvw5a.js:514730-514765 placement
function drainRegisteredWriteQueues() {
  return writeQueueDrains.drainAll();
}
//@ chunk-dcmhvw5a.js:514814-514899 placement
/**
 * 去除控制字符（保留制表与换行）。
 */
function stripControlChars(text) {
  return stripVTControlCharacters(toWellFormedString(text)).replace(
    /(?![\t\n])[\p{Cc}\p{Cf}\u2028\u2029]/gu,
    "",
  );
}
export { registerWriteQueueDrain, drainRegisteredWriteQueues, stripControlChars };
