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
import { createContext, useContext, useState } from "../../../vendor/react/cjs/react.production.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-thjvqmbc.js:8008-8031 placement
function returnFalse_3() {
  return false;
}
//@ chunk-thjvqmbc.js:8031-8045 placement
var NOTICE_UNDER_SCENE_CONTEXT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-thjvqmbc.js:8031", () => {
  NOTICE_UNDER_SCENE_CONTEXT = createContext(false);
});
//@ chunk-thjvqmbc.js:8045-8074 placement
function useIsFullPageNotice() {
  return useContext(NOTICE_UNDER_SCENE_CONTEXT);
}
//@ chunk-thjvqmbc.js:8074-8128 placement
function FullPageNotice(props) {
  let { children } = props;
  useTerminalSize();
  useState(returnFalse_3);
  return children;
}
//@ chunk-thjvqmbc.js:8128-8302 placement
function NoticeUnderScene(props) {
  let $ = useMemoCache(2);
  let { children } = props;
  let providerElement;
  if ($[0] !== children) {
    providerElement = jsxProd_default(NOTICE_UNDER_SCENE_CONTEXT, {
      value: true,
      children: jsxProd_default(Box, {
        flexDirection: "column",
        paddingLeft: 1,
        children,
      }),
    });
    $[0] = children;
    $[1] = providerElement;
  } else providerElement = $[1];
  return providerElement;
}
//@ chunk-thjvqmbc.js:8302-8415 placement
function NoticeAccent(props) {
  let { children, bold, color } = props;
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
export { NoticeUnderScene, useIsFullPageNotice, NoticeAccent, FullPageNotice };
