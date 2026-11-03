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
import { u, literal, string, array, _enum, E, unknown, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { isProcessProvablyGone, provenSameProcessAsync } from "../../utils/processIdentity.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  fragmentForLog,
  redactFragmentForLog,
  isExpectedSendError,
} from "../../utils/udsMessaging/peerGuard.js";

//@ chunk-sqqsb7w7.js:534-1261 placement
/**
 * 评论自动回复让渡协议：4 s 超时、最多 16 个 slug、表上限 64，以及 yield/unyield 消息 schema 与 unref 定时器。
 */
var REPLY_YIELD_TIMEOUT_MS = 4000;
var MAX_YIELD_SLUGS = 16;
var MAX_TRACKED_TABLE = 64;
var yieldRequestSchema = DoctorLazy(() =>
  u({
    action: literal("yield_artifact_replies"),
    from: string().max(512),
    msg_id: string().min(1).max(128),
    session_id: string().max(512),
    slugs: array(string().max(128)).max(MAX_YIELD_SLUGS),
    reason: _enum(["resume", "claim"]).catch("claim"),
    sent_at: E().finite(),
    claimed_at: E().finite().optional(),
    requester: u({
      cwd: unknown().optional(),
      tmux: unknown().optional(),
    }).optional(),
  }),
);
var yieldedResponseSchema = DoctorLazy(() =>
  u({
    action: literal("artifact_replies_yielded"),
    orig_msg_id: string().max(128),
    yielded: unknown().optional(),
    not_held: unknown().optional(),
    refused: unknown().optional(),
  }),
);
var unyieldRequestSchema = DoctorLazy(() =>
  u({
    action: literal("unyield_artifact_replies"),
    orig_msg_id: string().max(128),
    slugs: array(string().max(128)).max(MAX_YIELD_SLUGS),
    stopped: M().optional(),
  }),
);
var unrefTimers = {
  setTimeout: (e, i) => {
    let timer = setTimeout(e, i);
    timer.unref?.();
    return timer;
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
    this.outstanding.clear();
    this.pendingClaims.clear();
    this.holder = null;
    this.reverter = null;
    this.sendAnswer = null;
    this.ownAddress = null;
    this.delivered.clear();
  }
}
//@ chunk-sqqsb7w7.js:1619-1642 placement
var replyYieldSlot = new HostScoped(() => new ReplyYieldTable());
//@ chunk-sqqsb7w7.js:1642-1677 placement
function replyYieldTable() {
  return replyYieldSlot.of(getRootSession().host);
}
//@ chunk-sqqsb7w7.js:1677-1794 placement
function evictOverCap(e, i) {
  while (e.size > MAX_TRACKED_TABLE) {
    let n = e.keys().next().value;
    if (n === undefined) break;
    let r = e.get(n);
    e.delete(n);
    i?.(r, n);
  }
}
//@ chunk-sqqsb7w7.js:1794-2376 placement
function waitForYieldAnswer(msgId, i, n) {
  let timers = n.timers ?? unrefTimers;
  let s = replyYieldTable();
  return new Promise((resolve) => {
    let a = {
      asked: new Set(i),
      expectPid: n.expectPid,
      sentAt: n.sentAt,
      lost: new Map(),
      resolve,
      onLate: n.onLate,
      timer: undefined,
      timers,
    };
    a.timer = timers.setTimeout(() => {
      if (s.outstanding.get(msgId) !== a || a.resolve === null) return;
      a.resolve = null;
      resolve({
        kind: "timeout",
        lost: [...a.lost.keys()],
        lostTo: [...a.lost],
      });
      if (a.onLate === undefined) s.outstanding.delete(msgId);
    }, n.timeoutMs ?? REPLY_YIELD_TIMEOUT_MS);
    s.outstanding.set(msgId, a);
    evictOverCap(s.outstanding, (d) => {
      d.timers.clearTimeout(d.timer);
      d.resolve?.({
        kind: "timeout",
        lost: [...d.lost.keys()],
        lostTo: [...d.lost],
      });
      d.resolve = null;
    });
  });
}
//@ chunk-sqqsb7w7.js:2376-2579 placement
/**
 * 开始一次回复让渡认领：生成唯一 id，记录涉及的 slug 与发送时间，挂进待处理认领表，返回带 end() 的认领对象。
 */
function startYieldClaim(e, i) {
  let n = `claim-${i}-${Math.random().toString(36).slice(2)}`;
  let r = replyYieldTable();
  let s = {
    id: n,
    slugs: new Set(e),
    sentAt: i,
    lost: new Map(),
    end: () => void r.pendingClaims.delete(n),
  };
  r.pendingClaims.set(n, s);
  return s;
}
//@ chunk-sqqsb7w7.js:2579-2725 placement
/**
 * 取出并清除某个待回复记录的丢失列表（同时取消其定时器）。
 */
function takeOutstandingLost(msgId) {
  let i = replyYieldTable();
  let n = i.outstanding.get(msgId);
  if (n === undefined) return [];
  n.timers.clearTimeout(n.timer);
  i.outstanding.delete(msgId);
  return [...n.lost];
}
//@ chunk-sqqsb7w7.js:2725-2792 placement
/**
 * 导出函数 `hasOutstanding`：参数 e，返回 typeof e === "string" && y().outstanding.has(e)。
 */
function hasOutstanding(origMsgId) {
  return typeof origMsgId === "string" && replyYieldTable().outstanding.has(origMsgId);
}
//@ chunk-sqqsb7w7.js:2792-3505 placement
/**
 * 处理让出请求（pid 不符、超时、表满）。
 */
function handleYieldRequest(e, i) {
  let n = replyYieldTable();
  let r = n.outstanding.get(e.orig_msg_id);
  if (r === undefined) return false;
  if (r.expectPid !== undefined && i !== undefined && i !== r.expectPid) {
    logFeatureSad("artifact_live_subscribe", "yield_answer_pid_mismatch");
    return false;
  }
  r.timers.clearTimeout(r.timer);
  let s = (a) => (Array.isArray(a) ? a.filter((d) => typeof d === "string" && r.asked.has(d)) : []);
  let c =
    e.refused === true
      ? {
          kind: "refused",
        }
      : {
          kind: "yielded",
          yielded: s(e.yielded),
          notHeld: s(e.not_held),
        };
  if (r.resolve !== null) {
    n.outstanding.delete(e.orig_msg_id);
    r.resolve({
      ...c,
      lost: [...r.lost.keys()],
      lostTo: [...r.lost],
    });
  } else {
    n.outstanding.delete(e.orig_msg_id);
    logFeatureOk("artifact_live_subscribe", {
      yield_answer_late: true,
    });
    try {
      r.onLate?.({
        ...c,
        lost: [...r.lost.keys()],
        lostTo: [...r.lost],
      });
    } catch (error) {
      logError(error);
    }
  }
  return true;
}
//@ chunk-sqqsb7w7.js:3505-3562 placement
/**
 * 导出函数 `setYieldHolder`：参数 e, i = null。
 */
function setYieldHolder(holder, reverter = null) {
  let n = replyYieldTable();
  n.holder = holder;
  n.reverter = reverter;
}
//@ chunk-sqqsb7w7.js:3562-3983 placement
/**
 * 记录把某些 slug 让渡给某接收方（合并 slug、记接收方 pid 与进程启动标识）；超出上限时优先淘汰同进程的其他记录，再淘汰最早的，并对被淘汰的调用回滚函数。
 */
function recordDelivered(e, msgId, yielded, r) {
  let s = e.delivered.get(msgId);
  e.delivered.delete(msgId);
  let pid = r?.pid ?? s?.pid;
  e.delivered.set(msgId, {
    slugs: new Set([...(s?.slugs ?? []), ...yielded]),
    pid,
    procStart: r?.procStart ?? s?.procStart,
  });
  let a = (d, _) => {
    try {
      e.reverter?.(_, [...d.slugs]);
    } catch (error) {
      logError(error);
    }
  };
  while (e.delivered.size > MAX_TRACKED_TABLE) {
    let found = [...e.delivered].find(([_, m]) => _ !== msgId && pid !== undefined && m.pid === pid);
    if (found === undefined) break;
    e.delivered.delete(found[0]);
    a(found[1], found[0]);
  }
  evictOverCap(e.delivered, a);
}
//@ chunk-sqqsb7w7.js:3983-4118 placement
function isDeliveredFull(e, pid) {
  if (e.delivered.size < MAX_TRACKED_TABLE) return false;
  if (pid === undefined) return true;
  for (let n of e.delivered.values()) if (n.pid === pid) return false;
  return true;
}
//@ chunk-sqqsb7w7.js:4118-4150 placement
/**
 * 导出函数 `revertGoneTakersNow`：参数 e，返回 revertGoneTakers(y(), e)。
 */
function revertGoneTakersNow(e) {
  return revertGoneTakers(replyYieldTable(), e);
}
//@ chunk-sqqsb7w7.js:4150-4282 placement
function revertGoneTakers(e, i) {
  let n = [];
  for (let [r, s] of [...e.delivered])
    if (s.pid !== undefined && isProcessProvablyGone(s.pid))
      n.push(...revertDelivered(e, r, [...s.slugs], i));
  revertReusedPids(e);
  return n;
}
//@ chunk-sqqsb7w7.js:4282-4400 placement
/**
 * 从所有已投递记录中移除某 slug，记录变空时一并删除。
 */
function forgetDeliveredSlug(slug) {
  let i = replyYieldTable();
  for (let [n, r] of [...i.delivered]) if (r.slugs.delete(slug) && r.slugs.size === 0) i.delivered.delete(n);
}
//@ chunk-sqqsb7w7.js:4400-4668 placement
async function revertReusedPids(e) {
  for (let [i, n] of [...e.delivered]) {
    if (n.pid === undefined || n.procStart === undefined) continue;
    let r;
    try {
      r = await provenSameProcessAsync(n.pid, n.procStart);
    } catch {
      r = undefined;
    }
    if (r === false && e.delivered.get(i) === n) {
      logFeatureOk("artifact_comments_autoreact", {
        yield_taker_reused: true,
      });
      revertDelivered(e, i, [...n.slugs]);
    }
  }
}
//@ chunk-sqqsb7w7.js:4668-4907 placement
function revertDelivered(e, i, n, r) {
  let s = e.delivered.get(i);
  if (s === undefined) return [];
  let filtered = [...n].filter((a) => s.slugs.delete(a));
  if (s.slugs.size === 0) e.delivered.delete(i);
  if (filtered.length === 0) return [];
  try {
    return e.reverter?.(i, filtered, r) ?? [];
  } catch (error) {
    logError(error);
    return [];
  }
}
//@ chunk-sqqsb7w7.js:4907-4970 placement
/**
 * 导出函数 `setSendAnswer`：参数 e, i = null。
 */
function setSendAnswer(sendAnswer, ownAddress = null) {
  let n = replyYieldTable();
  n.sendAnswer = sendAnswer;
  n.ownAddress = ownAddress;
}
//@ chunk-sqqsb7w7.js:4970-5376 placement
function decideYield(e, i) {
  let n = i.claimed_at ?? i.sent_at;
  let r = false;
  let s = [...e.pendingClaims.values()];
  for (let [c, a] of e.outstanding)
    if (a.resolve !== null)
      s.push({
        id: c,
        slugs: a.asked,
        sentAt: a.sentAt,
        lost: a.lost,
      });
  for (let c of s) {
    if (!i.slugs.some((slug) => c.slugs.has(slug))) continue;
    if (n > c.sentAt || (n === c.sentAt && i.from > (e.ownAddress ?? ""))) {
      for (let slug of i.slugs) if (c.slugs.has(slug)) c.lost.set(slug, i.from);
    } else r = true;
  }
  return r ? "refuse" : "proceed";
}
//@ chunk-sqqsb7w7.js:5376-6673 placement
/**
 * 回答其他会话的让出请求（过期、处理器抛错、投递不明）。
 */
function answerYieldRequest(e, i, n, r, s) {
  let pid = n?.pid;
  let writeToken = n?.writeToken;
  let d = replyYieldTable();
  let sendAnswer = d.sendAnswer;
  if (sendAnswer === null) return;
  let m;
  if (s?.refuse === true) m = "refused";
  else if (
    r - e.sent_at > REPLY_YIELD_TIMEOUT_MS - 500 ||
    e.sent_at > r + 1000 ||
    (e.claimed_at !== undefined && e.claimed_at > e.sent_at + 1000)
  ) {
    logFeatureSad("artifact_comments_autoreact", "yield_request_stale");
    m = "refused";
  } else if (decideYield(d, e) === "refuse") m = "refused";
  else if (d.holder === null)
    m = {
      yielded: [],
      notHeld: [...e.slugs],
    };
  else
    try {
      revertGoneTakers(d, {
        transferring: new Set(e.slugs),
      });
      if (isDeliveredFull(d, n?.pid)) {
        logFeatureSad("artifact_comments_autoreact", "yield_table_full");
        m = "refused";
      } else
        m = d.holder({
          msgId: e.msg_id,
          slugs: e.slugs,
          reason: e.reason,
          requester: {
            cwd: e.requester?.cwd,
            tmux: e.requester?.tmux,
          },
        });
    } catch (error) {
      logError(error);
      logFeatureSad("artifact_comments_autoreact", "yield_handler_threw");
      m = "refused";
    }
  let Y =
    m === "refused"
      ? {
          orig_msg_id: e.msg_id,
          yielded: [],
          not_held: [],
          refused: true,
        }
      : {
          orig_msg_id: e.msg_id,
          yielded: m.yielded.slice(0, MAX_YIELD_SLUGS),
          not_held: m.notHeld.slice(0, MAX_YIELD_SLUGS),
        };
  let w = m !== "refused" && m.yielded.length > 0 ? m : null;
  if (w !== null) recordDelivered(d, e.msg_id, w.yielded, n);
  sendAnswer(i, Y, pid, writeToken).then(
    () => w?.onDelivered?.(),
    (error) => {
      logForDebugging(
        `[reply-yield] answer to ${fragmentForLog(i)} failed: ${redactFragmentForLog(String(error))}`,
      );
      if (w === null) return;
      if (!isExpectedSendError(error)) {
        logFeatureSad("artifact_comments_autoreact", "yield_answer_send_ambiguous");
        sendAnswer(i, Y, pid, writeToken).catch(() => {});
        w.onDelivered?.();
        return;
      }
      logFeatureSad("artifact_comments_autoreact", "yield_answer_undelivered");
      revertDelivered(d, e.msg_id, w.yielded);
    },
  );
}
//@ chunk-sqqsb7w7.js:6673-7033 placement
function handleUnyield(e, i) {
  let n = replyYieldTable();
  let r = n.delivered.get(e.orig_msg_id);
  if (r === undefined) return false;
  if (r.pid !== undefined && i !== undefined && i !== r.pid) {
    logFeatureSad("artifact_comments_autoreact", "unyield_pid_mismatch");
    return false;
  }
  let s = revertDelivered(n, e.orig_msg_id, e.slugs, {
    ...(e.stopped === true && {
      stopped: new Set(e.slugs),
    }),
  });
  s.push(...revertGoneTakers(n));
  logFeatureOk("artifact_comments_autoreact", {
    yield_handed_back: s.length,
  });
  return true;
}
export {
  yieldRequestSchema,
  answerYieldRequest,
  unyieldRequestSchema,
  handleUnyield,
  yieldedResponseSchema,
  hasOutstanding,
  handleYieldRequest,
  setSendAnswer,
  unrefTimers,
  MAX_YIELD_SLUGS,
  waitForYieldAnswer,
  takeOutstandingLost,
  setYieldHolder,
  revertGoneTakersNow,
  forgetDeliveredSlug,
  startYieldClaim,
};
