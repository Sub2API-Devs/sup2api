/**
 * utils/plugins/syncTrash.ts
 *
 * 2.1.316 新增：同步回收站
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (8)
 * attribution: placement 8
 */
import { createHash } from "crypto";
import { sep, join } from "path";
import { readdir } from "fs/promises";
import { HostScoped } from "../hostScoped.js";
import { SKILLS_SYNCED_STAGING, stripGenerationSuffix } from "./syncedItems.js";
import { getRootSession } from "../../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { safeResolvePath_2 } from "../fsOperations.js";
import { isFreshTimestamp as isFreshTimestamp_2 } from "./pluginCachePaths.js";
import {
  removeDirectoryTreeNoFollow as removeDirectoryTreeNoFollow_2,
  classifyDirEntry,
} from "../fsRemove.js";
import { recordSyncError } from "../claudeAiSync/syncOwnedRoot.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import { isPluginVersionInUse } from "./inUseMarkers.js";
import { getErrnoCode } from "../errors.js";
import { isUnavailableErrorCode } from "../settings/managedEnvKeys.js";
import { sleep } from "../sleep.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:637184-637323 placement
var SYNC_TRASH_MAX_ENTRIES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_TRASH_SCAN;
var TRASH_TTL_MS;
var MAX_RETRIES;
var RETRY_DELAY_MS;
var TENGU_LINKED_COCOA;
var TRASH_ENTRY_NAME_RE;
var trimQueues;
deferInit("chunk-5xgkngpb.js:637184", () => {
  SYNC_TRASH_MAX_ENTRIES = 3;
  MAX_TRASH_SCAN = 1024;
  TRASH_TTL_MS = 604800000;
  MAX_RETRIES = 5;
  RETRY_DELAY_MS = 100;
  TENGU_LINKED_COCOA = "tengu_linked_cocoa";
  TRASH_ENTRY_NAME_RE = /^(\d+)-\d+-(?:([0-9a-f]{32})-)?[^-]+$/;
  trimQueues = new HostScoped(() => new Map());
});
//@ chunk-5xgkngpb.js:637323-637424 placement
function hashSyncRootPath(path) {
  return createHash("sha256")
    .update(path.startsWith(SKILLS_SYNCED_STAGING + sep) ? stripGenerationSuffix(path) : path)
    .digest("hex")
    .slice(0, 32);
}
//@ chunk-5xgkngpb.js:637424-637488 placement
/**
 * syncTrashTempPrefix：同步回收站临时名前缀。
 */
function syncTrashTempPrefix(path) {
  return `${Date.now()}-${process.pid}-${hashSyncRootPath(path)}-`;
}
//@ chunk-5xgkngpb.js:637488-637815 placement
/**
 * 排队修剪同步回收站（合并同一根的请求）。
 */
function queueSyncTrashTrim(trashDir, justMovedName) {
  let queues = trimQueues.of(getRootSession().host);
  let slot = queues.get(trashDir) ?? {
    running: Promise.resolve({
      removed: 0,
      errors: 0,
    }),
  };
  queues.set(trashDir, slot);
  let pending = slot.queued ?? {
    justMoved: new Set(),
    countsUntagged: false,
    outcome: slot.running.then(() => {
      slot.queued = undefined;
      slot.running = trimSyncTrash(trashDir, pending);
      return slot.running;
    }),
  };
  slot.queued = pending;
  if (justMovedName === undefined) pending.countsUntagged = true;
  else pending.justMoved.add(justMovedName);
  return pending.outcome;
}
//@ chunk-5xgkngpb.js:637815-639409 placement
/**
 * 修剪同步回收站。
 */
async function trimSyncTrash(trashDir, { justMoved, countsUntagged }) {
  let stats = {
    removed: 0,
    errors: 0,
  };
  try {
    if (!getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LINKED_COCOA, true)) return stats;
    let byAge = new Map();
    let total = 0;
    for (let entry of await readdir(trashDir, {
      withFileTypes: true,
    })) {
      let match =
        entry.isDirectory() || safeResolvePath_2(entry) ? TRASH_ENTRY_NAME_RE.exec(entry.name) : null;
      if (match === null) continue;
      total++;
      let ageKey = match[2];
      if (ageKey !== undefined || countsUntagged) {
        let key = ageKey ?? entry.name;
        let list = byAge.get(key) ?? [];
        byAge.set(key, list);
        list.push({
          entry,
          movedAtMs: Number(match[1] ?? 0),
          justMoved: justMoved.has(entry.name),
        });
      }
    }
    let kept = [];
    let overflow = [];
    for (let group of byAge.values()) {
      let rest = [];
      let inUseCount = 0;
      for (let item of group.toSorted(syncTrashEntryOrder)) {
        let fullPath = join(trashDir, item.entry.name);
        try {
          if (inUseCount >= SYNC_TRASH_MAX_ENTRIES) {
            if (
              isFreshTimestamp_2(item.movedAtMs, TRASH_TTL_MS) ||
              (await retryOnBusy(stats, () => isTrashEntryInUse(trashDir, item.entry)))
            )
              rest.push(item);
            else {
              await retryOnBusy(stats, () => removeDirectoryTreeNoFollow_2(fullPath));
              stats.removed++;
            }
            continue;
          }
          if (group.length > SYNC_TRASH_MAX_ENTRIES) {
            if (!(await retryOnBusy(stats, () => classifyDirEntry(trashDir, item.entry))).isDirectory)
              continue;
            if ((await retryOnBusy(stats, () => readdir(fullPath))).length === 0) continue;
          }
          inUseCount++;
          if (inUseCount === 1) kept.push(item);
          else rest.push(item);
        } catch (error) {
          recordSyncError(stats, error);
        }
      }
      let last = rest.findLast((item) => isFreshTimestamp_2(item.movedAtMs, TRASH_TTL_MS));
      for (let item of rest)
        if (item === last) kept.push(item);
        else overflow.push(item);
    }
    let max = Math.max(0, kept.length + overflow.length - MAX_TRASH_SCAN);
    let filtered = kept.filter(
      (item) => !item.justMoved && !isFreshTimestamp_2(item.movedAtMs, TRASH_TTL_MS),
    );
    let retried = [];
    for (let item of [
      ...overflow.toSorted(syncTrashEntryOrder).toReversed(),
      ...filtered.toSorted(syncTrashEntryOrder).toReversed(),
    ]) {
      if (max === 0) break;
      try {
        if (await retryOnBusy(stats, () => isTrashEntryInUse(trashDir, item.entry))) {
          retried.push(item);
          continue;
        }
        await retryOnBusy(stats, () => removeDirectoryTreeNoFollow_2(join(trashDir, item.entry.name)));
        stats.removed++;
      } catch (error) {
        recordSyncError(stats, error);
      }
      max--;
    }
    for (let item of retried.slice(0, max))
      try {
        await retryOnBusy(stats, () => removeDirectoryTreeNoFollow_2(join(trashDir, item.entry.name)));
        stats.removed++;
      } catch (error) {
        recordSyncError(stats, error);
      }
    if (stats.removed > 0)
      logFeatureOk("sync_trash_trim", {
        removed_count: stats.removed,
        total: total - stats.removed,
      });
  } catch (error) {
    recordSyncError(stats, error);
  }
  if (stats.failure !== undefined) {
    logForDiagnosticsNoPII("warn", "sync_trash_trim_failed", {
      code: stats.failure,
    });
    logFeatureSad("sync_trash_trim", stats.failure);
  }
  return stats;
}
//@ chunk-5xgkngpb.js:639409-639672 placement
async function isTrashEntryInUse(trashDir, entry) {
  if (!(await classifyDirEntry(trashDir, entry)).isDirectory) return false;
  let entryDir = join(trashDir, entry.name);
  for (let inner of await readdir(entryDir, {
    withFileTypes: true,
  }))
    if (
      (await classifyDirEntry(entryDir, inner)).isDirectory &&
      (await isPluginVersionInUse(join(entryDir, inner.name)).catch(() => {
        logForDiagnosticsNoPII("warn", "sync_trash_in_use_probe_failed");
        return true;
      }))
    )
      return true;
  return false;
}
//@ chunk-5xgkngpb.js:639672-639835 placement
async function retryOnBusy(stats, attempt) {
  for (let idx = 1; ; idx++)
    try {
      return await attempt();
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (
        idx === MAX_RETRIES ||
        stats.failure !== undefined ||
        !(errnoCode === "ENOTEMPTY" || isUnavailableErrorCode(errnoCode))
      )
        throw error;
      await sleep(idx * RETRY_DELAY_MS);
    }
}
//@ chunk-5xgkngpb.js:639835-639925 placement
function syncTrashEntryOrder(left, right) {
  return Number(right.justMoved) - Number(left.justMoved) || right.movedAtMs - left.movedAtMs;
}
export { queueSyncTrashTrim, syncTrashTempPrefix };
