/**
 * components/FreezeWhenOffscreen.tsx
 *
 * 离屏时冻结渲染的组件（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5e7d3nv9.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useContext, useRef, useReducer, useLayoutEffect } from "../../vendor/react/cjs/react.production.js";
import { TerminalSizeContext } from "../ink/terminalModes.js";
import { useAnimationFrame } from "../ink/hooks/use-animation-frame.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../ink/components/Text.js";

//@ chunk-5e7d3nv9.js:463-664 placement
/**
 * 离屏冻结容器：组件不可见时继续渲染上一次的 children，避免离屏内容重绘；重新可见或终端尺寸变化时强制刷新。
 */
function FreezeWhenOffscreen({ children }) {
  let size = useContext(TerminalSizeContext);
  let [ref, visible, subscribe] = useAnimationFrame();
  let childrenRef = useRef(children);
  let [, forceUpdate] = useReducer((count) => count + 1, 0);
  let frozen = !visible;
  if (!frozen) childrenRef.current = children;
  let columns = size?.columns;
  let rows = size?.rows;
  useLayoutEffect(() => {
    if (frozen && subscribe()) forceUpdate();
  }, [columns, rows, frozen, subscribe]);
  return jsxProd_default(Box, {
    ref,
    children: childrenRef.current,
  });
}
//@ chunk-5e7d3nv9.js:664-736 placement
/**
 * 函数 useFrozenValue（离屏时冻结上次的值）；位于「离屏时冻结渲染的组件（2.1.316 新增）」模块。
 */
function useFrozenValue(value) {
  let [frameRef, visible] = useAnimationFrame();
  let valueRef = useRef(value);
  if (visible) valueRef.current = value;
  return [frameRef, valueRef.current];
}
export { FreezeWhenOffscreen, useFrozenValue };
