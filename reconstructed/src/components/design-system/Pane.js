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
import { Tl } from "../ScrollViewportContext.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../../ink/components/Text.js";
import { Divider } from "./Divider.js";

/**
 * Pane 组件的内边距常量。
 */
//@ chunk-gtxctzsd.js:370-389 placement
var PANE_PADDING = 2,
  zR = 1,
  l5 = 2;
//@ chunk-gtxctzsd.js:389-859 fingerprint = Pane (1)
function Pane(t0) {
  let $ = w(9),
    { children: children, color: color } = t0;
  if (Tl()) {
    let o;
    if ($[0] !== children)
      ((o = e(Box, { flexDirection: "column", paddingX: zR, flexShrink: 0, children: children })),
        ($[0] = children),
        ($[1] = o));
    else o = $[1];
    return o;
  }
  let o;
  if ($[2] !== color) ((o = e(Divider, { color: color })), ($[2] = color), ($[3] = o));
  else o = $[3];
  let n;
  if ($[4] !== children)
    ((n = e(Box, { flexDirection: "column", paddingX: PANE_PADDING, children: children })),
      ($[4] = children),
      ($[5] = n));
  else n = $[5];
  let l;
  if ($[6] !== o || $[7] !== n)
    ((l = r(Box, { flexDirection: "column", paddingTop: 1, children: [o, n] })),
      ($[6] = o),
      ($[7] = n),
      ($[8] = l));
  else l = $[8];
  return l;
}

export { PANE_PADDING, Pane, l5, zR };
