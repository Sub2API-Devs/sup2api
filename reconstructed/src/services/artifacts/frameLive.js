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
function claimArmFailureAnnouncement(announce, reason) {
  return addWithLimit(
    getLiveState().durable.announcedArmFailures,
    `${announce}:${reason}`,
    MAX_CRON_OWNERSHIP_KEYS,
  );
}
//@ chunk-aqdf5t3e.js:38633-38869 placement = splitCommandWithOperators (0.316)
/**
 * 返回逐行处理器：对以 { 开头的行解析 JSON，comment 类型回调 comment()，ver 字段回调 ver(v,'live')，其他忽略。旧版名 splitCommandWithOperators 误配，属 frameLive 相关模块。
 */
function makeLiveVersionLineHandler(command) {
  return (match) => {
    if (!match.startsWith("{")) return null;
    let out;
    try {
      out = jsonParseRaw(match);
    } catch {
      return null;
    }
    if (out.kind === "comment") {
      command.comment();
      return null;
    }
    if (out.kind === "summon") return null;
    if (typeof out.ver === "string") command.ver(out.ver, "live");
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
function touchSupervisorActivity(slug) {
  let live = getLiveState().live;
  let supervisor = live.supervisors.get(slug);
  if (
    supervisor !== undefined &&
    !supervisor.stopped &&
    supervisor.armedVia !== "mcp_write" &&
    !live.inFlightSubscribes.has(slug)
  )
    supervisor.lastActivityAt = Date.now();
}
//@ chunk-aqdf5t3e.js:39110-40054 placement
function handleFrameLiveControl(sink, slug, handlers) {
  return (line) => {
    if (line.charCodeAt(0) !== 123) return null;
    let parsed;
    try {
      parsed = jsonParseRaw(line);
    } catch {
      return null;
    }
    let event = PRESENCE_EVENT_SCHEMA().safeParse(parsed);
    if (!event.success) return null;
    let { kind, actor, payload } = event.data;
    if (actor !== undefined || (event.data.slug !== undefined && event.data.slug !== slug)) return null;
    switch (kind) {
      case "ctrl:comment":
        sink.comment();
        return null;
      case "ctrl:invalidate": {
        let invalidation = INVALIDATION_EVENT_SCHEMA().safeParse(payload);
        if (!invalidation.success) return null;
        if (invalidation.data.tag === INVALIDATE_TAG_LIVE || invalidation.data.tag === INVALIDATE_TAG_SHARED)
          sink.ver(invalidation.data.ver, "sync");
        else if (
          invalidation.data.tag === INVALIDATE_TAG_HEAD &&
          VERSION_NUMBER_RE.test(invalidation.data.ver)
        ) {
          touchSupervisorActivity(slug);
          liveDocHeadSink(slug)?.seq(Number(invalidation.data.ver));
        }
        return null;
      }
      case "ctrl:token_refresh": {
        let tokenRefresh = TOKEN_REFRESH_SCHEMA().safeParse(payload);
        if (tokenRefresh.success && isAgentCapToken(tokenRefresh.data.cap))
          handlers.onTokenRefresh(tokenRefresh.data.cap, tokenRefresh.data.exp);
        return null;
      }
      case "ctrl:token_refresh_declined": {
        let decline = DECLINE_REASON_SCHEMA().safeParse(payload);
        if (decline.success && decline.data.reason === TOKEN_LINEAGE_EXPIRED) handlers.onExpiryAnnounced();
        return null;
      }
      case "ctrl:comment_hint": {
        let readState = COMMENTS_READ_STATE_SCHEMA().safeParse(payload);
        if (readState.success) handlers.onCommentHint(readState.data.commentsEmpty, readState.data.readAtMs);
        return null;
      }
      default:
        return null;
    }
  };
}
//@ chunk-aqdf5t3e.js:40054-40203 placement
function classifyMonitorTask(task, slug, commentVerbsInSchema, humanTurnWiring, supervisor, explicit) {
  if (!explicit(task, commentVerbsInSchema)) return "dead";
  return humanTurnWiring &&
    (isSlugStopped(slug)
      ? supervisor && (task.autoReactArmed !== true || !isSlugSwept(slug) || isSlugOrphaned(slug))
      : task.autoReactArmed !== true)
    ? "replace"
    : "keep";
}
//@ chunk-aqdf5t3e.js:40203-40247 placement
function isMonitorTaskLive(task, slug) {
  return isMonitorSocketOpenNow(task.id) && isMonitorWsTaskLive(task, slug);
}
//@ chunk-aqdf5t3e.js:40247-40585 placement
/**
 * 整理某 slug 正在运行的监听任务：已失联的停掉（标记连接丢失），需要替换的安静停掉，返回保留下来的任务 id。
 */
function reconcileMonitorTasks(context, slug, humanTurnWiring, humanTurnWiring_2) {
  let now = Date.now();
  let foundId = null;
  for (let task of Object.values(context.taskRegistry.all())) {
    if (!isMonitorWsTask(task) || task.status !== "running" || task.frameLive?.slug !== slug) continue;
    let verdict = classifyMonitorTask(
      task,
      slug,
      now,
      humanTurnWiring,
      humanTurnWiring_2,
      isMonitorWsTaskLive,
    );
    if (verdict !== "dead") {
      if (verdict === "replace") {
        stopMonitorWsTasks(task.id, context.taskRegistry, {
          quiet: true,
        });
        continue;
      }
      foundId = task.id;
      continue;
    }
    stopMonitorWsTasks(task.id, context.taskRegistry, {
      quiet: true,
      connectionLost: true,
    });
  }
  return foundId;
}
//@ chunk-aqdf5t3e.js:40585-40694 placement
function hasRunningMonitor(registry, slug) {
  return Object.values(registry.all()).some(
    (task) => isMonitorWsTask(task) && task.status === "running" && task.frameLive?.slug === slug,
  );
}
//@ chunk-aqdf5t3e.js:40694-40750 placement
function isAutoreactTaskArmed(task) {
  return isAutoReactArmedTask(task, isAutoreactArmed, {
    includeStopLatched: true,
  });
}
//@ chunk-aqdf5t3e.js:40750-40783 placement
function isClaimableAutoReactSubscription(task) {
  return isAutoReactArmedTask(task, isAutoreactArmed);
}
//@ chunk-aqdf5t3e.js:40783-41789 placement
function killAutoReactSubscriptions(registry, options) {
  setLedgerStorage(options?.storageV5);
  clearSummonWakeTimers();
  bumpScanGeneration();
  let live = getLiveState().live;
  let durable = options?.durable !== false;
  let killed = 0;
  let slugs = new Set();
  for (let task of Object.values(registry.all()))
    if (isAutoreactTaskArmed(task)) {
      let supervisor =
        task.autoReactSlug !== undefined &&
        isSlugStopped(task.autoReactSlug) &&
        (!isSlugSwept(task.autoReactSlug) || isSlugYielded(task.autoReactSlug));
      if (durable) {
        stopMonitorWsTasks(task.id, registry, {
          quiet: true,
          userStop: true,
        });
        if (task.autoReactSlug !== undefined) {
          resetAutoReactForSlug(task.autoReactSlug);
          slugs.add(task.autoReactSlug);
        }
      } else if (task.autoReactSlug !== undefined) slugs.add(task.autoReactSlug);
      if (
        !supervisor &&
        !(task.autoReactSlug !== undefined && !durable && isSlugStopped(task.autoReactSlug))
      ) {
        killed++;
        if (!durable && task.autoReactSlug !== undefined) {
          sweepSlug(task.autoReactSlug);
          emitSummonArm(live, task.autoReactSlug);
        }
      }
    }
  for (let supervisor of live.supervisors.values()) {
    if (supervisor.autoReactWiring === undefined) continue;
    if (durable) delete supervisor.autoReactWiring;
    if (durable && isAutoreactArmed() && (!isSlugStopped(supervisor.slug) || slugs.has(supervisor.slug)))
      if (hasRunningMonitor(registry, supervisor.slug) || live.inFlightSubscribes.has(supervisor.slug))
        demoteExplicitWatch(live, supervisor.slug, registry);
      else {
        removeSupervisor(live, supervisor.slug);
        hasWatchArtifactArg(supervisor.slug, supervisor.context.storageV5);
      }
    if (!slugs.has(supervisor.slug) && isAutoreactArmed() && !isSlugStopped(supervisor.slug)) {
      slugs.add(supervisor.slug);
      killed++;
      if (durable) {
        resetAutoReactForSlug(supervisor.slug);
        stopSummonWakes(supervisor.slug);
      } else sweepSlug(supervisor.slug);
    }
  }
  if (durable)
    disarmAutoreact({
      storageV5: options?.storageV5,
    });
  else if (killed > 0)
    flushAutoreactLedger({
      flush: true,
      storageV5: options?.storageV5,
    });
  return killed;
}
//@ chunk-aqdf5t3e.js:41789-42204 placement
/**
 * 解除某 slug 被清扫暂停的自动回复：仍有活跃自动回复监听任务时恢复召唤唤醒并广播；若有上次唤醒参数则重新安排扫描（返回 lifted），否则返回 cleared；不满足条件返回 null。
 */
function liftSweptPause(registry, registry_2, slug, outcome) {
  if (!isSlugSwept(registry_2) || isSlugOrphaned(registry_2) || !isAutoreactArmed()) return null;
  let armedAutoReactMonitor = findArmedAutoReactMonitor(registry, registry_2);
  if (armedAutoReactMonitor === undefined) return null;
  outcome?.();
  let { live, wakes } = getLiveState();
  resumeSummonWakes(registry_2);
  wakes.liftedAtScanGeneration.set(registry_2, wakes.scanGeneration);
  emitSummonArm(live, registry_2);
  let lastWakeArgs = getSummonWakeState(registry_2).lastWakeArgs;
  if (!isMonitorSocketOpenNow(armedAutoReactMonitor.id) || lastWakeArgs === null) return "cleared";
  slug?.(lastWakeArgs);
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
function findArmedAutoReactMonitor(registry, slug) {
  return Object.values(registry.all()).find(
    (task) =>
      isMonitorWsTask(task) &&
      task.status === "running" &&
      task.autoReactArmed === true &&
      task.autoReactSlug === slug &&
      isMonitorWsTaskLive(task),
  );
}
//@ chunk-aqdf5t3e.js:42342-42486 placement
function releaseNoticeLatchesOnTurn(registry, registry_2) {
  if (registry_2.ownWords) {
    let cleared = clearOrphanedAutoReactNotices(
      (task) => hasThreadAgentForSlugPost(task) || hasActivitySince(registry, autoReactNoticeLatchedAt(task)),
    );
    if (cleared > 0)
      logFeatureOk("artifact_live_subscribe", {
        notice_latch_released: cleared,
      });
  }
  return unpauseSweptOnHumanTurn(registry);
}
//@ chunk-aqdf5t3e.js:42486-42589 placement
function hasActivitySince(registry, since) {
  if (since === undefined) return false;
  return Object.values(registry.all()).some((task) => task.startTime >= since && isTaskActive(task));
}
//@ chunk-aqdf5t3e.js:42589-42952 placement
/**
 * 判断任务是否仍处于活跃状态：shell/监视任务看运行或等待；agent 任务另外包括因非空闲原因保活的已完成任务与正在恢复的任务。
 */
function isTaskActive(task) {
  let active = task.status === "running" || task.status === "pending";
  if (task.type === "local_bash" || isMonitorShellTask(task)) return active;
  if (!AGENT_TASK_TYPES.has(task.type) || task.type === "in_process_teammate") return false;
  let resuming =
    task.status === "completed" &&
    "keepaliveReasons" in task &&
    task.keepaliveReasons instanceof Set &&
    [...task.keepaliveReasons].some((keepaliveReason) => keepaliveReason !== "flag:idle-window");
  let resumeState = "resuming" in task && task.resuming === true;
  return active || resuming || resumeState;
}
//@ chunk-aqdf5t3e.js:42952-43156 placement
/**
 * 人类发起新回合时记下扫描代次，并尝试解除所有被清扫暂停的 slug，打点解除数量。
 */
function unpauseSweptOnHumanTurn(registry) {
  let { wakes } = getLiveState();
  wakes.humanTurnAtScanGeneration = wakes.scanGeneration;
  let count = 0;
  for (let sweptSlug of [...wakes.sweptSlugs]) if (liftSweptPause(registry, sweptSlug) !== null) count++;
  if (count > 0)
    logFeatureOk("artifact_live_subscribe", {
      unpaused_on_turn: count,
    });
  return count;
}
//@ chunk-aqdf5t3e.js:43156-43235 placement
function hasStoppableAutoReactSupervision() {
  return getLiveState().builtInArtifactHiddenForMcp
    ? hasActiveAutoReactWatch() && isAutoreactArmed()
    : isAutoreactArmed() && hasActiveAutoReactWatch();
}
//@ chunk-aqdf5t3e.js:43235-44062 placement
function frameLiveWatchRows(context, onlySlug) {
  let rows = [];
  let autoReact;
  let getAutoReact = () => (autoReact ??= isAutoReactEnabled());
  let liveState = getLiveState();
  let userDisarmed = liveState.autoReact.userDisarmed;
  for (let task of Object.values(context.taskRegistry.all())) {
    if (
      !isMonitorWsTask(task) ||
      task.status !== "running" ||
      task.frameLive === undefined ||
      (onlySlug !== undefined && task.frameLive.slug !== onlySlug)
    )
      continue;
    let supervisor = liveState.live.supervisors.get(task.frameLive.slug);
    rows.push({
      slug: task.frameLive.slug,
      taskId: task.id,
      since: task.frameLive.watchedSince,
      explicit: supervisor?.explicit ?? task.frameLive.explicit,
      connected: isMonitorWsTaskLive(task),
      tokenExpiresAt:
        supervisor?.lease?.expMs ??
        task.frameLive.armedAt +
          (supervisor?.transport === "sync" ? ROUTE_ABSENT_GRACE_MS : SUMMON_STATE_TTL_MS),
      armedVia: supervisor?.armedVia ?? task.frameLive.armedVia,
      autoReply:
        task.autoReactArmed !== true
          ? isSlugStoppedAnywhere(task.frameLive.slug)
            ? userDisarmed
              ? "disarmed"
              : getAutoReact()
                ? "stopped"
                : "none"
            : "none"
          : userDisarmed
            ? "disarmed"
            : !getAutoReact()
              ? "none"
              : task.autoReactSlug !== undefined && isSlugStoppedAnywhere(task.autoReactSlug)
                ? isSlugSwept(task.autoReactSlug)
                  ? isSlugYielded(task.autoReactSlug)
                    ? "yielded"
                    : "paused"
                  : "stopped"
                : getAutoReactArmState(task.frameLive.slug),
    });
  }
  return rows.sort((a, b) => a.since - b.since);
}
//@ chunk-aqdf5t3e.js:44062-44271 placement
function getAutoReactArmState(slug) {
  let state = getLiveState().autoReact.artifacts.get(slug);
  let lastProbeDeniedBy = state?.lastProbeDeniedBy ?? null;
  if (lastProbeDeniedBy !== null) return lastProbeDeniedBy === "denied_by_auto_mode" ? "declined" : "denied";
  return state?.lastReplyDeclinedByAutoMode === true ? "declined" : "armed";
}
//@ chunk-aqdf5t3e.js:44271-44838 placement
function frameLiveStoppedRows(request, options) {
  let { live, autoReact, wakes } = getLiveState();
  let rows = [];
  let autoReactOn;
  let getAutoReact = () => (autoReactOn ??= isAutoReactEnabled());
  for (let stoppedSlug of wakes.stoppedSlugs) {
    if (options !== undefined && stoppedSlug !== options) continue;
    if (
      hasRunningMonitor(request.taskRegistry, stoppedSlug) ||
      live.inFlightSubscribes.has(stoppedSlug) ||
      (!autoReact.userDisarmed && !getAutoReact())
    )
      continue;
    let supervisor = live.supervisors.get(stoppedSlug);
    let liveSupervisor = supervisor !== undefined && !supervisor.stopped ? supervisor : undefined;
    rows.push({
      slug: stoppedSlug,
      ...(liveSupervisor !== undefined && {
        since: liveSupervisor.watchedSince,
        explicit: liveSupervisor.explicit,
        armedVia: liveSupervisor.armedVia,
      }),
      stopKind: isSlugSwept(stoppedSlug) ? (isSlugYielded(stoppedSlug) ? "yielded" : "interrupt") : "user",
      autoReply: autoReact.userDisarmed ? "disarmed" : "stopped",
    });
  }
  return rows.sort((a, b) => (a.since ?? Number.POSITIVE_INFINITY) - (b.since ?? Number.POSITIVE_INFINITY));
}
//@ chunk-aqdf5t3e.js:44838-45394 placement
function classifyWatchReason(liveState, context, { forPublish = false } = {}) {
  let { supervisors } = liveState;
  let ranked = [];
  for (let row of frameLiveWatchRows(context)) {
    let supervisor = supervisors.get(row.slug);
    let watchProtectionForRow = getWatchProtectionForRow(liveState, row, context);
    if (watchProtectionForRow === "explicit" || watchProtectionForRow === "most_recent_publish") continue;
    if (watchProtectionForRow === "auto_reply") {
      if (!forPublish || isArtifactScanBusy(row.slug)) continue;
      ranked.push({
        row,
        tier: 3,
      });
      continue;
    }
    ranked.push({
      row,
      tier: supervisor === undefined || supervisor.stopped ? 0 : supervisor.armedVia === "mcp_write" ? 1 : 2,
    });
  }
  return ranked
    .sort((leftRow, rowA) => {
      if (leftRow.tier !== rowA.tier) return leftRow.tier - rowA.tier;
      let supervisorA = supervisors.get(leftRow.row.slug);
      let supervisorB = supervisors.get(rowA.row.slug);
      let lastActivityAt = supervisorA && !supervisorA.stopped ? supervisorA.lastActivityAt : 0;
      let lastActivityAt_2 = supervisorB && !supervisorB.stopped ? supervisorB.lastActivityAt : 0;
      return lastActivityAt - lastActivityAt_2 || leftRow.row.since - rowA.row.since;
    })
    .map((entry) => entry.row);
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
function getWatchProtection(state, slug) {
  let supervisor = state.supervisors.get(slug);
  if (supervisor === undefined || supervisor.stopped) return null;
  if (supervisor.explicit) return "explicit";
  if (isRecentOwnPublish(state, supervisor)) return "most_recent_publish";
  return supervisor.autoReactWiring !== undefined &&
    isAutoreactArmed() &&
    (!isSlugStopped(slug) || isSlugSwept(slug))
    ? "auto_reply"
    : null;
}
//@ chunk-aqdf5t3e.js:46273-46312 placement
function hasWatchProtection(state, slug) {
  return getWatchProtection(state, slug) !== null;
}
//@ chunk-aqdf5t3e.js:46312-46500 placement
function getWatchProtectionForRow(state, row, options) {
  let supervisor = state.supervisors.get(row.slug);
  if (supervisor !== undefined && !supervisor.stopped) return getWatchProtection(state, row.slug);
  let task = options.taskRegistry.all()[row.taskId];
  return row.explicit ? "explicit" : isClaimableAutoReactSubscription(task) ? "auto_reply" : null;
}
//@ chunk-aqdf5t3e.js:46500-46708 placement
function evictForProtectedReconnect(live, context) {
  let reasons = classifyWatchReason(live, context);
  if (reasons.length === 0) return false;
  evictWatch(live, reasons[0], context, {
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
function startFrameLiveWatch(options) {
  let live = getLiveState().live;
  live.handoffGeneration += 1;
  clearSummonWakeTimers();
  bumpScanGeneration();
  let total = 0;
  for (let supervisor of [...live.supervisors.values()]) {
    if (!supervisor.stopped) total++;
    if (supervisor.autoReactWiring !== undefined) {
      let { slug } = supervisor;
      import("./replyYieldHolder.js").then((mod) => mod.handBackTakenOverSlug(slug));
    }
    delete supervisor.autoReactWiring;
    removeSupervisor(live, supervisor.slug);
    for (let task of Object.values(supervisor.context.taskRegistry.all())) {
      if (!isMonitorWsTask(task) || task.status !== "running" || task.frameLive?.slug !== supervisor.slug)
        continue;
      stopMonitorWsTasks(task.id, supervisor.context.taskRegistry, {
        quiet: true,
      });
    }
  }
  live.armOutcomes.clear();
  live.announcedArmFailures.clear();
  if (total === 0) return total;
  let watchText = `${total} artifact ${total === 1 ? "watch" : "watches"}`;
  let detail =
    options === "signed_out"
      ? "Those watches were opened as the account that signed out: this session no longer keeps track of new versions of those artifacts or hears comments on them, and their comment auto-replies are off. A publish or watch of yours once someone is signed in opens a fresh watch; do not re-watch just to resume listening unless the user asks."
      : "Those watches were opened as the previous account: this session no longer keeps track of new versions of those artifacts or hears comments on them, and their comment auto-replies are off. A publish or watch of yours opens a fresh watch as the current account; do not re-watch just to resume listening unless the user asks.";
  enqueuePendingNotification({
    value: formatTaskNotification({
      taskType: ARTIFACT_WATCH_LIFECYCLE,
      summary: escapeXml(
        `Stopped watching ${watchText} (${options === "signed_out" ? "signed out" : "the signed-in account changed"})`,
      ),
      body: `
<event>${escapeXml(detail)}</event>`,
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
  return total;
}
//@ chunk-aqdf5t3e.js:48480-48827 placement
function unwatchFrameLive(slug, options, consentWriter) {
  let { wasWatching } = stopLiveWatch(slug, options);
  getLiveState().live.nonEditorSlugs.delete(slug);
  if (consentWriter !== undefined) {
    let repliesConsent = getLiveState().live.repliesConsent;
    let outstanding = repliesConsent.outstanding.get(slug);
    if (outstanding !== undefined) {
      repliesConsent.outstanding.delete(slug);
      if (outstanding.allowed !== true)
        repliesConsent.declined.set(slug, {
          namingMessages: outstanding.namingMessages,
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
function endFrameLiveWatchOfDeletedArtifact(slug, reason) {
  hasWatchArtifactArg(slug, reason.storageV5);
  let { wasWatching } = stopLiveWatch(slug, reason);
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
function stopLiveWatch(slug, reason) {
  let live = getLiveState().live;
  setLedgerStorage(reason.storageV5);
  live.armOutcomes.delete(slug);
  forgetArmOutcomeAndNotices(live, slug);
  forgetCensus(slug);
  let hasWiring = live.supervisors.get(slug)?.autoReactWiring !== undefined;
  let { wasWatching } = stopWatchesForSlug({
    slug,
    taskRegistry: reason.taskRegistry,
    announce: false,
    killRow: (row) => {
      let autoReactArmed = row.autoReactArmed === true;
      stopMonitorWsTasks(
        row.id,
        reason.taskRegistry,
        autoReactArmed
          ? {
              quiet: true,
              userStop: true,
              modelOrigin: true,
            }
          : {
              quiet: true,
            },
      );
      if (autoReactArmed && row.autoReactSlug !== undefined) resetAutoReactForSlug(row.autoReactSlug);
    },
  });
  if (hasWiring) resetAutoReactForSlug(slug);
  return {
    wasWatching,
  };
}
//@ chunk-aqdf5t3e.js:49375-50486 placement
async function watchFrameLive(options) {
  let { slug, url, publishContext, getKnownVer, context, tool, commentVerbsInSchema } = options;
  if (!isConsentUiKind(publishContext))
    return {
      outcome: "skipped",
      reason: "publish_context",
    };
  let live = getLiveState().live;
  let wantsAutoReact = tool !== undefined && commentVerbsInSchema === true && isAutoReactEnabled();
  let plainWatch = !wantsAutoReact
    ? undefined
    : !isUserDrivenTurn(context.messages)
      ? "unattended_turn"
      : !hasHumanMessageContaining(context.messages, slug) || !isStrictHumanTurn(context.messages)
        ? "not_named_by_user"
        : live.repliesConsent.declined.has(slug)
          ? "declined"
          : live.nonEditorSlugs.has(slug)
            ? "not_editor"
            : options.repliesApproved !== true
              ? "not_approved"
              : undefined;
  let watchOptions = explicitWatchOptions({
    tool: wantsAutoReact && plainWatch === undefined ? tool : undefined,
    commentVerbsInSchema,
    context,
  });
  let wiringOn = watchOptions.autoReactWiring !== undefined;
  let title = live.supervisors.get(slug)?.autoReactWiring?.title;
  let outcome = await FrameLiveWatchManager(live, {
    slug,
    url,
    getKnownVer,
    ownPublishes: context.artifactRegistries.ownPublishes,
    ...monitorContextAndSignal(context),
    ...watchOptions,
    pickUpRecentSummons: wiringOn,
    ...(watchOptions.autoReactWiring !== undefined && {
      autoReactWiring: {
        ...watchOptions.autoReactWiring,
        title,
      },
      editorGatedWiring: true,
    }),
  });
  if (
    wiringOn &&
    outcome.outcome === "armed" &&
    outcome.degraded === undefined &&
    !(isSlugStopped(slug) && !isSlugSwept(slug)) &&
    isAutoReactActive()
  )
    armMonitorIntent(slug, {
      title: live.supervisors.get(slug)?.autoReactWiring?.title ?? title,
      storageV5: context.storageV5,
    });
  if (plainWatch !== undefined && outcome.outcome === "armed")
    return {
      ...outcome,
      degraded: plainWatch,
    };
  if (plainWatch !== undefined && outcome.outcome === "already_watching")
    return {
      ...outcome,
      degraded: plainWatch,
    };
  return outcome;
}
//@ chunk-aqdf5t3e.js:50486-50541 placement
function knownNonEditor(slug) {
  return getLiveState().live.nonEditorSlugs.has(slug);
}
//@ chunk-aqdf5t3e.js:54609-54762 placement
function onArmSettled(slug, waiter) {
  let { live } = getLiveState();
  if (!live.inFlightSubscribes.has(slug)) {
    waiter();
    return;
  }
  let waiters = live.armSettleWaiters.get(slug) ?? [];
  waiters.push(waiter);
  live.armSettleWaiters.set(slug, waiters);
}
//@ chunk-aqdf5t3e.js:54762-54871 placement
function slugRepliesWiredHere(slug) {
  let supervisor = getLiveState().live.supervisors.get(slug);
  return supervisor !== undefined && !supervisor.stopped && supervisor.autoReactWiring !== undefined;
}
//@ chunk-aqdf5t3e.js:54871-55323 placement
async function watchArtifactFromStartup(options) {
  let { slug, url, getKnownVer, tool, commentVerbsInSchema, context } = options;
  if (tool !== undefined && isActingAsBgJob())
    ownProcStart().catch(() => {
      return;
    });
  let liveState = getLiveState();
  let outcome = await FrameLiveWatchManager(liveState.live, {
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
  if (
    tool !== undefined &&
    commentVerbsInSchema === true &&
    outcome.outcome !== "skipped" &&
    isAutoReactActive()
  )
    armMonitorIntent(slug, {
      title: liveState.live.supervisors.get(slug)?.autoReactWiring?.title,
      storageV5: context.storageV5,
    });
  return outcome;
}
//@ chunk-aqdf5t3e.js:55323-55535 placement
function explicitWatchOptions(options) {
  let { tool, commentVerbsInSchema, context } = options;
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
async function maybeSubscribeFrameLive(options) {
  let { slug, url, version, publishContext, getKnownVer, tool, commentVerbsInSchema, title, context } =
    options;
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
    let existing = live.supervisors.get(slug);
    if (existing !== undefined && !existing.stopped) existing.lastActivityAt = Date.now();
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
  let wantsAutoReact = tool !== undefined && commentVerbsInSchema === true;
  let plainWatch =
    options.carriedPublishConsent !== true &&
    options.resumedPublishConsent !== true &&
    options.chainPublish !== true &&
    options.adoptedPublish !== true &&
    isUserDrivenTurn(context.messages);
  let outcome = await FrameLiveWatchManager(live, {
    slug,
    url,
    getKnownVer,
    ownPublishes,
    ...monitorContextAndSignal(context),
    ...(options.onOpen !== undefined &&
      options.onGiveUp !== undefined && {
        onOpen: options.onOpen,
        onGiveUp: options.onGiveUp,
      }),
    ...(options.seedKnownVerFromBoot === true && {
      seedKnownVerFromBoot: true,
    }),
    ...((options.resumedPublishConsent === true || options.carriedPublishConsent === true) && {
      requireEditor: true,
    }),
    ...(options.sessionResume === true && {
      sessionResume: true,
    }),
    ...(plainWatch &&
      version !== undefined && {
        freshPublish: true,
      }),
    ...(options.announceArmlessEnd === true && {
      announceArmlessEnd: true,
    }),
    ...(options.resumedPublishConsent === true &&
      wantsAutoReact && {
        pickUpRecentSummons: true,
      }),
    ...(wantsAutoReact && {
      autoReactWiring: {
        tool,
        commentVerbsInSchema,
        context,
        title,
        ...(options.publishTranscript !== undefined && {
          publishTranscript: options.publishTranscript,
        }),
      },
      ...(plainWatch && {
        freshPublishWiring: true,
      }),
    }),
  });
  if ((version !== undefined || options.adoptedPublish === true) && outcome.outcome !== "skipped") {
    let { autoReact, wakes } = getLiveState();
    let plainWatch2 = !wantsAutoReact
      ? "bare_watch_comments_off"
      : autoReact.userDisarmed
        ? "bare_watch_session_disarmed"
        : !isCommentAutoreactOptedIn()
          ? "bare_watch_autoreact_off"
          : isSlugStopped(slug) &&
              !plainWatch &&
              !(
                isSlugSwept(slug) &&
                !isSlugOrphaned(slug) &&
                wakes.humanTurnAtScanGeneration === wakes.scanGeneration
              )
            ? "bare_watch_slug_stopped"
            : undefined;
    if (plainWatch2 !== undefined)
      logFeatureSad("artifact_live_subscribe", plainWatch2, {
        publish_context: fromEnum(publishContext),
      });
  }
  if (
    wantsAutoReact &&
    outcome.outcome !== "skipped" &&
    !(
      outcome.outcome === "already_watching" &&
      (options.resumedPublishConsent === true || options.carriedPublishConsent === true)
    ) &&
    !(outcome.outcome === "armed" && outcome.degraded !== undefined) &&
    isAutoReactActive()
  )
    armMonitorIntent(slug, {
      title: live.supervisors.get(slug)?.autoReactWiring?.title ?? title,
      storageV5: context.storageV5,
    });
  return outcome;
}
//@ chunk-aqdf5t3e.js:57521-57577 placement
function isAutoReactActive() {
  return !getLiveState().autoReact.userDisarmed && isCommentAutoreactOptedIn();
}
//@ chunk-aqdf5t3e.js:57577-57678 placement
function armMonitorIntent(slug, options) {
  if (getLiveState().builtInArtifactHiddenForMcp) {
    markSlugTravelling(slug, {
      storageV5: options.storageV5,
    });
    return;
  }
  armCommentMonitorIntent(slug, options);
}
//@ chunk-aqdf5t3e.js:57678-57760 placement
function liveUpdatesTaskLabel(url, explicit, armedVia) {
  return `live updates for artifact ${url} (${armedViaWording(labelledArmedVia(explicit, armedVia)).task})`;
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
function getEgressSkipReason(state) {
  if (isClaudeAiCpOverride())
    return {
      reason: "cp_override",
    };
  let denyReason = wsEgressDenyReason(state);
  if (denyReason !== null)
    return {
      reason: "egress_denied",
      egressKind: denyReason.kind,
    };
  return null;
}
//@ chunk-aqdf5t3e.js:58175-58405 placement
function frameLivePublishFindsConnected(context) {
  let { context: context_2, slug, wantWiring, canClearLatch } = context;
  let now = Date.now();
  for (let task of Object.values(context_2.taskRegistry.all()))
    if (
      isMonitorWsTask(task) &&
      task.status === "running" &&
      task.frameLive?.slug === slug &&
      classifyMonitorTask(task, slug, now, wantWiring, canClearLatch, isMonitorTaskLive) === "keep"
    )
      return true;
  return false;
}
//@ chunk-aqdf5t3e.js:58405-58569 placement
function frameLivePublishSkipReason(context) {
  if (getLiveState().durable.stopLatches.isStopped(context.slug)) return "stop_latched";
  if (!isConsentUiKind(context.publishContext)) return "publish_context";
  return getLiveSubscribeSkipReason(context.slug)?.reason ?? null;
}
//@ chunk-aqdf5t3e.js:64164-64360 placement
async function subscribeFrameLiveOnAttach(options) {
  let { slug, url, getKnownVer, context } = options;
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
async function FrameLiveWatchManager(live, opts) {
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
  } = opts;
  initAutoreactLedger();
  let carriedVer = live.supervisors.get(slug)?.carriedVer;
  live.endAll ??= startFrameLiveWatch;
  let commentVerbsInSchema = opts.autoReactWiring !== undefined && opts.autoReactWiring.commentVerbsInSchema;
  let armedVia =
    opts.userResumeWiring === true
      ? "resume"
      : explicit
        ? "watch"
        : opts.sessionResume === true
          ? "session_resume"
          : opts.mcpWrite === true
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
  let approvedRelatchGen = opts.userResumeWiring === true ? opts.approvedRelatchGen : undefined;
  let isStopLatched = () =>
    stopLatches.isStopped(slug) &&
    (approvedRelatchGen === undefined || stopLatches.latchGeneration(slug) !== approvedRelatchGen);
  if (isStopLatched()) {
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
  let canSync = canArmFrameLive(slug);
  let humanTurnWiring =
    (opts.freshPublishWiring === true || opts.userResumeWiring === true) && !opts.signal.aborted;
  let autoReactWiring = live.supervisors.get(slug)?.autoReactWiring;
  let existingTaskId = reconcileMonitorTasks(context, slug, commentVerbsInSchema, humanTurnWiring);
  if (existingTaskId !== null || live.inFlightSubscribes.has(slug)) {
    if (existingTaskId === null && approvedRelatchGen !== undefined && stopLatches.isStopped(slug)) {
      logFeatureSad("artifact_live_subscribe", "arm_in_flight");
      return {
        outcome: "skipped",
        reason: "arm_in_flight",
      };
    }
    if (!(armedVia === "resume" && existingTaskId === null && !live.supervisors.has(slug)))
      upsertSupervisor(live, {
        slug,
        url,
        getKnownVer,
        ownPublishes,
        context,
        explicit,
        machineArm: opts.machineArm,
        armedVia,
        ...(opts.requireEditor !== true &&
          opts.editorGatedWiring !== true && {
            autoReactWiring: opts.autoReactWiring,
            humanTurnWiring,
          }),
      });
    if (existingTaskId !== null) {
      let supervisor = live.supervisors.get(slug);
      if (supervisor !== undefined) {
        let taskLabel = liveUpdatesTaskLabel(url, supervisor.explicit, supervisor.armedVia);
        context.taskRegistry.update(existingTaskId, (task) => {
          if (!isMonitorWsTask(task) || task.frameLive === undefined) return task;
          if (
            task.description === taskLabel &&
            task.frameLive.explicit === supervisor.explicit &&
            task.frameLive.armedVia === supervisor.armedVia
          )
            return task;
          return {
            ...task,
            description: taskLabel,
            frameLive: {
              ...task.frameLive,
              explicit: supervisor.explicit,
              armedVia: supervisor.armedVia,
            },
          };
        });
      }
    }
    if (existingTaskId !== null && opts.freshPublishWiring === true && !opts.signal.aborted)
      liftSweptPause(context.taskRegistry, slug);
    if (
      existingTaskId === null &&
      opts.autoReactWiring !== undefined &&
      opts.autoReactWiring.commentVerbsInSchema &&
      opts.requireEditor !== true &&
      opts.editorGatedWiring !== true
    ) {
      let pendingWiring = live.pendingInFlightWiring.get(slug);
      let isFreshPublish = opts.freshPublishWiring === true && !opts.signal.aborted;
      let generations =
        isFreshPublish || pendingWiring === undefined
          ? {
              scanGeneration: getLiveState().wakes.scanGeneration,
              stopGeneration: stopGeneration(slug),
            }
          : {
              scanGeneration: pendingWiring.scanGeneration,
              stopGeneration: pendingWiring.stopGeneration,
            };
      live.pendingInFlightWiring.set(slug, {
        wiring: mergeAutoReactWiring(pendingWiring?.wiring, opts.autoReactWiring, humanTurnWiring),
        freshPublishWiring: isFreshPublish || pendingWiring?.freshPublishWiring === true,
        ...generations,
      });
      live.inFlightWiredIntent.add(slug);
      if (isAutoReactActive())
        markSlugTravelling(slug, {
          storageV5: context.storageV5,
        });
      if (isFreshPublish && isCommentAutoreactOptedIn())
        live.bootingWiredArms.set(slug, {
          title: opts.autoReactWiring.title,
          freshPublish: true,
          ...generations,
        });
    }
    return {
      outcome: "already_watching",
      ...(existingTaskId !== null && {
        taskId: existingTaskId,
      }),
    };
  }
  let announceOpts = {
    url,
    announce: opts.announceArmlessEnd === true && !opts.machineArm,
    handoffGen: live.handoffGeneration,
    getTitle: () => live.supervisors.get(slug)?.autoReactWiring?.title ?? opts.autoReactWiring?.title,
  };
  let watchCount = frameLiveWatchRows(context).length + live.inFlightSubscribes.size;
  if (opts.machineArm && frameLiveWatchRows(context).length >= REFUSED_CAPACITY_HINT) {
    if (!hasWatchProtection(live, slug) || classifyWatchReason(live, context).length === 0) {
      logFeatureSad("artifact_live_subscribe", "watch_cap_reconnect");
      return {
        outcome: "skipped",
        reason: "watch_cap_reconnect",
      };
    }
  }
  if (opts.mcpWrite && watchCount >= REFUSED_CAPACITY_HINT) {
    logFeatureSad("artifact_live_subscribe", "watch_cap");
    return skipArm(live, slug, opts.machineArm, "watch_cap", announceOpts);
  }
  let forPublish = !opts.machineArm && opts.freshPublish === true;
  if (
    !opts.machineArm &&
    watchCount >= REFUSED_CAPACITY_HINT &&
    classifyWatchReason(live, context, {
      forPublish,
    }).length === 0
  ) {
    logFeatureSad("artifact_live_subscribe", "watch_cap");
    return skipArm(live, slug, opts.machineArm, "watch_cap", announceOpts);
  }
  let scanGeneration = getLiveState().wakes.scanGeneration;
  let stopGen = stopGeneration(slug);
  let lastActivityAt = opts.machineArm ? live.supervisors.get(slug)?.lastActivityAt : undefined;
  let handoffGeneration = live.handoffGeneration;
  setFrameLiveUserStopObserver(stopWatchFromTask);
  setAutoReactDeliberateStopObserver(forgetArtifactAndFlush);
  setAutoReactHumanTurnObserver((turnInfo) => releaseNoticeLatchesOnTurn(context.taskRegistry, turnInfo));
  live.inFlightSubscribes.add(slug);
  live.inFlightGenerations.set(slug, handoffGeneration);
  if (opts.autoReactWiring !== undefined) live.inFlightWiredIntent.add(slug);
  let latePark;
  let registrationCounted = false;
  try {
    if (
      opts.autoReactWiring?.commentVerbsInSchema === true &&
      opts.requireEditor !== true &&
      opts.machineArm !== true &&
      opts.userResumeWiring !== true &&
      isCommentAutoreactOptedIn()
    )
      live.bootingWiredArms.set(slug, {
        title: opts.autoReactWiring.title,
        freshPublish: opts.freshPublishWiring === true && !opts.signal.aborted,
        scanGeneration,
        stopGeneration: stopGen,
      });
    let wasRetired = () => live.handoffGeneration !== handoffGeneration || live.retiredInFlightArms.has(slug);
    let leasesEnabled = isFrameLiveTokenLeaseEnabled();
    if (!leasesEnabled) {
      let prevSupervisor = live.supervisors.get(slug);
      if (prevSupervisor !== undefined) {
        delete prevSupervisor.lease;
        delete prevSupervisor.renewable;
      }
    }
    let accountEpoch = getLiveState().accountEpoch;
    let lease = leasesEnabled && opts.machineArm === true ? live.supervisors.get(slug)?.lease : undefined;
    let cachedLease =
      lease !== undefined &&
      (lease.transport === "live" || canSync) &&
      isLiveTokenFresh(lease, live.rewatchTiming, accountEpoch)
        ? lease
        : undefined;
    if (cachedLease !== undefined && cachedLease.transport === "sync") {
      let diskAccount = await readFreshOauthAccountFromDisk(context.storageV5).catch(() => {
        return;
      });
      if (!sameOwnerAccount(parseCapTokenOwner(cachedLease.token), diskAccount)) cachedLease = undefined;
      if (signal.aborted || wasRetired())
        return skipArm(live, slug, opts.machineArm, "cancelled", announceOpts);
    }
    let subscription;
    let renewed = false;
    let requestStartAt = 0;
    if (cachedLease !== undefined)
      subscription = {
        err: null,
        token: cachedLease.token,
        transport: cachedLease.transport,
        ver: cachedLease.ver,
        editor: undefined,
        tokenExp: undefined,
        renewable: false,
      };
    else {
      let shouldRenew =
        leasesEnabled &&
        !canSync &&
        opts.machineArm === true &&
        live.supervisors.get(slug)?.renewable === true;
      try {
        let renewedSub;
        if (shouldRenew) {
          let renewal = await renewWatchToken(slug, signal, context.credentials);
          if (renewal.err === null) {
            renewedSub = renewal;
            renewed = true;
          } else {
            logFeatureSad("artifact_live_subscribe", `renew_miss_${renewal.status ?? "no_response"}`);
            let supervisor = live.supervisors.get(slug);
            if (supervisor !== undefined) delete supervisor.renewable;
            if (signal.aborted || wasRetired()) return skipArm(live, slug, true, "cancelled", announceOpts);
          }
        }
        requestStartAt = Date.now();
        subscription =
          renewedSub ??
          (await fetchLiveSubscription(slug, signal, context.credentials, {
            syncLive: canSync,
            ...(opts.machineArm === true && {
              lean: live.supervisors.get(slug)?.bootedVersion,
            }),
          }));
      } catch {
        return skipArm(
          live,
          slug,
          opts.machineArm,
          signal.aborted || wasRetired() ? "cancelled" : "boot_failed",
          announceOpts,
        );
      }
    }
    let receivedAtMs = Date.now();
    if (wasRetired()) return skipArm(live, slug, opts.machineArm, "cancelled", announceOpts);
    if (subscription.err !== null) {
      let failureReason = signal.aborted
        ? "cancelled"
        : subscription.status === 404
          ? "not_found"
          : isOtherOrg(subscription)
            ? "other_org"
            : subscription.publicOutsideOrg === true
              ? "public_outside_org"
              : "boot_failed";
      let unavailable =
        failureReason === "boot_failed" &&
        (subscription.unavailable === true ||
          (subscription.noAnswer === true &&
            Date.now() - requestStartAt >= live.rewatchTiming.stallThresholdMs));
      return skipArm(live, slug, opts.machineArm, failureReason, announceOpts, {
        unavailable,
        httpStatus: subscription.status,
      });
    }
    let missingEditor = opts.requireEditor === true && !subscription.editor;
    let notEditor =
      missingEditor ||
      (opts.editorGatedWiring === true && opts.autoReactWiring !== undefined && subscription.editor !== true);
    let notEditorReason = missingEditor ? "restored_consent_not_editor" : "watch_not_editor";
    if (subscription.editor === true) live.nonEditorSlugs.delete(slug);
    if (notEditor) {
      live.inFlightWiredIntent.delete(slug);
      live.bootingWiredArms.delete(slug);
      if (!missingEditor && getLiveState().accountEpoch === accountEpoch) live.nonEditorSlugs.add(slug);
    }
    let title = subscription.title === undefined ? null : sanitizeArtifactTitle(subscription.title);
    let wiring =
      notEditor || opts.autoReactWiring === undefined
        ? undefined
        : title === null
          ? opts.autoReactWiring
          : {
              ...opts.autoReactWiring,
              title,
            };
    let onOpen = notEditor ? undefined : opts.onOpen;
    let onGiveUp = notEditor ? undefined : opts.onGiveUp;
    let transport = subscription.transport;
    if (
      transport === "sync" &&
      (!canArmFrameLive(slug) || subscription.token === undefined || !isAgentCapToken(subscription.token))
    ) {
      logFeatureSad("artifact_live_subscribe", "sync_unavailable");
      return skipArm(live, slug, opts.machineArm, "sync_unavailable", announceOpts, {
        unavailable: true,
      });
    }
    let token = subscription.token;
    if (!token) {
      logFeatureSad("artifact_live_subscribe", notEditor ? notEditorReason : "no_subscription_token");
      return skipArm(
        live,
        slug,
        opts.machineArm,
        missingEditor ? "not_editor" : "no_subscription_token",
        announceOpts,
      );
    }
    if (notEditor) logFeatureSad("artifact_live_subscribe", notEditorReason);
    let ver = subscription.ver;
    let getKnownVer_2 = seedKnownVerFromBoot ? () => getKnownVer() ?? ver : getKnownVer;
    let tokenState =
      cachedLease ??
      (leasesEnabled
        ? createLiveTokenState({
            transport,
            token,
            ver,
            accountEpoch,
            expUnixSeconds: transport === "sync" ? getCapTokenSeq(token) : subscription.tokenExp,
            receivedAtMs,
          })
        : undefined);
    if (signal.aborted || wasRetired())
      return skipArm(live, slug, opts.machineArm, "cancelled", announceOpts);
    let slotCount = frameLiveWatchRows(context).length + live.inFlightSubscribes.size - 1;
    let priorSupervisor = live.supervisors.get(slug);
    let hadActivitySince =
      opts.machineArm === true &&
      lastActivityAt !== undefined &&
      priorSupervisor !== undefined &&
      !priorSupervisor.stopped &&
      priorSupervisor.lastActivityAt > lastActivityAt;
    let pendingCount = frameLiveWatchRows(context).length + live.pendingRegistrations;
    if (opts.machineArm && !hadActivitySince && slotCount >= REFUSED_CAPACITY_HINT) {
      if (pendingCount >= REFUSED_CAPACITY_HINT) {
        if (!hasWatchProtection(live, slug) || !evictForProtectedReconnect(live, context)) {
          logFeatureSad("artifact_live_subscribe", "watch_cap_reconnect");
          return {
            outcome: "skipped",
            reason: "watch_cap_reconnect",
          };
        }
      }
    } else if (opts.mcpWrite && slotCount >= REFUSED_CAPACITY_HINT) {
      logFeatureSad("artifact_live_subscribe", "watch_cap");
      return skipArm(live, slug, opts.machineArm, "watch_cap", announceOpts);
    } else if (slotCount >= REFUSED_CAPACITY_HINT) {
      let shortBy = slotCount - REFUSED_CAPACITY_HINT + 1;
      let evictable = classifyWatchReason(live, context, {
        forPublish,
      });
      if (evictable.length < shortBy) {
        if (opts.machineArm) {
          logFeatureSad("artifact_live_subscribe", "watch_cap_reconnect");
          return {
            outcome: "skipped",
            reason: "watch_cap_reconnect",
          };
        }
        logFeatureSad("artifact_live_subscribe", "watch_cap");
        return skipArm(live, slug, opts.machineArm, "watch_cap", announceOpts);
      }
      if (pendingCount >= REFUSED_CAPACITY_HINT)
        evictWatch(
          live,
          evictable[0],
          context,
          opts.machineArm
            ? {
                why: `this session reached its limit of ${REFUSED_CAPACITY_HINT} artifact watches and made room for an already-held watch to reconnect`,
                shortReason: MADE_ROOM_PHRASE,
              }
            : undefined,
        );
    }
    live.pendingRegistrations++;
    registrationCounted = true;
    let prev = live.supervisors.get(slug);
    let explicit_2 = prev !== undefined && !prev.stopped && prev.explicit;
    let isExplicit = explicit || explicit_2;
    let wasWatching = prev !== undefined && !prev.stopped;
    let taskId = wasWatching ? prev.taskId : undefined;
    let isNewSupervisor = prev === undefined;
    let explicitUpgrade = explicit && prev !== undefined && !prev.explicit;
    let keepMcpWiring =
      !opts.machineArm &&
      prev !== undefined &&
      prev.armedVia === "mcp_write" &&
      armedVia !== "publish" &&
      armedVia !== "mcp_write";
    let autoReactWiring_2 = keepMcpWiring ? prev.autoReactWiring : undefined;
    let wiringOk = wiring !== undefined && !isHumanTurnWiringStale(live, slug, autoReactWiring);
    let keepHumanTurn =
      opts.userResumeWiring === true &&
      wiringOk &&
      wasWatching &&
      prev.autoReactWiring?.humanTurnSnapshot === true;
    let carriedVer_2 = live.supervisors.get(slug)?.carriedVer;
    let carriedVersion =
      carriedVer_2 !== undefined && carriedVer_2 !== carriedVer ? carriedVer_2 : seedSurfacedVer;
    let supervisor = upsertSupervisor(live, {
      slug,
      url,
      getKnownVer,
      ownPublishes,
      context,
      explicit,
      machineArm: opts.machineArm,
      armedVia,
      carriedVer: carriedVersion ?? subscription.ver,
      ...(wiringOk && {
        autoReactWiring: wiring,
      }),
      humanTurnWiring: humanTurnWiring && !keepHumanTurn,
    });
    if (cachedLease === undefined && supervisor.armedVia !== "mcp_write") recordHeardVersion(slug, ver);
    if (cachedLease === undefined && !renewed) supervisor.bootedVersion = ver;
    let autoReactWiring_3 = supervisor.autoReactWiring;
    if (tokenState !== undefined && tokenState.accountEpoch === getLiveState().accountEpoch) {
      supervisor.lease = tokenState;
      if (cachedLease === undefined && subscription.renewable) supervisor.renewable = true;
      else if (cachedLease === undefined) delete supervisor.renewable;
    } else {
      delete supervisor.lease;
      delete supervisor.renewable;
    }
    let lastActivityAt_2 = supervisor.lastActivityAt;
    if (onOpen !== undefined && onGiveUp !== undefined)
      supervisor.resumeAnnounce = {
        onOpen,
        onGiveUp,
        wired: wiring !== undefined,
      };
    let armedVia_2 =
      armedVia === "resume" && supervisor.armedVia !== "watch" && supervisor.armedVia !== "resume"
        ? supervisor.armedVia
        : undefined;
    if (armedVia_2 !== undefined) supervisor.armedVia = "resume";
    supervisor.transport = transport;
    let wasOpen = false;
    let sessionId = getSessionId();
    let sharedCheckStarted = false;
    let activitySender;
    let activitySink;
    let expiryAnnounced = false;
    let stalledBeforeOpen;
    let abort = new AbortController();
    let pendingWiring = notEditor ? undefined : live.pendingInFlightWiring.get(slug);
    if (!notEditor) live.pendingInFlightWiring.delete(slug);
    let activeWiring = wiring ?? pendingWiring?.wiring;
    let wiringReplaced =
      pendingWiring?.wiring.humanTurnSnapshot === true &&
      (autoReactWiring?.humanTurnSnapshot !== true ||
        pendingWiring.wiring.context !== autoReactWiring.context);
    if (
      pendingWiring !== undefined &&
      (wiring === undefined || wiringReplaced) &&
      pendingWiring.stopGeneration === stopGeneration(slug)
    ) {
      let prev = live.supervisors.get(slug);
      if (prev !== undefined && !prev.stopped)
        prev.autoReactWiring = mergeAutoReactWiring(
          prev.autoReactWiring,
          {
            ...pendingWiring.wiring,
            title: pendingWiring.wiring.title ?? prev.autoReactWiring?.title,
          },
          pendingWiring.wiring.humanTurnSnapshot === true,
        );
    }
    let isFreshPublish = opts.freshPublishWiring === true || pendingWiring?.freshPublishWiring === true;
    if (pendingWiring?.freshPublishWiring === true) {
      scanGeneration = pendingWiring.scanGeneration;
      stopGen = pendingWiring.stopGeneration;
    }
    let isUserResume = opts.userResumeWiring === true;
    let wiringActive = humanTurnWiring || activeWiring?.humanTurnSnapshot === true;
    let getTitle = () => live.supervisors.get(slug)?.autoReactWiring?.title ?? activeWiring?.title;
    let autoReact =
      activeWiring === undefined || !activeWiring.commentVerbsInSchema
        ? undefined
        : {
            env: claudeAiEnvironment(),
            tool: activeWiring.tool,
            context: activeWiring.context,
            ...(activeWiring.publishTranscript !== undefined && {
              publishTranscript: activeWiring.publishTranscript,
            }),
            getWiring: () => {
              let autoReactWiring = live.supervisors.get(slug)?.autoReactWiring;
              return autoReactWiring?.humanTurnSnapshot === true || !wiringActive
                ? autoReactWiring
                : undefined;
            },
            abort,
            getTitle,
            onReadRefused: () => {
              describeSubscribeFailure(live, slug);
            },
            notify: (notice) => {
              if ("coalesce" in notice) {
                enqueueArtifactChanged({
                  queue: liveNotificationEnqueuer,
                  slug,
                  family: notice.coalesce.family,
                  artifactName: notice.coalesce.artifactName,
                  threadId: notice.coalesce.threadId,
                  detail: notice.detail,
                  mergeDetails: "append",
                  ownGesture: notice.ownGesture === true,
                });
                return;
              }
              enqueuePendingNotification({
                value: formatTaskNotification({
                  taskType: "artifact-auto-react",
                  summary: escapeXml(notice.summary),
                  body: `
${escapeXml(notice.detail)}`,
                }),
                mode: "task-notification",
                origin: {
                  kind: "task-notification",
                  source: "artifact-auto-react",
                  slug,
                  displayName: quoteArtifactName(getTitle, url),
                },
                uuid: newLaneNoticeId(notice.handOff, notice.ownGesture === true ? slug : undefined),
                ...(notice.handOff !== undefined && {
                  artifactCommentTurn: "handoff",
                }),
                agentId: mainAgentId(),
              });
            },
          };
    supervisor.surfacedVers ??= [];
    let wake = supervisor.wake;
    let liveEventHandlers = createLiveEventHandlers({
      slug,
      url,
      ownPublishes,
      presenceOnly: () => live.supervisors.get(slug)?.armedVia === "mcp_write",
      getKnownVer: getKnownVer_2,
      surfacedVers: supervisor.surfacedVers,
      ...(carriedVersion !== undefined && {
        seedSurfacedVer: carriedVersion,
      }),
      onSurfaced: (carriedVer) => {
        let supervisor = live.supervisors.get(slug);
        if (supervisor && !supervisor.stopped) {
          supervisor.carriedVer = carriedVer;
          supervisor.lastActivityAt = Date.now();
        }
      },
      autoReact,
    });
    supervisor.wake = liveEventHandlers;
    let openedAt = 0;
    let summonSeed;
    let reusableLease = cachedLease?.opened === true ? cachedLease : undefined;
    try {
      let monitorRun = await runWebSocketMonitor(
        {
          ws:
            transport === "sync"
              ? {
                  url: getSyncSocketUrl(slug, {
                    commentHint: autoReact !== undefined && isAutoreactArmed() && !isSlugStopped(slug),
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
          description: liveUpdatesTaskLabel(url, isExplicit, supervisor.armedVia),
          timeout_ms: 0,
          persistent: true,
          quietLifecycle: true,
          ...(taskId !== undefined && {
            reuseTaskId: taskId,
          }),
          ambient: true,
          handshakeDeadlineMs: live.rewatchTiming.handshakeDeadlineMs,
          autoReactArmed: autoReact !== undefined,
          autoReactSlug: autoReact !== undefined ? slug : undefined,
          frameLive: {
            slug,
            explicit: isExplicit,
            watchedSince: supervisor.watchedSince,
            armedVia: supervisor.armedVia,
          },
          transform:
            transport === "sync"
              ? handleFrameLiveControl(liveEventHandlers, slug, {
                  onTokenRefresh: (freshToken, expUnixSeconds) => {
                    if (
                      tokenState !== undefined &&
                      sameOwnerAccount(parseCapTokenOwner(tokenState.token), parseCapTokenOwner(freshToken))
                    )
                      refreshLiveTokenState(tokenState, {
                        token: freshToken,
                        expUnixSeconds,
                        receivedAtMs: Date.now(),
                      });
                  },
                  onExpiryAnnounced: () => {
                    expiryAnnounced = true;
                  },
                  onCommentHint: (commentsEmpty, readAt) => {
                    let wakeSnapshot = summonSeed;
                    summonSeed = undefined;
                    let seedSkipped =
                      commentsEmpty &&
                      wakeSnapshot !== undefined &&
                      settleEmptyArtifact(slug, wakeSnapshot, readAt);
                    logFeatureOk("artifact_live_subscribe", {
                      comment_hint: true,
                      comments_empty: commentsEmpty,
                      seed_parked: wakeSnapshot !== undefined,
                      seed_skipped: seedSkipped,
                      sync_transport: true,
                    });
                  },
                })
              : makeLiveVersionLineHandler(liveEventHandlers),
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
          onSender: (sender) => {
            if (transport === "sync") {
              activitySink = (busyS) => sender(activityFrame(slug, busyS));
              addAgentActivitySink(live, `watch:${slug}`, activitySink);
              return;
            }
            activitySender = sender;
            addActivitySender(live, slug, sender);
          },
          onSenderClosed: () => {
            if (activitySink !== undefined) removeAgentActivitySink(live, `watch:${slug}`, activitySink);
            if (activitySender !== undefined) removeActivitySender(live, slug, activitySender);
          },
          onLifecycle: (phase, closeCode, upgradeInfo) => {
            if (phase === "open") {
              wasOpen = true;
              supervisor.lastFailure = undefined;
              stalledBeforeOpen = {
                stalledSince: supervisor.stalledSince,
                lastStalledAt: supervisor.lastStalledAt,
                stallOutAfterMs: supervisor.stallOutAfterMs,
              };
              supervisor.stalledSince = undefined;
              supervisor.lastStalledAt = undefined;
              supervisor.stallOutAfterMs = undefined;
              let wasSpread = supervisor.spreadReconnect === true;
              supervisor.spreadReconnect = undefined;
              openedAt = Date.now();
              if (tokenState !== undefined) tokenState.opened = true;
              if (
                approvedRelatchGen !== undefined &&
                signal.aborted &&
                stopLatches.isStopped(slug) &&
                supervisor.taskId !== undefined
              ) {
                stopMonitorWsTasks(supervisor.taskId, context.taskRegistry, {
                  quiet: true,
                });
                removeSupervisor(live, slug);
                logFeatureSad("artifact_live_subscribe", "stop_latched");
                return;
              }
              let liveSupervisor = live.supervisors.get(slug);
              if (liveSupervisor !== undefined && !liveSupervisor.stopped)
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
                ...(isExplicit && {
                  explicit: true,
                }),
                ...(cachedLease !== undefined && {
                  token_reused: true,
                  lease_remaining_min: Math.max(0, Math.floor((cachedLease.expMs - openedAt) / 60000)),
                }),
                ...(renewed && {
                  token_renewed: true,
                }),
              });
              let scanAdvanced =
                autoReact !== undefined && getLiveState().wakes.scanGeneration !== scanGeneration;
              let stopAdvanced = stopGeneration(slug) !== stopGen;
              let { wakes } = getLiveState();
              let wakesLifted =
                wakes.liftedAtScanGeneration.get(slug) === wakes.scanGeneration ||
                wakes.humanTurnAtScanGeneration === wakes.scanGeneration;
              if (scanAdvanced && !wakesLifted && !isSlugStopped(slug) && isAutoreactArmed()) {
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
              if (autoReact !== undefined)
                getSummonWakeState(slug).lastWakeArgs = {
                  slug,
                  url,
                  ...autoReact,
                };
              let stopLatchedNow = isUserResume && isStopLatched();
              if (
                isUserResume &&
                autoReact !== undefined &&
                !signal.aborted &&
                !stopLatchedNow &&
                isAutoReactActive()
              ) {
                let autoReactWiring = live.supervisors.get(slug)?.autoReactWiring;
                armMonitorIntent(slug, {
                  title: autoReactWiring?.title,
                  storageV5: autoReactWiring?.context.storageV5,
                });
              }
              if (autoReact !== undefined && signal.aborted);
              else if (autoReact !== undefined)
                if (
                  !isUserResume &&
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
                    ...autoReact,
                    seed: false,
                  });
                } else if (
                  isSlugStopped(slug) &&
                  (scanAdvanced || stopAdvanced || stopLatchedNow || !(isFreshPublish || isUserResume))
                );
                else if (isSlugStopped(slug)) {
                  let wasSwept = isSlugSwept(slug);
                  let wasYielded = isSlugYielded(slug);
                  if (isAutoreactArmed() && (isUserResume || !wasSwept || wasYielded)) {
                    markAutoReactNoticePending(slug);
                    recordUnaccountedComments(slug);
                    autoReact.notify({
                      summary: (isUserResume ? autoRepliesResumedNotice : autoRepliesReenabledNotice)(
                        quoteArtifactName(autoReact.getTitle, url),
                      ),
                      detail: `Auto-replies on artifact ${url} were ${isUserResume ? "resumed by a resume_replies request" : "re-enabled by this publish"} \u2014 they had been ${wasYielded ? "handed to another session of this conversation that resumed it or published there" : wasSwept ? "paused when the user interrupted the session (Ctrl+C or Stop) and the watch had since dropped" : "stopped when their live-updates task was killed"}. ${wasSwept && !wasYielded ? PAUSE_AUTO_REPLIES_HINT : UNINTENDED_RESUME_HINT}`,
                    });
                  }
                  if (!wasSwept || wasYielded) resetAutoReactForSlug(slug);
                  forgetYieldedSlug(slug);
                  forgetDeliveredSlug(slug);
                  resumeSummonWakes(slug);
                  emitSummonArm(live, slug);
                  scheduleThreadScan({
                    slug,
                    url,
                    ...autoReact,
                    seed: true,
                  });
                } else {
                  if (wakes.pendingResumeDisclosure.delete(slug)) {
                    markAutoReactNoticePending(slug);
                    recordUnaccountedComments(slug);
                    autoReact.notify({
                      summary: autoRepliesResumedNotice(quoteArtifactName(autoReact.getTitle, url)),
                      detail: `Auto-replies on artifact ${url} were resumed by a resume_replies request \u2014 they had been paused when the user interrupted the session (Ctrl+C or Stop); the watch has now connected. ${PAUSE_AUTO_REPLIES_HINT}`,
                    });
                  }
                  scheduleThreadScan({
                    slug,
                    url,
                    ...autoReact,
                    seed: true,
                    ...(opts.pickUpRecentSummons === true &&
                      opts.machineArm !== true && {
                        pickUpRecentSummons: true,
                      }),
                    ...(opts.machineArm === true &&
                      wasSpread &&
                      isFrameLiveTokenLeaseEnabled() && {
                        deferMs: seedJitter(live.rewatchTiming),
                      }),
                  });
                  if (transport === "sync") {
                    let summonWakeState = getSummonWakeState(slug);
                    summonSeed = {
                      kickCount: summonWakeState.kickCount,
                      cancelGeneration: summonWakeState.cancelGeneration,
                    };
                  }
                }
              let resumedSupervisor = live.supervisors.get(slug);
              let resumeAnnounce = resumedSupervisor?.resumeAnnounce;
              if (resumedSupervisor !== undefined && resumeAnnounce !== undefined) {
                resumedSupervisor.resumeAnnounce = undefined;
                let { autoReact: autoReact_2 } = getLiveState();
                let resumeAllowed =
                  autoReact !== undefined &&
                  !isSlugStoppedAnywhere(slug) &&
                  !autoReact_2.userDisarmed &&
                  autoReact_2.enabledMemo === true;
                if (
                  !signal.aborted &&
                  !resumedSupervisor.stopped &&
                  !stopLatches.isStopped(slug) &&
                  (resumeAllowed || (!resumeAnnounce.wired && autoReact === undefined))
                )
                  resumeAnnounce.onOpen();
              }
              if (
                autoReact !== undefined &&
                (isFreshPublish || isUserResume || explicit) &&
                !sharedCheckStarted &&
                !signal.aborted &&
                !stopLatches.isStopped(slug) &&
                !isSlugStoppedAnywhere(slug) &&
                !getLiveState().autoReact.userDisarmed &&
                getLiveState().autoReact.wakeEnabledMemo === true
              ) {
                sharedCheckStarted = true;
                let yieldClaim = startYieldClaim([slug], Date.now());
                (async () => {
                  let sessionRecords =
                    await import("../../utils/udsMessaging/SessionRecordsUnreadableError.lazy.js");
                  let processHelpers = await import("../../utils/captureProcessStartTimeAsync.lazy.js");
                  let liveReplyHolder = await findLiveReplyHolder({
                    records: await sessionRecords.listRegisteredSessionRecords(),
                    sessionId,
                    selfPid: process.pid,
                    isRunning: processHelpers.isProcessRunning,
                    isSameProcess: processHelpers.provenSameProcessAsync,
                  });
                  if (liveReplyHolder.verdict !== "live") {
                    yieldClaim.end();
                    return;
                  }
                  let { requestReplyTakeover } = await import("./replyYieldHolder.js");
                  let handedToUs = (
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
                  let handedAway = !handedToUs && yieldClaim.lost.has(slug);
                  let displayName = quoteArtifactName(() => getTitle(), url);
                  enqueuePendingNotification({
                    value: formatTaskNotification({
                      taskType: ARTIFACT_WATCH_LIFECYCLE,
                      summary: escapeXml(
                        handedToUs
                          ? `Another session of this conversation handed its replies on ${displayName} to this one`
                          : handedAway
                            ? `This session handed its replies on ${displayName} to another session of this conversation`
                            : `Another session of this conversation is open while replies are armed on ${displayName}`,
                      ),
                      body: `
<event>${escapeXml(handedToUs ? `Another live session of this same conversation was also armed to reply to comments on ${url}; it paused its replies at this session's request, so only this session answers them now. Nothing to do; do not stop a watch on your own.` : handedAway ? `Another live session of this same conversation claimed the replies to comments on ${url} a moment after this one; this session paused its own at that session's request, so only that session answers them now. Nothing to do \u2014 a publish the user asks for here takes them back; do not republish or stop a watch on your own.` : `Another live session of this same conversation is running. If it is also replying to comments on ${url}, every comment will get a reply from both sessions until one stops. Tell the user; they can end either session's live-updates task in /tasks. Do not stop a watch on your own.`)}</event>`,
                    }),
                    mode: "task-notification",
                    passive: true,
                    priority: "next",
                    origin: {
                      kind: "task-notification",
                      source: ARTIFACT_WATCH_LIFECYCLE,
                      slug,
                      displayName,
                    },
                    agentId: mainAgentId(),
                  });
                })().catch(() => {
                  yieldClaim.end();
                });
              }
              return;
            }
            let uptimeMs = wasOpen ? Date.now() - openedAt : 0;
            let shed = !wasOpen && isRetryableUpgradeRejection(closeCode);
            let leaseExpired =
              transport === "sync"
                ? closeCode === ROUTE_ABSENT_4503 &&
                  (expiryAnnounced ||
                    (tokenState !== undefined &&
                      Date.now() >= tokenState.expMs - AUTO_REPLY_RESUMED_WINDOW_MS))
                : closeCode === ROUTE_ABSENT_4001;
            let resumeRefused =
              transport === "sync" &&
              ((wasOpen && closeCode === ROUTE_ABSENT_4503 && !leaseExpired) ||
                (!wasOpen && parseUpgradeRejection(closeCode)?.status === 404));
            let stalled =
              resumeRefused ||
              (!wasOpen && (shed || isHandshakeStall(closeCode, upgradeInfo, live.rewatchTiming)));
            let reuseRefused = wasOpen || stalled ? undefined : reusableLease;
            let exitSupervisor = live.supervisors.get(slug);
            if (
              resumeRefused &&
              wasOpen &&
              uptimeMs < live.rewatchTiming.minUptimeMs &&
              exitSupervisor !== undefined &&
              exitSupervisor.stalledSince === undefined &&
              stalledBeforeOpen?.stalledSince !== undefined
            ) {
              exitSupervisor.stalledSince = stalledBeforeOpen.stalledSince;
              exitSupervisor.lastStalledAt = stalledBeforeOpen.lastStalledAt;
              exitSupervisor.stallOutAfterMs = stalledBeforeOpen.stallOutAfterMs;
            }
            if (
              exitSupervisor !== undefined &&
              transport === "sync" &&
              closeCode === ROUTE_ABSENT_4403 &&
              tokenState !== undefined &&
              exitSupervisor.lease === tokenState
            )
              delete exitSupervisor.lease;
            if (
              tokenState !== undefined &&
              exitSupervisor?.lease === tokenState &&
              (!isFrameLiveTokenLeaseEnabled() ||
                (!shed &&
                  !resumeRefused &&
                  !shouldRetryDial(tokenState, {
                    expired: leaseExpired,
                    refused: reuseRefused !== undefined,
                    healthy: wasOpen && uptimeMs >= live.rewatchTiming.minUptimeMs,
                  })))
            ) {
              delete exitSupervisor.lease;
              if (!tokenState.opened) delete exitSupervisor.renewable;
            }
            if (wasOpen)
              logFeatureSad("artifact_live_subscribe", `socket_closed_${closeCode ?? "unknown"}`, {
                chain_spared: getLiveState().autoReact.artifacts.get(slug)?.scanning === true,
              });
            else if (reuseRefused !== undefined)
              logFeatureSad("artifact_live_subscribe", "reuse_connect_failed");
            else {
              let upgradeRejection = parseUpgradeRejection(closeCode);
              let failFacts = {
                ...(stalled && {
                  stalled: true,
                }),
                ...(shed && {
                  shed: true,
                }),
                ...(upgradeRejection !== null && {
                  http_status: upgradeRejection.status,
                  cf_mitigated: upgradeRejection.cfMitigated,
                }),
              };
              if (Object.keys(failFacts).length > 0)
                logFeatureBad("artifact_live_subscribe", "connect_failed", failFacts);
              else logFeatureBad("artifact_live_subscribe", "connect_failed");
            }
            if (exitSupervisor !== undefined && !exitSupervisor.stopped)
              exitSupervisor.lastFailure =
                uptimeMs < live.rewatchTiming.minUptimeMs ? (closeCode ?? "unknown") : undefined;
            describeResumedWatchFailure(live, slug, {
              uptimeMs: resumeRefused ? 0 : uptimeMs,
              ...(closeCode !== undefined && {
                closeCode,
              }),
              resumeNeverOpened: isUserResume && !wasOpen,
              reuseRefused: reuseRefused !== undefined,
              stalled,
              expired: leaseExpired,
            });
          },
        },
        context,
      );
      getTaskAssignmentSummary(live, supervisor, slug, monitorRun.data.taskId);
      if (registrationCounted) {
        live.pendingRegistrations--;
        registrationCounted = false;
      }
      let armedSupervisor = live.supervisors.get(slug);
      if (armedSupervisor === undefined || armedSupervisor !== supervisor) {
        stopMonitorWsTasks(monitorRun.data.taskId, context.taskRegistry, {
          quiet: true,
        });
        describeSkippedResume(live, slug, opts.machineArm);
        return {
          outcome: "skipped",
          reason: "cancelled",
        };
      }
      if (wasRetired()) {
        stopMonitorWsTasks(monitorRun.data.taskId, context.taskRegistry, {
          quiet: true,
        });
        removeSupervisor(live, slug);
        return {
          outcome: "skipped",
          reason: "cancelled",
        };
      }
      if (isStopLatched()) {
        stopMonitorWsTasks(monitorRun.data.taskId, context.taskRegistry, {
          quiet: true,
        });
        logFeatureSad("artifact_live_subscribe", "stop_latched");
        live.armOutcomes.delete(slug);
        forgetArmOutcomeAndNotices(live, slug);
        if (wasWatching || supervisor.lastActivityAt !== lastActivityAt_2) endStoppedWatch(live, supervisor);
        else removeSupervisor(live, slug);
        return {
          outcome: "skipped",
          reason: "stop_latched",
        };
      }
      let aborted = isUserResume && signal.aborted;
      if (aborted && approvedRelatchGen !== undefined && stopLatches.isStopped(slug)) {
        stopMonitorWsTasks(monitorRun.data.taskId, context.taskRegistry, {
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
      if (
        isUserResume &&
        (getLiveState().wakes.scanGeneration !== scanGeneration || stopGeneration(slug) !== stopGen)
      )
        return {
          outcome: "skipped",
          reason: "stopped_again",
        };
      if (keepHumanTurn && wiring !== undefined) {
        let mergedSupervisor = live.supervisors.get(slug);
        if (
          mergedSupervisor === supervisor &&
          !mergedSupervisor.stopped &&
          !isHumanTurnWiringStale(live, slug, autoReactWiring_3)
        )
          mergedSupervisor.autoReactWiring = mergeAutoReactWiring(
            mergedSupervisor.autoReactWiring,
            {
              ...wiring,
              title: mergedSupervisor.autoReactWiring?.title ?? wiring.title,
            },
            true,
          );
      }
      let pendingWiring = notEditor ? undefined : live.pendingInFlightWiring.get(slug);
      let stoppedNow = isSlugStopped(slug);
      let staleWakes =
        stoppedNow || (autoReact !== undefined && getLiveState().wakes.scanGeneration !== scanGeneration);
      let wiringStillFresh =
        pendingWiring !== undefined &&
        pendingWiring.freshPublishWiring &&
        pendingWiring.scanGeneration === getLiveState().wakes.scanGeneration &&
        pendingWiring.stopGeneration === stopGeneration(slug);
      if (
        pendingWiring === undefined ||
        signal.aborted ||
        !(autoReact === undefined
          ? !stoppedNow || wiringStillFresh
          : !isUserResume && staleWakes && wiringStillFresh)
      )
        return {
          outcome: "armed",
          taskId: monitorRun.data.taskId,
          ...(notEditor && {
            degraded: "not_editor",
          }),
        };
      live.pendingInFlightWiring.delete(slug);
      latePark = pendingWiring;
      stopMonitorWsTasks(monitorRun.data.taskId, context.taskRegistry, {
        quiet: true,
      });
    } catch {
      let failedSupervisor = live.supervisors.get(slug);
      if (
        isNewSupervisor &&
        failedSupervisor === supervisor &&
        !(failedSupervisor !== undefined && failedSupervisor.explicit && !explicit)
      )
        removeSupervisor(live, slug);
      else if (explicitUpgrade && failedSupervisor !== undefined && failedSupervisor === prev)
        failedSupervisor.explicit = false;
      if (
        armedVia_2 !== undefined &&
        failedSupervisor === supervisor &&
        failedSupervisor.armedVia === "resume"
      )
        failedSupervisor.armedVia = armedVia_2;
      else if (
        keepMcpWiring &&
        failedSupervisor === supervisor &&
        failedSupervisor.armedVia === armedVia &&
        !failedSupervisor.explicit
      ) {
        failedSupervisor.armedVia = "mcp_write";
        if (autoReactWiring_2 === undefined) delete failedSupervisor.autoReactWiring;
        else failedSupervisor.autoReactWiring = autoReactWiring_2;
        emitSummonArm(live, slug);
      }
      if (
        failedSupervisor !== undefined &&
        failedSupervisor === supervisor &&
        failedSupervisor.wake === liveEventHandlers
      )
        if (wake === undefined) delete failedSupervisor.wake;
        else failedSupervisor.wake = wake;
      if (failedSupervisor !== undefined && onOpen !== undefined) failedSupervisor.resumeAnnounce = undefined;
      if (
        tokenState !== undefined &&
        failedSupervisor?.lease === tokenState &&
        !shouldRetryDial(tokenState, {
          expired: false,
          refused: false,
          healthy: false,
        })
      ) {
        delete failedSupervisor.lease;
        if (!tokenState.opened) delete failedSupervisor.renewable;
      }
      logFeatureBad(
        "artifact_live_subscribe",
        cachedLease !== undefined ? "reuse_ws_open_error" : "ws_open_error",
      );
      return skipArm(live, slug, opts.machineArm, "ws_open_error", announceOpts);
    }
  } finally {
    live.inFlightSubscribes.delete(slug);
    live.inFlightWiredIntent.delete(slug);
    live.retiredInFlightArms.delete(slug);
    live.inFlightGenerations.delete(slug);
    live.bootingWiredArms.delete(slug);
    let supervisor = live.supervisors.get(slug);
    if (supervisor === undefined || supervisor.stopped) liveDocHeadSink(slug)?.sourceEnded();
    let waiters = live.armSettleWaiters.get(slug) ?? [];
    live.armSettleWaiters.delete(slug);
    for (let resolve of waiters)
      try {
        resolve();
      } catch (error) {
        logError(error);
      }
    live.pendingInFlightWiring.delete(slug);
    if (registrationCounted) {
      live.pendingRegistrations--;
      registrationCounted = false;
    }
  }
  if (latePark === undefined) throw Error("armLiveSubscription: late-park fall-through lost its park");
  return FrameLiveWatchManager(live, {
    ...opts,
    machineArm: undefined,
    userResumeWiring: undefined,
    approvedRelatchGen: undefined,
    sessionResume: undefined,
    pickUpRecentSummons: undefined,
    editorGatedWiring: undefined,
    autoReactWiring: latePark.wiring,
    freshPublishWiring: latePark.freshPublishWiring,
    freshPublish: opts.freshPublish === true || latePark.freshPublishWiring,
  });
}
//@ chunk-aqdf5t3e.js:86204-86285 placement
function recordArmFailureLive(state, slug, outcome, reason) {
  setWithLimit(
    state.armOutcomes,
    slug,
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
function recordArmFailure(state, slug, outcome, reason, extra) {
  if (outcome || state.handoffGeneration !== extra.handoffGen || state.retiredInFlightArms.has(slug)) return;
  let supervisor = state.supervisors.get(slug);
  if (supervisor !== undefined && !supervisor.stopped && supervisor.timer !== undefined) {
    if (reason !== "cancelled") supervisor.lastFailure = reason;
    return;
  }
  if (state.armOutcomes.has(slug)) return;
  let stopped = getLiveState().durable.stopLatches.isStopped(slug);
  if (!stopped) recordArmFailureLive(state, slug, "failed", reason);
  if (extra.announce && reason !== "cancelled" && !stopped) announceArmFailure(state, slug, extra, reason);
}
//@ chunk-aqdf5t3e.js:87895-87949 placement
function forgetArmOutcomeAndNotices(state, slug) {
  removeCronOwnedKeys(state.announcedArmFailures, slug);
  pullStaleWatchLifecycleNotices(slug);
}
//@ chunk-aqdf5t3e.js:87949-88105 placement
function pullStaleWatchLifecycleNotices(slug) {
  removeQueuedByFilter(
    (reason) =>
      reason.origin?.kind === "task-notification" &&
      reason.origin.source === ARTIFACT_WATCH_LIFECYCLE &&
      reason.origin.slug === slug &&
      (reason.origin.armFailed === true || reason.origin.watchEnded === true),
  );
}
//@ chunk-aqdf5t3e.js:88105-88580 placement
/**
 * 实时订阅布防失败时向模型发一次通知（同一 slug 与原因只发一次），说明原因与不会再追踪新版本。
 */
function announceArmFailure(state, slug, outcome, reason) {
  if (!addWithLimit(state.announcedArmFailures, `${slug}:${reason}`, MAX_CRON_OWNERSHIP_KEYS)) return;
  let phrase = frameLiveSkipReasonPhrase(reason) ?? reason;
  let detail =
    noRewatchAdvice(reason) ??
    (getLiveState().builtInArtifactHiddenForMcp ? undefined : MISSED_WATCH_RELAUNCH_ADVICE);
  enqueueWatchLifecycleNotice({
    slug,
    artifactName: quoteArtifactName(outcome.getTitle, outcome.url),
    shortReason: SKIP_REASON_PHRASES[reason] ?? "not armed",
    event: `The live subscription for ${outcome.url} did not arm \u2014 ${phrase}. This session is NOT watching it and does not keep track of new versions of it; ${detail === undefined ? "do not claim to be watching it" : `${detail}, and do not claim to be watching it meanwhile`}.`,
  });
}
//@ chunk-aqdf5t3e.js:88580-88886 placement
/**
 * 把 artifact 监听生命周期事件作为任务通知排进下一条消息（可被动），附带 slug 与名称。
 */
function enqueueWatchLifecycleNotice(notice) {
  enqueuePendingNotification({
    value: formatTaskNotification({
      taskType: ARTIFACT_WATCH_LIFECYCLE,
      summary: escapeXml(notWatchingNotice(notice.artifactName, notice.shortReason)),
      body: `
<event>${escapeXml(notice.event)}</event>`,
    }),
    mode: "task-notification",
    priority: "next",
    ...(notice.passive && {
      passive: true,
    }),
    origin: {
      kind: "task-notification",
      source: ARTIFACT_WATCH_LIFECYCLE,
      slug: notice.slug,
      displayName: notice.artifactName,
      armFailed: true,
    },
    agentId: mainAgentId(),
  });
}
//@ chunk-aqdf5t3e.js:88886-89797 placement
function onDurablePublishArmSettled(outcome) {
  let { slug, url, liveDocLoss, claudeDoc, settlement } = outcome;
  if (settlement.settled === "registered") {
    pullStaleWatchLifecycleNotices(slug);
    if (claudeDoc && getLiveState().durable.rows.get(slug)?.events.includes("comment") === false)
      noteClaudeDocWakeMissing(slug, url, "comment events unsupported");
    return;
  }
  if (settlement.settled !== "unregistered") return;
  let { reason, detail, serverMessage, refusedByFrame } = settlement;
  let failure = getLiveState().builtInArtifactHiddenForMcp ? null : unexpectedWatchFailure(reason);
  if (claudeDoc) {
    noteClaudeDocWakeMissing(
      slug,
      url,
      detail === undefined ? reason : `${reason}: ${detail}`,
      refusedByFrame
        ? undefined
        : `${describeWatchError(reason, serverMessage)}${failure === null ? "" : ` To try again, ${failure}.`}`,
    );
    return;
  }
  if (!claimArmFailureAnnouncement(slug, reason)) return;
  let detailText =
    liveDocLoss ??
    `This session will NOT be woken when ${isArtifactsAvailable() ? "it is republished or a comment on it is sent to Claude" : "it is republished"}`;
  enqueueWatchLifecycleNotice({
    slug,
    artifactName: quoteArtifactName(outcome.getTitle, url),
    shortReason: "wake subscription not registered",
    event: `The durable wake subscription for ${url} was not registered (${reason}${detail !== undefined ? `: ${detail}` : ""}) \u2014 ${describeWatchError(reason, serverMessage)} ${detailText}${failure === null ? "" : `; ${failure}`} \u2014 do not claim to be subscribed to it meanwhile.`,
  });
}
//@ chunk-aqdf5t3e.js:89797-90232 placement
function noteClaudeDocWakeMissing(slug, url, slugValue, urlValue) {
  if (!claimArmFailureAnnouncement(slug, "claude_doc")) return;
  enqueueWatchLifecycleNotice({
    slug,
    artifactName: url,
    shortReason: "comment wake not registered",
    event: `@Claude comments on the Claude Doc ${url} go to another Claude and will not reach this session: its comment wake was not registered (${slugValue}).${urlValue === undefined ? "" : ` ${urlValue}`} To see them, read the doc's comments yourself with the Claude Docs connector's \`${QUERY}\`, and do not claim to be subscribed to it.`,
    passive: true,
  });
}
//@ chunk-aqdf5t3e.js:90232-90283 placement
function isFrameLiveRowConnecting(row) {
  return row.connected && !isMonitorSocketOpenNow(row.taskId);
}
//@ chunk-aqdf5t3e.js:90283-91453 placement
function frameLiveArmRows(request, options) {
  let live = getLiveState().live;
  let runningSlugs = new Set();
  for (let task of Object.values(request.taskRegistry.all()))
    if (isMonitorWsTask(task) && task.status === "running" && task.frameLive !== undefined)
      runningSlugs.add(task.frameLive.slug);
  let stopLatches = getLiveState().durable.stopLatches;
  let isEligible = (slug) =>
    (options === undefined || slug === options) && !runningSlugs.has(slug) && !stopLatches.isStopped(slug);
  let stoppedSlugs = new Set(frameLiveStoppedRows(request, options).map((row) => row.slug));
  let rows = [];
  let seenSlugs = new Set();
  for (let inFlightSubscribe of live.inFlightSubscribes) {
    if (
      !isEligible(inFlightSubscribe) ||
      (live.inFlightGenerations.get(inFlightSubscribe) ?? live.handoffGeneration) !==
        live.handoffGeneration ||
      live.retiredInFlightArms.has(inFlightSubscribe)
    )
      continue;
    seenSlugs.add(inFlightSubscribe);
    let supervisor = live.supervisors.get(inFlightSubscribe);
    let liveSupervisor = supervisor !== undefined && !supervisor.stopped ? supervisor : undefined;
    rows.push({
      slug: inFlightSubscribe,
      state: "arming",
      reconnect: liveSupervisor?.taskId !== undefined,
      failures: liveSupervisor?.consecutiveFailures ?? 0,
      ...(liveSupervisor?.lastFailure !== undefined && {
        lastFailure: liveSupervisor.lastFailure,
      }),
    });
  }
  for (let supervisor of live.supervisors.values()) {
    if (
      !isEligible(supervisor.slug) ||
      seenSlugs.has(supervisor.slug) ||
      supervisor.stopped ||
      supervisor.timer === undefined
    )
      continue;
    seenSlugs.add(supervisor.slug);
    if (stoppedSlugs.has(supervisor.slug)) continue;
    rows.push({
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
  for (let [slug, outcome] of live.armOutcomes) {
    if (!isEligible(slug) || seenSlugs.has(slug)) continue;
    rows.push({
      slug,
      state: outcome.outcome,
      reason: outcome.reason,
      at: outcome.at,
    });
  }
  return rows;
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
