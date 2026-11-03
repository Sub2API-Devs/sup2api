/**
 * utils/agentStopSiblings.ts
 *
 * 2.1.316 新增：停止同级代理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (13)
 * attribution: placement 13
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

//@ chunk-e6aww6q8.js:217569-217677 placement
var STOP_SIBLING_SUFFIXES = {
  stoppedByUser: ".stopped-by-user",
  observerStopped: ".observer-stopped",
};
var FOLD_BACK_DELAYS_MS = [50, 50, 50, 250, 1000, 4000];
//@ chunk-e6aww6q8.js:217677-217772 placement
/**
 * 构造停止标记的遥测字段（是否 observer、errno 码）。
 */
function stopObserverTelemetryFields(e, error) {
  let r = sanitizeErrnoTokenForTelemetry(getErrnoCode(error) ?? storageCauseErrnoCode(error));
  return {
    observer: e === "observerStopped",
    ...(r && {
      errno: r,
    }),
  };
}
//@ chunk-e6aww6q8.js:217772-217979 placement
function isUnexpectedStopError(error) {
  let n = getErrnoCode(error) ?? storageCauseErrnoCode(error);
  if (n !== undefined) return n.startsWith("ERR_");
  let cause = error instanceof Error ? error.cause : undefined;
  return !(
    isStoreError(cause) &&
    (cause.code === "Unavailable" || ("telemetryCode" in cause && cause.telemetryCode !== undefined))
  );
}
//@ chunk-e6aww6q8.js:217979-218084 placement
/**
 * 停止标记相关的缓存表（重置时清空）。
 */
var sleepUnref = (e) =>
  sleep(e, undefined, {
    unref: true,
  });
var stopSiblingCache = identity_2(new Map(), (e) => e.clear());
var foldBackGeneration = identity_2(
  {
    passed: 0,
  },
  (e) => {
    e.passed += 1;
  },
);
//@ chunk-e6aww6q8.js:218084-218120 placement
/**
 * 读取某停止标记已写入的次数。
 */
function readStopSiblingCount(e) {
  return stopSiblingCache.get(e) ?? 0;
}
//@ chunk-e6aww6q8.js:218120-218178 placement
/**
 * 由元数据文件路径推出对应的停止标记路径。
 */
function stopSiblingPath(e, n) {
  return e.replace(/\.meta\.json$/, STOP_SIBLING_SUFFIXES[n]);
}
//@ chunk-e6aww6q8.js:218178-218232 placement
/**
 * 计算停止标记的存储键（启用 v5 存储时才有）。
 */
function stopSiblingStorageKey(e, n) {
  return isStorageV5Enabled() && n !== undefined ? pathToSessionSideKey(e) : undefined;
}
//@ chunk-e6aww6q8.js:218232-218638 placement
/**
 * 写入子代理停止标记：有存储键时用存储 ifAbsent 写空内容；无盘模式报错；否则创建目录并新建空文件（已存在视为成功）。
 */
async function writeStopSibling(e, n) {
  let r = stopSiblingStorageKey(e, n);
  if (n !== undefined && r !== undefined) {
    let s = await n.write(r, "", {
      precondition: {
        type: "ifAbsent",
      },
    });
    if (!s.ok && s.error.code !== "AlreadyExists")
      throw Error("agent stop sibling: storage write failed", {
        cause: s.error,
      });
    return;
  }
  if (isDiskless()) throw Error("agent stop sibling: no storage key while diskless");
  await mkdir(dirname(e), {
    recursive: true,
  });
  await writeNewFile(e, "").catch((error) => {
    if (getErrnoCode(error) !== "EEXIST") throw error;
  });
}
//@ chunk-e6aww6q8.js:218638-219009 placement
/**
 * 判断子代理停止标记是否存在：优先查存储元数据，无盘时返回 false（存储 v5 下缺键报错），否则查本地文件。
 */
async function stopSiblingExists(e, n) {
  let r = stopSiblingStorageKey(e, n);
  if (n !== undefined && r !== undefined) {
    let s = await n.statMeta(r);
    if (!s.ok && s.error.code !== "NotFound")
      throw Error("agent stop sibling: storage stat failed", {
        cause: s.error,
      });
    return s.ok;
  }
  if (isDiskless()) {
    if (n !== undefined && isStorageV5Enabled())
      throw Error("agent stop sibling: no storage key for this path");
    return false;
  }
  return lstat(e).then(
    () => true,
    (error) => {
      if (isPathAbsent(error)) return false;
      throw error;
    },
  );
}
//@ chunk-e6aww6q8.js:219009-219255 placement
/**
 * 删除子代理停止标记（存储或本地文件，不存在视为成功）。
 */
async function removeStopSibling(e, n) {
  let r = stopSiblingStorageKey(e, n);
  if (n !== undefined && r !== undefined) {
    let s = await n.delete(r);
    if (!s.ok)
      throw Error("agent stop sibling: storage delete failed", {
        cause: s.error,
      });
    return;
  }
  if (isDiskless()) return;
  await retryTransient(() => unlink(e)).catch((error) => {
    if (!isPathAbsent(error)) throw error;
  });
}
//@ chunk-e6aww6q8.js:219255-219431 placement
async function tryFoldBack(e, n, r, s, h) {
  let y = stopSiblingPath(e, n);
  return runWithFileWriteContext(e, async () => {
    if (readStopSiblingCount(y) !== h || !(await stopSiblingExists(y, r))) return "gone";
    return (await s())
      ? "merged"
      : {
          again: undefined,
        };
  }).catch((again) => ({
    again,
  }));
}
//@ chunk-e6aww6q8.js:219431-219888 placement
/**
 * 按延迟表多次尝试把子代理的停止结果并回父记录；每次等待后若世代变化则放弃，用尽后记日志与遥测。
 */
async function scheduleFoldBack(
  e,
  n,
  r,
  s,
  h,
  y = readStopSiblingCount(stopSiblingPath(e, n)),
  [S, ...w] = FOLD_BACK_DELAYS_MS,
  again,
  G = foldBackGeneration.passed,
) {
  if (S === undefined) {
    let Z = stopObserverTelemetryFields(n, again);
    if (again !== undefined && isUnexpectedStopError(again)) logError(again);
    else if (again !== undefined)
      logForDebugging(
        `[agent stop] the fold-back of ${n} into ${e} gave up: ${describeStorageError(again)}`,
        {
          level: "warn",
        },
      );
    logFeatureSad("subagent_stop_fold_back", "schedule_spent", Z);
    return;
  }
  await h(S);
  if (foldBackGeneration.passed !== G) return;
  let q = await tryFoldBack(e, n, r, s, y);
  if (typeof q === "object") await scheduleFoldBack(e, n, r, s, h, y, w, q.again, G);
  else if (q === "merged") logFeatureOk("subagent_stop_fold_back");
}
//@ chunk-e6aww6q8.js:219888-220628 placement
/**
 * 持久化子代理停止状态。
 */
async function persistSubagentStop(agentMetadataPath, n, r, s, h, y = sleepUnref) {
  let S = stopSiblingPath(agentMetadataPath, n);
  let stopSiblingCount = readStopSiblingCount(S);
  let L = await (async () => r())().then(
    () => {
      return;
    },
    (error) => ({
      error,
    }),
  );
  if (L === undefined) {
    logFeatureOk("subagent_stop_persist");
    return;
  }
  let G = stopObserverTelemetryFields(n, L.error);
  if (isUnexpectedStopError(L.error)) logError(L.error);
  logForDebugging(`[agent stop] ${agentMetadataPath} did not take ${n}: ${describeStorageError(L.error)}`, {
    level: "warn",
  });
  let q = await runWithFileWriteContext(agentMetadataPath, async () => {
    if (readStopSiblingCount(S) !== stopSiblingCount) return "revived";
    await writeStopSibling(S, h);
    return "created";
  }).catch((error) => ({
    error,
  }));
  if (q === "revived") {
    logFeatureSad("subagent_stop_persist", "overtaken_by_revival", G);
    return;
  }
  if (q !== "created") {
    let Z = stopObserverTelemetryFields(n, q.error);
    logFeatureBad("subagent_stop_persist", "not_persisted", Z);
    if (isUnexpectedStopError(q.error)) logError(q.error);
    logForDebugging(
      `[agent stop] nor did a file beside ${agentMetadataPath}: ${describeStorageError(q.error)}`,
      {
        level: "warn",
      },
    );
    return;
  }
  logFeatureSad("subagent_stop_persist", "kept_beside_sidecar", G);
  scheduleFoldBack(agentMetadataPath, n, h, s, y, stopSiblingCount);
}
export {
  stopSiblingExists,
  stopSiblingPath,
  stopSiblingCache,
  readStopSiblingCount,
  removeStopSibling,
  persistSubagentStop,
};
