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
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";

//@ chunk-thjvqmbc.js:8008-8031 placement
function returnFalse_3() {
  return false;
}
//@ chunk-thjvqmbc.js:8031-8045 placement
var NOTICE_UNDER_SCENE_CONTEXT = qt(false);
//@ chunk-thjvqmbc.js:8045-8074 placement
function useIsFullPageNotice() {
  return Se(NOTICE_UNDER_SCENE_CONTEXT);
}
//@ chunk-thjvqmbc.js:8074-8128 placement
function FullPageNotice(props) {
  let { children } = props;
  useTerminalSize();
  y(returnFalse_3);
  return children;
}
//@ chunk-thjvqmbc.js:8128-8302 placement
function NoticeUnderScene(props) {
  let a = w(2);
  let { children } = props;
  let p;
  if (a[0] !== children) {
    p = jsxProd_default(NOTICE_UNDER_SCENE_CONTEXT, {
      value: true,
      children: jsxProd_default(Box, {
        flexDirection: "column",
        paddingLeft: 1,
        children,
      }),
    });
    a[0] = children;
    a[1] = p;
  } else p = a[1];
  return p;
}
//@ chunk-thjvqmbc.js:8302-8415 placement
function NoticeAccent(i) {
  let { children, bold, color } = i;
  return useIsFullPageNotice()
    ? jsxProd_default(Text, {
        children,
      })
    : jsxProd_default(Text, {
        bold,
        color,
        children,
      });
}
export { NoticeUnderScene, useIsFullPageNotice, NoticeAccent };
