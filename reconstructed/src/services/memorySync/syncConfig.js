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

//@ chunk-s61vbvea.js:96918-97035 placement
var MAX_MEMORY_BYTES = MAX_CONTENT_BYTES;
var EMPTY_CONTENT_SHA256 = computeContentHash("");
var Qr = "0".repeat(64);
var LOCAL_IO_CONCURRENCY = 6;
var STAT_CONCURRENCY = 6;
var MAX_BATCH_BYTES = MAX_MEMORY_BYTES * 6 + 16384;
var SYNC_INTERVAL_MS = 1800000;
var MAX_RETRIES = 3;
var MAX_PULL_RETRIES = 2;
var SUPPRESS_MS_2 = 600000;
var MTIME_SETTLE_MS = 2000;
var WRITE_SETTLE_MS = MTIME_SETTLE_MS;
var PUSH_TIMEOUT_MS = 30000;
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
function getMassDeleteThreshold(e) {
  if (env.CLAUDE_CODE_DISABLE_MEMORY_MASS_DELETE_HOLD) return Number.POSITIVE_INFINITY;
  return Math.max(MIN_MASS_DELETE_THRESHOLD, Math.floor(e * MASS_DELETE_RATIO));
}
//@ chunk-s61vbvea.js:97484-98025 placement
/**
 * 检查每个可写记忆库：本地缺失的远端文件加上要删除的目标数超过阈值时返回阈值与计数，用于阻止大批量删除。
 */
async function detectMassDelete(e, n, storageV5) {
  for (let store of e) {
    let threshold = getMassDeleteThreshold(store.remoteHashes.size);
    if (store.remoteHashes.size <= threshold || !canDeleteRemotely(store)) continue;
    let mountPrefix = resolve(store.mountDir) + sep;
    let targets = new Set(
      n
        .filter((x) => x.startsWith(mountPrefix))
        .map((x) => "/" + x.slice(mountPrefix.length).split(sep).join("/"))
        .filter((x) => store.remoteHashes.has(x)),
    );
    if (targets.size === 0) continue;
    let missingNow = new Set();
    await runWithConcurrency([...store.remoteHashes.keys()], STAT_CONCURRENCY, async (x) => {
      let P = join(mountPrefix, x);
      if (
        P.startsWith(mountPrefix) &&
        (await statLocalEntry(storageV5, store, P).then(() => false, isENOENT))
      )
        missingNow.add(x);
    });
    let targetsOnDisk = count([...targets], (x) => !missingNow.has(x));
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
function canPushStore(e) {
  return (
    e.backend.mode !== "ro" &&
    ((e.source ?? "env") !== "discovery" ||
      (grantedModeFor(e.backend.partitionId) === "rw" && isOrgMemoryWriteOptedIn()))
  );
}
//@ chunk-s61vbvea.js:98145-98189 placement
/**
 * 该存储是否允许远程删除（且删除模式不是 never）。
 */
function canDeleteRemotely(e) {
  return canPushStore(e) && getMemoryPushDeleteMode() !== "never";
}
//@ chunk-s61vbvea.js:98189-98304 placement
function isStoreSuppressed(e) {
  if (e.suppressedReason === null) return false;
  let suppressedUntilMs = e.suppressedUntilMs ?? null;
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
  Qr,
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
