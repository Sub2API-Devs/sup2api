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

//@ chunk-xf84t5b0.js:12774-12885 placement = requestTeammateShutdown (1)
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
function isMonitorWsTask(e) {
  return typeof e === "object" && e !== null && "type" in e && e.type === "monitor_ws";
}
//@ chunk-xf84t5b0.js:13047-13094 placement
/**
 * 记下某任务对应的 WebSocket。
 */
function rememberMonitorSocket(e, n) {
  getTaskRunState().monitorSockets.set(e, n);
}
//@ chunk-xf84t5b0.js:13094-13150 placement
/**
 * 判断某任务当前的 WebSocket 是否就是给定实例。
 */
function isSameMonitorSocket(e, n) {
  return getTaskRunState().monitorSockets.get(e) === n;
}
//@ chunk-xf84t5b0.js:13150-13313 placement
function isAutoReactArmedTask(e, isAutoreactArmed, t) {
  return (
    isMonitorWsTask(e) &&
    e.status === "running" &&
    e.autoReactArmed === true &&
    isAutoreactArmed() &&
    (t?.includeStopLatched === true ||
      !(e.autoReactSlug !== undefined && isSlugStoppedAnywhere(e.autoReactSlug)))
  );
}
//@ chunk-xf84t5b0.js:13313-13379 placement
/**
 * 判断该监视任务是否已被自动反应武装。
 */
function isAutoReactArmedMonitorTask(e) {
  return isAutoReactArmedTask(e, () => getLiveState().autoReact.enabledMemo === true);
}
//@ chunk-xf84t5b0.js:13379-13462 placement
/**
 * 该任务的 WebSocket 是否仍在连接中或已打开。
 */
function isMonitorSocketOpen(id) {
  let n = getTaskRunState().monitorSockets.get(id);
  return n !== undefined && n.readyState <= 1;
}
//@ chunk-xf84t5b0.js:13462-13484 placement
var STALE_MONITOR_GRACE_MS = 300000;
var STALE_MONITOR_TTL_MS = SUMMON_STATE_TTL_MS + STALE_MONITOR_GRACE_MS;
//@ chunk-xf84t5b0.js:13484-13702 placement
function isMonitorWsTaskLive(e, n = Date.now()) {
  let t = e.frameLive === undefined ? undefined : getLiveState().live.supervisors.get(e.frameLive.slug);
  if (!isMonitorSocketOpen(e.id) || (t?.transport !== "sync" && n - e.startTime > STALE_MONITOR_TTL_MS))
    return false;
  let expMs = t?.lease?.expMs;
  return expMs === undefined || n <= expMs + STALE_MONITOR_GRACE_MS;
}
//@ chunk-xf84t5b0.js:13702-13787 placement
/**
 * 该任务的 WebSocket 是否已打开。
 */
function isMonitorSocketOpenNow(e) {
  let n = getTaskRunState().monitorSockets.get(e);
  return n !== undefined && n.readyState === 1;
}
//@ chunk-xf84t5b0.js:13787-13942 placement
var MonitorWsTask = {
  name: "MonitorWsTask",
  type: "monitor_ws",
  async kill(e, n, t, o) {
    stopMonitorWsTasks(
      e,
      n,
      (o ?? "user") === "system"
        ? {}
        : {
            userStop: true,
            taskStop: true,
            modelOrigin: o === "parent",
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
function leaveArtifactRooms(e) {
  let n = currentRoom();
  let t = getTaskRunState().artifactRoomStopObserver?.disposeAll() ?? 0;
  let o = n?.consentRevoke?.() ?? 0;
  if ((t <= 0 && o <= 0) || n?.consentGone?.() === true) return t;
  let i =
    "The next publish of such an artifact that declares a room will ask the user before joining again; do not republish to rejoin unless the user asks.";
  let r = {
    agentId: mainAgentId(),
    value: formatTaskNotification({
      taskType: ARTIFACT_WATCH_LIFECYCLE,
      summary: escapeXml(
        t > 0
          ? `Left the live ${plural(t, "room")} of ${t} ${plural(t, "artifact")} (the user stopped background activity)`
          : `Forgot the live-room ${plural(o, "approval")} of ${o} ${plural(o, "artifact")} (the user stopped background activity)`,
      ),
      body: `
<event>${escapeXml(t > 0 ? `Page events from those artifacts' viewers will no longer arrive and room_send to them will report not_connected; every remembered room-join approval was forgotten too. ${i}` : `No room was open. ${i}`)}</event>`,
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
  if (e !== undefined) e.enqueuePendingNotification(r);
  else enqueuePendingNotification(r);
  return t;
}
//@ chunk-xf84t5b0.js:15182-15237 placement
/**
 * 注册自动反应「有意停止」的监听器。
 */
function setAutoReactDeliberateStopObserver(autoReactDeliberateStopObserver) {
  getTaskRunState().autoReactDeliberateStopObserver = autoReactDeliberateStopObserver;
}
//@ chunk-xf84t5b0.js:15237-16228 placement
function stopMonitorWsTasks(taskId, registry, t) {
  let o = registry.all()[taskId];
  if (isMonitorWsTask(o) && o.autoReactArmed === true) {
    clearSummonWakeTimers(o.autoReactSlug);
    if (o.autoReactSlug !== undefined && t?.connectionLost !== true) bumpSlugEpoch(o.autoReactSlug);
    if (
      t?.userStop === true &&
      o.autoReactSlug !== undefined &&
      (o.status === "running" || !isSlugSwept(o.autoReactSlug))
    )
      stopAutoReactForSlug(o.autoReactSlug);
  }
  if (t?.userStop === true && isMonitorWsTask(o) && o.frameLive !== undefined) {
    if (
      getTaskRunState().frameLiveUserStopObserver?.(o.frameLive.slug, {
        running: o.status === "running",
        taskId,
        taskStop: t?.taskStop === true,
        modelOrigin: t?.modelOrigin === true,
        taskRegistry: registry,
      }) === true
    )
      if (isSlugSwept(o.frameLive.slug)) stopAutoReactForSlug(o.frameLive.slug);
      else getTaskRunState().autoReactDeliberateStopObserver?.(o.frameLive.slug);
  }
  if (t?.userStop === true && isMonitorWsTask(o) && o.frameLive === undefined && o.autoReactArmed !== true) {
    getTaskRunState().liveDocUserStopObserver?.(taskId, {
      modelOrigin: t?.modelOrigin === true,
      running: o.status === "running",
    });
    getTaskRunState().artifactRoomStopObserver?.leaveByTaskId(taskId);
    getTaskRunState().artifactPresenceStopObserver?.closeByTaskId(taskId);
  }
  stopMonitorTask(taskId, registry, {
    quiet: t?.quiet,
    onKilled() {
      let i = getTaskRunState().monitorSockets.get(taskId);
      if (i) {
        getTaskRunState().monitorSockets.delete(taskId);
        i.close();
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
function stopAutoReactForSlug(e) {
  stopSummonWakes(e);
  getTaskRunState().autoReactDeliberateStopObserver?.(e);
  emitSummonArm(getLiveState().live, e);
  let n = flushCoalescedNotices(e);
  getTaskRunState().artifactRoomStopObserver?.leave(e);
  let t = removeQueuedByFilter(
    (queuedCommands) =>
      queuedCommands.origin?.kind === "task-notification" &&
      queuedCommands.origin.slug === e &&
      processQueuedCommands(queuedCommands),
  );
  collectCoalescedArtifactNotices(t, n);
  declineSweptHandOffs(t);
  if (t.some(isArtifactAutoReactNotification) || n.length > 0) clearAutoReactNoticePending(e);
  artifactWatchStopNotice(0, n);
}
//@ chunk-xf84t5b0.js:16528-16597 placement
function isArtifactAutoReactSlug(source) {
  return source === "artifact-auto-react" || source === "artifact-room";
}
//@ chunk-xf84t5b0.js:16597-16881 placement
function collectCoalescedArtifactNotices(e, n) {
  for (let t of e) {
    let origin = t.origin;
    if (
      origin?.kind === "task-notification" &&
      origin.coalesced !== undefined &&
      origin.coalesced.family !== "artifact-changed" &&
      origin.slug !== undefined &&
      origin.displayName !== undefined
    )
      n.push({
        slug: origin.slug,
        family: origin.coalesced.family,
        artifactName: origin.displayName,
        count: origin.coalesced.count,
      });
  }
}
//@ chunk-xf84t5b0.js:16881-19273 placement
function artifactWatchStopNotice(e, n = [], t) {
  if (e <= 0 && n.length === 0) return;
  let builtInArtifactHiddenForMcp = getLiveState().builtInArtifactHiddenForMcp;
  let i = plural(e, "it", "them");
  let r = plural(e, "this artifact", "these artifacts");
  let s = plural(e, "the watch is kept", "the watches are kept");
  let a =
    t?.catchUp === false
      ? ""
      : builtInArtifactHiddenForMcp
        ? ` (comments you send to Claude meanwhile reach this session ${t?.nameChordGesture === true ? "then" : plural(e, "once the watch resumes", "once the watches resume")})`
        : " (comments sent to Claude meanwhile are answered then)";
  let h =
    t?.catchUp === false
      ? ""
      : builtInArtifactHiddenForMcp
        ? ", and comments the user sent to Claude in the meantime reach you then"
        : ", and comments sent to Claude in the meantime are answered then";
  let p =
    t?.catchUp === false
      ? ""
      : builtInArtifactHiddenForMcp
        ? " (comments the user sent to Claude meanwhile reach you when that turn ends)"
        : " (comments sent to Claude meanwhile are being answered now)";
  let u = builtInArtifactHiddenForMcp ? "" : ", or resume_replies if the user asks";
  let y = `publishing without being asked, while handling a notification or a wake-up, leaves ${i} paused`;
  let S = builtInArtifactHiddenForMcp
    ? `the user can stop ${i} for good in the tasks list (/tasks, often under System tasks), and the kill-all-agents gesture stops ${i} until Claude Code restarts`
    : `the user can stop ${i} for good with \u2715 on the watch in the tasks list or the kill-all-agents gesture`;
  let v =
    t?.nameChordGesture === true
      ? `this receipt reaches you with a later turn: if that turn is the user's own typed message it has already resumed ${i}${p}, otherwise the user's next message resumes ${i} (so does a publish of ${r} the user asks for${u}; ${y})${h}; ${S}`
      : `when the user asks you to publish ${r} again, that publish resumes ${i}${u}, as does the user's next typed message \u2014 each only on hosts that pass typed input through as the user's${h}; ${y}`;
  enqueuePendingNotification({
    agentId: mainAgentId(),
    value: formatTaskNotification({
      taskType: "artifact-auto-react",
      summary: escapeXml(
        e > 0
          ? `${e} artifact ${builtInArtifactHiddenForMcp ? plural(e, "comment watch", "comment watches") : `auto-reply ${plural(e, "subscription")}`} paused ${t?.nameChordGesture === true ? "until your next message" : "by the interrupt"}${a}`
          : "Artifact auto-reply activity stopped",
      ),
      body: `
${escapeXml(
  n
    .map(stoppedAfterAutoActionsNotice)
    .concat(
      e > 0
        ? [
            `The user's interrupt paused ${i} and ${s}; ${v}. ${builtInArtifactHiddenForMcp ? `Do not republish just to resume ${i}` : "Do not republish or resume just to re-enable auto-replies"} unless the user asks.`,
          ]
        : [],
    ).join(`

`),
)}`,
    }),
    mode: "task-notification",
    skipAttachments: true,
    ...(t?.passive === true && {
      passive: true,
      priority: "next",
    }),
    origin: {
      kind: "task-notification",
      source: "artifact-auto-react-stop-disclosure",
      nonDurableStop: true,
      ...(n.length > 0 && {
        carriesDiscardRecord: true,
      }),
    },
  });
}
//@ chunk-xf84t5b0.js:19273-19373 placement
function isArtifactAutoReactNotification(e) {
  return e.origin?.kind === "task-notification" && e.origin.source === "artifact-auto-react";
}
//@ chunk-xf84t5b0.js:19373-19454 placement = processQueuedCommands (1)
function processQueuedCommands(queuedCommands) {
  return (
    queuedCommands.origin?.kind === "task-notification" &&
    isArtifactAutoReactSlug(queuedCommands.origin.source)
  );
}
//@ chunk-xf84t5b0.js:19454-19732 placement
function drainQueuedTaskNotifications(store, n) {
  let t = flushCoalescedNotices();
  for (let i of t) clearAutoReactNoticePending(i.slug);
  if (n?.leaveArtifactRooms === true) leaveArtifactRooms(store);
  let o = store.removeByFilter(processQueuedCommands);
  for (let i of o)
    if (
      i.origin?.kind === "task-notification" &&
      i.origin.source === "artifact-auto-react" &&
      i.origin.slug !== undefined
    )
      clearAutoReactNoticePending(i.origin.slug);
  collectCoalescedArtifactNotices(o, t);
  declineSweptHandOffs(o);
  return t;
}
//@ chunk-xf84t5b0.js:19732-20036 placement
/**
 * 清除已无对应任务的自动反应待处理通知，返回清除数量。
 */
function clearOrphanedAutoReactNotices(e = () => false) {
  let { pendingNoticeSlugs } = getLiveState().shareStatus;
  if (pendingNoticeSlugs.size === 0) return 0;
  let t = new Set();
  for (let i of getCommandQueue()) {
    let slug = i.origin?.kind === "task-notification" ? i.origin.slug : undefined;
    if (slug !== undefined && processQueuedCommands(i)) t.add(slug);
  }
  let o = 0;
  for (let key of [...pendingNoticeSlugs.keys()]) {
    if (t.has(key) || hasPendingNotice(key) || e(key)) continue;
    clearAutoReactNoticePending(key);
    o++;
  }
  return o;
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
function partitionStopNotifications(e) {
  declineSweptHandOffs(e);
  let n = emptyPartitionedNotifications();
  for (let t of e) {
    if (t.origin?.kind !== "task-notification") continue;
    if (t.origin.source === "artifact-auto-react-stop-disclosure") n.disclosures.push(t);
    else if (t.origin.source === "artifact-changed") n.staleRows.push(t);
    else if (t.origin.source === ARTIFACT_WATCH_LIFECYCLE) n.watchLifecycle.push(t);
  }
  return n;
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
function requeueStopNotifications(e, n, t) {
  let userDisarmed = getLiveState().autoReact.userDisarmed;
  for (let disclosure of n.disclosures) {
    let r =
      disclosure.origin?.kind === "task-notification" && disclosure.origin.carriesDiscardRecord === true;
    let s = userDisarmed && isNonDurableStopDisclosure(disclosure);
    if (r || (t === 0 && !s)) e.enqueuePendingNotification(disclosure);
  }
  for (let i of n.staleRows) e.enqueuePendingNotification(i);
  for (let i of n.watchLifecycle) e.enqueuePendingNotification(i);
}
//@ chunk-xf84t5b0.js:21006-21109 placement
function closeAllMonitorSockets() {
  for (let [e, n] of getTaskRunState().monitorSockets) {
    try {
      n.close();
    } catch {}
    getTaskRunState().monitorSockets.delete(e);
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
