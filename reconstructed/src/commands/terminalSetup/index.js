/**
 * commands/terminalSetup/index.ts
 *
 * 2.1.316 新增：终端设置命令（键位与终端集成）的命令对象
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/terminalSetup/index.ts
 * pieces: chunk-e6aww6q8.js (5)
 * attribution: placement 5
 */
import { env } from "../../utils/env.js";

//@ chunk-e6aww6q8.js:1762601-1762652 placement = default (1)
var stubTerminalSetupCommand = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-e6aww6q8.js:1762652-1763391 placement
/**
 * NATIVE_SHIFT_ENTER_TERMINALS：ghostty/kitty/Warp/WezTerm/Windows Terminal。
 */
var NATIVE_SHIFT_ENTER_TERMINALS = {
  ghostty: "Ghostty",
  kitty: "Kitty",
  WarpTerminal: "Warp",
  WezTerm: "WezTerm",
  "windows-terminal": "Windows Terminal",
};
var terminalSetupCommandDefinition = {
  type: "local-jsx",
  name: "terminal-setup",
  get description() {
    if (env.terminal === "Apple_Terminal")
      return "Enable Option+Enter key binding for newlines and disable the audible bell (skipped in screen-reader mode)";
    if (env.terminal !== null && Object.hasOwn(NATIVE_SHIFT_ENTER_TERMINALS, env.terminal))
      return `Check terminal setup (Shift+Enter is natively supported in ${NATIVE_SHIFT_ENTER_TERMINALS[env.terminal]})`;
    if (
      env.__CFBundleIdentifier === "com.googlecode.iterm2" &&
      (env.terminal === "iTerm.app" ||
        env.terminal === "tmux" ||
        env.terminal === "screen" ||
        env.terminal === null)
    )
      return "Enable iTerm2 clipboard access for /copy";
    return "Install Shift+Enter key binding for newlines";
  },
  requires: {
    ink: true,
  },
};
var terminalSetupCommand = terminalSetupCommandDefinition;
//@ chunk-e6aww6q8.js:1763428-1763678 placement
function waitForStoreValue(e, n, r) {
  if (e.getSnapshot() === n || r?.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    let h = () => {
      y();
      r?.removeEventListener("abort", h);
      resolve();
    };
    let y = e.subscribe(() => {
      if (e.getSnapshot() === n) h();
    });
    r?.addEventListener("abort", h, {
      once: true,
    });
  });
}
//@ chunk-e6aww6q8.js:1763678-1763715 placement
/**
 * 等待 store 值变为 false。
 */
function waitForFalse(e, signal) {
  return waitForStoreValue(e, false, signal);
}
//@ chunk-e6aww6q8.js:1763715-1763752 placement
/**
 * 等待 store 值变为 true。
 */
function waitForTrue(turnActivity, signal) {
  return waitForStoreValue(turnActivity, true, signal);
}
export { waitForFalse, waitForTrue, stubTerminalSetupCommand, terminalSetupCommand };
