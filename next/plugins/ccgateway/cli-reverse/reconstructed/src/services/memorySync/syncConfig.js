/**
 * services/memorySync/syncConfig.ts
 *
 * 记忆同步配置与开关（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (10)
 * attribution: placement 10
 */
import { resolve, sep, join } from "path";
import { MAX_CONTENT_BYTES } from "../orgMemory/storeErrors.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { runWithConcurrency } from "./storeReconcile.js";
import { statLocalEntry } from "./mountWalk.js";
import { isENOENT } from "../../utils/errors.js";
import { count } from "../../utils/collections.js";
import { grantedModeFor, isOrgMemoryWriteOptedIn } from "../orgMemory/orgMemoryDecision.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:96918-97035 placement
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
deferInit("chunk-s61vbvea.js:96918", () => {
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
//@ chunk-s61vbvea.js:97035-97220 placement
function getMemoryPushDeleteMode() {
  let CLAUDE_CODE_MEMORY_PUSH_DELETE_MODE = env.CLAUDE_CODE_MEMORY_PUSH_DELETE_MODE;
  if (CLAUDE_CODE_MEMORY_PUSH_DELETE_MODE !== undefined) return CLAUDE_CODE_MEMORY_PUSH_DELETE_MODE;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_mem_push_delete_mode",
    "corroborate",
  );
  return featureValue_CACHED_MAY_BE_STALE === "immediate" || featureValue_CACHED_MAY_BE_STALE === "never"
    ? featureValue_CACHED_MAY_BE_STALE
    : "corroborate";
}
//@ chunk-s61vbvea.js:97220-97267 placement
/**
 * 读 tengu_typed_koala（默认开）。
 */
function isTypedKoalaEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_typed_koala", true);
}
//@ chunk-s61vbvea.js:97267-97334 placement
/**
 * 判断抑制原因是否可作为有效原因（非空）。
 */
function isUsableSuppressedReason(basisUnusable) {
  return typeof basisUnusable === "string" && basisUnusable !== "empty_store" && isTypedKoalaEnabled();
}
//@ chunk-s61vbvea.js:97334-97351 placement
/**
 * 批量删除阈值比例（0.1）。
 */
var MIN_MASS_DELETE_THRESHOLD = 50;
var MASS_DELETE_RATIO = 0.1;
//@ chunk-s61vbvea.js:97351-97484 placement
function getMassDeleteThreshold(syncedCount) {
  if (env.CLAUDE_CODE_DISABLE_MEMORY_MASS_DELETE_HOLD) return Number.POSITIVE_INFINITY;
  return Math.max(MIN_MASS_DELETE_THRESHOLD, Math.floor(syncedCount * MASS_DELETE_RATIO));
}
//@ chunk-s61vbvea.js:97484-98025 placement
/**
 * 检查每个可写记忆库：本地缺失的远端文件加上要删除的目标数超过阈值时返回阈值与计数，用于阻止大批量删除。
 */
async function detectMassDelete(stores, localPaths, storageV5) {
  for (let store of stores) {
    let threshold = getMassDeleteThreshold(store.remoteHashes.size);
    if (store.remoteHashes.size <= threshold || !canDeleteRemotely(store)) continue;
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
    let targetsOnDisk = count([...targets], (key) => !missingNow.has(key));
    if (missingNow.size + targetsOnDisk > threshold)
      return {
        threshold,
        missingNow: missingNow.size,
        targetsOnDisk,
      };
  }
  return null;
}
//@ chunk-s61vbvea.js:98025-98145 placement
function canPushStore(store) {
  return (
    store.backend.mode !== "ro" &&
    ((store.source ?? "env") !== "discovery" ||
      (grantedModeFor(store.backend.partitionId) === "rw" && isOrgMemoryWriteOptedIn()))
  );
}
//@ chunk-s61vbvea.js:98145-98189 placement
/**
 * 该存储是否允许远程删除（且删除模式不是 never）。
 */
function canDeleteRemotely(store) {
  return canPushStore(store) && getMemoryPushDeleteMode() !== "never";
}
//@ chunk-s61vbvea.js:98189-98304 placement
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
  SYNC_INTERVAL_MS,
  getMemoryPushDeleteMode,
  PUSH_TIMEOUT_MS,
  getMassDeleteThreshold,
  detectMassDelete,
  canPushStore,
  isStoreSuppressed,
};
