/**
 * utils/keyboardShortcuts.ts
 *
 * macOS Option 键产生的特殊字符到 alt+键 的映射。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/keyboardShortcuts.ts
 * pieces: chunk-x1mwqya5.js (3)
 * attribution: fingerprint 1, placement 2
 */
import { getPlatform } from "./platform.js";
import { env } from "./env.js";

//@ chunk-x1mwqya5.js:17933-17974 fingerprint = MACOS_OPTION_SPECIAL_CHARS (0.79)
var MACOS_OPTION_SPECIAL_CHARS = { π: "alt+p", ø: "alt+o" };
//@ chunk-x1mwqya5.js:17974-18018 placement
function isMacOptionSpecialChar(n) {
  return Object.hasOwn(MACOS_OPTION_SPECIAL_CHARS, n);
}
/**
 * 显示快捷键时用的平台：iTerm2/Apple Terminal 下即使不是 macOS 主机（如 ssh）也按 macOS 显示。
 */
//@ chunk-x1mwqya5.js:18018-18182 placement
function getShortcutDisplayPlatform() {
  let n = getPlatform();
  if (n === "macos") return n;
  if (
    env.LC_TERMINAL === "iTerm2" ||
    env.TERM_PROGRAM === "Apple_Terminal" ||
    env.TERM_PROGRAM === "iTerm.app"
  )
    return "macos";
  return n;
}

export { isMacOptionSpecialChar, MACOS_OPTION_SPECIAL_CHARS, getShortcutDisplayPlatform };
