/**
 * components/MessageResponse.tsx
 *
 * 工具结果/子输出的缩进容器（"⎿" 前缀），带 aria-hidden 与嵌套去重。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/MessageResponse.tsx
 * pieces: chunk-h40h7b8f.js (6)
 * attribution: placement 5, fingerprint 1
 */
import { init_react_production, useContext, createContext } from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { NoSelect } from "../ink/components/Input.js";
import { Text, Box } from "../ink/components/Text.js";
import { Ratchet } from "./design-system/Ratchet.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-h40h7b8f.js:415-419 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-h40h7b8f.js:415", () => {
  init_react_production();
});
//@ chunk-h40h7b8f.js:419-423 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-h40h7b8f.js:419", () => {
  init_react_production();
});
//@ chunk-h40h7b8f.js:423-1003 fingerprint (2.1.88 match: MessageResponse, 0.727)
/**
 * 工具结果缩进容器：首行前缀 "⎿"，嵌套时不重复；前缀 aria-hidden；被 100+ 处使用。
 */
function MessageResponse(props) {
  let $ = useMemoCache(8);
  let { children, height } = props;
  if (useContext(InMessageResponseContext)) {
    return children;
  }
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = jsxProd_default(NoSelect, {
      fromLeftEdge: true,
      flexShrink: 0,
      children: jsxProd_default_2(Text, {
        "aria-hidden": true,
        dimColor: true,
        children: ["  ", "\u23BF \xA0"],
      }),
    });
    $[0] = t1;
  } else t1 = $[0];
  let t2;
  if ($[1] !== children) {
    t2 = jsxProd_default(Box, {
      flexShrink: 1,
      flexGrow: 1,
      children,
    });
    $[1] = children;
    $[2] = t2;
  } else t2 = $[2];
  let t3;
  if ($[3] !== height || $[4] !== t2) {
    t3 = jsxProd_default(InMessageResponseProvider, {
      children: jsxProd_default_2(Box, {
        flexDirection: "row",
        height,
        overflowY: "hidden",
        children: [t1, t2],
      }),
    });
    $[3] = height;
    $[4] = t2;
    $[5] = t3;
  } else t3 = $[5];
  let content = t3;
  if (height !== undefined) {
    return content;
  }
  let t4;
  if ($[6] !== content) {
    t4 = jsxProd_default(Ratchet, {
      lock: "offscreen",
      children: content,
    });
    $[6] = content;
    $[7] = t4;
  } else t4 = $[7];
  return t4;
}
//@ chunk-h40h7b8f.js:1003-1016 placement
var InMessageResponseContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-h40h7b8f.js:1003", () => {
  InMessageResponseContext = createContext(false);
});
//@ chunk-h40h7b8f.js:1016-1044 placement
/**
 * 函数 useMessageResponseValue（取消息响应上下文）；位于「工具结果/子输出的缩进容器（"⎿" 前缀），带 aria-hidden 与嵌套去重」模块。
 */
function useMessageResponseValue() {
  return useContext(InMessageResponseContext);
}
//@ chunk-h40h7b8f.js:1044-1171 placement
function InMessageResponseProvider(props) {
  let $ = useMemoCache(2);
  let { children } = props;
  let providerElement;
  if ($[0] !== children) {
    providerElement = jsxProd_default(InMessageResponseContext.Provider, {
      value: true,
      children,
    });
    $[0] = children;
    $[1] = providerElement;
  } else providerElement = $[1];
  return providerElement;
}
export { MessageResponse, useMessageResponseValue };
