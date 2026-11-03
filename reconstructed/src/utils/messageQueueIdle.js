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
import { isMainAgentCommand } from "./messageQueueManager.js";
import { needsDirectDelivery } from "./messageProvenance.js";

//@ chunk-2jaaccg7.js:264-606 placement
/**
 * 生成"队列是否忙"判断函数。
 */
function createQueueBusyCheck(messageQueue, n, signal) {
  return () => {
    if (signal?.aborted === true) return;
    let a = n();
    return messageQueue.getCommandQueueSnapshot().some(isBusyCommand) ||
      messageQueue.someSubmissionInFlight((r) => isPendingBusyCommand(r, a)) ||
      (signal === undefined
        ? messageQueue.getInFlightDrainBatchStanding() !== "appended" &&
          messageQueue.someInFlightDrainCommand((r) => isPendingBusyCommand(r, a))
        : messageQueue.getInFlightDrainBatchStanding() === "passed-over" &&
          messageQueue.someInFlightDrainCommand(isBusyCommand))
      ? undefined
      : a;
  };
}
//@ chunk-2jaaccg7.js:606-696 placement
function isPendingBusyCommand(e, n) {
  return isBusyCommand(e) && (e.uuid === undefined || n.findLast((t) => t.uuid === e.uuid) === undefined);
}
//@ chunk-2jaaccg7.js:696-973 placement
function isBusyCommand(e) {
  if (!isMainAgentCommand(e)) return false;
  switch (e.mode) {
    case "task-notification":
      return false;
    case "poll-event": {
      let authority = e.pollEvent?.provenance?.authority;
      return authority !== undefined && authority !== "peer-agent" && authority !== "world-event";
    }
    case "prompt":
    case "bash":
      return needsDirectDelivery(e);
    case "orphaned-permission":
      return true;
  }
  return true;
}
export { createQueueBusyCheck };
