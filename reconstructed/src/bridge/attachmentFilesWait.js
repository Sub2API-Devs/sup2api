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
var o4o = 600000,
  vj = { cleared: 1, timed_out: 2, aborted: 3 };
//@ chunk-s61vbvea.js:594342-594417 placement
function Etr() {
  let e = arrivingInboundFileRegistry();
  return oc(e, e.gaveUpOn) || sc(e, e.gaveUpOnBeside);
}
//@ chunk-s61vbvea.js:594417-594491 placement
function oc(e, n) {
  return e.messagesArriving > e.besideLine && e.lastInLine !== n;
}
//@ chunk-s61vbvea.js:594491-594552 placement
function sc(e, n) {
  return e.besideLine > 0 && e.lastBesideLine !== n;
}
/**
 * 判断某路径是否仍在"到达中"的入站附件集合里（串行队列或旁路队列），对应队列已放弃等待时不算。
 */
//@ chunk-s61vbvea.js:594552-594682 placement
function isInboundFileArriving(e) {
  let n = arrivingInboundFileRegistry();
  return (
    (oc(n, n.gaveUpOn) && n.pathsArriving.has(e)) || (sc(n, n.gaveUpOnBeside) && n.pathsArrivingBeside.has(e))
  );
}
/**
 * （归属疑误：bridge 附件同步）把一批到达中的文件消息排进串行队列并计数。
 */
//@ chunk-s61vbvea.js:594682-594884 placement
function enqueueArrivingFileMessage(e, n = []) {
  let r = arrivingInboundFileRegistry();
  (r.messagesArriving++, gE(r.pathsArriving, n));
  let s = r.lastInLine.then(e);
  return (
    (r.lastInLine = s
      .then(
        () => {},
        () => {},
      )
      .then(() => {
        (r.messagesArriving--, hE(r.pathsArriving, n));
      })),
    s
  );
}
/**
 * 在旁路（并行）队列里执行一次文件到达任务：回调里上报的路径记入 pathsArrivingBeside，任务结束后计数减一并移除这些路径。
 */
//@ chunk-s61vbvea.js:594884-595177 placement
function runBesideArrivingFiles(e) {
  let n = arrivingInboundFileRegistry();
  (n.messagesArriving++, n.besideLine++);
  let r = [],
    s = !1,
    h = n.lastBesideLine.then(() =>
      e((y) => {
        if (!s) (r.push(...y), gE(n.pathsArrivingBeside, y));
      }),
    );
  return (
    (n.lastBesideLine = h
      .then(
        () => {},
        () => {},
      )
      .then(() => {
        (n.messagesArriving--, n.besideLine--, (s = !0), hE(n.pathsArrivingBeside, r));
      })),
    h
  );
}
//@ chunk-s61vbvea.js:595177-595234 placement
function gE(e, n) {
  for (let r of n) e.set(r, (e.get(r) ?? 0) + 1);
}
//@ chunk-s61vbvea.js:595234-595323 placement
function hE(e, n) {
  for (let r of n) {
    let s = e.get(r) ?? 0;
    if (s > 1) e.set(r, s - 1);
    else e.delete(r);
  }
}
//@ chunk-s61vbvea.js:595323-595364 placement
function oni() {
  return arrivingInboundFileRegistry().besideLine > 0;
}
//@ chunk-s61vbvea.js:595364-595450 placement
function sni() {
  let e = arrivingInboundFileRegistry();
  return e.messagesArriving > e.besideLine ? e.lastInLine : void 0;
}
/**
 * 等待会话附件文件到达，返回 cleared/aborted/expired/files_arriving 等结果
 */
//@ chunk-s61vbvea.js:595450-596669 placement
async function waitForAttachmentFiles(e, { timeoutMs: n = o4o, atTurnEnd: r = !1, activityAgentId: s } = {}) {
  try {
    let h = arrivingInboundFileRegistry();
    if (!oc(h, h.gaveUpOn) && (r || !sc(h, h.gaveUpOnBeside))) return "cleared";
    if (e.aborted) return "aborted";
    let startTime = performance.now(),
      messagesArriving = h.messagesArriving,
      { gaveUpOn: gaveUpOn, gaveUpOnBeside: gaveUpOnBeside } = h,
      x = r || h.toolCallsWaiting === 0,
      abortController = new AbortController(),
      j = sleep(n, AbortSignal.any([e, abortController.signal])).then(() => "expired"),
      G = "cleared",
      L = !1,
      q = !1,
      Q = !1;
    if (!r) h.toolCallsWaiting++;
    try {
      (startSessionActivity("files_arriving", s), (L = !0));
      for (;;) {
        if (((q = oc(h, gaveUpOn)), (Q = !r && sc(h, gaveUpOnBeside)), !q && !Q)) break;
        let ee = (q ? h.lastInLine : h.lastBesideLine).then(() => "cleared");
        if ((await Promise.race([ee, j])) === "expired") {
          G = e.aborted ? "aborted" : "timed_out";
          break;
        }
      }
    } finally {
      if (!r) h.toolCallsWaiting--;
      if ((abortController.abort(), L)) endActivity("files_arriving", s);
    }
    if (G === "timed_out" && q) h.gaveUpOn = h.lastInLine;
    if (G === "timed_out" && Q) h.gaveUpOnBeside = h.lastBesideLine;
    if (x || G === "timed_out") {
      let Z = {
        waited_ms: Math.round(performance.now() - startTime),
        messages_arriving_at_start: messagesArriving,
        messages_arriving_at_end: h.messagesArriving,
        at_turn_end: r,
      };
      if (G === "cleared") logFeatureOk("bridge_attachment_files_wait", Z);
      else logFeatureSad("bridge_attachment_files_wait", G, Z);
      logForDiagnosticsNoPII(G === "timed_out" ? "warn" : "info", "waited_for_message_files", {
        outcome: G,
        outcome_code: vj[G],
        ...Z,
      });
    }
    return G;
  } catch (error) {
    return (logError(error), "failed");
  }
}

export {
  oni,
  Etr,
  waitForAttachmentFiles,
  isInboundFileArriving,
  o4o,
  sni,
  enqueueArrivingFileMessage,
  runBesideArrivingFiles,
};
