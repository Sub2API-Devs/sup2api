/**
 * components/design-system/Pane.tsx
 *
 * 面板容器（带边框和标题的列布局）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/design-system/Pane.tsx
 * pieces: chunk-gtxctzsd.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useHasScrollViewport } from "../ScrollViewportContext.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../../ink/components/Text.js";
import { Divider } from "./Divider.js";

//@ chunk-gtxctzsd.js:370-389 placement
/**
 * Pane 组件的内边距常量。
 */
var PANE_PADDING = 2;
var PANE_PADDING_X = 1;
var PANE_WIDTH_RESERVE = 2;
//@ chunk-gtxctzsd.js:389-859 fingerprint = Pane (1)
function Pane(props) {
  let $ = w(9);
  let { children, color } = props;
  if (useHasScrollViewport()) {
    let t1;
    if ($[0] !== children) {
      t1 = jsxProd_default(Box, {
        flexDirection: "column",
        paddingX: PANE_PADDING_X,
        flexShrink: 0,
        children,
      });
      $[0] = children;
      $[1] = t1;
    } else t1 = $[1];
    return t1;
  }
  let t1;
  if ($[2] !== color) {
    t1 = jsxProd_default(Divider, {
      color,
    });
    $[2] = color;
    $[3] = t1;
  } else t1 = $[3];
  let t2;
  if ($[4] !== children) {
    t2 = jsxProd_default(Box, {
      flexDirection: "column",
      paddingX: PANE_PADDING,
      children,
    });
    $[4] = children;
    $[5] = t2;
  } else t2 = $[5];
  let t3;
  if ($[6] !== t1 || $[7] !== t2) {
    t3 = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingTop: 1,
      children: [t1, t2],
    });
    $[6] = t1;
    $[7] = t2;
    $[8] = t3;
  } else t3 = $[8];
  return t3;
}
export { PANE_PADDING, Pane, PANE_WIDTH_RESERVE, PANE_PADDING_X };
