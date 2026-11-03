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
import { swarmHostState } from "../swarm/hostState.js";
import { hmacRandomId } from "../randomId.js";
import { ownRemoteSessionId } from "../remoteSessionEnv.js";
import { bridgeAddressFromToken, MAX_HOP_CHAIN_LENGTH } from "../peerMessageHeaders.js";
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
import { shortHash } from "../shortHash.js";
import { truncateCodePoints, truncateToLength } from "../stringUtils.js";
import { getPlatform } from "../platform.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, getErrnoCode } from "../errors.js";
import { isSaneEpochMs } from "../sessionRecords.js";
import { MAX_FORMER_NAMES } from "../concurrentSessions.js";
import { MAX_SEED_NAME_CHARS } from "../swarm/teammateIds.js";
import { env } from "../env.js";

//@ chunk-66jn0ssz.js:1145-1219 placement
function refillTokens(tokens, n, r, bucketCapacity, refillPerSecond) {
  let m = Math.max(0, r - n) / 1000;
  return Math.min(bucketCapacity, tokens + m * refillPerSecond);
}
//@ chunk-66jn0ssz.js:1219-1245 placement
function hasToken(tokens) {
  return tokens >= 1;
}
//@ chunk-66jn0ssz.js:1245-1494 placement
function lruGetOrCreate(e, n, maxTrackedSenders, s, d = () => true) {
  let m = e.get(n);
  if (m !== undefined) {
    e.delete(n);
    e.set(n, m);
    return m;
  }
  while (e.size >= Math.max(1, maxTrackedSenders)) {
    let l;
    for (let [a, o] of e)
      if (d(o)) {
        l = a;
        break;
      }
    l ??= e.keys().next().value;
    if (l === undefined) break;
    e.delete(l);
  }
  let g = s();
  e.set(n, g);
  return g;
}
//@ chunk-66jn0ssz.js:1494-1617 placement
/**
 * 跨会话防护默认限额。
 */
var DEFAULT_PEER_GUARD_LIMITS_2 = {
  bucketCapacity: 30,
  refillPerSecond: 0.5,
  dedupWindowMs: 30000,
  maxSelfHops: 10,
  maxChainLength: 28,
  maxTrackedSenders: 256,
};
//@ chunk-66jn0ssz.js:1617-1709 placement
function countSelfHops(e, n) {
  if (!e || n.size === 0) return 0;
  let r = 0;
  for (let s of e) if (n.has(s)) r++;
  return r;
}
//@ chunk-66jn0ssz.js:1709-2598 placement
/**
 * 检测消息转发跳数失控、环路与重复，返回丢弃原因。
 */
function createHopGuard(e = {}, getPeerGuardLimits) {
  let r = {
    ...DEFAULT_PEER_GUARD_LIMITS_2,
    now: () => Date.now(),
    ...e,
  };
  let s = () =>
    getPeerGuardLimits
      ? {
          ...r,
          ...getPeerGuardLimits(),
        }
      : r;
  let d = new Map();
  function m(senderKey, o) {
    return lruGetOrCreate(d, senderKey, o.maxTrackedSenders, () => ({
      tokens: o.bucketCapacity,
      lastRefill: o.now(),
      lastBody: undefined,
      lastBodyAt: 0,
    }));
  }
  function g(hopChain, ownTokens) {
    let c = s();
    if (hopChain !== undefined && hopChain.length > c.maxChainLength)
      return {
        admitted: false,
        reason: "hop-runaway",
      };
    if (countSelfHops(hopChain, ownTokens) >= c.maxSelfHops)
      return {
        admitted: false,
        reason: "hop-loop",
      };
    return;
  }
  function l(a) {
    let o = s();
    let c = o.now();
    let R = g(a.hopChain, a.ownTokens);
    if (R) return R;
    let w = m(a.senderKey, o);
    if (w.lastBody !== undefined && w.lastBody === a.body && c - w.lastBodyAt < o.dedupWindowMs)
      return {
        admitted: false,
        reason: "duplicate",
      };
    w.tokens = refillTokens(w.tokens, w.lastRefill, c, o.bucketCapacity, o.refillPerSecond);
    w.lastRefill = c;
    if (!hasToken(w.tokens))
      return {
        admitted: false,
        reason: "rate-limited",
      };
    w.tokens -= 1;
    w.lastBody = a.body;
    w.lastBodyAt = c;
    return {
      admitted: true,
    };
  }
  return {
    admit: l,
    checkHopChain: g,
    trackedSenderCount: () => d.size,
  };
}
//@ chunk-66jn0ssz.js:2598-2685 placement
var PEER_DROP_REASONS = {
  "rate-limited": true,
  duplicate: true,
  "hop-loop": true,
  "hop-runaway": true,
  "queue-full": true,
};
//@ chunk-66jn0ssz.js:2685-2748 placement
function peerDropReasonOf(e) {
  return typeof e === "string" && Object.hasOwn(PEER_DROP_REASONS, e);
}
//@ chunk-66jn0ssz.js:2748-2786 placement
/**
 * 规范化丢弃原因，未知返回 undefined。
 */
function normalizePeerDropReason(dropReason) {
  return peerDropReasonOf(dropReason) ? dropReason : undefined;
}
//@ chunk-66jn0ssz.js:2786-2819 placement
/**
 * 对等方丢弃日志的上限常量组（待决 id、间隔、条目、抑制数）。
 */
var MAX_PENDING_DROP_IDS = 256;
var DROP_LOG_INTERVAL_MS = 60000;
var MAX_DROP_LOG_ENTRIES = 256;
var MAX_SUPPRESSED_DROPS = 20;
//@ chunk-66jn0ssz.js:2819-2888 placement
/**
 * 设置本会话的 UDS 跳数令牌。
 */
function setOwnUdsHopToken(e) {
  swarmHostState().ingress.ownUdsHopToken = e === undefined ? undefined : hmacRandomId(e);
}
//@ chunk-66jn0ssz.js:2888-2948 placement
/**
 * 设置桥接对等地址解析器。
 */
function setOwnBridgePeerResolver(ownBridgePeerAddressResolver) {
  swarmHostState().ingress.ownBridgePeerAddressResolver = ownBridgePeerAddressResolver;
}
//@ chunk-66jn0ssz.js:2948-3129 placement
/**
 * 本会话自己的跳数令牌集合。
 */
function ownHopTokens() {
  let { ownUdsHopToken, ownBridgePeerAddressResolver } = swarmHostState().ingress;
  let r = new Set();
  if (ownUdsHopToken) r.add(ownUdsHopToken);
  let s = ownBridgePeerAddressResolver?.();
  if (s) r.add(hmacRandomId(s));
  let d = ownRemoteSessionId();
  if (d) r.add(hmacRandomId(bridgeAddressFromToken(d)));
  return r;
}
//@ chunk-66jn0ssz.js:3129-3487 placement
/**
 * 对等会话消息被丢弃的原因说明表：超速、重复、转发环路、转发链过长、待投递队列已满。
 */
var PEER_MESSAGE_DROP_REASONS = {
  "rate-limited": "sender exceeded the peer message rate limit",
  duplicate: "identical to the previous message from this sender",
  "hop-loop": "message has already passed through this session (a peer messaging loop)",
  "hop-runaway": "peer relay chain is too long (runaway forwarding)",
  "queue-full": "this session has too many undelivered peer messages queued",
};
//@ chunk-66jn0ssz.js:3810-3835 placement
var MAX_DROP_TRAIL = 500;
var DEFAULT_DROP_TRAIL_MS = 5000;
var MAX_IMMEDIATE_DROP_LOGS = 40;
//@ chunk-66jn0ssz.js:3835-4028 placement
function flushDropLog(e, n) {
  if (e.timer !== undefined) {
    clearTimeout(e.timer);
    e.timer = undefined;
  }
  let { pending, pendingIds, pendingSend } = e;
  e.pending = 0;
  e.pendingIds = [];
  e.pendingSend = undefined;
  if (pending > 0 && pendingSend && n()) return pendingSend(pendingIds);
}
//@ chunk-66jn0ssz.js:4028-5756 placement
/**
 * 汇总并节流 [peer-guard] 丢弃日志。
 */
function createPeerDropLogger({ trailMs: e = DEFAULT_DROP_TRAIL_MS } = {}) {
  let n = new Map();
  let r = 0;
  let s = 0;
  function d(S = Date.now()) {
    if (S - r >= DROP_LOG_INTERVAL_MS) {
      r = S;
      s = 0;
    }
    if (s >= MAX_IMMEDIATE_DROP_LOGS) return false;
    s++;
    return true;
  }
  function m(S, P, b, h = Date.now()) {
    let y = n.get(S);
    if (y === undefined)
      y = {
        lastImmediateAt: Number.NEGATIVE_INFINITY,
        pendingIds: [],
        pending: 0,
        timer: undefined,
        pendingSend: undefined,
      };
    n.delete(S);
    n.set(S, y);
    if (n.size > MAX_DROP_LOG_ENTRIES) {
      let x = n.keys().next().value;
      if (x !== undefined && x !== S) {
        let A = n.get(x);
        n.delete(x);
        if (A !== undefined) flushDropLog(A, () => d(h));
      }
    }
    if (h - y.lastImmediateAt >= DROP_LOG_INTERVAL_MS && y.pending === 0) {
      y.lastImmediateAt = h;
      if (d(h)) b([]);
      return;
    }
    y.pending++;
    if (P !== undefined && y.pendingIds.length < MAX_PENDING_DROP_IDS) y.pendingIds.push(P);
    y.pendingSend = b;
    if (y.timer === undefined) {
      y.timer = setTimeout(flushDropLog, e, y, d);
      y.timer.unref?.();
    }
  }
  let g = new Map();
  let l = 0;
  let a = 0;
  let o = 0;
  function c(commands, P = Date.now()) {
    let b = commandListDisplay(commands);
    logForDebugging(`[peer-guard] drop ${commands.reason} from ${b.from}${b.name ? ` (@${b.name})` : ""}`);
    let h = `${commands.from}\x00${commands.reason}`;
    let y = g.get(h);
    if (y && P - y.lastReportAt < DROP_LOG_INTERVAL_MS) {
      y.suppressed++;
      return;
    }
    if (P - l >= DROP_LOG_INTERVAL_MS) {
      l = P;
      a = 0;
    }
    if (a >= MAX_SUPPRESSED_DROPS) {
      o++;
      return;
    }
    a++;
    let x = (y?.suppressed ?? 0) + o;
    o = 0;
    g.delete(h);
    g.set(h, {
      lastReportAt: P,
      suppressed: 0,
    });
    if (g.size > MAX_DROP_LOG_ENTRIES) {
      let L = g.keys().next().value;
      if (L !== undefined) g.delete(L);
    }
    let A = {
      ...commands,
      suppressed: x,
    };
    logForDebugging(
      `[peer-guard] Dropped peer message from ${b.from}${b.name ? ` (@${b.name})` : ""}: ${commands.reason}${x > 0 ? ` (+${x} suppressed)` : ""}`,
      {
        level: "warn",
      },
    );
    logFeatureSad("peer_loop_guard", commands.reason);
    swarmHostState().ingress.messageDropped.emit(A);
  }
  async function R(S = MAX_DROP_TRAIL) {
    let P = [];
    for (let b of n.values())
      if (b.pending > 0) P.push(flushDropLog(b, d));
      else if (b.timer !== undefined) {
        clearTimeout(b.timer);
        b.timer = undefined;
      }
    if (P.length === 0) return;
    await Promise.race([
      Promise.allSettled(P),
      sleep(S, undefined, {
        unref: true,
      }),
    ]);
  }
  function w() {
    for (let S of n.values()) if (S.timer !== undefined) clearTimeout(S.timer);
    n.clear();
  }
  return {
    report: c,
    noteDropForReceipt: m,
    flushPendingReceipts: R,
    dispose: w,
  };
}
//@ chunk-66jn0ssz.js:5756-6298 placement
/**
 * 对等方消息丢弃日志上限与默认守卫限制、限制校验 schema 与刷新间隔。
 */
var PEER_DROP_LOG_LIMIT = 50;
var DEFAULT_PEER_GUARD_LIMITS = {
  ...DEFAULT_PEER_GUARD_LIMITS_2,
  maxQueuedPeerMessages: PEER_DROP_LOG_LIMIT,
};
var peerGuardLimitsFallback = DEFAULT_PEER_GUARD_LIMITS;
var peerGuardLimitsSchema = DoctorLazy(() =>
  u({
    bucketCapacity: E().min(5).max(500).catch(peerGuardLimitsFallback.bucketCapacity),
    refillPerSecond: E().min(0.05).max(50).catch(peerGuardLimitsFallback.refillPerSecond),
    dedupWindowMs: E().int().min(0).max(600000).catch(peerGuardLimitsFallback.dedupWindowMs),
    maxSelfHops: E().int().min(3).max(MAX_HOP_CHAIN_LENGTH).catch(peerGuardLimitsFallback.maxSelfHops),
    maxChainLength: E()
      .int()
      .min(8)
      .max(MAX_HOP_CHAIN_LENGTH - 1)
      .catch(peerGuardLimitsFallback.maxChainLength),
    maxTrackedSenders: E().int().min(16).max(1e5).catch(peerGuardLimitsFallback.maxTrackedSenders),
    maxQueuedPeerMessages: E().int().min(10).max(5000).catch(peerGuardLimitsFallback.maxQueuedPeerMessages),
  }),
);
var PEER_GUARD_LIMITS_REFRESH_MS = 300000;
//@ chunk-66jn0ssz.js:6298-6503 placement
/**
 * tengu_harbor_kite_limits 防护限额（格式错误用默认）。
 */
function getPeerGuardLimits() {
  let featureValue_CACHED_WITH_REFRESH = getFeatureValue_CACHED_WITH_REFRESH(
    "tengu_harbor_kite_limits",
    DEFAULT_PEER_GUARD_LIMITS,
    PEER_GUARD_LIMITS_REFRESH_MS,
  );
  let n = peerGuardLimitsSchema().safeParse(featureValue_CACHED_WITH_REFRESH);
  if (!n.success) {
    logForDebugging("[peer-guard] tengu_harbor_kite_limits is not an object; using defaults", {
      level: "warn",
    });
    return DEFAULT_PEER_GUARD_LIMITS;
  }
  return n.data;
}
//@ chunk-66jn0ssz.js:6503-6528 placement
var LONG_HEX_RE = /[0-9a-f]{32,}/gi;
//@ chunk-66jn0ssz.js:6528-6586 placement
function redactLongHex(e) {
  return e.replace(LONG_HEX_RE, (n) => `<hex:${shortHash(n)}>`);
}
//@ chunk-66jn0ssz.js:6586-6665 placement
/**
 * 日志用片段：含 token 时整体扣留，否则脱敏截断。
 */
function fragmentForLog(e, n = 120) {
  if (/token/i.test(e)) return "(withheld)";
  return truncateCodePoints(redactLongHex(e), n);
}
//@ chunk-66jn0ssz.js:6665-6774 placement
/**
 * 日志用片段（含 token 时脱敏，截断 200）。
 */
function redactFragmentForLog(e) {
  if (/token/i.test(e)) return "(redacted: fragment may carry an auth token)";
  return truncateCodePoints(redactLongHex(e), 200);
}
//@ chunk-66jn0ssz.js:6774-7002 placement
/**
 * 套接字对端 uid（Windows 或失败时 null）。
 */
function getPeerUid(e) {
  if (getPlatform() === "windows") return null;
  let n = socketFdOf(e);
  if (n < 0) return null;
  try {
    return Bun.ant.getPeerUid(n);
  } catch (error) {
    logForDebugging(
      `[daemon] peer uid lookup failed: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "warn",
      },
    );
    return null;
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
  logForDebugging(`[daemon] rejecting control connection: ${d}`, {
    level: "error",
  });
  return d;
}
//@ chunk-66jn0ssz.js:7312-7628 placement
function getPeerPid(e) {
  if (getPlatform() === "windows") return;
  let n = socketFdOf(e);
  try {
    let r = n < 0 ? null : Bun.ant.getPeerPid(n);
    if (r !== null && r > 0) return r;
    logForDebugging(`[peer-cred] peer pid unavailable (fd=${n}, got=${r})`, {
      level: "warn",
    });
    return;
  } catch (error) {
    logForDebugging(
      `[peer-cred] peer pid lookup failed: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "warn",
      },
    );
    return;
  }
}
//@ chunk-66jn0ssz.js:7628-7698 placement
function socketFdOf(e) {
  let _handle = e._handle;
  return typeof _handle?.fd === "number" ? _handle.fd : -1;
}
//@ chunk-66jn0ssz.js:7862-7878 placement
/**
 * 单条对等消息大小上限（1 MiB）。
 */
var MAX_PEER_MESSAGE_BYTES = 1048576;
//@ chunk-66jn0ssz.js:7878-8790 placement
/**
 * 按目标收件箱的令牌桶限速。
 */
function createInboxRateLimiter(getPeerGuardLimits, n = Date.now) {
  let r = new Map();
  function s(l, a) {
    let { bucketCapacity, refillPerSecond, maxTrackedSenders } = getPeerGuardLimits();
    let w = false;
    let S = lruGetOrCreate(
      r,
      l,
      maxTrackedSenders,
      () => {
        w = true;
        return {
          tokens: bucketCapacity,
          updatedAt: a,
          sentInBurst: 0,
          burstStartedAt: a,
        };
      },
      (P) => refillTokens(P.tokens, P.updatedAt, a, bucketCapacity, refillPerSecond) >= bucketCapacity,
    );
    if (!w) {
      S.tokens = refillTokens(S.tokens, S.updatedAt, a, bucketCapacity, refillPerSecond);
      S.updatedAt = a;
      let P = (bucketCapacity / Math.max(refillPerSecond, 0.000000001)) * 1000;
      if (S.tokens >= bucketCapacity || a - S.burstStartedAt > P) {
        S.sentInBurst = 0;
        S.burstStartedAt = a;
      }
    }
    return S;
  }
  function d(l) {
    let a = s(l, n());
    if (!hasToken(a.tokens))
      return {
        ok: false,
        sentInBurst: a.sentInBurst,
      };
    a.tokens -= 1;
    a.sentInBurst += 1;
    let o = a;
    let c = false;
    return {
      ok: true,
      refund: () => {
        if (c) return;
        c = true;
        o.tokens = Math.min(getPeerGuardLimits().bucketCapacity, o.tokens + 1);
        o.sentInBurst = Math.max(0, o.sentInBurst - 1);
      },
    };
  }
  function m(l) {
    let a = s(l, n());
    a.tokens = Math.min(getPeerGuardLimits().bucketCapacity, a.tokens + 1);
    a.sentInBurst = Math.max(0, a.sentInBurst - 1);
  }
  function g(l) {
    let a = s(l, n());
    a.tokens = Math.max(0, a.tokens - 1);
    a.sentInBurst += 1;
  }
  return {
    reserve: d,
    credit: m,
    debit: g,
  };
}
//@ chunk-66jn0ssz.js:8790-8850 placement
var NO_LIVE_INBOX = "no_live_inbox";
var ENOINBOX = "ENOINBOX";
var MESSAGE_TOO_LARGE = "message_too_large";
//@ chunk-66jn0ssz.js:8850-9241 placement
function describeMessageTooLarge(e, n) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `Message too large for cross-session delivery: the serialized message is ${e.toLocaleString("en-US")} characters and the limit is ${n.toLocaleString("en-US")}. Shorten the message text \u2014 put bulk content in a file the recipient can read rather than in the message \u2014 or split it into smaller messages.`,
    "cross-session message exceeds the line cap",
    MESSAGE_TOO_LARGE,
  );
}
//@ chunk-66jn0ssz.js:9241-9298 placement
/**
 * 是否是消息过大错误。
 */
function isMessageTooLargeError(error) {
  return (
    error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
    error.errorClass === MESSAGE_TOO_LARGE
  );
}
//@ chunk-66jn0ssz.js:9298-9320 placement
var SENDER_PACED = "sender_paced";
//@ chunk-66jn0ssz.js:9320-9634 placement
function describeSenderPaced(sentInBurst) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `Too many messages to this session just now: ${sentInBurst} were sent recently and more would be dropped by its rate limit, so this one was not sent. Batch what remains into one message, or wait a little before sending more.`,
    "cross-session sends to one target outpaced its inbox rate limit",
    SENDER_PACED,
  );
}
//@ chunk-66jn0ssz.js:9634-9691 placement
/**
 * 是否是发送方限速错误。
 */
function isSenderPacedError(error) {
  return (
    error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
    error.errorClass === SENDER_PACED
  );
}
//@ chunk-66jn0ssz.js:9691-9793 placement
/**
 * 收件箱已不存在（ENOENT/ECONNREFUSED/无存活收件箱）。
 */
function isInboxGoneError(e) {
  let errnoCode = getErrnoCode(e);
  return (
    errnoCode === "ENOENT" ||
    errnoCode === "ECONNREFUSED" ||
    (e instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
      e.errorClass === NO_LIVE_INBOX)
  );
}
//@ chunk-66jn0ssz.js:9793-9934 placement
class NoLiveInboxError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  kind;
  constructor(kind, n) {
    super(n, "no live inbox registered for the target pipe", NO_LIVE_INBOX);
    this.name = "NoLiveInboxError";
    this.kind = kind;
  }
}
//@ chunk-66jn0ssz.js:9934-9993 placement
/**
 * 是否是「收件箱不可用」错误。
 */
function isUnusableInboxError(e) {
  return e instanceof NoLiveInboxError && e.kind === "unusable";
}
//@ chunk-66jn0ssz.js:9993-10114 placement
/**
 * 发送失败归类 busy/gone/other。
 */
function classifyPeerSendError(error) {
  if (isUnusableInboxError(error)) return "busy";
  if (isInboxGoneError(error)) return "gone";
  let errnoCode = getErrnoCode(error);
  return errnoCode === "EBUSY" || errnoCode === "EAGAIN" ? "busy" : "other";
}
//@ chunk-66jn0ssz.js:10114-10251 placement
/**
 * 套接字路径过期的提示。
 */
function staleSocketHint(e) {
  return ` \u2014 the peer process may have restarted, so this socket path is stale. Call ${e} to get the current address.`;
}
//@ chunk-66jn0ssz.js:10251-10488 placement
/**
 * 管道忙与注册表暂不可读的提示。
 */
var PIPE_BUSY_HINT =
  " \u2014 the peer is alive but its pipe is momentarily busy. Retry the same address shortly.";
var REGISTRY_UNREADABLE_HINT =
  " \u2014 this machine's session registry could not be read just now (a transient local condition). Retry the same address shortly.";
//@ chunk-66jn0ssz.js:10488-10525 placement
/**
 * 收件箱失败时的提示文案。
 */
function inboxFailureHint(error) {
  return isUnusableInboxError(error) ? REGISTRY_UNREADABLE_HINT : PIPE_BUSY_HINT;
}
//@ chunk-66jn0ssz.js:10525-10631 placement
class UdsSendRefusedError extends Error {
  refusal;
  constructor(refusal, n) {
    super(n);
    this.name = "UdsSendRefusedError";
    this.refusal = refusal;
  }
}
//@ chunk-66jn0ssz.js:10631-10757 placement
/**
 * 预期内的发送错误（拒绝、已离开、忙、无权限等）。
 */
function isExpectedSendError(error) {
  if (
    error instanceof UdsSendRefusedError ||
    isInboxGoneError(error) ||
    isSenderPacedError(error) ||
    isMessageTooLargeError(error)
  )
    return true;
  let errnoCode = getErrnoCode(error);
  return errnoCode === "EBUSY" || errnoCode === "EAGAIN" || errnoCode === "EACCES";
}
//@ chunk-66jn0ssz.js:10757-10918 placement
function isFormerNameEntry(e) {
  if (typeof e !== "object" || e === null) return false;
  let { name: n, until, sessionId } = e;
  return (
    typeof n === "string" &&
    isSaneEpochMs(until) &&
    (sessionId === undefined || typeof sessionId === "string")
  );
}
//@ chunk-66jn0ssz.js:10918-11095 placement
function sanitizeFormerNames(formerNames) {
  if (!Array.isArray(formerNames)) return [];
  return formerNames
    .filter(isFormerNameEntry)
    .slice(0, MAX_FORMER_NAMES)
    .map(({ name: n, until, sessionId }) => ({
      name: truncateToLength(n, MAX_SEED_NAME_CHARS),
      until,
      ...(sessionId !== undefined && {
        sessionId: truncateToLength(sessionId, MAX_SEED_NAME_CHARS),
      }),
    }));
}
//@ chunk-66jn0ssz.js:11095-11146 placement
function outboundPacer() {
  return (swarmHostState().outbound.pacer ??= createInboxRateLimiter(getPeerGuardLimits));
}
//@ chunk-66jn0ssz.js:11146-11175 placement
var PACER_PASSED = {
  ok: true,
  refund: () => {},
};
//@ chunk-66jn0ssz.js:11175-11282 placement
function isPacingEnabled() {
  if (env.CLAUDE_CODE_HARBOR_KITE_PACING_OFF) return false;
  return !getFeatureValue_CACHED_MAY_BE_STALE("tengu_harbor_kite_pacing_off", false);
}
export {
  PEER_MESSAGE_DROP_REASONS,
  MAX_PENDING_DROP_IDS,
  fragmentForLog,
  redactFragmentForLog,
  normalizePeerDropReason,
  getPeerPid,
  MAX_PEER_MESSAGE_BYTES,
  setOwnUdsHopToken,
  createHopGuard,
  getPeerGuardLimits,
  createPeerDropLogger,
  ownHopTokens,
  isExpectedSendError,
  setOwnBridgePeerResolver,
  DEFAULT_PEER_GUARD_LIMITS_2,
  classifyPeerSendError,
  isMessageTooLargeError,
  isSenderPacedError,
  UdsSendRefusedError,
  staleSocketHint,
  inboxFailureHint,
  isUnusableInboxError,
  isPacingEnabled,
  outboundPacer,
  PACER_PASSED,
  describeSenderPaced,
  describeMessageTooLarge,
  NoLiveInboxError,
  ENOINBOX,
  getPeerUid,
  sanitizeFormerNames,
  isInboxGoneError,
  PIPE_BUSY_HINT,
  describeUidMismatch,
};
