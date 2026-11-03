/**
 * services/artifacts/frameLive.ts
 *
 * Artifact 实时订阅管理（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aqdf5t3e.js (63)
 * attribution: placement 63
 */
import { addWithLimit, jXn, setWithLimit, HGr, FGr, NGr } from "../../utils/cronTasks.js";
import { getLiveState, FT, Yyi, qyi } from "../liveReplica/liveReplica.js";
import { jsonParseRaw, jsonStringify } from "../../utils/slowOperations.js";
import {
  PRESENCE_EVENT_SCHEMA,
  TOKEN_REFRESH_SCHEMA,
  isAgentCapToken,
  DECLINE_REASON_SCHEMA,
  TOKEN_LINEAGE_EXPIRED,
  parseCapTokenOwner,
  getCapTokenSeq,
  getSyncSocketUrl,
  FRAME_SYNC_V1,
  $t,
  addAgentActivitySink,
  addActivitySender,
  Qe,
  Bn,
} from "./presenceSocket.js";
import {
  INVALIDATION_EVENT_SCHEMA,
  INVALIDATE_TAG_LIVE,
  INVALIDATE_TAG_SHARED,
  INVALIDATE_TAG_HEAD,
  COMMENTS_READ_STATE_SCHEMA,
  hasHumanMessageContaining,
  at,
  adjustKeepaliveForIdle,
  jt,
  armArtifactPresence,
} from "./artifactPresence.js";
import {
  isSlugStopped,
  isSlugSwept,
  isSlugOrphaned,
  clearSummonWakeTimers,
  bumpScanGeneration,
  isSlugYielded,
  sweepSlug,
  emitSummonArm,
  stopSummonWakes,
  resumeSummonWakes,
  getSummonWakeState,
  isSlugStoppedAnywhere,
  stopGeneration,
  forgetYieldedSlug,
} from "./summonArms.js";
import {
  LFt,
  isMonitorWsTaskLive,
  eW,
  stopMonitorWsTasks,
  isAutoReactArmedTask,
  clearOrphanedAutoReactNotices,
  closeAllMonitorSockets,
  GBs,
  YBs,
  zBs,
  artifactWatchStopNotice,
} from "../../tasks/MonitorWsTask/MonitorWsTask.js";
import { isAutoreactArmed, disarmAutoreact, cUs, isAutoReactEnabled } from "./comments/postReply.js";
import {
  setLedgerStorage,
  flushAutoreactLedger,
  retireAutoreactLedger,
  initAutoreactLedger,
  forgetArtifactAndFlush,
} from "./comments/autoreactLedger.js";
import {
  resetAutoReactForSlug,
  scheduleThreadScan,
  quoteArtifactName,
  settleEmptyArtifact,
} from "./comments/threadScanner.js";
import {
  demoteExplicitWatch,
  removeSupervisor,
  endWatch,
  NO_AUTO_RETURN_ADVICE,
  Ar,
  MADE_ROOM_PHRASE,
  stopWatchesForSlug,
  armedViaWording,
  labelledArmedVia,
  kr,
  upsertSupervisor,
  mergeAutoReactWiring,
  skipArm,
  stopWatchFromTask,
  isHumanTurnWiringStale,
  describeSubscribeFailure,
  qi,
  createLiveEventHandlers,
  FRAME_LIVE_V1,
  zi,
  PAUSE_AUTO_REPLIES_HINT,
  UNINTENDED_RESUME_HINT,
  io,
  AUTO_REPLY_RESUMED_WINDOW_MS,
  ro,
  describeResumedWatchFailure,
  describeSkippedResume,
  endStoppedWatch,
  frameLiveSkipReasonPhrase,
  noRewatchAdvice,
  SKIP_REASON_PHRASES,
} from "./frameLiveWording.js";
import { hasWatchArtifactArg, stripWatchArtifactArgs } from "../../cli/watchArtifactArgs.js";
import {
  autoReactNoticeLatchedAt,
  markAutoReactNoticePending,
  recordUnaccountedComments,
} from "./shareEntries.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { isMonitorShellTask, AGENT_TASK_TYPES } from "../../tasks/taskKinds.js";
import { hasActiveAutoReactWatch } from "../artifactComments/autoReplyNotices.js";
import {
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
} from "./artifactNotices.js";
import { isArtifactScanBusy, isCommentAutoreactOptedIn } from "./comments/autoreactGates.js";
import { forgetCommentMonitorIntents, LRo, DRo, HRo, armCommentMonitorIntent, v5 } from "./commentMonitor.js";
import {
  setReplConfigArgv,
  getReplConfigArgv,
  mainAgentId,
  getSessionId,
  getIsNonInteractiveSession,
} from "../../bootstrap/state.js";
import { enqueuePendingNotification, kb } from "../../utils/messageQueueManager.js";
import { formatTaskNotification } from "../../utils/xmlTags.js";
import { ARTIFACT_WATCH_LIFECYCLE } from "../../constants/xml.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { VFs } from "./comments/threadPrompts.js";
import { B9 } from "./comments/repliesConsent.js";
import { isUserDrivenTurn, isStrictHumanTurn } from "../../utils/turnOrigin.js";
import { isActingAsBgJob } from "../../utils/concurrentSessions.js";
import { recordOwnPublish, isVouchedOwnVer } from "./ownPublishes.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import {
  pickMonitorContext,
  runWebSocketMonitor,
  parseUpgradeRejection,
} from "../../tools/MonitorTool/websocketMonitor.js";
import { mainObservedArtifactVersion } from "./readObservation.js";
import { isFrameLiveSubscribeEnabled, isFrameLiveTokenLeaseEnabled } from "./frameFlags.js";
import { env } from "../../utils/env.js";
import { lCi, claudeAiEnvironment } from "../../constants/claudeAiOrigin.js";
import { wsEgressDenyReason } from "../../tools/MonitorTool/MonitorTool.js";
import { ARTIFACT_SLUG_RE } from "../../tools/ArtifactTool/constants.js";
import { readFreshOauthAccountFromDisk } from "../../utils/config.js";
import { sameOwnerAccount } from "../../utils/auth.js";
import { renewWatchToken, fetchLiveSubscription, recordHeardVersion } from "./liveSubscribe.js";
import { B5 } from "./orgScope.js";
import { sanitizeArtifactTitle } from "../../tools/ArtifactTool/artifactUrls.js";
import { hqn } from "./commentReads.js";
import { getUserAgent } from "../../utils/http.js";
import { FWr, u6s, y6s } from "../../tools/ArtifactTool/artifactNotices.js";
import { forgetDeliveredSlug, startYieldClaim } from "./replyYield.js";
import { findLiveReplyHolder } from "./comments/replyYield.js";
import { getTaskAssignmentSummary } from "../../components/messages/TaskAssignmentMessage.js";
import { logError } from "../../utils/log.js";
import { bDr, describeWatchError } from "./durableWatch.js";
import { Xb } from "./artifactAvailability.js";
import { QUERY } from "../mcp/firstPartyServerIds.js";

//@ chunk-aqdf5t3e.js:7727-7806 placement = listAllCronTasks (0.609)
function claimArmFailureAnnouncement(e, n) {
  return addWithLimit(getLiveState().durable.announcedArmFailures, `${e}:${n}`, jXn);
}
/**
 * 返回逐行处理器：对以 { 开头的行解析 JSON，comment 类型回调 comment()，ver 字段回调 ver(v,'live')，其他忽略。旧版名 splitCommandWithOperators 误配，属 frameLive 相关模块。
 */
//@ chunk-aqdf5t3e.js:38633-38869 placement = splitCommandWithOperators (0.316)
function makeLiveVersionLineHandler(command) {
  return (match) => {
    if (!match.startsWith("{")) return null;
    let r;
    try {
      r = jsonParseRaw(match);
    } catch {
      return null;
    }
    if (r.kind === "comment") return (command.comment(), null);
    if (r.kind === "summon") return null;
    if (typeof r.ver === "string") command.ver(r.ver, "live");
    return null;
  };
}
//@ chunk-aqdf5t3e.js:38869-38889 placement
var lo = /^\d{1,15}$/;
//@ chunk-aqdf5t3e.js:38889-38946 placement
function Ve(e) {
  return getLiveState().liveDocWatch.headSinks.get(e);
}
/**
 * 更新实时订阅监督器的最近活动时间（已停止、经 MCP 写入布防或订阅进行中时不更新）。
 */
//@ chunk-aqdf5t3e.js:38946-39110 placement
function touchSupervisorActivity(e) {
  let live = getLiveState().live,
    r = live.supervisors.get(e);
  if (r !== void 0 && !r.stopped && r.armedVia !== "mcp_write" && !live.inFlightSubscribes.has(e))
    r.lastActivityAt = Date.now();
}
//@ chunk-aqdf5t3e.js:39110-40054 placement
function handleFrameLiveControl(e, n, r) {
  return (s) => {
    if (s.charCodeAt(0) !== 123) return null;
    let h;
    try {
      h = jsonParseRaw(s);
    } catch {
      return null;
    }
    let safeParse = PRESENCE_EVENT_SCHEMA().safeParse(h);
    if (!safeParse.success) return null;
    let { kind: kind, actor: actor, payload: payload } = safeParse.data;
    if (actor !== void 0 || (safeParse.data.slug !== void 0 && safeParse.data.slug !== n)) return null;
    switch (kind) {
      case "ctrl:comment":
        return (e.comment(), null);
      case "ctrl:invalidate": {
        let safeParse = INVALIDATION_EVENT_SCHEMA().safeParse(payload);
        if (!safeParse.success) return null;
        if (safeParse.data.tag === INVALIDATE_TAG_LIVE || safeParse.data.tag === INVALIDATE_TAG_SHARED)
          e.ver(safeParse.data.ver, "sync");
        else if (safeParse.data.tag === INVALIDATE_TAG_HEAD && lo.test(safeParse.data.ver))
          (touchSupervisorActivity(n), Ve(n)?.seq(Number(safeParse.data.ver)));
        return null;
      }
      case "ctrl:token_refresh": {
        let safeParse = TOKEN_REFRESH_SCHEMA().safeParse(payload);
        if (safeParse.success && isAgentCapToken(safeParse.data.cap))
          r.onTokenRefresh(safeParse.data.cap, safeParse.data.exp);
        return null;
      }
      case "ctrl:token_refresh_declined": {
        let safeParse = DECLINE_REASON_SCHEMA().safeParse(payload);
        if (safeParse.success && safeParse.data.reason === TOKEN_LINEAGE_EXPIRED) r.onExpiryAnnounced();
        return null;
      }
      case "ctrl:comment_hint": {
        let safeParse = COMMENTS_READ_STATE_SCHEMA().safeParse(payload);
        if (safeParse.success) r.onCommentHint(safeParse.data.commentsEmpty, safeParse.data.readAtMs);
        return null;
      }
      default:
        return null;
    }
  };
}
//@ chunk-aqdf5t3e.js:40054-40203 placement
function classifyMonitorTask(e, n, r, s, h, a) {
  if (!a(e, r)) return "dead";
  return s &&
    (isSlugStopped(n)
      ? h && (e.autoReactArmed !== !0 || !isSlugSwept(n) || isSlugOrphaned(n))
      : e.autoReactArmed !== !0)
    ? "replace"
    : "keep";
}
//@ chunk-aqdf5t3e.js:40203-40247 placement
function po(e, n) {
  return LFt(e.id) && isMonitorWsTaskLive(e, n);
}
/**
 * 整理某 slug 正在运行的监听任务：已失联的停掉（标记连接丢失），需要替换的安静停掉，返回保留下来的任务 id。
 */
//@ chunk-aqdf5t3e.js:40247-40585 placement
function reconcileMonitorTasks(e, n, r, s) {
  let now = Date.now(),
    a = null;
  for (let d of Object.values(e.taskRegistry.all())) {
    if (!eW(d) || d.status !== "running" || d.frameLive?.slug !== n) continue;
    let b = classifyMonitorTask(d, n, now, r, s, isMonitorWsTaskLive);
    if (b !== "dead") {
      if (b === "replace") {
        stopMonitorWsTasks(d.id, e.taskRegistry, { quiet: !0 });
        continue;
      }
      a = d.id;
      continue;
    }
    stopMonitorWsTasks(d.id, e.taskRegistry, { quiet: !0, connectionLost: !0 });
  }
  return a;
}
//@ chunk-aqdf5t3e.js:40585-40694 placement
function hasRunningMonitor(e, n) {
  return Object.values(e.all()).some((r) => eW(r) && r.status === "running" && r.frameLive?.slug === n);
}
//@ chunk-aqdf5t3e.js:40694-40750 placement
function ho(e) {
  return isAutoReactArmedTask(e, isAutoreactArmed, { includeStopLatched: !0 });
}
//@ chunk-aqdf5t3e.js:40750-40783 placement
function isClaimableAutoReactSubscription(e) {
  return isAutoReactArmedTask(e, isAutoreactArmed);
}
//@ chunk-aqdf5t3e.js:40783-41789 placement
function killAutoReactSubscriptions(e, n) {
  (setLedgerStorage(n?.storageV5), clearSummonWakeTimers(), bumpScanGeneration());
  let live = getLiveState().live,
    s = n?.durable !== !1,
    h = 0,
    a = new Set();
  for (let d of Object.values(e.all()))
    if (ho(d)) {
      let b =
        d.autoReactSlug !== void 0 &&
        isSlugStopped(d.autoReactSlug) &&
        (!isSlugSwept(d.autoReactSlug) || isSlugYielded(d.autoReactSlug));
      if (s) {
        if ((stopMonitorWsTasks(d.id, e, { quiet: !0, userStop: !0 }), d.autoReactSlug !== void 0))
          (resetAutoReactForSlug(d.autoReactSlug), a.add(d.autoReactSlug));
      } else if (d.autoReactSlug !== void 0) a.add(d.autoReactSlug);
      if (!b && !(d.autoReactSlug !== void 0 && !s && isSlugStopped(d.autoReactSlug))) {
        if ((h++, !s && d.autoReactSlug !== void 0))
          (sweepSlug(d.autoReactSlug), emitSummonArm(live, d.autoReactSlug));
      }
    }
  for (let d of live.supervisors.values()) {
    if (d.autoReactWiring === void 0) continue;
    if (s) delete d.autoReactWiring;
    if (s && isAutoreactArmed() && (!isSlugStopped(d.slug) || a.has(d.slug)))
      if (hasRunningMonitor(e, d.slug) || live.inFlightSubscribes.has(d.slug))
        demoteExplicitWatch(live, d.slug, e);
      else (removeSupervisor(live, d.slug), hasWatchArtifactArg(d.slug, d.context.storageV5));
    if (!a.has(d.slug) && isAutoreactArmed() && !isSlugStopped(d.slug))
      if ((a.add(d.slug), h++, s)) (resetAutoReactForSlug(d.slug), stopSummonWakes(d.slug));
      else sweepSlug(d.slug);
  }
  if (s) disarmAutoreact({ storageV5: n?.storageV5 });
  else if (h > 0) flushAutoreactLedger({ flush: !0, storageV5: n?.storageV5 });
  return h;
}
/**
 * 解除某 slug 被清扫暂停的自动回复：仍有活跃自动回复监听任务时恢复召唤唤醒并广播；若有上次唤醒参数则重新安排扫描（返回 lifted），否则返回 cleared；不满足条件返回 null。
 */
//@ chunk-aqdf5t3e.js:41789-42204 placement
function liftSweptPause(e, n, r, s) {
  if (!isSlugSwept(n) || isSlugOrphaned(n) || !isAutoreactArmed()) return null;
  let h = findArmedAutoReactMonitor(e, n);
  if (h === void 0) return null;
  s?.();
  let { live: live, wakes: wakes } = getLiveState();
  (resumeSummonWakes(n), wakes.liftedAtScanGeneration.set(n, wakes.scanGeneration), emitSummonArm(live, n));
  let lastWakeArgs = getSummonWakeState(n).lastWakeArgs;
  if (!LFt(h.id) || lastWakeArgs === null) return "cleared";
  return (
    r?.(lastWakeArgs),
    scheduleThreadScan({
      ...lastWakeArgs,
      seed: !1,
      confirm: void 0,
      confirmBase: void 0,
      confirmAfter: void 0,
      reentry: void 0,
      idlePass: void 0,
      suppressSummonStatus: void 0,
    }),
    "lifted"
  );
}
/**
 * 找到为指定 slug 布防自动响应且正在运行的监视任务。
 */
//@ chunk-aqdf5t3e.js:42204-42342 placement
function findArmedAutoReactMonitor(e, n) {
  return Object.values(e.all()).find(
    (r) =>
      eW(r) &&
      r.status === "running" &&
      r.autoReactArmed === !0 &&
      r.autoReactSlug === n &&
      isMonitorWsTaskLive(r),
  );
}
//@ chunk-aqdf5t3e.js:42342-42486 placement
function releaseNoticeLatchesOnTurn(e, n) {
  if (n.ownWords) {
    let r = clearOrphanedAutoReactNotices((s) => cUs(s) || hasActivitySince(e, autoReactNoticeLatchedAt(s)));
    if (r > 0) logFeatureOk("artifact_live_subscribe", { notice_latch_released: r });
  }
  return unpauseSweptOnHumanTurn(e);
}
//@ chunk-aqdf5t3e.js:42486-42589 placement
function hasActivitySince(e, n) {
  if (n === void 0) return !1;
  return Object.values(e.all()).some((r) => r.startTime >= n && isTaskActive(r));
}
/**
 * 判断任务是否仍处于活跃状态：shell/监视任务看运行或等待；agent 任务另外包括因非空闲原因保活的已完成任务与正在恢复的任务。
 */
//@ chunk-aqdf5t3e.js:42589-42952 placement
function isTaskActive(e) {
  let n = e.status === "running" || e.status === "pending";
  if (e.type === "local_bash" || isMonitorShellTask(e)) return n;
  if (!AGENT_TASK_TYPES.has(e.type) || e.type === "in_process_teammate") return !1;
  let r =
      e.status === "completed" &&
      "keepaliveReasons" in e &&
      e.keepaliveReasons instanceof Set &&
      [...e.keepaliveReasons].some((h) => h !== "flag:idle-window"),
    s = "resuming" in e && e.resuming === !0;
  return n || r || s;
}
/**
 * 人类发起新回合时记下扫描代次，并尝试解除所有被清扫暂停的 slug，打点解除数量。
 */
//@ chunk-aqdf5t3e.js:42952-43156 placement
function unpauseSweptOnHumanTurn(e) {
  let { wakes: wakes } = getLiveState();
  wakes.humanTurnAtScanGeneration = wakes.scanGeneration;
  let r = 0;
  for (let s of [...wakes.sweptSlugs]) if (liftSweptPause(e, s) !== null) r++;
  if (r > 0) logFeatureOk("artifact_live_subscribe", { unpaused_on_turn: r });
  return r;
}
//@ chunk-aqdf5t3e.js:43156-43235 placement
function hasStoppableAutoReactSupervision() {
  return getLiveState().builtInArtifactHiddenForMcp
    ? hasActiveAutoReactWatch() && isAutoreactArmed()
    : isAutoreactArmed() && hasActiveAutoReactWatch();
}
//@ chunk-aqdf5t3e.js:43235-44062 placement
function frameLiveWatchRows(e, n) {
  let r = [],
    s,
    h = () => (s ??= isAutoReactEnabled()),
    a = getLiveState(),
    userDisarmed = a.autoReact.userDisarmed;
  for (let b of Object.values(e.taskRegistry.all())) {
    if (
      !eW(b) ||
      b.status !== "running" ||
      b.frameLive === void 0 ||
      (n !== void 0 && b.frameLive.slug !== n)
    )
      continue;
    let w = a.live.supervisors.get(b.frameLive.slug);
    r.push({
      slug: b.frameLive.slug,
      taskId: b.id,
      since: b.frameLive.watchedSince,
      explicit: w?.explicit ?? b.frameLive.explicit,
      connected: isMonitorWsTaskLive(b),
      tokenExpiresAt: w?.lease?.expMs ?? b.frameLive.armedAt + (w?.transport === "sync" ? k2n : PLr),
      armedVia: w?.armedVia ?? b.frameLive.armedVia,
      autoReply:
        b.autoReactArmed !== !0
          ? isSlugStoppedAnywhere(b.frameLive.slug)
            ? userDisarmed
              ? "disarmed"
              : h()
                ? "stopped"
                : "none"
            : "none"
          : userDisarmed
            ? "disarmed"
            : !h()
              ? "none"
              : b.autoReactSlug !== void 0 && isSlugStoppedAnywhere(b.autoReactSlug)
                ? isSlugSwept(b.autoReactSlug)
                  ? isSlugYielded(b.autoReactSlug)
                    ? "yielded"
                    : "paused"
                  : "stopped"
                : getAutoReactArmState(b.frameLive.slug),
    });
  }
  return r.sort((b, w) => b.since - w.since);
}
//@ chunk-aqdf5t3e.js:44062-44271 placement
function getAutoReactArmState(e) {
  let n = getLiveState().autoReact.artifacts.get(e),
    r = n?.lastProbeDeniedBy ?? null;
  if (r !== null) return r === "denied_by_auto_mode" ? "declined" : "denied";
  return n?.lastReplyDeclinedByAutoMode === !0 ? "declined" : "armed";
}
//@ chunk-aqdf5t3e.js:44271-44838 placement
function frameLiveStoppedRows(e, n) {
  let { live: live, autoReact: autoReact, wakes: wakes } = getLiveState(),
    a = [],
    d,
    b = () => (d ??= isAutoReactEnabled());
  for (let stoppedSlug of wakes.stoppedSlugs) {
    if (n !== void 0 && stoppedSlug !== n) continue;
    if (
      hasRunningMonitor(e.taskRegistry, stoppedSlug) ||
      live.inFlightSubscribes.has(stoppedSlug) ||
      (!autoReact.userDisarmed && !b())
    )
      continue;
    let S = live.supervisors.get(stoppedSlug),
      R = S !== void 0 && !S.stopped ? S : void 0;
    a.push({
      slug: stoppedSlug,
      ...(R !== void 0 && { since: R.watchedSince, explicit: R.explicit, armedVia: R.armedVia }),
      stopKind: isSlugSwept(stoppedSlug) ? (isSlugYielded(stoppedSlug) ? "yielded" : "interrupt") : "user",
      autoReply: autoReact.userDisarmed ? "disarmed" : "stopped",
    });
  }
  return a.sort((w, S) => (w.since ?? Number.POSITIVE_INFINITY) - (S.since ?? Number.POSITIVE_INFINITY));
}
//@ chunk-aqdf5t3e.js:44838-45394 placement
function classifyWatchReason(e, n, { forPublish: r = !1 } = {}) {
  let { supervisors: supervisors } = e,
    h = [];
  for (let a of frameLiveWatchRows(n)) {
    let d = supervisors.get(a.slug),
      b = getWatchProtectionForRow(e, a, n);
    if (b === "explicit" || b === "most_recent_publish") continue;
    if (b === "auto_reply") {
      if (!r || isArtifactScanBusy(a.slug)) continue;
      h.push({ row: a, tier: 3 });
      continue;
    }
    h.push({ row: a, tier: d === void 0 || d.stopped ? 0 : d.armedVia === "mcp_write" ? 1 : 2 });
  }
  return h
    .sort((a, d) => {
      if (a.tier !== d.tier) return a.tier - d.tier;
      let b = supervisors.get(a.row.slug),
        w = supervisors.get(d.row.slug),
        S = b && !b.stopped ? b.lastActivityAt : 0,
        R = w && !w.stopped ? w.lastActivityAt : 0;
      return S - R || a.row.since - d.row.since;
    })
    .map((a) => a.row);
}
/**
 * 为腾位置停掉一个监听：停止监听任务，若它在自动回复则忘掉其意图，并通知主会话（达到监听数上限、为新监听腾出位置）；打点。
 */
//@ chunk-aqdf5t3e.js:45394-46047 placement
function evictWatch(live, candidate, context, options) {
  let supervisor = live.supervisors.get(candidate.slug),
    wasAutoReply = getWatchProtectionForRow(live, candidate, context) === "auto_reply";
  if (
    (stopMonitorWsTasks(candidate.taskId, context.taskRegistry, { quiet: !0 }),
    wasAutoReply && !isSlugYielded(candidate.slug))
  )
    forgetCommentMonitorIntents(candidate.slug, { storageV5: supervisor?.context.storageV5 ?? LRo() });
  if (supervisor !== void 0 && !supervisor.stopped)
    endWatch(
      live,
      supervisor,
      options?.why ??
        `this session reached its limit of ${FT} artifact watches and made room to watch a newer one${wasAutoReply ? "; it was auto-replying to comments, and that stops until its next publish" : ""}`,
      options?.shortReason ?? "made room for a newer watch",
      options !== void 0
        ? { advice: NO_AUTO_RETURN_ADVICE, passive: !0 }
        : wasAutoReply
          ? { advice: "do not watch it again unless the user asks" }
          : void 0,
    );
  else removeSupervisor(live, candidate.slug);
  logFeatureOk("artifact_live_subscribe", {
    evicted_least_active: !0,
    ...(wasAutoReply && { evicted_autoreply: !0 }),
  });
}
//@ chunk-aqdf5t3e.js:46047-46273 placement
function getWatchProtection(e, n) {
  let r = e.supervisors.get(n);
  if (r === void 0 || r.stopped) return null;
  if (r.explicit) return "explicit";
  if (Ar(e, r)) return "most_recent_publish";
  return r.autoReactWiring !== void 0 && isAutoreactArmed() && (!isSlugStopped(n) || isSlugSwept(n))
    ? "auto_reply"
    : null;
}
//@ chunk-aqdf5t3e.js:46273-46312 placement
function Sr(e, n) {
  return getWatchProtection(e, n) !== null;
}
//@ chunk-aqdf5t3e.js:46312-46500 placement
function getWatchProtectionForRow(e, n, r) {
  let s = e.supervisors.get(n.slug);
  if (s !== void 0 && !s.stopped) return getWatchProtection(e, n.slug);
  let h = r.taskRegistry.all()[n.taskId];
  return n.explicit ? "explicit" : isClaimableAutoReactSubscription(h) ? "auto_reply" : null;
}
//@ chunk-aqdf5t3e.js:46500-46708 placement
function evictForProtectedReconnect(e, n) {
  let r = classifyWatchReason(e, n);
  if (r.length === 0) return !1;
  return (
    evictWatch(e, r[0], n, {
      why: `this session reached its limit of ${FT} artifact watches and made room for a protected watch to reconnect`,
      shortReason: MADE_ROOM_PHRASE,
    }),
    !0
  );
}
//@ chunk-aqdf5t3e.js:46708-46943 placement
function teardownFrameLiveForProcessHandoff() {
  let live = getLiveState().live;
  ((live.handoffGeneration += 1),
    live.bootingWiredArms.clear(),
    setReplConfigArgv(stripWatchArtifactArgs(getReplConfigArgv())),
    flushAutoreactLedger({ flush: !0 }),
    retireAutoreactLedger(),
    clearSummonWakeTimers(),
    bumpScanGeneration());
  for (let n of [...live.supervisors.keys()]) removeSupervisor(live, n);
  (live.armOutcomes.clear(), live.announcedArmFailures.clear(), closeAllMonitorSockets());
}
//@ chunk-aqdf5t3e.js:46943-48480 placement
function startFrameLiveWatch(e) {
  let live = getLiveState().live;
  ((live.handoffGeneration += 1), clearSummonWakeTimers(), bumpScanGeneration());
  let r = 0;
  for (let a of [...live.supervisors.values()]) {
    if (!a.stopped) r++;
    if (a.autoReactWiring !== void 0) {
      let { slug: slug } = a;
      import("./chunk-4te7h8m1.js").then((b) => b.handBackTakenOverSlug(slug));
    }
    (delete a.autoReactWiring, removeSupervisor(live, a.slug));
    for (let d of Object.values(a.context.taskRegistry.all())) {
      if (!eW(d) || d.status !== "running" || d.frameLive?.slug !== a.slug) continue;
      stopMonitorWsTasks(d.id, a.context.taskRegistry, { quiet: !0 });
    }
  }
  if ((live.armOutcomes.clear(), live.announcedArmFailures.clear(), r === 0)) return r;
  let s = `${r} artifact ${r === 1 ? "watch" : "watches"}`,
    h =
      e === "signed_out"
        ? "Those watches were opened as the account that signed out: this session no longer keeps track of new versions of those artifacts or hears comments on them, and their comment auto-replies are off. A publish or watch of yours once someone is signed in opens a fresh watch; do not re-watch just to resume listening unless the user asks."
        : "Those watches were opened as the previous account: this session no longer keeps track of new versions of those artifacts or hears comments on them, and their comment auto-replies are off. A publish or watch of yours opens a fresh watch as the current account; do not re-watch just to resume listening unless the user asks.";
  return (
    enqueuePendingNotification({
      value: formatTaskNotification({
        taskType: ARTIFACT_WATCH_LIFECYCLE,
        summary: escapeXml(
          `Stopped watching ${s} (${e === "signed_out" ? "signed out" : "the signed-in account changed"})`,
        ),
        body: `
<event>${escapeXml(h)}</event>`,
      }),
      mode: "task-notification",
      passive: !0,
      priority: "next",
      origin: { kind: "task-notification", source: ARTIFACT_WATCH_LIFECYCLE },
      agentId: mainAgentId(),
    }),
    r
  );
}
//@ chunk-aqdf5t3e.js:48480-48827 placement
function unwatchFrameLive(e, n, r) {
  let { wasWatching: wasWatching } = stopLiveWatch(e, n);
  if ((getLiveState().live.nonEditorSlugs.delete(e), r !== void 0)) {
    let repliesConsent = getLiveState().live.repliesConsent,
      a = repliesConsent.outstanding.get(e);
    if (a !== void 0) {
      if ((repliesConsent.outstanding.delete(e), a.allowed !== !0))
        repliesConsent.declined.set(e, { namingMessages: a.namingMessages });
    }
    repliesConsent.approved.delete(e);
  }
  return (logFeatureOk("artifact_live_subscribe", { unwatched: wasWatching }), { wasWatching: wasWatching });
}
//@ chunk-aqdf5t3e.js:48827-48960 placement
function endFrameLiveWatchOfDeletedArtifact(e, n) {
  hasWatchArtifactArg(e, n.storageV5);
  let { wasWatching: wasWatching } = stopLiveWatch(e, n);
  if (wasWatching) logFeatureOk("artifact_live_subscribe", { unwatched: !0, artifact_deleted: !0 });
}
/**
 * 停止某 slug 的实时监听：清除布防结果与召唤状态，停掉对应任务（自动回复任务按用户停止处理并重置台账），返回之前是否在监听。
 */
//@ chunk-aqdf5t3e.js:48960-49375 placement
function stopLiveWatch(e, n) {
  let live = getLiveState().live;
  (setLedgerStorage(n.storageV5), live.armOutcomes.delete(e), Qt(live, e), VFs(e));
  let s = live.supervisors.get(e)?.autoReactWiring !== void 0,
    { wasWatching: wasWatching } = stopWatchesForSlug({
      slug: e,
      taskRegistry: n.taskRegistry,
      announce: !1,
      killRow: (a) => {
        let d = a.autoReactArmed === !0;
        if (
          (stopMonitorWsTasks(
            a.id,
            n.taskRegistry,
            d ? { quiet: !0, userStop: !0, modelOrigin: !0 } : { quiet: !0 },
          ),
          d && a.autoReactSlug !== void 0)
        )
          resetAutoReactForSlug(a.autoReactSlug);
      },
    });
  if (s) resetAutoReactForSlug(e);
  return { wasWatching: wasWatching };
}
//@ chunk-aqdf5t3e.js:49375-50486 placement
async function watchFrameLive(e) {
  let {
    slug: slug,
    url: url,
    publishContext: publishContext,
    getKnownVer: getKnownVer,
    context: context,
    tool: tool,
    commentVerbsInSchema: commentVerbsInSchema,
  } = e;
  if (!B9(publishContext)) return { outcome: "skipped", reason: "publish_context" };
  let live = getLiveState().live,
    S = tool !== void 0 && commentVerbsInSchema === !0 && isAutoReactEnabled(),
    R = !S
      ? void 0
      : !isUserDrivenTurn(context.messages)
        ? "unattended_turn"
        : !hasHumanMessageContaining(context.messages, slug) || !isStrictHumanTurn(context.messages)
          ? "not_named_by_user"
          : live.repliesConsent.declined.has(slug)
            ? "declined"
            : live.nonEditorSlugs.has(slug)
              ? "not_editor"
              : e.repliesApproved !== !0
                ? "not_approved"
                : void 0,
    C = explicitWatchOptions({
      tool: S && R === void 0 ? tool : void 0,
      commentVerbsInSchema: commentVerbsInSchema,
      context: context,
    }),
    G = C.autoReactWiring !== void 0,
    L = live.supervisors.get(slug)?.autoReactWiring?.title,
    y = await FrameLiveWatchManager(live, {
      slug: slug,
      url: url,
      getKnownVer: getKnownVer,
      ownPublishes: context.artifactRegistries.ownPublishes,
      ...ke(context),
      ...C,
      pickUpRecentSummons: G,
      ...(C.autoReactWiring !== void 0 && {
        autoReactWiring: { ...C.autoReactWiring, title: L },
        editorGatedWiring: !0,
      }),
    });
  if (
    G &&
    y.outcome === "armed" &&
    y.degraded === void 0 &&
    !(isSlugStopped(slug) && !isSlugSwept(slug)) &&
    Ne()
  )
    armMonitorIntent(slug, {
      title: live.supervisors.get(slug)?.autoReactWiring?.title ?? L,
      storageV5: context.storageV5,
    });
  if (R !== void 0 && y.outcome === "armed") return { ...y, degraded: R };
  if (R !== void 0 && y.outcome === "already_watching") return { ...y, degraded: R };
  return y;
}
//@ chunk-aqdf5t3e.js:50486-50541 placement
function knownNonEditor(e) {
  return getLiveState().live.nonEditorSlugs.has(e);
}
//@ chunk-aqdf5t3e.js:54609-54762 placement
function onArmSettled(e, n) {
  let { live: live } = getLiveState();
  if (!live.inFlightSubscribes.has(e)) {
    n();
    return;
  }
  let s = live.armSettleWaiters.get(e) ?? [];
  (s.push(n), live.armSettleWaiters.set(e, s));
}
//@ chunk-aqdf5t3e.js:54762-54871 placement
function slugRepliesWiredHere(e) {
  let n = getLiveState().live.supervisors.get(e);
  return n !== void 0 && !n.stopped && n.autoReactWiring !== void 0;
}
//@ chunk-aqdf5t3e.js:54871-55323 placement
async function watchArtifactFromStartup(e) {
  let {
    slug: slug,
    url: url,
    getKnownVer: getKnownVer,
    tool: tool,
    commentVerbsInSchema: commentVerbsInSchema,
    context: context,
  } = e;
  if (tool !== void 0 && isActingAsBgJob())
    DRo().catch(() => {
      return;
    });
  let b = getLiveState(),
    w = await FrameLiveWatchManager(b.live, {
      slug: slug,
      url: url,
      getKnownVer: getKnownVer,
      ownPublishes: context.artifactRegistries.ownPublishes,
      ...ke(context),
      ...explicitWatchOptions({ tool: tool, commentVerbsInSchema: commentVerbsInSchema, context: context }),
    });
  if (tool !== void 0 && commentVerbsInSchema === !0 && w.outcome !== "skipped" && Ne())
    armMonitorIntent(slug, {
      title: b.live.supervisors.get(slug)?.autoReactWiring?.title,
      storageV5: context.storageV5,
    });
  return w;
}
//@ chunk-aqdf5t3e.js:55323-55535 placement
function explicitWatchOptions(e) {
  let { tool: tool, commentVerbsInSchema: commentVerbsInSchema, context: context } = e;
  return {
    seedKnownVerFromBoot: !0,
    explicit: !0,
    pickUpRecentSummons: !0,
    ...(tool !== void 0 &&
      commentVerbsInSchema === !0 && {
        autoReactWiring: { tool: tool, commentVerbsInSchema: commentVerbsInSchema, context: context },
      }),
  };
}
//@ chunk-aqdf5t3e.js:55535-57521 placement
async function maybeSubscribeFrameLive(e) {
  let {
    slug: slug,
    url: url,
    version: version,
    publishContext: publishContext,
    getKnownVer: getKnownVer,
    tool: tool,
    commentVerbsInSchema: commentVerbsInSchema,
    title: title,
    context: context,
  } = e;
  if (tool !== void 0 && isActingAsBgJob())
    DRo().catch(() => {
      return;
    });
  let ownPublishes = context.artifactRegistries.ownPublishes,
    live = getLiveState().live;
  if (version !== void 0) {
    recordOwnPublish(ownPublishes, slug, version, { merged: !isVouchedOwnVer(ownPublishes, slug, version) });
    let T = live.supervisors.get(slug);
    if (T !== void 0 && !T.stopped) T.lastActivityAt = Date.now();
    if (B9(publishContext)) live.mostRecentPublishSlug = slug;
  }
  if (!B9(publishContext))
    return (
      logFeatureSad("artifact_live_subscribe", "publish_context", {
        publish_context: fromEnum(publishContext),
      }),
      { outcome: "skipped", reason: "publish_context" }
    );
  let G = tool !== void 0 && commentVerbsInSchema === !0,
    L =
      e.carriedPublishConsent !== !0 &&
      e.resumedPublishConsent !== !0 &&
      e.chainPublish !== !0 &&
      e.adoptedPublish !== !0 &&
      isUserDrivenTurn(context.messages),
    y = await FrameLiveWatchManager(live, {
      slug: slug,
      url: url,
      getKnownVer: getKnownVer,
      ownPublishes: ownPublishes,
      ...ke(context),
      ...(e.onOpen !== void 0 && e.onGiveUp !== void 0 && { onOpen: e.onOpen, onGiveUp: e.onGiveUp }),
      ...(e.seedKnownVerFromBoot === !0 && { seedKnownVerFromBoot: !0 }),
      ...((e.resumedPublishConsent === !0 || e.carriedPublishConsent === !0) && { requireEditor: !0 }),
      ...(e.sessionResume === !0 && { sessionResume: !0 }),
      ...(L && version !== void 0 && { freshPublish: !0 }),
      ...(e.announceArmlessEnd === !0 && { announceArmlessEnd: !0 }),
      ...(e.resumedPublishConsent === !0 && G && { pickUpRecentSummons: !0 }),
      ...(G && {
        autoReactWiring: {
          tool: tool,
          commentVerbsInSchema: commentVerbsInSchema,
          context: context,
          title: title,
          ...(e.publishTranscript !== void 0 && { publishTranscript: e.publishTranscript }),
        },
        ...(L && { freshPublishWiring: !0 }),
      }),
    });
  if ((version !== void 0 || e.adoptedPublish === !0) && y.outcome !== "skipped") {
    let { autoReact: autoReact, wakes: wakes } = getLiveState(),
      ie = !G
        ? "bare_watch_comments_off"
        : autoReact.userDisarmed
          ? "bare_watch_session_disarmed"
          : !isCommentAutoreactOptedIn()
            ? "bare_watch_autoreact_off"
            : isSlugStopped(slug) &&
                !L &&
                !(
                  isSlugSwept(slug) &&
                  !isSlugOrphaned(slug) &&
                  wakes.humanTurnAtScanGeneration === wakes.scanGeneration
                )
              ? "bare_watch_slug_stopped"
              : void 0;
    if (ie !== void 0)
      logFeatureSad("artifact_live_subscribe", ie, { publish_context: fromEnum(publishContext) });
  }
  if (
    G &&
    y.outcome !== "skipped" &&
    !(
      y.outcome === "already_watching" &&
      (e.resumedPublishConsent === !0 || e.carriedPublishConsent === !0)
    ) &&
    !(y.outcome === "armed" && y.degraded !== void 0) &&
    Ne()
  )
    armMonitorIntent(slug, {
      title: live.supervisors.get(slug)?.autoReactWiring?.title ?? title,
      storageV5: context.storageV5,
    });
  return y;
}
//@ chunk-aqdf5t3e.js:57521-57577 placement
function Ne() {
  return !getLiveState().autoReact.userDisarmed && isCommentAutoreactOptedIn();
}
//@ chunk-aqdf5t3e.js:57577-57678 placement
function armMonitorIntent(e, n) {
  if (getLiveState().builtInArtifactHiddenForMcp) {
    HRo(e, { storageV5: n.storageV5 });
    return;
  }
  armCommentMonitorIntent(e, n);
}
//@ chunk-aqdf5t3e.js:57678-57760 placement
function Xt(e, n, r) {
  return `live updates for artifact ${e} (${armedViaWording(labelledArmedVia(n, r)).task})`;
}
//@ chunk-aqdf5t3e.js:57760-57830 placement
function ke(e) {
  return { context: pickMonitorContext(e), signal: e.abortController.signal };
}
//@ chunk-aqdf5t3e.js:57830-57869 placement
function makeArtifactReadVersionReader(e, n) {
  return () => mainObservedArtifactVersion(e(), n);
}
/**
 * 判断实时订阅是否不可用：功能关闭、远程环境，或（控制面覆盖/WebSocket 出口被拒）；可用时返回 null。
 */
//@ chunk-aqdf5t3e.js:57869-57985 placement
function getLiveSubscribeSkipReason(e) {
  if (!isFrameLiveSubscribeEnabled()) return { reason: "flag_off" };
  if (env.CLAUDE_CODE_REMOTE) return { reason: "remote" };
  return getEgressSkipReason(kr(e));
}
//@ chunk-aqdf5t3e.js:57985-58036 placement
function ct(e) {
  return isFrameLiveSubscribeEnabled() && at(e) === null && !Yyi(e);
}
//@ chunk-aqdf5t3e.js:58036-58175 placement
function getEgressSkipReason(e) {
  if (lCi()) return { reason: "cp_override" };
  let n = wsEgressDenyReason(e);
  if (n !== null) return { reason: "egress_denied", egressKind: n.kind };
  return null;
}
//@ chunk-aqdf5t3e.js:58175-58405 placement
function frameLivePublishFindsConnected(e) {
  let { context: context, slug: slug, wantWiring: wantWiring, canClearLatch: canClearLatch } = e,
    now = Date.now();
  for (let d of Object.values(context.taskRegistry.all()))
    if (
      eW(d) &&
      d.status === "running" &&
      d.frameLive?.slug === slug &&
      classifyMonitorTask(d, slug, now, wantWiring, canClearLatch, po) === "keep"
    )
      return !0;
  return !1;
}
//@ chunk-aqdf5t3e.js:58405-58569 placement
function frameLivePublishSkipReason(e) {
  if (getLiveState().durable.stopLatches.isStopped(e.slug)) return "stop_latched";
  if (!B9(e.publishContext)) return "publish_context";
  return getLiveSubscribeSkipReason(e.slug)?.reason ?? null;
}
//@ chunk-aqdf5t3e.js:64164-64360 placement
async function subscribeFrameLiveOnAttach(e) {
  let { slug: slug, url: url, getKnownVer: getKnownVer, context: context } = e;
  return FrameLiveWatchManager(getLiveState().live, {
    slug: slug,
    url: url,
    getKnownVer: getKnownVer,
    ownPublishes: context.artifactRegistries.ownPublishes,
    ...ke(context),
    seedKnownVerFromBoot: !0,
  });
}
/**
 * 管理 Artifact 实时订阅：恢复、监听、mcp_write、自动回复
 */
//@ chunk-aqdf5t3e.js:64360-86204 placement
async function FrameLiveWatchManager(e, n) {
  let {
    slug: slug,
    url: url,
    getKnownVer: getKnownVer,
    ownPublishes: ownPublishes,
    context: context,
    seedKnownVerFromBoot: seedKnownVerFromBoot,
    seedSurfacedVer: seedSurfacedVer,
    explicit: explicit = !1,
    signal: signal,
  } = n;
  initAutoreactLedger();
  let C = e.supervisors.get(slug)?.carriedVer;
  e.endAll ??= startFrameLiveWatch;
  let G = n.autoReactWiring !== void 0 && n.autoReactWiring.commentVerbsInSchema,
    L =
      n.userResumeWiring === !0
        ? "resume"
        : explicit
          ? "watch"
          : n.sessionResume === !0
            ? "session_resume"
            : n.mcpWrite === !0
              ? "mcp_write"
              : seedKnownVerFromBoot
                ? "attach"
                : "publish";
  if (!ARTIFACT_SLUG_RE.test(slug)) return { outcome: "skipped", reason: "invalid_slug" };
  e.armOutcomes.delete(slug);
  let stopLatches = getLiveState().durable.stopLatches;
  v5({ storageV5: context.storageV5 });
  let T = n.userResumeWiring === !0 ? n.approvedRelatchGen : void 0,
    P = () => stopLatches.isStopped(slug) && (T === void 0 || stopLatches.latchGeneration(slug) !== T);
  if (P())
    return (
      logFeatureSad("artifact_live_subscribe", "stop_latched"),
      { outcome: "skipped", reason: "stop_latched" }
    );
  let ie = getLiveSubscribeSkipReason(slug);
  if (ie !== null) {
    if (ie.reason === "cp_override") logFeatureSad("artifact_live_subscribe", "cp_override_active");
    else if (ie.reason === "egress_denied")
      logFeatureSad(
        "artifact_live_subscribe",
        `egress_denied_${ie.egressKind === "sandbox-policy" ? "sandbox_policy" : ie.egressKind}`,
      );
    return { outcome: "skipped", reason: ie.reason };
  }
  let Hr = kr(slug),
    pt = ct(slug),
    Ee = (n.freshPublishWiring === !0 || n.userResumeWiring === !0) && !n.signal.aborted,
    mt = e.supervisors.get(slug)?.autoReactWiring,
    ae = reconcileMonitorTasks(context, slug, G, Ee);
  if (ae !== null || e.inFlightSubscribes.has(slug)) {
    if (ae === null && T !== void 0 && stopLatches.isStopped(slug))
      return (
        logFeatureSad("artifact_live_subscribe", "arm_in_flight"),
        { outcome: "skipped", reason: "arm_in_flight" }
      );
    if (!(L === "resume" && ae === null && !e.supervisors.has(slug)))
      upsertSupervisor(e, {
        slug: slug,
        url: url,
        getKnownVer: getKnownVer,
        ownPublishes: ownPublishes,
        context: context,
        explicit: explicit,
        machineArm: n.machineArm,
        armedVia: L,
        ...(n.requireEditor !== !0 &&
          n.editorGatedWiring !== !0 && { autoReactWiring: n.autoReactWiring, humanTurnWiring: Ee }),
      });
    if (ae !== null) {
      let x = e.supervisors.get(slug);
      if (x !== void 0) {
        let J = Xt(url, x.explicit, x.armedVia);
        context.taskRegistry.update(ae, (D) => {
          if (!eW(D) || D.frameLive === void 0) return D;
          if (
            D.description === J &&
            D.frameLive.explicit === x.explicit &&
            D.frameLive.armedVia === x.armedVia
          )
            return D;
          return {
            ...D,
            description: J,
            frameLive: { ...D.frameLive, explicit: x.explicit, armedVia: x.armedVia },
          };
        });
      }
    }
    if (ae !== null && n.freshPublishWiring === !0 && !n.signal.aborted)
      liftSweptPause(context.taskRegistry, slug);
    if (
      ae === null &&
      n.autoReactWiring !== void 0 &&
      n.autoReactWiring.commentVerbsInSchema &&
      n.requireEditor !== !0 &&
      n.editorGatedWiring !== !0
    ) {
      let x = e.pendingInFlightWiring.get(slug),
        J = n.freshPublishWiring === !0 && !n.signal.aborted,
        D =
          J || x === void 0
            ? { scanGeneration: getLiveState().wakes.scanGeneration, stopGeneration: stopGeneration(slug) }
            : { scanGeneration: x.scanGeneration, stopGeneration: x.stopGeneration };
      if (
        (e.pendingInFlightWiring.set(slug, {
          wiring: mergeAutoReactWiring(x?.wiring, n.autoReactWiring, Ee),
          freshPublishWiring: J || x?.freshPublishWiring === !0,
          ...D,
        }),
        e.inFlightWiredIntent.add(slug),
        Ne())
      )
        HRo(slug, { storageV5: context.storageV5 });
      if (J && isCommentAutoreactOptedIn())
        e.bootingWiredArms.set(slug, { title: n.autoReactWiring.title, freshPublish: !0, ...D });
    }
    return { outcome: "already_watching", ...(ae !== null && { taskId: ae }) };
  }
  let Y = {
      url: url,
      announce: n.announceArmlessEnd === !0 && !n.machineArm,
      handoffGen: e.handoffGeneration,
      getTitle: () => e.supervisors.get(slug)?.autoReactWiring?.title ?? n.autoReactWiring?.title,
    },
    sn = frameLiveWatchRows(context).length + e.inFlightSubscribes.size;
  if (n.machineArm && frameLiveWatchRows(context).length >= FT) {
    if (!Sr(e, slug) || classifyWatchReason(e, context).length === 0)
      return (
        logFeatureSad("artifact_live_subscribe", "watch_cap_reconnect"),
        { outcome: "skipped", reason: "watch_cap_reconnect" }
      );
  }
  if (n.mcpWrite && sn >= FT)
    return (
      logFeatureSad("artifact_live_subscribe", "watch_cap"),
      skipArm(e, slug, n.machineArm, "watch_cap", Y)
    );
  let an = !n.machineArm && n.freshPublish === !0;
  if (!n.machineArm && sn >= FT && classifyWatchReason(e, context, { forPublish: an }).length === 0)
    return (
      logFeatureSad("artifact_live_subscribe", "watch_cap"),
      skipArm(e, slug, n.machineArm, "watch_cap", Y)
    );
  let scanGeneration = getLiveState().wakes.scanGeneration,
    Ue = stopGeneration(slug),
    un = n.machineArm ? e.supervisors.get(slug)?.lastActivityAt : void 0,
    handoffGeneration = e.handoffGeneration;
  if (
    (GBs(stopWatchFromTask),
    YBs(forgetArtifactAndFlush),
    zBs((x) => releaseNoticeLatchesOnTurn(context.taskRegistry, x)),
    e.inFlightSubscribes.add(slug),
    e.inFlightGenerations.set(slug, handoffGeneration),
    n.autoReactWiring !== void 0)
  )
    e.inFlightWiredIntent.add(slug);
  let Ce,
    xe = !1;
  try {
    if (
      n.autoReactWiring?.commentVerbsInSchema === !0 &&
      n.requireEditor !== !0 &&
      n.machineArm !== !0 &&
      n.userResumeWiring !== !0 &&
      isCommentAutoreactOptedIn()
    )
      e.bootingWiredArms.set(slug, {
        title: n.autoReactWiring.title,
        freshPublish: n.freshPublishWiring === !0 && !n.signal.aborted,
        scanGeneration: scanGeneration,
        stopGeneration: Ue,
      });
    let x = () => e.handoffGeneration !== handoffGeneration || e.retiredInFlightArms.has(slug),
      J = isFrameLiveTokenLeaseEnabled();
    if (!J) {
      let A = e.supervisors.get(slug);
      if (A !== void 0) (delete A.lease, delete A.renewable);
    }
    let accountEpoch = getLiveState().accountEpoch,
      ge = J && n.machineArm === !0 ? e.supervisors.get(slug)?.lease : void 0,
      F =
        ge !== void 0 &&
        (ge.transport === "live" || pt) &&
        isLiveTokenFresh(ge, e.rewatchTiming, accountEpoch)
          ? ge
          : void 0;
    if (F !== void 0 && F.transport === "sync") {
      let A = await readFreshOauthAccountFromDisk(context.storageV5).catch(() => {
        return;
      });
      if (!sameOwnerAccount(parseCapTokenOwner(F.token), A)) F = void 0;
      if (signal.aborted || x()) return skipArm(e, slug, n.machineArm, "cancelled", Y);
    }
    let W,
      ht = !1,
      dn = 0;
    if (F !== void 0)
      W = {
        err: null,
        token: F.token,
        transport: F.transport,
        ver: F.ver,
        editor: void 0,
        tokenExp: void 0,
        renewable: !1,
      };
    else {
      let A = J && !pt && n.machineArm === !0 && e.supervisors.get(slug)?.renewable === !0;
      try {
        let j;
        if (A) {
          let be = await renewWatchToken(slug, signal, context.credentials);
          if (be.err === null) ((j = be), (ht = !0));
          else {
            logFeatureSad("artifact_live_subscribe", `renew_miss_${be.status ?? "no_response"}`);
            let ue = e.supervisors.get(slug);
            if (ue !== void 0) delete ue.renewable;
            if (signal.aborted || x()) return skipArm(e, slug, !0, "cancelled", Y);
          }
        }
        ((dn = Date.now()),
          (W =
            j ??
            (await fetchLiveSubscription(slug, signal, context.credentials, {
              syncLive: pt,
              ...(n.machineArm === !0 && { lean: e.supervisors.get(slug)?.bootedVersion }),
            }))));
      } catch {
        return skipArm(e, slug, n.machineArm, signal.aborted || x() ? "cancelled" : "boot_failed", Y);
      }
    }
    let now = Date.now();
    if (x()) return skipArm(e, slug, n.machineArm, "cancelled", Y);
    if (W.err !== null) {
      let A = signal.aborted
          ? "cancelled"
          : W.status === 404
            ? "not_found"
            : B5(W)
              ? "other_org"
              : W.publicOutsideOrg === !0
                ? "public_outside_org"
                : "boot_failed",
        j =
          A === "boot_failed" &&
          (W.unavailable === !0 ||
            (W.noAnswer === !0 && Date.now() - dn >= e.rewatchTiming.stallThresholdMs));
      return skipArm(e, slug, n.machineArm, A, Y, { unavailable: j, httpStatus: W.status });
    }
    let $e = n.requireEditor === !0 && !W.editor,
      se = $e || (n.editorGatedWiring === !0 && n.autoReactWiring !== void 0 && W.editor !== !0),
      fn = $e ? "restored_consent_not_editor" : "watch_not_editor";
    if (W.editor === !0) e.nonEditorSlugs.delete(slug);
    if (se) {
      if (
        (e.inFlightWiredIntent.delete(slug),
        e.bootingWiredArms.delete(slug),
        !$e && getLiveState().accountEpoch === accountEpoch)
      )
        e.nonEditorSlugs.add(slug);
    }
    let pn = W.title === void 0 ? null : sanitizeArtifactTitle(W.title),
      le =
        se || n.autoReactWiring === void 0
          ? void 0
          : pn === null
            ? n.autoReactWiring
            : { ...n.autoReactWiring, title: pn },
      gt = se ? void 0 : n.onOpen,
      mn = se ? void 0 : n.onGiveUp,
      transport = W.transport;
    if (transport === "sync" && (!ct(slug) || W.token === void 0 || !isAgentCapToken(W.token)))
      return (
        logFeatureSad("artifact_live_subscribe", "sync_unavailable"),
        skipArm(e, slug, n.machineArm, "sync_unavailable", Y, { unavailable: !0 })
      );
    let token = W.token;
    if (!token)
      return (
        logFeatureSad("artifact_live_subscribe", se ? fn : "no_subscription_token"),
        skipArm(e, slug, n.machineArm, $e ? "not_editor" : "no_subscription_token", Y)
      );
    if (se) logFeatureSad("artifact_live_subscribe", fn);
    let ver = W.ver,
      Kr = seedKnownVerFromBoot ? () => getKnownVer() ?? ver : getKnownVer,
      O =
        F ??
        (J
          ? createLiveTokenState({
              transport: transport,
              token: token,
              ver: ver,
              accountEpoch: accountEpoch,
              expUnixSeconds: transport === "sync" ? getCapTokenSeq(token) : W.tokenExp,
              receivedAtMs: now,
            })
          : void 0);
    if (signal.aborted || x()) return skipArm(e, slug, n.machineArm, "cancelled", Y);
    let He = frameLiveWatchRows(context).length + e.inFlightSubscribes.size - 1,
      bt = e.supervisors.get(slug),
      jr = n.machineArm === !0 && un !== void 0 && bt !== void 0 && !bt.stopped && bt.lastActivityAt > un,
      hn = frameLiveWatchRows(context).length + e.pendingRegistrations;
    if (n.machineArm && !jr && He >= FT) {
      if (hn >= FT) {
        if (!Sr(e, slug) || !evictForProtectedReconnect(e, context))
          return (
            logFeatureSad("artifact_live_subscribe", "watch_cap_reconnect"),
            { outcome: "skipped", reason: "watch_cap_reconnect" }
          );
      }
    } else if (n.mcpWrite && He >= FT)
      return (
        logFeatureSad("artifact_live_subscribe", "watch_cap"),
        skipArm(e, slug, n.machineArm, "watch_cap", Y)
      );
    else if (He >= FT) {
      let A = He - FT + 1,
        j = classifyWatchReason(e, context, { forPublish: an });
      if (j.length < A) {
        if (n.machineArm)
          return (
            logFeatureSad("artifact_live_subscribe", "watch_cap_reconnect"),
            { outcome: "skipped", reason: "watch_cap_reconnect" }
          );
        return (
          logFeatureSad("artifact_live_subscribe", "watch_cap"),
          skipArm(e, slug, n.machineArm, "watch_cap", Y)
        );
      }
      if (hn >= FT)
        evictWatch(
          e,
          j[0],
          context,
          n.machineArm
            ? {
                why: `this session reached its limit of ${FT} artifact watches and made room for an already-held watch to reconnect`,
                shortReason: MADE_ROOM_PHRASE,
              }
            : void 0,
        );
    }
    (e.pendingRegistrations++, (xe = !0));
    let q = e.supervisors.get(slug),
      qr = q !== void 0 && !q.stopped && q.explicit,
      _t = explicit || qr,
      St = q !== void 0 && !q.stopped,
      gn = St ? q.taskId : void 0,
      zr = q === void 0,
      Yr = explicit && q !== void 0 && !q.explicit,
      bn =
        !n.machineArm && q !== void 0 && q.armedVia === "mcp_write" && L !== "publish" && L !== "mcp_write",
      _n = bn ? q.autoReactWiring : void 0,
      Sn = le !== void 0 && !isHumanTurnWiringStale(e, slug, mt),
      vn = n.userResumeWiring === !0 && Sn && St && q.autoReactWiring?.humanTurnSnapshot === !0,
      vt = e.supervisors.get(slug)?.carriedVer,
      wt = vt !== void 0 && vt !== C ? vt : seedSurfacedVer,
      k = upsertSupervisor(e, {
        slug: slug,
        url: url,
        getKnownVer: getKnownVer,
        ownPublishes: ownPublishes,
        context: context,
        explicit: explicit,
        machineArm: n.machineArm,
        armedVia: L,
        carriedVer: wt ?? W.ver,
        ...(Sn && { autoReactWiring: le }),
        humanTurnWiring: Ee && !vn,
      });
    if (F === void 0 && k.armedVia !== "mcp_write") recordHeardVersion(slug, ver);
    if (F === void 0 && !ht) k.bootedVersion = ver;
    let autoReactWiring = k.autoReactWiring;
    if (O !== void 0 && O.accountEpoch === getLiveState().accountEpoch) {
      if (((k.lease = O), F === void 0 && W.renewable)) k.renewable = !0;
      else if (F === void 0) delete k.renewable;
    } else (delete k.lease, delete k.renewable);
    let lastActivityAt = k.lastActivityAt;
    if (gt !== void 0 && mn !== void 0) k.resumeAnnounce = { onOpen: gt, onGiveUp: mn, wired: le !== void 0 };
    let At = L === "resume" && k.armedVia !== "watch" && k.armedVia !== "resume" ? k.armedVia : void 0;
    if (At !== void 0) k.armedVia = "resume";
    k.transport = transport;
    let ne = !1,
      wn = getSessionId(),
      An = !1,
      Rt,
      Be,
      Rn = !1,
      We,
      abortController = new AbortController(),
      Q = se ? void 0 : e.pendingInFlightWiring.get(slug);
    if (!se) e.pendingInFlightWiring.delete(slug);
    let fe = le ?? Q?.wiring,
      Zr =
        Q?.wiring.humanTurnSnapshot === !0 &&
        (mt?.humanTurnSnapshot !== !0 || Q.wiring.context !== mt.context);
    if (Q !== void 0 && (le === void 0 || Zr) && Q.stopGeneration === stopGeneration(slug)) {
      let A = e.supervisors.get(slug);
      if (A !== void 0 && !A.stopped)
        A.autoReactWiring = mergeAutoReactWiring(
          A.autoReactWiring,
          { ...Q.wiring, title: Q.wiring.title ?? A.autoReactWiring?.title },
          Q.wiring.humanTurnSnapshot === !0,
        );
    }
    let yn = n.freshPublishWiring === !0 || Q?.freshPublishWiring === !0;
    if (Q?.freshPublishWiring === !0) ((scanGeneration = Q.scanGeneration), (Ue = Q.stopGeneration));
    let Z = n.userResumeWiring === !0,
      ei = Ee || fe?.humanTurnSnapshot === !0,
      yt = () => e.supervisors.get(slug)?.autoReactWiring?.title ?? fe?.title,
      I =
        fe === void 0 || !fe.commentVerbsInSchema
          ? void 0
          : {
              env: claudeAiEnvironment(),
              tool: fe.tool,
              context: fe.context,
              ...(fe.publishTranscript !== void 0 && { publishTranscript: fe.publishTranscript }),
              getWiring: () => {
                let A = e.supervisors.get(slug)?.autoReactWiring;
                return A?.humanTurnSnapshot === !0 || !ei ? A : void 0;
              },
              abort: abortController,
              getTitle: yt,
              onReadRefused: () => {
                describeSubscribeFailure(e, slug);
              },
              notify: (A) => {
                if ("coalesce" in A) {
                  enqueueArtifactChanged({
                    queue: qi,
                    slug: slug,
                    family: A.coalesce.family,
                    artifactName: A.coalesce.artifactName,
                    threadId: A.coalesce.threadId,
                    detail: A.detail,
                    mergeDetails: "append",
                    ownGesture: A.ownGesture === !0,
                  });
                  return;
                }
                enqueuePendingNotification({
                  value: formatTaskNotification({
                    taskType: "artifact-auto-react",
                    summary: escapeXml(A.summary),
                    body: `
${escapeXml(A.detail)}`,
                  }),
                  mode: "task-notification",
                  origin: {
                    kind: "task-notification",
                    source: "artifact-auto-react",
                    slug: slug,
                    displayName: quoteArtifactName(yt, url),
                  },
                  uuid: hqn(A.handOff, A.ownGesture === !0 ? slug : void 0),
                  ...(A.handOff !== void 0 && { artifactCommentTurn: "handoff" }),
                  agentId: mainAgentId(),
                });
              },
            };
    k.surfacedVers ??= [];
    let wake = k.wake,
      Ke = createLiveEventHandlers({
        slug: slug,
        url: url,
        ownPublishes: ownPublishes,
        presenceOnly: () => e.supervisors.get(slug)?.armedVia === "mcp_write",
        getKnownVer: Kr,
        surfacedVers: k.surfacedVers,
        ...(wt !== void 0 && { seedSurfacedVer: wt }),
        onSurfaced: (A) => {
          let j = e.supervisors.get(slug);
          if (j && !j.stopped) ((j.carriedVer = A), (j.lastActivityAt = Date.now()));
        },
        autoReact: I,
      });
    k.wake = Ke;
    let kt = 0,
      Et,
      ti = F?.opened === !0 ? F : void 0;
    try {
      let A = await runWebSocketMonitor(
        {
          ws:
            transport === "sync"
              ? {
                  url: getSyncSocketUrl(slug, {
                    commentHint: I !== void 0 && isAutoreactArmed() && !isSlugStopped(slug),
                    versionNotices: !0,
                  }),
                  protocols: [FRAME_SYNC_V1, token],
                }
              : { url: Hr, protocols: [FRAME_LIVE_V1, token] },
          ...(transport === "sync" && { headers: { "User-Agent": getUserAgent() } }),
          description: Xt(url, _t, k.armedVia),
          timeout_ms: 0,
          persistent: !0,
          quietLifecycle: !0,
          ...(gn !== void 0 && { reuseTaskId: gn }),
          ambient: !0,
          handshakeDeadlineMs: e.rewatchTiming.handshakeDeadlineMs,
          autoReactArmed: I !== void 0,
          autoReactSlug: I !== void 0 ? slug : void 0,
          frameLive: { slug: slug, explicit: _t, watchedSince: k.watchedSince, armedVia: k.armedVia },
          transform:
            transport === "sync"
              ? handleFrameLiveControl(Ke, slug, {
                  onTokenRefresh: (U, V) => {
                    if (O !== void 0 && sameOwnerAccount(parseCapTokenOwner(O.token), parseCapTokenOwner(U)))
                      refreshLiveTokenState(O, { token: U, expUnixSeconds: V, receivedAtMs: Date.now() });
                  },
                  onExpiryAnnounced: () => {
                    Rn = !0;
                  },
                  onCommentHint: (U, V) => {
                    let Ie = Et;
                    Et = void 0;
                    let Se = U && Ie !== void 0 && settleEmptyArtifact(slug, Ie, V);
                    logFeatureOk("artifact_live_subscribe", {
                      comment_hint: !0,
                      comments_empty: U,
                      seed_parked: Ie !== void 0,
                      seed_skipped: Se,
                      sync_transport: !0,
                    });
                  },
                })
              : makeLiveVersionLineHandler(Ke),
          keepalive:
            transport === "sync"
              ? {
                  openFrames: [],
                  frame: jsonStringify({ kind: "ping", slug: slug }),
                  intervalMs: getLiveState().presence.timing.keepaliveMs,
                  sendEveryMs: () => adjustKeepaliveForIdle(e, getLiveState().presence.timing.keepaliveMs),
                  deadlineMs:
                    getLiveState().presence.timing.keepaliveDeadlineMs ??
                    jt(getLiveState().presence.timing.keepaliveMs),
                }
              : { openFrames: ["ping", "hb"], frame: "ping", intervalMs: zi },
          onSender: (U) => {
            if (transport === "sync") {
              ((Be = (V) => U($t(slug, V))), addAgentActivitySink(e, `watch:${slug}`, Be));
              return;
            }
            ((Rt = U), addActivitySender(e, slug, U));
          },
          onSenderClosed: () => {
            if (Be !== void 0) Qe(e, `watch:${slug}`, Be);
            if (Rt !== void 0) Bn(e, slug, Rt);
          },
          onLifecycle: (U, V, Ie) => {
            if (U === "open") {
              ((ne = !0),
                (k.lastFailure = void 0),
                (We = {
                  stalledSince: k.stalledSince,
                  lastStalledAt: k.lastStalledAt,
                  stallOutAfterMs: k.stallOutAfterMs,
                }),
                (k.stalledSince = void 0),
                (k.lastStalledAt = void 0),
                (k.stallOutAfterMs = void 0));
              let Oe = k.spreadReconnect === !0;
              if (((k.spreadReconnect = void 0), (kt = Date.now()), O !== void 0)) O.opened = !0;
              if (T !== void 0 && signal.aborted && stopLatches.isStopped(slug) && k.taskId !== void 0) {
                (stopMonitorWsTasks(k.taskId, context.taskRegistry, { quiet: !0 }),
                  removeSupervisor(e, slug),
                  logFeatureSad("artifact_live_subscribe", "stop_latched"));
                return;
              }
              let Me = e.supervisors.get(slug);
              if (Me !== void 0 && !Me.stopped)
                if (transport === "sync") (qyi(slug), Ve(slug)?.reopened());
                else
                  (armArtifactPresence({ slug: slug, url: url, context: context }), Ve(slug)?.sourceEnded());
              logFeatureOk("artifact_live_subscribe", {
                armed: !0,
                ...(transport === "sync" && { sync_transport: !0 }),
                ...(_t && { explicit: !0 }),
                ...(F !== void 0 && {
                  token_reused: !0,
                  lease_remaining_min: Math.max(0, Math.floor((F.expMs - kt) / 60000)),
                }),
                ...(ht && { token_renewed: !0 }),
              });
              let Cn = I !== void 0 && getLiveState().wakes.scanGeneration !== scanGeneration,
                ri = stopGeneration(slug) !== Ue,
                { wakes: wakes } = getLiveState(),
                ii =
                  wakes.liftedAtScanGeneration.get(slug) === wakes.scanGeneration ||
                  wakes.humanTurnAtScanGeneration === wakes.scanGeneration;
              if (Cn && !ii && !isSlugStopped(slug) && isAutoreactArmed())
                (sweepSlug(slug),
                  artifactWatchStopNotice(1, [], {
                    catchUp: !1,
                    nameChordGesture: !getIsNonInteractiveSession(),
                    passive: !getIsNonInteractiveSession(),
                  }),
                  flushAutoreactLedger({ flush: !0 }));
              if (T !== void 0 && !signal.aborted) stopLatches.clearByApprovedRewatch(slug, T);
              if (I !== void 0) getSummonWakeState(slug).lastWakeArgs = { slug: slug, url: url, ...I };
              let xn = Z && P();
              if (Z && I !== void 0 && !signal.aborted && !xn && Ne()) {
                let N = e.supervisors.get(slug)?.autoReactWiring;
                armMonitorIntent(slug, { title: N?.title, storageV5: N?.context.storageV5 });
              }
              if (I !== void 0 && signal.aborted);
              else if (I !== void 0)
                if (
                  !Z &&
                  isSlugSwept(slug) &&
                  !isSlugOrphaned(slug) &&
                  wakes.humanTurnAtScanGeneration === wakes.scanGeneration
                )
                  (resumeSummonWakes(slug),
                    wakes.liftedAtScanGeneration.set(slug, wakes.scanGeneration),
                    emitSummonArm(e, slug),
                    scheduleThreadScan({ slug: slug, url: url, ...I, seed: !1 }));
                else if (isSlugStopped(slug) && (Cn || ri || xn || !(yn || Z)));
                else if (isSlugStopped(slug)) {
                  let N = isSlugSwept(slug),
                    de = isSlugYielded(slug);
                  if (isAutoreactArmed() && (Z || !N || de))
                    (markAutoReactNoticePending(slug),
                      recordUnaccountedComments(slug),
                      I.notify({
                        summary: (Z ? FWr : u6s)(quoteArtifactName(I.getTitle, url)),
                        detail: `Auto-replies on artifact ${url} were ${Z ? "resumed by a resume_replies request" : "re-enabled by this publish"} \u2014 they had been ${de ? "handed to another session of this conversation that resumed it or published there" : N ? "paused when the user interrupted the session (Ctrl+C or Stop) and the watch had since dropped" : "stopped when their live-updates task was killed"}. ${N && !de ? PAUSE_AUTO_REPLIES_HINT : UNINTENDED_RESUME_HINT}`,
                      }));
                  if (!N || de) resetAutoReactForSlug(slug);
                  (forgetYieldedSlug(slug),
                    forgetDeliveredSlug(slug),
                    resumeSummonWakes(slug),
                    emitSummonArm(e, slug),
                    scheduleThreadScan({ slug: slug, url: url, ...I, seed: !0 }));
                } else {
                  if (wakes.pendingResumeDisclosure.delete(slug))
                    (markAutoReactNoticePending(slug),
                      recordUnaccountedComments(slug),
                      I.notify({
                        summary: FWr(quoteArtifactName(I.getTitle, url)),
                        detail: `Auto-replies on artifact ${url} were resumed by a resume_replies request \u2014 they had been paused when the user interrupted the session (Ctrl+C or Stop); the watch has now connected. ${PAUSE_AUTO_REPLIES_HINT}`,
                      }));
                  if (
                    (scheduleThreadScan({
                      slug: slug,
                      url: url,
                      ...I,
                      seed: !0,
                      ...(n.pickUpRecentSummons === !0 && n.machineArm !== !0 && { pickUpRecentSummons: !0 }),
                      ...(n.machineArm === !0 &&
                        Oe &&
                        isFrameLiveTokenLeaseEnabled() && { deferMs: UBs(e.rewatchTiming) }),
                    }),
                    transport === "sync")
                  ) {
                    let N = getSummonWakeState(slug);
                    Et = { kickCount: N.kickCount, cancelGeneration: N.cancelGeneration };
                  }
                }
              let qe = e.supervisors.get(slug),
                It = qe?.resumeAnnounce;
              if (qe !== void 0 && It !== void 0) {
                qe.resumeAnnounce = void 0;
                let { autoReact: autoReact } = getLiveState(),
                  de =
                    I !== void 0 &&
                    !isSlugStoppedAnywhere(slug) &&
                    !autoReact.userDisarmed &&
                    autoReact.enabledMemo === !0;
                if (
                  !signal.aborted &&
                  !qe.stopped &&
                  !stopLatches.isStopped(slug) &&
                  (de || (!It.wired && I === void 0))
                )
                  It.onOpen();
              }
              if (
                I !== void 0 &&
                (yn || Z || explicit) &&
                !An &&
                !signal.aborted &&
                !stopLatches.isStopped(slug) &&
                !isSlugStoppedAnywhere(slug) &&
                !getLiveState().autoReact.userDisarmed &&
                getLiveState().autoReact.wakeEnabledMemo === !0
              ) {
                An = !0;
                let N = startYieldClaim([slug], Date.now());
                (async () => {
                  let de = await import("./chunk-ewxn4535.js"),
                    ze = await import("./chunk-v19g02mx.js"),
                    Ye = await findLiveReplyHolder({
                      records: await de.listRegisteredSessionRecords(),
                      sessionId: wn,
                      selfPid: process.pid,
                      isRunning: ze.isProcessRunning,
                      isSameProcess: ze.provenSameProcessAsync,
                    });
                  if (Ye.verdict !== "live") {
                    N.end();
                    return;
                  }
                  let { requestReplyTakeover: requestReplyTakeover } = await import("./chunk-4te7h8m1.js"),
                    Ot = (
                      await requestReplyTakeover({
                        holders: [Ye.holder, ...Ye.otherHolders],
                        holdersIncomplete: Ye.unproven === !0,
                        conversationId: wn,
                        slugs: [slug],
                        reason: "claim",
                        alreadyReplying: !0,
                        claim: N,
                      })
                    ).yielded.has(slug),
                    Wn = !Ot && N.lost.has(slug),
                    Je = quoteArtifactName(() => yt(), url);
                  enqueuePendingNotification({
                    value: formatTaskNotification({
                      taskType: ARTIFACT_WATCH_LIFECYCLE,
                      summary: escapeXml(
                        Ot
                          ? `Another session of this conversation handed its replies on ${Je} to this one`
                          : Wn
                            ? `This session handed its replies on ${Je} to another session of this conversation`
                            : `Another session of this conversation is open while replies are armed on ${Je}`,
                      ),
                      body: `
<event>${escapeXml(Ot ? `Another live session of this same conversation was also armed to reply to comments on ${url}; it paused its replies at this session's request, so only this session answers them now. Nothing to do; do not stop a watch on your own.` : Wn ? `Another live session of this same conversation claimed the replies to comments on ${url} a moment after this one; this session paused its own at that session's request, so only that session answers them now. Nothing to do \u2014 a publish the user asks for here takes them back; do not republish or stop a watch on your own.` : `Another live session of this same conversation is running. If it is also replying to comments on ${url}, every comment will get a reply from both sessions until one stops. Tell the user; they can end either session's live-updates task in /tasks. Do not stop a watch on your own.`)}</event>`,
                    }),
                    mode: "task-notification",
                    passive: !0,
                    priority: "next",
                    origin: {
                      kind: "task-notification",
                      source: ARTIFACT_WATCH_LIFECYCLE,
                      slug: slug,
                      displayName: Je,
                    },
                    agentId: mainAgentId(),
                  });
                })().catch(() => {
                  N.end();
                });
              }
              return;
            }
            let Se = ne ? Date.now() - kt : 0,
              Tt = !ne && io(V),
              Ct =
                transport === "sync"
                  ? V === OFt &&
                    (Rn || (O !== void 0 && Date.now() >= O.expMs - AUTO_REPLY_RESUMED_WINDOW_MS))
                  : V === DBs,
              je =
                transport === "sync" &&
                ((ne && V === OFt && !Ct) || (!ne && parseUpgradeRejection(V)?.status === 404)),
              xt = je || (!ne && (Tt || ro(V, Ie, e.rewatchTiming))),
              Lt = ne || xt ? void 0 : ti,
              z = e.supervisors.get(slug);
            if (
              je &&
              ne &&
              Se < e.rewatchTiming.minUptimeMs &&
              z !== void 0 &&
              z.stalledSince === void 0 &&
              We?.stalledSince !== void 0
            )
              ((z.stalledSince = We.stalledSince),
                (z.lastStalledAt = We.lastStalledAt),
                (z.stallOutAfterMs = We.stallOutAfterMs));
            if (z !== void 0 && transport === "sync" && V === MFt && O !== void 0 && z.lease === O)
              delete z.lease;
            if (
              O !== void 0 &&
              z?.lease === O &&
              (!isFrameLiveTokenLeaseEnabled() ||
                (!Tt &&
                  !je &&
                  !shouldRetryDial(O, {
                    expired: Ct,
                    refused: Lt !== void 0,
                    healthy: ne && Se >= e.rewatchTiming.minUptimeMs,
                  })))
            ) {
              if ((delete z.lease, !O.opened)) delete z.renewable;
            }
            if (ne)
              logFeatureSad("artifact_live_subscribe", `socket_closed_${V ?? "unknown"}`, {
                chain_spared: getLiveState().autoReact.artifacts.get(slug)?.scanning === !0,
              });
            else if (Lt !== void 0) logFeatureSad("artifact_live_subscribe", "reuse_connect_failed");
            else {
              let Oe = parseUpgradeRejection(V),
                Me = {
                  ...(xt && { stalled: !0 }),
                  ...(Tt && { shed: !0 }),
                  ...(Oe !== null && { http_status: Oe.status, cf_mitigated: Oe.cfMitigated }),
                };
              if (Object.keys(Me).length > 0) logFeatureBad("artifact_live_subscribe", "connect_failed", Me);
              else logFeatureBad("artifact_live_subscribe", "connect_failed");
            }
            if (z !== void 0 && !z.stopped)
              z.lastFailure = Se < e.rewatchTiming.minUptimeMs ? (V ?? "unknown") : void 0;
            describeResumedWatchFailure(e, slug, {
              uptimeMs: je ? 0 : Se,
              ...(V !== void 0 && { closeCode: V }),
              resumeNeverOpened: Z && !ne,
              reuseRefused: Lt !== void 0,
              stalled: xt,
              expired: Ct,
            });
          },
        },
        context,
      );
      if ((getTaskAssignmentSummary(e, k, slug, A.data.taskId), xe)) (e.pendingRegistrations--, (xe = !1));
      let j = e.supervisors.get(slug);
      if (j === void 0 || j !== k)
        return (
          stopMonitorWsTasks(A.data.taskId, context.taskRegistry, { quiet: !0 }),
          describeSkippedResume(e, slug, n.machineArm),
          { outcome: "skipped", reason: "cancelled" }
        );
      if (x())
        return (
          stopMonitorWsTasks(A.data.taskId, context.taskRegistry, { quiet: !0 }),
          removeSupervisor(e, slug),
          { outcome: "skipped", reason: "cancelled" }
        );
      if (P()) {
        if (
          (stopMonitorWsTasks(A.data.taskId, context.taskRegistry, { quiet: !0 }),
          logFeatureSad("artifact_live_subscribe", "stop_latched"),
          e.armOutcomes.delete(slug),
          Qt(e, slug),
          St || k.lastActivityAt !== lastActivityAt)
        )
          endStoppedWatch(e, k);
        else removeSupervisor(e, slug);
        return { outcome: "skipped", reason: "stop_latched" };
      }
      let be = Z && signal.aborted;
      if (be && T !== void 0 && stopLatches.isStopped(slug))
        return (
          stopMonitorWsTasks(A.data.taskId, context.taskRegistry, { quiet: !0 }),
          removeSupervisor(e, slug),
          { outcome: "skipped", reason: "cancelled" }
        );
      if ((e.armOutcomes.delete(slug), Qt(e, slug), be)) return { outcome: "skipped", reason: "cancelled" };
      if (Z && (getLiveState().wakes.scanGeneration !== scanGeneration || stopGeneration(slug) !== Ue))
        return { outcome: "skipped", reason: "stopped_again" };
      if (vn && le !== void 0) {
        let U = e.supervisors.get(slug);
        if (U === k && !U.stopped && !isHumanTurnWiringStale(e, slug, autoReactWiring))
          U.autoReactWiring = mergeAutoReactWiring(
            U.autoReactWiring,
            { ...le, title: U.autoReactWiring?.title ?? le.title },
            !0,
          );
      }
      let ue = se ? void 0 : e.pendingInFlightWiring.get(slug),
        En = isSlugStopped(slug),
        ni = En || (I !== void 0 && getLiveState().wakes.scanGeneration !== scanGeneration),
        Tn =
          ue !== void 0 &&
          ue.freshPublishWiring &&
          ue.scanGeneration === getLiveState().wakes.scanGeneration &&
          ue.stopGeneration === stopGeneration(slug);
      if (ue === void 0 || signal.aborted || !(I === void 0 ? !En || Tn : !Z && ni && Tn))
        return { outcome: "armed", taskId: A.data.taskId, ...(se && { degraded: "not_editor" }) };
      (e.pendingInFlightWiring.delete(slug),
        (Ce = ue),
        stopMonitorWsTasks(A.data.taskId, context.taskRegistry, { quiet: !0 }));
    } catch {
      let A = e.supervisors.get(slug);
      if (zr && A === k && !(A !== void 0 && A.explicit && !explicit)) removeSupervisor(e, slug);
      else if (Yr && A !== void 0 && A === q) A.explicit = !1;
      if (At !== void 0 && A === k && A.armedVia === "resume") A.armedVia = At;
      else if (bn && A === k && A.armedVia === L && !A.explicit) {
        if (((A.armedVia = "mcp_write"), _n === void 0)) delete A.autoReactWiring;
        else A.autoReactWiring = _n;
        emitSummonArm(e, slug);
      }
      if (A !== void 0 && A === k && A.wake === Ke)
        if (wake === void 0) delete A.wake;
        else A.wake = wake;
      if (A !== void 0 && gt !== void 0) A.resumeAnnounce = void 0;
      if (O !== void 0 && A?.lease === O && !shouldRetryDial(O, { expired: !1, refused: !1, healthy: !1 })) {
        if ((delete A.lease, !O.opened)) delete A.renewable;
      }
      return (
        logFeatureBad("artifact_live_subscribe", F !== void 0 ? "reuse_ws_open_error" : "ws_open_error"),
        skipArm(e, slug, n.machineArm, "ws_open_error", Y)
      );
    }
  } finally {
    (e.inFlightSubscribes.delete(slug),
      e.inFlightWiredIntent.delete(slug),
      e.retiredInFlightArms.delete(slug),
      e.inFlightGenerations.delete(slug),
      e.bootingWiredArms.delete(slug));
    let x = e.supervisors.get(slug);
    if (x === void 0 || x.stopped) Ve(slug)?.sourceEnded();
    let J = e.armSettleWaiters.get(slug) ?? [];
    e.armSettleWaiters.delete(slug);
    for (let D of J)
      try {
        D();
      } catch (error) {
        logError(error);
      }
    if ((e.pendingInFlightWiring.delete(slug), xe)) (e.pendingRegistrations--, (xe = !1));
  }
  if (Ce === void 0) throw Error("armLiveSubscription: late-park fall-through lost its park");
  return FrameLiveWatchManager(e, {
    ...n,
    machineArm: void 0,
    userResumeWiring: void 0,
    approvedRelatchGen: void 0,
    sessionResume: void 0,
    pickUpRecentSummons: void 0,
    editorGatedWiring: void 0,
    autoReactWiring: Ce.wiring,
    freshPublishWiring: Ce.freshPublishWiring,
    freshPublish: n.freshPublish === !0 || Ce.freshPublishWiring,
  });
}
//@ chunk-aqdf5t3e.js:86204-86285 placement
function Dr(e, n, r, s) {
  setWithLimit(e.armOutcomes, n, { outcome: r, reason: s, at: Date.now() }, HGr);
}
/**
 * 记录一次监听布防失败（忽略过期的交接代次与已撤销的布防）；已有定时器重试的只记最近失败；未被停止时登记失败结果，需要时向主会话通知。
 */
//@ chunk-aqdf5t3e.js:86285-86647 placement
function recordArmFailure(e, n, r, s, h) {
  if (r || e.handoffGeneration !== h.handoffGen || e.retiredInFlightArms.has(n)) return;
  let a = e.supervisors.get(n);
  if (a !== void 0 && !a.stopped && a.timer !== void 0) {
    if (s !== "cancelled") a.lastFailure = s;
    return;
  }
  if (e.armOutcomes.has(n)) return;
  let isStopped = getLiveState().durable.stopLatches.isStopped(n);
  if (!isStopped) Dr(e, n, "failed", s);
  if (h.announce && s !== "cancelled" && !isStopped) announceArmFailure(e, n, h, s);
}
//@ chunk-aqdf5t3e.js:87895-87949 placement
function Qt(e, n) {
  (FGr(e.announcedArmFailures, n), pullStaleWatchLifecycleNotices(n));
}
//@ chunk-aqdf5t3e.js:87949-88105 placement
function pullStaleWatchLifecycleNotices(e) {
  kb(
    (n) =>
      n.origin?.kind === "task-notification" &&
      n.origin.source === ARTIFACT_WATCH_LIFECYCLE &&
      n.origin.slug === e &&
      (n.origin.armFailed === !0 || n.origin.watchEnded === !0),
  );
}
/**
 * 实时订阅布防失败时向模型发一次通知（同一 slug 与原因只发一次），说明原因与不会再追踪新版本。
 */
//@ chunk-aqdf5t3e.js:88105-88580 placement
function announceArmFailure(e, n, r, s) {
  if (!addWithLimit(e.announcedArmFailures, `${n}:${s}`, jXn)) return;
  let h = frameLiveSkipReasonPhrase(s) ?? s,
    a = noRewatchAdvice(s) ?? (getLiveState().builtInArtifactHiddenForMcp ? void 0 : NGr);
  enqueueWatchLifecycleNotice({
    slug: n,
    artifactName: quoteArtifactName(r.getTitle, r.url),
    shortReason: SKIP_REASON_PHRASES[s] ?? "not armed",
    event: `The live subscription for ${r.url} did not arm \u2014 ${h}. This session is NOT watching it and does not keep track of new versions of it; ${a === void 0 ? "do not claim to be watching it" : `${a}, and do not claim to be watching it meanwhile`}.`,
  });
}
/**
 * 把 artifact 监听生命周期事件作为任务通知排进下一条消息（可被动），附带 slug 与名称。
 */
//@ chunk-aqdf5t3e.js:88580-88886 placement
function enqueueWatchLifecycleNotice(e) {
  enqueuePendingNotification({
    value: formatTaskNotification({
      taskType: ARTIFACT_WATCH_LIFECYCLE,
      summary: escapeXml(y6s(e.artifactName, e.shortReason)),
      body: `
<event>${escapeXml(e.event)}</event>`,
    }),
    mode: "task-notification",
    priority: "next",
    ...(e.passive && { passive: !0 }),
    origin: {
      kind: "task-notification",
      source: ARTIFACT_WATCH_LIFECYCLE,
      slug: e.slug,
      displayName: e.artifactName,
      armFailed: !0,
    },
    agentId: mainAgentId(),
  });
}
//@ chunk-aqdf5t3e.js:88886-89797 placement
function onDurablePublishArmSettled(e) {
  let { slug: slug, url: url, liveDocLoss: liveDocLoss, claudeDoc: claudeDoc, settlement: settlement } = e;
  if (settlement.settled === "registered") {
    if (
      (pullStaleWatchLifecycleNotices(slug),
      claudeDoc && getLiveState().durable.rows.get(slug)?.events.includes("comment") === !1)
    )
      noteClaudeDocWakeMissing(slug, url, "comment events unsupported");
    return;
  }
  if (settlement.settled !== "unregistered") return;
  let {
      reason: reason,
      detail: detail,
      serverMessage: serverMessage,
      refusedByFrame: refusedByFrame,
    } = settlement,
    R = getLiveState().builtInArtifactHiddenForMcp ? null : bDr(reason);
  if (claudeDoc) {
    noteClaudeDocWakeMissing(
      slug,
      url,
      detail === void 0 ? reason : `${reason}: ${detail}`,
      refusedByFrame
        ? void 0
        : `${describeWatchError(reason, serverMessage)}${R === null ? "" : ` To try again, ${R}.`}`,
    );
    return;
  }
  if (!claimArmFailureAnnouncement(slug, reason)) return;
  let C =
    liveDocLoss ??
    `This session will NOT be woken when ${Xb() ? "it is republished or a comment on it is sent to Claude" : "it is republished"}`;
  enqueueWatchLifecycleNotice({
    slug: slug,
    artifactName: quoteArtifactName(e.getTitle, url),
    shortReason: "wake subscription not registered",
    event: `The durable wake subscription for ${url} was not registered (${reason}${detail !== void 0 ? `: ${detail}` : ""}) \u2014 ${describeWatchError(reason, serverMessage)} ${C}${R === null ? "" : `; ${R}`} \u2014 do not claim to be subscribed to it meanwhile.`,
  });
}
//@ chunk-aqdf5t3e.js:89797-90232 placement
function noteClaudeDocWakeMissing(e, n, r, s) {
  if (!claimArmFailureAnnouncement(e, "claude_doc")) return;
  enqueueWatchLifecycleNotice({
    slug: e,
    artifactName: n,
    shortReason: "comment wake not registered",
    event: `@Claude comments on the Claude Doc ${n} go to another Claude and will not reach this session: its comment wake was not registered (${r}).${s === void 0 ? "" : ` ${s}`} To see them, read the doc's comments yourself with the Claude Docs connector's \`${QUERY}\`, and do not claim to be subscribed to it.`,
    passive: !0,
  });
}
//@ chunk-aqdf5t3e.js:90232-90283 placement
function isFrameLiveRowConnecting(e) {
  return e.connected && !LFt(e.taskId);
}
//@ chunk-aqdf5t3e.js:90283-91453 placement
function frameLiveArmRows(e, n) {
  let live = getLiveState().live,
    s = new Set();
  for (let S of Object.values(e.taskRegistry.all()))
    if (eW(S) && S.status === "running" && S.frameLive !== void 0) s.add(S.frameLive.slug);
  let stopLatches = getLiveState().durable.stopLatches,
    a = (S) => (n === void 0 || S === n) && !s.has(S) && !stopLatches.isStopped(S),
    d = new Set(frameLiveStoppedRows(e, n).map((S) => S.slug)),
    b = [],
    w = new Set();
  for (let inFlightSubscribe of live.inFlightSubscribes) {
    if (
      !a(inFlightSubscribe) ||
      (live.inFlightGenerations.get(inFlightSubscribe) ?? live.handoffGeneration) !==
        live.handoffGeneration ||
      live.retiredInFlightArms.has(inFlightSubscribe)
    )
      continue;
    w.add(inFlightSubscribe);
    let R = live.supervisors.get(inFlightSubscribe),
      C = R !== void 0 && !R.stopped ? R : void 0;
    b.push({
      slug: inFlightSubscribe,
      state: "arming",
      reconnect: C?.taskId !== void 0,
      failures: C?.consecutiveFailures ?? 0,
      ...(C?.lastFailure !== void 0 && { lastFailure: C.lastFailure }),
    });
  }
  for (let S of live.supervisors.values()) {
    if (!a(S.slug) || w.has(S.slug) || S.stopped || S.timer === void 0) continue;
    if ((w.add(S.slug), d.has(S.slug))) continue;
    b.push({
      slug: S.slug,
      state: "backing_off",
      failures: S.consecutiveFailures,
      maxFailures: live.rewatchTiming.maxConsecutiveFailures,
      nextAt: S.nextRewatchAt ?? Date.now(),
      ...(S.lastFailure !== void 0 && { lastFailure: S.lastFailure }),
    });
  }
  for (let [S, R] of live.armOutcomes) {
    if (!a(S) || w.has(S)) continue;
    b.push({ slug: S, state: R.outcome, reason: R.reason, at: R.at });
  }
  return b;
}

export {
  maybeSubscribeFrameLive,
  slugRepliesWiredHere,
  onArmSettled,
  teardownFrameLiveForProcessHandoff,
  watchArtifactFromStartup,
  isClaimableAutoReactSubscription,
  hasStoppableAutoReactSupervision,
  killAutoReactSubscriptions,
  frameLiveArmRows,
  frameLiveWatchRows,
  knownNonEditor,
  isFrameLiveRowConnecting,
  frameLiveStoppedRows,
  unwatchFrameLive,
  pullStaleWatchLifecycleNotices,
  watchFrameLive,
  makeArtifactReadVersionReader,
  onDurablePublishArmSettled,
  frameLivePublishSkipReason,
  frameLivePublishFindsConnected,
  noteClaudeDocWakeMissing,
  Xt,
  Ve,
  Dr,
  recordArmFailure,
  FrameLiveWatchManager,
  ct,
  touchSupervisorActivity,
  ke,
  findArmedAutoReactMonitor,
  liftSweptPause,
  endFrameLiveWatchOfDeletedArtifact,
  subscribeFrameLiveOnAttach,
};
