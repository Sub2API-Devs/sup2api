/**
 * utils/udsMessaging/peerGuard.ts
 *
 * 2.1.316 新增：跨会话消息的防护：跳数/环路/重复/限流丢弃（peer-guard）、对端 uid/pid 校验、消息大小与速率错误
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-66jn0ssz.js (49)
 * attribution: placement 49
 */
import { ci } from "../swarm/hostState.js";
import { lst } from "../randomId.js";
import { ownRemoteSessionId } from "../remoteSessionEnv.js";
import { DBe, iPn } from "../peerMessageHeaders.js";
import { commandListDisplay } from "../../components/permissions/shellPermissionHelpers.js";
import { logForDebugging } from "../debug.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { sleep } from "../sleep.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, E } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  getFeatureValue_CACHED_WITH_REFRESH,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import { gn } from "../shortHash.js";
import { truncateCodePoints, truncateToLength } from "../stringUtils.js";
import { getPlatform } from "../platform.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, getErrnoCode } from "../errors.js";
import { isSaneEpochMs } from "../sessionRecords.js";
import { MAX_FORMER_NAMES } from "../concurrentSessions.js";
import { ND } from "../swarm/teammateIds.js";
import { env } from "../env.js";

//@ chunk-66jn0ssz.js:1145-1219 placement
function F(e, n, r, s, d) {
  let m = Math.max(0, r - n) / 1000;
  return Math.min(s, e + m * d);
}
//@ chunk-66jn0ssz.js:1219-1245 placement
function N(e) {
  return e >= 1;
}
//@ chunk-66jn0ssz.js:1245-1494 placement
function lruGetOrCreate(e, n, r, s, d = () => !0) {
  let m = e.get(n);
  if (m !== void 0) return (e.delete(n), e.set(n, m), m);
  while (e.size >= Math.max(1, r)) {
    let l;
    for (let [a, o] of e)
      if (d(o)) {
        l = a;
        break;
      }
    if (((l ??= e.keys().next().value), l === void 0)) break;
    e.delete(l);
  }
  let g = s();
  return (e.set(n, g), g);
}
/**
 * 跨会话防护默认限额。
 */
//@ chunk-66jn0ssz.js:1494-1617 placement
var DEFAULT_PEER_GUARD_LIMITS = {
  bucketCapacity: 30,
  refillPerSecond: 0.5,
  dedupWindowMs: 30000,
  maxSelfHops: 10,
  maxChainLength: 28,
  maxTrackedSenders: 256,
};
//@ chunk-66jn0ssz.js:1617-1709 placement
function ke(e, n) {
  if (!e || n.size === 0) return 0;
  let r = 0;
  for (let s of e) if (n.has(s)) r++;
  return r;
}
/**
 * 检测消息转发跳数失控、环路与重复，返回丢弃原因。
 */
//@ chunk-66jn0ssz.js:1709-2598 placement
function createHopGuard(e = {}, n) {
  let r = { ...DEFAULT_PEER_GUARD_LIMITS, now: () => Date.now(), ...e },
    s = () => (n ? { ...r, ...n() } : r),
    d = new Map();
  function m(a, o) {
    return lruGetOrCreate(d, a, o.maxTrackedSenders, () => ({
      tokens: o.bucketCapacity,
      lastRefill: o.now(),
      lastBody: void 0,
      lastBodyAt: 0,
    }));
  }
  function g(a, o) {
    let c = s();
    if (a !== void 0 && a.length > c.maxChainLength) return { admitted: !1, reason: "hop-runaway" };
    if (ke(a, o) >= c.maxSelfHops) return { admitted: !1, reason: "hop-loop" };
    return;
  }
  function l(a) {
    let o = s(),
      now = o.now(),
      R = g(a.hopChain, a.ownTokens);
    if (R) return R;
    let w = m(a.senderKey, o);
    if (w.lastBody !== void 0 && w.lastBody === a.body && now - w.lastBodyAt < o.dedupWindowMs)
      return { admitted: !1, reason: "duplicate" };
    if (
      ((w.tokens = F(w.tokens, w.lastRefill, now, o.bucketCapacity, o.refillPerSecond)),
      (w.lastRefill = now),
      !N(w.tokens))
    )
      return { admitted: !1, reason: "rate-limited" };
    return ((w.tokens -= 1), (w.lastBody = a.body), (w.lastBodyAt = now), { admitted: !0 });
  }
  return { admit: l, checkHopChain: g, trackedSenderCount: () => d.size };
}
//@ chunk-66jn0ssz.js:2598-2685 placement
var Re = { "rate-limited": !0, duplicate: !0, "hop-loop": !0, "hop-runaway": !0, "queue-full": !0 };
//@ chunk-66jn0ssz.js:2685-2748 placement
function Ie(e) {
  return typeof e === "string" && Object.hasOwn(Re, e);
}
//@ chunk-66jn0ssz.js:2748-2786 placement
function tli(e) {
  return Ie(e) ? e : void 0;
}
//@ chunk-66jn0ssz.js:2786-2819 placement
var Q3o = 256,
  U = 60000,
  ie = 256,
  Ee = 20;
//@ chunk-66jn0ssz.js:2819-2888 placement
function Z3o(e) {
  ci().ingress.ownUdsHopToken = e === void 0 ? void 0 : lst(e);
}
//@ chunk-66jn0ssz.js:2888-2948 placement
function _wn(e) {
  ci().ingress.ownBridgePeerAddressResolver = e;
}
/**
 * 本会话自己的跳数令牌集合。
 */
//@ chunk-66jn0ssz.js:2948-3129 placement
function ownHopTokens() {
  let { ownUdsHopToken: ownUdsHopToken, ownBridgePeerAddressResolver: ownBridgePeerAddressResolver } =
      ci().ingress,
    r = new Set();
  if (ownUdsHopToken) r.add(ownUdsHopToken);
  let s = ownBridgePeerAddressResolver?.();
  if (s) r.add(lst(s));
  let d = ownRemoteSessionId();
  if (d) r.add(lst(DBe(d)));
  return r;
}
/**
 * 对等会话消息被丢弃的原因说明表：超速、重复、转发环路、转发链过长、待投递队列已满。
 */
//@ chunk-66jn0ssz.js:3129-3487 placement
var PEER_MESSAGE_DROP_REASONS = {
  "rate-limited": "sender exceeded the peer message rate limit",
  duplicate: "identical to the previous message from this sender",
  "hop-loop": "message has already passed through this session (a peer messaging loop)",
  "hop-runaway": "peer relay chain is too long (runaway forwarding)",
  "queue-full": "this session has too many undelivered peer messages queued",
};
//@ chunk-66jn0ssz.js:3810-3835 placement
var Ae = 500,
  ve = 5000,
  Oe = 40;
//@ chunk-66jn0ssz.js:3835-4028 placement
function flushDropLog(e, n) {
  if (e.timer !== void 0) (clearTimeout(e.timer), (e.timer = void 0));
  let { pending: pending, pendingIds: pendingIds, pendingSend: pendingSend } = e;
  if (((e.pending = 0), (e.pendingIds = []), (e.pendingSend = void 0), pending > 0 && pendingSend && n()))
    return pendingSend(pendingIds);
}
/**
 * 汇总并节流 [peer-guard] 丢弃日志。
 */
//@ chunk-66jn0ssz.js:4028-5756 placement
function createPeerDropLogger({ trailMs: e = ve } = {}) {
  let n = new Map(),
    r = 0,
    s = 0;
  function d(S = Date.now()) {
    if (S - r >= U) ((r = S), (s = 0));
    if (s >= Oe) return !1;
    return (s++, !0);
  }
  function m(S, P, b, h = Date.now()) {
    let y = n.get(S);
    if (y === void 0)
      y = {
        lastImmediateAt: Number.NEGATIVE_INFINITY,
        pendingIds: [],
        pending: 0,
        timer: void 0,
        pendingSend: void 0,
      };
    if ((n.delete(S), n.set(S, y), n.size > ie)) {
      let x = n.keys().next().value;
      if (x !== void 0 && x !== S) {
        let A = n.get(x);
        if ((n.delete(x), A !== void 0)) flushDropLog(A, () => d(h));
      }
    }
    if (h - y.lastImmediateAt >= U && y.pending === 0) {
      if (((y.lastImmediateAt = h), d(h))) b([]);
      return;
    }
    if ((y.pending++, P !== void 0 && y.pendingIds.length < Q3o)) y.pendingIds.push(P);
    if (((y.pendingSend = b), y.timer === void 0))
      ((y.timer = setTimeout(flushDropLog, e, y, d)), y.timer.unref?.());
  }
  let g = new Map(),
    l = 0,
    a = 0,
    o = 0;
  function c(S, P = Date.now()) {
    let b = commandListDisplay(S);
    logForDebugging(`[peer-guard] drop ${S.reason} from ${b.from}${b.name ? ` (@${b.name})` : ""}`);
    let h = `${S.from}\x00${S.reason}`,
      y = g.get(h);
    if (y && P - y.lastReportAt < U) {
      y.suppressed++;
      return;
    }
    if (P - l >= U) ((l = P), (a = 0));
    if (a >= Ee) {
      o++;
      return;
    }
    a++;
    let x = (y?.suppressed ?? 0) + o;
    if (((o = 0), g.delete(h), g.set(h, { lastReportAt: P, suppressed: 0 }), g.size > ie)) {
      let L = g.keys().next().value;
      if (L !== void 0) g.delete(L);
    }
    let A = { ...S, suppressed: x };
    (logForDebugging(
      `[peer-guard] Dropped peer message from ${b.from}${b.name ? ` (@${b.name})` : ""}: ${S.reason}${x > 0 ? ` (+${x} suppressed)` : ""}`,
      { level: "warn" },
    ),
      logFeatureSad("peer_loop_guard", S.reason),
      ci().ingress.messageDropped.emit(A));
  }
  async function R(S = Ae) {
    let P = [];
    for (let b of n.values())
      if (b.pending > 0) P.push(flushDropLog(b, d));
      else if (b.timer !== void 0) (clearTimeout(b.timer), (b.timer = void 0));
    if (P.length === 0) return;
    await Promise.race([Promise.allSettled(P), sleep(S, void 0, { unref: !0 })]);
  }
  function w() {
    for (let S of n.values()) if (S.timer !== void 0) clearTimeout(S.timer);
    n.clear();
  }
  return { report: c, noteDropForReceipt: m, flushPendingReceipts: R, dispose: w };
}
//@ chunk-66jn0ssz.js:5756-6298 placement
var PEER_DROP_LOG_LIMIT = 50,
  W = { ...DEFAULT_PEER_GUARD_LIMITS, maxQueuedPeerMessages: PEER_DROP_LOG_LIMIT },
  T = W,
  Le = DoctorLazy(() =>
    u({
      bucketCapacity: E().min(5).max(500).catch(T.bucketCapacity),
      refillPerSecond: E().min(0.05).max(50).catch(T.refillPerSecond),
      dedupWindowMs: E().int().min(0).max(600000).catch(T.dedupWindowMs),
      maxSelfHops: E().int().min(3).max(iPn).catch(T.maxSelfHops),
      maxChainLength: E()
        .int()
        .min(8)
        .max(iPn - 1)
        .catch(T.maxChainLength),
      maxTrackedSenders: E().int().min(16).max(1e5).catch(T.maxTrackedSenders),
      maxQueuedPeerMessages: E().int().min(10).max(5000).catch(T.maxQueuedPeerMessages),
    }),
  ),
  Te = 300000;
/**
 * tengu_harbor_kite_limits 防护限额（格式错误用默认）。
 */
//@ chunk-66jn0ssz.js:6298-6503 placement
function getPeerGuardLimits() {
  let e = getFeatureValue_CACHED_WITH_REFRESH("tengu_harbor_kite_limits", W, Te),
    safeParse = Le().safeParse(e);
  if (!safeParse.success)
    return (
      logForDebugging("[peer-guard] tengu_harbor_kite_limits is not an object; using defaults", {
        level: "warn",
      }),
      W
    );
  return safeParse.data;
}
//@ chunk-66jn0ssz.js:6503-6528 placement
var Ce = /[0-9a-f]{32,}/gi;
//@ chunk-66jn0ssz.js:6528-6586 placement
function se(e) {
  return e.replace(Ce, (n) => `<hex:${gn(n)}>`);
}
//@ chunk-66jn0ssz.js:6586-6665 placement
function jy(e, n = 120) {
  if (/token/i.test(e)) return "(withheld)";
  return truncateCodePoints(se(e), n);
}
/**
 * 日志用片段（含 token 时脱敏，截断 200）。
 */
//@ chunk-66jn0ssz.js:6665-6774 placement
function redactFragmentForLog(e) {
  if (/token/i.test(e)) return "(redacted: fragment may carry an auth token)";
  return truncateCodePoints(se(e), 200);
}
/**
 * 套接字对端 uid（Windows 或失败时 null）。
 */
//@ chunk-66jn0ssz.js:6774-7002 placement
function getPeerUid(e) {
  if (getPlatform() === "windows") return null;
  let n = de(e);
  if (n < 0) return null;
  try {
    return Bun.ant.getPeerUid(n);
  } catch (error) {
    return (
      logForDebugging(
        `[daemon] peer uid lookup failed: ${error instanceof Error ? error.message : String(error)}`,
        { level: "warn" },
      ),
      null
    );
  }
}
//@ chunk-66jn0ssz.js:7002-7312 placement
function describeUidMismatch(e, n = getPeerUid) {
  let r = process.getuid?.();
  if (r == null) return null;
  let s = n(e);
  if (s == null) return null;
  if (s === r) return null;
  let d = `permission denied: connecting uid ${s} != daemon uid ${r} (retry without sudo, or as the daemon owner)`;
  return (logForDebugging(`[daemon] rejecting control connection: ${d}`, { level: "error" }), d);
}
//@ chunk-66jn0ssz.js:7312-7628 placement
function getPeerPid(e) {
  if (getPlatform() === "windows") return;
  let n = de(e);
  try {
    let r = n < 0 ? null : Bun.ant.getPeerPid(n);
    if (r !== null && r > 0) return r;
    logForDebugging(`[peer-cred] peer pid unavailable (fd=${n}, got=${r})`, { level: "warn" });
    return;
  } catch (error) {
    logForDebugging(
      `[peer-cred] peer pid lookup failed: ${error instanceof Error ? error.message : String(error)}`,
      { level: "warn" },
    );
    return;
  }
}
//@ chunk-66jn0ssz.js:7628-7698 placement
function de(e) {
  let _handle = e._handle;
  return typeof _handle?.fd === "number" ? _handle.fd : -1;
}
//@ chunk-66jn0ssz.js:7862-7878 placement
var ywn = 1048576;
/**
 * 按目标收件箱的令牌桶限速。
 */
//@ chunk-66jn0ssz.js:7878-8790 placement
function createInboxRateLimiter(e, n = Date.now) {
  let r = new Map();
  function s(l, a) {
    let {
        bucketCapacity: bucketCapacity,
        refillPerSecond: refillPerSecond,
        maxTrackedSenders: maxTrackedSenders,
      } = e(),
      w = !1,
      S = lruGetOrCreate(
        r,
        l,
        maxTrackedSenders,
        () => ((w = !0), { tokens: bucketCapacity, updatedAt: a, sentInBurst: 0, burstStartedAt: a }),
        (P) => F(P.tokens, P.updatedAt, a, bucketCapacity, refillPerSecond) >= bucketCapacity,
      );
    if (!w) {
      ((S.tokens = F(S.tokens, S.updatedAt, a, bucketCapacity, refillPerSecond)), (S.updatedAt = a));
      let P = (bucketCapacity / Math.max(refillPerSecond, 0.000000001)) * 1000;
      if (S.tokens >= bucketCapacity || a - S.burstStartedAt > P)
        ((S.sentInBurst = 0), (S.burstStartedAt = a));
    }
    return S;
  }
  function d(l) {
    let a = s(l, n());
    if (!N(a.tokens)) return { ok: !1, sentInBurst: a.sentInBurst };
    ((a.tokens -= 1), (a.sentInBurst += 1));
    let o = a,
      c = !1;
    return {
      ok: !0,
      refund: () => {
        if (c) return;
        ((c = !0),
          (o.tokens = Math.min(e().bucketCapacity, o.tokens + 1)),
          (o.sentInBurst = Math.max(0, o.sentInBurst - 1)));
      },
    };
  }
  function m(l) {
    let a = s(l, n());
    ((a.tokens = Math.min(e().bucketCapacity, a.tokens + 1)),
      (a.sentInBurst = Math.max(0, a.sentInBurst - 1)));
  }
  function g(l) {
    let a = s(l, n());
    ((a.tokens = Math.max(0, a.tokens - 1)), (a.sentInBurst += 1));
  }
  return { reserve: d, credit: m, debit: g };
}
//@ chunk-66jn0ssz.js:8790-8850 placement
var NO_LIVE_INBOX = "no_live_inbox",
  ENOINBOX = "ENOINBOX",
  MESSAGE_TOO_LARGE = "message_too_large";
//@ chunk-66jn0ssz.js:8850-9241 placement
function describeMessageTooLarge(e, n) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `Message too large for cross-session delivery: the serialized message is ${e.toLocaleString("en-US")} characters and the limit is ${n.toLocaleString("en-US")}. Shorten the message text \u2014 put bulk content in a file the recipient can read rather than in the message \u2014 or split it into smaller messages.`,
    "cross-session message exceeds the line cap",
    MESSAGE_TOO_LARGE,
  );
}
//@ chunk-66jn0ssz.js:9241-9298 placement
function kTt(e) {
  return (
    e instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
    e.errorClass === MESSAGE_TOO_LARGE
  );
}
//@ chunk-66jn0ssz.js:9298-9320 placement
var SENDER_PACED = "sender_paced";
//@ chunk-66jn0ssz.js:9320-9634 placement
function describeSenderPaced(e) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `Too many messages to this session just now: ${e} were sent recently and more would be dropped by its rate limit, so this one was not sent. Batch what remains into one message, or wait a little before sending more.`,
    "cross-session sends to one target outpaced its inbox rate limit",
    SENDER_PACED,
  );
}
//@ chunk-66jn0ssz.js:9634-9691 placement
function TTt(e) {
  return (
    e instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS && e.errorClass === SENDER_PACED
  );
}
/**
 * 收件箱已不存在（ENOENT/ECONNREFUSED/无存活收件箱）。
 */
//@ chunk-66jn0ssz.js:9691-9793 placement
function isInboxGoneError(e) {
  let n = getErrnoCode(e);
  return (
    n === "ENOENT" ||
    n === "ECONNREFUSED" ||
    (e instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
      e.errorClass === NO_LIVE_INBOX)
  );
}
//@ chunk-66jn0ssz.js:9793-9934 placement
class NoLiveInboxError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  kind;
  constructor(e, n) {
    super(n, "no live inbox registered for the target pipe", NO_LIVE_INBOX);
    ((this.name = "NoLiveInboxError"), (this.kind = e));
  }
}
//@ chunk-66jn0ssz.js:9934-9993 placement
function x3r(e) {
  return e instanceof NoLiveInboxError && e.kind === "unusable";
}
/**
 * 发送失败归类 busy/gone/other。
 */
//@ chunk-66jn0ssz.js:9993-10114 placement
function classifyPeerSendError(e) {
  if (x3r(e)) return "busy";
  if (isInboxGoneError(e)) return "gone";
  let n = getErrnoCode(e);
  return n === "EBUSY" || n === "EAGAIN" ? "busy" : "other";
}
/**
 * 套接字路径过期的提示。
 */
//@ chunk-66jn0ssz.js:10114-10251 placement
function staleSocketHint(e) {
  return ` \u2014 the peer process may have restarted, so this socket path is stale. Call ${e} to get the current address.`;
}
/**
 * 管道忙与注册表暂不可读的提示。
 */
//@ chunk-66jn0ssz.js:10251-10488 placement
var PIPE_BUSY_HINT =
    " \u2014 the peer is alive but its pipe is momentarily busy. Retry the same address shortly.",
  REGISTRY_UNREADABLE_HINT =
    " \u2014 this machine's session registry could not be read just now (a transient local condition). Retry the same address shortly.";
//@ chunk-66jn0ssz.js:10488-10525 placement
function tsr(e) {
  return x3r(e) ? REGISTRY_UNREADABLE_HINT : PIPE_BUSY_HINT;
}
//@ chunk-66jn0ssz.js:10525-10631 placement
class UdsSendRefusedError extends Error {
  refusal;
  constructor(e, n) {
    super(n);
    ((this.name = "UdsSendRefusedError"), (this.refusal = e));
  }
}
/**
 * 预期内的发送错误（拒绝、已离开、忙、无权限等）。
 */
//@ chunk-66jn0ssz.js:10631-10757 placement
function isExpectedSendError(e) {
  if (e instanceof UdsSendRefusedError || isInboxGoneError(e) || TTt(e) || kTt(e)) return !0;
  let n = getErrnoCode(e);
  return n === "EBUSY" || n === "EAGAIN" || n === "EACCES";
}
//@ chunk-66jn0ssz.js:10757-10918 placement
function isFormerNameEntry(e) {
  if (typeof e !== "object" || e === null) return !1;
  let { name: n, until: until, sessionId: sessionId } = e;
  return (
    typeof n === "string" && isSaneEpochMs(until) && (sessionId === void 0 || typeof sessionId === "string")
  );
}
//@ chunk-66jn0ssz.js:10918-11095 placement
function sanitizeFormerNames(e) {
  if (!Array.isArray(e)) return [];
  return e
    .filter(isFormerNameEntry)
    .slice(0, MAX_FORMER_NAMES)
    .map(({ name: n, until: until, sessionId: sessionId }) => ({
      name: truncateToLength(n, ND),
      until: until,
      ...(sessionId !== void 0 && { sessionId: truncateToLength(sessionId, ND) }),
    }));
}
//@ chunk-66jn0ssz.js:11095-11146 placement
function Ke() {
  return (ci().outbound.pacer ??= createInboxRateLimiter(getPeerGuardLimits));
}
//@ chunk-66jn0ssz.js:11146-11175 placement
var We = { ok: !0, refund: () => {} };
//@ chunk-66jn0ssz.js:11175-11282 placement
function isPacingEnabled() {
  if (env.CLAUDE_CODE_HARBOR_KITE_PACING_OFF) return !1;
  return !getFeatureValue_CACHED_MAY_BE_STALE("tengu_harbor_kite_pacing_off", !1);
}

export {
  PEER_MESSAGE_DROP_REASONS,
  Q3o,
  jy,
  redactFragmentForLog,
  tli,
  getPeerPid,
  ywn,
  Z3o,
  createHopGuard,
  getPeerGuardLimits,
  createPeerDropLogger,
  ownHopTokens,
  isExpectedSendError,
  _wn,
  classifyPeerSendError,
  kTt,
  TTt,
  UdsSendRefusedError,
  staleSocketHint,
  tsr,
  x3r,
  isPacingEnabled,
  Ke,
  We,
  describeSenderPaced,
  describeMessageTooLarge,
  NoLiveInboxError,
  ENOINBOX,
  getPeerUid,
  sanitizeFormerNames,
  DEFAULT_PEER_GUARD_LIMITS,
  isInboxGoneError,
  PIPE_BUSY_HINT,
  describeUidMismatch,
};
