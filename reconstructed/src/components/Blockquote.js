/**
 * components/Blockquote.tsx
 *
 * 2.1.316 新增：Markdown 引用块组件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-w1b4bxwt.js (1)
 * attribution: placement 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../ink/components/Text.js";

//@ chunk-w1b4bxwt.js:299-659 placement
function Blockquote(d) {
  let l = w(4),
    { multiline: multiline, children: children } = d;
  if (useIsScreenReaderEnabled()) {
    let o;
    if (l[0] !== children)
      ((o = e(Box, { "aria-role": "blockquote", children: children })), (l[0] = children), (l[1] = o));
    else o = l[1];
    return o;
  }
  if (!multiline) {
    return children;
  }
  let o;
  if (l[2] !== children)
    ((o = e(Box, {
      borderStyle: "single",
      borderLeft: !0,
      borderRight: !1,
      borderTop: !1,
      borderBottom: !1,
      borderDimColor: !0,
      paddingLeft: 1,
      children: children,
    })),
      (l[2] = children),
      (l[3] = o));
  else o = l[3];
  return o;
}

export { Blockquote };
