/**
 * hooks/useFocusOnMount.ts
 *
 * 2.1.316 新增：挂载时聚焦钩子。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7p2hc4jn.js (3)
 * attribution: placement 3
 */
import { init_react_production, P } from "../../vendor/react/cjs/react.production.js";
import { getFocusManager } from "../ink/focus.js";

//@ chunk-7p2hc4jn.js:1920-1924 placement
init_react_production();
//@ chunk-7p2hc4jn.js:1924-2265 placement
/**
 * 激活时让元素获得焦点，并在焦点被移到别处（不是其子孙）时抢回；不激活且 blurWhenInactive 时失焦。
 */
function useFocusOnMount(ref, active, blurWhenInactive = false) {
  P(() => {
    let s = ref.current;
    if (!s) return;
    let focusManager = getFocusManager(s);
    if (!active) {
      if (blurWhenInactive && focusManager.activeElement === s) focusManager.blur();
      return;
    }
    focusManager.focus(s);
    return focusManager.subscribe(() => {
      let u = ref.current;
      if (!u || focusManager.activeElement === u) return;
      if (!focusManager.activeElement) {
        focusManager.focus(u);
        return;
      }
      let parentNode = u.parentNode;
      while (parentNode) {
        if (parentNode === focusManager.activeElement) {
          focusManager.focus(u);
          return;
        }
        parentNode = parentNode.parentNode;
      }
    });
  }, [active, ref, blurWhenInactive]);
}
//@ chunk-7p2hc4jn.js:2265-2269 placement
init_react_production();
export { useFocusOnMount };
