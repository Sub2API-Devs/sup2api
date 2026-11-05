/**
 * utils/deepLink/terminalPreference.ts
 *
 * 并入已有模块：深链终端偏好
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/deepLink/terminalPreference.ts
 * pieces: chunk-yq5f910z.js (3)
 * attribution: placement 2, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-yq5f910z.js:1988-1992 placement
init_react_production();
//@ chunk-yq5f910z.js:2069-2210 fingerprint (2.1.88 match: TERM_PROGRAM_TO_APP, 1)
/**
 * TERM_PROGRAM → 深链接终端应用名映射（iTerm、Ghostty、kitty、Alacritty、WezTerm、Terminal）。
 */
var TERM_PROGRAM_TO_APP = {
  iterm: "iTerm",
  "iterm.app": "iTerm",
  ghostty: "Ghostty",
  kitty: "kitty",
  alacritty: "Alacritty",
  wezterm: "WezTerm",
  apple_terminal: "Terminal",
};
//@ chunk-yq5f910z.js:2210-2232 placement
function updateDeepLinkTerminalPreference(storageV5) {
  return;
}
export { updateDeepLinkTerminalPreference };
