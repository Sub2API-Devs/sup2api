/**
 * components/design-system/FocusColumn.tsx
 *
 * 2.1.316 新增：可聚焦的纵向容器组件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1yvyqkfy.js (1)
 * attribution: placement 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../../ink/components/Text.js";

//@ chunk-1yvyqkfy.js:296-701 placement
function FocusColumn(P) {
  let K = w(8),
    {
      onKeyDown: onKeyDown,
      onPaste: onPaste,
      flexDirection: flexDirection,
      gap: gap,
      tabIndex: tabIndex,
      autoFocus: autoFocus,
      children: children,
    } = P,
    r = flexDirection === void 0 ? "column" : flexDirection,
    c = tabIndex === void 0 ? 0 : tabIndex,
    i = autoFocus === void 0 ? !0 : autoFocus,
    v;
  if (
    K[0] !== i ||
    K[1] !== children ||
    K[2] !== r ||
    K[3] !== gap ||
    K[4] !== onKeyDown ||
    K[5] !== onPaste ||
    K[6] !== c
  )
    ((v = e(Box, {
      flexDirection: r,
      gap: gap,
      tabIndex: c,
      autoFocus: i,
      onKeyDown: onKeyDown,
      onPaste: onPaste,
      children: children,
    })),
      (K[0] = i),
      (K[1] = children),
      (K[2] = r),
      (K[3] = gap),
      (K[4] = onKeyDown),
      (K[5] = onPaste),
      (K[6] = c),
      (K[7] = v));
  else v = K[7];
  return v;
}

export { FocusColumn };
