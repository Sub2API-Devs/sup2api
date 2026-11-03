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
import { $ge } from "./peerMessageHeaders.js";
import { countByAlias } from "../../vendor/lodash-es/countBy.js";
import { uniq } from "./collections.js";
import { plural } from "./stringUtils.js";

//@ chunk-eeckpj27.js:411-427 placement
var S = 500,
  h = 200;
/**
 * 跨会话消息被对方暂扣/拒绝/过期时给发送方的回执通知。
 */
//@ chunk-eeckpj27.js:427-1592 placement
function startCrossSessionHoldReceipt({
  clock: clock,
  transcript: transcript,
  queue: queue,
  wakesIdleSession: wakesIdleSession = () => !0,
  hidesFoldedNotices: hidesFoldedNotices = !1,
}) {
  {
    let n = m(),
      l = () => {
        let i = n;
        n = m();
        for (let a of ["held", "denied", "expired", "delivered", "refused"]) {
          let d = i[a];
          if (d.length === 0) continue;
          let u = d.length;
          (transcript.apply({
            type: "append",
            messages: [
              createSystemMessage(
                `Cross-session ${u === 1 ? "message" : `messages (${u})`} ${holdOutcomeLabel(a)}${describeRecipients(d)}. ${holdReasonExplanation(a)}`,
                "warning",
              ),
            ],
          }),
            queue.enqueue({
              mode: "prompt",
              agentId: mainAgentId(),
              value: holdReceiptNotice(a, u, holdReceiptSuffix(d)),
              ...y(wakesIdleSession(), hidesFoldedNotices),
              skipSlashCommands: !0,
              isMeta: !0,
            }));
        }
        if (i.dropped.length > 0) {
          let flattened = i.dropped.flatMap((c) => c.sends),
            d = flattened.length,
            u = describeDropReasons(i.dropped.map((c) => c.dropReason));
          (transcript.apply({
            type: "append",
            messages: [
              createSystemMessage(
                `Cross-session ${d === 1 ? "message was" : `messages (${d}) were`} dropped at the recipient session's inbox${describeRecipients(flattened)} and not delivered${u ? ` \u2014 ${u}` : ""}. Claude was told not to resend right away.`,
                "warning",
              ),
            ],
          }),
            queue.enqueue({
              mode: "prompt",
              agentId: mainAgentId(),
              value: droppedNotice(d, holdReceiptSuffix(flattened), u),
              ...y(wakesIdleSession(), hidesFoldedNotices),
              skipSlashCommands: !0,
              isMeta: !0,
            }));
        }
      },
      p = null,
      b = () => {
        (p?.(),
          (p = clock.setTimeout(() => {
            ((p = null), l());
          }, S)));
      };
    return (
      setOnPeerMessageStatus((i) => {
        if (i.status === "dropped") {
          if (n.dropped.length < h) n.dropped.push(i);
        } else if (n[i.status].length < h) n[i.status].push(i.sent);
        b();
      }),
      () => {
        (setOnPeerMessageStatus(null), p?.(), (p = null));
      }
    );
  }
  return () => {};
}
//@ chunk-eeckpj27.js:1592-1677 placement
function m() {
  return { held: [], denied: [], expired: [], delivered: [], refused: [], dropped: [] };
}
//@ chunk-eeckpj27.js:1677-1716 placement
function v(e) {
  return $ge(e.to) ? e.to : "";
}
/**
 * 收件人列表
 */
//@ chunk-eeckpj27.js:1716-1994 placement
function describeRecipients(e) {
  let s = new Map();
  for (let n of e) if (!s.get(n.to)?.handle) s.set(n.to, n);
  let t = [...s.values()],
    r = countByAlias(t, (n) => n.handle ?? ""),
    o = recipientsLabel(
      t.map((n) => {
        let l = v(n);
        if (!n.handle) return l;
        return r[n.handle] === 1 || l === "" ? `@${n.handle}` : `@${n.handle} at ${l}`;
      }),
    );
  return o === "" ? "" : ` (${o})`;
}
//@ chunk-eeckpj27.js:1994-2094 placement
function holdReceiptSuffix(e) {
  let s = recipientsLabel(e.map(v));
  return ` (${s === "" ? "" : `${s}; `}msg_id: ${C(
    e.map((t) => t.msgId),
    5,
  )})`;
}
//@ chunk-eeckpj27.js:2094-2202 placement
function recipientsLabel(e) {
  let s = uniq(e.filter((t) => t !== ""));
  return s.length === 0 ? "" : `${plural(s.length, "recipient")}: ${C(s, 3)}`;
}
//@ chunk-eeckpj27.js:2202-2280 placement
function C(e, s) {
  return `${e.slice(0, s).join(", ")}${e.length > s ? ", \u2026" : ""}`;
}
/**
 * 暂扣结果标签
 */
//@ chunk-eeckpj27.js:2280-2507 placement
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
/**
 * 暂扣原因解释
 */
//@ chunk-eeckpj27.js:2507-3375 placement
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
/**
 * 跨会话投递回执通知
 */
//@ chunk-eeckpj27.js:3375-5212 placement
function holdReceiptNotice(e, s, t) {
  let r = s === 1 ? "Your message to another session" : `${s} of your messages to another session`,
    o = s === 1 ? "was" : "were",
    n = s === 1 ? "it" : "them";
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
/**
 * 丢弃原因说明
 */
//@ chunk-eeckpj27.js:5212-5592 placement
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
        case void 0:
          return "";
      }
    }),
  )
    .filter((t) => t !== "")
    .join("; ");
}
/**
 * 消息被丢弃的通知
 */
//@ chunk-eeckpj27.js:5592-5986 placement
function droppedNotice(e, s, t) {
  return `[Cross-session delivery notice] Do not resend now: ${e === 1 ? "one of your messages to another session was" : `${e} of your messages to another session were`} dropped at that session's inbox${s} and NOT delivered${t ? ` (${t})` : ""}. Treat them as unsent. If the content still matters, fold it into ONE later message after you have finished other work; never retry in a loop.`;
}
//@ chunk-eeckpj27.js:5986-6068 placement
function y(e, s) {
  return e ? { priority: s ? "next" : "later" } : { passive: !0, priority: "next" };
}

export { startCrossSessionHoldReceipt };
