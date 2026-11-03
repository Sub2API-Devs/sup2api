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
import { g2, describePanePlaced } from "../plugins/functionHooks/panes.js";
import { P, R, j } from "../../vendor/react/cjs/react.production.js";
import { cKt, rFi } from "../plugins/functionHooks/ui/renderInstances.js";
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
  let max = Math.max(1, h - D),
    ee = g2.get();
  if (ee?.columns !== h || ee.rows !== x || ee.conversationColumns !== max)
    g2.set({ columns: h, rows: x, conversationColumns: max });
  P(() => {
    let Be = setTimeout(describePanePlaced, cKt, h);
    return () => clearTimeout(Be);
  }, [h]);
  let Re = R(max);
  P(() => {
    if (Re.current === max) return;
    if (!hasRenderHooks()) {
      Re.current = max;
      return;
    }
    let Be = setTimeout(
      (He, We) => {
        ((He.current = We), rFi());
      },
      cKt,
      Re,
      max,
    );
    return () => clearTimeout(Be);
  }, [max]);
}
//@ chunk-18hwfzwa.js:1810034-1810038 placement
j();

export { useTerminalViewportNamespace };
