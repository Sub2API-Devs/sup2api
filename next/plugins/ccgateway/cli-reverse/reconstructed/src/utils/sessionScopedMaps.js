/**
 * utils/sessionScopedMaps.ts
 *
 * 2.1.316 新增：会话作用域映射
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-98dmqnmq.js (1)
 * attribution: placement 1
 */
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-98dmqnmq.js:227-255 placement
/**
 * sessionScopedMapsSlot：按会话根保存的映射表。
 */
var sessionScopedMapsSlot; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-98dmqnmq.js:227", () => {
  sessionScopedMapsSlot = new SessionRootSlot(() => new Map());
});
export { sessionScopedMapsSlot };
