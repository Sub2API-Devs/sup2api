/**
 * hooks/useTerminalViewport.ts
 *
 * 2.1.316 新增。终端视口尺寸 hook。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __export } from "../../runtime/bun-runtime.js";
import { init_react_production, useEffect, useRef } from "../../vendor/react/cjs/react.production.js";
import { paneHostSlot, describePanePlaced } from "../plugins/functionHooks/panes.js";
import {
  STEADY_REDRAW_INTERVAL_MS,
  invalidateViewport,
} from "../plugins/functionHooks/ui/renderInstances.js";
import { hasRenderHooks } from "../plugins/functionHooks/ui/renderDispatch.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:38258-38268 placement
var useTerminalViewportNamespace = {};
//@ chunk-czq1j3j2.js:38268-38320 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:38268", () => {
  __export(useTerminalViewportNamespace, {
    default: () => useTerminalViewportNamespace,
    useTerminalViewport: () => useTerminalViewport,
  });
});
//@ chunk-czq1j3j2.js:1852899-1852903 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1852899", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1857614-1858013 placement
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
export { useTerminalViewportNamespace };
