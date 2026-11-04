/**
 * components/design-system/Ratchet.tsx
 *
 * 高度只增不减的容器（避免内容缩短导致跳动，离屏时可放开）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/design-system/Ratchet.tsx
 * pieces: chunk-04svxz07.js (2)
 * attribution: placement 1, fingerprint 1
 */
import {
  init_react_production,
  useRef,
  useState,
  useContext,
  useLayoutEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { useTerminalViewport } from "../../ink/components/Input.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { SpinnerPaceContext } from "../Spinner/paceContext.js";
import { measureElement } from "../../ink/hooks/useTerminalHooks.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../../ink/components/Text.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-04svxz07.js:384-388 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-04svxz07.js:384", () => {
  init_react_production();
});
//@ chunk-04svxz07.js:388-1067 fingerprint = Ratchet (0.75)
function Ratchet({ children, lock = "always", restartKey }) {
  let [viewportRef, { isVisible }, restart] = useTerminalViewport();
  let { rows, columns } = useTerminalSize();
  let innerRef = useRef(null);
  let [layout, setLayout] = useState({
    minHeight: 0,
    rows,
    columns,
    restartKey,
  });
  let needsRestart =
    lock === "always" &&
    (layout.rows !== rows || layout.columns !== columns || layout.restartKey !== restartKey);
  let locked = (lock === "always" || !isVisible) && !needsRestart;
  let maxHeight = useRef(0);
  let max = Math.max(layout.minHeight, maxHeight.current);
  let spinnerPaced = useContext(SpinnerPaceContext) !== null;
  useLayoutEffect(() => {
    if (!innerRef.current) return;
    let { height } = measureElement(innerRef.current);
    let min = Math.min(height, rows);
    if (needsRestart) {
      setLayout({
        minHeight: min,
        rows,
        columns,
        restartKey,
      });
      return;
    }
    if (height > max) {
      if (spinnerPaced && lock === "offscreen" && !locked && min >= layout.minHeight && restart()) {
        maxHeight.current = min;
        return;
      }
      maxHeight.current = 0;
      setLayout((el) =>
        el.minHeight === min
          ? el
          : {
              ...el,
              minHeight: min,
            },
      );
    }
  });
  return jsxProd_default(Box, {
    minHeight: locked ? max : undefined,
    ref: viewportRef,
    children: jsxProd_default(Box, {
      ref: innerRef,
      flexDirection: "column",
      children,
    }),
  });
}
export { Ratchet };
