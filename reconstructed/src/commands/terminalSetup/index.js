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
var Uen = { isEnabled: () => !1, isHidden: !0, name: "stub" };
/**
 * NATIVE_SHIFT_ENTER_TERMINALS：ghostty/kitty/Warp/WezTerm/Windows Terminal。
 */
//@ chunk-e6aww6q8.js:1762652-1763391 placement
var NATIVE_SHIFT_ENTER_TERMINALS = {
    ghostty: "Ghostty",
    kitty: "Kitty",
    WarpTerminal: "Warp",
    WezTerm: "WezTerm",
    "windows-terminal": "Windows Terminal",
  },
  terminalSetupCommandDefinition = {
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
    requires: { ink: !0 },
  },
  terminalSetupCommand = terminalSetupCommandDefinition;
//@ chunk-e6aww6q8.js:1763428-1763678 placement
function waitForStoreValue(e, n, r) {
  if (e.getSnapshot() === n || r?.aborted) return Promise.resolve();
  return new Promise((s) => {
    let h = () => {
        (subscribe(), r?.removeEventListener("abort", h), s());
      },
      subscribe = e.subscribe(() => {
        if (e.getSnapshot() === n) h();
      });
    r?.addEventListener("abort", h, { once: !0 });
  });
}
//@ chunk-e6aww6q8.js:1763678-1763715 placement
function lmn(e, n) {
  return waitForStoreValue(e, !1, n);
}
//@ chunk-e6aww6q8.js:1763715-1763752 placement
function o3s(e, n) {
  return waitForStoreValue(e, !0, n);
}

export { lmn, o3s, Uen, terminalSetupCommand };
