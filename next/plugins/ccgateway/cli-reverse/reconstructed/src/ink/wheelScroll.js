/**
 * ink/wheelScroll.ts
 *
 * 2.1.316 新增。鼠标滚轮滚动处理。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xd1cb3xs.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { hasCursorUpViewportYankBug } from "./terminal.js";

//@ chunk-xd1cb3xs.js:5424-5550 placement
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
//@ chunk-xd1cb3xs.js:5550-5626 placement
function confirmJediTermScrollBug(state) {
  state.bugConfirmed = true;
  state.trackpadGesture = true;
  state.pendingArrowBoost++;
}
//@ chunk-xd1cb3xs.js:5626-5683 placement
function resetJediTermGesture(state) {
  state.trackpadGesture = false;
  state.pendingArrowBoost = 0;
}
//@ chunk-xd1cb3xs.js:5683-5756 placement
function takeArrowBoost(jediTerm) {
  let pendingArrowBoost = jediTerm.pendingArrowBoost;
  jediTerm.pendingArrowBoost = 0;
  return pendingArrowBoost;
}
//@ chunk-xd1cb3xs.js:5756-5957 placement
function isJediTermScrollBugConfirmed(state) {
  if (state.bugConfirmed) return true;
  if (
    process.env.INTELLIJ_TERMINAL_COMMAND_BLOCKS_REWORKED !== undefined ||
    process.env.INTELLIJ_TERMINAL_COMMAND_BLOCKS !== undefined
  ) {
    state.bugConfirmed = true;
    return true;
  }
  return false;
}
//@ chunk-xd1cb3xs.js:5957-5982 placement
var ARROW_AFTER_WHEEL_MS = 75;
var WHEEL_FLIP_MS = 250;
var WHEEL_GESTURE_GAP_MS = 200;
//@ chunk-xd1cb3xs.js:5982-6596 placement
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
    let item = items[k];
    if (item.kind !== "key") {
      rewritten?.push(item);
      continue;
    }
    if (item.name === "wheelup" || item.name === "wheeldown") {
      if (now - state.lastWheelTime > WHEEL_GESTURE_GAP_MS) {
        state.lastWheelDownTime = 0;
        resetJediTermGesture(state);
      }
      state.lastWheelTime = now;
      if (item.name === "wheeldown") state.lastWheelDownTime = now;
      if (
        item.name === "wheelup" &&
        now - state.lastWheelDownTime < WHEEL_FLIP_MS &&
        isJediTermScrollBugConfirmed(state)
      ) {
        rewritten ??= items.slice(0, k);
        rewritten.push({
          ...item,
          name: "wheeldown",
        });
        continue;
      }
      rewritten?.push(item);
      continue;
    }
    if (
      (item.name === "up" || item.name === "down") &&
      !item.ctrl &&
      !item.meta &&
      !item.shift &&
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
    rewritten?.push(item);
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
