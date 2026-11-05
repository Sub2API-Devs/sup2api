/**
 * utils/timerDelayClamp.ts
 *
 * 2.1.316 新增：定时器延迟钳制
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nhaxap13.js (3), chunk-yqqx9rv1.js (1)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { claimOnce } from "../services/api/verificationRequired.js";
import { logForDebugging } from "./debug.js";
import { logEvent } from "../services/analytics/index.js";
import { fromNumber } from "../services/analytics/safeMetadata.js";
import { errorTelemetryFields } from "./accessibility/screenReader.js";

//@ chunk-yqqx9rv1.js:191-209 placement
/**
 * 定时器最大延迟（2^31-1）。
 */
var MAX_TIMER_DELAY_MS = 2147483647;
//@ chunk-nhaxap13.js:27450-27707 placement
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
//@ chunk-nhaxap13.js:27707-27917 placement
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
//@ chunk-nhaxap13.js:27917-28103 placement
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
export { MAX_TIMER_DELAY_MS, installTimerDelayClamp };
