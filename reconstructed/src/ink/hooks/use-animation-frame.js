/**
 * ink/hooks/use-animation-frame.ts
 *
 * 已有模块；g2 补充放置门面声明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/hooks/use-animation-frame.ts
 * pieces: chunk-dnj0hze9.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { j, Se } from "../../../vendor/react/cjs/react.production.js";
import { d5 } from "../../components/messages/expandContext.js";
import { useTerminalViewport } from "../components/Input.js";

//@ chunk-dnj0hze9.js:455-459 placement
j();
/**
 * 动画帧钩子：返回 [ref, 当前时钟值, 可见性读取函数]；组件不在可见区域时停止跟随时钟（省 CPU）。
 */
//@ chunk-dnj0hze9.js:459-536 fingerprint = useAnimationFrame (1)
function useAnimationFrame() {
  let clock = Se(d5),
    [r, t, o, l] = useTerminalViewport(),
    active = l() ?? t.isVisible;
  return [r, active || clock, o];
}

export { useAnimationFrame };
