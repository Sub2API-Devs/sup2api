/**
 * services/memorySync/multiStoreSync.ts
 *
 * 多记忆库同步一轮（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (14)
 * attribution: placement 14
 */
import { join, sep } from "path";
import { stat, mkdir } from "fs/promises";
import { resolvePersonalMemoryPath } from "../memoryStore/memoryKeys.js";
import {
  PathTraversalError,
  validateTeamMemKey,
  checkPathInTeamMemDir,
  getMemoryDirNfc,
} from "../../memdir/teamMemPaths.js";
import { logForDebugging } from "../../utils/debug.js";
import { env } from "../../utils/env.js";
import { collectLocalMemoryEntries, getV5MemoryContext, resolveMountPath } from "./mountWalk.js";
import { errorMessage, sanitizedMachineReasonForTelemetry } from "../../utils/errors.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum, fromEnumOpt } from "../analytics/safeMetadata.js";
import {
  isOrgMemoryDecisionClosed,
  isNonAccountStore,
  checkPushManifestGate,
  errorSummary,
  runWithConcurrency,
  allowConflictRefetch,
  shouldMirrorAllUncovered,
  isStoreForeignPartition,
  readoptMountDir,
  checkForeignPartition,
  getMountDirOccupancy,
  enumerateMountDir,
  checkUnmanifestedMountDir,
  rejoinTeamMemory,
} from "./storeReconcile.js";
import { grantedModeFor, isOrgMemoryWriteOptedIn } from "../orgMemory/orgMemoryDecision.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import {
  isTypedKoalaEnabled,
  EMPTY_CONTENT_SHA256,
  memoryPushDeleteMode,
  dropPresentRemovals,
  deleteModeAllowsCorroborate,
  isRemoveAlreadyRecorded,
  PUSH_TIMEOUT_MS,
  pruneNamedDeletes,
  getMassDeleteThreshold,
  LOCAL_IO_CONCURRENCY,
  namedDeleteHintMessage,
  EMPTY_CONTENT_HASH,
  isUsableSuppressedReason,
} from "./syncConfig.js";
import {
  formatOversizedMemoryNotice,
  memorySyncPausedText,
  formatMassDeleteGuardNotice,
  findRemoteEntry,
  recordRemoteEntry,
  queueConflictNotice,
  quoteStoreName,
  formatDeletionConflictNotice,
  storeRecoveredText,
  quoteMemoryFilePath,
  MEMORY_SYNC_REJECT_TEXTS,
  noticeDeleteBlocked,
  noticeStoreRecovered,
  formatMemorySyncPausedNotice,
} from "./syncNotices.js";
import { readSyncManifest, clearBasis, writeSyncBasis, writeSyncManifest } from "./syncManifest.js";
import { countWhere } from "../../utils/collections.js";
import {
  MemoryPermanentError,
  MemoryUnavailableError,
  MemoryNotFoundError,
  MemoryConflictError,
} from "../orgMemory/storeErrors.js";
import { normalizePathPrefix } from "../orgMemory/storeApi.js";
import { storageKeyForMountPath } from "../../memdir/teamMemPrompts.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:150819-150917 placement
/**
 * 同步无操作时的结果对象。
 */
var NOOP_SYNC_RESULT = {
  success: true,
  filesWritten: 0,
  filesDeleted: 0,
  conflicts: 0,
  secretsSkipped: 0,
  oversizedSkipped: 0,
};
//@ chunk-7jxyna5q.js:150917-151125 placement
async function resolveStoreKeyPath(store, key) {
  switch (store.scope) {
    case "user":
      return resolvePersonalMemoryPath(key);
    case "account":
      throw new PathTraversalError("Key refused: this build has no account memory store");
    case "team":
      return validateTeamMemKey(join(store.mountName, key).split(sep).join("/"));
  }
}
//@ chunk-7jxyna5q.js:151125-151279 placement
async function checkMountDirLocation(store) {
  switch (store.scope) {
    case "user":
      return checkPathInTeamMemDir(store.mountDir);
    case "account":
      return "escape";
    case "team":
      return checkPathInTeamMemDir(store.mountDir, "team", store.mountName);
  }
}
//@ chunk-7jxyna5q.js:151279-151653 placement
/**
 * 检查团队记忆根与挂载目录是否偏离规范位置，偏离时记错误并按关闭失败处理。
 */
async function isMountEscaped(store) {
  if (store.scope === "team" && (await checkPathInTeamMemDir(getMemoryDirNfc(), "team")) === "escape") {
    logForDebugging(
      `multi-store-sync[${store.mountName}]: team memory root escapes its canonical location \u2014 failing closed`,
      {
        level: "error",
      },
    );
    return true;
  }
  if ((await checkMountDirLocation(store)) === "escape") {
    logForDebugging(
      `multi-store-sync[${store.mountName}]: mount dir escapes its canonical location \u2014 failing closed`,
      {
        level: "error",
      },
    );
    return true;
  }
  return false;
}
//@ chunk-7jxyna5q.js:151653-152259 placement
async function scanUnsavedWrites(store, allowDeletes, storage) {
  if (!allowDeletes || env.CLAUDE_CODE_DISABLE_MEMORY_RO_UNSAVED_NOTICE || (await isMountEscaped(store)))
    return [];
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
    logForDebugging(
      `multi-store-sync[${store.mountName}]: unsaved-write scan failed: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    return [];
  }
  if (localEntries.rootMissing) return [];
  let alreadyNoticed = store.notices.roUnsavedNoticed.get(store.mountDir);
  let noticedPaths = localEntries.diskTrusted ? new Set() : new Set(alreadyNoticed);
  let newPaths = [];
  for (let [path, entry] of localEntries.entries) {
    if (store.remoteHashes.get(path)?.sha256 === entry.sha256) continue;
    noticedPaths.add(path);
    if (!alreadyNoticed?.has(path)) newPaths.push(path);
  }
  store.notices.roUnsavedNoticed.set(store.mountDir, noticedPaths);
  return newPaths.sort();
}
//@ chunk-7jxyna5q.js:152259-152637 placement
/**
 * 运行一轮多库同步，结束后若有本轮的基线不可用报告且未上报，则记 tengu_team_mem_basis_unusable。
 */
async function runSyncCycleWithReport(store, options, storage) {
  let basisUnusableReport = store.basisUnusableReport ?? null;
  try {
    return await runMultiStoreSyncCycle(store, basisUnusableReport, options, storage);
  } finally {
    if (basisUnusableReport !== null && store.basisUnusableReport === basisUnusableReport) {
      store.basisUnusableReport = null;
      if (!basisUnusableReport.emitted) {
        basisUnusableReport.emitted = true;
        logEvent("tengu_team_mem_basis_unusable", {
          scope: fromEnum(store.scope),
          reason: fromEnum(basisUnusableReport.reason),
          local_only_count: basisUnusableReport.localOnly.size,
          held_count: basisUnusableReport.held,
          uploaded_count: basisUnusableReport.uploaded,
          upload_failed_count: basisUnusableReport.uploadFailed,
        });
      }
    }
  }
}
//@ chunk-7jxyna5q.js:152637-161916 placement
/**
 * 多记忆库同步一轮：只读库未保存写入、冲突、批量删除保护
 */
async function runMultiStoreSyncCycle(store, basisUnusableReport, options, storage) {
  if (store.backend.mode === "ro") {
    let unsavedPaths = await scanUnsavedWrites(store, options?.allowDeletes === true, storage);
    if (unsavedPaths.length === 0) return NOOP_SYNC_RESULT;
    logEvent("tengu_memory_sync_ro_unsaved", {
      scope: fromEnum(store.scope),
      count: unsavedPaths.length,
    });
    return {
      ...NOOP_SYNC_RESULT,
      unsavedReadOnlyPaths: unsavedPaths,
    };
  }
  if (isOrgMemoryDecisionClosed(store))
    return {
      ...NOOP_SYNC_RESULT,
      skipped: true,
    };
  if (
    (store.source ?? "env") === "discovery" &&
    (grantedModeFor(store.backend.partitionId) !== "rw" || !isOrgMemoryWriteOptedIn())
  )
    return {
      ...NOOP_SYNC_RESULT,
      skipped: true,
    };
  if (await isMountEscaped(store)) {
    if (isNonAccountStore(store)) logFeatureSad("team_memory_multistore_conflict", "root_escape");
    return NOOP_SYNC_RESULT;
  }
  await checkPushManifestGate(store, storage);
  if (!store.pulled) return NOOP_SYNC_RESULT;
  let storageV5Enabled = isStorageV5Enabled();
  let v5MemoryContext = getV5MemoryContext(store, storage);
  let heldLocal = store.heldLocal;
  if (heldLocal !== undefined && !isTypedKoalaEnabled()) heldLocal.clear();
  let remoteHashes = store.remoteHashes;
  if (heldLocal !== undefined && heldLocal.size > 0) {
    let mergedHashes = new Map(store.remoteHashes);
    for (let [path, sha256] of heldLocal)
      if (!mergedHashes.has(path))
        mergedHashes.set(path, {
          sha256,
        });
    remoteHashes = mergedHashes;
  }
  let localMemoryEntries = await collectLocalMemoryEntries(
    store.mountDir,
    store.excludeKey,
    storage,
    store.v5MemoryBase,
    store.manifestSeenThisSession,
    store.walkHashes,
    remoteHashes,
  );
  await formatOversizedMemoryNotice(store, localMemoryEntries.skippedOversizedPaths);
  if (heldLocal !== undefined) {
    let released = {
      edited: 0,
      deleted: 0,
      server_listed: 0,
    };
    for (let [path, sha256] of heldLocal) {
      let entry = localMemoryEntries.entries.get(path);
      if (store.remoteHashes.has(path)) released.server_listed++;
      else if (entry === undefined) {
        if (!localMemoryEntries.diskTrusted || localMemoryEntries.diskPaths.has(path)) continue;
        released.deleted++;
      } else if (entry.sha256 !== sha256) released.edited++;
      else continue;
      heldLocal.delete(path);
    }
    if (released.edited + released.deleted + released.server_listed)
      logEvent("tengu_team_mem_held_released", {
        scope: fromEnum(store.scope),
        ...released,
      });
  }
  let skipReason =
    localMemoryEntries.skippedOversizedPaths[0]?.path ?? localMemoryEntries.skippedSecretPaths[0];
  let emptySkipped = 0;
  let refusedWrites = (store.refusedWrites ??= new Map());
  for (let key of refusedWrites.keys()) {
    let entry = localMemoryEntries.entries.get(key);
    if (
      entry === undefined
        ? localMemoryEntries.diskTrusted && !localMemoryEntries.diskPaths.has(key)
        : store.remoteHashes.get(key)?.sha256 === entry.sha256
    )
      refusedWrites.delete(key);
  }
  let toPush = [];
  for (let [path, entry] of localMemoryEntries.entries) {
    let known = store.remoteHashes.get(path);
    if (known?.sha256 === entry.sha256 || entry.content === undefined) continue;
    if (entry.sha256 === EMPTY_CONTENT_SHA256) {
      emptySkipped++;
      continue;
    }
    if (known === undefined && heldLocal?.get(path) === entry.sha256) continue;
    let refusal = refusedWrites.get(path);
    if (refusal?.sha256 === entry.sha256 && Date.now() - refusal.atMs < memorySyncPausedText) {
      skipReason ??= path;
      continue;
    }
    toPush.push({
      path,
      content: entry.content,
      sha256: entry.sha256,
      known,
    });
  }
  if (emptySkipped > 0)
    logForDebugging(
      `multi-store-sync[${store.mountName}]: not pushing ${emptySkipped} empty (0-byte) file(s)`,
      {
        level: "warn",
      },
    );
  let syncManifest = await readSyncManifest(store.mountDir, storage, store.v5MemoryBase);
  let basisUsable =
    syncManifest.state === "present" && syncManifest.manifest.partition === store.backend.partitionId;
  let basisForeign = syncManifest.state === "present" && !basisUsable;
  let pendingDeletes = memoryPushDeleteMode();
  let toDelete = [];
  let deletesDeferred = 0;
  let deletesReappeared = 0;
  let pendingDeletes_2 = (store.pendingDeletes ??= new Map());
  for (let key of pendingDeletes_2.keys())
    if (localMemoryEntries.diskPaths.has(key)) {
      pendingDeletes_2.delete(key);
      deletesReappeared++;
    }
  dropPresentRemovals(store, localMemoryEntries.diskPaths);
  if (options?.allowDeletes && localMemoryEntries.diskTrusted && basisUsable) {
    let now = Date.now();
    for (let [path, ref] of store.remoteHashes) {
      if (localMemoryEntries.diskPaths.has(path)) continue;
      if (!deleteModeAllowsCorroborate(pendingDeletes)) {
        if (isRemoveAlreadyRecorded(store, path, ref))
          toDelete.push({
            path,
            ref,
          });
        else deletesDeferred++;
        continue;
      }
      if (pendingDeletes === "immediate") {
        toDelete.push({
          path,
          ref,
        });
        continue;
      }
      let pending = pendingDeletes_2.get(path);
      if (pending === undefined) {
        pendingDeletes_2.set(path, {
          firstMissingAtMs: now,
          missingWalks: 1,
        });
        deletesDeferred++;
      } else {
        pending.missingWalks++;
        if (pending.missingWalks >= 2 && now - pending.firstMissingAtMs >= PUSH_TIMEOUT_MS)
          toDelete.push({
            path,
            ref,
          });
        else deletesDeferred++;
      }
    }
    for (let key of pendingDeletes_2.keys()) if (!store.remoteHashes.has(key)) pendingDeletes_2.delete(key);
  }
  let deletesHeld = 0;
  if (toDelete.length > 0) {
    let deleteCandidates = pruneNamedDeletes(store);
    let missingCount =
      countWhere([...store.remoteHashes.keys()], (path) => !localMemoryEntries.diskPaths.has(path)) +
      deleteCandidates;
    let massDeleteThreshold = getMassDeleteThreshold(store.remoteHashes.size);
    if (missingCount > massDeleteThreshold) {
      deletesHeld = toDelete.length;
      toDelete.length = 0;
      logForDebugging(
        `multi-store-sync[${store.mountName}]: holding ${deletesHeld} delete(s): ${missingCount} synced files are missing locally or were just deleted, of ${store.remoteHashes.size} tracked (mass-delete guard)`,
        {
          level: "warn",
        },
      );
      formatMassDeleteGuardNotice(store, missingCount, massDeleteThreshold, deleteCandidates);
      store.invalidatedBasis = store.remoteHashes;
      store.remoteHashes = new Map();
      store.pulled = false;
      pendingDeletes_2.clear();
      store.namedRemovals?.clear();
      await clearBasis(store, storage);
    }
  }
  let filesWritten = 0;
  let filesDeleted = 0;
  let conflicts = 0;
  let conflictRecoveries = 0;
  let failed = false;
  let backedOff = false;
  let counts = false;
  let notStarted = 0;
  let error;
  let permanentReason;
  let permanentPath;
  let failureReason;
  function recordPushFailure(error_2, path) {
    logForDebugging(
      `multi-store-sync[${store.mountName}]: push failed for ${path ?? "<store>"}: ${errorSummary(error_2)}`,
      {
        level: "warn",
      },
    );
    failed = true;
    if (path !== undefined && basisUnusableReport?.localOnly.has(path) === true)
      basisUnusableReport.uploadFailed++;
    if (error_2 instanceof MemoryPermanentError) {
      permanentReason ??= error_2.reason;
      failureReason ??= error_2.reason;
    } else if (error_2 instanceof MemoryUnavailableError) {
      failureReason ??= "unavailable";
      backedOff = noteServerBackoff(store, error_2) || backedOff;
    } else failureReason ??= "error";
    error ??= errorSummary(error_2);
  }
  await runWithConcurrency(basisForeign ? [] : toPush, LOCAL_IO_CONCURRENCY, async (item) => {
    if (backedOff) {
      notStarted++;
      return;
    }
    let adoptedId;
    let known = item.known;
    let remoteWasDeleted = false;
    try {
      let written;
      if (known)
        try {
          written = await store.backend.update(known.id, item.content, known.sha256);
        } catch (error) {
          if (!(
            error instanceof MemoryNotFoundError &&
            (await findRemoteEntry(store, item.path).then(
              (remoteEntry) => remoteEntry === null,
              () => false,
            ))
          ))
            throw error;
          store.remoteHashes.delete(item.path);
          known = undefined;
          remoteWasDeleted = true;
        }
      if (written === undefined)
        try {
          written = await store.backend.create(item.path, item.content, {
            precondition: "not_exists",
          });
          if (
            !store.firstWriteEmitted &&
            (store.source ?? "env") === "discovery" &&
            store.writeDir !== undefined &&
            store.writeDir !== "" &&
            normalizePathPrefix(item.path).replace(/^\//, "").startsWith(store.writeDir)
          ) {
            store.firstWriteEmitted = true;
            logEvent("tengu_org_memory_first_write_into_write_home", {});
          }
        } catch (error) {
          if (
            !(error instanceof MemoryConflictError) ||
            (error.conflictingPath !== undefined && error.conflictingPath !== error.path)
          )
            throw error;
          let remoteEntry = await findRemoteEntry(store, item.path);
          if (remoteEntry === null) {
            skipReason ??= item.path;
            recordPushFailure(error, item.path);
            return;
          }
          adoptedId = remoteEntry.id;
          if (remoteEntry.sha256 !== item.sha256) throw error;
          await recordRemoteEntry(
            store,
            item.path,
            {
              id: remoteEntry.id,
              sha256: remoteEntry.sha256,
            },
            storage,
          );
          refusedWrites.delete(item.path);
          logForDebugging(
            `multi-store-sync[${store.mountName}]: adopted ${item.path} (identical content \u2192 ${remoteEntry.id})`,
            {
              level: "debug",
            },
          );
          return;
        }
      await recordRemoteEntry(store, item.path, written, storage);
      refusedWrites.delete(item.path);
      filesWritten++;
      if (basisUnusableReport?.localOnly.has(item.path) === true) basisUnusableReport.uploaded++;
      logForDebugging(
        `multi-store-sync[${store.mountName}]: pushed ${item.path} (${known ? "update" : "create"} \u2192 ${written.id})`,
        {
          level: "debug",
        },
      );
      if (remoteWasDeleted)
        await queueConflictNotice(
          store,
          item.path,
          `The memory file ${quoteStoreName(item.path)} was deleted from shared memory by another session while you had local changes. Your local version has been saved to shared memory as a new copy. ` +
            (!deleteModeAllowsCorroborate(pendingDeletes)
              ? namedDeleteHintMessage(store)
              : "If the deletion was intended, delete the file."),
        );
    } catch (error) {
      if (error instanceof MemoryPermanentError && error.reason === "store_full") counts = true;
      else skipReason ??= item.path;
      if (error instanceof MemoryConflictError) {
        logForDebugging(
          `multi-store-sync[${store.mountName}]: push conflict on ${item.path}: ${errorMessage(error)}`,
          {
            level: "debug",
          },
        );
        conflicts++;
        if (basisUnusableReport?.localOnly.has(item.path) === true) basisUnusableReport.uploadFailed++;
        let id = known?.id ?? adoptedId;
        if (id) {
          if (
            allowConflictRefetch(store, item.path) &&
            (await formatDeletionConflictNotice(
              store,
              item.path,
              id,
              (known === undefined && !remoteWasDeleted) || known?.sha256 === EMPTY_CONTENT_HASH
                ? "unsynced"
                : "update",
              storage,
            ))
          )
            conflictRecoveries++;
          else if (!known)
            store.remoteHashes.set(item.path, {
              id,
              sha256: EMPTY_CONTENT_HASH,
            });
        } else
          await queueConflictNotice(
            store,
            item.path,
            `Your recent write to the memory file ${quoteStoreName(item.path)} was NOT saved to shared memory: its path conflicts with an existing memory (a file exists where this path needs a directory, or the reverse). Re-read the memory directory and rename this file, or delete the conflicting one, if the change is still wanted.`,
          );
        return;
      }
      if (error instanceof MemoryPermanentError && storeRecoveredText.has(error.reason)) {
        let previousRefusal = refusedWrites.get(item.path);
        let sameRefusal = previousRefusal?.sha256 === item.sha256 && previousRefusal.reason === error.reason;
        refusedWrites.set(item.path, {
          sha256: item.sha256,
          reason: error.reason,
          atMs: Date.now(),
        });
        logForDebugging(
          `multi-store-sync[${store.mountName}]: server refused ${item.path}; other files keep syncing: ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
        if (!sameRefusal)
          await queueConflictNotice(
            store,
            item.path,
            `The memory file ${quoteMemoryFilePath(item.path)} was NOT saved to shared memory (${error.reason}). ${MEMORY_SYNC_REJECT_TEXTS[error.reason] ?? ""} Your other memory files keep syncing. This file stays local only, and its changes will be lost when this session's machine is recycled. Once you change or delete it, the next sync tries again. Tell the user this memory file is not being persisted.`,
            {
              keepPending: true,
            },
          );
        return;
      }
      if (error instanceof MemoryPermanentError && permanentReason === undefined) permanentPath = item.path;
      recordPushFailure(error, item.path);
    }
  });
  await runWithConcurrency(toDelete, LOCAL_IO_CONCURRENCY, async (item) => {
    if (backedOff) {
      notStarted++;
      return;
    }
    try {
      let mountPath = await resolveMountPath(store, item.path);
      let storageKey =
        v5MemoryContext !== undefined
          ? storageKeyForMountPath(v5MemoryContext.base, store.mountDir, mountPath)
          : undefined;
      if (storageV5Enabled && v5MemoryContext !== undefined && storageKey !== undefined) {
        let alreadyGone = false;
        try {
          let meta = await v5MemoryContext.storageV5.statMeta(storageKey);
          alreadyGone = !meta.ok && meta.error.code === "NotFound";
        } catch {}
        if (!alreadyGone) {
          pendingDeletes_2.delete(item.path);
          store.namedRemovals?.delete(item.path);
          deletesReappeared++;
          return;
        }
      } else {
        await stat(mountPath);
        pendingDeletes_2.delete(item.path);
        store.namedRemovals?.delete(item.path);
        deletesReappeared++;
        return;
      }
    } catch {}
    let forget = () => {
      store.remoteHashes.delete(item.path);
      pendingDeletes_2.delete(item.path);
      store.namedRemovals?.delete(item.path);
      store.pullWritten.delete(item.path);
    };
    if (backedOff) {
      notStarted++;
      return;
    }
    if (!deleteModeAllowsCorroborate(pendingDeletes) && skipReason !== undefined) {
      store.namedRemovals?.delete(item.path);
      deletesDeferred++;
      await noticeDeleteBlocked(store, item.path, skipReason);
      return;
    }
    try {
      await store.backend.delete(item.ref.id, item.ref.sha256);
      if (store.namedRemovals?.has(item.path)) (store.namedDeletesSentAtMs ??= []).push(Date.now());
      forget();
      filesDeleted++;
      logForDebugging(`multi-store-sync[${store.mountName}]: pushed ${item.path} (delete ${item.ref.id})`, {
        level: "debug",
      });
    } catch (error) {
      if (error instanceof MemoryConflictError) {
        logForDebugging(
          `multi-store-sync[${store.mountName}]: delete conflict on ${item.path}: ${errorMessage(error)}`,
          {
            level: "debug",
          },
        );
        pendingDeletes_2.delete(item.path);
        conflicts++;
        if (
          allowConflictRefetch(store, item.path) &&
          (await formatDeletionConflictNotice(store, item.path, item.ref.id, "delete", storage))
        )
          conflictRecoveries++;
        return;
      }
      if (error instanceof MemoryNotFoundError) {
        if (
          await findRemoteEntry(store, item.path).then(
            (remoteEntry) => remoteEntry === null,
            () => false,
          )
        )
          forget();
        else
          logForDebugging(
            `multi-store-sync[${store.mountName}]: delete of ${item.path} 404'd but the path is still listed (or the listing failed) \u2014 retrying next cycle`,
            {
              level: "debug",
            },
          );
        return;
      }
      if (
        !deleteModeAllowsCorroborate(pendingDeletes) &&
        error instanceof MemoryPermanentError &&
        error.reason !== "store_archived" &&
        error.reason !== "no_oauth" &&
        error.reason !== "http_401"
      ) {
        logForDebugging(
          `multi-store-sync[${store.mountName}]: could not delete ${item.path}, so the next pull restores it: ${errorSummary(error)}`,
          {
            level: "warn",
          },
        );
        store.namedRemovals?.delete(item.path);
        await queueConflictNotice(
          store,
          item.path,
          `Memory sync could not delete ${quoteStoreName(item.path)} from shared memory, so it stays there and will be restored on this machine at the next sync.`,
        );
        return;
      }
      recordPushFailure(error, item.path);
    }
  });
  if (notStarted > 0)
    logForDebugging(
      `multi-store-sync[${store.mountName}]: ${notStarted} upload(s)/delete(s) not started this cycle after the server asked sync to wait; a later sync sends them (waiting at least ${Math.max(0, Math.ceil(((store.serverBackoffUntilMs ?? 0) - Date.now()) / 1000))}s)`,
      {
        level: "warn",
      },
    );
  if (basisUsable && deletesHeld === 0) await writeSyncBasis(store, storage);
  if (
    deletesDeferred > 0 ||
    deletesReappeared > 0 ||
    deletesHeld > 0 ||
    (!deleteModeAllowsCorroborate(pendingDeletes) && filesDeleted > 0)
  )
    logEvent("tengu_team_mem_push_delete_deferred", {
      scope: fromEnum(store.scope),
      mode: fromEnum(pendingDeletes),
      deferred: deletesDeferred,
      reappeared: deletesReappeared,
      held: deletesHeld,
      executed: filesDeleted,
      pending: pendingDeletes_2.size,
    });
  return {
    success: !failed,
    filesWritten,
    filesDeleted,
    conflicts,
    conflictRecoveries,
    secretsSkipped: localMemoryEntries.skippedSecretPaths.length,
    oversizedSkipped: localMemoryEntries.skippedOversizedPaths.length,
    retryWrites: (counts && filesDeleted > 0 && !deleteModeAllowsCorroborate(pendingDeletes)) || undefined,
    deletesDeferred,
    deletesReappeared,
    deletesHeld,
    diskTrusted: localMemoryEntries.diskTrusted,
    emptySkipped,
    filesRefused: refusedWrites.size,
    backedOff: backedOff || undefined,
    permanent: permanentReason,
    permanentPath,
    failureReason,
    error,
  };
}
//@ chunk-7jxyna5q.js:161916-161931 placement
/**
 * 重同步间隔的下限（1 分钟）。
 */
var DEFAULT_RESYNC_INTERVAL_MIN = 60;
var MIN_RESYNC_INTERVAL_MIN = 1;
//@ chunk-7jxyna5q.js:161931-162125 placement
/**
 * memory store 周期重同步间隔：CLAUDE_CODE_DISABLE_MEMORY_PERIODIC_RESYNC 关闭；否则 tengu_memory_store_resync_interval_minutes（有下限）。
 */
function getMemoryStoreResyncIntervalMs() {
  if (env.CLAUDE_CODE_DISABLE_MEMORY_PERIODIC_RESYNC) return 0;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_memory_store_resync_interval_minutes",
    DEFAULT_RESYNC_INTERVAL_MIN,
  );
  if (!Number.isFinite(featureValue_CACHED_MAY_BE_STALE) || featureValue_CACHED_MAY_BE_STALE <= 0) return 0;
  return Math.max(featureValue_CACHED_MAY_BE_STALE, MIN_RESYNC_INTERVAL_MIN) * 60000;
}
//@ chunk-7jxyna5q.js:162125-162286 placement
var SKIPPED_RESULT; // deferred: uses NOOP_SYNC_RESULT of its import cycle while loading; runs once the cycle is complete
var NOOP_RESULT;
var BACKED_OFF_RESULT;
var BACKED_OFF_PULL_RESULT;
deferInit("chunk-7jxyna5q.js:162125", () => {
  SKIPPED_RESULT = {
    success: true,
    skipped: true,
    entriesListed: 0,
    filesWritten: 0,
    filesDeleted: 0,
  };
  NOOP_RESULT = SKIPPED_RESULT;
  BACKED_OFF_RESULT = {
    ...SKIPPED_RESULT,
    cause: "backed_off",
    backedOff: true,
  };
  BACKED_OFF_PULL_RESULT = {
    ...NOOP_SYNC_RESULT,
    skipped: true,
    backedOff: true,
  };
});
//@ chunk-7jxyna5q.js:162286-162454 placement
function noteServerBackoff(store, error) {
  if (!(error instanceof MemoryUnavailableError) || error.retryAfterMs === undefined) return false;
  store.serverBackoffUntilMs = Math.max(store.serverBackoffUntilMs ?? 0, Date.now() + error.retryAfterMs);
  return true;
}
//@ chunk-7jxyna5q.js:162454-162473 placement
/**
 * 抑制同步的时长（300000 毫秒）。
 */
var MAX_PERMANENT_FAILURES = 3;
var SUPPRESS_MS = 300000;
//@ chunk-7jxyna5q.js:162473-162617 placement
async function syncTeamMemoryOnce(root, trigger = "watch", storageV5, offRetries = 0) {
  if (root.inFlight) return root.inFlight;
  let run = syncTeamMemoryRoot(root, trigger, storageV5, offRetries);
  root.inFlight = run;
  try {
    return await run;
  } finally {
    root.inFlight = null;
  }
}
//@ chunk-7jxyna5q.js:162617-170009 placement
/**
 * 团队记忆根目录同步与 manifest 校正
 */
async function syncTeamMemoryRoot(root, trigger, storage, offRetries) {
  let results = {};
  let extraResults = {};
  let rootEscaped = (await checkPathInTeamMemDir(getMemoryDirNfc(), "team")) === "escape";
  if (rootEscaped)
    logForDebugging(
      "multi-store-sync: team memory root escapes its canonical location \u2014 failing all stores closed",
      {
        level: "error",
      },
    );
  await Promise.all(
    root.stores.map(async (store) => {
      if (isOrgMemoryDecisionClosed(store) || shouldMirrorAllUncovered(store)) {
        results[store.mountName] = NOOP_RESULT;
        return;
      }
      let backoffLeftMs = (store.serverBackoffUntilMs ?? 0) - Date.now();
      if (backoffLeftMs > 0) {
        logForDebugging(
          `multi-store-sync[${store.mountName}]: sitting this cycle out: the server asked sync to wait, ${Math.ceil(backoffLeftMs / 1000)}s left`,
          {
            level: "debug",
          },
        );
        results[store.mountName] = BACKED_OFF_RESULT;
        return;
      }
      let suppressedUntilMs = store.suppressedUntilMs ?? null;
      if (store.suppressedReason !== null && suppressedUntilMs !== null && Date.now() >= suppressedUntilMs) {
        logForDebugging(
          `multi-store-sync[${store.mountName}]: suppression window elapsed \u2014 retrying (was: ${store.suppressedReason})`,
          {
            level: "info",
          },
        );
        store.recoveryUnconfirmedReason = store.suppressedReason;
        store.suppressedReason = null;
        store.suppressedUntilMs = null;
      }
      if (store.suppressedReason !== null && !isStoreForeignPartition(store)) {
        results[store.mountName] = SKIPPED_RESULT;
        return;
      }
      let failStore = (error, permanent) => {
        results[store.mountName] = {
          success: false,
          entriesListed: 0,
          filesWritten: 0,
          filesDeleted: 0,
          ...(permanent !== undefined && {
            permanent,
          }),
          error,
        };
      };
      if (rootEscaped && store.scope === "team") {
        failStore("team memory root canonicity check failed (fail closed)");
        return;
      }
      try {
        await mkdir(store.mountDir, {
          recursive: true,
          ...(store.scope === "account" && {
            mode: 448,
          }),
        });
        if ((await checkMountDirLocation(store)) === "escape") {
          logForDebugging(
            `multi-store-sync[${store.mountName}]: mount dir escapes its canonical location \u2014 skipping pull+push (fail closed)`,
            {
              level: "error",
            },
          );
          failStore("mount dir canonicity check failed (fail closed)");
          return;
        }
        if (!store.pulled && store.scope !== "user") {
          let syncManifest = await readSyncManifest(store.mountDir, storage, store.v5MemoryBase);
          if (store.suppressedReason !== null && !(await readoptMountDir(store, syncManifest, storage))) {
            results[store.mountName] = SKIPPED_RESULT;
            return;
          }
          if (
            syncManifest.state === "present" &&
            syncManifest.manifest.partition !== store.backend.partitionId
          )
            checkForeignPartition(store, "firstPull");
          else if (syncManifest.state !== "present" && (store.source ?? "env") === "discovery") {
            let mountDirOccupancy = await getMountDirOccupancy(store.mountDir);
            if (mountDirOccupancy === "unreadable") {
              failStore("mount dir enumeration failed (fail closed)");
              return;
            }
            if (mountDirOccupancy === "occupied") {
              let enumeration = await enumerateMountDir(store, storage);
              if (enumeration.outcome === "mismatch") checkUnmanifestedMountDir(store);
              else if (enumeration.outcome === "failed") {
                failStore(enumeration.error, enumeration.permanent);
                return;
              } else {
                await clearBasis(store, storage);
                try {
                  await writeSyncManifest(store, {}, storage);
                } catch (error) {
                  if (isNonAccountStore(store))
                    logFeatureSad("team_memory_multistore_conflict", "manifest_materialization_failed");
                  failStore(`manifest restamp failed (fail closed): ${errorMessage(error)}`);
                  return;
                }
                if (isNonAccountStore(store))
                  logFeatureSad("team_memory_multistore_conflict", "manifest_restamped");
                logForDebugging(
                  `multi-store-sync[${store.mountName}]: ${syncManifest.state} manifest over content matching the store \u2014 restamped and adopting`,
                  {
                    level: "info",
                  },
                );
              }
            } else {
              if ((await readSyncManifest(store.mountDir, storage, store.v5MemoryBase)).state !== "present")
                await clearBasis(store, storage);
              let wroteManifest;
              try {
                wroteManifest = await writeSyncManifest(store, {}, storage);
              } catch (error) {
                if (isNonAccountStore(store))
                  logFeatureSad("team_memory_multistore_conflict", "manifest_materialization_failed");
                failStore(`manifest materialization failed (fail closed): ${errorMessage(error)}`);
                return;
              }
              if (wroteManifest) {
                if (isTypedKoalaEnabled()) await writeSyncBasis(store, storage);
              } else store.basisUnusable = null;
            }
          }
          if (store.suppressedReason !== null) {
            results[store.mountName] = SKIPPED_RESULT;
            return;
          }
        }
        results[store.mountName] = await rejoinTeamMemory(store, storage);
      } catch (error) {
        results[store.mountName] = {
          success: false,
          entriesListed: 0,
          filesWritten: 0,
          filesDeleted: 0,
          error: errorMessage(error),
        };
      }
    }),
  );
  await Promise.all(
    root.stores.map(async (store) => {
      if (store.suppressedReason !== null) {
        extraResults[store.mountName] = NOOP_SYNC_RESULT;
        return;
      }
      if (results[store.mountName] === BACKED_OFF_RESULT || Date.now() < (store.serverBackoffUntilMs ?? 0)) {
        extraResults[store.mountName] = BACKED_OFF_PULL_RESULT;
        return;
      }
      try {
        extraResults[store.mountName] = await runSyncCycleWithReport(
          store,
          {
            allowDeletes:
              results[store.mountName]?.success === true && results[store.mountName]?.skipped !== true,
          },
          storage,
        );
      } catch (error) {
        extraResults[store.mountName] = {
          ...NOOP_SYNC_RESULT,
          success: false,
          failureReason: "exception",
          error: errorMessage(error),
        };
      }
    }),
  );
  for (let store of root.stores) {
    if (store.suppressedReason !== null) continue;
    if (extraResults[store.mountName]?.retryWrites) {
      store.consecutivePermanentFailures = 0;
      continue;
    }
    if (results[store.mountName]?.skipped === true) continue;
    let permanent = results[store.mountName]?.permanent ?? extraResults[store.mountName]?.permanent;
    if (!permanent) {
      store.consecutivePermanentFailures = 0;
      if (
        (store.recoveryUnconfirmedReason ?? null) !== null &&
        results[store.mountName]?.success &&
        results[store.mountName]?.skipped !== true &&
        extraResults[store.mountName]?.success &&
        extraResults[store.mountName]?.skipped !== true
      ) {
        let pushResult = extraResults[store.mountName];
        noticeStoreRecovered(store, pushResult.filesWritten + pushResult.filesDeleted);
        store.recoveryUnconfirmedReason = null;
      }
      continue;
    }
    store.consecutivePermanentFailures = (store.consecutivePermanentFailures ?? 0) + 1;
    if (store.consecutivePermanentFailures < MAX_PERMANENT_FAILURES) continue;
    store.suppressedReason = permanent;
    store.suppressedUntilMs = Date.now() + SUPPRESS_MS;
    formatMemorySyncPausedNotice(
      store,
      permanent,
      results[store.mountName]?.permanent === undefined
        ? extraResults[store.mountName]?.permanentPath
        : undefined,
    );
    let error = results[store.mountName]?.error ?? extraResults[store.mountName]?.error;
    logForDebugging(
      `multi-store-sync[${store.mountName}]: suppressing further sync (${permanent}) after ${store.consecutivePermanentFailures} consecutive failures \u2014 retrying in ${SUPPRESS_MS / 60000}m` +
        (error !== undefined ? ` (last error: ${error})` : ""),
      {
        level: "warn",
      },
    );
  }
  let counts = {
    stores: root.stores.length,
    stores_suppressed: countWhere(root.stores, (store) => store.suppressedReason !== null),
    stores_backed_off: countWhere(root.stores, (store) => (store.serverBackoffUntilMs ?? 0) > Date.now()),
    pull_written: Object.values(results).reduce((acc, pull) => acc + pull.filesWritten, 0),
    pull_deleted: Object.values(results).reduce((acc, pull) => acc + pull.filesDeleted, 0),
    push_written: Object.values(extraResults).reduce((acc, push) => acc + push.filesWritten, 0),
    push_deleted: Object.values(extraResults).reduce((acc, push) => acc + push.filesDeleted, 0),
    push_deletes_deferred: Object.values(extraResults).reduce(
      (acc, push) => acc + (push.deletesDeferred ?? 0),
      0,
    ),
    conflicts: Object.values(extraResults).reduce((acc, push) => acc + push.conflicts, 0),
    conflict_recoveries: Object.values(extraResults).reduce(
      (acc, push) => acc + (push.conflictRecoveries ?? 0),
      0,
    ),
    secrets_skipped: Object.values(extraResults).reduce((acc, push) => acc + push.secretsSkipped, 0),
    oversized_skipped: Object.values(extraResults).reduce(
      (acc, push) => acc + (push.oversizedSkipped ?? 0),
      0,
    ),
    push_empty_skipped: Object.values(extraResults).reduce((acc, push) => acc + (push.emptySkipped ?? 0), 0),
    push_files_refused: Object.values(extraResults).reduce((acc, push) => acc + (push.filesRefused ?? 0), 0),
    pull_failed_write_marked: root.stores.reduce((acc, store) => acc + (store.failedWritesMarked ?? 0), 0),
    pull_empty_restored: Object.values(results).reduce((acc, pull) => acc + (pull.emptyRestored ?? 0), 0),
    pull_sha_mismatches: Object.values(results).reduce((acc, pull) => acc + (pull.shaMismatches ?? 0), 0),
    pull_entries_listed: Object.values(results).reduce((acc, pull) => acc + pull.entriesListed, 0),
    pull_entries_fetch_failed: Object.values(results).reduce(
      (acc, pull) => acc + (pull.fetchesFailed ?? 0),
      0,
    ),
    pull_entries_without_ref: Object.values(results).reduce(
      (acc, pull) => acc + (pull.entriesWithoutRef ?? 0),
      0,
    ),
    pull_old_receipt_missing_refetched: Object.values(results).reduce(
      (acc, pull) => acc + (pull.unmarkedReceiptRefetched ?? 0),
      0,
    ),
    pull_failures: countWhere(Object.values(results), (pull) => !pull.success),
    push_failures: countWhere(Object.values(extraResults), (push) => !push.success),
  };
  for (let store of root.stores) store.failedWritesMarked = 0;
  if (root.stores.length > 0 && root.stores.every((store) => store.scope === "account"))
    return {
      pulls: results,
      pushes: extraResults,
    };
  let failureReason = Object.values(extraResults).find((push) => !push.success)?.failureReason;
  let filtered = root.stores.filter((store) => isUsableSuppressedReason(store.basisUnusable));
  let found = filtered
    .map((store) => results[store.mountName])
    .find((pull) => pull !== undefined && (pull.skipped === true || !pull.success));
  let offPullFailure =
    found === undefined
      ? undefined
      : (found.cause ??
        (found.skipped ? "suppressed" : found.permanent !== undefined ? "permanent" : "unavailable"));
  logEvent("tengu_team_mem_multistore_sync", {
    ...counts,
    trigger: fromEnum(trigger),
    off_retries: offRetries,
    off_store_count: filtered.length,
    off_pull_failure: fromEnumOpt(offPullFailure),
    ...(failureReason !== undefined && {
      push_failure_reason: sanitizedMachineReasonForTelemetry(failureReason),
    }),
  });
  if (counts.pull_failures > 0) logFeatureBad("team_memory_multistore_pull", "multistore_pull_failed");
  else if (Object.values(results).some((pull) => pull.backedOff === true))
    logFeatureSad("team_memory_multistore_pull", "backed_off");
  else logFeatureOk("team_memory_multistore_pull");
  if (counts.push_failures > 0) logFeatureBad("team_memory_multistore_push", "multistore_push_failed");
  else if (counts.push_files_refused > 0) logFeatureSad("team_memory_multistore_push", "file_refused");
  else if (Object.values(extraResults).some((push) => push.backedOff === true))
    logFeatureSad("team_memory_multistore_push", "backed_off");
  else logFeatureOk("team_memory_multistore_push");
  if (counts.conflicts > 0) logFeatureOk("team_memory_multistore_conflict");
  logForDebugging(
    `multi-store-sync: ${counts.stores} store(s) \u2014 ` +
      `pull \u2193${counts.pull_written}/\u2212${counts.pull_deleted}, ` +
      `push \u2191${counts.push_written}/\u2212${counts.push_deleted}` +
      (counts.conflicts ? `, ${counts.conflicts} conflict(s)` : "") +
      (counts.pull_failures || counts.push_failures
        ? `, failures pull=${counts.pull_failures} push=${counts.push_failures}`
        : ""),
    {
      level: "info",
    },
  );
  return {
    pulls: results,
    pushes: extraResults,
  };
}
export {
  resolveStoreKeyPath,
  isMountEscaped,
  NOOP_RESULT,
  SKIPPED_RESULT,
  noteServerBackoff,
  syncTeamMemoryOnce,
  getMemoryStoreResyncIntervalMs,
  runSyncCycleWithReport,
};
