/**
 * hooks/useTextInputShared.ts
 *
 * 文本输入共享逻辑（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-81qqq1aq.js (7)
 * attribution: placement 7
 */
import { j, y, R, P } from "../../vendor/react/cjs/react.production.js";
import { Ee } from "./useClipboardImageHint.js";
import { useNotifications } from "../context/notifications.js";
import { useClock } from "../ink/components/ClockContext.js";

//@ chunk-81qqq1aq.js:1467-1471 placement
j();
/**
 * 依次运行一组 effect 槽（依赖变化时重跑）。
 */
//@ chunk-81qqq1aq.js:1471-2038 placement
function useEffectSlots(t, h) {
  let [i] = y(() =>
      t.map((d) => {
        let setup = d.setup();
        return {
          effect: typeof setup === "function" ? setup : setup.effect,
          dispose: typeof setup === "function" ? void 0 : setup.dispose,
          deps: null,
          cleanup: void 0,
        };
      }),
    ),
    p = R(h);
  (P(() => {
    p.current = h;
    let d = () => p.current,
      m = [];
    t.forEach((c, o) => {
      let g = i[o];
      if (!g) return;
      let u = c.deps ? c.deps(h) : [];
      if (g.deps !== null && shallowArrayEqual(g.deps, u)) return;
      m.push({ slot: g, deps: u });
    });
    for (let { slot: slot } of m) (slot.cleanup?.(), (slot.cleanup = void 0));
    for (let { slot: slot, deps: deps } of m) ((slot.deps = deps), (slot.cleanup = slot.effect(h, d)));
  }),
    P(
      () => () => {
        for (let d of i) (d.cleanup?.(), (d.cleanup = void 0), (d.deps = null), d.dispose?.());
      },
      [i],
    ));
}
//@ chunk-81qqq1aq.js:2038-2157 placement
function shallowArrayEqual(t, h) {
  if (t.length !== h.length) return !1;
  for (let i = 0; i < t.length; i++) if (!Object.is(t[i], h[i])) return !1;
  return !0;
}
//@ chunk-81qqq1aq.js:2157-2169 placement
var pt = [Ee];
/**
 * 文本输入共享 effect（焦点、粘贴图片、通知）。
 */
//@ chunk-81qqq1aq.js:2169-2330 placement
function useTextInputEffects({ isTerminalFocused: isTerminalFocused, canPasteImages: canPasteImages }) {
  let { addNotification: addNotification } = useNotifications(),
    p = useClock();
  useEffectSlots(pt, {
    isTerminalFocused: isTerminalFocused,
    canPasteImages: canPasteImages,
    addNotification: addNotification,
    clock: p,
  });
}
//@ chunk-81qqq1aq.js:2330-2334 placement
j();
//@ chunk-81qqq1aq.js:2334-2338 placement
j();

export { useEffectSlots, useTextInputEffects };
