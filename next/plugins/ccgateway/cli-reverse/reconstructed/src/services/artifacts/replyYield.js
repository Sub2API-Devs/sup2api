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
import {
  objectSchema,
  literal,
  stringSchema,
  array,
  _enum,
  numberSchema,
  unknown,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-sqqsb7w7.js:534-1261 placement
/**
 * 评论自动回复让渡协议：4 s 超时、最多 16 个 slug、表上限 64，以及 yield/unyield 消息 schema 与 unref 定时器。
 */
var REPLY_YIELD_TIMEOUT_MS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_YIELD_SLUGS;
var MAX_TRACKED_TABLE;
var yieldRequestSchema;
var yieldedResponseSchema;
var unyieldRequestSchema;
var unrefTimers;
deferInit("chunk-sqqsb7w7.js:534", () => {
  REPLY_YIELD_TIMEOUT_MS = 4000;
  MAX_YIELD_SLUGS = 16;
  MAX_TRACKED_TABLE = 64;
  yieldRequestSchema = DoctorLazy(() =>
    objectSchema({
      action: literal("yield_artifact_replies"),
      from: stringSchema().max(512),
      msg_id: stringSchema().min(1).max(128),
      session_id: stringSchema().max(512),
      slugs: array(stringSchema().max(128)).max(MAX_YIELD_SLUGS),
      reason: _enum(["resume", "claim"]).catch("claim"),
      sent_at: numberSchema().finite(),
      claimed_at: numberSchema().finite().optional(),
      requester: objectSchema({
        cwd: unknown().optional(),
        tmux: unknown().optional(),
      }).optional(),
    }),
  );
  yieldedResponseSchema = DoctorLazy(() =>
    objectSchema({
      action: literal("artifact_replies_yielded"),
      orig_msg_id: stringSchema().max(128),
      yielded: unknown().optional(),
      not_held: unknown().optional(),
      refused: unknown().optional(),
    }),
  );
  unyieldRequestSchema = DoctorLazy(() =>
    objectSchema({
      action: literal("unyield_artifact_replies"),
      orig_msg_id: stringSchema().max(128),
      slugs: array(stringSchema().max(128)).max(MAX_YIELD_SLUGS),
      stopped: booleanSchema().optional(),
    }),
  );
  unrefTimers = {
    setTimeout: (fn, ms) => {
      let timer = setTimeout(fn, ms);
      timer.unref?.();
      return timer;
    },
    clearTimeout: (handle) => clearTimeout(handle),
  };
});
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
    for (let entry of this.outstanding.values()) entry.timers.clearTimeout(entry.timer);
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
var replyYieldSlot; // deferred: uses ReplyYieldTable of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-sqqsb7w7.js:1619", () => {
  replyYieldSlot = new HostScoped(() => new ReplyYieldTable());
});
//@ chunk-sqqsb7w7.js:1642-1677 placement
function replyYieldTable() {
  return replyYieldSlot.of(getRootSession().host);
}
//@ chunk-sqqsb7w7.js:1677-1794 placement
function evictOverCap(map, cap) {
  while (map.size > MAX_TRACKED_TABLE) {
    let oldest = map.keys().next().value;
    if (oldest === undefined) break;
    let entry = map.get(oldest);
    map.delete(oldest);
    cap?.(entry, oldest);
  }
}
//@ chunk-sqqsb7w7.js:1794-2376 placement
function waitForYieldAnswer(msgId, msg, slugs) {
  let timers = slugs.timers ?? unrefTimers;
  let table = replyYieldTable();
  return new Promise((resolve) => {
    let entry = {
      asked: new Set(msg),
      expectPid: slugs.expectPid,
      sentAt: slugs.sentAt,
      lost: new Map(),
      resolve,
      onLate: slugs.onLate,
      timer: undefined,
      timers,
    };
    entry.timer = timers.setTimeout(() => {
      if (table.outstanding.get(msgId) !== entry || entry.resolve === null) return;
      entry.resolve = null;
      resolve({
        kind: "timeout",
        lost: [...entry.lost.keys()],
        lostTo: [...entry.lost],
      });
      if (entry.onLate === undefined) table.outstanding.delete(msgId);
    }, slugs.timeoutMs ?? REPLY_YIELD_TIMEOUT_MS);
    table.outstanding.set(msgId, entry);
    evictOverCap(table.outstanding, (entry) => {
      entry.timers.clearTimeout(entry.timer);
      entry.resolve?.({
        kind: "timeout",
        lost: [...entry.lost.keys()],
        lostTo: [...entry.lost],
      });
      entry.resolve = null;
    });
  });
}
//@ chunk-sqqsb7w7.js:2376-2579 placement
/**
 * 开始一次回复让渡认领：生成唯一 id，记录涉及的 slug 与发送时间，挂进待处理认领表，返回带 end() 的认领对象。
 */
function startYieldClaim(slugs, now) {
  let claimId = `claim-${now}-${Math.random().toString(36).slice(2)}`;
  let table = replyYieldTable();
  let claim = {
    id: claimId,
    slugs: new Set(slugs),
    sentAt: now,
    lost: new Map(),
    end: () => void table.pendingClaims.delete(claimId),
  };
  table.pendingClaims.set(claimId, claim);
  return claim;
}
//@ chunk-sqqsb7w7.js:2579-2725 placement
/**
 * 取出并清除某个待回复记录的丢失列表（同时取消其定时器）。
 */
function takeOutstandingLost(msgId) {
  let table = replyYieldTable();
  let entry = table.outstanding.get(msgId);
  if (entry === undefined) return [];
  entry.timers.clearTimeout(entry.timer);
  table.outstanding.delete(msgId);
  return [...entry.lost];
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
function handleYieldRequest(request, senderPid) {
  let table = replyYieldTable();
  let pending = table.outstanding.get(request.orig_msg_id);
  if (pending === undefined) return false;
  if (pending.expectPid !== undefined && senderPid !== undefined && senderPid !== pending.expectPid) {
    logFeatureSad("artifact_live_subscribe", "yield_answer_pid_mismatch");
    return false;
  }
  pending.timers.clearTimeout(pending.timer);
  let filterAsked = (list) =>
    Array.isArray(list) ? list.filter((slug) => typeof slug === "string" && pending.asked.has(slug)) : [];
  let answer =
    request.refused === true
      ? {
          kind: "refused",
        }
      : {
          kind: "yielded",
          yielded: filterAsked(request.yielded),
          notHeld: filterAsked(request.not_held),
        };
  if (pending.resolve !== null) {
    table.outstanding.delete(request.orig_msg_id);
    pending.resolve({
      ...answer,
      lost: [...pending.lost.keys()],
      lostTo: [...pending.lost],
    });
  } else {
    table.outstanding.delete(request.orig_msg_id);
    logFeatureOk("artifact_live_subscribe", {
      yield_answer_late: true,
    });
    try {
      pending.onLate?.({
        ...answer,
        lost: [...pending.lost.keys()],
        lostTo: [...pending.lost],
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
  let table = replyYieldTable();
  table.holder = holder;
  table.reverter = reverter;
}
//@ chunk-sqqsb7w7.js:3562-3983 placement
/**
 * 记录把某些 slug 让渡给某接收方（合并 slug、记接收方 pid 与进程启动标识）；超出上限时优先淘汰同进程的其他记录，再淘汰最早的，并对被淘汰的调用回滚函数。
 */
function recordDelivered(table, msgId, yielded, info) {
  let previous = table.delivered.get(msgId);
  table.delivered.delete(msgId);
  let pid = info?.pid ?? previous?.pid;
  table.delivered.set(msgId, {
    slugs: new Set([...(previous?.slugs ?? []), ...yielded]),
    pid,
    procStart: info?.procStart ?? previous?.procStart,
  });
  let revertEntry = (entry, otherMsgId) => {
    try {
      table.reverter?.(otherMsgId, [...entry.slugs]);
    } catch (error) {
      logError(error);
    }
  };
  while (table.delivered.size > MAX_TRACKED_TABLE) {
    let found = [...table.delivered].find(
      ([otherMsgId, record]) => otherMsgId !== msgId && pid !== undefined && record.pid === pid,
    );
    if (found === undefined) break;
    table.delivered.delete(found[0]);
    revertEntry(found[1], found[0]);
  }
  evictOverCap(table.delivered, revertEntry);
}
//@ chunk-sqqsb7w7.js:3983-4118 placement
function isDeliveredFull(entry, pid) {
  if (entry.delivered.size < MAX_TRACKED_TABLE) return false;
  if (pid === undefined) return true;
  for (let delivered of entry.delivered.values()) if (delivered.pid === pid) return false;
  return true;
}
//@ chunk-sqqsb7w7.js:4118-4150 placement
/**
 * 导出函数 `revertGoneTakersNow`：参数 e，返回 revertGoneTakers(y(), e)。
 */
function revertGoneTakersNow(entry) {
  return revertGoneTakers(replyYieldTable(), entry);
}
//@ chunk-sqqsb7w7.js:4150-4282 placement
function revertGoneTakers(entry, pid) {
  let out = [];
  for (let [slug, sent] of [...entry.delivered])
    if (sent.pid !== undefined && isProcessProvablyGone(sent.pid))
      out.push(...revertDelivered(entry, slug, [...sent.slugs], pid));
  revertReusedPids(entry);
  return out;
}
//@ chunk-sqqsb7w7.js:4282-4400 placement
/**
 * 从所有已投递记录中移除某 slug，记录变空时一并删除。
 */
function forgetDeliveredSlug(slug) {
  let table = replyYieldTable();
  for (let [pid, entry] of [...table.delivered])
    if (entry.slugs.delete(slug) && entry.slugs.size === 0) table.delivered.delete(pid);
}
//@ chunk-sqqsb7w7.js:4400-4668 placement
async function revertReusedPids(entry) {
  for (let [pid, item] of [...entry.delivered]) {
    if (item.pid === undefined || item.procStart === undefined) continue;
    let revert;
    try {
      revert = await provenSameProcessAsync(item.pid, item.procStart);
    } catch {
      revert = undefined;
    }
    if (revert === false && entry.delivered.get(pid) === item) {
      logFeatureOk("artifact_comments_autoreact", {
        yield_taker_reused: true,
      });
      revertDelivered(entry, pid, [...item.slugs]);
    }
  }
}
//@ chunk-sqqsb7w7.js:4668-4907 placement
function revertDelivered(entry, pid, slugs, options) {
  let delivered = entry.delivered.get(pid);
  if (delivered === undefined) return [];
  let filtered = [...slugs].filter((slug) => delivered.slugs.delete(slug));
  if (delivered.slugs.size === 0) entry.delivered.delete(pid);
  if (filtered.length === 0) return [];
  try {
    return entry.reverter?.(pid, filtered, options) ?? [];
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
  let table = replyYieldTable();
  table.sendAnswer = sendAnswer;
  table.ownAddress = ownAddress;
}
//@ chunk-sqqsb7w7.js:4970-5376 placement
function decideYield(table, claim) {
  let claimAt = claim.claimed_at ?? claim.sent_at;
  let refuse = false;
  let claims = [...table.pendingClaims.values()];
  for (let [id, outstanding] of table.outstanding)
    if (outstanding.resolve !== null)
      claims.push({
        id,
        slugs: outstanding.asked,
        sentAt: outstanding.sentAt,
        lost: outstanding.lost,
      });
  for (let pendingClaim of claims) {
    if (!claim.slugs.some((slug) => pendingClaim.slugs.has(slug))) continue;
    if (
      claimAt > pendingClaim.sentAt ||
      (claimAt === pendingClaim.sentAt && claim.from > (table.ownAddress ?? ""))
    ) {
      for (let slug of claim.slugs) if (pendingClaim.slugs.has(slug)) pendingClaim.lost.set(slug, claim.from);
    } else refuse = true;
  }
  return refuse ? "refuse" : "proceed";
}
//@ chunk-sqqsb7w7.js:5376-6673 placement
/**
 * 回答其他会话的让出请求（过期、处理器抛错、投递不明）。
 */
function answerYieldRequest(request, extra, identity, now, options) {
  let pid = identity?.pid;
  let writeToken = identity?.writeToken;
  let table = replyYieldTable();
  let sendAnswer = table.sendAnswer;
  if (sendAnswer === null) return;
  let result;
  if (options?.refuse === true) result = "refused";
  else if (
    now - request.sent_at > REPLY_YIELD_TIMEOUT_MS - 500 ||
    request.sent_at > now + 1000 ||
    (request.claimed_at !== undefined && request.claimed_at > request.sent_at + 1000)
  ) {
    logFeatureSad("artifact_comments_autoreact", "yield_request_stale");
    result = "refused";
  } else if (decideYield(table, request) === "refuse") result = "refused";
  else if (table.holder === null)
    result = {
      yielded: [],
      notHeld: [...request.slugs],
    };
  else
    try {
      revertGoneTakers(table, {
        transferring: new Set(request.slugs),
      });
      if (isDeliveredFull(table, identity?.pid)) {
        logFeatureSad("artifact_comments_autoreact", "yield_table_full");
        result = "refused";
      } else
        result = table.holder({
          msgId: request.msg_id,
          slugs: request.slugs,
          reason: request.reason,
          requester: {
            cwd: request.requester?.cwd,
            tmux: request.requester?.tmux,
          },
        });
    } catch (error) {
      logError(error);
      logFeatureSad("artifact_comments_autoreact", "yield_handler_threw");
      result = "refused";
    }
  let answer =
    result === "refused"
      ? {
          orig_msg_id: request.msg_id,
          yielded: [],
          not_held: [],
          refused: true,
        }
      : {
          orig_msg_id: request.msg_id,
          yielded: result.yielded.slice(0, MAX_YIELD_SLUGS),
          not_held: result.notHeld.slice(0, MAX_YIELD_SLUGS),
        };
  let yieldedResult = result !== "refused" && result.yielded.length > 0 ? result : null;
  if (yieldedResult !== null) recordDelivered(table, request.msg_id, yieldedResult.yielded, identity);
  sendAnswer(extra, answer, pid, writeToken).then(
    () => yieldedResult?.onDelivered?.(),
    (error) => {
      logForDebugging(
        `[reply-yield] answer to ${fragmentForLog(extra)} failed: ${redactFragmentForLog(String(error))}`,
      );
      if (yieldedResult === null) return;
      if (!isExpectedSendError(error)) {
        logFeatureSad("artifact_comments_autoreact", "yield_answer_send_ambiguous");
        sendAnswer(extra, answer, pid, writeToken).catch(() => {});
        yieldedResult.onDelivered?.();
        return;
      }
      logFeatureSad("artifact_comments_autoreact", "yield_answer_undelivered");
      revertDelivered(table, request.msg_id, yieldedResult.yielded);
    },
  );
}
//@ chunk-sqqsb7w7.js:6673-7033 placement
function handleUnyield(msg, ctx) {
  let table = replyYieldTable();
  let entry = table.delivered.get(msg.orig_msg_id);
  if (entry === undefined) return false;
  if (entry.pid !== undefined && ctx !== undefined && ctx !== entry.pid) {
    logFeatureSad("artifact_comments_autoreact", "unyield_pid_mismatch");
    return false;
  }
  let reverted = revertDelivered(table, msg.orig_msg_id, msg.slugs, {
    ...(msg.stopped === true && {
      stopped: new Set(msg.slugs),
    }),
  });
  reverted.push(...revertGoneTakers(table));
  logFeatureOk("artifact_comments_autoreact", {
    yield_handed_back: reverted.length,
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
