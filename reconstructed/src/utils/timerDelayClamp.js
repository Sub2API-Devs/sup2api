/**
 * utils/timerDelayClamp.ts
 *
 * 2.1.316 新增：定时器延迟钳制
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e1dn1jmn.js (1), chunk-shkzs7rp.js (3)
 * attribution: placement 4
 */
import { claimOnce } from "../services/api/verificationRequired.js";
import { logForDebugging } from "./debug.js";
import { logEvent } from "../services/analytics/index.js";
import { fromNumber } from "../services/analytics/safeMetadata.js";
import { errorTelemetryFields } from "./accessibility/screenReader.js";

//@ chunk-shkzs7rp.js:25969-26226 placement
function reportClampedTimerDelay(n, e) {
  if (!claimOnce().claim("timer_delay_clamped")) return;
  let S = Error("timer delay exceeds the setTimeout range; clamped");
  Error.captureStackTrace(S, n);
  logForDebugging(`${S.stack} (delay ${e} ms)`, {
    level: "warn",
  });
  logEvent("tengu_timer_delay_clamped", {
    delay: fromNumber(e),
    ...errorTelemetryFields(S),
  });
}
//@ chunk-shkzs7rp.js:26226-26436 placement
function wrapTimerWithDelayClamp(n) {
  let e = (S, A, ...r) => {
    if (typeof A === "number" && A > MAX_TIMER_DELAY_MS) {
      let s = n(S, MAX_TIMER_DELAY_MS, ...r);
      reportClampedTimerDelay(e, A);
      return s;
    }
    return r.length === 0 ? n(S, A) : n(S, A, ...r);
  };
  return Object.defineProperties(e, Object.getOwnPropertyDescriptors(n));
}
//@ chunk-shkzs7rp.js:26436-26622 placement
/**
 * 替换 globalThis.setTimeout/setInterval：延迟超过 32 位上限时夹紧并上报 tengu_timer_delay_clamped；返回还原函数。
 */
function installTimerDelayClamp() {
  let { setTimeout: n, setInterval: e } = globalThis;
  Object.assign(globalThis, {
    setTimeout: wrapTimerWithDelayClamp(n),
    setInterval: wrapTimerWithDelayClamp(e),
  });
  return () =>
    Object.assign(globalThis, {
      setTimeout: n,
      setInterval: e,
    });
}
//@ chunk-e1dn1jmn.js:191-209 placement
/**
 * 定时器最大延迟（2^31-1）。
 */
var MAX_TIMER_DELAY_MS = 2147483647;
export { installTimerDelayClamp, MAX_TIMER_DELAY_MS };
