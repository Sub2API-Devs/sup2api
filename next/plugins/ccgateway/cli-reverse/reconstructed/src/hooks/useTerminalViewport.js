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
import { __export } from "../../runtime/bun-runtime.js";
import { paneHostSlot, describePanePlaced } from "../plugins/functionHooks/panes.js";
import { useEffect, useRef, init_react_production } from "../../vendor/react/cjs/react.production.js";
import {
  STEADY_REDRAW_INTERVAL_MS,
  invalidateViewport,
} from "../plugins/functionHooks/ui/renderInstances.js";
import { hasRenderHooks } from "../plugins/functionHooks/ui/renderDispatch.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:36697-36707 placement
var useTerminalViewportNamespace = {};
//@ chunk-18hwfzwa.js:36707-36759 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:36707", () => {
  __export(useTerminalViewportNamespace, {
    default: () => useTerminalViewportNamespace,
    useTerminalViewport: () => useTerminalViewport,
  });
});
//@ chunk-18hwfzwa.js:1809635-1810034 placement
function useTerminalViewport(columns, rows, chromeHeight) {
  let max = Math.max(1, columns - chromeHeight);
  let previous = paneHostSlot.get();
  if (previous?.columns !== columns || previous.rows !== rows || previous.conversationColumns !== max)
    paneHostSlot.set({
      columns,
      rows,
      conversationColumns: max,
    });
  useEffect(() => {
    let timer = setTimeout(describePanePlaced, STEADY_REDRAW_INTERVAL_MS, columns);
    return () => clearTimeout(timer);
  }, [columns]);
  let lastWidthRef = useRef(max);
  useEffect(() => {
    if (lastWidthRef.current === max) return;
    if (!hasRenderHooks()) {
      lastWidthRef.current = max;
      return;
    }
    let timer = setTimeout(
      (widthRef, nextWidth) => {
        widthRef.current = nextWidth;
        invalidateViewport();
      },
      STEADY_REDRAW_INTERVAL_MS,
      lastWidthRef,
      max,
    );
    return () => clearTimeout(timer);
  }, [max]);
}
//@ chunk-18hwfzwa.js:1810034-1810038 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1810034", () => {
  init_react_production();
});
export { useTerminalViewportNamespace };
