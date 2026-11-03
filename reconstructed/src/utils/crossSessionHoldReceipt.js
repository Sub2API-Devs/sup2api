/**
 * utils/crossSessionHoldReceipt.ts
 *
 * 2.1.316 新增。跨会话消息被对方暂扣/拒绝/过期时给发送方的回执通知。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-eeckpj27.js (14)
 * attribution: placement 14
 */
import { createSystemMessage } from "./messages.js";
import { mainAgentId } from "../bootstrap/state.js";
import { setOnPeerMessageStatus } from "./udsMessaging.js";
import { isPeerAddress } from "./peerMessageHeaders.js";
import { countByAlias } from "../../vendor/lodash-es/countBy.js";
import { uniq } from "./collections.js";
import { plural } from "./stringUtils.js";

//@ chunk-eeckpj27.js:411-427 placement
/**
 * 回执通知的停留时长（500 毫秒）。
 */
var HOLD_RECEIPT_LINGER_MS = 500;
var MAX_LISTED_RECEIPTS = 200;
//@ chunk-eeckpj27.js:427-1592 placement
/**
 * 跨会话消息被对方暂扣/拒绝/过期时给发送方的回执通知。
 */
function startCrossSessionHoldReceipt({
  clock,
  transcript,
  queue,
  wakesIdleSession = () => true,
  hidesFoldedNotices = false,
}) {
  {
    let n = emptyHoldReceiptCounts();
    let l = () => {
      let i = n;
      n = emptyHoldReceiptCounts();
      for (let a of ["held", "denied", "expired", "delivered", "refused"]) {
        let d = i[a];
        if (d.length === 0) continue;
        let u = d.length;
        transcript.apply({
          type: "append",
          messages: [
            createSystemMessage(
              `Cross-session ${u === 1 ? "message" : `messages (${u})`} ${holdOutcomeLabel(a)}${describeRecipients(d)}. ${holdReasonExplanation(a)}`,
              "warning",
            ),
          ],
        });
        queue.enqueue({
          mode: "prompt",
          agentId: mainAgentId(),
          value: holdReceiptNotice(a, u, holdReceiptSuffix(d)),
          ...noticeDeliveryOptions(wakesIdleSession(), hidesFoldedNotices),
          skipSlashCommands: true,
          isMeta: true,
        });
      }
      if (i.dropped.length > 0) {
        let flattened = i.dropped.flatMap((c) => c.sends);
        let d = flattened.length;
        let u = describeDropReasons(i.dropped.map((c) => c.dropReason));
        transcript.apply({
          type: "append",
          messages: [
            createSystemMessage(
              `Cross-session ${d === 1 ? "message was" : `messages (${d}) were`} dropped at the recipient session's inbox${describeRecipients(flattened)} and not delivered${u ? ` \u2014 ${u}` : ""}. Claude was told not to resend right away.`,
              "warning",
            ),
          ],
        });
        queue.enqueue({
          mode: "prompt",
          agentId: mainAgentId(),
          value: droppedNotice(d, holdReceiptSuffix(flattened), u),
          ...noticeDeliveryOptions(wakesIdleSession(), hidesFoldedNotices),
          skipSlashCommands: true,
          isMeta: true,
        });
      }
    };
    let p = null;
    let b = () => {
      p?.();
      p = clock.setTimeout(() => {
        p = null;
        l();
      }, HOLD_RECEIPT_LINGER_MS);
    };
    setOnPeerMessageStatus((i) => {
      if (i.status === "dropped") {
        if (n.dropped.length < MAX_LISTED_RECEIPTS) n.dropped.push(i);
      } else if (n[i.status].length < MAX_LISTED_RECEIPTS) n[i.status].push(i.sent);
      b();
    });
    return () => {
      setOnPeerMessageStatus(null);
      p?.();
      p = null;
    };
  }
  return () => {};
}
//@ chunk-eeckpj27.js:1592-1677 placement
/**
 * 回执计数的初始结构（held/denied/expired/delivered/refused/dropped 各为空数组）。
 */
function emptyHoldReceiptCounts() {
  return {
    held: [],
    denied: [],
    expired: [],
    delivered: [],
    refused: [],
    dropped: [],
  };
}
//@ chunk-eeckpj27.js:1677-1716 placement
/**
 * 取消息的收件人地址（不是有效会话地址时返回空串）。
 */
function recipientAddress(e) {
  return isPeerAddress(e.to) ? e.to : "";
}
//@ chunk-eeckpj27.js:1716-1994 placement
/**
 * 收件人列表
 */
function describeRecipients(e) {
  let s = new Map();
  for (let n of e) if (!s.get(n.to)?.handle) s.set(n.to, n);
  let t = [...s.values()];
  let r = countByAlias(t, (n) => n.handle ?? "");
  let o = recipientsLabel(
    t.map((n) => {
      let l = recipientAddress(n);
      if (!n.handle) return l;
      return r[n.handle] === 1 || l === "" ? `@${n.handle}` : `@${n.handle} at ${l}`;
    }),
  );
  return o === "" ? "" : ` (${o})`;
}
//@ chunk-eeckpj27.js:1994-2094 placement
function holdReceiptSuffix(e) {
  let s = recipientsLabel(e.map(recipientAddress));
  return ` (${s === "" ? "" : `${s}; `}msg_id: ${joinLimited(
    e.map((t) => t.msgId),
    5,
  )})`;
}
//@ chunk-eeckpj27.js:2094-2202 placement
function recipientsLabel(e) {
  let s = uniq(e.filter((t) => t !== ""));
  return s.length === 0 ? "" : `${plural(s.length, "recipient")}: ${joinLimited(s, 3)}`;
}
//@ chunk-eeckpj27.js:2202-2280 placement
/**
 * 用逗号连接列表，超出条数时追加 “, …”。
 */
function joinLimited(e, s) {
  return `${e.slice(0, s).join(", ")}${e.length > s ? ", \u2026" : ""}`;
}
//@ chunk-eeckpj27.js:2280-2507 placement
/**
 * 暂扣结果标签
 */
function holdOutcomeLabel(e) {
  switch (e) {
    case "held":
      return "held by the receiving session";
    case "denied":
      return "denied";
    case "expired":
      return "expired without approval";
    case "delivered":
      return "released after approval";
    case "refused":
      return "refused";
  }
}
//@ chunk-eeckpj27.js:2507-3375 placement
/**
 * 暂扣原因解释
 */
function holdReasonExplanation(e) {
  switch (e) {
    case "held":
      return "Claude in that session hasn't seen it. The usual cause is that the two sessions are in different permission modes: a terminal session then asks for approval there, but the desktop app and non-interactive sessions can't ask, so there the message expires undelivered unless the modes come to match. A session can also be set to hold every message.";
    case "denied":
      return "The recipient's user declined it; it was not delivered.";
    case "expired":
      return "It was never approved, so it wasn't delivered and nothing is waiting in that session. Claude was told.";
    case "delivered":
      return "It was approved and released to that session (final delivery is up to their queue).";
    case "refused":
      return "That session is not accepting cross-session messages (the feature is off there, or a setting or policy there refuses them); it was not delivered.";
  }
}
//@ chunk-eeckpj27.js:3375-5212 placement
/**
 * 跨会话投递回执通知
 */
function holdReceiptNotice(e, s, t) {
  let r = s === 1 ? "Your message to another session" : `${s} of your messages to another session`;
  let o = s === 1 ? "was" : "were";
  let n = s === 1 ? "it" : "them";
  switch (e) {
    case "held":
      return `[Cross-session delivery notice] ${r} ${o} held by that session${t}. NOT delivered: its Claude has not seen ${n}. Do not report ${n} as delivered, do not wait for a reply, and do not resend while held. The usual cause is that the two sessions run in different permission modes: a terminal session then asks its user to approve, but a Claude Desktop or non-interactive session cannot ask, so there the hold expires undelivered unless the modes come to match. A session can also be set to hold every message. Another notice follows on release, denial or expiry. Tell your user what is held and why, or choose another approach.`;
    case "denied":
      return `[Cross-session delivery notice] ${r} ${o} denied by the recipient user${t}. Not delivered to that session's Claude. Do not wait for a reply; continue, or choose another approach.`;
    case "expired":
      return `[Cross-session delivery notice] ${r} ${o} not approved before expiry${t}. Not delivered to that session's Claude, and nothing is waiting there. Do not wait for a reply, and do not resend unprompted: while the two sessions' permission modes differ a resend is only held again. Tell your user what was not delivered and why; send ${n} again, edited if that helps, when they ask.`;
    case "delivered":
      return `[Cross-session delivery notice] ${r} ${o} approved and released to that session${t}.`;
    case "refused":
      return `[Cross-session delivery notice] ${r} ${o} refused${t}: that session is not accepting cross-session messages (the feature is off there, or a setting or policy there refuses them). Not delivered to that session's Claude. Do not wait for a reply and do not resend; tell the user, or choose another approach.`;
  }
}
//@ chunk-eeckpj27.js:5212-5592 placement
/**
 * 丢弃原因说明
 */
function describeDropReasons(e) {
  return uniq(
    e.map((t) => {
      switch (t) {
        case "rate-limited":
          return "you sent faster than that session accepts";
        case "duplicate":
          return "it repeated your previous message";
        case "hop-loop":
        case "hop-runaway":
          return "a relay loop between sessions was cut";
        case "queue-full":
          return "its queue of undelivered peer messages was full";
        case undefined:
          return "";
      }
    }),
  )
    .filter((t) => t !== "")
    .join("; ");
}
//@ chunk-eeckpj27.js:5592-5986 placement
/**
 * 消息被丢弃的通知
 */
function droppedNotice(e, s, t) {
  return `[Cross-session delivery notice] Do not resend now: ${e === 1 ? "one of your messages to another session was" : `${e} of your messages to another session were`} dropped at that session's inbox${s} and NOT delivered${t ? ` (${t})` : ""}. Treat them as unsent. If the content still matters, fold it into ONE later message after you have finished other work; never retry in a loop.`;
}
//@ chunk-eeckpj27.js:5986-6068 placement
/**
 * 构造通知的投递选项（非主动通知则标为 passive 且优先）。
 */
function noticeDeliveryOptions(e, hidesFoldedNotices) {
  return e
    ? {
        priority: hidesFoldedNotices ? "next" : "later",
      }
    : {
        passive: true,
        priority: "next",
      };
}
export { startCrossSessionHoldReceipt };
