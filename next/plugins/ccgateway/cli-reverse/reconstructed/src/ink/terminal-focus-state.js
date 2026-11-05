/**
 * ink/terminal-focus-state.ts
 *
 * 并入终端焦点状态读取与订阅
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/terminal-focus-state.ts
 * pieces: chunk-mjq27gpa.js (4)
 * attribution: fingerprint 1, placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { uiSignals } from "../state/uiSignals.js";

//@ chunk-mjq27gpa.js:441-492 fingerprint (2.1.88 match: getTerminalFocused, 0.788)
/**
 * 终端当前是否有焦点（未收到 blurred 就视为有焦点）。
 */
function getTerminalFocused() {
  return uiSignals.terminalFocus !== "blurred";
}
//@ chunk-mjq27gpa.js:492-531 placement
function getTerminalFocus() {
  return uiSignals.terminalFocus;
}
//@ chunk-mjq27gpa.js:531-578 placement
function getTerminalFocusGainedAt() {
  return uiSignals.terminalFocusGainedAt;
}
//@ chunk-mjq27gpa.js:578-638 placement
function onTerminalFocusChanged(listener) {
  return uiSignals.terminalFocusChanged.subscribe(listener);
}
export { getTerminalFocus, getTerminalFocused, getTerminalFocusGainedAt, onTerminalFocusChanged };
