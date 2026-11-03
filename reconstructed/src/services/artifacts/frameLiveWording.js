/**
 * services/artifacts/frameLiveWording.ts
 *
 * Artifact 实时订阅提示文本（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aqdf5t3e.js (39)
 * attribution: placement 39
 */
import { enqueuePendingNotification } from "../../utils/messageQueueManager.js";
import { getLiveState, stopSupervisor, Qcr, FT } from "../liveReplica/liveReplica.js";
import {
  eW,
  stopMonitorWsTasks,
  XBs,
  stopAutoReactForSlug,
  BBs,
} from "../../tasks/MonitorWsTask/MonitorWsTask.js";
import {
  Xt,
  Ve,
  frameLiveWatchRows,
  Dr,
  recordArmFailure,
  FrameLiveWatchManager,
  ct,
  touchSupervisorActivity,
} from "./frameLive.js";
import { artifactViewerUrlFor, sweepResultLineText } from "../../tools/ArtifactTool/artifactUrls.js";
import { claudeAiEnvironment, aCi } from "../../constants/claudeAiOrigin.js";
import { LRo, stopCommentMonitorIntent } from "./commentMonitor.js";
import { setLedgerStorage, forgetArtifactAndFlush } from "./comments/autoreactLedger.js";
import { isSlugYielded, isSlugSwept, emitSummonArm, isSlugStopped } from "./summonArms.js";
import { hasWatchArtifactArg } from "../../cli/watchArtifactArgs.js";
import { R5n, Y9, recordHeardVersion } from "./liveSubscribe.js";
import { touchCommentReadState, zFs } from "./comments/threadPrompts.js";
import { isAutoreactArmed } from "./comments/postReply.js";
import { formatDuration } from "../../utils/format.js";
import {
  HANDSHAKE_TIMEOUT,
  parseUpgradeRejection,
  toWebSocketUrl,
} from "../../tools/MonitorTool/websocketMonitor.js";
import {
  vFr,
  B5,
  OTHER_ORG_PHRASE as OTHER_ORG_PHRASE_2,
  PUBLIC_OUTSIDE_ORG_NOTE,
  LOGIN_OTHER_ORG_REMEDY,
} from "./orgScope.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { isFrameLiveTokenLeaseEnabled } from "./frameFlags.js";
import { isLiveTokenFresh, computeReconnectDelay } from "./artifactNotices.js";
import { quoteArtifactName, scheduleThreadScan } from "./comments/threadScanner.js";
import { formatTaskNotification } from "../../utils/xmlTags.js";
import { ARTIFACT_WATCH_LIFECYCLE } from "../../constants/xml.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { h6s } from "../../tools/ArtifactTool/artifactNotices.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { fetchArtifactBoot } from "./boot.js";
import { getLiveSubscriptionToken } from "./audience.js";
import { createTokenBucket, BUCKET_CAPACITY, TOKEN_REFILL_MS } from "../../utils/tokenBucket.js";
import { VER_SHAPE, isOwnPublishedVer, isPublishInFlight } from "./ownPublishes.js";
import { PASSIVE } from "./pageScripts.js";
import { Xb } from "./artifactAvailability.js";
import { pickByToolset, commentsToolAction } from "./artifactToolGates.js";

//@ chunk-aqdf5t3e.js:25720-25795 placement
var FRAME_LIVE_V1 = "frame-live.v1",
  qi = { enqueuePendingNotification: (e) => enqueuePendingNotification(e) },
  zi = 25000;
//@ chunk-aqdf5t3e.js:25795-25854 placement
function noteArtifactToolActivity() {
  getLiveState().live.lastArtifactToolCallAt = Date.now();
}
/**
 * 自动回复恢复相关的常量：时间窗口，以及"如何再次暂停/彻底停止自动回复"与"非本意时如何停止"的提示文字。
 */
//@ chunk-aqdf5t3e.js:25854-26204 placement
var AUTO_REPLY_RESUMED_WINDOW_MS = 90000,
  PAUSE_AUTO_REPLIES_HINT =
    "To pause them again, press Ctrl+C at an idle prompt (Stop in Desktop/SDK); to stop them for good, \u2715 the watch in the tasks list or use the kill-all-agents gesture.",
  UNINTENDED_RESUME_HINT =
    "If this wasn't intended, kill the task again to stop them for this artifact, or use the kill-all-agents gesture to disarm auto-replies for the whole session.";
/**
 * 把某 slug 的监听从"显式"降为自动布防：更新监听器标志与运行中监听任务的描述。
 */
//@ chunk-aqdf5t3e.js:26204-26548 placement
function demoteExplicitWatch(e, n, r) {
  let s = e.supervisors.get(n);
  if (s !== void 0) s.explicit = !1;
  for (let h of Object.values(r.all()))
    if (eW(h) && h.status === "running" && h.frameLive?.slug === n && h.frameLive.explicit)
      r.update(h.id, (a) =>
        eW(a) && a.frameLive !== void 0
          ? {
              ...a,
              description: Xt(
                artifactViewerUrlFor({ slug: n, env: claudeAiEnvironment() }),
                !1,
                a.frameLive.armedVia,
              ),
              frameLive: { ...a.frameLive, explicit: !1 },
            }
          : a,
      );
}
/**
 * 响应停止某个监听任务：任务被用户停止时确认停止锁存、停止评论监听意图并停掉同 slug 的其他任务；否则只在任务与监听器匹配时停掉监听器。非模型发起时记录停止。返回之前是否在监听。
 */
//@ chunk-aqdf5t3e.js:26548-27039 placement
function stopWatchFromTask(e, n) {
  let live = getLiveState().live,
    s = live.supervisors.get(e)?.context.storageV5 ?? LRo();
  setLedgerStorage(s);
  let h;
  if (n.taskStop) {
    if ((getLiveState().durable.stopLatches.confirmStop(e), !isSlugYielded(e)))
      (stopCommentMonitorIntent(e, { storageV5: s }),
        import("./chunk-4te7h8m1.js").then((d) => d.notifyTakenOverSlugStopped(e)));
    let { wasWatching: wasWatching } = stopWatchesForSlug({
      slug: e,
      taskRegistry: n.taskRegistry,
      announce: !n.running,
      killRow: (d) => {
        if (d.id !== n.taskId) stopMonitorWsTasks(d.id, n.taskRegistry, { userStop: !0 });
      },
    });
    h = wasWatching;
  } else {
    if (!supervisorOwnsTask(live, e, n)) return !1;
    (removeSupervisor(live, e), (h = !0));
  }
  if (n.modelOrigin !== !0) hasWatchArtifactArg(e, s);
  return h;
}
/**
 * 停掉某 slug 的监听器与所有运行中的监听任务（可宣告结束），清除自动回复状态与被清扫标记，忘掉该 artifact 的缓存；返回之前是否在监听。
 */
//@ chunk-aqdf5t3e.js:27039-27543 placement
function stopWatchesForSlug(options) {
  let { slug: slug, taskRegistry: taskRegistry } = options,
    live = getLiveState().live,
    supervisor = live.supervisors.get(slug),
    wasWatching = (supervisor !== void 0 && !supervisor.stopped) || live.inFlightSubscribes.has(slug);
  if (supervisor?.autoReactWiring !== void 0) XBs(slug);
  let filtered = Object.values(taskRegistry.all()).filter(
    (runningTasks) =>
      eW(runningTasks) && runningTasks.status === "running" && runningTasks.frameLive?.slug === slug,
  );
  if (
    options.announce &&
    supervisor !== void 0 &&
    !supervisor.stopped &&
    filtered.length === 0 &&
    (supervisor.taskId !== void 0 || supervisor.timer !== void 0)
  )
    endStoppedWatch(live, supervisor, "watching this artifact was stopped just now");
  else removeSupervisor(live, slug);
  for (let b of filtered) ((wasWatching = !0), options.killRow(b));
  if (wasWatching && isSlugSwept(slug)) stopAutoReactForSlug(slug);
  return (forgetArtifactAndFlush(slug), { wasWatching: wasWatching });
}
//@ chunk-aqdf5t3e.js:27543-27786 placement
function supervisorOwnsTask(e, n, r) {
  let s = e.supervisors.get(n);
  if (s === void 0 || s.stopped) return !1;
  if (r.running) return s.taskId === void 0 || s.taskId === r.taskId;
  if (s.taskId === void 0 || s.taskId !== r.taskId) return !1;
  return s.timer !== void 0 || e.inFlightSubscribes.has(n);
}
/**
 * 停止并移除某 slug 的监听器，清除相关缓存，并通知头部订阅源结束。
 */
//@ chunk-aqdf5t3e.js:27786-27901 placement
function removeSupervisor(e, n) {
  let r = e.supervisors.get(n);
  if (r) (stopSupervisor(r), e.supervisors.delete(n));
  (R5n(n), Qcr(n), Ve(n)?.sourceEnded());
}
/**
 * 合并自动响应接线配置：人类回合快照时只打标记；否则用新的上下文与发布转录设置覆盖。
 */
//@ chunk-aqdf5t3e.js:27901-28130 placement
function mergeAutoReactWiring(e, n, r) {
  if (r) return { ...n, humanTurnSnapshot: !0 };
  if (e === void 0) return n;
  let { humanTurnSnapshot: humanTurnSnapshot, ...h } = n;
  return {
    ...h,
    context: e.context,
    publishTranscript: e.publishTranscript,
    ...(e.humanTurnSnapshot && { humanTurnSnapshot: !0 }),
  };
}
/**
 * 判断监督器的人类回合快照接线是否已过期（新接线不是快照或上下文不同）。
 */
//@ chunk-aqdf5t3e.js:28130-28278 placement
function isHumanTurnWiringStale(e, n, r) {
  let s = e.supervisors.get(n)?.autoReactWiring;
  return s?.humanTurnSnapshot === !0 && (r?.humanTurnSnapshot !== !0 || s.context !== r.context);
}
/**
 * 新建或更新某 slug 的实时监听器：已有时刷新活动时间、取消重连定时器、按需更新布防来源与显式标志、合并自动回复接线（新接上时广播）；没有时创建并初始化评论阅读状态。
 */
//@ chunk-aqdf5t3e.js:28278-29576 placement
function upsertSupervisor(live, options) {
  let existing = live.supervisors.get(options.slug);
  if (existing && !existing.stopped) {
    if (options.carriedVer !== void 0) existing.carriedVer = options.carriedVer;
    let h = existing.armedVia === "mcp_write";
    if (!options.machineArm) {
      if (((existing.lastActivityAt = Date.now()), existing.timer !== void 0))
        (clearTimeout(existing.timer), (existing.timer = void 0));
      if (
        ((existing.stalledSince = void 0),
        (existing.lastStalledAt = void 0),
        (existing.stallOutAfterMs = void 0),
        existing.taskId === void 0 &&
          !live.inFlightSubscribes.has(options.slug) &&
          frameLiveWatchRows(options.context, options.slug).length === 0)
      )
        ((existing.watchedSince = Date.now()),
          (existing.armedVia = options.armedVia),
          touchCommentReadState(options.slug));
      else if (options.armedVia === "publish") existing.armedVia = "publish";
      else if (existing.armedVia === "mcp_write") existing.armedVia = options.armedVia;
      if (h && existing.armedVia !== "mcp_write") emitSummonArm(live, options.slug);
    }
    if (((existing.explicit = existing.explicit || options.explicit), options.autoReactWiring !== void 0)) {
      let a = existing.autoReactWiring !== void 0;
      if (
        ((existing.autoReactWiring = mergeAutoReactWiring(
          existing.autoReactWiring,
          options.autoReactWiring,
          options.humanTurnWiring === !0,
        )),
        !a)
      )
        emitSummonArm(live, options.slug);
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
    stopped: !1,
    watchedSince: Date.now(),
    lastActivityAt: Date.now(),
    armedVia: options.armedVia,
    consecutiveFailures: 0,
    ...(options.carriedVer !== void 0 && { carriedVer: options.carriedVer }),
    ...(options.autoReactWiring !== void 0 && {
      autoReactWiring: mergeAutoReactWiring(void 0, options.autoReactWiring, options.humanTurnWiring === !0),
    }),
  };
  return (
    live.supervisors.set(options.slug, supervisor),
    touchCommentReadState(options.slug, supervisor.watchedSince),
    supervisor
  );
}
//@ chunk-aqdf5t3e.js:29636-29845 placement
function isIdleAutoWatch(e, n) {
  let { rewatchTiming: rewatchTiming } = e;
  if (rewatchTiming.idleTtlMs <= 0) return !1;
  if (n.explicit || Ar(e, n) || Date.now() - n.lastActivityAt < rewatchTiming.idleTtlMs) return !1;
  return !(
    n.autoReactWiring !== void 0 &&
    isAutoreactArmed() &&
    (!isSlugStopped(n.slug) || isSlugSwept(n.slug))
  );
}
//@ chunk-aqdf5t3e.js:29845-29928 placement
function Ar(e, n) {
  return n.slug === e.mostRecentPublishSlug && n.armedVia !== "mcp_write";
}
//@ chunk-aqdf5t3e.js:29928-29993 placement
function labelledArmedVia(e, n) {
  return e ? "watch" : n === "watch" ? "watch_stopped" : n;
}
//@ chunk-aqdf5t3e.js:29993-30048 placement
function parseArmedVia(e) {
  return BBs.find((n) => n === e) ?? "publish";
}
//@ chunk-aqdf5t3e.js:30048-31200 placement
function armedViaWording(e) {
  switch (e) {
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
/**
 * 描述空闲退役的原因：何时如何布防、超过多久没有活动。
 */
//@ chunk-aqdf5t3e.js:31200-31506 placement
function describeIdleRetirement(e, n) {
  let idle = armedViaWording(n.armedVia).idle,
    s =
      n.armedVia === "watch"
        ? "(your watch request was later stopped; idle auto-armed watches are retired)"
        : "(idle auto-armed watches are retired)";
  return `it was armed ${idle} and has seen no activity for over ${formatDuration(e.rewatchTiming.idleTtlMs, { hideTrailingZeros: !0 })} ${s}`;
}
//@ chunk-aqdf5t3e.js:31506-31563 placement
function ro(e, n, r) {
  return e === HANDSHAKE_TIMEOUT || n >= r.stallThresholdMs;
}
//@ chunk-aqdf5t3e.js:31563-31638 placement
function io(e) {
  let n = parseUpgradeRejection(e);
  return n !== null && (Y9(n.status) || n.cfMitigated);
}
//@ chunk-aqdf5t3e.js:31638-31734 placement
function oo(e) {
  return Math.max(e.stallMaxMs, e.longStallMaxMs) + 2 * vFr + e.handshakeDeadlineMs + 60000;
}
//@ chunk-aqdf5t3e.js:31734-33741 placement
function describeResumedWatchFailure(e, n, r) {
  let { uptimeMs: uptimeMs, resumeNeverOpened: resumeNeverOpened = !1, stalled: stalled = !1 } = r,
    { rewatchTiming: rewatchTiming } = e,
    b = e.supervisors.get(n);
  if (!b || b.stopped) return;
  if (getLiveState().durable.stopLatches.isStopped(n)) {
    if ((logFeatureSad("artifact_live_subscribe", "stop_latched"), resumeNeverOpened))
      endWatch(
        e,
        b,
        "the resumed live watch could not connect, so the earlier stop stays in place and comment auto-replies were not resumed",
        "could not connect",
        {
          advice: "tell the user, and call resume_replies again only if they still want auto-replies resumed",
        },
      );
    else endStoppedWatch(e, b);
    return;
  }
  if (isIdleAutoWatch(e, b)) {
    (logFeatureOk("artifact_live_subscribe", { idle_retired: !0 }),
      endWatch(e, b, describeIdleRetirement(e, b), "idle", { advice: WATCH_LATER_ADVICE, passive: !0 }));
    return;
  }
  let w = !1,
    S = !1;
  if (stalled) {
    let now = Date.now();
    if (
      b.stalledSince === void 0 ||
      b.lastStalledAt === void 0 ||
      b.stallOutAfterMs === void 0 ||
      now - b.lastStalledAt > oo(rewatchTiming)
    ) {
      ((b.stalledSince = now),
        (b.stallOutAfterMs =
          rewatchTiming.maxStallMs + Math.round(Math.random() * rewatchTiming.stallOutJitterMs)));
      let T = r.httpStatus ?? parseUpgradeRejection(r.closeCode)?.status;
      logFeatureSad("artifact_live_subscribe", "stall_run_started", {
        boot: r.closeCode === void 0,
        ...(T !== void 0 && { http_status: T }),
      });
    } else S = !0;
    ((b.lastStalledAt = now), (w = now - b.stalledSince >= b.stallOutAfterMs));
  } else if (
    ((b.stalledSince = void 0),
    (b.lastStalledAt = void 0),
    (b.stallOutAfterMs = void 0),
    uptimeMs >= rewatchTiming.minUptimeMs)
  )
    b.consecutiveFailures = 0;
  else if (r.reuseRefused !== !0) b.consecutiveFailures++;
  if (b.consecutiveFailures > rewatchTiming.maxConsecutiveFailures || w) {
    if (w) logFeatureSad("artifact_live_subscribe", "rewatch_gave_up", { stalled: !0 });
    else logFeatureSad("artifact_live_subscribe", "rewatch_gave_up");
    endWatch(e, b, "the live connection kept failing and reconnecting has stopped", CONNECTION_LOST_PHRASE, {
      advice: NO_AUTO_RETURN_ADVICE,
      passive: !0,
    });
    return;
  }
  let R = isFrameLiveTokenLeaseEnabled(),
    C =
      stalled &&
      S &&
      (parseUpgradeRejection(r.closeCode)?.cfMitigated === !0 ||
        !R ||
        b.lease === void 0 ||
        !isLiveTokenFresh(
          b.lease,
          rewatchTiming,
          getLiveState().accountEpoch,
          Date.now() + rewatchTiming.stallMinMs,
        )),
    G =
      uptimeMs > 0 &&
      uptimeMs >= rewatchTiming.minUptimeMs &&
      r.closeCode !== void 0 &&
      !(r.expired === !0 && b.transport !== "sync"),
    L = computeReconnectDelay({
      timing: rewatchTiming,
      consecutiveFailures: b.consecutiveFailures,
      leaseMode: R,
      stalled: stalled,
      longStall: C,
      spread: G,
    });
  if (R && G && r.expired !== !0) b.spreadReconnect = !0;
  if (b.timer !== void 0) clearTimeout(b.timer);
  ((b.timer = setTimeout(rewatchSupervisor, L, e, n)), b.timer.unref?.(), (b.nextRewatchAt = Date.now() + L));
}
/**
 * 结束一个监听：移除监听器（未被停止锁存时记结束结果，自动回复的交还接管），处理恢复宣告的放弃回调；非 MCP 写入布防时向主会话发送"监听已结束"的任务通知（附原因与建议）。
 */
//@ chunk-aqdf5t3e.js:33741-34559 placement
function endWatch(
  live,
  supervisor,
  reason,
  shortReason,
  { advice: advice = "watch it again if you still need that", passive: passive = !1 } = {},
) {
  if (live.supervisors.get(supervisor.slug) === supervisor) {
    if (
      (removeSupervisor(live, supervisor.slug),
      !getLiveState().durable.stopLatches.isStopped(supervisor.slug))
    ) {
      if ((Dr(live, supervisor.slug, "ended", shortReason), supervisor.autoReactWiring !== void 0))
        import("./chunk-4te7h8m1.js").then((w) => w.handBackTakenOverSlug(supervisor.slug));
    }
  } else stopSupervisor(supervisor);
  let resumeAnnounce = supervisor.resumeAnnounce;
  if (resumeAnnounce !== void 0) ((supervisor.resumeAnnounce = void 0), resumeAnnounce.onGiveUp());
  if (supervisor.armedVia === "mcp_write") return;
  let b = quoteArtifactName(() => supervisor.autoReactWiring?.title, supervisor.url);
  enqueuePendingNotification({
    value: formatTaskNotification({
      taskType: ARTIFACT_WATCH_LIFECYCLE,
      summary: escapeXml(h6s(b, shortReason)),
      body: `
<event>${escapeXml(`Watch on ${supervisor.url} ended \u2014 ${reason}. This session no longer keeps track of new versions of it; ${advice}.`)}</event>`,
    }),
    mode: "task-notification",
    ...(passive && { passive: !0 }),
    priority: "next",
    origin: {
      kind: "task-notification",
      source: ARTIFACT_WATCH_LIFECYCLE,
      slug: supervisor.slug,
      displayName: b,
      watchEnded: !0,
    },
    agentId: mainAgentId(),
  });
}
/**
 * 以"本会话早先已停止监视"为由结束监视，并建议除非用户要求不要再监视。
 */
//@ chunk-aqdf5t3e.js:34559-34744 placement
function endStoppedWatch(e, n, r = "watching this artifact was stopped earlier in this session") {
  ((n.resumeAnnounce = void 0),
    endWatch(e, n, r, "stopped", { advice: "do not watch it again unless the user asks you to" }));
}
/**
 * 布防被跳过时的统一处理：必要时描述恢复失败、记录布防失败，返回 skipped 结果（可带不可用与 HTTP 状态）。
 */
//@ chunk-aqdf5t3e.js:34744-34946 placement
function skipArm(e, n, r, s, h, { unavailable: a = !1, httpStatus: d } = {}) {
  return (
    describeSkippedResume(e, n, r, { unavailable: a, httpStatus: d }),
    recordArmFailure(e, n, r, s, h),
    {
      outcome: "skipped",
      reason: s,
      ...(a && { unavailable: !0 }),
      ...(a && d !== void 0 && { httpStatus: d }),
    }
  );
}
/**
 * 恢复监视被跳过时，若监督器仍在且没有定时器，则报告恢复失败（可带停滞与 HTTP 状态）。
 */
//@ chunk-aqdf5t3e.js:34946-35144 placement
function describeSkippedResume(e, n, r, { unavailable: s = !1, httpStatus: h } = {}) {
  if (r) return;
  let a = e.supervisors.get(n);
  if (a !== void 0 && !a.stopped && a.timer === void 0)
    describeResumedWatchFailure(e, n, { uptimeMs: 0, stalled: s, ...(h !== void 0 && { httpStatus: h }) });
}
/**
 * 重连定时器到点后重新布防监听：已停止锁存的结束监听；否则以机器布防方式重新订阅，连接类失败记录并描述，其他跳过原因则结束监听并给出建议。
 */
//@ chunk-aqdf5t3e.js:35144-36316 placement
async function rewatchSupervisor(live, slug) {
  let supervisor = live.supervisors.get(slug);
  if (!supervisor || supervisor.stopped) return;
  if (((supervisor.timer = void 0), getLiveState().durable.stopLatches.isStopped(slug))) {
    (logFeatureSad("artifact_live_subscribe", "stop_latched"), endStoppedWatch(live, supervisor));
    return;
  }
  if (supervisor.autoReactWiring !== void 0 && isSlugStopped(slug) && !isSlugSwept(slug))
    delete supervisor.autoReactWiring;
  logFeatureOk("artifact_live_subscribe", { rewatch_attempt: !0 });
  let result = await FrameLiveWatchManager(live, {
    slug: supervisor.slug,
    url: supervisor.url,
    getKnownVer: supervisor.getKnownVer,
    ownPublishes: supervisor.ownPublishes,
    context: supervisor.context,
    signal: supervisor.abort.signal,
    machineArm: !0,
    seedKnownVerFromBoot: !0,
    ...(supervisor.carriedVer !== void 0 && { seedSurfacedVer: supervisor.carriedVer }),
    ...(supervisor.autoReactWiring !== void 0 && { autoReactWiring: supervisor.autoReactWiring }),
  });
  if (result.outcome === "skipped" && result.reason === "stop_latched") return;
  if (supervisor.stopped || live.supervisors.get(slug) !== supervisor) {
    if (result.outcome === "skipped")
      describeSkippedResume(live, slug, void 0, {
        unavailable: result.unavailable === !0,
        httpStatus: result.httpStatus,
      });
    return;
  }
  if (result.outcome === "skipped")
    if (
      result.reason === "boot_failed" ||
      result.reason === "ws_open_error" ||
      result.reason === "sync_unavailable"
    )
      ((supervisor.lastFailure = result.reason),
        describeResumedWatchFailure(live, slug, {
          uptimeMs: 0,
          stalled: result.unavailable === !0,
          ...(result.httpStatus !== void 0 && { httpStatus: result.httpStatus }),
        }));
    else
      (logFeatureSad("artifact_live_subscribe", `rewatch_stopped_${result.reason}`),
        endWatch(
          live,
          supervisor,
          frameLiveSkipReasonPhrase(result.reason) ?? result.reason,
          SKIP_REASON_PHRASES[result.reason] ?? COULD_NOT_RECONNECT_PHRASE,
          getEndWatchAdvice(result.reason),
        ));
}
//@ chunk-aqdf5t3e.js:36316-37357 placement
async function describeSubscribeFailure(e, n) {
  let r = e.supervisors.get(n),
    s = r?.lease;
  if (!isFrameLiveTokenLeaseEnabled() || r === void 0 || r.stopped || s === void 0 || s.probed) return;
  s.probed = !0;
  let h;
  try {
    h = await fetchArtifactBoot({ slug: n, env: claudeAiEnvironment() }, r.abort.signal, {
      agentPeer: ct(n),
      syncLive: ct(n),
      watchBoot: !0,
      credentials: r.context.credentials,
    });
  } catch {
    return;
  }
  if (e.supervisors.get(n) !== r || r.stopped) return;
  let a =
    h.err === null
      ? h.assetToken === void 0
        ? "public_outside_org"
        : void 0
      : h.status === 404
        ? "not_found"
        : B5(h)
          ? "other_org"
          : void 0;
  if (a !== void 0) {
    (logFeatureSad("artifact_live_subscribe", `read_stopped_${a}`),
      endWatch(e, r, frameLiveSkipReasonPhrase(a) ?? a, SKIP_REASON_PHRASES[a] ?? a, {
        advice: noRewatchAdvice(a),
      }));
    for (let w of Object.values(r.context.taskRegistry.all()))
      if (eW(w) && w.status === "running" && w.frameLive?.slug === n)
        stopMonitorWsTasks(w.id, r.context.taskRegistry, { quiet: !0 });
    return;
  }
  if (h.err === null && getLiveSubscriptionToken(h.data) !== void 0) {
    logFeatureOk("artifact_live_subscribe", { read_refused_boot_ok: !0 });
    return;
  }
  let d = h.err === null ? "tokenless" : (h.status ?? h.errorCode);
  if (
    (logFeatureSad("artifact_live_subscribe", `read_refused_boot_${d}`),
    (d === "tokenless" || (typeof d === "number" && d < 500 && d !== 408 && d !== 429)) && r.lease === s)
  )
    (delete r.lease, delete r.renewable);
}
//@ chunk-aqdf5t3e.js:37357-37430 placement
function kr(e) {
  return toWebSocketUrl(new URL(`/edge-api/frame-live/${e}/ws`, aCi()));
}
//@ chunk-aqdf5t3e.js:37430-37439 placement
var ao = 8;
/**
 * 为实时订阅创建事件处理：comment 事件刷新活动并在自动回复开启时安排线程扫描；ver 事件过滤掉自己发布的、已知的、发布中的版本并限速，记下新版本后回调 onSurfaced。
 */
//@ chunk-aqdf5t3e.js:37439-38633 placement
function createLiveEventHandlers(options) {
  let {
      slug: slug,
      url: url,
      ownPublishes: ownPublishes,
      getKnownVer: getKnownVer,
      autoReact: autoReact,
      onSurfaced: onSurfaced,
    } = options,
    surfacedVers = options.surfacedVers ?? [];
  function w(y) {
    if ((surfacedVers.push(y), surfacedVers.length > ao)) surfacedVers.shift();
  }
  if (options.seedSurfacedVer !== void 0 && !surfacedVers.includes(options.seedSurfacedVer))
    w(options.seedSurfacedVer);
  let S = createTokenBucket(BUCKET_CAPACITY, TOKEN_REFILL_MS),
    R = !1,
    C = !1;
  function G() {
    if ((touchSupervisorActivity(slug), zFs(slug), autoReact && isAutoreactArmed()))
      scheduleThreadScan({
        slug: slug,
        url: url,
        env: autoReact.env,
        tool: autoReact.tool,
        context: autoReact.context,
        ...(autoReact.publishTranscript !== void 0 && { publishTranscript: autoReact.publishTranscript }),
        ...(autoReact.getWiring !== void 0 && { getWiring: autoReact.getWiring }),
        abort: autoReact.abort,
        notify: autoReact.notify,
        ...(autoReact.getTitle !== void 0 && { getTitle: autoReact.getTitle }),
        ...(autoReact.onReadRefused !== void 0 && { onReadRefused: autoReact.onReadRefused }),
      });
  }
  function L(y, T) {
    if (!y || !VER_SHAPE.test(y)) return;
    if (options.presenceOnly?.()) return;
    if ((recordHeardVersion(slug, y), surfacedVers.includes(y))) return;
    let P = T === "sync" && { via_sync: !0 };
    if (isOwnPublishedVer(ownPublishes, slug, y)) {
      (logFeatureOk("artifact_live_subscribe", {
        ...(R ? { suppressed_own: !0 } : { suppressed_catch_up: !0 }),
        ...P,
      }),
        (R = !0));
      return;
    }
    if (y === getKnownVer()) return;
    if (isPublishInFlight(ownPublishes, slug)) {
      logFeatureOk("artifact_live_subscribe", { suppressed_in_flight: !0, ...P });
      return;
    }
    if (!S.tryConsume()) {
      if (!C) ((C = !0), logFeatureSad("artifact_live_subscribe", "ver_rate_suppressed", { ...P }));
      return;
    }
    ((C = !1), w(y));
    try {
      onSurfaced?.(y);
    } catch {}
    logFeatureOk("artifact_live_subscribe", { surfaced: !0, passive: PASSIVE === "passive", ...P });
  }
  return { comment: G, ver: L };
}
//@ chunk-aqdf5t3e.js:58569-59765 placement
var AUTO_REPLIES_ARMED_TOKEN = "auto-replies armed",
  AUTO_REPLIES_PAUSED_ROW =
    "auto-replies paused by the user's interrupt (Ctrl+C or Stop) \u2014 the user's next message resumes them, as does a publish of this artifact the user asks for or an asked-for resume (publishing it without being asked, while handling a notification or a wake-up, leaves them paused); comments sent to Claude meanwhile are answered then; no comment notifications arrive until then (do not republish or resume just to re-enable them)",
  AUTO_REPLIES_YIELDED_ROW =
    "auto-replies handed to another session of this conversation (the user reopened the conversation there, or published there) \u2014 that session answers the comments now; a publish of this artifact the user asks for here, or resume_replies when the user asks for it, takes them back (do not republish or call resume_replies just to take them back unless the user asks \u2014 the user asking is not itself the take-back); no comment notifications arrive here meanwhile",
  AUTO_REPLIES_DECLINED_ROW =
    "auto mode did not approve the last comment's auto-reply; the next comment is checked again unless repeated refusals pause the thread",
  AUTO_REPLIES_DENIED_ROW =
    "a permission rule or setting blocked the last comment's auto-reply (no notice); later comments are still checked";
//@ chunk-aqdf5t3e.js:59765-60016 placement
function commentNotifyNote() {
  return Xb()
    ? `; a comment on it sent to Claude reaches this session while this artifact's status row says ${AUTO_REPLIES_ARMED_TOKEN}, and plain comments never notify \u2014 read them with ${pickByToolset('action "comments"', () => `the ${commentsToolAction("comments")}`)} when asked`
    : "";
}
/**
 * 实时订阅不可用的原因文本（特性开关关闭、非主循环会话等）
 */
//@ chunk-aqdf5t3e.js:60016-62347 placement
function frameLiveSkipReasonPhrase(e) {
  switch (e) {
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
      return OTHER_ORG_PHRASE_2;
    case "public_outside_org":
      return PUBLIC_OUTSIDE_ORG_NOTE;
    case "not_editor":
      return "a restored publish decision does not carry for an artifact this account cannot publish to";
    case "no_subscription_token":
      return "the control plane minted no live-channel credential for this artifact";
    case "boot_failed":
      return "the artifact could not be read right now (network or auth); try again later";
    case "watch_cap":
      return `this session already holds its maximum of ${FT} artifact watches and none could make room (each is a watch you requested, the artifact you most recently published, or one auto-replying to comments: a new publish can displace an idle one, a watch request cannot; or watch slots are still connecting); unwatch one first`;
    case "watch_cap_reconnect":
      return `this session was already holding its maximum of ${FT} artifact watches when this one tried to reconnect, and none of the other watches could make room`;
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
//@ chunk-aqdf5t3e.js:62347-64058 placement
function frameLiveSubscriptionLine(e) {
  switch (e) {
    case "arming":
      return `Live subscription: arming in the background \u2014 not connected yet, so this is not a watch until \`status\` shows it connected (you are told if it cannot connect, unless this turn is interrupted first). Once connected, this session keeps track of new versions of this artifact published elsewhere; a new version starts no turn and sends no notification${commentNotifyNote()}.`;
    case "connected":
      return `Live subscription: already connected from earlier in this session \u2014 this session keeps track of new versions of this artifact published elsewhere; a new version starts no turn and sends no notification${commentNotifyNote()}.`;
    case "publish_adopted":
      return `Live subscription: this agent holds no watch; the session that launched it takes over live updates for this artifact when this agent finishes normally \u2014 that session then keeps track of new versions of this artifact published elsewhere; a new version starts no turn and sends no notification${commentNotifyNote()}.`;
    case "publish_context":
      return "Live subscription: none \u2014 this is a print (-p), cloud, subagent, or teammate session, which does not keep track of new versions of this artifact published elsewhere (only the main conversation of a local interactive, background, or TypeScript/Python Agent SDK session does). Expected; not an error.";
    case "remote_unsupported": {
      let n = Xb();
      return `Live subscription: not supported yet from remote sessions \u2014 nothing notifies this session of new versions${n ? " or of comments sent to Claude" : ""}; re-read the artifact${n ? " (and its comments)" : ""} when the user asks.`;
    }
    default: {
      let n = frameLiveSkipReasonPhrase(e);
      return n !== null
        ? `Live subscription: skipped \u2014 ${n}.`
        : `Live subscription: skipped (${sweepResultLineText(e, 64)}).`;
    }
  }
}
//@ chunk-aqdf5t3e.js:64058-64164 placement
var FRAME_LIVE_PUBLISH_CONTEXT_BRIEF_LINE =
  "Live subscription: none in this kind of session (see the earlier publish result); not an error.";
/**
 * 监听失败/结束的短语与建议文案：未找到、其他组织、组织外公开、不会自行恢复、下次工作时再监听、实时更新已关闭。
 */
//@ chunk-aqdf5t3e.js:86647-87194 placement
var ARTIFACT_NOT_FOUND_PHRASE = "artifact not found",
  NOT_SHARED_ADVICE = "there is nothing to retry unless the artifact is shared with the user again",
  OTHER_ORG_PHRASE = "other organization",
  PUBLIC_OUTSIDE_ORG_PHRASE = "public, outside your organization",
  RETRY_AFTER_ADVICE = `there is nothing to retry until ${LOGIN_OTHER_ORG_REMEDY}`,
  READ_INSTEAD_ADVICE = "there is nothing to retry: read it with the read action instead",
  NO_AUTO_RETURN_ADVICE =
    "it will not come back on its own \u2014 watch it again only if the user asks or your current task still depends on its republishes",
  WATCH_LATER_ADVICE = "watch it again when you next work on this artifact",
  LIVE_OFF_ADVICE = "there is nothing to re-watch while live updates are switched off";
//@ chunk-aqdf5t3e.js:87194-87380 placement
function getEndWatchAdvice(e) {
  switch (e) {
    case "not_found":
    case "other_org":
    case "public_outside_org":
      return { advice: noRewatchAdvice(e) };
    case "flag_off":
      return { advice: LIVE_OFF_ADVICE, passive: !0 };
    default:
      return { advice: NO_AUTO_RETURN_ADVICE, passive: !0 };
  }
}
//@ chunk-aqdf5t3e.js:87380-87575 placement
function noRewatchAdvice(e) {
  switch (e) {
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
/**
 * 监听状态短语：连接丢失、没有实时凭据、无法重连、为其他监听腾位置，以及各跳过原因对应的短语表。
 */
//@ chunk-aqdf5t3e.js:87575-87895 placement
var CONNECTION_LOST_PHRASE = "connection lost",
  NO_LIVE_CREDENTIAL_PHRASE = "no live credential",
  COULD_NOT_RECONNECT_PHRASE = "could not reconnect",
  MADE_ROOM_PHRASE = "made room for another watch",
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

export {
  frameLiveSkipReasonPhrase,
  frameLiveSubscriptionLine,
  noRewatchAdvice,
  AUTO_REPLIES_ARMED_TOKEN,
  AUTO_REPLIES_PAUSED_ROW,
  AUTO_REPLIES_YIELDED_ROW,
  AUTO_REPLIES_DECLINED_ROW,
  AUTO_REPLIES_DENIED_ROW,
  armedViaWording,
  labelledArmedVia,
  parseArmedVia,
  FRAME_LIVE_PUBLISH_CONTEXT_BRIEF_LINE,
  noteArtifactToolActivity,
  demoteExplicitWatch,
  removeSupervisor,
  endWatch,
  NO_AUTO_RETURN_ADVICE,
  Ar,
  MADE_ROOM_PHRASE,
  stopWatchesForSlug,
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
  SKIP_REASON_PHRASES,
  rewatchSupervisor,
};
