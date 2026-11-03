/**
 * components/design-system/NoticeUnderScene.tsx
 *
 * 2.1.316 新增：场景下方提示与整页提示组件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-thjvqmbc.js (6)
 * attribution: placement 6
 */
import { qt, Se, y } from "../../../vendor/react/cjs/react.production.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";

//@ chunk-thjvqmbc.js:8008-8031 placement
function vt() {
  return !1;
}
//@ chunk-thjvqmbc.js:8031-8045 placement
var ee = qt(!1);
//@ chunk-thjvqmbc.js:8045-8074 placement
function useIsFullPageNotice() {
  return Se(ee);
}
//@ chunk-thjvqmbc.js:8074-8128 placement
function FullPageNotice(i) {
  let { children: children } = i;
  return (useTerminalSize(), y(vt), children);
}
//@ chunk-thjvqmbc.js:8128-8302 placement
function NoticeUnderScene(i) {
  let a = w(2),
    { children: children } = i,
    p;
  if (a[0] !== children)
    ((p = e(ee, {
      value: !0,
      children: e(Box, { flexDirection: "column", paddingLeft: 1, children: children }),
    })),
      (a[0] = children),
      (a[1] = p));
  else p = a[1];
  return p;
}
//@ chunk-thjvqmbc.js:8302-8415 placement
function NoticeAccent(i) {
  let { children: children, bold: bold, color: color } = i;
  return useIsFullPageNotice()
    ? e(Text, { children: children })
    : e(Text, { bold: bold, color: color, children: children });
}

export { NoticeUnderScene, useIsFullPageNotice, NoticeAccent };
