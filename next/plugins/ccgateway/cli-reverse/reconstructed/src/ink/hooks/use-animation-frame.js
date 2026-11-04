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
import { init_react_production, useContext } from "../../../vendor/react/cjs/react.production.js";
import { expandContextSignal } from "../../components/messages/expandContext.js";
import { useTerminalViewport } from "../components/Input.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-dnj0hze9.js:455-459 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dnj0hze9.js:455", () => {
  init_react_production();
});
//@ chunk-dnj0hze9.js:459-536 fingerprint (2.1.88 match: useAnimationFrame, 1)
/**
 * 动画帧钩子：返回 [ref, 当前时钟值, 可见性读取函数]；组件不在可见区域时停止跟随时钟（省 CPU）。
 */
function useAnimationFrame() {
  let clock = useContext(expandContextSignal);
  let [ref, viewport, time, getActive] = useTerminalViewport();
  let active = getActive() ?? viewport.isVisible;
  return [ref, active || clock, time];
}
export { useAnimationFrame };
