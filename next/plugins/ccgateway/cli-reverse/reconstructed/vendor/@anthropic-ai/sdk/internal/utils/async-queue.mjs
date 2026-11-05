/**
 * @anthropic-ai/sdk/internal/utils/async-queue.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __classPrivateFieldGet, __classPrivateFieldSet } from "../tslib.mjs";

//@ chunk-vn3g7zt8.js:60186-61066 esm-layout
var _AsyncQueue_items;
var _AsyncQueue_waiters;
var _AsyncQueue_closed;
var AsyncQueue = (() => {
  class AsyncQueue {
    constructor() {
      _AsyncQueue_items.set(this, []);
      _AsyncQueue_waiters.set(this, []);
      _AsyncQueue_closed.set(this, false);
    }
    push(item) {
      if (__classPrivateFieldGet(this, _AsyncQueue_closed, "f")) return false;
      let w = __classPrivateFieldGet(this, _AsyncQueue_waiters, "f").shift();
      if (w)
        w({
          done: false,
          value: item,
        });
      else __classPrivateFieldGet(this, _AsyncQueue_items, "f").push(item);
      return true;
    }
    close() {
      if (__classPrivateFieldGet(this, _AsyncQueue_closed, "f")) return;
      __classPrivateFieldSet(this, _AsyncQueue_closed, true, "f");
      while (__classPrivateFieldGet(this, _AsyncQueue_waiters, "f").length > 0)
        __classPrivateFieldGet(this, _AsyncQueue_waiters, "f").shift()({
          done: true,
          value: undefined,
        });
    }
    next(signal) {
      if (__classPrivateFieldGet(this, _AsyncQueue_items, "f").length > 0)
        return Promise.resolve({
          done: false,
          value: __classPrivateFieldGet(this, _AsyncQueue_items, "f").shift(),
        });
      if (__classPrivateFieldGet(this, _AsyncQueue_closed, "f") || signal?.aborted)
        return Promise.resolve({
          done: true,
          value: undefined,
        });
      return new Promise((resolve) => {
        let waiter = (r) => {
          signal?.removeEventListener("abort", onAbort);
          resolve(r);
        };
        let onAbort = () => {
          let idx = __classPrivateFieldGet(this, _AsyncQueue_waiters, "f").indexOf(waiter);
          if (idx >= 0) __classPrivateFieldGet(this, _AsyncQueue_waiters, "f").splice(idx, 1);
          resolve({
            done: true,
            value: undefined,
          });
        };
        __classPrivateFieldGet(this, _AsyncQueue_waiters, "f").push(waiter);
        signal?.addEventListener("abort", onAbort, {
          once: true,
        });
      });
    }
    tryShift() {
      return __classPrivateFieldGet(this, _AsyncQueue_items, "f").shift();
    }
  }
  _AsyncQueue_items = new WeakMap();
  _AsyncQueue_waiters = new WeakMap();
  _AsyncQueue_closed = new WeakMap();
  return AsyncQueue;
})();
export { AsyncQueue };
