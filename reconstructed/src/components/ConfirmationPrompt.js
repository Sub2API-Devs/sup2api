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
import { init_react_production, ce, yt } from "../../vendor/react/cjs/react.production.js";
import { useClock } from "../ink/components/ClockContext.js";
import { formatDuration } from "../utils/format.js";
import { MessageActionsKeybindings } from "./messageActions.js";

//@ chunk-e1k38nzg.js:340-344 placement
init_react_production();
//@ chunk-e1k38nzg.js:344-570 placement
function useElapsedTicker(startTime, o, t = 1000, n = 0, endTime) {
  let clock = useClock();
  let u = () => formatDuration(Math.max(0, (endTime ?? Date.now()) - startTime - n));
  let l = ce(
    (f) => {
      if (!o) return () => {};
      let i;
      let s = () => {
        try {
          f();
        } finally {
          i = clock.setTimeout(s, t);
        }
      };
      i = clock.setTimeout(s, t);
      return () => i();
    },
    [o, t, clock],
  );
  return yt(l, u, u);
}
//@ chunk-e1k38nzg.js:570-844 placement
function useConfirmationKeys({ onClose, onBack, onKill, onEnter }) {
  MessageActionsKeybindings(
    {
      "confirm:yes": onEnter ?? onClose,
    },
    {
      context: "Confirmation",
    },
  );
  return function (event) {
    if (event.key === " ") {
      event.preventDefault();
      onClose();
    } else if (event.key === "left" && onBack) {
      event.preventDefault();
      onBack();
    } else if (event.key === "x" && !event.ctrl && !event.meta && onKill) {
      event.preventDefault();
      onKill();
    }
  };
}
export { useElapsedTicker, useConfirmationKeys };
