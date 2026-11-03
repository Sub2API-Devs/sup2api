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
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../ink/components/Text.js";

/**
 * 离屏冻结容器：组件不可见时继续渲染上一次的 children，避免离屏内容重绘；重新可见或终端尺寸变化时强制刷新。
 */
//@ chunk-dnj0hze9.js:536-737 placement
function FreezeWhenOffscreen({ children: children }) {
  let r = Se(TerminalSizeContext),
    [t, o, l] = useAnimationFrame(),
    f = R(children),
    [, m] = Uy((d) => d + 1, 0),
    u = !o;
  if (!u) f.current = children;
  let a = r?.columns,
    c = r?.rows;
  return (
    zt(() => {
      if (u && l()) m();
    }, [a, c, u, l]),
    e(Box, { ref: t, children: f.current })
  );
}
//@ chunk-dnj0hze9.js:737-809 placement
function a5(i) {
  let [r, t] = useAnimationFrame(),
    o = R(i);
  if (t) o.current = i;
  return [r, o.current];
}

export { FreezeWhenOffscreen, a5 };
