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
/**
 * 按会话根保存的按键当前值。
 */
var currentValueByKeySlot = new SessionRootSlot(() => ({
  current: undefined,
}));
//@ chunk-16t5vfjc.js:264-306 placement
/**
 * 读取某按键存储的当前值。
 */
function getCurrentForKey(session) {
  return currentValueByKeySlot.peek(session)?.current;
}
//@ chunk-16t5vfjc.js:306-341 placement
/**
 * 设置按键存储的当前值。
 */
function setCurrentForKey(session, o) {
  currentValueByKeySlot.of(session).current = o;
}
export { setCurrentForKey, getCurrentForKey };
