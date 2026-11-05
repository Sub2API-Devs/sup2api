/**
 * utils/codeMode/typedEvents.ts
 *
 * REPL 事件是否走 typed 形态的开关与占位（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-esww588s.js (2)
 * attribution: placement 2
 */

//@ chunk-esww588s.js:191-215 placement
/**
 * REPL 事件是否走 typed 形态（本版本恒 false）。
 */
function isReplTypedEventsOn() {
  return false;
}
//@ chunk-esww588s.js:215-232 placement
/**
 * typed 形态的占位处理。
 */
function pinReplTypedEvents(value) {}
export { isReplTypedEventsOn, pinReplTypedEvents };
