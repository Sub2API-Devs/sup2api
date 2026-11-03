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
import { rPe } from "./inboundMessageOrigin.js";
import { onProcessRootHost } from "../bootstrap/state.js";
import { t_s } from "./bridgeHostState.js";
import { et } from "../utils/messages/accountMemory.js";
import { logError } from "../utils/log.js";

//@ chunk-f25sswmp.js:8771-8919 placement
function bindReadReceiptSession(e) {
  let n = P();
  if (n.sessionId !== void 0 && n.sessionId !== e.sessionId) (n.held.clear(), (n.settled.length = 0));
  ((n.sessionId = e.sessionId), (n.reporter = e));
}
//@ chunk-f25sswmp.js:8919-8988 placement
function e9o(e) {
  let n = P();
  if (n.reporter?.owner === e) n.reporter = void 0;
}
/**
 * 处理消息期间认领已读回执，结束后结算。
 */
//@ chunk-f25sswmp.js:8988-9252 placement
function withReadReceiptClaim(e, n) {
  let lower = e.toLowerCase(),
    { held: held, settled: settled } = P();
  if (!held.has(lower)) held.set(lower, { phase: "claimed", withheld: !1 });
  let index = settled.indexOf(lower);
  if (index !== -1) settled.splice(index, 1);
  let h;
  try {
    h = n();
  } catch (error) {
    throw (settleIfClaimed(lower), error);
  }
  if (h instanceof Promise) return h.finally(() => settleIfClaimed(lower));
  return (settleIfClaimed(lower), h);
}
//@ chunk-f25sswmp.js:9252-9351 placement
function Oli(e) {
  let n = P().held.get(e.toLowerCase());
  if (n === void 0) return !1;
  return ((n.withheld = !0), !0);
}
//@ chunk-f25sswmp.js:9351-9403 placement
function nt(e) {
  return P().held.has(e.toLowerCase());
}
//@ chunk-f25sswmp.js:9403-9463 placement
function ot(e) {
  return P().settled.includes(e.toLowerCase());
}
//@ chunk-f25sswmp.js:9463-9544 placement
function rt(e) {
  return e.payload.type === "user" && typeof e.processing_at === "string";
}
/**
 * 事件是否为重投（处理中、已结算、启动后）。
 */
//@ chunk-f25sswmp.js:9544-9748 placement
function redeliveryKind(e) {
  let n = !1;
  if (nt(e.event_id)) n = "redelivered_in_flight";
  else if (ot(e.event_id)) n = "redelivered_settled";
  else if (rt(e)) n = "redelivered_after_start";
  if (n !== !1) logFeatureSad("bridge_read_receipt", n);
  return n;
}
/**
 * 把回执标记为已排队。
 */
//@ chunk-f25sswmp.js:9748-9878 placement
function markReceiptQueued(e) {
  F("queued_note_threw", () => {
    let n = e === void 0 ? void 0 : P().held.get(e.toLowerCase());
    if (n !== void 0) n.phase = "queued";
  });
}
//@ chunk-f25sswmp.js:9878-9989 placement
function settleIfClaimed(e) {
  F("settle_threw", () => {
    let lower = e.toLowerCase(),
      r = P().held.get(lower);
    if (r?.phase === "claimed") settleReceipt(lower, r);
  });
}
//@ chunk-f25sswmp.js:9989-10108 placement
function settleUnlessRead(e) {
  F("settle_threw", () => {
    let lower = e.toLowerCase(),
      r = P().held.get(lower);
    if (r !== void 0 && r.phase !== "read") settleReceipt(lower, r);
  });
}
//@ chunk-f25sswmp.js:10108-10164 placement
function Dli(e) {
  for (let { uuid: uuid } of e) if (uuid !== void 0) settleUnlessRead(uuid);
}
/**
 * Remote Control：模型开始处理排队的远程消息时，向桥发送 bridge_read_receipt（read → processing → processed）。
 */
//@ chunk-f25sswmp.js:10164-10443 placement
function markMessagesRead(e) {
  F("read_note_threw", () => {
    let { held: held } = P();
    if (held.size === 0) return;
    for (let { uuid: uuid } of e) {
      let s = uuid?.toLowerCase(),
        i = s === void 0 ? void 0 : held.get(s);
      if (s === void 0 || i === void 0 || i.phase === "read") continue;
      if (((i.phase = "read"), i.withheld)) (J(s, "processing"), logFeatureOk("bridge_read_receipt"));
    }
  });
}
//@ chunk-f25sswmp.js:10443-10534 placement
function Lli() {
  F("settle_threw", () => {
    for (let [e, n] of P().held) if (n.phase === "read") settleReceipt(e, n);
  });
}
/**
 * 重发保留中与已结算的回执状态。
 */
//@ chunk-f25sswmp.js:10534-10698 placement
function resendReceipts() {
  F("resend_threw", () => {
    let { held: held, settled: settled } = P();
    for (let [r, s] of held) if (s.phase === "read" && s.withheld) J(r, "processing");
    for (let r of settled) J(r, "processed");
  });
}
//@ chunk-f25sswmp.js:10698-10770 placement
function Nli(e) {
  rPe(e, (n, r) => {
    if (r === "cancelled" || r === "refused") settleUnlessRead(n);
  });
}
//@ chunk-f25sswmp.js:10770-10818 placement
function P() {
  return onProcessRootHost(t_s).inboundReadReceipts;
}
//@ chunk-f25sswmp.js:10818-10947 placement
function settleReceipt(e, n) {
  let { held: held, settled: settled } = P();
  if ((held.delete(e), !n.withheld)) return;
  if ((settled.push(e), settled.length > et)) settled.shift();
  J(e, "processed");
}
//@ chunk-f25sswmp.js:10947-11013 placement
function J(e, n) {
  F("report_threw", () => {
    P().reporter?.report(e, n);
  });
}
//@ chunk-f25sswmp.js:11013-11079 placement
function F(e, n) {
  try {
    n();
  } catch (error) {
    (logFeatureBad("bridge_read_receipt", e), logError(error));
  }
}
/**
 * 保存原始 JSON 字符串、序列化时原样输出。
 */
//@ chunk-f25sswmp.js:11079-11201 placement
class RawJson {
  #e;
  constructor(e) {
    this.#e = e;
  }
  static of(e) {
    return new RawJson(JSON.stringify(e));
  }
  toJSON() {
    return JSON.parse(this.#e);
  }
}

export {
  markReceiptQueued,
  Dli,
  Nli,
  markMessagesRead,
  e9o,
  bindReadReceiptSession,
  resendReceipts,
  withReadReceiptClaim,
  Lli,
  RawJson,
  Oli,
  redeliveryKind,
};
