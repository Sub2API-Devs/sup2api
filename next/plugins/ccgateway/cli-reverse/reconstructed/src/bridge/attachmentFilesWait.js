/**
 * bridge/attachmentFilesWait.ts
 *
 * 等待会话附件文件到达（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { arrivingInboundFileRegistry } from "../bootstrap/state.js";
import { sleep } from "../utils/sleep.js";
import { startSessionActivity, endActivity } from "../utils/sessionActivity.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { logForDiagnosticsNoPII } from "../utils/diagLogs.js";
import { logError } from "../utils/log.js";

//@ chunk-7jxyna5q.js:511677-511729 placement
/**
 * 等待会话附件文件到达的超时（默认 10 分钟）与结果码表（cleared=1、timed_out=2、aborted=3，用于埋点）。
 */
var ATTACHMENT_FILES_WAIT_TIMEOUT_MS = 600000;
var ATTACHMENT_WAIT_OUTCOME_CODES = {
  cleared: 1,
  timed_out: 2,
  aborted: 3,
};
//@ chunk-7jxyna5q.js:511729-511804 placement
/**
 * 是否有附件文件仍在到达：串行队列或旁路队列任一还有待到达项（且对应队列未放弃等待）。
 */
function areAttachmentFilesArriving() {
  let registry = arrivingInboundFileRegistry();
  return (
    hasInlineArrivals(registry, registry.gaveUpOn) || hasBesideArrivals(registry, registry.gaveUpOnBeside)
  );
}
//@ chunk-7jxyna5q.js:511804-511878 placement
function hasInlineArrivals(registry, gaveUpOn) {
  return registry.messagesArriving > registry.besideLine && registry.lastInLine !== gaveUpOn;
}
//@ chunk-7jxyna5q.js:511878-511939 placement
function hasBesideArrivals(registry, gaveUpOnBeside) {
  return registry.besideLine > 0 && registry.lastBesideLine !== gaveUpOnBeside;
}
//@ chunk-7jxyna5q.js:511939-512069 placement
/**
 * 判断某路径是否仍在"到达中"的入站附件集合里（串行队列或旁路队列），对应队列已放弃等待时不算。
 */
function isInboundFileArriving(filename) {
  let registry = arrivingInboundFileRegistry();
  return (
    (hasInlineArrivals(registry, registry.gaveUpOn) && registry.pathsArriving.has(filename)) ||
    (hasBesideArrivals(registry, registry.gaveUpOnBeside) && registry.pathsArrivingBeside.has(filename))
  );
}
//@ chunk-7jxyna5q.js:512069-512271 placement
/**
 * （归属疑误：bridge 附件同步）把一批到达中的文件消息排进串行队列并计数。
 */
function enqueueArrivingFileMessage(promise, paths = []) {
  let registry = arrivingInboundFileRegistry();
  registry.messagesArriving++;
  incrementPathCounts(registry.pathsArriving, paths);
  let chained = registry.lastInLine.then(promise);
  registry.lastInLine = chained
    .then(
      () => {},
      () => {},
    )
    .then(() => {
      registry.messagesArriving--;
      decrementPathCounts(registry.pathsArriving, paths);
    });
  return chained;
}
//@ chunk-7jxyna5q.js:512271-512564 placement
/**
 * 在旁路（并行）队列里执行一次文件到达任务：回调里上报的路径记入 pathsArrivingBeside，任务结束后计数减一并移除这些路径。
 */
function runBesideArrivingFiles(runWithArrivals) {
  let registry = arrivingInboundFileRegistry();
  registry.messagesArriving++;
  registry.besideLine++;
  let arrivedPaths = [];
  let isSettled = false;
  let arrivals = registry.lastBesideLine.then(() =>
    runWithArrivals((paths) => {
      if (!isSettled) {
        arrivedPaths.push(...paths);
        incrementPathCounts(registry.pathsArrivingBeside, paths);
      }
    }),
  );
  registry.lastBesideLine = arrivals
    .then(
      () => {},
      () => {},
    )
    .then(() => {
      registry.messagesArriving--;
      registry.besideLine--;
      isSettled = true;
      decrementPathCounts(registry.pathsArrivingBeside, arrivedPaths);
    });
  return arrivals;
}
//@ chunk-7jxyna5q.js:512564-512621 placement
function incrementPathCounts(counts, paths) {
  for (let path of paths) counts.set(path, (counts.get(path) ?? 0) + 1);
}
//@ chunk-7jxyna5q.js:512621-512710 placement
function decrementPathCounts(counts, paths) {
  for (let path of paths) {
    let count = counts.get(path) ?? 0;
    if (count > 1) counts.set(path, count - 1);
    else counts.delete(path);
  }
}
//@ chunk-7jxyna5q.js:512710-512751 placement
/**
 * 旁路队列（beside 行）是否仍有未到达的附件文件。
 */
function hasBesideArrivingFiles() {
  return arrivingInboundFileRegistry().besideLine > 0;
}
//@ chunk-7jxyna5q.js:512751-512837 placement
/**
 * 串行队列中最后一个仍在到达的消息 id；没有时返回 undefined。
 */
function lastInlineArrivingMessageId() {
  let registry = arrivingInboundFileRegistry();
  return registry.messagesArriving > registry.besideLine ? registry.lastInLine : undefined;
}
//@ chunk-7jxyna5q.js:512837-514060 placement
/**
 * 等待会话附件文件到达，返回 cleared/aborted/expired/files_arriving 等结果
 */
async function waitForAttachmentFiles(
  signal,
  { timeoutMs = ATTACHMENT_FILES_WAIT_TIMEOUT_MS, atTurnEnd: isAtTurnEnd = false, activityAgentId } = {},
) {
  try {
    let registry = arrivingInboundFileRegistry();
    if (
      !hasInlineArrivals(registry, registry.gaveUpOn) &&
      (isAtTurnEnd || !hasBesideArrivals(registry, registry.gaveUpOnBeside))
    )
      return "cleared";
    if (signal.aborted) return "aborted";
    let startTime = performance.now();
    let messagesArrivingAtStart = registry.messagesArriving;
    let { gaveUpOn, gaveUpOnBeside } = registry;
    let shouldLog = isAtTurnEnd || registry.toolCallsWaiting === 0;
    let abortController = new AbortController();
    let timeoutOutcome = sleep(timeoutMs, AbortSignal.any([signal, abortController.signal])).then(
      () => "expired",
    );
    let outcome = "cleared";
    let isActivityStarted = false;
    let hasInline = false;
    let hasBeside = false;
    if (!isAtTurnEnd) registry.toolCallsWaiting++;
    try {
      startSessionActivity("files_arriving", activityAgentId);
      isActivityStarted = true;
      for (;;) {
        hasInline = hasInlineArrivals(registry, gaveUpOn);
        hasBeside = !isAtTurnEnd && hasBesideArrivals(registry, gaveUpOnBeside);
        if (!hasInline && !hasBeside) break;
        let clearedOutcome = (hasInline ? registry.lastInLine : registry.lastBesideLine).then(
          () => "cleared",
        );
        if ((await Promise.race([clearedOutcome, timeoutOutcome])) === "expired") {
          outcome = signal.aborted ? "aborted" : "timed_out";
          break;
        }
      }
    } finally {
      if (!isAtTurnEnd) registry.toolCallsWaiting--;
      abortController.abort();
      if (isActivityStarted) endActivity("files_arriving", activityAgentId);
    }
    if (outcome === "timed_out" && hasInline) registry.gaveUpOn = registry.lastInLine;
    if (outcome === "timed_out" && hasBeside) registry.gaveUpOnBeside = registry.lastBesideLine;
    if (shouldLog || outcome === "timed_out") {
      let attributes = {
        waited_ms: Math.round(performance.now() - startTime),
        messages_arriving_at_start: messagesArrivingAtStart,
        messages_arriving_at_end: registry.messagesArriving,
        at_turn_end: isAtTurnEnd,
      };
      if (outcome === "cleared") logFeatureOk("bridge_attachment_files_wait", attributes);
      else logFeatureSad("bridge_attachment_files_wait", outcome, attributes);
      logForDiagnosticsNoPII(outcome === "timed_out" ? "warn" : "info", "waited_for_message_files", {
        outcome,
        outcome_code: ATTACHMENT_WAIT_OUTCOME_CODES[outcome],
        ...attributes,
      });
    }
    return outcome;
  } catch (error) {
    logError(error);
    return "failed";
  }
}
export {
  hasBesideArrivingFiles,
  ATTACHMENT_FILES_WAIT_TIMEOUT_MS,
  lastInlineArrivingMessageId,
  enqueueArrivingFileMessage,
  runBesideArrivingFiles,
  areAttachmentFilesArriving,
  waitForAttachmentFiles,
  isInboundFileArriving,
};
