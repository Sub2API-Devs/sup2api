/**
 * ink/terminal-focus-state.ts
 *
 * 并入终端焦点状态读取与订阅
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/terminal-focus-state.ts
 * pieces: chunk-fpjsca9n.js (4)
 * attribution: fingerprint 1, placement 3
 */
import { uiSignals } from "../state/uiSignals.js";

/**
 * 终端当前是否有焦点（未收到 blurred 就视为有焦点）。
 */
//@ chunk-fpjsca9n.js:441-492 fingerprint = getTerminalFocused (0.788)
function getTerminalFocused() {
  return uiSignals.terminalFocus !== "blurred";
}
//@ chunk-fpjsca9n.js:492-531 placement
function getTerminalFocus() {
  return uiSignals.terminalFocus;
}
//@ chunk-fpjsca9n.js:531-578 placement
function getTerminalFocusGainedAt() {
  return uiSignals.terminalFocusGainedAt;
}
//@ chunk-fpjsca9n.js:578-638 placement
function onTerminalFocusChanged(e) {
  return uiSignals.terminalFocusChanged.subscribe(e);
}

export { getTerminalFocus, onTerminalFocusChanged, getTerminalFocused, getTerminalFocusGainedAt };
