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
import { objectSchema, numberSchema } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-66jn0ssz.js:1145-1219 placement
function refillTokens(tokens, lastRefillAt, now, bucketCapacity, refillPerSecond) {
  let elapsedSeconds = Math.max(0, now - lastRefillAt) / 1000;
  return Math.min(bucketCapacity, tokens + elapsedSeconds * refillPerSecond);
}
//@ chunk-66jn0ssz.js:1219-1245 placement
function hasToken(tokens) {
  return tokens >= 1;
}
//@ chunk-66jn0ssz.js:1245-1494 placement
function lruGetOrCreate(map, key, maxTrackedSenders, createEntry, isEvictable = () => true) {
  let existing = map.get(key);
  if (existing !== undefined) {
    map.delete(key);
    map.set(key, existing);
    return existing;
  }
  while (map.size >= Math.max(1, maxTrackedSenders)) {
    let evictKey;
    for (let [candidateKey, candidateValue] of map)
      if (isEvictable(candidateValue)) {
        evictKey = candidateKey;
        break;
      }
    evictKey ??= map.keys().next().value;
    if (evictKey === undefined) break;
    map.delete(evictKey);
  }
  let entry = createEntry();
  map.set(key, entry);
  return entry;
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
function countSelfHops(tokens, seen) {
  if (!tokens || seen.size === 0) return 0;
  let count = 0;
  for (let token of tokens) if (seen.has(token)) count++;
  return count;
}
//@ chunk-66jn0ssz.js:1709-2598 placement
/**
 * 检测消息转发跳数失控、环路与重复，返回丢弃原因。
 */
function createHopGuard(options = {}, getPeerGuardLimits) {
  let baseLimits = {
    ...DEFAULT_PEER_GUARD_LIMITS_2,
    now: () => Date.now(),
    ...options,
  };
  let currentLimits = () =>
    getPeerGuardLimits
      ? {
          ...baseLimits,
          ...getPeerGuardLimits(),
        }
      : baseLimits;
  let senderStates = new Map();
  function getSenderState(key, limits) {
    return lruGetOrCreate(senderStates, key, limits.maxTrackedSenders, () => ({
      tokens: limits.bucketCapacity,
      lastRefill: limits.now(),
      lastBody: undefined,
      lastBodyAt: 0,
    }));
  }
  function checkHopChain(tokens, seen) {
    let limits = currentLimits();
    if (tokens !== undefined && tokens.length > limits.maxChainLength)
      return {
        admitted: false,
        reason: "hop-runaway",
      };
    if (countSelfHops(tokens, seen) >= limits.maxSelfHops)
      return {
        admitted: false,
        reason: "hop-loop",
      };
    return;
  }
  function admit(request) {
    let limits = currentLimits();
    let now = limits.now();
    let hopVerdict = checkHopChain(request.hopChain, request.ownTokens);
    if (hopVerdict) return hopVerdict;
    let senderState = getSenderState(request.senderKey, limits);
    if (
      senderState.lastBody !== undefined &&
      senderState.lastBody === request.body &&
      now - senderState.lastBodyAt < limits.dedupWindowMs
    )
      return {
        admitted: false,
        reason: "duplicate",
      };
    senderState.tokens = refillTokens(
      senderState.tokens,
      senderState.lastRefill,
      now,
      limits.bucketCapacity,
      limits.refillPerSecond,
    );
    senderState.lastRefill = now;
    if (!hasToken(senderState.tokens))
      return {
        admitted: false,
        reason: "rate-limited",
      };
    senderState.tokens -= 1;
    senderState.lastBody = request.body;
    senderState.lastBodyAt = now;
    return {
      admitted: true,
    };
  }
  return {
    admit,
    checkHopChain,
    trackedSenderCount: () => senderStates.size,
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
function peerDropReasonOf(reason) {
  return typeof reason === "string" && Object.hasOwn(PEER_DROP_REASONS, reason);
}
//@ chunk-66jn0ssz.js:2748-2786 placement
/**
 * 规范化丢弃原因，未知返回 undefined。
 */
function normalizePeerDropReason(reason) {
  return peerDropReasonOf(reason) ? reason : undefined;
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
function setOwnUdsHopToken(token) {
  swarmHostState().ingress.ownUdsHopToken = token === undefined ? undefined : hmacRandomId(token);
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
  let tokens = new Set();
  if (ownUdsHopToken) tokens.add(ownUdsHopToken);
  let bridgeAddress = ownBridgePeerAddressResolver?.();
  if (bridgeAddress) tokens.add(hmacRandomId(bridgeAddress));
  let remoteSessionId = ownRemoteSessionId();
  if (remoteSessionId) tokens.add(hmacRandomId(bridgeAddressFromToken(remoteSessionId)));
  return tokens;
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
function flushDropLog(state, canLog) {
  if (state.timer !== undefined) {
    clearTimeout(state.timer);
    state.timer = undefined;
  }
  let { pending, pendingIds, pendingSend } = state;
  state.pending = 0;
  state.pendingIds = [];
  state.pendingSend = undefined;
  if (pending > 0 && pendingSend && canLog()) return pendingSend(pendingIds);
}
//@ chunk-66jn0ssz.js:4028-5756 placement
/**
 * 汇总并节流 [peer-guard] 丢弃日志。
 */
function createPeerDropLogger({ trailMs = DEFAULT_DROP_TRAIL_MS } = {}) {
  let counts = new Map();
  let windowStart = 0;
  let windowCount = 0;
  function canLogImmediate(now = Date.now()) {
    if (now - windowStart >= DROP_LOG_INTERVAL_MS) {
      windowStart = now;
      windowCount = 0;
    }
    if (windowCount >= MAX_IMMEDIATE_DROP_LOGS) return false;
    windowCount++;
    return true;
  }
  function noteDropForReceipt(sourceKey, messageId, send, now = Date.now()) {
    let entry = counts.get(sourceKey);
    if (entry === undefined)
      entry = {
        lastImmediateAt: Number.NEGATIVE_INFINITY,
        pendingIds: [],
        pending: 0,
        timer: undefined,
        pendingSend: undefined,
      };
    counts.delete(sourceKey);
    counts.set(sourceKey, entry);
    if (counts.size > MAX_DROP_LOG_ENTRIES) {
      let oldestKey = counts.keys().next().value;
      if (oldestKey !== undefined && oldestKey !== sourceKey) {
        let oldestEntry = counts.get(oldestKey);
        counts.delete(oldestKey);
        if (oldestEntry !== undefined) flushDropLog(oldestEntry, () => canLogImmediate(now));
      }
    }
    if (now - entry.lastImmediateAt >= DROP_LOG_INTERVAL_MS && entry.pending === 0) {
      entry.lastImmediateAt = now;
      if (canLogImmediate(now)) send([]);
      return;
    }
    entry.pending++;
    if (messageId !== undefined && entry.pendingIds.length < MAX_PENDING_DROP_IDS)
      entry.pendingIds.push(messageId);
    entry.pendingSend = send;
    if (entry.timer === undefined) {
      entry.timer = setTimeout(flushDropLog, trailMs, entry, canLogImmediate);
      entry.timer.unref?.();
    }
  }
  let lastReportBySource = new Map();
  let reportWindowStart = 0;
  let reportWindowCount = 0;
  let suppressedDrops = 0;
  function report(commands, now = Date.now()) {
    let display = commandListDisplay(commands);
    logForDebugging(
      `[peer-guard] drop ${commands.reason} from ${display.from}${display.name ? ` (@${display.name})` : ""}`,
    );
    let sourceKey = `${commands.from}\x00${commands.reason}`;
    let lastReport = lastReportBySource.get(sourceKey);
    if (lastReport && now - lastReport.lastReportAt < DROP_LOG_INTERVAL_MS) {
      lastReport.suppressed++;
      return;
    }
    if (now - reportWindowStart >= DROP_LOG_INTERVAL_MS) {
      reportWindowStart = now;
      reportWindowCount = 0;
    }
    if (reportWindowCount >= MAX_SUPPRESSED_DROPS) {
      suppressedDrops++;
      return;
    }
    reportWindowCount++;
    let suppressedCount = (lastReport?.suppressed ?? 0) + suppressedDrops;
    suppressedDrops = 0;
    lastReportBySource.delete(sourceKey);
    lastReportBySource.set(sourceKey, {
      lastReportAt: now,
      suppressed: 0,
    });
    if (lastReportBySource.size > MAX_DROP_LOG_ENTRIES) {
      let oldestKey = lastReportBySource.keys().next().value;
      if (oldestKey !== undefined) lastReportBySource.delete(oldestKey);
    }
    let event = {
      ...commands,
      suppressed: suppressedCount,
    };
    logForDebugging(
      `[peer-guard] Dropped peer message from ${display.from}${display.name ? ` (@${display.name})` : ""}: ${commands.reason}${suppressedCount > 0 ? ` (+${suppressedCount} suppressed)` : ""}`,
      {
        level: "warn",
      },
    );
    logFeatureSad("peer_loop_guard", commands.reason);
    swarmHostState().ingress.messageDropped.emit(event);
  }
  async function flushPendingReceipts(waitMs = MAX_DROP_TRAIL) {
    let flushes = [];
    for (let entry of counts.values())
      if (entry.pending > 0) flushes.push(flushDropLog(entry, canLogImmediate));
      else if (entry.timer !== undefined) {
        clearTimeout(entry.timer);
        entry.timer = undefined;
      }
    if (flushes.length === 0) return;
    await Promise.race([
      Promise.allSettled(flushes),
      sleep(waitMs, undefined, {
        unref: true,
      }),
    ]);
  }
  function dispose() {
    for (let entry of counts.values()) if (entry.timer !== undefined) clearTimeout(entry.timer);
    counts.clear();
  }
  return {
    report,
    noteDropForReceipt,
    flushPendingReceipts,
    dispose,
  };
}
//@ chunk-66jn0ssz.js:5756-6298 placement
/**
 * 对等方消息丢弃日志上限与默认守卫限制、限制校验 schema 与刷新间隔。
 */
var PEER_DROP_LOG_LIMIT; // deferred: uses DEFAULT_PEER_GUARD_LIMITS_2 of its import cycle while loading; runs once the cycle is complete
var DEFAULT_PEER_GUARD_LIMITS;
var peerGuardLimitsFallback;
var peerGuardLimitsSchema;
var PEER_GUARD_LIMITS_REFRESH_MS;
deferInit("chunk-66jn0ssz.js:5756", () => {
  PEER_DROP_LOG_LIMIT = 50;
  DEFAULT_PEER_GUARD_LIMITS = {
    ...DEFAULT_PEER_GUARD_LIMITS_2,
    maxQueuedPeerMessages: PEER_DROP_LOG_LIMIT,
  };
  peerGuardLimitsFallback = DEFAULT_PEER_GUARD_LIMITS;
  peerGuardLimitsSchema = DoctorLazy(() =>
    objectSchema({
      bucketCapacity: numberSchema().min(5).max(500).catch(peerGuardLimitsFallback.bucketCapacity),
      refillPerSecond: numberSchema().min(0.05).max(50).catch(peerGuardLimitsFallback.refillPerSecond),
      dedupWindowMs: numberSchema().int().min(0).max(600000).catch(peerGuardLimitsFallback.dedupWindowMs),
      maxSelfHops: numberSchema()
        .int()
        .min(3)
        .max(MAX_HOP_CHAIN_LENGTH)
        .catch(peerGuardLimitsFallback.maxSelfHops),
      maxChainLength: numberSchema()
        .int()
        .min(8)
        .max(MAX_HOP_CHAIN_LENGTH - 1)
        .catch(peerGuardLimitsFallback.maxChainLength),
      maxTrackedSenders: numberSchema()
        .int()
        .min(16)
        .max(1e5)
        .catch(peerGuardLimitsFallback.maxTrackedSenders),
      maxQueuedPeerMessages: numberSchema()
        .int()
        .min(10)
        .max(5000)
        .catch(peerGuardLimitsFallback.maxQueuedPeerMessages),
    }),
  );
  PEER_GUARD_LIMITS_REFRESH_MS = 300000;
});
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
  let featureValue = peerGuardLimitsSchema().safeParse(featureValue_CACHED_WITH_REFRESH);
  if (!featureValue.success) {
    logForDebugging("[peer-guard] tengu_harbor_kite_limits is not an object; using defaults", {
      level: "warn",
    });
    return DEFAULT_PEER_GUARD_LIMITS;
  }
  return featureValue.data;
}
//@ chunk-66jn0ssz.js:6503-6528 placement
var LONG_HEX_RE = /[0-9a-f]{32,}/gi;
//@ chunk-66jn0ssz.js:6528-6586 placement
function redactLongHex(text) {
  return text.replace(LONG_HEX_RE, (hex) => `<hex:${shortHash(hex)}>`);
}
//@ chunk-66jn0ssz.js:6586-6665 placement
/**
 * 日志用片段：含 token 时整体扣留，否则脱敏截断。
 */
function fragmentForLog(text, max = 120) {
  if (/token/i.test(text)) return "(withheld)";
  return truncateCodePoints(redactLongHex(text), max);
}
//@ chunk-66jn0ssz.js:6665-6774 placement
/**
 * 日志用片段（含 token 时脱敏，截断 200）。
 */
function redactFragmentForLog(text) {
  if (/token/i.test(text)) return "(redacted: fragment may carry an auth token)";
  return truncateCodePoints(redactLongHex(text), 200);
}
//@ chunk-66jn0ssz.js:6774-7002 placement
/**
 * 套接字对端 uid（Windows 或失败时 null）。
 */
function getPeerUid(socket) {
  if (getPlatform() === "windows") return null;
  let fd = socketFdOf(socket);
  if (fd < 0) return null;
  try {
    return Bun.ant.getPeerUid(fd);
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
function describeUidMismatch(socket, getPeerUid_2 = getPeerUid) {
  let uid = process.getuid?.();
  if (uid == null) return null;
  let peerUid = getPeerUid_2(socket);
  if (peerUid == null) return null;
  if (peerUid === uid) return null;
  let reason = `permission denied: connecting uid ${peerUid} != daemon uid ${uid} (retry without sudo, or as the daemon owner)`;
  logForDebugging(`[daemon] rejecting control connection: ${reason}`, {
    level: "error",
  });
  return reason;
}
//@ chunk-66jn0ssz.js:7312-7628 placement
function getPeerPid(socket) {
  if (getPlatform() === "windows") return;
  let fd = socketFdOf(socket);
  try {
    let pid = fd < 0 ? null : Bun.ant.getPeerPid(fd);
    if (pid !== null && pid > 0) return pid;
    logForDebugging(`[peer-cred] peer pid unavailable (fd=${fd}, got=${pid})`, {
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
function socketFdOf(socket) {
  let _handle = socket._handle;
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
function createInboxRateLimiter(getPeerGuardLimits, now = Date.now) {
  let buckets = new Map();
  function limiter(key, at) {
    let { bucketCapacity, refillPerSecond, maxTrackedSenders } = getPeerGuardLimits();
    let isNew = false;
    let bucket = lruGetOrCreate(
      buckets,
      key,
      maxTrackedSenders,
      () => {
        isNew = true;
        return {
          tokens: bucketCapacity,
          updatedAt: at,
          sentInBurst: 0,
          burstStartedAt: at,
        };
      },
      (bucket) =>
        refillTokens(bucket.tokens, bucket.updatedAt, at, bucketCapacity, refillPerSecond) >= bucketCapacity,
    );
    if (!isNew) {
      bucket.tokens = refillTokens(bucket.tokens, bucket.updatedAt, at, bucketCapacity, refillPerSecond);
      bucket.updatedAt = at;
      let burstWindowMs = (bucketCapacity / Math.max(refillPerSecond, 0.000000001)) * 1000;
      if (bucket.tokens >= bucketCapacity || at - bucket.burstStartedAt > burstWindowMs) {
        bucket.sentInBurst = 0;
        bucket.burstStartedAt = at;
      }
    }
    return bucket;
  }
  function reserve(key) {
    let bucket = limiter(key, now());
    if (!hasToken(bucket.tokens))
      return {
        ok: false,
        sentInBurst: bucket.sentInBurst,
      };
    bucket.tokens -= 1;
    bucket.sentInBurst += 1;
    let reservedBucket = bucket;
    let refunded = false;
    return {
      ok: true,
      refund: () => {
        if (refunded) return;
        refunded = true;
        reservedBucket.tokens = Math.min(getPeerGuardLimits().bucketCapacity, reservedBucket.tokens + 1);
        reservedBucket.sentInBurst = Math.max(0, reservedBucket.sentInBurst - 1);
      },
    };
  }
  function credit(key) {
    let bucket = limiter(key, now());
    bucket.tokens = Math.min(getPeerGuardLimits().bucketCapacity, bucket.tokens + 1);
    bucket.sentInBurst = Math.max(0, bucket.sentInBurst - 1);
  }
  function debit(key) {
    let bucket = limiter(key, now());
    bucket.tokens = Math.max(0, bucket.tokens - 1);
    bucket.sentInBurst += 1;
  }
  return {
    reserve,
    credit,
    debit,
  };
}
//@ chunk-66jn0ssz.js:8790-8850 placement
var NO_LIVE_INBOX = "no_live_inbox";
var ENOINBOX = "ENOINBOX";
var MESSAGE_TOO_LARGE = "message_too_large";
//@ chunk-66jn0ssz.js:8850-9241 placement
function describeMessageTooLarge(a, b) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `Message too large for cross-session delivery: the serialized message is ${a.toLocaleString("en-US")} characters and the limit is ${b.toLocaleString("en-US")}. Shorten the message text \u2014 put bulk content in a file the recipient can read rather than in the message \u2014 or split it into smaller messages.`,
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
function isInboxGoneError(error) {
  let errnoCode = getErrnoCode(error);
  return (
    errnoCode === "ENOENT" ||
    errnoCode === "ECONNREFUSED" ||
    (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
      error.errorClass === NO_LIVE_INBOX)
  );
}
//@ chunk-66jn0ssz.js:9793-9934 placement
let NoLiveInboxError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-66jn0ssz.js:9793", () => {
  NoLiveInboxError = class NoLiveInboxError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    kind;
    constructor(kind, message) {
      super(message, "no live inbox registered for the target pipe", NO_LIVE_INBOX);
      this.name = "NoLiveInboxError";
      this.kind = kind;
    }
  };
});
//@ chunk-66jn0ssz.js:9934-9993 placement
/**
 * 是否是「收件箱不可用」错误。
 */
function isUnusableInboxError(error) {
  return error instanceof NoLiveInboxError && error.kind === "unusable";
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
function staleSocketHint(text) {
  return ` \u2014 the peer process may have restarted, so this socket path is stale. Call ${text} to get the current address.`;
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
  constructor(refusal, message) {
    super(message);
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
function isFormerNameEntry(entry) {
  if (typeof entry !== "object" || entry === null) return false;
  let { name, until, sessionId } = entry;
  return (
    typeof name === "string" &&
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
    .map(({ name, until, sessionId }) => ({
      name: truncateToLength(name, MAX_SEED_NAME_CHARS),
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
