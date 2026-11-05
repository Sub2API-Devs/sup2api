/**
 * components/CustomSelect/strayClickGuard.ts
 *
 * 2.1.316 新增：选择组件的防误触（出现后短时间忽略输入）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-493gvbzj.js (5)
 * attribution: placement 5
 */
import { init_react_production, useState, useCallback } from "../../../vendor/react/cjs/react.production.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../../services/analytics/index.js";
import { DOUBLE_CLICK_MS } from "../../ink/components/ErrorBoundary.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-493gvbzj.js:409-413 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-493gvbzj.js:409", () => {
  init_react_production();
});
//@ chunk-493gvbzj.js:413-467 placement
function isWindowActivationOrDoubleClick(event, mountedAt, now) {
  return event.isWindowActivation || isWithinDoubleClickMs(mountedAt, now);
}
//@ chunk-493gvbzj.js:467-822 placement
/**
 * 防误触：在组件出现后的短时间内忽略点击/按键。
 */
function useStrayClickGuard() {
  let clock = useClock();
  let [mountedAt] = useState(() => clock.now());
  return useCallback(
    (event) => {
      let now = clock.now();
      if (!isWindowActivationOrDoubleClick(event, mountedAt, now)) return false;
      let reason = event.isWindowActivation ? lit("window_activation") : lit("mount_settle");
      logForDebugging(
        `Select: dropped stray click (${event.isWindowActivation ? "window-activation click" : `${now - mountedAt}ms after mount`})`,
      );
      logEvent("tengu_select_stray_click_dropped", {
        reason,
      });
      event.dropAsStray();
      return true;
    },
    [clock, mountedAt],
  );
}
//@ chunk-493gvbzj.js:822-901 placement
function useIsWithinStrayWindow() {
  let clock = useClock();
  let [mountedAt] = useState(() => clock.now());
  return useCallback(() => isWithinDoubleClickMs(mountedAt, clock.now()), [clock, mountedAt]);
}
//@ chunk-493gvbzj.js:901-932 placement
function isWithinDoubleClickMs(from, to) {
  return to - from < DOUBLE_CLICK_MS;
}
export { useStrayClickGuard, useIsWithinStrayWindow };
