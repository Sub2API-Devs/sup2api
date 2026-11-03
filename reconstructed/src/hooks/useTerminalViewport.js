/**
 * hooks/useTerminalViewport.ts
 *
 * 2.1.316 新增。终端视口尺寸 hook。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: placement 4
 */
import { Ar } from "../../runtime/bun-runtime.js";
import { paneHostSlot, describePanePlaced } from "../plugins/functionHooks/panes.js";
import { P, R, init_react_production } from "../../vendor/react/cjs/react.production.js";
import {
  STEADY_REDRAW_INTERVAL_MS,
  invalidateViewport,
} from "../plugins/functionHooks/ui/renderInstances.js";
import { hasRenderHooks } from "../plugins/functionHooks/ui/renderDispatch.js";

//@ chunk-18hwfzwa.js:36697-36707 placement
var useTerminalViewportNamespace = {};
//@ chunk-18hwfzwa.js:36707-36759 placement
Ar(useTerminalViewportNamespace, {
  default: () => useTerminalViewportNamespace,
  useTerminalViewport: () => useTerminalViewport,
});
//@ chunk-18hwfzwa.js:1809635-1810034 placement
function useTerminalViewport(h, x, D) {
  let max = Math.max(1, h - D);
  let ee = paneHostSlot.get();
  if (ee?.columns !== h || ee.rows !== x || ee.conversationColumns !== max)
    paneHostSlot.set({
      columns: h,
      rows: x,
      conversationColumns: max,
    });
  P(() => {
    let timer = setTimeout(describePanePlaced, STEADY_REDRAW_INTERVAL_MS, h);
    return () => clearTimeout(timer);
  }, [h]);
  let Re = R(max);
  P(() => {
    if (Re.current === max) return;
    if (!hasRenderHooks()) {
      Re.current = max;
      return;
    }
    let timer = setTimeout(
      (He, We) => {
        He.current = We;
        invalidateViewport();
      },
      STEADY_REDRAW_INTERVAL_MS,
      Re,
      max,
    );
    return () => clearTimeout(timer);
  }, [max]);
}
//@ chunk-18hwfzwa.js:1810034-1810038 placement
init_react_production();
export { useTerminalViewportNamespace };
