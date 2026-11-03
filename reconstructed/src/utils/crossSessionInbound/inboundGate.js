/**
 * utils/crossSessionInbound/inboundGate.ts
 *
 * 2.1.316 新增：跨会话入站消息门槛
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q40vccff.js (34)
 * attribution: placement 34
 */
import { getInboundDecidedBy, hLe, P, r$t, o$t, Q, I } from "./inboundMode.js";
import { isCrossSessionMessagingEnabled } from "../crossSessionMessagingGate.js";
import { logForDebugging } from "../debug.js";
import { isPlanBypass } from "../permissions/browserToolNames.js";
import { ci } from "../swarm/hostState.js";
import { errorMessage } from "../errors.js";
import { enqueueReportingAdmission } from "../messageQueueManager.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { RELAY_SOURCE_KINDS, SLACK_BOT } from "../../services/projectsRelay/relayConfig.js";
import { jy } from "../udsMessaging/peerGuard.js";

//@ chunk-q40vccff.js:3208-3376 placement
function settingToInboundPolicy(e) {
  switch (e) {
    case "accept":
      return { policy: "accept" };
    case "hold":
      return { policy: "hold", holdCause: getInboundDecidedBy() };
    case "refuse":
      return { policy: "refuse", refuseCause: "opt-out" };
  }
}
//@ chunk-q40vccff.js:3376-3461 placement
function H() {
  return isCrossSessionMessagingEnabled("receive")
    ? void 0
    : { policy: "refuse", refuseCause: "kill-switch" };
}
/**
 * 计算当前跨会话入站策略：总开关优先，其次显式设置；否则读取当前权限模式（读不到或未知模式时暂扣），绕过默认时暂扣，其余接受。
 */
//@ chunk-q40vccff.js:3461-3840 placement
function getCurrentInboundPolicy() {
  let e = H();
  if (e) return e;
  let n = hLe();
  if (n !== void 0) return settingToInboundPolicy(n);
  let o = readCurrentPermissionMode();
  if (o === null) return { policy: "hold", holdCause: "mode-unknown" };
  if (!P.has(o.mode))
    return (
      logForDebugging(
        `[cross-session-inbound] unrecognized permission mode '${o.mode}' (fail-closed \u2192 hold)`,
      ),
      { policy: "hold", holdCause: "mode-unknown" }
    );
  return C(o) ? { policy: "hold", holdCause: "bypass-default" } : { policy: "accept" };
}
//@ chunk-q40vccff.js:3840-3893 placement
function S(e) {
  let n = H();
  if (n) return n;
  return getPeerMessagePolicy(e, !1);
}
//@ chunk-q40vccff.js:3893-3922 placement
function E(e) {
  return getPeerMessagePolicy(e, !0);
}
/**
 * 计算某条对等消息的入站策略：显式设置优先；自己发的接受；未知模式暂扣；对方声明的模式须与本端一致，未声明时本端为绕过模式则暂扣。
 */
//@ chunk-q40vccff.js:3922-4422 placement
function getPeerMessagePolicy(e, n) {
  let setting = hLe();
  if (setting !== void 0) return settingToInboundPolicy(setting);
  if (e?.selfSent) return { policy: "accept" };
  let currentMode = readCurrentPermissionMode();
  if (currentMode === null || !P.has(currentMode.mode)) {
    if (currentMode !== null)
      logForDebugging(
        `[cross-session-inbound] unrecognized permission mode '${currentMode.mode}' (fail-closed \u2192 hold)`,
      );
    return { policy: "hold", holdCause: "mode-unknown" };
  }
  let modeClass = s$t(currentMode),
    assertedMode = n || r$t() ? e?.fromMode : void 0;
  if (assertedMode !== void 0)
    return assertedMode === modeClass ? { policy: "accept" } : { policy: "hold", holdCause: "mode-mismatch" };
  return modeClass === "bypass" ? { policy: "hold", holdCause: "no-mode-asserted" } : { policy: "accept" };
}
//@ chunk-q40vccff.js:4422-4519 placement
function C(e) {
  return e.mode === "bypassPermissions" || isPlanBypass(e.mode, e.isBypassPermissionsModeAvailable);
}
//@ chunk-q40vccff.js:4519-4568 placement
function s$t(e) {
  return C(e) ? "bypass" : "prompting";
}
//@ chunk-q40vccff.js:4568-4601 placement
function mGe() {
  return getCurrentInboundPolicy().policy;
}
//@ chunk-q40vccff.js:4601-4636 placement
function kvo(e) {
  return S(e).policy;
}
//@ chunk-q40vccff.js:4636-4914 placement
function readCurrentPermissionMode() {
  let getCurrentMode = ci().inbound.getCurrentMode;
  if (getCurrentMode === null)
    return (
      logForDebugging("[cross-session-inbound] permission-mode getter not wired (fail-closed \u2192 hold)"),
      null
    );
  try {
    return getCurrentMode();
  } catch (error) {
    return (
      logForDebugging(
        `[cross-session-inbound] mode getter threw (${errorMessage(error)}; fail-closed \u2192 hold)`,
      ),
      null
    );
  }
}
/**
 * 是否处于绕过默认保留的状态（未显式设置，且当前模式在允许集合中并满足条件）。
 */
//@ chunk-q40vccff.js:4914-5015 placement
function isBypassDefaultHold() {
  if (hLe() !== void 0) return !1;
  let e = readCurrentPermissionMode();
  if (e === null || !P.has(e.mode)) return !1;
  return C(e);
}
//@ chunk-q40vccff.js:5015-5051 placement
function Mon(e) {
  return applyInboundPolicy(e, S(getPeerOriginInfo(e)));
}
//@ chunk-q40vccff.js:5051-5158 placement
function getPeerOriginInfo(e) {
  let origin = e.origin;
  if (!origin || origin.kind !== "peer") return;
  return { fromMode: origin.fromMode, selfSent: origin.selfSent };
}
/**
 * 让对等消息经过入口守卫：未准入时发送 dropped 回执并返回 false，准入则记录通信方。
 */
//@ chunk-q40vccff.js:5158-5443 placement
function admitPeerMessage(e) {
  let n;
  if (e.priority === "later") {
    let { priority: priority, ...s } = e;
    n = enqueueReportingAdmission(s, { receipt: "caller" });
  } else n = enqueueReportingAdmission(e, { receipt: "caller" });
  if (!n.admitted)
    return (ci().inbound.sendPeerReceipt?.(e, "dropped", { dropReason: n.reason, droppedMsgIds: [] }), !1);
  return (ci().inbound.recordCorrespondent?.(e), !0);
}
/**
 * 按策略处理入站对等消息：接受；拒绝（记日志并发 refused 回执）；暂扣（关闭中按过期处理，缓冲满时淘汰最早的，入队并通知、发 held 回执）。
 */
//@ chunk-q40vccff.js:5443-6442 placement
function applyInboundPolicy(message, policy) {
  let inbound = ci().inbound;
  switch ((o$t(), policy.policy)) {
    case "accept":
      return (reevaluateHeldMessages("policy-accepts"), logFeatureOk("peer_inbound_gate"), "accept");
    case "refuse":
      return (
        logInboundRefused(
          policy.refuseCause === "kill-switch"
            ? describePeerMessage(message)
            : `crossSessionInbound=refuse: ${describePeerMessage(message)}`,
          policy.refuseCause,
        ),
        inbound.sendPeerReceipt?.(message, "refused"),
        "refused"
      );
    case "hold": {
      let { holdCause: holdCause } = policy;
      if (inbound.shuttingDown)
        return (
          logForDebugging(
            `[cross-session-inbound] shutdown: not parking a late peer message \u2014 settled as expired: ${describePeerMessage(message)}`,
          ),
          inbound.sendPeerReceipt?.(message, "expired"),
          logFeatureSad("peer_inbound_gate", "shutdown_expired"),
          "refused"
        );
      if (inbound.held.length >= Q) {
        let i = inbound.held.shift();
        if (i)
          (logForDebugging(
            `[cross-session-inbound] hold buffer full \u2014 evicted oldest as expired: ${describePeerMessage(i)}`,
          ),
            inbound.sendPeerReceipt?.(i, "expired"),
            inbound.onPeerHoldDropped?.(i, "expired"));
      }
      if (
        (inbound.held.push(message),
        I(),
        logForDebugging(
          `[cross-session-inbound] held inbound peer message (${inbound.held.length} held, cause=${holdCause}): ${describePeerMessage(message)}`,
        ),
        logFeatureSad("peer_inbound_gate", "held"),
        inbound.onPeerHeld)
      )
        (inbound.onPeerHeld(message, inbound.held.length, holdCause),
          inbound.announced.set(message, holdCause));
      return (inbound.sendPeerReceipt?.(message, "held"), "held");
    }
  }
}
/**
 * 把入站消息来源分类为 peer、host-injected、coordinator 或 ungated。
 */
//@ chunk-q40vccff.js:6442-6684 placement
function classifyInboundOrigin(e) {
  if (!e) return "ungated";
  if (e.kind === "peer") return "hostInjected" in e && e.hostInjected === !0 ? "host-injected" : "peer";
  if (e.kind === "task-notification" && "subkind" in e && e.subkind === "peer-send-message")
    return "coordinator";
  return "ungated";
}
/**
 * 入站消息是否需要把关：信封标记为 peer、来源需把关且非例外，或来自中继。
 */
//@ chunk-q40vccff.js:6684-6795 placement
function isGatedInbound({
  ingressOrigin: ingressOrigin,
  inboundOrigin: inboundOrigin,
  envelopePeer: envelopePeer = !1,
}) {
  return (
    envelopePeer ||
    (classifyInboundOrigin(ingressOrigin) !== "ungated" && !isSlackBotPeer(ingressOrigin)) ||
    inboundOrigin === RELAY_SOURCE_KINDS
  );
}
//@ chunk-q40vccff.js:6795-6928 placement
function isSlackBotPeer(e) {
  return (
    !!e &&
    e.kind === "peer" &&
    !("hostInjected" in e && e.hostInjected === !0) &&
    "inbound_origin" in e &&
    e.inbound_origin === SLACK_BOT
  );
}
/**
 * 按入站来源选择把关策略，ungated 直接接受。
 */
//@ chunk-q40vccff.js:6928-7080 placement
function gateInboundByOrigin(e, n) {
  switch (classifyInboundOrigin(e)) {
    case "peer":
      return Mon(n);
    case "host-injected":
      return Avo(n);
    case "coordinator":
      return G(n);
    case "ungated":
      return "accept";
  }
}
/**
 * 按入站来源给出拒收原因（peer 取当前原因，coordinator/host-injected 在拒收设置下为 opt-out）。
 */
//@ chunk-q40vccff.js:7080-7236 placement
function getInboundRefuseCause(e) {
  switch (classifyInboundOrigin(e)) {
    case "peer":
      return a$t();
    case "coordinator":
    case "host-injected":
      return hLe() === "refuse" ? "opt-out" : void 0;
    case "ungated":
      return;
  }
}
//@ chunk-q40vccff.js:7236-7312 placement
function a$t() {
  let e = getCurrentInboundPolicy();
  if (e.policy !== "refuse") return;
  return e.refuseCause;
}
//@ chunk-q40vccff.js:7312-7378 placement
function j() {
  let e = hLe();
  return e !== void 0 ? settingToInboundPolicy(e) : { policy: "accept" };
}
//@ chunk-q40vccff.js:7378-7450 placement
function G(e) {
  let n = hLe();
  if (n === void 0) return "accept";
  return applyInboundPolicy(e, settingToInboundPolicy(n));
}
//@ chunk-q40vccff.js:7450-7486 placement
function Avo(e) {
  return applyInboundPolicy(e, E(getPeerOriginInfo(e)));
}
/**
 * 记录入站 peer 消息被拒（区分 kill switch），并上报把关失败。
 */
//@ chunk-q40vccff.js:7486-7793 placement
function logInboundRefused(e, n) {
  if ((o$t(), n === "kill-switch")) {
    (logForDebugging(
      `[cross-session-inbound] refused inbound peer message \u2014 cross-session messaging disabled (kill switch) (${e})`,
    ),
      logFeatureSad("peer_inbound_gate", "kill_switch"));
    return;
  }
  (logForDebugging(`[cross-session-inbound] refused inbound peer message (${e})`),
    logFeatureSad("peer_inbound_gate", "refused"));
}
//@ chunk-q40vccff.js:7793-7827 placement
function _Le(e) {
  return (o$t(), reevaluateHeldMessages(e));
}
//@ chunk-q40vccff.js:7827-7968 placement
function getHeldMessagePolicy(e) {
  switch (classifyInboundOrigin(e.origin)) {
    case "coordinator":
      return j();
    case "host-injected":
      return E(getPeerOriginInfo(e));
    case "peer":
    case "ungated":
      return S(getPeerOriginInfo(e));
  }
}
/**
 * 策略变化后重新评估暂扣的对等消息：拒绝的发回执并丢弃，仍暂扣的在原因变化时重新通知，可接受的经入口守卫放行并发 delivered 回执。返回放行数。
 */
//@ chunk-q40vccff.js:7968-9034 placement
function reevaluateHeldMessages(e) {
  let inbound = ci().inbound,
    held = inbound.held;
  if (held.length === 0) return 0;
  let stillHeld = [],
    releasable = [],
    reannounce = [],
    refusedCount = 0,
    killSwitchCount = 0;
  for (let r of held) {
    let l = getHeldMessagePolicy(r);
    if (l.policy === "accept") releasable.push(r);
    else if (l.policy === "refuse") {
      if (((refusedCount += 1), l.refuseCause === "kill-switch")) killSwitchCount += 1;
      (inbound.sendPeerReceipt?.(r, "refused"), inbound.onPeerHoldDropped?.(r, "refused"));
    } else if ((stillHeld.push(r), inbound.announced.get(r) !== l.holdCause))
      reannounce.push([r, l.holdCause]);
  }
  ((held.length = 0), held.push(...stillHeld));
  for (let [r, l] of reannounce) (inbound.announced.set(r, l), inbound.onPeerHeld?.(r, held.length, l));
  if (refusedCount > 0)
    logForDebugging(
      killSwitchCount === refusedCount
        ? `[cross-session-inbound] gate off \u2014 dropped ${refusedCount} parked peer message(s) (cross-session messaging disabled)`
        : `[cross-session-inbound] dropped ${refusedCount} held peer message(s) \u2014 policy is now refuse`,
    );
  if (releasable.length === 0) return 0;
  let admitted = [];
  for (let r of releasable)
    if (admitPeerMessage(r)) (admitted.push(r), logFeatureOk("peer_inbound_gate"));
    else inbound.onPeerHoldDropped?.(r, "dropped");
  if (
    (logForDebugging(
      `[cross-session-inbound] released ${releasable.length} held peer message(s) (${e}) \u2014 ${admitted.length} admitted by the ingress guard; ${held.length} still held`,
    ),
    admitted.length > 0)
  )
    inbound.onPeerHoldReleased?.(admitted, e);
  for (let r of admitted) inbound.sendPeerReceipt?.(r, "delivered");
  return releasable.length;
}
/**
 * 处理用户对暂扣消息的决定：批准时再检查策略与入口守卫后放行；拒绝或过期时发送相应回执并丢弃。
 */
//@ chunk-q40vccff.js:9034-10030 placement
function resolveHeldMessage(heldMessage, decision) {
  let inbound = ci().inbound,
    index = inbound.held.indexOf(heldMessage);
  if (index === -1) return "gone";
  let [message] = inbound.held.splice(index, 1);
  if (!message) return "gone";
  if (decision === "approve") {
    let verdict = getHeldMessagePolicy(message);
    if (verdict.policy === "refuse") {
      let isKillSwitch = verdict.refuseCause === "kill-switch";
      return (
        logForDebugging(
          `[cross-session-inbound] held peer message approved but policy is now refuse (${isKillSwitch ? "kill switch" : "opt-out"}) \u2014 dropped`,
        ),
        inbound.sendPeerReceipt?.(message, "refused"),
        inbound.onPeerHoldDropped?.(message, "refused"),
        "dropped"
      );
    }
    if (!admitPeerMessage(message))
      return (
        logForDebugging(
          "[cross-session-inbound] held peer message approved but DROPPED by the ingress guard on release",
        ),
        inbound.onPeerHoldDropped?.(message, "dropped"),
        "dropped-by-guard"
      );
    return (
      logForDebugging("[cross-session-inbound] held peer message APPROVED \u2014 released to queue"),
      logFeatureOk("peer_inbound_gate"),
      inbound.onPeerHoldReleased?.([message], "approved"),
      inbound.sendPeerReceipt?.(message, "delivered"),
      "delivered"
    );
  }
  logForDebugging(
    `[cross-session-inbound] held peer message ${decision === "deny" ? "DENIED" : "EXPIRED/CANCELLED"} \u2014 dropped with denial receipt`,
  );
  let receipt = decision === "deny" ? "denied" : "expired";
  return (inbound.sendPeerReceipt?.(message, receipt), "dropped");
}
//@ chunk-q40vccff.js:10030-10070 placement
function wHs() {
  return ci().inbound.held;
}
//@ chunk-q40vccff.js:10070-10117 placement
function d$t() {
  return ci().inbound.held.length;
}
//@ chunk-q40vccff.js:10117-10165 placement
function Cvo() {
  return ci().inbound.shuttingDown;
}
//@ chunk-q40vccff.js:10165-10349 placement
function describePeerMessage(e) {
  let n = e.origin?.kind === "peer" && typeof e.origin.from === "string" ? e.origin.from : "unknown",
    o = typeof e.value === "string" ? e.value : "[blocks]";
  return `from=${jy(n)} "${jy(o, 60)}"`;
}

export {
  a$t,
  logInboundRefused,
  Mon,
  isBypassDefaultHold,
  s$t,
  _Le,
  resolveHeldMessage,
  getInboundRefuseCause,
  isGatedInbound,
  gateInboundByOrigin,
  classifyInboundOrigin,
  mGe,
  Cvo,
  Avo,
  wHs,
  d$t,
  kvo,
};
