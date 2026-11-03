/**
 * components/ConfirmationPrompt.tsx
 *
 * 2.1.316 新增：确认提示的计时与按键 hooks
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e1k38nzg.js (3)
 * attribution: placement 3
 */
import { j, ce, yt } from "../../vendor/react/cjs/react.production.js";
import { useClock } from "../ink/components/ClockContext.js";
import { formatDuration } from "../utils/format.js";
import { MessageActionsKeybindings } from "./messageActions.js";

//@ chunk-e1k38nzg.js:340-344 placement
j();
//@ chunk-e1k38nzg.js:344-570 placement
function useElapsedTicker(r, o, t = 1000, n = 0, a) {
  let e = useClock(),
    u = () => formatDuration(Math.max(0, (a ?? Date.now()) - r - n)),
    l = ce(
      (f) => {
        if (!o) return () => {};
        let i,
          s = () => {
            try {
              f();
            } finally {
              i = e.setTimeout(s, t);
            }
          };
        return ((i = e.setTimeout(s, t)), () => i());
      },
      [o, t, e],
    );
  return yt(l, u, u);
}
//@ chunk-e1k38nzg.js:570-844 placement
function useConfirmationKeys({ onClose: onClose, onBack: onBack, onKill: onKill, onEnter: onEnter }) {
  return (
    MessageActionsKeybindings({ "confirm:yes": onEnter ?? onClose }, { context: "Confirmation" }),
    function (e) {
      if (e.key === " ") (e.preventDefault(), onClose());
      else if (e.key === "left" && onBack) (e.preventDefault(), onBack());
      else if (e.key === "x" && !e.ctrl && !e.meta && onKill) (e.preventDefault(), onKill());
    }
  );
}

export { useElapsedTicker, useConfirmationKeys };
