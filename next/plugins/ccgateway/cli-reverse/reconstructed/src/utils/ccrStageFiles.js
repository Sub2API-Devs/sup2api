/**
 * utils/ccrStageFiles.ts
 *
 * 2.1.316 新增：云会话中暂存文件仍在复制时的等待与提示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { posix } from "path";
import {
  STAGE_FILE_HOME_MOUNT_PREFIX,
  STAGE_FILE_MOUNT_PREFIX,
  STAGE_FILE_OUTPUTS_MOUNT_PREFIX,
  CLI_CONSUMED_STAGE_MOUNT_PREFIX,
  STAGE_TMP_PREFIX,
  getStageFileRoot,
  getOutputsRoot,
} from "./stageFileRoots.js";
import { logForDebugging } from "./debug.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { logError } from "./log.js";
import { sleep, systemClock } from "./sleep.js";
import { createSignal } from "./signal.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { isSelfHostedByocEnvironment } from "./remoteEnvironment.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { startSessionActivity, endActivity } from "./sessionActivity.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3850845-3850904 placement
/**
 * 被认为是暂存文件挂载点的路径前缀。
 */
var STAGE_FILE_PREFIXES; // deferred: uses dirname (./stageFileRoots.js) of its import cycle while loading; runs once the cycle is complete
var STAGE_POLL_MIN_MS;
var STAGE_POLL_MAX_MS;
var STAGE_FILE_MAX_AGE_MS;
deferInit("chunk-5xgkngpb.js:3850845", () => {
  STAGE_FILE_PREFIXES = [STAGE_FILE_HOME_MOUNT_PREFIX, `${STAGE_FILE_MOUNT_PREFIX}/hearth`];
  STAGE_POLL_MIN_MS = 1000;
  STAGE_POLL_MAX_MS = 60000;
  STAGE_FILE_MAX_AGE_MS = 60000;
});
//@ chunk-5xgkngpb.js:3850904-3851063 placement
function classifyStageWriteError(error) {
  switch (error.match(/^(?:write|mkdir) failed: (\w+)$/)?.[1]) {
    case "ENOSPC":
      return "no_space";
    case "ENAMETOOLONG":
      return "name_too_long";
    default:
      return;
  }
}
//@ chunk-5xgkngpb.js:3851063-3851189 placement
function isStageMountPath(path) {
  return (
    typeof path === "string" &&
    [STAGE_FILE_OUTPUTS_MOUNT_PREFIX, STAGE_FILE_MOUNT_PREFIX].some((mountPrefix) =>
      path.startsWith(`${mountPrefix}/`),
    ) &&
    !STAGE_FILE_PREFIXES.some((filePrefix) => path.startsWith(`${filePrefix}/`))
  );
}
//@ chunk-5xgkngpb.js:3851189-3851595 placement
/**
 * 校验并规范化 CCR 暂存挂载路径：拒绝 NUL、..、CLI 专用前缀等。
 */
function resolveStageMountPath(path) {
  if (typeof path !== "string" || path.includes("\x00") || path.split(posix.sep).includes("..")) return;
  let path_2 = posix.normalize(path);
  if (
    !isStageMountPath(path_2) ||
    path_2.startsWith(CLI_CONSUMED_STAGE_MOUNT_PREFIX) ||
    posix.basename(path_2).startsWith(STAGE_TMP_PREFIX)
  )
    return;
  let isStageFileMount = path_2.startsWith(`${STAGE_FILE_MOUNT_PREFIX}/`);
  let replaced = path_2
    .slice((isStageFileMount ? STAGE_FILE_MOUNT_PREFIX : STAGE_FILE_OUTPUTS_MOUNT_PREFIX).length + 1)
    .replace(/\/$/, "");
  if (replaced === "") return;
  try {
    return posix.join(isStageFileMount ? getStageFileRoot() : getOutputsRoot(), replaced);
  } catch {
    logForDebugging("CLAUDE_STAGE_FILE_ROOT is not an absolute path", {
      level: "error",
    });
    return;
  }
}
//@ chunk-5xgkngpb.js:3851595-3852531 placement
function tellStageFileNotPlaced(clock, onNotPlaced) {
  let openStages = new Map();
  let notPlaced = new Map();
  let sleepController;
  let toldAt = new Map();
  let lastTellAt = -1 / 0;
  let pollMs = STAGE_POLL_MIN_MS;
  let flushNotPlaced = () => {
    sleepController?.abort();
    sleepController = undefined;
    let now = clock.monotonicNow();
    for (let [stagePath, toldAtMs] of toldAt) {
      if (toldAtMs + STAGE_FILE_MAX_AGE_MS > now) break;
      toldAt.delete(stagePath);
    }
    if (notPlaced.size === 0) return;
    let list = Array.from(notPlaced.keys());
    let causes = new Set();
    for (let cause of notPlaced.values()) if (cause !== undefined) causes.add(cause);
    notPlaced.clear();
    try {
      if (onNotPlaced(list, causes)) {
        pollMs = Math.min(pollMs * 2, STAGE_POLL_MAX_MS);
        for (let stagePath of list) toldAt.set(stagePath, now);
      }
    } catch (error) {
      logFeatureBad("ccr_stage_file_not_placed_note", "tell_threw");
      logError(error);
    }
  };
  return {
    began(stagePath, youngOnly) {
      let stageMountPath = resolveStageMountPath(stagePath);
      if (stageMountPath === undefined) return () => {};
      let stageEntry = openStages.get(stageMountPath) ?? {
        stages: 0,
        placed: false,
      };
      stageEntry.stages++;
      openStages.set(stageMountPath, stageEntry);
      notPlaced.delete(stageMountPath);
      if (!youngOnly) toldAt.delete(stageMountPath);
      return (outcome) => {
        stageEntry.stages--;
        if (!outcome) {
          stageEntry.placed = true;
          toldAt.delete(stageMountPath);
        } else if (outcome !== true) stageEntry.cause = outcome;
        if (stageEntry.stages > 0) return;
        openStages.delete(stageMountPath);
        let lastToldAt = toldAt.get(stageMountPath);
        if (
          stageEntry.placed ||
          (lastToldAt !== undefined && lastToldAt + STAGE_FILE_MAX_AGE_MS > clock.monotonicNow())
        )
          return;
        notPlaced.set(stageMountPath, stageEntry.cause);
        let now = clock.monotonicNow();
        if (lastTellAt + STAGE_POLL_MAX_MS <= now) pollMs = STAGE_POLL_MIN_MS;
        lastTellAt = now;
        if (sleepController !== undefined) return;
        sleepController = new AbortController();
        sleep(pollMs, sleepController.signal, {
          clock,
          unref: true,
        }).then(flushNotPlaced);
      };
    },
    tellNow: flushNotPlaced,
  };
}
//@ chunk-5xgkngpb.js:3852531-3852554 placement
/**
 * 等待暂存文件就绪的总超时（1 分钟）。
 */
var STAGE_WAIT_MAX_MS = 60000;
var DEFAULT_STAGE_WAIT_TIMEOUT_MS = 8000;
//@ chunk-5xgkngpb.js:3852554-3852603 placement
/**
 * 按是否为暂存挂载路径返回等待超时，否则 undefined。
 */
function stageWaitTimeoutFor(path, permanent = false) {
  return !permanent && isStageMountPath(path) ? DEFAULT_STAGE_WAIT_TIMEOUT_MS : undefined;
}
//@ chunk-5xgkngpb.js:3852603-3855020 placement
/**
 * 云会话中等待暂存文件复制完成，超时时告诉模型文件仍在复制。
 */
function waitForCcrStageFiles(clock = systemClock) {
  let pendingHomeFiles = 0;
  let begunCount = 0;
  let lastBegunAt = 0;
  let settledAt = 0;
  let waitedMsTotal = 0;
  let waiterCount = 0;
  let waitStartedAt = 0;
  let openStages = new Set();
  let signal = createSignal();
  let latestByPath = new Map();
  let notPlacedTeller = tellStageFileNotPlaced(
    clock,
    (stagePaths, causes) => waiter.onFilesNotPlaced?.(stagePaths, causes) ?? false,
  );
  let waiter = {
    clock,
    begin(isHomeFile, path, youngOnly) {
      pendingHomeFiles += isHomeFile ? 1 : 0;
      begunCount++;
      lastBegunAt = clock.monotonicNow();
      let stageMountPath = resolveStageMountPath(path);
      let stage = {
        begunAtMs: lastBegunAt,
        placeToName: stageMountPath,
      };
      openStages.add(stage);
      latestByPath.get(path)?.endLinger?.abort();
      latestByPath.set(path, stage);
      let tellBegin = notPlacedTeller.began(path, youngOnly);
      let isCurrent = () => latestByPath.get(path) === stage;
      let ended = false;
      let endStage = (placed) => {
        pendingHomeFiles -= isHomeFile ? 1 : 0;
        openStages.delete(stage);
        if (!placed) {
          for (let otherStage of openStages)
            if (otherStage.placeToName === stageMountPath) otherStage.placeToName = undefined;
        }
        if (isCurrent()) latestByPath.delete(path);
        if (openStages.size === 0) settledAt = clock.monotonicNow();
        signal.emit();
        tellBegin(placed);
      };
      return (lingerMs, placed = false) => {
        if (ended) return;
        ended = true;
        if (lingerMs !== undefined && lingerMs > 0 && isCurrent()) {
          stage.endLinger = new AbortController();
          sleep(lingerMs, stage.endLinger.signal, {
            clock,
            unref: true,
          }).then(() => endStage(placed));
        } else endStage(placed);
      };
    },
    pending() {
      return openStages.size;
    },
    pendingHomeFiles() {
      return pendingHomeFiles;
    },
    pendingYoungerThan(maxAgeMs) {
      let now = clock.monotonicNow();
      let count = 0;
      for (let { begunAtMs } of openStages) count += begunAtMs + maxAgeMs > now ? 1 : 0;
      return count;
    },
    tellOfStagesStillCopying(minAgeMs) {
      let now = clock.monotonicNow();
      let placeNames = new Set();
      for (let stage of openStages)
        if (
          stage.placeToName !== undefined &&
          stage.endLinger === undefined &&
          stage.begunAtMs + minAgeMs <= now
        )
          placeNames.add(stage.placeToName);
      if (placeNames.size === 0) return;
      let handled = false;
      try {
        handled = waiter.onFilesStillCopying?.(Array.from(placeNames)) !== true;
      } catch (error) {
        logFeatureBad("ccr_stage_file_still_copying_note", "tell_threw");
        logError(error);
      }
      if (handled) return;
      for (let stage of openStages)
        if (stage.placeToName !== undefined && placeNames.has(stage.placeToName))
          stage.placeToName = undefined;
    },
    async whenSettled({ signal: signal_2, timeoutMs, maxStageAgeMs = 1 / 0 }) {
      let startedAt = clock.monotonicNow();
      for (;;) {
        let now = clock.monotonicNow();
        let nextDeadline = -1 / 0;
        let sawExpired = false;
        for (let { begunAtMs } of openStages) {
          let deadline = begunAtMs + maxStageAgeMs;
          if (deadline > now) nextDeadline = Math.max(nextDeadline, deadline);
          else if (deadline > startedAt) sawExpired = true;
        }
        if (nextDeadline === -1 / 0) {
          notPlacedTeller.tellNow();
          return sawExpired ? "timed_out" : "settled";
        }
        if (signal_2.aborted) return "aborted";
        let waitMs = Math.min(nextDeadline, startedAt + timeoutMs) - now;
        if (waitMs <= 0) {
          notPlacedTeller.tellNow();
          return "timed_out";
        }
        let { promise, resolve } = Promise.withResolvers();
        let unsubscribe = signal.subscribe(resolve);
        let abortController = new AbortController();
        if (waiterCount++ === 0) waitStartedAt = now;
        try {
          await Promise.race([
            promise,
            sleep(waitMs, AbortSignal.any([signal_2, abortController.signal]), {
              clock,
            }),
          ]);
        } finally {
          if (--waiterCount === 0) waitedMsTotal += clock.monotonicNow() - waitStartedAt;
          unsubscribe();
          abortController.abort();
        }
      }
    },
    waitedMs() {
      return waitedMsTotal + (waiterCount > 0 ? clock.monotonicNow() - waitStartedAt : 0);
    },
    forgetWaits() {
      waitedMsTotal = 0;
      waitStartedAt = clock.monotonicNow();
    },
    tellOfFailedStagesNow: notPlacedTeller.tellNow,
    resetBegun() {
      begunCount = 0;
    },
    aroundDownload(attachmentsStart) {
      if (begunCount === 0)
        return () => ({
          stage_files_begun: 0,
        });
      let snapshot = {
        stage_files_begun: begunCount,
        stage_files_last_begun_to_attachments_start_ms: Math.round(attachmentsStart - lastBegunAt),
        stage_files_pending_at_attachments_start: openStages.size,
      };
      return () => ({
        ...snapshot,
        stage_files_pending_at_attachments_end: openStages.size,
        ...(openStages.size === 0 && {
          stage_files_settled_after_attachments_start_ms: Math.max(
            0,
            Math.round(settledAt - attachmentsStart),
          ),
        }),
      });
    },
  };
  return waiter;
}
//@ chunk-5xgkngpb.js:3855020-3855106 placement
/**
 * 按会话根保存的暂存文件等待器。
 */
var stagedFilesWaiterByRoot; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var STAGE_WAIT_OUTCOME_CODES;
deferInit("chunk-5xgkngpb.js:3855020", () => {
  stagedFilesWaiterByRoot = new SessionRootSlot(waitForCcrStageFiles);
  STAGE_WAIT_OUTCOME_CODES = {
    settled: 1,
    timed_out: 2,
    aborted: 3,
    not_enabled: 4,
    limit_spent: 5,
  };
});
//@ chunk-5xgkngpb.js:3855106-3856174 placement
/**
 * 工具调用前等待暂存文件就绪，受开关与等待额度限制。
 */
async function waitForStagedToolCallFiles(waiter, signal, activityId) {
  try {
    let youngPending = waiter.pendingYoungerThan(STAGE_WAIT_MAX_MS);
    if (youngPending === 0 || signal.aborted) return;
    let snapshot = {
      pending_at_start: waiter.pending(),
      young_at_start: youngPending,
      home_files_pending_at_start: waiter.pendingHomeFiles(),
    };
    let remainingMs = STAGE_WAIT_MAX_MS - waiter.waitedMs();
    let skipReason;
    if (
      !isSelfHostedByocEnvironment() &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_cozy_kite", false) !== true
    )
      skipReason = "not_enabled";
    else if (remainingMs <= 0) skipReason = "limit_spent";
    if (skipReason !== undefined) {
      if (skipReason === "limit_spent") logFeatureSad("ccr_stage_file_tool_call_wait", skipReason, snapshot);
      let waitPayload = {
        outcome: skipReason,
        outcome_code: STAGE_WAIT_OUTCOME_CODES[skipReason],
        ...snapshot,
      };
      logForDiagnosticsNoPII("info", "tool_call_staged_files_wait", waitPayload);
      waiter.onToolCallWait?.(waitPayload);
      return;
    }
    let waitStartedAt = waiter.clock.monotonicNow();
    startSessionActivity("files_arriving", activityId);
    let outcome = await waiter
      .whenSettled({
        signal,
        timeoutMs: remainingMs,
        maxStageAgeMs: STAGE_WAIT_MAX_MS,
      })
      .finally(() => endActivity("files_arriving", activityId));
    let donePayload = {
      waited_ms: Math.round(waiter.clock.monotonicNow() - waitStartedAt),
      ...snapshot,
      pending_at_end: waiter.pending(),
    };
    if (outcome === "settled") logFeatureOk("ccr_stage_file_tool_call_wait", donePayload);
    else logFeatureSad("ccr_stage_file_tool_call_wait", outcome, donePayload);
    let diagnosticPayload = {
      outcome,
      outcome_code: STAGE_WAIT_OUTCOME_CODES[outcome],
      ...donePayload,
    };
    logForDiagnosticsNoPII(
      outcome === "timed_out" ? "warn" : "info",
      "tool_call_staged_files_wait",
      diagnosticPayload,
    );
    waiter.onToolCallWait?.(diagnosticPayload);
  } catch (error) {
    logFeatureBad("ccr_stage_file_tool_call_wait", "threw");
    logError(error);
  } finally {
    if (!signal.aborted) waiter.tellOfStagesStillCopying(STAGE_WAIT_MAX_MS);
  }
}
//@ chunk-5xgkngpb.js:3856174-3856619 placement
/**
 * 创建等待暂存文件就绪的函数：有待处理文件时限时等待并记录结果。
 */
function createStagedFilesWaiter(waiter, timeoutMs = STAGE_WAIT_MAX_MS) {
  return async (signal) => {
    let pendingAtStart = waiter.pending();
    if (pendingAtStart === 0) return;
    let homeFilesPendingAtStart = waiter.pendingHomeFiles();
    let waitStartedAt = waiter.clock.monotonicNow();
    let outcome = await waiter.whenSettled({
      signal,
      timeoutMs,
    });
    let payload = {
      waited_ms: Math.round(waiter.clock.monotonicNow() - waitStartedAt),
      pending_at_start: pendingAtStart,
      home_files_pending_at_start: homeFilesPendingAtStart,
      pending_at_end: waiter.pending(),
    };
    logEvent("tengu_turn_handoff_staged_files_wait", {
      outcome: fromEnum(outcome),
      ...payload,
    });
    logForDiagnosticsNoPII(outcome === "timed_out" ? "warn" : "info", "turn_handoff_staged_files_wait", {
      outcome,
      ...payload,
    });
  };
}
export {
  stagedFilesWaiterByRoot,
  createStagedFilesWaiter,
  stageWaitTimeoutFor,
  classifyStageWriteError,
  waitForStagedToolCallFiles,
};
