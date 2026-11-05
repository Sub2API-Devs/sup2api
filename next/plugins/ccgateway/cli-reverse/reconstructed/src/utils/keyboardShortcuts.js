/**
 * utils/keyboardShortcuts.ts
 *
 * macOS Option 键产生的特殊字符到 alt+键 的映射。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/keyboardShortcuts.ts
 * pieces: chunk-m2f3rb0f.js (3)
 * attribution: fingerprint 1, placement 2
 */
import { getPlatform } from "./platform.js";
import { env } from "./env.js";

//@ chunk-m2f3rb0f.js:17931-17972 fingerprint (2.1.88 match: MACOS_OPTION_SPECIAL_CHARS, 0.791)
var MACOS_OPTION_SPECIAL_CHARS = {
  π: "alt+p",
  ø: "alt+o",
};
//@ chunk-m2f3rb0f.js:17972-18016 placement
function isMacOptionSpecialChar(key) {
  return Object.hasOwn(MACOS_OPTION_SPECIAL_CHARS, key);
}
//@ chunk-m2f3rb0f.js:18016-18180 placement
/**
 * 显示快捷键时用的平台：iTerm2/Apple Terminal 下即使不是 macOS 主机（如 ssh）也按 macOS 显示。
 */
function getShortcutDisplayPlatform() {
  let platform = getPlatform();
  if (platform === "macos") return platform;
  if (
    env.LC_TERMINAL === "iTerm2" ||
    env.TERM_PROGRAM === "Apple_Terminal" ||
    env.TERM_PROGRAM === "iTerm.app"
  )
    return "macos";
  return platform;
}
export { getShortcutDisplayPlatform, isMacOptionSpecialChar, MACOS_OPTION_SPECIAL_CHARS };
