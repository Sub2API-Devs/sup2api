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
import { getLiveState, ITn } from "../../services/liveReplica/liveReplica.js";
import {
  PLr,
  flushCoalescedNotices,
  declineSweptHandOffs,
  hasPendingNotice,
} from "../../services/artifacts/artifactNotices.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { formatTaskNotification } from "../../utils/xmlTags.js";
import { ARTIFACT_WATCH_LIFECYCLE } from "../../constants/xml.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { plural } from "../../utils/stringUtils.js";
import { enqueuePendingNotification, kb, oO } from "../../utils/messageQueueManager.js";
import { stopMonitorTask } from "../MonitorTask/monitorDelivery.js";
import { clearAutoReactNoticePending } from "../../services/artifacts/shareEntries.js";
import { stoppedAfterAutoActionsNotice } from "../../tools/ArtifactTool/artifactNotices.js";

/**
 * 对属于某代理、满足谓词且运行中的任务逐个执行回调（用于代理退出时清理其任务）。
 */
//@ chunk-xf84t5b0.js:12774-12885 placement = requestTeammateShutdown (1)
function forEachRunningTaskOwnedBy(agentId, taskRegistry, predicate, callback) {
  for (let [i, r] of Object.entries(taskRegistry.all()))
    if (predicate(r) && r.agentId === agentId && r.status === "running") callback(i, taskRegistry);
}
//@ chunk-xf84t5b0.js:12885-12960 placement
var BBs = ["publish", "attach", "watch", "resume", "session_resume", "mcp_write"];
//@ chunk-xf84t5b0.js:12960-13047 placement
function eW(e) {
  return typeof e === "object" && e !== null && "type" in e && e.type === "monitor_ws";
}
//@ chunk-xf84t5b0.js:13047-13094 placement
function jBs(e, n) {
  getTaskRunState().monitorSockets.set(e, n);
}
//@ chunk-xf84t5b0.js:13094-13150 placement
function LLr(e, n) {
  return getTaskRunState().monitorSockets.get(e) === n;
}
//@ chunk-xf84t5b0.js:13150-13313 placement
function isAutoReactArmedTask(e, n, t) {
  return (
    eW(e) &&
    e.status === "running" &&
    e.autoReactArmed === !0 &&
    n() &&
    (t?.includeStopLatched === !0 || !(e.autoReactSlug !== void 0 && isSlugStoppedAnywhere(e.autoReactSlug)))
  );
}
//@ chunk-xf84t5b0.js:13313-13379 placement
function Xye(e) {
  return isAutoReactArmedTask(e, () => getLiveState().autoReact.enabledMemo === !0);
}
//@ chunk-xf84t5b0.js:13379-13462 placement
function be(e) {
  let n = getTaskRunState().monitorSockets.get(e);
  return n !== void 0 && n.readyState <= 1;
}
//@ chunk-xf84t5b0.js:13462-13484 placement
var V = 300000,
  ve = PLr + V;
//@ chunk-xf84t5b0.js:13484-13702 placement
function isMonitorWsTaskLive(e, n = Date.now()) {
  let t = e.frameLive === void 0 ? void 0 : getLiveState().live.supervisors.get(e.frameLive.slug);
  if (!be(e.id) || (t?.transport !== "sync" && n - e.startTime > ve)) return !1;
  let o = t?.lease?.expMs;
  return o === void 0 || n <= o + V;
}
//@ chunk-xf84t5b0.js:13702-13787 placement
function LFt(e) {
  let n = getTaskRunState().monitorSockets.get(e);
  return n !== void 0 && n.readyState === 1;
}
//@ chunk-xf84t5b0.js:13787-13942 placement
var MonitorWsTask = {
  name: "MonitorWsTask",
  type: "monitor_ws",
  async kill(e, n, t, o) {
    stopMonitorWsTasks(
      e,
      n,
      (o ?? "user") === "system" ? {} : { userStop: !0, taskStop: !0, modelOrigin: o === "parent" },
    );
  },
};
//@ chunk-xf84t5b0.js:13942-13991 placement
function GBs(e) {
  getTaskRunState().frameLiveUserStopObserver = e;
}
//@ chunk-xf84t5b0.js:13991-14041 placement
function zBs(e) {
  getTaskRunState().autoReactHumanTurnObserver = e;
}
//@ chunk-xf84t5b0.js:14041-14093 placement
function KBs(e) {
  getTaskRunState().artifactPresenceStopObserver = e;
}
//@ chunk-xf84t5b0.js:14093-14149 placement
function VBs(e) {
  getTaskRunState().artifactRoomStopObserver?.leave(e);
}
//@ chunk-xf84t5b0.js:14149-14192 placement
function qBs() {
  return ITn()?.conns.size ?? 0;
}
//@ chunk-xf84t5b0.js:14192-15182 placement
function leaveArtifactRooms(e) {
  let n = ITn(),
    t = getTaskRunState().artifactRoomStopObserver?.disposeAll() ?? 0,
    o = n?.consentRevoke?.() ?? 0;
  if ((t <= 0 && o <= 0) || n?.consentGone?.() === !0) return t;
  let i =
      "The next publish of such an artifact that declares a room will ask the user before joining again; do not republish to rejoin unless the user asks.",
    r = {
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
      skipAttachments: !0,
      priority: "later",
      origin: { kind: "task-notification", source: ARTIFACT_WATCH_LIFECYCLE, roomLifecycle: !0 },
    };
  if (e !== void 0) e.enqueuePendingNotification(r);
  else enqueuePendingNotification(r);
  return t;
}
//@ chunk-xf84t5b0.js:15182-15237 placement
function YBs(e) {
  getTaskRunState().autoReactDeliberateStopObserver = e;
}
//@ chunk-xf84t5b0.js:15237-16228 placement
function stopMonitorWsTasks(e, n, t) {
  let o = n.all()[e];
  if (eW(o) && o.autoReactArmed === !0) {
    if ((clearSummonWakeTimers(o.autoReactSlug), o.autoReactSlug !== void 0 && t?.connectionLost !== !0))
      bumpSlugEpoch(o.autoReactSlug);
    if (
      t?.userStop === !0 &&
      o.autoReactSlug !== void 0 &&
      (o.status === "running" || !isSlugSwept(o.autoReactSlug))
    )
      stopAutoReactForSlug(o.autoReactSlug);
  }
  if (t?.userStop === !0 && eW(o) && o.frameLive !== void 0) {
    if (
      getTaskRunState().frameLiveUserStopObserver?.(o.frameLive.slug, {
        running: o.status === "running",
        taskId: e,
        taskStop: t?.taskStop === !0,
        modelOrigin: t?.modelOrigin === !0,
        taskRegistry: n,
      }) === !0
    )
      if (isSlugSwept(o.frameLive.slug)) stopAutoReactForSlug(o.frameLive.slug);
      else getTaskRunState().autoReactDeliberateStopObserver?.(o.frameLive.slug);
  }
  if (t?.userStop === !0 && eW(o) && o.frameLive === void 0 && o.autoReactArmed !== !0)
    (getTaskRunState().liveDocUserStopObserver?.(e, {
      modelOrigin: t?.modelOrigin === !0,
      running: o.status === "running",
    }),
      getTaskRunState().artifactRoomStopObserver?.leaveByTaskId(e),
      getTaskRunState().artifactPresenceStopObserver?.closeByTaskId(e));
  stopMonitorTask(e, n, {
    quiet: t?.quiet,
    onKilled() {
      let i = getTaskRunState().monitorSockets.get(e);
      if (i) (getTaskRunState().monitorSockets.delete(e), i.close());
    },
  });
}
//@ chunk-xf84t5b0.js:16228-16265 placement
function XBs(e) {
  (clearSummonWakeTimers(e), bumpSlugEpoch(e), stopAutoReactForSlug(e));
}
//@ chunk-xf84t5b0.js:16265-16528 placement
function stopAutoReactForSlug(e) {
  (stopSummonWakes(e),
    getTaskRunState().autoReactDeliberateStopObserver?.(e),
    emitSummonArm(getLiveState().live, e));
  let n = flushCoalescedNotices(e);
  getTaskRunState().artifactRoomStopObserver?.leave(e);
  let t = kb(
    (o) => o.origin?.kind === "task-notification" && o.origin.slug === e && processQueuedCommands(o),
  );
  if (
    (collectCoalescedArtifactNotices(t, n),
    declineSweptHandOffs(t),
    t.some(isArtifactAutoReactNotification) || n.length > 0)
  )
    clearAutoReactNoticePending(e);
  artifactWatchStopNotice(0, n);
}
//@ chunk-xf84t5b0.js:16528-16597 placement
function _e(e) {
  return e === "artifact-auto-react" || e === "artifact-room";
}
//@ chunk-xf84t5b0.js:16597-16881 placement
function collectCoalescedArtifactNotices(e, n) {
  for (let t of e) {
    let origin = t.origin;
    if (
      origin?.kind === "task-notification" &&
      origin.coalesced !== void 0 &&
      origin.coalesced.family !== "artifact-changed" &&
      origin.slug !== void 0 &&
      origin.displayName !== void 0
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
  let builtInArtifactHiddenForMcp = getLiveState().builtInArtifactHiddenForMcp,
    i = plural(e, "it", "them"),
    r = plural(e, "this artifact", "these artifacts"),
    s = plural(e, "the watch is kept", "the watches are kept"),
    a =
      t?.catchUp === !1
        ? ""
        : builtInArtifactHiddenForMcp
          ? ` (comments you send to Claude meanwhile reach this session ${t?.nameChordGesture === !0 ? "then" : plural(e, "once the watch resumes", "once the watches resume")})`
          : " (comments sent to Claude meanwhile are answered then)",
    h =
      t?.catchUp === !1
        ? ""
        : builtInArtifactHiddenForMcp
          ? ", and comments the user sent to Claude in the meantime reach you then"
          : ", and comments sent to Claude in the meantime are answered then",
    p =
      t?.catchUp === !1
        ? ""
        : builtInArtifactHiddenForMcp
          ? " (comments the user sent to Claude meanwhile reach you when that turn ends)"
          : " (comments sent to Claude meanwhile are being answered now)",
    u = builtInArtifactHiddenForMcp ? "" : ", or resume_replies if the user asks",
    y = `publishing without being asked, while handling a notification or a wake-up, leaves ${i} paused`,
    S = builtInArtifactHiddenForMcp
      ? `the user can stop ${i} for good in the tasks list (/tasks, often under System tasks), and the kill-all-agents gesture stops ${i} until Claude Code restarts`
      : `the user can stop ${i} for good with \u2715 on the watch in the tasks list or the kill-all-agents gesture`,
    v =
      t?.nameChordGesture === !0
        ? `this receipt reaches you with a later turn: if that turn is the user's own typed message it has already resumed ${i}${p}, otherwise the user's next message resumes ${i} (so does a publish of ${r} the user asks for${u}; ${y})${h}; ${S}`
        : `when the user asks you to publish ${r} again, that publish resumes ${i}${u}, as does the user's next typed message \u2014 each only on hosts that pass typed input through as the user's${h}; ${y}`;
  enqueuePendingNotification({
    agentId: mainAgentId(),
    value: formatTaskNotification({
      taskType: "artifact-auto-react",
      summary: escapeXml(
        e > 0
          ? `${e} artifact ${builtInArtifactHiddenForMcp ? plural(e, "comment watch", "comment watches") : `auto-reply ${plural(e, "subscription")}`} paused ${t?.nameChordGesture === !0 ? "until your next message" : "by the interrupt"}${a}`
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
    skipAttachments: !0,
    ...(t?.passive === !0 && { passive: !0, priority: "next" }),
    origin: {
      kind: "task-notification",
      source: "artifact-auto-react-stop-disclosure",
      nonDurableStop: !0,
      ...(n.length > 0 && { carriesDiscardRecord: !0 }),
    },
  });
}
//@ chunk-xf84t5b0.js:19273-19373 placement
function isArtifactAutoReactNotification(e) {
  return e.origin?.kind === "task-notification" && e.origin.source === "artifact-auto-react";
}
//@ chunk-xf84t5b0.js:19373-19454 placement = processQueuedCommands (1)
function processQueuedCommands(queuedCommands) {
  return queuedCommands.origin?.kind === "task-notification" && _e(queuedCommands.origin.source);
}
//@ chunk-xf84t5b0.js:19454-19732 placement
function drainQueuedTaskNotifications(e, n) {
  let t = flushCoalescedNotices();
  for (let i of t) clearAutoReactNoticePending(i.slug);
  if (n?.leaveArtifactRooms === !0) leaveArtifactRooms(e);
  let removeByFilter = e.removeByFilter(processQueuedCommands);
  for (let i of removeByFilter)
    if (
      i.origin?.kind === "task-notification" &&
      i.origin.source === "artifact-auto-react" &&
      i.origin.slug !== void 0
    )
      clearAutoReactNoticePending(i.origin.slug);
  return (collectCoalescedArtifactNotices(removeByFilter, t), declineSweptHandOffs(removeByFilter), t);
}
/**
 * 清除已无对应任务的自动反应待处理通知，返回清除数量。
 */
//@ chunk-xf84t5b0.js:19732-20036 placement
function clearOrphanedAutoReactNotices(e = () => !1) {
  let { pendingNoticeSlugs: pendingNoticeSlugs } = getLiveState().shareStatus;
  if (pendingNoticeSlugs.size === 0) return 0;
  let t = new Set();
  for (let i of oO()) {
    let r = i.origin?.kind === "task-notification" ? i.origin.slug : void 0;
    if (r !== void 0 && processQueuedCommands(i)) t.add(r);
  }
  let o = 0;
  for (let i of [...pendingNoticeSlugs.keys()]) {
    if (t.has(i) || hasPendingNotice(i) || e(i)) continue;
    (clearAutoReactNoticePending(i), o++);
  }
  return o;
}
//@ chunk-xf84t5b0.js:20036-20105 placement
function oan() {
  return { disclosures: [], staleRows: [], watchLifecycle: [] };
}
/**
 * 把停止相关的任务通知按来源分为说明披露与过期行等类别。
 */
//@ chunk-xf84t5b0.js:20105-20412 placement
function partitionStopNotifications(e) {
  declineSweptHandOffs(e);
  let n = oan();
  for (let t of e) {
    if (t.origin?.kind !== "task-notification") continue;
    if (t.origin.source === "artifact-auto-react-stop-disclosure") n.disclosures.push(t);
    else if (t.origin.source === "artifact-changed") n.staleRows.push(t);
    else if (t.origin.source === ARTIFACT_WATCH_LIFECYCLE) n.watchLifecycle.push(t);
  }
  return n;
}
//@ chunk-xf84t5b0.js:20412-20593 placement
function isNonDurableStopDisclosure(e) {
  return (
    e.origin?.kind === "task-notification" &&
    e.origin.source === "artifact-auto-react-stop-disclosure" &&
    e.origin.nonDurableStop === !0 &&
    e.origin.carriesDiscardRecord !== !0
  );
}
//@ chunk-xf84t5b0.js:20593-20668 placement
function QBs(e) {
  if (!getLiveState().autoReact.userDisarmed) return;
  e.removeByFilter(isNonDurableStopDisclosure);
}
/**
 * 把停止通知重新排入队列，用户已解除自动反应时丢弃相应披露。
 */
//@ chunk-xf84t5b0.js:20668-21006 placement
function requeueStopNotifications(e, n, t) {
  let userDisarmed = getLiveState().autoReact.userDisarmed;
  for (let disclosure of n.disclosures) {
    let r = disclosure.origin?.kind === "task-notification" && disclosure.origin.carriesDiscardRecord === !0,
      s = userDisarmed && isNonDurableStopDisclosure(disclosure);
    if (r || (t === 0 && !s)) e.enqueuePendingNotification(disclosure);
  }
  for (let staleRow of n.staleRows) e.enqueuePendingNotification(staleRow);
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
function e1s(e, n) {
  forEachRunningTaskOwnedBy(e, n, eW, stopMonitorWsTasks);
}

export {
  e1s,
  LFt,
  processQueuedCommands,
  artifactWatchStopNotice,
  drainQueuedTaskNotifications,
  qBs,
  oan,
  partitionStopNotifications,
  leaveArtifactRooms,
  QBs,
  requeueStopNotifications,
  stopMonitorWsTasks,
  Xye,
  eW,
  isMonitorWsTaskLive,
  isAutoReactArmedTask,
  clearOrphanedAutoReactNotices,
  closeAllMonitorSockets,
  GBs,
  YBs,
  zBs,
  KBs,
  XBs,
  stopAutoReactForSlug,
  BBs,
  LLr,
  jBs,
  MonitorWsTask,
  VBs,
};
