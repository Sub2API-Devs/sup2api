/**
 * keybindings/useActionHandlers.ts
 *
 * 2.1.316 新增：快捷键动作处理器、预分发按键与双击 hooks
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yzt83vwd.js (5)
 * attribution: placement 5
 */
import { useKeybindingContext } from "./KeybindingContext.js";
import {
  useSyncExternalStore,
  useState,
  useLayoutEffect,
  useEffect,
  init_react_production,
  useRef,
  useEffectEvent,
  useCallback,
} from "../../vendor/react/cjs/react.production.js";
import { noopClock, useClock } from "../ink/components/ClockContext.js";
import { useInputClock } from "../ink/components/Input.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-yzt83vwd.js:940-1094 placement
function useActionHandler(action) {
  let keybindingContext = useKeybindingContext();
  let hasHandler = useSyncExternalStore(
    keybindingContext?.keyHandlerRegistry.handlersChanged.subscribe ?? noopClock,
    () => keybindingContext?.hasHandler(action) ?? false,
  );
  return keybindingContext !== null && hasHandler ? () => keybindingContext.runAction(action) : null;
}
//@ chunk-yzt83vwd.js:1094-1286 placement
function usePreDispatchKeyHandler(handler, { isActive = true } = {}) {
  let keybindingContext = useKeybindingContext();
  let [handlerRef] = useState(() => ({
    handler,
  }));
  useLayoutEffect(() => {
    handlerRef.handler = handler;
  });
  useEffect(() => {
    if (!isActive || !keybindingContext) return;
    return keybindingContext.registerPreDispatch({
      handler: (event, context, action) => handlerRef.handler(event, context, action),
    });
  }, [isActive, keybindingContext, handlerRef]);
}
//@ chunk-yzt83vwd.js:1286-1290 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-yzt83vwd.js:1286", () => {
  init_react_production();
});
//@ chunk-yzt83vwd.js:1290-1300 placement
/**
 * 800
 */
var DOUBLE_TAP_WINDOW_MS = 800;
//@ chunk-yzt83vwd.js:1300-1654 placement
function useDoublePress(onPendingChange, onDoublePress, noop, windowMs = DOUBLE_TAP_WINDOW_MS) {
  let clock = useClock();
  let inputClock = useInputClock();
  let lastPressAtRef = useRef(0);
  let resetTimerRef = useRef(undefined);
  let clearPending = useEffectEvent(() => onPendingChange(false));
  let cancelPending = useCallback(() => {
    if (resetTimerRef.current) {
      resetTimerRef.current();
      resetTimerRef.current = undefined;
    }
  }, []);
  useEffect(
    () => () => {
      if (resetTimerRef.current) {
        cancelPending();
        clearPending();
      }
    },
    [cancelPending],
  );
  return useCallback(() => {
    let now = inputClock();
    if (now - lastPressAtRef.current <= windowMs && resetTimerRef.current !== undefined) {
      cancelPending();
      onPendingChange(false);
      onDoublePress();
    } else {
      noop?.();
      onPendingChange(true);
      cancelPending();
      resetTimerRef.current = clock.setTimeout(() => {
        onPendingChange(false);
        resetTimerRef.current = undefined;
      }, windowMs);
    }
    lastPressAtRef.current = now;
  }, [onPendingChange, onDoublePress, noop, cancelPending, clock, inputClock, windowMs]);
}
export { usePreDispatchKeyHandler, useActionHandler, useDoublePress };
