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

/**
 * 计算指数退避延迟：min(cap, base × factor^(attempt−1))，再按 jitter 类型（none/full/equal 等）加随机抖动。
 */
//@ chunk-eabawhjj.js:191-516 placement
function backoffDelayMs({
  attempt: attempt,
  baseMs: baseMs,
  capMs: capMs = 1 / 0,
  factor: factor = 2,
  jitter: jitter = { kind: "none" },
  random: random = Math.random,
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
/**
 * 系统时钟实现：当前时间、单调时间，以及可 unref 的 setTimeout（返回取消函数）。
 */
//@ chunk-eabawhjj.js:516-679 placement
class SystemClock {
  now() {
    return Date.now();
  }
  monotonicNow() {
    return performance.now();
  }
  setTimeout(t, r, e) {
    let o = setTimeout(t, r);
    if (e?.unref) o.unref();
    return () => clearTimeout(o);
  }
}
//@ chunk-eabawhjj.js:679-694 placement
var Aa = new SystemClock();
/**
 * 可被 AbortSignal 中断的 sleep；可选 abort 时抛错或静默返回、unref 定时器。
 */
//@ chunk-eabawhjj.js:694-1079 facade-exports = sleep (0.91)
function sleep(ms, signal, opts) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      if (opts?.throwOnAbort || opts?.abortError) reject(opts.abortError?.() ?? Error("aborted"));
      else resolve();
      return;
    }
    let m = (opts?.clock ?? Aa).setTimeout(
      () => {
        (signal?.removeEventListener("abort", onAbort), resolve());
      },
      ms,
      { unref: opts?.unref },
    );
    function onAbort() {
      if ((m(), opts?.throwOnAbort || opts?.abortError)) reject(opts.abortError?.() ?? Error("aborted"));
      else resolve();
    }
    signal?.addEventListener("abort", onAbort, { once: !0 });
  });
}
//@ chunk-eabawhjj.js:1079-1091 layout
var u = 60000;
//@ chunk-eabawhjj.js:1091-1274 facade-exports
function fullJitterBackoffMs({
  baseMs: baseMs,
  capMs: capMs = u,
  attempt: attempt,
  floorMs: floorMs = 0,
  random: random = Math.random,
}) {
  return Math.floor(
    backoffDelayMs({
      attempt: Math.max(0, attempt) + 1,
      baseMs: baseMs,
      capMs: capMs,
      jitter: { kind: "full", floorMs: floorMs },
      random: random,
    }),
  );
}
//@ chunk-eabawhjj.js:1274-1302 layout
function c(t, r) {
  t(Error(r));
}
//@ chunk-eabawhjj.js:1302-1445 facade-exports = withTimeout (1)
function withTimeout(promise, ms, message) {
  let timer,
    timeoutPromise = new Promise((m, reject) => {
      timer = setTimeout(c, ms, reject, message);
    });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer !== void 0) clearTimeout(timer);
  });
}
//@ chunk-eabawhjj.js:1445-1508 layout
var s = (t, r) => {
  let e = setTimeout(t, r);
  return () => clearTimeout(e);
};
//@ chunk-eabawhjj.js:1508-1623 facade-exports = withTimeout (1)
function withDeadline(promise, ms, message = s) {
  let o = () => {},
    timeoutPromise = new Promise((m) => {
      o = message(() => m(void 0), ms);
    });
  return Promise.race([promise, timeoutPromise]).finally(o);
}
//@ chunk-eabawhjj.js:1623-1889 facade-exports
async function raceWithAbortSignal(t, r, e) {
  let o = () => {
    t.catch(() => {});
  };
  if (r.aborted) throw (o(), e());
  let n = () => {};
  try {
    return await Promise.race([
      t,
      new Promise((m, i) => {
        ((n = () => i(e())), r.addEventListener("abort", n, { once: !0 }));
      }),
    ]);
  } catch (error) {
    throw (o(), error);
  } finally {
    r.removeEventListener("abort", n);
  }
}
/**
 * 等待 promise 或 ms 毫秒超时，二者先到为准；返回 promise 是否在超时前结束（不抛错）。
 */
//@ chunk-82kqcve8.js:187814-187944 placement = withTimeout (1)
async function raceWithTimeout(e, n) {
  let r = createAbortController(),
    s = !1;
  return (
    await Promise.race([
      e
        .catch(() => {})
        .finally(() => {
          ((s = !0), r.abort());
        }),
      sleep(n, r.signal),
    ]),
    s
  );
}
//@ chunk-p7xf186d.js:9239-9387 fingerprint = withTimeout (1)
function withTimeout_2(promise, ms, message) {
  let timer,
    timeoutPromise = new Promise((s, reject) => {
      ((timer = setTimeout(() => reject(message()), ms * 1000)), timer.unref?.());
    });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

export {
  withDeadline,
  sleep,
  backoffDelayMs,
  raceWithAbortSignal,
  Aa,
  withTimeout,
  fullJitterBackoffMs,
  raceWithTimeout,
  SystemClock,
  withTimeout_2,
};
