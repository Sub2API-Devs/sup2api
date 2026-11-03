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
import { Znt } from "../historyFile.js";
import { ge } from "../identity.js";
import { pu } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { isAbortError } from "../errors.js";
import { logForDebugging } from "../debug.js";
import { logError } from "../log.js";
import { registerCleanup, isCleanupStarted } from "../cleanupRegistry.js";

/**
 * 队列记录的文本：提交过的取提交文本，否则在不被钩子观察时取原值。
 */
//@ chunk-e6aww6q8.js:548224-548377 placement
function queueRecordText(e) {
  let { promptSubmitted: promptSubmitted, value: r } = e,
    s = e.mode === "prompt" && isPromptHookObserved("queue-record"),
    h = typeof r === "string" && !Znt(e) && !s;
  return promptSubmitted?.text ?? (h ? r : void 0);
}
//@ chunk-e6aww6q8.js:548377-548410 placement
var y0 = ge(pu(), (e) => e.set(null));
//@ chunk-e6aww6q8.js:548410-548489 placement
function kXs(e) {
  let n = () => {
    if (y0.get() === e) y0.set(null);
  };
  (y0.set(e), e.then(n, n));
}
//@ chunk-e6aww6q8.js:548489-548523 placement
var FKr = ge(pu(), (e) => e.set(null));
//@ chunk-e6aww6q8.js:548523-548536 placement
var RIt = 1000;
//@ chunk-e6aww6q8.js:548536-548676 placement
function logQueueRecordError(e) {
  try {
    if (isAbortError(e)) {
      logForDebugging("A queue record's chain was aborted");
      return;
    }
    logError(e);
  } catch {
    logForDebugging("A queue record failed with an unreadable error");
  }
}
/**
 * 创建队列记录写入器：需经钩子改写的记录按序等待（最多 1 秒），之后按原顺序写出。
 */
//@ chunk-e6aww6q8.js:548676-549847 placement
function createQueueRecorder(e) {
  let n = [],
    r = new Map(),
    s = new Map(),
    h = !1,
    y = !1;
  function S() {
    let Se = n[0];
    while (Se !== void 0 && !r.has(Se) && !s.has(Se)) {
      n.shift();
      try {
        e(Se);
      } catch (error) {
        logQueueRecordError(error);
      }
      Se = n[0];
    }
  }
  function w(Se) {
    let ke = y0.get(),
      we = ke === null || ke === Se;
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
    if (we === void 0) return;
    (clearTimeout(we), r.delete(Se), (n[n.indexOf(Se)] = ke), w());
  }
  function G() {
    y = !0;
    for (let Se of r.values()) clearTimeout(Se);
    (r.clear(), s.clear(), S());
  }
  function q() {
    if (!h) ((h = !0), registerCleanup(G));
  }
  function Z(Se, ke, we) {
    let Ee = FKr.get()?.(ke, we);
    if (Ee === void 0) return !1;
    return (
      q(),
      r.set(Se, setTimeout(L, RIt, Se, Se).unref()),
      Promise.resolve(Ee).then(
        (Ae) => {
          if (typeof Ae === "string") {
            L(Se, { ...Se, content: Ae });
            return;
          }
          (logQueueRecordError(Error("A queue record came back from its hooks no text")), L(Se, Se));
        },
        (Ae) => {
          (logQueueRecordError(Ae), L(Se, Se));
        },
      ),
      !0
    );
  }
  return (Se, ke) => {
    let { content: content } = Se,
      Ee = typeof content === "string" && !y && !isCleanupStarted(),
      Ae = y0.get();
    if (Ee && (Ae !== null || s.size > 0)) {
      if ((n.push(Se), s.set(Se, () => Z(Se, content, ke)), q(), Ae !== null && s.size === 1))
        Ae.then(
          () => w(Ae),
          () => w(Ae),
        );
      return;
    }
    let Ie = !1;
    try {
      Ie = Ee && Z(Se, content, ke);
    } catch (error) {
      (logQueueRecordError(error), n.push(Se), S());
      return;
    }
    if (!Ie && n.length === 0) {
      e(Se);
      return;
    }
    n.push(Se);
  };
}

export { createQueueRecorder, queueRecordText, FKr, kXs };
