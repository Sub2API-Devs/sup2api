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
import {
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
} from "path";
import { EAt } from "../orgMemory/storeErrors.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { runWithConcurrency } from "./storeReconcile.js";
import { statLocalEntry } from "./mountWalk.js";
import { isENOENT } from "../../utils/errors.js";
import { count } from "../../utils/collections.js";
import { N2, isOrgMemoryWriteOptedIn } from "../orgMemory/orgMemoryDecision.js";

//@ chunk-s61vbvea.js:96918-97035 placement
var MAX_MEMORY_BYTES = EAt,
  EMPTY_CONTENT_SHA256 = computeContentHash(""),
  repeat = "0".repeat(64),
  LOCAL_IO_CONCURRENCY = 6,
  STAT_CONCURRENCY = 6,
  MAX_BATCH_BYTES = MAX_MEMORY_BYTES * 6 + 16384,
  SYNC_INTERVAL_MS = 1800000,
  MAX_RETRIES = 3,
  MAX_PULL_RETRIES = 2,
  SUPPRESS_MS = 600000,
  MTIME_SETTLE_MS = 2000,
  WRITE_SETTLE_MS = MTIME_SETTLE_MS,
  PUSH_TIMEOUT_MS = 30000;
//@ chunk-s61vbvea.js:97035-97220 placement
function getMemoryPushDeleteMode() {
  let CLAUDE_CODE_MEMORY_PUSH_DELETE_MODE = env.CLAUDE_CODE_MEMORY_PUSH_DELETE_MODE;
  if (CLAUDE_CODE_MEMORY_PUSH_DELETE_MODE !== void 0) return CLAUDE_CODE_MEMORY_PUSH_DELETE_MODE;
  let n = getFeatureValue_CACHED_MAY_BE_STALE("tengu_mem_push_delete_mode", "corroborate");
  return n === "immediate" || n === "never" ? n : "corroborate";
}
//@ chunk-s61vbvea.js:97220-97267 placement
function Dr() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_typed_koala", !0);
}
//@ chunk-s61vbvea.js:97267-97334 placement
function Nr(e) {
  return typeof e === "string" && e !== "empty_store" && Dr();
}
//@ chunk-s61vbvea.js:97334-97351 placement
var Hv = 50,
  $v = 0.1;
//@ chunk-s61vbvea.js:97351-97484 placement
function getMassDeleteThreshold(e) {
  if (env.CLAUDE_CODE_DISABLE_MEMORY_MASS_DELETE_HOLD) return Number.POSITIVE_INFINITY;
  return Math.max(Hv, Math.floor(e * $v));
}
/**
 * 检查每个可写记忆库：本地缺失的远端文件加上要删除的目标数超过阈值时返回阈值与计数，用于阻止大批量删除。
 */
//@ chunk-s61vbvea.js:97484-98025 placement
async function detectMassDelete(e, n, r) {
  for (let store of e) {
    let threshold = getMassDeleteThreshold(store.remoteHashes.size);
    if (store.remoteHashes.size <= threshold || !Ou(store)) continue;
    let mountPrefix = resolve(store.mountDir) + sep_2,
      targets = new Set(
        n
          .filter((x) => x.startsWith(mountPrefix))
          .map((x) => "/" + x.slice(mountPrefix.length).split(sep_2).join("/"))
          .filter((x) => store.remoteHashes.has(x)),
      );
    if (targets.size === 0) continue;
    let missingNow = new Set();
    await runWithConcurrency([...store.remoteHashes.keys()], STAT_CONCURRENCY, async (x) => {
      let P = join_5(mountPrefix, x);
      if (P.startsWith(mountPrefix) && (await statLocalEntry(r, store, P).then(() => !1, isENOENT)))
        missingNow.add(x);
    });
    let targetsOnDisk = count([...targets], (x) => !missingNow.has(x));
    if (missingNow.size + targetsOnDisk > threshold)
      return { threshold: threshold, missingNow: missingNow.size, targetsOnDisk: targetsOnDisk };
  }
  return null;
}
//@ chunk-s61vbvea.js:98025-98145 placement
function canPushStore(e) {
  return (
    e.backend.mode !== "ro" &&
    ((e.source ?? "env") !== "discovery" || (N2(e.backend.partitionId) === "rw" && isOrgMemoryWriteOptedIn()))
  );
}
//@ chunk-s61vbvea.js:98145-98189 placement
function Ou(e) {
  return canPushStore(e) && getMemoryPushDeleteMode() !== "never";
}
//@ chunk-s61vbvea.js:98189-98304 placement
function isStoreSuppressed(e) {
  if (e.suppressedReason === null) return !1;
  let n = e.suppressedUntilMs ?? null;
  return n === null || Date.now() < n;
}

export {
  Dr,
  LOCAL_IO_CONCURRENCY,
  EMPTY_CONTENT_SHA256,
  STAT_CONCURRENCY,
  MAX_MEMORY_BYTES,
  MTIME_SETTLE_MS,
  WRITE_SETTLE_MS,
  repeat,
  MAX_BATCH_BYTES,
  MAX_RETRIES,
  SUPPRESS_MS,
  MAX_PULL_RETRIES,
  Nr,
  Ou,
  SYNC_INTERVAL_MS,
  getMemoryPushDeleteMode,
  PUSH_TIMEOUT_MS,
  getMassDeleteThreshold,
  detectMassDelete,
  canPushStore,
  isStoreSuppressed,
};
