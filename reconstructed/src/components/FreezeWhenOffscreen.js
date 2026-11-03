/**
 * components/FreezeWhenOffscreen.tsx
 *
 * 离屏时冻结渲染的组件（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dnj0hze9.js (2)
 * attribution: placement 2
 */
import { Se, R, Uy, zt } from "../../vendor/react/cjs/react.production.js";
import { TerminalSizeContext } from "../ink/terminalModes.js";
import { useAnimationFrame } from "../ink/hooks/use-animation-frame.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../ink/components/Text.js";

//@ chunk-dnj0hze9.js:536-737 placement
/**
 * 离屏冻结容器：组件不可见时继续渲染上一次的 children，避免离屏内容重绘；重新可见或终端尺寸变化时强制刷新。
 */
function FreezeWhenOffscreen({ children }) {
  let r = Se(TerminalSizeContext);
  let [t, o, l] = useAnimationFrame();
  let childrenRef = R(children);
  let [, m] = Uy((d) => d + 1, 0);
  let u = !o;
  if (!u) childrenRef.current = children;
  let columns = r?.columns;
  let rows = r?.rows;
  zt(() => {
    if (u && l()) m();
  }, [columns, rows, u, l]);
  return jsxProd_default(Box, {
    ref: t,
    children: childrenRef.current,
  });
}
//@ chunk-dnj0hze9.js:737-809 placement
/**
 * 函数 useFrozenValue（离屏时冻结上次的值）；位于「离屏时冻结渲染的组件（2.1.316 新增）」模块。
 */
function useFrozenValue(i) {
  let [r, t] = useAnimationFrame();
  let o = R(i);
  if (t) o.current = i;
  return [r, o.current];
}
export { FreezeWhenOffscreen, useFrozenValue };
