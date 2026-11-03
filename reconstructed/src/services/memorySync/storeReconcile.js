/**
 * services/memorySync/storeReconcile.ts
 *
 * 记忆库拉取/推送与挂载目录对账（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (23)
 * attribution: placement 23
 */
import { readdir, stat, readFile } from "fs/promises";
import { join } from "path";
import { errorMessage, getErrnoCode } from "../../utils/errors.js";
import {
  readSyncManifest,
  clearBasis,
  SYNC_MANIFEST_FILE,
  loadPersistedBasis,
  hasUnpulledLocalEdits,
  writeSyncBasis,
  handleUnusableBasis,
  writeSyncManifest,
} from "./syncManifest.js";
import {
  isTypedKoalaEnabled,
  MAX_BATCH_BYTES,
  MAX_RETRIES,
  SUPPRESS_MS_2,
  MAX_PULL_RETRIES,
  isUsableSuppressedReason,
  canDeleteRemotely,
  EMPTY_CONTENT_SHA256,
  LOCAL_IO_CONCURRENCY,
  Qr,
  SYNC_INTERVAL_MS,
  MAX_MEMORY_BYTES,
} from "./syncConfig.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import {
  getV5MemoryContext,
  collectLocalMemoryEntries,
  removeEmptyStoreReceipt,
  isLocallyEdited,
  getEntryBaseline,
  isLocallyEditedFile,
  writeLocalEntry,
  recordPullWrite,
  isPublished,
  deleteLocalEntry,
  isLocalContentEqual,
  resolveMountPath,
  statLocalEntry,
  readLocalEntry,
} from "./mountWalk.js";
import {
  MemoryPermanentError,
  MemoryUnavailableError,
  MemoryNotFoundError,
} from "../orgMemory/storeErrors.js";
import { storageKeyForMountPath } from "../../memdir/teamMemPrompts.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { pullStoreView, pullStoreExport } from "./exportStream.js";
import { MAX_STORE_ENTRIES, normalizePathPrefix } from "../orgMemory/storeApi.js";
import {
  getOrgMemoryDecision,
  hasMirror,
  grantedModeFor,
  getDecisionStores,
} from "../orgMemory/orgMemoryDecision.js";
import {
  noticeStoreSyncOff,
  formatStoreBackOnNotice,
  heldLocalOnlyPaths,
  queueConflictNotice,
  buildLocalCopyReplacedNotice,
  buildWriteConflictNotice,
  quoteStoreName,
  noticeEmptyFilesRestored,
  noticeHeldLocalFiles,
} from "./syncNotices.js";
import { isMountEscaped, NOOP_RESULT, SKIPPED_RESULT, noteServerBackoff } from "./multiStoreSync.js";
import { isMemoryDocumentKey_2 } from "../memoryStore/memoryKeys.js";
import { PathTraversalError } from "../../memdir/teamMemPaths.js";
import { count } from "../../utils/collections.js";

//@ chunk-s61vbvea.js:119754-119832 placement
/**
 * 生成错误摘要文本。
 */
function errorSummary(error) {
  return (
    errorMessage(error) || getErrnoCode(error) || (error instanceof Error && error.name) || "unknown error"
  );
}
//@ chunk-s61vbvea.js:119832-119984 placement
async function runWithConcurrency(e, n, r) {
  let s = 0;
  let list = Array.from(
    {
      length: Math.min(n, e.length),
    },
    async () => {
      while (s < e.length) {
        let y = s++;
        await r(e[y]);
      }
    },
  );
  await Promise.all(list);
}
//@ chunk-s61vbvea.js:119984-120874 placement
async function checkPushManifestGate(e, n) {
  let syncManifest = await readSyncManifest(e.mountDir, n, e.v5MemoryBase);
  let s = syncManifest.state === "present" && syncManifest.manifest.partition === e.backend.partitionId;
  let h = syncManifest.state === "torn" && isTypedKoalaEnabled();
  if (s || h) e.manifestSeenThisSession = true;
  if (!e.pulled) return s ? "matched" : h ? "torn" : "other";
  if (s) return "matched";
  if (syncManifest.state === "present" && e.scope !== "user") {
    checkForeignPartition(e, "midSession");
    return "other";
  }
  if (e.remoteHashes.size === 0) return "other";
  logForDebugging(
    `multi-store-sync[${e.mountName}]: .memory-sync manifest ${syncManifest.state === "present" ? "partition mismatch" : syncManifest.state} \u2014 invalidating basis`,
    {
      level: "warn",
    },
  );
  if (isNonAccountStore(e))
    logFeatureSad(
      "team_memory_multistore_conflict",
      syncManifest.state !== "present" ? "manifest_absent" : "manifest_mismatch",
    );
  logEvent("tengu_team_mem_push_manifest_gate", {
    absent: syncManifest.state !== "present",
    remote_entries: e.remoteHashes.size,
  });
  e.invalidatedBasis = e.remoteHashes;
  e.remoteHashes = new Map();
  e.pulled = false;
  e.pendingDeletes?.clear();
  if (syncManifest.state !== "present") await clearBasis(e, n);
  return "other";
}
//@ chunk-s61vbvea.js:120874-121353 placement
function checkUnmanifestedMountDir(store) {
  store.suppressedReason = "mount_dir_unmanifested_nonempty";
  store.suppressedUntilMs = null;
  store.remoteHashes = new Map();
  store.pulled = false;
  logForDebugging(
    `multi-store-sync[${store.mountName}]: mount dir exists without a .memory-sync manifest and is not empty \u2014 suppressing sync (remove or rename the dir to mount this store)`,
    {
      level: "warn",
    },
  );
  if (isNonAccountStore(store)) logFeatureSad("team_memory_multistore_conflict", "unmanifested_nonempty_dir");
  logEvent("tengu_team_mem_foreign_partition_suppressed", {
    trigger: fromEnum("firstPullUnmanifested"),
  });
}
//@ chunk-s61vbvea.js:121353-121552 placement
async function getMountDirOccupancy(mountDir) {
  try {
    return (
      await readdir(mountDir, {
        withFileTypes: true,
      })
    ).some((r) => r.name !== SYNC_MANIFEST_FILE && !(r.name.startsWith(".") && r.isFile()))
      ? "occupied"
      : "empty";
  } catch (error) {
    return getErrnoCode(error) === "ENOENT" ? "empty" : "unreadable";
  }
}
//@ chunk-s61vbvea.js:121552-121751 placement
async function isMountDirEffectivelyEmpty(e, n) {
  if (!n.rootMissing) return false;
  try {
    return (
      await readdir(e.mountDir, {
        withFileTypes: true,
      })
    ).every((s) => s.name.startsWith(".") || (s.isDirectory() && e.excludeKey?.(s.name) === true));
  } catch {
    return false;
  }
}
//@ chunk-s61vbvea.js:121751-122002 placement
async function containsOnlyRegularFiles(e) {
  let n = await readdir(e, {
    withFileTypes: true,
  });
  for (let r of n) {
    if (r.name === SYNC_MANIFEST_FILE) continue;
    if (r.name.startsWith(".")) {
      if (r.isFile()) continue;
      return false;
    }
    if (r.isDirectory()) {
      if (!(await containsOnlyRegularFiles(join(e, r.name)))) return false;
    } else if (!r.isFile()) return false;
  }
  return true;
}
//@ chunk-s61vbvea.js:122002-123201 placement
async function enumerateMountDir(store, n) {
  let r = isStorageV5Enabled();
  let v5MemoryContext = getV5MemoryContext(store, n);
  let h;
  try {
    h = await store.backend.list();
  } catch (error) {
    return {
      outcome: "failed",
      error: errorMessage(error),
      ...(error instanceof MemoryPermanentError && {
        permanent: error.reason,
      }),
    };
  }
  let y = new Map(h.map((R) => [R.path, R.sha256]));
  let S;
  try {
    S = await collectLocalMemoryEntries(
      store.mountDir,
      store.excludeKey,
      n,
      store.v5MemoryBase,
      store.manifestSeenThisSession,
      store.walkHashes,
      undefined,
    );
  } catch (error) {
    return {
      outcome: "failed",
      error: errorMessage(error),
    };
  }
  if (!S.diskTrusted)
    return {
      outcome: "failed",
      error: "mount dir enumeration untrusted (permission failure)",
    };
  let w;
  try {
    w = await containsOnlyRegularFiles(store.mountDir);
  } catch (error) {
    return {
      outcome: "failed",
      error: errorMessage(error),
    };
  }
  if (!w)
    return {
      outcome: "mismatch",
    };
  for (let diskPath of S.diskPaths) {
    let x = y.get(diskPath);
    if (x === undefined)
      return {
        outcome: "mismatch",
      };
    let sha256 = S.entries.get(diskPath)?.sha256;
    if (sha256 === undefined) {
      let j = join(store.mountDir, diskPath.replace(/^\/+/, ""));
      let G =
        v5MemoryContext !== undefined
          ? storageKeyForMountPath(v5MemoryContext.base, store.mountDir, j)
          : undefined;
      if (r && v5MemoryContext !== undefined && G !== undefined) {
        let L = await v5MemoryContext.storageV5.read([
          {
            key: G,
            offset: 0,
            length: MAX_BATCH_BYTES + 1,
          },
        ]);
        let q = L.ok ? L.value.items[0] : undefined;
        if (q === undefined || !q.found || q.totalBytes > MAX_BATCH_BYTES)
          return {
            outcome: "mismatch",
          };
        sha256 = computeContentHash(Buffer.from(q.value).toString("utf8"));
      } else
        try {
          if ((await stat(j)).size > MAX_BATCH_BYTES)
            return {
              outcome: "mismatch",
            };
          sha256 = computeContentHash(await readFile(j, "utf8"));
        } catch {
          return {
            outcome: "mismatch",
          };
        }
    }
    if (x !== sha256)
      return {
        outcome: "mismatch",
      };
  }
  return {
    outcome: "match",
  };
}
//@ chunk-s61vbvea.js:123201-123647 placement
function checkForeignPartition(e, n) {
  e.suppressedReason = "mount_dir_foreign_partition";
  e.suppressedUntilMs = null;
  e.remoteHashes = new Map();
  e.pulled = false;
  e.pendingDeletes?.clear();
  logForDebugging(
    `multi-store-sync[${e.mountName}]: mount dir holds a different partition's .memory-sync \u2014 suppressing sync (remove the dir to re-mount)`,
    {
      level: "warn",
    },
  );
  if (isNonAccountStore(e)) logFeatureSad("team_memory_multistore_conflict", "foreign_partition_dir");
  logEvent("tengu_team_mem_foreign_partition_suppressed", {
    trigger: fromEnum(n),
  });
}
//@ chunk-s61vbvea.js:123647-123729 placement
/**
 * 表示“挂载目录属于外来分区/未登记非空”的原因码。
 */
var FOREIGN_PARTITION_REASONS = new Set(["mount_dir_foreign_partition", "mount_dir_unmanifested_nonempty"]);
//@ chunk-s61vbvea.js:123729-123771 placement
/**
 * 判断原因是否属于外来分区类。
 */
function isForeignPartitionReason(suppressedReason) {
  return suppressedReason !== null && FOREIGN_PARTITION_REASONS.has(suppressedReason);
}
//@ chunk-s61vbvea.js:123771-123816 placement
/**
 * 判断存储是否因外来分区被抑制。
 */
function isStoreForeignPartition(store) {
  return isForeignPartitionReason(store.suppressedReason);
}
//@ chunk-s61vbvea.js:123816-124514 placement
async function readoptMountDir(store, syncManifest, r) {
  let suppressedReason = store.suppressedReason;
  if (!isForeignPartitionReason(suppressedReason)) return false;
  let h = syncManifest.state === "present" && syncManifest.manifest.partition === store.backend.partitionId;
  let y = syncManifest.state !== "present" && (await getMountDirOccupancy(store.mountDir)) === "empty";
  if (!h && !y) {
    if (suppressedReason === "mount_dir_unmanifested_nonempty" && syncManifest.state === "present")
      checkForeignPartition(store, "firstPull");
    return false;
  }
  store.suppressedReason = null;
  store.suppressedUntilMs = null;
  store.recoveryUnconfirmedReason = suppressedReason;
  store.consecutivePermanentFailures = 0;
  store.refusedWrites?.clear();
  store.invalidatedBasis = null;
  await clearBasis(store, r);
  logForDebugging(
    `multi-store-sync[${store.mountName}]: ${suppressedReason} condition cleared \u2014 re-adopting the mount dir`,
    {
      level: "info",
    },
  );
  if (isNonAccountStore(store)) logFeatureOk("team_memory_multistore_conflict");
  logEvent("tengu_team_mem_foreign_partition_recovered", {
    reason: fromEnum(suppressedReason),
  });
  return true;
}
//@ chunk-s61vbvea.js:124514-124694 placement
function noteStreamListFailure(e) {
  e.streamListSuccessStreak = 0;
  let n = (e.streamListFailureStreak ?? 0) + 1;
  e.streamListFailureStreak = Math.min(n, MAX_RETRIES);
  if (n >= MAX_RETRIES) e.streamListRetryAfterMs = Date.now() + SUPPRESS_MS_2;
  return n;
}
//@ chunk-s61vbvea.js:124694-124736 placement
/**
 * 判断存储作用域是否不是 account。
 */
function isNonAccountStore(e) {
  return e.scope !== "account";
}
//@ chunk-s61vbvea.js:124736-126054 placement
async function listStoreStream(e) {
  let backend = e.backend;
  if (
    backend.exportMetadata &&
    !e.streamListUnsupported &&
    Date.now() >= (e.streamListRetryAfterMs ?? 0) &&
    !env.CLAUDE_CODE_DISABLE_MEMORY_STREAM_LIST &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_memory_stream_list", true)
  ) {
    let r = `multi-store-sync[${e.mountName}]`;
    try {
      let source = await backend.exportMetadata();
      let h = await pullStoreView({
        source,
        maxLineLength: MAX_BATCH_BYTES,
        maxEntries: MAX_STORE_ENTRIES,
      });
      if (h.ok) {
        let y = (e.streamListSuccessStreak ?? 0) + 1;
        if (y >= MAX_PULL_RETRIES) {
          e.streamListSuccessStreak = 0;
          e.streamListFailureStreak = Math.max(0, (e.streamListFailureStreak ?? 0) - 1);
        } else e.streamListSuccessStreak = y;
        if (isNonAccountStore(e)) logFeatureOk("team_memory_multistore_stream_list");
        return h.entries.map((entry) => ({
          ...entry,
          path: normalizePathPrefix(entry.path),
        }));
      }
      if (isNonAccountStore(e)) logFeatureSad("team_memory_multistore_stream_list", h.reason);
      noteStreamListFailure(e);
      if (h.reason === "view_not_honored") e.streamListUnsupported = true;
      logForDebugging(`${r}: metadata stream incomplete (${h.reason}) \u2014 using paged list`, {
        level: "debug",
      });
    } catch (error) {
      let h = noteStreamListFailure(e);
      if (error instanceof MemoryUnavailableError) {
        if (isNonAccountStore(e))
          logFeatureSad(
            "team_memory_multistore_stream_list",
            error.retryAfterMs !== undefined ? "backed_off" : "unavailable",
          );
        let y = error.retryAfterMs !== undefined;
        if (h < MAX_RETRIES && (e.pulled || y)) throw error;
      } else {
        let y =
          error instanceof MemoryNotFoundError
            ? "not_found"
            : error instanceof MemoryPermanentError
              ? error.reason
              : "error";
        if (error instanceof MemoryNotFoundError) e.streamListUnsupported = true;
        if (isNonAccountStore(e)) logFeatureSad("team_memory_multistore_stream_list", y);
      }
      logForDebugging(`${r}: metadata stream unavailable (${errorMessage(error)}) \u2014 using paged list`, {
        level: "debug",
      });
    }
  }
  return backend.list();
}
//@ chunk-s61vbvea.js:126054-126169 placement
function isOrgMemoryDecisionClosed(e) {
  if ((e.source ?? "env") !== "discovery") return false;
  let orgMemoryDecision = getOrgMemoryDecision();
  return orgMemoryDecision.state === "parked" || orgMemoryDecision.state === "ended";
}
//@ chunk-s61vbvea.js:126169-126456 placement
function shouldMirrorAllUncovered(e) {
  if ((e.source ?? "env") !== "discovery" || !hasMirror()) return false;
  if (grantedModeFor(e.backend.partitionId) !== undefined) {
    e.notices.rearmMirrorAllUncovered();
    return false;
  }
  if (!getDecisionStores().some((r) => grantedModeFor(r.path) !== undefined)) {
    e.notices.emitMirrorAllUncoveredOnce();
    return false;
  }
  e.notices.rearmMirrorAllUncovered();
  return true;
}
//@ chunk-s61vbvea.js:126456-127011 placement
async function rejoinTeamMemory(store, n) {
  let r = await pullStore(store, n);
  if (!store.pulled) store.lastPersistedBasisBody = undefined;
  if (
    !r.success &&
    isUsableSuppressedReason(store.basisUnusable) &&
    !store.notices.rejoinOffNoticed.has(store.mountDir)
  ) {
    store.notices.rejoinOffNoticed.add(store.mountDir);
    noticeStoreSyncOff(store);
  } else if (r.success && store.pulled && store.notices.rejoinOffNoticed.delete(store.mountDir))
    formatStoreBackOnNotice(store, heldLocalOnlyPaths(store), true);
  let rejoinOff = store.rejoinOff ?? null;
  if (rejoinOff !== null && store.pulled && !isUsableSuppressedReason(store.basisUnusable)) {
    store.rejoinOff = null;
    logEvent("tengu_team_mem_rejoin", {
      scope: fromEnum(store.scope),
      reason: fromEnum(rejoinOff.reason),
      off_ms: Date.now() - rejoinOff.sinceMs,
      pull_attempts: rejoinOff.pullAttempts,
      held_count: store.heldLocal?.size ?? 0,
    });
  }
  return r;
}
//@ chunk-s61vbvea.js:127011-135467 placement
/**
 * 拉取一个记忆库：检查挂载目录、处理 404、按基线合并本地文件
 */
async function pullStore(e, n) {
  if (await isMountEscaped(e))
    return {
      success: false,
      entriesListed: 0,
      filesWritten: 0,
      filesDeleted: 0,
      error: "mount dir canonicity check failed (fail closed)",
    };
  if (isOrgMemoryDecisionClosed(e)) return NOOP_RESULT;
  if (shouldMirrorAllUncovered(e)) return NOOP_RESULT;
  let r = await checkPushManifestGate(e, n);
  let expectPresent = r === "matched";
  if (e.suppressedReason !== null) return SKIPPED_RESULT;
  let h =
    (expectPresent || r === "torn") &&
    !e.pulled &&
    e.remoteHashes.size === 0 &&
    (e.invalidatedBasis ?? null) === null
      ? await loadPersistedBasis(e, n)
      : null;
  let reason = h?.ok === false ? h.reason : null;
  if (h !== null && e.basisUnusable !== null && !(e.removedEmptyReceipt === true && reason === "absent"))
    e.basisUnusable = reason ?? undefined;
  if (reason === "empty_store") e.emptyReceiptOnDisk = true;
  else if (h !== null && reason !== "read_error") e.emptyReceiptOnDisk = false;
  let basis = h?.ok === true ? h.basis : null;
  let basisUnusable = e.basisUnusable;
  let R = isUsableSuppressedReason(basisUnusable);
  if (R && basisUnusable) {
    if (!e.rejoinOff)
      e.rejoinOff = {
        sinceMs: Date.now(),
        reason: basisUnusable,
        pullAttempts: 0,
      };
    e.rejoinOff.reason = basisUnusable;
    e.rejoinOff.pullAttempts++;
  }
  let x = basis === null ? await pushStore(e, expectPresent, n) : "not-attempted";
  if (x !== "not-attempted" && x !== "fell-back") {
    e.downloadsDeferred = 0;
    return x;
  }
  let P = x === "fell-back";
  let j;
  let G = null;
  try {
    j = await listStoreStream(e);
  } catch (error) {
    let ze = noteServerBackoff(e, error);
    let gt = (e.invalidatedBasis ?? basis?.entries ?? e.remoteHashes).size === 0;
    if (error instanceof MemoryNotFoundError && gt && e.scope !== "account") {
      j = [];
      if (R) G = error;
    } else {
      if (error instanceof MemoryNotFoundError)
        logForDebugging(
          `multi-store-sync[${e.mountName}]: list 404 on a previously-synced store or the account mirror \u2014 skipping pull (no reap)`,
          {
            level: "warn",
          },
        );
      if (P && isNonAccountStore(e)) logFeatureBad("team_memory_multistore_bulk_inflate", "fallback_failed");
      return {
        success: false,
        entriesListed: 0,
        filesWritten: 0,
        filesDeleted: 0,
        permanent: error instanceof MemoryPermanentError ? error.reason : undefined,
        ...(error instanceof MemoryNotFoundError && {
          cause: "not_found",
        }),
        error: errorMessage(error),
        ...(error instanceof MemoryNotFoundError && {
          notFound: true,
        }),
        ...(ze && {
          backedOff: true,
          cause: "backed_off",
        }),
      };
    }
  }
  let L = new Map();
  for (let Ae of j) L.set(Ae.id, Ae.path);
  let q = new Map();
  for (let Ae of j) if (L.get(Ae.id) === Ae.path) q.set(Ae.path, Ae);
  j = [...q.values()];
  j = j.filter(
    (Ae) => isMemoryDocumentKey_2(Ae.path) && !(e.excludeKey && e.excludeKey(Ae.path.replace(/^\/+/, ""))),
  );
  let Q = new Map();
  for (let Ae of j)
    Q.set(Ae.path, {
      id: Ae.id,
      sha256: Ae.sha256,
    });
  let localMemoryEntries = await collectLocalMemoryEntries(
    e.mountDir,
    e.excludeKey,
    n,
    e.v5MemoryBase,
    e.manifestSeenThisSession,
    e.walkHashes,
    undefined,
  );
  let invalidatedBasis = e.invalidatedBasis ?? null;
  let ae = invalidatedBasis ?? basis?.entries ?? e.remoteHashes;
  if (
    !localMemoryEntries.diskTrusted &&
    (R
      ? !(await isMountDirEffectivelyEmpty(e, localMemoryEntries))
      : ae.size > 0 && !localMemoryEntries.rootMissing)
  ) {
    logForDebugging(
      `multi-store-sync[${e.mountName}]: mount dir walk untrusted with a non-empty basis or a pending rejoin \u2014 soft-failing pull`,
      {
        level: "warn",
      },
    );
    return {
      success: false,
      entriesListed: j.length,
      filesWritten: 0,
      filesDeleted: 0,
      cause: "walk_untrusted",
      error: "mount dir walk untrusted with a non-empty basis or a pending rejoin (soft fail)",
      ...(!e.pulled && {
        permanent: "mount_dir_unreadable",
      }),
    };
  }
  if (G !== null && (await hasUnpulledLocalEdits(e, localMemoryEntries.entries, Q, n))) {
    logForDebugging(
      `multi-store-sync[${e.mountName}]: list 404 while sync is off with local files to hold, staying off`,
      {
        level: "warn",
      },
    );
    if (P) logFeatureBad("team_memory_multistore_bulk_inflate", "fallback_failed");
    return {
      success: false,
      entriesListed: 0,
      filesWritten: 0,
      filesDeleted: 0,
      cause: "not_found",
      error: errorMessage(G),
    };
  }
  let se = canDeleteRemotely(e);
  let re = new Set(
    j
      .filter(
        (Ae) =>
          Ae.sha256 !== EMPTY_CONTENT_SHA256 &&
          localMemoryEntries.entries.get(Ae.path)?.sha256 === EMPTY_CONTENT_SHA256 &&
          ae.get(Ae.path)?.sha256 === Ae.sha256,
      )
      .map((Ae) => Ae.path),
  );
  let he = 0;
  let filtered = j.filter((Ae) => {
    if (localMemoryEntries.entries.get(Ae.path)?.sha256 === Ae.sha256) return false;
    if (e.scope === "account") return true;
    if (re.has(Ae.path)) return true;
    if (
      (invalidatedBasis !== null || localMemoryEntries.rootMissing) &&
      !localMemoryEntries.diskPaths.has(Ae.path)
    )
      return true;
    if (!se && localMemoryEntries.diskTrusted && !localMemoryEntries.diskPaths.has(Ae.path)) return true;
    if (
      basis?.entriesWereOnDisk === false &&
      localMemoryEntries.diskTrusted &&
      !localMemoryEntries.diskPaths.has(Ae.path)
    ) {
      if (ae.get(Ae.path)?.sha256 === Ae.sha256) he++;
      return true;
    }
    return ae.get(Ae.path)?.sha256 !== Ae.sha256;
  });
  let ce = localMemoryEntries.diskTrusted
    ? [...localMemoryEntries.diskPaths].filter(
        (diskPath) => !Q.has(diskPath) && (ae.has(diskPath) || e.scope === "account"),
      )
    : [];
  for (let Ae of filtered) Q.delete(Ae.path);
  let we = 0;
  let ie = 0;
  let Ee = 0;
  let Ie = 0;
  let ke = 0;
  let Me = false;
  let We = 0;
  let nt = 0;
  let Be;
  let permanent;
  let Ne = new Map();
  let Je = [];
  if (filtered.length > 0)
    try {
      await removeEmptyStoreReceipt(e, n);
    } catch (error) {
      return {
        success: false,
        entriesListed: j.length,
        filesWritten: 0,
        filesDeleted: 0,
        error: errorMessage(error),
      };
    }
  let lt = isTypedKoalaEnabled()
    ? new Set(
        localMemoryEntries.skippedOversizedPaths.map((skippedOversizedPath) => skippedOversizedPath.path),
      )
    : new Set();
  await runWithConcurrency(filtered, LOCAL_IO_CONCURRENCY, async (Ae) => {
    if (Me) {
      We++;
      return;
    }
    try {
      let ze = await e.backend.read(Ae.id);
      let contentHash = computeContentHash(ze.content);
      if (contentHash !== ze.sha256) ie++;
      if (
        !(invalidatedBasis !== null && localMemoryEntries.diskPaths.has(Ae.path)) &&
        (await isLocallyEdited(e, Ae.path, n))
      ) {
        we++;
        Q.set(Ae.path, getEntryBaseline(e, ae, localMemoryEntries.diskPaths, Ae));
        return;
      }
      if (re.has(Ae.path) && !(await isLocallyEditedFile(e, Ae.path, n))) {
        we++;
        Q.set(Ae.path, {
          id: Ae.id,
          sha256: Ae.sha256,
        });
        return;
      }
      let sha256 = localMemoryEntries.entries.get(Ae.path)?.sha256;
      if (
        sha256 !== contentHash &&
        (await writeLocalEntry(e, Ae.path, ze.content, ze.updatedAt, n)) === "dropped"
      )
        return;
      let sha256_2 = e.pullWritten.get(Ae.path)?.sha256;
      await recordPullWrite(e, Ae.path, contentHash, n);
      let ln = {
        id: Ae.id,
        sha256: contentHash,
      };
      Q.set(Ae.path, ln);
      Ne.set(Ae.path, ln);
      let sha256_3 = ae.get(Ae.path)?.sha256;
      let At = lt.has(Ae.path);
      let un = At || (sha256 !== sha256_3 && (sha256_2 === undefined || sha256 !== sha256_2));
      let rr = isTypedKoalaEnabled() ? (e.heldLocal?.get(Ae.path) ?? basis?.held.get(Ae.path)) : undefined;
      let br = rr !== undefined && (sha256 !== undefined || At) && sha256 !== contentHash && un;
      if (sha256 === EMPTY_CONTENT_SHA256) {
        if (sha256_3 !== EMPTY_CONTENT_SHA256 && contentHash !== EMPTY_CONTENT_SHA256) Ee++;
      } else if (
        e.scope !== "account" &&
        (br ||
          ((sha256_3 !== undefined || isPublished(e)) && localMemoryEntries.diskPaths.has(Ae.path) && un))
      ) {
        let pn = br && sha256 === rr;
        await queueConflictNotice(
          e,
          Ae.path,
          pn ? buildLocalCopyReplacedNotice(Ae.path) : buildWriteConflictNotice(Ae.path, sha256_3 === Qr),
        );
        logEvent("tengu_team_mem_conflict_recovered", {
          scope: fromEnum(e.scope),
          op: fromEnum("pull"),
          held: pn,
        });
      }
    } catch (error) {
      if (error instanceof MemoryNotFoundError) {
        let gt = e.heldLocal?.get(Ae.path) ?? basis?.held.get(Ae.path);
        let Nt =
          (R && !e.pullWritten.has(Ae.path)) ||
          (gt !== undefined && gt === localMemoryEntries.entries.get(Ae.path)?.sha256);
        if (localMemoryEntries.diskPaths.has(Ae.path) && !Nt)
          Q.set(Ae.path, getEntryBaseline(e, ae, localMemoryEntries.diskPaths, Ae));
        return;
      }
      if (error instanceof PathTraversalError) {
        logForDebugging(`multi-store-sync[${e.mountName}]: refusing to write escaping path ${Ae.path}`, {
          level: "warn",
        });
        return;
      }
      if (error instanceof MemoryPermanentError) permanent ??= error.reason;
      if (noteServerBackoff(e, error)) {
        Me = true;
        nt++;
      }
      Ie++;
      Be ??= errorSummary(error);
    }
  });
  for (let Ae of ce)
    try {
      let sha256 = localMemoryEntries.entries.get(Ae)?.sha256;
      if (
        e.scope !== "account" &&
        (sha256 === undefined ||
          (sha256 !== ae.get(Ae)?.sha256 &&
            !(sha256 === EMPTY_CONTENT_SHA256 && (await isLocallyEditedFile(e, Ae, n)))))
      ) {
        let Nt = sha256 !== undefined && e.backend.mode !== "ro";
        e.refusedWrites?.delete(Ae);
        await queueConflictNotice(
          e,
          Ae,
          `The memory file ${quoteStoreName(Ae)} was deleted from shared memory by another session, but your local copy has changes that were never saved there. ` +
            (Nt
              ? "Your local copy was kept and will be re-saved to shared memory on the next sync unless it contains a detected secret. "
              : "Your local copy was kept, but it cannot be re-saved to shared memory automatically (over the sync size limit or the store is read-only) \u2014 save its contents elsewhere or trim it if you want it persisted. ") +
            "If the deletion was intended, delete the file.",
        );
        logForDebugging(
          `multi-store-sync[${e.mountName}]: preserving locally-modified ${Ae} despite remote delete`,
          {
            level: "info",
          },
        );
        continue;
      }
      if (await isLocallyEdited(e, Ae, n)) {
        we++;
        continue;
      }
      await deleteLocalEntry(e, Ae, n);
      Je.push(Ae);
    } catch (error) {
      ke++;
      Be ??= errorSummary(error);
    }
  if (Ee > 0) noticeEmptyFilesRestored(e, Ee);
  if (ie > 0)
    logForDebugging(
      `multi-store-sync[${e.mountName}]: ${ie} read body/bodies did not match their declared sha256; recorded under the computed sha`,
      {
        level: "warn",
      },
    );
  if (Ie + ke + We > 0) {
    logForDebugging(
      `multi-store-sync[${e.mountName}]: pull failed: ${Ie} of ${filtered.length} download(s) and ${ke} of ${ce.length} local removal(s) failed${We > 0 ? `, ${We} download(s) not started after the server asked sync to wait (waiting at least ${Math.max(0, Math.ceil(((e.serverBackoffUntilMs ?? 0) - Date.now()) / 1000))}s)` : ""}, first error: ${Be}; the sync record is unchanged for those files and a later sync retries them${e.pulled ? "" : "; nothing is uploaded from this store until a pull succeeds"}`,
      {
        level: "warn",
      },
    );
    if (P && isNonAccountStore(e)) logFeatureBad("team_memory_multistore_bulk_inflate", "fallback_failed");
    if (e.pulled && (Ne.size > 0 || Je.length > 0)) {
      for (let [Ae, ze] of Ne) e.remoteHashes.set(Ae, ze);
      for (let Ae of Je) e.remoteHashes.delete(Ae);
      await writeSyncBasis(e, n);
    }
    e.downloadsDeferred = We + nt;
    return {
      success: false,
      entriesListed: j.length,
      shaMismatches: ie,
      emptyRestored: Ee,
      filesWritten: Ne.size,
      filesDeleted: Je.length,
      fetchesFailed: Ie,
      permanent,
      error: Be,
      backedOff: Me || undefined,
    };
  }
  e.downloadsDeferred = 0;
  await handleUnusableBasis(e, localMemoryEntries.entries, Q, n, {
    walkTrusted: localMemoryEntries.diskTrusted,
    hold: R,
  });
  if (e.notices.rejoinOffNoticed.has(e.mountDir)) {
    let Ae = basis?.held ?? new Map();
    await runWithConcurrency([...Ae.keys()], LOCAL_IO_CONCURRENCY, async (ze) => {
      if (await isLocallyEdited(e, ze, n)) Ae.delete(ze);
    });
  }
  e.remoteHashes = Q;
  e.pulled = true;
  e.invalidatedBasis = null;
  e.basisLoaded = true;
  if (basis !== null && basis.held.size > 0) {
    e.heldLocal = basis.held;
    if (!e.notices.rejoinOffNoticed.has(e.mountDir)) noticeHeldLocalFiles(e);
  }
  if (basis !== null && basis.deletes.size > 0) {
    let Ae = (e.pendingDeletes ??= new Map());
    for (let [ze, gt] of basis.deletes) if (Q.has(ze)) Ae.set(ze, gt);
  }
  await writeSyncManifest(
    e,
    {
      expectPresent,
    },
    n,
  ).catch((error) =>
    logForDebugging(`multi-store-sync[${e.mountName}]: manifest write failed: ${errorMessage(error)}`, {
      level: "warn",
    }),
  );
  await writeSyncBasis(e, n);
  if (we > 0) {
    if (isNonAccountStore(e)) logFeatureOk("team_memory_multistore_concurrent_write_preserved");
    logForDebugging(`multi-store-sync[${e.mountName}]: preserved ${we} concurrent local write(s)`, {
      level: "info",
    });
  }
  return {
    success: true,
    entriesListed: j.length,
    shaMismatches: ie,
    emptyRestored: Ee,
    filesWritten: Ne.size,
    filesDeleted: Je.length,
    filesSkippedConcurrent: we,
    entriesWithoutRef: count(j, (Ae) => !Q.has(Ae.path)),
    unmarkedReceiptRefetched: he,
  };
}
//@ chunk-s61vbvea.js:135467-139307 placement
/**
 * 推送本地记忆变更到记忆库（并发写保留、批量膨胀保护）
 */
async function pushStore(e, expectPresent, r) {
  if (e.pulled || e.remoteHashes.size > 0 || (e.invalidatedBasis ?? null) !== null) return "not-attempted";
  let backend = e.backend;
  if (!backend.exportAll) return "not-attempted";
  if (env.CLAUDE_CODE_DISABLE_MEMORY_BULK_INFLATE) return "not-attempted";
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_memory_bulk_inflate", true)) return "not-attempted";
  if (e.rejoinWalkUntrusted === true && isUsableSuppressedReason(e.basisUnusable)) return "not-attempted";
  let h = `multi-store-sync[${e.mountName}]`;
  let source;
  try {
    source = await backend.exportAll();
  } catch (error) {
    let we = error instanceof MemoryNotFoundError ? "not_found" : "http_error";
    if (error instanceof MemoryNotFoundError) e.streamListUnsupported = true;
    if (isNonAccountStore(e)) logFeatureSad("team_memory_multistore_bulk_inflate", we);
    logForDebugging(`${h}: bulk inflate unavailable (${errorMessage(error)}) \u2014 using per-file pull`, {
      level: "debug",
    });
    return "fell-back";
  }
  let S = new Map();
  let w = new Map();
  let R = new Map();
  let x = new Set();
  let P = new Set();
  let j = new Set();
  let G = new Set();
  let L = 0;
  let q = 0;
  let Q = new Map();
  let Z = new Map();
  let ee = 0;
  let ae = await pullStoreExport({
    source,
    maxConcurrentWrites: LOCAL_IO_CONCURRENCY,
    maxLineLength: MAX_BATCH_BYTES,
    maxLines: MAX_STORE_ENTRIES * 2 + 2,
    deadlineMs: SYNC_INTERVAL_MS,
    handleMemory: async (ce) => {
      let we = normalizePathPrefix(ce.path);
      let ie = isMemoryDocumentKey_2(we) && !(e.excludeKey && e.excludeKey(we.replace(/^\/+/, "")));
      w.set(ce.memoryId, ie ? we : null);
      if (!ie) return;
      let contentHash = computeContentHash(ce.content);
      if (contentHash !== ce.contentSha256) L++;
      let Ie = R.get(we);
      if (Ie !== undefined) {
        if (Ie.id !== ce.memoryId || Ie.sha256 !== contentHash) x.add(we);
        let Me = Z.get(we);
        if (Me === undefined) {
          Me = new Set([Ie.sha256]);
          Z.set(we, Me);
        }
        Me.add(contentHash);
        let We = Q.get(we);
        if (We === undefined) {
          We = new Set([Ie.id]);
          Q.set(we, We);
        }
        We.delete(ce.memoryId);
        We.add(ce.memoryId);
      }
      R.set(we, {
        id: ce.memoryId,
        sha256: contentHash,
      });
      let sha256 = contentHash;
      try {
        if (await isLocallyEdited(e, we, r)) {
          ee++;
          j.add(we);
          sha256 = e.pullWritten.get(we)?.sha256 ?? Qr;
        } else if (!(await isLocalContentEqual(e, we, ce.content, r))) {
          if (contentHash !== EMPTY_CONTENT_SHA256 && (await isLocallyEditedFile(e, we, r))) q++;
          if ((await writeLocalEntry(e, we, ce.content, ce.updatedAt, r)) === "dropped") return;
          await recordPullWrite(e, we, contentHash, r);
          P.add(we);
        }
      } catch (error) {
        if (error instanceof PathTraversalError) {
          logForDebugging(`${h}: refusing to write escaping path ${we}`, {
            level: "warn",
          });
          return;
        }
        throw error;
      }
      S.set(we, {
        id: ce.memoryId,
        sha256,
      });
    },
  });
  let se = async (ce) => {
    try {
      let mountPath = await resolveMountPath(e, ce);
      if ((await statLocalEntry(r, e, mountPath)).size > MAX_MEMORY_BYTES) return true;
      let contentHash = computeContentHash(await readLocalEntry(r, e, mountPath));
      let Ie = Z.get(ce);
      if (Ie !== undefined) return !Ie.has(contentHash);
      return R.get(ce)?.sha256 !== contentHash;
    } catch (error) {
      return getErrnoCode(error) !== "ENOENT";
    }
  };
  let re = false;
  for (let [ce, we] of S)
    if (w.get(we.id) !== ce || x.has(ce)) {
      P.delete(ce);
      if (await se(ce)) {
        let ie = Q.get(ce);
        let Ee = ie && [...ie].findLast((Ie) => w.get(Ie) === ce);
        if (Ee !== undefined)
          S.set(ce, {
            id: Ee,
            sha256: Qr,
          });
        else {
          S.delete(ce);
          G.add(ce);
        }
        continue;
      }
      S.delete(ce);
      try {
        await deleteLocalEntry(e, ce, r);
      } catch (error) {
        logForDebugging(`${h}: failed to remove superseded ${ce} (${errorMessage(error)})`, {
          level: "warn",
        });
        re = true;
      }
    }
  let size = P.size;
  if (q > 0) noticeEmptyFilesRestored(e, q);
  if (!ae.ok || re) {
    let reason = ae.ok ? "dedupe_unlink_failed" : ae.reason;
    if (isNonAccountStore(e)) logFeatureSad("team_memory_multistore_bulk_inflate", reason);
    logForDebugging(
      `${h}: bulk inflate incomplete (${reason}) after ${size} file(s) \u2014 using per-file pull`,
      {
        level: "warn",
      },
    );
    return "fell-back";
  }
  let Se = count([...w.values()], (ce) => ce !== null);
  if (e.basisUnusable !== undefined && e.basisUnusable !== null) {
    let ce = null;
    try {
      ce = await collectLocalMemoryEntries(
        e.mountDir,
        e.excludeKey,
        r,
        e.v5MemoryBase,
        e.manifestSeenThisSession,
        e.walkHashes,
        undefined,
      );
    } catch (error) {
      logForDebugging(`${h}: basis_unusable walk failed: ${errorMessage(error)}`, {
        level: "warn",
      });
    }
    let we = isUsableSuppressedReason(e.basisUnusable);
    if (we && (ce === null || (!ce.diskTrusted && !(await isMountDirEffectivelyEmpty(e, ce))))) {
      logFeatureSad("team_memory_multistore_bulk_inflate", "walk_untrusted");
      e.rejoinWalkUntrusted = true;
      return "fell-back";
    }
    if (ce === null) e.basisUnusable = null;
    else
      await handleUnusableBasis(e, ce.entries, S, r, {
        walkTrusted: ce.diskTrusted,
        hold: we,
      });
  }
  e.remoteHashes = S;
  e.pulled = true;
  await writeSyncManifest(
    e,
    {
      expectPresent,
    },
    r,
  ).catch((error) =>
    logForDebugging(`${h}: manifest write failed: ${errorMessage(error)}`, {
      level: "warn",
    }),
  );
  await writeSyncBasis(e, r);
  if (isNonAccountStore(e)) logFeatureOk("team_memory_multistore_bulk_inflate");
  if (isNonAccountStore(e) && [...j].some((ce) => S.has(ce) || G.has(ce)))
    logFeatureOk("team_memory_multistore_concurrent_write_preserved");
  logForDebugging(
    `${h}: bulk inflated ${size} file(s) from ${ae.memoryLines} exported memory line(s)` +
      (L ? `, ${L} declared-sha mismatch(es)` : ""),
    {
      level: "info",
    },
  );
  return {
    success: true,
    entriesListed: Se,
    shaMismatches: L,
    emptyRestored: q,
    filesWritten: size,
    filesDeleted: 0,
    filesSkippedConcurrent: ee,
    entriesWithoutRef: Math.max(0, Se - S.size),
  };
}
//@ chunk-s61vbvea.js:139307-139326 placement
/**
 * 重试计数窗口（300000 毫秒）。
 */
var MAX_UNAVAILABLE_RETRIES = 3;
var UNAVAILABLE_WINDOW_MS = 300000;
//@ chunk-s61vbvea.js:139326-139521 placement
function allowConflictRefetch(e, path) {
  let now = Date.now();
  let s = (e.conflictRefetches ??= new Map());
  let h = s.get(path);
  if (!h || now - h.windowStartMs >= UNAVAILABLE_WINDOW_MS) {
    s.set(path, {
      count: 1,
      windowStartMs: now,
    });
    return true;
  }
  if (h.count >= MAX_UNAVAILABLE_RETRIES) return false;
  h.count++;
  return true;
}
export {
  runWithConcurrency,
  isNonAccountStore,
  isOrgMemoryDecisionClosed,
  checkPushManifestGate,
  errorSummary,
  allowConflictRefetch,
  shouldMirrorAllUncovered,
  isStoreForeignPartition,
  readoptMountDir,
  checkForeignPartition,
  getMountDirOccupancy,
  enumerateMountDir,
  checkUnmanifestedMountDir,
  rejoinTeamMemory,
};
