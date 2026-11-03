/**
 * utils/messageQueueIdle.ts
 *
 * 2.1.316 新增：生成"队列是否忙"判断函数。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2jaaccg7.js (3)
 * attribution: placement 3
 */
import { $f } from "./messageQueueManager.js";
import { mki } from "./messageProvenance.js";

/**
 * 生成"队列是否忙"判断函数。
 */
//@ chunk-2jaaccg7.js:264-606 placement
function createQueueBusyCheck(e, n, t) {
  return () => {
    if (t?.aborted === !0) return;
    let a = n();
    return e.getCommandQueueSnapshot().some(isBusyCommand) ||
      e.someSubmissionInFlight((r) => s(r, a)) ||
      (t === void 0
        ? e.getInFlightDrainBatchStanding() !== "appended" && e.someInFlightDrainCommand((r) => s(r, a))
        : e.getInFlightDrainBatchStanding() === "passed-over" && e.someInFlightDrainCommand(isBusyCommand))
      ? void 0
      : a;
  };
}
//@ chunk-2jaaccg7.js:606-696 placement
function s(e, n) {
  return isBusyCommand(e) && (e.uuid === void 0 || n.findLast((t) => t.uuid === e.uuid) === void 0);
}
//@ chunk-2jaaccg7.js:696-973 placement
function isBusyCommand(e) {
  if (!$f(e)) return !1;
  switch (e.mode) {
    case "task-notification":
      return !1;
    case "poll-event": {
      let n = e.pollEvent?.provenance?.authority;
      return n !== void 0 && n !== "peer-agent" && n !== "world-event";
    }
    case "prompt":
    case "bash":
      return mki(e);
    case "orphaned-permission":
      return !0;
  }
  return !0;
}

export { createQueueBusyCheck };
