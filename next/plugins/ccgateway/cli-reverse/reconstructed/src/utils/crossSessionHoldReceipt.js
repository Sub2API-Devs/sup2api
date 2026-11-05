/**
 * utils/crossSessionHoldReceipt.ts
 *
 * 2.1.316 新增。跨会话消息被对方暂扣/拒绝/过期时给发送方的回执通知。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-cw98t810.js (14)
 * attribution: placement 14
 */
import { createSystemMessage } from "./messages.js";
import { mainAgentId } from "../bootstrap/state.js";
import { setOnPeerMessageStatus } from "./udsMessaging.js";
import { isPeerAddress } from "./peerMessageHeaders.js";
import { countByAlias } from "../../vendor/lodash-es/countBy.js";
import { normalizeCaseForComparison_2 } from "./permissions/filesystem.js";
import { plural } from "./stringUtils.js";

//@ chunk-cw98t810.js:411-427 placement
/**
 * 回执通知的停留时长（500 毫秒）。
 */
var HOLD_RECEIPT_LINGER_MS = 500;
var MAX_LISTED_RECEIPTS = 200;
//@ chunk-cw98t810.js:427-1592 placement
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
    let counts = emptyHoldReceiptCounts();
    let sink = () => {
      let receipts = counts;
      counts = emptyHoldReceiptCounts();
      for (let status of ["held", "denied", "expired", "delivered", "refused"]) {
        let list = receipts[status];
        if (list.length === 0) continue;
        let count = list.length;
        transcript.apply({
          type: "append",
          messages: [
            createSystemMessage(
              `Cross-session ${count === 1 ? "message" : `messages (${count})`} ${holdOutcomeLabel(status)}${describeRecipients(list)}. ${holdReasonExplanation(status)}`,
              "warning",
            ),
          ],
        });
        queue.enqueue({
          mode: "prompt",
          agentId: mainAgentId(),
          value: holdReceiptNotice(status, count, holdReceiptSuffix(list)),
          ...noticeDeliveryOptions(wakesIdleSession(), hidesFoldedNotices),
          skipSlashCommands: true,
          isMeta: true,
        });
      }
      if (receipts.dropped.length > 0) {
        let flattened = receipts.dropped.flatMap((drop) => drop.sends);
        let droppedCount = flattened.length;
        let reasonText = describeDropReasons(receipts.dropped.map((drop) => drop.dropReason));
        transcript.apply({
          type: "append",
          messages: [
            createSystemMessage(
              `Cross-session ${droppedCount === 1 ? "message was" : `messages (${droppedCount}) were`} dropped at the recipient session's inbox${describeRecipients(flattened)} and not delivered${reasonText ? ` \u2014 ${reasonText}` : ""}. Claude was told not to resend right away.`,
              "warning",
            ),
          ],
        });
        queue.enqueue({
          mode: "prompt",
          agentId: mainAgentId(),
          value: droppedNotice(droppedCount, holdReceiptSuffix(flattened), reasonText),
          ...noticeDeliveryOptions(wakesIdleSession(), hidesFoldedNotices),
          skipSlashCommands: true,
          isMeta: true,
        });
      }
    };
    let pending = null;
    let flush = () => {
      pending?.();
      pending = clock.setTimeout(() => {
        pending = null;
        sink();
      }, HOLD_RECEIPT_LINGER_MS);
    };
    setOnPeerMessageStatus((status) => {
      if (status.status === "dropped") {
        if (counts.dropped.length < MAX_LISTED_RECEIPTS) counts.dropped.push(status);
      } else if (counts[status.status].length < MAX_LISTED_RECEIPTS) counts[status.status].push(status.sent);
      flush();
    });
    return () => {
      setOnPeerMessageStatus(null);
      pending?.();
      pending = null;
    };
  }
  return () => {};
}
//@ chunk-cw98t810.js:1592-1677 placement
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
//@ chunk-cw98t810.js:1677-1716 placement
/**
 * 取消息的收件人地址（不是有效会话地址时返回空串）。
 */
function recipientAddress(recipient) {
  return isPeerAddress(recipient.to) ? recipient.to : "";
}
//@ chunk-cw98t810.js:1716-1994 placement
/**
 * 收件人列表
 */
function describeRecipients(recipients) {
  let byAddress = new Map();
  for (let recipient of recipients)
    if (!byAddress.get(recipient.to)?.handle) byAddress.set(recipient.to, recipient);
  let unique = [...byAddress.values()];
  let byHandle = countByAlias(unique, (recipient) => recipient.handle ?? "");
  let label = recipientsLabel(
    unique.map((recipient) => {
      let address = recipientAddress(recipient);
      if (!recipient.handle) return address;
      return byHandle[recipient.handle] === 1 || address === ""
        ? `@${recipient.handle}`
        : `@${recipient.handle} at ${address}`;
    }),
  );
  return label === "" ? "" : ` (${label})`;
}
//@ chunk-cw98t810.js:1994-2094 placement
function holdReceiptSuffix(receipts) {
  let targets = recipientsLabel(receipts.map(recipientAddress));
  return ` (${targets === "" ? "" : `${targets}; `}msg_id: ${joinLimited(
    receipts.map((receipt) => receipt.msgId),
    5,
  )})`;
}
//@ chunk-cw98t810.js:2094-2202 placement
function recipientsLabel(targets) {
  let names = normalizeCaseForComparison_2(targets.filter((target) => target !== ""));
  return names.length === 0 ? "" : `${plural(names.length, "recipient")}: ${joinLimited(names, 3)}`;
}
//@ chunk-cw98t810.js:2202-2280 placement
/**
 * 用逗号连接列表，超出条数时追加 “, …”。
 */
function joinLimited(items, limit) {
  return `${items.slice(0, limit).join(", ")}${items.length > limit ? ", \u2026" : ""}`;
}
//@ chunk-cw98t810.js:2280-2507 placement
/**
 * 暂扣结果标签
 */
function holdOutcomeLabel(outcome) {
  switch (outcome) {
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
//@ chunk-cw98t810.js:2507-3375 placement
/**
 * 暂扣原因解释
 */
function holdReasonExplanation(reason) {
  switch (reason) {
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
//@ chunk-cw98t810.js:3375-5212 placement
/**
 * 跨会话投递回执通知
 */
function holdReceiptNotice(receipts, count, outcome) {
  let verb = count === 1 ? "Your message to another session" : `${count} of your messages to another session`;
  let wasVerb = count === 1 ? "was" : "were";
  let pronoun = count === 1 ? "it" : "them";
  switch (receipts) {
    case "held":
      return `[Cross-session delivery notice] ${verb} ${wasVerb} held by that session${outcome}. NOT delivered: its Claude has not seen ${pronoun}. Do not report ${pronoun} as delivered, do not wait for a reply, and do not resend while held. The usual cause is that the two sessions run in different permission modes: a terminal session then asks its user to approve, but a Claude Desktop or non-interactive session cannot ask, so there the hold expires undelivered unless the modes come to match. A session can also be set to hold every message. Another notice follows on release, denial or expiry. Tell your user what is held and why, or choose another approach.`;
    case "denied":
      return `[Cross-session delivery notice] ${verb} ${wasVerb} denied by the recipient user${outcome}. Not delivered to that session's Claude. Do not wait for a reply; continue, or choose another approach.`;
    case "expired":
      return `[Cross-session delivery notice] ${verb} ${wasVerb} not approved before expiry${outcome}. Not delivered to that session's Claude, and nothing is waiting there. Do not wait for a reply, and do not resend unprompted: while the two sessions' permission modes differ a resend is only held again. Tell your user what was not delivered and why; send ${pronoun} again, edited if that helps, when they ask.`;
    case "delivered":
      return `[Cross-session delivery notice] ${verb} ${wasVerb} approved and released to that session${outcome}.`;
    case "refused":
      return `[Cross-session delivery notice] ${verb} ${wasVerb} refused${outcome}: that session is not accepting cross-session messages (the feature is off there, or a setting or policy there refuses them). Not delivered to that session's Claude. Do not wait for a reply and do not resend; tell the user, or choose another approach.`;
  }
}
//@ chunk-cw98t810.js:5212-5592 placement
/**
 * 丢弃原因说明
 */
function describeDropReasons(drops) {
  return normalizeCaseForComparison_2(
    drops.map((drop) => {
      switch (drop) {
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
    .filter((part) => part !== "")
    .join("; ");
}
//@ chunk-cw98t810.js:5592-5986 placement
/**
 * 消息被丢弃的通知
 */
function droppedNotice(drops, count, recipients) {
  return `[Cross-session delivery notice] Do not resend now: ${drops === 1 ? "one of your messages to another session was" : `${drops} of your messages to another session were`} dropped at that session's inbox${count} and NOT delivered${recipients ? ` (${recipients})` : ""}. Treat them as unsent. If the content still matters, fold it into ONE later message after you have finished other work; never retry in a loop.`;
}
//@ chunk-cw98t810.js:5986-6068 placement
/**
 * 构造通知的投递选项（非主动通知则标为 passive 且优先）。
 */
function noticeDeliveryOptions(notice, hidesFoldedNotices) {
  return notice
    ? {
        priority: hidesFoldedNotices ? "next" : "later",
      }
    : {
        passive: true,
        priority: "next",
      };
}
export { startCrossSessionHoldReceipt };
