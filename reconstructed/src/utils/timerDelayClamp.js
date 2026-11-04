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

//@ chunk-e1dn1jmn.js:191-209 placement
/**
 * 定时器最大延迟（2^31-1）。
 */
var MAX_TIMER_DELAY_MS = 2147483647;
//@ chunk-shkzs7rp.js:25969-26226 placement
function reportClampedTimerDelay(delayMs, caller) {
  if (!claimOnce().claim("timer_delay_clamped")) return;
  let error = Error("timer delay exceeds the setTimeout range; clamped");
  Error.captureStackTrace(error, delayMs);
  logForDebugging(`${error.stack} (delay ${caller} ms)`, {
    level: "warn",
  });
  logEvent("tengu_timer_delay_clamped", {
    delay: fromNumber(caller),
    ...errorTelemetryFields(error),
  });
}
//@ chunk-shkzs7rp.js:26226-26436 placement
function wrapTimerWithDelayClamp(timer) {
  let wrapped = (callback, delayMs, ...args) => {
    if (typeof delayMs === "number" && delayMs > MAX_TIMER_DELAY_MS) {
      let handle = timer(callback, MAX_TIMER_DELAY_MS, ...args);
      reportClampedTimerDelay(wrapped, delayMs);
      return handle;
    }
    return args.length === 0 ? timer(callback, delayMs) : timer(callback, delayMs, ...args);
  };
  return Object.defineProperties(wrapped, Object.getOwnPropertyDescriptors(timer));
}
//@ chunk-shkzs7rp.js:26436-26622 placement
/**
 * 替换 globalThis.setTimeout/setInterval：延迟超过 32 位上限时夹紧并上报 tengu_timer_delay_clamped；返回还原函数。
 */
function installTimerDelayClamp() {
  let { setTimeout: setTimeout_, setInterval: setInterval_ } = globalThis;
  Object.assign(globalThis, {
    setTimeout: wrapTimerWithDelayClamp(setTimeout_),
    setInterval: wrapTimerWithDelayClamp(setInterval_),
  });
  return () =>
    Object.assign(globalThis, {
      setTimeout: setTimeout_,
      setInterval: setInterval_,
    });
}
export { installTimerDelayClamp, MAX_TIMER_DELAY_MS };
