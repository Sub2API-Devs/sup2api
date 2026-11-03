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
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../../ink/components/Text.js";

//@ chunk-1yvyqkfy.js:296-701 placement
function FocusColumn(props) {
  let K = w(8);
  let { onKeyDown, onPaste, flexDirection, gap, tabIndex, autoFocus, children } = props;
  let flexDirection_2 = flexDirection === undefined ? "column" : flexDirection;
  let tabIndex_2 = tabIndex === undefined ? 0 : tabIndex;
  let autoFocus_2 = autoFocus === undefined ? true : autoFocus;
  let v;
  if (
    K[0] !== autoFocus_2 ||
    K[1] !== children ||
    K[2] !== flexDirection_2 ||
    K[3] !== gap ||
    K[4] !== onKeyDown ||
    K[5] !== onPaste ||
    K[6] !== tabIndex_2
  ) {
    v = jsxProd_default(Box, {
      flexDirection: flexDirection_2,
      gap,
      tabIndex: tabIndex_2,
      autoFocus: autoFocus_2,
      onKeyDown,
      onPaste,
      children,
    });
    K[0] = autoFocus_2;
    K[1] = children;
    K[2] = flexDirection_2;
    K[3] = gap;
    K[4] = onKeyDown;
    K[5] = onPaste;
    K[6] = tabIndex_2;
    K[7] = v;
  } else v = K[7];
  return v;
}
export { FocusColumn };
