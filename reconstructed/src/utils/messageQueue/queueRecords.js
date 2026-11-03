/**
 * utils/messageQueue/queueRecords.ts
 *
 * 2.1.316 新增：消息队列记录
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (7)
 * attribution: placement 7
 */
import { isPromptHookObserved } from "../telemetry/sessionTracing.js";
import { isScreeningPendingEntry } from "../historyFile.js";
import { identity as identity_2 } from "../identity.js";
import { pu } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { isAbortError } from "../errors.js";
import { logForDebugging } from "../debug.js";
import { logError } from "../log.js";
import { registerCleanup, isCleanupStarted } from "../cleanupRegistry.js";

//@ chunk-e6aww6q8.js:548224-548377 placement
/**
 * 队列记录的文本：提交过的取提交文本，否则在不被钩子观察时取原值。
 */
function queueRecordText(e) {
  let { promptSubmitted, value: r } = e;
  let s = e.mode === "prompt" && isPromptHookObserved("queue-record");
  let h = typeof r === "string" && !isScreeningPendingEntry(e) && !s;
  return promptSubmitted?.text ?? (h ? r : undefined);
}
//@ chunk-e6aww6q8.js:548377-548410 placement
var currentQueueRecordChain = identity_2(pu(), (e) => e.set(null));
//@ chunk-e6aww6q8.js:548410-548489 placement
/**
 * 登记队列记录链并在完成（成功或失败）后自动清除。
 */
function trackQueueRecordChain(e) {
  let n = () => {
    if (currentQueueRecordChain.get() === e) currentQueueRecordChain.set(null);
  };
  currentQueueRecordChain.set(e);
  e.then(n, n);
}
//@ chunk-e6aww6q8.js:548489-548523 placement
/**
 * 宿主隔离的队列记录文本构造器存储。
 */
var queueRecordTextBuilder = identity_2(pu(), (e) => e.set(null));
//@ chunk-e6aww6q8.js:548523-548536 placement
var RECORD_VISIBILITY_TTL_MS = 1000;
//@ chunk-e6aww6q8.js:548536-548676 placement
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
//@ chunk-e6aww6q8.js:548676-549847 placement
/**
 * 创建队列记录写入器：需经钩子改写的记录按序等待（最多 1 秒），之后按原顺序写出。
 */
function createQueueRecorder(recordQueueOperation) {
  let n = [];
  let r = new Map();
  let s = new Map();
  let h = false;
  let y = false;
  function S() {
    let Se = n[0];
    while (Se !== undefined && !r.has(Se) && !s.has(Se)) {
      n.shift();
      try {
        recordQueueOperation(Se);
      } catch (error) {
        logQueueRecordError(error);
      }
      Se = n[0];
    }
  }
  function w(Se) {
    let ke = currentQueueRecordChain.get();
    let we = ke === null || ke === Se;
    for (let [Ee, Ae] of we ? s : []) {
      s.delete(Ee);
      try {
        if (Ae()) break;
      } catch (error) {
        logQueueRecordError(error);
      }
    }
    S();
  }
  function L(Se, ke) {
    let we = r.get(Se);
    if (we === undefined) return;
    clearTimeout(we);
    r.delete(Se);
    n[n.indexOf(Se)] = ke;
    w();
  }
  function G() {
    y = true;
    for (let Se of r.values()) clearTimeout(Se);
    r.clear();
    s.clear();
    S();
  }
  function q() {
    if (!h) {
      h = true;
      registerCleanup(G);
    }
  }
  function Z(Se, content, we) {
    let Ee = queueRecordTextBuilder.get()?.(content, we);
    if (Ee === undefined) return false;
    q();
    r.set(Se, setTimeout(L, RECORD_VISIBILITY_TTL_MS, Se, Se).unref());
    Promise.resolve(Ee).then(
      (Ae) => {
        if (typeof Ae === "string") {
          L(Se, {
            ...Se,
            content: Ae,
          });
          return;
        }
        logQueueRecordError(Error("A queue record came back from its hooks no text"));
        L(Se, Se);
      },
      (error) => {
        logQueueRecordError(error);
        L(Se, Se);
      },
    );
    return true;
  }
  return (Se, ke) => {
    let { content } = Se;
    let Ee = typeof content === "string" && !y && !isCleanupStarted();
    let Ae = currentQueueRecordChain.get();
    if (Ee && (Ae !== null || s.size > 0)) {
      n.push(Se);
      s.set(Se, () => Z(Se, content, ke));
      q();
      if (Ae !== null && s.size === 1)
        Ae.then(
          () => w(Ae),
          () => w(Ae),
        );
      return;
    }
    let Ie = false;
    try {
      Ie = Ee && Z(Se, content, ke);
    } catch (error) {
      logQueueRecordError(error);
      n.push(Se);
      S();
      return;
    }
    if (!Ie && n.length === 0) {
      recordQueueOperation(Se);
      return;
    }
    n.push(Se);
  };
}
export { createQueueRecorder, queueRecordText, queueRecordTextBuilder, trackQueueRecordChain };
