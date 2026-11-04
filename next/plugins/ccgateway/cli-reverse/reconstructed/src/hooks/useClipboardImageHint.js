/**
 * hooks/useClipboardImageHint.ts
 *
 * 剪贴板有图片时的上下文提示（"Image in clipboard · ctrl+v to paste"）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useClipboardImageHint.ts
 * pieces: chunk-81qqq1aq.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { init_react_production } from "../../vendor/react/cjs/react.production.js";
import { isClipboardImageUnsupported } from "../utils/imagePaste.js";
import { getShortcutDisplay } from "../keybindings/shortcutFormat.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-81qqq1aq.js:899-903 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-81qqq1aq.js:899", () => {
  init_react_production();
});
//@ chunk-81qqq1aq.js:903-1467 fingerprint (2.1.88 match: useClipboardImageHint, 0.747)
var CLIPBOARD_IMAGE_HINT = "clipboard-image-hint";
var CLIPBOARD_HINT_DELAY_MS = 1000;
var CLIPBOARD_HINT_COOLDOWN_MS = 30000;
var clipboardImageHintNoticeSpec = {
  id: "clipboard-image-hint",
  deps: (noticeState) => [
    noticeState.isTerminalFocused,
    noticeState.canPasteImages,
    noticeState.addNotification,
    noticeState.clock,
  ],
  setup() {
    let lastFocusedRef = null;
    let lastHintAt = 0;
    let checkTimeoutRef = null;
    return ({ isTerminalFocused, canPasteImages, addNotification, clock }) => {
      let wasFocused = lastFocusedRef ?? isTerminalFocused;
      lastFocusedRef = isTerminalFocused;
      if (!canPasteImages || !isTerminalFocused || wasFocused) return;
      checkTimeoutRef?.();
      checkTimeoutRef = clock.setTimeout(async () => {
        checkTimeoutRef = null;
        let now = Date.now();
        if (now - lastHintAt < CLIPBOARD_HINT_COOLDOWN_MS) return;
        if (await isClipboardImageUnsupported()) {
          lastHintAt = now;
          addNotification({
            key: CLIPBOARD_IMAGE_HINT,
            kind: "contextual",
            text: `Image in clipboard \xB7 ${getShortcutDisplay("chat:imagePaste", "Chat", "ctrl+v")} to paste`,
            priority: "immediate",
            timeoutMs: 8000,
          });
        }
      }, CLIPBOARD_HINT_DELAY_MS);
      return () => {
        checkTimeoutRef?.();
        checkTimeoutRef = null;
      };
    };
  },
};
export { clipboardImageHintNoticeSpec };
