/**
 * utils/messageQueue/queueRecords.ts
 *
 * 2.1.316 新增：消息队列记录
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isPromptHookObserved } from "../telemetry/sessionTracing.js";
import { isScreeningPendingEntry } from "../historyFile.js";
import { identity as identity_2 } from "../identity.js";
import { subscribe } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { isAbortError } from "../errors.js";
import { logForDebugging } from "../debug.js";
import { logError } from "../log.js";
import { registerCleanup, isCleanupStarted } from "../cleanupRegistry.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:554977-555130 placement
/**
 * 队列记录的文本：提交过的取提交文本，否则在不被钩子观察时取原值。
 */
function queueRecordText(record) {
  let { promptSubmitted, value: contentValue } = record;
  let hookObserved = record.mode === "prompt" && isPromptHookObserved("queue-record");
  let plainContent = typeof contentValue === "string" && !isScreeningPendingEntry(record) && !hookObserved;
  return promptSubmitted?.text ?? (plainContent ? contentValue : undefined);
}
//@ chunk-5xgkngpb.js:555130-555163 placement
var currentQueueRecordChain; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:555130", () => {
  currentQueueRecordChain = identity_2(subscribe(), (store) => store.set(null));
});
//@ chunk-5xgkngpb.js:555163-555242 placement
/**
 * 登记队列记录链并在完成（成功或失败）后自动清除。
 */
function trackQueueRecordChain(chain) {
  let clearIfCurrent = () => {
    if (currentQueueRecordChain.get() === chain) currentQueueRecordChain.set(null);
  };
  currentQueueRecordChain.set(chain);
  chain.then(clearIfCurrent, clearIfCurrent);
}
//@ chunk-5xgkngpb.js:555242-555276 placement
/**
 * 宿主隔离的队列记录文本构造器存储。
 */
var queueRecordTextBuilder; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:555242", () => {
  queueRecordTextBuilder = identity_2(subscribe(), (store) => store.set(null));
});
//@ chunk-5xgkngpb.js:555276-555289 placement
var RECORD_VISIBILITY_TTL_MS = 1000;
//@ chunk-5xgkngpb.js:555289-555429 placement
function logQueueRecordError(error) {
  try {
    if (isAbortError(error)) {
      logForDebugging("A queue record's chain was aborted");
      return;
    }
    logError(error);
  } catch {
    logForDebugging("A queue record failed with an unreadable error");
  }
}
//@ chunk-5xgkngpb.js:555429-556603 placement
/**
 * 创建队列记录写入器：需经钩子改写的记录按序等待（最多 1 秒），之后按原顺序写出。
 */
function createQueueRecorder(recordQueueOperation) {
  let pending = [];
  let visibilityTimers = new Map();
  let deferredHooks = new Map();
  let cleanupRegistered = false;
  let stopped = false;
  function flushPending() {
    let head = pending[0];
    while (head !== undefined && !visibilityTimers.has(head) && !deferredHooks.has(head)) {
      pending.shift();
      try {
        recordQueueOperation(head);
      } catch (error) {
        logQueueRecordError(error);
      }
      head = pending[0];
    }
  }
  function releaseChain(chain) {
    let currentChain = currentQueueRecordChain.get();
    let shouldRelease = currentChain === null || currentChain === chain;
    for (let [id, runHook] of shouldRelease ? deferredHooks : []) {
      deferredHooks.delete(id);
      try {
        if (runHook()) break;
      } catch (error) {
        logQueueRecordError(error);
      }
    }
    flushPending();
  }
  function releaseAfterVisibility(id, finalRecord) {
    let timer = visibilityTimers.get(id);
    if (timer === undefined) return;
    clearTimeout(timer);
    visibilityTimers.delete(id);
    pending[pending.indexOf(id)] = finalRecord;
    releaseChain();
  }
  function stop() {
    stopped = true;
    for (let timer of visibilityTimers.values()) clearTimeout(timer);
    visibilityTimers.clear();
    deferredHooks.clear();
    flushPending();
  }
  function ensureCleanup() {
    if (!cleanupRegistered) {
      cleanupRegistered = true;
      registerCleanup(stop);
    }
  }
  function startTextHooks(record, content, context) {
    let hookText = queueRecordTextBuilder.get()?.(content, context);
    if (hookText === undefined) return false;
    ensureCleanup();
    visibilityTimers.set(
      record,
      setTimeout(releaseAfterVisibility, RECORD_VISIBILITY_TTL_MS, record, record).unref(),
    );
    Promise.resolve(hookText).then(
      (text) => {
        if (typeof text === "string") {
          releaseAfterVisibility(record, {
            ...record,
            content: text,
          });
          return;
        }
        logQueueRecordError(Error("A queue record came back from its hooks no text"));
        releaseAfterVisibility(record, record);
      },
      (error) => {
        logQueueRecordError(error);
        releaseAfterVisibility(record, record);
      },
    );
    return true;
  }
  return (record, context) => {
    let { content } = record;
    let canDefer = typeof content === "string" && !stopped && !isCleanupStarted();
    let currentChain = currentQueueRecordChain.get();
    if (canDefer && (currentChain !== null || deferredHooks.size > 0)) {
      pending.push(record);
      deferredHooks.set(record, () => startTextHooks(record, content, context));
      ensureCleanup();
      if (currentChain !== null && deferredHooks.size === 1)
        currentChain.then(
          () => releaseChain(currentChain),
          () => releaseChain(currentChain),
        );
      return;
    }
    let deferred = false;
    try {
      deferred = canDefer && startTextHooks(record, content, context);
    } catch (error) {
      logQueueRecordError(error);
      pending.push(record);
      flushPending();
      return;
    }
    if (!deferred && pending.length === 0) {
      recordQueueOperation(record);
      return;
    }
    pending.push(record);
  };
}
export { createQueueRecorder, queueRecordText, queueRecordTextBuilder, trackQueueRecordChain };
