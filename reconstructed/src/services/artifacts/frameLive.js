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
import {
  addWithLimit,
  MAX_CRON_OWNERSHIP_KEYS,
  setWithLimit,
  MAX_CRON_OWNERSHIP_ENTRIES,
  removeCronOwnedKeys,
  MISSED_WATCH_RELAUNCH_ADVICE,
} from "../../utils/cronTasks.js";
import {
  getLiveState,
  REFUSED_CAPACITY_HINT,
  isPresenceDeclined,
  retirePresenceSlug,
} from "../liveReplica/liveReplica.js";
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
  activityFrame,
  addAgentActivitySink,
  addActivitySender,
  removeAgentActivitySink,
  removeActivitySender,
} from "./presenceSocket.js";
import {
  INVALIDATION_EVENT_SCHEMA,
  INVALIDATE_TAG_LIVE,
  INVALIDATE_TAG_SHARED,
  INVALIDATE_TAG_HEAD,
  COMMENTS_READ_STATE_SCHEMA,
  hasHumanMessageContaining,
  presenceSkipReason,
  adjustKeepaliveForIdle,
  keepaliveDeadline,
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
  isMonitorSocketOpenNow,
  isMonitorWsTaskLive,
  isMonitorWsTask,
  stopMonitorWsTasks,
  isAutoReactArmedTask,
  clearOrphanedAutoReactNotices,
  closeAllMonitorSockets,
  setFrameLiveUserStopObserver,
  setAutoReactDeliberateStopObserver,
  setAutoReactHumanTurnObserver,
  artifactWatchStopNotice,
} from "../../tasks/MonitorWsTask/MonitorWsTask.js";
import {
  isAutoreactArmed,
  disarmAutoreact,
  hasThreadAgentForSlugPost,
  isAutoReactEnabled,
} from "./comments/postReply.js";
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
  isRecentOwnPublish,
  MADE_ROOM_PHRASE,
  stopWatchesForSlug,
  armedViaWording,
  labelledArmedVia,
  frameLiveWsUrl,
  upsertSupervisor,
  mergeAutoReactWiring,
  skipArm,
  stopWatchFromTask,
  isHumanTurnWiringStale,
  describeSubscribeFailure,
  liveNotificationEnqueuer,
  createLiveEventHandlers,
  FRAME_LIVE_V1,
  ARM_RETRY_DELAY_WORDING_MS,
  PAUSE_AUTO_REPLIES_HINT,
  UNINTENDED_RESUME_HINT,
  isRetryableUpgradeRejection,
  AUTO_REPLY_RESUMED_WINDOW_MS,
  isHandshakeStall,
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
} from "./artifactNotices.js";
import { isArtifactScanBusy, isCommentAutoreactOptedIn } from "./comments/autoreactGates.js";
import {
  forgetCommentMonitorIntents,
  monitorStorage,
  ownProcStart,
  markSlugTravelling,
  armCommentMonitorIntent,
  runCommentMonitorWithIntent,
} from "./commentMonitor.js";
import {
  setReplConfigArgv,
  getReplConfigArgv,
  mainAgentId,
  getSessionId,
  getIsNonInteractiveSession,
} from "../../bootstrap/state.js";
import { enqueuePendingNotification, removeQueuedByFilter } from "../../utils/messageQueueManager.js";
import { formatTaskNotification } from "../../utils/xmlTags.js";
import { ARTIFACT_WATCH_LIFECYCLE } from "../../constants/xml.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { forgetCensus } from "./comments/threadPrompts.js";
import { isConsentUiKind } from "./comments/repliesConsent.js";
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
import { isClaudeAiCpOverride, claudeAiEnvironment } from "../../constants/claudeAiOrigin.js";
import { wsEgressDenyReason } from "../../tools/MonitorTool/MonitorTool.js";
import { ARTIFACT_SLUG_RE } from "../../tools/ArtifactTool/constants.js";
import { readFreshOauthAccountFromDisk } from "../../utils/config.js";
import { sameOwnerAccount } from "../../utils/auth.js";
import { renewWatchToken, fetchLiveSubscription, recordHeardVersion } from "./liveSubscribe.js";
import { isOtherOrg } from "./orgScope.js";
import { sanitizeArtifactTitle } from "../../tools/ArtifactTool/artifactUrls.js";
import { newLaneNoticeId } from "./commentReads.js";
import { getUserAgent } from "../../utils/http.js";
import {
  autoRepliesResumedNotice,
  autoRepliesReenabledNotice,
  notWatchingNotice,
} from "../../tools/ArtifactTool/artifactNotices.js";
import { forgetDeliveredSlug, startYieldClaim } from "./replyYield.js";
import { findLiveReplyHolder } from "./comments/replyYield.js";
import { getTaskAssignmentSummary } from "../../components/messages/TaskAssignmentMessage.js";
import { logError } from "../../utils/log.js";
import { unexpectedWatchFailure, describeWatchError } from "./durableWatch.js";
import { isArtifactsAvailable } from "./artifactAvailability.js";
import { QUERY } from "../mcp/firstPartyServerIds.js";

//@ chunk-aqdf5t3e.js:7727-7806 placement = listAllCronTasks (0.609)
function claimArmFailureAnnouncement(e, n) {
  return addWithLimit(getLiveState().durable.announcedArmFailures, `${e}:${n}`, MAX_CRON_OWNERSHIP_KEYS);
}
//@ chunk-aqdf5t3e.js:38633-38869 placement = splitCommandWithOperators (0.316)
/**
 * 返回逐行处理器：对以 { 开头的行解析 JSON，comment 类型回调 comment()，ver 字段回调 ver(v,'live')，其他忽略。旧版名 splitCommandWithOperators 误配，属 frameLive 相关模块。
 */
function makeLiveVersionLineHandler(command) {
  return (match) => {
    if (!match.startsWith("{")) return null;
    let r;
    try {
      r = jsonParseRaw(match);
    } catch {
      return null;
    }
    if (r.kind === "comment") {
      command.comment();
      return null;
    }
    if (r.kind === "summon") return null;
    if (typeof r.ver === "string") command.ver(r.ver, "live");
    return null;
  };
}
//@ chunk-aqdf5t3e.js:38869-38889 placement
/**
 * 实时订阅消息里版本号字段的正则（1–15 位数字）。
 */
var VERSION_NUMBER_RE = /^\d{1,15}$/;
//@ chunk-aqdf5t3e.js:38889-38946 placement
function liveDocHeadSink(slug) {
  return getLiveState().liveDocWatch.headSinks.get(slug);
}
//@ chunk-aqdf5t3e.js:38946-39110 placement
/**
 * 更新实时订阅监督器的最近活动时间（已停止、经 MCP 写入布防或订阅进行中时不更新）。
 */
function touchSupervisorActivity(e) {
  let live = getLiveState().live;
  let r = live.supervisors.get(e);
  if (r !== undefined && !r.stopped && r.armedVia !== "mcp_write" && !live.inFlightSubscribes.has(e))
    r.lastActivityAt = Date.now();
}
//@ chunk-aqdf5t3e.js:39110-40054 placement
function handleFrameLiveControl(e, slug, r) {
  return (s) => {
    if (s.charCodeAt(0) !== 123) return null;
    let h;
    try {
      h = jsonParseRaw(s);
    } catch {
      return null;
    }
    let a = PRESENCE_EVENT_SCHEMA().safeParse(h);
    if (!a.success) return null;
    let { kind, actor, payload } = a.data;
    if (actor !== undefined || (a.data.slug !== undefined && a.data.slug !== slug)) return null;
    switch (kind) {
      case "ctrl:comment":
        e.comment();
        return null;
      case "ctrl:invalidate": {
        let S = INVALIDATION_EVENT_SCHEMA().safeParse(payload);
        if (!S.success) return null;
        if (S.data.tag === INVALIDATE_TAG_LIVE || S.data.tag === INVALIDATE_TAG_SHARED)
          e.ver(S.data.ver, "sync");
        else if (S.data.tag === INVALIDATE_TAG_HEAD && VERSION_NUMBER_RE.test(S.data.ver)) {
          touchSupervisorActivity(slug);
          liveDocHeadSink(slug)?.seq(Number(S.data.ver));
        }
        return null;
      }
      case "ctrl:token_refresh": {
        let S = TOKEN_REFRESH_SCHEMA().safeParse(payload);
        if (S.success && isAgentCapToken(S.data.cap)) r.onTokenRefresh(S.data.cap, S.data.exp);
        return null;
      }
      case "ctrl:token_refresh_declined": {
        let S = DECLINE_REASON_SCHEMA().safeParse(payload);
        if (S.success && S.data.reason === TOKEN_LINEAGE_EXPIRED) r.onExpiryAnnounced();
        return null;
      }
      case "ctrl:comment_hint": {
        let S = COMMENTS_READ_STATE_SCHEMA().safeParse(payload);
        if (S.success) r.onCommentHint(S.data.commentsEmpty, S.data.readAtMs);
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
      ? h && (e.autoReactArmed !== true || !isSlugSwept(n) || isSlugOrphaned(n))
      : e.autoReactArmed !== true)
    ? "replace"
    : "keep";
}
//@ chunk-aqdf5t3e.js:40203-40247 placement
function isMonitorTaskLive(e, n) {
  return isMonitorSocketOpenNow(e.id) && isMonitorWsTaskLive(e, n);
}
//@ chunk-aqdf5t3e.js:40247-40585 placement
/**
 * 整理某 slug 正在运行的监听任务：已失联的停掉（标记连接丢失），需要替换的安静停掉，返回保留下来的任务 id。
 */
function reconcileMonitorTasks(context, slug, commentVerbsInSchema, s) {
  let now = Date.now();
  let a = null;
  for (let d of Object.values(context.taskRegistry.all())) {
    if (!isMonitorWsTask(d) || d.status !== "running" || d.frameLive?.slug !== slug) continue;
    let b = classifyMonitorTask(d, slug, now, commentVerbsInSchema, s, isMonitorWsTaskLive);
    if (b !== "dead") {
      if (b === "replace") {
        stopMonitorWsTasks(d.id, context.taskRegistry, {
          quiet: true,
        });
        continue;
      }
      a = d.id;
      continue;
    }
    stopMonitorWsTasks(d.id, context.taskRegistry, {
      quiet: true,
      connectionLost: true,
    });
  }
  return a;
}
//@ chunk-aqdf5t3e.js:40585-40694 placement
function hasRunningMonitor(e, n) {
  return Object.values(e.all()).some(
    (r) => isMonitorWsTask(r) && r.status === "running" && r.frameLive?.slug === n,
  );
}
//@ chunk-aqdf5t3e.js:40694-40750 placement
function isAutoreactTaskArmed(e) {
  return isAutoReactArmedTask(e, isAutoreactArmed, {
    includeStopLatched: true,
  });
}
//@ chunk-aqdf5t3e.js:40750-40783 placement
function isClaimableAutoReactSubscription(e) {
  return isAutoReactArmedTask(e, isAutoreactArmed);
}
//@ chunk-aqdf5t3e.js:40783-41789 placement
function killAutoReactSubscriptions(taskRegistry, n) {
  setLedgerStorage(n?.storageV5);
  clearSummonWakeTimers();
  bumpScanGeneration();
  let live = getLiveState().live;
  let s = n?.durable !== false;
  let h = 0;
  let a = new Set();
  for (let d of Object.values(taskRegistry.all()))
    if (isAutoreactTaskArmed(d)) {
      let b =
        d.autoReactSlug !== undefined &&
        isSlugStopped(d.autoReactSlug) &&
        (!isSlugSwept(d.autoReactSlug) || isSlugYielded(d.autoReactSlug));
      if (s) {
        stopMonitorWsTasks(d.id, taskRegistry, {
          quiet: true,
          userStop: true,
        });
        if (d.autoReactSlug !== undefined) {
          resetAutoReactForSlug(d.autoReactSlug);
          a.add(d.autoReactSlug);
        }
      } else if (d.autoReactSlug !== undefined) a.add(d.autoReactSlug);
      if (!b && !(d.autoReactSlug !== undefined && !s && isSlugStopped(d.autoReactSlug))) {
        h++;
        if (!s && d.autoReactSlug !== undefined) {
          sweepSlug(d.autoReactSlug);
          emitSummonArm(live, d.autoReactSlug);
        }
      }
    }
  for (let supervisor of live.supervisors.values()) {
    if (supervisor.autoReactWiring === undefined) continue;
    if (s) delete supervisor.autoReactWiring;
    if (s && isAutoreactArmed() && (!isSlugStopped(supervisor.slug) || a.has(supervisor.slug)))
      if (hasRunningMonitor(taskRegistry, supervisor.slug) || live.inFlightSubscribes.has(supervisor.slug))
        demoteExplicitWatch(live, supervisor.slug, taskRegistry);
      else {
        removeSupervisor(live, supervisor.slug);
        hasWatchArtifactArg(supervisor.slug, supervisor.context.storageV5);
      }
    if (!a.has(supervisor.slug) && isAutoreactArmed() && !isSlugStopped(supervisor.slug)) {
      a.add(supervisor.slug);
      h++;
      if (s) {
        resetAutoReactForSlug(supervisor.slug);
        stopSummonWakes(supervisor.slug);
      } else sweepSlug(supervisor.slug);
    }
  }
  if (s)
    disarmAutoreact({
      storageV5: n?.storageV5,
    });
  else if (h > 0)
    flushAutoreactLedger({
      flush: true,
      storageV5: n?.storageV5,
    });
  return h;
}
//@ chunk-aqdf5t3e.js:41789-42204 placement
/**
 * 解除某 slug 被清扫暂停的自动回复：仍有活跃自动回复监听任务时恢复召唤唤醒并广播；若有上次唤醒参数则重新安排扫描（返回 lifted），否则返回 cleared；不满足条件返回 null。
 */
function liftSweptPause(taskRegistry, n, r, s) {
  if (!isSlugSwept(n) || isSlugOrphaned(n) || !isAutoreactArmed()) return null;
  let armedAutoReactMonitor = findArmedAutoReactMonitor(taskRegistry, n);
  if (armedAutoReactMonitor === undefined) return null;
  s?.();
  let { live, wakes } = getLiveState();
  resumeSummonWakes(n);
  wakes.liftedAtScanGeneration.set(n, wakes.scanGeneration);
  emitSummonArm(live, n);
  let lastWakeArgs = getSummonWakeState(n).lastWakeArgs;
  if (!isMonitorSocketOpenNow(armedAutoReactMonitor.id) || lastWakeArgs === null) return "cleared";
  r?.(lastWakeArgs);
  scheduleThreadScan({
    ...lastWakeArgs,
    seed: false,
    confirm: undefined,
    confirmBase: undefined,
    confirmAfter: undefined,
    reentry: undefined,
    idlePass: undefined,
    suppressSummonStatus: undefined,
  });
  return "lifted";
}
//@ chunk-aqdf5t3e.js:42204-42342 placement
/**
 * 找到为指定 slug 布防自动响应且正在运行的监视任务。
 */
function findArmedAutoReactMonitor(e, n) {
  return Object.values(e.all()).find(
    (r) =>
      isMonitorWsTask(r) &&
      r.status === "running" &&
      r.autoReactArmed === true &&
      r.autoReactSlug === n &&
      isMonitorWsTaskLive(r),
  );
}
//@ chunk-aqdf5t3e.js:42342-42486 placement
function releaseNoticeLatchesOnTurn(taskRegistry, n) {
  if (n.ownWords) {
    let r = clearOrphanedAutoReactNotices(
      (s) => hasThreadAgentForSlugPost(s) || hasActivitySince(taskRegistry, autoReactNoticeLatchedAt(s)),
    );
    if (r > 0)
      logFeatureOk("artifact_live_subscribe", {
        notice_latch_released: r,
      });
  }
  return unpauseSweptOnHumanTurn(taskRegistry);
}
//@ chunk-aqdf5t3e.js:42486-42589 placement
function hasActivitySince(e, n) {
  if (n === undefined) return false;
  return Object.values(e.all()).some((r) => r.startTime >= n && isTaskActive(r));
}
//@ chunk-aqdf5t3e.js:42589-42952 placement
/**
 * 判断任务是否仍处于活跃状态：shell/监视任务看运行或等待；agent 任务另外包括因非空闲原因保活的已完成任务与正在恢复的任务。
 */
function isTaskActive(e) {
  let n = e.status === "running" || e.status === "pending";
  if (e.type === "local_bash" || isMonitorShellTask(e)) return n;
  if (!AGENT_TASK_TYPES.has(e.type) || e.type === "in_process_teammate") return false;
  let r =
    e.status === "completed" &&
    "keepaliveReasons" in e &&
    e.keepaliveReasons instanceof Set &&
    [...e.keepaliveReasons].some((keepaliveReason) => keepaliveReason !== "flag:idle-window");
  let s = "resuming" in e && e.resuming === true;
  return n || r || s;
}
//@ chunk-aqdf5t3e.js:42952-43156 placement
/**
 * 人类发起新回合时记下扫描代次，并尝试解除所有被清扫暂停的 slug，打点解除数量。
 */
function unpauseSweptOnHumanTurn(e) {
  let { wakes } = getLiveState();
  wakes.humanTurnAtScanGeneration = wakes.scanGeneration;
  let r = 0;
  for (let sweptSlug of [...wakes.sweptSlugs]) if (liftSweptPause(e, sweptSlug) !== null) r++;
  if (r > 0)
    logFeatureOk("artifact_live_subscribe", {
      unpaused_on_turn: r,
    });
  return r;
}
//@ chunk-aqdf5t3e.js:43156-43235 placement
function hasStoppableAutoReactSupervision() {
  return getLiveState().builtInArtifactHiddenForMcp
    ? hasActiveAutoReactWatch() && isAutoreactArmed()
    : isAutoreactArmed() && hasActiveAutoReactWatch();
}
//@ chunk-aqdf5t3e.js:43235-44062 placement
function frameLiveWatchRows(context, slug) {
  let r = [];
  let s;
  let h = () => (s ??= isAutoReactEnabled());
  let liveState = getLiveState();
  let userDisarmed = liveState.autoReact.userDisarmed;
  for (let b of Object.values(context.taskRegistry.all())) {
    if (
      !isMonitorWsTask(b) ||
      b.status !== "running" ||
      b.frameLive === undefined ||
      (slug !== undefined && b.frameLive.slug !== slug)
    )
      continue;
    let w = liveState.live.supervisors.get(b.frameLive.slug);
    r.push({
      slug: b.frameLive.slug,
      taskId: b.id,
      since: b.frameLive.watchedSince,
      explicit: w?.explicit ?? b.frameLive.explicit,
      connected: isMonitorWsTaskLive(b),
      tokenExpiresAt:
        w?.lease?.expMs ??
        b.frameLive.armedAt + (w?.transport === "sync" ? ROUTE_ABSENT_GRACE_MS : SUMMON_STATE_TTL_MS),
      armedVia: w?.armedVia ?? b.frameLive.armedVia,
      autoReply:
        b.autoReactArmed !== true
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
              : b.autoReactSlug !== undefined && isSlugStoppedAnywhere(b.autoReactSlug)
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
function getAutoReactArmState(slug) {
  let n = getLiveState().autoReact.artifacts.get(slug);
  let lastProbeDeniedBy = n?.lastProbeDeniedBy ?? null;
  if (lastProbeDeniedBy !== null) return lastProbeDeniedBy === "denied_by_auto_mode" ? "declined" : "denied";
  return n?.lastReplyDeclinedByAutoMode === true ? "declined" : "armed";
}
//@ chunk-aqdf5t3e.js:44271-44838 placement
function frameLiveStoppedRows(e, n) {
  let { live, autoReact, wakes } = getLiveState();
  let a = [];
  let d;
  let b = () => (d ??= isAutoReactEnabled());
  for (let stoppedSlug of wakes.stoppedSlugs) {
    if (n !== undefined && stoppedSlug !== n) continue;
    if (
      hasRunningMonitor(e.taskRegistry, stoppedSlug) ||
      live.inFlightSubscribes.has(stoppedSlug) ||
      (!autoReact.userDisarmed && !b())
    )
      continue;
    let S = live.supervisors.get(stoppedSlug);
    let R = S !== undefined && !S.stopped ? S : undefined;
    a.push({
      slug: stoppedSlug,
      ...(R !== undefined && {
        since: R.watchedSince,
        explicit: R.explicit,
        armedVia: R.armedVia,
      }),
      stopKind: isSlugSwept(stoppedSlug) ? (isSlugYielded(stoppedSlug) ? "yielded" : "interrupt") : "user",
      autoReply: autoReact.userDisarmed ? "disarmed" : "stopped",
    });
  }
  return a.sort((w, S) => (w.since ?? Number.POSITIVE_INFINITY) - (S.since ?? Number.POSITIVE_INFINITY));
}
//@ chunk-aqdf5t3e.js:44838-45394 placement
function classifyWatchReason(e, context, { forPublish: r = false } = {}) {
  let { supervisors } = e;
  let h = [];
  for (let a of frameLiveWatchRows(context)) {
    let d = supervisors.get(a.slug);
    let watchProtectionForRow = getWatchProtectionForRow(e, a, context);
    if (watchProtectionForRow === "explicit" || watchProtectionForRow === "most_recent_publish") continue;
    if (watchProtectionForRow === "auto_reply") {
      if (!r || isArtifactScanBusy(a.slug)) continue;
      h.push({
        row: a,
        tier: 3,
      });
      continue;
    }
    h.push({
      row: a,
      tier: d === undefined || d.stopped ? 0 : d.armedVia === "mcp_write" ? 1 : 2,
    });
  }
  return h
    .sort((a, d) => {
      if (a.tier !== d.tier) return a.tier - d.tier;
      let b = supervisors.get(a.row.slug);
      let w = supervisors.get(d.row.slug);
      let lastActivityAt = b && !b.stopped ? b.lastActivityAt : 0;
      let lastActivityAt_2 = w && !w.stopped ? w.lastActivityAt : 0;
      return lastActivityAt - lastActivityAt_2 || a.row.since - d.row.since;
    })
    .map((a) => a.row);
}
//@ chunk-aqdf5t3e.js:45394-46047 placement
/**
 * 为腾位置停掉一个监听：停止监听任务，若它在自动回复则忘掉其意图，并通知主会话（达到监听数上限、为新监听腾出位置）；打点。
 */
function evictWatch(live, candidate, context, options) {
  let supervisor = live.supervisors.get(candidate.slug);
  let wasAutoReply = getWatchProtectionForRow(live, candidate, context) === "auto_reply";
  stopMonitorWsTasks(candidate.taskId, context.taskRegistry, {
    quiet: true,
  });
  if (wasAutoReply && !isSlugYielded(candidate.slug))
    forgetCommentMonitorIntents(candidate.slug, {
      storageV5: supervisor?.context.storageV5 ?? monitorStorage(),
    });
  if (supervisor !== undefined && !supervisor.stopped)
    endWatch(
      live,
      supervisor,
      options?.why ??
        `this session reached its limit of ${REFUSED_CAPACITY_HINT} artifact watches and made room to watch a newer one${wasAutoReply ? "; it was auto-replying to comments, and that stops until its next publish" : ""}`,
      options?.shortReason ?? "made room for a newer watch",
      options !== undefined
        ? {
            advice: NO_AUTO_RETURN_ADVICE,
            passive: true,
          }
        : wasAutoReply
          ? {
              advice: "do not watch it again unless the user asks",
            }
          : undefined,
    );
  else removeSupervisor(live, candidate.slug);
  logFeatureOk("artifact_live_subscribe", {
    evicted_least_active: true,
    ...(wasAutoReply && {
      evicted_autoreply: true,
    }),
  });
}
//@ chunk-aqdf5t3e.js:46047-46273 placement
function getWatchProtection(e, n) {
  let r = e.supervisors.get(n);
  if (r === undefined || r.stopped) return null;
  if (r.explicit) return "explicit";
  if (isRecentOwnPublish(e, r)) return "most_recent_publish";
  return r.autoReactWiring !== undefined && isAutoreactArmed() && (!isSlugStopped(n) || isSlugSwept(n))
    ? "auto_reply"
    : null;
}
//@ chunk-aqdf5t3e.js:46273-46312 placement
function hasWatchProtection(e, slug) {
  return getWatchProtection(e, slug) !== null;
}
//@ chunk-aqdf5t3e.js:46312-46500 placement
function getWatchProtectionForRow(e, n, r) {
  let s = e.supervisors.get(n.slug);
  if (s !== undefined && !s.stopped) return getWatchProtection(e, n.slug);
  let h = r.taskRegistry.all()[n.taskId];
  return n.explicit ? "explicit" : isClaimableAutoReactSubscription(h) ? "auto_reply" : null;
}
//@ chunk-aqdf5t3e.js:46500-46708 placement
function evictForProtectedReconnect(live, context) {
  let r = classifyWatchReason(live, context);
  if (r.length === 0) return false;
  evictWatch(live, r[0], context, {
    why: `this session reached its limit of ${REFUSED_CAPACITY_HINT} artifact watches and made room for a protected watch to reconnect`,
    shortReason: MADE_ROOM_PHRASE,
  });
  return true;
}
//@ chunk-aqdf5t3e.js:46708-46943 placement
function teardownFrameLiveForProcessHandoff() {
  let live = getLiveState().live;
  live.handoffGeneration += 1;
  live.bootingWiredArms.clear();
  setReplConfigArgv(stripWatchArtifactArgs(getReplConfigArgv()));
  flushAutoreactLedger({
    flush: true,
  });
  retireAutoreactLedger();
  clearSummonWakeTimers();
  bumpScanGeneration();
  for (let key of [...live.supervisors.keys()]) removeSupervisor(live, key);
  live.armOutcomes.clear();
  live.announcedArmFailures.clear();
  closeAllMonitorSockets();
}
//@ chunk-aqdf5t3e.js:46943-48480 placement
function startFrameLiveWatch(e) {
  let live = getLiveState().live;
  live.handoffGeneration += 1;
  clearSummonWakeTimers();
  bumpScanGeneration();
  let r = 0;
  for (let supervisor of [...live.supervisors.values()]) {
    if (!supervisor.stopped) r++;
    if (supervisor.autoReactWiring !== undefined) {
      let { slug } = supervisor;
      import("./chunk-4te7h8m1.js").then((b) => b.handBackTakenOverSlug(slug));
    }
    delete supervisor.autoReactWiring;
    removeSupervisor(live, supervisor.slug);
    for (let d of Object.values(supervisor.context.taskRegistry.all())) {
      if (!isMonitorWsTask(d) || d.status !== "running" || d.frameLive?.slug !== supervisor.slug) continue;
      stopMonitorWsTasks(d.id, supervisor.context.taskRegistry, {
        quiet: true,
      });
    }
  }
  live.armOutcomes.clear();
  live.announcedArmFailures.clear();
  if (r === 0) return r;
  let s = `${r} artifact ${r === 1 ? "watch" : "watches"}`;
  let h =
    e === "signed_out"
      ? "Those watches were opened as the account that signed out: this session no longer keeps track of new versions of those artifacts or hears comments on them, and their comment auto-replies are off. A publish or watch of yours once someone is signed in opens a fresh watch; do not re-watch just to resume listening unless the user asks."
      : "Those watches were opened as the previous account: this session no longer keeps track of new versions of those artifacts or hears comments on them, and their comment auto-replies are off. A publish or watch of yours opens a fresh watch as the current account; do not re-watch just to resume listening unless the user asks.";
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
    passive: true,
    priority: "next",
    origin: {
      kind: "task-notification",
      source: ARTIFACT_WATCH_LIFECYCLE,
    },
    agentId: mainAgentId(),
  });
  return r;
}
//@ chunk-aqdf5t3e.js:48480-48827 placement
function unwatchFrameLive(slug, n, consentWriter) {
  let { wasWatching } = stopLiveWatch(slug, n);
  getLiveState().live.nonEditorSlugs.delete(slug);
  if (consentWriter !== undefined) {
    let repliesConsent = getLiveState().live.repliesConsent;
    let a = repliesConsent.outstanding.get(slug);
    if (a !== undefined) {
      repliesConsent.outstanding.delete(slug);
      if (a.allowed !== true)
        repliesConsent.declined.set(slug, {
          namingMessages: a.namingMessages,
        });
    }
    repliesConsent.approved.delete(slug);
  }
  logFeatureOk("artifact_live_subscribe", {
    unwatched: wasWatching,
  });
  return {
    wasWatching,
  };
}
//@ chunk-aqdf5t3e.js:48827-48960 placement
function endFrameLiveWatchOfDeletedArtifact(slug, context) {
  hasWatchArtifactArg(slug, context.storageV5);
  let { wasWatching } = stopLiveWatch(slug, context);
  if (wasWatching)
    logFeatureOk("artifact_live_subscribe", {
      unwatched: true,
      artifact_deleted: true,
    });
}
//@ chunk-aqdf5t3e.js:48960-49375 placement
/**
 * 停止某 slug 的实时监听：清除布防结果与召唤状态，停掉对应任务（自动回复任务按用户停止处理并重置台账），返回之前是否在监听。
 */
function stopLiveWatch(e, n) {
  let live = getLiveState().live;
  setLedgerStorage(n.storageV5);
  live.armOutcomes.delete(e);
  forgetArmOutcomeAndNotices(live, e);
  forgetCensus(e);
  let s = live.supervisors.get(e)?.autoReactWiring !== undefined;
  let { wasWatching } = stopWatchesForSlug({
    slug: e,
    taskRegistry: n.taskRegistry,
    announce: false,
    killRow: (a) => {
      let d = a.autoReactArmed === true;
      stopMonitorWsTasks(
        a.id,
        n.taskRegistry,
        d
          ? {
              quiet: true,
              userStop: true,
              modelOrigin: true,
            }
          : {
              quiet: true,
            },
      );
      if (d && a.autoReactSlug !== undefined) resetAutoReactForSlug(a.autoReactSlug);
    },
  });
  if (s) resetAutoReactForSlug(e);
  return {
    wasWatching,
  };
}
//@ chunk-aqdf5t3e.js:49375-50486 placement
async function watchFrameLive(e) {
  let { slug, url, publishContext, getKnownVer, context, tool, commentVerbsInSchema } = e;
  if (!isConsentUiKind(publishContext))
    return {
      outcome: "skipped",
      reason: "publish_context",
    };
  let live = getLiveState().live;
  let S = tool !== undefined && commentVerbsInSchema === true && isAutoReactEnabled();
  let R = !S
    ? undefined
    : !isUserDrivenTurn(context.messages)
      ? "unattended_turn"
      : !hasHumanMessageContaining(context.messages, slug) || !isStrictHumanTurn(context.messages)
        ? "not_named_by_user"
        : live.repliesConsent.declined.has(slug)
          ? "declined"
          : live.nonEditorSlugs.has(slug)
            ? "not_editor"
            : e.repliesApproved !== true
              ? "not_approved"
              : undefined;
  let C = explicitWatchOptions({
    tool: S && R === undefined ? tool : undefined,
    commentVerbsInSchema,
    context,
  });
  let G = C.autoReactWiring !== undefined;
  let title = live.supervisors.get(slug)?.autoReactWiring?.title;
  let y = await FrameLiveWatchManager(live, {
    slug,
    url,
    getKnownVer,
    ownPublishes: context.artifactRegistries.ownPublishes,
    ...monitorContextAndSignal(context),
    ...C,
    pickUpRecentSummons: G,
    ...(C.autoReactWiring !== undefined && {
      autoReactWiring: {
        ...C.autoReactWiring,
        title,
      },
      editorGatedWiring: true,
    }),
  });
  if (
    G &&
    y.outcome === "armed" &&
    y.degraded === undefined &&
    !(isSlugStopped(slug) && !isSlugSwept(slug)) &&
    isAutoReactActive()
  )
    armMonitorIntent(slug, {
      title: live.supervisors.get(slug)?.autoReactWiring?.title ?? title,
      storageV5: context.storageV5,
    });
  if (R !== undefined && y.outcome === "armed")
    return {
      ...y,
      degraded: R,
    };
  if (R !== undefined && y.outcome === "already_watching")
    return {
      ...y,
      degraded: R,
    };
  return y;
}
//@ chunk-aqdf5t3e.js:50486-50541 placement
function knownNonEditor(slug) {
  return getLiveState().live.nonEditorSlugs.has(slug);
}
//@ chunk-aqdf5t3e.js:54609-54762 placement
function onArmSettled(e, n) {
  let { live } = getLiveState();
  if (!live.inFlightSubscribes.has(e)) {
    n();
    return;
  }
  let s = live.armSettleWaiters.get(e) ?? [];
  s.push(n);
  live.armSettleWaiters.set(e, s);
}
//@ chunk-aqdf5t3e.js:54762-54871 placement
function slugRepliesWiredHere(e) {
  let n = getLiveState().live.supervisors.get(e);
  return n !== undefined && !n.stopped && n.autoReactWiring !== undefined;
}
//@ chunk-aqdf5t3e.js:54871-55323 placement
async function watchArtifactFromStartup(e) {
  let { slug, url, getKnownVer, tool, commentVerbsInSchema, context } = e;
  if (tool !== undefined && isActingAsBgJob())
    ownProcStart().catch(() => {
      return;
    });
  let liveState = getLiveState();
  let w = await FrameLiveWatchManager(liveState.live, {
    slug,
    url,
    getKnownVer,
    ownPublishes: context.artifactRegistries.ownPublishes,
    ...monitorContextAndSignal(context),
    ...explicitWatchOptions({
      tool,
      commentVerbsInSchema,
      context,
    }),
  });
  if (tool !== undefined && commentVerbsInSchema === true && w.outcome !== "skipped" && isAutoReactActive())
    armMonitorIntent(slug, {
      title: liveState.live.supervisors.get(slug)?.autoReactWiring?.title,
      storageV5: context.storageV5,
    });
  return w;
}
//@ chunk-aqdf5t3e.js:55323-55535 placement
function explicitWatchOptions(e) {
  let { tool, commentVerbsInSchema, context } = e;
  return {
    seedKnownVerFromBoot: true,
    explicit: true,
    pickUpRecentSummons: true,
    ...(tool !== undefined &&
      commentVerbsInSchema === true && {
        autoReactWiring: {
          tool,
          commentVerbsInSchema,
          context,
        },
      }),
  };
}
//@ chunk-aqdf5t3e.js:55535-57521 placement
async function maybeSubscribeFrameLive(e) {
  let { slug, url, version, publishContext, getKnownVer, tool, commentVerbsInSchema, title, context } = e;
  if (tool !== undefined && isActingAsBgJob())
    ownProcStart().catch(() => {
      return;
    });
  let ownPublishes = context.artifactRegistries.ownPublishes;
  let live = getLiveState().live;
  if (version !== undefined) {
    recordOwnPublish(ownPublishes, slug, version, {
      merged: !isVouchedOwnVer(ownPublishes, slug, version),
    });
    let T = live.supervisors.get(slug);
    if (T !== undefined && !T.stopped) T.lastActivityAt = Date.now();
    if (isConsentUiKind(publishContext)) live.mostRecentPublishSlug = slug;
  }
  if (!isConsentUiKind(publishContext)) {
    logFeatureSad("artifact_live_subscribe", "publish_context", {
      publish_context: fromEnum(publishContext),
    });
    return {
      outcome: "skipped",
      reason: "publish_context",
    };
  }
  let G = tool !== undefined && commentVerbsInSchema === true;
  let L =
    e.carriedPublishConsent !== true &&
    e.resumedPublishConsent !== true &&
    e.chainPublish !== true &&
    e.adoptedPublish !== true &&
    isUserDrivenTurn(context.messages);
  let y = await FrameLiveWatchManager(live, {
    slug,
    url,
    getKnownVer,
    ownPublishes,
    ...monitorContextAndSignal(context),
    ...(e.onOpen !== undefined &&
      e.onGiveUp !== undefined && {
        onOpen: e.onOpen,
        onGiveUp: e.onGiveUp,
      }),
    ...(e.seedKnownVerFromBoot === true && {
      seedKnownVerFromBoot: true,
    }),
    ...((e.resumedPublishConsent === true || e.carriedPublishConsent === true) && {
      requireEditor: true,
    }),
    ...(e.sessionResume === true && {
      sessionResume: true,
    }),
    ...(L &&
      version !== undefined && {
        freshPublish: true,
      }),
    ...(e.announceArmlessEnd === true && {
      announceArmlessEnd: true,
    }),
    ...(e.resumedPublishConsent === true &&
      G && {
        pickUpRecentSummons: true,
      }),
    ...(G && {
      autoReactWiring: {
        tool,
        commentVerbsInSchema,
        context,
        title,
        ...(e.publishTranscript !== undefined && {
          publishTranscript: e.publishTranscript,
        }),
      },
      ...(L && {
        freshPublishWiring: true,
      }),
    }),
  });
  if ((version !== undefined || e.adoptedPublish === true) && y.outcome !== "skipped") {
    let { autoReact, wakes } = getLiveState();
    let ie = !G
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
            : undefined;
    if (ie !== undefined)
      logFeatureSad("artifact_live_subscribe", ie, {
        publish_context: fromEnum(publishContext),
      });
  }
  if (
    G &&
    y.outcome !== "skipped" &&
    !(
      y.outcome === "already_watching" &&
      (e.resumedPublishConsent === true || e.carriedPublishConsent === true)
    ) &&
    !(y.outcome === "armed" && y.degraded !== undefined) &&
    isAutoReactActive()
  )
    armMonitorIntent(slug, {
      title: live.supervisors.get(slug)?.autoReactWiring?.title ?? title,
      storageV5: context.storageV5,
    });
  return y;
}
//@ chunk-aqdf5t3e.js:57521-57577 placement
function isAutoReactActive() {
  return !getLiveState().autoReact.userDisarmed && isCommentAutoreactOptedIn();
}
//@ chunk-aqdf5t3e.js:57577-57678 placement
function armMonitorIntent(slug, n) {
  if (getLiveState().builtInArtifactHiddenForMcp) {
    markSlugTravelling(slug, {
      storageV5: n.storageV5,
    });
    return;
  }
  armCommentMonitorIntent(slug, n);
}
//@ chunk-aqdf5t3e.js:57678-57760 placement
function liveUpdatesTaskLabel(url, n, armedVia) {
  return `live updates for artifact ${url} (${armedViaWording(labelledArmedVia(n, armedVia)).task})`;
}
//@ chunk-aqdf5t3e.js:57760-57830 placement
function monitorContextAndSignal(context) {
  return {
    context: pickMonitorContext(context),
    signal: context.abortController.signal,
  };
}
//@ chunk-aqdf5t3e.js:57830-57869 placement
function makeArtifactReadVersionReader(getAppState, slug) {
  return () => mainObservedArtifactVersion(getAppState(), slug);
}
//@ chunk-aqdf5t3e.js:57869-57985 placement
/**
 * 判断实时订阅是否不可用：功能关闭、远程环境，或（控制面覆盖/WebSocket 出口被拒）；可用时返回 null。
 */
function getLiveSubscribeSkipReason(slug) {
  if (!isFrameLiveSubscribeEnabled())
    return {
      reason: "flag_off",
    };
  if (env.CLAUDE_CODE_REMOTE)
    return {
      reason: "remote",
    };
  return getEgressSkipReason(frameLiveWsUrl(slug));
}
//@ chunk-aqdf5t3e.js:57985-58036 placement
function canArmFrameLive(slug) {
  return isFrameLiveSubscribeEnabled() && presenceSkipReason(slug) === null && !isPresenceDeclined(slug);
}
//@ chunk-aqdf5t3e.js:58036-58175 placement
function getEgressSkipReason(e) {
  if (isClaudeAiCpOverride())
    return {
      reason: "cp_override",
    };
  let n = wsEgressDenyReason(e);
  if (n !== null)
    return {
      reason: "egress_denied",
      egressKind: n.kind,
    };
  return null;
}
//@ chunk-aqdf5t3e.js:58175-58405 placement
function frameLivePublishFindsConnected(e) {
  let { context, slug, wantWiring, canClearLatch } = e;
  let now = Date.now();
  for (let d of Object.values(context.taskRegistry.all()))
    if (
      isMonitorWsTask(d) &&
      d.status === "running" &&
      d.frameLive?.slug === slug &&
      classifyMonitorTask(d, slug, now, wantWiring, canClearLatch, isMonitorTaskLive) === "keep"
    )
      return true;
  return false;
}
//@ chunk-aqdf5t3e.js:58405-58569 placement
function frameLivePublishSkipReason(e) {
  if (getLiveState().durable.stopLatches.isStopped(e.slug)) return "stop_latched";
  if (!isConsentUiKind(e.publishContext)) return "publish_context";
  return getLiveSubscribeSkipReason(e.slug)?.reason ?? null;
}
//@ chunk-aqdf5t3e.js:64164-64360 placement
async function subscribeFrameLiveOnAttach(e) {
  let { slug, url, getKnownVer, context } = e;
  return FrameLiveWatchManager(getLiveState().live, {
    slug,
    url,
    getKnownVer,
    ownPublishes: context.artifactRegistries.ownPublishes,
    ...monitorContextAndSignal(context),
    seedKnownVerFromBoot: true,
  });
}
//@ chunk-aqdf5t3e.js:64360-86204 placement
/**
 * 管理 Artifact 实时订阅：恢复、监听、mcp_write、自动回复
 */
async function FrameLiveWatchManager(live, n) {
  let {
    slug,
    url,
    getKnownVer,
    ownPublishes,
    context,
    seedKnownVerFromBoot,
    seedSurfacedVer,
    explicit = false,
    signal,
  } = n;
  initAutoreactLedger();
  let carriedVer = live.supervisors.get(slug)?.carriedVer;
  live.endAll ??= startFrameLiveWatch;
  let commentVerbsInSchema = n.autoReactWiring !== undefined && n.autoReactWiring.commentVerbsInSchema;
  let L =
    n.userResumeWiring === true
      ? "resume"
      : explicit
        ? "watch"
        : n.sessionResume === true
          ? "session_resume"
          : n.mcpWrite === true
            ? "mcp_write"
            : seedKnownVerFromBoot
              ? "attach"
              : "publish";
  if (!ARTIFACT_SLUG_RE.test(slug))
    return {
      outcome: "skipped",
      reason: "invalid_slug",
    };
  live.armOutcomes.delete(slug);
  let stopLatches = getLiveState().durable.stopLatches;
  runCommentMonitorWithIntent({
    storageV5: context.storageV5,
  });
  let approvedRelatchGen = n.userResumeWiring === true ? n.approvedRelatchGen : undefined;
  let P = () =>
    stopLatches.isStopped(slug) &&
    (approvedRelatchGen === undefined || stopLatches.latchGeneration(slug) !== approvedRelatchGen);
  if (P()) {
    logFeatureSad("artifact_live_subscribe", "stop_latched");
    return {
      outcome: "skipped",
      reason: "stop_latched",
    };
  }
  let liveSubscribeSkipReason = getLiveSubscribeSkipReason(slug);
  if (liveSubscribeSkipReason !== null) {
    if (liveSubscribeSkipReason.reason === "cp_override")
      logFeatureSad("artifact_live_subscribe", "cp_override_active");
    else if (liveSubscribeSkipReason.reason === "egress_denied")
      logFeatureSad(
        "artifact_live_subscribe",
        `egress_denied_${liveSubscribeSkipReason.egressKind === "sandbox-policy" ? "sandbox_policy" : liveSubscribeSkipReason.egressKind}`,
      );
    return {
      outcome: "skipped",
      reason: liveSubscribeSkipReason.reason,
    };
  }
  let url_2 = frameLiveWsUrl(slug);
  let pt = canArmFrameLive(slug);
  let Ee = (n.freshPublishWiring === true || n.userResumeWiring === true) && !n.signal.aborted;
  let autoReactWiring = live.supervisors.get(slug)?.autoReactWiring;
  let ae = reconcileMonitorTasks(context, slug, commentVerbsInSchema, Ee);
  if (ae !== null || live.inFlightSubscribes.has(slug)) {
    if (ae === null && approvedRelatchGen !== undefined && stopLatches.isStopped(slug)) {
      logFeatureSad("artifact_live_subscribe", "arm_in_flight");
      return {
        outcome: "skipped",
        reason: "arm_in_flight",
      };
    }
    if (!(L === "resume" && ae === null && !live.supervisors.has(slug)))
      upsertSupervisor(live, {
        slug,
        url,
        getKnownVer,
        ownPublishes,
        context,
        explicit,
        machineArm: n.machineArm,
        armedVia: L,
        ...(n.requireEditor !== true &&
          n.editorGatedWiring !== true && {
            autoReactWiring: n.autoReactWiring,
            humanTurnWiring: Ee,
          }),
      });
    if (ae !== null) {
      let x = live.supervisors.get(slug);
      if (x !== undefined) {
        let J = liveUpdatesTaskLabel(url, x.explicit, x.armedVia);
        context.taskRegistry.update(ae, (D) => {
          if (!isMonitorWsTask(D) || D.frameLive === undefined) return D;
          if (
            D.description === J &&
            D.frameLive.explicit === x.explicit &&
            D.frameLive.armedVia === x.armedVia
          )
            return D;
          return {
            ...D,
            description: J,
            frameLive: {
              ...D.frameLive,
              explicit: x.explicit,
              armedVia: x.armedVia,
            },
          };
        });
      }
    }
    if (ae !== null && n.freshPublishWiring === true && !n.signal.aborted)
      liftSweptPause(context.taskRegistry, slug);
    if (
      ae === null &&
      n.autoReactWiring !== undefined &&
      n.autoReactWiring.commentVerbsInSchema &&
      n.requireEditor !== true &&
      n.editorGatedWiring !== true
    ) {
      let x = live.pendingInFlightWiring.get(slug);
      let J = n.freshPublishWiring === true && !n.signal.aborted;
      let D =
        J || x === undefined
          ? {
              scanGeneration: getLiveState().wakes.scanGeneration,
              stopGeneration: stopGeneration(slug),
            }
          : {
              scanGeneration: x.scanGeneration,
              stopGeneration: x.stopGeneration,
            };
      live.pendingInFlightWiring.set(slug, {
        wiring: mergeAutoReactWiring(x?.wiring, n.autoReactWiring, Ee),
        freshPublishWiring: J || x?.freshPublishWiring === true,
        ...D,
      });
      live.inFlightWiredIntent.add(slug);
      if (isAutoReactActive())
        markSlugTravelling(slug, {
          storageV5: context.storageV5,
        });
      if (J && isCommentAutoreactOptedIn())
        live.bootingWiredArms.set(slug, {
          title: n.autoReactWiring.title,
          freshPublish: true,
          ...D,
        });
    }
    return {
      outcome: "already_watching",
      ...(ae !== null && {
        taskId: ae,
      }),
    };
  }
  let Y = {
    url,
    announce: n.announceArmlessEnd === true && !n.machineArm,
    handoffGen: live.handoffGeneration,
    getTitle: () => live.supervisors.get(slug)?.autoReactWiring?.title ?? n.autoReactWiring?.title,
  };
  let sn = frameLiveWatchRows(context).length + live.inFlightSubscribes.size;
  if (n.machineArm && frameLiveWatchRows(context).length >= REFUSED_CAPACITY_HINT) {
    if (!hasWatchProtection(live, slug) || classifyWatchReason(live, context).length === 0) {
      logFeatureSad("artifact_live_subscribe", "watch_cap_reconnect");
      return {
        outcome: "skipped",
        reason: "watch_cap_reconnect",
      };
    }
  }
  if (n.mcpWrite && sn >= REFUSED_CAPACITY_HINT) {
    logFeatureSad("artifact_live_subscribe", "watch_cap");
    return skipArm(live, slug, n.machineArm, "watch_cap", Y);
  }
  let forPublish = !n.machineArm && n.freshPublish === true;
  if (
    !n.machineArm &&
    sn >= REFUSED_CAPACITY_HINT &&
    classifyWatchReason(live, context, {
      forPublish,
    }).length === 0
  ) {
    logFeatureSad("artifact_live_subscribe", "watch_cap");
    return skipArm(live, slug, n.machineArm, "watch_cap", Y);
  }
  let scanGeneration = getLiveState().wakes.scanGeneration;
  let Ue = stopGeneration(slug);
  let lastActivityAt = n.machineArm ? live.supervisors.get(slug)?.lastActivityAt : undefined;
  let handoffGeneration = live.handoffGeneration;
  setFrameLiveUserStopObserver(stopWatchFromTask);
  setAutoReactDeliberateStopObserver(forgetArtifactAndFlush);
  setAutoReactHumanTurnObserver((x) => releaseNoticeLatchesOnTurn(context.taskRegistry, x));
  live.inFlightSubscribes.add(slug);
  live.inFlightGenerations.set(slug, handoffGeneration);
  if (n.autoReactWiring !== undefined) live.inFlightWiredIntent.add(slug);
  let Ce;
  let xe = false;
  try {
    if (
      n.autoReactWiring?.commentVerbsInSchema === true &&
      n.requireEditor !== true &&
      n.machineArm !== true &&
      n.userResumeWiring !== true &&
      isCommentAutoreactOptedIn()
    )
      live.bootingWiredArms.set(slug, {
        title: n.autoReactWiring.title,
        freshPublish: n.freshPublishWiring === true && !n.signal.aborted,
        scanGeneration,
        stopGeneration: Ue,
      });
    let x = () => live.handoffGeneration !== handoffGeneration || live.retiredInFlightArms.has(slug);
    let J = isFrameLiveTokenLeaseEnabled();
    if (!J) {
      let A = live.supervisors.get(slug);
      if (A !== undefined) {
        delete A.lease;
        delete A.renewable;
      }
    }
    let accountEpoch = getLiveState().accountEpoch;
    let lease = J && n.machineArm === true ? live.supervisors.get(slug)?.lease : undefined;
    let F =
      lease !== undefined &&
      (lease.transport === "live" || pt) &&
      isLiveTokenFresh(lease, live.rewatchTiming, accountEpoch)
        ? lease
        : undefined;
    if (F !== undefined && F.transport === "sync") {
      let A = await readFreshOauthAccountFromDisk(context.storageV5).catch(() => {
        return;
      });
      if (!sameOwnerAccount(parseCapTokenOwner(F.token), A)) F = undefined;
      if (signal.aborted || x()) return skipArm(live, slug, n.machineArm, "cancelled", Y);
    }
    let W;
    let ht = false;
    let dn = 0;
    if (F !== undefined)
      W = {
        err: null,
        token: F.token,
        transport: F.transport,
        ver: F.ver,
        editor: undefined,
        tokenExp: undefined,
        renewable: false,
      };
    else {
      let A = J && !pt && n.machineArm === true && live.supervisors.get(slug)?.renewable === true;
      try {
        let j;
        if (A) {
          let be = await renewWatchToken(slug, signal, context.credentials);
          if (be.err === null) {
            j = be;
            ht = true;
          } else {
            logFeatureSad("artifact_live_subscribe", `renew_miss_${be.status ?? "no_response"}`);
            let ue = live.supervisors.get(slug);
            if (ue !== undefined) delete ue.renewable;
            if (signal.aborted || x()) return skipArm(live, slug, true, "cancelled", Y);
          }
        }
        dn = Date.now();
        W =
          j ??
          (await fetchLiveSubscription(slug, signal, context.credentials, {
            syncLive: pt,
            ...(n.machineArm === true && {
              lean: live.supervisors.get(slug)?.bootedVersion,
            }),
          }));
      } catch {
        return skipArm(live, slug, n.machineArm, signal.aborted || x() ? "cancelled" : "boot_failed", Y);
      }
    }
    let receivedAtMs = Date.now();
    if (x()) return skipArm(live, slug, n.machineArm, "cancelled", Y);
    if (W.err !== null) {
      let A = signal.aborted
        ? "cancelled"
        : W.status === 404
          ? "not_found"
          : isOtherOrg(W)
            ? "other_org"
            : W.publicOutsideOrg === true
              ? "public_outside_org"
              : "boot_failed";
      let unavailable =
        A === "boot_failed" &&
        (W.unavailable === true ||
          (W.noAnswer === true && Date.now() - dn >= live.rewatchTiming.stallThresholdMs));
      return skipArm(live, slug, n.machineArm, A, Y, {
        unavailable,
        httpStatus: W.status,
      });
    }
    let $e = n.requireEditor === true && !W.editor;
    let se = $e || (n.editorGatedWiring === true && n.autoReactWiring !== undefined && W.editor !== true);
    let fn = $e ? "restored_consent_not_editor" : "watch_not_editor";
    if (W.editor === true) live.nonEditorSlugs.delete(slug);
    if (se) {
      live.inFlightWiredIntent.delete(slug);
      live.bootingWiredArms.delete(slug);
      if (!$e && getLiveState().accountEpoch === accountEpoch) live.nonEditorSlugs.add(slug);
    }
    let pn = W.title === undefined ? null : sanitizeArtifactTitle(W.title);
    let le =
      se || n.autoReactWiring === undefined
        ? undefined
        : pn === null
          ? n.autoReactWiring
          : {
              ...n.autoReactWiring,
              title: pn,
            };
    let onOpen = se ? undefined : n.onOpen;
    let onGiveUp = se ? undefined : n.onGiveUp;
    let transport = W.transport;
    if (
      transport === "sync" &&
      (!canArmFrameLive(slug) || W.token === undefined || !isAgentCapToken(W.token))
    ) {
      logFeatureSad("artifact_live_subscribe", "sync_unavailable");
      return skipArm(live, slug, n.machineArm, "sync_unavailable", Y, {
        unavailable: true,
      });
    }
    let token = W.token;
    if (!token) {
      logFeatureSad("artifact_live_subscribe", se ? fn : "no_subscription_token");
      return skipArm(live, slug, n.machineArm, $e ? "not_editor" : "no_subscription_token", Y);
    }
    if (se) logFeatureSad("artifact_live_subscribe", fn);
    let ver = W.ver;
    let getKnownVer_2 = seedKnownVerFromBoot ? () => getKnownVer() ?? ver : getKnownVer;
    let O =
      F ??
      (J
        ? createLiveTokenState({
            transport,
            token,
            ver,
            accountEpoch,
            expUnixSeconds: transport === "sync" ? getCapTokenSeq(token) : W.tokenExp,
            receivedAtMs,
          })
        : undefined);
    if (signal.aborted || x()) return skipArm(live, slug, n.machineArm, "cancelled", Y);
    let He = frameLiveWatchRows(context).length + live.inFlightSubscribes.size - 1;
    let bt = live.supervisors.get(slug);
    let jr =
      n.machineArm === true &&
      lastActivityAt !== undefined &&
      bt !== undefined &&
      !bt.stopped &&
      bt.lastActivityAt > lastActivityAt;
    let hn = frameLiveWatchRows(context).length + live.pendingRegistrations;
    if (n.machineArm && !jr && He >= REFUSED_CAPACITY_HINT) {
      if (hn >= REFUSED_CAPACITY_HINT) {
        if (!hasWatchProtection(live, slug) || !evictForProtectedReconnect(live, context)) {
          logFeatureSad("artifact_live_subscribe", "watch_cap_reconnect");
          return {
            outcome: "skipped",
            reason: "watch_cap_reconnect",
          };
        }
      }
    } else if (n.mcpWrite && He >= REFUSED_CAPACITY_HINT) {
      logFeatureSad("artifact_live_subscribe", "watch_cap");
      return skipArm(live, slug, n.machineArm, "watch_cap", Y);
    } else if (He >= REFUSED_CAPACITY_HINT) {
      let A = He - REFUSED_CAPACITY_HINT + 1;
      let j = classifyWatchReason(live, context, {
        forPublish,
      });
      if (j.length < A) {
        if (n.machineArm) {
          logFeatureSad("artifact_live_subscribe", "watch_cap_reconnect");
          return {
            outcome: "skipped",
            reason: "watch_cap_reconnect",
          };
        }
        logFeatureSad("artifact_live_subscribe", "watch_cap");
        return skipArm(live, slug, n.machineArm, "watch_cap", Y);
      }
      if (hn >= REFUSED_CAPACITY_HINT)
        evictWatch(
          live,
          j[0],
          context,
          n.machineArm
            ? {
                why: `this session reached its limit of ${REFUSED_CAPACITY_HINT} artifact watches and made room for an already-held watch to reconnect`,
                shortReason: MADE_ROOM_PHRASE,
              }
            : undefined,
        );
    }
    live.pendingRegistrations++;
    xe = true;
    let q = live.supervisors.get(slug);
    let explicit_2 = q !== undefined && !q.stopped && q.explicit;
    let _t = explicit || explicit_2;
    let St = q !== undefined && !q.stopped;
    let taskId = St ? q.taskId : undefined;
    let zr = q === undefined;
    let Yr = explicit && q !== undefined && !q.explicit;
    let bn =
      !n.machineArm && q !== undefined && q.armedVia === "mcp_write" && L !== "publish" && L !== "mcp_write";
    let autoReactWiring_2 = bn ? q.autoReactWiring : undefined;
    let Sn = le !== undefined && !isHumanTurnWiringStale(live, slug, autoReactWiring);
    let vn = n.userResumeWiring === true && Sn && St && q.autoReactWiring?.humanTurnSnapshot === true;
    let carriedVer_2 = live.supervisors.get(slug)?.carriedVer;
    let wt = carriedVer_2 !== undefined && carriedVer_2 !== carriedVer ? carriedVer_2 : seedSurfacedVer;
    let k = upsertSupervisor(live, {
      slug,
      url,
      getKnownVer,
      ownPublishes,
      context,
      explicit,
      machineArm: n.machineArm,
      armedVia: L,
      carriedVer: wt ?? W.ver,
      ...(Sn && {
        autoReactWiring: le,
      }),
      humanTurnWiring: Ee && !vn,
    });
    if (F === undefined && k.armedVia !== "mcp_write") recordHeardVersion(slug, ver);
    if (F === undefined && !ht) k.bootedVersion = ver;
    let autoReactWiring_3 = k.autoReactWiring;
    if (O !== undefined && O.accountEpoch === getLiveState().accountEpoch) {
      k.lease = O;
      if (F === undefined && W.renewable) k.renewable = true;
      else if (F === undefined) delete k.renewable;
    } else {
      delete k.lease;
      delete k.renewable;
    }
    let lastActivityAt_2 = k.lastActivityAt;
    if (onOpen !== undefined && onGiveUp !== undefined)
      k.resumeAnnounce = {
        onOpen,
        onGiveUp,
        wired: le !== undefined,
      };
    let armedVia =
      L === "resume" && k.armedVia !== "watch" && k.armedVia !== "resume" ? k.armedVia : undefined;
    if (armedVia !== undefined) k.armedVia = "resume";
    k.transport = transport;
    let ne = false;
    let sessionId = getSessionId();
    let An = false;
    let Rt;
    let Be;
    let Rn = false;
    let We;
    let abort = new AbortController();
    let Q = se ? undefined : live.pendingInFlightWiring.get(slug);
    if (!se) live.pendingInFlightWiring.delete(slug);
    let fe = le ?? Q?.wiring;
    let Zr =
      Q?.wiring.humanTurnSnapshot === true &&
      (autoReactWiring?.humanTurnSnapshot !== true || Q.wiring.context !== autoReactWiring.context);
    if (Q !== undefined && (le === undefined || Zr) && Q.stopGeneration === stopGeneration(slug)) {
      let A = live.supervisors.get(slug);
      if (A !== undefined && !A.stopped)
        A.autoReactWiring = mergeAutoReactWiring(
          A.autoReactWiring,
          {
            ...Q.wiring,
            title: Q.wiring.title ?? A.autoReactWiring?.title,
          },
          Q.wiring.humanTurnSnapshot === true,
        );
    }
    let yn = n.freshPublishWiring === true || Q?.freshPublishWiring === true;
    if (Q?.freshPublishWiring === true) {
      scanGeneration = Q.scanGeneration;
      Ue = Q.stopGeneration;
    }
    let Z = n.userResumeWiring === true;
    let ei = Ee || fe?.humanTurnSnapshot === true;
    let yt = () => live.supervisors.get(slug)?.autoReactWiring?.title ?? fe?.title;
    let I =
      fe === undefined || !fe.commentVerbsInSchema
        ? undefined
        : {
            env: claudeAiEnvironment(),
            tool: fe.tool,
            context: fe.context,
            ...(fe.publishTranscript !== undefined && {
              publishTranscript: fe.publishTranscript,
            }),
            getWiring: () => {
              let autoReactWiring = live.supervisors.get(slug)?.autoReactWiring;
              return autoReactWiring?.humanTurnSnapshot === true || !ei ? autoReactWiring : undefined;
            },
            abort,
            getTitle: yt,
            onReadRefused: () => {
              describeSubscribeFailure(live, slug);
            },
            notify: (A) => {
              if ("coalesce" in A) {
                enqueueArtifactChanged({
                  queue: liveNotificationEnqueuer,
                  slug,
                  family: A.coalesce.family,
                  artifactName: A.coalesce.artifactName,
                  threadId: A.coalesce.threadId,
                  detail: A.detail,
                  mergeDetails: "append",
                  ownGesture: A.ownGesture === true,
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
                  slug,
                  displayName: quoteArtifactName(yt, url),
                },
                uuid: newLaneNoticeId(A.handOff, A.ownGesture === true ? slug : undefined),
                ...(A.handOff !== undefined && {
                  artifactCommentTurn: "handoff",
                }),
                agentId: mainAgentId(),
              });
            },
          };
    k.surfacedVers ??= [];
    let wake = k.wake;
    let command = createLiveEventHandlers({
      slug,
      url,
      ownPublishes,
      presenceOnly: () => live.supervisors.get(slug)?.armedVia === "mcp_write",
      getKnownVer: getKnownVer_2,
      surfacedVers: k.surfacedVers,
      ...(wt !== undefined && {
        seedSurfacedVer: wt,
      }),
      onSurfaced: (carriedVer) => {
        let j = live.supervisors.get(slug);
        if (j && !j.stopped) {
          j.carriedVer = carriedVer;
          j.lastActivityAt = Date.now();
        }
      },
      autoReact: I,
    });
    k.wake = command;
    let kt = 0;
    let Et;
    let ti = F?.opened === true ? F : undefined;
    try {
      let A = await runWebSocketMonitor(
        {
          ws:
            transport === "sync"
              ? {
                  url: getSyncSocketUrl(slug, {
                    commentHint: I !== undefined && isAutoreactArmed() && !isSlugStopped(slug),
                    versionNotices: true,
                  }),
                  protocols: [FRAME_SYNC_V1, token],
                }
              : {
                  url: url_2,
                  protocols: [FRAME_LIVE_V1, token],
                },
          ...(transport === "sync" && {
            headers: {
              "User-Agent": getUserAgent(),
            },
          }),
          description: liveUpdatesTaskLabel(url, _t, k.armedVia),
          timeout_ms: 0,
          persistent: true,
          quietLifecycle: true,
          ...(taskId !== undefined && {
            reuseTaskId: taskId,
          }),
          ambient: true,
          handshakeDeadlineMs: live.rewatchTiming.handshakeDeadlineMs,
          autoReactArmed: I !== undefined,
          autoReactSlug: I !== undefined ? slug : undefined,
          frameLive: {
            slug,
            explicit: _t,
            watchedSince: k.watchedSince,
            armedVia: k.armedVia,
          },
          transform:
            transport === "sync"
              ? handleFrameLiveControl(command, slug, {
                  onTokenRefresh: (U, expUnixSeconds) => {
                    if (
                      O !== undefined &&
                      sameOwnerAccount(parseCapTokenOwner(O.token), parseCapTokenOwner(U))
                    )
                      refreshLiveTokenState(O, {
                        token: U,
                        expUnixSeconds,
                        receivedAtMs: Date.now(),
                      });
                  },
                  onExpiryAnnounced: () => {
                    Rn = true;
                  },
                  onCommentHint: (U, readAt) => {
                    let wakeSnapshot = Et;
                    Et = undefined;
                    let seedSkipped =
                      U && wakeSnapshot !== undefined && settleEmptyArtifact(slug, wakeSnapshot, readAt);
                    logFeatureOk("artifact_live_subscribe", {
                      comment_hint: true,
                      comments_empty: U,
                      seed_parked: wakeSnapshot !== undefined,
                      seed_skipped: seedSkipped,
                      sync_transport: true,
                    });
                  },
                })
              : makeLiveVersionLineHandler(command),
          keepalive:
            transport === "sync"
              ? {
                  openFrames: [],
                  frame: jsonStringify({
                    kind: "ping",
                    slug,
                  }),
                  intervalMs: getLiveState().presence.timing.keepaliveMs,
                  sendEveryMs: () => adjustKeepaliveForIdle(live, getLiveState().presence.timing.keepaliveMs),
                  deadlineMs:
                    getLiveState().presence.timing.keepaliveDeadlineMs ??
                    keepaliveDeadline(getLiveState().presence.timing.keepaliveMs),
                }
              : {
                  openFrames: ["ping", "hb"],
                  frame: "ping",
                  intervalMs: ARM_RETRY_DELAY_WORDING_MS,
                },
          onSender: (U) => {
            if (transport === "sync") {
              Be = (busyS) => U(activityFrame(slug, busyS));
              addAgentActivitySink(live, `watch:${slug}`, Be);
              return;
            }
            Rt = U;
            addActivitySender(live, slug, U);
          },
          onSenderClosed: () => {
            if (Be !== undefined) removeAgentActivitySink(live, `watch:${slug}`, Be);
            if (Rt !== undefined) removeActivitySender(live, slug, Rt);
          },
          onLifecycle: (U, V, Ie) => {
            if (U === "open") {
              ne = true;
              k.lastFailure = undefined;
              We = {
                stalledSince: k.stalledSince,
                lastStalledAt: k.lastStalledAt,
                stallOutAfterMs: k.stallOutAfterMs,
              };
              k.stalledSince = undefined;
              k.lastStalledAt = undefined;
              k.stallOutAfterMs = undefined;
              let Oe = k.spreadReconnect === true;
              k.spreadReconnect = undefined;
              kt = Date.now();
              if (O !== undefined) O.opened = true;
              if (
                approvedRelatchGen !== undefined &&
                signal.aborted &&
                stopLatches.isStopped(slug) &&
                k.taskId !== undefined
              ) {
                stopMonitorWsTasks(k.taskId, context.taskRegistry, {
                  quiet: true,
                });
                removeSupervisor(live, slug);
                logFeatureSad("artifact_live_subscribe", "stop_latched");
                return;
              }
              let Me = live.supervisors.get(slug);
              if (Me !== undefined && !Me.stopped)
                if (transport === "sync") {
                  retirePresenceSlug(slug);
                  liveDocHeadSink(slug)?.reopened();
                } else {
                  armArtifactPresence({
                    slug,
                    url,
                    context,
                  });
                  liveDocHeadSink(slug)?.sourceEnded();
                }
              logFeatureOk("artifact_live_subscribe", {
                armed: true,
                ...(transport === "sync" && {
                  sync_transport: true,
                }),
                ...(_t && {
                  explicit: true,
                }),
                ...(F !== undefined && {
                  token_reused: true,
                  lease_remaining_min: Math.max(0, Math.floor((F.expMs - kt) / 60000)),
                }),
                ...(ht && {
                  token_renewed: true,
                }),
              });
              let Cn = I !== undefined && getLiveState().wakes.scanGeneration !== scanGeneration;
              let ri = stopGeneration(slug) !== Ue;
              let { wakes } = getLiveState();
              let ii =
                wakes.liftedAtScanGeneration.get(slug) === wakes.scanGeneration ||
                wakes.humanTurnAtScanGeneration === wakes.scanGeneration;
              if (Cn && !ii && !isSlugStopped(slug) && isAutoreactArmed()) {
                sweepSlug(slug);
                artifactWatchStopNotice(1, [], {
                  catchUp: false,
                  nameChordGesture: !getIsNonInteractiveSession(),
                  passive: !getIsNonInteractiveSession(),
                });
                flushAutoreactLedger({
                  flush: true,
                });
              }
              if (approvedRelatchGen !== undefined && !signal.aborted)
                stopLatches.clearByApprovedRewatch(slug, approvedRelatchGen);
              if (I !== undefined)
                getSummonWakeState(slug).lastWakeArgs = {
                  slug,
                  url,
                  ...I,
                };
              let xn = Z && P();
              if (Z && I !== undefined && !signal.aborted && !xn && isAutoReactActive()) {
                let autoReactWiring = live.supervisors.get(slug)?.autoReactWiring;
                armMonitorIntent(slug, {
                  title: autoReactWiring?.title,
                  storageV5: autoReactWiring?.context.storageV5,
                });
              }
              if (I !== undefined && signal.aborted);
              else if (I !== undefined)
                if (
                  !Z &&
                  isSlugSwept(slug) &&
                  !isSlugOrphaned(slug) &&
                  wakes.humanTurnAtScanGeneration === wakes.scanGeneration
                ) {
                  resumeSummonWakes(slug);
                  wakes.liftedAtScanGeneration.set(slug, wakes.scanGeneration);
                  emitSummonArm(live, slug);
                  scheduleThreadScan({
                    slug,
                    url,
                    ...I,
                    seed: false,
                  });
                } else if (isSlugStopped(slug) && (Cn || ri || xn || !(yn || Z)));
                else if (isSlugStopped(slug)) {
                  let N = isSlugSwept(slug);
                  let de = isSlugYielded(slug);
                  if (isAutoreactArmed() && (Z || !N || de)) {
                    markAutoReactNoticePending(slug);
                    recordUnaccountedComments(slug);
                    I.notify({
                      summary: (Z ? autoRepliesResumedNotice : autoRepliesReenabledNotice)(
                        quoteArtifactName(I.getTitle, url),
                      ),
                      detail: `Auto-replies on artifact ${url} were ${Z ? "resumed by a resume_replies request" : "re-enabled by this publish"} \u2014 they had been ${de ? "handed to another session of this conversation that resumed it or published there" : N ? "paused when the user interrupted the session (Ctrl+C or Stop) and the watch had since dropped" : "stopped when their live-updates task was killed"}. ${N && !de ? PAUSE_AUTO_REPLIES_HINT : UNINTENDED_RESUME_HINT}`,
                    });
                  }
                  if (!N || de) resetAutoReactForSlug(slug);
                  forgetYieldedSlug(slug);
                  forgetDeliveredSlug(slug);
                  resumeSummonWakes(slug);
                  emitSummonArm(live, slug);
                  scheduleThreadScan({
                    slug,
                    url,
                    ...I,
                    seed: true,
                  });
                } else {
                  if (wakes.pendingResumeDisclosure.delete(slug)) {
                    markAutoReactNoticePending(slug);
                    recordUnaccountedComments(slug);
                    I.notify({
                      summary: autoRepliesResumedNotice(quoteArtifactName(I.getTitle, url)),
                      detail: `Auto-replies on artifact ${url} were resumed by a resume_replies request \u2014 they had been paused when the user interrupted the session (Ctrl+C or Stop); the watch has now connected. ${PAUSE_AUTO_REPLIES_HINT}`,
                    });
                  }
                  scheduleThreadScan({
                    slug,
                    url,
                    ...I,
                    seed: true,
                    ...(n.pickUpRecentSummons === true &&
                      n.machineArm !== true && {
                        pickUpRecentSummons: true,
                      }),
                    ...(n.machineArm === true &&
                      Oe &&
                      isFrameLiveTokenLeaseEnabled() && {
                        deferMs: seedJitter(live.rewatchTiming),
                      }),
                  });
                  if (transport === "sync") {
                    let summonWakeState = getSummonWakeState(slug);
                    Et = {
                      kickCount: summonWakeState.kickCount,
                      cancelGeneration: summonWakeState.cancelGeneration,
                    };
                  }
                }
              let qe = live.supervisors.get(slug);
              let resumeAnnounce = qe?.resumeAnnounce;
              if (qe !== undefined && resumeAnnounce !== undefined) {
                qe.resumeAnnounce = undefined;
                let { autoReact } = getLiveState();
                let de =
                  I !== undefined &&
                  !isSlugStoppedAnywhere(slug) &&
                  !autoReact.userDisarmed &&
                  autoReact.enabledMemo === true;
                if (
                  !signal.aborted &&
                  !qe.stopped &&
                  !stopLatches.isStopped(slug) &&
                  (de || (!resumeAnnounce.wired && I === undefined))
                )
                  resumeAnnounce.onOpen();
              }
              if (
                I !== undefined &&
                (yn || Z || explicit) &&
                !An &&
                !signal.aborted &&
                !stopLatches.isStopped(slug) &&
                !isSlugStoppedAnywhere(slug) &&
                !getLiveState().autoReact.userDisarmed &&
                getLiveState().autoReact.wakeEnabledMemo === true
              ) {
                An = true;
                let yieldClaim = startYieldClaim([slug], Date.now());
                (async () => {
                  let de = await import("./chunk-ewxn4535.js");
                  let ze = await import("./chunk-v19g02mx.js");
                  let liveReplyHolder = await findLiveReplyHolder({
                    records: await de.listRegisteredSessionRecords(),
                    sessionId,
                    selfPid: process.pid,
                    isRunning: ze.isProcessRunning,
                    isSameProcess: ze.provenSameProcessAsync,
                  });
                  if (liveReplyHolder.verdict !== "live") {
                    yieldClaim.end();
                    return;
                  }
                  let { requestReplyTakeover } = await import("./chunk-4te7h8m1.js");
                  let Ot = (
                    await requestReplyTakeover({
                      holders: [liveReplyHolder.holder, ...liveReplyHolder.otherHolders],
                      holdersIncomplete: liveReplyHolder.unproven === true,
                      conversationId: sessionId,
                      slugs: [slug],
                      reason: "claim",
                      alreadyReplying: true,
                      claim: yieldClaim,
                    })
                  ).yielded.has(slug);
                  let Wn = !Ot && yieldClaim.lost.has(slug);
                  let Je = quoteArtifactName(() => yt(), url);
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
                    passive: true,
                    priority: "next",
                    origin: {
                      kind: "task-notification",
                      source: ARTIFACT_WATCH_LIFECYCLE,
                      slug,
                      displayName: Je,
                    },
                    agentId: mainAgentId(),
                  });
                })().catch(() => {
                  yieldClaim.end();
                });
              }
              return;
            }
            let Se = ne ? Date.now() - kt : 0;
            let Tt = !ne && isRetryableUpgradeRejection(V);
            let Ct =
              transport === "sync"
                ? V === ROUTE_ABSENT_4503 &&
                  (Rn || (O !== undefined && Date.now() >= O.expMs - AUTO_REPLY_RESUMED_WINDOW_MS))
                : V === ROUTE_ABSENT_4001;
            let je =
              transport === "sync" &&
              ((ne && V === ROUTE_ABSENT_4503 && !Ct) || (!ne && parseUpgradeRejection(V)?.status === 404));
            let xt = je || (!ne && (Tt || isHandshakeStall(V, Ie, live.rewatchTiming)));
            let Lt = ne || xt ? undefined : ti;
            let z = live.supervisors.get(slug);
            if (
              je &&
              ne &&
              Se < live.rewatchTiming.minUptimeMs &&
              z !== undefined &&
              z.stalledSince === undefined &&
              We?.stalledSince !== undefined
            ) {
              z.stalledSince = We.stalledSince;
              z.lastStalledAt = We.lastStalledAt;
              z.stallOutAfterMs = We.stallOutAfterMs;
            }
            if (
              z !== undefined &&
              transport === "sync" &&
              V === ROUTE_ABSENT_4403 &&
              O !== undefined &&
              z.lease === O
            )
              delete z.lease;
            if (
              O !== undefined &&
              z?.lease === O &&
              (!isFrameLiveTokenLeaseEnabled() ||
                (!Tt &&
                  !je &&
                  !shouldRetryDial(O, {
                    expired: Ct,
                    refused: Lt !== undefined,
                    healthy: ne && Se >= live.rewatchTiming.minUptimeMs,
                  })))
            ) {
              delete z.lease;
              if (!O.opened) delete z.renewable;
            }
            if (ne)
              logFeatureSad("artifact_live_subscribe", `socket_closed_${V ?? "unknown"}`, {
                chain_spared: getLiveState().autoReact.artifacts.get(slug)?.scanning === true,
              });
            else if (Lt !== undefined) logFeatureSad("artifact_live_subscribe", "reuse_connect_failed");
            else {
              let upgradeRejection = parseUpgradeRejection(V);
              let Me = {
                ...(xt && {
                  stalled: true,
                }),
                ...(Tt && {
                  shed: true,
                }),
                ...(upgradeRejection !== null && {
                  http_status: upgradeRejection.status,
                  cf_mitigated: upgradeRejection.cfMitigated,
                }),
              };
              if (Object.keys(Me).length > 0) logFeatureBad("artifact_live_subscribe", "connect_failed", Me);
              else logFeatureBad("artifact_live_subscribe", "connect_failed");
            }
            if (z !== undefined && !z.stopped)
              z.lastFailure = Se < live.rewatchTiming.minUptimeMs ? (V ?? "unknown") : undefined;
            describeResumedWatchFailure(live, slug, {
              uptimeMs: je ? 0 : Se,
              ...(V !== undefined && {
                closeCode: V,
              }),
              resumeNeverOpened: Z && !ne,
              reuseRefused: Lt !== undefined,
              stalled: xt,
              expired: Ct,
            });
          },
        },
        context,
      );
      getTaskAssignmentSummary(live, k, slug, A.data.taskId);
      if (xe) {
        live.pendingRegistrations--;
        xe = false;
      }
      let j = live.supervisors.get(slug);
      if (j === undefined || j !== k) {
        stopMonitorWsTasks(A.data.taskId, context.taskRegistry, {
          quiet: true,
        });
        describeSkippedResume(live, slug, n.machineArm);
        return {
          outcome: "skipped",
          reason: "cancelled",
        };
      }
      if (x()) {
        stopMonitorWsTasks(A.data.taskId, context.taskRegistry, {
          quiet: true,
        });
        removeSupervisor(live, slug);
        return {
          outcome: "skipped",
          reason: "cancelled",
        };
      }
      if (P()) {
        stopMonitorWsTasks(A.data.taskId, context.taskRegistry, {
          quiet: true,
        });
        logFeatureSad("artifact_live_subscribe", "stop_latched");
        live.armOutcomes.delete(slug);
        forgetArmOutcomeAndNotices(live, slug);
        if (St || k.lastActivityAt !== lastActivityAt_2) endStoppedWatch(live, k);
        else removeSupervisor(live, slug);
        return {
          outcome: "skipped",
          reason: "stop_latched",
        };
      }
      let aborted = Z && signal.aborted;
      if (aborted && approvedRelatchGen !== undefined && stopLatches.isStopped(slug)) {
        stopMonitorWsTasks(A.data.taskId, context.taskRegistry, {
          quiet: true,
        });
        removeSupervisor(live, slug);
        return {
          outcome: "skipped",
          reason: "cancelled",
        };
      }
      live.armOutcomes.delete(slug);
      forgetArmOutcomeAndNotices(live, slug);
      if (aborted)
        return {
          outcome: "skipped",
          reason: "cancelled",
        };
      if (Z && (getLiveState().wakes.scanGeneration !== scanGeneration || stopGeneration(slug) !== Ue))
        return {
          outcome: "skipped",
          reason: "stopped_again",
        };
      if (vn && le !== undefined) {
        let U = live.supervisors.get(slug);
        if (U === k && !U.stopped && !isHumanTurnWiringStale(live, slug, autoReactWiring_3))
          U.autoReactWiring = mergeAutoReactWiring(
            U.autoReactWiring,
            {
              ...le,
              title: U.autoReactWiring?.title ?? le.title,
            },
            true,
          );
      }
      let ue = se ? undefined : live.pendingInFlightWiring.get(slug);
      let En = isSlugStopped(slug);
      let ni = En || (I !== undefined && getLiveState().wakes.scanGeneration !== scanGeneration);
      let Tn =
        ue !== undefined &&
        ue.freshPublishWiring &&
        ue.scanGeneration === getLiveState().wakes.scanGeneration &&
        ue.stopGeneration === stopGeneration(slug);
      if (ue === undefined || signal.aborted || !(I === undefined ? !En || Tn : !Z && ni && Tn))
        return {
          outcome: "armed",
          taskId: A.data.taskId,
          ...(se && {
            degraded: "not_editor",
          }),
        };
      live.pendingInFlightWiring.delete(slug);
      Ce = ue;
      stopMonitorWsTasks(A.data.taskId, context.taskRegistry, {
        quiet: true,
      });
    } catch {
      let A = live.supervisors.get(slug);
      if (zr && A === k && !(A !== undefined && A.explicit && !explicit)) removeSupervisor(live, slug);
      else if (Yr && A !== undefined && A === q) A.explicit = false;
      if (armedVia !== undefined && A === k && A.armedVia === "resume") A.armedVia = armedVia;
      else if (bn && A === k && A.armedVia === L && !A.explicit) {
        A.armedVia = "mcp_write";
        if (autoReactWiring_2 === undefined) delete A.autoReactWiring;
        else A.autoReactWiring = autoReactWiring_2;
        emitSummonArm(live, slug);
      }
      if (A !== undefined && A === k && A.wake === command)
        if (wake === undefined) delete A.wake;
        else A.wake = wake;
      if (A !== undefined && onOpen !== undefined) A.resumeAnnounce = undefined;
      if (
        O !== undefined &&
        A?.lease === O &&
        !shouldRetryDial(O, {
          expired: false,
          refused: false,
          healthy: false,
        })
      ) {
        delete A.lease;
        if (!O.opened) delete A.renewable;
      }
      logFeatureBad("artifact_live_subscribe", F !== undefined ? "reuse_ws_open_error" : "ws_open_error");
      return skipArm(live, slug, n.machineArm, "ws_open_error", Y);
    }
  } finally {
    live.inFlightSubscribes.delete(slug);
    live.inFlightWiredIntent.delete(slug);
    live.retiredInFlightArms.delete(slug);
    live.inFlightGenerations.delete(slug);
    live.bootingWiredArms.delete(slug);
    let x = live.supervisors.get(slug);
    if (x === undefined || x.stopped) liveDocHeadSink(slug)?.sourceEnded();
    let J = live.armSettleWaiters.get(slug) ?? [];
    live.armSettleWaiters.delete(slug);
    for (let D of J)
      try {
        D();
      } catch (error) {
        logError(error);
      }
    live.pendingInFlightWiring.delete(slug);
    if (xe) {
      live.pendingRegistrations--;
      xe = false;
    }
  }
  if (Ce === undefined) throw Error("armLiveSubscription: late-park fall-through lost its park");
  return FrameLiveWatchManager(live, {
    ...n,
    machineArm: undefined,
    userResumeWiring: undefined,
    approvedRelatchGen: undefined,
    sessionResume: undefined,
    pickUpRecentSummons: undefined,
    editorGatedWiring: undefined,
    autoReactWiring: Ce.wiring,
    freshPublishWiring: Ce.freshPublishWiring,
    freshPublish: n.freshPublish === true || Ce.freshPublishWiring,
  });
}
//@ chunk-aqdf5t3e.js:86204-86285 placement
function recordArmFailureLive(e, n, outcome, reason) {
  setWithLimit(
    e.armOutcomes,
    n,
    {
      outcome,
      reason,
      at: Date.now(),
    },
    MAX_CRON_OWNERSHIP_ENTRIES,
  );
}
//@ chunk-aqdf5t3e.js:86285-86647 placement
/**
 * 记录一次监听布防失败（忽略过期的交接代次与已撤销的布防）；已有定时器重试的只记最近失败；未被停止时登记失败结果，需要时向主会话通知。
 */
function recordArmFailure(e, n, r, reason, h) {
  if (r || e.handoffGeneration !== h.handoffGen || e.retiredInFlightArms.has(n)) return;
  let a = e.supervisors.get(n);
  if (a !== undefined && !a.stopped && a.timer !== undefined) {
    if (reason !== "cancelled") a.lastFailure = reason;
    return;
  }
  if (e.armOutcomes.has(n)) return;
  let d = getLiveState().durable.stopLatches.isStopped(n);
  if (!d) recordArmFailureLive(e, n, "failed", reason);
  if (h.announce && reason !== "cancelled" && !d) announceArmFailure(e, n, h, reason);
}
//@ chunk-aqdf5t3e.js:87895-87949 placement
function forgetArmOutcomeAndNotices(e, slug) {
  removeCronOwnedKeys(e.announcedArmFailures, slug);
  pullStaleWatchLifecycleNotices(slug);
}
//@ chunk-aqdf5t3e.js:87949-88105 placement
function pullStaleWatchLifecycleNotices(slug) {
  removeQueuedByFilter(
    (n) =>
      n.origin?.kind === "task-notification" &&
      n.origin.source === ARTIFACT_WATCH_LIFECYCLE &&
      n.origin.slug === slug &&
      (n.origin.armFailed === true || n.origin.watchEnded === true),
  );
}
//@ chunk-aqdf5t3e.js:88105-88580 placement
/**
 * 实时订阅布防失败时向模型发一次通知（同一 slug 与原因只发一次），说明原因与不会再追踪新版本。
 */
function announceArmFailure(e, n, r, s) {
  if (!addWithLimit(e.announcedArmFailures, `${n}:${s}`, MAX_CRON_OWNERSHIP_KEYS)) return;
  let h = frameLiveSkipReasonPhrase(s) ?? s;
  let a =
    noRewatchAdvice(s) ??
    (getLiveState().builtInArtifactHiddenForMcp ? undefined : MISSED_WATCH_RELAUNCH_ADVICE);
  enqueueWatchLifecycleNotice({
    slug: n,
    artifactName: quoteArtifactName(r.getTitle, r.url),
    shortReason: SKIP_REASON_PHRASES[s] ?? "not armed",
    event: `The live subscription for ${r.url} did not arm \u2014 ${h}. This session is NOT watching it and does not keep track of new versions of it; ${a === undefined ? "do not claim to be watching it" : `${a}, and do not claim to be watching it meanwhile`}.`,
  });
}
//@ chunk-aqdf5t3e.js:88580-88886 placement
/**
 * 把 artifact 监听生命周期事件作为任务通知排进下一条消息（可被动），附带 slug 与名称。
 */
function enqueueWatchLifecycleNotice(e) {
  enqueuePendingNotification({
    value: formatTaskNotification({
      taskType: ARTIFACT_WATCH_LIFECYCLE,
      summary: escapeXml(notWatchingNotice(e.artifactName, e.shortReason)),
      body: `
<event>${escapeXml(e.event)}</event>`,
    }),
    mode: "task-notification",
    priority: "next",
    ...(e.passive && {
      passive: true,
    }),
    origin: {
      kind: "task-notification",
      source: ARTIFACT_WATCH_LIFECYCLE,
      slug: e.slug,
      displayName: e.artifactName,
      armFailed: true,
    },
    agentId: mainAgentId(),
  });
}
//@ chunk-aqdf5t3e.js:88886-89797 placement
function onDurablePublishArmSettled(e) {
  let { slug, url, liveDocLoss, claudeDoc, settlement } = e;
  if (settlement.settled === "registered") {
    pullStaleWatchLifecycleNotices(slug);
    if (claudeDoc && getLiveState().durable.rows.get(slug)?.events.includes("comment") === false)
      noteClaudeDocWakeMissing(slug, url, "comment events unsupported");
    return;
  }
  if (settlement.settled !== "unregistered") return;
  let { reason, detail, serverMessage, refusedByFrame } = settlement;
  let R = getLiveState().builtInArtifactHiddenForMcp ? null : unexpectedWatchFailure(reason);
  if (claudeDoc) {
    noteClaudeDocWakeMissing(
      slug,
      url,
      detail === undefined ? reason : `${reason}: ${detail}`,
      refusedByFrame
        ? undefined
        : `${describeWatchError(reason, serverMessage)}${R === null ? "" : ` To try again, ${R}.`}`,
    );
    return;
  }
  if (!claimArmFailureAnnouncement(slug, reason)) return;
  let C =
    liveDocLoss ??
    `This session will NOT be woken when ${isArtifactsAvailable() ? "it is republished or a comment on it is sent to Claude" : "it is republished"}`;
  enqueueWatchLifecycleNotice({
    slug,
    artifactName: quoteArtifactName(e.getTitle, url),
    shortReason: "wake subscription not registered",
    event: `The durable wake subscription for ${url} was not registered (${reason}${detail !== undefined ? `: ${detail}` : ""}) \u2014 ${describeWatchError(reason, serverMessage)} ${C}${R === null ? "" : `; ${R}`} \u2014 do not claim to be subscribed to it meanwhile.`,
  });
}
//@ chunk-aqdf5t3e.js:89797-90232 placement
function noteClaudeDocWakeMissing(slug, url, r, s) {
  if (!claimArmFailureAnnouncement(slug, "claude_doc")) return;
  enqueueWatchLifecycleNotice({
    slug,
    artifactName: url,
    shortReason: "comment wake not registered",
    event: `@Claude comments on the Claude Doc ${url} go to another Claude and will not reach this session: its comment wake was not registered (${r}).${s === undefined ? "" : ` ${s}`} To see them, read the doc's comments yourself with the Claude Docs connector's \`${QUERY}\`, and do not claim to be subscribed to it.`,
    passive: true,
  });
}
//@ chunk-aqdf5t3e.js:90232-90283 placement
function isFrameLiveRowConnecting(e) {
  return e.connected && !isMonitorSocketOpenNow(e.taskId);
}
//@ chunk-aqdf5t3e.js:90283-91453 placement
function frameLiveArmRows(appState, sessionId) {
  let live = getLiveState().live;
  let s = new Set();
  for (let S of Object.values(appState.taskRegistry.all()))
    if (isMonitorWsTask(S) && S.status === "running" && S.frameLive !== undefined) s.add(S.frameLive.slug);
  let stopLatches = getLiveState().durable.stopLatches;
  let a = (S) => (sessionId === undefined || S === sessionId) && !s.has(S) && !stopLatches.isStopped(S);
  let d = new Set(frameLiveStoppedRows(appState, sessionId).map((S) => S.slug));
  let b = [];
  let w = new Set();
  for (let inFlightSubscribe of live.inFlightSubscribes) {
    if (
      !a(inFlightSubscribe) ||
      (live.inFlightGenerations.get(inFlightSubscribe) ?? live.handoffGeneration) !==
        live.handoffGeneration ||
      live.retiredInFlightArms.has(inFlightSubscribe)
    )
      continue;
    w.add(inFlightSubscribe);
    let R = live.supervisors.get(inFlightSubscribe);
    let C = R !== undefined && !R.stopped ? R : undefined;
    b.push({
      slug: inFlightSubscribe,
      state: "arming",
      reconnect: C?.taskId !== undefined,
      failures: C?.consecutiveFailures ?? 0,
      ...(C?.lastFailure !== undefined && {
        lastFailure: C.lastFailure,
      }),
    });
  }
  for (let supervisor of live.supervisors.values()) {
    if (!a(supervisor.slug) || w.has(supervisor.slug) || supervisor.stopped || supervisor.timer === undefined)
      continue;
    w.add(supervisor.slug);
    if (d.has(supervisor.slug)) continue;
    b.push({
      slug: supervisor.slug,
      state: "backing_off",
      failures: supervisor.consecutiveFailures,
      maxFailures: live.rewatchTiming.maxConsecutiveFailures,
      nextAt: supervisor.nextRewatchAt ?? Date.now(),
      ...(supervisor.lastFailure !== undefined && {
        lastFailure: supervisor.lastFailure,
      }),
    });
  }
  for (let [S, R] of live.armOutcomes) {
    if (!a(S) || w.has(S)) continue;
    b.push({
      slug: S,
      state: R.outcome,
      reason: R.reason,
      at: R.at,
    });
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
  liveUpdatesTaskLabel,
  liveDocHeadSink,
  recordArmFailureLive,
  recordArmFailure,
  FrameLiveWatchManager,
  canArmFrameLive,
  touchSupervisorActivity,
  monitorContextAndSignal,
  findArmedAutoReactMonitor,
  liftSweptPause,
  endFrameLiveWatchOfDeletedArtifact,
  subscribeFrameLiveOnAttach,
};
