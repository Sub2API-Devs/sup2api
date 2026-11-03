/**
 * ink/wheelScroll.ts
 *
 * 2.1.316 新增。鼠标滚轮滚动处理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-24t3dkzb.js (7)
 * attribution: placement 7
 */
import { hasCursorUpViewportYankBug } from "./terminal.js";

//@ chunk-24t3dkzb.js:5424-5550 placement
function createJediTermInputState() {
  return {
    lastWheelTime: 0,
    lastWheelDownTime: 0,
    bugConfirmed: false,
    notified: false,
    trackpadGesture: false,
    pendingArrowBoost: 0,
  };
}
//@ chunk-24t3dkzb.js:5550-5626 placement
function confirmJediTermScrollBug(state) {
  state.bugConfirmed = true;
  state.trackpadGesture = true;
  state.pendingArrowBoost++;
}
//@ chunk-24t3dkzb.js:5626-5683 placement
function resetJediTermGesture(state) {
  state.trackpadGesture = false;
  state.pendingArrowBoost = 0;
}
//@ chunk-24t3dkzb.js:5683-5756 placement
function takeArrowBoost(jediTerm) {
  let pendingArrowBoost = jediTerm.pendingArrowBoost;
  jediTerm.pendingArrowBoost = 0;
  return pendingArrowBoost;
}
//@ chunk-24t3dkzb.js:5756-5957 placement
function isJediTermScrollBugConfirmed(r) {
  if (r.bugConfirmed) return true;
  if (
    process.env.INTELLIJ_TERMINAL_COMMAND_BLOCKS_REWORKED !== undefined ||
    process.env.INTELLIJ_TERMINAL_COMMAND_BLOCKS !== undefined
  ) {
    r.bugConfirmed = true;
    return true;
  }
  return false;
}
//@ chunk-24t3dkzb.js:5957-5982 placement
var ARROW_AFTER_WHEEL_MS = 75;
var WHEEL_FLIP_MS = 250;
var WHEEL_GESTURE_GAP_MS = 200;
//@ chunk-24t3dkzb.js:5982-6596 placement
/**
 * 修正 JetBrains 终端的滚轮问题（设置 jediTerm 打开时）：滚轮后 75ms 内出现的无修饰上下方向键视为触控板滚动的副产物丢弃并计数；向下滚动后 250ms 内的 wheelup 在确认是该终端时翻转成 wheeldown；首次发现时回调通知。
 */
function fixJediTermWheelInput(state, items, now, onBugDetected) {
  if (!hasCursorUpViewportYankBug().jediTerm) {
    resetJediTermGesture(state);
    return items;
  }
  let rewritten = null;
  for (let k = 0; k < items.length; k++) {
    let a = items[k];
    if (a.kind !== "key") {
      rewritten?.push(a);
      continue;
    }
    if (a.name === "wheelup" || a.name === "wheeldown") {
      if (now - state.lastWheelTime > WHEEL_GESTURE_GAP_MS) {
        state.lastWheelDownTime = 0;
        resetJediTermGesture(state);
      }
      state.lastWheelTime = now;
      if (a.name === "wheeldown") state.lastWheelDownTime = now;
      if (
        a.name === "wheelup" &&
        now - state.lastWheelDownTime < WHEEL_FLIP_MS &&
        isJediTermScrollBugConfirmed(state)
      ) {
        rewritten ??= items.slice(0, k);
        rewritten.push({
          ...a,
          name: "wheeldown",
        });
        continue;
      }
      rewritten?.push(a);
      continue;
    }
    if (
      (a.name === "up" || a.name === "down") &&
      !a.ctrl &&
      !a.meta &&
      !a.shift &&
      now - state.lastWheelTime < ARROW_AFTER_WHEEL_MS
    ) {
      if (!state.notified) {
        state.notified = true;
        onBugDetected();
      }
      confirmJediTermScrollBug(state);
      rewritten ??= items.slice(0, k);
      continue;
    }
    rewritten?.push(a);
  }
  return rewritten ?? items;
}
export {
  WHEEL_GESTURE_GAP_MS,
  takeArrowBoost,
  createJediTermInputState,
  isJediTermScrollBugConfirmed,
  fixJediTermWheelInput,
};
