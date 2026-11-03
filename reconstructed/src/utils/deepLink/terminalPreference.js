/**
 * utils/deepLink/terminalPreference.ts
 *
 * 并入已有模块：深链终端偏好
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/deepLink/terminalPreference.ts
 * pieces: chunk-7fw14qgv.js (3)
 * attribution: placement 2, fingerprint 1
 */
import { j } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-7fw14qgv.js:1951-1955 placement
j();
/**
 * TERM_PROGRAM → 深链接终端应用名映射（iTerm、Ghostty、kitty、Alacritty、WezTerm、Terminal）。
 */
//@ chunk-7fw14qgv.js:2032-2173 fingerprint = TERM_PROGRAM_TO_APP (1)
var TERM_PROGRAM_TO_APP = {
  iterm: "iTerm",
  "iterm.app": "iTerm",
  ghostty: "Ghostty",
  kitty: "kitty",
  alacritty: "Alacritty",
  wezterm: "WezTerm",
  apple_terminal: "Terminal",
};
//@ chunk-7fw14qgv.js:2173-2195 placement
function updateDeepLinkTerminalPreference(o) {
  return;
}

export { updateDeepLinkTerminalPreference };
