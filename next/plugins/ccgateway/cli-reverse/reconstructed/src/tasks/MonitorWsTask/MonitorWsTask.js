/**
 * tasks/MonitorWsTask/MonitorWsTask.ts
 *
 * 2.1.316 新增。WebSocket 监视任务。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xf84t5b0.js (36)
 * attribution: placement 36
 */
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import {
  isSlugStoppedAnywhere,
  clearSummonWakeTimers,
  bumpSlugEpoch,
  isSlugSwept,
  stopSummonWakes,
  emitSummonArm,
} from "../../services/artifacts/summonArms.js";
import { getLiveState, currentRoom } from "../../services/liveReplica/liveReplica.js";
import {
  SUMMON_STATE_TTL_MS,
  flushCoalescedNotices,
  declineSweptHandOffs,
  hasPendingNotice,
} from "../../services/artifacts/artifactNotices.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { formatTaskNotification } from "../../utils/xmlTags.js";
import { ARTIFACT_WATCH_LIFECYCLE } from "../../constants/xml.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { plural } from "../../utils/stringUtils.js";
import {
  enqueuePendingNotification,
  removeQueuedByFilter,
  getCommandQueue,
} from "../../utils/messageQueueManager.js";
import { stopMonitorTask } from "../MonitorTask/monitorDelivery.js";
import { clearAutoReactNoticePending } from "../../services/artifacts/shareEntries.js";
import { stoppedAfterAutoActionsNotice } from "../../tools/ArtifactTool/artifactNotices.js";

//@ chunk-xf84t5b0.js:12774-12885 placement (2.1.88 match: requestTeammateShutdown, 1)
/**
 * 对属于某代理、满足谓词且运行中的任务逐个执行回调（用于代理退出时清理其任务）。
 */
function forEachRunningTaskOwnedBy(agentId, taskRegistry, predicate, callback) {
  for (let [key, task] of Object.entries(taskRegistry.all()))
    if (predicate(task) && task.agentId === agentId && task.status === "running") callback(key, taskRegistry);
}
//@ chunk-xf84t5b0.js:12885-12960 placement
/**
 * 监视任务会记录的活动类别。
 */
var MONITOR_WS_ACTIVITY_KINDS = ["publish", "attach", "watch", "resume", "session_resume", "mcp_write"];
//@ chunk-xf84t5b0.js:12960-13047 placement
/**
 * 判断对象是否为 monitor_ws 任务。
 */
function isMonitorWsTask(value) {
  return typeof value === "object" && value !== null && "type" in value && value.type === "monitor_ws";
}
//@ chunk-xf84t5b0.js:13047-13094 placement
/**
 * 记下某任务对应的 WebSocket。
 */
function rememberMonitorSocket(taskId, socket) {
  getTaskRunState().monitorSockets.set(taskId, socket);
}
//@ chunk-xf84t5b0.js:13094-13150 placement
/**
 * 判断某任务当前的 WebSocket 是否就是给定实例。
 */
function isSameMonitorSocket(taskId, socket) {
  return getTaskRunState().monitorSockets.get(taskId) === socket;
}
//@ chunk-xf84t5b0.js:13150-13313 placement
function isAutoReactArmedTask(task, isAutoreactArmed, options) {
  return (
    isMonitorWsTask(task) &&
    task.status === "running" &&
    task.autoReactArmed === true &&
    isAutoreactArmed() &&
    (options?.includeStopLatched === true ||
      !(task.autoReactSlug !== undefined && isSlugStoppedAnywhere(task.autoReactSlug)))
  );
}
//@ chunk-xf84t5b0.js:13313-13379 placement
/**
 * 判断该监视任务是否已被自动反应武装。
 */
function isAutoReactArmedMonitorTask(task) {
  return isAutoReactArmedTask(task, () => getLiveState().autoReact.enabledMemo === true);
}
//@ chunk-xf84t5b0.js:13379-13462 placement
/**
 * 该任务的 WebSocket 是否仍在连接中或已打开。
 */
function isMonitorSocketOpen(id) {
  let socket = getTaskRunState().monitorSockets.get(id);
  return socket !== undefined && socket.readyState <= 1;
}
//@ chunk-xf84t5b0.js:13462-13484 placement
var STALE_MONITOR_GRACE_MS = 300000;
var STALE_MONITOR_TTL_MS = SUMMON_STATE_TTL_MS + STALE_MONITOR_GRACE_MS;
//@ chunk-xf84t5b0.js:13484-13702 placement
function isMonitorWsTaskLive(task, nowMs = Date.now()) {
  let supervisor =
    task.frameLive === undefined ? undefined : getLiveState().live.supervisors.get(task.frameLive.slug);
  if (
    !isMonitorSocketOpen(task.id) ||
    (supervisor?.transport !== "sync" && nowMs - task.startTime > STALE_MONITOR_TTL_MS)
  )
    return false;
  let expMs = supervisor?.lease?.expMs;
  return expMs === undefined || nowMs <= expMs + STALE_MONITOR_GRACE_MS;
}
//@ chunk-xf84t5b0.js:13702-13787 placement
/**
 * 该任务的 WebSocket 是否已打开。
 */
function isMonitorSocketOpenNow(taskId) {
  let socket = getTaskRunState().monitorSockets.get(taskId);
  return socket !== undefined && socket.readyState === 1;
}
//@ chunk-xf84t5b0.js:13787-13942 placement
var MonitorWsTask = {
  name: "MonitorWsTask",
  type: "monitor_ws",
  async kill(taskId, taskRegistry, unusedThirdArg, stoppedBy) {
    stopMonitorWsTasks(
      taskId,
      taskRegistry,
      (stoppedBy ?? "user") === "system"
        ? {}
        : {
            userStop: true,
            taskStop: true,
            modelOrigin: stoppedBy === "parent",
          },
    );
  },
};
//@ chunk-xf84t5b0.js:13942-13991 placement
/**
 * 注册「用户停止实时帧」的监听器。
 */
function setFrameLiveUserStopObserver(frameLiveUserStopObserver) {
  getTaskRunState().frameLiveUserStopObserver = frameLiveUserStopObserver;
}
//@ chunk-xf84t5b0.js:13991-14041 placement
/**
 * 注册自动反应的人类回合监听器。
 */
function setAutoReactHumanTurnObserver(autoReactHumanTurnObserver) {
  getTaskRunState().autoReactHumanTurnObserver = autoReactHumanTurnObserver;
}
//@ chunk-xf84t5b0.js:14041-14093 placement
/**
 * 注册 artifact 在场停止的监听器。
 */
function setArtifactPresenceStopObserver(artifactPresenceStopObserver) {
  getTaskRunState().artifactPresenceStopObserver = artifactPresenceStopObserver;
}
//@ chunk-xf84t5b0.js:14093-14149 placement
/**
 * 停止时让 artifact room 停止监听该任务。
 */
function leaveArtifactRoomOnStop(slug) {
  getTaskRunState().artifactRoomStopObserver?.leave(slug);
}
//@ chunk-xf84t5b0.js:14149-14192 placement
/**
 * 当前 artifact 连接数。
 */
function activeArtifactConnections() {
  return currentRoom()?.conns.size ?? 0;
}
//@ chunk-xf84t5b0.js:14192-15182 placement
function leaveArtifactRooms(target) {
  let room = currentRoom();
  let disposedCount = getTaskRunState().artifactRoomStopObserver?.disposeAll() ?? 0;
  let revokedCount = room?.consentRevoke?.() ?? 0;
  if ((disposedCount <= 0 && revokedCount <= 0) || room?.consentGone?.() === true) return disposedCount;
  let rejoinHint =
    "The next publish of such an artifact that declares a room will ask the user before joining again; do not republish to rejoin unless the user asks.";
  let notification = {
    agentId: mainAgentId(),
    value: formatTaskNotification({
      taskType: ARTIFACT_WATCH_LIFECYCLE,
      summary: escapeXml(
        disposedCount > 0
          ? `Left the live ${plural(disposedCount, "room")} of ${disposedCount} ${plural(disposedCount, "artifact")} (the user stopped background activity)`
          : `Forgot the live-room ${plural(revokedCount, "approval")} of ${revokedCount} ${plural(revokedCount, "artifact")} (the user stopped background activity)`,
      ),
      body: `
<event>${escapeXml(disposedCount > 0 ? `Page events from those artifacts' viewers will no longer arrive and room_send to them will report not_connected; every remembered room-join approval was forgotten too. ${rejoinHint}` : `No room was open. ${rejoinHint}`)}</event>`,
    }),
    mode: "task-notification",
    skipAttachments: true,
    priority: "later",
    origin: {
      kind: "task-notification",
      source: ARTIFACT_WATCH_LIFECYCLE,
      roomLifecycle: true,
    },
  };
  if (target !== undefined) target.enqueuePendingNotification(notification);
  else enqueuePendingNotification(notification);
  return disposedCount;
}
//@ chunk-xf84t5b0.js:15182-15237 placement
/**
 * 注册自动反应「有意停止」的监听器。
 */
function setAutoReactDeliberateStopObserver(autoReactDeliberateStopObserver) {
  getTaskRunState().autoReactDeliberateStopObserver = autoReactDeliberateStopObserver;
}
//@ chunk-xf84t5b0.js:15237-16228 placement
function stopMonitorWsTasks(taskId, registry, options) {
  let task = registry.all()[taskId];
  if (isMonitorWsTask(task) && task.autoReactArmed === true) {
    clearSummonWakeTimers(task.autoReactSlug);
    if (task.autoReactSlug !== undefined && options?.connectionLost !== true)
      bumpSlugEpoch(task.autoReactSlug);
    if (
      options?.userStop === true &&
      task.autoReactSlug !== undefined &&
      (task.status === "running" || !isSlugSwept(task.autoReactSlug))
    )
      stopAutoReactForSlug(task.autoReactSlug);
  }
  if (options?.userStop === true && isMonitorWsTask(task) && task.frameLive !== undefined) {
    if (
      getTaskRunState().frameLiveUserStopObserver?.(task.frameLive.slug, {
        running: task.status === "running",
        taskId,
        taskStop: options?.taskStop === true,
        modelOrigin: options?.modelOrigin === true,
        taskRegistry: registry,
      }) === true
    )
      if (isSlugSwept(task.frameLive.slug)) stopAutoReactForSlug(task.frameLive.slug);
      else getTaskRunState().autoReactDeliberateStopObserver?.(task.frameLive.slug);
  }
  if (
    options?.userStop === true &&
    isMonitorWsTask(task) &&
    task.frameLive === undefined &&
    task.autoReactArmed !== true
  ) {
    getTaskRunState().liveDocUserStopObserver?.(taskId, {
      modelOrigin: options?.modelOrigin === true,
      running: task.status === "running",
    });
    getTaskRunState().artifactRoomStopObserver?.leaveByTaskId(taskId);
    getTaskRunState().artifactPresenceStopObserver?.closeByTaskId(taskId);
  }
  stopMonitorTask(taskId, registry, {
    quiet: options?.quiet,
    onKilled() {
      let socket = getTaskRunState().monitorSockets.get(taskId);
      if (socket) {
        getTaskRunState().monitorSockets.delete(taskId);
        socket.close();
      }
    },
  });
}
//@ chunk-xf84t5b0.js:16228-16265 placement
/**
 * 停止某 slug 的自动反应：清唤醒定时器、bump 纪元并停掉。
 */
function stopAutoReactForSlugNow(slug) {
  clearSummonWakeTimers(slug);
  bumpSlugEpoch(slug);
  stopAutoReactForSlug(slug);
}
//@ chunk-xf84t5b0.js:16265-16528 placement
function stopAutoReactForSlug(slug) {
  stopSummonWakes(slug);
  getTaskRunState().autoReactDeliberateStopObserver?.(slug);
  emitSummonArm(getLiveState().live, slug);
  let coalesced = flushCoalescedNotices(slug);
  getTaskRunState().artifactRoomStopObserver?.leave(slug);
  let removed = removeQueuedByFilter(
    (queuedCommands) =>
      queuedCommands.origin?.kind === "task-notification" &&
      queuedCommands.origin.slug === slug &&
      processQueuedCommands(queuedCommands),
  );
  collectCoalescedArtifactNotices(removed, coalesced);
  declineSweptHandOffs(removed);
  if (removed.some(isArtifactAutoReactNotification) || coalesced.length > 0)
    clearAutoReactNoticePending(slug);
  artifactWatchStopNotice(0, coalesced);
}
//@ chunk-xf84t5b0.js:16528-16597 placement
function isArtifactAutoReactSlug(source) {
  return source === "artifact-auto-react" || source === "artifact-room";
}
//@ chunk-xf84t5b0.js:16597-16881 placement
function collectCoalescedArtifactNotices(notifications, into) {
  for (let notification of notifications) {
    let origin = notification.origin;
    if (
      origin?.kind === "task-notification" &&
      origin.coalesced !== undefined &&
      origin.coalesced.family !== "artifact-changed" &&
      origin.slug !== undefined &&
      origin.displayName !== undefined
    )
      into.push({
        slug: origin.slug,
        family: origin.coalesced.family,
        artifactName: origin.displayName,
        count: origin.coalesced.count,
      });
  }
}
//@ chunk-xf84t5b0.js:16881-19273 placement
function artifactWatchStopNotice(count, discardRecords = [], options) {
  if (count <= 0 && discardRecords.length === 0) return;
  let builtInArtifactHiddenForMcp = getLiveState().builtInArtifactHiddenForMcp;
  let itPronoun = plural(count, "it", "them");
  let artifactNoun = plural(count, "this artifact", "these artifacts");
  let watchKeptText = plural(count, "the watch is kept", "the watches are kept");
  let summarySuffix =
    options?.catchUp === false
      ? ""
      : builtInArtifactHiddenForMcp
        ? ` (comments you send to Claude meanwhile reach this session ${options?.nameChordGesture === true ? "then" : plural(count, "once the watch resumes", "once the watches resume")})`
        : " (comments sent to Claude meanwhile are answered then)";
  let bodySuffix =
    options?.catchUp === false
      ? ""
      : builtInArtifactHiddenForMcp
        ? ", and comments the user sent to Claude in the meantime reach you then"
        : ", and comments sent to Claude in the meantime are answered then";
  let resumeSuffix =
    options?.catchUp === false
      ? ""
      : builtInArtifactHiddenForMcp
        ? " (comments the user sent to Claude meanwhile reach you when that turn ends)"
        : " (comments sent to Claude meanwhile are being answered now)";
  let resumeRepliesText = builtInArtifactHiddenForMcp ? "" : ", or resume_replies if the user asks";
  let republishWarning = `publishing without being asked, while handling a notification or a wake-up, leaves ${itPronoun} paused`;
  let stopAdvice = builtInArtifactHiddenForMcp
    ? `the user can stop ${itPronoun} for good in the tasks list (/tasks, often under System tasks), and the kill-all-agents gesture stops ${itPronoun} until Claude Code restarts`
    : `the user can stop ${itPronoun} for good with \u2715 on the watch in the tasks list or the kill-all-agents gesture`;
  let resumeExplanation =
    options?.nameChordGesture === true
      ? `this receipt reaches you with a later turn: if that turn is the user's own typed message it has already resumed ${itPronoun}${resumeSuffix}, otherwise the user's next message resumes ${itPronoun} (so does a publish of ${artifactNoun} the user asks for${resumeRepliesText}; ${republishWarning})${bodySuffix}; ${stopAdvice}`
      : `when the user asks you to publish ${artifactNoun} again, that publish resumes ${itPronoun}${resumeRepliesText}, as does the user's next typed message \u2014 each only on hosts that pass typed input through as the user's${bodySuffix}; ${republishWarning}`;
  enqueuePendingNotification({
    agentId: mainAgentId(),
    value: formatTaskNotification({
      taskType: "artifact-auto-react",
      summary: escapeXml(
        count > 0
          ? `${count} artifact ${builtInArtifactHiddenForMcp ? plural(count, "comment watch", "comment watches") : `auto-reply ${plural(count, "subscription")}`} paused ${options?.nameChordGesture === true ? "until your next message" : "by the interrupt"}${summarySuffix}`
          : "Artifact auto-reply activity stopped",
      ),
      body: `
${escapeXml(
  discardRecords
    .map(stoppedAfterAutoActionsNotice)
    .concat(
      count > 0
        ? [
            `The user's interrupt paused ${itPronoun} and ${watchKeptText}; ${resumeExplanation}. ${builtInArtifactHiddenForMcp ? `Do not republish just to resume ${itPronoun}` : "Do not republish or resume just to re-enable auto-replies"} unless the user asks.`,
          ]
        : [],
    ).join(`

`),
)}`,
    }),
    mode: "task-notification",
    skipAttachments: true,
    ...(options?.passive === true && {
      passive: true,
      priority: "next",
    }),
    origin: {
      kind: "task-notification",
      source: "artifact-auto-react-stop-disclosure",
      nonDurableStop: true,
      ...(discardRecords.length > 0 && {
        carriesDiscardRecord: true,
      }),
    },
  });
}
//@ chunk-xf84t5b0.js:19273-19373 placement
function isArtifactAutoReactNotification(notification) {
  return (
    notification.origin?.kind === "task-notification" && notification.origin.source === "artifact-auto-react"
  );
}
//@ chunk-xf84t5b0.js:19373-19454 placement (2.1.88 match: processQueuedCommands, 1)
function processQueuedCommands(queuedCommands) {
  return (
    queuedCommands.origin?.kind === "task-notification" &&
    isArtifactAutoReactSlug(queuedCommands.origin.source)
  );
}
//@ chunk-xf84t5b0.js:19454-19732 placement
function drainQueuedTaskNotifications(target, options) {
  let coalesced = flushCoalescedNotices();
  for (let notice of coalesced) clearAutoReactNoticePending(notice.slug);
  if (options?.leaveArtifactRooms === true) leaveArtifactRooms(target);
  let removed = target.removeByFilter(processQueuedCommands);
  for (let notification of removed)
    if (
      notification.origin?.kind === "task-notification" &&
      notification.origin.source === "artifact-auto-react" &&
      notification.origin.slug !== undefined
    )
      clearAutoReactNoticePending(notification.origin.slug);
  collectCoalescedArtifactNotices(removed, coalesced);
  declineSweptHandOffs(removed);
  return coalesced;
}
//@ chunk-xf84t5b0.js:19732-20036 placement
/**
 * 清除已无对应任务的自动反应待处理通知，返回清除数量。
 */
function clearOrphanedAutoReactNotices(shouldKeep = () => false) {
  let { pendingNoticeSlugs } = getLiveState().shareStatus;
  if (pendingNoticeSlugs.size === 0) return 0;
  let stillReferenced = new Set();
  for (let notification of getCommandQueue()) {
    let slug = notification.origin?.kind === "task-notification" ? notification.origin.slug : undefined;
    if (slug !== undefined && processQueuedCommands(notification)) stillReferenced.add(slug);
  }
  let clearedCount = 0;
  for (let key of [...pendingNoticeSlugs.keys()]) {
    if (stillReferenced.has(key) || hasPendingNotice(key) || shouldKeep(key)) continue;
    clearAutoReactNoticePending(key);
    clearedCount++;
  }
  return clearedCount;
}
//@ chunk-xf84t5b0.js:20036-20105 placement
/**
 * 分区通知结果的空值（披露、过期行、监视生命周期）。
 */
function emptyPartitionedNotifications() {
  return {
    disclosures: [],
    staleRows: [],
    watchLifecycle: [],
  };
}
//@ chunk-xf84t5b0.js:20105-20412 placement
/**
 * 把停止相关的任务通知按来源分为说明披露与过期行等类别。
 */
function partitionStopNotifications(notifications) {
  declineSweptHandOffs(notifications);
  let partitioned = emptyPartitionedNotifications();
  for (let notification of notifications) {
    if (notification.origin?.kind !== "task-notification") continue;
    if (notification.origin.source === "artifact-auto-react-stop-disclosure")
      partitioned.disclosures.push(notification);
    else if (notification.origin.source === "artifact-changed") partitioned.staleRows.push(notification);
    else if (notification.origin.source === ARTIFACT_WATCH_LIFECYCLE)
      partitioned.watchLifecycle.push(notification);
  }
  return partitioned;
}
//@ chunk-xf84t5b0.js:20412-20593 placement
function isNonDurableStopDisclosure(disclosure) {
  return (
    disclosure.origin?.kind === "task-notification" &&
    disclosure.origin.source === "artifact-auto-react-stop-disclosure" &&
    disclosure.origin.nonDurableStop === true &&
    disclosure.origin.carriesDiscardRecord !== true
  );
}
//@ chunk-xf84t5b0.js:20593-20668 placement
/**
 * 用户解除自动反应后，丢弃不可持久的停止披露。
 */
function dropNonDurableStopDisclosures(store) {
  if (!getLiveState().autoReact.userDisarmed) return;
  store.removeByFilter(isNonDurableStopDisclosure);
}
//@ chunk-xf84t5b0.js:20668-21006 placement
/**
 * 把停止通知重新排入队列，用户已解除自动反应时丢弃相应披露。
 */
function requeueStopNotifications(queue, partitioned, clearedCount) {
  let userDisarmed = getLiveState().autoReact.userDisarmed;
  for (let disclosure of partitioned.disclosures) {
    let carriesDiscard =
      disclosure.origin?.kind === "task-notification" && disclosure.origin.carriesDiscardRecord === true;
    let isNonDurable = userDisarmed && isNonDurableStopDisclosure(disclosure);
    if (carriesDiscard || (clearedCount === 0 && !isNonDurable)) queue.enqueuePendingNotification(disclosure);
  }
  for (let notification of partitioned.staleRows) queue.enqueuePendingNotification(notification);
  for (let notification of partitioned.watchLifecycle) queue.enqueuePendingNotification(notification);
}
//@ chunk-xf84t5b0.js:21006-21109 placement
function closeAllMonitorSockets() {
  for (let [taskId, socket] of getTaskRunState().monitorSockets) {
    try {
      socket.close();
    } catch {}
    getTaskRunState().monitorSockets.delete(taskId);
  }
}
//@ chunk-xf84t5b0.js:21109-21140 placement
/**
 * 停止某归属者名下正在运行的监视任务。
 */
function stopOwnedMonitorTasks(agentId, taskRegistry) {
  forEachRunningTaskOwnedBy(agentId, taskRegistry, isMonitorWsTask, stopMonitorWsTasks);
}
export {
  stopOwnedMonitorTasks,
  isMonitorSocketOpenNow,
  processQueuedCommands,
  artifactWatchStopNotice,
  drainQueuedTaskNotifications,
  activeArtifactConnections,
  emptyPartitionedNotifications,
  partitionStopNotifications,
  leaveArtifactRooms,
  dropNonDurableStopDisclosures,
  requeueStopNotifications,
  stopMonitorWsTasks,
  isAutoReactArmedMonitorTask,
  isMonitorWsTask,
  isMonitorWsTaskLive,
  isAutoReactArmedTask,
  clearOrphanedAutoReactNotices,
  closeAllMonitorSockets,
  setFrameLiveUserStopObserver,
  setAutoReactDeliberateStopObserver,
  setAutoReactHumanTurnObserver,
  setArtifactPresenceStopObserver,
  stopAutoReactForSlugNow,
  stopAutoReactForSlug,
  MONITOR_WS_ACTIVITY_KINDS,
  isSameMonitorSocket,
  rememberMonitorSocket,
  MonitorWsTask,
  leaveArtifactRoomOnStop,
};
