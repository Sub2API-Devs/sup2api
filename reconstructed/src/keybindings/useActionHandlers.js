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
import { yt, y, zt, P, j, R, Oo, ce } from "../../vendor/react/cjs/react.production.js";
import { bTe, useClock } from "../ink/components/ClockContext.js";
import { useInputClock } from "../ink/components/Input.js";

//@ chunk-yzt83vwd.js:940-1094 placement
function useActionHandler(e) {
  let t = useKeybindingContext(),
    n = yt(t?.keyHandlerRegistry.handlersChanged.subscribe ?? bTe, () => t?.hasHandler(e) ?? !1);
  return t !== null && n ? () => t.runAction(e) : null;
}
//@ chunk-yzt83vwd.js:1094-1286 placement
function usePreDispatchKeyHandler(e, { isActive: t = !0 } = {}) {
  let n = useKeybindingContext(),
    [r] = y(() => ({ handler: e }));
  (zt(() => {
    r.handler = e;
  }),
    P(() => {
      if (!t || !n) return;
      return n.registerPreDispatch({ handler: (o, s, i) => r.handler(o, s, i) });
    }, [t, n, r]));
}
//@ chunk-yzt83vwd.js:1286-1290 placement
j();
//@ chunk-yzt83vwd.js:1290-1300 placement
var a = 800;
//@ chunk-yzt83vwd.js:1300-1654 placement
function useDoublePress(e, t, n, r = a) {
  let o = useClock(),
    s = useInputClock(),
    i = R(0),
    c = R(void 0),
    u = Oo(() => e(!1)),
    l = ce(() => {
      if (c.current) (c.current(), (c.current = void 0));
    }, []);
  return (
    P(
      () => () => {
        if (c.current) (l(), u());
      },
      [l],
    ),
    ce(() => {
      let d = s();
      if (d - i.current <= r && c.current !== void 0) (l(), e(!1), t());
      else
        (n?.(),
          e(!0),
          l(),
          (c.current = o.setTimeout(() => {
            (e(!1), (c.current = void 0));
          }, r)));
      i.current = d;
    }, [e, t, n, l, o, s, r])
  );
}

export { usePreDispatchKeyHandler, useActionHandler, useDoublePress };
