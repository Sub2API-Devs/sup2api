/**
 * utils/keyedSemaphore.ts
 *
 * 2.1.316 新增：按键分组的计数信号量（立即占位或排队，可被 signal 中止），以及带等待上限与回调的 acquire 包装。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logForDebugging } from "./debug.js";
import { createCombinedAbortSignal } from "./combinedAbortSignal.js";

//@ chunk-5xgkngpb.js:2209845-2210718 placement
/**
 * 按键分组的计数信号量：acquire 在未满且无排队时立即占位，否则排队等待（可被 signal 中止，中止返回 undefined）；wouldWait 判断是否需要等待；occupy 强制占位；释放时按排队顺序放行。
 */
class KeyedSemaphore {
  #e = new Map();
  acquire(key, limit, signal) {
    let slot = this.#n(key);
    let release = () => {
      slot.active -= 1;
      this.#t(slot);
    };
    if (signal.aborted) return Promise.resolve(undefined);
    if (slot.active < limit && slot.waiters.length === 0) {
      slot.active += 1;
      return Promise.resolve(release);
    }
    return new Promise((resolve) => {
      let waiter = {
        limit,
        signal,
        grant: () => {
          signal.removeEventListener("abort", onAbort);
          resolve(release);
        },
        cancel: () => resolve(undefined),
      };
      let onAbort = () => {
        let index = slot.waiters.indexOf(waiter);
        if (index !== -1) slot.waiters.splice(index, 1);
        resolve(undefined);
        this.#t(slot);
      };
      slot.waiters.push(waiter);
      signal.addEventListener("abort", onAbort, {
        once: true,
      });
      this.#t(slot);
    });
  }
  wouldWait(key, limit) {
    let slot = this.#n(key);
    return slot.active >= limit || slot.waiters.length > 0;
  }
  occupy(key) {
    let slot = this.#n(key);
    slot.active += 1;
    return () => {
      slot.active -= 1;
      this.#t(slot);
    };
  }
  #t(slot) {
    while (slot.waiters.length > 0 && slot.active < slot.waiters[0].limit) {
      let waiter = slot.waiters.shift();
      if (waiter.signal.aborted) {
        waiter.cancel();
        continue;
      }
      slot.active += 1;
      waiter.grant();
    }
  }
  #n(key) {
    let existingSlot = this.#e.get(key);
    if (existingSlot) return existingSlot;
    let slot = {
      active: 0,
      waiters: [],
    };
    this.#e.set(key, slot);
    return slot;
  }
}
//@ chunk-5xgkngpb.js:2210814-2211118 placement
/**
 * 带等待上限地向信号量申请位置：需要等待时先回调 onWait；超时仍返回句柄但 seated 为 false，外部中止则返回 undefined；句柄可 release、retake，并支持 using 释放。
 */
async function acquireSeat(semaphore, key, limit, signal, { waitLimitMs, onWait }) {
  if (semaphore.wouldWait(key, limit)) onWait?.();
  let combinedAbortSignal = createCombinedAbortSignal(signal, {
    timeoutMs: waitLimitMs,
    refTimer: true,
  });
  let release = await semaphore.acquire(key, limit, combinedAbortSignal.signal);
  combinedAbortSignal.cleanup();
  if (release === undefined && signal.aborted) return;
  let releaseSeat = () => {
    release?.();
    release = undefined;
  };
  return {
    seated: release !== undefined,
    release: releaseSeat,
    retake: () => {
      release ??= semaphore.occupy(key);
    },
    [Symbol.dispose]: releaseSeat,
  };
}
export { KeyedSemaphore, acquireSeat };
