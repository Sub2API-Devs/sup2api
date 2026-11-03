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
import { j, R, y, Se, zt } from "../../../vendor/react/cjs/react.production.js";
import { useTerminalViewport } from "../../ink/components/Input.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { SpinnerPaceContext } from "../Spinner/paceContext.js";
import { measureElement } from "../../ink/hooks/useTerminalHooks.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../../ink/components/Text.js";

//@ chunk-04svxz07.js:384-388 placement
j();
//@ chunk-04svxz07.js:388-1067 fingerprint = Ratchet (0.75)
function Ratchet({ children: children, lock: lock = "always", restartKey: restartKey }) {
  let [H, { isVisible: x }, d] = useTerminalViewport(),
    { rows: rows, columns: columns } = useTerminalSize(),
    innerRef = R(null),
    [t, u] = y({ minHeight: 0, rows: rows, columns: columns, restartKey: restartKey }),
    l = lock === "always" && (t.rows !== rows || t.columns !== columns || t.restartKey !== restartKey),
    p = (lock === "always" || !x) && !l,
    maxHeight = R(0),
    max = Math.max(t.minHeight, maxHeight.current),
    E = Se(SpinnerPaceContext) !== null;
  return (
    zt(() => {
      if (!innerRef.current) return;
      let { height: height } = measureElement(innerRef.current),
        min = Math.min(height, rows);
      if (l) {
        u({ minHeight: min, rows: rows, columns: columns, restartKey: restartKey });
        return;
      }
      if (height > max) {
        if (E && lock === "offscreen" && !p && min >= t.minHeight && d()) {
          maxHeight.current = min;
          return;
        }
        ((maxHeight.current = 0), u((el) => (el.minHeight === min ? el : { ...el, minHeight: min })));
      }
    }),
    e(Box, {
      minHeight: p ? max : void 0,
      ref: H,
      children: e(Box, { ref: innerRef, flexDirection: "column", children: children }),
    })
  );
}

export { Ratchet };
