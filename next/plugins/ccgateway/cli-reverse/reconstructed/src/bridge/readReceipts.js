/**
 * bridge/readReceipts.ts
 *
 * 2.1.316 新增：Remote Control 已读回执。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f25sswmp.js (21)
 * attribution: placement 21
 */
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { wrapCommandLifecycle } from "./inboundMessageOrigin.js";
import { onProcessRootHost } from "../bootstrap/state.js";
import { BRIDGE_HOST_STATE_SLOT } from "./bridgeHostState.js";
import { MAX_VALIDATED_IMAGES } from "../utils/messages/accountMemory.js";
import { logError } from "../utils/log.js";

//@ chunk-f25sswmp.js:8771-8919 placement
function bindReadReceiptSession(reporter) {
  let receiptState = readReceiptState();
  if (receiptState.sessionId !== undefined && receiptState.sessionId !== reporter.sessionId) {
    receiptState.held.clear();
    receiptState.settled.length = 0;
  }
  receiptState.sessionId = reporter.sessionId;
  receiptState.reporter = reporter;
}
//@ chunk-f25sswmp.js:8919-8988 placement
/**
 * 释放已读回执的所有权：reporter 仍是该 owner 时清空。
 */
function releaseReadReceiptOwnership(owner) {
  let receiptState = readReceiptState();
  if (receiptState.reporter?.owner === owner) receiptState.reporter = undefined;
}
//@ chunk-f25sswmp.js:8988-9252 placement
/**
 * 处理消息期间认领已读回执，结束后结算。
 */
function withReadReceiptClaim(eventId, run) {
  let eventId_2 = eventId.toLowerCase();
  let { held, settled } = readReceiptState();
  if (!held.has(eventId_2))
    held.set(eventId_2, {
      phase: "claimed",
      withheld: false,
    });
  let index = settled.indexOf(eventId_2);
  if (index !== -1) settled.splice(index, 1);
  let result;
  try {
    result = run();
  } catch (error) {
    settleIfClaimed(eventId_2);
    throw error;
  }
  if (result instanceof Promise) return result.finally(() => settleIfClaimed(eventId_2));
  settleIfClaimed(eventId_2);
  return result;
}
//@ chunk-f25sswmp.js:9252-9351 placement
/**
 * 把某条已读回执标记为 withheld（暂不发送），不存在时返回 false。
 */
function withholdHeldReceipt(eventId) {
  let heldReceipt = readReceiptState().held.get(eventId.toLowerCase());
  if (heldReceipt === undefined) return false;
  heldReceipt.withheld = true;
  return true;
}
//@ chunk-f25sswmp.js:9351-9403 placement
function isReceiptHeld(eventId) {
  return readReceiptState().held.has(eventId.toLowerCase());
}
//@ chunk-f25sswmp.js:9403-9463 placement
function isReceiptSettled(eventId) {
  return readReceiptState().settled.includes(eventId.toLowerCase());
}
//@ chunk-f25sswmp.js:9463-9544 placement
function isRedeliveredAfterStart(event) {
  return event.payload.type === "user" && typeof event.processing_at === "string";
}
//@ chunk-f25sswmp.js:9544-9748 placement
/**
 * 事件是否为重投（处理中、已结算、启动后）。
 */
function redeliveryKind(event) {
  let kind = false;
  if (isReceiptHeld(event.event_id)) kind = "redelivered_in_flight";
  else if (isReceiptSettled(event.event_id)) kind = "redelivered_settled";
  else if (isRedeliveredAfterStart(event)) kind = "redelivered_after_start";
  if (kind !== false) logFeatureSad("bridge_read_receipt", kind);
  return kind;
}
//@ chunk-f25sswmp.js:9748-9878 placement
/**
 * 把回执标记为已排队。
 */
function markReceiptQueued(uuid) {
  withReadReceiptTelemetry("queued_note_threw", () => {
    let heldReceipt = uuid === undefined ? undefined : readReceiptState().held.get(uuid.toLowerCase());
    if (heldReceipt !== undefined) heldReceipt.phase = "queued";
  });
}
//@ chunk-f25sswmp.js:9878-9989 placement
function settleIfClaimed(eventId) {
  withReadReceiptTelemetry("settle_threw", () => {
    let receiptId = eventId.toLowerCase();
    let heldReceipt = readReceiptState().held.get(receiptId);
    if (heldReceipt?.phase === "claimed") settleReceipt(receiptId, heldReceipt);
  });
}
//@ chunk-f25sswmp.js:9989-10108 placement
function settleUnlessRead(eventId) {
  withReadReceiptTelemetry("settle_threw", () => {
    let receiptId = eventId.toLowerCase();
    let heldReceipt = readReceiptState().held.get(receiptId);
    if (heldReceipt !== undefined && heldReceipt.phase !== "read") settleReceipt(receiptId, heldReceipt);
  });
}
//@ chunk-f25sswmp.js:10108-10164 placement
/**
 * 按消息 uuid 结算回执：对每条带 uuid 的消息触发 settleUnlessRead。
 */
function settleReceiptsForMessages(messages) {
  for (let { uuid } of messages) if (uuid !== undefined) settleUnlessRead(uuid);
}
//@ chunk-f25sswmp.js:10164-10443 placement
/**
 * Remote Control：模型开始处理排队的远程消息时，向桥发送 bridge_read_receipt（read → processing → processed）。
 */
function markMessagesRead(messages) {
  withReadReceiptTelemetry("read_note_threw", () => {
    let { held } = readReceiptState();
    if (held.size === 0) return;
    for (let { uuid } of messages) {
      let lower = uuid?.toLowerCase();
      let heldReceipt = lower === undefined ? undefined : held.get(lower);
      if (lower === undefined || heldReceipt === undefined || heldReceipt.phase === "read") continue;
      heldReceipt.phase = "read";
      if (heldReceipt.withheld) {
        reportReceiptPhase(lower, "processing");
        logFeatureOk("bridge_read_receipt");
      }
    }
  });
}
//@ chunk-f25sswmp.js:10443-10534 placement
/**
 * 重发保留中且仍处于 read 阶段的回执。
 */
function settleHeldReadReceipts() {
  withReadReceiptTelemetry("settle_threw", () => {
    for (let [receiptId, receipt] of readReceiptState().held)
      if (receipt.phase === "read") settleReceipt(receiptId, receipt);
  });
}
//@ chunk-f25sswmp.js:10534-10698 placement
/**
 * 重发保留中与已结算的回执状态。
 */
function resendReceipts() {
  withReadReceiptTelemetry("resend_threw", () => {
    let { held, settled } = readReceiptState();
    for (let [receiptId, receipt] of held)
      if (receipt.phase === "read" && receipt.withheld) reportReceiptPhase(receiptId, "processing");
    for (let receiptId of settled) reportReceiptPhase(receiptId, "processed");
  });
}
//@ chunk-f25sswmp.js:10698-10770 placement
/**
 * 回合结束时的回执结算：cancelled/refused 时结算未读回执。
 */
function settleOnTurnFinish(lifecycle) {
  wrapCommandLifecycle(lifecycle, (commandId, outcome) => {
    if (outcome === "cancelled" || outcome === "refused") settleUnlessRead(commandId);
  });
}
//@ chunk-f25sswmp.js:10770-10818 placement
function readReceiptState() {
  return onProcessRootHost(BRIDGE_HOST_STATE_SLOT).inboundReadReceipts;
}
//@ chunk-f25sswmp.js:10818-10947 placement
function settleReceipt(receiptId, receipt) {
  let { held, settled } = readReceiptState();
  held.delete(receiptId);
  if (!receipt.withheld) return;
  settled.push(receiptId);
  if (settled.length > MAX_VALIDATED_IMAGES) settled.shift();
  reportReceiptPhase(receiptId, "processed");
}
//@ chunk-f25sswmp.js:10947-11013 placement
function reportReceiptPhase(receiptId, phase) {
  withReadReceiptTelemetry("report_threw", () => {
    readReceiptState().reporter?.report(receiptId, phase);
  });
}
//@ chunk-f25sswmp.js:11013-11079 placement
function withReadReceiptTelemetry(eventName, fn) {
  try {
    fn();
  } catch (error) {
    logFeatureBad("bridge_read_receipt", eventName);
    logError(error);
  }
}
//@ chunk-f25sswmp.js:11079-11201 placement
/**
 * 保存原始 JSON 字符串、序列化时原样输出。
 */
class RawJson {
  #e;
  constructor(json) {
    this.#e = json;
  }
  static of(value) {
    return new RawJson(JSON.stringify(value));
  }
  toJSON() {
    return JSON.parse(this.#e);
  }
}
export {
  markReceiptQueued,
  settleReceiptsForMessages,
  settleOnTurnFinish,
  markMessagesRead,
  releaseReadReceiptOwnership,
  bindReadReceiptSession,
  resendReceipts,
  withReadReceiptClaim,
  settleHeldReadReceipts,
  RawJson,
  withholdHeldReceipt,
  redeliveryKind,
};
