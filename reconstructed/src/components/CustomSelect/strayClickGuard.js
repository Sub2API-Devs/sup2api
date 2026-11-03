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
import { j, y, ce } from "../../../vendor/react/cjs/react.production.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../../services/analytics/index.js";
import { DOUBLE_CLICK_MS } from "../../ink/components/ErrorBoundary.js";

//@ chunk-5g13d392.js:409-413 placement
j();
//@ chunk-5g13d392.js:413-467 placement
function u(o, n, r) {
  return o.isWindowActivation || i(n, r);
}
/**
 * 防误触：在组件出现后的短时间内忽略点击/按键。
 */
//@ chunk-5g13d392.js:467-822 placement
function useStrayClickGuard() {
  let o = useClock(),
    [n] = y(() => o.now());
  return ce(
    (r) => {
      let now = o.now();
      if (!u(r, n, now)) return !1;
      let c = r.isWindowActivation ? lit("window_activation") : lit("mount_settle");
      return (
        logForDebugging(
          `Select: dropped stray click (${r.isWindowActivation ? "window-activation click" : `${now - n}ms after mount`})`,
        ),
        logEvent("tengu_select_stray_click_dropped", { reason: c }),
        r.dropAsStray(),
        !0
      );
    },
    [o, n],
  );
}
//@ chunk-5g13d392.js:822-901 placement
function useIsWithinStrayWindow() {
  let o = useClock(),
    [n] = y(() => o.now());
  return ce(() => i(n, o.now()), [o, n]);
}
//@ chunk-5g13d392.js:901-932 placement
function i(o, n) {
  return n - o < DOUBLE_CLICK_MS;
}

export { useStrayClickGuard, useIsWithinStrayWindow };
