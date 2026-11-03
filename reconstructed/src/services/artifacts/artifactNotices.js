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

//@ chunk-xf84t5b0.js:1236-1262 placement
/**
 * artifact 通知的聚合参数：默认 15 s、最长 60 s 结算窗口、最多保留 20 条明细。
 */
var DEFAULT_SETTLE_MS = 15000;
var MAX_SETTLE_MS = 60000;
var MAX_NOTICE_DETAILS = 20;
//@ chunk-xf84t5b0.js:1262-1356 placement
function noticeForFamily(family, artifactName, count, o) {
  return family === "auto-replied"
    ? autoRepliedNotice(artifactName, count)
    : family === "auto-edited"
      ? autoEditedNotice(artifactName, count)
      : artifactChangedNotice(artifactName, count, o);
}
//@ chunk-xf84t5b0.js:1356-2194 placement
function coalesceArtifactNotices(e) {
  let noticeCoalesce = getLiveState().noticeCoalesce;
  let t = noticeCoalesce.get(e);
  if (t === undefined) return;
  noticeCoalesce.delete(e);
  if (t.timer !== undefined) clearTimeout(t.timer);
  let o = noticeForFamily(t.family, t.artifactName, t.count, t.suppressedPrior > 0);
  let i =
    t.droppedDetails > 0
      ? `

(${t.droppedDetails} earlier ${t.droppedDetails === 1 ? "notice" : "notices"} in this burst omitted \u2014 newest ${MAX_NOTICE_DETAILS} kept.)`
      : "";
  t.queue.enqueuePendingNotification({
    uuid:
      t.family === "artifact-changed"
        ? randomUUID()
        : newLaneNoticeId(undefined, t.ownGestureEpoch === getLiveState().accountEpoch ? t.slug : undefined),
    value: formatTaskNotification({
      taskType: t.family === "artifact-changed" ? ARTIFACT_CHANGED : "artifact-auto-react",
      summary: escapeXml(o),
      body: `
${escapeXml(
  t.details.join(`

`) + i,
)}`,
    }),
    mode: "task-notification",
    origin: {
      kind: "task-notification",
      source: t.family === "artifact-changed" ? "artifact-changed" : "artifact-auto-react",
      slug: t.slug,
      displayName: t.artifactName,
      coalesced: {
        family: t.family,
        count: t.count,
      },
    },
    agentId: mainAgentId(),
  });
}
//@ chunk-xf84t5b0.js:2194-3097 placement
function enqueueArtifactChanged(e) {
  let { queue, slug, family, artifactName, detail, mergeDetails } = e;
  let h = (e.now ?? Date.now)();
  let settleMs = e.settle?.settleMs ?? DEFAULT_SETTLE_MS;
  let maxSettleMs = e.settle?.maxSettleMs ?? MAX_SETTLE_MS;
  let noticeCoalesce = getLiveState().noticeCoalesce;
  let S = `${family}
${slug}`;
  let accountEpoch = getLiveState().accountEpoch;
  let d = noticeCoalesce.get(S);
  if (d === undefined) {
    d = {
      slug,
      family,
      artifactName,
      mergeDetails,
      count: 0,
      threadIds: new Set(),
      firstAt: h,
      details: [],
      droppedDetails: 0,
      suppressedPrior: 0,
      ownGestureEpoch: e.ownGesture ? accountEpoch : undefined,
      queue,
      timer: undefined,
    };
    noticeCoalesce.set(S, d);
  } else if (!e.ownGesture || d.ownGestureEpoch !== accountEpoch) d.ownGestureEpoch = undefined;
  d.artifactName = artifactName;
  d.queue = queue;
  if (e.threadId !== undefined) d.threadIds.add(e.threadId);
  d.count = d.threadIds.size > 0 ? d.threadIds.size : d.count + 1;
  if (d.mergeDetails === "latest") d.details = [detail];
  else {
    d.details.push(detail);
    if (d.details.length > MAX_NOTICE_DETAILS) {
      d.details.shift();
      d.droppedDetails++;
    }
  }
  if (d.timer !== undefined) clearTimeout(d.timer);
  let E = d.firstAt + maxSettleMs;
  let max = Math.max(0, Math.min(settleMs, E - h));
  let timer = setTimeout(coalesceArtifactNotices, max, S);
  timer.unref?.();
  d.timer = timer;
}
//@ chunk-xf84t5b0.js:3097-3380 placement
/**
 * 取出并清除合并中的 Artifact 通知（可只取某个 slug；artifact-changed 类除外），取消其定时器，返回 {slug, family, artifactName, count} 列表。
 */
function flushCoalescedNotices(e) {
  let noticeCoalesce = getLiveState().noticeCoalesce;
  let t = [];
  for (let [o, i] of noticeCoalesce) {
    if (e !== undefined && i.slug !== e) continue;
    if (i.family === "artifact-changed") continue;
    if (i.timer !== undefined) clearTimeout(i.timer);
    noticeCoalesce.delete(o);
    t.push({
      slug: i.slug,
      family: i.family,
      artifactName: i.artifactName,
      count: i.count,
    });
  }
  return t;
}
//@ chunk-xf84t5b0.js:3380-3499 placement
/**
 * 判断某个 slug 是否还有合并中的（非 artifact-changed）通知。
 */
function hasPendingNotice(e) {
  for (let n of getLiveState().noticeCoalesce.values())
    if (n.slug === e && n.family !== "artifact-changed") return true;
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
function createLiveTokenState(e) {
  let { transport, token, ver, accountEpoch, expUnixSeconds, receivedAtMs } = e;
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
function refreshLiveTokenState(e, n) {
  e.token = n.token;
  e.expMs = computeTokenExpiry(e.transport, n.expUnixSeconds, n.receivedAtMs);
  e.probed = false;
  e.failedDials = 0;
}
//@ chunk-xf84t5b0.js:3895-4032 placement
function computeTokenExpiry(transport, expUnixSeconds, receivedAtMs) {
  let o = transport === "sync" ? 900000 : 3600000;
  let i = transport === "sync" ? 300000 : 1800000;
  let r = expUnixSeconds === undefined ? o : expUnixSeconds * 1000 - receivedAtMs;
  return receivedAtMs + Math.min(o, Math.max(i, r));
}
//@ chunk-xf84t5b0.js:4032-4161 placement
/**
 * 一次拨号后决定是否继续用当前令牌：已过期或被拒为否；健康则清零失败计数为是；否则累加失败，未满 3 次为是。
 */
function shouldRetryDial(e, n) {
  if (n.expired || n.refused) return false;
  if (n.healthy) {
    e.failedDials = 0;
    return true;
  }
  e.failedDials++;
  return e.failedDials < 3;
}
//@ chunk-xf84t5b0.js:4161-4183 placement
var TOKEN_HANDSHAKE_GRACE_MS = 60000;
var SYNC_TOKEN_DECAY_MS = 60000;
//@ chunk-xf84t5b0.js:4183-4325 placement
/**
 * 判断实时令牌还能用：账号纪元一致，且距过期至少还有握手+最短运行时间（sync 传输用固定余量）。
 */
function isLiveTokenFresh(lease, rewatchTiming, accountEpoch, o = Date.now()) {
  let i =
    lease.transport === "sync"
      ? SYNC_TOKEN_DECAY_MS
      : rewatchTiming.handshakeDeadlineMs + rewatchTiming.minUptimeMs + TOKEN_HANDSHAKE_GRACE_MS;
  return lease.accountEpoch === accountEpoch && lease.expMs - o >= i;
}
//@ chunk-xf84t5b0.js:4325-4665 placement
/**
 * 计算实时连接重连等待时间：卡住时取短/长停顿区间随机值；租约模式且需要打散时在打散区间随机；否则指数退避（封顶）并加 ±25%/50% 抖动。
 */
function computeReconnectDelay(e) {
  let { timing, consecutiveFailures, leaseMode, spread, stalled } = e;
  if (stalled) return randomStallDelay(timing, e.longStall === true ? "long" : "short");
  if (leaseMode && spread)
    return Math.round(timing.spreadMinMs + Math.random() * (timing.spreadMaxMs - timing.spreadMinMs));
  let min = Math.min(timing.capMs, timing.baseMs * 2 ** Math.min(consecutiveFailures, 5));
  let a = leaseMode ? 0.5 : 0.25;
  return Math.max(0, Math.round(min * (1 - a + Math.random() * 2 * a)));
}
//@ chunk-xf84t5b0.js:4665-4821 placement
function randomStallDelay(timing, n = "short") {
  let t = n === "long" ? timing.longStallMinMs : timing.stallMinMs;
  let o = n === "long" ? timing.longStallMaxMs : timing.stallMaxMs;
  return Math.round(t + Math.random() * (o - t));
}
//@ chunk-xf84t5b0.js:4821-4887 placement
/**
 * 导出函数 `seedJitter`：参数 e，返回 Math.round(Math.random() * e.seedDeferMaxMs)。
 */
function seedJitter(rewatchTiming) {
  return Math.round(Math.random() * rewatchTiming.seedDeferMaxMs);
}
//@ chunk-xf84t5b0.js:4941-4989 placement
var SUMMON_HANDOFF_TTL_MS = 3600000;
var MAX_SUMMON_HANDOFFS = 64;
var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
//@ chunk-xf84t5b0.js:4989-5080 placement
function summonSidForSlug(sessionId, slug, storageV5) {
  return createHmac("sha256", getOrCreateSummonSidKey(storageV5))
    .update(sessionId + slug, "utf8")
    .digest("hex")
    .slice(0, 16);
}
//@ chunk-xf84t5b0.js:5080-5154 placement
var ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
//@ chunk-xf84t5b0.js:5154-5415 placement
function isValidUtcTimestampParts(e) {
  let n = Number(e.slice(0, 4));
  let t = Number(e.slice(5, 7));
  let o = Number(e.slice(8, 10));
  let i = Number(e.slice(11, 13));
  let r = Number(e.slice(14, 16));
  let s = Number(e.slice(17, 19));
  if (t < 1 || t > 12 || o < 1 || i > 23 || r > 59 || s > 59) return false;
  return new Date(Date.UTC(n, t - 1, o)).getUTCDate() === o;
}
//@ chunk-xf84t5b0.js:5415-5561 placement
/**
 * 从字符串列表里挑出格式合法、日期有效的最晚时间戳（返回原字符串）。
 */
function latestValidTimestamp(e) {
  let n;
  let t = -1 / 0;
  for (let o of e) {
    if (o == null || !TIMESTAMP_TEXT_RE.test(o) || !ISO_TIMESTAMP_RE.test(o) || !isValidUtcTimestampParts(o))
      continue;
    let timestamp = parseTimestamp(o);
    if (timestamp !== null && timestamp > t) {
      t = timestamp;
      n = o;
    }
  }
  return n;
}
//@ chunk-xf84t5b0.js:5561-5852 placement
/**
 * 登记一个评论召唤的交接项（生成 uuid）；超过上限时淘汰最早的、且不在当前队列里的交接项并打点。返回 uuid。
 */
function registerSummonHandOff(e) {
  let { handOffs } = getLiveState().summonStatus;
  let t = randomUUID();
  handOffs.set(t, {
    ...e,
  });
  if (handOffs.size > MAX_SUMMON_HANDOFFS) {
    let o = new Set(getCommandQueue().map((r) => r.uuid));
    let i;
    for (let key of handOffs.keys())
      if (key !== t && !o.has(key)) {
        i = key;
        break;
      }
    i ??= handOffs.keys().next().value;
    if (i !== undefined) {
      handOffs.delete(i);
      logFeatureSad("artifact_comments_autoreact", "handoff_evicted");
    }
  }
  return t;
}
//@ chunk-xf84t5b0.js:5852-6139 placement
/**
 * 对给定消息里仍挂着的召唤交接项发出 declined(auto_reply_off) 状态并移除，打点是否成功上报。
 */
function declineSweptHandOffs(e) {
  let { handOffs } = getLiveState().summonStatus;
  for (let t of e) {
    if (t.uuid === undefined) continue;
    let o = handOffs.get(t.uuid);
    if (o === undefined) continue;
    handOffs.delete(t.uuid);
    let i = emitArtifactSummonStatus(o, {
      status: "declined",
      reason: "auto_reply_off",
    });
    logFeatureSad("artifact_comments_autoreact", i ? "handoff_swept" : "handoff_swept_unreported");
  }
}
//@ chunk-xf84t5b0.js:6139-6301 placement
/**
 * 移除某个 slug 下已不在当前队列里的召唤交接项。
 */
function dropStaleHandOffs(slug) {
  let { handOffs } = getLiveState().summonStatus;
  if (handOffs.size === 0) return;
  let t = new Set(getCommandQueue().map((o) => o.uuid));
  for (let [o, i] of handOffs) if (i.slug === slug && !t.has(o)) handOffs.delete(o);
}
//@ chunk-xf84t5b0.js:6301-6415 placement
/**
 * 删除某 slug 某评论线程的排队唤醒。
 */
function dropQueuedWakes(slug, threadId) {
  let { queuedWakes } = getLiveState().summonStatus;
  for (let [o, i] of queuedWakes) if (i.slug === slug && i.threadId === threadId) queuedWakes.delete(o);
}
//@ chunk-xf84t5b0.js:6415-7647 placement
function emitArtifactSummonStatus(e, n) {
  let { slug, threadId, gestureAt, suppressed } = e;
  if (suppressed) return false;
  let summonStatus = getLiveState().summonStatus;
  if (summonStatus.routeAbsentSince !== null) {
    if (Date.now() - summonStatus.routeAbsentSince < SUMMON_HANDOFF_TTL_MS) return false;
    summonStatus.routeAbsentSince = null;
  }
  let a = summonStatus.sidBySlug.get(slug);
  if (a === undefined) {
    a = summonSidForSlug(getSessionId(), slug, e.storageV5);
    summonStatus.sidBySlug.set(slug, a);
  }
  let reason = n.reason;
  let max = Math.max(summonStatus.seqBySid.get(a) ?? 0, Math.floor(Date.now() / 1000) * 1000);
  if (max > MAX_SAFE_INTEGER) return false;
  summonStatus.seqBySid.set(a, max + 1);
  let u = e.coversReplyId !== undefined && !ARTIFACT_SLUG_RE.test(e.coversReplyId);
  let y = {
    status: n.status,
    ...(reason !== undefined && {
      reason,
    }),
    ...(e.coversReplyId !== undefined &&
      !u && {
        covers_reply_id: e.coversReplyId,
      }),
    ...(gestureAt !== undefined && {
      gesture_at: gestureAt,
    }),
    sid: a,
    seq: max,
  };
  readSummonStatus(slug, threadId, y).then(
    (summonStatus_2) => {
      switch (summonStatus_2.kind) {
        case "accepted":
          if (u) logFeatureSad("artifact_summon_status_emit", "covers_id_rejected");
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
