/**
 * utils/keyedSemaphore.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
import { logForDebugging } from "./debug.js";
import { createCombinedAbortSignal } from "./combinedAbortSignal.js";

/**
 * 按键分组的计数信号量：acquire 在未满且无排队时立即占位，否则排队等待（可被 signal 中止，中止返回 undefined）；wouldWait 判断是否需要等待；occupy 强制占位；释放时按排队顺序放行。
 */
//@ chunk-e6aww6q8.js:2156416-2157289 placement
class KeyedSemaphore {
  #e = new Map();
  acquire(key, limit, signal) {
    let slot = this.#n(key),
      release = () => {
        ((slot.active -= 1), this.#t(slot));
      };
    if (signal.aborted) return Promise.resolve(void 0);
    if (slot.active < limit && slot.waiters.length === 0)
      return ((slot.active += 1), Promise.resolve(release));
    return new Promise((resolve) => {
      let waiter = {
          limit: limit,
          signal: signal,
          grant: () => {
            (signal.removeEventListener("abort", onAbort), resolve(release));
          },
          cancel: () => resolve(void 0),
        },
        onAbort = () => {
          let index = slot.waiters.indexOf(waiter);
          if (index !== -1) slot.waiters.splice(index, 1);
          (resolve(void 0), this.#t(slot));
        };
      (slot.waiters.push(waiter), signal.addEventListener("abort", onAbort, { once: !0 }), this.#t(slot));
    });
  }
  wouldWait(e, n) {
    let r = this.#n(e);
    return r.active >= n || r.waiters.length > 0;
  }
  occupy(e) {
    let n = this.#n(e);
    return (
      (n.active += 1),
      () => {
        ((n.active -= 1), this.#t(n));
      }
    );
  }
  #t(e) {
    while (e.waiters.length > 0 && e.active < e.waiters[0].limit) {
      let n = e.waiters.shift();
      if (n.signal.aborted) {
        n.cancel();
        continue;
      }
      ((e.active += 1), n.grant());
    }
  }
  #n(e) {
    let n = this.#e.get(e);
    if (n) return n;
    let r = { active: 0, waiters: [] };
    return (this.#e.set(e, r), r);
  }
}
/**
 * 带等待上限地向信号量申请位置：需要等待时先回调 onWait；超时仍返回句柄但 seated 为 false，外部中止则返回 undefined；句柄可 release、retake，并支持 using 释放。
 */
//@ chunk-e6aww6q8.js:2157385-2157689 placement
async function acquireSeat(semaphore, key, limit, signal, { waitLimitMs: waitLimitMs, onWait: onWait }) {
  if (semaphore.wouldWait(key, limit)) onWait?.();
  let S = createCombinedAbortSignal(signal, { timeoutMs: waitLimitMs, refTimer: !0 }),
    acquire = await semaphore.acquire(key, limit, S.signal);
  if ((S.cleanup(), acquire === void 0 && signal.aborted)) return;
  let L = () => {
    (acquire?.(), (acquire = void 0));
  };
  return {
    seated: acquire !== void 0,
    release: L,
    retake: () => {
      acquire ??= semaphore.occupy(key);
    },
    [Symbol.dispose]: L,
  };
}

export { KeyedSemaphore, acquireSeat };
