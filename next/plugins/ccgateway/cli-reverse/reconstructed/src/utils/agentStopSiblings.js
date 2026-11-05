/**
 * utils/agentStopSiblings.ts
 *
 * 2.1.316 新增：停止同级代理
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (13)
 * attribution: placement 13
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { mkdir, lstat, unlink } from "fs/promises";
import { dirname } from "path";
import {
  sanitizeErrnoTokenForTelemetry,
  getErrnoCode,
  storageCauseErrnoCode,
  isPathAbsent,
} from "./errors.js";
import { isStoreError } from "./storage/storageErrors.js";
import { sleep } from "./sleep.js";
import { identity as identity_2 } from "./identity.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { pathToSessionSideKey } from "./storage/storageKeys.js";
import { isDiskless } from "../bootstrap/state.js";
import { writeNewFile, retryTransient } from "./atomicPublishWrite.js";
import { runWithFileWriteContext } from "./file.js";
import { logError } from "./log.js";
import { logForDebugging } from "./debug.js";
import { describeStorageError } from "./agentMetadata.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:216795-216903 placement
var STOP_SIBLING_SUFFIXES = {
  stoppedByUser: ".stopped-by-user",
  observerStopped: ".observer-stopped",
};
var FOLD_BACK_DELAYS_MS = [50, 50, 50, 250, 1000, 4000];
//@ chunk-5xgkngpb.js:216903-216998 placement
/**
 * 构造停止标记的遥测字段（是否 observer、errno 码）。
 */
function stopObserverTelemetryFields(observerStatus, error) {
  let errnoToken = sanitizeErrnoTokenForTelemetry(getErrnoCode(error) ?? storageCauseErrnoCode(error));
  return {
    observer: observerStatus === "observerStopped",
    ...(errnoToken && {
      errno: errnoToken,
    }),
  };
}
//@ chunk-5xgkngpb.js:216998-217205 placement
function isUnexpectedStopError(error) {
  let errnoCode = getErrnoCode(error) ?? storageCauseErrnoCode(error);
  if (errnoCode !== undefined) return errnoCode.startsWith("ERR_");
  let cause = error instanceof Error ? error.cause : undefined;
  return !(
    isStoreError(cause) &&
    (cause.code === "Unavailable" || ("telemetryCode" in cause && cause.telemetryCode !== undefined))
  );
}
//@ chunk-5xgkngpb.js:217205-217310 placement
/**
 * 停止标记相关的缓存表（重置时清空）。
 */
var sleepUnref; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var stopSiblingCache;
var foldBackGeneration;
deferInit("chunk-5xgkngpb.js:217205", () => {
  sleepUnref = (ms) =>
    sleep(ms, undefined, {
      unref: true,
    });
  stopSiblingCache = identity_2(new Map(), (map) => map.clear());
  foldBackGeneration = identity_2(
    {
      passed: 0,
    },
    (foldBackState) => {
      foldBackState.passed += 1;
    },
  );
});
//@ chunk-5xgkngpb.js:217310-217346 placement
/**
 * 读取某停止标记已写入的次数。
 */
function readStopSiblingCount(sessionId) {
  return stopSiblingCache.get(sessionId) ?? 0;
}
//@ chunk-5xgkngpb.js:217346-217404 placement
/**
 * 由元数据文件路径推出对应的停止标记路径。
 */
function stopSiblingPath(path, index) {
  return path.replace(/\.meta\.json$/, STOP_SIBLING_SUFFIXES[index]);
}
//@ chunk-5xgkngpb.js:217404-217458 placement
/**
 * 计算停止标记的存储键（启用 v5 存储时才有）。
 */
function stopSiblingStorageKey(path, storage) {
  return isStorageV5Enabled() && storage !== undefined ? pathToSessionSideKey(path) : undefined;
}
//@ chunk-5xgkngpb.js:217458-217864 placement
/**
 * 写入子代理停止标记：有存储键时用存储 ifAbsent 写空内容；无盘模式报错；否则创建目录并新建空文件（已存在视为成功）。
 */
async function writeStopSibling(path, storage) {
  let storageKey = stopSiblingStorageKey(path, storage);
  if (storage !== undefined && storageKey !== undefined) {
    let writeResult = await storage.write(storageKey, "", {
      precondition: {
        type: "ifAbsent",
      },
    });
    if (!writeResult.ok && writeResult.error.code !== "AlreadyExists")
      throw Error("agent stop sibling: storage write failed", {
        cause: writeResult.error,
      });
    return;
  }
  if (isDiskless()) throw Error("agent stop sibling: no storage key while diskless");
  await mkdir(dirname(path), {
    recursive: true,
  });
  await writeNewFile(path, "").catch((error) => {
    if (getErrnoCode(error) !== "EEXIST") throw error;
  });
}
//@ chunk-5xgkngpb.js:217864-218235 placement
/**
 * 判断子代理停止标记是否存在：优先查存储元数据，无盘时返回 false（存储 v5 下缺键报错），否则查本地文件。
 */
async function stopSiblingExists(path, storage) {
  let storageKey = stopSiblingStorageKey(path, storage);
  if (storage !== undefined && storageKey !== undefined) {
    let statResult = await storage.statMeta(storageKey);
    if (!statResult.ok && statResult.error.code !== "NotFound")
      throw Error("agent stop sibling: storage stat failed", {
        cause: statResult.error,
      });
    return statResult.ok;
  }
  if (isDiskless()) {
    if (storage !== undefined && isStorageV5Enabled())
      throw Error("agent stop sibling: no storage key for this path");
    return false;
  }
  return lstat(path).then(
    () => true,
    (error) => {
      if (isPathAbsent(error)) return false;
      throw error;
    },
  );
}
//@ chunk-5xgkngpb.js:218235-218481 placement
/**
 * 删除子代理停止标记（存储或本地文件，不存在视为成功）。
 */
async function removeStopSibling(path, storage) {
  let storageKey = stopSiblingStorageKey(path, storage);
  if (storage !== undefined && storageKey !== undefined) {
    let deleteResult = await storage.delete(storageKey);
    if (!deleteResult.ok)
      throw Error("agent stop sibling: storage delete failed", {
        cause: deleteResult.error,
      });
    return;
  }
  if (isDiskless()) return;
  await retryTransient(() => unlink(path)).catch((error) => {
    if (!isPathAbsent(error)) throw error;
  });
}
//@ chunk-5xgkngpb.js:218481-218657 placement
async function tryFoldBack(agentMetadataPath, stopSiblingSuffix, storage, mergeFn, expectedCount) {
  let stopSiblingPath_2 = stopSiblingPath(agentMetadataPath, stopSiblingSuffix);
  return runWithFileWriteContext(agentMetadataPath, async () => {
    if (
      readStopSiblingCount(stopSiblingPath_2) !== expectedCount ||
      !(await stopSiblingExists(stopSiblingPath_2, storage))
    )
      return "gone";
    return (await mergeFn())
      ? "merged"
      : {
          again: undefined,
        };
  }).catch((again) => ({
    again,
  }));
}
//@ chunk-5xgkngpb.js:218657-219116 placement
/**
 * 按延迟表多次尝试把子代理的停止结果并回父记录；每次等待后若世代变化则放弃，用尽后记日志与遥测。
 */
async function scheduleFoldBack(
  agentMetadataPath,
  stopSiblingSuffix,
  storage,
  mergeFn,
  sleepFn,
  expectedCount = readStopSiblingCount(stopSiblingPath(agentMetadataPath, stopSiblingSuffix)),
  [firstDelayMs, ...remainingDelaysMs] = FOLD_BACK_DELAYS_MS,
  again,
  generation = foldBackGeneration.passed,
) {
  if (firstDelayMs === undefined) {
    let telemetryFields = stopObserverTelemetryFields(stopSiblingSuffix, again);
    if (again !== undefined && isUnexpectedStopError(again)) logError(again);
    else if (again !== undefined)
      logForDebugging(
        `[agent stop] the fold-back of ${stopSiblingSuffix} into ${agentMetadataPath} gave up: ${describeStorageError(again)}`,
        {
          level: "warn",
        },
      );
    logFeatureSad("subagent_stop_fold_back", "schedule_spent", telemetryFields);
    return;
  }
  await sleepFn(firstDelayMs);
  if (foldBackGeneration.passed !== generation) return;
  let outcome = await tryFoldBack(agentMetadataPath, stopSiblingSuffix, storage, mergeFn, expectedCount);
  if (typeof outcome === "object")
    await scheduleFoldBack(
      agentMetadataPath,
      stopSiblingSuffix,
      storage,
      mergeFn,
      sleepFn,
      expectedCount,
      remainingDelaysMs,
      outcome.again,
      generation,
    );
  else if (outcome === "merged") logFeatureOk("subagent_stop_fold_back");
}
//@ chunk-5xgkngpb.js:219116-219862 placement
/**
 * 持久化子代理停止状态。
 */
async function persistSubagentStop(
  agentMetadataPath,
  stopSiblingSuffix,
  writeCallback,
  mergeFn,
  storage,
  sleepFn = sleepUnref,
) {
  let stopSiblingPath_2 = stopSiblingPath(agentMetadataPath, stopSiblingSuffix);
  let expectedCount = readStopSiblingCount(stopSiblingPath_2);
  let writeOutcome = await (async () => writeCallback())().then(
    () => {
      return;
    },
    (error) => ({
      error,
    }),
  );
  if (writeOutcome === undefined) {
    logFeatureOk("subagent_stop_persist");
    return;
  }
  let telemetryFields = stopObserverTelemetryFields(stopSiblingSuffix, writeOutcome.error);
  if (isUnexpectedStopError(writeOutcome.error)) logError(writeOutcome.error);
  logForDebugging(
    `[agent stop] ${agentMetadataPath} did not take ${stopSiblingSuffix}: ${describeStorageError(writeOutcome.error)}`,
    {
      level: "warn",
    },
  );
  let persistResult = await runWithFileWriteContext(agentMetadataPath, async () => {
    if (readStopSiblingCount(stopSiblingPath_2) !== expectedCount) return "revived";
    await writeStopSibling(stopSiblingPath_2, storage);
    return "created";
  }).catch((error) => ({
    error,
  }));
  if (persistResult === "revived") {
    logFeatureSad("subagent_stop_persist", "overtaken_by_revival", telemetryFields);
    return;
  }
  if (persistResult !== "created") {
    let telemetryFields = stopObserverTelemetryFields(stopSiblingSuffix, persistResult.error);
    logFeatureBad("subagent_stop_persist", "not_persisted", telemetryFields);
    if (isUnexpectedStopError(persistResult.error)) logError(persistResult.error);
    logForDebugging(
      `[agent stop] nor did a file beside ${agentMetadataPath}: ${describeStorageError(persistResult.error)}`,
      {
        level: "warn",
      },
    );
    return;
  }
  logFeatureSad("subagent_stop_persist", "kept_beside_sidecar", telemetryFields);
  scheduleFoldBack(agentMetadataPath, stopSiblingSuffix, storage, mergeFn, sleepFn, expectedCount);
}
export {
  stopSiblingExists,
  stopSiblingPath,
  stopSiblingCache,
  readStopSiblingCount,
  removeStopSibling,
  persistSubagentStop,
};
