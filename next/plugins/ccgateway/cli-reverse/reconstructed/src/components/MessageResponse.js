/**
 * components/MessageResponse.tsx
 *
 * 工具结果/子输出的缩进容器（"⎿" 前缀），带 aria-hidden 与嵌套去重。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/MessageResponse.tsx
 * pieces: chunk-wq9366y3.js (6)
 * attribution: placement 5, fingerprint 1
 */
import { init_react_production, useContext, createContext } from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { NoSelect } from "../ink/components/Input.js";
import { Text, Box } from "../ink/components/Text.js";
import { Ratchet } from "./design-system/Ratchet.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-wq9366y3.js:380-384 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wq9366y3.js:380", () => {
  init_react_production();
});
//@ chunk-wq9366y3.js:384-388 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wq9366y3.js:384", () => {
  init_react_production();
});
//@ chunk-wq9366y3.js:388-1065 fingerprint (2.1.88 match: MessageResponse, 0.639)
/**
 * 工具结果缩进容器：首行前缀 "⎿"，嵌套时不重复；前缀 aria-hidden；被 100+ 处使用。
 */
function MessageResponse(props) {
  let $ = useMemoCache(11);
  let { children, height, screenReaderLabel } = props;
  if (useContext(InMessageResponseContext)) {
    return children;
  }
  const isUnlabeled = screenReaderLabel === undefined;
  let noSelectContent;
  if ($[0] !== screenReaderLabel || $[1] !== isUnlabeled) {
    noSelectContent = jsxProd_default(NoSelect, {
      fromLeftEdge: true,
      flexShrink: 0,
      children: jsxProd_default_2(Text, {
        "aria-hidden": isUnlabeled,
        "aria-label": screenReaderLabel,
        dimColor: true,
        children: ["  ", "\u23BF \xA0"],
      }),
    });
    $[0] = screenReaderLabel;
    $[1] = isUnlabeled;
    $[2] = noSelectContent;
  } else noSelectContent = $[2];
  let t2;
  if ($[3] !== children) {
    t2 = jsxProd_default(Box, {
      flexShrink: 1,
      flexGrow: 1,
      children,
    });
    $[3] = children;
    $[4] = t2;
  } else t2 = $[4];
  let t3;
  if ($[5] !== height || $[6] !== noSelectContent || $[7] !== t2) {
    t3 = jsxProd_default(InMessageResponseProvider, {
      children: jsxProd_default_2(Box, {
        flexDirection: "row",
        height,
        overflowY: "hidden",
        children: [noSelectContent, t2],
      }),
    });
    $[5] = height;
    $[6] = noSelectContent;
    $[7] = t2;
    $[8] = t3;
  } else t3 = $[8];
  let content = t3;
  if (height !== undefined) {
    return content;
  }
  let t4;
  if ($[9] !== content) {
    t4 = jsxProd_default(Ratchet, {
      lock: "offscreen",
      children: content,
    });
    $[9] = content;
    $[10] = t4;
  } else t4 = $[10];
  return t4;
}
//@ chunk-wq9366y3.js:1065-1078 placement
var InMessageResponseContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wq9366y3.js:1065", () => {
  InMessageResponseContext = createContext(false);
});
//@ chunk-wq9366y3.js:1078-1106 placement
/**
 * 函数 useMessageResponseValue（取消息响应上下文）；位于「工具结果/子输出的缩进容器（"⎿" 前缀），带 aria-hidden 与嵌套去重」模块。
 */
function useMessageResponseValue() {
  return useContext(InMessageResponseContext);
}
//@ chunk-wq9366y3.js:1106-1233 placement
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
