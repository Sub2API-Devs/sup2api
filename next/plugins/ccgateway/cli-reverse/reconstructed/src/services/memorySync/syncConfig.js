/**
 * services/memorySync/syncConfig.ts
 *
 * 记忆同步配置与开关（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (18)
 * attribution: placement 9, layout 9
 */
import { resolve, sep, join } from "path";
import { MAX_CONTENT_BYTES } from "../orgMemory/storeErrors.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { runWithConcurrency } from "./storeReconcile.js";
import { statLocalEntry } from "./mountWalk.js";
import { isENOENT } from "../../utils/errors.js";
import { countWhere } from "../../utils/collections.js";
import { grantedModeFor, isOrgMemoryWriteOptedIn } from "../orgMemory/orgMemoryDecision.js";
import { readFlagWithOverride } from "../analytics/flagOverrides.js";
import { escapeForTag } from "../../utils/sanitization.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:95747-95864 placement
var MAX_MEMORY_BYTES; // deferred: uses memoryIdSchema (../orgMemory/storeErrors.js) of its import cycle while loading; runs once the cycle is complete
var EMPTY_CONTENT_SHA256;
var EMPTY_CONTENT_HASH;
var LOCAL_IO_CONCURRENCY;
var STAT_CONCURRENCY;
var MAX_BATCH_BYTES;
var SYNC_INTERVAL_MS;
var MAX_RETRIES;
var MAX_PULL_RETRIES;
var SUPPRESS_MS_2;
var MTIME_SETTLE_MS;
var WRITE_SETTLE_MS;
var PUSH_TIMEOUT_MS;
deferInit("chunk-7jxyna5q.js:95747", () => {
  MAX_MEMORY_BYTES = MAX_CONTENT_BYTES;
  EMPTY_CONTENT_SHA256 = computeContentHash("");
  EMPTY_CONTENT_HASH = "0".repeat(64);
  LOCAL_IO_CONCURRENCY = 6;
  STAT_CONCURRENCY = 6;
  MAX_BATCH_BYTES = MAX_MEMORY_BYTES * 6 + 16384;
  SYNC_INTERVAL_MS = 1800000;
  MAX_RETRIES = 3;
  MAX_PULL_RETRIES = 2;
  SUPPRESS_MS_2 = 600000;
  MTIME_SETTLE_MS = 2000;
  WRITE_SETTLE_MS = MTIME_SETTLE_MS;
  PUSH_TIMEOUT_MS = 30000;
});
//@ chunk-7jxyna5q.js:95864-96065 layout
function memoryPushDeleteMode() {
  let CLAUDE_CODE_MEMORY_PUSH_DELETE_MODE = env.CLAUDE_CODE_MEMORY_PUSH_DELETE_MODE;
  if (CLAUDE_CODE_MEMORY_PUSH_DELETE_MODE !== undefined) return CLAUDE_CODE_MEMORY_PUSH_DELETE_MODE;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_mem_push_delete_mode",
    "corroborate",
  );
  return featureValue_CACHED_MAY_BE_STALE === "immediate" ||
    featureValue_CACHED_MAY_BE_STALE === "never" ||
    featureValue_CACHED_MAY_BE_STALE === "recorded"
    ? featureValue_CACHED_MAY_BE_STALE
    : "corroborate";
}
//@ chunk-7jxyna5q.js:96065-96170 layout
function deleteModeAllowsCorroborate(mode) {
  switch (mode) {
    case "corroborate":
    case "immediate":
      return true;
    case "never":
    case "recorded":
      return false;
  }
}
//@ chunk-7jxyna5q.js:96170-96217 placement
/**
 * 读 tengu_typed_koala（默认开）。
 */
function isTypedKoalaEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_typed_koala", true);
}
//@ chunk-7jxyna5q.js:96217-96284 placement
/**
 * 判断抑制原因是否可作为有效原因（非空）。
 */
function isUsableSuppressedReason(basisUnusable) {
  return typeof basisUnusable === "string" && basisUnusable !== "empty_store" && isTypedKoalaEnabled();
}
//@ chunk-7jxyna5q.js:96284-96333 placement
/**
 * 批量删除阈值比例（0.1）。
 */
var MIN_MASS_DELETE_THRESHOLD = 50;
var MASS_DELETE_RATIO = 0.1;
var namedDeleteWindowMs = 60000;
var TENGU_COZY_TEACUP = "tengu_cozy_teacup";
//@ chunk-7jxyna5q.js:96333-96466 placement
function getMassDeleteThreshold(syncedCount) {
  if (env.CLAUDE_CODE_DISABLE_MEMORY_MASS_DELETE_HOLD) return Number.POSITIVE_INFINITY;
  return Math.max(MIN_MASS_DELETE_THRESHOLD, Math.floor(syncedCount * MASS_DELETE_RATIO));
}
//@ chunk-7jxyna5q.js:96466-96606 layout
function pruneNamedDeletes(store) {
  let now = Date.now();
  store.namedDeletesSentAtMs = store.namedDeletesSentAtMs?.filter(
    (sentAt) => now - sentAt < namedDeleteWindowMs,
  );
  return store.namedDeletesSentAtMs?.length ?? 0;
}
//@ chunk-7jxyna5q.js:96606-97167 placement
/**
 * 检查每个可写记忆库：本地缺失的远端文件加上要删除的目标数超过阈值时返回阈值与计数，用于阻止大批量删除。
 */
async function detectMassDelete(stores, localPaths, storageV5) {
  for (let store of stores) {
    let threshold = getMassDeleteThreshold(store.remoteHashes.size);
    if (
      store.remoteHashes.size + pruneNamedDeletes(store) <= threshold ||
      !(canDeleteRemotely(store) || canRecordNamedDeletes(store))
    )
      continue;
    let mountPrefix = resolve(store.mountDir) + sep;
    let targets = new Set(
      localPaths
        .filter((localPath) => localPath.startsWith(mountPrefix))
        .map((localPath) => "/" + localPath.slice(mountPrefix.length).split(sep).join("/"))
        .filter((key) => store.remoteHashes.has(key)),
    );
    if (targets.size === 0) continue;
    let missingNow = new Set();
    await runWithConcurrency([...store.remoteHashes.keys()], STAT_CONCURRENCY, async (key) => {
      let filePath = join(mountPrefix, key);
      if (
        filePath.startsWith(mountPrefix) &&
        (await statLocalEntry(storageV5, store, filePath).then(() => false, isENOENT))
      )
        missingNow.add(key);
    });
    let onDiskCount = countWhere([...targets], (key) => !missingNow.has(key));
    let missingTotal = missingNow.size + pruneNamedDeletes(store);
    if (missingTotal + onDiskCount > threshold)
      return {
        threshold,
        missingNow: missingTotal,
        targetsOnDisk: onDiskCount,
      };
  }
  return null;
}
//@ chunk-7jxyna5q.js:97167-97287 placement
function canPushStore(store) {
  return (
    store.backend.mode !== "ro" &&
    ((store.source ?? "env") !== "discovery" ||
      (grantedModeFor(store.backend.partitionId) === "rw" && isOrgMemoryWriteOptedIn()))
  );
}
//@ chunk-7jxyna5q.js:97287-97325 placement
/**
 * 该存储是否允许远程删除（且删除模式不是 never）。
 */
function canDeleteRemotely(store) {
  return canPushStore(store) && deleteModeAllowsCorroborate(memoryPushDeleteMode());
}
//@ chunk-7jxyna5q.js:97325-97553 layout
function canRecordNamedDeletes(store) {
  let mode = process.env.CLAUDE_CODE_MEMORY_PUSH_DELETE_MODE;
  let deleteMode = memoryPushDeleteMode();
  return (
    store.scope !== "account" &&
    canPushStore(store) &&
    ((deleteMode === "recorded" &&
      (mode === undefined || env.CLAUDE_CODE_MEMORY_PUSH_DELETE_MODE === deleteMode)) ||
      (deleteMode === "never" &&
        mode === undefined &&
        readFlagWithOverride(TENGU_COZY_TEACUP, {
          safe: false,
        })))
  );
}
//@ chunk-7jxyna5q.js:97553-97650 layout
function isRemoveAlreadyRecorded(store, path, ref) {
  let existingRemoval = store.namedRemovals?.get(path);
  return (
    existingRemoval?.id === ref.id && existingRemoval.sha256 === ref.sha256 && canRecordNamedDeletes(store)
  );
}
//@ chunk-7jxyna5q.js:97650-97747 layout
function dropPresentRemovals(store, diskPaths) {
  for (let removedPath of store.namedRemovals?.keys() ?? [])
    if (diskPaths.has(removedPath)) store.namedRemovals?.delete(removedPath);
}
//@ chunk-7jxyna5q.js:97747-98064 layout
async function collectDeleteCandidates(stores, localPaths, path) {
  let candidates = [];
  for (let store of stores) {
    if (!canRecordNamedDeletes(store)) continue;
    let mountPrefix = resolve(store.mountDir) + sep;
    for (let localPath of localPaths) {
      if (!localPath.startsWith(mountPrefix)) continue;
      let key = "/" + localPath.slice(mountPrefix.length).split(sep).join("/");
      let ref = store.remoteHashes.get(key);
      if (
        ref !== undefined &&
        (await statLocalEntry(path, store, localPath).then(
          () => true,
          () => false,
        ))
      )
        candidates.push({
          store,
          path: key,
          absolutePath: localPath,
          ref,
        });
    }
  }
  return candidates;
}
//@ chunk-7jxyna5q.js:98064-98270 layout
async function recordNamedRemovals(candidates, candidateList) {
  let affectedStores = new Set();
  for (let candidate of candidates) {
    let { store, path, absolutePath: ref, ref: storesTouched } = candidate;
    if (
      canRecordNamedDeletes(store) &&
      (await statLocalEntry(candidateList, store, ref).then(() => false, isENOENT))
    ) {
      (store.namedRemovals ??= new Map()).set(path, storesTouched);
      candidate.recorded = true;
      affectedStores.add(store);
    }
  }
  return affectedStores;
}
//@ chunk-7jxyna5q.js:98270-98473 layout
function namedDeleteHintMessage(store) {
  return canRecordNamedDeletes(store)
    ? `To delete a file from shared memory, run a command that is only an rm of its full path under ${escapeForTag(store.mountDir)}.`
    : "Files here cannot be deleted from shared memory right now.";
}
//@ chunk-7jxyna5q.js:98473-98588 placement
function isStoreSuppressed(store) {
  if (store.suppressedReason === null) return false;
  let suppressedUntilMs = store.suppressedUntilMs ?? null;
  return suppressedUntilMs === null || Date.now() < suppressedUntilMs;
}
export {
  isTypedKoalaEnabled,
  LOCAL_IO_CONCURRENCY,
  EMPTY_CONTENT_SHA256,
  STAT_CONCURRENCY,
  MAX_MEMORY_BYTES,
  MTIME_SETTLE_MS,
  WRITE_SETTLE_MS,
  EMPTY_CONTENT_HASH,
  MAX_BATCH_BYTES,
  MAX_RETRIES,
  SUPPRESS_MS_2,
  MAX_PULL_RETRIES,
  isUsableSuppressedReason,
  canDeleteRemotely,
  dropPresentRemovals,
  canPushStore,
  isRemoveAlreadyRecorded,
  namedDeleteHintMessage,
  SYNC_INTERVAL_MS,
  canRecordNamedDeletes,
  memoryPushDeleteMode,
  deleteModeAllowsCorroborate,
  PUSH_TIMEOUT_MS,
  pruneNamedDeletes,
  getMassDeleteThreshold,
  detectMassDelete,
  collectDeleteCandidates,
  recordNamedRemovals,
  isStoreSuppressed,
};
