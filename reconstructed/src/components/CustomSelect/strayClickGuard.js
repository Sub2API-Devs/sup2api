/**
 * components/CustomSelect/strayClickGuard.ts
 *
 * 2.1.316 新增：选择组件的防误触（出现后短时间忽略输入）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5g13d392.js (5)
 * attribution: placement 5
 */
import { init_react_production, y, ce } from "../../../vendor/react/cjs/react.production.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../../services/analytics/index.js";
import { DOUBLE_CLICK_MS } from "../../ink/components/ErrorBoundary.js";

//@ chunk-5g13d392.js:409-413 placement
init_react_production();
//@ chunk-5g13d392.js:413-467 placement
function isWindowActivationOrDoubleClick(o, n, r) {
  return o.isWindowActivation || isWithinDoubleClickMs(n, r);
}
//@ chunk-5g13d392.js:467-822 placement
/**
 * 防误触：在组件出现后的短时间内忽略点击/按键。
 */
function useStrayClickGuard() {
  let clock = useClock();
  let [n] = y(() => clock.now());
  return ce(
    (r) => {
      let e = clock.now();
      if (!isWindowActivationOrDoubleClick(r, n, e)) return false;
      let reason = r.isWindowActivation ? lit("window_activation") : lit("mount_settle");
      logForDebugging(
        `Select: dropped stray click (${r.isWindowActivation ? "window-activation click" : `${e - n}ms after mount`})`,
      );
      logEvent("tengu_select_stray_click_dropped", {
        reason,
      });
      r.dropAsStray();
      return true;
    },
    [clock, n],
  );
}
//@ chunk-5g13d392.js:822-901 placement
function useIsWithinStrayWindow() {
  let clock = useClock();
  let [n] = y(() => clock.now());
  return ce(() => isWithinDoubleClickMs(n, clock.now()), [clock, n]);
}
//@ chunk-5g13d392.js:901-932 placement
function isWithinDoubleClickMs(o, n) {
  return n - o < DOUBLE_CLICK_MS;
}
export { useStrayClickGuard, useIsWithinStrayWindow };
