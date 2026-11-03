/**
 * services/artifacts/replyYield.ts
 *
 * 2.1.316 新增：Artifact 评论自动回复的"让出"（yield）：多个会话之间协调由谁回复评论
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-sqqsb7w7.js (22)
 * attribution: placement 22
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, T, o, A, U, E, oe, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { isProcessProvablyGone, provenSameProcessAsync } from "../../utils/processIdentity.js";
import { logForDebugging } from "../../utils/debug.js";
import { jy, redactFragmentForLog, isExpectedSendError } from "../../utils/udsMessaging/peerGuard.js";

//@ chunk-sqqsb7w7.js:534-1261 placement
var REPLY_YIELD_TIMEOUT_MS = 4000,
  Nin = 16,
  h = 64,
  TUs = DoctorLazy(() =>
    u({
      action: T("yield_artifact_replies"),
      from: o().max(512),
      msg_id: o().min(1).max(128),
      session_id: o().max(512),
      slugs: A(o().max(128)).max(Nin),
      reason: U(["resume", "claim"]).catch("claim"),
      sent_at: E().finite(),
      claimed_at: E().finite().optional(),
      requester: u({ cwd: oe().optional(), tmux: oe().optional() }).optional(),
    }),
  ),
  AUs = DoctorLazy(() =>
    u({
      action: T("artifact_replies_yielded"),
      orig_msg_id: o().max(128),
      yielded: oe().optional(),
      not_held: oe().optional(),
      refused: oe().optional(),
    }),
  ),
  CUs = DoctorLazy(() =>
    u({
      action: T("unyield_artifact_replies"),
      orig_msg_id: o().max(128),
      slugs: A(o().max(128)).max(Nin),
      stopped: M().optional(),
    }),
  ),
  Dzn = {
    setTimeout: (e, i) => {
      let n = setTimeout(e, i);
      return (n.unref?.(), n);
    },
    clearTimeout: (e) => clearTimeout(e),
  };
//@ chunk-sqqsb7w7.js:1261-1619 placement
class ReplyYieldTable {
  outstanding = new Map();
  pendingClaims = new Map();
  holder = null;
  reverter = null;
  sendAnswer = null;
  ownAddress = null;
  delivered = new Map();
  reset() {
    for (let e of this.outstanding.values()) e.timers.clearTimeout(e.timer);
    (this.outstanding.clear(),
      this.pendingClaims.clear(),
      (this.holder = null),
      (this.reverter = null),
      (this.sendAnswer = null),
      (this.ownAddress = null),
      this.delivered.clear());
  }
}
//@ chunk-sqqsb7w7.js:1619-1642 placement
var z = new HostScoped(() => new ReplyYieldTable());
//@ chunk-sqqsb7w7.js:1642-1677 placement
function y() {
  return z.of(getRootSession().host);
}
//@ chunk-sqqsb7w7.js:1677-1794 placement
function evictOverCap(e, i) {
  while (e.size > h) {
    let n = e.keys().next().value;
    if (n === void 0) break;
    let r = e.get(n);
    (e.delete(n), i?.(r, n));
  }
}
//@ chunk-sqqsb7w7.js:1794-2376 placement
function waitForYieldAnswer(e, i, n) {
  let r = n.timers ?? Dzn,
    s = y();
  return new Promise((c) => {
    let a = {
      asked: new Set(i),
      expectPid: n.expectPid,
      sentAt: n.sentAt,
      lost: new Map(),
      resolve: c,
      onLate: n.onLate,
      timer: void 0,
      timers: r,
    };
    ((a.timer = r.setTimeout(() => {
      if (s.outstanding.get(e) !== a || a.resolve === null) return;
      if (
        ((a.resolve = null),
        c({ kind: "timeout", lost: [...a.lost.keys()], lostTo: [...a.lost] }),
        a.onLate === void 0)
      )
        s.outstanding.delete(e);
    }, n.timeoutMs ?? REPLY_YIELD_TIMEOUT_MS)),
      s.outstanding.set(e, a),
      evictOverCap(s.outstanding, (d) => {
        (d.timers.clearTimeout(d.timer),
          d.resolve?.({ kind: "timeout", lost: [...d.lost.keys()], lostTo: [...d.lost] }),
          (d.resolve = null));
      }));
  });
}
/**
 * 开始一次回复让渡认领：生成唯一 id，记录涉及的 slug 与发送时间，挂进待处理认领表，返回带 end() 的认领对象。
 */
//@ chunk-sqqsb7w7.js:2376-2579 placement
function startYieldClaim(e, i) {
  let n = `claim-${i}-${Math.random().toString(36).slice(2)}`,
    r = y(),
    s = { id: n, slugs: new Set(e), sentAt: i, lost: new Map(), end: () => void r.pendingClaims.delete(n) };
  return (r.pendingClaims.set(n, s), s);
}
/**
 * 取出并清除某个待回复记录的丢失列表（同时取消其定时器）。
 */
//@ chunk-sqqsb7w7.js:2579-2725 placement
function takeOutstandingLost(e) {
  let i = y(),
    n = i.outstanding.get(e);
  if (n === void 0) return [];
  return (n.timers.clearTimeout(n.timer), i.outstanding.delete(e), [...n.lost]);
}
//@ chunk-sqqsb7w7.js:2725-2792 placement
function IUs(e) {
  return typeof e === "string" && y().outstanding.has(e);
}
/**
 * 处理让出请求（pid 不符、超时、表满）。
 */
//@ chunk-sqqsb7w7.js:2792-3505 placement
function handleYieldRequest(e, i) {
  let n = y(),
    r = n.outstanding.get(e.orig_msg_id);
  if (r === void 0) return !1;
  if (r.expectPid !== void 0 && i !== void 0 && i !== r.expectPid)
    return (logFeatureSad("artifact_live_subscribe", "yield_answer_pid_mismatch"), !1);
  r.timers.clearTimeout(r.timer);
  let s = (a) => (Array.isArray(a) ? a.filter((d) => typeof d === "string" && r.asked.has(d)) : []),
    c =
      e.refused === !0
        ? { kind: "refused" }
        : { kind: "yielded", yielded: s(e.yielded), notHeld: s(e.not_held) };
  if (r.resolve !== null)
    (n.outstanding.delete(e.orig_msg_id), r.resolve({ ...c, lost: [...r.lost.keys()], lostTo: [...r.lost] }));
  else {
    (n.outstanding.delete(e.orig_msg_id), logFeatureOk("artifact_live_subscribe", { yield_answer_late: !0 }));
    try {
      r.onLate?.({ ...c, lost: [...r.lost.keys()], lostTo: [...r.lost] });
    } catch (error) {
      logError(error);
    }
  }
  return !0;
}
//@ chunk-sqqsb7w7.js:3505-3562 placement
function NRo(e, i = null) {
  let n = y();
  ((n.holder = e), (n.reverter = i));
}
/**
 * 记录把某些 slug 让渡给某接收方（合并 slug、记接收方 pid 与进程启动标识）；超出上限时优先淘汰同进程的其他记录，再淘汰最早的，并对被淘汰的调用回滚函数。
 */
//@ chunk-sqqsb7w7.js:3562-3983 placement
function recordDelivered(e, i, n, r) {
  let s = e.delivered.get(i);
  e.delivered.delete(i);
  let c = r?.pid ?? s?.pid;
  e.delivered.set(i, {
    slugs: new Set([...(s?.slugs ?? []), ...n]),
    pid: c,
    procStart: r?.procStart ?? s?.procStart,
  });
  let a = (d, _) => {
    try {
      e.reverter?.(_, [...d.slugs]);
    } catch (error) {
      logError(error);
    }
  };
  while (e.delivered.size > h) {
    let found = [...e.delivered].find(([_, m]) => _ !== i && c !== void 0 && m.pid === c);
    if (found === void 0) break;
    (e.delivered.delete(found[0]), a(found[1], found[0]));
  }
  evictOverCap(e.delivered, a);
}
//@ chunk-sqqsb7w7.js:3983-4118 placement
function isDeliveredFull(e, i) {
  if (e.delivered.size < h) return !1;
  if (i === void 0) return !0;
  for (let n of e.delivered.values()) if (n.pid === i) return !1;
  return !0;
}
//@ chunk-sqqsb7w7.js:4118-4150 placement
function MUs(e) {
  return revertGoneTakers(y(), e);
}
//@ chunk-sqqsb7w7.js:4150-4282 placement
function revertGoneTakers(e, i) {
  let n = [];
  for (let [r, s] of [...e.delivered])
    if (s.pid !== void 0 && isProcessProvablyGone(s.pid)) n.push(...revertDelivered(e, r, [...s.slugs], i));
  return (revertReusedPids(e), n);
}
/**
 * 从所有已投递记录中移除某 slug，记录变空时一并删除。
 */
//@ chunk-sqqsb7w7.js:4282-4400 placement
function forgetDeliveredSlug(e) {
  let i = y();
  for (let [n, r] of [...i.delivered]) if (r.slugs.delete(e) && r.slugs.size === 0) i.delivered.delete(n);
}
//@ chunk-sqqsb7w7.js:4400-4668 placement
async function revertReusedPids(e) {
  for (let [i, n] of [...e.delivered]) {
    if (n.pid === void 0 || n.procStart === void 0) continue;
    let r;
    try {
      r = await provenSameProcessAsync(n.pid, n.procStart);
    } catch {
      r = void 0;
    }
    if (r === !1 && e.delivered.get(i) === n)
      (logFeatureOk("artifact_comments_autoreact", { yield_taker_reused: !0 }),
        revertDelivered(e, i, [...n.slugs]));
  }
}
//@ chunk-sqqsb7w7.js:4668-4907 placement
function revertDelivered(e, i, n, r) {
  let s = e.delivered.get(i);
  if (s === void 0) return [];
  let filtered = [...n].filter((a) => s.slugs.delete(a));
  if (s.slugs.size === 0) e.delivered.delete(i);
  if (filtered.length === 0) return [];
  try {
    return e.reverter?.(i, filtered, r) ?? [];
  } catch (error) {
    return (logError(error), []);
  }
}
//@ chunk-sqqsb7w7.js:4907-4970 placement
function $Ro(e, i = null) {
  let n = y();
  ((n.sendAnswer = e), (n.ownAddress = i));
}
//@ chunk-sqqsb7w7.js:4970-5376 placement
function decideYield(e, i) {
  let n = i.claimed_at ?? i.sent_at,
    r = !1,
    s = [...e.pendingClaims.values()];
  for (let [c, a] of e.outstanding)
    if (a.resolve !== null) s.push({ id: c, slugs: a.asked, sentAt: a.sentAt, lost: a.lost });
  for (let c of s) {
    if (!i.slugs.some((slug) => c.slugs.has(slug))) continue;
    if (n > c.sentAt || (n === c.sentAt && i.from > (e.ownAddress ?? ""))) {
      for (let slug of i.slugs) if (c.slugs.has(slug)) c.lost.set(slug, i.from);
    } else r = !0;
  }
  return r ? "refuse" : "proceed";
}
/**
 * 回答其他会话的让出请求（过期、处理器抛错、投递不明）。
 */
//@ chunk-sqqsb7w7.js:5376-6673 placement
function answerYieldRequest(e, i, n, r, s) {
  let c = n?.pid,
    a = n?.writeToken,
    d = y(),
    sendAnswer = d.sendAnswer;
  if (sendAnswer === null) return;
  let m;
  if (s?.refuse === !0) m = "refused";
  else if (
    r - e.sent_at > REPLY_YIELD_TIMEOUT_MS - 500 ||
    e.sent_at > r + 1000 ||
    (e.claimed_at !== void 0 && e.claimed_at > e.sent_at + 1000)
  )
    (logFeatureSad("artifact_comments_autoreact", "yield_request_stale"), (m = "refused"));
  else if (decideYield(d, e) === "refuse") m = "refused";
  else if (d.holder === null) m = { yielded: [], notHeld: [...e.slugs] };
  else
    try {
      if ((revertGoneTakers(d, { transferring: new Set(e.slugs) }), isDeliveredFull(d, n?.pid)))
        (logFeatureSad("artifact_comments_autoreact", "yield_table_full"), (m = "refused"));
      else
        m = d.holder({
          msgId: e.msg_id,
          slugs: e.slugs,
          reason: e.reason,
          requester: { cwd: e.requester?.cwd, tmux: e.requester?.tmux },
        });
    } catch (error) {
      (logError(error), logFeatureSad("artifact_comments_autoreact", "yield_handler_threw"), (m = "refused"));
    }
  let Y =
      m === "refused"
        ? { orig_msg_id: e.msg_id, yielded: [], not_held: [], refused: !0 }
        : { orig_msg_id: e.msg_id, yielded: m.yielded.slice(0, Nin), not_held: m.notHeld.slice(0, Nin) },
    w = m !== "refused" && m.yielded.length > 0 ? m : null;
  if (w !== null) recordDelivered(d, e.msg_id, w.yielded, n);
  sendAnswer(i, Y, c, a).then(
    () => w?.onDelivered?.(),
    (v) => {
      if (
        (logForDebugging(`[reply-yield] answer to ${jy(i)} failed: ${redactFragmentForLog(String(v))}`),
        w === null)
      )
        return;
      if (!isExpectedSendError(v)) {
        (logFeatureSad("artifact_comments_autoreact", "yield_answer_send_ambiguous"),
          sendAnswer(i, Y, c, a).catch(() => {}),
          w.onDelivered?.());
        return;
      }
      (logFeatureSad("artifact_comments_autoreact", "yield_answer_undelivered"),
        revertDelivered(d, e.msg_id, w.yielded));
    },
  );
}
//@ chunk-sqqsb7w7.js:6673-7033 placement
function handleUnyield(e, i) {
  let n = y(),
    r = n.delivered.get(e.orig_msg_id);
  if (r === void 0) return !1;
  if (r.pid !== void 0 && i !== void 0 && i !== r.pid)
    return (logFeatureSad("artifact_comments_autoreact", "unyield_pid_mismatch"), !1);
  let s = revertDelivered(n, e.orig_msg_id, e.slugs, {
    ...(e.stopped === !0 && { stopped: new Set(e.slugs) }),
  });
  return (
    s.push(...revertGoneTakers(n)),
    logFeatureOk("artifact_comments_autoreact", { yield_handed_back: s.length }),
    !0
  );
}

export {
  TUs,
  answerYieldRequest,
  CUs,
  handleUnyield,
  AUs,
  IUs,
  handleYieldRequest,
  $Ro,
  Dzn,
  Nin,
  waitForYieldAnswer,
  takeOutstandingLost,
  NRo,
  MUs,
  forgetDeliveredSlug,
  startYieldClaim,
};
