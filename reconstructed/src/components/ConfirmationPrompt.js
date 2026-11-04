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
import {
  init_react_production,
  useCallback,
  useSyncExternalStore,
} from "../../vendor/react/cjs/react.production.js";
import { useClock } from "../ink/components/ClockContext.js";
import { formatDuration } from "../utils/format.js";
import { MessageActionsKeybindings } from "./messageActions.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-e1k38nzg.js:340-344 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e1k38nzg.js:340", () => {
  init_react_production();
});
//@ chunk-e1k38nzg.js:344-570 placement
function useElapsedTicker(startTime, active, intervalMs = 1000, offsetMs = 0, endTime) {
  let clock = useClock();
  let formatElapsed = () => formatDuration(Math.max(0, (endTime ?? Date.now()) - startTime - offsetMs));
  let tickEffect = useCallback(
    (onTick) => {
      if (!active) return () => {};
      let timer;
      let tick = () => {
        try {
          onTick();
        } finally {
          timer = clock.setTimeout(tick, intervalMs);
        }
      };
      timer = clock.setTimeout(tick, intervalMs);
      return () => timer();
    },
    [active, intervalMs, clock],
  );
  return useSyncExternalStore(tickEffect, formatElapsed, formatElapsed);
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
