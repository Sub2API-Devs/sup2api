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
import { j, P } from "../../vendor/react/cjs/react.production.js";
import { getFocusManager } from "../ink/focus.js";

//@ chunk-7p2hc4jn.js:1920-1924 placement
j();
/**
 * 激活时让元素获得焦点，并在焦点被移到别处（不是其子孙）时抢回；不激活且 blurWhenInactive 时失焦。
 */
//@ chunk-7p2hc4jn.js:1924-2265 placement
function useFocusOnMount(ref, active, blurWhenInactive = !1) {
  P(() => {
    let s = ref.current;
    if (!s) return;
    let o = getFocusManager(s);
    if (!active) {
      if (blurWhenInactive && o.activeElement === s) o.blur();
      return;
    }
    return (
      o.focus(s),
      o.subscribe(() => {
        let u = ref.current;
        if (!u || o.activeElement === u) return;
        if (!o.activeElement) {
          o.focus(u);
          return;
        }
        let parentNode = u.parentNode;
        while (parentNode) {
          if (parentNode === o.activeElement) {
            o.focus(u);
            return;
          }
          parentNode = parentNode.parentNode;
        }
      })
    );
  }, [active, ref, blurWhenInactive]);
}
//@ chunk-7p2hc4jn.js:2265-2269 placement
j();

export { useFocusOnMount };
