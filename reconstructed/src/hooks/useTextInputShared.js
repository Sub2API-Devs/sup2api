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
import { init_react_production, y, R, P } from "../../vendor/react/cjs/react.production.js";
import { clipboardImageHintNoticeSpec } from "./useClipboardImageHint.js";
import { useNotifications } from "../context/notifications.js";
import { useClock } from "../ink/components/ClockContext.js";

//@ chunk-81qqq1aq.js:1467-1471 placement
init_react_production();
//@ chunk-81qqq1aq.js:1471-2038 placement
/**
 * 依次运行一组 effect 槽（依赖变化时重跑）。
 */
function useEffectSlots(t, h) {
  let [i] = y(() =>
    t.map((d) => {
      let m = d.setup();
      return {
        effect: typeof m === "function" ? m : m.effect,
        dispose: typeof m === "function" ? undefined : m.dispose,
        deps: null,
        cleanup: undefined,
      };
    }),
  );
  let p = R(h);
  P(() => {
    p.current = h;
    let d = () => p.current;
    let m = [];
    t.forEach((c, o) => {
      let g = i[o];
      if (!g) return;
      let u = c.deps ? c.deps(h) : [];
      if (g.deps !== null && shallowArrayEqual(g.deps, u)) return;
      m.push({
        slot: g,
        deps: u,
      });
    });
    for (let { slot } of m) {
      slot.cleanup?.();
      slot.cleanup = undefined;
    }
    for (let { slot, deps } of m) {
      slot.deps = deps;
      slot.cleanup = slot.effect(h, d);
    }
  });
  P(
    () => () => {
      for (let d of i) {
        d.cleanup?.();
        d.cleanup = undefined;
        d.deps = null;
        d.dispose?.();
      }
    },
    [i],
  );
}
//@ chunk-81qqq1aq.js:2038-2157 placement
function shallowArrayEqual(deps, h) {
  if (deps.length !== h.length) return false;
  for (let i = 0; i < deps.length; i++) if (!Object.is(deps[i], h[i])) return false;
  return true;
}
//@ chunk-81qqq1aq.js:2157-2169 placement
var SHARED_NOTICE_SPECS = [clipboardImageHintNoticeSpec];
//@ chunk-81qqq1aq.js:2169-2330 placement
/**
 * 文本输入共享 effect（焦点、粘贴图片、通知）。
 */
function useTextInputEffects({ isTerminalFocused, canPasteImages }) {
  let { addNotification } = useNotifications();
  let clock = useClock();
  useEffectSlots(SHARED_NOTICE_SPECS, {
    isTerminalFocused,
    canPasteImages,
    addNotification,
    clock,
  });
}
//@ chunk-81qqq1aq.js:2330-2334 placement
init_react_production();
//@ chunk-81qqq1aq.js:2334-2338 placement
init_react_production();
export { useEffectSlots, useTextInputEffects };
