/**
 * components/design-system/Pane.tsx
 *
 * 面板容器（带边框和标题的列布局）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/design-system/Pane.tsx
 * pieces: chunk-q3hnngce.js (2)
 * attribution: placement 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useHasScrollViewport } from "../ScrollViewportContext.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../../ink/components/Text.js";
import { Divider } from "./Divider.js";

//@ chunk-q3hnngce.js:370-389 placement
/**
 * Pane 组件的内边距常量。
 */
var PANE_PADDING = 2;
var PANE_PADDING_X = 1;
var PANE_WIDTH_RESERVE = 2;
//@ chunk-q3hnngce.js:389-903 fingerprint (2.1.88 match: Pane, 0.807)
function Pane(props) {
  let $ = useMemoCache(10);
  let { children, color, insetX } = props;
  let paddingX = insetX === undefined ? PANE_PADDING : insetX;
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
  let bodyBox;
  if ($[4] !== children || $[5] !== paddingX) {
    bodyBox = jsxProd_default(Box, {
      flexDirection: "column",
      paddingX,
      children,
    });
    $[4] = children;
    $[5] = paddingX;
    $[6] = bodyBox;
  } else bodyBox = $[6];
  let t3;
  if ($[7] !== t1 || $[8] !== bodyBox) {
    t3 = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingTop: 1,
      children: [t1, bodyBox],
    });
    $[7] = t1;
    $[8] = bodyBox;
    $[9] = t3;
  } else t3 = $[9];
  return t3;
}
export { Pane, PANE_PADDING_X, PANE_PADDING, PANE_WIDTH_RESERVE };
