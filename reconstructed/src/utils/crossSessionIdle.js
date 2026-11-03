/**
 * utils/crossSessionIdle.ts
 *
 * 2.1.316 新增：跨会话空闲订阅：其他会话空闲时的提示行。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7bvr1kd2.js (10)
 * attribution: placement 10
 */
import { logError } from "./log.js";
import { logFeatureBad, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { mGe } from "./crossSessionInbound/inboundGate.js";
import {
  ownMessagingSocket,
  registeredLivePeerForSocket,
  sendStampedControlToUdsSocket,
} from "./udsMessaging/udsClient.js";
import { canonicalSocketPath } from "./udsPaths.js";
import { NOTIFY_IDLE_PEER_FEATURE } from "./concurrentSessions.js";
import { canReplyToPeerSocket } from "./peerAddress.js";
import { $ge, u8 } from "./peerMessageHeaders.js";
import { getPlatform } from "./platform.js";
import { createMessageEnvelope } from "./udsMessaging/messageEnvelope.js";
import {
  registerIdleSubscription,
  forgetIdleSubscription,
  hasOutstandingIdleSubscription,
  safeIdleLabel,
  MAX_IDLE_SUBSCRIPTIONS,
} from "./peerIdleSubscriptions.js";
import {
  classifyPeerSendError,
  isExpectedSendError,
  staleSocketHint,
  tsr,
} from "./udsMessaging/peerGuard.js";
import { hLe } from "./crossSessionInbound/inboundMode.js";
import { getIsNonInteractiveSession } from "../bootstrap/state.js";
import { getHostUid } from "./sandbox/userNamespace.js";

//@ chunk-7bvr1kd2.js:11990-12161 placement
async function subscribeToPeerIdle(e, r, s, i) {
  try {
    return await requestPeerIdleNotice(e, r, s, i);
  } catch (error) {
    return (
      logError(error),
      logFeatureBad("cross_session_notify_idle", "subscribe_internal_error"),
      { ok: !1, reason: "send-failed", error: error }
    );
  }
}
/**
 * 订阅另一会话的下次空闲通知：检查本端入站策略、收件箱、命名空间、自身目标与对端能力，注册订阅后经 UDS 发送 notify_when_idle；按失败类型（对端不在、发送失败、结果不确定）返回原因。
 */
//@ chunk-7bvr1kd2.js:12161-13343 placement
async function requestPeerIdleNotice(peerSocket, label, storage, fromMode) {
  if (mGe() === "refuse") return t("requester-refuses-inbound");
  let ownSocket = ownMessagingSocket();
  if (ownSocket === void 0) return t("no-inbox");
  let namespace = canonicalSocketPath(peerSocket);
  if (namespace === void 0) return t("unreachable-namespace");
  if (namespace === canonicalSocketPath(ownSocket)) return t("self-target");
  let peer;
  try {
    peer = await registeredLivePeerForSocket(peerSocket);
  } catch {
    peer = void 0;
  }
  if (peer !== void 0 && !(peer.features?.includes(NOTIFY_IDLE_PEER_FEATURE) ?? !1))
    return t("peer-unsupported");
  if (!canReplyToPeerSocket(ownSocket, namespace, peer?.features, await k()) || !$ge(u8(ownSocket)))
    return t("unreachable-namespace");
  let peerPid = getPlatform() !== "windows" ? peer?.pid : void 0,
    envelope = createMessageEnvelope(),
    registration = registerIdleSubscription(envelope.msg_id, label, peerSocket);
  if (!registration.ok) return t(registration.reason === "cap" ? "cap" : "unreachable-namespace");
  let priors = registration.priors;
  try {
    return (
      await sendStampedControlToUdsSocket(
        peerSocket,
        {
          action: "notify_when_idle",
          from: u8(ownSocket),
          ...(fromMode !== void 0 && { from_mode: fromMode }),
        },
        envelope,
        { ...(peerPid !== void 0 && { expectPeerPid: peerPid }), storageV5: storage },
      ),
      { ok: !0, peerKnownCapable: peer !== void 0 }
    );
  } catch (error) {
    if (classifyPeerSendError(error) === "gone") {
      forgetIdleSubscription(envelope.msg_id);
      for (let p of priors) forgetIdleSubscription(p);
      return (
        logFeatureBad("cross_session_notify_idle", "subscribe_peer_gone"),
        { ok: !1, reason: "peer-gone", error: error }
      );
    }
    if (isExpectedSendError(error)) {
      forgetIdleSubscription(envelope.msg_id);
      let any = priors.some(hasOutstandingIdleSubscription);
      return (
        logFeatureBad("cross_session_notify_idle", "subscribe_send_failed"),
        { ok: !1, reason: "send-failed", ...(any && { restoredEarlier: !0 }), error: error }
      );
    }
    return (
      logFeatureSad("cross_session_notify_idle", "subscribe_send_uncertain"),
      { ok: !1, reason: "send-uncertain", error: error }
    );
  }
}
//@ chunk-7bvr1kd2.js:13343-13417 placement
function t(e) {
  return (
    logFeatureSad("cross_session_notify_idle", IDLE_SUBSCRIBE_FAILURE_EVENTS[e]),
    { ok: !1, reason: e }
  );
}
//@ chunk-7bvr1kd2.js:13417-13551 placement
function idleSelfTargetMessage(e) {
  return `notify_when_idle: ${e} is THIS session \u2014 nothing was subscribed; you already know when your own turn ends.`;
}
//@ chunk-7bvr1kd2.js:13551-13821 placement
var IDLE_SUBSCRIBE_FAILURE_EVENTS = {
  "requester-refuses-inbound": "subscribe_requester_refuses_inbound",
  "no-inbox": "subscribe_no_inbox",
  "self-target": "subscribe_self_target",
  "unreachable-namespace": "subscribe_unreachable_namespace",
  "peer-unsupported": "subscribe_peer_unsupported",
  cap: "subscribe_cap",
};
/**
 * 生成订阅成功后给模型的说明：对端能力未知时提示可能收不到；按本端入站策略说明通知是直接送达、只记录还是展示给用户。
 */
//@ chunk-7bvr1kd2.js:13821-15391 placement
function describeIdleSubscription(peer, capabilityKnown = !0) {
  let label = safeIdleLabel(peer);
  if (!capabilityKnown)
    return `Subscription sent to "${label}" \u2014 but whether it supports idle notices is unknown (no readable session-registry record vouches for it), so a notice may never come; you will be told if it lapses unheard. Do not rely on it.`;
  let policy = hLe();
  if (policy === "accept")
    return `Subscribed \u2014 you will get one notice here when "${label}" is next idle (or exits). Do not poll or wait for it; carry on.`;
  let isNonInteractive = getIsNonInteractiveSession();
  if (policy === "hold")
    return isNonInteractive
      ? `Subscribed \u2014 "${label}" will send one notice when it is next idle (or exits), but this session holds ALL inbound peer traffic (crossSessionInbound: hold), so it will only be logged here, not delivered to you. Carry on; do not poll.`
      : `Subscribed \u2014 "${label}" will send one notice when it is next idle (or exits); this session holds ALL inbound peer traffic (crossSessionInbound: hold), so it will be shown to your user in the transcript, not delivered to you. Carry on; do not poll.`;
  let sameClassNote =
    "that session runs in the same permission class as this one (or is one this session spawned)";
  return mGe() === "accept"
    ? `Subscribed \u2014 you will get one notice here when "${label}" is next idle (or exits), provided ${sameClassNote} or asserts none; otherwise it is ${isNonInteractive ? "only logged here" : "shown to your user in the transcript"}. Do not poll or wait for it; carry on.`
    : `Subscribed \u2014 "${label}" will send one notice when it is next idle (or exits). It is delivered to you if ${sameClassNote}; otherwise it is ${isNonInteractive ? "only logged here" : "shown to your user in the transcript"} (this session holds other inbound peer traffic). Carry on; do not poll.`;
}
/**
 * 按订阅失败原因生成给模型的说明（无收件箱、自身、拒收入站、命名空间不可达、对端不支持、超上限、对端不在、发送失败或不确定）。
 */
//@ chunk-7bvr1kd2.js:15391-17127 placement
function describeIdleSubscribeFailure(result, peer) {
  if (result.ok) return "";
  switch (result.reason) {
    case "no-inbox":
      return "notify_when_idle needs this session to have a messaging inbox, and it has none \u2014 no notice will arrive.";
    case "self-target":
      return idleSelfTargetMessage("that address");
    case "requester-refuses-inbound":
      return "notify_when_idle: this session does not accept inbound cross-session traffic (messaging is off here or crossSessionInbound is refuse), so an idle notice could never be shown to you \u2014 nothing was subscribed.";
    case "unreachable-namespace":
      return "notify_when_idle: that session could not answer into this session's messaging inbox (different namespace, or an address it will not accept), so its idle notice could not be delivered here \u2014 nothing was subscribed.";
    case "peer-unsupported":
      return "notify_when_idle: that session runs a version without idle notices \u2014 nothing was subscribed. Ask your user, or message it and wait for its reply instead.";
    case "cap":
      return `notify_when_idle: this session already holds ${MAX_IDLE_SUBSCRIPTIONS} pending idle subscriptions \u2014 wait for some to fire or expire.`;
    case "peer-gone":
      return `notify_when_idle: no session is listening at that address any more; nothing was subscribed, and any earlier idle subscription to it is void${staleSocketHint(peer)}`;
    case "send-failed": {
      let busyNote = classifyPeerSendError(result.error) === "busy" ? tsr(result.error) : ".";
      return result.restoredEarlier
        ? `notify_when_idle: the re-subscribe could not be sent; your earlier idle subscription to that session still stands${busyNote}`
        : `notify_when_idle: the subscription could not be sent \u2014 no notice will arrive${busyNote}`;
    }
    case "send-uncertain":
      return "notify_when_idle: sending the subscription did not complete cleanly, so it is unknown whether that session recorded it \u2014 a notice may or may not arrive. Do not rely on it.";
  }
}
/**
 * 生成给用户看的空闲订阅结果说明：成功（对端能力已知或未知）或各类失败原因。
 */
//@ chunk-7bvr1kd2.js:17127-18125 placement
function describeIdleSubscribeForUser(peer, result) {
  let label = safeIdleLabel(peer);
  if (result.ok)
    return result.peerKnownCapable
      ? `You will be told here when ${label} is next idle.`
      : `Idle subscription sent to ${label}; whether it supports idle notices is unknown.`;
  switch (result.reason) {
    case "send-uncertain":
      return `The idle subscription for ${label} may not have been recorded; a notice may or may not arrive.`;
    case "peer-gone":
      return `No session is listening at ${label}'s address any more; no idle subscription.`;
    case "peer-unsupported":
      return `${label} runs a version without idle notices; no idle subscription.`;
    case "self-target":
      return "That address is this session; no idle subscription.";
    case "send-failed":
      return result.restoredEarlier
        ? `Re-subscribing to ${label} failed; the earlier idle subscription still stands.`
        : `The idle subscription for ${label} could not be set up; you will not be told when it goes idle.`;
    case "requester-refuses-inbound":
    case "no-inbox":
    case "unreachable-namespace":
    case "cap":
      return `The idle subscription for ${label} could not be set up; you will not be told when it goes idle.`;
  }
}
//@ chunk-7bvr1kd2.js:18125-18335 placement
function idleSubscriptionLines(e, r, s) {
  try {
    return {
      model: r.ok ? describeIdleSubscription(e, r.peerKnownCapable) : describeIdleSubscribeFailure(r, s),
      display: describeIdleSubscribeForUser(e, r),
    };
  } catch (error) {
    logError(error);
    let n = r.ok ? "Idle subscription sent." : "The idle subscription could not be set up.";
    return { model: n, display: n };
  }
}
//@ chunk-7bvr1kd2.js:18335-18417 placement
async function k() {
  let e = (await getHostUid()) ?? process.getuid?.();
  return e === void 0 ? [] : [e];
}
