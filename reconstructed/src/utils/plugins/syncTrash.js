/**
 * utils/plugins/syncTrash.ts
 *
 * 2.1.316 新增：同步回收站
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (8)
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

//@ chunk-e6aww6q8.js:627074-627213 placement
var SYNC_TRASH_MAX_ENTRIES = 3;
var MAX_TRASH_SCAN = 1024;
var TRASH_TTL_MS = 604800000;
var MAX_RETRIES = 5;
var RETRY_DELAY_MS = 100;
var TENGU_LINKED_COCOA = "tengu_linked_cocoa";
var TRASH_ENTRY_NAME_RE = /^(\d+)-\d+-(?:([0-9a-f]{32})-)?[^-]+$/;
var trimQueues = new HostScoped(() => new Map());
//@ chunk-e6aww6q8.js:627213-627314 placement
function hashSyncRootPath(e) {
  return createHash("sha256")
    .update(e.startsWith(SKILLS_SYNCED_STAGING + sep) ? stripGenerationSuffix(e) : e)
    .digest("hex")
    .slice(0, 32);
}
//@ chunk-e6aww6q8.js:627314-627378 placement
/**
 * syncTrashTempPrefix：同步回收站临时名前缀。
 */
function syncTrashTempPrefix(e) {
  return `${Date.now()}-${process.pid}-${hashSyncRootPath(e)}-`;
}
//@ chunk-e6aww6q8.js:627378-627705 placement
/**
 * 排队修剪同步回收站（合并同一根的请求）。
 */
function queueSyncTrashTrim(e, n) {
  let r = trimQueues.of(getRootSession().host);
  let s = r.get(e) ?? {
    running: Promise.resolve({
      removed: 0,
      errors: 0,
    }),
  };
  r.set(e, s);
  let h = s.queued ?? {
    justMoved: new Set(),
    countsUntagged: false,
    outcome: s.running.then(() => {
      s.queued = undefined;
      s.running = trimSyncTrash(e, h);
      return s.running;
    }),
  };
  s.queued = h;
  if (n === undefined) h.countsUntagged = true;
  else h.justMoved.add(n);
  return h.outcome;
}
//@ chunk-e6aww6q8.js:627705-629280 placement
/**
 * 修剪同步回收站。
 */
async function trimSyncTrash(e, { justMoved, countsUntagged }) {
  let s = {
    removed: 0,
    errors: 0,
  };
  try {
    if (!getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LINKED_COCOA, true)) return s;
    let h = new Map();
    let y = 0;
    for (let Z of await readdir(e, {
      withFileTypes: true,
    })) {
      let Se = Z.isDirectory() || safeResolvePath_2(Z) ? TRASH_ENTRY_NAME_RE.exec(Z.name) : null;
      if (Se === null) continue;
      y++;
      let ke = Se[2];
      if (ke !== undefined || countsUntagged) {
        let we = ke ?? Z.name;
        let Ee = h.get(we) ?? [];
        h.set(we, Ee);
        Ee.push({
          entry: Z,
          movedAtMs: Number(Se[1] ?? 0),
          justMoved: justMoved.has(Z.name),
        });
      }
    }
    let S = [];
    let w = [];
    for (let Z of h.values()) {
      let Se = [];
      let ke = 0;
      for (let Ee of Z.toSorted(syncTrashEntryOrder)) {
        let Ae = join(e, Ee.entry.name);
        try {
          if (ke >= SYNC_TRASH_MAX_ENTRIES) {
            if (
              isFreshTimestamp_2(Ee.movedAtMs, TRASH_TTL_MS) ||
              (await retryOnBusy(s, () => isTrashEntryInUse(e, Ee.entry)))
            )
              Se.push(Ee);
            else {
              await retryOnBusy(s, () => removeDirectoryTreeNoFollow_2(Ae));
              s.removed++;
            }
            continue;
          }
          if (Z.length > SYNC_TRASH_MAX_ENTRIES) {
            if (!(await retryOnBusy(s, () => classifyDirEntry(e, Ee.entry))).isDirectory) continue;
            if ((await retryOnBusy(s, () => readdir(Ae))).length === 0) continue;
          }
          ke++;
          if (ke === 1) S.push(Ee);
          else Se.push(Ee);
        } catch (error) {
          recordSyncError(s, error);
        }
      }
      let last = Se.findLast((Ee) => isFreshTimestamp_2(Ee.movedAtMs, TRASH_TTL_MS));
      for (let Ee of Se)
        if (Ee === last) S.push(Ee);
        else w.push(Ee);
    }
    let max = Math.max(0, S.length + w.length - MAX_TRASH_SCAN);
    let filtered = S.filter((Z) => !Z.justMoved && !isFreshTimestamp_2(Z.movedAtMs, TRASH_TTL_MS));
    let q = [];
    for (let Z of [
      ...w.toSorted(syncTrashEntryOrder).toReversed(),
      ...filtered.toSorted(syncTrashEntryOrder).toReversed(),
    ]) {
      if (max === 0) break;
      try {
        if (await retryOnBusy(s, () => isTrashEntryInUse(e, Z.entry))) {
          q.push(Z);
          continue;
        }
        await retryOnBusy(s, () => removeDirectoryTreeNoFollow_2(join(e, Z.entry.name)));
        s.removed++;
      } catch (error) {
        recordSyncError(s, error);
      }
      max--;
    }
    for (let Z of q.slice(0, max))
      try {
        await retryOnBusy(s, () => removeDirectoryTreeNoFollow_2(join(e, Z.entry.name)));
        s.removed++;
      } catch (error) {
        recordSyncError(s, error);
      }
    if (s.removed > 0)
      logFeatureOk("sync_trash_trim", {
        removed_count: s.removed,
        total: y - s.removed,
      });
  } catch (error) {
    recordSyncError(s, error);
  }
  if (s.failure !== undefined) {
    logForDiagnosticsNoPII("warn", "sync_trash_trim_failed", {
      code: s.failure,
    });
    logFeatureSad("sync_trash_trim", s.failure);
  }
  return s;
}
//@ chunk-e6aww6q8.js:629280-629543 placement
async function isTrashEntryInUse(e, entry) {
  if (!(await classifyDirEntry(e, entry)).isDirectory) return false;
  let r = join(e, entry.name);
  for (let s of await readdir(r, {
    withFileTypes: true,
  }))
    if (
      (await classifyDirEntry(r, s)).isDirectory &&
      (await isPluginVersionInUse(join(r, s.name)).catch(() => {
        logForDiagnosticsNoPII("warn", "sync_trash_in_use_probe_failed");
        return true;
      }))
    )
      return true;
  return false;
}
//@ chunk-e6aww6q8.js:629543-629706 placement
async function retryOnBusy(e, n) {
  for (let idx = 1; ; idx++)
    try {
      return await n();
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (
        idx === MAX_RETRIES ||
        e.failure !== undefined ||
        !(errnoCode === "ENOTEMPTY" || isUnavailableErrorCode(errnoCode))
      )
        throw error;
      await sleep(idx * RETRY_DELAY_MS);
    }
}
//@ chunk-e6aww6q8.js:629706-629796 placement
function syncTrashEntryOrder(e, n) {
  return Number(n.justMoved) - Number(e.justMoved) || n.movedAtMs - e.movedAtMs;
}
export { queueSyncTrashTrim, syncTrashTempPrefix };
