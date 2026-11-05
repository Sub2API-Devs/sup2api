/**
 * ink/clearTerminal.ts
 *
 * 清屏序列的平台差异（Windows Terminal 用不同的清屏方式）与终端退格键行为判断
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/clearTerminal.ts
 * pieces: chunk-2avr6cej.js (1), chunk-xd1cb3xs.js (4)
 * attribution: fingerprint 2, placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { ERASE_SCREEN, ERASE_SCROLLBACK, CURSOR_HOME, ERASE_LINE, cursorDown } from "./termio/csi.js";
import { env } from "../utils/env.js";
import { isEnvTruthy, isEnvDefinedFalsy } from "../utils/envUtils.js";

//@ chunk-xd1cb3xs.js:2246-2278 placement
/**
 * 备用屏清屏：ED2 + 清回滚 + 光标回原点。
 */
function getClearTerminalSequence() {
  return ERASE_SCREEN + ERASE_SCROLLBACK + CURSOR_HOME;
}
//@ chunk-xd1cb3xs.js:2278-2306 placement
function getEraseScreenSequence() {
  return ERASE_SCREEN + CURSOR_HOME;
}
//@ chunk-xd1cb3xs.js:2306-2358 placement
/**
 * 主屏清屏（不清回滚区）：光标回原点后逐行擦除并下移 rows 行，再回原点。
 */
function eraseViewportInPlace(rows) {
  return CURSOR_HOME + (ERASE_LINE + cursorDown(1)).repeat(rows) + CURSOR_HOME;
}
//@ chunk-xd1cb3xs.js:3804-3840 fingerprint (2.1.88 match: isWindowsTerminal, 0.487)
/**
 * 是否在 Windows Terminal 中（WT_SESSION）。
 */
function isWindowsTerminal() {
  return !!env.WT_SESSION;
}
//@ chunk-2avr6cej.js:133891-134050 fingerprint (2.1.88 match: isMintty, 0.586)
/**
 * 是否把 \b（0x08）当成 Ctrl+Backspace：CLAUDE_CODE_BS_AS_CTRL_BACKSPACE 显式真/假优先；否则只在 win32 且 TERM_PROGRAM 不是 mintty、TERM 不是 cygwin 时为真。
 */
function isBackspaceCtrlBackspace(platform, env) {
  let CLAUDE_CODE_BS_AS_CTRL_BACKSPACE = env.CLAUDE_CODE_BS_AS_CTRL_BACKSPACE;
  if (isEnvTruthy(CLAUDE_CODE_BS_AS_CTRL_BACKSPACE)) return true;
  if (isEnvDefinedFalsy(CLAUDE_CODE_BS_AS_CTRL_BACKSPACE)) return false;
  return platform === "win32" && env.TERM_PROGRAM !== "mintty" && env.TERM !== "cygwin";
}
export {
  isBackspaceCtrlBackspace,
  eraseViewportInPlace,
  getClearTerminalSequence,
  getEraseScreenSequence,
  isWindowsTerminal,
};
