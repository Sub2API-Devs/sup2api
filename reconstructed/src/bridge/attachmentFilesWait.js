/**
 * bridge/attachmentFilesWait.ts
 *
 * 等待会话附件文件到达（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (12)
 * attribution: placement 12
 */
import { arrivingInboundFileRegistry } from "../bootstrap/state.js";
import { sleep } from "../utils/sleep.js";
import { startSessionActivity, endActivity } from "../utils/sessionActivity.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { logForDiagnosticsNoPII } from "../utils/diagLogs.js";
import { logError } from "../utils/log.js";

//@ chunk-s61vbvea.js:594290-594342 placement
/**
 * 等待会话附件文件到达的超时（默认 10 分钟）与结果码表（cleared=1、timed_out=2、aborted=3，用于埋点）。
 */
var ATTACHMENT_FILES_WAIT_TIMEOUT_MS = 600000;
var ATTACHMENT_WAIT_OUTCOME_CODES = {
  cleared: 1,
  timed_out: 2,
  aborted: 3,
};
//@ chunk-s61vbvea.js:594342-594417 placement
/**
 * 是否有附件文件仍在到达：串行队列或旁路队列任一还有待到达项（且对应队列未放弃等待）。
 */
function areAttachmentFilesArriving() {
  let e = arrivingInboundFileRegistry();
  return hasInlineArrivals(e, e.gaveUpOn) || hasBesideArrivals(e, e.gaveUpOnBeside);
}
//@ chunk-s61vbvea.js:594417-594491 placement
function hasInlineArrivals(e, gaveUpOn) {
  return e.messagesArriving > e.besideLine && e.lastInLine !== gaveUpOn;
}
//@ chunk-s61vbvea.js:594491-594552 placement
function hasBesideArrivals(e, gaveUpOnBeside) {
  return e.besideLine > 0 && e.lastBesideLine !== gaveUpOnBeside;
}
//@ chunk-s61vbvea.js:594552-594682 placement
/**
 * 判断某路径是否仍在"到达中"的入站附件集合里（串行队列或旁路队列），对应队列已放弃等待时不算。
 */
function isInboundFileArriving(filename) {
  let n = arrivingInboundFileRegistry();
  return (
    (hasInlineArrivals(n, n.gaveUpOn) && n.pathsArriving.has(filename)) ||
    (hasBesideArrivals(n, n.gaveUpOnBeside) && n.pathsArrivingBeside.has(filename))
  );
}
//@ chunk-s61vbvea.js:594682-594884 placement
/**
 * （归属疑误：bridge 附件同步）把一批到达中的文件消息排进串行队列并计数。
 */
function enqueueArrivingFileMessage(e, paths = []) {
  let r = arrivingInboundFileRegistry();
  r.messagesArriving++;
  incrementPathCounts(r.pathsArriving, paths);
  let s = r.lastInLine.then(e);
  r.lastInLine = s
    .then(
      () => {},
      () => {},
    )
    .then(() => {
      r.messagesArriving--;
      decrementPathCounts(r.pathsArriving, paths);
    });
  return s;
}
//@ chunk-s61vbvea.js:594884-595177 placement
/**
 * 在旁路（并行）队列里执行一次文件到达任务：回调里上报的路径记入 pathsArrivingBeside，任务结束后计数减一并移除这些路径。
 */
function runBesideArrivingFiles(e) {
  let n = arrivingInboundFileRegistry();
  n.messagesArriving++;
  n.besideLine++;
  let r = [];
  let s = false;
  let h = n.lastBesideLine.then(() =>
    e((y) => {
      if (!s) {
        r.push(...y);
        incrementPathCounts(n.pathsArrivingBeside, y);
      }
    }),
  );
  n.lastBesideLine = h
    .then(
      () => {},
      () => {},
    )
    .then(() => {
      n.messagesArriving--;
      n.besideLine--;
      s = true;
      decrementPathCounts(n.pathsArrivingBeside, r);
    });
  return h;
}
//@ chunk-s61vbvea.js:595177-595234 placement
function incrementPathCounts(e, n) {
  for (let r of n) e.set(r, (e.get(r) ?? 0) + 1);
}
//@ chunk-s61vbvea.js:595234-595323 placement
function decrementPathCounts(e, n) {
  for (let r of n) {
    let s = e.get(r) ?? 0;
    if (s > 1) e.set(r, s - 1);
    else e.delete(r);
  }
}
//@ chunk-s61vbvea.js:595323-595364 placement
/**
 * 旁路队列（beside 行）是否仍有未到达的附件文件。
 */
function hasBesideArrivingFiles() {
  return arrivingInboundFileRegistry().besideLine > 0;
}
//@ chunk-s61vbvea.js:595364-595450 placement
/**
 * 串行队列中最后一个仍在到达的消息 id；没有时返回 undefined。
 */
function lastInlineArrivingMessageId() {
  let e = arrivingInboundFileRegistry();
  return e.messagesArriving > e.besideLine ? e.lastInLine : undefined;
}
//@ chunk-s61vbvea.js:595450-596669 placement
/**
 * 等待会话附件文件到达，返回 cleared/aborted/expired/files_arriving 等结果
 */
async function waitForAttachmentFiles(
  e,
  { timeoutMs: n = ATTACHMENT_FILES_WAIT_TIMEOUT_MS, atTurnEnd: r = false, activityAgentId: s } = {},
) {
  try {
    let h = arrivingInboundFileRegistry();
    if (!hasInlineArrivals(h, h.gaveUpOn) && (r || !hasBesideArrivals(h, h.gaveUpOnBeside))) return "cleared";
    if (e.aborted) return "aborted";
    let startTime = performance.now();
    let messagesArrivingAtStart = h.messagesArriving;
    let { gaveUpOn, gaveUpOnBeside } = h;
    let x = r || h.toolCallsWaiting === 0;
    let abortController = new AbortController();
    let j = sleep(n, AbortSignal.any([e, abortController.signal])).then(() => "expired");
    let G = "cleared";
    let L = false;
    let q = false;
    let Q = false;
    if (!r) h.toolCallsWaiting++;
    try {
      startSessionActivity("files_arriving", s);
      L = true;
      for (;;) {
        q = hasInlineArrivals(h, gaveUpOn);
        Q = !r && hasBesideArrivals(h, gaveUpOnBeside);
        if (!q && !Q) break;
        let ee = (q ? h.lastInLine : h.lastBesideLine).then(() => "cleared");
        if ((await Promise.race([ee, j])) === "expired") {
          G = e.aborted ? "aborted" : "timed_out";
          break;
        }
      }
    } finally {
      if (!r) h.toolCallsWaiting--;
      abortController.abort();
      if (L) endActivity("files_arriving", s);
    }
    if (G === "timed_out" && q) h.gaveUpOn = h.lastInLine;
    if (G === "timed_out" && Q) h.gaveUpOnBeside = h.lastBesideLine;
    if (x || G === "timed_out") {
      let Z = {
        waited_ms: Math.round(performance.now() - startTime),
        messages_arriving_at_start: messagesArrivingAtStart,
        messages_arriving_at_end: h.messagesArriving,
        at_turn_end: r,
      };
      if (G === "cleared") logFeatureOk("bridge_attachment_files_wait", Z);
      else logFeatureSad("bridge_attachment_files_wait", G, Z);
      logForDiagnosticsNoPII(G === "timed_out" ? "warn" : "info", "waited_for_message_files", {
        outcome: G,
        outcome_code: ATTACHMENT_WAIT_OUTCOME_CODES[G],
        ...Z,
      });
    }
    return G;
  } catch (error) {
    logError(error);
    return "failed";
  }
}
export {
  hasBesideArrivingFiles,
  areAttachmentFilesArriving,
  waitForAttachmentFiles,
  isInboundFileArriving,
  ATTACHMENT_FILES_WAIT_TIMEOUT_MS,
  lastInlineArrivingMessageId,
  enqueueArrivingFileMessage,
  runBesideArrivingFiles,
};
