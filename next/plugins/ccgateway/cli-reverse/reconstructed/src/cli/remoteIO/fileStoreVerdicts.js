/**
 * cli/remoteIO/fileStoreVerdicts.ts
 *
 * 2.1.316 新增。云 worker 文件存储写入裁决的下发。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-m2ade8rx.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createLazySignal, createSignal } from "../../utils/signal.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-m2ade8rx.js:333-363 placement
/**
 * 按宿主懒创建的 rowStaged 信号。
 */
var rowStagedSignal; // deferred: uses remoteIoFileStoreStateHandle of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-m2ade8rx.js:333", () => {
  rowStagedSignal = createLazySignal(() => remoteIoFileStoreStateHandle().rowStaged);
});
//@ chunk-m2ade8rx.js:363-410 placement
function attestationEnforcementState() {
  return remoteIoFileStoreStateHandle().attestationEnforcement;
}
//@ chunk-m2ade8rx.js:410-453 placement
/**
 * 判断当前 attestation 强制级别是否为 not_enforced。
 */
function isAttestationNotEnforced() {
  return attestationEnforcementState() === "not_enforced";
}
//@ chunk-m2ade8rx.js:453-486 placement
var ERROR_NAME_PATTERN = /^[A-Za-z_$][\w$.]{0,63}$/;
//@ chunk-m2ade8rx.js:486-620 placement
/**
 * 取错误的 name（不是 Error 时取 typeof），只接受符合白名单正则的名字，否则或出错时返回 "unnamed"。
 */
function safeErrorName(error) {
  try {
    let kind = error instanceof Error ? error.name : typeof error;
    return typeof kind === "string" && ERROR_NAME_PATTERN.test(kind) ? kind : "unnamed";
  } catch {
    return "unnamed";
  }
}
//@ chunk-m2ade8rx.js:620-750 placement
function nextVerdictDelivery(verdict, previous) {
  if (verdict === undefined) return "deliver";
  if (previous === verdict) return "repeat";
  return verdict === "served" && previous === "refused" ? "deliver" : "out_of_order";
}
//@ chunk-m2ade8rx.js:750-841 placement
function isThenable(value) {
  return typeof value === "object" && value !== null && "then" in value && typeof value.then === "function";
}
//@ chunk-m2ade8rx.js:841-930 placement
function ignoreRejectedPromise(promise, onRejected) {
  if (!isThenable(promise)) return;
  Promise.resolve(promise).catch((error) => {
    try {
      onRejected?.(safeErrorName(error));
    } catch {}
  });
}
//@ chunk-m2ade8rx.js:930-1971 placement
function deliverFileStoreVerdict() {
  let state;
  let listeners = [];
  let closed = false;
  let queue = [];
  let unsubscribe = (listener) => () => {
    listeners = listeners.filter((entry) => entry !== listener);
  };
  let flushOne = (listener, verdict, onRejected) => {
    try {
      ignoreRejectedPromise(listener.listener(verdict, unsubscribe(listener)), onRejected);
      return null;
    } catch (error) {
      return safeErrorName(error);
    }
  };
  let deliverOne = ({ verdict, onRejected }) => {
    state = verdict;
    let snapshot = listeners;
    let index = 0;
    let results = [];
    for (let listener of snapshot) {
      if (!listeners.includes(listener)) continue;
      index++;
      let delivery = flushOne(listener, verdict, onRejected);
      if (delivery !== null) results.push(delivery);
    }
    if (verdict !== "served") listeners = [];
    return {
      listeners: index,
      threw: results,
    };
  };
  let drainThrows = () => {
    let removed = [];
    while (queue.length > 0) removed.push(...deliverOne(queue.shift()).threw);
    return removed;
  };
  return {
    current: () => state,
    subscribe: (listener) => {
      let entry = {
        listener,
      };
      let remove = unsubscribe(entry);
      if (state === undefined) {
        listeners = [...listeners, entry];
        return remove;
      }
      let current = state;
      if (current === "served") listeners = [...listeners, entry];
      let wasClosed = closed;
      closed = true;
      try {
        let cleanup = listener(current, remove);
        if (isThenable(cleanup)) Promise.resolve(cleanup).catch(() => {});
      } catch (error) {
        remove();
        throw error;
      } finally {
        if (!wasClosed) {
          drainThrows();
          closed = false;
        }
      }
      return remove;
    },
    publish: (verdict, onRejected) => {
      let verdict_2 = queue.at(-1)?.verdict ?? state;
      let decision = nextVerdictDelivery(verdict_2, verdict);
      if (decision === "repeat")
        return {
          kind: "repeat",
        };
      if (decision === "out_of_order")
        return {
          kind: "out_of_order",
          basis: verdict_2,
        };
      queue.push({
        verdict,
        onRejected,
      });
      if (closed)
        return {
          kind: "queued",
        };
      closed = true;
      try {
        let pending = deliverOne(queue.shift());
        return {
          kind: "delivered",
          listeners: pending.listeners,
          threw: [...pending.threw, ...drainThrows()],
        };
      } finally {
        queue.length = 0;
        closed = false;
      }
    },
    reset: () => {
      state = undefined;
      listeners = [];
      closed = false;
      queue.length = 0;
    },
  };
}
//@ chunk-m2ade8rx.js:1971-2075 placement
var remoteIOFileStoreState; // deferred: uses deliverFileStoreVerdict of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-m2ade8rx.js:1971", () => {
  remoteIOFileStoreState = new HostScoped(() => ({
    rowStaged: createSignal(),
    streamReconnected: createSignal(),
    attestationEnforcement: "unknown",
    verdict: deliverFileStoreVerdict(),
  }));
});
//@ chunk-m2ade8rx.js:2075-2110 placement
function remoteIoFileStoreStateHandle() {
  return remoteIOFileStoreState.of(getRootSession().host);
}
//@ chunk-m2ade8rx.js:2110-2245 placement
/**
 * 发布文件存储裁决（verdict）到宿主状态，供订阅方读取。
 */
var fileStoreVerdictChannel; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var publishFileStoreVerdict;
deferInit("chunk-m2ade8rx.js:2110", () => {
  fileStoreVerdictChannel = Object.freeze({
    current: () => remoteIoFileStoreStateHandle().verdict.current(),
    subscribe: (listener) => remoteIoFileStoreStateHandle().verdict.subscribe(listener),
  });
  publishFileStoreVerdict = (verdict, onRejected) =>
    remoteIoFileStoreStateHandle().verdict.publish(verdict, onRejected);
});
export {
  safeErrorName,
  isAttestationNotEnforced,
  fileStoreVerdictChannel,
  publishFileStoreVerdict,
  rowStagedSignal,
};
