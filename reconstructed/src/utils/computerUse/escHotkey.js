/**
 * utils/computerUse/escHotkey.ts
 *
 * computer-use 的 ESC 中断热键：注销、预告程序自发的 ESC（registerEscHotkey 匹配存疑）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/computerUse/escHotkey.ts
 * pieces: chunk-ha3km179.js (2)
 * attribution: fingerprint 2
 */
import { getComputerUseSession } from "./session.js";
import { requireComputerUseSwift } from "./swiftLoader.js";
import { releasePump } from "./drainRunLoop.js";
import { logForDebugging } from "../debug.js";

/**
 * 注销 computer-use 的 ESC 热键并释放 run loop 泵（仅在已注册时）。
 */
//@ chunk-ha3km179.js:51947-52096 fingerprint = unregisterEscHotkey (0.881)
function unregisterEscHotkey() {
  if (!getComputerUseSession().escHotkeyRegistered) return;
  try {
    requireComputerUseSwift().hotkey.unregister();
  } finally {
    (releasePump(),
      (getComputerUseSession().escHotkeyRegistered = !1),
      logForDebugging("[cu-esc] unregistered"));
  }
}
/**
 * 告诉 Swift 热键模块下一次 ESC 是程序自己发的，不当作用户中断。
 */
//@ chunk-ha3km179.js:52096-52183 fingerprint = notifyExpectedEscape (0.794)
function notifyExpectedEscape() {
  if (!getComputerUseSession().escHotkeyRegistered) return;
  requireComputerUseSwift().hotkey.notifyExpectedEscape();
}

export { unregisterEscHotkey };
