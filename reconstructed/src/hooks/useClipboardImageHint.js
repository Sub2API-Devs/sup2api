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
import { j } from "../../vendor/react/cjs/react.production.js";
import { nGs } from "../utils/imagePaste.js";
import { getShortcutDisplay } from "../keybindings/shortcutFormat.js";

//@ chunk-81qqq1aq.js:899-903 placement
j();
//@ chunk-81qqq1aq.js:903-1467 fingerprint = useClipboardImageHint (0.747)
var CLIPBOARD_IMAGE_HINT = "clipboard-image-hint",
  st = 1000,
  lt = 30000,
  Ee = {
    id: "clipboard-image-hint",
    deps: (t) => [t.isTerminalFocused, t.canPasteImages, t.addNotification, t.clock],
    setup() {
      let t = null,
        h = 0,
        i = null;
      return ({
        isTerminalFocused: isTerminalFocused,
        canPasteImages: canPasteImages,
        addNotification: addNotification,
        clock: clock,
      }) => {
        let o = t ?? isTerminalFocused;
        if (((t = isTerminalFocused), !canPasteImages || !isTerminalFocused || o)) return;
        return (
          i?.(),
          (i = clock.setTimeout(async () => {
            i = null;
            let now = Date.now();
            if (now - h < lt) return;
            if (await nGs())
              ((h = now),
                addNotification({
                  key: CLIPBOARD_IMAGE_HINT,
                  kind: "contextual",
                  text: `Image in clipboard \xB7 ${getShortcutDisplay("chat:imagePaste", "Chat", "ctrl+v")} to paste`,
                  priority: "immediate",
                  timeoutMs: 8000,
                }));
          }, st)),
          () => {
            (i?.(), (i = null));
          }
        );
      };
    },
  };

export { Ee };
