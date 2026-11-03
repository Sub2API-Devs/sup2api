/**
 * utils/currentRefByKey.ts
 *
 * 2.1.316 新增：设置按键存储的当前值。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-16t5vfjc.js (3)
 * attribution: placement 3
 */
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";

//@ chunk-16t5vfjc.js:227-264 placement
var n = new SessionRootSlot(() => ({ current: void 0 }));
//@ chunk-16t5vfjc.js:264-306 placement
function bUt(e) {
  return n.peek(e)?.current;
}
/**
 * 设置按键存储的当前值。
 */
//@ chunk-16t5vfjc.js:306-341 placement
function setCurrentForKey(e, o) {
  n.of(e).current = o;
}

export { setCurrentForKey, bUt };
