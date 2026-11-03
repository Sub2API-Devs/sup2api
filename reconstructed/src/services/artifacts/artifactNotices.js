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
import { randomUUID, randomUUID as randomUUID_2, createHmac } from "crypto";
import {
  autoRepliedNotice,
  autoEditedNotice,
  artifactChangedNotice,
  ARTIFACT_CHANGED,
} from "../../tools/ArtifactTool/artifactNotices.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { hqn } from "./commentReads.js";
import { formatTaskNotification } from "../../utils/xmlTags.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { mainAgentId, getSessionId } from "../../bootstrap/state.js";
import { getOrCreateSummonSidKey } from "../../utils/config.js";
import { RZe } from "./comments/commentFormatting.js";
import { parseTimestamp } from "./comments/commentState.js";
import { oO } from "../../utils/messageQueueManager.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { ARTIFACT_SLUG_RE } from "../../tools/ArtifactTool/constants.js";
import { readSummonStatus } from "./comments/commentReply.js";

//@ chunk-xf84t5b0.js:1236-1262 placement
var J = 15000,
  te = 60000,
  B = 20;
//@ chunk-xf84t5b0.js:1262-1356 placement
function oe(e, n, t, o) {
  return e === "auto-replied"
    ? autoRepliedNotice(n, t)
    : e === "auto-edited"
      ? autoEditedNotice(n, t)
      : artifactChangedNotice(n, t, o);
}
//@ chunk-xf84t5b0.js:1356-2194 placement
function coalesceArtifactNotices(e) {
  let noticeCoalesce = getLiveState().noticeCoalesce,
    t = noticeCoalesce.get(e);
  if (t === void 0) return;
  if ((noticeCoalesce.delete(e), t.timer !== void 0)) clearTimeout(t.timer);
  let o = oe(t.family, t.artifactName, t.count, t.suppressedPrior > 0),
    i =
      t.droppedDetails > 0
        ? `

(${t.droppedDetails} earlier ${t.droppedDetails === 1 ? "notice" : "notices"} in this burst omitted \u2014 newest ${B} kept.)`
        : "";
  t.queue.enqueuePendingNotification({
    uuid:
      t.family === "artifact-changed"
        ? randomUUID()
        : hqn(void 0, t.ownGestureEpoch === getLiveState().accountEpoch ? t.slug : void 0),
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
      coalesced: { family: t.family, count: t.count },
    },
    agentId: mainAgentId(),
  });
}
//@ chunk-xf84t5b0.js:2194-3097 placement
function enqueueArtifactChanged(e) {
  let {
      queue: queue,
      slug: slug,
      family: family,
      artifactName: artifactName,
      detail: detail,
      mergeDetails: mergeDetails,
    } = e,
    h = (e.now ?? Date.now)(),
    p = e.settle?.settleMs ?? J,
    u = e.settle?.maxSettleMs ?? te,
    noticeCoalesce = getLiveState().noticeCoalesce,
    S = `${family}
${slug}`,
    accountEpoch = getLiveState().accountEpoch,
    d = noticeCoalesce.get(S);
  if (d === void 0)
    ((d = {
      slug: slug,
      family: family,
      artifactName: artifactName,
      mergeDetails: mergeDetails,
      count: 0,
      threadIds: new Set(),
      firstAt: h,
      details: [],
      droppedDetails: 0,
      suppressedPrior: 0,
      ownGestureEpoch: e.ownGesture ? accountEpoch : void 0,
      queue: queue,
      timer: void 0,
    }),
      noticeCoalesce.set(S, d));
  else if (!e.ownGesture || d.ownGestureEpoch !== accountEpoch) d.ownGestureEpoch = void 0;
  if (((d.artifactName = artifactName), (d.queue = queue), e.threadId !== void 0))
    d.threadIds.add(e.threadId);
  if (((d.count = d.threadIds.size > 0 ? d.threadIds.size : d.count + 1), d.mergeDetails === "latest"))
    d.details = [detail];
  else if ((d.details.push(detail), d.details.length > B)) (d.details.shift(), d.droppedDetails++);
  if (d.timer !== void 0) clearTimeout(d.timer);
  let E = d.firstAt + u,
    max = Math.max(0, Math.min(p, E - h)),
    k = setTimeout(coalesceArtifactNotices, max, S);
  (k.unref?.(), (d.timer = k));
}
/**
 * 取出并清除合并中的 Artifact 通知（可只取某个 slug；artifact-changed 类除外），取消其定时器，返回 {slug, family, artifactName, count} 列表。
 */
//@ chunk-xf84t5b0.js:3097-3380 placement
function flushCoalescedNotices(e) {
  let noticeCoalesce = getLiveState().noticeCoalesce,
    t = [];
  for (let [o, i] of noticeCoalesce) {
    if (e !== void 0 && i.slug !== e) continue;
    if (i.family === "artifact-changed") continue;
    if (i.timer !== void 0) clearTimeout(i.timer);
    (noticeCoalesce.delete(o),
      t.push({ slug: i.slug, family: i.family, artifactName: i.artifactName, count: i.count }));
  }
  return t;
}
/**
 * 判断某个 slug 是否还有合并中的（非 artifact-changed）通知。
 */
//@ chunk-xf84t5b0.js:3380-3499 placement
function hasPendingNotice(e) {
  for (let n of getLiveState().noticeCoalesce.values())
    if (n.slug === e && n.family !== "artifact-changed") return !0;
  return !1;
}
//@ chunk-xf84t5b0.js:3499-3515 placement
var PLr = 3600000;
//@ chunk-xf84t5b0.js:3515-3563 placement
var DBs = "4001",
  OFt = "4503",
  MFt = "4403",
  k2n = 900000;
//@ chunk-xf84t5b0.js:3563-3584 placement
var LBs = 300000,
  HBs = 3;
/**
 * 用新取得的实时连接令牌建立状态：令牌、版本、账号纪元、按传输方式计算的过期时间，以及打开/失败拨号/探测标志。
 */
//@ chunk-xf84t5b0.js:3584-3778 placement
function createLiveTokenState(e) {
  let {
    transport: transport,
    token: token,
    ver: ver,
    accountEpoch: accountEpoch,
    expUnixSeconds: expUnixSeconds,
    receivedAtMs: receivedAtMs,
  } = e;
  return {
    transport: transport,
    token: token,
    expMs: computeTokenExpiry(transport, expUnixSeconds, receivedAtMs),
    ver: ver,
    accountEpoch: accountEpoch,
    opened: !1,
    failedDials: 0,
    probed: !1,
  };
}
/**
 * 用新令牌刷新状态：更新令牌与过期时间，重置探测标志与失败拨号计数。
 */
//@ chunk-xf84t5b0.js:3778-3895 placement
function refreshLiveTokenState(e, n) {
  ((e.token = n.token),
    (e.expMs = computeTokenExpiry(e.transport, n.expUnixSeconds, n.receivedAtMs)),
    (e.probed = !1),
    (e.failedDials = 0));
}
//@ chunk-xf84t5b0.js:3895-4032 placement
function computeTokenExpiry(e, n, t) {
  let o = e === "sync" ? 900000 : 3600000,
    i = e === "sync" ? 300000 : 1800000,
    r = n === void 0 ? o : n * 1000 - t;
  return t + Math.min(o, Math.max(i, r));
}
/**
 * 一次拨号后决定是否继续用当前令牌：已过期或被拒为否；健康则清零失败计数为是；否则累加失败，未满 3 次为是。
 */
//@ chunk-xf84t5b0.js:4032-4161 placement
function shouldRetryDial(e, n) {
  if (n.expired || n.refused) return !1;
  if (n.healthy) return ((e.failedDials = 0), !0);
  return (e.failedDials++, e.failedDials < 3);
}
//@ chunk-xf84t5b0.js:4161-4183 placement
var ie = 60000,
  re = 60000;
/**
 * 判断实时令牌还能用：账号纪元一致，且距过期至少还有握手+最短运行时间（sync 传输用固定余量）。
 */
//@ chunk-xf84t5b0.js:4183-4325 placement
function isLiveTokenFresh(e, n, t, o = Date.now()) {
  let i = e.transport === "sync" ? re : n.handshakeDeadlineMs + n.minUptimeMs + ie;
  return e.accountEpoch === t && e.expMs - o >= i;
}
/**
 * 计算实时连接重连等待时间：卡住时取短/长停顿区间随机值；租约模式且需要打散时在打散区间随机；否则指数退避（封顶）并加 ±25%/50% 抖动。
 */
//@ chunk-xf84t5b0.js:4325-4665 placement
function computeReconnectDelay(e) {
  let {
    timing: timing,
    consecutiveFailures: consecutiveFailures,
    leaseMode: leaseMode,
    spread: spread,
    stalled: stalled,
  } = e;
  if (stalled) return randomStallDelay(timing, e.longStall === !0 ? "long" : "short");
  if (leaseMode && spread)
    return Math.round(timing.spreadMinMs + Math.random() * (timing.spreadMaxMs - timing.spreadMinMs));
  let min = Math.min(timing.capMs, timing.baseMs * 2 ** Math.min(consecutiveFailures, 5)),
    a = leaseMode ? 0.5 : 0.25;
  return Math.max(0, Math.round(min * (1 - a + Math.random() * 2 * a)));
}
//@ chunk-xf84t5b0.js:4665-4821 placement
function randomStallDelay(e, n = "short") {
  let t = n === "long" ? e.longStallMinMs : e.stallMinMs,
    o = n === "long" ? e.longStallMaxMs : e.stallMaxMs;
  return Math.round(t + Math.random() * (o - t));
}
//@ chunk-xf84t5b0.js:4821-4887 placement
function UBs(e) {
  return Math.round(Math.random() * e.seedDeferMaxMs);
}
//@ chunk-xf84t5b0.js:4941-4989 placement
var de = 3600000,
  ce = 64,
  MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
//@ chunk-xf84t5b0.js:4989-5080 placement
function me(e, n, t) {
  return createHmac("sha256", getOrCreateSummonSidKey(t))
    .update(e + n, "utf8")
    .digest("hex")
    .slice(0, 16);
}
//@ chunk-xf84t5b0.js:5080-5154 placement
var fe = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
//@ chunk-xf84t5b0.js:5154-5415 placement
function isValidUtcTimestampParts(e) {
  let n = Number(e.slice(0, 4)),
    t = Number(e.slice(5, 7)),
    o = Number(e.slice(8, 10)),
    i = Number(e.slice(11, 13)),
    r = Number(e.slice(14, 16)),
    s = Number(e.slice(17, 19));
  if (t < 1 || t > 12 || o < 1 || i > 23 || r > 59 || s > 59) return !1;
  return new Date(Date.UTC(n, t - 1, o)).getUTCDate() === o;
}
/**
 * 从字符串列表里挑出格式合法、日期有效的最晚时间戳（返回原字符串）。
 */
//@ chunk-xf84t5b0.js:5415-5561 placement
function latestValidTimestamp(e) {
  let n,
    t = -1 / 0;
  for (let o of e) {
    if (o == null || !RZe.test(o) || !fe.test(o) || !isValidUtcTimestampParts(o)) continue;
    let i = parseTimestamp(o);
    if (i !== null && i > t) ((t = i), (n = o));
  }
  return n;
}
/**
 * 登记一个评论召唤的交接项（生成 uuid）；超过上限时淘汰最早的、且不在当前队列里的交接项并打点。返回 uuid。
 */
//@ chunk-xf84t5b0.js:5561-5852 placement
function registerSummonHandOff(e) {
  let { handOffs: handOffs } = getLiveState().summonStatus,
    t = randomUUID_2();
  if ((handOffs.set(t, { ...e }), handOffs.size > ce)) {
    let o = new Set(oO().map((r) => r.uuid)),
      i;
    for (let r of handOffs.keys())
      if (r !== t && !o.has(r)) {
        i = r;
        break;
      }
    if (((i ??= handOffs.keys().next().value), i !== void 0))
      (handOffs.delete(i), logFeatureSad("artifact_comments_autoreact", "handoff_evicted"));
  }
  return t;
}
/**
 * 对给定消息里仍挂着的召唤交接项发出 declined(auto_reply_off) 状态并移除，打点是否成功上报。
 */
//@ chunk-xf84t5b0.js:5852-6139 placement
function declineSweptHandOffs(e) {
  let { handOffs: handOffs } = getLiveState().summonStatus;
  for (let t of e) {
    if (t.uuid === void 0) continue;
    let o = handOffs.get(t.uuid);
    if (o === void 0) continue;
    handOffs.delete(t.uuid);
    let i = emitArtifactSummonStatus(o, { status: "declined", reason: "auto_reply_off" });
    logFeatureSad("artifact_comments_autoreact", i ? "handoff_swept" : "handoff_swept_unreported");
  }
}
/**
 * 移除某个 slug 下已不在当前队列里的召唤交接项。
 */
//@ chunk-xf84t5b0.js:6139-6301 placement
function dropStaleHandOffs(e) {
  let { handOffs: handOffs } = getLiveState().summonStatus;
  if (handOffs.size === 0) return;
  let t = new Set(oO().map((o) => o.uuid));
  for (let [o, i] of handOffs) if (i.slug === e && !t.has(o)) handOffs.delete(o);
}
/**
 * 删除某 slug 某评论线程的排队唤醒。
 */
//@ chunk-xf84t5b0.js:6301-6415 placement
function dropQueuedWakes(e, n) {
  let { queuedWakes: queuedWakes } = getLiveState().summonStatus;
  for (let [o, i] of queuedWakes) if (i.slug === e && i.threadId === n) queuedWakes.delete(o);
}
//@ chunk-xf84t5b0.js:6415-7647 placement
function emitArtifactSummonStatus(e, n) {
  let { slug: slug, threadId: threadId, gestureAt: gestureAt, suppressed: suppressed } = e;
  if (suppressed) return !1;
  let summonStatus = getLiveState().summonStatus;
  if (summonStatus.routeAbsentSince !== null) {
    if (Date.now() - summonStatus.routeAbsentSince < de) return !1;
    summonStatus.routeAbsentSince = null;
  }
  let a = summonStatus.sidBySlug.get(slug);
  if (a === void 0) ((a = me(getSessionId(), slug, e.storageV5)), summonStatus.sidBySlug.set(slug, a));
  let reason = n.reason,
    max = Math.max(summonStatus.seqBySid.get(a) ?? 0, Math.floor(Date.now() / 1000) * 1000);
  if (max > MAX_SAFE_INTEGER) return !1;
  summonStatus.seqBySid.set(a, max + 1);
  let u = e.coversReplyId !== void 0 && !ARTIFACT_SLUG_RE.test(e.coversReplyId),
    y = {
      status: n.status,
      ...(reason !== void 0 && { reason: reason }),
      ...(e.coversReplyId !== void 0 && !u && { covers_reply_id: e.coversReplyId }),
      ...(gestureAt !== void 0 && { gesture_at: gestureAt }),
      sid: a,
      seq: max,
    };
  return (
    readSummonStatus(slug, threadId, y).then(
      (S) => {
        switch (S.kind) {
          case "accepted":
            if (u) logFeatureSad("artifact_summon_status_emit", "covers_id_rejected");
            else logFeatureOk("artifact_summon_status_emit");
            return;
          case "route_absent":
            ((summonStatus.routeAbsentSince = Date.now()),
              logFeatureSad("artifact_summon_status_emit", "route_absent"));
            return;
          case "skipped":
            if (S.reason === "no-auth") logFeatureSad("artifact_summon_status_emit", "no_auth");
            return;
          case "unsent":
            logFeatureSad("artifact_summon_status_emit", "relay_unavailable", { status: S.status });
            return;
          case "failed":
            logFeatureBad("artifact_summon_status_emit", S.reason, {
              ...(S.status !== void 0 && { status: S.status }),
            });
            return;
        }
      },
      () => {
        logFeatureBad("artifact_summon_status_emit", "request_error");
      },
    ),
    !0
  );
}

export {
  dropStaleHandOffs,
  dropQueuedWakes,
  emitArtifactSummonStatus,
  registerSummonHandOff,
  latestValidTimestamp,
  k2n,
  PLr,
  isLiveTokenFresh,
  createLiveTokenState,
  enqueueArtifactChanged,
  refreshLiveTokenState,
  UBs,
  OFt,
  DBs,
  MFt,
  shouldRetryDial,
  LBs,
  HBs,
  computeReconnectDelay,
  flushCoalescedNotices,
  declineSweptHandOffs,
  hasPendingNotice,
};
