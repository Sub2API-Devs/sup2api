/**
 * services/artifacts/frameLiveWording.ts
 *
 * Artifact 实时订阅提示文本（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-tsrpnscb.js (39)
 * attribution: placement 39
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { enqueuePendingNotification } from "../../utils/messageQueueManager.js";
import {
  getLiveState,
  stopSupervisor,
  disposePresenceSlug,
  REFUSED_CAPACITY_HINT,
} from "../liveReplica/liveReplica.js";
import {
  isMonitorWsTask,
  stopMonitorWsTasks,
  stopAutoReactForSlugNow,
  stopAutoReactForSlug,
  MONITOR_WS_ACTIVITY_KINDS,
} from "../../tasks/MonitorWsTask/MonitorWsTask.js";
import {
  liveUpdatesTaskLabel,
  liveDocHeadSink,
  frameLiveWatchRows,
  recordArmFailureLive,
  recordArmFailure,
  FrameLiveWatchManager,
  canArmFrameLive,
  touchSupervisorActivity,
} from "./frameLive.js";
import { artifactViewerUrlFor, sweepResultLineText } from "../../tools/ArtifactTool/artifactUrls.js";
import { claudeAiEnvironment, getClaudeAiOrigin } from "../../constants/claudeAiOrigin.js";
import { monitorStorage, stopCommentMonitorIntent } from "./commentMonitor.js";
import { setLedgerStorage, forgetArtifactAndFlush } from "./comments/autoreactLedger.js";
import { isSlugYielded, isSlugSwept, emitSummonArm, isSlugStopped } from "./summonArms.js";
import { hasWatchArtifactArg } from "../../cli/watchArtifactArgs.js";
import { forgetHeardVersion, isUnavailableStatus, recordHeardVersion } from "./liveSubscribe.js";
import { touchCommentReadState, markCensusDirty } from "./comments/threadPrompts.js";
import { isAutoreactArmed } from "./comments/postReply.js";
import { formatDuration } from "../../utils/format.js";
import {
  HANDSHAKE_TIMEOUT,
  parseUpgradeRejection,
  toWebSocketUrl,
} from "../../tools/MonitorTool/websocketMonitor.js";
import {
  CONTROL_PLANE_REQUEST_TIMEOUT_MS,
  isArtifactInOtherOrg,
  ARTIFACT_OTHER_ORG_CAUSE,
  PUBLIC_OUTSIDE_ORG_WATCH_CAUSE,
  ARTIFACT_OTHER_ORG_REMEDY,
} from "./orgScope.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { isFrameLiveTokenLeaseEnabled } from "./frameFlags.js";
import { isLiveTokenFresh, computeReconnectDelay } from "./artifactNotices.js";
import { quoteArtifactName, scheduleThreadScan } from "./comments/threadScanner.js";
import { formatTaskNotification } from "../../utils/xmlTags.js";
import { ARTIFACT_WATCH_LIFECYCLE } from "../../constants/xml.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { stoppedWatchingNotice } from "../../tools/ArtifactTool/artifactNotices.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { fetchBootUngated } from "./boot.js";
import { liveChannelCredential } from "./audience.js";
import { createTokenBucket, BUCKET_CAPACITY, TOKEN_REFILL_MS } from "../../utils/tokenBucket.js";
import { VER_SHAPE, isOwnPublishedVer, isPublishInFlight } from "./ownPublishes.js";
import { PASSIVE } from "./pageScripts.js";
import { isArtifactsAvailable } from "./artifactAvailability.js";
import { pickByToolset, commentsToolAction } from "./artifactToolGates.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-tsrpnscb.js:25761-25836 placement
/**
 * frame-live 实时订阅的协议标识 frame-live.v1、通知入队函数与 25 s 重试间隔。
 */
var FRAME_LIVE_V1 = "frame-live.v1";
var liveNotificationEnqueuer = {
  enqueuePendingNotification: (notice) => enqueuePendingNotification(notice),
};
var ARM_RETRY_DELAY_WORDING_MS = 25000;
//@ chunk-tsrpnscb.js:25836-25895 placement
function noteArtifactToolActivity() {
  getLiveState().live.lastArtifactToolCallAt = Date.now();
}
//@ chunk-tsrpnscb.js:25895-26245 placement
/**
 * 自动回复恢复相关的常量：时间窗口，以及"如何再次暂停/彻底停止自动回复"与"非本意时如何停止"的提示文字。
 */
var AUTO_REPLY_RESUMED_WINDOW_MS = 90000;
var PAUSE_AUTO_REPLIES_HINT =
  "To pause them again, press Ctrl+C at an idle prompt (Stop in Desktop/SDK); to stop them for good, \u2715 the watch in the tasks list or use the kill-all-agents gesture.";
var UNINTENDED_RESUME_HINT =
  "If this wasn't intended, kill the task again to stop them for this artifact, or use the kill-all-agents gesture to disarm auto-replies for the whole session.";
//@ chunk-tsrpnscb.js:26245-26589 placement
/**
 * 把某 slug 的监听从"显式"降为自动布防：更新监听器标志与运行中监听任务的描述。
 */
function demoteExplicitWatch(live, slug, registry) {
  let supervisor = live.supervisors.get(slug);
  if (supervisor !== undefined) supervisor.explicit = false;
  for (let task of Object.values(registry.all()))
    if (
      isMonitorWsTask(task) &&
      task.status === "running" &&
      task.frameLive?.slug === slug &&
      task.frameLive.explicit
    )
      registry.update(task.id, (task) =>
        isMonitorWsTask(task) && task.frameLive !== undefined
          ? {
              ...task,
              description: liveUpdatesTaskLabel(
                artifactViewerUrlFor({
                  slug,
                  env: claudeAiEnvironment(),
                }),
                false,
                task.frameLive.armedVia,
              ),
              frameLive: {
                ...task.frameLive,
                explicit: false,
              },
            }
          : task,
      );
}
//@ chunk-tsrpnscb.js:26589-27080 placement
/**
 * 响应停止某个监听任务：任务被用户停止时确认停止锁存、停止评论监听意图并停掉同 slug 的其他任务；否则只在任务与监听器匹配时停掉监听器。非模型发起时记录停止。返回之前是否在监听。
 */
function stopWatchFromTask(slug, event) {
  let live = getLiveState().live;
  let storage = live.supervisors.get(slug)?.context.storageV5 ?? monitorStorage();
  setLedgerStorage(storage);
  let unsub;
  if (event.taskStop) {
    getLiveState().durable.stopLatches.confirmStop(slug);
    if (!isSlugYielded(slug)) {
      stopCommentMonitorIntent(slug, {
        storageV5: storage,
      });
      import("./replyYieldHolder.js").then((mod) => mod.notifyTakenOverSlugStopped(slug));
    }
    let { wasWatching } = stopWatchesForSlug({
      slug,
      taskRegistry: event.taskRegistry,
      announce: !event.running,
      killRow: (row) => {
        if (row.id !== event.taskId)
          stopMonitorWsTasks(row.id, event.taskRegistry, {
            userStop: true,
          });
      },
    });
    unsub = wasWatching;
  } else {
    if (!supervisorOwnsTask(live, slug, event)) return false;
    removeSupervisor(live, slug);
    unsub = true;
  }
  if (event.modelOrigin !== true) hasWatchArtifactArg(slug, storage);
  return unsub;
}
//@ chunk-tsrpnscb.js:27080-27584 placement
/**
 * 停掉某 slug 的监听器与所有运行中的监听任务（可宣告结束），清除自动回复状态与被清扫标记，忘掉该 artifact 的缓存；返回之前是否在监听。
 */
function stopWatchesForSlug(options) {
  let { slug, taskRegistry } = options;
  let live = getLiveState().live;
  let supervisor = live.supervisors.get(slug);
  let wasWatching = (supervisor !== undefined && !supervisor.stopped) || live.inFlightSubscribes.has(slug);
  if (supervisor?.autoReactWiring !== undefined) stopAutoReactForSlugNow(slug);
  let filtered = Object.values(taskRegistry.all()).filter(
    (runningTasks) =>
      isMonitorWsTask(runningTasks) &&
      runningTasks.status === "running" &&
      runningTasks.frameLive?.slug === slug,
  );
  if (
    options.announce &&
    supervisor !== undefined &&
    !supervisor.stopped &&
    filtered.length === 0 &&
    (supervisor.taskId !== undefined || supervisor.timer !== undefined)
  )
    endStoppedWatch(live, supervisor, "watching this artifact was stopped just now");
  else removeSupervisor(live, slug);
  for (let row of filtered) {
    wasWatching = true;
    options.killRow(row);
  }
  if (wasWatching && isSlugSwept(slug)) stopAutoReactForSlug(slug);
  forgetArtifactAndFlush(slug);
  return {
    wasWatching,
  };
}
//@ chunk-tsrpnscb.js:27584-27827 placement
function supervisorOwnsTask(live, slug, taskId) {
  let supervisor = live.supervisors.get(slug);
  if (supervisor === undefined || supervisor.stopped) return false;
  if (taskId.running) return supervisor.taskId === undefined || supervisor.taskId === taskId.taskId;
  if (supervisor.taskId === undefined || supervisor.taskId !== taskId.taskId) return false;
  return supervisor.timer !== undefined || live.inFlightSubscribes.has(slug);
}
//@ chunk-tsrpnscb.js:27827-27942 placement
/**
 * 停止并移除某 slug 的监听器，清除相关缓存，并通知头部订阅源结束。
 */
function removeSupervisor(live, slug) {
  let supervisor = live.supervisors.get(slug);
  if (supervisor) {
    stopSupervisor(supervisor);
    live.supervisors.delete(slug);
  }
  forgetHeardVersion(slug);
  disposePresenceSlug(slug);
  liveDocHeadSink(slug)?.sourceEnded();
}
//@ chunk-tsrpnscb.js:27942-28225 placement
/**
 * 合并自动响应接线配置：人类回合快照时只打标记；否则用新的上下文与发布转录设置覆盖。
 */
function mergeAutoReactWiring(autoReactWiring, autoReactWiring_2, snapshot) {
  let title = autoReactWiring_2.title ?? autoReactWiring?.title;
  let withTitle =
    title === undefined
      ? autoReactWiring_2
      : {
          ...autoReactWiring_2,
          title,
        };
  if (snapshot)
    return {
      ...withTitle,
      humanTurnSnapshot: true,
    };
  if (autoReactWiring === undefined) return autoReactWiring_2;
  let { humanTurnSnapshot, ...rest } = withTitle;
  return {
    ...rest,
    context: autoReactWiring.context,
    publishTranscript: autoReactWiring.publishTranscript,
    ...(autoReactWiring.humanTurnSnapshot && {
      humanTurnSnapshot: true,
    }),
  };
}
//@ chunk-tsrpnscb.js:28225-28373 placement
/**
 * 判断监督器的人类回合快照接线是否已过期（新接线不是快照或上下文不同）。
 */
function isHumanTurnWiringStale(live, slug, autoReactWiring) {
  let autoReactWiring_2 = live.supervisors.get(slug)?.autoReactWiring;
  return (
    autoReactWiring_2?.humanTurnSnapshot === true &&
    (autoReactWiring?.humanTurnSnapshot !== true || autoReactWiring_2.context !== autoReactWiring.context)
  );
}
//@ chunk-tsrpnscb.js:28373-29671 placement
/**
 * 新建或更新某 slug 的实时监听器：已有时刷新活动时间、取消重连定时器、按需更新布防来源与显式标志、合并自动回复接线（新接上时广播）；没有时创建并初始化评论阅读状态。
 */
function upsertSupervisor(live, options) {
  let existing = live.supervisors.get(options.slug);
  if (existing && !existing.stopped) {
    if (options.carriedVer !== undefined) existing.carriedVer = options.carriedVer;
    let viaMcpWrite = existing.armedVia === "mcp_write";
    if (!options.machineArm) {
      existing.lastActivityAt = Date.now();
      if (existing.timer !== undefined) {
        clearTimeout(existing.timer);
        existing.timer = undefined;
      }
      existing.stalledSince = undefined;
      existing.lastStalledAt = undefined;
      existing.stallOutAfterMs = undefined;
      if (
        existing.taskId === undefined &&
        !live.inFlightSubscribes.has(options.slug) &&
        frameLiveWatchRows(options.context, options.slug).length === 0
      ) {
        existing.watchedSince = Date.now();
        existing.armedVia = options.armedVia;
        touchCommentReadState(options.slug);
      } else if (options.armedVia === "publish") existing.armedVia = "publish";
      else if (existing.armedVia === "mcp_write") existing.armedVia = options.armedVia;
      if (viaMcpWrite && existing.armedVia !== "mcp_write") emitSummonArm(live, options.slug);
    }
    existing.explicit = existing.explicit || options.explicit;
    if (options.autoReactWiring !== undefined) {
      let hasWiring = existing.autoReactWiring !== undefined;
      existing.autoReactWiring = mergeAutoReactWiring(
        existing.autoReactWiring,
        options.autoReactWiring,
        options.humanTurnWiring === true,
      );
      if (!hasWiring) emitSummonArm(live, options.slug);
    }
    return existing;
  }
  let supervisor = {
    slug: options.slug,
    url: options.url,
    getKnownVer: options.getKnownVer,
    ownPublishes: options.ownPublishes,
    context: options.context,
    abort: new AbortController(),
    explicit: options.explicit,
    stopped: false,
    watchedSince: Date.now(),
    lastActivityAt: Date.now(),
    armedVia: options.armedVia,
    consecutiveFailures: 0,
    ...(options.carriedVer !== undefined && {
      carriedVer: options.carriedVer,
    }),
    ...(options.autoReactWiring !== undefined && {
      autoReactWiring: mergeAutoReactWiring(
        undefined,
        options.autoReactWiring,
        options.humanTurnWiring === true,
      ),
    }),
  };
  live.supervisors.set(options.slug, supervisor);
  touchCommentReadState(options.slug, supervisor.watchedSince);
  return supervisor;
}
//@ chunk-tsrpnscb.js:29731-29940 placement
function isIdleAutoWatch(state, slug) {
  let { rewatchTiming } = state;
  if (rewatchTiming.idleTtlMs <= 0) return false;
  if (
    slug.explicit ||
    isRecentOwnPublish(state, slug) ||
    Date.now() - slug.lastActivityAt < rewatchTiming.idleTtlMs
  )
    return false;
  return !(
    slug.autoReactWiring !== undefined &&
    isAutoreactArmed() &&
    (!isSlugStopped(slug.slug) || isSlugSwept(slug.slug))
  );
}
//@ chunk-tsrpnscb.js:29940-30023 placement
function isRecentOwnPublish(state, slug) {
  return slug.slug === state.mostRecentPublishSlug && slug.armedVia !== "mcp_write";
}
//@ chunk-tsrpnscb.js:30023-30088 placement
function labelledArmedVia(options, armedVia) {
  return options ? "watch" : armedVia === "watch" ? "watch_stopped" : armedVia;
}
//@ chunk-tsrpnscb.js:30088-30143 placement
function parseArmedVia(value) {
  return MONITOR_WS_ACTIVITY_KINDS.find((kind) => kind === value) ?? "publish";
}
//@ chunk-tsrpnscb.js:30143-31295 placement
function armedViaWording(via) {
  switch (via) {
    case "publish":
      return {
        task: "auto-armed on publish",
        row: "armed by a publish",
        idle: "automatically when you published this artifact",
      };
    case "attach":
      return {
        task: "attached via /artifacts",
        row: "armed when the user attached it from /artifacts",
        idle: "automatically when you attached this artifact from /artifacts",
      };
    case "watch":
      return {
        task: "watch requested",
        row: "requested by you",
        idle: "when you asked to watch this artifact",
      };
    case "resume":
      return {
        task: "resume requested",
        row: "re-armed when the user asked to resume replies",
        idle: "when you asked to resume its comment auto-replies",
      };
    case "session_resume":
      return {
        task: "re-armed on session resume",
        row: "re-armed when this session was resumed",
        idle: "automatically when this session was resumed",
      };
    case "mcp_write":
      return {
        task: "presence while editing via MCP",
        row: "armed when this session edited the page through an MCP tool",
        idle: "automatically when this session edited this page through an MCP tool",
      };
    case "watch_stopped":
      return {
        task: "watch requested; auto-replies since stopped",
        row: "requested by you; its auto-replies since stopped by the user",
        idle: "when you asked to watch this artifact",
      };
  }
}
//@ chunk-tsrpnscb.js:31295-31601 placement
/**
 * 描述空闲退役的原因：何时如何布防、超过多久没有活动。
 */
function describeIdleRetirement(state, slug) {
  let idle = armedViaWording(slug.armedVia).idle;
  let text =
    slug.armedVia === "watch"
      ? "(your watch request was later stopped; idle auto-armed watches are retired)"
      : "(idle auto-armed watches are retired)";
  return `it was armed ${idle} and has seen no activity for over ${formatDuration(
    state.rewatchTiming.idleTtlMs,
    {
      hideTrailingZeros: true,
    },
  )} ${text}`;
}
//@ chunk-tsrpnscb.js:31601-31658 placement
function isHandshakeStall(code, info, rewatchTiming) {
  return code === HANDSHAKE_TIMEOUT || info >= rewatchTiming.stallThresholdMs;
}
//@ chunk-tsrpnscb.js:31658-31733 placement
function isRetryableUpgradeRejection(code) {
  let upgradeRejection = parseUpgradeRejection(code);
  return (
    upgradeRejection !== null &&
    (isUnavailableStatus(upgradeRejection.status) || upgradeRejection.cfMitigated)
  );
}
//@ chunk-tsrpnscb.js:31733-31829 placement
function maxStallAge(rewatchTiming) {
  return (
    Math.max(rewatchTiming.stallMaxMs, rewatchTiming.longStallMaxMs) +
    2 * CONTROL_PLANE_REQUEST_TIMEOUT_MS +
    rewatchTiming.handshakeDeadlineMs +
    60000
  );
}
//@ chunk-tsrpnscb.js:31829-33836 placement
function describeResumedWatchFailure(liveState, slug, failure) {
  let { uptimeMs, resumeNeverOpened = false, stalled = false } = failure;
  let { rewatchTiming } = liveState;
  let supervisor = liveState.supervisors.get(slug);
  if (!supervisor || supervisor.stopped) return;
  if (getLiveState().durable.stopLatches.isStopped(slug)) {
    logFeatureSad("artifact_live_subscribe", "stop_latched");
    if (resumeNeverOpened)
      endWatch(
        liveState,
        supervisor,
        "the resumed live watch could not connect, so the earlier stop stays in place and comment auto-replies were not resumed",
        "could not connect",
        {
          advice: "tell the user, and call resume_replies again only if they still want auto-replies resumed",
        },
      );
    else endStoppedWatch(liveState, supervisor);
    return;
  }
  if (isIdleAutoWatch(liveState, supervisor)) {
    logFeatureOk("artifact_live_subscribe", {
      idle_retired: true,
    });
    endWatch(liveState, supervisor, describeIdleRetirement(liveState, supervisor), "idle", {
      advice: WATCH_LATER_ADVICE,
      passive: true,
    });
    return;
  }
  let reconnected = false;
  let retried = false;
  if (stalled) {
    let now = Date.now();
    if (
      supervisor.stalledSince === undefined ||
      supervisor.lastStalledAt === undefined ||
      supervisor.stallOutAfterMs === undefined ||
      now - supervisor.lastStalledAt > maxStallAge(rewatchTiming)
    ) {
      supervisor.stalledSince = now;
      supervisor.stallOutAfterMs =
        rewatchTiming.maxStallMs + Math.round(Math.random() * rewatchTiming.stallOutJitterMs);
      let httpStatus = failure.httpStatus ?? parseUpgradeRejection(failure.closeCode)?.status;
      logFeatureSad("artifact_live_subscribe", "stall_run_started", {
        boot: failure.closeCode === undefined,
        ...(httpStatus !== undefined && {
          http_status: httpStatus,
        }),
      });
    } else retried = true;
    supervisor.lastStalledAt = now;
    reconnected = now - supervisor.stalledSince >= supervisor.stallOutAfterMs;
  } else {
    supervisor.stalledSince = undefined;
    supervisor.lastStalledAt = undefined;
    supervisor.stallOutAfterMs = undefined;
    if (uptimeMs >= rewatchTiming.minUptimeMs) supervisor.consecutiveFailures = 0;
    else if (failure.reuseRefused !== true) supervisor.consecutiveFailures++;
  }
  if (supervisor.consecutiveFailures > rewatchTiming.maxConsecutiveFailures || reconnected) {
    if (reconnected)
      logFeatureSad("artifact_live_subscribe", "rewatch_gave_up", {
        stalled: true,
      });
    else logFeatureSad("artifact_live_subscribe", "rewatch_gave_up");
    endWatch(
      liveState,
      supervisor,
      "the live connection kept failing and reconnecting has stopped",
      CONNECTION_LOST_PHRASE,
      {
        advice: NO_AUTO_RETURN_ADVICE,
        passive: true,
      },
    );
    return;
  }
  let leaseEnabled = isFrameLiveTokenLeaseEnabled();
  let longStall =
    stalled &&
    retried &&
    (parseUpgradeRejection(failure.closeCode)?.cfMitigated === true ||
      !leaseEnabled ||
      supervisor.lease === undefined ||
      !isLiveTokenFresh(
        supervisor.lease,
        rewatchTiming,
        getLiveState().accountEpoch,
        Date.now() + rewatchTiming.stallMinMs,
      ));
  let advice =
    uptimeMs > 0 &&
    uptimeMs >= rewatchTiming.minUptimeMs &&
    failure.closeCode !== undefined &&
    !(failure.expired === true && supervisor.transport !== "sync");
  let reconnectDelay = computeReconnectDelay({
    timing: rewatchTiming,
    consecutiveFailures: supervisor.consecutiveFailures,
    leaseMode: leaseEnabled,
    stalled,
    longStall,
    spread: advice,
  });
  if (leaseEnabled && advice && failure.expired !== true) supervisor.spreadReconnect = true;
  if (supervisor.timer !== undefined) clearTimeout(supervisor.timer);
  supervisor.timer = setTimeout(rewatchSupervisor, reconnectDelay, liveState, slug);
  supervisor.timer.unref?.();
  supervisor.nextRewatchAt = Date.now() + reconnectDelay;
}
//@ chunk-tsrpnscb.js:33836-34654 placement
/**
 * 结束一个监听：移除监听器（未被停止锁存时记结束结果，自动回复的交还接管），处理恢复宣告的放弃回调；非 MCP 写入布防时向主会话发送"监听已结束"的任务通知（附原因与建议）。
 */
function endWatch(
  live,
  supervisor,
  reason,
  shortReason,
  { advice = "watch it again if you still need that", passive = false } = {},
) {
  if (live.supervisors.get(supervisor.slug) === supervisor) {
    removeSupervisor(live, supervisor.slug);
    if (!getLiveState().durable.stopLatches.isStopped(supervisor.slug)) {
      recordArmFailureLive(live, supervisor.slug, "ended", shortReason);
      if (supervisor.autoReactWiring !== undefined)
        import("./replyYieldHolder.js").then((mod) => mod.handBackTakenOverSlug(supervisor.slug));
    }
  } else stopSupervisor(supervisor);
  let resumeAnnounce = supervisor.resumeAnnounce;
  if (resumeAnnounce !== undefined) {
    supervisor.resumeAnnounce = undefined;
    resumeAnnounce.onGiveUp();
  }
  if (supervisor.armedVia === "mcp_write") return;
  let name = quoteArtifactName(() => supervisor.autoReactWiring?.title, supervisor.url);
  enqueuePendingNotification({
    value: formatTaskNotification({
      taskType: ARTIFACT_WATCH_LIFECYCLE,
      summary: escapeXml(stoppedWatchingNotice(name, shortReason)),
      body: `
<event>${escapeXml(`Watch on ${supervisor.url} ended \u2014 ${reason}. This session no longer keeps track of new versions of it; ${advice}.`)}</event>`,
    }),
    mode: "task-notification",
    ...(passive && {
      passive: true,
    }),
    priority: "next",
    origin: {
      kind: "task-notification",
      source: ARTIFACT_WATCH_LIFECYCLE,
      slug: supervisor.slug,
      displayName: name,
      watchEnded: true,
    },
    agentId: mainAgentId(),
  });
}
//@ chunk-tsrpnscb.js:34654-34839 placement
/**
 * 以"本会话早先已停止监视"为由结束监视，并建议除非用户要求不要再监视。
 */
function endStoppedWatch(
  liveState,
  supervisor,
  reason = "watching this artifact was stopped earlier in this session",
) {
  supervisor.resumeAnnounce = undefined;
  endWatch(liveState, supervisor, reason, "stopped", {
    advice: "do not watch it again unless the user asks you to",
  });
}
//@ chunk-tsrpnscb.js:34839-35041 placement
/**
 * 布防被跳过时的统一处理：必要时描述恢复失败、记录布防失败，返回 skipped 结果（可带不可用与 HTTP 状态）。
 */
function skipArm(state, slug, machineArm, stateSlug, reason, { unavailable = false, httpStatus } = {}) {
  describeSkippedResume(state, slug, machineArm, {
    unavailable,
    httpStatus,
  });
  recordArmFailure(state, slug, machineArm, stateSlug, reason);
  return {
    outcome: "skipped",
    reason: stateSlug,
    ...(unavailable && {
      unavailable: true,
    }),
    ...(unavailable &&
      httpStatus !== undefined && {
        httpStatus,
      }),
  };
}
//@ chunk-tsrpnscb.js:35041-35239 placement
/**
 * 恢复监视被跳过时，若监督器仍在且没有定时器，则报告恢复失败（可带停滞与 HTTP 状态）。
 */
function describeSkippedResume(state, slug, argSlug, { unavailable = false, httpStatus } = {}) {
  if (argSlug) return;
  let supervisor = state.supervisors.get(slug);
  if (supervisor !== undefined && !supervisor.stopped && supervisor.timer === undefined)
    describeResumedWatchFailure(state, slug, {
      uptimeMs: 0,
      stalled: unavailable,
      ...(httpStatus !== undefined && {
        httpStatus,
      }),
    });
}
//@ chunk-tsrpnscb.js:35239-36411 placement
/**
 * 重连定时器到点后重新布防监听：已停止锁存的结束监听；否则以机器布防方式重新订阅，连接类失败记录并描述，其他跳过原因则结束监听并给出建议。
 */
async function rewatchSupervisor(live, slug) {
  let supervisor = live.supervisors.get(slug);
  if (!supervisor || supervisor.stopped) return;
  supervisor.timer = undefined;
  if (getLiveState().durable.stopLatches.isStopped(slug)) {
    logFeatureSad("artifact_live_subscribe", "stop_latched");
    endStoppedWatch(live, supervisor);
    return;
  }
  if (supervisor.autoReactWiring !== undefined && isSlugStopped(slug) && !isSlugSwept(slug))
    delete supervisor.autoReactWiring;
  logFeatureOk("artifact_live_subscribe", {
    rewatch_attempt: true,
  });
  let result = await FrameLiveWatchManager(live, {
    slug: supervisor.slug,
    url: supervisor.url,
    getKnownVer: supervisor.getKnownVer,
    ownPublishes: supervisor.ownPublishes,
    context: supervisor.context,
    signal: supervisor.abort.signal,
    machineArm: true,
    seedKnownVerFromBoot: true,
    ...(supervisor.carriedVer !== undefined && {
      seedSurfacedVer: supervisor.carriedVer,
    }),
    ...(supervisor.autoReactWiring !== undefined && {
      autoReactWiring: supervisor.autoReactWiring,
    }),
  });
  if (result.outcome === "skipped" && result.reason === "stop_latched") return;
  if (supervisor.stopped || live.supervisors.get(slug) !== supervisor) {
    if (result.outcome === "skipped")
      describeSkippedResume(live, slug, undefined, {
        unavailable: result.unavailable === true,
        httpStatus: result.httpStatus,
      });
    return;
  }
  if (result.outcome === "skipped")
    if (
      result.reason === "boot_failed" ||
      result.reason === "ws_open_error" ||
      result.reason === "sync_unavailable"
    ) {
      supervisor.lastFailure = result.reason;
      describeResumedWatchFailure(live, slug, {
        uptimeMs: 0,
        stalled: result.unavailable === true,
        ...(result.httpStatus !== undefined && {
          httpStatus: result.httpStatus,
        }),
      });
    } else {
      logFeatureSad("artifact_live_subscribe", `rewatch_stopped_${result.reason}`);
      endWatch(
        live,
        supervisor,
        frameLiveSkipReasonPhrase(result.reason) ?? result.reason,
        SKIP_REASON_PHRASES[result.reason] ?? COULD_NOT_RECONNECT_PHRASE,
        getEndWatchAdvice(result.reason),
      );
    }
}
//@ chunk-tsrpnscb.js:36411-37452 placement
async function describeSubscribeFailure(state, slug) {
  let supervisor = state.supervisors.get(slug);
  let lease = supervisor?.lease;
  if (
    !isFrameLiveTokenLeaseEnabled() ||
    supervisor === undefined ||
    supervisor.stopped ||
    lease === undefined ||
    lease.probed
  )
    return;
  lease.probed = true;
  let failure;
  try {
    failure = await fetchBootUngated(
      {
        slug,
        env: claudeAiEnvironment(),
      },
      supervisor.abort.signal,
      {
        agentPeer: canArmFrameLive(slug),
        syncLive: canArmFrameLive(slug),
        watchBoot: true,
        credentials: supervisor.context.credentials,
      },
    );
  } catch {
    return;
  }
  if (state.supervisors.get(slug) !== supervisor || supervisor.stopped) return;
  let detail =
    failure.err === null
      ? failure.assetToken === undefined
        ? "public_outside_org"
        : undefined
      : failure.status === 404
        ? "not_found"
        : isArtifactInOtherOrg(failure)
          ? "other_org"
          : undefined;
  if (detail !== undefined) {
    logFeatureSad("artifact_live_subscribe", `read_stopped_${detail}`);
    endWatch(
      state,
      supervisor,
      frameLiveSkipReasonPhrase(detail) ?? detail,
      SKIP_REASON_PHRASES[detail] ?? detail,
      {
        advice: noRewatchAdvice(detail),
      },
    );
    for (let task of Object.values(supervisor.context.taskRegistry.all()))
      if (isMonitorWsTask(task) && task.status === "running" && task.frameLive?.slug === slug)
        stopMonitorWsTasks(task.id, supervisor.context.taskRegistry, {
          quiet: true,
        });
    return;
  }
  if (failure.err === null && liveChannelCredential(failure.data) !== undefined) {
    logFeatureOk("artifact_live_subscribe", {
      read_refused_boot_ok: true,
    });
    return;
  }
  let code = failure.err === null ? "tokenless" : (failure.status ?? failure.errorCode);
  logFeatureSad("artifact_live_subscribe", `read_refused_boot_${code}`);
  if (
    (code === "tokenless" || (typeof code === "number" && code < 500 && code !== 408 && code !== 429)) &&
    supervisor.lease === lease
  ) {
    delete supervisor.lease;
    delete supervisor.renewable;
  }
}
//@ chunk-tsrpnscb.js:37452-37525 placement
function frameLiveWsUrl(slug) {
  return toWebSocketUrl(new URL(`/edge-api/frame-live/${slug}/ws`, getClaudeAiOrigin()));
}
//@ chunk-tsrpnscb.js:37525-37534 placement
var MAX_SURFACED_VERSIONS = 8;
//@ chunk-tsrpnscb.js:37534-38728 placement
/**
 * 为实时订阅创建事件处理：comment 事件刷新活动并在自动回复开启时安排线程扫描；ver 事件过滤掉自己发布的、已知的、发布中的版本并限速，记下新版本后回调 onSurfaced。
 */
function createLiveEventHandlers(options) {
  let { slug, url, ownPublishes, getKnownVer, autoReact, onSurfaced } = options;
  let surfacedVers = options.surfacedVers ?? [];
  function rememberSurfaced(ver) {
    surfacedVers.push(ver);
    if (surfacedVers.length > MAX_SURFACED_VERSIONS) surfacedVers.shift();
  }
  if (options.seedSurfacedVer !== undefined && !surfacedVers.includes(options.seedSurfacedVer))
    rememberSurfaced(options.seedSurfacedVer);
  let tokenBucket = createTokenBucket(BUCKET_CAPACITY, TOKEN_REFILL_MS);
  let suppressedCatchUp = false;
  let suppressedOwn = false;
  function onHeard() {
    touchSupervisorActivity(slug);
    markCensusDirty(slug);
    if (autoReact && isAutoreactArmed())
      scheduleThreadScan({
        slug,
        url,
        env: autoReact.env,
        tool: autoReact.tool,
        context: autoReact.context,
        ...(autoReact.publishTranscript !== undefined && {
          publishTranscript: autoReact.publishTranscript,
        }),
        ...(autoReact.getWiring !== undefined && {
          getWiring: autoReact.getWiring,
        }),
        abort: autoReact.abort,
        notify: autoReact.notify,
        ...(autoReact.getTitle !== undefined && {
          getTitle: autoReact.getTitle,
        }),
        ...(autoReact.onReadRefused !== undefined && {
          onReadRefused: autoReact.onReadRefused,
        }),
      });
  }
  function surfaceVersion(ver, source) {
    if (!ver || !VER_SHAPE.test(ver)) return;
    if (options.presenceOnly?.()) return;
    recordHeardVersion(slug, ver);
    if (surfacedVers.includes(ver)) return;
    let syncFields = source === "sync" && {
      via_sync: true,
    };
    if (isOwnPublishedVer(ownPublishes, slug, ver)) {
      logFeatureOk("artifact_live_subscribe", {
        ...(suppressedCatchUp
          ? {
              suppressed_own: true,
            }
          : {
              suppressed_catch_up: true,
            }),
        ...syncFields,
      });
      suppressedCatchUp = true;
      return;
    }
    if (ver === getKnownVer()) return;
    if (isPublishInFlight(ownPublishes, slug)) {
      logFeatureOk("artifact_live_subscribe", {
        suppressed_in_flight: true,
        ...syncFields,
      });
      return;
    }
    if (!tokenBucket.tryConsume()) {
      if (!suppressedOwn) {
        suppressedOwn = true;
        logFeatureSad("artifact_live_subscribe", "ver_rate_suppressed", {
          ...syncFields,
        });
      }
      return;
    }
    suppressedOwn = false;
    rememberSurfaced(ver);
    try {
      onSurfaced?.(ver);
    } catch {}
    logFeatureOk("artifact_live_subscribe", {
      surfaced: true,
      passive: PASSIVE === "passive",
      ...syncFields,
    });
  }
  return {
    comment: onHeard,
    ver: surfaceVersion,
  };
}
//@ chunk-tsrpnscb.js:58664-59860 placement
var AUTO_REPLIES_ARMED_TOKEN = "auto-replies armed";
var AUTO_REPLIES_PAUSED_ROW =
  "auto-replies paused by the user's interrupt (Ctrl+C or Stop) \u2014 the user's next message resumes them, as does a publish of this artifact the user asks for or an asked-for resume (publishing it without being asked, while handling a notification or a wake-up, leaves them paused); comments sent to Claude meanwhile are answered then; no comment notifications arrive until then (do not republish or resume just to re-enable them)";
var AUTO_REPLIES_YIELDED_ROW =
  "auto-replies handed to another session of this conversation (the user reopened the conversation there, or published there) \u2014 that session answers the comments now; a publish of this artifact the user asks for here, or resume_replies when the user asks for it, takes them back (do not republish or call resume_replies just to take them back unless the user asks \u2014 the user asking is not itself the take-back); no comment notifications arrive here meanwhile";
var AUTO_REPLIES_DECLINED_ROW =
  "auto mode did not approve the last comment's auto-reply; the next comment is checked again unless repeated refusals pause the thread";
var AUTO_REPLIES_DENIED_ROW =
  "a permission rule or setting blocked the last comment's auto-reply (no notice); later comments are still checked";
//@ chunk-tsrpnscb.js:59860-60111 placement
function commentNotifyNote() {
  return isArtifactsAvailable()
    ? `; a comment on it sent to Claude reaches this session while this artifact's status row says ${AUTO_REPLIES_ARMED_TOKEN}, and plain comments never notify \u2014 read them with ${pickByToolset('action "comments"', () => `the ${commentsToolAction("comments")}`)} when asked`
    : "";
}
//@ chunk-tsrpnscb.js:60111-62442 placement
/**
 * 实时订阅不可用的原因文本（特性开关关闭、非主循环会话等）
 */
function frameLiveSkipReasonPhrase(reason) {
  switch (reason) {
    case "flag_off":
      return "the live-subscribe feature flag is off in this session's cached config, so this session does not keep track of new versions of this artifact published elsewhere";
    case "publish_context":
      return "only a main-loop session (interactive, SDK, or background) holds the watch, not a subagent, teammate, or print session";
    case "stop_latched":
      return "watching this artifact was stopped earlier in this session; do not retry on your own. If the user asks you to resume watching it, call the watch action (in permission modes that prompt, they confirm it there)";
    case "remote":
      return "remote sessions do not hold the watch";
    case "cp_override":
      return "the artifact control plane is overridden to a local stack, so the live edge is not reachable";
    case "egress_denied":
      return "network egress to the claude.ai edge is denied by policy, so this session does not keep track of new versions of this artifact published elsewhere";
    case "not_found":
      return "no such artifact for this account (it was deleted, or it has not been shared with the user)";
    case "other_org":
      return ARTIFACT_OTHER_ORG_CAUSE;
    case "public_outside_org":
      return PUBLIC_OUTSIDE_ORG_WATCH_CAUSE;
    case "not_editor":
      return "a restored publish decision does not carry for an artifact this account cannot publish to";
    case "no_subscription_token":
      return "the control plane minted no live-channel credential for this artifact";
    case "boot_failed":
      return "the artifact could not be read right now (network or auth); try again later";
    case "watch_cap":
      return `this session already holds its maximum of ${REFUSED_CAPACITY_HINT} artifact watches and none could make room (each is a watch you requested, the artifact you most recently published, or one auto-replying to comments: a new publish can displace an idle one, a watch request cannot; or watch slots are still connecting); unwatch one first`;
    case "watch_cap_reconnect":
      return `this session was already holding its maximum of ${REFUSED_CAPACITY_HINT} artifact watches when this one tried to reconnect, and none of the other watches could make room`;
    case "invalid_slug":
      return "that is not an artifact this session can name";
    case "cancelled":
      return "the request was cancelled before the connection opened";
    case "ws_open_error":
      return "the live connection could not be opened from this environment";
    case "sync_unavailable":
      return "the live channel is not available to this session right now";
    default:
      return null;
  }
}
//@ chunk-tsrpnscb.js:62442-64153 placement
function frameLiveSubscriptionLine(state) {
  switch (state) {
    case "arming":
      return `Live subscription: arming in the background \u2014 not connected yet, so this is not a watch until \`status\` shows it connected (you are told if it cannot connect, unless this turn is interrupted first). Once connected, this session keeps track of new versions of this artifact published elsewhere; a new version starts no turn and sends no notification${commentNotifyNote()}.`;
    case "connected":
      return `Live subscription: already connected from earlier in this session \u2014 this session keeps track of new versions of this artifact published elsewhere; a new version starts no turn and sends no notification${commentNotifyNote()}.`;
    case "publish_adopted":
      return `Live subscription: this agent holds no watch; the session that launched it takes over live updates for this artifact when this agent finishes normally \u2014 that session then keeps track of new versions of this artifact published elsewhere; a new version starts no turn and sends no notification${commentNotifyNote()}.`;
    case "publish_context":
      return "Live subscription: none \u2014 this is a print (-p), cloud, subagent, or teammate session, which does not keep track of new versions of this artifact published elsewhere (only the main conversation of a local interactive, background, or TypeScript/Python Agent SDK session does). Expected; not an error.";
    case "remote_unsupported": {
      let available = isArtifactsAvailable();
      return `Live subscription: not supported yet from remote sessions \u2014 nothing notifies this session of new versions${available ? " or of comments sent to Claude" : ""}; re-read the artifact${available ? " (and its comments)" : ""} when the user asks.`;
    }
    default: {
      let phrase = frameLiveSkipReasonPhrase(state);
      return phrase !== null
        ? `Live subscription: skipped \u2014 ${phrase}.`
        : `Live subscription: skipped (${sweepResultLineText(state, 64)}).`;
    }
  }
}
//@ chunk-tsrpnscb.js:64153-64259 placement
var FRAME_LIVE_PUBLISH_CONTEXT_BRIEF_LINE =
  "Live subscription: none in this kind of session (see the earlier publish result); not an error.";
//@ chunk-tsrpnscb.js:86817-87364 placement
/**
 * 监听失败/结束的短语与建议文案：未找到、其他组织、组织外公开、不会自行恢复、下次工作时再监听、实时更新已关闭。
 */
var ARTIFACT_NOT_FOUND_PHRASE; // deferred: uses ARTIFACT_OTHER_ORG_CAUSE (./orgScope.js) of its import cycle while loading; runs once the cycle is complete
var NOT_SHARED_ADVICE;
var OTHER_ORG_PHRASE;
var PUBLIC_OUTSIDE_ORG_PHRASE;
var RETRY_AFTER_ADVICE;
var READ_INSTEAD_ADVICE;
var NO_AUTO_RETURN_ADVICE;
var WATCH_LATER_ADVICE;
var LIVE_OFF_ADVICE;
deferInit("chunk-tsrpnscb.js:86817", () => {
  ARTIFACT_NOT_FOUND_PHRASE = "artifact not found";
  NOT_SHARED_ADVICE = "there is nothing to retry unless the artifact is shared with the user again";
  OTHER_ORG_PHRASE = "other organization";
  PUBLIC_OUTSIDE_ORG_PHRASE = "public, outside your organization";
  RETRY_AFTER_ADVICE = `there is nothing to retry until ${ARTIFACT_OTHER_ORG_REMEDY}`;
  READ_INSTEAD_ADVICE = "there is nothing to retry: read it with the read action instead";
  NO_AUTO_RETURN_ADVICE =
    "it will not come back on its own \u2014 watch it again only if the user asks or your current task still depends on its republishes";
  WATCH_LATER_ADVICE = "watch it again when you next work on this artifact";
  LIVE_OFF_ADVICE = "there is nothing to re-watch while live updates are switched off";
});
//@ chunk-tsrpnscb.js:87364-87550 placement
function getEndWatchAdvice(reason) {
  switch (reason) {
    case "not_found":
    case "other_org":
    case "public_outside_org":
      return {
        advice: noRewatchAdvice(reason),
      };
    case "flag_off":
      return {
        advice: LIVE_OFF_ADVICE,
        passive: true,
      };
    default:
      return {
        advice: NO_AUTO_RETURN_ADVICE,
        passive: true,
      };
  }
}
//@ chunk-tsrpnscb.js:87550-87745 placement
function noRewatchAdvice(reason) {
  switch (reason) {
    case "not_found":
    case ARTIFACT_NOT_FOUND_PHRASE:
      return NOT_SHARED_ADVICE;
    case "other_org":
    case OTHER_ORG_PHRASE:
      return RETRY_AFTER_ADVICE;
    case "public_outside_org":
    case PUBLIC_OUTSIDE_ORG_PHRASE:
      return READ_INSTEAD_ADVICE;
    case CONNECTION_LOST_PHRASE:
    case NO_LIVE_CREDENTIAL_PHRASE:
    case COULD_NOT_RECONNECT_PHRASE:
    case MADE_ROOM_PHRASE:
      return NO_AUTO_RETURN_ADVICE;
    default:
      return;
  }
}
//@ chunk-tsrpnscb.js:87745-88065 placement
/**
 * 监听状态短语：连接丢失、没有实时凭据、无法重连、为其他监听腾位置，以及各跳过原因对应的短语表。
 */
var CONNECTION_LOST_PHRASE; // deferred: uses ARTIFACT_NOT_FOUND_PHRASE of its import cycle while loading; runs once the cycle is complete
var NO_LIVE_CREDENTIAL_PHRASE;
var COULD_NOT_RECONNECT_PHRASE;
var MADE_ROOM_PHRASE;
var SKIP_REASON_PHRASES;
deferInit("chunk-tsrpnscb.js:87745", () => {
  CONNECTION_LOST_PHRASE = "connection lost";
  NO_LIVE_CREDENTIAL_PHRASE = "no live credential";
  COULD_NOT_RECONNECT_PHRASE = "could not reconnect";
  MADE_ROOM_PHRASE = "made room for another watch";
  SKIP_REASON_PHRASES = {
    boot_failed: "could not connect",
    ws_open_error: "could not connect",
    sync_unavailable: "could not connect",
    not_found: ARTIFACT_NOT_FOUND_PHRASE,
    other_org: OTHER_ORG_PHRASE,
    public_outside_org: PUBLIC_OUTSIDE_ORG_PHRASE,
    no_subscription_token: NO_LIVE_CREDENTIAL_PHRASE,
    watch_cap: "watch limit reached",
  };
});
export {
  frameLiveSkipReasonPhrase,
  frameLiveSubscriptionLine,
  noRewatchAdvice,
  noteArtifactToolActivity,
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
  SKIP_REASON_PHRASES,
  rewatchSupervisor,
  AUTO_REPLIES_ARMED_TOKEN,
  AUTO_REPLIES_PAUSED_ROW,
  AUTO_REPLIES_YIELDED_ROW,
  AUTO_REPLIES_DECLINED_ROW,
  AUTO_REPLIES_DENIED_ROW,
  parseArmedVia,
  FRAME_LIVE_PUBLISH_CONTEXT_BRIEF_LINE,
};
