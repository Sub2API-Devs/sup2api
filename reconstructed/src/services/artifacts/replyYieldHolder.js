/**
 * services/artifacts/replyYieldHolder.ts
 *
 * 2.1.316 新增。注册 artifact 评论自动回复的让出/接管持有者。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (1), chunk-grx66nns.js (18)
 * attribution: placement 19
 */
import {
  listRegisteredSessionRecords,
  ownMessagingSocket,
  sendStampedControlToUdsSocket,
  sendControlToUdsSocket,
} from "../../utils/udsMessaging/udsClient.js";
import { logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { isCrossSessionMessagingEnabled } from "../../utils/crossSessionMessagingGate.js";
import { canonicalSocketPath } from "../../utils/udsPaths.js";
import { Dzn, Nin, waitForYieldAnswer, takeOutstandingLost, NRo } from "./replyYield.js";
import { ARTIFACT_YIELD_PEER_FEATURE } from "../../utils/concurrentSessions.js";
import { Czn, describeReplyHolder } from "./comments/replyYield.js";
import { u8 } from "../../utils/peerMessageHeaders.js";
import { getPlatform } from "../../utils/platform.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import {
  isSlugStopped,
  isSlugSwept,
  isSlugYielded,
  markYieldAnnounced,
  isYieldedMessage,
  isStoppedElsewhere,
  isYieldAnnounced,
  recordYieldedMessage,
  isSlugOrphaned,
  clearSummonWakeTimers,
  bumpSlugEpoch,
  emitSummonArm,
  settleYieldedMessage,
  getSummonWakeState,
} from "./summonArms.js";
import { logForDebugging } from "../../utils/debug.js";
import { jy, redactFragmentForLog, isExpectedSendError } from "../../utils/udsMessaging/peerGuard.js";
import { isProcessRunning } from "../../utils/genericProcessUtils.js";
import { createMessageEnvelope } from "../../utils/udsMessaging/messageEnvelope.js";
import { getOriginalCwd, mainAgentId } from "../../bootstrap/state.js";
import { enqueuePendingNotification } from "../../utils/messageQueueManager.js";
import { formatTaskNotification } from "../../utils/xmlTags.js";
import { ARTIFACT_WATCH_LIFECYCLE } from "../../constants/xml.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { getBootingAutoReactSlugs } from "../artifactComments/autoReplyNotices.js";
import { stopCommentMonitorIntent } from "./commentMonitor.js";
import { LFt } from "../../tasks/MonitorWsTask/MonitorWsTask.js";
import { scheduleThreadScan } from "./comments/threadScanner.js";
import { claudeAiEnvironment } from "../../constants/claudeAiOrigin.js";
import { artifactViewerUrlFor } from "../../tools/ArtifactTool/artifactUrls.js";
import { createSystemMessage } from "../../utils/messages.js";

//@ chunk-grx66nns.js:1086-1151 placement
var z = 1000,
  Q = 200,
  w = { armable: new Set(), yielded: new Set(), undo: () => {} };
//@ chunk-grx66nns.js:1151-1282 placement
async function findOwnSessionRecord() {
  let found = (await listRegisteredSessionRecords()).find((r) => r.pid === process.pid);
  return found === void 0 ? void 0 : { sessionId: found.sessionId, tmux: found.tmux };
}
//@ chunk-grx66nns.js:1282-1592 placement
async function requestReplyTakeover(e) {
  let n = await requestReplyTakeoverUnchecked(e).finally(() => e.claim?.end());
  if (n.kind === "took_over")
    logFeatureOk("artifact_live_subscribe", {
      took_over: !0,
      holders: e.holders.length,
      armable_count: n.armable.size,
      yielded_count: n.yielded.size,
    });
  else logFeatureSad("artifact_live_subscribe", `takeover_${n.kind}`, { holders: e.holders.length });
  return n;
}
/**
 * 向持有者请求接管自动回复
 */
//@ chunk-grx66nns.js:1592-5932 placement
async function requestReplyTakeoverUnchecked(e) {
  if (!isCrossSessionMessagingEnabled()) return { ...w, kind: "messaging_off" };
  let n = ownMessagingSocket();
  if (n === void 0 || e.holders.length === 0) return { ...w, kind: "no_inbox" };
  let r = canonicalSocketPath(n),
    a = e.transport?.ownRecord ?? findOwnSessionRecord,
    s = await a().catch(() => {
      return;
    });
  if (s?.sessionId !== e.conversationId) {
    let o = e.transport?.timers ?? Dzn;
    (await new Promise((d) => void o.setTimeout(d, Q)),
      (s = await a().catch(() => {
        return;
      })));
  }
  if (s?.sessionId !== e.conversationId) return { ...w, kind: "registry_stale" };
  let tmux = s.tmux;
  if (e.holdersIncomplete === !0 && !e.alreadyReplying) return { ...w, kind: "holder_unreachable" };
  let sliced = e.slugs.filter((slug) => !(e.claim?.lost.has(slug) ?? !1)).slice(0, Nin);
  if (sliced.length === 0) return { ...w, kind: "nothing_freed" };
  let h = [];
  for (let holder of e.holders) {
    if (
      holder.sock === void 0 ||
      holder.sock === "" ||
      !(holder.peerFeatures?.includes(ARTIFACT_YIELD_PEER_FEATURE) ?? !1) ||
      canonicalSocketPath(holder.sock) === r ||
      Czn(holder.kind)
    ) {
      if (e.alreadyReplying) continue;
      return { ...w, kind: "holder_unreachable" };
    }
    h.push({ sock: holder.sock, pid: holder.pid });
  }
  if (h.length === 0) return { ...w, kind: "holder_unreachable" };
  let c = e.transport?.send ?? sendStampedControlToUdsSocket,
    u = e.transport?.sendControl ?? sendControlToUdsSocket,
    Y = e.transport?.timers ?? Dzn,
    T = e.transport?.now ?? Date.now,
    G = u8(n),
    P = (o) => (getPlatform() !== "windows" ? { expectPeerPid: o } : {}),
    v = [],
    D = new Set(),
    { wakes: wakes, autoReact: autoReact, durable: durable } = getLiveState(),
    W = (o) => {
      for (let d of o.yielded) {
        let i = wakes.takenFrom.get(d) ?? [];
        if (!i.some((y) => y.msgId === o.msgId))
          wakes.takenFrom.set(d, [...i, { sock: o.sock, pid: o.pid, msgId: o.msgId }]);
        if (
          e.alreadyReplying &&
          (autoReact.userDisarmed ||
            durable.stopLatches.isStopped(d) ||
            (isSlugStopped(d) && !isSlugSwept(d)))
        )
          notifyTakenOverSlugStopped(d, u);
      }
    },
    U = e.claim?.sentAt ?? T(),
    A = (o, d, i) => {
      let y =
        i?.precautionary !== void 0
          ? [...i.precautionary]
          : [...o.yielded].filter((m) => d === void 0 || d.has(m));
      if (y.length === 0) return;
      for (let m of y) o.yielded.delete(m);
      logFeatureOk("artifact_live_subscribe", {
        [i?.precautionary !== void 0 ? "takeover_unyield_precautionary" : "takeover_handed_back"]: y.length,
      });
      let _ = {
        action: "unyield_artifact_replies",
        orig_msg_id: o.msgId,
        slugs: y,
        ...(i?.stopped === !0 && { stopped: !0 }),
      };
      u(o.sock, _, P(o.pid)).catch((m) => {
        if (
          (logForDebugging(
            `[reply-yield] unyield to ${jy(o.sock)} failed: ${redactFragmentForLog(String(m))}`,
          ),
          isExpectedSendError(m) && !isProcessRunning(o.pid))
        ) {
          logFeatureSad("artifact_live_subscribe", "unyield_holder_gone");
          return;
        }
        let k = () =>
          void u(o.sock, _, P(o.pid)).catch(() => {
            logFeatureSad("artifact_live_subscribe", "unyield_send_failed");
          });
        if (isExpectedSendError(m)) Y.setTimeout(k, z);
        else k();
      });
    },
    N = [];
  for (let o of h) {
    let d = createMessageEnvelope(),
      i = { sock: o.sock, pid: o.pid, msgId: d.msg_id, yielded: new Set() };
    v.push(i);
    let y = waitForYieldAnswer(d.msg_id, sliced, {
      sentAt: U,
      expectPid: o.pid,
      ...(e.transport?.timeoutMs !== void 0 && { timeoutMs: e.transport.timeoutMs }),
      ...(e.transport?.timers !== void 0 && { timers: e.transport.timers }),
      onLate: (_) => {
        if (_.kind !== "yielded") return;
        for (let k of _.yielded) i.yielded.add(k);
        let m = new Map([...(e.claim?.lost ?? []), ..._.lostTo]);
        (A(
          i,
          new Set(
            [...i.yielded].filter((k) =>
              m.has(k) ? q(k, i, m, e.alreadyReplying === !0) : !e.alreadyReplying && !D.has(k),
            ),
          ),
        ),
          W(i));
      },
    });
    N.push(
      (async () => {
        try {
          await c(
            o.sock,
            {
              action: "yield_artifact_replies",
              from: G,
              session_id: e.conversationId,
              slugs: sliced,
              reason: e.reason,
              sent_at: T(),
              claimed_at: U,
              requester: { cwd: getOriginalCwd(), ...(tmux !== void 0 && { tmux: tmux }) },
            },
            d,
            P(o.pid),
          );
        } catch (error) {
          if (isExpectedSendError(error)) {
            let m = takeOutstandingLost(d.msg_id),
              mapped = m.map(([J]) => J);
            return isProcessRunning(o.pid)
              ? { kind: "unreachable", lost: mapped, lostTo: m }
              : { kind: "gone", lost: mapped, lostTo: m };
          }
        }
        return y;
      })(),
    );
  }
  let results = await Promise.all(N),
    x = new Map(),
    L = new Map(),
    C = new Map(),
    S = new Map(e.claim?.lost ?? []),
    O = !0,
    K = !1,
    F = 0;
  results.forEach((o, d) => {
    for (let [i, y] of o.lostTo) S.set(i, y);
    if (o.kind === "gone") return;
    if ((F++, o.kind === "unreachable")) {
      O = !1;
      return;
    }
    if (o.kind === "yielded") {
      for (let i of o.yielded) (v[d].yielded.add(i), x.set(i, (x.get(i) ?? 0) + 1));
      for (let i of o.notHeld) L.set(i, (L.get(i) ?? 0) + 1);
      for (let i of new Set([...o.yielded, ...o.notHeld])) C.set(i, (C.get(i) ?? 0) + 1);
    } else if (((O = !1), o.kind === "refused")) K = !0;
  });
  let R = new Set(),
    M = new Set();
  if (O && !K)
    for (let o of sliced) {
      if (S.has(o) || (C.get(o) ?? 0) !== F) continue;
      if ((x.get(o) ?? 0) > 0) (R.add(o), M.add(o));
      else if ((L.get(o) ?? 0) === F) R.add(o);
    }
  for (let o of R) D.add(o);
  if (e.alreadyReplying) {
    for (let o of v) for (let d of o.yielded) if (!S.has(d)) M.add(d);
  }
  for (let o of v) {
    let d = new Set(
      [...o.yielded].filter((i) =>
        S.has(i) ? q(i, o, S, e.alreadyReplying === !0) : !e.alreadyReplying && !R.has(i),
      ),
    );
    if (d.size > 0) A(o, d);
  }
  if (!e.alreadyReplying)
    results.forEach((o, d) => {
      if (o.kind === "timeout") A(v[d], void 0, { precautionary: sliced });
    });
  for (let o of v) W(o);
  return {
    armable: R,
    yielded: M,
    kind: R.size > 0 ? "took_over" : "nothing_freed",
    undo: (o) => {
      for (let i of v) A(i, o);
      let d = new Set(v.map((i) => i.msgId));
      for (let i of o ?? sliced) {
        let filtered = (wakes.takenFrom.get(i) ?? []).filter((_) => !d.has(_.msgId));
        if (filtered.length > 0) wakes.takenFrom.set(i, filtered);
        else wakes.takenFrom.delete(i);
      }
    },
  };
}
//@ chunk-grx66nns.js:5932-6013 placement
function q(e, n, r, a) {
  let s = r.get(e);
  return (s !== void 0 && s === u8(n.sock)) || (!a && !isSlugYielded(e));
}
//@ chunk-grx66nns.js:6013-6045 placement
function notifyTakenOverSlugStopped(e, n = sendControlToUdsSocket) {
  handBackTakenSlugs(e, !0, n);
}
//@ chunk-grx66nns.js:6045-6077 placement
function handBackTakenOverSlug(e, n = sendControlToUdsSocket) {
  handBackTakenSlugs(e, !1, n);
}
/**
 * 把接管的 slug 交还原持有者
 */
//@ chunk-grx66nns.js:6077-6683 placement
function handBackTakenSlugs(e, n, r) {
  let { wakes: wakes } = getLiveState(),
    s = wakes.takenFrom.get(e);
  if (s === void 0 || isSlugYielded(e)) return;
  wakes.takenFrom.delete(e);
  for (let l of s) {
    let p = {
        action: "unyield_artifact_replies",
        orig_msg_id: l.msgId,
        slugs: [e],
        ...(n && { stopped: !0 }),
      },
      h = getPlatform() !== "windows" ? { expectPeerPid: l.pid } : {};
    r(l.sock, p, h).catch((c) => {
      if (
        (logForDebugging(`[reply-yield] release to ${jy(l.sock)} failed: ${redactFragmentForLog(String(c))}`),
        isExpectedSendError(c) && !isProcessRunning(l.pid))
      )
        return;
      let u = () =>
        void r(l.sock, p, h).catch(() => {
          logFeatureSad("artifact_live_subscribe", "takeover_release_failed");
        });
      if (isExpectedSendError(c)) Dzn.setTimeout(u, z);
      else u();
    });
  }
  logFeatureOk("artifact_live_subscribe", { [n ? "takeover_stop_notified" : "takeover_released"]: s.length });
}
//@ chunk-grx66nns.js:6683-6786 placement = formatFailureDetails (0.777)
function formatFailureDetails(e) {
  let sliced = e.slice(0, 2),
    remaining = e.length - sliced.length;
  return `${sliced.join(", ")}${remaining > 0 ? ` and ${remaining} more` : ""}`;
}
/**
 * 交互会话的通知/恢复处理（与插件无关，见 lead 建议）。
 */
//@ chunk-grx66nns.js:6786-7291 placement
function repliesYieldedLine(e, n, r, a) {
  let s = describeReplyHolder(
      {
        kind: "interactive",
        ...(typeof r.cwd === "string" && { cwd: r.cwd }),
        ...(typeof r.tmux === "string" && { tmux: r.tmux }),
      },
      a,
    ),
    l =
      n === "resume"
        ? `the session that just resumed this conversation in ${s}`
        : `another session of this conversation (${s}), which just published or resumed them there`;
  return `Automatic replies to comments on ${formatFailureDetails(e)} moved to ${l}; this session keeps watching for new versions only. To take them back here, publish the Artifact again or ask Claude to resume its replies.`;
}
//@ chunk-grx66nns.js:7291-7494 placement
function repliesYieldRevertedLine(e) {
  return `Automatic replies to comments on ${formatFailureDetails(e)} are back in this session: the other session of this conversation did not keep them (it could not take them over, or it has since exited).`;
}
//@ chunk-grx66nns.js:7494-7728 placement
function repliesStoppedElsewhereLine(e) {
  return `Automatic replies to comments on ${formatFailureDetails(e)} were stopped in the other session of this conversation, so they stay off here too. To turn them back on, publish the Artifact again or ask Claude to resume its replies.`;
}
/**
 * 自动回复已移到其他会话的通知
 */
//@ chunk-grx66nns.js:7728-8459 placement
var REPLIES_MOVED_NOTICE =
    "Automatic replies to comments on the Artifact(s) this session was answering moved to another session of this same conversation on this machine, at its request; this session keeps its version watch only. Nothing to do \u2014 do not stop or re-arm a watch on your own; a publish the user asks for here takes them back.",
  ne =
    "The automatic comment replies this session had handed to another session of this conversation were stopped by the user there; they stay stopped here too. Nothing to do unless the user asks to resume them or to publish again.",
  ie =
    "The automatic comment replies are back with this session: the other session of this conversation did not keep them (it could not take them over, or it has since exited).";
//@ chunk-grx66nns.js:8459-8958 placement
function notifyModelOfReplyYield(e, n) {
  let r =
      e === "yielded"
        ? `Comment replies on ${n} Artifact(s) moved to another session of this conversation`
        : e === "reverted"
          ? `Comment replies on ${n} Artifact(s) are back with this session`
          : `Comment replies on ${n} Artifact(s) were stopped in the other session`,
    a = e === "yielded" ? REPLIES_MOVED_NOTICE : e === "reverted" ? ie : ne;
  enqueuePendingNotification({
    value: formatTaskNotification({
      taskType: ARTIFACT_WATCH_LIFECYCLE,
      summary: escapeXml(r),
      body: `
<event>${escapeXml(a)}</event>`,
    }),
    mode: "task-notification",
    passive: !0,
    priority: "next",
    origin: { kind: "task-notification", source: ARTIFACT_WATCH_LIFECYCLE },
    agentId: mainAgentId(),
  });
}
/**
 * 注册 artifact 评论自动回复的让出/接管持有者。
 */
//@ chunk-grx66nns.js:8958-9635 placement
function registerReplyYieldHolder(e) {
  return (
    NRo(
      (n) => {
        let r = partitionSlugsForYield(n.slugs, n.msgId),
          newlyYielded = r.newlyYielded;
        if (newlyYielded.length > 0)
          logFeatureOk("artifact_comments_autoreact", { yielded_to_other_session: newlyYielded.length });
        return {
          yielded: r.yielded,
          notHeld: r.notHeld,
          ...(newlyYielded.length > 0 && {
            onDelivered: () => {
              let filtered = newlyYielded.filter((l) => isSlugYielded(l));
              for (let l of filtered) markYieldAnnounced(l);
              if (filtered.length > 0) e.yielded(filtered, n.reason, n.requester);
            },
          }),
        };
      },
      (n, r, a) => {
        for (let u of r) if (a?.stopped?.has(u) ?? !1) isYieldedMessage(u, n);
        let s = new Set(r.filter((u) => isStoppedElsewhere(u))),
          l = new Set(r.filter((u) => isYieldAnnounced(u))),
          p = releaseYieldedSlugs(n, r),
          filtered = p.filter(
            (u) => l.has(u) && !isSlugStopped(u) && isReplyWired(u) && !(a?.transferring?.has(u) ?? !1),
          );
        if (filtered.length > 0) e.reverted(filtered);
        let filtered_2 = p.filter((u) => l.has(u) && s.has(u));
        if (filtered_2.length > 0) e.stoppedElsewhere(filtered_2);
        return p;
      },
    ),
    () => NRo(null)
  );
}
/**
 * 按是否可让出分组 slug
 */
//@ chunk-grx66nns.js:9635-9996 placement
function partitionSlugsForYield(e, n) {
  let { live: live, autoReact: autoReact, durable: durable } = getLiveState(),
    l = [],
    p = [],
    h = [];
  for (let c of e) {
    if (isSlugYielded(c)) {
      (recordYieldedMessage(c, n), l.push(c));
      continue;
    }
    let u = isReplyWired(c),
      Y = isSlugSwept(c) && !isSlugOrphaned(c),
      T =
        autoReact.wakeEnabledMemo !== !1 &&
        !autoReact.userDisarmed &&
        !durable.stopLatches.isStopped(c) &&
        (!isSlugStopped(c) || Y);
    if (!u || !T) {
      p.push(c);
      continue;
    }
    (recordYieldedMessage(c, n),
      clearSummonWakeTimers(c),
      bumpSlugEpoch(c),
      emitSummonArm(live, c),
      l.push(c),
      h.push(c));
  }
  return { yielded: l, notHeld: p, newlyYielded: h };
}
/**
 * 该 slug 的自动回复是否已接线
 */
//@ chunk-grx66nns.js:9996-10152 placement
function isReplyWired(e) {
  let { live: live } = getLiveState(),
    r = live.supervisors.get(e);
  return (
    (r !== void 0 && !r.stopped && r.autoReactWiring !== void 0) ||
    live.inFlightWiredIntent.has(e) ||
    getBootingAutoReactSlugs().has(e)
  );
}
/**
 * 释放已让出的 slug
 */
//@ chunk-grx66nns.js:10152-10631 placement
function releaseYieldedSlugs(e, n) {
  let { live: live } = getLiveState(),
    a = [];
  for (let s of n) {
    if (!settleYieldedMessage(s, e)) continue;
    if ((emitSummonArm(live, s), isSlugStopped(s) && !isSlugSwept(s)))
      (stopCommentMonitorIntent(s), notifyTakenOverSlugStopped(s));
    a.push(s);
    let l = live.supervisors.get(s);
    if (!isSlugStopped(s) && !isReplyWired(s)) handBackTakenOverSlug(s);
    let lastWakeArgs = getSummonWakeState(s).lastWakeArgs;
    if (
      !isSlugStopped(s) &&
      isReplyWired(s) &&
      l?.taskId !== void 0 &&
      LFt(l.taskId) &&
      lastWakeArgs !== null
    )
      scheduleThreadScan({
        ...lastWakeArgs,
        seed: !1,
        confirm: void 0,
        confirmBase: void 0,
        confirmAfter: void 0,
        reentry: void 0,
        idlePass: void 0,
        suppressSummonStatus: void 0,
      });
  }
  if (a.length > 0) logFeatureOk("artifact_comments_autoreact", { yield_reverted: a.length });
  return a;
}
/**
 * 注册 Artifact 回复让出通知：让出/恢复时向转录追加带查看器链接的系统通知；与 newerModelOffer 无关，疑似放错文件。
 */
//@ chunk-18hwfzwa.js:348523-348815 placement
function registerReplyYieldNotices({ transcript: transcript }) {
  {
    let x = (L) => {
        let ee = claudeAiEnvironment();
        return L.map((ke) => artifactViewerUrlFor({ slug: ke, env: ee }));
      },
      D = (L) => transcript.apply({ type: "append", messages: [createSystemMessage(L, "notice")] });
    return registerReplyYieldHolder({
      yielded: (L, ee, ke) => D(repliesYieldedLine(x(L), ee, ke, Date.now())),
      reverted: (L) => D(repliesYieldRevertedLine(x(L))),
      stoppedElsewhere: (L) => D(repliesStoppedElsewhereLine(x(L))),
    });
  }
  return () => {};
}

export { registerReplyYieldNotices };
