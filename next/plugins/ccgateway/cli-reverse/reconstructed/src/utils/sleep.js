/**
 * utils/sleep.ts
 *
 * 可中断的 sleep 与 withTimeout
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sleep.ts
 * pieces: chunk-82kqcve8.js (1), chunk-eabawhjj.js (11), chunk-p7xf186d.js (1)
 * attribution: placement 4, facade-exports 5, layout 3, fingerprint 1
 */
import { createAbortController } from "./abortController.js";
import { deferInit, runDeferredInits } from "../../runtime/deferred-init.js";

//@ chunk-eabawhjj.js:191-516 placement
/**
 * 计算指数退避延迟：min(cap, base × factor^(attempt−1))，再按 jitter 类型（none/full/equal 等）加随机抖动。
 */
function backoffDelayMs({
  attempt,
  baseMs,
  capMs = 1 / 0,
  factor = 2,
  jitter = {
    kind: "none",
  },
  random = Math.random,
}) {
  let min = Math.min(capMs, baseMs * factor ** (attempt - 1));
  switch (jitter.kind) {
    case "none":
      return min;
    case "proportional":
      return min + random() * jitter.ratio * min;
    case "symmetric":
      return Math.max(0, min + min * jitter.ratio * (2 * random() - 1));
    case "full": {
      let min_2 = Math.min(jitter.floorMs, min);
      return min_2 + random() * (min - min_2);
    }
  }
}
//@ chunk-eabawhjj.js:516-679 placement
/**
 * 系统时钟实现：当前时间、单调时间，以及可 unref 的 setTimeout（返回取消函数）。
 */
class SystemClock {
  now() {
    return Date.now();
  }
  monotonicNow() {
    return performance.now();
  }
  setTimeout(callback, delayMs, options) {
    let timer = setTimeout(callback, delayMs);
    if (options?.unref) timer.unref();
    return () => clearTimeout(timer);
  }
}
//@ chunk-eabawhjj.js:679-694 placement
/**
 * 系统时钟实现（sleep/超时用）。
 */
var systemClock; // deferred: uses SystemClock of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-eabawhjj.js:679", () => {
  systemClock = new SystemClock();
});
//@ chunk-eabawhjj.js:694-1079 facade-exports = sleep (0.91)
/**
 * 可被 AbortSignal 中断的 sleep；可选 abort 时抛错或静默返回、unref 定时器。
 */
function sleep(ms, signal, opts) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      if (opts?.throwOnAbort || opts?.abortError) reject(opts.abortError?.() ?? Error("aborted"));
      else resolve();
      return;
    }
    let timer = (opts?.clock ?? systemClock).setTimeout(
      () => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      },
      ms,
      {
        unref: opts?.unref,
      },
    );
    function onAbort() {
      timer();
      if (opts?.throwOnAbort || opts?.abortError) reject(opts.abortError?.() ?? Error("aborted"));
      else resolve();
    }
    signal?.addEventListener("abort", onAbort, {
      once: true,
    });
  });
}
//@ chunk-eabawhjj.js:1079-1091 layout
var DEFAULT_BACKOFF_CAP_MS = 60000;
//@ chunk-eabawhjj.js:1091-1274 facade-exports
function fullJitterBackoffMs({
  baseMs,
  capMs = DEFAULT_BACKOFF_CAP_MS,
  attempt,
  floorMs = 0,
  random = Math.random,
}) {
  return Math.floor(
    backoffDelayMs({
      attempt: Math.max(0, attempt) + 1,
      baseMs,
      capMs,
      jitter: {
        kind: "full",
        floorMs,
      },
      random,
    }),
  );
}
//@ chunk-eabawhjj.js:1274-1302 layout
function rejectWithMessage(reject, message) {
  reject(Error(message));
}
//@ chunk-eabawhjj.js:1302-1445 facade-exports = withTimeout (1)
function withTimeout(promise, ms, message) {
  let timer;
  let timeoutPromise = new Promise((resolve, reject) => {
    timer = setTimeout(rejectWithMessage, ms, reject, message);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}
//@ chunk-eabawhjj.js:1445-1508 layout
var scheduleUnrefTimeout = (callback, delayMs) => {
  let timer = setTimeout(callback, delayMs);
  return () => clearTimeout(timer);
};
//@ chunk-eabawhjj.js:1508-1623 facade-exports = withTimeout (1)
function withDeadline(promise, ms, message = scheduleUnrefTimeout) {
  let timer = () => {};
  let timeoutPromise = new Promise((resolve) => {
    timer = message(() => resolve(undefined), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(timer);
}
//@ chunk-eabawhjj.js:1623-1889 facade-exports
async function raceWithAbortSignal(promise, signal, makeAbortError) {
  let swallowLate = () => {
    promise.catch(() => {});
  };
  if (signal.aborted) {
    swallowLate();
    throw makeAbortError();
  }
  let onAbort = () => {};
  try {
    return await Promise.race([
      promise,
      new Promise((resolve, reject) => {
        onAbort = () => reject(makeAbortError());
        signal.addEventListener("abort", onAbort, {
          once: true,
        });
      }),
    ]);
  } catch (error) {
    swallowLate();
    throw error;
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}
//@ chunk-82kqcve8.js:187814-187944 placement = withTimeout (1)
/**
 * 等待 promise 或 ms 毫秒超时，二者先到为准；返回 promise 是否在超时前结束（不抛错）。
 */
async function raceWithTimeout(promise, waitCapMs) {
  let abortController = createAbortController();
  let finishedFirst = false;
  await Promise.race([
    promise
      .catch(() => {})
      .finally(() => {
        finishedFirst = true;
        abortController.abort();
      }),
    sleep(waitCapMs, abortController.signal),
  ]);
  return finishedFirst;
}
//@ chunk-p7xf186d.js:9239-9387 fingerprint = withTimeout (1)
function withTimeout_2(promise, ms, message) {
  let timer;
  let timeoutPromise = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(message()), ms * 1000);
    timer.unref?.();
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// The import cycle this module closes (2 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("src/utils/sleep.js");
runDeferredInits("worker:src/utils/sleep.js");
export {
  withDeadline,
  sleep,
  backoffDelayMs,
  raceWithAbortSignal,
  systemClock,
  withTimeout,
  fullJitterBackoffMs,
  raceWithTimeout,
  SystemClock,
  withTimeout_2,
};
