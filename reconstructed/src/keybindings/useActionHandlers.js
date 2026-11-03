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
import { yt, y, zt, P, init_react_production, R, Oo, ce } from "../../vendor/react/cjs/react.production.js";
import { noopClock, useClock } from "../ink/components/ClockContext.js";
import { useInputClock } from "../ink/components/Input.js";

//@ chunk-yzt83vwd.js:940-1094 placement
function useActionHandler(e) {
  let keybindingContext = useKeybindingContext();
  let n = yt(
    keybindingContext?.keyHandlerRegistry.handlersChanged.subscribe ?? noopClock,
    () => keybindingContext?.hasHandler(e) ?? false,
  );
  return keybindingContext !== null && n ? () => keybindingContext.runAction(e) : null;
}
//@ chunk-yzt83vwd.js:1094-1286 placement
function usePreDispatchKeyHandler(handler, { isActive: t = true } = {}) {
  let keybindingContext = useKeybindingContext();
  let [r] = y(() => ({
    handler,
  }));
  zt(() => {
    r.handler = handler;
  });
  P(() => {
    if (!t || !keybindingContext) return;
    return keybindingContext.registerPreDispatch({
      handler: (o, s, i) => r.handler(o, s, i),
    });
  }, [t, keybindingContext, r]);
}
//@ chunk-yzt83vwd.js:1286-1290 placement
init_react_production();
//@ chunk-yzt83vwd.js:1290-1300 placement
/**
 * 800
 */
var DOUBLE_TAP_WINDOW_MS = 800;
//@ chunk-yzt83vwd.js:1300-1654 placement
function useDoublePress(e, t, noop, r = DOUBLE_TAP_WINDOW_MS) {
  let clock = useClock();
  let inputClock = useInputClock();
  let i = R(0);
  let c = R(undefined);
  let u = Oo(() => e(false));
  let l = ce(() => {
    if (c.current) {
      c.current();
      c.current = undefined;
    }
  }, []);
  P(
    () => () => {
      if (c.current) {
        l();
        u();
      }
    },
    [l],
  );
  return ce(() => {
    let d = inputClock();
    if (d - i.current <= r && c.current !== undefined) {
      l();
      e(false);
      t();
    } else {
      noop?.();
      e(true);
      l();
      c.current = clock.setTimeout(() => {
        e(false);
        c.current = undefined;
      }, r);
    }
    i.current = d;
  }, [e, t, noop, l, clock, inputClock, r]);
}
export { usePreDispatchKeyHandler, useActionHandler, useDoublePress };
