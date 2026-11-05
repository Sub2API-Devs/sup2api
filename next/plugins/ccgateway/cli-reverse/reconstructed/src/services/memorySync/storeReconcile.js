/**
 * services/memorySync/storeReconcile.ts
 *
 * 记忆库拉取/推送与挂载目录对账（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (23)
 * attribution: placement 23
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
  dropPresentRemovals,
  canPushStore,
  EMPTY_CONTENT_SHA256,
  isRemoveAlreadyRecorded,
  LOCAL_IO_CONCURRENCY,
  EMPTY_CONTENT_HASH,
  namedDeleteHintMessage,
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
  resolveMountPath,
  statLocalEntry,
  isLocallyEdited,
  getEntryBaseline,
  isLocallyEditedFile,
  writeLocalEntry,
  recordPullWrite,
  isPublished,
  deleteLocalEntry,
  isLocalContentEqual,
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
  noticeDeleteBlocked,
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
import { countWhere } from "../../utils/collections.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:120052-120130 placement
/**
 * 生成错误摘要文本。
 */
function errorSummary(error) {
  return (
    errorMessage(error) || getErrnoCode(error) || (error instanceof Error && error.name) || "unknown error"
  );
}
//@ chunk-7jxyna5q.js:120130-120282 placement
async function runWithConcurrency(items, limit, worker) {
  let nextIndex = 0;
  let list = Array.from(
    {
      length: Math.min(limit, items.length),
    },
    async () => {
      while (nextIndex < items.length) {
        let index = nextIndex++;
        await worker(items[index]);
      }
    },
  );
  await Promise.all(list);
}
//@ chunk-7jxyna5q.js:120282-121197 placement
async function checkPushManifestGate(store, storage) {
  let syncManifest = await readSyncManifest(store.mountDir, storage, store.v5MemoryBase);
  let matched =
    syncManifest.state === "present" && syncManifest.manifest.partition === store.backend.partitionId;
  let torn = syncManifest.state === "torn" && isTypedKoalaEnabled();
  if (matched || torn) store.manifestSeenThisSession = true;
  if (!store.pulled) return matched ? "matched" : torn ? "torn" : "other";
  if (matched) return "matched";
  if (syncManifest.state === "present" && store.scope !== "user") {
    checkForeignPartition(store, "midSession");
    return "other";
  }
  if (store.remoteHashes.size === 0) return "other";
  logForDebugging(
    `multi-store-sync[${store.mountName}]: .memory-sync manifest ${syncManifest.state === "present" ? "partition mismatch" : syncManifest.state} \u2014 invalidating basis`,
    {
      level: "warn",
    },
  );
  if (isNonAccountStore(store))
    logFeatureSad(
      "team_memory_multistore_conflict",
      syncManifest.state !== "present" ? "manifest_absent" : "manifest_mismatch",
    );
  logEvent("tengu_team_mem_push_manifest_gate", {
    absent: syncManifest.state !== "present",
    remote_entries: store.remoteHashes.size,
  });
  store.invalidatedBasis = store.remoteHashes;
  store.remoteHashes = new Map();
  store.pulled = false;
  store.pendingDeletes?.clear();
  store.namedRemovals?.clear();
  if (syncManifest.state !== "present") await clearBasis(store, storage);
  return "other";
}
//@ chunk-7jxyna5q.js:121197-121676 placement
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
//@ chunk-7jxyna5q.js:121676-121875 placement
async function getMountDirOccupancy(mountDir) {
  try {
    return (
      await readdir(mountDir, {
        withFileTypes: true,
      })
    ).some((entry) => entry.name !== SYNC_MANIFEST_FILE && !(entry.name.startsWith(".") && entry.isFile()))
      ? "occupied"
      : "empty";
  } catch (error) {
    return getErrnoCode(error) === "ENOENT" ? "empty" : "unreadable";
  }
}
//@ chunk-7jxyna5q.js:121875-122074 placement
async function isMountDirEffectivelyEmpty(store, localEntries) {
  if (!localEntries.rootMissing) return false;
  try {
    return (
      await readdir(store.mountDir, {
        withFileTypes: true,
      })
    ).every(
      (entry) =>
        entry.name.startsWith(".") || (entry.isDirectory() && store.excludeKey?.(entry.name) === true),
    );
  } catch {
    return false;
  }
}
//@ chunk-7jxyna5q.js:122074-122325 placement
async function containsOnlyRegularFiles(dir) {
  let entries = await readdir(dir, {
    withFileTypes: true,
  });
  for (let entry of entries) {
    if (entry.name === SYNC_MANIFEST_FILE) continue;
    if (entry.name.startsWith(".")) {
      if (entry.isFile()) continue;
      return false;
    }
    if (entry.isDirectory()) {
      if (!(await containsOnlyRegularFiles(join(dir, entry.name)))) return false;
    } else if (!entry.isFile()) return false;
  }
  return true;
}
//@ chunk-7jxyna5q.js:122325-123524 placement
async function enumerateMountDir(store, storage) {
  let storageV5Enabled = isStorageV5Enabled();
  let v5MemoryContext = getV5MemoryContext(store, storage);
  let remoteEntries;
  try {
    remoteEntries = await store.backend.list();
  } catch (error) {
    return {
      outcome: "failed",
      error: errorMessage(error),
      ...(error instanceof MemoryPermanentError && {
        permanent: error.reason,
      }),
    };
  }
  let remoteHashes = new Map(remoteEntries.map((entry) => [entry.path, entry.sha256]));
  let localEntries;
  try {
    localEntries = await collectLocalMemoryEntries(
      store.mountDir,
      store.excludeKey,
      storage,
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
  if (!localEntries.diskTrusted)
    return {
      outcome: "failed",
      error: "mount dir enumeration untrusted (permission failure)",
    };
  let regularOnly;
  try {
    regularOnly = await containsOnlyRegularFiles(store.mountDir);
  } catch (error) {
    return {
      outcome: "failed",
      error: errorMessage(error),
    };
  }
  if (!regularOnly)
    return {
      outcome: "mismatch",
    };
  for (let diskPath of localEntries.diskPaths) {
    let remoteSha256 = remoteHashes.get(diskPath);
    if (remoteSha256 === undefined)
      return {
        outcome: "mismatch",
      };
    let sha256 = localEntries.entries.get(diskPath)?.sha256;
    if (sha256 === undefined) {
      let filePath = join(store.mountDir, diskPath.replace(/^\/+/, ""));
      let storageKey =
        v5MemoryContext !== undefined
          ? storageKeyForMountPath(v5MemoryContext.base, store.mountDir, filePath)
          : undefined;
      if (storageV5Enabled && v5MemoryContext !== undefined && storageKey !== undefined) {
        let readResult = await v5MemoryContext.storageV5.read([
          {
            key: storageKey,
            offset: 0,
            length: MAX_BATCH_BYTES + 1,
          },
        ]);
        let item = readResult.ok ? readResult.value.items[0] : undefined;
        if (item === undefined || !item.found || item.totalBytes > MAX_BATCH_BYTES)
          return {
            outcome: "mismatch",
          };
        sha256 = computeContentHash(Buffer.from(item.value).toString("utf8"));
      } else
        try {
          if ((await stat(filePath)).size > MAX_BATCH_BYTES)
            return {
              outcome: "mismatch",
            };
          sha256 = computeContentHash(await readFile(filePath, "utf8"));
        } catch {
          return {
            outcome: "mismatch",
          };
        }
    }
    if (remoteSha256 !== sha256)
      return {
        outcome: "mismatch",
      };
  }
  return {
    outcome: "match",
  };
}
//@ chunk-7jxyna5q.js:123524-123995 placement
function checkForeignPartition(store, trigger) {
  store.suppressedReason = "mount_dir_foreign_partition";
  store.suppressedUntilMs = null;
  store.remoteHashes = new Map();
  store.pulled = false;
  store.pendingDeletes?.clear();
  store.namedRemovals?.clear();
  logForDebugging(
    `multi-store-sync[${store.mountName}]: mount dir holds a different partition's .memory-sync \u2014 suppressing sync (remove the dir to re-mount)`,
    {
      level: "warn",
    },
  );
  if (isNonAccountStore(store)) logFeatureSad("team_memory_multistore_conflict", "foreign_partition_dir");
  logEvent("tengu_team_mem_foreign_partition_suppressed", {
    trigger: fromEnum(trigger),
  });
}
//@ chunk-7jxyna5q.js:123995-124077 placement
/**
 * 表示“挂载目录属于外来分区/未登记非空”的原因码。
 */
var FOREIGN_PARTITION_REASONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:123995", () => {
  FOREIGN_PARTITION_REASONS = new Set(["mount_dir_foreign_partition", "mount_dir_unmanifested_nonempty"]);
});
//@ chunk-7jxyna5q.js:124077-124119 placement
/**
 * 判断原因是否属于外来分区类。
 */
function isForeignPartitionReason(suppressedReason) {
  return suppressedReason !== null && FOREIGN_PARTITION_REASONS.has(suppressedReason);
}
//@ chunk-7jxyna5q.js:124119-124164 placement
/**
 * 判断存储是否因外来分区被抑制。
 */
function isStoreForeignPartition(store) {
  return isForeignPartitionReason(store.suppressedReason);
}
//@ chunk-7jxyna5q.js:124164-124862 placement
async function readoptMountDir(store, syncManifest, storage) {
  let suppressedReason = store.suppressedReason;
  if (!isForeignPartitionReason(suppressedReason)) return false;
  let manifestMatches =
    syncManifest.state === "present" && syncManifest.manifest.partition === store.backend.partitionId;
  let dirEmpty = syncManifest.state !== "present" && (await getMountDirOccupancy(store.mountDir)) === "empty";
  if (!manifestMatches && !dirEmpty) {
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
  await clearBasis(store, storage);
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
//@ chunk-7jxyna5q.js:124862-125042 placement
function noteStreamListFailure(store) {
  store.streamListSuccessStreak = 0;
  let streak = (store.streamListFailureStreak ?? 0) + 1;
  store.streamListFailureStreak = Math.min(streak, MAX_RETRIES);
  if (streak >= MAX_RETRIES) store.streamListRetryAfterMs = Date.now() + SUPPRESS_MS_2;
  return streak;
}
//@ chunk-7jxyna5q.js:125042-125084 placement
/**
 * 判断存储作用域是否不是 account。
 */
function isNonAccountStore(store) {
  return store.scope !== "account";
}
//@ chunk-7jxyna5q.js:125084-126402 placement
async function listStoreStream(store) {
  let backend = store.backend;
  if (
    backend.exportMetadata &&
    !store.streamListUnsupported &&
    Date.now() >= (store.streamListRetryAfterMs ?? 0) &&
    !env.CLAUDE_CODE_DISABLE_MEMORY_STREAM_LIST &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_memory_stream_list", true)
  ) {
    let label = `multi-store-sync[${store.mountName}]`;
    try {
      let source = await backend.exportMetadata();
      let view = await pullStoreView({
        source,
        maxLineLength: MAX_BATCH_BYTES,
        maxEntries: MAX_STORE_ENTRIES,
      });
      if (view.ok) {
        let streak = (store.streamListSuccessStreak ?? 0) + 1;
        if (streak >= MAX_PULL_RETRIES) {
          store.streamListSuccessStreak = 0;
          store.streamListFailureStreak = Math.max(0, (store.streamListFailureStreak ?? 0) - 1);
        } else store.streamListSuccessStreak = streak;
        if (isNonAccountStore(store)) logFeatureOk("team_memory_multistore_stream_list");
        return view.entries.map((entry) => ({
          ...entry,
          path: normalizePathPrefix(entry.path),
        }));
      }
      if (isNonAccountStore(store)) logFeatureSad("team_memory_multistore_stream_list", view.reason);
      noteStreamListFailure(store);
      if (view.reason === "view_not_honored") store.streamListUnsupported = true;
      logForDebugging(`${label}: metadata stream incomplete (${view.reason}) \u2014 using paged list`, {
        level: "debug",
      });
    } catch (error) {
      let failureStreak = noteStreamListFailure(store);
      if (error instanceof MemoryUnavailableError) {
        if (isNonAccountStore(store))
          logFeatureSad(
            "team_memory_multistore_stream_list",
            error.retryAfterMs !== undefined ? "backed_off" : "unavailable",
          );
        let askedToWait = error.retryAfterMs !== undefined;
        if (failureStreak < MAX_RETRIES && (store.pulled || askedToWait)) throw error;
      } else {
        let reason =
          error instanceof MemoryNotFoundError
            ? "not_found"
            : error instanceof MemoryPermanentError
              ? error.reason
              : "error";
        if (error instanceof MemoryNotFoundError) store.streamListUnsupported = true;
        if (isNonAccountStore(store)) logFeatureSad("team_memory_multistore_stream_list", reason);
      }
      logForDebugging(
        `${label}: metadata stream unavailable (${errorMessage(error)}) \u2014 using paged list`,
        {
          level: "debug",
        },
      );
    }
  }
  return backend.list();
}
//@ chunk-7jxyna5q.js:126402-126517 placement
function isOrgMemoryDecisionClosed(store) {
  if ((store.source ?? "env") !== "discovery") return false;
  let orgMemoryDecision = getOrgMemoryDecision();
  return orgMemoryDecision.state === "parked" || orgMemoryDecision.state === "ended";
}
//@ chunk-7jxyna5q.js:126517-126804 placement
function shouldMirrorAllUncovered(store) {
  if ((store.source ?? "env") !== "discovery" || !hasMirror()) return false;
  if (grantedModeFor(store.backend.partitionId) !== undefined) {
    store.notices.rearmMirrorAllUncovered();
    return false;
  }
  if (!getDecisionStores().some((store) => grantedModeFor(store.path) !== undefined)) {
    store.notices.emitMirrorAllUncoveredOnce();
    return false;
  }
  store.notices.rearmMirrorAllUncovered();
  return true;
}
//@ chunk-7jxyna5q.js:126804-127359 placement
async function rejoinTeamMemory(store, storage) {
  let pullResult = await pullStore(store, storage);
  if (!store.pulled) store.lastPersistedBasisBody = undefined;
  if (
    !pullResult.success &&
    isUsableSuppressedReason(store.basisUnusable) &&
    !store.notices.rejoinOffNoticed.has(store.mountDir)
  ) {
    store.notices.rejoinOffNoticed.add(store.mountDir);
    noticeStoreSyncOff(store);
  } else if (pullResult.success && store.pulled && store.notices.rejoinOffNoticed.delete(store.mountDir))
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
  return pullResult;
}
//@ chunk-7jxyna5q.js:127359-136598 placement
/**
 * 拉取一个记忆库：检查挂载目录、处理 404、按基线合并本地文件
 */
async function pullStore(store, storage) {
  if (await isMountEscaped(store))
    return {
      success: false,
      entriesListed: 0,
      filesWritten: 0,
      filesDeleted: 0,
      error: "mount dir canonicity check failed (fail closed)",
    };
  if (isOrgMemoryDecisionClosed(store)) return NOOP_RESULT;
  if (shouldMirrorAllUncovered(store)) return NOOP_RESULT;
  let gate = await checkPushManifestGate(store, storage);
  let expectPresent = gate === "matched";
  if (store.suppressedReason !== null) return SKIPPED_RESULT;
  let persistedBasis =
    (expectPresent || gate === "torn") &&
    !store.pulled &&
    store.remoteHashes.size === 0 &&
    (store.invalidatedBasis ?? null) === null
      ? await loadPersistedBasis(store, storage)
      : null;
  let reason = persistedBasis?.ok === false ? persistedBasis.reason : null;
  if (
    persistedBasis !== null &&
    store.basisUnusable !== null &&
    !(store.removedEmptyReceipt === true && reason === "absent")
  )
    store.basisUnusable = reason ?? undefined;
  if (reason === "empty_store") store.emptyReceiptOnDisk = true;
  else if (persistedBasis !== null && reason !== "read_error") store.emptyReceiptOnDisk = false;
  let basis = persistedBasis?.ok === true ? persistedBasis.basis : null;
  let basisUnusable = store.basisUnusable;
  let rejoinOffActive = isUsableSuppressedReason(basisUnusable);
  if (rejoinOffActive && basisUnusable) {
    if (!store.rejoinOff)
      store.rejoinOff = {
        sinceMs: Date.now(),
        reason: basisUnusable,
        pullAttempts: 0,
      };
    store.rejoinOff.reason = basisUnusable;
    store.rejoinOff.pullAttempts++;
  }
  let pushOutcome = basis === null ? await pushStore(store, expectPresent, storage) : "not-attempted";
  if (pushOutcome !== "not-attempted" && pushOutcome !== "fell-back") {
    store.downloadsDeferred = 0;
    return pushOutcome;
  }
  let fellBack = pushOutcome === "fell-back";
  let remoteEntries;
  let rejoinError = null;
  try {
    remoteEntries = await listStoreStream(store);
  } catch (error) {
    let backedOff = noteServerBackoff(store, error);
    let noEntries = (store.invalidatedBasis ?? basis?.entries ?? store.remoteHashes).size === 0;
    if (error instanceof MemoryNotFoundError && noEntries && store.scope !== "account") {
      remoteEntries = [];
      if (rejoinOffActive) rejoinError = error;
    } else {
      if (error instanceof MemoryNotFoundError)
        logForDebugging(
          `multi-store-sync[${store.mountName}]: list 404 on a previously-synced store or the account mirror \u2014 skipping pull (no reap)`,
          {
            level: "warn",
          },
        );
      if (fellBack && isNonAccountStore(store))
        logFeatureBad("team_memory_multistore_bulk_inflate", "fallback_failed");
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
        ...(backedOff && {
          backedOff: true,
          cause: "backed_off",
        }),
      };
    }
  }
  let pathById = new Map();
  for (let entry of remoteEntries) pathById.set(entry.id, entry.path);
  let idByPath = new Map();
  for (let entry of remoteEntries) if (pathById.get(entry.id) === entry.path) idByPath.set(entry.path, entry);
  remoteEntries = [...idByPath.values()];
  remoteEntries = remoteEntries.filter(
    (entry) =>
      isMemoryDocumentKey_2(entry.path) &&
      !(store.excludeKey && store.excludeKey(entry.path.replace(/^\/+/, ""))),
  );
  let remoteByPath = new Map();
  for (let entry of remoteEntries)
    remoteByPath.set(entry.path, {
      id: entry.id,
      sha256: entry.sha256,
    });
  let localEntries = await collectLocalMemoryEntries(
    store.mountDir,
    store.excludeKey,
    storage,
    store.v5MemoryBase,
    store.manifestSeenThisSession,
    store.walkHashes,
    undefined,
  );
  let invalidatedBasis = store.invalidatedBasis ?? null;
  let basisEntries = invalidatedBasis ?? basis?.entries ?? store.remoteHashes;
  if (
    !localEntries.diskTrusted &&
    (rejoinOffActive
      ? !(await isMountDirEffectivelyEmpty(store, localEntries))
      : basisEntries.size > 0 && !localEntries.rootMissing)
  ) {
    logForDebugging(
      `multi-store-sync[${store.mountName}]: mount dir walk untrusted with a non-empty basis or a pending rejoin \u2014 soft-failing pull`,
      {
        level: "warn",
      },
    );
    return {
      success: false,
      entriesListed: remoteEntries.length,
      filesWritten: 0,
      filesDeleted: 0,
      cause: "walk_untrusted",
      error: "mount dir walk untrusted with a non-empty basis or a pending rejoin (soft fail)",
      ...(!store.pulled && {
        permanent: "mount_dir_unreadable",
      }),
    };
  }
  if (
    rejoinError !== null &&
    (await hasUnpulledLocalEdits(store, localEntries.entries, remoteByPath, storage))
  ) {
    logForDebugging(
      `multi-store-sync[${store.mountName}]: list 404 while sync is off with local files to hold, staying off`,
      {
        level: "warn",
      },
    );
    if (fellBack) logFeatureBad("team_memory_multistore_bulk_inflate", "fallback_failed");
    return {
      success: false,
      entriesListed: 0,
      filesWritten: 0,
      filesDeleted: 0,
      cause: "not_found",
      error: errorMessage(rejoinError),
    };
  }
  let canDelete = canDeleteRemotely(store);
  dropPresentRemovals(store, localEntries.diskPaths);
  let pending = new Set();
  let kept = !canDelete && canPushStore(store);
  let changed = new Set();
  let missing = new Set(
    remoteEntries
      .filter(
        (entry) =>
          entry.sha256 !== EMPTY_CONTENT_SHA256 &&
          localEntries.entries.get(entry.path)?.sha256 === EMPTY_CONTENT_SHA256 &&
          basisEntries.get(entry.path)?.sha256 === entry.sha256,
      )
      .map((entry) => entry.path),
  );
  let unchangedCount = 0;
  let filtered = remoteEntries.filter((entry) => {
    if (localEntries.entries.get(entry.path)?.sha256 === entry.sha256) return false;
    if (store.scope === "account") return true;
    if (missing.has(entry.path)) return true;
    if ((invalidatedBasis !== null || localEntries.rootMissing) && !localEntries.diskPaths.has(entry.path))
      return true;
    if (
      !canDelete &&
      localEntries.diskTrusted &&
      !localEntries.diskPaths.has(entry.path) &&
      !isRemoveAlreadyRecorded(store, entry.path, entry)
    ) {
      if (kept && store.pulled && basisEntries.has(entry.path)) changed.add(entry.path);
      if (store.pulled && canPushStore(store)) pending.add(entry.path);
      return true;
    }
    if (
      basis?.entriesWereOnDisk === false &&
      localEntries.diskTrusted &&
      !localEntries.diskPaths.has(entry.path)
    ) {
      if (basisEntries.get(entry.path)?.sha256 === entry.sha256) unchangedCount++;
      return true;
    }
    return basisEntries.get(entry.path)?.sha256 !== entry.sha256;
  });
  let deletions = localEntries.diskTrusted
    ? [...localEntries.diskPaths].filter(
        (diskPath) =>
          !remoteByPath.has(diskPath) && (basisEntries.has(diskPath) || store.scope === "account"),
      )
    : [];
  for (let entry of filtered) remoteByPath.delete(entry.path);
  let writeSkipped = 0;
  let shaMismatches = 0;
  let emptyRestored = 0;
  let fetchesFailed = 0;
  let deletesFailed = 0;
  let backedOff = false;
  let notStarted = 0;
  let notStartedFailures = 0;
  let firstError;
  let permanent;
  let entriesWithoutRef = new Map();
  let deletedPaths = [];
  if (filtered.length > 0)
    try {
      await removeEmptyStoreReceipt(store, storage);
    } catch (error) {
      return {
        success: false,
        entriesListed: remoteEntries.length,
        filesWritten: 0,
        filesDeleted: 0,
        error: errorMessage(error),
      };
    }
  let heldSet = isTypedKoalaEnabled()
    ? new Set(localEntries.skippedOversizedPaths.map((skippedOversizedPath) => skippedOversizedPath.path))
    : new Set();
  await runWithConcurrency(filtered, LOCAL_IO_CONCURRENCY, async (entry) => {
    if (backedOff) {
      notStarted++;
      return;
    }
    try {
      let body = await store.backend.read(entry.id);
      let contentHash = computeContentHash(body.content);
      if (contentHash !== body.sha256) shaMismatches++;
      if (pending.has(entry.path)) {
        if (isRemoveAlreadyRecorded(store, entry.path, entry)) {
          changed.delete(entry.path);
          remoteByPath.set(entry.path, {
            id: entry.id,
            sha256: entry.sha256,
          });
          return;
        }
        if (
          await resolveMountPath(store, entry.path)
            .then((mountPath) => statLocalEntry(storage, store, mountPath))
            .then(
              () => true,
              () => false,
            )
        ) {
          writeSkipped++;
          changed.delete(entry.path);
          remoteByPath.set(entry.path, {
            id: entry.id,
            sha256: basisEntries.get(entry.path)?.sha256 ?? EMPTY_CONTENT_HASH,
          });
          return;
        }
      }
      if (
        !(invalidatedBasis !== null && localEntries.diskPaths.has(entry.path)) &&
        (await isLocallyEdited(store, entry.path, storage))
      ) {
        writeSkipped++;
        remoteByPath.set(entry.path, getEntryBaseline(store, basisEntries, localEntries.diskPaths, entry));
        return;
      }
      if (missing.has(entry.path) && !(await isLocallyEditedFile(store, entry.path, storage))) {
        writeSkipped++;
        remoteByPath.set(entry.path, {
          id: entry.id,
          sha256: entry.sha256,
        });
        return;
      }
      let sha256 = localEntries.entries.get(entry.path)?.sha256;
      if (
        sha256 !== contentHash &&
        (await writeLocalEntry(store, entry.path, body.content, body.updatedAt, storage)) === "dropped"
      )
        return;
      let sha256_2 = store.pullWritten.get(entry.path)?.sha256;
      await recordPullWrite(store, entry.path, contentHash, storage);
      let ref = {
        id: entry.id,
        sha256: contentHash,
      };
      remoteByPath.set(entry.path, ref);
      entriesWithoutRef.set(entry.path, ref);
      let sha256_3 = basisEntries.get(entry.path)?.sha256;
      let held = heldSet.has(entry.path);
      let locallyChanged = held || (sha256 !== sha256_3 && (sha256_2 === undefined || sha256 !== sha256_2));
      let heldSha = isTypedKoalaEnabled()
        ? (store.heldLocal?.get(entry.path) ?? basis?.held.get(entry.path))
        : undefined;
      let heldConflict =
        heldSha !== undefined && (sha256 !== undefined || held) && sha256 !== contentHash && locallyChanged;
      if (sha256 === EMPTY_CONTENT_SHA256) {
        if (sha256_3 !== EMPTY_CONTENT_SHA256 && contentHash !== EMPTY_CONTENT_SHA256) emptyRestored++;
      } else if (
        store.scope !== "account" &&
        (heldConflict ||
          ((sha256_3 !== undefined || isPublished(store)) &&
            localEntries.diskPaths.has(entry.path) &&
            locallyChanged))
      ) {
        let replaceLocal = heldConflict && sha256 === heldSha;
        for (let name of store.namedRemovals?.keys() ?? [])
          await noticeDeleteBlocked(store, name, entry.path);
        store.namedRemovals?.clear();
        await queueConflictNotice(
          store,
          entry.path,
          replaceLocal
            ? buildLocalCopyReplacedNotice(entry.path)
            : buildWriteConflictNotice(entry.path, sha256_3 === EMPTY_CONTENT_HASH),
        );
        logEvent("tengu_team_mem_conflict_recovered", {
          scope: fromEnum(store.scope),
          op: fromEnum("pull"),
          held: replaceLocal,
        });
      }
    } catch (error) {
      if (error instanceof MemoryNotFoundError) {
        let heldSha = store.heldLocal?.get(entry.path) ?? basis?.held.get(entry.path);
        let skipRebaseline =
          (rejoinOffActive && !store.pullWritten.has(entry.path)) ||
          (heldSha !== undefined && heldSha === localEntries.entries.get(entry.path)?.sha256);
        if (localEntries.diskPaths.has(entry.path) && !skipRebaseline)
          remoteByPath.set(entry.path, getEntryBaseline(store, basisEntries, localEntries.diskPaths, entry));
        return;
      }
      if (error instanceof PathTraversalError) {
        logForDebugging(
          `multi-store-sync[${store.mountName}]: refusing to write escaping path ${entry.path}`,
          {
            level: "warn",
          },
        );
        return;
      }
      if (error instanceof MemoryPermanentError) permanent ??= error.reason;
      if (noteServerBackoff(store, error)) {
        backedOff = true;
        notStartedFailures++;
      }
      fetchesFailed++;
      firstError ??= errorSummary(error);
    }
  });
  for (let path of deletions)
    try {
      let sha256 = localEntries.entries.get(path)?.sha256;
      if (
        store.scope !== "account" &&
        (sha256 === undefined ||
          (sha256 !== basisEntries.get(path)?.sha256 &&
            !(sha256 === EMPTY_CONTENT_SHA256 && (await isLocallyEditedFile(store, path, storage)))))
      ) {
        let canResave = sha256 !== undefined && store.backend.mode !== "ro";
        store.refusedWrites?.delete(path);
        await queueConflictNotice(
          store,
          path,
          `The memory file ${quoteStoreName(path)} was deleted from shared memory by another session, but your local copy has changes that were never saved there. ` +
            (canResave
              ? "Your local copy was kept and will be re-saved to shared memory on the next sync unless it contains a detected secret. "
              : "Your local copy was kept, but it cannot be re-saved to shared memory automatically (over the sync size limit or the store is read-only) \u2014 save its contents elsewhere or trim it if you want it persisted. ") +
            (canResave && kept
              ? namedDeleteHintMessage(store)
              : "If the deletion was intended, delete the file."),
        );
        logForDebugging(
          `multi-store-sync[${store.mountName}]: preserving locally-modified ${path} despite remote delete`,
          {
            level: "info",
          },
        );
        continue;
      }
      if (await isLocallyEdited(store, path, storage)) {
        writeSkipped++;
        continue;
      }
      await deleteLocalEntry(store, path, storage);
      deletedPaths.push(path);
    } catch (error) {
      deletesFailed++;
      firstError ??= errorSummary(error);
    }
  if (emptyRestored > 0) noticeEmptyFilesRestored(store, emptyRestored);
  if (shaMismatches > 0)
    logForDebugging(
      `multi-store-sync[${store.mountName}]: ${shaMismatches} read body/bodies did not match their declared sha256; recorded under the computed sha`,
      {
        level: "warn",
      },
    );
  let sorted = [...changed].filter((path) => entriesWithoutRef.has(path)).sort();
  if (fetchesFailed + deletesFailed + notStarted > 0) {
    logForDebugging(
      `multi-store-sync[${store.mountName}]: pull failed: ${fetchesFailed} of ${filtered.length} download(s) and ${deletesFailed} of ${deletions.length} local removal(s) failed${notStarted > 0 ? `, ${notStarted} download(s) not started after the server asked sync to wait (waiting at least ${Math.max(0, Math.ceil(((store.serverBackoffUntilMs ?? 0) - Date.now()) / 1000))}s)` : ""}, first error: ${firstError}; the sync record is unchanged for those files and a later sync retries them${store.pulled ? "" : "; nothing is uploaded from this store until a pull succeeds"}`,
      {
        level: "warn",
      },
    );
    if (fellBack && isNonAccountStore(store))
      logFeatureBad("team_memory_multistore_bulk_inflate", "fallback_failed");
    if (store.pulled && (entriesWithoutRef.size > 0 || deletedPaths.length > 0)) {
      for (let [path, error] of entriesWithoutRef) store.remoteHashes.set(path, error);
      for (let path of deletedPaths) store.remoteHashes.delete(path);
      await writeSyncBasis(store, storage);
    }
    store.downloadsDeferred = notStarted + notStartedFailures;
    return {
      success: false,
      entriesListed: remoteEntries.length,
      shaMismatches,
      emptyRestored,
      filesWritten: entriesWithoutRef.size,
      filesDeleted: deletedPaths.length,
      fetchesFailed,
      permanent,
      error: firstError,
      backedOff: backedOff || undefined,
      ...(sorted.length > 0 && {
        putBackWhileDeletesOff: sorted,
      }),
    };
  }
  store.downloadsDeferred = 0;
  await handleUnusableBasis(store, localEntries.entries, remoteByPath, storage, {
    walkTrusted: localEntries.diskTrusted,
    hold: rejoinOffActive,
  });
  if (store.notices.rejoinOffNoticed.has(store.mountDir)) {
    let path = basis?.held ?? new Map();
    await runWithConcurrency([...path.keys()], LOCAL_IO_CONCURRENCY, async (error) => {
      if (await isLocallyEdited(store, error, storage)) path.delete(error);
    });
  }
  store.remoteHashes = remoteByPath;
  store.pulled = true;
  store.invalidatedBasis = null;
  for (let name of store.namedRemovals?.keys() ?? [])
    if (!remoteByPath.has(name)) store.namedRemovals?.delete(name);
  store.basisLoaded = true;
  if (basis !== null && basis.held.size > 0) {
    store.heldLocal = basis.held;
    if (!store.notices.rejoinOffNoticed.has(store.mountDir)) noticeHeldLocalFiles(store);
  }
  if (basis !== null && basis.deletes.size > 0) {
    let path = (store.pendingDeletes ??= new Map());
    for (let [error, statsError] of basis.deletes) if (remoteByPath.has(error)) path.set(error, statsError);
  }
  await writeSyncManifest(
    store,
    {
      expectPresent,
    },
    storage,
  ).catch((error) =>
    logForDebugging(`multi-store-sync[${store.mountName}]: manifest write failed: ${errorMessage(error)}`, {
      level: "warn",
    }),
  );
  await writeSyncBasis(store, storage);
  if (writeSkipped > 0) {
    if (isNonAccountStore(store)) logFeatureOk("team_memory_multistore_concurrent_write_preserved");
    logForDebugging(
      `multi-store-sync[${store.mountName}]: preserved ${writeSkipped} concurrent local write(s)`,
      {
        level: "info",
      },
    );
  }
  return {
    success: true,
    entriesListed: remoteEntries.length,
    shaMismatches,
    emptyRestored,
    filesWritten: entriesWithoutRef.size,
    filesDeleted: deletedPaths.length,
    filesSkippedConcurrent: writeSkipped,
    entriesWithoutRef: countWhere(remoteEntries, (entry) => !remoteByPath.has(entry.path)),
    unmarkedReceiptRefetched: unchangedCount,
    ...(sorted.length > 0 && {
      putBackWhileDeletesOff: sorted,
    }),
  };
}
//@ chunk-7jxyna5q.js:136598-140442 placement
/**
 * 推送本地记忆变更到记忆库（并发写保留、批量膨胀保护）
 */
async function pushStore(store, expectPresent, storage) {
  if (store.pulled || store.remoteHashes.size > 0 || (store.invalidatedBasis ?? null) !== null)
    return "not-attempted";
  let backend = store.backend;
  if (!backend.exportAll) return "not-attempted";
  if (env.CLAUDE_CODE_DISABLE_MEMORY_BULK_INFLATE) return "not-attempted";
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_memory_bulk_inflate", true)) return "not-attempted";
  if (store.rejoinWalkUntrusted === true && isUsableSuppressedReason(store.basisUnusable))
    return "not-attempted";
  let logPrefix = `multi-store-sync[${store.mountName}]`;
  let source;
  try {
    source = await backend.exportAll();
  } catch (error) {
    let failureKind = error instanceof MemoryNotFoundError ? "not_found" : "http_error";
    if (error instanceof MemoryNotFoundError) store.streamListUnsupported = true;
    if (isNonAccountStore(store)) logFeatureSad("team_memory_multistore_bulk_inflate", failureKind);
    logForDebugging(
      `${logPrefix}: bulk inflate unavailable (${errorMessage(error)}) \u2014 using per-file pull`,
      {
        level: "debug",
      },
    );
    return "fell-back";
  }
  let remoteHashes = new Map();
  let pathByMemoryId = new Map();
  let entryByPath = new Map();
  let conflictingPaths = new Set();
  let writtenPaths = new Set();
  let locallyEditedPaths = new Set();
  let removedPaths = new Set();
  let shaMismatchCount = 0;
  let emptyRestoredCount = 0;
  let idsByPath = new Map();
  let shasByPath = new Map();
  let locallyEditedCount = 0;
  let exportResult = await pullStoreExport({
    source,
    maxConcurrentWrites: LOCAL_IO_CONCURRENCY,
    maxLineLength: MAX_BATCH_BYTES,
    maxLines: MAX_STORE_ENTRIES * 2 + 2,
    deadlineMs: SYNC_INTERVAL_MS,
    handleMemory: async (memory) => {
      let memoryPath = normalizePathPrefix(memory.path);
      let isDocKey =
        isMemoryDocumentKey_2(memoryPath) &&
        !(store.excludeKey && store.excludeKey(memoryPath.replace(/^\/+/, "")));
      pathByMemoryId.set(memory.memoryId, isDocKey ? memoryPath : null);
      if (!isDocKey) return;
      let contentHash = computeContentHash(memory.content);
      if (contentHash !== memory.contentSha256) shaMismatchCount++;
      let previousEntry = entryByPath.get(memoryPath);
      if (previousEntry !== undefined) {
        if (previousEntry.id !== memory.memoryId || previousEntry.sha256 !== contentHash)
          conflictingPaths.add(memoryPath);
        let seenShas = shasByPath.get(memoryPath);
        if (seenShas === undefined) {
          seenShas = new Set([previousEntry.sha256]);
          shasByPath.set(memoryPath, seenShas);
        }
        seenShas.add(contentHash);
        let seenIds = idsByPath.get(memoryPath);
        if (seenIds === undefined) {
          seenIds = new Set([previousEntry.id]);
          idsByPath.set(memoryPath, seenIds);
        }
        seenIds.delete(memory.memoryId);
        seenIds.add(memory.memoryId);
      }
      entryByPath.set(memoryPath, {
        id: memory.memoryId,
        sha256: contentHash,
      });
      let sha256 = contentHash;
      try {
        if (await isLocallyEdited(store, memoryPath, storage)) {
          locallyEditedCount++;
          locallyEditedPaths.add(memoryPath);
          sha256 = store.pullWritten.get(memoryPath)?.sha256 ?? EMPTY_CONTENT_HASH;
        } else if (!(await isLocalContentEqual(store, memoryPath, memory.content, storage))) {
          if (contentHash !== EMPTY_CONTENT_SHA256 && (await isLocallyEditedFile(store, memoryPath, storage)))
            emptyRestoredCount++;
          if (
            (await writeLocalEntry(store, memoryPath, memory.content, memory.updatedAt, storage)) ===
            "dropped"
          )
            return;
          await recordPullWrite(store, memoryPath, contentHash, storage);
          writtenPaths.add(memoryPath);
        }
      } catch (error) {
        if (error instanceof PathTraversalError) {
          logForDebugging(`${logPrefix}: refusing to write escaping path ${memoryPath}`, {
            level: "warn",
          });
          return;
        }
        throw error;
      }
      remoteHashes.set(memoryPath, {
        id: memory.memoryId,
        sha256,
      });
    },
  });
  let localDiffersFromRemote = async (remotePath) => {
    try {
      let mountPath = await resolveMountPath(store, remotePath);
      if ((await statLocalEntry(storage, store, mountPath)).size > MAX_MEMORY_BYTES) return true;
      let contentHash = computeContentHash(await readLocalEntry(storage, store, mountPath));
      let remoteShas = shasByPath.get(remotePath);
      if (remoteShas !== undefined) return !remoteShas.has(contentHash);
      return entryByPath.get(remotePath)?.sha256 !== contentHash;
    } catch (error) {
      return getErrnoCode(error) !== "ENOENT";
    }
  };
  let unlinkFailed = false;
  for (let [oldPath, oldEntry] of remoteHashes)
    if (pathByMemoryId.get(oldEntry.id) !== oldPath || conflictingPaths.has(oldPath)) {
      writtenPaths.delete(oldPath);
      if (await localDiffersFromRemote(oldPath)) {
        let idSet = idsByPath.get(oldPath);
        let survivorId =
          idSet && [...idSet].findLast((candidateId) => pathByMemoryId.get(candidateId) === oldPath);
        if (survivorId !== undefined)
          remoteHashes.set(oldPath, {
            id: survivorId,
            sha256: EMPTY_CONTENT_HASH,
          });
        else {
          remoteHashes.delete(oldPath);
          removedPaths.add(oldPath);
        }
        continue;
      }
      remoteHashes.delete(oldPath);
      try {
        await deleteLocalEntry(store, oldPath, storage);
      } catch (error) {
        logForDebugging(`${logPrefix}: failed to remove superseded ${oldPath} (${errorMessage(error)})`, {
          level: "warn",
        });
        unlinkFailed = true;
      }
    }
  let size = writtenPaths.size;
  if (emptyRestoredCount > 0) noticeEmptyFilesRestored(store, emptyRestoredCount);
  if (!exportResult.ok || unlinkFailed) {
    let reason = exportResult.ok ? "dedupe_unlink_failed" : exportResult.reason;
    if (isNonAccountStore(store)) logFeatureSad("team_memory_multistore_bulk_inflate", reason);
    logForDebugging(
      `${logPrefix}: bulk inflate incomplete (${reason}) after ${size} file(s) \u2014 using per-file pull`,
      {
        level: "warn",
      },
    );
    return "fell-back";
  }
  let entriesListed = countWhere([...pathByMemoryId.values()], (mappedPath) => mappedPath !== null);
  if (store.basisUnusable !== undefined && store.basisUnusable !== null) {
    let localSnapshot = null;
    try {
      localSnapshot = await collectLocalMemoryEntries(
        store.mountDir,
        store.excludeKey,
        storage,
        store.v5MemoryBase,
        store.manifestSeenThisSession,
        store.walkHashes,
        undefined,
      );
    } catch (error) {
      logForDebugging(`${logPrefix}: basis_unusable walk failed: ${errorMessage(error)}`, {
        level: "warn",
      });
    }
    let holdForWalk = isUsableSuppressedReason(store.basisUnusable);
    if (
      holdForWalk &&
      (localSnapshot === null ||
        (!localSnapshot.diskTrusted && !(await isMountDirEffectivelyEmpty(store, localSnapshot))))
    ) {
      logFeatureSad("team_memory_multistore_bulk_inflate", "walk_untrusted");
      store.rejoinWalkUntrusted = true;
      return "fell-back";
    }
    if (localSnapshot === null) store.basisUnusable = null;
    else
      await handleUnusableBasis(store, localSnapshot.entries, remoteHashes, storage, {
        walkTrusted: localSnapshot.diskTrusted,
        hold: holdForWalk,
      });
  }
  store.remoteHashes = remoteHashes;
  store.pulled = true;
  await writeSyncManifest(
    store,
    {
      expectPresent,
    },
    storage,
  ).catch((error) =>
    logForDebugging(`${logPrefix}: manifest write failed: ${errorMessage(error)}`, {
      level: "warn",
    }),
  );
  await writeSyncBasis(store, storage);
  if (isNonAccountStore(store)) logFeatureOk("team_memory_multistore_bulk_inflate");
  if (
    isNonAccountStore(store) &&
    [...locallyEditedPaths].some((editedPath) => remoteHashes.has(editedPath) || removedPaths.has(editedPath))
  )
    logFeatureOk("team_memory_multistore_concurrent_write_preserved");
  logForDebugging(
    `${logPrefix}: bulk inflated ${size} file(s) from ${exportResult.memoryLines} exported memory line(s)` +
      (shaMismatchCount ? `, ${shaMismatchCount} declared-sha mismatch(es)` : ""),
    {
      level: "info",
    },
  );
  return {
    success: true,
    entriesListed,
    shaMismatches: shaMismatchCount,
    emptyRestored: emptyRestoredCount,
    filesWritten: size,
    filesDeleted: 0,
    filesSkippedConcurrent: locallyEditedCount,
    entriesWithoutRef: Math.max(0, entriesListed - remoteHashes.size),
  };
}
//@ chunk-7jxyna5q.js:140442-140461 placement
/**
 * 重试计数窗口（300000 毫秒）。
 */
var MAX_UNAVAILABLE_RETRIES = 3;
var UNAVAILABLE_WINDOW_MS = 300000;
//@ chunk-7jxyna5q.js:140461-140656 placement
function allowConflictRefetch(store, path) {
  let now = Date.now();
  let refetches = (store.conflictRefetches ??= new Map());
  let entry = refetches.get(path);
  if (!entry || now - entry.windowStartMs >= UNAVAILABLE_WINDOW_MS) {
    refetches.set(path, {
      count: 1,
      windowStartMs: now,
    });
    return true;
  }
  if (entry.count >= MAX_UNAVAILABLE_RETRIES) return false;
  entry.count++;
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
