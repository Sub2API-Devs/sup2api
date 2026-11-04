/**
 * services/artifacts/artifactNotices.ts
 *
 * 2.1.316 新增。Artifact 变更通知合并与入队。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xf84t5b0.js (28)
 * attribution: placement 28
 */
import { randomUUID, createHmac } from "crypto";
import {
  autoRepliedNotice,
  autoEditedNotice,
  artifactChangedNotice,
  ARTIFACT_CHANGED,
} from "../../tools/ArtifactTool/artifactNotices.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { newLaneNoticeId } from "./commentReads.js";
import { formatTaskNotification } from "../../utils/xmlTags.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { mainAgentId, getSessionId } from "../../bootstrap/state.js";
import { getOrCreateSummonSidKey } from "../../utils/config.js";
import { TIMESTAMP_TEXT_RE } from "./comments/commentFormatting.js";
import { parseTimestamp } from "./comments/commentState.js";
import { getCommandQueue } from "../../utils/messageQueueManager.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { ARTIFACT_SLUG_RE } from "../../tools/ArtifactTool/constants.js";
import { readSummonStatus } from "./comments/commentReply.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-xf84t5b0.js:1236-1262 placement
/**
 * artifact 通知的聚合参数：默认 15 s、最长 60 s 结算窗口、最多保留 20 条明细。
 */
var DEFAULT_SETTLE_MS = 15000;
var MAX_SETTLE_MS = 60000;
var MAX_NOTICE_DETAILS = 20;
//@ chunk-xf84t5b0.js:1262-1356 placement
function noticeForFamily(family, artifactName, count, familyName) {
  return family === "auto-replied"
    ? autoRepliedNotice(artifactName, count)
    : family === "auto-edited"
      ? autoEditedNotice(artifactName, count)
      : artifactChangedNotice(artifactName, count, familyName);
}
//@ chunk-xf84t5b0.js:1356-2194 placement
function coalesceArtifactNotices(family) {
  let noticeCoalesce = getLiveState().noticeCoalesce;
  let entry = noticeCoalesce.get(family);
  if (entry === undefined) return;
  noticeCoalesce.delete(family);
  if (entry.timer !== undefined) clearTimeout(entry.timer);
  let line = noticeForFamily(entry.family, entry.artifactName, entry.count, entry.suppressedPrior > 0);
  let count =
    entry.droppedDetails > 0
      ? `

(${entry.droppedDetails} earlier ${entry.droppedDetails === 1 ? "notice" : "notices"} in this burst omitted \u2014 newest ${MAX_NOTICE_DETAILS} kept.)`
      : "";
  entry.queue.enqueuePendingNotification({
    uuid:
      entry.family === "artifact-changed"
        ? randomUUID()
        : newLaneNoticeId(
            undefined,
            entry.ownGestureEpoch === getLiveState().accountEpoch ? entry.slug : undefined,
          ),
    value: formatTaskNotification({
      taskType: entry.family === "artifact-changed" ? ARTIFACT_CHANGED : "artifact-auto-react",
      summary: escapeXml(line),
      body: `
${escapeXml(
  entry.details.join(`

`) + count,
)}`,
    }),
    mode: "task-notification",
    origin: {
      kind: "task-notification",
      source: entry.family === "artifact-changed" ? "artifact-changed" : "artifact-auto-react",
      slug: entry.slug,
      displayName: entry.artifactName,
      coalesced: {
        family: entry.family,
        count: entry.count,
      },
    },
    agentId: mainAgentId(),
  });
}
//@ chunk-xf84t5b0.js:2194-3097 placement
function enqueueArtifactChanged(notice) {
  let { queue, slug, family, artifactName, detail, mergeDetails } = notice;
  let now = (notice.now ?? Date.now)();
  let settleMs = notice.settle?.settleMs ?? DEFAULT_SETTLE_MS;
  let maxSettleMs = notice.settle?.maxSettleMs ?? MAX_SETTLE_MS;
  let noticeCoalesce = getLiveState().noticeCoalesce;
  let key = `${family}
${slug}`;
  let accountEpoch = getLiveState().accountEpoch;
  let entry = noticeCoalesce.get(key);
  if (entry === undefined) {
    entry = {
      slug,
      family,
      artifactName,
      mergeDetails,
      count: 0,
      threadIds: new Set(),
      firstAt: now,
      details: [],
      droppedDetails: 0,
      suppressedPrior: 0,
      ownGestureEpoch: notice.ownGesture ? accountEpoch : undefined,
      queue,
      timer: undefined,
    };
    noticeCoalesce.set(key, entry);
  } else if (!notice.ownGesture || entry.ownGestureEpoch !== accountEpoch) entry.ownGestureEpoch = undefined;
  entry.artifactName = artifactName;
  entry.queue = queue;
  if (notice.threadId !== undefined) entry.threadIds.add(notice.threadId);
  entry.count = entry.threadIds.size > 0 ? entry.threadIds.size : entry.count + 1;
  if (entry.mergeDetails === "latest") entry.details = [detail];
  else {
    entry.details.push(detail);
    if (entry.details.length > MAX_NOTICE_DETAILS) {
      entry.details.shift();
      entry.droppedDetails++;
    }
  }
  if (entry.timer !== undefined) clearTimeout(entry.timer);
  let settleAt = entry.firstAt + maxSettleMs;
  let max = Math.max(0, Math.min(settleMs, settleAt - now));
  let timer = setTimeout(coalesceArtifactNotices, max, key);
  timer.unref?.();
  entry.timer = timer;
}
//@ chunk-xf84t5b0.js:3097-3380 placement
/**
 * 取出并清除合并中的 Artifact 通知（可只取某个 slug；artifact-changed 类除外），取消其定时器，返回 {slug, family, artifactName, count} 列表。
 */
function flushCoalescedNotices(slug) {
  let noticeCoalesce = getLiveState().noticeCoalesce;
  let out = [];
  for (let [key, entry] of noticeCoalesce) {
    if (slug !== undefined && entry.slug !== slug) continue;
    if (entry.family === "artifact-changed") continue;
    if (entry.timer !== undefined) clearTimeout(entry.timer);
    noticeCoalesce.delete(key);
    out.push({
      slug: entry.slug,
      family: entry.family,
      artifactName: entry.artifactName,
      count: entry.count,
    });
  }
  return out;
}
//@ chunk-xf84t5b0.js:3380-3499 placement
/**
 * 判断某个 slug 是否还有合并中的（非 artifact-changed）通知。
 */
function hasPendingNotice(family) {
  for (let notice of getLiveState().noticeCoalesce.values())
    if (notice.slug === family && notice.family !== "artifact-changed") return true;
  return false;
}
//@ chunk-xf84t5b0.js:3499-3515 placement
/**
 * 导出常量或表 `SUMMON_STATE_TTL_MS`：值为 3600000。
 */
var SUMMON_STATE_TTL_MS = 3600000;
//@ chunk-xf84t5b0.js:3515-3563 placement
/**
 * 导出常量或表 `ROUTE_ABSENT_4001`：值为 "4001", OFt = "4503", MFt = "4403", k2n = 900000。
 */
var ROUTE_ABSENT_4001 = "4001";
var ROUTE_ABSENT_4503 = "4503";
var ROUTE_ABSENT_4403 = "4403";
var ROUTE_ABSENT_GRACE_MS = 900000;
//@ chunk-xf84t5b0.js:3563-3584 placement
/**
 * 导出常量或表 `TOKEN_MIN_GRACE_MS`：值为 300000, HBs = 3。
 */
var TOKEN_MIN_GRACE_MS = 300000;
var MAX_REALTIME_TOKEN_ATTEMPTS = 3;
//@ chunk-xf84t5b0.js:3584-3778 placement
/**
 * 用新取得的实时连接令牌建立状态：令牌、版本、账号纪元、按传输方式计算的过期时间，以及打开/失败拨号/探测标志。
 */
function createLiveTokenState(lease) {
  let { transport, token, ver, accountEpoch, expUnixSeconds, receivedAtMs } = lease;
  return {
    transport,
    token,
    expMs: computeTokenExpiry(transport, expUnixSeconds, receivedAtMs),
    ver,
    accountEpoch,
    opened: false,
    failedDials: 0,
    probed: false,
  };
}
//@ chunk-xf84t5b0.js:3778-3895 placement
/**
 * 用新令牌刷新状态：更新令牌与过期时间，重置探测标志与失败拨号计数。
 */
function refreshLiveTokenState(state, refresh) {
  state.token = refresh.token;
  state.expMs = computeTokenExpiry(state.transport, refresh.expUnixSeconds, refresh.receivedAtMs);
  state.probed = false;
  state.failedDials = 0;
}
//@ chunk-xf84t5b0.js:3895-4032 placement
function computeTokenExpiry(transport, expUnixSeconds, receivedAtMs) {
  let syncTtl = transport === "sync" ? 900000 : 3600000;
  let liveTtl = transport === "sync" ? 300000 : 1800000;
  let expiresInMs = expUnixSeconds === undefined ? syncTtl : expUnixSeconds * 1000 - receivedAtMs;
  return receivedAtMs + Math.min(syncTtl, Math.max(liveTtl, expiresInMs));
}
//@ chunk-xf84t5b0.js:4032-4161 placement
/**
 * 一次拨号后决定是否继续用当前令牌：已过期或被拒为否；健康则清零失败计数为是；否则累加失败，未满 3 次为是。
 */
function shouldRetryDial(lease, options) {
  if (options.expired || options.refused) return false;
  if (options.healthy) {
    lease.failedDials = 0;
    return true;
  }
  lease.failedDials++;
  return lease.failedDials < 3;
}
//@ chunk-xf84t5b0.js:4161-4183 placement
var TOKEN_HANDSHAKE_GRACE_MS = 60000;
var SYNC_TOKEN_DECAY_MS = 60000;
//@ chunk-xf84t5b0.js:4183-4325 placement
/**
 * 判断实时令牌还能用：账号纪元一致，且距过期至少还有握手+最短运行时间（sync 传输用固定余量）。
 */
function isLiveTokenFresh(lease, rewatchTiming, accountEpoch, nowMs = Date.now()) {
  let elapsed =
    lease.transport === "sync"
      ? SYNC_TOKEN_DECAY_MS
      : rewatchTiming.handshakeDeadlineMs + rewatchTiming.minUptimeMs + TOKEN_HANDSHAKE_GRACE_MS;
  return lease.accountEpoch === accountEpoch && lease.expMs - nowMs >= elapsed;
}
//@ chunk-xf84t5b0.js:4325-4665 placement
/**
 * 计算实时连接重连等待时间：卡住时取短/长停顿区间随机值；租约模式且需要打散时在打散区间随机；否则指数退避（封顶）并加 ±25%/50% 抖动。
 */
function computeReconnectDelay(timing) {
  let { timing: timing_2, consecutiveFailures, leaseMode, spread, stalled } = timing;
  if (stalled) return randomStallDelay(timing_2, timing.longStall === true ? "long" : "short");
  if (leaseMode && spread)
    return Math.round(timing_2.spreadMinMs + Math.random() * (timing_2.spreadMaxMs - timing_2.spreadMinMs));
  let min = Math.min(timing_2.capMs, timing_2.baseMs * 2 ** Math.min(consecutiveFailures, 5));
  let jitter = leaseMode ? 0.5 : 0.25;
  return Math.max(0, Math.round(min * (1 - jitter + Math.random() * 2 * jitter)));
}
//@ chunk-xf84t5b0.js:4665-4821 placement
function randomStallDelay(timing, kind = "short") {
  let minMs = kind === "long" ? timing.longStallMinMs : timing.stallMinMs;
  let maxMs = kind === "long" ? timing.longStallMaxMs : timing.stallMaxMs;
  return Math.round(minMs + Math.random() * (maxMs - minMs));
}
//@ chunk-xf84t5b0.js:4821-4887 placement
/**
 * 导出函数 `seedJitter`：参数 e，返回 Math.round(Math.random() * e.seedDeferMaxMs)。
 */
function seedJitter(rewatchTiming) {
  return Math.round(Math.random() * rewatchTiming.seedDeferMaxMs);
}
//@ chunk-xf84t5b0.js:4941-4989 placement
var SUMMON_HANDOFF_TTL_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_SUMMON_HANDOFFS;
var MAX_SAFE_INTEGER;
deferInit("chunk-xf84t5b0.js:4941", () => {
  SUMMON_HANDOFF_TTL_MS = 3600000;
  MAX_SUMMON_HANDOFFS = 64;
  MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
});
//@ chunk-xf84t5b0.js:4989-5080 placement
function summonSidForSlug(sessionId, slug, globalConfig) {
  return createHmac("sha256", getOrCreateSummonSidKey(globalConfig))
    .update(sessionId + slug, "utf8")
    .digest("hex")
    .slice(0, 16);
}
//@ chunk-xf84t5b0.js:5080-5154 placement
var ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
//@ chunk-xf84t5b0.js:5154-5415 placement
function isValidUtcTimestampParts(text) {
  let year = Number(text.slice(0, 4));
  let month = Number(text.slice(5, 7));
  let day = Number(text.slice(8, 10));
  let hour = Number(text.slice(11, 13));
  let minute = Number(text.slice(14, 16));
  let second = Number(text.slice(17, 19));
  if (month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59 || second > 59) return false;
  return new Date(Date.UTC(year, month - 1, day)).getUTCDate() === day;
}
//@ chunk-xf84t5b0.js:5415-5561 placement
/**
 * 从字符串列表里挑出格式合法、日期有效的最晚时间戳（返回原字符串）。
 */
function latestValidTimestamp(stamps) {
  let latest;
  let latestAt = -1 / 0;
  for (let stamp of stamps) {
    if (
      stamp == null ||
      !TIMESTAMP_TEXT_RE.test(stamp) ||
      !ISO_TIMESTAMP_RE.test(stamp) ||
      !isValidUtcTimestampParts(stamp)
    )
      continue;
    let timestamp = parseTimestamp(stamp);
    if (timestamp !== null && timestamp > latestAt) {
      latestAt = timestamp;
      latest = stamp;
    }
  }
  return latest;
}
//@ chunk-xf84t5b0.js:5561-5852 placement
/**
 * 登记一个评论召唤的交接项（生成 uuid）；超过上限时淘汰最早的、且不在当前队列里的交接项并打点。返回 uuid。
 */
function registerSummonHandOff(summon) {
  let { handOffs } = getLiveState().summonStatus;
  let id = randomUUID();
  handOffs.set(id, {
    ...summon,
  });
  if (handOffs.size > MAX_SUMMON_HANDOFFS) {
    let queued = new Set(getCommandQueue().map((command) => command.uuid));
    let handOff;
    for (let key of handOffs.keys())
      if (key !== id && !queued.has(key)) {
        handOff = key;
        break;
      }
    handOff ??= handOffs.keys().next().value;
    if (handOff !== undefined) {
      handOffs.delete(handOff);
      logFeatureSad("artifact_comments_autoreact", "handoff_evicted");
    }
  }
  return id;
}
//@ chunk-xf84t5b0.js:5852-6139 placement
/**
 * 对给定消息里仍挂着的召唤交接项发出 declined(auto_reply_off) 状态并移除，打点是否成功上报。
 */
function declineSweptHandOffs(commands) {
  let { handOffs } = getLiveState().summonStatus;
  for (let command of commands) {
    if (command.uuid === undefined) continue;
    let handOff = handOffs.get(command.uuid);
    if (handOff === undefined) continue;
    handOffs.delete(command.uuid);
    let emitted = emitArtifactSummonStatus(handOff, {
      status: "declined",
      reason: "auto_reply_off",
    });
    logFeatureSad("artifact_comments_autoreact", emitted ? "handoff_swept" : "handoff_swept_unreported");
  }
}
//@ chunk-xf84t5b0.js:6139-6301 placement
/**
 * 移除某个 slug 下已不在当前队列里的召唤交接项。
 */
function dropStaleHandOffs(slug) {
  let { handOffs } = getLiveState().summonStatus;
  if (handOffs.size === 0) return;
  let queued = new Set(getCommandQueue().map((command) => command.uuid));
  for (let [key, handOff] of handOffs) if (handOff.slug === slug && !queued.has(key)) handOffs.delete(key);
}
//@ chunk-xf84t5b0.js:6301-6415 placement
/**
 * 删除某 slug 某评论线程的排队唤醒。
 */
function dropQueuedWakes(slug, threadId) {
  let { queuedWakes } = getLiveState().summonStatus;
  for (let [wakeSlug, wake] of queuedWakes)
    if (wake.slug === slug && wake.threadId === threadId) queuedWakes.delete(wakeSlug);
}
//@ chunk-xf84t5b0.js:6415-7647 placement
function emitArtifactSummonStatus(status, options) {
  let { slug, threadId, gestureAt, suppressed } = status;
  if (suppressed) return false;
  let summonStatus = getLiveState().summonStatus;
  if (summonStatus.routeAbsentSince !== null) {
    if (Date.now() - summonStatus.routeAbsentSince < SUMMON_HANDOFF_TTL_MS) return false;
    summonStatus.routeAbsentSince = null;
  }
  let sid = summonStatus.sidBySlug.get(slug);
  if (sid === undefined) {
    sid = summonSidForSlug(getSessionId(), slug, status.storageV5);
    summonStatus.sidBySlug.set(slug, sid);
  }
  let reason = options.reason;
  let max = Math.max(summonStatus.seqBySid.get(sid) ?? 0, Math.floor(Date.now() / 1000) * 1000);
  if (max > MAX_SAFE_INTEGER) return false;
  summonStatus.seqBySid.set(sid, max + 1);
  let coversReply = status.coversReplyId !== undefined && !ARTIFACT_SLUG_RE.test(status.coversReplyId);
  let payload = {
    status: options.status,
    ...(reason !== undefined && {
      reason,
    }),
    ...(status.coversReplyId !== undefined &&
      !coversReply && {
        covers_reply_id: status.coversReplyId,
      }),
    ...(gestureAt !== undefined && {
      gesture_at: gestureAt,
    }),
    sid,
    seq: max,
  };
  readSummonStatus(slug, threadId, payload).then(
    (summonStatus_2) => {
      switch (summonStatus_2.kind) {
        case "accepted":
          if (coversReply) logFeatureSad("artifact_summon_status_emit", "covers_id_rejected");
          else logFeatureOk("artifact_summon_status_emit");
          return;
        case "route_absent":
          summonStatus.routeAbsentSince = Date.now();
          logFeatureSad("artifact_summon_status_emit", "route_absent");
          return;
        case "skipped":
          if (summonStatus_2.reason === "no-auth") logFeatureSad("artifact_summon_status_emit", "no_auth");
          return;
        case "unsent":
          logFeatureSad("artifact_summon_status_emit", "relay_unavailable", {
            status: summonStatus_2.status,
          });
          return;
        case "failed":
          logFeatureBad("artifact_summon_status_emit", summonStatus_2.reason, {
            ...(summonStatus_2.status !== undefined && {
              status: summonStatus_2.status,
            }),
          });
          return;
      }
    },
    () => {
      logFeatureBad("artifact_summon_status_emit", "request_error");
    },
  );
  return true;
}
export {
  dropStaleHandOffs,
  dropQueuedWakes,
  emitArtifactSummonStatus,
  registerSummonHandOff,
  latestValidTimestamp,
  ROUTE_ABSENT_GRACE_MS,
  SUMMON_STATE_TTL_MS,
  isLiveTokenFresh,
  createLiveTokenState,
  enqueueArtifactChanged,
  refreshLiveTokenState,
  seedJitter,
  ROUTE_ABSENT_4503,
  ROUTE_ABSENT_4001,
  ROUTE_ABSENT_4403,
  shouldRetryDial,
  TOKEN_MIN_GRACE_MS,
  MAX_REALTIME_TOKEN_ATTEMPTS,
  computeReconnectDelay,
  flushCoalescedNotices,
  declineSweptHandOffs,
  hasPendingNotice,
};
